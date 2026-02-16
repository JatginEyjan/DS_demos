// DS10 Demo v2 - 路线式地图 + 回合计数
// 核心改动：线性探索 + 回合消耗 + 递增风险

const game = {
    // 游戏状态
    state: {
        phase: 'profession_select',
        currentRoute: null,      // 当前路线位置
        turn: 0,                 // 全局回合数
        maxTurns: 80,            // 最大回合数
        alertLevel: 0,           // 警觉度（每10回合+1）
        selectedObject: null,
        gameOver: false,
        victory: false,
        logHistory: []           // 记录历史
    },
    
    // 调查员
    investigator: null,
    
    // 路线定义（线性结构）
    route: [
        { id: 'entrance', name: '遗迹入口', type: 'start', x: 0, y: 0 },
        { id: 'sh1', name: '第1层安全屋', type: 'safehouse', x: 1, y: 0 },
        { id: 'room1', name: '储藏室', type: 'room', x: 2, y: 0, roomId: 'storage' },
        { 
            id: 'fork1', name: '走廊分叉', type: 'fork', x: 3, y: 0,
            branches: [
                { id: 'upper', name: '上走廊', target: 'room2', risk: 'high', reward: 'high' },
                { id: 'lower', name: '下走廊', target: 'room3', risk: 'low', reward: 'low' }
            ]
        },
        // 上分支
        { id: 'room2', name: '陷阱房', type: 'room', x: 4, y: -1, roomId: 'trap', branch: 'upper' },
        { id: 'sh2_upper', name: '偏厅安全屋', type: 'safehouse', x: 5, y: -1 },
        // 下分支
        { id: 'room3', name: '守卫室', type: 'room', x: 4, y: 1, roomId: 'guard', branch: 'lower' },
        { id: 'sh2_lower', name: '侧室安全屋', type: 'safehouse', x: 5, y: 1 },
        // 汇合
        { id: 'merge', name: '主通道', type: 'merge', x: 6, y: 0 },
        { id: 'sh3', name: '第2层安全屋', type: 'safehouse', x: 7, y: 0 },
        { id: 'boss', name: '仪式厅', type: 'boss', x: 8, y: 0, roomId: 'ritual' },
        { id: 'exit', name: '撤离点', type: 'exit', x: 9, y: 0 }
    ],
    
    // 房间数据
    rooms: {},
    
    // 职业模板
    professions: {
        archaeologist: {
            name: '考古学家',
            hp: 70, maxHp: 70,
            sanity: 80, maxSanity: 80,
            skills: { 侦查: 50, 力量: 30, 神秘学: 35 },
            traits: ['敏锐直觉', '考古知识']
        },
        soldier: {
            name: '前军人',
            hp: 90, maxHp: 90,
            sanity: 60, maxSanity: 60,
            skills: { 侦查: 35, 力量: 55, 神秘学: 20 },
            traits: ['战术训练', '肾上腺素']
        },
        occultist: {
            name: '神秘学者',
            hp: 50, maxHp: 50,
            sanity: 60, maxSanity: 60,
            skills: { 侦查: 40, 力量: 20, 神秘学: 55 },
            traits: ['魔法感知', '疯狂边缘']
        }
    },
    
    // 初始化
    init() {
        this.initRooms();
        this.log('系统', 'DS10 Demo v2 - 路线探索模式');
    },
    
    // 初始化房间
    initRooms() {
        this.rooms = {
            storage: this.createStorageRoom(),
            trap: this.createTrapRoom(),
            guard: this.createGuardRoom(),
            ritual: this.createBossRoom()
        };
    },
    
    // 选择职业
    selectProfession(professionKey) {
        const template = this.professions[professionKey];
        this.investigator = {
            ...template,
            inventory: { food: 2, medicine: 1, ammo: 6 }
        };
        
        document.getElementById('professionSelect').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        document.getElementById('gameUI').style.display = 'flex';
        
        this.log('系统', `${this.investigator.name}准备进入遗迹...`);
        this.startDungeon();
    },
    
    // 开始副本
    startDungeon() {
        this.state.currentRoute = 0; // 从入口开始
        this.state.turn = 0;
        this.state.alertLevel = 0;
        this.renderRoute();
        this.updateStatus();
    },
    
    // 渲染路线地图
    renderRoute() {
        const current = this.route[this.state.currentRoute];
        const content = document.getElementById('gameContent');
        
        document.getElementById('sceneTitle').textContent = '路线选择';
        document.getElementById('sceneSubtitle').textContent = `当前位置: ${current.name}`;
        
        // 渲染路线地图
        let html = '<div class="route-map">';
        
        // 路线可视化
        html += '<div class="route-path">';
        
        // 显示前后各2个节点
        const startIdx = Math.max(0, this.state.currentRoute - 2);
        const endIdx = Math.min(this.route.length - 1, this.state.currentRoute + 3);
        
        for (let i = startIdx; i <= endIdx; i++) {
            const node = this.route[i];
            const isCurrent = i === this.state.currentRoute;
            const isPast = i < this.state.currentRoute;
            const isFuture = i > this.state.currentRoute;
            
            let statusClass = '';
            let icon = '';
            
            if (isCurrent) {
                statusClass = 'current';
                icon = '●';
            } else if (isPast) {
                statusClass = 'past';
                icon = '✓';
            } else {
                statusClass = 'future';
                icon = this.getNodeIcon(node.type);
            }
            
            html += `
                <div class="route-node ${statusClass} ${node.type}">
                    <div class="node-icon">${icon}</div>
                    <div class="node-name">${node.name}</div>
                    ${isFuture ? `<div class="node-turn">?回合</div>` : ''}
                </div>
            `;
            
            if (i < endIdx) {
                html += '<div class="route-arrow">→</div>';
            }
        }
        
        html += '</div>';
        
        // 可用行动
        html += '<div class="route-actions">';
        html += '<div class="action-title">选择行动</div>';
        html += '<div class="action-grid">';
        
        // 根据当前节点类型显示不同行动
        if (current.type === 'safehouse') {
            html += this.getSafehouseActions();
        } else if (current.type === 'room' || current.type === 'boss') {
            html += this.getRoomEntryActions(current);
        } else if (current.type === 'fork') {
            html += this.getForkActions(current);
        } else if (current.type === 'start' || current.type === 'merge') {
            html += this.getMoveActions();
        }
        
        // 侦察选项（如果不是在安全屋或战斗中）
        if (!['safehouse', 'boss'].includes(current.type)) {
            html += `
                <button class="action-btn" onclick="game.scoutAhead()">
                    🔍 侦察前方
                    <span class="skill-tag">消耗1回合，了解前方房间</span>
                </button>
            `;
        }
        
        html += '</div></div>';
        html += '</div>';
        
        content.innerHTML = html;
        document.getElementById('actionPanel').style.display = 'none';
    },
    
    // 获取节点图标
    getNodeIcon(type) {
        const icons = {
            start: '🚪',
            safehouse: '★',
            room: '?',
            fork: '⚡',
            merge: '🔀',
            boss: '☠️',
            exit: '🏃'
        };
        return icons[type] || '?';
    },
    
    // 安全屋行动
    getSafehouseActions() {
        return `
            <button class="action-btn" onclick="game.restInSafehouse('eat')">
                🍞 进食 (+30% HP)
                <span class="skill-tag">消耗1食物，1回合</span>
            </button>
            <button class="action-btn" onclick="game.restInSafehouse('sleep')">
                💤 冥想 (+20 SAN)
                <span class="skill-tag">消耗1回合</span>
            </button>
            <button class="action-btn" onclick="game.moveForward()">
                ➡️ 前进
                <span class="skill-tag">消耗1回合</span>
            </button>
            <button class="action-btn" onclick="game.moveBackward()">
                ⬅️ 后退
                <span class="skill-tag">消耗1回合，可能遇敌</span>
            </button>
        `;
    },
    
    // 房间进入行动
    getRoomEntryActions(node) {
        const room = this.rooms[node.roomId];
        const riskText = this.getRiskText(room);
        
        return `
            <button class="action-btn" onclick="game.enterRoom('${node.roomId}')">
                ⚔️ 进入战斗
                <span class="skill-tag">消耗1回合，${riskText}</span>
            </button>
            <button class="action-btn" onclick="game.bypassRoom()">
                🚶 绕道
                <span class="skill-tag">消耗2回合，无奖励</span>
            </button>
            <button class="action-btn" onclick="game.moveBackward()">
                ⬅️ 后退
                <span class="skill-tag">返回安全屋</span>
            </button>
        `;
    },
    
    // 分叉点行动
    getForkActions(node) {
        let html = '';
        node.branches.forEach(branch => {
            html += `
                <button class="action-btn" onclick="game.takeBranch('${branch.id}')">
                    ${branch.id === 'upper' ? '⬆️' : '⬇️'} ${branch.name}
                    <span class="skill-tag">风险:${branch.risk} 奖励:${branch.reward}</span>
                </button>
            `;
        });
        html += `
            <button class="action-btn" onclick="game.moveBackward()">
                ⬅️ 后退
                <span class="skill-tag">返回上一层</span>
            </button>
        `;
        return html;
    },
    
    // 移动行动
    getMoveActions() {
        return `
            <button class="action-btn" onclick="game.moveForward()">
                ➡️ 前进
                <span class="skill-tag">消耗1回合</span>
            </button>
            ${this.state.currentRoute > 0 ? `
            <button class="action-btn" onclick="game.moveBackward()">
                ⬅️ 后退
                <span class="skill-tag">消耗1回合，可能遇敌</span>
            </button>
            ` : ''}
        `;
    },
    
    // 获取风险文本
    getRiskText(room) {
        const enemyCount = room.objects.filter(o => o.type === 'monster' || o.type === 'boss').length;
        if (enemyCount >= 2) return '高难度';
        if (enemyCount === 1) return '中等难度';
        return '低风险';
    },
    
    // 消耗回合
    consumeTurns(amount = 1) {
        this.state.turn += amount;
        
        // 检查警觉度提升
        const newAlertLevel = Math.floor(this.state.turn / 10);
        if (newAlertLevel > this.state.alertLevel) {
            this.state.alertLevel = newAlertLevel;
            this.log('警告', `警觉度提升！敌人变得更加危险（等级${this.state.alertLevel}）`);
        }
        
        // 检查回合限制
        if (this.state.turn >= this.state.maxTurns) {
            this.gameOver('回合耗尽，遗迹中的存在注意到了你...');
            return false;
        }
        
        this.updateStatus();
        return true;
    },
    
    // 移动：前进
    moveForward() {
        if (!this.consumeTurns(1)) return;
        
        const nextIdx = this.state.currentRoute + 1;
        if (nextIdx >= this.route.length) {
            this.victory('成功逃离遗迹！', '你找到了出口，带着战利品安全撤离。');
            return;
        }
        
        this.state.currentRoute = nextIdx;
        const nextNode = this.route[nextIdx];
        
        this.log('系统', `前进到 ${nextNode.name}（回合 ${this.state.turn}/${this.state.maxTurns}）`);
        
        // 随机遭遇（后退时概率更高）
        if (Math.random() < 0.1 + (this.state.alertLevel * 0.05)) {
            this.randomEncounter();
        } else {
            this.renderRoute();
        }
    },
    
    // 移动：后退
    moveBackward() {
        // 后退有额外风险
        const encounterChance = 0.2 + (this.state.alertLevel * 0.1);
        
        if (!this.consumeTurns(1)) return;
        
        const prevIdx = this.state.currentRoute - 1;
        if (prevIdx < 0) {
            this.log('系统', '无法后退，已经在最前方');
            return;
        }
        
        this.state.currentRoute = prevIdx;
        const prevNode = this.route[prevIdx];
        
        this.log('系统', `后退到 ${prevNode.name}（回合 ${this.state.turn}/${this.state.maxTurns}）`);
        
        // 后退更容易遇敌
        if (Math.random() < encounterChance) {
            this.randomEncounter(true); // true表示是撤退遭遇
        } else {
            this.renderRoute();
        }
    },
    
    // 选择分支
    takeBranch(branchId) {
        if (!this.consumeTurns(1)) return;
        
        // 找到对应分支的房间
        const branchRoom = this.route.find(r => r.branch === branchId && r.x === 4);
        if (branchRoom) {
            const roomIdx = this.route.indexOf(branchRoom);
            this.state.currentRoute = roomIdx;
            this.log('系统', `选择了${branchId === 'upper' ? '上' : '下'}走廊`);
            this.renderRoute();
        }
    },
    
    // 侦察前方
    scoutAhead() {
        if (!this.consumeTurns(1)) return;
        
        const nextIdx = this.state.currentRoute + 1;
        if (nextIdx >= this.route.length) {
            this.log('系统', '前方没有路了');
            return;
        }
        
        const nextNode = this.route[nextIdx];
        let info = '';
        
        if (nextNode.type === 'room' || nextNode.type === 'boss') {
            const room = this.rooms[nextNode.roomId];
            const enemies = room.objects.filter(o => o.type === 'monster' || o.type === 'boss');
            info = `发现${enemies.length}个敌人，`;
            info += this.getRiskText(room);
        } else if (nextNode.type === 'safehouse') {
            info = '安全区域，可以恢复';
        } else if (nextNode.type === 'fork') {
            info = `分叉路口，有${nextNode.branches.length}条路可选`;
        }
        
        this.log('侦查', `侦察结果：${nextNode.name} - ${info}`);
        
        // 高侦察技能可能获得额外信息
        if (this.skillCheck(this.getEffectiveSkill('侦查'), 40).success) {
            this.log('侦查', '你发现了一些细节：敌人似乎没有察觉到你的存在');
        }
    },
    
    // 随机遭遇
    randomEncounter(isRetreat = false) {
        const enemies = ['深潜者', '邪教徒', '疯狂调查员', '阴影生物'];
        const enemy = enemies[Math.floor(Math.random() * enemies.length)];
        
        this.log('遭遇', `${isRetreat ? '撤退时' : '前进中'}遭遇了${enemy}！`);
        
        // 简化遭遇：直接战斗检定
        const diff = 40 + (this.state.alertLevel * 5);
        const result = this.skillCheck(this.getEffectiveSkill('力量'), diff);
        
        if (result.success) {
            this.log('成功', `你击退了${enemy}！`);
        } else {
            const damage = 10 + (this.state.alertLevel * 3);
            this.takeDamage(damage);
            this.log('失败', `${enemy}攻击了你！HP-${damage}`);
        }
        
        this.renderRoute();
    },
    
    // 进入房间战斗
    enterRoom(roomId) {
        if (!this.consumeTurns(1)) return;
        
        this.state.phase = 'room';
        this.state.currentRoomId = roomId;
        const room = this.rooms[roomId];
        
        // 重置房间状态（如果是新进入）
        if (!room.visited) {
            room.objects = room.createObjects();
            room.visited = true;
        }
        
        this.log('系统', `进入${room.name}，开始战斗！`);
        this.renderRoom(room);
    },
    
    // 绕道
    bypassRoom() {
        if (!this.consumeTurns(2)) return;
        
        this.log('系统', '你小心翼翼地绕过了这个房间，没有触发任何遭遇');
        
        // 跳到汇合点或下一个节点
        const current = this.route[this.state.currentRoute];
        let nextIdx = this.state.currentRoute + 1;
        
        // 如果是分支房间，跳到汇合点
        if (current.branch) {
            const mergeIdx = this.route.findIndex(r => r.id === 'merge');
            if (mergeIdx > 0) nextIdx = mergeIdx;
        }
        
        this.state.currentRoute = nextIdx;
        this.renderRoute();
    },
    
    // 安全屋休息
    restInSafehouse(type) {
        if (type === 'eat') {
            if (this.investigator.inventory.food <= 0) {
                this.log('系统', '没有食物了！');
                return;
            }
            if (!this.consumeTurns(1)) return;
            
            this.investigator.inventory.food--;
            const heal = Math.floor(this.investigator.maxHp * 0.3);
            this.investigator.hp = Math.min(this.investigator.maxHp, this.investigator.hp + heal);
            this.log('恢复', `进食休息，恢复${heal} HP（回合 ${this.state.turn}）`);
        } else if (type === 'sleep') {
            if (!this.consumeTurns(1)) return;
            
            this.investigator.sanity = Math.min(this.investigator.maxSanity, this.investigator.sanity + 20);
            this.log('恢复', `冥想休息，恢复20 SAN（回合 ${this.state.turn}）`);
        }
        
        this.updateStatus();
    },
    
    // 渲染房间战斗
    renderRoom(room) {
        const content = document.getElementById('gameContent');
        
        document.getElementById('sceneTitle').textContent = room.name;
        document.getElementById('sceneSubtitle').textContent = `回合 ${this.state.turn}/${this.state.maxTurns} | 警觉度 ${this.state.alertLevel}`;
        
        let html = '<div class="room-combat">';
        
        // 敌人列表
        html += '<div class="enemies-list">';
        room.objects.forEach((obj, idx) => {
            if (obj.type === 'monster' || obj.type === 'boss') {
                html += `
                    <div class="enemy-card ${obj.state.hp <= 0 ? 'defeated' : ''}" onclick="game.selectEnemy(${idx})">
                        <div class="enemy-icon">${obj.type === 'boss' ? '☠️' : '👹'}</div>
                        <div class="enemy-name">${obj.name}</div>
                        <div class="enemy-hp">HP: ${obj.state.hp}/${obj.state.maxHp}</div>
                    </div>
                `;
            }
        });
        html += '</div>';
        
        // 对象列表（非敌人）
        const objects = room.objects.filter(o => o.type !== 'monster' && o.type !== 'boss');
        if (objects.length > 0) {
            html += '<div class="objects-list">';
            objects.forEach((obj, idx) => {
                html += `
                    <div class="object-card" onclick="game.selectObjectInRoom(${idx})">
                        <div class="object-icon">${obj.icon || '📦'}</div>
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
        this.updateRoomActions(room);
    },
    
    // 更新房间行动
    updateRoomActions(room) {
        const buttonsDiv = document.getElementById('actionButtons');
        buttonsDiv.innerHTML = '';
        
        // 战斗行动
        const hasEnemies = room.objects.some(o => (o.type === 'monster' || o.type === 'boss') && o.state.hp > 0);
        
        if (hasEnemies) {
            buttonsDiv.innerHTML += `
                <button class="action-btn" onclick="game.combatAction('attack')">
                    ⚔️ 攻击
                    <span class="skill-tag">力量检定</span>
                </button>
                <button class="action-btn" onclick="game.combatAction('observe')">
                    👁️ 观察弱点
                    <span class="skill-tag">侦查检定</span>
                </button>
            `;
        } else {
            // 清理完毕
            buttonsDiv.innerHTML += `
                <button class="action-btn" onclick="game.finishRoom()">
                    ✓ 完成探索
                    <span class="skill-tag">返回路线</span>
                </button>
            `;
        }
        
        // 特殊行动
        buttonsDiv.innerHTML += `
            <button class="action-btn" onclick="game.combatAction('retreat')">
                🏃 撤退
                <span class="skill-tag">消耗1回合，可能遇袭</span>
            </button>
        `;
    },
    
    // 战斗行动
    combatAction(action) {
        const room = this.rooms[this.state.currentRoomId];
        
        if (action === 'attack') {
            // 简化：攻击第一个存活的敌人
            const target = room.objects.find(o => (o.type === 'monster' || o.type === 'boss') && o.state.hp > 0);
            if (!target) return;
            
            if (!this.consumeTurns(1)) return;
            
            const diff = target.type === 'boss' ? 50 : 40;
            const result = this.skillCheck(this.getEffectiveSkill('力量'), diff - (this.state.alertLevel * 2));
            
            if (result.success) {
                const damage = result.critical ? 40 : 25;
                target.state.hp -= damage;
                this.log('战斗', `命中${target.name}！造成${damage}伤害`);
                
                if (target.state.hp <= 0) {
                    this.log('胜利', `${target.name}被击败了！`);
                    if (target.type === 'boss') {
                        this.getReward(room);
                    }
                }
            } else {
                const damage = result.fumble ? 15 : 8;
                this.takeDamage(damage);
                this.log('战斗', `攻击失败，反受${damage}伤害！`);
            }
        } else if (action === 'observe') {
            if (!this.consumeTurns(1)) return;
            
            const result = this.skillCheck(this.getEffectiveSkill('侦查'), 35);
            if (result.success) {
                this.log('侦查', '你发现了敌人的弱点！下次攻击+10伤害');
            } else {
                this.log('侦查', '观察失败，浪费时间');
            }
        } else if (action === 'retreat') {
            if (!this.consumeTurns(1)) return;
            
            this.state.phase = 'route';
            this.log('系统', '从房间撤退...');
            
            // 撤退遇袭概率
            if (Math.random() < 0.3) {
                this.randomEncounter(true);
            } else {
                this.renderRoute();
            }
            return;
        }
        
        this.renderRoom(room);
        this.updateStatus();
    },
    
    // 完成房间
    finishRoom() {
        const room = this.rooms[this.state.currentRoomId];
        this.getReward(room);
        
        this.state.phase = 'route';
        
        // 标记为已清理
        const routeNode = this.route[this.state.currentRoute];
        if (routeNode) routeNode.cleared = true;
        
        // 移动到下一个节点
        let nextIdx = this.state.currentRoute + 1;
        if (routeNode.branch) {
            // 分支房间清理后跳到汇合点
            const mergeIdx = this.route.findIndex(r => r.id === 'merge');
            if (mergeIdx > 0) nextIdx = mergeIdx;
        }
        
        this.state.currentRoute = Math.min(nextIdx, this.route.length - 1);
        this.renderRoute();
    },
    
    // 获取奖励
    getReward(room) {
        let rewards = [];
        
        if (room.id === 'storage') {
            rewards.push('古老钥匙');
            rewards.push('10金币');
        } else if (room.id === 'trap') {
            rewards.push('陷阱解除报告');
            rewards.push('15金币');
        } else if (room.id === 'guard') {
            rewards.push('守卫徽章');
            rewards.push('20金币');
        } else if (room.id === 'ritual') {
            this.victory('副本通关！', `你阻止了仪式，剩余${this.state.maxTurns - this.state.turn}回合。获得大量奖励！`);
            return;
        }
        
        this.log('奖励', `获得：${rewards.join('、')}`);
    },
    
    // 工具函数（从之前代码继承）
    skillCheck(skillValue, difficulty) {
        const roll = Math.floor(Math.random() * 100) + 1;
        if (roll <= 5) return { success: true, roll, critical: true, fumble: false };
        if (roll >= 96) return { success: false, roll, critical: false, fumble: true };
        return { success: roll <= skillValue, roll, critical: false, fumble: false };
    },
    
    getEffectiveSkill(skillName) {
        let value = this.investigator.skills[skillName] || 0;
        // 警觉度惩罚
        value -= this.state.alertLevel * 3;
        return Math.max(5, Math.min(95, value));
    },
    
    takeDamage(amount) {
        this.investigator.hp -= amount;
        if (this.investigator.hp <= 0) {
            this.gameOver('HP归零，调查员倒在了遗迹中...');
        }
    },
    
    updateStatus() {
        if (!this.investigator) return;
        
        const hpPercent = (this.investigator.hp / this.investigator.maxHp) * 100;
        const sanPercent = (this.investigator.sanity / this.investigator.maxSanity) * 100;
        
        document.getElementById('hpBar').style.width = hpPercent + '%';
        document.getElementById('hpText').textContent = `${this.investigator.hp}/${this.investigator.maxHp}`;
        
        document.getElementById('sanBar').style.width = sanPercent + '%';
        document.getElementById('sanText').textContent = `${this.investigator.sanity}/${this.investigator.maxSanity}`;
        
        // 回合显示
        const turnPercent = (this.state.turn / this.state.maxTurns) * 100;
        document.getElementById('timeText').textContent = `${this.state.turn}/${this.state.maxTurns}`;
        document.getElementById('timeText').style.color = turnPercent > 80 ? '#e94560' : '#e0e0e0';
    },
    
    log(type, message) {
        const logPanel = document.getElementById('logPanel');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type === '成功' || type === '胜利' || type === '恢复' ? 'success' : type === '失败' || type === '战斗' ? 'failure' : 'system'}`;
        entry.textContent = `[${this.state.turn || 0}] ${message}`;
        logPanel.appendChild(entry);
        logPanel.scrollTop = logPanel.scrollHeight;
    },
    
    gameOver(reason) {
        this.state.gameOver = true;
        this.showModal('游戏结束', reason, () => location.reload());
    },
    
    victory(title, message) {
        this.state.victory = true;
        this.state.gameOver = true;
        this.showModal(title, message, () => location.reload());
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
    },
    
    // 房间创建函数
    createStorageRoom() {
        return {
            id: 'storage',
            name: '储藏室',
            visited: false,
            createObjects: () => [
                { type: 'chest', name: '宝箱', icon: '📦', state: { opened: false } }
            ]
        };
    },
    
    createTrapRoom() {
        return {
            id: 'trap',
            name: '陷阱房',
            visited: false,
            createObjects: () => [
                { type: 'monster', name: '陷阱守卫', state: { hp: 40, maxHp: 40 } },
                { type: 'trap', name: '尖刺陷阱', icon: '⚠️', state: { disarmed: false } }
            ]
        };
    },
    
    createGuardRoom() {
        return {
            id: 'guard',
            name: '守卫室',
            visited: false,
            createObjects: () => [
                { type: 'monster', name: '深潜者', state: { hp: 50, maxHp: 50 } },
                { type: 'monster', name: '深潜者', state: { hp: 50, maxHp: 50 } }
            ]
        };
    },
    
    createBossRoom() {
        return {
            id: 'ritual',
            name: '仪式厅',
            visited: false,
            createObjects: () => [
                { type: 'boss', name: '邪教主教', state: { hp: 80, maxHp: 80 } },
                { type: 'ritual', name: '召唤仪式', icon: '🔮', state: { progress: 50 } }
            ]
        };
    }
};

// 初始化
game.init();