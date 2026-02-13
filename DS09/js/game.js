/**
 * DS08 - 幽暗编年史
 * 融合跑团机制的叙事扫雷游戏
 */

class DS08Game {
    constructor() {
        // 道具定义
        this.itemTypes = {
            // 功能向道具
            sanityPotion: { id: 'sanityPotion', name: '理智药水', icon: '🧪', type: 'functional', desc: '恢复20点理智值', effect: 'sanity+20', value: 50 },
            detector: { id: 'detector', name: '探测器', icon: '🔍', type: 'functional', desc: '揭示任意1格内容', effect: 'reveal', value: 100 },
            markerPack: { id: 'markerPack', name: '灵能水晶', icon: '💠', type: 'functional', desc: '恢复2点精神力', effect: 'scans+2', value: 30 },
            lantern: { id: 'lantern', name: '煤油灯', icon: '🏮', type: 'functional', desc: '降低幻觉效果30秒', effect: 'antiHallucination', value: 80 },
            // 剧情向道具
            oldKey: { id: 'oldKey', name: '古老钥匙', icon: '🗝️', type: 'story', desc: '用于开启隐藏的密室', value: 200 },
            mysteriousScroll: { id: 'mysteriousScroll', name: '神秘卷轴', icon: '📜', type: 'story', desc: '记载着古老的咒语', value: 300 },
            amulet: { id: 'amulet', name: '护身符', icon: '✨', type: 'story', desc: '蛇人信徒的护身符，可降低遭遇危险的概率', value: 250 },
            slaveMap: { id: 'slaveMap', name: '奴隶地图', icon: '🗺️', type: 'story', desc: '记录着秘密通道的位置', value: 150 }
        };
        
        // 副本配置
        this.dungeons = {
            shadow: {
                id: 'shadow',
                name: '岭下暗影',
                theme: '蛇人/隧道/奴隶贸易',
                unlocked: true,
                introStory: {
                    title: '📜 任务开始',
                    text: '1925年，马萨诸塞州艾克斯哈姆。你是一位经验丰富的调查员，受雇于一位名叫乔什·文斯考特的男子。他的祖传老宅位于岭下镇，最近在进行装修时，工人意外发现了一面古老的砖墙，墙后隐藏着一条通往地底的隧道。乔什带着工具和好奇心独自进入探索，却在两天后音讯全无。只留下一段断断续续的电话留言："隧道...太深了...那些东西...它们还在..."你站在老宅门前，手持手电筒和仅有的几件装备。清晨的雾气笼罩着这座古老的小镇，远处传来猫头鹰的叫声。你知道，这不仅仅是一次简单的搜救任务——墙壁上的蛇形符文、账本中提到的"永恒生命"、还有那从未知深处传来的嘶吼声，都在警告着你即将面对的是什么。但乔什可能还活着，而你是他唯一的希望。',
                    hint: '准备好了吗？深吸一口气，踏入这片未知的黑暗...'
                },
                endings: [
                    {
                        id: 'perfect',
                        name: '🏆 完美结局：深渊之光',
                        condition: (stats) => stats.sanity >= 80 && stats.itemsFound >= 5,
                        text: '你不仅成功击败了斯西亚，还保持着惊人的理智。在蛇父神殿的废墟中，你发现了乔什——他还活着，虽然精神恍惚，但生命无碍。你们一起逃离了这片深渊。数月后，乔什康复了。他将老宅捐赠给了密斯卡托尼克大学作为研究基地，而你则成为了学院的荣誉研究员。那本神秘的卷轴被妥善保管，蛇人的秘密再次被尘封于地下。你时常会梦见那片黑暗，但你知道，光明终将战胜黑暗。',
                        hint: '保持高理智(≥80)并收集5件以上道具'
                    },
                    {
                        id: 'good',
                        name: '✨ 好结局：生还者',
                        condition: (stats) => stats.sanity >= 30,
                        text: '经过一番苦战，你终于击败了斯西亚。虽然身心俱疲，理智濒临崩溃，但你活下来了。你在核心巢穴的角落里发现了乔什的遗骸——他已经死去多日，但脸上带着解脱的微笑。你带走了他的遗物，将他安葬在镇上的公墓。老宅被永久封闭，那条通往深渊的隧道被水泥封死。但你心里清楚，这只是暂时的安宁。蛇人的神祇仍在沉睡，等待下一个唤醒它的人...而你，已经做好了再次面对黑暗的准备。',
                        hint: '保持理智≥30通关'
                    },
                    {
                        id: 'bad',
                        name: '💀 坏结局：深渊的囚徒',
                        condition: (stats) => stats.sanity < 30 && stats.sanity > 0,
                        text: '你击败了斯西亚，但代价是惨重的。你的理智已经支离破碎，眼前的世界开始扭曲变形。蛇人的低语在你脑海中回荡，伊格的名字不断被呼唤。你蹒跚地走出老宅，却发现自己已经无法适应正常的阳光。夜晚，你会梦游般走向隧道入口；白天，你会在纸上无意识画满蛇形符文。一个月后，你消失了。镇民们在隧道入口发现了你的手电筒，光束还亮着，指向黑暗深处。你成为了蛇父神殿的新一任看守者，永远徘徊在那片永恒的黑暗中...',
                        hint: '理智低于30但仍通关'
                    },
                    {
                        id: 'madness',
                        name: '🌀 疯狂结局：蛇父的信徒',
                        condition: (stats) => stats.sanity <= 0,
                        text: '在核心巢穴的深处，你没有击败斯西亚——你加入了它。当理智归零的那一刻，你终于听懂了蛇人语言的真谛。伊格并非邪恶的神祇，它只是...孤独。斯西亚向你伸出手，你毫不犹豫地握住了它。你成为了蛇父神殿的新祭司，负责看守那永恒的火焰。乔什的骸骨被你用仪式安葬，你认为这是对他最好的归宿。偶尔，会有新的调查员闯入这片领地。你会微笑着迎接他们，就像斯西亚曾经迎接你一样。毕竟，伊格需要更多的信徒，而深渊...永远欢迎新的灵魂。',
                        hint: '理智归零后通关（几乎不可能）'
                    }
                ],
                layers: [
                    {
                        size: 6, steps: 8, main: 1, sub: 2,
                        layerName: '老宅地窖',
                        layerStory: {
                            title: '🏚️ 老宅地窖',
                            text: '你踏入了文斯考特老宅的地窖，潮湿的空气中弥漫着霉味与泥土的气息。砖墙被破开的大洞像一张漆黑的嘴，通往未知的深渊。手电筒的光芒在洞壁上摇曳，映出18世纪奴隶贩子留下的船锚标记。这里曾是走私者的秘密通道，如今成了通往地狱的入口。你深吸一口气，迈出了第一步。'
                        }
                    },
                    {
                        size: 9, steps: 15, main: 2, sub: 3,
                        layerName: '隧道遗迹',
                        layerStory: {
                            title: '🚇 隧道遗迹',
                            text: '穿过地窖，你进入了真正的隧道遗迹。这里的空气更加沉闷，石壁上布满了潮湿的青苔和奇怪的抓痕。地面上散落着锈蚀的锁链和破碎的骨骼——有些是动物的，有些则明显属于人类。远处传来滴水的声音，在寂静中被无限放大。你意识到，这里曾经发生过可怕的事情，而那些制造恐怖的东西...可能还在。'
                        }
                    },
                    {
                        size: 10, steps: 20, main: 2, sub: 4,
                        layerName: '蛇人先民遗迹',
                        layerStory: {
                            title: '🐍 蛇人先民遗迹',
                            text: '隧道突然变得宽阔，你来到了一个巨大的地下洞穴。这里的岩壁上刻满了扭曲的符文和蛇形图案，散发着微弱的荧光。空气中弥漫着一种甜腻的香气，让你的头有些发晕。你注意到地面上有奇怪的划痕，像是某种巨大的爬行动物拖拽身体留下的痕迹。这里曾是蛇人文明的领地，而你...是一个闯入者。'
                        }
                    },
                    {
                        size: 15, steps: 35, main: 3, sub: 6,
                        layerName: '蛇人领地核心',
                        layerStory: {
                            title: '👑 蛇人领地核心',
                            text: '你已经深入到了蛇人领地的核心区域。这里的洞穴被精心雕琢，墙壁上镶嵌着发光的 crystal，照亮了周围令人不安的景象。你看到了退化的人类奴隶在照料奇怪的真菌群落，看到了祭祀用的石坛上还残留着干涸的血迹。远处传来低沉的吟唱声，那是蛇人的祭祀正在举行某种古老的仪式。你感到无数双眼睛在黑暗中注视着你。'
                        }
                    },
                    {
                        size: 16, steps: 50, main: 3, sub: 8,
                        layerName: '蛇人核心巢穴',
                        layerStory: {
                            title: '🔥 蛇人核心巢穴',
                            text: '你站在了深渊的最深处——蛇人核心巢穴。这里的温度异常温暖，空气中弥漫着硫磺和麝香的味道。巨大的天然石柱被雕刻成盘卷巨蛇的形态，那是蛇人神祇伊格的象征。在巢穴的中央，蛇人祭司斯西亚·瑞斯正等着你。它银灰色的鳞片在荧光下闪烁着冷光，分叉的舌头不断探出，似乎在品尝你的恐惧。这是最后的战场，也是你命运的转折点。'
                        }
                    }
                ]
            },
            gate: {
                id: 'gate',
                name: '幽暗之门',
                theme: '疗养院/罗伊格尔/旧印',
                unlocked: false,
                unlockItem: '神秘羊皮纸',
                introStory: {
                    title: '📜 新的威胁',
                    text: '在你完成岭下暗影的探索后，密斯卡托尼克大学向你发来了新的委托。一张神秘的羊皮纸被送到你手中，上面记载着另一个更为恐怖的秘密——位于加州的斯通疗养院。那里曾是罗伊格尔的囚笼，而现在，门即将再次打开...',
                    hint: '准备好面对更深层的恐惧了吗？'
                },
                endings: [
                    {
                        id: 'good',
                        name: '✨ 结局：门扉紧闭',
                        condition: () => true,
                        text: '你成功封印了罗伊格尔，疗养院再次陷入沉寂。但你心里明白，这只是暂时的胜利。旧印的力量正在减弱，而门...总会再次打开。',
                        hint: '通关即可'
                    }
                ],
                layers: [
                    { size: 6, steps: 8, main: 1, sub: 3 },
                    { size: 10, steps: 15, main: 2, sub: 6 },
                    { size: 10, steps: 20, main: 2, sub: 6 },
                    { size: 15, steps: 35, main: 3, sub: 9 },
                    { size: 18, steps: 50, main: 3, sub: 10 }
                ]
            }
        };

        // 游戏状态
        this.state = 'lobby';
        this.currentDungeon = null;
        this.currentLayer = 0;
        this.grid = [];
        this.sanity = 100;
        this.startingSanity = 100; // 初始理智，用于计算继承
        this.markers = 3;
        this.exploredSteps = 0;
        this.dungeonInv = [];
        
        // 幻觉模式
        this.hallucinationMode = false;
        this.hallucinationTurns = 0;
        this.explorationLogs = []; // 存储探索日志
        
        // 商店物品（进入副本时刷新）
        this.shopItems = [];

        this.persistent = this.loadData();
        this.init();
    }

    loadData() {
        const defaultData = {
            gold: 0,
            vault: [],
            fragments: [],
            completedDungeons: [],
            unlockedDungeons: ['shadow'],
            stats: { totalRuns: 0, totalDeaths: 0, fragmentsFound: 0 }
        };
        try {
            const saved = localStorage.getItem('DS08_save');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch(e) { return defaultData; }
    }

    saveData() {
        localStorage.setItem('DS08_save', JSON.stringify(this.persistent));
    }

    // 显示大厅
    showLobby() {
        this.state = 'lobby';
        const c = document.getElementById('game-container');
        
        const dungeonCards = Object.values(this.dungeons).map(d => {
            const isUnlocked = this.persistent.unlockedDungeons.includes(d.id);
            return `
                <div class="dungeon-card ${isUnlocked ? '' : 'locked'}" 
                     onclick="${isUnlocked ? `game.selectDungeon('${d.id}')` : ''}">
                    <h3>${d.name} ${isUnlocked ? '' : '🔒'}</h3>
                    <p class="theme">${d.theme}</p>
                    <p class="status">${isUnlocked ? '已解锁' : `需: ${d.unlockItem}`}</p>
                </div>
            `;
        }).join('');

        c.innerHTML = `
            <div id="lobby">
                <header>
                    <h1>📜 幽暗编年史</h1>
                    <div class="stats">
                        <span>💰 ${this.persistent.gold}</span>
                        <span>📜 ${this.persistent.fragments.length} 碎片</span>
                        <span>🏆 ${this.persistent.completedDungeons.length} 通关</span>
                    </div>
                </header>
                <div class="dungeon-selection">
                    <h2>选择探索的副本</h2>
                    <div class="dungeon-grid">
                        ${dungeonCards}
                    </div>
                </div>
                <div class="lobby-actions">
                    <button onclick="game.showCodex()" class="secondary">📚 图鉴</button>
                    <button onclick="game.showWarehouse()" class="secondary">🏛️ 仓库</button>
                    <button onclick="game.deleteSave()" class="danger">🗑️ 重置</button>
                </div>
            </div>
        `;
    }

    selectDungeon(dungeonId) {
        this.currentDungeon = this.dungeons[dungeonId];
        this.currentLayer = 0;
        this.refreshShop(); // 刷新商店
        this.showShop(); // 显示商店而非层数选择
    }

    // 刷新商店物品
    refreshShop() {
        this.shopItems = [];
        const functionalItems = ['sanityPotion', 'detector', 'markerPack', 'lantern'];
        const storyItems = ['oldKey', 'mysteriousScroll', 'amulet', 'slaveMap'];
        
        // 固定出现3个功能道具
        for (let i = 0; i < 3; i++) {
            const itemId = functionalItems[Math.floor(Math.random() * functionalItems.length)];
            this.shopItems.push({ ...this.itemTypes[itemId], shopPrice: this.itemTypes[itemId].value });
        }
        
        // 20%概率出现1个剧情道具
        if (Math.random() < 0.2) {
            const itemId = storyItems[Math.floor(Math.random() * storyItems.length)];
            this.shopItems.push({ ...this.itemTypes[itemId], shopPrice: this.itemTypes[itemId].value });
        }
    }

    // 显示商店
    showShop() {
        // 安全检查：如果没有选择副本，返回大厅
        if (!this.currentDungeon) {
            console.error('[ERROR] showShop called without currentDungeon');
            this.showLobby();
            return;
        }
        
        const c = document.getElementById('game-container');
        
        const shopItemsHtml = this.shopItems.map((item, idx) => `
            <div class="shop-item">
                <span class="item-icon">${item.icon}</span>
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-desc">${item.desc}</span>
                </div>
                <span class="item-price">💰 ${item.shopPrice}</span>
                <button onclick="game.buyShopItem(${idx})" ${this.persistent.gold >= item.shopPrice ? '' : 'disabled'}>购买</button>
            </div>
        `).join('');

        c.innerHTML = `
            <div id="shop">
                <header>
                    <button onclick="game.showLobby()">⬅️ 返回大厅</button>
                    <h2>🛒 补给商店 - ${this.currentDungeon.name}</h2>
                    <span class="gold-display">💰 ${this.persistent.gold}</span>
                </header>
                <div class="shop-desc">
                    <p>准备进入副本前，你可以购买一些补给道具。</p>
                    <p>💡 购买的道具将在本次副本中使用，撤退时可结算为金币。</p>
                </div>
                <div class="shop-items">
                    ${shopItemsHtml || '<p class="empty">商店已售罄</p>'}
                </div>
                <div class="shop-actions">
                    <button onclick="game.refreshShop()" class="secondary">🔄 刷新商店 (💰 50)</button>
                    <button onclick="game.startDungeonFromLayer1()" class="primary">🎮 开始副本 (从第1层)</button>
                </div>
                <div class="starting-items">
                    <h4>📦 开局携带 (${this.dungeonInv.length} 件)</h4>
                    <div class="inventory-grid">
                        ${this.dungeonInv.map(item => `<span>${item.icon}</span>`).join('') || '<span class="empty">空</span>'}
                    </div>
                </div>
            </div>
        `;
    }

    // 购买商店物品
    buyShopItem(idx) {
        const item = this.shopItems[idx];
        if (!item || this.persistent.gold < item.shopPrice) {
            alert('金币不足！');
            return;
        }
        
        this.persistent.gold -= item.shopPrice;
        // 标记为商店购买（死亡时不丢失）
        this.dungeonInv.push({ ...item, obtainedInDungeon: false, source: 'shop' });
        this.shopItems.splice(idx, 1); // 从商店移除
        this.saveData();
        this.showShop(); // 刷新界面
    }

    // 从第1层开始副本
    startDungeonFromLayer1() {
        // 安全检查
        if (!this.currentDungeon) {
            console.error('[ERROR] startDungeonFromLayer1 called without currentDungeon');
            alert('请先选择副本！');
            this.showLobby();
            return;
        }
        
        // 显示前置剧情
        const dungeon = this.currentDungeon;
        if (dungeon.introStory) {
            this.showIntroStory(dungeon.introStory, () => {
                // 剧情结束后开始第一层
                this.currentLayer = 0;
                this.sanity = 100;
                this.startingSanity = 100;
                this.markers = 3;
                this.exploredSteps = 0;
                this.startLayer(0);
            });
        } else {
            this.currentLayer = 0;
            this.sanity = 100;
            this.startingSanity = 100;
            this.markers = 3;
            this.exploredSteps = 0;
            this.startLayer(0);
        }
    }
    
    // 显示副本前置剧情
    showIntroStory(story, callback) {
        // 检查弹窗元素是否存在，如果不存在则动态创建
        let modal = document.getElementById('story-modal');
        if (!modal) {
            // 动态创建弹窗结构
            const modalHtml = `
                <div id="story-modal" class="modal hidden">
                    <div class="modal-content">
                        <h3 id="story-title"></h3>
                        <p id="story-text"></p>
                        <div id="story-result"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('story-modal');
        }
        
        const title = document.getElementById('story-title');
        const text = document.getElementById('story-text');
        const resultDiv = document.getElementById('story-result');
        
        if (!title || !text || !resultDiv) {
            console.error('[ERROR] 弹窗元素缺失，跳过剧情直接开始');
            if (callback) callback();
            return;
        }
        
        title.textContent = story.title;
        text.innerHTML = `<div class="intro-story-text">${story.text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`;
        
        resultDiv.innerHTML = `
            <div class="intro-story-hint">${story.hint}</div>
            <button onclick="game.closeIntroStory()">踏入深渊</button>
        `;
        
        this.introStoryCallback = callback;
        modal.classList.remove('hidden');
    }
    
    // 关闭前置剧情
    closeIntroStory() {
        document.getElementById('story-modal').classList.add('hidden');
        if (this.introStoryCallback) {
            this.introStoryCallback();
            this.introStoryCallback = null;
        }
    }

    showLayerSelect() {
        // 保留此函数用于兼容，但实际不使用了
        this.showShop();
    }

    startLayer(layerIndex) {
        this.currentLayer = layerIndex;
        const config = this.currentDungeon.layers[layerIndex];
        
        this.state = 'dungeon';
        
        // 第1层重置所有状态，后续层继承理智值
        if (layerIndex === 0) {
            this.sanity = 100;
            this.startingSanity = 100;
            this.markers = 3;
            this.exploredSteps = 0;
            // dungeonInv 保留（商店购买的道具）
        } else {
            // 继承上一层理智值，其他状态重置
            this.sanity = Math.max(0, this.sanity); // 确保不变成负数
            this.markers = 3; // 精神力每层重置
            this.exploredSteps = 0;
        }
        
        this.hallucinationMode = false;
        this.explorationLogs = []; // 重置日志
        
        // 如果有层叙事，先显示叙事
        if (config.layerStory) {
            this.showLayerStory(config.layerStory, layerIndex);
        }
        
        this.createGrid(config.size);
        this.placeRooms(config.main, config.sub);
        this.placeTraps(Math.floor(config.size * config.size * 0.15));
        this.calcNumbers();
        
        this.renderDungeon();
        
        if (layerIndex === 0) {
            this.explorationLogs = [{ msg: `进入了${this.currentDungeon.name} 第1层...`, type: 'system', time: Date.now() }];
            // 第一层自动显示规则说明
            setTimeout(() => this.showRules(), 500);
        } else {
            this.explorationLogs = [{ msg: `进入了第${layerIndex + 1}层（理智继承：${this.sanity}）`, type: 'system', time: Date.now() }];
        }
        this.renderLogs();
    }
    
    // 显示规则说明 - DS09新版
    showRules() {
        const modalHtml = `
            <div id="rules-modal" class="modal rules-modal">
                <div class="modal-content rules-content">
                    <h2>📖 游戏规则说明</h2>
                    
                    <div class="rules-section">
                        <h3>🎯 基础目标</h3>
                        <p>探索地牢，揭示安全区域，找到剧情房推进故事，达成步数要求后撤离。</p>
                    </div>
                    
                    <div class="rules-section">
                        <h3>🎨 揭示后的视觉语言</h3>
                        <div class="rule-item">
                            <span class="rule-icon empty">⬜</span>
                            <span class="rule-text"><strong>空地</strong> - 无边框，仅底色表示风险</span>
                        </div>
                        <div class="rule-item">
                            <span class="rule-icon safe">🟢</span>
                            <span class="rule-text"><strong>安全</strong> - 0威胁，会连锁揭示周围</span>
                        </div>
                        <div class="rule-item">
                            <span class="rule-icon yellow">🟡</span>
                            <span class="rule-text"><strong>不安</strong> - 1-2个威胁 nearby</span>
                        </div>
                        <div class="rule-item">
                            <span class="rule-icon red">🔴</span>
                            <span class="rule-text"><strong>危险</strong> - 3+个威胁 nearby</span>
                        </div>
                        <div class="rule-item">
                            <span class="rule-icon eye">👁️</span>
                            <span class="rule-text"><strong>注视</strong> - 附近有剧情房（不确定位置）</span>
                        </div>
                        <div class="rule-item">
                            <span class="rule-icon story">📜</span>
                            <span class="rule-text"><strong>剧情房</strong> - 有边框+纯色底板（踩到触发事件）</span>
                        </div>
                    </div>
                    
                    <div class="rules-section">
                        <h3>💠 精神扫描（右键点击未揭示格子）</h3>
                        <p class="rule-desc">集中精神力<strong>窥视一个格子的真相</strong>，每次消耗1点精神力。</p>
                        <div class="rule-item good">
                            <span class="rule-icon">💀</span>
                            <span class="rule-text"><strong>扫描到陷阱</strong> → 精神力回流，理智+5，安全避开</span>
                        </div>
                        <div class="rule-item">
                            <span class="rule-icon">📜</span>
                            <span class="rule-text"><strong>扫描到剧情房</strong> → 触发剧情，70%基础好走向</span>
                        </div>
                        <div class="rule-item bad">
                            <span class="rule-icon">⬜</span>
                            <span class="rule-text"><strong>扫描到空地</strong> → 精神力耗尽，仅揭示格子</span>
                        </div>
                    </div>
                    
                    <div class="rules-section">
                        <h3>🧠 理智与幻觉</h3>
                        <ul>
                            <li>踩到陷阱：<strong>-15~25 理智</strong></li>
                            <li>剧情事件：根据结果±理智</li>
                            <li>理智 < 30：<span class="danger">进入幻觉</span>（看到的底色可能是错误的）</li>
                            <li>理智 = 0：<span class="danger">精神崩溃，游戏结束</span></li>
                        </ul>
                    </div>
                    
                    <div class="rules-section">
                        <h3>🚪 撤离机制</h3>
                        <p>探索达到指定步数后，可以安全撤离进入下一层。继续探索可获得更多收益，但风险也更大。</p>
                    </div>
                    
                    <div class="rules-footer">
                        <button onclick="game.closeRules()" class="primary">我知道了</button>
                    </div>
                </div>
            </div>
        `;
        
        // 如果已存在则先移除
        const existingModal = document.getElementById('rules-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // 关闭规则说明
    closeRules() {
        const modal = document.getElementById('rules-modal');
        if (modal) modal.remove();
    }
    
    // 显示层叙事
    showLayerStory(story, layerIndex) {
        const modalHtml = `
            <div id="layer-story-modal" class="modal layer-story-modal">
                <div class="modal-content layer-story-content">
                    <h2>${story.title}</h2>
                    <div class="layer-story-text">${story.text}</div>
                    <div class="layer-story-footer">
                        <button onclick="game.closeLayerStory(${layerIndex})" class="primary">继续探索</button>
                    </div>
                </div>
            </div>
        `;
        
        // 如果已存在则先移除
        const existingModal = document.getElementById('layer-story-modal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    // 关闭层叙事
    closeLayerStory(layerIndex) {
        const modal = document.getElementById('layer-story-modal');
        if (modal) modal.remove();
        
        // 如果是第一层，显示规则说明
        if (layerIndex === 0) {
            setTimeout(() => this.showRules(), 300);
        }
    }

    createGrid(size) {
        this.gridSize = size;
        this.grid = Array(size).fill(null).map((_, y) =>
            Array(size).fill(null).map((_, x) => ({
                x, y,
                isRevealed: false,
                isMarked: false,
                isTrap: false,
                number: 0,
                roomType: 'normal', // normal, main, sub
                roomData: null
            }))
        );
    }

    placeRooms(mainCount, subCount) {
        const layerStories = this.getLayerStories(this.currentLayer);
        
        // 放置主线剧情房
        const mainStories = layerStories.main;
        for (let i = 0; i < Math.min(mainCount, mainStories.length); i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) {
                this.grid[pos.y][pos.x].roomType = 'main';
                this.grid[pos.y][pos.x].roomData = mainStories[i];
            }
        }
        
        // 放置支线剧情房
        const subStories = layerStories.sub;
        const shuffledSub = [...subStories].sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(subCount, shuffledSub.length); i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) {
                this.grid[pos.y][pos.x].roomType = 'sub';
                this.grid[pos.y][pos.x].roomData = shuffledSub[i];
            }
        }
    }

    getRandomEmptyCell() {
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const cell = this.grid[y][x];
            if (cell.roomType === 'normal' && !cell.isTrap && !(x < 2 && y < 2)) {
                return { x, y };
            }
            attempts++;
        }
        return null;
    }

    placeTraps(count) {
        let placed = 0;
        while (placed < count) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const cell = this.grid[y][x];
            if (!cell.isTrap && cell.roomType === 'normal' && !(x < 2 && y < 2)) {
                cell.isTrap = true;
                placed++;
            }
        }
    }

    calcNumbers() {
        // DS09: 简化的威胁计算 - 纯计数，所有雷（陷阱+剧情房）都=1
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (!cell.isTrap && cell.roomType === 'normal') {
                    let threatCount = 0;
                    let hasStoryNearby = false;
                    
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = y + dy, nx = x + dx;
                            if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                                const neighbor = this.grid[ny][nx];
                                // 所有雷都计为1威胁（陷阱+剧情房）
                                if (neighbor.isTrap || neighbor.roomType === 'main' || neighbor.roomType === 'sub') {
                                    threatCount++;
                                }
                                // 检查周围是否有剧情房
                                if (neighbor.roomType === 'main' || neighbor.roomType === 'sub') {
                                    hasStoryNearby = true;
                                }
                            }
                        }
                    }
                    
                    // 存储威胁等级（用于显示底色）
                    cell.threatCount = threatCount;
                    if (threatCount === 0) {
                        cell.threatLevel = 'safe';
                    } else if (threatCount <= 2) {
                        cell.threatLevel = 'yellow';
                    } else {
                        cell.threatLevel = 'red';
                    }
                    cell.hasStoryNearby = hasStoryNearby;
                }
            }
        }
    }

    renderDungeon() {
        const c = document.getElementById('game-container');
        const config = this.currentDungeon.layers[this.currentLayer];
        const canExtract = this.exploredSteps >= config.steps;

        c.innerHTML = `
            <div id="dungeon" class="${this.hallucinationMode ? 'hallucination' : ''}">
                <header>
                    <div class="header-left">
                        <button onclick="game.quitLayer()">⬅️ 撤退</button>
                        <button onclick="game.showRules()" class="rules-btn">💠 精神扫描</button>
                    </div>
                    <div class="dungeon-info">
                        <span class="dungeon-name">${config.layerName || this.currentDungeon.name}（第${this.currentLayer + 1}层）</span>
                        <span class="steps">步数: ${this.exploredSteps}/${config.steps}</span>
                    </div>
                    <div class="resources">
                        <div class="sanity-bar ${this.sanity < 30 ? 'low' : ''}">
                            <span class="sanity-label">🧠</span>
                            <div class="sanity-progress">
                                <div class="sanity-fill" style="width: ${this.sanity}%"></div>
                            </div>
                            <span class="sanity-value">${this.sanity}</span>
                        </div>
                        <span class="markers">💠 ${this.markers}</span>
                    </div>
                </header>
                
                <div class="dungeon-main">
                    <div id="minefield" style="grid-template-columns: repeat(${this.gridSize}, 36px);">
                        ${this.renderGridCells()}
                    </div>
                    
                    <div class="side-panel">
                        <div class="panel-section">
                            <h4>📦 背包 (${this.dungeonInv.reduce((s,i)=>s+(i.weight||1),0).toFixed(1)}/10)</h4>
                            <div class="inventory-grid">
                                ${this.dungeonInv.map((item, idx) => `
                                    <div class="inv-slot" onclick="game.showItemDetail(${idx})" title="${item.desc||item.name}">
                                        ${item.icon}
                                    </div>
                                `).join('') || '<span class="empty">空</span>'}
                            </div>
                        </div>
                        
                        <div class="panel-section">
                            <h4>📝 探索日志</h4>
                            <div id="exploration-log" class="log-panel"></div>
                        </div>
                    </div>
                </div>
                
                <div class="legend">
                    <span class="threat-safe">🟢 安全(0)</span>
                    <span class="threat-yellow">🟡 不安(1-2)</span>
                    <span class="threat-red">🔴 危险(3+)</span>
                    <span>|</span>
                    <span>👁️ 附近有剧情</span>
                    <span>📜 剧情房</span>
                    <span>|</span>
                    <span>🚪 可撤离</span>
                </div>
                
                <footer>
                    <button onclick="game.retreat()" class="${canExtract ? 'primary' : 'disabled'}" 
                            ${canExtract ? '' : 'disabled'}>
                        ${canExtract ? '🚪 撤退' : `🚫 需探索${config.steps}步`}
                    </button>
                </footer>
                
                <div id="story-modal" class="modal hidden">
                    <div class="modal-content">
                        <h3 id="story-title"></h3>
                        <p id="story-text"></p>
                        <div id="story-result"></div>
                        <button onclick="game.closeStoryModal()">继续</button>
                    </div>
                </div>
                
                <div id="item-modal" class="modal hidden">
                    <div class="modal-content item-modal-content">
                        <div class="item-header">
                            <span id="item-icon" class="item-big-icon"></span>
                            <h3 id="item-title"></h3>
                        </div>
                        <p id="item-desc" class="item-description"></p>
                        <div class="item-actions">
                            <button id="item-action-btn" class="primary">使用</button>
                            <button onclick="game.closeItemModal()">取消</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 渲染探索日志
        this.renderLogs();
    }

    renderGridCells() {
        let html = '';
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                let className = 'cell';
                let content = '';

                if (cell.isRevealed) {
                    className += ' revealed';
                    
                    if (cell.isTrap) {
                        // 陷阱
                        className += ' trap';
                        content = '💀';
                    } else if (cell.roomType === 'main' || cell.roomType === 'sub') {
                        // 剧情房 - 纯色底板 + 📜图标
                        className += ' story-room';
                        if (cell.canGoNext && cell.roomType === 'main' && this.currentLayer < this.currentDungeon.layers.length - 1) {
                            content = '<span class="cell-content">🚪</span>';
                            className += ' next-layer';
                        } else {
                            content = '<span class="cell-content">📜</span>';
                        }
                    } else {
                        // 普通空地 - 显示风险底色
                        let threatLevel = cell.threatLevel;
                        if (this.hallucinationMode) {
                            // 幻觉模式：可能显示错误的风险等级
                            if (Math.random() < 0.3) {
                                const levels = ['safe', 'yellow', 'red'];
                                threatLevel = levels[Math.floor(Math.random() * levels.length)];
                            }
                        }
                        
                        className += ` threat-${threatLevel}`;
                        
                        // 揭示后显示提示icon（周围有剧情房则显示👁️）
                        if (cell.hasStoryNearby) {
                            content = '<span class="hint-eye">👁️</span>';
                        } else {
                            content = '';
                        }
                    }
                } else if (cell.isMarked) {
                    className += ' marked';
                    content = '💠';
                }

                // 点击事件处理
                let clickHandler;
                if (cell.isRevealed) {
                    // 已揭示的格子
                    if ((cell.roomType === 'main' || cell.roomType === 'sub') && cell.canGoNext && this.currentLayer < this.currentDungeon.layers.length - 1) {
                        clickHandler = `onclick="game.goToNextLayerFromCell(${x}, ${y})"`;
                    } else {
                        clickHandler = '';
                    }
                } else {
                    // 未揭示的格子
                    clickHandler = `onclick="game.revealWithAnimation(${x}, ${y})"`;
                }
                
                html += `<div class="${className}" 
                             data-x="${x}" data-y="${y}"
                             ${clickHandler}
                             oncontextmenu="game.handleRightClick(${x}, ${y}); return false;">
                            ${content}
                        </div>`;
            }
        }
        return html;
    }

    handleLeftClick(x, y) {
        console.log(`[CLICK] handleLeftClick 被调用 (${x},${y})`);
        if (this.state !== 'dungeon') {
            console.log(`[CLICK] 失败: state=${this.state}`);
            return;
        }
        
        const cell = this.grid[y][x];
        if (cell.isRevealed) {
            console.log(`[CLICK] 失败: 格子已揭示`);
            return;
        }

        console.log(`[CLICK] 调用 revealCell`);
        this.revealCell(x, y, 'left');
        console.log(`[CLICK] revealCell 完成`);
    }

    async revealCell(x, y, source) {
        console.log(`[REVEAL] revealCell 开始 (${x},${y})`);
        const cell = this.grid[y][x];
        if (cell.isRevealed) {
            console.log(`[REVEAL] 跳过: 已揭示`);
            return;
        }

        cell.isRevealed = true;
        this.exploredSteps++;
        console.log(`[REVEAL] 格子已揭示，类型:${cell.roomType}`);
        
        // 记录日志
        if (cell.roomType === 'main') {
            this.log(`发现了主线剧情房：${cell.roomData.title}`, 'special');
        } else if (cell.roomType === 'sub') {
            this.log(`发现了支线剧情房：${cell.roomData.title}`, 'info');
        } else if (cell.isTrap) {
            this.log('💀 触发了陷阱！', 'bad');
        }

        if (cell.isTrap) {
            console.log(`[REVEAL] 分支: 陷阱`);
            this.triggerTrap();
            this.updateHallucination();
            this.renderDungeon();
            console.log(`[REVEAL] renderDungeon 完成`);
        } else if (cell.roomType === 'main' || cell.roomType === 'sub') {
            // 触发剧情，带交互选项 - 不立即renderDungeon，避免关闭弹窗
            console.log(`[REVEAL] 分支: 剧情房`);
            this.triggerStoryWithChoice(cell);
            this.updateHallucination();
            // 剧情弹窗保持打开，不调用renderDungeon
        } else {
            // 普通房间，自动展开
            console.log(`[REVEAL] 分支: 普通房，威胁等级:${cell.threatLevel}`);
            if (cell.threatCount === 0) {
                await this.autoExpand(x, y);
            }
            this.updateHallucination();
            this.renderDungeon();
            console.log(`[REVEAL] renderDungeon 完成`);
        }
        console.log(`[REVEAL] revealCell 结束`);
    }

    // DS09: 带动画的揭示
    async revealWithAnimation(x, y) {
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;

        // 获取格子元素并添加动画
        const cellEl = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (cellEl) {
            cellEl.classList.add('revealing');
            
            // 0.3秒心跳延迟
            await this.delay(300);
            
            cellEl.classList.remove('revealing');
        }

        // 执行揭示
        this.handleLeftClick(x, y);
    }

    // 延迟工具函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    handleRightClick(x, y) {
        if (this.state !== 'dungeon') return;
        
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;

        if (this.markers <= 0) {
            this.log('⚠️ 精神力不足！', 'bad');
            return;
        }

        // 消耗精神力
        this.markers--;
        cell.isMarked = true;
        
        this.log('使用了精神力 💠', 'info');

        // 右键也揭露格子，但有精神力加成
        this.revealCellWithMarker(x, y);
    }

    async revealCellWithMarker(x, y) {
        const cell = this.grid[y][x];
        if (cell.isRevealed) return;

        // 先显示标记动画
        await this.showScanAnimation(x, y);
        
        cell.isRevealed = true;
        this.exploredSteps++;

        if (cell.isTrap) {
            // 扫描到陷阱，精神力回流+奖励
            this.markers++;
            this.sanity = Math.min(100, this.sanity + 5);
            this.showScanResult('success', '精神扫描成功！', 
                '你的精神力感知到了陷阱！\n💠 精神力回流\n🧠 理智 +5');
            this.updateHallucination();
            this.renderDungeon();
        } else if (cell.roomType === 'main' || cell.roomType === 'sub') {
            // 扫描到剧情房
            const roomType = cell.roomType === 'main' ? '主线' : '支线';
            this.showScanResult('story', '感知到剧情房！', 
                `你的精神力发现了${roomType}剧情房！\n🎯 判定成功率 +20%`);
            this.triggerStoryWithChoice(cell, true);
            this.updateHallucination();
        } else {
            // 扫描到空地 - 精神力消耗
            this.showScanResult('waste', '精神扫描完成', 
                '这里没有异常...\n💠 精神力已消耗');
            if (cell.threatCount === 0) {
                await this.autoExpand(x, y);
            }
            this.updateHallucination();
            this.renderDungeon();
        }
    }
    
    // 精神扫描动画
    async showScanAnimation(x, y) {
        const cellEl = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (cellEl) {
            cellEl.classList.add('marking');
            await this.delay(400);
            cellEl.classList.remove('marking');
        }
    }
    
    // 精神扫描结果弹窗
    showScanResult(type, title, message) {
        const icons = {
            success: '✅',
            story: '📜',
            waste: '⬜'
        };
        const colors = {
            success: '#4ad94a',
            story: '#8b5cf6',
            waste: '#d9a04a'
        };
        
        const modal = document.createElement('div');
        modal.className = 'scan-result-modal';
        modal.innerHTML = `
            <div class="scan-result-content" style="border-color: ${colors[type]}">
                <div class="scan-result-icon" style="color: ${colors[type]}">${icons[type]}</div>
                <h3>${title}</h3>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()">继续</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 2秒后自动关闭
        setTimeout(() => {
            if (modal.parentElement) modal.remove();
        }, 2000);
    }

    triggerTrap() {
        this.sanity -= 25;
        this.log('💀 触发了陷阱！理智-25', 'bad');
        
        if (this.sanity <= 0) {
            this.death();
        }
    }

    triggerStoryWithChoice(cell, usedMarker = false) {
        const story = cell.roomData;
        const modal = document.getElementById('story-modal');
        const title = document.getElementById('story-title');
        const text = document.getElementById('story-text');
        const result = document.getElementById('story-result');

        title.textContent = story.title;
        text.textContent = story.text;
        
        // 检查是否是主线剧情房且可以前往下一层
        const isLastLayer = this.currentLayer >= this.currentDungeon.layers.length - 1;
        const canGoNext = cell.roomType === 'main' && !isLastLayer;
        
        // 生成交互选项
        let optionsHtml = '';
        
        if (story.choices && story.choices.length > 0) {
            // 使用自定义选项
            optionsHtml = story.choices.map((choice, idx) => `
                <button onclick="game.makeStoryChoice('${cell.x}', '${cell.y}', ${idx})" 
                        class="choice-btn ${choice.type || ''}">
                    <span class="choice-num">${idx + 1}</span>
                    <span class="choice-text">${choice.text}</span>
                    <span class="choice-cost">${choice.cost || ''}</span>
                </button>
            `).join('');
        } else {
            // 默认选项
            const baseProb = usedMarker ? 70 : 30;
            const sanityBonus = Math.floor(this.sanity / 10) * 5;
            const goodProb = baseProb + sanityBonus;
            
            optionsHtml = `
                <button onclick="game.makeStoryChoice('${cell.x}', '${cell.y}', 0, ${usedMarker})" class="choice-btn risky">
                    <span class="choice-num">1</span>
                    <span class="choice-text">深入探索（${goodProb}%成功概率）</span>
                    <span class="choice-cost">风险：可能损失理智</span>
                </button>
                <button onclick="game.makeStoryChoice('${cell.x}', '${cell.y}', 1)" class="choice-btn safe">
                    <span class="choice-num">2</span>
                    <span class="choice-text">谨慎离开</span>
                    <span class="choice-cost">安全：无收益</span>
                </button>
            `;
        }
        
        result.innerHTML = `
            <div class="story-choices">
                <p class="choice-hint">选择你的行动：</p>
                ${optionsHtml}
            </div>
            ${canGoNext ? `<div class="next-layer-hint">🚪 揭露后可通过此处前往下一层</div>` : ''}
        `;

        modal.classList.remove('hidden');
        
        // 添加剧情碎片
        if (!this.persistent.fragments.includes(story.id)) {
            this.persistent.fragments.push(story.id);
            this.saveData();
        }
    }

    makeStoryChoice(x, y, choiceIdx, usedMarker = false) {
        const cell = this.grid[y][x];
        const story = cell.roomData;
        const resultDiv = document.getElementById('story-result');
        
        let outcome = null;
        let roll = 0;
        
        if (choiceIdx === 1) {
            // 离开选项
            resultDiv.innerHTML = `
                <div class="outcome">
                    <h4>👋 离开</h4>
                    <p>你选择了谨慎行事，没有深入探索。</p>
                </div>
                <button onclick="game.closeStoryModal()">继续</button>
            `;
            return;
        }
        
        // 深入探索选项 - 先显示骰子判定
        const baseProb = usedMarker ? 70 : 30;
        const sanityBonus = Math.floor(this.sanity / 10) * 5;
        const threshold = baseProb + sanityBonus;
        roll = Math.floor(Math.random() * 100) + 1;
        const isSuccess = roll <= threshold;
        
        // 保存结果供后续使用
        this.pendingStoryResult = {
            cell, story, roll, threshold, isSuccess, baseProb, sanityBonus
        };
        
        // 显示骰子判定弹窗
        this.showDiceRoll(roll, threshold, isSuccess);
    }
    
    // 显示骰子判定动画
    showDiceRoll(roll, threshold, isSuccess) {
        console.log('[DICE] showDiceRoll 被调用', { roll, threshold, isSuccess });
        const modal = document.getElementById('story-modal');
        const title = document.getElementById('story-title');
        const text = document.getElementById('story-text');
        const resultDiv = document.getElementById('story-result');
        
        title.textContent = '🎲 命运判定';
        text.innerHTML = `<p class="dice-hint">骰子正在滚动...</p>`;
        
        // 骰子动画HTML
        resultDiv.innerHTML = `
            <div class="dice-animation">
                <div class="dice-container">
                    <div class="dice" id="rolling-dice">🎲</div>
                    <div class="dice-numbers" id="dice-numbers"></div>
                </div>
                <div class="dice-target">目标值: ${threshold}</div>
            </div>
        `;
        
        modal.classList.remove('hidden');
        
        // 执行骰子动画
        const diceEl = document.getElementById('rolling-dice');
        const numbersEl = document.getElementById('dice-numbers');
        let rolls = 0;
        const maxRolls = 10;
        const interval = setInterval(() => {
            rolls++;
            const randomNum = Math.floor(Math.random() * 100) + 1;
            numbersEl.textContent = randomNum;
            diceEl.style.transform = `rotate(${rolls * 36}deg)`;
            
            if (rolls >= maxRolls) {
                console.log('[DICE] 动画完成，准备显示结果');
                clearInterval(interval);
                // 显示最终结果
                setTimeout(() => {
                    console.log('[DICE] 调用 showStoryResult');
                    this.showStoryResult();
                }, 500);
            }
        }, 100);
    }
    
    // 显示剧情结果
    showStoryResult() {
        console.log('[STORY] showStoryResult 被调用');
        if (!this.pendingStoryResult) {
            console.error('[STORY] pendingStoryResult 为空！');
            return;
        }
        const { cell, story, roll, threshold, isSuccess } = this.pendingStoryResult;
        console.log('[STORY] 结果:', { roll, threshold, isSuccess });
        const outcome = isSuccess ? story.goodOutcome : story.badOutcome;
        if (!outcome) {
            console.error('[STORY] outcome 为空！');
            return;
        }
        const modal = document.getElementById('story-modal');
        const title = document.getElementById('story-title');
        const text = document.getElementById('story-text');
        const resultDiv = document.getElementById('story-result');
        console.log('[STORY] DOM元素:', { modal: !!modal, title: !!title, text: !!text, resultDiv: !!resultDiv });
        console.log('[STORY] outcome:', outcome);
        console.log('[STORY] preText:', outcome.preText);
        console.log('[STORY] resultText:', outcome.resultText);
        
        // 应用结果
        if (outcome.sanity) {
            this.sanity = Math.max(0, Math.min(100, this.sanity + outcome.sanity));
        }
        if (outcome.markers) {
            this.markers += outcome.markers;
        }
        
        // 新的道具发放逻辑：根据层数和房间类型
        const rewardItem = this.getLayerRewardItem(cell.roomType);
        if (rewardItem) {
            if (rewardItem.id === 'markerBonus') {
                this.markers += 1;
                this.log('获得了精神力+1', 'good');
                outcome.reward = `${outcome.reward || ''} 精神力+1`;
            } else {
                const itemWithSource = { ...rewardItem, obtainedInDungeon: true, source: 'dungeon' };
                this.dungeonInv.push(itemWithSource);
                this.log(`获得了 ${rewardItem.name}`, 'good');
                outcome.reward = `${outcome.reward || ''} ${rewardItem.name}+1`;
            }
        }
        
        // 显示结果弹窗
        title.textContent = isSuccess ? '✨ 判定成功' : '💀 判定失败';
        text.innerHTML = `
            <div class="dice-final">
                <span class="dice-result ${isSuccess ? 'success' : 'fail'}">🎲 ${roll}</span>
                <span class="dice-vs">/</span>
                <span class="dice-target-val">${threshold}</span>
            </div>
        `;
        
        const htmlContent = `
            <div class="story-sequence">
                <div class="story-phase">
                    <h4>📖 行动后</h4>
                    <p class="story-text">${outcome.preText || outcome.text}</p>
                </div>
                <div class="outcome ${isSuccess ? 'good' : 'bad'}">
                    <h4>${isSuccess ? '✨ 结果' : '💀 后果'}</h4>
                    <p>${outcome.resultText || outcome.text}</p>
                    <p class="reward">${outcome.reward}</p>
                </div>
            </div>
            <button onclick="game.closeStoryModal()">继续</button>
        `;
        console.log('[STORY] 设置 HTML:', htmlContent.substring(0, 100));
        resultDiv.innerHTML = htmlContent;
        console.log('[STORY] HTML 已设置');
        
        // 如果是主线房
        if (cell.roomType === 'main') {
            const isLastLayer = this.currentLayer >= this.currentDungeon.layers.length - 1;
            if (isLastLayer) {
                // 最后一层，显示结局门
                cell.canGoNext = true;
                cell.isEndingGate = true;
                this.log(`🚪 BOSS战完成！通往结局的门已开启`, 'special');
                // 修改按钮为结局门按钮
                resultDiv.innerHTML += `
                    <div class="ending-gate-hint">⚠️ 通往结局的门已开启</div>
                    <button onclick="game.showEndingGate()" class="ending-gate-btn">🚪 前往结局结算</button>
                `;
            } else {
                cell.canGoNext = true;
                this.log(`🚪 主线剧情完成！出现前往下一层的入口`, 'special');
            }
        } else if (cell.roomType === 'sub') {
            this.log(`✅ 支线剧情完成！`, 'info');
        }
        
        this.updateHallucination();
        // 注意：这里不要调用 renderDungeon，否则会关闭弹窗
        console.log('[STORY] 完成，不调用 renderDungeon');
    }
    
    // 显示结局门
    showEndingGate() {
        const modal = document.getElementById('story-modal');
        const title = document.getElementById('story-title');
        const text = document.getElementById('story-text');
        const resultDiv = document.getElementById('story-result');
        
        title.textContent = '🚪 通往结局的门';
        text.innerHTML = `
            <div class="ending-gate-text">
                <p>你站在核心巢穴的最深处，斯西亚的残骸仍在冒着青烟。</p>
                <p>在你面前，一道石门缓缓升起，门后透出柔和的光芒。</p>
                <p>这是离开这片深渊的通道，也是你命运的终点——或新的开始。</p>
            </div>
        `;
        
        resultDiv.innerHTML = `
            <div class="ending-gate-choices">
                <p class="ending-hint">你准备好面对自己的结局了吗？</p>
                <button onclick="game.showEndingSettlement()" class="ending-btn primary">进入结局结算</button>
                <button onclick="game.closeStoryModal()" class="ending-btn">继续探索</button>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }
    
    // 显示结局结算
    showEndingSettlement() {
        const dungeon = this.currentDungeon;
        const stats = {
            sanity: this.sanity,
            startingSanity: this.startingSanity,
            itemsFound: this.dungeonInv.length,
            layersCleared: this.currentLayer + 1,
            dungeonId: dungeon.id
        };
        
        // 根据条件判断结局
        let ending = null;
        if (dungeon.endings) {
            // 按优先级检查结局条件
            for (const e of dungeon.endings) {
                if (e.condition(stats)) {
                    ending = e;
                    break;
                }
            }
        }
        
        if (!ending) {
            ending = {
                name: '📜 普通结局：逃出生天',
                text: '你成功逃离了这片深渊，带着满身的伤痕和无法磨灭的记忆。这段经历将成为你永远的秘密。',
                hint: '标准通关'
            };
        }
        
        const modal = document.getElementById('story-modal');
        const title = document.getElementById('story-title');
        const text = document.getElementById('story-text');
        const resultDiv = document.getElementById('story-result');
        
        title.textContent = ending.name;
        text.innerHTML = `
            <div class="ending-story">${ending.text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>
            <div class="ending-stats">
                <h4>📊 本次探索统计</h4>
                <p>剩余理智: ${this.sanity}/100</p>
                <p>收集道具: ${this.dungeonInv.length} 件</p>
                <p>通关层数: ${this.currentLayer + 1}/${dungeon.layers.length}</p>
            </div>
        `;
        
        resultDiv.innerHTML = `
            <div class="ending-reward">
                <h4>🎒 带出的道具</h4>
                <div class="ending-items">
                    ${this.dungeonInv.map(i => `<span class="ending-item">${i.icon} ${i.name}</span>`).join('') || '<span class="empty">无</span>'}
                </div>
            </div>
            <button onclick="game.completeDungeonWithEnding()" class="ending-confirm-btn">确认并返回</button>
        `;
        
        modal.classList.remove('hidden');
    }
    
    // 完成副本（带结局）
    completeDungeonWithEnding() {
        // 记录通关
        if (!this.persistent.completedDungeons.includes(this.currentDungeon.id)) {
            this.persistent.completedDungeons.push(this.currentDungeon.id);
        }
        
        // 将道具转移到仓库（全部带出）
        let itemsSaved = 0;
        for (const item of this.dungeonInv) {
            this.persistent.vault.push({
                ...item,
                obtainedAt: Date.now()
            });
            itemsSaved++;
        }
        
        // 清空副本背包
        this.dungeonInv = [];
        
        this.saveData();
        
        document.getElementById('story-modal').classList.add('hidden');
        alert(`🎉 ${this.currentDungeon.name} 通关完成！\n\n📦 ${itemsSaved} 件道具已存入仓库`);
        this.showLobby();
    }

    goToNextLayer() {
        this.closeStoryModal();
        this.extract();
    }

    goToNextLayerFromCell(x, y) {
        const cell = this.grid[y][x];
        if (cell.isRevealed && cell.roomType === 'main' && cell.canGoNext) {
            if (confirm('🚪 发现通往下一层的入口，是否进入？')) {
                this.extract();
            }
        }
    }

    closeStoryModal() {
        document.getElementById('story-modal').classList.add('hidden');
        this.renderDungeon();
    }

    showItemDetail(idx) {
        const item = this.dungeonInv[idx];
        if (!item) return;
        
        // 显示道具详情弹窗
        const modal = document.getElementById('item-modal');
        const title = document.getElementById('item-title');
        const icon = document.getElementById('item-icon');
        const desc = document.getElementById('item-desc');
        const actionBtn = document.getElementById('item-action-btn');
        
        title.textContent = item.name || '未知物品';
        icon.textContent = item.icon || '📦';
        desc.textContent = item.desc || '没有描述';
        
        // 根据道具类型设置按钮
        if (item.type === 'functional') {
            // 功能道具：显示使用按钮
            actionBtn.textContent = '使用道具';
            actionBtn.onclick = () => this.useItem(idx);
            actionBtn.style.display = 'inline-block';
        } else if (item.type === 'story') {
            // 剧情道具：显示碎片剧情
            const storyText = this.getItemStory(item.id);
            desc.innerHTML = `${item.desc}<br><br><em style="color:#d4a574;">${storyText}</em>`;
            actionBtn.textContent = '关闭';
            actionBtn.onclick = () => this.closeItemModal();
            actionBtn.style.display = 'inline-block';
        } else {
            actionBtn.style.display = 'none';
        }
        
        modal.classList.remove('hidden');
    }
    
    // 获取道具的碎片剧情
    getItemStory(itemId) {
        const stories = {
            'oldKey': '钥匙上刻着古老的符文，你认出这是蛇人文明鼎盛时期的文字。传说只有被选中者才能用此钥匙打开蛇父神殿深处的密室，那里藏着蛇人最后的秘密...',
            'mysteriousScroll': '卷轴上的文字仿佛有生命般蠕动，当你凝视它时，脑海中响起低沉的吟唱。这是阿卡洛语——蛇人的古语，记载着操控火焰的禁忌咒文...',
            'amulet': '护身符散发着微弱的温热，当你握紧它时，能感觉到蛇人信徒的虔诚。这个护身符曾经属于一位蛇人祭司，它能让你在蛇人的领地中保持清醒...',
            'slaveMap': '地图上标注的路线已经模糊不清，但你能辨认出几个关键的标记。这是当年逃亡的奴隶们用生命绘制的地图，上面标注着安全的通道和致命的陷阱...',
            'lantern': '煤油灯的玻璃罩上有一道细微的裂痕，但灯光依然稳定。这盏灯曾经照亮过无数探险者的道路，在深渊中，光明是最珍贵的礼物...',
            'sanityPotion': '药水瓶中的液体呈现出诡异的紫色，轻轻摇晃时会发出微弱的光芒。这是用深渊中的草药炼制的药剂，能暂时稳定心神...',
            'detector': '探测器的指针不断颤动，仿佛能感受到地底深处的脉动。这是用蛇人科技改造的仪器，能探测到隐藏的危险...',
            'markerPack': '精神力上刻着精细的刻度，每一根都经过精心制作。在深渊中，正确的标记意味着生与死的区别...'
        };
        return stories[itemId] || '这件物品似乎隐藏着更多秘密...';
    }
    
    // 使用道具
    useItem(idx) {
        const item = this.dungeonInv[idx];
        if (!item) return;
        
        let used = false;
        
        switch (item.effect) {
            case 'sanity+20':
                this.sanity = Math.min(100, this.sanity + 20);
                this.log('使用了理智药水，理智+20', 'good');
                used = true;
                break;
            case 'markers+2':
                this.markers += 2;
                this.log('使用了精神力套装，精神力+2', 'good');
                used = true;
                break;
            case 'antiHallucination':
                this.hallucinationMode = false;
                this.log('使用了煤油灯，幻觉消退', 'good');
                used = true;
                break;
            case 'reveal':
                // 探测器：需要选择目标格子
                this.closeItemModal();
                this.startDetectorMode(idx);
                return; // 不立即删除道具
            default:
                this.log('此道具无法直接使用', 'info');
        }
        
        if (used) {
            // 删除已使用的道具
            this.dungeonInv.splice(idx, 1);
            this.closeItemModal();
            this.renderDungeon();
        }
    }
    
    // 探测器模式：选择要揭示的格子
    startDetectorMode(itemIdx) {
        this.log('点击任意格子使用探测器...', 'special');
        this.detectorMode = true;
        this.detectorItemIdx = itemIdx;
    }
    
    // 使用探测器揭示格子
    useDetector(x, y) {
        const cell = this.grid[y][x];
        if (!cell.isRevealed) {
            cell.isRevealed = true;
            this.exploredSteps++;
            this.log(`探测器揭示了 (${x},${y}) 的内容`, 'good');
            
            // 删除探测器
            this.dungeonInv.splice(this.detectorItemIdx, 1);
            this.detectorMode = false;
            this.detectorItemIdx = null;
            
            // 触发格子效果
            if (cell.isTrap) {
                this.log('💀 探测器触发了陷阱！', 'bad');
                this.triggerTrap();
            } else if (cell.roomType === 'main' || cell.roomType === 'sub') {
                this.triggerStoryWithChoice(cell);
            } else if (cell.number === 0) {
                this.autoExpand(x, y);
            }
            
            this.renderDungeon();
        }
    }
    
    // 关闭道具弹窗
    closeItemModal() {
        const modal = document.getElementById('item-modal');
        if (modal) modal.classList.add('hidden');
    }

    async autoExpand(x, y) {
        let expanded = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy, nx = x + dx;
                if (ny >= 0 && ny < this.gridSize && nx >= 0 && nx < this.gridSize) {
                    const neighbor = this.grid[ny][nx];
                    // 跳过陷阱和剧情房间，只展开普通房间
                    if (!neighbor.isRevealed && !neighbor.isMarked && !neighbor.isTrap && neighbor.roomType === 'normal') {
                        neighbor.isRevealed = true;
                        this.exploredSteps++;
                        expanded.push({x: nx, y: ny, threatCount: neighbor.threatCount});
                        
                        // 多米诺延迟效果：50ms
                        this.renderDungeon();
                        await this.delay(50);
                        
                        // DS09: 0威胁连锁揭示（简化计算后，0威胁更容易出现）
                        if (neighbor.threatCount === 0) {
                            await this.autoExpand(nx, ny);
                        }
                    }
                }
            }
        }
    }

    updateHallucination() {
        if (this.sanity < 30 && !this.hallucinationMode) {
            this.hallucinationMode = true;
            this.log('👁️ 你进入了幻觉模式...数字开始欺骗你', 'special');
        } else if (this.sanity >= 30 && this.hallucinationMode) {
            this.hallucinationMode = false;
            this.log('✨ 幻觉消退，你恢复了清醒', 'good');
        }
    }

    retreat() {
        this.retreatAndSettle();
    }

    extract() {
        // 从剧情房中触发，前往下一层
        if (this.currentLayer < this.currentDungeon.layers.length - 1) {
            alert(`准备前往 ${this.currentLayer + 2}层...`);
            this.startLayer(this.currentLayer + 1);
        } else {
            // BOSS战/通关
            this.completeDungeon();
        }
    }

    completeDungeon() {
        if (!this.persistent.completedDungeons.includes(this.currentDungeon.id)) {
            this.persistent.completedDungeons.push(this.currentDungeon.id);
        }
        
        // 结算道具为金币
        const { goldEarned, itemCount } = this.settleItems();
        
        // 检查解锁
        if (this.currentDungeon.id === 'shadow') {
            // 检查是否获得了解锁物品
            const hasScroll = this.dungeonInv.some(i => i.id === 'mysteriousScroll');
            if (hasScroll && !this.persistent.unlockedDungeons.includes('gate')) {
                this.persistent.unlockedDungeons.push('gate');
                alert('🎉 解锁了新副本：幽暗之门！');
            }
        }
        
        this.saveData();
        alert(`🎉 通关了 ${this.currentDungeon.name}！\n\n💰 道具结算：${itemCount} 件物品 → ${goldEarned} 金币`);
        this.dungeonInv = []; // 清空背包
        this.showLobby();
    }

    quitLayer() {
        if (confirm('确定要撤退吗？将返回大厅。')) {
            this.showLayerSelect();
        }
    }

    // 撤退并结算
    retreatAndSettle() {
        const config = this.currentDungeon.layers[this.currentLayer];
        if (this.exploredSteps < config.steps) {
            this.log('⚠️ 探索步数不足！', 'bad');
            return;
        }

        // 结算道具为金币
        const { goldEarned, itemCount } = this.settleItems();
        
        if (confirm(`确定要撤退吗？\n\n💰 ${itemCount} 件物品将结算为 ${goldEarned} 金币`)) {
            this.persistent.gold += goldEarned;
            this.saveData();
            this.dungeonInv = []; // 清空背包
            this.showLobby();
        }
    }

    // 结算道具为金币
    settleItems() {
        let goldEarned = 0;
        let itemCount = 0;
        
        this.dungeonInv.forEach(item => {
            if (item.value) {
                goldEarned += Math.floor(item.value * 0.5); // 50%价格回收
                itemCount++;
            }
        });
        
        this.persistent.gold += goldEarned;
        return { goldEarned, itemCount };
    }

    death() {
        this.persistent.stats.totalDeaths++;
        
        // 死亡只损失副本内获得的道具，保留金币
        const lostItems = this.dungeonInv.filter(item => item.obtainedInDungeon).length;
        const keptItems = this.dungeonInv.filter(item => !item.obtainedInDungeon);
        
        this.dungeonInv = keptItems; // 只保留商店购买的道具
        
        this.saveData();
        alert(`💀 理智崩溃！\n\n你的精神无法承受这片黑暗...\n🎒 损失了 ${lostItems} 件副本内获得的道具\n✅ 保留了商店购买的道具`);
        this.showLobby();
    }

    log(msg, type) {
        console.log(`[${type || 'info'}] ${msg}`);
        
        // 保存到日志数组
        this.explorationLogs.unshift({ msg, type, time: Date.now() });
        
        // 限制日志条目数
        while (this.explorationLogs.length > 20) {
            this.explorationLogs.pop();
        }
        
        // 添加到探索日志面板
        const logPanel = document.getElementById('exploration-log');
        if (logPanel) {
            // 清空并重新渲染所有日志
            logPanel.innerHTML = this.explorationLogs.map(log => 
                `<div class="log-entry ${log.type || 'info'}">${log.msg}</div>`
            ).join('');
        }
    }
    
    renderLogs() {
        const logPanel = document.getElementById('exploration-log');
        if (logPanel && this.explorationLogs.length > 0) {
            logPanel.innerHTML = this.explorationLogs.map(log => 
                `<div class="log-entry ${log.type || 'info'}">${log.msg}</div>`
            ).join('');
        }
    }

    // 剧情数据 - 岭下暗影
    // 根据层数和房间类型获取奖励道具
    getLayerRewardItem(roomType) {
        const layer = this.currentLayer;
        const rand = Math.random();
        
        // 第1层（低风险）
        if (layer === 0) {
            if (roomType === 'sub' && rand < 0.5) {
                // 支线50%给煤油灯或精神力+1
                if (rand < 0.25) {
                    return { id: 'lantern', name: '煤油灯', icon: '🏮', type: 'functional', desc: '降低幻觉效果30秒', effect: 'antiHallucination', value: 80 };
                } else {
                    // 精神力+1，返回特殊标记
                    return { id: 'markerBonus', name: '精神力+1', icon: '💠', type: 'bonus', effect: 'markers+1', value: 0 };
                }
            }
            return null; // 主线不给道具
        }
        
        // 第2层（开始压力）
        if (layer === 1) {
            if (roomType === 'main') {
                // 主线给理智药水
                return { id: 'sanityPotion', name: '理智药水', icon: '🧪', type: 'functional', desc: '恢复20点理智值', effect: 'sanity+20', value: 50 };
            } else if (roomType === 'sub' && rand < 0.3) {
                // 支线30%给奴隶地图
                return { id: 'slaveMap', name: '奴隶地图', icon: '🗺️', type: 'story', desc: '记录着秘密通道的位置', value: 150 };
            }
        }
        
        // 第3层（中等风险）
        if (layer === 2) {
            if (roomType === 'main') {
                // 主线给探测器
                return { id: 'detector', name: '探测器', icon: '🔍', type: 'functional', desc: '揭示任意1格内容', effect: 'reveal', value: 100 };
            } else if (roomType === 'sub' && rand < 0.25) {
                // 支线25%给护身符
                return { id: 'amulet', name: '护身符', icon: '✨', type: 'story', desc: '蛇人信徒的护身符，可降低遭遇危险的概率', value: 250 };
            }
        }
        
        // 第4层（高风险）
        if (layer === 3) {
            if (roomType === 'main') {
                // 主线给精神力套装
                return { id: 'markerPack', name: '精神力套装', icon: '💠', type: 'functional', desc: '获得2个额外精神力', effect: 'markers+2', value: 30 };
            } else if (roomType === 'sub' && rand < 0.2) {
                // 支线20%给古老钥匙
                return { id: 'oldKey', name: '古老钥匙', icon: '🗝️', type: 'story', desc: '用于开启隐藏的密室', value: 200 };
            }
        }
        
        // 第5层（BOSS）
        if (layer === 4) {
            if (roomType === 'main') {
                // 主线通关给神秘卷轴
                return { id: 'mysteriousScroll', name: '神秘卷轴', icon: '📜', type: 'story', desc: '记载着古老的咒语', value: 300 };
            } else if (roomType === 'sub' && rand < 0.15) {
                // 支线15%给火焰咒文（使用神秘卷轴代替，或自定义）
                return { id: 'mysteriousScroll', name: '火焰咒文', icon: '🔥', type: 'story', desc: '对蛇人特攻的古老咒文', value: 300 };
            }
        }
        
        return null;
    }

    getLayerStories(layerIndex) {
        const shadowStories = {
            0: { // 第1层 - 地窖
                main: [
                    {
                        id: 'shadow_l1_main_1',
                        title: '主线·地窖入口',
                        text: '推开老宅沉重的木门，穿过积灰的走廊来到地窖，潮湿的霉味混杂着泥土气息扑面而来。墙角的砖墙被破开一个可供人通行的大洞，洞壁残留着新鲜的挖掘痕迹，地面上一串男性足迹延伸进洞内，却在深处被碎石掩盖；墙壁上刻着模糊的18世纪船锚图案，那是当年奴隶贩子的隐秘标记。乔什的工具随意散落，隧道深处传来隐约的气流声，带着地底特有的阴冷，你知道，要找到乔什，就必须踏入这片未知的黑暗。',
                        goodOutcome: {
                            preText: '你握紧手电筒，小心翼翼地向隧道深处探索。脚步声在狭窄的空间里回荡，每走一步，霉味便更加浓烈。突然，你的脚踢到一个金属物体——那是一盏老式的煤油灯，灯芯尚存，玻璃罩完好无损。你试着摇了摇，里面还有半瓶煤油。',
                            resultText: '你找到了一盏还能使用的煤油灯，照亮了前方的道路',
                            reward: '理智+10，获得煤油灯',
                            sanity: 10,
                            item: { id: 'lantern', name: '煤油灯', icon: '🏮', type: 'functional', desc: '降低幻觉效果', effect: 'antiHallucination', value: 80 }
                        },
                        badOutcome: {
                            preText: '你刚踏入隧道几步，黑暗中突然有什么冰凉的东西擦过你的肩膀。你猛地转身，手电筒的光芒扫过空荡荡的通道，却什么也没看到。但那刺骨的寒意真实存在，仿佛有什么无形的存在正贴在你的背后，低声呢喃着无法理解的语言。',
                            resultText: '你感到理智在流逝，幻觉开始侵蚀你的意识',
                            reward: '理智-15，幻觉模式持续时间+1回合',
                            sanity: -15
                        }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l1_sub_1',
                        title: '支线·走私账本',
                        text: '地窖角落的木箱积满灰尘，撬开腐朽的木板，里面藏着一本皮质封面的账本，泛黄的纸页上记录着以利亚·文斯考特历年走私奴隶的数量、交易对象与获利明细。账本最后一页画着一个简易的船锚标记，与墙壁上的图案完全一致。',
                        goodOutcome: {
                            preText: '你小心翼翼地翻开账本，纸张因年代久远而发出轻微的脆响。在记录最后一笔交易的页面间，你发现了一张泛黄的照片——那是几个矿工站在隧道入口的合影，背面用褪色的墨水写着："隧道东端，第三块松动的砖后，备用出口。"你的心跳加速，这条信息可能成为逃生的关键。',
                            resultText: '账本中夹着一张泛黄的照片，背面写着"隧道东端有备用出口"',
                            reward: '理智+5，发现隐藏线索',
                            sanity: 5
                        },
                        badOutcome: {
                            preText: '你的手指刚触到账本的封皮，一阵寒意便从指尖蔓延至全身。当你翻开泛黄的纸页时，一张画着扭曲蛇形符号的纸条从页间悄然滑落。那符号仿佛有生命般在烛光下蠕动，你感到无数道冰冷的视线从四面八方投射而来，黑暗中似乎有什么东西已经注意到了你的存在。',
                            resultText: '你翻阅账本时，一张蛇形符号的纸条从页间滑落...你感到被注视',
                            reward: '理智-10，获得"被标记"状态',
                            sanity: -10
                        }
                    },
                    {
                        id: 'shadow_l1_sub_2',
                        title: '支线·未寄出的信',
                        text: '地窖墙角的暗格中，藏着一封未寄出的信："以利亚疯了，他说隧道尽头有「永恒的生命」，非要带着奴隶进去……那些人再也没回来，我听到了隧道里的嘶吼，那声音不似人类，我要逃离这里，再也不回来。"信纸边缘被泪水浸透，字迹潦草而颤抖。',
                        goodOutcome: {
                            preText: '你将信件翻到背面，发现上面用粗糙的炭笔线条画着一幅简易地图。地图标注了从地窖到隧道深处的路径，其中一段用虚线标记为"安全通道"，旁边还画着一个箭头指向一扇隐蔽的门。你仔细辨认那些模糊的标记，将路线牢牢记在心中。',
                            resultText: '信件背面画着简易地图，标记了安全通道',
                            reward: '精神力+1，理智+5',
                            sanity: 5,
                            markers: 1
                        },
                        badOutcome: {
                            preText: '你刚读完信的最后一句，身后突然传来一阵轻微的哭泣声，那声音凄婉哀怨，仿佛来自一个受尽恐惧折磨的灵魂。你猛地转身，手电筒的光芒扫过空荡荡的地窖，却什么也没看到。但那哭泣声越来越近，就在你耳边响起，你能感觉到一股冰冷的气息拂过你的后颈。',
                            resultText: '你读完信后，身后传来轻微的哭泣声...是那个写信人的幽灵吗？',
                            reward: '理智-15，遭遇幽灵幻象',
                            sanity: -15
                        }
                    }
                ]
            },
            1: { // 第2层 - 隧道遗迹
                main: [
                    {
                        id: 'shadow_l2_main_1',
                        title: '主线·骸骨密室',
                        text: '隧道西行两百英尺后，空间豁然开阔，六具枯骨散落在潮湿的地面上。三具骸骨的四肢还套着锈蚀的铁质镣铐，骨骼上布满撕咬与断裂的痕迹；另外三具残留着殖民时代的衣物碎片，布料上凝结的暗红痕迹早已干涸。你在骸骨堆下摸到一个锈蚀的铁盒，里面藏着一封泛黄的信件——是杰克伯·彼希写给友人的手札，字迹颤抖地记录着乔什的先祖以利亚·文斯考特利用隧道走私奴隶，却遭遇地底怪物袭击的往事。房间南侧的石壁上有一道狭窄的通道，蜿蜒向下，通往第二层的下一个房间。',
                        goodOutcome: {
                            preText: '你小心地拆开信件，借着微弱的光线阅读那些颤抖的字迹。信中详细记录了那场可怕的遭遇，让你对这片黑暗有了更深的了解。当你将信件放回铁盒时，指尖触到底层的一个硬物——一枚锈蚀的铜钥匙，上面刻着"宝库"二字。钥匙入手冰凉，但你知道它将是通往真相的关键。',
                            resultText: '你在铁盒底层发现了一枚铜钥匙，上面刻着"宝库"二字',
                            reward: '理智+10，获得古老钥匙',
                            sanity: 10,
                            item: { id: 'oldKey', name: '古老钥匙', icon: '🗝️', type: 'story', desc: '用于开启隐藏的密室', value: 200 }
                        },
                        badOutcome: {
                            preText: '你全神贯注地阅读信件，字里行间透出的恐惧让你不寒而栗。当你终于读完，抬起头准备继续前进时，一股寒意瞬间笼罩全身——那些原本散落各处的骸骨，不知何时已经改变了方向，它们空洞的眼眶正齐刷刷地"注视"着你，下颌骨张开，仿佛在发出无声的嘲笑。',
                            resultText: '当你读完信件抬头时，那些骸骨似乎移动了位置...它们面向着你',
                            reward: '理智-20，遭遇尸骸诅咒',
                            sanity: -20
                        }
                    },
                    {
                        id: 'shadow_l2_main_2',
                        title: '主线·峭壁通道',
                        text: '通道尽头是一处二十英尺高的垂直峭壁，下方是幽暗的洞穴空间，仅能隐约看到地面的岩石轮廓。峭壁上布满湿滑的苔藓，偶尔有水滴从洞顶滴落，在下方汇成细小的水洼。当年奴隶贩子与怪物搏斗的痕迹仍在——岩壁上有深浅不一的抓痕，地面散落着破碎的锁链与腐朽的木材。你必须想办法降下峭壁，下方的洞穴里，似乎有什么东西在黑暗中悄然注视着上方的动静。',
                        goodOutcome: {
                            preText: '你仔细观察峭壁表面，发现那些看似随机的抓痕其实遵循着某种规律。在岩壁的阴影中，你摸索到了一排几乎被苔藓完全覆盖的凹陷——那是古代蛇人修建的下行阶梯。你小心翼翼地沿着阶梯下降，在其中一个平台上发现了一张刻有地图的皮革碎片，上面标注着秘密通道的位置。',
                            resultText: '你发现了一条隐蔽的下行阶梯，是古代蛇人修建的',
                            reward: '理智+5，获得奴隶地图',
                            sanity: 5,
                            item: { id: 'slaveMap', name: '奴隶地图', icon: '🗺️', type: 'story', desc: '记录着秘密通道的位置', value: 150 }
                        },
                        badOutcome: {
                            preText: '你试图寻找下降的路径，但湿滑的苔藓让你的每一步都充满危险。就在你即将到达底部时，手突然一滑，整个人重重摔在坚硬的岩石上。剧痛让你眼前发黑，还未等你缓过气来，黑暗中便传来令人毛骨悚然的鳞片摩擦地面的声音——有什么东西正从阴影中缓缓逼近。',
                            resultText: '下降时你手一滑，重重摔在底部，黑暗中传来鳞片摩擦地面的声音...',
                            reward: '理智-15，生命值-20，遭遇伏击',
                            sanity: -15
                        }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l2_sub_1',
                        title: '支线·安娜的铭牌',
                        text: '你伸手触碰那具套着镣铐的骸骨，指腹抚过锈蚀的铁环，骸骨的手指突然微微晃动，攥着的半块青铜铭牌滑落。铭牌上刻着"安娜"二字，背面是一个小小的十字架，边缘刻着细密的花纹。',
                        goodOutcome: {
                            preText: '你小心翼翼地拾起那块青铜铭牌，出乎意料的是，金属入手并非刺骨的冰凉，而是带着一种奇异的温暖。铭牌上"安娜"二字在昏暗的光线下泛着柔和的光泽，背面的十字架仿佛散发着某种无形的力量，让你紧绷的神经逐渐放松。你感到一种莫名的安慰，仿佛那个受尽苦难的灵魂终于得到了安息，她的祝福将伴随你的旅程。',
                            resultText: '铭牌入手温暖，你感到一种莫名的安慰，仿佛安娜的灵魂得到了安息',
                            reward: '理智+15，获得守护效果',
                            sanity: 15
                        },
                        badOutcome: {
                            preText: '你的手指刚触碰到铭牌的边缘，那具骸骨的手突然以一种不可能的角度翻转，死死抓住你的手腕。那股力量冰冷刺骨，仿佛来自深渊的寒意顺着你的血液蔓延。你拼命挣扎，却感觉到一股怨毒的意识正通过接触点侵入你的思维，那是安娜临死前的痛苦与绝望，她不愿任何人离开这片黑暗。',
                            resultText: '当你拿起铭牌时，骸骨突然死死抓住你的手腕，冰冷刺骨...',
                            reward: '理智-20，被诅咒缠身',
                            sanity: -20
                        }
                    },
                    {
                        id: 'shadow_l2_sub_2',
                        title: '支线·十字护身符',
                        text: '攀爬峭壁时，指尖抠进一道狭窄的石缝，摸到一个冰凉的金属物件。取出一看，是一枚铜制十字架护身符，表面氧化发黑，但十字架中心的宝石仍透着微弱的光芒。',
                        goodOutcome: {
                            preText: '你将护身符握在掌心，那枚看似普通的铜制十字架突然开始散发出温暖的光芒。宝石中心的光晕逐渐扩大，形成一道柔和的光幕笼罩着你。在这光芒中，你感到连日来的恐惧与疲惫被一点点驱散，内心重新获得了平静与勇气。这枚护身符似乎蕴含着某种神圣的力量，能够抵抗这片黑暗中的邪恶。',
                            resultText: '护身符散发出温暖的光芒，你感到恐惧被驱散',
                            reward: '理智+10，幻觉抗性+20%',
                            sanity: 10
                        },
                        badOutcome: {
                            preText: '你正要将护身符收好，它突然在你手中变得滚烫，仿佛刚从熔炉中取出。剧烈的灼痛让你忍不住松开了手，看着那枚十字架坠入深渊。就在它消失在黑暗中时，一声刺耳的尖啸从下方传来，那声音充满了愤怒与恶意，仿佛你放弃了一件能够保护自己的圣物，让潜伏的黑暗生物欣喜若狂。',
                            resultText: '护身符突然变得滚烫，你手一松它坠入深渊，伴随着一声刺耳的尖啸...',
                            reward: '理智-10，精神力-1',
                            sanity: -10,
                            markers: -1
                        }
                    },
                    {
                        id: 'shadow_l2_sub_3',
                        title: '碎片·走私者日记',
                        text: '"隧道里的鳞片不是蛇的，摸起来像金属，带着腥味……我看到它站起来了，有手有脚，像人一样走在黑暗里。它的眼睛没有瞳孔，只有一片浑浊的黄色，盯着我的时候，我连呼吸都忘了。"—— 1810年奴隶走私者的日记残页',
                        goodOutcome: {
                            preText: '你小心地翻动泛黄的纸页，在日记边缘发现了一些粗糙的炭笔画。那是某种生物的简笔示意图，用箭头标注了几个关键部位——眼睛、颈部、腹部。旁边还有一行小字："怕火，怕光，攻击前先闭眼。"这些珍贵的情报让你对即将面对的敌人有了更多了解，也增加了一分生存的希望。',
                            resultText: '日记边缘画着怪物的弱点示意图',
                            reward: '获得敌人情报，精神力+1',
                            markers: 1
                        },
                        badOutcome: {
                            preText: '你刚读完日记的最后一行，黑暗中突然传来一阵缓慢而沉重的脚步声——那步伐的节奏与日记中描述的怪物走路方式一模一样。每一步都伴随着鳞片摩擦地面的沙沙声，而且声音越来越近，越来越清晰。你屏住呼吸，感觉那东西就在转角处，它的黄色眼睛可能正透过黑暗注视着你。',
                            resultText: '你读完日记后，黑暗中传来与描述一样的脚步声...越来越近',
                            reward: '理智-15，遭遇巡逻怪物',
                            sanity: -15
                        }
                    },
                    {
                        id: 'shadow_l2_sub_4',
                        title: '碎片·苔藓刻字',
                        text: '峭壁通道的苔藓下，刻着模糊的字迹："水是生路，螺旋是门"，字迹陈旧，部分笔画已被苔藓覆盖，像是数代闯入者留下的共同警示。下方的水洼中，倒影里的字迹似乎有所不同，仔细辨认，发现最后还藏着"勿回头"三个字。',
                        goodOutcome: {
                            preText: '你反复琢磨着这些神秘的警示，目光落在水洼上。水面平静如镜，映出岩壁上苔藓形成的天然螺旋图案。突然，你意识到"螺旋是门"的含义——那不是什么比喻，而是字面意思。你沿着螺旋状的水流痕迹寻找，果然在一处岩壁后发现了一条被藤蔓遮掩的狭窄通道，那是前人留下的逃生之路。',
                            resultText: '你领悟了警示的含义，发现了一条隐藏通道',
                            reward: '理智+5，捷径解锁',
                            sanity: 5
                        },
                        badOutcome: {
                            preText: '你凝视着水洼中的倒影，试图解读更多的线索。突然，一种无法抑制的冲动让你转过头去——就在那一瞬间，水面的倒影却没有随你转动。你看到了一张陌生的脸，那是一张惨白而扭曲的面孔，眼睛是两个漆黑的空洞，嘴角却挂着诡异的微笑。那张脸缓缓抬起头，直直地"看"着你。',
                            resultText: '你忍不住回头看了一眼...水洼中倒映的不是你的脸',
                            reward: '理智-25，幻觉模式强制触发',
                            sanity: -25
                        }
                    }
                ]
            },
            2: { // 第3层 - 蛇人先民遗迹
                main: [
                    {
                        id: 'shadow_l3_main_1',
                        title: '主线·音乐室',
                        text: '洞穴豁然开朗，岩壁上镶嵌的水晶在手电筒的光芒下折射出诡异的光晕。洞顶高逾百英尺，远处的墙壁上交错着青铜管，镶嵌着大小各异的彩色水晶，形成一个扭曲的奇异结构。房间中央，一块岩石被雕成不适配人类身形的座椅，上方的尖刺上插着二十颗人类头颅，表皮刻满扭曲的符文。没有风，却能听到轻柔的哀泣合唱，那声音正是来自这些头颅，它们紧闭的双眼下，嘴唇与喉咙的肌肉仍在无意识地颤动。',
                        goodOutcome: {
                            preText: '你强忍着恐惧，仔细观察那些水晶与青铜管的排列规律。在座椅底部，你发现了一组隐藏的机关——那是蛇人风格的控制装置。深吸一口气，你按照墙上符文的提示调整了水晶的角度。随着一声沉闷的响动，哀泣声逐渐减弱，那些头颅的嘴唇停止了颤动，紧闭的眼睛彻底放松，仿佛在无尽的折磨后终于获得了永恒的安息。',
                            resultText: '你发现了控制水晶的机关，停止了哀泣，头颅们闭上了眼睛',
                            reward: '理智+20，获得理智药水',
                            sanity: 20,
                            item: { id: 'sanityPotion', name: '理智药水', icon: '🧪', type: 'functional', desc: '恢复20点理智值', effect: 'sanity+20', value: 50 }
                        },
                        badOutcome: {
                            preText: '你试图靠近座椅观察那些头颅，哀泣声突然变得尖锐刺耳，仿佛你触碰到了某种禁忌。二十颗头颅在同一瞬间睁开了眼睛——那是一双双没有瞳孔的血红色眼睛，齐刷刷地盯着你。它们的嘴巴大张，发出令人崩溃的尖啸，那声音穿透你的耳膜，直击大脑深处，让你的意识在瞬间支离破碎。',
                            resultText: '哀泣声突然变得刺耳，头颅们睁开了眼睛，齐声尖叫...',
                            reward: '理智-30，精神崩溃',
                            sanity: -30
                        }
                    },
                    {
                        id: 'shadow_l3_main_2',
                        title: '主线·陷坑陷阱',
                        text: '离开音乐室，通道变得宽阔，地面覆盖着碎石与潮湿的苔藓，行走时难免发出声响。前方的地面看似平坦，却暗藏着一道十英尺深的陷坑，坑壁上刻着与之前隧道中相似的蛇形图案，证明这里曾是蛇人隧道与奴隶通道的交汇之处。坑底散落着腐烂的奴隶枷锁与破碎的骨骼，显然曾有人不慎坠入此地，再也没能离开。',
                        goodOutcome: {
                            preText: '你谨慎地探查陷坑边缘，发现坑壁上有着规律分布的凹槽——那是古代蛇人留下的攀爬点。你小心翼翼地沿着这些凹陷下降，双脚终于踏在坑底相对坚实的地面上。在搜索出口时，你在一堆碎石中发现了一个金属装置，那是一台古老的探测器，虽然年代久远，但仪器上的指针仍在微微颤动，似乎还能正常工作。',
                            resultText: '你发现了坑壁上的攀爬点，安全降入并成功找到出口',
                            reward: '理智+5，获得探测器',
                            sanity: 5,
                            item: { id: 'detector', name: '探测器', icon: '🔍', type: 'functional', desc: '揭示任意1格内容', effect: 'reveal', value: 100 }
                        },
                        badOutcome: {
                            preText: '你试图绕过陷坑，但湿滑的苔藓让你失去了平衡。你感到身体悬空，然后重重摔在坑底，剧痛从四肢百骸传来。还未等你爬起身，周围的骨骼开始发出令人牙酸的摩擦声——那些散落的骸骨正在重组，空洞的眼眶中燃起幽蓝的鬼火，向你缓缓爬来。',
                            resultText: '你失足坠入陷坑，坑底的骸骨突然活动起来...',
                            reward: '理智-20，生命值-30，遭遇骸骨袭击',
                            sanity: -20
                        }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l3_sub_1',
                        title: '支线·蛇人牙齿',
                        text: '你举起武器狠狠砸向头颅装置，青铜管与头骨碰撞发出刺耳的声响，随着一声巨响，装置轰然爆炸，洞穴顶部的碎石纷纷掉落。烟尘散去后，你在散落的青铜管碎片中发现一枚泛着寒光的蛇人牙齿，牙齿尖端仍残留着暗红色的血迹。',
                        goodOutcome: {
                            preText: '你小心地用布包裹住那枚蛇人牙齿，将它从青铜管碎片中取出。这枚牙齿足有三寸长，呈现出一种诡异的象牙白色，表面的纹理像是某种天然的符文。尽管散发着淡淡的腥味，但你意识到这是珍贵的战利品——蛇人的牙齿可以作为武器的镶嵌材料，让你的攻击附带致命的毒素。',
                            resultText: '牙齿可以作为武器镶嵌材料，攻击附带毒素伤害',
                            reward: '获得强化材料，精神力+1',
                            markers: 1
                        },
                        badOutcome: {
                            preText: '你好奇地伸手触碰那枚蛇人牙齿，想要仔细观察。就在你的指尖接触到牙齿表面的瞬间，一阵尖锐的刺痛传来——锋利的边缘轻易地割破了你的皮肤。你的视野突然开始模糊，四肢感到前所未有的沉重，一种冰冷的麻痹感从伤口处向全身蔓延。',
                            resultText: '当你触碰牙齿时，指尖被割破，毒素让你视野模糊...',
                            reward: '理智-15，中毒状态',
                            sanity: -15
                        }
                    },
                    {
                        id: 'shadow_l3_sub_2',
                        title: '支线·奴隶信件',
                        text: '你俯身查看陷坑底部的积水，浑浊的水中漂浮着一封褪色的奴隶信件，纸张早已泡得发软，字迹模糊不清。小心翼翼地展开，勉强能辨认出"鳞甲怪物""夜间出没""怕火"等字眼，信件末尾画着一个蛇形图案。',
                        goodOutcome: { text: '信件中藏着逃生的路线图', reward: '理智+5，发现捷径', sanity: 5 },
                        badOutcome: { text: '信上的蛇形图案突然活了过来，化为毒蛇咬向你的手...', reward: '理智-15，生命值-10', sanity: -15 }
                    },
                    {
                        id: 'shadow_l3_sub_3',
                        title: '支线·阿卡洛语',
                        text: '你犹豫片刻后坐在了岩石座椅上，头颅的哀泣合唱突然变得清晰洪亮，仿佛就在耳边吟唱。诡异的旋律钻进脑海，眼前浮现出蛇人祭祀的模糊幻象，你下意识地记住了几句晦涩的阿卡洛语发音。',
                        goodOutcome: { text: '你学会了基础阿卡洛语，可以解读蛇人符文', reward: '获得语言技能，理智+10', sanity: 10 },
                        badOutcome: { text: '幻象太过真实，你的意识被困在座椅上，差点无法醒来...', reward: '理智-25，暂时失去行动能力', sanity: -25 }
                    }
                ]
            },
            3: { // 第4层 - 蛇人领地核心
                main: [
                    {
                        id: 'shadow_l4_main_1',
                        title: '主线·真菌种植场',
                        text: '巨大的洞穴中，怪异的真菌长得比人还高，空气弥漫着温暖潮湿的雾气，每十分钟便会从洞顶的孔洞中喷涌一次。两名身形畸形、浑身多毛的生物正在照料真菌，它们看起来像苍白的猿猴，手臂远长于常人，见到你时停下动作，用巨大的眼睛好奇地注视着，没有立刻发动攻击。地面上，一些真菌的伞盖散发着微弱的荧光，照亮了周围散落的奴隶契约碎片。',
                        goodOutcome: { text: '退化人对你产生好奇，允许你安全通过', reward: '理智+10，获得精神力套装', sanity: 10, item: { id: 'markerPack', name: '精神力套装', icon: '💠', type: 'functional', desc: '获得2个额外精神力', effect: 'markers+2', value: 30 } },
                        badOutcome: { text: '退化人突然狂暴，发出刺耳的尖叫，更多同类从黑暗中涌出...', reward: '理智-20，遭遇围攻', sanity: -20 }
                    },
                    {
                        id: 'shadow_l4_main_2',
                        title: '主线·蛇父神殿',
                        text: '洞穴中央矗立着一根巨大的天然石柱，被雕刻成盘卷的巨蛇形态，蛇的前额镶嵌着一枚苍白的宝石，散发着微弱的光芒，那是蛇人神祇伊格的象征。石柱前的石祭坛上，暗色的痕迹早已干涸，那是经年累月的血迹；两侧的球形金色香炉中，仍有芳香的烟云缓缓升腾。',
                        goodOutcome: { text: '你领悟了宝石的秘密，获得了伊格的祝福', reward: '理智+15，获得神力加持', sanity: 15 },
                        badOutcome: { text: '伊格的意志侵入你的脑海，命令你臣服...', reward: '理智-30，被精神控制一回合', sanity: -30 }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l4_sub_1',
                        title: '碎片·奴隶契约',
                        text: '契约碎片上印有以利亚·文斯考特的签名，详细记录了奴隶交易的条款。',
                        goodOutcome: { text: '契约背面藏着宝库密码', reward: '获得密码，金币+50' },
                        badOutcome: { text: '契约上的签名开始流血，文斯考特的灵魂浮现...', reward: '理智-20，遭遇怨灵', sanity: -20 }
                    },
                    {
                        id: 'shadow_l4_sub_2',
                        title: '碎片·香炉烟雾',
                        text: '芳香的烟雾吸入后让人感到宁静，但你注意到烟雾中似乎有细小的生物在游动。',
                        goodOutcome: { text: '你控制呼吸，获得了烟雾带来的预知能力', reward: '理智+10，预知陷阱', sanity: 10 },
                        badOutcome: { text: '你吸入过多，意识陷入迷雾之中...', reward: '理智-20，幻觉模式', sanity: -20 }
                    }
                ]
            },
            4: { // 第5层 - 蛇人核心巢穴
                main: [
                    {
                        id: 'shadow_l5_main_1',
                        title: '主线·核心巢穴 - 斯西亚·瑞斯',
                        text: '核心巢穴是整个地底的最深处，地面铺着皮质靠垫，一侧的温泉浴池冒着热气，另一侧的实验台上摆放着三本蛇人皮革卷轴。斯西亚·瑞斯正坐在卷轴前研究，它蛇形的身躯覆盖着银灰色鳞片，鳞片在荧光下泛着冷光，见到你闯入，眼中闪过冰冷的杀意，立刻召唤两只妖鬼助战。',
                        goodOutcome: {
                            preText: '就在斯西亚召唤妖鬼的瞬间，你注意到实验台上的火焰咒文卷轴还在燃烧。你迅速抓起卷轴，用阿卡洛语念出那段禁忌的咒语。金色的火焰从卷轴中喷涌而出，直接击中了斯西亚的胸口。蛇人祭司发出一声凄厉的惨叫，它的鳞片在高温下卷曲焦黑。两只妖鬼见势不妙，转身逃入黑暗。斯西亚挣扎着想要反击，但你的第二道咒文已经准备就绪...',
                            resultText: '你成功击败了斯西亚·瑞斯，蛇人祭司的残骸倒在你脚下',
                            reward: '理智+20，通往结局的门已开启',
                            sanity: 20
                        },
                        badOutcome: {
                            preText: '斯西亚举起双手，开始吟唱一段诡异的咒语。你感到四肢突然变得沉重，仿佛有无形的锁链束缚住了你的身体。你拼命挣扎，但无法移动分毫。斯西亚缓缓靠近，它分叉的舌头舔舐着空气，黄色的眼睛中闪烁着残忍的光芒。两只妖鬼从阴影中走出，它们的利爪在荧光下泛着寒光...',
                            resultText: '你被斯西亚的迷身术控制，陷入了极度危险的境地',
                            reward: '理智-30，但仍成功击败BOSS',
                            sanity: -30
                        }
                    }
                ],
                sub: [
                    {
                        id: 'shadow_l5_sub_1',
                        title: '支线·皮革卷轴',
                        text: '实验台上的三本蛇人皮革卷轴散发着古老的气息，上面用阿卡姆语记载着"阿卡洛语·火焰咒文"。',
                        goodOutcome: { text: '你学会了火焰咒文，对蛇人特攻', reward: '获得技能，精神力+2', markers: 2 },
                        badOutcome: { text: '阅读时你心智受到冲击，几乎陷入疯狂...', reward: '理智-25', sanity: -25 }
                    }
                ]
            }
        };

        const layerData = shadowStories[layerIndex] || shadowStories[0];
        return layerData;
    }

    getRandomMainStory() {
        const stories = this.getLayerStories(this.currentLayer).main;
        return stories[Math.floor(Math.random() * stories.length)];
    }

    getRandomSubStory() {
        const stories = this.getLayerStories(this.currentLayer).sub;
        return stories[Math.floor(Math.random() * stories.length)];
    }

    showCodex() {
        alert(`📚 剧情图鉴\n\n已收集: ${this.persistent.fragments.length} 个碎片\n\n${this.persistent.fragments.join(', ') || '暂无'}`);
    }

    showWarehouse() {
        alert(`🏛️ 仓库\n\n金币: ${this.persistent.gold}\n物品: ${this.persistent.vault.length} 件`);
    }

    deleteSave() {
        if (confirm('确定要重置所有进度吗？')) {
            localStorage.removeItem('DS08_save');
            this.persistent = this.loadData();
            this.showLobby();
        }
    }

    init() {
        this.showLobby();
    }
}

window.onload = () => { window.game = new DS08Game(); };
