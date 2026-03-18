import * as Phaser from '../../vendor/phaser.esm.js';

export class DecisionScene extends Phaser.Scene {
  constructor() {
    super('DecisionScene');
  }

  init(data) {
    this.decisionType = data.type;
    this.gameData = data.gameData;
  }

  create() {
    const { width, height } = this.scale;

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a0f, 0.95);

    // Title
    this.add.text(width / 2, 100, '⚠️ 紧急事态', {
      fontFamily: 'VT323',
      fontSize: '48px',
      color: '#E53E3E'
    }).setOrigin(0.5);

    // Decision content
    const decisions = {
      'vip-cut': {
        text: '市政官秘书长要求在正午时段插队。\n但他前面还有3个憋压90+的平民...',
        options: [
          { label: '拒绝插队', effect: { reputation: +10, money: 0, heat: 0 } },
          { label: '接受插队', effect: { reputation: -15, money: 500, heat: 20 } }
        ]
      },
      'spy-suspicion': {
        text: '新客户行为异常：东张西望、不问价、\n直接要最好的房间。他可能是卧底...',
        options: [
          { label: '正常接待', effect: { reputation: 0, risk: 'caught' } },
          { label: '拒绝服务', effect: { reputation: -5, money: 0 } },
          { label: '"意外"安排', effect: { reputation: -20, heat: -10 } }
        ]
      },
      'shortage': {
        text: '月底钱不够维护所有房间。必须做出选择...',
        options: [
          { label: '关闭平民区', effect: { reputation: -20, heat: 5 } },
          { label: '拖欠VIP维护', effect: { reputation: -10, heat: 25 } },
          { label: '借高利贷', effect: { money: 1000, debt: true } }
        ]
      }
    };

    const decision = decisions[this.decisionType] || decisions['vip-cut'];

    // Description text with typewriter effect
    this.typewriterText(width / 2, 250, decision.text);

    // Options
    decision.options.forEach((opt, i) => {
      this.createOptionButton(width / 2, 400 + i * 80, opt.label, () => {
        this.applyEffect(opt.effect);
      });
    });
  }

  typewriterText(x, y, text) {
    const display = this.add.text(x, y, '', {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: '#D69E2E',
      align: 'center'
    }).setOrigin(0.5);

    let i = 0;
    this.time.addEvent({
      delay: 50,
      repeat: text.length - 1,
      callback: () => {
        display.text += text[i];
        i++;
      }
    });
  }

  createOptionButton(x, y, label, callback) {
    const bg = this.add.rectangle(x, y, 300, 50, 0x1A202C)
      .setStrokeStyle(2, 0x4A5568);

    const text = this.add.text(x, y, label, {
      fontFamily: 'VT323',
      fontSize: '24px',
      color: '#A0AEC0'
    }).setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });
    
    bg.on('pointerover', () => {
      bg.setStrokeStyle(2, 0x48BB78);
      text.setColor('#48BB78');
    });
    
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, 0x4A5568);
      text.setColor('#A0AEC0');
    });
    
    bg.on('pointerdown', callback);
  }

  applyEffect(effect) {
    if (effect.reputation) this.gameData.reputation += effect.reputation;
    if (effect.money) this.gameData.money += effect.money;
    if (effect.heat) this.gameData.heat += effect.heat;
    
    if (effect.risk === 'caught') {
      if (Math.random() < 0.5) {
        this.scene.start('EndingScene', { ending: '被捕', ...this.gameData });
        return;
      }
    }

    this.scene.resume('DayScene');
    this.scene.stop();
  }
}
