import { escapeHtml, formatTimestamp } from '../utils/html.js';

export function renderLogPanel(session) {
  const logs = session.state.logs.slice(0, 12).map((entry) => `
    <li class="log-item ${entry.tone}">
      <span class="log-day">Day ${entry.day}</span>
      <span>${escapeHtml(entry.message)}</span>
    </li>
  `).join('');

  return `
    <aside class="panel log-panel">
      <div class="panel-head">
        <h2>战役日志</h2>
        <span>保存于 ${formatTimestamp(session.state.saveStamp)}</span>
      </div>
      <ul class="log-list">${logs}</ul>
    </aside>
  `;
}
