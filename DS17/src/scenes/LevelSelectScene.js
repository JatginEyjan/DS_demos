export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    const { width, height } = this.scale;
    
    this.add.rectangle(width/2, height/2, width, height, 0x8B0000);
    
    this.add.text(width/2, 60, '选择关卡', {
      fontSize: '40px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const unlockedLevels = this.getUnlockedLevels();
    const currentLevel = this.getCurrentLevel();
    
    for (let i = 1; i <= 12; i++) {
      const col = (i - 1) % 4;
      const row = Math.floor((i - 1) / 4);
      const x = 150 + col * 170;
      const y = 150 + row * 120;
      
      const isUnlocked = i <= unlockedLevels;
      const isCurrent = i === currentLevel;
      
      this.createLevelButton(x, y, i, isUnlocked, isCurrent);
    }
    
    const backBtn = this.add.rectangle(100, 550, 120, 40, 0x4169E1)
      .setInteractive({ useHandCursor: true });
    this.add.text(100, 550, '返回', { fontSize: '18px', color: '#FFF' }).setOrigin(0.5);
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  createLevelButton(x, y, level, unlocked, current) {
    const bgColor = unlocked ? (current ? 0xFFD700 : 0x228B22) : 0x666666;
    const btn = this.add.rectangle(x, y, 140, 100, bgColor)
      .setInteractive(unlocked ? { useHandCursor: true } : false);
    
    this.add.text(x, y - 20, `第${level}关`, {
      fontSize: '20px', color: unlocked ? '#FFF' : '#999', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    if (unlocked && level < this.getCurrentLevel()) {
      const stars = '⭐⭐⭐';
      this.add.text(x, y + 20, stars, { fontSize: '16px' }).setOrigin(0.5);
    }
    
    if (!unlocked) {
      this.add.text(x, y + 10, '🔒', { fontSize: '24px' }).setOrigin(0.5);
    }
    
    if (unlocked) {
      btn.on('pointerover', () => btn.setFillStyle(0x2E8B57));
      btn.on('pointerout', () => btn.setFillStyle(bgColor));
      btn.on('pointerdown', () => {
        this.scene.start('GameScene', { level, stamina: 20 });
      });
    }
  }

  getUnlockedLevels() {
    const progress = localStorage.getItem('ds17-progress');
    if (progress) {
      return JSON.parse(progress).unlocked || 1;
    }
    return 1;
  }

  getCurrentLevel() {
    const progress = localStorage.getItem('ds17-progress');
    if (progress) {
      return JSON.parse(progress).current || 1;
    }
    return 1;
  }
}
