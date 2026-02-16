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
    
    // 判断是否可以访问（基于连接关系或相邻）
    canAccess(from, to) {
        // 检查是否有直接连接
        const hasConnection = this.connections.some(([a, b]) => {
            return (a === from.id && b === to.id) || (b === from.id && a === to.id);
        });
        if (hasConnection) return true;
        
        // 备用规则：x相邻或y相邻
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
    
    // 渲染战斗画面 - 新版：房间内容 + 交互选项分离
    renderCombat(room) {
        const content = document.getElementById('mainContent');
        document.getElementById('sceneTitle').textContent = room.name;
        document.getElementById('sceneSubtitle').textContent = `回合 ${this.state.turn} - 选择目标进行交互`;
        
        let html = '<div class="combat-view">';
        
        // 房间内容区域
        html += '<div class="room-content-section">';
        html += '<div class="section-title">📍 房间内容</div>';
        
        const aliveEnemies = room.objects.filter(o => (o.type === 'enemy' || o.type === 'boss') && o.hp > 0);
        const interactables = room.objects.filter(o => o.type !== 'enemy' && o.type !== 'boss');
        
        if (aliveEnemies.length === 0 && interactables.length === 0) {
            // 空房间
            html += '<div class="empty-room">🏚️ 空房间 - 没有任何东西</div>';
        } else {
            // 敌人列表
            if (aliveEnemies.length > 0) {
                html += '<div class="enemies-row">';
                aliveEnemies.forEach((enemy, idx) => {
                    const isSelected = this.state.selectedTarget && this.state.selectedTarget.id === enemy.id;
                    const selectedClass = isSelected ? 'selected' : '';
                    html += `
                        <div class="enemy-card ${selectedClass}" onclick="game.selectTarget('${enemy.id}')">
                            <div class="enemy-icon">${enemy.type === 'boss' ? '☠️' : '👹'}</div>
                            <div class="enemy-name">${enemy.name}</div>
                            <div class="enemy-hp-bar"><div style="width:${(enemy.hp/enemy.maxHp)*100}%"></div></div>
                            <div class="enemy-hp-text">${enemy.hp}/${enemy.maxHp}</div>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            // 可交互对象
            if (interactables.length > 0) {
                html += '<div class="objects-row">';
                interactables.forEach(obj => {
                    const isSelected = this.state.selectedTarget && this.state.selectedTarget.id === obj.id;
                    const selectedClass = isSelected ? 'selected' : '';
                    const icon = obj.type === 'hazard' ? '⚠️' : '📦';
                    html += `
                        <div class="object-card ${selectedClass}" onclick="game.selectTarget('${obj.id}')">
                            <div class="object-icon">${icon}</div>
                            <div class="object-name">${obj.name}</div>
                        </div>
                    `;
                });
                html += '</div>';
            }
        }
        
        html += '</div>'; // end room-content-section
        
        // 选中目标信息
        if (this.state.selectedTarget) {
            const target = this.state.selectedTarget;
            html += '<div class="target-info">';
            html += `<div class="target-name">🎯 选中: ${target.name}</div>`;
            if (target.type === 'enemy' || target.type === 'boss') {
                html += `<div class="target-desc">HP: ${target.hp}/${target.maxHp} | 类型: ${target.type === 'boss' ? 'Boss' : '敌人'}</div>`;
            } else {
                html += `<div class="target-desc">类型: ${target.type === 'hazard' ? '危险' : '物品'}</div>`;
            }
            html += '</div>';
        }
        
        html += '</div>'; // end combat-view
        content.innerHTML = html;
        
        // 显示行动面板（根据选中目标动态更新）
        document.getElementById('actionPanel').style.display = 'block';
        this.updateCombatActions();
        this.updateMinimap();
    },
    
    // 选择目标
    selectTarget(targetId) {
        const room = this.rooms[this.getCurrentNode().roomId];
        const target = room.objects.find(o => o.id === targetId);
        if (target) {
            this.state.selectedTarget = target;
            this.log('系统', `选中目标: ${target.name}`);
            this.renderCombat(room);
        }
    },
    
    // 更新战斗行动 - 根据选中目标显示不同选项
    updateCombatActions() {
        const panel = document.getElementById('actionButtons');
        panel.innerHTML = '';
        
        const room = this.rooms[this.getCurrentNode().roomId];
        const target = this.state.selectedTarget;
        
        if (target) {
            // 根据目标类型显示不同操作
            if (target.type === 'enemy' || target.type === 'boss') {
                panel.innerHTML += `
                    <button class="action-btn" onclick="game.combatAttack()">⚔️ 攻击</button>
                    <button class="action-btn" onclick="game.combatObserve()">👁️ 观察敌人</button>
                `;
            } else if (target.type === 'object') {
                // 物体交互选项
                if (target.id === 'chest') {
                    panel.innerHTML += `
                        <button class="action-btn" onclick="game.interactWithTarget('picklock')">🔓 开锁 (侦查)</button>
                        <button class="action-btn" onclick="game.interactWithTarget('break')">💥 破坏 (力量)</button>
                        <button class="action-btn" onclick="game.interactWithTarget('observe')">👁️ 观察 (侦查)</button>
                    `;
                } else if (target.id === 'ritual') {
                    panel.innerHTML += `
                        <button class="action-btn" onclick="game.interactWithTarget('disrupt')">✨ 神秘学干扰</button>
                        <button class="action-btn" onclick="game.interactWithTarget('observe')">👁️ 观察</button>
                    `;
                }
            } else if (target.type === 'hazard') {
                panel.innerHTML += `
                    <button class="action-btn" onclick="game.interactWithTarget('disarm')">🛠️ 解除 (侦查)</button>
                    <button class="action-btn" onclick="game.interactWithTarget('avoid')">🚶 避开 (侦查-10)</button>
                    <button class="action-btn" onclick="game.interactWithTarget('observe')">👁️ 观察</button>
                `;
            }
            
            panel.innerHTML += `
                <button class="action-btn" onclick="game.clearSelection()">❌ 取消选择</button>
            `;
        } else {
            // 没有选择目标时显示通用选项
            const hasEnemies = room.objects.some(o => (o.type === 'enemy' || o.type === 'boss') && o.hp > 0);
            const hasInteractables = room.objects.some(o => o.type !== 'enemy' && o.type !== 'boss');
            
            if (!hasEnemies && !hasInteractables) {
                // 空房间
                panel.innerHTML += `
                    <button class="action-btn" onclick="game.finishRoom()">✓ 离开房间</button>
                `;
            } else {
                panel.innerHTML += `
                    <div class="action-hint">👆 先点击上方房间内容选择目标</div>
                `;
            }
            
            panel.innerHTML += `
                <button class="action-btn" onclick="game.retreatFromRoom()">🏃 撤退</button>
            `;
        }
    },
    
    // 清除选择
    clearSelection() {
        this.state.selectedTarget = null;
        const room = this.rooms[this.getCurrentNode().roomId];
        this.renderCombat(room);
    },
    
    // 与选中目标交互
    interactWithTarget(action) {
        const target = this.state.selectedTarget;
        if (!target) return;
        
        if (!this.consumeTurns(1)) return;
        
        const room = this.rooms[this.getCurrentNode().roomId];
        
        switch(action) {
            case 'picklock':
                this.handleSkillCheck('侦查', 40, `尝试开锁`, () => {
                    this.log('✓ 成功', '咔嗒一声，宝箱打开了！');
                    this.log('🎁 获得', '古老钥匙 ×1、金币 ×10');
                    room.objects = room.objects.filter(o => o.id !== 'chest');
                    this.clearSelection();
                }, () => {
                    this.log('✗ 失败', '锁芯卡住了，宝箱无法打开');
                });
                break;
            case 'break':
                this.handleSkillCheck('力量', 35, `尝试破坏宝箱`, () => {
                    this.log('✓ 成功', '砰！宝箱被砸开了，但有些东西损坏了');
                    this.log('🎁 获得', '金币 ×5');
                    room.objects = room.objects.filter(o => o.id !== 'chest');
                    this.clearSelection();
                }, () => {
                    this.log('✗ 失败', '宝箱太坚固了，你的攻击毫无作用');
                });
                break;
            case 'disarm':
                this.handleSkillCheck('侦查', 45, `尝试解除陷阱`, () => {
                    this.log('✓ 成功', '你小心地解除了陷阱机制，安全了！');
                    room.objects = room.objects.filter(o => o.id !== 'trap');
                    this.clearSelection();
                }, () => {
                    this.log('💥 触发', '糟糕！你触发了陷阱！');
                    this.takeDamage(15);
                });
                break;
            case 'avoid':
                this.handleSkillCheck('侦查', 30, `尝试绕过陷阱`, () => {
                    this.log('✓ 成功', '你悄悄地从陷阱旁边绕了过去');
                }, () => {
                    this.log('💥 触发', '不小心踩到了触发器！');
                    this.takeDamage(10);
                });
                break;
            case 'disrupt':
                this.handleSkillCheck('神秘学', 50, `尝试干扰仪式`, () => {
                    this.log('✓ 成功', '你的神秘学知识干扰了仪式进行！');
                    const boss = room.objects.find(o => o.type === 'boss');
                    if (boss) {
                        boss.hp -= 20;
                        this.log('⚔️ 效果', `邪教主教受到反噬，HP-20！剩余 ${Math.max(0, boss.hp)}/${boss.maxHp}`);
                    }
                }, () => {
                    this.log('💀 反噬', '神秘能量反噬了你的精神！');
                    this.takeSanityDamage(10);
                });
                break;
            case 'observe':
                const diff = 30;
                const per = this.getSkill('侦查');
                this.log('行动', `仔细观察 ${target.name} (侦查 ${per} vs 难度 ${diff})`);
                const result = this.skillCheck(per, diff);
                this.log('检定', `掷骰: ${result.roll}`);
                if (result.success) {
                    if (target.type === 'enemy' || target.type === 'boss') {
                        this.log('✓ 发现', `${target.name} 的弱点在左侧！下次攻击+10伤害`);
                        this.log('ℹ️ 信息', `当前状态: HP ${target.hp}/${target.maxHp}`);
                    } else if (target.type === 'hazard') {
                        this.log('✓ 发现', `这是一个压力触发式陷阱，可以从侧面绕过`);
                    } else {
                        this.log('✓ 发现', `${target.name} 看起来可以被打开`);
                    }
                } else {
                    this.log('✗ 无果', '你没有发现任何有用的信息');
                }
                break;
        }
        
        this.checkCombatEnd();
        if (room.objects.length > 0) {
            this.renderCombat(room);
        }
    },
    
    // 处理技能检定 - 带详细反馈
    handleSkillCheck(skillName, difficulty, actionDesc, onSuccess, onFail) {
        const skillValue = this.getSkill(skillName);
        this.log('行动', `${actionDesc} (需要 ≤${difficulty}, 技能 ${skillValue})`);
        
        const result = this.skillCheck(skillValue, difficulty);
        this.log('检定', `掷骰: ${result.roll} → ${result.success ? '成功' : '失败'}`);
        
        if (result.success) {
            if (result.critical) {
                this.log('⭐ 大成功', '完美的执行！效果翻倍！');
            } else {
                this.log('✓ 成功', '行动顺利完成');
            }
            onSuccess();
        } else {
            if (result.fumble) {
                this.log('💀 大失败', '灾难性的失误！');
            } else {
                this.log('✗ 失败', '行动未能达成目标');
            }
            onFail();
        }
    },
    
    // 战斗攻击 - 对选中目标
    combatAttack() {
        const target = this.state.selectedTarget;
        if (!target || (target.type !== 'enemy' && target.type !== 'boss')) {
            this.log('系统', '请先选择一个敌人');
            return;
        }
        
        if (target.hp <= 0) {
            this.log('系统', '该目标已被击败');
            return;
        }
        
        if (!this.consumeTurns(1)) return;
        
        const str = this.getSkill('力量');
        const difficulty = target.type === 'boss' ? 50 : 40;
        
        this.log('行动', `攻击 ${target.name} (力量 ${str} vs 难度 ${difficulty})`);
        
        const result = this.skillCheck(str, difficulty);
        this.log('检定', `掷骰: ${result.roll} → ${result.success ? '命中！' : '未命中！'}`);
        
        if (result.success) {
            const dmg = result.critical ? 35 : 25;
            target.hp -= dmg;
            this.log('⚔️ 命中', `造成 ${dmg} 点伤害！${target.name} 剩余 HP: ${Math.max(0, target.hp)}/${target.maxHp}`);
            
            if (target.hp <= 0) {
                this.log('🏆 击败', `${target.name} 被彻底消灭了！`);
                this.clearSelection();
            }
        } else {
            const dmg = result.fumble ? 15 : 8;
            this.takeDamage(dmg);
            if (result.fumble) {
                this.log('💀 大失败', `攻击失误！受到 ${dmg} 点反击伤害！`);
            } else {
                this.log('🛡️ 未命中', `攻击被闪避，受到 ${dmg} 点反击伤害`);
            }
        }
        
        this.checkCombatEnd();
    },
    
    // 观察敌人 - 对选中目标
    combatObserve() {
        if (!this.consumeTurns(1)) return;
        
        const target = this.state.selectedTarget;
        const per = this.getSkill('侦查');
        const difficulty = target && target.type === 'boss' ? 45 : 35;
        
        this.log('行动', `观察 ${target ? target.name : '周围环境'} (侦查 ${per} vs 难度 ${difficulty})`);
        
        const result = this.skillCheck(per, difficulty);
        this.log('检定', `掷骰: ${result.roll} → ${result.success ? '发现线索！' : '未发现异常'}`);
        
        if (result.success) {
            if (target && (target.type === 'enemy' || target.type === 'boss')) {
                this.log('✓ 侦查', `发现 ${target.name} 的弱点！下次攻击+10伤害，当前 HP: ${target.hp}/${target.maxHp}`);
            } else if (target) {
                this.log('✓ 侦查', `发现 ${target.name} 的隐藏细节`);
            } else {
                this.log('✓ 侦查', '发现了房间中的重要线索');
            }
        } else {
            this.log('✗ 侦查', '观察失败，没有发现有用信息');
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
        const mobileMap = document.getElementById('mobileMapContent');
        
        const mapHTML = this.generateMapHTML();
        
        // 桌面端侧边地图
        if (minimap) {
            minimap.innerHTML = mapHTML.desktop;
        }
        
        // 手机端弹窗地图
        if (mobileMap) {
            mobileMap.innerHTML = mapHTML.mobile;
        }
    },
    
    // 生成地图HTML
    generateMapHTML() {
        const current = this.getCurrentNode();
        
        // 计算显示范围
        const minX = Math.min(...this.routeGrid.map(n => n.x));
        const maxX = Math.max(...this.routeGrid.map(n => n.x));
        const minY = Math.min(...this.routeGrid.map(n => n.y));
        const maxY = Math.max(...this.routeGrid.map(n => n.y));
        
        // 桌面端地图（带图例）
        let desktopHTML = '<div class="grid-map">';
        for (let y = minY; y <= maxY; y++) {
            desktopHTML += '<div class="grid-row">';
            for (let x = minX; x <= maxX; x++) {
                desktopHTML += this.getCellHTML(x, y, current);
            }
            desktopHTML += '</div>';
        }
        desktopHTML += '</div>';
        desktopHTML += `<div class="map-legend">图例: ●当前 ✓已访问 ?可探索 █迷雾</div>`;
        
        // 手机端地图（更大格子，无图例）
        let mobileHTML = '<div class="grid-map" style="gap:5px;">';
        for (let y = minY; y <= maxY; y++) {
            mobileHTML += '<div class="grid-row" style="gap:5px;">';
            for (let x = minX; x <= maxX; x++) {
                const node = this.routeGrid.find(n => n.x === x && n.y === y);
                if (!node) {
                    mobileHTML += '<div style="width:32px;height:32px;"></div>';
                    continue;
                }
                
                const isVisible = node.visited || node.id === current.id ||
                                  this.getNeighbors(node.id).some(n => n.visited);
                
                let style = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;border-radius:4px;';
                let content = '';
                
                if (node.id === current.id) {
                    style += 'background:#e94560;color:white;font-weight:bold;';
                    content = '●';
                } else if (node.visited) {
                    style += 'background:#27ae60;color:white;';
                    content = '✓';
                } else if (isVisible) {
                    style += 'background:#3a3a4a;color:#aaa;border:1px solid #555;';
                    content = '?';
                } else {
                    style += 'background:#0a0a0f;border:1px solid #1a1a2a;';
                }
                
                mobileHTML += `<div style="${style}">${content}</div>`;
            }
            mobileHTML += '</div>';
        }
        mobileHTML += '</div>';
        
        return { desktop: desktopHTML, mobile: mobileHTML };
    },
    
    // 获取格子HTML
    getCellHTML(x, y, current) {
        const node = this.routeGrid.find(n => n.x === x && n.y === y);
        
        if (!node) {
            return '<div class="grid-cell empty"></div>';
        }
        
        const isVisible = node.visited || node.id === current.id ||
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
        
        return `<div class="${cellClass}">${content}</div>`;
    },
    
    // 显示手机地图
    showMobileMap() {
        const modal = document.getElementById('mobileMapModal');
        if (modal) {
            this.updateMinimap(); // 确保内容最新
            modal.classList.add('show');
        }
    },
    
    // 隐藏手机地图
    hideMobileMap() {
        const modal = document.getElementById('mobileMapModal');
        if (modal) {
            modal.classList.remove('show');
        }
    },
    
    getNodeIcon(type) {
        const icons = { start: 'S', safehouse: '★', room: '□', boss: 'B', fork: 'Y', merge: 'M', exit: 'E' };
        return icons[type] || '?';
    },
    
    // 工具函数
    consumeTurns(n) {
        const oldTurn = this.state.turn;
        this.state.turn += n;
        
        // 显示回合消耗
        this.log('⏱️ 时间', `消耗 ${n} 回合 (${oldTurn} → ${this.state.turn}/${this.state.maxTurns})`);
        
        // 更新状态栏
        this.updateStatus();
        
        // 检查警觉度变化
        const newAlert = Math.floor(this.state.turn / 10);
        if (newAlert > this.state.alertLevel) {
            this.state.alertLevel = newAlert;
            this.log('⚠️ 警告', `警觉度提升至 ${newAlert}！敌人变得更强了！`);
        }
        
        // 检查回合耗尽
        if (this.state.turn >= this.state.maxTurns) {
            this.gameOver('回合耗尽，黑暗吞噬了一切...');
            return false;
        }
        
        // 每10回合提示剩余
        if (this.state.turn % 10 === 0 && this.state.turn > 0) {
            const remaining = this.state.maxTurns - this.state.turn;
            this.log('⏱️ 提醒', `剩余 ${remaining} 回合，请抓紧时间`);
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
        const oldHp = this.investigator.hp;
        this.investigator.hp = Math.max(0, this.investigator.hp - n);
        this.log('💔 伤害', `HP ${oldHp} → ${this.investigator.hp} (-${n})`);
        this.updateStatus();
        if (this.investigator.hp <= 0) {
            this.gameOver('HP归零，调查员牺牲了...');
        }
    },
    
    takeSanityDamage(n) {
        const oldSan = this.investigator.sanity;
        this.investigator.sanity = Math.max(0, this.investigator.sanity - n);
        this.log('🌀 理智', `SAN ${oldSan} → ${this.investigator.sanity} (-${n})`);
        this.updateStatus();
        if (this.investigator.sanity <= 0) {
            this.gameOver('SAN归零，调查员陷入疯狂...');
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
        
        // 根据类型设置CSS类
        let className = 'system';
        if (type.includes('成功') || type.includes('胜利') || type === '🏆 击败' || type === '✓ 成功') {
            className = 'success';
        } else if (type.includes('失败') || type.includes('伤害') || type === '💀 大失败' || type === '✗ 失败' || type === '🛡️ 未命中' || type === '💥 触发') {
            className = 'failure';
        } else if (type.includes('理智') || type === '💀 反噬') {
            className = 'sanity';
        } else if (type.includes('战斗') || type === '⚔️ 命中' || type === '⚔️ 效果') {
            className = 'combat';
        } else if (type.includes('获得') || type === '🎁 获得' || type.includes('奖励')) {
            className = 'reward';
        } else if (type.includes('伤害') || type === '伤害') {
            className = 'damage';
        }
        
        entry.className = `log-entry ${className}`;
        entry.textContent = `[${this.state.turn}] ${type}: ${msg}`;
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