// DS13 - 地牢生成系统

class DungeonGenerator {
    constructor(width = 10, height = 10) {
        this.width = width;
        this.height = height;
    }

    generate() {
        const grid = [];
        
        for (let y = 0; y < this.height; y++) {
            grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                grid[y][x] = this.createCell(x, y);
            }
        }

        // 确保起点(0,0)是安全的
        grid[0][0].type = 'empty';
        grid[0][0].revealed = true;

        // 确保出口(9,9)存在
        grid[this.height-1][this.width-1].type = 'exit';

        return {
            grid,
            width: this.width,
            height: this.height,
            playerPos: { x: 0, y: 0 }
        };
    }

    createCell(x, y) {
        const rand = Math.random();
        let type = 'wall';
        let dangerLevel = 0;

        // 角落安全区
        if ((x === 0 && y === 0) || (x === this.width-1 && y === this.height-1)) {
            return {
                x, y,
                type: x === 0 && y === 0 ? 'empty' : 'exit',
                revealed: x === 0 && y === 0,
                dangerLevel: 0,
                content: null
            };
        }

        // 生成内容
        if (rand < 0.60) {
            type = 'wall';  // 60%墙体
        } else if (rand < 0.75) {
            type = 'empty'; // 15%空地
        } else if (rand < 0.85) {
            type = 'danger';
            dangerLevel = Math.floor(Math.random() * 3) + 1; // 1-3级危险
        } else if (rand < 0.95) {
            type = 'loot';  // 10%资源
            dangerLevel = Math.floor(Math.random() * 2) + 1; // 1-2级危险
        } else {
            type = 'greenEyeSpawn'; // 5%绿眼刷新点
            dangerLevel = 3;
        }

        return {
            x, y,
            type,
            revealed: false,
            dangerLevel,
            content: this.generateContent(type)
        };
    }

    generateContent(type) {
        switch(type) {
            case 'loot':
                const lootType = Math.random();
                if (lootType < 0.5) return { type: 'money', amount: Math.floor(Math.random() * 100) + 50 };
                if (lootType < 0.8) return { type: 'battery', energy: 5 };
                return { type: 'medkit', hp: 20 };
            case 'danger':
                return { type: 'trap', damage: 10 * (Math.floor(Math.random() * 3) + 1) };
            default:
                return null;
        }
    }

    // 获取相邻格子
    getNeighbors(grid, x, y) {
        const neighbors = [];
        const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
        
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                neighbors.push(grid[ny][nx]);
            }
        }
        return neighbors;
    }

    // 检查格子是否可挖掘（相邻有已揭示的格子）
    isDiggable(grid, x, y) {
        if (grid[y][x].revealed) return false;
        
        const neighbors = this.getNeighbors(grid, x, y);
        return neighbors.some(n => n.revealed);
    }
}

// 地牢实例
const dungeonGenerator = new DungeonGenerator();
