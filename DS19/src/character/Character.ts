import { Card, StatusEffect } from '../core/types'

export class Character {
  id: string
  name: string
  maxHp: number
  currentHp: number
  maxEnergy: number = 3
  currentEnergy: number = 3
  
  // 卡牌区域
  hand: Card[] = []
  drawPile: Card[] = []
  discardPile: Card[] = []
  
  // 状态效果
  statusEffects: StatusEffect[] = []
  
  // 等级
  level: number = 1
  exp: number = 0

  constructor(id: string, name: string, maxHp: number, baseDeck: Card[]) {
    this.id = id
    this.name = name
    this.maxHp = maxHp
    this.currentHp = maxHp
    this.drawPile = [...baseDeck]  // 复制基础牌库
    this.shuffleDrawPile()
  }

  // 洗牌
  shuffleDrawPile(): void {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]]
    }
  }

  // 抽牌
  drawCards(count: number): Card[] {
    const drawn: Card[] = []
    
    for (let i = 0; i < count; i++) {
      // 如果抽牌堆空了，洗弃牌堆
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) {
          break  // 无牌可抽
        }
        this.drawPile = [...this.discardPile]
        this.discardPile = []
        this.shuffleDrawPile()
      }
      
      if (this.drawPile.length > 0) {
        const card = this.drawPile.pop()!
        this.hand.push(card)
        drawn.push(card)
      }
    }
    
    return drawn
  }

  // 打出卡牌
  playCard(card: Card): boolean {
    const index = this.hand.indexOf(card)
    if (index === -1) return false
    if (this.currentEnergy < card.cost) return false
    
    this.currentEnergy -= card.cost
    this.hand.splice(index, 1)
    this.discardPile.push(card)
    
    return true
  }

  // 回复能量
  gainEnergy(amount: number): void {
    this.currentEnergy = Math.min(this.maxEnergy, this.currentEnergy + amount)
  }

  // 回合开始
  onTurnStart(): void {
    this.currentEnergy = this.maxEnergy
    this.drawCards(4)  // 每回合抽4张
  }

  // 回合结束
  onTurnEnd(): void {
    // 弃掉剩余手牌
    this.discardPile.push(...this.hand)
    this.hand = []
    
    // 清除格挡
    const blockIndex = this.statusEffects.findIndex(s => s.type === 'block')
    if (blockIndex !== -1) {
      this.statusEffects.splice(blockIndex, 1)
    }
    
    // 减少其他状态持续时间
    this.statusEffects.forEach(effect => {
      if (effect.type !== 'block') {
        effect.duration--
      }
    })
    
    // 移除持续时间结束的状态
    this.statusEffects = this.statusEffects.filter(s => s.duration > 0)
  }

  // 受到伤害
  takeDamage(amount: number): void {
    // 检查格挡
    const block = this.statusEffects.find(s => s.type === 'block')
    if (block) {
      if (block.value >= amount) {
        block.value -= amount
        amount = 0
      } else {
        amount -= block.value
        block.value = 0
      }
    }
    
    this.currentHp = Math.max(0, this.currentHp - amount)
  }

  // 获得格挡
  gainBlock(amount: number): void {
    const existing = this.statusEffects.find(s => s.type === 'block')
    if (existing) {
      existing.value += amount
    } else {
      this.statusEffects.push({ type: 'block', value: amount, duration: 1 })
    }
  }

  // 治疗
  heal(amount: number): void {
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount)
  }

  // 检查是否死亡
  isDead(): boolean {
    return this.currentHp <= 0
  }

  // 添加状态效果
  addStatusEffect(effect: StatusEffect): void {
    const existing = this.statusEffects.find(s => s.type === effect.type)
    if (existing) {
      // 同类效果叠加持续时间
      existing.duration += effect.duration
    } else {
      this.statusEffects.push({ ...effect })
    }
  }
}
