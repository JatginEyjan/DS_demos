// RW01 - 少年宗门 - UI渲染
// 处理所有界面渲染和交互

class UI {
    constructor() {
        this.currentTab = 'sect';
        this.discipleSubTab = 'list';
    }

    init() {
        this.bindTabEvents();
        this.render();
    }

    // ===== 事件绑定 =====

    bindTabEvents() {
        // 底部页签
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    switchTab(tab) {
        this.currentTab = tab;

        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // 渲染对应内容
        this.render();
    }

    // ===== 主渲染 =====

    render() {
        const container = document.getElementById('contentArea');
        if (!container) {
            console.error('UI render error: contentArea not found');
            return;
        }
        container.innerHTML = '';

        switch (this.currentTab) {
            case 'sect':
                this.renderSect(container);
                break;
            case 'disciple':
                this.renderDisciples(container);
                break;
            case 'order':
                this.renderOrders(container);
                break;
            case 'bag':
                this.renderBag(container);
                break;
            case 'battle':
                this.renderBattle(container);
                break;
        }
    }

    // ===== 顶部栏更新 =====

    updateTopBar() {
        const realmName = document.getElementById('realmName');
        const expFill = document.getElementById('expFill');
        const expText = document.getElementById('expText');
        const stoneCount = document.getElementById('stoneCount');

        if (!realmName || !expFill || !expText || !stoneCount) {
            return; // 元素可能还没加载
        }

        // 境界名
        realmName.textContent = game.getRealmName();

        // 经验进度
        const exp = game.getExpProgress();
        expFill.style.width = `${exp.percent}%`;
        expText.textContent = `${exp.current}/${exp.needed}`;

        // 灵石
        stoneCount.textContent = GameState.resources.stone.toLocaleString();
    }

    // ===== 宗门页面 =====

    renderSect(container) {
        if (!container) {
            console.error('renderSect error: container is undefined');
            return;
        }
        const list = document.createElement('div');
        list.className = 'list-container';

        for (const [key, building] of Object.entries(GameState.buildings)) {
            const config = CONFIG.BUILDINGS[key];
            const item = document.createElement('div');
            item.className = 'list-item';

            if (!building.built && config.unlockRealm !== undefined) {
                // 未解锁
                const unlockRealmName = CONFIG.REALMS[config.unlockRealm].name;
                item.innerHTML = `
                    <div class="list-item-header">
                        <span class="item-title">${config.name}</span>
                        <span class="item-level">🔒 ${unlockRealmName}解锁</span>
                    </div>
                    <div class="item-desc">${config.desc}</div>
                `;
            } else if (!building.built) {
                // 可建造
                const cost = config.cost[0];
                const canBuild = GameState.resources.stone >= cost;
                item.innerHTML = `
                    <div class="list-item-header">
                        <span class="item-title">${config.name}</span>
                        <span class="item-level">未建造</span>
                    </div>
                    <div class="item-desc">${config.desc}</div>
                    <div class="item-action">
                        <button class="btn btn-primary" ${!canBuild ? 'disabled' : ''} onclick="game.buildBuilding('${key}')">
                            建造 ${cost}💎
                        </button>
                    </div>
                `;
            } else {
                // 已建造，可升级
                const isMaxLevel = building.level >= config.cost.length;
                const cost = isMaxLevel ? 0 : config.cost[building.level - 1];
                const canUpgrade = !isMaxLevel && GameState.resources.stone >= cost;

                let effectText = '';
                if (key === 'inn') {
                    effectText = `上阵槽位: ${config.effect(building.level)}/${config.effect(building.level)}`;
                } else if (key === 'pharmacy') {
                    effectText = `恢复速度: ${config.effect(building.level)}hp/s`;
                }

                item.innerHTML = `
                    <div class="list-item-header">
                        <span class="item-title">${config.name}</span>
                        <span class="item-level">Lv.${building.level}</span>
                    </div>
                    <div class="item-desc">${config.desc} | ${effectText}</div>
                    <div class="item-action">
                        ${isMaxLevel ? 
                            '<span style="color: var(--accent-gold)">已满级</span>' :
                            `<button class="btn btn-primary" ${!canUpgrade ? 'disabled' : ''} onclick="game.upgradeBuilding('${key}')">
                                升级 ${cost}💎
                            </button>`
                        }
                    </div>
                `;
            }

            list.appendChild(item);
        }

        container.appendChild(list);
    }

    // ===== 弟子页面 =====

    renderDisciples(container) {
        if (!container) {
            console.error('renderDisciples error: container is undefined');
            return;
        }
        // 子页签
        const subTabs = document.createElement('div');
        subTabs.className = 'sub-tabs';
        subTabs.innerHTML = `
            <button class="sub-tab ${this.discipleSubTab === 'list' ? 'active' : ''}" onclick="ui.switchDiscipleTab('list')">弟子列表</button>
            <button class="sub-tab ${this.discipleSubTab === 'recruit' ? 'active' : ''}" onclick="ui.switchDiscipleTab('recruit')">招募弟子</button>
        `;
        container.appendChild(subTabs);

        if (this.discipleSubTab === 'list') {
            this.renderDiscipleList(container);
        } else {
            this.renderRecruit(container);
        }
    }

    switchDiscipleTab(tab) {
        this.discipleSubTab = tab;
        this.render();
    }

    renderDiscipleList(container) {
        const list = document.createElement('div');
        list.className = 'list-container';

        GameState.disciples.forEach(disciple => {
            const q = CONFIG.DISCIPLE_QUALITIES[disciple.quality];
            const item = document.createElement('div');
            item.className = 'list-item';

            const realm = GameState.sectMaster.realm;
            const maxLevel = CONFIG.REALMS[realm].maxDiscipleLevel;
            const isMaxLevel = disciple.level >= maxLevel;
            const upgradeCost = isMaxLevel ? 0 : Math.floor(100 * Math.pow(2, disciple.level - 1) * q.costMult);
            const canUpgrade = !isMaxLevel && GameState.resources.stone >= upgradeCost;

            item.innerHTML = `
                <div class="list-item-header">
                    <span class="item-title" style="color: ${q.color}">
                        ${disciple.quality === 'blue' ? '💙' : disciple.quality === 'purple' ? '💜' : '🧡'}
                        ${disciple.name}
                    </span>
                    <span class="item-level">Lv.${disciple.level}</span>
                </div>
                <div class="item-desc">
                    HP: ${disciple.hp}/${disciple.maxHp} | 攻击: ${disciple.atk}<br>
                    <small style="color: var(--text-secondary)">${disciple.background}</small>
                </div>
                <div class="item-action">
                    ${isMaxLevel ? 
                        '<span style="color: var(--text-secondary)">已达境界上限</span>' :
                        `<button class="btn btn-primary" ${!canUpgrade ? 'disabled' : ''} onclick="game.upgradeDisciple(${disciple.id})">
                            升级 ${upgradeCost}💎
                        </button>`
                    }
                </div>
            `;

            list.appendChild(item);
        });

        container.appendChild(list);
    }

    renderRecruit(container) {
        checkDailyReset();

        const remaining = CONFIG.RECRUIT.dailyLimit - GameState.recruitCount;
        const canRecruit = remaining > 0 && GameState.resources.stone >= CONFIG.RECRUIT.cost;

        const div = document.createElement('div');
        div.style.cssText = 'text-align: center; padding: 40px 20px;';
        div.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 30px;">招募弟子</div>
            <div style="background: var(--bg-secondary); border-radius: 20px; padding: 30px; margin-bottom: 20px; display: inline-block;">
                <div style="font-size: 48px; margin-bottom: 10px;">🎫</div>
                <div style="font-size: 14px; color: var(--text-secondary);">招募令</div>
                <div style="font-size: 16px; margin-top: 10px;">消耗 ${CONFIG.RECRUIT.cost}💎</div>
            </div>
            <div style="margin-bottom: 20px; font-size: 13px; color: var(--text-secondary);">
                品质概率: 蓝70% 紫25% 橙5%
            </div>
            <button class="btn btn-primary" style="padding: 15px 40px; font-size: 16px;" 
                ${!canRecruit ? 'disabled' : ''} onclick="ui.doRecruit()">
                招募
            </button>
            <div style="margin-top: 20px; font-size: 13px; color: var(--text-secondary);">
                今日已招募: ${GameState.recruitCount}/${CONFIG.RECRUIT.dailyLimit}
            </div>
        `;

        container.appendChild(div);
    }

    doRecruit() {
        const result = game.recruitDisciple();
        if (result.success) {
            alert(`招募成功！获得${CONFIG.DISCIPLE_QUALITIES[result.disciple.quality].name}品质弟子：${result.disciple.name}`);
            this.render();
        } else {
            alert(result.reason);
        }
    }

    // ===== 订单页面 =====

    renderOrders(container) {
        if (!container) {
            console.error('renderOrders error: container is undefined');
            return;
        }
        checkDailyReset();

        // 刷新按钮
        const refreshDiv = document.createElement('div');
        refreshDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        const remainingRefresh = CONFIG.ORDER.manualRefreshLimit - GameState.refreshCount;
        const canRefresh = remainingRefresh > 0 && GameState.resources.stone >= CONFIG.ORDER.manualRefreshCost;
        refreshDiv.innerHTML = `
            <span style="font-size: 14px; color: var(--text-secondary);">当前订单 (${GameState.orders.length}/${CONFIG.ORDER.maxCount})</span>
            <button class="btn btn-secondary" ${!canRefresh ? 'disabled' : ''} onclick="ui.doRefreshOrders()">
                刷新 ${remainingRefresh}/${CONFIG.ORDER.manualRefreshLimit} ↻
            </button>
        `;
        container.appendChild(refreshDiv);

        // 订单列表
        const list = document.createElement('div');
        list.className = 'list-container';

        GameState.orders.forEach(order => {
            const typeConfig = CONFIG.ORDER.types[order.type];
            const item = document.createElement('div');
            item.className = `list-item order-${order.type}`;

            // 计算剩余时间
            let timeText = '';
            if (order.timeLimit > 0) {
                const remaining = order.timeLimit - (Date.now() - order.createTime);
                if (remaining > 0) {
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    timeText = `${minutes}:${seconds.toString().padStart(2, '0')} 后过期`;
                }
            }

            // 检查材料是否足够
            let canSubmit = true;
            let reqText = '';
            for (const [mat, count] of Object.entries(order.requirements)) {
                const has = GameState.inventory[mat];
                const matName = CONFIG.MATERIALS[mat].name;
                reqText += `${matName}×${count} `;
                if (has < count) canSubmit = false;
            }

            item.innerHTML = `
                <div class="list-item-header">
                    <span class="item-title" style="color: ${typeConfig.color}">${typeConfig.name}: 采集材料</span>
                </div>
                <div class="item-desc">
                    需求: ${reqText}<br>
                    奖励: 经验+${order.reward.exp} 灵石+${order.reward.stone}
                    ${timeText ? `<br><small style="color: ${typeConfig.color}">${timeText}</small>` : ''}
                </div>
                <div class="item-action">
                    <button class="btn btn-primary" ${!canSubmit ? 'disabled' : ''} onclick="ui.doCompleteOrder(${order.id})">
                        提交
                    </button>
                </div>
            `;

            list.appendChild(item);
        });

        container.appendChild(list);
    }

    doRefreshOrders() {
        const result = game.refreshOrders();
        if (!result.success) {
            alert(result.reason);
        }
    }

    doCompleteOrder(orderId) {
        const success = game.completeOrder(orderId);
        if (!success) {
            alert('材料不足');
        }
    }

    // ===== 背包页面 =====

    renderBag(container) {
        if (!container) {
            console.error('renderBag error: container is undefined');
            return;
        }
        const div = document.createElement('div');

        // 材料
        const materialsDiv = document.createElement('div');
        materialsDiv.innerHTML = '<h3 style="margin-bottom: 16px; font-size: 16px;">材料</h3>';

        const items = document.createElement('div');
        items.style.cssText = 'display: flex; flex-wrap: wrap; gap: 12px;';

        for (const [key, mat] of Object.entries(CONFIG.MATERIALS)) {
            const count = GameState.inventory[key];
            const item = document.createElement('div');
            item.style.cssText = 'background: var(--bg-secondary); padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 8px;';
            item.innerHTML = `
                <span style="font-size: 24px;">${mat.icon}</span>
                <span>${mat.name}×${count}</span>
            `;
            items.appendChild(item);
        }

        materialsDiv.appendChild(items);
        div.appendChild(materialsDiv);

        container.appendChild(div);
    }

    // ===== 战场页面 =====

    renderBattle(container) {
        if (!container) {
            console.error('renderBattle error: container is undefined');
            return;
        }
        const div = document.createElement('div');

        // 上阵槽位
        const slotsTitle = document.createElement('h3');
        slotsTitle.textContent = `上阵槽位 (${GameState.battleSlots.filter(s => s).length}/${GameState.battleSlots.length})`;
        slotsTitle.style.cssText = 'margin-bottom: 16px; font-size: 16px;';
        div.appendChild(slotsTitle);

        const slots = document.createElement('div');
        slots.className = 'battle-slots';

        GameState.battleSlots.forEach((disciple, index) => {
            const monster = GameState.monsters[index];
            const slot = document.createElement('div');
            slot.className = `battle-slot ${!disciple ? 'empty' : ''}`;

            if (!disciple) {
                slot.innerHTML = '<span onclick="ui.showAssignDisciple(' + index + ')">[+] 点击上阵</span>';
            } else {
                const q = CONFIG.DISCIPLE_QUALITIES[disciple.quality];
                const isRecovering = disciple.state === 'recovering';

                slot.innerHTML = `
                    <div style="color: ${q.color}; font-weight: bold; margin-bottom: 8px;">
                        ${disciple.name}
                    </div>
                    <div style="font-size: 13px; margin-bottom: 8px;">
                        ${isRecovering ? 
                            `<span style="color: var(--accent-gold)">恢复中...</span>` :
                            `HP: ${disciple.hp}/${disciple.maxHp}`
                        }
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">vs</div>
                    <div style="font-size: 13px; margin-top: 8px;">
                        ${monster.name}<br>
                        HP: ${monster.currentHp}/${monster.hp}
                    </div>
                    <button class="btn btn-secondary" style="margin-top: 8px; padding: 5px 10px; font-size: 12px;" 
                        onclick="game.battle.removeDisciple(${index}); ui.render()">
                        下阵
                    </button>
                `;
            }

            slots.appendChild(slot);
        });

        div.appendChild(slots);

        // 累计掉落
        const dropsDiv = document.createElement('div');
        dropsDiv.className = 'drop-preview';
        dropsDiv.innerHTML = '<h3 style="margin-bottom: 12px; font-size: 14px; color: var(--text-secondary);">累计掉落</h3>';

        const dropItems = document.createElement('div');
        dropItems.className = 'drop-items';

        for (const [key, mat] of Object.entries(CONFIG.MATERIALS)) {
            const count = GameState.battleDrops[key];
            if (count > 0) {
                const item = document.createElement('div');
                item.className = 'drop-item';
                item.innerHTML = `${mat.icon}${mat.name}×${count}`;
                dropItems.appendChild(item);
            }
        }

        if (dropItems.children.length === 0) {
            dropItems.innerHTML = '<span style="color: var(--text-secondary); font-size: 13px;">暂无掉落</span>';
        }

        dropsDiv.appendChild(dropItems);
        div.appendChild(dropsDiv);

        container.appendChild(div);
    }

    showAssignDisciple(slotIndex) {
        const available = GameState.disciples.filter(d => d.state === 'idle');
        if (available.length === 0) {
            alert('没有空闲的弟子');
            return;
        }

        // 创建选择弹窗
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--bg-secondary);
            border-radius: 16px;
            padding: 24px;
            max-width: 320px;
            width: 90%;
        `;

        const title = document.createElement('h3');
        title.textContent = '选择上阵弟子';
        title.style.cssText = 'margin-bottom: 16px; text-align: center;';
        content.appendChild(title);

        const list = document.createElement('div');
        list.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

        available.forEach(disciple => {
            const q = CONFIG.DISCIPLE_QUALITIES[disciple.quality];
            const btn = document.createElement('button');
            btn.style.cssText = `
                padding: 12px;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                color: ${q.color};
                cursor: pointer;
                text-align: left;
            `;
            btn.innerHTML = `
                <div style="font-weight: bold;">${disciple.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    Lv.${disciple.level} | HP:${disciple.hp}/${disciple.maxHp} | 攻:${disciple.atk}
                </div>
            `;
            btn.onclick = () => {
                game.battle.assignDisciple(slotIndex, disciple.id);
                modal.remove();
                this.render();
            };
            list.appendChild(btn);
        });

        content.appendChild(list);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            margin-top: 16px;
            width: 100%;
            padding: 10px;
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-secondary);
            cursor: pointer;
        `;
        cancelBtn.onclick = () => modal.remove();
        content.appendChild(cancelBtn);

        modal.appendChild(content);
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        document.body.appendChild(modal);
    }

    showNewDrop() {
        // 新掉落高亮效果，可在后续实现
    }

    // ===== 升级特效 =====

    showLevelUp(newRealm) {
        const overlay = document.getElementById('levelUpOverlay');
        const title = document.querySelector('.level-up-title');
        const text = document.getElementById('levelUpText');
        const bubbles = document.getElementById('congratsBubbles');
        const unlock = document.getElementById('unlockContent');

        if (!overlay || !title || !text || !bubbles || !unlock) {
            console.error('showLevelUp error: required elements not found');
            return;
        }

        const realmName = CONFIG.REALMS[newRealm]?.name || '未知境界';
        const unlocks = CONFIG.REALMS[newRealm]?.unlocks || [];

        title.textContent = '轰！';
        text.textContent = `突破至 ${realmName}！`;

        // 祝贺气泡
        bubbles.innerHTML = '';
        const messages = CONFIG.CONGRATS_MESSAGES.slice(0, 3);
        messages.forEach((msg, i) => {
            setTimeout(() => {
                const bubble = document.createElement('div');
                bubble.className = 'bubble';
                bubble.textContent = msg;
                bubbles.appendChild(bubble);
            }, 1000 + i * 300);
        });

        // 解锁内容
        unlock.innerHTML = '';
        if (unlocks.length > 0) {
            const unlockText = unlocks.map(u => CONFIG.BUILDINGS[u].name).join('、');
            unlock.innerHTML = `<div>解锁: ${unlockText}</div>`;
        }

        // 显示
        overlay.classList.add('show');

        // 自动关闭
        setTimeout(() => {
            overlay.classList.remove('show');
        }, 5000);
    }

    showGameComplete() {
        alert('恭喜！你已突破至最高境界，宗门飞升！');
    }
}

// UI实例
let ui;
