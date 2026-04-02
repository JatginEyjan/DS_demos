import { ATTRIBUTE_LABELS } from '../data/classes.js';
import { getTemplate } from '../data/cards.js';
import { renderIcon } from './icons.js';

export function renderHeroStats(session) {
  const hero = session.state.hero;
  const weapon = session.getEquippedCard('weapon');
  const armor = session.getEquippedCard('armor');
  const shield = session.getEquippedCard('shield');
  const attributes = Object.entries(hero.attributes).map(([key, value]) => `
    <div class="mini-stat">
      <span>${ATTRIBUTE_LABELS[key]}</span>
      <strong>${value}</strong>
    </div>
  `).join('');

  return `
    <section class="hero-stats-panel">
      <div class="intel-card">
        <h3>勇者属性</h3>
        <div class="mini-stats">${attributes}</div>
      </div>
      <div class="intel-card">
        <h3>装备栏</h3>
        <div class="hero-equipment-list">
          <span>${renderIcon('room')} ${weapon ? getTemplate(weapon.templateId).name : '无武器'}</span>
          <span>${renderIcon('shield')} ${armor ? getTemplate(armor.templateId).name : '无护甲'}</span>
          <span>${renderIcon('shield')} ${shield ? getTemplate(shield.templateId).name : '无副手'}</span>
          <span>${renderIcon('flask')} 治疗 ${hero.flasks}/${hero.maxFlasks}</span>
        </div>
      </div>
    </section>
  `;
}
