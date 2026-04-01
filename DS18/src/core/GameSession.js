import { GAME_CONFIG } from '../config/game.config.js';
import { createCardInstance, getTemplate } from '../data/cards.js';
import { createHero, ensureHeroState } from '../entities/Hero.js';
import { STARTER_CARD_TEMPLATE_IDS } from '../data/rewards.js';
import { writeSave } from '../utils/save.js';
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
    return {
      version: '0.1',
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
      layouts: { 1: [], 2: [], 3: [] },
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
      reason: 'day_end'
    };
  }

  hydrateState(savedState) {
    const hydrated = JSON.parse(JSON.stringify(savedState));
    hydrated.dayContext = hydrated.dayContext || this.createDayContext();
    hydrated.layouts = hydrated.layouts || { 1: [], 2: [], 3: [] };
    hydrated.logs = hydrated.logs || [];
    hydrated.serial = hydrated.serial || 1;
    hydrated.hero = ensureHeroState(hydrated.hero);
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
    const cardId = slot === 'weapon' ? this.state.hero.weaponId : this.state.hero.armorId;
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

  chooseReward(rewardId) {
    const choice = this.state.dayContext.rewardChoices.find((item) => item.id === rewardId);
    if (!choice || this.state.dayContext.rewardChosen) return;

    if (choice.type === 'souls') {
      this.economySystem.addSouls(choice.payload.amount);
      this.log(`结算奖励：获得 ${choice.payload.amount} 灵魂。`, 'positive');
    } else if (choice.type === 'card' || choice.type === 'consumable') {
      const card = this.makeCard(choice.payload.templateId);
      const addResult = this.inventorySystem.addCard(card, {
        onFull: 'block',
        sourceLabel: '结算奖励'
      });
      if (!addResult.ok) {
        return;
      }
      this.log(`结算奖励：获得 ${getTemplate(choice.payload.templateId).name}。`, 'positive');
    } else if (choice.type === 'attribute') {
      this.state.hero.attributes[choice.payload.attribute] += choice.payload.amount;
      this.log(`结算奖励：${choice.payload.label || '属性提升'}。`, 'positive');
    }

    this.state.dayContext.rewardChosen = true;
    this.heroSystem.syncDerivedStats();
    this.persist();
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
    this.bossApproachSystem.advanceDay();
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

    if (this.state.day >= this.state.totalDays || this.state.bossApproach >= 100) {
      this.combatSystem.startBoss(this.state.bossApproach >= 100);
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

    if (this.state.bossApproach < 70) {
      return { ok: false, reason: 'Boss 逼近度不足 70，暂时不能主动挑战。' };
    }

    this.combatSystem.startBoss(false);
    return { ok: true };
  }

  restart() {
    this.createNewRun();
  }
}
