import { renderHUDBar } from './HUDBar.js';
import { renderLogPanel } from './LogPanel.js';

export function renderAppShell(session, content, sceneLabel, uiState) {
  return `
    <div class="shell ${session.state.hero ? 'shell-run' : 'shell-menu'}">
      ${renderHUDBar(session, sceneLabel)}
      <div class="shell-content">
        ${content}
      </div>
      ${session.state.hero ? renderLogPanel(session, uiState.logsOpen) : ''}
    </div>
  `;
}
