# DS10 代码审查报告
**审查员:** 扣马 (codeMaster)  
**日期:** 2026-02-20  
**版本:** DS10 v0.1 / v0.3  
**状态:** ⚠️ 需要修复

---

## 📋 执行摘要

| 项目 | 状态 | 说明 |
|------|------|------|
| 语法错误 | 🟡 警告 | 1处潜在问题 |
| 对象系统 | 🟡 不完整 | 模板定义与使用分离 |
| 房间出口 | 🔴 问题 | 部分房间出口逻辑缺失 |
| 代码结构 | 🟡 需优化 | 多版本代码并存 |

---

## 1️⃣ 语法错误检查

### ✅ 通过项目
- JavaScript 语法基本正确
- 无未闭合括号或引号
- 无未定义变量（在运行上下文中）

### ⚠️ 潜在问题

**文件:** `game.js` (主文件)  
**位置:** 第 ~145 行附近

```javascript
// 问题：resolve 属性在部分 choice 中使用，但全局 resolve 对象只有 stop/truth/protect
choices: [
    { text: '"我们必须阻止仪式！"', next: 'whisper', desc: '决心+阻止', resolve: {stop: 15} },
    { text: '"他说的是真的吗？"', next: 'whisper', desc: '决心+真相', resolve: {truth: 15} },
    { text: '沉默地合上日记', next: 'whisper', desc: '冷静但冷漠', resolve: {survive: 10} }  // ❌ survive 未定义
]
```

**影响:** `game.resolve.survive` 属性在全局状态中未初始化，可能导致后续逻辑错误。

**建议修复:**
```javascript
// 第 ~10 行
resolve: { stop: 0, truth: 0, protect: 0, survive: 0 },  // 添加 survive
```

---

## 2️⃣ 对象系统完整性

### 📊 现状分析

| 组件 | 状态 | 说明 |
|------|------|------|
| 对象模板 | ✅ 定义完整 | `objectTemplates` 在 index.html 中定义了完整系统 |
| 对象使用 | 🔴 未集成 | game.js 未实际使用 objectTemplates |
| 动作系统 | 🟡 部分实现 | demo/game.js 有更完整的实现 |

### 🔴 关键问题

**版本混乱:**
- `game.js` (v0.1): 使用简化叙事系统，基于房间描述和选择
- `demo/game.js`: 使用完整对象交互系统
- `index.html`: 内联脚本定义了 `objectTemplates` 但未与 game.js 连接

**具体表现:**
1. index.html 中定义的 `objectTemplates` 包含 13 房间的完整对象配置
2. 但 `game.js` 使用的是 `rooms` 数组的叙事结构
3. 两者系统**不兼容**，实际运行的是简化版（game.js）

**建议:**
统一使用对象系统或叙事系统，建议：
- 方案A: 移除 index.html 中的 objectTemplates，专注优化 game.js 的叙事系统
- 方案B: 将 game.js 重写为使用 objectTemplates 的完整系统

---

## 3️⃣ 房间出口检查

### 📍 房间导航映射

```
entrance (0) ──► collapse (1) ──┬──► equipment (2) ──► camp (4)
                                │
                                └──► mural (3) ────────► camp (4)

camp (4) ────► whisper (5) ────► fork (6) ──┬──► teaching (7) ──► library (8) ──► ritual (10)
                                            │
                                            └──► pit (9) ────────► abyss (?) ───► ritual (10)

ritual (10) ──► 结局
```

### 🔴 发现的出口问题

#### 问题 1: `abyss` 房间未在 rooms 数组中定义
**位置:** fork 的下分支  
**影响:** 玩家选择下分支后会卡在 `abyss`，无法到达 `ritual`

```javascript
// pit 房间的选择
choices: [
    { text: '给他解脱', next: 'abyss', desc: '道德灰色', san: 5 },
    { text: '尝试救治', next: 'abyss', desc: '消耗药品', item: 'sedative', resolve: {protect: 15} }
]
// ❌ 'abyss' 房间不存在于 rooms 数组中！
```

**修复方案:**
```javascript
// 添加 abyss 房间（在 rooms 数组中，id: 'abyss'）
{
    id: 'abyss',
    name: '深渊边缘【主轴】',
    type: 'main',
    required: true,
    branch: 'lower',
    desc: `...`,
    discoveries: [...],
    choices: [
        { text: '⚔️ 迎战怪物，前往汇合点', next: 'ritual', desc: '为马库斯报仇' }
    ]
}
```

#### 问题 2: `camp` 房间的 ID 跳跃
**位置:** equipment/mural → camp  
**状态:** ✅ 功能正常（通过 `enterRoomById` 查找）

#### 问题 3: 部分出口选择缺少 `next` 或 `ending`
**检查:** 所有 choice 都有 `next` 或 `ending`  ✅

---

## 4️⃣ 其他问题

### 🟡 SAN 系统逻辑问题
```javascript
// game.js ~375行
addSanity(amount) {
    this.team.forEach(inv => {
        inv.san = Math.min(100, inv.san + amount);  // ❌ 只加不减？
    });
}
```
当前实现是**增加** SAN，但注释说"SAN伤害"，应该是**减少**。

**修复:**
```javascript
addSanity(amount) {
    // amount 为正时增加，为负时减少
    this.team.forEach(inv => {
        inv.san = Math.max(0, Math.min(100, inv.san + amount));
    });
}
```

### 🟡 HTML 引用不一致
**index.html** 加载的是内联脚本，而不是 `game.js`：
```html
<script>// 内联的 objectTemplates 和 professions...</script>
```
主 game.js 文件实际上**未被引用**！

---

## 🛠️ 修复建议（按优先级）

### 🔴 紧急（阻断性问题）
1. **添加 `abyss` 房间定义** - 否则下分支无法通关
2. **修复 `resolve.survive` 未定义** - 添加 survive: 0 到初始状态
3. **统一代码版本** - 决定使用 game.js 还是内联脚本

### 🟡 重要（体验问题）
4. **修复 SAN 增减逻辑** - 伤害应该减少 SAN
5. **确认 index.html 引用的 JS 文件** - 当前 game.js 未被使用

### 🟢 建议（优化）
6. 添加房间导航图注释
7. 为所有房间添加 `branch` 标记以便追踪
8. 添加结局条件验证（need: {truth: 20} 等未在代码中使用）

---

## 📊 代码质量评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 语法正确性 | 8/10 | 基本正确，1处小问题 |
| 系统完整性 | 5/10 | 对象系统与使用分离 |
| 导航完整性 | 6/10 | 缺少 abyss 房间 |
| 代码组织 | 4/10 | 多版本代码混乱 |
| **总分** | **5.5/10** | 需要修复后可用 |

---

**审查完成** 🐴  
扣马，2026-02-20
