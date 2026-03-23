import * as Phaser from '../../vendor/phaser.esm.js';

export class Card {
  constructor(scene, x, y, type, id) {
    this.scene = scene;
    this.type = type;
    this.id = id;
    this.isFaceUp = true;
    this.isDragging = false;
    this.originalX = x;
    this.originalY = y;

    // Create container for card + text
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
    this.container.setInteractive({ draggable: true });
    
    // Drag events
    this.container.on('dragstart', (pointer, dragX, dragY) => {
      this.isDragging = true;
      this.container.setDepth(1000);
      this.scene.events.emit('cardDragStart', this);
    });
    
    this.container.on('drag', (pointer, dragX, dragY) => {
      this.container.setPosition(dragX, dragY);
    });
    
    this.container.on('dragend', () => {
      this.isDragging = false;
      this.container.setDepth(1);
      this.scene.events.emit('cardDragEnd', this);
    });
    
    // Click to select
    this.container.on('pointerdown', () => {
      if (!this.isDragging) {
        this.scene.events.emit('cardClicked', this);
      }
    });
  }

  getTypeLabel(type) {
    const labels = {
      'candy': '糖果',
      'dumpling': '饺子',
      'lantern': '灯笼',
      'redpacket': '红包',
      'firecracker': '鞭炮',
      'couplet': '春联',
      'fu': '福字',
      'cake': '年糕'
    };
    return labels[type] || type;
  }

  setPosition(x, y) {
    this.container.setPosition(x, y);
    this.originalX = x;
    this.originalY = y;
  }

  moveTo(x, y, duration = 200) {
    this.scene.tweens.add({
      targets: this.container,
      x: x,
      y: y,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        this.originalX = x;
        this.originalY = y;
      }
    });
  }

  highlight(enabled) {
    if (enabled) {
      this.sprite.setTint(0xFFFF00);
    } else {
      this.sprite.clearTint();
    }
  }

  destroy() {
    this.container.destroy();
  }
}
