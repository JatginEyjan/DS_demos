// RW01 - 少年宗门 - 游戏主逻辑
// 处理游戏核心玩法、状态更新、事件响应

class Game {
    constructor() {
        this.ui = null;
        this.battle = null;
        this.lastOrderRefresh = Date.now();
        this.gameLoopInterval = null;
    }

    init() {
        // 初始化数据
        initGame();

        // 初始化UI
        this.ui = new UI();
        this.ui.init();
        ui = this.ui; // 赋值给全局变量，供HTML事件调用

        // 初始化战斗系统
        this.battle = battleSystem;
        this.battle.start();

        // 启动游戏循环
        this.gameLoop();

        console.log('RW01 少年宗门 - 游戏启动');
    }

    gameLoop() {
        this.gameLoopInterval = setInterval(() => {
            this.update();
        }, 1000);
    }

    update() {
        // 检查每日重置
        checkDailyReset();

        // 检查订单自动刷新
        const now = Date.now();
        if (now - this.lastOrderRefresh > CONFIG.ORDER.autoRefreshInterval) {
            if (GameState.orders.length < CONFIG.ORDER.maxCount) {
                generateOrder();
                this.ui.renderOrders();
            }
            this.lastOrderRefresh = now;
        }

        // 检查订单超时
        this.checkOrderTimeout();

        // 更新UI
        this.ui.updateTopBar();
    }

    checkOrderTimeout() {
        const now = Date.now();
        GameState.orders = GameState.orders.filter(order => {
            if (order.timeLimit === 0) return true;
            return now - order.createTime < order.timeLimit;
        });
    }

    // ===== 掌门系统 =====

    // 完成订单，获得经验
    completeOrder(orderId) {
        const orderIndex = GameState.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return false;

        const order = GameState.orders[orderIndex];

        // 检查材料是否足够
        for (const [material, count] of Object.entries(order.requirements)) {
            if (GameState.inventory[material] < count) {
                return false;
            }
        }

        // 扣除材料
        for (const [material, count] of Object.entries(order.requirements)) {
            GameState.inventory[material] -= count;
        }

        // 给予奖励
        GameState.resources.stone += order.reward.stone;
        GameState.sectMaster.ordersCompleted++;

        // 移除订单
        GameState.orders.splice(orderIndex, 1);

        // 检查升级
        this.checkLevelUp();

        // 刷新UI
        this.ui.renderOrders();
        this.ui.renderBag();

        return true;
    }

    // 检查掌门升级
    checkLevelUp() {
        const master = GameState.sectMaster;

        if (master.ordersCompleted >= master.ordersNeeded) {
            // 升级
            master.realm++;
            master.ordersCompleted = 0;

            if (master.realm < CONFIG.REALMS.length) {
                master.ordersNeeded = CONFIG.REALMS[master.realm].orderCount;

                // 播放升级特效
                this.ui.showLevelUp(master.realm);

                // 解锁建筑
                this.checkBuildingUnlocks();

                // 增加槽位
                this.updateBattleSlots();
            } else {
                // 达到最高境界
                this.ui.showGameComplete();
            }
        }
    }

    checkBuildingUnlocks() {
        const realm = GameState.sectMaster.realm;

        for (const [key, building] of Object.entries(CONFIG.BUILDINGS)) {
            if (building.unlockRealm === realm) {
                GameState.buildings[key].built = true;
                GameState.buildings[key].level = 1; // 解锁时初始等级为1
            }
        }
    }

    updateBattleSlots() {
        const innLevel = GameState.buildings.inn.level;
        const slotCount = CONFIG.BUILDINGS.inn.effect(innLevel);

        // 添加新槽位
        while (GameState.battleSlots.length < slotCount) {
            GameState.battleSlots.push(null);
            GameState.monsters.push(generateMonster());
        }
    }

    // ===== 建筑系统 =====

    upgradeBuilding(buildingKey) {
        const building = GameState.buildings[buildingKey];
        const config = CONFIG.BUILDINGS[buildingKey];

        if (!building.built) return false;
        if (building.level >= config.cost.length) return false;

        const cost = config.cost[building.level];
        if (GameState.resources.stone < cost) return false;

        // 扣除灵石
        GameState.resources.stone -= cost;

        // 升级
        building.level++;

        // 特殊处理
        if (buildingKey === 'inn') {
            this.updateBattleSlots();
        }

        // 刷新UI
        if (this.ui.currentTab === 'sect') {
            this.ui.render();
        }
        this.ui.updateTopBar();
        return true;
    }

    buildBuilding(buildingKey) {
        const building = GameState.buildings[buildingKey];
        const config = CONFIG.BUILDINGS[buildingKey];

        if (building.built) return false;

        const cost = config.cost[0];
        if (GameState.resources.stone < cost) return false;

        // 扣除灵石
        GameState.resources.stone -= cost;

        // 建造
        building.built = true;
        building.level = 1;

        // 刷新UI
        if (this.ui.currentTab === 'sect') {
            this.ui.render();
        }
        this.ui.updateTopBar();
        return true;
    }

    // ===== 弟子系统 =====

    recruitDisciple() {
        checkDailyReset();

        if (GameState.recruitCount >= CONFIG.RECRUIT.dailyLimit) {
            return { success: false, reason: '今日招募次数已达上限' };
        }

        if (GameState.resources.stone < CONFIG.RECRUIT.cost) {
            return { success: false, reason: '灵石不足' };
        }

        // 扣除灵石
        GameState.resources.stone -= CONFIG.RECRUIT.cost;
        GameState.recruitCount++;

        // 随机品质
        const rand = Math.random();
        let quality;
        if (rand < CONFIG.RECRUIT.rates.orange) {
            quality = 'orange';
        } else if (rand < CONFIG.RECRUIT.rates.orange + CONFIG.RECRUIT.rates.purple) {
            quality = 'purple';
        } else {
            quality = 'blue';
        }

        // 添加弟子
        const disciple = addDisciple(quality);

        return { success: true, disciple };
    }

    upgradeDisciple(discipleId) {
        const disciple = GameState.disciples.find(d => d.id === discipleId);
        if (!disciple) return false;

        const realm = GameState.sectMaster.realm;
        const maxLevel = CONFIG.REALMS[realm].maxDiscipleLevel;

        if (disciple.level >= maxLevel) {
            return { success: false, reason: '已达当前境界上限' };
        }

        // 计算消耗
        const q = CONFIG.DISCIPLE_QUALITIES[disciple.quality];
        const baseCost = 100 * Math.pow(2, disciple.level - 1);
        const cost = Math.floor(baseCost * q.costMult);

        if (GameState.resources.stone < cost) {
            return { success: false, reason: '灵石不足' };
        }

        // 扣除灵石
        GameState.resources.stone -= cost;

        // 升级
        disciple.level++;
        disciple.maxHp += q.hpGrowth;
        disciple.hp = disciple.maxHp; // 回满血
        disciple.atk += q.atkGrowth;

        this.ui.renderDisciples();
        return { success: true };
    }

    // ===== 订单系统 =====

    refreshOrders() {
        checkDailyReset();

        if (GameState.refreshCount >= CONFIG.ORDER.manualRefreshLimit) {
            return { success: false, reason: '今日刷新次数已达上限' };
        }

        if (GameState.resources.stone < CONFIG.ORDER.manualRefreshCost) {
            return { success: false, reason: '灵石不足' };
        }

        // 扣除灵石
        GameState.resources.stone -= CONFIG.ORDER.manualRefreshCost;
        GameState.refreshCount++;

        // 清空当前订单，生成新订单
        GameState.orders = [];
        for (let i = 0; i < 3; i++) {
            generateOrder();
        }

        this.ui.renderOrders();
        return { success: true };
    }

    // ===== 工具方法 =====

    getRealmName() {
        return CONFIG.REALMS[GameState.sectMaster.realm].name;
    }

    getExpProgress() {
        const master = GameState.sectMaster;
        return {
            current: master.ordersCompleted,
            needed: master.ordersNeeded,
            percent: (master.ordersCompleted / master.ordersNeeded) * 100
        };
    }
}

// 游戏实例
let game;

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
    game.init();
});
