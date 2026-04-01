export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}
