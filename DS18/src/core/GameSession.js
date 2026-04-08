import { GAME_CONFIG } from '../config/game.config.js';
import { createCardInstance, getTemplate } from '../data/cards.js';
import { createHero, ensureHeroState } from '../entities/Hero.js';
import { STARTER_CARD_TEMPLATE_IDS } from '../data/rewards.js';
import { SAVE_VERSION, writeSave } from '../utils/save.js';
import { EventBus } from '../utils/event-bus.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { CardSystem } from '../systems/CardSystem.js';
import { PreLayoutSystem } from '../systems/PreLayoutSystem.js';
import { TimelineSystem } from '../systems/TimelineSystem.js';
import { DiceSystem } from '../systems/DiceSystem.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { DeathSystem } from '../systems/DeathSystem.js';
import { HeroSystem } from '../systems/HeroSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { BossApproachSystem } from '../systems/BossApproachSystem.js';

export class GameSession {
  constructor(savedState = null) {
    this.eventBus = new EventBus();
    this.state = savedState ? this.hydrateState(savedState) : this.createMenuState();
    this.inventorySystem = new InventorySystem(this);
    this.preLayoutSystem = new PreLayoutSystem(this);
    this.cardSystem = new CardSystem(this);
    this.diceSystem = new DiceSystem(this);
    this.economySystem = new EconomySystem(this);
    this.deathSystem = new DeathSystem(this);
    this.heroSystem = new HeroSystem(this);
    this.combatSystem = new CombatSystem(this);
    this.timelineSystem = new TimelineSystem(this);
    this.bossApproachSystem = new BossApproachSystem(this);
    this.heroSystem.syncDerivedStats();
  }

  createMenuState() {
    const layouts = {};
    for (let day = 1; day <= GAME_CONFIG.totalDays; day += 1) {
      layouts[day] = [];
    }
    return {
      version: SAVE_VERSION,
      scene: 'menu',
      serial: 1,
      saveStamp: null,
      routeId: GAME_CONFIG.routeId,
      totalDays: GAME_CONFIG.totalDays,
      day: 1,
      bossApproach: 0,
      logs: [],
      hero: null,
      inventory: [],
      layouts,
      dayContext: this.createDayContext(),
      execution: null,
      boss: null,
      deathState: {
        deathCount: 0,
        droppedSouls: 0,
        dropRoomTemplateId: null
      }
    };
  }

  createDayContext() {
    return {
      bonfireUsed: false,
      fireKeeperAvailable: false,
      blacksmithAvailable: false,
      merchantOffers: [],
      rewardChoices: [],
      rewardChosen: false,
      summary: [],
      dailySoulGain: 0,
      dailyMaterialGain: { material_shard: 0, material_chunk: 0 },
      reason: 'day_end',
      eliteDecisionMade: false,
      eliteResolved: false,
      eliteOutcome: null,
      eliteRewardChoices: [],
      eliteRewardChosen: false,
      earlyBossRewardBonus: 1
    };
  }

  hydrateState(savedState) {
    const hydrated = JSON.parse(JSON.stringify(savedState));
    hydrated.version = hydrated.version || SAVE_VERSION;
    hydrated.dayContext = {
      ...this.createDayContext(),
      ...(hydrated.dayContext || {}),
      dailyMaterialGain: {
        material_shard: 0,
        material_chunk: 0,
        ...(hydrated.dayContext?.dailyMaterialGain || {})
      },
      merchantOffers: hydrated.dayContext?.merchantOffers || [],
      rewardChoices: hydrated.dayContext?.rewardChoices || [],
      summary: hydrated.dayContext?.summary || [],
      eliteRewardChoices: hydrated.dayContext?.eliteRewardChoices || []
    };
    hydrated.layouts = hydrated.layouts || { 1: [], 2: [], 3: [] };
    for (let day = 1; day <= (hydrated.totalDays || GAME_CONFIG.totalDays); day += 1) {
      hydrated.layouts[day] = hydrated.layouts[day] || [];
    }
    hydrated.logs = hydrated.logs || [];
    hydrated.serial = hydrated.serial || 1;
    hydrated.hero = ensureHeroState(hydrated.hero);
    hydrated.bossApproach = hydrated.bossApproach || 0;
    hydrated.deathState = hydrated.deathState || {
      deathCount: 0,
      droppedSouls: 0,
      dropRoomTemplateId: null
    };
    return hydrated;
  }

  createNewRun() {
    const state = this.createMenuState();
    state.scene = 'planning';
    state.hero = createHero();

    STARTER_CARD_TEMPLATE_IDS.forEach((templateId) => {
      state.inventory.push(this.makeCardForState(state, templateId));
    });

    const longsword = this.makeCardForState(state, 'weapon_longsword');
    const knightArmor = this.makeCardForState(state, 'armor_knight');
    state.inventory.push(longsword, knightArmor);
    state.hero.weaponId = longsword.id;
    state.hero.armorId = knightArmor.id;
    this.state = state;
    this.log('命运编排启动。你带着一把长剑、一身骑士铠甲和有限的日程卡进入战役。', 'story');
    this.heroSystem.syncDerivedStats();
    this.persist();
  }

  makeCard(templateId) {
    const card = createCardInstance(templateId, this.state.serial);
    this.state.serial += 1;
    return card;
  }

  makeCardForState(state, templateId) {
    const card = createCardInstance(templateId, state.serial);
    state.serial += 1;
    return card;
  }

  getEquippedCard(slot) {
    const cardId = {
      weapon: this.state.hero.weaponId,
      armor: this.state.hero.armorId,
      shield: this.state.hero.shieldId
    }[slot];
    return cardId ? this.inventorySystem.findCardEverywhere(cardId) : null;
  }

  createLog(message, tone = 'info') {
    return {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      day: this.state?.day || 1,
      scene: this.state?.scene || 'menu',
      tone,
      message
    };
  }

  log(message, tone = 'info') {
    this.state.logs.unshift(this.createLog(message, tone));
    this.state.logs = this.state.logs.slice(0, 120);
    this.eventBus.emit('log:added', this.state.logs[0]);
  }

  persist() {
    this.state.saveStamp = Date.now();
    this.state.version = SAVE_VERSION;
    writeSave(this.state);
  }

  incrementExploration(roomTemplateId) {
    const key = `${roomTemplateId}_exploration`;
    this.state[key] = (this.state[key] || 0) + 1;
  }

  getExplorationLevel(roomTemplateId) {
    return this.state[`${roomTemplateId}_exploration`] || 0;
  }

  createRewardChoice(type, payload) {
    return {
      id: payload.id || `reward_${type}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload
    };
  }

  applyRewardChoice(choice, sourceLabel) {
    if (!choice) return { ok: false, reason: '奖励不存在。' };

    if (choice.type === 'souls') {
      this.economySystem.addSouls(choice.payload.amount);
      this.log(`${sourceLabel}：获得 ${choice.payload.amount} 灵魂。`, 'positive');
    } else if (choice.type === 'card' || choice.type === 'consumable') {
      const card = this.makeCard(choice.payload.templateId);
      const addResult = this.inventorySystem.addCard(card, {
        onFull: 'block',
        sourceLabel
      });
      if (!addResult.ok) {
        return addResult;
      }
      this.log(`${sourceLabel}：获得 ${getTemplate(choice.payload.templateId).name}。`, 'positive');
    } else if (choice.type === 'attribute') {
      this.state.hero.attributes[choice.payload.attribute] += choice.payload.amount;
      this.log(`${sourceLabel}：${choice.payload.label || '属性提升'}。`, 'positive');
    }

    this.heroSystem.syncDerivedStats();
    return { ok: true };
  }

  chooseReward(rewardId) {
    const choice = this.state.dayContext.rewardChoices.find((item) => item.id === rewardId);
    if (!choice || this.state.dayContext.rewardChosen) return;

    const result = this.applyRewardChoice(choice, '结算奖励');
    if (!result.ok) {
      return result;
    }
    this.state.dayContext.rewardChosen = true;
    this.persist();
    return result;
  }

  chooseEliteReward(rewardId) {
    const choice = this.state.dayContext.eliteRewardChoices.find((item) => item.id === rewardId);
    if (!choice || this.state.dayContext.eliteRewardChosen) return;

    const result = this.applyRewardChoice(choice, '精英奖励');
    if (!result.ok) {
      return result;
    }
    this.state.dayContext.eliteRewardChosen = true;
    this.persist();
    return result;
  }

  ensureSettlementRewardChosen() {
    if (this.state.dayContext.rewardChosen) {
      return true;
    }

    const defaultChoice =
      this.state.dayContext.rewardChoices.find((choice) => choice.type === 'souls') ||
      this.state.dayContext.rewardChoices[0];

    if (!defaultChoice) {
      return true;
    }

    this.log('你没有手动选择结算奖励，系统已自动领取默认奖励以继续流程。', 'info');
    this.chooseReward(defaultChoice.id);
    return this.state.dayContext.rewardChosen;
  }

  finishDay(reason) {
    this.cardSystem.reclaimDayCards(this.state.day);
    this.state.execution = null;
    this.state.scene = 'settlement';
    this.state.dayContext.reason = reason;
    this.state.dayContext.eliteDecisionMade = false;
    this.state.dayContext.eliteResolved = false;
    this.state.dayContext.eliteOutcome = null;
    this.state.dayContext.eliteRewardChoices = [];
    this.state.dayContext.eliteRewardChosen = false;
    this.state.dayContext.earlyBossRewardBonus = 1;
    const bossAdvance = this.bossApproachSystem.advanceDay();
    this.eventBus.emit('timeline:day_end', {
      day: this.state.day,
      reason,
      bossApproach: this.state.bossApproach,
      delta: bossAdvance.delta
    });
    this.combatSystem.rollSettlementRewards();
    this.reduceCooldowns();
    this.heroSystem.syncDerivedStats();
    this.persist();
  }

  reduceCooldowns() {
    this.state.inventory.forEach((card) => {
      if (card.currentCooldown > 0) {
        card.currentCooldown -= 1;
      }
    });
  }

  nextDay() {
    if (this.state.day < this.state.totalDays && !this.state.dayContext.eliteDecisionMade) {
      this.log('你需要先在结算阶段决定是否挑战精英，才能推进到下一天。', 'warning');
      return { ok: false, reason: '需要先完成精英决策。' };
    }

    if (this.state.dayContext.eliteRewardChoices.length > 0 && !this.state.dayContext.eliteRewardChosen) {
      const defaultEliteReward = this.state.dayContext.eliteRewardChoices[0];
      if (defaultEliteReward) {
        this.log('你没有手动选择精英奖励，系统已自动领取第一项奖励。', 'info');
        const eliteRewardResult = this.chooseEliteReward(defaultEliteReward.id);
        if (eliteRewardResult && eliteRewardResult.ok === false) {
          return { ok: false, reason: eliteRewardResult.reason || '精英奖励领取失败。' };
        }
      }
    }

    if (!this.ensureSettlementRewardChosen()) {
      return { ok: false, reason: '结算奖励领取失败。' };
    }

    this.state.hero.currentHp = Math.min(
      this.state.hero.maxHp,
      this.state.hero.currentHp + Math.round(this.state.hero.maxHp * 0.1)
    );
    this.state.hero.flasks = this.state.hero.maxFlasks;
    this.state.hero.curseAttackMultiplier = 1;
    this.state.hero.attackBuffMultiplier = 1;
    this.state.hero.attackBuffRooms = 0;

    if (this.state.day >= this.state.totalDays || this.bossApproachSystem.shouldForceBoss()) {
      this.combatSystem.startBoss(this.bossApproachSystem.shouldForceBoss(), false);
      return { ok: true };
    }

    this.state.day += 1;
    this.state.scene = 'planning';
    this.state.dayContext = this.createDayContext();
    this.log(`进入第 ${this.state.day} 天规划阶段。Boss 逼近度来到 ${this.state.bossApproach}。`, 'story');
    this.heroSystem.syncDerivedStats();
    this.persist();
    return { ok: true };
  }

  startBossNow() {
    if (!this.ensureSettlementRewardChosen()) {
      return { ok: false, reason: '结算奖励领取失败。' };
    }

    if (this.state.dayContext.eliteRewardChoices.length > 0 && !this.state.dayContext.eliteRewardChosen) {
      const eliteRewardResult = this.chooseEliteReward(this.state.dayContext.eliteRewardChoices[0]?.id);
      if (eliteRewardResult && eliteRewardResult.ok === false) {
        return { ok: false, reason: eliteRewardResult.reason || '精英奖励领取失败。' };
      }
    }

    if (!this.bossApproachSystem.canChallengeEarlyBoss()) {
      return { ok: false, reason: 'Boss 逼近度不足 70，暂时不能主动挑战。' };
    }

    this.state.dayContext.eliteDecisionMade = true;
    this.state.dayContext.eliteResolved = true;
    this.state.dayContext.eliteOutcome = 'challenge_boss';
    this.state.dayContext.earlyBossRewardBonus = 1.2;
    this.combatSystem.startBoss(false, true);
    return { ok: true };
  }

  skipEliteBattle() {
    if (this.state.scene !== 'settlement' || this.state.day >= this.state.totalDays) {
      return { ok: false, reason: '当前不需要进行精英决策。' };
    }
    if (this.state.dayContext.eliteDecisionMade) {
      return { ok: false, reason: '精英决策已完成。' };
    }

    const result = this.bossApproachSystem.skipElite();
    this.state.dayContext.eliteDecisionMade = true;
    this.state.dayContext.eliteResolved = true;
    this.state.dayContext.eliteOutcome = 'skipped';
    this.log(`你选择跳过今日精英战。Boss 逼近度 +${result.delta}。`, 'warning');
    this.persist();
    return { ok: true };
  }

  challengeEliteBattle() {
    if (this.state.scene !== 'settlement' || this.state.day >= this.state.totalDays) {
      return { ok: false, reason: '当前不需要进行精英决策。' };
    }
    if (this.state.dayContext.eliteDecisionMade) {
      return { ok: false, reason: '精英决策已完成。' };
    }

    const result = this.combatSystem.resolveEliteBattle();
    if (!result.ok) {
      return result;
    }

    this.state.dayContext.eliteDecisionMade = true;
    this.state.dayContext.eliteResolved = true;
    this.state.dayContext.eliteOutcome = 'victory';
    this.state.dayContext.eliteRewardChoices = result.rewardChoices;
    this.state.dayContext.eliteRewardChosen = false;
    this.persist();
    return { ok: true };
  }

  restart() {
    this.createNewRun();
  }
}
