import { getTemplate } from '../data/cards.js';
import { escapeHtml } from '../utils/html.js';
import { renderDayPlannerStrip } from '../ui/DayPlannerStrip.js';
import { renderHeroStats } from '../ui/HeroStatusPanel.js';
import { renderInventoryPanel } from '../ui/InventoryPanel.js';
import { renderRoomIntelPanel } from '../ui/RoomIntelPanel.js';
import { renderPlannerBoard } from '../ui/TimelineBar.js';

export function renderPlanningScene(session, uiState) {
  const currentDay = uiState.selectedPlanningDay;
  const daySlots = session.state.layouts[currentDay] || [];
  const selectedSlotData = uiState.selectedSlotIndex != null ? daySlots[uiState.selectedSlotIndex] : null;
  const selectedSlot = selectedSlotData ? {
    ...selectedSlotData,
    index: uiState.selectedSlotIndex
  } : null;
  const isCurrentPlanningDay = currentDay === session.state.day;
  const droppedSouls = session.state.deathState?.droppedSouls || 0;
  const dropRoomTemplateId = session.state.deathState?.dropRoomTemplateId;
  const dropRoomName = dropRoomTemplateId ? getTemplate(dropRoomTemplateId)?.name : '';

  return `
    <div class="scene scene-planning">
      <div class="scene-grid scene-grid-planning">
        ${renderInventoryPanel(session, uiState, selectedSlot)}
        <main class="scene-main planning-main">
          <section class="planner-callout panel">
            <div>
              <p class="eyebrow">Planning Phase</p>
              <h2>编排今日路线</h2>
              <p>${isCurrentPlanningDay ? '拖拽路程卡编排白昼与夜晚的推进顺序，再将 NPC / 事件镶嵌进房间，为勇者铺设一条能活下来的路线。' : `当前正在查看 Day ${currentDay} 的预布局。未来日期可以提前排卡，但不能直接开始执行。`}</p>
            </div>
            <div class="inline-actions">
              ${isCurrentPlanningDay ? `<button class="primary" data-action="start-execution">开始执行 Day ${session.state.day}</button>` : '<button disabled>当前仅可预布局</button>'}
            </div>
          </section>
          ${droppedSouls > 0 ? `<p class="warning-banner">你有 ${droppedSouls} 灵魂掉落在「${escapeHtml(dropRoomName)}」中。请尽快安排对应房间卡去回收，否则再次死亡会永久失去它们。</p>` : ''}
          ${renderPlannerBoard(session, uiState)}
          ${renderDayPlannerStrip(session, uiState)}
        </main>
        <aside class="scene-side planning-side">
          ${renderRoomIntelPanel(session, selectedSlot, currentDay)}
          ${renderHeroStats(session)}
        </aside>
      </div>
    </div>
  `;
}
