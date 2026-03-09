import * as Phaser from "../../vendor/phaser.esm.js";
import { Player } from "../entities/Player.js";
import { Enemy } from "../entities/Enemy.js";
import { Weapon } from "../entities/Weapon.js";
import { loadProgress, saveProgress } from "../data/progress.js";

const RARITY_TABLE = [
  { id: "common", name: "普通", color: "#ffffff", roll: 60, hp: 1, speed: 1, dash: 1, pickup: 1, exp: 1 },
  { id: "rare", name: "稀有", color: "#69c8ff", roll: 26, hp: 1.4, speed: 1.4, dash: 1.4, pickup: 1.4, exp: 1.4 },
  { id: "epic", name: "史诗", color: "#ca84ff", roll: 11, hp: 1.9, speed: 1.9, dash: 1.9, pickup: 1.9, exp: 1.9 },
  { id: "legendary", name: "传说", color: "#ffcf6b", roll: 3, hp: 2.8, speed: 2.8, dash: 2.8, pickup: 2.8, exp: 2.8 },
];

const UPGRADE_POOL = [
  {
    id: "hp",
    label: "生命强化",
    desc: "+30 最大生命，+30 当前生命",
    apply: (scene, rarity) => {
      const v = Math.floor(30 * rarity.hp);
      scene.player.maxHp += v;
      scene.player.hp = Math.min(scene.player.maxHp, scene.player.hp + v);
      return `+${v} 生命`;
    },
  },
  {
    id: "speed",
    label: "蒸汽增压",
    desc: "+12% 移速",
    apply: (scene, rarity) => {
      const mul = 1 + 0.12 * rarity.speed;
      scene.player.speed = Math.floor(scene.player.speed * mul);
      return `移速 x${mul.toFixed(2)}`;
    },
  },
  {
    id: "dash",
    label: "冲刺冷却",
    desc: "冲刺CD -15%",
    apply: (scene, rarity) => {
      const pct = 0.15 * rarity.dash;
      scene.player.dashCooldownMs = Math.max(800, Math.floor(scene.player.dashCooldownMs * (1 - pct)));
      return `冲刺CD -${Math.round(pct * 100)}%`;
    },
  },
  {
    id: "pickup",
    label: "齿轮磁场",
    desc: "+25 拾取范围",
    apply: (scene, rarity) => {
      const v = Math.floor(25 * rarity.pickup);
      scene.player.pickupRange += v;
      return `+${v} 拾取范围`;
    },
  },
  {
    id: "exp",
    label: "精密拆解",
    desc: "+20% 经验获取",
    apply: (scene, rarity) => {
      const mul = 1 + 0.2 * rarity.exp;
      scene.player.expGainMultiplier = Number((scene.player.expGainMultiplier * mul).toFixed(2));
      return `经验倍率 x${mul.toFixed(2)}`;
    },
  },
  {
    id: "weapon",
    label: "军械改装",
    desc: "解锁或强化武器槽位",
    apply: (scene, rarity) => {
      const out = scene.weapon.applyUpgrade({ rarity: rarity.id });
      scene.lastUpgradeResult = out;
      if (out.action === "evolve") return `${out.weaponName} 进化完成`;
      return `${out.weaponName} Lv${out.level}`;
    },
  },
];

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function rollRarity() {
  let roll = Phaser.Math.Between(1, 100);
  for (const r of RARITY_TABLE) {
    if (roll <= r.roll) return r;
    roll -= r.roll;
  }
  return RARITY_TABLE[0];
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create(data = {}) {
    this.physics.world.setBounds(0, 0, 2000, 2000);

    this.player = new Player(this, 1000, 1000);

    this.progress = data.workshop || loadProgress();
    this.applyWorkshopBonuses();

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

    this.mobile = {
      enabled: false,
      movePointerId: null,
      moveVector: new Phaser.Math.Vector2(0, 0),
      dashQueued: false,
      joyCenter: new Phaser.Math.Vector2(110, this.scale.height - 110),
      joyRadius: 62,
      joyKnobRadius: 26,
      dashCenter: new Phaser.Math.Vector2(this.scale.width - 110, this.scale.height - 110),
      dashRadius: 42,
    };

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.expOrbs = this.physics.add.group();
    this.bossProjectiles = this.physics.add.group();
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
    this.bossMilestones = new Set([300, 600, 900]);
    this.bossSpawned = new Set();

    this.performance = {
      lastFrameAt: this.time.now,
      avgFps: 60,
      degradeLevel: 0,
      lowFpsStreakMs: 0,
      recoverStreakMs: 0,
    };
    this.maxEnemyCount = 120;

    this.countdownEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isGameOver || this.awaitingUpgrade) return;
        this.surviveSeconds += 1;
        this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);
        this.trySpawnBossMilestone(this.surviveSeconds);
        if (this.remainingSeconds <= 0) this.gameWin();
      },
    });

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, undefined, this);
    this.physics.add.overlap(this.player.sprite, this.enemies, this.onPlayerHit, undefined, this);
    this.physics.add.overlap(this.player.sprite, this.expOrbs, this.onPickupExpOrb, undefined, this);
    this.physics.add.overlap(this.player.sprite, this.bossProjectiles, this.onBossProjectileHit, undefined, this);

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

    this.lastUpgradeText = "";
    this.isGameOver = false;

    this.setupMobileControls();
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

    const moveKeys = this.buildMoveInputKeys();
    this.player.update(moveKeys, time);

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) || this.mobile.dashQueued) {
      this.player.tryDash(time);
      this.mobile.dashQueued = false;
    }

    this.weapon.update(time, this.player.sprite, this.enemies);

    for (const enemySprite of this.enemies.getChildren()) {
      const entity = enemySprite.getData("entity");
      if (entity) entity.update(this.player.sprite.x, this.player.sprite.y);
    }

    this.collectNearbyOrbs();
    this.updateBossSkills(time);
    this.updatePerformance(time);
    this.updateHud(time);
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
      `武器槽: ${this.weapon.getSummary()}`,
      `Boss: ${this.enemies.getChildren().some((s) => s.getData("isBoss")) ? "在场" : "无"}`,
      `黄铜齿轮: ${this.progress.brassGears}`,
      `FPS: ${this.performance.avgFps.toFixed(1)} · 负载档位: L${this.performance.degradeLevel}`,
      `敌人数上限: ${this.maxEnemyCount}`,
      this.lastUpgradeText ? `最近升级: ${this.lastUpgradeText}` : "",
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
    let base = 1;
    if (this.surviveSeconds < 180) base = 1;
    else if (this.surviveSeconds < 420) base = 2;
    else if (this.surviveSeconds < 780) base = 3;
    else base = 4;

    const adjusted = base - this.performance.degradeLevel;
    return Math.max(1, adjusted);
  }

  spawnEnemyWave() {
    if (this.isGameOver || this.awaitingUpgrade) return;
    if (this.enemies.countActive(true) >= this.maxEnemyCount) return;

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

    const baseDelay = this.surviveSeconds < 180 ? 1100 : this.surviveSeconds < 420 ? 900 : this.surviveSeconds < 780 ? 760 : 640;
    const delayOffset = this.performance.degradeLevel === 0 ? 0 : this.performance.degradeLevel === 1 ? 120 : 220;
    this.spawnEvent.delay = baseDelay + delayOffset;
  }

  onBulletHit(bullet, enemySprite) {
    const enemy = enemySprite.getData("entity");
    if (!enemy) return;

    const kind = bullet.getData("weaponKind") || "tracking";
    const now = this.time.now;

    if (kind === "orbit") {
      const key = "orbitHitAt";
      const last = enemySprite.getData(key) || 0;
      if (now - last < this.weapon.orbitDamageCooldownMs) return;
      enemySprite.setData(key, now);
    }

    const damage = bullet.getData("damage") ?? 10;

    if (enemy.hit(damage)) {
      const dropValue = enemy.getExpReward();
      this.spawnExpOrb(enemy.sprite.x, enemy.sprite.y, dropValue);
      enemy.destroy();
    }

    if (kind === "aoe") {
      this.applyAoeDamage(bullet.x, bullet.y, bullet.getData("blastRadius") || 60, Math.floor(damage * 0.65));
      bullet.destroy();
      return;
    }

    if (kind === "pierce") {
      const left = (bullet.getData("pierceLeft") || 0) - 1;
      bullet.setData("pierceLeft", left);
      if (left < 0) bullet.destroy();
      return;
    }

    if (kind !== "orbit") bullet.destroy();
  }

  applyAoeDamage(cx, cy, radius, damage) {
    for (const enemySprite of this.enemies.getChildren()) {
      const enemy = enemySprite.getData("entity");
      if (!enemy) continue;
      const dist = Phaser.Math.Distance.Between(cx, cy, enemySprite.x, enemySprite.y);
      if (dist > radius) continue;
      if (enemy.hit(damage)) {
        const dropValue = enemy.getExpReward();
        this.spawnExpOrb(enemy.sprite.x, enemy.sprite.y, dropValue);
        enemy.destroy();
      }
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
    this.currentUpgradeChoices = shuffled.slice(0, 3).map((item) => ({ item, rarity: rollRarity() }));

    const lines = [
      `升级！Lv.${this.playerLevel}`,
      "按 1/2/3 选择一项强化：",
      "",
      ...this.currentUpgradeChoices.map(({ item, rarity }, idx) => {
        const rarityText = `[${rarity.name}]`;
        const desc = item.id === "weapon" ? `${item.desc}（${this.weapon.getUpgradePreview()}）` : item.desc;
        return `${idx + 1}. ${rarityText} ${item.label} — ${desc}`;
      }),
      "",
      "稀有度概率：普通60% / 稀有26% / 史诗11% / 传说3%",
    ];

    this.upgradeBackdrop.setVisible(true);
    this.upgradePanel.setText(lines.join("\n")).setVisible(true);
  }

  pickUpgradeByIndex(index) {
    const choice = this.currentUpgradeChoices[index];
    if (!choice) return;

    const { item, rarity } = choice;
    const result = item.apply(this, rarity);

    this.lastUpgradeText = `${rarity.name} ${item.label} (${result})`;
    this.currentUpgradeChoices = [];
    this.awaitingUpgrade = false;
    this.spawnEvent.paused = false;
    this.upgradeBackdrop.setVisible(false);
    this.upgradePanel.setVisible(false);
  }

  onPlayerHit() {
    if (this.isGameOver || this.awaitingUpgrade) return;
    this.applyPlayerDamage(10, "contact");
  }

  onBossProjectileHit(_playerSprite, projectile) {
    if (this.isGameOver || this.awaitingUpgrade) return;
    projectile.destroy();
    this.applyPlayerDamage(16, "boss-projectile");
  }

  applyPlayerDamage(amount, source = "unknown") {
    if (this.player.isInvincible || this.isGameOver || this.awaitingUpgrade) return;

    this.player.hp -= amount;
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

  trySpawnBossMilestone(elapsedSeconds) {
    if (!this.bossMilestones.has(elapsedSeconds) || this.bossSpawned.has(elapsedSeconds)) return;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const x = Phaser.Math.Clamp(this.player.sprite.x + Math.cos(angle) * 460, 40, 1960);
    const y = Phaser.Math.Clamp(this.player.sprite.y + Math.sin(angle) * 460, 40, 1960);

    const profile = Enemy.createBossProfile(elapsedSeconds);
    const boss = new Enemy(this, x, y, profile);
    this.enemies.add(boss.sprite);
    this.bossSpawned.add(elapsedSeconds);

    this.showBossWarning(`Boss来袭：${profile.bossName}（技能：${profile.bossSkill}）`);
  }

  showBossWarning(message) {
    const t = this.add
      .text(this.cameras.main.midPoint.x, 90, message, {
        fontSize: "28px",
        color: "#ffd27a",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(1300)
      .setScrollFactor(0);

    this.tweens.add({
      targets: t,
      alpha: 0,
      duration: 1300,
      delay: 1400,
      onComplete: () => t.destroy(),
    });
  }

  updateBossSkills(time) {
    const player = this.player.sprite;
    for (const sprite of this.enemies.getChildren()) {
      const boss = sprite.getData("entity");
      if (!boss || !boss.isBoss) continue;

      if (boss.bossSkill === "charge") {
        if (time - boss.lastSkillAt > 4800 && boss.skillState === "idle") {
          boss.skillState = "prep";
          boss.lastSkillAt = time;
          sprite.setTintFill(0xffd08a);
          this.time.delayedCall(650, () => {
            if (!sprite.active || this.isGameOver) return;
            const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, player.x, player.y);
            sprite.body.velocity.x = Math.cos(angle) * 420;
            sprite.body.velocity.y = Math.sin(angle) * 420;
            boss.skillState = "dash";
            this.time.delayedCall(550, () => {
              if (!sprite.active) return;
              boss.skillState = "idle";
              sprite.clearTint();
            });
          });
          this.showBossWarning("裂炉督军蓄力冲锋，冲刺可规避伤害");
        }
      }

      if (boss.bossSkill === "pulse" && time - boss.lastSkillAt > 5200) {
        boss.lastSkillAt = time;
        const pulse = this.add.circle(sprite.x, sprite.y, 10, 0x8dd3ff, 0.15).setDepth(20);
        this.tweens.add({
          targets: pulse,
          radius: 190,
          alpha: 0,
          duration: 720,
          onComplete: () => pulse.destroy(),
        });
        this.time.delayedCall(680, () => {
          if (!sprite.active || this.isGameOver) return;
          const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, player.x, player.y);
          if (dist <= 185) this.applyPlayerDamage(22, "boss-pulse");
        });
        this.showBossWarning("共振主轴释放脉冲，留意圈外或冲刺无敌");
      }

      if (boss.bossSkill === "barrage" && time - boss.lastSkillAt > 4300) {
        boss.lastSkillAt = time;
        const base = Phaser.Math.Angle.Between(sprite.x, sprite.y, player.x, player.y);
        for (const offset of [-0.18, 0, 0.18]) {
          const p = this.bossProjectiles.create(sprite.x, sprite.y, "bullet");
          p.setTint(0xff9de7);
          p.setScale(1.2);
          p.setData("expiresAt", time + 1700);
          const angle = base + offset;
          p.body.velocity.x = Math.cos(angle) * 290;
          p.body.velocity.y = Math.sin(angle) * 290;
        }
        this.showBossWarning("钢雨指挥官发射扇形弹幕，注意走位/冲刺");
      }
    }

    for (const p of this.bossProjectiles.getChildren()) {
      const exp = p.getData("expiresAt") || 0;
      if (time >= exp || p.x < -50 || p.y < -50 || p.x > 2050 || p.y > 2050) p.destroy();
    }
  }

  updatePerformance(time) {
    const dt = Math.max(1, time - this.performance.lastFrameAt);
    this.performance.lastFrameAt = time;
    const fps = 1000 / dt;
    this.performance.avgFps = this.performance.avgFps * 0.92 + fps * 0.08;

    const avg = this.performance.avgFps;
    if (avg < 42) {
      this.performance.lowFpsStreakMs += dt;
      this.performance.recoverStreakMs = 0;
    } else if (avg > 55) {
      this.performance.recoverStreakMs += dt;
      this.performance.lowFpsStreakMs = 0;
    } else {
      this.performance.lowFpsStreakMs = Math.max(0, this.performance.lowFpsStreakMs - dt * 0.5);
      this.performance.recoverStreakMs = Math.max(0, this.performance.recoverStreakMs - dt * 0.5);
    }

    if (this.performance.lowFpsStreakMs > 2500 && this.performance.degradeLevel < 2) {
      this.performance.degradeLevel += 1;
      this.performance.lowFpsStreakMs = 0;
      this.showBossWarning(`性能降级保护触发：L${this.performance.degradeLevel}`);
    }

    if (this.performance.recoverStreakMs > 5000 && this.performance.degradeLevel > 0) {
      this.performance.degradeLevel -= 1;
      this.performance.recoverStreakMs = 0;
      this.showBossWarning(`性能恢复：切回 L${this.performance.degradeLevel}`);
    }

    this.maxEnemyCount = this.performance.degradeLevel === 0 ? 120 : this.performance.degradeLevel === 1 ? 90 : 70;
  }

  applyWorkshopBonuses() {
    const upgrades = this.progress?.upgrades || {};
    const hpLv = Number(upgrades.maxHp || 0);
    const speedLv = Number(upgrades.speed || 0);
    const expLv = Number(upgrades.expGain || 0);

    this.player.maxHp += hpLv * 10;
    this.player.hp = this.player.maxHp;
    this.player.speed = Math.floor(this.player.speed * (1 + speedLv * 0.04));
    this.player.expGainMultiplier = Number((this.player.expGainMultiplier * (1 + expLv * 0.06)).toFixed(2));
  }

  grantBrassGears(result) {
    const base = Math.max(8, Math.floor(this.surviveSeconds / 12) + this.playerLevel * 2);
    const bonus = result === "win" ? 60 : 0;
    const noDeathBonus = !this.hasDiedThisRun ? 20 : 0;
    const gained = base + bonus + noDeathBonus;

    this.progress.brassGears = Number(this.progress.brassGears || 0) + gained;
    saveProgress(this.progress);
    return gained;
  }

  setupMobileControls() {
    const isTouch = this.sys.game.device.input.touch;
    if (!isTouch) return;

    this.mobile.enabled = true;
    this.input.addPointer(2);

    this.mobile.joyBase = this.add
      .circle(this.mobile.joyCenter.x, this.mobile.joyCenter.y, this.mobile.joyRadius, 0xffffff, 0.12)
      .setScrollFactor(0)
      .setDepth(1400);
    this.mobile.joyKnob = this.add
      .circle(this.mobile.joyCenter.x, this.mobile.joyCenter.y, this.mobile.joyKnobRadius, 0xffffff, 0.35)
      .setScrollFactor(0)
      .setDepth(1401);

    this.mobile.dashButton = this.add
      .circle(this.mobile.dashCenter.x, this.mobile.dashCenter.y, this.mobile.dashRadius, 0x69c8ff, 0.28)
      .setScrollFactor(0)
      .setDepth(1400);
    this.mobile.dashLabel = this.add
      .text(this.mobile.dashCenter.x, this.mobile.dashCenter.y, "冲", { fontSize: "26px", color: "#ffffff" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1401);

    const handleDown = (pointer) => {
      const joyDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.mobile.joyCenter.x, this.mobile.joyCenter.y);
      if (joyDist <= this.mobile.joyRadius + 28 && this.mobile.movePointerId == null) {
        this.mobile.movePointerId = pointer.id;
        this.updateMobileJoystick(pointer);
        return;
      }

      const dashDist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.mobile.dashCenter.x, this.mobile.dashCenter.y);
      if (dashDist <= this.mobile.dashRadius + 16) {
        this.mobile.dashQueued = true;
        this.mobile.dashButton.setFillStyle(0x9bd8ff, 0.5);
      }
    };

    const handleMove = (pointer) => {
      if (pointer.id !== this.mobile.movePointerId) return;
      this.updateMobileJoystick(pointer);
    };

    const handleUp = (pointer) => {
      if (pointer.id === this.mobile.movePointerId) this.resetMobileJoystick();
      this.mobile.dashButton.setFillStyle(0x69c8ff, 0.28);
    };

    this.input.on("pointerdown", handleDown);
    this.input.on("pointermove", handleMove);
    this.input.on("pointerup", handleUp);
    this.input.on("pointerupoutside", handleUp);
  }

  updateMobileJoystick(pointer) {
    const dx = pointer.x - this.mobile.joyCenter.x;
    const dy = pointer.y - this.mobile.joyCenter.y;
    const vec = new Phaser.Math.Vector2(dx, dy);
    const len = Math.min(this.mobile.joyRadius, vec.length());
    const dir = len > 0 ? vec.normalize() : new Phaser.Math.Vector2(0, 0);

    this.mobile.moveVector.set(dir.x * (len / this.mobile.joyRadius), dir.y * (len / this.mobile.joyRadius));
    this.mobile.joyKnob.setPosition(
      this.mobile.joyCenter.x + dir.x * len,
      this.mobile.joyCenter.y + dir.y * len
    );
  }

  resetMobileJoystick() {
    this.mobile.movePointerId = null;
    this.mobile.moveVector.set(0, 0);
    this.mobile.joyKnob.setPosition(this.mobile.joyCenter.x, this.mobile.joyCenter.y);
  }

  buildMoveInputKeys() {
    if (!this.mobile.enabled) return this.keys;

    const threshold = 0.2;
    const vx = this.mobile.moveVector.x;
    const vy = this.mobile.moveVector.y;

    return {
      left: { isDown: this.keys.left.isDown || vx < -threshold },
      right: { isDown: this.keys.right.isDown || vx > threshold },
      up: { isDown: this.keys.up.isDown || vy < -threshold },
      down: { isDown: this.keys.down.isDown || vy > threshold },
    };
  }

  stopCombatLoops() {
    this.spawnEvent.remove(false);
    this.countdownEvent.remove(false);
    this.player.sprite.setVelocity(0, 0);
    for (const enemySprite of this.enemies.getChildren()) enemySprite.setVelocity(0, 0);
    for (const p of this.bossProjectiles.getChildren()) p.destroy();
  }

  gameWin() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.stopCombatLoops();

    const noDeath = !this.hasDiedThisRun;
    const gained = this.grantBrassGears("win");
    this.registry.set("ds15.lastRun", {
      result: "win",
      noDeath,
      surviveSeconds: this.surviveSeconds,
      brassGearsGained: gained,
      finishedAt: Date.now(),
    });

    this.add
      .text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, `生存成功！\n无死亡标记: ${noDeath ? "达成" : "未达成"}\n获得黄铜齿轮: +${gained}\n按 R 重开`, {
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

    const gained = this.grantBrassGears("lose");
    this.registry.set("ds15.lastRun", {
      result: "lose",
      noDeath: false,
      surviveSeconds: this.surviveSeconds,
      brassGearsGained: gained,
      finishedAt: Date.now(),
    });

    this.add
      .text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, `蒸汽熄火（失败）\n获得黄铜齿轮: +${gained}\n按 R 重开`, {
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
