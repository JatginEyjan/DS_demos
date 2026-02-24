// RW01 - 少年宗门 - 数据定义
// 所有游戏数据、配置、初始状态

const CONFIG = {
    // 掌门境界配置 - expRequired为升级所需经验（与订单经验统一）
    REALMS: [
        { name: '练气期', expRequired: 100, maxDiscipleLevel: 3, unlocks: [] },
        { name: '筑基期', expRequired: 160, maxDiscipleLevel: 5, unlocks: ['weapons'] },
        { name: '金丹期', expRequired: 240, maxDiscipleLevel: 8, unlocks: ['armor'] },
        { name: '元婴期', expRequired: 360, maxDiscipleLevel: 12, unlocks: [] },
        { name: '化神期', expRequired: 600, maxDiscipleLevel: 15, unlocks: [] }
    ],

    // 建筑配置
    BUILDINGS: {
        inn: {
            name: '仙栈',
            desc: '提升战场弟子上阵数量',
            cost: [300, 600, 1200, 2400],
            effect: level => level + 1 // 槽位数
        },
        pharmacy: {
            name: '药坊',
            desc: '提升弟子战后恢复速度',
            cost: [500, 1000, 2000, 4000],
            effect: level => 2 + level * 3 // 基础恢复速度
        },
        weapons: {
            name: '武器店',
            desc: '解锁武器炼制功能',
            cost: [1000],
            effect: () => true,
            unlockRealm: 1 // 筑基期解锁
        },
        armor: {
            name: '防具店',
            desc: '解锁防具炼制功能',
            cost: [1500],
            effect: () => true,
            unlockRealm: 2 // 金丹期解锁
        }
    },

    // 弟子品质配置 - 调整数值让1级弟子能打4只+怪物
    DISCIPLE_QUALITIES: {
        blue: { name: '蓝色', color: '#3498db', hpBase: 100, atkBase: 15, hpGrowth: 15, atkGrowth: 3, costMult: 1 },
        purple: { name: '紫色', color: '#9b59b6', hpBase: 130, atkBase: 22, hpGrowth: 20, atkGrowth: 4, costMult: 2 },
        orange: { name: '橙色', color: '#f39c12', hpBase: 160, atkBase: 30, hpGrowth: 25, atkGrowth: 5, costMult: 4 }
    },

    // 招募配置
    RECRUIT: {
        cost: 500,
        dailyLimit: 10,
        rates: { blue: 0.7, purple: 0.25, orange: 0.05 }
    },

    // 订单配置
    ORDER: {
        maxCount: 5,
        autoRefreshInterval: 20000, // 20秒
        manualRefreshCost: 100,
        manualRefreshLimit: 5,
        types: {
            normal: { name: '普通', color: '#27ae60', weight: 0.6, expMult: 1, stoneMult: 1, timeLimit: 0 },
            urgent: { name: '紧急', color: '#f39c12', weight: 0.3, expMult: 2.5, stoneMult: 2.5, timeLimit: 180000 }, // 3分钟
            limited: { name: '限时', color: '#e74c3c', weight: 0.1, expMult: 5, stoneMult: 5, timeLimit: 90000 } // 1.5分钟
        },
        baseReward: { exp: 20, stone: 200 }
    },

    // 材料配置
    MATERIALS: {
        herb: { name: '灵草', icon: '🌿' },
        ore: { name: '矿石', icon: '⛏️' },
        leather: { name: '兽皮', icon: '🐾' }
    },

    // 怪物配置 - 调整数值，1级弟子(100hp/15atk)能打4只+
    // 战斗模拟: 弟子15atk vs 怪物20hp，2回合击杀；怪物5atk，4只共造成约40伤害
    MONSTERS: [
        { name: '野狼', hp: 20, atk: 5, drops: { herb: [1, 2] } },
        { name: '山猪', hp: 25, atk: 6, drops: { ore: [1, 2] } },
        { name: '黑熊', hp: 35, atk: 8, drops: { leather: [1, 2] } },
        { name: '妖蛇', hp: 40, atk: 10, drops: { herb: [1, 2], ore: [1, 2], leather: [1, 2] } }
    ],

    // 弟子名字库
    DISCIPLE_NAMES: [
        '李青云', '王浩然', '张逸风', '刘子轩', '陈天佑',
        '赵无极', '孙思远', '周明轩', '吴天德', '郑少秋',
        '林逸', '苏雨晴', '慕容雪', '南宫婉', '西门吹雪',
        '东方不败', '北冥有鱼', '独孤求败', '令狐冲', '杨过'
    ],

    // 弟子背景库
    DISCIPLE_BACKGROUNDS: [
        '来自山下的孤儿，资质平庸但心性坚韧',
        '被前任掌门救下的孤儿，对宗门忠心耿耿',
        '原是富家子弟，因家道中落拜入宗门',
        '在山中迷路被弟子发现，展现出修仙资质',
        '自学成才的散修，慕名而来寻求正统',
        '为报父母之仇，立志修仙变强',
        '天生灵根，被宗门长老推荐入山',
        '原是猎户之子，与野兽搏斗中觉醒灵根',
        '饱读诗书的秀才，偶然得到修仙秘籍',
        '流浪儿出身，靠偷窃灵药被发现资质'
    ],

    // 祝贺语库
    CONGRATS_MESSAGES: [
        '恭喜掌门突破！',
        '掌门威武！',
        '宗门大兴！',
        '弟子们倍感荣幸！',
        '掌门天资卓绝！',
        '恭喜掌门更上一层楼！'
    ]
};

// 游戏状态
let GameState = {
    // 掌门信息
    sectMaster: {
        realm: 0, // 当前境界索引
        exp: 0 // 当前经验值
    },

    // 资源
    resources: {
        stone: 1000 // 初始灵石
    },

    // 建筑
    buildings: {
        inn: { level: 1, built: true },
        pharmacy: { level: 1, built: true },
        weapons: { level: 0, built: false },
        armor: { level: 0, built: false }
    },

    // 弟子
    disciples: [],
    recruitCount: 0, // 今日已招募次数
    lastRecruitReset: Date.now(),

    // 订单
    orders: [],
    refreshCount: 0, // 今日已刷新次数
    lastRefreshReset: Date.now(),

    // 战场
    battleSlots: [], // 上阵弟子
    battleDrops: { herb: 0, ore: 0, leather: 0 },
    monsters: [], // 当前怪物

    // 背包
    inventory: {
        herb: 0,
        ore: 0,
        leather: 0
    },

    // 时间追踪
    lastUpdate: Date.now()
};

// 初始化游戏
function initGame() {
    // 初始弟子
    addDisciple('blue', '李青云', '来自山下的孤儿，资质平庸但心性坚韧');
    addDisciple('blue', '王浩然', '被前任掌门救下的孤儿，对宗门忠心耿耿');

    // 初始化订单
    for (let i = 0; i < 3; i++) {
        generateOrder();
    }

    // 初始化战场槽位
    const slotCount = CONFIG.BUILDINGS.inn.effect(GameState.buildings.inn.level);
    for (let i = 0; i < slotCount; i++) {
        GameState.battleSlots.push(null);
        GameState.monsters.push(generateMonster());
    }
}

// 生成随机弟子
function addDisciple(quality, name, background) {
    const id = Date.now() + Math.random();
    const q = CONFIG.DISCIPLE_QUALITIES[quality];

    const disciple = {
        id,
        name: name || CONFIG.DISCIPLE_NAMES[Math.floor(Math.random() * CONFIG.DISCIPLE_NAMES.length)],
        quality,
        background: background || CONFIG.DISCIPLE_BACKGROUNDS[Math.floor(Math.random() * CONFIG.DISCIPLE_BACKGROUNDS.length)],
        level: 1,
        hp: q.hpBase,
        maxHp: q.hpBase,
        atk: q.atkBase,
        state: 'idle' // idle, battling, recovering
    };

    GameState.disciples.push(disciple);
    return disciple;
}

// 生成随机订单
function generateOrder() {
    const types = Object.keys(CONFIG.ORDER.types);
    const weights = types.map(t => CONFIG.ORDER.types[t].weight);
    const type = weightedRandom(types, weights);
    const typeConfig = CONFIG.ORDER.types[type];

    const materials = Object.keys(CONFIG.MATERIALS);
    const materialCount = Math.floor(Math.random() * 2) + 1; // 1-2种材料
    const shuffled = [...materials].sort(() => Math.random() - 0.5);
    const selectedMaterials = shuffled.slice(0, materialCount);

    const requirements = {};
    selectedMaterials.forEach(mat => {
        requirements[mat] = Math.floor(Math.random() * 3) + 2; // 2-4个，更平衡
    });

    const base = CONFIG.ORDER.baseReward;
    const reward = {
        exp: Math.floor(base.exp * typeConfig.expMult),
        stone: Math.floor(base.stone * typeConfig.stoneMult)
    };

    const order = {
        id: Date.now() + Math.random(),
        type,
        requirements,
        reward,
        createTime: Date.now(),
        timeLimit: typeConfig.timeLimit
    };

    GameState.orders.push(order);
}

// 生成怪物
function generateMonster() {
    const monsters = CONFIG.MONSTERS;
    const monster = monsters[Math.floor(Math.random() * monsters.length)];
    return {
        ...monster,
        currentHp: monster.hp,
        id: Date.now() + Math.random()
    };
}

// 辅助函数：加权随机
function weightedRandom(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) return items[i];
    }
    return items[items.length - 1];
}

// 辅助函数：检查每日重置
function checkDailyReset() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - GameState.lastRecruitReset > oneDay) {
        GameState.recruitCount = 0;
        GameState.lastRecruitReset = now;
    }

    if (now - GameState.lastRefreshReset > oneDay) {
        GameState.refreshCount = 0;
        GameState.lastRefreshReset = now;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, GameState, initGame, addDisciple, generateOrder, generateMonster };
}
