/**
 * 爬梯子的纯模型（需求 B36j）：快照 + 事件 + 时间 → 场景数据（两只角色的高度与姿势、横档弯曲、梯子晃动、旗子、云、小鸟、落叶、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp } from '@/battle/game/engine/tween'
import type { CritterKind } from '@/battle/game/sprites/scenery'

export interface LadderGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 两架梯子的中心 x（红左蓝右） */
  ladderX: [number, number]
  /** 两根竖杆的间距 */
  railGap: number
  /** 角色身高 */
  size: number
  /** 地面 y（第 0 级：站在地上） */
  groundY: number
  /** 平台顶面 y（第 8 级：站在平台上） */
  platformY: number
  /** 每级的高度 */
  pitch: number
  plankH: number
  /** 平台两端 */
  plankX0: number
  plankX1: number
  /** 两面旗的杆位置 */
  flagX: [number, number]
  flagH: number
  /** 树冠的底边（落叶从这里出发；紧凑版 = 0） */
  canopyBottom: number
}

export function layoutLadder(W: number, H: number, compact: boolean): LadderGeometry {
  const k = W / 150
  const size = compact ? Math.min(30, W * 0.34) : 42 * k
  const groundY = H - (compact ? 8 : 16 * k)
  const platformY = (compact ? 6 : 12 * k) + size * 1.4
  const railGap = size * 0.72
  const ladderX: [number, number] = [W * 0.27, W * 0.73]
  const rail = Math.max(2, 3 * k)
  return {
    W,
    H,
    compact,
    k,
    ladderX,
    railGap,
    size,
    groundY,
    platformY,
    pitch: (groundY - platformY) / 8,
    plankH: Math.max(3, 5 * k),
    plankX0: ladderX[0] - railGap / 2 - rail,
    plankX1: ladderX[1] + railGap / 2 + rail,
    flagX: [W * 0.5 - (compact ? 8 : 13 * k), W * 0.5 + (compact ? 8 : 13 * k)],
    flagH: size * 0.85,
    canopyBottom: compact ? 0 : platformY + size * 0.3,
  }
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

export interface Leaf {
  x: number
  y: number
  vy: number
  sway: number
  rot: number
  color: string
  /** 落地后等多久再从树上飘下来 */
  wait: number
}

export interface LadderOptions {
  reducedMotion: boolean
}

export const CLIMB_TIME = 0.8
export const CLIMB_TIME_REDUCED = 0.3
export const SPRINT_FROM = 2
export const CONFETTI_ROUNDS = 3
export const CONFETTI_GAP = 0.5
/** 赢了之后走到旗子旁边用的时间 */
export const WIN_WALK = 0.5
const LEAVES = 3
const LEAF_COLORS = ['#7ccf62', '#5fb84a', '#ffb347', '#e6a23c']

export class LadderModel {
  geo: LadderGeometry = layoutLadder(150, 700, false)
  climbers: [Racer, Racer]
  readonly kinds: [CritterKind, CritterKind] = ['monkey', 'panda']
  /** 踩到的那级横档往下弯 */
  flex: [Decay, Decay] = [new Decay(0.35), new Decay(0.35)]
  flexRung: [number, number] = [0, 0]
  /** 梯子晃动 */
  shake: [Decay, Decay] = [new Decay(0.45), new Decay(0.45)]
  /** 还差一分：领先方的旗子发光 */
  flagGlow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  flagWave = 0
  clouds: Cloud[] = []
  bird: Bird | null = null
  leaves: Leaf[] = []
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private nextBird = 4
  private confettiLeft = 0
  private confettiT = 0
  private readonly rng: RNG
  private readonly opts: LadderOptions

  constructor(rng: RNG, opts: LadderOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.climbers = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: CLIMB_TIME, moveTimeReduced: CLIMB_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutLadder(W, H, compact)
    for (const c of this.climbers) c.pos.set(this.yFor(c.score, c.mood === 'win'))
    const n = compact ? 1 : 2
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: this.rng.next() * W,
      y: this.geo.platformY + (this.geo.groundY - this.geo.platformY) * (0.15 + i * 0.3 + this.rng.next() * 0.1),
      s: (compact ? 6 : 9) * (0.8 + this.rng.next() * 0.5),
      v: (compact ? 4 : 6) * (0.7 + this.rng.next() * 0.6),
    }))
    this.bird = null
    this.leaves = compact
      ? []
      : Array.from({ length: LEAVES }, (_, i) => ({
          x: W * (0.2 + this.rng.next() * 0.6),
          y: this.geo.canopyBottom + (this.geo.groundY - this.geo.canopyBottom) * this.rng.next(),
          vy: (14 + this.rng.next() * 10) * this.geo.k,
          sway: this.rng.next() * Math.PI * 2,
          rot: this.rng.next() * Math.PI,
          color: LEAF_COLORS[i % LEAF_COLORS.length]!,
          wait: 0,
        }))
  }

  /** 第 i 级横档的 y（0 = 地面，8 = 平台顶面） */
  rungY(i: number): number {
    return this.geo.groundY - i * this.geo.pitch
  }

  /** 得 score 分时脚下的 y；赢了站在平台上 */
  yFor(score: number, won = false): number {
    if (won) return this.geo.platformY
    return this.rungY(clamp(score, 0, this.target) * (8 / this.target))
  }

  climber(team: Team): Racer {
    return this.climbers[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.climbers.forEach((c, i) => {
      const forward = c.apply(s, (score, won) => this.yFor(score, won), this.timing)
      if (forward) {
        this.flexRung[i] = c.score
        this.flex[i]!.kick(1)
        this.shake[i]!.kick(0.6 + c.boost.value * 0.6)
        this.bits(i)
      }
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.confettiLeft = 0
      for (const g of this.flagGlow) g.value = 0
    }
  }

  /** 踩上去时掉下来的碎叶 */
  private bits(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    this.particles.emit({
      x: g.ladderX[i]!,
      y: this.climbers[i]!.pos.target,
      count: 3,
      speed: 30 * g.k,
      angle: Math.PI / 2,
      spread: Math.PI * 0.9,
      life: 0.9,
      size: 2.4 * g.k,
      colors: ['#7ccf62', '#a8743f', '#ffb347'],
      shape: 'flake',
      gravity: 50 * g.k,
      drag: 1.5,
    })
  }

  private confetti(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const colors = team === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
    this.particles.emit({
      x: g.flagX[team === 'red' ? 0 : 1] + (this.rng.next() - 0.5) * g.W * 0.2,
      y: g.platformY - g.size * 0.8,
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
    this.climbers.forEach((c, i) => {
      c.boost.kick(0.5)
      this.shake[i]!.kick(0.5)
    })
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const c of this.climbers) c.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.climber(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak':
        this.climber(e.team).boost.kick(1)
        this.shake[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'lead':
        this.climber(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.flagGlow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        this.confettiLeft = CONFETTI_ROUNDS - 1
        this.confettiT = 0
        this.confetti(e.winner)
        break
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：在梯子上蹦一下、梯子晃一晃 */
  poke(team: Team): void {
    const c = this.climber(team)
    c.poke.kick(1)
    this.shake[team === 'red' ? 0 : 1]!.kick(0.8)
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
    this.flagWave += dt * (this.sprint ? 11 : 4)
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
          this.nextBird -= dt
          if (this.nextBird <= 0) {
            this.nextBird = 7 + this.rng.next() * 5
            this.bird = { x: -20, y: g.platformY + (g.groundY - g.platformY) * (0.15 + this.rng.next() * 0.4), v: (26 + this.rng.next() * 14) * g.k, flap: 0 }
          }
        }
        const fall = this.sprint ? 1.7 : 1
        for (const l of this.leaves) {
          if (l.wait > 0) {
            l.wait -= dt
            if (l.wait <= 0) {
              l.x = g.W * (0.15 + this.rng.next() * 0.7)
              l.y = g.canopyBottom - 4 * g.k
            }
            continue
          }
          l.y += l.vy * fall * dt
          l.sway += dt * 2.2 * fall
          l.rot += dt * 1.5
          l.x += Math.cos(l.sway) * 10 * g.k * dt
          if (l.y > g.groundY) l.wait = 1.5 + this.rng.next() * 4
        }
      }
    }
    if (this.confettiLeft > 0 && this.winner) {
      this.confettiT += dt
      if (this.confettiT >= CONFETTI_GAP) {
        this.confettiT = 0
        this.confettiLeft -= 1
        this.confetti(this.winner)
      }
    }
    this.climbers.forEach((c, i) => {
      c.step(dt, 1.6, animated)
      this.flex[i]!.step(dt)
      this.shake[i]!.step(dt)
      this.flagGlow[i]!.step(dt)
    })
    this.particles.step(dt)
  }

  /** 角色当前的 x：赢了从梯子走到自己那面旗旁边（紧凑版不走） */
  xOf(c: Racer, i: number): number {
    const g = this.geo
    const home = g.ladderX[i]!
    if (c.mood !== 'win' || g.compact) return home + this.shakeX(i)
    const t = Math.min(1, c.moodT / WIN_WALK)
    const dir = i === 0 ? 1 : -1
    const there = g.flagX[i]! - dir * g.size * 0.28
    return home + (there - home) * (1 - Math.pow(1 - t, 3))
  }

  /** 梯子的晃动（角色跟着一起晃） */
  shakeX(i: number): number {
    if (!this.animated) return 0
    return Math.sin(this.time * 38 + i) * this.shake[i]!.value * 2 * this.geo.k
  }

  /** 离地高度（倒数原地蹦、胜利蹦） */
  liftOf(c: Racer): number {
    return this.liftOfBase(c) + c.poke.value * this.geo.size * 0.2
  }

  private liftOfBase(c: Racer): number {
    const g = this.geo
    if (!this.animated) return 0
    if (c.mood === 'ready') return Math.abs(Math.sin(c.hop)) * g.size * 0.12
    if (c.mood === 'win') return Math.abs(Math.sin(c.phase)) * g.size * 0.1
    return 0
  }

  /** 手脚交替 −1…1 */
  climbOf(c: Racer): number {
    return Math.sin(c.phase) * c.moving
  }

  /** 已经举着旗（走到旗子旁边之后） */
  flagOf(c: Racer): number {
    return c.mood === 'win' && (c.moodT >= WIN_WALK || this.geo.compact) ? 1 : 0
  }

  hangOf(c: Racer): number {
    return c.mood === 'lose' ? Math.min(1, c.moodT / 0.8) : 0
  }

  /** 待机时轻轻晃 */
  swayOf(c: Racer): number {
    if (!this.animated || c.mood === 'ready') return 0
    return Math.sin(this.time * 1.3 + (c.team === 'red' ? 0 : 1.7)) * (c.mood === 'lose' ? 0.6 : 0.25)
  }
}
