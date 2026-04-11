import { EnemyConfig, EnemyPattern, StatusEffect } from '../core/types'

export class Enemy {
  id: string
  name: string
  maxHp: number
  currentHp: number
  patterns: EnemyPattern[]
  currentPatternIndex: number = 0
  
  // 下回合意图
  nextIntent: EnemyPattern | null = null
  
  // 状态效果
  statusEffects: StatusEffect[] = []

  constructor(config: EnemyConfig) {
    this.id = config.id
    this.name = config.name
    this.maxHp = config.hp
    this.currentHp = config.hp
    this.patterns = config.patterns
    this.nextIntent = this.patterns[0]
  }

  // 执行当前意图并设置下回合意图
  executeIntent(targetCharacterIndex: number): { type: string; value: number; target: number } {
    const intent = this.nextIntent!
    
    // 执行效果
    const result = {
      type: intent.type,
      value: intent.value,
      target: targetCharacterIndex
    }
    
    // 切换到下一个意图
    this.currentPatternIndex = (this.currentPatternIndex + 1) % this.patterns.length
    this.nextIntent = this.patterns[this.currentPatternIndex]
    
    return result
  }

  // 受到伤害
  takeDamage(amount: number): void {
    // 检查易伤
    const vulnerable = this.statusEffects.find(s => s.type === 'vulnerable')
    if (vulnerable) {
      amount = Math.floor(amount * 1.5)
    }
    
    this.currentHp = Math.max(0, this.currentHp - amount)
  }

  // 检查是否死亡
  isDead(): boolean {
    return this.currentHp <= 0
  }

  // 添加状态效果
  addStatusEffect(effect: StatusEffect): void {
    const existing = this.statusEffects.find(s => s.type === effect.type)
    if (existing) {
      existing.duration += effect.duration
    } else {
      this.statusEffects.push({ ...effect })
    }
  }

  // 回合结束
  onTurnEnd(): void {
    // 减少状态持续时间
    this.statusEffects.forEach(effect => {
      effect.duration--
    })
    this.statusEffects = this.statusEffects.filter(s => s.duration > 0)
  }
}
