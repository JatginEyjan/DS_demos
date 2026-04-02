export function renderDayPlannerStrip(session, uiState) {
  return `
    <section class="planner-strip">
      <div class="planner-strip-head">
        <h3>多日规划条</h3>
        <span>过去日期锁定，当前与未来日期可查看和预布局</span>
      </div>
      <div class="planner-strip-list">
        ${Array.from({ length: session.state.totalDays }, (_, index) => index + 1).map((day) => {
          const isPast = day < session.state.day;
          const isCurrent = day === session.state.day;
          const isSelected = day === uiState.selectedPlanningDay;
          return `
            <button
              class="planner-day ${isPast ? 'is-past' : ''} ${isCurrent ? 'is-current' : ''} ${isSelected ? 'is-selected' : ''}"
              data-action="select-day"
              data-day="${day}"
              ${isPast ? 'disabled' : ''}
            >
              <strong>Day ${day}</strong>
              <span>${(session.state.layouts[day] || []).length} 张卡</span>
              <small>${session.timelineSystem.getUsedHours(day)}h</small>
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `;
}
