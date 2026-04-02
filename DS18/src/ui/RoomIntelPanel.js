import { getTemplate } from '../data/cards.js';
import { describeLoot, getDangerLevel, getRewardLevel, getRoomModeInfo, renderStars } from './intel.js';
import { renderIcon } from './icons.js';
import { escapeHtml } from '../utils/html.js';

function renderTagList(items, tone = '') {
  return items.map((item) => `<span class="intel-tag ${tone}">${escapeHtml(item)}</span>`).join('');
}

export function renderRoomIntelPanel(session, selectedSlot, day) {
  const hero = session.state.hero;
  const weapon = session.getEquippedCard('weapon');
  const armor = session.getEquippedCard('armor');
  const shield = session.getEquippedCard('shield');

  if (!selectedSlot) {
    return `
      <section class="intel-panel panel">
        <div class="intel-card">
          <h3>房间情报</h3>
          <p class="muted-text">选中时间轴中的房间卡后，这里会显示危险度、收益预估、镶嵌容量与夜晚迷雾信息。</p>
        </div>
        <div class="intel-card">
          <h3>勇者状态</h3>
          <div class="hero-equipment-list">
            <span>${renderIcon('room')} 攻击 ${hero.attack}</span>
            <span>${renderIcon('shield')} 防御 ${hero.defense}</span>
            <span>${renderIcon('flask')} 治疗瓶 ${hero.flasks}/${hero.maxFlasks}</span>
            <span>${renderIcon('souls')} 背包 ${session.state.inventory.length}/${hero.maxInventorySize}</span>
          </div>
          <div class="hero-gear-summary">
            <strong>${weapon ? getTemplate(weapon.templateId).name : '无武器'}</strong>
            <span>${armor ? getTemplate(armor.templateId).name : '无护甲'} / ${shield ? getTemplate(shield.templateId).name : '无副手'}</span>
          </div>
        </div>
      </section>
    `;
  }

  const template = getTemplate(selectedSlot.card.templateId);
  const segment = session.timelineSystem.getSlotTimeSegments(day)[selectedSlot.index];
  const roomMode = segment?.mode === 'night' ? 'night' : 'day';
  const roomData = template?.type === 'room' ? template?.[roomMode] : null;
  const fogged = segment?.mode === 'night';
  const modeInfo = getRoomModeInfo(segment?.mode || 'day');
  const lootLabels = describeLoot(roomData?.loot || [], fogged);
  const embedCount = selectedSlot.embeds.length;

  return `
    <section class="intel-panel panel">
      <div class="intel-card">
        <div class="intel-card-head">
          <div>
            <p class="eyebrow">Room Intel</p>
            <h3>${escapeHtml(template.name)}</h3>
          </div>
          <span class="intel-mode ${modeInfo.tone}">${modeInfo.label}</span>
        </div>
        <p>${template.type !== 'room' ? '这是一张功能路程卡，主要用于改变流程节奏或补给状态。' : fogged ? '夜晚房间的怪物细节仍被迷雾遮蔽，只能看到大致风险范围。' : escapeHtml(template.description)}</p>
        <div class="intel-metrics">
          <div class="intel-metric">
            <span>危险度</span>
            <strong>${template.type === 'room' ? renderStars(getDangerLevel(roomData?.power, roomData?.hp)) : '功能'}</strong>
          </div>
          <div class="intel-metric">
            <span>收益预估</span>
            <strong>${template.type === 'room' ? renderStars(getRewardLevel(roomData?.souls || [0, 0])) : '支援'}</strong>
          </div>
          <div class="intel-metric">
            <span>时段</span>
            <strong>${segment ? `${segment.start}h → ${segment.end}h` : '待定'}</strong>
          </div>
        </div>
        <div class="intel-row">
          <span>${renderIcon('npc')} 镶嵌容量 NPC ×${template.embedCapacity?.npc || 0}</span>
          <span>${renderIcon('event')} 事件 ×${template.embedCapacity?.event || 0}</span>
          <span>${renderIcon('drag')} 已镶嵌 ${embedCount}</span>
        </div>
        <div class="intel-group">
          <h4>已知掉落 / 迷雾掉落</h4>
          <div class="intel-tags">${template.type === 'room' ? renderTagList(lootLabels, fogged ? 'fog' : '') : '<span class="intel-tag">无战斗掉落</span>'}</div>
        </div>
        <div class="intel-group">
          <h4>房间特性</h4>
          <div class="intel-tags">${renderTagList([
            segment?.mode === 'twilight' ? '跨昼夜结算' : modeInfo.label,
            template.comboTags?.length ? `标签：${template.comboTags.join(' / ')}` : '无特殊连锁',
            template.consumable ? '消耗型卡牌' : '可回收路程卡'
          ])}</div>
        </div>
      </div>
      <div class="intel-card">
        <h3>勇者状态</h3>
        <div class="hero-equipment-list">
          <span>${renderIcon('room')} 攻击 ${hero.attack}</span>
          <span>${renderIcon('shield')} 防御 ${hero.defense}</span>
          <span>${renderIcon('flask')} 治疗瓶 ${hero.flasks}/${hero.maxFlasks}</span>
          <span>${renderIcon('souls')} 背包 ${session.state.inventory.length}/${hero.maxInventorySize}</span>
        </div>
        <div class="hero-gear-summary">
          <strong>${weapon ? getTemplate(weapon.templateId).name : '无武器'}</strong>
          <span>${armor ? getTemplate(armor.templateId).name : '无护甲'} / ${shield ? getTemplate(shield.templateId).name : '无副手'}</span>
        </div>
      </div>
    </section>
  `;
}
