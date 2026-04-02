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
  const needsEliteDecision = session.state.day < session.state.totalDays;
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
  const eliteRewardChoices = ctx.eliteRewardChoices.map((choice) => {
    const label = choice.type === 'souls'
      ? choice.payload.label
      : choice.type === 'attribute'
        ? choice.payload.label
        : getTemplate(choice.payload.templateId).name;
    return `
      <button class="${ctx.eliteRewardChosen ? 'disabled-like' : ''}" data-action="choose-elite-reward" data-reward-id="${choice.id}" ${ctx.eliteRewardChosen ? 'disabled' : ''}>
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
            ${needsEliteDecision ? `<p class="muted-text">${ctx.eliteDecisionMade ? `今日精英决策：${ctx.eliteOutcome === 'victory' ? '已击败精英' : ctx.eliteOutcome === 'skipped' ? '已跳过精英' : '已提前挑战 Boss'}` : '进入下一天前，需先决定是否挑战今日精英。'}</p>` : ''}
            ${session.state.bossApproach >= 70 && session.state.day < session.state.totalDays ? '<p class="muted-text">Boss 逼近度已超过 70，你也可以提前挑战 Boss。</p>' : ''}
          </div>
          <div class="inline-actions">
            <button class="primary" data-action="next-day" ${needsEliteDecision && !ctx.eliteDecisionMade ? 'disabled title="请先完成精英决策"' : ''}>${session.state.day >= session.state.totalDays ? '进入 Boss 战' : '进入下一天'}</button>
            ${needsEliteDecision && !ctx.eliteDecisionMade ? '<button data-action="challenge-elite">挑战精英</button><button data-action="skip-elite">跳过精英</button>' : ''}
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

          <article class="summary-box">
            <h3>精英决策</h3>
            ${
              !needsEliteDecision
                ? '<div class="empty-panel">最后一天无需处理精英决策。</div>'
                : !ctx.eliteDecisionMade
                  ? '<p class="muted-text">挑战精英可降低 Boss 逼近度 3 点并获得额外三选一；跳过则 Boss 逼近度 +5。</p>'
                  : ctx.eliteOutcome === 'victory'
                    ? `<div class="reward-row">${eliteRewardChoices || '<div class="empty-panel">暂无精英奖励。</div>'}</div>${ctx.eliteRewardChosen ? '<p class="muted-text">精英奖励已领取。</p>' : '<p class="muted-text">击败精英后可额外领取一项奖励。</p>'}`
                    : `<p class="muted-text">${ctx.eliteOutcome === 'skipped' ? '你已跳过今日精英战。' : '你已选择提前挑战 Boss。'}</p>`
            }
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
