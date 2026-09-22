/**
 * 融冰的纯模型（需求 B36e）：快照 + 事件 + 时间 → 场景数据（两摞冰砖各自裂 / 化的进度、企鹅的位置与姿势、雪花、小鱼、粒子）。
 * 消耗型：我得一分，对方最上面那块冰化掉；每边剩下的冰 = 目标分 − 对方的分。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Blinker, Decay, advancePhase } from '@/battle/game/engine/rig'
import { lerp, Tween } from '@/battle/game/engine/tween'

export interface IceGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  colX: [number, number]
  /** 冰砖宽 */
  colW: number
  /** 每层的间距（含缝） */
  pitch: number
  gap: number
  /** 冰砖高 */
  blockH: number
  /** 水面 y */
  waterY: number
  /** 最底下那块冰的底边 y（泡在水里一点） */
  base: number
  /** 企鹅身高 */
  size: number
}

const LEVELS = 8

export function layoutIce(W: number, H: number, compact: boolean): IceGeometry {
  const k = W / 150
  const colW = compact ? W * 0.36 : W * 0.34
  const waterH = Math.max(16, H * 0.08)
  const waterY = H - waterH
  const base = waterY + 3 * k
  const size = compact ? 18 : 28 * k
  const topMargin = size * 1.6 + (compact ? 6 : 12 * k)
  const pitch = Math.max(6, Math.min((base - topMargin) / LEVELS, colW * 1.2))
  const gap = Math.max(1.5, 3 * k)
  return { W, H, compact, k, colX: [W * 0.27, W * 0.73], colW, pitch, gap, blockH: pitch - gap, waterY, base, size }
}

export type Mood = 'idle' | 'ready' | 'win' | 'lose'
export type BlockState = 'solid' | 'pending' | 'cracking' | 'melting' | 'gone'

export interface Block {
  /** 1 = 最底下 */
  level: number
  state: BlockState
  /** 当前状态里过了多久 */
  t: number
  /** pending 时还要等多久才开始裂 */
  delay: number
  crack: number
  melt: number
  dripT: number
}

export interface Side {
  team: Team
  /** 我的分（化的是对方的冰） */
  score: number
  /** 我还剩几块冰 */
  left: number
  blocks: Block[]
  /** 拍翅膀 */
  flap: Decay
  /** 冰裂 / 落到下一块时晃一下 */
  wobble: Decay
  /** 被反超皱眉冒汗 */
  worry: Decay
  /** 对方连对：我的冰化得更快（慢慢消退） */
  rush: Decay
  blink: Blinker
  mood: Mood
  moodT: number
  hop: number
  /** 最后一块冰化了以后掉进水里 0…1 */
  drop: Tween
  splashed: boolean
  /** 漂在水里多久（蹬腿 / 起伏的相位） */
  floatT: number
}

export interface Flake {
  x: number
  y: number
  r: number
  vy: number
  sway: number
  phase: number
}

export interface IceOptions {
  reducedMotion: boolean
}

export const CRACK_TIME = 0.25
export const MELT_TIME = 0.55
export const MELT_TIME_REDUCED = 0.3
export const STAGGER = 0.15
export const SPRINT_FROM = 2
export const SPARKLE_ROUNDS = 3
export const SPARKLE_GAP = 0.5

const inQuad = (t: number): number => t * t

export class IceModel {
  geo: IceGeometry = layoutIce(150, 700, false)
  sides: [Side, Side]
  /** 点一下（B59）：企鹅蹦一下 */
  pokeHop: [Decay, Decay] = [new Decay(0.45), new Decay(0.45)]
  flakes: Flake[] = []
  fishX = 0
  fishDir: 1 | -1 = 1
  fishWag = 0
  /** 小鱼跳出水面的计时（-1 = 没跳） */
  fishJumpT = -1
  private fishJumps = 0
  rippleT = -1
  rippleX = 0
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = LEVELS
  sprint = false
  particles: ParticlePool
  /** 降级等级（1 停极光 / 雪 / 小鱼，2 停粒子） */
  quality = 0
  private sparkleLeft = 0
  private sparkleT = 0
  private readonly rng: RNG
  private readonly opts: IceOptions

  constructor(rng: RNG, opts: IceOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.sides = [this.makeSide('red'), this.makeSide('blue')]
    this.layout(150, 700, false)
  }

  private makeSide(team: Team): Side {
    return {
      team,
      score: 0,
      left: LEVELS,
      blocks: Array.from({ length: LEVELS }, (_, i) => ({ level: i + 1, state: 'solid' as BlockState, t: 0, delay: 0, crack: 0, melt: 0, dripT: 0 })),
      flap: new Decay(0.4),
      wobble: new Decay(0.35),
      worry: new Decay(0.9),
      rush: new Decay(3),
      blink: new Blinker(this.rng),
      mood: 'idle',
      moodT: 0,
      hop: this.rng.next() * Math.PI * 2,
      drop: new Tween(0, inQuad),
      splashed: false,
      floatT: 0,
    }
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  side(team: Team): Side {
    return this.sides[team === 'red' ? 0 : 1]
  }

  other(side: Side): Side {
    return side.team === 'red' ? this.sides[1] : this.sides[0]
  }

  /** 第 level 块冰（没化时）的顶边 y */
  blockTop(level: number): number {
    return this.geo.base - level * this.geo.pitch
  }

  /** 企鹅漂在水里时脚下的 y（身体中心大致在水面上一点，下半截泡着） */
  floatY(): number {
    return this.geo.base - this.geo.size * 0.25
  }

  /** 还没化掉的最高一块 */
  topBlock(side: Side): Block | null {
    for (let i = side.blocks.length - 1; i >= 0; i--) {
      const b = side.blocks[i]!
      if (b.state !== 'gone') return b
    }
    return null
  }

  /** 企鹅脚下的 y：站在最上面那块冰上，冰化的时候跟着沉，全化了掉进水里 */
  penguinY(side: Side): number {
    const g = this.geo
    const top = this.topBlock(side)
    if (!top) return lerp(g.base - g.gap, this.floatY(), side.drop.value)
    const y = this.blockTop(top.level)
    return top.state === 'melting' ? y + g.blockH * top.melt : y
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutIce(W, H, compact)
    const n = compact ? 8 : 18
    this.flakes = Array.from({ length: n }, () => this.makeFlake(W, H, true))
    this.fishX = W * (0.2 + this.rng.next() * 0.6)
  }

  private makeFlake(W: number, H: number, anywhere: boolean): Flake {
    const k = this.geo.k
    return {
      x: this.rng.next() * W,
      y: anywhere ? this.rng.next() * H : -4,
      r: (1.2 + this.rng.next() * 2) * k,
      vy: (14 + this.rng.next() * 14) * k,
      sway: (6 + this.rng.next() * 8) * k,
      phase: this.rng.next() * Math.PI * 2,
    }
  }

  private restore(side: Side, left: number): void {
    for (const b of side.blocks) {
      const solid = b.level <= left
      b.state = solid ? 'solid' : 'gone'
      b.t = 0
      b.delay = 0
      b.crack = 0
      b.melt = solid ? 0 : 1
      b.dripT = 0
    }
    side.left = left
    side.drop.set(0)
    side.splashed = false
    side.floatT = 0
  }

  /** 从上往下错开地化掉 from → to 之间的冰 */
  private startMelting(side: Side, from: number, to: number): void {
    for (let level = from; level > to; level--) {
      const b = side.blocks[level - 1]!
      if (b.state !== 'solid') continue
      b.state = 'pending'
      b.delay = (from - level) * STAGGER
      b.t = 0
    }
  }

  private setMood(side: Side, mood: Mood): void {
    if (side.mood === mood) return
    side.mood = mood
    side.moodT = 0
  }

  setState(s: GameState): void {
    this.target = Math.max(1, Math.min(LEVELS, s.target))
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    const scores: Record<Team, number> = { red: s.red, blue: s.blue }
    const reset = s.phase === 'lobby' || s.phase === 'countdown'
    const ended = s.phase === 'ended' && s.winner !== null
    for (const side of this.sides) {
      side.score = scores[side.team]
      const left = reset ? this.target : Math.max(0, this.target - scores[this.other(side).team])
      if (reset) {
        this.restore(side, this.target)
        this.setMood(side, 'ready')
        continue
      }
      if (left > side.left) this.restore(side, left)
      else if (left < side.left) {
        this.startMelting(side, side.left, left)
        side.left = left
      }
      this.setMood(side, ended ? (s.winner === side.team ? 'win' : 'lose') : 'idle')
    }
    if (reset) {
      this.particles.clear()
      this.sparkleLeft = 0
      this.rippleT = -1
      this.fishJumpT = -1
      this.fishJumps = 0
    }
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
  }

  private go(): void {
    for (const side of this.sides) side.flap.kick(1)
  }

  private sparkle(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const side = this.side(team)
    const colors = team === 'red' ? ['#ffffff', '#ffd6d6', '#ff9b9b', '#ffe9a8'] : ['#ffffff', '#d6ecff', '#8fc3ff', '#ffe9a8']
    this.particles.emit({
      x: g.colX[team === 'red' ? 0 : 1],
      y: this.penguinY(side) - g.size * 1.1,
      count: 14,
      speed: 70 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.4,
      life: 1.1,
      size: 3 * g.k,
      colors,
      shape: 'flake',
      gravity: 30 * g.k,
      drag: 1.5,
    })
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const side of this.sides) this.setMood(side, 'ready')
        break
      case 'go':
        this.go()
        break
      case 'point': {
        const me = this.side(e.team)
        me.flap.kick(1)
        this.other(me).wobble.kick(0.6)
        if (e.streak >= 2) this.other(me).rush.kick(Math.min(1, (e.streak - 1) * 0.4))
        break
      }
      case 'streak': {
        const me = this.side(e.team)
        me.flap.kick(1)
        this.other(me).rush.kick(1)
        break
      }
      case 'lead':
        this.side(e.team === 'red' ? 'blue' : 'red').worry.kick(1)
        break
      case 'nearWin':
        this.side(e.team).flap.kick(1)
        break
      case 'finished':
        this.sparkleLeft = SPARKLE_ROUNDS - 1
        this.sparkleT = 0
        this.sparkle(e.winner)
        if (this.animated && this.quality < 1) {
          this.fishJumpT = 0
          this.fishJumps = 1
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

  /** 点一下（B59）：企鹅拍翅膀、蹦一下，冰晃一晃 */
  poke(team: Team): void {
    const side = this.side(team)
    side.flap.kick(1)
    side.wobble.kick(0.5)
    this.pokeHop[team === 'red' ? 0 : 1]!.kick(1)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 1) this.fishJumpT = -1
    if (level >= 2) this.particles.clear()
  }

  private splash(side: Side): void {
    const g = this.geo
    side.splashed = true
    side.drop.to(1, this.animated ? 0.35 : 0)
    if (!this.animated) return
    const x = g.colX[side.team === 'red' ? 0 : 1]
    this.rippleT = 0
    this.rippleX = x
    if (this.quality >= 2) return
    this.particles.emit({
      x,
      y: g.waterY,
      count: 16,
      speed: 120 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.1,
      life: 0.7,
      size: 3 * g.k,
      colors: ['#8fd0ff', '#ffffff', '#5eb8ff'],
      gravity: 280 * g.k,
    })
  }

  private drip(side: Side, b: Block): void {
    const g = this.geo
    const x = g.colX[side.team === 'red' ? 0 : 1]
    const top = this.blockTop(b.level) + g.blockH * b.melt
    for (const d of [-1, 1]) {
      this.particles.emit({
        x: x + d * g.colW * 0.5,
        y: top + 2 * g.k,
        count: 1,
        speed: 12 * g.k,
        angle: d > 0 ? 0.3 : Math.PI - 0.3,
        spread: 0.4,
        life: 0.7,
        size: 2.2 * g.k,
        colors: ['#8fd0ff', '#cfeeff'],
        gravity: 220 * g.k,
      })
    }
  }

  step(dt: number): void {
    this.time += dt
    for (const p of this.pokeHop) p.step(dt)
    const g = this.geo
    const animated = this.animated
    const scenery = animated && this.quality < 1
    if (scenery) {
      const speed = this.sprint ? 1.6 : 1
      for (let i = 0; i < this.flakes.length; i++) {
        const f = this.flakes[i]!
        f.y += f.vy * speed * dt
        f.phase += dt * 1.2
        f.x += Math.sin(f.phase) * f.sway * dt
        if (f.y > g.waterY + 4) this.flakes[i] = this.makeFlake(g.W, g.H, false)
        else if (f.x < -4) f.x = g.W + 4
        else if (f.x > g.W + 4) f.x = -4
      }
      this.fishWag = advancePhase(this.fishWag, dt, 3)
      this.fishX += this.fishDir * 12 * g.k * dt
      if (this.fishX > g.W * 0.9) this.fishDir = -1
      else if (this.fishX < g.W * 0.1) this.fishDir = 1
      if (this.fishJumpT >= 0) {
        this.fishJumpT += dt
        if (this.fishJumpT > 1.1) {
          this.fishJumps -= 1
          this.fishJumpT = this.fishJumps > 0 ? 0 : -1
        }
      }
    }
    if (this.sparkleLeft > 0 && this.winner) {
      this.sparkleT += dt
      if (this.sparkleT >= SPARKLE_GAP) {
        this.sparkleT = 0
        this.sparkleLeft -= 1
        this.sparkle(this.winner)
      }
    }
    if (this.rippleT >= 0) {
      this.rippleT += dt
      if (this.rippleT > 1.4) this.rippleT = -1
    }
    for (const side of this.sides) {
      side.moodT += dt
      side.flap.step(dt)
      side.wobble.step(dt)
      side.worry.step(dt)
      side.rush.step(dt)
      side.blink.step(dt)
      side.drop.step(dt)
      if (side.splashed) side.floatT += dt
      if (animated) {
        if (side.mood === 'ready') side.hop = advancePhase(side.hop, dt, 2)
        else if (side.mood === 'win') side.hop = advancePhase(side.hop, dt, 2.4)
      }
      for (let i = side.blocks.length - 1; i >= 0; i--) {
        const b = side.blocks[i]!
        // 一步里可以连着走完 等待 → 裂 → 化 的转换，剩余的时间接着用，不丢
        let rem = dt
        if (b.state === 'pending') {
          const use = Math.min(rem, b.delay)
          b.delay -= use
          rem -= use
          if (b.delay <= 1e-9) {
            b.state = animated ? 'cracking' : 'melting'
            b.t = 0
            side.wobble.kick(0.8)
          }
        }
        if (b.state === 'cracking' && rem > 0) {
          b.t += rem
          b.crack = Math.min(1, b.t / CRACK_TIME)
          if (b.t >= CRACK_TIME) {
            rem = b.t - CRACK_TIME
            b.state = 'melting'
            b.t = 0
          } else rem = 0
        }
        if (b.state === 'melting' && rem > 0) {
          b.t += rem
          const dur = animated ? MELT_TIME * (1 - side.rush.value * 0.35) : MELT_TIME_REDUCED
          b.melt = Math.min(1, animated ? inQuad(b.t / dur) : b.t / dur)
          if (animated && this.quality < 2) {
            b.dripT += rem
            if (b.dripT > 0.07) {
              b.dripT = 0
              this.drip(side, b)
            }
          }
          if (b.t >= dur) {
            b.state = 'gone'
            b.melt = 1
            side.wobble.kick(0.5)
            if (b.level === 1 && !side.splashed) this.splash(side)
          }
        }
      }
    }
    this.particles.step(dt)
  }

  /** 企鹅离地高度（倒数原地蹦、赢了跳） */
  liftOf(side: Side): number {
    return this.liftOfBase(side) + this.pokeHop[this.sides.indexOf(side) === 1 ? 1 : 0]!.value * this.geo.size * 0.3
  }

  private liftOfBase(side: Side): number {
    const g = this.geo
    if (!this.animated) return 0
    if (side.mood === 'ready') return Math.abs(Math.sin(side.hop)) * g.size * 0.3
    if (side.mood === 'win') return Math.abs(Math.sin(side.hop)) * g.size * 0.45
    return 0
  }

  /** 只剩一块冰时那块冰的报警闪烁 0…1 */
  alarmOf(side: Side, b: Block): number {
    if (this.phase !== 'playing' || side.left !== 1 || b.level !== 1 || b.state !== 'solid') return 0
    return this.animated ? 0.5 + Math.sin(this.time * 8) * 0.5 : 0.6
  }
}
