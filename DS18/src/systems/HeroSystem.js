import { ATTRIBUTE_LABELS } from '../data/classes.js';
import { SCALING_VALUE, getTemplate } from '../data/cards.js';
import { clamp, getUpgradeCost } from '../utils/formula.js';

export class HeroSystem {
  constructor(session) {
    this.session = session;
  }

  getEffectiveAttribute(attribute, rawValue) {
    const softCap = {
      vitality: 25,
      endurance: 22,
      strength: 30,
      dexterity: 30,
      intelligence: 30,
      faith: 30
    }[attribute] || 30;

    if (rawValue <= softCap) return rawValue;
    return softCap + (rawValue - softCap) * 0.5;
  }

  syncDerivedStats() {
    if (!this.session.state.hero) return;

    const hero = this.session.state.hero;
    const effective = Object.fromEntries(
      Object.entries(hero.attributes).map(([attribute, value]) => [attribute, this.getEffectiveAttribute(attribute, value)])
    );
    const weapon = hero.weaponId ? this.session.inventorySystem.findCardEverywhere(hero.weaponId) : null;
    const armor = hero.armorId ? this.session.inventorySystem.findCardEverywhere(hero.armorId) : null;
    const weaponTemplate = weapon ? getTemplate(weapon.templateId) : null;
    const armorTemplate = armor ? getTemplate(armor.templateId) : null;

    const maxHp = Math.round(effective.vitality * 15);
    const armorDefense = armorTemplate?.baseDefense || 0;
    const baseDefense = 10 + armorDefense + effective.vitality;
    const scalingBonus = weaponTemplate
      ? Object.entries(weaponTemplate.scaling || {}).reduce((total, [attr, grade]) => {
          return total + SCALING_VALUE[grade] * ((effective[attr] || 0) / 50);
        }, 0)
      : 0;
    const weaponBase = weaponTemplate?.baseAttack || 18;
    const weaponUpgradeLevel = weapon?.upgradeLevel || 0;
    const upgradeMultiplier = 1 + weaponUpgradeLevel * 0.08;
    const strengthFlat = effective.strength * 1.2;
    const dexterityFlat = effective.dexterity * 0.4;
    const buffMultiplier = hero.attackBuffMultiplier || 1;
    const curseMultiplier = hero.curseAttackMultiplier || 1;
    const attack = Math.round((weaponBase * (1 + scalingBonus) * upgradeMultiplier + strengthFlat + dexterityFlat) * buffMultiplier * curseMultiplier);

    hero.maxHp = maxHp;
    hero.currentHp = clamp(hero.currentHp, 0, maxHp);
    hero.attack = attack;
    hero.defense = Math.round(baseDefense);
    hero.dodgeRate = clamp(effective.dexterity * 0.012, 0.03, 0.42);
    hero.critRate = clamp(effective.dexterity * 0.008, 0.05, 0.32);
    hero.enduranceHours = Math.round(effective.endurance);
    hero.maxInventorySize = 10 + Math.floor(effective.strength / 2);
    hero.flaskHealAmount = Math.round(maxHp * (0.28 + effective.faith * 0.01));
  }

  getUpgradeCost(attribute) {
    return getUpgradeCost(this.session.state.hero.attributes[attribute]);
  }

  upgradeAttribute(attribute) {
    if (!(this.session.state.dayContext.bonfireUsed || this.session.state.dayContext.fireKeeperAvailable)) {
      return { ok: false, reason: '本日没有可用的升级来源。' };
    }
    const cost = this.getUpgradeCost(attribute);
    if (!this.session.economySystem.spendSouls(cost)) {
      return { ok: false, reason: '灵魂不足。' };
    }

    this.session.state.hero.attributes[attribute] += 1;
    this.syncDerivedStats();
    this.session.log(`${ATTRIBUTE_LABELS[attribute]} 提升至 ${this.session.state.hero.attributes[attribute]}，消耗 ${cost} 灵魂。`, 'positive');
    this.session.persist();
    return { ok: true };
  }

  useFlask() {
    const hero = this.session.state.hero;
    if (hero.flasks <= 0) return { ok: false, reason: '治疗瓶已耗尽。' };
    if (hero.currentHp >= hero.maxHp) return { ok: false, reason: '当前生命已满。' };

    hero.flasks -= 1;
    hero.currentHp = clamp(hero.currentHp + hero.flaskHealAmount, 0, hero.maxHp);
    this.session.log(`使用治疗瓶，回复 ${hero.flaskHealAmount} 生命。`, 'positive');
    this.session.persist();
    return { ok: true };
  }

  decayAttackBuff() {
    if (this.session.state.hero.attackBuffRooms > 0) {
      this.session.state.hero.attackBuffRooms -= 1;
      if (this.session.state.hero.attackBuffRooms <= 0) {
        this.session.state.hero.attackBuffMultiplier = 1;
        this.session.log('临时攻击增益结束。');
      }
    }
  }

  useConsumable(cardId) {
    const index = this.session.state.inventory.findIndex((card) => card.id === cardId);
    if (index === -1) return { ok: false, reason: '消耗品不存在。' };

    const [card] = this.session.state.inventory.splice(index, 1);
    const template = getTemplate(card.templateId);

    if (template.id === 'consumable_green_blossom') {
      this.session.state.hero.currentHp = clamp(
        this.session.state.hero.currentHp + Math.round(this.session.state.hero.maxHp * 0.3),
        0,
        this.session.state.hero.maxHp
      );
      this.session.log('使用绿花草，回复 30% 最大生命。', 'positive');
    }

    if (template.id === 'consumable_magic_resin') {
      this.session.state.hero.attackBuffMultiplier = 1.4;
      this.session.state.hero.attackBuffRooms = this.session.state.scene === 'boss' ? 99 : 1;
      this.session.log('魔力树脂附着武器，接下来一场战斗输出提升。', 'positive');
    }

    if (template.id === 'consumable_flame_jar') {
      if (this.session.state.scene === 'boss') {
        this.session.state.boss.hp = Math.max(0, this.session.state.boss.hp - 80);
        this.session.state.boss.pendingSpecial = null;
        this.session.log('火焰壶命中 Boss，造成 80 点火焰伤害并打断当前预警。', 'positive');
        this.session.combatSystem.advanceBossPhaseIfNeeded();
      } else {
        this.session.state.hero.attackBuffMultiplier = Math.max(this.session.state.hero.attackBuffMultiplier, 1.12);
        this.session.state.hero.attackBuffRooms = Math.max(this.session.state.hero.attackBuffRooms, 1);
        this.session.log('火焰壶被预先点燃，下一场房间战斗会获得少量额外伤害。', 'positive');
      }
    }

    this.syncDerivedStats();
    this.session.persist();
    return { ok: true };
  }

  canUpgradeWeapon() {
    const weapon = this.session.getEquippedCard('weapon');
    if (!weapon) return { ok: false, reason: '没有装备武器。' };
    const template = getTemplate(weapon.templateId);
    if (!template) return { ok: false, reason: '武器数据异常。' };
    if (!this.session.state.dayContext.blacksmithAvailable) {
      return { ok: false, reason: '今天没有遇到铁匠。' };
    }
    if ((weapon.upgradeLevel || 0) >= template.maxUpgradeLevel) {
      return { ok: false, reason: '武器已到当前上限。' };
    }

    const nextLevel = (weapon.upgradeLevel || 0) + 1;
    const requiredMaterial = nextLevel <= 3 ? 'material_shard' : 'material_chunk';
    const cost = [100, 200, 350, 500, 700, 1000][nextLevel - 1] || 1000;
    const materialCount = this.session.state.hero.materials[requiredMaterial] || 0;
    if (materialCount < 1) {
      return { ok: false, reason: `缺少 ${getTemplate(requiredMaterial).name}。` };
    }
    if (this.session.state.hero.souls < cost) {
      return { ok: false, reason: '灵魂不足。' };
    }

    return { ok: true, requiredMaterial, cost };
  }

  upgradeWeapon() {
    const validation = this.canUpgradeWeapon();
    if (!validation.ok) return validation;
    const weapon = this.session.getEquippedCard('weapon');
    weapon.upgradeLevel = (weapon.upgradeLevel || 0) + 1;
    this.session.economySystem.spendMaterial(validation.requiredMaterial, 1);
    this.session.economySystem.spendSouls(validation.cost);
    this.syncDerivedStats();
    this.session.log(`铁匠完成强化：${getTemplate(weapon.templateId).name} +${weapon.upgradeLevel}。`, 'positive');
    this.session.persist();
    return { ok: true };
  }
}
