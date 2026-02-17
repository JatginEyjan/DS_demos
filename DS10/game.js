// DS10 v8 - 13房间完整叙事版
// 每个房间都是独立完整的体验载体

const game = {
    // 游戏状态
    team: [],
    selectedProfessions: [],
    currentRoomIndex: 0,
    resolve: { stop: 0, truth: 0, protect: 0 },
    clues: [],
    flags: {},
    combatState: null,
    
    // 职业定义
    professions: {
        archaeologist: { name: '考古学家', hp: 70, maxHp: 70, san: 0, skills: {侦查:50,力量:30,神秘学:35} },
        soldier: { name: '前军人', hp: 90, maxHp: 90, san: 0, skills: {侦查:35,力量:55,神秘学:20} },
        occultist: { name: '神秘学者', hp: 50, maxHp: 50, san: 0, skills: {侦查:40,力量:20,神秘学:55} }
    },
    
    // 13个房间定义 - 每个房间都是完整体验
    rooms: [
        {
            id: 'entrance',
            name: '矿坑入口',
            desc: `<p>寒风裹挟着腐朽的气息从黑暗中涌出。</p>
                   <p>手电筒的光束在锈迹斑斑的铁轨上摇晃，照亮了前方坍塌的通道。</p>
                   <p>作为DIA第9小队，你们的任务是找到失踪的第7小队并阻止某种"仪式"。</p>`,
            discoveries: [],
            choices: [
                { text: '进入矿坑', desc: '开始探索深渊', action: 'next' }
            ]
        },
        {
            id: 'collapse',
            name: '塌陷通道',
            desc: `<p>通道被碎石部分堵塞，但还有一条窄缝可以通过。</p>
                   <p>你们注意到墙上有新鲜的划痕——有人用匕首刻下了符号。</p>
                   <p>${game.getDialog ? game.getDialog(0, 'symbols') : '考古学家: "这是警告标记..."'}</p>`,
            discoveries: [
                { id: 'symbols', icon: '✏️', name: '刻痕符号', desc: '拉丁语"危险"被改成了"邀请"' }
            ],
            choices: [
                { text: '强行通过', desc: '可能会触发什么...', action: 'check_trap', san: 5 },
                { text: '寻找其他路径', desc: '安全但耗时', action: 'next', san: 0 },
                { text: '仔细调查符号', desc: '考古学家优势', action: 'investigate_symbols', skill: '侦查', diff: 40 }
            ]
        },
        {
            id: 'equipment',
            name: '遗弃装备室',
            desc: `<p>一个侧室，显然是第7小队留下的临时补给点。</p>
                   <p>装备箱被匆忙打开，有些东西被带走了，但有些还留着。</p>
                   <p>地上有一张手写便条...</p>`,
            discoveries: [
                { id: 'note', icon: '📄', name: '手写便条', desc: '"如果我们没回来，不要深入。主教已经不是人了。——马库斯"' },
                { id: 'supplies', icon: '💊', name: '医疗物资', desc: '2支镇静剂' }
            ],
            choices: [
                { text: '拿走镇静剂', desc: 'SAN恢复道具', action: 'take_item', item: 'sedative', count: 2 },
                { text: '搜索更多物资', desc: '可能发现其他东西', action: 'search_room', skill: '侦查', diff: 35 },
                { text: '继续前进', desc: '时间紧迫', action: 'next' }
            ]
        },
        {
            id: 'strange_markings',
            name: '诡异壁画厅',
            desc: `<p>洞穴墙壁上出现了古老的壁画，描绘着某种仪式场景。</p>
                   <p>画中人们围着一个黑色裂隙，似乎在...献祭？</p>
                   <p>神秘学者感到一阵眩晕，这些图案似乎在"呼唤"着什么...</p>`,
            discoveries: [
                { id: 'mural', icon: '🎨', name: '古老壁画', desc: '描绘深渊仪式的场景' }
            ],
            choices: [
                { text: '研究壁画', desc: '神秘学检定，可能获得情报', action: 'study_mural', skill: '神秘学', diff: 45, san: 10 },
                { text: '拍照记录后离开', desc: '安全的选择', action: 'next', san: 3 },
                { text: '无视壁画快速通过', desc: '避免SAN伤害', action: 'next', san: 0 }
            ]
        },
        {
            id: 'camp',
            name: '第7小队营地',
            desc: `<p>一个相对开阔的洞室，是第7小队的临时营地。</p>
                   <p>床铺整齐，装备箱未打开——他们离开得很匆忙。</p>
                   <p>中央的桌子上，一盏煤油灯还在微微燃烧，马库斯队长的日记就摊开在桌上...</p>`,
            discoveries: [
                { id: 'diary', icon: '📖', name: '马库斯的日记', desc: '记录了他们发现埃德蒙主教的真相' }
            ],
            choices: [
                { text: '阅读日记', desc: '了解第7小队的发现', action: 'read_diary', resolve: {stop: 10, truth: 10} },
                { text: '检查其他装备', desc: '寻找有用物资', action: 'search_camp' },
                { text: '立即追赶', desc: '他们可能就在前面', action: 'next' }
            ],
            isMainStory: true
        },
        {
            id: 'whispering',
            name: '低语回廊',
            desc: `<p>通道变得狭窄，墙壁上渗出水珠。</p>
                   <p>你们听到了...低语声？像是有人在你们耳边说话，但听不清内容。</p>
                   <p>前军人举起武器："保持警惕，这可能是某种陷阱。"</p>`,
            discoveries: [
                { id: 'whispers', icon: '👂', name: '深渊低语', desc: '无法理解的声音，似乎在诱导什么' }
            ],
            choices: [
                { text: '倾听低语', desc: '可能获得线索，但SAN伤害高', action: 'listen_whispers', san: 15 },
                { text: '捂住耳朵快速通过', desc: '减少SAN伤害', action: 'next', san: 5 },
                { text: '寻找声音来源', desc: '侦查检定', action: 'find_source', skill: '侦查', diff: 40 }
            ]
        },
        {
            id: 'fork',
            name: '矿道分叉',
            desc: `<p>通道在这里分成两条路。</p>
                   <p>左边通向仪式准备区，有微弱的火光和人声。</p>
                   <p>右边通向深渊边缘，传来不祥的能量波动。</p>
                   <p>你们必须做出选择...</p>`,
            discoveries: [],
            choices: [
                { text: '⬆️ 前往教导厅（上分支）', desc: '了解仪式的秘密', action: 'goto_upper' },
                { text: '⬇️ 前往深渊边缘（下分支）', desc: '寻找第7小队踪迹', action: 'goto_lower' }
            ],
            isFork: true
        },
        // 上分支房间
        {
            id: 'teaching',
            name: '教导厅',
            desc: `<p>一个昏暗的大厅，墙上刻满了符号。</p>
                   <p>几个村民坐在地上，眼神空洞，反复背诵着某种祷文。</p>
                   <p>讲台上的笔记揭示着埃德蒙的真实想法...</p>`,
            discoveries: [
                { id: 'notes', icon: '📚', name: '埃德蒙的笔记', desc: '他相信深渊是屏障，仪式是拯救人类的唯一方法' }
            ],
            choices: [
                { text: '阅读笔记', desc: '了解埃德蒙的动机', action: 'read_edmund_notes', resolve: {truth: 15} },
                { text: '试图唤醒村民', desc: '可能获得帮助', action: 'wake_villagers', skill: '力量', diff: 50 },
                { text: '悄悄离开', desc: '避免冲突', action: 'next_branch' }
            ],
            branch: 'upper'
        },
        {
            id: 'library',
            name: '主教藏书室',
            desc: `<p>埃德蒙的私人空间，墙上贴满了研究报告。</p>
                   <p>你们发现了一张照片：年轻的埃德蒙和一个女子，背景是深渊裂隙。</p>
                   <p>照片背面写着："艾琳娜，愿深渊永远封印。"</p>`,
            discoveries: [
                { id: 'photo', icon: '🖼️', name: '旧照片', desc: '埃德蒙和他的妻子艾琳娜' },
                { id: 'research', icon: '📋', name: '研究报告', desc: '深渊不是威胁，而是封印某种存在的屏障' }
            ],
            choices: [
                { text: '查看照片', desc: '了解埃德蒙的过去', action: 'check_photo', resolve: {protect: 10} },
                { text: '阅读研究报告', desc: '关于深渊的真相', action: 'read_research', resolve: {truth: 20} },
                { text: '搜索逃生路线', desc: '以防万一', action: 'search_exit', skill: '侦查', diff: 40 }
            ],
            branch: 'upper',
            isMainStory: true
        },
        {
            id: 'guard_room',
            name: '守卫室',
            desc: `<p>一个被改造成哨站的洞室。</p>
                   <p>地上有拖拽的痕迹和...血迹？</p>
                   <p>突然，一个被深渊腐蚀的守卫从阴影中走出！他的眼睛泛着红光...</p>`,
            discoveries: [],
            choices: [
                { text: '⚔️ 迎战守卫', desc: '战斗不可避免', action: 'combat', enemy: 'guard' },
                { text: '尝试沟通', desc: '他曾是DIA的人...', action: 'talk_guard', skill: '侦查', diff: 45 }
            ],
            isCombat: true,
            branch: 'upper'
        },
        // 下分支房间
        {
            id: 'sacrifice_pit',
            name: '牺牲坑道',
            desc: `<p>向下的斜坡，空气中弥漫着血腥味。</p>
                   <p>你们看到了...手术台？这是埃德蒙"处理"不适合参与者的地方。</p>
                   <p>一个半疯的村民蜷缩在角落...</p>`,
            discoveries: [
                { id: 'survivor', icon: '😰', name: '幸存村民', desc: '神志不清，但可能知道什么' }
            ],
            choices: [
                { text: '救助村民', desc: '消耗药品，获得情报', action: 'help_survivor', item: 'sedative', resolve: {protect: 15} },
                { text: '询问情报', desc: '他知道的关于仪式的一切', action: 'question_survivor' },
                { text: '无视他继续前进', desc: '冷酷但安全', action: 'next_branch', resolve: {survive: 10} }
            ],
            branch: 'lower'
        },
        {
            id: 'abyss_edge',
            name: '深渊边缘',
            desc: `<p>你们来到了裂隙边缘。黑色的虚无悬浮在矿坑尽头。</p>
                   <p>在裂隙前，你们发现了马库斯队长。他浑身是血，但还活着...</p>
                   <p>"听着..."他艰难地说，"埃德蒙不是在保护我们...他是在保护'她'..."</p>`,
            discoveries: [
                { id: 'marcus', icon: '💂', name: '马库斯队长', desc: '第7小队唯一的幸存者' },
                { id: 'symbol', icon: '✋', name: '保护符号', desc: '马库斯在你们手心画下的印记' }
            ],
            choices: [
                { text: '听他的遗言', desc: '了解艾琳娜的真相', action: 'marcus_words', resolve: {truth: 20, protect: 10} },
                { text: '尝试救治他', desc: '消耗所有药品', action: 'save_marcus', item: 'sedative', count: 99 },
                { text: '记录后离开', desc: '时间紧迫', action: 'next_branch' }
            ],
            branch: 'lower',
            isMainStory: true
        },
        {
            id: 'trap_spirit',
            name: '实验场',
            desc: `<p>深渊人体实验的现场，空气中充满腐败的气息。</p>
                   <p>一个扭曲的生物从阴影中现身——陷阱精灵，由深渊能量构成的怪物！</p>
                   <p>它发出刺耳的尖啸，SAN值开始快速流失...</p>`,
            discoveries: [],
            choices: [
                { text: '⚔️ 迎战怪物', desc: '高SAN伤害，小心', action: 'combat', enemy: 'trap_spirit' },
                { text: '利用环境逃脱', desc: '力量检定', action: 'escape_trap', skill: '力量', diff: 50 }
            ],
            isCombat: true,
            branch: 'lower'
        },
        // 汇合点
        {
            id: 'ritual_hall',
            name: '仪式大厅',
            desc: `<p>终于来到了核心区域。仪式正在进行——</p>
                   <p>黑色的能量柱从裂隙中升起，埃德蒙站在光柱中央，身体开始与深渊同化。</p>
                   <p>能量柱中漂浮着艾琳娜，她的眼睛睁着，但只有无尽的黑暗...</p>
                   <p>埃德蒙转身："你们来了...我等待着有人能理解我...或者至少...能阻止我。"</p>`,
            discoveries: [],
            choices: [
                { text: '💬 尝试说服', desc: '利用了解的情报', action: 'ending_talk', needTruth: 30 },
                { text: '⚔️ 强行阻止', desc: '与埃德蒙战斗', action: 'combat', enemy: 'bishop' },
                { text: '✨ 自愿成为守门人', desc: '替代艾琳娜（需高保护决心）', action: 'ending_sacrifice', needProtect: 30 },
                { text: '🏃 撤退逃离', desc: '生存优先', action: 'ending_escape' }
            ],
            isBoss: true
        }
    ],
    
    // 初始化
    init() {
        this.showProfessionSelect();
    },
    
    // 显示职业选择
    showProfessionSelect() {
        console.log('showProfessionSelect called');
        const selectPanel = document.getElementById('professionSelect');
        const gamePanel = document.getElementById('gameUI');
        
        if (selectPanel) selectPanel.classList.remove('hidden');
        if (gamePanel) gamePanel.classList.add('hidden');
        
        // 重置选择
        this.selectedProfessions = [];
        
        // 重置卡片样式
        document.querySelectorAll('.profession-card').forEach(card => {
            card.classList.remove('selected');
            card.style.borderColor = '#2a2a3a';
            card.style.boxShadow = 'none';
        });
        
        this.updateSelectHint();
        console.log('Profession select ready');
    },
    
    // 选择职业
    selectProfession(key) {
        console.log('selectProfession called:', key);
        
        // 确保数组已初始化
        if (!this.selectedProfessions) {
            this.selectedProfessions = [];
        }
        
        if (this.selectedProfessions.includes(key)) {
            console.log('Already selected');
            return;
        }
        if (this.selectedProfessions.length >= 2) {
            console.log('Already have 2');
            return;
        }
        
        this.selectedProfessions.push(key);
        console.log('Selected:', this.selectedProfessions);
        
        this.updateSelectHint();
        
        // 高亮卡片
        const cards = document.querySelectorAll('.profession-card');
        const idx = this.selectedProfessions.length - 1;
        if (cards[idx]) {
            cards[idx].classList.add('selected');
            cards[idx].style.borderColor = '#27ae60';
            cards[idx].style.boxShadow = '0 0 15px rgba(39, 174, 96, 0.5)';
        }
        
        if (this.selectedProfessions.length === 2) {
            setTimeout(() => this.startGame(), 500);
        }
    },
    
    // 更新选择提示
    updateSelectHint() {
        console.log('updateSelectHint called, count:', this.selectedProfessions ? this.selectedProfessions.length : 0);
        const hint = document.getElementById('selectHint');
        if (hint) {
            const count = this.selectedProfessions ? this.selectedProfessions.length : 0;
            hint.textContent = `点击卡片选择 (${count}/2)`;
            hint.style.color = count > 0 ? '#27ae60' : '#666';
        } else {
            console.error('selectHint element not found!');
        }
    },
    
    // 开始游戏
    startGame() {
        // 创建队伍
        this.team = this.selectedProfessions.map((key, idx) => ({
            id: idx,
            ...this.professions[key],
            affliction: null,
            virtue: null,
            inventory: { sedative: 2 }
        }));
        
        // 切换界面
        document.getElementById('professionSelect').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        
        // 更新状态栏
        this.updateStatusBars();
        
        // 进入第一个房间
        this.currentRoomIndex = 0;
        this.enterRoom(0);
    },
    
    // 进入房间
    enterRoom(index) {
        this.currentRoomIndex = index;
        const room = this.rooms[index];
        
        // 更新标题
        document.getElementById('roomName').textContent = room.name;
        document.getElementById('roomSubtitle').textContent = `房间 ${index + 1}/13`;
        document.getElementById('roomCount').textContent = index + 1;
        
        // 构建房间HTML
        let html = '<div class="room-container">';
        
        // 描述
        html += `<div class="room-desc">${room.desc}</div>`;
        
        // 发现物
        if (room.discoveries && room.discoveries.length > 0) {
            html += '<div class="discoveries">';
            html += '<div class="discoveries-title">发现物</div>';
            room.discoveries.forEach(d => {
                html += `
                    <div class="discovery-item" onclick="game.examineDiscovery('${d.id}')">
                        <span class="discovery-icon">${d.icon}</span>
                        <span class="discovery-name">${d.name}</span>
                        <span class="discovery-desc">${d.desc}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // 选择按钮
        html += '<div class="room-choices">';
        room.choices.forEach((c, i) => {
            const combatClass = c.action === 'combat' ? 'combat' : '';
            html += `
                <button class="choice-btn ${combatClass}" onclick="game.makeChoice(${i})">
                    <span class="choice-title">${c.text}</span>
                    <span class="choice-desc">${c.desc}</span>
                </button>
            `;
        });
        html += '</div>';
        
        html += '</div>';
        
        document.getElementById('mainContent').innerHTML = html;
        
        // 日志
        this.log(`进入${room.name}`);
    },
    
    // 查看发现物
    examineDiscovery(id) {
        const room = this.rooms[this.currentRoomIndex];
        const d = room.discoveries.find(x => x.id === id);
        if (d && !this.clues.includes(d.name)) {
            this.clues.push(d.name);
            this.log(`获得线索: ${d.name}`);
            alert(`${d.name}\n\n${d.desc}`);
        }
    },
    
    // 做出选择
    makeChoice(choiceIndex) {
        const room = this.rooms[this.currentRoomIndex];
        const choice = room.choices[choiceIndex];
        
        // SAN伤害
        if (choice.san) {
            this.addSanityToAll(choice.san);
        }
        
        // 决心值
        if (choice.resolve) {
            if (choice.resolve.stop) this.resolve.stop += choice.resolve.stop;
            if (choice.resolve.truth) this.resolve.truth += choice.resolve.truth;
            if (choice.resolve.protect) this.resolve.protect += choice.resolve.protect;
            this.updateResolveDisplay();
        }
        
        // 物品
        if (choice.item && choice.action !== 'check_item') {
            const count = choice.count || 1;
            this.team.forEach(inv => {
                inv.inventory[choice.item] = (inv.inventory[choice.item] || 0) + count;
            });
            this.log(`获得 ${choice.item} x${count}`);
        }
        
        // 执行动作
        switch(choice.action) {
            case 'next':
                this.nextRoom();
                break;
            case 'combat':
                this.startCombat(choice.enemy);
                break;
            case 'goto_upper':
                this.gotoBranch('upper');
                break;
            case 'goto_lower':
                this.gotoBranch('lower');
                break;
            case 'next_branch':
                this.gotoMerge();
                break;
            case 'ending_talk':
                if (this.resolve.truth >= (choice.needTruth || 0)) {
                    this.showEnding('📚 真相结局', '你说服了埃德蒙，一起找到了让深渊沉睡的方法。');
                } else {
                    alert('情报不足，无法说服埃德蒙。');
                }
                break;
            case 'ending_sacrifice':
                if (this.resolve.protect >= (choice.needProtect || 0)) {
                    this.showEnding('😢 牺牲结局', '一名调查员替代艾琳娜成为守门人，永远困在深渊边缘。');
                } else {
                    alert('保护同伴的决心不够。');
                }
                break;
            case 'ending_escape':
                this.showEnding('🏃 逃离结局', '你们带着情报逃离，但深渊之主终将苏醒...');
                break;
            case 'read_diary':
                alert('马库斯的日记:\n\n"11月15日：我们找到了埃德蒙·布莱克伍德主教。他说深渊不是威胁，而是屏障。深渊之主正在苏醒，唯一的生存机会是主动完成仪式，成为守门人而非祭品。"\n\n"11月16日：我试图说服他，但他已经听不进去了。我们必须阻止他。"');
                this.nextRoom();
                break;
            default:
                this.nextRoom();
        }
    },
    
    // 下一个房间
    nextRoom() {
        if (this.currentRoomIndex < this.rooms.length - 1) {
            this.enterRoom(this.currentRoomIndex + 1);
        }
    },
    
    // 前往分支
    gotoBranch(branch) {
        // 找到对应分支的第一个房间
        const idx = this.rooms.findIndex(r => r.branch === branch);
        if (idx >= 0) {
            this.enterRoom(idx);
        }
    },
    
    // 前往汇合点
    gotoMerge() {
        const idx = this.rooms.findIndex(r => r.id === 'ritual_hall');
        if (idx >= 0) {
            this.enterRoom(idx);
        }
    },
    
    // 开始战斗
    startCombat(enemyType) {
        const enemies = {
            guard: { name: '腐化守卫', hp: 40, damage: 10, fear: 8 },
            trap_spirit: { name: '陷阱精灵', hp: 35, damage: 12, fear: 15 },
            bishop: { name: '邪教主教', hp: 80, damage: 15, fear: 20, isBoss: true }
        };
        
        this.combatState = {
            enemy: { ...enemies[enemyType] },
            log: []
        };
        
        this.renderCombat();
    },
    
    // 渲染战斗
    renderCombat() {
        const state = this.combatState;
        if (!state) return;
        
        // 检查战斗结束
        if (state.enemy.hp <= 0) {
            this.endCombat(true);
            return;
        }
        
        const aliveTeam = this.team.filter(i => i.hp > 0);
        if (aliveTeam.length === 0) {
            this.showEnding('💀 全员阵亡', '你们的尸体将永远留在深渊之中...');
            return;
        }
        
        let html = '<div class="combat-area">';
        
        // 敌人
        html += `
            <div class="enemy-display">
                <div class="enemy-name">${state.enemy.name}</div>
                <div class="enemy-hp-bar"><div class="enemy-hp-fill" style="width:${(state.enemy.hp/(state.enemy.maxHp||state.enemy.hp))*100}%"></div></div>
                <div class="enemy-hp-text">HP: ${state.enemy.hp}</div>
            </div>
        `;
        
        // 队伍
        html += '<div class="combat-team">';
        this.team.forEach((inv, idx) => {
            const cls = inv.hp > 0 ? (idx === 0 ? 'active' : '') : 'dead';
            html += `
                <div class="combat-inv-card ${cls}">
                    <div>${inv.name}</div>
                    <div style="font-size:10px;color:#888;">HP:${inv.hp}/${inv.maxHp}</div>
                </div>
            `;
        });
        html += '</div>';
        
        // 行动按钮
        html += '<div class="combat-actions">';
        html += '<button class="action-btn primary" onclick="game.combatAttack()">⚔️ 攻击</button>';
        html += '<button class="action-btn" onclick="game.combatUseItem()">💊 镇静剂</button>';
        html += '</div>';
        
        // 日志
        if (state.log.length > 0) {
            html += '<div style="margin-top:15px;text-align:left;font-size:11px;">';
            state.log.slice(-3).forEach(l => {
                html += `<div style="color:${l.color};margin-bottom:3px;">${l.text}</div>`;
            });
            html += '</div>';
        }
        
        html += '</div>';
        
        document.getElementById('mainContent').innerHTML = html;
    },
    
    // 战斗攻击
    combatAttack() {
        const state = this.combatState;
        const inv = this.team[0]; // 简化：总是第一个调查员攻击
        
        if (!inv || inv.hp <= 0) return;
        
        // 玩家攻击
        const dmg = inv.skills.力量 + Math.floor(Math.random() * 10);
        state.enemy.hp -= dmg;
        state.log.push({ text: `${inv.name} 造成 ${dmg} 伤害`, color: '#2ecc71' });
        
        // 敌人反击
        if (state.enemy.hp > 0) {
            setTimeout(() => {
                const dmg = state.enemy.damage + Math.floor(Math.random() * 5);
                inv.hp -= dmg;
                this.addSanity(inv, state.enemy.fear);
                state.log.push({ text: `${state.enemy.name} 反击 ${dmg} 伤害`, color: '#e94560' });
                state.log.push({ text: `${inv.name} SAN+${state.enemy.fear}`, color: '#7c3aed' });
                this.updateStatusBars();
                this.renderCombat();
            }, 300);
        } else {
            this.renderCombat();
        }
    },
    
    // 使用物品
    combatUseItem() {
        const inv = this.team[0];
        if (inv.inventory.sedative <= 0) {
            alert('没有镇静剂了！');
            return;
        }
        inv.inventory.sedative--;
        this.reduceSanity(inv, 15);
        this.combatState.log.push({ text: `${inv.name} 使用镇静剂 SAN-15`, color: '#3498db' });
        this.updateStatusBars();
        this.renderCombat();
    },
    
    // 结束战斗
    endCombat(victory) {
        this.combatState = null;
        if (victory) {
            alert('战斗胜利！获得10金币');
            this.team.forEach(inv => inv.inventory.gold = (inv.inventory.gold || 0) + 10);
            this.nextRoom();
        }
    },
    
    // 添加SAN
    addSanityToAll(amount) {
        this.team.forEach(inv => {
            inv.san = Math.min(100, inv.san + amount);
        });
        this.updateStatusBars();
    },
    
    reduceSanity(inv, amount) {
        inv.san = Math.max(0, inv.san - amount);
        this.updateStatusBars();
    },
    
    // 更新状态栏
    updateStatusBars() {
        this.team.forEach((inv, idx) => {
            const nameEl = document.getElementById(`inv${idx}Name`);
            const statusEl = document.getElementById(`inv${idx}Status`);
            const hpBar = document.getElementById(`inv${idx}HpBar`);
            const hpText = document.getElementById(`inv${idx}Hp`);
            const sanBar = document.getElementById(`inv${idx}SanBar`);
            const sanText = document.getElementById(`inv${idx}San`);
            
            if (nameEl) nameEl.textContent = inv.name;
            if (hpBar) hpBar.style.width = (inv.hp / inv.maxHp * 100) + '%';
            if (hpText) hpText.textContent = `${inv.hp}/${inv.maxHp}`;
            if (sanBar) sanBar.style.width = (inv.san / 100 * 100) + '%';
            if (sanText) sanText.textContent = inv.san;
            
            // 状态标签
            if (statusEl) {
                let state = 'calm';
                if (inv.san > 30) state = 'uneasy';
                if (inv.san > 50) state = 'nervous';
                if (inv.san > 70) state = 'fearful';
                if (inv.san > 85) state = 'breaking';
                statusEl.className = 'status-label ' + state;
                statusEl.textContent = state === 'calm' ? '冷静' : state === 'uneasy' ? '不安' : state === 'nervous' ? '紧张' : state === 'fearful' ? '恐惧' : '崩溃边缘';
            }
        });
    },
    
    // 更新决心值显示
    updateResolveDisplay() {
        const max = Math.max(this.resolve.stop, this.resolve.truth, this.resolve.protect, 1);
        
        document.getElementById('resolveStop').textContent = this.resolve.stop;
        document.getElementById('resolveStopBar').style.width = (this.resolve.stop / max * 100) + '%';
        
        document.getElementById('resolveTruth').textContent = this.resolve.truth;
        document.getElementById('resolveTruthBar').style.width = (this.resolve.truth / max * 100) + '%';
        
        document.getElementById('resolveProtect').textContent = this.resolve.protect;
        document.getElementById('resolveProtectBar').style.width = (this.resolve.protect / max * 100) + '%';
    },
    
    // 日志
    log(text) {
        const panel = document.getElementById('logPanel');
        const entry = document.createElement('div');
        entry.className = 'log-entry system';
        entry.textContent = text;
        panel.appendChild(entry);
        panel.scrollTop = panel.scrollHeight;
    },
    
    // 显示结局
    showEnding(title, desc) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').innerHTML = desc + '<br><br><button onclick="location.reload()" style="margin-top:15px;padding:10px 20px;background:#e94560;color:white;border:none;cursor:pointer;">再玩一次</button>';
        document.getElementById('modal').classList.add('show');
    },
    
    // 关闭弹窗
    closeModal() {
        document.getElementById('modal').classList.remove('show');
    }
};

// 启动
document.addEventListener('DOMContentLoaded', () => {
    game.init();
});
