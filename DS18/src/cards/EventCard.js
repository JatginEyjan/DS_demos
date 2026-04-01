import { createCardTemplate } from './CardBase.js';

export function createEventCard(definition) {
  return createCardTemplate({
    category: 'embed',
    type: 'event',
    consumable: true,
    ...definition
  });
}
