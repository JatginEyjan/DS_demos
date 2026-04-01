export class BossApproachSystem {
  constructor(session) {
    this.session = session;
  }

  advanceDay() {
    this.session.state.bossApproach += 10;
  }
}
