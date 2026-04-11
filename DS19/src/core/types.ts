// 卡牌类型
export type CardType = 'attack' | 'skill' | 'power'
export type CardRarity = 'common' | 'uncommon' | 'rare'

// 效果类型
export interface CardEffect {
  type: 'damage' | 'block' | 'heal' | 'draw' | 'buff' | 'debuff'
  value: number
  target?: 'self' | 'enemy' | 'ally' | 'all_enemies'
}

// 卡牌定义
export interface Card {
  id: string
  name: string
  cost: number
  type: CardType
  rarity: CardRarity
  description: string
  effects: CardEffect[]
  ownerId?: string  // 归属角色ID
}

// 角色定义
export interface CharacterConfig {
  id: string
  name: string
  maxHp: number
  hpGrowth: number
  baseDeck: Card[]
}

// 敌人定义
export interface EnemyConfig {
  id: string
  name: string
  hp: number
  damage: number
  patterns: EnemyPattern[]
}

// 敌人行动模式
export interface EnemyPattern {
  type: 'attack' | 'defend' | 'buff'
  value: number
  target?: number  // 目标角色索引
}

// 状态效果
export interface StatusEffect {
  type: 'vulnerable' | 'weak' | 'strength' | 'dexterity' | 'block'
  value: number
  duration: number
}

// 战斗状态
export interface BattleState {
  turn: number
  isPlayerTurn: boolean
  selectedCharacterIndex: number
}
