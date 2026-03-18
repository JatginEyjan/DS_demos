export class ReputationSystem {
  constructor(scene) {
    this.scene = scene;
  }

  calculateCustomerSatisfaction(customer, waitTime) {
    const patience = customer.stats.patience;
    const ratio = waitTime / patience;
    
    if (ratio < 0.5) return 2; // Very satisfied
    if (ratio < 0.8) return 1; // Satisfied
    if (ratio < 1.0) return 0; // Neutral
    return -1; // Dissatisfied
  }

  getReputationEffects(reputation) {
    return {
      vipChance: Math.max(0, Math.min(0.3, 0.1 + reputation / 200)),
      spyChance: Math.max(0.05, 0.2 - reputation / 200),
      customerQuality: reputation > 50 ? 'high' : reputation < -50 ? 'low' : 'normal'
    };
  }

  checkEndingConditions(data) {
    if (data.reputation >= 80 && data.day >= 50) {
      return '改革者';
    }
    if (data.reputation <= -80) {
      return '权贵走狗';
    }
    if (data.day >= 100 && data.heat < 30) {
      return '地下传奇';
    }
    return null;
  }
}
