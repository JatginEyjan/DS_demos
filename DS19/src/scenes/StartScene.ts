import Phaser from 'phaser'
import { Character } from '../character/Character'
import { Card } from '../core/types'

export class StartScene extends Phaser.Scene {
  private readonly WIDTH = 1280
  private readonly HEIGHT = 720

  constructor() {
    super({ key: 'StartScene' })
  }

  create(): void {
    // 背景
    this.add.rectangle(this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH, this.HEIGHT, 0x1a1a2e)
    
    // 标题
    this.add.text(this.WIDTH / 2, 150, 'DS19', {
      fontSize: '72px',
      color: '#ffd93d',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    
    this.add.text(this.WIDTH / 2, 230, '双角色爬塔卡牌', {
      fontSize: '24px',
      color: '#a8a8b3'
    }).setOrigin(0.5)
    
    // 选择初始角色
    this.add.text(this.WIDTH / 2, 320, '选择初始角色', {
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5)
    
    // 战士选项
    this.createCharacterOption(this.WIDTH / 2 - 150, 450, '战士', '防御/承伤', () => {
      this.startGame('warrior')
    })
    
    // 游侠选项
    this.createCharacterOption(this.WIDTH / 2 + 150, 450, '游侠', '连击/易伤', () => {
      this.startGame('ranger')
    })
  }

  private createCharacterOption(x: number, y: number, name: string, role: string, callback: () => void): void {
    const container = this.add.container(x, y)
    
    // 背景
    const bg = this.add.rectangle(0, 0, 200, 150, 0x2d2d44)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive()
    
    // 名称
    const nameText = this.add.text(0, -30, name, {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    
    // 定位
    const roleText = this.add.text(0, 10, role, {
      fontSize: '16px',
      color: '#a8a8b3'
    }).setOrigin(0.5)
    
    // 点击提示
    const hintText = this.add.text(0, 50, '点击选择', {
      fontSize: '14px',
      color: '#4ecdc4'
    }).setOrigin(0.5)
    
    container.add([bg, nameText, roleText, hintText])
    
    // 交互
    bg.on('pointerdown', callback)
    bg.on('pointerover', () => bg.setFillStyle(0x3d3d54))
    bg.on('pointerout', () => bg.setFillStyle(0x2d2d44))
  }

  private startGame(firstCharacter: string): void {
    // 创建基础牌
    const warriorCards: Card[] = [
      { id: 'strike', name: '斩击', cost: 1, type: 'attack', rarity: 'common', description: '造成6点伤害', effects: [{ type: 'damage', value: 6, target: 'enemy' }] },
      { id: 'strike2', name: '斩击', cost: 1, type: 'attack', rarity: 'common', description: '造成6点伤害', effects: [{ type: 'damage', value: 6, target: 'enemy' }] },
      { id: 'strike3', name: '斩击', cost: 1, type: 'attack', rarity: 'common', description: '造成6点伤害', effects: [{ type: 'damage', value: 6, target: 'enemy' }] },
      { id: 'strike4', name: '斩击', cost: 1, type: 'attack', rarity: 'common', description: '造成6点伤害', effects: [{ type: 'damage', value: 6, target: 'enemy' }] },
      { id: 'defend', name: '防御', cost: 1, type: 'skill', rarity: 'common', description: '获得6点格挡', effects: [{ type: 'block', value: 6, target: 'self' }] },
      { id: 'defend2', name: '防御', cost: 1, type: 'skill', rarity: 'common', description: '获得6点格挡', effects: [{ type: 'block', value: 6, target: 'self' }] },
      { id: 'defend3', name: '防御', cost: 1, type: 'skill', rarity: 'common', description: '获得6点格挡', effects: [{ type: 'block', value: 6, target: 'self' }] },
      { id: 'defend4', name: '防御', cost: 1, type: 'skill', rarity: 'common', description: '获得6点格挡', effects: [{ type: 'block', value: 6, target: 'self' }] },
    ]
    
    const rangerCards: Card[] = [
      { id: 'shoot', name: '射击', cost: 1, type: 'attack', rarity: 'common', description: '造成6点伤害', effects: [{ type: 'damage', value: 6, target: 'enemy' }] },
      { id: 'shoot2', name: '射击', cost: 1, type: 'attack', rarity: 'common', description: '造成6点伤害', effects: [{ type: 'damage', value: 6, target: 'enemy' }] },
      { id: 'shoot3', name: '射击', cost: 1, type: 'attack', rarity: 'common', description: '造成6点伤害', effects: [{ type: 'damage', value: 6, target: 'enemy' }] },
      { id: 'shoot4', name: '射击', cost: 1, type: 'attack', rarity: 'common', description: '造成6点伤害', effects: [{ type: 'damage', value: 6, target: 'enemy' }] },
      { id: 'dodge', name: '闪避', cost: 1, type: 'skill', rarity: 'common', description: '获得6点格挡', effects: [{ type: 'block', value: 6, target: 'self' }] },
      { id: 'dodge2', name: '闪避', cost: 1, type: 'skill', rarity: 'common', description: '获得6点格挡', effects: [{ type: 'block', value: 6, target: 'self' }] },
      { id: 'dodge3', name: '闪避', cost: 1, type: 'skill', rarity: 'common', description: '获得6点格挡', effects: [{ type: 'block', value: 6, target: 'self' }] },
      { id: 'dodge4', name: '闪避', cost: 1, type: 'skill', rarity: 'common', description: '获得6点格挡', effects: [{ type: 'block', value: 6, target: 'self' }] },
    ]
    
    // 成长牌池
    const warriorSkillPool = {
      common: [
        { id: 'w1', name: '固守', cost: 1, type: 'skill', rarity: 'common', description: '获得10点格挡', effects: [{ type: 'block', value: 10, target: 'self' }] },
        { id: 'w2', name: '压制打击', cost: 1, type: 'attack', rarity: 'common', description: '造成8点伤害', effects: [{ type: 'damage', value: 8, target: 'enemy' }] },
      ] as Card[],
      uncommon: [
        { id: 'w4', name: '堡垒', cost: 2, type: 'skill', rarity: 'uncommon', description: '获得16点格挡', effects: [{ type: 'block', value: 16, target: 'self' }] },
      ] as Card[],
      rare: [
        { id: 'w6', name: '钢铁壁垒', cost: 2, type: 'skill', rarity: 'rare', description: '获得18点格挡', effects: [{ type: 'block', value: 18, target: 'self' }] },
      ] as Card[]
    }
    
    const rangerSkillPool = {
      common: [
        { id: 'r1', name: '速射', cost: 1, type: 'attack', rarity: 'common', description: '造成5点伤害两次', effects: [{ type: 'damage', value: 5, target: 'enemy' }] },
        { id: 'r2', name: '标记', cost: 1, type: 'skill', rarity: 'common', description: '施加2层易伤', effects: [] },
      ] as Card[],
      uncommon: [
        { id: 'r4', name: '暴雨箭', cost: 2, type: 'attack', rarity: 'uncommon', description: '对随机敌人造成4点伤害四次', effects: [{ type: 'damage', value: 4, target: 'enemy' }] },
      ] as Card[],
      rare: [
        { id: 'r6', name: '终结时刻', cost: 3, type: 'attack', rarity: 'rare', description: '造成28点伤害', effects: [{ type: 'damage', value: 28, target: 'enemy' }] },
      ] as Card[]
    }
    
    // 创建角色
    const characters: Character[] = []
    
    if (firstCharacter === 'warrior') {
      characters.push(new Character('warrior', '战士', 72, warriorCards, warriorSkillPool))
    } else {
      characters.push(new Character('ranger', '游侠', 58, rangerCards, rangerSkillPool))
    }
    
    // 进入地图
    this.scene.start('MapScene', { characters })
  }
}
