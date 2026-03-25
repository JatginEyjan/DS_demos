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
    
    this.cont = scene.add.container(x, y);
    this.bg = scene.add.rectangle(0, 0, 200, 140, 0xFFF8DC)
      .setStrokeStyle(2, 0x8B4513);
    this.cont.add(this.bg);
    
    const names = { candy: '糖果订单', dumpling: '饺子订单', lantern: '灯笼订单', redpacket: '红包订单' };
    this.cont.add(scene.add.text(0, -50, names[this.req.t], {
      fontSize: '16px', color: '#8B0000', fontStyle: 'bold'
    }).setOrigin(0.5));
    
    const icons = { candy: '🍬', dumpling: '🥟', lantern: '🏮', redpacket: '🧧' };
    this.cont.add(scene.add.text(0, -20, icons[this.req.t], {
      fontSize: '32px'
    }).setOrigin(0.5));
    
    this.pt = scene.add.text(0, 15, `${icons[this.req.t]} 0/${this.req.c}`, {
      fontSize: '18px', color: '#333', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.cont.add(this.pt);
    
    this.cont.add(scene.add.text(0, 50, `💰 ${this.rw}`, {
      fontSize: '14px', color: '#FFD700'
    }).setOrigin(0.5));
    
    this.stk = scene.add.container(0, -75);
    this.cont.add(this.stk);
    
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => { if (!this.comp) this.bg.setFillStyle(0xFFFFE0); });
    this.bg.on('pointerout', () => { if (!this.comp) this.bg.setFillStyle(0xFFF8DC); });
    this.bg.on('pointerdown', () => this.onClick());
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
    this.add.text(width / 2, height / 3 + 70, '✨ 订单暂存', { fontSize: '22px', color: '#FFA500' }).setOrigin(0.5);
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
    const r = ['【核心】', '• 3槽×15张上限', '• 批量发牌(1-5张)', '• 槽间移动', '', '【订单暂存】', '• 部分交付，显示进度', '• 多槽凑齐订单'];
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
    this.tg = 3;
    this.comp = 0;
    this.cn = 0;
    this.lot = 0;
    this.cbo = 0;
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
    const sx = 200, sp = 200, y = 320;
    for (let i = 0; i < 3; i++) {
      this.sl.push(new Slot(this, i, sx + i * sp, y));
    }
  }
  
  crtOrd() {
    const cf = [{ t: 'candy', c: 5, r: 100 }, { t: 'dumpling', c: 6, r: 120 }, { t: 'lantern', c: 5, r: 100 }];
    for (let i = 0; i < 3; i++) {
      const x = 150 + i * 250, c = cf[i];
      this.ords.push(new Order(this, x, 100, { id: i, req: { t: c.t, c: c.c }, rw: c.r }));
    }
  }
  
  crtUI() {
    this.add.text(20, 15, `第${this.lv}关`, { fontSize: '20px', color: '#FFD700', fontStyle: 'bold' });
    this.cnt = this.add.text(150, 15, '💰 0', { fontSize: '18px', color: '#FFD700' });
    this.pgt = this.add.text(500, 15, '订单: 0/3', { fontSize: '16px', color: '#FFF' });
    
    this.cbt = this.add.text(400, 200, '', {
      fontSize: '36px', color: '#FFD700', fontStyle: 'bold',
      stroke: '#FF6600', strokeThickness: 4
    }).setOrigin(0.5).setVisible(false).setDepth(1000);
    
    this.dpb = this.add.rectangle(720, 480, 100, 80, 0x654321).setInteractive({ useHandCursor: true });
    this.add.text(720, 460, '📦', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(720, 490, '发牌', { fontSize: '14px', color: '#FFF' }).setOrigin(0.5);
    this.dpct = this.add.text(720, 520, '40张', { fontSize: '12px', color: '#FFD700' }).setOrigin(0.5);
    this.dpb.on('pointerdown', () => this.deal());
    
    const mb = this.add.rectangle(720, 560, 80, 35, 0x666666).setInteractive({ useHandCursor: true });
    this.add.text(720, 560, '菜单', { fontSize: '14px', color: '#FFF' }).setOrigin(0.5);
    mb.on('pointerdown', () => this.scene.start('MenuScene'));
    
    this.add.text(400, 585, '点击槽选中 | 点击槽移动 | 点击订单交付(支持部分)', { fontSize: '12px', color: '#CCC' }).setOrigin(0.5);
  }
  
  dealInit() {
    const t = ['candy', 'dumpling', 'lantern', 'redpacket'];
    const ic = [];
    for (let i = 0; i < 10; i++) ic.push(new Card(t[Math.floor(Math.random() * t.length)]));
    const d = [4, 3, 3];
    let ci = 0;
    for (let i = 0; i < 3; i++) {
      this.sl[i].addC(ic.slice(ci, ci + d[i]));
      ci += d[i];
    }
    for (let i = 0; i < 40; i++) this.dp.push(new Card(t[Math.floor(Math.random() * t.length)]));
    this.updDPC();
  }
  
  deal() {
    let ad = false;
    for (const s of this.sl) {
      if (s.cds.length >= 15) continue;
      const dc = Phaser.Math.Between(1, 5);
      const sp = 15 - s.cds.length;
      const ac = Math.min(dc, sp, this.dp.length);
      if (ac <= 0) continue;
      this.animDeal(s, ac);
      const cd = this.dp.splice(0, ac);
      this.time.delayedCall(300, () => s.addC(cd));
      ad = true;
    }
    if (!ad) this.showMsg('所有卡槽已满或牌堆空', 0xFF0000);
    else this.updDPC();
  }
  
  animDeal(s, c) {
    for (let i = 0; i < c; i++) {
      const sp = this.add.sprite(720, 480, 'cardback').setScale(0.4).setDepth(1000);
      this.tweens.add({
        targets: sp, x: s.x, y: s.y, scale: 0.6,
        duration: 300, delay: i * 80, ease: 'Power2',
        onComplete: () => sp.destroy()
      });
    }
  }
  
  updDPC() { this.dpct.setText(`${this.dp.length}张`); }
  
  onSlClick(s) {
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
    const b = Math.floor(10 * (c - 1));
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
    this.pgt.setText(`订单: ${this.comp}/3`);
    this.cn += o.rw;
    this.cnt.setText(`💰 ${this.cn}`);
    this.showMsg(`订单完成! +${o.rw}金币`, 0x00FF00);
    if (this.ss) { this.ss.desel(); this.ss = null; }
    
    // 检查是否完成所有订单（通关）
    if (this.comp >= 3) {
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
    
    // 生成新订单
    const types = ['candy', 'dumpling', 'lantern', 'redpacket'];
    const t = types[Math.floor(Math.random() * types.length)];
    const c = 4 + Math.floor(Math.random() * 3); // 4-6张
    const r = 80 + Math.floor(Math.random() * 40); // 80-120金币
    
    const x = 150 + idx * 250;
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
    if (this.cn >= 400) stars = 3;
    else if (this.cn >= 300) stars = 2;
    
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
