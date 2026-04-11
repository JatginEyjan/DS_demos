import Phaser from 'phaser'
import { Character } from '../character/Character'
import { Card } from '../core/types'

export interface UpgradeData {
  character: Character
  onComplete: () => void
}

export class UpgradeScene extends Phaser.Scene {
  private character!: Character
  private onComplete!: () => void
  private candidates: Card[] = []
  private selectedIndex: number = -1
  
  private readonly WIDTH = 1280
  private readonly HEIGHT = 720

  constructor() {
    super({ key: 'UpgradeScene' })
  }

  init(data: UpgradeData): void {
    this.character = data.character
    this.onComplete = data.onComplete
    this.candidates = this.character.getLevelUpCandidates()
  }

  create(): void {
    // 背景
    this.add.rectangle(this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH, this.HEIGHT, 0x1a1a2e)
    
    // 标题
    this.add.text(this.WIDTH / 2, 80, `${this.character.name} 升级!`, {
      fontSize: '36px',
      color: '#ffd93d',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    
    // 等级信息
    this.add.text(this.WIDTH / 2, 140, `Lv${this.character.level - 1} → Lv${this.character.level}`, {
      fontSize: '24px',
      color: '#4ecdc4'
    }).setOrigin(0.5)
    
    // 奖励信息
    const hpGrowth = this.character.id === 'warrior' ? 5 : 4
    this.add.text(this.WIDTH / 2, 180, `最大生命 +${hpGrowth}  当前生命 +8`, {
      fontSize: '18px',
      color: '#a8a8b3'
    }).setOrigin(0.5)
    
    // 提示文本
    this.add.text(this.WIDTH / 2, 250, '选择一张卡牌加入牌库', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5)
    
    // 显示候选卡牌
    this.createCardSelections()
    
    // 确认按钮（初始隐藏）
    this.createConfirmButton()
  }

  private createCardSelections(): void {
    const startX = this.WIDTH / 2 - 350
    const cardY = 420
    const spacing = 350
    
    this.candidates.forEach((card, index) => {
      const container = this.add.container(startX + index * spacing, cardY)
      
      // 卡牌背景
      const bg = this.add.rectangle(0, 0, 280, 380, this.getCardColor(card.type))
        .setStrokeStyle(3, 0xffffff)
        .setInteractive()
      
      // 费用
      const costBg = this.add.circle(-100, -150, 25, 0x4a5568)
      const costText = this.add.text(-100, -150, card.cost.toString(), {
        fontSize: '24px',
        color: '#ffd93d',
        fontStyle: 'bold'
      }).setOrigin(0.5)
      
      // 稀有度
      const rarityColor = this.getRarityColor(card.rarity)
      const rarityText = this.add.text(0, -150, this.getRarityText(card.rarity), {
        fontSize: '14px',
        color: rarityColor
      }).setOrigin(0.5)
      
      // 名称
      const nameText = this.add.text(0, -100, card.name, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5)
      
      // 类型
      const typeText = this.add.text(0, -60, this.getTypeText(card.type), {
        fontSize: '16px',
        color: '#a8a8b3'
      }).setOrigin(0.5)
      
      // 描述
      const descText = this.add.text(0, 20, card.description, {
        fontSize: '16px',
        color: '#e2e8f0',
        align: 'center',
        wordWrap: { width: 240 }
      }).setOrigin(0.5)
      
      // 选中标记（初始隐藏）
      const selectedMark = this.add.text(0, 180, '✓ 选中', {
        fontSize: '20px',
        color: '#4ecdc4',
        fontStyle: 'bold'
      }).setOrigin(0.5).setVisible(false)
      selectedMark.setName('selectedMark')
      
      container.add([bg, costBg, costText, rarityText, nameText, typeText, descText, selectedMark])
      
      // 点击选择
      bg.on('pointerdown', () => {
        this.selectCard(index)
      })
      
      // 悬停效果
      bg.on('pointerover', () => {
        if (this.selectedIndex !== index) {
          bg.setStrokeStyle(3, 0x4a9eff)
        }
      })
      
      bg.on('pointerout', () => {
        if (this.selectedIndex !== index) {
          bg.setStrokeStyle(3, 0xffffff)
        }
      })
    })
  }

  private createConfirmButton(): void {
    const button = this.add.container(this.WIDTH / 2, 650)
    
    const bg = this.add.rectangle(0, 0, 200, 50, 0x4a5568)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive()
    
    const text = this.add.text(0, 0, '确认选择', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5)
    
    button.add([bg, text])
    button.setName('confirmButton')
    button.setVisible(false)
    
    bg.on('pointerdown', () => {
      if (this.selectedIndex >= 0) {
        this.confirmSelection()
      }
    })
  }

  private selectCard(index: number): void {
    this.selectedIndex = index
    
    // 更新所有卡牌的选中状态
    this.children.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Container) {
        const bg = child.list[0] as Phaser.GameObjects.Rectangle
        const selectedMark = child.getByName('selectedMark') as Phaser.GameObjects.Text
        
        if (selectedMark) {
          // 找到这个容器对应的索引
          const containerIndex = Math.round((child.x - (this.WIDTH / 2 - 350)) / 350)
          
          if (containerIndex === index) {
            bg.setStrokeStyle(4, 0x4ecdc4)
            selectedMark.setVisible(true)
          } else {
            bg.setStrokeStyle(3, 0xffffff)
            selectedMark.setVisible(false)
          }
        }
      }
    })
    
    // 显示确认按钮
    const confirmButton = this.getByName('confirmButton') as Phaser.GameObjects.Container
    if (confirmButton) {
      confirmButton.setVisible(true)
    }
  }

  private confirmSelection(): void {
    if (this.selectedIndex < 0) return
    
    // 添加选中的卡牌到角色牌库
    const selectedCard = this.candidates[this.selectedIndex]
    this.character.addCardToDeck(selectedCard)
    
    // 完成回调
    this.onComplete()
  }

  private getCardColor(type: string): number {
    switch (type) {
      case 'attack': return 0x8b0000
      case 'skill': return 0x1e3a5f
      case 'power': return 0x4a0080
      default: return 0x2d2d44
    }
  }

  private getRarityColor(rarity: string): string {
    switch (rarity) {
      case 'common': return '#a8a8b3'
      case 'uncommon': return '#4ecdc4'
      case 'rare': return '#ffd93d'
      default: return '#ffffff'
    }
  }

  private getRarityText(rarity: string): string {
    switch (rarity) {
      case 'common': return '普通'
      case 'uncommon': return '进阶'
      case 'rare': return '稀有'
      default: return ''
    }
  }

  private getTypeText(type: string): string {
    switch (type) {
      case 'attack': return '攻击'
      case 'skill': return '技能'
      case 'power': return '能力'
      default: return ''
    }
  }
}
