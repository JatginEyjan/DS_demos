import { canEmbedIntoRoom, getTemplate } from '../data/cards.js';

export class CardSystem {
  constructor(session) {
    this.session = session;
  }

  placeCard(cardId, day, insertIndex = null) {
    return this.session.preLayoutSystem.placeCard(cardId, day, insertIndex);
  }

  moveSlot(day, index, direction) {
    const slots = this.session.state.layouts[day];
    const nextIndex = index + direction;
    if (!slots || !slots[index] || !slots[nextIndex]) return;
    const [slot] = slots.splice(index, 1);
    slots.splice(nextIndex, 0, slot);
    this.session.log(`已调整第 ${day} 天卡槽顺序。`);
    this.session.persist();
  }

  moveSlotToIndex(day, fromIndex, toIndex) {
    const slots = this.session.state.layouts[day];
    if (!slots || !slots[fromIndex]) return { ok: false, reason: '目标卡槽不存在。' };

    const boundedIndex = Math.max(0, Math.min(toIndex, slots.length));
    const [slot] = slots.splice(fromIndex, 1);
    const adjustedIndex = boundedIndex > fromIndex ? boundedIndex - 1 : boundedIndex;
    slots.splice(adjustedIndex, 0, slot);
    this.session.log(`已拖拽调整第 ${day} 天卡槽顺序。`);
    this.session.persist();
    return { ok: true };
  }

  removeSlot(day, index) {
    const slots = this.session.state.layouts[day];
    if (!slots || !slots[index]) return;
    const [slot] = slots.splice(index, 1);
    this.session.inventorySystem.returnCard(slot.card);
    slot.embeds.forEach((embed) => this.session.inventorySystem.returnCard(embed));
    this.session.log(`已将 ${getTemplate(slot.card.templateId).name} 从第 ${day} 天取回。`);
    this.session.heroSystem.syncDerivedStats();
    this.session.persist();
  }

  canEmbedCard(cardId, day, slotIndex) {
    const card = this.session.inventorySystem.getCardById(cardId);
    const slot = this.session.state.layouts[day]?.[slotIndex];
    if (!card || !slot) return { ok: false, reason: '目标房间不存在。' };

    const embedTemplate = getTemplate(card.templateId);
    const roomTemplate = getTemplate(slot.card.templateId);
    if (!embedTemplate || (embedTemplate.type !== 'npc' && embedTemplate.type !== 'event')) {
      return { ok: false, reason: '只有 NPC 卡和事件卡能镶嵌。' };
    }
    if (!canEmbedIntoRoom(card.templateId, slot.card.templateId)) {
      return { ok: false, reason: '卡牌品质超出房间可镶嵌上限。' };
    }

    const sameTypeCount = slot.embeds.filter((embed) => getTemplate(embed.templateId).type === embedTemplate.type).length;
    const capacity = roomTemplate.embedCapacity?.[embedTemplate.type] || 0;
    if (sameTypeCount >= capacity) {
      return { ok: false, reason: `该房间的 ${embedTemplate.type === 'npc' ? 'NPC' : '事件'} 插槽已满。` };
    }
    if (card.currentCooldown > 0) {
      return { ok: false, reason: '该卡仍在冷却中。' };
    }

    return { ok: true };
  }

  embedCard(cardId, day, slotIndex) {
    const validation = this.canEmbedCard(cardId, day, slotIndex);
    if (!validation.ok) return validation;

    const inventoryIndex = this.session.state.inventory.findIndex((item) => item.id === cardId);
    const [card] = this.session.state.inventory.splice(inventoryIndex, 1);
    this.session.state.layouts[day][slotIndex].embeds.push(card);
    this.session.log(
      `已将 ${getTemplate(card.templateId).name} 镶嵌到 ${getTemplate(this.session.state.layouts[day][slotIndex].card.templateId).name}。`
    );
    this.session.persist();
    return { ok: true };
  }

  removeEmbed(day, slotIndex, embedIndex) {
    const slot = this.session.state.layouts[day]?.[slotIndex];
    if (!slot || !slot.embeds[embedIndex]) return;
    const [embed] = slot.embeds.splice(embedIndex, 1);
    this.session.inventorySystem.returnCard(embed);
    this.session.log(`已取回镶嵌卡 ${getTemplate(embed.templateId).name}。`);
    this.session.persist();
  }

  reclaimDayCards(day) {
    const slots = this.session.state.layouts[day] || [];
    slots.forEach((slot) => {
      this.reclaimCardAfterUse(slot.card);
      slot.embeds.forEach((embed) => this.reclaimCardAfterUse(embed));
    });
    this.session.state.layouts[day] = [];
  }

  reclaimCardAfterUse(card) {
    const template = getTemplate(card.templateId);
    if (!template) return;
    if (template.type === 'event' || template.consumable) {
      return;
    }
    if (template.type === 'npc' && template.cooldownDays) {
      card.currentCooldown = template.cooldownDays;
    }
    this.session.inventorySystem.returnCard(card);
  }
}
