import { createCardTemplate } from './CardBase.js';

export function createEquipmentCard(definition) {
  return createCardTemplate({
    category: 'character',
    ...definition
  });
}
