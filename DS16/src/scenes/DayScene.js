import * as Phaser from '../../../vendor/phaser.esm.js';
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
      customersServed: 0,
      customersExploded: 0
    };

    this.timeSlot = 0; // 0-5: morning, noon, afternoon, evening, night, midnight
    this.timeSlotNames = ['晨间(06-10)', '正午(10-14)', '午后(14-18)', '黄昏(18-22)', '深夜(22-02)', '凌晨(02-06)'];
    this.timeRemaining = 120; // seconds per slot
    
    this.rooms = [];
    this.waitingCustomers = [];
    this.activeCustomers = []; // In rooms
  }

  create() {
    this.createBackground();
    this.createUI();
    this.createRooms();
    this.createCustomerQueue();
    
    // Systems
    this.scheduleSystem = new ScheduleSystem(this);
    this.reputationSystem = new ReputationSystem(this);

    // Timer
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.onSecondTick,
      callbackScope: this
    });

    // Initial customers
    this.spawnCustomers();
  }

  createBackground() {
    // Dark grid background
    const g = this.add.graphics();
    g.fillStyle(0x0a0a0f, 1);
    g.fillRect(0, 0, 1280, 720);
    
    // Grid lines
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
    const { width } = this.scale;

    // Top status bar
    this.createStatusBar();

    // Time slot indicator
    this.timeText = this.add.text(20, 80, this.timeSlotNames[this.timeSlot], {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: '#48BB78'
    });

    // Timer countdown
    this.timerText = this.add.text(20, 110, `剩余: ${this.timeRemaining}s`, {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#718096'
    });

    // Waiting queue label
    this.add.text(20, 150, '等待区', {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#A0AEC0'
    });

    // Action buttons
    this.createActionButtons();
  }

  createStatusBar() {
    const y = 20;
    const spacing = 140;

    // Money
    this.add.image(30, y + 8, 'icon-money').setScale(1);
    this.moneyText = this.add.text(50, y, `${this.gameData.money}`, {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: '#D69E2E'
    });

    // Reputation
    this.add.text(180, y, '声望:', { fontFamily: 'VT323', fontSize: '18px', color: '#A0AEC0' });
    this.repText = this.add.text(240, y, `${this.gameData.reputation}`, {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: this.gameData.reputation >= 0 ? '#48BB78' : '#E53E3E'
    });

    // Heat
    this.add.image(340, y + 8, 'icon-heat').setScale(1);
    this.heatText = this.add.text(360, y, `${this.gameData.heat}`, {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: this.gameData.heat > 50 ? '#E53E3E' : '#ED8936'
    });

    // Day
    this.add.text(500, y, `第${this.gameData.day}天`, {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: '#FFFFFF'
    });
  }

  createActionButtons() {
    const btnY = 680;
    const btns = [
      { label: '接待', x: 200, action: () => this.assignCustomer() },
      { label: '拒绝', x: 350, action: () => this.rejectCustomer() },
      { label: '处理', x: 500, action: () => this.disposeGas() },
      { label: '下时段', x: 650, action: () => this.nextTimeSlot() }
    ];

    btns.forEach(({ label, x, action }) => {
      this.createActionButton(x, btnY, label, action);
    });
  }

  createActionButton(x, y, label, callback) {
    const bg = this.add.rectangle(x, y, 120, 40, 0x1A202C)
      .setStrokeStyle(2, 0x4A5568);

    const text = this.add.text(x, y, label, {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#A0AEC0'
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    
    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, 0x48BB78);
      text.setColor('#48BB78');
    });
    
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, 0x4A5568);
      text.setColor('#A0AEC0');
    });
    
    bg.on('pointerdown', callback);
  }

  createRooms() {
    // Create 4 rooms in a grid
    const roomConfigs = [
      { x: 400, y: 200, type: 'basic', id: 0 },
      { x: 600, y: 200, type: 'basic', id: 1 },
      { x: 400, y: 400, type: 'basic', id: 2 },
      { x: 600, y: 400, type: 'basic', id: 3 }
    ];

    roomConfigs.forEach(config => {
      const room = new Room(this, config.x, config.y, config.type, config.id);
      this.rooms.push(room);
    });
  }

  createCustomerQueue() {
    this.queueContainer = this.add.container(20, 180);
  }

  spawnCustomers() {
    // Spawn 3-5 random customers
    const count = Phaser.Math.Between(3, 5);
    const types = ['civilian', 'middle', 'elite', 'vip'];
    
    for (let i = 0; i < count; i++) {
      const type = types[Phaser.Math.Between(0, Math.min(3, Math.floor(this.gameData.day / 3)))];
      const customer = new Customer(this, 0, i * 60, type);
      this.waitingCustomers.push(customer);
      this.queueContainer.add(customer.getSprite());
    }

    this.updateQueueDisplay();
  }

  updateQueueDisplay() {
    // Reposition queue
    this.waitingCustomers.forEach((customer, index) => {
      customer.setPosition(0, index * 60);
    });
  }

  assignCustomer() {
    if (this.waitingCustomers.length === 0) return;

    // Find empty room
    const emptyRoom = this.rooms.find(r => !r.isOccupied());
    if (!emptyRoom) {
      this.showMessage('没有空房间！', 0xE53E3E);
      return;
    }

    const customer = this.waitingCustomers.shift();
    emptyRoom.assignCustomer(customer);
    this.activeCustomers.push(customer);
    
    this.updateQueueDisplay();
    this.showMessage('客户已接待', 0x48BB78);
  }

  rejectCustomer() {
    if (this.waitingCustomers.length === 0) return;
    
    const customer = this.waitingCustomers.shift();
    customer.destroy();
    
    this.gameData.reputation -= 5;
    this.updateStatus();
    this.updateQueueDisplay();
    this.showMessage('拒绝客户，声望-5', 0xED8936);
  }

  disposeGas() {
    // Handle gas disposal for occupied rooms
    let disposed = 0;
    this.rooms.forEach(room => {
      if (room.isOccupied() && room.needsDisposal()) {
        room.disposeGas();
        disposed++;
      }
    });

    if (disposed > 0) {
      this.gameData.money -= disposed * 50; // Filter cost
      this.showMessage(`处理${disposed}个房间，-${disposed * 50}信用点`, 0x48BB78);
      this.updateStatus();
    }
  }

  nextTimeSlot() {
    this.timeSlot++;
    if (this.timeSlot >= 6) {
      this.endDay();
      return;
    }

    this.timeRemaining = 120;
    this.timeText.setText(this.timeSlotNames[this.timeSlot]);
    
    // Heat check
    if (this.gameData.heat > 70 && Phaser.Math.Between(0, 100) < this.gameData.heat) {
      this.triggerInspection();
    }

    // Spawn new customers
    this.spawnCustomers();
  }

  onSecondTick() {
    this.timeRemaining--;
    this.timerText.setText(`剩余: ${this.timeRemaining}s`);

    // Update customers
    this.waitingCustomers.forEach(c => c.update(1));
    this.activeCustomers.forEach(c => c.update(1));

    // Check explosions
    this.checkExplosions();

    if (this.timeRemaining <= 0) {
      this.nextTimeSlot();
    }
  }

  checkExplosions() {
    [...this.waitingCustomers, ...this.activeCustomers].forEach(customer => {
      if (customer.getPressure() >= 100) {
        this.triggerExplosion(customer);
      }
    });
  }

  triggerExplosion(customer) {
    this.gameData.customersExploded++;
    this.gameData.heat += 20;
    
    // Remove customer
    const inWaiting = this.waitingCustomers.indexOf(customer);
    if (inWaiting > -1) {
      this.waitingCustomers.splice(inWaiting, 1);
    } else {
      const inActive = this.activeCustomers.indexOf(customer);
      if (inActive > -1) {
        this.activeCustomers.splice(inActive, 1);
        // Find and clear room
        this.rooms.forEach(r => {
          if (r.getCustomer() === customer) r.clearCustomer();
        });
      }
    }
    
    customer.destroy();
    this.updateQueueDisplay();
    this.updateStatus();

    // Flash effect
    this.cameras.main.flash(500, 0xE53E3E);
    this.showMessage('💥 客户憋炸了！热量+20', 0xE53E3E);

    if (this.gameData.customersExploded >= 5) {
      this.gameOver('大爆炸');
    }
  }

  triggerInspection() {
    this.showMessage('⚠️ 监听者正在巡查...', 0xED8936);
    
    // Check if any room is compromised
    const compromised = this.rooms.filter(r => r.isCompromised());
    if (compromised.length > 0) {
      this.gameOver('被捕');
    }
  }

  endDay() {
    // Calculate daily income
    const income = this.activeCustomers.length * 30;
    this.gameData.money += income;
    this.gameData.day++;
    this.gameData.heat = Math.max(0, this.gameData.heat - 10); // Heat cools down

    // Save
    localStorage.setItem('ds16-save', JSON.stringify(this.gameData));

    this.scene.start('DayScene', this.gameData);
  }

  gameOver(ending) {
    this.scene.start('EndingScene', { ending, ...this.gameData });
  }

  updateStatus() {
    this.moneyText.setText(`${this.gameData.money}`);
    this.repText.setText(`${this.gameData.reputation}`);
    this.heatText.setText(`${this.gameData.heat}`);
  }

  showMessage(text, color) {
    const msg = this.add.text(640, 360, text, {
      fontFamily: 'VT323',
      fontSize: '32px',
      color: `#${color.toString(16).padStart(6, '0')}`
    }).setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      y: 300,
      alpha: 0,
      duration: 1500,
      onComplete: () => msg.destroy()
    });
  }
}
