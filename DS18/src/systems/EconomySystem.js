export class EconomySystem {
  constructor(session) {
    this.session = session;
  }

  addSouls(amount) {
    this.session.state.hero.souls += amount;
    this.session.eventBus.emit('economy:souls_changed', {
      amount,
      nextSouls: this.session.state.hero.souls,
      type: 'gain'
    });
  }

  spendSouls(amount) {
    if (this.session.state.hero.souls < amount) return false;
    this.session.state.hero.souls -= amount;
    this.session.eventBus.emit('economy:souls_changed', {
      amount: -amount,
      nextSouls: this.session.state.hero.souls,
      type: 'spend'
    });
    return true;
  }

  addMaterial(materialId, amount = 1) {
    this.session.state.hero.materials[materialId] = (this.session.state.hero.materials[materialId] || 0) + amount;
    this.session.state.dayContext.dailyMaterialGain[materialId] =
      (this.session.state.dayContext.dailyMaterialGain[materialId] || 0) + amount;
  }

  spendMaterial(materialId, amount = 1) {
    if ((this.session.state.hero.materials[materialId] || 0) < amount) return false;
    this.session.state.hero.materials[materialId] -= amount;
    return true;
  }
}
