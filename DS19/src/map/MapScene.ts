import Phaser from 'phaser'
import { Character } from '../character/Character'

export interface MapNode {
  id: string
  type: 'start' | 'battle' | 'elite' | 'rest' | 'event' | 'shop' | 'boss'
  x: number
  y: number
  connections: string[] // 连接到的节点ID
  visited: boolean
}

export interface MapData {
  nodes: MapNode[]
  currentNodeId: string
}

export class MapScene extends Phaser.Scene {
  private characters: Character[] = []
  private mapData!: MapData
  private nodeContainers: Map<string, Phaser.GameObjects.Container> = new Map()
  
  private readonly WIDTH = 1280
  private readonly HEIGHT = 720

  constructor() {
    super({ key: 'MapScene' })
  }

  init(data: { characters: Character[] }): void {
    this.characters = data.characters
    
    // 生成或加载地图
    if (!this.mapData) {
      this.mapData = this.generateMap()
    }
  }

  create(): void {
    // 背景
    this.add.rectangle(this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH, this.HEIGHT, 0x1a1a2e)
    
    // 标题
    this.add.text(this.WIDTH / 2, 40, '选择路线', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    
    // 绘制连接线
    this.drawConnections()
    
    // 创建节点
    this.createNodes()
    
    // 显示队伍信息
    this.createPartyInfo()
  }

  private generateMap(): MapData {
    // 简化的8节点地图
    const nodes: MapNode[] = [
      { id: 'start', type: 'start', x: 100, y: 360, connections: ['n1', 'n2'], visited: true },
      { id: 'n1', type: 'battle', x: 300, y: 240, connections: ['n3', 'n4'], visited: false },
      { id: 'n2', type: 'battle', x: 300, y: 480, connections: ['n4', 'n5'], visited: false },
      { id: 'n3', type: 'elite', x: 500, y: 180, connections: ['n6'], visited: false },
      { id: 'n4', type: 'rest', x: 500, y: 360, connections: ['n6', 'n7'], visited: false },
      { id: 'n5', type: 'event', x: 500, y: 540, connections: ['n7'], visited: false },
      { id: 'n6', type: 'shop', x: 700, y: 270, connections: ['boss'], visited: false },
      { id: 'n7', type: 'battle', x: 700, y: 450, connections: ['boss'], visited: false },
      { id: 'boss', type: 'boss', x: 950, y: 360, connections: [], visited: false },
    ]
    
    return {
      nodes,
      currentNodeId: 'start'
    }
  }

  private drawConnections(): void {
    const graphics = this.add.graphics()
    graphics.lineStyle(3, 0x4a5568, 0.6)
    
    this.mapData.nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = this.mapData.nodes.find(n => n.id === targetId)
        if (target) {
          // 绘制从当前节点到目标节点的线
          graphics.lineBetween(node.x, node.y, target.x, target.y)
        }
      })
    })
  }

  private createNodes(): void {
    this.mapData.nodes.forEach(node => {
      const container = this.createNodeContainer(node)
      this.nodeContainers.set(node.id, container)
    })
  }

  private createNodeContainer(node: MapNode): Phaser.GameObjects.Container {
    const container = this.add.container(node.x, node.y)
    
    // 节点外观
    const { color, icon, size } = this.getNodeVisuals(node.type)
    
    // 节点背景
    const bg = this.add.rectangle(0, 0, size, size, color)
      .setStrokeStyle(node.visited ? 4 : 3, node.visited ? 0x4ecdc4 : 0xffffff)
      .setInteractive()
    
    // 图标
    const iconText = this.add.text(0, 0, icon, {
      fontSize: `${size * 0.5}px`,
      color: '#ffffff'
    }).setOrigin(0.5)
    
    container.add([bg, iconText])
    
    // 是否可以访问
    const canVisit = this.canVisitNode(node)
    
    if (!canVisit) {
      bg.setAlpha(0.5)
      iconText.setAlpha(0.5)
    } else if (!node.visited) {
      // 可访问但未访问的节点有发光效果
      this.tweens.add({
        targets: bg,
        alpha: { from: 1, to: 0.7 },
        duration: 800,
        yoyo: true,
        repeat: -1
      })
    }
    
    // 点击事件
    bg.on('pointerdown', () => {
      if (canVisit) {
        this.onNodeClick(node)
      }
    })
    
    // 悬停效果
    if (canVisit) {
      bg.on('pointerover', () => {
        bg.setScale(1.1)
        this.showNodeTooltip(node)
      })
      
      bg.on('pointerout', () => {
        bg.setScale(1)
        this.hideNodeTooltip()
      })
    }
    
    // 当前位置标记
    if (node.id === this.mapData.currentNodeId) {
      const marker = this.add.circle(0, -size/2 - 15, 8, 0x4ecdc4)
      container.add(marker)
    }
    
    return container
  }

  private getNodeVisuals(type: string): { color: number; icon: string; size: number } {
    switch (type) {
      case 'start': return { color: 0x4a5568, icon: '★', size: 50 }
      case 'battle': return { color: 0x8b0000, icon: '⚔️', size: 60 }
      case 'elite': return { color: 0xff6b6b, icon: '👹', size: 70 }
      case 'rest': return { color: 0xff9500, icon: '🔥', size: 60 }
      case 'event': return { color: 0x9b59b6, icon: '❓', size: 60 }
      case 'shop': return { color: 0x3498db, icon: '🏪', size: 60 }
      case 'boss': return { color: 0xe74c3c, icon: '👑', size: 80 }
      default: return { color: 0x4a5568, icon: '?', size: 50 }
    }
  }

  private canVisitNode(node: MapNode): boolean {
    // 已访问的节点不能重复访问
    if (node.visited) return false
    
    // 检查是否与当前节点相连
    const currentNode = this.mapData.nodes.find(n => n.id === this.mapData.currentNodeId)
    if (!currentNode) return false
    
    return currentNode.connections.includes(node.id)
  }

  private onNodeClick(node: MapNode): void {
    // 标记为已访问
    node.visited = true
    this.mapData.currentNodeId = node.id
    
    // 根据节点类型进入对应场景
    switch (node.type) {
      case 'battle':
      case 'elite':
      case 'boss':
        this.scene.start('BattleScene', { 
          characters: this.characters,
          enemyType: node.type
        })
        break
      case 'rest':
        this.showRestOptions()
        break
      case 'shop':
        this.scene.start('ShopScene', { characters: this.characters })
        break
      case 'event':
        this.scene.start('EventScene', { characters: this.characters })
        break
    }
  }

  private showRestOptions(): void {
    // 简单的篝火休息选项
    const overlay = this.add.rectangle(this.WIDTH / 2, this.HEIGHT / 2, 400, 300, 0x2d2d44)
      .setStrokeStyle(2, 0xffffff)
    
    const title = this.add.text(this.WIDTH / 2, 250, '篝火', {
      fontSize: '28px',
      color: '#ff9500',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    
    // 休息选项
    const restBtn = this.createOptionButton(this.WIDTH / 2, 320, '休息 (+30% HP)', () => {
      this.characters.forEach(char => {
        const healAmount = Math.floor(char.maxHp * 0.3)
        char.heal(healAmount)
      })
      this.closeRestOverlay(overlay, title)
    })
    
    // 升级选项
    const upgradeBtn = this.createOptionButton(this.WIDTH / 2, 380, '升级卡牌', () => {
      // 可以删除一张卡牌
      this.showCardRemoval()
    })
    
    // 关闭按钮
    const closeBtn = this.createOptionButton(this.WIDTH / 2, 440, '离开', () => {
      this.closeRestOverlay(overlay, title)
    })
  }

  private createOptionButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    
    const bg = this.add.rectangle(0, 0, 250, 40, 0x4a5568)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive()
    
    const textObj = this.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5)
    
    container.add([bg, textObj])
    
    bg.on('pointerdown', callback)
    bg.on('pointerover', () => bg.setFillStyle(0x5a6578))
    bg.on('pointerout', () => bg.setFillStyle(0x4a5568))
    
    return container
  }

  private closeRestOverlay(...objects: Phaser.GameObjects.GameObject[]): void {
    objects.forEach(obj => obj.destroy())
    this.scene.restart({ characters: this.characters })
  }

  private showCardRemoval(): void {
    // 简化版：显示角色牌库，选择一张删除
    // 实际实现需要更复杂的UI
  }

  private showNodeTooltip(node: MapNode): void {
    const tooltipText = this.getNodeDescription(node.type)
    
    const tooltip = this.add.container(node.x, node.y - 60)
    tooltip.setName('tooltip')
    
    const bg = this.add.rectangle(0, 0, 120, 30, 0x000000, 0.8)
    const text = this.add.text(0, 0, tooltipText, {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5)
    
    tooltip.add([bg, text])
  }

  private hideNodeTooltip(): void {
    const tooltip = this.children.getByName('tooltip')
    if (tooltip) {
      tooltip.destroy()
    }
  }

  private getNodeDescription(type: string): string {
    switch (type) {
      case 'battle': return '普通战斗'
      case 'elite': return '精英战斗'
      case 'rest': return '篝火休息'
      case 'event': return '随机事件'
      case 'shop': return '商店'
      case 'boss': return 'Boss战'
      default: return ''
    }
  }

  private createPartyInfo(): void {
    const container = this.add.container(this.WIDTH - 150, 100)
    
    this.characters.forEach((char, index) => {
      const y = index * 80
      
      // 角色名
      this.add.text(-60, y, char.name, {
        fontSize: '16px',
        color: '#ffffff'
      })
      
      // HP
      this.add.text(-60, y + 20, `HP: ${char.currentHp}/${char.maxHp}`, {
        fontSize: '14px',
        color: '#ff6b6b'
      })
      
      // 等级
      this.add.text(20, y + 10, `Lv${char.level}`, {
        fontSize: '14px',
        color: '#4ecdc4'
      })
    })
  }
}
