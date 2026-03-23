import * as Phaser from '../vendor/phaser.esm.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;
    
    // Background
    this.add.rectangle(width/2, height/2, width, height, 0x8B0000);
    
    // Title
    this.add.text(width/2, height/3, '办年货', {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.add.text(width/2, height/3 + 80, 'Card Master', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#FFA500'
    }).setOrigin(0.5);
    
    // Subtitle
    this.add.text(width/2, height/2, '新春限定 - 卡牌堆叠消除', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Start button
    const startBtn = this.add.rectangle(width/2, height * 0.7, 200, 60, 0x228B22)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(width/2, height * 0.7, '开始游戏', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    startBtn.on('pointerover', () => startBtn.setFillStyle(0x2E8B57));
    startBtn.on('pointerout', () => startBtn.setFillStyle(0x228B22));
    startBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { level: 1, stamina: 20 });
    });
    
    // Decorative elements
    this.createDecorations();
  }
  
  createDecorations() {
    // Add some festive decorations
    const decorations = ['🏮', '🧧', '🎊', '🎉'];
    for (let i = 0; i < 8; i++) {
      const x = 100 + i * 85;
      const y = i % 2 === 0 ? 100 : 500;
      this.add.text(x, y, decorations[i % decorations.length], {
        fontSize: '40px'
      }).setOrigin(0.5);
    }
  }
}
