import * as Phaser from "../../vendor/phaser.esm.js";

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, "player");
    this.sprite.setCollideWorldBounds(true);

    this.hp = 100;
    this.speed = 180;

    this.dashDistance = 150;
    this.dashDurationMs = 300;
    this.dashCooldownMs = 4000;

    this.lastDashAt = -99999;
    this.isDashing = false;
    this.isInvincible = false;
  }

  update(keys, time) {
    if (!this.isDashing) {
      const vx = (keys.left.isDown ? -1 : 0) + (keys.right.isDown ? 1 : 0);
      const vy = (keys.up.isDown ? -1 : 0) + (keys.down.isDown ? 1 : 0);
      const velocity = new Phaser.Math.Vector2(vx, vy).normalize().scale(this.speed);
      this.sprite.setVelocity(velocity.x, velocity.y);
    }

    return this.getDashCooldownLeft(time);
  }

  tryDash(time) {
    if (this.isDashing || time - this.lastDashAt < this.dashCooldownMs) {
      return false;
    }

    const current = new Phaser.Math.Vector2(this.sprite.body.velocity.x, this.sprite.body.velocity.y);
    const dir = current.lengthSq() > 0 ? current.normalize() : new Phaser.Math.Vector2(1, 0);

    this.lastDashAt = time;
    this.isDashing = true;
    this.isInvincible = true;
    this.sprite.setVelocity(0, 0);

    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + dir.x * this.dashDistance,
      y: this.sprite.y + dir.y * this.dashDistance,
      duration: this.dashDurationMs,
      ease: "Cubic.Out",
      onStart: () => {
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0.35,
          duration: 70,
          yoyo: true,
          repeat: 2,
        });
      },
      onComplete: () => {
        this.sprite.setAlpha(1);
        this.isDashing = false;
        this.isInvincible = false;
      },
    });

    return true;
  }

  getDashCooldownLeft(time) {
    return Math.max(0, this.dashCooldownMs - (time - this.lastDashAt));
  }
}
