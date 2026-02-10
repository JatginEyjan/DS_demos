/**
 * DS01 - 深渊扫雷
 * 扫雷 + 搜打撤 + 克苏鲁
 */

class DeepSweeper {
    constructor() {
        this.gridSize = 12;
        this.mineCount = 20;
        this.grid = [];
        this.gameState = 'playing'; // playing, won, lost, extracted
        this.mode = 'explore'; // explore, flag
        
        // 搜打撤系统
        this.inventory = [];
        this.maxWeight = 10;
        this.currentWeight = 0;
        this.depth = 1;
        
        // 克苏鲁系统
        this.sanity = 100;
        this.maxSanity = 100;
        this.insanityLevel = 0; // 0-3
        this.whispers = [];
        
        // 游戏统计
        this.revealedCells = 0;
        this.collectedItems = 0;
        this.encounters = 0;
        
        // 物品类型
        this.itemTypes = {
            'fossil': { name: '未知化石', icon: '🦴', value: 10, weight: 1, desc: '似乎来自某种巨大生物' },
            'idol': { name: '诡异 idol', icon: '🗿', value: 50, weight: 2, desc: '注视它时，它也在注视你', cursed: true },
            'manuscript': { name: '古老手稿', icon: '📜', value: 30, weight: 0.5, desc: '无法解读的文字' },
            'relic': { name: '深渊遗物', icon: '💎', value: 100, weight: 3, desc: '散发着不自然的寒气', cursed: true },
            'tool': { name: '探测工具', icon: '🔧', value: 5, weight: 0.5, desc: '可以帮助扫描', consumable: true },
            'medkit': { name: '理智药剂', icon: '🧪', value: 20, weight: 0.5, desc: '恢复理智', consumable: true },
        };
        
        // 疯狂事件
        this.madnessEvents = [
            { title: '低语', text: '你听到了无法理解的低语...理智下降5点', sanity: -5 },
            { title: '幻觉', text: '某些格子的数字似乎在不断变化...', sanity: -10, effect: 'shuffle' },
            { title: '恐惧', text: '一种莫名的恐惧攫住了你...', sanity: -15 },
            { title: '窥视', text: '有什么东西从角落窥视着你...', sanity: -8 },
            { title: '迷失', text: '你突然忘记了自己在哪里...', sanity: -12 },
        ];
        
        // 古神低语
        this.eldritchWhispers = [
            '它们在等待...',
            '不要相信数字...',
            '深渊也在凝视你...',
            '你挖得太深了...',
            '那不是化石...',
            '撤离是幻觉...',
            '我们已经在这里很久了...',
            '标记它们...标记所有...',
        ];
        
        this.init();
    }
    
    init() {
        this.createGrid();
        this.placeMines();
        this.placeItems();
        this.placeExit();
        this.calculateNumbers();
        this.render();
        this.setupEventListeners();
        this.addLog('你潜入了深渊层级 1...', 'important');
        this.startWhisperLoop();
    }
    
    createGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            const row = [];
            for (let x = 0; x < this.gridSize; x++) {
                row.push({
                    x, y,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    number: 0,
                    item: null,
                    isExit: false
                });
            }
            this.grid.push(row);
        }
    }
    
    placeMines() {
        let placed = 0;
        while (placed < this.mineCount) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            if (!this.grid[y][x].isMine && !this.grid[y][x].isExit) {
                this.grid[y][x].isMine = true;
                placed++;
            }
        }
    }
    
    placeItems() {
        const itemCount = 8 + Math.floor(Math.random() * 5);
        let placed = 0;
        const itemKeys = Object.keys(this.itemTypes);
        
        while (placed < itemCount) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const cell = this.grid[y][x];
            
            if (!cell.isMine && !cell.item && !cell.isExit) {
                const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
                cell.item = { type: itemKey, ...this.itemTypes[itemKey] };
                placed++;
            }
        }
    }
    
    placeExit() {
        // 放置撤离点在远离起点的位置
        let placed = false;
        while (!placed) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const cell = this.grid[y][x];
            
            // 确保撤离点在底部右侧区域，远离起点(0,0)
            if (!cell.isMine && !cell.item && x > 6 && y > 6) {
                cell.isExit = true;
                placed = true;
            }
        }
    }
    
    calculateNumbers() {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (!this.grid[y][x].isMine) {
                    this.grid[y][x].number = this.countAdjacentMines(x, y);
                }
            }
        }
    }
    
    countAdjacentMines(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                    if (this.grid[ny][nx].isMine) count++;
                }
            }
        }
        return count;
    }
    
    reveal(x, y) {
        if (this.gameState !== 'playing') return;
        
        const cell = this.grid[y][x];
        if (cell.isRevealed || cell.isFlagged) return;
        
        cell.isRevealed = true;
        this.revealedCells++;
        
        // 检查地雷
        if (cell.isMine) {
            this.triggerMine(cell);
            return;
        }
        
        // 检查撤离点
        if (cell.isExit) {
            this.showExtractOption();
        }
        
        // 拾取物品
        if (cell.item) {
            this.collectItem(cell);
        }
        
        // 理智消耗（每次点击都有小概率触发疯狂）
        if (Math.random() < 0.05) {
            this.triggerMadness();
        }
        
        // 空格子自动展开
        if (cell.number === 0 && !cell.item) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                        setTimeout(() => this.reveal(nx, ny), 50);
                    }
                }
            }
        }
        
        // 检查胜利条件（到达撤离点并选择撤离）
        this.render();
    }
    
    triggerMine(cell) {
        // 踩雷不一定立即死亡，而是造成理智损失和事件
        this.sanity -= 20;
        this.addLog('你触发了陷阱！理智受损！', 'insanity');
        
        if (this.sanity <= 0) {
            this.gameOver('疯狂');
        } else {
            // 标记这个格子为"已触发"但继续游戏（这是搜打撤的特点）
            cell.isRevealed = true;
            this.encounters++;
            this.updateInsanityLevel();
        }
    }
    
    collectItem(cell) {
        const item = cell.item;
        if (this.currentWeight + item.weight > this.maxWeight) {
            this.addLog(`负重已满，无法拾取 ${item.name}`, 'important');
            return;
        }
        
        this.inventory.push(item);
        this.currentWeight += item.weight;
        this.collectedItems++;
        
        this.addLog(`拾取了 ${item.name} - ${item.desc}`, 'important');
        
        // 诅咒物品降低理智
        if (item.cursed) {
            this.sanity -= 5;
            this.addLog(`诅咒之物在侵蚀你的理智...`, 'insanity');
        }
        
        // 消耗品立即使用
        if (item.consumable) {
            this.useItem(this.inventory.length - 1);
        }
        
        cell.item = null;
        this.updateUI();
    }
    
    useItem(index) {
        const item = this.inventory[index];
        if (!item.consumable) return;
        
        if (item.type === 'medkit') {
            this.sanity = Math.min(this.maxSanity, this.sanity + 30);
            this.addLog('理智药剂恢复了一些理智', 'important');
        } else if (item.type === 'tool') {
            this.revealRandomSafeCell();
            this.addLog('探测工具揭示了一个安全区域', 'important');
        }
        
        this.inventory.splice(index, 1);
        this.currentWeight -= item.weight;
        this.updateUI();
    }
    
    revealRandomSafeCell() {
        const safeCells = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (!cell.isMine && !cell.isRevealed) {
                    safeCells.push(cell);
                }
            }
        }
        
        if (safeCells.length > 0) {
            const cell = safeCells[Math.floor(Math.random() * safeCells.length)];
            this.reveal(cell.x, cell.y);
        }
    }
    
    toggleFlag(x, y) {
        if (this.gameState !== 'playing') return;
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;
        cell.isFlagged = !cell.isFlagged;
        this.render();
    }
    
    triggerMadness() {
        const event = this.madnessEvents[Math.floor(Math.random() * this.madnessEvents.length)];
        this.sanity += event.sanity;
        
        this.showModal(event.title, event.text, [
            { text: '继续...', action: () => this.hideModal() }
        ]);
        
        this.addLog(`[疯狂] ${event.title}: ${event.text}`, 'insanity');
        this.updateInsanityLevel();
    }
    
    updateInsanityLevel() {
        const oldLevel = this.insanityLevel;
        if (this.sanity > 70) this.insanityLevel = 0;
        else if (this.sanity > 40) this.insanityLevel = 1;
        else if (this.sanity > 20) this.insanityLevel = 2;
        else this.insanityLevel = 3;
        
        if (this.insanityLevel !== oldLevel) {
            this.applyInsanityEffects();
        }
        
        this.updateUI();
    }
    
    applyInsanityEffects() {
        const body = document.body;
        body.classList.remove('insanity-low', 'insanity-med', 'insanity-high');
        
        if (this.insanityLevel >= 2) {
            body.classList.add('insanity-low');
        }
        
        if (this.insanityLevel >= 3) {
            this.addLog('警告：理智濒临崩溃边缘！', 'insanity');
        }
    }
    
    showExtractOption() {
        const btn = document.getElementById('extract-btn');
        btn.classList.remove('hidden');
        this.addLog('发现了撤离点！你可以选择带着战利品撤离，或者继续探索更深...', 'important');
    }
    
    extract() {
        // 计算得分
        let totalValue = 0;
        this.inventory.forEach(item => totalValue += item.value);
        
        const stats = `
            <div class="stat-line">探索深度: ${this.depth}</div>
            <div class="stat-line">揭示区域: ${this.revealedCells}</div>
            <div class="stat-line">收集物品: ${this.collectedItems}</div>
            <div class="stat-line">遭遇事件: ${this.encounters}</div>
            <div class="stat-line">剩余理智: ${this.sanity}</div>
            <div class="stat-line">总收益: ${totalValue}</div>
        `;
        
        this.showEndModal('成功撤离', '你带着战利品逃出了深渊。但你知道，那里还有更多秘密...', stats);
        this.gameState = 'extracted';
    }
    
    gameOver(reason) {
        let text = '';
        if (reason === '疯狂') {
            text = '你的理智崩溃了。在最后的清醒时刻，你意识到自己成为了深渊的一部分...';
        }
        
        this.showEndModal('探索失败', text, '');
        this.gameState = 'lost';
    }
    
    scan() {
        if (this.sanity < 10) {
            this.addLog('理智不足，无法进行扫描', 'important');
            return;
        }
        
        this.sanity -= 10;
        // 揭示周围3x3区域内是否有地雷
        this.addLog('扫描完成...周围的地雷分布在你的脑海中显现', 'important');
        this.updateUI();
    }
    
    rest() {
        this.sanity = Math.min(this.maxSanity, this.sanity + 10);
        this.addLog('你休息了一会儿，恢复了些许理智...', 'important');
        this.updateUI();
    }
    
    startWhisperLoop() {
        setInterval(() => {
            if (this.gameState === 'playing' && this.insanityLevel >= 1) {
                if (Math.random() < 0.3) {
                    const whisper = this.eldritchWhispers[Math.floor(Math.random() * this.eldritchWhispers.length)];
                    this.addLog(`低语: "${whisper}"`, 'insanity');
                }
            }
        }, 15000);
    }
    
    addLog(text, type = '') {
        const logContent = document.getElementById('log-content');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        logContent.insertBefore(entry, logContent.firstChild);
        
        // 限制日志数量
        while (logContent.children.length > 20) {
            logContent.removeChild(logContent.lastChild);
        }
    }
    
    showModal(title, text, choices) {
        const modal = document.getElementById('event-modal');
        document.getElementById('event-title').textContent = title;
        document.getElementById('event-text').textContent = text;
        
        const choicesContainer = document.getElementById('event-choices');
        choicesContainer.innerHTML = '';
        
        choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = choice.text;
            btn.onclick = choice.action;
            choicesContainer.appendChild(btn);
        });
        
        modal.classList.remove('hidden');
    }
    
    hideModal() {
        document.getElementById('event-modal').classList.add('hidden');
    }
    
    showEndModal(title, text, stats) {
        const modal = document.getElementById('end-modal');
        document.getElementById('end-title').textContent = title;
        document.getElementById('end-text').textContent = text;
        document.getElementById('end-stats').innerHTML = stats;
        modal.classList.remove('hidden');
    }
    
    restart() {
        document.getElementById('end-modal').classList.add('hidden');
        document.body.classList.remove('insanity-low', 'insanity-med', 'insanity-high');
        document.getElementById('extract-btn').classList.add('hidden');
        
        // 重置所有状态
        this.inventory = [];
        this.currentWeight = 0;
        this.sanity = 100;
        this.insanityLevel = 0;
        this.revealedCells = 0;
        this.collectedItems = 0;
        this.encounters = 0;
        this.gameState = 'playing';
        
        document.getElementById('log-content').innerHTML = '';
        this.init();
    }
    
    updateUI() {
        // 更新理智条
        const sanityBar = document.getElementById('sanity-bar');
        const sanityValue = document.getElementById('sanity-value');
        const percentage = (this.sanity / this.maxSanity) * 100;
        sanityBar.style.width = `${percentage}%`;
        sanityValue.textContent = Math.floor(this.sanity);
        
        if (percentage < 30) {
            sanityBar.classList.add('low');
        } else {
            sanityBar.classList.remove('low');
        }
        
        // 更新负重
        document.getElementById('weight-value').textContent = 
            `${this.currentWeight.toFixed(1)}/${this.maxWeight}`;
        
        // 更新深度
        document.getElementById('depth-value').textContent = this.depth;
        
        // 更新背包
        this.renderInventory();
    }
    
    renderInventory() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';
        
        for (let i = 0; i < 15; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            
            if (i < this.inventory.length) {
                const item = this.inventory[i];
                slot.textContent = item.icon;
                slot.title = `${item.name} (${item.weight}kg)\n${item.desc}`;
                if (item.cursed) slot.classList.add('artifact');
                
                if (item.consumable) {
                    slot.onclick = () => this.useItem(i);
                }
            }
            
            grid.appendChild(slot);
        }
    }
    
    render() {
        const minefield = document.getElementById('minefield');
        minefield.innerHTML = '';
        
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cell';
                cellDiv.dataset.x = x;
                cellDiv.dataset.y = y;
                
                if (cell.isRevealed) {
                    cellDiv.classList.add('revealed');
                    
                    if (cell.isMine) {
                        cellDiv.classList.add('mine');
                        cellDiv.textContent = '💀';
                    } else if (cell.isExit) {
                        cellDiv.classList.add('exit');
                        cellDiv.textContent = '🚪';
                    } else if (cell.number > 0) {
                        cellDiv.dataset.number = cell.number;
                        cellDiv.textContent = cell.number;
                    }
                } else {
                    if (cell.isFlagged) {
                        cellDiv.classList.add('flagged');
                        cellDiv.textContent = '🚩';
                    } else if (cell.item && this.insanityLevel >= 2) {
                        // 高疯狂等级时可以看到物品
                        cellDiv.classList.add('whisper');
                        cellDiv.textContent = '?';
                    }
                }
                
                cellDiv.onclick = () => {
                    if (this.mode === 'explore') {
                        this.reveal(x, y);
                    } else {
                        this.toggleFlag(x, y);
                    }
                };
                
                cellDiv.oncontextmenu = (e) => {
                    e.preventDefault();
                    this.toggleFlag(x, y);
                };
                
                minefield.appendChild(cellDiv);
            }
        }
        
        this.updateUI();
    }
    
    setupEventListeners() {
        // 模式切换
        document.getElementById('explore-mode').onclick = () => {
            this.mode = 'explore';
            document.getElementById('explore-mode').classList.add('active');
            document.getElementById('flag-mode').classList.remove('active');
        };
        
        document.getElementById('flag-mode').onclick = () => {
            this.mode = 'flag';
            document.getElementById('flag-mode').classList.add('active');
            document.getElementById('explore-mode').classList.remove('active');
        };
        
        // 动作按钮
        document.getElementById('scan-btn').onclick = () => this.scan();
        document.getElementById('rest-btn').onclick = () => this.rest();
        document.getElementById('extract-btn').onclick = () => this.extract();
        document.getElementById('restart-btn').onclick = () => this.restart();
    }
}

// 启动游戏
window.onload = () => {
    window.game = new DeepSweeper();
};
