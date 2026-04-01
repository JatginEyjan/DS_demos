import { getTemplate } from '../data/cards.js';

export class DeathSystem {
  constructor(session) {
    this.session = session;
  }

  recoverSoulsIfNeeded(roomTemplateId) {
    if (
      this.session.state.deathState.droppedSouls > 0 &&
      this.session.state.deathState.dropRoomTemplateId === roomTemplateId
    ) {
      this.session.state.hero.souls += this.session.state.deathState.droppedSouls;
      this.session.log(
        `你在 ${getTemplate(roomTemplateId).name} 找回了先前掉落的 ${this.session.state.deathState.droppedSouls} 灵魂。`,
        'positive'
      );
      this.session.state.deathState = {
        deathCount: 0,
        droppedSouls: 0,
        dropRoomTemplateId: null
      };
    }
  }

  handleHeroDeath(roomTemplateId) {
    if (this.session.state.scene === 'gameover') return;

    if (this.session.state.deathState.deathCount === 0) {
      const droppedSouls = this.session.state.hero.souls;
      this.session.state.hero.souls = 0;
      this.session.state.deathState = {
        deathCount: 1,
        droppedSouls,
        dropRoomTemplateId: roomTemplateId
      };
      this.session.log(`勇者第一次死亡，${droppedSouls} 灵魂掉落在 ${getTemplate(roomTemplateId).name}。`, 'warning');
      this.session.finishDay('first_death');
      return;
    }

    this.session.state.scene = 'gameover';
    this.session.state.execution = null;
    this.session.log('勇者在未找回灵魂时再次倒下。战役结束。', 'danger');
    this.session.persist();
  }
}
