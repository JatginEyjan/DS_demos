export class BossApproachSystem {
  constructor(session) {
    this.session = session;
  }

  advanceDay() {
    this.session.state.bossApproach += 10;
  }

  addCardPressure(amount) {
    this.session.state.bossApproach += amount;
  }

  skipElite() {
    this.session.state.bossApproach += 5;
  }

  defeatElite() {
    this.session.state.bossApproach = Math.max(0, this.session.state.bossApproach - 3);
  }
}
