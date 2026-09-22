/**
 * 种花的纯模型（需求 B36m）：快照 + 事件 + 时间 → 场景数据（两株植物长到第几截、叶子与花苞、开花、洒水壶、蜜蜂、蝴蝶、云、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp, clamp01, ease, Tween } from '@/battle/game/engine/tween'

export interface FlowerGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 两株植物的 x（红左蓝右） */
  plantX: [number, number]
  potW: number
  potH: number
  groundY: number
  /** 盆沿顶边 / 土面（茎从这里长出来） */
  potTop: number
  soilY: number
  /** 花朵半径；8 分时茎尖的 y */
  bloomR: number
  tipMax: number
  /** 每一截的高度 */
  pitch: number
  leafLen: number
}

export function layoutFlower(W: number, H: number, compact: boolean): FlowerGeometry {
  const k = W / 150
  const potW = compact ? Math.min(30, W * 0.3) : 40 * k
  const potH = potW * 0.72
  const groundY = H - (compact ? 6 : 14 * k)
  const potTop = groundY - potH
  const soilY = potTop + potH * 0.12
  const bloomR = compact ? Math.min(14, W * 0.14) : 20 * k
  const tipMax = (compact ? 10 : 34 * k) + bloomR
  return {
    W,
    H,
    compact,
    k,
    plantX: [W * 0.27, W * 0.73],
    potW,
    potH,
    groundY,
    potTop,
    soilY,
    bloomR,
    tipMax,
    pitch: (soilY - tipMax) / 8,
    leafLen: potW * 0.8,
  }
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface Bee {
  x: number
  y: number
  v: number
  phase: number
}

export interface Butterfly {
  x0: number
  y0: number
  phase: number
  r: number
  speed: number
  color: string
}

export interface StemPoint {
  x: number
  y: number
  /** 茎在这一点的方向（弧度，竖直向上 = −π/2） */
  ang: number
}

export interface FlowerOptions {
  reducedMotion: boolean
}

export const GROW_TIME = 0.8
export const GROW_TIME_REDUCED = 0.3
export const SPRINT_FROM = 2
export const SPARKLE_ROUNDS = 3
export const SPARKLE_GAP = 0.5
export const BLOOM_TIME = 0.8
/** 叶子数与花苞出现的那一截 */
export const LEAVES = 6
export const BUD_AT = 6
const BUTTERFLY_COLORS = ['#ffb347', '#a78bfa', '#ff8fb1', '#7cf7c4']

export class FlowerModel {
  geo: FlowerGeometry = layoutFlower(150, 700, false)
  plants: [Racer, Racer]
  /** 洒水壶：浇水的程度 */
  water: [Decay, Decay] = [new Decay(0.45), new Decay(0.45)]
  /** 开花的程度 */
  bloom: [Tween, Tween] = [new Tween(0, ease.outBack), new Tween(0, ease.outBack)]
  private bloomed: [boolean, boolean] = [false, false]
  /** 还差一分：花苞一亮一亮 */
  budGlow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  butterflies: Butterfly[] = []
  bee: Bee | null = null
  clouds: Cloud[] = []
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private dropT: [number, number] = [0, 0]
  private nextBee = 4
  private sparkleLeft = 0
  private sparkleT = 0
  private readonly rng: RNG
  private readonly opts: FlowerOptions

  constructor(rng: RNG, opts: FlowerOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.plants = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: GROW_TIME, moveTimeReduced: GROW_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutFlower(W, H, compact)
    for (const p of this.plants) p.pos.set(this.stageFor(p.score, p.mood === 'win'))
    const n = compact ? 0 : 2
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 30,
      y: this.geo.tipMax * (0.15 + this.rng.next() * 0.35),
      s: 7 * (0.8 + this.rng.next() * 0.5),
      v: 5 * (0.7 + this.rng.next() * 0.6),
    }))
    this.bee = null
    this.butterflies = []
  }

  /** 得 score 分时长到第几截（0…8，位置单位就是「截」） */
  stageFor(score: number, won = false): number {
    if (won) return 8
    return clamp(score, 0, this.target) * (8 / this.target)
  }

  plant(team: Team): Racer {
    return this.plants[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.plants.forEach((p, i) => {
      const forward = p.apply(s, (score, won) => this.stageFor(score, won), this.timing)
      if (forward) {
        this.water[i]!.kick(1 + p.boost.value * 0.5)
        this.drops(i, 3)
      }
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      for (const g of this.budGlow) g.value = 0
    }
    if (s.phase !== 'ended') {
      this.sparkleLeft = 0
      this.butterflies = []
      for (let i = 0; i < 2; i++) {
        if (this.bloomed[i]) {
          this.bloomed[i] = false
          this.bloom[i]!.set(0)
        }
      }
    } else if (s.winner) {
      const i = s.winner === 'red' ? 0 : 1
      if (this.bloomed[1 - i]) {
        this.bloomed[1 - i] = false
        this.bloom[1 - i]!.set(0)
        this.butterflies = []
      }
      if (!this.bloomed[i] && this.plants[i]!.pos.done) this.openBloom(i)
    }
  }

  /** 洒水壶浇下来的水滴 */
  private drops(i: number, n: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const can = this.canPos(i)
    this.particles.emit({
      x: can.x - can.dir * g.potW * 0.5,
      y: can.y - g.potW * 0.25,
      count: n,
      speed: 30 * g.k,
      angle: Math.PI / 2,
      spread: Math.PI * 0.5,
      life: 0.7,
      size: 2.2 * g.k,
      colors: ['#7fc8ff', '#bfe6ff', '#ffffff'],
      gravity: 320 * g.k,
      drag: 0.5,
    })
  }

  private sparkles(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const tip = this.tip(i)
    this.particles.emit({
      x: tip.x,
      y: tip.y,
      count: 18,
      speed: 90 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.6,
      life: 1.3,
      size: 3 * g.k,
      colors: ['#ffd54a', '#ffffff', '#ffe9a0', this.plants[i]!.team === 'red' ? '#ffb3b3' : '#a9d3ff'],
      shape: 'flake',
      gravity: 40 * g.k,
      drag: 1.4,
    })
  }

  private openBloom(i: number): void {
    this.bloomed[i] = true
    this.bloom[i]!.to(1, this.animated ? BLOOM_TIME : 0.2)
    this.budGlow[i]!.kick(1)
    this.sparkles(i)
    this.sparkleLeft = SPARKLE_ROUNDS - 1
    this.sparkleT = 0
    const g = this.geo
    const tip = this.tip(i)
    this.butterflies = Array.from({ length: 2 }, (_, j) => ({
      x0: tip.x,
      y0: tip.y - g.bloomR * 0.4,
      phase: this.rng.next() * Math.PI * 2 + j * 2,
      r: g.bloomR * (1.6 + j * 0.5),
      speed: 1.1 + this.rng.next() * 0.6,
      color: BUTTERFLY_COLORS[(i * 2 + j) % BUTTERFLY_COLORS.length]!,
    }))
  }

  private go(): void {
    this.plants.forEach((p, i) => {
      p.boost.kick(0.5)
      this.water[i]!.kick(0.8)
      this.drops(i, 4)
    })
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const p of this.plants) p.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.plant(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak': {
        const i = e.team === 'red' ? 0 : 1
        this.plant(e.team).boost.kick(1)
        this.water[i]!.kick(1.5)
        break
      }
      case 'lead':
        this.plant(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.budGlow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        // 开花等胜方最后一截长完（位移结束）再开，见 step
        break
      default:
        break
    }
  }

  /** 点一下（B59）：浇一下水、花盆蹦一下 */
  poke(team: Team): void {
    const p = this.plant(team)
    p.poke.kick(1)
    this.water[team === 'red' ? 0 : 1]!.kick(1.2)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 1) this.bee = null
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
        if (this.bee) {
          this.bee.x += this.bee.v * dt
          this.bee.phase += dt * 3
          if (this.bee.x < -20 || this.bee.x > g.W + 20) this.bee = null
        } else {
          this.nextBee -= dt * (this.sprint ? 2 : 1)
          if (this.nextBee <= 0) {
            this.nextBee = 6 + this.rng.next() * 5
            const dir = this.rng.next() < 0.5 ? 1 : -1
            this.bee = { x: dir > 0 ? -15 : g.W + 15, y: g.tipMax + (g.potTop - g.tipMax) * (0.1 + this.rng.next() * 0.5), v: dir * (30 + this.rng.next() * 15) * g.k, phase: 0 }
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
    this.plants.forEach((p, i) => {
      p.step(dt, 1.5, animated)
      const w = this.water[i]!.step(dt)
      this.bloom[i]!.step(dt)
      this.budGlow[i]!.step(dt)
      this.dropT[i] = this.dropT[i]! + dt
      if (w > 0.25 && this.dropT[i]! > 0.08) {
        this.dropT[i] = 0
        this.drops(i, 1 + (w > 1 ? 1 : 0))
      }
      if (p.mood === 'win' && !this.bloomed[i] && p.pos.done) this.openBloom(i)
    })
    this.particles.step(dt)
  }

  /** 茎的高度（px） */
  stemH(p: Racer): number {
    return Math.max(0, p.pos.value) * this.geo.pitch
  }

  /** 摇摆：越高摆得越明显（茎尖的横向偏移 = sway × 茎高） */
  swayOf(p: Racer, i: number): number {
    if (!this.animated) return 0
    let s = Math.sin(this.time * 1.2 + i * 1.9) * (this.sprint ? 0.09 : 0.05)
    if (p.mood === 'win') s += Math.sin(this.time * 2.5) * 0.06
    s += Math.sin(p.moodT * 30) * 0.06 * p.look.value
    return s
  }

  wiltOf(p: Racer): number {
    return p.mood === 'lose' ? Math.min(1, p.moodT / 1.5) : 0
  }

  /** 花盆离地（倒数蹦） */
  liftOf(p: Racer): number {
    return this.liftOfBase(p) + p.poke.value * this.geo.potH * 0.25
  }

  private liftOfBase(p: Racer): number {
    if (!this.animated || p.mood !== 'ready') return 0
    return Math.abs(Math.sin(p.hop)) * this.geo.potH * 0.12
  }

  /** 小芽的晃动（还没长起来的时候） */
  wiggleOf(p: Racer): number {
    return this.animated ? Math.sin(p.hop) * 0.15 : 0
  }

  /** 茎上离土面 h 高的那一点（茎是二次曲线：土面 → 控制点 → 茎尖；输了茎尖垂下来） */
  stemPoint(i: number, h: number): StemPoint {
    const g = this.geo
    const p = this.plants[i]!
    const H = this.stemH(p)
    const x0 = g.plantX[i]!
    const y0 = g.soilY - this.liftOf(p)
    if (H < 0.5) return { x: x0, y: y0, ang: -Math.PI / 2 }
    const swayX = this.swayOf(p, i) * H
    const wilt = this.wiltOf(p)
    const dir = i === 0 ? 1 : -1
    const x1 = x0 + swayX + wilt * g.potW * 0.35 * dir
    const y1 = y0 - H + wilt * g.pitch * 0.9
    const cx = x0 + swayX * 0.25
    const cy = y0 - H * 0.55
    const t = clamp01(h / H)
    const u = 1 - t
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1
    const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx)
    const dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy)
    return { x, y, ang: Math.atan2(dy, dx) }
  }

  /** 茎的三个点（画二次曲线用） */
  stemCurve(i: number): { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number } {
    const g = this.geo
    const p = this.plants[i]!
    const H = this.stemH(p)
    const x0 = g.plantX[i]!
    const y0 = g.soilY - this.liftOf(p)
    const swayX = this.swayOf(p, i) * H
    const wilt = this.wiltOf(p)
    const dir = i === 0 ? 1 : -1
    return { x0, y0, cx: x0 + swayX * 0.25, cy: y0 - H * 0.55, x1: x0 + swayX + wilt * g.potW * 0.35 * dir, y1: y0 - H + wilt * g.pitch * 0.9 }
  }

  tip(i: number): StemPoint {
    return this.stemPoint(i, this.stemH(this.plants[i]!))
  }

  /** 第 k 片叶子（1…6）弹出来的程度：长过第 k 截就有 */
  leafScale(p: Racer, k: number): number {
    const s = clamp01(p.pos.value - (k - 1))
    if (s <= 0) return 0
    return s >= 1 ? 1 : ease.outBack(s)
  }

  /** 第 k 片叶子长在离土面多高 */
  leafH(k: number): number {
    return this.geo.pitch * (k - 0.35)
  }

  /** 花苞：第 6 截之后鼓出来，开了花就没了 */
  budScale(p: Racer, i: number): number {
    return clamp01(p.pos.value - BUD_AT) * (1 - this.bloom[i]!.value)
  }

  /** 洒水壶的位置与朝向（红队从右边浇、蓝队从左边浇） */
  canPos(i: number): { x: number; y: number; dir: 1 | -1 } {
    const g = this.geo
    const dir: 1 | -1 = i === 0 ? 1 : -1
    const tip = this.tip(i)
    return { x: g.plantX[i]! + dir * g.potW * 0.72, y: Math.min(tip.y, g.soilY - g.pitch) - g.potW * 0.45, dir }
  }

  /** 蝴蝶此刻的位置与扇翅相位 */
  butterflyAt(b: Butterfly): { x: number; y: number; flap: number } {
    const t = this.time
    return { x: b.x0 + Math.cos(t * b.speed + b.phase) * b.r, y: b.y0 + Math.sin(t * b.speed * 1.7 + b.phase) * b.r * 0.5, flap: t * 14 + b.phase }
  }

  /** 蜜蜂上下飞的偏移 */
  beeY(): number {
    return this.bee ? this.bee.y + Math.sin(this.bee.phase) * 4 * this.geo.k : 0
  }
}

export { advancePhase }
