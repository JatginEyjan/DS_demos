import Phaser from 'phaser'
import { Character } from '../character/Character'
import { Enemy } from '../character/Enemy'
import { Card, CardEffect } from '../core/types'

export class BattleScene extends Phaser.Scene {
  // 游戏对象
  private characters: Character[] = []
  private enemies: Enemy[] = []
  private selectedCharacterIndex: number = 0
  private isPlayerTurn: boolean = true
  
  // UI元素
  private characterContainers: Phaser.GameObjects.Container[] = []
  private enemyContainers: Phaser.GameObjects.Container[] = []
  private handCardTexts: Phaser.GameObjects.Text[] = []
  private switchButton!: Phaser.GameObjects.Text
  private endTurnButton!: Phaser.GameObjects.Text
  private turnText!: Phaser.GameObjects.Text
  
  // 常量
  private readonly WIDTH = 1280
  private readonly HEIGHT = 720

  constructor() {
    super({ key: 'BattleScene' })
  }

  create(): void {
    // 创建测试角色和敌人
    this.createTestData()
    
    // 创建UI
    this.createUI()
    
    // 开始战斗
    this.startBattle()
  }

  private createTestData(): void {
    // 创建战士基础牌
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
    
    // 战士成长牌池
    const warriorSkillPool = {
      common: [
        { id: 'w1', name: '固守', cost: 1, type: 'skill', rarity: 'common', description: '获得10点格挡', effects: [{ type: 'block', value: 10, target: 'self' }] },
        { id: 'w2', name: '压制打击', cost: 1, type: 'attack', rarity: 'common', description: '造成8点伤害；有护甲时额外造成4点', effects: [{ type: 'damage', value: 8, target: 'enemy' }] },
        { id: 'w3', name: '震荡斩', cost: 1, type: 'attack', rarity: 'common', description: '造成7点伤害并施加1层虚弱', effects: [{ type: 'damage', value: 7, target: 'enemy' }] },
      ] as Card[],
      uncommon: [
        { id: 'w4', name: '堡垒', cost: 2, type: 'skill', rarity: 'uncommon', description: '获得16点格挡', effects: [{ type: 'block', value: 16, target: 'self' }] },
        { id: 'w5', name: '守护反击', cost: 2, type: 'skill', rarity: 'uncommon', description: '获得12点格挡，并对随机敌人造成10点伤害', effects: [{ type: 'block', value: 12, target: 'self' }] },
      ] as Card[],
      rare: [
        { id: 'w6', name: '钢铁壁垒', cost: 2, type: 'skill', rarity: 'rare', description: '获得18点格挡；回合结束时保留一半护甲', effects: [{ type: 'block', value: 18, target: 'self' }] },
      ] as Card[]
    }
    
    // 创建游侠基础牌
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
    
    // 游侠成长牌池
    const rangerSkillPool = {
      common: [
        { id: 'r1', name: '速射', cost: 1, type: 'attack', rarity: 'common', description: '造成5点伤害两次', effects: [{ type: 'damage', value: 5, target: 'enemy' }] },
        { id: 'r2', name: '标记', cost: 1, type: 'skill', rarity: 'common', description: '施加2层易伤', effects: [] },
        { id: 'r3', name: '瞄准', cost: 1, type: 'skill', rarity: 'common', description: '下一张攻击牌伤害+8', effects: [] },
      ] as Card[],
      uncommon: [
        { id: 'r4', name: '暴雨箭', cost: 2, type: 'attack', rarity: 'uncommon', description: '对随机敌人造成4点伤害四次', effects: [{ type: 'damage', value: 4, target: 'enemy' }] },
        { id: 'r5', name: '箭雨', cost: 2, type: 'attack', rarity: 'uncommon', description: '对所有敌人造成8点伤害', effects: [{ type: 'damage', value: 8, target: 'enemy' }] },
      ] as Card[],
      rare: [
        { id: 'r6', name: '终结时刻', cost: 3, type: 'attack', rarity: 'rare', description: '造成28点伤害；目标有易伤时返还1点能量', effects: [{ type: 'damage', value: 28, target: 'enemy' }] },
      ] as Card[]
    }
    
    this.characters = [
      new Character('warrior', '战士', 72, warriorCards, warriorSkillPool),
      new Character('ranger', '游侠', 58, rangerCards, rangerSkillPool)
    ]
    
    // 创建敌人
    this.enemies = [
      new Enemy({
        id: 'basic_enemy',
        name: '敌人',
        hp: 35,
        damage: 8,
        patterns: [
          { type: 'attack', value: 8 },
          { type: 'attack', value: 10 },
          { type: 'attack', value: 6 }
        ]
      })
    ]
  }

  private createUI(): void {
    // 背景
    this.add.rectangle(this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH, this.HEIGHT, 0x1a1a2e)
    
    // 角色区域
    this.createCharacterUI()
    
    // 敌人区域
    this.createEnemyUI()
    
    // 手牌区域
    this.createHandUI()
    
    // 按钮
    this.createButtons()
    
    // 回合显示
    this.turnText = this.add.text(this.WIDTH / 2, 30, '玩家回合', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5)
  }

  private createCharacterUI(): void {
    const startX = 200
    const y = 500
    const spacing = 300
    
    this.characters.forEach((char, index) => {
      const container = this.add.container(startX + index * spacing, y)
      
      // 角色框
      const bg = this.add.rectangle(0, 0, 180, 120, 0x2d2d44)
        .setStrokeStyle(index === this.selectedCharacterIndex ? 4 : 2, 0x4a9eff)
      
      // 名称
      const nameText = this.add.text(0, -40, char.name, {
        fontSize: '18px',
        color: '#ffffff'
      }).setOrigin(0.5)
      
      // HP
      const hpText = this.add.text(0, -15, `HP: ${char.currentHp}/${char.maxHp}`, {
        fontSize: '14px',
        color: '#ff6b6b'
      }).setOrigin(0.5)
      
      // 能量
      const energyText = this.add.text(0, 5, `能量: ${char.currentEnergy}/${char.maxEnergy}`, {
        fontSize: '14px',
        color: '#ffd93d'
      }).setOrigin(0.5)
      
      // 手牌数
      const handText = this.add.text(0, 25, `手牌: ${char.hand.length}`, {
        fontSize: '14px',
        color: '#a8a8b3'
      }).setOrigin(0.5)
      
      // 格挡
      const block = char.statusEffects.find(s => s.type === 'block')
      const blockText = this.add.text(0, 45, block ? `格挡: ${block.value}` : '', {
        fontSize: '14px',
        color: '#4ecdc4'
      }).setOrigin(0.5)
      blockText.setName('blockText')
      
      container.add([bg, nameText, hpText, energyText, handText, blockText])
      this.characterContainers.push(container)
      
      // 点击切换角色
      bg.setInteractive()
      bg.on('pointerdown', () => {
        if (this.isPlayerTurn && !char.isDead()) {
          this.switchCharacter(index)
        }
      })
    })
  }

  private createEnemyUI(): void {
    const x = this.WIDTH / 2
    const y = 200
    
    this.enemies.forEach((enemy, index) => {
      const container = this.add.container(x, y + index * 120)
      
      // 敌人框
      const bg = this.add.rectangle(0, 0, 150, 100, 0x3d2d2d)
        .setStrokeStyle(2, 0xff6b6b)
      
      // 名称
      const nameText = this.add.text(0, -30, enemy.name, {
        fontSize: '16px',
        color: '#ffffff'
      }).setOrigin(0.5)
      
      // HP
      const hpText = this.add.text(0, -10, `HP: ${enemy.currentHp}/${enemy.maxHp}`, {
        fontSize: '14px',
        color: '#ff6b6b'
      }).setOrigin(0.5)
      hpText.setName('hpText')
      
      // 意图
      const intentText = this.add.text(0, 15, this.getIntentText(enemy), {
        fontSize: '14px',
        color: '#ffd93d'
      }).setOrigin(0.5)
      intentText.setName('intentText')
      
      container.add([bg, nameText, hpText, intentText])
      this.enemyContainers.push(container)
    })
  }

  private getIntentText(enemy: Enemy): string {
    if (!enemy.nextIntent) return '...'
    const target = Math.random() > 0.5 ? '角色A' : '角色B'
    return `意图: 攻击 ${enemy.nextIntent.value} → ${target}`
  }

  private createHandUI(): void {
    const startX = this.WIDTH / 2 - 300
    const y = 620
    const spacing = 120
    
    for (let i = 0; i < 6; i++) {
      const cardText = this.add.text(startX + i * spacing, y, '', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#2d2d44',
        padding: { x: 10, y: 20 }
      }).setOrigin(0.5).setInteractive()
      
      cardText.on('pointerdown', () => {
        this.playCard(i)
      })
      
      this.handCardTexts.push(cardText)
    }
  }

  private createButtons(): void {
    // 切换按钮
    this.switchButton = this.add.text(100, 350, '切换角色', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#4a5568',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive()
    
    this.switchButton.on('pointerdown', () => {
      this.switchCharacter((this.selectedCharacterIndex + 1) % this.characters.length)
    })
    
    // 结束回合按钮
    this.endTurnButton = this.add.text(this.WIDTH - 100, 350, '结束回合', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#e53e3e',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive()
    
    this.endTurnButton.on('pointerdown', () => {
      this.endPlayerTurn()
    })
  }

  private startBattle(): void {
    // 重置所有角色
    this.characters.forEach(char => {
      char.currentHp = char.maxHp
      char.currentEnergy = char.maxEnergy
      char.hand = []
      char.discardPile = []
      char.drawPile = [...char.drawPile, ...char.discardPile]
      char.shuffleDrawPile()
    })
    
    // 重置敌人
    this.enemies.forEach(enemy => {
      enemy.currentHp = enemy.maxHp
      enemy.currentPatternIndex = 0
      enemy.nextIntent = enemy.patterns[0]
    })
    
    // 开始玩家回合
    this.startPlayerTurn()
  }

  private startPlayerTurn(): void {
    this.isPlayerTurn = true
    this.turnText.setText('玩家回合')
    this.turnText.setColor('#4ecdc4')
    
    // 每个存活角色执行回合开始
    this.characters.forEach(char => {
      if (!char.isDead()) {
        char.onTurnStart()
      }
    })
    
    // 确保选中存活角色
    if (this.characters[this.selectedCharacterIndex].isDead()) {
      const aliveIndex = this.characters.findIndex(c => !c.isDead())
      if (aliveIndex !== -1) {
        this.selectedCharacterIndex = aliveIndex
      }
    }
    
    this.updateUI()
  }

  private switchCharacter(index: number): void {
    if (index === this.selectedCharacterIndex) return
    if (this.characters[index].isDead()) return
    
    this.selectedCharacterIndex = index
    this.updateUI()
  }

  private playCard(handIndex: number): void {
    if (!this.isPlayerTurn) return
    
    const character = this.characters[this.selectedCharacterIndex]
    if (character.isDead()) return
    
    const card = character.hand[handIndex]
    if (!card) return
    if (character.currentEnergy < card.cost) return
    
    // 消耗能量并打出卡牌
    if (character.playCard(card)) {
      // 执行卡牌效果
      this.executeCardEffects(card, character)
      
      // 检查敌人死亡
      this.checkEnemyDeath()
      
      // 更新UI
      this.updateUI()
      
      // 检查胜利
      if (this.enemies.every(e => e.isDead())) {
        this.victory()
      }
    }
  }

  private executeCardEffects(card: Card, character: Character): void {
    card.effects.forEach(effect => {
      switch (effect.type) {
        case 'damage':
          // 对敌人造成伤害
          const targetEnemy = this.enemies[0]  // 简化：总是打第一个敌人
          if (targetEnemy && !targetEnemy.isDead()) {
            targetEnemy.takeDamage(effect.value)
          }
          break
        case 'block':
          character.gainBlock(effect.value)
          break
      }
    })
  }

  private checkEnemyDeath(): void {
    this.enemies.forEach((enemy, index) => {
      if (enemy.isDead()) {
        // 敌人死亡处理
      }
    })
  }

  private endPlayerTurn(): void {
    if (!this.isPlayerTurn) return
    
    // 所有存活角色执行回合结束
    this.characters.forEach(char => {
      if (!char.isDead()) {
        char.onTurnEnd()
      }
    })
    
    // 开始敌方回合
    this.startEnemyTurn()
  }

  private startEnemyTurn(): void {
    this.isPlayerTurn = false
    this.turnText.setText('敌方回合')
    this.turnText.setColor('#ff6b6b')
    
    // 敌人行动
    this.time.delayedCall(500, () => {
      this.enemies.forEach((enemy, index) => {
        if (enemy.isDead()) return
        
        // 选择目标（存活角色中随机）
        const aliveCharacters = this.characters.filter(c => !c.isDead())
        if (aliveCharacters.length === 0) return
        
        const targetChar = aliveCharacters[Math.floor(Math.random() * aliveCharacters.length)]
        const targetIndex = this.characters.indexOf(targetChar)
        
        // 执行意图
        const action = enemy.executeIntent(targetIndex)
        
        if (action.type === 'attack') {
          this.characters[targetIndex].takeDamage(action.value)
        }
        
        enemy.onTurnEnd()
      })
      
      // 更新UI
      this.updateUI()
      
      // 检查失败
      if (this.characters.every(c => c.isDead())) {
        this.defeat()
      } else {
        // 下一回合
        this.time.delayedCall(500, () => {
          this.startPlayerTurn()
        })
      }
    })
  }

  private updateUI(): void {
    // 更新角色显示
    this.characterContainers.forEach((container, index) => {
      const char = this.characters[index]
      const bg = container.list[0] as Phaser.GameObjects.Rectangle
      
      // 更新边框（选中/死亡状态）
      if (char.isDead()) {
        bg.setStrokeStyle(2, 0x666666)
      } else if (index === this.selectedCharacterIndex) {
        bg.setStrokeStyle(4, 0x4a9eff)
      } else {
        bg.setStrokeStyle(2, 0x4a5568)
      }
      
      // 更新文本
      const hpText = container.list[2] as Phaser.GameObjects.Text
      hpText.setText(`HP: ${char.currentHp}/${char.maxHp}`)
      
      const energyText = container.list[3] as Phaser.GameObjects.Text
      energyText.setText(`能量: ${char.currentEnergy}/${char.maxEnergy}`)
      
      const handText = container.list[4] as Phaser.GameObjects.Text
      handText.setText(`手牌: ${char.hand.length}`)
      
      const blockText = container.list[5] as Phaser.GameObjects.Text
      const block = char.statusEffects.find(s => s.type === 'block')
      blockText.setText(block ? `格挡: ${block.value}` : '')
    })
    
    // 更新敌人显示
    this.enemyContainers.forEach((container, index) => {
      const enemy = this.enemies[index]
      const hpText = container.list[2] as Phaser.GameObjects.Text
      hpText.setText(`HP: ${enemy.currentHp}/${enemy.maxHp}`)
      
      const intentText = container.list[3] as Phaser.GameObjects.Text
      intentText.setText(this.getIntentText(enemy))
    })
    
    // 更新手牌显示
    const currentChar = this.characters[this.selectedCharacterIndex]
    this.handCardTexts.forEach((text, index) => {
      const card = currentChar.hand[index]
      if (card) {
        const canPlay = currentChar.currentEnergy >= card.cost && !currentChar.isDead()
        text.setText(`${card.name}\n${card.cost}费\n${card.description}`)
        text.setStyle({
          fontSize: '12px',
          color: canPlay ? '#ffffff' : '#666666',
          backgroundColor: card.type === 'attack' ? '#8b0000' : '#1e3a5f'
        })
      } else {
        text.setText('')
      }
    })
  }

  private victory(): void {
    this.add.text(this.WIDTH / 2, this.HEIGHT / 2, '胜利!', {
      fontSize: '48px',
      color: '#4ecdc4'
    }).setOrigin(0.5)
    
    this.isPlayerTurn = false
    
    // 延迟后进入战后结算
    this.time.delayedCall(1500, () => {
      this.scene.start('PostBattleScene', {
        characters: this.characters,
        isVictory: true,
        expReward: 1, // 普通战斗1经验
        goldReward: 18,
        onComplete: () => {
          // 战后结算完成，可以返回地图或开始下一场战斗
          this.scene.start('BattleScene')
        }
      })
    })
  }

  private defeat(): void {
    this.add.text(this.WIDTH / 2, this.HEIGHT / 2, '失败...', {
      fontSize: '48px',
      color: '#ff6b6b'
    }).setOrigin(0.5)
    
    this.isPlayerTurn = false
  }
}
