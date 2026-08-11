// 组装 modular/js/enemies.js（包装 EnemySystem + 修正视口依赖）
const fs = require('fs');
let body = fs.readFileSync('modular/js/_enemies_body.txt', 'utf8');

// updateEnemyAI 内注入视口对象
body = body.replace(
  'function updateEnemyAI(dt, speedMult) {\n                const p = state.player\n                ',
  'function updateEnemyAI(dt, speedMult) {\n                const p = state.player\n                const v = D.view()\n                '
);
// 狙击怪 inView 用视口对象
body = body.replace(
  'const inView = e.x > camX - 60 && e.x < camX + canvasW + 60 && e.y > camY - 60 && e.y < camY + canvasH + 60',
  'const inView = e.x > v.camX - 60 && e.x < v.camX + v.canvasW + 60 && e.y > v.camY - 60 && e.y < v.camY + v.canvasH + 60'
);

const header = `/* ============================================================
 *  enemies.js — 敌人 / Boss 生成与 AI 逻辑（模块化）
 *  加载顺序：第三个（依赖 constants.js / enemy-config.js）
 *  主文件通过 EnemySystem.init(deps) 注入依赖：
 *    state, worldW, worldH, view(), 特效/音效函数, gameOver
 *  以后调整敌人行为只需改本文件；调整数值只需改 enemy-config.js
 * ============================================================ */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis

  // ---- 依赖（由主文件 init 注入） ----
  let state = null
  let worldW = 0
  let worldH = 0
  const D = {}

  // ===== 敌人 / Boss 逻辑（从主文件抽取，函数体保持原样） =====

`;

const footer = `

  // ===== 结束 =====

  G.EnemySystem = {
    init(deps) {
      Object.assign(D, deps)
      state = deps.state
      worldW = deps.worldW
      worldH = deps.worldH
    },
    setWorld(w, h) {
      worldW = w
      worldH = h
    },
    getWorld() {
      return { worldW, worldH }
    },
    pickEnemyType,
    spawnEnemy,
    spawnBoss,
    spawnMeleeBoss,
    spawnArtilleryBoss,
    spawnMotherBoss,
    explodeCannonball,
    updateEnemyAI,
  }
})()
`;

fs.writeFileSync('modular/js/enemies.js', header + body + footer);
console.log('enemies.js 生成:', (header + body + footer).split('\n').length, '行');
