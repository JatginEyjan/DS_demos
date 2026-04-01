import { BOSS_PHASES } from '../data/bosses.js';
import { DAY_REWARD_POOLS, MERCHANT_POOL, RANDOM_EVENT_POOL } from '../data/rewards.js';
import { getTemplate } from '../data/cards.js';
import { clamp } from '../utils/formula.js';
import { pickRandom, randomInt, shuffle } from '../utils/random.js';

export class CombatSystem {
  constructor(session) {
    this.session = session;
  }

  resolveRoomSlot(slot, context) {
    const template = getTemplate(slot.card.templateId);
    const hero = this.session.state.hero;

    this.session.deathSystem.recoverSoulsIfNeeded(template.id);

    const roomMode = context.mode === 'night' ? 'night' : 'day';
    const roomData = template[roomMode];
    const comboMultiplier = this.getRoomComboMultiplier(template.id);
    const crossBoundaryMultiplier = context.mode === 'twilight' ? 1.2 : 1;

    let attackMultiplier = 1;
    let incomingMultiplier = 1;
    let flatSouls = 0;
    let skippedCombat = false;
    let trialTriggered = false;

    slot.embeds.forEach((embed) => {
      const embedTemplate = getTemplate(embed.templateId);
      if (embedTemplate.type === 'npc') {
        if (embedTemplate.id === 'npc_pilgrim') {
          attackMultiplier *= 1.15;
          const rewardCard = this.session.makeCard(pickRandom(RANDOM_EVENT_POOL));
          this.session.state.inventory.push(rewardCard);
          this.session.log(`巡礼者揭示了弱点。你获得 15% 伤害加成，并带回 ${getTemplate(rewardCard.templateId).name}。`, 'positive');
        }
        if (embedTemplate.id === 'npc_fire_keeper') {
          this.session.state.dayContext.fireKeeperAvailable = true;
          this.session.log('防火女在房间尽头等待。结算阶段可额外升级属性。', 'info');
        }
        if (embedTemplate.id === 'npc_blacksmith') {
          this.session.state.dayContext.blacksmithAvailable = true;
          this.session.log('铁匠在这里搭了临时炉台。结算阶段可尝试强化武器。', 'info');
        }
        if (embedTemplate.id === 'npc_merchant') {
          this.session.state.dayContext.merchantOffers = this.rollMerchantOffers();
          this.session.log('商人记下了你的需求，结算阶段会展示一小批货物。', 'info');
        }
      }
    });

    slot.embeds.forEach((embed) => {
      const embedTemplate = getTemplate(embed.templateId);
      if (embedTemplate.type !== 'event') return;

      if (embedTemplate.id === 'event_hidden_passage') {
        skippedCombat = true;
        flatSouls += 50;
        this.session.log(`${template.name} 中出现隐藏通道，勇者绕开战斗直取灵魂。`, 'positive');
      }

      if (embedTemplate.id === 'event_soul_vortex') {
        flatSouls += randomInt(roomData.souls[0], roomData.souls[1]);
        incomingMultiplier *= 1.3;
        this.session.log('灵魂漩涡张开，收益翻倍的代价是更加危险的战斗。', 'warning');
      }

      if (embedTemplate.id === 'event_dragon_fire') {
        attackMultiplier *= 1.35;
        hero.currentHp = clamp(hero.currentHp - Math.round(hero.maxHp * 0.1), 0, hero.maxHp);
        this.session.log('巨龙喷火先焚烧了敌群，勇者也被余焰灼伤 10% 最大生命。', 'warning');
      }

      if (embedTemplate.id === 'event_trapped_chest') {
        const roll = this.session.diceSystem.roll();
        if (roll >= 4) {
          const reward = this.session.makeCard(pickRandom(['room_starter_village', 'npc_fire_keeper', 'consumable_flame_jar']));
          this.session.state.inventory.push(reward);
          this.session.log(`宝箱陷阱判定 ${roll} 成功，获得 ${getTemplate(reward.templateId).name}。`, 'positive');
        } else {
          const damage = Math.round(hero.maxHp * 0.15);
          hero.currentHp = clamp(hero.currentHp - damage, 0, hero.maxHp);
          this.session.log(`宝箱陷阱判定 ${roll} 失败，勇者受到 ${damage} 点伤害。`, 'warning');
        }
      }

      if (embedTemplate.id === 'event_mystic_altar') {
        const roll = this.session.diceSystem.roll();
        if (roll >= 5) {
          const reward = this.session.makeCard(pickRandom(['weapon_greatsword', 'armor_chainmail', 'consumable_magic_resin']));
          this.session.state.inventory.push(reward);
          this.session.log(`神秘祭坛判定 ${roll} 大成功，获得 ${getTemplate(reward.templateId).name}。`, 'positive');
        } else if (roll >= 3) {
          this.session.economySystem.addSouls(100);
          flatSouls += 100;
          this.session.log(`神秘祭坛判定 ${roll} 成功，额外获得 100 灵魂。`, 'positive');
        } else {
          hero.curseAttackMultiplier = 0.8;
          this.session.log(`神秘祭坛判定 ${roll} 失败，勇者本日攻击 -20%。`, 'warning');
        }
      }

      if (embedTemplate.id === 'event_hero_trial') {
        trialTriggered = true;
      }
    });

    if (template.id === 'room_old_church' && roomMode === 'day') {
      hero.flasks = clamp(hero.flasks + 1, 0, hero.maxFlasks + 1);
      hero.currentHp = clamp(hero.currentHp + Math.round(hero.maxHp * 0.18), 0, hero.maxHp);
      flatSouls += randomInt(roomData.souls[0], roomData.souls[1]);
      this.session.log('古老教堂在白天给予庇护：回复生命，并临时多得到 1 瓶治疗。', 'positive');
    }

    if (!skippedCombat && roomData.hp > 0) {
      const effectiveAttack = hero.attack * attackMultiplier;
      const attackWithCrit = effectiveAttack * (1 + hero.critRate * 0.45);
      const turns = Math.max(1, Math.ceil(roomData.hp / attackWithCrit));
      const rawDamage = Math.max(6, roomData.power * incomingMultiplier - hero.defense * 0.42);
      const dodgeMultiplier = 1 - hero.dodgeRate * 0.65;
      let damageTaken = Math.round(rawDamage * turns * dodgeMultiplier * randomInt(90, 115) / 100);

      if (template.id === 'room_old_church' && roomMode === 'day') {
        damageTaken = 0;
      }

      if (trialTriggered) {
        damageTaken += 18;
        flatSouls += 45;
        this.session.state.dayContext.rewardChoices.push(
          this.session.createRewardChoice('attribute', { attribute: 'strength', amount: 1, label: '+1 力量' }),
          this.session.createRewardChoice('card', { templateId: pickRandom(['event_hero_trial', 'consumable_magic_resin']), label: '额外战利品' }),
          this.session.createRewardChoice('consumable', { templateId: 'consumable_flame_jar', label: '火焰壶' })
        );
        this.session.log('勇者试炼触发，房间末尾追加一只精英敌人。', 'warning');
      }

      hero.currentHp = clamp(hero.currentHp - damageTaken, 0, hero.maxHp);
      this.session.log(`${template.name} 战斗结束，勇者受到 ${damageTaken} 点伤害。`, damageTaken > 35 ? 'warning' : 'info');
    }

    const soulsGain = skippedCombat
      ? flatSouls
      : Math.round((randomInt(roomData.souls[0], roomData.souls[1]) + flatSouls) * comboMultiplier * crossBoundaryMultiplier);

    this.session.economySystem.addSouls(soulsGain);
    this.session.state.dayContext.dailySoulGain += soulsGain;
    this.session.state.dayContext.summary.push(`${template.name}：获得 ${soulsGain} 灵魂。`);
    this.session.log(`${template.name} 结算：获得 ${soulsGain} 灵魂。`, 'positive');

    (roomData.loot || []).forEach((lootTemplateId) => this.applyLoot(lootTemplateId));

    this.session.incrementExploration(slot.card.templateId);
    this.session.heroSystem.decayAttackBuff();

    if (hero.currentHp <= 0) {
      this.session.deathSystem.handleHeroDeath(template.id);
    }
  }

  applyLoot(templateId) {
    const template = getTemplate(templateId);
    if (!template) return;

    if (template.type === 'material') {
      this.session.economySystem.addMaterial(templateId, 1);
      this.session.log(`获得材料：${template.name}。`, 'positive');
      return;
    }

    const hasSamePermanent = this.session.state.inventory.some((card) => card.templateId === templateId) ||
      Object.values(this.session.state.layouts).flat().some((slot) => slot.card.templateId === templateId);

    if (!template.consumable && hasSamePermanent) {
      if (template.type === 'weapon' || template.type === 'armor') {
        this.session.economySystem.addSouls(45);
        this.session.log(`重复掉落 ${template.name}，已转化为 45 灵魂。`, 'info');
      }
      return;
    }

    const card = this.session.makeCard(templateId);
    this.session.state.inventory.push(card);
    this.session.log(`获得卡牌：${template.name}。`, 'positive');
  }

  getRoomComboMultiplier(templateId) {
    const slots = this.session.state.layouts[this.session.state.day] || [];
    const index = slots.findIndex((slot) => slot.card.templateId === templateId);
    if (index === -1) return 1;
    const prev = slots[index - 1]?.card.templateId;
    const next = slots[index + 1]?.card.templateId;
    const neighbors = [prev, next].filter(Boolean);
    if (templateId === 'room_undead_settlement' && neighbors.includes('room_abandoned_cemetery')) {
      this.session.log('不死系连锁触发：不死聚落与废弃墓地相邻，灵魂收益提升。', 'positive');
      return 1.5;
    }
    return 1;
  }

  rollSettlementRewards() {
    const dayPool = DAY_REWARD_POOLS[this.session.state.day] || DAY_REWARD_POOLS[3];
    const selected = shuffle(dayPool).slice(0, 3);
    const uniqueChoices = selected.map((templateId, index) => {
      const template = getTemplate(templateId);
      return this.session.createRewardChoice(
        ['weapon', 'armor', 'room', 'npc', 'event'].includes(template.type) ? 'card' : 'consumable',
        {
          templateId,
          label: template.name,
          id: `reward_${this.session.state.day}_${index}_${templateId}`
        }
      );
    });

    const baseSoulChoice = this.session.createRewardChoice('souls', {
      amount: 70 + this.session.state.day * 30,
      label: `${70 + this.session.state.day * 30} 灵魂`
    });

    this.session.state.dayContext.rewardChoices = [...this.session.state.dayContext.rewardChoices, ...uniqueChoices.slice(0, 2), baseSoulChoice]
      .filter((choice, index, array) => array.findIndex((item) => item.id === choice.id) === index)
      .slice(0, 3);
    this.session.state.dayContext.rewardChosen = false;
  }

  rollMerchantOffers() {
    return shuffle(MERCHANT_POOL)
      .slice(0, 3)
      .map((templateId, index) => ({
        id: `merchant_${this.session.state.day}_${index}_${templateId}`,
        templateId,
        price: getTemplate(templateId).quality === 'rare' ? 110 : 60
      }));
  }

  buyMerchantOffer(offerId) {
    const offer = this.session.state.dayContext.merchantOffers.find((item) => item.id === offerId);
    if (!offer) return { ok: false, reason: '商品不存在。' };
    if (!this.session.economySystem.spendSouls(offer.price)) return { ok: false, reason: '灵魂不足。' };

    const card = this.session.makeCard(offer.templateId);
    this.session.state.inventory.push(card);
    this.session.state.dayContext.merchantOffers = this.session.state.dayContext.merchantOffers.filter((item) => item.id !== offerId);
    this.session.log(`从商人处购买 ${getTemplate(offer.templateId).name}，花费 ${offer.price} 灵魂。`, 'positive');
    this.session.persist();
    return { ok: true };
  }

  startBoss() {
    this.session.state.scene = 'boss';
    this.session.state.boss = {
      phaseIndex: 0,
      turn: 1,
      hp: BOSS_PHASES[0].hp,
      maxHp: BOSS_PHASES[0].hp,
      pendingSpecial: BOSS_PHASES[0].special
    };
    this.session.log('堕落骑士出现。三阶段 Boss 战开始。', 'story');
    this.session.persist();
  }

  takeBossTurn(strategy, response) {
    if (this.session.state.scene !== 'boss' || !this.session.state.boss) return;

    const phase = BOSS_PHASES[this.session.state.boss.phaseIndex];
    const hero = this.session.state.hero;

    let attackMultiplier = hero.attackBuffMultiplier || 1;
    let defenseMultiplier = 1;
    if (strategy === 'aggressive') {
      attackMultiplier *= 1.3;
      defenseMultiplier *= 0.8;
    }
    if (strategy === 'guarded') {
      defenseMultiplier *= 1.3;
      hero.currentHp = clamp(hero.currentHp + 12, 0, hero.maxHp);
    }
    if (strategy === 'switch') {
      const backup = this.session.state.inventory
        .filter((card) => getTemplate(card.templateId).type === 'weapon' && card.id !== hero.weaponId)
        .sort((a, b) => (getTemplate(b.templateId).baseAttack || 0) - (getTemplate(a.templateId).baseAttack || 0))[0];
      if (backup) {
        hero.weaponId = backup.id;
        this.session.heroSystem.syncDerivedStats();
        attackMultiplier *= 1.05;
        this.session.log(`战斗中切换为 ${getTemplate(backup.templateId).name}。`, 'info');
      }
    }

    let heroDamage = Math.round(hero.attack * attackMultiplier * (1 + hero.critRate * 0.4));
    heroDamage = Math.round(heroDamage * (phase.phase === 3 ? 1.1 : 1));
    this.session.state.boss.hp = Math.max(0, this.session.state.boss.hp - heroDamage);
    this.session.log(`你对 ${phase.name} 造成 ${heroDamage} 点伤害。`, 'positive');

    if (this.advanceBossPhaseIfNeeded()) {
      this.session.persist();
      return;
    }

    let bossDamage = Math.max(10, phase.attack - hero.defense * 0.35);
    const special = this.session.state.boss.turn % 2 === 0 ? phase.special : null;
    if (special) {
      if (response === 'dodge') {
        const success = randomInt(1, 100) <= hero.dodgeRate * 100 + (strategy === 'guarded' ? 10 : 0);
        bossDamage = success ? 0 : Math.round(bossDamage * 1.2);
        this.session.log(success ? `${phase.specialLabel} 被成功闪避。` : `${phase.specialLabel} 闪避失败，仍然命中。`, success ? 'positive' : 'warning');
      }
      if (response === 'block') {
        bossDamage = Math.round(bossDamage * 0.5);
        this.session.log(`你用防御姿态硬吃了 ${phase.specialLabel}。`, 'info');
      }
      if (response === 'tank') {
        bossDamage = Math.round(bossDamage * 1.35);
        this.session.log(`你选择硬扛 ${phase.specialLabel}，风险极高。`, 'warning');
      }
      if (response === 'item') {
        const flameJar = this.session.state.inventory.find((card) => card.templateId === 'consumable_flame_jar');
        if (flameJar) {
          this.session.heroSystem.useConsumable(flameJar.id);
          if (this.session.state.scene !== 'boss' || !this.session.state.boss) {
            this.session.persist();
            return;
          }
          bossDamage = Math.round(bossDamage * 0.25);
        } else {
          bossDamage = Math.round(bossDamage * 1.1);
          this.session.log('你试图靠道具应对，但背包里没有火焰壶。', 'warning');
        }
      }
    }

    bossDamage = Math.round(bossDamage / defenseMultiplier);
    hero.currentHp = clamp(hero.currentHp - bossDamage, 0, hero.maxHp);
    this.session.log(`${phase.name} 反击造成 ${bossDamage} 点伤害。`, bossDamage > 30 ? 'warning' : 'info');
    this.session.state.boss.turn += 1;

    if (hero.currentHp <= 0) {
      this.session.state.scene = 'gameover';
      this.session.state.boss = null;
      this.session.log('勇者倒在堕落骑士面前。Boss 战失败。', 'danger');
    }

    this.session.heroSystem.decayAttackBuff();
    this.session.heroSystem.syncDerivedStats();
    this.session.persist();
  }

  advanceBossPhaseIfNeeded() {
    if (this.session.state.boss.hp > 0) return false;

    if (this.session.state.boss.phaseIndex >= BOSS_PHASES.length - 1) {
      this.session.state.scene = 'victory';
      this.session.state.boss = null;
      this.session.log('堕落骑士被击败。你完成了这条 3 天短线战役。', 'story');
      return true;
    }

    this.session.state.boss.phaseIndex += 1;
    const nextPhase = BOSS_PHASES[this.session.state.boss.phaseIndex];
    this.session.state.boss.hp = nextPhase.hp;
    this.session.state.boss.maxHp = nextPhase.hp;
    this.session.state.boss.pendingSpecial = nextPhase.special;
    this.session.log(`Boss 进入第 ${nextPhase.phase} 阶段：${nextPhase.name}。`, 'warning');
    return false;
  }
}
