export function createBossState(phase) {
  return {
    phaseIndex: 0,
    turn: 1,
    hp: phase.hp,
    maxHp: phase.hp,
    pendingSpecial: phase.special
  };
}
