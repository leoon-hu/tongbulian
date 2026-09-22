/**
 * 盖楼的纯模型（需求 B36c）：快照 + 事件 + 时间 → 场景数据（两座楼的砖块、落下的砖、工人、屋顶、云、小鸟、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Blinker, Decay, advancePhase } from '@/battle/game/engine/rig'
import { ease, Tween } from '@/battle/game/engine/tween'

export interface TowerGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  colX: [number, number]
  /** 砖宽 */
  colW: number
  /** 每层砖高 */
  blockH: number
  /** 地面（地基顶面）y */
  groundY: number
  foundH: number
  /** 工人身高 */
  size: number
  roofH: number
  skyH: number
}

export function layoutTower(W: number, H: number, compact: boolean): TowerGeometry {
  const k = W / 150
  const colW = compact ? W * 0.36 : W * 0.34
  const foundH = compact ? 6 : 8 * k
  const groundY = H - (compact ? 14 : 20 * k)
  const size = compact ? 16 : 24 * k
  const roofH = colW * 0.5
  const topMargin = size * 1.5 + roofH * 2.2 + (compact ? 8 : 14 * k)
  const blockH = Math.max(6, (groundY - foundH - topMargin) / 8)
  return { W, H, compact, k, colX: [W * 0.27, W * 0.73], colW, blockH, groundY, foundH, size, roofH, skyH: H * 0.6 }
}

export type Mood = 'idle' | 'ready' | 'win' | 'lose'

export interface Brick {
  level: number
  /** 砖顶 y */
  y: Tween
  /** 还没开始落的延迟（秒） */
  delay: number
  landed: boolean
}

export interface Tower {
  team: Team
  score: number
  bricks: Brick[]
  /** 落砖后整座楼被压一下 */
  squash: Decay
  /** 落砖时尘土大小 */
  dust: Decay
  /** 工人脚下 y */
  builderY: Tween
  /** 工人跳起 */
  hop: Decay
  /** 开始时举手欢呼一下 */
  cheer: Decay
  /** 连对的劲头：之后的砖掉得更急（慢慢消退） */
  rush: Decay
  hammer: number
  blink: Blinker
  look: Decay
  mood: Mood
  moodT: number
  /** 屋顶顶边 y（赢了才落下来） */
  roof: Tween | null
  /** 亮起的窗户层数 */
  lit: number
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

export interface TowerOptions {
  reducedMotion: boolean
}

export const FALL_TIME = 0.75
export const FALL_TIME_REDUCED = 0.3
export const STAGGER = 0.12
export const SPRINT_FROM = 2
export const FIREWORK_ROUNDS = 3
export const FIREWORK_GAP = 0.5

export class TowerModel {
  geo: TowerGeometry = layoutTower(150, 700, false)
  towers: [Tower, Tower]
  clouds: Cloud[] = []
  bird: Bird | null = null
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  flagWave = 0
  particles: ParticlePool
  quality = 0
  private nextBird = 3
  private fireworksLeft = 0
  private fireworkT = 0
  private readonly rng: RNG
  private readonly opts: TowerOptions

  constructor(rng: RNG, opts: TowerOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.towers = [this.makeTower('red'), this.makeTower('blue')]
    this.layout(150, 700, false)
  }

  private makeTower(team: Team): Tower {
    return {
      team,
      score: 0,
      bricks: [],
      squash: new Decay(0.25),
      dust: new Decay(0.3),
      builderY: new Tween(0, ease.outBack),
      hop: new Decay(0.3),
      cheer: new Decay(0.4),
      rush: new Decay(3),
      hammer: this.rng.next() * Math.PI * 2,
      blink: new Blinker(this.rng),
      look: new Decay(0.6),
      mood: 'idle',
      moodT: 0,
      roof: null,
      lit: 0,
    }
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  /** 第 level 层砖的顶边 y */
  brickTop(level: number): number {
    const g = this.geo
    return g.groundY - g.foundH - level * g.blockH
  }

  /** 楼顶（有 n 块落稳的砖）的 y */
  topOf(n: number): number {
    return this.brickTop(n)
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutTower(W, H, compact)
    for (const t of this.towers) {
      for (const b of t.bricks) {
        b.y.set(this.brickTop(b.level))
        b.landed = true
      }
      if (t.roof) t.roof.set(this.brickTop(this.target))
      t.builderY.set(this.builderHome(t))
    }
    const n = compact ? 1 : 2
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: this.rng.next() * W,
      y: this.geo.skyH * (0.08 + i * 0.25 + this.rng.next() * 0.1),
      s: (compact ? 7 : 11) * (0.8 + this.rng.next() * 0.5) * (i === 0 ? 1 : 0.75),
      v: (compact ? 4 : 7) * (0.7 + this.rng.next() * 0.6),
    }))
    this.bird = null
  }

  /** 工人该站的地方：封顶后站屋脊，否则站落稳的楼顶 */
  builderHome(t: Tower): number {
    return t.roof ? this.brickTop(this.target) - this.geo.roofH : this.topOf(t.bricks.length)
  }

  tower(team: Team): Tower {
    return this.towers[team === 'red' ? 0 : 1]
  }

  private setMood(t: Tower, mood: Mood): void {
    if (t.mood !== mood) {
      t.mood = mood
      t.moodT = 0
    }
  }

  private resetTower(t: Tower): void {
    t.bricks = []
    t.score = 0
    t.roof = null
    t.lit = 0
    t.builderY.set(this.topOf(0))
  }

  /** 补砖：从现有层数到 score，逐块错开落下；连对的劲头还在就掉得更急 */
  private addBricks(t: Tower, score: number): void {
    const g = this.geo
    const from = t.bricks.length
    for (let level = from + 1; level <= score; level++) {
      const b: Brick = { level, y: new Tween(-g.blockH * 1.5, this.animated ? ease.outBounce : ease.linear), delay: (level - from - 1) * STAGGER, landed: false }
      const dur = this.animated ? FALL_TIME * (1 - t.rush.value * 0.35) : FALL_TIME_REDUCED
      b.y.to(this.brickTop(level), dur)
      t.bricks.push(b)
    }
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    const scores: Record<Team, number> = { red: s.red, blue: s.blue }
    for (const t of this.towers) {
      const score = scores[t.team]
      if (s.phase === 'lobby' || s.phase === 'countdown') {
        this.resetTower(t)
        this.setMood(t, 'ready')
        continue
      }
      if (score < t.bricks.length) this.resetTower(t)
      if (score > t.bricks.length) this.addBricks(t, score)
      t.score = score
      if (s.phase === 'ended' && s.winner) {
        if (t.team === s.winner) {
          if (t.mood !== 'win') {
            this.setMood(t, 'win')
            t.roof = new Tween(-this.geo.roofH * 3, this.animated ? ease.outBounce : ease.linear)
            t.roof.to(this.brickTop(this.target), this.animated ? 0.9 : 0.3)
          }
        } else this.setMood(t, 'lose')
      } else if (t.mood !== 'idle') this.setMood(t, 'idle')
    }
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.fireworksLeft = 0
    }
  }

  private fireworks(team: Team): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const x = g.colX[team === 'red' ? 0 : 1]
    const colors = team === 'red' ? ['#ff6b6b', '#ffc93c', '#ffffff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#ffffff', '#8fc3ff']
    this.particles.emit({
      x: x + (this.rng.next() - 0.5) * g.W * 0.3,
      y: this.brickTop(this.target) - g.roofH * 2 - this.rng.next() * g.H * 0.08,
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

  private land(t: Tower, b: Brick): void {
    const g = this.geo
    b.landed = true
    t.squash.kick(1)
    t.hop.kick(1)
    t.builderY.to(this.topOf(b.level), this.animated ? 0.3 : 0)
    if (this.animated && this.quality < 2) {
      const x = g.colX[t.team === 'red' ? 0 : 1]
      const y = b.y.value + g.blockH
      this.particles.emit({
        x,
        y,
        count: 6 + Math.round(t.dust.value * 4),
        speed: (35 + t.dust.value * 20) * g.k,
        angle: -Math.PI / 2,
        spread: Math.PI * 1.6,
        life: 0.5,
        size: 2.8 * g.k,
        colors: ['#e6d3a8', '#f3e5c2'],
        gravity: 60 * g.k,
        drag: 2,
      })
    }
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const t of this.towers) this.setMood(t, 'ready')
        break
      case 'go':
        for (const t of this.towers) {
          t.hop.kick(1)
          t.cheer.kick(1)
        }
        break
      case 'point': {
        const t = this.tower(e.team)
        t.dust.kick(Math.min(1, (e.streak - 1) * 0.4))
        if (e.streak >= 2) t.rush.kick(Math.min(1, (e.streak - 1) * 0.4))
        break
      }
      case 'streak': {
        const t = this.tower(e.team)
        t.dust.kick(1)
        t.rush.kick(1)
        break
      }
      case 'lead':
        this.tower(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        break
      case 'finished':
        this.fireworksLeft = FIREWORK_ROUNDS - 1
        this.fireworkT = 0
        this.fireworks(e.winner)
        break
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：工人蹦一下、举手 */
  /** 终局特写（B63）要对准的点：这一队的角色现在在盒子里的位置 */
  focus(team: Team): { x: number; y: number } {
    const g = this.geo
    const i = team === 'red' ? 0 : 1
    const tw = this.towers[i]!
    return { x: g.colX[i]!, y: tw.builderY.value - g.size * 0.5 }
  }
  poke(team: Team): void {
    const t = this.tower(team)
    t.hop.kick(1)
    t.cheer.kick(0.6)
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
        if (c.x - c.s * 1.5 > g.W) c.x = -c.s * 1.8
      }
      if (!g.compact) {
        if (this.bird) {
          this.bird.x += this.bird.v * dt
          this.bird.flap = advancePhase(this.bird.flap, dt, 4)
          if (this.bird.x > g.W + 20) this.bird = null
        } else {
          this.nextBird -= dt
          if (this.nextBird <= 0) {
            this.nextBird = 6 + this.rng.next() * 5
            this.bird = { x: -20, y: g.skyH * (0.15 + this.rng.next() * 0.3), v: (28 + this.rng.next() * 14) * g.k, flap: 0 }
          }
        }
      }
    }
    this.flagWave += dt * 6
    if (this.fireworksLeft > 0 && this.winner) {
      this.fireworkT += dt
      if (this.fireworkT >= FIREWORK_GAP) {
        this.fireworkT = 0
        this.fireworksLeft -= 1
        this.fireworks(this.winner)
      }
    }
    for (const t of this.towers) {
      t.moodT += dt
      t.squash.step(dt)
      t.dust.step(dt)
      t.hop.step(dt)
      t.cheer.step(dt)
      t.rush.step(dt)
      t.look.step(dt)
      t.blink.step(dt)
      t.builderY.step(dt)
      t.hammer = advancePhase(t.hammer, dt, t.mood === 'win' ? 2.5 : t.mood === 'ready' ? 2 : 0.6)
      for (const b of t.bricks) {
        if (b.landed) continue
        if (b.delay > 0) {
          b.delay -= dt
          continue
        }
        b.y.step(dt)
        if (b.y.done) this.land(t, b)
      }
      if (t.roof) {
        if (!t.roof.done) {
          t.roof.step(dt)
          if (t.roof.done) {
            // 屋顶落稳：楼被压一下，工人跳上屋脊
            t.squash.kick(1)
            t.hop.kick(1)
            t.builderY.to(this.builderHome(t), animated ? 0.3 : 0)
          }
        } else if (animated) t.lit = Math.max(0, Math.min(this.target, Math.floor((t.moodT - 0.9) * 7)))
        else t.lit = this.target
      }
    }
    this.particles.step(dt)
  }

  /** 楼顶落稳的砖数 */
  landedCount(t: Tower): number {
    return t.bricks.filter((b) => b.landed).length
  }

  /** 工人离地高度 */
  liftOf(t: Tower): number {
    const g = this.geo
    if (!this.animated) return 0
    if (t.mood === 'ready') return Math.abs(Math.sin(t.hammer * 2)) * g.size * 0.35
    if (t.mood === 'win') return Math.abs(Math.sin(t.hammer)) * g.size * 0.45
    return t.hop.value * g.size * 0.4
  }

  /** 整座楼的压缩比（落砖瞬间） */
  squashOf(t: Tower): number {
    return this.animated ? 1 - t.squash.value * 0.06 : 1
  }
}
