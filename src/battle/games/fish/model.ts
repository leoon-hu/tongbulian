/**
 * 钓鱼的纯模型（需求 B36l）：快照 + 事件 + 时间 → 场景数据（两条鱼的深度与姿势、钓竿的弯与绕线轮、浮漂、云、水草、气泡、杂鱼、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { RIGHT_TIME, WRONG_TIME, actEvent, type Gesture } from '@/battle/game/engine/act'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import { rodGeometry, type AnglerKind, type RodGeometry } from '@/battle/game/sprites/fish'

export interface FishGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 两条鱼的 x（红左蓝右，在竿尖下面） */
  laneX: [number, number]
  /** 两个钓鱼人的原点 x（坐在码头边）与朝向 */
  anglerX: [number, number]
  facing: [1, -1]
  /** 钓鱼人的坐高 */
  size: number
  /** 鱼的身长 */
  fishS: number
  /** 码头面 y、板厚、水面 y、沙地顶 y */
  dockY: number
  plankH: number
  waterY: number
  bottomY: number
  /** 两段码头：左段 0…dockEnd[0]、右段 dockEnd[1]…W */
  dockEnd: [number, number]
  /** 鱼在最深处（0 分）与快到水面（8 分）时的 y */
  y0: number
  y8: number
  pitch: number
  /** 赢了鱼被举到手里的位置（举过头顶） */
  handY: number
}

export function layoutFish(W: number, H: number, compact: boolean): FishGeometry {
  const k = W / 150
  const size = compact ? Math.min(22, W * 0.24) : 34 * k
  const fishS = compact ? Math.min(22, W * 0.25) : 32 * k
  const skyH = compact ? 8 : 34 * k
  const dockY = skyH + size * 1.15
  const plankH = Math.max(3, 5 * k)
  const waterY = dockY + plankH + 4 * k
  const bottomY = H - (compact ? 6 : 12 * k)
  const laneX: [number, number] = [W * 0.27, W * 0.73]
  const reach = 0.73 * size
  const y0 = bottomY - fishS * 0.6
  const y8 = waterY + fishS * 0.8
  return {
    W,
    H,
    compact,
    k,
    laneX,
    anglerX: [laneX[0] - reach, laneX[1] + reach],
    facing: [1, -1],
    size,
    fishS,
    dockY,
    plankH,
    waterY,
    bottomY,
    dockEnd: [laneX[0] - fishS * 0.55, laneX[1] + fishS * 0.55],
    y0,
    y8,
    pitch: (y0 - y8) / 8,
    handY: dockY - size * 1.5,
  }
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface Bubble {
  x: number
  y: number
  r: number
  v: number
  wob: number
}

export interface Minnow {
  x: number
  y: number
  v: number
  wag: number
}

export interface FishOptions {
  reducedMotion: boolean
}

export const REEL_TIME = 0.8
export const REEL_TIME_REDUCED = 0.3
export const SPRINT_FROM = 2
export const CONFETTI_ROUNDS = 3
export const CONFETTI_GAP = 0.5
export const CAST_TIME = 0.5
const BUBBLES = 6
/** 等答题时的小动作（B72）：挠头、nod = 探身盯着浮漂一起一伏、张望、在码头上颠一下 */
export const FISH_GESTURES: readonly Gesture[] = ['scratch', 'nod', 'look', 'hop']
/** 坐着拿竿子跳不高：表演里的「跳」只离座这么多（× 演员给的高度），竿尖别跳出盒子 */
export const SEAT_HOP = 0.45

/** 钓鱼人整体的变换（B72）：坐着的原点、离座、绕屁股前倾 / 晃、压扁拉长；竿子跟着一起变，鱼线才接得上 */
export interface AnglerBody {
  x: number
  y: number
  rot: number
  sx: number
  sy: number
}

/** 钓鱼人身上的一点（本地坐标，原点在坐着的码头面）→ 画面坐标：与 withTransform(x, y, rot, sx, sy) 同一个变换 */
export function bodyPoint(b: AnglerBody, lx: number, ly: number): { x: number; y: number } {
  const c = Math.cos(b.rot)
  const n = Math.sin(b.rot)
  const px = lx * b.sx
  const py = ly * b.sy
  return { x: b.x + px * c - py * n, y: b.y + px * n + py * c }
}

export class FishModel {
  geo: FishGeometry = layoutFish(150, 700, false)
  fishes: [Racer, Racer]
  readonly kinds: [AnglerKind, AnglerKind] = ['cat', 'bear']
  /** 甩线：0 = 线还在竿尖，1 = 线到鱼嘴 */
  cast: [Tween, Tween] = [new Tween(1, ease.outQuad), new Tween(1, ease.outQuad)]
  /** 收线时竿弯一下 */
  bend: [Decay, Decay] = [new Decay(0.4), new Decay(0.4)]
  /** 绕线轮的转角 */
  reel: [number, number] = [0, 0]
  /** 鱼挣扎 */
  thrash: [Decay, Decay] = [new Decay(0.5), new Decay(0.5)]
  /** 头朝上的程度（平滑） */
  up: [number, number] = [0, 0]
  /** 还差一分：浮漂发光 */
  bobberGlow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  private splashed: [boolean, boolean] = [false, false]
  private bubbleT: [number, number] = [0, 0]
  /** 两腿晃的相位（等答题时晃得更快，B72） */
  legPhase: [number, number] = [0, 1]
  clouds: Cloud[] = []
  bubbles: Bubble[] = []
  minnow: Minnow | null = null
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private nextMinnow = 3
  private confettiLeft = 0
  private confettiT = 0
  private readonly rng: RNG
  private readonly opts: FishOptions

  constructor(rng: RNG, opts: FishOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.fishes = [new Racer('red', rng, undefined, FISH_GESTURES), new Racer('blue', rng, undefined, FISH_GESTURES)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: REEL_TIME, moveTimeReduced: REEL_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutFish(W, H, compact)
    const g = this.geo
    for (const f of this.fishes) f.pos.set(this.yFor(f.score, f.mood === 'win'))
    const n = compact ? 0 : 2
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 30,
      y: g.dockY * (0.2 + this.rng.next() * 0.3),
      s: 7 * (0.8 + this.rng.next() * 0.5),
      v: 5 * (0.7 + this.rng.next() * 0.6),
    }))
    this.bubbles = compact ? [] : Array.from({ length: BUBBLES }, () => this.newBubble(true))
    this.minnow = null
  }

  private newBubble(anywhere: boolean): Bubble {
    const g = this.geo
    return {
      x: g.W * (0.08 + this.rng.next() * 0.84),
      y: anywhere ? g.waterY + (g.bottomY - g.waterY) * this.rng.next() : g.bottomY - 2 * g.k,
      r: (1.2 + this.rng.next() * 1.6) * g.k,
      v: (12 + this.rng.next() * 12) * g.k,
      wob: this.rng.next() * Math.PI * 2,
    }
  }

  /** 得 score 分时鱼的 y；赢了被举到手里 */
  yFor(score: number, won = false): number {
    const g = this.geo
    if (won) return g.handY
    return g.y0 - g.pitch * clamp(score, 0, this.target) * (8 / this.target)
  }

  fish(team: Team): Racer {
    return this.fishes[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.fishes.forEach((f, i) => {
      const forward = f.apply(s, (score, won) => this.yFor(score, won), this.timing)
      if (forward) {
        this.bend[i]!.kick(0.7 + f.boost.value * 0.5)
        this.thrash[i]!.kick(0.7 + f.boost.value * 0.5)
        this.bubblesFrom(i, 3)
      }
      if (f.mood === 'win' && !this.splashed[i]) {
        this.splashed[i] = true
        this.splash(i)
        this.confettiLeft = CONFETTI_ROUNDS - 1
        this.confettiT = 0
        this.confetti(f.team)
      }
      if (f.mood !== 'win') this.splashed[i] = false
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.confettiLeft = 0
      for (let i = 0; i < 2; i++) {
        this.cast[i]!.set(0)
        this.bobberGlow[i]!.value = 0
        this.up[i] = 0
      }
    }
  }

  /** 鱼嘴冒的气泡（往上飘） */
  private bubblesFrom(i: number, n: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const f = this.fishes[i]!
    this.particles.emit({
      x: this.xOf(f, i),
      y: f.pos.value - g.fishS * 0.3,
      count: n,
      speed: 25 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 0.6,
      life: 0.9,
      size: 2 * g.k,
      colors: ['rgba(255,255,255,0.8)', '#d5f1ff'],
      gravity: -60 * g.k,
      drag: 1.5,
    })
  }

  private splash(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    this.particles.emit({
      x: g.laneX[i]!,
      y: g.waterY,
      count: 16,
      speed: 120 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 0.9,
      life: 0.7,
      size: 3 * g.k,
      colors: ['#ffffff', '#d5f1ff', '#a9dcff'],
      gravity: 300 * g.k,
      drag: 1,
    })
  }

  private confetti(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const i = team === 'red' ? 0 : 1
    const colors = team === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
    this.particles.emit({
      x: g.anglerX[i]! + (this.rng.next() - 0.5) * g.size,
      y: g.handY - g.size * 0.3,
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
    this.fishes.forEach((f, i) => {
      f.boost.kick(0.5)
      this.bend[i]!.kick(0.5)
      if (this.animated) this.cast[i]!.to(1, CAST_TIME)
      else this.cast[i]!.set(1)
    })
  }

  onEvent(e: GameEvent): void {
    actEvent(e, (t) => this.fish(t).act)
    // 答错（B72）：鱼挣了一下，竿子一弹（弹的样子在 rodBend）
    if (e.type === 'answered' && !e.correct && this.fish(e.team).act.wrongT === 0) {
      const i = e.team === 'red' ? 0 : 1
      this.thrash[i]!.kick(0.9)
      this.bubblesFrom(i, 2)
    }
    switch (e.type) {
      case 'countdown':
        for (const f of this.fishes) f.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.fish(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak': {
        const i = e.team === 'red' ? 0 : 1
        this.fish(e.team).boost.kick(1)
        this.thrash[i]!.kick(1.4)
        break
      }
      case 'lead':
        this.fish(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.bobberGlow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        // 水花与彩纸在 setState 里跟着胜方的心情放（晚进来的观战者也有）
        break
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：鱼扑腾几下、竿弯一下、钓鱼人蹦一下 */
  /** 终局特写（B63）要对准的点：这一队的角色现在在盒子里的位置 */
  focus(team: Team): { x: number; y: number } {
    const i = team === 'red' ? 0 : 1
    const f = this.fishes[i]!
    return { x: this.xOf(f, i), y: this.yOf(f) }
  }
  poke(team: Team): void {
    const f = this.fish(team)
    const i = team === 'red' ? 0 : 1
    f.poke.kick(1)
    this.thrash[i]!.kick(1.2)
    this.bend[i]!.kick(0.6)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 1) this.minnow = null
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
        for (let i = 0; i < this.bubbles.length; i++) {
          const b = this.bubbles[i]!
          b.y -= b.v * dt * (this.sprint ? 1.6 : 1)
          b.wob += dt * 3
          if (b.y < g.waterY + b.r) this.bubbles[i] = this.newBubble(false)
        }
        if (this.minnow) {
          this.minnow.x += this.minnow.v * dt
          this.minnow.wag = advancePhase(this.minnow.wag, dt, 5)
          if (this.minnow.x < -20 || this.minnow.x > g.W + 20) this.minnow = null
        } else {
          this.nextMinnow -= dt
          if (this.nextMinnow <= 0) {
            this.nextMinnow = 6 + this.rng.next() * 5
            const dir = this.rng.next() < 0.5 ? 1 : -1
            this.minnow = { x: dir > 0 ? -15 : g.W + 15, y: g.waterY + (g.bottomY - g.waterY) * (0.35 + this.rng.next() * 0.45), v: dir * (22 + this.rng.next() * 12) * g.k, wag: 0 }
          }
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
    this.fishes.forEach((f, i) => {
      f.step(dt, 2, animated)
      if (animated) this.legPhase[i] = this.legPhase[i]! + dt * (2.2 + 2.2 * this.waitOf(f))
      this.cast[i]!.step(dt)
      const bend = this.bend[i]!.step(dt)
      this.thrash[i]!.step(dt)
      this.bobberGlow[i]!.step(dt)
      if (bend > 0.05 && animated) this.reel[i] = advancePhase(this.reel[i]!, dt, 3 * bend)
      // 头朝上：被线拉着就朝上，一开始 / 输了横着游
      const target = f.mood === 'lose' ? 0 : f.score === 0 && f.mood !== 'win' ? 0 : 1
      this.up[i] = this.up[i]! + (target - this.up[i]!) * Math.min(1, dt * 5)
      // 挣扎时冒泡
      this.bubbleT[i] = this.bubbleT[i]! + dt
      if (this.thrash[i]!.value > 0.3 && f.mood !== 'win' && this.bubbleT[i]! > 0.15) {
        this.bubbleT[i] = 0
        this.bubblesFrom(i, 1)
      }
    })
    this.particles.step(dt)
  }

  /** 鱼当前的 x：底下慢慢游动、拉的时候小幅摆、赢了飞到手里 */
  xOf(f: Racer, i: number): number {
    const g = this.geo
    const home = g.laneX[i]!
    if (f.mood === 'win') {
      const t = Math.min(1, f.moodT / REEL_TIME)
      const there = g.anglerX[i]! + g.facing[i]! * g.size * 0.02
      return home + (there - home) * (1 - Math.pow(1 - t, 3))
    }
    if (!this.animated) return home
    const idle = (1 - this.up[i]!) * Math.sin(this.time * 0.9 + i * 2) * g.fishS * 0.18
    const wiggle = this.up[i]! * Math.sin(this.time * 6 + i) * g.fishS * 0.04
    return home + idle + wiggle
  }

  /** 鱼当前的 y（赢了飞过去时走一道弧） */
  yOf(f: Racer): number {
    let y = f.pos.value
    if (!this.animated) return y
    if (f.mood === 'win') y -= Math.sin(Math.min(1, f.moodT / REEL_TIME) * Math.PI) * this.geo.size * 0.5
    else if (f.mood === 'ready' || f.mood === 'lose') y += Math.sin(this.time * 1.5) * this.geo.fishS * 0.06
    return y
  }

  thrashOf(f: Racer, i: number): number {
    if (!this.animated || f.mood === 'win') return 0
    const base = this.thrash[i]!.value * Math.sin(this.time * 25 + i) * 0.35
    return base + (this.sprint && f.mood !== 'lose' ? Math.sin(this.time * 12 + i) * 0.08 : 0)
  }

  /** 鱼线的末端：甩线时从竿尖滑到鱼嘴 */
  lineEnd(i: number, rod: RodGeometry, fishX: number, fishY: number): { x: number; y: number } {
    const c = this.cast[i]!.value
    return { x: rod.tipX + (fishX - rod.tipX) * c, y: rod.tipY + (fishY - rod.tipY) * c }
  }

  /** 竿子在画面里的几何：在钓鱼人本地坐标里算好，再按 bodyOf 变过去（前倾 / 离座时竿尖与鱼线跟着走） */
  rodOf(i: number): RodGeometry {
    const g = this.geo
    const f = this.fishes[i]!
    const b = this.bodyOf(i)
    const r = rodGeometry(0, -this.liftOf(f), g.size, g.facing[i]!, this.rodBend(i), this.laidOf(f), this.yankOf(f))
    const pivot = bodyPoint(b, r.pivotX, r.pivotY)
    const tip = bodyPoint(b, r.tipX, r.tipY)
    const ctrl = bodyPoint(b, r.ctrlX, r.ctrlY)
    return { pivotX: pivot.x, pivotY: pivot.y, tipX: tip.x, tipY: tip.y, ctrlX: ctrl.x, ctrlY: ctrl.y }
  }

  /**
   * 钓鱼人整体（B72）：一题里的表演交给它——跳 = 离座、前倾 = 往水那边探身、晃 = 左右摆一点、压扁拉长；
   * 往后一拽时身子往后仰。坐着拿竿子不翻跟头（连对改成拽得更猛）
   */
  bodyOf(i: number): AnglerBody {
    const g = this.geo
    const f = this.fishes[i]!
    const a = f.act.pose()
    const facing = g.facing[i]!
    // 帽顶别跳出盒子（紧凑版头顶本来就贴着上沿）
    const room = Math.max(0, g.dockY - this.liftOf(f) - g.size * 1.3 * a.sy - 1)
    const hop = Math.min(a.lift * g.size * SEAT_HOP, room)
    // 往后仰只要一点：两个人都坐在盒子边上，仰多了头就出去了
    const lean = a.lean >= 0 ? a.lean : a.lean * 0.35
    return { x: g.anglerX[i]!, y: g.dockY - hop, rot: facing * (lean + a.shake * 0.4 - this.yankOf(f) * 0.07), sx: a.sx, sy: a.sy }
  }

  /** 竿子弯多少：收线的弯 + 一题里的表演（B72：按一下往下点一下；答错竿子一弹一弹） */
  rodBend(i: number): number {
    const f = this.fishes[i]!
    const a = f.act
    let bend = this.bend[i]!.value
    if (!this.animated) return bend
    bend += a.press.value * 0.35
    if (a.wrongT >= 0) {
      const q = a.wrongT / WRONG_TIME
      if (q < 0.7) bend += Math.sin((q / 0.7) * Math.PI * 4) * (1 - q / 0.7) * 0.9
    }
    return bend
  }

  /** 往后一拽 0…1（B72 答对）：0.1 秒蓄力后一下拽起来、停一会、慢慢放回；连对拽得更猛 */
  yankOf(f: Racer): number {
    const a = f.act
    if (!this.animated || a.rightT < 0) return 0
    const q = a.rightT / RIGHT_TIME
    const k = q < 0.1 ? 0 : q < 0.25 ? (q - 0.1) / 0.15 : q < 0.55 ? 1 : q < 0.9 ? 1 - (q - 0.55) / 0.35 : 0
    return k * (a.big ? 1.25 : 1)
  }

  /** 等答题的程度（B72）：比赛中、没在按——两腿晃得更欢、盯着浮漂 */
  waitOf(f: Racer): number {
    if (f.mood !== 'idle' && f.mood !== 'run') return 0
    return 1 - f.act.typing
  }

  /** 钓鱼人离座的高度（倒数 / 胜利蹦） */
  liftOf(f: Racer): number {
    return this.liftOfBase(f) + f.poke.value * this.geo.size * 0.15
  }

  private liftOfBase(f: Racer): number {
    const g = this.geo
    if (!this.animated) return 0
    if (f.mood === 'ready') return Math.abs(Math.sin(f.hop)) * g.size * 0.1
    if (f.mood === 'win') return Math.abs(Math.sin(f.phase)) * g.size * 0.08
    return 0
  }

  /** 赢了把竿放平 */
  laidOf(f: Racer): number {
    return f.mood === 'win' ? Math.min(1, f.moodT / 0.4) : 0
  }

  scratchOf(f: Racer): number {
    return f.mood === 'lose' ? Math.min(1, f.moodT / 0.8) : 0
  }

  /** 鱼嘴张开：被拉的时候 */
  mouthOf(f: Racer, i: number): number {
    return f.mood === 'win' ? 0.6 : Math.min(1, this.thrash[i]!.value)
  }
}
