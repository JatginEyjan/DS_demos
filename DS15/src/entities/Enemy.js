export class Enemy {
  constructor(scene, x, y, speed = 70, hp = 30) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, "enemy");
    this.sprite.setData("entity", this);
    this.speed = speed;
    this.hp = hp;
  }

  update(targetX, targetY) {
    this.scene.physics.moveTo(this.sprite, targetX, targetY, this.speed);
  }

  hit(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }

  destroy() {
    this.sprite.destroy();
  }
}
