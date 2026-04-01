import { QUALITY_CLASS, getTemplate } from '../data/cards.js';
import { escapeHtml } from '../utils/html.js';

export function renderTimeline(session, day, selectedSlotIndex) {
  const daySlots = session.state.layouts[day] || [];
  const slotSegments = session.timelineSystem.getSlotTimeSegments(day);

  if (!daySlots.length) {
    return '<div class="empty-panel">这一天还没有编排卡牌。</div>';
  }

  return daySlots.map((slot, index) => {
    const template = getTemplate(slot.card.templateId);
    const segment = slotSegments[index];
    const embeds = slot.embeds.map((embed, embedIndex) => {
      const embedTemplate = getTemplate(embed.templateId);
      return `
        <span class="embed-pill ${QUALITY_CLASS[embedTemplate.quality]}">
          ${escapeHtml(embedTemplate.name)}
          <button data-action="remove-embed" data-day="${day}" data-slot-index="${index}" data-embed-index="${embedIndex}">×</button>
        </span>
      `;
    }).join('');

    return `
      <article class="timeline-slot ${selectedSlotIndex === index ? 'selected' : ''}">
        <button class="slot-main" data-action="select-slot" data-slot-index="${index}">
          <span class="slot-phase ${segment?.mode || 'day'}">${segment?.mode === 'night' ? '夜晚' : segment?.mode === 'twilight' ? '跨昼夜' : segment?.mode === 'utility' ? '功能' : '白天'}</span>
          <strong>${escapeHtml(template.name)}</strong>
          <small>${segment ? `${segment.start}h → ${segment.end}h` : ''}</small>
        </button>
        <div class="slot-embeds">${embeds || '<span class="muted-text">暂无镶嵌</span>'}</div>
        <div class="slot-controls">
          <button data-action="move-slot" data-day="${day}" data-slot-index="${index}" data-direction="-1">左移</button>
          <button data-action="move-slot" data-day="${day}" data-slot-index="${index}" data-direction="1">右移</button>
          <button data-action="remove-slot" data-day="${day}" data-slot-index="${index}">取回</button>
        </div>
      </article>
    `;
  }).join('');
}
