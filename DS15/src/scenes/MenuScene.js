import * as Phaser from "../../vendor/phaser.esm.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 40, "齿轮之心：蒸汽幸存者", {
        fontSize: "38px",
        color: "#f2c679",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 16, "WASD 移动 · 空格冲刺 · 自动攻击", {
        fontSize: "21px",
        color: "#d8d2c7",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 74, "按空格开始", {
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.input.keyboard.once("keydown-SPACE", () => {
      this.scene.start("GameScene");
    });
  }
}
