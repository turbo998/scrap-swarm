# 废土斗机祭 / Scrap Swarm

原创 PC 浏览器单机竞技场游戏。大崩落后的第 87 年，“铁冠联盟”以荒原巡回机甲赛控制各聚落的能源配额。绿溪技师岚·韦斯修复旧维护机 R-17，并赋予它“锻火拳”的斗士称号；玩家要连胜三场、击败联盟冠军“铁冠·赫克托”，夺回维持净水系统的能源核心。

叙事和演出采用原创热血机甲竞技风格：回合章标题、赛场广播、宿敌宣言、夸张速度线、炉心斗气与击破爆发；不复刻任何既有动画的角色、机体、台词或具体剧情。使用 **WASD 或方向键**移动，三种武器自动攻击：

- **爆铆拳炮**：高速单体精确射击。
- **震磁圆阵**：近距离范围冲击波。
- **雷索连击**：最多命中三个敌人的连锁闪电。

熬过两轮机械群，在波次间用废料改装或维修，最后击毁冠军机**铁冠·赫克托**。升级时战斗暂停；胜利和死亡都可立即重建。按 `P` 暂停。

## 启动

需要 Node.js 20.19 或更高版本。

```powershell
npm install
npm run dev
```

打开 <http://127.0.0.1:4173>。Phaser 负责输入与渲染，带种子的固定 tick TypeScript 模拟负责权威玩法。

原创故事与角色概念设定集：<http://127.0.0.1:4173/design/>。对应文字圣经见 [STORY_BIBLE.md](docs/STORY_BIBLE.md) 与 [CHARACTER_DESIGN.md](docs/CHARACTER_DESIGN.md)。

## 验收命令

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run check:prod
npm run test:e2e
npm run bot
npm run verify
```

`npm run test:e2e` 将场景截图写入 `test-results/screenshots/`。`npm run bot` 将五个固定种子的有界报告写入 `reports/bot-report.json`。开发控制仅在 Vite 开发构建的 `/?dev=1` 暴露，生产包会扫描并阻止泄漏。

范围、规则和证据语义见[游戏设计](docs/GDD.md)与 [Harness 合同](docs/HARNESS.md)；剧情、角色和视觉设定见[故事圣经](docs/STORY_BIBLE.md)、[角色设计圣经](docs/CHARACTER_DESIGN.md)与[美术方向](docs/ART_DIRECTION.md)；提示词工程材料见[五个 Copilot 提示词模板](docs/PROMPTS.md)。
