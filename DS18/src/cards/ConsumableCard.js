import { createCardTemplate } from './CardBase.js';

export function createConsumableCard(definition) {
  return createCardTemplate({
    category: 'character',
    type: 'consumable',
    consumable: true,
    ...definition
  });
}
