import { BOSS_PHASES } from '../data/bosses.js';
import { DAY_REWARD_POOLS, MERCHANT_POOL, RANDOM_EVENT_POOL } from '../data/rewards.js';
import { LOOT_DROP_RATE_BY_QUALITY, getTemplate } from '../data/cards.js';
import { calculateMitigatedDamage, clamp } from '../utils/formula.js';
import { pickRandom, randomInt, shuffle } from '../utils/random.js';

export class CombatSystem {
  constructor(session) {
    this.session = session;
  }

  createEncounterState() {
    return {
      attackMultiplier: 1,
      incomingMultiplier: 1,
      flatSouls: 0,
      skippedCombat: false,
      trialTriggered: false
    };
  }

  applyRoomEffects(template, roomMode, roomData, encounterState) {
    (template.effects || []).forEach((effect) => {
      if (effect.trigger !== 'all' && effect.trigger !== roomMode) return;

      if (effect.type === 'heal_percent') {
        const healAmount = Math.round(this.session.state.hero.maxHp * effect.value);
        this.session.state.hero.currentHp = clamp(
          this.session.state.hero.currentHp + healAmount,
          0,
          this.session.state.hero.maxHp
        );
        this.session.log(`${template.name} 提供庇护，回复 ${healAmount} 点生命。`, 'positive');
      }

      if (effect.type === 'add_flask') {
        this.session.state.hero.flasks = clamp(
          this.session.state.hero.flasks + effect.value,
          0,
          this.session.state.hero.maxFlasks + effect.value
        );
        this.session.log(`${template.name} 让你额外获得 ${effect.value} 瓶治疗。`, 'positive');
      }

      if (effect.type === 'grant_flat_souls') {
        encounterState.flatSouls += randomInt(effect.range[0], effect.range[1]);
      }

      if (effect.type === 'skip_room_combat') {
        encounterState.skippedCombat = Boolean(effect.value);
      }

      if (effect.type === 'merchant_discount') {
        this.session.state.dayContext.merchantOffers = this.rollMerchantOffers().map((offer) => ({
          ...offer,
          price: Math.round(offer.price * (1 - effect.value))
        }));
        this.session.log(`${template.name} 被触发：今日商店价格降低 ${Math.round(effect.value * 100)}%。`, 'positive');
      }
    });
  }

  resolveRoomSlot(slot, context) {
    const template = getTemplate(slot.card.templateId);
    const hero = this.session.state.hero;
    const visitCount = this.session.getExplorationLevel(template.id) + 1;

    this.session.deathSystem.recoverSoulsIfNeeded(template.id);

    const roomMode = context.mode === 'night' ? 'night' : 'day';
    const roomData = template[roomMode];
    const comboMultiplier = this.getRoomComboMultiplier(context.slotIndex);
    const crossBoundaryMultiplier = context.mode === 'twilight' ? 1.2 : 1;
    const encounterState = this.createEncounterState();

    slot.embeds.forEach((embed) => {
      const embedTemplate = getTemplate(embed.templateId);
      if (embedTemplate.type !== 'npc') return;

      if (embedTemplate.id === 'npc_pilgrim') {
        encounterState.attackMultiplier *= 1.15;
        const rewardCard = this.session.makeCard(pickRandom(RANDOM_EVENT_POOL));
        const addResult = this.session.inventorySystem.addCard(rewardCard, {
          onFull: 'soulify',
          sourceLabel: '巡礼者馈赠'
        });
        if (addResult.mode === 'added') {
          this.session.log(`巡礼者揭示了弱点。你获得 15% 伤害加成，并带回 ${getTemplate(rewardCard.templateId).name}。`, 'positive');
        }
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

      if (embedTemplate.id === 'npc_wandering_pyromancer') {
        encounterState.attackMultiplier *= 1.25;
        hero.attackBuffMultiplier = Math.max(hero.attackBuffMultiplier, 1.25);
        hero.attackBuffRooms = Math.max(hero.attackBuffRooms, 2);
        hero.attributes.intelligence += 1;
        hero.attributes.faith += 1;
        this.session.heroSystem.syncDerivedStats();
        this.session.log('流浪火焰术士为武器附上火焰，并带来额外成长。', 'positive');
      }

      if (embedTemplate.id === 'npc_hired_knight') {
        encounterState.attackMultiplier *= 1.1;
        encounterState.incomingMultiplier *= 0.8;
        this.session.log('雇佣骑士加入战线，房间战斗压力降低。', 'positive');
      }
    });

    slot.embeds.forEach((embed) => {
      const embedTemplate = getTemplate(embed.templateId);
      if (embedTemplate.type !== 'event') return;

      if (embedTemplate.id === 'event_hidden_passage') {
        encounterState.skippedCombat = true;
        encounterState.flatSouls += 50;
        this.session.log(`${template.name} 中出现隐藏通道，勇者绕开战斗直取灵魂。`, 'positive');
      }

      if (embedTemplate.id === 'event_soul_vortex') {
        encounterState.flatSouls += randomInt(roomData.souls[0], roomData.souls[1]);
        encounterState.incomingMultiplier *= 1.3;
        this.session.log('灵魂漩涡张开，收益翻倍的代价是更加危险的战斗。', 'warning');
      }

      if (embedTemplate.id === 'event_dragon_fire') {
        encounterState.attackMultiplier *= 1.35;
        const result = this.session.heroSystem.applyDamage(hero.maxHp * 0.1, {
          source: 'dragon_fire',
          allowLethalGuard: false
        });
        this.session.log(`巨龙喷火先焚烧了敌群，勇者也被余焰灼伤 ${result.amount} 点生命。`, 'warning');
      }

      if (embedTemplate.id === 'event_trapped_chest') {
        const roll = this.session.diceSystem.roll();
        if (roll.finalValue >= 4) {
          const reward = this.session.makeCard(pickRandom(['room_starter_village', 'npc_fire_keeper', 'consumable_flame_jar']));
          const addResult = this.session.inventorySystem.addCard(reward, {
            onFull: 'soulify',
            sourceLabel: '宝箱奖励'
          });
          if (addResult.mode === 'added') {
            this.session.log(`宝箱陷阱判定 ${roll.finalValue} 成功，获得 ${getTemplate(reward.templateId).name}。`, 'positive');
          }
        } else {
          const result = this.session.heroSystem.applyDamage(hero.maxHp * 0.15, {
            source: 'trapped_chest',
            allowLethalGuard: false
          });
          this.session.log(`宝箱陷阱判定 ${roll.finalValue} 失败，勇者受到 ${result.amount} 点伤害。`, 'warning');
        }
      }

      if (embedTemplate.id === 'event_mystic_altar') {
        const roll = this.session.diceSystem.roll();
        if (roll.finalValue >= 5) {
          const reward = this.session.makeCard(pickRandom(['weapon_greatsword', 'armor_chainmail', 'consumable_magic_resin', 'shield_iron']));
          const addResult = this.session.inventorySystem.addCard(reward, {
            onFull: 'soulify',
            sourceLabel: '祭坛奖励'
          });
          if (addResult.mode === 'added') {
            this.session.log(`神秘祭坛判定 ${roll.finalValue} 大成功，获得 ${getTemplate(reward.templateId).name}。`, 'positive');
          }
        } else if (roll.finalValue >= 3) {
          encounterState.flatSouls += 100;
          this.session.log(`神秘祭坛判定 ${roll.finalValue} 成功，额外获得 100 灵魂。`, 'positive');
        } else {
          hero.curseAttackMultiplier = 0.8;
          this.session.log(`神秘祭坛判定 ${roll.finalValue} 失败，勇者本日攻击 -20%。`, 'warning');
        }
      }

      if (embedTemplate.id === 'event_hero_trial') {
        encounterState.trialTriggered = true;
      }
    });

    this.applyRoomEffects(template, roomMode, roomData, encounterState);

    if (!encounterState.skippedCombat && roomData.hp > 0) {
      const effectiveAttack = hero.attack * encounterState.attackMultiplier;
      const attackWithCrit = effectiveAttack * (1 + hero.critRate * 0.45);
      const turns = Math.max(1, Math.ceil(roomData.hp / Math.max(1, attackWithCrit)));
      const perTurnDamage = calculateMitigatedDamage(roomData.power * encounterState.incomingMultiplier, hero.defense);
      const dodgeMultiplier = 1 - hero.dodgeRate * 0.65;
      let damageTaken = Math.round(perTurnDamage * turns * dodgeMultiplier * randomInt(90, 115) / 100);

      if (encounterState.trialTriggered) {
        damageTaken += 18;
        encounterState.flatSouls += 45;
        this.session.state.dayContext.rewardChoices.push(
          this.session.createRewardChoice('attribute', { attribute: 'strength', amount: 1, label: '+1 力量' }),
          this.session.createRewardChoice('card', { templateId: pickRandom(['event_hero_trial', 'consumable_magic_resin']), label: '额外战利品' }),
          this.session.createRewardChoice('consumable', { templateId: 'consumable_flame_jar', label: '火焰壶' })
        );
        this.session.log('勇者试炼触发，房间末尾追加一只精英敌人。', 'warning');
      }

      const result = this.session.heroSystem.applyDamage(damageTaken, {
        source: template.id
      });
      this.session.log(`${template.name} 战斗结束，勇者受到 ${result.amount} 点伤害。`, result.amount > 35 ? 'warning' : 'info');
    }

    let explorationSoulMultiplier = 1;
    if (visitCount === 2) {
      encounterState.flatSouls += 20;
      this.session.economySystem.addMaterial('material_shard', 1);
      this.session.log(`${template.name} 的隐藏区域被发现：额外获得 20 灵魂和 1 个普通石。`, 'positive');
    } else if (visitCount === 3) {
      encounterState.flatSouls += 45;
      const specialReward = this.session.makeCard(pickRandom(['consumable_magic_resin', 'consumable_flame_jar', 'npc_fire_keeper']));
      this.session.inventorySystem.addCard(specialReward, {
        onFull: 'soulify',
        sourceLabel: '探索度特殊奖励',
        soulValue: 70
      });
      this.session.log(`${template.name} 的特殊事件触发，探索奖励明显提升。`, 'positive');
    } else if (visitCount >= 4) {
      explorationSoulMultiplier = 0.7;
      this.session.log(`${template.name} 已被反复探索，灵魂收益衰减 30%。`, 'warning');
    }

    const soulsGain = encounterState.skippedCombat
      ? encounterState.flatSouls
      : Math.round(
          (randomInt(roomData.souls[0], roomData.souls[1]) + encounterState.flatSouls) *
          comboMultiplier *
          crossBoundaryMultiplier *
          explorationSoulMultiplier
        );

    this.session.economySystem.addSouls(soulsGain);
    this.session.state.dayContext.dailySoulGain += soulsGain;
    this.session.state.dayContext.summary.push(`${template.name}：获得 ${soulsGain} 灵魂。`);
    this.session.log(`${template.name} 结算：获得 ${soulsGain} 灵魂。`, 'positive');

    (roomData.loot || []).forEach((lootTemplateId) => {
      const rate = this.getLootDropRate(lootTemplateId);
      if (Math.random() < rate) {
        this.applyLoot(lootTemplateId);
      }
    });

    this.session.incrementExploration(slot.card.templateId);
    this.session.heroSystem.decayAttackBuff();

    if (hero.currentHp <= 0) {
      this.session.deathSystem.handleHeroDeath(template.id);
    }
  }

  getLootDropRate(templateId) {
    const template = getTemplate(templateId);
    return LOOT_DROP_RATE_BY_QUALITY[template?.quality] || 0.1;
  }

  applyLoot(templateId) {
    const template = getTemplate(templateId);
    if (!template) return;

    if (template.type === 'material') {
      this.session.economySystem.addMaterial(templateId, 1);
      this.session.log(`获得材料：${template.name}。`, 'positive');
      this.session.eventBus.emit('combat:loot_obtained', {
        templateId,
        type: 'material'
      });
      return;
    }

    const hasSamePermanent = this.session.state.inventory.some((card) => card.templateId === templateId) ||
      Object.values(this.session.state.layouts).flat().some((slot) => slot.card.templateId === templateId);

    if (!template.consumable && hasSamePermanent) {
      if (template.type === 'weapon' || template.type === 'armor' || template.type === 'shield') {
        this.session.economySystem.addSouls(45);
        this.session.log(`重复掉落 ${template.name}，已转化为 45 灵魂。`, 'info');
      }
      return;
    }

    const card = this.session.makeCard(templateId);
    const addResult = this.session.inventorySystem.addCard(card, {
      onFull: 'soulify',
      sourceLabel: '战斗掉落'
    });
    if (addResult.mode === 'added') {
      this.session.log(`获得卡牌：${template.name}。`, 'positive');
      this.session.eventBus.emit('combat:loot_obtained', {
        templateId,
        type: 'card'
      });
    }
  }

  getRoomComboMultiplier(slotIndex) {
    const slots = this.session.state.layouts[this.session.state.day] || [];
    if (slotIndex == null || !slots[slotIndex]) return 1;
    const templateId = slots[slotIndex].card.templateId;
    const prev = slots[slotIndex - 1]?.card.templateId;
    const next = slots[slotIndex + 1]?.card.templateId;
    const neighbors = [prev, next].filter(Boolean);
    if (templateId === 'room_undead_settlement' && neighbors.includes('room_abandoned_cemetery')) {
      this.session.log('不死系连锁触发：不死聚落与废弃墓地相邻，灵魂收益提升。', 'positive');
      return 1.5;
    }
    return 1;
  }

  createEliteRewardChoices() {
    const pool = shuffle([
      'shield_iron',
      'npc_hired_knight',
      'consumable_magic_resin',
      'consumable_flame_jar',
      'room_merchant_tent',
      'npc_wandering_pyromancer'
    ]).slice(0, 2);

    const cardChoices = pool.map((templateId, index) => this.session.createRewardChoice(
      ['weapon', 'armor', 'shield', 'room', 'npc', 'event'].includes(getTemplate(templateId).type) ? 'card' : 'consumable',
      {
        templateId,
        label: getTemplate(templateId).name,
        id: `elite_reward_${this.session.state.day}_${index}_${templateId}`
      }
    ));

    const soulChoice = this.session.createRewardChoice('souls', {
      amount: 120 + this.session.state.day * 20,
      label: `${120 + this.session.state.day * 20} 灵魂`,
      id: `elite_reward_souls_${this.session.state.day}`
    });

    return [...cardChoices, soulChoice];
  }

  resolveEliteBattle() {
    const hero = this.session.state.hero;
    const elite = {
      name: '逐猎精英',
      hp: 120 + this.session.state.day * 40,
      attack: 30 + this.session.state.day * 10,
      souls: 90 + this.session.state.day * 35
    };
    const heroAttack = hero.attack * (1 + hero.critRate * 0.3);
    const turns = Math.max(1, Math.ceil(elite.hp / Math.max(1, heroAttack)));
    const incoming = calculateMitigatedDamage(elite.attack, hero.defense);
    const damageTaken = Math.round(incoming * turns * randomInt(90, 110) / 100);
    const result = this.session.heroSystem.applyDamage(damageTaken, {
      source: 'elite_battle'
    });

    if (this.session.state.hero.currentHp <= 0) {
      this.session.state.scene = 'gameover';
      this.session.log(`你在结算阶段挑战 ${elite.name} 失败，战役当场终结。`, 'danger');
      this.session.persist();
      return { ok: false, reason: '精英战失败。' };
    }

    this.session.economySystem.addSouls(elite.souls);
    const approachResult = this.session.bossApproachSystem.defeatElite();
    const rewardChoices = this.createEliteRewardChoices();
    this.session.log(
      `你击败了 ${elite.name}，承受 ${result.amount} 点伤害，获得 ${elite.souls} 灵魂，Boss 逼近度 ${approachResult.delta}。`,
      'positive'
    );
    return {
      ok: true,
      rewardChoices
    };
  }

  rollSettlementRewards() {
    const dayPool = DAY_REWARD_POOLS[this.session.state.day] || DAY_REWARD_POOLS[3];
    const selected = shuffle(dayPool).slice(0, 3);
    const uniqueChoices = selected.map((templateId, index) => {
      const template = getTemplate(templateId);
      return this.session.createRewardChoice(
        ['weapon', 'armor', 'shield', 'room', 'npc', 'event'].includes(template.type) ? 'card' : 'consumable',
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
    const addResult = this.session.inventorySystem.addCard(card, {
      onFull: 'block',
      sourceLabel: '商人购买'
    });
    if (!addResult.ok) {
      this.session.economySystem.addSouls(offer.price);
      return addResult;
    }

    this.session.state.dayContext.merchantOffers = this.session.state.dayContext.merchantOffers.filter((item) => item.id !== offerId);
    this.session.log(`从商人处购买 ${getTemplate(offer.templateId).name}，花费 ${offer.price} 灵魂。`, 'positive');
    this.session.persist();
    return { ok: true };
  }

  startBoss(isForcedByApproach = false, isEarlyChallenge = false) {
    const approachBoost = isForcedByApproach ? 1.15 : 1;
    this.session.state.scene = 'boss';
    this.session.state.boss = {
      phaseIndex: 0,
      turn: 1,
      hp: Math.round(BOSS_PHASES[0].hp * approachBoost),
      maxHp: Math.round(BOSS_PHASES[0].hp * approachBoost),
      pendingSpecial: BOSS_PHASES[0].special,
      approachBoost,
      isEarlyChallenge
    };
    this.session.eventBus.emit('boss:phase_changed', {
      phaseIndex: 0,
      phase: BOSS_PHASES[0],
      approachBoost
    });
    this.session.log(
      isForcedByApproach
        ? 'Boss 逼近度已突破 100，堕落骑士被强制引来并获得了 15% 强化。'
        : isEarlyChallenge
          ? '你提前叩响了 Boss 之门。若能获胜，本次最终奖励将提升 20%。'
          : '堕落骑士出现。三阶段 Boss 战开始。',
      'story'
    );
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

    const phaseAttack = Math.round(phase.attack * (this.session.state.boss.approachBoost || 1));
    let bossDamage = calculateMitigatedDamage(phaseAttack, hero.defense);
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
    const result = this.session.heroSystem.applyDamage(bossDamage, {
      source: `boss_phase_${phase.phase}`
    });
    this.session.log(`${phase.name} 反击造成 ${result.amount} 点伤害。`, result.amount > 30 ? 'warning' : 'info');
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
      const earlyMultiplier = this.session.state.dayContext.earlyBossRewardBonus || 1;
      const rewardSouls = Math.round(300 * earlyMultiplier);
      this.session.economySystem.addSouls(rewardSouls);
      this.session.state.scene = 'victory';
      this.session.state.boss = null;
      this.session.log(
        earlyMultiplier > 1
          ? `堕落骑士被提前击败。你额外获得 ${rewardSouls} 灵魂的最终奖励。`
          : `堕落骑士被击败。你完成了这条 3 天短线战役，并获得 ${rewardSouls} 灵魂。`,
        'story'
      );
      return true;
    }

    this.session.state.boss.phaseIndex += 1;
    const nextPhase = BOSS_PHASES[this.session.state.boss.phaseIndex];
    const approachBoost = this.session.state.boss.approachBoost || 1;
    this.session.state.boss.hp = Math.round(nextPhase.hp * approachBoost);
    this.session.state.boss.maxHp = Math.round(nextPhase.hp * approachBoost);
    this.session.state.boss.pendingSpecial = nextPhase.special;
    this.session.eventBus.emit('boss:phase_changed', {
      phaseIndex: this.session.state.boss.phaseIndex,
      phase: nextPhase,
      approachBoost
    });
    this.session.log(`Boss 进入第 ${nextPhase.phase} 阶段：${nextPhase.name}。`, 'warning');
    return false;
  }
}
