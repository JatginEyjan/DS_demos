import * as Phaser from '../../vendor/phaser.esm.js';
import { Customer } from '../entities/Customer.js';
import { Room } from '../entities/Room.js';
import { ScheduleSystem } from '../systems/ScheduleSystem.js';
import { ReputationSystem } from '../systems/ReputationSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';

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
      foodSupplyActive: data.foodSupplyActive || false,
      debt: data.debt || 0,
      vipUnlocked: data.vipUnlocked || false,
      satisfiedCustomers: data.satisfiedCustomers || 0,
      evidenceCount: data.evidenceCount || 0,
      hasReformerEnding: data.hasReformerEnding || false
    };

    this.audioSystem = new AudioSystem(this);

    this.timeSlot = 0;
    this.timeSlotNames = ['晨间(06-10)', '正午(10-14)', '午后(14-18)', '黄昏(18-22)', '深夜(22-02)', '凌晨(02-06)'];
    this.timeRemaining = 120;
    
    this.rooms = [];
    this.waitingCustomers = [];
    this.activeCustomers = [];
    this.deadBodies = [];
    this.selectedCustomer = null; // For spy interaction
    
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
    this.createBodyDisposalPanel(); // Create but hide initially
    this.createSpyNetworkPanel(); // Anti-report defense panel
    
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

    this.add.text(20, 150, '等待区 (点击可疑客户处理)', { 
      fontFamily: 'VT323', fontSize: '18px', color: '#A0AEC0' 
    });

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

    // Body count indicator
    if (this.deadBodies.length > 0) {
      this.bodyCountText = this.add.text(650, y, `尸体: ${this.deadBodies.length}`, {
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

  // NEW: Body disposal panel that shows when there are dead bodies
  createBodyDisposalPanel() {
    this.bodyPanelContainer = this.add.container(1060, 320);
    this.updateBodyDisposalPanel();
  }

  updateBodyDisposalPanel() {
    this.bodyPanelContainer.removeAll(true);
    
    if (this.deadBodies.length === 0) return;

    this.bodyPanelContainer.add(
      this.add.text(0, 0, '■ 尸体处理', { fontFamily: 'VT323', fontSize: '18px', color: '#E53E3E' })
    );

    this.bodyPanelContainer.add(
      this.add.text(0, 25, `待处理: ${this.deadBodies.length}`, { fontFamily: 'VT323', fontSize: '14px', color: '#A0AEC0' })
    );

    const methods = [
      { label: '秘密埋葬 (-500$)', y: 55, cost: -500, rep: 0, risk: 0.1 },
      { label: '卖给黑市 (+200$)', y: 95, cost: 200, rep: -30, risk: 0 },
      { label: '伪装死亡 (-800$)', y: 135, cost: -800, rep: 0, risk: 0 }
    ];

    methods.forEach(method => {
      const btn = this.add.rectangle(70, method.y, 130, 32, 0x1A202C).setStrokeStyle(2, 0x4A5568);
      const text = this.add.text(70, method.y, method.label, { fontFamily: 'VT323', fontSize: '12px', color: '#A0AEC0' }).setOrigin(0.5);
      
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => { btn.setStrokeStyle(2, 0xE53E3E); text.setColor('#E53E3E'); });
      btn.on('pointerout', () => { btn.setStrokeStyle(2, 0x4A5568); text.setColor('#A0AEC0'); });
      btn.on('pointerdown', () => this.disposeBody(method));
      
      this.bodyPanelContainer.add([btn, text]);
    });
  }

  disposeBody(method) {
    if (this.deadBodies.length === 0) return;
    if (this.gameData.money + method.cost < 0) {
      this.showMessage('资金不足！', 0xE53E3E); return;
    }

    this.gameData.money += method.cost;
    this.gameData.reputation += method.rep;
    this.deadBodies.shift();

    if (method.risk > 0 && Math.random() < method.risk) {
      this.showMessage('埋葬被发现！游戏结束', 0xE53E3E);
      this.gameOver('被捕');
      return;
    }

    this.showMessage(`尸体已处理`, 0x718096);
    this.updateStatus();
    this.updateBodyDisposalPanel();
  }

  // NEW: Spy network / anti-report defense panel
  createSpyNetworkPanel() {
    this.spyPanelContainer = this.add.container(1060, 500);
    this.updateSpyNetworkPanel();
  }

  updateSpyNetworkPanel() {
    this.spyPanelContainer.removeAll(true);
    
    this.spyPanelContainer.add(
      this.add.text(0, 0, '■ 反举报防御', { fontFamily: 'VT323', fontSize: '18px', color: '#48BB78' })
    );

    // Hush money button
    const hushY = 35;
    const hushBtn = this.add.rectangle(70, hushY, 130, 32, 0x1A202C).setStrokeStyle(2, 0x4A5568);
    const hushText = this.add.text(70, hushY, '预付封口费 (100$)', { fontFamily: 'VT323', fontSize: '11px', color: '#A0AEC0' }).setOrigin(0.5);
    hushBtn.setInteractive({ useHandCursor: true });
    hushBtn.on('pointerover', () => { hushBtn.setStrokeStyle(2, 0x48BB78); hushText.setColor('#48BB78'); });
    hushBtn.on('pointerout', () => { hushBtn.setStrokeStyle(2, 0x4A5568); hushText.setColor('#A0AEC0'); });
    hushBtn.on('pointerdown', () => this.payHushMoney());
    this.spyPanelContainer.add([hushBtn, hushText]);

    // Spy network button
    const netY = 75;
    const netBtn = this.add.rectangle(70, netY, 130, 32, this.gameData.spyNetwork ? 0x22543D : 0x1A202C)
      .setStrokeStyle(2, this.gameData.spyNetwork ? 0x48BB78 : 0x4A5568);
    const netText = this.add.text(70, netY, this.gameData.spyNetwork ? '眼线网运行中' : '建立眼线网 (200$/天)', {
      fontFamily: 'VT323', fontSize: '11px', color: this.gameData.spyNetwork ? '#48BB78' : '#A0AEC0'
    }).setOrigin(0.5);
    netBtn.setInteractive({ useHandCursor: true });
    netBtn.on('pointerdown', () => this.toggleSpyNetwork());
    this.spyPanelContainer.add([netBtn, netText]);

    // Faulty room button (for spies in rooms)
    const faultY = 115;
    const faultBtn = this.add.rectangle(70, faultY, 130, 32, 0x1A202C).setStrokeStyle(2, 0x4A5568);
    const faultText = this.add.text(70, faultY, '标记故障房 (灭口)', { fontFamily: 'VT323', fontSize: '11px', color: '#E53E3E' }).setOrigin(0.5);
    faultBtn.setInteractive({ useHandCursor: true });
    faultBtn.on('pointerover', () => { faultBtn.setStrokeStyle(2, 0xE53E3E); });
    faultBtn.on('pointerout', () => { faultBtn.setStrokeStyle(2, 0x4A5568); });
    faultBtn.on('pointerdown', () => this.triggerFaultyRoom());
    this.spyPanelContainer.add([faultBtn, faultText]);
  }

  payHushMoney() {
    if (this.gameData.money < 100) {
      this.showMessage('资金不足', 0xE53E3E); return;
    }
    this.gameData.money -= 100;
    this.gameData.heat = Math.max(0, this.gameData.heat - 10);
    this.showMessage('封口费已支付，风险降低', 0x48BB78);
    this.updateStatus();
  }

  toggleSpyNetwork() {
    if (!this.gameData.spyNetwork) {
      if (this.gameData.money >= 200) {
        this.gameData.spyNetwork = true;
        this.showMessage('眼线网建立！声望+10', 0x48BB78);
        this.gameData.reputation += 10;
      } else {
        this.showMessage('资金不足', 0xE53E3E);
      }
    } else {
      this.gameData.spyNetwork = false;
      this.showMessage('眼线网解散', 0xED8936);
    }
    this.updateSpyNetworkPanel();
  }

  triggerFaultyRoom() {
    // Find a room with a spy customer
    const spyRoom = this.rooms.find(r => r.customer && r.customer.isSpy);
    if (!spyRoom) {
      this.showMessage('没有可疑客户在使用房间', 0xED8936); return;
    }
    
    // Kill the spy
    spyRoom.customer.dead = true;
    spyRoom.customer.deathCause = 'faulty_room';
    this.deadBodies.push({ type: spyRoom.customer.type, cause: 'faulty_room', time: Date.now() });
    this.gameData.customersKilled++;
    this.gameData.reputation -= 20;
    this.gameData.heat = Math.max(0, this.gameData.heat - 15);
    
    spyRoom.clearCustomer();
    spyRoom.isBroken = true; // Room needs repair
    
    this.showMessage('卧底已"意外"死亡，声望-20', 0xE53E3E);
    this.updateStatus();
    this.updateBodyDisposalPanel();
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
    // Expansion risk: 30% chance of hitting listening device
    if (Math.random() < 0.3) {
      this.showMessage('⚠️ 扩建时发现监听设备！', 0xE53E3E);
      this.triggerExpansionRiskEvent();
    }
    
    const positions = [{ x: 400, y: 200 }, { x: 600, y: 200 }, { x: 400, y: 400 }, { x: 600, y: 400 }, { x: 800, y: 200 }, { x: 800, y: 400 }, { x: 200, y: 200 }, { x: 200, y: 400 }];
    const pos = positions[this.rooms.length];
    const room = new Room(this, pos.x, pos.y, 'basic', this.rooms.length);
    this.rooms.push(room);
  }

  triggerExpansionRiskEvent() {
    this.gameData.heat += 15;
    this.gameData.reputation -= 5;
    // Could trigger game over if heat too high
    if (this.gameData.heat >= 100) {
      this.gameOver('被捕');
    }
  }

  createRooms() { this.addBasicRoom(); this.addBasicRoom(); }
  createCustomerQueue() { this.queueContainer = this.add.container(20, 180); }

  spawnCustomers() {
    let count = Phaser.Math.Between(3, 5);
    if (this.gameData.marketingActive) { count = Math.floor(count * 1.2); }

    // Special customer types with different traits
    const specialTypes = [
      { type: 'civilian', subtype: 'rushed', name: '急性子商人', pressureRate: 12, patience: 30, incomeBonus: 2.0, duration: 20 },
      { type: 'middle', subtype: 'constipated', name: '便秘患者', pressureRate: 3, patience: 180, incomeBonus: 1.0, duration: 300, needsMedicine: true },
      { type: 'civilian', subtype: 'nervous', name: '紧张新手', pressureRate: 10, patience: 45, incomeBonus: 0.8, duration: Phaser.Math.Between(60, 300) }
    ];

    const types = ['civilian', 'middle', 'elite'];
    // VIP unlock via word of mouth: serve 10+ customers with good reputation
    if (this.gameData.satisfiedCustomers >= 10 && this.gameData.reputation > 10) {
      if (!this.gameData.vipUnlocked) {
        this.gameData.vipUnlocked = true;
        this.showMessage('口碑传播！VIP客户已解锁', 0xD69E2E);
      }
      types.push('vip');
    } else if (this.gameData.reputation > 20) {
      types.push('vip'); // Original condition as fallback
    }

    const spyChance = Math.max(0.05, 0.2 - (this.gameData.reputation / 200));

    for (let i = 0; i < count; i++) {
      // 30% chance for special customer type
      let customer;
      if (Math.random() < 0.3) {
        const special = specialTypes[Phaser.Math.Between(0, specialTypes.length - 1)];
        customer = new Customer(this, 0, i * 60, special.type, false, special);
      } else {
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        const isSpy = Math.random() < spyChance;
        customer = new Customer(this, 0, i * 60, type, isSpy);
      }
      
      // Make spy customers clickable for interaction
      if (isSpy) {
        customer.getSprite().setInteractive({ useHandCursor: true });
        customer.getSprite().on('pointerdown', () => this.triggerSpyDecision(customer));
      }
      
      if (this.gameData.foodSupplyActive) {
        customer.pressure = Phaser.Math.Between(40, 70);
        customer.stats.gasAmount *= 3;
      }
      this.waitingCustomers.push(customer);
      this.queueContainer.add(customer.getSprite());
    }
    this.updateQueueDisplay();
  }

  // NEW: Spy decision event when clicking on a spy
  triggerSpyDecision(customer) {
    if (!customer.isSpy || customer.inRoom) return;
    
    this.scene.pause();
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x0a0a0f, 0.95);
    
    this.add.text(640, 180, '⚠️ 可疑客户', { fontFamily: 'VT323', fontSize: '36px', color: '#E53E3E' }).setOrigin(0.5);
    this.add.text(640, 240, '此客户行为异常：东张西望、不问价、直接要最好房间...', {
      fontFamily: 'VT323', fontSize: '18px', color: '#D69E2E', align: 'center'
    }).setOrigin(0.5);

    const options = [
      { y: 320, label: 'A. 正常接待 - 可能是卧底，风险极高', color: '#E53E3E', action: () => {
        if (Math.random() < 0.7) {
          this.closeEvent(overlay);
          this.gameOver('被捕');
          return;
        }
        this.showMessage('侥幸无事...', 0x48BB78);
        this.closeEvent(overlay);
        this.assignSpecificCustomer(customer);
      }},
      { y: 380, label: 'B. 拒绝服务 - 如果不是卧底，声望-10', color: '#ED8936', action: () => {
        const idx = this.waitingCustomers.indexOf(customer);
        if (idx > -1) {
          this.waitingCustomers.splice(idx, 1);
          customer.destroy();
        }
        this.gameData.reputation -= 10;
        this.showMessage('已拒绝', 0xED8936);
        this.closeEvent(overlay);
      }},
      { y: 440, label: 'C. "意外"处理 - 安排进故障房灭口，道德-20', color: '#718096', action: () => {
        const idx = this.waitingCustomers.indexOf(customer);
        if (idx > -1) {
          this.waitingCustomers.splice(idx, 1);
          this.deadBodies.push({ type: customer.type, cause: 'faulty_room', time: Date.now() });
          this.gameData.customersKilled++;
          this.gameData.reputation -= 20;
          this.gameData.heat = Math.max(0, this.gameData.heat - 15);
          customer.destroy();
        }
        this.showMessage('卧底已"意外"死亡', 0x718096);
        this.closeEvent(overlay);
      }}
    ];

    options.forEach(opt => {
      const bg = this.add.rectangle(640, opt.y, 450, 40, 0x1A202C).setStrokeStyle(2, 0x4A5568);
      const text = this.add.text(640, opt.y, opt.label, { fontFamily: 'VT323', fontSize: '16px', color: opt.color }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { bg.setStrokeStyle(2, 0x48BB78); text.setColor('#48BB78'); });
      bg.on('pointerout', () => { bg.setStrokeStyle(2, 0x4A5568); text.setColor(opt.color); });
      bg.on('pointerdown', opt.action);
    });
  }

  assignSpecificCustomer(customer) {
    const emptyRoom = this.rooms.find(r => !r.isOccupied() && !r.isBroken);
    if (!emptyRoom) return;
    
    const idx = this.waitingCustomers.indexOf(customer);
    if (idx > -1) this.waitingCustomers.splice(idx, 1);
    
    emptyRoom.assignCustomer(customer);
    this.activeCustomers.push(customer);
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
    
    // Spy check with network bonus
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
    
    // Resource shortage event at start of last timeslot if low money
    if (this.timeSlot === 4 && this.gameData.money < 100) {
      this.triggerResourceShortageEvent();
    }
    
    // Equipment failure: soundproof layer aging
    if (this.gameData.day > 3 && Math.random() < 0.15) {
      this.triggerEquipmentFailureEvent();
    }
    
    // Evidence collection for reformer ending
    if (this.gameData.day > 10 && this.gameData.reputation > 30 && Math.random() < 0.1) {
      this.triggerEvidenceEvent();
    }
  }

  triggerEvidenceEvent() {
    this.scene.pause();
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x0a0a0f, 0.95);
    
    this.add.text(640, 180, '📁 意外发现', { fontFamily: 'VT323', fontSize: '36px', color: '#48BB78' }).setOrigin(0.5);
    this.add.text(640, 240, '一位匿名客户偷偷塞给你一份文件...\n是《静音法案》的内部执行记录！', {
      fontFamily: 'VT323', fontSize: '18px', color: '#D69E2E', align: 'center'
    }).setOrigin(0.5);
    this.add.text(640, 300, `当前证据: ${this.gameData.evidenceCount}/5`, {
      fontFamily: 'VT323', fontSize: '20px', color: '#48BB78'
    }).setOrigin(0.5);

    const options = [
      { y: 380, label: 'A. 接受并隐藏 (证据+1, 风险+10)', action: () => {
        this.gameData.evidenceCount++;
        this.gameData.heat += 10;
        this.showMessage('证据已收集！', 0x48BB78);
        if (this.gameData.evidenceCount >= 5) {
          this.closeEvent(overlay);
          this.triggerReformerEnding();
        } else {
          this.closeEvent(overlay);
        }
      }},
      { y: 440, label: 'B. 拒绝 (安全但无进展)', action: () => {
        this.showMessage('谨慎行事', 0xA0AEC0);
        this.closeEvent(overlay);
      }}
    ];

    options.forEach(opt => {
      const bg = this.add.rectangle(640, opt.y, 400, 40, 0x1A202C).setStrokeStyle(2, 0x4A5568);
      const text = this.add.text(640, opt.y, opt.label, { fontFamily: 'VT323', fontSize: '16px', color: '#A0AEC0' }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { bg.setStrokeStyle(2, 0x48BB78); text.setColor('#48BB78'); });
      bg.on('pointerout', () => { bg.setStrokeStyle(2, 0x4A5568); text.setColor('#A0AEC0'); });
      bg.on('pointerdown', opt.action);
    });
  }

  triggerReformerEnding() {
    this.scene.pause();
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x0a0a0f, 0.95);
    
    this.add.text(640, 200, '📢 真相大白', { fontFamily: 'VT323', fontSize: '48px', color: '#48BB78' }).setOrigin(0.5);
    this.add.text(640, 300, '你收集了足够的证据，匿名提交给媒体。
《静音法案》的残酷真相曝光，
引发全社会大讨论。', {
      fontFamily: 'VT323', fontSize: '20px', color: '#D69E2E', align: 'center'
    }).setOrigin(0.5);
    
    this.time.delayedCall(4000, () => {
      this.gameData.hasReformerEnding = true;
      this.saveToLocalStorage();
      this.gameOver('改革者');
    });
  }

  saveToLocalStorage() {
    // Save completed run data for new game+
    const completedRuns = JSON.parse(localStorage.getItem('ds16-completed') || '[]');
    completedRuns.push({
      day: this.gameData.day,
      ending: this.gameData.hasReformerEnding ? '改革者' : (this.gameData.reputation > 50 ? '地下传奇' : '其他'),
      date: Date.now()
    });
    localStorage.setItem('ds16-completed', JSON.stringify(completedRuns));
    localStorage.setItem('ds16-unlocks', JSON.stringify({
      hasReformerEnding: this.gameData.hasReformerEnding,
      totalRuns: completedRuns.length
    }));
  }

  triggerEquipmentFailureEvent() {
    const soundproofRooms = this.rooms.filter(r => r.type === 'soundproof' && !r.isBroken);
    if (soundproofRooms.length === 0) return;
    
    const targetRoom = soundproofRooms[Phaser.Math.Between(0, soundproofRooms.length - 1)];
    targetRoom.isBroken = true;
    targetRoom.gasLevel = targetRoom.config.maxGas; // Compromised
    
    this.showMessage(`⚠️ ${targetRoom.getTypeName()}隔音层老化！`, 0xE53E3E);
    
    // Offer repair option
    this.time.delayedCall(2000, () => {
      this.triggerRepairDecision(targetRoom);
    });
  }

  triggerRepairDecision(room) {
    this.scene.pause();
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x0a0a0f, 0.9);
    
    this.add.text(640, 200, '⚠️ 设备故障', { fontFamily: 'VT323', fontSize: '36px', color: '#E53E3E' }).setOrigin(0.5);
    this.add.text(640, 270, `${room.getTypeName()}的隔音层老化暴露，急需维修！`, { fontFamily: 'VT323', fontSize: '18px', color: '#D69E2E' }).setOrigin(0.5);

    const options = [
      { y: 350, label: 'A. 立即维修 (-300$)', action: () => {
        if (this.gameData.money >= 300) {
          this.gameData.money -= 300;
          room.isBroken = false;
          room.gasLevel = 0;
          this.showMessage('房间已修复', 0x48BB78);
        } else {
          this.showMessage('资金不足！', 0xE53E3E);
        }
        this.closeEvent(overlay);
      }},
      { y: 410, label: 'B. 暂时不管 - 房间暴露风险极高', action: () => {
        this.gameData.heat += 20;
        this.showMessage('风险飙升！', 0xED8936);
        this.closeEvent(overlay);
      }}
    ];

    options.forEach(opt => {
      const bg = this.add.rectangle(640, opt.y, 400, 40, 0x1A202C).setStrokeStyle(2, 0x4A5568);
      const text = this.add.text(640, opt.y, opt.label, { fontFamily: 'VT323', fontSize: '16px', color: '#A0AEC0' }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { bg.setStrokeStyle(2, 0x48BB78); text.setColor('#48BB78'); });
      bg.on('pointerout', () => { bg.setStrokeStyle(2, 0x4A5568); text.setColor('#A0AEC0'); });
      bg.on('pointerdown', opt.action);
    });
  }

  triggerResourceShortageEvent() {
    this.scene.pause();
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x0a0a0f, 0.95);
    
    this.add.text(640, 180, '⚠️ 资金短缺危机', { fontFamily: 'VT323', fontSize: '36px', color: '#E53E3E' }).setOrigin(0.5);
    this.add.text(640, 240, '月底钱不够维护所有房间，必须做出选择...', { fontFamily: 'VT323', fontSize: '18px', color: '#D69E2E', align: 'center' }).setOrigin(0.5);
    this.add.text(640, 280, `当前资金: ${this.gameData.money}$`, { fontFamily: 'VT323', fontSize: '16px', color: '#A0AEC0' }).setOrigin(0.5);

    const options = [
      { y: 350, label: 'A. 关闭平民区 - 平民无处可去，街头爆炸+1', action: () => {
        this.gameData.reputation -= 20;
        this.gameData.heat += 5;
        this.showMessage('平民区已关闭，街头传来爆炸声...', 0xE53E3E);
        this.closeEvent(overlay);
      }},
      { y: 410, label: 'B. 拖欠VIP房维护 - VIP暴露风险大增，热量+30', action: () => {
        this.gameData.heat += 30;
        const vipRooms = this.rooms.filter(r => r.type === 'vip');
        vipRooms.forEach(r => r.gasLevel = Math.min(r.config.maxGas, r.gasLevel + 50));
        this.showMessage('VIP房维护拖欠，风险飙升！', 0xED8936);
        this.closeEvent(overlay);
      }},
      { y: 470, label: 'C. 借高利贷 - 获得500$，但下月需还700$', action: () => {
        this.gameData.money += 500;
        this.gameData.debt = 700; // Track debt for next month
        this.showMessage('高利贷到手，压力倍增...', 0xD69E2E);
        this.closeEvent(overlay);
      }}
    ];

    options.forEach(opt => {
      const bg = this.add.rectangle(640, opt.y, 480, 40, 0x1A202C).setStrokeStyle(2, 0x4A5568);
      const text = this.add.text(640, opt.y, opt.label, { fontFamily: 'VT323', fontSize: '14px', color: '#A0AEC0' }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { bg.setStrokeStyle(2, 0x48BB78); text.setColor('#48BB78'); });
      bg.on('pointerout', () => { bg.setStrokeStyle(2, 0x4A5568); text.setColor('#A0AEC0'); });
      bg.on('pointerdown', opt.action);
    });
  }

  checkRandomEvents() {
