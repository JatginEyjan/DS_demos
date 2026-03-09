import Phaser from "../../vendor/phaser.esm.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Weapon } from "../entities/Weapon.js";

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
    });

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.weapon = new Weapon(this, this.bullets);

    this.spawnEvent = this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: this.spawnEnemy,
      callbackScope: this,
    });

    this.surviveSeconds = 0;
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.surviveSeconds += 1;
      },
    });

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, undefined, this);
    this.physics.add.overlap(this.player.sprite, this.enemies, this.onPlayerHit, undefined, this);

    this.hud = this.add
      .text(16, 16, "", {
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 8, y: 6 },
      })
      .setDepth(1000)
      .setScrollFactor(0);

    this.isGameOver = false;
  }

  update(time) {
    if (this.isGameOver) {
      return;
    }

    this.player.update(this.keys, time);

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash)) {
      this.player.tryDash(time);
    }

    this.weapon.tryFire(time, this.player.sprite, this.enemies);

    for (const enemySprite of this.enemies.getChildren()) {
      const entity = enemySprite.getData("entity");
      if (entity) {
        entity.update(this.player.sprite.x, this.player.sprite.y);
      }
    }

    const dashSeconds = Math.ceil(this.player.getDashCooldownLeft(time) / 1000);
    this.hud.setText([
      `HP: ${Math.max(0, this.player.hp)}`,
      `生存: ${this.surviveSeconds}s`,
      `敌人: ${this.enemies.countActive(true)}`,
      `冲刺CD: ${dashSeconds}s`,
    ]);

    this.cleanupBullets();
  }

  spawnEnemy() {
    if (this.isGameOver) {
      return;
    }

    const spawnDistance = 500;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const x = this.player.sprite.x + Math.cos(angle) * spawnDistance;
    const y = this.player.sprite.y + Math.sin(angle) * spawnDistance;

    const safeX = Phaser.Math.Clamp(x, 20, 1980);
    const safeY = Phaser.Math.Clamp(y, 20, 1980);

    const enemy = new Enemy(this, safeX, safeY);
    this.enemies.add(enemy.sprite);
  }

  onBulletHit(bullet, enemySprite) {
    const damage = bullet.getData("damage") ?? 10;
    const enemy = enemySprite.getData("entity");
    bullet.destroy();

    if (!enemy) {
      return;
    }

    if (enemy.hit(damage)) {
      enemy.destroy();
    }
  }

  onPlayerHit() {
    if (this.player.isInvincible || this.isGameOver) {
      return;
    }

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
      this.gameOver();
    }
  }

  cleanupBullets() {
    for (const bullet of this.bullets.getChildren()) {
      if (
        bullet.x < -100 ||
        bullet.y < -100 ||
        bullet.x > 2100 ||
        bullet.y > 2100
      ) {
        bullet.destroy();
      }
    }
  }

  gameOver() {
    this.isGameOver = true;
    this.spawnEvent.remove(false);
    this.player.sprite.setVelocity(0, 0);

    this.add
      .text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, "蒸汽熄火\n按 R 重开", {
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
