import * as Phaser from '../vendor/phaser.esm.js';
import { Card } from '../entities/Card.js';
import { Order } from '../entities/Order.js';

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
  }

  create() {
    this.createBackground();
    this.createUI();
    this.generateLevel();
    this.createOrders();
    this.setupInputHandlers();
  }

  createBackground() {
    const g = this.add.graphics();
    g.fillStyle(0xDEB887, 1);
    g.fillRect(0, 0, 800, 600);
    
    // Wood grain pattern
    g.fillStyle(0xCD853F, 0.3);
    for (let x = 0; x < 800; x += 40) {
      g.fillRect(x, 0, 20, 600);
    }
  }

  createUI() {
    // Order area background
    this.add.rectangle(400, 75, 780, 130, 0x8B4513, 0.9);
    this.add.text(20, 15, '📋 订单区', {
      fontSize: '16px', color: '#FFD700', fontStyle: 'bold'
    });
    
    // Hand area background
    this.add.rectangle(400, 520, 780, 140, 0x2F4F4F, 0.9);
    this.add.text(20, 450, '🎴 手牌区 (点击牌堆拿牌)', {
      fontSize: '14px', color: '#FFFFFF'
    });
    
    // Stats
    this.levelText = this.add.text(20, 15, `第${this.level}关`, {
      fontSize: '20px', color: '#FFD700', fontStyle: 'bold'
    });
    
    this.scoreText = this.add.text(200, 15, `分数: ${this.score}`, {
      fontSize: '18px', color: '#FFD700'
    });
    
    this.coinText = this.add.text(350, 15, `福来币: ${this.coins}`, {
      fontSize: '18px', color: '#FFD700'
    });
    
    this.staminaText = this.add.text(520, 15, `体力: ${this.stamina}`, {
      fontSize: '18px', color: '#00FF00'
    });
    
    this.progressText = this.add.text(650, 15, `进度: 0/${this.targetOrders}`, {
      fontSize: '16px', color: '#FFFFFF'
    });
    
    // Draw pile indicator
    this.drawPileArea = this.add.rectangle(720, 360, 100, 140, 0x654321)
      .setInteractive({ useHandCursor: true });
    this.add.text(720, 360, '牌堆\n(点击拿牌)', {
      fontSize: '14px', color: '#FFFFFF', align: 'center'
    }).setOrigin(0.5);
    
    this.drawPileCount = this.add.text(720, 420, '0张', {
      fontSize: '12px', color: '#FFD700'
    }).setOrigin(0.5);
    
    this.drawPileArea.on('pointerdown', () => this.drawCard());
    
    // Refresh button
    const refreshBtn = this.add.rectangle(720, 500, 90, 35, 0x4169E1)
      .setInteractive({ useHandCursor: true });
    this.add.text(720, 500, '刷新牌区', { fontSize: '12px', color: '#FFF' }).setOrigin(0.5);
    refreshBtn.on('pointerdown', () => this.refreshBoard());
  }

  setupInputHandlers() {
    // Drag start
    this.events.on('cardDragStart', (card) => {
      this.draggedCard = card;
    });
    
    // Drag end - check if dropped on order
    this.events.on('cardDragEnd', (card) => {
      this.draggedCard = null;
      
      // Check collision with orders
      for (const order of this.orders) {
        if (order.completed) continue;
        
        const bounds = order.container.getBounds();
        const cardBounds = card.container.getBounds();
        
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, cardBounds)) {
          if (order.canAcceptCard(card)) {
            this.submitCardToOrder(card, order);
            return;
          }
        }
      }
      
      // Return to hand position if not submitted
      this.arrangeHandCards();
    });
  }

  generateLevel() {
    const types = ['candy', 'dumpling', 'lantern', 'redpacket', 
                   'firecracker', 'couplet', 'fu', 'cake'];
    
    // Generate cards for draw pile
    const cardCount = 40 + (this.level * 10);
    
    for (let i = 0; i < cardCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      // Create off-screen initially
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
      this.showMessage('手牌已满!', 0xFF0000);
      return;
    }
    
    if (this.boardCards.length === 0) {
      this.showMessage('牌堆已空!', 0xFF0000);
      return;
    }
    
    const card = this.boardCards.pop();
    card.container.setVisible(true);
    this.handCards.push(card);
    
    this.updateDrawPileCount();
    this.arrangeHandCards();
    
    // Highlight matching orders
    this.highlightMatchingOrders(card.type);
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
        this.time.delayedCall(500, () => {
          if (!order.completed) order.bg.setStrokeStyle(2, 0x8B4513);
        });
      }
    });
  }

  submitCardToOrder(card, order) {
    // Remove from hand
    const idx = this.handCards.indexOf(card);
    if (idx > -1) this.handCards.splice(idx, 1);
    
    // Submit to order
    if (order.submitCard(card)) {
      // Success
      this.score += 10;
      this.scoreText.setText(`分数: ${this.score}`);
    } else {
      // Failed, return to hand
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

  refreshBoard() {
    if (this.stamina <= 0) {
      this.showMessage('体力不足!', 0xFF0000);
      return;
    }
    
    this.stamina--;
    this.staminaText.setText(`体力: ${this.stamina}`);
    
    // Return hand cards to board
    this.handCards.forEach(card => {
      card.container.setVisible(false);
      this.boardCards.push(card);
    });
    this.handCards = [];
    
    // Shuffle
    this.boardCards.sort(() => Math.random() - 0.5);
    
    this.updateDrawPileCount();
    this.showMessage('牌区已刷新!', 0x00FF00);
  }

  updateDrawPileCount() {
    this.drawPileCount.setText(`${this.boardCards.length}张`);
  }

  onOrderCompleted(order) {
    this.orderCompletedCount++;
    this.progressText.setText(`进度: ${this.orderCompletedCount}/${this.targetOrders}`);
    
    // Check level completion
    if (this.orderCompletedCount >= this.targetOrders) {
      this.completeLevel();
      return;
    }
    
    // Replace completed order with new one
    this.time.delayedCall(1000, () => {
      order.destroy();
      const idx = this.orders.indexOf(order);
      
      const configs = this.generateOrderConfigs(1);
      const newOrder = new Order(this, order.container.x, 80, configs[0]);
      this.orders[idx] = newOrder;
    });
  }

  completeLevel() {
    this.showMessage(`🎉 第${this.level}关完成!`, 0xFFD700);
    
    // Level completion bonus
    const bonus = 100 * this.level;
    this.addCoins(bonus);
    
    this.time.delayedCall(2000, () => {
      // Go to next level
      this.scene.start('GameScene', {
        level: this.level + 1,
        stamina: Math.min(20, this.stamina + 5)
      });
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
