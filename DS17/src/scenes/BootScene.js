export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.createCardTextures();
    this.scene.start('MenuScene');
  }

  createCardTextures() {
    const cardTypes = [
      { key: 'candy', color: 0xFF69B4, icon: '🍬' },
      { key: 'dumpling', color: 0xF5F5DC, icon: '🥟' },
      { key: 'lantern', color: 0xFF4500, icon: '🏮' },
      { key: 'redpacket', color: 0xDC143C, icon: '🧧' },
      { key: 'firecracker', color: 0xFFD700, icon: '🧨' },
      { key: 'couplet', color: 0x228B22, icon: '📜' },
      { key: 'fu', color: 0x8B0000, icon: '福' },
      { key: 'cake', color: 0xDAA520, icon: '🥮' }
    ];

    cardTypes.forEach(({ key, color, icon }) => {
      const g = this.add.graphics();
      
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, 60, 80, 8);
      
      g.lineStyle(2, 0xFFFFFF, 1);
      g.strokeRoundedRect(0, 0, 60, 80, 8);
      
      g.generateTexture(key, 60, 80);
      g.clear();
      
      const text = this.add.text(30, 40, icon, {
        fontSize: '32px',
        align: 'center'
      }).setOrigin(0.5);
      
      const rt = this.add.renderTexture(0, 0, 60, 80);
      rt.draw(key, 0, 0);
      rt.draw(text, 30, 40);
      rt.saveTexture(key + '_full');
      
      text.destroy();
    });

    const g = this.add.graphics();
    g.fillStyle(0x8B0000, 1);
    g.fillRoundedRect(0, 0, 60, 80, 8);
    g.lineStyle(3, 0xFFD700, 1);
    g.strokeRoundedRect(0, 0, 60, 80, 8);
    
    g.fillStyle(0xFFD700, 0.5);
    for (let i = 10; i < 60; i += 20) {
      for (let j = 10; j < 80; j += 20) {
        g.fillCircle(i, j, 3);
      }
    }
    
    g.generateTexture('cardback', 60, 80);
  }
}
