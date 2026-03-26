// DS17 v2.0 - 三槽机制完整版
// T7订单暂存 + T8飞行动画 + T9连续交付

class Card {
  constructor(type) {
    this.type = type;
  }
}

class Order {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.id = config.id;
    this.req = config.req;
    this.rw = config.rw;
    this.comp = false;
    this.del = 0;
    this.locked = false;
    this.lockCost = 0;
    this.lockMask = null;
    this.lockLabel = null;
    
    this.cont = scene.add.container(x, y);
    // 缩小订单尺寸以适应5个订单
    this.bg = scene.add.rectangle(0, 0, 145, 130, 0xFFF8DC)
      .setStrokeStyle(2, 0x8B4513);
    this.cont.add(this.bg);
    
    const names = { candy: '糖果订单', dumpling: '饺子订单', lantern: '灯笼订单', redpacket: '红包订单' };
    this.cont.add(scene.add.text(0, -45, names[this.req.t], {
      fontSize: '13px', color: '#8B0000', fontStyle: 'bold'
    }).setOrigin(0.5));
    
    const icons = { candy: '🍬', dumpling: '🥟', lantern: '🏮', redpacket: '🧧' };
    this.cont.add(scene.add.text(0, -18, icons[this.req.t], {
      fontSize: '28px'
    }).setOrigin(0.5));
    
    this.pt = scene.add.text(0, 12, `${icons[this.req.t]} 0/${this.req.c}`, {
      fontSize: '15px', color: '#333', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.cont.add(this.pt);
    
    this.cont.add(scene.add.text(0, 42, `💰 ${this.rw}`, {
      fontSize: '12px', color: '#FFD700'
    }).setOrigin(0.5));
    
    this.stk = scene.add.container(0, -65);
    this.cont.add(this.stk);
    
    // 刷新按钮
    this.refreshBtn = scene.add.rectangle(52, -42, 28, 28, 0x4169E1)
      .setStrokeStyle(2, 0xFFFFFF)
      .setInteractive({ useHandCursor: true });
    this.refreshIcon = scene.add.text(52, -42, '🔄', { fontSize: '14px' }).setOrigin(0.5);
    this.cont.add(this.refreshBtn);
    this.cont.add(this.refreshIcon);
    
    this.refreshBtn.on('pointerover', () => this.refreshBtn.setFillStyle(0x5A7AEA));
    this.refreshBtn.on('pointerout', () => this.refreshBtn.setFillStyle(0x4169E1));
    this.refreshBtn.on('pointerdown', () => this.onRefresh());
    
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => { if (!this.comp) this.bg.setFillStyle(0xFFFFE0); });
    this.bg.on('pointerout', () => { if (!this.comp) this.bg.setFillStyle(0xFFF8DC); });
    this.bg.on('pointerdown', () => this.onClick());
  }
  
  onRefresh() {
    if (this.comp || this.locked) return;
    // 获取当前场上各类型订单数量
    const typeCount = {};
    this.scene.ords.forEach(o => {
      if (o !== this && !o.comp && !o.locked) {
        typeCount[o.req.t] = (typeCount[o.req.t] || 0) + 1;
      }
    });
    
    // 随机更换订单类型，确保同类型不超过2个
    const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
    const oldType = this.req.t;
    let availableTypes = types.filter(t => (typeCount[t] || 0) < 2);
    
    // 如果所有类型都已经有2个，则随机选择（允许暂时超标，但概率很低）
    if (availableTypes.length === 0) availableTypes = types;
    
    // 优先选择不同类型
    let newType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    if (newType === oldType && availableTypes.length > 1) {
      availableTypes = availableTypes.filter(t => t !== oldType);
      newType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }
    
    this.req.t = newType;
    this.req.c = 10; // 统一10个
    this.del = 0; // 重置已交付数量
    this.rw = 110 + Math.floor(Math.random() * 51); // 110-160金币
    
    // 更新显示
    const names = { candy: '糖果订单', dumpling: '饺子订单', lantern: '灯笼订单', redpacket: '红包订单' };
    const icons = { candy: '🍬', dumpling: '🥟', lantern: '🏮', redpacket: '🧧' };
    
    // 重新创建文字（因为直接修改比较麻烦，我们重新设置）
    this.cont.list[1].setText(names[this.req.t]);
    this.cont.list[2].setText(icons[this.req.t]);
    this.upd();
    this.cont.list[4].setText(`💰 ${this.rw}`);
    
    // 刷新动画
    this.scene.tweens.add({
      targets: this.cont,
      rotation: 0.1,
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.cont.setRotation(0)
    });
    
    this.scene.showMsg('订单已刷新!', 0x87CEEB);
  }
  
  tryD(cds, sl) {
    if (this.comp) return { suc: false, rsn: '已完成' };
    if (cds[0].type !== this.req.t) return { suc: false, rsn: `需${this.getTN()}` };
    
    const rm = this.req.c - this.del;
    const dc = Math.min(cds.length, rm);
    this.del += dc;
    this.upd();
    
    return { suc: true, del: dc, comp: this.del >= this.req.c };
  }
  
  upd() {
    const icons = { candy: '🍬', dumpling: '🥟', lantern: '🏮', redpacket: '🧧' };
    this.pt.setText(`${icons[this.req.t]} ${this.del}/${this.req.c}`);
    
    const p = this.del / this.req.c;
    this.pt.setColor(p >= 1 ? '#00AA00' : p >= 0.5 ? '#FFAA00' : '#333');
    
    this.stk.removeAll(true);
    if (this.del > 0) {
      const d = Math.min(5, this.del);
      for (let j = 0; j < d; j++) {
        this.stk.add(this.scene.add.rectangle(-35 + j * 18, 0, 16, 22, this.getTC())
          .setStrokeStyle(1, 0xFFFFFF));
      }
      if (this.del > 5) {
        this.stk.add(this.scene.add.text(55, 0, `+${this.del - 5}`, { fontSize: '10px', color: '#666' }));
      }
    }
  }
  
  compO() {
    this.comp = true;
    this.bg.setFillStyle(0x90EE90);
    this.pt.setText('✓ 完成!').setColor('#00AA00');
    this.stk.setVisible(false);
    this.scene.tweens.add({ targets: this.cont, scale: 1.1, duration: 200, yoyo: true });
  }
  
  setLock(cost) {
    this.locked = true;
    this.lockCost = cost;
    this.refreshBtn.setVisible(false);
    this.refreshIcon.setVisible(false);
    this.bg.setFillStyle(0x444444);
    this.pt.setText('未解锁').setColor('#CCCCCC');
    this.stk.setVisible(false);
    this.lockMask = this.scene.add.rectangle(0, 0, 145, 130, 0x000000, 0.35);
    this.lockLabel = this.scene.add.text(0, -8, `🔒 ${cost}💰`, {
      fontSize: '16px', color: '#FFD700', fontStyle: 'bold', align: 'center'
    }).setOrigin(0.5);
    this.cont.add(this.lockMask);
    this.cont.add(this.lockLabel);
  }
  
  unlock() {
    this.locked = false;
    this.lockCost = 0;
    if (this.lockMask) { this.lockMask.destroy(); this.lockMask = null; }
    if (this.lockLabel) { this.lockLabel.destroy(); this.lockLabel = null; }
    this.refreshBtn.setVisible(true);
    this.refreshIcon.setVisible(true);
    this.bg.setFillStyle(0xFFF8DC);
    this.upd();
  }
  
  onClick() {
    this.scene.onOrdClick(this);
  }
  
  getTN() {
    const n = { candy: '糖果', dumpling: '饺子', lantern: '灯笼', redpacket: '红包' };
    return n[this.req.t] || this.req.t;
  }
  
  getTC() {
    const c = { candy: 0xFF69B4, dumpling: 0xF5F5DC, lantern: 0xFF4500, redpacket: 0xDC143C };
    return c[this.req.t] || 0x888888;
  }
}

class Slot {
  constructor(scene, id, x, y) {
    this.scene = scene;
    this.id = id;
    this.x = x;
    this.y = y;
    this.cds = [];
    this.max = 15;
    this.sel = false;
    
    this.cont = scene.add.container(x, y);
    this.bg = scene.add.rectangle(0, 0, 160, 200, 0x8B4513, 0.3)
      .setStrokeStyle(2, 0x8B4513);
    this.cont.add(this.bg);
    
    this.et = scene.add.text(0, 0, '空', { fontSize: '24px', color: '#666', fontStyle: 'bold' }).setOrigin(0.5);
    this.cont.add(this.et);
    
    this.ti = scene.add.text(0, -50, '', { fontSize: '48px' }).setOrigin(0.5).setVisible(false);
    this.cont.add(this.ti);
    
    this.ct = scene.add.text(0, 10, '', {
      fontSize: '20px', color: '#FFF', fontStyle: 'bold',
      backgroundColor: '#8B0000', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setVisible(false);
    this.cont.add(this.ct);
    
    this.pb = scene.add.rectangle(0, 50, 120, 12, 0x333333).setVisible(false);
    this.cont.add(this.pb);
    
    this.pbr = scene.add.rectangle(-60, 50, 0, 10, 0x00FF00).setOrigin(0, 0.5).setVisible(false);
    this.cont.add(this.pbr);
    
    this.hl = scene.add.rectangle(0, 0, 170, 210, 0x00FF00, 0)
      .setStrokeStyle(4, 0x00FF00).setVisible(false);
    this.cont.add(this.hl);
    
    this.ha = scene.add.rectangle(0, 0, 160, 200, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.cont.add(this.ha);
    
    this.ha.on('pointerdown', () => this.onClick());
    this.ha.on('pointerover', () => this.onHv(true));
    this.ha.on('pointerout', () => this.onHv(false));
    
    this.csp = [];
    
    // 锁定相关
    this.locked = false;
    this.lockCost = 0;
    this.lockIcon = null;
    this.lockText = null;
  }
  
  // 设置锁定状态
  setLock(cost) {
    this.locked = true;
    this.lockCost = cost;
    this.et.setVisible(false);
    this.lockIcon = this.scene.add.text(0, -20, '🔒', { fontSize: '40px' }).setOrigin(0.5);
    this.lockText = this.scene.add.text(0, 20, `${cost}💰`, { fontSize: '18px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    this.cont.add(this.lockIcon);
    this.cont.add(this.lockText);
    this.bg.setFillStyle(0x444444, 0.6);
    this.bg.setStrokeStyle(2, 0x666666);
  }
  
  // 解锁
  unlock() {
    this.locked = false;
    if (this.lockIcon) { this.lockIcon.destroy(); this.lockIcon = null; }
    if (this.lockText) { this.lockText.destroy(); this.lockText = null; }
    this.et.setVisible(true);
    this.bg.setFillStyle(0x8B4513, 0.3);
    this.bg.setStrokeStyle(2, 0x8B4513);
    this.upd();
  }
  
  isE() { return this.cds.length === 0; }
  gt() { return this.isE() ? null : this.cds[this.cds.length - 1].type; }
  
  gtc() {
    if (this.isE()) return 0;
    const t = this.gt();
    let c = 0;
    for (let i = this.cds.length - 1; i >= 0; i--) {
      if (this.cds[i].type === t) c++;
      else break;
    }
    return c;
  }
  
  canR(t) { return this.isE() || this.gt() === t; }
  
  addC(c) {
    const sp = this.max - this.cds.length;
    if (sp <= 0) return false;
    this.cds.push(...c.slice(0, sp));
    this.upd();
    return true;
  }
  
  rmTop(n) {
    const c = Math.min(n, this.gtc());
    const r = [];
    for (let i = 0; i < c; i++) r.push(this.cds.pop());
    this.upd();
    return r;
  }
  
  upd() {
    this.csp.forEach(s => s.destroy());
    this.csp = [];
    
    if (this.isE()) {
      this.et.setVisible(true);
      this.ti.setVisible(false);
      this.ct.setVisible(false);
      this.pb.setVisible(false);
      this.pbr.setVisible(false);
      this.bg.setStrokeStyle(2, 0x666666).setFillStyle(0x8B4513, 0.1);
    } else {
      this.et.setVisible(false);
      this.ti.setVisible(true);
      this.ct.setVisible(true);
      this.pb.setVisible(true);
      this.pbr.setVisible(true);
      this.bg.setStrokeStyle(2, 0x8B4513).setFillStyle(0x8B4513, 0.3);
      
      const t = this.gt();
      const tc = this.gtc();
      const tt = this.cds.length;
      const icons = { candy: '🍬', dumpling: '🥟', lantern: '🏮', redpacket: '🧧' };
      
      this.ti.setText(icons[t] || t);
      this.ct.setText(`${tc}/${tt}`);
      
      const p = tt / this.max;
      this.pbr.width = 120 * p;
      
      // 更鲜明的进度条颜色
      if (tt >= 15) {
        this.pbr.setFillStyle(0xFF0000);
        this.ct.setBackgroundColor('#FF0000');
      } else if (tt >= 12) {
        this.pbr.setFillStyle(0xFF8800);
        this.ct.setBackgroundColor('#FF8800');
      } else if (tt >= 8) {
        this.pbr.setFillStyle(0xFFDD00);
        this.ct.setBackgroundColor('#CC9900');
      } else {
        this.pbr.setFillStyle(0x00FF00);
        this.ct.setBackgroundColor('#228B22');
      }
      
      // 渲染卡牌堆叠 - 增强视觉效果
      this.renderCardStackEnhanced();
    }
  }
  
  // 增强版卡牌渲染
  renderCardStackEnhanced() {
    const displayCount = Math.min(6, this.cds.length);
    const topType = this.gt();
    
    for (let j = 0; j < displayCount; j++) {
      const cardIndex = this.cds.length - displayCount + j;
      const card = this.cds[cardIndex];
      const isTop = j === displayCount - 1;
      
      // 位置：Y偏移加大，增加层次感
      const offsetY = -35 - (j * 10);
      // 缩放：底层更小，顶层正常
      const scale = 0.55 + (j * 0.03);
      // 透明度：底层更透明
      const alpha = 0.6 + (j * 0.08);
      // 随机旋转：-4°到+4°，自然堆叠感
      const rotation = (Math.random() - 0.5) * 0.14;
      
      // 创建卡牌容器
      const cardContainer = this.scene.add.container(0, offsetY);
      
      // 阴影（底层才有）
      if (j < displayCount - 1) {
        const shadow = this.scene.add.rectangle(3, 3, 55, 75, 0x000000, 0.4)
          .setOrigin(0.5);
        cardContainer.add(shadow);
      }
      
      // 卡牌主体
      const sprite = this.scene.add.sprite(0, 0, card.type + '_full')
        .setScale(scale)
        .setAlpha(alpha)
        .setRotation(rotation);
      
      // 白色边框
      const border = this.scene.add.rectangle(0, 0, 55 * scale, 75 * scale, 0x000000, 0)
        .setStrokeStyle(2, 0xFFFFFF)
        .setOrigin(0.5);
      
      cardContainer.add(sprite);
      cardContainer.add(border);
      
      // 顶部卡牌发光效果
      if (isTop && card.type === topType) {
        const glow = this.scene.add.rectangle(0, 0, 60 * scale, 80 * scale, 0xFFFFFF, 0)
          .setStrokeStyle(3, 0xFFD700)
          .setOrigin(0.5);
        cardContainer.add(glow);
        
        // 脉冲动画
        this.scene.tweens.add({
          targets: glow,
          alpha: { from: 1, to: 0.3 },
          duration: 800,
          yoyo: true,
          repeat: -1
        });
      }
      
      this.cont.add(cardContainer);
      this.csp.push(cardContainer);
    }
    
    // 如果卡牌很多，显示"+N"提示
    if (this.cds.length > 6) {
      const moreText = this.scene.add.text(0, -95, `+${this.cds.length - 6}`, {
        fontSize: '14px',
        color: '#FFD700',
        fontStyle: 'bold',
        backgroundColor: '#8B0000',
        padding: { x: 6, y: 2 }
      }).setOrigin(0.5);
      this.cont.add(moreText);
      this.csp.push(moreText);
    }
  }
  
  onClick() { this.scene.onSlClick(this); }
  onHv(h) { if (this.sel) return; this.cont.setScale(h ? 1.02 : 1); }
  selT() { this.sel = true; this.hl.setVisible(true); this.cont.setDepth(100); }
  desel() { this.sel = false; this.hl.setVisible(false); this.cont.setDepth(1); }
  
  movTo(ts) {
    if (this.isE()) return { suc: false, rsn: '源槽空' };
    const tt = this.gt();
    const tc = this.gtc();
    if (!ts.canR(tt)) return { suc: false, rsn: '类型不匹配' };
    const tsp = ts.max - ts.cds.length;
    if (tsp <= 0) return { suc: false, rsn: '目标满' };
    const mc = Math.min(tc, tsp);
    this.animTo(ts, mc);
    this.scene.time.delayedCall(300, () => {
      const cds = this.rmTop(mc);
      ts.addC(cds);
    });
    return { suc: true, mc };
  }
  
  animTo(ts, c) {
    const cds = this.cds.slice(-c);
    cds.forEach((cd, i) => {
      const sp = this.scene.add.sprite(this.x, this.y - 30, cd.type + '_full')
        .setScale(0.5).setDepth(1000);
      this.scene.tweens.add({
        targets: sp, x: ts.x, y: ts.y - 30,
        duration: 300, delay: i * 50, ease: 'Power2',
        onComplete: () => sp.destroy()
      });
    });
  }
}

const BootScene = class extends Phaser.Scene {
  constructor() { super('BootScene'); }
  
  create() {
    [
      { k: 'candy', c: 0xFF69B4, i: '🍬' },
      { k: 'dumpling', c: 0xF5F5DC, i: '🥟' },
      { k: 'lantern', c: 0xFF4500, i: '🏮' },
      { k: 'redpacket', c: 0xDC143C, i: '🧧' }
    ].forEach(({ k, c, i }) => {
      const g = this.add.graphics();
      g.fillStyle(c, 1);
      g.fillRoundedRect(0, 0, 60, 80, 8);
      g.lineStyle(2, 0xFFFFFF, 1);
      g.strokeRoundedRect(0, 0, 60, 80, 8);
      g.generateTexture(k, 60, 80);
      g.clear();
      const t = this.add.text(30, 40, i, { fontSize: '32px' }).setOrigin(0.5);
      const r = this.add.renderTexture(0, 0, 60, 80);
      r.draw(k, 0, 0);
      r.draw(t, 30, 40);
      r.saveTexture(k + '_full');
      t.destroy();
    });
    this.scene.start('MenuScene');
  }
};

const MenuScene = class extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  
  create() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillGradientStyle(0x8B0000, 0x8B0000, 0x4A0000, 0x4A0000, 1);
    g.fillRect(0, 0, width, height);
    
    const t = this.add.text(width / 2, height / 3, '办年货 v2.0', {
      fontFamily: 'Arial', fontSize: '64px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.tweens.add({ targets: t, scale: { from: 1, to: 1.05 }, duration: 1000, yoyo: true, repeat: -1 });
    this.add.text(width / 2, height / 3 + 70, '✨ 5槽5订单 + 保底养套机制', { fontSize: '22px', color: '#FFA500' }).setOrigin(0.5);
    this.crtBtn(width / 2, height * 0.6, '🎮 开始游戏', () => this.scene.start('GameScene', { level: 1 }));
    this.crtBtn(width / 2, height * 0.75, '📜 游戏规则', () => this.showRules());
  }
  
  crtBtn(x, y, txt, cb) {
    const b = this.add.rectangle(x, y, 260, 60, 0x228B22).setInteractive({ useHandCursor: true });
    this.add.text(x, y, txt, { fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold' }).setOrigin(0.5);
    b.on('pointerover', () => { b.setFillStyle(0x2E8B57); b.setScale(1.05); });
    b.on('pointerout', () => { b.setFillStyle(0x228B22); b.setScale(1); });
    b.on('pointerdown', cb);
  }
  
  showRules() {
    const o = this.add.rectangle(400, 300, 720, 520, 0x000000, 0.95);
    this.add.text(400, 70, '📜 v2.0 规则', { fontSize: '26px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5);
    const r = ['【核心】', '• 5槽×15张上限(后2槽需解锁)', '• 第4槽180💰，第5槽320💰', '• 批量发牌(1-5张)', '• 发牌会优先养成套', '', '【订单】', '• 5订单位，先开放3个', '• 第4订单位150💰，第5订单位280💰', '• 每单统一10个，支持部分交付'];
    r.forEach((l, i) => this.add.text(400, 115 + i * 28, l, { fontSize: '15px', color: l.startsWith('【') ? '#FFD700' : '#FFFFFF' }).setOrigin(0.5));
    const c = this.add.rectangle(400, 480, 120, 40, 0xDC143C).setInteractive({ useHandCursor: true });
    this.add.text(400, 480, '关闭', { fontSize: '18px', color: '#FFF' }).setOrigin(0.5);
    c.on('pointerdown', () => o.destroy());
  }
};

const GameScene = class extends Phaser.Scene {
  constructor() { super('GameScene'); }
  
  init(d) {
    this.lv = d.level || 1;
    this.sl = [];
    this.ss = null;
    this.dp = [];
    this.ords = [];
    this.tg = 5; // 5个订单目标
    this.comp = 0;
    this.cn = 0;
    this.lot = 0;
    this.cbo = 0;
    this.dryDealStreak = 0; // 第三阶段：保底扶持计数
    this.orderUnlockCosts = [0, 0, 0, 150, 280];
  }
  
  create() {
    this.crtBg();
    this.crtSl();
    this.crtOrd();
    this.crtUI();
    this.dealInit();
  }
  
  crtBg() {
    const g = this.add.graphics();
    g.fillStyle(0x5D4037, 1);
    g.fillRect(0, 0, 800, 600);
    g.fillStyle(0x4E342E, 0.5);
    for (let x = 0; x < 800; x += 40) g.fillRect(x, 0, 20, 600);
  }
  
  crtSl() {
    // 5个卡槽，调整间距
    const sx = 130, sp = 135, y = 320;
    for (let i = 0; i < 5; i++) {
      const s = new Slot(this, i, sx + i * sp, y);
      // 第4/5个卡槽金币解锁（平滑一些的数值）
      if (i === 3) s.setLock(180);
      if (i === 4) s.setLock(320);
      this.sl.push(s);
    }
  }
  
  crtOrd() {
    // 5个订单，统一10个需求，确保同类型不超过2个
    const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
    const typeCount = {};
    const selectedTypes = [];
    
    for (let i = 0; i < 5; i++) {
      const availableTypes = types.filter(t => (typeCount[t] || 0) < 2);
      const pool = availableTypes.length > 0 ? availableTypes : types;
      const t = pool[Math.floor(Math.random() * pool.length)];
      typeCount[t] = (typeCount[t] || 0) + 1;
      selectedTypes.push(t);
    }
    
    // 创建订单（先开放3个，后2个金币解锁）
    for (let i = 0; i < 5; i++) {
      const x = 100 + i * 155;
      const t = selectedTypes[i];
      const r = 120 + Math.floor(Math.random() * 41); // 120-160金币，更容易推进解锁
      const order = new Order(this, x, 100, { id: i, req: { t, c: 10 }, rw: r });
      if (i >= 3) order.setLock(this.orderUnlockCosts[i]);
      this.ords.push(order);
    }
  }
  
  crtUI() {
    this.add.text(20, 15, `第${this.lv}关`, { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' });
    this.cnt = this.add.text(150, 15, '💰 0', { fontSize: '18px', color: '#FFD700' });
    this.pgt = this.add.text(500, 15, '订单: 0/5', { fontSize: '16px', color: '#FFF' });
    
    this.cbt = this.add.text(400, 200, '', {
      fontSize: '36px', color: '#FFD700', fontStyle: 'bold',
      stroke: '#FF6600', strokeThickness: 4
    }).setOrigin(0.5).setVisible(false).setDepth(1000);
    
    // 发牌按钮 - 中下方
    this.dpb = this.add.rectangle(400, 500, 140, 70, 0x654321)
      .setStrokeStyle(3, 0xFFD700)
      .setInteractive({ useHandCursor: true });
    this.add.text(400, 490, '📦', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(400, 515, '发牌', { fontSize: '16px', color: '#FFF', fontStyle: 'bold' }).setOrigin(0.5);
    this.dpct = this.add.text(400, 540, '剩余 40 张', { fontSize: '12px', color: '#FFD700' }).setOrigin(0.5);
    this.dpb.on('pointerdown', () => this.deal());
    this.dpb.on('pointerover', () => {
      this.dpb.setFillStyle(0x7A5C3D);
      this.dpb.setScale(1.05);
    });
    this.dpb.on('pointerout', () => {
      this.dpb.setFillStyle(0x654321);
      this.dpb.setScale(1);
    });
    
    // 菜单按钮 - 右上角
    const mb = this.add.rectangle(750, 30, 80, 35, 0x666666).setInteractive({ useHandCursor: true });
    this.add.text(750, 30, '菜单', { fontSize: '14px', color: '#FFF' }).setOrigin(0.5);
    mb.on('pointerdown', () => this.scene.start('MenuScene'));
    
    // 底部提示
    this.add.text(400, 575, '槽位解锁: 180/320💰 | 订单位解锁: 150/280💰 | 10个一单 | 发牌会优先养成套', { fontSize: '11px', color: '#CCC' }).setOrigin(0.5);
  }
  
  dealInit() {
    const t = ['candy', 'dumpling', 'lantern', 'redpacket'];
    
    // 只有第1关才初始发牌，进入下一关时不发牌
    if (this.lv === 1) {
      // 第一关初始不要太散：前3个槽各自围绕一个“主类型”发牌
      // 优先参考当前前3个订单的类型，让玩家开局就更容易养出一套
      const seedTypes = this.ords.slice(0, 3).map(o => o.req.t);
      
      for (let i = 0; i < 3; i++) {
        const cards = [];
        const focusType = seedTypes[i] || t[i % t.length];
        
        // 每个槽 5 张牌：至少 4 张是主类型，第 5 张大概率仍然是主类型
        for (let j = 0; j < 4; j++) {
          cards.push(new Card(focusType));
        }
        
        const tailType = Math.random() < 0.7
          ? focusType
          : t[Math.floor(Math.random() * t.length)];
        cards.push(new Card(tailType));
        
        this.sl[i].addC(cards);
      }
    }
    
    // 100张牌堆（每关都重置）
    for (let i = 0; i < 100; i++) this.dp.push(new Card(t[Math.floor(Math.random() * t.length)]));
    this.updDPC();
  }
  
  // 第一阶段：订单导向权重 + 顶层堆叠保护
  getDealWeights() {
    const weights = { candy: 1, dumpling: 1, lantern: 1, redpacket: 1 };
    
    // 订单导向：场上每个同类型订单 +1 权重
    this.ords.forEach(o => {
      if (!o.comp && !o.locked) {
        weights[o.req.t] += 1;
        // 接近完成的订单再 +1
        if (o.del >= 7) weights[o.req.t] += 1;
      }
    });
    return weights;
  }
  
  pickWeightedType(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    
    for (const [type, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return type;
    }
    return entries[0][0];
  }
  
  getGrowthSlots(weights) {
    const available = this.sl.filter(s => !s.locked && s.cds.length < 15);
    if (available.length === 0) return [];
    
    const orderedTypes = Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);
    
    const scored = available.map(slot => {
      const topType = slot.gt();
      const topCount = slot.gtc();
      let score = 0;
      
      if (slot.isE()) score += 20; // 空槽可作为培养新线
      if (topCount >= 2) score += 30 + topCount * 8; // 连堆越高越值得培养
      if (topType && weights[topType]) score += weights[topType] * 10; // 订单权重高的优先
      if (topType && orderedTypes[0] === topType) score += 25; // 当前最热类型优先
      
      return { slot, score };
    }).sort((a, b) => b.score - a.score);
    
    const allScattered = available.every(slot => slot.gtc() <= 2);
    const targetCount = allScattered ? Math.min(2, scored.length) : 1;
    return scored.slice(0, targetCount).map(item => item.slot);
  }
  
  chooseTypeForSlot(slot, weights, isGrowthSlot = false) {
    const topType = slot.gt();
    const topCount = slot.gtc();
    
    // 第二阶段：成长槽机制
    if (isGrowthSlot) {
      // 空成长槽：优先吃当前最高权重类型
      if (!topType) {
        const ordered = Object.entries(weights).sort((a, b) => b[1] - a[1]);
        const strongest = ordered[0][0];
        if (Math.random() < 0.8) return strongest;
        return this.pickWeightedType(weights);
      }
      
      // 已有堆叠的成长槽：更强地延续顶部类型
      let growthChance = 0.65;
      if (topCount >= 4) growthChance = 0.85;
      else if (topCount >= 2) growthChance = 0.7;
      
      if (Math.random() < growthChance) return topType;
      return this.pickWeightedType(weights);
    }
    
    // 第一阶段：顶层堆叠保护
    if (topType) {
      let continueChance = 0;
      if (topCount >= 4) continueChance = 0.75;
      else if (topCount >= 2) continueChance = 0.55;
      
      if (Math.random() < continueChance) return topType;
    }
    
    // 其他按订单权重发牌
    return this.pickWeightedType(weights);
  }
  
  projectTopCount(slot, incomingTypes) {
    const combined = slot.cds.map(c => c.type).concat(incomingTypes);
    if (combined.length === 0) return 0;
    const topType = combined[combined.length - 1];
    let count = 0;
    for (let i = combined.length - 1; i >= 0; i--) {
      if (combined[i] === topType) count++;
      else break;
    }
    return count;
  }
  
  deal() {
    let ad = false;
    const weights = this.getDealWeights();
    const growthSlots = this.getGrowthSlots(weights);
    const primaryGrowthSlot = growthSlots[0] || null;
    const safeguardMode = this.dryDealStreak >= 2 && !!primaryGrowthSlot;
    
    const availableSlots = this.sl.filter(s => !s.locked && s.cds.length < 15);
    const preMaxTop = availableSlots.length > 0 ? Math.max(...availableSlots.map(s => s.gtc())) : 0;
    let projectedMaxTop = preMaxTop;
    
    for (const s of this.sl) {
      if (s.locked || s.cds.length >= 15) continue;
      
      const dc = Phaser.Math.Between(1, 5);
      const sp = 15 - s.cds.length;
      const ac = Math.min(dc, sp, this.dp.length);
      if (ac <= 0) continue;
      
      const isGrowthSlot = growthSlots.includes(s);
      const isSafeguardSlot = safeguardMode && primaryGrowthSlot === s;
      this.animDeal(s, ac, isGrowthSlot || isSafeguardSlot);
      
      const cd = [];
      const generatedTypes = [];
      
      // 第三阶段：保底扶持机制
      if (isSafeguardSlot) {
        const forcedType = s.gt() || Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
        for (let i = 0; i < ac; i++) {
          const type = i < Math.min(3, ac) ? forcedType : this.chooseTypeForSlot(s, weights, true);
          cd.push(new Card(type));
          generatedTypes.push(type);
        }
      } else {
        for (let i = 0; i < ac; i++) {
          const type = this.chooseTypeForSlot(s, weights, isGrowthSlot);
          cd.push(new Card(type));
          generatedTypes.push(type);
        }
      }
      
      projectedMaxTop = Math.max(projectedMaxTop, this.projectTopCount(s, generatedTypes));
      this.dp.splice(0, ac);
      this.time.delayedCall(300, () => s.addC(cd));
      ad = true;
    }
    
    if (growthSlots.length > 0) {
      this.highlightGrowthSlots(growthSlots, safeguardMode);
    }
    
    // 更新保底计数：如果本轮没有明显成长，就累计一次
    if (projectedMaxTop >= Math.max(5, preMaxTop + 2)) {
      this.dryDealStreak = 0;
    } else if (ad) {
      this.dryDealStreak += 1;
    }
    
    if (!ad) this.showMsg('所有已解锁卡槽已满或牌堆空', 0xFF0000);
    else {
      if (safeguardMode) this.showMsg('保底扶持生效：本轮重点培养一个槽', 0xFFD54F);
      this.updDPC();
    }
  }
  
  animDeal(s, c, isGrowthSlot = false) {
    // 从新的发牌按钮位置(400, 500)飞出
    for (let i = 0; i < c; i++) {
      const sp = this.add.sprite(400, 500, 'cardback').setScale(0.4).setDepth(1000);
      if (isGrowthSlot) sp.setTint(0xFFD54F);
      this.tweens.add({
        targets: sp, x: s.x, y: s.y, scale: 0.6,
        duration: 300, delay: i * 80, ease: 'Power2',
        onComplete: () => sp.destroy()
      });
    }
  }
  
  highlightGrowthSlots(slots, safeguardMode = false) {
    slots.forEach((slot, idx) => {
      const color = safeguardMode && idx === 0 ? 0xFF8C00 : 0xFFD54F;
      const pulse = this.add.rectangle(slot.x, slot.y, 176, 216, color, 0)
        .setStrokeStyle(3, color)
        .setDepth(999);
      this.tweens.add({
        targets: pulse,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: safeguardMode && idx === 0 ? 1.12 : 1.08 },
        duration: safeguardMode && idx === 0 ? 700 : 500,
        onComplete: () => pulse.destroy()
      });
    });
  }
  
  updDPC() { this.dpct.setText(`剩余 ${this.dp.length} 张`); }
  
  onSlClick(s) {
    // 检查卡槽是否锁定
    if (s.locked) {
      if (this.cn >= s.lockCost) {
        this.cn -= s.lockCost;
        this.cnt.setText(`💰 ${this.cn}`);
        s.unlock();
        this.showMsg(`解锁卡槽! -${s.lockCost}💰`, 0x00FF00);
        this.playSS();
      } else {
        this.showMsg(`需要 ${s.lockCost} 金币解锁`, 0xFF0000);
        this.playCS();
      }
      return;
    }
    
    if (this.ss) {
      if (this.ss === s) {
        this.ss.desel();
        this.ss = null;
      } else {
        const r = this.ss.movTo(s);
        if (r.suc) this.showMsg(`移动 ${r.mc} 张`, 0x00FF00);
        else this.showMsg(r.rsn, 0xFF0000);
        this.ss.desel();
        this.ss = null;
      }
    } else {
      s.selT();
      this.ss = s;
    }
    this.playCS();
  }
  
  onOrdClick(o) {
    // 订单槽解锁
    if (o.locked) {
      if (this.cn >= o.lockCost) {
        this.cn -= o.lockCost;
        this.cnt.setText(`💰 ${this.cn}`);
        o.unlock();
        this.showMsg(`解锁订单槽! -${o.lockCost}💰`, 0x00FF00);
        this.playSS();
      } else {
        this.showMsg(`需要 ${o.lockCost} 金币解锁订单槽`, 0xFF0000);
        this.playCS();
      }
      return;
    }
    
    if (!this.ss) { this.showMsg('先选槽', 0xFF0000); return; }
    const st = this.ss.gt();
    if (st !== o.req.t) { this.showMsg(`需${o.getTN()}`, 0xFF0000); return; }
    const tc = this.ss.gtc();
    const cds = this.ss.cds.slice(-tc);
    const r = o.tryD(cds, this.ss);
    if (r.suc) {
      this.ss.rmTop(r.del);
      const now = Date.now();
      if (now - this.lot < 5000) {
        this.cbo++;
        if (this.cbo > 1) this.showCbo(this.cbo);
      } else this.cbo = 1;
      this.lot = now;
      if (!r.comp && this.ss.gt() === st) {
        this.showMsg(`已交${r.del}张，还需${o.req.c - o.del}张`, 0x87CEEB);
      } else if (r.comp) {
        this.compOrd(o);
      }
      this.playSS();
    }
  }
  
  showCbo(c) {
    const b = Math.floor(15 * (c - 1));
    this.cbt.setText(`${c}连击! +${b}`).setVisible(true).setAlpha(1).setScale(0.5);
    this.tweens.add({
      targets: this.cbt, scale: 1.5, duration: 200, yoyo: true,
      onComplete: () => this.tweens.add({
        targets: this.cbt, y: 150, alpha: 0, duration: 800,
        onComplete: () => this.cbt.setVisible(false).setY(200).setAlpha(1)
      })
    });
    this.cn += b;
    this.cnt.setText(`💰 ${this.cn}`);
  }
  
  compOrd(o) {
    o.compO();
    this.comp++;
    this.pgt.setText(`订单: ${this.comp}/5`);
    this.cn += o.rw;
    this.cnt.setText(`💰 ${this.cn}`);
    this.showMsg(`订单完成! +${o.rw}金币`, 0x00FF00);
    if (this.ss) { this.ss.desel(); this.ss = null; }
    
    // 检查是否完成所有订单（通关）
    if (this.comp >= 5) {
      this.showLevelComplete();
    } else {
      // 刷新新订单替换已完成的
      this.time.delayedCall(1000, () => this.refreshOrder(o));
    }
  }
  
  refreshOrder(oldOrder) {
    // 找到完成的订单索引
    const idx = this.ords.indexOf(oldOrder);
    if (idx === -1) return;
    
    // 销毁旧订单
    oldOrder.cont.destroy();
    
    // 统计当前场上各类型订单数量（不包括已完成的）
    const typeCount = {};
    this.ords.forEach(o => {
      if (o !== oldOrder && !o.comp && !o.locked) {
        typeCount[o.req.t] = (typeCount[o.req.t] || 0) + 1;
      }
    });
    
    // 生成新订单，确保同类型不超过2个
    const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
    const availableTypes = types.filter(t => (typeCount[t] || 0) < 2);
    const pool = availableTypes.length > 0 ? availableTypes : types;
    const t = pool[Math.floor(Math.random() * pool.length)];
    const c = 10; // 统一10个
    const r = 110 + Math.floor(Math.random() * 51); // 110-160金币
    
    const x = 100 + idx * 155;
    const newOrder = new Order(this, x, 100, {
      id: Date.now(),
      req: { t, c },
      rw: r
    });
    
    // 替换数组中的订单
    this.ords[idx] = newOrder;
    
    // 显示新订单提示
    this.showMsg('新订单!', 0xFFD700);
  }
  
  // 关卡完成结算界面
  showLevelComplete() {
    // 计算星级（基于总金币）
    let stars = 1;
    if (this.cn >= 750) stars = 3;
    else if (this.cn >= 520) stars = 2;
    
    // 创建深色遮罩
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85).setDepth(2000);
    
    // 成功面板
    const panel = this.add.rectangle(400, 300, 450, 380, 0x8B4513)
      .setStrokeStyle(4, 0xFFD700).setDepth(2001);
    
    // 标题
    const title = this.add.text(400, 140, '🎉 关卡完成!', {
      fontSize: '40px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2002);
    
    // 星级动画
    for (let i = 0; i < 3; i++) {
      const star = this.add.text(400 + (i - 1) * 60, 210, '⭐', {
        fontSize: '48px'
      }).setOrigin(0.5).setAlpha(i < stars ? 1 : 0.3).setScale(0).setDepth(2002);
      
      this.tweens.add({
        targets: star,
        scale: i < stars ? 1.3 : 0.8,
        duration: 400,
        delay: i * 150,
        ease: 'Back.easeOut'
      });
    }
    
    // 统计数据
    this.add.text(400, 270, `第 ${this.lv} 关`, {
      fontSize: '22px', color: '#FFFFFF'
    }).setOrigin(0.5).setDepth(2002);
    
    this.add.text(400, 305, `💰 总金币: ${this.cn}`, {
      fontSize: '24px', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2002);
    
    this.add.text(400, 340, `🏆 最高连击: ${this.cbo} 次`, {
      fontSize: '18px', color: '#AAAAAA'
    }).setOrigin(0.5).setDepth(2002);
    
    // 按钮
    const nextBtn = this.add.rectangle(310, 410, 140, 50, 0x228B22)
      .setInteractive({ useHandCursor: true }).setDepth(2002);
    this.add.text(310, 410, '下一关 ▶', {
      fontSize: '18px', color: '#FFF', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2002);
    
    nextBtn.on('pointerover', () => nextBtn.setFillStyle(0x2E8B57));
    nextBtn.on('pointerout', () => nextBtn.setFillStyle(0x228B22));
    nextBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { level: this.lv + 1 });
    });
    
    const menuBtn = this.add.rectangle(490, 410, 140, 50, 0x4169E1)
      .setInteractive({ useHandCursor: true }).setDepth(2002);
    this.add.text(490, 410, '🏠 主菜单', {
      fontSize: '18px', color: '#FFF', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2002);
    
    menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x5A7AEA));
    menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x4169E1));
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    
    // 礼花效果
    this.createConfetti();
  }
  
  createConfetti() {
    const colors = [0xFF0000, 0xFFD700, 0x00FF00, 0x00CED1, 0xFF69B4, 0xFFFFFF];
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(50, 750);
      const y = Phaser.Math.Between(30, 150);
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      
      const shape = Math.random() > 0.5 
        ? this.add.rectangle(x, y, 10, 10, color).setDepth(1999)
        : this.add.circle(x, y, 5, color).setDepth(1999);
      
      this.tweens.add({
        targets: shape,
        y: y + Phaser.Math.Between(300, 500),
        x: x + Phaser.Math.Between(-150, 150),
        rotation: Phaser.Math.Between(0, 720),
        duration: Phaser.Math.Between(2000, 3500),
        ease: 'Power2',
        onComplete: () => shape.destroy()
      });
    }
  }
  
  showMsg(t, c) {
    const m = this.add.text(400, 250, t, { fontSize: '20px', color: '#FFF', backgroundColor: c.toString(16).padStart(6, '0'), padding: { x: 15, y: 8 } }).setOrigin(0.5);
    this.tweens.add({ targets: m, y: 200, alpha: 0, duration: 1500, onComplete: () => m.destroy() });
  }
  
  playCS() {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator();
      o.frequency.setValueAtTime(600, a.currentTime);
      o.connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.05);
    } catch (e) {}
  }
  
  playSS() {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator();
      o.frequency.setValueAtTime(500, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(800, a.currentTime + 0.1);
      o.connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.15);
    } catch (e) {}
  }
};

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: '#5D4037',
  scene: [BootScene, MenuScene, GameScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

new Phaser.Game(config);
