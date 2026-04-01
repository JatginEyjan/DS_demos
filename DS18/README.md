# DS18

基于 `DS18/docs` 文档实现的 Web MVP 原型，入口为 [index.html](/Volumes/Ex01/PAMH/DS_demos/DS18/index.html)。

当前版本包含：

- 3 天短线战役
- 规划 / 执行 / 结算 / Boss 的完整循环
- 房间卡、NPC 卡、事件卡、消耗品、篝火与返回卡
- 自动战斗、灵魂掉落回收、篝火升级、铁匠强化、商人商店
- localStorage 自动存档

运行方式：

1. 在仓库根目录执行 `npm run serve`
2. 打开 `http://localhost:8888/DS18/`

说明：

- 为了贴合当前仓库的 demo 结构，这个实现采用原生 `HTML + CSS + ES Modules`，不依赖构建工具。
- 代码结构已参考技术文档重组为 `config / core / scenes / systems / entities / cards / data / ui / utils`。
- 部分数值和交互在不违背文档核心设计的前提下做了 MVP 化简，优先保证完整可玩。
