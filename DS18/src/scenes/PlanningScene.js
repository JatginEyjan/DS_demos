import { getTemplate } from '../data/cards.js';
import { escapeHtml } from '../utils/html.js';
import { renderDaySchedule } from '../ui/DaySchedule.js';
import { renderHeroStats } from '../ui/HeroStatusPanel.js';
import { renderInventoryPanel } from '../ui/InventoryPanel.js';
import { renderTimeline } from '../ui/TimelineBar.js';

export function renderPlanningScene(session, uiState) {
  const currentDay = uiState.selectedPlanningDay;
  const daySlots = session.state.layouts[currentDay] || [];
  const selectedSlotData = uiState.selectedSlotIndex != null ? daySlots[uiState.selectedSlotIndex] : null;
  const selectedSlot = selectedSlotData ? {
    ...selectedSlotData,
    index: uiState.selectedSlotIndex
  } : null;
  const selectedTemplate = selectedSlot ? getTemplate(selectedSlot.card.templateId) : null;
  const usedHours = session.timelineSystem.getUsedHours(currentDay);
  const droppedSouls = session.state.deathState?.droppedSouls || 0;
  const dropRoomTemplateId = session.state.deathState?.dropRoomTemplateId;
  const dropRoomName = dropRoomTemplateId ? getTemplate(dropRoomTemplateId)?.name : '';
  const dayTabs = [1, 2, 3].map((day) => `
    <button class="${day === currentDay ? 'tab active' : 'tab'}" data-action="select-day" data-day="${day}">
      Day ${day}
    </button>
  `).join('');

  return `
    <div class="workspace">
      ${renderInventoryPanel(session, currentDay, selectedSlot)}
      <main class="panel main-panel">
        <div class="panel-head">
          <div>
            <h2>规划阶段</h2>
            <p>当前耐力预算 ${usedHours} / ${session.state.hero.enduranceHours}h</p>
            ${droppedSouls > 0 ? `<p class="warning-banner">你有 ${droppedSouls} 灵魂掉落在「${escapeHtml(dropRoomName)}」中。请尽快安排对应房间卡去回收，否则再次死亡会永久失去它们。</p>` : ''}
          </div>
          <div class="inline-actions">
            ${dayTabs}
            ${currentDay === session.state.day ? `<button class="primary" data-action="start-execution">开始执行 Day ${session.state.day}</button>` : ''}
          </div>
        </div>
        <section class="timeline-board">${renderTimeline(session, currentDay, uiState.selectedSlotIndex)}</section>
      </main>
      <aside class="panel side-panel">
        <section>
          <h3>当前选中房间</h3>
          ${
            selectedTemplate
              ? `
                <div class="selected-room">
                  <strong>${escapeHtml(selectedTemplate.name)}</strong>
                  <p>${escapeHtml(selectedTemplate.description)}</p>
                  <p>可镶嵌：NPC ×${selectedTemplate.embedCapacity?.npc || 0} / 事件 ×${selectedTemplate.embedCapacity?.event || 0}</p>
                </div>
              `
              : '<div class="empty-panel">点击中间的房间卡槽后，这里会显示镶嵌说明。</div>'
          }
        </section>
        ${renderDaySchedule(session)}
        ${renderHeroStats(session)}
      </aside>
    </div>
  `;
}
