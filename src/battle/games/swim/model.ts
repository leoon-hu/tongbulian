/**
 * 游泳的纯模型（需求 B36i）：快照 + 事件 + 时间 → 场景数据（两只泳员的位置与姿势、跳水、云、观众、触板、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import type { SwimmerKind } from '@/battle/game/sprites/swim'

export interface SwimGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 120px 高的缩放 */
  k: number
  /** 左池壁内沿 / 右池壁内沿（触板面） */
  startX: number
  finishX: number
  /** 甲板顶边（紧凑版 = 0，没有天空） */
  deckY: number
  poolTop: number
  poolBottom: number
  laneH: number
  /** 两条泳道的中线 y（红上蓝下） */
  laneY: [number, number]
  /** 身长 */
  size: number
  /** 头在水里的起点 x 与 8 分时的 x */
  runFrom: number
  runTo: number
  /** 蹲在出发台上时头的 x */
  blockX: number
}

export function layoutSwim(W: number, H: number, compact: boolean): SwimGeometry {
  const k = H / 120
  const size = compact ? Math.min(32, H * 0.56) : 48 * k
  const startX = compact ? 22 : 54 * Math.min(1, W / 1000) + 10
  const finishX = W - (compact ? 26 : 60 * Math.min(1, W / 1000))
  const deckY = compact ? 0 : H * 0.27
  const poolTop = compact ? H * 0.12 : H * 0.44
  const poolBottom = compact ? H * 0.94 : H * 0.95
  const laneH = (poolBottom - poolTop) / 2
  return {
    W,
    H,
    compact,
    k,
    startX,
    finishX,
    deckY,
    poolTop,
    poolBottom,
    laneH,
    laneY: [poolTop + laneH * 0.5, poolTop + laneH * 1.5],
    size,
    runFrom: startX + size * 0.95,
    runTo: finishX - size * 0.62,
    blockX: startX + size * 0.02,
  }
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface SwimOptions {
  reducedMotion: boolean
}

export const SWIM_TIME = 0.8
export const SWIM_TIME_REDUCED = 0.3
/** 拍到触板：8 分的位置再往前一点（× size） */
export const WIN_EXTRA = 0.26
export const SPRINT_FROM = 2
export const DIVE_TIME = 0.55
const CROWD = 4

export class SwimModel {
  geo: SwimGeometry = layoutSwim(1000, 120, false)
  swimmers: [Racer, Racer]
  readonly kinds: [SwimmerKind, SwimmerKind] = ['frog', 'duck']
  /** 跳水进度 0（在台上）→ 1（在水里）；一开始就在水里（晚进来的观战者） */
  dive: [Tween, Tween] = [new Tween(1, ease.outQuad), new Tween(1, ease.outQuad)]
  private splashed: [boolean, boolean] = [true, true]
  private kickT: [number, number] = [0, 0]
  clouds: Cloud[] = []
  time = 0
  /** 水纹相位 */
  waveT = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  /** 还差一分：触板发光 */
  padGlow = new Decay(1)
  /** 拍到触板那一下的闪光 */
  padFlash = new Decay(0.5)
  /** 发令员的哨子 / 手臂：0 放下 1 举起 */
  starter = new Tween(0, ease.outBounce)
  crowdWave: number[] = Array.from({ length: CROWD }, () => 0)
  crowdJump = 0
  particles: ParticlePool
  quality = 0
  private readonly rng: RNG
  private readonly opts: SwimOptions

  constructor(rng: RNG, opts: SwimOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.swimmers = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(1000, 120, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: SWIM_TIME, moveTimeReduced: SWIM_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutSwim(W, H, compact)
    for (const s of this.swimmers) s.pos.set(this.xFor(s.score, s.mood === 'win'))
    const n = compact ? 0 : 3
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 80,
      y: this.geo.deckY * (0.2 + this.rng.next() * 0.45),
      s: 12 * (0.8 + this.rng.next() * 0.5),
      v: 9 * (0.7 + this.rng.next() * 0.6),
    }))
  }

  /** 得 score 分时头的 x；赢了再往前一点，手拍到触板 */
  xFor(score: number, won = false): number {
    const g = this.geo
    if (won) return g.runTo + WIN_EXTRA * g.size
    const t = clamp(score / this.target, 0, 1)
    return g.runFrom + (g.runTo - g.runFrom) * t
  }

  swimmer(team: Team): Racer {
    return this.swimmers[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.swimmers.forEach((sw, i) => {
      const forward = sw.apply(s, (score, won) => this.xFor(score, won), this.timing)
      if (forward) this.splash(i, 4 + Math.round(sw.boost.value * 3))
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.starter.set(0)
      this.crowdJump = 0
      this.particles.clear()
      this.padGlow.value = 0
      this.padFlash.value = 0
      for (let i = 0; i < 2; i++) {
        this.dive[i]!.set(0)
        this.splashed[i] = false
      }
    }
  }

  /** 脚下打出的水花（俯视：向后向外飞散，不受重力） */
  private splash(i: number, n: number, x?: number, big = false): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const sw = this.swimmers[i]!
    this.particles.emit({
      x: x ?? sw.pos.value - g.size * 0.95,
      y: g.laneY[i]!,
      count: n,
      speed: (big ? 110 : 60) * g.k,
      angle: big ? 0 : Math.PI,
      spread: big ? Math.PI * 2 : Math.PI * 1.1,
      life: big ? 0.6 : 0.45,
      size: (big ? 3.6 : 2.6) * g.k,
      colors: ['#ffffff', '#d5f1ff', '#a9dcff'],
      gravity: 0,
      drag: 3,
    })
  }

  private confetti(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const colors = team === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
    this.particles.emit({
      x: g.finishX,
      y: g.poolTop - g.size * 0.2,
      count: 26,
      speed: 140 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.2,
      life: 1.6,
      size: 4 * g.k,
      colors,
      shape: 'flake',
      gravity: 120 * g.k,
      drag: 1.2,
    })
  }

  private go(): void {
    this.starter.to(1, this.animated ? 0.5 : 0.2)
    for (let i = 0; i < 2; i++) {
      this.swimmers[i]!.boost.kick(0.5)
      if (this.animated) this.dive[i]!.to(1, DIVE_TIME)
      else {
        this.dive[i]!.set(1)
        this.splashed[i] = true
      }
    }
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const s of this.swimmers) s.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point': {
        const s = this.swimmer(e.team)
        s.boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        const side = e.team === 'red' ? 0 : 1
        for (let i = 0; i < CROWD; i++) if (i % 2 === side) this.crowdWave[i] = 1
        break
      }
      case 'streak':
        this.swimmer(e.team).boost.kick(1)
        break
      case 'lead':
        this.swimmer(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.padGlow.kick(1)
        break
      case 'finished': {
        this.crowdJump = 1
        this.padFlash.kick(1)
        const i = e.winner === 'red' ? 0 : 1
        this.splash(i, 16, this.geo.finishX - this.geo.size * 0.2, true)
        this.confetti(e.winner)
        break
      }
      default:
        break
    }
  }

  /** 点一下（B59）：跳出水面一下、划快几下 */
  poke(team: Team): void {
    const sw = this.swimmer(team)
    sw.poke.kick(1)
    sw.boost.kick(0.5)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 2) this.particles.clear()
  }

  step(dt: number): void {
    this.time += dt
    const g = this.geo
    const animated = this.animated
    if (animated && this.quality < 1) {
      this.waveT += dt * (this.sprint ? 2.4 : 1.1)
      for (const c of this.clouds) {
        c.x += c.v * dt
        if (c.x - c.s * 1.2 > g.W) c.x = -c.s * 1.5
      }
    }
    this.padGlow.step(dt)
    this.padFlash.step(dt)
    this.starter.step(dt)
    for (let i = 0; i < CROWD; i++) {
      const w = this.crowdWave[i]!
      this.crowdWave[i] = this.sprint ? Math.max(0.5, w) : w > 0.001 ? w * Math.pow(0.5, dt / 0.6) : 0
    }
    if (this.crowdJump > 0) this.crowdJump += dt
    this.swimmers.forEach((sw, i) => {
      sw.step(dt, 2.4, animated)
      const d = this.dive[i]!
      d.step(dt)
      if (!this.splashed[i] && d.value >= 0.85) {
        this.splashed[i] = true
        this.splash(i, 14, g.runFrom - g.size * 0.3, true)
      }
      this.kickT[i] = this.kickT[i]! + dt
      if (sw.moving > 0.4 && this.kickT[i]! > 0.09) {
        this.kickT[i] = 0
        this.splash(i, 1 + Math.round(sw.boost.value * 2) + (this.sprint ? 1 : 0))
      }
    })
    this.particles.step(dt)
  }

  /** 头当前的 x（跳水中从出发台滑到起点） */
  xOf(sw: Racer, i: number): number {
    const g = this.geo
    if (sw.mood === 'ready') return g.blockX
    const d = this.dive[i]!.value
    return d < 1 ? g.blockX + (sw.pos.value - g.blockX) * d : sw.pos.value
  }

  /** 泳道中线上的起伏（待机 / 游动 / 欢呼） */
  bobOf(sw: Racer, i: number): number {
    return this.bobOfBase(sw, i) - sw.poke.value * this.geo.size * 0.12
  }

  private bobOfBase(sw: Racer, i: number): number {
    const g = this.geo
    if (!this.animated) return 0
    if (sw.mood === 'ready') return -Math.abs(Math.sin(sw.hop)) * g.size * 0.05
    if (sw.mood === 'win') return Math.sin(sw.phase) * g.size * 0.06
    if (sw.mood === 'lose') return Math.sin(this.time * 1.5 + i) * g.size * 0.04
    return Math.sin(sw.hop) * g.size * 0.03
  }

  /** 跳水中的「高度」0…1（俯视用放大表现） */
  airOf(i: number): number {
    const d = this.dive[i]!.value
    return d < 1 ? Math.sin(d * Math.PI) : 0
  }

  floatOf(sw: Racer): number {
    return sw.mood === 'lose' ? Math.min(1, sw.moodT / 1.2) : 0
  }

  /** 头前的白浪强度 */
  bowOf(sw: Racer): number {
    return sw.mood === 'win' || sw.mood === 'lose' ? 0 : Math.min(1, sw.moving * (0.7 + sw.boost.value * 0.5))
  }
}
