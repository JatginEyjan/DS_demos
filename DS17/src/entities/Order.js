export class Order {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.id = config.id;
    this.type = config.type;
    this.requirements = config.requirements;
    this.timeLimit = config.timeLimit || null;
    this.reward = config.reward;
    this.completed = false;
    this.submittedCards = [];

    // UI container
    this.container = scene.add.container(x, y);
    
    // Background
    this.bg = scene.add.rectangle(0, 0, 160, 120, 0xFFF8DC)
      .setStrokeStyle(2, 0x8B4513);
    this.container.add(this.bg);
    
    // Title
    const titles = { 'simple': '简单', 'composite': '复合', 'urgent': '紧急' };
    const title = scene.add.text(0, -45, titles[this.type] + '订单', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#8B0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);
    
    // Requirements
    this.reqTexts = [];
    this.updateRequirementsDisplay();
    
    // Reward
    this.rewardText = scene.add.text(0, 40, `💰 ${this.reward}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFD700'
    }).setOrigin(0.5);
    this.container.add(this.rewardText);
    
    // Timer for urgent
    if (this.timeLimit) {
      this.timeRemaining = this.timeLimit;
      this.timerText = scene.add.text(0, 55, `⏱️ ${this.timeRemaining}s`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#FF0000'
      }).setOrigin(0.5);
      this.container.add(this.timerText);
    }
    
    // Make drop target
    this.bg.setInteractive();
    
    // Visual feedback for drop
    this.bg.on('pointerover', () => {
      if (!this.completed) this.bg.setFillStyle(0xFFFFE0);
    });
    this.bg.on('pointerout', () => {
      if (!this.completed) this.bg.setFillStyle(0xFFF8DC);
    });
  }

  updateRequirementsDisplay() {
    // Clear old texts
    this.reqTexts.forEach(t => t.destroy());
    this.reqTexts = [];
    
    let yOffset = -25;
    this.requirements.forEach(req => {
      const remaining = req.count - this.getSubmittedCount(req.type);
      const color = remaining <= 0 ? '#00AA00' : '#333333';
      const text = this.scene.add.text(0, yOffset, 
        `${this.getTypeLabel(req.type)}: ${Math.max(0, remaining)}/${req.count}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: color
      }).setOrigin(0.5);
      this.container.add(text);
      this.reqTexts.push(text);
      yOffset += 18;
    });
  }

  getTypeLabel(type) {
    const labels = {
      'candy': '糖果', 'dumpling': '饺子', 'lantern': '灯笼',
      'redpacket': '红包', 'firecracker': '鞭炮', 
      'couplet': '春联', 'fu': '福字', 'cake': '年糕'
    };
    return labels[type] || type;
  }

  getSubmittedCount(type) {
    return this.submittedCards.filter(c => c.type === type).length;
  }

  canAcceptCard(card) {
    if (this.completed) return false;
    
    for (const req of this.requirements) {
      if (req.type === card.type) {
        const submitted = this.getSubmittedCount(req.type);
        if (submitted < req.count) {
          return true;
        }
      }
    }
    return false;
  }

  submitCard(card) {
    if (!this.canAcceptCard(card)) return false;
    
    this.submittedCards.push(card);
    this.updateRequirementsDisplay();
    
    if (this.isComplete()) {
      this.complete();
    }
    
    return true;
  }

  isComplete() {
    for (const req of this.requirements) {
      if (this.getSubmittedCount(req.type) < req.count) {
        return false;
      }
    }
    return true;
  }

  complete() {
    this.completed = true;
    this.bg.setFillStyle(0x90EE90);
    this.scene.showMessage(`订单完成! +${this.reward}福来币`, 0x00FF00);
    this.scene.addCoins(this.reward);
    
    // Destroy submitted cards with animation
    this.submittedCards.forEach((card, i) => {
      this.scene.tweens.add({
        targets: card.container,
        scale: 0,
        alpha: 0,
        duration: 300,
        delay: i * 50,
        onComplete: () => card.destroy()
      });
    });
    
    this.scene.events.emit('orderCompleted', this);
  }

  updateTimer(delta) {
    if (!this.timeLimit || this.completed) return;
    
    this.timeRemaining -= delta;
    if (this.timerText) {
      this.timerText.setText(`⏱️ ${Math.max(0, Math.ceil(this.timeRemaining))}s`);
    }
    
    if (this.timeRemaining <= 0 && !this.completed) {
      this.fail();
    }
  }

  fail() {
    this.completed = true;
    this.bg.setFillStyle(0xFFCCCC);
    this.scene.showMessage('订单超时!', 0xFF0000);
    
    this.submittedCards.forEach(card => {
      this.scene.returnCardToHand(card);
    });
    this.submittedCards = [];
  }

  destroy() {
    this.container.destroy();
  }
}
