// DS10 v0.1 - 13房间完整叙事版
// Version 0.1: 叙事骨架，简化机制

const game = {
    // 游戏状态
    team: [],
    selectedProfessions: [],
    currentRoom: 0,
    resolve: { stop: 0, truth: 0, protect: 0 },
    clues: [],
    flags: {},
    
    // 职业数据
    professions: {
        archaeologist: { 
            name: '考古学家', 
            hp: 70, maxHp: 70, 
            san: 0, 
            desc: '精通古代文献和符号学',
            dialog: {
                calm: '让我看看...这很有趣...',
                uneasy: '等等...这和古籍记载的有点像...',
                nervous: '不...这不可能...理论上是错误的...',
                fearful: '别看！它在动！它在看着我们！'
            }
        },
        soldier: { 
            name: '前军人', 
            hp: 90, maxHp: 90, 
            san: 0, 
            desc: '实战经验丰富',
            dialog: {
                calm: '保持队形，按计划行动。',
                uneasy: '该死...这种感觉不妙...',
                nervous: '我们...我们真的能应付吗？',
                fearful: '撤退！现在就撤退！'
            }
        },
        occultist: { 
            name: '神秘学者', 
            hp: 50, maxHp: 50, 
            san: 0, 
            desc: '能感知深渊能量',
            dialog: {
                calm: '我能感受到能量的流动...',
                uneasy: '有什么东西...在看着我们...',
                nervous: '它知道我们来了...它在笑...',
                fearful: '它在呼唤我...我能听到...'
            }
        }
    },
    
    // 13房间完整数据
    rooms: [
        // ========== 第一幕：觉醒 ==========
        {
            id: 'entrance',
            name: '矿坑入口',
            type: 'main',
            required: true,
            desc: `寒风裹挟着腐朽的气息从黑暗中涌出。

手电筒的光束在锈迹斑斑的铁轨上摇晃，照亮了前方坍塌的通道。你们站在深渊裂隙的入口，作为DIA第9小队，任务是找到失踪的第7小队并阻止某种"仪式"。

身后的通讯车里，指挥部最后的声音还在回响："如果48小时内没有回应，我们将封锁这个区域。祝你们好运。"

你们整理装备，彼此对视一眼。没有退路了。`,
            discoveries: [
                { id: 'mission', name: '任务简报', icon: '📋', text: 'DIA第7小队3天前在此失联。最后通讯提到"主教"、"仪式"、"深渊之主"。' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'entrance'),
            choices: [
                { text: '进入矿坑', next: 'collapse', desc: '开始探索深渊' }
            ]
        },
        {
            id: 'collapse',
            name: '塌陷通道',
            type: 'main',
            required: true,
            desc: `通道被碎石部分堵塞，但还有一条窄缝可以通过。

你们注意到墙上有新鲜的划痕——有人用匕首刻下了符号，看起来是匆忙中留下的。考古学家凑近观察，脸色变得凝重。

"这是拉丁语'危险'的意思，"她低声说，"但最后一个字母被人改成了'邀请'..."

碎石堆中隐约传来滴水的声音，在死寂的矿道中格外清晰。某种东西在深处等待着。`,
            discoveries: [
                { id: 'symbols', name: '刻痕符号', icon: '✏️', text: '拉丁语"危险"被改成了"邀请"。有人——或者某种东西——在诱导后来者深入。' },
                { id: 'footprints', name: '新鲜脚印', icon: '👣', text: 'DIA制式军靴的脚印，不超过6小时。第7小队，或者...其他什么东西。' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'symbols'),
            choices: [
                { text: '强行通过窄缝', next: 'equipment', desc: '快速但可能有风险', san: 5 },
                { text: '寻找其他路径', next: 'mural', desc: '安全但耗时', resolve: {survive: 5} }
            ]
        },
        {
            id: 'equipment',
            name: '遗弃装备室',
            type: 'side',
            required: false,
            desc: `一个侧室，显然是第7小队留下的临时补给点。

床铺整齐，装备箱未打开——他们离开得很匆忙。中央的桌子上，一盏煤油灯还在微微燃烧，仿佛主人只是暂时离开...但空气中弥漫的腐朽气息告诉你们，这里已经很久没有人了。

地上有一张手写便条，字迹潦草但还能辨认：`,
            discoveries: [
                { id: 'note', name: '马库斯的便条', icon: '📄', text: '"如果我们没回来，不要深入。主教已经不是人了。——马库斯"' },
                { id: 'supplies', name: '医疗物资', icon: '💊', text: '2支镇静剂。标签上写着"SAN稳定剂，紧急情况使用"。' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'abandoned'),
            choices: [
                { text: '拿走物资继续前进', next: 'camp', desc: '获得镇静剂', item: 'sedative', count: 2 },
                { text: '不碰任何东西，直接离开', next: 'camp', desc: '避免潜在诅咒' }
            ]
        },
        {
            id: 'mural',
            name: '诡异壁画厅',
            type: 'side',
            required: false,
            desc: `洞穴墙壁上出现了古老的壁画，描绘着某种仪式场景。

画中人们围着一个黑色裂隙，似乎在...献祭？壁画的风格不属于任何已知的古代文明，颜料中混杂着某种发光的矿物质，在手电筒照射下泛着诡异的蓝光。

神秘学者感到一阵眩晕。"这些图案...它们在'呼唤'着什么..."`,
            discoveries: [
                { id: 'mural', name: '古老壁画', icon: '🎨', text: '描绘深渊仪式的场景。考古学家认出这是"旧日支配者崇拜"的变体，比任何已知记录都要古老。' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'mural'),
            choices: [
                { text: '研究壁画', next: 'camp', desc: '获得深渊知识', san: 10, clue: '深渊真相' },
                { text: '拍照后快速离开', next: 'camp', desc: '安全保守', san: 3 }
            ]
        },
        {
            id: 'camp',
            name: '第7小队营地【主轴】',
            type: 'main',
            required: true,
            desc: `一个相对开阔的洞室，显然是第7小队的临时营地。

床铺整齐，装备箱未打开——他们离开得很匆忙。中央的桌子上，一盏煤油灯还在微微燃烧...马库斯队长的日记就摊开在桌上。

你们翻开日记，字迹从工整逐渐变得潦草，最后一页几乎是在颤抖中写下的：`,
            discoveries: [
                { id: 'diary', name: '马库斯的日记', icon: '📖', text: '"11月15日：我们找到了埃德蒙·布莱克伍德主教。他说深渊不是威胁，而是屏障。深渊之主正在苏醒，唯一的生存机会是成为守门人而非祭品。11月16日：我必须阻止他。即使这意味着..."' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'diary'),
            choices: [
                { text: '"我们必须阻止仪式！"', next: 'whisper', desc: '决心+阻止', resolve: {stop: 15} },
                { text: '"他说的是真的吗？"', next: 'whisper', desc: '决心+真相', resolve: {truth: 15} },
                { text: '沉默地合上日记', next: 'whisper', desc: '冷静但冷漠', resolve: {survive: 10} }
            ]
        },
        {
            id: 'whisper',
            name: '低语回廊',
            type: 'main',
            required: true,
            desc: `通道变得狭窄，墙壁上渗出水珠。

你们听到了...低语声？像是有人在你们耳边说话，但听不清内容。声音似乎在诱导你们——"来吧...看看真相...""放弃吧...太迟了..."

前军人举起武器："保持警惕，这可能是某种陷阱。"但他的声音也在颤抖。`,
            discoveries: [
                { id: 'whispers', name: '深渊低语', icon: '👂', text: '无法理解的语言，但 somehow 能明白意思。它在说："守门人必须自愿..."' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'whispers'),
            choices: [
                { text: '捂住耳朵快速通过', next: 'fork', desc: '减少SAN伤害', san: 5 },
                { text: '试图理解低语', next: 'fork', desc: '可能获得情报', san: 15, clue: '守门人秘密' }
            ]
        },
        {
            id: 'fork',
            name: '矿道分叉【抉择】',
            type: 'main',
            required: true,
            desc: `通道在这里分成两条路。

左边通向仪式准备区，你们隐约看到火光和人声——主教在那里教导村民仪式的步骤。

右边通向深渊边缘，传来不祥的能量波动，可能找到第7小队成员的踪迹...

调查员们交换眼神。资源有限，必须取舍。`,
            discoveries: [],
            dialog: (inv, san) => game.getDialog(inv, san, 'choice'),
            choices: [
                { text: '⬆️ 前往教导厅（上分支）', next: 'teaching', desc: '了解仪式的秘密' },
                { text: '⬇️ 前往深渊边缘（下分支）', next: 'pit', desc: '寻找第7小队' }
            ]
        },
        // ========== 第二幕：深渊（上分支）==========
        {
            id: 'teaching',
            name: '教导厅',
            type: 'main',
            required: true,
            branch: 'upper',
            desc: `一个昏暗的大厅，墙上刻满了你们不认识的符号。

几个村民坐在地上，眼神空洞，似乎在反复背诵着什么。讲台上的笔记揭示着埃德蒙的真实想法——他不只是疯了，他真的相信自己在拯救人类。`,
            discoveries: [
                { id: 'notes', name: '埃德蒙的笔记', icon: '📚', text: '"深渊之主不是神，是法则。当足够多的人意识到它，封印就会松动。唯一的方法是成为守门人——以一个人的意识为代价，永远困在深渊边缘，阻止它完全苏醒。"' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'edmund'),
            choices: [
                { text: '继续前往藏书室', next: 'library', desc: '了解埃德蒙的过去' }
            ]
        },
        {
            id: 'library',
            name: '藏书室【主轴】',
            type: 'main',
            required: true,
            branch: 'upper',
            desc: `埃德蒙·布莱克伍德的私人空间，墙上贴满了研究报告和...照片？

是DIA成立初期的合影，年轻的埃德蒙站在中央，笑容自信。另一张照片上，他和一个年轻女子，背景是某个深渊裂隙。

照片背面写着："艾琳娜，愿深渊永远封印。"日期是...2年前？

艾琳娜·布莱克伍德，DIA传奇调查员，2年前在第3裂隙事件中确认阵亡。但如果照片是真的...`,
            discoveries: [
                { id: 'photo', name: '旧照片', icon: '🖼️', text: '埃德蒙和他的妻子艾琳娜。照片背面写着"愿深渊永远封印"，日期是2年前——艾琳娜"死亡"之后。' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'elena'),
            choices: [
                { text: '⚔️ 迎战守卫，前往汇合点', next: 'ritual', desc: '战斗不可避免' }
            ]
        },
        // ========== 第二幕：深渊（下分支）==========
        {
            id: 'pit',
            name: '牺牲坑道',
            type: 'main',
            required: true,
            branch: 'lower',
            desc: `向下的斜坡，空气中弥漫着血腥味。

你们看到了...手术台？这是埃德蒙"处理"那些"不适合参与仪式"的人的地方。

一个半疯的村民蜷缩在角落，看到你们，他露出解脱的微笑："你们...也是来送死的？"`,
            discoveries: [
                { id: 'survivor', name: '幸存村民', icon: '😰', text: '"埃德蒙说我们不纯净，不能被深渊接受，所以他...研究我们...想知道为什么..."' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'survivor'),
            choices: [
                { text: '给他解脱', next: 'abyss', desc: '道德灰色', san: 5 },
                { text: '尝试救治', next: 'abyss', desc: '消耗药品', item: 'sedative', resolve: {protect: 15} }
            ]
        },
        {
            id: 'abyss',
            name: '深渊边缘【主轴】',
            type: 'main',
            required: true,
            branch: 'lower',
            desc: `你们来到了裂隙边缘。不是比喻，是真正的空间裂缝——黑色的虚无悬浮在矿坑尽头。

在裂隙前，你们发现了马库斯队长。他浑身是血，但还活着。看到你们，他露出解脱的微笑：

"听着...埃德蒙...他不是坏人...他只是...想救他的妻子..."

"艾琳娜...被困在深渊边缘...2年了...守门人...必须自愿..."

马库斯在你们手心画下一个符号，然后停止了呼吸。`,
            discoveries: [
                { id: 'symbol', name: '保护符号', icon: '✋', text: '马库斯用最后的力气画下的符号。不知道有什么用，但感觉...温暖。' }
            ],
            dialog: (inv, san) => game.getDialog(inv, san, 'marcus'),
            choices: [
                { text: '⚔️ 迎战怪物，前往汇合点', next: 'ritual', desc: '为马库斯报仇' }
            ]
        },
        // ========== 第三幕：终焉 ==========
        {
            id: 'ritual',
            name: '仪式大厅【终局】',
            type: 'main',
            required: true,
            desc: `终于来到了核心区域。仪式正在进行——

黑色的能量柱从裂隙中升起，埃德蒙·布莱克伍德站在光柱中央，他的身体已经开始与深渊同化。

在能量柱中，你们隐约看到一个人影——艾琳娜·布莱克伍德，漂浮在虚空之中，她的眼睛睁着，但已经看不到瞳仁，只有无尽的黑暗。

埃德蒙转身看向你们。他的身体一半是实体，一半是虚空。

"你们来了...我等待着有人能理解我...或者，至少...能阻止我。"`,
            discoveries: [],
            dialog: (inv, san) => game.getDialog(inv, san, 'final'),
            choices: [
                { text: '💬 "我们可以一起找更好的方法！"', ending: 'cooperate', desc: '尝试说服', need: {truth: 20} },
                { text: '⚔️ "你的痛苦不能成为伤害他人的理由！"', ending: 'fight', desc: '强行阻止' },
                { text: '✨ "我自愿成为守门人。"', ending: 'sacrifice', desc: '替代艾琳娜', need: {protect: 20} },
                { text: '🏃 撤退逃离', ending: 'escape', desc: '生存优先' }
            ]
        }
    ],
    
    // 获取对话
    getDialog(inv, san, situation) {
        const prof = this.professions[inv.key];
        let state = 'calm';
        if (san > 30) state = 'uneasy';
        if (san > 50) state = 'nervous';
        if (san > 70) state = 'fearful';
        return prof.dialog[state] || prof.dialog.calm;
    },
    
    // 初始化
    init() {
        this.showProfessionSelect();
    },
    
    // 显示职业选择
    showProfessionSelect() {
        document.getElementById('professionSelect').classList.remove('hidden');
        document.getElementById('gameUI').classList.add('hidden');
        this.selectedProfessions = [];
        document.querySelectorAll('.profession-card').forEach(c => {
            c.classList.remove('selected');
            c.style.borderColor = '#2a2a3a';
        });
        document.getElementById('selectHint').textContent = '点击卡片选择 (0/2)';
    },
    
    // 选择职业
    selectProfession(key) {
        if (this.selectedProfessions.includes(key)) return;
        if (this.selectedProfessions.length >= 2) return;
        
        this.selectedProfessions.push(key);
        document.getElementById('selectHint').textContent = `已选择 (${this.selectedProfessions.length}/2)`;
        
        const cards = document.querySelectorAll('.profession-card');
        const idx = ['archaeologist', 'soldier', 'occultist'].indexOf(key);
        if (cards[idx]) {
            cards[idx].classList.add('selected');
            cards[idx].style.borderColor = '#27ae60';
        }
        
        if (this.selectedProfessions.length === 2) {
            setTimeout(() => this.startGame(), 500);
        }
    },
    
    // 开始游戏
    startGame() {
        this.team = this.selectedProfessions.map((key, idx) => ({
            id: idx,
            key: key,
            ...this.professions[key],
            inventory: { sedative: 2 },
            affliction: null
        }));
        
        document.getElementById('professionSelect').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        document.getElementById('gameUI').style.display = 'flex';
        
        this.updateStatus();
        this.enterRoom(0);
    },
    
    // 进入房间
    enterRoom(idx) {
        this.currentRoom = idx;
        const room = this.rooms[idx];
        
        document.getElementById('roomName').textContent = room.name;
        document.getElementById('roomSubtitle').textContent = `房间 ${idx + 1}/13`;
        
        // 构建房间HTML
        let html = '<div class="room-container">';
        
        // 描述
        html += `<div class="room-desc">${room.desc.replace(/\n/g, '<br>')}</div>`;
        
        // 对话
        if (room.dialog) {
            const inv = this.team[0];
            const dialog = room.dialog(inv, inv.san);
            html += `
                <div class="dialog-section">
                    <span class="dialog-speaker">${inv.name}:</span>
                    <span class="dialog-text">"${dialog}"</span>
                </div>
            `;
        }
        
        // 发现物
        if (room.discoveries && room.discoveries.length > 0) {
            html += '<div class="discoveries">';
            html += '<div class="discoveries-title">发现物（点击阅读）</div>';
            room.discoveries.forEach(d => {
                html += `
                    <div class="discovery-item" onclick="game.readDiscovery('${d.id}')">
                        <span class="discovery-icon">${d.icon}</span>
                        <span class="discovery-name">${d.name}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // 选择
        html += '<div class="room-choices">';
        room.choices.forEach((c, i) => {
            const onclick = c.next ? `onclick="game.enterRoomById('${c.next}')"` : `onclick="game.showEnding('${c.ending}')"`;
            html += `
                <button class="choice-btn" ${onclick}>
                    <span class="choice-title">${c.text}</span>
                    <span class="choice-desc">${c.desc || ''}</span>
                </button>
            `;
        });
        html += '</div>';
        
        html += '</div>';
        document.getElementById('mainContent').innerHTML = html;
        
        // SAN伤害
        if (room.desc.includes('SAN') || room.type === 'side') {
            this.addSanity(3);
        }
    },
    
    // 通过ID进入房间
    enterRoomById(id) {
        const idx = this.rooms.findIndex(r => r.id === id);
        if (idx >= 0) this.enterRoom(idx);
    },
    
    // 阅读发现物
    readDiscovery(id) {
        const room = this.rooms[this.currentRoom];
        const d = room.discoveries.find(x => x.id === id);
        if (d && !this.clues.includes(d.name)) {
            this.clues.push(d.name);
            alert(`${d.icon} ${d.name}\n\n${d.text}`);
        }
    },
    
    // 添加SAN
    addSanity(amount) {
        this.team.forEach(inv => {
            inv.san = Math.min(100, inv.san + amount);
        });
        this.updateStatus();
    },
    
    // 更新状态
    updateStatus() {
        this.team.forEach((inv, idx) => {
            const el = document.getElementById(`inv${idx}Name`);
            if (el) el.textContent = inv.name;
            el = document.getElementById(`inv${idx}Hp`);
            if (el) el.textContent = `${inv.hp}/${inv.maxHp}`;
            el = document.getElementById(`inv${idx}HpBar`);
            if (el) el.style.width = `${(inv.hp/inv.maxHp)*100}%`;
            el = document.getElementById(`inv${idx}SanBar`);
            if (el) el.style.width = `${(inv.san/100)*100}%`;
            el = document.getElementById(`inv${idx}San`);
            if (el) el.textContent = inv.san;
            
            // 状态标签
            el = document.getElementById(`inv${idx}Status`);
            if (el) {
                let state = 'calm', text = '冷静';
                if (inv.san > 30) { state = 'uneasy'; text = '不安'; }
                if (inv.san > 50) { state = 'nervous'; text = '紧张'; }
                if (inv.san > 70) { state = 'fearful'; text = '恐惧'; }
                if (inv.san > 85) { state = 'breaking'; text = '崩溃'; }
                el.className = 'status-label ' + state;
                el.textContent = text;
            }
        });
    },
    
    // 显示结局
    showEnding(type) {
        const endings = {
            cooperate: { title: '📚 真相结局', text: '你说服了埃德蒙，一起找到了让深渊沉睡而不需要牺牲的方法。' },
            fight: { title: '🏆 英雄结局', text: '你击败了埃德蒙，阻止了仪式，但艾琳娜永远困在了深渊边缘。' },
            sacrifice: { title: '😢 牺牲结局', text: '一名调查员自愿替代艾琳娜成为守门人，永远困在深渊边缘。' },
            escape: { title: '🏃 逃离结局', text: '你们带着情报逃离，但深渊之主终将苏醒...' }
        };
        
        const end = endings[type];
        document.getElementById('modalTitle').textContent = end.title;
        document.getElementById('modalText').innerHTML = end.text + '<br><br><button onclick="location.reload()" style="padding:10px 20px;background:#e94560;color:white;border:none;cursor:pointer;">再玩一次</button>';
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
