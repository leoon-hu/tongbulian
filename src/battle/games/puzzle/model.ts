/**
 * 拼图的纯模型（需求 B36r）：快照 + 事件 + 时间 → 场景数据（每块拼图在外面 / 飞进来 / 已拼上、扣上的亮圈、整图亮起、角色动作、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import { knobsOf, type Knobs, type PictureKind } from '@/battle/game/sprites/puzzle'
import type { CritterKind } from '@/battle/game/sprites/scenery'

export const ROWS = 4
export const COLS = 2

export interface PuzzleGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 板的左上角（红上蓝下）与尺寸、每块的尺寸、边框 */
  boardX: number
  boardTop: [number, number]
  boardW: number
  boardH: number
  pieceW: number
  pieceH: number
  border: number
  /** 角色身高与脚下的位置（板下面；紧凑版没有角色，size = 0） */
  size: number
  kidX: [number, number]
  kidY: [number, number]
}

export function layoutPuzzle(W: number, H: number, compact: boolean): PuzzleGeometry {
  const k = W / 150
  const boardW = compact ? W * 0.8 : 110 * k
  const pieceW = boardW / COLS
  const size = compact ? 0 : 26 * k
  const pad = compact ? 8 : 14 * k
  // 红板顶到最上、蓝板顶到最下，中间空开：红队的角色在红板下面、蓝队的在蓝板上面
  const kidRoom = compact ? 0 : size * 1.3
  const midGap = compact ? 14 : 24 * k
  const pieceH = Math.min(pieceW * 1.05, (H - pad * 2 - kidRoom * 2 - midGap) / (ROWS * 2))
  const boardH = pieceH * ROWS
  const boardX = (W - boardW) / 2
  const top0 = pad
  const top1 = H - pad - boardH
  return {
    W,
    H,
    compact,
    k,
    boardX,
    boardTop: [top0, top1],
    boardW,
    boardH,
    pieceW,
    pieceH,
    border: Math.max(2, 4 * k),
    size,
    kidX: [boardX + boardW * 0.5, boardX + boardW * 0.5],
    kidY: [top0 + boardH + kidRoom, top1 - kidRoom + size * 1.1],
  }
}

export interface Piece {
  /** out 还在画面外 / flying 飞进来（delay 走完才开始）/ placed 已拼上 */
  state: 'out' | 'flying' | 'placed'
  x: Tween
  y: Tween
  scale: Tween
  delay: number
  knobs: Knobs
}

export interface PuzzleOptions {
  reducedMotion: boolean
}

export const FLY_TIME = 0.6
export const FLY_TIME_REDUCED = 0.3
export const STAGGER = 0.14
export const SPRINT_FROM = 2
export const SPARKLE_ROUNDS = 3
export const SPARKLE_GAP = 0.5
export const LIT_TIME = 0.8

export class PuzzleModel {
  geo: PuzzleGeometry = layoutPuzzle(150, 700, false)
  kids: [Racer, Racer]
  readonly kinds: [CritterKind, CritterKind] = ['bear', 'monkey']
  readonly pictures: [PictureKind, PictureKind] = ['sun', 'fish']
  pieces: [Piece[], Piece[]] = [[], []]
  /** 刚扣上的块边上亮一圈 */
  snap: [Decay, Decay] = [new Decay(0.3), new Decay(0.3)]
  snapPiece: [number, number] = [-1, -1]
  /** 还差一分：最后一格一闪一闪 */
  slotGlow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  /** 拼完整图亮起 */
  lit: [Tween, Tween] = [new Tween(0, ease.outCubic), new Tween(0, ease.outCubic)]
  private celebrated: [boolean, boolean] = [false, false]
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private sparkleLeft = 0
  private sparkleT = 0
  private readonly rng: RNG
  private readonly opts: PuzzleOptions

  constructor(rng: RNG, opts: PuzzleOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.kids = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: FLY_TIME, moveTimeReduced: FLY_TIME_REDUCED }
  }

  /** 第 n 块（0…7，先行后列）在板上的格子左上角 */
  slotOf(i: number, n: number): { x: number; y: number } {
    const g = this.geo
    const r = Math.floor(n / COLS)
    const c = n % COLS
    return { x: g.boardX + c * g.pieceW, y: g.boardTop[i]! + r * g.pieceH }
  }

  /** 第 n 块飞进来之前的位置（画面外，红队从左、蓝队从右） */
  outOf(i: number, n: number): { x: number; y: number } {
    const g = this.geo
    const slot = this.slotOf(i, n)
    return { x: i === 0 ? -g.pieceW * 1.3 : g.W + g.pieceW * 0.3, y: slot.y + (n % 2 === 0 ? -1 : 1) * g.pieceH * 0.3 }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutPuzzle(W, H, compact)
    this.kids.forEach((kid, i) => {
      kid.pos.set(kid.score)
      this.pieces[i] = Array.from({ length: ROWS * COLS }, (_, n) => {
        const placed = n < kid.score
        const at = placed ? this.slotOf(i, n) : this.outOf(i, n)
        return {
          state: placed ? 'placed' : 'out',
          x: new Tween(at.x, ease.outBack),
          y: new Tween(at.y, ease.outBack),
          scale: new Tween(1, ease.outCubic),
          delay: 0,
          knobs: knobsOf(Math.floor(n / COLS), n % COLS, ROWS, COLS),
        }
      })
    })
  }

  kid(team: Team): Racer {
    return this.kids[team === 'red' ? 0 : 1]
  }

  /** 已经扣进格子（落稳）的块数 */
  placed(i: number): number {
    return this.pieces[i]!.filter((p) => p.state === 'placed' && p.x.done).length
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    const scores = [s.red, s.blue]
    this.kids.forEach((kid, i) => {
      kid.apply(s, (score) => score, this.timing)
      const want = Math.min(ROWS * COLS, Math.round(clamp(scores[i]!, 0, this.target) * ((ROWS * COLS) / this.target)))
      if (s.phase === 'lobby' || s.phase === 'countdown' || want < this.pieces[i]!.filter((p) => p.state !== 'out').length) this.restore(i)
      let k = 0
      for (let n = 0; n < want; n++) {
        const p = this.pieces[i]![n]!
        if (p.state !== 'out') continue
        this.fly(i, n, k * STAGGER)
        k++
      }
      if (kid.mood === 'win' && !this.celebrated[i]) {
        this.celebrated[i] = true
        this.sparkleLeft = SPARKLE_ROUNDS - 1
        this.sparkleT = 0
      }
      if (kid.mood !== 'win') this.celebrated[i] = false
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.sparkleLeft = 0
      for (const g of this.slotGlow) g.value = 0
    }
    if (s.phase !== 'ended') {
      for (let i = 0; i < 2; i++) if (this.lit[i]!.value > 0 || this.lit[i]!.target > 0) this.lit[i]!.set(0)
    } else if (s.winner) {
      const i = s.winner === 'red' ? 0 : 1
      if (this.lit[1 - i]!.target > 0) this.lit[1 - i]!.set(0)
    }
  }

  /** 把块都收回画面外 */
  private restore(i: number): void {
    this.pieces[i]!.forEach((p, n) => {
      const at = this.outOf(i, n)
      p.state = 'out'
      p.x.set(at.x)
      p.y.set(at.y)
      p.scale.set(1)
      p.delay = 0
    })
  }

  private fly(i: number, n: number, delay: number): void {
    const p = this.pieces[i]![n]!
    p.state = 'flying'
    p.delay = this.animated ? delay : 0
    if (p.delay <= 0) this.launch(i, n)
  }

  private launch(i: number, n: number): void {
    const p = this.pieces[i]![n]!
    const to = this.slotOf(i, n)
    const dur = this.animated ? FLY_TIME : FLY_TIME_REDUCED
    const fn = this.animated ? ease.outBack : ease.linear
    p.x.to(to.x, dur, fn)
    p.y.to(to.y, dur, fn)
    p.scale.set(this.animated ? 1.18 : 1)
    p.scale.to(1, dur, ease.outCubic)
  }

  private sparklesAt(i: number, n: number, count: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const slot = this.slotOf(i, n)
    this.particles.emit({
      x: slot.x + g.pieceW / 2,
      y: slot.y + g.pieceH / 2,
      count,
      speed: 70 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 2,
      life: 0.8,
      size: 2.6 * g.k,
      colors: ['#ffe27a', '#ffffff', i === 0 ? '#ffb3b3' : '#a9d3ff'],
      shape: 'flake',
      gravity: 60 * g.k,
      drag: 1.5,
    })
  }

  private go(): void {
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
        break
      case 'lead':
        this.kid(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.slotGlow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        // 整图亮起等胜方最后一块扣上再放，见 step
        break
      default:
        break
    }
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
        this.sparklesAt(this.winner === 'red' ? 0 : 1, Math.floor(this.rng.next() * 8), 12)
      }
    }
    this.kids.forEach((kid, i) => {
      kid.step(dt, 1.5, animated)
      this.snap[i]!.step(dt)
      this.slotGlow[i]!.step(dt)
      this.lit[i]!.step(dt)
      this.pieces[i]!.forEach((p, n) => {
        if (p.state !== 'flying') return
        if (p.delay > 0) {
          p.delay -= dt
          if (p.delay <= 0) this.launch(i, n)
          return
        }
        p.x.step(dt)
        p.y.step(dt)
        p.scale.step(dt)
        if (p.x.done && p.y.done) {
          p.state = 'placed'
          this.snapPiece[i] = n
          this.snap[i]!.kick(1)
          this.sparklesAt(i, n, 4 + Math.round(kid.boost.value * 3))
        }
      })
      // 拼完了：整图亮起（等最后一块扣上）
      if (kid.mood === 'win' && this.lit[i]!.target === 0 && this.placed(i) === ROWS * COLS) {
        this.lit[i]!.to(1, animated ? LIT_TIME : 0.2)
        this.sparklesAt(i, 3, 14)
      }
    })
    this.particles.step(dt)
  }

  /** 板面的亮度：没拼完时暗一点，冲刺时微微发亮，拼完全亮 */
  brightOf(i: number): number {
    const base = 0.72 + (this.sprint && this.animated ? 0.08 * (0.5 + 0.5 * Math.sin(this.time * 3)) : 0)
    return base + (1 - base) * this.lit[i]!.value
  }

  /** 板框的光 */
  frameGlow(i: number): number {
    return this.lit[i]!.value * (this.animated ? 0.6 + 0.4 * Math.sin(this.time * 2.5) : 1)
  }

  /** 还差一分时最后一格的闪 */
  slotPulse(i: number, n: number): number {
    const next = this.pieces[i]!.findIndex((p) => p.state === 'out')
    if (n !== next || !this.animated) return 0
    return this.slotGlow[i]!.value * (0.5 + 0.5 * Math.sin(this.time * 8))
  }

  liftOf(kid: Racer): number {
    const g = this.geo
    if (!this.animated || g.size === 0) return 0
    if (kid.mood === 'ready') return Math.abs(Math.sin(kid.hop)) * g.size * 0.15
    if (kid.mood === 'win') return Math.abs(Math.sin(kid.phase)) * g.size * 0.12
    if (kid.mood === 'run') return Math.max(0, Math.sin(Math.min(1, kid.moodT / 0.4) * Math.PI)) * g.size * 0.3
    return 0
  }

  scratchOf(kid: Racer): number {
    return kid.mood === 'lose' ? Math.min(1, kid.moodT / 0.8) : 0
  }
}
