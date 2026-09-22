/**
 * 摘果子的纯模型（需求 B36p）：快照 + 事件 + 时间 → 场景数据（树上 / 落下 / 篮子里的果子、树冠晃动、两只角色的动作、云、小鸟、落叶、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import type { FruitKind } from '@/battle/game/sprites/fruit'
import type { CritterKind } from '@/battle/game/sprites/scenery'

export interface FruitGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 角色身高、果子半径 */
  size: number
  fruitR: number
  groundY: number
  /** 树冠中心与半径（宽 / 高）、树干 */
  canopyX: number
  canopyY: number
  canopyW: number
  canopyH: number
  trunkW: number
  /** 两只篮子的篮口中心（红左蓝右）与尺寸 */
  basketX: [number, number]
  basketTop: number
  basketW: number
  basketH: number
  /** 树上 8 个果子的位置（每队一组） */
  treeSlots: [{ x: number; y: number }[], { x: number; y: number }[]]
  /** 篮子里 8 个果子堆起来的位置（相对篮口中心） */
  pileSlots: { dx: number; dy: number }[]
}

export function layoutFruit(W: number, H: number, compact: boolean): FruitGeometry {
  const k = W / 150
  const size = compact ? Math.min(24, W * 0.28) : 34 * k
  const fruitR = compact ? Math.max(3, W * 0.036) : 7 * k
  const groundY = H - (compact ? 6 : 14 * k)
  const basketW = compact ? W * 0.3 : 44 * k
  const basketH = basketW * 0.62
  const basketTop = groundY - basketH
  const canopyW = W * 0.46
  const canopyH = compact ? H * 0.26 : Math.min(H * 0.4, W * 1.5)
  const canopyY = (compact ? 8 : 16 * k) + canopyH * 0.62
  const slots = (dir: 1 | -1): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = []
    for (let i = 0; i < 8; i++) {
      const col = i % 2
      const row = Math.floor(i / 2)
      out.push({ x: W * 0.5 + dir * canopyW * (0.28 + col * 0.42) * (row % 2 ? 0.92 : 1), y: canopyY - canopyH * 0.55 + (canopyH * 1.15 * (row + 0.5)) / 4 })
    }
    return out
  }
  const pile: { dx: number; dy: number }[] = [
    { dx: -0.3, dy: 0.05 },
    { dx: -0.1, dy: 0.08 },
    { dx: 0.1, dy: 0.08 },
    { dx: 0.3, dy: 0.05 },
    { dx: -0.2, dy: -0.2 },
    { dx: 0, dy: -0.22 },
    { dx: 0.2, dy: -0.2 },
    { dx: 0, dy: -0.5 },
  ]
  return {
    W,
    H,
    compact,
    k,
    size,
    fruitR,
    groundY,
    canopyX: W * 0.5,
    canopyY,
    canopyW,
    canopyH,
    trunkW: W * 0.11,
    basketX: [W * 0.24, W * 0.76],
    basketTop,
    basketW,
    basketH,
    treeSlots: [slots(-1), slots(1)],
    pileSlots: pile.map((p) => ({ dx: p.dx * basketW, dy: p.dy * basketH })),
  }
}

export interface Fruit {
  /** tree 挂在树上 / falling 往下掉（delay 走完才开始）/ basket 在篮子里 */
  state: 'tree' | 'falling' | 'basket'
  x: Tween
  y: Tween
  delay: number
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
  /** 落到树上（赢了） */
  perch: boolean
}

export interface Leaf {
  x: number
  y: number
  vy: number
  sway: number
  rot: number
  wait: number
}

export interface FruitOptions {
  reducedMotion: boolean
}

export const FALL_TIME = 0.8
export const FALL_TIME_REDUCED = 0.3
export const STAGGER = 0.14
export const SPRINT_FROM = 2
export const SPARKLE_ROUNDS = 3
export const SPARKLE_GAP = 0.5
const LEAVES = 3

export class FruitModel {
  geo: FruitGeometry = layoutFruit(150, 700, false)
  pickers: [Racer, Racer]
  readonly kinds: [CritterKind, CritterKind] = ['pig', 'monkey']
  readonly fruitKinds: [FruitKind, FruitKind] = ['apple', 'plum']
  fruits: [Fruit[], Fruit[]] = [[], []]
  /** 树冠晃动 */
  shake = new Decay(0.45)
  /** 跳起来够果子 */
  jump: [Decay, Decay] = [new Decay(0.3), new Decay(0.3)]
  /** 篮子颠一下 */
  bump: [Decay, Decay] = [new Decay(0.25), new Decay(0.25)]
  /** 还差一分 / 装满：篮子发光 */
  basketGlow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  private celebrated: [boolean, boolean] = [false, false]
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
  private sparkleLeft = 0
  private sparkleT = 0
  private readonly rng: RNG
  private readonly opts: FruitOptions

  constructor(rng: RNG, opts: FruitOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.pickers = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: FALL_TIME, moveTimeReduced: FALL_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutFruit(W, H, compact)
    const g = this.geo
    this.pickers.forEach((p, i) => {
      p.pos.set(p.score)
      // 按当前分数直接摆好：前 score 个在篮子里，其余在树上
      this.fruits[i] = g.treeSlots[i]!.map((slot, n) => {
        const inBasket = n < p.score
        const to = this.pileAt(i, n)
        return {
          state: inBasket ? 'basket' : 'tree',
          x: new Tween(inBasket ? to.x : slot.x, ease.outCubic),
          y: new Tween(inBasket ? to.y : slot.y, ease.outBounce),
          delay: 0,
        }
      })
    })
    const n = compact ? 0 : 2
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 30,
      y: H * (0.03 + i * 0.03),
      s: 6 * (0.8 + this.rng.next() * 0.5),
      v: 5 * (0.7 + this.rng.next() * 0.6),
    }))
    this.bird = null
    this.leaves = compact
      ? []
      : Array.from({ length: LEAVES }, () => ({
          x: W * (0.2 + this.rng.next() * 0.6),
          y: g.canopyY + (g.groundY - g.canopyY) * this.rng.next(),
          vy: (14 + this.rng.next() * 10) * g.k,
          sway: this.rng.next() * Math.PI * 2,
          rot: this.rng.next() * Math.PI,
          wait: 0,
        }))
  }

  /** 篮子里第 n 个果子的位置 */
  pileAt(i: number, n: number): { x: number; y: number } {
    const g = this.geo
    const s = g.pileSlots[Math.min(n, g.pileSlots.length - 1)]!
    return { x: g.basketX[i]! + s.dx, y: g.basketTop + s.dy }
  }

  picker(team: Team): Racer {
    return this.pickers[team === 'red' ? 0 : 1]
  }

  /** 篮子里已经落稳的果子数 */
  landed(i: number): number {
    return this.fruits[i]!.filter((f) => f.state === 'basket' && f.y.done).length
  }

  /** 还挂在树上的果子数 */
  onTree(i: number): number {
    return this.fruits[i]!.filter((f) => f.state === 'tree').length
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    const scores = [s.red, s.blue]
    this.pickers.forEach((p, i) => {
      const forward = p.apply(s, (score) => score, this.timing)
      const want = Math.min(8, Math.round(clamp(scores[i]!, 0, this.target) * (8 / this.target)))
      if (s.phase === 'lobby' || s.phase === 'countdown' || want < this.fruits[i]!.filter((f) => f.state !== 'tree').length) this.restore(i)
      let k = 0
      for (let n = 0; n < want; n++) {
        const f = this.fruits[i]![n]!
        if (f.state !== 'tree') continue
        this.drop(i, n, k * STAGGER)
        k++
      }
      if (forward) {
        this.jump[i]!.kick(1)
        this.shake.kick(0.6 + p.boost.value * 0.5)
        this.leafBits(i, 2)
      }
      if (p.mood === 'win' && !this.celebrated[i]) {
        this.celebrated[i] = true
        this.basketGlow[i]!.kick(1)
        this.sparkles(i)
        this.sparkleLeft = SPARKLE_ROUNDS - 1
        this.sparkleT = 0
        if (this.bird) this.bird.perch = true
      }
      if (p.mood !== 'win') this.celebrated[i] = false
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.sparkleLeft = 0
      for (const g of this.basketGlow) g.value = 0
    }
  }

  /** 把果子都挂回树上 */
  private restore(i: number): void {
    const g = this.geo
    this.fruits[i]!.forEach((f, n) => {
      const slot = g.treeSlots[i]![n]!
      f.state = 'tree'
      f.x.set(slot.x)
      f.y.set(slot.y)
      f.delay = 0
    })
  }

  /** 第 n 个果子掉进篮子 */
  private drop(i: number, n: number, delay: number): void {
    const f = this.fruits[i]![n]!
    const to = this.pileAt(i, n)
    f.state = 'falling'
    f.delay = this.animated ? delay : 0
    const dur = this.animated ? FALL_TIME : FALL_TIME_REDUCED
    if (f.delay <= 0) {
      f.x.to(to.x, dur, ease.outCubic)
      f.y.to(to.y, dur, this.animated ? ease.outBounce : ease.linear)
    } else {
      // 等 delay 走完再开始落（step 里）
      f.x.set(f.x.value)
      f.y.set(f.y.value)
    }
  }

  private leafBits(i: number, n: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const slot = g.treeSlots[i]![Math.min(7, Math.max(0, this.pickers[i]!.score - 1))]!
    this.particles.emit({
      x: slot.x,
      y: slot.y,
      count: n,
      speed: 25 * g.k,
      angle: Math.PI / 2,
      spread: Math.PI * 0.8,
      life: 1.2,
      size: 2.6 * g.k,
      colors: ['#7ccf62', '#5fb84a', '#a8dd8b'],
      shape: 'flake',
      gravity: 40 * g.k,
      drag: 1.6,
    })
  }

  private sparkles(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    this.particles.emit({
      x: g.basketX[i]!,
      y: g.basketTop - g.basketH * 0.3,
      count: 18,
      speed: 100 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.2,
      life: 1.4,
      size: 3.2 * g.k,
      colors: ['#ffe27a', '#ffffff', '#ff9b9b', '#8fc3ff', '#3ecf8e'],
      shape: 'flake',
      gravity: 60 * g.k,
      drag: 1.3,
    })
  }

  private go(): void {
    this.shake.kick(0.8)
    for (const j of this.jump) j.kick(0.8)
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const p of this.pickers) p.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.picker(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak':
        this.picker(e.team).boost.kick(1)
        this.shake.kick(1.2)
        break
      case 'lead':
        this.picker(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.basketGlow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        // 光芒、亮片、举篮在 setState 里跟着胜方的心情放（晚进来的观战者也有）
        break
      default:
        break
    }
  }

  /** 点一下（B59）：蹦一下、树晃一晃 */
  poke(team: Team): void {
    this.jump[team === 'red' ? 0 : 1]!.kick(1)
    this.shake.kick(0.8)
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
        if (this.bird) {
          const b = this.bird
          if (b.perch) {
            const tx = g.canopyX + g.canopyW * 0.25
            const ty = g.canopyY - g.canopyH * 0.95
            b.x += (tx - b.x) * Math.min(1, dt * 3)
            b.y += (ty - b.y) * Math.min(1, dt * 3)
            b.flap = advancePhase(b.flap, dt, Math.abs(tx - b.x) > 2 ? 4 : 0.6)
          } else {
            b.x += b.v * dt
            b.flap = advancePhase(b.flap, dt, 4)
            if (b.x > g.W + 20) this.bird = null
          }
        } else {
          this.nextBird -= dt
          if (this.nextBird <= 0) {
            this.nextBird = 7 + this.rng.next() * 5
            this.bird = { x: -20, y: g.canopyY - g.canopyH * (0.6 + this.rng.next() * 0.5), v: (26 + this.rng.next() * 14) * g.k, flap: 0, perch: this.winner !== null }
          }
        }
        const fall = this.sprint ? 1.7 : 1
        for (const l of this.leaves) {
          if (l.wait > 0) {
            l.wait -= dt
            if (l.wait <= 0) {
              l.x = g.canopyX + (this.rng.next() - 0.5) * g.canopyW * 1.6
              l.y = g.canopyY + g.canopyH * 0.5
            }
            continue
          }
          l.y += l.vy * fall * dt
          l.sway += dt * 2.2 * fall
          l.rot += dt * 1.5
          l.x += Math.cos(l.sway) * 10 * g.k * dt
          if (l.y > g.groundY) l.wait = 2 + this.rng.next() * 4
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
    this.shake.step(dt)
    this.pickers.forEach((p, i) => {
      p.step(dt, 1.5, animated)
      this.jump[i]!.step(dt)
      this.bump[i]!.step(dt)
      this.basketGlow[i]!.step(dt)
      this.fruits[i]!.forEach((f, n) => {
        if (f.state !== 'falling') return
        if (f.delay > 0) {
          f.delay -= dt
          if (f.delay <= 0) {
            const to = this.pileAt(i, n)
            const dur = animated ? FALL_TIME : FALL_TIME_REDUCED
            f.x.to(to.x, dur, ease.outCubic)
            f.y.to(to.y, dur, animated ? ease.outBounce : ease.linear)
          }
          return
        }
        f.x.step(dt)
        f.y.step(dt)
        if (f.y.done) {
          f.state = 'basket'
          this.bump[i]!.kick(1)
        }
      })
    })
    this.particles.step(dt)
  }

  /** 树冠横向晃动（px） */
  swayOf(): number {
    if (!this.animated) return 0
    return Math.sin(this.time * 18) * this.shake.value * 4 * this.geo.k + (this.sprint ? Math.sin(this.time * 2.5) * 2 * this.geo.k : 0)
  }

  /** 角色离地：倒数蹦、够果子跳、胜利蹦 */
  liftOf(p: Racer, i: number): number {
    const g = this.geo
    if (!this.animated) return 0
    if (p.mood === 'ready') return Math.abs(Math.sin(p.hop)) * g.size * 0.12
    if (p.mood === 'win') return Math.abs(Math.sin(p.phase)) * g.size * 0.1
    return this.jump[i]!.value * g.size * 0.35
  }

  /** 篮子颠一下 / 举起来（赢了） */
  basketLift(p: Racer, i: number): number {
    const g = this.geo
    if (p.mood === 'win') return Math.min(1, p.moodT / 0.5) * g.size * 0.45 + this.liftOf(p, i)
    if (!this.animated) return 0
    return this.bump[i]!.value * g.basketH * 0.12
  }

  scratchOf(p: Racer): number {
    return p.mood === 'lose' ? Math.min(1, p.moodT / 0.8) : 0
  }

  /** 输了：一片叶子落到头上 */
  leafOnHead(p: Racer): number {
    return p.mood === 'lose' ? clamp((p.moodT - 1) / 0.6, 0, 1) : 0
  }
}
