/**
 * 跷跷板的纯模型（需求 B36s）：快照 + 事件 + 时间 → 场景数据（板的倾角、两头的砝码与角色、颠一下、云、粒子）。
 * 倾角只由比分差决定（拉锯类），赢的那头压到底。不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import type { CritterKind } from '@/battle/game/sprites/scenery'

export interface SeesawGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 120px 高的缩放 */
  k: number
  /** 角色坐高、砝码边长 */
  size: number
  weightS: number
  groundY: number
  /** 支点 */
  pivotX: number
  pivotY: number
  pivotH: number
  /** 板的半长与厚度、最大倾角（板头几乎碰到地） */
  half: number
  thick: number
  maxAngle: number
  /** 每头 8 个砝码在板上的位置（板坐标系 x，从外往里） */
  slots: [number[], number[]]
  /** 两只角色坐的位置（板坐标系 x） */
  seat: [number, number]
}

export function layoutSeesaw(W: number, H: number, compact: boolean): SeesawGeometry {
  const k = H / 120
  const size = compact ? Math.min(20, H * 0.34) : 30 * k
  const groundY = H - (compact ? 4 : 12 * k)
  const pivotH = compact ? H * 0.3 : 34 * k
  const half = compact ? W * 0.24 : Math.min(W * 0.28, 280 * k)
  const weightS = compact ? Math.min(7, H * 0.12) : 10 * k
  const slot = (d: 1 | -1): number[] => Array.from({ length: 8 }, (_, n) => d * half * (0.72 - n * 0.075))
  return {
    W,
    H,
    compact,
    k,
    size,
    weightS,
    groundY,
    pivotX: W / 2,
    pivotY: groundY - pivotH,
    pivotH,
    half,
    thick: compact ? 4 : 6 * k,
    maxAngle: Math.atan((pivotH * 0.86) / half),
    slots: [slot(-1), slot(1)],
    seat: [-half * 0.9, half * 0.9],
  }
}

export interface Weight {
  /** 从天上掉到板上的进度（板坐标系里离板面的高度，落到 0） */
  drop: Tween
  delay: number
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface SeesawOptions {
  reducedMotion: boolean
}

export const TILT_TIME = 0.8
export const TILT_TIME_REDUCED = 0.3
export const DROP_TIME = 0.5
export const STAGGER = 0.1
export const SPRINT_FROM = 2
export const CONFETTI_ROUNDS = 3
export const CONFETTI_GAP = 0.5

export class SeesawModel {
  geo: SeesawGeometry = layoutSeesaw(1000, 120, false)
  riders: [Racer, Racer]
  readonly kinds: [CritterKind, CritterKind] = ['bear', 'panda']
  /** 板的倾角（弧度，负 = 左头沉） */
  tilt = new Tween(0, ease.outBack)
  weights: [Weight[], Weight[]] = [[], []]
  /** 板头触地颠一下 */
  bump: [Decay, Decay] = [new Decay(0.3), new Decay(0.3)]
  /** 连对时板子抖 */
  shake = new Decay(0.35)
  /** 还差一分：那头的扶手发光 */
  glow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  clouds: Cloud[] = []
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private atGround: [boolean, boolean] = [false, false]
  private confettiLeft = 0
  private confettiT = 0
  private readonly rng: RNG
  private readonly opts: SeesawOptions

  constructor(rng: RNG, opts: SeesawOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.riders = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(1000, 120, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: TILT_TIME, moveTimeReduced: TILT_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutSeesaw(W, H, compact)
    this.riders.forEach((r, i) => {
      r.pos.set(r.score)
      this.weights[i] = Array.from({ length: r.score }, () => ({ drop: new Tween(0, ease.outBounce), delay: 0 }))
    })
    this.tilt.set(this.tiltFor(this.riders[0].score, this.riders[1].score, this.winner))
    const n = compact ? 1 : 3
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 80,
      y: this.geo.pivotY * (0.15 + this.rng.next() * 0.35),
      s: (compact ? 8 : 13) * (0.8 + this.rng.next() * 0.5),
      v: (compact ? 6 : 10) * (0.7 + this.rng.next() * 0.6),
    }))
  }

  /** 倾角只看比分差：红多一分往左沉一格；赢了那头压到底 */
  tiltFor(red: number, blue: number, winner: Team | null): number {
    const g = this.geo
    if (winner) return winner === 'red' ? -g.maxAngle : g.maxAngle
    const diff = clamp(red - blue, -this.target, this.target) / this.target
    return -diff * g.maxAngle * 0.92
  }

  rider(team: Team): Racer {
    return this.riders[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    const scores = [s.red, s.blue]
    this.riders.forEach((r, i) => {
      r.apply(s, (score) => score, this.timing)
      const want = Math.min(8, Math.round(clamp(scores[i]!, 0, this.target) * (8 / this.target)))
      const have = this.weights[i]!
      if (want < have.length || s.phase === 'lobby' || s.phase === 'countdown') have.length = Math.min(have.length, want)
      let k = 0
      while (have.length < want) {
        const w: Weight = { drop: new Tween(this.animated ? -this.geo.weightS * 4 : 0, ease.outBounce), delay: this.animated ? k * STAGGER : 0 }
        if (w.delay <= 0) w.drop.to(0, this.animated ? DROP_TIME : 0.2)
        have.push(w)
        k++
      }
    })
    const target = this.tiltFor(s.red, s.blue, s.phase === 'ended' ? s.winner : null)
    if (Math.abs(target - this.tilt.target) > 1e-6) {
      const won = s.phase === 'ended' && s.winner
      this.tilt.to(target, this.animated ? (won ? 1.0 : TILT_TIME) : TILT_TIME_REDUCED, this.animated ? (won ? ease.outBounce : ease.outBack) : ease.linear)
    }
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.confettiLeft = 0
      for (const gl of this.glow) gl.value = 0
      this.tilt.set(0)
      this.atGround = [false, false]
    }
    if (s.phase === 'ended' && s.winner && this.confettiLeft === 0 && !this.celebrated) {
      this.celebrated = true
      this.confettiLeft = CONFETTI_ROUNDS
      this.confettiT = CONFETTI_GAP
    }
    if (s.phase !== 'ended') this.celebrated = false
  }

  private celebrated = false

  /** 板头触地扬尘 */
  private dust(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const end = this.endPoint(i)
    this.particles.emit({
      x: end.x,
      y: this.geo.groundY - 1,
      count: 8,
      speed: 50 * this.geo.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.1,
      life: 0.6,
      size: 3 * this.geo.k,
      colors: ['#e6d3a8', '#f3e5c2'],
      gravity: -20 * this.geo.k,
      drag: 2.5,
    })
  }

  private confetti(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const end = this.endPoint(team === 'red' ? 0 : 1)
    const colors = team === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
    this.particles.emit({
      x: end.x,
      y: end.y - g.size,
      count: 22,
      speed: 130 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.2,
      life: 1.5,
      size: 4 * g.k,
      colors,
      shape: 'flake',
      gravity: 120 * g.k,
      drag: 1.2,
    })
  }

  private go(): void {
    for (const b of this.bump) b.kick(0.6)
    for (const r of this.riders) r.boost.kick(0.5)
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const r of this.riders) r.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.rider(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak':
        this.rider(e.team).boost.kick(1)
        this.shake.kick(1)
        break
      case 'lead':
        this.rider(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.glow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        break
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：那一头颠一下、板子抖一抖 */
  poke(team: Team): void {
    this.bump[team === 'red' ? 0 : 1]!.kick(1)
    this.shake.kick(0.6)
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
      for (const c of this.clouds) {
        c.x += c.v * dt
        if (c.x - c.s * 1.2 > g.W) c.x = -c.s * 1.5
      }
    }
    this.tilt.step(dt)
    this.shake.step(dt)
    this.riders.forEach((r, i) => {
      r.step(dt, 1.5, animated)
      this.bump[i]!.step(dt)
      this.glow[i]!.step(dt)
      for (const w of this.weights[i]!) {
        if (w.delay > 0) {
          w.delay -= dt
          if (w.delay <= 0) w.drop.to(0, animated ? DROP_TIME : 0.2)
          continue
        }
        w.drop.step(dt)
      }
      // 板头压到地：颠一下、扬尘
      const down = this.endPoint(i).y >= g.groundY - g.thick * 1.2
      if (down && !this.atGround[i]) {
        this.atGround[i] = true
        this.bump[i]!.kick(1)
        this.dust(i)
      } else if (!down && this.atGround[i]) this.atGround[i] = false
    })
    if (this.confettiLeft > 0 && this.winner) {
      this.confettiT += dt
      if (this.confettiT >= CONFETTI_GAP) {
        this.confettiT = 0
        this.confettiLeft -= 1
        this.confetti(this.winner)
      }
    }
    this.particles.step(dt)
  }

  /** 板此刻的角度（含连对时的抖） */
  angle(): number {
    return this.tilt.value + (this.animated ? Math.sin(this.time * 35) * this.shake.value * 0.02 : 0)
  }

  /** 板头（第 i 头）在画面里的位置 */
  endPoint(i: number): { x: number; y: number } {
    const g = this.geo
    const a = this.angle()
    const x = g.seat[i]! / 0.9
    return { x: g.pivotX + Math.cos(a) * x, y: g.pivotY + Math.sin(a) * x }
  }

  /** 角色离座（颠一下 / 倒数蹦 / 胜利蹦） */
  liftOf(r: Racer, i: number): number {
    const g = this.geo
    if (!this.animated) return 0
    if (r.mood === 'ready') return Math.abs(Math.sin(r.hop)) * g.size * 0.12
    if (r.mood === 'win') return Math.abs(Math.sin(r.phase)) * g.size * 0.12
    return this.bump[i]!.value * g.size * 0.25
  }

  /** 翘起来的那头腿悬着 */
  dangleOf(i: number): number {
    const a = this.tilt.value
    const up = i === 0 ? a > 0 : a < 0
    return up ? clamp(Math.abs(a) / this.geo.maxAngle, 0, 1) : 0
  }

  /** 输了被翘在高处瞪眼 */
  scaredOf(r: Racer): number {
    return r.mood === 'lose' ? Math.min(1, r.moodT / 0.6) : 0
  }

  waveOf(r: Racer): number {
    if (!this.animated) return 0
    if (this.sprint && r.mood !== 'lose') return 1
    return 0
  }

  weightCount(i: number): number {
    return this.weights[i]!.length
  }
}
