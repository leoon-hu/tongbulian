/**
 * 热气球的纯模型（需求 B36h）：快照 + 事件 + 时间 → 场景数据（两只气球的高度与姿势、云、云层、小鸟、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp } from '@/battle/game/engine/tween'

export interface BalloonGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  colX: [number, number]
  /** 气球总高（球顶到篮底） */
  size: number
  /** 地面 y（篮底停在这里） */
  groundY: number
  /** 目标云层的顶边与厚度 */
  cloudY: number
  bandH: number
  /** 8 分时篮底的 y（云层底边：气球在云上） */
  goalY: number
}

export function layoutBalloon(W: number, H: number, compact: boolean): BalloonGeometry {
  const k = W / 150
  const size = compact ? Math.min(56, W * 0.55) : 84 * k
  const bandH = size * 0.35
  const cloudY = Math.max(compact ? 24 : 40 * k, size - bandH + 4 * k)
  const groundY = H - (compact ? 10 : 18 * k)
  return { W, H, compact, k, colX: [W * 0.27, W * 0.73], size, groundY, cloudY, bandH, goalY: cloudY + bandH }
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface Bird {
  x: number
  y: number
  v: number
  flap: number
}

export interface BalloonOptions {
  reducedMotion: boolean
}

export const RISE_TIME = 0.8
export const RISE_TIME_REDUCED = 0.3
/** 赢了再往上飘一点（× size） */
export const WIN_EXTRA = 0.12
export const SPRINT_FROM = 2
export const CONFETTI_ROUNDS = 3
export const CONFETTI_GAP = 0.5

const PASSENGERS: [import('@/battle/game/sprites/scenery').CritterKind, import('@/battle/game/sprites/scenery').CritterKind] = ['bear', 'pig']

export class BalloonModel {
  geo: BalloonGeometry = layoutBalloon(150, 700, false)
  balloons: [Racer, Racer]
  /** 烧嘴爆燃（得分 / 开始时踢一下） */
  burst: [Decay, Decay] = [new Decay(0.5), new Decay(0.5)]
  /** 乘客挥手 */
  wave: [Decay, Decay] = [new Decay(0.6), new Decay(0.6)]
  clouds: Cloud[] = []
  bird: Bird | null = null
  /** 还差一分：云层发光 */
  cloudGlow = new Decay(1)
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  /** 两位乘客（B66：按快照里两队的小动物换） */
  passengers: typeof PASSENGERS = PASSENGERS
  private nextBird = 3
  private confettiLeft = 0
  private confettiT = 0
  private readonly rng: RNG
  private readonly opts: BalloonOptions

  constructor(rng: RNG, opts: BalloonOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.balloons = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: RISE_TIME, moveTimeReduced: RISE_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutBalloon(W, H, compact)
    for (const b of this.balloons) b.pos.set(this.yFor(b.score, b.mood === 'win'))
    const n = compact ? 1 : 3
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: this.rng.next() * W,
      y: this.geo.goalY + (H - this.geo.goalY) * (0.12 + i * 0.25 + this.rng.next() * 0.1),
      s: (compact ? 6 : 9) * (0.8 + this.rng.next() * 0.5),
      v: (compact ? 4 : 6) * (0.7 + this.rng.next() * 0.6),
    }))
    this.bird = null
  }

  /** 得 score 分时篮底的 y；赢了再往上飘一点 */
  yFor(score: number, won = false): number {
    const g = this.geo
    if (won) return g.goalY - g.size * WIN_EXTRA
    const t = clamp(score / this.target, 0, 1)
    return g.groundY - (g.groundY - g.goalY) * t
  }

  balloon(team: Team): Racer {
    return this.balloons[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.passengers = [s.avatars?.red ?? PASSENGERS[0], s.avatars?.blue ?? PASSENGERS[1]] as typeof PASSENGERS
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.balloons.forEach((b, i) => {
      const forward = b.apply(s, (score, won) => this.yFor(score, won), this.timing)
      if (forward) {
        this.burst[i]!.kick(0.8)
        this.sparks(b)
      }
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.confettiLeft = 0
      this.cloudGlow.value = 0
    }
  }

  /** 烧嘴的火星 */
  private sparks(b: Racer): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    this.particles.emit({
      x: g.colX[b.team === 'red' ? 0 : 1],
      y: b.pos.value - g.size * 0.2,
      count: 5,
      speed: 40 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 0.6,
      life: 0.5,
      size: 2.2 * g.k,
      colors: ['#ffe27a', '#ff9f43'],
      gravity: -40 * g.k,
      drag: 2,
    })
  }

  private confetti(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const colors = team === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
    this.particles.emit({
      x: g.colX[team === 'red' ? 0 : 1] + (this.rng.next() - 0.5) * g.W * 0.3,
      y: g.cloudY + g.bandH * 0.5,
      count: 18,
      speed: 80 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.3,
      life: 1.5,
      size: 3.5 * g.k,
      colors,
      shape: 'flake',
      gravity: 60 * g.k,
      drag: 1.2,
    })
  }

  private go(): void {
    this.balloons.forEach((b, i) => {
      this.burst[i]!.kick(1)
      this.wave[i]!.kick(1)
      this.sparks(b)
    })
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const b of this.balloons) b.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point': {
        const i = e.team === 'red' ? 0 : 1
        this.balloon(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        this.burst[i]!.kick(Math.min(1.5, 0.8 + (e.streak - 1) * 0.3))
        this.wave[i]!.kick(1)
        break
      }
      case 'streak': {
        const i = e.team === 'red' ? 0 : 1
        this.balloon(e.team).boost.kick(1)
        this.burst[i]!.kick(1.5)
        break
      }
      case 'lead':
        this.balloon(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.cloudGlow.kick(1)
        break
      case 'finished':
        this.confettiLeft = CONFETTI_ROUNDS - 1
        this.confettiT = 0
        this.confetti(e.winner)
        this.wave[e.winner === 'red' ? 0 : 1]!.kick(1)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：烧嘴喷一下火、乘客挥手、往上一浮 */
  poke(team: Team): void {
    const b = this.balloon(team)
    const i = team === 'red' ? 0 : 1
    b.poke.kick(1)
    this.burst[i]!.kick(1.3)
    this.wave[i]!.kick(1)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 1) this.bird = null
    if (level >= 2) this.particles.clear()
  }

  step(dt: number): void {
    this.time += dt
    const g = this.geo
    const animated = this.animated
    if (animated && this.quality < 1) {
      for (const c of this.clouds) {
        c.x += c.v * dt
        if (c.x - c.s * 1.5 > g.W) c.x = -c.s * 1.8
      }
      if (!g.compact) {
        if (this.bird) {
          this.bird.x += this.bird.v * dt
          this.bird.flap = advancePhase(this.bird.flap, dt, 4)
          if (this.bird.x > g.W + 20) this.bird = null
        } else {
          this.nextBird -= dt * (this.sprint ? 2 : 1)
          if (this.nextBird <= 0) {
            this.nextBird = 6 + this.rng.next() * 5
            this.bird = { x: -20, y: g.goalY + (g.groundY - g.goalY) * (0.1 + this.rng.next() * 0.5), v: (28 + this.rng.next() * 14) * g.k, flap: 0 }
          }
        }
      }
    }
    this.cloudGlow.step(dt)
    if (this.confettiLeft > 0 && this.winner) {
      this.confettiT += dt
      if (this.confettiT >= CONFETTI_GAP) {
        this.confettiT = 0
        this.confettiLeft -= 1
        this.confetti(this.winner)
      }
    }
    this.balloons.forEach((b, i) => {
      b.step(dt, 1.2, animated)
      this.burst[i]!.step(dt)
      this.wave[i]!.step(dt)
      if (b.mood === 'win') this.wave[i]!.kick(0.6)
    })
    this.particles.step(dt)
  }

  /** 篮底当前 y（含待机起伏、输了下沉） */
  yOf(b: Racer): number {
    return this.yOfBase(b) - b.poke.value * this.geo.size * 0.08
  }

  private yOfBase(b: Racer): number {
    const g = this.geo
    let y = b.pos.value
    if (!this.animated) return y
    if (b.mood === 'idle' || b.mood === 'run') y += Math.sin(b.hop) * g.size * 0.03
    else if (b.mood === 'win') y += Math.sin(b.phase) * g.size * 0.05
    else if (b.mood === 'lose') y += Math.min(1, b.moodT / 1.5) * g.size * 0.15
    return y
  }

  swayOf(b: Racer): number {
    if (!this.animated) return 0
    const base = Math.sin(this.time * 1.1 + (b.team === 'red' ? 0 : 1.7)) * (this.sprint ? 0.09 : 0.05)
    return base + Math.sin(b.moodT * 30) * 0.06 * b.look.value
  }

  flameOf(b: Racer, i: number): number {
    if (b.mood === 'lose') return 0
    const flicker = this.animated ? 0.15 * Math.sin(this.time * 25 + i) : 0
    const base = b.mood === 'ready' ? 0.35 : 0.3
    return base + b.moving * 0.5 + this.burst[i]!.value * 0.8 + (this.sprint ? 0.15 : 0) + flicker
  }

  deflateOf(b: Racer): number {
    return b.mood === 'lose' ? Math.min(1, b.moodT / 1.5) : 0
  }
}
