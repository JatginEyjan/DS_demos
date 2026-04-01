import { createCardTemplate } from './CardBase.js';

export function createRoomCard(definition) {
  return createCardTemplate({
    category: 'journey',
    type: 'room',
    ...definition
  });
}
