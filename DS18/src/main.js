import { GameSession } from './core/GameSession.js';
import { loadSave, clearSave } from './utils/save.js';
import { renderAppShell } from './ui/AppShell.js';
import { renderMenuScene } from './scenes/MenuScene.js';
import { renderPlanningScene } from './scenes/PlanningScene.js';
import { renderExecutionScene } from './scenes/ExecutionScene.js';
import { renderSettlementScene } from './scenes/SettlementScene.js';
import { renderBossScene } from './scenes/BossScene.js';
import { renderGameOverScene } from './scenes/GameOverScene.js';

const root = document.querySelector('#app');
const session = new GameSession(loadSave());

const uiState = {
  selectedPlanningDay: session.state.day || 1,
  selectedSlotIndex: null,
  executionTimer: null
};

function sceneLabel(scene) {
  return {
    menu: '主菜单',
    planning: '规划阶段',
    execution: '执行阶段',
    settlement: '结算阶段',
    boss: 'Boss 战',
    gameover: '战败',
    victory: '胜利'
  }[scene] || scene;
}

function renderCurrentScene() {
  const hasSave = Boolean(loadSave() || session.state.hero);

  if (session.state.scene === 'menu') return renderMenuScene(hasSave);
  if (session.state.scene === 'planning') return renderPlanningScene(session, uiState);
  if (session.state.scene === 'execution') return renderExecutionScene(session);
  if (session.state.scene === 'settlement') return renderSettlementScene(session);
  if (session.state.scene === 'boss') return renderBossScene(session);
  if (session.state.scene === 'gameover') return renderGameOverScene(session, 'gameover');
  if (session.state.scene === 'victory') return renderGameOverScene(session, 'victory');
  return renderMenuScene(hasSave);
}

function renderApp() {
  if (session.state.hero && uiState.selectedPlanningDay < session.state.day) {
    uiState.selectedPlanningDay = session.state.day;
  }

  root.innerHTML = renderAppShell(session, renderCurrentScene(), sceneLabel);
  syncExecutionLoop();
}

function syncExecutionLoop() {
  if (session.state.scene === 'execution' && !uiState.executionTimer) {
    uiState.executionTimer = window.setInterval(() => {
      session.timelineSystem.advance(100);
      renderApp();
    }, 100);
  }

  if (session.state.scene !== 'execution' && uiState.executionTimer) {
    window.clearInterval(uiState.executionTimer);
    uiState.executionTimer = null;
  }
}

function wireEvents() {
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const { action } = button.dataset;

    if (action === 'start-run' || action === 'restart-run') {
      session.createNewRun();
      uiState.selectedPlanningDay = session.state.day;
      uiState.selectedSlotIndex = null;
      renderApp();
      return;
    }

    if (action === 'resume-run') {
      const savedState = loadSave();
      if (savedState) {
        session.state = session.hydrateState(savedState);
        session.heroSystem.syncDerivedStats();
      }
      uiState.selectedPlanningDay = session.state.day;
      renderApp();
      return;
    }

    if (action === 'clear-save') {
      clearSave();
      window.location.reload();
      return;
    }

    if (action === 'select-day') {
      uiState.selectedPlanningDay = Number(button.dataset.day);
      uiState.selectedSlotIndex = null;
      renderApp();
      return;
    }

    if (action === 'place-card') {
      session.cardSystem.placeCard(button.dataset.cardId, Number(button.dataset.day));
      renderApp();
      return;
    }

    if (action === 'remove-slot') {
      session.cardSystem.removeSlot(Number(button.dataset.day), Number(button.dataset.slotIndex));
      uiState.selectedSlotIndex = null;
      renderApp();
      return;
    }

    if (action === 'move-slot') {
      session.cardSystem.moveSlot(Number(button.dataset.day), Number(button.dataset.slotIndex), Number(button.dataset.direction));
      renderApp();
      return;
    }

    if (action === 'select-slot') {
      uiState.selectedSlotIndex = Number(button.dataset.slotIndex);
      renderApp();
      return;
    }

    if (action === 'embed-card') {
      session.cardSystem.embedCard(button.dataset.cardId, Number(button.dataset.day), Number(button.dataset.slotIndex));
      renderApp();
      return;
    }

    if (action === 'remove-embed') {
      session.cardSystem.removeEmbed(
        Number(button.dataset.day),
        Number(button.dataset.slotIndex),
        Number(button.dataset.embedIndex)
      );
      renderApp();
      return;
    }

    if (action === 'equip-weapon') {
      session.inventorySystem.equip(button.dataset.cardId, 'weapon');
      session.heroSystem.syncDerivedStats();
      session.persist();
      renderApp();
      return;
    }

    if (action === 'equip-armor') {
      session.inventorySystem.equip(button.dataset.cardId, 'armor');
      session.heroSystem.syncDerivedStats();
      session.persist();
      renderApp();
      return;
    }

    if (action === 'equip-shield') {
      session.inventorySystem.equip(button.dataset.cardId, 'shield');
      session.heroSystem.syncDerivedStats();
      session.persist();
      renderApp();
      return;
    }

    if (action === 'use-item') {
      session.heroSystem.useConsumable(button.dataset.cardId);
      renderApp();
      return;
    }

    if (action === 'start-execution') {
      session.timelineSystem.startExecution();
      renderApp();
      return;
    }

    if (action === 'use-flask') {
      session.heroSystem.useFlask();
      renderApp();
      return;
    }

    if (action === 'choose-reward') {
      session.chooseReward(button.dataset.rewardId);
      renderApp();
      return;
    }

    if (action === 'choose-elite-reward') {
      session.chooseEliteReward(button.dataset.rewardId);
      renderApp();
      return;
    }

    if (action === 'upgrade-attr') {
      session.heroSystem.upgradeAttribute(button.dataset.attr);
      renderApp();
      return;
    }

    if (action === 'upgrade-weapon') {
      session.heroSystem.upgradeWeapon();
      renderApp();
      return;
    }

    if (action === 'buy-offer') {
      session.combatSystem.buyMerchantOffer(button.dataset.offerId);
      renderApp();
      return;
    }

    if (action === 'next-day') {
      session.nextDay();
      uiState.selectedPlanningDay = session.state.day;
      uiState.selectedSlotIndex = null;
      renderApp();
      return;
    }

    if (action === 'challenge-elite') {
      session.challengeEliteBattle();
      renderApp();
      return;
    }

    if (action === 'skip-elite') {
      session.skipEliteBattle();
      renderApp();
      return;
    }

    if (action === 'start-boss-now') {
      session.startBossNow();
      renderApp();
      return;
    }

    if (action === 'boss-turn') {
      session.combatSystem.takeBossTurn(button.dataset.strategy, button.dataset.response);
      renderApp();
      return;
    }
  });
}

wireEvents();
renderApp();
