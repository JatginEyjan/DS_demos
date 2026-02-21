/**
 * DS11 游戏核心类
 * 模块化设计，支持配置驱动
 */
class MistGridGame {
  constructor(options = {}) {
    // 合并配置
    this.config = Object.assign({}, 
      DifficultyConfig.normal, // 默认标准难度
      options.difficulty || {}
    );
    
    // 事件回调
    this.callbacks = options.callbacks || {};
    
    // 游戏状态
    this.state = {
      grid: new Map(),
      revealedCells: new Set(),
      edgeCells: new Set(),
      revealedCount: 0,
      riftCount: 0,
      fogCellsCount: 0,
      
      // 火把系统
      torch: this.config.initialTorch,
      
      // 印记系统
      marks: 0,
      mutation: null,
      mutationData: null,
      
      // 核心
      coreFound: false,
      corePosition: null,
      
      // 游戏状态
      gameOver: false,
      gameWon: false,
      score: 0,
      
      // 回合计数
      turn: 0,
      startTime: Date.now()
    };
    
    // 畸变效果运行时数据
    this.mutationRuntime = {
      eyeCooldown: 0,
      hintsRevealed: []
    };
    
    // 初始化
    this.init();
  }
  
  // 初始化游戏
  init() {
    this.state.grid.clear();
    this.state.revealedCells.clear();
    this.state.edgeCells.clear();
    this.state.revealedCount = 0;
    this.state.riftCount = 0;
    this.state.fogCellsCount = 0;
    this.state.torch = this.config.initialTorch;
    this.state.marks = 0;
    this.state.mutation = null;
    this.state.mutationData = null;
    this.state.coreFound = false;
    this.state.corePosition = null;
    this.state.gameOver = false;
    this.state.gameWon = false;
    this.state.score = 0;
    this.state.turn = 0;
    this.state.startTime = Date.now();
    
    this.mutationRuntime = { eyeCooldown: 0, hintsRevealed: [] };
    
    // 创建中心格
    this.createCell(0, 0, 'center');
    this.state.revealedCells.add('0,0');
    this.state.revealedCount = 1;
    
    // 更新边缘
    this.updateEdgeCells();
    
    // 触发初始化回调
    this.trigger('init', { game: this });
    
    return this;
  }
  
  // 创建格子
  createCell(x, y, type = 'fog') {
    const key = `${x},${y}`;
    const cell = {
      x, y, key, type,
      revealed: false,
      number: 0,
      polluted: false,
      pollutionType: null,
      hasTorch: false,
      torchAmount: 0,
      isEdge: false
    };
    this.state.grid.set(key, cell);
    
    if (type === 'fog') {
      this.state.fogCellsCount++;
    }
    
    return cell;
  }
  
  // 获取邻居坐标
  getNeighbors(x, y) {
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    return dirs.map(([dx, dy]) => ({x: x + dx, y: y + dy}));
  }
  
  // 更新迷雾边缘
  updateEdgeCells() {
    this.state.edgeCells.clear();
    
    for (const key of this.state.revealedCells) {
      const cell = this.state.grid.get(key);
      const neighbors = this.getNeighbors(cell.x, cell.y);
      
      for (const neighbor of neighbors) {
        const nKey = `${neighbor.x},${neighbor.y}`;
        
        if (!this.state.grid.has(nKey)) {
          if (this.state.fogCellsCount >= this.config.maxCells) continue;
          const fogCell = this.createCell(neighbor.x, neighbor.y, 'fog');
          fogCell.isEdge = true;
          this.state.edgeCells.add(nKey);
        } else {
          const existing = this.state.grid.get(nKey);
          if (!existing.revealed && existing.type === 'fog') {
            existing.isEdge = true;
            this.state.edgeCells.add(nKey);
          }
        }
      }
    }
    
    this.trigger('edgeUpdate', { edgeCount: this.state.edgeCells.size });
  }
  
  // 计算火把消耗
  getTorchCost(cellType, isPolluted = false) {
    let cost = this.config.fogCost;
    
    switch(cellType) {
      case 'rift': cost = this.config.riftCost; break;
      case 'safe': cost = 0; break;
      case 'polluted': cost = this.config.pollutedCost; break;
    }
    
    // 沉重步伐畸变
    if (this.state.mutation === 'heavy') {
      const effect = MutationConfig.getEffect('heavy', this.config.mutationStrength);
      cost += effect.extraCost || 0;
    }
    
    return cost;
  }
  
  // 检查火把是否足够
  canAfford(cost) {
    return this.state.torch >= cost;
  }
  
  // 消耗火把
  spendTorch(amount) {
    this.state.torch = Math.max(0, this.state.torch - amount);
    this.trigger('torchChange', { torch: this.state.torch, delta: -amount });
    
    if (this.state.torch === 0) {
      this.checkGameOver();
    }
    
    return this.state.torch;
  }
  
  // 获得火把
  gainTorch(amount) {
    const oldTorch = this.state.torch;
    this.state.torch = Math.min(
      this.getMaxTorch(),
      this.state.torch + amount
    );
    const gained = this.state.torch - oldTorch;
    
    if (gained > 0) {
      this.trigger('torchChange', { torch: this.state.torch, delta: gained });
    }
    
    return gained;
  }
  
  // 获取火把上限（考虑畸变）
  getMaxTorch() {
    let max = this.config.maxTorch;
    
    if (this.state.mutation === 'heavy') {
      const effect = MutationConfig.getEffect('heavy', this.config.mutationStrength);
      max -= effect.maxTorchPenalty || 0;
    }
    
    return max;
  }
  
  // 揭示格子
  revealCell(key) {
    if (this.state.gameOver || this.state.gameWon) return false;
    
    const cell = this.state.grid.get(key);
    if (!cell || cell.revealed || !cell.isEdge) return false;
    
    // 计算成本
    const cost = this.getTorchCost(cell.type, cell.polluted);
    
    if (!this.canAfford(cost)) {
      this.trigger('insufficientTorch', { required: cost, current: this.state.torch });
      return false;
    }
    
    // 消耗火把
    this.spendTorch(cost);
    this.state.turn++;
    
    // 决定格子类型
    this.determineCellType(cell);
    
    // 深渊之眼效果
    if (this.state.mutation === 'eye' && this.mutationRuntime.eyeCooldown > 0) {
      this.mutationRuntime.eyeCooldown--;
    }
    
    cell.revealed = true;
    this.state.revealedCells.add(key);
    this.state.revealedCount++;
    
    // 处理格子效果
    this.processCellReveal(cell);
    
    // 更新边缘
    this.updateEdgeCells();
    
    // 触发揭示回调
    this.trigger('cellReveal', { cell, cost, turn: this.state.turn });
    
    return true;
  }
  
  // 决定格子类型
  determineCellType(cell) {
    // 核心生成
    if (this.state.revealedCount >= this.config.coreAfter && 
        !this.state.coreFound && !this.state.corePosition) {
      
      // 保底机制
      if (this.config.coreGuarantee && this.state.revealedCount >= this.config.coreGuarantee) {
        cell.type = 'core';
        this.state.corePosition = {x: cell.x, y: cell.y};
        this.trigger('coreAppear', { cell, guaranteed: true });
        return;
      }
      
      // 概率生成
      if (Math.random() < this.config.coreChance) {
        cell.type = 'core';
        this.state.corePosition = {x: cell.x, y: cell.y};
        this.trigger('coreAppear', { cell });
        return;
      }
    }
    
    // 裂隙保底
    if (this.state.revealedCount % this.config.riftGuarantee === 0 && 
        this.state.revealedCount > 0) {
      cell.type = 'rift';
      this.state.riftCount++;
      return;
    }
    
    // 随机类型
    const rand = Math.random();
    if (rand < this.config.riftRate) {
      cell.type = 'rift';
      this.state.riftCount++;
    } else if (rand < this.config.riftRate + this.config.mineRate) {
      cell.type = 'mine';
    } else {
      cell.type = 'safe';
      cell.number = this.countAdjacentMines(cell.x, cell.y);
      
      // 火把堆
      let chance = this.config.torchChance;
      if (this.state.mutation === 'sense') {
        const effect = MutationConfig.getEffect('sense', this.config.mutationStrength);
        chance += effect.torchChanceBonus || 0;
      }
      
      if (Math.random() < chance) {
        cell.hasTorch = true;
        cell.torchAmount = Math.floor(
          Math.random() * (this.config.torchAmountMax - this.config.torchAmountMin + 1)
        ) + this.config.torchAmountMin;
      }
    }
  }
  
  // 处理格子揭示效果
  processCellReveal(cell) {
    switch(cell.type) {
      case 'rift':
        this.growFromRift(cell);
        this.trigger('riftFound', { cell });
        break;
        
      case 'safe':
        if (cell.hasTorch) {
          this.gainTorch(cell.torchAmount);
          this.trigger('torchFound', { cell, amount: cell.torchAmount });
        }
        break;
        
      case 'mine':
        // 狂战士畸变不触发F3
        if (this.state.mutation === 'berserk') {
          this.trigger('mineNoF3', { cell });
        } else {
          this.triggerF3(cell);
        }
        break;
        
      case 'core':
        this.state.coreFound = true;
        this.trigger('coreFound', { cell });
        break;
    }
  }
  
  // 计算周围雷数
  countAdjacentMines(x, y) {
    return this.getNeighbors(x, y).filter(n => {
      const cell = this.state.grid.get(`${n.x},${n.y}`);
      return cell && cell.type === 'mine';
    }).length;
  }
  
  // 从裂隙生长
  growFromRift(riftCell) {
    const directions = [
      {dx: -1, dy: 0}, {dx: 1, dy: 0}, 
      {dx: 0, dy: -1}, {dx: 0, dy: 1}
    ];
    
    const shuffled = directions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);
    
    for (const dir of selected) {
      const newX = riftCell.x + dir.dx * 2;
      const newY = riftCell.y + dir.dy * 2;
      const newKey = `${newX},${newY}`;
      
      if (!this.state.grid.has(newKey) && this.state.fogCellsCount < this.config.maxCells) {
        const midX = riftCell.x + dir.dx;
        const midY = riftCell.y + dir.dy;
        
        if (!this.state.grid.has(`${midX},${midY}`)) {
          this.createCell(midX, midY, 'fog');
        }
        this.createCell(newX, newY, 'fog');
      }
    }
  }
  
  // 触发F3
  triggerF3(mineCell) {
    const neighbors = this.getNeighbors(mineCell.x, mineCell.y);
    let revealed = 0;
    
    for (const n of neighbors) {
      if (revealed >= this.config.f3RevealCount) break;
      
      const nKey = `${n.x},${n.y}`;
      if (!this.state.grid.has(nKey)) {
        const newCell = this.createCell(n.x, n.y, 'fog');
        this.determineCellType(newCell);
        
        newCell.revealed = true;
        newCell.polluted = true;
        newCell.pollutionType = this.getRandomPollution();
        
        this.state.revealedCells.add(nKey);
        this.state.revealedCount++;
        revealed++;
        
        if (newCell.hasTorch && Math.random() < this.config.f3TorchChance) {
          this.gainTorch(newCell.torchAmount);
        }
      }
    }
    
    // 获得印记（狂战士畸变除外）
    if (this.state.mutation !== 'berserk') {
      this.gainMark();
    }
    
    this.trigger('f3Trigger', { mineCell, revealedCells: revealed });
  }
  
  // 获取随机污染类型
  getRandomPollution() {
    const rand = Math.random();
    if (rand < this.config.f3PollutionBlur) return 'blur';
    if (rand < this.config.f3PollutionBlur + this.config.f3PollutionHeavy) return 'heavy';
    return 'unstable';
  }
  
  // 获得印记
  gainMark() {
    this.state.marks++;
    this.trigger('markGain', { marks: this.state.marks, cap: this.config.markCap });
    
    if (this.state.marks >= this.config.markCap) {
      this.triggerMutation();
    }
  }
  
  // 触发畸变选择
  triggerMutation() {
    const mutations = MutationConfig.getRandomMutations(3);
    this.trigger('mutationSelect', { mutations, game: this });
  }
  
  // 选择畸变
  selectMutation(mutationId) {
    this.state.mutation = mutationId;
    this.state.mutationData = MutationConfig.mutations[mutationId];
    this.state.marks = 0; // 重置印记
    
    // 应用即时效果
    const effect = MutationConfig.getEffect(mutationId, this.config.mutationStrength);
    
    if (mutationId === 'eye') {
      this.mutationRuntime.eyeCooldown = 0;
    }
    
    if (mutationId === 'berserk' && effect.torchBonus) {
      this.gainTorch(effect.torchBonus);
    }
    
    this.trigger('mutationAcquired', { 
      mutation: this.state.mutationData, 
      effect 
    });
  }
  
  // 撤退
  retreat() {
    if (this.state.gameOver || this.state.gameWon) return false;
    
    // 强迫症畸变检查
    if (this.state.mutation === 'obsessive') {
      const effect = MutationConfig.getEffect('obsessive', this.config.mutationStrength);
      const required = Math.floor(this.state.edgeCells.size * effect.requireRevealPercent);
      
      if (this.state.edgeCells.size > required) {
        this.trigger('obsessiveBlock', { remaining: this.state.edgeCells.size });
        return false;
      }
    }
    
    // 计算得分
    this.calculateScore();
    
    this.state.gameWon = true;
    this.trigger('gameEnd', { 
      won: true, 
      coreFound: this.state.coreFound,
      score: this.state.score 
    });
    
    return true;
  }
  
  // 计算得分
  calculateScore() {
    let score = 0;
    
    score += this.state.revealedCount * 10;
    if (this.state.coreFound) score += 500;
    score += this.state.torch * 20;
    score += this.state.riftCount * 50;
    
    if (this.state.mutation) {
      const type = this.state.mutationData?.type;
      if (type === 'positive') score += 100;
      else if (type === 'negative') score -= 50;
      else if (type === 'easter') score += 200;
    }
    
    this.state.score = score;
    return score;
  }
  
  // 检查游戏结束
  checkGameOver() {
    const affordable = Array.from(this.state.edgeCells).some(key => {
      const cell = this.state.grid.get(key);
      if (!cell) return false;
      return this.canAfford(this.getTorchCost('fog'));
    });
    
    if (!affordable) {
      this.state.gameOver = true;
      this.calculateScore();
      this.trigger('gameEnd', { 
        won: false, 
        reason: 'torchExhausted',
        score: this.state.score 
      });
    }
  }
  
  // 重新开始
  restart() {
    this.init();
    this.trigger('restart', { game: this });
  }
  
  // 事件触发
  trigger(event, data = {}) {
    if (this.callbacks[event]) {
      this.callbacks[event](data, this);
    }
  }
  
  // 注册事件回调
  on(event, callback) {
    this.callbacks[event] = callback;
    return this;
  }
  
  // 获取游戏状态（用于渲染）
  getState() {
    return { ...this.state, config: this.config };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MistGridGame;
}
