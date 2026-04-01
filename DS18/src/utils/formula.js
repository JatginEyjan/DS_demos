export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

export function getUpgradeCost(level) {
  return Math.round(100 * Math.pow(level / 10, 1.5) + level * 20);
}
