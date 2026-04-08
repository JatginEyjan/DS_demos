import { QUALITY_CLASS, QUALITY_LABELS, getTemplate } from '../data/cards.js';
import { escapeHtml } from '../utils/html.js';
import { renderIcon } from './icons.js';

function renderBadges(template, card) {
  const cooldown = card.currentCooldown > 0 ? `<span class="badge muted">冷却 ${card.currentCooldown} 天</span>` : '';
  const duration = typeof template.duration === 'number' ? `<span class="badge">${template.duration}h</span>` : '';
  const upgrade = typeof card.upgradeLevel === 'number' ? `<span class="badge">+${card.upgradeLevel}</span>` : '';
  return `
    <span class="badge">${QUALITY_LABELS[template.quality]}</span>
    ${duration}
    ${upgrade}
    ${cooldown}
  `;
}

export function renderCardChip(card, actions = [], options = {}) {
  const template = getTemplate(card.templateId);
  const variant = options.variant || 'default';
  const draggable = options.draggable ? 'draggable="true"' : '';
  const dragPayload = options.dragPayload ? `data-drag-payload="${escapeHtml(JSON.stringify(options.dragPayload))}"` : '';
  const label = template.type === 'room'
    ? renderIcon('room')
    : template.type === 'npc'
      ? renderIcon('npc')
      : template.type === 'event'
        ? renderIcon('event')
        : renderIcon(template.type === 'shield' ? 'shield' : 'loot');

  return `
    <article class="card-chip card-chip-${variant} ${QUALITY_CLASS[template.quality]}" ${draggable} ${dragPayload}>
      <div class="card-chip-head">
        <div class="card-chip-copy">
          <div class="card-chip-title-row">
            ${label}
            <h4>${escapeHtml(template.name)}</h4>
          </div>
          <p>${escapeHtml(template.description)}</p>
        </div>
        <div class="card-chip-badges">
          ${renderBadges(template, card)}
        </div>
      </div>
      ${actions.length ? `<div class="card-actions">${actions.join('')}</div>` : ''}
    </article>
  `;
}
