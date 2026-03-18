export class ScheduleSystem {
  constructor(scene) {
    this.scene = scene;
  }

  getTimeSlotRisk(slot) {
    // Risk varies by time of day
    const risks = [0.1, 0.2, 0.15, 0.3, 0.25, 0.4];
    return risks[slot] || 0.1;
  }

  getCustomerSpawnRate(slot) {
    // More customers in evening
    const rates = [2, 3, 3, 5, 4, 2];
    return rates[slot] || 2;
  }

  shouldTriggerEvent(heat) {
    // Random events based on heat
    const baseChance = 0.05;
    const heatModifier = heat / 100;
    return Math.random() < (baseChance + heatModifier * 0.3);
  }
}
