/* ============================================================
 *  constants.js — 全局常量与工具函数
 *  加载顺序：第一个（无依赖）
 * ============================================================ */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis

  const C = {
    PLAYER_RADIUS: 14,
    PROJECTILE_SPEED_BASE: 600,

    // 升级相关上限
    MAX_PIERCE: 5,
    MAX_EXTRA_ATTACK: 5,
    MAX_SPLIT_LEVEL: 3,
    MAX_LIFE_STEAL: 2.0,
    MAX_STEAL_LEVEL: 3,
    STEAL_CHANCES: [0, 0.10, 0.25, 0.50],
    STEAL_ATK_BONUS: 0.5,
    MAX_PARALLEL: 8,
    MAX_SCATTER: 8,
    MAX_RICOCHET: 3,
    MAX_ATTACK_SPEED: 30,
    MAX_BULLET_SPEED_MULT: 10.0,
    EXTRA_BATCH_INTERVAL: 0.12,
    TURN_SPEED: 0.12,
    PARALLEL_STEP: 15,
    SCATTER_STEP: 10 * Math.PI / 180,

    // 世界
    WORLD_ZOOM: 2.5,

    STORAGE_KEY: 'toolhub_integration_arena',
  }

  // 顶层别名常量（供各模块直接引用，保持与旧代码一致的写法）
  for (const k of Object.keys(C)) G[k] = C[k]

  // ---- 工具函数（全局） ----
  G.rand = (min, max) => Math.random() * (max - min) + min
  G.randInt = (min, max) => Math.floor(G.rand(min, max + 1))
  G.clamp = (v, min, max) => Math.max(min, Math.min(max, v))
  // 数值统一保留 2 位小数，避免浮点误差累积
  G.r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100
  G.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
  G.angleDelta = (a, b) => {
    let d = b - a
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    return d
  }

  G.CONSTANTS = C
})()
