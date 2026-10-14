# 开发与验收 Harness

## 架构

`src/game/simulation.ts` 是唯一玩法权威。Phaser 读取键盘，将输入向量送入固定 tick，并渲染结果。单测、浏览器与机器人调用同一组模拟函数，不存在另一套无头规则。

随机使用可序列化 xorshift 状态。摘要包含种子、tick、阶段、波次、玩家/敌人状态、击杀、武器和 RNG 状态。相同种子与输入连续执行三次必须得到完全相同的摘要。

## 开发 API

在 Vite 开发服务器追加 `?dev=1`，才会动态导入并暴露 `window.__SCRAP_SWARM_DEV__`：

| 方法 | 用途 |
|---|---|
| `reset(seed)` | 重置并启动确定性对局 |
| `read()` | 读取稳定权威摘要 |
| `advance(ticks, x, y)` | 推进有界固定 tick |
| `spawn(kind, x, y)` | 生成一个合法敌人 |
| `grantScrap(amount)` | 预置经济检查 |
| `prepare(scenario)` | 建立升级/商店/首领/死亡/胜利视觉场景 |
| `setWeapons(ids)` | 建立合法武器构筑 |
| `runDeterministic(...)` | 冻结实时循环并运行浏览器确定性用例 |
| `rendererInfo()` | 证明 Canvas 渲染器已执行并输出非空像素 |
| `pause()` / `resume()` | 冻结或恢复实时权威 tick |
| `singleStep()` | 仅在暂停时推进一个权威 tick；普通结果仍保持暂停 |
| `exportSnapshot()` | 导出带版本的完整 `GameState` JSON 诊断快照 |

小型屏幕面板提供生成敌人、首领场景、暂停/继续、单步与快照下载。`read()` 返回适合确定性比较的稳定摘要，不包含所有运行字段；`exportSnapshot()` 才包含完整权威 `GameState`（玩家、敌人、掉落、武器冷却、波次、RNG、统计与事件）。`import.meta.env.DEV` 保护动态导入，生产隔离脚本扫描构建资产中的 API/控制签名。

## 测试层

- **Vitest：**移动归一化、单次击杀、升级冻结与单次应用、购买力、首领胜利、数据合法性、三次确定性，以及注入错误/看门狗超时的失败合同。
- **Playwright：**收集页面异常与未处理拒绝，使用真实键盘/按钮，验证完整场景并截图；同种子/输入分别经纯核心与真实 Canvas 渲染路径运行，在渲染发生后重新读取并比较稳定权威摘要及非空像素；另验证暂停冻结、精确单步与完整快照。
- **Bot：**五个固定种子，每局最多 150 模拟秒、36,000 次循环和 5 秒墙钟；报告配置、版本、结果、tick、波次、击杀、伤害、承伤、购买和错误。

机器人结果枚举为 `win | dead | timeout | error`。错误返回非零退出码；tick、循环和墙钟超时均独立于死亡。Playwright 遇到页面异常或断言超时即失败，并有注入异常证明合同不会输出伪成功。

## 证据位置

- 浏览器截图：`test-results/screenshots/*.png`
- 机器人报告：`reports/bot-report.json`
- Playwright 失败工件：`test-results/`
- 接受隔离扫描的生产资产：`dist/`

截图验证表现而非确定性；确定性验证状态而非视觉质量，两者都必须完成。
