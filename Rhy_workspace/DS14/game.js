// DS14 - 游戏主逻辑

const GameState = {
    hp: 100,
    maxHp: 100,
    san: 100,
    maxSan: 100,
    turn: 1,
    roomLevel: 1,
    dungeon: null,
    greenEyesFollowing: [], // 跟随的绿眼
    lastRoomHadSanctuary: false,
    radarLevel: 1,
    inventory: [],
    isGameOver: false
};

class Game {
    constructor() {
        this.audio = new AudioManager();
        this.init();
    }

    init() {
        this.startNewRoom();
        this.bindEvents();
        this.updateUI();
    }

    startNewRoom() {
        // 生成新房
        GameState.dungeon = new Dungeon(GameState.roomLevel);
        
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
        GameState.lastRoomHadSanctuary = GameState.dungeon.sanctuaryPos !== null;
        
        this.renderGrid();
        this.log(`进入了房间 ${GameState.roomLevel} (${GameState.dungeon.size}x${GameState.dungeon.size})`, 'system');
        
        // 如果有绿眼跟随，提示
        const followingCount = GameState.dungeon.greenEyes.length - 1; // 减去新生成的1个
        if (followingCount > 0) {
            this.log(`感觉到 ${followingCount} 个绿眼跟随而来...`, 'danger');
        }
    }

    bindEvents() {
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
            location.reload();
        });
    }

    renderGrid() {
        const gridEl = document.getElementById('dungeon-grid');
        gridEl.innerHTML = '';
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
                        cell.classList.add('door');
                        cell.textContent = '🚪';
                    } else if (gridCell.type === 'sanctuary') {
                        cell.classList.add('sanctuary');
                        cell.textContent = '🏠';
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
                } else {
                    cell.classList.add('wall');
                    cell.addEventListener('click', () => this.dig(x, y));
                }

                gridEl.appendChild(cell);
            }
        }
    }

    dig(x, y) {
        if (GameState.isGameOver) return;

        const result = GameState.dungeon.dig(x, y);
        if (!result) return;

        // 消耗回合
        GameState.turn++;

        // 播放挖掘音效
        this.audio.playDig();

        // 处理挖掘结果
        switch(result.type) {
            case 'empty':
                this.log('挖掘了一面墙，里面什么都没有。');
                break;
            case 'door':
                this.log('发现了通往下一层的门！', 'success');
                this.showDoorOption();
                break;
            case 'sanctuary':
                this.log('发现了一个避难所！', 'success');
                this.showSanctuaryModal();
                break;
            case 'greenEye':
                this.log('墙后隐藏着一只绿眼！它苏醒了！', 'danger');
                this.audio.playHeartbeat();
                this.encounterGreenEye(result.eye);
                break;
        }

        // 回合结束结算
        this.endTurn();
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
        // 100%命中，固定伤害30（需要2-3次攻击）
        const damage = 30;
        eye.hp -= damage;
        
        this.log(`你攻击了绿眼，造成 ${damage} 点伤害！`, 'success');
        
        if (eye.hp <= 0) {
            GameState.dungeon.defeatGreenEye(eye);
            this.log('绿眼被消灭了！', 'success');
            this.audio.stopHeartbeat();
        } else {
            this.log(`绿眼还有 ${eye.hp} 点生命值...`, 'warning');
        }
        
        this.updateUI();
        this.renderGrid();
    }

    endTurn() {
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
        
        // 显示雷达结果
        const display = document.getElementById('radar-display');
        const content = document.getElementById('radar-content');
        content.innerHTML = '';
        
        results.forEach(r => {
            const cell = document.createElement('div');
            cell.textContent = `[${r.x},${r.y}] ${this.getRadarText(r.display)}`;
            content.appendChild(cell);
            
            // 如果是绿眼且雷达等级>=2，掉SAN
            if (r.actual === 'greenEye' && GameState.radarLevel >= 2) {
                const sanLoss = GameState.radarLevel === 2 ? 5 : 3;
                GameState.san -= sanLoss;
                this.log(`雷达捕捉到了绿眼！SAN值下降 ${sanLoss}！`, 'danger');
            }
        });
        
        display.classList.remove('hidden');
        setTimeout(() => display.classList.add('hidden'), 3000);
        
        this.updateUI();
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

    showDoorOption() {
        if (confirm('是否前往下一层？（取消则继续探索当前层）')) {
            GameState.roomLevel++;
            // 保存未击败的绿眼到跟随列表
            GameState.dungeon.greenEyes.forEach(eye => {
                if (!eye.defeated && !eye.active) {
                    GameState.greenEyesFollowing.push(eye);
                }
            });
            this.startNewRoom();
        }
    }

    showSanctuaryModal() {
        document.getElementById('sanctuary-modal').classList.remove('hidden');
    }

    restInSanctuary() {
        // 恢复状态
        GameState.hp = Math.min(GameState.hp + 30, GameState.maxHp);
        GameState.san = Math.min(GameState.san + 30, GameState.maxSan);
        this.log('在避难所休息，恢复了30点HP和SAN！', 'success');
        document.getElementById('sanctuary-modal').classList.add('hidden');
        this.updateUI();
    }

    fullRetreat() {
        // 完全撤离，带走所有物品
        alert(`完全撤离成功！带走了所有物品。\n最终到达：房间 ${GameState.roomLevel}\n剩余HP：${GameState.hp}\n剩余SAN：${GameState.san}`);
        location.reload();
    }

    retreat() {
        // 普通撤退，只能带走房间层级数量的物品
        const canTake = GameState.roomLevel;
        alert(`撤退成功！\n只能带走 ${canTake} 个物品（当前房间层级）。\n最终到达：房间 ${GameState.roomLevel}`);
        location.reload();
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
        
        document.getElementById('hp-bar').style.width = `${(GameState.hp / GameState.maxHp) * 100}%`;
        document.getElementById('san-bar').style.width = `${(GameState.san / GameState.maxSan) * 100}%`;
    }
}

// 启动游戏
window.onload = () => {
    window.game = new Game();
};
