import * as Phaser from "../../vendor/phaser.esm.js";

const WEAPON_DEFS = [
  { id: "tracker", name: "追踪齿轮", kind: "tracking", baseDamage: 12, interval: 360 },
  { id: "shotgun", name: "蒸汽散射", kind: "spread", baseDamage: 8, interval: 560 },
  { id: "orbit", name: "环绕锯片", kind: "orbit", baseDamage: 10, interval: 999999 },
  { id: "mortar", name: "冲击迫弹", kind: "aoe", baseDamage: 18, interval: 920 },
  { id: "rail", name: "穿透钢钉", kind: "pierce", baseDamage: 14, interval: 700 },
  { id: "drone", name: "无人枪骑", kind: "tracking", baseDamage: 20, interval: 1200 },
];

export class Weapon {
  constructor(scene, bulletsGroup) {
    this.scene = scene;
    this.bullets = bulletsGroup;

    this.slots = WEAPON_DEFS.map((def, index) => ({
      ...def,
      level: index === 0 ? 1 : 0,
      unlocked: index === 0,
      lastShotAt: -99999,
    }));

    this.orbitBlades = [];
    this.orbitDamageCooldownMs = 220;
  }

  getUnlockedSlots() {
    return this.slots.filter((s) => s.unlocked);
  }

  getSummary() {
    return this.slots.map((slot, idx) => `${idx + 1}.${slot.name} ${slot.unlocked ? `Lv${slot.level}` : "-"}`).join(" | ");
  }

  getUpgradePreview() {
    const nextLocked = this.slots.find((s) => !s.unlocked);
    if (nextLocked) return `解锁新武器：${nextLocked.name}`;
    const candidates = this.getUnlockedSlots().sort((a, b) => a.level - b.level);
    return `强化武器：${candidates[0]?.name || "追踪齿轮"}`;
  }

  applyUpgrade() {
    const nextLocked = this.slots.find((s) => !s.unlocked);
    if (nextLocked) {
      nextLocked.unlocked = true;
      nextLocked.level = 1;
      if (nextLocked.kind === "orbit") this.ensureOrbitBlades(nextLocked);
      return { action: "unlock", weaponName: nextLocked.name, level: nextLocked.level };
    }

    const candidates = this.getUnlockedSlots().sort((a, b) => a.level - b.level || a.lastShotAt - b.lastShotAt);
    const target = candidates[0];
    target.level += 1;
    if (target.kind === "orbit") this.ensureOrbitBlades(target);
    return { action: "upgrade", weaponName: target.name, level: target.level };
  }

  update(time, owner, enemies) {
    const activeEnemies = enemies.getChildren().filter((enemy) => enemy.active);

    for (const slot of this.getUnlockedSlots()) {
      if (slot.kind === "orbit") {
        this.ensureOrbitBlades(slot);
      }
      if (time - slot.lastShotAt < this.getInterval(slot)) continue;
      if (activeEnemies.length === 0) continue;

      this.fireByKind(slot, time, owner, activeEnemies);
      slot.lastShotAt = time;
    }

    this.updateOrbitBlades(owner, time);
    this.cleanupBullets();
  }

  fireByKind(slot, time, owner, activeEnemies) {
    if (slot.kind === "tracking") {
      const nearest = this.findNearest(owner, activeEnemies);
      if (!nearest) return;
      const bullet = this.bullets.create(owner.x, owner.y, "bullet");
      bullet.setTint(slot.id === "drone" ? 0x9ad4ff : 0x5ea9df);
      bullet.setScale(slot.id === "drone" ? 1.2 : 1);
      bullet.setData("damage", this.getDamage(slot));
      bullet.setData("weaponKind", slot.kind);
      bullet.setCircle(5);
      this.scene.physics.moveToObject(bullet, nearest, slot.id === "drone" ? 280 : 360);
      return;
    }

    if (slot.kind === "spread") {
      const nearest = this.findNearest(owner, activeEnemies);
      if (!nearest) return;
      const baseAngle = Phaser.Math.Angle.Between(owner.x, owner.y, nearest.x, nearest.y);
      const pelletCount = 3 + Math.min(4, slot.level);
      for (let i = 0; i < pelletCount; i += 1) {
        const offset = Phaser.Math.DegToRad((i - (pelletCount - 1) / 2) * 8);
        const angle = baseAngle + offset;
        const bullet = this.bullets.create(owner.x, owner.y, "bullet");
        bullet.setTint(0xc7e7ff);
        bullet.setScale(0.8);
        bullet.setData("damage", Math.max(4, this.getDamage(slot) - 2));
        bullet.setData("weaponKind", slot.kind);
        bullet.setData("lifetimeAt", time + 500);
        bullet.setData("expires", true);
        bullet.body.velocity.x = Math.cos(angle) * 440;
        bullet.body.velocity.y = Math.sin(angle) * 440;
      }
      return;
    }

    if (slot.kind === "aoe") {
      const nearest = this.findNearest(owner, activeEnemies);
      if (!nearest) return;
      const bullet = this.bullets.create(owner.x, owner.y, "bullet");
      bullet.setTint(0xf0aa6a);
      bullet.setScale(1.3);
      bullet.setData("damage", this.getDamage(slot));
      bullet.setData("weaponKind", slot.kind);
      bullet.setData("blastRadius", 50 + slot.level * 10);
      bullet.setData("lifetimeAt", time + 1100);
      bullet.setData("expires", true);
      this.scene.physics.moveToObject(bullet, nearest, 220);
      return;
    }

    if (slot.kind === "pierce") {
      const nearest = this.findNearest(owner, activeEnemies);
      if (!nearest) return;
      const bullet = this.bullets.create(owner.x, owner.y, "bullet");
      bullet.setTint(0xd8d8d8);
      bullet.setScale(0.95, 0.65);
      bullet.setData("damage", this.getDamage(slot));
      bullet.setData("weaponKind", slot.kind);
      bullet.setData("pierceLeft", 1 + Math.floor(slot.level / 2));
      bullet.setData("lifetimeAt", time + 1400);
      bullet.setData("expires", true);
      this.scene.physics.moveToObject(bullet, nearest, 540);
    }
  }

  ensureOrbitBlades(slot) {
    const targetCount = Math.min(5, 1 + Math.floor(slot.level / 2));
    while (this.orbitBlades.length < targetCount) {
      const blade = this.bullets.create(0, 0, "bullet");
      blade.setTint(0xe7f16e);
      blade.setScale(1.2);
      blade.body.allowGravity = false;
      blade.setData("weaponKind", "orbit");
      blade.setData("damage", this.getDamage(slot));
      blade.setData("isOrbit", true);
      blade.setData("orbitIndex", this.orbitBlades.length);
      this.orbitBlades.push(blade);
    }

    for (const blade of this.orbitBlades) {
      blade.setData("damage", this.getDamage(slot));
    }
  }

  updateOrbitBlades(owner, time) {
    if (!this.orbitBlades.length) return;
    const radius = 58;
    const spin = time / 350;
    const count = this.orbitBlades.length;

    for (let i = 0; i < count; i += 1) {
      const blade = this.orbitBlades[i];
      if (!blade.active) continue;
      const angle = spin + (Math.PI * 2 * i) / count;
      blade.x = owner.x + Math.cos(angle) * radius;
      blade.y = owner.y + Math.sin(angle) * radius;
      blade.body.velocity.x = 0;
      blade.body.velocity.y = 0;
    }
  }

  cleanupBullets() {
    const now = this.scene.time.now;
    for (const bullet of this.bullets.getChildren()) {
      if (!bullet.active) continue;
      if (bullet.getData("isOrbit")) continue;

      if (bullet.getData("expires") && now >= (bullet.getData("lifetimeAt") || 0)) {
        bullet.destroy();
        continue;
      }

      if (bullet.x < -100 || bullet.y < -100 || bullet.x > 2100 || bullet.y > 2100) {
        bullet.destroy();
      }
    }
  }

  findNearest(owner, enemies) {
    if (!enemies.length) return null;
    let nearest = enemies[0];
    let minDistance = Number.MAX_VALUE;
    for (const enemy of enemies) {
      const d = Phaser.Math.Distance.Between(owner.x, owner.y, enemy.x, enemy.y);
      if (d < minDistance) {
        minDistance = d;
        nearest = enemy;
      }
    }
    return nearest;
  }

  getDamage(slot) {
    return Math.floor(slot.baseDamage * (1 + 0.22 * (slot.level - 1)));
  }

  getInterval(slot) {
    return Math.max(120, Math.floor(slot.interval * Math.pow(0.94, slot.level - 1)));
  }
}
