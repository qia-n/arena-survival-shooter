/* ============================================================
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

// 按波次选择敌人类型：特殊怪逐波解锁，且每种每波不超过上限（禁用类型完全不出场）
            function pickEnemyType(wave, counts) {
                const available = []
                for (const [t, cfg] of Object.entries(SPECIAL_TYPES)) {
                    if (ENEMY_CFG.enabled[t] === false) continue
                    if (wave >= cfg.wave && (counts[t] || 0) < cfg.max) available.push(t)
                }
                // 特殊怪总体出现率随波次提升（最高 50%）
                const specialChance = Math.min(0.5, 0.08 + wave * 0.03)
                if (available.length > 0 && Math.random() < specialChance) {
                    const t = available[randInt(0, available.length - 1)]
                    counts[t] = (counts[t] || 0) + 1
                    return t
                }
                const baseTypes = []
                if (ENEMY_CFG.enabled.melee !== false) baseTypes.push('melee')
                if (ENEMY_CFG.enabled.ranged !== false) baseTypes.push('ranged')
                if (baseTypes.length === 0) return 'melee'
                return baseTypes[randInt(0, baseTypes.length - 1)]
            }
            

function bossHpScale(wave) { return Math.pow(1.22, wave) }
            // 手机端世界缩放（相机方案）
            const WORLD_ZOOM = 2.5

            /* ─── 生成敌人 ────────────────────────── */
            // 在相机视口边缘外一点刷新（玩家附近，避免满地图找敌人）
            

function spawnEdgePos() {
                const v = D.view()
                const margin = 40
                const vw = v.camX + v.canvasW
                const vh = v.camY + v.canvasH
                const side = randInt(0, 3)
                if (side === 0) return { x: v.camX - margin, y: rand(v.camY, vh) }
                if (side === 1) return { x: vw + margin, y: rand(v.camY, vh) }
                if (side === 2) return { x: rand(v.camX, vw), y: v.camY - margin }
                return { x: rand(v.camX, vw), y: vh + margin }
            }

            

function spawnEnemy(isBoss = false, forcedType = null) {
                const pos = spawnEdgePos()
                let x = pos.x,
                    y = pos.y

                const waveFactor = 1 + state.wave * 0.15
                const speedBase = isBoss ? 40 : 40 + state.wave * 1.5
                const hpBase = isBoss ? 30 : 3
                const damageBase = isBoss ? 4 : 2
                const radius = isBoss ? BOSS_RADIUS : ENEMY_RADIUS

                let type = 'melee'
                if (!isBoss) {
                    if (forcedType) type = forcedType
                    else type = Math.random() < 0.3 ? 'ranged' : 'melee'
                }

                // 按类型差异化属性（血量/伤害/移速倍率）
                const st = ENEMY_STATS[type] || ENEMY_STATS.melee
                const speed = isBoss
                    ? Math.min(speedBase, 120)
                    : (type === 'bomber'
                        ? state.player.speed * 0.85 // 自爆怪：恒定比玩家稍慢
                        : Math.min(speedBase * st.spdMul, 220))
                const hp = isBoss
                    ? Math.floor(32 * bossHpScale(state.wave))
                    : Math.floor(hpBase * waveFactor * (1 + state.wave * 0.12) * st.hpMul)
                const damage = Math.max(1, Math.floor(damageBase * (1 + state.wave * 0.1) * st.dmgMul))

                state.enemies.push({
                    x,
                    y,
                    radius,
                    hp,
                    maxHp: hp,
                    speed,
                    damage,
                    isBoss,
                    bossName: isBoss ? '👑 首领' : undefined,
                    isMeleeBoss: isBoss,
                    isLargeBoss: false,
                    armor: isBoss ? Math.floor(hp * 0.4) : 0,
                    maxArmor: isBoss ? Math.floor(hp * 0.4) : 0,
                    armorBreakTimer: 0,
                    meleeSkills: isBoss ? ['slam', 'dash'] : undefined,
                    type,
                    attackCooldown: 0,
                    attackInterval: isBoss ? 1.2 : (type === 'ranged' ? 2.8 : 0.8),
                    rangedCooldown: 0,
                    preferredDist: type === 'healer' ? 380 : 350,
                    exploding: false,
                    explodeTimer: 0,
                    isMinion: false,
                    chargeState: 'idle',
                    chargeAngle: 0,
                    chargeDist: 0,
                    chargeWarnTimer: 0,
                    stunTimer: 0,
                    healCooldown: rand(1, 2.5),
                    flashTimer: 0,
                    waveId: state.currentWaveId,
                    knockbackX: 0,
                    knockbackY: 0,
                    attackState: 'idle',
                    attackTimer: 2.0,
                    windupTimer: 0,
                    recoverTimer: 0,
                    attackAngle: 0,
                    attackType: 'slam',
                    dashLen: 0,
                    dashTimer: 0,
                    ghostTimer: 0,
                    dashCooldown: 0,
                })
            }

            

function spawnBoss() { spawnEnemy(true) }

            

/* ─── 大型近战 Boss（独立类型） ───────── */
            function spawnMeleeBoss() {
                const pos = spawnEdgePos()
                let x = pos.x,
                    y = pos.y

                const waveFactor = 1 + state.wave * 0.15
                const hp = Math.floor(80 * bossHpScale(state.wave))
                const damage = Math.floor(6 * (1 + state.wave * 0.08))

                state.enemies.push({
                    x,
                    y,
                    radius: MELEE_BOSS_RADIUS,
                    hp,
                    maxHp: hp,
                    speed: 30,
                    damage,
                    enraged: false,
                    skillScale: 1,
                    isLargeBoss: true,
                    armor: Math.floor(hp * 0.4),
                    maxArmor: Math.floor(hp * 0.4),
                    armorBreakTimer: 0,
                    stage2: false,
                    phaseMode: null,
                    phaseTimer: 0,
                    baseRadius: MELEE_BOSS_RADIUS,
                    isBoss: true,
                    bossName: '⚔ 近战首领',
                    isMeleeBoss: true,
                    type: 'melee',
                    attackCooldown: 0,
                    attackInterval: 1.0,
                    rangedCooldown: 0,
                    preferredDist: 350,
                    flashTimer: 0,
                    waveId: state.currentWaveId,
                    knockbackX: 0,
                    knockbackY: 0,
                    attackState: 'idle',
                    attackTimer: 2.0,
                    windupTimer: 0,
                    recoverTimer: 0,
                    attackAngle: 0,
                    attackType: 'fan',
                    dashLen: 0,
                    dashTimer: 0,
                    ghostTimer: 0,
                    dashCooldown: 0,
                    nextSkill: null,
                    lastSkill: null,
                    _pendingSkill: null,
                    novaPulseTimer: 0,
                })
            }

            /* ─── 大型近战 Boss 攻击命中判定 ─────── */
            function meleeBossHitTest(e, p) {
                const cosA = Math.cos(e.attackAngle),
                    sinA = Math.sin(e.attackAngle)
                const lx = (p.x - e.x) * cosA + (p.y - e.y) * sinA
                const ly = -(p.x - e.x) * sinA + (p.y - e.y) * cosA
                const pad = 10
                // 判定从 Boss 身体边缘起算（+e.radius），与预警视觉一致
                const sk = e.skillScale || 1
                if (e.attackType === 'fan') {
                    const r = MELEE_ATTACKS.fan.radius * sk + pad + e.radius
                    if (Math.hypot(lx, ly) > r) return false
                    return Math.abs(Math.atan2(ly, lx)) <= MELEE_ATTACKS.fan.halfAngle * sk + 0.15
                } else if (e.attackType === 'nova') {
                    const r = MELEE_ATTACKS.nova.radius * sk + pad + e.radius
                    return Math.hypot(lx, ly) <= r
                } else if (e.attackType === 'slam') {
                    const len = MELEE_ATTACKS.slam.len * sk + pad + e.radius
                    const halfW = MELEE_ATTACKS.slam.halfW * sk + pad
                    return lx >= -pad && lx <= len && Math.abs(ly) <= halfW
                } else {
                    const len = MELEE_ATTACKS.charge.len * sk + pad + e.radius
                    const halfW = MELEE_ATTACKS.charge.halfW * sk + pad
                    return lx >= -pad && lx <= len && Math.abs(ly) <= halfW
                }
            }

            /* ─── Boss 技能 AI（随机技能池 + 距离适配） ─ */
            function rollMeleeSkill(e) {
                const skills = e.meleeSkills || ['fan', 'slam', 'charge', 'dash', 'nova']
                const pool = skills.slice()
                if (pool.length > 1 && e.lastSkill) {
                    const idx = pool.indexOf(e.lastSkill)
                    if (idx !== -1) pool.splice(idx, 1)
                }
                return pool[randInt(0, pool.length - 1)]
            }

            function startMeleeWindup(e, skill) {
                const pl = state.player
                e.attackAngle = Math.atan2(pl.y - e.y, pl.x - e.x)
                e.attackType = skill
                e.attackState = 'windup'
                // 蓄力拍击蓄力 5s，其余 0.7s
                e.windupTimer = skill === 'nova' ? MELEE_BOSS_NOVA_WINDUP : MELEE_BOSS_WINDUP
                e.lastSkill = skill
            }

            function startMeleeDash(e) {
                const pl = state.player
                const d2 = Math.hypot(pl.x - e.x, pl.y - e.y)
                e.attackAngle = Math.atan2(pl.y - e.y, pl.x - e.x)
                e.dashLen = Math.min(d2, MELEE_ATTACKS.dash.len)
                // 冲刺速度恒定（避免远处冲刺瞬移感），时长随距离
                e.dashTimer = e.dashLen / DASH_SPEED
                e.ghostTimer = 0
                e.attackType = 'dash'
                // 冲刺前显示范围预警
                e.attackState = 'windup'
                e.windupTimer = 0.5
                e.lastSkill = 'dash'
            }

            /* ─── 大型远程 Boss（独立类型） ───────── */
            

function spawnArtilleryBoss() {
                const pos = spawnEdgePos()
                let x = pos.x,
                    y = pos.y

                const waveFactor = 1 + state.wave * 0.15
                const hp = Math.floor(ARTY.hpBase * bossHpScale(state.wave))
                const damage = Math.floor(ARTY.dmgBase * (1 + state.wave * 0.08))

                state.enemies.push({
                    x,
                    y,
                    radius: ARTY.radius,
                    hp,
                    maxHp: hp,
                    speed: ARTY.speed,
                    damage,
                    enraged: false,
                    skillScale: 1,
                    isLargeBoss: true,
                    armor: Math.floor(hp * 0.4),
                    maxArmor: Math.floor(hp * 0.4),
                    armorBreakTimer: 0,
                    stage2: false,
                    phaseMode: null,
                    phaseTimer: 0,
                    baseRadius: ARTY.radius,
                    isBoss: true,
                    bossName: '🎯 远程首领',
                    isArtilleryBoss: true,
                    type: 'ranged',
                    attackCooldown: 0,
                    attackInterval: 1.0,
                    rangedCooldown: 0,
                    preferredDist: ARTY.preferredDist,
                    flashTimer: 0,
                    waveId: state.currentWaveId,
                    knockbackX: 0,
                    knockbackY: 0,
                    skillState: 'idle',
                    skillIndex: 0,
                    skillTimer: 2.5,
                    skillPhase: 0,
                    skillAngle: 0,
                    normalTimer: 1.5,
                    normalInterval: ARTY.normalInterval,
                    bombCount: 0,
                    bombPlan: [],
                    bombSpawnTimer: 0,
                    moveTimer: 0,
                    moveAngle: 0,
                    ghostTimer: 0,
                    warn: null,
                })
            }

            

/* ─── 母体 Boss（召唤 + 束缚 + 冲击波 + 狂暴） ─ */
            function spawnMotherBoss() {
                const pos = spawnEdgePos()
                let x = pos.x,
                    y = pos.y

                const waveFactor = 1 + state.wave * 0.15
                const hp = Math.floor(MOTHER.hpBase * bossHpScale(state.wave))
                const damage = Math.floor(MOTHER.dmgBase * (1 + state.wave * 0.08))

                state.enemies.push({
                    x,
                    y,
                    radius: MOTHER.radius,
                    hp,
                    maxHp: hp,
                    speed: MOTHER.speed,
                    damage,
                    isBoss: true,
                    bossName: '🦠 母体',
                    isMotherBoss: true,
                    type: 'ranged',
                    attackCooldown: 0,
                    attackInterval: 1.0,
                    rangedCooldown: 0,
                    preferredDist: MOTHER.keepDist,
                    flashTimer: 0,
                    waveId: state.currentWaveId,
                    knockbackX: 0,
                    knockbackY: 0,
                    venomCooldown: 2.0,
                    spawnCooldown: 3.0,
                    webCooldown: 5.0,
                    shockCooldown: 8.0,
                    enraged: false,
                    isLargeBoss: true,
                    armor: Math.floor(hp * 0.4),
                    maxArmor: Math.floor(hp * 0.4),
                    armorBreakTimer: 0,
                    stage2: false,
                    phaseMode: null,
                    phaseTimer: 0,
                    baseRadius: 38,
                    motherWarns: [],
                })
            }

            // 母体孵化的小怪
            function spawnMotherMinion(x, y, mother) {
                const waveFactor = 1 + state.wave * 0.15
                const hp = Math.max(1, Math.floor(2 * waveFactor * (1 + state.wave * 0.12) * 0.7))
                const damage = Math.max(1, Math.floor(2 * (1 + state.wave * 0.1) * 0.7))
                state.enemies.push({
                    x,
                    y,
                    radius: 11,
                    hp,
                    maxHp: hp,
                    speed: 95 + state.wave * 1.5,
                    damage,
                    isBoss: false,
                    isMotherMinion: true,
                    type: 'melee',
                    attackCooldown: 0,
                    attackInterval: 0.7,
                    rangedCooldown: 0,
                    preferredDist: 350,
                    flashTimer: 0,
                    waveId: mother.waveId,
                    knockbackX: 0,
                    knockbackY: 0,
                })
            }

            // Boss 阶段数值档位：[一阶段普通, 一阶段狂暴, 二阶段普通, 二阶段狂暴]
            // 伤害 / 技能范围 / 技能频率 / 技能后摇
            function bossStageF(e) {
                const i = (e.stage2 ? 2 : 0) + (e.enraged ? 1 : 0)
                return {
                    dmg: [0.8, 1.3, 1.2, 1.6][i],
                    range: [1, 1.15, 1.1, 1.3][i],
                    freq: [0.8, 1.25, 1.15, 1.4][i],
                    recover: [1.2, 0.7, 0.85, 0.6][i],
                }
            }

            // 粒子爆发（变身演出用）
            function burstBossPhaseParticles(e, n, colors) {
                for (let k = 0; k < n; k++) {
                    const a = rand(0, Math.PI * 2)
                    const sp = rand(100, 380)
                    state.particles.push({
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(a) * sp,
                        vy: Math.sin(a) * sp,
                        size: rand(3, 10),
                        life: rand(0.4, 0.9),
                        color: colors[randInt(0, 1)],
                    })
                }
            }

            // 触发 Boss 变身（三过渡统一入口）：enrage1（一阶段狂暴）/ revive（进化二阶段）/ enrage2（二阶段狂暴）
            // 变身 2.6s：期间 Boss 原地不动、不攻击，可被伤害
            function startBossPhase(e, mode) {
                e.phaseMode = mode
                e.phaseTimer = 2.6
                e.phaseTotal = 2.6
                // 清技能残留，防止变身中被旧预警/蓄力干扰
                e.warn = null
                e.bombPlan = []
                e.attackState = 'idle'
                e.skillState = 'idle'
                e._pendingSkill = null
                e.motherWarns = []
                if (mode === 'revive') {
                    // 进化二阶段：回满血 + 体型再增，金色/绿色回血粒子
                    e.stage2 = true
                    e.hp = e.maxHp
                    state.flashRed = 0.5
                    state.shakeTimer = 0.35
                    state.shakePower = 8
                    D.spawnFloatText(e.x, e.y - e.radius - 20, '💥 进化！', '#ffd700')
                    burstBossPhaseParticles(e, 60, ['#7dff9b', '#ffd700'])
                } else if (mode === 'enrage2') {
                    // 二阶段狂暴：紫金粒子 + 强震屏 + 更强冲击波
                    state.flashRed = 0.8
                    state.shakeTimer = 0.8
                    state.shakePower = 15
                    state.enrageWarnTimer = 2.6
                    state.attackFx.push({ type: 'nova', x: e.x, y: e.y, angle: 0, life: 0.6, maxLife: 0.6, radius: 320 })
                    burstBossPhaseParticles(e, 60, ['#b388ff', '#ffd700'])
                } else {
                    // 一阶段狂暴：红闪 + 震屏 + 粒子爆发
                    state.flashRed = 0.7
                    state.shakeTimer = 0.6
                    state.shakePower = 12
                    state.enrageWarnTimer = 2.6
                    const cA = e.isMotherBoss ? '#39ff14' : (e.isArtilleryBoss ? '#4dd0ff' : '#ff9d3c')
                    const cB = e.isMotherBoss ? '#00c853' : (e.isArtilleryBoss ? '#1e88ff' : '#ff5722')
                    burstBossPhaseParticles(e, 46, [cA, cB])
                }
            }

            // 变身进行：倒计时 → 结束时应用对应档位的体型/范围/狂暴状态
            function bossPhaseTick(e, dt) {
                e.phaseTimer -= dt
                if (e.phaseTimer <= 0) {
                    if (e.phaseMode === 'revive') {
                        e.enraged = false
                        e.radius = e.baseRadius * 1.3 * 1.2
                    } else if (e.phaseMode === 'enrage2') {
                        e.enraged = true
                        e.radius = e.baseRadius * 1.3 * 1.2 * 1.35
                    } else {
                        e.enraged = true
                        e.radius = e.baseRadius * 1.3
                    }
                    e.skillScale = bossStageF(e).range
                    e.phaseMode = null
                    e.attackTimer = 0.5
                    e.skillTimer = 1.0
                    state.attackFx.push({ type: 'nova', x: e.x, y: e.y, angle: 0, life: 0.4, maxLife: 0.4, radius: 200 })
                }
            }

            // 母体 AI：慢速周旋 + 毒液弹 + 召唤虫群 + 束缚陷阱 + 冲击波
            function updateMotherBoss(e, p, dx2, dy2, d2, dt, speedMult) {
                // 狂暴被动（hp ≤ 50%）→ 变身演出（二阶段狂暴为 enrage2）
                if (!e.enraged && !e.phaseMode && e.hp <= e.maxHp * 0.5) {
                    startBossPhase(e, e.stage2 ? 'enrage2' : 'enrage1')
                }
                const sf = bossStageF(e)

                // 慢速周旋：保持中距离（不追击）
                const preferred = 260
                if (d2 > preferred + 80) {
                    const a = Math.atan2(dy2, dx2)
                    const mv = e.speed * speedMult * 0.6
                    e.x += Math.cos(a) * mv * dt
                    e.y += Math.sin(a) * mv * dt
                } else if (d2 < preferred - 100) {
                    const a = Math.atan2(e.y - p.y, e.x - p.x)
                    const mv = e.speed * speedMult * 0.4
                    e.x += Math.cos(a) * mv * dt
                    e.y += Math.sin(a) * mv * dt
                }
                e.x = clamp(e.x, -50, worldW + 50)
                e.y = clamp(e.y, -50, worldH + 50)

                // 普通攻击：毒液弹（狂暴后双发）
                e.venomCooldown -= dt
                if (e.venomCooldown <= 0 && d2 < 700) {
                    const shots = e.stage2 ? (e.enraged ? 3 : 2) : (e.enraged ? 2 : 1)
                    for (let s = 0; s < shots; s++) {
                        const off = shots === 2 ? (s === 0 ? -0.14 : 0.14) : 0
                        const a = Math.atan2(dy2, dx2) + off
                        state.enemyProjectiles.push({
                            x: e.x,
                            y: e.y,
                            kind: 'venom',
                            vx: Math.cos(a) * MOTHER.venomSpeed,
                            vy: Math.sin(a) * MOTHER.venomSpeed,
                            radius: 7,
                            damage: Math.max(1, Math.floor(r2(e.damage * MOTHER.venomDmgMul * sf.dmg))),
                            poisonDps: r2(MOTHER.venomPoisonDps * sf.dmg),
                            life: 3.5,
                        })
                    }
                    e.venomCooldown = MOTHER.venomCooldown / sf.freq
                }

                // 技能1：孵化虫群（预警圈 → 小怪，场上上限 8）
                e.spawnCooldown -= dt
                if (e.spawnCooldown <= 0) {
                    e.spawnCooldown = MOTHER.spawnInterval / sf.freq
                    const minions = state.enemies.filter(o => o.isMotherMinion).length
                    if (minions < MOTHER.spawnMaxMinions) {
                        const count = e.stage2 ? randInt(MOTHER.spawnMinEnraged, MOTHER.spawnMaxEnraged) : (e.enraged ? randInt(MOTHER.spawnMinEnraged, MOTHER.spawnMaxEnraged) : randInt(MOTHER.spawnMin, MOTHER.spawnMax))
                        for (let k = 0; k < count; k++) {
                            const a = rand(0, Math.PI * 2)
                            const dist2 = rand(60, 130)
                            e.motherWarns.push({
                                x: e.x + Math.cos(a) * dist2,
                                y: e.y + Math.sin(a) * dist2,
                                timer: 1.0,
                                kind: 'spawn',
                            })
                        }
                    }
                }

                // 技能2：束缚陷阱（玩家脚下，预警后生成减速区域）
                e.webCooldown -= dt
                if (e.webCooldown <= 0 && d2 < 600) {
                    e.webCooldown = MOTHER.webCooldown / sf.freq
                    e.motherWarns.push({ x: p.x, y: p.y, timer: 1.0, kind: 'web' })
                }

                // 技能3：虫群冲击波（环形散射）
                e.shockCooldown -= dt
                if (e.shockCooldown <= 0) {
                    e.shockCooldown = MOTHER.shockCooldown / sf.freq
                    const n = e.stage2 ? 20 : (e.enraged ? 16 : 12)
                    for (let k = 0; k < n; k++) {
                        const a = (k / n) * Math.PI * 2
                        state.enemyProjectiles.push({
                            x: e.x,
                            y: e.y,
                            kind: 'bug',
                            vx: Math.cos(a) * MOTHER.shockSpeed,
                            vy: Math.sin(a) * MOTHER.shockSpeed,
                            radius: 5,
                            damage: Math.max(1, r2(e.damage * sf.dmg - 1)),
                            life: 2.5,
                        })
                    }
                }

                // 狂暴持续：身体上飘火焰粒子
                if (e.enraged && Math.random() < 0.4) {
                    state.particles.push({
                        x: e.x + rand(-e.radius * 0.6, e.radius * 0.6),
                        y: e.y + rand(-e.radius * 0.6, e.radius * 0.6),
                        vx: rand(-15, 15),
                        vy: rand(-70, -30),
                        size: rand(2, 6),
                        life: rand(0.3, 0.6),
                        color: Math.random() < 0.5 ? '#39ff14' : '#00c853',
                    })
                }

                // 预警到期：web → 减速区域；spawn → 孵化小怪
                for (let i = e.motherWarns.length - 1; i >= 0; i--) {
                    const w = e.motherWarns[i]
                    w.timer -= dt
                    if (w.timer <= 0) {
                        if (w.kind === 'web') {
                            state.webZones.push({ x: w.x, y: w.y, radius: MOTHER.webRadius, life: MOTHER.webLife, dps: MOTHER.webPoisonDps * sf.dmg })
                        } else {
                            spawnMotherMinion(w.x, w.y, e)
                        }
                        e.motherWarns.splice(i, 1)
                    }
                }
            }

            

function startArtillerySkill(e) {
                const pl = state.player
                if (e.skillIndex === 0) {
                    // 技能1：扇形散射 1-3 波
                    e.skillState = 'skill1'
                    e.skillAngle = Math.atan2(pl.y - e.y, pl.x - e.x)
                    e.skillPhase = randInt(1, 3)
                    e.skillTimer = ARTY.windup
                    e.warn = { type: 'fan', x: e.x, y: e.y, angle: e.skillAngle, radius: ARTY.fanRadius * bossStageF(e).range, timer: ARTY.windup }
                } else if (e.skillIndex === 1) {
                    // 技能2：全屏环形散射 16 颗
                    e.skillState = 'skill2'
                    e.skillTimer = ARTY.windup
                    e.warn = { type: 'ring', x: e.x, y: e.y, radius: ARTY.radialRadius * bossStageF(e).range, timer: ARTY.windup }
                } else {
                    // 技能3：大量轰炸——快速出现预警点，再依次降落（一阶段普通形态 2/3 数量）
                    e.skillState = 'skill3'
                    e.bombCount = (e.stage2 || e.enraged) ? randInt(ARTY.bombMin, ARTY.bombMax) : randInt(Math.round(ARTY.bombMin * 2 / 3), Math.round(ARTY.bombMax * 2 / 3))
                    e.bombPlan = []
                    e.bombSpawnTimer = 0
                }
            }

            function finishArtillerySkill(e) {
                e.skillState = 'idle'
                e.skillIndex = (e.skillIndex + 1) % 3
                // 技能间隔按阶段频率档位（普通形态更慢 / 狂暴更快）
                e.skillTimer = ARTY.skillInterval / bossStageF(e).freq
                e.warn = null
                e.bombPlan = []
            }

            /* ─── 炮弹爆炸 ────────────────────────── */
            function explodeCannonball(c) {
                // 12 颗碎片向周围散射
                for (let k = 0; k < 36; k++) {
                    const a = (k / 36) * Math.PI * 2
                    state.enemyProjectiles.push({
                        x: c.x,
                        y: c.y,
                        vx: Math.cos(a) * 160,
                        vy: Math.sin(a) * 160,
                        radius: 5,
                        damage: Math.max(1, c.damage - 1),
                        life: 3,
                    })
                }
                state.attackFx.push({ type: 'blast', x: c.x, y: c.y, angle: 0, life: MELEE_ATTACK_FX_LIFE })
            }

            

/* ─── 玩家受击击退残影 ────────────────── */
            function spawnPlayerKnockbackTrail(x, y, dirX, dirY, dist) {
                for (let g = 1; g <= 3; g++) {
                    state.ghosts.push({
                        x: x - dirX * dist * (g / 4),
                        y: y - dirY * dist * (g / 4),
                        radius: state.player.radius,
                        life: 0.3,
                        color: '#88ddff',
                    })
                }
            }

            /* ─── 大型近战 Boss 攻击特效 ─────────── */
            function spawnMeleeAttackFx(e) {
                state.attackFx.push({
                    type: e.attackType,
                    x: e.x,
                    y: e.y,
                    angle: e.attackAngle,
                    // nova 释放冲击波稍长更震撼
                    life: e.attackType === 'nova' ? 0.4 : MELEE_ATTACK_FX_LIFE,
                    maxLife: e.attackType === 'nova' ? 0.4 : MELEE_ATTACK_FX_LIFE,
                    radius: e.attackType === 'nova' ? MELEE_ATTACKS.nova.radius + e.radius : 0,
                })
            }

            

// ---- 敌人 AI（整循环） ----
            function updateEnemyAI(dt, speedMult) {
                const p = state.player
                const v = D.view()
                // ---- 敌人 AI ----
                for (const e of state.enemies) {
                    const dx2 = p.x - e.x,
                        dy2 = p.y - e.y,
                        d2 = Math.hypot(dx2, dy2)

                    // ---- 大型 Boss 变身演出（狂暴/二阶段过渡）：原地不动、不攻击，可被伤害 ----
                    if ((e.isArtilleryBoss || e.isMeleeBoss || e.isMotherBoss) && e.phaseMode) {
                        bossPhaseTick(e, dt)
                        if (Math.random() < 0.3) {
                            const pcol = e.phaseMode === 'revive' ? '#7dff9b' : (e.phaseMode === 'enrage2' ? '#b388ff' : '#ff9d3c')
                            state.particles.push({
                                x: e.x + rand(-e.radius, e.radius),
                                y: e.y + rand(-e.radius, e.radius),
                                vx: rand(-25, 25),
                                vy: rand(-90, -15),
                                size: rand(3, 7),
                                life: rand(0.4, 0.8),
                                color: pcol,
                            })
                        }
                        continue
                    }

                    // ---- Boss 破防静止（霸体耗尽）：不移动不攻击，结束后恢复霸体 ----
                    if (e.isBoss && e.armorBreakTimer > 0) {
                        e.armorBreakTimer -= dt
                        if (e.armorBreakTimer <= 0) {
                            e.armor = e.maxArmor
                        } else if (Math.random() < 0.3) {
                            state.particles.push({
                                x: e.x + rand(-e.radius, e.radius),
                                y: e.y - e.radius + rand(-6, 6),
                                vx: rand(-15, 15),
                                vy: rand(-60, -20),
                                size: rand(2, 5),
                                life: rand(0.3, 0.6),
                                color: '#ffcc00',
                            })
                        }
                        continue
                    }

                    if (e.isArtilleryBoss) {
                        // ---- 大型远程 Boss：技能状态机 ----
                        if (!e.enraged && e.hp <= e.maxHp * 0.5) startBossPhase(e, e.stage2 ? 'enrage2' : 'enrage1')
                        const sf = bossStageF(e)
                        // 伤害倍率按阶段档位；范围倍率；子弹密度：一阶段普通 2/3，其余满额
                        const artDmgF = sf.dmg
                        const artSk = sf.range
                        const artDensity = (e.stage2 || e.enraged) ? 1 : 2 / 3
                        const keepDist = 320
                        if (e.skillState === 'idle') {
                            // 风筝走位：保持中距离
                            if (d2 > 1) {
                                let mx = 0,
                                    my = 0
                                if (d2 > keepDist + 80) {
                                    mx = (dx2 / d2) * e.speed * speedMult
                                    my = (dy2 / d2) * e.speed * speedMult
                                } else if (d2 < keepDist - 80) {
                                    mx = -(dx2 / d2) * e.speed * speedMult
                                    my = -(dy2 / d2) * e.speed * speedMult
                                }
                                e.x += mx * dt
                                e.y += my * dt
                            }
                            e.x = clamp(e.x, -50, worldW + 50)
                            e.y = clamp(e.y, -50, worldH + 50)

                            // 普通攻击：慢速圆形炮弹，延迟爆炸
                            e.normalTimer -= dt
                            if (e.normalTimer <= 0) {
                                const a = Math.atan2(dy2, dx2)
                                state.cannonballs.push({
                                    x: e.x,
                                    y: e.y,
                                    vx: Math.cos(a) * ARTY.cannonSpeed,
                                    vy: Math.sin(a) * ARTY.cannonSpeed,
                                    radius: ARTY.cannonRadius,
                                    fuse: ARTY.cannonFuse,
                                    damage: r2(e.damage * artDmgF),
                                    life: 6,
                                })
                                // 普通攻击频率按阶段档位
                                e.normalTimer = e.normalInterval / bossStageF(e).freq
                            }

                            // 技能调度：间隔结束 → 远离则位移，否则直接技能
                            e.skillTimer -= dt
                            if (e.skillTimer <= 0) {
                                if (d2 > 500) {
                                    e.skillState = 'move'
                                    e.moveTimer = Math.min(0.75, d2 / 420)
                                    e.moveAngle = Math.atan2(dy2, dx2)
                                    e.ghostTimer = 0
                                } else {
                                    startArtillerySkill(e)
                                }
                            }
                        } else if (e.skillState === 'move') {
                            // 位移：中短距离接近，不造成伤害，带残影
                            e.moveTimer -= dt
                            e.x += Math.cos(e.moveAngle) * 420 * dt
                            e.y += Math.sin(e.moveAngle) * 420 * dt
                            e.x = clamp(e.x, -50, worldW + 50)
                            e.y = clamp(e.y, -50, worldH + 50)
                            e.ghostTimer -= dt
                            if (e.ghostTimer <= 0) {
                                state.ghosts.push({ x: e.x, y: e.y, radius: e.radius, life: 0.35 })
                                e.ghostTimer = 0.03
                            }
                            if (e.moveTimer <= 0) {
                                startArtillerySkill(e)
                            }
                        } else if (e.skillState === 'skill1') {
                            // 技能1：扇形散射 1-3 波
                            e.skillTimer -= dt
                            if (e.skillTimer <= 0) {
                                const halfA = (Math.PI / 3) * artSk
                                const bulletCount = Math.round(ARTY.fanCount * artDensity)
                                for (let bi = 0; bi < bulletCount; bi++) {
                                    const a = e.skillAngle - halfA + (2 * halfA) * (bi / Math.max(1, bulletCount - 1))
                                    state.enemyProjectiles.push({
                                        x: e.x,
                                        y: e.y,
                                        vx: Math.cos(a) * ARTY.fanSpeed,
                                        vy: Math.sin(a) * ARTY.fanSpeed,
                                        radius: 5,
                                        damage: Math.max(1, r2(e.damage * artDmgF - 1)),
                                        life: 3,
                                    })
                                }
                                e.skillPhase--
                                if (e.skillPhase <= 0) {
                                    finishArtillerySkill(e)
                                } else {
                                    e.skillTimer = 0.3
                                }
                            }
                        } else if (e.skillState === 'skill2') {
                            // 技能2：全屏环形散射 16 颗
                            e.skillTimer -= dt
                            if (e.skillTimer <= 0) {
                                for (let bi = 0; bi < Math.round(ARTY.radialCount * artDensity); bi++) {
                                    const a = (bi / 16) * Math.PI * 2
                                    state.enemyProjectiles.push({
                                        x: e.x,
                                        y: e.y,
                                        vx: Math.cos(a) * ARTY.radialSpeed,
                                        vy: Math.sin(a) * ARTY.radialSpeed,
                                        radius: 5,
                                        damage: Math.max(1, r2(e.damage * artDmgF - 1)),
                                        life: 3,
                                    })
                                }
                                finishArtillerySkill(e)
                            }
                        } else if (e.skillState === 'skill3') {
                            // 技能3：大量轰炸点——快速连续出现 15-20 个预警，再依次降落
                            if (e.bombCount > 0) {
                                e.bombSpawnTimer -= dt
                                if (e.bombSpawnTimer <= 0) {
                                    e.bombPlan.push({
                                        x: p.x + rand(-25, 25),
                                        y: p.y + rand(-25, 25),
                                        timer: 0.6,
                                    })
                                    e.bombCount--
                                    e.bombSpawnTimer = 0.2
                                }
                            }
                            // 预警依次到期 → 落弹
                            for (let bi = e.bombPlan.length - 1; bi >= 0; bi--) {
                                const bp = e.bombPlan[bi]
                                bp.timer -= dt
                                if (bp.timer <= 0) {
                                    state.cannonballs.push({
                                        kind: 'bomb',
                                        x: bp.x,
                                        y: -80,
                                        targetY: bp.y,
                                        fallSpeed: ARTY.bombSpeed,
                                        radius: 16,
                                        blastRadius: ARTY.bombBlastRadius * artSk,
                                        damage: r2(e.damage * artDmgF),
                                        tail: 0,
                                        life: 4,
                                    })
                                    e.bombPlan.splice(bi, 1)
                                }
                            }
                            // 全部预警生成且全部落下 → 技能结束
                            if (e.bombCount <= 0 && e.bombPlan.length === 0) {
                                finishArtillerySkill(e)
                            }
                        }
                    } else if (e.type === 'ranged' && !e.isBoss) {
                        const preferred = e.preferredDist
                        if (d2 < preferred - 50) {
                            const angle = Math.atan2(e.y - p.y, e.x - p.x)
                            const moveSpeed = e.speed * speedMult * 0.8
                            e.x += Math.cos(angle) * moveSpeed * dt
                            e.y += Math.sin(angle) * moveSpeed * dt
                        } else if (d2 > preferred + 50) {
                            const angle = Math.atan2(p.y - e.y, p.x - e.x)
                            const moveSpeed = e.speed * speedMult * 0.6
                            e.x += Math.cos(angle) * moveSpeed * dt
                            e.y += Math.sin(angle) * moveSpeed * dt
                        }
                        e.x = clamp(e.x, -50, worldW + 50)
                        e.y = clamp(e.y, -50, worldH + 50)

                        e.rangedCooldown -= dt
                        if (e.rangedCooldown <= 0 && d2 < 600) {
                            const angle = Math.atan2(p.y - e.y, p.x - e.x)
                            state.enemyProjectiles.push({
                                x: e.x,
                                y: e.y,
                                vx: Math.cos(angle) * ENEMY_PROJECTILE_SPEED,
                                vy: Math.sin(angle) * ENEMY_PROJECTILE_SPEED,
                                radius: 5,
                                damage: Math.max(1, e.damage - 1),
                                life: 3,
                            })
                            e.rangedCooldown = e.attackInterval
                        }
                    } else if (e.isMotherBoss) {
                        updateMotherBoss(e, p, dx2, dy2, d2, dt, speedMult)
                    } else if (e.isMeleeBoss) {
                        // ---- 大型近战 Boss：攻击状态机 ----
                        if (e.isLargeBoss && !e.enraged && e.hp <= e.maxHp * 0.5) startBossPhase(e, e.stage2 ? 'enrage2' : 'enrage1')
                        // 普通 Boss（isMeleeBoss 但非大型）不参与阶段档位缩放
                        const meleeDmgF = e.isLargeBoss ? bossStageF(e).dmg : 1
                        if (e.attackState === 'idle') {
                            if (d2 > 1) {
                                const moveSpeed = e.speed * speedMult
                                const step = Math.min(moveSpeed * dt, d2)
                                e.x += (dx2 / d2) * step
                                e.y += (dy2 / d2) * step
                            }
                            e.x = clamp(e.x, -50, worldW + 50)
                            e.y = clamp(e.y, -50, worldH + 50)
                            e.attackTimer -= dt
                            if (e.attackTimer <= 0 && d2 < 650) {
                                // 随机预定技能（避免连续重复）；距离决定执行方式
                                const skill = rollMeleeSkill(e)
                                e.nextSkill = skill
                                const r = e.radius
                                const sk = e.skillScale || 1
                                let cover = 0
                                if (skill === 'slam') cover = MELEE_ATTACKS.slam.len * sk + 10
                                else if (skill === 'fan') cover = MELEE_ATTACKS.fan.radius * sk + 10
                                else if (skill === 'charge') cover = MELEE_ATTACKS.charge.len * sk + 10
                                else if (skill === 'nova') cover = MELEE_ATTACKS.nova.radius * sk + 10
                                if (skill === 'dash') {
                                    // 抽到冲刺：直接冲刺（技能本身）
                                    startMeleeDash(e)
                                } else if (d2 <= cover + r) {
                                    // 玩家在覆盖内：直接释放预定技能
                                    startMeleeWindup(e, skill)
                                } else if (e.dashCooldown <= 0) {
                                    // 够不到：冲刺补位，落地后释放预定技能
                                    startMeleeDash(e)
                                } else {
                                    // 冲刺冷却中：追击逼近，稍后重试
                                    e.attackTimer = 0.4
                                }
                            }
                        } else if (e.attackState === 'windup') {
                            // 蓄力预警中：静止
                            e.windupTimer -= dt
                            if (e.windupTimer <= 0) {
                                if (e.attackType === 'dash') {
                                    // 冲刺预警结束：转入位移阶段
                                    e.attackState = 'dash'
                                } else {
                                    spawnMeleeAttackFx(e)
                                    if (meleeBossHitTest(e, p)) {
                                        const damageAmount = r2(e.damage * meleeDmgF)
                                        p.hp = r2(p.hp - damageAmount)
                                        p.hurtFlashTimer = 0.2
                                        // 击退玩家
                                        const kd = d2 || 1
                                        p.x += (dx2 / kd) * 110
                                        p.y += (dy2 / kd) * 110
                                        p.x = clamp(p.x, 5, worldW - 5)
                                        p.y = clamp(p.y, 5, worldH - 5)
                                        spawnPlayerKnockbackTrail(p.x, p.y, dx2 / kd, dy2 / kd, 110)
                                        spawnPlayerHitParticles(p.x, p.y, 22)
                                        if (p.hp <= 0) {
                                            p.hp = 0
                                            D.gameOver()
                                        }
                                    }
                                    e.attackState = 'recover'
                                    e.recoverTimer = MELEE_BOSS_RECOVER * (e.isLargeBoss ? bossStageF(e).recover : 1)
                                }
                            }
                        } else if (e.attackState === 'dash') {
                            // 冲刺位移：快速冲向目标，沿途留残影
                            e.dashTimer -= dt
                            const dashSpeed = DASH_SPEED
                            e.x += Math.cos(e.attackAngle) * dashSpeed * dt
                            e.y += Math.sin(e.attackAngle) * dashSpeed * dt
                            e.x = clamp(e.x, -50, worldW + 50)
                            e.y = clamp(e.y, -50, worldH + 50)
                            e.ghostTimer -= dt
                            if (e.ghostTimer <= 0) {
                                state.ghosts.push({ x: e.x, y: e.y, radius: e.radius, life: 0.35 })
                                e.ghostTimer = 0.035
                            }
                            if (e.dashTimer <= 0) {
                                // 到达：终点冲击特效 + 接触伤害
                                spawnMeleeAttackFx(e)
                                // 冲刺冷却 2s（机动补位后仍需冷却）
                                e.dashCooldown = 2
                                const reach = Math.hypot(p.x - e.x, p.y - e.y)
                                if (reach < e.radius + p.radius + 50) {
                                    const damageAmount = r2(e.damage * meleeDmgF)
                                    p.hp = r2(p.hp - damageAmount)
                                    p.hurtFlashTimer = 0.2
                                    const kd = reach || 1
                                    p.x += ((p.x - e.x) / kd) * 140
                                    p.y += ((p.y - e.y) / kd) * 140
                                    p.x = clamp(p.x, 5, worldW - 5)
                                    p.y = clamp(p.y, 5, worldH - 5)
                                    spawnPlayerKnockbackTrail(p.x, p.y, (p.x - e.x) / kd, (p.y - e.y) / kd, 140)
                                    spawnPlayerHitParticles(p.x, p.y, 22)
                                    if (p.hp <= 0) {
                                        p.hp = 0
                                        D.gameOver()
                                    }
                                }
                                if (e.nextSkill && e.nextSkill !== 'dash') {
                                    // 机动冲刺：落地后收招停顿，再释放预定技能（给玩家反应时间）
                                    e._pendingSkill = e.nextSkill
                                    e.attackState = 'recover'
                                    e.recoverTimer = 0.6
                                } else {
                                    e.attackState = 'recover'
                                    e.recoverTimer = MELEE_BOSS_RECOVER * (e.isLargeBoss ? bossStageF(e).recover : 1)
                                }
                            }
                        } else if (e.attackState === 'recover') {
                            e.recoverTimer -= dt
                            if (e.recoverTimer <= 0) {
                                if (e._pendingSkill) {
                                    const s = e._pendingSkill
                                    e._pendingSkill = null
                                    // 冲刺补位完成：释放预定技能
                                    startMeleeWindup(e, s)
                                } else {
                                    e.attackState = 'idle'
                                    e.attackTimer = e.isLargeBoss ? 1 / bossStageF(e).freq : 1.0
                                }
                            }
                        }
                    } else if (e.type === 'bomber') {
                        // ---- 自爆怪：接近 → 蓄力预警 → 自爆 ----
                        if (e.exploding) {
                            e.explodeTimer -= dt
                            if (e.explodeTimer <= 0) {
                                // 自爆：范围伤害 + 爆炸视觉特效，自身死亡
                                if (d2 < BOMBER_BLAST_RADIUS + p.radius) {
                                    const dmg = Math.max(1, Math.floor(e.damage * 1.5))
                                    p.hp = r2(p.hp - dmg)
                                    p.hurtFlashTimer = 0.2
                                    spawnPlayerHitParticles(p.x, p.y, 20)
                                    if (p.hp <= 0) { p.hp = 0; D.gameOver() }
                                }
                                // 爆炸特效：冲击波环 + 白闪 + 大量橙红粒子
                                state.attackFx.push({ type: 'nova', x: e.x, y: e.y, angle: 0, life: 0.35, maxLife: 0.35, radius: BOMBER_BLAST_RADIUS })
                                D.spawnHitParticles(e.x, e.y, 40)
                                D.spawnDeathPowder(e.x, e.y, 50)
                                for (let k = 0; k < 24; k++) {
                                    const a = rand(0, Math.PI * 2)
                                    const sp = rand(120, 380)
                                    state.particles.push({
                                        x: e.x,
                                        y: e.y,
                                        vx: Math.cos(a) * sp,
                                        vy: Math.sin(a) * sp,
                                        size: rand(3, 9),
                                        life: rand(0.3, 0.7),
                                        color: Math.random() < 0.5 ? '#ff8844' : '#ffcc66',
                                    })
                                }
                                e.hp = 0
                            }
                        } else {
                            const moveSpeed = e.speed * speedMult * 0.75
                            const step = Math.min(moveSpeed * dt, d2)
                            e.x += (dx2 / d2) * step
                            e.y += (dy2 / d2) * step
                            e.x = clamp(e.x, -50, worldW + 50)
                            e.y = clamp(e.y, -50, worldH + 50)
                            if (d2 < BOMBER_CHARGE_RADIUS) {
                                e.exploding = true
                                e.explodeTimer = BOMBER_WINDUP
                            }
                        }
                    } else if (e.type === 'charger') {
                        // ---- 冲锋怪：远距离蓄力预警 → 直线冲刺 → 硬直 ----
                        if (e.chargeState === 'windup') {
                            e.chargeWarnTimer -= dt
                            if (e.chargeWarnTimer <= 0) e.chargeState = 'dash'
                        } else if (e.chargeState === 'dash') {
                            e.x += Math.cos(e.chargeAngle) * CHARGER_SPEED * dt
                            e.y += Math.sin(e.chargeAngle) * CHARGER_SPEED * dt
                            e.x = clamp(e.x, -50, worldW + 50)
                            e.y = clamp(e.y, -50, worldH + 50)
                            e.chargeDist -= CHARGER_SPEED * dt
                            // 冲锋拖影
                            e.ghostTimer -= dt
                            if (e.ghostTimer <= 0) {
                                state.ghosts.push({ x: e.x, y: e.y, radius: e.radius, life: 0.3, color: 'rgba(255,170,60,0.55)' })
                                e.ghostTimer = 0.045
                            }
                            if (d2 < e.radius + p.radius + 6) {
                                const dmg = Math.max(1, Math.floor(e.damage * 1.5))
                                p.hp = r2(p.hp - dmg)
                                p.hurtFlashTimer = 0.2
                                const kd = d2 || 1
                                p.x += (dx2 / kd) * 120
                                p.y += (dy2 / kd) * 120
                                p.x = clamp(p.x, 5, worldW - 5)
                                p.y = clamp(p.y, 5, worldH - 5)
                                spawnPlayerHitParticles(p.x, p.y, 20)
                                if (p.hp <= 0) { p.hp = 0; D.gameOver() }
                            }
                            if (e.chargeDist <= 0) {
                                e.chargeState = 'stun'
                                e.stunTimer = CHARGER_STUN
                            }
                        } else if (e.chargeState === 'stun') {
                            e.stunTimer -= dt
                            if (e.stunTimer <= 0) e.chargeState = 'idle'
                        } else {
                            // 只会冲锋：任意距离都锁定方向蓄力，固定超长距离慢速冲锋
                            e.chargeState = 'windup'
                            e.chargeWarnTimer = CHARGER_WINDUP
                            e.chargeAngle = Math.atan2(dy2, dx2)
                            e.chargeDist = CHARGER_DIST
                        }
                    } else if (e.type === 'healer') {
                        // ---- 治疗怪：保持中距离，周期性治疗周围敌人 ----
                        const preferred = 380
                        if (d2 < preferred - 60) {
                            const angle = Math.atan2(e.y - p.y, e.x - p.x)
                            const moveSpeed = e.speed * speedMult * 0.8
                            e.x += Math.cos(angle) * moveSpeed * dt
                            e.y += Math.sin(angle) * moveSpeed * dt
                        } else if (d2 > preferred + 60) {
                            const angle = Math.atan2(p.y - e.y, p.x - e.x)
                            const moveSpeed = e.speed * speedMult * 0.7
                            e.x += Math.cos(angle) * moveSpeed * dt
                            e.y += Math.sin(angle) * moveSpeed * dt
                        }
                        e.x = clamp(e.x, -50, worldW + 50)
                        e.y = clamp(e.y, -50, worldH + 50)
                        e.healCooldown -= dt
                        if (e.healCooldown <= 0) {
                            e.healCooldown = HEALER_INTERVAL
                            for (const other of state.enemies) {
                                if (other === e || other.hp <= 0) continue
                                if (dist(e, other) < HEALER_RANGE) {
                                    other.hp = r2(Math.min(other.maxHp, other.hp + HEALER_AMOUNT))
                                    D.spawnFloatText(other.x, other.y - other.radius - 12, '+' + HEALER_AMOUNT.toFixed(1), '#7CFC00')
                                }
                            }
                        }
                    } else if (e.type === 'sniper') {
                        // ---- 狙击怪：视口内才能攻击；超远距离蓄力瞄准 → 高伤高速狙击弹 ----
                        const preferred = SNIPER_RANGE
                        // 是否在玩家视口内（含余量），不在视口内先进入视口
                        const inView = e.x > v.camX - 60 && e.x < v.camX + v.canvasW + 60 && e.y > v.camY - 60 && e.y < v.camY + v.canvasH + 60
                        if (!inView) {
                            const angle = Math.atan2(p.y - e.y, p.x - e.x)
                            const moveSpeed = e.speed * speedMult
                            e.x += Math.cos(angle) * moveSpeed * dt
                            e.y += Math.sin(angle) * moveSpeed * dt
                        } else if (d2 < preferred - 60) {
                            const angle = Math.atan2(e.y - p.y, e.x - p.x)
                            const moveSpeed = e.speed * speedMult * 0.8
                            e.x += Math.cos(angle) * moveSpeed * dt
                            e.y += Math.sin(angle) * moveSpeed * dt
                        } else if (d2 > preferred + 60) {
                            const angle = Math.atan2(p.y - e.y, p.x - e.x)
                            const moveSpeed = e.speed * speedMult * 0.7
                            e.x += Math.cos(angle) * moveSpeed * dt
                            e.y += Math.sin(angle) * moveSpeed * dt
                        }
                        e.x = clamp(e.x, -50, worldW + 50)
                        e.y = clamp(e.y, -50, worldH + 50)
                        if (e.chargeState === 'windup') {
                            e.chargeWarnTimer -= dt
                            if (e.chargeWarnTimer <= 0) {
                                // 发射高伤高速狙击弹（沿预警线方向，预警线即真实弹道）
                                const a = e.chargeAngle
                                state.enemyProjectiles.push({
                                    x: e.x,
                                    y: e.y,
                                    kind: 'sniper',
                                    vx: Math.cos(a) * ENEMY_PROJECTILE_SPEED * 5.6,
                                    vy: Math.sin(a) * ENEMY_PROJECTILE_SPEED * 5.6,
                                    radius: 6,
                                    damage: Math.max(1, Math.floor(e.damage * 2.5)),
                                    life: 4,
                                })
                                e.chargeState = 'idle'
                                e.rangedCooldown = 3.2
                            }
                        } else {
                            e.rangedCooldown -= dt
                            if (e.rangedCooldown <= 0 && d2 > 400 && inView) {
                                e.chargeState = 'windup'
                                e.chargeWarnTimer = SNIPER_WINDUP
                                e.chargeAngle = Math.atan2(dy2, dx2)
                            }
                        }
                    } else {
                        // ---- 普通近战 / 分裂怪：追击 + 近身攻击 ----
                        if (d2 > 1) {
                            const moveSpeed = e.speed * speedMult
                            const step = Math.min(moveSpeed * dt, d2)
                            e.x += (dx2 / d2) * step
                            e.y += (dy2 / d2) * step
                        }
                        e.x = clamp(e.x, -50, worldW + 50)
                        e.y = clamp(e.y, -50, worldH + 50)

                        e.attackCooldown -= dt
                        if (d2 < e.radius + p.radius && e.attackCooldown <= 0) {
                            const damageAmount = e.damage
                            p.hp = r2(p.hp - damageAmount)
                            p.hurtFlashTimer = 0.2
                            e.attackCooldown = e.attackInterval
                            if (p.hp <= 0) {
                                p.hp = 0
                                D.gameOver()
                            }
                        }
                    }
                }

                // ---- 炮弹更新（普通炮弹 + 轰炸炸弹） ----
                for (let i = state.cannonballs.length - 1; i >= 0; i--) {
                    const c = state.cannonballs[i]
                    if (c.kind === 'bomb') {
                        // 轰炸炸弹：垂直快速下落，带拖影
                        c.y += c.fallSpeed * dt
                        c.tail = Math.min(c.tail + c.fallSpeed * dt, 500)
                        if (c.y >= c.targetY) {
                            // 落地爆炸：范围伤害 + 特效
                            const db = dist(c, p)
                            if (db < c.blastRadius + p.radius) {
                                const dmg = c.damage
                                p.hp = r2(p.hp - dmg)
                                p.hurtFlashTimer = 0.2
                                spawnPlayerHitParticles(p.x, p.y, 22)
                                if (p.hp <= 0) {
                                    p.hp = 0
                                    D.gameOver()
                                }
                            }
                            state.attackFx.push({ type: 'blast', x: c.x, y: c.y, angle: 0, life: MELEE_ATTACK_FX_LIFE })
                            state.cannonballs.splice(i, 1)
                        }
                    } else {
                        // 普通炮弹：慢速飞行 + 引信
                        c.x += c.vx * dt
                        c.y += c.vy * dt
                        c.fuse -= dt
                        c.life -= dt
                        let exploded = false
                        if (dist(c, p) < c.radius + p.radius) exploded = true
                        if (!exploded && (c.fuse <= 0 || c.life <= 0)) exploded = true
                        if (exploded) {
                            explodeCannonball(c)
                            state.cannonballs.splice(i, 1)
                        }
                    }
            }
            }

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
