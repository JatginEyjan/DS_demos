// DS13 - 游戏主逻辑

class Game {
    constructor() {
        this.ui = null;
        this.inDungeon = false;
        this.gameLoopInterval = null;
    }

    init() {
        // 初始化音频
        audioSystem.init();
        
        // 初始化UI
        this.ui = new UI();
        this.ui.init();
        window.ui = this.ui;

        // 显示开始界面
        this.ui.showScreen('startScreen');

        console.log('DS13 深渊凝视 - 游戏初始化完成');
    }

    // 生成角色
    rollCharacter() {
        GameState.character = rollCharacter();
        
        // 初始化当前状态
        GameState.current.san = GameState.character.will * 10;
        GameState.current.hp = GameState.character.hp;
        GameState.current.energy = GameState.character.energy;
        GameState.current.stamina = GameState.character.stamina;
        GameState.current.money = CONFIG.STARTING_MONEY;
        
        // 初始化装备
        GameState.equipment = { radar: 'lv1', pickaxe: 'single' };
        GameState.backpack = [];
        
        // 显示角色属性
        this.ui.showCharacterStats();
    }

    // 进入村庄
    enterVillage() {
        this.inDungeon = false;
        this.ui.showScreen('villageScreen');
        this.ui.renderVillage();
    }

    // 进入地牢
    enterDungeon() {
        // 生成地牢
        GameState.dungeon = dungeonGenerator.generate();
        GameState.dungeonLevel = 1;
        
        // 重置绿眼
        greenEyeSystem.dormant();
        GameState.greenEye = { active: false, hasEncountered: false };
        
        // 重置临时状态
        this.inDungeon = true;
        
        // 显示地牢界面
        this.ui.showScreen('dungeonScreen');
        this.ui.renderDungeon();
        this.ui.log('你进入了地牢...黑暗中有什么在注视着你', 'warning');
        
        // 启动游戏循环
        this.startGameLoop();
    }

    // 挖掘格子
    dig(x, y, pickaxeType = null) {
        if (!this.inDungeon) return;
        
        const dungeon = GameState.dungeon;
        const cell = dungeon.grid[y][x];
        
        // 检查是否可挖掘
        if (!dungeonGenerator.isDiggable(dungeon.grid, x, y)) {
            this.ui.log('太远了，无法挖掘', 'warning');
            return;
        }

        // 获取镐子配置
        const pickaxe = pickaxeType || GameState.equipment.pickaxe;
        const pickConfig = CONFIG.SHOP_ITEMS.pickaxe[pickaxe];
        
        // 检查体力/SAN
        if (GameState.current.stamina < pickConfig.staminaCost) {
            this.ui.log('体力不足！', 'danger');
            return;
        }
        if (pickConfig.sanCost && GameState.current.san < pickConfig.sanCost) {
            this.ui.log('意志不足以使用这个镐子！', 'danger');
            return;
        }

        // 消耗资源
        GameState.current.stamina -= pickConfig.staminaCost;
        if (pickConfig.sanCost) GameState.current.san -= pickConfig.sanCost;

        // 播放挖掘音效
        audioSystem.playDigSound();

        // 揭示格子
        this.revealCell(x, y);

        // 十字镐或横排镐额外挖掘
        if (pickConfig.type === 'cross') {
            this.revealCell(x+1, y); this.revealCell(x-1, y);
            this.revealCell(x, y+1); this.revealCell(x, y-1);
        } else if (pickConfig.type === 'horizontal') {
            this.revealCell(x+1, y); this.revealCell(x-1, y);
        }

        // 更新UI
        this.ui.updateStats();
        this.ui.renderDungeon();
    }

    // 揭示格子
    revealCell(x, y) {
        const dungeon = GameState.dungeon;
        if (x < 0 || x >= dungeon.width || y < 0 || y >= dungeon.height) return;
        
        const cell = dungeon.grid[y][x];
        if (cell.revealed) return;
        
        cell.revealed = true;

        // 处理格子内容
        switch(cell.type) {
            case 'loot':
                this.collectLoot(cell.content);
                break;
            case 'danger':
                this.triggerTrap(cell);
                break;
            case 'greenEyeSpawn':
                greenEyeSystem.trySpawn(x, y);
                break;
            case 'exit':
                this.ui.log('你发现了一个出口！可以撤离了', 'success');
                break;
        }
    }

    // 收集资源
    collectLoot(content) {
        if (!content) return;

        switch(content.type) {
            case 'money':
                GameState.current.money += content.amount;
                this.ui.log(`获得了 ${content.amount} 金钱`, 'success');
                break;
            case 'battery':
                this.addToBackpack('电池', 'energy', content.energy);
                break;
            case 'medkit':
                this.addToBackpack('医疗包', 'hp', content.hp);
                break;
        }
    }

    // 触发陷阱
    triggerTrap(cell) {
        const damage = cell.content?.damage || 10;
        GameState.current.hp -= damage;
        this.ui.log(`触发陷阱！受到 ${damage} 点伤害！`, 'danger');
        
        if (GameState.current.hp <= 0) {
            this.gameOver('death');
        }
    }

    // 添加到背包
    addToBackpack(name, type, value) {
        if (GameState.backpack.length >= GameState.character.backpack) {
            this.ui.log('背包满了！无法携带更多物品', 'warning');
            return false;
        }
        
        GameState.backpack.push({ name, type, value });
        this.ui.log(`获得了 ${name}`, 'success');
        return true;
    }

    // 使用背包物品
    useBackpackItem(index) {
        if (index < 0 || index >= GameState.backpack.length) return;
        
        const item = GameState.backpack[index];
        
        switch(item.type) {
            case 'energy':
                GameState.current.energy = Math.min(
                    GameState.current.energy + item.value,
                    GameState.character.energy
                );
                this.ui.log(`使用了 ${item.name}，电量恢复 ${item.value}`, 'success');
                break;
            case 'hp':
                GameState.current.hp = Math.min(
                    GameState.current.hp + item.value,
                    GameState.character.hp
                );
                this.ui.log(`使用了 ${item.name}，血量恢复 ${item.value}`, 'success');
                break;
        }
        
        GameState.backpack.splice(index, 1);
        this.ui.updateStats();
    }

    // 移动玩家
    movePlayer(x, y) {
        const dungeon = GameState.dungeon;
        if (x < 0 || x >= dungeon.width || y < 0 || y >= dungeon.height) return;
        
        const cell = dungeon.grid[y][x];
        if (!cell.revealed || cell.type === 'wall') {
            this.ui.log('无法移动到那里', 'warning');
            return;
        }

        dungeon.playerPos = { x, y };
        
        // 恢复少量体力
        GameState.current.stamina = Math.min(
            GameState.current.stamina + 1,
            GameState.character.stamina
        );

        this.ui.renderDungeon();
    }

    // 撤离
    retreat() {
        if (!this.inDungeon) return;

        // 计算收益
        const earnedMoney = Math.floor(GameState.current.money - CONFIG.STARTING_MONEY);
        
        this.inDungeon = false;
        clearInterval(this.gameLoopInterval);
        
        // 判断是否疯狂
        if (GameState.current.san <= 0) {
            this.gameOver('madness');
        } else {
            this.ui.showScreen('villageScreen');
            this.ui.log(`成功撤离！获得 ${earnedMoney} 金钱`, 'success');
            this.ui.renderVillage();
        }
    }

    // 游戏结束
    gameOver(reason) {
        this.inDungeon = false;
        clearInterval(this.gameLoopInterval);
        
        const screen = document.getElementById('gameOverScreen');
        const title = document.getElementById('gameOverTitle');
        const reasonText = document.getElementById('gameOverReason');
        
        screen.classList.remove('death', 'madness', 'escape');
        
        switch(reason) {
            case 'death':
                screen.classList.add('death');
                title.textContent = '你死了';
                reasonText.textContent = '地牢吞噬了你的生命...';
                break;
            case 'madness':
                screen.classList.add('madness');
                title.textContent = '你疯了';
                reasonText.textContent = '你的意识被深渊撕裂...';
                break;
        }
        
        this.ui.showScreen('gameOverScreen');
    }

    // 游戏循环
    startGameLoop() {
        this.gameLoopInterval = setInterval(() => {
            this.update();
        }, 1000);
    }

    update() {
        if (!this.inDungeon) return;

        // 自然恢复（很慢）
        if (GameState.current.stamina < GameState.character.stamina) {
            GameState.current.stamina += 0.5;
        }

        // 绿眼相关更新
        if (greenEyeSystem.state !== 'dormant') {
            // 检查绿眼是否在视野中
            if (greenEyeSystem.isInPlayerView()) {
                // 在视野中，显示惊吓效果
                if (!document.getElementById('greenEyeFlash').classList.contains('show')) {
                    this.ui.showGreenEyeFlash();
                }
            }
        }

        // 更新UI
        this.ui.updateStats();
    }
}

// 游戏实例
let game;

// 启动
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    game = new Game();
    game.init();
});
