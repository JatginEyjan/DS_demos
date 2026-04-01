import { getTemplate } from '../data/cards.js';
import { ATTRIBUTE_LABELS } from '../data/classes.js';

export class InventorySystem {
  constructor(session) {
    this.session = session;
  }

  getCardById(cardId) {
    return this.session.state.inventory.find((card) => card.id === cardId) || null;
  }

  findCardEverywhere(cardId) {
    const inInventory = this.getCardById(cardId);
    if (inInventory) return inInventory;

    for (const day of Object.keys(this.session.state.layouts || {}).map(Number)) {
      for (const slot of this.session.state.layouts[day] || []) {
        if (slot.card.id === cardId) return slot.card;
        for (const embed of slot.embeds) {
          if (embed.id === cardId) return embed;
        }
      }
    }

    return null;
  }

  hasCapacity() {
    return this.session.state.inventory.length < this.session.state.hero.maxInventorySize;
  }

  getOverflowSoulValue(template) {
    if (!template) return 20;
    return {
      common: 25,
      rare: 60,
      epic: 120,
      legendary: 200
    }[template.quality] || 25;
  }

  canEquip(cardId) {
    const card = this.getCardById(cardId) || this.findCardEverywhere(cardId);
    if (!card) {
      return { ok: false, reason: '装备不存在。' };
    }

    const template = getTemplate(card.templateId);
    const requirements = template?.requirements || {};
    for (const [attribute, requiredValue] of Object.entries(requirements)) {
      if ((this.session.state.hero.attributes[attribute] || 0) < requiredValue) {
        return {
          ok: false,
          reason: `${template.name} 需要 ${ATTRIBUTE_LABELS[attribute] || attribute} ${requiredValue}`
        };
      }
    }

    return { ok: true };
  }

  addCard(card, options = {}) {
    const { onFull = 'block', sourceLabel = '获得物品' } = options;

    if (this.hasCapacity()) {
      this.session.state.inventory.push(card);
      return { ok: true, mode: 'added' };
    }

    const template = getTemplate(card.templateId);
    if (onFull === 'soulify') {
      const soulValue = options.soulValue ?? this.getOverflowSoulValue(template);
      this.session.economySystem.addSouls(soulValue);
      this.session.log(`背包已满，${sourceLabel}「${template.name}」自动转化为 ${soulValue} 灵魂。`, 'warning');
      return { ok: true, mode: 'soulified', soulValue };
    }

    this.session.log(`背包已满，无法获得 ${template.name}。`, 'warning');
    return { ok: false, mode: 'blocked', reason: '背包已满' };
  }

  returnCard(card) {
    const template = getTemplate(card.templateId);
    if (!template) return;

    if (template.type === 'weapon' && !this.session.state.hero.weaponId) {
      this.session.state.hero.weaponId = card.id;
    }
    if (template.type === 'armor' && !this.session.state.hero.armorId) {
      this.session.state.hero.armorId = card.id;
    }

    this.session.state.inventory.push(card);
  }

  equip(cardId, slotType) {
    const validation = this.canEquip(cardId);
    if (!validation.ok) {
      this.session.log(validation.reason, 'warning');
      return validation;
    }

    if (slotType === 'weapon') {
      this.session.state.hero.weaponId = cardId;
    }
    if (slotType === 'armor') {
      this.session.state.hero.armorId = cardId;
    }

    const equipped = this.findCardEverywhere(cardId);
    if (equipped) {
      this.session.log(`已装备 ${getTemplate(equipped.templateId).name}。`, 'positive');
    }

    return { ok: true };
  }
}
