// DS13 - 绿眼AI系统

class GreenEyeSystem {
    constructor() {
        this.state = 'dormant'; // dormant, watching, locked, attacking
        this.position = null;
        this.targetPosition = null;
        this.watchTimer = null;
        this.lockTimer = null;
        this.followTimer = null;
        this.sanDamageInterval = null;
    }

    // 尝试在位置生成绿眼
    trySpawn(x, y) {
        if (this.state !== 'dormant') return false;
        
        // 随机决定是否生成（首次20%，后续更高）
        const spawnChance = GameState.greenEye.hasEncountered ? 0.4 : 0.2;
        if (Math.random() > spawnChance) return false;

        this.spawn(x, y);
        return true;
    }

    spawn(x, y) {
        this.state = 'watching';
        this.position = { x, y };
        GameState.greenEye.hasEncountered = true;
        GameState.greenEye.active = true;

        // 触发惊吓效果
        if (window.ui) window.ui.showGreenEyeFlash();
        if (window.audio) window.audio.playGreenEyeSound();

        // 开始注视倒计时
        this.startWatchPhase();

        // 开始跟随
        this.startFollowing();

        // 开始SAN伤害
        this.startSanDamage();
    }

    startWatchPhase() {
        // 注视阶段：玩家可以选择应对方式
        this.watchTimer = setTimeout(() => {
            if (this.state === 'watching') {
                this.enterLockPhase();
            }
        }, 5000); // 5秒后开始锁定
    }

    enterLockPhase() {
        this.state = 'locked';
        
        // 锁定阶段：3秒后攻击
        this.lockTimer = setTimeout(() => {
            if (this.state === 'locked') {
                this.attack();
            }
        }, 3000);

        // 通知UI
        if (window.ui) window.ui.log('绿眼锁定了你！快做出应对！', 'danger');
    }

    // 玩家选择：扔装备断连
    disconnectByDroppingItem() {
        if (this.state === 'dormant') return false;

        // 消耗一个装备
        const dropped = this.dropRandomItem();
        if (!dropped) return false;

        // 绿眼进入潜伏，但会再次生成
        this.dormant();
        
        // 延迟后重新生成在其他位置
        setTimeout(() => {
            const newPos = this.findRandomSpawnPoint();
            if (newPos) this.spawn(newPos.x, newPos.y);
        }, 10000 + Math.random() * 20000); // 10-30秒后

        return true;
    }

    // 玩家选择：用镐子攻击
    attackWithPickaxe() {
        if (this.state === 'dormant') return false;

        const pickaxe = CONFIG.SHOP_ITEMS.pickaxe[GameState.equipment.pickaxe];
        const successRate = 0.3 + (GameState.character.will * 0.05); // 基础30% + 意志加成

        if (Math.random() < successRate) {
            // 成功击退
            this.dormant();
            if (window.ui) window.ui.log('你用镐子击退了绿眼！', 'success');
            return true;
        } else {
            // 失败，立即攻击
            if (window.ui) window.ui.log('攻击失败！绿眼反击！', 'danger');
            this.attack();
            return false;
        }
    }

    // 玩家选择：承受SAN损失（不看它，试图逃跑）
    endureSanLoss() {
        // 继续掉SAN，但保持当前状态
        // 如果离开距离足够远，绿眼可能放弃追踪
        return true;
    }

    attack() {
        this.state = 'attacking';
        
        // 造成伤害
        const damage = CONFIG.GREEN_EYE.hpDamage;
        GameState.current.hp -= damage;
        GameState.current.san -= 20;

        if (window.ui) {
            window.ui.log(`绿眼攻击！受到 ${damage} 点伤害，SAN值下降20！`, 'danger');
            window.ui.updateStats();
        }

        // 攻击后进入潜伏
        this.dormant();

        // 检查死亡
        if (GameState.current.hp <= 0) {
            if (window.game) window.game.gameOver('death');
        }
    }

    // 开始跟随玩家
    startFollowing() {
        this.followTimer = setInterval(() => {
            if (this.state === 'dormant') return;
            
            // 绿眼跟随玩家位置
            this.targetPosition = { ...GameState.dungeon.playerPos };
            
            // 如果距离太远，绿眼可能放弃
            const dist = this.getDistance();
            if (dist > 5) {
                this.dormant();
                if (window.ui) window.ui.log('你成功甩开了绿眼的追踪...暂时', 'success');
            }
        }, 1000);
    }

    // 开始持续SAN伤害
    startSanDamage() {
        this.sanDamageInterval = setInterval(() => {
            if (this.state !== 'dormant' && GameState.current.san > 0) {
                GameState.current.san -= CONFIG.GREEN_EYE.sanDamage;
                if (window.ui) window.ui.updateStats();
                
                // SAN值过低触发疯狂
                if (GameState.current.san <= 0) {
                    GameState.current.san = 0;
                    if (window.game) window.game.gameOver('madness');
                }
            }
        }, 1000);
    }

    // 进入潜伏状态
    dormant() {
        this.state = 'dormant';
        this.position = null;
        
        if (this.watchTimer) clearTimeout(this.watchTimer);
        if (this.lockTimer) clearTimeout(this.lockTimer);
        if (this.followTimer) clearInterval(this.followTimer);
        if (this.sanDamageInterval) clearInterval(this.sanDamageInterval);
        
        GameState.greenEye.active = false;
    }

    // 随机丢弃物品
    dropRandomItem() {
        if (GameState.backpack.length === 0) {
            // 没有物品可丢，损失装备
            if (GameState.equipment.pickaxe !== 'single') {
                GameState.equipment.pickaxe = 'single';
                if (window.ui) window.ui.log('为了逃脱，你丢掉了高级镐子！', 'warning');
                return true;
            }
            return false;
        }
        
        const dropped = GameState.backpack.pop();
        if (window.ui) window.ui.log(`你扔掉了 ${dropped.name} 来分散绿眼的注意！`, 'warning');
        return true;
    }

    // 寻找随机生成点
    findRandomSpawnPoint() {
        const dungeon = GameState.dungeon;
        const candidates = [];
        
        for (let y = 0; y < dungeon.height; y++) {
            for (let x = 0; x < dungeon.width; x++) {
                if (dungeon.grid[y][x].revealed && dungeon.grid[y][x].type !== 'wall') {
                    candidates.push({ x, y });
                }
            }
        }
        
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // 计算与玩家的距离
    getDistance() {
        if (!this.targetPosition || !GameState.dungeon) return 999;
        const dx = this.targetPosition.x - GameState.dungeon.playerPos.x;
        const dy = this.targetPosition.y - GameState.dungeon.playerPos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 检查是否在视野中
    isInPlayerView() {
        if (!this.position || !GameState.dungeon) return false;
        
        const cell = GameState.dungeon.grid[this.position.y][this.position.x];
        return cell.revealed;
    }
}

// 绿眼系统实例
const greenEyeSystem = new GreenEyeSystem();
