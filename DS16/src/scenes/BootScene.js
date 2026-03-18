import * as Phaser from '../../../vendor/phaser.esm.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.createPixelTextures();
  }

  create() {
    this.createAnimations();
    this.scene.start('MenuScene');
  }

  createPixelTextures() {
    const g = this.add.graphics();

    // Customer sprites (4 types)
    const colors = {
      civilian: 0x8B7355,   // Brown coat
      middle: 0x4A5568,     // Gray suit  
      elite: 0x2D3748,      // Dark suit
      vip: 0xD69E2E         // Gold accent
    };

    Object.entries(colors).forEach(([type, color]) => {
      g.fillStyle(color, 1);
      g.fillRect(0, 0, 16, 24);
      // Mask
      g.fillStyle(0x1A202C, 1);
      g.fillRect(4, 4, 8, 6);
      // Pressure indicator bar on head
      g.fillStyle(0x48BB78, 1);
      g.fillRect(2, 0, 12, 2);
      g.generateTexture(`customer-${type}`, 16, 24);
      g.clear();
    });

    // Room tiles
    const roomTypes = {
      'room-basic': 0x4A5568,
      'room-soundproof': 0x2D5A4A,
      'room-vacuum': 0x2B6CB0,
      'room-vip': 0x744210
    };

    Object.entries(roomTypes).forEach(([type, color]) => {
      g.fillStyle(color, 1);
      g.fillRect(0, 0, 64, 64);
      // Border
      g.lineStyle(2, 0x1A202C, 1);
      g.strokeRect(0, 0, 64, 64);
      // Door
      g.fillStyle(0x1A202C, 1);
      g.fillRect(28, 56, 8, 8);
      g.generateTexture(type, 64, 64);
      g.clear();
    });

    // UI Elements
    g.fillStyle(0x1A202C, 0.95);
    g.fillRect(0, 0, 200, 40);
    g.lineStyle(2, 0x48BB78, 1);
    g.strokeRect(0, 0, 200, 40);
    g.generateTexture('ui-panel', 200, 40);
    g.clear();

    // Pressure bar background
    g.fillStyle(0x2D3748, 1);
    g.fillRect(0, 0, 100, 12);
    g.generateTexture('bar-bg', 100, 12);
    g.clear();

    // Pressure bar fill (green-yellow-red gradient via tint)
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(0, 0, 100, 12);
    g.generateTexture('bar-fill', 100, 12);
    g.clear();

    // Sound wave icon
    g.fillStyle(0x48BB78, 1);
    for (let i = 0; i < 3; i++) {
      g.fillRect(i * 6, 4 - i, 2, 8 + i * 2);
    }
    g.generateTexture('icon-sound', 18, 16);
    g.clear();

    // Heat icon (flame)
    g.fillStyle(0xE53E3E, 1);
    g.fillTriangle(8, 0, 0, 14, 16, 14);
    g.generateTexture('icon-heat', 16, 16);
    g.clear();

    // Money icon
    g.fillStyle(0xD69E2E, 1);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0x0a0a0f, 1);
    g.fillRect(6, 4, 4, 8);
    g.generateTexture('icon-money', 16, 16);
    g.clear();

    g.destroy();
  }

  createAnimations() {
    // Customer breathing animation
    this.anims.create({
      key: 'breathing',
      frames: [{ key: 'customer-civilian' }, { key: 'customer-civilian' }],
      frameRate: 2,
      repeat: -1
    });

    // Pressure critical flash
    this.anims.create({
      key: 'pressure-critical',
      frames: [
        { key: 'bar-fill', tint: 0xE53E3E },
        { key: 'bar-fill', tint: 0xFFFFFF }
      ],
      frameRate: 4,
      repeat: -1
    });
  }
}
