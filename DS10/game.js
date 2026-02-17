// DS10 v7 - 强剧情驱动版 (已修复职业选择)
// 核心：世界观叙事 + 主轴剧情 + 线索系统 + 多结局

const game = {
    state: {
        phase: 'intro', // intro, profession_select, game
        currentRoute: null,
        turn: 0,
        selectedInvestigator: 0,
        selectedTarget: null,
        gameOver: false,
        victory: false,
        ending: null,
        // 决心值
        resolve: {
            stopRitual: 0,    // 阻止仪式
            seekTruth: 0,     // 探寻真相
            protect: 0,       // 保护同伴
            survive: 0        // 自我保全
        },
        // 线索收集
        clues: [],
        // 永久buff/debuff
        buffs: [],
        // 剧情标记
        storyFlags: {}
    },
    
    // 双人调查员小队
    team: [],
    
    // 扩展地图（14节点）
    routeGrid: [
        // 入口区（第一幕）
        { id: 'entrance', name: '矿坑入口', type: 'start', x: 0, y: 0, visited: false,
          story: 'entrance', desc: '深渊裂隙的入口，寒风裹挟着腐朽的气息' },
        { id: 'collapse', name: '塌陷通道', type: 'story', x: 1, y: 0, visited: false,
          story: 'collapse', desc: '通道被碎石堵塞，墙上有新鲜的刻痕' },
        { id: 'camp', name: '第7小队营地', type: 'main_story', x: 2, y: 0, visited: false,
          story: 'camp', desc: '失踪小队的临时营地，马库斯队长的日记' },
        
        // 分叉点
        { id: 'fork', name: '矿道分叉', type: 'fork', x: 3, y: 0, visited: false,
          story: 'fork', desc: '通道分成两条，分别通向不同区域' },
        
        // 上分支 - 参与者之路
        { id: 'upper1', name: '教导厅', type: 'story', x: 4, y: -1, visited: false,
          story: 'teaching', desc: '主教教导村民仪式步骤的地方' },
        { id: 'upper2', name: '藏书室', type: 'main_story', x: 5, y: -1, visited: false,
          story: 'library', desc: '埃德蒙·布莱克伍德的私人空间' },
        { id: 'upper3', name: '准备区', type: 'combat', x: 6, y: -1, visited: false,
          desc: '仪式准备区，有守卫巡逻' },
        
        // 下分支 - 牺牲品之路
        { id: 'lower1', name: '牺牲坑道', type: 'story', x: 4, y: 1, visited: false,
          story: 'sacrifice', desc: '血腥味弥漫的通道，令人不安' },
        { id: 'lower2', name: '深渊边缘', type: 'main_story', x: 5, y: 1, visited: false,
          story: 'abyss_edge', desc: '空间裂隙的边缘，马库斯的终末之地' },
        { id: 'lower3', name: '实验场', type: 'combat', x: 6, y: 1, visited: false,
          desc: '深渊人体实验的现场' },
        
        // 汇合区（第三幕）
        { id: 'merge', name: '汇合点', type: 'merge', x: 7, y: 0, visited: false,
          story: 'merge', desc: '两条路径再次汇合' },
        { id: 'antechamber', name: '深渊前厅', type: 'story', x: 8, y: 0, visited: false,
          story: 'antechamber', desc: '仪式大厅前的最后空间' },
        { id: 'boss', name: '仪式大厅', type: 'boss', x: 9, y: 0, visited: false,
          story: 'ritual_hall', desc: '埃德蒙·布莱克伍德进行仪式的地方' },
        { id: 'exit', name: '出口', type: 'exit', x: 10, y: 0, visited: false,
          desc: '离开深渊的通道' }
    ],
    
    connections: [
        ['entrance', 'collapse'],
        ['collapse', 'camp'],
        ['camp', 'fork'],
        ['fork', 'upper1'],
        ['fork', 'lower1'],
        ['upper1', 'upper2'],
        ['upper2', 'upper3'],
        ['lower1', 'lower2'],
        ['lower2', 'lower3'],
        ['upper3', 'merge'],
        ['lower3', 'merge'],
        ['merge', 'antechamber'],
        ['antechamber', 'boss'],
        ['boss', 'exit']
    ],
    
    // 世界观开场文本
    introText: [
        { text: "2024年11月17日 凌晨3:42", style: "date" },
        { text: "东欧，喀尔巴阡山脉废弃矿区", style: "location" },
        { text: "", style: "break" },
        { text: "深渊调查局（DIA）第9小队", style: "title" },
        { text: "", style: "break" },
        { text: "3天前，DIA第7小队在此失联。", style: "text" },
        { text: "12小时前，最后通讯中断。", style: "text" },
        { text: "传来的最后一句话：", style: "text" },
        { text: "", style: "break" },
        { text: '"主教...仪式...阻止他...深渊之主即将..."', style: "quote" },
        { text: "", style: "break" },
        { text: "你们的任务：", style: "title" },
        { text: "1. 找到第7小队的幸存者", style: "list" },
        { text: "2. 阻止正在进行的仪式", style: "list" },
        { text: "3. 查明深渊之主的真相", style: "list" },
        { text: "", style: "break" },
        { text: "寒风裹挟着腐朽的气息从黑暗中涌出...", style: "text" }
    ],
    
    // 职业定义
    professions: {
        archaeologist: { 
            name: '考古学家', 
            hp: 70, maxHp: 70, 
            sanity: 0, maxSanity: 100, 
            skills: { 侦查: 50, 力量: 30, 神秘学: 35 },
            desc: '精通古代文献和符号学',
            dialogStyle: 'analytical'
        },
        soldier: { 
            name: '前军人', 
            hp: 90, maxHp: 90, 
            sanity: 0, maxSanity: 100, 
            skills: { 侦查: 35, 力量: 55, 神秘学: 20 },
            desc: '实战经验丰富，擅长危机处理',
            dialogStyle: 'direct'
        },
        occultist: { 
            name: '神秘学者', 
            hp: 50, maxHp: 50, 
            sanity: 0, maxSanity: 100, 
            skills: { 侦查: 40, 力量: 20, 神秘学: 55 },
            desc: '研究超自然现象的专家',
            dialogStyle: 'mystical'
        }
    },
    
    // SAN状态
    sanityStates: {
        calm: { min: 0, max: 30, name: '冷静', color: '#27ae60' },
        uneasy: { min: 31, max: 50, name: '不安', color: '#f39c12' },
        nervous: { min: 51, max: 70, name: '紧张', color: '#e67e22' },
        fearful: { min: 71, max: 85, name: '恐惧', color: '#e94560' },
        breaking: { min: 86, max: 99, name: '崩溃边缘', color: '#7c3aed' },
        broken: { min: 100, max: 100, name: '崩溃', color: '#000' }
    },
    
    // Afflictions
    afflictions: {
        paranoid: { name: '偏执', effect: '拒绝治疗' },
        hopeless: { name: '绝望', effect: '伤害-30%，50%跳过回合' },
        manic: { name: '狂躁', effect: '50%攻击错误目标' },
        withdrawn: { name: '自闭', effect: '无法行动' }
    },
    
    // Virtues
    virtues: {
        steadfast: { name: '坚定', effect: '免疫SAN伤害3回合' },
        heroic: { name: '英勇', effect: '伤害+30%，守护队友' }
    },
    
    // Buff/Debuff
    buffsList: {
        abyss_insight: { name: '深渊洞察', desc: '侦查+10', effect: { 侦查: 10 } },
        survivor_guilt: { name: '幸存者愧疚', desc: 'SAN上限-10', effect: { maxSanity: -10 } },
        marcus_blessing: { name: '马库斯的祝福', desc: '受到伤害-5', effect: { damageReduce: 5 } },
        deep_one_mark: { name: '深潜者印记', desc: 'SAN积累+20%', effect: { sanGain: 1.2 } }
    },
    
    init() {
        this.showIntro();
    },
    
    // 显示世界观开场
    showIntro() {
        const content = document.getElementById('mainContent') || document.body;
        content.innerHTML = '<div id="intro-container"></div>';
        
        const container = document.getElementById('intro-container');
        container.style.cssText = 'background:#0a0a0f;color:#e0e0e0;padding:40px 20px;min-height:100vh;font-family:monospace;';
        
        let delay = 0;
        this.introText.forEach((line, idx) => {
            setTimeout(() => {
                const div = document.createElement('div');
                div.style.marginBottom = '8px';
                
                switch(line.style) {
                    case 'date':
                        div.style.color = '#888';
                        div.style.fontSize = '12px';
                        break;
                    case 'location':
                        div.style.color = '#666';
                        div.style.fontSize = '11px';
                        break;
                    case 'title':
                        div.style.color = '#e94560';
                        div.style.fontSize = '14px';
                        div.style.fontWeight = 'bold';
                        div.style.marginTop = '16px';
                        break;
                    case 'quote':
                        div.style.color = '#f39c12';
                        div.style.fontStyle = 'italic';
                        div.style.paddingLeft = '20px';
                        div.style.borderLeft = '2px solid #f39c12';
                        break;
                    case 'list':
                        div.style.paddingLeft = '20px';
                        div.style.color = '#aaa';
                        break;
                    case 'break':
                        div.style.height = '8px';
                        break;
                    default:
                        div.style.color = '#ccc';
                }
                
                div.textContent = line.text;
                container.appendChild(div);
                
                // 自动滚动
                window.scrollTo(0, document.body.scrollHeight);
                
                // 最后一段显示后，显示开始按钮
                if (idx === this.introText.length - 1) {
                    setTimeout(() => {
                        const btn = document.createElement('button');
                        btn.textContent = '▶ 开始任务';
                        btn.style.cssText = 'margin-top:30px;padding:15px 40px;background:#e94560;color:white;border:none;font-size:16px;cursor:pointer;';
                        btn.onclick = () => this.showProfessionSelect();
                        container.appendChild(btn);
                        
                        // 同时添加跳过按钮
                        const skipBtn = document.createElement('button');
                        skipBtn.textContent = '跳过介绍';
                        skipBtn.style.cssText = 'margin-top:15px;padding:10px 30px;background:#2a2a3a;color:#888;border:none;font-size:12px;cursor:pointer;';
                        skipBtn.onclick = () => this.showProfessionSelect();
                        container.appendChild(skipBtn);
                    }, 500);
                }
                
                // 任何时候都可以点击跳过
                if (idx === 0) {
                    setTimeout(() => {
                        const skipDiv = document.createElement('div');
                        skipDiv.textContent = '点击任意处跳过';
                        skipDiv.style.cssText = 'position:fixed;bottom:20px;right:20px;color:#666;font-size:12px;cursor:pointer;padding:10px;';
                        skipDiv.onclick = () => this.showProfessionSelect();
                        document.body.appendChild(skipDiv);
                    }, 2000);
                }
            }, delay);
            
            delay += line.style === 'break' ? 200 : 800;
        });
    },
    
    // 显示职业选择
    showProfessionSelect() {
        console.log('showProfessionSelect called');
        
        // 清除开场动画容器（如果存在）
        const introContainer = document.getElementById('intro-container');
        if (introContainer) {
            introContainer.style.display = 'none';
        }
        
        // 显示选择界面
        const selectPanel = document.getElementById('professionSelect');
        const gamePanel = document.getElementById('gameUI');
        
        console.log('selectPanel:', selectPanel);
        console.log('gamePanel:', gamePanel);
        
        if (selectPanel) {
            selectPanel.classList.remove('hidden');
            selectPanel.style.display = 'flex';
        }
        if (gamePanel) {
            gamePanel.classList.add('hidden');
            gamePanel.style.display = 'none';
        }
        
        // 重置选择状态
        this.selectedProfessions = [];
        
        // 重置所有卡片样式
        document.querySelectorAll('.profession-card').forEach(c => {
            c.classList.remove('selected');
            c.style.borderColor = '#2a2a3a';
            c.style.boxShadow = 'none';
            c.style.opacity = '1';
        });
        
        // 显示提示
        alert('选择2名调查员组成小队\n点击卡片进行选择（需要选2个）');
        
        console.log('Profession select shown');
    },
    
    // 选择职业
    selectProfession(key) {
        // 确保数组已初始化
        if (!this.selectedProfessions) {
            this.selectedProfessions = [];
        }
        
        // 检查是否已选择该职业
        if (this.selectedProfessions.includes(key)) {
            this.log('系统', '该职业已被选择');
            return;
        }
        
        // 检查是否已满2人
        if (this.selectedProfessions.length >= 2) {
            this.log('系统', '队伍已满，请先刷新页面重新选择');
            return;
        }
        
        this.selectedProfessions.push(key);
        
        // 高亮选中的卡片
        const card = document.querySelector(`.profession-card[data-profession="${key}"]`);
        if (card) {
            card.classList.add('selected');
            card.style.borderColor = '#27ae60';
            card.style.boxShadow = '0 0 15px rgba(39, 174, 96, 0.5)';
        }
        
        this.log('系统', `选择了 ${this.professions[key].name} (${this.selectedProfessions.length}/2)`);
        
        // 选择2个后自动确认
        if (this.selectedProfessions.length === 2) {
            this.log('系统', '队伍组成完毕，准备进入...');
            setTimeout(() => this.confirmTeam(), 800);
        } else {
            this.log('系统', '请选择第二名调查员');
        }
    },
    
    // 确认队伍
    confirmTeam() {
        this.team = this.selectedProfessions.map((key, idx) => ({
            id: idx,
            key: key,
            ...this.professions[key],
            inventory: { gold: 20, sedative: 1 },
            affliction: null,
            virtue: null,
            virtueTurns: 0
        }));
        
        document.getElementById('professionSelect').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        document.getElementById('gameUI').style.display = 'flex';
        
        this.log('系统', `第9小队组成: ${this.team[0].name} + ${this.team[1].name}`);
        this.startGame();
    },
    
    startGame() {
        this.state.currentRoute = 0;
        this.state.turn = 0;
        this.routeGrid[0].visited = true;
        this.updateMainView();
        this.updateStatus();
    }
};

// 核心方法
Object.assign(game, {
    // 获取当前节点
    getCurrentNode() {
        return this.routeGrid[this.state.currentRoute];
    },
    
    // 获取相邻节点
    getNeighbors(nodeId) {
        const neighbors = [];
        this.connections.forEach(([a, b]) => {
            if (a === nodeId) neighbors.push(b);
            if (b === nodeId) neighbors.push(a);
        });
        return neighbors.map(id => this.routeGrid.find(n => n.id === id));
    },
    
    // 更新主画面
    updateMainView() {
        const node = this.getCurrentNode();
        
        // 首次进入的SAN压力
        if (!node.visited) {
            if (node.type === 'main_story') {
                this.log('压力', `进入${node.name}，未知的恐惧袭来...`);
                this.addSanityToAll(8);
            } else if (node.type === 'story') {
                this.log('压力', '这个房间让人感到不安...');
                this.addSanityToAll(5);
            }
        }
        
        node.visited = true;
        
        // 根据房间类型显示不同内容
        switch(node.type) {
            case 'start':
            case 'story':
            case 'main_story':
                this.showStoryRoom(node);
                break;
            case 'combat':
                this.showCombatRoom(node);
                break;
            case 'boss':
                this.showBossRoom(node);
                break;
            case 'exit':
                this.showEnding();
                break;
            default:
                this.showRouteView();
        }
    },
    
    // 显示剧情房间
    showStoryRoom(node) {
        const story = this.storyData[node.story];
        if (!story) {
            this.showRouteView();
            return;
        }
        
        const content = document.getElementById('mainContent');
        document.getElementById('sceneTitle').textContent = node.name;
        document.getElementById('sceneSubtitle').textContent = story.subtitle || '调查进行中';
        
        let html = '<div class="story-room">';
        
        // 环境描述
        html += `<div class="story-desc">${story.desc}</div>`;
        
        // 调查员动态对话
        if (story.dialog) {
            html += '<div class="story-dialog">';
            this.team.forEach((inv, idx) => {
                const sanState = this.getSanityState(inv.sanity);
                const dialog = this.getDialog(inv, story.dialog, sanState.key);
                html += `
                    <div class="dialog-line">
                        <span class="dialog-speaker">${inv.name} [${sanState.name}]:</span>
                        <span class="dialog-text">"${dialog}"</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // 发现物
        if (story.discoveries && !node.discovered) {
            html += '<div class="story-discoveries">';
            html += '<div class="section-title">📦 发现物</div>';
            story.discoveries.forEach(d => {
                html += `<div class="discovery-item" onclick="game.examineDiscovery('${node.id}', '${d.id}')">${d.icon} ${d.name}</div>`;
            });
            html += '</div>';
        }
        
        // 选择
        if (story.choices) {
            html += '<div class="story-choices">';
            story.choices.forEach((c, idx) => {
                html += `<button class="action-btn large" onclick="game.makeStoryChoice('${node.id}', ${idx})">${c.text}</button>`;
            });
            html += '</div>';
        }
        
        html += '</div>';
        content.innerHTML = html;
        document.getElementById('actionPanel').style.display = 'none';
    },
    
    // 获取动态对话
    getDialog(inv, dialogData, sanState) {
        const prof = inv.key;
        const style = inv.dialogStyle;
        
        // 优先使用职业+SAN特定对话
        if (dialogData[prof] && dialogData[prof][sanState]) {
            return dialogData[prof][sanState];
        }
        // 其次使用职业默认
        if (dialogData[prof] && dialogData[prof].default) {
            return dialogData[prof].default;
        }
        // 最后使用通用
        return dialogData.default || '...';
    },
    
    // 检查发现物
    examineDiscovery(nodeId, discoveryId) {
        const node = this.routeGrid.find(n => n.id === nodeId);
        const story = this.storyData[node.story];
        const discovery = story.discoveries.find(d => d.id === discoveryId);
        
        if (!discovery) return;
        
        this.log('调查', `${this.team[0].name} 检查了 ${discovery.name}`);
        
        // 显示详细描述
        this.showModal(discovery.name, discovery.detail, () => {
            // 如果是线索，添加到线索清单
            if (discovery.clue) {
                this.addClue(discovery.clue);
            }
            // 标记为已发现
            if (!node.discovered) node.discovered = [];
            node.discovered.push(discoveryId);
            
            // 继续显示房间
            this.showStoryRoom(node);
        });
    },
    
    // 做出剧情选择
    makeStoryChoice(nodeId, choiceIdx) {
        const node = this.routeGrid.find(n => n.id === nodeId);
        const story = this.storyData[node.story];
        const choice = story.choices[choiceIdx];
        
        this.log('选择', `${this.team[this.state.selectedInvestigator].name}: ${choice.text}`);
        
        // 应用选择效果
        if (choice.effects) {
            this.applyChoiceEffects(choice.effects);
        }
        
        // 设置剧情标记
        if (choice.flag) {
            this.state.storyFlags[choice.flag] = true;
        }
        
        // 即死判定
        if (choice.instantDeath) {
            this.handleInstantDeath(choice.instantDeath);
            return;
        }
        
        // 进入战斗
        if (choice.combat) {
            this.enterCombat(choice.combat);
            return;
        }
        
        // 移动到下一节点或显示结果
        if (choice.next) {
            this.moveToNode(choice.next);
        } else {
            this.showRouteView();
        }
    },
    
    // 应用选择效果
    applyChoiceEffects(effects) {
        // 决心值
        if (effects.resolve) {
            Object.entries(effects.resolve).forEach(([key, val]) => {
                this.state.resolve[key] += val;
                this.log('决心', `${key} +${val}`);
            });
        }
        
        // SAN变化
        if (effects.san) {
            if (effects.san.all) {
                this.addSanityToAll(effects.san.all);
            }
        }
        
        // 获得物品
        if (effects.item) {
            this.log('获得', effects.item.name);
            // 添加到队伍物品
        }
        
        // 获得buff
        if (effects.buff) {
            this.addBuff(effects.buff);
        }
    },
    
    // 处理即死
    handleInstantDeath(deathData) {
        const victim = this.team[deathData.target || 0];
        victim.hp = 0;
        
        this.log('💀 即死', deathData.desc);
        this.log('系统', `${victim.name} 死亡...`);
        
        // 幸存者获得debuff
        if (deathData.survivorDebuff) {
            this.addBuff(deathData.survivorDebuff);
        }
        
        // 检查是否全灭
        const alive = this.team.filter(i => i.hp > 0);
        if (alive.length === 0) {
            this.gameOver('第9小队全军覆没...');
        } else {
            this.showModal('悲剧', deathData.desc, () => {
                this.showRouteView();
            });
        }
    },
    
    // 添加线索
    addClue(clueData) {
        if (!this.state.clues.find(c => c.id === clueData.id)) {
            this.state.clues.push(clueData);
            this.log('线索', `获得: ${clueData.name}`);
            
            // 检查线索收集奖励
            if (this.state.clues.length >= 3) {
                this.log('系统', '收集的线索已经足够影响Boss战');
            }
        }
    },
    
    // 添加buff
    addBuff(buffId) {
        if (!this.state.buffs.includes(buffId)) {
            this.state.buffs.push(buffId);
            const buff = this.buffsList[buffId];
            this.log('状态', `获得: ${buff.name} - ${buff.desc}`);
        }
    },
    
    // 主轴房间故事数据
    storyData: {
        // 第一幕：入口
        collapse: {
            subtitle: '新鲜的痕迹',
            desc: '通道被碎石部分堵塞，但还有一条窄缝可以通过。墙上有新鲜的划痕——有人用匕首刻下了符号，看起来是匆忙中留下的。',
            dialog: {
                archaeologist: {
                    calm: '这是拉丁语"危险"的意思，但最后一个字母被人改成了"邀请"...',
                    default: '这个符号...有问题...'
                },
                soldier: {
                    calm: '要么是我们的人被逼疯了，要么...有什么东西在模仿我们。',
                    default: '保持警惕。'
                },
                occultist: {
                    calm: '我能感觉到...符号上有残留的能量...是活物留下的。',
                    default: '有什么东西在这里...'
                }
            },
            discoveries: [
                { id: 'dagger', icon: '🗡️', name: 'DIA制式匕首', detail: '第7小队成员的装备，刀刃上有干涸的血迹。刻痕是用这把匕首留下的。', clue: { id: 'warning', name: '被篡改的警告', desc: '符号原本意为"危险"，但被改成了"邀请"。深渊在模仿人类？' } }
            ],
            choices: [
                { text: '✓ 强行通过', effects: { resolve: { survive: 5 }, san: { all: 3 } }, next: 'camp' },
                { text: '🔍 仔细检查符号', effects: { resolve: { seekTruth: 10 } }, next: 'camp' }
            ]
        },
        
        // 第一幕主轴：第7小队营地
        camp: {
            subtitle: '失踪者的痕迹',
            desc: '一个相对开阔的洞室，显然是第7小队的临时营地。床铺整齐，装备箱未打开——他们离开得很匆忙。中央的桌子上，一盏煤油灯还在微微燃烧...他们离开不超过6小时。',
            dialog: {
                archaeologist: {
                    calm: '6小时...如果他们还活着，可能就在不远处。',
                    default: '这里发生过什么...'
                },
                soldier: {
                    calm: '检查武器箱，看看他们带走了什么。',
                    default: '小心陷阱。'
                },
                occultist: {
                    calm: '能量残留很强...他们接触了什么强大的存在。',
                    default: '有什么东西经过这里...'
                }
            },
            discoveries: [
                { id: 'diary', icon: '📖', name: '马库斯的日记', detail: '日记的最后几页："11月15日。我们找到了他。埃德蒙·布莱克伍德主教。他曾是DIA最资深的顾问，3个月前失踪。他没有被绑架。他是自愿来到这里的。他说他发现了一个可怕的真相：深渊不是威胁，而是...屏障。

11月16日。我试图说服他，但他已经听不进去了。他说仪式需要"3个媒介"，需要"自愿的参与者"。他看向我们的眼神...像是在看候选人。我们必须阻止他。"', clue: { id: 'bishop', name: '埃德蒙·布莱克伍德', desc: 'DIA前资深顾问，自愿进入深渊，认为仪式可以阻止更大的灾难。' } },
                { id: 'map', icon: '🗺️', name: '地图标记', detail: '马库斯标记了两条路径："上分支：主教的活动区域"、"下分支：村民的聚集地"。两条路最终都会到达仪式大厅。' }
            ],
            choices: [
                { text: '🏃 追击主教（上分支）', effects: { resolve: { stopRitual: 15 } }, next: 'fork', flag: 'choose_upper' },
                { text: '👥 寻找村民（下分支）', effects: { resolve: { protect: 15 } }, next: 'fork', flag: 'choose_lower' },
                { text: '🔍 继续搜集情报', effects: { resolve: { seekTruth: 10 }, san: { all: 3 } }, next: 'fork' }
            ]
        },
        
        // 第二幕上主轴：藏书室
        library: {
            subtitle: '主教的真实',
            desc: '埃德蒙·布莱克伍德的私人空间。墙上贴满了研究报告和...照片？是DIA成立初期的合影，年轻的埃德蒙站在中央，笑容自信。角落里，你们发现了他和一位女子的合影——背景是某个深渊裂隙。',
            dialog: {
                archaeologist: {
                    calm: '这些笔记...他研究了17处深渊遗迹。如果他都倒向了深渊...',
                    default: '这些研究太深入了...'
                },
                soldier: {
                    calm: '不管他的动机是什么，利用无辜村民就是错误的。',
                    default: '他被深渊腐蚀了。'
                },
                occultist: {
                    calm: '如果我们能帮他完善替代方法...不需要牺牲，也能强化封印？',
                    default: '他走得太远了...'
                }
            },
            discoveries: [
                { id: 'notes', icon: '📄', name: '埃德蒙的研究笔记', detail: '"我不期望有人能理解我。3个月前，我在第9裂隙发现了完整的文献。深渊不是随机出现的。它们是封印，封印着某种存在——文献称之为深渊之主。

唯一的方法是：成为守门人。仪式不是召唤它，而是强化封印——以一个人的意识为代价，永远困在深渊边缘。

我需要的3个媒介：1.深渊之血 2.守门人的誓言 3.活的祭品。但我不愿使用这个。我找到了替代方法：用深渊能量喂养的凡人灵魂。"

最后一段话的字迹颤抖："艾琳娜会理解我吗？她为了阻止第3裂隙，已经...如果她在，她会怎么做？"', clue: { id: 'truth', name: '仪式的真相', desc: '仪式目的是强化封印而非召唤，埃德蒙想用村民替代活人祭品。' } },
                { id: 'photo', icon: '🖼️', name: '破碎的合影', detail: '照片上的女子：艾琳娜·布莱克伍德，埃德蒙的妻子，DIA传奇调查员，2年前在第3裂隙事件中确认阵亡。照片背面写着："等我。"', clue: { id: 'elena', name: '艾琳娜还活着', desc: '埃德蒙相信艾琳娜被困在深渊边缘，他想替换她出来。' } }
            ],
            choices: [
                { text: '💬 "我们可以一起找其他方法！"', effects: { resolve: { stopRitual: 10, protect: 10 } }, next: 'upper3', flag: 'bishop_persuaded' },
                { text: '⚔️ "你已经被深渊腐蚀了！"', effects: { resolve: { stopRitual: 20 } }, next: 'upper3' },
                { text: '💔 "艾琳娜不会希望看到这样的你。"', effects: { resolve: { seekTruth: 15 } }, next: 'upper3', flag: 'elena_mentioned' }
            ]
        },
        
        // 第二幕下主轴：深渊边缘
        abyss_edge: {
            subtitle: '马库斯的终末',
            desc: '你们来到了裂隙边缘。不是比喻，是真正的空间裂缝——黑色的虚无悬浮在矿坑尽头，散发着无法理解的"光芒"。在裂隙前，你们发现了马库斯队长。他浑身是血，但还活着。',
            dialog: {
                archaeologist: {
                    calm: '马库斯队长！坚持住，我们来救你了！',
                    default: '他还活着...但快不行了...'
                },
                soldier: {
                    calm: '别说话，保存体力！',
                    default: '该死...没有医疗设备...'
                },
                occultist: {
                    calm: '他的灵魂...正在被什么东西吸走...',
                    default: '救不了他了...'
                }
            },
            discoveries: [
                { id: 'marcus', icon: '👤', name: '马库斯队长', detail: '马库斯艰难地抓住你的手："听着...主教...他不是坏人...他在保护她。艾琳娜·布莱克伍德，他的妻子。2年前第3裂隙事件，她没有死。她被困在了深渊边缘，成为了某种守门人。埃德蒙想要替换她。"

他的眼神逐渐涣散："但最可怕的是...如果他说的是真的呢？如果深渊之主真的在苏醒，我们除了成为守门人，还有其他选择吗？阻止他...但请记住...有时候，敌人也是受害者..."', clue: { id: 'marcus_truth', name: '马库斯的遗言', desc: '艾琳娜被困在深渊边缘成为守门人，埃德蒙想救她出来。' } }
            ],
            choices: [
                { text: '💉 尝试救治（消耗镇静剂）', effects: { resolve: { protect: 20 } }, next: 'lower3' },
                { text: '✋ 让他安心离去', effects: { resolve: { seekTruth: 10 }, san: { all: 5 } }, next: 'lower3', flag: 'marcus_dead' },
                { text: '❓ "告诉我们怎么阻止仪式！"', effects: { resolve: { stopRitual: 15 } }, next: 'lower3' }
            ]
        },
        
        // 第三幕入口
        antechamber: {
            subtitle: '最终抉择之地',
            desc: '无论你们选择了哪条路，最终都来到了这里。仪式正在进行——黑色的能量柱从裂隙中升起，埃德蒙·布莱克伍德站在光柱中央，他的身体已经开始与深渊同化。',
            dialog: {
                archaeologist: {
                    calm: '还来得及，埃德蒙！我们可以一起找到更好的方法！',
                    default: '他已经走得太远了...'
                },
                soldier: {
                    calm: '埃德蒙·布莱克伍德，以DIA的名义，命令你停止仪式！',
                    default: '准备战斗...'
                },
                occultist: {
                    calm: '我能感受到艾琳娜的灵魂...她还在那里，埃德蒙！',
                    default: '深渊的力量太强了...'
                }
            },
            choices: [
                { text: '⚔️ 强行阻止（进入Boss战）', effects: {}, combat: 'bishop_normal' },
                { text: '💬 尝试说服', effects: {}, next: 'boss', flag: 'try_persuade' },
                { text: '[线索≥3] 展示收集的证据', effects: {}, next: 'boss', flag: 'show_evidence' },
                { text: '[有艾琳娜线索] "艾琳娜不会希望这样！"', effects: {}, next: 'boss', flag: 'elena_emotion' }
            ]
        }
    },
    
    // 显示路线选择
    showRouteView() {
        const node = this.getCurrentNode();
        const content = document.getElementById('mainContent');
        
        document.getElementById('sceneTitle').textContent = node.name;
        document.getElementById('sceneSubtitle').textContent = '选择前进方向';
        
        let html = '<div class="route-view">';
        html += `<div class="room-desc">${node.desc || '前方有路可走'}</div>`;
        
        const neighbors = this.getNeighbors(node.id).filter(n => {
            return n.visited || this.canAccess(node, n);
        });
        
        html += '<div class="direction-grid">';
        neighbors.forEach(neighbor => {
            let arrow = '';
            if (neighbor.x > node.x) arrow = '➡️';
            else if (neighbor.x < node.x) arrow = '⬅️';
            else if (neighbor.y < node.y) arrow = '⬆️';
            else if (neighbor.y > node.y) arrow = '⬇️';
            
            const visitedMark = neighbor.visited ? '✓' : '?';
            const typeIcon = neighbor.type === 'main_story' ? '📜' : neighbor.type === 'combat' ? '⚔️' : '';
            
            html += `
                <button class="direction-btn" onclick="game.moveToNode('${neighbor.id}')">
                    <div class="dir-arrow">${arrow}</div>
                    <div class="dir-name">${typeIcon} ${neighbor.name} ${visitedMark}</div>
                </button>
            `;
        });
        
        html += '</div></div>';
        content.innerHTML = html;
        document.getElementById('actionPanel').style.display = 'none';
    },
    
    // 移动节点
    moveToNode(nodeId) {
        const nodeIndex = this.routeGrid.findIndex(n => n.id === nodeId);
        if (nodeIndex === -1) return;
        
        this.state.turn++;
        this.state.currentRoute = nodeIndex;
        
        this.log('移动', `第${this.state.turn}回合: 到达${this.routeGrid[nodeIndex].name}`);
        this.updateMainView();
        this.updateStatus();
    },
    
    // 检查是否可以访问
    canAccess(from, to) {
        const hasConnection = this.connections.some(([a, b]) => {
            return (a === from.id && b === to.id) || (b === from.id && a === to.id);
        });
        return hasConnection;
    },
    
    // SAN相关方法
    getSanityState(sanity) {
        for (const [key, state] of Object.entries(this.sanityStates)) {
            if (sanity >= state.min && sanity <= state.max) {
                return { key, ...state };
            }
        }
        return this.sanityStates.calm;
    },
    
    addSanity(inv, amount) {
        inv.sanity = Math.min(100, inv.sanity + amount);
        if (inv.sanity >= 100 && !inv.affliction && !inv.virtue) {
            this.triggerSanityBreak(inv);
        }
    },
    
    addSanityToAll(amount) {
        this.team.forEach(inv => this.addSanity(inv, amount));
    },
    
    triggerSanityBreak(inv) {
        if (Math.random() < 0.15) {
            inv.virtue = '坚定';
            this.log('✨ Virtue', `${inv.name} 获得了坚定的意志！`);
        } else {
            const affs = ['偏执', '绝望', '狂躁', '自闭'];
            inv.affliction = affs[Math.floor(Math.random() * affs.length)];
            this.log('💔 Affliction', `${inv.name} 陷入${inv.affliction}！`);
        }
    },
    
    // 更新状态栏
    updateStatus() {
        this.team.forEach((inv, idx) => {
            const hpBar = document.getElementById(`hpBar${idx}`);
            const hpText = document.getElementById(`hpText${idx}`);
            const sanBar = document.getElementById(`sanBar${idx}`);
            const sanText = document.getElementById(`sanText${idx}`);
            const statusLabel = document.getElementById(`statusLabel${idx}`);
            
            if (hpBar) hpBar.style.width = (inv.hp / inv.maxHp * 100) + '%';
            if (hpText) hpText.textContent = `${inv.hp}/${inv.maxHp}`;
            if (sanBar) sanBar.style.width = (inv.sanity / 100 * 100) + '%';
            if (sanText) sanText.textContent = inv.sanity;
            
            if (statusLabel) {
                const sanState = this.getSanityState(inv.sanity);
                let statusText = sanState.name;
                if (inv.affliction) statusText += ` 💔${inv.affliction}`;
                if (inv.virtue) statusText += ` ✨${inv.virtue}`;
                statusLabel.textContent = statusText;
                statusLabel.style.color = sanState.color;
            }
        });
        
        // 更新决心值显示
        const resolveDiv = document.getElementById('resolveDisplay');
        if (resolveDiv) {
            resolveDiv.innerHTML = `
                阻止:${this.state.resolve.stopRitual} 
                真相:${this.state.resolve.seekTruth} 
                保护:${this.state.resolve.protect}
            `;
        }
    },
    
    // 日志
    log(type, msg) {
        const panel = document.getElementById('logPanel');
        if (!panel) return;
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `[${this.state.turn}] ${type}: ${msg}`;
        panel.appendChild(entry);
        panel.scrollTop = panel.scrollHeight;
    },
    
    // 弹窗
    showModal(title, text, onConfirm) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').textContent = text;
        document.getElementById('modal').classList.add('show');
        this.modalCallback = onConfirm;
    },
    
    closeModal() {
        document.getElementById('modal').classList.remove('show');
        if (this.modalCallback) {
            this.modalCallback();
            this.modalCallback = null;
        }
    },
    
    // 结局
    showEnding() {
        const r = this.state.resolve;
        let ending = '';
        let desc = '';
        
        if (r.stopRitual >= 60 && this.team.every(i => i.hp > 0)) {
            ending = '🏆 英雄结局';
            desc = '你们成功阻止了仪式，救出了艾琳娜，并找到了不牺牲任何人就能维持封印的方法。埃德蒙被DIA逮捕，但他的研究为理解深渊提供了宝贵资料。';
        } else if (r.stopRitual >= 60) {
            ending = '😢 牺牲结局';
            desc = '一名调查员替代艾琳娜成为守门人，永远困在深渊边缘。其他人回到地面，但永远无法忘记那个身影。';
        } else if (r.seekTruth >= 60) {
            ending = '📚 真相结局';
            desc = '你们和埃德蒙合作，完成了他的研究，找到了第三种方法——让深渊沉睡。但代价是永远无法完全理解深渊的本质。';
        } else if (r.protect >= 60) {
            ending = '💔 悲剧结局';
            desc = '你们救出了艾琳娜，但她和埃德蒙都已经无法回到正常生活。两人选择一起留在深渊边缘，成为永恒的守门人。';
        } else if (r.survive >= 40) {
            ending = '🏃 逃离结局';
            desc = '你们意识到无法阻止仪式，选择带着情报逃离。深渊之主没有完全苏醒，但封印被削弱...这只是时间问题。';
        } else {
            ending = '💀 末日结局';
            desc = '深渊之主苏醒。在最后的意识中，你们感受到一双眼睛在黑暗中睁开，看向你们..."谢谢你...帮我解开封印..."';
        }
        
        this.showModal(ending, desc, () => location.reload());
    },
    
    // 游戏结束
    gameOver(reason) {
        this.showModal('游戏结束', reason, () => location.reload());
    },
    
    // 战斗相关（简化版）
    showCombatRoom(node) {
        this.log('系统', `进入战斗区域: ${node.name}`);
        // 简化实现，直接标记为通过
        node.cleared = true;
        this.showRouteView();
    },
    
    showBossRoom(node) {
        this.showEnding();
    },
    
    enterCombat(type) {
        this.log('系统', '进入战斗！');
        // 简化实现
        this.showRouteView();
    }
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    game.init();
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    game.init();
});
