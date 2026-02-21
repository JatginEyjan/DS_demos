/**
 * DS11 UI渲染器
 * 负责将游戏状态渲染为DOM
 */
class GameRenderer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      cellSize: 60,
      gap: 8,
      showCostBadge: true
    }, options);
    
    this.game = null;
  }
  
  // 绑定游戏实例
  bind(game) {
    this.game = game;
    
    // 注册游戏事件
    game.on('init', () => this.render());
    game.on('cellReveal', () => this.render());
    game.on('edgeUpdate', () => this.updateUI());
    game.on('torchChange', () => this.updateUI());
    game.on('markGain', () => this.updateUI());
    game.on('mutationAcquired', () => this.updateUI());
    game.on('coreFound', () => this.updateUI());
    
    return this;
  }
  
  // 主渲染方法
  render() {
    if (!this.game) return;
    
    const state = this.game.getState();
    const gridContainer = this.container;
    gridContainer.innerHTML = '';
    
    // 计算网格范围
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (const cell of state.grid.values()) {
      minX = Math.min(minX, cell.x);
      maxX = Math.max(maxX, cell.x);
      minY = Math.min(minY, cell.y);
      maxY = Math.max(maxY, cell.y);
    }
    
    const width = maxX - minX + 1;
    gridContainer.style.gridTemplateColumns = `repeat(${width}, ${this.options.cellSize}px)`;
    
    // 渲染所有格子
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${y}`;
        const cell = state.grid.get(key);
        const cellDiv = this.createCellElement(cell, key);
        gridContainer.appendChild(cellDiv);
      }
    }
    
    this.updateUI();
  }
  
  // 创建格子DOM元素
  createCellElement(cell, key) {
    const div = document.createElement('div');
    div.className = 'cell';
    
    if (!cell) {
      div.style.visibility = 'hidden';
      return div;
    }
    
    // 根据类型设置样式
    if (cell.type === 'center') {
      div.classList.add('center');
      div.textContent = '★';
    } else if (!cell.revealed) {
      div.classList.add('fog');
      if (cell.isEdge) {
        div.classList.add('edge');
        
        // 显示火把消耗
        if (this.options.showCostBadge) {
          const cost = this.game.getTorchCost('fog', cell.polluted);
          const badge = document.createElement('span');
          badge.className = 'cost-badge';
          badge.textContent = cost;
          div.appendChild(badge);
        }
        
        // 检查火把是否足够
        const cost = this.game.getTorchCost('fog', cell.polluted);
        if (!this.game.canAfford(cost)) {
          div.classList.add('disabled');
        } else {
          div.onclick = () => this.game.revealCell(key);
        }
      }
    } else if (cell.type === 'safe') {
      div.classList.add('safe');
      div.textContent = cell.number;
      if (cell.hasTorch) {
        div.textContent += '🔥';
      }
    } else if (cell.type === 'rift') {
      div.classList.add('rift');
      div.textContent = '裂';
    } else if (cell.type === 'mine') {
      div.classList.add('mine');
      div.textContent = '💀';
    } else if (cell.type === 'core') {
      div.classList.add('core');
      div.textContent = '💎';
    }
    
    if (cell.polluted) {
      div.classList.add('polluted');
    }
    
    return div;
  }
  
  // 更新UI面板
  updateUI() {
    if (!this.game) return;
    
    const state = this.game.getState();
    
    // 更新统计信息
    this.setText('revealedCount', state.revealedCount);
    this.setText('edgeCount', state.edgeCells.size);
    this.setText('riftCount', state.riftCount);
    this.setText('torchCount', `${state.torch}/${this.game.getMaxTorch()}`);
    this.setText('markCount', `${state.marks}/${state.config.markCap}`);
    
    // 火把低警告
    const torchInfo = document.getElementById('torchInfo');
    if (torchInfo) {
      torchInfo.classList.toggle('torch-low', state.torch <= 2);
    }
    
    // 印记警告
    const markInfo = document.getElementById('markInfo');
    if (markInfo) {
      markInfo.style.borderColor = state.marks >= state.config.markCap - 1 ? '#e94560' : '#2a2a3a';
    }
    
    // 畸变显示
    const mutationInfo = document.getElementById('mutationInfo');
    if (mutationInfo && state.mutation) {
      mutationInfo.style.display = 'block';
      const data = MutationConfig.mutations[state.mutation];
      this.setText('mutationName', data ? data.name : '无');
    }
    
    // 核心显示
    const coreInfo = document.getElementById('coreInfo');
    if (coreInfo && state.coreFound) {
      coreInfo.style.display = 'block';
      this.setText('coreStatus', '已找到！');
      document.getElementById('coreStatus').style.color = '#27ae60';
    }
    
    // 迷雾上限警告
    const limitInfo = document.getElementById('limitInfo');
    if (limitInfo) {
      if (state.fogCellsCount >= state.config.maxCells) {
        limitInfo.style.display = 'block';
        this.setText('limitCount', `${state.fogCellsCount}/${state.config.maxCells}`);
      } else {
        limitInfo.style.display = 'none';
      }
    }
  }
  
  // 辅助方法：设置文本
  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  
  // 显示畸变选择界面
  showMutationSelect(mutations, onSelect) {
    const overlay = document.getElementById('mutationOverlay');
    const container = document.getElementById('mutationOptions');
    
    if (!overlay || !container) return;
    
    container.innerHTML = '';
    
    for (const m of mutations) {
      const card = document.createElement('div');
      card.className = `mutation-card ${m.type}`;
      card.innerHTML = `
        <div class="mutation-icon">${m.icon}</div>
        <div class="mutation-name">${m.name}</div>
        <div class="mutation-desc-text">${m.description}</div>
      `;
      card.onclick = () => {
        onSelect(m.id);
        overlay.classList.remove('show');
      };
      container.appendChild(card);
    }
    
    overlay.classList.add('show');
  }
  
  // 显示游戏结束
  showGameEnd(won, data) {
    if (won) {
      const overlay = document.getElementById('winOverlay');
      const reason = document.getElementById('winReason');
      
      if (reason) {
        reason.textContent = data.coreFound 
          ? '成功找到深渊核心并撤退！' 
          : '撤退了，但未找到深渊核心...';
      }
      
      if (overlay) overlay.classList.add('show');
      this.renderScore(data.score);
    } else {
      const overlay = document.getElementById('gameOverOverlay');
      if (overlay) overlay.classList.add('show');
    }
  }
  
  // 渲染分数
  renderScore(score) {
    const display = document.getElementById('scoreDisplay');
    const breakdown = document.getElementById('scoreBreakdown');
    
    if (display) display.textContent = `得分: ${score}`;
    
    if (breakdown && this.game) {
      const state = this.game.getState();
      const details = [
        `揭示格数: ${state.revealedCount} × 10 = ${state.revealedCount * 10}`,
        state.coreFound ? '找到核心: +500' : '',
        `剩余火把: ${state.torch} × 20 = ${state.torch * 20}`,
        `发现裂隙: ${state.riftCount} × 50 = ${state.riftCount * 50}`,
      ].filter(Boolean);
      
      breakdown.innerHTML = details.join('<br>');
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameRenderer;
}
