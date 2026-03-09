import * as Phaser from "../../vendor/phaser.esm.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Weapon } from "../entities/Weapon.js";

const UPGRADE_POOL = [
  {
    id: "hp",
    label: "生命强化",
    desc: "+30 最大生命，+30 当前生命",
    apply: (scene) => {
      scene.player.maxHp += 30;
      scene.player.hp = Math.min(scene.player.maxHp, scene.player.hp + 30);
    },
  },
  {
    id: "speed",
    label: "蒸汽增压",
    desc: "+12% 移速",
    apply: (scene) => {
      scene.player.speed = Math.floor(scene.player.speed * 1.12);
    },
  },
  {
    id: "dash",
    label: "冲刺冷却",
    desc: "冲刺CD -15%",
    apply: (scene) => {
      scene.player.dashCooldownMs = Math.max(1200, Math.floor(scene.player.dashCooldownMs * 0.85));
    },
  },
  {
    id: "pickup",
    label: "齿轮磁场",
    desc: "+25 拾取范围",
    apply: (scene) => {
      scene.player.pickupRange += 25;
    },
  },
  {
    id: "exp",
    label: "精密拆解",
    desc: "+20% 经验获取",
    apply: (scene) => {
      scene.player.expGainMultiplier = Number((scene.player.expGainMultiplier * 1.2).toFixed(2));
    },
  },
];

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.physics.world.setBounds(0, 0, 2000, 2000);

    this.player = new Player(this, 1000, 1000);

    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 2000, 2000);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
    });

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.expOrbs = this.physics.add.group();
    this.weapon = new Weapon(this, this.bullets);

    this.spawnEvent = this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: this.spawnEnemyWave,
      callbackScope: this,
    });

    this.matchDurationSeconds = 30 * 60;
    this.remainingSeconds = this.matchDurationSeconds;
    this.surviveSeconds = 0;
    this.hasDiedThisRun = false;

    this.countdownEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isGameOver || this.awaitingUpgrade) return;
        this.surviveSeconds += 1;
        this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);
        if (this.remainingSeconds <= 0) this.gameWin();
      },
    });

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, undefined, this);
    this.physics.add.overlap(this.player.sprite, this.enemies, this.onPlayerHit, undefined, this);
    this.physics.add.overlap(this.player.sprite, this.expOrbs, this.onPickupExpOrb, undefined, this);

    this.playerLevel = 1;
    this.playerExp = 0;
    this.expToNext = 20;
    this.awaitingUpgrade = false;
    this.currentUpgradeChoices = [];

    this.hud = this.add
      .text(16, 16, "", {
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 8, y: 6 },
      })
      .setDepth(1000)
      .setScrollFactor(0);

    this.expBarBg = this.add.rectangle(16, 164, 260, 14, 0x222222, 0.85).setOrigin(0, 0).setDepth(1000).setScrollFactor(0);
    this.expBarFill = this.add.rectangle(18, 166, 0, 10, 0xf2dc6a, 1).setOrigin(0, 0).setDepth(1001).setScrollFactor(0);

    this.upgradeBackdrop = this.add
      .rectangle(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, 760, 360, 0x111111, 0.85)
      .setDepth(1198)
      .setScrollFactor(0)
      .setVisible(false);

    this.upgradePanel = this.add
      .text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, "", {
        fontSize: "24px",
        color: "#ffe9a8",
        align: "left",
        wordWrap: { width: 680 },
      })
      .setOrigin(0.5)
      .setDepth(1200)
      .setScrollFactor(0)
      .setVisible(false);

    this.isGameOver = false;
  }

  update(time) {
    if (this.isGameOver) return;

    if (this.awaitingUpgrade) {
      this.player.sprite.setVelocity(0, 0);
      for (const enemySprite of this.enemies.getChildren()) enemySprite.setVelocity(0, 0);

      if (Phaser.Input.Keyboard.JustDown(this.keys.one)) this.pickUpgradeByIndex(0);
      if (Phaser.Input.Keyboard.JustDown(this.keys.two)) this.pickUpgradeByIndex(1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.three)) this.pickUpgradeByIndex(2);

      this.updateHud(time);
      return;
    }

    this.player.update(this.keys, time);

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash)) {
      this.player.tryDash(time);
    }

    this.weapon.tryFire(time, this.player.sprite, this.enemies);

    for (const enemySprite of this.enemies.getChildren()) {
      const entity = enemySprite.getData("entity");
      if (entity) entity.update(this.player.sprite.x, this.player.sprite.y);
    }

    this.collectNearbyOrbs();
    this.updateHud(time);
    this.cleanupBullets();
  }

  updateHud(time) {
    const dashSeconds = Math.ceil(this.player.getDashCooldownLeft(time) / 1000);
    this.hud.setText([
      `倒计时: ${formatCountdown(this.remainingSeconds)}`,
      `HP: ${Math.max(0, this.player.hp)}/${this.player.maxHp}`,
      `生存: ${this.surviveSeconds}s`,
      `敌人: ${this.enemies.countActive(true)}`,
      `等级: Lv.${this.playerLevel}`,
      `EXP: ${this.playerExp}/${this.expToNext}`,
      `冲刺CD: ${dashSeconds}s`,
      `拾取范围: ${Math.floor(this.player.pickupRange)}`,
      `经验倍率: x${this.player.expGainMultiplier.toFixed(2)}`,
      `无死亡标记: ${this.hasDiedThisRun ? "否" : "是"}`,
      `阶段: ${this.getStageLabel()}`,
    ]);

    const expRatio = Phaser.Math.Clamp(this.playerExp / this.expToNext, 0, 1);
    this.expBarFill.width = Math.floor(256 * expRatio);
  }

  collectNearbyOrbs() {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    for (const orb of this.expOrbs.getChildren()) {
      const dist = Phaser.Math.Distance.Between(px, py, orb.x, orb.y);
      if (dist <= this.player.pickupRange) {
        const speed = 160 + (this.player.pickupRange - dist) * 2;
        this.physics.moveTo(orb, px, py, speed);
      } else {
        orb.setVelocity(0, 0);
      }
    }
  }

  getStageLabel() {
    if (this.surviveSeconds < 180) return "I";
    if (this.surviveSeconds < 420) return "II";
    if (this.surviveSeconds < 780) return "III";
    return "IV";
  }

  getSpawnBatchSize() {
    if (this.surviveSeconds < 180) return 1;
    if (this.surviveSeconds < 420) return 2;
    if (this.surviveSeconds < 780) return 3;
    return 4;
  }

  spawnEnemyWave() {
    if (this.isGameOver || this.awaitingUpgrade) return;

    const batch = this.getSpawnBatchSize();
    for (let i = 0; i < batch; i += 1) {
      const spawnDistance = 500;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const x = this.player.sprite.x + Math.cos(angle) * spawnDistance;
      const y = this.player.sprite.y + Math.sin(angle) * spawnDistance;

      const safeX = Phaser.Math.Clamp(x, 20, 1980);
      const safeY = Phaser.Math.Clamp(y, 20, 1980);

      const profile = Enemy.createProfile(this.surviveSeconds);
      const enemy = new Enemy(this, safeX, safeY, profile);
      this.enemies.add(enemy.sprite);
    }

    const nextDelay = this.surviveSeconds < 180 ? 1100 : this.surviveSeconds < 420 ? 900 : this.surviveSeconds < 780 ? 760 : 640;
    this.spawnEvent.delay = nextDelay;
  }

  onBulletHit(bullet, enemySprite) {
    const damage = bullet.getData("damage") ?? 10;
    const enemy = enemySprite.getData("entity");
    bullet.destroy();

    if (!enemy) return;

    if (enemy.hit(damage)) {
      const dropValue = enemy.getExpReward();
      this.spawnExpOrb(enemy.sprite.x, enemy.sprite.y, dropValue);
      enemy.destroy();
    }
  }

  spawnExpOrb(x, y, value) {
    const orb = this.physics.add.sprite(x, y, "xp_orb");
    orb.setData("exp", value);
    orb.setDepth(2);
    this.expOrbs.add(orb);

    this.tweens.add({
      targets: orb,
      scale: { from: 1, to: 1.2 },
      yoyo: true,
      repeat: -1,
      duration: 280,
    });
  }

  onPickupExpOrb(_playerSprite, orb) {
    const exp = orb.getData("exp") ?? 0;
    orb.destroy();
    this.gainExp(exp);
  }

  gainExp(amount) {
    if (!amount || amount <= 0) return;

    const gained = Math.max(1, Math.round(amount * this.player.expGainMultiplier));
    this.playerExp += gained;

    while (this.playerExp >= this.expToNext) {
      this.playerExp -= this.expToNext;
      this.playerLevel += 1;
      this.expToNext = Math.floor(this.expToNext * 1.25);
      this.showLevelUpChoices();
    }
  }

  showLevelUpChoices() {
    this.awaitingUpgrade = true;
    this.spawnEvent.paused = true;

    const shuffled = Phaser.Utils.Array.Shuffle([...UPGRADE_POOL]);
    this.currentUpgradeChoices = shuffled.slice(0, 3);

    const lines = [
      `升级！Lv.${this.playerLevel}`,
      "按 1/2/3 选择一项强化：",
      "",
      ...this.currentUpgradeChoices.map((item, idx) => `${idx + 1}. ${item.label} — ${item.desc}`),
    ];

    this.upgradeBackdrop.setVisible(true);
    this.upgradePanel.setText(lines.join("\n")).setVisible(true);
  }

  pickUpgradeByIndex(index) {
    const item = this.currentUpgradeChoices[index];
    if (!item) return;

    item.apply(this);
    this.currentUpgradeChoices = [];
    this.awaitingUpgrade = false;
    this.spawnEvent.paused = false;
    this.upgradeBackdrop.setVisible(false);
    this.upgradePanel.setVisible(false);
  }

  onPlayerHit() {
    if (this.player.isInvincible || this.isGameOver || this.awaitingUpgrade) return;

    this.player.hp -= 10;
    this.player.isInvincible = true;

    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0.35,
      duration: 90,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.player.sprite.setAlpha(1);
        this.player.isInvincible = false;
      },
    });

    if (this.player.hp <= 0) {
      this.hasDiedThisRun = true;
      this.gameOver();
    }
  }

  cleanupBullets() {
    for (const bullet of this.bullets.getChildren()) {
      if (bullet.x < -100 || bullet.y < -100 || bullet.x > 2100 || bullet.y > 2100) bullet.destroy();
    }
  }

  stopCombatLoops() {
    this.spawnEvent.remove(false);
    this.countdownEvent.remove(false);
    this.player.sprite.setVelocity(0, 0);
    for (const enemySprite of this.enemies.getChildren()) enemySprite.setVelocity(0, 0);
  }

  gameWin() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.stopCombatLoops();

    const noDeath = !this.hasDiedThisRun;
    this.registry.set("ds15.lastRun", {
      result: "win",
      noDeath,
      surviveSeconds: this.surviveSeconds,
      finishedAt: Date.now(),
    });

    this.add
      .text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, `生存成功！\n无死亡标记: ${noDeath ? "达成" : "未达成"}\n按 R 重开`, {
        fontSize: "42px",
        color: "#9df0a8",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: { x: 14, y: 10 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(1200);

    this.input.keyboard.once("keydown-R", () => {
      this.scene.restart();
    });
  }

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.stopCombatLoops();

    this.registry.set("ds15.lastRun", {
      result: "lose",
      noDeath: false,
      surviveSeconds: this.surviveSeconds,
      finishedAt: Date.now(),
    });

    this.add
      .text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, "蒸汽熄火（失败）\n按 R 重开", {
        fontSize: "44px",
        color: "#ffbf86",
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: { x: 14, y: 10 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(1200);

    this.input.keyboard.once("keydown-R", () => {
      this.scene.restart();
    });
  }
}
