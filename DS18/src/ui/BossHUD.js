export function renderBossHUD(session) {
  const boss = session.state.boss;
  const phaseIndex = boss.phaseIndex;
  const phaseNames = ['第一阶段', '第二阶段', '第三阶段'];
  return `
    <section class="boss-arena">
      <div class="boss-card">
        <span class="eyebrow">堕落骑士</span>
        <h3>${['守誓骑士', '堕落骑士', '深渊堕骑'][phaseIndex]}</h3>
        <div class="progress-bar danger"><span style="width:${(boss.hp / boss.maxHp) * 100}%"></span></div>
        <p>${phaseNames[phaseIndex]} / ${boss.turn} 回合</p>
        <p>Boss HP: ${boss.hp} / ${boss.maxHp}</p>
      </div>
      <div class="boss-actions">
        <h3>策略选择</h3>
        <div class="action-grid">
          <button data-action="boss-turn" data-strategy="aggressive" data-response="dodge">全力输出 + 闪避</button>
          <button data-action="boss-turn" data-strategy="aggressive" data-response="tank">全力输出 + 硬扛</button>
          <button data-action="boss-turn" data-strategy="guarded" data-response="block">防守回复 + 格挡</button>
          <button data-action="boss-turn" data-strategy="switch" data-response="item">切换武器 + 道具应对</button>
        </div>
      </div>
    </section>
  `;
}
