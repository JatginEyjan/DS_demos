import Phaser from "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.esm.js";

export class Weapon {
  constructor(scene, bulletsGroup) {
    this.scene = scene;
    this.bullets = bulletsGroup;
    this.damage = 15;
    this.fireIntervalMs = 350;
    this.lastShotAt = -99999;
  }

  tryFire(time, owner, enemies) {
    if (time - this.lastShotAt < this.fireIntervalMs) {
      return;
    }

    const activeEnemies = enemies.getChildren().filter((enemy) => enemy.active);
    if (activeEnemies.length === 0) {
      return;
    }

    let nearest = activeEnemies[0];
    let minDistance = Number.MAX_VALUE;

    for (const enemy of activeEnemies) {
      const d = Phaser.Math.Distance.Between(owner.x, owner.y, enemy.x, enemy.y);
      if (d < minDistance) {
        minDistance = d;
        nearest = enemy;
      }
    }

    const bullet = this.bullets.create(owner.x, owner.y, "bullet");
    bullet.setData("damage", this.damage);
    bullet.setCircle(5);
    this.scene.physics.moveToObject(bullet, nearest, 360);

    this.lastShotAt = time;
  }
}
