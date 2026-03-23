export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;
    
    // Background with gradient
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x8B0000, 0x8B0000, 0x4A0000, 0x4A0000, 1);
    graphics.fillRect(0, 0, width, height);
    
    // Animated background elements
    this.createFloatingElements();
    
    // Title with glow effect
    const title = this.add.text(width/2, height/3, '办年货', {
      fontFamily: 'Arial',
      fontSize: '72px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Glow animation
    this.tweens.add({
      targets: title,
      scale: { from: 1, to: 1.05 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.add.text(width/2, height/3 + 80, 'Card Master', {
      fontSize: '32px', color: '#FFA500'
    }).setOrigin(0.5);
    
    this.add.text(width/2, height/2, '🧧 新春限定 - 卡牌堆叠消除 🧧', {
      fontSize: '20px', color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Buttons
    this.createButton(width/2, height * 0.65, '开始游戏', () => {
      this.scene.start('GameScene', { level: 1, stamina: 20 });
    });
    
    this.createButton(width/2, height * 0.75, '选择关卡', () => {
      this.scene.start('LevelSelectScene');
    });
    
    this.createButton(width/2, height * 0.85, '游戏规则', () => {
      this.showRules();
    });
    
    // Decorative elements
    this.createDecorations();
  }
  
  createButton(x, y, text, callback) {
    const btn = this.add.rectangle(x, y, 220, 55, 0x228B22)
      .setInteractive({ useHandCursor: true });
    
    const label = this.add.text(x, y, text, {
      fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    btn.on('pointerover', () => {
      btn.setFillStyle(0x2E8B57);
      btn.setScale(1.05);
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(0x228B22);
      btn.setScale(1);
    });
    btn.on('pointerdown', callback);
    
    return { btn, label };
  }
  
  createFloatingElements() {
    const elements = ['🧧', '🏮', '🎊', '🥟', '🍬'];
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(50, 750);
      const y = Phaser.Math.Between(50, 550);
      const element = this.add.text(x, y, elements[i % elements.length], {
        fontSize: Phaser.Math.Between(20, 40) + 'px',
        alpha: 0.3
      }).setOrigin(0.5);
      
      this.tweens.add({
        targets: element,
        y: y - 100,
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: i * 200
      });
    }
  }
  
  showRules() {
    const overlay = this.add.rectangle(400, 300, 700, 500, 0x000000, 0.9);
    
    this.add.text(400, 100, '📜 游戏规则', {
      fontSize: '28px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const rules = [
      '1. 点击牌堆拿牌到手牌区（最多20张）',
      '2. 点击卡牌进行堆叠（同类型自动堆叠）',
      '3. 选中堆叠后，点击订单提交',
      '4. 复合订单需按顺序提交（先A后B）',
      '5. 刚好10张=完美奖励(+20%)',
      '',
      '💡 提示：订单高亮表示需要该卡牌',
      '⭐ 完成紧急订单获得更多奖励！'
    ];
    
    rules.forEach((rule, i) => {
      this.add.text(400, 150 + i * 35, rule, {
        fontSize: '16px', color: '#FFFFFF', align: 'center'
      }).setOrigin(0.5);
    });
    
    const closeBtn = this.add.rectangle(400, 520, 120, 40, 0xDC143C)
      .setInteractive({ useHandCursor: true });
    this.add.text(400, 520, '关闭', { fontSize: '18px', color: '#FFF' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => {
      overlay.destroy();
      this.scene.restart();
    });
  }
  
  createDecorations() {
    const decorations = ['🏮', '🧧', '🎊', '🎉'];
    for (let i = 0; i < 8; i++) {
      const x = 80 + i * 90;
      const y = i % 2 === 0 ? 80 : 520;
      this.add.text(x, y, decorations[i % decorations.length], {
        fontSize: '36px'
      }).setOrigin(0.5);
    }
  }
}
