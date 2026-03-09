import * as Phaser from "../../vendor/phaser.esm.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.createRuntimeTextures();
    this.scene.start("MenuScene");
  }

  createRuntimeTextures() {
    const g = this.add.graphics();

    g.fillStyle(0xd6a25f, 1);
    g.fillCircle(14, 14, 14);
    g.generateTexture("player", 28, 28);
    g.clear();

    g.fillStyle(0xbd4e3e, 1);
    g.fillRect(0, 0, 22, 22);
    g.generateTexture("enemy", 22, 22);
    g.clear();

    g.fillStyle(0x5ea9df, 1);
    g.fillCircle(5, 5, 5);
    g.generateTexture("bullet", 10, 10);
    g.clear();

    g.destroy();
  }
}
