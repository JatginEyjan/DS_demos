import * as Phaser from '../../vendor/phaser.esm.js';
import { Customer } from '../entities/Customer.js';
import { Room } from '../entities/Room.js';
import { ScheduleSystem } from '../systems/ScheduleSystem.js';
import { ReputationSystem } from '../systems/ReputationSystem.js';

export class DayScene extends Phaser.Scene {
  constructor() {
    super('DayScene');
  }

  init(data) {
    this.gameData = {
      day: data.day || 1,
      money: data.money || 500,
      reputation: data.reputation || 0,
      heat: data.heat || 0,
      customersServed: data.customersServed || 0,
      customersExploded: data.customersExploded || 0,
      customersKilled: data.customersKilled || 0,
      gasTanks: data.gasTanks || 0,
      spyNetwork: data.spyNetwork || false,
      marketingActive: data.marketingActive || false,
      foodSupplyActive: data.foodSupplyActive || false
    };

    this.timeSlot = 0;
    this.timeSlotNames = ['晨间(06-10)', '正午(10-14)', '午后(14-18)', '黄昏(18-22)', '深夜(22-02)', '凌晨(02-06)'];
    this.timeRemaining = 120;
    
    this.rooms = [];
    this.waitingCustomers = [];
    this.activeCustomers = [];
    this.deadBodies = [];
    this.selectedRoom = null;
    
    this.disposalMode = 'direct';
    this.filterCapacity = 100;
    this.filterUsed = 0;
    this.tankCapacity = 100;
    this.tankLevel = 0;
  }

  create() {
    this.createBackground();
    this.createUI();
    this.createRooms();
    this.createCustomerQueue();
    this.createDisposalPanel();
    this.createRoomShop();
    this.createAcquisitionPanel();
    
    this.scheduleSystem = new ScheduleSystem(this);
    this.reputationSystem = new ReputationSystem(this);

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.onSecondTick,
      callbackScope: this
    });

    this.spawnCustomers();
    this.checkRandomEvents();
  }

  createBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x0a0a0f, 1);
    g.fillRect(0, 0, 1280, 720);
    
    g.lineStyle(1, 0x1A202C, 0.5);
    for (let x = 0; x < 1280; x += 40) {
      g.moveTo(x, 0);
      g.lineTo(x, 720);
    }
    for (let y = 0; y < 720; y += 40) {
      g.moveTo(0, y);
      g.lineTo(1280, y);
    }
    g.strokePath();
  }

  createUI() {
    this.createStatusBar();

    this.timeText = this.add.text(20, 80, this.timeSlotNames[this.timeSlot], {
      fontFamily: 'VT323', fontSize: '24px', color: '#48BB78'
    });

    this.timerText = this.add.text(20, 110, `剩余: ${this.timeRemaining}s`, {
      fontFamily: 'VT323', fontSize: '20px', color: '#718096'
    });

    this.add.text(20, 150, '等待区', { fontFamily: 'VT323', fontSize: '18px', color: '#A0AEC0' });

    this.createActionButtons();
  }

  createStatusBar() {
    const y = 20;

    this.add.image(30, y + 8, 'icon-money').setScale(1);
    this.moneyText = this.add.text(50, y, `${this.gameData.money}`, {
      fontFamily: 'VT323', fontSize: '24px', color: '#D69E2E'
    });

    this.add.text(180, y, '声望:', { fontFamily: 'VT323', fontSize: '18px', color: '#A0AEC0' });
    this.repText = this.add.text(240, y, `${this.gameData.reputation}`, {
      fontFamily: 'VT323', fontSize: '24px', color: this.gameData.reputation >= 0 ? '#48BB78' : '#E53E3E'
    });

    this.add.image(340, y + 8, 'icon-heat').setScale(1);
    this.heatText = this.add.text(360, y, `${this.gameData.heat}`, {
      fontFamily: 'VT323', fontSize: '24px', color: this.gameData.heat > 50 ? '#E53E3E' : '#ED8936'
    });

    this.add.text(500, y, `第${this.gameData.day}天`, {
      fontFamily: 'VT323', fontSize: '24px', color: '#FFFFFF'
    });

    if (this.deadBodies.length > 0) {
      this.add.text(650, y, `尸体: ${this.deadBodies.length}`, {
        fontFamily: 'VT323', fontSize: '18px', color: '#E53E3E'
      });
    }

    this.add.text(750, y, `罐: ${this.tankLevel}/${this.tankCapacity}`, {
      fontFamily: 'VT323', fontSize: '18px', color: this.tankLevel > 80 ? '#E53E3E' : '#A0AEC0'
    });
  }

  createActionButtons() {
    const btnY = 680;
    const btns = [
      { label: '接待', x: 150, action: () => this.assignCustomer() },
      { label: '驱赶', x: 280, action: () => this.rejectCustomer() },
      { label: '下时段', x: 410, action: () => this.nextTimeSlot() }
    ];

    btns.forEach(({ label, x, action }) => {
      const bg = this.add.rectangle(x, btnY, 100, 40, 0x1A202C).setStrokeStyle(2, 0x4A5568);
      const text = this.add.text(x, btnY, label, { fontFamily: 'VT323', fontSize: '20px', color: '#A0AEC0' }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { bg.setStrokeStyle(2, 0x48BB78); text.setColor('#48BB78'); });
      bg.on('pointerout', () => { bg.setStrokeStyle(2, 0x4A5568); text.setColor('#A0AEC0'); });
      bg.on('pointerdown', action);
    });
  }

  createDisposalPanel() {
    const panelX = 880, panelY = 80;
    this.add.text(panelX, panelY, '■ 气体处理', { fontFamily: 'VT323', fontSize: '18px', color: '#48BB78' });

    const modes = [
      { id: 'direct', label: '直排', cost: 0, color: '#E53E3E' },
      { id: 'filter', label: '活性炭', cost: 50, color: '#48BB78' },
      { id: 'tank', label: '储存罐', cost: 200, color: '#D69E2E' }
    ];

    modes.forEach((mode, i) => {
      const y = panelY + 35 + i * 45;
      const bg = this.add.rectangle(panelX + 90, y, 170, 32, 0x1A202C)
        .setStrokeStyle(2, this.disposalMode === mode.id ? mode.color : 0x4A5568);
      const text = this.add.text(panelX + 90, y, mode.label, {
        fontFamily: 'VT323', fontSize: '14px', color: this.disposalMode === mode.id ? mode.color : '#A0AEC0'
      }).setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        if (mode.id === 'tank' && this.tankLevel >= this.tankCapacity) {
          this.showMessage('储存罐已满！', 0xE53E3E); return;
        }
        this.disposalMode = mode.id;
        this.createDisposalPanel();
      });
    });

    if (this.tankLevel > 0) {
      const sellBtn = this.add.rectangle(panelX + 90, panelY + 180, 130, 26, 0x744210).setStrokeStyle(2, 0xD69E2E);
      this.add.text(panelX + 90, panelY + 180, '出售 (+300$)', { fontFamily: 'VT323', fontSize: '12px', color: '#D69E2E' }).setOrigin(0.5);
      sellBtn.setInteractive({ useHandCursor: true });
      sellBtn.on('pointerdown', () => {
        this.gameData.money += 300; this.tankLevel = 0;
        this.updateStatus(); this.showMessage('储存罐已出售', 0xD69E2E); this.createDisposalPanel();
      });
    }
  }

  createRoomShop() {
    const shopX = 880, shopY = 320;
    this.add.text(shopX, shopY, '■ 房间管理', { fontFamily: 'VT323', fontSize: '18px', color: '#48BB78' });

    const roomTypes = [
      { type: 'soundproof', name: '吸音密室', cost: 500 },
      { type: 'vacuum', name: '真空舱', cost: 1500 },
      { type: 'vip', name: 'VIP套房', cost: 4000 }
    ];

    roomTypes.forEach((room, i) => {
      const y = shopY + 40 + i * 55;
      const hasRoom = this.rooms.some(r => r.type === room.type);
      const bg = this.add.rectangle(shopX + 90, y, 170, 46, hasRoom ? 0x22543D : 0x1A202C).setStrokeStyle(2, hasRoom ? 0x48BB78 : 0x4A5568);
      this.add.text(shopX + 90, y - 8, room.name, { fontFamily: 'VT323', fontSize: '15px', color: hasRoom ? '#48BB78' : '#A0AEC0' }).setOrigin(0.5);
      this.add.text(shopX + 90, y + 10, hasRoom ? '已拥有' : `${room.cost}$`, { fontFamily: 'VT323', fontSize: '11px', color: hasRoom ? '#68D391' : '#718096' }).setOrigin(0.5);

      if (!hasRoom) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.buyRoom(room));
      }
    });

    this.add.text(shopX, shopY + 220, `空间: ${this.rooms.length}/8`, { fontFamily: 'VT323', fontSize: '14px', color: '#A0AEC0' });

    if (this.rooms.length < 8) {
      const expandBtn = this.add.rectangle(shopX + 90, shopY + 255, 130, 28, 0x2D3748).setStrokeStyle(2, 0xD69E2E);
      this.add.text(shopX + 90, shopY + 255, '扩建 (2000$)', { fontFamily: 'VT323', fontSize: '13px', color: '#D69E2E' }).setOrigin(0.5);
      expandBtn.setInteractive({ useHandCursor: true });
      expandBtn.on('pointerdown', () => {
        if (this.gameData.money >= 2000) {
          this.gameData.money -= 2000; this.addBasicRoom(); this.updateStatus(); this.showMessage('扩建完成', 0x48BB78);
        } else { this.showMessage('资金不足', 0xE53E3E); }
      });
    }
  }

  createAcquisitionPanel() {
    const panelX = 1060, panelY = 80;
    this.add.text(panelX, panelY, '■ 获客渠道', { fontFamily: 'VT323', fontSize: '18px', color: '#48BB78' });

    // Marketing
    const mY = panelY + 40;
    const mBg = this.add.rectangle(panelX + 70, mY, 130, 50, this.gameData.marketingActive ? 0x22543D : 0x1A202C).setStrokeStyle(2, this.gameData.marketingActive ? 0x48BB78 : 0x4A5568);
    this.add.text(panelX + 70, mY - 10, '地下营销', { fontFamily: 'VT323', fontSize: '14px', color: '#A0AEC0' }).setOrigin(0.5);
    this.add.text(panelX + 70, mY + 8, this.gameData.marketingActive ? '运行中' : '100$/天', { fontFamily: 'VT323', fontSize: '12px', color: this.gameData.marketingActive ? '#48BB78' : '#718096' }).setOrigin(0.5);
    mBg.setInteractive({ useHandCursor: true });
    mBg.on('pointerdown', () => {
      if (!this.gameData.marketingActive && this.gameData.money >= 100) {
        this.gameData.marketingActive = true; this.showMessage('营销启动！获客+20%', 0x48BB78);
      } else if (this.gameData.marketingActive) {
        this.gameData.marketingActive = false; this.showMessage('营销停止', 0xED8936);
      }
      this.createAcquisitionPanel();
    });

    // Food supply
    const fY = panelY + 105;
    const fBg = this.add.rectangle(panelX + 70, fY, 130, 50, this.gameData.foodSupplyActive ? 0x22543D : 0x1A202C).setStrokeStyle(2, this.gameData.foodSupplyActive ? 0x48BB78 : 0x4A5568);
    this.add.text(panelX + 70, fY - 10, '食物供应', { fontFamily: 'VT323', fontSize: '14px', color: '#A0AEC0' }).setOrigin(0.5);
    this.add.text(panelX + 70, fY + 8, this.gameData.foodSupplyActive ? '运行中' : '150$/天', { fontFamily: 'VT323', fontSize: '12px', color: this.gameData.foodSupplyActive ? '#48BB78' : '#718096' }).setOrigin(0.5);
    fBg.setInteractive({ useHandCursor: true });
    fBg.on('pointerdown', () => {
      if (!this.gameData.foodSupplyActive && this.gameData.money >= 150) {
        this.gameData.foodSupplyActive = true; this.showMessage('食物供应启动！产能x3', 0x48BB78);
      } else if (this.gameData.foodSupplyActive) {
        this.gameData.foodSupplyActive = false; this.showMessage('食物供应停止', 0xED8936);
      }
      this.createAcquisitionPanel();
    });
  }

  buyRoom(roomConfig) {
    if (this.gameData.money < roomConfig.cost) { this.showMessage('资金不足', 0xE53E3E); return; }
    const positions = [{ x: 800, y: 200 }, { x: 800, y: 400 }, { x: 400, y: 600 }, { x: 600, y: 600 }, { x: 200, y: 200 }, { x: 200, y: 400 }, { x: 200, y: 600 }, { x: 800, y: 600 }];
    const pos = positions[this.rooms.length];
    if (!pos) { this.showMessage('无可用空间', 0xE53E3E); return; }
    this.gameData.money -= roomConfig.cost;
    const room = new Room(this, pos.x, pos.y, roomConfig.type, this.rooms.length);
    this.rooms.push(room);
    this.updateStatus(); this.showMessage(`购买${roomConfig.name}`, 0x48BB78); this.createRoomShop();
  }

  addBasicRoom() {
    const positions = [{ x: 400, y: 200 }, { x: 600, y: 200 }, { x: 400, y: 400 }, { x: 600, y: 400 }, { x: 800, y: 200 }, { x: 800, y: 400 }, { x: 200, y: 200 }, { x: 200, y: 400 }];
    const pos = positions[this.rooms.length];
    const room = new Room(this, pos.x, pos.y, 'basic', this.rooms.length);
    this.rooms.push(room);
  }

  createRooms() { this.addBasicRoom(); this.addBasicRoom(); }
  createCustomerQueue() { this.queueContainer = this.add.container(20, 180); }

  spawnCustomers() {
    let count = Phaser.Math.Between(3, 5);
    if (this.gameData.marketingActive) { count = Math.floor(count * 1.2); this.gameData.money -= 100; }

    const types = ['civilian', 'middle', 'elite'];
    if (this.gameData.reputation > 20) types.push('vip');

    const spyChance = Math.max(0.05, 0.2 - (this.gameData.reputation / 200));

    for (let i = 0; i < count; i++) {
      const type = types[Phaser.Math.Between(0, types.length - 1)];
      const isSpy = Math.random() < spyChance;
      const customer = new Customer(this, 0, i * 60, type, isSpy);
      if (this.gameData.foodSupplyActive) {
        customer.pressure = Phaser.Math.Between(40, 70);
        customer.stats.gasAmount *= 3;
      }
      this.waitingCustomers.push(customer);
      this.queueContainer.add(customer.getSprite());
    }
    this.updateQueueDisplay();
  }

  updateQueueDisplay() {
    this.waitingCustomers.forEach((customer, index) => customer.setPosition(0, index * 60));
  }

  assignCustomer() {
    if (this.waitingCustomers.length === 0) return;
    const emptyRoom = this.rooms.find(r => !r.isOccupied() && !r.isBroken);
    if (!emptyRoom) { this.showMessage('没有空房间！', 0xE53E3E); return; }

    const customer = this.waitingCustomers.shift();
    if (customer.isSpy && !this.gameData.spyNetwork && Math.random() < 0.5) {
      this.showMessage('⚠️ 发现卧底！已拒绝', 0xED8936);
      this.gameData.reputation += 5;
      customer.destroy();
      this.updateQueueDisplay();
      return;
    }

    emptyRoom.assignCustomer(customer);
    this.activeCustomers.push(customer);
    this.updateQueueDisplay();
    this.showMessage('客户已接待', 0x48BB78);
  }

  rejectCustomer() {
    if (this.waitingCustomers.length === 0) return;
    const customer = this.waitingCustomers.shift();
    if (customer.isSpy) {
      this.showMessage('成功拒绝卧底！', 0x48BB78);
      this.gameData.reputation += 5;
    } else {
      this.gameData.reputation -= 5;
    }
    customer.destroy();
    this.updateStatus(); this.updateQueueDisplay();
  }

  checkRandomEvents() {
    if (this.timeSlot === 1 && this.gameData.reputation > 10 && Math.random() < 0.3) {
      this.triggerVIPCutEvent();
    }
  }

  triggerVIPCutEvent() {
    this.scene.pause();
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x0a0a0f, 0.9);
    this.add.text(640, 200, '⚠️ 紧急来电', { fontFamily: 'VT323', fontSize: '36px', color: '#E53E3E' }).setOrigin(0.5);
    this.add.text(640, 280, '市政官秘书长要求插队。\n但前面还有3个憋压90+的平民...', {
      fontFamily: 'VT323', fontSize: '20px', color: '#D69E2E', align: 'center'
    }).setOrigin(0.5);

    const options = [
      { y: 400, label: '拒绝插队 (声望+10)', action: () => { this.gameData.reputation += 10; this.showMessage('维护了秩序', 0x48BB78); this.closeEvent(overlay); }},
      { y: 460, label: '接受插队 (+500$, 声望-15, 风险+20)', action: () => {
        this.gameData.money += 500; this.gameData.reputation -= 15; this.gameData.heat += 20;
        const civilian = this.waitingCustomers.find(c => c.type === 'civilian');
        if (civilian) civilian.pressure = 100;
        this.showMessage('秘书长满意离开', 0xD69E2E); this.closeEvent(overlay);
      }}
    ];

    options.forEach(opt => {
      const bg = this.add.rectangle(640, opt.y, 400, 40, 0x1A202C).setStrokeStyle(2, 0x4A5568);
      const text = this.add.text(640, opt.y, opt.label, { fontFamily: 'VT323', fontSize: '18px', color: '#A0AEC0' }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { bg.setStrokeStyle(2, 0x48BB78); text.setColor('#48BB78'); });
      bg.on('pointerout', () => { bg.setStrokeStyle(2, 0x4A5568); text.setColor('#A0AEC0'); });
      bg.on('pointerdown', opt.action);
    });
  }

  closeEvent(overlay) { overlay.destroy(); this.scene.resume(); this.updateStatus(); }

  nextTimeSlot() {
    this.timeSlot++;
    if (this.timeSlot >= 6) { this.endDay(); return; }

    this.timeRemaining = 120;
    this.timeText.setText(this.timeSlotNames[this.timeSlot]);

    if (this.gameData.foodSupplyActive) this.gameData.money -= 150;
    if (this.filterUsed > 0) this.filterUsed = Math.max(0, this.filterUsed - 20);

    if (this.tankLevel >= this.tankCapacity) {
      this.showMessage('💥 储存罐爆炸！', 0xE53E3E);
      this.gameOver('大爆炸');
      return;
    }

    if (this.gameData.heat > 70 && Phaser.Math.Between(0, 100) < this.gameData.heat) {
      this.triggerInspection();
    }

    this.spawnCustomers();
    this.checkRandomEvents();
  }

  onSecondTick() {
    this.timeRemaining--;
    this.timerText.setText(`剩余: ${this.timeRemaining}s`);
    this.waitingCustomers.forEach(c => c.update(1, this.gameData.heat));
    this.rooms.forEach(room => { if (room.isOccupied()) room.update(1, this.disposalMode, this); });
    this.checkExplosions();
    if (this.timeRemaining <= 0) this.nextTimeSlot();
  }

  checkExplosions() {
    [...this.waitingCustomers, ...this.activeCustomers].forEach(customer => {
      if (customer.getPressure() >= 100 && !customer.dead) this.triggerExplosion(customer);
    });
  }

  triggerExplosion(customer) {
    customer.setDead('explosion');
    this.gameData.customersExploded++;
    this.gameData.heat += 20;

    const inWaiting = this.waitingCustomers.indexOf(customer);
    if (inWaiting > -1) this.waitingCustomers.splice(inWaiting, 1);
    else {
      const inActive = this.activeCustomers.indexOf(customer);
      if (inActive > -1) {
        this.activeCustomers.splice(inActive, 1);
        this.rooms.forEach(r => { if (r.getCustomer() === customer) r.clearCustomer(); });
      }
    }

    customer.destroy();
    this.updateQueueDisplay(); this.updateStatus();
    this.cameras.main.flash(500, 0xE53E3E);
    this.showMessage('💥 客户憋炸了！热量+20', 0xE53E3E);

    if (this.gameData.customersExploded >= 5) this.gameOver('大爆炸');
  }

  triggerInspection() {
    this.showMessage('⚠️ 监听者巡查...', 0xED8936);
    const compromised = this.rooms.filter(r => r.isCompromised());
    if (compromised.length > 0) this.gameOver('被捕');
  }

  endDay() {
    const served = this.activeCustomers.filter(c => c.isReleased());
    const income = served.reduce((sum, c) => sum + c.getIncome(), 0);
    this.gameData.money += income;
    this.gameData.customersServed += served.length;
    this.gameData.day++;
    this.gameData.heat = Math.max(0, this.gameData.heat - 10);

    this.activeCustomers.forEach(c => c.destroy());
    this.activeCustomers = [];
    this.rooms.forEach(r => r.clearCustomer());

    const ending = this.reputationSystem.checkEndingConditions(this.gameData);
    if (ending) { this.gameOver(ending); return; }

    localStorage.setItem('ds16-save', JSON.stringify(this.gameData));
    this.scene.restart(this.gameData);
  }

  gameOver(ending) { this.scene.start('EndingScene', { ending, ...this.gameData }); }

  updateStatus() {
    this.moneyText.setText(`${this.gameData.money}`);
    this.repText.setText(`${this.gameData.reputation}`);
    this.heatText.setText(`${this.gameData.heat}`);
  }

  showMessage(text, color) {
    const msg = this.add.text(640, 360, text, {
      fontFamily: 'VT323', fontSize: '32px', color: `#${color.toString(16).padStart(6, '0')}`
    }).setOrigin(0.5);
    this.tweens.add({ targets: msg, y: 300, alpha: 0, duration: 1500, onComplete: () => msg.destroy() });
  }
}
