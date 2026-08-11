// 生成 modular/js/enemies.js 主体（从 hh.html 提取敌人逻辑）
const fs = require('fs');
const html = fs.readFileSync('hh.html', 'utf8');
const lines = html.split('\n');
let scriptStart = -1;
for (let i = 0; i < lines.length; i++) if (lines[i].includes('<script>')) { scriptStart = i; break }
const src = lines.slice(scriptStart + 1);
const gi = (L) => L - scriptStart - 2;
const get = (a, b) => src.slice(gi(a), gi(b) + 1).join('\n');

let parts = [
  get(715, 729),          // pickEnemyType
  get(1232, 1232),        // bossHpScale
  get(1236, 1248),        // spawnEdgePos
  get(1250, 1320),        // spawnEnemy
  get(1322, 1322),        // spawnBoss
  get(1324, 1431),        // melee boss 组
  get(1433, 1478),        // artillery boss
  get(1480, 1689),        // mother boss 组
  get(1691, 1738),        // artillery skills + explodeCannonball
  get(1740, 1765),        // knockback trail + melee fx
  get(2798, 3321),        // 敌人 AI 循环
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
const edgeRegex = /function spawnEdgePos\(\) \{[\s\S]*?\n            \}/;
const edgeNew = `function spawnEdgePos() {
                const v = D.view()
                const margin = 40
                const vw = v.camX + v.canvasW
                const vh = v.camY + v.canvasH
                const side = randInt(0, 3)
                if (side === 0) return { x: v.camX - margin, y: rand(v.camY, vh) }
                if (side === 1) return { x: vw + margin, y: rand(v.camY, vh) }
                if (side === 2) return { x: rand(v.camX, vw), y: v.camY - margin }
                return { x: rand(v.camX, vw), y: vh + margin }
            }`;
body = body.replace(edgeRegex, edgeNew);

// AI 循环包装为 updateEnemyAI
const aiIdx = body.indexOf('// ---- 敌人 AI ----');
if (aiIdx === -1) throw new Error('未找到敌人 AI 标记');
const aiPart = body.slice(aiIdx);
const aiTrimmed = aiPart.replace(/\n\s*\}\s*$/, '\n            }');
const wrapped = body.slice(0, aiIdx) +
  '// ---- 敌人 AI（整循环） ----\n            function updateEnemyAI(dt, speedMult) {\n                const p = state.player\n                ' +
  aiTrimmed + '\n            }';

fs.writeFileSync('modular/js/_enemies_body.txt', wrapped);
console.log('生成行数:', wrapped.split('\n').length);
console.log('--- 头部 ---');
console.log(wrapped.slice(0, 500));
console.log('--- AI 包装尾部 ---');
console.log(wrapped.slice(-200));
