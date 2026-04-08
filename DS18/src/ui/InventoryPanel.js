import { getTemplate } from '../data/cards.js';
import { renderCardChip } from './CardView.js';

export function getInventoryGroups(session) {
  const groups = {
    journey: [],
    embed: [],
    character: []
  };

  session.state.inventory.forEach((card) => {
    const template = getTemplate(card.templateId);
    if (!template) return;
    if (template.category === 'journey') groups.journey.push(card);
    if (template.category === 'embed') groups.embed.push(card);
    if (template.category === 'character') groups.character.push(card);
  });

  return groups;
}

export function renderInventoryPanel(session, uiState, selectedSlot) {
  const groups = getInventoryGroups(session);
  const selectedTemplate = selectedSlot ? getTemplate(selectedSlot.card.templateId) : null;
  const currentTab = uiState.selectedInventoryTab || 'journey';
  const cards = groups[currentTab] || [];
  const tabLabel = {
    journey: '路程卡',
    embed: '镶嵌卡',
    character: '角色卡'
  };

  const list = cards.map((card) => {
    const template = getTemplate(card.templateId);
    const actions = [];
    if (currentTab === 'journey') {
      actions.push(`<button data-action="place-card" data-card-id="${card.id}" data-day="${uiState.selectedPlanningDay}">放入 Day ${uiState.selectedPlanningDay}</button>`);
    }
    if (currentTab === 'embed') {
      actions.push(
        selectedTemplate && selectedTemplate.type === 'room'
          ? `<button data-action="embed-card" data-card-id="${card.id}" data-day="${uiState.selectedPlanningDay}" data-slot-index="${selectedSlot.index}">镶嵌到当前房间</button>`
          : '<button disabled>先选中一个房间卡槽</button>'
      );
    }
    if (template.type === 'weapon') {
      const validation = session.inventorySystem.canEquip(card.id);
      actions.push(`<button data-action="equip-weapon" data-card-id="${card.id}" ${validation.ok ? '' : 'disabled'} title="${validation.reason || ''}">装备武器</button>`);
    }
    if (template.type === 'armor') {
      const validation = session.inventorySystem.canEquip(card.id);
      actions.push(`<button data-action="equip-armor" data-card-id="${card.id}" ${validation.ok ? '' : 'disabled'} title="${validation.reason || ''}">装备护甲</button>`);
    }
    if (template.type === 'shield') {
      const validation = session.inventorySystem.canEquip(card.id);
      actions.push(`<button data-action="equip-shield" data-card-id="${card.id}" ${validation.ok ? '' : 'disabled'} title="${validation.reason || ''}">装备副手</button>`);
    }
    if (template.type === 'consumable') {
      actions.push(`<button data-action="use-item" data-card-id="${card.id}">立即使用</button>`);
    }

    return renderCardChip(card, actions, {
      variant: currentTab === 'journey' ? 'inventory-journey' : currentTab === 'embed' ? 'inventory-embed' : 'inventory-character',
      draggable: true,
      dragPayload: {
        originType: 'inventory',
        cardId: card.id,
        category: currentTab,
        templateType: template.type
      }
    });
  }).join('');

  return `
    <aside class="panel inventory-panel" data-drop-kind="inventory-return">
      <div class="panel-head">
        <div>
          <h2>背包卡库</h2>
          <p class="muted-text">拖拽卡牌到中间轨道或房间插槽，构筑当天路线。</p>
        </div>
        <span>容量 ${session.state.inventory.length}/${session.state.hero.maxInventorySize}</span>
      </div>
      <div class="inventory-tabs">
        ${Object.entries(tabLabel).map(([tabId, label]) => `
          <button class="tab ${currentTab === tabId ? 'active' : ''}" data-action="set-inventory-tab" data-tab="${tabId}">
            ${label}
          </button>
        `).join('')}
      </div>
      <section class="inventory-list">
        ${list || `<div class="empty-panel">当前 ${tabLabel[currentTab]} 为空。</div>`}
      </section>
    </aside>
  `;
}
