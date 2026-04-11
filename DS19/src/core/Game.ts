import Phaser from 'phaser'
import { BattleScene } from '../battle/BattleScene'

export class Game {
  private game: Phaser.Game

  constructor() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: 'game-container',
      backgroundColor: '#1a1a2e',
      scene: [BattleScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    }

    this.game = new Phaser.Game(config)
  }
}
