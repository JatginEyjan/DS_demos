import * as Phaser from '../../../vendor/phaser.esm.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    // Title with glitch effect
    this.createGlitchText(width / 2, height / 3, '沉默公约', 64);
    this.createGlitchText(width / 2, height / 3 + 70, 'THE SILENCE CONVENTION', 24);

    // Subtitle
    this.add.text(width / 2, height / 2 + 40, 
      '2088年，放屁是死罪。你是地下排气会所的经营者。', {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#718096'
    }).setOrigin(0.5);

    // Menu buttons
    this.createPixelButton(width / 2, height * 0.7, '开始经营', () => {
      this.scene.start('DayScene', { day: 1, money: 500, reputation: 0, heat: 0 });
    });

    this.createPixelButton(width / 2, height * 0.7 + 60, '继续', () => {
      // Load save
      const save = localStorage.getItem('ds16-save');
      if (save) {
        this.scene.start('DayScene', JSON.parse(save));
      }
    });

    // Version
    this.add.text(width - 20, height - 20, 'v0.1', {
      fontFamily: 'VT323',
      fontSize: '16px',
      color: '#4A5568'
    }).setOrigin(1, 1);

    // Ambient particles
    this.createAmbientParticles();
  }

  createGlitchText(x, y, text, size) {
    const main = this.add.text(x, y, text, {
      fontFamily: 'VT323',
      fontSize: `${size}px`,
      color: '#48BB78'
    }).setOrigin(0.5);

    // Glitch shadow layers
    const red = this.add.text(x + 2, y, text, {
      fontFamily: 'VT323',
      fontSize: `${size}px`,
      color: '#E53E3E',
      alpha: 0.3
    }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);

    const blue = this.add.text(x - 2, y, text, {
      fontFamily: 'VT323',
      fontSize: `${size}px`,
      color: '#4299E1',
      alpha: 0.3
    }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);

    // Glitch animation
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (Math.random() > 0.9) {
          red.x = x + Phaser.Math.Between(-3, 3);
          blue.x = x + Phaser.Math.Between(-3, 3);
          main.setAlpha(0.8);
        } else {
          red.x = x + 2;
          blue.x = x - 2;
          main.setAlpha(1);
        }
      }
    });

    return main;
  }

  createPixelButton(x, y, text, callback) {
    const width = 200;
    const height = 50;

    const bg = this.add.rectangle(x, y, width, height, 0x1A202C)
      .setStrokeStyle(2, 0x48BB78);

    const label = this.add.text(x, y, text, {
      fontFamily: 'VT323',
      fontSize: '28px',
      color: '#48BB78'
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x2D3748);
      label.setColor('#68D391');
      this.tweens.add({
        targets: [bg, label],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x1A202C);
      label.setColor('#48BB78');
      this.tweens.add({
        targets: [bg, label],
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });

    bg.on('pointerdown', () => {
      bg.setFillStyle(0x22543D);
      callback();
    });

    return { bg, label };
  }

  createAmbientParticles() {
    const particles = this.add.particles(0, 0, 'icon-sound', {
      x: { min: 0, max: 1280 },
      y: 720,
      lifespan: 4000,
      speedY: { min: -20, max: -50 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.3, end: 0 },
      frequency: 200,
      quantity: 1
    });
  }
}
