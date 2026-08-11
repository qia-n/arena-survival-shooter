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
    barrageAngle: Math.PI / 6,
    barrageCount: 5,

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
      barrage: { hpMul: 1.2, dmgMul: 1.2, spdMul: 0.9 },
    },

    // ---- 特殊怪出场配置（解锁波次、每波上限） ----
    specialTypes: {
      bomber: { wave: 3, max: 4 },
      splitter: { wave: 4, max: 4 },
      charger: { wave: 5, max: 3 },
      sniper: { wave: 6, max: 3 },
      shield: { wave: 6, max: 3 },
      healer: { wave: 7, max: 2 },
      barrage: { wave: 8, max: 3 },
    },

    // ---- 母体 Boss ----
    mother: {
      radius: 38,
      hpMul: 60,
      dmgMul: 5,
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
  }

  G.ENEMY_CONFIG = CFG

  // ---- 顶层别名常量（供模块直接引用） ----
  G.ENEMY_RADIUS = CFG.enemyRadius
  G.BOSS_RADIUS = CFG.bossRadius
  G.MELEE_BOSS_RADIUS = CFG.meleeBossRadius
  G.MELEE_BOSS_WINDUP = CFG.meleeBossWindup
  G.MELEE_BOSS_RECOVER = CFG.meleeBossRecover
  G.MELEE_BOSS_NOVA_WINDUP = CFG.meleeBossNovaWindup
  G.MELEE_ATTACK_FX_LIFE = CFG.meleeAttackFxLife
  G.DASH_SPEED = CFG.dashSpeed
  G.MELEE_ATTACKS = CFG.meleeAttacks
  G.ENEMY_PROJECTILE_SPEED = CFG.enemyProjectileSpeed
  G.BOMBER_BLAST_RADIUS = CFG.bomberBlastRadius
  G.BOMBER_CHARGE_RADIUS = CFG.bomberChargeRadius
  G.BOMBER_WINDUP = CFG.bomberWindup
  G.CHARGER_WINDUP = CFG.chargerWindup
  G.CHARGER_SPEED = CFG.chargerSpeed
  G.CHARGER_DIST = CFG.chargerDist
  G.CHARGER_STUN = CFG.chargerStun
  G.HEALER_RANGE = CFG.healerRange
  G.HEALER_AMOUNT = CFG.healerAmount
  G.HEALER_INTERVAL = CFG.healerInterval
  G.SNIPER_WINDUP = CFG.sniperWindup
  G.SNIPER_RANGE = CFG.sniperRange
  G.BARRAGE_ANGLE = CFG.barrageAngle
  G.BARRAGE_COUNT = CFG.barrageCount
  G.ENEMY_STATS = CFG.enemyStats
  G.SPECIAL_TYPES = CFG.specialTypes
})()
