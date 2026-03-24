// ============================================
// DS17 - 办年货 Card Master v2.0
// 三槽机制改版 - T1+T2 重构UI + Slot类
// ============================================

// ===== Slot Class (T2) =====
class Slot {
  constructor(scene, id, x, y) {
    this.scene = scene;
    this.id = id;
    this.x = x;
    this.y = y;
    this.cards = []; // 从底到顶
    this.maxCards = 15;
    this.isSelected = false;
    
    // 创建容器
    this.container = scene.add.container(x, y);
    
    // 槽背景（空槽时显示虚线）
    this.bg = scene.add.rectangle(0, 0, 160, 200, 0x8B4513, 0.3)
      .setStrokeStyle(2, 0x8B4513);
    this.container.add(this.bg);
    
    // 空槽提示
    this.emptyText = scene.add.text(0, 0, '空', {
      fontSize: '24px', color: '#666666', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(this.emptyText);
    
    // 顶部类型图标（大）
    this.typeIcon = scene.add.text(0, -50, '', {
      fontSize: '48px'
    }).setOrigin(0.5).setVisible(false);
    this.container.add(this.typeIcon);
    
    // 数量显示
    this.countText = scene.add.text(0, 10, '', {
      fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold',
      backgroundColor: '#8B0000', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setVisible(false);
    this.container.add(this.countText);
    
    // 进度条背景
    this.progressBg = scene.add.rectangle(0, 50, 120, 12, 0x333333)
      .setVisible(false);
    this.container.add(this.progressBg);
    
    // 进度条
    this.progressBar = scene.add.rectangle(-60, 50, 0, 10, 0x00FF00)
      .setOrigin(0, 0.5).setVisible(false);
    this.container.add(this.progressBar);
    
    // 选中高亮框
    this.highlightRect = scene.add.rectangle(0, 0, 170, 210, 0x00FF00, 0)
      .setStrokeStyle(4, 0x00FF00).setVisible(false);
    this.container.add(this.highlightRect);
    
    // 点击区域
    this.hitArea = scene.add.rectangle(0, 0, 160, 200, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.container.add(this.hitArea);
    
    // 事件
    this.hitArea.on('pointerdown', () => this.onClick());
    this.hitArea.on('pointerover', () => this.onHover(true));
    this.hitArea.on('pointerout', () => this.onHover(false));
  }
  
  // 判断是否为空槽
  isEmpty() {
    return this.cards.length === 0;
  }
  
  // 获取顶部卡牌类型
  getTopType() {
    if (this.isEmpty()) return null;
    return this.cards[this.cards.length - 1].type;
  }
  
  // 获取顶部连续同类型数量
  getTopCount() {
    if (this.isEmpty()) return 0;
    const topType = this.getTopType();
    let count = 0;
    for (let i = this.cards.length - 1; i >= 0; i--) {
      if (this.cards[i].type === topType) count++;
      else break;
    }
    return count;
  }
  
  // 检查是否可以接收某类型
  canReceive(type) {
    if (this.isEmpty()) return true; // 空槽可接收任意类型
    return this.getTopType() === type; // 非空槽需类型匹配
  }
  
  // 添加卡牌
  addCards(cards) {
    const availableSpace = this.maxCards - this.cards.length;
    if (availableSpace <= 0) return false;
    
    const toAdd = cards.slice(0, availableSpace);
    this.cards.push(...toAdd);
    this.updateVisuals();
    return true;
  }
  
  // 移除顶部N张
  removeTop(n) {
    const count = Math.min(n, this.getTopCount());
    const removed = [];
    for (let i = 0; i < count; i++) {
      removed.push(this.cards.pop());
    }
    this.updateVisuals();
    return removed;
  }
  
  // 更新视觉
  updateVisuals() {
    if (this.isEmpty()) {
      // 空槽状态
      this.emptyText.setVisible(true);
      this.typeIcon.setVisible(false);
      this.countText.setVisible(false);
      this.progressBg.setVisible(false);
      this.progressBar.setVisible(false);
      this.bg.setStrokeStyle(2, 0x666666).setFillStyle(0x8B4513, 0.1);
    } else {
      // 非空槽状态
      this.emptyText.setVisible(false);
      this.typeIcon.setVisible(true);
      this.countText.setVisible(true);
      this.progressBg.setVisible(true);
      this.progressBar.setVisible(true);
      this.bg.setStrokeStyle(2, 0x8B4513).setFillStyle(0x8B4513, 0.3);
      
      const topType = this.getTopType();
      const topCount = this.getTopCount();
      const totalCount = this.cards.length;
      
      // 类型图标
      const icons = {
        candy: '🍬', dumpling: '🥟', lantern: '🏮', redpacket: '🧧',
        firecracker: '🧨', couplet: '📜', fu: '福', cake: '🥮'
      };
      this.typeIcon.setText(icons[topType] || topType);
      
      // 数量显示（顶部数量 / 总数量）
      this.countText.setText(`${topCount}/${totalCount}`);
      
      // 进度条（总数量 / 上限15）
      const progress = totalCount / this.maxCards;
      this.progressBar.width = 120 * progress;
      
      // 满槽警告色
      if (totalCount >= 15) {
        this.progressBar.setFillStyle(0xFF0000);
        this.countText.setBackgroundColor('#FF0000');
      } else if (totalCount >= 12) {
        this.progressBar.setFillStyle(0xFFAA00);
        this.countText.setBackgroundColor('#FFAA00');
      } else {
        this.progressBar.setFillStyle(0x00FF00);
        this.countText.setBackgroundColor('#8B0000');
      }
      
      // 渲染卡牌堆叠视觉
      this.renderCardStack();
    }
  }
  
  // 渲染卡牌堆叠（简化版，显示堆叠效果）
  renderCardStack() {
    // 清除旧的卡牌精灵
    if (this.cardSprites) {
      this.cardSprites.forEach(s => s.destroy());
    }
    this.cardSprites = [];
    
    // 只显示顶部几张（避免过多渲染）
    const displayCount = Math.min(5, this.cards.length);
    for (let i = 0; i < displayCount; i++) {
      const cardIndex = this.cards.length - displayCount + i;
      const card = this.cards[cardIndex];
      const offsetY = -30 - (i * 8);
      const scale = 0.6 - (i * 0.05);
      
      const sprite = this.scene.add.sprite(0, offsetY, card.type + '_full')
        .setScale(scale)
        .setAlpha(1 - (i * 0.1));
      this.container.add(sprite);
      this.cardSprites.push(sprite);
    }
  }
  
  // 点击事件
  onClick() {
    this.scene.onSlotClicked(this);
  }
  
  // 悬停效果
  onHover(hovering) {
    if (this.isSelected) return;
    this.container.setScale(hovering ? 1.02 : 1);
  }
  
  // 选中/取消选中
  select() {
    this.isSelected = true;
    this.highlightRect.setVisible(true);
    this.container.setDepth(100);
  }
  
  deselect() {
    this.isSelected = false;
    this.highlightRect.setVisible(false);
    this.container.setDepth(1);
  }
  
  // 移动到另一个槽（T5功能）
  moveTopTo(targetSlot) {
    if (this.isEmpty()) return { success: false, reason: '源槽为空' };
    
    const topType = this.getTopType();
    const topCount = this.getTopCount();
    
    if (!targetSlot.canReceive(topType)) {
      return { success: false, reason: '类型不匹配' };
    }
    
    const targetSpace = targetSlot.maxCards - targetSlot.cards.length;
    if (targetSpace <= 0) {
      return { success: false, reason: '目标槽已满' };
    }
    
    const moveCount = Math.min(topCount, targetSpace);
    const cardsToMove = this.removeTop(moveCount);
    targetSlot.addCards(cardsToMove);
    
    return { success: true, movedCount: moveCount };
  }
  
  destroy() {
    if (this.cardSprites) this.cardSprites.forEach(s => s.destroy());
    this.container.destroy();
  }
}

// ===== Card Class =====
class Card {
  constructor(type) {
    this.type = type;
  }
}

// ===== BootScene =====
const BootScene = class extends Phaser.Scene {
  constructor() { super('BootScene'); }
  
  create() {
    // 创建卡牌纹理
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
      
      const text = this.add.text(30, 40, icon, { fontSize: '32px' }).setOrigin(0.5);
      const rt = this.add.renderTexture(0, 0, 60, 80);
      rt.draw(key, 0, 0);
      rt.draw(text, 30, 40);
      rt.saveTexture(key + '_full');
      text.destroy();
    });
    
    this.scene.start('MenuScene');
  }
};

// ===== MenuScene =====
const MenuScene = class extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  
  create() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x8B0000, 0x8B0000, 0x4A0000, 0x4A0000, 1);
    g.fillRect(0, 0, width, height);
    
    const title = this.add.text(width/2, height/3, '办年货 v2.0', {
      fontFamily: 'Arial', fontSize: '64px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: title, scale: { from: 1, to: 1.05 },
      duration: 1000, yoyo: true, repeat: -1
    });
    
    this.add.text(width/2, height/3 + 70, '三槽机制新版', {
      fontSize: '24px', color: '#FFA500'
    }).setOrigin(0.5);
    
    this.createButton(width/2, height * 0.6, '🎮 开始游戏', () => {
      this.scene.start('GameScene', { level: 1 });
    });
    
    this.createButton(width/2, height * 0.75, '📜 游戏规则', () => {
      this.showRules();
    });
  }
  
  createButton(x, y, text, callback) {
    const btn = this.add.rectangle(x, y, 240, 60, 0x228B22)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, text, {
      fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.on('pointerover', () => { btn.setFillStyle(0x2E8B57); btn.setScale(1.05); });
    btn.on('pointerout', () => { btn.setFillStyle(0x228B22); btn.setScale(1); });
    btn.on('pointerdown', callback);
  }
  
  showRules() {
    const overlay = this.add.rectangle(400, 300, 700, 500, 0x000000, 0.95);
    this.add.text(400, 80, '📜 v2.0 新规则', {
      fontSize: '28px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const rules = [
      '【核心玩法】',
      '• 3个卡槽，每槽最多15张牌',
      '• 点击📦发牌，每槽随机发1-5张',
      '• 点击槽选中，再点击另一槽移动牌',
      '• 空槽可放任意牌，非空槽需同类型',
      '• 选中槽点击订单交付',
      '',
      '【订单暂存】',
      '• 牌不够可部分交付，暂存订单上',
      '• 订单显示 "饺子 3/5" 等进度'
    ];
    
    rules.forEach((rule, i) => {
      const color = rule.startsWith('【') ? '#FFD700' : '#FFFFFF';
      this.add.text(400, 140 + i * 30, rule, {
        fontSize: '16px', color: color
      }).setOrigin(0.5);
    });
    
    const closeBtn = this.add.rectangle(400, 480, 120, 40, 0xDC143C)
      .setInteractive({ useHandCursor: true });
    this.add.text(400, 480, '关闭', { fontSize: '18px', color: '#FFF' }).setOrigin(0.5);
    closeBtn.on('pointerdown', () => overlay.destroy());
  }
};

// ===== GameScene v2.0 (T1+T2+T3+T4) =====
const GameScene = class extends Phaser.Scene {
  constructor() { super('GameScene'); }
  
  init(data) {
    this.level = data.level || 1;
    this.slots = []; // 3个卡槽
    this.selectedSlot = null;
    this.drawPile = []; // 牌堆
    this.orders = [];
    this.targetOrders = 3;
    this.completedOrders = 0;
  }
  
  create() {
    this.createBackground();
    this.createSlots(); // T1 + T2
    this.createOrders();
    this.createUI();
    this.dealInitialCards(); // T4
  }
  
  createBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x5D4037, 1); // 深木色背景
    g.fillRect(0, 0, 800, 600);
    
    // 木纹效果
    g.fillStyle(0x4E342E, 0.5);
    for (let x = 0; x < 800; x += 40) {
      g.fillRect(x, 0, 20, 600);
    }
  }
  
  // T1: 创建3个卡槽
  createSlots() {
    // 3槽水平居中排列
    const startX = 200;
    const spacing = 200;
    const y = 320;
    
    for (let i = 0; i < 3; i++) {
      const slot = new Slot(this, i, startX + i * spacing, y);
      this.slots.push(slot);
    }
  }
  
  // T4: 初始发10张牌
  dealInitialCards() {
    const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
    
    // 生成10张随机牌
    const initialCards = [];
    for (let i = 0; i < 10; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      initialCards.push(new Card(type));
    }
    
    // 分配到3个槽（不均匀分配）
    let cardIndex = 0;
    // 分配方案：例如 4, 3, 3
    const distribution = [4, 3, 3];
    
    for (let i = 0; i < 3; i++) {
      const count = distribution[i];
      const cardsForSlot = initialCards.slice(cardIndex, cardIndex + count);
      this.slots[i].addCards(cardsForSlot);
      cardIndex += count;
    }
    
    // 初始化剩余牌堆（40张）
    for (let i = 0; i < 40; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      this.drawPile.push(new Card(type));
    }
    
    this.updateDrawPileCount();
  }
  
  // T3: 批量发牌
  dealCards() {
    let anyDealt = false;
    
    for (const slot of this.slots) {
      if (slot.cards.length >= 15) continue; // 满槽跳过
      
      // 随机1-5张
      const dealCount = Phaser.Math.Between(1, 5);
      const availableSpace = 15 - slot.cards.length;
      const actualCount = Math.min(dealCount, availableSpace, this.drawPile.length);
      
      if (actualCount <= 0) continue;
      
      // 取牌
      const cardsToDeal = this.drawPile.splice(0, actualCount);
      slot.addCards(cardsToDeal);
      anyDealt = true;
      
      // 动画效果
      this.animateDeal(slot, actualCount);
    }
    
    this.updateDrawPileCount();
    
    if (!anyDealt) {
      this.showMessage('所有卡槽已满或牌堆已空', 0xFF0000);
    }
  }
  
  // 发牌动画
  animateDeal(slot, count) {
    // 简化动画：槽闪烁一下
    this.tweens.add({
      targets: slot.bg,
      alpha: 0.8,
      duration: 100,
      yoyo: true,
      repeat: 2
    });
  }
  
  createOrders() {
    // 简化订单系统（后续T7完善）
    const orderTypes = [
      { type: 'candy', name: '糖果订单', count: 5 },
      { type: 'dumpling', name: '饺子订单', count: 5 },
      { type: 'lantern', name: '灯笼订单', count: 5 }
    ];
    
    for (let i = 0; i < 3; i++) {
      const x = 150 + i * 250;
      const order = orderTypes[i];
      
      const container = this.add.container(x, 90);
      
      const bg = this.add.rectangle(0, 0, 200, 120, 0xFFF8DC)
        .setStrokeStyle(2, 0x8B4513);
      container.add(bg);
      
      container.add(this.add.text(0, -35, order.name, {
        fontSize: '16px', color: '#8B0000', fontStyle: 'bold'
      }).setOrigin(0.5));
      
      const icons = { candy: '🍬', dumpling: '🥟', lantern: '🏮' };
      container.add(this.add.text(0, -5, `${icons[order.type]} ×${order.count}`, {
        fontSize: '24px'
      }).setOrigin(0.5));
      
      // 暂存进度显示（后续T7实现）
      container.add(this.add.text(0, 30, '待交付', {
        fontSize: '14px', color: '#666666'
      }).setOrigin(0.5));
      
      // 点击交付
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onOrderClicked(container, order));
      
      this.orders.push({ container, data: order, bg, progress: 0 });
    }
  }
  
  createUI() {
    // 顶部信息栏
    this.add.text(20, 15, `第${this.level}关`, {
      fontSize: '20px', color: '#FFD700', fontStyle: 'bold'
    });
    
    this.add.text(200, 15, 'v2.0 三槽版', {
      fontSize: '14px', color: '#AAAAAA'
    });
    
    // 牌堆按钮（T3）
    this.drawPileBtn = this.add.rectangle(720, 480, 100, 80, 0x654321)
      .setInteractive({ useHandCursor: true });
    this.add.text(720, 460, '📦', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(720, 490, '发牌', { fontSize: '14px', color: '#FFFFFF' }).setOrigin(0.5);
    this.drawPileCountText = this.add.text(720, 520, '40张', {
      fontSize: '12px', color: '#FFD700'
    }).setOrigin(0.5);
    
    this.drawPileBtn.on('pointerdown', () => this.dealCards());
    
    // 菜单按钮
    const menuBtn = this.add.rectangle(720, 560, 80, 35, 0x666666)
      .setInteractive({ useHandCursor: true });
    this.add.text(720, 560, '菜单', { fontSize: '14px', color: '#FFF' }).setOrigin(0.5);
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    
    // 提示文字
    this.add.text(400, 580, '点击槽选中 → 点击另一槽移动 / 点击订单交付', {
      fontSize: '12px', color: '#CCCCCC'
    }).setOrigin(0.5);
  }
  
  // 槽点击处理（T5移动功能的基础）
  onSlotClicked(slot) {
    // 如果已有选中槽
    if (this.selectedSlot) {
      if (this.selectedSlot === slot) {
        // 再次点击同一槽，取消选中
        this.selectedSlot.deselect();
        this.selectedSlot = null;
      } else {
        // 尝试移动
        this.tryMoveCards(this.selectedSlot, slot);
      }
    } else {
      // 选中槽
      slot.select();
      this.selectedSlot = slot;
    }
    
    this.playClickSound();
  }
  
  // T5: 尝试移动卡牌
  tryMoveCards(sourceSlot, targetSlot) {
    const result = sourceSlot.moveTopTo(targetSlot);
    
    if (result.success) {
      this.showMessage(`移动 ${result.movedCount} 张牌`, 0x00FF00);
      this.playSuccessSound();
    } else {
      this.showMessage(result.reason, 0xFF0000);
      this.playErrorSound();
    }
    
    // 取消选中
    sourceSlot.deselect();
    this.selectedSlot = null;
  }
  
  // 订单点击处理（T7部分交付的基础）
  onOrderClicked(orderContainer, orderData) {
    if (!this.selectedSlot) {
      this.showMessage('请先选中一个卡槽', 0xFF0000);
      return;
    }
    
    // 简化版：检查类型匹配（T7会完善部分交付）
    const slotTopType = this.selectedSlot.getTopType();
    if (slotTopType !== orderData.type) {
      this.showMessage(`订单需要${orderData.name}，但槽顶是${slotTopType}`, 0xFF0000);
      this.playErrorSound();
      return;
    }
    
    // 检查数量（简化版，要求一次交付够）
    const topCount = this.selectedSlot.getTopCount();
    if (topCount < orderData.count) {
      this.showMessage(`槽顶只有${topCount}张，需要${orderData.count}张`, 0xFFAA00);
      // TODO: T7 部分交付
      return;
    }
    
    // 完成订单
    this.selectedSlot.removeTop(orderData.count);
    this.showMessage('订单完成!', 0x00FF00);
    this.playSuccessSound();
    
    // 取消选中
    this.selectedSlot.deselect();
    this.selectedSlot = null;
    
    // 刷新订单
    this.completedOrders++;
    if (this.completedOrders >= this.targetOrders) {
      this.showMessage('🎉 关卡完成!', 0xFFD700);
      setTimeout(() => {
        this.scene.start('GameScene', { level: this.level + 1 });
      }, 2000);
    }
  }
  
  updateDrawPileCount() {
    this.drawPileCountText.setText(`${this.drawPile.length}张`);
  }
  
  showMessage(text, color) {
    const msg = this.add.text(400, 250, text, {
      fontSize: '20px', color: '#FFFFFF',
      backgroundColor: color.toString(16).padStart(6, '0'),
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: msg, y: 200, alpha: 0,
      duration: 1500,
      onComplete: () => msg.destroy()
    });
  }
  
  // 音效
  playClickSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
  }
  
  playSuccessSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
  }
  
  playErrorSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
  }
};

// Game Config
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: '#5D4037',
  scene: [BootScene, MenuScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
