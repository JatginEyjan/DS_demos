import * as Phaser from '../../vendor/phaser.esm.js';

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

    // Customer sprites
    const colors = {
      civilian: 0x8B7355,
      middle: 0x4A5568,
      elite: 0x2D3748,
      vip: 0xD69E2E
    };

    Object.entries(colors).forEach(([type, color]) => {
      g.fillStyle(color, 1);
      g.fillRect(0, 0, 16, 24);
      g.fillStyle(0x1A202C, 1);
      g.fillRect(4, 4, 8, 6);
      g.fillStyle(0x48BB78, 1);
      g.fillRect(2, 0, 12, 2);
      g.generateTexture(`customer-${type}`, 16, 24);
      g.clear();
    });

    // Room tiles - all types
    const roomTypes = {
      'room-basic': { color: 0x4A5568, accent: 0x2D3748 },
      'room-soundproof': { color: 0x2D5A4A, accent: 0x1A4731 },
      'room-vacuum': { color: 0x2B6CB0, accent: 0x1A365D },
      'room-vip': { color: 0x744210, accent: 0xD69E2E }
    };

    Object.entries(roomTypes).forEach(([type, { color, accent }]) => {
      g.fillStyle(color, 1);
      g.fillRect(0, 0, 64, 64);
      
      // Border
      g.lineStyle(2, 0x1A202C, 1);
      g.strokeRect(0, 0, 64, 64);
      
      // Room specific details
      if (type === 'room-soundproof') {
        // Sound waves pattern
        g.lineStyle(2, accent, 0.5);
        for (let i = 10; i < 60; i += 15) {
          g.strokeCircle(32, 32, i / 2);
        }
      } else if (type === 'room-vacuum') {
        // Vacuum tube
        g.fillStyle(accent, 0.5);
        g.fillCircle(32, 32, 20);
        g.fillStyle(0x0a0a0f, 1);
        g.fillCircle(32, 32, 12);
      } else if (type === 'room-vip') {
        // Gold trim
        g.lineStyle(3, accent, 1);
        g.strokeRect(4, 4, 56, 56);
        // Carpet pattern
        g.fillStyle(accent, 0.3);
        g.fillRect(24, 0, 16, 64);
      }
      
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

    // Pressure bar fill
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(0, 0, 100, 12);
    g.generateTexture('bar-fill', 100, 12);
    g.clear();

    // Icons
    g.fillStyle(0x48BB78, 1);
    for (let i = 0; i < 3; i++) {
      g.fillRect(i * 6, 4 - i, 2, 8 + i * 2);
    }
    g.generateTexture('icon-sound', 18, 16);
    g.clear();

    g.fillStyle(0xE53E3E, 1);
    g.fillTriangle(8, 0, 0, 14, 16, 14);
    g.generateTexture('icon-heat', 16, 16);
    g.clear();

    g.fillStyle(0xD69E2E, 1);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0x0a0a0f, 1);
    g.fillRect(6, 4, 4, 8);
    g.generateTexture('icon-money', 16, 16);
    g.clear();

    g.destroy();
  }

  createAnimations() {
    this.anims.create({
      key: 'breathing',
      frames: [{ key: 'customer-civilian' }, { key: 'customer-civilian' }],
      frameRate: 2,
      repeat: -1
    });

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
