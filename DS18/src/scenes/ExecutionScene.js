import { renderEncounterStage } from '../ui/EncounterStage.js';
import { renderExecutionTimelineStrip } from '../ui/ExecutionTimelineStrip.js';

export function renderExecutionScene(session, uiState) {
  return `
    <div class="scene scene-execution">
      <main class="scene-main execution-main">
        <section class="planner-callout panel">
          <div>
            <p class="eyebrow">Execution Phase</p>
            <h2>命运正在推进</h2>
            <p>勇者会沿你铺设的轨迹自动行动。你可以在这里观察遭遇、切换速度，并在关键时刻使用治疗瓶或消耗品。</p>
          </div>
          <div class="inline-actions">
            <button data-action="set-speed" data-speed="1" class="${uiState.executionSpeed === 1 ? 'is-active' : ''}">1x</button>
            <button data-action="set-speed" data-speed="2" class="${uiState.executionSpeed === 2 ? 'is-active' : ''}">2x</button>
            <button data-action="use-flask">使用治疗瓶</button>
          </div>
        </section>
        ${renderEncounterStage(session, {
          ...session.state.execution,
          speed: uiState.executionSpeed,
          speedLabel: `${uiState.executionSpeed}x`
        })}
        ${renderExecutionTimelineStrip(session)}
      </main>
    </div>
  `;
}
