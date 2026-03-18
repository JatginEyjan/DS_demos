export class Room {
  constructor(scene, x, y, type, id) {
    this.scene = scene;
    this.type = type;
    this.id = id;
    this.customer = null;
    this.gasLevel = 0; // Accumulated gas needing disposal
    this.isDisposing = false;

    const configs = {
      basic: { disposalRate: 5, risk: 0.3, color: 0x4A5568 },
      soundproof: { disposalRate: 10, risk: 0.15, color: 0x2D5A4A },
      vacuum: { disposalRate: 20, risk: 0.05, color: 0x2B6CB0 },
      vip: { disposalRate: 8, risk: 0.4, color: 0x744210 }
    };

    this.config = configs[type];

    // Create visual
    this.container = scene.add.container(x, y);
    
    // Room sprite
    this.bg = scene.add.image(0, 0, `room-${type}`).setOrigin(0.5);
    this.container.add(this.bg);

    // Status indicator
    this.statusLight = scene.add.circle(25, -25, 6, 0x48BB78);
    this.container.add(this.statusLight);

    // Gas level bar (hidden when empty)
    this.gasBarBg = scene.add.rectangle(0, 35, 60, 8, 0x2D3748).setOrigin(0.5);
    this.gasBarFill = scene.add.rectangle(-30, 35, 0, 8, 0xED8936).setOrigin(0, 0.5);
    this.container.add([this.gasBarBg, this.gasBarFill]);
    this.gasBarBg.setVisible(false);

    // Room label
    this.label = scene.add.text(0, -35, `房间${id + 1}`, {
      fontFamily: 'VT323',
      fontSize: '14px',
      color: '#A0AEC0'
    }).setOrigin(0.5);
    this.container.add(this.label);

    // Click to assign (if empty)
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => this.onClick());
  }

  onClick() {
    if (!this.customer) {
      this.scene.events.emit('roomClicked', this);
    }
  }

  assignCustomer(customer) {
    this.customer = customer;
    customer.setInRoom(true);
    this.statusLight.setFillStyle(0xE53E3E); // Red = occupied
    
    // Move customer visual to room
    const worldPos = this.container.getBounds();
    customer.setPosition(worldPos.x + 32, worldPos.y + 20);
  }

  clearCustomer() {
    if (this.customer) {
      this.customer.setInRoom(false);
      this.customer = null;
    }
    this.statusLight.setFillStyle(0x48BB78); // Green = empty
    this.gasLevel = 0;
    this.updateGasBar();
  }

  update(delta) {
    if (this.customer && !this.isDisposing) {
      // Gas accumulates based on customer's "output"
      this.gasLevel += (2 / 60) * delta;
      
      if (this.gasLevel > 100) {
        this.gasLevel = 100;
      }
      
      this.updateGasBar();
    }
  }

  updateGasBar() {
    if (this.gasLevel > 0) {
      this.gasBarBg.setVisible(true);
      const width = (this.gasLevel / 100) * 60;
      this.gasBarFill.setSize(width, 8);
      
      // Warning color
      if (this.gasLevel > 80) {
        this.gasBarFill.setFillStyle(0xE53E3E);
        this.statusLight.setFillStyle(0xED8936); // Warning
      }
    } else {
      this.gasBarBg.setVisible(false);
    }
  }

  needsDisposal() {
    return this.gasLevel > 20;
  }

  isCompromised() {
    // Room is compromised if gas overflowed
    return this.gasLevel >= 100;
  }

  disposeGas() {
    if (this.gasLevel <= 0) return false;
    
    this.isDisposing = true;
    this.gasLevel = Math.max(0, this.gasLevel - this.config.disposalRate);
    this.updateGasBar();
    
    setTimeout(() => {
      this.isDisposing = false;
    }, 1000);
    
    return true;
  }

  isOccupied() {
    return this.customer !== null;
  }

  getCustomer() {
    return this.customer;
  }
}
