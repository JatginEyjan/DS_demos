// DS10 Demo - 深渊调查员
// 核心游戏系统：地图导航 + 安全屋 + 房间遭遇

const game = {
    // 游戏状态
    state: {
        phase: 'profession_select', // profession_select, map, safehouse, room, gameover
        currentLayer: 0,
        currentRoom: null,
        turn: 1,
        selectedObject: null,
        gameOver: false,
        victory: false
    },
    
    // 调查员
    investigator: null,
    
    // 副本数据
    dungeon: null,
    
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
        this.dungeon = this.generateDungeon();
        this.log('系统', '游戏初始化完成，请选择调查员...');
    },
    
    // 生成副本
    generateDungeon() {
        return {
            name: '浅层遗迹',
            layers: [
                {
                    id: 0,
                    name: '第1层',
                    safehouse: {
                        id: 'sh1',
                        name: '第1层安全屋',
                        visited: false
                    },
                    rooms: [
                        {
                            id: 'room1',
                            name: '储藏室',
                            icon: '📦',
                            type: 'normal',
                            cleared: false,
                            description: '一间昏暗的储藏室，角落里有一个上锁的宝箱。',
                            objects: () => this.createStorageRoomObjects()
                        },
                        {
                            id: 'room2',
                            name: '陷阱走廊',
                            icon: '⚠️',
                            type: 'optional',
                            cleared: false,
                            risk: 'high',
                            description: '狭窄的走廊，地板看起来不太对劲...',
                            objects: () => this.createTrapRoomObjects()
                        }
                    ]
                },
                {
                    id: 1,
                    name: '第2层',
                    safehouse: {
                        id: 'sh2',
                        name: '第2层安全屋',
                        visited: false
                    },
                    rooms: [
                        {
                            id: 'boss',
                            name: '仪式厅',
                            icon: '🔮',
                            type: 'boss',
                            cleared: false,
                            description: '邪教徒正在进行召唤仪式！',
                            objects: () => this.createBossRoomObjects()
                        }
                    ]
                }
            ],
            currentLocation: 'entrance' // entrance, sh1, sh2, room1, room2, boss
        };
    },
    
    // 选择职业
    selectProfession(professionKey) {
        const template = this.professions[professionKey];
        this.investigator = {
            ...template,
            inventory: {
                food: 2,
                medicine: 1,
                ammo: 6
            }
        };
        
        document.getElementById('professionSelect').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        document.getElementById('gameUI').style.display = 'flex';
        
        this.log('系统', `${this.investigator.name}准备进入遗迹...`);
        this.enterDungeon();
    },
    
    // 进入副本
    enterDungeon() {
        this.state.phase = 'map';
        this.state.currentLayer = 0;
        this.dungeon.currentLocation = 'entrance';
        this.renderMap();
        this.updateStatus();
    },
    
    // 渲染地图
    renderMap() {
        const layer = this.dungeon.layers[this.state.currentLayer];
        const content = document.getElementById('gameContent');
        
        document.getElementById('sceneTitle').textContent = this.dungeon.name;
        document.getElementById('sceneSubtitle').textContent = `${layer.name} - 选择要前往的房间`;
        
        let html = '<div class="map-view">';
        
        // 安全屋
        const shStatus = layer.safehouse.visited ? 'cleared' : 'available';
        html += `
            <div class="map-layer">
                <div class="map-layer-title">安全屋 ★</div>
                <div class="map-nodes">
                    <div class="map-node ${shStatus}" onclick="game.enterSafehouse()">
                        <div class="map-node-icon">★</div>
                        <div class="map-node-label">${layer.safehouse.name}</div>
                    </div>
                </div>
            </div>
        `;
        
        // 房间节点
        html += `
            <div class="map-layer">
                <div class="map-layer-title">可探索区域</div>
                <div class="map-nodes">
        `;
        
        layer.rooms.forEach(room => {
            let status = '';
            let onclick = '';
            
            if (room.cleared) {
                status = 'cleared';
                onclick = `game.log('系统', '${room.name}已探索完毕')`;
            } else {
                status = 'available';
                onclick = `game.enterRoom('${room.id}')`;
            }
            
            html += `
                <div class="map-node ${status}" onclick="${onclick}">
                    <div class="map-node-icon">${room.icon}</div>
                    <div class="map-node-label">${room.name}</div>
                </div>
            `;
        });
        
        html += '</div></div>';
        
        // 下一层按钮（如果所有房间都清理了）
        const allCleared = layer.rooms.every(r => r.cleared);
        if (allCleared && this.state.currentLayer < this.dungeon.layers.length - 1) {
            html += `
                <div style="text-align: center; margin-top: 20px;">
                    <button class="modal-btn" onclick="game.nextLayer()">
                        ⬇️ 前往${this.dungeon.layers[this.state.currentLayer + 1].name}
                    </button>
                </div>
            `;
        }
        
        // 撤离按钮
        html += `
            <div style="text-align: center; margin-top: 20px;">
                <button class="modal-btn" onclick="game.evacuate()" style="background: #666;">
                    🚪 撤离副本
                </button>
            </div>
        `;
        
        html += '</div>';
        content.innerHTML = html;
        
        // 隐藏行动面板
        document.getElementById('actionPanel').style.display = 'none';
    },
    
    // 进入安全屋
    enterSafehouse() {
        const layer = this.dungeon.layers[this.state.currentLayer];
        layer.safehouse.visited = true;
        this.state.phase = 'safehouse';
        this.dungeon.currentLocation = layer.safehouse.id;
        
        this.renderSafehouse();
    },
    
    // 渲染安全屋
    renderSafehouse() {
        const layer = this.dungeon.layers[this.state.currentLayer];
        const content = document.getElementById('gameContent');
        
        document.getElementById('sceneTitle').textContent = layer.safehouse.name;
        document.getElementById('sceneSubtitle').textContent = '这里暂时是安全的，你可以休息和整理';
        
        let html = `
            <div class="map-view">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">★</div>
                    <div style="color: #27ae60;">安全区域 - 敌人不会进入</div>
                </div>
                
                <div class="map-layer">
                    <div class="map-layer-title">可用行动</div>
                    <div class="action-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
        `;
        
        // 进食恢复
        const canEat = this.investigator.inventory.food > 0;
        html += `
            <button class="action-btn" ${!canEat ? 'disabled' : ''} onclick="game.safehouseRest('eat')">
                🍞 进食恢复
                <span class="skill-tag">消耗食物×1，恢复30% HP</span>
            </button>
        `;
        
        // 休息恢复SAN
        html += `
            <button class="action-btn" onclick="game.safehouseRest('sleep')">
                💤 冥想休息
                <span class="skill-tag">恢复20 SAN，消耗时间</span>
            </button>
        `;
        
        // 整理背包
        html += `
            <button class="action-btn" onclick="game.showInventory()">
                🎒 整理背包
                <span class="skill-tag">查看和使用道具</span>
            </button>
        `;
        
        // 查看地图
        html += `
            <button class="action-btn" onclick="game.renderMap()">
                🗺️ 查看地图
                <span class="skill-tag">返回地图选择</span>
            </button>
        `;
        
        html += '</div></div>';
        
        // 背包状态
        html += `
            <div class="map-layer" style="margin-top: 20px;">
                <div class="map-layer-title">背包</div>
                <div style="color: #888; font-size: 12px;">
                    食物: ${this.investigator.inventory.food} | 
                    药品: ${this.investigator.inventory.medicine} | 
                    弹药: ${this.investigator.inventory.ammo}
                </div>
            </div>
        `;
        
        html += '</div>';
        content.innerHTML = html;
        
        document.getElementById('actionPanel').style.display = 'none';
    },
    
    // 安全屋恢复
    safehouseRest(type) {
        if (type === 'eat') {
            if (this.investigator.inventory.food <= 0) {
                this.log('系统', '没有食物了！');
                return;
            }
            this.investigator.inventory.food--;
            const heal = Math.floor(this.investigator.maxHp * 0.3);
            this.investigator.hp = Math.min(this.investigator.maxHp, this.investigator.hp + heal);
            this.log('成功', `进食恢复，HP+${heal}`);
        } else if (type === 'sleep') {
            this.investigator.sanity = Math.min(this.investigator.maxSanity, this.investigator.sanity + 20);
            this.log('成功', '冥想休息，SAN+20');
        }
        this.updateStatus();
        this.renderSafehouse();
    },
    
    // 显示背包
    showInventory() {
        // 简化版，后续可扩展
        this.log('系统', `背包内容：食物×${this.investigator.inventory.food} 药品×${this.investigator.inventory.medicine} 弹药×${this.investigator.inventory.ammo}`);
    },
    
    // 进入房间
    enterRoom(roomId) {
        const layer = this.dungeon.layers[this.state.currentLayer];
        const room = layer.rooms.find(r => r.id === roomId);
        
        if (!room || room.cleared) return;
        
        this.state.phase = 'room';
        this.state.currentRoom = room;
        this.dungeon.currentLocation = roomId;
        this.state.turn = 1;
        
        // 生成房间对象
        room.currentObjects = room.objects();
        
        this.log('系统', `进入${room.name}：${room.description}`);
        this.renderRoom();
    },
    
    // 渲染房间
    renderRoom() {
        const room = this.state.currentRoom;
        const content = document.getElementById('gameContent');
        
        document.getElementById('sceneTitle').textContent = room.name;
        document.getElementById('sceneSubtitle').textContent = '回合 ' + this.state.turn;
        
        // 像素画面
        let html = '<div class="pixel-view">';
        
        // 添加调查员（固定在底部中央）
        html += '<div class="pixel-object obj-player" style="bottom: 40px; left: 50%; transform: translateX(-50%);"></div>';
        
        // 添加对象
        room.currentObjects.forEach((obj, index) => {
            const className = `pixel-object ${obj.class}`;
            html += `<div class="${className}" style="${obj.style}" onclick="game.selectObject(${index})" title="${obj.name}"></div>`;
        });
        
        html += '</div>';
        content.innerHTML = html;
        
        // 显示行动提示
        document.getElementById('actionPanel').style.display = 'block';
        document.getElementById('actionTitle').textContent = '点击对象选择行动';
        document.getElementById('actionButtons').innerHTML = '';
        
        // 添加返回地图按钮
        const returnBtn = document.createElement('button');
        returnBtn.className = 'action-btn';
        returnBtn.innerHTML = '🚪 撤退到安全屋<br><span class="skill-tag">放弃本房间，返回地图</span>';
        returnBtn.onclick = () => this.retreatFromRoom();
        document.getElementById('actionButtons').appendChild(returnBtn);
    },
    
    // 选择对象
    selectObject(index) {
        const room = this.state.currentRoom;
        const obj = room.currentObjects[index];
        if (!obj) return;
        
        this.state.selectedObject = obj;
        
        // 高亮
        document.querySelectorAll('.pixel-object').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.pixel-object')[index + 1].classList.add('selected'); // +1因为第一个是玩家
        
        // 显示行动
        document.getElementById('actionTitle').textContent = `对 ${obj.name}：`;
        const buttonsDiv = document.getElementById('actionButtons');
        buttonsDiv.innerHTML = '';
        
        obj.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            
            let skillText = '';
            if (action.skill) {
                const diff = action.dynamicDifficulty ? action.dynamicDifficulty(obj) : action.difficulty;
                const skillValue = this.getEffectiveSkill(action.skill);
                const successRate = Math.min(95, Math.max(5, skillValue - diff + 50));
                skillText = `<span class="skill-tag">${action.skill} ${skillValue}/${diff} (${successRate}%)</span>`;
            }
            
            btn.innerHTML = `${action.name}${skillText}`;
            btn.onclick = () => this.executeAction(obj, action);
            buttonsDiv.appendChild(btn);
        });
        
        // 撤退按钮
        const retreatBtn = document.createElement('button');
        retreatBtn.className = 'action-btn';
        retreatBtn.innerHTML = '🚪 撤退<br><span class="skill-tag">放弃本房间</span>';
        retreatBtn.onclick = () => this.retreatFromRoom();
        buttonsDiv.appendChild(retreatBtn);
    },
    
    // 执行行动
    executeAction(obj, action) {
        // 检查条件
        if (action.condition && !action.condition(obj, this)) {
            this.log('失败', '条件不满足，无法执行此行动');
            return;
        }
        
        // 计算检定
        let result = { success: true, roll: 0, critical: false, fumble: false };
        
        if (action.skill) {
            let difficulty = action.difficulty;
            if (action.dynamicDifficulty) {
                difficulty = action.dynamicDifficulty(obj);
            }
            
            let skillValue = this.getEffectiveSkill(action.skill);
            result = this.skillCheck(skillValue, difficulty);
        }
        
        // 显示检定结果
        if (action.skill) {
            const resultText = result.success ? (result.critical ? '★大成功' : '✓成功') : (result.fumble ? '💀大失败' : '✗失败');
            this.log(result.success ? '成功' : '失败', `🎲 ${action.skill}检定: ${result.roll} → ${resultText}`);
        }
        
        // 执行结果
        if (result.success) {
            const msg = action.success(obj, this);
            if (msg) this.log('成功', msg);
        } else {
            const msg = action.failure ? action.failure(obj, this) : '行动失败';
            this.log('失败', msg);
        }
        
        // 检查房间是否完成
        this.checkRoomComplete();
        
        // 更新状态
        this.updateStatus();
        
        // 如果房间还在，重新渲染
        if (this.state.phase === 'room') {
            this.state.turn++;
            setTimeout(() => this.renderRoom(), 500);
        }
    },
    
    // 技能检定
    skillCheck(skillValue, difficulty) {
        const roll = Math.floor(Math.random() * 100) + 1;
        
        if (roll <= 5) {
            return { success: true, roll, critical: true, fumble: false };
        }
        if (roll >= 96) {
            return { success: false, roll, critical: false, fumble: true };
        }
        
        return {
            success: roll <= skillValue,
            roll,
            critical: false,
            fumble: false
        };
    },
    
    // 获取有效技能值
    getEffectiveSkill(skillName) {
        let value = this.investigator.skills[skillName] || 0;
        
        // 特质加成
        if (this.investigator.traits.includes('敏锐直觉') && skillName === '侦查' && this.state.turn === 1) {
            value += 10;
        }
        if (this.investigator.traits.includes('考古知识') && skillName === '侦查') {
            // 对宝箱类对象生效，在action中处理
        }
        if (this.investigator.traits.includes('战术训练') && skillName === '力量') {
            value += 10;
        }
        
        return Math.min(95, value);
    },
    
    // 检查房间是否完成
    checkRoomComplete() {
        const room = this.state.currentRoom;
        
        // 检查胜利条件（简化：所有威胁清除）
        const threats = room.currentObjects.filter(obj => 
            obj.type === 'monster' && obj.state.hp > 0 ||
            obj.type === 'boss' && !obj.state.defeated
        );
        
        if (threats.length === 0) {
            room.cleared = true;
            this.log('系统', `${room.name}已清理完毕！`);
            
            setTimeout(() => {
                this.showModal('房间清理完毕', '你成功清理了这个房间！\n\n可以前往其他房间或返回安全屋恢复。', () => {
                    this.state.phase = 'map';
                    this.renderMap();
                });
            }, 1000);
        }
    },
    
    // 撤退
    retreatFromRoom() {
        this.log('系统', '撤退到安全屋...');
        this.state.phase = 'map';
        this.renderMap();
    },
    
    // 前往下一层
    nextLayer() {
        this.state.currentLayer++;
        this.log('系统', `前往${this.dungeon.layers[this.state.currentLayer].name}...`);
        this.renderMap();
    },
    
    // 撤离副本
    evacuate() {
        this.showModal('撤离副本', '你选择了撤离，将带走所有已获得的资源。\n\n确定要撤离吗？', () => {
            this.victory('成功撤离！', '你带着收集到的资源安全返回了事务所。');
        });
    },
    
    // 创建储藏室对象
    createStorageRoomObjects() {
        return [
            {
                name: '上锁的宝箱',
                type: 'chest',
                class: 'obj-chest',
                style: 'top: 40px; left: 40px;',
                state: { locked: true, observed: false },
                actions: [
                    {
                        name: '观察锁',
                        skill: '侦查',
                        difficulty: 25,
                        success: (obj) => {
                            obj.state.observed = true;
                            return '你发现锁结构简单，是个老式的铜锁。';
                        },
                        failure: () => '你看了半天，锁太复杂了，看不出门道。'
                    },
                    {
                        name: '开锁',
                        skill: '侦查',
                        difficulty: 35,
                        dynamicDifficulty: (obj) => obj.state.observed ? 25 : 35,
                        success: (obj) => {
                            obj.state.locked = false;
                            return '锁开了！你获得了10金币和一些物资。';
                        },
                        failure: () => '锁太紧了，你弄了半天也没打开。'
                    },
                    {
                        name: '暴力破坏',
                        skill: '力量',
                        difficulty: 30,
                        success: (obj) => {
                            obj.state.locked = false;
                            return '你用蛮力砸开了箱子！获得了10金币，但里面的笔记被砸烂了。';
                        },
                        failure: () => '箱子太坚固了，你的拳头都疼了。'
                    }
                ]
            }
        ];
    },
    
    // 创建陷阱房间对象
    createTrapRoomObjects() {
        return [
            {
                name: '地板陷阱',
                type: 'trap',
                class: 'obj-trap',
                style: 'top: 180px; left: 40px;',
                state: { observed: false, disarmed: false },
                actions: [
                    {
                        name: '观察',
                        skill: '侦查',
                        difficulty: 30,
                        success: (obj) => {
                            obj.state.observed = true;
                            return '你发现地板有一块微微凸起，是个陷阱！';
                        },
                        failure: () => '看起来就是普通的地板。'
                    },
                    {
                        name: '解除',
                        skill: '侦查',
                        difficulty: 40,
                        condition: (obj) => obj.state.observed,
                        success: (obj) => {
                            obj.state.disarmed = true;
                            return '你小心地解除了机关，陷阱失效了。';
                        },
                        failure: (obj, game) => {
                            game.takeDamage(15);
                            game.loseSanity(5);
                            obj.state.triggered = true;
                            return '你弄错了什么，陷阱触发了！HP-15，SAN-5。';
                        }
                    },
                    {
                        name: '硬闯',
                        skill: null,
                        difficulty: 0,
                        success: (obj, game) => {
                            game.takeDamage(15);
                            game.loseSanity(5);
                            obj.state.triggered = true;
                            return '你直接踩了过去...HP-15，SAN-5。';
                        }
                    }
                ]
            },
            {
                name: '深潜者守卫',
                type: 'monster',
                class: 'obj-monster',
                style: 'top: 100px; right: 40px;',
                state: { hp: 50, maxHp: 50, observed: false },
                actions: [
                    {
                        name: '观察',
                        skill: '侦查',
                        difficulty: 35,
                        success: (obj) => {
                            obj.state.observed = true;
                            return '你发现这个深潜者左腿有旧伤，攻击那里会有优势！';
                        },
                        failure: () => '就是个普通的怪物，绿色的，很丑。'
                    },
                    {
                        name: '战斗',
                        skill: '力量',
                        difficulty: 45,
                        dynamicDifficulty: (obj) => obj.state.observed ? 35 : 45,
                        success: (obj, game) => {
                            const damage = obj.state.observed ? 35 : 25;
                            obj.state.hp -= damage;
                            if (obj.state.hp <= 0) {
                                return `你攻击了${obj.state.observed ? '它的伤腿' : '它'}，造成${damage}伤害！深潜者倒下了！`;
                            }
                            return `攻击命中！造成${damage}伤害。深潜者还有${obj.state.hp}HP。`;
                        },
                        failure: (obj, game) => {
                            game.takeDamage(15);
                            game.loseSanity(5);
                            return '你攻击被躲开了，反被骨刃划伤！HP-15，SAN-5。';
                        }
                    }
                ]
            }
        ];
    },
    
    // 创建Boss房间对象
    createBossRoomObjects() {
        return [
            {
                name: '邪教徒',
                type: 'boss',
                class: 'obj-cultist',
                style: 'top: 60px; right: 40px;',
                state: { hp: 40, maxHp: 40, defeated: false },
                actions: [
                    {
                        name: '战斗',
                        skill: '力量',
                        difficulty: 40,
                        success: (obj, game) => {
                            obj.state.hp -= 20;
                            if (obj.state.hp <= 0) {
                                obj.state.defeated = true;
                                return '你的攻击正中要害，邪教徒倒地身亡！';
                            }
                            return '攻击命中！邪教徒受伤了。';
                        },
                        failure: (obj, game) => {
                            game.takeDamage(12);
                            return '没打中！邪教徒反手一道黑暗能量击中你！HP-12。';
                        }
                    }
                ]
            },
            {
                name: '召唤仪式',
                type: 'ritual',
                class: 'obj-ritual',
                style: 'top: 60px; left: 50%; transform: translateX(-50%);',
                state: { progress: 30 },
                onTurnEnd: (obj) => {
                    obj.state.progress += 15;
                    if (obj.state.progress >= 100) {
                        game.gameOver('仪式完成，古神降临，世界毁灭！');
                    }
                },
                actions: [
                    {
                        name: '干扰',
                        skill: '神秘学',
                        difficulty: 40,
                        success: (obj) => {
                            obj.state.progress = Math.max(0, obj.state.progress - 25);
                            return `你念出反制咒语，仪式进度降至${obj.state.progress}%！`;
                        },
                        failure: (obj, game) => {
                            game.loseSanity(15);
                            return '咒语念错了！反噬的力量冲击你的精神！SAN-15。';
                        }
                    }
                ]
            }
        ];
    },
    
    // 伤害处理
    takeDamage(amount) {
        this.investigator.hp -= amount;
        if (this.investigator.hp <= 0) {
            this.gameOver('你的HP归零，你死在了遗迹中...');
        }
    },
    
    // 理智损失
    loseSanity(amount) {
        this.investigator.sanity -= amount;
        if (this.investigator.sanity <= 0) {
            this.gameOver('你的SAN归零，你陷入了永恒的疯狂...');
        }
    },
    
    // 更新状态栏
    updateStatus() {
        if (!this.investigator) return;
        
        const hpPercent = (this.investigator.hp / this.investigator.maxHp) * 100;
        const sanPercent = (this.investigator.sanity / this.investigator.maxSanity) * 100;
        
        document.getElementById('hpBar').style.width = hpPercent + '%';
        document.getElementById('hpText').textContent = `${this.investigator.hp}/${this.investigator.maxHp}`;
        
        document.getElementById('sanBar').style.width = sanPercent + '%';
        document.getElementById('sanText').textContent = `${this.investigator.sanity}/${this.investigator.maxSanity}`;
    },
    
    // 日志
    log(type, message) {
        const logPanel = document.getElementById('logPanel');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type === '成功' ? 'success' : type === '失败' ? 'failure' : 'system'}`;
        entry.textContent = message;
        logPanel.appendChild(entry);
        logPanel.scrollTop = logPanel.scrollHeight;
    },
    
    // 显示弹窗
    showModal(title, text, onConfirm) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').textContent = text;
        document.getElementById('modal').classList.add('show');
        this.modalCallback = onConfirm;
    },
    
    // 关闭弹窗
    closeModal() {
        document.getElementById('modal').classList.remove('show');
        if (this.modalCallback) {
            this.modalCallback();
            this.modalCallback = null;
        }
    },
    
    // 游戏结束
    gameOver(reason) {
        this.state.gameOver = true;
        this.showModal('游戏结束', reason + '\n\n调查员未能生还...', () => {
            location.reload();
        });
    },
    
    // 胜利
    victory(title, message) {
        this.state.victory = true;
        this.state.gameOver = true;
        this.showModal(title, message, () => {
            location.reload();
        });
    }
};

// 初始化
game.init();