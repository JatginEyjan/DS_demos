/**
 * DS06 - 碎片化叙事格子 (Fragmented Narrative)
 * 每个格子都有故事，世界观的真相散落在各处
 * 类似《伊迪芬奇的记忆》《黑暗之魂》的环境叙事
 */

class DS06Game {
    constructor() {
        this.GRID_SIZE = 12;
        this.MINE_COUNT = 18;
        this.MAX_REST = 3;
        
        this.state = 'tavern';
        this.mode = 'explore';
        
        this.grid = [];
        this.sanity = 100;
        this.dungeonInv = [];
        this.restCount = 0;
        this.depth = 1;
        
        // DS06核心：叙事系统
        this.discoveredFragments = new Set(); // 已发现的叙事碎片
        this.currentNarrative = null; // 当前正在阅读的叙事
        
        // 叙事片段库 - 可按层级、位置、条件触发
        this.narrativeFragments = {
            // 开场/通用片段
            general: [
                { id: 'g1', text: '你闻到了霉味和某种更古老的气息...', condition: 'first_cell' },
                { id: 'g2', text: '墙壁上刻满了你无法理解的符号，但它们似乎在注视着你。', condition: 'wall' },
                { id: 'g3', text: '一滴水从天花板落下，声音在寂静中被无限放大。', condition: 'random' },
            ],
            // 层级1叙事
            layer1: [
                { id: 'l1_1', text: '你找到了一张褪色的照片：一群穿着古老制服的人站在这个位置，微笑着。他们的脸都被划掉了。', type: 'memory' },
                { id: 'l1_2', text: '地上有一本日记，最后一页写着："它们从下面上来了，我们必须封锁所有入口。但愿后人能明白。"', type: 'warning' },
                { id: 'l1_3', text: '一个生锈的徽章，上面写着"深渊勘探局 - 第7小队"。你从未听说过这个组织。', type: 'lore' },
                { id: 'l1_4', text: '墙角的骸骨保持着攀爬的姿势，手指深深抠进了石缝。它在试图逃离什么？', type: 'horror' },
                { id: 'l1_5', text: '一首刻在墙上的诗："当你读到这些字时，我们已经成为了它们。不要相信镜子，不要相信回声，不要相信数字。"', type: 'poetry' },
            ],
            // 层级2+深层叙事
            deep: [
                { id: 'd1', text: '你认出了那个骸骨...它穿着和你一样的外套。不，不可能。', type: 'horror', requireSanity: 50 },
                { id: 'd2', text: '一段录音："第42次下潜...我开始理解它们了。它们不是在攻击我们，它们是在...欢迎我们？"', type: 'record' },
                { id: 'd3', text: '一张你从未拍过的照片，上面是你的脸，但表情惊恐，背景是这个格子。照片的日期是...明天。', type: 'impossible', requireDeaths: 1 },
                { id: 'd4', text: '墙壁上的刻痕开始流血，血组成了文字："你终于来了，我们已经等了很久。"', type: 'supernatural', requireSanity: 30 },
                { id: 'd5', text: '一个孩子的涂鸦：画着一个小人走进深渊，然后变成了很多个小人走出来。画的名字是"繁殖"。', type: 'symbolic' },
            ],
            // 陷阱格子特殊叙事
            trap: [
                { id: 't1', text: '你触发了陷阱！在意识模糊的瞬间，你看见了一个巨大的阴影从深处升起...', effect: 'vision' },
                { id: 't2', text: '痛苦中，你理解了那些符号的意思：它们都是警告，警告不要继续深入。但已经太晚了。', effect: 'revelation' },
                { id: 't3', text: '你看见了之前死在这里的人的记忆...他们也看见了你的记忆。你们在某处重叠了。', effect: 'memory_swap' },
            ],
            // 撤离点叙事
            exit: [
                { id: 'e1', text: '撤离点旁边刻着："如果你读到这个，说明你还活着。但活着回去的，真的是你吗？"', type: 'doubt' },
                { id: 'e2', text: '一束阳光从上方照进来，这是你见过最美的东西。你想起了家的味道。', type: 'hope' },
            ],
            // 真结局线索（需要收集多个才能理解）
            truth: [
                { id: 'truth1', text: '【碎片A】"深渊不是地下，是另一个维度。我们只是打开了门。"', piece: 'A' },
                { id: 'truth2', text: '【碎片B】"他们不是死了，是进去了。进去了就是一部分了。"', piece: 'B' },
                { id: 'truth3', text: '【碎片C】"每次有人"撤离"，就有一个它跟着上去。它们在学习模仿。"', piece: 'C' },
                { id: 'truth4', text: '【碎片D】"你以为是你在探索深渊？是深渊在通过你的眼睛看世界。"', piece: 'D' },
            ]
        };
        
        this.persistent = this.loadData();
        
        this.itemTypes = {
            fossil: { name: '未知化石', icon: '🦴', value: 10, weight: 1, story: '这块化石的形状不属于任何已知生物...' },
            idol: { name: '诡异神像', icon: '🗿', value: 50, weight: 2, cursed: true, story: '当你看它时，它的眼睛似乎转动了...' },
            manuscript: { name: '古老手稿', icon: '📜', value: 30, weight: 0.5, story: '手稿的墨水是人血制成的，文字在月光下会变化。' },
            relic: { name: '深渊遗物', icon: '💎', value: 100, weight: 3, cursed: true, story: '你拿着它时，能听到心跳声。是你的，还是它的？' },
            photo: { name: '诡异照片', icon: '📷', value: 5, weight: 0.1, story: '照片里的人正在看着你，即使你把照片翻过来。', special: 'narrative' },
            recorder: { name: '损坏录音机', icon: '🎙️', value: 15, weight: 0.5, story: '里面有一段录音，是你自己的声音，但你从未说过那些话。', special: 'narrative' }
        };
        
        this.init();
    }
    
    loadData() {
        const defaultData = { 
            vault: [], gold: 0, dives: 0, extracts: 0, maxDepth: 1,
            discoveredFragments: [],
            storyProgress: 0,
            deaths: 0,
            totalFragments: 0
        };
        try {
            const saved = localStorage.getItem('DS06_save');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }
    
    saveData() {
        localStorage.setItem('DS06_save', JSON.stringify({
            ...this.persistent,
            discoveredFragments: [...this.discoveredFragments]
        }));
    }
    
    showTavern() {
        this.state = 'tavern';
        const progress = Math.min(100, Math.floor((this.persistent.discoveredFragments.length / 20) * 100));
        
        const c = document.getElementById('game-container');
        c.innerHTML = `
            <div id="tavern">
                <header>
                    <h1>📖 记忆之家</h1>
                    <div class="stats">
                        <span>💰 ${this.persistent.gold}</span>
                        <span>📜 发现 ${this.persistent.discoveredFragments.length} 个故事</span>
                        <span>💀 ${this.persistent.deaths} 次死亡</span>
                    </div>
                </header>
                
                <div class="story-progress">
                    <h3>真相收集进度</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <p>${progress}% 的真相已被拼凑</p>
                    ${this.checkTruthPieces()}
                </div>
                
                <div class="fragment-collection">
                    <h3>已收集的记忆碎片</h3>
                    <div class="fragments-grid">
                        ${this.persistent.discoveredFragments.map(id => this.renderFragment(id)).join('') || 
                          '<p class="no-fragments">你还没有发现任何故事。每个格子都可能藏着秘密...</p>'}
                    </div>
                </div>
                
                <div class="tavern-actions">
                    <button onclick="game.showLibrary()" class="secondary">📚 阅读已收集</button>
                    <button onclick="game.startDive()" class="primary">🕳️ 继续探索 (层级 ${this.persistent.maxDepth})</button>
                    <button onclick="game.deleteSave()">🗑️ 遗忘一切</button>
                </div>
            </div>`;
    }
    
    checkTruthPieces() {
        const pieces = ['A', 'B', 'C', 'D'];
        const found = pieces.filter(p => this.persistent.discoveredFragments.includes('truth' + p));
        if (found.length === 4) {
            return '<div class="truth-unlocked">⚠️ 真相已完整！你已经理解了深渊的本质...</div>';
        }
        return `<p>真结局碎片: ${found.map(p => `【${p}】`).join(' ')} ${found.length}/4</p>`;
    }
    
    renderFragment(id) {
        // 简化的碎片渲染
        const colors = { g: '#888', l: '#4a90d9', d: '#9a4ad9', t: '#d94a4a', e: '#4ad94a', truth: '#ffd700' };
        const prefix = id.charAt(0);
        const color = colors[prefix] || '#888';
        return `<div class="fragment-chip" style="border-color: ${color}" title="${id}">📝</div>`;
    }
    
    showLibrary() {
        let content = '📚 记忆图书馆\n\n';
        this.persistent.discoveredFragments.forEach(id => {
            const text = this.findFragmentText(id);
            if (text) content += `• ${text}\n\n`;
        });
        alert(content);
    }
    
    findFragmentText(id) {
        for (const category of Object.values(this.narrativeFragments)) {
            const fragment = category.find(f => f.id === id);
            if (fragment) return fragment.text;
        }
        return null;
    }
    
    deleteSave() {
        if (confirm('遗忘所有收集的记忆？')) {
            localStorage.removeItem('DS06_save');
            this.persistent = this.loadData();
            this.discoveredFragments.clear();
            this.showTavern();
        }
    }
    
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
        this.assignNarratives(); // DS06核心：为每个格子分配叙事
        this.calcNumbers();
        
        this.renderDungeon();
        this.log('深渊的低语在等待着...每个格子都藏着一个故事', 'system');
        this.revealFirstSafeCell();
    }
    
    assignNarratives() {
        // 为部分格子分配叙事片段
        const allFragments = [
            ...this.narrativeFragments.general,
            ...(this.depth === 1 ? this.narrativeFragments.layer1 : this.narrativeFragments.deep)
        ];
        
        // 随机选择一些格子分配叙事
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (!cell.isMine && !cell.isExit && Math.random() < 0.15) {
                    const fragment = allFragments[Math.floor(Math.random() * allFragments.length)];
                    cell.narrative = fragment;
                }
                
                // 陷阱格子有更高几率有叙事
                if (cell.isMine && Math.random() < 0.3) {
                    const trapFragment = this.narrativeFragments.trap[Math.floor(Math.random() * this.narrativeFragments.trap.length)];
                    cell.narrative = trapFragment;
                }
            }
        }
        
        // 撤离点必有叙事
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x].isExit) {
                    this.grid[y][x].narrative = this.narrativeFragments.exit[Math.floor(Math.random() * this.narrativeFragments.exit.length)];
                }
            }
        }
        
        // 真结局碎片随机放置（深层）
        if (this.depth >= 2) {
            const truthFragments = [...this.narrativeFragments.truth];
            const unfoundTruth = truthFragments.filter(t => !this.discoveredFragments.has(t.id));
            
            unfoundTruth.forEach(fragment => {
                let placed = false;
                while (!placed) {
                    const x = Math.floor(Math.random() * this.GRID_SIZE);
                    const y = Math.floor(Math.random() * this.GRID_SIZE);
                    const cell = this.grid[y][x];
                    if (!cell.isMine && !cell.isExit && !cell.narrative) {
                        cell.narrative = fragment;
                        placed = true;
                    }
                }
            });
        }
    }
    
    createGrid() {
        this.grid = Array(this.GRID_SIZE).fill(null).map((_, y) =>
            Array(this.GRID_SIZE).fill(null).map((_, x) => ({
                x, y, isMine: false, isRevealed: false, isFlagged: false,
                number: 0, item: null, isExit: false,
                narrative: null // DS06：叙事片段
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
        const keys = Object.keys(this.itemTypes);
        for (let i = 0; i < 6; i++) {
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
        const hasNarrative = this.currentNarrative ? 'has-narrative' : '';
        
        c.innerHTML = `
            <div id="dungeon" class="${hasNarrative}">
                <header>
                    <button onclick="game.quitDive()">⬅️ 返回</button>
                    <span>🕳️ 层级 ${this.depth}</span>
                    <div class="dungeon-stats">
                        <span>🧠 ${this.sanity}</span>
                        <span>📦 ${this.dungeonInv.reduce((s,i)=>s+i.weight,0).toFixed(1)}/10</span>
                    </div>
                </header>
                
                <div class="main-area">
                    <div id="minefield"></div>
                    
                    <div class="side-panel">
                        <div id="narrative-panel" class="narrative-panel">
                            <h4>📖 当前发现</h4>
                            <div id="narrative-content">
                                <p class="hint">点击带有 ✨ 的格子阅读故事</p>
                            </div>
                        </div>
                        <div id="dung-inv">
                            <h4>背包</h4>
                            <div id="inv-grid"></div>
                        </div>
                        <div id="log"></div>
                    </div>
                </div>
                
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
                div.innerHTML = '';
                
                // 如果有未发现的叙事，显示提示
                if (cell.narrative && !cell.narrativeDiscovered) {
                    div.classList.add('has-story');
                }
                
                if (cell.isRevealed) {
                    div.classList.add('revealed');
                    if (cell.isMine) { 
                        div.classList.add('mine'); 
                        div.innerHTML = '💀';
                    }
                    else if (cell.isExit) { 
                        div.classList.add('exit'); 
                        div.innerHTML = '🚪';
                    }
                    else if (cell.number > 0) { 
                        div.textContent = cell.number; 
                    }
                    
                    // 显示叙事标记
                    if (cell.narrative && !cell.narrativeDiscovered) {
                        div.innerHTML += '<span class="story-indicator">✨</span>';
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
                `<div class="slot" onclick="game.readItemStory(${i})" title="${item.story || ''}">${item.icon}</div>`
            ).join('');
        }
    }
    
    readItemStory(i) {
        const item = this.dungeonInv[i];
        if (item.story) {
            this.showNarrative({ text: `【${item.name}】\n\n${item.story}`, id: 'item_' + item.type }, true);
        }
    }
    
    showNarrative(fragment, temporary = false) {
        const panel = document.getElementById('narrative-content');
        if (panel) {
            panel.innerHTML = `<div class="story-text ${fragment.type || ''}">${fragment.text}</div>`;
            
            // 添加到收集（如果不是临时的）
            if (!temporary && !this.discoveredFragments.has(fragment.id)) {
                this.discoveredFragments.add(fragment.id);
                this.persistent.discoveredFragments.push(fragment.id);
                this.persistent.totalFragments++;
                this.saveData();
                this.log(`📜 发现了新的记忆碎片！`, 'special');
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
        if (cell.isRevealed || cell.isFlagged) {
            // 已揭示的格子，如果有叙事可以重读
            if (cell.narrative) {
                this.showNarrative(cell.narrative);
            }
            return;
        }
        
        cell.isRevealed = true;
        
        // 如果有叙事，显示它
        if (cell.narrative) {
            cell.narrativeDiscovered = true;
            this.showNarrative(cell.narrative);
        }
        
        if (cell.isMine) {
            this.sanity -= 25;
            this.log('💀 触发陷阱！理智-25', 'bad');
            
            // 陷阱可能有额外叙事
            if (cell.narrative && cell.narrative.effect) {
                if (cell.narrative.effect === 'vision') {
                    this.log('👁️ 你看见了...某种巨大的存在...', 'special');
                }
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
                    this.log(`✅ 获得 ${item.name}`);
                    if (cell.item.story) {
                        this.showNarrative({ text: `【获得物品】\n${cell.item.story}`, id: 'item_get_' + Date.now() }, true);
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
        this.sanity = Math.min(100, this.sanity + 15);
        this.log(`🛏️ 休息恢复`);
        this.updateGrid();
    }
    
    extract() {
        const value = this.dungeonInv.reduce((s, i) => s + i.value, 0);
        this.persistent.vault.push(...this.dungeonInv);
        this.persistent.gold += Math.floor(value * 0.5);
        this.persistent.extracts++;
        if (this.depth === this.persistent.maxDepth) this.persistent.maxDepth++;
        this.saveData();
        
        // 检查是否收集完真相
        const truthPieces = ['truthA', 'truthB', 'truthC', 'truthD'];
        const hasAll = truthPieces.every(p => this.discoveredFragments.has(p));
        
        let msg = `成功撤离！\n💰 +${Math.floor(value * 0.5)}金币\n📦 ${this.discoveredFragments.size} 个故事`;
        if (hasAll) {
            msg += '\n\n🎉 真结局已解锁！你理解了深渊的本质...';
        }
        
        alert(msg);
        this.showTavern();
    }
    
    quitDive() {
        if (confirm('返回？收集的记忆会保留。')) {
            this.showTavern();
        }
    }
    
    gameOver() {
        this.persistent.deaths++;
        this.saveData();
        alert('理智崩溃...但你的故事会被记住');
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
    
    init() {
        this.showTavern();
    }
}

window.onload = () => { window.game = new DS06Game(); };
