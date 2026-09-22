/**
 * 龟兔赛跑的纯模型（需求 B36a）：快照 + 事件 + 时间 → 场景数据（两只角色的位置与姿势、云、旗、观众、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Blinker, Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'

export interface RaceGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 120px 高的缩放 */
  k: number
  startX: number
  finishX: number
  /** 两条赛道的顶边 y（红上蓝下） */
  laneY: [number, number]
  laneH: number
  /** 角色身高 */
  size: number
  /** 天空高度 */
  skyH: number
  /** 角色在道内的起点 x 与终点 x */
  runFrom: number
  runTo: number
}

export function layoutRace(W: number, H: number, compact: boolean): RaceGeometry {
  const k = H / 120
  const size = compact ? Math.min(20, H * 0.36) : 34 * k
  const startX = compact ? 26 : 60 * Math.min(1, W / 1000) + 10
  const finishX = W - (compact ? 40 : 72 * Math.min(1, W / 1000))
  const laneTop = compact ? H * 0.1 : H * 0.42
  const laneH = compact ? H * 0.4 : H * 0.26
  const gap = compact ? H * 0.06 : H * 0.03
  const pad = size * 0.7
  return {
    W,
    H,
    compact,
    k,
    startX,
    finishX,
    laneY: [laneTop, laneTop + laneH + gap],
    laneH,
    size,
    skyH: compact ? H * 0.32 : H * 0.44,
    runFrom: startX + pad,
    runTo: finishX - pad,
  }
}

export type Mood = 'idle' | 'ready' | 'run' | 'win' | 'lose'

export interface Runner {
  team: Team
  score: number
  x: Tween
  /** 跑步 / 跳跃相位 */
  phase: number
  /** 当前跑动强度 0…1 */
  moving: number
  /** 连对带来的加速 0…1 */
  boost: Decay
  blink: Blinker
  look: Decay
  mood: Mood
  /** 在这个心情里待了多久 */
  moodT: number
  /** 原地蹦的相位（倒数） */
  hop: number
  /** 兔子耳朵抖动计时 */
  twitch: number
  /** 尘土发射计时 */
  dustT: number
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface RaceOptions {
  reducedMotion: boolean
}

/** 得分位移时长（秒） */
export const RUN_TIME = 0.8
export const RUN_TIME_REDUCED = 0.3
/** 冲线后多跑一段 */
export const WIN_EXTRA = 20
/** 冲刺状态：任一队 ≥ 目标 − 2 */
export const SPRINT_FROM = 2

const CRITTERS = 4

export class RaceModel {
  geo: RaceGeometry = layoutRace(1000, 120, false)
  runners: [Runner, Runner]
  clouds: Cloud[] = []
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  /** 终点旗挥动相位 */
  flagWave = 0
  /** 横幅发光 0…1 */
  bannerGlow = new Decay(0.8)
  /** 点一下（B59）：跳一下 */
  pokeHop: [Decay, Decay] = [new Decay(0.45), new Decay(0.45)]
  /** 发令员的旗：0 举起 1 落下 */
  starter = new Tween(0, ease.outBounce)
  /** 观众：每只的挥手强度与跳起高度 */
  crowdWave: number[] = Array.from({ length: CRITTERS }, () => 0)
  crowdJump = 0
  /** 起跑线迸的彩纸、终点的彩纸、尘土共用一个池 */
  particles: ParticlePool
  /** 降级等级（1 停云，2 停粒子） */
  quality = 0
  private readonly rng: RNG
  private readonly opts: RaceOptions

  constructor(rng: RNG, opts: RaceOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.runners = [this.makeRunner('red'), this.makeRunner('blue')]
    this.layout(1000, 120, false)
  }

  private makeRunner(team: Team): Runner {
    return {
      team,
      score: 0,
      x: new Tween(0, ease.outBack),
      phase: 0,
      moving: 0,
      boost: new Decay(0.6),
      blink: new Blinker(this.rng),
      look: new Decay(0.5),
      mood: 'idle',
      moodT: 0,
      hop: this.rng.next() * Math.PI * 2,
      twitch: 1 + this.rng.next() * 3,
      dustT: 0,
    }
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutRace(W, H, compact)
    for (const r of this.runners) r.x.set(this.xFor(r.score, r.mood === 'win'))
    const n = compact ? 1 : 3
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 80,
      y: this.geo.skyH * (0.2 + this.rng.next() * 0.4),
      s: (compact ? 8 : 14) * (0.8 + this.rng.next() * 0.5),
      v: (compact ? 6 : 10) * (0.7 + this.rng.next() * 0.6),
    }))
  }

  /** 得 score 分时角色的 x；赢了再往前冲一段 */
  xFor(score: number, won = false): number {
    const g = this.geo
    const t = clamp(score / this.target, 0, 1)
    return won ? g.finishX + WIN_EXTRA * g.k : g.runFrom + (g.runTo - g.runFrom) * t
  }

  runner(team: Team): Runner {
    return this.runners[team === 'red' ? 0 : 1]
  }

  private setMood(r: Runner, mood: Mood): void {
    if (r.mood !== mood) {
      r.mood = mood
      r.moodT = 0
    }
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    const scores: Record<Team, number> = { red: s.red, blue: s.blue }
    const dur = this.animated ? RUN_TIME : RUN_TIME_REDUCED
    const fn = this.animated ? ease.outBack : ease.linear
    for (const r of this.runners) {
      const score = scores[r.team]
      if (s.phase === 'lobby' || s.phase === 'countdown') {
        r.score = score
        r.x.set(this.xFor(0))
        this.setMood(r, 'ready')
        continue
      }
      if (score !== r.score) {
        const forward = score > r.score
        r.score = score
        r.x.to(this.xFor(score), forward ? dur : 0, fn)
        if (forward) this.setMood(r, 'run')
      }
      if (s.phase === 'ended' && s.winner) {
        if (r.team === s.winner) {
          if (r.mood !== 'win') r.x.to(this.xFor(score, true), dur, ease.outCubic)
          this.setMood(r, 'win')
        } else this.setMood(r, 'lose')
      } else if (r.mood === 'ready' || r.mood === 'win' || r.mood === 'lose') this.setMood(r, 'idle')
    }
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.starter.set(0)
      this.crowdJump = 0
      this.particles.clear()
    }
  }

  private go(): void {
    this.starter.to(1, this.animated ? 0.6 : 0.2)
    if (this.animated && this.quality < 2) {
      this.particles.emit({
        x: this.geo.startX,
        y: this.geo.laneY[0] + this.geo.laneH * 0.5,
        count: 10,
        speed: 90 * this.geo.k,
        angle: -Math.PI / 2,
        spread: Math.PI * 0.8,
        life: 0.8,
        size: 3 * this.geo.k,
        colors: ['#ff6b6b', '#ffc93c', '#4aa3ff', '#3ecf8e'],
        shape: 'flake',
        gravity: 160 * this.geo.k,
      })
    }
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const r of this.runners) this.setMood(r, 'ready')
        break
      case 'go':
        this.go()
        break
      case 'point': {
        const r = this.runner(e.team)
        r.boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        const side = e.team === 'red' ? 0 : 1
        for (let i = 0; i < CRITTERS; i++) if (i % 2 === side) this.crowdWave[i] = 1
        break
      }
      case 'streak':
        this.runner(e.team).boost.kick(1)
        break
      case 'lead': {
        // 被反超的一方回头看一眼
        const other = this.runner(e.team === 'red' ? 'blue' : 'red')
        other.look.kick(1)
        break
      }
      case 'nearWin':
        this.bannerGlow.kick(1)
        break
      case 'finished':
        this.crowdJump = 1
        if (this.animated && this.quality < 2) {
          const g = this.geo
          const colors = e.winner === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
          this.particles.emit({
            x: g.finishX,
            y: g.laneY[0] - g.size * 0.3,
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
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：跳一下、蹬一下腿 */
  /** 终局特写（B63）要对准的点：这一队的角色现在在盒子里的位置 */
  focus(team: Team): { x: number; y: number } {
    const g = this.geo
    const i = team === 'red' ? 0 : 1
    const r = this.runners[i]!
    return { x: r.x.value, y: g.laneY[i]! + g.laneH * 0.95 - g.size * 0.5 }
  }
  poke(team: Team): void {
    const r = this.runner(team)
    r.boost.kick(0.5)
    this.pokeHop[team === 'red' ? 0 : 1]!.kick(1)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 2) this.particles.clear()
  }

  step(dt: number): void {
    this.time += dt
    for (const p of this.pokeHop) p.step(dt)
    const g = this.geo
    const animated = this.animated
    // 云
    if (animated && this.quality < 1) {
      for (const c of this.clouds) {
        c.x += c.v * dt
        if (c.x - c.s * 1.2 > g.W) c.x = -c.s * 1.5
      }
    }
    this.flagWave += dt * (this.sprint ? 12 : 4)
    this.bannerGlow.step(dt)
    this.starter.step(dt)
    for (let i = 0; i < CRITTERS; i++) {
      const w = this.crowdWave[i]!
      this.crowdWave[i] = this.sprint ? Math.max(0.5, w) : w > 0.001 ? w * Math.pow(0.5, dt / 0.6) : 0
    }
    if (this.crowdJump > 0) this.crowdJump += dt

    for (const r of this.runners) {
      r.moodT += dt
      r.x.step(dt)
      const boost = r.boost.step(dt)
      const running = !r.x.done && r.mood !== 'win' && r.mood !== 'lose'
      const target = running ? 1 : 0
      r.moving += (target - r.moving) * Math.min(1, dt * 10)
      if (r.moving > 0.02) {
        r.phase = advancePhase(r.phase, dt, (r.team === 'red' ? 5 : 3.5) * (1 + boost * 0.6) * r.moving)
        r.dustT += dt
        if (animated && this.quality < 2 && r.dustT > 0.06 && r.moving > 0.4) {
          r.dustT = 0
          const lane = r.team === 'red' ? 0 : 1
          this.particles.emit({
            x: r.x.value - g.size * 0.35,
            y: g.laneY[lane] + g.laneH * 0.92,
            count: 1 + Math.round(boost * 2),
            speed: 40 * g.k,
            angle: Math.PI,
            spread: Math.PI * 0.6,
            life: 0.5,
            size: (2.6 + boost * 1.5) * g.k,
            colors: ['#e6d3a8', '#f3e5c2'],
            gravity: -20 * g.k,
            drag: 2.5,
          })
        }
      } else if (r.mood === 'win') {
        r.phase = advancePhase(r.phase, dt, 2.5)
      } else if (r.mood === 'ready' && animated) {
        r.hop = advancePhase(r.hop, dt, r.team === 'red' ? 1.6 : 2.2)
      } else if (r.mood === 'idle' && animated) {
        r.hop = advancePhase(r.hop, dt, 0.5)
      }
      r.blink.step(dt)
      r.look.step(dt)
      r.twitch -= dt
      if (r.twitch < -0.3) r.twitch = 1.5 + this.rng.next() * 3
    }
    this.particles.step(dt)
  }

  /** 角色离地高度（跑动 / 蹦 / 胜利跳） */
  lift(r: Runner): number {
    return this.liftBase(r) + this.pokeHop[r.team === 'red' ? 0 : 1]!.value * this.geo.size * 0.4
  }

  private liftBase(r: Runner): number {
    const g = this.geo
    if (!this.animated) return 0
    if (r.mood === 'ready') return Math.abs(Math.sin(r.hop)) * g.size * (r.team === 'red' ? 0.12 : 0.35)
    if (r.mood === 'win') return Math.abs(Math.sin(r.phase)) * g.size * (r.team === 'red' ? 0.25 : 0.5)
    if (r.team === 'blue' && r.moving > 0.02) return Math.abs(Math.sin(r.phase)) * g.size * 0.35 * r.moving
    return 0
  }
}
