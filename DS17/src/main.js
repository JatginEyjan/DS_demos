// Phaser is loaded via script tag in index.html

const BootScene = class extends Phaser.Scene {
  constructor() { super('BootScene'); }
  create() {
    this.createCardTextures();
    this.scene.start('MenuScene');
  }
  createCardTextures() {
    const cardTypes = [
      { key: 'candy', color: 0xFF69B4, icon: '🍬' },
      { key: 'dumpling', color: 0xF5F5DC, icon: '🥟' },
      { key: 'lantern', color: 0xFF4500, icon: '🏮' },
      { key: 'redpacket', color: 0xDC143C, icon: '🧧' },
      { key: 'firecracker', color: 0xFFD700, icon: '🧨' },
      { key: 'couplet', color: 0x228B22, icon: '📜' },
      { key: 'fu', color: 0x8B0000, icon: '福' },
      { key: 'cake', color: 0xDAA520, icon: '🥮' }
    ];

    cardTypes.forEach(({ key, color, icon }) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, 60, 80, 8);
      g.lineStyle(2, 0xFFFFFF, 1);
      g.strokeRoundedRect(0, 0, 60, 80, 8);
      g.generateTexture(key, 60, 80);
      g.clear();
      
      const text = this.add.text(30, 40, icon, { fontSize: '32px', align: 'center' }).setOrigin(0.5);
      const rt = this.add.renderTexture(0, 0, 60, 80);
      rt.draw(key, 0, 0);
      rt.draw(text, 30, 40);
      rt.saveTexture(key + '_full');
      text.destroy();
    });

    const g = this.add.graphics();
    g.fillStyle(0x8B0000, 1);
    g.fillRoundedRect(0, 0, 60, 80, 8);
    g.lineStyle(3, 0xFFD700, 1);
    g.strokeRoundedRect(0, 0, 60, 80, 8);
    g.fillStyle(0xFFD700, 0.5);
    for (let i = 10; i < 60; i += 20) {
      for (let j = 10; j < 80; j += 20) {
        g.fillCircle(i, j, 3);
      }
    }
    g.generateTexture('cardback', 60, 80);
  }
};

const MenuScene = class extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  create() {
    const { width, height } = this.scale;
    
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x8B0000, 0x8B0000, 0x4A0000, 0x4A0000, 1);
    graphics.fillRect(0, 0, width, height);
    
    const title = this.add.text(width/2, height/3, '办年货', {
      fontFamily: 'Arial', fontSize: '72px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: title, scale: { from: 1, to: 1.05 },
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    
    this.add.text(width/2, height/3 + 80, 'Card Master', { fontSize: '32px', color: '#FFA500' }).setOrigin(0.5);
    this.add.text(width/2, height/2, '🧧 新春限定 - 卡牌堆叠消除 🧧', { fontSize: '20px', color: '#FFFFFF' }).setOrigin(0.5);
    
    this.createButton(width/2, height * 0.65, '开始游戏', () => {
      this.scene.start('GameScene', { level: 1, stamina: 20 });
    });
    
    this.createButton(width/2, height * 0.75, '选择关卡', () => {
      this.showMessage('功能开发中...', 0xFFFF00);
    });
    
    this.createButton(width/2, height * 0.85, '游戏规则', () => {
      this.showRules();
    });
    
    const decorations = ['🏮', '🧧', '🎊', '🎉'];
    for (let i = 0; i < 8; i++) {
      const x = 80 + i * 90;
      const y = i % 2 === 0 ? 80 : 520;
      this.add.text(x, y, decorations[i % decorations.length], { fontSize: '36px' }).setOrigin(0.5);
    }
  }
  
  createButton(x, y, text, callback) {
    const btn = this.add.rectangle(x, y, 220, 55, 0x228B22).setInteractive({ useHandCursor: true });
    const label = this.add.text(x, y, text, { fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerover', () => { btn.setFillStyle(0x2E8B57); btn.setScale(1.05); });
    btn.on('pointerout', () => { btn.setFillStyle(0x228B22); btn.setScale(1); });
    btn.on('pointerdown', callback);
  }
  
  showRules() {
    const overlay = this.add.rectangle(400, 300, 700, 500, 0x000000, 0.9);
    this.add.text(400, 100, '📜 游戏规则', { fontSize: '28px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    
    const rules = [
      '1. 点击牌堆拿牌到手牌区（最多20张）',
      '2. 点击卡牌进行堆叠（同类型自动堆叠）',
      '3. 选中堆叠后，点击📋订单提交',
      '4. 完成订单获得福来币奖励',
      '5. 完成目标订单数进入下一关'
    ];
    
    rules.forEach((rule, i) => {
      this.add.text(400, 160 + i * 40, rule, { fontSize: '18px', color: '#FFFFFF' }).setOrigin(0.5);
    });
    
    const closeBtn = this.add.rectangle(400, 480, 120, 40, 0xDC143C).setInteractive({ useHandCursor: true });
    this.add.text(400, 480, '关闭', { fontSize: '18px', color: '#FFF' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => overlay.destroy());
  }
  
  showMessage(text, color) {
    const msg = this.add.text(400, 300, text, {
      fontSize: '24px', color: '#FFFFFF', backgroundColor: color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    this.time.delayedCall(1500, () => msg.destroy());
  }
};

const GameScene = class extends Phaser.Scene {
  constructor() { super('GameScene'); }
  
  init(data) {
    this.level = data.level || 1;
    this.score = 0;
    this.coins = 0;
    this.stamina = data.stamina || 20;
    this.boardCards = [];
    this.handCards = [];
    this.orders = [];
    this.targetOrders = 5 + this.level * 2;
    this.completedOrders = 0;
  }
  
  create() {
    this.createBackground();
    this.createUI();
    this.generateCards();
    this.createOrders();
    
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x > 650 && pointer.y > 250 && pointer.y < 400) {
        this.drawCard();
      }
    });
  }
  
  createBackground() {
    const g = this.add.graphics();
    g.fillStyle(0xDEB887, 1);
    g.fillRect(0, 0, 800, 600);
    g.fillStyle(0xCD853F, 0.3);
    for (let x = 0; x < 800; x += 40) {
      g.fillRect(x, 0, 20, 600);
    }
  }
  
  createUI() {
    this.add.rectangle(400, 75, 780, 130, 0x8B4513, 0.9);
    this.add.text(20, 15, '📋 订单区', { fontSize: '16px', color: '#FFD700', fontStyle: 'bold' });
    
    this.add.rectangle(400, 520, 780, 140, 0x2F4F4F, 0.9);
    this.add.text(20, 480, '🎴 手牌区 (点击右侧牌堆拿牌)', { fontSize: '14px', color: '#FFFFFF' });
    
    this.add.text(20, 15, `第${this.level}关`, { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' });
    this.add.text(200, 15, `福来币: ${this.coins}`, { fontSize: '18px', color: '#FFD700' });
    this.add.text(400, 15, `体力: ${this.stamina}`, { fontSize: '18px', color: '#00FF00' });
    this.add.text(600, 15, `进度: 0/${this.targetOrders}`, { fontSize: '16px', color: '#FFFFFF' });
    
    this.add.rectangle(720, 320, 90, 120, 0x654321);
    this.add.text(720, 300, '📦', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(720, 340, '牌堆', { fontSize: '14px', color: '#FFFFFF' }).setOrigin(0.5);
    this.cardCountText = this.add.text(720, 370, '0张', { fontSize: '12px', color: '#FFD700' }).setOrigin(0.5);
    
    const menuBtn = this.add.rectangle(720, 500, 80, 35, 0x666666).setInteractive({ useHandCursor: true });
    this.add.text(720, 500, '菜单', { fontSize: '12px', color: '#FFF' }).setOrigin(0.5);
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
  
  generateCards() {
    const types = ['candy', 'dumpling', 'lantern', 'redpacket', 'firecracker', 'couplet', 'fu', 'cake'];
    const count = 50;
    
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      this.boardCards.push(type);
    }
    
    this.updateCardCount();
  }
  
  createOrders() {
    const orderTypes = [
      { name: '简单订单', req: '糖果 x10', reward: 100 },
      { name: '简单订单', req: '饺子 x10', reward: 100 },
      { name: '复合订单', req: '灯笼x5+红包x5', reward: 120 }
    ];
    
    orderTypes.forEach((order, i) => {
      const x = 130 + i * 250;
      const container = this.add.container(x, 85);
      
      const bg = this.add.rectangle(0, 0, 200, 110, 0xFFF8DC).setStrokeStyle(2, 0x8B4513);
      container.add(bg);
      
      container.add(this.add.text(0, -35, order.name, { fontSize: '14px', color: '#8B0000', fontStyle: 'bold' }).setOrigin(0.5));
      container.add(this.add.text(0, -5, order.req, { fontSize: '12px', color: '#333' }).setOrigin(0.5));
      container.add(this.add.text(0, 25, `💰 ${order.reward}`, { fontSize: '14px', color: '#FFD700' }).setOrigin(0.5));
      container.add(this.add.text(0, 45, '点击交付', { fontSize: '10px', color: '#666' }).setOrigin(0.5));
      
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.completeOrder(container, order.reward);
      });
      
      this.orders.push(container);
    });
  }
  
  drawCard() {
    if (this.handCards.length >= 20) {
      this.showMessage('手牌已满!', 0xFF0000);
      return;
    }
    if (this.boardCards.length === 0) {
      this.showMessage('牌堆已空!', 0xFF0000);
      return;
    }
    
    const cardType = this.boardCards.pop();
    this.handCards.push(cardType);
    
    const index = this.handCards.length - 1;
    const x = 80 + (index % 10) * 60;
    const y = 510 + Math.floor(index / 10) * 40;
    
    this.add.sprite(x, y, cardType + '_full').setScale(0.7);
    this.updateCardCount();
  }
  
  completeOrder(orderContainer, reward) {
    this.coins += reward;
    this.completedOrders++;
    
    const coinText = this.children.list.find(c => c.text && c.text.includes('福来币'));
    if (coinText) coinText.setText(`福来币: ${this.coins}`);
    
    const progressText = this.children.list.find(c => c.text && c.text.includes('进度'));
    if (progressText) progressText.setText(`进度: ${this.completedOrders}/${this.targetOrders}`);
    
    orderContainer.list[0].setFillStyle(0x90EE90);
    this.showMessage(`订单完成! +${reward}福来币`, 0x00FF00);
    
    if (this.completedOrders >= this.targetOrders) {
      this.time.delayedCall(1000, () => {
        this.showMessage(`🎉 第${this.level}关完成!`, 0xFFD700);
        this.time.delayedCall(2000, () => {
          this.scene.start('GameScene', { level: this.level + 1, stamina: 20 });
        });
      });
    }
  }
  
  updateCardCount() {
    this.cardCountText.setText(`${this.boardCards.length}张`);
  }
  
  showMessage(text, color) {
    const msg = this.add.text(400, 300, text, {
      fontSize: '24px', color: '#FFFFFF', backgroundColor: color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    this.time.delayedCall(1500, () => msg.destroy());
  }
};

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: '#8B4513',
  scene: [BootScene, MenuScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
