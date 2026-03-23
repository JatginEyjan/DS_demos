// ============================================
// DS17 - 办年货 Card Master (P0 + P1 + P2 + P3 Complete)
// M1-M3: Core | M4: Levels | M5: Power Cards | M6-M8: Combo+Rewards | M9: Stamina | M10-M12: Hint+Urgent+Complete
// ============================================

// ===== Progress Manager (M4) =====
class ProgressManager {
  static getKey() { return 'ds17-progress-v1'; }
  
  static getProgress() {
    const data = localStorage.getItem(this.getKey());
    if (data) return JSON.parse(data);
    return {
      unlocked: 1,
      current: 1,
      stars: {}, // level -> stars
      stamina: 20,
      lastStaminaUpdate: Date.now()
    };
  }
  
  static saveProgress(progress) {
    localStorage.setItem(this.getKey(), JSON.stringify(progress));
  }
  
  static getStamina() {
    const prog = this.getProgress();
    const now = Date.now();
    const minutesPassed = (now - prog.lastStaminaUpdate) / 60000;
    const recovered = Math.floor(minutesPassed / 6); // 1 stamina per 6 min
    return Math.min(20, prog.stamina + recovered);
  }
  
  static useStamina() {
    const prog = this.getProgress();
    const current = this.getStamina();
    if (current < 1) return false;
    prog.stamina = current - 1;
    prog.lastStaminaUpdate = Date.now();
    this.saveProgress(prog);
    return true;
  }
  
  static completeLevel(level, stars) {
    const prog = this.getProgress();
    prog.stars[level] = Math.max(prog.stars[level] || 0, stars);
    prog.unlocked = Math.max(prog.unlocked, level + 1);
    prog.current = level + 1;
    this.saveProgress(prog);
  }
}

// ===== Undo Manager (M5) =====
class UndoManager {
  constructor() { this.actions = []; }
  push(action) { this.actions.push(action); if (this.actions.length > 10) this.actions.shift(); }
  canUndo() { return this.actions.length > 0; }
  undo(scene) {
    if (!this.canUndo()) return false;
    const action = this.actions.pop();
    action.undo(scene);
    return true;
  }
  clear() { this.actions = []; }
}

// ===== CardStack Class (M1) =====
class CardStack {
  constructor(scene, type, x, y) {
    this.scene = scene; this.type = type; this.cards = []; this.x = x; this.y = y;
    this.maxStack = 10; this.isSelected = false;
    this.container = scene.add.container(x, y);
    this.hitArea = scene.add.rectangle(0, 0, 55, 75, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.container.add(this.hitArea);
    this.countLabel = scene.add.text(25, -45, '0', { fontSize: '14px', color: '#FFF', backgroundColor: '#8B0000', padding: { x: 4, y: 2 } }).setOrigin(0.5).setVisible(false);
    this.container.add(this.countLabel);
    this.highlightRect = scene.add.rectangle(0, 0, 60, 80, 0x00FF00, 0.3).setVisible(false);
    this.container.add(this.highlightRect);
    this.hitArea.on('pointerdown', () => this.onClick());
    this.hitArea.on('pointerover', () => this.onHover(true));
    this.hitArea.on('pointerout', () => this.onHover(false));
  }
  
  onClick() {
    if (this.isSelected) { this.deselect(); this.scene.selectedStack = null; }
    else {
      if (this.scene.selectedStack) this.scene.selectedStack.deselect();
      this.select(); this.scene.selectedStack = this; this.scene.highlightValidOrders(this.type);
    }
    this.scene.playClickSound();
  }
  
  onHover(hovering) { if (!this.isSelected) this.container.setScale(hovering ? 1.05 : 1); }
  addCard(card) {
    if (this.cards.length >= this.maxStack) return false;
    this.cards.push(card); card.stack = this; this.updateVisuals(); return true;
  }
  removeCards(count) {
    const removed = [];
    for (let i = 0; i < count && this.cards.length > 0; i++) removed.push(this.cards.pop());
    this.updateVisuals(); return removed;
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

// ===== Card Class (M5: supports power cards) =====
class Card {
  constructor(scene, type, id, isPowerCard = false, powerType = null) {
    this.scene = scene; this.type = type; this.id = id;
    this.isPowerCard = isPowerCard;
    this.powerType = powerType; // 'wild', 'refresh', 'undo'
    
    if (isPowerCard) {
      const colors = { wild: 0xFFD700, refresh: 0x00CED1, undo: 0x9370DB };
      const icons = { wild: '★', refresh: '↻', undo: '↶' };
      this.sprite = scene.add.sprite(0, 0, 'cardback').setDisplaySize(50, 70);
      this.iconText = scene.add.text(0, 0, icons[powerType], { fontSize: '24px', color: '#FFF' }).setOrigin(0.5);
      this.labelText = scene.add.text(0, 20, powerType === 'wild' ? '万能' : powerType === 'refresh' ? '刷新' : '撤销', { fontSize: '10px', color: '#FFF' }).setOrigin(0.5);
    } else {
      this.sprite = scene.add.sprite(0, 0, type + '_full').setDisplaySize(50, 70);
    }
  }
  destroy() {
    this.sprite.destroy();
    if (this.iconText) this.iconText.destroy();
    if (this.labelText) this.labelText.destroy();
  }
}

// ===== Order Class (M2 + M3) =====
class Order {
  constructor(scene, x, y, config) {
    this.scene = scene; this.id = config.id; this.type = config.type;
    this.requirements = config.requirements; this.baseReward = config.reward; this.completed = false;
    this.deliveredCounts = {};
    this.requirements.forEach(req => this.deliveredCounts[req.type] = 0);
    
    // M11: Urgent order timer
    this.timeLimit = config.timeLimit || null;
    this.timeRemaining = this.timeLimit;
    this.timerText = null;
    
    this.container = scene.add.container(x, y);
    
    // M11: Red background for urgent orders
    const bgColor = this.type === "urgent" ? 0xFFE4E1 : 0xFFF8DC;
    const borderColor = this.type === "urgent" ? 0xDC143C : 0x8B4513;
    this.bg = scene.add.rectangle(0, 0, 200, this.type === "urgent" ? 150 : 130, bgColor).setStrokeStyle(this.type === "urgent" ? 4 : 2, borderColor);
    this.container.add(this.bg);
    
    const typeNames = { simple: "简单订单", composite: "复合订单", urgent: "紧急订单" };
    this.container.add(scene.add.text(0, -52, typeNames[this.type], { fontSize: "14px", color: "#8B0000", fontStyle: "bold" }).setOrigin(0.5));
    
    // M11: Add warning icon for urgent orders
    if (this.type === "urgent") {
      this.container.add(scene.add.text(-70, -52, "⚠️", { fontSize: "16px" }).setOrigin(0.5));
      this.container.add(scene.add.text(0, -35, "限时! 奖励x1.5", { fontSize: "10px", color: "#FF0000" }).setOrigin(0.5));
    }
    
    this.reqTexts = [];
    this.updateRequirementsDisplay();
    
    // M11: Adjust reward text position for urgent orders
    const rewardY = this.type === "urgent" ? 55 : 48;
    this.rewardText = scene.add.text(0, rewardY, `💰 ${this.baseReward}`, { fontSize: "14px", color: "#FFD700" }).setOrigin(0.5);
    this.container.add(this.rewardText);
    
    // M11: Create timer display for urgent orders
    if (this.type === "urgent") {
      this.timerText = scene.add.text(0, 35, `⏱️ ${this.timeLimit}s`, { fontSize: "14px", color: "#FF0000", fontStyle: "bold" }).setOrigin(0.5);
      this.container.add(this.timerText);
      
      // Start timer update
      this.timerEvent = scene.time.addEvent({
        delay: 1000,
        callback: () => this.updateTimer(),
        callbackScope: this,
        loop: true
      });
    }
    
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerover", () => { if (!this.completed) this.bg.setFillStyle(0xFFFFE0); });
    this.bg.on("pointerout", () => { if (!this.completed) this.bg.setFillStyle(bgColor); });
    this.bg.on("pointerdown", () => this.onClick());
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
    const labels = { candy: '糖果', dumpling: '饺子', lantern: '灯笼', redpacket: '红包', firecracker: '鞭炮', couplet: '春联', fu: '福字', cake: '年糕', wild: '任意' };
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
    // M5: Wild card can match any type
    if (cardType === 'wild') {
      const nextType = this.getNextRequiredType();
      if (!nextType) return { canAccept: false, reason: '订单已完成' };
      const req = this.requirements.find(r => r.type === nextType);
      return { canAccept: true, req, remaining: req.count - (this.deliveredCounts[nextType] || 0), isWild: true };
    }
    const req = this.requirements.find(r => r.type === cardType);
    if (!req) return { canAccept: false, reason: `订单不需要${this.getTypeLabel(cardType)}` };
    const delivered = this.deliveredCounts[cardType] || 0;
    if (delivered >= req.count) return { canAccept: false, reason: `${this.getTypeLabel(cardType)}已完成` };
    if (this.type === 'composite') {
      const nextType = this.getNextRequiredType();
      if (cardType !== nextType) return { canAccept: false, reason: `需先完成${this.getTypeLabel(nextType)}` };
    }
    return { canAccept: true, req, remaining: req.count - delivered, isWild: false };
  }
  
  onClick() {
    const stack = this.scene.selectedStack;
    const result = this.canAcceptStack(stack);
    if (!result.canAccept) { this.scene.showMessage(result.reason, 0xFF0000); this.scene.playErrorSound(); return; }
    
    const consumeCount = Math.min(stack.getCount(), result.remaining);
    const removedCards = stack.removeCards(consumeCount);
    
    // M5: Track wild card usage
    if (result.isWild) {
      const nextType = this.getNextRequiredType();
      this.deliveredCounts[nextType] += consumeCount;
      this.scene.showMessage(`万能卡交付 ${this.getTypeLabel(nextType)} x${consumeCount}!`, 0xFFD700);
    } else {
      this.deliveredCounts[stack.type] += consumeCount;
    }
    
    removedCards.forEach(card => card.destroy());
    
    if (stack.getCount() === 0) { delete this.scene.stacks[stack.type]; stack.destroy(); this.scene.selectedStack = null; }
    this.updateRequirementsDisplay();
    this.scene.clearOrderHighlights();
    
    if (this.isComplete()) this.completeOrder(stack.getCount() + consumeCount);
    else if (!result.isWild) { this.scene.showMessage(`${this.getTypeLabel(result.isWild ? this.getNextRequiredType() : stack.type)} +${consumeCount}`, 0x87CEEB); this.scene.playSuccessSound(); }
  }
  
  isComplete() { return this.requirements.every(req => (this.deliveredCounts[req.type] || 0) >= req.count); }
  
  completeOrder(totalCards) {
    this.completed = true;
    const bgColor = this.type === "urgent" ? 0xFFE4E1 : 0xFFF8DC;
    this.bg.setFillStyle(0x90EE90);
    if (this.timerEvent) this.timerEvent.remove();
    
    let reward = this.baseReward;
    let isPerfect = false;
    let overflowBonus = 0;
    
    // M7: Perfect bonus (exactly 10 cards)
    if (totalCards === 10) { isPerfect = true; reward = Math.floor(reward * 1.2); }
    // M8: Overflow penalty
    else if (totalCards > 10) overflowBonus = (totalCards - 10) * 3;
    
    // M11: Urgent order 1.5x reward
    if (this.type === "urgent") {
      reward = Math.floor(reward * 1.5);
    }
    
    const totalReward = reward + overflowBonus;
    let msg = `订单完成! +${totalReward}福来币`;
    if (isPerfect) msg += " (完美!)";
    if (overflowBonus > 0) msg += ` 超额+${overflowBonus}`;
    if (this.type === "urgent") msg += " (紧急!)";
    this.scene.showMessage(msg, 0x00FF00);
    this.scene.addCoins(totalReward);
    this.scene.playOrderCompleteSound();
    this.scene.onOrderCompleted(this, { isPerfect, totalReward });
  }
  
  // M11: Update urgent order timer
  updateTimer() {
    if (!this.timeLimit || this.completed) return;
    this.timeRemaining--;
    if (this.timerText) {
      this.timerText.setText(`⏱️ ${this.timeRemaining}s`);
      // Flash red when low on time
      if (this.timeRemaining <= 10) {
        this.timerText.setColor(this.timeRemaining % 2 === 0 ? "#FF0000" : "#FFFFFF");
      }
    }
    
    if (this.timeRemaining <= 0) {
      this.failOrder();
    }
  }
  
  // M11: Urgent order timeout
  failOrder() {
    this.completed = true;
    this.bg.setFillStyle(0xCCCCCC);
    if (this.timerEvent) this.timerEvent.remove();
    this.scene.showMessage("⏱️ 订单超时!", 0xFF6666);
    
    // Replace with new order after delay
    this.scene.time.delayedCall(2000, () => {
      this.container.destroy();
      const idx = this.scene.orders.indexOf(this);
      const types = ["candy", "dumpling", "lantern", "redpacket"];
      const type = types[Math.floor(Math.random() * types.length)];
      this.scene.orders[idx] = new Order(this.scene, this.container.x, 85, {
        id: Date.now(), type: "simple", requirements: [{ type, count: 3 + Math.floor(this.scene.level / 2) }], reward: 100 + this.scene.level * 10
      });
    });
  }

  highlight() { this.bg.setStrokeStyle(4, 0x00FF00); }
  clearHighlight() { if (!this.completed) this.bg.setStrokeStyle(2, 0x8B4513); }
}

// ===== BootScene =====
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
    // Power card back
    const pg = this.add.graphics();
    pg.fillStyle(0x4B0082, 1); pg.fillRoundedRect(0, 0, 60, 80, 8);
    pg.lineStyle(3, 0xFFD700, 1); pg.strokeRoundedRect(0, 0, 60, 80, 8);
    pg.generateTexture('cardback', 60, 80);
    this.scene.start('MenuScene');
  }
};

// ===== MenuScene (P1 Updated with stamina display) =====
const MenuScene = class extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  create() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x8B0000, 0x8B0000, 0x4A0000, 0x4A0000, 1); g.fillRect(0, 0, width, height);
    
    const title = this.add.text(width/2, height/3 - 30, '办年货', { fontFamily: 'Arial', fontSize: '72px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: { from: 1, to: 1.05 }, duration: 1000, yoyo: true, repeat: -1 });
    this.add.text(width/2, height/3 + 50, 'Card Master', { fontSize: '32px', color: '#FFA500' }).setOrigin(0.5);
    this.add.text(width/2, height/3 + 100, '🧧 P1版本 - 关卡系统+功能卡', { fontSize: '16px', color: '#FFFFFF' }).setOrigin(0.5);
    
    // M4: Show stamina
    const stamina = ProgressManager.getStamina();
    const staminaText = this.add.text(width/2, height/3 + 140, `⚡ 体力: ${stamina}/20`, { fontSize: '18px', color: stamina > 0 ? '#00FF00' : '#FF0000' }).setOrigin(0.5);
    
    // M5: Show power card hints
    this.add.text(width/2, height - 80, '功能卡: ★万能 ↻刷新 ↶撤销', { fontSize: '14px', color: '#CCCCCC' }).setOrigin(0.5);
    
    this.createButton(width/2, height * 0.55, '开始游戏', () => {
      if (!ProgressManager.useStamina()) {
        this.showMessage('体力不足! (每6分钟恢复1点)', 0xFF0000);
        return;
      }
      this.scene.start('GameScene', { level: 1, fromMenu: true });
    });
    
    this.createButton(width/2, height * 0.68, '选择关卡', () => {
      this.scene.start('LevelSelectScene');
    });
    
    this.createButton(width/2, height * 0.81, '游戏规则', () => this.showRules());
    
    // Update stamina display every 10 seconds
    this.time.addEvent({ delay: 10000, callback: () => {
      const newStamina = ProgressManager.getStamina();
      staminaText.setText(`⚡ 体力: ${newStamina}/20`).setColor(newStamina > 0 ? '#00FF00' : '#FF0000');
    }, loop: true });
  }
  
  createButton(x, y, text, callback) {
    const btn = this.add.rectangle(x, y, 220, 55, 0x228B22).setInteractive({ useHandCursor: true });
    this.add.text(x, y, text, { fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerover', () => { btn.setFillStyle(0x2E8B57); btn.setScale(1.05); });
    btn.on('pointerout', () => { btn.setFillStyle(0x228B22); btn.setScale(1); });
    btn.on('pointerdown', callback);
  }
  
  showRules() {
    const overlay = this.add.rectangle(400, 300, 740, 540, 0x000000, 0.95);
    this.add.text(400, 60, '📜 游戏规则 (P1完整版)', { fontSize: '24px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    
    const rules = [
      '【核心玩法】',
      '• 点击牌堆拿牌，同类型自动堆叠',
      '• 选中堆叠后点击订单交付',
      '• 复合订单必须先完成A再完成B',
      '',
      '【M4 关卡系统】',
      '• 共12关，完成解锁下一关',
      '• 每关根据完成速度评1-3星',
      '• 每关消耗1点体力',
      '',
      '【M5 功能卡】',
      '• ★万能卡: 可当任意卡牌使用',
      '• ↻刷新卡: 点击重新洗牌',
      '• ↶撤销卡: 撤销上一步操作'
    ];
    
    rules.forEach((rule, i) => {
      const color = rule.startsWith('【') ? '#FFD700' : '#FFFFFF';
      this.add.text(400, 100 + i * 24, rule, { fontSize: '13px', color: color }).setOrigin(0.5);
    });
    
    const closeBtn = this.add.rectangle(400, 480, 120, 40, 0xDC143C).setInteractive({ useHandCursor: true });
    this.add.text(400, 480, '关闭', { fontSize: '18px', color: '#FFF' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => overlay.destroy());
  }
  
  // M10: Show hint - highlight valid card stacks and orders
  showHint() {
    let hintFound = false;
    
    // Check each stack against each order
    for (const [type, stack] of Object.entries(this.stacks)) {
      for (const order of this.orders) {
        if (!order.completed) {
          const result = order.canAcceptStack(stack);
          if (result.canAccept) {
            // Highlight this stack
            stack.select();
            order.highlight();
            hintFound = true;
            
            // Auto deselect after 2 seconds
            this.time.delayedCall(2000, () => {
              stack.deselect();
              order.clearHighlight();
              if (this.selectedStack === stack) this.selectedStack = null;
            });
            
            this.showMessage(`💡 提示: 选中${order.getTypeLabel(type)}堆叠，点击上方订单交付`, 0xFFD700);
            return;
          }
        }
      }
    }
    
    if (!hintFound) {
      if (this.boardCards.length > 0) {
        this.showMessage("💡 提示: 没有可交付的堆叠，尝试拿更多牌", 0xFFD700);
      } else {
        this.showMessage("💡 提示: 牌堆已空，尝试使用刷新卡或撤销", 0xFFD700);
      }
    }
  }

  showMessage(text, color) {
    const msg = this.add.text(400, 400, text, { fontSize: '18px', color: '#FFFFFF', backgroundColor: color.toString(16).padStart(6, '0'), padding: { x: 15, y: 8 } }).setOrigin(0.5);
    this.time.delayedCall(2000, () => msg.destroy());
  }
};

// ===== LevelSelectScene (M4) =====
const LevelSelectScene = class extends Phaser.Scene {
  constructor() { super('LevelSelectScene'); }
  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width/2, height/2, width, height, 0x8B0000);
    
    this.add.text(width/2, 50, '选择关卡', { fontSize: '40px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    
    // Show stamina
    const stamina = ProgressManager.getStamina();
    const staminaText = this.add.text(width/2, 100, `⚡ 体力: ${stamina}/20`, { fontSize: '18px', color: stamina > 0 ? '#00FF00' : '#FF6600' }).setOrigin(0.5);
    
    const progress = ProgressManager.getProgress();
    
    // Create 12 level buttons (3x4 grid)
    for (let i = 1; i <= 12; i++) {
      const col = (i - 1) % 4;
      const row = Math.floor((i - 1) / 4);
      const x = 140 + col * 170;
      const y = 160 + row * 120;
      
      const isUnlocked = i <= progress.unlocked;
      const isCurrent = i === progress.current;
      const stars = progress.stars[i] || 0;
      
      this.createLevelButton(x, y, i, isUnlocked, isCurrent, stars);
    }
    
    // Back button
    const backBtn = this.add.rectangle(100, 550, 100, 40, 0x4169E1).setInteractive({ useHandCursor: true });
    this.add.text(100, 550, '← 返回', { fontSize: '16px', color: '#FFF' }).setOrigin(0.5);
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    
    // Refresh stamina periodically
    this.time.addEvent({ delay: 10000, callback: () => {
      staminaText.setText(`⚡ 体力: ${ProgressManager.getStamina()}/20`);
    }, loop: true });
  }
  
  createLevelButton(x, y, level, unlocked, current, stars) {
    const bgColor = unlocked ? (current ? 0xFFD700 : 0x228B22) : 0x666666;
    const btn = this.add.rectangle(x, y, 140, 100, bgColor).setInteractive(unlocked ? { useHandCursor: true } : false);
    
    this.add.text(x, y - 30, `第${level}关`, { fontSize: '20px', color: unlocked ? '#FFF' : '#999', fontStyle: 'bold' }).setOrigin(0.5);
    
    if (unlocked && stars > 0) {
      const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      this.add.text(x, y + 5, starStr, { fontSize: '14px' }).setOrigin(0.5);
    }
    
    if (!unlocked) {
      this.add.text(x, y + 10, '🔒', { fontSize: '24px' }).setOrigin(0.5);
    }
    
    if (unlocked) {
      btn.on('pointerover', () => btn.setFillStyle(0x2E8B57));
      btn.on('pointerout', () => btn.setFillStyle(bgColor));
      btn.on('pointerdown', () => {
        if (!ProgressManager.useStamina()) {
          this.showMessage('体力不足!', 0xFF0000);
          return;
        }
        this.scene.start('GameScene', { level, fromMenu: true });
      });
    }
  }
  
  // M10: Show hint - highlight valid card stacks and orders
  showHint() {
    let hintFound = false;
    
    // Check each stack against each order
    for (const [type, stack] of Object.entries(this.stacks)) {
      for (const order of this.orders) {
        if (!order.completed) {
          const result = order.canAcceptStack(stack);
          if (result.canAccept) {
            // Highlight this stack
            stack.select();
            order.highlight();
            hintFound = true;
            
            // Auto deselect after 2 seconds
            this.time.delayedCall(2000, () => {
              stack.deselect();
              order.clearHighlight();
              if (this.selectedStack === stack) this.selectedStack = null;
            });
            
            this.showMessage(`💡 提示: 选中${order.getTypeLabel(type)}堆叠，点击上方订单交付`, 0xFFD700);
            return;
          }
        }
      }
    }
    
    if (!hintFound) {
      if (this.boardCards.length > 0) {
        this.showMessage("💡 提示: 没有可交付的堆叠，尝试拿更多牌", 0xFFD700);
      } else {
        this.showMessage("💡 提示: 牌堆已空，尝试使用刷新卡或撤销", 0xFFD700);
      }
    }
  }

  showMessage(text, color) {
    const msg = this.add.text(400, 520, text, { fontSize: '18px', color: '#FFFFFF', backgroundColor: color.toString(16).padStart(6, '0'), padding: { x: 10, y: 5 } }).setOrigin(0.5);
    this.time.delayedCall(2000, () => msg.destroy());
  }
};

// ===== GameScene (P0 + M4 + M5) =====
const GameScene = class extends Phaser.Scene {
  constructor() { super('GameScene'); }
  
  init(data) {
    this.level = data.level || 1;
    this.fromMenu = data.fromMenu || false;
    this.coins = 0;
    this.stamina = data.stamina || 20;
    this.boardCards = [];
    this.stacks = {};
    this.orders = [];
    this.selectedStack = null;
    this.targetOrders = 3 + Math.floor(this.level / 3);
    this.completedOrders = 0;
    this.startTime = Date.now();
    this.undoManager = new UndoManager();
    
    // M6: Combo system
    this.comboCount = 0;
    this.lastOrderTime = 0;
    this.comboText = null;
  }
  
  create() {
    this.createBackground();
    this.createUI();
    this.generateCards(); // M5: includes power cards
    this.createOrders();
  }
  
  createBackground() {
    const g = this.add.graphics();
    g.fillStyle(0xDEB887, 1); g.fillRect(0, 0, 800, 600);
    g.fillStyle(0xCD853F, 0.3); for (let x = 0; x < 800; x += 40) g.fillRect(x, 0, 20, 600);
  }
  
  createUI() {
    this.add.rectangle(400, 75, 780, 140, 0x8B4513, 0.9);
    this.add.text(20, 15, '📋 订单区', { fontSize: '14px', color: '#FFD700', fontStyle: 'bold' });
    this.add.rectangle(400, 520, 780, 140, 0x2F4F4F, 0.9);
    this.add.text(20, 455, '🎴 堆叠区', { fontSize: '12px', color: '#FFFFFF' });
    
    this.add.text(20, 15, `第${this.level}关`, { fontSize: '18px', color: '#FFD700', fontStyle: 'bold' });
    this.coinText = this.add.text(180, 15, `福来币: ${this.coins}`, { fontSize: '16px', color: '#FFD700' });
    this.progressText = this.add.text(350, 15, `进度: 0/${this.targetOrders}`, { fontSize: '14px', color: '#FFFFFF' });
    
    // Timer display
    this.timerText = this.add.text(520, 15, "⏱️ 00:00", { fontSize: "14px", color: "#FFFFFF" });
    
    // M6: Combo display
    this.comboText = this.add.text(400, 200, "", { fontSize: "36px", color: "#FFD700", fontStyle: "bold", stroke: "#FF6600", strokeThickness: 4 }).setOrigin(0.5).setVisible(false).setDepth(1000);
    this.time.addEvent({ delay: 1000, callback: () => this.updateTimer(), loop: true });
    
    // Draw pile
    this.drawPileArea = this.add.rectangle(720, 300, 90, 120, 0x654321).setInteractive({ useHandCursor: true });
    this.add.text(720, 280, '📦', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(720, 320, '牌堆', { fontSize: '14px', color: '#FFFFFF' }).setOrigin(0.5);
    this.cardCountText = this.add.text(720, 350, '0张', { fontSize: '12px', color: '#FFD700' }).setOrigin(0.5);
    this.drawPileArea.on('pointerdown', () => this.drawCard());
    
    // M5: Power card buttons
    this.createPowerButtons();
    
    // Deselect button
    const deselectBtn = this.add.rectangle(720, 480, 85, 30, 0xDC143C).setInteractive({ useHandCursor: true });
    this.add.text(720, 480, '取消', { fontSize: '11px', color: '#FFF' }).setOrigin(0.5);
    deselectBtn.on('pointerdown', () => this.deselectAll());
    
    // Menu button
    const menuBtn = this.add.rectangle(720, 530, 80, 30, 0x666666).setInteractive({ useHandCursor: true });
    this.add.text(720, 530, '菜单', { fontSize: '12px', color: '#FFF' }).setOrigin(0.5);
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
  
  createPowerButtons() {
    // M5: Refresh button
    const refreshBtn = this.add.rectangle(620, 480, 80, 30, 0x00CED1).setInteractive({ useHandCursor: true });
    this.add.text(620, 480, "↻ 刷新", { fontSize: "11px", color: "#000" }).setOrigin(0.5);
    refreshBtn.on("pointerdown", () => this.refreshBoard());
    
    // M5: Undo button
    const undoBtn = this.add.rectangle(530, 480, 80, 30, 0x9370DB).setInteractive({ useHandCursor: true });
    this.undoBtnText = this.add.text(530, 480, "↶ 撤销", { fontSize: "11px", color: "#FFF" }).setOrigin(0.5);
    undoBtn.on("pointerdown", () => this.undoAction());
    
    // M10: Hint button
    const hintBtn = this.add.rectangle(440, 480, 80, 30, 0xFFD700).setInteractive({ useHandCursor: true });
    this.add.text(440, 480, "💡 提示", { fontSize: "11px", color: "#000" }).setOrigin(0.5);
    hintBtn.on("pointerdown", () => this.showHint());
  }
  
  updateTimer() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    this.timerText.setText(`⏱️ ${mins}:${secs}`);
  }
  
  // M5: Generate cards with power cards
  generateCards() {
    const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
    const count = 40 + this.level * 5;
    
    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      if (rand < 0.05) {
        // 5% chance for power cards
        const powerTypes = ['wild', 'refresh', 'undo'];
        const powerType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
        this.boardCards.push({ type: powerType, isPower: true, powerType });
      } else {
        this.boardCards.push({ type: types[Math.floor(Math.random() * types.length)], isPower: false });
      }
    }
    this.updateCardCount();
  }
  
  createOrders() {
    // Generate orders based on level
    const types = ["candy", "dumpling", "lantern", "redpacket"];
    for (let i = 0; i < 3; i++) {
      const x = 130 + i * 230;
      let orderType = "simple";
      let requirements = [];
      let reward = 100 + this.level * 10;
      let timeLimit = null;
      
      // M11: Urgent orders appear at level 4+ with 20% chance
      if (this.level >= 4 && i === 1 && Math.random() < 0.3) {
        orderType = "urgent";
        const t = types[i % types.length];
        requirements = [{ type: t, count: 5 }];
        timeLimit = 30;  // 30 seconds
        reward = Math.floor(reward * 1.2);  // Higher base reward
      } else if (this.level > 2 && i === 1) {
        // Composite order
        orderType = "composite";
        const t1 = types[i % types.length];
        const t2 = types[(i + 1) % types.length];
        requirements = [{ type: t1, count: 3 }, { type: t2, count: 3 }];
      } else {
        // Simple order
        const t = types[i % types.length];
        const count = 3 + Math.floor(this.level / 2);
        requirements = [{ type: t, count }];
      }
      
      this.orders.push(new Order(this, x, 85, { id: i, type: orderType, requirements, reward, timeLimit }));
    }
  }
  
  drawCard() {
    if (Object.keys(this.stacks).length >= 10) {
      this.showMessage('堆叠区已满!', 0xFF0000); this.playErrorSound(); return;
    }
    if (this.boardCards.length === 0) { this.showMessage('牌堆已空!', 0xFF0000); return; }
    
    const cardData = this.boardCards.pop();
    let card;
    
    if (cardData.isPower) {
      // M5: Power card
      card = new Card(this, cardData.type, Date.now(), true, cardData.powerType);
      // Power cards are special stacks
      if (cardData.powerType === 'refresh') {
        this.useRefreshCard(card);
        return;
      } else if (cardData.powerType === 'undo') {
        this.useUndoCard(card);
        return;
      }
    } else {
      card = new Card(this, cardData.type, Date.now());
    }
    
    // Record action for undo
    this.undoManager.push({
      type: 'draw',
      cardType: cardData.type,
      isPower: cardData.isPower,
      undo: (scene) => {
        scene.boardCards.push(cardData);
        scene.updateCardCount();
        // Remove the drawn card/stack
        if (scene.stacks[cardData.type]) {
          const stack = scene.stacks[cardData.type];
          if (stack.getCount() <= 1) {
            delete scene.stacks[cardData.type];
            stack.destroy();
          } else {
            stack.removeCards(1);
          }
        }
      }
    });
    
    if (this.stacks[card.type]) {
      if (!this.stacks[card.type].addCard(card)) this.createNewStack(card);
    } else this.createNewStack(card);
    
    this.updateCardCount();
    this.playDrawSound();
  }
  
  createNewStack(card) {
    const count = Object.keys(this.stacks).length;
    const stack = new CardStack(this, card.type, 120 + (count % 5) * 110, 480 + Math.floor(count / 5) * 70);
    stack.addCard(card);
    this.stacks[card.type] = stack;
  }
  
  // M5: Refresh card effect
  useRefreshCard(card) {
    this.showMessage('↻ 刷新卡! 重新洗牌', 0x00CED1);
    this.boardCards.sort(() => Math.random() - 0.5);
    card.destroy();
    this.playSuccessSound();
  }
  
  // M5: Undo card effect
  useUndoCard(card) {
    if (this.undoManager.undo(this)) {
      this.showMessage('↶ 撤销卡! 已撤销', 0x9370DB);
    } else {
      this.showMessage('没有可撤销的操作', 0xFF6600);
    }
    card.destroy();
    this.playSuccessSound();
  }
  
  // M5: Manual refresh (stamina cost)
  refreshBoard() {
    if (this.stamina < 1) { this.showMessage('体力不足!', 0xFF0000); return; }
    this.stamina--;
    this.boardCards.sort(() => Math.random() - 0.5);
    this.showMessage('↻ 已刷新牌堆 (-1体力)', 0x00CED1);
    this.playDrawSound();
  }
  
  // M5: Manual undo
  undoAction() {
    if (this.undoManager.undo(this)) {
      this.showMessage('↶ 已撤销', 0x9370DB);
      this.playSuccessSound();
    } else {
      this.showMessage('没有可撤销的操作', 0xFF6600);
      this.playErrorSound();
    }
  }
  
  deselectAll() { if (this.selectedStack) { this.selectedStack.deselect(); this.selectedStack = null; } this.clearOrderHighlights(); }
  highlightValidOrders(cardType) { this.orders.forEach(order => { if (order.canAcceptStack({ type: cardType, getCount: () => 1 }).canAccept) order.highlight(); }); }
  clearOrderHighlights() { this.orders.forEach(order => order.clearHighlight()); }
  
  onOrderCompleted(order, data) {
    this.completedOrders++;
    this.progressText.setText(`进度: ${this.completedOrders}/${this.targetOrders}`);
    
    // M6: Combo system - check if within 5 seconds
    const now = Date.now();
    if (now - this.lastOrderTime < 5000) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.lastOrderTime = now;
    
    // Calculate combo bonus
    let comboBonus = 0;
    if (this.comboCount > 1) {
      comboBonus = Math.floor(data.totalReward * 0.1 * (this.comboCount - 1));
      this.showComboAnimation();
    }
    
    if (comboBonus > 0) {
      this.addCoins(comboBonus);
      this.showMessage(`${this.comboCount}连击! +${comboBonus}奖励`, 0xFFD700);
    }
    
    if (this.completedOrders >= this.targetOrders) {
      this.completeLevel();
    } else {
      this.time.delayedCall(1000, () => {
        order.container.destroy();
        const idx = this.orders.indexOf(order);
        const types = ["candy", "dumpling", "lantern", "redpacket"];
        const type = types[Math.floor(Math.random() * types.length)];
        this.orders[idx] = new Order(this, order.container.x, 85, { id: Date.now(), type: "simple", requirements: [{ type, count: 3 + Math.floor(this.level / 2) }], reward: 100 + this.level * 10 });
      });
    }
  }
  
  completeLevel() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    let stars = 1;
    const baseTime = 60 + this.level * 20;
    if (elapsed < baseTime * 0.5) stars = 3;
    else if (elapsed < baseTime * 0.8) stars = 2;
    
    ProgressManager.completeLevel(this.level, stars);
    
    // M12: Enhanced level completion screen
    this.showCompletionScreen(elapsed, stars);
  }
  
  // M12: Show fancy completion screen
  showCompletionScreen(elapsed, stars) {
    // Dark overlay
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8).setDepth(2000);
    
    // Success panel
    const panel = this.add.rectangle(400, 300, 450, 350, 0x8B4513).setStrokeStyle(4, 0xFFD700).setDepth(2001);
    
    // Title with animation
    const title = this.add.text(400, 160, "🎉 关卡完成!", { fontSize: "36px", color: "#FFD700", fontStyle: "bold" }).setOrigin(0.5).setDepth(2002);
    
    // Star animation
    const starContainer = this.add.container(400, 220).setDepth(2002);
    for (let i = 0; i < 3; i++) {
      const star = this.add.text(400 + (i - 1) * 50, 220, "⭐", { fontSize: "40px" }).setOrigin(0.5).setAlpha(i < stars ? 1 : 0.3).setScale(0).setDepth(2002);
      this.tweens.add({
        targets: star,
        scale: i < stars ? 1.2 : 0.8,
        duration: 500,
        delay: i * 200,
        ease: "Back.easeOut"
      });
    }
    
    // Stats
    this.add.text(400, 270, `用时: ${Math.floor(elapsed)}秒`, { fontSize: "18px", color: "#FFFFFF" }).setOrigin(0.5).setDepth(2002);
    this.add.text(400, 300, `获得福来币: ${this.coins}`, { fontSize: "20px", color: "#FFD700" }).setOrigin(0.5).setDepth(2002);
    this.add.text(400, 330, `连击最高: ${this.comboCount}次`, { fontSize: "16px", color: "#AAAAAA" }).setOrigin(0.5).setDepth(2002);
    
    // Buttons
    const nextBtn = this.add.rectangle(320, 400, 130, 45, 0x228B22).setInteractive({ useHandCursor: true }).setDepth(2002);
    this.add.text(320, 400, "下一关 ▶", { fontSize: "16px", color: "#FFF", fontStyle: "bold" }).setOrigin(0.5).setDepth(2002);
    nextBtn.on("pointerdown", () => {
      if (!ProgressManager.useStamina()) { this.showMessage("体力不足!", 0xFF0000); return; }
      this.scene.start("GameScene", { level: this.level + 1, fromMenu: true });
    });
    
    const menuBtn = this.add.rectangle(480, 400, 130, 45, 0x4169E1).setInteractive({ useHandCursor: true }).setDepth(2002);
    this.add.text(480, 400, "🏠 主菜单", { fontSize: "16px", color: "#FFF", fontStyle: "bold" }).setOrigin(0.5).setDepth(2002);
    menuBtn.on("pointerdown", () => this.scene.start("MenuScene"));
    
    // Confetti effect
    this.createConfetti();
  }
  
  // M12: Confetti celebration effect
  createConfetti() {
    const colors = [0xFF0000, 0xFFD700, 0x00FF00, 0x00CED1, 0xFF69B4];
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(100, 700);
      const y = Phaser.Math.Between(50, 200);
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      const confetti = this.add.rectangle(x, y, 8, 8, color).setDepth(1999);
      
      this.tweens.add({
        targets: confetti,
        y: y + Phaser.Math.Between(200, 400),
        x: x + Phaser.Math.Between(-100, 100),
        rotation: Phaser.Math.Between(0, 360),
        duration: Phaser.Math.Between(1500, 2500),
        ease: "Power2",
        onComplete: () => confetti.destroy()
      });
    }
  }
  
  // M6: Show combo animation
  showComboAnimation() {
    if (!this.comboText) return;
    this.comboText.setText(`${this.comboCount}连击!`).setVisible(true).setAlpha(1).setScale(0.5);
    this.tweens.add({
      targets: this.comboText,
      scale: 1.5,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: this.comboText,
          y: 150,
          alpha: 0,
          duration: 800,
          onComplete: () => {
            this.comboText.setVisible(false).setY(200);
          }
        });
      }
    });
  }

  addCoins(amount) { this.coins += amount; this.coinText.setText(`福来币: ${this.coins}`); }
  updateCardCount() { this.cardCountText.setText(`${this.boardCards.length}张`); }
  // M10: Show hint - highlight valid card stacks and orders
  showHint() {
    let hintFound = false;
    
    // Check each stack against each order
    for (const [type, stack] of Object.entries(this.stacks)) {
      for (const order of this.orders) {
        if (!order.completed) {
          const result = order.canAcceptStack(stack);
          if (result.canAccept) {
            // Highlight this stack
            stack.select();
            order.highlight();
            hintFound = true;
            
            // Auto deselect after 2 seconds
            this.time.delayedCall(2000, () => {
              stack.deselect();
              order.clearHighlight();
              if (this.selectedStack === stack) this.selectedStack = null;
            });
            
            this.showMessage(`💡 提示: 选中${order.getTypeLabel(type)}堆叠，点击上方订单交付`, 0xFFD700);
            return;
          }
        }
      }
    }
    
    if (!hintFound) {
      if (this.boardCards.length > 0) {
        this.showMessage("💡 提示: 没有可交付的堆叠，尝试拿更多牌", 0xFFD700);
      } else {
        this.showMessage("💡 提示: 牌堆已空，尝试使用刷新卡或撤销", 0xFFD700);
      }
    }
  }

  showMessage(text, color) {
    const msg = this.add.text(400, 280, text, { fontSize: '18px', color: '#FFFFFF', backgroundColor: color.toString(16).padStart(6, '0'), padding: { x: 10, y: 5 } }).setOrigin(0.5);
    this.tweens.add({ targets: msg, y: 230, alpha: 0, duration: 1500, onComplete: () => msg.destroy() });
  }
  
  playClickSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(800, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.05); } catch(e) {} }
  playErrorSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.15); } catch(e) {} }
  playSuccessSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); } catch(e) {} }
  playOrderCompleteSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); [523.25, 659.25, 783.99].forEach((freq, i) => { const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1); osc.connect(ctx.destination); osc.start(ctx.currentTime + i * 0.1); osc.stop(ctx.currentTime + i * 0.1 + 0.2); }); } catch(e) {} }
  playDrawSound() { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1); } catch(e) {} }
};

const config = { type: Phaser.AUTO, parent: 'game-container', width: 800, height: 600, backgroundColor: '#8B4513', scene: [BootScene, MenuScene, LevelSelectScene, GameScene], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } };
new Phaser.Game(config);
