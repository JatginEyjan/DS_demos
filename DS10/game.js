// DS10 Demo v3 - 双画面布局：房间主画面 + 网格小地图
// 修复：正确进入房间，迷雾地图

const game = {
    state: {
        phase: 'profession_select',
        currentRoute: null,
        turn: 0,
        maxTurns: 80,
        alertLevel: 0,
        selectedObject: null,
        gameOver: false,
        victory: false
    },
    
    investigator: null,
    
    // 路线网格定义 (x, y坐标)
    routeGrid: [
        // 第1层 (y=0)
        { id: 'entrance', name: '入口', type: 'start', x: 0, y: 0, visited: false },
        { id: 'sh1', name: '安全屋', type: 'safehouse', x: 1, y: 0, visited: false },
        { id: 'room1', name: '储藏室', type: 'room', x: 2, y: 0, roomId: 'storage', visited: false },
        { id: 'fork', name: '分叉点', type: 'fork', x: 3, y: 0, visited: false },
        
        // 上分支 (y=-1)
        { id: 'room2', name: '陷阱房', type: 'room', x: 4, y: -1, roomId: 'trap', visited: false, branch: 'upper' },
        { id: 'sh2', name: '偏厅', type: 'safehouse', x: 5, y: -1, visited: false, branch: 'upper' },
        
        // 下分支 (y=1)
        { id: 'room3', name: '守卫室', type: 'room', x: 4, y: 1, roomId: 'guard', visited: false, branch: 'lower' },
        { id: 'sh3', name: '侧室', type: 'safehouse', x: 5, y: 1, visited: false, branch: 'lower' },
        
        // 汇合
        { id: 'merge', name: '汇合点', type: 'merge', x: 6, y: 0, visited: false },
        { id: 'sh4', name: '2层安全屋', type: 'safehouse', x: 7, y: 0, visited: false },
        { id: 'boss', name: '仪式厅', type: 'boss', x: 8, y: 0, roomId: 'ritual', visited: false },
        { id: 'exit', name: '出口', type: 'exit', x: 9, y: 0, visited: false }
    ],
    
    // 连接关系
    connections: [
        ['entrance', 'sh1'],
        ['sh1', 'room1'],
        ['room1', 'fork'],
        ['fork', 'room2'],
        ['fork', 'room3'],
        ['room2', 'sh2'],
        ['room3', 'sh3'],
        ['sh2', 'merge'],
        ['sh3', 'merge'],
        ['merge', 'sh4'],
        ['sh4', 'boss'],
        ['boss', 'exit']
    ],
    
    rooms: {},
    
    professions: {
        archaeologist: { name: '考古学家', hp: 70, maxHp: 70, sanity: 80, maxSanity: 80, skills: { 侦查: 50, 力量: 30, 神秘学: 35 } },
        soldier: { name: '前军人', hp: 90, maxHp: 90, sanity: 60, maxSanity: 60, skills: { 侦查: 35, 力量: 55, 神秘学: 20 } },
        occultist: { name: '神秘学者', hp: 50, maxHp: 50, sanity: 60, maxSanity: 60, skills: { 侦查: 40, 力量: 20, 神秘学: 55 } }
    },
    
    init() {
        this.initRooms();
        this.log('系统', 'DS10 v3 - 双画面模式');
    },
    
    initRooms() {
        this.rooms = {
            storage: { id: 'storage', name: '储藏室', objects: null, cleared: false },
            trap: { id: 'trap', name: '陷阱房', objects: null, cleared: false },
            guard: { id: 'guard', name: '守卫室', objects: null, cleared: false },
            ritual: { id: 'ritual', name: '仪式厅', objects: null, cleared: false }
        };
    },
    
    selectProfession(key) {
        this.investigator = { ...this.professions[key], inventory: { food: 2, medicine: 1 } };
        document.getElementById('professionSelect').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        document.getElementById('gameUI').style.display = 'flex';
        this.startGame();
    },
    
    startGame() {
        this.state.currentRoute = 0;
        this.state.turn = 0;
        this.state.alertLevel = 0;
        this.routeGrid[0].visited = true;
        this.updateMainView();
        this.updateStatus();
    },
    
    // 获取当前节点
    getCurrentNode() {
        return this.routeGrid[this.state.currentRoute];
    },
    
    // 获取相邻节点
    getNeighbors(nodeId) {
        const neighbors = [];
        this.connections.forEach(([a, b]) => {
            if (a === nodeId) neighbors.push(b);
            if (b === nodeId) neighbors.push(a);
        });
        return neighbors.map(id => this.routeGrid.find(n => n.id === id));
    },
    
    // 更新主画面（房间或地图选择）
    updateMainView() {
        const node = this.getCurrentNode();
        
        // 检查是否是房间且未清理
        if ((node.type === 'room' || node.type === 'boss') && !node.cleared && !node.inCombat) {
            this.showRoomEntry(node);
        } else {
            this.showRouteView();
        }
    },
    
    // 显示房间入口选择
    showRoomEntry(node) {
        const content = document.getElementById('mainContent');
        document.getElementById('sceneTitle').textContent = node.name;
        document.getElementById('sceneSubtitle').textContent = '选择如何进入';
        
        content.innerHTML = `
            <div class="room-entry">
                <div class="entry-preview">
                    <div class="preview-icon">${node.type === 'boss' ? '☠️' : '📦'}</div>
                    <div class="preview-desc">
                        ${node.type === 'boss' ? '强大的敌人守卫着这里' : '可能有资源和危险'}
                    </div>
                </div>
                <div class="entry-actions">
                    <button class="action-btn large" onclick="game.enterRoomCombat('${node.roomId}')">
                        ⚔️ 进入战斗
                        <span class="skill-tag">消耗1回合，获得全部奖励</span>
                    </button>
                    <button class="action-btn large" onclick="game.bypassRoom()">
                        🚶 悄悄绕过
                        <span class="skill-tag">消耗2回合，无奖励无战斗</span>
                    </button>
                    <button class="action-btn large" onclick="game.moveToNeighbor()">
                        ⬅️ 返回
                        <span class="skill-tag">回到上一个位置</span>
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('actionPanel').style.display = 'none';
        this.updateMinimap();
    },
    
    // 显示路线选择视图
    showRouteView() {
        const node = this.getCurrentNode();
        const content = document.getElementById('mainContent');
        
        document.getElementById('sceneTitle').textContent = node.name;
        document.getElementById('sceneSubtitle').textContent = '选择前进方向';
        
        let html = '<div class="route-view">';
        
        // 获取可前往的邻居
        const neighbors = this.getNeighbors(node.id).filter(n => {
            // 只能去已访问的，或者是当前节点的直接邻居（前后）
            return n.visited || this.canAccess(node, n);
        });
        
        html += '<div class="direction-grid">';
        
        // 显示可用移动选项
        neighbors.forEach(neighbor => {
            let arrow = '';
            if (neighbor.x > node.x) arrow = '➡️';
            else if (neighbor.x < node.x) arrow = '⬅️';
            else if (neighbor.y < node.y) arrow = '⬆️';
            else if (neighbor.y > node.y) arrow = '⬇️';
            
            const visitedMark = neighbor.visited ? '✓' : '?';
            
            html += `
                <button class="direction-btn" onclick="game.moveToNode('${neighbor.id}')">
                    <div class="dir-arrow">${arrow}</div>
                    <div class="dir-name">${neighbor.name} ${visitedMark}</div>
                    <div class="dir-cost">1回合</div>
                </button>
            `;
        });
        
        // 安全屋特殊选项
        if (node.type === 'safehouse') {
            html += `
                <button class="direction-btn rest" onclick="game.restInSafehouse()">
                    <div class="dir-arrow">💤</div>
                    <div class="dir-name">休息恢复</div>
                    <div class="dir-cost">+HP/SAN</div>
                </button>
            `;
        }
        
        html += '</div></div>';
        
        content.innerHTML = html;
        document.getElementById('actionPanel').style.display = 'none';
        this.updateMinimap();
    },
    
    // 判断是否可以访问（相邻且已访问节点的邻居）
    canAccess(from, to) {
        // 简单规则：x相邻或y相邻且在同一层
        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    },
    
    // 进入房间战斗
    enterRoomCombat(roomId) {
        if (!this.consumeTurns(1)) return;
        
        const room = this.rooms[roomId];
        const node = this.getCurrentNode();
        node.inCombat = true;
        
        // 初始化房间对象
        if (!room.objects) {
            room.objects = this.createRoomObjects(roomId);
        }
        
        this.log('系统', `进入${room.name}，遭遇敌人！`);
        this.renderCombat(room);
    },
    
    // 创建房间对象
    createRoomObjects(roomId) {
        const objects = [];
        
        if (roomId === 'storage') {
            objects.push({
                id: 'chest', name: '宝箱', type: 'object', hp: null,
                actions: ['观察', '开锁', '破坏'],
                state: { opened: false }
            });
        } else if (roomId === 'trap') {
            objects.push(
                { id: 'trap', name: '陷阱', type: 'hazard', hp: null, actions: ['观察', '解除', '避开'] },
                { id: 'guard', name: '守卫', type: 'enemy', hp: 40, maxHp: 40, actions: ['攻击', '观察'] }
            );
        } else if (roomId === 'guard') {
            objects.push(
                { id: 'guard1', name: '深潜者', type: 'enemy', hp: 50, maxHp: 50, actions: ['攻击', '观察'] },
                { id: 'guard2', name: '深潜者', type: 'enemy', hp: 50, maxHp: 50, actions: ['攻击', '观察'] }
            );
        } else if (roomId === 'ritual') {
            objects.push(
                { id: 'boss', name: '邪教主教', type: 'boss', hp: 80, maxHp: 80, actions: ['攻击', '观察', '神秘学干扰'] },
                { id: 'ritual', name: '仪式', type: 'object', hp: null, actions: ['干扰', '观察'] }
            );
        }
        
        return objects;
    },
    
    // 渲染战斗画面
    renderCombat(room) {
        const content = document.getElementById('mainContent');
        document.getElementById('sceneTitle').textContent = room.name + ' - 战斗中';
        document.getElementById('sceneSubtitle').textContent = `回合 ${this.state.turn}`;
        
        let html = '<div class="combat-view">';
        
        // 敌人列表
        const enemies = room.objects.filter(o => o.type === 'enemy' || o.type === 'boss');
        if (enemies.length > 0) {
            html += '<div class="enemies-row">';
            enemies.forEach((enemy, idx) => {
                if (enemy.hp > 0) {
                    html += `
                        <div class="enemy-card" onclick="game.selectCombatTarget(${idx})">
                            <div class="enemy-icon">${enemy.type === 'boss' ? '☠️' : '👹'}</div>
                            <div class="enemy-name">${enemy.name}</div>
                            <div class="enemy-hp-bar"><div style="width:${(enemy.hp/enemy.maxHp)*100}%"></div></div>
                            <div class="enemy-hp-text">${enemy.hp}/${enemy.maxHp}</div>
                        </div>
                    `;
                }
            });
            html += '</div>';
        }
        
        // 环境对象
        const objects = room.objects.filter(o => o.type !== 'enemy' && o.type !== 'boss');
        if (objects.length > 0) {
            html += '<div class="objects-row">';
            objects.forEach(obj => {
                html += `
                    <div class="object-card" onclick="game.interactObject('${obj.id}')">
                        <div class="object-icon">📦</div>
                        <div class="object-name">${obj.name}</div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += '</div>';
        content.innerHTML = html;
        
        // 显示行动面板
        document.getElementById('actionPanel').style.display = 'block';
        this.updateCombatActions();
        this.updateMinimap();
    },
    
    // 更新战斗行动
    updateCombatActions() {
        const panel = document.getElementById('actionButtons');
        panel.innerHTML = '';
        
        const room = this.rooms[this.getCurrentNode().roomId];
        const hasEnemies = room.objects.some(o => (o.type === 'enemy' || o.type === 'boss') && o.hp > 0);
        
        if (hasEnemies) {
            panel.innerHTML += `
                <button class="action-btn" onclick="game.combatAttack()">⚔️ 攻击</button>
                <button class="action-btn" onclick="game.combatObserve()">👁️ 观察弱点</button>
            `;
        } else {
            panel.innerHTML += `
                <button class="action-btn" onclick="game.finishRoom()">✓ 完成探索</button>
            `;
        }
        
        panel.innerHTML += `
            <button class="action-btn" onclick="game.retreatFromRoom()">🏃 撤退</button>
        `;
    },
    
    // 战斗攻击
    combatAttack() {
        const room = this.rooms[this.getCurrentNode().roomId];
        const target = room.objects.find(o => (o.type === 'enemy' || o.type === 'boss') && o.hp > 0);
        if (!target) return;
        
        if (!this.consumeTurns(1)) return;
        
        const result = this.skillCheck(this.getSkill('力量'), target.type === 'boss' ? 50 : 40);
        
        if (result.success) {
            const dmg = result.critical ? 35 : 25;
            target.hp -= dmg;
            this.log('战斗', `对${target.name}造成${dmg}伤害！`);
            
            if (target.hp <= 0) {
                this.log('胜利', `${target.name}被击败了！`);
            }
        } else {
            const dmg = result.fumble ? 15 : 8;
            this.takeDamage(dmg);
            this.log('战斗', `攻击失败，受到${dmg}反击伤害！`);
        }
        
        this.checkCombatEnd();
    },
    
    // 观察弱点
    combatObserve() {
        if (!this.consumeTurns(1)) return;
        
        const result = this.skillCheck(this.getSkill('侦查'), 35);
        if (result.success) {
            this.log('侦查', '发现了敌人的弱点！下次攻击+10伤害');
        } else {
            this.log('侦查', '观察失败');
        }
    },
    
    // 检查战斗结束
    checkCombatEnd() {
        const room = this.rooms[this.getCurrentNode().roomId];
        const hasEnemies = room.objects.some(o => (o.type === 'enemy' || o.type === 'boss') && o.hp > 0);
        
        if (!hasEnemies) {
            this.log('系统', '所有敌人已被清理！');
        }
        
        this.renderCombat(room);
    },
    
    // 完成房间
    finishRoom() {
        const node = this.getCurrentNode();
        const room = this.rooms[node.roomId];
        
        node.cleared = true;
        node.inCombat = false;
        
        // 奖励
        if (node.roomId === 'storage') {
            this.log('奖励', '获得：古老钥匙 + 10金币');
        } else if (node.roomId === 'trap') {
            this.log('奖励', '获得：15金币');
        } else if (node.roomId === 'guard') {
            this.log('奖励', '获得：20金币 + 守卫徽章');
        } else if (node.roomId === 'ritual') {
            this.victory('副本通关！', '你阻止了仪式，拯救了世界！');
            return;
        }
        
        this.updateMainView();
    },
    
    // 撤退
    retreatFromRoom() {
        const node = this.getCurrentNode();
        node.inCombat = false;
        
        if (!this.consumeTurns(1)) return;
        
        this.log('系统', '从房间撤退');
        
        if (Math.random() < 0.3) {
            this.takeDamage(10);
            this.log('遭遇', '撤退时遭到追击！HP-10');
        }
        
        this.updateMainView();
    },
    
    // 绕过房间
    bypassRoom() {
        if (!this.consumeTurns(2)) return;
        
        const node = this.getCurrentNode();
        node.cleared = true; // 标记为已处理（但无奖励）
        
        this.log('系统', '悄悄绕过了房间');
        this.moveToNeighbor();
    },
    
    // 移动到节点
    moveToNode(nodeId) {
        if (!this.consumeTurns(1)) return;
        
        const targetIdx = this.routeGrid.findIndex(n => n.id === nodeId);
        if (targetIdx < 0) return;
        
        this.state.currentRoute = targetIdx;
        this.routeGrid[targetIdx].visited = true;
        
        this.log('移动', `到达${this.routeGrid[targetIdx].name}`);
        this.updateMainView();
        this.updateStatus();
    },
    
    // 返回到邻居
    moveToNeighbor() {
        // 自动返回上一个访问过的节点
        const current = this.getCurrentNode();
        const neighbors = this.getNeighbors(current.id);
        const prevNode = neighbors.find(n => n.visited && n.x < current.x);
        
        if (prevNode) {
            this.moveToNode(prevNode.id);
        }
    },
    
    // 安全屋休息
    restInSafehouse() {
        if (this.investigator.inventory.food > 0) {
            this.investigator.inventory.food--;
            const heal = Math.floor(this.investigator.maxHp * 0.3);
            this.investigator.hp = Math.min(this.investigator.maxHp, this.investigator.hp + heal);
            this.investigator.sanity = Math.min(this.investigator.maxSanity, this.investigator.sanity + 20);
            this.log('恢复', `休息完成，HP+${heal}，SAN+20`);
        } else {
            this.log('系统', '没有食物了！');
        }
        this.updateStatus();
    },
    
    // 更新小地图
    updateMinimap() {
        const minimap = document.getElementById('minimapContent');
        const current = this.getCurrentNode();
        
        // 计算显示范围
        const minX = Math.min(...this.routeGrid.map(n => n.x));
        const maxX = Math.max(...this.routeGrid.map(n => n.x));
        const minY = Math.min(...this.routeGrid.map(n => n.y));
        const maxY = Math.max(...this.routeGrid.map(n => n.y));
        
        let html = '<div class="grid-map">';
        
        for (let y = minY; y <= maxY; y++) {
            html += '<div class="grid-row">';
            for (let x = minX; x <= maxX; x++) {
                const node = this.routeGrid.find(n => n.x === x && n.y === y);
                
                if (!node) {
                    html += '<div class="grid-cell empty"></div>';
                    continue;
                }
                
                // 迷雾判断：只显示已访问的、当前位置、或与已访问相邻的
                const isVisible = node.visited || 
                                  node.id === current.id ||
                                  this.getNeighbors(node.id).some(n => n.visited);
                
                let cellClass = 'grid-cell';
                let content = '';
                
                if (node.id === current.id) {
                    cellClass += ' current';
                    content = '●';
                } else if (node.visited) {
                    cellClass += ' visited';
                    content = this.getNodeIcon(node.type);
                } else if (isVisible) {
                    cellClass += ' visible';
                    content = '?';
                } else {
                    cellClass += ' fog';
                    content = '';
                }
                
                html += `<div class="${cellClass}">${content}</div>`;
            }
            html += '</div>';
        }
        
        html += '</div>';
        html += `<div class="map-legend">图例: ●当前 ✓已访问 ?可探索 █迷雾</div>`;
        
        minimap.innerHTML = html;
    },
    
    getNodeIcon(type) {
        const icons = { start: 'S', safehouse: '★', room: '□', boss: 'B', fork: 'Y', merge: 'M', exit: 'E' };
        return icons[type] || '?';
    },
    
    // 工具函数
    consumeTurns(n) {
        this.state.turn += n;
        
        const newAlert = Math.floor(this.state.turn / 10);
        if (newAlert > this.state.alertLevel) {
            this.state.alertLevel = newAlert;
            this.log('警告', `警觉度提升至${newAlert}！敌人更强了！`);
        }
        
        if (this.state.turn >= this.state.maxTurns) {
            this.gameOver('回合耗尽，黑暗吞噬了一切...');
            return false;
        }
        return true;
    },
    
    getSkill(name) {
        let val = this.investigator.skills[name] || 0;
        val -= this.state.alertLevel * 3;
        return Math.max(5, val);
    },
    
    skillCheck(skill, diff) {
        const roll = Math.floor(Math.random() * 100) + 1;
        if (roll <= 5) return { success: true, critical: true, roll };
        if (roll >= 96) return { success: false, fumble: true, roll };
        return { success: roll <= skill, roll };
    },
    
    takeDamage(n) {
        this.investigator.hp -= n;
        if (this.investigator.hp <= 0) {
            this.gameOver('HP归零，调查员牺牲了...');
        }
    },
    
    updateStatus() {
        if (!this.investigator) return;
        document.getElementById('hpBar').style.width = (this.investigator.hp/this.investigator.maxHp*100) + '%';
        document.getElementById('hpText').textContent = `${this.investigator.hp}/${this.investigator.maxHp}`;
        document.getElementById('sanBar').style.width = (this.investigator.sanity/this.investigator.maxSanity*100) + '%';
        document.getElementById('sanText').textContent = `${this.investigator.sanity}/${this.investigator.maxSanity}`;
        document.getElementById('timeText').textContent = `${this.state.turn}/${this.state.maxTurns}`;
        if (this.state.turn > 60) {
            document.getElementById('timeText').style.color = '#e94560';
        }
    },
    
    log(type, msg) {
        const panel = document.getElementById('logPanel');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type === '战斗' || type === '失败' ? 'failure' : type === '胜利' || type === '奖励' ? 'success' : 'system'}`;
        entry.textContent = `[${this.state.turn}] ${msg}`;
        panel.appendChild(entry);
        panel.scrollTop = panel.scrollHeight;
    },
    
    gameOver(reason) {
        this.state.gameOver = true;
        this.showModal('游戏结束', reason, () => location.reload());
    },
    
    victory(title, msg) {
        this.state.victory = true;
        this.showModal(title, msg, () => location.reload());
    },
    
    showModal(title, text, onConfirm) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').textContent = text;
        document.getElementById('modal').classList.add('show');
        this.modalCallback = onConfirm;
    },
    
    closeModal() {
        document.getElementById('modal').classList.remove('show');
        if (this.modalCallback) {
            this.modalCallback();
            this.modalCallback = null;
        }
    }
};

game.init();