import * as Phaser from '../../vendor/phaser.esm.js';

export class Customer {
  constructor(scene, x, y, type, isSpy = false) {
    this.scene = scene;
    this.type = type;
    this.isSpy = isSpy; // 是否是告密者
    this.suspiciousLevel = isSpy ? 80 : 0; // 可疑度
    
    const stats = {
      civilian: { pressureRate: 8, patience: 60, income: 20, color: 0x8B7355, gasAmount: 15 },
      middle:   { pressureRate: 6, patience: 90, income: 40, color: 0x4A5568, gasAmount: 25 },
      elite:    { pressureRate: 5, patience: 120, income: 80, color: 0x2D3748, gasAmount: 20 },
      vip:      { pressureRate: 10, patience: 30, income: 200, color: 0xD69E2E, gasAmount: 40 }
    };

    this.stats = stats[type];
    this.pressure = Phaser.Math.Between(20, 50);
    this.patience = this.stats.patience;
    this.inRoom = false;
    this.released = false;
    this.dead = false;
    this.suffocated = false; // 是否窒息死亡

    this.sprite = scene.add.container(x, y);
    
    const body = scene.add.image(0, 0, `customer-${type}`).setOrigin(0);
    this.sprite.add(body);
    
    // Spy indicator (subtle)
    if (isSpy) {
      const spyMark = scene.add.circle(14, 2, 3, 0xE53E3E, 0.3);
      this.sprite.add(spyMark);
    }

    this.barBg = scene.add.image(0, -10, 'bar-bg').setOrigin(0).setScale(0.6);
    this.barFill = scene.add.image(0, -10, 'bar-fill').setOrigin(0).setScale(0.6, 0.6);
    this.sprite.add([this.barBg, this.barFill]);

    const label = scene.add.text(20, 28, type.toUpperCase(), {
      fontFamily: 'VT323',
      fontSize: '12px',
      color: '#A0AEC0'
    });
    this.sprite.add(label);

    // Suspicious behavior hint
    this.behaviorHint = scene.add.text(20, 40, '', {
      fontFamily: 'VT323',
      fontSize: '10px',
      color: '#E53E3E'
    });
    this.sprite.add(this.behaviorHint);

    this.updateBar();
  }

  update(delta, heat) {
    if (!this.inRoom && !this.dead) {
      this.pressure += (this.stats.pressureRate / 60) * delta;
      this.patience -= delta;
      
      // Spy behavior: looks around suspiciously
      if (this.isSpy && Math.random() < 0.02) {
        this.showSuspiciousBehavior();
      }
    } else if (this.inRoom && !this.released) {
      this.pressure = Math.max(0, this.pressure - (5 / 60) * delta);
    }

    this.pressure = Phaser.Math.Clamp(this.pressure, 0, 100);
    this.updateBar();

    if (this.pressure > 80) {
      this.sprite.setAlpha(0.8 + Math.sin(this.scene.time.now / 100) * 0.2);
    }

    if (this.patience <= 0 && !this.inRoom && !this.dead) {
      this.pressure = 100;
    }
  }

  showSuspiciousBehavior() {
    const behaviors = ['东张西望', '摸口袋', '看窗户'];
    this.behaviorHint.setText(behaviors[Math.floor(Math.random() * behaviors.length)]);
    this.scene.time.delayedCall(2000, () => {
      this.behaviorHint.setText('');
    });
  }

  updateBar() {
    const scale = this.pressure / 100;
    this.barFill.setScale(0.6 * scale, 0.6);
    
    let color = 0x48BB78;
    if (this.pressure > 50) color = 0xECC94B;
    if (this.pressure > 80) color = 0xE53E3E;
    
    this.barFill.setTint(color);
  }

  setInRoom(value) {
    this.inRoom = value;
  }

  setReleased(value) {
    this.released = value;
  }

  setDead(cause) {
    this.dead = true;
    this.deathCause = cause; // 'explosion', 'suffocation'
  }

  isReleased() {
    return this.released;
  }

  getPressure() {
    return this.pressure;
  }

  getIncome() {
    return this.stats.income;
  }

  getGasAmount() {
    return this.stats.gasAmount;
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
