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
    
    // Game state
    this.boardCards = []; // Cards on the board
    this.handCards = []; // Cards in hand (max 20)
    this.stacks = {}; // Type -> array of cards
    this.orders = [];
    this.selectedOrder = null;
    
    // Constants
    this.MAX_HAND = 20;
    this.MAX_STACK = 10;
  }

  create() {
    this.createBackground();
    this.createUI();
    this.generateLevel();
    this.createOrders();
    
    // Event listeners
    this.events.on('cardClicked', this.onCardClicked, this);
    this.events.on('orderClicked', this.onOrderClicked, this);
    
    // Input handling
    this.input.on('pointerdown', (pointer) => {
      // Draw card from board if clicked on board area
      if (pointer.y > 300 && pointer.y < 450) {
        this.drawFromBoard();
      }
    });
  }

  createBackground() {
    // Wood texture background
    const g = this.add.graphics();
    g.fillStyle(0xDEB887, 1);
    g.fillRect(0, 0, 800, 600);
    
    // Table pattern
    g.fillStyle(0xCD853F, 0.3);
    for (let x = 0; x < 800; x += 40) {
      g.fillRect(x, 0, 20, 600);
    }
  }

  createUI() {
    // Top bar - Orders area
    this.add.rectangle(400, 70, 760, 120, 0x8B4513, 0.8);
    this.add.text(50, 20, '订单区', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFD700'
    });
    
    // Bottom bar - Hand area
    this.add.rectangle(400, 530, 760, 120, 0x2F4F4F, 0.8);
    this.add.text(50, 480, '手牌区', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF'
    });
    
    // Score display
    this.scoreText = this.add.text(650, 20, `分数: ${this.score}`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#FFD700'
    });
    
    // Coins display
    this.coinText = this.add.text(650, 50, `福来币: ${this.coins}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFD700'
    });
    
    // Level display
    this.add.text(20, 20, `第 ${this.level} 关`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    
    // Stamina display
    this.staminaText = this.add.text(200, 20, `体力: ${this.stamina}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#00FF00'
    });
    
    // Submit button
    const submitBtn = this.add.rectangle(720, 530, 100, 40, 0x228B22)
      .setInteractive({ useHandCursor: true });
    this.add.text(720, 530, '提交订单', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    submitBtn.on('pointerdown', () => this.submitOrder());
    
    // Refresh button
    const refreshBtn = this.add.rectangle(600, 530, 100, 40, 0x4169E1)
      .setInteractive({ useHandCursor: true });
    this.add.text(600, 530, '刷新牌区', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    
    refreshBtn.on('pointerdown', () => this.refreshBoard());
  }

  generateLevel() {
    // Card types available
    const cardTypes = ['candy', 'dumpling', 'lantern', 'redpacket', 
                       'firecracker', 'couplet', 'fu', 'cake'];
    
    // Generate board cards based on level
    const cardCount = 30 + (this.level * 5);
    const positions = this.generateCardPositions(cardCount);
    
    for (let i = 0; i < cardCount; i++) {
      const type = cardTypes[Math.floor(Math.random() * cardTypes.length)];
      const { x, y } = positions[i];
      
      const card = new Card(this, x, y, type);
      card.reveal(); // Face up for gameplay
      this.boardCards.push(card);
    }
  }

  generateCardPositions(count) {
    const positions = [];
    const cols = 8;
    const rows = Math.ceil(count / cols);
    const startX = 100;
    const startY = 200;
    const gapX = 70;
    const gapY = 30;
    
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        x: startX + col * gapX,
        y: startY + row * gapY
      });
    }
    
    return positions;
  }

  createOrders() {
    // Create 3 initial orders
    const orderConfigs = this.generateOrderConfigs(3);
    
    orderConfigs.forEach((config, index) => {
      const x = 150 + index * 200;
      const order = new Order(this, x, 70, config);
      this.orders.push(order);
    });
  }

  generateOrderConfigs(count) {
    const configs = [];
    const cardTypes = ['candy', 'dumpling', 'lantern', 'redpacket'];
    
    for (let i = 0; i < count; i++) {
      // Determine order type based on level
      let type = 'simple';
      if (this.level > 3 && Math.random() < 0.3) type = 'composite';
      if (this.level > 5 && Math.random() < 0.2) type = 'urgent';
      
      const config = {
        id: i,
        type: type,
        requirements: [],
        reward: 100
      };
      
      if (type === 'simple') {
        const type1 = cardTypes[Math.floor(Math.random() * cardTypes.length)];
        config.requirements = [{ type: type1, count: 10 }];
        config.reward = 100;
      } else if (type === 'composite') {
        const type1 = cardTypes[Math.floor(Math.random() * cardTypes.length)];
        let type2 = cardTypes[Math.floor(Math.random() * cardTypes.length)];
        while (type2 === type1) type2 = cardTypes[Math.floor(Math.random() * cardTypes.length)];
        config.requirements = [
          { type: type1, count: 5 },
          { type: type2, count: 5 }
        ];
        config.reward = 120;
      } else if (type === 'urgent') {
        const type1 = cardTypes[Math.floor(Math.random() * cardTypes.length)];
        config.requirements = [{ type: type1, count: 10 }];
        config.timeLimit = 60; // 60 seconds
        config.reward = 150;
      }
      
      configs.push(config);
    }
    
    return configs;
  }

  drawFromBoard() {
    if (this.handCards.length >= this.MAX_HAND) {
      this.showMessage('手牌已满！', 0xFF0000);
      return;
    }
    
    // Find topmost card at click position or random
    if (this.boardCards.length === 0) {
      this.showMessage('牌堆已空！', 0xFF0000);
      return;
    }
    
    const card = this.boardCards.pop();
    this.handCards.push(card);
    
    // Move to hand area
    const handIndex = this.handCards.length - 1;
    const x = 100 + (handIndex % 10) * 65;
    const y = 500 + Math.floor(handIndex / 10) * 50;
    
    card.moveTo(x, y);
  }

  onCardClicked(card) {
    // Stack cards of same type
    if (!this.stacks[card.type]) {
      this.stacks[card.type] = [];
    }
    
    if (this.stacks[card.type].length < this.MAX_STACK) {
      this.stacks[card.type].push(card);
      this.showMessage(`${card.type} 堆叠: ${this.stacks[card.type].length}`, 0x00FF00);
    }
  }

  onOrderClicked(order) {
    this.selectedOrder = order;
    this.showMessage(`选中订单: ${order.type}`, 0xFFFF00);
  }

  submitOrder() {
    if (!this.selectedOrder) {
      this.showMessage('请先选择一个订单！', 0xFF0000);
      return;
    }
    
    // Check if can fulfill
    // Implementation depends on how you track selected cards
    this.showMessage('提交功能待实现', 0xFFFF00);
  }

  refreshBoard() {
    if (this.stamina <= 0) {
      this.showMessage('体力不足！', 0xFF0000);
      return;
    }
    
    this.stamina--;
    this.staminaText.setText(`体力: ${this.stamina}`);
    
    // Move remaining board cards back and regenerate
    this.boardCards.forEach(card => card.destroy());
    this.boardCards = [];
    this.generateLevel();
    
    this.showMessage('牌区已刷新！', 0x00FF00);
  }

  showMessage(text, color) {
    const msg = this.add.text(400, 300, text, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFFFFF',
      backgroundColor: color.toString(16)
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: msg,
      y: 250,
      alpha: 0,
      duration: 1500,
      onComplete: () => msg.destroy()
    });
  }

  update(time, delta) {
    // Update order timers
    this.orders.forEach(order => {
      order.updateTimer(delta / 1000);
    });
  }
}
