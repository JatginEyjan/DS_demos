import { createCardTemplate } from './CardBase.js';

export function createNPCCard(definition) {
  return createCardTemplate({
    category: 'embed',
    type: 'npc',
    ...definition
  });
}
