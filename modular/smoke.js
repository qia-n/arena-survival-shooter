// modular 冒烟测试：mock DOM/Canvas/Audio，加载 4 个模块，验证游戏可启动 + EnemySystem 可运行
const ctxProxy = new Proxy({}, {
  get: (t, k) => (k in t ? t[k] : () => {}),
  set: (t, k, v) => { t[k] = v; return true },
})
const mkEl = () => {
  const el = {
    style: {}, className: '', innerHTML: '', textContent: '', dataset: {}, value: '', type: 'text',
    classList: { add() {}, contains() { return false }, remove() {} },
    addEventListener() {}, appendChild() {}, removeChild() {}, remove() {},
    querySelectorAll() { return [] }, querySelector() { return mkEl() },
    getContext() { return ctxProxy },
    parentElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    getBoundingClientRect() { return { width: 800, height: 600, left: 0, top: 0 } },
    getContextAttributes() { return {} },
  }
  return el
}
const container = mkEl()
class RO { constructor() {} observe() {} disconnect() {} }
class FakeAudio {
  constructor() { this.sampleRate = 44100; this.destination = {}; this.state = 'running' }
  createBuffer() { return { getChannelData() { return new Float32Array(100) } } }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} } }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} } }
  close() { return Promise.resolve() }
  resume() {}
}
global.window = global
global.document = {
  createElement: () => mkEl(),
  getElementById: () => container,
  querySelector: () => mkEl(),
  addEventListener() {}, removeEventListener() {},
  fullscreenElement: null,
  documentElement: mkEl(),
  body: mkEl(),
}
global.localStorage = { getItem: () => null, setItem() {} }
global.ResizeObserver = RO
global.AudioContext = FakeAudio
global.webkitAudioContext = FakeAudio
global.requestAnimationFrame = () => 0
global.cancelAnimationFrame = () => {}
global.performance = { now: () => Date.now() }
global.confirm = () => true
global.alert = () => {}
global.addEventListener = () => {}

// 按依赖顺序加载模块
require('./js/constants.js')
require('./js/enemy-config.js')
require('./js/enemies.js')
require('./js/game.js')

const ES = global.EnemySystem
if (!ES) throw new Error('EnemySystem 未挂载')
const need = ['init', 'setWorld', 'pickEnemyType', 'spawnEnemy', 'spawnBoss', 'spawnMeleeBoss', 'spawnArtilleryBoss', 'spawnMotherBoss', 'updateEnemyAI']
for (const k of need) if (typeof ES[k] !== 'function') throw new Error('EnemySystem 缺少方法: ' + k)

// 手动触发一次更新，验证 AI 不抛异常
ES.setWorld(2000, 1125)
ES.spawnEnemy(false, 'bomber')
ES.spawnEnemy(false, 'sniper')
ES.spawnEnemy(false, 'melee')
ES.spawnMotherBoss()
try {
  ES.updateEnemyAI(0.016, 1)
} catch (e) {
  console.error('updateEnemyAI 异常:', e.message)
  process.exit(1)
}
console.log('EnemySystem 冒烟测试通过: spawn + updateEnemyAI 正常')
