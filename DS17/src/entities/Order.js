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
    
    // Track which requirements are fulfilled
    this.fulfilledRequirements = new Set();

    // UI container
    this.container = scene.add.container(x, y);
    
    // Background
    this.bg = scene.add.rectangle(0, 0, 170, 130, 0xFFF8DC)
      .setStrokeStyle(2, 0x8B4513);
    this.container.add(this.bg);
    
    // Title
    const titles = { 'simple': '简单', 'composite': '复合', 'urgent': '紧急' };
    const title = scene.add.text(0, -50, titles[this.type] + '订单', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#8B0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);
    
    // Requirements
    this.reqTexts = [];
    this.reqChecks = [];
    this.updateRequirementsDisplay();
    
    // Reward
    this.rewardText = scene.add.text(0, 45, `💰 ${this.reward}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFD700'
    }).setOrigin(0.5);
    this.container.add(this.rewardText);
    
    // Timer for urgent
    if (this.timeLimit) {
      this.timeRemaining = this.timeLimit;
      this.timerText = scene.add.text(0, 60, `⏱️ ${this.timeRemaining}s`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#FF0000'
      }).setOrigin(0.5);
      this.container.add(this.timerText);
    }
    
    // Make clickable for submission
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => {
      if (!this.completed) this.bg.setFillStyle(0xFFFFE0);
    });
    this.bg.on('pointerout', () => {
      if (!this.completed) this.bg.setFillStyle(0xFFF8DC);
    });
    this.bg.on('pointerdown', () => {
      scene.events.emit('orderClickedForSubmit', this);
    });
  }

  updateRequirementsDisplay() {
    this.reqTexts.forEach(t => t.destroy());
    this.reqChecks.forEach(c => c.destroy());
    this.reqTexts = [];
    this.reqChecks = [];
    
    let yOffset = -30;
    this.requirements.forEach((req, index) => {
      const isFulfilled = this.fulfilledRequirements.has(index);
      const submitted = this.getSubmittedCount(req.type);
      const remaining = Math.max(0, req.count - submitted);
      
      // Checkmark for fulfilled
      const check = this.scene.add.text(-60, yOffset, isFulfilled ? '✓' : '○', {
        fontSize: '14px',
        color: isFulfilled ? '#00AA00' : '#999999'
      }).setOrigin(0.5);
      this.container.add(check);
      this.reqChecks.push(check);
      
      // Requirement text
      const color = isFulfilled ? '#00AA00' : '#333333';
      const text = this.scene.add.text(10, yOffset, 
        `${this.getTypeLabel(req.type)}: ${remaining}/${req.count}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: color
      }).setOrigin(0.5);
      this.container.add(text);
      this.reqTexts.push(text);
      
      yOffset += 20;
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

  // Check if can accept a stack of cards
  canAcceptStack(stack) {
    if (this.completed) return { canAccept: false, reason: '订单已完成' };
    if (!stack || stack.getCount() === 0) return { canAccept: false, reason: '没有卡牌' };
    
    const cardType = stack.type;
    let targetReqIndex = -1;
    let targetReq = null;
    
    // Find the first unfulfilled requirement matching this type
    for (let i = 0; i < this.requirements.length; i++) {
      if (this.fulfilledRequirements.has(i)) continue;
      
      const req = this.requirements[i];
      if (req.type === cardType) {
        targetReqIndex = i;
        targetReq = req;
        break;
      }
    }
    
    if (!targetReq) {
      return { canAccept: false, reason: '订单不需要该类型卡牌' };
    }
    
    // For composite orders, check sequence (must complete in order)
    if (this.type === 'composite') {
      // Find the first unfulfilled requirement
      let firstUnfulfilled = -1;
      for (let i = 0; i < this.requirements.length; i++) {
        if (!this.fulfilledRequirements.has(i)) {
          firstUnfulfilled = i;
          break;
        }
      }
      
      if (targetReqIndex !== firstUnfulfilled) {
        const neededType = this.requirements[firstUnfulfilled].type;
        return { 
          canAccept: false, 
          reason: `需先完成${this.getTypeLabel(neededType)}` 
        };
      }
    }
    
    const remaining = targetReq.count - this.getSubmittedCount(cardType);
    const canAcceptAll = stack.getCount() <= remaining;
    
    return { 
      canAccept: true, 
      reqIndex: targetReqIndex,
      remaining: remaining,
      canAcceptAll: canAcceptAll
    };
  }

  submitStack(stack) {
    const check = this.canAcceptStack(stack);
    if (!check.canAccept) {
      return { success: false, reason: check.reason };
    }
    
    const cards = stack.removeCards(stack.getCount());
    this.submittedCards.push(...cards);
    
    // Check if this requirement is now fulfilled
    const req = this.requirements[check.reqIndex];
    if (this.getSubmittedCount(req.type) >= req.count) {
      this.fulfilledRequirements.add(check.reqIndex);
    }
    
    this.updateRequirementsDisplay();
    
    // Calculate rewards
    let reward = this.reward;
    let isPerfect = false;
    let overflowBonus = 0;
    
    const totalCards = cards.length;
    if (totalCards === 10) {
      // Perfect delivery
      isPerfect = true;
      reward = Math.floor(reward * 1.2);
    } else if (totalCards > 10) {
      // Overflow - only first 10 get full points
      overflowBonus = (totalCards - 10) * 3;
    }
    
    // Check if order is complete
    if (this.isComplete()) {
      this.complete(reward + overflowBonus, isPerfect);
    }
    
    return { 
      success: true, 
      cardsSubmitted: cards.length,
      reward: reward + overflowBonus,
      isPerfect: isPerfect,
      overflowBonus: overflowBonus
    };
  }

  isComplete() {
    return this.fulfilledRequirements.size === this.requirements.length;
  }

  complete(finalReward, isPerfect) {
    this.completed = true;
    this.bg.setFillStyle(0x90EE90);
    
    let msg = `订单完成! +${finalReward}福来币`;
    if (isPerfect) msg += ' (完美!)';
    
    this.scene.showMessage(msg, 0x00FF00);
    this.scene.addCoins(finalReward);
    
    // Animate cards
    this.submittedCards.forEach((card, i) => {
      this.scene.tweens.add({
        targets: card.container,
        scale: 0,
        alpha: 0,
        duration: 300,
        delay: i * 30,
        onComplete: () => card.destroy()
      });
    });
    
    this.scene.events.emit('orderCompleted', this, { isPerfect, reward: finalReward });
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
    
    // Return cards
    this.submittedCards.forEach(card => {
      this.scene.returnCardToHand(card);
    });
    this.submittedCards = [];
  }

  destroy() {
    this.container.destroy();
  }
}
