import { QUALITY_CLASS, QUALITY_LABELS, getTemplate } from '../data/cards.js';
import { escapeHtml } from '../utils/html.js';

export function renderCardChip(card, actions = []) {
  const template = getTemplate(card.templateId);
  const cooldown = card.currentCooldown > 0 ? `<span class="badge muted">冷却 ${card.currentCooldown} 天</span>` : '';
  const duration = typeof template.duration === 'number' ? `<span class="badge">${template.duration}h</span>` : '';
  const upgrade = typeof card.upgradeLevel === 'number' ? `<span class="badge">+${card.upgradeLevel}</span>` : '';

  return `
    <article class="card-chip ${QUALITY_CLASS[template.quality]}">
      <div class="card-chip-head">
        <div>
          <h4>${escapeHtml(template.name)}</h4>
          <p>${escapeHtml(template.description)}</p>
        </div>
        <div class="card-chip-badges">
          <span class="badge">${QUALITY_LABELS[template.quality]}</span>
          ${duration}
          ${upgrade}
          ${cooldown}
        </div>
      </div>
      ${actions.length ? `<div class="card-actions">${actions.join('')}</div>` : ''}
    </article>
  `;
}
