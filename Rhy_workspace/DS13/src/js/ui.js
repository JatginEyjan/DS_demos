// DS13 - UI渲染

class UI {
    constructor() {
        this.currentScreen = 'startScreen';
        this.characterStatsDisplayed = false;
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // 开始界面
        document.getElementById('rollBtn')?.addEventListener('click', () => {
            game.rollCharacter();
            document.getElementById('startBtn').disabled = false;
        });

        document.getElementById('startBtn')?.addEventListener('click', () => {
            game.enterVillage();
        });

        // 村庄界面
        document.getElementById('enterDungeonBtn')?.addEventListener('click', () => {
            game.enterDungeon();
        });

        // 地牢界面
        document.getElementById('radarScanBtn')?.addEventListener('click', () => {
            this.scanRadar();
        });

        document.getElementById('retreatBtn')?.addEventListener('click', () => {
            game.retreat();
        });

        // 游戏结束
        document.getElementById('returnVillageBtn')?.addEventListener('click', () => {
            game.enterVillage();
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId)?.classList.add('active');
        this.currentScreen = screenId;
    }

    // 显示角色属性
    showCharacterStats() {
        const container = document.getElementById('statsDisplay');
        if (!container || !GameState.character) return;

        const stats = GameState.character;
        container.innerHTML = `
            <div class="stat-row"><span class="stat-label">意志:</span><span class="stat-value">${stats.will}</span></div>
            <div class="stat-row"><span class="stat-label">血量:</span><span class="stat-value">${stats.hp}</span></div>
            <div class="stat-row"><span class="stat-label">电量:</span><span class="stat-value">${stats.energy}</span></div>
            <div class="stat-row"><span class="stat-label">体力:</span><span class="stat-value">${stats.stamina}</span></div>
            <div class="stat-row"><span class="stat-label">包容量:</span><span class="stat-value">${stats.backpack}</span></div>
        `;
    }

    // 渲染村庄
    renderVillage() {
        // 更新状态显示
        document.getElementById('villageSan').textContent = GameState.current.san;
        document.getElementById('villageHp').textContent = GameState.current.hp;
        document.getElementById('villageEnergy').textContent = GameState.current.energy;
        document.getElementById('villageStamina').textContent = GameState.current.stamina;
        document.getElementById('villageMoney').textContent = GameState.current.money;

        // 渲染商店
        this.renderShop();

        // 渲染背包
        this.renderBackpack();
    }

    renderShop() {
        const container = document.getElementById('shopItems');
        if (!container) return;

        let html = '';

        // 雷达
        for (const [key, item] of Object.entries(CONFIG.SHOP_ITEMS.radar)) {
            const owned = GameState.equipment.radar === key;
            html += `
                <div class="shop-item ${owned ? 'purchased' : ''}">
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-desc">${item.desc}</div>
                    </div>
                    <div>
                        <span class="item-price">${item.price}💰</span>
                        ${owned ? '<span>已装备</span>' : `<button class="btn btn-secondary" onclick="ui.buyItem('radar', '${key}')">购买</button>`}
                    </div>
                </div>
            `;
        }

        // 镐子
        for (const [key, item] of Object.entries(CONFIG.SHOP_ITEMS.pickaxe)) {
            const owned = GameState.equipment.pickaxe === key;
            html += `
                <div class="shop-item ${owned ? 'purchased' : ''}">
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-desc">${item.desc}</div>
                    </div>
                    <div>
                        <span class="item-price">${item.price}💰</span>
                        ${owned ? '<span>已装备</span>' : `<button class="btn btn-secondary" onclick="ui.buyItem('pickaxe', '${key}')">购买</button>`}
                    </div>
                </div>
            `;
        }

        // 消耗品
        for (const [key, item] of Object.entries(CONFIG.SHOP_ITEMS.consumables)) {
            html += `
                <div class="shop-item">
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-desc">${item.desc}</div>
                    </div>
                    <div>
                        <span class="item-price">${item.price}💰</span>
                        <button class="btn btn-secondary" onclick="ui.buyConsumable('${key}')">购买</button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    renderBackpack() {
        const container = document.getElementById('backpackContent');
        const countEl = document.getElementById('backpackCount');
        const maxEl = document.getElementById('backpackMax');

        if (countEl) countEl.textContent = GameState.backpack.length;
        if (maxEl) maxEl.textContent = GameState.character?.backpack || 0;

        if (!container) return;

        if (GameState.backpack.length === 0) {
            container.innerHTML = '<div style="color: #7f8c8d;">背包为空</div>';
            return;
        }

        container.innerHTML = GameState.backpack.map((item, index) => `
            <div class="shop-item" style="margin-bottom: 8px;">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                </div>
                <button class="btn btn-secondary" onclick="game.useBackpackItem(${index})">使用</button>
            </div>
        `).join('');
    }

    buyItem(type, key) {
        const item = type === 'radar' ? CONFIG.SHOP_ITEMS.radar[key] : CONFIG.SHOP_ITEMS.pickaxe[key];
        
        if (GameState.current.money < item.price) {
            alert('金钱不足！');
            return;
        }

        GameState.current.money -= item.price;
        GameState.equipment[type] = key;
        this.renderVillage();
    }

    buyConsumable(key) {
        const item = CONFIG.SHOP_ITEMS.consumables[key];
        
        if (GameState.current.money < item.price) {
            alert('金钱不足！');
            return;
        }

        if (game.addToBackpack(item.name, key === 'battery' ? 'energy' : 'hp', item.energy || item.hp)) {
            GameState.current.money -= item.price;
            this.renderVillage();
        }
    }

    // 渲染地牢
    renderDungeon() {
        const container = document.getElementById('dungeonGrid');
        if (!container || !GameState.dungeon) return;

        const dungeon = GameState.dungeon;
        const player = dungeon.playerPos;

        container.innerHTML = '';

        for (let y = 0; y < dungeon.height; y++) {
            for (let x = 0; x < dungeon.width; x++) {
                const cell = dungeon.grid[y][x];
                const cellEl = document.createElement('div');
                cellEl.className = 'grid-cell';
                
                // 玩家位置
                if (x === player.x && y === player.y) {
                    cellEl.classList.add('player');
                    cellEl.textContent = '🧑';
                }
                // 已揭示的格子
                else if (cell.revealed) {
                    cellEl.classList.add('revealed');
                    
                    if (cell.dangerLevel > 0) {
                        cellEl.classList.add(`danger-${cell.dangerLevel}`);
                        cellEl.innerHTML = `<span class="danger-indicator">${cell.dangerLevel}</span>`;
                    }

                    // 显示内容
                    switch(cell.type) {
                        case 'wall': cellEl.textContent = '🧱'; break;
                        case 'loot': cellEl.textContent = '💰'; break;
                        case 'exit': cellEl.textContent = '🚪'; break;
                        case 'greenEyeSpawn': 
                            if (greenEyeSystem.position?.x === x && greenEyeSystem.position?.y === y) {
                                cellEl.classList.add('green-eye-visible');
                                cellEl.textContent = '👁️';
                            }
                            break;
                    }
                }
                // 可挖掘的墙
                else if (dungeonGenerator.isDiggable(dungeon.grid, x, y)) {
                    cellEl.onclick = () => game.dig(x, y);
                }
                // 未知
                else {
                    cellEl.style.opacity = '0.3';
                }

                container.appendChild(cellEl);
            }
        }

        // 更新状态
        this.updateStats();

        // 更新装备显示
        const radarName = CONFIG.SHOP_ITEMS.radar[GameState.equipment.radar].name;
        const pickaxeName = CONFIG.SHOP_ITEMS.pickaxe[GameState.equipment.pickaxe].name;
        document.getElementById('equippedRadar').textContent = radarName;
        document.getElementById('equippedPickaxe').textContent = pickaxeName;
    }

    // 雷达扫描
    scanRadar() {
        const result = radarSystem.scan(
            GameState.dungeon.playerPos.x,
            GameState.dungeon.playerPos.y
        );

        if (!result.success) {
            this.log(result.reason, 'warning');
            return;
        }

        this.log('雷达扫描完成！', 'success');
        this.renderDungeon();
    }

    // 更新状态显示
    updateStats() {
        document.getElementById('dungeonSan').textContent = Math.floor(GameState.current.san);
        document.getElementById('dungeonHp').textContent = Math.floor(GameState.current.hp);
        document.getElementById('dungeonEnergy').textContent = Math.floor(GameState.current.energy);
        document.getElementById('dungeonStamina').textContent = Math.floor(GameState.current.stamina);
    }

    // 显示绿眼惊吓
    showGreenEyeFlash() {
        const flash = document.getElementById('greenEyeFlash');
        flash.classList.add('show');
        setTimeout(() => flash.classList.remove('show'), 2000);
    }

    // 日志
    log(message, type = 'normal') {
        const container = document.getElementById('dungeonLog');
        if (!container) return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }
}

// UI实例
let ui;
