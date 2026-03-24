# DS17 v2.0 三槽机制设计文档

> 版本：v2.0  
> 日期：2026-03-24  
> 状态：设计完成，待开发

---

## 1. 核心机制改版概览

### 1.1 旧版 vs 新版对比

| 特性 | v1.x (旧版) | v2.0 (新版) |
|------|-------------|-------------|
| 卡槽 | 自由堆叠区（无上限） | 3个固定卡槽 |
| 手牌区 | 有 | **移除** |
| 发牌 | 每次1张 | 批量发牌（每槽1-5张） |
| 单槽上限 | 10张 | **15张** |
| 移动 | 不支持 | **槽间移动堆叠** |
| 部分交付 | 不支持 | **支持（暂存订单）** |

---

## 2. 卡槽系统（Slot System）

### 2.1 基础规则

```
┌─────────────────────────────────────┐
│  [订单A]  [订单B]  [订单C]           │
├─────────────────────────────────────┤
│                                     │
│    [槽0]      [槽1]      [槽2]      │
│   糖果×5    饺子×3     [空槽]       │
│   [======]   [====]    [      ]     │
│                                     │
├─────────────────────────────────────┤
│  [💡提示]  [📦发牌]  [↶撤销]        │
└─────────────────────────────────────┘
```

- **固定数量**：始终显示3个槽位
- **视觉指示**：
  - 显示顶部卡牌类型图标
  - 显示顶部同类型数量（如"饺子×3"）
  - 进度条显示堆叠高度（0-15）
- **空槽状态**：显示虚线框 + "空"文字

### 2.2 堆叠规则

| 场景 | 规则 |
|------|------|
| **发牌** | 无视类型直接堆叠到槽顶（强制） |
| **移动** | 只有**同类型**才能合并到目标槽 |
| **空槽** | 可接收**任意类型**（作为缓冲区） |

---

## 3. 发牌机制

### 3.1 触发条件
- 玩家点击"📦发牌"按钮

### 3.2 发牌规则
```javascript
for each slot in [0, 1, 2]:
    if slot.cardCount >= 15:
        skip  // 该槽已满，不发
    else:
        count = random(1, 5)  // 随机1-5张
        count = min(count, 15 - slot.cardCount)  // 不超过上限
        dealCards(slot, count)
```

### 3.3 初始状态
- 游戏开始时，3槽共随机分配10张牌
- 分配可能不均匀（如 4-3-3 或 5-3-2）

---

## 4. 槽间移动机制

### 4.1 触发方式
1. 点击**源槽**（选中，绿框高亮）
2. 点击**目标槽**

### 4.2 移动规则
```javascript
function moveCards(sourceSlot, targetSlot):
    // 获取源槽顶部连续同类型数量
    topType = sourceSlot.getTopType()
    topCount = sourceSlot.getTopCount()  // 如顶上是饺子×3，返回3
    
    if targetSlot.isEmpty():
        // 空槽可接收任意类型
        moveTopNCards(sourceSlot, targetSlot, topCount)
        return success
    
    else if targetSlot.getTopType() == topType:
        // 同类型可合并
        availableSpace = 15 - targetSlot.cardCount
        moveCount = min(topCount, availableSpace)
        if moveCount == 0:
            return fail("目标槽已满")
        moveTopNCards(sourceSlot, targetSlot, moveCount)
        return success
    
    else:
        return fail("类型不匹配")
```

### 4.3 特殊情况
- 移动后源槽变空：显示"空槽"状态，不自动补牌
- 移动数量超出目标槽空间：仅移动可容纳的数量

---

## 5. 订单交付机制

### 5.1 触发方式
1. 点击**槽**（选中）
2. 点击**订单**

### 5.2 部分交付（暂存机制）
```javascript
function deliverToOrder(slot, order):
    slotTopType = slot.getTopType()
    requiredType = order.getRequiredType()
    
    if slotTopType != requiredType:
        return fail("订单不需要该类型")
    
    slotTopCount = slot.getTopCount()
    requiredCount = order.getRemainingCount()
    
    // 计算实际交付数量
    deliverCount = min(slotTopCount, requiredCount)
    
    // 移除槽中卡牌
    cards = slot.removeTop(deliverCount)
    
    // 飞到订单（动画）
    animateCardsFlying(cards, order)
    
    // 更新订单进度
    order.addProgress(slotTopType, deliverCount)
    
    // 如果槽顶还有同类型（数量超过订单需求）
    if slot.getTopType() == slotTopType:
        // 保持选中状态，可继续交付
        keepSlotSelected()
```

### 5.3 订单完成判定
- 所有需求类型都达到数量 → 订单完成
- 触发奖励计算（连击、完美奖励等）

---

## 6. 交互状态机

```
┌─────────┐    点击槽      ┌─────────────┐
│  空闲   │ ─────────────→ │ 槽已选中    │
└─────────┘                └─────────────┘
     ↑                          │
     │                          │ 点击另一槽
     │                          ↓
     │                     ┌─────────────┐
     │                     │ 尝试移动    │
     │                     │ 成功/失败   │
     │                     └─────────────┘
     │                          │
     │                          │ 点击订单
     │                          ↓
     │                     ┌─────────────┐
     │                     │ 尝试交付    │
     │                     │ 部分/完成   │
     │                     └─────────────┘
     │                          │
     └──────────────────────────┘ 完成/取消
```

---

## 7. 保留的 v1.x 功能

| 功能 | 状态 |
|------|------|
| 订单系统（简单/复合/紧急） | 保留 |
| 连击系统（M6） | 保留 |
| 完美奖励（M7） | 保留 |
| 超额惩罚（M8） | 保留（单槽上限15，超过需移动） |
| 功能卡（M5） | 保留（万能卡/刷新卡/撤销卡） |
| 关卡系统（M4） | 保留 |
| 星级评价 | 保留 |
| 音效系统 | 保留 |

---

## 8. 技术实现要点

### 8.1 数据结构
```javascript
class Slot {
  id: number              // 0, 1, 2
  cards: Card[]           // 从底到顶
  maxCards: 15
  
  isEmpty(): boolean
  getTopType(): string | null
  getTopCount(): number           // 顶部连续同类型数量
  canReceive(type: string): boolean
  addCards(cards: Card[]): void
  removeTop(n: number): Card[]
  moveTopTo(target: Slot): { success: boolean, reason?: string }
}
```

### 8.2 动画效果
- **发牌**：牌从牌堆飞到对应槽，带抛物线
- **移动**：牌从源槽飞到目标槽，堆叠到顶部
- **交付**：牌飞向订单区域，缩小消失

### 8.3 音效
- 发牌：洗牌声
- 移动成功：滑动声
- 移动失败：错误提示音
- 交付成功：硬币声

---

## 9. 任务清单

### P0 - 核心机制
- [ ] T1: 重构3槽UI布局
- [ ] T2: Slot类实现（含空槽逻辑）
- [ ] T3: 批量发牌机制（1-5张随机，上限15）
- [ ] T4: 初始10张牌分配

### P1 - 移动机制
- [ ] T5: 槽间移动（同类型合并+空槽接收）
- [ ] T6: 移动失败提示

### P2 - 订单交付
- [ ] T7: 部分交付（暂存机制）
- [ ] T8: 牌飞行动画
- [ ] T9: 连续交付（槽顶还有同类型时保持选中）

### P3 - 整合测试
- [ ] T10: 整合保留功能（连击、音效等）
- [ ] T11: 全流程测试

---

## 10. 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-24 | v2.0 | 三槽机制设计完成 |

