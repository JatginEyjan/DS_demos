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
                    <span class="legend-threat">🟢 安全</span>
                    <span class="legend-threat">🟡 不安</span>
                    <span class="legend-threat">🔴 危险</span>
                    <span class="legend-divider">|</span>
                    <span class="legend-opp">· 普通</span>
                    <span class="legend-opp">👁️ 异常</span>
                    <span class="legend-opp">📜 回声</span>
                    <span class="legend-divider">|</span>
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
                let threatIcon = '';
                
                // 威胁等级（通过底色/边框显示）
                const threat = this.threatLevels[cell.threatLevel];
                className += ` threat-${cell.threatLevel}`;
                threatIcon = threat.icon;
                
                if (cell.isRevealed) {
                    className += ' revealed';
                    
                    if (cell.hasExtraction) {
                        // 撤离点：显示撤离图标
                        content = '🚪';
                    } else if (cell.roomType !== 'normal') {
                        // 已揭示的特殊房间：显示房间类型
                        content = cell.roomType === 'main' ? '🎯' : '📍';
                    } else {
                        // 普通揭示格子：显示威胁等级图标
                        content = threatIcon;
                    }
                } else {
                    // 未揭示格子：显示机遇符号
                    const opp = this.opportunityTypes[cell.opportunity];
                    content = opp.icon;
                    
                    // 双重提示：机遇图标 + 威胁底色
                    // 图标显示机遇，底色显示威胁
                }
                
                // 添加数据属性用于调试
                html += `<div class="${className}" 
                              data-x="${x}" data-y="${y}"
                              data-threat="${cell.threatLevel}"
                              data-opp="${cell.opportunity}"
                              onclick="game.handleCellClick(${x},${y})">${content}</div>`;
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
        const isMain = cell.roomType === 'main';
        const roomName = isMain ? '重要房间' : '隐藏区域';
        const sanityChange = isMain ? -10 : -5;
        const lootBonus = isMain ? 100 : 50;
        
        // 显示剧情弹窗
        this.showRoomEventModal(isMain, roomName, sanityChange, lootBonus);
    }
    
    showRoomEventModal(isMain, roomName, sanityChange, lootBonus) {
        // 随机剧情文本
        const mainStories = [
            '你推开腐朽的门，发现了一个古老的祭坛。墙上刻满了你无法理解的符文，空气中弥漫着腐朽和香料混合的气味。祭坛上放着一些物品...',
            '这是一个被遗弃的密室，地面上的灰尘显示这里已经很久没有人来过。角落里有一个破旧的箱子，你小心翼翼地打开它...',
            '你进入了一个宽阔的洞窟，头顶的钟乳石滴着水。在火光的照耀下，你看到墙壁上画着某种生物的壁画，那生物有着蛇一般的身体和人的面孔...'
        ];
        const subStories = [
            '你发现了一条狭窄的通道，墙壁上有人用指甲刻下的痕迹。那是求救信号，还是某种警告？你在角落发现了一些遗留物...',
            '这是一个储藏室，里面堆满了腐朽的木箱。你撬开其中一个，发现了一些还能使用的物品...',
            '你推开隐藏的暗门，发现了一个小空间。这里曾是某人的藏身处，留下了一些生存物资...'
        ];
        
        const storyText = isMain ? mainStories[Math.floor(Math.random() * mainStories.length)] : subStories[Math.floor(Math.random() * subStories.length)];
        
        const modal = document.createElement('div');
        modal.id = 'room-event-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content room-event-content">
                <h3>${isMain ? '🎯' : '📍'} 发现${roomName}</h3>
                <div class="story-text">${storyText}</div>
                <div class="event-effects">
                    <p>🧠 理智 ${sanityChange > 0 ? '+' : ''}${sanityChange}</p>
                    <p>💰 收获 +${lootBonus}</p>
                </div>
                <button onclick="game.closeRoomEventModal(${sanityChange}, ${lootBonus})">继续探索</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    closeRoomEventModal(sanityChange, lootBonus) {
        // 应用数值变化
        this.sanity = Math.max(0, this.sanity + sanityChange);
        this.lootValue += lootBonus;
        
        const modal = document.getElementById('room-event-modal');
        if (modal) modal.remove();
        
        this.renderDungeon();
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
        
        // 检查是否是最后一层
        const isLastLayer = this.currentLayer >= this.currentDungeon.layers.length - 1;
        
        if (isLastLayer) {
            // 最后一层，触发结局
            this.log('⚠️ 你选择继续深入...发现最终区域！');
            alert(`🏁 你已到达最深处！\n💰 最终收获: ${this.lootValue}\n\n你成功完成了探索！`);
            this.persistent.gold += this.lootValue;
            this.persistent.completedRuns++;
            this.saveData();
            this.showLobby();
        } else {
            // 前往下一层
            this.log('⚠️ 你选择继续深入...前往下一层！');
            alert(`⚔️ 收益翻倍！前往第 ${this.currentLayer + 2} 层...`);
            this.startLayer(this.currentLayer + 1);
        }
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