import { QUALITY_CLASS, getTemplate } from '../data/cards.js';
import { escapeHtml } from '../utils/html.js';
import { getRoomModeInfo, renderStars, getDangerLevel } from './intel.js';
import { renderIcon } from './icons.js';

function renderDropZone(day, index) {
  return `
    <div class="timeline-dropzone" data-drop-kind="timeline-insert" data-day="${day}" data-index="${index}">
      <span>拖到这里插入</span>
    </div>
  `;
}

export function renderPlannerBoard(session, uiState) {
  const day = uiState.selectedPlanningDay;
  const daySlots = session.state.layouts[day] || [];
  const slotSegments = session.timelineSystem.getSlotTimeSegments(day);
  const remainingHours = Math.max(0, session.state.hero.enduranceHours - session.timelineSystem.getUsedHours(day));

  return `
    <section class="planner-board panel">
      <div class="planner-board-head">
        <div>
          <p class="eyebrow">Planner Board</p>
          <h2>Day ${day} 命运轨道</h2>
          <p>拖拽路程卡到轨道中编排行程；拖动房间可重排，拖回左侧背包可取回。</p>
        </div>
        <div class="planner-metrics">
          <div class="planner-metric">
            <span>耐力预算</span>
            <strong>${session.state.hero.enduranceHours}h</strong>
          </div>
          <div class="planner-metric">
            <span>剩余耐力</span>
            <strong>${remainingHours}h</strong>
          </div>
          <div class="planner-metric">
            <span>Boss 压力</span>
            <strong>${session.state.bossApproach}</strong>
          </div>
        </div>
      </div>

      <div class="planner-lane-shell">
        <div class="planner-lane-bg">
          <div class="planner-lane-day">白昼</div>
          <div class="planner-lane-night">夜晚</div>
        </div>
        <div class="planner-lane-cut" style="left:${Math.min(100, (session.state.hero.enduranceHours / 2 / Math.max(1, session.state.hero.enduranceHours)) * 100)}%"></div>
        <div class="planner-lane">
          ${daySlots.length ? renderDropZone(day, 0) : `
            <div class="empty-panel planner-empty timeline-dropzone" data-drop-kind="timeline-insert" data-day="${day}" data-index="0">
              将路程卡拖到这里，开始编排这一天的命运轨迹。
            </div>
          `}
          ${daySlots.map((slot, index) => {
            const template = getTemplate(slot.card.templateId);
            const segment = slotSegments[index];
            const modeInfo = getRoomModeInfo(segment?.mode || 'day');
            const isSelected = uiState.selectedSlotIndex === index;
            const danger = template.type === 'room' ? renderStars(getDangerLevel(template[segment?.mode === 'night' ? 'night' : 'day']?.power, template[segment?.mode === 'night' ? 'night' : 'day']?.hp)) : '功能';

            return `
              <div class="planner-slot-wrap">
                <article class="timeline-slot ${isSelected ? 'selected' : ''} ${modeInfo.tone} ${QUALITY_CLASS[template.quality]}" draggable="true" data-drag-payload="${escapeHtml(JSON.stringify({ originType: 'layout-slot', day, index }))}">
                  <button class="slot-main" data-action="select-slot" data-slot-index="${index}">
                    <span class="slot-phase ${modeInfo.tone}">${modeInfo.label}</span>
                    <strong>${escapeHtml(template.name)}</strong>
                    <small>${segment ? `${segment.start}h → ${segment.end}h` : ''}</small>
                  </button>
                  <div class="timeline-slot-meta">
                    <span>${renderIcon('drag')} 可拖拽重排</span>
                    <span>${template.type === 'room' ? `危险度 ${danger}` : '功能结算卡'}</span>
                  </div>
                  <div class="slot-embeds" data-drop-kind="room-embed" data-day="${day}" data-slot-index="${index}">
                    ${slot.embeds.map((embed, embedIndex) => {
                      const embedTemplate = getTemplate(embed.templateId);
                      return `
                        <span class="embed-pill ${QUALITY_CLASS[embedTemplate.quality]}" draggable="true" data-drag-payload="${escapeHtml(JSON.stringify({ originType: 'layout-embed', day, slotIndex: index, embedIndex }))}">
                          ${embedTemplate.type === 'npc' ? renderIcon('npc') : renderIcon('event')}
                          ${escapeHtml(embedTemplate.name)}
                          <button data-action="remove-embed" data-day="${day}" data-slot-index="${index}" data-embed-index="${embedIndex}">×</button>
                        </span>
                      `;
                    }).join('') || '<span class="muted-text">拖拽镶嵌卡到此处</span>'}
                  </div>
                  <div class="slot-controls">
                    <button data-action="move-slot" data-day="${day}" data-slot-index="${index}" data-direction="-1">左移</button>
                    <button data-action="move-slot" data-day="${day}" data-slot-index="${index}" data-direction="1">右移</button>
                    <button data-action="remove-slot" data-day="${day}" data-slot-index="${index}">取回</button>
                  </div>
                </article>
                ${renderDropZone(day, index + 1)}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}
