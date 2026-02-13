/**
 * DS09 - 幽暗编年史：深渊重构
 * 从计算型扫雷转向不可名状的生存恐怖
 */

class DS09Game {
    constructor() {
        // 道具定义（简化版）
        this.itemTypes = {
            sanityPotion: { id: 'sanityPotion', name: '理智药水', icon: '🧪', type: 'functional', desc: '恢复20点理智值', effect: 'sanity+20' },
            detector: { id: 'detector', name: '探测器', icon: '🔍', type: 'functional', desc: '揭示威胁等级和机遇', effect: 'reveal' },
            markerPack: { id: 'markerPack', name: '标记器套装', icon: '🚩', type: 'functional', desc: '获得2个标记器', effect: 'markers+2' },
            lantern: { id: 'lantern', name: '煤油灯', icon: '🏮', type: 'functional', desc: '降低遭遇概率', effect: 'safety' }
        };
        
        // 威胁等级定义
        this.threatLevels = {
            safe: { icon: '🟢', name: '安全', color: '#4ade80', min: 0, max: 2 },
            unease: { icon: '🟡', name: '不安', color: '#fbbf24', min: 3, max: 5 },
            danger: { icon: '🔴', name: '危险', color: '#f87171', min: 6, max: 999 }
        };
        
        // 机遇类型
        this.opportunityTypes = {
            none: { icon: '·', name: '普通', chance: 0 },
            anomaly: { icon: '👁️', name: '异常', chance: 0.3 }, // 30%有特殊内容
            echo: { icon: '📜', name: '回声', chance: 1.0 } // 确定有特殊内容
        };
        
        // 遭遇类型
        this.encounterTypes = {
            whisper: { name: '低语者', sanityCost: 5, text: '你听到了无法理解的低语...' },
            shadow: { name: '阴影', sanityCost: 10, text: '黑暗中有什么东西掠过...' },
            presence: { name: '古老存在', sanityCost: 15, text: '你感觉到了它的注视！' }
        };
        
        // 副本配置（简化版）
        this.dungeons = {
            shadow: {
                id: 'shadow',
                name: '岭下暗影',
                theme: '蛇人/隧道/生存',
                unlocked: true,
                layers: [
                    { size: 6, main: 1, sub: 2, extractions: 1 },
                    { size: 9, main: 2, sub: 3, extractions: 1 },
                    { size: 10, main: 2, sub: 4, extractions: 2 },
                    { size: 12, main: 2, sub: 5, extractions: 2 },
                    { size: 14, main: 3, sub: 6, extractions: 1 }
                ]
            }
        };
        
        // 游戏状态
        this.state = 'lobby';
        this.currentDungeon = null;
        this.currentLayer = 0;
        this.grid = [];
        this.gridSize = 0;
        this.sanity = 100;
        this.markers = 3;
        this.dungeonInv = [];
        this.lootValue = 0; // 本层搜刮价值
        this.extractionPoints = []; // 撤离点位置
        this.foundExtraction = false; // 是否找到撤离点
        
        this.persistent = this.loadData();
        this.init();
    }
    
    loadData() {
        const defaultData = { gold: 0, completedRuns: 0, bestLoot: 0 };
        try {
            const saved = localStorage.getItem('DS09_save');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }
    
    saveData() {
        localStorage.setItem('DS09_save', JSON.stringify(this.persistent));
    }
    
    init() {
        this.showLobby();
    }
    
    // ===== 大厅界面 =====
    showLobby() {
        this.state = 'lobby';
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="lobby">
                <header>
                    <h1>🌑 DS09 - 幽暗编年史：深渊重构</h1>
                    <div class="stats">
                        <span>💰 ${this.persistent.gold}</span>
                        <span>🏆 ${this.persistent.completedRuns} 次撤离</span>
                    </div>
                </header>
                <div class="dungeon-selection">
                    <h2>选择探索的区域</h2>
                    <div class="dungeon-card" onclick="game.startDungeon('shadow')">
                        <h3>岭下暗影</h3>
                        <p>威胁等级 + 机遇符号 + 遭遇概率</p>
                        <p class="status">🟢 可探索</p>
                    </div>
                </div>
                <div class="rules-hint">
                    <h3>🎮 新机制预览</h3>
                    <p>🟢🟡🔴 <strong>威胁等级</strong> - 模糊感知替代精确数字</p>
                    <p>👁️📜 <strong>机遇符号</strong> - 高风险可能带来高回报</p>
                    <p>🎲 <strong>遭遇概率</strong> - 每次移动都可能遭遇古老存在</p>
                    <p>🚪 <strong>撤离点</strong> - 找到出口才能安全离开</p>
                </div>
            </div>
        `;
    }
    
    // ===== 开始探索 =====
    startDungeon(dungeonId) {
        this.currentDungeon = this.dungeons[dungeonId];
        this.currentLayer = 0;
        this.dungeonInv = [];
        this.startLayer(0);
    }
    
    startLayer(layerIndex) {
        this.currentLayer = layerIndex;
        const config = this.currentDungeon.layers[layerIndex];
        this.gridSize = config.size;
        this.sanity = 100;
        this.markers = 3;
        this.lootValue = 0;
        this.foundExtraction = false;
        this.state = 'dungeon';
        
        this.createGrid();
        this.placeSpecialRooms(config.main, config.sub);
        this.placeExtractionPoints(config.extractions);
        this.calcThreatLevels();
        this.placeOpportunities();
        
        this.renderDungeon();
    }
    
    // ===== 核心机制：创建网格 =====
    createGrid() {
        this.grid = Array(this.gridSize).fill(null).map((_, y) =>
            Array(this.gridSize).fill(null).map((_, x) => ({
                x, y,
                isRevealed: false,
                isMarked: false,
                threatLevel: 'safe', // safe, unease, danger
                opportunity: 'none', // none, anomaly, echo
                roomType: 'normal', // normal, main, sub
                hasExtraction: false
            }))
        );
    }
    
    // ===== 核心机制：放置撤离点 =====
    placeExtractionPoints(count) {
        this.extractionPoints = [];
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) {
                this.grid[pos.y][pos.x].hasExtraction = true;
                this.extractionPoints.push(pos);
            }
        }
    }
    
    // ===== 核心机制：计算威胁等级 =====
    calcThreatLevels() {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                let threatValue = 0;
                
                // 检查周围8格
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                            const neighbor = this.grid[ny][nx];
                            if (neighbor.roomType !== 'normal') {
                                threatValue += 2; // 特殊房间贡献更高威胁
                            }
                        }
                    }
                }
                
                // 根据威胁值确定等级
                if (threatValue <= 2) cell.threatLevel = 'safe';
                else if (threatValue <= 5) cell.threatLevel = 'unease';
                else cell.threatLevel = 'danger';
            }
        }
    }
    
    // ===== 核心机制：放置机遇符号 =====
    placeOpportunities() {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (cell.roomType !== 'normal') {
                    cell.opportunity = 'echo'; // 确定有内容的房间显示回声
                } else {
                    // 普通格子30%概率显示异常
                    cell.opportunity = Math.random() < 0.3 ? 'anomaly' : 'none';
                }
            }
        }
    }
    
    // ===== 核心机制：遭遇判定 =====
    checkEncounter() {
        const roll = Math.floor(Math.random() * 100) + 1;
        return roll > this.sanity; // 超过理智值则遭遇
    }
    
    // ===== 核心机制：处理遭遇 =====
    triggerEncounter() {
        const types = Object.keys(this.encounterTypes);
        const type = types[Math.floor(Math.random() * types.length)];
        const encounter = this.encounterTypes[type];
        
        this.sanity = Math.max(0, this.sanity - encounter.sanityCost);
        this.log(`⚠️ ${encounter.text} 理智-${encounter.sanityCost}`);
        
        // 显示遭遇弹窗
        this.showEncounterModal(encounter);
    }
    
    showEncounterModal(encounter) {
        const modal = document.createElement('div');
        modal.id = 'encounter-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content encounter-content">
                <h3>👁️ 遭遇：${encounter.name}</h3>
                <p>${encounter.text}</p>
                <p class="sanity-loss">理智 -${encounter.sanityCost}</p>
                <button onclick="game.closeEncounterModal()">继续</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    closeEncounterModal() {
        const modal = document.getElementById('encounter-modal');
        if (modal) modal.remove();
    }
    
    // ===== 渲染 =====
    renderDungeon() {
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="dungeon">
                <header>
                    <button onclick="game.quitToLobby()">⬅️ 放弃探索</button>
                    <div class="dungeon-info">
                        <span>第 ${this.currentLayer + 1} 层</span>
                        <span>💰 本层收获: ${this.lootValue}</span>
                    </div>
                    <div class="resources">
                        <span>🧠 ${this.sanity}</span>
                        <span>🚩 ${this.markers}</span>
                    </div>
                </header>
                <div class="threat-legend">
                    <span>🟢 安全</span>
                    <span>🟡 不安</span>
                    <span>🔴 危险</span>
                    <span>👁️ 异常</span>
                    <span>📜 回声</span>
                    <span>🚪 撤离点</span>
                </div>
                <div id="minefield" style="grid-template-columns: repeat(${this.gridSize}, 40px);">
                    ${this.renderGridCells()}
                </div>
                ${this.foundExtraction ? `
                    <div class="extraction-notice">
                        <p>🚪 发现撤离点！</p>
                        <button onclick="game.showExtractionChoice()">选择行动</button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderGridCells() {
        let html = '';
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                let className = 'cell';
                let content = '';
                
                if (cell.isRevealed) {
                    className += ' revealed';
                    const threat = this.threatLevels[cell.threatLevel];
                    className += ` threat-${cell.threatLevel}`;
                    
                    if (cell.hasExtraction) {
                        content = '🚪';
                    } else {
                        content = threat.icon;
                    }
                } else {
                    const opp = this.opportunityTypes[cell.opportunity];
                    content = opp.icon;
                    if (cell.opportunity !== 'none') {
                        className += ` opportunity-${cell.opportunity}`;
                    }
                }
                
                html += `<div class="${className}" onclick="game.handleCellClick(${x},${y})">${content}</div>`;
            }
        }
        return html;
    }
    
    // ===== 点击处理 =====
    handleCellClick(x, y) {
        if (this.state !== 'dungeon') return;
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;
        
        // 揭示格子
        cell.isRevealed = true;
        
        // 检查是否是撤离点
        if (cell.hasExtraction) {
            this.foundExtraction = true;
            this.log('🚪 发现撤离点！');
        }
        
        // 遭遇判定
        if (this.checkEncounter()) {
            this.triggerEncounter();
        }
        
        // 检查房间类型
        if (cell.roomType !== 'normal') {
            this.triggerRoomEvent(cell);
        }
        
        // 增加搜刮价值
        this.lootValue += 10 + Math.floor(Math.random() * 20);
        
        this.renderDungeon();
    }
    
    triggerRoomEvent(cell) {
        // 简化版房间事件
        const isMain = cell.roomType === 'main';
        this.log(`${isMain ? '🎯 发现重要房间！' : '📍 发现隐藏区域'}`);
        this.lootValue += isMain ? 100 : 50;
    }
    
    // ===== 撤离选择 =====
    showExtractionChoice() {
        const modal = document.createElement('div');
        modal.id = 'extraction-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🚪 撤离点</h3>
                <p>你找到了通往上一层的出口。</p>
                <p>💰 当前收获: ${this.lootValue}</p>
                <div class="extraction-choices">
                    <button onclick="game.extractNow()" class="primary">
                        🏃 立即撤离<br>
                        <small>安全带走全部收获，理智恢复</small>
                    </button>
                    <button onclick="game.continueExploring()">
                        ⚔️ 继续深入<br>
                        <small>收益翻倍，但无法回头</small>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    extractNow() {
        // 结算并返回大厅
        this.persistent.gold += this.lootValue;
        this.persistent.completedRuns++;
        this.saveData();
        
        const modal = document.getElementById('extraction-modal');
        if (modal) modal.remove();
        
        alert(`✅ 安全撤离！\n💰 获得 ${this.lootValue} 金币`);
        this.showLobby();
    }
    
    continueExploring() {
        this.lootValue *= 2;
        this.foundExtraction = false;
        
        const modal = document.getElementById('extraction-modal');
        if (modal) modal.remove();
        
        this.log('⚠️ 你选择继续深入...收益翻倍！');
        this.renderDungeon();
    }
    
    // ===== 工具函数 =====
    getRandomEmptyCell() {
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const cell = this.grid[y][x];
            if (cell.roomType === 'normal' && !cell.hasExtraction) {
                return { x, y };
            }
            attempts++;
        }
        return null;
    }
    
    placeSpecialRooms(mainCount, subCount) {
        // 放置主线房
        for (let i = 0; i < mainCount; i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) this.grid[pos.y][pos.x].roomType = 'main';
        }
        // 放置支线房
        for (let i = 0; i < subCount; i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) this.grid[pos.y][pos.x].roomType = 'sub';
        }
    }
    
    log(msg) {
        console.log(`[DS09] ${msg}`);
    }
    
    quitToLobby() {
        if (confirm('确定要放弃本次探索吗？所有收获将丢失。')) {
            this.showLobby();
        }
    }
}

// 初始化游戏
const game = new DS09Game();