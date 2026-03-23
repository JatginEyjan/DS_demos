export class Order {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.id = config.id;
    this.type = config.type; // 'simple', 'composite', 'urgent'
    this.requirements = config.requirements; // [{type: 'candy', count: 10}]
    this.timeLimit = config.timeLimit || null;
    this.reward = config.reward || 100;
    
    this.completed = false;
    this.currentSubmit = []; // Cards being submitted

    // Create UI container
    this.container = scene.add.container(x, y);
    
    // Background
    const bg = scene.add.rectangle(0, 0, 140, 100, 0xFFF8DC)
      .setStrokeStyle(2, 0x8B4513);
    this.container.add(bg);
    
    // Order title
    const titleText = {
      'simple': '简单订单',
      'composite': '复合订单',
      'urgent': '紧急订单'
    }[this.type];
    
    const title = scene.add.text(0, -35, titleText, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#8B0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);
    
    // Requirements text
    let reqText = '';
    this.requirements.forEach(req => {
      reqText += `${req.type}: ${req.count}张\\n`;
    });
    
    const reqLabel = scene.add.text(0, -10, reqText, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#333333',
      align: 'center'
    }).setOrigin(0.5);
    this.container.add(reqLabel);
    
    // Reward
    const rewardText = scene.add.text(0, 25, `💰 ${this.reward}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFD700'
    }).setOrigin(0.5);
    this.container.add(rewardText);
    
    // Timer for urgent orders
    if (this.timeLimit) {
      this.timeRemaining = this.timeLimit;
      this.timerText = scene.add.text(0, 40, `⏱️ ${this.timeRemaining}s`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#FF0000'
      }).setOrigin(0.5);
      this.container.add(this.timerText);
    }
    
    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.onClick());
  }

  onClick() {
    if (this.completed) return;
    this.scene.events.emit('orderClicked', this);
  }

  updateTimer(delta) {
    if (!this.timeLimit || this.completed) return;
    
    this.timeRemaining -= delta;
    if (this.timerText) {
      this.timerText.setText(`⏱️ ${Math.ceil(this.timeRemaining)}s`);
    }
    
    if (this.timeRemaining <= 0) {
      this.fail();
    }
  }

  canFulfill(cards) {
    // Check if provided cards can fulfill this order
    const cardCounts = {};
    cards.forEach(card => {
      cardCounts[card.type] = (cardCounts[card.type] || 0) + 1;
    });
    
    for (const req of this.requirements) {
      if ((cardCounts[req.type] || 0) < req.count) {
        return false;
      }
    }
    return true;
  }

  complete() {
    this.completed = true;
    // Visual feedback
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.5,
      duration: 300
    });
  }

  fail() {
    this.completed = true;
    // Visual feedback for failure
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.3,
      duration: 300
    });
  }

  destroy() {
    this.container.destroy();
  }
}
