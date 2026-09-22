/**
 * 火箭升空的纯模型（需求 B36b）：快照 + 事件 + 时间 → 场景数据（两枚火箭的高度与姿势、星星、行星、流星、目标星、烟花）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'

export interface RocketGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 两列的 x（红左蓝右） */
  colX: [number, number]
  /** 火箭机身高度 */
  size: number
  /** 目标星的圆心 y 与半径 */
  starY: number
  starR: number
  /** 发射台顶面 y（火箭底部停在这里） */
  padY: number
  padW: number
  padH: number
  /** 抵达目标星时火箭底部的 y */
  goalY: number
}

export function layoutRocket(W: number, H: number, compact: boolean): RocketGeometry {
  const k = W / 150
  const size = compact ? Math.min(28, W * 0.3) : 44 * k
  const starR = compact ? 8 : 12 * k
  const starY = starR * 2.6
  const padH = compact ? 12 : 16 * k
  const padY = H - padH * 1.2
  return {
    W,
    H,
    compact,
    k,
    colX: [W * 0.27, W * 0.73],
    size,
    starY,
    starR,
    padY,
    padW: size * 1.1,
    padH,
    goalY: starY + starR * 0.6 + size * 1.18,
  }
}

export type Mood = 'idle' | 'ready' | 'run' | 'win' | 'lose'

export interface Rocket {
  team: Team
  score: number
  /** 火箭底部的 y */
  y: Tween
  /** 悬浮 / 抖动相位 */
  phase: number
  /** 当前上升强度 0…1 */
  moving: number
  /** 尾焰爆发（得分 / 开始时踢一下，然后衰减） */
  burst: Decay
  /** 被反超时的晃动 */
  shake: Decay
  mood: Mood
  moodT: number
  /** 冒烟计时 */
  smokeT: number
}

export interface Star {
  x: number
  y: number
  r: number
  phase: number
  speed: number
}

export interface Shooting {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
}

export interface RocketOptions {
  reducedMotion: boolean
}

export const RISE_TIME = 0.8
export const RISE_TIME_REDUCED = 0.3
export const SPRINT_FROM = 2
/** 烟花放几轮、每轮间隔 */
export const FIREWORK_ROUNDS = 3
export const FIREWORK_GAP = 0.5

export class RocketModel {
  geo: RocketGeometry = layoutRocket(150, 700, false)
  rockets: [Rocket, Rocket]
  stars: Star[] = []
  planet: { x: number; y: number; r: number } | null = null
  moon: { x: number; y: number; r: number } | null = null
  shooting: Shooting | null = null
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  /** 目标星脉动强度 0…1（冲刺 / 还差一分时高） */
  goalPulse = new Decay(1.2)
  /** 点一下（B59）：往上蹿一下 */
  pokeHop: [Decay, Decay] = [new Decay(0.45), new Decay(0.45)]
  /** 光芒旋转相位（赢了之后） */
  rays = 0
  /** 发射台闪光 */
  padGlow = new Decay(0.5)
  particles: ParticlePool
  quality = 0
  private nextShooting = 4
  private fireworksLeft = 0
  private fireworkT = 0
  private readonly rng: RNG
  private readonly opts: RocketOptions

  constructor(rng: RNG, opts: RocketOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.rockets = [this.makeRocket('red'), this.makeRocket('blue')]
    this.layout(150, 700, false)
  }

  private makeRocket(team: Team): Rocket {
    return {
      team,
      score: 0,
      y: new Tween(0, ease.outBack),
      phase: this.rng.next() * Math.PI * 2,
      moving: 0,
      burst: new Decay(0.5),
      shake: new Decay(0.4),
      mood: 'idle',
      moodT: 0,
      smokeT: 0,
    }
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutRocket(W, H, compact)
    for (const r of this.rockets) r.y.set(this.yFor(r.score, r.mood === 'win'))
    const n = compact ? 12 : 26
    this.stars = Array.from({ length: n }, () => ({
      x: this.rng.next() * W,
      y: this.rng.next() * H * 0.92,
      r: (compact ? 0.8 : 1) * (0.8 + this.rng.next() * 1.4) * this.geo.k,
      phase: this.rng.next() * Math.PI * 2,
      speed: 1 + this.rng.next() * 2,
    }))
    if (compact) {
      this.planet = null
      this.moon = null
    } else {
      this.planet = { x: W * 0.5, y: H * 0.42, r: 11 * this.geo.k }
      this.moon = { x: W * 0.5, y: H * 0.16, r: 7 * this.geo.k }
    }
  }

  /** 得 score 分时火箭底部的 y；赢了停在目标星 */
  yFor(score: number, won = false): number {
    const g = this.geo
    if (won) return g.goalY - g.size * 0.15
    const t = clamp(score / this.target, 0, 1)
    return g.padY - (g.padY - g.goalY) * t
  }

  rocket(team: Team): Rocket {
    return this.rockets[team === 'red' ? 0 : 1]
  }

  private setMood(r: Rocket, mood: Mood): void {
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
    const dur = this.animated ? RISE_TIME : RISE_TIME_REDUCED
    const fn = this.animated ? ease.outBack : ease.linear
    for (const r of this.rockets) {
      const score = scores[r.team]
      if (s.phase === 'lobby' || s.phase === 'countdown') {
        r.score = score
        r.y.set(this.yFor(0))
        this.setMood(r, 'ready')
        continue
      }
      if (score !== r.score) {
        const up = score > r.score
        r.score = score
        r.y.to(this.yFor(score), up ? dur : 0, fn)
        if (up) {
          this.setMood(r, 'run')
          r.burst.kick(0.8)
        }
      }
      if (s.phase === 'ended' && s.winner) {
        if (r.team === s.winner) {
          if (r.mood !== 'win') r.y.to(this.yFor(score, true), dur, ease.outCubic)
          this.setMood(r, 'win')
        } else this.setMood(r, 'lose')
      } else if (r.mood === 'ready' || r.mood === 'win' || r.mood === 'lose') this.setMood(r, 'idle')
    }
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.fireworksLeft = 0
      this.rays = 0
    }
  }

  private go(): void {
    this.padGlow.kick(1)
    for (const r of this.rockets) r.burst.kick(1.2)
    if (this.animated && this.quality < 2) {
      const g = this.geo
      for (const x of g.colX) {
        this.particles.emit({
          x,
          y: g.padY,
          count: 6,
          speed: 50 * g.k,
          angle: -Math.PI / 2,
          spread: Math.PI * 1.4,
          life: 0.9,
          size: 4 * g.k,
          colors: ['#d9d9e6', '#f0f0f5'],
          gravity: -10 * g.k,
          drag: 2,
        })
      }
    }
  }

  private fireworks(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const x = g.colX[team === 'red' ? 0 : 1]
    const colors = team === 'red' ? ['#ff6b6b', '#ffc93c', '#ffffff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#ffffff', '#8fc3ff']
    this.particles.emit({
      x: x + (this.rng.next() - 0.5) * g.W * 0.3,
      y: g.starY + this.rng.next() * g.H * 0.15,
      count: 20,
      speed: 90 * g.k,
      angle: 0,
      spread: Math.PI * 2,
      life: 1.2,
      size: 3 * g.k,
      colors,
      gravity: 40 * g.k,
      drag: 1.5,
    })
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const r of this.rockets) this.setMood(r, 'ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.rocket(e.team).burst.kick(0.8 + Math.min(0.7, (e.streak - 1) * 0.25))
        break
      case 'streak':
        this.rocket(e.team).burst.kick(1.5)
        break
      case 'lead':
        this.rocket(e.team === 'red' ? 'blue' : 'red').shake.kick(1)
        break
      case 'nearWin':
        this.goalPulse.kick(1)
        break
      case 'finished':
        this.fireworksLeft = FIREWORK_ROUNDS
        this.fireworkT = 0
        this.fireworks(e.winner)
        this.fireworksLeft -= 1
        break
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：喷一口大火、往上蹿一下 */
  poke(team: Team): void {
    const r = this.rocket(team)
    r.burst.kick(1.2)
    this.pokeHop[team === 'red' ? 0 : 1]!.kick(1)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 1) this.shooting = null
    if (level >= 2) this.particles.clear()
  }

  step(dt: number): void {
    this.time += dt
    for (const p of this.pokeHop) p.step(dt)
    const g = this.geo
    const animated = this.animated
    // 流星
    if (animated && this.quality < 1 && !g.compact) {
      if (this.shooting) {
        const s = this.shooting
        s.age += dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        if (s.age >= s.life) this.shooting = null
      } else {
        this.nextShooting -= dt
        if (this.nextShooting <= 0) {
          this.nextShooting = 5 + this.rng.next() * 4
          this.shooting = {
            x: g.W * (0.2 + this.rng.next() * 0.6),
            y: g.H * 0.08 + this.rng.next() * g.H * 0.2,
            vx: -220 * g.k,
            vy: 140 * g.k,
            age: 0,
            life: 0.6,
          }
        }
      }
    }
    this.goalPulse.step(dt)
    this.padGlow.step(dt)
    if (this.winner) this.rays += dt * 0.8
    // 烟花的后几轮
    if (this.fireworksLeft > 0 && this.winner) {
      this.fireworkT += dt
      if (this.fireworkT >= FIREWORK_GAP) {
        this.fireworkT = 0
        this.fireworksLeft -= 1
        this.fireworks(this.winner)
      }
    }
    for (const r of this.rockets) {
      r.moodT += dt
      r.y.step(dt)
      r.burst.step(dt)
      r.shake.step(dt)
      const rising = !r.y.done && r.mood !== 'lose'
      r.moving += ((rising ? 1 : 0) - r.moving) * Math.min(1, dt * 10)
      r.phase = advancePhase(r.phase, dt, r.mood === 'ready' ? 8 : r.mood === 'win' ? 0.6 : 0.35)
      // 冒烟：上升时往下喷，倒数时台下冒，输了冒黑烟
      r.smokeT += dt
      const smokeGap = r.moving > 0.3 ? 0.06 : r.mood === 'ready' ? 0.18 : r.mood === 'lose' ? 0.25 : Infinity
      if (animated && this.quality < 2 && r.smokeT > smokeGap) {
        r.smokeT = 0
        const x = g.colX[r.team === 'red' ? 0 : 1]
        const lose = r.mood === 'lose'
        this.particles.emit({
          x,
          y: r.y.value + g.size * 0.05,
          count: 1,
          speed: (lose ? 15 : 40) * g.k,
          angle: Math.PI / 2,
          spread: Math.PI * 0.5,
          life: lose ? 1 : 0.6,
          size: (lose ? 3.5 : 3) * g.k,
          colors: lose ? ['#4a4a5a', '#6a6a7a'] : ['#e8e8f0', '#c9c9d8'],
          gravity: lose ? -25 * g.k : 10 * g.k,
          drag: 2,
        })
      }
    }
    this.particles.step(dt)
  }

  /** 火箭底部当前 y（含悬浮 / 抖动 / 输了下沉） */
  yOf(r: Rocket): number {
    return this.yOfBase(r) - this.pokeHop[this.rockets.indexOf(r) === 1 ? 1 : 0]!.value * this.geo.size * 0.12
  }

  private yOfBase(r: Rocket): number {
    const g = this.geo
    let y = r.y.value
    if (!this.animated) return y
    if (r.mood === 'idle') y += Math.sin(r.phase) * g.size * 0.06
    else if (r.mood === 'win') y += Math.sin(r.phase) * g.size * 0.1
    else if (r.mood === 'lose') y += Math.min(1, r.moodT / 1.5) * g.size * 0.35 + Math.sin(r.moodT * 9) * g.size * 0.02
    return y
  }

  /** 火箭水平偏移（倒数抖动、被反超晃动、胜利绕小圈） */
  xOffset(r: Rocket): number {
    const g = this.geo
    if (!this.animated) return 0
    if (r.mood === 'ready') return Math.sin(r.phase * 5) * g.size * 0.025
    if (r.mood === 'win') return Math.cos(r.phase) * g.size * 0.2
    return Math.sin(r.moodT * 30) * g.size * 0.08 * r.shake.value
  }

  /** 尾焰大小 */
  flameOf(r: Rocket): number {
    if (r.mood === 'lose') return this.animated ? (Math.sin(r.moodT * 12) > 0.3 ? 0.35 : 0) : 0.2
    const base = r.mood === 'ready' ? 0.5 : 0.4
    return base + r.moving * 0.6 + r.burst.value * 0.7 + (this.sprint ? 0.1 : 0)
  }

  tiltOf(r: Rocket): number {
    if (!this.animated) return 0
    if (r.mood === 'lose') return Math.min(1, r.moodT / 1.5) * 0.25
    if (r.mood === 'win') return Math.sin(r.phase) * 0.15
    return Math.sin(r.phase * 2) * 0.03 * r.moving + Math.sin(r.moodT * 30) * 0.08 * r.shake.value
  }
}
