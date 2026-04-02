import { getTemplate } from '../data/cards.js';
import { getRoomModeInfo } from './intel.js';

export function renderExecutionTimelineStrip(session) {
  const execution = session.state.execution;
  const slots = session.state.layouts[session.state.day] || [];
  const segments = session.timelineSystem.getSlotTimeSegments(session.state.day);

  return `
    <section class="execution-strip panel">
      <div class="planner-strip-head">
        <h3>当天推进条</h3>
        <span>白昼与夜晚在时间轴上会直接改变遭遇表现</span>
      </div>
      <div class="execution-strip-track">
        ${slots.map((slot, index) => {
          const template = getTemplate(slot.card.templateId);
          const segment = segments[index];
          const modeInfo = getRoomModeInfo(segment?.mode || 'day');
          const isCurrent = execution && index === execution.slotIndex;
          const status = execution && index < execution.slotIndex ? 'is-done' : isCurrent ? 'is-current' : 'is-pending';
          const title = segment?.mode === 'night' && index > execution.slotIndex
            ? '？？？'
            : template.name;
          return `
            <div class="execution-node ${status} ${modeInfo.tone}">
              <small>${modeInfo.label}</small>
              <strong>${title}</strong>
              <span>${segment ? `${segment.start}h → ${segment.end}h` : ''}</span>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}
