/**
 * DS01 - 深渊扫雷 v2.1
 * 扫雷 + 搜打撤 + 克苏鲁 + 酒馆 + NPC对话系统
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
        this.maxSanity = 100;
        this.dungeonInv = [];
        this.restCount = 0;
        this.depth = 1;
        
        this.persistent = this.loadData();
        
        // NPC对话配置系统
        this.npcDialogueConfig = {
            mysterious_merchant: {
                name: '神秘商人',
                icon: '🧙‍♂️',
                affinity: 0,
                dialogues: {
                    first: ['我在深渊中看到了...许多眼睛。', '你是新来的？小心别相信那些数字。'],
                    normal: ['有好货就拿来，我出公道价。', '昨天有人卖给我一个...不该存在的东西。', '金币比理智可靠，相信我。'],
                    highAffinity: ['老朋友，给你看个稀罕货。', '我信任你，这是内部消息：第三层有大家伙。']
                }
            },
            wounded_explorer: {
                name: '受伤探险家',
                icon: '🤕',
                affinity: 0,
                dialogues: {
                    first: ['别去第三层...别去...', '我看到了门，但门后不是出口...'],
                    normal: ['我的腿...再也下不去了。', '它们还在下面唱歌，你听到了吗？', '帮帮我...或者别像我一样愚蠢。'],
                    highAffinity: ['你救过我的命，给你这个。', '我发现了秘密通道，只告诉你。']
                }
            },
            mad_librarian: {
                name: '疯图书管理员',
                icon: '📚',
                affinity: 0,
                dialogues: {
                    first: ['这些手稿...它们在重写自己！', '知识是有重量的，你背得动吗？'],
                    normal: ['我数过那些格子，数字会撒谎。', '有些书读起来像尖叫。', '你想知道真相？真相也在看着你。'],
                    highAffinity: ['给你看禁书，别告诉其他人。', '我发现了一个模式，每次下潜都会重复...']
                }
            },
            bartender: {
                name: '酒馆老板',
                icon: '🍺',
                affinity: 0,
                dialogues: {
                    first: ['来杯"深渊凝视"？能让你看得更清楚...', '你的眼神，和上次不一样了。'],
                    normal: ['昨天有个人出去后再也没回来。', '休息一下？理智比金币重要。', '我听过很多故事，你的还算正常。'],
                    highAffinity: ['老规矩，给你留最好的位置。', '听说你在下面干得不错，敬你一杯。']
                }
            }
        };
        
        this.itemTypes = {
            fossil: { name: '未知化石', icon: '🦴', value: 10, weight: 1 },
            idol: { name: '诡异神像', icon: '🗿', value: 50, weight: 2, cursed: true },
            manuscript: { name: '古老手稿', icon: '📜', value: 30, weight: 0.5 },
            relic: { name: '深渊遗物', icon: '💎', value: 100, weight: 3, cursed: true },
            medkit: { name: '理智药剂', icon: '🧪', value: 20, weight: 0.5, consumable: true },
            tool: { name: '探测工具', icon: '🔧', value: 5, weight: 0.5, consumable: true }
        };
        
        this.init();
    }
    
    // 存档系统
    loadData() {
        const defaultData = { 
            vault: [], gold: 0, dives: 0, extracts: 0, maxDepth: 1, 
            npcMet: {}, npcAffinity: {}, currentNPCs: [],
            dialogueHistory: {}
        };
        try {
            const saved = localStorage.getItem('DS01_v21');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }
    
    saveData() {
        localStorage.setItem('DS01_v21', JSON.stringify(this.persistent));
    }
    
    deleteSave() {
        if (confirm('删除所有存档？')) {
            localStorage.removeItem('DS01_v21');
            this.persistent = this.loadData();
            this.showTavern();
        }
    }
    
    // NPC刷新机制
    refreshNPCs() {
        const npcKeys = Object.keys(this.npcDialogueConfig);
        const shuffled = npcKeys.sort(() => 0.5 - Math.random());
        this.persistent.currentNPCs = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
        this.saveData();
    }
    
    // 获取NPC对话
    getNPCDialogue(npcKey) {
        const npc = this.npcDialogueConfig[npcKey];
        const met = this.persistent.npcMet[npcKey] || false;
        const affinity = this.persistent.npcAffinity[npcKey] || 0;
        
        let dialoguePool;
        if (!met) {
            dialoguePool = npc.dialogues.first;
            this.persistent.npcMet[npcKey] = true;
        } else if (affinity >= 3) {
            dialoguePool = npc.dialogues.highAffinity;
        } else {
            dialoguePool = npc.dialogues.normal;
        }
        
        const dialogue = dialoguePool[Math.floor(Math.random() * dialoguePool.length)];
        this.saveData();
        return { name: npc.name, icon: npc.icon, dialogue, npcKey };
    }
    
    // 酒馆系统
    showTavern() {
        this.state = 'tavern';
        
        // 如果没有NPC或需要刷新，生成新NPC
        if (!this.persistent.currentNPCs || this.persistent.currentNPCs.length === 0) {
            this.refreshNPCs();
        }
        
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="tavern">
                <header>
                    <h1>🍺 深渊酒馆</h1>
                    <div class="stats">
                        <span>💰 ${this.persistent.gold}</span>
                        <span>🏆 ${this.persistent.extracts}/${this.persistent.dives}</span>
                    </div>
                </header>
                <div class="tavern-main">
                    <div class="vault-section">
                        <h3>🏛️ 仓库 (${this.persistent.vault.length}/20)</h3>
                        <div id="vault-grid"></div>
                    </div>
                    <div class="npc-section">
                        <div class="npc-header">
                            <h3>今晚的客人</h3>
                            <button onclick="game.refreshNPCs(); game.showTavern();" class="small-btn">🔄 刷新</button>
                        </div>
                        <div id="npc-list"></div>
                    </div>
                </div>
                <div class="tavern-actions">
                    <button id="dive-btn" class="primary">🕳️ 潜入深渊</button>
                    <button id="delete-btn">🗑️ 删除存档</button>
                </div>
            </div>
            
            <div id="npc-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="npc-info"></div>
                    <p id="npc-text"></p>
                    <div class="npc-actions">
                        <button onclick="game.giftNPC()">🎁 赠送物品</button>
                        <button onclick="document.getElementById('npc-modal').classList.add('hidden')">👋 离开</button>
                    </div>
                </div>
            </div>`;
        
        this.renderVault();
        this.renderNPCs();
        document.getElementById('dive-btn').onclick = () => this.startDive();
        document.getElementById('delete-btn').onclick = () => this.deleteSave();
    }
    
    renderVault() {
        const grid = document.getElementById('vault-grid');
        if (!grid) return;
        
        grid.innerHTML = this.persistent.vault.map((item, i) => `
            <div class="slot ${item.cursed ? 'cursed' : ''}" onclick="game.sellItem(${i})" title="${item.name} - ${item.desc}">
                ${item.icon}
                <span class="value">${item.value}</span>
            </div>
        `).join('') + '<div class="slot empty"></div>'.repeat(Math.max(0, 20 - this.persistent.vault.length));
    }
    
    renderNPCs() {
        const list = document.getElementById('npc-list');
        if (!list) return;
        
        list.innerHTML = this.persistent.currentNPCs.map(key => {
            const npc = this.npcDialogueConfig[key];
            const affinity = this.persistent.npcAffinity[key] || 0;
            const hearts = '❤️'.repeat(affinity) + '🖤'.repeat(5 - affinity);
            
            return `
                <div class="npc-card" onclick="game.openNPCDialogue('${key}')">
                    <span class="npc-icon">${npc.icon}</span>
                    <div class="npc-details">
                        <span class="npc-name">${npc.name}</span>
                        <span class="affinity">${hearts}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    openNPCDialogue(npcKey) {
        this.currentTalkingNPC = npcKey;
        const data = this.getNPCDialogue(npcKey);
        const modal = document.getElementById('npc-modal');
        
        modal.querySelector('.npc-info').innerHTML = `<h2>${data.icon} ${data.name}</h2>`;
        document.getElementById('npc-text').textContent = data.dialogue;
        modal.classList.remove('hidden');
    }
    
    giftNPC() {
        if (!this.currentTalkingNPC || this.persistent.vault.length === 0) {
            alert('没有可赠送的物品！');
            return;
        }
        
        const item = this.persistent.vault[0];
        this.persistent.vault.shift();
        
        if (!this.persistent.npcAffinity[this.currentTalkingNPC]) {
            this.persistent.npcAffinity[this.currentTalkingNPC] = 0;
        }
        this.persistent.npcAffinity[this.currentTalkingNPC] = 
            Math.min(5, this.persistent.npcAffinity[this.currentTalkingNPC] + 1);
        
        this.saveData();
        alert(`赠送了 ${item.name}，好感度+1！`);
        document.getElementById('npc-modal').classList.add('hidden');
        this.showTavern();
    }
    
    sellItem(i) {
        const item = this.persistent.vault[i];
        if (confirm(`出售 ${item.name} 获得 ${Math.floor(item.value * 0.7)} 金币？`)) {
            this.persistent.gold += Math.floor(item.value * 0.7);
            this.persistent.vault.splice(i, 1);
            this.saveData();
            this.showTavern();
        }
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
        this.log('潜入深渊层级 ' + this.depth, 'system');
        
        // 开局自动开一个安全格子
        this.revealFirstSafeCell();
        
        this.saveData();
    }
    
    revealFirstSafeCell() {
        // 找到(0,0)附近的安全格子
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (!this.grid[y][x].isMine) {
                    setTimeout(() => this.clickCell(x, y), 300);
                    return;
                }
            }
        }
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
            if (!this.grid[y][x].isMine && !(x < 3 && y < 3)) { // 避开起点区域
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
                    <div class="dungeon-info">
                        <span>🕳️ 层级 ${this.depth}</span>
                        <span class="rest-count">🛏️ ${this.MAX_REST - this.restCount}</span>
                    </div>
                    <div class="stats-bars">
                        <div class="stat-bar sanity-bar">
                            <span>🧠</span>
                            <div class="bar"><div id="sanity-fill" style="width:100%"></div></div>
                            <span id="sanity-text">100/100</span>
                        </div>
                        <div class="stat-bar weight-bar">
                            <span>📦</span>
                            <span id="weight-text">0/10</span>
                        </div>
                    </div>
                </header>
                <div id="minefield"></div>
                <div id="dung-inv"><h4>探索背包</h4><div id="inv-grid"></div></div>
                <div id="log"></div>
                <footer>
                    <button onclick="game.setMode('explore')" id="btn-explore" class="active">🔍 探索</button>
                    <button onclick="game.setMode('flag')" id="btn-flag">🚩 标记</button>
                    <button onclick="game.scan()">🔍 扫描(-10)</button>
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
        // 更新理智条
        const sanityFill = document.getElementById('sanity-fill');
        const sanityText = document.getElementById('sanity-text');
        if (sanityFill && sanityText) {
            const pct = Math.max(0, this.sanity);
            sanityFill.style.width = pct + '%';
            sanityFill.className = pct < 30 ? 'low' : pct < 60 ? 'med' : '';
            sanityText.textContent = `${Math.floor(this.sanity)}/${this.maxSanity}`;
        }
        
        // 更新负重
        const weightText = document.getElementById('weight-text');
        if (weightText) {
            const w = this.dungeonInv.reduce((s, i) => s + i.weight, 0);
            weightText.textContent = `${w.toFixed(1)}/10`;
        }
        
        // 更新格子
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
                    else if (cell.number > 0) { 
                        div.classList.add('n' + cell.number);
                        div.textContent = cell.number; 
                    }
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
                `<div class="slot ${item.cursed ? 'cursed' : ''}" onclick="game.useItem(${i})" title="${item.name}">${item.icon}</div>`
            ).join('');
        }
    }
    
    scan() {
        if (this.sanity < 10) {
            this.log('⚠️ 理智不足！', 'bad');
            return;
        }
        
        this.sanity -= 10;
        let revealed = 0;
        
        // 扫描：揭示3个随机安全格子
        const safeCells = [];
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (!this.grid[y][x].isMine && !this.grid[y][x].isRevealed) {
                    safeCells.push({x, y});
                }
            }
        }
        
        // 随机打乱并取前3个
        safeCells.sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(3, safeCells.length); i++) {
            const cell = safeCells[i];
            this.grid[cell.y][cell.x].isRevealed = true;
            revealed++;
        }
        
        this.log(`🔍 扫描完成，揭示 ${revealed} 个安全区域`);
        this.updateGrid();
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
