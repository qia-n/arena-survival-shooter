// 生成 modular/js/game.js（锚点定位版：删除敌人段，接入 EnemySystem）
const fs = require('fs');
const html = fs.readFileSync('hh.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
let S = m[1];

// 删除 [startAnchor, endAnchor) 区间（保留 endAnchor），返回是否成功
function cut(start, end) {
  const i = S.indexOf(start);
  if (i === -1) throw new Error('锚点未找到: ' + start);
  const j = S.indexOf(end, i + start.length);
  if (j === -1) throw new Error('锚点未找到: ' + end);
  S = S.slice(0, i) + S.slice(j);
}

// 1. 删除敌人配置/生成/AI 相关段
cut('// 按波次选择敌人类型', 'const MAX_PIERCE = 5');   // pickEnemyType（保留敌人常量供渲染用）
cut('function bossHpScale', 'const WORLD_ZOOM = 2.5'); // bossHpScale（保留 WORLD_ZOOM）
cut('function spawnEdgePos', '/* ─── 波次管理');       // spawnEdgePos ~ melee fx 全部

// 2. 敌人 AI 循环 → EnemySystem 调用
{
  const aiStart = S.indexOf('// ---- 敌人 AI ----');
  if (aiStart === -1) throw new Error('未找到 AI 循环');
  const aiEnd = S.indexOf('// ---- 远程敌人子弹更新', aiStart);
  if (aiEnd === -1) throw new Error('未找到远程子弹更新');
  S = S.slice(0, aiStart) +
    '                // ---- 敌人 AI（逻辑在 enemies.js） ----\n                EnemySystem.updateEnemyAI(dt, speedMult)\n\n                ' +
    S.slice(aiEnd);
}

// 3. 调用点替换
S = S.split('pickEnemyType(state.wave, typeCounts)').join('EnemySystem.pickEnemyType(state.wave, typeCounts)');
S = S.split('explodeCannonball(c)').join('EnemySystem.explodeCannonball(c)');
S = S.split('spawnEnemy(false, t)').join('EnemySystem.spawnEnemy(false, t)');
S = S.split('spawnBoss()').join('EnemySystem.spawnBoss()');
S = S.split('spawnMeleeBoss()').join('EnemySystem.spawnMeleeBoss()');
S = S.split('spawnArtilleryBoss()').join('EnemySystem.spawnArtilleryBoss()');
S = S.split('spawnMotherBoss()').join('EnemySystem.spawnMotherBoss()');

// 4. resizeCanvas 同步世界尺寸
S = S.replace('worldH = canvasH * WORLD_ZOOM', 'worldH = canvasH * WORLD_ZOOM\n                EnemySystem.setWorld(worldW, worldH)');

// 5. setup 尾部注入依赖
S = S.replace('            resizeCanvas()',
  '            EnemySystem.init({\n                state,\n                worldW,\n                worldH,\n                view: () => ({ camX, camY, canvasW, canvasH }),\n                spawnFloatText,\n                spawnDeathPowder,\n                spawnHitParticles,\n                gameOver,\n                playShootSound,\n                playHitSound,\n            })\n\n            resizeCanvas()');

fs.writeFileSync('modular/js/game.js', S);
console.log('game.js 生成:', S.split('\n').length, '行');
