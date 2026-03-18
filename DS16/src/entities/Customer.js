export class Customer {
  constructor(scene, x, y, type) {
    this.scene = scene;
    this.type = type;
    
    // Type stats
    const stats = {
      civilian: { pressureRate: 8, patience: 60, income: 20, color: 0x8B7355 },
      middle:   { pressureRate: 6, patience: 90, income: 40, color: 0x4A5568 },
      elite:    { pressureRate: 5, patience: 120, income: 80, color: 0x2D3748 },
      vip:      { pressureRate: 10, patience: 30, income: 200, color: 0xD69E2E }
    };

    this.stats = stats[type];
    this.pressure = Phaser.Math.Between(20, 50);
    this.patience = this.stats.patience;
    this.inRoom = false;

    // Create sprite
    this.sprite = scene.add.container(x, y);
    
    const body = scene.add.image(0, 0, `customer-${type}`).setOrigin(0);
    this.sprite.add(body);

    // Pressure bar
    this.barBg = scene.add.image(0, -10, 'bar-bg').setOrigin(0).setScale(0.6);
    this.barFill = scene.add.image(0, -10, 'bar-fill').setOrigin(0).setScale(0.6, 0.6);
    this.sprite.add([this.barBg, this.barFill]);

    // Type label
    const label = scene.add.text(20, 28, type.toUpperCase(), {
      fontFamily: 'VT323',
      fontSize: '12px',
      color: '#A0AEC0'
    });
    this.sprite.add(label);

    this.updateBar();
  }

  update(delta) {
    if (!this.inRoom) {
      this.pressure += (this.stats.pressureRate / 60) * delta;
      this.patience -= delta;
    } else {
      // In room, pressure decreases
      this.pressure = Math.max(0, this.pressure - (15 / 60) * delta);
    }

    this.pressure = Phaser.Math.Clamp(this.pressure, 0, 100);
    this.updateBar();

    // Visual warning
    if (this.pressure > 80) {
      this.sprite.setAlpha(0.8 + Math.sin(this.scene.time.now / 100) * 0.2);
    }
  }

  updateBar() {
    const scale = this.pressure / 100;
    this.barFill.setScale(0.6 * scale, 0.6);
    
    // Color based on pressure
    let color = 0x48BB78; // Green
    if (this.pressure > 50) color = 0xECC94B; // Yellow
    if (this.pressure > 80) color = 0xE53E3E; // Red
    
    this.barFill.setTint(color);
  }

  setInRoom(value) {
    this.inRoom = value;
  }

  getPressure() {
    return this.pressure;
  }

  getIncome() {
    return this.stats.income;
  }

  getSprite() {
    return this.sprite;
  }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
  }

  destroy() {
    this.sprite.destroy();
  }
}
