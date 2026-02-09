/**
 * DS03 - 卡牌驱动的探索 (Card-Driven Exploration)
 * 融合《苏丹的游戏》卡牌机制 + DS01扫雷基底
 * 核心机制：手牌系统、卡牌效果、资源管理、道德选择
 */

class DS03Game {
    constructor() {
        this.GRID_SIZE = 12;
        this.MINE_COUNT = 20;
        
        this.state = 'tavern';
        this.mode = 'explore';
        
        this.grid = [];
        this.sanity = 100;
        this.maxSanity = 100;
        this.actionPoints = 3; // 每回合行动点
        this.maxActionPoints = 3;
        this.dungeonInv = [];
        this.depth = 1;
        this.turn = 1;
        
        // DS03核心：卡牌系统
        this.deck = []; // 牌库
        this.hand = []; // 手牌
        this.maxHandSize = 5;
        this.discardPile = []; // 弃牌堆
        
        this.persistent = this.loadData();
        
        // 卡牌定义
        this.cardTypes = {
            // 基础探索牌
            cautious_step: {
                name: '谨慎步伐',
                icon: '🚶',
                type: 'explore',
                cost: { ap: 1 },
                effect: 'reveal_safe',
                desc: '揭示1格，不会触发陷阱'
            },
            reckless_dash: {
                name: '鲁莽冲锋',
                icon: '⚡',
                type: 'explore',
                cost: { ap: 1, sanity: 5 },
                effect: 'reveal_3x3',
                desc: '揭示3x3区域，但损失5理智'
            },
            divine_scan: {
                name: '神启扫描',
                icon: '🔮',
                type: 'explore',
                cost: { ap: 2 },
                effect: 'scan_area',
                desc: '揭示周围所有安全格子'
            },
            // 工具牌
            place_flag: {
                name: '标记陷阱',
                icon: '🚩',
                type: 'tool',
                cost: { ap: 1 },
                effect: 'flag_cell',
                desc: '在格子上放置标记'
            },
            probe_rod: {
                name: '探测杆',
                icon: '📍',
                type: 'tool',
                cost: { ap: 1 },
                effect: 'probe_safe',
                desc: '检查相邻格子是否安全'
            },
            // 苏丹风格：抉择牌
            dark_bargain: {
                name: '黑暗交易',
                icon: '🤝',
                type: 'choice',
                cost: { ap: 0 },
                effect: 'bargain',
                desc: '获得2张牌，但失去10理智'
            },
            blood_ritual: {
                name: '血祭仪式',
                icon: '🔪',
                type: 'choice',
                cost: { ap: 0 },
                effect: 'ritual',
                desc: '揭示5格，但必须丢弃1个物品'
            },
            desperate_gamble: {
                name: '绝望赌博',
                icon: '🎲',
                type: 'choice',
                cost: { ap: 1 },
                effect: 'gamble',
                desc: '50%揭示大片区域，50%触发陷阱'
            },
            // 特殊牌
            second_wind: {
                name: '第二 wind',
                icon: '💨',
                type: 'special',
                cost: { ap: 0, sanity: 10 },
                effect: 'refresh_ap',
                desc: '恢复全部行动点'
            },
            mind_shield: {
                name: '心灵护盾',
                icon: '🛡️',
                type: 'special',
                cost: { ap: 1 },
                effect: 'protect_sanity',
                desc: '本回合免疫理智损失'
            },
            // 诅咒牌（强制加入 deck）
            haunting_whisper: {
                name: '缠身低语',
                icon: '👻',
                type: 'curse',
                cost: { ap: 1 },
                effect: 'must_play',
                desc: '必须打出，否则每回合损失5理智'
            }
        };
        
        this.init();
    }
    
    loadData() {
        const defaultData = { 
            vault: [], gold: 0, dives: 0, extracts: 0, maxDepth: 1,
            unlockedCards: ['cautious_step', 'place_flag'],
            deckPreference: [],
            moralChoices: []
        };
        try {
            const saved = localStorage.getItem('DS03_save');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }
    
    saveData() {
        localStorage.setItem('DS03_save', JSON.stringify(this.persistent));
    }
    
    // 构建牌库
    buildDeck() {
        this.deck = [];
        // 基础牌
        for (let i = 0; i < 8; i++) this.deck.push('cautious_step');
        for (let i = 0; i < 4; i++) this.deck.push('reckless_dash');
        for (let i = 0; i < 3; i++) this.deck.push('place_flag');
        for (let i = 0; i < 2; i++) this.deck.push('divine_scan');
        for (let i = 0; i < 2; i++) this.deck.push('probe_rod');
        
        // 抉择牌
        this.deck.push('dark_bargain');
        this.deck.push('blood_ritual');
        this.deck.push('desperate_gamble');
        
        // 特殊牌
        this.deck.push('second_wind');
        this.deck.push('mind_shield');
        
        // 诅咒牌（后期根据疯狂度添加）
        if (this.depth >= 2) this.deck.push('haunting_whisper');
        if (this.depth >= 3) this.deck.push('haunting_whisper');
        
        // 打乱牌库
        this.deck.sort(() => 0.5 - Math.random());
    }
    
    // 抽牌
    drawCard(count = 1) {
        for (let i = 0; i < count; i++) {
            if (this.hand.length >= this.maxHandSize) break;
            
            if (this.deck.length === 0) {
                // 牌库空了，弃牌堆洗牌
                if (this.discardPile.length === 0) break;
                this.deck = [...this.discardPile];
                this.discardPile = [];
                this.deck.sort(() => 0.5 - Math.random());
            }
            
            if (this.deck.length > 0) {
                const cardKey = this.deck.pop();
                this.hand.push(cardKey);
            }
        }
        this.updateHandUI();
    }
    
    showTavern() {
        this.state = 'tavern';
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="tavern">
                <header>
                    <h1>🃏 卡牌酒馆</h1>
                    <div class="stats">
                        <span>💰 ${this.persistent.gold}</span>
                        <span>🏆 ${this.persistent.extracts}/${this.persistent.dives}</span>
                        <span>🃏 ${this.persistent.unlockedCards.length} 种卡牌</span>
                    </div>
                </header>
                <div class="tavern-info">
                    <p>🎴 本Demo核心：所有行动都通过<卡牌>进行</p>
                    <p>🎯 没有直接点击，只有策略选择</p>
                    <p>⚖️ 每张卡都有代价，正如每个选择都有后果</p>
                </div>
                <div class="deck-preview">
                    <h3>当前牌库预览</h3>
                    <div class="card-list">
                        ${this.persistent.unlockedCards.map(key => {
                            const card = this.cardTypes[key];
                            return `<div class="card-mini">
                                <span>${card.icon}</span>
                                <span>${card.name}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="tavern-actions">
                    <button id="dive-btn" class="primary">🕳️ 潜入深渊 (层级 ${this.persistent.maxDepth})</button>
                    <button id="delete-btn">🗑️ 重置存档</button>
                </div>
            </div>`;
        
        document.getElementById('dive-btn').onclick = () => this.startDive();
        document.getElementById('delete-btn').onclick = () => this.deleteSave();
    }
    
    deleteSave() {
        if (confirm('重置存档？')) {
            localStorage.removeItem('DS03_save');
            this.persistent = this.loadData();
            this.showTavern();
        }
    }
    
    startDive() {
        this.state = 'dungeon';
        this.persistent.dives++;
        this.sanity = 100;
        this.actionPoints = this.maxActionPoints;
        this.dungeonInv = [];
        this.depth = this.persistent.maxDepth;
        this.turn = 1;
        
        // 初始化卡牌系统
        this.buildDeck();
        this.hand = [];
        this.discardPile = [];
        
        this.createGrid();
        this.placeMines();
        this.placeItems();
        this.placeExit();
        this.calcNumbers();
        
        this.renderDungeon();
        this.log('卡牌系统启动...抽取初始手牌', 'system');
        this.drawCard(4); // 初始4张牌
    }
    
    createGrid() {
        this.grid = Array(this.GRID_SIZE).fill(null).map((_, y) =>
            Array(this.GRID_SIZE).fill(null).map((_, x) => ({
                x, y, isMine: false, isRevealed: false, isFlagged: false,
                number: 0, item: null, isExit: false,
                isProbed: false // DS03：被探测过的标记
            }))
        );
    }
    
    placeMines() {
        let placed = 0;
        while (placed < this.MINE_COUNT) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            if (!this.grid[y][x].isMine && !(x < 2 && y < 2)) {
                this.grid[y][x].isMine = true;
                placed++;
            }
        }
    }
    
    placeItems() {
        const keys = Object.keys({
            fossil: { name: '化石', icon: '🦴', value: 10, weight: 1 },
            idol: { name: '神像', icon: '🗿', value: 50, weight: 2, cursed: true },
            manuscript: { name: '手稿', icon: '📜', value: 30, weight: 0.5 },
            medkit: { name: '药剂', icon: '🧪', value: 20, weight: 0.5 },
            relic: { name: '遗物', icon: '💎', value: 100, weight: 3, cursed: true }
        });
        for (let i = 0; i < 6; i++) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            const cell = this.grid[y][x];
            if (!cell.isMine && !cell.item && !cell.isExit) {
                const key = keys[Math.floor(Math.random() * keys.length)];
                cell.item = { type: key, name: key, icon: this.getItemIcon(key), value: [10,50,30,20,100][keys.indexOf(key)], weight: [1,2,0.5,0.5,3][keys.indexOf(key)] };
            }
        }
    }
    
    getItemIcon(key) {
        const icons = { fossil: '🦴', idol: '🗿', manuscript: '📜', medkit: '🧪', relic: '💎' };
        return icons[key] || '?';
    }
    
    placeExit() {
        let placed = false;
        while (!placed) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            if (!this.grid[y][x].isMine && !this.grid[y][x].item && x > 8 && y > 8) {
                this.grid[y][x].isExit = true;
                placed = true;
            }
        }
    }
    
    calcNumbers() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (!this.grid[y][x].isMine) {
                    let count = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = y + dy, nx = x + dx;
                            if (ny >= 0 && ny < this.GRID_SIZE && nx >= 0 && nx < this.GRID_SIZE) {
                                if (this.grid[ny][nx].isMine) count++;
                            }
                        }
                    }
                    this.grid[y][x].number = count;
                }
            }
        }
    }
    
    renderDungeon() {
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="dungeon">
                <header>
                    <div class="header-left">
                        <button onclick="game.quitDive()">⬅️ 撤退</button>
                        <span>🕳️ 层级 ${this.depth} | 回合 ${this.turn}</span>
                    </div>
                    <div class="resources">
                        <div class="resource">
                            <span>⚡</span>
                            <div class="ap-bar">
                                ${Array(this.maxActionPoints).fill(0).map((_, i) => 
                                    `<div class="ap-dot ${i < this.actionPoints ? 'active' : ''}"></div>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="resource">
                            <span>🧠</span>
                            <span>${this.sanity}/${this.maxSanity}</span>
                        </div>
                        <div class="resource">
                            <span>📦</span>
                            <span>${this.dungeonInv.reduce((s,i)=>s+i.weight,0).toFixed(1)}/10</span>
                        </div>
                    </div>
                </header>
                
                <div class="main-area">
                    <div id="minefield"></div>
                    <div class="side-panel">
                        <div id="hand-panel">
                            <h4>🃏 手牌 (${this.hand.length}/${this.maxHandSize})</h4>
                            <div id="hand-cards"></div>
                        </div>
                        <div id="deck-info">
                            <span>🎴 牌库: ${this.deck.length}</span>
                            <span>🗑️ 弃牌: ${this.discardPile.length}</span>
                        </div>
                        <div id="log"></div>
                    </div>
                </div>
                
                <footer>
                    <button onclick="game.endTurn()" class="primary">🔚 结束回合 (抽2张)</button>
                    <button onclick="game.extract()" id="btn-extract" class="hidden">🚪 撤离</button>
                </footer>
            </div>
            
            <div id="target-modal" class="modal hidden">
                <div class="modal-content">
                    <h3>选择目标格子</h3>
                    <p>点击地图上的格子使用此卡牌</p>
                    <button onclick="game.cancelTarget()">取消</button>
                </div>
            </div>`;
        
        const mf = document.getElementById('minefield');
        mf.style.display = 'grid';
        mf.style.gridTemplateColumns = `repeat(${this.GRID_SIZE}, 36px)`;
        
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.onclick = () => this.onCellClick(x, y);
                mf.appendChild(cell);
            }
        }
        
        this.updateGrid();
        this.updateHandUI();
    }
    
    updateGrid() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                const div = document.querySelector(`#minefield .cell[data-x="${x}"][data-y="${y}"]`);
                if (!div) continue;
                
                div.className = 'cell';
                div.textContent = '';
                div.style = '';
                
                if (cell.isRevealed) {
                    div.classList.add('revealed');
                    if (cell.isMine) { div.classList.add('mine'); div.textContent = '💀'; }
                    else if (cell.isExit) { div.classList.add('exit'); div.textContent = '🚪'; }
                    else if (cell.number > 0) { div.textContent = cell.number; }
                } else {
                    if (cell.isFlagged) {
                        div.classList.add('flagged');
                        div.textContent = '🚩';
                    }
                    if (cell.isProbed) {
                        div.style.border = '2px solid #4a90d9';
                    }
                }
            }
        }
    }
    
    updateHandUI() {
        const handDiv = document.getElementById('hand-cards');
        if (!handDiv) return;
        
        handDiv.innerHTML = this.hand.map((cardKey, index) => {
            const card = this.cardTypes[cardKey];
            const canAfford = this.canAfford(card.cost);
            return `
                <div class="hand-card ${canAfford ? '' : 'unaffordable'} ${card.type}" 
                     onclick="game.playCard(${index})"
                     title="${card.desc}">
                    <div class="card-icon">${card.icon}</div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-cost">
                        ${card.cost.ap ? `⚡${card.cost.ap}` : ''}
                        ${card.cost.sanity ? `🧠${card.cost.sanity}` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    canAfford(cost) {
        if (cost.ap && this.actionPoints < cost.ap) return false;
        if (cost.sanity && this.sanity < cost.sanity) return false;
        return true;
    }
    
    // 打出卡牌
    playCard(handIndex) {
        if (this.state !== 'dungeon') return;
        
        const cardKey = this.hand[handIndex];
        const card = this.cardTypes[cardKey];
        
        if (!this.canAfford(card.cost)) {
            this.log('⚠️ 资源不足！', 'bad');
            return;
        }
        
        // 需要选择目标的卡牌
        if (['reveal_safe', 'flag_cell', 'probe_safe'].includes(card.effect)) {
            this.pendingCard = { handIndex, card, cardKey };
            document.getElementById('target-modal').classList.remove('hidden');
            this.log(`选择了 ${card.name}，请点击目标格子`, 'system');
            return;
        }
        
        // 直接生效的卡牌
        this.executeCard(handIndex, card, cardKey);
    }
    
    onCellClick(x, y) {
        if (this.pendingCard) {
            this.executeTargetedCard(x, y);
        }
    }
    
    executeTargetedCard(x, y) {
        const { handIndex, card, cardKey } = this.pendingCard;
        const cell = this.grid[y][x];
        
        document.getElementById('target-modal').classList.add('hidden');
        
        // 支付代价
        this.payCost(card.cost);
        
        switch (card.effect) {
            case 'reveal_safe':
                if (!cell.isRevealed && !cell.isFlagged) {
                    this.revealCell(x, y, true);
                }
                break;
            case 'flag_cell':
                if (!cell.isRevealed) {
                    cell.isFlagged = !cell.isFlagged;
                    this.log(`${cell.isFlagged ? '放置' : '移除'}了标记`);
                }
                break;
            case 'probe_safe':
                this.probeAdjacent(x, y);
                break;
        }
        
        // 移除手牌，加入弃牌堆
        this.hand.splice(handIndex, 1);
        this.discardPile.push(cardKey);
        this.pendingCard = null;
        
        this.updateGrid();
        this.updateHandUI();
    }
    
    executeCard(handIndex, card, cardKey) {
        // 支付代价
        this.payCost(card.cost);
        
        switch (card.effect) {
            case 'reveal_3x3':
                this.revealArea(this.selectedCell?.x || 0, this.selectedCell?.y || 0, 1);
                this.log('⚡ 鲁莽冲锋！揭示周围区域', 'special');
                break;
            case 'scan_area':
                this.scanSafeCells();
                break;
            case 'bargain':
                this.sanity -= 10;
                this.drawCard(2);
                this.log('🤝 黑暗交易...获得2张牌，失去10理智', 'special');
                break;
            case 'ritual':
                if (this.dungeonInv.length > 0) {
                    const sacrificed = this.dungeonInv.pop();
                    this.log(`🔪 献祭了 ${sacrificed.name}，揭示5格`);
                    this.revealRandomCells(5);
                } else {
                    this.log('⚠️ 没有物品可以献祭', 'bad');
                    return; // 不消耗卡牌
                }
                break;
            case 'gamble':
                if (Math.random() < 0.5) {
                    this.revealRandomCells(8);
                    this.log('🎲 赌博成功！揭示大片区域', 'good');
                } else {
                    this.sanity -= 20;
                    this.log('🎲 赌博失败...理智崩溃中', 'bad');
                }
                break;
            case 'refresh_ap':
                this.actionPoints = this.maxActionPoints;
                this.log('💨 恢复了全部行动点！');
                break;
            case 'protect_sanity':
                this.sanityProtected = true;
                this.log('🛡️ 心灵护盾激活');
                break;
        }
        
        // 移除手牌，加入弃牌堆
        this.hand.splice(handIndex, 1);
        this.discardPile.push(cardKey);
        
        this.updateGrid();
        this.updateHandUI();
        this.updateResourceUI();
    }
    
    payCost(cost) {
        if (cost.ap) this.actionPoints -= cost.ap;
        if (cost.sanity && !this.sanityProtected) this.sanity -= cost.sanity;
    }
    
    revealCell(x, y, safe = false) {
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;
        
        cell.isRevealed = true;
        
        if (cell.isMine && !safe) {
            this.sanity -= 25;
            this.log('💀 触发陷阱！理智-25', 'bad');
            if (this.sanity <= 0) this.gameOver();
        } else {
            if (cell.isExit) {
                document.getElementById('btn-extract').classList.remove('hidden');
                this.log('🚪 发现撤离点！');
            }
            if (cell.item) {
                const w = this.dungeonInv.reduce((s, i) => s + i.weight, 0);
                if (w + cell.item.weight <= 10) {
                    this.dungeonInv.push(cell.item);
                    this.log(`✅ 获得 ${cell.item.name}`);
                } else {
                    this.log('⚠️ 负重已满！', 'bad');
                }
                cell.item = null;
            }
            if (cell.number === 0) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (ny >= 0 && ny < this.GRID_SIZE && nx >= 0 && nx < this.GRID_SIZE) {
                            setTimeout(() => this.revealCell(nx, ny), 30);
                        }
                    }
                }
            }
        }
        this.updateGrid();
    }
    
    revealArea(cx, cy, radius) {
        for (let y = Math.max(0, cy - radius); y <= Math.min(this.GRID_SIZE - 1, cy + radius); y++) {
            for (let x = Math.max(0, cx - radius); x <= Math.min(this.GRID_SIZE - 1, cx + radius); x++) {
                if (!this.grid[y][x].isRevealed) {
                    this.revealCell(x, y);
                }
            }
        }
    }
    
    revealRandomCells(count) {
        const hidden = [];
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (!this.grid[y][x].isRevealed) hidden.push({x, y});
            }
        }
        hidden.sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(count, hidden.length); i++) {
            this.revealCell(hidden[i].x, hidden[i].y);
        }
    }
    
    scanSafeCells() {
        let revealed = 0;
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (!this.grid[y][x].isMine && !this.grid[y][x].isRevealed && Math.random() < 0.3) {
                    this.revealCell(x, y);
                    revealed++;
                }
            }
        }
        this.log(`🔮 神启扫描揭示了 ${revealed} 个安全区域`);
    }
    
    probeAdjacent(x, y) {
        let safeCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy, nx = x + dx;
                if (ny >= 0 && ny < this.GRID_SIZE && nx >= 0 && nx < this.GRID_SIZE) {
                    if (!this.grid[ny][nx].isMine) {
                        this.grid[ny][nx].isProbed = true;
                        safeCount++;
                    }
                }
            }
        }
        this.log(`📍 探测完成，周围有 ${safeCount} 个安全格子`);
    }
    
    cancelTarget() {
        this.pendingCard = null;
        document.getElementById('target-modal').classList.add('hidden');
    }
    
    endTurn() {
        this.turn++;
        this.actionPoints = this.maxActionPoints;
        this.sanityProtected = false;
        this.drawCard(2);
        this.log(`--- 回合 ${this.turn} ---`, 'system');
        this.updateResourceUI();
    }
    
    updateResourceUI() {
        const apBar = document.querySelector('.ap-bar');
        if (apBar) {
            apBar.innerHTML = Array(this.maxActionPoints).fill(0).map((_, i) => 
                `<div class="ap-dot ${i < this.actionPoints ? 'active' : ''}"></div>`
            ).join('');
        }
    }
    
    extract() {
        const value = this.dungeonInv.reduce((s, i) => s + i.value, 0);
        this.persistent.vault.push(...this.dungeonInv);
        this.persistent.gold += Math.floor(value * 0.5);
        this.persistent.extracts++;
        if (this.depth === this.persistent.maxDepth) this.persistent.maxDepth++;
        this.saveData();
        alert(`成功撤离！\n💰 +${Math.floor(value * 0.5)}金币`);
        this.showTavern();
    }
    
    quitDive() {
        if (confirm('撤退？当前手牌将丢失。')) {
            this.showTavern();
        }
    }
    
    gameOver() {
        this.saveData();
        alert('理智崩溃...');
        this.showTavern();
    }
    
    log(msg, type) {
        const log = document.getElementById('log');
        if (log) {
            const div = document.createElement('div');
            div.className = type || '';
            div.textContent = msg;
            log.insertBefore(div, log.firstChild);
            while (log.children.length > 20) log.removeChild(log.lastChild);
        }
    }
    
    init() {
        this.showTavern();
    }
}

window.onload = () => { window.game = new DS03Game(); };
