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
    if (!template || !groups[template.category]) return;
    groups[template.category].push(card);
  });

  return groups;
}

export function renderInventoryPanel(session, planningDay, selectedSlot) {
  const groups = getInventoryGroups(session);
  const selectedTemplate = selectedSlot ? getTemplate(selectedSlot.card.templateId) : null;

  const journeyCards = groups.journey.map((card) =>
    renderCardChip(card, [
      `<button data-action="place-card" data-card-id="${card.id}" data-day="${planningDay}">放入第 ${planningDay} 天</button>`
    ])
  ).join('');

  const embedCards = groups.embed.map((card) => {
    const button = selectedTemplate && selectedTemplate.type === 'room'
      ? `<button data-action="embed-card" data-card-id="${card.id}" data-day="${planningDay}" data-slot-index="${selectedSlot.index}">镶嵌到已选房间</button>`
      : '<button disabled>先选中一个房间卡槽</button>';
    return renderCardChip(card, [button]);
  }).join('');

  const characterCards = groups.character.map((card) => {
    const template = getTemplate(card.templateId);
    const actions = [];
    if (template.type === 'weapon') {
      const validation = session.inventorySystem.canEquip(card.id);
      actions.push(`<button data-action="equip-weapon" data-card-id="${card.id}" ${validation.ok ? '' : 'disabled'} title="${validation.reason || ''}">装备武器</button>`);
    }
    if (template.type === 'armor') {
      const validation = session.inventorySystem.canEquip(card.id);
      actions.push(`<button data-action="equip-armor" data-card-id="${card.id}" ${validation.ok ? '' : 'disabled'} title="${validation.reason || ''}">装备护甲</button>`);
    }
    if (template.type === 'consumable') {
      actions.push(`<button data-action="use-item" data-card-id="${card.id}">立即使用</button>`);
    }
    return renderCardChip(card, actions);
  }).join('');

  return `
    <aside class="panel inventory-panel">
      <div class="panel-head">
        <h2>背包</h2>
        <span>容量 ${session.state.inventory.length}/${session.state.hero.maxInventorySize}</span>
      </div>
      <section>
        <h3>路程卡</h3>
        ${journeyCards || '<div class="empty-panel">没有可放置的路程卡。</div>'}
      </section>
      <section>
        <h3>镶嵌卡</h3>
        ${embedCards || '<div class="empty-panel">暂无 NPC / 事件卡。</div>'}
      </section>
      <section>
        <h3>角色卡</h3>
        ${characterCards || '<div class="empty-panel">暂无角色卡。</div>'}
      </section>
    </aside>
  `;
}
