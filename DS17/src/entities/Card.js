import * as Phaser from '../../vendor/phaser.esm.js';

export class Card {
  constructor(scene, x, y, type, id) {
    this.scene = scene;
    this.type = type;
    this.id = id;
    this.isFaceUp = true;
    this.stackIndex = 0; // Position in stack

    this.container = scene.add.container(x, y);
    
    // Card sprite
    this.sprite = scene.add.sprite(0, 0, type + '_full');
    this.sprite.setDisplaySize(50, 70);
    this.container.add(this.sprite);
    
    // Type label
    this.label = scene.add.text(0, 25, this.getTypeLabel(type), {
      fontSize: '10px',
      color: '#333333',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(this.label);

    // Make interactive
    this.container.setSize(50, 70);
    this.container.setInteractive({ useHandCursor: true });
    
    // Click to select stack
    this.container.on('pointerdown', () => {
      this.scene.events.emit('cardClicked', this);
    });
    
    // Hover effect
    this.container.on('pointerover', () => {
      if (!this.scene.selectedStack || this.scene.selectedStack.type !== this.type) {
        this.sprite.setTint(0xDDDDDD);
      }
    });
    this.container.on('pointerout', () => {
      if (!this.scene.selectedStack || this.scene.selectedStack.type !== this.type) {
        this.sprite.clearTint();
      }
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

  setPosition(x, y) {
    this.container.setPosition(x, y);
  }

  moveTo(x, y, duration = 200) {
    this.scene.tweens.add({
      targets: this.container,
      x: x,
      y: y,
      duration: duration,
      ease: 'Power2'
    });
  }

  setStackIndex(index, totalInStack) {
    this.stackIndex = index;
    // Visual offset for stacked cards
    const offsetY = index * 8;
    this.sprite.y = -offsetY;
    this.label.y = 25 - offsetY;
    
    // Scale down slightly for cards behind
    const scale = 1 - (index * 0.03);
    this.sprite.setScale(scale);
    this.label.setScale(scale);
    
    // Adjust alpha for depth effect
    this.container.setAlpha(1 - (index * 0.1));
  }

  highlight(enabled) {
    if (enabled) {
      this.sprite.setTint(0xFFFF00);
    } else {
      this.sprite.clearTint();
    }
  }

  select() {
    this.sprite.setTint(0x00FF00);
    this.container.setDepth(100);
  }

  deselect() {
    this.sprite.clearTint();
    this.container.setDepth(1);
  }

  destroy() {
    this.container.destroy();
  }
}

// Stack class to manage a stack of cards
export class CardStack {
  constructor(scene, type, x, y) {
    this.scene = scene;
    this.type = type;
    this.cards = [];
    this.x = x;
    this.y = y;
    this.isSelected = false;
    
    // Click area for the whole stack
    this.hitArea = scene.add.rectangle(x, y, 60, 100, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    
    this.hitArea.on('pointerdown', () => {
      scene.events.emit('stackClicked', this);
    });
    
    this.hitArea.on('pointerover', () => {
      if (!this.isSelected) {
        this.showPreview();
      }
    });
    
    this.hitArea.on('pointerout', () => {
      if (!this.isSelected) {
        this.hidePreview();
      }
    });
    
    // Stack count label
    this.countLabel = scene.add.text(x, y + 50, '0', {
      fontSize: '14px',
      color: '#FFFFFF',
      backgroundColor: '#8B0000',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setVisible(false);
  }

  addCard(card) {
    this.cards.push(card);
    this.updateVisuals();
    this.countLabel.setVisible(true);
  }

  removeCards(count) {
    const removed = this.cards.splice(0, count);
    this.updateVisuals();
    if (this.cards.length === 0) {
      this.countLabel.setVisible(false);
    }
    return removed;
  }

  getCount() {
    return this.cards.length;
  }

  updateVisuals() {
    // Update count label
    this.countLabel.setText(`${this.cards.length}`);
    this.countLabel.setPosition(this.x, this.y + 50);
    
    // Update card positions
    this.cards.forEach((card, i) => {
      card.setPosition(this.x, this.y);
      card.setStackIndex(i, this.cards.length);
    });
    
    // Update hit area
    this.hitArea.setPosition(this.x, this.y);
  }

  select() {
    this.isSelected = true;
    this.cards.forEach(card => card.select());
    this.countLabel.setBackgroundColor('#00AA00');
    
    // Highlight matching orders
    this.scene.highlightMatchingOrders(this.type);
  }

  deselect() {
    this.isSelected = false;
    this.cards.forEach(card => card.deselect());
    this.countLabel.setBackgroundColor('#8B0000');
  }

  showPreview() {
    this.countLabel.setVisible(true);
    this.cards.forEach(card => card.container.setAlpha(0.8));
  }

  hidePreview() {
    if (this.cards.length === 0) {
      this.countLabel.setVisible(false);
    }
    this.cards.forEach((card, i) => {
      card.container.setAlpha(1 - (i * 0.1));
    });
  }

  destroy() {
    this.hitArea.destroy();
    this.countLabel.destroy();
    this.cards.forEach(card => card.destroy());
  }
}
