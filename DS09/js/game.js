/**
 * DS09 - 幽暗编年史：深渊重构
 * 扫雷核心 + 威胁底色 + 剧情icon + 撤离机制
 */

class DS09Game {
    constructor() {
        // 游戏状态
        this.state = 'lobby';
        this.currentDungeon = null;
        this.currentLayer = 0;
        this.grid = [];
        this.gridSize = 0;
        this.sanity = 100;
        this.markers = 3;
        this.lootValue = 0;
        this.extractionPoints = [];
        this.foundExtraction = false;
        
        // 副本配置
        this.dungeons = {
            shadow: {
                id: 'shadow',
                name: '岭下暗影',
                layers: [
                    { size: 6, traps: 3, storyRooms: 2, stepsRequired: 8 },
                    { size: 9, traps: 6, storyRooms: 3, stepsRequired: 15 },
                    { size: 10, traps: 8, storyRooms: 4, stepsRequired: 20 },
                    { size: 12, traps: 12, storyRooms: 5, stepsRequired: 30 },
                    { size: 14, traps: 15, storyRooms: 6, stepsRequired: 40 }
                ]
            }
        };
        
        this.init();
    }
    
    init() {
        this.showLobby();
    }
    
    // ===== 大厅 =====
    showLobby() {
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="lobby">
                <header>
                    <h1>🌑 DS09 - 幽暗编年史：深渊重构</h1>
                </header>
                <div class="dungeon-selection">
                    <div class="dungeon-card" onclick="game.startDungeon('shadow')">
                        <h3>岭下暗影</h3>
                        <p>扫雷核心 + 威胁底色 + 剧情事件 + 撤离机制</p>
                    </div>
                </div>
                <div class="rules-hint">
                    <h3>🎮 核心机制</h3>
                    <p>🟡 周围1-2个威胁 | 🔴 周围3+个威胁</p>
                    <p>📜 周围有剧情房 | 踩到触发事件</p>
                    <p>🚪 找到撤离点才能安全离开</p>
                </div>
            </div>
        `;
    }
    
    // ===== 开始探索 =====
    startDungeon(dungeonId) {
        this.currentDungeon = this.dungeons[dungeonId];
        this.currentLayer = 0;
        this.startLayer(0);
    }
    
    startLayer(layerIndex) {
        this.currentLayer = layerIndex;
        const config = this.currentDungeon.layers[layerIndex];
        this.gridSize = config.size;
        this.sanity = 100;
        this.markers = 3;
        this.lootValue = 0;
        this.exploredSteps = 0;
        this.stepsRequired = config.stepsRequired;
        this.state = 'dungeon';
        
        this.createGrid();
        this.placeTraps(config.traps);
        this.placeStoryRooms(config.storyRooms);
        this.calcThreatNumbers();
        
        this.renderDungeon();
    }
    
    // ===== 创建网格 =====
    createGrid() {
        this.grid = Array(this.gridSize).fill(null).map((_, y) =>
            Array(this.gridSize).fill(null).map((_, x) => ({
                x, y,
                isRevealed: false,
                isMarked: false,
                isTrap: false,
                isStoryRoom: false,
                storyType: null,
                threatCount: 0,
                hasStoryNearby: false
            }))
        );
    }
    
    // ===== 放置陷阱 =====
    placeTraps(count) {
        let placed = 0;
        while (placed < count) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const cell = this.grid[y][x];
            if (!cell.isTrap && !cell.isStoryRoom) {
                cell.isTrap = true;
                placed++;
            }
        }
    }
    
    // ===== 放置剧情房 =====
    placeStoryRooms(count) {
        let placed = 0;
        while (placed < count) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const cell = this.grid[y][x];
            if (!cell.isTrap && !cell.isStoryRoom) {
                cell.isStoryRoom = true;
                cell.storyType = Math.random() < 0.4 ? 'main' : 'sub';
                placed++;
            }
        }
    }
    
    // ===== 计算威胁数字（类似扫雷）=====
    calcThreatNumbers() {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (cell.isTrap || cell.isStoryRoom) continue;
                
                let count = 0;
                let hasStory = false;
                
                // 检查周围8格
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                            const neighbor = this.grid[ny][nx];
                            if (neighbor.isTrap || neighbor.isStoryRoom) {
                                count++;
                            }
                            if (neighbor.isStoryRoom) {
                                hasStory = true;
                            }
                        }
                    }
                }
                
                cell.threatCount = count;
                cell.hasStoryNearby = hasStory;
            }
        }
    }
    
    // ===== 渲染 =====
    renderDungeon() {
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="dungeon">
                <header>
                    <button onclick="game.quitToLobby()">⬅️ 放弃</button>
                    <span>第 ${this.currentLayer + 1} 层 | 🦶 ${this.exploredSteps}/${this.stepsRequired} | 💰 ${this.lootValue} | 🧠 ${this.sanity}</span>
                    ${this.exploredSteps >= this.stepsRequired ? `
                        <button onclick="game.showExtractChoice()" class="extract-btn">🚪 撤离</button>
                    ` : ''}
                </header>
                <div class="legend">
                    <span class="default">⬜ 安全</span>
                    <span class="yellow">🟡 1-2威胁</span>
                    <span class="red">🔴 3+威胁</span>
                    <span>|</span>
                    <span>📜 附近有剧情</span>
                    <span>|</span>
                    <span>探索${this.stepsRequired}步后可撤离</span>
                </div>
                <div id="minefield" style="grid-template-columns: repeat(${this.gridSize}, 40px);">
                    ${this.renderGridCells()}
                </div>
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
                    
                    if (cell.isTrap) {
                        // 已触发的陷阱
                        className += ' triggered-trap';
                        content = '💀';
                    } else if (cell.isStoryRoom) {
                        // 已揭示的剧情房
                        className += ' story-room';
                        content = cell.storyType === 'main' ? '🎯' : '📍';
                    } else {
                        // 普通空地 - 根据威胁数显示底色
                        if (cell.threatCount === 0) {
                            className += ' safe';
                        } else if (cell.threatCount <= 2) {
                            className += ' yellow-zone';
                        } else {
                            className += ' red-zone';
                        }
                        
                        // 显示icon：周围有剧情房则显示📜
                        if (cell.hasStoryNearby) {
                            content = '📜';
                        } else {
                            content = cell.threatCount > 0 ? cell.threatCount : '';
                        }
                    }
                } else {
                    // 未揭示
                    if (cell.isMarked) {
                        content = '🚩';
                        className += ' marked';
                    }
                    className += ' unrevealed';
                }
                
                html += `<div class="${className}" onclick="game.handleCellClick(${x},${y})">${content}</div>`;
            }
        }
        return html;
    }
    
    // ===== 点击处理（扫雷核心）=====
    handleCellClick(x, y) {
        if (this.state !== 'dungeon') return;
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;

        // 揭示当前格子
        cell.isRevealed = true;

        // 增加探索步数（只有首次揭示且不是陷阱/剧情房才算）
        if (!cell.isTrap && !cell.isStoryRoom) {
            this.exploredSteps++;
        }

        // 检查踩到雷
        if (cell.isTrap) {
            this.triggerTrap(cell);
        } else if (cell.isStoryRoom) {
            this.triggerStoryRoom(cell);
        }

        // 0威胁自动连锁揭示
        if (!cell.isTrap && !cell.isStoryRoom && cell.threatCount === 0) {
            this.autoReveal(x, y);
        }

        // 搜刮价值
        if (!cell.isTrap) {
            this.lootValue += 5 + Math.floor(Math.random() * 10);
        }

        this.renderDungeon();
    }
    
    // ===== 连锁揭示（扫雷式）=====
    autoReveal(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    const neighbor = this.grid[ny][nx];
                    if (!neighbor.isRevealed && !neighbor.isMarked && !neighbor.isTrap && !neighbor.isStoryRoom) {
                        neighbor.isRevealed = true;
                        this.lootValue += 2;
                        if (neighbor.threatCount === 0) {
                            this.autoReveal(nx, ny);
                        }
                    }
                }
            }
        }
    }
    
    // ===== 触发陷阱 =====
    triggerTrap(cell) {
        const damage = 15 + Math.floor(Math.random() * 10);
        this.sanity = Math.max(0, this.sanity - damage);
        this.log(`💀 触发陷阱！理智-${damage}`);
        alert(`💀 你踩到了陷阱！\n🧠 理智 -${damage}`);
    }
    
    // ===== 触发剧情房 =====
    triggerStoryRoom(cell) {
        const isMain = cell.storyType === 'main';
        const reward = isMain ? 100 : 50;
        const sanityChange = isMain ? -10 : -5;
        
        this.lootValue += reward;
        this.sanity = Math.max(0, this.sanity + sanityChange);
        
        const title = isMain ? '🎯 发现重要线索！' : '📍 发现隐藏区域';
        const story = isMain 
            ? '你推开腐朽的门，发现了古老的祭坛...这里藏着关键的秘密。'
            : '你发现了一条狭窄的通道，墙壁上有人留下的痕迹...';
        
        alert(`${title}\n\n${story}\n\n💰 +${reward} | 🧠 ${sanityChange}`);
    }
    
    // ===== 撤离选择 =====
    showExtractChoice() {
        const canExtract = this.exploredSteps >= this.stepsRequired;
        if (!canExtract) {
            alert(`还需要探索 ${this.stepsRequired - this.exploredSteps} 步才能撤离`);
            return;
        }

        const choice = confirm(
            `🚪 撤离\n\n` +
            `💰 当前收获: ${this.lootValue}\n\n` +
            `【确定】立即撤离 - 安全带走全部，进入下一层\n` +
            `【取消】继续探索 - 但无法进入下一层，风险更大`
        );

        if (choice) {
            this.extractLayer();
        }
    }

    extractLayer() {
        const isLastLayer = this.currentLayer >= this.currentDungeon.layers.length - 1;

        if (isLastLayer) {
            alert(`🏁 通关！\n💰 最终收获: ${this.lootValue}\n\n你完成了所有层级的探索！`);
            this.showLobby();
        } else {
            alert(`✅ 撤离成功！\n💰 获得 ${this.lootValue} 金币\n\n前往第 ${this.currentLayer + 2} 层...`);
            this.startLayer(this.currentLayer + 1);
        }
    }

    // ===== 工具函数 =====
    log(msg) {
        console.log(`[DS09] ${msg}`);
    }
    
    quitToLobby() {
        if (confirm('确定放弃？所有收获将丢失。')) {
            this.showLobby();
        }
    }
}

const game = new DS09Game();