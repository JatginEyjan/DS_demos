import Phaser from 'phaser'
import { Character } from '../character/Character'
import { UpgradeScene } from '../upgrade/UpgradeScene'

export interface PostBattleData {
  characters: Character[]
  isVictory: boolean
  expReward: number
  goldReward: number
  onComplete: () => void
}

export class PostBattleScene extends Phaser.Scene {
  private characters!: Character[]
  private isVictory!: boolean
  private expReward!: number
  private goldReward!: number
  private onComplete!: () => void
  
  private pendingUpgrades: Character[] = []
  private currentUpgradeIndex: number = 0
  
  private readonly WIDTH = 1280
  private readonly HEIGHT = 720

  constructor() {
    super({ key: 'PostBattleScene' })
  }

  init(data: PostBattleData): void {
    this.characters = data.characters
    this.isVictory = data.isVictory
    this.expReward = data.expReward
    this.goldReward = data.goldReward
    this.onComplete = data.onComplete
    
    // 处理战后复活
    this.handlePostBattleRevive()
    
    // 计算经验获取和升级
    this.calculateExpAndUpgrades()
  }

  create(): void {
    // 背景
    this.add.rectangle(this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH, this.HEIGHT, 0x1a1a2e)
    
    // 标题
    const title = this.isVictory ? '战斗胜利!' : '战斗失败...'
    const titleColor = this.isVictory ? '#4ecdc4' : '#ff6b6b'
    
    this.add.text(this.WIDTH / 2, 80, title, {
      fontSize: '48px',
      color: titleColor,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    
    // 奖励信息
    this.add.text(this.WIDTH / 2, 160, `获得金币: ${this.goldReward}`, {
      fontSize: '24px',
      color: '#ffd93d'
    }).setOrigin(0.5)
    
    this.add.text(this.WIDTH / 2, 200, `每位参战角色获得经验: ${this.expReward}`, {
      fontSize: '20px',
      color: '#a8a8b3'
    }).setOrigin(0.5)
    
    // 显示角色经验变化
    this.createCharacterExpDisplay()
    
    // 继续按钮
    this.createContinueButton()
  }

  private handlePostBattleRevive(): void {
    // 战斗胜利后，死亡角色以1血复活
    if (this.isVictory) {
      this.characters.forEach(char => {
        if (char.isDead()) {
          char.currentHp = 1
        }
      })
    }
  }

  private calculateExpAndUpgrades(): void {
    this.pendingUpgrades = []
    
    // 给每个存活（或已复活）的角色分配经验
    this.characters.forEach(char => {
      // 注意：死亡但参与战斗的角色也能获得经验
      const result = char.gainExp(this.expReward)
      
      if (result.leveledUp) {
        this.pendingUpgrades.push(char)
      }
    })
  }

  private createCharacterExpDisplay(): void {
    const startX = this.WIDTH / 2 - 250
    const startY = 300
    const spacing = 250
    
    this.characters.forEach((char, index) => {
      const container = this.add.container(startX + index * spacing, startY)
      
      // 角色名
      const nameText = this.add.text(0, -40, char.name, {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5)
      
      // 等级
      const levelText = this.add.text(0, -10, `Lv${char.level}`, {
        fontSize: '18px',
        color: '#4ecdc4'
      }).setOrigin(0.5)
      
      // 经验条背景
      const expBarBg = this.add.rectangle(0, 20, 180, 20, 0x2d2d44)
        .setStrokeStyle(1, 0x4a5568)
      
      // 经验条
      const expForNext = char.getExpForNextLevel()
      const expInCurrent = char.getExpForCurrentLevel()
      let expPercent = 0
      
      if (char.level >= 5) {
        expPercent = 1 // 满级
      } else if (expForNext > 0) {
        const prevLevelExp = char.level > 1 ? [0, 2, 5, 9, 14][char.level - 2] : 0
        const expNeeded = expForNext - prevLevelExp
        const expCurrent = char.exp - prevLevelExp
        expPercent = expCurrent / expNeeded
      }
      
      const expBarWidth = 176 * expPercent
      const expBar = this.add.rectangle(-88 + expBarWidth / 2, 20, expBarWidth, 16, 0x4ecdc4)
      
      // 经验数值
      const expText = char.level >= 5 
        ? 'MAX'
        : `${expInCurrent}/${expForNext - (char.level > 1 ? [0, 2, 5, 9, 14][char.level - 2] : 0)}`
      
      const expTextObj = this.add.text(0, 20, expText, {
        fontSize: '12px',
        color: '#ffffff'
      }).setOrigin(0.5)
      
      // 升级提示
      const leveledUp = this.pendingUpgrades.includes(char)
      const upgradeText = this.add.text(0, 55, leveledUp ? '↑ 可升级!' : '', {
        fontSize: '16px',
        color: '#ffd93d',
        fontStyle: 'bold'
      }).setOrigin(0.5)
      
      container.add([nameText, levelText, expBarBg, expBar, expTextObj, upgradeText])
    })
  }

  private createContinueButton(): void {
    const button = this.add.container(this.WIDTH / 2, 600)
    
    const bg = this.add.rectangle(0, 0, 200, 50, 0x4a5568)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive()
    
    const text = this.add.text(0, 0, '继续', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5)
    
    button.add([bg, text])
    
    bg.on('pointerdown', () => {
      this.onContinue()
    })
    
    // 悬停效果
    bg.on('pointerover', () => {
      bg.setFillStyle(0x5a6578)
    })
    
    bg.on('pointerout', () => {
      bg.setFillStyle(0x4a5568)
    })
  }

  private onContinue(): void {
    // 如果有待升级的角色，进入升级场景
    if (this.currentUpgradeIndex < this.pendingUpgrades.length) {
      const char = this.pendingUpgrades[this.currentUpgradeIndex]
      this.currentUpgradeIndex++
      
      this.scene.launch('UpgradeScene', {
        character: char,
        onComplete: () => {
          this.scene.stop('UpgradeScene')
          this.onContinue() // 继续处理下一个升级
        }
      })
    } else {
      // 所有升级处理完成，调用完成回调
      this.onComplete()
    }
  }
}
