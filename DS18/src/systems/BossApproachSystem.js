export class BossApproachSystem {
  constructor(session) {
    this.session = session;
  }

  change(amount, reason = 'unknown') {
    const previous = this.session.state.bossApproach;
    this.session.state.bossApproach = Math.max(0, previous + amount);
    return {
      previous,
      current: this.session.state.bossApproach,
      delta: this.session.state.bossApproach - previous,
      reason
    };
  }

  advanceDay() {
    return this.change(10, 'advance_day');
  }

  addCardPressure(amount) {
    return this.change(amount, 'high_quality_card');
  }

  skipElite() {
    return this.change(5, 'skip_elite');
  }

  defeatElite() {
    return this.change(-3, 'defeat_elite');
  }

  canChallengeEarlyBoss() {
    return this.session.state.bossApproach >= 70 && this.session.state.bossApproach < 100;
  }

  shouldForceBoss() {
    return this.session.state.bossApproach >= 100;
  }
}
