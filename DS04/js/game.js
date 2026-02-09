/**
 * DS04 - 双层结构 (Double Layer)
 * 上层：宫廷政治/派系博弈
 * 下层：深渊探索/扫雷核心
 * 核心机制：派系好感度、任务委托、政治选择影响探索
 */

class DS04Game {
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
        
        // DS04核心：派系系统
        this.factions = {
            merchant_guild: {
                name: '商人公会',
                icon: '💰',
                color: '#d4a017',
                description: '追求财富，愿意收购任何深渊物品',
                attitude: 0, // -10到+10
                benefits: {
                    sellBonus: 0.2, // 售价+20%
                    unlockShop: false
                }
            },
            cult_of_madness: {
                name: '疯狂教会',
                icon: '😈',
                color: '#9a4ad9',
                description: '崇拜古神，渴求诅咒物品',
                attitude: 0,
                benefits: {
                    curseResistance: 0, // 诅咒抗性
                    madnessInsight: false // 疯狂视觉
                }
            },
            explorers_league: {
                name: '探险家协会',
                icon: '🗺️',
                color: '#4a90d9',
                description: '致力于地图绘制和生存技巧',
                attitude: 0,
                benefits: {
                    mapMemory: false, // 保留更多地图
                    extraRest: 0 // 额外休息次数
                }
            },
            keepers_of_seal: {
                name: '封印守护者',
                icon: '🔒',
                color: '#4ad94a',
                description: '阻止深渊扩张，厌恶亵渎行为',
                attitude: 0,
                benefits: {
                    trapDetection: 0, // 陷阱预警
                    sanctityBonus: false // 神圣保护
                }
            }
        };
        
        // 任务系统
        this.activeQuests = [];
        this.questPool = [
            { id: 'q1', faction: 'merchant_guild', type: 'collect', target: 'fossil', count: 3, reward: { gold: 100, attitude: 2 }, desc: '收集3个未知化石' },
            { id: 'q2', faction: 'cult_of_madness', type: 'collect', target: 'idol', count: 2, reward: { attitude: 3, knowledge: '古神低语' }, desc: '带来2个诅咒神像' },
            { id: 'q3', faction: 'explorers_league', type: 'explore', target: 'cells', count: 50, reward: { attitude: 2, tool: '高级地图' }, desc: '探索50个格子' },
            { id: 'q4', faction: 'keepers_of_seal', type: 'survive', target: 'depth', count: 3, reward: { attitude: 2, gold: 80 }, desc: '成功探索第3层' },
            { id: 'q5', faction: 'merchant_guild', type: 'profit', target: 'gold', count: 200, reward: { attitude: 2, gold: 50 }, desc: '带回200金币价值的物品' }
        ];
        
        // 政治事件
        this.politicalEvents = [
            { id: 'pe1', title: '商会的请求', desc: '商人公会请求你优先将物品卖给他们', choices: [
                { text: '同意 (+2商会, -1其他)', effect: { merchant_guild: 2, others: -1 } },
                { text: '拒绝 (-1商会)', effect: { merchant_guild: -1 } }
            ]},
            { id: 'pe2', title: '教会的警告', desc: '疯狂教会警告你不得亵渎深渊', choices: [
                { text: '承诺尊重 (+2教会)', effect: { cult_of_madness: 2 } },
                { text: '无视 (-2教会, 解锁亵渎奖励)', effect: { cult_of_madness: -2, unlock: 'desecration' } }
            ]},
            { id: 'pe3', title: '协会的招募', desc: '探险家协会邀请你分享地图情报', choices: [
                { text: '分享地图 (+3协会)', effect: { explorers_league: 3, loseMapMemory: true } },
                { text: '保密 (-1协会)', effect: { explorers_league: -1 } }
            ]}
        ];
        
        this.init();
    }
    
    loadData() {
        const defaultData = { 
            vault: [], gold: 0, dives: 0, extracts: 0, maxDepth: 1,
            factionAttitudes: { merchant_guild: 0, cult_of_madness: 0, explorers_league: 0, keepers_of_seal: 0 },
            completedQuests: [],
            unlockedBenefits: [],
            politicalHistory: [],
            desecrationCount: 0
        };
        try {
            const saved = localStorage.getItem('DS04_save');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }
    
    saveData() {
        localStorage.setItem('DS04_save', JSON.stringify(this.persistent));
    }
    
    // 显示酒馆（上层界面）
    showTavern() {
        this.state = 'tavern';
        this.generateQuests();
        
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="tavern">
                <header class="tavern-header">
                    <h1>🏛️ 深渊议会</h1>
                    <div class="player-stats">
                        <span>💰 ${this.persistent.gold}</span>
                        <span>🏆 ${this.persistent.extracts}次成功</span>
                        <span>📜 ${this.persistent.completedQuests.length}任务</span>
                    </div>
                </header>
                
                <div class="political-status">
                    <h3>派系关系</h3>
                    <div class="factions-display">
                        ${Object.entries(this.factions).map(([key, faction]) => {
                            const attitude = this.persistent.factionAttitudes[key] || 0;
                            const hearts = this.getAttitudeHearts(attitude);
                            return `
                                <div class="faction-card ${attitude < 0 ? 'hostile' : attitude > 3 ? 'friendly' : ''}" 
                                     style="border-color: ${faction.color}"
                                     onclick="game.showFactionDetail('${key}')">
                                    <span class="faction-icon" style="color: ${faction.color}">${faction.icon}</span>
                                    <div class="faction-info">
                                        <span class="faction-name">${faction.name}</span>
                                        <span class="attitude">${hearts}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="tavern-content">
                    <div class="quests-panel">
                        <h3>📜 当前委托 (${this.activeQuests.length})</h3>
                        <div class="quests-list">
                            ${this.activeQuests.map((quest, idx) => `
                                <div class="quest-card">
                                    <div class="quest-faction" style="color: ${this.factions[quest.faction].color}">
                                        ${this.factions[quest.faction].icon} ${this.factions[quest.faction].name}
                                    </div>
                                    <div class="quest-desc">${quest.desc}</div>
                                    <div class="quest-progress">进度: ${this.getQuestProgress(quest)}</div>
                                    <button onclick="game.abandonQuest(${idx})">放弃</button>
                                </div>
                            `).join('') || '<p class="no-quests">暂无委托，点击下方按钮获取</p>'}
                        </div>
                        <button onclick="game.getNewQuest()" class="get-quest-btn">📜 获取新委托</button>
                    </div>
                    
                    <div class="actions-panel">
                        <div class="political-event ${Math.random() < 0.3 ? 'active' : 'none'}">
                            ${Math.random() < 0.3 ? this.generatePoliticalEvent() : '<p>今日无事发生</p>'}
                        </div>
                        
                        <div class="tavern-actions">
                            <button onclick="game.showWarehouse()" class="secondary">🏛️ 查看仓库</button>
                            <button onclick="game.startDive()" class="primary">🕳️ 潜入深渊 (层级 ${this.persistent.maxDepth})</button>
                            <button onclick="game.deleteSave()" class="danger">🗑️ 重置</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    getAttitudeHearts(attitude) {
        if (attitude <= -5) return '💀💀💀💀💀 (死敌)';
        if (attitude < 0) return '🖤'.repeat(Math.abs(attitude)) + '🤍'.repeat(5 - Math.abs(attitude)) + ' (敌对)';
        if (attitude === 0) return '🤍🤍🤍🤍🤍 (中立)';
        if (attitude < 5) return '❤️'.repeat(attitude) + '🤍'.repeat(5 - attitude) + ' (友好)';
        return '❤️❤️❤️❤️❤️ (盟友)';
    }
    
    showFactionDetail(factionKey) {
        const faction = this.factions[factionKey];
        const attitude = this.persistent.factionAttitudes[factionKey] || 0;
        
        let benefits = '';
        if (attitude >= 2) benefits += '\n✓ 解锁基础交易';
        if (attitude >= 5) benefits += '\n✓ 派系专属奖励';
        if (attitude >= 8) benefits += '\n✓ 派系终极支持';
        
        alert(`${faction.icon} ${faction.name}\n\n${faction.description}\n\n当前态度: ${this.getAttitudeHearts(attitude)}${benefits}`);
    }
    
    generateQuests() {
        // 如果任务少于3个，补充新任务
        while (this.activeQuests.length < 3) {
            this.getNewQuest();
        }
    }
    
    getNewQuest() {
        if (this.activeQuests.length >= 5) {
            alert('委托已满！先完成或放弃一些任务。');
            return;
        }
        
        const available = this.questPool.filter(q => !this.activeQuests.find(aq => aq.id === q.id));
        if (available.length === 0) return;
        
        const quest = available[Math.floor(Math.random() * available.length)];
        this.activeQuests.push({ ...quest, progress: 0 });
        this.showTavern();
    }
    
    abandonQuest(idx) {
        if (confirm('放弃此委托？可能影响派系好感。')) {
            const quest = this.activeQuests[idx];
            this.persistent.factionAttitudes[quest.faction]--;
            this.activeQuests.splice(idx, 1);
            this.saveData();
            this.showTavern();
        }
    }
    
    getQuestProgress(quest) {
        // 简化的进度显示
        return '进行中...';
    }
    
    generatePoliticalEvent() {
        const event = this.politicalEvents[Math.floor(Math.random() * this.politicalEvents.length)];
        return `
            <div class="event-box">
                <h4>${event.title}</h4>
                <p>${event.desc}</p>
                <div class="event-choices">
                    ${event.choices.map((choice, idx) => `
                        <button onclick="game.makePoliticalChoice('${event.id}', ${idx})">${choice.text}</button>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    makePoliticalChoice(eventId, choiceIdx) {
        const event = this.politicalEvents.find(e => e.id === eventId);
        const choice = event.choices[choiceIdx];
        
        // 应用效果
        Object.entries(choice.effect).forEach(([key, value]) => {
            if (key === 'others') {
                Object.keys(this.factions).forEach(fk => {
                    if (!event.choices[choiceIdx].effect[fk]) {
                        this.persistent.factionAttitudes[fk] = (this.persistent.factionAttitudes[fk] || 0) + value;
                    }
                });
            } else if (this.factions[key]) {
                this.persistent.factionAttitudes[key] = (this.persistent.factionAttitudes[key] || 0) + value;
            }
        });
        
        this.persistent.politicalHistory.push({ event: eventId, choice: choiceIdx, turn: Date.now() });
        this.saveData();
        this.showTavern();
    }
    
    showWarehouse() {
        const items = this.persistent.vault.map((item, i) => `
            <div class="warehouse-item" onclick="game.sellItem(${i})">
                <span>${item.icon}</span>
                <span>${item.name}</span>
                <span>${Math.floor(item.value * (1 + (this.persistent.factionAttitudes.merchant_guild > 2 ? 0.2 : 0)))}💰</span>
            </div>
        `).join('');
        
        alert(`🏛️ 仓库 (${this.persistent.vault.length}件物品)\n\n点击物品出售\n商人好感>2时有20%价格加成\n\n${items || '仓库为空'}`);
    }
    
    sellItem(idx) {
        const item = this.persistent.vault[idx];
        const bonus = this.persistent.factionAttitudes.merchant_guild > 2 ? 1.2 : 1;
        const price = Math.floor(item.value * bonus);
        
        if (confirm(`出售 ${item.name} 获得 ${price} 金币？`)) {
            this.persistent.gold += price;
            this.persistent.vault.splice(idx, 1);
            
            // 检查任务完成
            this.checkQuestCompletion('sell', item);
            
            this.saveData();
        }
    }
    
    checkQuestCompletion(action, target) {
        this.activeQuests.forEach(quest => {
            if (quest.type === 'collect' && action === 'collect' && target.type === quest.target) {
                quest.progress = (quest.progress || 0) + 1;
                if (quest.progress >= quest.count) {
                    this.completeQuest(quest);
                }
            }
        });
    }
    
    completeQuest(quest) {
        alert(`任务完成！\n${quest.desc}\n奖励已发放`);
        
        // 发放奖励
        if (quest.reward.attitude) {
            this.persistent.factionAttitudes[quest.faction] += quest.reward.attitude;
        }
        if (quest.reward.gold) {
            this.persistent.gold += quest.reward.gold;
        }
        
        this.persistent.completedQuests.push(quest.id);
        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
        this.saveData();
    }
    
    // 下层：地牢探索
    startDive() {
        this.state = 'dungeon';
        this.persistent.dives++;
        this.sanity = 100 + (this.persistent.factionAttitudes.explorers_league > 3 ? 10 : 0);
        this.dungeonInv = [];
        this.restCount = this.persistent.factionAttitudes.explorers_league > 5 ? 1 : 0; // 探险家好感>5给额外休息
        this.depth = this.persistent.maxDepth;
        this.exploredCells = 0;
        
        // 应用派系增益
        const trapBonus = this.persistent.factionAttitudes.keepers_of_seal > 3;
        
        this.createGrid(trapBonus);
        this.placeMines();
        this.placeItems();
        this.placeExit();
        this.calcNumbers();
        
        this.renderDungeon();
        this.log('派系增益已应用...', 'system');
        this.revealFirstSafeCell();
    }
    
    createGrid(trapBonus = false) {
        this.grid = Array(this.GRID_SIZE).fill(null).map((_, y) =>
            Array(this.GRID_SIZE).fill(null).map((_, x) => ({
                x, y, isMine: false, isRevealed: false, isFlagged: false,
                number: 0, item: null, isExit: false,
                trapWarning: trapBonus && Math.random() < 0.1 // 封印守护者给的陷阱预警
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
        const baseItems = {
            fossil: { name: '未知化石', icon: '🦴', value: 10, weight: 1, type: 'fossil' },
            idol: { name: '诡异神像', icon: '🗿', value: 50, weight: 2, cursed: true, type: 'idol' },
            manuscript: { name: '古老手稿', icon: '📜', value: 30, weight: 0.5, type: 'manuscript' },
            medkit: { name: '理智药剂', icon: '🧪', value: 20, weight: 0.5, type: 'medkit' },
            relic: { name: '深渊遗物', icon: '💎', value: 100, weight: 3, cursed: true, type: 'relic' }
        };
        
        for (let i = 0; i < 6; i++) {
            const x = Math.floor(Math.random() * this.GRID_SIZE);
            const y = Math.floor(Math.random() * this.GRID_SIZE);
            const cell = this.grid[y][x];
            if (!cell.isMine && !cell.item && !cell.isExit) {
                const keys = Object.keys(baseItems);
                const key = keys[Math.floor(Math.random() * keys.length)];
                cell.item = { ...baseItems[key] };
            }
        }
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
                    <button onclick="game.quitDive()">⬅️ 返回议会</button>
                    <span>🕳️ 层级 ${this.depth}</span>
                    <div class="dungeon-stats">
                        <span>🧠 ${this.sanity}</span>
                        <span>📦 ${this.dungeonInv.reduce((s,i)=>s+i.weight,0).toFixed(1)}/10</span>
                        <span>🛏️ ${this.MAX_REST - this.restCount}</span>
                    </div>
                </header>
                <div id="minefield"></div>
                <div id="log"></div>
                <footer>
                    <button onclick="game.setMode('explore')" id="btn-explore" class="active">🔍 探索</button>
                    <button onclick="game.setMode('flag')" id="btn-flag">🚩 标记</button>
                    <button onclick="game.rest()">🛏️ 休息</button>
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
                div.style = '';
                
                if (cell.trapWarning && !cell.isRevealed) {
                    div.style.border = '2px solid #d94a4a';
                }
                
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
        this.exploredCells++;
        
        if (cell.isMine) {
            this.sanity -= 25;
            this.log('💀 触发陷阱！理智-25', 'bad');
            
            // 封印守护者好感<0时额外惩罚
            if (this.persistent.factionAttitudes.keepers_of_seal < 0) {
                this.sanity -= 10;
                this.log('😈 封印守护者冷眼旁观...额外损失10理智', 'bad');
            }
            
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
                    
                    // 诅咒物品处理
                    if (cell.item.cursed) {
                        const cultAttitude = this.persistent.factionAttitudes.cult_of_madness;
                        if (cultAttitude > 3) {
                            this.log('😈 诅咒被教会力量压制！', 'good');
                        } else {
                            this.sanity -= 5;
                            this.log('😈 诅咒侵蚀理智', 'bad');
                        }
                    }
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
        this.sanity = Math.min(110, this.sanity + 15);
        this.log(`🛏️ 休息恢复`);
        this.updateGrid();
    }
    
    extract() {
        const value = this.dungeonInv.reduce((s, i) => s + i.value, 0);
        
        // 检查任务完成
        this.checkQuestCompletion('explore', null);
        
        this.persistent.vault.push(...this.dungeonInv);
        this.persistent.gold += Math.floor(value * 0.5);
        this.persistent.extracts++;
        if (this.depth === this.persistent.maxDepth) this.persistent.maxDepth++;
        this.saveData();
        
        alert(`成功撤离！\n💰 +${Math.floor(value * 0.5)}金币\n📦 ${this.dungeonInv.length}件物品`);
        this.showTavern();
    }
    
    quitDive() {
        if (confirm('返回议会？未完成的探索将丢失。')) {
            this.dungeonInv = [];
            this.showTavern();
        }
    }
    
    gameOver() {
        this.saveData();
        alert('理智崩溃...你被深渊吞噬');
        this.showTavern();
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
    
    deleteSave() {
        if (confirm('重置所有进度？')) {
            localStorage.removeItem('DS04_save');
            this.persistent = this.loadData();
            this.showTavern();
        }
    }
    
    init() {
        this.showTavern();
    }
}

window.onload = () => { window.game = new DS04Game(); };
