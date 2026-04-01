import { getTemplate } from '../data/cards.js';

export class PreLayoutSystem {
  constructor(session) {
    this.session = session;
  }

  canPlaceCard(cardId, day) {
    const card = this.session.inventorySystem.getCardById(cardId);
    if (!card) return { ok: false, reason: '卡牌不在背包中。' };
    const template = getTemplate(card.templateId);
    if (!template || template.category !== 'journey') {
      return { ok: false, reason: '当前只支持将路程卡放入时间轴。' };
    }
    if (card.currentCooldown > 0) {
      return { ok: false, reason: '该卡仍在冷却中。' };
    }
    const usedHours = this.session.timelineSystem.getUsedHours(day);
    if (usedHours + (template.duration || 0) > this.session.state.hero.enduranceHours) {
      return { ok: false, reason: '超过当天耐力预算。' };
    }
    if (day < this.session.state.day) {
      return { ok: false, reason: '过去的日期不能再编辑。' };
    }
    if (this.session.state.scene === 'execution' && day === this.session.state.day) {
      return { ok: false, reason: '执行中的当天已锁定。' };
    }
    return { ok: true };
  }

  placeCard(cardId, day) {
    const validation = this.canPlaceCard(cardId, day);
    if (!validation.ok) return validation;

    const index = this.session.state.inventory.findIndex((item) => item.id === cardId);
    const [removedCard] = this.session.state.inventory.splice(index, 1);
    this.session.state.layouts[day].push({
      card: removedCard,
      embeds: []
    });
    this.session.log(`已将 ${getTemplate(removedCard.templateId).name} 放入第 ${day} 天时间轴。`);
    this.session.heroSystem.syncDerivedStats();
    this.session.persist();
    return { ok: true };
  }
}
