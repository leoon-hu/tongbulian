/**
 * 拆城堡的纯模型（需求 B36u）：快照 + 事件 + 时间 → 场景数据（两座塔各剩几块砖、正在裂 / 碎的砖、飞着的炮弹、塔顶的高度、塌掉、炮的后坐、云、粒子）。
 * 消耗型：我得 1 分，对方最上面那块砖碎掉；每边剩下的砖 = 8 − 对方的分。不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import type { CritterKind } from '@/battle/game/sprites/scenery'

export interface CastleGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 两座塔的中心 x（红左蓝右）、砖的宽高 */
  towerX: [number, number]
  brickW: number
  brickH: number
  groundY: number
  /** 塔顶平台的高度、角色身高、炮的尺寸 */
  topH: number
  size: number
  cannonS: number
}

export function layoutCastle(W: number, H: number, compact: boolean): CastleGeometry {
  const k = W / 150
  const brickW = compact ? W * 0.3 : 44 * k
  const groundY = H - (compact ? 8 : 16 * k)
  const topH = brickW * 0.4
  const size = compact ? brickW * 0.5 : 24 * k
  const room = compact ? 10 : 30 * k
  const brickH = Math.min(brickW * 0.95, (groundY - topH - size * 1.3 - room) / 8)
  return { W, H, compact, k, towerX: [W * 0.27, W * 0.73], brickW, brickH, groundY, topH, size, cannonS: compact ? brickW * 0.34 : 16 * k }
}

export interface Brick {
  /** solid 好好的 / cracking 裂开 / gone 碎了 */
  state: 'solid' | 'cracking' | 'gone'
  t: number
}

export interface Shot {
  /** 打向哪座塔（0 红 1 蓝） */
  target: number
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
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
}

export interface CastleOptions {
  reducedMotion: boolean
}

export const SHOT_TIME = 0.5
export const CRACK_TIME = 0.2
export const STAGGER = 0.15
export const DROP_TIME = 0.6
export const SPRINT_FROM = 2
export const FIREWORK_ROUNDS = 3
export const FIREWORK_GAP = 0.5
export const COLLAPSE_TIME = 0.8

export class CastleModel {
  geo: CastleGeometry = layoutCastle(150, 700, false)
  guards: [Racer, Racer]
  readonly kinds: [CritterKind, CritterKind] = ['monkey', 'panda']
  /** 每座塔从下往上 8 块砖 */
  bricks: [Brick[], Brick[]] = [[], []]
  shots: Shot[] = []
  /** 塔顶平台的顶边 y（跟着最高那块砖，落下去弹一下） */
  topY: [Tween, Tween] = [new Tween(0, ease.outBounce), new Tween(0, ease.outBounce)]
  /** 炮的后坐 */
  recoil: [Decay, Decay] = [new Decay(0.3), new Decay(0.3)]
  /** 炮口的烟 */
  smoke: [Decay, Decay] = [new Decay(0.5), new Decay(0.5)]
  /** 只剩一块砖时那块闪 */
  alarm: [Decay, Decay] = [new Decay(1), new Decay(1)]
  /** 塌掉：塔顶落到地上 */
  collapsed: [boolean, boolean] = [false, false]
  flagWave = 0
  clouds: Cloud[] = []
  bird: Bird | null = null
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private nextBird = 4
  private fireworkLeft = 0
  private fireworkT = 0
  private celebrated = false
  private smokeT: [number, number] = [0, 0]
  private readonly rng: RNG
  private readonly opts: CastleOptions

  constructor(rng: RNG, opts: CastleOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.guards = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: SHOT_TIME, moveTimeReduced: 0.2 }
  }

  /** 第 level 块砖（0 起，从下往上）的顶边 */
  brickTop(level: number): number {
    return this.geo.groundY - (level + 1) * this.geo.brickH
  }

  /** 这座塔还剩几块好砖（含正在裂的） */
  left(i: number): number {
    return this.bricks[i]!.filter((b) => b.state !== 'gone').length
  }

  /** 塔顶该在的高度：最高那块砖的顶边；全没了就在地上 */
  topFor(i: number): number {
    const n = this.left(i)
    return n === 0 ? this.geo.groundY : this.brickTop(n - 1)
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutCastle(W, H, compact)
    this.guards.forEach((g, i) => {
      g.pos.set(g.score)
      const other = this.guards[1 - i]!.score
      const keep = Math.max(0, 8 - Math.round(clamp(other, 0, this.target) * (8 / this.target)))
      this.bricks[i] = Array.from({ length: 8 }, (_, n) => ({ state: n < keep ? 'solid' : 'gone', t: 0 }))
      this.topY[i]!.set(this.topFor(i))
      this.collapsed[i] = keep === 0 && this.phase === 'ended'
    })
    this.shots = []
    const n = compact ? 0 : 2
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 30,
      y: H * (0.05 + i * 0.06),
      s: 7 * (0.8 + this.rng.next() * 0.5),
      v: 5 * (0.7 + this.rng.next() * 0.6),
    }))
    this.bird = null
  }

  guard(team: Team): Racer {
    return this.guards[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    const scores = [s.red, s.blue]
    this.guards.forEach((g, i) => {
      const forward = g.apply(s, (score) => score, this.timing)
      const other = 1 - i
      const keep = Math.max(0, 8 - Math.round(clamp(scores[i]!, 0, this.target) * (8 / this.target)))
      const bricks = this.bricks[other]!
      const standing = bricks.filter((b) => b.state !== 'gone').length
      if (s.phase === 'lobby' || s.phase === 'countdown' || keep > standing) {
        // 砖变多（新一局）：直接还原
        bricks.forEach((b, n) => {
          b.state = n < keep ? 'solid' : 'gone'
          b.t = 0
        })
        this.topY[other]!.set(this.topFor(other))
        this.collapsed[other] = false
        this.shots = this.shots.filter((sh) => sh.target !== other)
      } else if (keep < standing) {
        // 我得了分：朝对方塔顶开炮，每少一块一发（炮弹到了才碎）
        const pending = this.shots.filter((sh) => sh.target === other).length
        const need = standing - keep - pending
        for (let k = 0; k < need; k++) this.fire(i, k * STAGGER)
      }
      if (forward) this.recoil[i]!.kick(1)
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.fireworkLeft = 0
      for (const a of this.alarm) a.value = 0
      this.celebrated = false
    }
    if (s.phase !== 'ended') this.celebrated = false
  }

  /** 从 i 队的塔顶朝对方塔顶开一炮 */
  private fire(i: number, delay: number): void {
    const g = this.geo
    const other = 1 - i
    const dir = i === 0 ? 1 : -1
    const from = { x: g.towerX[i]! + dir * g.brickW * 0.35, y: this.topY[i]!.value - g.cannonS * 0.4 }
    const targetLevel = Math.max(0, this.left(other) - 1 - this.shots.filter((sh) => sh.target === other).length)
    const to = { x: g.towerX[other]!, y: this.brickTop(targetLevel) + g.brickH * 0.5 }
    this.shots.push({ target: other, x0: from.x, y0: from.y, x1: to.x, y1: to.y, t: 0, delay: this.animated ? delay : 0 })
    this.recoil[i]!.kick(1)
    this.smoke[i]!.kick(1)
  }

  /** 炮弹到了：对方最上面那块好砖裂开 */
  private hit(other: number): void {
    const bricks = this.bricks[other]!
    for (let n = bricks.length - 1; n >= 0; n--) {
      const b = bricks[n]!
      if (b.state === 'solid') {
        b.state = 'cracking'
        b.t = 0
        return
      }
    }
  }

  private shatter(other: number, level: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    this.particles.emit({
      x: g.towerX[other]!,
      y: this.brickTop(level) + g.brickH * 0.5,
      count: 8,
      speed: 90 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.4,
      life: 0.9,
      size: 3.2 * g.k,
      colors: other === 0 ? ['#f2c9b8', '#d9a08a', '#ffffff'] : ['#c9dcf2', '#96b9dc', '#ffffff'],
      shape: 'flake',
      gravity: 320 * g.k,
      drag: 1,
    })
  }

  private dustCloud(other: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    this.particles.emit({
      x: g.towerX[other]!,
      y: g.groundY - 2 * g.k,
      count: 16,
      speed: 60 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.3,
      life: 1.1,
      size: 4 * g.k,
      colors: ['#e6d3a8', '#f3e5c2', '#d9c9a5'],
      gravity: -15 * g.k,
      drag: 2.2,
    })
  }

  private firework(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const i = team === 'red' ? 0 : 1
    const colors = team === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
    this.particles.emit({
      x: g.towerX[i]! + (this.rng.next() - 0.5) * g.brickW,
      y: this.topY[i]!.value - g.size * 1.6 - this.rng.next() * g.size,
      count: 18,
      speed: 110 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 2,
      life: 1.3,
      size: 3.4 * g.k,
      colors,
      shape: 'flake',
      gravity: 70 * g.k,
      drag: 1.6,
    })
  }

  private go(): void {
    for (const s of this.smoke) s.kick(0.8)
    for (const r of this.recoil) r.kick(0.5)
    for (const gd of this.guards) gd.boost.kick(0.5)
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const gd of this.guards) gd.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.guard(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak':
        this.guard(e.team).boost.kick(1)
        this.smoke[e.team === 'red' ? 0 : 1]!.kick(1.5)
        break
      case 'lead':
        this.guard(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        // 对方只剩一块砖：那块闪
        this.alarm[e.team === 'red' ? 1 : 0]!.kick(1)
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

  /** 点一下（B59）：炮口冒一股烟、炮身后坐、小动物蹦一下 */
  poke(team: Team): void {
    const gd = this.guard(team)
    const i = team === 'red' ? 0 : 1
    gd.poke.kick(1)
    this.smoke[i]!.kick(1)
    this.recoil[i]!.kick(0.6)
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
    this.flagWave += dt * (this.sprint ? 10 : 4)
    if (animated && this.quality < 1) {
      for (const c of this.clouds) {
        c.x += c.v * dt
        if (c.x - c.s * 1.2 > g.W) c.x = -c.s * 1.5
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
            this.bird = { x: -20, y: g.H * (0.08 + this.rng.next() * 0.2), v: (26 + this.rng.next() * 14) * g.k, flap: 0 }
          }
        }
      }
    }
    // 炮弹
    for (let s = this.shots.length - 1; s >= 0; s--) {
      const sh = this.shots[s]!
      if (sh.delay > 0) {
        sh.delay -= dt
        continue
      }
      sh.t += dt / (animated ? SHOT_TIME : 0.2)
      if (sh.t >= 1) {
        this.shots.splice(s, 1)
        this.hit(sh.target)
      }
    }
    // 砖：裂 → 碎
    this.guards.forEach((gd, i) => {
      gd.step(dt, 1.5, animated)
      this.recoil[i]!.step(dt)
      this.smoke[i]!.step(dt)
      this.alarm[i]!.step(dt)
      this.topY[i]!.step(dt)
      const bricks = this.bricks[i]!
      bricks.forEach((b, n) => {
        if (b.state !== 'cracking') return
        b.t += dt
        if (b.t >= (animated ? CRACK_TIME : 0.05)) {
          b.state = 'gone'
          this.shatter(i, n)
          const to = this.topFor(i)
          if (this.left(i) === 0) {
            this.topY[i]!.to(to, animated ? COLLAPSE_TIME : 0.2, animated ? ease.outBounce : ease.linear)
            this.collapsed[i] = true
            this.dustCloud(i)
          } else this.topY[i]!.to(to, animated ? DROP_TIME : 0.2, animated ? ease.outBounce : ease.linear)
        }
      })
      // 冲刺时炮口一直冒烟
      this.smokeT[i] = this.smokeT[i]! + dt
      if (this.sprint && gd.mood !== 'lose' && this.smokeT[i]! > 0.6) {
        this.smokeT[i] = 0
        this.smoke[i]!.kick(0.5)
      }
    })
    // 赢了：负方塔塌了之后放烟花
    if (this.phase === 'ended' && this.winner && !this.celebrated) {
      const li = this.winner === 'red' ? 1 : 0
      if (this.collapsed[li] || this.left(li) === 0) {
        this.celebrated = true
        this.fireworkLeft = FIREWORK_ROUNDS
        this.fireworkT = FIREWORK_GAP
      }
    }
    if (this.fireworkLeft > 0 && this.winner) {
      this.fireworkT += dt
      if (this.fireworkT >= FIREWORK_GAP) {
        this.fireworkT = 0
        this.fireworkLeft -= 1
        this.firework(this.winner)
      }
    }
    this.particles.step(dt)
  }

  /** 炮弹此刻的位置（走一道弧） */
  shotAt(sh: Shot): { x: number; y: number } {
    const t = clamp(sh.t, 0, 1)
    const arc = this.animated ? Math.sin(t * Math.PI) * this.geo.brickW * 1.6 : 0
    return { x: sh.x0 + (sh.x1 - sh.x0) * t, y: sh.y0 + (sh.y1 - sh.y0) * t - arc }
  }

  crackOf(b: Brick): number {
    return b.state === 'cracking' ? clamp(b.t / CRACK_TIME, 0, 1) : 0
  }

  /** 只剩一块砖时那块闪 */
  alarmOf(i: number, n: number): number {
    if (n !== 0 || this.left(i) !== 1 || !this.animated) return 0
    return this.alarm[i]!.value * (0.5 + 0.5 * Math.sin(this.time * 9))
  }

  liftOf(gd: Racer): number {
    return this.liftOfBase(gd) + gd.poke.value * this.geo.size * 0.25
  }

  private liftOfBase(gd: Racer): number {
    const g = this.geo
    if (!this.animated) return 0
    if (gd.mood === 'ready') return Math.abs(Math.sin(gd.hop)) * g.size * 0.15
    if (gd.mood === 'win') return Math.abs(Math.sin(gd.phase)) * g.size * 0.12
    return 0
  }

  /** 坐在废墟上头顶转小星星 */
  dizzyOf(i: number): number {
    return this.collapsed[i] && this.topY[i]!.done ? 1 : 0
  }
}
