export function renderMenuScene(hasSave) {
  return `
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">DS18 / Fate Weaver</p>
        <h1>命运编排者</h1>
        <p>
          这是一个按照技术文档重组后的 Web MVP。你可以在规划阶段编排时间轴，
          把 NPC / 事件镶嵌进房间，然后看勇者自动执行，最终挑战堕落骑士。
        </p>
        <div class="menu-actions">
          <button class="primary" data-action="start-run">开始新战役</button>
          ${hasSave ? '<button class="secondary" data-action="resume-run">继续存档</button>' : ''}
          <button class="ghost" data-action="clear-save">清除本地存档</button>
        </div>
      </div>
      <div class="hero-summary">
        <h3>当前实现</h3>
        <ul>
          <li>3 天规划 → 执行 → 结算 → Boss 的完整流程</li>
          <li>房间卡、NPC 卡、事件卡、篝火 / 返回卡</li>
          <li>自动战斗、灵魂掉落、第一次死亡回收机制</li>
          <li>篝火升级、铁匠强化、商人商店、Boss 三阶段</li>
          <li>目录已按技术文档拆成 config / scenes / systems / data / ui / utils</li>
        </ul>
      </div>
    </section>
  `;
}
