import * as Phaser from "../../vendor/phaser.esm.js";

const ENEMY_PROFILES = {
  grunt: { speed: 78, hp: 30, rewardExp: [4, 7], tint: 0xbd4e3e, behavior: "chase" },
  scout: { speed: 120, hp: 18, rewardExp: [5, 8], tint: 0xf08a5d, behavior: "zigzag" },
  tank: { speed: 52, hp: 78, rewardExp: [10, 14], tint: 0x7a2f2f, behavior: "chase" },
  sniper: { speed: 88, hp: 36, rewardExp: [7, 11], tint: 0x8c5fd6, behavior: "orbit" },
};

const BOSS_PROFILES = {
  boss5: {
    type: "boss5",
    speed: 95,
    hp: 820,
    rewardExp: [120, 150],
    tint: 0xff8f62,
    behavior: "chase",
    isBoss: true,
    bossSkill: "charge",
    bossName: "裂炉督军",
  },
  boss10: {
    type: "boss10",
    speed: 82,
    hp: 1180,
    rewardExp: [180, 220],
    tint: 0x8dd3ff,
    behavior: "orbit",
    isBoss: true,
    bossSkill: "pulse",
    bossName: "共振主轴",
  },
  boss15: {
    type: "boss15",
    speed: 88,
    hp: 1550,
    rewardExp: [240, 290],
    tint: 0xd1a0ff,
    behavior: "zigzag",
    isBoss: true,
    bossSkill: "barrage",
    bossName: "钢雨指挥官",
  },
};

export class Enemy {
  constructor(scene, x, y, profile = {}) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, "enemy");
    this.sprite.setData("entity", this);

    this.type = profile.type || "grunt";
    this.speed = profile.speed ?? 70;
    this.hp = profile.hp ?? 30;
    this.baseRewardExp = profile.rewardExp ?? [5, 8];
    this.behavior = profile.behavior || "chase";
    this.spawnAt = scene.time.now;
    this.phaseOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);

    this.isBoss = !!profile.isBoss;
    this.bossSkill = profile.bossSkill || null;
    this.bossName = profile.bossName || "";
    this.lastSkillAt = -99999;
    this.skillState = "idle";

    if (profile.tint != null) this.sprite.setTint(profile.tint);

    this.isElite = !!profile.isElite;
    if (this.isElite) {
      this.hp = Math.floor(this.hp * 1.9);
      this.speed = Math.floor(this.speed * 1.12);
      this.sprite.setScale(1.2);
      this.sprite.setTintFill(0xf7d774);
    }

    if (this.isBoss) {
      this.sprite.setScale(1.9);
      this.sprite.setData("isBoss", true);
      this.sprite.setData("bossSkill", this.bossSkill);
    }
  }

  static pickTypeByStage(stageSeconds) {
    if (stageSeconds < 180) return Phaser.Utils.Array.GetRandom(["grunt", "grunt", "scout"]);
    if (stageSeconds < 420) return Phaser.Utils.Array.GetRandom(["grunt", "scout", "tank"]);
    if (stageSeconds < 780) return Phaser.Utils.Array.GetRandom(["scout", "tank", "sniper"]);
    return Phaser.Utils.Array.GetRandom(["tank", "sniper", "scout", "grunt"]);
  }

  static createProfile(stageSeconds) {
    const type = Enemy.pickTypeByStage(stageSeconds);
    const base = ENEMY_PROFILES[type];
    const eliteChance = stageSeconds < 300 ? 0.02 : stageSeconds < 900 ? 0.06 : 0.1;
    const isElite = Math.random() < eliteChance;
    return { type, ...base, isElite };
  }

  static createBossProfile(stageSeconds) {
    if (stageSeconds < 600) return { ...BOSS_PROFILES.boss5 };
    if (stageSeconds < 900) return { ...BOSS_PROFILES.boss10 };
    return { ...BOSS_PROFILES.boss15 };
  }

  update(targetX, targetY) {
    const now = this.scene.time.now;
    const lived = (now - this.spawnAt) / 1000;

    if (this.behavior === "zigzag") {
      const wobble = Math.sin(lived * 4 + this.phaseOffset) * 30;
      this.scene.physics.moveTo(this.sprite, targetX + wobble, targetY - wobble * 0.35, this.speed);
      return;
    }

    if (this.behavior === "orbit") {
      const angle = lived * 2 + this.phaseOffset;
      const ox = Math.cos(angle) * 65;
      const oy = Math.sin(angle) * 65;
      this.scene.physics.moveTo(this.sprite, targetX + ox, targetY + oy, this.speed);
      return;
    }

    this.scene.physics.moveTo(this.sprite, targetX, targetY, this.speed);
  }

  getExpReward() {
    const [min, max] = this.baseRewardExp;
    const base = Phaser.Math.Between(min, max);
    if (this.isBoss) return Math.floor(base * 1.5);
    return this.isElite ? Math.floor(base * 2.2) : base;
  }

  hit(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }

  destroy() {
    this.sprite.destroy();
  }
}
