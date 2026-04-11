import { Card, StatusEffect } from '../core/types'

// 升级所需经验表
export const LEVEL_UP_EXP = [0, 2, 5, 9, 14] // Lv1->2: 2, Lv2->3: 3, Lv3->4: 4, Lv4->5: 5

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
  
  // 等级与经验
  level: number = 1
  exp: number = 0
  
  // 成长牌池
  skillPool: {
    common: Card[]
    uncommon: Card[]
    rare: Card[]
  }

  constructor(
    id: string, 
    name: string, 
    maxHp: number, 
    baseDeck: Card[],
    skillPool?: { common: Card[]; uncommon: Card[]; rare: Card[] }
  ) {
    this.id = id
    this.name = name
    this.maxHp = maxHp
    this.currentHp = maxHp
    this.drawPile = [...baseDeck]
    this.shuffleDrawPile()
    
    // 初始化成长牌池
    this.skillPool = skillPool || { common: [], uncommon: [], rare: [] }
  }

  // 获得经验
  gainExp(amount: number): { leveledUp: boolean; newLevel?: number } {
    this.exp += amount
    
    // 检查是否升级
    const requiredExp = LEVEL_UP_EXP[this.level - 1]
    if (requiredExp && this.exp >= requiredExp && this.level < 5) {
      this.levelUp()
      return { leveledUp: true, newLevel: this.level }
    }
    
    return { leveledUp: false }
  }

  // 升级
  private levelUp(): void {
    if (this.level >= 5) return
    
    this.level++
    
    // 生命成长
    const hpGrowth = this.id === 'warrior' ? 5 : 4
    this.maxHp += hpGrowth
    this.currentHp = Math.min(this.maxHp, this.currentHp + 8) // 升级回复8HP
  }

  // 获取升级候选卡牌（三选一）
  getLevelUpCandidates(): Card[] {
    const candidates: Card[] = []
    const pool = [...this.skillPool.common, ...this.skillPool.uncommon, ...this.skillPool.rare]
    
    // 随机选择3张不重复的卡牌
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
  }

  // 添加卡牌到牌库
  addCardToDeck(card: Card): void {
    // 复制卡牌并设置归属
    const newCard = { ...card, ownerId: this.id }
    this.drawPile.push(newCard)
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
          break // 无牌可抽
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
    this.drawCards(4) // 每回合抽4张
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
  
  // 获取当前等级所需经验
  getExpForNextLevel(): number {
    return LEVEL_UP_EXP[this.level - 1] || 0
  }
  
  // 获取当前等级已累积的经验
  getExpForCurrentLevel(): number {
    if (this.level <= 1) return this.exp
    return this.exp - LEVEL_UP_EXP[this.level - 2]
  }
}
