const SAVE_KEY = 'ds18_save_v1';
export const SAVE_VERSION = '0.1.1';

function ensureMaterials(hero) {
  hero.materials = hero.materials || {};
  hero.materials.material_shard = hero.materials.material_shard || 0;
  hero.materials.material_chunk = hero.materials.material_chunk || 0;
}

function ensureLayouts(layouts, totalDays = 3) {
  const nextLayouts = layouts || {};
  for (let day = 1; day <= totalDays; day += 1) {
    nextLayouts[day] = nextLayouts[day] || [];
  }
  return nextLayouts;
}

function ensureDayContext(dayContext) {
  return {
    bonfireUsed: false,
    fireKeeperAvailable: false,
    blacksmithAvailable: false,
    merchantOffers: [],
    rewardChoices: [],
    rewardChosen: false,
    summary: [],
    dailySoulGain: 0,
    dailyMaterialGain: {
      material_shard: 0,
      material_chunk: 0
    },
    reason: 'day_end',
    eliteDecisionMade: false,
    eliteResolved: false,
    eliteOutcome: null,
    eliteRewardChoices: [],
    eliteRewardChosen: false,
    earlyBossRewardBonus: 1,
    ...dayContext,
    dailyMaterialGain: {
      material_shard: 0,
      material_chunk: 0,
      ...(dayContext?.dailyMaterialGain || {})
    },
    merchantOffers: dayContext?.merchantOffers || [],
    rewardChoices: dayContext?.rewardChoices || [],
    summary: dayContext?.summary || [],
    eliteRewardChoices: dayContext?.eliteRewardChoices || []
  };
}

function normalizeVersion(version) {
  if (!version || version === '0.1') return '0.1';
  return version;
}

export function migrateSave(data) {
  if (!data || typeof data !== 'object') return null;

  const migrated = JSON.parse(JSON.stringify(data));
  const version = normalizeVersion(migrated.version);

  if (version === '0.1') {
    migrated.totalDays = migrated.totalDays || 3;
    migrated.layouts = ensureLayouts(migrated.layouts, migrated.totalDays);
    if (migrated.hero) {
      ensureMaterials(migrated.hero);
      migrated.hero.shieldId = migrated.hero.shieldId || null;
    }
    migrated.bossApproach = migrated.bossApproach || 0;
    migrated.dayContext = ensureDayContext(migrated.dayContext);
    migrated.version = SAVE_VERSION;
    return migrated;
  }

  migrated.totalDays = migrated.totalDays || 3;
  migrated.layouts = ensureLayouts(migrated.layouts, migrated.totalDays);
  if (migrated.hero) {
    ensureMaterials(migrated.hero);
    migrated.hero.shieldId = migrated.hero.shieldId || null;
  }
  migrated.bossApproach = migrated.bossApproach || 0;
  migrated.dayContext = ensureDayContext(migrated.dayContext);
  migrated.version = SAVE_VERSION;
  return migrated;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? migrateSave(JSON.parse(raw)) : null;
  } catch (error) {
    console.warn('Failed to load save', error);
    return null;
  }
}

export function writeSave(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    ...state,
    version: SAVE_VERSION
  }));
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
