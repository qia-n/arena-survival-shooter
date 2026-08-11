# ⚡ 竞技场（模块化版）

单文件版 `hh.html` 的**模块化重构版本**，位于本目录 `modular/`。原版 `hh.html` 与备份 `hh_original.html` 保留在仓库根目录，可随时回退。

## 目录结构

```
modular/
├── index.html              # 入口（加载 4 个 js + css）
├── css/
│   └── style.css           # 全部样式（从 hh.html 提取）
├── js/
│   ├── constants.js        # 全局常量（玩家/世界/升级上限）+ 工具函数
│   ├── enemy-config.js     # ★ 敌人/Boss 配置数据（数值调整只改这里）
│   ├── enemies.js          # ★ 敌人/Boss 生成与 AI 逻辑（行为调整改这里）
│   └── game.js             # 主游戏逻辑（玩家/子弹/渲染/UI/事件/循环）
└── smoke.js                # 冒烟测试（node smoke.js）
```

## 加载顺序与依赖

```
constants.js ─┐
enemy-config.js ─┤→ enemies.js → game.js（index.html 按此顺序引入）
```

- `constants.js` / `enemy-config.js`：纯数据，零依赖，挂载到 `window`（`CONSTANTS` / `ENEMY_CONFIG`），并暴露同名全局常量（`ENEMY_STATS`、`MELEE_ATTACKS` 等）
- `enemies.js`：`window.EnemySystem` 模块，通过 `EnemySystem.init(deps)` 依赖注入 `state / worldW / worldH / view() / 特效 / 音效 / gameOver`
- `game.js`：保留原 IIFE 结构，敌人部分全部调用 `EnemySystem.*`

## 如何调整（不再动主文件）

| 想改什么 | 改哪个文件 |
|---|---|
| 敌人体型/血量倍率/移速倍率 | `enemy-config.js` → `enemyStats` |
| 特殊怪解锁波次/每波上限 | `enemy-config.js` → `specialTypes` |
| Boss 技能参数（近战/远程/母体） | `enemy-config.js` → `meleeAttacks` / `mother` 等 |
| 母体中毒/毒雾/狂暴数值 | `enemy-config.js` → `mother` |
| 敌人行为逻辑（AI 状态机） | `enemies.js` |
| 玩家/升级/渲染/UI | `game.js` |

## 重新生成（当 hh.html 有改动时）

仓库根目录的生成脚本会把单文件版同步到模块版：

```
node gen_enemies.js && node gen_enemies_final.js   # 生成 js/enemies.js
node gen_game.js                                   # 生成 js/game.js
cd modular && node smoke.js                        # 冒烟测试
```

## 运行

直接用浏览器打开 `modular/index.html` 即可（零依赖，无构建步骤）。
