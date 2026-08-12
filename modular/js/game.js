
        // ================================================================
        //  竞技场 - 完整游戏逻辑
        //  原 module.exports.setup 内容，直接执行
        // ================================================================

        (function() {

            /* ─── 常量 ───────────────────────────── */
            const PLAYER_RADIUS = 14
            const ENEMY_RADIUS = 16

            // 特殊普通敌人参数
            const BOMBER_BLAST_RADIUS = 110
            const BOMBER_CHARGE_RADIUS = 90
            const BOMBER_WINDUP = 1.0
            const CHARGER_WINDUP = 0.8
            const CHARGER_SPEED = 260
            const CHARGER_DIST = 900
            const CHARGER_STUN = 2
            const HEALER_RANGE = 150
            const HEALER_AMOUNT = 1.5
            const HEALER_INTERVAL = 2.5
            const SNIPER_WINDUP = 1.0
            const SNIPER_RANGE = 750

            // 敌人类型属性倍率（血量/伤害/移速）与出场配置（解锁波次、每波上限）
            const ENEMY_STATS = {
                melee: { hpMul: 1.0, dmgMul: 1.0, spdMul: 0.85 },
                ranged: { hpMul: 0.8, dmgMul: 0.9, spdMul: 0.9 },
                bomber: { hpMul: 0.85, dmgMul: 1.0, spdMul: 1.15 },
                splitter: { hpMul: 1.1, dmgMul: 1.0, spdMul: 1.0 },
                charger: { hpMul: 1.3, dmgMul: 1.1, spdMul: 1.05 },
                healer: { hpMul: 0.8, dmgMul: 0.5, spdMul: 0.85 },
                sniper: { hpMul: 0.7, dmgMul: 1.2, spdMul: 0.8 },
                shield: { hpMul: 2.0, dmgMul: 0.8, spdMul: 0.7 },
            }
            const SPECIAL_TYPES = {
                bomber: { wave: 3, max: 4 },
                splitter: { wave: 4, max: 4 },
                charger: { wave: 5, max: 3 },
                sniper: { wave: 6, max: 3 },
                shield: { wave: 6, max: 3 },
                healer: { wave: 7, max: 2 },
            }
            const BOSS_RADIUS = 30
            const MELEE_BOSS_RADIUS = 42
            const MELEE_BOSS_WINDUP = 0.7
            const MELEE_BOSS_RECOVER = 0.3
            const MELEE_ATTACKS = {
                fan: { radius: 220, halfAngle: Math.PI / 3 },
                slam: { len: 100, halfW: 110 },
                charge: { len: 420, halfW: 45 },
                dash: { len: 600, halfW: 50 },
                nova: { radius: 200 },
            }
            const MELEE_BOSS_NOVA_WINDUP = 5
            const MELEE_ATTACK_FX_LIFE = 0.28
            const DASH_SPEED = 900
            const PROJECTILE_SPEED_BASE = 600
            const ENEMY_PROJECTILE_SPEED = 250
            const MAX_PIERCE = 5
            const MAX_EXTRA_ATTACK = 5
            const MAX_SPLIT_LEVEL = 3
            const MAX_LIFE_STEAL = 2.0
            const MAX_STEAL_LEVEL = 3
            const STEAL_CHANCES = [0, 0.10, 0.25, 0.50]
            const STEAL_ATK_BONUS = 0.5
            const MAX_PARALLEL = 8
            const MAX_SCATTER = 8
            const MAX_RICOCHET = 3
            const MAX_ATTACK_SPEED = 30
            const MAX_BULLET_SPEED_MULT = 10.0
            const EXTRA_BATCH_INTERVAL = 0.12
            const TURN_SPEED = 0.12
            const PARALLEL_STEP = 15
            const SCATTER_STEP = 10 * Math.PI / 180
            const STORAGE_KEY = 'toolhub_integration_arena'

            /* ─── 容器 ────────────────────────────── */
            const container = document.getElementById('app')
            if (!container) throw new Error('#app 容器不存在')

            /* ─── 音效系统 ────────────────────────── */
            let audioCtx = null

            function initAudio() {
                if (!audioCtx) {
                    audioCtx = new(window.AudioContext || window.webkitAudioContext)()
                }
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume()
                }
            }

            function playShootSound(gun) {
                try {
                    initAudio()
                    const duration = gun.shootDuration ?? 0.05
                    const decay = gun.shootDecay ?? 6
                    const volume = gun.shootVolume ?? 0.2

                    const bufferSize = audioCtx.sampleRate * duration
                    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
                    const data = buffer.getChannelData(0)
                    for (let i = 0; i < bufferSize; i++) {
                        const t = i / audioCtx.sampleRate
                        const env = Math.exp(-t * decay)
                        data[i] = (Math.random() * 2 - 1) * env * 0.6
                    }
                    const source = audioCtx.createBufferSource()
                    source.buffer = buffer
                    const gain = audioCtx.createGain()
                    gain.gain.setValueAtTime(volume, audioCtx.currentTime)
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration)
                    source.connect(gain)
                    gain.connect(audioCtx.destination)
                    source.start()
                    source.stop(audioCtx.currentTime + duration)
                } catch (_) {}
            }

            function playHitSound(gun) {
                try {
                    initAudio()
                    const duration = gun.hitDuration ?? 0.2
                    const decay = gun.hitDecay ?? 6
                    const volume = gun.hitVolume ?? 0.4

                    const bufferSize = audioCtx.sampleRate * duration
                    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
                    const data = buffer.getChannelData(0)
                    for (let i = 0; i < bufferSize; i++) {
                        const t = i / audioCtx.sampleRate
                        const env = Math.exp(-t * decay)
                        data[i] = (Math.random() * 2 - 1) * env * 0.6
                    }
                    const source = audioCtx.createBufferSource()
                    source.buffer = buffer
                    const gain = audioCtx.createGain()
                    gain.gain.setValueAtTime(volume, audioCtx.currentTime)
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration)
                    source.connect(gain)
                    gain.connect(audioCtx.destination)
                    source.start()
                    source.stop(audioCtx.currentTime + duration)
                } catch (_) {}
            }

            function previewSound(gun) {
                if (!gun) return
                initAudio()
                playShootSound(gun)
                setTimeout(() => {
                    playHitSound(gun)
                }, 200)
            }

            function playDeathSound() {}
            function playUpgradeSound() {}

            /* ─── 枪械数据 ────────────────────────── */
            let GUNS = [{
                id: 'pistol',
                name: '手枪',
                desc: '平衡型，单发精准',
                icon: '🔫',
                color: '#88ddff',
                bulletLength: 12,
                bulletWidth: 1.5,
                atk: 2,
                range: 300,
                attackSpeed: 1,
                bulletSpeedMult: 1,
                bulletCount: 1,
                pierceCount: 0,
                extraAttackCount: 0,
                firePattern: 'single',
                spreadAngle: 0,
                burstCount: 0,
                burstDelay: 0.06,
                shootDuration: 0.05,
                shootDecay: 6,
                shootVolume: 0.2,
                hitDuration: 0.2,
                hitDecay: 6,
                hitVolume: 0.4,
            }, ]

            function genId() {
                return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
            }

            /* ─── 状态 ───────────────────────────── */
            const state = {
                highestWave: 0,
                highestKills: 0,

                gameOver: false,
                paused: false,
                gamePaused: false,

                selectedGun: null,

                player: {
                    x: 0,
                    y: 0,
                    radius: PLAYER_RADIUS,
                    hp: 10,
                    maxHp: 10,
                    atk: 2,
                    atkMultiplier: 1,
                    speed: 150,
                    range: 300,
                    attackSpeed: 1,
                    attackTimer: 0,
                    level: 1,
                    totalKills: 0,
                    currentKills: 0,
                    killsForNext: 5,
                    pierceCount: 0,
                    bulletCount: 1,
                    bulletSpeedMult: 1,
                    extraAttackCount: 0,
                    _extraPending: 0,
                    _extraTimer: 0,
                    attackDirection: { x: 1, y: 0 },
                    attackEffectTimer: 0,
                    facingAngle: 0,
                    targetAngle: 0,
                    facingDir: { x: 1, y: 0 },
                    gunColor: '#88ddff',
                    bulletLength: 12,
                    bulletWidth: 1.5,
                    firePattern: 'single',
                    spreadAngle: 0,
                    burstCount: 0,
                    burstDelay: 0.06,
                    splitLevel: 0,
                    lifeSteal: 0,
                    stealLevel: 0,
                    parallelCount: 0,
                    scatterCount: 0,
                    ricochetCount: 0,
                    hurtFlashTimer: 0,
                    poisonTimer: 0,
                    poisonDps: 0,
                },

                enemies: [],
                projectiles: [],
                enemyProjectiles: [],
                particles: [],
                dust: [],
                floatTexts: [],
                attackFx: [],
                ghosts: [],
                cannonballs: [],
                explosions: [],
                wave: 0,
                targetX: 0,
                targetY: 0,
                joyActive: false,
                joyDX: 0,
                joyDY: 0,
                controlMode: 'mouse',
                keys: { w: false, a: false, s: false, d: false },
                mouseDown: false,
                autoFire: false,
                homeSelectedGun: null,

                _pendingBossRare: false,
                webZones: [],
                flashRed: 0,
                shakeTimer: 0,
                shakePower: 0,
                enrageWarnTimer: 0,
                _stars: null,

                waveIdCounter: 0,
                currentWaveId: 0,
                waveSpawned: 0,
                waveKilled: 0,
            }

            /* ─── 持久化 ──────────────────────────── */
            function saveRecord() {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({
                        highestWave: state.highestWave,
                        highestKills: state.highestKills,
                    }))
                } catch (_) { /* ignore */ }
            }

            /* ─── DOM 构建 ────────────────────────── */
            const ui = document.createElement('div')
            ui.className = 'arena-root'
            ui.innerHTML = `
            <div class="arena-header">
              <span class="arena-title">⚡ 竞技场
                <button id="btnConfigToggle" style="margin-left:6px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#888;padding:0 8px;border-radius:3px;cursor:pointer;font-size:12px;">⚙</button>
              </span>
                <span class="arena-lvl" id="lvlDisplay">Lv.1</span>
              <div class="player-hp-bar" title="生命值">
                <div class="player-hp-fill" id="playerHpFill"></div>
                <span class="player-hp-text" id="playerHpText">10/10</span>
              </div>
              <span class="arena-stats">
                总击杀 <span id="totalKillsDisplay">0</span> ｜ 波次 <span id="waveDisplay">0</span> ｜ 生命 <span id="hpDisplay">10</span>
                <button id="btnFullscreenHud" title="全屏" style="margin-left:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#888;padding:2px 8px;border-radius:3px;cursor:pointer;font-size:12px;">⛶</button>
              </span>
            </div>
            <div class="arena-canvas-wrap">
              <canvas id="arenaCanvas"></canvas>
              <div class="joy-base" id="joyBase"><div class="joy-knob" id="joyKnob"></div></div>
              <div class="boss-bar" id="bossBar" style="display:none;"></div>
              <!-- 首页 -->
              <div class="arena-overlay" id="homeOverlay">
                <div class="arena-modal" style="max-width:640px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <h2 style="margin:0;">⚡ 选择枪械</h2>
                    <div style="display:flex;gap:8px;">
                      <button class="arena-btn-secondary" id="btnFullscreenHome" style="font-size:12px;">⛶ 全屏</button>
                      <button class="arena-btn-secondary" id="btnManageGuns" style="font-size:12px;">⚙ 管理</button>
                    </div>
                  </div>
                  <p class="sub" style="margin-top:0;">选择一种枪械开始战斗</p>
                  <div class="gun-list" id="gunList"></div>
                  <div id="controlModeSection" style="margin-top:14px;">
                    <p class="sub" style="margin:0 0 8px 0;">操作方式</p>
                    <div class="control-mode-list" id="controlModeList">
                      <div class="control-mode-card selected" data-mode="mouse">
                        <span class="cm-title">🖱 鼠标移动 + 自动射击</span>
                        <span class="cm-desc">鼠标控制移动方向，自动攻击射程内敌人</span>
                      </div>
                      <div class="control-mode-card" data-mode="keyboard">
                        <span class="cm-title">⌨ 键盘移动 + 鼠标射击</span>
                        <span class="cm-desc">WASD 八方向移动，鼠标瞄准，按住左键射击</span>
                      </div>
                    </div>
                    <label class="auto-fire-opt" id="autoFireOpt" style="display:none;">
                      <input type="checkbox" id="autoFireCheck"> 自动射击（无需按住左键）
                    </label>
                  </div>
                  <div style="margin-top:16px;text-align:center;">
                    <button class="arena-btn-primary" id="btnStartGame" style="font-size:15px;padding:8px 44px;">▶ 开始游戏</button>
                  </div>
                </div>
              </div>
              <!-- 管理界面 -->
              <div class="arena-overlay" id="manageOverlay" style="display:none;">
                <div class="arena-modal" style="max-width:720px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <h2 style="margin:0;">⚙ 枪械管理</h2>
                    <button class="arena-btn-secondary" id="btnCloseManage">✕ 关闭</button>
                  </div>
                  <p class="sub">查看、新增、编辑或删除枪械配置</p>
                  <div style="margin-bottom:12px;">
                    <button class="arena-btn-primary" id="btnAddGun" style="font-size:13px;padding:4px 16px;">+ 新增枪械</button>
                  </div>
                  <div class="gun-manage-list" id="manageList"></div>
                </div>
              </div>
              <!-- 编辑弹窗 -->
              <div class="arena-overlay" id="editOverlay" style="display:none;">
                <div class="arena-modal" style="max-width:520px;">
                  <h2 id="editTitle">编辑枪械</h2>
                  <form id="editForm" style="display:flex;flex-direction:column;gap:8px;margin-top:8px;"></form>
                  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
                    <button class="arena-btn-secondary" id="btnEditCancel">取消</button>
                    <button class="arena-btn-primary" id="btnEditSave">保存</button>
                  </div>
                </div>
              </div>
              <!-- 暂停 -->
              <div class="arena-overlay" id="pauseOverlay" style="display:none;">
                <div class="arena-modal">
                  <h2>⏸ 暂停</h2>
                  <p class="sub">游戏已暂停</p>
                  <div style="display:flex;gap:12px;justify-content:center;margin-top:12px;">
                    <button class="arena-btn-primary" id="btnResume">▶ 继续</button>
                    <button class="arena-btn-secondary" id="btnPauseHome">🏠 回到首页</button>
                  </div>
                </div>
              </div>
              <!-- 升级弹窗 -->
              <div class="arena-overlay" id="upgradeOverlay" style="display:none;">
                <div class="arena-modal">
                  <h2>⬆ 升级</h2>
                  <p class="sub">选择一项强化</p>
                  <div class="arena-upgrade-list" id="upgradeList"></div>
                </div>
              </div>
              <!-- 游戏结束 -->
              <div class="arena-overlay" id="gameOverOverlay" style="display:none;">
                <div class="arena-modal">
                  <h2>💀 陨落</h2>
                  <div class="arena-gameover-stats">
                    <p>到达波次：<strong id="goWave">0</strong></p>
                    <p>总击杀数：<strong id="goKills">0</strong></p>
                    <p>🏆 最高波次：<strong id="goHighestWave">0</strong></p>
                    <p>🏆 最高击杀：<strong id="goHighestKills">0</strong></p>
                  </div>
                  <button class="arena-btn-primary" id="btnRestart">↺ 重启</button>
                </div>
              </div>
            </div>
            <div class="arena-config" id="configPanel" style="display:none;">
              <div class="arena-config-title">⚙ 引擎调校</div>
              <div class="arena-config-item">
                <label>速度倍率：<span id="speedMultVal">1.00</span></label>
                <input type="range" id="speedMultSlider" min="0.5" max="2.0" step="0.05" value="1.0"/>
              </div>
              <div class="arena-config-item">
                <label>敌人数偏移：<span id="countOffsetVal">0</span></label>
                <input type="range" id="countOffsetSlider" min="-3" max="5" step="1" value="0"/>
              </div>
              <div class="arena-config-actions">
                <button class="arena-btn-secondary" id="btnConfigClose">✕ 关闭</button>
              </div>
            </div>
          `

            container.appendChild(ui)

            /* ─── DOM 引用 ───────────────────────── */
            const $ = s => ui.querySelector(s)
            const canvas = $('#arenaCanvas')
            const ctx = canvas.getContext('2d')
            const waveDisplay = $('#waveDisplay')
            const totalKillsDisplay = $('#totalKillsDisplay')
            const hpDisplay = $('#hpDisplay')
            const lvlDisplay = $('#lvlDisplay')
            const controlModeSection = $('#controlModeSection')
            const controlModeList = $('#controlModeList')
            const autoFireOpt = $('#autoFireOpt')
            const autoFireCheck = $('#autoFireCheck')
            const btnStartGame = $('#btnStartGame')
            const playerHpFill = $('#playerHpFill')
            const playerHpText = $('#playerHpText')
            const bossBar = $('#bossBar')
            const homeOverlay = $('#homeOverlay')
            const gunList = $('#gunList')
            const manageOverlay = $('#manageOverlay')
            const manageList = $('#manageList')
            const editOverlay = $('#editOverlay')
            const editForm = $('#editForm')
            const editTitle = $('#editTitle')
            const pauseOverlay = $('#pauseOverlay')
            const btnResume = $('#btnResume')
            const btnPauseHome = $('#btnPauseHome')
            const btnManageGuns = $('#btnManageGuns')
            const btnFullscreenHome = $('#btnFullscreenHome')
            const btnFullscreenHud = $('#btnFullscreenHud')
            const btnCloseManage = $('#btnCloseManage')
            const btnAddGun = $('#btnAddGun')
            const btnEditCancel = $('#btnEditCancel')
            const btnEditSave = $('#btnEditSave')
            const upgradeOverlay = $('#upgradeOverlay')
            const upgradeList = $('#upgradeList')
            const gameOverOverlay = $('#gameOverOverlay')
            const goWave = $('#goWave')
            const goKills = $('#goKills')
            const goHighestWave = $('#goHighestWave')
            const goHighestKills = $('#goHighestKills')
            const btnRestart = $('#btnRestart')
            const configPanel = $('#configPanel')
            const speedMultSlider = $('#speedMultSlider')
            const speedMultVal = $('#speedMultVal')
            const countOffsetSlider = $('#countOffsetSlider')
            const countOffsetVal = $('#countOffsetVal')
            const btnConfigClose = $('#btnConfigClose')
            const btnConfigToggle = $('#btnConfigToggle')

            /* ─── 画布尺寸自适应 ─────────────────── */
            let canvasW = 0,
                canvasH = 0,
                dpr = 1
            let worldW = 0,
                worldH = 0,
                camX = 0,
                camY = 0
            const isTouchDevice = ('ontouchstart' in window) ||
                (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)

            function resizeCanvas() {
                const rect = canvas.parentElement.getBoundingClientRect()
                dpr = window.devicePixelRatio || 1
                canvasW = rect.width
                canvasH = rect.height
                canvas.width = canvasW * dpr
                canvas.height = canvasH * dpr
                canvas.style.width = canvasW + 'px'
                canvas.style.height = canvasH + 'px'
                ctx.scale(dpr, dpr)

                // 世界尺寸：手机端放大（相机方案），电脑端=屏幕
                worldW = canvasW * WORLD_ZOOM
                worldH = canvasH * WORLD_ZOOM
                EnemySystem.setWorld(worldW, worldH)

                const p = state.player
                if (state.gameOver) {
                    p.x = worldW / 2
                    p.y = worldH / 2
                    state.targetX = worldW / 2
                    state.targetY = worldH / 2
                } else {
                    const margin = 5
                    p.x = Math.max(margin, Math.min(worldW - margin, p.x))
                    p.y = Math.max(margin, Math.min(worldH - margin, p.y))
                    state.targetX = Math.max(0, Math.min(worldW, state.targetX))
                    state.targetY = Math.max(0, Math.min(worldH, state.targetY))
                }

                const maxRange = Math.min(worldW, worldH)
                if (p.range > maxRange) p.range = maxRange

                state._stars = null
            }

            let ro = new ResizeObserver(() => resizeCanvas())
            ro.observe(canvas.parentElement)
            setTimeout(resizeCanvas, 20)

            /* ─── 工具函数 ────────────────────────── */
            function dist(a, b) {
                return Math.hypot(a.x - b.x, a.y - b.y)
            }

            function rand(min, max) { return Math.random() * (max - min) + min }

            function randInt(min, max) { return Math.floor(rand(min, max + 1)) }

            function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
            // 数值统一保留 2 位小数，避免浮点误差累积
            function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100 }

            function angleDelta(a, b) {
                let diff = b - a
                while (diff > Math.PI) diff -= Math.PI * 2
                while (diff < -Math.PI) diff += Math.PI * 2
                return diff
            }

            /* ─── 成长曲线 ────────────────────────── */
            // Boss 血量：激进指数成长
            const WORLD_ZOOM = 2.5

            /* ─── 生成敌人 ────────────────────────── */
            // 在相机视口边缘外一点刷新（玩家附近，避免满地图找敌人）
            /* ─── 波次管理 ────────────────────────── */
            function startWave() {
                if (state.gameOver || state.paused) return

                state.currentWaveId = ++state.waveIdCounter
                state.waveSpawned = 0
                state.waveKilled = 0

                state.wave++
                // Boss 波：只出 Boss，不生成普通敌人
                const isBossWave = (state.wave % 5 === 0) || (state.wave % 10 === 0)
                const offset = parseInt(countOffsetSlider.value) || 0
                if (!isBossWave) {
                    let count = Math.max(1, 3 + state.wave + offset)
                    const typeCounts = {}
                    for (let i = 0; i < count; i++) {
                        const t = EnemySystem.pickEnemyType(state.wave, typeCounts)
                        EnemySystem.spawnEnemy(false, t)
                        state.waveSpawned++
                    }
                }
                if (state.wave % 5 === 0 && state.wave % 10 !== 0) {
                    EnemySystem.spawnBoss()
                    state.waveSpawned++
                }
                if (state.wave % 10 === 0) {
                    // 大型 Boss：近战 / 远程 / 母体 随机三选一
                    const br = Math.random()
                    if (br < 0.34) EnemySystem.spawnMeleeBoss()
                    else if (br < 0.67) EnemySystem.spawnArtilleryBoss()
                    else EnemySystem.spawnMotherBoss()
                    state.waveSpawned++
                }
                if (isBossWave) {
                    // Boss 出现：清场全部非 Boss 敌人（含所有特殊怪及分裂小怪），
                    // 计入玩家总击杀与升级所需击杀，满足升级则触发属性选择
                    let cleared = 0
                    for (let i = state.enemies.length - 1; i >= 0; i--) {
                        const e = state.enemies[i]
                        if (!e.isBoss) {
                            spawnDeathPowder(e.x, e.y, 55)
                            state.enemies.splice(i, 1)
                            cleared++
                        }
                    }
                    if (cleared > 0) {
                        const p = state.player
                        p.totalKills += cleared
                        p.currentKills += cleared
                        checkUpgradeAndBoss()
                    }
                }
                updateUI()
            }

            /* ─── 升级系统 ────────────────────────── */
            function applyLevelUpBonus() {
                const p = state.player
                // 升级奖励随波数成长（敌人随波变强，固定值后期不够看）
                const hpBonus = Math.floor(2 + state.wave * 0.3)
                const atkBonus = r2(0.4 + state.wave * 0.08)
                p.maxHp += hpBonus
                p.atk = r2(p.atk + atkBonus)
                p.hp = p.maxHp
            }

            const UPGRADE_POOL = [{
                id: 'atk',
                label: '⚔ 攻击力',
                desc: '+1~3 (随机)',
                weight: 1.0,
                category: 'base',
                apply: () => {
                    const bonus = randInt(1, 3)
                    state.player.atk += bonus
                }
            }, {
                id: 'hp',
                label: '❤️ 最大生命',
                desc: '+3 (并回复满血)',
                weight: 1.0,
                category: 'base',
                apply: () => {
                    state.player.maxHp += 3
                    state.player.hp = state.player.maxHp
                }
            }, {
                id: 'range',
                label: '📐 攻击范围',
                desc: '+15px (上限窗口大小)',
                weight: 1.0,
                category: 'base',
                apply: () => {
                    const maxRange = Math.min(worldW, worldH)
                    const newRange = state.player.range + 15
                    state.player.range = Math.min(newRange, maxRange)
                }
            }, {
                id: 'atkSpeed',
                label: '⚡ 攻击速度',
                desc: '+10%~25% (上限 ' + MAX_ATTACK_SPEED + ')',
                weight: 1.0,
                category: 'base',
                apply: () => {
                    if (state.player.attackSpeed < MAX_ATTACK_SPEED) {
                        const bonus = rand(0.10, 0.25)
                        const newSpeed = state.player.attackSpeed * (1 + bonus)
                        state.player.attackSpeed = Math.min(MAX_ATTACK_SPEED, Math.round(newSpeed * 100) / 100)
                    }
                }
            }, {
                id: 'bulletSpeed',
                label: '🚀 子弹速度',
                desc: '+10% (上限 ' + MAX_BULLET_SPEED_MULT.toFixed(1) + 'x)',
                weight: 1.0,
                category: 'base',
                apply: () => {
                    if (state.player.bulletSpeedMult < MAX_BULLET_SPEED_MULT) {
                        const newMult = state.player.bulletSpeedMult * 1.1
                        state.player.bulletSpeedMult = Math.min(MAX_BULLET_SPEED_MULT, Math.round(newMult * 100) / 100)
                    }
                }
            }, {
                id: 'lifeSteal',
                label: '💚 命中回血',
                desc: '+0.1~0.2 (上限2.0)',
                weight: 0.3,
                category: 'base',
                apply: () => {
                    if (state.player.lifeSteal < MAX_LIFE_STEAL) {
                        const bonus = rand(0.1, 0.2)
                        state.player.lifeSteal = Math.min(state.player.lifeSteal + bonus, MAX_LIFE_STEAL)
                        state.player.lifeSteal = Math.round(state.player.lifeSteal * 100) / 100
                    }
                }
            }, {
                id: 'extraAttack',
                label: '💫 额外攻击',
                desc: '攻击次数 +1 (上限5)',
                weight: 0.3,
                category: 'special',
                apply: () => {
                    if (state.player.extraAttackCount < MAX_EXTRA_ATTACK) {
                        state.player.extraAttackCount = Math.min(state.player.extraAttackCount + 1, MAX_EXTRA_ATTACK)
                    }
                }
            }, {
                id: 'atkSteal',
                label: '⚔️ 攻击力吸取',
                desc: '吸取概率 10%→25%→50%，触发后攻击力+0.5 (Boss掉落, 上限3级)',
                weight: 0.5,
                category: 'special',
                apply: () => {
                    if (state.player.stealLevel < MAX_STEAL_LEVEL) {
                        state.player.stealLevel++
                    }
                }
            }, {
                id: 'pierce',
                label: '💥 穿透强化',
                desc: '穿透次数 +1 (上限5)',
                weight: 1.0,
                category: 'special',
                apply: () => {
                    if (state.player.pierceCount < MAX_PIERCE) {
                        state.player.pierceCount = Math.min(state.player.pierceCount + 1, MAX_PIERCE)
                    }
                }
            }, {
                id: 'split',
                label: '💥 子弹分裂',
                desc: '分裂等级 +1 (上限3)',
                weight: 1.0,
                category: 'special',
                apply: () => {
                    if (state.player.splitLevel < MAX_SPLIT_LEVEL) {
                        state.player.splitLevel = Math.min(state.player.splitLevel + 1, MAX_SPLIT_LEVEL)
                    }
                }
            }, {
                id: 'ricochet',
                label: '💫 子弹弹射',
                desc: '弹射次数 +1 (上限3)，伤害逐次减半',
                weight: 1.0,
                category: 'special',
                apply: () => {
                    if (state.player.ricochetCount < MAX_RICOCHET) {
                        state.player.ricochetCount = Math.min(state.player.ricochetCount + 1, MAX_RICOCHET)
                    }
                }
            }, {
                id: 'parallel',
                label: '➡️ 平行弹道',
                desc: '+1 平行弹道 (上限8)',
                weight: 1.0,
                category: 'ballistic',
                apply: () => {
                    if (state.player.parallelCount < MAX_PARALLEL) {
                        state.player.parallelCount = Math.min(state.player.parallelCount + 1, MAX_PARALLEL)
                    }
                }
            }, {
                id: 'scatter',
                label: '🔀 散射弹道',
                desc: '+1 散射弹道 (上限8)',
                weight: 1.0,
                category: 'ballistic',
                apply: () => {
                    if (state.player.scatterCount < MAX_SCATTER) {
                        state.player.scatterCount = Math.min(state.player.scatterCount + 1, MAX_SCATTER)
                    }
                }
            }, ]

            function getAvailableUpgrades() {
                const p = state.player
                const maxRange = Math.min(worldW, worldH)
                return UPGRADE_POOL.filter(item => {
                    if (item.id === 'pierce' && p.pierceCount >= MAX_PIERCE) return false
                    if (item.id === 'extraAttack' && p.extraAttackCount >= MAX_EXTRA_ATTACK) return false
                    if (item.id === 'split' && p.splitLevel >= MAX_SPLIT_LEVEL) return false
                    if (item.id === 'lifeSteal' && p.lifeSteal >= MAX_LIFE_STEAL) return false
                    if (item.id === 'atkSteal' && p.stealLevel >= MAX_STEAL_LEVEL) return false
                    if (item.id === 'range' && p.range >= maxRange) return false
                    if (item.id === 'parallel' && p.parallelCount >= MAX_PARALLEL) return false
                    if (item.id === 'scatter' && p.scatterCount >= MAX_SCATTER) return false
                    if (item.id === 'ricochet' && p.ricochetCount >= MAX_RICOCHET) return false
                    if (item.id === 'atkSpeed' && p.attackSpeed >= MAX_ATTACK_SPEED) return false
                    if (item.id === 'bulletSpeed' && p.bulletSpeedMult >= MAX_BULLET_SPEED_MULT) return false

                    if (item.id === 'parallel' && p.scatterCount > 0) return false
                    if (item.id === 'scatter' && p.parallelCount > 0) return false
                    if (item.id === 'parallel' && p.splitLevel > 0) return false
                    if (item.id === 'split' && p.parallelCount > 0) return false
                    if (item.id === 'pierce' && p.splitLevel > 0) return false
                    if (item.id === 'split' && p.pierceCount > 0) return false
                    if (item.id === 'ricochet' && p.pierceCount > 0) return false
                    if (item.id === 'pierce' && p.ricochetCount > 0) return false
                    if (item.id === 'split' && p.ricochetCount > 0) return false
                    if (item.id === 'ricochet' && p.splitLevel > 0) return false

                    return true
                })
            }

            function getUpgradeOptions(category, count = 3, rare = false, extraIds = []) {
                const categories = Array.isArray(category) ? category : [category]
                const pool = getAvailableUpgrades().filter(item =>
                    categories.includes(item.category) || extraIds.includes(item.id))
                const shuffled = pool.slice().sort(() => Math.random() - 0.5)
                let options = shuffled.slice(0, count)

                if (rare) {
                    options = options.map(item => {
                        if (item.category === 'base') {
                            const copy = { ...item }
                            copy.label = '✨ ' + copy.label + ' (翻倍)'
                            copy.desc = copy.desc + ' ×2'
                            const originalApply = copy.apply
                            copy.apply = () => {
                                originalApply()
                                const id = item.id
                                if (id === 'atk') {
                                    const bonus = randInt(1, 3)
                                    state.player.atk += bonus
                                } else if (id === 'hp') {
                                    state.player.maxHp += 3
                                    state.player.hp = state.player.maxHp
                                } else if (id === 'range') {
                                    const maxRange = Math.min(worldW, worldH)
                                    const newRange = state.player.range + 15
                                    state.player.range = Math.min(newRange, maxRange)
                                } else if (id === 'atkSpeed') {
                                    if (state.player.attackSpeed < MAX_ATTACK_SPEED) {
                                        const bonus = rand(0.10, 0.25)
                                        const newSpeed = state.player.attackSpeed * (1 + bonus)
                                        state.player.attackSpeed = Math.min(MAX_ATTACK_SPEED, Math.round(newSpeed * 100) /
                                        100)
                                    }
                                } else if (id === 'bulletSpeed') {
                                    if (state.player.bulletSpeedMult < MAX_BULLET_SPEED_MULT) {
                                        const newMult = state.player.bulletSpeedMult * 1.1
                                        state.player.bulletSpeedMult = Math.min(MAX_BULLET_SPEED_MULT, Math.round(newMult *
                                            100) / 100)
                                    }
                                } else if (id === 'lifeSteal') {
                                    if (state.player.lifeSteal < MAX_LIFE_STEAL) {
                                        const bonus = rand(0.1, 0.2)
                                        state.player.lifeSteal = Math.min(state.player.lifeSteal + bonus, MAX_LIFE_STEAL)
                                        state.player.lifeSteal = Math.round(state.player.lifeSteal * 100) / 100
                                    }
                                }
                            }
                            return copy
                        } else {
                            return item
                        }
                    })
                }

                return options
            }

            function renderUpgradeUI(options, onClose) {
                upgradeList.innerHTML = ''
                options.forEach((opt, index) => {
                    const div = document.createElement('div')
                    div.className = 'arena-upgrade-item'
                    if (opt.label && opt.label.includes('✨')) {
                        div.classList.add('rare')
                    }
                    div.innerHTML = `
                <span class="ug-label">${opt.label || ''}</span>
                <span class="ug-desc">${opt.desc || ''}</span>
              `
                    div.addEventListener('click', () => {
                        opt.apply()
                        upgradeOverlay.style.display = 'none'
                        state.paused = false
                        saveRecord()
                        updateUI()
                        if (onClose) onClose()
                        setTimeout(() => checkUpgradeAndBoss(), 50)
                    })
                    upgradeList.appendChild(div)
                })
            }

            function checkUpgradeAndBoss() {
                const p = state.player
                if (p.currentKills >= p.killsForNext) {
                    p.currentKills -= p.killsForNext
                    p.level++
                    p.killsForNext = Math.floor(5 + p.level * p.level * 0.5 + state.wave * 2)
                    applyLevelUpBonus()
                    state.paused = true
                    const options = getUpgradeOptions('base', 3, false, ['extraAttack', 'ricochet'])
                    renderUpgradeUI(options, () => {
                        if (state._pendingBossRare) {
                            state._pendingBossRare = false
                state.webZones = []
                state.flashRed = 0
                state.shakeTimer = 0
                state.enrageWarnTimer = 0
                p.poisonTimer = 0
                p.poisonDps = 0
                p.mistPoisonTimer = 0
                            showBossUpgrade()
                        }
                    })
                    upgradeOverlay.style.display = 'flex'
                    return true
                } else {
                    if (state._pendingBossRare) {
                        state._pendingBossRare = false
                state.webZones = []
                state.flashRed = 0
                state.shakeTimer = 0
                state.enrageWarnTimer = 0
                p.poisonTimer = 0
                p.poisonDps = 0
                p.mistPoisonTimer = 0
                        showBossUpgrade()
                    }
                    return false
                }
            }

            function showBossUpgrade() {
                state.paused = true

                const specialBallisticPool = getAvailableUpgrades().filter(item => ['special', 'ballistic'].includes(item
                .category))
                let options = []

                if (specialBallisticPool.length >= 3) {
                    const shuffled = specialBallisticPool.slice().sort(() => Math.random() - 0.5)
                    options = shuffled.slice(0, 3)
                } else {
                    const existing = specialBallisticPool.slice().sort(() => Math.random() - 0.5)
                    const need = 3 - existing.length
                    const basePool = getAvailableUpgrades().filter(item => item.category === 'base')
                    const shuffledBase = basePool.slice().sort(() => Math.random() - 0.5)
                    const baseOptions = shuffledBase.slice(0, need)

                    const rareBaseOptions = baseOptions.map(item => {
                        const copy = { ...item }
                        copy.label = '✨ ' + copy.label + ' (翻倍)'
                        copy.desc = copy.desc + ' ×2'
                        const originalApply = copy.apply
                        copy.apply = () => {
                            originalApply()
                            const id = item.id
                            if (id === 'atk') {
                                const bonus = randInt(1, 3)
                                state.player.atk += bonus
                            } else if (id === 'hp') {
                                state.player.maxHp += 3
                                state.player.hp = state.player.maxHp
                            } else if (id === 'range') {
                                const maxRange = Math.min(worldW, worldH)
                                const newRange = state.player.range + 15
                                state.player.range = Math.min(newRange, maxRange)
                            } else if (id === 'atkSpeed') {
                                if (state.player.attackSpeed < MAX_ATTACK_SPEED) {
                                    const bonus = rand(0.10, 0.25)
                                    const newSpeed = state.player.attackSpeed * (1 + bonus)
                                    state.player.attackSpeed = Math.min(MAX_ATTACK_SPEED, Math.round(newSpeed * 100) /
                                    100)
                                }
                            } else if (id === 'bulletSpeed') {
                                if (state.player.bulletSpeedMult < MAX_BULLET_SPEED_MULT) {
                                    const newMult = state.player.bulletSpeedMult * 1.1
                                    state.player.bulletSpeedMult = Math.min(MAX_BULLET_SPEED_MULT, Math.round(newMult *
                                        100) / 100)
                                }
                            } else if (id === 'lifeSteal') {
                                if (state.player.lifeSteal < MAX_LIFE_STEAL) {
                                    const bonus = rand(0.1, 0.2)
                                    state.player.lifeSteal = Math.min(state.player.lifeSteal + bonus, MAX_LIFE_STEAL)
                                    state.player.lifeSteal = Math.round(state.player.lifeSteal * 100) / 100
                                }
                            }
                        }
                        return copy
                    })

                    options = [...existing, ...rareBaseOptions]
                }

                // 二阶段 Boss 掉落：属性卡数值翻倍（clamp 到属性上限，已是翻倍卡的 base 补位不再叠加）
                if (state._bossDoubleDrop) {
                    state._bossDoubleDrop = false
                    options = options.map(item => {
                        if (item.label && item.label.includes('(翻倍)')) return item
                        const copy = { ...item }
                        copy.label = '✨ ' + copy.label + ' (翻倍)'
                        copy.desc = copy.desc + ' ×2'
                        const orig = copy.apply
                        copy.apply = () => { orig(); orig() }
                        return copy
                    })
                }

                renderUpgradeUI(options, null)
                upgradeOverlay.style.display = 'flex'
            }

            /* ─── 发射子弹 ────────────────────────── */
            function fireAttackBatch(target, angle, homing) {
                const p = state.player
                if (!target && angle === undefined) return

                playShootSound(state.selectedGun)

                // 提供 angle 时朝指定方向射击（键盘模式鼠标瞄准），否则朝目标敌人
                const baseAngle = (angle !== undefined) ? angle : Math.atan2(target.y - p.y, target.x - p.x)
                const currentSpeed = PROJECTILE_SPEED_BASE * p.bulletSpeedMult

                const barrelLen = p.radius + 14
                const gx = p.x + Math.cos(baseAngle) * barrelLen
                const gy = p.y + Math.sin(baseAngle) * barrelLen

                const dirX = Math.cos(baseAngle)
                const dirY = Math.sin(baseAngle)
                const perpX = -Math.sin(baseAngle)
                const perpY = Math.cos(baseAngle)

                let angles = []

                if (p.parallelCount > 0) {
                    const total = 1 + p.parallelCount
                    const totalWidth = (total - 1) * PARALLEL_STEP
                    for (let i = 0; i < total; i++) {
                        const offset = -totalWidth / 2 + i * PARALLEL_STEP
                        angles.push({
                            angle: baseAngle,
                            ox: perpX * offset,
                            oy: perpY * offset
                        })
                    }
                } else if (p.scatterCount > 0) {
                    const total = 1 + p.scatterCount
                    const totalAngle = (total - 1) * SCATTER_STEP
                    for (let i = 0; i < total; i++) {
                        const angleOffset = -totalAngle / 2 + i * SCATTER_STEP
                        const a = baseAngle + angleOffset
                        angles.push({ angle: a, ox: 0, oy: 0 })
                    }
                } else {
                    angles.push({ angle: baseAngle, ox: 0, oy: 0 })
                }

                for (const b of angles) {
                    const dirX2 = Math.cos(b.angle)
                    const dirY2 = Math.sin(b.angle)
                    const startX = gx + (b.ox || 0)
                    const startY = gy + (b.oy || 0)
                    state.projectiles.push({
                        x: startX,
                        y: startY,
                        vx: dirX2 * currentSpeed,
                        vy: dirY2 * currentSpeed,
                        length: p.bulletLength || 12,
                        width: p.bulletWidth || 1.5,
                        damage: p.atk,
                        life: 2.5,
                        isHoming: (homing !== undefined) ? homing : true,
                        isChild: false,
                        splitRemain: p.splitLevel,
                        pierceRemain: p.pierceCount,
                        hitEnemies: new Set(),
                        radius: 6,
                        ricochetRemain: p.ricochetCount,
                        _trailTimer: 0,
                    })
                }

                p.attackDirection.x = -Math.cos(baseAngle)
                p.attackDirection.y = -Math.sin(baseAngle)
                p.attackEffectTimer = 0.12
            }

            /* ─── 粒子生成 ────────────────────────── */
            function spawnHitParticles(x, y, count = 16) {
                for (let i = 0; i < count; i++) {
                    const angle = rand(0, Math.PI * 2)
                    const speed = rand(100, 280)
                    const size = rand(3, 12)
                    const colors = ['#ffaa44', '#ff8844', '#ffcc44', '#ffffff']
                    const color = colors[randInt(0, colors.length - 1)]
                    state.particles.push({
                        x,
                        y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: size,
                        life: rand(0.15, 0.45),
                        color: color,
                    })
                }
            }

            /* ─── 玩家受击火花 ────────────────────── */
            function spawnPlayerHitParticles(x, y, count = 20) {
                for (let i = 0; i < count; i++) {
                    const angle = rand(0, Math.PI * 2)
                    const speed = rand(140, 380)
                    const size = rand(2, 9)
                    const colors = ['#ff5555', '#ff7744', '#ffcc66', '#ffffff']
                    const color = colors[randInt(0, colors.length - 1)]
                    state.particles.push({
                        x,
                        y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: size,
                        life: rand(0.15, 0.5),
                        color: color,
                    })
                }
            }

            /* ─── 飘浮文字 ────────────────────────── */
            function spawnFloatText(x, y, text, color) {
                state.floatTexts.push({
                    x,
                    y,
                    text,
                    color,
                    life: 0.9,
                    vy: -45,
                })
            }

            function spawnDeathPowder(x, y, count = 55) {
                for (let i = 0; i < count; i++) {
                    const angle = rand(0, Math.PI * 2)
                    const speed = rand(100, 250)
                    const offset = 8
                    const type = Math.random() < 0.5 ? 'dot' : 'line'
                    const size = type === 'dot' ? rand(0.8, 2.8) : rand(2.0, 4.5)
                    const color = `rgba(${randInt(230,255)}, ${randInt(230,255)}, ${randInt(240,255)}, 0.9)`
                    state.dust.push({
                        x: x + (Math.random() - 0.5) * offset * 2,
                        y: y + (Math.random() - 0.5) * offset * 2,
                        vx: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
                        vy: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5) - 25,
                        size: size,
                        life: rand(1.2, 2.8),
                        color: color,
                        type: type,
                        angle: angle,
                    })
                }
            }

            /* ─── 核心更新 ────────────────────────── */
            function update(dt) {
                if (state.gamePaused || state.gameOver || !state.selectedGun || state.paused) return
                const p = state.player
                const speedMult = parseFloat(speedMultSlider.value) || 1.0

                if (p.hurtFlashTimer > 0) {
                    p.hurtFlashTimer -= dt
                    if (p.hurtFlashTimer < 0) p.hurtFlashTimer = 0
                }

                // ---- 束缚减速区域更新 + 中毒持续伤害（先于移动计算） ----
                state._playerSlowed = false
                for (let i = state.webZones.length - 1; i >= 0; i--) {
                    const z = state.webZones[i]
                    z.life -= dt
                    if (z.life <= 0) {
                        state.webZones.splice(i, 1)
                        continue
                    }
                    if (dist(z, p) < z.radius + p.radius) {
                        state._playerSlowed = true
                        // 进入毒雾即中毒 2.5s（站在雾内持续刷新，离开后继续掉血）
                        p.mistPoisonTimer = 2.5
                        p._mistDps = z.dps || 1
                    }
                }
                // 毒雾中毒持续伤害（离开毒雾后仍持续）
                if (p.mistPoisonTimer > 0) {
                    p.mistPoisonTimer -= dt
                    p._mistTick = (p._mistTick || 0) + dt
                    if (p._mistTick >= 0.5) {
                        p._mistTick -= 0.5
                        const mistDmg = (p._mistDps || 1) * 0.5
                        p.hp = r2(p.hp - mistDmg)
                        spawnFloatText(p.x, p.y - p.radius - 24, '-' + mistDmg.toFixed(2), '#8bc34a')
                        if (p.hp <= 0) {
                            p.hp = 0
                            gameOver()
                        }
                    }
                }
                if (p.poisonTimer > 0) {
                    p.poisonTimer -= dt
                    p.hp = r2(p.hp - p.poisonDps * dt)
                    // 中毒跳字：每 0.5s 飘一次实际扣血量（对应 0.5s 内的毒伤）
                    p._poisonTick = (p._poisonTick || 0) + dt
                    if (p._poisonTick >= 0.5) {
                        p._poisonTick -= 0.5
                        const tickDmg = (p.poisonDps * 0.5).toFixed(2)
                        spawnFloatText(p.x, p.y - p.radius - 24, '-' + tickDmg, '#a5e000')
                    }
                    if (Math.random() < 0.5) {
                        state.particles.push({
                            x: p.x + rand(-12, 12),
                            y: p.y + rand(-12, 12),
                            vx: rand(-20, 20),
                            vy: rand(-55, -20),
                            size: rand(2, 5),
                            life: 0.6,
                            color: '#6fdc6f',
                        })
                    }
                    if (p.hp <= 0) {
                        p.hp = 0
                        gameOver()
                    }
                }

                if (state.joyActive && (state.joyDX !== 0 || state.joyDY !== 0)) {
                    // 移动端摇杆：方向 * 速度 持续移动（束缚区域内减速）
                    const joySpeed = p.speed * speedMult * (state._playerSlowed ? 0.5 : 1)
                    p.x += state.joyDX * joySpeed * dt
                    p.y += state.joyDY * joySpeed * dt
                    // 同步目标点，防止松开摇杆后被拉回
                    state.targetX = p.x
                    state.targetY = p.y
                } else if (state.controlMode === 'keyboard') {
                    // 键盘 WASD 八方向移动（targetX/targetY 保留为鼠标瞄准点）
                    let mx = 0,
                        my = 0
                    if (state.keys.w) my -= 1
                    if (state.keys.s) my += 1
                    if (state.keys.a) mx -= 1
                    if (state.keys.d) mx += 1
                    if (mx !== 0 || my !== 0) {
                        const len = Math.hypot(mx, my)
                        const mv = p.speed * speedMult * (state._playerSlowed ? 0.5 : 1)
                        p.x += (mx / len) * mv * dt
                        p.y += (my / len) * mv * dt
                    }
                } else {
                    const dx = state.targetX - p.x
                    const dy = state.targetY - p.y
                    const distMove = Math.hypot(dx, dy)
                    if (distMove > 2) {
                        const moveSpeed = p.speed * speedMult * (state._playerSlowed ? 0.5 : 1)
                        const step = Math.min(moveSpeed * dt, distMove)
                        p.x += (dx / distMove) * step
                        p.y += (dy / distMove) * step
                    }
                }
                const margin = 5
                p.x = clamp(p.x, margin, worldW - margin)
                p.y = clamp(p.y, margin, worldH - margin)

                let nearest = null,
                    nearDist = Infinity
                for (const e of state.enemies) {
                    const d = dist(p, e)
                    if (d < nearDist) { nearDist = d;
                        nearest = e }
                }
                let targetAngle = p.facingAngle
                if (state.controlMode === 'keyboard') {
                    // 键盘模式：朝向鼠标瞄准方向
                    targetAngle = Math.atan2(state.targetY - p.y, state.targetX - p.x)
                } else if (nearest) {
                    targetAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x)
                }
                p.targetAngle = targetAngle
                const diff = angleDelta(p.facingAngle, targetAngle)
                p.facingAngle += diff * Math.min(1, TURN_SPEED * dt * 60)
                p.facingDir = { x: Math.cos(p.facingAngle), y: Math.sin(p.facingAngle) }

                if (p.attackEffectTimer > 0) p.attackEffectTimer -= dt

                p.attackTimer -= dt
                if (p.attackTimer <= 0) {
                    if (state.controlMode === 'keyboard') {
                        // 键盘模式：朝鼠标方向射击（按住左键，或勾选自动射击）
                        const wantFire = state.mouseDown || state.autoFire
                        if (wantFire) {
                            const aimAngle = Math.atan2(state.targetY - p.y, state.targetX - p.x)
                            fireAttackBatch(null, aimAngle, false)
                            if (p.extraAttackCount > 0) {
                                p._extraPending = p.extraAttackCount
                                p._extraTimer = EXTRA_BATCH_INTERVAL
                            } else {
                                p._extraPending = 0
                                p._extraTimer = 0
                            }
                            p.attackTimer = 1 / p.attackSpeed
                        } else {
                            p.attackTimer = 0.05
                        }
                    } else if (nearest && nearDist < p.range) {
                        fireAttackBatch(nearest)
                        if (p.extraAttackCount > 0) {
                            p._extraPending = p.extraAttackCount
                            p._extraTimer = EXTRA_BATCH_INTERVAL
                        } else {
                            p._extraPending = 0
                            p._extraTimer = 0
                        }
                        p.attackTimer = 1 / p.attackSpeed
                    } else {
                        p.attackTimer = 0.05
                    }
                }

                if (p._extraPending > 0) {
                    p._extraTimer -= dt
                    if (p._extraTimer <= 0) {
                        let nearest2 = null,
                            nearDist2 = Infinity
                        for (const e of state.enemies) {
                            const d = dist(p, e)
                            if (d < nearDist2) { nearDist2 = d;
                                nearest2 = e }
                        }
                        if (state.controlMode === 'keyboard') {
                            // 键盘模式：追加攻击沿鼠标瞄准方向
                            const aimAngle = Math.atan2(state.targetY - p.y, state.targetX - p.x)
                            fireAttackBatch(null, aimAngle, false)
                        } else if (nearest2 && nearDist2 < p.range) {
                            fireAttackBatch(nearest2)
                        }
                        p._extraPending--
                        if (p._extraPending > 0) {
                            if (p.firePattern === 'burst') {
                                p._extraTimer = p.burstDelay || 0.06
                            } else {
                                p._extraTimer = EXTRA_BATCH_INTERVAL
                            }
                        } else {
                            p._extraTimer = 0
                        }
                    }
                }

                // ---- 玩家子弹更新 ----
                for (let i = state.projectiles.length - 1; i >= 0; i--) {
                    const proj = state.projectiles[i]
                    proj.x += proj.vx * dt
                    proj.y += proj.vy * dt
                    proj.life -= dt

                    if (proj.life > 0.1) {
                        const trailCount = 1
                        for (let t = 0; t < trailCount; t++) {
                            const trailLife = rand(0.08, 0.2)
                            const size = rand(1.5, 3.5)
                            const angle = Math.atan2(proj.vy, proj.vx)
                            const offsetDist = rand(2, 6)
                            const tx = proj.x - Math.cos(angle) * offsetDist
                            const ty = proj.y - Math.sin(angle) * offsetDist
                            state.particles.push({
                                x: tx + (Math.random() - 0.5) * 3,
                                y: ty + (Math.random() - 0.5) * 3,
                                vx: (Math.random() - 0.5) * 20,
                                vy: (Math.random() - 0.5) * 20,
                                size: size,
                                life: trailLife,
                                color: 'rgba(136, 221, 255, 0.5)',
                            })
                        }
                    }

                    if (proj.isHoming && state.enemies.length > 0) {
                        let closest = null,
                            cd = Infinity
                        for (const e of state.enemies) {
                            const d = dist(proj, e)
                            if (d < cd) { cd = d;
                                closest = e }
                        }
                        if (closest) {
                            const angle = Math.atan2(closest.y - proj.y, closest.x - proj.x)
                            const speed = Math.hypot(proj.vx, proj.vy)
                            const homingStrength = proj.isChild ? 30 : 60
                            proj.vx += Math.cos(angle) * homingStrength * dt
                            proj.vy += Math.sin(angle) * homingStrength * dt
                            const curSpeed = Math.hypot(proj.vx, proj.vy)
                            if (curSpeed > speed * 1.2) {
                                proj.vx = (proj.vx / curSpeed) * speed * 1.2
                                proj.vy = (proj.vy / curSpeed) * speed * 1.2
                            }
                        }
                    }

                    for (let j = state.enemies.length - 1; j >= 0; j--) {
                        const e = state.enemies[j]
                        if (proj.hitEnemies.has(e)) continue
                        if (dist(proj, e) < proj.radius + e.radius) {
                            let hitDmg = proj.damage
                            if (e.type === 'shield') {
                                // 护盾怪：从玩家方向打来的子弹被护盾减伤 50%（绕后/弹射可打全额）
                                const hitAng = Math.atan2(proj.y - e.y, proj.x - e.x)
                                const faceAng = Math.atan2(p.y - e.y, p.x - e.x)
                                let da = Math.abs(hitAng - faceAng)
                                if (da > Math.PI) da = Math.PI * 2 - da
                                if (da < Math.PI / 2) hitDmg = hitDmg * 0.5
                            }
                            e.hp = r2(e.hp - hitDmg)
                            e.flashTimer = 0.2
                            playHitSound(state.selectedGun)
                            spawnHitParticles(proj.x, proj.y, 16)

                            if (p.lifeSteal > 0 && p.hp < p.maxHp) {
                                p.hp = r2(Math.min(p.hp + p.lifeSteal, p.maxHp))
                                // 未满血时在玩家上方显示绿色数值反馈
                                spawnFloatText(p.x, p.y - p.radius - 12, '+' + p.lifeSteal.toFixed(1), '#7CFC00')
                            }

                            const knockbackStrength = 30 + proj.damage * 5
                            const angle = Math.atan2(proj.vy, proj.vx)
                            e.knockbackX = Math.cos(angle) * knockbackStrength
                            e.knockbackY = Math.sin(angle) * knockbackStrength

                            const shouldSplit = (proj.splitRemain > 0 && proj.damage > 0.3)
                            if (shouldSplit) {
                                const spreadAngle = 0.5
                                const speed = Math.hypot(proj.vx, proj.vy) * 0.9
                                const inheritedHit = new Set(proj.hitEnemies)
                                inheritedHit.add(e)
                                for (let k = 0; k < 2; k++) {
                                    const sign = k === 0 ? 1 : -1
                                    const angleOffset = sign * rand(0.1, spreadAngle)
                                    const dir = Math.atan2(proj.vy, proj.vx) + angleOffset
                                    const childDamage = Math.max(0.5, proj.damage * 0.5)
                                    const offsetLen = 2
                                    const childX = proj.x + Math.cos(dir) * offsetLen
                                    const childY = proj.y + Math.sin(dir) * offsetLen
                                    state.projectiles.push({
                                        x: childX,
                                        y: childY,
                                        vx: Math.cos(dir) * speed,
                                        vy: Math.sin(dir) * speed,
                                        length: (proj.length || 12) * 0.8,
                                        width: (proj.width || 1.5) * 0.8,
                                        damage: childDamage,
                                        life: (proj.life || 2.5) * 0.8,
                                        isHoming: true,
                                        isChild: true,
                                        splitRemain: proj.splitRemain - 1,
                                        hitEnemies: inheritedHit,
                                        radius: (proj.radius || 6) * 0.8,
                                        pierceRemain: 0,
                                        ricochetRemain: 0,
                                        _trailTimer: 0,
                                    })
                                }
                            }

                            const canRicochet = (proj.ricochetRemain > 0 && !shouldSplit)
                            if (canRicochet) {
                                let nearestEnemy = null,
                                    nearDist2 = Infinity
                                for (const other of state.enemies) {
                                    if (other === e || proj.hitEnemies.has(other)) continue
                                    const d = dist(proj, other)
                                    if (d < nearDist2) { nearDist2 = d;
                                        nearestEnemy = other }
                                }
                                if (nearestEnemy) {
                                    const newDamage = Math.max(0.1, proj.damage * 0.5)
                                    const angle2 = Math.atan2(nearestEnemy.y - proj.y, nearestEnemy.x - proj.x)
                                    const speed = Math.hypot(proj.vx, proj.vy) * 0.95
                                    const inheritedHit = new Set(proj.hitEnemies)
                                    inheritedHit.add(e)
                                    state.projectiles.push({
                                        x: proj.x,
                                        y: proj.y,
                                        vx: Math.cos(angle2) * speed,
                                        vy: Math.sin(angle2) * speed,
                                        length: proj.length,
                                        width: proj.width,
                                        damage: newDamage,
                                        life: proj.life * 0.9,
                                        isHoming: true,
                                        isChild: false,
                                        splitRemain: 0,
                                        pierceRemain: 0,
                                        hitEnemies: inheritedHit,
                                        radius: proj.radius,
                                        ricochetRemain: proj.ricochetRemain - 1,
                                        _trailTimer: 0,
                                    })
                                }
                            }

                            proj.hitEnemies.add(e)
                            if (proj.pierceRemain > 0) {
                                proj.pierceRemain--
                            } else {
                                state.projectiles.splice(i, 1)
                                break
                            }
                        }
                    }

                    if (state.projectiles[i] && (proj.life <= 0 || proj.x < -50 || proj.x > worldW + 50 || proj.y < -50 ||
                            proj.y > worldH + 50)) {
                        state.projectiles.splice(i, 1)
                    }
                }

                // ---- 命中粒子更新 ----
                for (let i = state.particles.length - 1; i >= 0; i--) {
                    const pt = state.particles[i]
                    pt.x += pt.vx * dt
                    pt.y += pt.vy * dt
                    pt.life -= dt
                    pt.size *= (1 - dt * 0.5)
                    if (pt.life <= 0 || pt.size < 0.5) {
                        state.particles.splice(i, 1)
                    }
                }

                // ---- 死亡粉末更新 ----
                for (let i = state.dust.length - 1; i >= 0; i--) {
                    const d = state.dust[i]
                    d.x += d.vx * dt
                    d.y += d.vy * dt
                    d.vx *= (1 - dt * 2.5)
                    d.vy *= (1 - dt * 2.5)
                    d.vx += (Math.random() - 0.5) * 6 * dt
                    d.vy += (Math.random() - 0.5) * 6 * dt - 4 * dt
                    const spd = Math.hypot(d.vx, d.vy)
                    if (spd > 80) {
                        d.vx = (d.vx / spd) * 80
                        d.vy = (d.vy / spd) * 80
                    }
                    d.life -= dt
                    const shrinkRate = d.life > 1.0 ? 0.6 : 0.15
                    d.size *= (1 - dt * shrinkRate)
                    if (d.life <= 0 || d.size < 0.2) {
                        state.dust.splice(i, 1)
                    }
                }

                // ---- 飘浮文字更新 ----
                for (let i = state.floatTexts.length - 1; i >= 0; i--) {
                    const ft = state.floatTexts[i]
                    ft.y += ft.vy * dt
                    ft.life -= dt
                    if (ft.life <= 0) {
                        state.floatTexts.splice(i, 1)
                    }
                }

                // ---- 攻击特效更新 ----
                for (let i = state.attackFx.length - 1; i >= 0; i--) {
                    const fx = state.attackFx[i]
                    fx.life -= dt
                    if (fx.life <= 0) {
                        state.attackFx.splice(i, 1)
                    }
                }

                // ---- Boss 冲刺残影更新 ----
                for (let i = state.ghosts.length - 1; i >= 0; i--) {
                    const g = state.ghosts[i]
                    g.life -= dt
                    if (g.life <= 0) {
                        state.ghosts.splice(i, 1)
                    }
                }

                // ---- 敌人更新（含击退衰减） ----
                for (const e of state.enemies) {
                    if (Math.abs(e.knockbackX) > 0.1 || Math.abs(e.knockbackY) > 0.1) {
                        e.x += e.knockbackX * dt
                        e.y += e.knockbackY * dt
                        e.knockbackX *= (1 - dt * 8)
                        e.knockbackY *= (1 - dt * 8)
                        if (Math.abs(e.knockbackX) < 0.1) e.knockbackX = 0
                        if (Math.abs(e.knockbackY) < 0.1) e.knockbackY = 0
                    }
                    if (e.flashTimer > 0) e.flashTimer -= dt
                    if (e.dashCooldown > 0) e.dashCooldown -= dt
                    // nova 蓄力波纹：独立计时器按间隔生成，间隔随进度单调加速
                    if (e.attackType === 'nova' && e.attackState === 'windup') {
                        e.novaPulseTimer -= dt
                        if (e.novaPulseTimer <= 0) {
                            state.attackFx.push({
                                type: 'novaPulse',
                                x: e.x,
                                y: e.y,
                                radius: MELEE_ATTACKS.nova.radius * (e.skillScale || 1) + e.radius,
                                life: 0.5,
                                maxLife: 0.5,
                            })
                            const prog = 1 - e.windupTimer / MELEE_BOSS_NOVA_WINDUP
                            e.novaPulseTimer = 1.2 - prog * 1.05
                        }
                    }
                    if (e.warn) {
                        e.warn.timer -= dt
                        if (e.warn.timer <= 0) e.warn = null
                    }
                }

                                // ---- 敌人 AI（逻辑在 enemies.js） ----
                EnemySystem.updateEnemyAI(dt, speedMult)

                // ---- 远程敌人子弹更新 ----
                for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
                    const proj = state.enemyProjectiles[i]
                    proj.x += proj.vx * dt
                    proj.y += proj.vy * dt
                    proj.life -= dt

                    if (dist(proj, p) < proj.radius + p.radius) {
                        const damageAmount = proj.damage
                        p.hp = r2(p.hp - damageAmount)
                        p.hurtFlashTimer = 0.2
                        spawnPlayerHitParticles(proj.x, proj.y, 18)
                        if (proj.kind === 'venom') {
                            // 毒液弹：附加中毒（4s 持续伤害，主伤害靠毒）
                            p.poisonTimer = 4
                            p.poisonDps = proj.poisonDps || 1.5
                        }
                        state.enemyProjectiles.splice(i, 1)
                        if (p.hp <= 0) {
                            p.hp = 0
                            gameOver()
                        }
                        continue
                    }

                    if (proj.life <= 0 || proj.x < -50 || proj.x > worldW + 50 || proj.y < -50 || proj.y > worldH + 50) {
                        state.enemyProjectiles.splice(i, 1)
                    }
                }

                // ---- 敌人死亡检测 ----
                let bossKilled = false
                const deadEnemies = []
                for (const e of state.enemies) {
                    if (e.hp <= 0) {
                        deadEnemies.push(e)
                        if (e.isBoss) bossKilled = true
                    }
                }

                // ---- 二阶段触发：大型 Boss 死亡时 30% 概率原地进化复活（回满血、变身演出） ----
                for (let di = deadEnemies.length - 1; di >= 0; di--) {
                    const e = deadEnemies[di]
                    if (e.isLargeBoss && !e.stage2 && Math.random() < 0.3) {
                        startBossPhase(e, 'revive')
                        deadEnemies.splice(di, 1)
                    }
                }
                if (deadEnemies.length === 0 && bossKilled) bossKilled = false

                for (const e of deadEnemies) {
                    if (e.waveId === state.currentWaveId) {
                        state.waveKilled++
                    }
                }

                for (const e of deadEnemies) {
                    spawnDeathPowder(e.x, e.y, e.isBoss ? 100 : 55)
                }
                // 特殊敌人死亡结算：自爆怪被击杀时小范围自爆；分裂怪分裂出 2 只小怪
                for (const e of deadEnemies) {
                    if (e.type === 'bomber' && !e.exploding) {
                        if (dist(e, p) < 55 + p.radius) {
                            const dmg = Math.max(1, Math.floor(e.damage * 0.75))
                            p.hp = r2(p.hp - dmg)
                            p.hurtFlashTimer = 0.2
                            spawnPlayerHitParticles(p.x, p.y, 16)
                            if (p.hp <= 0) { p.hp = 0; gameOver() }
                        }
                        // 被击杀小爆炸特效
                        state.attackFx.push({ type: 'blast', x: e.x, y: e.y, angle: 0, life: 0.25 })
                        spawnHitParticles(e.x, e.y, 20)
                    }
                    if (e.type === 'splitter' && !e.isMinion) {
                        const childHp = Math.max(1, Math.floor(e.maxHp * 0.3))
                        const childDmg = Math.max(1, Math.floor(e.damage * 0.5))
                        for (let k = 0; k < 2; k++) {
                            const a = Math.random() * Math.PI * 2
                            state.enemies.push({
                                x: e.x + Math.cos(a) * (e.radius + 6),
                                y: e.y + Math.sin(a) * (e.radius + 6),
                                radius: Math.max(6, e.radius * 0.6),
                                hp: childHp,
                                maxHp: childHp,
                                speed: e.speed * 1.25,
                                damage: childDmg,
                                isBoss: false,
                                type: 'splitter',
                                isMinion: true,
                                attackCooldown: 0,
                                attackInterval: 0.6,
                                rangedCooldown: 0,
                                preferredDist: 350,
                                flashTimer: 0,
                                waveId: e.waveId,
                                knockbackX: 0,
                                knockbackY: 0,
                            })
                        }
                    }
                }
                state.enemies = state.enemies.filter(e => e.hp > 0)
                const killed = deadEnemies.length
                // 母体孵化的小怪不计入玩家击杀统计（防刷等级/刷吸取）
                const realKills = deadEnemies.filter(e => !e.isMotherMinion).length
                if (killed > 0) {
                    if (realKills > 0) {
                        state.player.totalKills += realKills
                        state.player.currentKills += realKills

                        // ---- 攻击力吸取（被动成长，仅Boss掉落属性，无翻倍） ----
                        const stealChance = p.stealLevel > 0 ? STEAL_CHANCES[p.stealLevel] : 0
                        if (stealChance > 0) {
                            for (let si = 0; si < realKills; si++) {
                                if (Math.random() < stealChance) {
                                    p.atk = r2(p.atk + STEAL_ATK_BONUS)
                                    // 吸取成功：玩家身上向上飘浮金色文字反馈
                                    spawnFloatText(p.x, p.y - p.radius - 12, '+' + STEAL_ATK_BONUS.toFixed(1), '#ffd700')
                                }
                            }
                        }
                    }

                    if (bossKilled) {
                        state._pendingBossRare = true
                        // 二阶段 Boss 击杀：掉落属性翻倍（数值 ×2，clamp 属性上限）
                        state._bossDoubleDrop = deadEnemies.some(e => e.isBoss && e.stage2)
                    }
                    checkUpgradeAndBoss()
                }

                // 有 Boss 存活时完全冻结波次推进，击败 Boss 后继续
                const hasBoss = state.enemies.some(e => e.isBoss)
                if (!hasBoss) {
                    if (state.waveSpawned > 0 && state.waveKilled >= state.waveSpawned / 2 && !state.gameOver && !state.paused) {
                        startWave()
                    }

                    if (state.enemies.length === 0 && !state.gameOver && !state.paused) {
                        startWave()
                    }
                }

                updateUI()
            }

            /* ─── 渲染 ────────────────────────────── */
            function render() {
                ctx.clearRect(0, 0, canvasW, canvasH)

                // 相机：电脑端边缘滚动（中央 60% 死区相机不动，贴近边缘才跟随）；手机端玩家居中跟随
                if (state.selectedGun) {
                    if (isTouchDevice) {
                        camX = clamp(state.player.x - canvasW / 2, 0, Math.max(0, worldW - canvasW))
                        camY = clamp(state.player.y - canvasH / 2, 0, Math.max(0, worldH - canvasH))
                    } else {
                        // 电脑端：边缘滚动，越界时平滑过渡（lerp）
                        const edgeX = canvasW * 0.30
                        const edgeY = canvasH * 0.30
                        let targetCamX = camX
                        let targetCamY = camY
                        if (state.player.x < camX + edgeX) targetCamX = state.player.x - edgeX
                        else if (state.player.x > camX + canvasW - edgeX) targetCamX = state.player.x - (canvasW - edgeX)
                        if (state.player.y < camY + edgeY) targetCamY = state.player.y - edgeY
                        else if (state.player.y > camY + canvasH - edgeY) targetCamY = state.player.y - (canvasH - edgeY)
                        camX += (clamp(targetCamX, 0, Math.max(0, worldW - canvasW)) - camX) * 0.15
                        camY += (clamp(targetCamY, 0, Math.max(0, worldH - canvasH)) - camY) * 0.15
                    }
                }
                ctx.save()
                // 震屏效果（狂暴触发）
                let shakeX = 0,
                    shakeY = 0
                if (state.shakeTimer > 0) {
                    state.shakeTimer -= 1 / 60
                    shakeX = (Math.random() - 0.5) * state.shakePower
                    shakeY = (Math.random() - 0.5) * state.shakePower
                }
                ctx.translate(-camX + shakeX, -camY + shakeY)

                // ---- 地面装饰（地图纹理，提供移动参照物） ----
                if (!state._terrain) {
                    state._terrain = []
                    const n = Math.floor(120 * WORLD_ZOOM)
                    const spaceColors = ['#7fb3ff', '#b08cff', '#7ff0d8']
                    for (let i = 0; i < n; i++) {
                        // 0=陨石, 2=空间裂缝, 3=星云（不生成晶体）
                        const type = [0, 2, 3][randInt(0, 2)]
                        const t = {
                            x: Math.random() * worldW,
                            y: Math.random() * worldH,
                            type,
                            size: rand(8, 20),
                            phase: rand(0, Math.PI * 2),
                            color: spaceColors[randInt(0, 2)],
                        }
                        if (type === 0) {
                            // 陨石：随机形状顶点（5-8 个，预生成避免每帧抖动）
                            const sides = randInt(5, 8)
                            t.verts = []
                            for (let s = 0; s < sides; s++) {
                                const a = (s / sides) * Math.PI * 2
                                const rr = t.size * (0.5 + Math.random() * 0.6)
                                t.verts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr })
                            }
                        }
                        state._terrain.push(t)
                    }
                }
                const terrainTime = performance.now() / 1000
                for (const t of state._terrain) {
                    if (t.x < camX - 40 || t.x > camX + canvasW + 40 || t.y < camY - 40 || t.y > camY + canvasH + 40) continue
                    // 漂浮动画：轻微上下浮动
                    const bob = Math.sin(terrainTime * 1.5 + t.phase) * 3
                    const ty = t.y + bob
                    if (t.type === 0) {
                        // 漂浮陨石：随机形状 + 平滑光照渐变（左上受光 → 右下背光）
                        ctx.beginPath()
                        for (let v = 0; v < t.verts.length; v++) {
                            const vv = t.verts[v]
                            const px = t.x + vv.x
                            const py = ty + vv.y
                            if (v === 0) ctx.moveTo(px, py)
                            else ctx.lineTo(px, py)
                        }
                        ctx.closePath()
                        const grad = ctx.createRadialGradient(t.x - t.size * 0.35, ty - t.size * 0.35, 1, t.x, ty, t.size * 1.5)
                        grad.addColorStop(0, 'rgba(120,140,175,0.35)')
                        grad.addColorStop(0.55, 'rgba(65,75,100,0.5)')
                        grad.addColorStop(1, 'rgba(28,32,48,0.55)')
                        ctx.fillStyle = grad
                        ctx.fill()
                    } else if (t.type === 2) {
                        // 空间裂缝：紫光折线，亮度脉动
                        const pulse = 0.5 + 0.5 * Math.sin(terrainTime * 2 + t.phase)
                        ctx.strokeStyle = 'rgba(140,120,255,' + (0.3 + 0.3 * pulse).toFixed(3) + ')'
                        ctx.lineWidth = 2.5
                        ctx.beginPath()
                        ctx.moveTo(t.x - t.size, ty - t.size * 0.3)
                        ctx.lineTo(t.x - t.size * 0.3, ty + t.size * 0.2)
                        ctx.lineTo(t.x + t.size * 0.4, ty - t.size * 0.3)
                        ctx.lineTo(t.x + t.size, ty + t.size * 0.4)
                        ctx.stroke()
                    } else {
                        // 星云光晕：多层彩色同心圆（中心亮、边缘淡）
                        for (let layer = 0; layer < 3; layer++) {
                            ctx.globalAlpha = 0.11 - layer * 0.028
                            ctx.fillStyle = t.color
                            ctx.beginPath()
                            ctx.arc(t.x, ty, t.size * (1.7 - layer * 0.45), 0, Math.PI * 2)
                            ctx.fill()
                        }
                        ctx.globalAlpha = 1.0
                    }
                }

                if (!state._stars) {
                    state._stars = []
                    for (let i = 0; i < Math.floor(40 * WORLD_ZOOM); i++) {
                        state._stars.push({
                            x: Math.random() * worldW,
                            y: Math.random() * worldH,
                            size: Math.random() * 2.5 + 1.2,
                            alpha: Math.random() * 0.5 + 0.3
                        })
                    }
                }
                for (const star of state._stars) {
                    // 星星闪烁（alpha 脉动）
                    const tw = 0.6 + 0.4 * Math.sin(performance.now() / 1000 * 2 + star.x)
                    ctx.globalAlpha = star.alpha * tw
                    ctx.fillStyle = '#fff'
                    ctx.beginPath()
                    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
                    ctx.fill()
                }
                ctx.globalAlpha = 1.0

                if (!state.selectedGun) {
                    ctx.restore()
                    return
                }

                const p = state.player

                ctx.beginPath()
                ctx.arc(p.x, p.y, p.range, 0, Math.PI * 2)
                ctx.setLineDash([4, 8])
                ctx.strokeStyle = 'rgba(255,255,255,0.25)'
                ctx.lineWidth = 1.5
                ctx.stroke()
                ctx.setLineDash([])

                // ---- 玩家子弹 ----
                for (const proj of state.projectiles) {
                    const len = proj.length || 12
                    const endX = proj.x + (proj.vx / Math.hypot(proj.vx, proj.vy)) * len
                    const endY = proj.y + (proj.vy / Math.hypot(proj.vx, proj.vy)) * len
                    ctx.shadowColor = 'rgba(255,255,255,0.2)'
                    ctx.shadowBlur = 8
                    ctx.beginPath()
                    ctx.moveTo(proj.x, proj.y)
                    ctx.lineTo(endX, endY)
                    ctx.strokeStyle = proj.isChild ? '#aaddff' : '#88ddff'
                    ctx.lineWidth = proj.width || 1.5
                    ctx.stroke()
                    ctx.shadowBlur = 0
                    if (proj.pierceRemain > 0) {
                        ctx.fillStyle = 'rgba(255,255,255,0.3)'
                        ctx.font = '10px monospace'
                        ctx.textAlign = 'center'
                        ctx.textBaseline = 'middle'
                        ctx.fillText(proj.pierceRemain, proj.x, proj.y + 16)
                    }
                    if (proj.splitRemain > 0) {
                        ctx.fillStyle = 'rgba(100,200,255,0.3)'
                        ctx.font = '8px monospace'
                        ctx.textAlign = 'center'
                        ctx.textBaseline = 'top'
                        ctx.fillText('✦' + proj.splitRemain, proj.x, proj.y + 14)
                    }
                    if (proj.ricochetRemain > 0) {
                        ctx.fillStyle = 'rgba(200,150,255,0.3)'
                        ctx.font = '8px monospace'
                        ctx.textAlign = 'center'
                        ctx.textBaseline = 'bottom'
                        ctx.fillText('↻' + proj.ricochetRemain, proj.x, proj.y - 14)
                    }
                }

                // ---- 远程敌人子弹 ----
                for (const proj of state.enemyProjectiles) {
                    const dir = Math.atan2(proj.vy, proj.vx)
                    if (proj.kind === 'venom') {
                        // 毒液弹：绿色液滴（圆 + 拖尾）
                        ctx.beginPath()
                        ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2)
                        ctx.fillStyle = 'rgba(90,255,130,0.85)'
                        ctx.fill()
                        ctx.strokeStyle = 'rgba(90,255,130,0.35)'
                        ctx.lineWidth = 3
                        ctx.beginPath()
                        ctx.moveTo(proj.x, proj.y)
                        ctx.lineTo(proj.x - Math.cos(dir) * 14, proj.y - Math.sin(dir) * 14)
                        ctx.stroke()
                    } else if (proj.kind === 'bug') {
                        // 冲击波虫弹：墨绿小虫（圆 + 两个触角点）
                        ctx.beginPath()
                        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2)
                        ctx.fillStyle = 'rgba(150,210,90,0.9)'
                        ctx.fill()
                        ctx.strokeStyle = 'rgba(90,150,60,1)'
                        ctx.lineWidth = 1.5
                        ctx.stroke()
                        const px = Math.cos(dir)
                        const py = Math.sin(dir)
                        ctx.beginPath()
                        ctx.arc(proj.x + px * 6, proj.y + py * 6, 1.5, 0, Math.PI * 2)
                        ctx.fillStyle = 'rgba(60,110,40,0.9)'
                        ctx.fill()
                    } else {
                        // 普通远程弹 / 狙击弹：线条
                        const len = proj.kind === 'sniper' ? 18 : 8
                        const endX = proj.x + Math.cos(dir) * len
                        const endY = proj.y + Math.sin(dir) * len
                        ctx.beginPath()
                        ctx.moveTo(proj.x, proj.y)
                        ctx.lineTo(endX, endY)
                        ctx.strokeStyle = proj.kind === 'sniper' ? '#ffb020' : '#ff6b6b'
                        ctx.lineWidth = proj.kind === 'sniper' ? 3 : 1.5
                        ctx.stroke()
                    }
                }

                // ---- 炮弹 ----
                for (const c of state.cannonballs) {
                    if (c.kind === 'bomb') {
                        // 轰炸炸弹：拖影 + 弹体
                        const grad = ctx.createLinearGradient(c.x, c.y, c.x, c.y - c.tail)
                        grad.addColorStop(0, 'rgba(255,140,60,0.7)')
                        grad.addColorStop(1, 'rgba(255,140,60,0)')
                        ctx.strokeStyle = grad
                        ctx.lineWidth = 8
                        ctx.beginPath()
                        ctx.moveTo(c.x, c.y)
                        ctx.lineTo(c.x, c.y - c.tail)
                        ctx.stroke()
                        ctx.beginPath()
                        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2)
                        ctx.fillStyle = '#ff8844'
                        ctx.fill()
                        ctx.strokeStyle = '#ffcc66'
                        ctx.lineWidth = 2
                        ctx.stroke()
                    } else {
                        // 普通炮弹：引信闪烁 + 倒计时
                        const fusePulse = 0.4 + 0.6 * Math.abs(Math.sin(performance.now() / 90))
                        ctx.beginPath()
                        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2)
                        ctx.fillStyle = 'rgba(255,120,60,' + (0.25 + 0.3 * fusePulse).toFixed(3) + ')'
                        ctx.fill()
                        ctx.strokeStyle = 'rgba(255,180,100,' + (0.5 + 0.5 * fusePulse).toFixed(3) + ')'
                        ctx.lineWidth = 2
                        ctx.stroke()
                        ctx.fillStyle = 'rgba(255,255,255,0.7)'
                        ctx.font = '10px monospace'
                        ctx.textAlign = 'center'
                        ctx.fillText(c.fuse.toFixed(1), c.x, c.y - c.radius - 6)
                    }
                }

                // ---- 命中粒子 ----
                for (const pt of state.particles) {
                    const alpha = Math.max(0, pt.life / 0.3)
                    ctx.globalAlpha = alpha
                    const len = pt.size
                    const angle = Math.atan2(pt.vy, pt.vx)
                    const endX = pt.x + Math.cos(angle) * len
                    const endY = pt.y + Math.sin(angle) * len
                    ctx.beginPath()
                    ctx.moveTo(pt.x, pt.y)
                    ctx.lineTo(endX, endY)
                    ctx.strokeStyle = pt.color
                    ctx.lineWidth = 1.2
                    ctx.stroke()
                }
                ctx.globalAlpha = 1.0

                // ---- 死亡粉末 ----
                for (const d of state.dust) {
                    const alpha = Math.min(1, (d.life / 1.2) * 0.9)
                    ctx.globalAlpha = alpha
                    ctx.strokeStyle = d.color
                    ctx.fillStyle = d.color
                    if (d.type === 'dot') {
                        ctx.beginPath()
                        ctx.arc(d.x, d.y, Math.max(0.3, d.size), 0, Math.PI * 2)
                        ctx.fill()
                    } else {
                        const len = d.size
                        const dir = d.angle + (Math.random() - 0.5) * 0.3
                        const ex = d.x + Math.cos(dir) * len
                        const ey = d.y + Math.sin(dir) * len
                        ctx.beginPath()
                        ctx.moveTo(d.x, d.y)
                        ctx.lineTo(ex, ey)
                        ctx.lineWidth = 1.2
                        ctx.stroke()
                    }
                }
                ctx.globalAlpha = 1.0

                // ---- 敌人 ----
                for (const e of state.enemies) {
                    if (e.isMotherBoss) {
                        // 母体：绿色虫体 + 环绕触须；狂暴后变红 + 脉动
                        const enraged = e.enraged
                        const body = enraged ? 'rgba(0,200,90,0.42)' : 'rgba(90,220,140,0.3)'
                        const edge = enraged ? 'rgba(80,255,150,1)' : 'rgba(120,240,170,0.9)'
                        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 3)
                        const rad = e.radius * (1 + (enraged ? pulse * 0.1 : 0))
                        ctx.beginPath()
                        ctx.arc(e.x, e.y, rad, 0, Math.PI * 2)
                        ctx.fillStyle = body
                        ctx.fill()
                        ctx.strokeStyle = edge
                        ctx.lineWidth = enraged ? 3 : 2
                        ctx.stroke()
                        // 环绕触须斑点
                        for (let k = 0; k < 6; k++) {
                            const a = performance.now() / 1000 * 1.2 + k * Math.PI / 3
                            ctx.beginPath()
                            ctx.arc(e.x + Math.cos(a) * rad * 0.85, e.y + Math.sin(a) * rad * 0.85, 3.5, 0, Math.PI * 2)
                            ctx.fillStyle = edge
                            ctx.fill()
                        }
                        // 孵化 / 束缚预警圈
                        for (const w of e.motherWarns || []) {
                            const wp = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 8)
                            const wr = w.kind === 'web' ? 90 : 16
                            ctx.beginPath()
                            ctx.arc(w.x, w.y, wr, 0, Math.PI * 2)
                            ctx.strokeStyle = w.kind === 'web'
                                ? 'rgba(140,255,120,' + (0.4 + 0.3 * wp).toFixed(3) + ')'
                                : 'rgba(120,240,170,' + (0.4 + 0.3 * wp).toFixed(3) + ')'
                            ctx.lineWidth = 2
                            ctx.stroke()
                            ctx.fillStyle = w.kind === 'web' ? 'rgba(140,255,120,0.1)' : 'rgba(120,240,170,0.1)'
                            ctx.fill()
                        }
                    } else if (e.isArtilleryBoss) {
                        // 大型远程 Boss：紫色菱形
                        ctx.beginPath()
                        ctx.moveTo(e.x, e.y - e.radius)
                        ctx.lineTo(e.x + e.radius, e.y)
                        ctx.lineTo(e.x, e.y + e.radius)
                        ctx.lineTo(e.x - e.radius, e.y)
                        ctx.closePath()
                        if (e.flashTimer > 0) {
                            ctx.strokeStyle = '#fff'
                            ctx.lineWidth = 2.5
                        } else if (e.enraged) {
                            ctx.strokeStyle = 'rgba(255,110,80,1)'
                            ctx.lineWidth = 3
                        } else {
                            ctx.strokeStyle = 'rgba(205,160,240,1)'
                            ctx.lineWidth = 2
                        }
                        ctx.stroke()
                        ctx.fillStyle = e.enraged ? 'rgba(255,90,60,0.3)' : 'rgba(199,146,234,0.22)'
                        ctx.fill()
                    } else {
                        // 普通敌人：按类型着色（melee 白 / bomber 红 / splitter 紫 / charger 橙 / healer 绿）
                        let strokeC = 'rgba(255,255,255,0.6)'
                        let fillC = 'rgba(255,255,255,0.18)'
                        if (e.isMeleeBoss && e.enraged) { strokeC = 'rgba(255,150,70,1)'; fillC = 'rgba(255,130,50,0.35)' }
                        else if (e.type === 'bomber') { strokeC = 'rgba(255,90,70,0.9)'; fillC = 'rgba(255,80,60,0.28)' }
                        else if (e.type === 'splitter') { strokeC = 'rgba(190,90,230,0.9)'; fillC = 'rgba(180,80,220,0.28)' }
                        else if (e.type === 'charger') { strokeC = 'rgba(255,180,70,0.9)'; fillC = 'rgba(255,170,60,0.28)' }
                        else if (e.type === 'healer') { strokeC = 'rgba(100,230,140,0.9)'; fillC = 'rgba(80,220,120,0.28)' }
                        else if (e.type === 'sniper') { strokeC = 'rgba(80,190,255,0.9)'; fillC = 'rgba(70,180,255,0.28)' }
                        else if (e.type === 'shield') { strokeC = 'rgba(90,140,255,0.95)'; fillC = 'rgba(80,130,255,0.3)' }
                        ctx.beginPath()
                        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2)
                        if (e.flashTimer > 0) {
                            ctx.strokeStyle = '#fff'
                            ctx.lineWidth = 2.5
                        } else {
                            ctx.strokeStyle = strokeC
                            ctx.lineWidth = 1
                        }
                        ctx.stroke()
                        // 所有敌人填充内部（半透明）
                        ctx.fillStyle = fillC
                        ctx.fill()
                    }

                    if (e.isBoss) {
                        const cy = e.y - e.radius - 12
                        const cw = 20
                        ctx.beginPath()
                        ctx.moveTo(e.x - cw / 2, cy + 6)
                        ctx.lineTo(e.x - cw / 2 - 4, cy - 2)
                        ctx.lineTo(e.x - cw / 4, cy + 4)
                        ctx.lineTo(e.x, cy - 6)
                        ctx.lineTo(e.x + cw / 4, cy + 4)
                        ctx.lineTo(e.x + cw / 2 + 4, cy - 2)
                        ctx.lineTo(e.x + cw / 2, cy + 6)
                        ctx.closePath()
                        ctx.strokeStyle = '#ffd700'
                        ctx.lineWidth = 1.5
                        ctx.stroke()
                    }

                    // 特殊怪视觉提示：自爆预警圈 / 冲锋预警条 / 治疗怪十字
                    if (e.type === 'bomber' && e.exploding) {
                        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 12)
                        ctx.beginPath()
                        ctx.arc(e.x, e.y, BOMBER_BLAST_RADIUS * (0.88 + 0.12 * pulse), 0, Math.PI * 2)
                        ctx.strokeStyle = 'rgba(255,80,60,' + (0.35 + 0.35 * pulse).toFixed(3) + ')'
                        ctx.lineWidth = 2
                        ctx.stroke()
                    }
                    if (e.type === 'charger' && e.chargeState === 'windup') {
                        ctx.save()
                        ctx.translate(e.x, e.y)
                        ctx.rotate(e.chargeAngle)
                        ctx.fillStyle = 'rgba(255,170,60,0.12)'
                        ctx.strokeStyle = 'rgba(255,190,80,0.55)'
                        ctx.lineWidth = 1.5
                        ctx.fillRect(0, -e.radius - 5, e.chargeDist, (e.radius + 5) * 2)
                        ctx.strokeRect(0, -e.radius - 5, e.chargeDist, (e.radius + 5) * 2)
                        ctx.restore()
                    }
                    if (e.type === 'healer') {
                        const cs = e.radius * 0.55
                        ctx.strokeStyle = 'rgba(120,255,160,0.85)'
                        ctx.lineWidth = 2
                        ctx.beginPath()
                        ctx.moveTo(e.x - cs, e.y)
                        ctx.lineTo(e.x + cs, e.y)
                        ctx.moveTo(e.x, e.y - cs)
                        ctx.lineTo(e.x, e.y + cs)
                        ctx.stroke()
                    }
                    if (e.type === 'sniper' && e.chargeState === 'windup') {
                        // 狙击蓄力：红色瞄准线预警，贯穿整个视口
                        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 10)
                        const lineLen = Math.hypot(canvasW, canvasH) + 200
                        ctx.beginPath()
                        ctx.moveTo(e.x, e.y)
                        ctx.lineTo(e.x + Math.cos(e.chargeAngle) * lineLen, e.y + Math.sin(e.chargeAngle) * lineLen)
                        ctx.strokeStyle = 'rgba(255,80,80,' + (0.25 + 0.45 * pulse).toFixed(3) + ')'
                        ctx.lineWidth = 1.5
                        ctx.stroke()
                    }
                    if (e.type === 'shield') {
                        // 面朝玩家的护盾弧
                        const fa = Math.atan2(p.y - e.y, p.x - e.x)
                        ctx.beginPath()
                        ctx.arc(e.x, e.y, e.radius + 4, fa - Math.PI / 2, fa + Math.PI / 2)
                        ctx.strokeStyle = 'rgba(90,160,255,0.95)'
                        ctx.lineWidth = 3
                        ctx.stroke()
                    }

                    if (!e.isBoss && e.type === 'ranged') {
                        const angle = Math.atan2(e.vy || 1, e.vx || 0)
                        const dirX = Math.cos(angle)
                        const dirY = Math.sin(angle)
                        const tipX = e.x + dirX * (e.radius + 6)
                        const tipY = e.y + dirY * (e.radius + 6)
                        ctx.beginPath()
                        ctx.moveTo(e.x + dirX * (e.radius + 2), e.y + dirY * (e.radius + 2))
                        ctx.lineTo(tipX, tipY)
                        ctx.strokeStyle = 'rgba(200,180,255,0.6)'
                        ctx.lineWidth = 1.5
                        ctx.stroke()
                        const a = Math.atan2(dirY, dirX)
                        const s = 4
                        ctx.beginPath()
                        ctx.moveTo(tipX, tipY)
                        ctx.lineTo(tipX - s * Math.cos(a - 0.5), tipY - s * Math.sin(a - 0.5))
                        ctx.moveTo(tipX, tipY)
                        ctx.lineTo(tipX - s * Math.cos(a + 0.5), tipY - s * Math.sin(a + 0.5))
                        ctx.stroke()
                    }
                }

                // ---- Boss 冲刺残影 ----
                for (const g of state.ghosts) {
                    ctx.globalAlpha = Math.max(0, g.life / 0.35) * 0.35
                    ctx.strokeStyle = g.color || '#ffd700'
                    ctx.lineWidth = 2
                    ctx.beginPath()
                    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2)
                    ctx.stroke()
                }
                ctx.globalAlpha = 1.0

                // ---- Boss 攻击预警 ----
                for (const e of state.enemies) {
                    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 70)
                    // 近战 Boss windup 预警
                    if (e.isMeleeBoss && e.attackState === 'windup') {
                        ctx.save()
                        ctx.translate(e.x, e.y)
                        ctx.rotate(e.attackAngle)
                        ctx.fillStyle = 'rgba(255, 60, 60, ' + (0.10 + 0.16 * pulse).toFixed(3) + ')'
                        ctx.strokeStyle = 'rgba(255, 90, 90, ' + (0.55 + 0.35 * pulse).toFixed(3) + ')'
                        ctx.lineWidth = 2
                        const wsk = e.skillScale || 1
                        if (e.attackType === 'nova') {
                            // 基础蓄力圆（扩散波纹由 novaPulse 事件负责，节奏单调加速）
                            const r = MELEE_ATTACKS.nova.radius * wsk + e.radius
                            ctx.beginPath()
                            ctx.arc(0, 0, r, 0, Math.PI * 2)
                            ctx.fill()
                            ctx.stroke()
                            ctx.restore()
                            continue
                        }
                        ctx.beginPath()
                        if (e.attackType === 'fan') {
                            ctx.moveTo(0, 0)
                            ctx.arc(0, 0, MELEE_ATTACKS.fan.radius * wsk + e.radius, -MELEE_ATTACKS.fan.halfAngle * wsk, MELEE_ATTACKS.fan.halfAngle * wsk)
                            ctx.closePath()
                        } else if (e.attackType === 'slam') {
                            ctx.rect(e.radius, -MELEE_ATTACKS.slam.halfW * wsk, MELEE_ATTACKS.slam.len * wsk, MELEE_ATTACKS.slam.halfW * wsk * 2)
                        } else if (e.attackType === 'dash') {
                            ctx.rect(e.radius, -MELEE_ATTACKS.dash.halfW * wsk, e.dashLen || MELEE_ATTACKS.dash.len, MELEE_ATTACKS.dash.halfW * wsk * 2)
                        } else {
                            ctx.rect(e.radius, -MELEE_ATTACKS.charge.halfW * wsk, MELEE_ATTACKS.charge.len * wsk, MELEE_ATTACKS.charge.halfW * wsk * 2)
                        }
                        ctx.fill()
                        ctx.stroke()
                        ctx.restore()
                        continue
                    }
                    // 远程 Boss warn 预警
                    if (e.isArtilleryBoss && e.warn) {
                        const w = e.warn
                        if (w.type === 'fan') {
                            ctx.save()
                            ctx.translate(w.x, w.y)
                            ctx.rotate(w.angle)
                            ctx.fillStyle = 'rgba(255, 60, 60, ' + (0.10 + 0.16 * pulse).toFixed(3) + ')'
                            ctx.strokeStyle = 'rgba(255, 90, 90, ' + (0.55 + 0.35 * pulse).toFixed(3) + ')'
                            ctx.lineWidth = 2
                            ctx.beginPath()
                            ctx.moveTo(0, 0)
                            ctx.arc(0, 0, w.radius, -Math.PI / 3, Math.PI / 3)
                            ctx.closePath()
                            ctx.fill()
                            ctx.stroke()
                            ctx.restore()
                        } else if (w.type === 'ring') {
                            ctx.beginPath()
                            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2)
                            ctx.fillStyle = 'rgba(255, 60, 60, ' + (0.05 + 0.06 * pulse).toFixed(3) + ')'
                            ctx.fill()
                            ctx.strokeStyle = 'rgba(255, 90, 90, ' + (0.5 + 0.4 * pulse).toFixed(3) + ')'
                            ctx.lineWidth = 2
                            ctx.stroke()
                        } else if (w.type === 'circle') {
                            ctx.beginPath()
                            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2)
                            ctx.fillStyle = 'rgba(255, 60, 60, ' + (0.15 + 0.2 * pulse).toFixed(3) + ')'
                            ctx.fill()
                            ctx.strokeStyle = 'rgba(255, 90, 90, 0.9)'
                            ctx.lineWidth = 2.5
                            ctx.stroke()
                        }
                    }
                    // 远程 Boss 批次轰炸预警（技能3：多个预警圈）
                    if (e.isArtilleryBoss && e.skillState === 'skill3' && e.bombPlan && e.bombPlan.length > 0) {
                        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 70)
                        for (const bp of e.bombPlan) {
                            ctx.beginPath()
                            ctx.arc(bp.x, bp.y, 40, 0, Math.PI * 2)
                            ctx.fillStyle = 'rgba(255, 60, 60, ' + (0.15 + 0.2 * pulse).toFixed(3) + ')'
                            ctx.fill()
                            ctx.strokeStyle = 'rgba(255, 90, 90, 0.9)'
                            ctx.lineWidth = 2.5
                            ctx.stroke()
                        }
                    }
                }

                // ---- 大型近战 Boss 攻击特效 ----
                for (const fx of state.attackFx) {
                    const prog = 1 - fx.life / MELEE_ATTACK_FX_LIFE
                    const alpha = fx.life / MELEE_ATTACK_FX_LIFE
                    ctx.save()
                    ctx.translate(fx.x, fx.y)
                    ctx.rotate(fx.angle)
                    if (fx.type === 'fan') {
                        // 横摆：多道弧形挥砍残影随进度展开
                        const a = MELEE_ATTACKS.fan.halfAngle
                        const r = MELEE_ATTACKS.fan.radius
                        for (let k = 0; k < 5; k++) {
                            const t = prog - k * 0.06
                            if (t <= 0) continue
                            const arcA = Math.min(1, t * 1.4) * a
                            ctx.globalAlpha = alpha * (1 - k * 0.18)
                            ctx.strokeStyle = 'rgba(255,200,120,0.9)'
                            ctx.lineWidth = 8 - k * 1.2
                            ctx.beginPath()
                            ctx.arc(0, 0, r * (0.6 + 0.4 * Math.min(1, t)), -arcA, arcA)
                            ctx.stroke()
                        }
                        ctx.globalAlpha = 1
                    } else if (fx.type === 'slam') {
                        // 拍击：矩形残影下压扩散
                        const len = MELEE_ATTACKS.slam.len * Math.min(1, prog * 1.5)
                        const halfW = MELEE_ATTACKS.slam.halfW * Math.min(1, prog * 1.2)
                        ctx.globalAlpha = alpha * 0.8
                        ctx.fillStyle = 'rgba(255,120,60,0.25)'
                        ctx.strokeStyle = 'rgba(255,180,100,0.8)'
                        ctx.lineWidth = 3
                        ctx.beginPath()
                        ctx.rect(0, -halfW, len, halfW * 2)
                        ctx.fill()
                        ctx.stroke()
                        ctx.globalAlpha = 1
                    } else if (fx.type === 'charge') {
                        // 冲击：光束向前冲出
                        const len = MELEE_ATTACKS.charge.len * Math.min(1, prog * 1.6)
                        const grad = ctx.createLinearGradient(0, 0, len, 0)
                        grad.addColorStop(0, 'rgba(255,220,140,0.9)')
                        grad.addColorStop(1, 'rgba(255,220,140,0)')
                        ctx.globalAlpha = alpha
                        ctx.fillStyle = grad
                        ctx.beginPath()
                        ctx.rect(0, -MELEE_ATTACKS.charge.halfW, len, MELEE_ATTACKS.charge.halfW * 2)
                        ctx.fill()
                        ctx.globalAlpha = 1
                    } else if (fx.type === 'dash') {
                        // 冲刺：终点冲击波扩散环
                        const rr = 30 + prog * 100
                        ctx.globalAlpha = alpha
                        ctx.strokeStyle = 'rgba(255,220,140,0.9)'
                        ctx.lineWidth = 3
                        ctx.beginPath()
                        ctx.arc(0, 0, rr, 0, Math.PI * 2)
                        ctx.stroke()
                        ctx.globalAlpha = 1
                    } else if (fx.type === 'blast') {
                        // 炮弹爆炸：橙红色扩散环 + 内圈闪光
                        const rr = Math.max(0, 20 + prog * 130)
                        ctx.globalAlpha = alpha
                        ctx.fillStyle = 'rgba(255,120,40,' + (0.25 * (1 - prog)).toFixed(3) + ')'
                        ctx.strokeStyle = 'rgba(255,200,100,' + (0.9 * alpha).toFixed(3) + ')'
                        ctx.lineWidth = 3
                        ctx.beginPath()
                        ctx.arc(0, 0, rr, 0, Math.PI * 2)
                        ctx.fill()
                        ctx.stroke()
                        ctx.globalAlpha = 1
                    } else if (fx.type === 'nova') {
                        // 蓄力拍击释放：白闪内圈 + 双环扩散冲击波
                        const prog = 1 - fx.life / (fx.maxLife || MELEE_ATTACK_FX_LIFE)
                        const rr = 20 + prog * (fx.radius || 220)
                        ctx.globalAlpha = alpha
                        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - prog)).toFixed(3) + ')'
                        ctx.beginPath()
                        ctx.arc(0, 0, rr * 0.4, 0, Math.PI * 2)
                        ctx.fill()
                        ctx.strokeStyle = 'rgba(255,220,140,' + (0.95 * alpha).toFixed(3) + ')'
                        ctx.lineWidth = 6
                        ctx.beginPath()
                        ctx.arc(0, 0, rr, 0, Math.PI * 2)
                        ctx.stroke()
                        ctx.strokeStyle = 'rgba(255,120,40,' + (0.6 * alpha).toFixed(3) + ')'
                        ctx.lineWidth = 3
                        ctx.beginPath()
                        ctx.arc(0, 0, rr * 1.06, 0, Math.PI * 2)
                        ctx.stroke()
                        ctx.globalAlpha = 1
                    } else if (fx.type === 'novaPulse') {
                        // 蓄力波纹：单圈从内向外扩散 + 淡出
                        const p = 1 - fx.life / fx.maxLife
                        const rr = fx.radius * (0.15 + 0.85 * p)
                        ctx.globalAlpha = Math.max(0, fx.life / fx.maxLife) * 0.8
                        ctx.strokeStyle = 'rgba(255,120,60,0.9)'
                        ctx.lineWidth = 3
                        ctx.beginPath()
                        ctx.arc(0, 0, rr, 0, Math.PI * 2)
                        ctx.stroke()
                        ctx.globalAlpha = 1
                    }
                    ctx.restore()
                }

                // ---- 玩家（受伤闪红） ----
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
                if (p.hurtFlashTimer > 0) {
                    ctx.strokeStyle = '#ff0000'
                    ctx.lineWidth = 2.5
                } else {
                    ctx.strokeStyle = '#fff'
                    ctx.lineWidth = 1.5
                }
                ctx.stroke()

                // 中毒视觉：玩家身体泛绿光
                if (p.poisonTimer > 0) {
                    const pa = 0.35 + 0.2 * Math.sin(performance.now() / 200 * 5)
                    ctx.beginPath()
                    ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2)
                    ctx.strokeStyle = 'rgba(90,255,130,' + pa.toFixed(3) + ')'
                    ctx.lineWidth = 2
                    ctx.stroke()
                }

                const fd = p.facingDir
                const barrelLen = p.radius + 14
                ctx.beginPath()
                ctx.moveTo(p.x + fd.x * 4, p.y + fd.y * 4)
                ctx.lineTo(p.x + fd.x * barrelLen, p.y + fd.y * barrelLen)
                ctx.strokeStyle = p.gunColor || '#88ddff'
                ctx.lineWidth = 3
                ctx.stroke()

                ctx.beginPath()
                ctx.arc(p.x + fd.x * barrelLen, p.y + fd.y * barrelLen, 2.5, 0, Math.PI * 2)
                ctx.fillStyle = p.gunColor || '#88ddff'
                ctx.fill()

                if (p.attackEffectTimer > 0) {
                    const progress = 1 - p.attackEffectTimer / 0.12
                    const alpha = Math.max(0, 1 - progress * 1.3)
                    if (alpha > 0.01) {
                        const dir = p.attackDirection
                        const len = 15 + progress * 70
                        ctx.save()
                        ctx.globalAlpha = Math.min(1, alpha * 1.2)
                        const grad = ctx.createLinearGradient(p.x, p.y, p.x + dir.x * len, p.y + dir.y * len)
                        grad.addColorStop(0, 'rgba(255,255,255,0.9)')
                        grad.addColorStop(0.4, 'rgba(255,200,100,0.7)')
                        grad.addColorStop(1, 'rgba(255,100,20,0)')
                        ctx.shadowColor = 'rgba(255,200,100,0.2)'
                        ctx.shadowBlur = 15
                        ctx.lineCap = 'round'
                        ctx.lineWidth = 3 + progress * 6
                        ctx.beginPath()
                        ctx.moveTo(p.x, p.y)
                        ctx.lineTo(p.x + dir.x * len, p.y + dir.y * len)
                        ctx.strokeStyle = grad
                        ctx.stroke()
                        ctx.restore()
                        ctx.globalAlpha = 1.0
                    }
                }

                // ---- 束缚减速区域（毒雾：多层浮动雾团 + 上浮毒泡，最后消散） ----
                for (const z of state.webZones) {
                    const tw = performance.now() / 1000
                    // 消散：最后 1.2s 逐渐变淡
                    const fade = Math.min(1, Math.max(0, z.life / 1.2))
                    // 主雾团 + 多个浮动偏移雾团
                    const baseAlpha = 0.16 * fade
                    for (let layer = 0; layer < 4; layer++) {
                        const off = Math.sin(tw * 1.3 + layer * 1.7) * 6
                        const lr = z.radius * (1 - layer * 0.18)
                        ctx.beginPath()
                        ctx.arc(z.x + off, z.y + off * 0.6, lr, 0, Math.PI * 2)
                        ctx.fillStyle = 'rgba(70,230,110,' + Math.max(0.02, baseAlpha - layer * 0.03).toFixed(3) + ')'
                        ctx.fill()
                    }
                    // 边缘脉动
                    ctx.beginPath()
                    ctx.arc(z.x, z.y, z.radius * (0.9 + 0.1 * Math.sin(tw * 3)), 0, Math.PI * 2)
                    ctx.strokeStyle = 'rgba(120,255,150,' + Math.max(0.05, 0.4 * fade + 0.2 * Math.sin(tw * 4)).toFixed(3) + ')'
                    ctx.lineWidth = 2
                    ctx.stroke()
                    // 上浮毒气泡泡（随消散减少）
                    for (let k = 0; k < 4; k++) {
                        const ba = tw * 0.8 + k * 1.6
                        const bx = z.x + Math.cos(ba) * z.radius * 0.45
                        const by = z.y + Math.sin(ba) * z.radius * 0.45 + ((tw * 16) % 30 - 15)
                        ctx.beginPath()
                        ctx.arc(bx, by, 2.5 + (k % 2), 0, Math.PI * 2)
                        ctx.fillStyle = 'rgba(160,255,170,' + (0.5 * fade).toFixed(3) + ')'
                        ctx.fill()
                    }
                }

                // ---- 飘浮文字（世界层内，坐标跟随世界） ----
                for (const ft of state.floatTexts) {
                    const alpha = Math.max(0, Math.min(1, ft.life / 0.4))
                    ctx.globalAlpha = alpha
                    ctx.font = 'bold 16px monospace'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.shadowColor = ft.color
                    ctx.shadowBlur = 8
                    ctx.fillStyle = ft.color
                    ctx.fillText(ft.text, ft.x, ft.y)
                    ctx.shadowBlur = 0
                }
                ctx.globalAlpha = 1.0

                ctx.restore()

                // ---- 属性面板 ----
                const panelX = canvasW - 195
                const panelY = 12
                const panelW = 185
                const panelH = 225
                ctx.strokeStyle = 'rgba(255,255,255,0.1)'
                ctx.lineWidth = 1
                ctx.strokeRect(panelX, panelY, panelW, panelH)

                ctx.fillStyle = 'rgba(255,255,255,0.6)'
                ctx.font = '11px monospace'
                ctx.textAlign = 'left'
                ctx.textBaseline = 'top'
                const lines = [
                    `攻击 ${p.atk.toFixed(1)}`,
                    `射程 ${p.range}`,
                    `攻速 ${p.attackSpeed.toFixed(2)}`,
                    `穿透 ${p.pierceCount}/${MAX_PIERCE}`,
                    `弹速 ${p.bulletSpeedMult.toFixed(2)}x`,
                    `额外攻击 ${p.extraAttackCount}/${MAX_EXTRA_ATTACK}`,
                    `分裂 ${p.splitLevel}/${MAX_SPLIT_LEVEL}`,
                    `平行 ${p.parallelCount}/${MAX_PARALLEL}`,
                    `散射 ${p.scatterCount}/${MAX_SCATTER}`,
                    `吸血 ${p.lifeSteal.toFixed(2)}/${MAX_LIFE_STEAL.toFixed(1)}`,
                    `吸取 ${p.stealLevel > 0 ? Math.round(STEAL_CHANCES[p.stealLevel] * 100) + '%' : '0%'}`,
                    `弹射 ${p.ricochetCount}/${MAX_RICOCHET}`,
                ]
                lines.forEach((text, idx) => {
                    ctx.fillStyle = idx === 0 ? '#ff6b6b' : 'rgba(255,255,255,0.5)'
                    ctx.fillText(text, panelX + 10, panelY + 10 + idx * 17)
                })

                ctx.fillStyle = 'rgba(255,255,255,0.15)'
                ctx.font = '10px monospace'
                ctx.textAlign = 'left'
                ctx.textBaseline = 'bottom'
                const gunName = state.selectedGun ? state.selectedGun.name : '未知'
                ctx.fillText(`🔫 ${gunName}`, 12, canvasH - 10)

                // ---- 全屏毒雾闪（母体狂暴） ----
                if (state.flashRed > 0) {
                    ctx.fillStyle = 'rgba(0,230,90,' + (state.flashRed * 0.45).toFixed(3) + ')'
                    ctx.fillRect(0, 0, canvasW, canvasH)
                    state.flashRed -= 0.04
                    if (state.flashRed < 0) state.flashRed = 0
                }
                // ---- 狂暴警告文字 ----
                if (state.enrageWarnTimer > 0) {
                    const wa = Math.min(1, state.enrageWarnTimer / 0.6) * (0.75 + 0.25 * Math.sin(performance.now() / 120 * 5))
                    ctx.globalAlpha = wa
                    ctx.font = 'bold 44px sans-serif'
                    ctx.textAlign = 'center'
                    ctx.textBaseline = 'middle'
                    ctx.shadowColor = '#ff3b3b'
                    ctx.shadowBlur = 26
                    ctx.fillStyle = '#ff3b3b'
                    ctx.fillText('⚠ 母体狂暴！', canvasW / 2, canvasH * 0.28)
                    ctx.shadowBlur = 0
                    ctx.globalAlpha = 1.0
                    state.enrageWarnTimer -= 1 / 60
                }
            }

            /* ─── UI 更新 ──────────────────────────── */
            function updateBossBar() {
                // 所有存活 Boss 的血条，maxHp 从大到小、从上往下排列
                const bosses = state.enemies.filter(e => e.isBoss).sort((a, b) => b.maxHp - a.maxHp)
                if (bosses.length === 0) {
                    bossBar.style.display = 'none'
                    return
                }
                bossBar.style.display = 'flex'
                bossBar.innerHTML = ''
                bosses.forEach(b => {
                    const row = document.createElement('div')
                    row.className = 'boss-bar-row'
                    const name = b.bossName || '👑 首领'
                    const pct = Math.max(0, Math.min(100, b.hp / b.maxHp * 100))
                    row.innerHTML =
                        `<span class="boss-bar-name">${name}</span>` +
                        `<div class="boss-bar-track"><div class="boss-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>` +
                        `<span class="boss-bar-hp">${Math.max(0, Math.ceil(b.hp))} / ${b.maxHp}</span>`
                    bossBar.appendChild(row)
                })
            }

            function updateUI() {
                const p = state.player
                waveDisplay.textContent = state.wave
                totalKillsDisplay.textContent = p.totalKills
                // 右上角状态栏：整数显示
                const hpShown = Math.floor(p.hp)
                hpDisplay.textContent = `${hpShown}/${p.maxHp}`
                // 等级显示在血条左侧
                lvlDisplay.textContent = `Lv.${p.level}`
                // 左上角血条：显示 2 位小数
                const hpPct = Math.max(0, Math.min(100, p.hp / p.maxHp * 100))
                playerHpFill.style.width = hpPct.toFixed(1) + '%'
                playerHpText.textContent = `${p.hp.toFixed(2)}/${p.maxHp}`
                updateBossBar()
            }

            /* ---- 暂停 ---- */
            function togglePause() {
                if (!state.selectedGun || state.gameOver || state.paused) return
                state.gamePaused = !state.gamePaused
                pauseOverlay.style.display = state.gamePaused ? 'flex' : 'none'
            }

            function canTogglePause() {
                return state.selectedGun && !state.gameOver && !state.paused &&
                    homeOverlay.style.display !== 'flex' &&
                    manageOverlay.style.display !== 'flex' &&
                    editOverlay.style.display !== 'flex' &&
                    upgradeOverlay.style.display !== 'flex' &&
                    gameOverOverlay.style.display !== 'flex'
            }

            /* ---- 全屏 ---- */
            function toggleFullscreen() {
                if (document.fullscreenElement || document.webkitFullscreenElement) {
                    if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
                } else {
                    const el = document.documentElement
                    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
                    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
                }
            }

            /* ---- 枪械管理 ---- */
            function renderHomeList() {
                gunList.innerHTML = ''
                GUNS.forEach(gun => {
                    const card = document.createElement('div')
                    card.className = 'gun-card'
                    if (state.homeSelectedGun && state.homeSelectedGun.id === gun.id) card.classList.add('selected')
                    card.innerHTML = `
                <div class="icon">${gun.icon || '🔫'}</div>
                <div class="info">
                  <div class="name">${gun.name}</div>
                  <div class="desc">${gun.desc || ''}</div>
                  <div class="stats">
                    <span>⚔ ${gun.atk}</span>
                    <span>📐 ${gun.range}</span>
                    <span>⚡ ${gun.attackSpeed}</span>
                    <span>🎯 ${gun.firePattern}</span>
                  </div>
                </div>
                <div class="badge">选择</div>
              `
                    card.addEventListener('click', () => {
                        // 选中枪械（高亮），点击开始按钮才进入游戏
                        state.homeSelectedGun = gun
                        gunList.querySelectorAll('.gun-card').forEach(c => c.classList.remove('selected'))
                        card.classList.add('selected')
                    })
                    gunList.appendChild(card)
                })
                // 默认选中第一把枪
                if (!state.homeSelectedGun && GUNS.length > 0) {
                    state.homeSelectedGun = GUNS[0]
                    const first = gunList.querySelector('.gun-card')
                    if (first) first.classList.add('selected')
                }
            }

            function renderManageList() {
                manageList.innerHTML = ''
                GUNS.forEach(gun => {
                    const card = document.createElement('div')
                    card.className = 'manage-card'
                    card.innerHTML = `
                <div class="header">
                  <span class="name">${gun.icon || '🔫'} ${gun.name}</span>
                  <div class="actions">
                    <button class="manage-btn" data-action="edit" data-id="${gun.id}">✎ 编辑</button>
                    <button class="manage-btn preview" data-action="preview" data-id="${gun.id}">▶ 试听</button>
                    <button class="manage-btn danger" data-action="delete" data-id="${gun.id}">✕ 删除</button>
                  </div>
                </div>
                <div class="details">
                  <span><span class="label">伤害</span> ${gun.atk}</span>
                  <span><span class="label">射程</span> ${gun.range}</span>
                  <span><span class="label">射速</span> ${gun.attackSpeed}</span>
                  <span><span class="label">模式</span> ${gun.firePattern}</span>
                  <span><span class="label">子弹长度</span> ${gun.bulletLength}</span>
                  <span><span class="label">音效</span> 🔉 衰减${gun.shootDecay || 6}</span>
                </div>
              `
                    manageList.appendChild(card)
                })
                manageList.querySelectorAll('[data-action="edit"]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = btn.dataset.id
                        const gun = GUNS.find(g => g.id === id)
                        if (gun) openEditDialog(gun)
                    })
                })
                manageList.querySelectorAll('[data-action="preview"]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = btn.dataset.id
                        const gun = GUNS.find(g => g.id === id)
                        if (gun) previewSound(gun)
                    })
                })
                manageList.querySelectorAll('[data-action="delete"]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = btn.dataset.id
                        const name = GUNS.find(g => g.id === id)?.name
                        if (confirm(`确定删除枪械“${name}”吗？`)) {
                            GUNS = GUNS.filter(g => g.id !== id)
                            // 若删的是当前选中的枪，清空选中让首页默认选第一把，避免悬空引用
                            if (state.homeSelectedGun && state.homeSelectedGun.id === id) {
                                state.homeSelectedGun = null
                            }
                            renderAll()
                        }
                    })
                })
            }

            function renderAll() {
                renderHomeList()
                renderManageList()
            }

            function openEditDialog(gun = null) {
                const isEdit = !!gun
                editTitle.textContent = isEdit ? '编辑枪械' : '新增枪械'

                const fields = [
                    { key: 'id', label: 'ID (唯一标识)', type: 'text', required: true, readonly: isEdit },
                    { key: 'name', label: '名称', type: 'text', required: true },
                    { key: 'desc', label: '描述', type: 'text' },
                    { key: 'icon', label: '图标 (Emoji)', type: 'text' },
                    { key: 'color', label: '枪管颜色 (如 #88ddff)', type: 'text' },
                    { key: 'bulletLength', label: '子弹长度', type: 'number', step: '0.5' },
                    { key: 'bulletWidth', label: '子弹粗细', type: 'number', step: '0.1' },
                    { key: 'atk', label: '伤害', type: 'number', step: '0.5' },
                    { key: 'range', label: '射程', type: 'number' },
                    { key: 'attackSpeed', label: '射速 (每秒次数)', type: 'number', step: '0.1' },
                    { key: 'bulletSpeedMult', label: '子弹速度倍率', type: 'number', step: '0.05' },
                    { key: 'bulletCount', label: '子弹数量', type: 'number' },
                    { key: 'pierceCount', label: '穿透次数', type: 'number' },
                    { key: 'extraAttackCount', label: '额外攻击次数', type: 'number' },
                    { key: 'firePattern', label: '攻击模式', type: 'select', options: ['single', 'spread', 'burst'] },
                    { key: 'spreadAngle', label: '散射角度 (度)', type: 'number', step: '1' },
                    { key: 'burstCount', label: '连发次数', type: 'number' },
                    { key: 'burstDelay', label: '连发间隔 (秒)', type: 'number', step: '0.01' },
                    { key: 'shootDuration', label: '射击时长 (秒)', type: 'number', step: '0.01' },
                    { key: 'shootDecay', label: '射击衰减速度', type: 'number', step: '0.5' },
                    { key: 'shootVolume', label: '射击音量', type: 'number', step: '0.01' },
                    { key: 'hitDuration', label: '命中时长 (秒)', type: 'number', step: '0.01' },
                    { key: 'hitDecay', label: '命中衰减速度', type: 'number', step: '0.5' },
                    { key: 'hitVolume', label: '命中音量', type: 'number', step: '0.01' },
                ]

                let html = ''
                html += `<div class="form-grid">`
                fields.forEach(f => {
                    const val = gun ? gun[f.key] : ''
                    const readonlyAttr = f.readonly ? 'readonly' : ''
                    let input = ''
                    if (f.type === 'select') {
                        const opts = f.options.map(o =>
                            `<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')
                        input = `<select id="field_${f.key}" ${readonlyAttr}>${opts}</select>`
                    } else {
                        const stepAttr = f.step ? `step="${f.step}"` : ''
                        input =
                            `<input type="${f.type}" id="field_${f.key}" value="${val}" ${stepAttr} ${readonlyAttr} ${f.required?'required':''}/>`
                    }
                    html += `<div class="form-row"><label>${f.label}</label>${input}</div>`
                })
                html += `</div>`

                editForm.innerHTML = html
                editOverlay.dataset.editId = gun ? gun.id : ''
                editOverlay.style.display = 'flex'
            }

            function saveEdit() {
                const isEdit = !!editOverlay.dataset.editId
                const fields = ['id', 'name', 'desc', 'icon', 'color', 'bulletLength', 'bulletWidth', 'atk', 'range',
                    'attackSpeed', 'bulletSpeedMult', 'bulletCount', 'pierceCount', 'extraAttackCount', 'firePattern',
                    'spreadAngle', 'burstCount', 'burstDelay', 'shootDuration', 'shootDecay', 'shootVolume',
                    'hitDuration', 'hitDecay', 'hitVolume'
                ]
                const data = {}
                fields.forEach(key => {
                    const el = document.getElementById(`field_${key}`)
                    if (el) {
                        let val = el.value
                        if (el.type === 'number' || el.type === 'range') {
                            val = parseFloat(val)
                            if (isNaN(val)) val = 0
                        }
                        data[key] = val
                    }
                })
                if (!data.name || !data.id) {
                    alert('名称和ID为必填项')
                    return
                }
                const exists = GUNS.some(g => g.id === data.id && g.id !== (isEdit ? editOverlay.dataset.editId : null))
                if (exists) {
                    alert('ID已存在，请使用不同的ID')
                    return
                }

                if (isEdit) {
                    const index = GUNS.findIndex(g => g.id === editOverlay.dataset.editId)
                    if (index !== -1) {
                        GUNS[index] = { ...GUNS[index],
                            ...data }
                        // 若首页当前选中的就是这把枪，同步到最新对象，否则开始游戏仍用旧数据
                        if (state.homeSelectedGun && state.homeSelectedGun.id === GUNS[index].id) {
                            state.homeSelectedGun = GUNS[index]
                        }
                    }
                } else {
                    GUNS.push(data)
                }
                editOverlay.style.display = 'none'
                renderAll()
            }

            /* ---- 选择枪械，启动游戏 ---- */
            function selectGun(gun) {
                initAudio()

                state.selectedGun = gun
                const p = state.player
                p.atk = gun.atk
                p.range = gun.range
                p.attackSpeed = gun.attackSpeed
                p.bulletSpeedMult = gun.bulletSpeedMult ?? 1
                p.bulletCount = gun.bulletCount ?? 1
                p.pierceCount = gun.pierceCount ?? 0
                p.extraAttackCount = gun.extraAttackCount ?? 0
                p.gunColor = gun.color || '#88ddff'
                p.bulletLength = gun.bulletLength || 12
                p.bulletWidth = gun.bulletWidth || 1.5
                p.firePattern = gun.firePattern || 'single'
                p.spreadAngle = gun.spreadAngle || 0
                p.burstCount = gun.burstCount || 0
                p.burstDelay = gun.burstDelay || 0.06
                p.splitLevel = 0
                p.lifeSteal = 0
                p.stealLevel = 0
                p.parallelCount = 0
                p.scatterCount = 0
                p.ricochetCount = 0
                p.hurtFlashTimer = 0

                p.totalKills = 0
                p.currentKills = 0
                p.level = 1
                p.killsForNext = 5

                state.waveIdCounter = 0
                state.currentWaveId = 0
                state.waveSpawned = 0
                state.waveKilled = 0

                homeOverlay.style.display = 'none'
                manageOverlay.style.display = 'none'
                editOverlay.style.display = 'none'
                pauseOverlay.style.display = 'none'
                state.gamePaused = false
                p.x = worldW / 2
                p.y = worldH / 2
                camX = clamp(p.x - canvasW / 2, 0, Math.max(0, worldW - canvasW))
                camY = clamp(p.y - canvasH / 2, 0, Math.max(0, worldH - canvasH))
                state.targetX = worldW / 2
                state.targetY = worldH / 2
                state.gameOver = false
                state.paused = false
                state.wave = 0
                state.enemies = []
                state.projectiles = []
                state.enemyProjectiles = []
                state.particles = []
                state.dust = []
                state.floatTexts = []
                state.attackFx = []
                state.ghosts = []
                state.cannonballs = []
                state.explosions = []
                state._pendingBossRare = false
                state._bossDoubleDrop = false
                state.webZones = []
                state.flashRed = 0
                state.shakeTimer = 0
                state.enrageWarnTimer = 0
                p.poisonTimer = 0
                p.poisonDps = 0
                p.mistPoisonTimer = 0
                p.hp = p.maxHp
                p.attackTimer = 0
                p._extraPending = 0
                p._extraTimer = 0
                p.attackEffectTimer = 0
                p.facingAngle = 0
                p.targetAngle = 0
                p.facingDir = { x: 1, y: 0 }
                updateUI()
                setTimeout(() => { if (!state.gameOver) startWave() }, 100)
            }

            /* ─── 游戏结束 ────────────────────────── */
            function gameOver() {
                state.gameOver = true
                state.gamePaused = false
                pauseOverlay.style.display = 'none'
                if (state.wave > state.highestWave) state.highestWave = state.wave
                if (state.player.totalKills > state.highestKills) state.highestKills = state.player.totalKills
                saveRecord()
                goWave.textContent = state.wave
                goKills.textContent = state.player.totalKills
                goHighestWave.textContent = state.highestWave
                goHighestKills.textContent = state.highestKills
                gameOverOverlay.style.display = 'flex'
            }

            function restartGame() {
                state.gameOver = false
                state.paused = false
                state.gamePaused = false
                state.wave = 0
                state.enemies = []
                state.projectiles = []
                state.enemyProjectiles = []
                state.particles = []
                state.dust = []
                state.floatTexts = []
                state.attackFx = []
                state.ghosts = []
                state.cannonballs = []
                state.explosions = []
                state._pendingBossRare = false
                state._bossDoubleDrop = false
                state.webZones = []
                state.flashRed = 0
                state.shakeTimer = 0
                state.enrageWarnTimer = 0
                state.waveIdCounter = 0
                state.currentWaveId = 0
                state.waveSpawned = 0
                state.waveKilled = 0
                pauseOverlay.style.display = 'none'

                const p = state.player
                p.poisonTimer = 0
                p.poisonDps = 0
                p.mistPoisonTimer = 0
                p.x = worldW / 2
                p.y = worldH / 2
                camX = clamp(p.x - canvasW / 2, 0, Math.max(0, worldW - canvasW))
                camY = clamp(p.y - canvasH / 2, 0, Math.max(0, worldH - canvasH))
                state.targetX = worldW / 2
                state.targetY = worldH / 2
                p.hp = p.maxHp
                p.totalKills = 0
                p.currentKills = 0
                p.level = 1
                p.killsForNext = 5
                p.attackTimer = 0
                p._extraPending = 0
                p._extraTimer = 0
                p.attackEffectTimer = 0
                p.facingAngle = 0
                p.targetAngle = 0
                p.facingDir = { x: 1, y: 0 }
                p.splitLevel = 0
                p.lifeSteal = 0
                p.stealLevel = 0
                p.parallelCount = 0
                p.scatterCount = 0
                p.ricochetCount = 0
                p.hurtFlashTimer = 0
                updateUI()

                homeOverlay.style.display = 'flex'
                gameOverOverlay.style.display = 'none'
                upgradeOverlay.style.display = 'none'
                manageOverlay.style.display = 'none'
                editOverlay.style.display = 'none'
                renderHomeList()
            }

            /* ─── 事件绑定 ────────────────────────── */
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect()
                const scaleX = canvasW / rect.width
                const scaleY = canvasH / rect.height
                state.targetX = (e.clientX - rect.left) * scaleX + camX
                state.targetY = (e.clientY - rect.top) * scaleY + camY
            })

            // ---- 操作方式选择 ----------------
            controlModeList.querySelectorAll('.control-mode-card').forEach(card => {
                card.addEventListener('click', () => {
                    controlModeList.querySelectorAll('.control-mode-card').forEach(c => c.classList.remove('selected'))
                    card.classList.add('selected')
                    state.controlMode = card.dataset.mode
                    autoFireOpt.style.display = state.controlMode === 'keyboard' ? 'flex' : 'none'
                })
            })
            autoFireCheck.addEventListener('change', () => {
                state.autoFire = autoFireCheck.checked
            })
            btnStartGame.addEventListener('click', () => {
                if (!state.homeSelectedGun) {
                    alert('请先选择枪械')
                    return
                }
                selectGun(state.homeSelectedGun)
            })
            // 手机端隐藏操作方式区（使用摇杆）
            if (isTouchDevice) controlModeSection.style.display = 'none'

            // ---- 键盘 WASD + 鼠标射击（方式二） ----
            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 0) state.mouseDown = true
            })
            document.addEventListener('mouseup', (e) => {
                if (e.button === 0) state.mouseDown = false
            })
            const KEY_MAP = { w: 'w', a: 'a', s: 's', d: 'd', W: 'w', A: 'a', S: 's', D: 'd' }

            document.addEventListener('keyup', (e) => {
                if (KEY_MAP[e.key]) state.keys[KEY_MAP[e.key]] = false
            })

            btnRestart.addEventListener('click', restartGame)

            btnResume.addEventListener('click', togglePause)
            btnPauseHome.addEventListener('click', () => {
                restartGame()
            })

            document.addEventListener('keydown', (e) => {
                if (KEY_MAP[e.key]) state.keys[KEY_MAP[e.key]] = true
                if (e.key === 'x' || e.key === 'X') {
                    if (canTogglePause()) togglePause()
                }
                if (e.key === 'Escape') {
                    // 1. 全屏中：退出全屏（并阻止继续触发暂停）
                    if (document.fullscreenElement || document.webkitFullscreenElement) {
                        if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
                        else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
                        return
                    }
                    // 2. 弹窗：关闭（原有职责）
                    if (configPanel.style.display === 'flex') {
                        configPanel.style.display = 'none'
                        return
                    }
                    if (editOverlay.style.display === 'flex') {
                        editOverlay.style.display = 'none'
                        return
                    }
                    if (manageOverlay.style.display === 'flex') {
                        manageOverlay.style.display = 'none'
                        homeOverlay.style.display = 'flex'
                        renderHomeList()
                        return
                    }
                    // 3. 游戏中：触发暂停；首页/其他界面：无效果
                    if (canTogglePause()) togglePause()
                }
            })

            /* ---- 移动端虚拟摇杆 ---- */
            const joyBase = $('#joyBase')
            const joyKnob = $('#joyKnob')
            if (isTouchDevice) joyBase.style.display = 'block'

            let joyCenterX = 0,
                joyCenterY = 0,
                joyActive = false

            function updateJoy(touch) {
                const dx = touch.clientX - joyCenterX
                const dy = touch.clientY - joyCenterY
                const maxR = 55
                const len = Math.hypot(dx, dy)
                if (len < 4) {
                    state.joyDX = 0
                    state.joyDY = 0
                    joyKnob.style.transform = 'translate(-50%, -50%)'
                    return
                }
                const clamped = Math.min(len, maxR)
                const nx = dx / len
                const ny = dy / len
                state.joyDX = nx
                state.joyDY = ny
                joyKnob.style.transform =
                    `translate(calc(-50% + ${(nx * clamped).toFixed(1)}px), calc(-50% + ${(ny * clamped).toFixed(1)}px))`
            }

            function resetJoy() {
                joyActive = false
                state.joyActive = false
                state.joyDX = 0
                state.joyDY = 0
                joyKnob.style.transform = 'translate(-50%, -50%)'
            }

            if (isTouchDevice) {
                joyBase.addEventListener('touchstart', (e) => {
                    e.preventDefault()
                    const t = e.touches[0]
                    const rect = joyBase.getBoundingClientRect()
                    joyCenterX = rect.left + rect.width / 2
                    joyCenterY = rect.top + rect.height / 2
                    joyActive = true
                    state.joyActive = true
                    updateJoy(t)
                }, { passive: false })

                document.addEventListener('touchmove', (e) => {
                    if (!joyActive) return
                    e.preventDefault()
                    updateJoy(e.touches[0])
                }, { passive: false })

                document.addEventListener('touchend', (e) => {
                    if (!joyActive) return
                    for (let i = 0; i < e.touches.length; i++) {
                        if (e.touches[i].target === joyBase) return
                    }
                    resetJoy()
                })
                document.addEventListener('touchcancel', () => {
                    if (joyActive) resetJoy()
                })
            }

            btnFullscreenHome.addEventListener('click', toggleFullscreen)
            btnFullscreenHud.addEventListener('click', toggleFullscreen)

            btnManageGuns.addEventListener('click', () => {
                homeOverlay.style.display = 'none'
                manageOverlay.style.display = 'flex'
                renderManageList()
            })
            btnCloseManage.addEventListener('click', () => {
                manageOverlay.style.display = 'none'
                homeOverlay.style.display = 'flex'
                renderHomeList()
            })
            btnAddGun.addEventListener('click', () => {
                openEditDialog(null)
            })
            btnEditCancel.addEventListener('click', () => {
                editOverlay.style.display = 'none'
            })
            btnEditSave.addEventListener('click', saveEdit)

            btnConfigToggle.addEventListener('click', () => {
                const v = configPanel.style.display === 'none' ? 'flex' : 'none'
                configPanel.style.display = v
            })

            btnConfigClose.addEventListener('click', () => {
                configPanel.style.display = 'none'
            })
            speedMultSlider.addEventListener('input', () => {
                speedMultVal.textContent = parseFloat(speedMultSlider.value).toFixed(2)
            })
            countOffsetSlider.addEventListener('input', () => {
                countOffsetVal.textContent = countOffsetSlider.value
            })

            /* ─── 游戏循环 ────────────────────────── */
            let lastTime = 0,
                rafId = null

            function loop(time) {
                const dt = Math.min((time - lastTime) / 1000, 0.05)
                lastTime = time
                update(dt)
                render()
                rafId = requestAnimationFrame(loop)
            }

            /* ─── 初始化 ──────────────────────────── */
            // 读取存档
            try {
                const saved = localStorage.getItem(STORAGE_KEY)
                if (saved) {
                    const data = JSON.parse(saved)
                    state.highestWave = data.highestWave || 0
                    state.highestKills = data.highestKills || 0
                }
            } catch (_) {}

            EnemySystem.init({
                state,
                worldW,
                worldH,
                view: () => ({ camX, camY, canvasW, canvasH }),
                spawnFloatText,
                spawnDeathPowder,
                spawnHitParticles,
                gameOver,
                playShootSound,
                playHitSound,
            })

            resizeCanvas()
            homeOverlay.style.display = 'flex'
            manageOverlay.style.display = 'none'
            editOverlay.style.display = 'none'
            pauseOverlay.style.display = 'none'
            gameOverOverlay.style.display = 'none'
            upgradeOverlay.style.display = 'none'

            renderHomeList()

            state.player.x = worldW / 2
            state.player.y = worldH / 2
            state.targetX = worldW / 2
            state.targetY = worldH / 2
            updateUI()

            lastTime = performance.now()
            rafId = requestAnimationFrame(loop)

            /* ─── 清理 ────────────────────────────── */
            window.addEventListener('beforeunload', () => {
                if (rafId) cancelAnimationFrame(rafId)
                ro.disconnect()
                saveRecord()
                if (audioCtx) {
                    audioCtx.close().catch(() => {})
                }
            })

        })(); // end IIFE
    