/* ============================================================
 *  enemy-config.js — 敌人 / Boss 配置数据（纯数据，无逻辑）
 *  调整敌人数值只需改这里
 *  加载顺序：第二个（依赖 constants.js 的工具函数可选）
 * ============================================================ */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis

  const CFG = {
    // ---- 基础尺寸 ----
    enemyRadius: 16,
    bossRadius: 30,
    meleeBossRadius: 42,

    // ---- 大型近战 Boss ----
    meleeBossWindup: 0.7,
    meleeBossRecover: 0.3,
    meleeBossNovaWindup: 5,
    meleeAttackFxLife: 0.28,
    dashSpeed: 900,
    meleeAttacks: {
      fan: { radius: 220, halfAngle: Math.PI / 3 },
      slam: { len: 100, halfW: 110 },
      charge: { len: 420, halfW: 45 },
      dash: { len: 600, halfW: 50 },
      nova: { radius: 200 },
    },

    // ---- 远程弹 ----
    enemyProjectileSpeed: 250,

    // ---- 特殊普通敌人参数 ----
    bomberBlastRadius: 110,
    bomberChargeRadius: 90,
    bomberWindup: 1.0,
    chargerWindup: 0.8,
    chargerSpeed: 260,
    chargerDist: 900,
    chargerStun: 2,
    healerRange: 150,
    healerAmount: 1.5,
    healerInterval: 2.5,
    sniperWindup: 1.0,
    sniperRange: 750,

    // ---- 敌人类型属性倍率（血量/伤害/移速） ----
    enemyStats: {
      melee: { hpMul: 1.0, dmgMul: 1.0, spdMul: 0.85 },
      ranged: { hpMul: 0.8, dmgMul: 0.9, spdMul: 0.9 },
      bomber: { hpMul: 0.85, dmgMul: 1.0, spdMul: 1.15 },
      splitter: { hpMul: 1.1, dmgMul: 1.0, spdMul: 1.0 },
      charger: { hpMul: 1.3, dmgMul: 1.1, spdMul: 1.05 },
      healer: { hpMul: 0.8, dmgMul: 0.5, spdMul: 0.85 },
      sniper: { hpMul: 0.7, dmgMul: 1.2, spdMul: 0.8 },
      shield: { hpMul: 2.0, dmgMul: 0.8, spdMul: 0.7 },
    },

    // ---- 特殊怪出场配置（解锁波次、每波上限） ----
    specialTypes: {
      bomber: { wave: 3, max: 4 },
      splitter: { wave: 4, max: 4 },
      charger: { wave: 5, max: 3 },
      sniper: { wave: 6, max: 3 },
      shield: { wave: 6, max: 3 },
      healer: { wave: 7, max: 2 },
    },

    // ---- 母体 Boss ----
    mother: {
      radius: 38,
      hpBase: 60,
      dmgBase: 5,
      speed: 22,
      keepDist: 260,
      // 普通攻击：毒液弹
      venomDmgMul: 0.5,
      venomSpeed: 150,
      venomCooldown: 2.5,
      venomCooldownEnraged: 1.6,
      venomPoisonTime: 4,
      venomPoisonDps: 1.5,
      // 技能1：孵化虫群
      spawnInterval: 6,
      spawnIntervalEnraged: 3.5,
      spawnMin: 2,
      spawnMax: 3,
      spawnMinEnraged: 3,
      spawnMaxEnraged: 4,
      spawnMaxMinions: 8,
      spawnWarnTime: 1.0,
      // 技能2：束缚毒雾
      webCooldown: 8,
      webCooldownEnraged: 6,
      webRadius: 90,
      webLife: 3,
      webPoisonTime: 2.5,
      webPoisonDps: 1,
      // 技能3：虫群冲击波
      shockCooldown: 10,
      shockCooldownEnraged: 7,
      shockCount: 12,
      shockCountEnraged: 16,
      shockSpeed: 160,
      // 小怪
      minionRadius: 11,
      minionSpeedBase: 95,
      minionHpMul: 0.7,
      minionDmgMul: 0.7,
      // 狂暴
      enrageHpRatio: 0.5,
      enrageRadiusMul: 1.3,
    },

    // ---- 大型远程 Boss 技能参数 ----
    artillery: {
      radius: 34,
      hpBase: 70,
      dmgBase: 3,
      speed: 26,
      preferredDist: 350,
      skillInterval: 3.0,
      windup: 0.7,
      fanCount: 20,
      fanSpeed: 280,
      fanRadius: 520,
      radialCount: 120,
      radialSpeed: 300,
      radialRadius: 640,
      bombMin: 15,
      bombMax: 20,
      bombBlastRadius: 40,
      bombSpeed: 1200,
      cannonSpeed: 120,
      cannonRadius: 14,
      cannonFuse: 1.2,
      normalInterval: 3.0,
    },

    // ---- 启用状态（禁用 = 完全不出场） ----
    enabled: {
      melee: true, ranged: true, bomber: true, splitter: true, charger: true,
      healer: true, sniper: true, shield: true,
      normalBoss: true, meleeBoss: true, artilleryBoss: true, motherBoss: true,
    },
  }

  // ---- 合并 localStorage 覆盖配置（后台配置页写入 enemy_config_v2） ----
  let merged = CFG
  try {
    const saved = G.localStorage && G.localStorage.getItem('enemy_config_v2')
    if (saved) {
      const o = JSON.parse(saved)
      merged = {
        ...CFG,
        ...o,
        enemyStats: { ...CFG.enemyStats, ...(o.enemyStats || {}) },
        meleeAttacks: { ...CFG.meleeAttacks, ...(o.meleeAttacks || {}) },
        specialTypes: { ...CFG.specialTypes, ...(o.specialTypes || {}) },
        artillery: { ...CFG.artillery, ...(o.artillery || {}) },
        mother: { ...CFG.mother, ...(o.mother || {}) },
        enabled: { ...CFG.enabled, ...(o.enabled || {}) },
      }
    }
  } catch (_) {}

  G.ENEMY_CFG = merged
  G.ENEMY_CONFIG = merged

  // ---- 顶层别名常量（供模块直接引用，基于合并后的配置） ----
  G.ENEMY_RADIUS = merged.enemyRadius
  G.BOSS_RADIUS = merged.bossRadius
  G.MELEE_BOSS_RADIUS = merged.meleeBossRadius
  G.MELEE_BOSS_WINDUP = merged.meleeBossWindup
  G.MELEE_BOSS_RECOVER = merged.meleeBossRecover
  G.MELEE_BOSS_NOVA_WINDUP = merged.meleeBossNovaWindup
  G.MELEE_ATTACK_FX_LIFE = merged.meleeAttackFxLife
  G.DASH_SPEED = merged.dashSpeed
  G.MELEE_ATTACKS = merged.meleeAttacks
  G.ENEMY_PROJECTILE_SPEED = merged.enemyProjectileSpeed
  G.BOMBER_BLAST_RADIUS = merged.bomberBlastRadius
  G.BOMBER_CHARGE_RADIUS = merged.bomberChargeRadius
  G.BOMBER_WINDUP = merged.bomberWindup
  G.CHARGER_WINDUP = merged.chargerWindup
  G.CHARGER_SPEED = merged.chargerSpeed
  G.CHARGER_DIST = merged.chargerDist
  G.CHARGER_STUN = merged.chargerStun
  G.HEALER_RANGE = merged.healerRange
  G.HEALER_AMOUNT = merged.healerAmount
  G.HEALER_INTERVAL = merged.healerInterval
  G.SNIPER_WINDUP = merged.sniperWindup
  G.SNIPER_RANGE = merged.sniperRange
  G.ENEMY_STATS = merged.enemyStats
  G.SPECIAL_TYPES = merged.specialTypes
  G.MOTHER = merged.mother
  G.ARTY = merged.artillery
})()
