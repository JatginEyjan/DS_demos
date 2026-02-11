/**
 * DS08 - 幽暗编年史
 * 融合跑团机制的叙事扫雷游戏
 */

class DS08Game {
    constructor() {
        // 道具定义
        this.itemTypes = {
            // 功能向道具
            sanityPotion: { id: 'sanityPotion', name: '理智药水', icon: '🧪', type: 'functional', desc: '恢复20点理智值', effect: 'sanity+20', value: 50 },
            detector: { id: 'detector', name: '探测器', icon: '🔍', type: 'functional', desc: '揭示任意1格内容', effect: 'reveal', value: 100 },
            markerPack: { id: 'markerPack', name: '标记器套装', icon: '🚩', type: 'functional', desc: '获得2个额外标记器', effect: 'markers+2', value: 30 },
            lantern: { id: 'lantern', name: '煤油灯', icon: '🏮', type: 'functional', desc: '降低幻觉效果30秒', effect: 'antiHallucination', value: 80 },
            // 剧情向道具
            oldKey: { id: 'oldKey', name: '古老钥匙', icon: '🗝️', type: 'story', desc: '用于开启隐藏的密室', value: 200 },
            mysteriousScroll: { id: 'mysteriousScroll', name: '神秘卷轴', icon: '📜', type: 'story', desc: '记载着古老的咒语', value: 300 },
            amulet: { id: 'amulet', name: '护身符', icon: '✨', type: 'story', desc: '蛇人信徒的护身符，可降低遭遇危险的概率', value: 250 },
            slaveMap: { id: 'slaveMap', name: '奴隶地图', icon: '🗺️', type: 'story', desc: '记录着秘密通道的位置', value: 150 }
        };
        
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
        this.startingSanity = 100; // 初始理智，用于计算继承
        this.markers = 3;
        this.exploredSteps = 0;
        this.dungeonInv = [];
        
        // 幻觉模式
        this.hallucinationMode = false;
        this.hallucinationTurns = 0;
        this.explorationLogs = []; // 存储探索日志
        
        // 商店物品（进入副本时刷新）
        this.shopItems = [];

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
        this.refreshShop(); // 刷新商店
        this.showShop(); // 显示商店而非层数选择
    }

    // 刷新商店物品
    refreshShop() {
        this.shopItems = [];
        const functionalItems = ['sanityPotion', 'detector', 'markerPack', 'lantern'];
        const storyItems = ['oldKey', 'mysteriousScroll', 'amulet', 'slaveMap'];
        
        // 固定出现3个功能道具
        for (let i = 0; i < 3; i++) {
            const itemId = functionalItems[Math.floor(Math.random() * functionalItems.length)];
            this.shopItems.push({ ...this.itemTypes[itemId], shopPrice: this.itemTypes[itemId].value });
        }
        
        // 20%概率出现1个剧情道具
        if (Math.random() < 0.2) {
            const itemId = storyItems[Math.floor(Math.random() * storyItems.length)];
            this.shopItems.push({ ...this.itemTypes[itemId], shopPrice: this.itemTypes[itemId].value });
        }
    }

    // 显示商店
    showShop() {
        const c = document.getElementById('game-container');
        
        const shopItemsHtml = this.shopItems.map((item, idx) => `
            <div class="shop-item">
                <span class="item-icon">${item.icon}</span>
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-desc">${item.desc}</span>
                </div>
                <span class="item-price">💰 ${item.shopPrice}</span>
                <button onclick="game.buyShopItem(${idx})" ${this.persistent.gold >= item.shopPrice ? '' : 'disabled'}>购买</button>
            </div>
        `).join('');

        c.innerHTML = `
            <div id="shop">
                <header>
                    <button onclick="game.showLobby()">⬅️ 返回大厅</button>
                    <h2>🛒 补给商店 - ${this.currentDungeon.name}</h2>
                    <span class="gold-display">💰 ${this.persistent.gold}</span>
                </header>
                <div class="shop-desc">
                    <p>准备进入副本前，你可以购买一些补给道具。</p>
                    <p>💡 购买的道具将在本次副本中使用，撤退时可结算为金币。</p>
                </div>
                <div class="shop-items">
                    ${shopItemsHtml || '<p class="empty">商店已售罄</p>'}
                </div>
                <div class="shop-actions">
                    <button onclick="game.refreshShop()" class="secondary">🔄 刷新商店 (💰 50)</button>
                    <button onclick="game.startDungeonFromLayer1()" class="primary">🎮 开始副本 (从第1层)</button>
                </div>
                <div class="starting-items">
                    <h4>📦 开局携带 (${this.dungeonInv.length} 件)</h4>
                    <div class="inventory-grid">
                        ${this.dungeonInv.map(item => `<span>${item.icon}</span>`).join('') || '<span class="empty">空</span>'}
                    </div>
                </div>
            </div>
        `;
    }

    // 购买商店物品
    buyShopItem(idx) {
        const item = this.shopItems[idx];
        if (!item || this.persistent.gold < item.shopPrice) {
            alert('金币不足！');
            return;
        }
        
        this.persistent.gold -= item.shopPrice;
        // 标记为商店购买（死亡时不丢失）
        this.dungeonInv.push({ ...item, obtainedInDungeon: false, source: 'shop' });
        this.shopItems.splice(idx, 1); // 从商店移除
        this.saveData();
        this.showShop(); // 刷新界面
    }

    // 从第1层开始副本
    startDungeonFromLayer1() {
        this.currentLayer = 0;
        this.sanity = 100;
        this.startingSanity = 100;
        this.markers = 3;
        this.exploredSteps = 0;
        this.startLayer(0);
    }

    showLayerSelect() {
        // 保留此函数用于兼容，但实际不使用了
        this.showShop();
    }

    startLayer(layerIndex) {
        this.currentLayer = layerIndex;
        const config = this.currentDungeon.layers[layerIndex];
        
        this.state = 'dungeon';
        
        // 第1层重置所有状态，后续层继承理智值
        if (layerIndex === 0) {
            this.sanity = 100;
            this.startingSanity = 100;
            this.markers = 3;
            this.exploredSteps = 0;
            // dungeonInv 保留（商店购买的道具）
        } else {
            // 继承上一层理智值，其他状态重置
            this.sanity = Math.max(0, this.sanity); // 确保不变成负数
            this.markers = 3; // 标记器每层重置
            this.exploredSteps = 0;
        }
        
        this.hallucinationMode = false;
        this.explorationLogs = []; // 重置日志
        
        this.createGrid(config.size);
        this.placeRooms(config.main, config.sub);
        this.placeTraps(Math.floor(config.size * config.size * 0.15));
        this.calcNumbers();
        
        this.renderDungeon();
        
        if (layerIndex === 0) {
            this.explorationLogs = [{ msg: `进入了${this.currentDungeon.name} 第1层...`, type: 'system', time: Date.now() }];
        } else {
            this.explorationLogs = [{ msg: `进入了第${layerIndex + 1}层（理智继承：${this.sanity}）`, type: 'system', time: Date.now() }];
        }
        this.renderLogs();
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
        const layerStories = this.getLayerStories(this.currentLayer);
        
        // 放置主线剧情房
        const mainStories = layerStories.main;
        for (let i = 0; i < Math.min(mainCount, mainStories.length); i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) {
                this.grid[pos.y][pos.x].roomType = 'main';
                this.grid[pos.y][pos.x].roomData = mainStories[i];
            }
        }
        
        // 放置支线剧情房
        const subStories = layerStories.sub;
        const shuffledSub = [...subStories].sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(subCount, shuffledSub.length); i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) {
                this.grid[pos.y][pos.x].roomType = 'sub';
                this.grid[pos.y][pos.x].roomData = shuffledSub[i];
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
                if (!cell.isTrap && cell.roomType === 'normal') {
                    let trapCount = 0;
                    let mainCount = 0;
                    let subCount = 0;
                    
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = y + dy, nx = x + dx;
                            if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                                const neighbor = this.grid[ny][nx];
                                if (neighbor.isTrap) trapCount++;
                                // 主线和支线房间本身也算+1
                                if (neighbor.roomType === 'main') {
                                    mainCount++;
                                    trapCount++; // 主线算1个陷阱当量
                                }
                                if (neighbor.roomType === 'sub') {
                                    subCount++;
                                    trapCount++; // 支线算1个陷阱当量
                                }
                            }
                        }
                    }
                    
                    // 新编码规则：(陷阱数+主线数+支线数) × (10^主线房数) × ((-1)^支线房数)
                    let number = trapCount;
                    if (mainCount > 0) {
                        number *= Math.pow(10, mainCount);
                    }
                    if (subCount > 0) {
                        number *= Math.pow(-1, subCount);
                    }
                    cell.number = number;
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
                        <div class="sanity-bar ${this.sanity < 30 ? 'low' : ''}">
                            <span class="sanity-label">🧠</span>
                            <div class="sanity-progress">
                                <div class="sanity-fill" style="width: ${this.sanity}%"></div>
                            </div>
                            <span class="sanity-value">${this.sanity}</span>
                        </div>
                        <span class="markers">🚩 ${this.markers}</span>
                    </div>
                </header>
                
                <div class="dungeon-main">
                    <div id="minefield" style="grid-template-columns: repeat(${this.gridSize}, 36px);">
                        ${this.renderGridCells()}
                    </div>
                    
                    <div class="side-panel">
                        <div class="panel-section">
                            <h4>📦 背包 (${this.dungeonInv.reduce((s,i)=>s+(i.weight||1),0).toFixed(1)}/10)</h4>
                            <div class="inventory-grid">
                                ${this.dungeonInv.map((item, idx) => `
                                    <div class="inv-slot" onclick="game.showItemDetail(${idx})" title="${item.desc||item.name}">
                                        ${item.icon}
                                    </div>
                                `).join('') || '<span class="empty">空</span>'}
                            </div>
                        </div>
                        
                        <div class="panel-section">
                            <h4>📝 探索日志</h4>
                            <div id="exploration-log" class="log-panel"></div>
                        </div>
                    </div>
                </div>
                
                <div class="legend">
                    <span>🔢 数字=周围陷阱</span>
                    <span>🔟×10=主线剧情</span>
                    <span>➖负数=支线剧情</span>
                </div>
                
                <footer>
                    <button onclick="game.retreat()" class="${canExtract ? 'primary' : 'disabled'}" 
                            ${canExtract ? '' : 'disabled'}>
                        ${canExtract ? '🚪 撤退' : `🚫 需探索${config.steps}步`}
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
        
        // 渲染探索日志
        this.renderLogs();
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
                        // 如果可前往下一层，显示入口图标
                        if (cell.canGoNext && this.currentLayer < this.currentDungeon.layers.length - 1) {
                            content = '🚪';
                            className += ' next-layer';
                        } else {
                            content = cell.number > 0 ? `🕯️${cell.number}` : '🕯️0';
                        }
                    } else if (cell.roomType === 'sub') {
                        className += ' sub-room';
                        content = cell.number < 0 ? `📜${cell.number}` : '📜0';
                    } else if (cell.number > 0) {
                        content = cell.number;
                    }
                } else if (cell.isMarked) {
                    className += ' marked';
                    content = '🚩';
                }

                // 如果已揭露的主线房可以前往下一层，添加点击事件
                const clickHandler = (cell.isRevealed && cell.roomType === 'main' && cell.canGoNext && this.currentLayer < this.currentDungeon.layers.length - 1) 
                    ? `onclick="game.goToNextLayerFromCell(${x}, ${y})"` 
                    : `onclick="game.handleLeftClick(${x}, ${y})"`;
                
                html += `<div class="${className}" 
                             data-x="${x}" data-y="${y}"
                             ${clickHandler}
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
        if (cell.isRevealed) return;

        // 左键直接揭露格子
        this.revealCell(x, y, 'left');
    }

    revealCell(x, y, source) {
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;

        cell.isRevealed = true;
        this.exploredSteps++;
        
        // 记录日志
        if (cell.roomType === 'main') {
            this.log(`发现了主线剧情房：${cell.roomData.title}`, 'special');
        } else if (cell.roomType === 'sub') {
            this.log(`发现了支线剧情房：${cell.roomData.title}`, 'info');
        } else if (cell.isTrap) {
            this.log('💀 触发了陷阱！', 'bad');
        }

        if (cell.isTrap) {
            this.triggerTrap();
            this.updateHallucination();
            this.renderDungeon();
        } else if (cell.roomType === 'main' || cell.roomType === 'sub') {
            // 触发剧情，带交互选项 - 不立即renderDungeon，避免关闭弹窗
            this.triggerStoryWithChoice(cell);
            this.updateHallucination();
            // 剧情弹窗保持打开，不调用renderDungeon
        } else {
            // 普通房间，自动展开
            if (cell.number === 0) {
                this.autoExpand(x, y);
            }
            this.updateHallucination();
            this.renderDungeon();
        }
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
        
        this.log('使用了标记器 🚩', 'info');

        // 右键也揭露格子，但有标记器加成
        this.revealCellWithMarker(x, y);
    }

    revealCellWithMarker(x, y) {
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;

        cell.isRevealed = true;
        this.exploredSteps++;

        if (cell.isTrap) {
            // 正确标记陷阱，返还标记器+奖励
            this.markers++;
            this.sanity = Math.min(100, this.sanity + 5);
            this.log(`✅ 标记陷阱成功！标记器返还，理智+5`, 'good');
            // 陷阱不触发，安全通过
            this.updateHallucination();
            this.renderDungeon();
        } else if (cell.roomType === 'main' || cell.roomType === 'sub') {
            // 标记剧情房，70%基础好走向
            this.log(`发现了${cell.roomType==='main'?'主线':'支线'}剧情房`, 'info');
            this.triggerStoryWithChoice(cell, true); // true表示使用标记器触发
            this.updateHallucination();
            // 不调用renderDungeon，保持弹窗打开
        } else {
            // 普通房间
            this.log('❌ 标记错误，标记器已消耗', 'bad');
            if (cell.number === 0) {
                this.autoExpand(x, y);
            }
            this.updateHallucination();
            this.renderDungeon();
        }
    }

    triggerTrap() {
        this.sanity -= 25;
        this.log('💀 触发了陷阱！理智-25', 'bad');
        
        if (this.sanity <= 0) {
            this.death();
        }
    }

    triggerStoryWithChoice(cell, usedMarker = false) {
        const story = cell.roomData;
        const modal = document.getElementById('story-modal');
        const title = document.getElementById('story-title');
        const text = document.getElementById('story-text');
        const result = document.getElementById('story-result');

        title.textContent = story.title;
        text.textContent = story.text;
        
        // 检查是否是主线剧情房且可以前往下一层
        const isLastLayer = this.currentLayer >= this.currentDungeon.layers.length - 1;
        const canGoNext = cell.roomType === 'main' && !isLastLayer;
        
        // 生成交互选项
        let optionsHtml = '';
        
        if (story.choices && story.choices.length > 0) {
            // 使用自定义选项
            optionsHtml = story.choices.map((choice, idx) => `
                <button onclick="game.makeStoryChoice('${cell.x}', '${cell.y}', ${idx})" 
                        class="choice-btn ${choice.type || ''}">
                    <span class="choice-num">${idx + 1}</span>
                    <span class="choice-text">${choice.text}</span>
                    <span class="choice-cost">${choice.cost || ''}</span>
                </button>
            `).join('');
        } else {
            // 默认选项
            const baseProb = usedMarker ? 70 : 30;
            const sanityBonus = Math.floor(this.sanity / 10) * 5;
            const goodProb = baseProb + sanityBonus;
            
            optionsHtml = `
                <button onclick="game.makeStoryChoice('${cell.x}', '${cell.y}', 0, ${usedMarker})" class="choice-btn risky">
                    <span class="choice-num">1</span>
                    <span class="choice-text">深入探索（${goodProb}%成功概率）</span>
                    <span class="choice-cost">风险：可能损失理智</span>
                </button>
                <button onclick="game.makeStoryChoice('${cell.x}', '${cell.y}', 1)" class="choice-btn safe">
                    <span class="choice-num">2</span>
                    <span class="choice-text">谨慎离开</span>
                    <span class="choice-cost">安全：无收益</span>
                </button>
            `;
        }
        
        result.innerHTML = `
            <div class="story-choices">
                <p class="choice-hint">选择你的行动：</p>
                ${optionsHtml}
            </div>
            ${canGoNext ? `<div class="next-layer-hint">🚪 揭露后可通过此处前往下一层</div>` : ''}
        `;

        modal.classList.remove('hidden');
        
        // 添加剧情碎片
        if (!this.persistent.fragments.includes(story.id)) {
            this.persistent.fragments.push(story.id);
            this.saveData();
        }
    }

    makeStoryChoice(x, y, choiceIdx, usedMarker = false) {
        const cell = this.grid[y][x];
        const story = cell.roomData;
        const resultDiv = document.getElementById('story-result');
        
        let outcome = null;
        let roll = 0;
        
        if (story.choices && story.choices[choiceIdx]) {
            // 自定义选项
            const choice = story.choices[choiceIdx];
            outcome = choice.outcome;
            
            // 应用代价
            if (choice.sanityCost) {
                this.sanity -= choice.sanityCost;
                this.log(`消耗了 ${choice.sanityCost} 点理智`, 'info');
            }
        } else {
            // 默认选项
            if (choiceIdx === 0) {
                // 深入探索
                const baseProb = usedMarker ? 70 : 30;
                const sanityBonus = Math.floor(this.sanity / 10) * 5;
                const threshold = baseProb + sanityBonus;
                roll = Math.floor(Math.random() * 100) + 1;
                const isSuccess = roll <= threshold;
                
                outcome = isSuccess ? story.goodOutcome : story.badOutcome;
                
                resultDiv.innerHTML = `
                    <div class="dice-roll">🎲 d100: ${roll} / ${threshold}</div>
                    <div class="outcome ${isSuccess ? 'good' : 'bad'}">
                        <h4>${isSuccess ? '✨ 成功' : '💀 失败'}</h4>
                        <p>${outcome.text}</p>
                        <p class="reward">${outcome.reward}</p>
                    </div>
                    <button onclick="game.closeStoryModal()">继续</button>
                `;
            } else {
                // 离开
                resultDiv.innerHTML = `
                    <div class="outcome">
                        <h4>👋 离开</h4>
                        <p>你选择了谨慎行事，没有深入探索。</p>
                    </div>
                    <button onclick="game.closeStoryModal()">继续</button>
                `;
                return;
            }
        }
        
        if (outcome) {
            // 应用结果
            if (outcome.sanity) {
                this.sanity = Math.max(0, Math.min(100, this.sanity + outcome.sanity));
            }
            if (outcome.markers) {
                this.markers += outcome.markers;
            }
            
            // 新的道具发放逻辑：根据层数和房间类型
            const rewardItem = this.getLayerRewardItem(cell.roomType);
            if (rewardItem) {
                if (rewardItem.id === 'markerBonus') {
                    // 标记器+1直接增加
                    this.markers += 1;
                    this.log('获得了标记器+1', 'good');
                    outcome.reward = `${outcome.reward || ''} 标记器+1`;
                } else {
                    // 标记为副本内获得（死亡时会丢失）
                    const itemWithSource = { ...rewardItem, obtainedInDungeon: true, source: 'dungeon' };
                    this.dungeonInv.push(itemWithSource);
                    this.log(`获得了 ${rewardItem.name}`, 'good');
                    // 更新outcome的reward显示
                    outcome.reward = `${outcome.reward || ''} ${rewardItem.name}+1`;
                }
            }
            
            resultDiv.innerHTML = `
                ${roll ? `<div class="dice-roll">🎲 d100: ${roll}</div>` : ''}
                <div class="outcome good">
                    <h4>✨ 结果</h4>
                    <p>${outcome.text}</p>
                    <p class="reward">${outcome.reward}</p>
                </div>
                <button onclick="game.closeStoryModal()">继续</button>
            `;
        }
        
        // 如果是主线房，标记为可前往下一层
        if (cell.roomType === 'main') {
            cell.canGoNext = true;
            this.log(`🚪 主线剧情完成！出现前往下一层的入口`, 'special');
        } else if (cell.roomType === 'sub') {
            this.log(`✅ 支线剧情完成！`, 'info');
        }
        
        this.updateHallucination();
        this.renderDungeon();
    }

    goToNextLayer() {
        this.closeStoryModal();
        this.extract();
    }

    goToNextLayerFromCell(x, y) {
        const cell = this.grid[y][x];
        if (cell.isRevealed && cell.roomType === 'main' && cell.canGoNext) {
            if (confirm('🚪 发现通往下一层的入口，是否进入？')) {
                this.extract();
            }
        }
    }

    closeStoryModal() {
        document.getElementById('story-modal').classList.add('hidden');
        this.renderDungeon();
    }

    showItemDetail(idx) {
        const item = this.dungeonInv[idx];
        if (!item) return;
        
        alert(`📦 ${item.name || '未知物品'}\n\n${item.desc || '没有描述'}\n\n${item.effect || ''}`);
    }

    autoExpand(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy, nx = x + dx;
                if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                    const neighbor = this.grid[ny][nx];
                    // 跳过陷阱和剧情房间，只展开普通房间
                    if (!neighbor.isRevealed && !neighbor.isMarked && !neighbor.isTrap && neighbor.roomType === 'normal') {
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

    retreat() {
        this.retreatAndSettle();
    }

    extract() {
        // 从剧情房中触发，前往下一层
        if (this.currentLayer < this.currentDungeon.layers.length - 1) {
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
        
        // 结算道具为金币
        const { goldEarned, itemCount } = this.settleItems();
        
        // 检查解锁
        if (this.currentDungeon.id === 'shadow') {
            // 检查是否获得了解锁物品
            const hasScroll = this.dungeonInv.some(i => i.id === 'mysteriousScroll');
            if (hasScroll && !this.persistent.unlockedDungeons.includes('gate')) {
                this.persistent.unlockedDungeons.push('gate');
                alert('🎉 解锁了新副本：幽暗之门！');
            }
        }
        
        this.saveData();
        alert(`🎉 通关了 ${this.currentDungeon.name}！\n\n💰 道具结算：${itemCount} 件物品 → ${goldEarned} 金币`);
        this.dungeonInv = []; // 清空背包
        this.showLobby();
    }

    quitLayer() {
        if (confirm('确定要撤退吗？将返回大厅。')) {
            this.showLayerSelect();
        }
    }

    // 撤退并结算
    retreatAndSettle() {
        const config = this.currentDungeon.layers[this.currentLayer];
        if (this.exploredSteps < config.steps) {
            this.log('⚠️ 探索步数不足！', 'bad');
            return;
        }

        // 结算道具为金币
        const { goldEarned, itemCount } = this.settleItems();
        
        if (confirm(`确定要撤退吗？\n\n💰 ${itemCount} 件物品将结算为 ${goldEarned} 金币`)) {
            this.persistent.gold += goldEarned;
            this.saveData();
            this.dungeonInv = []; // 清空背包
            this.showLobby();
        }
    }

    // 结算道具为金币
    settleItems() {
        let goldEarned = 0;
        let itemCount = 0;
        
        this.dungeonInv.forEach(item => {
            if (item.value) {
                goldEarned += Math.floor(item.value * 0.5); // 50%价格回收
                itemCount++;
            }
        });
        
        this.persistent.gold += goldEarned;
        return { goldEarned, itemCount };
    }

    death() {
        this.persistent.stats.totalDeaths++;
        
        // 死亡只损失副本内获得的道具，保留金币
        const lostItems = this.dungeonInv.filter(item => item.obtainedInDungeon).length;
        const keptItems = this.dungeonInv.filter(item => !item.obtainedInDungeon);
        
        this.dungeonInv = keptItems; // 只保留商店购买的道具
        
        this.saveData();
        alert(`💀 理智崩溃！\n\n你的精神无法承受这片黑暗...\n🎒 损失了 ${lostItems} 件副本内获得的道具\n✅ 保留了商店购买的道具`);
        this.showLobby();
    }

    log(msg, type) {
        console.log(`[${type || 'info'}] ${msg}`);
        
        // 保存到日志数组
        this.explorationLogs.unshift({ msg, type, time: Date.now() });
        
        // 限制日志条目数
        while (this.explorationLogs.length > 20) {
            this.explorationLogs.pop();
        }
        
        // 添加到探索日志面板
        const logPanel = document.getElementById('exploration-log');
        if (logPanel) {
            // 清空并重新渲染所有日志
            logPanel.innerHTML = this.explorationLogs.map(log => 
                `<div class="log-entry ${log.type || 'info'}">${log.msg}</div>`
            ).join('');
        }
    }
    
    renderLogs() {
        const logPanel = document.getElementById('exploration-log');
        if (logPanel && this.explorationLogs.length > 0) {
            logPanel.innerHTML = this.explorationLogs.map(log => 
                `<div class="log-entry ${log.type || 'info'}">${log.msg}</div>`
            ).join('');
        }
    }

    // 剧情数据 - 岭下暗影
    // 根据层数和房间类型获取奖励道具
    getLayerRewardItem(roomType) {
        const layer = this.currentLayer;
        const rand = Math.random();
        
        // 第1层（低风险）
        if (layer === 0) {
            if (roomType === 'sub' && rand < 0.5) {
                // 支线50%给煤油灯或标记器+1
                if (rand < 0.25) {
                    return { id: 'lantern', name: '煤油灯', icon: '🏮', type: 'functional', desc: '降低幻觉效果30秒', effect: 'antiHallucination', value: 80 };
                } else {
                    // 标记器+1，返回特殊标记
                    return { id: 'markerBonus', name: '标记器+1', icon: '🚩', type: 'bonus', effect: 'markers+1', value: 0 };
                }
            }
            return null; // 主线不给道具
        }
        
        // 第2层（开始压力）
        if (layer === 1) {
            if (roomType === 'main') {
                // 主线给理智药水
                return { id: 'sanityPotion', name: '理智药水', icon: '🧪', type: 'functional', desc: '恢复20点理智值', effect: 'sanity+20', value: 50 };
            } else if (roomType === 'sub' && rand < 0.3) {
                // 支线30%给奴隶地图
                return { id: 'slaveMap', name: '奴隶地图', icon: '🗺️', type: 'story', desc: '记录着秘密通道的位置', value: 150 };
            }
        }
        
        // 第3层（中等风险）
        if (layer === 2) {
            if (roomType === 'main') {
                // 主线给探测器
                return { id: 'detector', name: '探测器', icon: '🔍', type: 'functional', desc: '揭示任意1格内容', effect: 'reveal', value: 100 };
            } else if (roomType === 'sub' && rand < 0.25) {
                // 支线25%给护身符
                return { id: 'amulet', name: '护身符', icon: '✨', type: 'story', desc: '蛇人信徒的护身符，可降低遭遇危险的概率', value: 250 };
            }
        }
        
        // 第4层（高风险）
        if (layer === 3) {
            if (roomType === 'main') {
                // 主线给标记器套装
                return { id: 'markerPack', name: '标记器套装', icon: '🚩', type: 'functional', desc: '获得2个额外标记器', effect: 'markers+2', value: 30 };
            } else if (roomType === 'sub' && rand < 0.2) {
                // 支线20%给古老钥匙
                return { id: 'oldKey', name: '古老钥匙', icon: '🗝️', type: 'story', desc: '用于开启隐藏的密室', value: 200 };
            }
        }
        
        // 第5层（BOSS）
        if (layer === 4) {
            if (roomType === 'main') {
                // 主线通关给神秘卷轴
                return { id: 'mysteriousScroll', name: '神秘卷轴', icon: '📜', type: 'story', desc: '记载着古老的咒语', value: 300 };
            } else if (roomType === 'sub' && rand < 0.15) {
                // 支线15%给火焰咒文（使用神秘卷轴代替，或自定义）
                return { id: 'mysteriousScroll', name: '火焰咒文', icon: '🔥', type: 'story', desc: '对蛇人特攻的古老咒文', value: 300 };
            }
        }
        
        return null;
    }

    getLayerStories(layerIndex) {
        const shadowStories = {
            0: { // 第1层 - 地窖
                main: [
                    {
                        id: 'shadow_l1_main_1',
                        title: '主线·地窖入口',
                        text: '推开老宅沉重的木门，穿过积灰的走廊来到地窖，潮湿的霉味混杂着泥土气息扑面而来。墙角的砖墙被破开一个可供人通行的大洞，洞壁残留着新鲜的挖掘痕迹，地面上一串男性足迹延伸进洞内，却在深处被碎石掩盖；墙壁上刻着模糊的18世纪船锚图案，那是当年奴隶贩子的隐秘标记。乔什的工具随意散落，隧道深处传来隐约的气流声，带着地底特有的阴冷，你知道，要找到乔什，就必须踏入这片未知的黑暗。',
                        goodOutcome: { text: '你找到了一盏还能使用的煤油灯，照亮了前方的道路', reward: '理智+10，获得煤油灯', sanity: 10, item: { id: 'lantern', name: '煤油灯', icon: '🏮', type: 'functional', desc: '降低幻觉效果', effect: 'antiHallucination', value: 80 } },
                        badOutcome: { text: '黑暗中有什么东西擦过你的肩膀，你猛地转身却什么也没看到...但那寒意真实存在', reward: '理智-15，幻觉模式持续时间+1回合', sanity: -15 }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l1_sub_1',
                        title: '支线·走私账本',
                        text: '地窖角落的木箱积满灰尘，撬开腐朽的木板，里面藏着一本皮质封面的账本，泛黄的纸页上记录着以利亚·文斯考特历年走私奴隶的数量、交易对象与获利明细。账本最后一页画着一个简易的船锚标记，与墙壁上的图案完全一致。',
                        goodOutcome: { text: '账本中夹着一张泛黄的照片，背面写着"隧道东端有备用出口"', reward: '理智+5，发现隐藏线索', sanity: 5 },
                        badOutcome: { text: '你翻阅账本时，一张蛇形符号的纸条从页间滑落...你感到被注视', reward: '理智-10，获得"被标记"状态', sanity: -10 }
                    },
                    {
                        id: 'shadow_l1_sub_2',
                        title: '支线·未寄出的信',
                        text: '地窖墙角的暗格中，藏着一封未寄出的信："以利亚疯了，他说隧道尽头有「永恒的生命」，非要带着奴隶进去……那些人再也没回来，我听到了隧道里的嘶吼，那声音不似人类，我要逃离这里，再也不回来。"信纸边缘被泪水浸透，字迹潦草而颤抖。',
                        goodOutcome: { text: '信件背面画着简易地图，标记了安全通道', reward: '标记器+1，理智+5', sanity: 5, markers: 1 },
                        badOutcome: { text: '你读完信后，身后传来轻微的哭泣声...是那个写信人的幽灵吗？', reward: '理智-15，遭遇幽灵幻象', sanity: -15 }
                    }
                ]
            },
            1: { // 第2层 - 隧道遗迹
                main: [
                    {
                        id: 'shadow_l2_main_1',
                        title: '主线·骸骨密室',
                        text: '隧道西行两百英尺后，空间豁然开阔，六具枯骨散落在潮湿的地面上。三具骸骨的四肢还套着锈蚀的铁质镣铐，骨骼上布满撕咬与断裂的痕迹；另外三具残留着殖民时代的衣物碎片，布料上凝结的暗红痕迹早已干涸。你在骸骨堆下摸到一个锈蚀的铁盒，里面藏着一封泛黄的信件——是杰克伯·彼希写给友人的手札，字迹颤抖地记录着乔什的先祖以利亚·文斯考特利用隧道走私奴隶，却遭遇地底怪物袭击的往事。房间南侧的石壁上有一道狭窄的通道，蜿蜒向下，通往第二层的下一个房间。',
                        goodOutcome: { text: '你在铁盒底层发现了一枚铜钥匙，上面刻着"宝库"二字', reward: '理智+10，获得古老钥匙', sanity: 10, item: { id: 'oldKey', name: '古老钥匙', icon: '🗝️', type: 'story', desc: '用于开启隐藏的密室', value: 200 } },
                        badOutcome: { text: '当你读完信件抬头时，那些骸骨似乎移动了位置...它们面向着你', reward: '理智-20，遭遇尸骸诅咒', sanity: -20 }
                    },
                    {
                        id: 'shadow_l2_main_2',
                        title: '主线·峭壁通道',
                        text: '通道尽头是一处二十英尺高的垂直峭壁，下方是幽暗的洞穴空间，仅能隐约看到地面的岩石轮廓。峭壁上布满湿滑的苔藓，偶尔有水滴从洞顶滴落，在下方汇成细小的水洼。当年奴隶贩子与怪物搏斗的痕迹仍在——岩壁上有深浅不一的抓痕，地面散落着破碎的锁链与腐朽的木材。你必须想办法降下峭壁，下方的洞穴里，似乎有什么东西在黑暗中悄然注视着上方的动静。',
                        goodOutcome: { text: '你发现了一条隐蔽的下行阶梯，是古代蛇人修建的', reward: '理智+5，获得奴隶地图', sanity: 5, item: { id: 'slaveMap', name: '奴隶地图', icon: '🗺️', type: 'story', desc: '记录着秘密通道的位置', value: 150 } },
                        badOutcome: { text: '下降时你手一滑，重重摔在底部，黑暗中传来鳞片摩擦地面的声音...', reward: '理智-15，生命值-20，遭遇伏击', sanity: -15 }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l2_sub_1',
                        title: '支线·安娜的铭牌',
                        text: '你伸手触碰那具套着镣铐的骸骨，指腹抚过锈蚀的铁环，骸骨的手指突然微微晃动，攥着的半块青铜铭牌滑落。铭牌上刻着"安娜"二字，背面是一个小小的十字架，边缘刻着细密的花纹。',
                        goodOutcome: { text: '铭牌入手温暖，你感到一种莫名的安慰，仿佛安娜的灵魂得到了安息', reward: '理智+15，获得守护效果', sanity: 15 },
                        badOutcome: { text: '当你拿起铭牌时，骸骨突然死死抓住你的手腕，冰冷刺骨...', reward: '理智-20，被诅咒缠身', sanity: -20 }
                    },
                    {
                        id: 'shadow_l2_sub_2',
                        title: '支线·十字护身符',
                        text: '攀爬峭壁时，指尖抠进一道狭窄的石缝，摸到一个冰凉的金属物件。取出一看，是一枚铜制十字架护身符，表面氧化发黑，但十字架中心的宝石仍透着微弱的光芒。',
                        goodOutcome: { text: '护身符散发出温暖的光芒，你感到恐惧被驱散', reward: '理智+10，幻觉抗性+20%', sanity: 10 },
                        badOutcome: { text: '护身符突然变得滚烫，你手一松它坠入深渊，伴随着一声刺耳的尖啸...', reward: '理智-10，标记器-1', sanity: -10, markers: -1 }
                    },
                    {
                        id: 'shadow_l2_sub_3',
                        title: '碎片·走私者日记',
                        text: '"隧道里的鳞片不是蛇的，摸起来像金属，带着腥味……我看到它站起来了，有手有脚，像人一样走在黑暗里。它的眼睛没有瞳孔，只有一片浑浊的黄色，盯着我的时候，我连呼吸都忘了。"—— 1810年奴隶走私者的日记残页',
                        goodOutcome: { text: '日记边缘画着怪物的弱点示意图', reward: '获得敌人情报，标记器+1', markers: 1 },
                        badOutcome: { text: '你读完日记后，黑暗中传来与描述一样的脚步声...越来越近', reward: '理智-15，遭遇巡逻怪物', sanity: -15 }
                    },
                    {
                        id: 'shadow_l2_sub_4',
                        title: '碎片·苔藓刻字',
                        text: '峭壁通道的苔藓下，刻着模糊的字迹："水是生路，螺旋是门"，字迹陈旧，部分笔画已被苔藓覆盖，像是数代闯入者留下的共同警示。下方的水洼中，倒影里的字迹似乎有所不同，仔细辨认，发现最后还藏着"勿回头"三个字。',
                        goodOutcome: { text: '你领悟了警示的含义，发现了一条隐藏通道', reward: '理智+5，捷径解锁', sanity: 5 },
                        badOutcome: { text: '你忍不住回头看了一眼...水洼中倒映的不是你的脸', reward: '理智-25，幻觉模式强制触发', sanity: -25 }
                    }
                ]
            },
            2: { // 第3层 - 蛇人先民遗迹
                main: [
                    {
                        id: 'shadow_l3_main_1',
                        title: '主线·音乐室',
                        text: '洞穴豁然开朗，岩壁上镶嵌的水晶在手电筒的光芒下折射出诡异的光晕。洞顶高逾百英尺，远处的墙壁上交错着青铜管，镶嵌着大小各异的彩色水晶，形成一个扭曲的奇异结构。房间中央，一块岩石被雕成不适配人类身形的座椅，上方的尖刺上插着二十颗人类头颅，表皮刻满扭曲的符文。没有风，却能听到轻柔的哀泣合唱，那声音正是来自这些头颅，它们紧闭的双眼下，嘴唇与喉咙的肌肉仍在无意识地颤动。',
                        goodOutcome: { text: '你发现了控制水晶的机关，停止了哀泣，头颅们闭上了眼睛', reward: '理智+20，获得理智药水', sanity: 20, item: { id: 'sanityPotion', name: '理智药水', icon: '🧪', type: 'functional', desc: '恢复20点理智值', effect: 'sanity+20', value: 50 } },
                        badOutcome: { text: '哀泣声突然变得刺耳，头颅们睁开了眼睛，齐声尖叫...', reward: '理智-30，精神崩溃', sanity: -30 }
                    },
                    {
                        id: 'shadow_l3_main_2',
                        title: '主线·陷坑陷阱',
                        text: '离开音乐室，通道变得宽阔，地面覆盖着碎石与潮湿的苔藓，行走时难免发出声响。前方的地面看似平坦，却暗藏着一道十英尺深的陷坑，坑壁上刻着与之前隧道中相似的蛇形图案，证明这里曾是蛇人隧道与奴隶通道的交汇之处。坑底散落着腐烂的奴隶枷锁与破碎的骨骼，显然曾有人不慎坠入此地，再也没能离开。',
                        goodOutcome: { text: '你发现了坑壁上的攀爬点，安全降入并成功找到出口', reward: '理智+5，获得探测器', sanity: 5, item: { id: 'detector', name: '探测器', icon: '🔍', type: 'functional', desc: '揭示任意1格内容', effect: 'reveal', value: 100 } },
                        badOutcome: { text: '你失足坠入陷坑，坑底的骸骨突然活动起来...', reward: '理智-20，生命值-30，遭遇骸骨袭击', sanity: -20 }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l3_sub_1',
                        title: '支线·蛇人牙齿',
                        text: '你举起武器狠狠砸向头颅装置，青铜管与头骨碰撞发出刺耳的声响，随着一声巨响，装置轰然爆炸，洞穴顶部的碎石纷纷掉落。烟尘散去后，你在散落的青铜管碎片中发现一枚泛着寒光的蛇人牙齿，牙齿尖端仍残留着暗红色的血迹。',
                        goodOutcome: { text: '牙齿可以作为武器镶嵌材料，攻击附带毒素伤害', reward: '获得强化材料，标记器+1', markers: 1 },
                        badOutcome: { text: '当你触碰牙齿时，指尖被割破，毒素让你视野模糊...', reward: '理智-15，中毒状态', sanity: -15 }
                    },
                    {
                        id: 'shadow_l3_sub_2',
                        title: '支线·奴隶信件',
                        text: '你俯身查看陷坑底部的积水，浑浊的水中漂浮着一封褪色的奴隶信件，纸张早已泡得发软，字迹模糊不清。小心翼翼地展开，勉强能辨认出"鳞甲怪物""夜间出没""怕火"等字眼，信件末尾画着一个蛇形图案。',
                        goodOutcome: { text: '信件中藏着逃生的路线图', reward: '理智+5，发现捷径', sanity: 5 },
                        badOutcome: { text: '信上的蛇形图案突然活了过来，化为毒蛇咬向你的手...', reward: '理智-15，生命值-10', sanity: -15 }
                    },
                    {
                        id: 'shadow_l3_sub_3',
                        title: '支线·阿卡洛语',
                        text: '你犹豫片刻后坐在了岩石座椅上，头颅的哀泣合唱突然变得清晰洪亮，仿佛就在耳边吟唱。诡异的旋律钻进脑海，眼前浮现出蛇人祭祀的模糊幻象，你下意识地记住了几句晦涩的阿卡洛语发音。',
                        goodOutcome: { text: '你学会了基础阿卡洛语，可以解读蛇人符文', reward: '获得语言技能，理智+10', sanity: 10 },
                        badOutcome: { text: '幻象太过真实，你的意识被困在座椅上，差点无法醒来...', reward: '理智-25，暂时失去行动能力', sanity: -25 }
                    }
                ]
            },
            3: { // 第4层 - 蛇人领地核心
                main: [
                    {
                        id: 'shadow_l4_main_1',
                        title: '主线·真菌种植场',
                        text: '巨大的洞穴中，怪异的真菌长得比人还高，空气弥漫着温暖潮湿的雾气，每十分钟便会从洞顶的孔洞中喷涌一次。两名身形畸形、浑身多毛的生物正在照料真菌，它们看起来像苍白的猿猴，手臂远长于常人，见到你时停下动作，用巨大的眼睛好奇地注视着，没有立刻发动攻击。地面上，一些真菌的伞盖散发着微弱的荧光，照亮了周围散落的奴隶契约碎片。',
                        goodOutcome: { text: '退化人对你产生好奇，允许你安全通过', reward: '理智+10，获得标记器套装', sanity: 10, item: { id: 'markerPack', name: '标记器套装', icon: '🚩', type: 'functional', desc: '获得2个额外标记器', effect: 'markers+2', value: 30 } },
                        badOutcome: { text: '退化人突然狂暴，发出刺耳的尖叫，更多同类从黑暗中涌出...', reward: '理智-20，遭遇围攻', sanity: -20 }
                    },
                    {
                        id: 'shadow_l4_main_2',
                        title: '主线·蛇父神殿',
                        text: '洞穴中央矗立着一根巨大的天然石柱，被雕刻成盘卷的巨蛇形态，蛇的前额镶嵌着一枚苍白的宝石，散发着微弱的光芒，那是蛇人神祇伊格的象征。石柱前的石祭坛上，暗色的痕迹早已干涸，那是经年累月的血迹；两侧的球形金色香炉中，仍有芳香的烟云缓缓升腾。',
                        goodOutcome: { text: '你领悟了宝石的秘密，获得了伊格的祝福', reward: '理智+15，获得神力加持', sanity: 15 },
                        badOutcome: { text: '伊格的意志侵入你的脑海，命令你臣服...', reward: '理智-30，被精神控制一回合', sanity: -30 }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l4_sub_1',
                        title: '碎片·奴隶契约',
                        text: '契约碎片上印有以利亚·文斯考特的签名，详细记录了奴隶交易的条款。',
                        goodOutcome: { text: '契约背面藏着宝库密码', reward: '获得密码，金币+50' },
                        badOutcome: { text: '契约上的签名开始流血，文斯考特的灵魂浮现...', reward: '理智-20，遭遇怨灵', sanity: -20 }
                    },
                    {
                        id: 'shadow_l4_sub_2',
                        title: '碎片·香炉烟雾',
                        text: '芳香的烟雾吸入后让人感到宁静，但你注意到烟雾中似乎有细小的生物在游动。',
                        goodOutcome: { text: '你控制呼吸，获得了烟雾带来的预知能力', reward: '理智+10，预知陷阱', sanity: 10 },
                        badOutcome: { text: '你吸入过多，意识陷入迷雾之中...', reward: '理智-20，幻觉模式', sanity: -20 }
                    }
                ]
            },
            4: { // 第5层 - 蛇人核心巢穴
                main: [
                    {
                        id: 'shadow_l5_main_1',
                        title: '主线·核心巢穴',
                        text: '核心巢穴是整个地底的最深处，地面铺着皮质靠垫，一侧的温泉浴池冒着热气，另一侧的实验台上摆放着三本蛇人皮革卷轴。斯西亚·瑞斯正坐在卷轴前研究，它蛇形的身躯覆盖着银灰色鳞片，鳞片在荧光下泛着冷光，见到你闯入，眼中闪过冰冷的杀意，立刻召唤两只妖鬼助战。',
                        goodOutcome: { text: '你趁斯西亚不备发动偷袭，占据了主动', reward: 'BOSS战优势，理智+20', sanity: 20 },
                        badOutcome: { text: '斯西亚的迷身术让你动弹不得，只能眼睁睁看着妖鬼逼近...', reward: '理智-30，BOSS战劣势', sanity: -30 }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l5_sub_1',
                        title: '支线·皮革卷轴',
                        text: '实验台上的三本蛇人皮革卷轴散发着古老的气息，上面用阿卡姆语记载着"阿卡洛语·火焰咒文"。',
                        goodOutcome: { text: '你学会了火焰咒文，对蛇人特攻', reward: '获得技能，标记器+2', markers: 2 },
                        badOutcome: { text: '阅读时你心智受到冲击，几乎陷入疯狂...', reward: '理智-25', sanity: -25 }
                    }
                ]
            }
        };

        const layerData = shadowStories[layerIndex] || shadowStories[0];
        return layerData;
    }

    getRandomMainStory() {
        const stories = this.getLayerStories(this.currentLayer).main;
        return stories[Math.floor(Math.random() * stories.length)];
    }

    getRandomSubStory() {
        const stories = this.getLayerStories(this.currentLayer).sub;
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
