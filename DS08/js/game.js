/**
 * DS08 - 幽暗编年史
 * 融合跑团机制的叙事扫雷游戏
 */

class DS08Game {
    constructor() {
        // 副本配置
        this.dungeons = {
            shadow: {
                id: 'shadow',
                name: '岭下暗影',
                theme: '蛇人/隧道/奴隶贸易',
                unlocked: true,
                layers: [
                    { size: 6, steps: 8, main: 1, sub: 2 },
                    { size: 9, steps: 15, main: 2, sub: 3 },
                    { size: 10, steps: 20, main: 2, sub: 4 },
                    { size: 15, steps: 35, main: 3, sub: 6 },
                    { size: 16, steps: 50, main: 3, sub: 8 }
                ]
            },
            gate: {
                id: 'gate',
                name: '幽暗之门',
                theme: '疗养院/罗伊格尔/旧印',
                unlocked: false,
                unlockItem: '神秘羊皮纸',
                layers: [
                    { size: 6, steps: 8, main: 1, sub: 3 },
                    { size: 10, steps: 15, main: 2, sub: 6 },
                    { size: 10, steps: 20, main: 2, sub: 6 },
                    { size: 15, steps: 35, main: 3, sub: 9 },
                    { size: 18, steps: 50, main: 3, sub: 10 }
                ]
            }
        };

        // 游戏状态
        this.state = 'lobby';
        this.currentDungeon = null;
        this.currentLayer = 0;
        this.grid = [];
        this.sanity = 100;
        this.markers = 3;
        this.exploredSteps = 0;
        this.dungeonInv = [];
        
        // 幻觉模式
        this.hallucinationMode = false;
        this.hallucinationTurns = 0;

        this.persistent = this.loadData();
        this.init();
    }

    loadData() {
        const defaultData = {
            gold: 0,
            vault: [],
            fragments: [],
            completedDungeons: [],
            unlockedDungeons: ['shadow'],
            stats: { totalRuns: 0, totalDeaths: 0, fragmentsFound: 0 }
        };
        try {
            const saved = localStorage.getItem('DS08_save');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }

    saveData() {
        localStorage.setItem('DS08_save', JSON.stringify(this.persistent));
    }

    // 显示大厅
    showLobby() {
        this.state = 'lobby';
        const c = document.getElementById('game-container');
        
        const dungeonCards = Object.values(this.dungeons).map(d => {
            const isUnlocked = this.persistent.unlockedDungeons.includes(d.id);
            return `
                <div class="dungeon-card ${isUnlocked ? '' : 'locked'}" 
                     onclick="${isUnlocked ? `game.selectDungeon('${d.id}')` : ''}">
                    <h3>${d.name} ${isUnlocked ? '' : '🔒'}</h3>
                    <p class="theme">${d.theme}</p>
                    <p class="status">${isUnlocked ? '已解锁' : `需: ${d.unlockItem}`}</p>
                </div>
            `;
        }).join('');

        c.innerHTML = `
            <div id="lobby">
                <header>
                    <h1>📜 幽暗编年史</h1>
                    <div class="stats">
                        <span>💰 ${this.persistent.gold}</span>
                        <span>📜 ${this.persistent.fragments.length} 碎片</span>
                        <span>🏆 ${this.persistent.completedDungeons.length} 通关</span>
                    </div>
                </header>
                <div class="dungeon-selection">
                    <h2>选择探索的副本</h2>
                    <div class="dungeon-grid">
                        ${dungeonCards}
                    </div>
                </div>
                <div class="lobby-actions">
                    <button onclick="game.showCodex()" class="secondary">📚 图鉴</button>
                    <button onclick="game.showWarehouse()" class="secondary">🏛️ 仓库</button>
                    <button onclick="game.deleteSave()" class="danger">🗑️ 重置</button>
                </div>
            </div>
        `;
    }

    selectDungeon(dungeonId) {
        this.currentDungeon = this.dungeons[dungeonId];
        this.currentLayer = 0;
        this.showLayerSelect();
    }

    showLayerSelect() {
        const c = document.getElementById('game-container');
        const layerButtons = this.currentDungeon.layers.map((layer, idx) => `
            <button onclick="game.startLayer(${idx})" class="layer-btn">
                <span class="layer-num">${idx + 1}层</span>
                <span class="layer-size">${layer.size}×${layer.size}</span>
                <span class="layer-steps">需探索 ${layer.steps} 步</span>
            </button>
        `).join('');

        c.innerHTML = `
            <div id="layer-select">
                <header>
                    <button onclick="game.showLobby()">⬅️ 返回</button>
                    <h2>${this.currentDungeon.name}</h2>
                </header>
                <div class="layer-grid">
                    ${layerButtons}
                </div>
            </div>
        `;
    }

    startLayer(layerIndex) {
        this.currentLayer = layerIndex;
        const config = this.currentDungeon.layers[layerIndex];
        
        this.state = 'dungeon';
        this.sanity = 100;
        this.markers = 3;
        this.exploredSteps = 0;
        this.dungeonInv = [];
        this.hallucinationMode = false;
        
        this.createGrid(config.size);
        this.placeRooms(config.main, config.sub);
        this.placeTraps(Math.floor(config.size * config.size * 0.15));
        this.calcNumbers();
        
        this.renderDungeon();
        this.log(`进入了${this.currentDungeon.name} ${layerIndex + 1}层...`, 'system');
    }

    createGrid(size) {
        this.gridSize = size;
        this.grid = Array(size).fill(null).map((_, y) =>
            Array(size).fill(null).map((_, x) => ({
                x, y,
                isRevealed: false,
                isMarked: false,
                isTrap: false,
                number: 0,
                roomType: 'normal', // normal, main, sub
                roomData: null
            }))
        );
    }

    placeRooms(mainCount, subCount) {
        // 放置主线剧情房
        for (let i = 0; i < mainCount; i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) {
                this.grid[pos.y][pos.x].roomType = 'main';
                this.grid[pos.y][pos.x].roomData = this.getRandomMainStory();
            }
        }
        // 放置支线剧情房
        for (let i = 0; i < subCount; i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) {
                this.grid[pos.y][pos.x].roomType = 'sub';
                this.grid[pos.y][pos.x].roomData = this.getRandomSubStory();
            }
        }
    }

    getRandomEmptyCell() {
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const cell = this.grid[y][x];
            if (cell.roomType === 'normal' && !cell.isTrap && !(x < 2 && y < 2)) {
                return { x, y };
            }
            attempts++;
        }
        return null;
    }

    placeTraps(count) {
        let placed = 0;
        while (placed < count) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const cell = this.grid[y][x];
            if (!cell.isTrap && cell.roomType === 'normal' && !(x < 2 && y < 2)) {
                cell.isTrap = true;
                placed++;
            }
        }
    }

    calcNumbers() {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (!cell.isTrap) {
                    let trapCount = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = y + dy, nx = x + dx;
                            if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                                if (this.grid[ny][nx].isTrap) trapCount++;
                            }
                        }
                    }
                    
                    // 编码规则
                    if (cell.roomType === 'main') {
                        cell.number = trapCount * 10;
                    } else if (cell.roomType === 'sub') {
                        cell.number = -trapCount;
                    } else {
                        cell.number = trapCount;
                    }
                }
            }
        }
    }

    renderDungeon() {
        const c = document.getElementById('game-container');
        const config = this.currentDungeon.layers[this.currentLayer];
        const canExtract = this.exploredSteps >= config.steps;

        c.innerHTML = `
            <div id="dungeon" class="${this.hallucinationMode ? 'hallucination' : ''}">
                <header>
                    <button onclick="game.quitLayer()">⬅️ 撤退</button>
                    <div class="dungeon-info">
                        <span class="dungeon-name">${this.currentDungeon.name} ${this.currentLayer + 1}层</span>
                        <span class="steps">步数: ${this.exploredSteps}/${config.steps}</span>
                    </div>
                    <div class="resources">
                        <span class="sanity ${this.sanity < 30 ? 'low' : ''}">🧠 ${this.sanity}</span>
                        <span class="markers">🚩 ${this.markers}</span>
                    </div>
                </header>
                
                <div id="minefield" style="grid-template-columns: repeat(${this.gridSize}, 36px);">
                    ${this.renderGridCells()}
                </div>
                
                <div class="legend">
                    <span>🔢 数字=周围陷阱</span>
                    <span>🔟×10=主线剧情</span>
                    <span>➖负数=支线剧情</span>
                </div>
                
                <footer>
                    <button onclick="game.extract()" class="${canExtract ? 'primary' : 'disabled'}" 
                            ${canExtract ? '' : 'disabled'}>
                        ${canExtract ? '🚪 前往下一层' : `🚫 需探索${config.steps}步`}
                    </button>
                </footer>
                
                <div id="story-modal" class="modal hidden">
                    <div class="modal-content">
                        <h3 id="story-title"></h3>
                        <p id="story-text"></p>
                        <div id="story-result"></div>
                        <button onclick="game.closeStoryModal()">继续</button>
                    </div>
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
                let displayNumber = cell.number;

                if (this.hallucinationMode && !cell.isRevealed) {
                    // 幻觉模式：随机扰动数字
                    if (Math.random() < 0.3) {
                        displayNumber = Math.floor(Math.random() * 8) + 1;
                    }
                }

                if (cell.isRevealed) {
                    className += ' revealed';
                    if (cell.isTrap) {
                        className += ' trap';
                        content = '💀';
                    } else if (cell.roomType === 'main') {
                        className += ' main-room';
                        content = cell.number > 0 ? `🔴${cell.number}` : '🔴0';
                    } else if (cell.roomType === 'sub') {
                        className += ' sub-room';
                        content = cell.number < 0 ? `🔵${cell.number}` : '🔵0';
                    } else if (cell.number > 0) {
                        content = cell.number;
                    }
                } else if (cell.isMarked) {
                    className += ' marked';
                    content = '🚩';
                }

                html += `<div class="${className}" 
                             data-x="${x}" data-y="${y}"
                             onclick="game.handleLeftClick(${x}, ${y})"
                             oncontextmenu="game.handleRightClick(${x}, ${y}); return false;">
                            ${content}
                        </div>`;
            }
        }
        return html;
    }

    handleLeftClick(x, y) {
        if (this.state !== 'dungeon') return;
        
        const cell = this.grid[y][x];
        if (cell.isRevealed || cell.isMarked) return;

        cell.isRevealed = true;
        this.exploredSteps++;

        if (cell.isTrap) {
            this.triggerTrap();
        } else if (cell.roomType === 'main' || cell.roomType === 'sub') {
            // 左键触发剧情，30%基础好走向 + 理智加成
            const bonus = Math.floor(this.sanity / 10) * 5;
            const roll = Math.floor(Math.random() * 100) + 1;
            const threshold = 30 + bonus;
            const isGoodOutcome = roll <= threshold;
            
            this.triggerStory(cell, isGoodOutcome, roll, threshold);
        } else {
            // 普通房间，自动展开
            if (cell.number === 0) {
                this.autoExpand(x, y);
            }
        }

        this.updateHallucination();
        this.renderDungeon();
    }

    handleRightClick(x, y) {
        if (this.state !== 'dungeon') return;
        
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;

        if (this.markers <= 0) {
            this.log('⚠️ 标记器不足！', 'bad');
            return;
        }

        // 消耗标记器
        this.markers--;
        cell.isMarked = true;

        if (cell.roomType === 'main' || cell.roomType === 'sub') {
            // 标记剧情房，70%基础好走向
            const roll = Math.floor(Math.random() * 100) + 1;
            const threshold = 70;
            const isGoodOutcome = roll <= threshold;
            
            if (isGoodOutcome) {
                this.markers++; // 返还标记器
                this.triggerStory(cell, true, roll, threshold);
            } else {
                this.triggerStory(cell, false, roll, threshold);
            }
        } else if (cell.isTrap) {
            // 正确标记陷阱，返还标记器+奖励
            this.markers++;
            this.sanity = Math.min(100, this.sanity + 5);
            this.log(`✅ 标记陷阱成功！理智+5`, 'good');
        } else {
            // 错误标记，不返还
            this.log('❌ 标记错误，标记器已消耗', 'bad');
        }

        this.renderDungeon();
    }

    triggerTrap() {
        this.sanity -= 25;
        this.log('💀 触发了陷阱！理智-25', 'bad');
        
        if (this.sanity <= 0) {
            this.death();
        }
    }

    triggerStory(cell, isGoodOutcome, roll, threshold) {
        const story = cell.roomData;
        const modal = document.getElementById('story-modal');
        const title = document.getElementById('story-title');
        const text = document.getElementById('story-text');
        const result = document.getElementById('story-result');

        title.textContent = story.title;
        text.textContent = story.text;
        
        const outcome = isGoodOutcome ? story.goodOutcome : story.badOutcome;
        result.innerHTML = `
            <div class="dice-roll">🎲 d100: ${roll} / ${threshold}</div>
            <div class="outcome ${isGoodOutcome ? 'good' : 'bad'}">
                <h4>${isGoodOutcome ? '✨ 好走向' : '💀 坏走向'}</h4>
                <p>${outcome.text}</p>
                <p class="reward">${outcome.reward}</p>
            </div>
        `;

        // 应用结果
        if (outcome.sanity) this.sanity = Math.max(0, Math.min(100, this.sanity + outcome.sanity));
        if (outcome.markers) this.markers += outcome.markers;
        if (outcome.item) this.dungeonInv.push(outcome.item);

        modal.classList.remove('hidden');
        
        // 添加剧情碎片
        if (!this.persistent.fragments.includes(story.id)) {
            this.persistent.fragments.push(story.id);
            this.saveData();
        }
    }

    closeStoryModal() {
        document.getElementById('story-modal').classList.add('hidden');
        this.renderDungeon();
    }

    autoExpand(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy, nx = x + dx;
                if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                    const neighbor = this.grid[ny][nx];
                    if (!neighbor.isRevealed && !neighbor.isMarked && !neighbor.isTrap) {
                        neighbor.isRevealed = true;
                        this.exploredSteps++;
                        if (neighbor.number === 0) {
                            setTimeout(() => this.autoExpand(nx, ny), 50);
                        }
                    }
                }
            }
        }
    }

    updateHallucination() {
        if (this.sanity < 30 && !this.hallucinationMode) {
            this.hallucinationMode = true;
            this.log('👁️ 你进入了幻觉模式...数字开始欺骗你', 'special');
        } else if (this.sanity >= 30 && this.hallucinationMode) {
            this.hallucinationMode = false;
            this.log('✨ 幻觉消退，你恢复了清醒', 'good');
        }
    }

    extract() {
        const config = this.currentDungeon.layers[this.currentLayer];
        if (this.exploredSteps < config.steps) {
            this.log('⚠️ 探索步数不足！', 'bad');
            return;
        }

        if (this.currentLayer < this.currentDungeon.layers.length - 1) {
            // 前往下一层
            alert(`准备前往 ${this.currentLayer + 2}层...`);
            this.startLayer(this.currentLayer + 1);
        } else {
            // BOSS战/通关
            this.completeDungeon();
        }
    }

    completeDungeon() {
        if (!this.persistent.completedDungeons.includes(this.currentDungeon.id)) {
            this.persistent.completedDungeons.push(this.currentDungeon.id);
        }
        
        // 检查解锁
        if (this.currentDungeon.id === 'shadow') {
            // 检查是否获得了解锁物品
            const hasScroll = this.dungeonInv.some(i => i.id === 'mystery_scroll');
            if (hasScroll && !this.persistent.unlockedDungeons.includes('gate')) {
                this.persistent.unlockedDungeons.push('gate');
                alert('🎉 解锁了新副本：幽暗之门！');
            }
        }
        
        this.saveData();
        alert(`🎉 通关了 ${this.currentDungeon.name}！`);
        this.showLobby();
    }

    quitLayer() {
        if (confirm('确定要撤退吗？当前进度将丢失。')) {
            this.showLayerSelect();
        }
    }

    death() {
        this.persistent.stats.totalDeaths++;
        this.saveData();
        alert('💀 你的理智崩溃了...\n但你的探索经验将保留。');
        this.showLayerSelect();
    }

    log(msg, type) {
        console.log(`[${type || 'info'}] ${msg}`);
    }

    // 剧情数据
    getRandomMainStory() {
        const stories = [
            {
                id: 'main_01',
                title: '古老的隧道',
                text: '你发现了一条通往地下的隧道，墙壁上刻着奇怪的符号...',
                goodOutcome: { text: '你解读了符号，发现了安全通道', reward: '理智+10, 标记器+1', sanity: 10, markers: 1 },
                badOutcome: { text: '符号开始扭曲，你感到头痛欲裂', reward: '理智-15', sanity: -15 }
            },
            {
                id: 'main_02',
                title: '废弃的祭坛',
                text: '一个古老的祭坛出现在你面前，上面残留着暗红色的痕迹...',
                goodOutcome: { text: '你发现祭坛下藏着补给', reward: '理智+5, 标记器+2', sanity: 5, markers: 2 },
                badOutcome: { text: '祭坛上的血迹开始发光，你听到了低语', reward: '理智-20', sanity: -20 }
            }
        ];
        return stories[Math.floor(Math.random() * stories.length)];
    }

    getRandomSubStory() {
        const stories = [
            {
                id: 'sub_01',
                title: '散落的日记',
                text: '地上有一本破旧的日记，记录着前人的经历...',
                goodOutcome: { text: '日记中有有用的信息', reward: '理智+5', sanity: 5 },
                badOutcome: { text: '日记的内容让你感到不安', reward: '理智-5', sanity: -5 }
            },
            {
                id: 'sub_02',
                title: '奇怪的壁画',
                text: '墙壁上画着你无法理解的图案...',
                goodOutcome: { text: '你发现了隐藏的机关', reward: '标记器+1', markers: 1 },
                badOutcome: { text: '壁画似乎在动，你感到眩晕', reward: '理智-10', sanity: -10 }
            }
        ];
        return stories[Math.floor(Math.random() * stories.length)];
    }

    showCodex() {
        alert(`📚 剧情图鉴\n\n已收集: ${this.persistent.fragments.length} 个碎片\n\n${this.persistent.fragments.join(', ') || '暂无'}`);
    }

    showWarehouse() {
        alert(`🏛️ 仓库\n\n金币: ${this.persistent.gold}\n物品: ${this.persistent.vault.length} 件`);
    }

    deleteSave() {
        if (confirm('确定要重置所有进度吗？')) {
            localStorage.removeItem('DS08_save');
            this.persistent = this.loadData();
            this.showLobby();
        }
    }

    init() {
        this.showLobby();
    }
}

window.onload = () => { window.game = new DS08Game(); };
