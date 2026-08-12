// 生成 modular/js/enemies.js 主体（锚点定位版，不依赖行号）
const fs = require('fs');
const html = fs.readFileSync('hh.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const S = m[1];

// 提取 startAnchor 到 endAnchor 之间的文本（含 start，不含 end）
function extract(start, end) {
  const i = S.indexOf(start);
  if (i === -1) throw new Error('锚点未找到: ' + start);
  const j = S.indexOf(end, i + start.length);
  if (j === -1) throw new Error('锚点未找到: ' + end);
  return S.slice(i, j);
}

const parts = [
  extract('// 按波次选择敌人类型', 'const BOSS_RADIUS = 30'),                 // pickEnemyType
  extract('function bossHpScale', 'function spawnEdgePos'),        // bossHpScale
  extract('function spawnEdgePos', 'function spawnEnemy'),         // spawnEdgePos
  extract('function spawnEnemy', 'function spawnBoss'),            // spawnEnemy
  extract('function spawnBoss', '/* ─── 大型近战 Boss（独立类型）'), // spawnBoss
  extract('/* ─── 大型近战 Boss（独立类型）', 'function spawnArtilleryBoss'), // melee 组
  extract('function spawnArtilleryBoss', '/* ─── 母体 Boss'),      // artillery
  extract('/* ─── 母体 Boss', 'function startArtillerySkill'),     // mother 组
  extract('function startArtillerySkill', '/* ─── 玩家受击击退残影'), // artillery skills
  extract('/* ─── 玩家受击击退残影', '/* ─── 波次管理'),            // knockback + melee fx
  extract('// ---- 敌人 AI ----', '// ---- 远程敌人子弹更新'),      // AI 循环
];
let body = parts.join('\n\n');

// 依赖替换
body = body.split('spawnFloatText(').join('D.spawnFloatText(');
body = body.split('spawnDeathPowder(').join('D.spawnDeathPowder(');
body = body.split('spawnHitParticles(').join('D.spawnHitParticles(');
body = body.split('gameOver(').join('D.gameOver(');
body = body.split('playShootSound(').join('D.playShootSound(');
body = body.split('playHitSound(').join('D.playHitSound(');

// spawnEdgePos 改用 D.view()
body = body.replace(/function spawnEdgePos\(\) \{[\s\S]*?\n            \}/,
`function spawnEdgePos() {
                const v = D.view()
                const margin = 40
                const vw = v.camX + v.canvasW
                const vh = v.camY + v.canvasH
                const side = randInt(0, 3)
                if (side === 0) return { x: v.camX - margin, y: rand(v.camY, vh) }
                if (side === 1) return { x: vw + margin, y: rand(v.camY, vh) }
                if (side === 2) return { x: rand(v.camX, vw), y: v.camY - margin }
                return { x: rand(v.camX, vw), y: vh + margin }
            }`);

// AI 循环包装为 updateEnemyAI（视口对象注入）
const aiIdx = body.indexOf('// ---- 敌人 AI ----');
if (aiIdx === -1) throw new Error('未找到敌人 AI 标记');
const aiPart = body.slice(aiIdx);
const aiTrimmed = aiPart
  .replace(/\n\s*\}\s*$/, '\n            }')
  .replace(
    'const inView = e.x > camX - 60 && e.x < camX + canvasW + 60 && e.y > camY - 60 && e.y < camY + canvasH + 60',
    'const inView = e.x > v.camX - 60 && e.x < v.camX + v.canvasW + 60 && e.y > v.camY - 60 && e.y < v.camY + v.canvasH + 60'
  );
const wrapped = body.slice(0, aiIdx) +
  '// ---- 敌人 AI（整循环） ----\n            function updateEnemyAI(dt, speedMult) {\n                const p = state.player\n                const v = D.view()\n                ' +
  aiTrimmed + '\n            }';

fs.writeFileSync('modular/js/_enemies_body.txt', wrapped);
console.log('enemies 主体生成:', wrapped.split('\n').length, '行');
