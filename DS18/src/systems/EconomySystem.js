export class EconomySystem {
  constructor(session) {
    this.session = session;
  }

  addSouls(amount) {
    this.session.state.hero.souls += amount;
  }

  spendSouls(amount) {
    if (this.session.state.hero.souls < amount) return false;
    this.session.state.hero.souls -= amount;
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
