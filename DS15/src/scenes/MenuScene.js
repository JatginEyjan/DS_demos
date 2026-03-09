import * as Phaser from "../../vendor/phaser.esm.js";
import { getUpgradeCost, loadProgress, saveProgress } from "../data/progress.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;
    this.progress = loadProgress();

    this.titleText = this.add
      .text(width / 2, height / 2 - 140, "齿轮之心：蒸汽幸存者", {
        fontSize: "38px",
        color: "#f2c679",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 88, "WASD 移动 · 空格冲刺 · 触屏摇杆+冲刺键", {
        fontSize: "21px",
        color: "#d8d2c7",
      })
      .setOrigin(0.5);

    this.workshopText = this.add
      .text(width / 2, height / 2 + 12, "", {
        fontSize: "20px",
        color: "#dfe7f2",
        align: "left",
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    this.hintText = this.add
      .text(width / 2, height / 2 + 182, "空格开始 · 1/2/3 升级工坊（手机点屏幕按钮）", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.input.keyboard.on("keydown-ONE", () => this.tryBuy("maxHp"));
    this.input.keyboard.on("keydown-TWO", () => this.tryBuy("speed"));
    this.input.keyboard.on("keydown-THREE", () => this.tryBuy("expGain"));

    this.input.keyboard.once("keydown-SPACE", () => {
      this.scene.start("GameScene", { workshop: this.progress });
    });

    this.renderWorkshop();
  }

  tryBuy(key) {
    const current = this.progress.upgrades[key] || 0;
    const cost = getUpgradeCost(current);
    if (this.progress.brassGears < cost) {
      this.flashHint(`黄铜齿轮不足（需要 ${cost}）`);
      return;
    }

    this.progress.brassGears -= cost;
    this.progress.upgrades[key] = current + 1;
    saveProgress(this.progress);
    this.renderWorkshop();
    this.flashHint(`工坊升级成功：${this.getUpgradeName(key)} Lv.${this.progress.upgrades[key]}`);
  }

  getUpgradeName(key) {
    if (key === "maxHp") return "强化装甲";
    if (key === "speed") return "蒸汽推进";
    return "精密拆解";
  }

  flashHint(text) {
    this.hintText.setText(text);
    this.time.delayedCall(1200, () => {
      if (this.hintText.active) this.hintText.setText("空格开始 · 1/2/3 升级工坊");
    });
  }

  renderWorkshop() {
    const u = this.progress.upgrades;
    const c1 = getUpgradeCost(u.maxHp);
    const c2 = getUpgradeCost(u.speed);
    const c3 = getUpgradeCost(u.expGain);

    this.workshopText.setText([
      `工坊黄铜齿轮: ${this.progress.brassGears}`,
      `1) 强化装甲 Lv.${u.maxHp}（+10 最大生命/级）  费用:${c1}`,
      `2) 蒸汽推进 Lv.${u.speed}（+4% 移速/级）    费用:${c2}`,
      `3) 精密拆解 Lv.${u.expGain}（+6% 经验/级）   费用:${c3}`,
      "",
      "每局结算会获得黄铜齿轮，局外可持续成长。",
    ]);
  }
}
