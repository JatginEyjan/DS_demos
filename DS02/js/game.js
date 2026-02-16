/**
 * DS02 - 死亡即进度 (Death is Progress)
 * 融合《黑暗之魂》死亡哲学 + DS01扫雷基底
 * 核心机制：死亡保留情报、死亡地点生成特殊内容、累积死亡解锁新维度
 */

class DS02Game {
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
        
        // DS02核心：死亡系统
        this.persistent = this.loadData();
        this.currentRunDeaths = []; // 本次探索的死亡记录
        
        this.itemTypes = {
            fossil: { name: '未知化石', icon: '🦴', value: 10, weight: 1 },
            idol: { name: '诡异神像', icon: '🗿', value: 50, weight: 2, cursed: true },
            manuscript: { name: '古老手稿', icon: '📜', value: 30, weight: 0.5 },
            relic: { name: '深渊遗物', icon: '💎', value: 100, weight: 3, cursed: true },
            medkit: { name: '理智药剂', icon: '🧪', value: 20, weight: 0.5, consumable: true, effect: 'heal' },
            tool: { name: '探测工具', icon: '🔧', value: 5, weight: 0.5, consumable: true, effect: 'scan' },
            // DS02新物品
            soul_ash: { name: '灰烬余魂', icon: '⚱️', value: 0, weight: 0, special: 'death_memories', desc: '承载死亡记忆的灰烬' },
            grave_moss: { name: '墓碑苔藓', icon: '🌿', value: 15, weight: 0.3, desc: '生长在死亡之地的发光苔藓' },
            echo_stone: { name: '回声石', icon: '🔮', value: 80, weight: 1, special: 'reveal_area', desc: '记录过去的声音' }
        };
        
        this.init();
    }
    
    loadData() {
        const defaultData = { 
            vault: [], gold: 0, dives: 0, extracts: 0, maxDepth: 1,
            // DS02核心：跨局死亡数据
            deathMarkers: {}, // 每层级的死亡位置 {depth: [{x,y,turn,loot}]}
            revealedMemory: {}, // 永久保留的已揭示格子 {depth: Set("x,y")}
            totalDeaths: 0,
            unlockedKnowledge: [], // 解锁的古神知识
            previousRuns: [] // 上一局的尸体可回收
        };
        try {
            const saved = localStorage.getItem('DS02_save');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }
    
    saveData() {
        localStorage.setItem('DS02_save', JSON.stringify(this.persistent));
    }
    
    showTavern() {
        this.state = 'tavern';
        const deathBonus = Math.min(5, Math.floor(this.persistent.totalDeaths / 3));
        
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="tavern">
                <header>
                    <h1>☠️ 灰烬酒馆</h1>
                    <div class="stats">
                        <span>💰 ${this.persistent.gold}</span>
                        <span>⚰️ 累计死亡: ${this.persistent.totalDeaths}</span>
                        ${deathBonus > 0 ? `<span class="bonus">+${deathBonus} 死亡认知</span>` : ''}
                    </div>
                </header>
                <div class="death-info">
                    <p>🕯️ 死亡不是终点，而是更深的理解</p>
                    <p>📜 已保留 ${Object.values(this.persistent.revealedMemory).flatMap(s => [...s]).length} 格地图记忆</p>
                    ${this.persistent.previousRuns.length > 0 ? `<p>💀 可回收 ${this.persistent.previousRuns.length} 具遗体</p>` : ''}
                </div>
                <div class="tavern-actions">
                    <button id="dive-btn" class="primary">🕳️ 潜入深渊 (层级 ${this.persistent.maxDepth})</button>
                    <button id="lore-btn">📜 死亡认知</button>
                    <button id="delete-btn">🗑️ 遗忘一切</button>
                </div>
            </div>`;
        
        document.getElementById('dive-btn').onclick = () => this.startDive();
        document.getElementById('lore-btn').onclick = () => this.showLore();
        document.getElementById('delete-btn').onclick = () => this.deleteSave();
    }
    
    showLore() {
        const knowledge = this.persistent.unlockedKnowledge;
        const deaths = this.persistent.totalDeaths;
        let content = '<h2>死亡赋予的认知</h2>';
        
        if (deaths >= 1) content += '<p>💀 死亡1次：你意识到痛苦会留下痕迹</p>';
        if (deaths >= 3) content += '<p>☠️ 死亡3次：你开始听见死者的低语</p>';
        if (deaths >= 5) content += '<p>⚰️ 死亡5次：死亡地点会长出特殊的...东西</p>';
        if (deaths >= 10) content += '<p>🕯️ 死亡10次：你分不清自己是生者还是死者</p>';
        if (deaths >= 20) content += '<p>👁️ 死亡20次：深渊开始记住你的样子</p>';
        
        if (knowledge.length > 0) {
            content += '<h3>获得的古神知识</h3>';
            knowledge.forEach(k => content += `<p>• ${k}</p>`);
        }
        
        alert(content.replace(/<p>/g, '\n').replace(/<\/p>/g, '').replace(/<h[23]>/g, '\n').replace(/<\/h[23]>/g, ''));
    }
    
    deleteSave() {
        if (confirm('遗忘所有死亡？这将清空一切进度。')) {
            localStorage.removeItem('DS02_save');
            this.persistent = this.loadData();
            this.showTavern();
        }
    }
    
    startDive() {
        this.state = 'dungeon';
        this.persistent.dives++;
        this.sanity = 100 + Math.min(20, this.persistent.totalDeaths * 2); // 死亡越多初始理智越高
        this.dungeonInv = [];
        this.restCount = 0;
        this.depth = this.persistent.maxDepth;
        this.currentRunDeaths = [];
        
        this.createGrid();
        this.placeMines();
        this.placeItems();
        this.placeExit();
        this.placeDeathMarkers(); // DS02：放置死亡标记
        this.calcNumbers();
        this.applyRevealedMemory(); // DS02：应用保留的地图记忆
        
        this.renderDungeon();
        this.log(`潜入层级 ${this.depth}... 已死亡 ${this.persistent.totalDeaths} 次的你，带着记忆归来`, 'system');
        this.revealFirstSafeCell();
    }
    
    // DS02核心：在死亡位置放置特殊内容
    placeDeathMarkers() {
        const markers = this.persistent.deathMarkers[this.depth] || [];
        markers.forEach((death, idx) => {
            const cell = this.grid[death.y][death.x];
            if (!cell.isMine && !cell.isExit) {
                cell.isGrave = true;
                cell.graveId = idx;
                cell.graveLoot = death.loot || ['soul_ash'];
                cell.number = 0; // 墓碑不显示数字
            }
        });
    }
    
    // DS02核心：应用之前保留的地图记忆
    applyRevealedMemory() {
        const memory = this.persistent.revealedMemory[this.depth];
        if (memory) {
            memory.forEach(key => {
                const [x, y] = key.split(',').map(Number);
                if (this.grid[y] && this.grid[y][x]) {
                    this.grid[y][x].wasRevealedBefore = true;
                }
            });
        }
    }
    
    createGrid() {
        this.grid = Array(this.GRID_SIZE).fill(null).map((_, y) =>
            Array(this.GRID_SIZE).fill(null).map((_, x) => ({
                x, y, isMine: false, isRevealed: false, isFlagged: false,
                number: 0, item: null, isExit: false,
                // DS02新属性
                isGrave: false, graveId: null, graveLoot: null,
                wasRevealedBefore: false
            }))
        );
    }
    
    placeMines() {
        let placed = 0;
        while (placed < this.MINE_COUNT) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            if (!this.grid[y][x].isMine && !(x < 3 && y < 3)) {
                this.grid[y][x].isMine = true;
                placed++;
            }
        }
    }
    
    placeItems() {
        const keys = Object.keys(this.itemTypes).filter(k => !this.itemTypes[k].special);
        for (let i = 0; i < 6; i++) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            const cell = this.grid[y][x];
            if (!cell.isMine && !cell.item && !cell.isExit && !cell.isGrave) {
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
            if (!this.grid[y][x].isMine && !this.grid[y][x].item && !this.grid[y][x].isGrave && x > 6 && y > 6) {
                this.grid[y][x].isExit = true;
                placed = true;
            }
        }
    }
    
    calcNumbers() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (!this.grid[y][x].isMine && !this.grid[y][x].isGrave) {
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
        const memoryCount = this.persistent.revealedMemory[this.depth] ? 
            this.persistent.revealedMemory[this.depth].size : 0;
        
        c.innerHTML = `
            <div id="dungeon">
                <header>
                    <button onclick="game.quitDive()">⬅️ 放弃</button>
                    <div class="dungeon-info">
                        <span>🕳️ 层级 ${this.depth}</span>
                        <span>🛏️ ${this.MAX_REST - this.restCount}</span>
                        <span class="memory">🧠 记忆:${memoryCount}格</span>
                    </div>
                    <div class="stats-bars">
                        <div class="stat-bar">
                            <span>🧠</span>
                            <div class="bar"><div id="sanity-fill" style="width:100%"></div></div>
                            <span id="sanity-text">${this.sanity}/100</span>
                        </div>
                        <div class="stat-bar">
                            <span>📦</span>
                            <span id="weight-text">0/10</span>
                        </div>
                    </div>
                </header>
                <div id="minefield"></div>
                <div id="dung-inv"><h4>背包</h4><div id="inv-grid"></div></div>
                <div id="grave-info"></div>
                <div id="log"></div>
                <footer>
                    <button onclick="game.setMode('explore')" id="btn-explore" class="active">🔍 探索</button>
                    <button onclick="game.setMode('flag')" id="btn-flag">🚩 标记</button>
                    <button onclick="game.rest()">🛏️ 休息(+15)</button>
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
        const sanityFill = document.getElementById('sanity-fill');
        const sanityText = document.getElementById('sanity-text');
        if (sanityFill && sanityText) {
            const pct = Math.max(0, this.sanity);
            sanityFill.style.width = (pct / 100 * 100) + '%';
            sanityFill.className = pct < 30 ? 'low' : pct < 60 ? 'med' : '';
            sanityText.textContent = `${Math.floor(this.sanity)}/${100 + Math.min(20, this.persistent.totalDeaths * 2)}`;
        }
        
        const weightText = document.getElementById('weight-text');
        if (weightText) {
            const w = this.dungeonInv.reduce((s, i) => s + i.weight, 0);
            weightText.textContent = `${w.toFixed(1)}/10`;
        }
        
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                const div = document.querySelector(`#minefield .cell[data-x="${x}"][data-y="${y}"]`);
                if (!div) continue;
                
                div.className = 'cell';
                div.textContent = '';
                
                // DS02：显示记忆痕迹
                if (cell.wasRevealedBefore && !cell.isRevealed) {
                    div.classList.add('memory-hint');
                    div.style.opacity = '0.5';
                }
                
                if (cell.isRevealed) {
                    div.classList.add('revealed');
                    if (cell.isMine) { div.classList.add('mine'); div.textContent = '💀'; }
                    else if (cell.isGrave) { 
                        div.classList.add('grave'); 
                        div.textContent = '⚱️';
                        div.onclick = () => this.lootGrave(x, y);
                    }
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
    
    // DS02：掠夺墓碑
    lootGrave(x, y) {
        const cell = this.grid[y][x];
        if (!cell.isGrave || cell.looted) return;
        
        cell.looted = true;
        const loot = cell.graveLoot || ['soul_ash'];
        
        loot.forEach(itemType => {
            const item = { type: itemType, ...this.itemTypes[itemType] };
            const w = this.dungeonInv.reduce((s, i) => s + i.weight, 0);
            if (w + item.weight <= 10) {
                this.dungeonInv.push(item);
                this.log(`⚱️ 从墓碑中获得 ${item.name}`, 'special');
            }
        });
        
        this.sanity -= 10; // 亵渎死者损失理智
        this.log('😈 亵渎死者的安宁...理智-10', 'bad');
        this.updateGrid();
    }
    
    updateInv() {
        const grid = document.getElementById('inv-grid');
        if (grid) {
            grid.innerHTML = this.dungeonInv.map((item, i) => 
                `<div class="slot ${item.cursed ? 'cursed' : ''} ${item.special ? 'special' : ''}" 
                      onclick="game.useItem(${i})" title="${item.name}: ${item.desc}">${item.icon}</div>`
            ).join('');
        }
    }
    
    clickCell(x, y) {
        if (this.state !== 'dungeon') return;
        if (this.mode === 'flag') {
            this.flagCell(x, y);
            return;
        }
        
        const cell = this.grid[y][x];
        if (cell.isRevealed || cell.isFlagged) return;
        
        cell.isRevealed = true;
        
        // DS02：记录到永久记忆
        if (!this.persistent.revealedMemory[this.depth]) {
            this.persistent.revealedMemory[this.depth] = new Set();
        }
        this.persistent.revealedMemory[this.depth].add(`${x},${y}`);
        
        if (cell.isMine) {
            this.triggerDeath(x, y);
            return;
        }
        
        if (cell.isExit) {
            document.getElementById('btn-extract').classList.remove('hidden');
            this.log('🚪 发现撤离点！');
        }
        if (cell.item) {
            const w = this.dungeonInv.reduce((s, i) => s + i.weight, 0);
            if (w + cell.item.weight <= 10) {
                this.dungeonInv.push(cell.item);
                this.log(`✅ 获得 ${cell.item.name}`);
                if (cell.item.cursed) { this.sanity -= 5; this.log('😈 诅咒侵蚀理智', 'bad'); }
            } else {
                this.log('⚠️ 负重已满！', 'bad');
            }
            cell.item = null;
        }
        if (cell.number === 0 && !cell.isGrave) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < this.GRID_SIZE && nx >= 0 && nx < this.GRID_SIZE) {
                        setTimeout(() => this.clickCell(nx, ny), 30);
                    }
                }
            }
        }
        
        this.updateGrid();
    }
    
    // DS02核心：死亡处理
    triggerDeath(x, y) {
        this.sanity = 0;
        this.persistent.totalDeaths++;
        
        // 记录死亡位置
        if (!this.persistent.deathMarkers[this.depth]) {
            this.persistent.deathMarkers[this.depth] = [];
        }
        
        const deathLoot = this.dungeonInv.map(i => i.type).filter(t => t !== 'soul_ash');
        this.persistent.deathMarkers[this.depth].push({
            x, y, turn: Date.now(),
            loot: deathLoot.length > 0 ? deathLoot : ['soul_ash']
        });
        
        // 保存当前尸体供下局回收
        this.persistent.previousRuns = [...this.dungeonInv];
        
        // 根据死亡次数解锁知识
        if (this.persistent.totalDeaths === 1) {
            this.persistent.unlockedKnowledge.push('死亡会留下痕迹');
        } else if (this.persistent.totalDeaths === 3) {
            this.persistent.unlockedKnowledge.push('死者的声音可以被听见');
        } else if (this.persistent.totalDeaths === 5) {
            this.persistent.unlockedKnowledge.push('墓碑下藏着秘密');
        }
        
        this.saveData();
        
        const msg = `💀 你死在了 (${x}, ${y})\n\n但这不是结束...\n你的尸体将成为下一位探险家的路标（或诱饵）\n\n累计死亡: ${this.persistent.totalDeaths}`;
        alert(msg);
        
        this.dungeonInv = [];
        this.showTavern();
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
        this.sanity = Math.min(120, this.sanity + 15);
        this.log(`🛏️ 休息恢复 (剩余${this.MAX_REST - this.restCount}次)`);
        this.updateGrid();
    }
    
    useItem(i) {
        const item = this.dungeonInv[i];
        if (item.consumable) {
            if (item.type === 'medkit') {
                this.sanity = Math.min(120, this.sanity + 30);
                this.log('💊 理智+30');
            }
            this.dungeonInv.splice(i, 1);
            this.updateGrid();
        } else if (item.special === 'reveal_area') {
            // 回声石：揭示周围5x5
            this.log('🔮 回声石激活...过去的景象浮现');
            // 实现揭示逻辑...
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
        
        const deathBonus = this.persistent.totalDeaths > 0 ? 
            `\n💀 死亡认知加成: +${Math.min(5, Math.floor(this.persistent.totalDeaths / 3))} 初始理智` : '';
        
        alert(`成功撤离！\n💰 +${Math.floor(value * 0.5)}金币\n📦 ${this.dungeonInv.length}件物品${deathBonus}`);
        this.showTavern();
    }
    
    quitDive() {
        if (confirm('放弃探索？死亡的记忆不会保留。')) {
            this.dungeonInv = [];
            this.showTavern();
        }
    }
    
    revealFirstSafeCell() {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (!this.grid[y][x].isMine) {
                    setTimeout(() => this.clickCell(x, y), 300);
                    return;
                }
            }
        }
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

window.onload = () => { window.game = new DS02Game(); };
