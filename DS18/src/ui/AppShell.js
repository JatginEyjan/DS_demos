import { renderDashboard } from './HeroStatusPanel.js';
import { renderLogPanel } from './LogPanel.js';

export function renderAppShell(session, content, sceneLabel) {
  return `
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">DS18 Demo</p>
          <h1>命运编排者</h1>
        </div>
        <div class="topbar-actions">
          ${session.state.hero ? '<button data-action="restart-run">重开战役</button>' : ''}
          <button data-action="clear-save">清空存档</button>
        </div>
      </header>
      ${renderDashboard(session, sceneLabel)}
      ${content}
      ${session.state.hero ? renderLogPanel(session) : ''}
    </div>
  `;
}
