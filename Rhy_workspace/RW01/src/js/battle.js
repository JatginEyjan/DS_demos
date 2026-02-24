// RW01 - 少年宗门 - 战斗系统
// 处理战场逻辑、自动战斗、掉落计算

class BattleSystem {
    constructor() {
        this.tickRate = 1000; // 1秒一次攻击
        this.lastTick = Date.now();
        this.battleInterval = null;
    }

    start() {
        if (this.battleInterval) return;
        this.battleInterval = setInterval(() => this.tick(), this.tickRate);
    }

    stop() {
        if (this.battleInterval) {
            clearInterval(this.battleInterval);
            this.battleInterval = null;
        }
    }

    tick() {
        const slots = GameState.battleSlots;
        const monsters = GameState.monsters;

        for (let i = 0; i < slots.length; i++) {
            const disciple = slots[i];
            const monster = monsters[i];

            if (!disciple || !monster) continue;

            // 弟子战斗中
            if (disciple.state === 'battling') {
                // 弟子攻击怪物
                monster.currentHp -= disciple.atk;

                // 怪物死亡
                if (monster.currentHp <= 0) {
                    this.onMonsterDefeated(i);
                    continue;
                }

                // 怪物反击
                disciple.hp -= monster.atk;

                // 弟子战败
                if (disciple.hp <= 0) {
                    disciple.hp = 0;
                    disciple.state = 'recovering';
                    this.startRecovery(i);
                }
            }
        }

        // 更新UI - 如果当前在战场页签则刷新
        if (window.ui && window.ui.currentTab === 'battle') {
            window.ui.render();
            window.ui.updateTopBar();
        }
    }

    onMonsterDefeated(slotIndex) {
        const monster = GameState.monsters[slotIndex];
        const drops = monster.drops;

        // 计算掉落
        for (const [material, range] of Object.entries(drops)) {
            const count = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
            GameState.battleDrops[material] += count;
            GameState.inventory[material] += count; // 自动进入背包
        }

        // 生成新怪物
        GameState.monsters[slotIndex] = generateMonster();

        // 新掉落高亮提示
        if (window.ui) window.ui.showNewDrop();
    }

    startRecovery(slotIndex) {
        const disciple = GameState.battleSlots[slotIndex];
        const pharmacyLevel = GameState.buildings.pharmacy.level;
        const baseRecovery = 2;
        const pharmacyBonus = pharmacyLevel * 3;
        const levelBonus = disciple.level;
        const recoveryRate = baseRecovery + pharmacyBonus + levelBonus;

        // 恢复逻辑会在tick中检查
        disciple.recoveryInterval = setInterval(() => {
            if (disciple.state !== 'recovering') {
                clearInterval(disciple.recoveryInterval);
                disciple.recoveryInterval = null;
                return;
            }

            disciple.hp += recoveryRate;

            if (disciple.hp >= disciple.maxHp) {
                disciple.hp = disciple.maxHp;
                disciple.state = 'battling';
                clearInterval(disciple.recoveryInterval);
                disciple.recoveryInterval = null;
            }

            if (window.ui) window.ui.renderBattle();
        }, 1000);
    }

    // 上阵弟子
    assignDisciple(slotIndex, discipleId) {
        const disciple = GameState.disciples.find(d => d.id === discipleId);
        if (!disciple) return false;

        // 检查是否已在其他槽位
        const existingSlot = GameState.battleSlots.findIndex(d => d && d.id === discipleId);
        if (existingSlot !== -1) {
            GameState.battleSlots[existingSlot] = null;
        }

        // 上阵
        disciple.state = 'battling';
        GameState.battleSlots[slotIndex] = disciple;

        return true;
    }

    // 下阵弟子
    removeDisciple(slotIndex) {
        const disciple = GameState.battleSlots[slotIndex];
        if (disciple) {
            // 清理恢复定时器
            if (disciple.recoveryInterval) {
                clearInterval(disciple.recoveryInterval);
                disciple.recoveryInterval = null;
            }
            disciple.state = 'idle';
            GameState.battleSlots[slotIndex] = null;
        }
    }

    // 获取恢复时间预估
    getRecoveryTime(slotIndex) {
        const disciple = GameState.battleSlots[slotIndex];
        if (!disciple || disciple.state !== 'recovering') return 0;

        const pharmacyLevel = GameState.buildings.pharmacy.level;
        const recoveryRate = 2 + pharmacyLevel * 3 + disciple.level;
        const neededHp = disciple.maxHp - disciple.hp;

        return Math.ceil(neededHp / recoveryRate);
    }
}

// 战斗系统实例
const battleSystem = new BattleSystem();
