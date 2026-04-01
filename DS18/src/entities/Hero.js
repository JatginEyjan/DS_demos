export function createHero() {
  return {
    className: '不死战士',
    level: 1,
    souls: 0,
    attributes: {
      vitality: 12,
      endurance: 14,
      strength: 14,
      dexterity: 9,
      intelligence: 7,
      faith: 8
    },
    currentHp: 180,
    maxHp: 180,
    flasks: 3,
    maxFlasks: 3,
    materials: {
      material_shard: 0,
      material_chunk: 0
    },
    weaponId: null,
    armorId: null,
    attackBuffRooms: 0,
    attackBuffMultiplier: 1,
    curseAttackMultiplier: 1
  };
}

export function ensureHeroState(hero) {
  if (!hero) return hero;
  hero.materials = hero.materials || {
    material_shard: 0,
    material_chunk: 0
  };
  return hero;
}
