import * as Phaser from '../../vendor/phaser.esm.js';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  init(data) {
    this.ending = data.ending;
    this.stats = data;
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f);

    const endings = {
      '被捕': {
        title: 'GAME OVER',
        subtitle: '你被AI聆听者发现了',
        desc: '你的地下会所被查封，所有客户资料被没收。\n根据《全球静音法案》，你将被处以极刑。',
        color: '#E53E3E'
      },
      '大爆炸': {
        title: '城市瘫痪',
        subtitle: '连环屁爆事件',
        desc: '5个客户在你这里憋炸，引发了连锁反应。\n整个城市陷入了混乱，但这或许也是变革的开始...',
        color: '#ED8936'
      },
      '殉道者': {
        title: '结局：殉道者',
        subtitle: '你的审判成为导火索',
        desc: '你以极高的声望被捕，媒体曝光了地下会所的真相。\n民众开始质疑《静音法案》，反抗运动如火如荼。',
        color: '#48BB78'
      },
      '权贵走狗': {
        title: '结局：权贵走狗',
        subtitle: '良心已死',
        desc: '你为了利益抛弃了平民，成为精英阶层的专属工具。\n你活下来了，但你还是原来那个人吗？',
        color: '#718096'
      },
      '地下传奇': {
        title: '结局：地下传奇',
        subtitle: '完美的秩序',
        desc: '100天来，你建立了一套完美的地下秩序。\n在这座城市，"风阀"的名字代表着希望。',
        color: '#D69E2E'
      }
    };

    const end = endings[this.ending] || endings['被捕'];

    // Title with glitch
    this.add.text(width / 2, 150, end.title, {
      fontFamily: 'VT323',
      fontSize: '72px',
      color: end.color
    }).setOrigin(0.5);

    this.add.text(width / 2, 230, end.subtitle, {
      fontFamily: 'VT323',
      fontSize: '32px',
      color: '#A0AEC0'
    }).setOrigin(0.5);

    // Stats
    this.add.text(width / 2, 320, 
      `存活天数: ${this.stats.day} | 服务客户: ${this.stats.customersServed} | 最终资金: ${this.stats.money}`, {
      fontFamily: 'VT323',
      fontSize: '20px',
      color: '#718096'
    }).setOrigin(0.5);

    // Description
    this.add.text(width / 2, 420, end.desc, {
      fontFamily: 'VT323',
      fontSize: '22px',
      color: '#D69E2E',
      align: 'center'
    }).setOrigin(0.5);

    // Show unlocks info
    const unlocks = JSON.parse(localStorage.getItem('ds16-unlocks') || '{}');
    if (unlocks.hasReformerEnding) {
      this.add.text(width / 2, 520, '✓ 已解锁: 真结局通关奖励', {
        fontFamily: 'VT323', fontSize: '16px', color: '#48BB78'
      }).setOrigin(0.5);
    }
    
    // Restart button
    this.createRestartButton(width / 2, 580);
  }

  createRestartButton(x, y) {
    const bg = this.add.rectangle(x, y, 200, 50, 0x1A202C)
      .setStrokeStyle(2, 0x48BB78);

    const text = this.add.text(x, y, '重新开始', {
      fontFamily: 'VT323',
      fontSize: '28px',
      color: '#48BB78'
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    
    bg.on('pointerover', () => {
      bg.setFillStyle(0x2D3748);
      text.setColor('#68D391');
    });
    
    bg.on('pointerout', () => {
      bg.setFillStyle(0x1A202C);
      text.setColor('#48BB78');
    });
    
    bg.on('pointerdown', () => {
      localStorage.removeItem('ds16-save');
      this.scene.start('MenuScene');
    });
  }
}
