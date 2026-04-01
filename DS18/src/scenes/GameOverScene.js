export function renderGameOverScene(session, type) {
  const isVictory = type === 'victory';
  return `
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">${isVictory ? 'Run Complete' : 'Run Failed'}</p>
        <h1>${isVictory ? '堕落骑士已陨落' : '命运编排中断'}</h1>
        <p>
          ${isVictory
            ? '你完成了 3 天短线战役，验证了这套规划 → 自走 → 结算的核心循环。'
            : '勇者未能活着走到终局，但日志和系统状态都保留了下来，便于继续调试。'}
        </p>
        <div class="menu-actions">
          <button class="primary" data-action="restart-run">重新开始</button>
          <button class="ghost" data-action="clear-save">清除本地存档</button>
        </div>
      </div>
      <div class="hero-summary">
        <h3>本局结果</h3>
        <ul>
          <li>最终天数：Day ${session.state.day}</li>
          <li>灵魂储备：${session.state.hero.souls}</li>
          <li>Boss 逼近度：${session.state.bossApproach}</li>
          <li>最终生命：${session.state.hero.currentHp} / ${session.state.hero.maxHp}</li>
        </ul>
      </div>
    </section>
  `;
}
