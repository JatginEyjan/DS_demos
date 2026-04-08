# 奖励、商店与 Modifier 规则

## 1. 奖励槽数量

来源：

- `src/phases/select-modifier-phase.ts`
- `src/modifier/modifier-type.ts`
- `src/modifier/init-modifier-pools.ts`

`SelectModifierPhase.getModifierCount()`

基础数量：

- 默认 `3`

然后叠加：

- `ExtraModifierModifier`
- `TempExtraModifierModifier`

若有 `customModifierSettings`：

- 先统计 guaranteed 条目数
- `fillRemaining = true` 时，最终数量为 `max(原始数量, guaranteed数量)`
- `fillRemaining = false` 时，最终数量直接等于 guaranteed 数量

## 2. 奖励 tier 基础概率

`getNewModifierTypeOption()` 中，如果没有指定 tier，则先做 tier 抽取。

随机值：

```text
tierValue = randSeedInt(1024)
```

基础阈值：

- `256~1023`：`COMMON`，768/1024
- `61~255`：`GREAT`，195/1024
- `13~60`：`ULTRA`，48/1024
- `1~12`：`ROGUE`，12/1024
- `0`：`MASTER`，1/1024

## 3. 幸运值升级

### 3.1 队伍幸运值

`getPartyLuckValue(party)`

非 Daily：

- 只统计 `isAllowedInBattle()` 的队员
- 每只贡献 `getLuck()`
- 若是 event 指定的幸运加成 species，再额外 `+1`
- 总和 clamp 到 `0~14`
- 再叠加 timed event 全局幸运加成，最终上限仍是 `14`

Daily：

- 若有 daily 固定幸运值，用固定值
- 否则 `randSeedInt(15)`，即 `0~14`

### 3.2 奖励 tier 升级概率

玩家奖励在 tier 抽出后，会继续做 luck upgrade。

```text
upgradeOdds = floor(128 / ((partyLuckValue + 4) / 4))
```

然后循环：

```text
如果 randSeedInt(upgradeOdds) < 4:
  upgradeCount++
否则停止
```

即每次成功就继续尝试升级到更高一档，直到失败或没有更高 tier。

当调用时直接指定了 tier，也仍然可以按同一套逻辑继续升级，除非 `allowLuckUpgrades = false`。

## 4. 奖励项抽取

### 4.1 阈值表生成

`regenerateModifierPoolThresholds(party, poolType, rerollCount = 0)`

对每个 tier：

1. 遍历池中的 `WeightedModifierType`
2. 先看场上是否已有同类 modifier
3. 若已有且已满 stack，且不是 held item / form change item，则权重归 `0`
4. 若权重是函数，则用 `(party, rerollCount)` 计算
5. 只把权重大于 `0` 的项写进累计阈值表

### 4.2 去重规则

`getModifierTypeOptionWithRetry()`

会重抽，直到满足以下条件：

- 不与已有 option 的 `type.name` 重复
- 不与已有 option 的 `type.group` 冲突
- 满足 `ChallengeType.WAVE_REWARD`

最大重试次数：

```text
retryCount = min(count * 5, 50)
```

## 5. reroll 价格

`SelectModifierPhase.getRerollCost(lockRarities)`

### 5.1 基础价

若 `lockRarities = false`：

- `baseValue = 250`

若 `lockRarities = true`：

按当前奖励槽位的 tier 求和：

- `COMMON = 50`
- `GREAT = 125`
- `ULTRA = 300`
- `ROGUE = 750`
- `MASTER = 2000`

### 5.2 波次与重掷叠加

```text
baseMultiplier =
ceil(waveIndex / 10) * baseValue * 2^rerollCount * multiplier
```

其中 `multiplier` 默认 `1`，可被 `customModifierSettings.rerollMultiplier` 覆盖。

若 `rerollMultiplier < 0`：

- 直接返回 `-1`
- 表示该商店不能 reroll

### 5.3 最终价格修正

最后把 `baseMultiplier` 放入 `HealShopCostModifier` 再做一次修正。

## 6. 玩家奖励池

### 6.1 Common 池

关键条目与权重：

- `POKEBALL`：6，经典模式球数满 99 时为 0
- `RARE_CANDY`：2
- `POTION`：按低血人数 * 3，最大 9
- `SUPER_POTION`：按低血人数 * 1，最大 3
- `ETHER`：按缺 PP 人数 * 3，最大 9
- `MAX_ETHER`：按缺 PP 人数 * 1，最大 3
- `LURE`：10 波 lure，权重 2
- `TEMP_STAT_STAGE_BOOSTER`：4
- `BERRY`：2
- `TM_COMMON`：2

### 6.2 Great 池

关键条目与权重：

- `GREAT_BALL`：6，经典满 99 为 0
- `PP_UP`：2
- `FULL_HEAL`：状态人数 * 6，最大 18
- `REVIVE`：倒地人数 * 9，最大 27
- `MAX_REVIVE`：倒地人数 * 3，最大 9
- `SACRED_ASH`：半队以上倒地时 1
- `HYPER_POTION`：低血人数 * 3，最大 9
- `MAX_POTION`：低血人数 * 1，最大 3
- `FULL_RESTORE`：低血与状态综合，最大 3
- `ELIXIR`：缺 PP 人数 * 3，最大 9
- `MAX_ELIXIR`：缺 PP 人数 * 1，最大 3
- `DIRE_HIT`：4
- `SUPER_LURE`：4
- `NUGGET`：5，经典 199 波停发
- `SPECIES_STAT_BOOSTER`：2
- `EVOLUTION_ITEM`：`min(ceil(wave / 15), 8)`
- `MAP`：经典且 `<180` 波时 2
- `SOOTHE_BELL`：2
- `TM_GREAT`：3
- `MEMORY_MUSHROOM`：按最高等级，最多 4
- `BASE_STAT_BOOSTER`：3
- `TERA_SHARD`：队伍中存在可吃 shard 的目标时 1
- `DNA_SPLICERS`：满足融合条件时 4 / 2
- `VOUCHER`：非 Daily 且首次 reroll 前最多 1

### 6.3 Ultra 池

关键条目与权重：

- `ULTRA_BALL`：15
- `MAX_LURE`：4
- `BIG_NUGGET`：12
- `PP_MAX`：3
- `MINT`：4
- `RARE_EVOLUTION_ITEM`：`min(ceil(wave / 15) * 4, 32)`
- `FORM_CHANGE_ITEM`：`min(ceil(wave / 50), 4) * 6`
- `AMULET_COIN`：3
- `EVIOLITE`：满足可进化且未持有时 10
- `RARE_SPECIES_STAT_BOOSTER`：12
- `LEEK`：目标物种存在时 12
- `TOXIC_ORB`：满足招式 / 特性组合时 10
- `FLAME_ORB`：满足招式 / 特性组合时 10
- `MYSTICAL_ROCK`：有天气或场地相关招式 / 特性时 10
- `REVIVER_SEED`：4
- `CANDY_JAR`：5
- `ATTACK_TYPE_BOOSTER`：9
- `TM_ULTRA`：11
- `RARER_CANDY`：4
- `GOLDEN_PUNCH`：2
- `IV_SCANNER`：4
- `EXP_CHARM`：8
- `EXP_SHARE`：10
- `TERA_ORB`：经典模式为 0，其他模式 `1~4`
- `QUICK_CLAW`：3
- `WIDE_LENS`：7

### 6.4 Rogue 池

- `ROGUE_BALL`：16
- `RELIC_GOLD`：2
- `LEFTOVERS`：3
- `SHELL_BELL`：3
- `BERRY_POUCH`：4
- `GRIP_CLAW`：5
- `SCOPE_LENS`：4
- `BATON`：2
- `SOUL_DEW`：7
- `CATCHING_CHARM`：非经典 4
- `ABILITY_CHARM`：6，经典 189 波后停发
- `FOCUS_BAND`：5
- `KINGS_ROCK`：3
- `LOCK_CAPSULE`：非经典 3
- `SUPER_EXP_CHARM`：8
- `RARE_FORM_CHANGE_ITEM`：最高 24
- `MEGA_BRACELET`：最高 36
- `DYNAMAX_BAND`：最高 36
- `VOUCHER_PLUS`：非 Daily，权重随 rerollCount 下降

### 6.5 Master 池

- `MASTER_BALL`：24
- `SHINY_CHARM`：14
- `HEALING_CHARM`：18
- `MULTI_LENS`：18
- `VOUCHER_PREMIUM`：仅非 Daily、非 Endless、非 SplicedOnly，最高 5
- `DNA_SPLICERS`：满足条件时 24
- `MINI_BLACK_HOLE`：已解锁或 Daily 时 1

## 7. 商店道具池

`getPlayerShopModifierTypeOptionsForWave(waveIndex, baseCost)`

每 10 波结算点之外才有商店道具列表。

### 7.1 解锁层级

按 `ceil(max(waveIndex + 10, 0) / 30)` 解锁更多层。

层级列表：

1. `POTION 0.2x`，`ETHER 0.4x`，`REVIVE 2x`
2. `SUPER_POTION 0.45x`，`FULL_HEAL 1x`
3. `ELIXIR 1x`，`MAX_ETHER 1x`
4. `HYPER_POTION 0.8x`，`MAX_REVIVE 2.75x`，`MEMORY_MUSHROOM 4x`
5. `MAX_POTION 1.5x`，`MAX_ELIXIR 2.5x`
6. `FULL_RESTORE 2.25x`
7. `SACRED_ASH 10x`

这些价格最终还会经过挑战过滤与价格修正。

## 8. 敌方持有物生成

`BattleScene.generateEnemyModifiers()`

### 8.1 生成次数

```text
difficultyWaveIndex = gameMode.getWaveForDifficulty(currentWave)
chances = ceil(difficultyWaveIndex / 10)
```

若是最终 Boss：

```text
chances = ceil(chances * 2.5)
```

### 8.2 单次是否成功加物品

对每次 chance：

```text
if randSeedInt(gameMode.getEnemyModifierChance(isBoss)) === 0:
  count++
```

不同模式分母：

- 经典 / 挑战 / Daily：
  - Boss `1/6`
  - 非 Boss `1/18`
- Endless / Spliced Endless：
  - Boss `1/4`
  - 非 Boss `1/12`

Boss 额外保底：

```text
count = max(count, floor(chances / 2))
```

### 8.3 敌方物品升级

传给 `getEnemyModifierTypesForWave()` 的 `upgradeChance`：

- 普通：`32`
- Boss：`16`
- 最终 Boss：`4`

实际逻辑：

```text
upgradeCount = upgradeChance && randSeedInt(upgradeChance) === 0 ? 1 : 0
```

只升 1 档。

### 8.4 敵方池

野生池：

- `COMMON`: `BERRY`
- `GREAT`: `BASE_STAT_BOOSTER`
- `ULTRA`: `ATTACK_TYPE_BOOSTER`
- `ROGUE`: `LUCKY_EGG`
- `MASTER`: `GOLDEN_EGG`

训练家池：

- `COMMON`: `BERRY`, `BASE_STAT_BOOSTER`
- `GREAT`: `BASE_STAT_BOOSTER`
- `ULTRA`: `ATTACK_TYPE_BOOSTER`
- `ROGUE`: `FOCUS_BAND`, `LUCKY_EGG`, `QUICK_CLAW`, `GRIP_CLAW`, `WIDE_LENS`
- `MASTER`: `KINGS_ROCK`, `LEFTOVERS`, `SHELL_BELL`, `SCOPE_LENS`
