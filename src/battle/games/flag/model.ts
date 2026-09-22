/**
 * 抢旗的纯模型（需求 B36t）：快照 + 事件 + 时间 → 场景数据（旗子的位置、蹦一格的弧、飞进城堡、城堡的旗帜 / 城门、角色动作、云、粒子）。
 * 旗子的位置只由比分差决定（拉锯类），赢了插进胜方的城堡。不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import type { CritterKind } from '@/battle/game/sprites/scenery'

export interface FlagGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 120px 高的缩放 */
  k: number
  /** 角色身高、旗高 */
  size: number
  flagH: number
  groundY: number
  /** 两座城堡的底边中点与尺寸（红左蓝右） */
  castleX: [number, number]
  castleW: number
  castleH: number
  /** 塔顶（旗子最后插的地方） */
  towerTop: [{ x: number; y: number }, { x: number; y: number }]
  /** 两只角色站的位置（城门前） */
  kidX: [number, number]
  /** 赛场：正中、每格宽 */
  center: number
  cell: number
}

export function layoutFlag(W: number, H: number, compact: boolean): FlagGeometry {
  const k = H / 120
  const size = compact ? Math.min(20, H * 0.34) : 30 * k
  const groundY = H - (compact ? 5 : 14 * k)
  const castleW = compact ? Math.min(46, W * 0.07) : 72 * k
  const castleH = compact ? H * 0.42 : 40 * k
  const castleX: [number, number] = [castleW / 2 + 4 * k, W - castleW / 2 - 4 * k]
  const kidX: [number, number] = [castleX[0] + castleW * 0.55 + size * 0.4, castleX[1] - castleW * 0.55 - size * 0.4]
  const fieldL = kidX[0] + size * 0.5
  const fieldR = kidX[1] - size * 0.5
  const center = W / 2
  const cell = (fieldR - fieldL) / 2 / 8
  const towerW = castleW * 0.36
  const towerH = castleH * 1.35
  const top = (i: number): { x: number; y: number } => ({ x: castleX[i]! - (i === 0 ? 1 : -1) * castleW * 0.22, y: groundY - towerH - towerW * 0.7 })
  return { W, H, compact, k, size, flagH: compact ? Math.min(24, H * 0.42) : 34 * k, groundY, castleX, castleW, castleH, towerTop: [top(0), top(1)], kidX, center, cell }
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface FlagOptions {
  reducedMotion: boolean
}

export const MOVE_TIME = 0.8
export const MOVE_TIME_REDUCED = 0.3
export const FLY_TIME = 1.0
export const SPRINT_FROM = 2
export const FIREWORK_ROUNDS = 3
export const FIREWORK_GAP = 0.5

export class FlagModel {
  geo: FlagGeometry = layoutFlag(1000, 120, false)
  kids: [Racer, Racer]
  readonly kinds: [CritterKind, CritterKind] = ['monkey', 'pig']
  /** 旗子在赛场上的 x */
  flag = new Tween(500, ease.outBack)
  /** 蹦那一格的计时（画一道小弧用） */
  private hopT = 1
  /** 城堡上的旗帜挥一下 */
  banner: [Decay, Decay] = [new Decay(0.5), new Decay(0.5)]
  /** 还差一分：城堡发光 */
  glow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  /** 旗子飞进城堡的进度 */
  planted = new Tween(0, ease.outCubic)
  /** 负方城门放下来 */
  gate: [Tween, Tween] = [new Tween(0, ease.outBounce), new Tween(0, ease.outBounce)]
  /** 得分跳一下 */
  jump: [Decay, Decay] = [new Decay(0.3), new Decay(0.3)]
  bannerWave = 0
  clouds: Cloud[] = []
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private fireworkLeft = 0
  private fireworkT = 0
  private celebrated = false
  private readonly rng: RNG
  private readonly opts: FlagOptions

  constructor(rng: RNG, opts: FlagOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.kids = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(1000, 120, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: MOVE_TIME, moveTimeReduced: MOVE_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutFlag(W, H, compact)
    for (const kid of this.kids) kid.pos.set(kid.score)
    this.flag.set(this.flagFor(this.kids[0].score, this.kids[1].score))
    const n = compact ? 1 : 3
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 80,
      y: H * (0.08 + this.rng.next() * 0.2),
      s: (compact ? 8 : 13) * (0.8 + this.rng.next() * 0.5),
      v: (compact ? 6 : 10) * (0.7 + this.rng.next() * 0.6),
    }))
  }

  /** 旗子在赛场上的 x：只看比分差，红多一分往红队城堡挪一格 */
  flagFor(red: number, blue: number): number {
    const g = this.geo
    const diff = clamp(red - blue, -this.target, this.target) * (8 / this.target)
    return g.center - diff * g.cell
  }

  kid(team: Team): Racer {
    return this.kids[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.kids.forEach((kid, i) => {
      const forward = kid.apply(s, (score) => score, this.timing)
      if (forward) {
        this.jump[i]!.kick(1)
        this.banner[i]!.kick(1 + kid.boost.value * 0.5)
      }
    })
    const target = this.flagFor(s.red, s.blue)
    if (s.phase === 'lobby' || s.phase === 'countdown') {
      this.flag.set(target)
      this.hopT = 1
    } else if (Math.abs(target - this.flag.target) > 1e-6) {
      this.flag.to(target, this.animated ? MOVE_TIME : MOVE_TIME_REDUCED, this.animated ? ease.outBack : ease.linear)
      this.hopT = 0
    }
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.fireworkLeft = 0
      for (const gl of this.glow) gl.value = 0
    }
    if (s.phase !== 'ended') {
      this.celebrated = false
      if (this.planted.target > 0) this.planted.set(0)
      for (const gt of this.gate) if (gt.target > 0) gt.set(0)
    } else if (s.winner && !this.celebrated) {
      this.celebrated = true
      const wi = s.winner === 'red' ? 0 : 1
      this.planted.set(0)
      this.planted.to(1, this.animated ? FLY_TIME : 0.2)
      this.gate[1 - wi]!.set(0)
      this.gate[1 - wi]!.to(1, this.animated ? 0.8 : 0.2)
      this.fireworkLeft = FIREWORK_ROUNDS
      this.fireworkT = FIREWORK_GAP - 0.2
    }
  }

  private firework(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const top = g.towerTop[team === 'red' ? 0 : 1]!
    const colors = team === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
    this.particles.emit({
      x: top.x + (this.rng.next() - 0.5) * g.castleW * 0.6,
      y: top.y - g.flagH * 0.6,
      count: 20,
      speed: 120 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 2,
      life: 1.3,
      size: 3.5 * g.k,
      colors,
      shape: 'flake',
      gravity: 70 * g.k,
      drag: 1.6,
    })
  }

  private go(): void {
    for (const j of this.jump) j.kick(0.8)
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
        this.banner[e.team === 'red' ? 0 : 1]!.kick(1.5)
        break
      case 'lead':
        this.kid(e.team === 'red' ? 'blue' : 'red').look.kick(1)
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

  /** 点一下（B59）：蹦一下、城堡的旗帜飘一下 */
  /** 终局特写（B63）要对准的点：这一队的胜方跟着飞向城堡的旗子，另一方是自己城堡的塔顶现在在盒子里的位置 */
  focus(team: Team): { x: number; y: number } {
    const g = this.geo
    const i = team === 'red' ? 0 : 1
    if (this.winner === team) {
      const f = this.flagAt()
      return { x: f.x, y: f.y }
    }
    const top = g.towerTop[i]!
    return { x: top.x, y: top.y }
  }
  poke(team: Team): void {
    const i = team === 'red' ? 0 : 1
    this.jump[i]!.kick(1)
    this.banner[i]!.kick(1)
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
    this.bannerWave += dt * (this.sprint ? 12 : 4)
    this.flag.step(dt)
    this.hopT = Math.min(1, this.hopT + dt / MOVE_TIME)
    this.planted.step(dt)
    this.kids.forEach((kid, i) => {
      kid.step(dt, 1.5, animated)
      this.banner[i]!.step(dt)
      this.glow[i]!.step(dt)
      this.jump[i]!.step(dt)
      this.gate[i]!.step(dt)
    })
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

  /** 旗子此刻的位置（杆底）：赛场上蹦一格走一道小弧；赢了飞到塔顶 */
  flagAt(): { x: number; y: number; team: Team | null } {
    const g = this.geo
    const p = this.planted.value
    const hop = this.animated && !this.flag.done ? Math.sin(this.hopT * Math.PI) * g.size * 0.5 : 0
    const field = { x: this.flag.value, y: g.groundY - hop }
    if (p <= 0 || !this.winner) return { ...field, team: null }
    const top = g.towerTop[this.winner === 'red' ? 0 : 1]!
    const arc = this.animated ? Math.sin(p * Math.PI) * g.size * 1.2 : 0
    return { x: field.x + (top.x - field.x) * p, y: field.y + (top.y - field.y) * p - arc, team: p >= 0.98 ? this.winner : null }
  }

  liftOf(kid: Racer, i: number): number {
    const g = this.geo
    if (!this.animated) return 0
    if (kid.mood === 'ready') return Math.abs(Math.sin(kid.hop)) * g.size * 0.15
    if (kid.mood === 'win') return Math.abs(Math.sin(kid.phase)) * g.size * 0.12
    return this.jump[i]!.value * g.size * 0.35
  }

  scratchOf(kid: Racer): number {
    return kid.mood === 'lose' ? Math.min(1, kid.moodT / 0.8) : 0
  }

  /** 城堡旗帜的挥动相位（得分那下挥得更猛） */
  bannerOf(i: number): number {
    return this.bannerWave * (1 + this.banner[i]!.value * 1.5)
  }
}
