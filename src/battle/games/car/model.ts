/**
 * 赛车的纯模型（需求 B36g）：快照 + 事件 + 时间 → 场景数据（两辆车的位置、轮子转角与姿势、云、旗、观众、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'

export interface CarGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 120px 高的缩放 */
  k: number
  startX: number
  finishX: number
  /** 两条车道的着地线 y（红上蓝下） */
  laneY: [number, number]
  roadTop: number
  roadBottom: number
  /** 车长 */
  size: number
  skyH: number
  runFrom: number
  runTo: number
}

export function layoutCar(W: number, H: number, compact: boolean): CarGeometry {
  const k = H / 120
  const size = compact ? Math.min(30, H * 0.5) : 46 * k
  const startX = compact ? 26 : 60 * Math.min(1, W / 1000) + 10
  const finishX = W - (compact ? 40 : 72 * Math.min(1, W / 1000))
  const roadTop = compact ? H * 0.08 : H * 0.4
  const roadBottom = compact ? H * 0.96 : H * 0.94
  const laneH = (roadBottom - roadTop) / 2
  const pad = size * 0.6
  return {
    W,
    H,
    compact,
    k,
    startX,
    finishX,
    laneY: [roadTop + laneH * 0.9, roadTop + laneH * 1.9],
    roadTop,
    roadBottom,
    size,
    skyH: compact ? H * 0.3 : H * 0.42,
    runFrom: startX + pad,
    runTo: finishX - pad,
  }
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface CarOptions {
  reducedMotion: boolean
}

export const RUN_TIME = 0.8
export const RUN_TIME_REDUCED = 0.3
export const WIN_EXTRA = 24
export const SPRINT_FROM = 2
const CROWD = 4

export class CarModel {
  geo: CarGeometry = layoutCar(1000, 120, false)
  cars: [Racer, Racer]
  /** 轮子转角（按走过的距离累计） */
  wheel: [number, number] = [0, 0]
  private lastX: [number, number] = [0, 0]
  private puffT: [number, number] = [0, 0]
  clouds: Cloud[] = []
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  flagWave = 0
  /** 还差一分：终点旗猛挥 */
  flagRush = new Decay(1)
  /** 发令员的旗：0 举起 1 落下 */
  starter = new Tween(0, ease.outBounce)
  crowdWave: number[] = Array.from({ length: CROWD }, () => 0)
  crowdJump = 0
  particles: ParticlePool
  quality = 0
  private readonly rng: RNG
  private readonly opts: CarOptions

  constructor(rng: RNG, opts: CarOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.cars = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(1000, 120, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: RUN_TIME, moveTimeReduced: RUN_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutCar(W, H, compact)
    this.cars.forEach((c, i) => {
      c.pos.set(this.xFor(c.score, c.mood === 'win'))
      this.lastX[i] = c.pos.value
    })
    const n = compact ? 1 : 3
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 80,
      y: this.geo.skyH * (0.15 + this.rng.next() * 0.4),
      s: (compact ? 8 : 13) * (0.8 + this.rng.next() * 0.5),
      v: (compact ? 6 : 10) * (0.7 + this.rng.next() * 0.6),
    }))
  }

  xFor(score: number, won = false): number {
    const g = this.geo
    const t = clamp(score / this.target, 0, 1)
    return won ? g.finishX + WIN_EXTRA * g.k : g.runFrom + (g.runTo - g.runFrom) * t
  }

  car(team: Team): Racer {
    return this.cars[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    for (const c of this.cars) {
      const forward = c.apply(s, (score, won) => this.xFor(score, won), this.timing)
      if (forward) this.puff(c, 3)
    }
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.starter.set(0)
      this.crowdJump = 0
      this.particles.clear()
      this.cars.forEach((c, i) => {
        this.lastX[i] = c.pos.value
      })
    }
  }

  /** 尾气 / 起步扬尘 */
  private puff(c: Racer, n: number, dark = false): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const lane = c.team === 'red' ? 0 : 1
    this.particles.emit({
      x: c.pos.value - g.size * 0.55,
      y: g.laneY[lane] - g.size * 0.2,
      count: n,
      speed: 50 * g.k,
      angle: Math.PI,
      spread: Math.PI * 0.5,
      life: 0.6,
      size: (3 + (dark ? 1 : 0)) * g.k,
      colors: dark ? ['#6b6b6b', '#8a8a8a'] : ['#e6e6e6', '#f5f5f5'],
      gravity: -30 * g.k,
      drag: 2.5,
    })
  }

  private go(): void {
    this.starter.to(1, this.animated ? 0.6 : 0.2)
    for (const c of this.cars) {
      c.boost.kick(0.5)
      this.puff(c, 6)
    }
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const c of this.cars) c.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point': {
        const c = this.car(e.team)
        c.boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        const side = e.team === 'red' ? 0 : 1
        for (let i = 0; i < CROWD; i++) if (i % 2 === side) this.crowdWave[i] = 1
        break
      }
      case 'streak':
        this.car(e.team).boost.kick(1)
        break
      case 'lead':
        this.car(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.flagRush.kick(1)
        break
      case 'finished':
        this.crowdJump = 1
        if (this.animated && this.quality < 2) {
          const g = this.geo
          const colors = e.winner === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
          this.particles.emit({
            x: g.finishX,
            y: g.roadTop - g.size * 0.2,
            count: 28,
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
        break
      default:
        break
    }
  }

  /** 点一下（B59）：颠一下、轰一脚油门冒尾气 */
  poke(team: Team): void {
    const c = this.car(team)
    c.poke.kick(1)
    c.boost.kick(0.6)
    this.puff(c, 3)
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
    this.flagWave += dt * (this.sprint ? 12 : 4) * (1 + this.flagRush.value * 2)
    this.flagRush.step(dt)
    this.starter.step(dt)
    for (let i = 0; i < CROWD; i++) {
      const w = this.crowdWave[i]!
      this.crowdWave[i] = this.sprint ? Math.max(0.5, w) : w > 0.001 ? w * Math.pow(0.5, dt / 0.6) : 0
    }
    if (this.crowdJump > 0) this.crowdJump += dt
    this.cars.forEach((c, i) => {
      c.step(dt, 6, animated)
      // 轮子按走过的距离转
      const dx = c.pos.value - this.lastX[i]!
      this.lastX[i] = c.pos.value
      const r = g.size * 0.13
      this.wheel[i] = this.wheel[i]! + dx / r + (c.mood === 'ready' && animated ? dt * 6 : 0)
      // 尾气：跑的时候冒白烟，输了熄火冒黑烟
      this.puffT[i] = this.puffT[i]! + dt
      if (c.moving > 0.4 && this.puffT[i]! > 0.12) {
        this.puffT[i] = 0
        this.puff(c, 1 + Math.round(c.boost.value * 2))
      } else if (c.mood === 'lose' && this.puffT[i]! > 0.35) {
        this.puffT[i] = 0
        this.puff(c, 1, true)
      }
    })
    this.particles.step(dt)
  }

  /** 车身离地（倒数发动机抖、跑动颠簸、胜利翘头蹦） */
  lift(c: Racer): number {
    return this.liftBase(c) + c.poke.value * this.geo.size * 0.15
  }

  private liftBase(c: Racer): number {
    const g = this.geo
    if (!this.animated) return 0
    if (c.mood === 'ready') return Math.abs(Math.sin(c.hop * 6)) * g.size * 0.02
    if (c.mood === 'win') return Math.abs(Math.sin(c.phase)) * g.size * 0.12
    return Math.abs(Math.sin(c.phase * 2)) * g.size * 0.02 * c.moving
  }

  tilt(c: Racer): number {
    if (!this.animated) return 0
    if (c.mood === 'win') return -Math.abs(Math.sin(c.phase)) * 0.18
    if (c.mood === 'lose') return Math.min(1, c.moodT) * 0.05
    return -c.boost.value * 0.08 * c.moving
  }

  nitro(c: Racer): number {
    if (c.mood === 'lose') return 0
    return Math.min(1, c.boost.value + (this.sprint ? 0.25 : 0)) * (c.moving > 0.2 || !c.pos.done || c.mood === 'ready' ? 1 : 0.4)
  }
}

