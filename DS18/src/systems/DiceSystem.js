import { clamp } from '../utils/formula.js';
import { randomInt } from '../utils/random.js';

export class DiceSystem {
  constructor(session) {
    this.session = session;
  }

  roll() {
    const intelligenceModifier = Math.floor((this.session.state.hero.attributes.intelligence - 5) / 5);
    const raw = randomInt(1, 6);
    const final = clamp(raw + intelligenceModifier, 1, 6);
    this.session.log(`骰子判定：${raw} + ${intelligenceModifier} = ${final}。`);
    return final;
  }
}
