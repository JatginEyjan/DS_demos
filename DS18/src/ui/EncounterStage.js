import { EXECUTION_MS_PER_HOUR } from '../config/constants.js';
import { getTemplate } from '../data/cards.js';
import { escapeHtml } from '../utils/html.js';
import { describeLoot, getDangerLevel, getRoomModeInfo, renderStars } from './intel.js';
import { renderIcon } from './icons.js';
import { renderCardChip } from './CardView.js';

export function renderEncounterStage(session, executionState) {
  const slots = session.state.layouts[session.state.day] || [];
  const slot = slots[executionState?.slotIndex || 0];
  if (!slot) {
    return `
      <section class="encounter-stage panel">
        <div class="encounter-stage-empty">
          <h2>执行完成</h2>
          <p>所有卡槽已经结算完毕，正在进入下一阶段。</p>
        </div>
      </section>
    `;
  }

  const template = getTemplate(slot.card.templateId);
  const segment = session.timelineSystem.getSlotTimeSegments(session.state.day)[executionState.slotIndex];
  const roomMode = segment?.mode === 'night' ? 'night' : 'day';
  const roomData = template[roomMode];
  const modeInfo = getRoomModeInfo(segment?.mode || 'day');
  const progress = Math.min(100, ((executionState.slotElapsedMs || 0) / Math.max(1, (template.duration || 1) * EXECUTION_MS_PER_HOUR)) * 100);
  const lootLabels = describeLoot(roomData?.loot || [], false);
  const enemyTitle = template.type === 'room'
    ? (segment?.mode === 'night' ? '夜袭怪群' : segment?.mode === 'twilight' ? '昼夜交界敌群' : '已知驻留敌群')
    : '功能结算';

  return `
    <section class="encounter-stage panel">
      <div class="encounter-stage-scene ${modeInfo.tone}">
        <div class="encounter-stage-overlay"></div>
        <div class="encounter-stage-head">
          <div>
            <p class="eyebrow">${modeInfo.label}</p>
            <h2>${escapeHtml(template.name)}</h2>
            <p>${escapeHtml(template.description)}</p>
          </div>
          <div class="encounter-stage-meta">
            <span>${renderIcon('day')} ${segment ? `${segment.start}h → ${segment.end}h` : '待推进'}</span>
            <span>${renderIcon('drag')} 速度 ${executionState.speedLabel}</span>
          </div>
        </div>

        <div class="encounter-stage-grid">
          <article class="encounter-card hero-side">
            <h3>勇者前线</h3>
            <div class="encounter-kv">
              <span>攻击</span>
              <strong>${session.state.hero.attack}</strong>
            </div>
            <div class="encounter-kv">
              <span>防御</span>
              <strong>${session.state.hero.defense}</strong>
            </div>
            <div class="encounter-kv">
              <span>治疗瓶</span>
              <strong>${session.state.hero.flasks} / ${session.state.hero.maxFlasks}</strong>
            </div>
            <div class="meter meter-hp"><span style="width:${(session.state.hero.currentHp / session.state.hero.maxHp) * 100}%"></span></div>
            <small>${session.state.hero.currentHp} / ${session.state.hero.maxHp}</small>
          </article>

          <article class="encounter-card enemy-side">
            <h3>${enemyTitle}</h3>
            ${
              template.type === 'room'
                ? `
                  <div class="encounter-kv">
                    <span>危险度</span>
                    <strong>${renderStars(getDangerLevel(roomData?.power, roomData?.hp))}</strong>
                  </div>
                  <div class="encounter-kv">
                    <span>敌群强度</span>
                    <strong>${roomData?.power || 0}</strong>
                  </div>
                  <div class="encounter-kv">
                    <span>敌群生命</span>
                    <strong>${roomData?.hp || 0}</strong>
                  </div>
                `
                : `
                  <div class="encounter-kv">
                    <span>功能卡</span>
                    <strong>${template.id === 'time_bonfire' ? '回复与升级' : '提前撤离'}</strong>
                  </div>
                `
            }
          </article>
        </div>

        <div class="encounter-stage-foot">
          <div class="encounter-stage-track">
            <span>当前卡槽推进</span>
            <div class="meter meter-amber"><span style="width:${progress}%"></span></div>
          </div>
          <div class="encounter-stage-tags">
            ${(slot.embeds || []).map((embed) => {
              const embedTemplate = getTemplate(embed.templateId);
              return `<span class="intel-tag">${embedTemplate.type === 'npc' ? renderIcon('npc') : renderIcon('event')}${escapeHtml(embedTemplate.name)}</span>`;
            }).join('') || '<span class="intel-tag muted">当前没有镶嵌支援</span>'}
          </div>
        </div>
      </div>

      <div class="encounter-support-grid">
        <article class="encounter-card">
          <h3>${renderIcon('loot')} 已揭示掉落</h3>
          <div class="intel-tags">${lootLabels.map((label) => `<span class="intel-tag">${escapeHtml(label)}</span>`).join('')}</div>
        </article>
        <article class="encounter-card">
          <h3>行动与消耗品</h3>
          <div class="encounter-toolbar-actions">
            <button data-action="use-flask">使用治疗瓶</button>
            <button data-action="set-speed" data-speed="1" class="${executionState.speed === 1 ? 'is-active' : ''}">1x</button>
            <button data-action="set-speed" data-speed="2" class="${executionState.speed === 2 ? 'is-active' : ''}">2x</button>
          </div>
          <div class="encounter-consumables">
            ${
              session.state.inventory.filter((card) => getTemplate(card.templateId).type === 'consumable').map((card) =>
                renderCardChip(card, [`<button data-action="use-item" data-card-id="${card.id}">使用</button>`], {
                  variant: 'compact'
                })
              ).join('') || '<div class="empty-panel">当前没有可用消耗品。</div>'
            }
          </div>
        </article>
      </div>
    </section>
  `;
}
