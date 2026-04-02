import { ATTRIBUTE_LABELS } from '../data/classes.js';
import { getTemplate } from '../data/cards.js';

export function renderDashboard(session, sceneLabel) {
  if (!session.state.hero) return '';

  const hero = session.state.hero;
  const weapon = session.getEquippedCard('weapon');
  const armor = session.getEquippedCard('armor');
  const shield = session.getEquippedCard('shield');
  return `
    <section class="dashboard">
      <div class="stat-tile">
        <span>当前</span>
        <strong>Day ${session.state.day} / ${session.state.totalDays}</strong>
        <small>${sceneLabel(session.state.scene)}</small>
      </div>
      <div class="stat-tile">
        <span>生命</span>
        <strong>${hero.currentHp} / ${hero.maxHp}</strong>
        <small>治疗瓶 ${hero.flasks}/${hero.maxFlasks}</small>
      </div>
      <div class="stat-tile">
        <span>灵魂</span>
        <strong>${hero.souls}</strong>
        <small>Boss 逼近 ${session.state.bossApproach}</small>
      </div>
      <div class="stat-tile">
        <span>战力</span>
        <strong>攻击 ${hero.attack} / 防御 ${hero.defense}</strong>
        <small>闪避 ${(hero.dodgeRate * 100).toFixed(0)}% / 暴击 ${(hero.critRate * 100).toFixed(0)}%</small>
      </div>
      <div class="stat-tile">
        <span>装备</span>
        <strong>${weapon ? getTemplate(weapon.templateId).name : '无武器'}</strong>
        <small>${armor ? getTemplate(armor.templateId).name : '无护甲'} / ${shield ? getTemplate(shield.templateId).name : '无副手'}</small>
      </div>
    </section>
  `;
}

export function renderHeroStats(session) {
  const attributes = Object.entries(session.state.hero.attributes).map(([key, value]) => `
    <div class="mini-stat">
      <span>${ATTRIBUTE_LABELS[key]}</span>
      <strong>${value}</strong>
    </div>
  `).join('');

  return `
    <section>
      <h3>勇者属性</h3>
      <div class="mini-stats">${attributes}</div>
    </section>
  `;
}
