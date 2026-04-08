export function renderDaySchedule(session) {
  return `
    <section>
      <h3>未来三天概览</h3>
      ${[1, 2, 3].map((day) => `
        <div class="mini-day ${day === session.state.day ? 'is-current' : ''}">
          <strong>Day ${day}</strong>
          <span>${(session.state.layouts[day] || []).length} 张卡 / ${session.timelineSystem.getUsedHours(day)}h</span>
        </div>
      `).join('')}
    </section>
  `;
}
