# 训练家、Boss 与敌方 AI 规则

## 1. 训练家生成

来源：

- `src/battle-scene.ts`
- `src/field/trainer.ts`
- `src/trainers/trainer-config.ts`
- `src/docs/enemy-ai.md`

## 1.1 训练家单双打

`BattleScene.generateNewBattleTrainer(waveIndex)`

判定顺序：

1. `config.doubleOnly` 为真，直接双打
2. 如果 trainer 配置不支持双打，直接单打
3. 否则：

```text
doubleTrainer = randSeedInt(getDoubleBattleChance(waveIndex)) === 0
```

### 1.2 训练家外观 variant

- 双打训练家直接 `TrainerVariant.DOUBLE`
- 否则优先读 override
- 再否则 `50% FEMALE / 50% DEFAULT`

## 2. 敌方 AI 类型

`EnemyPokemon.constructor()`

默认规则：

- Boss 或训练家拥有的敌人：`AiType.SMART`
- 其他野生敌人：`AiType.SMART_RANDOM`

## 3. 出招流程

`EnemyPokemon.getNextMove()`

执行顺序：

1. 先检查 move queue 中是否已有排队中的可用招式
2. 若队列为空或全不可用，重新从当前 moveset 选
3. 过滤掉不可用招式
4. 若没有任何可用招式，使用 `STRUGGLE`
5. 若只剩 1 个可用招式，直接使用
6. 若存在 `Encore`，且被 Encore 的招式仍可用，强制该招式
7. 否则进入 AI 评分逻辑

## 4. 斩杀优先

`getNextMove()` 在进入评分前，会先筛一轮 `koMoves`。

满足以下条件的攻击招式会进入 `koMoves`：

- 不是状态招式
- 目标不是 `ATTACKER`
- 不会因天气或 `applyConditions()` 直接失败
- 模拟伤害 `>= target.hp`

如果 `koMoves.length > 0`：

- 本回合只会在 `koMoves` 里继续选

## 5. 招式评分

### 5.1 单目标评分

每个候选目标的 `targetScore`：

```text
targetScore =
move.getUserBenefitScore(user, target, move)
+ move.getTargetBenefitScore(user, target, move) * allyOrEnemySign
```

其中：

- 目标是敌人：乘 `+1`
- 目标是友军：乘 `-1`

### 5.2 明确失败的招式

若以下任一成立：

- 招式名以 `" (N)"` 结尾
- `move.applyConditions()` 返回 false

则该目标评分强制为：

- `-20`

部分先制反击招式例外：

- `SUCKER_PUNCH`
- `UPPER_HAND`
- `THUNDERCLAP`

### 5.3 攻击招式额外倍率

若招式属于 `AttackMove`：

- 对敌方目标：
  - 乘 `effectiveness`
  - 若是本系，再乘 `1.5`
- 对友军目标：
  - 除以 `effectiveness`
  - 若是本系，再除以 `1.5`

若乘完之后还是 `0`，视为未实现：

- 评分直接改为 `-20`

### 5.4 多目标招式

一个招式可能有多个 targetScore。

该招式最终分数取：

```text
moveScore = max(targetScores)
```

## 6. SMART_RANDOM 与 SMART 的选招差异

### 6.1 SMART_RANDOM

先把招式按得分降序排序。

然后：

```text
while 还有下一个招式 && randSeedInt(8) >= 5:
  选择下一个招式
```

即：

- 有 `5/8` 概率停在当前最佳招式
- 有 `3/8` 概率继续往次优招式走一格
- 可以连续向下走

### 6.2 SMART

也是先按分数降序排序。

之后比较相邻两个招式的分数比：

```text
ratio = nextScore / currentScore
若 ratio >= 0 且 randSeedInt(100) < round(ratio * 50):
  继续下移到次优招式
```

也就是：

- 次优分数越接近最优分数，越容易被选中
- 不是永远 100% 选第一名

## 7. 目标选择

`EnemyPokemon.getNextTargets(moveId)`

### 7.1 多目标招式

如果招式本身是 multi-target：

- 返回所有合法目标 index

### 7.2 单目标招式

对每个候选目标计算：

```text
benefitScore =
move.getTargetBenefitScore(user, target, move) * allyOrEnemySign
```

其中：

- 攻击友军时乘 `+1`
- 攻击敌方时乘 `-1`

### 7.3 负权补正

若最低 benefitScore 小于 `1`：

- 给所有分数统一加上 `abs(lowestWeight - 1)`

保证所有权重至少为正。

### 7.4 剪枝

如果某个目标权重低于最高权重的一半：

- 该目标及其后续更低目标全部剔除

### 7.5 最终抽取

对保留目标按权重做累计阈值随机。

## 8. 训练家换人逻辑

训练家战斗时，`trainer.genAI(enemyParty)` 会在遭遇阶段初始化 AI。

具体的“是否换人”决策分散在训练家与 phase 中，核心依赖：

- 当前 matchup 评分
- 场上剩余单位
- 目标是否能上场
- 是否双打

该系统已经有单独源码文档：

- `src/docs/enemy-ai.md`

## 9. Boss 系统

### 9.1 Boss 来源

以下任一会令敌人以 Boss 形式生成：

- 波次是 `X0`
- species 是神兽 / 幻兽 / 次神
- 随机 Boss 模式触发
- 最终 Boss 或特殊固定战强制

### 9.2 Boss 段数

详见 `02-地图-遭遇-敌人生成规则.md`

### 9.3 Boss 被动

`Pokemon.hasPassive()`

敌方在以下情况不会启用 passive：

- 经典最终 Boss
- Endless minor boss
- Endless major boss
- 且当前未启用 `PASSIVES` challenge

除此之外：

- 敌方 Boss 默认视为 `hasPassive = true`

### 9.4 Boss 破盾增益

仅野生 Boss 默认会在破段时触发能力提升。

提升规则：

- 从未满 stage 的有效能力中选 1 项
- 权重等于该能力当前永久数值
- 普通破段 `+1`
- 3 段以上最后一段 `+2`
- 5 段以上倒数第二段 `+2`

## 10. 敌方持有物与强化 buff

### 10.1 持有物

普通敌人持有物由 `generateEnemyModifiers()` 生成，详见奖励文档。

### 10.2 敌方永久 buff 池

`enemyBuffModifierPool`

`COMMON`：

- `ENEMY_DAMAGE_BOOSTER` 9
- `ENEMY_DAMAGE_REDUCTION` 9
- `ENEMY_ATTACK_POISON_CHANCE` 3
- `ENEMY_ATTACK_PARALYZE_CHANCE` 3
- `ENEMY_ATTACK_BURN_CHANCE` 3
- `ENEMY_STATUS_EFFECT_HEAL_CHANCE` 9
- `ENEMY_ENDURE_CHANCE` 4
- `ENEMY_FUSED_CHANCE` 1

`GREAT`：

- `ENEMY_DAMAGE_BOOSTER` 5
- `ENEMY_DAMAGE_REDUCTION` 5
- `ENEMY_STATUS_EFFECT_HEAL_CHANCE` 5
- `ENEMY_ENDURE_CHANCE` 5
- `ENEMY_FUSED_CHANCE` 1

`ULTRA`：

- `ENEMY_DAMAGE_BOOSTER` 10
- `ENEMY_DAMAGE_REDUCTION` 10
- `ENEMY_HEAL` 10
- `ENEMY_STATUS_EFFECT_HEAL_CHANCE` 10
- `ENEMY_ENDURE_CHANCE` 10
- `ENEMY_FUSED_CHANCE` 5

### 10.3 敌方 buff stack 数

`getEnemyBuffModifierForWave(tier, enemyModifiers)`

- `COMMON`: stack `1`
- `GREAT`: stack `3`
- `ULTRA`: stack `5`

同类 buff 若即将超过最大 stack，会最多重抽 50 次。
