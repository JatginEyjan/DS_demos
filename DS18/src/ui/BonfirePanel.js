import { ATTRIBUTE_LABELS } from '../data/classes.js';

export function renderBonfirePanel(session) {
  const ctx = session.state.dayContext;
  return `
    <article class="summary-box">
      <h3>成长服务</h3>
      <div class="service-grid">
        ${Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => `
          <button data-action="upgrade-attr" data-attr="${key}">
            ${label} +1
            <small>${session.heroSystem.getUpgradeCost(key)} 灵魂</small>
          </button>
        `).join('')}
      </div>
      <button data-action="upgrade-weapon">强化当前武器</button>
      <p class="muted-text">
        ${ctx.bonfireUsed || ctx.fireKeeperAvailable ? '今日可升级属性。' : '今天没有篝火或防火女，无法升级属性。'}
        ${ctx.blacksmithAvailable ? ' 已解锁铁匠强化。' : ''}
      </p>
    </article>
  `;
}
