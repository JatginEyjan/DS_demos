// DS13 - 数据配置

const CONFIG = {
    // 角色属性
    STATS: {
        will: { name: '意志', min: 3, max: 8, description: '影响SAN值上限和恢复' },
        hp: { name: '血量', min: 50, max: 100, description: '生命值，归零即死亡' },
        energy: { name: '电量', min: 30, max: 60, description: '雷达扫描消耗' },
        stamina: { name: '体力', min: 40, max: 80, description: '挖掘消耗' },
        backpack: { name: '包容量', min: 5, max: 12, description: '携带物品格数' }
    },

    // 初始金钱
    STARTING_MONEY: 500,

    // 商店物品
    SHOP_ITEMS: {
        radar: {
            lv1: { name: '雷达 Lv.1', price: 0, desc: '显示1-2级危险，3级显示为安全', level: 1 },
            lv2: { name: '雷达 Lv.2', price: 200, desc: '显示1-3级，看到3级掉10SAN', level: 2 },
            lv3: { name: '雷达 Lv.3', price: 500, desc: '精确显示，看到3级掉5SAN', level: 3 }
        },
        pickaxe: {
            single: { name: '单格镐', price: 0, desc: '挖掘1格，低消耗', type: 'single', staminaCost: 5 },
            cross: { name: '十字镐', price: 100, desc: '挖掘十字5格，中消耗', type: 'cross', staminaCost: 15 },
            horizontal: { name: '横排镐', price: 150, desc: '挖掘横向3格，高消耗掉SAN', type: 'horizontal', staminaCost: 10, sanCost: 5 }
        },
        consumables: {
            battery: { name: '电池', price: 50, desc: '10次扫描电量', energy: 10 },
            medkit: { name: '医疗包', price: 80, desc: '恢复30HP', hp: 30 },
            sedative: { name: '镇静剂', price: 100, desc: '恢复20SAN', san: 20 }
        }
    },

    // 地牢配置
    DUNGEON: {
        width: 10,
        height: 10,
        wallChance: 0.70,
        emptyChance: 0.15,
        lootChance: 0.10,
        monsterChance: 0.05
    },

    // 危险等级
    DANGER_LEVELS: {
        0: { name: '安全', color: '#27ae60' },
        1: { name: '警戒', color: '#f39c12' },
        2: { name: '危险', color: '#e67e22' },
        3: { name: '致命', color: '#e74c3c' }
    },

    // 绿眼配置
    GREEN_EYE: {
        spawnChance: 0.1,        // 初始生成概率
        followDuration: 30000,   // 追踪持续时间（毫秒）
        lockTime: 3000,          // 锁定时间（毫秒）
        sanDamage: 5,            // 每秒SAN伤害
        hpDamage: 30,            // 攻击伤害
        detectionRange: 3        // 检测范围（格子）
    },

    // 雷达消耗
    RADAR_COST: 2,  // 每次扫描消耗电量

    // 声音配置
    AUDIO: {
        heartbeatRange: 3,      // 心跳声范围（格）
        whisperRange: 1,        // 低语范围（格）
        volume: 0.5             // 基础音量
    }
};

// 游戏状态
let GameState = {
    // 角色
    character: null,
    
    // 当前状态
    current: {
        san: 0,           // 当前SAN值
        hp: 0,            // 当前血量
        energy: 0,        // 当前电量
        stamina: 0,       // 当前体力
        money: 0          // 金钱
    },

    // 装备
    equipment: {
        radar: 'lv1',
        pickaxe: 'single'
    },

    // 背包
    backpack: [],

    // 地牢状态
    dungeon: null,
    playerPos: { x: 0, y: 0 },
    
    // 绿眼状态
    greenEye: {
        active: false,
        position: null,
        state: 'dormant',  // dormant, watching, locked
        followTimer: null,
        lockTimer: null
    },

    // 游戏进程
    inDungeon: false,
    dungeonLevel: 1
};

// 生成随机角色
function rollCharacter() {
    const character = {};
    for (const [key, config] of Object.entries(CONFIG.STATS)) {
        character[key] = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    }
    return character;
}

// 初始化游戏
function initGame() {
    GameState.current.money = CONFIG.STARTING_MONEY;
    GameState.equipment = { radar: 'lv1', pickaxe: 'single' };
    GameState.backpack = [];
    GameState.dungeonLevel = 1;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, GameState, rollCharacter, initGame };
}
