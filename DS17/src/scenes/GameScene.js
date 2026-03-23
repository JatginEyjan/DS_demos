import * as Phaser from '../vendor/phaser.esm.js';
import { Card } from '../entities/Card.js';
import { Order } from '../entities/Order.js';
import { AudioSystem } from '../systems/AudioSystem.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.level = data.level || 1;
    this.score = 0;
    this.coins = 0;
    this.stamina = data.stamina || 20;
    this.boardCards = [];
    this.handCards = [];
    this.orders = [];
    this.draggedCard = null;
    this.MAX_HAND = 20;
    this.orderCompletedCount = 0;
    this.targetOrders = 5 + this.level * 2;
    
    // Power-ups
    this.hasWildCard = false;
    this.undoAvailable = true;
  }

  create() {
    this.audioSystem = new AudioSystem(this);
    
    this.createBackground();
    this.createUI();
    this.createPowerUpButtons();
    this.generateLevel();
    this.createOrders();
    this.setupInputHandlers();
    this.setupEvents();
    
    // Start background music (optional simple loop)
    this.time.delayedCall(500, () => {
      this.audioSystem.playClick();
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
    // Order area
    this.add.rectangle(400, 75, 780, 130, 0x8B4513, 0.9);
    this.add.text(20, 15, '📋 订单区', { fontSize: '16px', color: '#FFD700', fontStyle: 'bold' });
    
    // Hand area
    this.add.rectangle(400, 520, 780, 140, 0x2F4F4F, 0.9);
    this.add.text(20, 450, '🎴 手牌区 (点击牌堆拿牌)', { fontSize: '14px', color: '#FFFFFF' });
    
    // Stats
    this.levelText = this.add.text(20, 15, `第${this.level}关`, { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' });
    this.scoreText = this.add.text(200, 15, `分数: ${this.score}`, { fontSize: '18px', color: '#FFD700' });
    this.coinText = this.add.text(350, 15, `福来币: ${this.coins}`, { fontSize: '18px', color: '#FFD700' });
    this.staminaText = this.add.text(520, 15, `体力: ${this.stamina}`, { fontSize: '18px', color: '#00FF00' });
    this.progressText = this.add.text(650, 15, `进度: 0/${this.targetOrders}`, { fontSize: '16px', color: '#FFFFFF' });
    
    // Draw pile
    this.drawPileArea = this.add.rectangle(720, 360, 100, 140, 0x654321).setInteractive({ useHandCursor: true });
    this.add.text(720, 340, '📦', { fontSize: '40px' }).setOrigin(0.5);
    this.add.text(720, 380, '牌堆', { fontSize: '14px', color: '#FFFFFF' }).setOrigin(0.5);
    this.drawPileCount = this.add.text(720, 410, '0张', { fontSize: '12px', color: '#FFD700' }).setOrigin(0.5);
    this.drawPileArea.on('pointerdown', () => this.drawCard());
    
    // Refresh button
    const refreshBtn = this.add.rectangle(720, 480, 90, 35, 0x4169E1).setInteractive({ useHandCursor: true });
    this.add.text(720, 480, '🔄 刷新', { fontSize: '12px', color: '#FFF' }).setOrigin(0.5);
    refreshBtn.on('pointerdown', () => this.refreshBoard());
    
    // Back to menu
    const menuBtn = this.add.rectangle(720, 550, 90, 35, 0x666666).setInteractive({ useHandCursor: true });
    this.add.text(720, 550, '菜单', { fontSize: '12px', color: '#FFF' }).setOrigin(0.5);
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  createPowerUpButtons() {
    // Wild Card button
    const wildBtn = this.add.rectangle(100, 200, 80, 60, 0xFFD700)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.add.text(100, 200, '🃏\n万能', { fontSize: '12px', color: '#000', align: 'center' }).setOrigin(0.5).setVisible(false);
    
    // Hint button
    const hintBtn = this.add.rectangle(100, 280, 80, 60, 0x87CEEB)
      .setInteractive({ useHandCursor: true });
    this.add.text(100, 280, '💡\n提示', { fontSize: '12px', color: '#000', align: 'center' }).setOrigin(0.5);
    hintBtn.on('pointerdown', () => this.showHint());
    
    // Undo button
    this.undoBtn = this.add.rectangle(100, 360, 80, 60, this.undoAvailable ? 0x98FB98 : 0x999999)
      .setInteractive({ useHandCursor: true });
    this.undoText = this.add.text(100, 360, '↩️\n撤销', { fontSize: '12px', color: '#000', align: 'center' }).setOrigin(0.5);
    this.undoBtn.on('pointerdown', () => this.undoLastAction());
  }

  setupEvents() {
    this.events.on('orderCompleted', this.onOrderCompleted, this);
  }

  setupInputHandlers() {
    this.events.on('cardDragStart', (card) => {
      this.draggedCard = card;
      this.audioSystem.playCardFlip();
    });
    
    this.events.on('cardDragEnd', (card) => {
      this.draggedCard = null;
      let droppedOnOrder = false;
      
      for (const order of this.orders) {
        if (order.completed) continue;
        
        const bounds = order.container.getBounds();
        const cardBounds = card.container.getBounds();
        
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, cardBounds)) {
          if (order.canAcceptCard(card)) {
            this.submitCardToOrder(card, order);
            droppedOnOrder = true;
            this.audioSystem.playCardDrop();
            break;
          }
        }
      }
      
      if (!droppedOnOrder) {
        this.audioSystem.playCardFlip();
        this.arrangeHandCards();
      }
    });
  }

  generateLevel() {
    const types = ['candy', 'dumpling', 'lantern', 'redpacket', 'firecracker', 'couplet', 'fu', 'cake'];
    const cardCount = 40 + (this.level * 10);
    
    for (let i = 0; i < cardCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const card = new Card(this, 720, 360, type, i);
      card.container.setVisible(false);
      this.boardCards.push(card);
    }
    
    this.updateDrawPileCount();
  }

  createOrders() {
    const configs = this.generateOrderConfigs(3);
    configs.forEach((config, i) => {
      const x = 120 + i * 220;
      const order = new Order(this, x, 80, config);
      this.orders.push(order);
    });
  }

  generateOrderConfigs(count) {
    const configs = [];
    const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
    
    for (let i = 0; i < count; i++) {
      let type = 'simple';
      if (this.level > 2 && Math.random() < 0.4) type = 'composite';
      if (this.level > 4 && Math.random() < 0.2) type = 'urgent';
      
      const config = { id: i, type, requirements: [], reward: 100 };
      
      if (type === 'simple') {
        const t = types[Math.floor(Math.random() * types.length)];
        config.requirements = [{ type: t, count: 10 }];
      } else if (type === 'composite') {
        const t1 = types[Math.floor(Math.random() * types.length)];
        let t2 = types[Math.floor(Math.random() * types.length)];
        while (t2 === t1) t2 = types[Math.floor(Math.random() * types.length)];
        config.requirements = [{ type: t1, count: 5 }, { type: t2, count: 5 }];
        config.reward = 120;
      } else {
        const t = types[Math.floor(Math.random() * types.length)];
        config.requirements = [{ type: t, count: 10 }];
        config.timeLimit = 45;
        config.reward = 150;
      }
      
      configs.push(config);
    }
    return configs;
  }

  drawCard() {
    if (this.handCards.length >= this.MAX_HAND) {
      this.audioSystem.playError();
      this.showMessage('手牌已满!', 0xFF0000);
      return;
    }
    
    if (this.boardCards.length === 0) {
      this.audioSystem.playError();
      this.showMessage('牌堆已空!', 0xFF0000);
      return;
    }
    
    this.audioSystem.playCardFlip();
    const card = this.boardCards.pop();
    card.container.setVisible(true);
    this.handCards.push(card);
    
    this.updateDrawPileCount();
    this.arrangeHandCards();
    this.highlightMatchingOrders(card.type);
    
    // Chance to get power-up
    if (Math.random() < 0.05) {
      this.showMessage('🎁 获得道具卡!', 0xFFD700);
    }
  }

  arrangeHandCards() {
    const cols = 10;
    const startX = 80;
    const startY = 490;
    const gapX = 65;
    const gapY = 55;
    
    this.handCards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * gapX;
      const y = startY + row * gapY;
      card.moveTo(x, y);
    });
  }

  highlightMatchingOrders(type) {
    this.orders.forEach(order => {
      if (order.completed) return;
      const canUse = order.requirements.some(req => 
        req.type === type && order.getSubmittedCount(req.type) < req.count
      );
      
      if (canUse) {
        order.bg.setStrokeStyle(4, 0x00FF00);
        this.tweens.add({
          targets: order.bg,
          strokeAlpha: { from: 1, to: 0.3 },
          duration: 500,
          yoyo: true,
          repeat: 2,
          onComplete: () => {
            if (!order.completed) order.bg.setStrokeStyle(2, 0x8B4513);
          }
        });
      }
    });
  }

  submitCardToOrder(card, order) {
    const idx = this.handCards.indexOf(card);
    if (idx > -1) this.handCards.splice(idx, 1);
    
    if (order.submitCard(card)) {
      this.score += 10;
      this.scoreText.setText(`分数: ${this.score}`);
    } else {
      this.handCards.push(card);
      this.arrangeHandCards();
    }
  }

  returnCardToHand(card) {
    this.handCards.push(card);
    this.arrangeHandCards();
  }

  addCoins(amount) {
    this.coins += amount;
    this.coinText.setText(`福来币: ${this.coins}`);
  }

  showHint() {
    // Highlight cards that can be used on current orders
    let hintShown = false;
    this.handCards.forEach(card => {
      for (const order of this.orders) {
        if (!order.completed && order.canAcceptCard(card)) {
          card.highlight(true);
          hintShown = true;
          this.time.delayedCall(2000, () => card.highlight(false));
        }
      }
    });
    
    if (hintShown) {
      this.showMessage('💡 高亮卡牌可交付订单', 0x87CEEB);
    } else {
      this.showMessage('💡 尝试拿更多牌', 0x87CEEB);
    }
  }

  undoLastAction() {
    if (!this.undoAvailable) {
      this.audioSystem.playError();
      return;
    }
    this.showMessage('撤销功能开发中', 0xFFFF00);
  }

  refreshBoard() {
    if (this.stamina <= 0) {
      this.audioSystem.playError();
      this.showMessage('体力不足!', 0xFF0000);
      return;
    }
    
    this.stamina--;
    this.staminaText.setText(`体力: ${this.stamina}`);
    this.audioSystem.playCardFlip();
    
    this.handCards.forEach(card => {
      card.container.setVisible(false);
      this.boardCards.push(card);
    });
    this.handCards = [];
    this.boardCards.sort(() => Math.random() - 0.5);
    
    this.updateDrawPileCount();
    this.showMessage('牌区已刷新!', 0x00FF00);
  }

  updateDrawPileCount() {
    this.drawPileCount.setText(`${this.boardCards.length}张`);
  }

  onOrderCompleted(order) {
    this.audioSystem.playOrderComplete();
    this.orderCompletedCount++;
    this.progressText.setText(`进度: ${this.orderCompletedCount}/${this.targetOrders}`);
    
    if (this.orderCompletedCount >= this.targetOrders) {
      this.completeLevel();
      return;
    }
    
    this.time.delayedCall(1000, () => {
      order.destroy();
      const idx = this.orders.indexOf(order);
      const configs = this.generateOrderConfigs(1);
      const newOrder = new Order(this, order.container.x, 80, configs[0]);
      this.orders[idx] = newOrder;
    });
  }

  completeLevel() {
    this.audioSystem.playLevelUp();
    this.showMessage(`🎉 第${this.level}关完成!`, 0xFFD700);
    
    // Save progress
    const progress = { unlocked: Math.max(this.level + 1, 1), current: this.level + 1 };
    localStorage.setItem('ds17-progress', JSON.stringify(progress));
    
    const bonus = 100 * this.level;
    this.addCoins(bonus);
    
    this.time.delayedCall(3000, () => {
      this.scene.start('GameScene', { level: this.level + 1, stamina: Math.min(20, this.stamina + 5) });
    });
  }

  showMessage(text, color) {
    const msg = this.add.text(400, 280, text, {
      fontSize: '28px', color: '#FFFFFF',
      backgroundColor: color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: msg, y: 220, alpha: 0,
      duration: 1500,
      onComplete: () => msg.destroy()
    });
  }

  update(time, delta) {
    this.orders.forEach(order => order.updateTimer(delta / 1000));
  }
}
