import * as Phaser from '../../vendor/phaser.esm.js';

export class Room {
  constructor(scene, x, y, type, id) {
    this.scene = scene;
    this.type = type;
    this.id = id;
    this.customer = null;
    this.gasLevel = 0;
    this.isDisposing = false;
    this.isBroken = false;
    
    // Release duration tracking
    this.releaseTimer = 0;
    this.releaseDuration = 0;
    this.customerReleased = false;

    const configs = {
      basic: { disposalRate: 5, risk: 0.3, color: 0x4A5568, maxGas: 100 },
      soundproof: { disposalRate: 10, risk: 0.15, color: 0x2D5A4A, maxGas: 100 },
      vacuum: { disposalRate: 20, risk: 0.05, color: 0x2B6CB0, maxGas: 80, timeLimit: 120 },
      vip: { disposalRate: 8, risk: 0.4, color: 0x744210, maxGas: 150 }
    };

    this.config = configs[type];

    this.container = scene.add.container(x, y);
    
    this.bg = scene.add.image(0, 0, `room-${type}`).setOrigin(0.5);
    this.container.add(this.bg);

    this.statusLight = scene.add.circle(25, -25, 6, 0x48BB78);
    this.container.add(this.statusLight);

    // Gas level bar
    this.gasBarBg = scene.add.rectangle(0, 35, 60, 8, 0x2D3748).setOrigin(0.5);
    this.gasBarFill = scene.add.rectangle(-30, 35, 0, 8, 0xED8936).setOrigin(0, 0.5);
    this.container.add([this.gasBarBg, this.gasBarFill]);
    this.gasBarBg.setVisible(false);

    // Release progress bar (shows how long customer has been releasing)
    this.releaseBarBg = scene.add.rectangle(0, 45, 60, 4, 0x2D3748).setOrigin(0.5);
    this.releaseBarFill = scene.add.rectangle(-30, 45, 0, 4, 0x48BB78).setOrigin(0, 0.5);
    this.container.add([this.releaseBarBg, this.releaseBarFill]);
    this.releaseBarBg.setVisible(false);

    this.label = scene.add.text(0, -35, `${this.getTypeName()}${id + 1}`, {
      fontFamily: 'VT323',
      fontSize: '14px',
      color: '#A0AEC0'
    }).setOrigin(0.5);
    this.container.add(this.label);

    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => this.onClick());
  }

  getTypeName() {
    const names = { basic: '基础', soundproof: '吸音', vacuum: '真空', vip: 'VIP' };
    return names[this.type] || '房间';
  }

  onClick() {
    if (!this.customer && !this.isBroken) {
      this.scene.events.emit('roomClicked', this);
    }
  }

  assignCustomer(customer) {
    this.customer = customer;
    customer.setInRoom(true);
    this.statusLight.setFillStyle(0xE53E3E);
    
    // Set release duration based on customer type
    const durations = {
      civilian: 30,
      middle: 60,
      elite: 90,
      vip: 45
    };
    
    this.releaseDuration = durations[customer.type] || 60;
    this.releaseTimer = 0;
    this.customerReleased = false;
    this.releaseBarBg.setVisible(true);
    
    // Move customer visual to room
    const worldPos = this.container.getBounds();
    customer.setPosition(worldPos.x + 32, worldPos.y + 20);
  }

  update(delta, disposalMode, gameScene) {
    if (!this.customer || this.customerReleased) return;

    // Update release timer
    this.releaseTimer += delta;
    const releaseProgress = Math.min(1, this.releaseTimer / this.releaseDuration);
    this.releaseBarFill.setSize(60 * releaseProgress, 4);

    // Check if customer finished releasing
    if (this.releaseTimer >= this.releaseDuration && !this.customerReleased) {
      this.customerReleased = true;
      this.customer.setReleased(true);
      this.releaseBarBg.setVisible(false);
      
      // Generate gas based on customer type
      const gasAmount = {
        civilian: 15,
        middle: 25,
        elite: 20,
        vip: 40
      }[this.customer.type] || 20;
      
      this.gasLevel += gasAmount;
      
      // VIP gives bonus income on release complete
      if (this.customer.type === 'vip') {
        gameScene.gameData.money += 50;
        gameScene.showMessage('VIP小费 +50$', 0xD69E2E);
      }
      
      // Schedule customer to leave after a delay (3 seconds to pay and leave)
      gameScene.time.delayedCall(3000, () => {
        if (this.customer && this.customerReleased) {
          // Customer leaves
          gameScene.showMessage(`${this.customer.type.toUpperCase()} 客户已离开`, 0x48BB78);
          this.clearCustomer();
        }
      });
    }

    // Handle gas disposal
    if (this.gasLevel > 0 && !this.isDisposing) {
      this.handleDisposal(disposalMode, gameScene);
    }

    // Update gas bar
    this.updateGasBar();

    // Check compromise
    const maxGas = this.config.maxGas || 100;
    if (this.gasLevel >= maxGas) {
      this.gasLevel = maxGas;
      // Auto-trigger heat if not disposing properly
      if (disposalMode === 'direct') {
        gameScene.gameData.heat += 5;
      }
    }

    // Vacuum room time limit
    if (this.config.timeLimit && this.releaseTimer > this.config.timeLimit) {
      // Customer suffocates
      gameScene.showMessage('客户缺氧昏迷！', 0xE53E3E);
      this.customer.setPressure(100); // Force explosion
    }
  }

  handleDisposal(mode, gameScene) {
    this.isDisposing = true;
    
    switch (mode) {
      case 'direct':
        // Free but generates heat
        this.gasLevel = Math.max(0, this.gasLevel - this.config.disposalRate);
        if (Math.random() < this.config.risk) {
          gameScene.gameData.heat += 10;
        }
        break;
        
      case 'filter':
        // Costs money but safe
        if (gameScene.filterUsed < gameScene.filterCapacity) {
          const disposeAmount = Math.min(this.gasLevel, this.config.disposalRate);
          this.gasLevel -= disposeAmount;
          gameScene.filterUsed += disposeAmount;
          gameScene.gameData.money -= Math.ceil(disposeAmount / 5); // 50 per 25 gas ~= 10 per unit
        } else {
          // Filter saturated, fall back to direct
          this.gasLevel = Math.max(0, this.gasLevel - this.config.disposalRate / 2);
          gameScene.gameData.heat += 5;
          gameScene.showMessage('滤网饱和！热量上升', 0xED8936);
        }
        break;
        
      case 'tank':
        // Store for later sale
        if (gameScene.tankLevel < gameScene.tankCapacity) {
          const storeAmount = Math.min(this.gasLevel, 10);
          this.gasLevel -= storeAmount;
          gameScene.tankLevel += storeAmount;
          gameScene.gameData.money -= 2; // Small maintenance cost
        } else {
          gameScene.showMessage('储存罐已满！', 0xE53E3E);
        }
        break;
    }
    
    setTimeout(() => {
      this.isDisposing = false;
    }, 1000);
  }

  updateGasBar() {
    const maxGas = this.config.maxGas || 100;
    
    if (this.gasLevel > 0) {
      this.gasBarBg.setVisible(true);
      const width = (this.gasLevel / maxGas) * 60;
      this.gasBarFill.setSize(width, 8);
      
      if (this.gasLevel > maxGas * 0.8) {
        this.gasBarFill.setFillStyle(0xE53E3E);
        this.statusLight.setFillStyle(0xED8936);
      } else {
        this.gasBarFill.setFillStyle(0xED8936);
      }
    } else {
      this.gasBarBg.setVisible(false);
    }
  }

  needsDisposal() {
    return this.gasLevel > 20;
  }

  isCompromised() {
    const maxGas = this.config.maxGas || 100;
    return this.gasLevel >= maxGas;
  }

  clearCustomer() {
    if (this.customer) {
      this.customer.setInRoom(false);
      this.customer = null;
    }
    this.statusLight.setFillStyle(0x48BB78);
    this.gasLevel = 0;
    this.releaseTimer = 0;
    this.releaseDuration = 0;
    this.customerReleased = false;
    this.updateGasBar();
    this.releaseBarBg.setVisible(false);
  }

  isOccupied() {
    return this.customer !== null;
  }

  getCustomer() {
    return this.customer;
  }
}
