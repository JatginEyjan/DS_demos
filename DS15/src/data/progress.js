const STORAGE_KEY = "ds15.workshop.v1";

const DEFAULT_PROGRESS = {
  brassGears: 0,
  upgrades: {
    maxHp: 0,
    speed: 0,
    expGain: 0,
  },
};

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
    const parsed = JSON.parse(raw);
    return {
      brassGears: Number(parsed.brassGears || 0),
      upgrades: {
        maxHp: Number(parsed?.upgrades?.maxHp || 0),
        speed: Number(parsed?.upgrades?.speed || 0),
        expGain: Number(parsed?.upgrades?.expGain || 0),
      },
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getUpgradeCost(level) {
  return 20 + level * 15;
}
