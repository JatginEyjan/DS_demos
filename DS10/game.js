// DS10 v4 - 双人小队 + SAN压力系统 + 随机事件
// 核心改动: 双人并行、SAN累积爆发、随机事件替代安全屋

const game = {
    state: {
        phase: 'profession_select',
        currentRoute: null,
        turn: 0,
        selectedInvestigator: 0, // 当前行动的调查员索引
        selectedTarget: null,
        gameOver: false,
        victory: false
    },
    
    // 双人调查员小队
    team: [],
    
    // 路线网格定义 (移除安全屋，改为普通节点)
    routeGrid: [
        { id: 'entrance', name: '入口', type: 'start', x: 0, y: 0, visited: false },
        { id: 'room1', name: '储藏室', type: 'room', x: 1, y: 0, roomId: 'storage', visited: false },
        { id: 'fork', name: '分叉点', type: 'fork', x: 2, y: 0, visited: false },
        
        // 上分支
        { id: 'room2', name: '陷阱房', type: 'room', x: 3, y: -1, roomId: 'trap', visited: false, branch: 'upper' },
        { id: 'encounter1', name: '阴影走廊', type: 'encounter', x: 4, y: -1, visited: false },
        
        // 下分支
        { id: 'room3', name: '守卫室', type: 'room', x: 3, y: 1, roomId: 'guard', visited: false, branch: 'lower' },
        { id: 'encounter2', name: '低语回廊', type: 'encounter', x: 4, y: 1, visited: false },
        
        // 汇合
        { id: 'merge', name: '汇合点', type: 'merge', x: 5, y: 0, visited: false },
        { id: 'encounter3', name: '深渊前厅', type: 'encounter', x: 6, y: 0, visited: false },
        { id: 'boss', name: '仪式厅', type: 'boss', x: 7, y: 0, roomId: 'ritual', visited: false },
        { id: 'exit', name: '出口', type: 'exit', x: 8, y: 0, visited: false }
    ],
    
    connections: [
        ['entrance', 'room1'],
        ['room1', 'fork'],
        ['fork', 'room2'],
        ['fork', 'room3'],
        ['room2', 'encounter1'],
        ['room3', 'encounter2'],
        ['encounter1', 'merge'],
        ['encounter2', 'merge'],
        ['merge', 'encounter3'],
        ['encounter3', 'boss'],
        ['boss', 'exit']
    ],
    
    rooms: {},
    
    professions: {
        archaeologist: { name: '考古学家', hp: 70, maxHp: 70, sanity: 0, maxSanity: 100, skills: { 侦查: 50, 力量: 30, 神秘学: 35 } },
        soldier: { name: '前军人', hp: 90, maxHp: 90, sanity: 0, maxSanity: 100, skills: { 侦查: 35, 力量: 55, 神秘学: 20 } },
        occultist: { name: '神秘学者', hp: 50, maxHp: 50, sanity: 0, maxSanity: 100, skills: { 侦查: 40, 力量: 20, 神秘学: 55 } }
    },
    
    // SAN状态定义
    sanityStates: {
        calm: { min: 0, max: 30, name: '冷静', desc: '内心平静，思维清晰', bonus: '暴击率+5%' },
        uneasy: { min: 31, max: 50, name: '不安', desc: '隐隐感到不安', penalty: '技能检定-5' },
        nervous: { min: 51, max: 70, name: '紧张', desc: '手心出汗，心跳加速', penalty: '技能检定-10' },
        fearful: { min: 71, max: 85, name: '恐惧', desc: '恐惧攫住了你的心', penalty: '技能检定-15, 25%行动失败' },
        breaking: { min: 86, max: 99, name: '崩溃边缘', desc: '理智即将崩溃', penalty: '技能检定-20, 50%拒绝行动' },
        broken: { min: 100, max: 100, name: '崩溃', desc: '理智已崩溃', effect: '进入Affliction/Virtue判定' }
    },
    
    // Afflictions (负面状态)
    afflictions: {
        paranoid: { name: '偏执', desc: '所有人都在欺骗我', effect: '拒绝队友治疗，总是最后行动' },
        hopeless: { name: '绝望', desc: '一切都结束了', effect: '伤害-30%，50%几率跳过回合' },
        manic: { name: '狂躁', desc: '杀！全部杀光！', effect: '伤害+20%，50%攻击敌我不分' },
        withdrawn: { name: '自闭', desc: '我无法面对这一切', effect: '无法执行任何行动' }
    },
    
    // Virtues (正面状态)
    virtues: {
        steadfast: { name: '坚定', desc: '恐惧只是幻觉', effect: '免疫SAN伤害3回合，全队SAN-10' },
        heroic: { name: '英勇', desc: '为了队友！', effect: '伤害+30%，吸引所有敌人攻击' }
    },
    
    // 随机事件池
    randomEvents: [
        {
            id: 'altar',
            name: '古老祭坛',
            desc: '你发现一座刻满符文的祭坛，上面有一本翻开的古籍',
            choices: [
                { text: '阅读古籍 (SAN-20, 获得神秘知识)', action: 'altar_read' },
                { text: '献祭血液 (HP-15, 全队SAN-10)', action: 'altar_sacrifice' },
                { text: '离开', action: 'leave' }
            ]
        },
        {
            id: 'merchant',
            name: '神秘商人',
            desc: '一个披着黑袍的身影从阴影中走出，提供交易',
            choices: [
                { text: '购买镇静剂 (10金币, SAN-15)', action: 'buy_sedative' },
                { text: '出售情报 (获得15金币)', action: 'sell_info' },
                { text: '拒绝交易', action: 'leave' }
            ]
        },
        {
            id: 'whispers',
            name: '低语',
            desc: '墙壁中传来无法理解的低语，似乎在诱导你',
            choices: [
                { text: '倾听 (SAN+10, 可能获得线索)', action: 'listen_whispers' },
                { text: '捂住耳朵快速通过', action: 'leave' }
            ]
        },
        {
            id: 'corpse',
            name: '前人尸体',
            desc: '地上躺着一具调查员的尸体，手中紧握着什么',
            choices: [
                { text: '搜刮 (SAN+5, 获得物品)', action: 'loot_corpse' },
                { text: ' respectful离开 (SAN+2)', action: 'respect_leave' }
            ]
        },
        {
            id: 'ambush',
            name: '伏击！',
            desc: '敌人从阴影中跳出！',
            choices: [
                { text: '迎战！', action: 'ambush_fight' }
            ]
        }
    ],
    
    init() {
        this.initRooms();
        this.log('系统', 'DS10 v4 - 双人调查员模式启动');
        this.log('系统', '选择2名调查员组成小队');
    },
    
    initRooms() {
        this.rooms = {
            storage: { id: 'storage', name: '储藏室', objects: null, cleared: false, revealed: [] },
            trap: { id: 'trap', name: '陷阱房', objects: null, cleared: false, revealed: [] },
            guard: { id: 'guard', name: '守卫室', objects: null, cleared: false, revealed: [] },
            ritual: { id: 'ritual', name: '仪式厅', objects: null, cleared: false, revealed: [] }
        };
    },
    
    // 选择职业 - 改为选择2个
    selectedProfessions: [],
    
    selectProfession(key) {
        if (this.selectedProfessions.includes(key)) {
            this.log('系统', '该职业已被选择');
            return;
        }
        
        this.selectedProfessions.push(key);
        const prof = this.professions[key];
        this.log('系统', `选择了 ${prof.name}`);
        
        // 高亮已选择的职业按钮
        document.querySelectorAll('.profession-card').forEach(card => {
            if (card.dataset.profession === key) {
                card.classList.add('selected');
            }
        });
        
        if (this.selectedProfessions.length === 2) {
            this.confirmTeam();
        } else {
            this.log('系统', '请选择第二个调查员');
        }
    },
    
    confirmTeam() {
        // 创建双人小队
        this.team = this.selectedProfessions.map((key, idx) => ({
            id: idx,
            key: key,
            ...this.professions[key],
            inventory: { gold: 20, sedative: 1 },
            affliction: null,
            virtue: null,
            virtueTurns: 0
        }));
        
        document.getElementById('professionSelect').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        document.getElementById('gameUI').style.display = 'flex';
        
        this.log('系统', `小队组成: ${this.team[0].name} + ${this.team[1].name}`);
        this.startGame();
    },
    
    startGame() {
        this.state.currentRoute = 0;
        this.state.turn = 0;
        this.routeGrid[0].visited = true;
        this.updateMainView();
        this.updateStatus();
    },
    
    getCurrentNode() {
        return this.routeGrid[this.state.currentRoute];
    },
    
    getNeighbors(nodeId) {
        const neighbors = [];
        this.connections.forEach(([a, b]) => {
            if (a === nodeId) neighbors.push(b);
            if (b === nodeId) neighbors.push(a);
        });
        return neighbors.map(id => this.routeGrid.find(n => n.id === id));
    },
    
    canAccess(from, to) {
        const hasConnection = this.connections.some(([a, b]) => {
            return (a === from.id && b === to.id) || (b === from.id && a === to.id);
        });
        if (hasConnection) return true;
        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    },
    
    // 更新主画面
    updateMainView() {
        const node = this.getCurrentNode();
        
        // 随机事件判定
        if (node.type === 'encounter' && !node.eventTriggered) {
            node.eventTriggered = true;
            this.triggerRandomEvent();
            return;
        }
        
        if ((node.type === 'room' || node.type === 'boss') && !node.cleared && !node.inCombat) {
            this.showRoomEntry(node);
        } else {
            this.showRouteView();
        }
    },
    
    // 触发随机事件
    triggerRandomEvent() {
        const event = this.randomEvents[Math.floor(Math.random() * this.randomEvents.length)];
        this.showEventModal(event);
    },
    
    showEventModal(event) {
        const content = document.getElementById('mainContent');
        document.getElementById('sceneTitle').textContent = event.name;
        document.getElementById('sceneSubtitle').textContent = '遭遇事件';
        
        let html = '<div class="event-view">';
        html += `<div class="event-desc">${event.desc}</div>`;
        html += '<div class="event-choices">';
        
        event.choices.forEach(choice => {
            html += `<button class="action-btn large" onclick="game.handleEventChoice('${event.id}', '${choice.action}')">${choice.text}</button>`;
        });
        
        html += '</div></div>';
        content.innerHTML = html;
        document.getElementById('actionPanel').style.display = 'none';
    },
    
    handleEventChoice(eventId, action) {
        switch(action) {
            case 'altar_read':
                this.addSanityToAll(20);
                this.log('事件', '阅读古籍让你获得神秘知识，但精神受到冲击');
                break;
            case 'altar_sacrifice':
                this.damageAll(15);
                this.reduceSanityToAll(10);
                this.log('事件', '祭坛吸收了你的血液，全队感到一阵轻松');
                break;
            case 'buy_sedative':
                this.reduceSanityToAll(15);
                this.log('事件', '镇静剂起效了，噩梦般的幻象消退');
                break;
            case 'sell_info':
                this.team.forEach(inv => inv.inventory.gold += 15);
                this.log('事件', '你出售了情报获得15金币');
                break;
            case 'listen_whispers':
                this.addSanityToAll(10);
                if (Math.random() < 0.3) {
                    this.log('事件', '低语中隐藏着有价值的信息！');
                }
                break;
            case 'loot_corpse':
                this.addSanityToAll(5);
                this.team.forEach(inv => inv.inventory.sedative += 1);
                this.log('事件', '从尸体手中找到镇静剂 ×1');
                break;
            case 'respect_leave':
                this.addSanityToAll(2);
                this.log('事件', '你 respectful 地离开了，内心稍感平静');
                break;
            case 'ambush_fight':
                this.log('事件', '伏击战开始！');
                // 创建伏击敌人
                break;
        }
        
        if (action !== 'ambush_fight') {
            this.showRouteView();
        }
        this.updateStatus();
    },
    
    // 显示房间入口
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
                        ⚔️ 正面进入
                        <span class="skill-tag">遭遇战斗，获得全部奖励</span>
                    </button>
                    <button class="action-btn large" onclick="game.stealthApproach('${node.roomId}')">
                        👁️ 侦查潜入
                        <span class="skill-tag">侦查检定，可能发现隐藏内容</span>
                    </button>
                    <button class="action-btn large" onclick="game.showRouteView()">
                        ⬅️ 离开
                        <span class="skill-tag">返回地图</span>
                    </button>
                </div>
            </div>
        `;
        document.getElementById('actionPanel').style.display = 'none';
        this.updateMinimap();
    },
    
    // 侦查潜入
    stealthApproach(roomId) {
        const inv = this.getHealthyInvestigator();
        if (!inv) return;
        
        const result = this.skillCheck(inv.skills.侦查, 40);
        this.log(`${inv.name}`, `尝试侦查潜入 (侦查 ${inv.skills.侦查} vs 40)`);
        this.log('检定', `掷骰: ${result.roll} → ${result.success ? '成功！' : '失败'}`);
        
        const room = this.rooms[roomId];
        if (!room.objects) {
            room.objects = this.createRoomObjects(roomId);
        }
        
        if (result.success) {
            this.log('✓ 成功', '你发现了一个隐藏的魔法阵！');
            room.revealed.push('magic_circle');
            room.objects.push({
                id: 'magic_circle', name: '神秘魔法阵', type: 'secret',
                desc: '古老的保护阵法，可以净化SAN',
                actions: ['激活']
            });
        }
        
        this.enterRoomCombat(roomId);
    },
    
    // 创建房间对象
    createRoomObjects(roomId) {
        const objects = [];
        
        if (roomId === 'storage') {
            objects.push({
                id: 'chest', name: '宝箱', type: 'object',
                desc: '一个上锁的箱子',
                actions: ['开锁', '破坏']
            });
            objects.push({
                id: 'guard', name: '腐化守卫', type: 'enemy',
                hp: 35, maxHp: 35, damage: 10,
                fearAttack: { name: '腐化凝视', sanDamage: 8 }
            });
        } else if (roomId === 'trap') {
            objects.push({
                id: 'trap_spirit', name: '陷阱精灵', type: 'enemy',
                hp: 30, maxHp: 30, damage: 8,
                fearAttack: { name: '恐怖尖啸', sanDamage: 12 }
            });
            objects.push({
                id: 'hidden_trap', name: '隐藏陷阱', type: 'hazard',
                desc: '看起来危险的机关',
                actions: ['解除', '触发']
            });
        } else if (roomId === 'guard') {
            objects.push({
                id: 'deep_one1', name: '深潜者', type: 'enemy',
                hp: 45, maxHp: 45, damage: 12,
                fearAttack: { name: '深渊凝视', sanDamage: 10 }
            });
            objects.push({
                id: 'deep_one2', name: '深潜者', type: 'enemy',
                hp: 45, maxHp: 45, damage: 12,
                fearAttack: { name: '深渊凝视', sanDamage: 10 },
                hiddenLoot: { name: '深渊宝箱', gold: 25 }
            });
        } else if (roomId === 'ritual') {
            objects.push({
                id: 'bishop', name: '邪教主教', type: 'boss',
                hp: 100, maxHp: 100, damage: 15,
                fearAttack: { name: '疯狂低语', sanDamage: 15 }
            });
            objects.push({
                id: 'ritual_circle', name: '仪式法阵', type: 'object',
                desc: '维持主教力量的源泉',
                actions: ['干扰']
            });
        }
        
        return objects;
    },
    
    // 进入房间战斗
    enterRoomCombat(roomId) {
        const node = this.getCurrentNode();
        node.inCombat = true;
        
        const room = this.rooms[roomId];
        if (!room.objects) {
            room.objects = this.createRoomObjects(roomId);
        }
        
        this.log('系统', `进入${room.name}！`);
        
        // 进入未知房间的SAN压力
        if (!node.visited) {
            this.log('压力', '进入未知区域，恐惧感袭来...');
            this.addSanityToAll(5);
        }
        
        this.renderCombat(room);
    },
    
    // 渲染战斗画面
    renderCombat(room) {
        const content = document.getElementById('mainContent');
        document.getElementById('sceneTitle').textContent = room.name + ' - 战斗中';
        document.getElementById('sceneSubtitle').textContent = '选择调查员和行动';
        
        let html = '<div class="combat-view">';
        
        // 双人调查员状态（战斗位置）
        html += '<div class="team-battle-row">';
        this.team.forEach((inv, idx) => {
            if (inv.hp > 0) {
                const isSelected = this.state.selectedInvestigator === idx;
                const selectedClass = isSelected ? 'selected' : '';
                const sanityState = this.getSanityState(inv.sanity);
                html += `
                    <div class="investigator-battle-card ${selectedClass}" onclick="game.selectInvestigator(${idx})">
                        <div class="inv-icon">${idx === 0 ? '👤' : '👥'}</div>
                        <div class="inv-name">${inv.name}</div>
                        <div class="inv-status">[${sanityState.name}]</div>
                        <div class="inv-hp">HP: ${inv.hp}/${inv.maxHp}</div>
                        <div class="inv-san">SAN: ${inv.sanity}</div>
                        ${inv.affliction ? `<div class="inv-affliction">💔 ${inv.affliction}</div>` : ''}
                        ${inv.virtue ? `<div class="inv-virtue">✨ ${inv.virtue}</div>` : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="investigator-battle-card dead">
                        <div class="inv-icon">💀</div>
                        <div class="inv-name">${inv.name}</div>
                        <div class="inv-status">[阵亡]</div>
                    </div>
                `;
            }
        });
        html += '</div>';
        
        // VS 分隔
        html += '<div class="vs-divider">⚔️ VS ⚔️</div>';
        
        // 敌人列表
        const enemies = room.objects.filter(o => (o.type === 'enemy' || o.type === 'boss') && o.hp > 0);
        if (enemies.length > 0) {
            html += '<div class="enemies-row">';
            enemies.forEach((enemy, idx) => {
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
        
        // 环境/隐藏对象
        const others = room.objects.filter(o => o.type !== 'enemy' && o.type !== 'boss');
        if (others.length > 0) {
            html += '<div class="objects-row">';
            others.forEach(obj => {
                const isSelected = this.state.selectedTarget && this.state.selectedTarget.id === obj.id;
                const selectedClass = isSelected ? 'selected' : '';
                const icon = obj.type === 'hazard' ? '⚠️' : obj.type === 'secret' ? '🔮' : '📦';
                html += `
                    <div class="object-card ${selectedClass}" onclick="game.selectTarget('${obj.id}')">
                        <div class="object-icon">${icon}</div>
                        <div class="object-name">${obj.name}</div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // 战斗日志
        html += '<div class="battle-log-mini">';
        html += '<div class="section-title">📜 最近行动</div>';
        html += '</div>';
        
        html += '</div>';
        content.innerHTML = html;
        
        // 显示行动面板
        document.getElementById('actionPanel').style.display = 'block';
        this.updateCombatActions();
        this.updateMinimap();
    },
    
    // 选择调查员
    selectInvestigator(idx) {
        const inv = this.team[idx];
        if (inv.hp <= 0) {
            this.log('系统', `${inv.name} 已阵亡，无法行动`);
            return;
        }
        if (inv.affliction === '自闭') {
            this.log('系统', `${inv.name} 陷入自闭，无法行动`);
            return;
        }
        
        this.state.selectedInvestigator = idx;
        this.log('系统', `切换至 ${inv.name}`);
        
        const room = this.rooms[this.getCurrentNode().roomId];
        this.renderCombat(room);
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
    
    // 更新战斗行动按钮
    updateCombatActions() {
        const panel = document.getElementById('actionButtons');
        panel.innerHTML = '';
        
        const invIdx = this.state.selectedInvestigator;
        const inv = this.team[invIdx];
        
        if (!inv || inv.hp <= 0) {
            panel.innerHTML = '<div class="action-hint">该调查员无法行动</div>';
            return;
        }
        
        // 检查Affliction影响
        if (inv.affliction === '绝望' && Math.random() < 0.5) {
            panel.innerHTML = `<div class="action-hint">${inv.name} 陷入绝望，无法行动...</div>`;
            return;
        }
        
        const target = this.state.selectedTarget;
        const room = this.rooms[this.getCurrentNode().roomId];
        
        if (target) {
            // 根据目标类型显示不同行动
            if (target.type === 'enemy' || target.type === 'boss') {
                panel.innerHTML += `
                    <button class="action-btn" onclick="game.combatAttack()">⚔️ 攻击</button>
                    <button class="action-btn" onclick="game.combatObserve()">👁️ 观察</button>
                `;
                if (inv.skills.神秘学 >= 40) {
                    panel.innerHTML += `<button class="action-btn" onclick="game.mysticAttack()">✨ 神秘学攻击</button>`;
                }
            } else if (target.type === 'object' || target.type === 'secret') {
                if (target.id === 'magic_circle') {
                    panel.innerHTML += `<button class="action-btn" onclick="game.activateMagicCircle()">🔮 激活法阵</button>`;
                } else if (target.id === 'chest') {
                    panel.innerHTML += `
                        <button class="action-btn" onclick="game.interactWithTarget('picklock')">🔓 开锁</button>
                        <button class="action-btn" onclick="game.interactWithTarget('break')">💥 破坏</button>
                    `;
                } else if (target.id === 'ritual_circle') {
                    panel.innerHTML += `<button class="action-btn" onclick="game.disruptRitual()">✨ 干扰仪式</button>`;
                }
            } else if (target.type === 'hazard') {
                panel.innerHTML += `
                    <button class="action-btn" onclick="game.interactWithTarget('disarm')">🛠️ 解除</button>
                    <button class="action-btn" onclick="game.interactWithTarget('trigger')">⚡ 触发</button>
                `;
            }
            
            panel.innerHTML += `<button class="action-btn" onclick="game.clearSelection()">❌ 取消选择</button>`;
        } else {
            // 未选择目标时的通用选项
            panel.innerHTML += `<div class="action-hint">选择目标后执行行动</div>`;
            
            // 使用镇静剂
            if (inv.inventory.sedative > 0) {
                panel.innerHTML += `<button class="action-btn rest" onclick="game.useSedative()">💊 使用镇静剂 (-15 SAN)</button>`;
            }
        }
        
        panel.innerHTML += `<button class="action-btn" onclick="game.endCombatRound()">⏭️ 结束回合</button>`;
    },
    
    // 战斗攻击
    combatAttack() {
        const invIdx = this.state.selectedInvestigator;
        const inv = this.team[invIdx];
        const target = this.state.selectedTarget;
        
        if (!target || (target.type !== 'enemy' && target.type !== 'boss')) {
            this.log('系统', '请选择一个敌人');
            return;
        }
        
        // 狂躁Affliction：可能攻击错误目标
        if (inv.affliction === '狂躁' && Math.random() < 0.5) {
            const wrongTarget = Math.random() < 0.5 ? this.team.find(i => i.hp > 0 && i.id !== inv.id) : target;
            if (wrongTarget && wrongTarget !== target) {
                this.log('💔 狂躁', `${inv.name} 陷入狂躁，攻击了 ${wrongTarget.name}！`);
            }
        }
        
        const str = inv.skills.力量;
        const difficulty = target.type === 'boss' ? 55 : 40;
        
        this.log(`${inv.name}`, `攻击 ${target.name} (力量 ${str} vs ${difficulty})`);
        
        const result = this.skillCheck(str, difficulty);
        this.log('检定', `掷骰: ${result.roll}`);
        
        let damage = 20;
        if (inv.virtue === '英勇') damage = Math.floor(damage * 1.3);
        if (inv.affliction === '绝望') damage = Math.floor(damage * 0.7);
        
        if (result.success) {
            if (result.critical) damage = Math.floor(damage * 1.5);
            target.hp -= damage;
            this.log('⚔️ 命中', `造成 ${damage} 伤害！${target.name} 剩余 ${Math.max(0, target.hp)}/${target.maxHp}`);
            
            if (target.hp <= 0) {
                this.log('🏆 击败', `${target.name} 被消灭了！`);
                this.onEnemyDefeated(target);
                this.clearSelection();
            }
        } else {
            this.log('🛡️ 未命中', '攻击被闪避');
        }
        
        this.enemyTurn();
    },
    
    // 观察敌人
    combatObserve() {
        const inv = this.team[this.state.selectedInvestigator];
        const target = this.state.selectedTarget;
        
        const per = inv.skills.侦查;
        const difficulty = target && target.type === 'boss' ? 45 : 35;
        
        this.log(`${inv.name}`, `观察 ${target ? target.name : '周围环境'} (侦查 ${per})`);
        
        const result = this.skillCheck(per, difficulty);
        this.log('检定', `掷骰: ${result.roll}`);
        
        if (result.success) {
            if (target && (target.type === 'enemy' || target.type === 'boss')) {
                this.log('✓ 发现', `${target.name} 弱点暴露！下次攻击+10伤害`);
            } else {
                this.log('✓ 发现', '周围环境中隐藏着重要线索');
            }
        } else {
            this.log('✗ 无果', '观察失败');
        }
        
        this.enemyTurn();
    },
    
    // 敌人回合
    enemyTurn() {
        const room = this.rooms[this.getCurrentNode().roomId];
        const enemies = room.objects.filter(o => (o.type === 'enemy' || o.type === 'boss') && o.hp > 0);
        
        if (enemies.length === 0) return;
        
        // 英勇Virtue：吸引所有攻击
        const heroicInv = this.team.find(i => i.virtue === '英勇' && i.hp > 0);
        
        enemies.forEach(enemy => {
            // 选择攻击目标
            let target;
            if (heroicInv) {
                target = heroicInv;
                this.log('✨ 英勇', `${target.name} 吸引攻击守护队友！`);
            } else {
                const alive = this.team.filter(i => i.hp > 0);
                target = alive[Math.floor(Math.random() * alive.length)];
            }
            
            if (!target) return;
            
            // 攻击
            const dmg = enemy.damage || 10;
            target.hp -= dmg;
            this.log('💀 敌人', `${enemy.name} 攻击 ${target.name}，造成 ${dmg} 伤害！`);
            
            // 恐惧攻击造成SAN伤害
            if (enemy.fearAttack && target.hp > 0) {
                const sanDmg = enemy.fearAttack.sanDamage;
                this.addSanity(target, sanDmg);
                this.log('恐惧', `${target.name} 目睹恐怖场景，SAN +${sanDmg}`);
                
                // 队友目睹也加SAN
                this.team.forEach(teammate => {
                    if (teammate.id !== target.id && teammate.hp > 0) {
                        this.addSanity(teammate, 8);
                        this.log('压力', `${teammate.name} 看到战友受伤，SAN +8`);
                    }
                });
            }
            
            if (target.hp <= 0) {
                target.hp = 0;
                this.log('💀 阵亡', `${target.name} 倒下了...`);
                
                // 检查是否全灭
                const alive = this.team.filter(i => i.hp > 0);
                if (alive.length === 0) {
                    this.gameOver('全队阵亡...');
                    return;
                }
                
                // 自动切换
                const nextInv = alive[0];
                this.state.selectedInvestigator = nextInv.id;
                this.log('系统', `${nextInv.name} 独自继续战斗！`);
            }
        });
        
        this.updateStatus();
        this.renderCombat(room);
    },
    
    // 敌人被击败
    onEnemyDefeated(enemy) {
        // 检查隐藏奖励
        if (enemy.hiddenLoot) {
            this.log('🎁 发现', `从 ${enemy.name} 身上发现 ${enemy.hiddenLoot.name}！`);
            this.team.forEach(inv => inv.inventory.gold += enemy.hiddenLoot.gold || 0);
        }
    },
    
    // 使用镇静剂
    useSedative() {
        const inv = this.team[this.state.selectedInvestigator];
        if (inv.inventory.sedative > 0) {
            inv.inventory.sedative--;
            this.reduceSanity(inv, 15);
            this.log('💊 镇静', `${inv.name} 使用镇静剂，SAN -15`);
            this.updateStatus();
        }
    },
    
    // 激活魔法阵
    activateMagicCircle() {
        const room = this.rooms[this.getCurrentNode().roomId];
        this.team.forEach(inv => {
            this.reduceSanity(inv, 20);
        });
        this.log('🔮 净化', '魔法阵激活，全队SAN -20！');
        
        // 移除魔法阵
        room.objects = room.objects.filter(o => o.id !== 'magic_circle');
        this.clearSelection();
    },
    
    // 干扰仪式
    disruptRitual() {
        const inv = this.team[this.state.selectedInvestigator];
        const room = this.rooms[this.getCurrentNode().roomId];
        const bishop = room.objects.find(o => o.id === 'bishop');
        
        if (!bishop) return;
        
        const myst = inv.skills.神秘学;
        this.log(`${inv.name}`, `尝试干扰仪式 (神秘学 ${myst})`);
        
        const result = this.skillCheck(myst, 50);
        if (result.success) {
            bishop.hp -= 25;
            this.log('✨ 成功', '仪式受到干扰！主教HP-25');
        } else {
            this.addSanity(inv, 10);
            this.log('💀 反噬', '神秘能量反噬！SAN+10');
        }
        
        this.enemyTurn();
    },
    
    // 交互
    interactWithTarget(action) {
        const inv = this.team[this.state.selectedInvestigator];
        const room = this.rooms[this.getCurrentNode().roomId];
        const target = this.state.selectedTarget;
        
        switch(action) {
            case 'picklock':
                this.log(`${inv.name}`, '尝试开锁...');
                if (this.skillCheck(inv.skills.侦查, 40).success) {
                    this.log('✓ 成功', '宝箱打开！获得15金币');
                    this.team.forEach(i => i.inventory.gold += 15);
                    room.objects = room.objects.filter(o => o.id !== 'chest');
                    this.clearSelection();
                } else {
                    this.log('✗ 失败', '锁太复杂了');
                }
                break;
            case 'break':
                this.log(`${inv.name}`, '暴力破坏...');
                this.addSanity(inv, 3);
                this.log('💥 破坏', '箱子被砸开，但里面的东西损坏了。SAN+3');
                this.team.forEach(i => i.inventory.gold += 5);
                room.objects = room.objects.filter(o => o.id !== 'chest');
                this.clearSelection();
                break;
            case 'disarm':
                this.log(`${inv.name}`, '尝试解除陷阱...');
                if (this.skillCheck(inv.skills.侦查, 45).success) {
                    this.log('✓ 成功', '陷阱被安全解除');
                    room.objects = room.objects.filter(o => o.id !== 'hidden_trap');
                } else {
                    this.log('💥 触发', '陷阱爆炸！');
                    this.damageAll(15);
                }
                this.clearSelection();
                break;
            case 'trigger':
                this.log(`${inv.name}`, '故意触发陷阱...');
                this.damageAll(10);
                room.objects = room.objects.filter(o => o.id !== 'hidden_trap');
                this.clearSelection();
                break;
        }
        
        this.updateStatus();
    },
    
    // 结束战斗轮
    endCombatRound() {
        const room = this.rooms[this.getCurrentNode().roomId];
        const enemies = room.objects.filter(o => (o.type === 'enemy' || o.type === 'boss') && o.hp > 0);
        
        if (enemies.length === 0) {
            this.log('系统', '战斗结束！');
            const node = this.getCurrentNode();
            node.cleared = true;
            node.inCombat = false;
            this.updateMainView();
        } else {
            this.enemyTurn();
        }
    },
    
    // 清除选择
    clearSelection() {
        this.state.selectedTarget = null;
        const room = this.rooms[this.getCurrentNode().roomId];
        this.renderCombat(room);
    },
    
    // SAN相关方法
    getSanityState(sanity) {
        for (const [key, state] of Object.entries(this.sanityStates)) {
            if (sanity >= state.min && sanity <= state.max) {
                return { key, ...state };
            }
        }
        return this.sanityStates.calm;
    },
    
    addSanity(inv, amount) {
        const oldSan = inv.sanity;
        inv.sanity = Math.min(100, inv.sanity + amount);
        
        // 检查是否达到100
        if (oldSan < 100 && inv.sanity >= 100) {
            this.triggerSanityBreak(inv);
        }
        
        this.updateStatus();
    },
    
    reduceSanity(inv, amount) {
        inv.sanity = Math.max(0, inv.sanity - amount);
        this.updateStatus();
    },
    
    addSanityToAll(amount) {
        this.team.forEach(inv => this.addSanity(inv, amount));
    },
    
    reduceSanityToAll(amount) {
        this.team.forEach(inv => this.reduceSanity(inv, amount));
    },
    
    // SAN崩溃判定
    triggerSanityBreak(inv) {
        this.log('💀 崩溃', `${inv.name} 的理智崩溃了！`);
        
        // 15% Virtue, 85% Affliction
        if (Math.random() < 0.15) {
            // Virtue
            const virtues = Object.keys(this.virtues);
            const vKey = virtues[Math.floor(Math.random() * virtues.length)];
            const virtue = this.virtues[vKey];
            inv.virtue = virtue.name;
            inv.virtueTurns = 3;
            this.log('✨ Virtue', `${inv.name} 获得了 ${virtue.name}：${virtue.desc}`);
            
            // 坚定效果
            if (vKey === 'steadfast') {
                this.reduceSanityToAll(10);
            }
        } else {
            // Affliction
            const afflictions = Object.keys(this.afflictions);
            const aKey = afflictions[Math.floor(Math.random() * afflictions.length)];
            const affliction = this.afflictions[aKey];
            inv.affliction = affliction.name;
            this.log('💔 Affliction', `${inv.name} 陷入 ${affliction.name}：${affliction.desc}`);
        }
    },
    
    // 伤害方法
    damageAll(amount) {
        this.team.forEach(inv => {
            if (inv.hp > 0) {
                inv.hp = Math.max(0, inv.hp - amount);
                if (inv.hp === 0) {
                    this.log('💀 阵亡', `${inv.name} 受到致命伤害！`);
                }
            }
        });
        
        const alive = this.team.filter(i => i.hp > 0);
        if (alive.length === 0) {
            this.gameOver('全队阵亡...');
        }
        this.updateStatus();
    },
    
    getHealthyInvestigator() {
        const alive = this.team.filter(i => i.hp > 0);
        return alive.length > 0 ? alive[0] : null;
    },
    
    // 显示路线选择视图
    showRouteView() {
        const node = this.getCurrentNode();
        const content = document.getElementById('mainContent');
        
        document.getElementById('sceneTitle').textContent = node.name;
        document.getElementById('sceneSubtitle').textContent = '选择前进方向';
        
        let html = '<div class="route-view">';
        
        const neighbors = this.getNeighbors(node.id).filter(n => {
            return n.visited || this.canAccess(node, n);
        });
        
        html += '<div class="direction-grid">';
        
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
                </button>
            `;
        });
        
        html += '</div></div>';
        
        content.innerHTML = html;
        document.getElementById('actionPanel').style.display = 'none';
        this.updateMinimap();
    },
    
    // 移动节点
    moveToNode(nodeId) {
        const nodeIndex = this.routeGrid.findIndex(n => n.id === nodeId);
        if (nodeIndex === -1) return;
        
        this.state.currentRoute = nodeIndex;
        const node = this.getCurrentNode();
        node.visited = true;
        
        this.log('移动', `到达 ${node.name}`);
        
        // 移动后可能触发随机事件
        if (node.type === 'encounter') {
            this.triggerRandomEvent();
        } else {
            this.updateMainView();
        }
    },
    
    // 更新小地图
    updateMinimap() {
        const minimap = document.getElementById('minimapContent');
        const mobileMap = document.getElementById('mobileMapContent');
        
        const mapHTML = this.generateMapHTML();
        
        if (minimap) {
            minimap.innerHTML = mapHTML.desktop;
        }
        
        if (mobileMap) {
            mobileMap.innerHTML = mapHTML.mobile;
        }
    },
    
    generateMapHTML() {
        const current = this.getCurrentNode();
        
        const minX = Math.min(...this.routeGrid.map(n => n.x));
        const maxX = Math.max(...this.routeGrid.map(n => n.x));
        const minY = Math.min(...this.routeGrid.map(n => n.y));
        const maxY = Math.max(...this.routeGrid.map(n => n.y));
        
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
    
    getNodeIcon(type) {
        const icons = {
            start: '◎', room: '□', boss: '☠️', exit: '🚪',
            fork: '◇', merge: '◈', encounter: '!'
        };
        return icons[type] || '?';
    },
    
    showMobileMap() {
        const modal = document.getElementById('mobileMapModal');
        if (modal) {
            this.updateMinimap();
            modal.classList.add('show');
        }
    },
    
    hideMobileMap() {
        const modal = document.getElementById('mobileMapModal');
        if (modal) {
            modal.classList.remove('show');
        }
    },
    
    // 更新状态栏
    updateStatus() {
        if (!this.team || this.team.length === 0) return;
        
        // 更新双人状态栏
        this.team.forEach((inv, idx) => {
            const hpBar = document.getElementById(`hpBar${idx}`);
            const hpText = document.getElementById(`hpText${idx}`);
            const sanBar = document.getElementById(`sanBar${idx}`);
            const sanText = document.getElementById(`sanText${idx}`);
            const statusLabel = document.getElementById(`statusLabel${idx}`);
            
            if (hpBar) hpBar.style.width = (inv.hp / inv.maxHp * 100) + '%';
            if (hpText) hpText.textContent = `${inv.hp}/${inv.maxHp}`;
            if (sanBar) sanBar.style.width = (inv.sanity / 100 * 100) + '%';
            if (sanText) sanText.textContent = inv.sanity;
            
            if (statusLabel) {
                const sanState = this.getSanityState(inv.sanity);
                let statusText = sanState.name;
                if (inv.affliction) statusText += ` 💔${inv.affliction}`;
                if (inv.virtue) statusText += ` ✨${inv.virtue}`;
                if (inv.hp <= 0) statusText = '💀 阵亡';
                statusLabel.textContent = statusText;
                statusLabel.className = `status-label ${sanState.key}`;
            }
        });
    },
    
    // 日志系统
    log(type, msg) {
        const panel = document.getElementById('logPanel');
        const entry = document.createElement('div');
        
        let className = 'system';
        if (type.includes('成功') || type.includes('✓') || type === '🏆 击败' || type === '✨ Virtue') {
            className = 'success';
        } else if (type.includes('失败') || type.includes('✗') || type === '💀 阵亡' || type === '💔 Affliction' || type === '💀 敌人') {
            className = 'failure';
        } else if (type.includes('理智') || type === '🌀 崩溃' || type === '恐惧') {
            className = 'sanity';
        } else if (type.includes('战斗') || type === '⚔️ 命中' || type === '🛡️ 未命中') {
            className = 'combat';
        } else if (type.includes('🎁') || type === '✨ 成功') {
            className = 'reward';
        } else if (type.includes('伤害') || type === '💔 狂躁') {
            className = 'damage';
        }
        
        entry.className = `log-entry ${className}`;
        entry.textContent = `[${this.state.turn || 0}] ${type}: ${msg}`;
        panel.appendChild(entry);
        panel.scrollTop = panel.scrollHeight;
    },
    
    // 技能检定
    skillCheck(skill, difficulty) {
        const roll = Math.floor(Math.random() * 100) + 1;
        if (roll <= 5) return { success: true, critical: true, roll };
        if (roll >= 96) return { success: false, fumble: true, roll };
        return { success: roll <= skill, roll };
    },
    
    // 游戏结束
    gameOver(reason) {
        this.state.gameOver = true;
        this.showModal('游戏结束', reason, () => location.reload());
    },
    
    // 胜利
    victory(title, msg) {
        this.state.victory = true;
        this.showModal(title, msg, () => location.reload());
    },
    
    // 弹窗
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
