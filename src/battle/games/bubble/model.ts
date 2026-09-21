/**
 * 吹泡泡的纯模型（需求 B36o）：快照 + 事件 + 时间 → 场景数据（两颗泡泡的大小与高度、颤动、彩虹、吹的动作、空中的小泡泡、星星、云、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import type { CritterKind } from '@/battle/game/sprites/scenery'

export interface BubbleGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 两颗泡泡 / 两只角色的 x（红左蓝右） */
  laneX: [number, number]
  /** 角色身高 */
  size: number
  groundY: number
  /** 泡泡棒圈心（泡泡从这里吹出来） */
  wandY: number
  /** 顶上那排星星的 y 与「顶」（泡泡顶碰到的线） */
  starsY: number
  topY: number
  /** 泡泡半径：0 分 / 8 分 */
  rMin: number
  rMax: number
  /** 泡泡心的 y：0 分 / 8 分 */
  y0: number
  y8: number
}

export function layoutBubble(W: number, H: number, compact: boolean): BubbleGeometry {
  const k = W / 150
  const size = compact ? Math.min(26, W * 0.3) : 36 * k
  const groundY = H - (compact ? 6 : 14 * k)
  const wandY = groundY - size * 0.78
  const starsY = compact ? 8 : 20 * k
  const topY = starsY + (compact ? 6 : 9 * k)
  const rMin = compact ? W * 0.07 : 9 * k
  const rMax = W * 0.24
  return {
    W,
    H,
    compact,
    k,
    laneX: [W * 0.27, W * 0.73],
    size,
    groundY,
    wandY,
    starsY,
    topY,
    rMin,
    rMax,
    y0: wandY - rMin - 2 * k,
    y8: topY + rMax,
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

export interface Mote {
  x: number
  y: number
  r: number
  v: number
  wob: number
}

export interface BubbleOptions {
  reducedMotion: boolean
}

export const GROW_TIME = 0.8
export const GROW_TIME_REDUCED = 0.3
export const SPRINT_FROM = 2
export const SPARKLE_ROUNDS = 3
export const SPARKLE_GAP = 0.5
export const RAINBOW_TIME = 0.8
const MOTES = 6

export class BubbleModel {
  geo: BubbleGeometry = layoutBubble(150, 700, false)
  blowers: [Racer, Racer]
  readonly kinds: [CritterKind, CritterKind] = ['bear', 'panda']
  /** 吹的那一口：鼓腮帮子 + 小泡泡 */
  puff: [Decay, Decay] = [new Decay(0.4), new Decay(0.4)]
  /** 泡泡颤动 */
  wobble: [Decay, Decay] = [new Decay(0.5), new Decay(0.5)]
  /** 变成彩虹泡的程度 */
  rainbow: [Tween, Tween] = [new Tween(0, ease.outCubic), new Tween(0, ease.outCubic)]
  private rainbowed: [boolean, boolean] = [false, false]
  /** 还差一分：那一边的星星一亮一亮 */
  starGlow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  motes: Mote[] = []
  bird: Bird | null = null
  clouds: Cloud[] = []
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private puffT: [number, number] = [0, 0]
  private nextBird = 4
  private sparkleLeft = 0
  private sparkleT = 0
  private readonly rng: RNG
  private readonly opts: BubbleOptions

  constructor(rng: RNG, opts: BubbleOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.blowers = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: GROW_TIME, moveTimeReduced: GROW_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutBubble(W, H, compact)
    for (const b of this.blowers) b.pos.set(this.stageFor(b.score, b.mood === 'win'))
    const n = compact ? 0 : 2
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 30,
      y: this.geo.topY + H * (0.04 + i * 0.05),
      s: 7 * (0.8 + this.rng.next() * 0.5),
      v: 5 * (0.7 + this.rng.next() * 0.6),
    }))
    this.motes = compact ? [] : Array.from({ length: MOTES }, () => this.newMote(true))
    this.bird = null
  }

  private newMote(anywhere: boolean): Mote {
    const g = this.geo
    return {
      x: g.W * (0.06 + this.rng.next() * 0.88),
      y: anywhere ? g.topY + (g.groundY - g.topY) * this.rng.next() : g.groundY - 4 * g.k,
      r: (1.4 + this.rng.next() * 1.8) * g.k,
      v: (10 + this.rng.next() * 10) * g.k,
      wob: this.rng.next() * Math.PI * 2,
    }
  }

  /** 得 score 分时泡泡「大了几圈」（0…8） */
  stageFor(score: number, won = false): number {
    if (won) return 8
    return clamp(score, 0, this.target) * (8 / this.target)
  }

  blower(team: Team): Racer {
    return this.blowers[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.blowers.forEach((b, i) => {
      const forward = b.apply(s, (score, won) => this.stageFor(score, won), this.timing)
      if (forward) {
        this.puff[i]!.kick(1 + b.boost.value * 0.5)
        this.wobble[i]!.kick(1)
        this.tiny(i, 3)
      }
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      for (const g of this.starGlow) g.value = 0
    }
    if (s.phase !== 'ended') {
      this.sparkleLeft = 0
      for (let i = 0; i < 2; i++) {
        if (this.rainbowed[i]) {
          this.rainbowed[i] = false
          this.rainbow[i]!.set(0)
        }
      }
    } else if (s.winner) {
      const i = s.winner === 'red' ? 0 : 1
      if (this.rainbowed[1 - i]) {
        this.rainbowed[1 - i] = false
        this.rainbow[1 - i]!.set(0)
      }
      if (!this.rainbowed[i] && this.blowers[i]!.pos.done) this.turnRainbow(i)
    }
  }

  /** 泡泡棒上冒出的小泡泡（往上飘） */
  private tiny(i: number, n: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    this.particles.emit({
      x: g.laneX[i]!,
      y: g.wandY,
      count: n,
      speed: 30 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 0.9,
      life: 1.1,
      size: 2.2 * g.k,
      colors: ['rgba(255,255,255,0.85)', '#d5f1ff', '#ffd6f2'],
      gravity: -35 * g.k,
      drag: 1.2,
    })
  }

  private sparkles(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const b = this.blowers[i]!
    this.particles.emit({
      x: g.laneX[i]!,
      y: this.cyOf(b),
      count: 18,
      speed: 110 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 2,
      life: 1.3,
      size: 3 * g.k,
      colors: ['#ffe27a', '#ffffff', '#ff9ad5', '#8fe8ff', '#c9a3ff'],
      shape: 'flake',
      gravity: 30 * g.k,
      drag: 1.4,
    })
  }

  private turnRainbow(i: number): void {
    this.rainbowed[i] = true
    this.rainbow[i]!.to(1, this.animated ? RAINBOW_TIME : 0.2)
    this.starGlow[i]!.kick(1)
    this.wobble[i]!.kick(1)
    this.sparkles(i)
    this.sparkleLeft = SPARKLE_ROUNDS - 1
    this.sparkleT = 0
  }

  private go(): void {
    this.blowers.forEach((b, i) => {
      b.boost.kick(0.5)
      this.puff[i]!.kick(1)
      this.tiny(i, 4)
    })
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const b of this.blowers) b.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.blower(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak': {
        const i = e.team === 'red' ? 0 : 1
        this.blower(e.team).boost.kick(1)
        this.puff[i]!.kick(1.5)
        this.wobble[i]!.kick(1.5)
        break
      }
      case 'lead':
        this.blower(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.starGlow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        // 彩虹泡等胜方最后那一圈吹完（位移结束）再变，见 step
        break
      default:
        break
    }
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
        if (c.x - c.s * 1.2 > g.W) c.x = -c.s * 1.5
      }
      if (!g.compact) {
        for (let i = 0; i < this.motes.length; i++) {
          const m = this.motes[i]!
          m.y -= m.v * dt * (this.sprint ? 1.6 : 1)
          m.wob += dt * 2.5
          if (m.y < g.topY + m.r) this.motes[i] = this.newMote(false)
        }
        if (this.bird) {
          this.bird.x += this.bird.v * dt
          this.bird.flap = advancePhase(this.bird.flap, dt, 4)
          if (this.bird.x > g.W + 20) this.bird = null
        } else {
          this.nextBird -= dt
          if (this.nextBird <= 0) {
            this.nextBird = 7 + this.rng.next() * 5
            this.bird = { x: -20, y: g.topY + (g.groundY - g.topY) * (0.1 + this.rng.next() * 0.3), v: (26 + this.rng.next() * 14) * g.k, flap: 0 }
          }
        }
      }
    }
    if (this.sparkleLeft > 0 && this.winner) {
      this.sparkleT += dt
      if (this.sparkleT >= SPARKLE_GAP) {
        this.sparkleT = 0
        this.sparkleLeft -= 1
        this.sparkles(this.winner === 'red' ? 0 : 1)
      }
    }
    this.blowers.forEach((b, i) => {
      b.step(dt, 1.5, animated)
      const p = this.puff[i]!.step(dt)
      this.wobble[i]!.step(dt)
      this.rainbow[i]!.step(dt)
      this.starGlow[i]!.step(dt)
      this.puffT[i] = this.puffT[i]! + dt
      if (p > 0.3 && this.puffT[i]! > 0.12) {
        this.puffT[i] = 0
        this.tiny(i, 1 + (p > 1 ? 1 : 0))
      }
      if (b.mood === 'win' && !this.rainbowed[i] && b.pos.done) this.turnRainbow(i)
    })
    this.particles.step(dt)
  }

  /** 泡泡半径 */
  rOf(b: Racer): number {
    const g = this.geo
    return g.rMin + ((g.rMax - g.rMin) * clamp(b.pos.value, 0, 8)) / 8
  }

  /** 泡泡心的 y（不含飘动） */
  cyOf(b: Racer): number {
    const g = this.geo
    return g.y0 + ((g.y8 - g.y0) * clamp(b.pos.value, 0, 8)) / 8
  }

  /** 飘动：待机时轻轻上下漂 */
  driftOf(b: Racer, i: number): number {
    if (!this.animated || b.mood === 'ready') return 0
    return Math.sin(this.time * 1.4 + i * 2) * this.geo.k * (this.sprint ? 3 : 2)
  }

  /** 颤动的拉伸（sx, sy） */
  wobbleOf(i: number): [number, number] {
    if (!this.animated) return [1, 1]
    const w = this.wobble[i]!.value * Math.sin(this.time * 22 + i) * 0.12 + (this.sprint ? Math.sin(this.time * 6 + i) * 0.03 : 0)
    return [1 + w, 1 - w]
  }

  /** 彩虹泡慢慢转 */
  rotOf(): number {
    return this.animated ? this.time * 0.6 : 0
  }

  liftOf(b: Racer): number {
    const g = this.geo
    if (!this.animated) return 0
    if (b.mood === 'ready') return Math.abs(Math.sin(b.hop)) * g.size * 0.12
    if (b.mood === 'win') return Math.abs(Math.sin(b.phase)) * g.size * 0.1
    return 0
  }

  /** 输了又吹出的那颗小泡泡：在泡泡棒上方慢慢飘 */
  loserBubble(b: Racer): { y: number; r: number } | null {
    if (b.mood !== 'lose' || b.moodT < 1) return null
    const g = this.geo
    const t = (b.moodT - 1) % 3
    return { y: g.wandY - g.rMin * 0.8 - t * 8 * g.k, r: g.rMin * (0.5 + Math.min(1, t) * 0.2) }
  }
}
