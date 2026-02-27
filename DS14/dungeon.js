// DS14 - 地牢生成与房间逻辑

class Dungeon {
    constructor(level) {
        this.level = level;
        this.size = 5 + (level - 1) * 2; // 5x5, 7x7, 9x9...
        this.grid = [];
        this.playerPos = { x: 0, y: 0 };
        this.doorPos = null;
        this.sanctuaryEntrancePos = null; // 避难所入口位置
        this.sanctuaryRoom = null; // 避难所房间（独立）
        this.greenEyes = []; // 绿眼数组，每个房间可能有多个
        this.keyPos = null; // 钥匙位置
        this.generate();
    }

    generate() {
        // 初始化网格
        for (let y = 0; y < this.size; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.size; x++) {
                this.grid[y][x] = {
                    type: 'wall',
                    revealed: false,
                    x, y
                };
            }
        }

        // 设置起点
        this.grid[0][0].type = 'empty';
        this.grid[0][0].revealed = true;
        this.playerPos = { x: 0, y: 0 };

        // 1. 生成唯一门（远离起点）
        this.placeDoor();

        // 2. 生成钥匙（随机位置，不在起点）
        this.placeKey();

        // 3. 生成避难所入口（如果不连刷）
        if (!GameState.lastRoomHadSanctuary) {
            this.placeSanctuaryEntrance();
        }

        // 4. 生成新绿眼（每个房间固定1个）
        this.placeGreenEye();

        // 5. 生成消耗品
        this.placeItems();

        // 6. 随机挖开一些路径（确保可达性）
        this.carvePath();
    }

    placeItems() {
        const items = ['health', 'sanity', 'oxygen'];
        // 30%概率生成在空地上
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.grid[y][x].type === 'wall' && Math.random() < 0.3) {
                    // 仅在空位置生成
                    this.grid[y][x].item = items[Math.floor(Math.random() * items.length)];
                }
            }
        }
    }

    placeDoor() {
        // 门放在距离起点较远的位置
        let placed = false;
        while (!placed) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            const dist = Math.abs(x) + Math.abs(y);
            if (dist >= this.size - 2 && this.grid[y][x].type === 'wall') {
                this.grid[y][x].type = 'door';
                this.doorPos = { x, y };
                placed = true;
            }
        }
    }

    placeKey() {
        // 每层地牢随机埋藏1把钥匙
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            // 钥匙放在空地上，需要挖掘才能发现
            if (this.grid[y][x].type === 'wall' && !(x === 0 && y === 0)) {
                this.grid[y][x].type = 'key';
                this.keyPos = { x, y };
                placed = true;
            }
            attempts++;
        }
    }

    placeSanctuaryEntrance() {
        // 生成避难所入口（点击进入独立房间）
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 50) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            if (this.grid[y][x].type === 'wall' && !(x === 0 && y === 0)) {
                this.grid[y][x].type = 'sanctuary-entrance';
                this.sanctuaryEntrancePos = { x, y };
                placed = true;
            }
            attempts++;
        }
    }

    generateSanctuaryRoom() {
        // 生成避难所房间（3x3 安全区）
        // [普通回复] [完全回复] [普通回复]
        // [  空   ] [玩家位置] [  空   ]
        // [  空   ] [完全撤退] [  空   ]
        return {
            size: 3,
            playerPos: { x: 1, y: 1 },
            grid: [
                [{type: 'heal'}, {type: 'full-heal'}, {type: 'heal'}],
                [{type: 'empty'}, {type: 'empty'}, {type: 'empty'}],
                [{type: 'empty'}, {type: 'full-retreat'}, {type: 'empty'}]
            ]
        };
    }

    placeGreenEye() {
        let placed = false;
        while (!placed) {
            const x = Math.floor(Math.random() * this.size);
            const y = Math.floor(Math.random() * this.size);
            if (this.grid[y][x].type === 'wall' && !(x === 0 && y === 0)) {
                this.greenEyes.push({
                    x, y,
                    active: false,
                    hp: 30,
                    maxHp: 30
                });
                placed = true;
            }
        }
    }

    carvePath() {
        // 简单的路径挖掘，确保起点到门是可达的
        const target = this.doorPos;
        let x = 0, y = 0;
        
        while (x !== target.x || y !== target.y) {
            if (Math.random() < 0.5 && x !== target.x) {
                x += target.x > x ? 1 : -1;
            } else if (y !== target.y) {
                y += target.y > y ? 1 : -1;
            }
            if (this.grid[y][x].type === 'wall') {
                this.grid[y][x].type = 'empty';
            }
        }
    }

    // 挖掘墙体
    dig(x, y) {
        const cell = this.grid[y][x];
        
        // 安全检查
        if (!cell) return null;
        
        // 已经揭示的不能挖
        if (cell.revealed) return null;
        
        // 获取该位置的绿眼
        const eye = this.getGreenEyeAt(x, y);
        
        // 标记为已揭示
        cell.revealed = true;

        // 根据类型返回结果
        if (cell.type === 'door') {
            return { type: 'door' };
        } else if (cell.type === 'sanctuary-entrance') {
            return { type: 'sanctuary-entrance', x, y };
        } else if (cell.type === 'key') {
            this.keyPos = null; // 钥匙被挖掉了
            return { type: 'key' };
        } else if (eye && !eye.defeated) {
            eye.active = true;
            return { type: 'greenEye', eye };
        } else {
            // wall 或 empty 都返回 empty
            cell.type = 'empty';
            return { type: 'empty' };
        }
    }

    isGreenEyeHere(x, y) {
        return this.greenEyes.some(eye => eye.x === x && eye.y === y && !eye.defeated);
    }

    getGreenEyeAt(x, y) {
        return this.greenEyes.find(eye => eye.x === x && eye.y === y);
    }

    // 雷达扫描
    scan(radarLevel) {
        const results = [];
        const range = radarLevel === 1 ? 1 : (radarLevel === 2 ? 2 : 3);
        
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const nx = this.playerPos.x + dx;
                const ny = this.playerPos.y + dy;
                
                if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                    const cell = this.grid[ny][nx];
                    const display = this.getRadarDisplay(cell, radarLevel);
                    results.push({ x: nx, y: ny, display, actual: cell.type });
                }
            }
        }
        
        return results;
    }

    getRadarDisplay(cell, radarLevel) {
        if (cell.type === 'door') return '?';
        if (cell.type === 'sanctuary-entrance') return '?';
        if (cell.type === 'key') return '?';
        
        // 绿眼是3级危险
        if (this.isGreenEyeHere(cell.x, cell.y)) {
            if (radarLevel >= 3) return 'danger-3';
            return 'safe'; // Lv1-2显示安全（欺骗）
        }
        
        if (cell.type === 'wall') return 'unknown';
        return 'empty';
    }

    // 绿眼攻击结算
    resolveGreenEyeAttacks() {
        const activeEyes = this.greenEyes.filter(eye => eye.active && !eye.defeated);
        let totalDamage = 0;
        let totalSan = 0;
        
        activeEyes.forEach(eye => {
            totalDamage += 10; // 固定10 HP伤害
            totalSan += 5;     // 固定5 SAN伤害
        });
        
        // SAN上限保护
        totalSan = Math.min(totalSan, 15);
        
        return { damage: totalDamage, sanLoss: totalSan, count: activeEyes.length };
    }

    // 检查是否可以前往下一房间
    canGoNextRoom() {
        if (!this.doorPos) return false;
        const dist = Math.abs(this.playerPos.x - this.doorPos.x) + 
                     Math.abs(this.playerPos.y - this.doorPos.y);
        return dist <= 1; // 必须在门旁边
    }

    // 击败绿眼
    defeatGreenEye(eye) {
        eye.defeated = true;
        eye.active = false;
    }
}
