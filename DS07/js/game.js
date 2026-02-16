/**
 * DS07 - 你就是地牢 (You Are The Dungeon)
 * 终极融合：你的死亡定义了地牢本身
 * 每次死亡留下尸体 → 尸体成为下一局的特殊格子 → 最终面对"自己"
 */

class DS07Game {
    constructor() {
        this.GRID_SIZE = 12;
        this.MINE_COUNT = 15;
        
        this.state = 'tavern';
        this.mode = 'explore';
        
        this.grid = [];
        this.sanity = 100;
        this.dungeonInv = [];
        this.depth = 1;
        
        // DS07核心：玩家即地牢
        this.persistent = this.loadData();
        
        // 亵渎/祭祀计数
        this.currentRunDesecrated = 0;
        this.currentRunHonored = 0;
        
        // Boss战状态
        this.bossPhase = false;
        this.bossHealth = 0;
        
        this.init();
    }
    
    loadData() {
        const defaultData = {
            vault: [], gold: 0, dives: 0, extracts: 0, maxDepth: 1,
            // 尸体系统
            corpses: [], // {x, y, depth, items, honored, desecrated}
            totalDeaths: 0,
            // 道德倾向
            desecrationCount: 0,
            honorCount: 0,
            // 最终Boss解锁
            bossUnlocked: false,
            bossDefeated: false
        };
        try {
            const saved = localStorage.getItem('DS07_save');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }
    
    saveData() {
        localStorage.setItem('DS07_save', JSON.stringify(this.persistent));
    }
    
    showTavern() {
        this.state = 'tavern';
        const morality = this.persistent.desecrationCount - this.persistent.honorCount;
        
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="tavern">
                <header>
                    <h1>${morality > 5 ? '👁️ 亵渎者' : morality < -5 ? '✨ 守墓人' : '🏛️ 徘徊者'}之馆</h1>
                    <div class="stats">
                        <span>💰 ${this.persistent.gold}</span>
                        <span>⚰️ 尸体: ${this.persistent.corpses.length}</span>
                        <span>💀 死亡: ${this.persistent.totalDeaths}</span>
                    </div>
                </header>
                
                <div class="morality-display">
                    <h3>你的本质</h3>
                    <div class="morality-bar">
                        <div class="honor-side" style="width: ${Math.max(0, 50 - morality * 5)}%"></div>
                        <div class="balance">⚖️</div>
                        <div class="desecrate-side" style="width: ${Math.max(0, 50 + morality * 5)}%"></div>
                    </div>
                    <p>${this.getMoralityText(morality)}</p>
                </div>
                
                <div class="corpse-list">
                    <h3>深渊中的你 (${this.persistent.corpses.length})</h3>
                    ${this.persistent.corpses.map((corpse, i) => `
                        <div class="corpse-entry ${corpse.honored ? 'honored' : corpse.desecrated ? 'desecrated' : ''}">
                            <span>层级 ${corpse.depth} 的尸骸</span>
                            <span>${corpse.items.length} 件遗物</span>
                            ${!corpse.honored && !corpse.desecrated ? '<span class="pending">⚠️ 未处理</span>' : ''}
                        </div>
                    `).join('') || '<p class="no-corpses">你还没有死过...但这只是时间问题</p>'}
                </div>
                
                ${this.persistent.bossUnlocked ? `
                    <div class="boss-warning">
                        ⚠️ 最终Boss已觉醒！<br>
                        你的所有死亡汇聚成了一个存在...<br>
                        它在第${this.persistent.maxDepth + 1}层等你
                    </div>
                ` : ''}
                
                <div class="tavern-actions">
                    <button onclick="game.startDive()" class="primary">
                        ${this.persistent.bossUnlocked ? '⚔️ 面对自己' : '🕳️ 潜入深渊'}
                    </button>
                    <button onclick="game.deleteSave()">🗑️ 轮回重置</button>
                </div>
            </div>`;
    }
    
    getMoralityText(morality) {
        if (morality > 10) return '深渊视你为同类，疯狂是你的力量';
        if (morality > 5) return '你在亵渎中获得快感';
        if (morality > -5) return '你在平衡中徘徊';
        if (morality > -10) return '你尊重死者，获得安宁';
        return '你净化了深渊，但代价是什么？';
    }
    
    deleteSave() {
        if (confirm('重置轮回？所有尸体将被遗忘。')) {
            localStorage.removeItem('DS07_save');
            this.persistent = this.loadData();
            this.showTavern();
        }
    }
    
    startDive() {
        this.state = 'dungeon';
        this.persistent.dives++;
        this.sanity = 100;
        this.dungeonInv = [];
        this.depth = this.persistent.maxDepth;
        this.currentRunDesecrated = 0;
        this.currentRunHonored = 0;
        
        // 检查是否Boss战
        if (this.persistent.bossUnlocked && this.depth > this.persistent.maxDepth) {
            this.startBossFight();
            return;
        }
        
        this.createGrid();
        this.placeMines();
        this.placeItems();
        this.placeExit();
        this.placeCorpses(); // DS07核心：放置尸体
        this.calcNumbers();
        
        this.renderDungeon();
        this.log(`${this.persistent.corpses.length > 0 ? '你的尸体在深处等待...' : '这是你的第一次死亡...还不是时候'}`, 'system');
        this.revealFirstSafeCell();
    }
    
    placeCorpses() {
        // 将保存的尸体放置到地图
        this.persistent.corpses.forEach(corpse => {
            if (corpse.depth === this.depth) {
                let placed = false;
                while (!placed) {
                    const x = Math.floor(Math.random() * this.GRID_SIZE);
                    const y = Math.floor(Math.random() * this.GRID_SIZE);
                    const cell = this.grid[y][x];
                    if (!cell.isMine && !cell.isExit && !cell.corpse) {
                        cell.corpse = corpse;
                        placed = true;
                    }
                }
            }
        });
    }
    
    createGrid() {
        this.grid = Array(this.GRID_SIZE).fill(null).map((_, y) =>
            Array(this.GRID_SIZE).fill(null).map((_, x) => ({
                x, y, isMine: false, isRevealed: false, isFlagged: false,
                number: 0, item: null, isExit: false,
                corpse: null // DS07：尸体
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
        const items = [
            { name: '遗物', icon: '💎', value: 100 },
            { name: '手稿', icon: '📜', value: 30 },
            { name: '神像', icon: '🗿', value: 50, cursed: true }
        ];
        for (let i = 0; i < 5; i++) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            const cell = this.grid[y][x];
            if (!cell.isMine && !cell.item && !cell.isExit && !cell.corpse) {
                cell.item = items[Math.floor(Math.random() * items.length)];
            }
        }
    }
    
    placeExit() {
        let placed = false;
        while (!placed) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            if (!this.grid[y][x].isMine && !this.grid[y][x].item && !this.grid[y][x].corpse) {
                this.grid[y][x].isExit = true;
                placed = true;
            }
        }
    }
    
    calcNumbers() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (!this.grid[y][x].isMine && !this.grid[y][x].corpse) {
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
                    <button onclick="game.quitDive()">⬅️ 撤退</button>
                    <span>🕳️ 层级 ${this.depth} ${this.bossPhase ? '- BOSS战' : ''}</span>
                    <div class="dungeon-stats">
                        <span>🧠 ${this.sanity}</span>
                        ${this.bossPhase ? `<span>👁️ Boss: ${this.bossHealth}</span>` : ''}
                    </div>
                </header>
                
                ${this.bossPhase ? `
                    <div class="boss-info">
                        <p>面对你自己的累积...</p>
                        <p>每次揭示格子都会对Boss造成伤害</p>
                    </div>
                ` : ''}
                
                <div id="minefield"></div>
                
                ${!this.bossPhase ? `
                    <div class="corpse-actions">
                        <p>遇到尸体时，你可以选择:</p>
                        <span>✨ 祭祀 - 获得祝福 (+理智)</span>
                        <span>😈 亵渎 - 获得力量 (+揭示格数)</span>
                    </div>
                ` : ''}
                
                <div id="log"></div>
                <footer>
                    <button onclick="game.setMode('explore')" id="btn-explore" class="active">🔍 探索</button>
                    <button onclick="game.setMode('flag')" id="btn-flag">🚩 标记</button>
                    ${!this.bossPhase ? `<button onclick="game.extract()" id="btn-extract" class="hidden primary">🚪 撤离</button>` : ''}
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
                mf.appendChild(cell);
            }
        }
        this.updateGrid();
    }
    
    startBossFight() {
        this.bossPhase = true;
        this.bossHealth = this.persistent.totalDeaths * 10; // 死亡越多Boss越强
        
        // Boss战特殊地图 - 全是隐藏，需要逐一揭示攻击Boss
        this.createGrid();
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                this.grid[y][x].isBossCell = true;
            }
        }
        
        this.renderDungeon();
        alert(`👁️ BOSS战开始！\n\n"你就是地牢"的化身出现了\n它拥有 ${this.bossHealth} 点生命\n每次揭示格子都会对它造成伤害\n全部揭示即可击败它！`);
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
                
                if (cell.corpse) {
                    div.classList.add('has-corpse');
                    if (!cell.corpseRevealed) {
                        div.classList.add('corpse-hidden');
                    }
                }
                
                if (cell.isRevealed) {
                    div.classList.add('revealed');
                    if (cell.isMine) { div.classList.add('mine'); div.textContent = '💀'; }
                    else if (cell.isExit) { div.classList.add('exit'); div.textContent = '🚪'; }
                    else if (cell.number > 0) { div.textContent = cell.number; }
                    
                    if (cell.corpse) {
                        div.classList.add('corpse-revealed');
                        div.innerHTML = '⚰️';
                        if (!cell.corpseActionTaken) {
                            this.showCorpseChoice(x, y);
                        }
                    }
                } else if (cell.isFlagged) {
                    div.classList.add('flagged');
                    div.textContent = '🚩';
                }
            }
        }
    }
    
    showCorpseChoice(x, y) {
        const cell = this.grid[y][x];
        if (cell.corpseActionTaken) return;
        
        const choice = confirm(
            `发现了你之前的尸体（层级 ${cell.corpse.depth}）\n\n` +
            `✨ 祭祀 - 恢复20理智，尊重死者\n` +
            `😈 亵渎 - 立即揭示周围3x3，但损失15理智\n\n` +
            `点击"确定"选择祭祀，"取消"选择亵渎`
        );
        
        cell.corpseActionTaken = true;
        
        if (choice) {
            // 祭祀
            this.sanity = Math.min(120, this.sanity + 20);
            cell.corpse.honored = true;
            this.persistent.honCount++;
            this.log('✨ 你祭祀了过去的自己，获得安宁', 'good');
        } else {
            // 亵渎
            this.sanity -= 15;
            cell.corpse.desecrated = true;
            this.persistent.desecrationCount++;
            this.revealArea(x, y, 1);
            this.log('😈 你亵渎了尸体，获得力量但失去人性', 'bad');
        }
        
        this.saveData();
        this.updateGrid();
    }
    
    clickCell(x, y) {
        if (this.state !== 'dungeon') return;
        
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;
        
        cell.isRevealed = true;
        
        // Boss战模式
        if (this.bossPhase) {
            this.bossHealth--;
            this.log(`👁️ 你对Boss造成了伤害！剩余: ${this.bossHealth}`);
            if (this.bossHealth <= 0) {
                this.bossDefeated();
            }
            this.updateGrid();
            return;
        }
        
        if (cell.isMine) {
            this.triggerDeath(x, y);
            return;
        }
        
        if (cell.isExit) {
            document.getElementById('btn-extract').classList.remove('hidden');
            this.log('🚪 发现撤离点！');
        }
        if (cell.item) {
            this.dungeonInv.push(cell.item);
            this.log(`✅ 获得 ${cell.item.name}`);
            cell.item = null;
        }
        if (cell.number === 0 && !cell.corpse) {
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
    
    revealArea(cx, cy, radius) {
        for (let y = Math.max(0, cy - radius); y <= Math.min(this.GRID_SIZE - 1, cy + radius); y++) {
            for (let x = Math.max(0, cx - radius); x <= Math.min(this.GRID_SIZE - 1, cx + radius); x++) {
                if (!this.grid[y][x].isRevealed) {
                    this.grid[y][x].isRevealed = true;
                }
            }
        }
    }
    
    triggerDeath(x, y) {
        this.sanity = 0;
        this.persistent.totalDeaths++;
        
        // 添加新尸体
        this.persistent.corpses.push({
            x, y, depth: this.depth,
            items: [...this.dungeonInv],
            honored: false,
            desecrated: false
        });
        
        // 检查Boss解锁
        if (this.persistent.totalDeaths >= 5 && !this.persistent.bossUnlocked) {
            this.persistent.bossUnlocked = true;
            this.persistent.maxDepth++;
        }
        
        this.saveData();
        
        alert(`💀 你死在了层级 ${this.depth}\n\n你的尸体将成为地牢的一部分...\n累计死亡: ${this.persistent.totalDeaths}${this.persistent.bossUnlocked ? '\n\n👁️ Boss已觉醒！' : ''}`);
        
        this.bossPhase = false;
        this.showTavern();
    }
    
    bossDefeated() {
        this.persistent.bossDefeated = true;
        this.saveData();
        alert(`🎉 你击败了自己！\n\n所有的死亡、所有的选择、所有的悔恨...\n你终于与之和解。\n\n真结局解锁：轮回终结`);
        this.showTavern();
    }
    
    setMode(m) {
        this.mode = m;
        document.getElementById('btn-explore').classList.toggle('active', m === 'explore');
        document.getElementById('btn-flag').classList.toggle('active', m === 'flag');
    }
    
    flagCell(x, y) {
        const cell = this.grid[y][x];
        if (!cell.isRevealed) {
            cell.isFlagged = !cell.isFlagged;
            this.updateGrid();
        }
    }
    
    extract() {
        const value = this.dungeonInv.reduce((s, i) => s + i.value, 0);
        this.persistent.vault.push(...this.dungeonInv);
        this.persistent.gold += Math.floor(value * 0.5);
        this.persistent.extracts++;
        if (this.depth === this.persistent.maxDepth && !this.persistent.bossUnlocked) {
            this.persistent.maxDepth++;
        }
        this.saveData();
        alert(`成功撤离！\n💰 +${Math.floor(value * 0.5)}金币`);
        this.showTavern();
    }
    
    quitDive() {
        if (confirm('撤退？')) {
            this.bossPhase = false;
            this.showTavern();
        }
    }
    
    revealFirstSafeCell() {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (!this.grid[y][x].isMine && !this.grid[y][x].corpse) {
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
        }
    }
    
    init() {
        this.showTavern();
    }
}

window.onload = () => { window.game = new DS07Game(); };
