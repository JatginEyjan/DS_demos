// Test: sessions_spawn communication successful - dogsend received task
// DS14 - 游戏主逻辑

const GameState = {
    // 基础状态
    hp: 100,
    maxHp: 100,
    san: 100,
    maxSan: 100,
    turn: 1,
    roomLevel: 1,
    oxygen: 20, // 初始氧气

    // 地牢状态
    dungeon: null,
    greenEyesFollowing: [], // 跟随的绿眼
    lastRoomHadSanctuary: false,

    // 装备状态
    radarLevel: 1,
    pickaxeType: 'single', // single, cross, horizontal
    inventory: [],

    // 局外状态
    money: 0,
    backpackSize: 5,
    keys: 0, // 钥匙数量

    // 游戏状态
    isGameOver: false,
    inDungeon: false,
    inSanctuary: false // 是否在避难所房间
};

// 商店配置
const SHOP = {
    radars: [
        { level: 1, name: '雷达 Lv1', price: 0, desc: '显示1-2级危险，3级显示安全' },
        { level: 2, name: '雷达 Lv2', price: 200, desc: '显示1-3级危险，看绿眼掉5SAN' },
        { level: 3, name: '雷达 Lv3', price: 500, desc: '显示1-3级危险，看绿眼掉3SAN' }
    ],
    pickaxes: [
        { type: 'single', name: '单格镐', price: 0, damage: 30, desc: '挖掘1格，伤害30' },
        { type: 'cross', name: '十字镐', price: 150, damage: 25, desc: '挖掘十字5格，伤害25' },
        { type: 'horizontal', name: '横排镐', price: 250, damage: 40, desc: '挖掘横向3格，伤害40' }
    ]
};

class Game {
    constructor() {
        this.audio = new AudioManager();
        this.init();
    }

    init() {
        this.showVillage();
        this.bindEvents();
    }

    // 显示村庄
    showVillage() {
        GameState.inDungeon = false;
        document.getElementById('village-screen').classList.remove('hidden');
        document.getElementById('dungeon-screen').classList.add('hidden');
        this.renderShop();
        this.updateVillageUI();
    }

    // 渲染商店
    renderShop() {
        const container = document.getElementById('shop-items');
        let html = '<h3>雷达</h3>';
        
        SHOP.radars.forEach(radar => {
            const owned = GameState.radarLevel === radar.level;
            const canAfford = GameState.money >= radar.price;
            html += `
                <div class="shop-item">
                    <span>${radar.name} - ${radar.desc}</span>
                    <span>${radar.price}💰</span>
                    ${owned ? '<span>已拥有</span>' : `<button class="btn ${canAfford ? '' : 'disabled'}" onclick="game.buyRadar(${radar.level}, ${radar.price})" ${!canAfford ? 'disabled' : ''}>购买</button>`}
                </div>
            `;
        });

        html += '<h3>镐子</h3>';
        SHOP.pickaxes.forEach(pick => {
            const owned = GameState.pickaxeType === pick.type;
            const canAfford = GameState.money >= pick.price;
            html += `
                <div class="shop-item">
                    <span>${pick.name} - ${pick.desc}</span>
                    <span>${pick.price}💰</span>
                    ${owned ? '<span>已拥有</span>' : `<button class="btn ${canAfford ? '' : 'disabled'}" onclick="game.buyPickaxe('${pick.type}', ${pick.price})" ${!canAfford ? 'disabled' : ''}>购买</button>`}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // 购买雷达
    buyRadar(level, price) {
        if (GameState.money >= price) {
            GameState.money -= price;
            GameState.radarLevel = level;
            this.renderShop();
            this.updateVillageUI();
            this.log(`购买了雷达 Lv${level}！`, 'success');
        }
    }

    // 购买镐子
    buyPickaxe(type, price) {
        if (GameState.money >= price) {
            GameState.money -= price;
            GameState.pickaxeType = type;
            this.renderShop();
            this.updateVillageUI();
            this.log(`购买了${SHOP.pickaxes.find(p => p.type === type).name}！`, 'success');
        }
    }

    // 更新村庄UI
    updateVillageUI() {
        document.getElementById('village-money').textContent = GameState.money;
        document.getElementById('village-backpack').textContent = GameState.backpackSize;
        document.getElementById('equip-radar').textContent = `Lv${GameState.radarLevel}`;
        document.getElementById('equip-pickaxe').textContent = SHOP.pickaxes.find(p => p.type === GameState.pickaxeType).name;
    }

    // 进入地牢
    enterDungeon() {
        // 重置状态
        GameState.hp = GameState.maxHp;
        GameState.san = GameState.maxSan;
        GameState.turn = 1;
        GameState.roomLevel = 1;
        GameState.oxygen = 20; // 初始氧气
        GameState.greenEyesFollowing = [];
        GameState.keys = 0; // 重置钥匙
        GameState.inDungeon = true;
        GameState.inSanctuary = false; // 不在避难所
        
        document.getElementById('village-screen').classList.add('hidden');
        document.getElementById('dungeon-screen').classList.remove('hidden');
        
        this.startNewRoom();
        this.bindDungeonEvents();
        this.updateUI();
    }

    startNewRoom() {
        // 生成新房
        GameState.dungeon = new Dungeon(GameState.roomLevel);
        GameState.oxygen = 20; // 每个房间重置氧气
        
        // 处理跟随的绿眼（50%概率）
        GameState.greenEyesFollowing.forEach(eye => {
            if (Math.random() < 0.5 && GameState.dungeon.greenEyes.length < GameState.roomLevel) {
                // 将跟随的绿眼加入新房
                GameState.dungeon.greenEyes.push({
                    ...eye,
                    active: false,
                    x: Math.floor(Math.random() * GameState.dungeon.size),
                    y: Math.floor(Math.random() * GameState.dungeon.size)
                });
            }
        });
        
        // 重置跟随列表
        GameState.greenEyesFollowing = [];
        
        // 检查是否生成避难所
        GameState.lastRoomHadSanctuary = GameState.dungeon.sanctuaryEntrancePos !== null;
        
        this.renderGrid();
        this.log(`进入了房间 ${GameState.roomLevel} (${GameState.dungeon.size}x${GameState.dungeon.size})，氧气剩余：${GameState.oxygen}`, 'system');
        
        // 如果有绿眼跟随，提示
        const followingCount = GameState.dungeon.greenEyes.length - 1; // 减去新生成的1个
        if (followingCount > 0) {
            this.log(`感觉到 ${followingCount} 个绿眼跟随而来...`, 'danger');
        }
    }

    bindEvents() {
        // 进入地牢按钮
        document.getElementById('enter-dungeon-btn').addEventListener('click', () => {
            this.enterDungeon();
        });

        // 雷达按钮
        document.getElementById('radar-btn').addEventListener('click', () => {
            this.useRadar();
        });

        // 撤退按钮
        document.getElementById('retreat-btn').addEventListener('click', () => {
            this.retreat();
        });

        // 避难所按钮
        document.getElementById('rest-btn').addEventListener('click', () => {
            this.restInSanctuary();
        });

        document.getElementById('full-retreat-btn').addEventListener('click', () => {
            this.fullRetreat();
        });

        document.getElementById('continue-btn').addEventListener('click', () => {
            document.getElementById('sanctuary-modal').classList.add('hidden');
        });

        // 重新开始
        document.getElementById('restart-btn').addEventListener('click', () => {
            document.getElementById('game-over-modal').classList.add('hidden');
            GameState.isGameOver = false;
            this.showVillage();
        });
        
        // 调试按钮
        document.getElementById('debug-btn').addEventListener('click', () => {
            const panel = document.getElementById('debug-panel');
            panel.classList.toggle('hidden');
        });
        
        document.getElementById('clear-debug-btn').addEventListener('click', () => {
            document.getElementById('debug-content').innerHTML = '';
        });
    }
    
    // 调试日志
    debugLog(message) {
        const content = document.getElementById('debug-content');
        if (content) {
            const entry = document.createElement('div');
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            content.appendChild(entry);
            content.scrollTop = content.scrollHeight;
        }
        console.log(message);
    }

    // 绑定地牢事件（只在 init 中调用一次）
    bindDungeonEvents() {
        // 这些事件已在 bindEvents() 中绑定，无需重复
        // 避免每次进入地牢时重复添加监听器
    }

    renderGrid() {
        const gridEl = document.getElementById('dungeon-grid');
        gridEl.innerHTML = '';

        // 如果在避难所房间，渲染避难所网格
        if (GameState.inSanctuary && GameState.dungeon.sanctuaryRoom) {
            this.renderSanctuaryRoom();
            return;
        }

        gridEl.style.gridTemplateColumns = `repeat(${GameState.dungeon.size}, 1fr)`;

        for (let y = 0; y < GameState.dungeon.size; y++) {
            for (let x = 0; x < GameState.dungeon.size; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                const gridCell = GameState.dungeon.grid[y][x];

                // 玩家位置
                if (x === GameState.dungeon.playerPos.x && y === GameState.dungeon.playerPos.y) {
                    cell.classList.add('player');
                    cell.textContent = '🧑';
                }
                // 已挖掘的格子
                else if (gridCell.revealed) {
                    cell.classList.add('dug');
                    
                    if (gridCell.type === 'door') {
                        cell.classList.add('door', 'clickable');
                        cell.textContent = '🚪';
                        cell.style.cursor = 'pointer';
                        cell.title = '移动到这里进入下一层';
                    } else if (gridCell.type === 'sanctuary-entrance') {
                        cell.classList.add('sanctuary-entrance', 'clickable');
                        cell.textContent = '🏠';
                        cell.style.cursor = 'pointer';
                        cell.title = '移动到这里进入避难所';
                    } else if (gridCell.type === 'key') {
                        cell.classList.add('key-found');
                        cell.textContent = '🗝️';
                    } else {
                        // 检查是否有绿眼
                        const eye = GameState.dungeon.getGreenEyeAt(x, y);
                        if (eye && !eye.defeated) {
                            cell.classList.add('green-eye');
                            cell.textContent = '👁️';
                        } else {
                            cell.textContent = '';
                        }
                    }

                    // 允许点击移动
                    cell.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const cx = parseInt(e.currentTarget.dataset.x);
                        const cy = parseInt(e.currentTarget.dataset.y);
                        this.dig(cx, cy);
                    });
                    cell.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const cx = parseInt(e.currentTarget.dataset.x);
                        const cy = parseInt(e.currentTarget.dataset.y);
                        this.dig(cx, cy);
                    }, {passive: false});

                } else {
                    cell.classList.add('wall');
                    cell.style.cursor = 'pointer';
                    // 使用 data 属性存储坐标，避免闭包问题
                    cell.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const cx = parseInt(e.currentTarget.dataset.x);
                        const cy = parseInt(e.currentTarget.dataset.y);
                        console.log(`Digging at ${cx}, ${cy}`);
                        this.dig(cx, cy);
                    });
                    cell.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const cx = parseInt(e.currentTarget.dataset.x);
                        const cy = parseInt(e.currentTarget.dataset.y);
                        console.log(`Digging at ${cx}, ${cy}`);
                        this.dig(cx, cy);
                    }, {passive: false});
                }

                gridEl.appendChild(cell);
            }
        }
    }

    // 渲染避难所房间
    renderSanctuaryRoom() {
        const gridEl = document.getElementById('dungeon-grid');
        const room = GameState.dungeon.sanctuaryRoom;
        gridEl.style.gridTemplateColumns = `repeat(${room.size}, 1fr)`;

        for (let y = 0; y < room.size; y++) {
            for (let x = 0; x < room.size; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell sanctuary-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                const roomCell = room.grid[y][x];

                // 玩家位置
                if (x === room.playerPos.x && y === room.playerPos.y) {
                    cell.classList.add('player');
                    cell.textContent = '🧑';
                }
                else if (roomCell.type === 'heal') {
                    // 普通回复格子 - 无需挖掘，直接点击
                    cell.classList.add('heal', 'clickable');
                    cell.textContent = '💚';
                    cell.title = '点击恢复 30 HP 和 30 SAN';
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.healInSanctuary();
                    });
                }
                else if (roomCell.type === 'full-heal') {
                    // 完全回复格子 - 无需挖掘，直接点击
                    cell.classList.add('full-heal', 'clickable');
                    cell.textContent = '❤️';
                    cell.title = '点击恢复全部 HP 和 SAN';
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.fullHealInSanctuary();
                    });
                }
                else if (roomCell.type === 'full-retreat') {
                    // 完全撤退格子
                    cell.classList.add('full-retreat', 'clickable');
                    cell.textContent = '🏃';
                    cell.title = '点击完全撤退，带战利品回村庄';
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.retreatFromSanctuary();
                    });
                }
                else {
                    cell.classList.add('empty');
                    cell.textContent = '';
                }

                gridEl.appendChild(cell);
            }
        }
    }

    dig(x, y) {
        if (GameState.isGameOver) return;
        
        // 检查是否相邻
        const px = GameState.dungeon.playerPos.x;
        const py = GameState.dungeon.playerPos.y;
        const isAdjacent = Math.abs(x - px) + Math.abs(y - py) === 1;

        if (!isAdjacent) {
            this.log('太远了！只能点击相邻的格子。', 'warning');
            return;
        }
        
        this.debugLog(`尝试点击: (${x}, ${y})`);
        
        // 检查格子是否存在
        if (!GameState.dungeon.grid[y] || !GameState.dungeon.grid[y][x]) {
            this.debugLog(`错误: 格子 (${x}, ${y}) 不存在`);
            return;
        }
        
        const cell = GameState.dungeon.grid[y][x];
        this.debugLog(`格子类型: ${cell.type}, 已揭示: ${cell.revealed}`);

        // 移动逻辑：如果格子已揭示，或者是空地，或者是避难所入口，或者是门
        if (cell.revealed) {
            this.log(`🏃 移动到 (${x}, ${y})`);
            GameState.dungeon.playerPos.x = x;
            GameState.dungeon.playerPos.y = y;
            GameState.turn++;
            this.endTurn();
            return;
        }

        // 根据镐子类型确定挖掘范围
        const digTargets = this.getDigTargets(x, y);
        let mainResult = null; // 主目标的挖掘结果
        let greenEyesFound = [];

        // 挖掘所有目标格子
        digTargets.forEach(pos => {
            this.debugLog(`  挖掘目标: (${pos.x}, ${pos.y})`);
            const result = GameState.dungeon.dig(pos.x, pos.y);
            if (result) {
                this.debugLog(`  结果: ${result.type}`);
                // 记录主目标的结果
                if (pos.x === x && pos.y === y) {
                    mainResult = result;
                }
                if (result.type === 'greenEye') {
                    greenEyesFound.push(result.eye);
                }
            } else {
                this.debugLog(`  结果: null (无法挖掘或已揭示)`);
            }
        });

        // 关键修复：只要主目标被挖掘了，就继续执行
        if (!mainResult) {
            this.debugLog(`挖掘失败: 主目标 (${x},${y}) 无法挖掘`);
            return;
        }

        // 消耗回合
        GameState.turn++;

        // 播放挖掘音效
        this.audio.playDig();

        // 处理挖掘结果
        if (greenEyesFound.length > 0) {
            this.log(`墙后隐藏着 ${greenEyesFound.length} 只绿眼！它们苏醒了！`, 'danger');
            this.audio.playHeartbeat();
            greenEyesFound.forEach(eye => this.encounterGreenEye(eye));
        } else {
            // 处理主目标的特殊类型
            switch(mainResult.type) {
                case 'key':
                    GameState.keys++;
                    this.log('🗝️ 发现了一把钥匙！现在可以开启通往下一层的门了。', 'success');
                    this.updateUI();
                    break;
                case 'door':
                    this.log('🚪 发现了通往下一层的门！需要钥匙才能开启。', 'success');
                    break;
                case 'sanctuary-entrance':
                    this.log('🏠 发现了避难所入口！点击进入可以安全休息。', 'success');
                    break;
                default:
                    this.log(`挖掘了 ${digTargets.length} 面墙。`);
            }
        }

        // 回合结束结算
        this.endTurn();
    }

    // 根据镐子类型获取挖掘目标
    getDigTargets(x, y) {
        const targets = [{x, y}]; // 主目标

        switch(GameState.pickaxeType) {
            case 'cross':
                // 十字镐：上下左右
                targets.push({x: x-1, y}, {x: x+1, y}, {x, y: y-1}, {x, y: y+1});
                break;
            case 'horizontal':
                // 横排镐：左右
                targets.push({x: x-1, y}, {x: x+1, y});
                break;
        }

        // 过滤掉超出边界的
        const size = GameState.dungeon.size;
        return targets.filter(pos => 
            pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size
        );
    }

    encounterGreenEye(eye) {
        // 立即受到一次攻击（遭遇惩罚）
        GameState.hp -= 10;
        GameState.san -= 5;
        
        this.log(`绿眼攻击！受到 10 点伤害，SAN值下降 5！`, 'danger');
        
        // 检查是否死亡/疯狂
        if (GameState.hp <= 0) {
            this.gameOver('死亡');
            return;
        }
        if (GameState.san <= 0) {
            this.gameOver('疯狂');
            return;
        }

        // 显示攻击选项
        setTimeout(() => {
            if (confirm('绿眼正在注视着你！是否攻击它？（取消则无视，每回合都会受到伤害）')) {
                this.attackGreenEye(eye);
            } else {
                this.log('你选择无视绿眼，但它会持续攻击你...', 'warning');
                // 将绿眼加入跟随列表（如果撤退时还没死）
                if (!GameState.greenEyesFollowing.includes(eye)) {
                    GameState.greenEyesFollowing.push(eye);
                }
            }
        }, 100);
    }

    attackGreenEye(eye) {
        // 根据镐子类型确定伤害
        const pickaxe = SHOP.pickaxes.find(p => p.type === GameState.pickaxeType);
        const damage = pickaxe.damage;
        eye.hp -= damage;
        
        this.log(`你用${pickaxe.name}攻击了绿眼，造成 ${damage} 点伤害！`, 'success');
        
        if (eye.hp <= 0) {
            GameState.dungeon.defeatGreenEye(eye);
            this.log('绿眼被消灭了！获得50💰', 'success');
            GameState.money += 50; // 击败绿眼获得金钱
            this.audio.stopHeartbeat();
        } else {
            this.log(`绿眼还有 ${eye.hp} 点生命值...`, 'warning');
        }
        
        this.updateUI();
        this.renderGrid();
    }

    endTurn() {
        // 氧气消耗
        if (!GameState.inSanctuary) {
            GameState.oxygen--;
            if (GameState.oxygen <= 0) {
                GameState.hp -= 5;
                this.log('缺氧！生命值下降 5 点！', 'danger');
                if (GameState.hp <= 0) {
                    this.gameOver('窒息');
                    return;
                }
            } else if (GameState.oxygen <= 5) {
                this.log(`⚠️ 氧气即将耗尽！剩余 ${GameState.oxygen} 回合`, 'warning');
            }
        }

        // 绿眼攻击结算
        const attacks = GameState.dungeon.resolveGreenEyeAttacks();
        
        if (attacks.count > 0) {
            GameState.hp -= attacks.damage;
            GameState.san -= attacks.sanLoss;
            
            this.log(`回合结束！${attacks.count} 只绿眼攻击，受到 ${attacks.damage} 伤害，SAN下降 ${attacks.sanLoss}！`, 'danger');
            
            // 更新心跳声
            this.audio.updateHeartbeat(attacks.count);
            
            if (GameState.hp <= 0) {
                this.gameOver('死亡');
                return;
            }
            if (GameState.san <= 0) {
                this.gameOver('疯狂');
                return;
            }
        }

        // 低SAN幻听
        if (GameState.san < 30 && Math.random() < 0.3) {
            this.audio.playHallucination();
            this.log('你听到了不存在的低语声...', 'warning');
        }

        this.updateUI();
        this.renderGrid();
    }

    useRadar() {
        const results = GameState.dungeon.scan(GameState.radarLevel);
        
        // 在网格上显示雷达扫描效果
        this.showRadarOnGrid(results);
        
        // 显示雷达结果面板
        const display = document.getElementById('radar-display');
        const content = document.getElementById('radar-content');
        content.innerHTML = '';
        
        let sanLossTotal = 0;
        
        results.forEach(r => {
            const cell = document.createElement('div');
            cell.textContent = `[${r.x},${r.y}] ${this.getRadarText(r.display)}`;
            content.appendChild(cell);
            
            // 如果是绿眼且雷达等级>=2，掉SAN
            if (r.actual === 'greenEye' && GameState.radarLevel >= 2) {
                const sanLoss = GameState.radarLevel === 2 ? 5 : 3;
                sanLossTotal += sanLoss;
            }
        });
        
        // 统一扣除SAN
        if (sanLossTotal > 0) {
            GameState.san -= sanLossTotal;
            this.log(`雷达捕捉到绿眼！SAN值下降 ${sanLossTotal}！`, 'danger');
        }
        
        display.classList.remove('hidden');
        setTimeout(() => display.classList.add('hidden'), 5000);
        
        this.updateUI();
    }

    showRadarOnGrid(results) {
        // 清除之前的雷达标记
        document.querySelectorAll('.radar-marker').forEach(el => el.remove());
        
        results.forEach(r => {
            const cell = document.querySelector(`.cell[data-x="${r.x}"][data-y="${r.y}"]`);
            if (cell) {
                const marker = document.createElement('div');
                marker.className = 'radar-marker';
                
                // 根据雷达显示类型设置不同标记
                switch(r.display) {
                    case 'safe':
                        marker.textContent = '✓';
                        marker.style.color = '#27ae60';
                        break;
                    case 'danger-3':
                        marker.textContent = '!!!';
                        marker.style.color = '#e94560';
                        break;
                    case '?':
                        marker.textContent = '?';
                        marker.style.color = '#f39c12';
                        break;
                    default:
                        marker.textContent = '•';
                        marker.style.color = '#888';
                }
                
                marker.style.cssText = `
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    font-size: 10px;
                    font-weight: bold;
                    pointer-events: none;
                    animation: radarPulse 2s infinite;
                `;
                
                cell.style.position = 'relative';
                cell.appendChild(marker);
                
                // 5秒后移除标记
                setTimeout(() => {
                    marker.remove();
                }, 5000);
            }
        });
    }

    getRadarText(display) {
        switch(display) {
            case 'safe': return '✓ 安全';
            case 'danger-3': return '!!! 致命';
            case '?': return '? 未知';
            case 'unknown': return '■ 墙体';
            default: return '○ 空';
        }
    }

    // 处理门点击
    handleDoorClick() {
        if (GameState.keys > 0) {
            // 有钥匙，消耗钥匙并进入下一层
            if (confirm('使用钥匙开启通往下一层的门？')) {
                GameState.keys--;
                GameState.roomLevel++;
                this.log('使用钥匙打开了门，进入了下一层...', 'success');
                
                // 保存活跃的未击败绿眼到跟随列表（50%概率）
                const activeEyes = GameState.dungeon.greenEyes.filter(eye => eye.active && !eye.defeated);
                if (activeEyes.length > 0) {
                    this.log(`${activeEyes.length} 个绿眼试图跟随你...`, 'warning');
                }
                
                this.startNewRoom();
                this.updateUI();
            }
        } else {
            // 没钥匙
            this.log('🚪 门被锁住了！需要找到钥匙才能开启。', 'warning');
            alert('门被锁住了！你需要先找到钥匙。\n\n继续探索地牢寻找钥匙吧。');
        }
    }

    // 进入避难所房间
    enterSanctuaryRoom() {
        GameState.inSanctuary = true;
        GameState.dungeon.sanctuaryRoom = GameState.dungeon.generateSanctuaryRoom();
        this.log('进入了避难所，这里很安全...', 'success');
        this.renderGrid();
    }

    // 退出避难所
    exitSanctuary() {
        GameState.inSanctuary = false;
        this.log('离开了避难所，返回地牢...', 'system');
        this.renderGrid();
    }

    showDoorOption() {
        // 已废弃，改为 handleDoorClick
    }

    showSanctuaryModal() {
        document.getElementById('sanctuary-modal').classList.remove('hidden');
    }

    // 普通回复（避难所）- 回复 30 HP 和 30 SAN
    healInSanctuary() {
        const healAmount = 30;
        const oldHp = GameState.hp;
        const oldSan = GameState.san;

        GameState.hp = Math.min(GameState.maxHp, GameState.hp + healAmount);
        GameState.san = Math.min(GameState.maxSan, GameState.san + healAmount);

        const hpRestored = GameState.hp - oldHp;
        const sanRestored = GameState.san - oldSan;

        this.log(`💚 舒适的休息恢复了 ${hpRestored} HP 和 ${sanRestored} SAN！`, 'success');
        this.updateUI();
    }

    // 完全回复（避难所）
    fullHealInSanctuary() {
        const oldHp = GameState.hp;
        const oldSan = GameState.san;

        GameState.hp = GameState.maxHp;
        GameState.san = GameState.maxSan;

        const hpRestored = GameState.maxHp - oldHp;
        const sanRestored = GameState.maxSan - oldSan;

        this.log(`❤️ 圣光笼罩！完全恢复了 ${hpRestored} HP 和 ${sanRestored} SAN！`, 'success');
        this.updateUI();
    }

    // 完全撤退（避难所）
    retreatFromSanctuary() {
        if (confirm('确定要完全撤退吗？\n将带战利品返回村庄。')) {
            this.log('🏃 从避难所完全撤退...', 'system');
            this.fullRetreat();
        }
    }

    restInSanctuary() {
        // 旧方法保留（兼容）
        this.fullHealInSanctuary();
    }

    fullRetreat() {
        // 完全撤离，获得房间等级 x 100 的金钱
        const bonus = GameState.roomLevel * 100;
        GameState.money += bonus;
        alert(`完全撤离成功！\n最终到达：房间 ${GameState.roomLevel}\n获得撤离奖励：${bonus}💰\n总金钱：${GameState.money}💰`);
        this.showVillage();
    }

    retreat() {
        // 普通撤退，获得房间等级 x 50 的金钱
        const bonus = GameState.roomLevel * 50;
        GameState.money += bonus;
        alert(`撤退成功！\n最终到达：房间 ${GameState.roomLevel}\n获得基础奖励：${bonus}💰\n总金钱：${GameState.money}💰`);
        this.showVillage();
    }

    gameOver(reason) {
        GameState.isGameOver = true;
        document.getElementById('game-over-modal').classList.remove('hidden');
        document.getElementById('game-over-title').textContent = 
            reason === '死亡' ? '你死了' : '你疯了';
        document.getElementById('game-over-reason').textContent = 
            reason === '死亡' ? '你的肉体被地牢吞噬...' : '你的意识在深渊中消散...';
    }

    log(message, type = '') {
        const panel = document.getElementById('log-panel');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${GameState.turn}] ${message}`;
        panel.appendChild(entry);
        panel.scrollTop = panel.scrollHeight;
    }

    updateUI() {
        document.getElementById('hp-value').textContent = `${GameState.hp}/${GameState.maxHp}`;
        document.getElementById('san-value').textContent = `${GameState.san}/${GameState.maxSan}`;
        document.getElementById('turn-value').textContent = GameState.turn;
        document.getElementById('room-value').textContent = GameState.roomLevel;
        
        // 更新氧气显示
        const oxygenElement = document.getElementById('oxygen-value');
        if (oxygenElement) {
            oxygenElement.textContent = GameState.oxygen;
            // 如果氧气极低，显示为红色
            if (GameState.oxygen <= 5 && !GameState.inSanctuary) {
                oxygenElement.style.color = '#e94560';
                oxygenElement.style.fontWeight = 'bold';
            } else {
                oxygenElement.style.color = '';
                oxygenElement.style.fontWeight = '';
            }
        }
        
        // 更新钥匙显示
        const keyElement = document.getElementById('key-value');
        if (keyElement) {
            keyElement.textContent = GameState.keys;
        }
        
        document.getElementById('hp-bar').style.width = `${(GameState.hp / GameState.maxHp) * 100}%`;
        document.getElementById('san-bar').style.width = `${(GameState.san / GameState.maxSan) * 100}%`;
    }
}

// 启动游戏
window.onload = () => {
    window.game = new Game();
};
