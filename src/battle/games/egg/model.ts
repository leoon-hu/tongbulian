/**
 * 孵蛋的纯模型（需求 B36n）：快照 + 事件 + 时间 → 场景数据（两只蛋孵到第几步、裂缝 / 洞 / 壳盖、小鸡跳出来、母鸡的动作、云、小鸟、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp, clamp01, ease, Tween } from '@/battle/game/engine/tween'

export interface EggGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 两个草窝的中心 x（红左蓝右） */
  laneX: [number, number]
  nestW: number
  nestH: number
  /** 窝口椭圆的中心 y */
  nestY: number
  groundY: number
  /** 干草地的顶边（谷仓 / 栅栏立在这条线上） */
  strawTop: number
  eggW: number
  eggH: number
  /** 蛋心的 y */
  eggY: number
  /** 母鸡：身高、脚下的位置（站在窝后面靠外侧） */
  henS: number
  henX: [number, number]
  henY: number
  /** 小鸡身高，孵出来后落在窝边的位置 */
  chickS: number
  chickX: [number, number]
  chickY: number
}

export function layoutEgg(W: number, H: number, compact: boolean): EggGeometry {
  const k = W / 150
  const nestW = compact ? Math.min(34, W * 0.36) : 58 * k
  const nestH = nestW * 0.42
  const groundY = H - (compact ? 6 : 14 * k)
  const strawTop = compact ? groundY - nestH * 1.3 : Math.min(groundY - nestH * 1.3, H * 0.55)
  const nestY = compact ? groundY - nestH * 0.55 : strawTop + (groundY - strawTop) * 0.62
  const eggH = nestW * 0.8
  const laneX: [number, number] = [W * 0.27, W * 0.73]
  const henS = compact ? nestW * 0.8 : 46 * k
  return {
    W,
    H,
    compact,
    k,
    laneX,
    nestW,
    nestH,
    nestY,
    groundY,
    strawTop,
    eggW: eggH * 0.76,
    eggH,
    eggY: nestY - eggH * 0.36,
    henS,
    henX: [laneX[0] - nestW * 0.3, laneX[1] + nestW * 0.3],
    henY: nestY - nestH * 0.25,
    chickS: eggH * 0.72,
    chickX: [laneX[0] + nestW * 0.36, laneX[1] - nestW * 0.36],
    chickY: nestY - nestH * 0.15,
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

export interface EggOptions {
  reducedMotion: boolean
}

export const CRACK_TIME = 0.8
export const CRACK_TIME_REDUCED = 0.3
export const SPRINT_FROM = 2
export const FEATHER_ROUNDS = 3
export const FEATHER_GAP = 0.5
export const HATCH_TIME = 0.7
/** 第几步开始有洞、有嘴、壳盖被顶起 */
export const HOLE_AT = 3
export const BEAK_AT = 3.5
export const LIFT_FROM = 5

export class EggModel {
  geo: EggGeometry = layoutEgg(150, 700, false)
  eggs: [Racer, Racer]
  /** 蛋晃 */
  wobble: [Decay, Decay] = [new Decay(0.35), new Decay(0.35)]
  /** 母鸡扑翅膀 */
  flap: [Decay, Decay] = [new Decay(0.4), new Decay(0.4)]
  /** 还差一分：蛋一亮一亮 */
  eggGlow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  /** 小鸡跳出来的进度 */
  hatch: [Tween, Tween] = [new Tween(0, ease.outBack), new Tween(0, ease.outBack)]
  private hatched: [boolean, boolean] = [false, false]
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
  private featherLeft = 0
  private featherT = 0
  private readonly rng: RNG
  private readonly opts: EggOptions

  constructor(rng: RNG, opts: EggOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.eggs = [new Racer('red', rng), new Racer('blue', rng)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: CRACK_TIME, moveTimeReduced: CRACK_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutEgg(W, H, compact)
    for (const e of this.eggs) e.pos.set(this.stageFor(e.score, e.mood === 'win'))
    const n = compact ? 0 : 2
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 30,
      y: H * (0.06 + i * 0.05 + this.rng.next() * 0.04),
      s: 7 * (0.8 + this.rng.next() * 0.5),
      v: 5 * (0.7 + this.rng.next() * 0.6),
    }))
    this.bird = null
  }

  /** 得 score 分时孵到第几步（0…8） */
  stageFor(score: number, won = false): number {
    if (won) return 8
    return clamp(score, 0, this.target) * (8 / this.target)
  }

  egg(team: Team): Racer {
    return this.eggs[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.eggs.forEach((e, i) => {
      const forward = e.apply(s, (score, won) => this.stageFor(score, won), this.timing)
      if (forward) {
        this.wobble[i]!.kick(1 + e.boost.value * 0.5)
        this.flap[i]!.kick(1)
        this.shellBits(i, 3)
      }
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      for (const g of this.eggGlow) g.value = 0
    }
    if (s.phase !== 'ended') {
      this.featherLeft = 0
      for (let i = 0; i < 2; i++) {
        if (this.hatched[i]) {
          this.hatched[i] = false
          this.hatch[i]!.set(0)
        }
      }
    } else if (s.winner) {
      const i = s.winner === 'red' ? 0 : 1
      if (this.hatched[1 - i]) {
        this.hatched[1 - i] = false
        this.hatch[1 - i]!.set(0)
      }
      if (!this.hatched[i] && this.eggs[i]!.pos.done) this.doHatch(i)
    }
  }

  /** 蹦出来的碎壳 */
  private shellBits(i: number, n: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    this.particles.emit({
      x: g.laneX[i]!,
      y: g.eggY - g.eggH * 0.2,
      count: n,
      speed: 70 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.1,
      life: 0.7,
      size: 2.6 * g.k,
      colors: ['#fff4dc', '#e8d9b8'],
      shape: 'flake',
      gravity: 260 * g.k,
      drag: 1.2,
    })
  }

  private feathers(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const team = this.eggs[i]!.team
    this.particles.emit({
      x: g.laneX[i]!,
      y: g.eggY - g.eggH * 0.3,
      count: 18,
      speed: 100 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.3,
      life: 1.5,
      size: 3.4 * g.k,
      colors: ['#ffd54a', '#ffffff', '#fff4dc', team === 'red' ? '#ff6b6b' : '#4aa3ff'],
      shape: 'flake',
      gravity: 50 * g.k,
      drag: 1.4,
    })
  }

  private doHatch(i: number): void {
    this.hatched[i] = true
    this.hatch[i]!.to(1, this.animated ? HATCH_TIME : 0.2)
    this.eggGlow[i]!.kick(1)
    this.flap[i]!.kick(1.5)
    this.feathers(i)
    this.featherLeft = FEATHER_ROUNDS - 1
    this.featherT = 0
  }

  private go(): void {
    this.eggs.forEach((e, i) => {
      e.boost.kick(0.5)
      this.flap[i]!.kick(1)
      this.wobble[i]!.kick(0.5)
    })
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const egg of this.eggs) egg.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.egg(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak': {
        const i = e.team === 'red' ? 0 : 1
        this.egg(e.team).boost.kick(1)
        this.wobble[i]!.kick(1.6)
        break
      }
      case 'lead':
        this.egg(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.eggGlow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        // 小鸡等胜方最后一步孵完（位移结束）再跳出来，见 step
        break
      default:
        break
    }
  }

  /** 点一下（B59）：蛋晃一晃、母鸡扑一下翅膀 */
  poke(team: Team): void {
    const e = this.egg(team)
    const i = team === 'red' ? 0 : 1
    e.poke.kick(1)
    this.wobble[i]!.kick(1.3)
    this.flap[i]!.kick(1)
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
          this.bird.x += this.bird.v * dt
          this.bird.flap = advancePhase(this.bird.flap, dt, 4)
          if (this.bird.x > g.W + 20) this.bird = null
        } else {
          this.nextBird -= dt
          if (this.nextBird <= 0) {
            this.nextBird = 7 + this.rng.next() * 5
            this.bird = { x: -20, y: g.H * (0.1 + this.rng.next() * 0.25), v: (26 + this.rng.next() * 14) * g.k, flap: 0 }
          }
        }
      }
    }
    if (this.featherLeft > 0 && this.winner) {
      this.featherT += dt
      if (this.featherT >= FEATHER_GAP) {
        this.featherT = 0
        this.featherLeft -= 1
        this.feathers(this.winner === 'red' ? 0 : 1)
      }
    }
    this.eggs.forEach((e, i) => {
      e.step(dt, 1.5, animated)
      this.wobble[i]!.step(dt)
      this.flap[i]!.step(dt)
      this.eggGlow[i]!.step(dt)
      this.hatch[i]!.step(dt)
      if (e.mood === 'win' && !this.hatched[i] && e.pos.done) this.doHatch(i)
    })
    this.particles.step(dt)
  }

  /** 裂缝数：孵到第几步就几条 */
  cracksOf(e: Racer): number {
    return Math.min(8, Math.floor(e.pos.value + 1e-6))
  }

  holeOf(e: Racer): number {
    return clamp01(e.pos.value - HOLE_AT)
  }

  beakOf(e: Racer): number {
    return clamp01(e.pos.value - BEAK_AT)
  }

  /** 壳盖被顶起的程度（第 6–7 步） */
  liftOf(e: Racer): number {
    return clamp01((e.pos.value - LIFT_FROM) / 2)
  }

  /** 蛋的晃动角 */
  rotOf(e: Racer, i: number): number {
    if (!this.animated) return 0
    let r = Math.sin(this.time * 30 + i) * this.wobble[i]!.value * 0.12
    if (this.sprint && e.mood !== 'lose') r += Math.sin(this.time * 8 + i) * 0.03
    if (e.mood === 'ready') r += Math.sin(e.hop) * 0.05
    return r
  }

  /** 小鸡跳出来：从蛋里走一道弧落到窝边 */
  chickAt(i: number): { x: number; y: number; lift: number } {
    const g = this.geo
    const e = this.eggs[i]!
    const t = clamp01(this.hatch[i]!.value)
    const x = g.laneX[i]! + (g.chickX[i]! - g.laneX[i]!) * t
    const y = g.eggY + g.eggH * 0.1 + (g.chickY - g.eggY - g.eggH * 0.1) * t
    let lift = this.animated ? Math.sin(t * Math.PI) * g.eggH * 0.6 : 0
    if (t >= 1 && e.mood === 'win' && this.animated) lift += Math.abs(Math.sin(e.phase)) * g.chickS * 0.15
    return { x, y, lift }
  }

  /** 母鸡离地（倒数 / 胜利蹦） */
  henLift(e: Racer): number {
    return this.henLiftBase(e) + e.poke.value * this.geo.henS * 0.15
  }

  private henLiftBase(e: Racer): number {
    const g = this.geo
    if (!this.animated) return 0
    if (e.mood === 'ready') return Math.abs(Math.sin(e.hop)) * g.henS * 0.1
    if (e.mood === 'win') return Math.abs(Math.sin(e.phase)) * g.henS * 0.08
    return 0
  }

  /** 母鸡翅膀张开的程度 */
  henFlap(e: Racer, i: number): number {
    let f = this.flap[i]!.value
    if (!this.animated) return Math.min(1, f)
    if (e.mood === 'win') f += 0.6 + Math.sin(this.time * 10) * 0.4
    else if (this.sprint) f += 0.3 + Math.sin(this.time * 6 + i) * 0.3
    return Math.min(1.5, f)
  }

  /** 母鸡歪头：被反超 / 输了 */
  henTilt(e: Racer): number {
    return Math.max(e.look.value, e.mood === 'lose' ? Math.min(1, e.moodT / 0.8) : 0)
  }
}
