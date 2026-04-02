import { renderIcon } from './icons.js';

function progressPercent(current, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

export function renderHUDBar(session, sceneLabel) {
  if (!session.state.hero) {
    return `
      <div class="hud-shell is-menu">
        <div class="hud-brand">
          <p class="eyebrow">DS18 / Fate Weaver</p>
          <h1>命运编排者</h1>
        </div>
        <div class="hud-actions">
          <button data-action="clear-save">清空存档</button>
        </div>
      </div>
    `;
  }

  const hero = session.state.hero;
  return `
    <div class="hud-shell">
      <div class="hud-brand">
        <p class="eyebrow">DS18 / Fate Weaver</p>
        <h1>命运编排者</h1>
        <p class="hud-scene">Day ${session.state.day} / ${session.state.totalDays} · ${sceneLabel(session.state.scene)}</p>
      </div>
      <div class="hud-grid">
        <div class="hud-card hud-card-bar">
          <div class="hud-card-head">
            <span>${renderIcon('hp')} HP</span>
            <strong>${hero.currentHp} / ${hero.maxHp}</strong>
          </div>
          <div class="meter meter-hp"><span style="width:${progressPercent(hero.currentHp, hero.maxHp)}%"></span></div>
        </div>
        <div class="hud-card">
          <span>${renderIcon('souls')} 灵魂</span>
          <strong>${hero.souls}</strong>
        </div>
        <div class="hud-card">
          <span>${renderIcon('flask')} 治疗瓶</span>
          <strong>${hero.flasks} / ${hero.maxFlasks}</strong>
        </div>
        <div class="hud-card hud-card-bar">
          <div class="hud-card-head">
            <span>${renderIcon('boss')} Boss 逼近</span>
            <strong>${session.state.bossApproach}</strong>
          </div>
          <div class="meter meter-boss"><span style="width:${progressPercent(session.state.bossApproach, 100)}%"></span></div>
        </div>
      </div>
      <div class="hud-actions">
        <button data-action="toggle-logs">战役日志</button>
        <button data-action="restart-run">重开战役</button>
        <button data-action="clear-save">清空存档</button>
      </div>
    </div>
  `;
}
