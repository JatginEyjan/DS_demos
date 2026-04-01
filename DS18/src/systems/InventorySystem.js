import { getTemplate } from '../data/cards.js';

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

    for (const day of [1, 2, 3]) {
      for (const slot of this.session.state.layouts[day] || []) {
        if (slot.card.id === cardId) return slot.card;
        for (const embed of slot.embeds) {
          if (embed.id === cardId) return embed;
        }
      }
    }

    return null;
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
    if (slotType === 'weapon') {
      this.session.state.hero.weaponId = cardId;
    }
    if (slotType === 'armor') {
      this.session.state.hero.armorId = cardId;
    }
  }
}
