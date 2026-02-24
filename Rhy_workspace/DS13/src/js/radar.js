// DS13 - 雷达系统

class RadarSystem {
    constructor() {
        this.lastScanTime = 0;
        this.scanCooldown = 500; // 扫描间隔500ms
    }

    // 扫描区域
    scan(centerX, centerY, range = 2) {
        const now = Date.now();
        if (now - this.lastScanTime < this.scanCooldown) {
            return { success: false, reason: '扫描冷却中' };
        }

        // 检查电量
        if (GameState.current.energy < CONFIG.RADAR_COST) {
            return { success: false, reason: '电量不足' };
        }

        // 消耗电量
        GameState.current.energy -= CONFIG.RADAR_COST;
        this.lastScanTime = now;

        // 获取雷达等级
        const radarLevel = CONFIG.SHOP_ITEMS.radar[GameState.equipment.radar].level;
        
        // 扫描范围
        const results = [];
        const dungeon = GameState.dungeon;

        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;

                if (x >= 0 && x < dungeon.width && y >= 0 && y < dungeon.height) {
                    const cell = dungeon.grid[y][x];
                    const scanResult = this.analyzeCell(cell, radarLevel);
                    results.push({ x, y, ...scanResult });
                }
            }
        }

        // 播放扫描音效
        if (window.audio) window.audio.playScanSound();

        return { success: true, results };
    }

    // 分析格子危险度
    analyzeCell(cell, radarLevel) {
        const actualDanger = cell.dangerLevel;
        
        // 雷达欺骗逻辑
        if (actualDanger > radarLevel) {
            // 危险等级超过雷达能力，显示为安全
            return {
                dangerLevel: 0,
                displayClass: 'safe',
                actualDanger: actualDanger, // 实际危险（隐藏）
                isDeception: true
            };
        }

        // 雷达能看到真实危险
        let sanCost = 0;
        if (actualDanger === 3 && radarLevel >= 3) {
            sanCost = 5; // Lv.3雷达看到3级危险掉5SAN
        } else if (actualDanger === 3 && radarLevel === 2) {
            sanCost = 10; // Lv.2雷达看到3级危险掉10SAN
        }

        // 扣除SAN
        if (sanCost > 0) {
            GameState.current.san -= sanCost;
            if (window.ui) {
                window.ui.log(`雷达显示致命危险！SAN值下降${sanCost}！`, 'danger');
            }
        }

        return {
            dangerLevel: actualDanger,
            displayClass: this.getDangerClass(actualDanger),
            sanCost,
            isDeception: false
        };
    }

    getDangerClass(level) {
        switch(level) {
            case 0: return 'safe';
            case 1: return 'danger-1';
            case 2: return 'danger-2';
            case 3: return 'danger-3';
            default: return 'unknown';
        }
    }

    // 快速扫描单个格子（用于UI显示）
    quickScan(x, y) {
        const dungeon = GameState.dungeon;
        if (!dungeon || x < 0 || x >= dungeon.width || y < 0 || y >= dungeon.height) {
            return null;
        }

        const cell = dungeon.grid[y][x];
        const radarLevel = CONFIG.SHOP_ITEMS.radar[GameState.equipment.radar].level;

        // 如果格子已揭示，显示真实信息
        if (cell.revealed) {
            return {
                dangerLevel: cell.dangerLevel,
                type: cell.type,
                revealed: true
            };
        }

        // 未揭示的格子，根据雷达等级显示
        if (cell.dangerLevel > radarLevel) {
            return {
                dangerLevel: 0, // 显示安全
                type: 'unknown',
                revealed: false,
                deception: true
            };
        }

        return {
            dangerLevel: cell.dangerLevel,
            type: 'unknown',
            revealed: false,
            deception: false
        };
    }
}

// 雷达实例
const radarSystem = new RadarSystem();
