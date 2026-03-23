import * as Phaser from '../../vendor/phaser.esm.js';

export class Card {
  constructor(scene, x, y, type, stackId = 0) {
    this.scene = scene;
    this.type = type;
    this.stackId = stackId;
    this.isFaceUp = false;

    this.sprite = scene.add.sprite(x, y, 'cardback');
    this.sprite.setInteractive({ useHandCursor: true });
    
    // Set up click handler
    this.sprite.on('pointerdown', () => this.onClick());
    
    // Type indicator (shown when face up)
    this.typeText = scene.add.text(x, y, '', {
      fontSize: '24px',
      align: 'center'
    }).setOrigin(0.5).setVisible(false);
  }

  flip() {
    this.isFaceUp = !this.isFaceUp;
    if (this.isFaceUp) {
      this.sprite.setTexture(this.type + '_full');
      this.typeText.setVisible(false);
    } else {
      this.sprite.setTexture('cardback');
    }
  }

  reveal() {
    if (!this.isFaceUp) {
      this.flip();
    }
  }

  onClick() {
    if (!this.isFaceUp) return;
    this.scene.events.emit('cardClicked', this);
  }

  moveTo(x, y, duration = 200) {
    this.scene.tweens.add({
      targets: [this.sprite, this.typeText],
      x: x,
      y: y,
      duration: duration,
      ease: 'Power2'
    });
  }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
    this.typeText.setPosition(x, y);
  }

  destroy() {
    this.sprite.destroy();
    this.typeText.destroy();
  }
}
