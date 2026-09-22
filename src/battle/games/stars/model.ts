/**
 * 点亮星星的纯模型（需求 B36q）：快照 + 事件 + 时间 → 场景数据（两串星星亮了几颗、飞着的火花、连线、角色动作、小星星的闪烁、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import type { CritterKind } from '@/battle/game/sprites/scenery'

export interface StarsGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 120px 高的缩放 */
  k: number
  /** 角色坐高、坐的位置（云面） */
  size: number
  kidX: number
  kidY: [number, number]
  /** 大星星的半径与两串的位置（红上蓝下），每串 8 颗 */
  starR: number
  stars: [{ x: number; y: number }[], { x: number; y: number }[]]
  /** 魔法棒棒尖（火花从这里出发） */
  wand: [{ x: number; y: number }, { x: number; y: number }]
}

/** 每串星星的高低错落 */
const ZIG = [0, -1, 0.6, -0.5, 0.9, -0.8, 0.3, -0.4]

export function layoutStars(W: number, H: number, compact: boolean): StarsGeometry {
  const k = H / 120
  const size = compact ? Math.min(20, H * 0.34) : 30 * k
  const starR = compact ? Math.min(6, H * 0.11) : 8 * k
  const laneY: [number, number] = [H * 0.33, H * 0.72]
  const amp = compact ? H * 0.1 : H * 0.11
  const kidX = compact ? 18 : 30 * k
  const startX = kidX + size * 1.0 + starR * 1.4
  const endX = W - (compact ? 16 : 24 * k) - starR
  const row = (y: number): { x: number; y: number }[] => ZIG.map((z, n) => ({ x: startX + ((endX - startX) * n) / 7, y: y + z * amp }))
  return {
    W,
    H,
    compact,
    k,
    size,
    kidX,
    kidY: [laneY[0] + size * 0.45, laneY[1] + size * 0.45],
    starR,
    stars: [row(laneY[0]), row(laneY[1])],
    wand: [
      { x: kidX + size * 0.62, y: laneY[0] - size * 0.35 },
      { x: kidX + size * 0.62, y: laneY[1] - size * 0.35 },
    ],
  }
}

export interface Twinkle {
  x: number
  y: number
  r: number
  phase: number
  speed: number
}

export interface StarsOptions {
  reducedMotion: boolean
}

export const LIGHT_TIME = 0.8
export const LIGHT_TIME_REDUCED = 0.3
export const SPRINT_FROM = 2
export const SPARKLE_ROUNDS = 3
export const SPARKLE_GAP = 0.5
export const LINE_TIME = 1.0

export class StarsModel {
  geo: StarsGeometry = layoutStars(1000, 120, false)
  kids: [Racer, Racer]
  readonly kinds: [CritterKind, CritterKind] = ['pig', 'monkey']
  /** 魔法棒挥动 */
  wave: [Decay, Decay] = [new Decay(0.35), new Decay(0.35)]
  /** 刚亮的那颗弹一下 */
  pop: [Decay, Decay] = [new Decay(0.35), new Decay(0.35)]
  popStar: [number, number] = [-1, -1]
  private lastLit: [number, number] = [0, 0]
  /** 还差一分：下一颗要亮的星星一闪一闪 */
  nextGlow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  /** 连线连成图案的进度 */
  lines: [Tween, Tween] = [new Tween(0, ease.outCubic), new Tween(0, ease.outCubic)]
  private connected: [boolean, boolean] = [false, false]
  twinkles: Twinkle[] = []
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private sparkleLeft = 0
  private sparkleT = 0
  private zzT = 0
  private readonly rng: RNG
  private readonly opts: StarsOptions

  constructor(rng: RNG, opts: StarsOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.kids = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(1000, 120, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: LIGHT_TIME, moveTimeReduced: LIGHT_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutStars(W, H, compact)
    this.kids.forEach((kid, i) => {
      kid.pos.set(this.stageFor(kid.score, kid.mood === 'win'))
      this.lastLit[i] = this.litCount(i)
    })
    const n = compact ? 8 : 28
    this.twinkles = Array.from({ length: n }, () => ({
      x: this.rng.next() * W,
      y: this.rng.next() * H * 0.9,
      r: (0.6 + this.rng.next() * 1.0) * this.geo.k,
      phase: this.rng.next() * Math.PI * 2,
      speed: 1.5 + this.rng.next() * 2.5,
    }))
  }

  /** 得 score 分时亮了几颗（0…8，连续值） */
  stageFor(score: number, won = false): number {
    if (won) return 8
    return clamp(score, 0, this.target) * (8 / this.target)
  }

  kid(team: Team): Racer {
    return this.kids[team === 'red' ? 0 : 1]
  }

  /** 已经亮起来的星星数 */
  litCount(i: number): number {
    return Math.min(8, Math.floor(this.kids[i]!.pos.value + 0.02))
  }

  /** 第 n 颗（0 起）亮的程度 0…1 */
  litOf(i: number, n: number): number {
    return clamp(this.kids[i]!.pos.value - n, 0, 1) >= 0.98 ? 1 : 0
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.kids.forEach((kid, i) => {
      const forward = kid.apply(s, (score, won) => this.stageFor(score, won), this.timing)
      if (forward) this.wave[i]!.kick(1 + kid.boost.value * 0.5)
      if (!forward && kid.pos.done) this.lastLit[i] = this.litCount(i)
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      for (const g of this.nextGlow) g.value = 0
      this.lastLit = [0, 0]
    }
    if (s.phase !== 'ended') {
      this.sparkleLeft = 0
      for (let i = 0; i < 2; i++) {
        if (this.connected[i]) {
          this.connected[i] = false
          this.lines[i]!.set(0)
        }
      }
    } else if (s.winner) {
      const i = s.winner === 'red' ? 0 : 1
      if (this.connected[1 - i]) {
        this.connected[1 - i] = false
        this.lines[1 - i]!.set(0)
      }
      if (!this.connected[i] && this.kids[i]!.pos.done) this.connect(i)
    }
  }

  /** 星星亮起时迸的亮片 */
  private burst(i: number, n: number, count: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const p = g.stars[i]![n]!
    this.particles.emit({
      x: p.x,
      y: p.y,
      count,
      speed: 60 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 2,
      life: 0.7,
      size: 2.4 * g.k,
      colors: ['#ffe27a', '#ffffff', i === 0 ? '#ffb3b3' : '#a9d3ff'],
      shape: 'flake',
      gravity: 40 * g.k,
      drag: 1.6,
    })
  }

  /** 结束时一轮轮的亮片（像流星） */
  private sparkles(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const p = g.stars[i]![Math.floor(this.rng.next() * 8)]!
    this.particles.emit({
      x: p.x,
      y: p.y,
      count: 14,
      speed: 110 * g.k,
      angle: Math.PI * 0.8,
      spread: Math.PI * 0.6,
      life: 1.1,
      size: 2.6 * g.k,
      colors: ['#ffe27a', '#ffffff', '#c9a3ff'],
      shape: 'flake',
      gravity: 30 * g.k,
      drag: 1.2,
    })
  }

  private connect(i: number): void {
    this.connected[i] = true
    this.lines[i]!.to(1, this.animated ? LINE_TIME : 0.2)
    this.sparkles(i)
    this.sparkleLeft = SPARKLE_ROUNDS - 1
    this.sparkleT = 0
  }

  private go(): void {
    for (const w of this.wave) w.kick(1)
    for (const kid of this.kids) kid.boost.kick(0.5)
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const kid of this.kids) kid.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.kid(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak':
        this.kid(e.team).boost.kick(1)
        this.wave[e.team === 'red' ? 0 : 1]!.kick(1.5)
        break
      case 'lead':
        this.kid(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.nextGlow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        // 连线等胜方最后一颗亮完（位移结束）再连，见 step
        break
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：挥一下魔法棒、蹦一下 */
  poke(team: Team): void {
    const kid = this.kid(team)
    kid.poke.kick(1)
    this.wave[team === 'red' ? 0 : 1]!.kick(1.5)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 2) this.particles.clear()
  }

  step(dt: number): void {
    this.time += dt
    const animated = this.animated
    if (this.sparkleLeft > 0 && this.winner) {
      this.sparkleT += dt
      if (this.sparkleT >= SPARKLE_GAP) {
        this.sparkleT = 0
        this.sparkleLeft -= 1
        this.sparkles(this.winner === 'red' ? 0 : 1)
      }
    }
    this.kids.forEach((kid, i) => {
      kid.step(dt, 1.5, animated)
      this.wave[i]!.step(dt)
      this.pop[i]!.step(dt)
      this.nextGlow[i]!.step(dt)
      this.lines[i]!.step(dt)
      const lit = this.litCount(i)
      if (lit > this.lastLit[i]!) {
        for (let n = this.lastLit[i]!; n < lit; n++) {
          this.popStar[i] = n
          this.pop[i]!.kick(1)
          this.burst(i, n, 5 + Math.round(kid.boost.value * 4))
        }
        this.lastLit[i] = lit
      } else if (lit < this.lastLit[i]!) this.lastLit[i] = lit
      if (kid.mood === 'win' && !this.connected[i] && kid.pos.done) this.connect(i)
      // 睡着了：头顶冒小星星
      if (kid.mood === 'lose' && animated && this.quality < 2) {
        this.zzT += dt
        if (this.zzT > 1.2) {
          this.zzT = 0
          const g = this.geo
          this.particles.emit({ x: g.kidX + g.size * 0.2, y: g.kidY[i]! - g.size * 1.1, count: 1, speed: 12 * g.k, angle: -Math.PI / 2, spread: 0.4, life: 1.6, size: 2 * g.k, colors: ['#fff6c8'], shape: 'flake', gravity: -8 * g.k, drag: 0.5 })
        }
      }
    })
    this.particles.step(dt)
  }

  /** 正在飞的火花：从上一颗星（第一颗从棒尖）飞向正在亮的那颗 */
  sparkOf(i: number): { x: number; y: number; alpha: number } | null {
    const kid = this.kids[i]!
    if (kid.pos.done || kid.mood === 'ready') return null
    const g = this.geo
    // 正在亮的是补间的目标那颗（outBack 会过冲，按当前值算会提前指到下一颗）
    const n = Math.min(8, Math.ceil(kid.pos.target - 0.001))
    if (n < 1) return null
    const t = clamp(kid.pos.value - (n - 1), 0, 1)
    const from = n === 1 ? g.wand[i]! : g.stars[i]![n - 2]!
    const to = g.stars[i]![n - 1]!
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * g.starR * 1.5, alpha: 1 }
  }

  /** 第 n 颗星的缩放（刚亮的弹一下；赢了按次序一波波闪） */
  scaleOf(i: number, n: number): number {
    if (!this.animated) return 1
    let s = 1
    if (this.popStar[i] === n) s += this.pop[i]!.value * 0.5
    if (this.kids[i]!.mood === 'win') s += 0.15 * Math.max(0, Math.sin(this.time * 4 - n * 0.6))
    return s
  }

  /** 下一颗要亮的星星的闪烁 */
  pulseOf(i: number, n: number): number {
    if (n !== this.litCount(i) || !this.animated) return 0
    return this.nextGlow[i]!.value * (0.5 + 0.5 * Math.sin(this.time * 8))
  }

  liftOf(kid: Racer): number {
    return this.liftOfBase(kid) + kid.poke.value * this.geo.size * 0.25
  }

  private liftOfBase(kid: Racer): number {
    const g = this.geo
    if (!this.animated) return 0
    if (kid.mood === 'ready') return Math.abs(Math.sin(kid.hop)) * g.size * 0.15
    if (kid.mood === 'win') return Math.abs(Math.sin(kid.phase)) * g.size * 0.12
    return 0
  }

  sleepyOf(kid: Racer): number {
    return kid.mood === 'lose' ? Math.min(1, kid.moodT / 1.2) : 0
  }

  /** 魔法棒挥动程度（冲刺一直举着） */
  waveOf(kid: Racer, i: number): number {
    const w = this.wave[i]!.value
    if (this.sprint && kid.mood !== 'lose') return Math.max(w, 0.5 + (this.animated ? Math.sin(this.time * 6 + i) * 0.2 : 0))
    return Math.min(1, w)
  }

  /** 小星星的亮度 */
  twinkleOf(t: Twinkle): number {
    if (!this.animated || this.quality >= 1) return 0.6
    return 0.35 + 0.65 * Math.max(0, Math.sin(this.time * t.speed * (this.sprint ? 2 : 1) + t.phase))
  }
}
