import { createCardTemplate } from './CardBase.js';

export function createTimeCard(definition) {
  return createCardTemplate({
    category: 'journey',
    type: 'time',
    ...definition
  });
}
