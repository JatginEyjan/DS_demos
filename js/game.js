/**
 * DS01 - 深渊扫雷 v2.0
 * 扫雷 + 搜打撤 + 克苏鲁 + 酒馆 + 存档系统
 */

class DS01Game {
    constructor() {
        this.GRID_SIZE = 12;
        this.MINE_COUNT = 20;
        this.MAX_REST = 3;
        
        this.state = 'tavern';
        this.mode = 'explore';
        
        this.grid = [];
        this.sanity = 100;
        this.dungeonInv = [];
        this.restCount = 0;
        this.depth = 1;
        
        this.persistent = this.loadData();
        
        this.itemTypes = {
            fossil: { name: '未知化石', icon: '🦴', value: 10, weight: 1 },
            idol: { name: '诡异神像', icon: '🗿', value: 50, weight: 2, cursed: true },
            manuscript: { name: '古老手稿', icon: '📜', value: 30, weight: 0.5 },
            relic: { name: '深渊遗物', icon: '💎', value: 100, weight: 3, cursed: true },
            medkit: { name: '理智药剂', icon: '🧪', value: 20, weight: 0.5, consumable: true },
            tool: { name: '探测工具', icon: '🔧', value: 5, weight: 0.5, consumable: true }
        };
        
        this.npcs = [
            { name: '神秘商人', icon: '🧙‍♂️', type: 'merchant' },
            { name: '受伤探险家', icon: '🤕', type: 'quest' },
            { name: '疯图书管理员', icon: '📚', type: 'lore' },
            { name: '酒馆老板', icon: '🍺', type: 'rest' }
        ];
        
        this.init();
    }
    
    // 存档系统
    loadData() {
        const defaultData = { vault: [], gold: 0, dives: 0, extracts: 0, maxDepth: 1, npcAffinity: {} };
        try {
            const saved = localStorage.getItem('DS01_v2');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }
    
    saveData() {
        localStorage.setItem('DS01_v2', JSON.stringify(this.persistent));
    }
    
    deleteSave() {
        if (confirm('删除所有存档？')) {
            localStorage.removeItem('DS01_v2');
            this.persistent = this.loadData();
            this.showTavern();
        }
    }
    
    // 酒馆系统
    showTavern() {
        this.state = 'tavern';
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="tavern">
                <header><h1>🍺 深渊酒馆</h1><span>💰 ${this.persistent.gold}</span></header>
                <div class="tavern-main">
                    <div class="vault"><h3>🏛️ 仓库</h3><div id="vault-grid"></div></div>
                    <div class="npcs"><h3>客人</h3><div id="npc-list"></div></div>
                </div>
                <div class="tavern-actions">
                    <button id="dive-btn" class="primary">🕳️ 潜入深渊</button>
                    <button id="delete-btn">🗑️ 删除存档</button>
                </div>
            </div>`;
        this.renderVault();
        this.renderNPCs();
        document.getElementById('dive-btn').onclick = () => this.startDive();
        document.getElementById('delete-btn').onclick = () => this.deleteSave();
    }
    
    renderVault() {
        const grid = document.getElementById('vault-grid');
        grid.innerHTML = this.persistent.vault.map((item, i) => `
            <div class="slot" onclick="game.sellItem(${i})" title="${item.name}">${item.icon}</div>
        `).join('') + '<div class="slot empty"></div>'.repeat(Math.max(0, 20 - this.persistent.vault.length));
    }
    
    renderNPCs() {
        const list = document.getElementById('npc-list');
        list.innerHTML = this.npcs.map(npc => `
            <div class="npc-card" onclick="game.talkNPC('${npc.type}')">
                <span>${npc.icon}</span><span>${npc.name}</span>
            </div>
        `).join('');
    }
    
    talkNPC(type) {
        alert(type === 'merchant' ? '商人: 有好货就拿来！' : 'NPC: 深渊越来越危险了...');
    }
    
    sellItem(i) {
        const item = this.persistent.vault[i];
        this.persistent.gold += Math.floor(item.value * 0.7);
        this.persistent.vault.splice(i, 1);
        this.saveData();
        this.showTavern();
    }
    
    // 地牢系统
    startDive() {
        this.state = 'dungeon';
        this.persistent.dives++;
        this.sanity = 100;
        this.dungeonInv = [];
        this.restCount = 0;
        this.depth = this.persistent.maxDepth;
        
        this.createGrid();
        this.placeMines();
        this.placeItems();
        this.placeExit();
        this.calcNumbers();
        
        this.renderDungeon();
        this.log('潜入深渊层级 ' + this.depth);
        this.saveData();
    }
    
    createGrid() {
        this.grid = Array(this.GRID_SIZE).fill(null).map((_, y) =>
            Array(this.GRID_SIZE).fill(null).map((_, x) => ({
                x, y, isMine: false, isRevealed: false, isFlagged: false, number: 0, item: null, isExit: false
            }))
        );
    }
    
    placeMines() {
        let placed = 0;
        while (placed < this.MINE_COUNT) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            if (!this.grid[y][x].isMine && !(x === 0 && y === 0)) {
                this.grid[y][x].isMine = true;
                placed++;
            }
        }
    }
    
    placeItems() {
        const keys = Object.keys(this.itemTypes);
        for (let i = 0; i < 8; i++) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            const cell = this.grid[y][x];
            if (!cell.isMine && !cell.item && !cell.isExit) {
                const key = keys[Math.floor(Math.random() * keys.length)];
                cell.item = { type: key, ...this.itemTypes[key] };
            }
        }
    }
    
    placeExit() {
        let placed = false;
        while (!placed) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            if (!this.grid[y][x].isMine && !this.grid[y][x].item && x > 6 && y > 6) {
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
                    <button onclick="game.quitDive()">⬅️ 放弃</button>
                    <span>🕳️ 层级 ${this.depth} | 🛏️ ${this.MAX_REST - this.restCount}</span>
                    <span>🧠 ${this.sanity} | 📦 ${this.getWeight()}/10</span>
                </header>
                <div id="minefield"></div>
                <div id="dung-inv"><h4>背包</h4><div id="inv-grid"></div></div>
                <div id="log"></div>
                <footer>
                    <button onclick="game.setMode('explore')" id="btn-explore" class="active">探索</button>
                    <button onclick="game.setMode('flag')" id="btn-flag">标记</button>
                    <button onclick="game.rest()">休息(+15)</button>
                    <button onclick="game.extract()" id="btn-extract" class="hidden primary">🚪 撤离</button>
                </footer>
            </div>`;
        
        const mf = document.getElementById('minefield');
        mf.style.display = 'grid';
        mf.style.gridTemplateColumns = `repeat(${this.GRID_SIZE}, 40px)`;
        
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.onclick = () => this.clickCell(x, y);
                cell.oncontextmenu = (e) => { e.preventDefault(); this.flagCell(x, y); };
                mf.appendChild(cell);
            }
        }
        this.updateGrid();
    }
    
    updateGrid() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                const div = document.querySelector(`#minefield .cell[data-x="${x}"][data-y="${y}"]`);
                if (!div) continue;
                
                div.className = 'cell';
                div.textContent = '';
                
                if (cell.isRevealed) {
                    div.classList.add('revealed');
                    if (cell.isMine) { div.classList.add('mine'); div.textContent = '💀'; }
                    else if (cell.isExit) { div.classList.add('exit'); div.textContent = '🚪'; }
                    else if (cell.number > 0) { div.textContent = cell.number; }
                } else if (cell.isFlagged) {
                    div.classList.add('flagged');
                    div.textContent = '🚩';
                }
            }
        }
        this.updateInv();
    }
    
    updateInv() {
        const grid = document.getElementById('inv-grid');
        if (grid) {
            grid.innerHTML = this.dungeonInv.map((item, i) => 
                `<div class="slot" onclick="game.useItem(${i})" title="${item.name}">${item.icon}</div>`
            ).join('');
        }
    }
    
    getWeight() {
        return this.dungeonInv.reduce((s, i) => s + i.weight, 0).toFixed(1);
    }
    
    clickCell(x, y) {
        if (this.state !== 'dungeon') return;
        const cell = this.grid[y][x];
        if (cell.isRevealed || cell.isFlagged) return;
        
        cell.isRevealed = true;
        
        if (cell.isMine) {
            this.sanity -= 25;
            this.log('💀 触发陷阱！理智-25', 'bad');
            if (this.sanity <= 0) { this.gameOver(); return; }
        } else {
            if (cell.isExit) {
                document.getElementById('btn-extract').classList.remove('hidden');
                this.log('🚪 发现撤离点！');
            }
            if (cell.item) {
                const w = parseFloat(this.getWeight());
                if (w + cell.item.weight <= 10) {
                    this.dungeonInv.push(cell.item);
                    this.log(`✅ 获得 ${cell.item.name}`);
                    if (cell.item.cursed) { this.sanity -= 5; this.log('😈 诅咒侵蚀理智', 'bad'); }
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
                            setTimeout(() => this.clickCell(nx, ny), 30);
                        }
                    }
                }
            }
        }
        
        this.updateGrid();
    }
    
    flagCell(x, y) {
        const cell = this.grid[y][x];
        if (!cell.isRevealed) {
            cell.isFlagged = !cell.isFlagged;
            this.updateGrid();
        }
    }
    
    setMode(m) {
        this.mode = m;
        document.getElementById('btn-explore').classList.toggle('active', m === 'explore');
        document.getElementById('btn-flag').classList.toggle('active', m === 'flag');
    }
    
    rest() {
        if (this.restCount >= this.MAX_REST) {
            this.log('⚠️ 无法继续休息', 'bad');
            return;
        }
        this.restCount++;
        this.sanity = Math.min(100, this.sanity + 15);
        this.log(`🛏️ 休息恢复 (剩余${this.MAX_REST - this.restCount}次)`);
        this.updateGrid();
    }
    
    useItem(i) {
        const item = this.dungeonInv[i];
        if (item.consumable) {
            if (item.type === 'medkit') {
                this.sanity = Math.min(100, this.sanity + 30);
                this.log('💊 理智+30');
            }
            this.dungeonInv.splice(i, 1);
            this.updateGrid();
        }
    }
    
    extract() {
        const value = this.dungeonInv.reduce((s, i) => s + i.value, 0);
        this.persistent.vault.push(...this.dungeonInv);
        this.persistent.gold += Math.floor(value * 0.5);
        this.persistent.extracts++;
        if (this.depth === this.persistent.maxDepth) this.persistent.maxDepth++;
        this.saveData();
        
        const stats = `💰 +${Math.floor(value * 0.5)}金币, 📦 ${this.dungeonInv.length}件物品`;
        alert('成功撤离！\n' + stats);
        this.showTavern();
    }
    
    quitDive() {
        if (confirm('放弃探索？物品将丢失！')) {
            this.dungeonInv = [];
            this.showTavern();
        }
    }
    
    gameOver() {
        this.dungeonInv = [];
        this.saveData();
        alert('理智崩溃...你在深渊中迷失了');
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

window.onload = () => { window.game = new DS01Game(); };
