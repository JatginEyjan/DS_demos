import { getTemplate } from '../data/cards.js';
import { escapeHtml } from '../utils/html.js';
import { renderCardChip } from '../ui/CardView.js';
import { renderHeroStats } from '../ui/HeroStatusPanel.js';

export function renderExecutionScene(session) {
  const execution = session.state.execution;
  const slots = session.state.layouts[session.state.day] || [];
  const currentSlot = slots[execution?.slotIndex || 0];
  const template = currentSlot ? getTemplate(currentSlot.card.templateId) : null;
  const duration = template?.duration || 1;
  const progress = execution ? Math.min(1, execution.slotElapsedMs / (duration * 450 || 1)) : 0;

  return `
    <div class="workspace">
      <main class="panel main-panel">
        <div class="panel-head">
          <div>
            <h2>执行阶段</h2>
            <p>勇者正在自动沿时间轴推进。你仍可使用治疗瓶或消耗品。</p>
          </div>
          <div class="inline-actions">
            <button data-action="use-flask">使用治疗瓶</button>
          </div>
        </div>
        <section class="execution-focus">
          <div class="focus-card">
            <span class="eyebrow">当前卡槽</span>
            <h3>${template ? escapeHtml(template.name) : '执行完成'}</h3>
            <p>${template ? escapeHtml(template.description) : '正在跳转结算。'}</p>
            <div class="progress-bar"><span style="width:${(progress * 100).toFixed(1)}%"></span></div>
          </div>
          <div class="execution-list">
            ${slots.map((slot, index) => {
              const slotTemplate = getTemplate(slot.card.templateId);
              const status = index < execution.slotIndex ? 'done' : index === execution.slotIndex ? 'current' : 'pending';
              return `
                <div class="execution-item ${status}">
                  <strong>${escapeHtml(slotTemplate.name)}</strong>
                  <span>${status === 'done' ? '已完成' : status === 'current' ? '进行中' : '待执行'}</span>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      </main>
      <aside class="panel side-panel">
        <section>
          <h3>可用消耗品</h3>
          ${
            session.state.inventory.filter((card) => getTemplate(card.templateId).type === 'consumable').map((card) =>
              renderCardChip(card, [`<button data-action="use-item" data-card-id="${card.id}">使用</button>`])
            ).join('') || '<div class="empty-panel">当前没有可用消耗品。</div>'
          }
        </section>
        ${renderHeroStats(session)}
      </aside>
    </div>
  `;
}
