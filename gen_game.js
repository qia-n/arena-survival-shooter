// 生成 modular/js/game.js（主游戏逻辑，敌人逻辑交给 EnemySystem）
const fs = require('fs');
const html = fs.readFileSync('hh.html', 'utf8');
const lines = html.split('\n');
let scriptStart = -1;
for (let i = 0; i < lines.length; i++) if (lines[i].includes('<script>')) { scriptStart = i; break }
const src = lines.slice(scriptStart + 1);
// src[0] 对应文件第 (scriptStart+2) 行（1-based）
const gi = (L) => L - (scriptStart + 2);
const seg = (a, b) => {
  const s = Math.max(0, gi(a));
  const e = gi(b) + 1;
  return e > s ? src.slice(s, e).join('\n') : ''
}

// 保留区间（文件行号）；删除敌人相关段
let scriptEnd = -1;
for (let i = 0; i < lines.length; i++) if (lines[i].includes('</script>')) { scriptEnd = i; break }
const ranges = [
  [1, 714],
  [730, 1231],
  [1233, 1235],
  [1249, 1249],
  [1323, 1323],
  [1432, 1432],
  [1479, 1479],
  [1690, 1690],
  [1739, 1739],
  [1766, 1766],
  [1767, 2797],
  [3322, scriptEnd],
];
let out = '';
for (const [a, b] of ranges) {
  out += seg(a, b) + '\n';
  // 敌人 AI 循环删除后，在波次管理段之后插入模块调用
  if (a === 1767) {
    out += '                // ---- 敌人 AI（逻辑在 enemies.js） ----\n                EnemySystem.updateEnemyAI(dt, speedMult)\n\n'
  }
}

// AI 循环 → EnemySystem.updateEnemyAI 调用（已在拼接处插入）

// 调用点替换
out = out.split('pickEnemyType(state.wave, typeCounts)').join('EnemySystem.pickEnemyType(state.wave, typeCounts)');
out = out.split('explodeCannonball(c)').join('EnemySystem.explodeCannonball(c)');
out = out.split('spawnEnemy(false, t)').join('EnemySystem.spawnEnemy(false, t)');
out = out.split('spawnBoss()').join('EnemySystem.spawnBoss()');
out = out.split('spawnMeleeBoss()').join('EnemySystem.spawnMeleeBoss()');
out = out.split('spawnArtilleryBoss()').join('EnemySystem.spawnArtilleryBoss()');
out = out.split('spawnMotherBoss()').join('EnemySystem.spawnMotherBoss()');

// resizeCanvas 里同步世界尺寸给 EnemySystem（单行锚点，避免 CRLF 问题）
out = out.replace('worldH = canvasH * WORLD_ZOOM', 'worldH = canvasH * WORLD_ZOOM\n                EnemySystem.setWorld(worldW, worldH)');

// setup 尾部：注入依赖后启动
out = out.replace(
  '            resizeCanvas()',
  '            EnemySystem.init({\n                state,\n                worldW,\n                worldH,\n                view: () => ({ camX, camY, canvasW, canvasH }),\n                spawnFloatText,\n                spawnDeathPowder,\n                spawnHitParticles,\n                gameOver,\n                playShootSound,\n                playHitSound,\n            })\n\n            resizeCanvas()'
);

fs.writeFileSync('modular/js/game.js', out);
console.log('game.js 生成:', out.split('\n').length, '行');
