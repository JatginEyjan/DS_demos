import Phaser from 'phaser'
import { StartScene } from '../scenes/StartScene'
import { BattleScene } from '../battle/BattleScene'
import { PostBattleScene } from '../battle/PostBattleScene'
import { UpgradeScene } from '../upgrade/UpgradeScene'
import { MapScene } from '../map/MapScene'

export class Game {
  private game: Phaser.Game

  constructor() {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      parent: 'game-container',
      backgroundColor: '#1a1a2e',
      scene: [StartScene, MapScene, BattleScene, PostBattleScene, UpgradeScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    }

    this.game = new Phaser.Game(config)
  }
}
