import { escapeHtml, formatTimestamp } from '../utils/html.js';

export function renderLogPanel(session, isOpen) {
  const logs = session.state.logs.slice(0, 12).map((entry) => `
    <li class="log-item ${entry.tone}">
      <span class="log-day">Day ${entry.day}</span>
      <span>${escapeHtml(entry.message)}</span>
    </li>
  `).join('');

  return `
    <aside class="log-drawer ${isOpen ? 'is-open' : ''}">
      <div class="log-drawer-head">
        <div>
          <h2>战役日志</h2>
          <span>保存于 ${formatTimestamp(session.state.saveStamp)}</span>
        </div>
        <button data-action="toggle-logs">${isOpen ? '收起' : '展开'}</button>
      </div>
      <div class="log-drawer-body">
        <ul class="log-list">${logs || '<li class="empty-panel">尚无日志。</li>'}</ul>
      </div>
    </aside>
  `;
}
