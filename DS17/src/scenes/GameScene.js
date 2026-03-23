import * as Phaser from '../vendor/phaser.esm.js';
import { Card, CardStack } from '../entities/Card.js';
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
    
    this.boardCards = []; // Cards in draw pile
    this.handCards = []; // Individual cards in hand
    this.stacks = {}; // Type -> CardStack
    this.orders = [];
    this.selectedStack = null;
    
    this.MAX_HAND = 20;
    this.orderCompletedCount = 0;
    this.targetOrders = 5 + this.level * 2;
    
    // Combo tracking
    this.comboCount = 0;
    this.lastOrderTime = 0;
  }

  create() {
    this.audioSystem = new AudioSystem(this);
    
    this.createBackground();
    this.createUI();
    this.createPowerUpButtons();
    this.generateLevel();
    this.createOrders();
    this.setupEvents();
    
    // Instructions
    this.showInstructions();
  }

  showInstructions() {
    if (this.level > 1) return;
    
    const overlay = this.add.rectangle(400, 300, 700, 400, 0x000000, 0.9);
    
    this.add.text(400, 150, '🎮 游戏玩法', {
      fontSize: '28px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const steps = [
      '1️⃣ 点击右侧📦牌堆拿牌到手牌区',
      '2️⃣ 点击卡牌进行堆叠（同类型自动堆叠）',
      '3️⃣ 选中堆叠后，点击📋订单提交',
      '4️⃣ 复合订单需按顺序提交（先A后B）',
      '5️⃣ 刚好10张=完美奖励(+20%)'
    ];
    
    steps.forEach((step, i) => {
      this.add.text(400, 200 + i * 35, step, {
        fontSize: '16px', color: '#FFFFFF'
      }).setOrigin(0.5);
    });
    
    const closeBtn = this.add.rectangle(400, 450, 150, 40, 0x228B22)
      .setInteractive({ useHandCursor: true });
    this.add.text(400, 450, '开始游戏', { fontSize: '18px', color: '#FFF' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => {
      overlay.destroy();
      this.scene.restart();
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
    this.add.text(20, 15, '📋 订单区 (点击订单提交选中堆叠)', { 
      fontSize: '14px', color: '#FFD700', fontStyle: 'bold' 
    });
    
    // Hand area
    this.add.rectangle(400, 480, 780, 180, 0x2F4F4F, 0.9);
    this.add.text(20, 395, '🎴 手牌区 - 点击同类型卡牌堆叠', { 
      fontSize: '14px', color: '#FFFFFF' 
    });
    
    // Stack area labels
    this.add.text(20, 420, '堆叠区 (选中堆叠后点击订单提交):', { 
      fontSize: '12px', color: '#CCCCCC' 
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
    
    // Combo display
    this.comboText = this.add.text(400, 200, '', { 
      fontSize: '32px', color: '#FFD700', fontStyle: 'bold' 
    }).setOrigin(0.5).setVisible(false);
    
    // Draw pile
    this.drawPileArea = this.add.rectangle(720, 320, 90, 120, 0x654321)
      .setInteractive({ useHandCursor: true });
    this.add.text(720, 300, '📦', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(720, 340, '牌堆', { fontSize: '14px', color: '#FFFFFF' }).setOrigin(0.5);
    this.drawPileCount = this.add.text(720, 370, '0张', { 
      fontSize: '12px', color: '#FFD700' 
    }).setOrigin(0.5);
    this.drawPileArea.on('pointerdown', () => this.drawCard());
    
    // Refresh button
    const refreshBtn = this.add.rectangle(720, 460, 85, 35, 0x4169E1)
      .setInteractive({ useHandCursor: true });
    this.add.text(720, 460, '🔄 刷新', { fontSize: '12px', color: '#FFF' }).setOrigin(0.5);
    refreshBtn.on('pointerdown', () => this.refreshBoard());
    
    // Menu button
    const menuBtn = this.add.rectangle(720, 510, 85, 35, 0x666666)
      .setInteractive({ useHandCursor: true });
    this.add.text(720, 510, '菜单', { fontSize: '12px', color: '#FFF' }).setOrigin(0.5);
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    
    // Deselect button
    const deselectBtn = this.add.rectangle(720, 410, 85, 35, 0xDC143C)
      .setInteractive({ useHandCursor: true });
    this.add.text(720, 410, '取消选择', { fontSize: '11px', color: '#FFF' }).setOrigin(0.5);
    deselectBtn.on('pointerdown', () => this.deselectStack());
  }

  createPowerUpButtons() {
    // Hint button
    const hintBtn = this.add.rectangle(80, 300, 70, 50, 0x87CEEB)
      .setInteractive({ useHandCursor: true });
    this.add.text(80, 300, '💡\n提示', { fontSize: '11px', color: '#000', align: 'center' }).setOrigin(0.5);
    hintBtn.on('pointerdown', () => this.showHint());
  }

  setupEvents() {
    this.events.on('cardClicked', this.onCardClicked, this);
    this.events.on('stackClicked', this.onStackClicked, this);
    this.events.on('orderClickedForSubmit', this.onOrderSubmit, this);
    this.events.on('orderCompleted', this.onOrderCompleted, this);
  }

  generateLevel() {
    const types = ['candy', 'dumpling', 'lantern', 'redpacket', 'firecracker', 'couplet', 'fu', 'cake'];
    const cardCount = 40 + (this.level * 10);
    
    for (let i = 0; i < cardCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const card = new Card(this, 720, 320, type, i);
      card.container.setVisible(false);
      this.boardCards.push(card);
    }
    
    this.updateDrawPileCount();
  }

  createOrders() {
    const configs = this.generateOrderConfigs(3);
    configs.forEach((config, i) => {
      const x = 120 + i * 230;
      const order = new Order(this, x, 85, config);
      this.orders.push(order);
    });
  }

  generateOrderConfigs(count) {
    const configs = [];
    const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
    
    for (let i = 0; i < count; i++) {
      let type = 'simple';
      if (this.level > 2 && Math.random() < 0.4) type = 'composite';
      if (this.level > 4 && Math.random() < 0.25) type = 'urgent';
      
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
        config.timeLimit = 40;
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
  }

  arrangeHandCards() {
    // Arrange individual cards in hand area
    const cols = 10;
    const startX = 90;
    const startY = 445;
    const gapX = 55;
    
    this.handCards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * gapX;
      const y = startY + row * 35;
      card.moveTo(x, y);
    });
  }

  onCardClicked(card) {
    // If card is already in a stack, select that stack
    if (this.stacks[card.type] && this.stacks[card.type].cards.includes(card)) {
      this.onStackClicked(this.stacks[card.type]);
      return;
    }
    
    // Check if we have a stack of this type
    if (!this.stacks[card.type]) {
      // Create new stack
      const stackIndex = Object.keys(this.stacks).length;
      const col = stackIndex % 5;
      const row = Math.floor(stackIndex / 5);
      const x = 120 + col * 110;
      const y = 480 + row * 70;
      
      this.stacks[card.type] = new CardStack(this, card.type, x, y);
    }
    
    // Move card from hand to stack
    const stack = this.stacks[card.type];
    const handIndex = this.handCards.indexOf(card);
    if (handIndex > -1) {
      this.handCards.splice(handIndex, 1);
    }
    
    stack.addCard(card);
    this.audioSystem.playCardDrop();
    
    // Rearrange remaining hand cards
    this.arrangeHandCards();
    
    // Auto-select the stack
    this.onStackClicked(stack);
  }

  onStackClicked(stack) {
    // Deselect previous
    if (this.selectedStack && this.selectedStack !== stack) {
      this.selectedStack.deselect();
    }
    
    this.selectedStack = stack;
    stack.select();
    
    // Check which orders can accept this
    this.highlightValidOrders(stack.type);
    
    this.audioSystem.playClick();
  }

  deselectStack() {
    if (this.selectedStack) {
      this.selectedStack.deselect();
      this.selectedStack = null;
      
      // Clear order highlights
      this.orders.forEach(order => {
        if (!order.completed) order.bg.setStrokeStyle(2, 0x8B4513);
      });
    }
  }

  highlightValidOrders(type) {
    this.orders.forEach(order => {
      if (order.completed) return;
      
      const check = order.canAcceptStack({ type, getCount: () => 1 });
      if (check.canAccept) {
        order.bg.setStrokeStyle(4, 0x00FF00);
      } else {
        order.bg.setStrokeStyle(2, 0x8B4513);
      }
    });
  }

  onOrderSubmit(order) {
    if (!this.selectedStack) {
      this.showMessage('请先选中一个堆叠!', 0xFFFF00);
      return;
    }
    
    const result = order.submitStack(this.selectedStack);
    
    if (result.success) {
      this.audioSystem.playOrderComplete();
      
      // Update score
      this.score += result.reward;
      this.scoreText.setText(`分数: ${this.score}`);
      
      // Show perfect message
      if (result.isPerfect) {
        this.showFloatingText('完美! +20%', order.container.x, order.container.y - 50, 0xFFD700);
      }
      if (result.overflowBonus > 0) {
        this.showFloatingText(`超额 +${result.overflowBonus}`, order.container.x, order.container.y - 30, 0xFFA500);
      }
      
      // Remove empty stack
      if (this.selectedStack.getCount() === 0) {
        delete this.stacks[this.selectedStack.type];
        this.selectedStack.destroy();
      }
      
      this.selectedStack = null;
      
      // Clear highlights
      this.orders.forEach(o => {
        if (!o.completed) o.bg.setStrokeStyle(2, 0x8B4513);
      });
      
    } else {
      this.audioSystem.playError();
      this.showMessage(result.reason, 0xFF0000);
    }
  }

  showFloatingText(text, x, y, color) {
    const label = this.add.text(x, y, text, {
      fontSize: '18px', color: '#FFFFFF',
      backgroundColor: color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: label, y: y - 40, alpha: 0,
      duration: 1500,
      onComplete: () => label.destroy()
    });
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
    // Find a card in hand that can be used
    let hintShown = false;
    
    for (const card of this.handCards) {
      for (const order of this.orders) {
        if (!order.completed) {
          const check = order.canAcceptStack({ type: card.type, getCount: () => 1 });
          if (check.canAccept) {
            // Highlight this card
            card.highlight(true);
            this.time.delayedCall(2000, () => card.highlight(false));
            hintShown = true;
            break;
          }
        }
      }
      if (hintShown) break;
    }
    
    if (!hintShown && this.handCards.length < this.MAX_HAND) {
      this.showMessage('💡 建议拿更多牌', 0x87CEEB);
    }
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
    
    // Return all cards to board
    [...this.handCards].forEach(card => {
      card.container.setVisible(false);
      this.boardCards.push(card);
    });
    this.handCards = [];
    
    // Return stack cards
    Object.values(this.stacks).forEach(stack => {
      const cards = stack.removeCards(stack.getCount());
      cards.forEach(card => {
        card.container.setVisible(false);
        this.boardCards.push(card);
      });
      stack.destroy();
    });
    this.stacks = {};
    
    this.boardCards.sort(() => Math.random() - 0.5);
    this.updateDrawPileCount();
    this.showMessage('牌区已刷新!', 0x00FF00);
  }

  updateDrawPileCount() {
    this.drawPileCount.setText(`${this.boardCards.length}张`);
  }

  onOrderCompleted(order, data) {
    // Combo system
    const now = Date.now();
    if (now - this.lastOrderTime < 5000) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.lastOrderTime = now;
    
    if (this.comboCount > 1) {
      const bonus = this.comboCount * 10;
      this.addCoins(bonus);
      this.showCombo(this.comboCount);
    }
    
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
      const newOrder = new Order(this, order.container.x, 85, configs[0]);
      this.orders[idx] = newOrder;
    });
  }

  showCombo(count) {
    this.comboText.setText(`${count}连击!`).setVisible(true).setAlpha(1);
    this.comboText.setScale(0.5);
    
    this.tweens.add({
      targets: this.comboText,
      scale: 1.2,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: this.comboText,
            alpha: 0,
            duration: 300,
            onComplete: () => this.comboText.setVisible(false)
          });
        });
      }
    });
  }

  completeLevel() {
    this.audioSystem.playLevelUp();
    
    const stars = this.calculateStars();
    this.showMessage(`🎉 第${this.level}关完成! ${stars}`, 0xFFD700);
    
    const progress = { 
      unlocked: Math.max(this.level + 1, 1), 
      current: this.level + 1,
      [`level${this.level}stars`]: stars.length
    };
    localStorage.setItem('ds17-progress', JSON.stringify(progress));
    
    const bonus = 100 * this.level;
    this.addCoins(bonus);
    
    this.time.delayedCall(3000, () => {
      this.scene.start('LevelSelectScene');
    });
  }

  calculateStars() {
    const ratio = this.score / (this.targetOrders * 100);
    if (ratio >= 1.5) return '⭐⭐⭐';
    if (ratio >= 1.2) return '⭐⭐';
    return '⭐';
  }

  showMessage(text, color) {
    const msg = this.add.text(400, 280, text, {
      fontSize: '26px', color: '#FFFFFF',
      backgroundColor: color.toString(16).padStart(6, '0'),
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: msg, y: 230, alpha: 0,
      duration: 1800,
      onComplete: () => msg.destroy()
    });
  }

  update(time, delta) {
    this.orders.forEach(order => order.updateTimer(delta / 1000));
  }
}
