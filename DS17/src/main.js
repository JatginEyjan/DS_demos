// ============================================
// DS17 - 办年货 Card Master (P0 Complete)
// M1: Card Stacking | M2: Order Validation | M3: Sequential Delivery
// ============================================

class CardStack {
  constructor(scene, type, x, y) {
    this.scene = scene;
    this.type = type;
    this.cards = [];
    this.x = x;
    this.y = y;
    this.maxStack = 10;
    this.isSelected = false;
    
    this.container = scene.add.container(x, y);
    this.hitArea = scene.add.rectangle(0, 0, 55, 75, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.container.add(this.hitArea);
    
    this.countLabel = scene.add.text(25, -45, '0', {
      fontSize: '14px', color: '#FFF', backgroundColor: '#8B0000', padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setVisible(false);
    this.container.add(this.countLabel);
    
    this.highlightRect = scene.add.rectangle(0, 0, 60, 80, 0x00FF00, 0.3).setVisible(false);
    this.container.add(this.highlightRect);
    
    this.hitArea.on('pointerdown', () => this.onClick());
    this.hitArea.on('pointerover', () => this.onHover(true));
    this.hitArea.on('pointerout', () => this.onHover(false));
  }
  
  onClick() {
    if (this.isSelected) {
      this.deselect();
      this.scene.selectedStack = null;
    } else {
      if (this.scene.selectedStack) this.scene.selectedStack.deselect();
      this.select();
      this.scene.selectedStack = this;
      this.scene.highlightValidOrders(this.type);
    }
    this.scene.playClickSound();
  }
  
  onHover(hovering) { if (!this.isSelected) this.container.setScale(hovering ? 1.05 : 1); }
  
  addCard(card) {
    if (this.cards.length >= this.maxStack) return false;
    this.cards.push(card);
    card.stack = this;
    this.updateVisuals();
    return true;
  }
  
  removeCards(count) {
    const removed = [];
    for (let i = 0; i < count && this.cards.length > 0; i++) removed.push(this.cards.pop());
    this.updateVisuals();
    return removed;
  }
  
  getCount() { return this.cards.length; }
  
  updateVisuals() {
    const count = this.cards.length;
    this.countLabel.setText(count.toString()).setVisible(count > 0);
    this.cards.forEach((card, index) => {
      const stackIndex = count - 1 - index;
      const offsetY = stackIndex * 8;
      const scale = 1 - (stackIndex * 0.03);
      const alpha = 1 - (stackIndex * 0.1);
      card.sprite.setPosition(0, -offsetY).setScale(scale * 0.7).setAlpha(Math.max(0.3, alpha));
      if (card.sprite.parentContainer !== this.container) this.container.add(card.sprite);
    });
    this.countLabel.setBackgroundColor(count > 10 ? '#FF6600' : '#8B0000');
  }
  
  select() { this.isSelected = true; this.highlightRect.setVisible(true); this.container.setDepth(100); }
  deselect() { this.isSelected = false; this.highlightRect.setVisible(false); this.container.setDepth(1); }
  destroy() { this.cards.forEach(c => c.destroy()); this.container.destroy(); }
}

class Card {
  constructor(scene, type, id) {
    this.scene = scene; this.type = type; this.id = id; this.stack = null;
    this.sprite = scene.add.sprite(0, 0, type + '_full').setDisplaySize(50, 70);
  }
  destroy() { this.sprite.destroy(); }
}

class Order {
  constructor(scene, x, y, config) {
    this.scene = scene; this.id = config.id; this.type = config.type;
    this.requirements = config.requirements; this.baseReward = config.reward; this.completed = false;
    this.deliveredCounts = {};
    this.requirements.forEach(req => this.deliveredCounts[req.type] = 0);
    
    this.container = scene.add.container(x, y);
    this.bg = scene.add.rectangle(0, 0, 200, 130, 0xFFF8DC).setStrokeStyle(2, 0x8B4513);
    this.container.add(this.bg);
    
    const typeNames = { simple: '简单订单', composite: '复合订单', urgent: '紧急订单' };
    this.container.add(scene.add.text(0, -52, typeNames[this.type], { fontSize: '14px', color: '#8B0000', fontStyle: 'bold' }).setOrigin(0.5));
    
    this.reqTexts = [];
    this.updateRequirementsDisplay();
    
    this.rewardText = scene.add.text(0, 48, `💰 ${this.baseReward}`, { fontSize: '14px', color: '#FFD700' }).setOrigin(0.5);
    this.container.add(this.rewardText);
    
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => { if (!this.completed) this.bg.setFillStyle(0xFFFFE0); });
    this.bg.on('pointerout', () => { if (!this.completed) this.bg.setFillStyle(0xFFF8DC); });
    this.bg.on('pointerdown', () => this.onClick());
  }
  
  updateRequirementsDisplay() {
    this.reqTexts.forEach(t => t.destroy());
    this.reqTexts = [];
    let yOffset = -30;
    this.requirements.forEach((req) => {
      const delivered = this.deliveredCounts[req.type] || 0;
      const isComplete = delivered >= req.count;
      const isNext = this.getNextRequiredType() === req.type;
      let color = isComplete ? '#00AA00' : (isNext ? '#333333' : '#999999');
      let prefix = isComplete ? '✓' : (isNext ? '▶' : '○');
      const text = this.scene.add.text(0, yOffset, `${prefix} ${this.getTypeLabel(req.type)}: ${delivered}/${req.count}`, { fontSize: '12px', color: color }).setOrigin(0.5);
      this.container.add(text); this.reqTexts.push(text); yOffset += 20;
    });
  }
  
  getTypeLabel(type) {
    const labels = { candy: '糖果', dumpling: '饺子', lantern: '灯笼', redpacket: '红包', firecracker: '鞭炮', couplet: '春联', fu: '福字', cake: '年糕' };
    return labels[type] || type;
  }
  
  getNextRequiredType() {
    for (const req of this.requirements) if (this.deliveredCounts[req.type] < req.count) return req.type;
    return null;
  }
  
  canAcceptStack(stack) {
    if (this.completed) return { canAccept: false, reason: '订单已完成' };
    if (!stack || stack.getCount() === 0) return { canAccept: false, reason: '没有卡牌' };
    const cardType = stack.type;
    const req = this.requirements.find(r => r.type === cardType);
    if (!req) return { canAccept: false, reason: `订单不需要${this.getTypeLabel(cardType)}` };
    const delivered = this.deliveredCounts[cardType] || 0;
    if (delivered >= req.count) return { canAccept: false, reason: `${this.getTypeLabel(cardType)}已完成` };
    if (this.type === 'composite') {
      const nextType = this.getNextRequiredType();
      if (cardType !== nextType) return { canAccept: false, reason: `需先完成${this.getTypeLabel(nextType)}` };
    }
    return { canAccept: true, req, remaining: req.count - delivered };
  }
  
  onClick() {
    const stack = this.scene.selectedStack;
    const result = this.canAcceptStack(stack);
    if (!result.canAccept) { this.scene.showMessage(result.reason, 0xFF0000); this.scene.playErrorSound(); return; }
    
    const consumeCount = Math.min(stack.getCount(), result.remaining);
    const removedCards = stack.removeCards(consumeCount);
    this.deliveredCounts[stack.type] += consumeCount;
    removedCards.forEach(card => card.destroy());
    
    if (stack.getCount() === 0) { delete this.scene.stacks[stack.type]; stack.destroy(); this.scene.selectedStack = null; }
    this.updateRequirementsDisplay();
    this.scene.clearOrderHighlights();
    
    if (this.isComplete()) this.completeOrder(stack.getCount() + consumeCount);
    else { this.scene.showMessage(`${this.getTypeLabel(stack.type)} +${consumeCount}`, 0x87CEEB); this.scene.playSuccessSound(); }
  }
  
  isComplete() { return this.requirements.every(req => (this.deliveredCounts[req.type] || 0) >= req.count); }
  
  completeOrder(totalCards) {
    this.completed = true; this.bg.setFillStyle(0x90EE90);
    let reward = this.baseReward, isPerfect = false, overflowBonus = 0;
    if (totalCards === 10) { isPerfect = true; reward = Math.floor(reward * 1.2); }
    else if (totalCards > 10) overflowBonus = (totalCards - 10) * 3;
    const totalReward = reward + overflowBonus;
    let msg = `订单完成! +${totalReward}福来币`;
    if (isPerfect) msg += ' (完美!)'; if (overflowBonus > 0) msg += ` 超额+${overflowBonus}`;
    this.scene.showMessage(msg, 0x00FF00);
    this.scene.addCoins(totalReward);
    this.scene.playOrderCompleteSound();
    this.scene.onOrderCompleted(this, { isPerfect, totalReward });
  }
  
  highlight() { this.bg.setStrokeStyle(4, 0x00FF00); }
  clearHighlight() { if (!this.completed) this.bg.setStrokeStyle(2, 0x8B4513); }
}

const BootScene = class extends Phaser.Scene {
  constructor() { super('BootScene'); }
  create() {
    const cardTypes = [
      { key: 'candy', color: 0xFF69B4, icon: '🍬' }, { key: 'dumpling', color: 0xF5F5DC, icon: '🥟' },
      { key: 'lantern', color: 0xFF4500, icon: '🏮' }, { key: 'redpacket', color: 0xDC143C, icon: '🧧' },
      { key: 'firecracker', color: 0xFFD700, icon: '🧨' }, { key: 'couplet', color: 0x228B22, icon: '📜' },
      { key: 'fu', color: 0x8B0000, icon: '福' }, { key: 'cake', color: 0xDAA520, icon: '🥮' }
    ];
    cardTypes.forEach(({ key, color, icon }) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1); g.fillRoundedRect(0, 0, 60, 80, 8);
      g.lineStyle(2, 0xFFFFFF, 1); g.strokeRoundedRect(0, 0, 60, 80, 8);
      g.generateTexture(key, 60, 80); g.clear();
      const text = this.add.text(30, 40, icon, { fontSize: '32px' }).setOrigin(0.5);
      const rt = this.add.renderTexture(0, 0, 60, 80);
      rt.draw(key, 0, 0); rt.draw(text, 30, 40); rt.saveTexture(key + '_full'); text.destroy();
    });
    this.scene.start('MenuScene');
  }
};

const MenuScene = class extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  create() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x8B0000, 0x8B0000, 0x4A0000, 0x4A0000, 1); g.fillRect(0, 0, width, height);
    const title = this.add.text(width/2, height/3, '办年货', { fontFamily: 'Arial', fontSize: '72px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: { from: 1, to: 1.05 }, duration: 1000, yoyo: true, repeat: -1 });
    this.add.text(width/2, height/3 + 80, 'Card Master', { fontSize: '32px', color: '#FFA500' }).setOrigin(0.5);
    this.add.text(width/2, height/2, '🧧 P0版本 - 堆叠+验证+顺序交付', { fontSize: '16px', color: '#FFFFFF' }).setOrigin(0.5);
    this.createButton(width/2, height * 0.65, '开始游戏', () => this.scene.start('GameScene', { level: 1, stamina: 20 }));
    this.createButton(width/2, height * 0.78, '游戏规则', () => this.showRules());
  }
  createButton(x, y, text, callback) {
    const btn = this.add.rectangle(x, y, 220, 55, 0x228B22).setInteractive({ useHandCursor: true });
    this.add.text(x, y, text, { fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerover', () => { btn.setFillStyle(0x2E8B57); btn.setScale(1.05); });
    btn.on('pointerout', () => { btn.setFillStyle(0x228B22); btn.setScale(1); });
    btn.on('pointerdown', callback);
  }
  showRules() {
    const overlay = this.add.rectangle(400, 300, 720, 520, 0x000000, 0.95);
    this.add.text(400, 80, '📜 游戏规则 (P0完整版)', { fontSize: '24px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    const rules = ['【M1 卡牌堆叠】', '• 点击牌堆拿牌，同类型自动堆叠', '• 堆叠上限10张，超出有警告色', '• 点击堆叠选中，绿色高亮', '', '【M2 订单验证】', '• 选中堆叠后点击订单交付', '• 必须交付订单要求的类型和数量', '• 交付后卡牌被消耗', '', '【M3 顺序交付】', '• 复合订单（A+B）必须先完成A再完成B', '• 订单上 ▶ 标记表示当前需要的类型', '• ✓ 标记表示已完成的类型'];
    rules.forEach((rule, i) => { const color = rule.startsWith('【') ? '#FFD700' : '#FFFFFF'; this.add.text(400, 130 + i * 26, rule, { fontSize: '14px', color: color }).setOrigin(0.5); });
    const closeBtn = this.add.rectangle(400, 480, 120, 40, 0xDC143C).setInteractive({ useHandCursor: true });
    this.add.text(400, 480, '关闭', { fontSize: '18px', color: '#FFF' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => overlay.destroy());
  }
};

const GameScene = class extends Phaser.Scene {
  constructor() { super('GameScene'); }
  init(data) {
    this.level = data.level || 1; this.coins = 0; this.stamina = data.stamina || 20;
    this.boardCards = []; this.handCards = []; this.stacks = {}; this.orders = [];
    this.selectedStack = null; this.targetOrders = 3; this.completedOrders = 0;
  }
  create() {
    const g = this.add.graphics();
    g.fillStyle(0xDEB887, 1); g.fillRect(0, 0, 800, 600);
    g.fillStyle(0xCD853F, 0.3); for (let x = 0; x < 800; x += 40) g.fillRect(x, 0, 20, 600);
    this.add.rectangle(400, 75, 780, 140, 0x8B4513, 0.9);
    this.add.text(20, 15, '📋 订单区 (选中堆叠后点击订单交付)', { fontSize: '14px', color: '#FFD700', fontStyle: 'bold' });
    this.add.rectangle(400, 520, 780, 140, 0x2F4F4F, 0.9);
    this.add.text(20, 455, '🎴 堆叠区 - 点击牌堆拿牌，同类型自动堆叠', { fontSize: '12px', color: '#FFFFFF' });
    this.add.text(20, 15, `第${this.level}关`, { fontSize: '18px', color: '#FFD700', fontStyle: 'bold' });
    this.coinText = this.add.text(180, 15, `福来币: ${this.coins}`, { fontSize: '16px', color: '#FFD700' });
    this.progressText = this.add.text(350, 15, `进度: 0/${this.targetOrders}`, { fontSize: '14px', color: '#FFFFFF' });
    
    this.drawPileArea = this.add.rectangle(720, 320, 90, 120, 0x654321).setInteractive({ useHandCursor: true });
    this.add.text(720, 300, '📦', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(720, 340, '牌堆', { fontSize: '14px', color: '#FFFFFF' }).setOrigin(0.5);
    this.cardCountText = this.add.text(720, 370, '0张', { fontSize: '12px', color: '#FFD700' }).setOrigin(0.5);
    this.drawPileArea.on('pointerdown', () => this.drawCard());
    
    const deselectBtn = this.add.rectangle(720, 430, 85, 35, 0xDC143C).setInteractive({ useHandCursor: true });
    this.add.text(720, 430, '取消选择', { fontSize: '11px', color: '#FFF' }).setOrigin(0.5);
    deselectBtn.on('pointerdown', () => this.deselectAll());
    
    const menuBtn = this.add.rectangle(720, 500, 80, 35, 0x666666).setInteractive({ useHandCursor: true });
    this.add.text(720, 500, '菜单', { fontSize: '12px', color: '#FFF' }).setOrigin(0.5);
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    
    const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
    for (let i = 0; i < 40; i++) this.boardCards.push(types[Math.floor(Math.random() * types.length)]);
    this.updateCardCount();
    
    // Orders
    this.orders.push(new Order(this, 130, 85, { id: 1, type: 'simple', requirements: [{ type: 'candy', count: 5 }], reward: 100 }));
    this.orders.push(new Order(this, 350, 85, { id: 2, type: 'composite', requirements: [{ type: 'dumpling', count: 3 }, { type: 'lantern', count: 3 }], reward: 150 }));
    this.orders.push(new Order(this, 570, 85, { id: 3, type: 'simple', requirements: [{ type: 'redpacket', count: 5 }], reward: 100 }));
  }
  
  drawCard() {
    if (Object.keys(this.stacks).length >= 10) { this.showMessage('堆叠区已满!', 0xFF0000); this.playErrorSound(); return; }
    if (this.boardCards.length === 0) { this.showMessage('牌堆已空!', 0xFF0000); return; }
    const type = this.boardCards.pop();
    const card = new Card(this, type, Date.now());
    if (this.stacks[type]) { if (!this.stacks[type].addCard(card)) this.createNewStack(card); }
    else this.createNewStack(card);
    this.updateCardCount(); this.playDrawSound();
  }
  
  createNewStack(card) {
    const count = Object.keys(this.stacks).length;
    const stack = new CardStack(this, card.type, 120 + (count % 5) * 110, 480 + Math.floor(count / 5) * 70);
    stack.addCard(card); this.stacks[card.type] = stack;
  }
  
  deselectAll() { if (this.selectedStack) { this.selectedStack.deselect(); this.selectedStack = null; } this.clearOrderHighlights(); }
  highlightValidOrders(cardType) { this.orders.forEach(order => { if (order.canAcceptStack({ type: cardType, getCount: () => 1 }).canAccept) order.highlight(); }); }
  clearOrderHighlights() { this.orders.forEach(order => order.clearHighlight()); }
  
  onOrderCompleted(order, data) {
    this.completedOrders++;
    this.progressText.setText(`进度: ${this.completedOrders}/${this.targetOrders}`);
    if (this.completedOrders >= this.targetOrders) {
      this.time.delayedCall(1500, () => { this.showMessage(`🎉 第${this.level}关完成!`, 0xFFD700); this.time.delayedCall(2000, () => this.scene.start('GameScene', { level: this.level + 1, stamina: this.stamina })); });
    } else {
      this.time.delayedCall(1000, () => {
        order.container.destroy();
        const idx = this.orders.indexOf(order);
        const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.orders[idx] = new Order(this, order.container.x, 85, { id: Date.now(), type: 'simple', requirements: [{ type, count: 5 }], reward: 100 });
      });
    }
  }
  
  addCoins(amount) { this.coins += amount; this.coinText.setText(`福来币: ${this.coins}`); }
  updateCardCount() { this.cardCountText.setText(`${this.boardCards.length}张`); }
  showMessage(text, color) {
    const msg = this.add.text(400, 280, text, { fontSize: '20px', color: '#FFFFFF', backgroundColor: color.toString(16).padStart(6, '0'), padding: { x: 10, y: 5 } }).setOrigin(0.5);
    this.tweens.add({ targets: msg, y: 230, alpha: 0, duration: 1500, onComplete: () => msg.destroy() });
  }
  
  // Sound effects
  playClickSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(800, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.05); } catch(e) {} }
  playErrorSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.15); } catch(e) {} }
  playSuccessSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); } catch(e) {} }
  playOrderCompleteSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); [523.25, 659.25, 783.99].forEach((freq, i) => { const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1); osc.connect(ctx.destination); osc.start(ctx.currentTime + i * 0.1); osc.stop(ctx.currentTime + i * 0.1 + 0.2); }); } catch(e) {} }
  playDrawSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); } catch(e) {} }
};

const config = { type: Phaser.AUTO, parent: 'game-container', width: 800, height: 600, backgroundColor: '#8B4513', scene: [BootScene, MenuScene, GameScene], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } };
new Phaser.Game(config);
