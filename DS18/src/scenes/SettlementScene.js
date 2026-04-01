import { getTemplate } from '../data/cards.js';
import { escapeHtml } from '../utils/html.js';
import { renderBonfirePanel } from '../ui/BonfirePanel.js';
import { renderHeroStats } from '../ui/HeroStatusPanel.js';

function settlementReasonLabel(reason) {
  if (reason === 'first_death') return '勇者在当天倒下，灵魂已掉落到死亡房间。';
  if (reason === 'return_card') return '返回卡让你提前带着收益撤出。';
  return '今日流程结束，你可以结算收益并准备下一步。';
}

export function renderSettlementScene(session) {
  const ctx = session.state.dayContext;
  const rewardChoices = ctx.rewardChoices.map((choice) => {
    const label = choice.type === 'souls'
      ? choice.payload.label
      : choice.type === 'attribute'
        ? choice.payload.label
        : getTemplate(choice.payload.templateId).name;
    return `
      <button class="${ctx.rewardChosen ? 'disabled-like' : ''}" data-action="choose-reward" data-reward-id="${choice.id}" ${ctx.rewardChosen ? 'disabled' : ''}>
        ${escapeHtml(label)}
      </button>
    `;
  }).join('');

  const merchantOffers = ctx.merchantOffers.length
    ? ctx.merchantOffers.map((offer) => {
        const template = getTemplate(offer.templateId);
        return `
          <div class="offer-row">
            <span>${escapeHtml(template.name)}</span>
            <button data-action="buy-offer" data-offer-id="${offer.id}">${offer.price} 灵魂</button>
          </div>
        `;
      }).join('')
    : '<div class="empty-panel">今天没有商人服务。</div>';

  return `
    <div class="workspace">
      <main class="panel main-panel">
        <div class="panel-head">
          <div>
            <h2>结算阶段</h2>
            <p>${settlementReasonLabel(ctx.reason)}</p>
            <p class="muted-text">点击“进入下一天”时，若尚未选奖励，系统会自动领取默认奖励。</p>
            ${session.state.bossApproach >= 70 && session.state.day < session.state.totalDays ? '<p class="muted-text">Boss 逼近度已超过 70，你也可以提前挑战 Boss。</p>' : ''}
          </div>
          <div class="inline-actions">
            <button class="primary" data-action="next-day">${session.state.day >= session.state.totalDays ? '进入 Boss 战' : '进入下一天'}</button>
            ${session.state.bossApproach >= 70 && session.state.day < session.state.totalDays ? '<button data-action="start-boss-now">立即挑战 Boss</button>' : ''}
          </div>
        </div>

        <section class="settlement-grid">
          <article class="summary-box">
            <h3>今日总结</h3>
            <ul class="summary-list">
              ${ctx.summary.map((line) => `<li>${escapeHtml(line)}</li>`).join('') || '<li>今天过得异常平静。</li>'}
            </ul>
            <div class="material-row">
              <span>普通石 ${session.state.hero.materials.material_shard || 0}（今日 +${ctx.dailyMaterialGain.material_shard || 0}）</span>
              <span>大块石 ${session.state.hero.materials.material_chunk || 0}（今日 +${ctx.dailyMaterialGain.material_chunk || 0}）</span>
            </div>
          </article>

          <article class="summary-box">
            <h3>结算奖励</h3>
            <div class="reward-row">${rewardChoices || '<div class="empty-panel">暂无奖励可选。</div>'}</div>
            ${ctx.rewardChosen ? '<p class="muted-text">奖励已领取，可以继续推进流程。</p>' : ''}
          </article>

          ${renderBonfirePanel(session)}

          <article class="summary-box">
            <h3>商人</h3>
            ${merchantOffers}
          </article>
        </section>
      </main>
      <aside class="panel side-panel">
        ${renderHeroStats(session)}
      </aside>
    </div>
  `;
}
