import { getTemplate } from '../data/cards.js';
import { renderCardChip } from '../ui/CardView.js';
import { renderHeroStats } from '../ui/HeroStatusPanel.js';
import { renderBossHUD } from '../ui/BossHUD.js';

export function renderBossScene(session) {
  return `
    <div class="scene scene-boss">
      <div class="workspace boss-mode">
      <main class="panel main-panel">
        <div class="panel-head">
          <div>
            <h2>Boss 战</h2>
            <p>堕落骑士进入最终试炼。${session.state.boss?.approachBoost > 1 ? '本次为强制 Boss 战，敌人已强化。' : session.state.boss?.isEarlyChallenge ? '这是一次提前挑战，胜利奖励已提升 20%。' : ''}</p>
          </div>
          <div class="inline-actions">
            <button data-action="use-flask">使用治疗瓶</button>
          </div>
        </div>
        ${renderBossHUD(session)}
      </main>
      <aside class="panel side-panel">
        <section>
          <h3>Boss 战消耗品</h3>
          ${
            session.state.inventory.filter((card) => getTemplate(card.templateId).type === 'consumable').map((card) =>
              renderCardChip(card, [`<button data-action="use-item" data-card-id="${card.id}">使用</button>`])
            ).join('') || '<div class="empty-panel">背包里没有可用消耗品。</div>'
          }
        </section>
        ${renderHeroStats(session)}
      </aside>
      </div>
    </div>
  `;
}
