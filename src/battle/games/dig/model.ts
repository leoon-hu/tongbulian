/**
 * 挖宝的纯模型（需求 B36k）：快照 + 事件 + 时间 → 场景数据（两只角色挖到的深度与姿势、宝箱开合、云、蚯蚓、宝石闪烁、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { RIGHT_TIME, WRONG_TIME, actEvent, type Gesture } from '@/battle/game/engine/act'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import { GEM_COLORS, type DiggerKind } from '@/battle/game/sprites/dig'

export interface DigGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 150px 宽的缩放 */
  k: number
  /** 两口井的中心 x（红左蓝右） */
  shaftX: [number, number]
  shaftW: number
  /** 角色身高 */
  size: number
  /** 地面 y（第 0 层：站在草地上） */
  surfaceY: number
  /** 每层的厚度 */
  pitch: number
  /** 宝箱的顶边（第 8 层：脚踩在宝箱上）与尺寸 */
  chestTop: number
  chestW: number
  chestH: number
}

export function layoutDig(W: number, H: number, compact: boolean): DigGeometry {
  const k = W / 150
  const size = compact ? Math.min(28, W * 0.32) : 38 * k
  const surfaceY = compact ? 12 : 40 * k
  const chestH = size * 0.62
  const chestTop = H - (compact ? 6 : 12 * k) - chestH
  return {
    W,
    H,
    compact,
    k,
    shaftX: [W * 0.27, W * 0.73],
    shaftW: size * 1.05,
    size,
    surfaceY,
    pitch: (chestTop - surfaceY) / 8,
    chestTop,
    chestW: size * 0.95,
    chestH,
  }
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface Glint {
  x: number
  y: number
  phase: number
  color: string
}

export interface DigOptions {
  reducedMotion: boolean
}

export const DIG_TIME = 0.8
export const DIG_TIME_REDUCED = 0.3
export const SPRINT_FROM = 2
export const GEM_ROUNDS = 3
export const GEM_GAP = 0.5
export const OPEN_TIME = 0.6
/**
 * 等答题时的小动作（B72）：stretch = 拄着镐歇一歇、scratch = 擦汗、nod = 用镐轻敲地面、look = 抬头看
 */
export const DIG_GESTURES: readonly Gesture[] = ['stretch', 'scratch', 'nod', 'look']
/** 答对那一拍镐刨下去的时刻（× RIGHT_TIME）：土块飞 */
export const STRIKE_AT = 0.2
/** 答错那一拍镐碰到石头的时刻（× WRONG_TIME）：迸两颗火星 */
export const CLANG_AT = 0.1

export class DigModel {
  geo: DigGeometry = layoutDig(150, 700, false)
  diggers: [Racer, Racer]
  readonly kinds: [DiggerKind, DiggerKind] = ['mole', 'badger']
  /** 宝箱打开程度 */
  chestOpen: [Tween, Tween] = [new Tween(0, ease.outBack), new Tween(0, ease.outBack)]
  /** 还差一分：宝箱闪光 */
  chestGlow: [Decay, Decay] = [new Decay(1), new Decay(1)]
  private opened: [boolean, boolean] = [false, false]
  private swingT: [number, number] = [0, 0]
  /** 上一帧答对 / 答错那一拍进行到哪（秒），看有没有走过刨下去 / 碰到石头的时刻 */
  private lastRight: [number, number] = [-1, -1]
  private lastWrong: [number, number] = [-1, -1]
  clouds: Cloud[] = []
  glints: Glint[] = []
  /** 蚯蚓：探出的程度、还要露多久（> 0 = 正露着）、下次探头的倒计时 */
  worm = { x: 0, y: 0, out: 0, show: 0, timer: 4 }
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  quality = 0
  private gemLeft = 0
  private gemT = 0
  private readonly rng: RNG
  private readonly opts: DigOptions

  constructor(rng: RNG, opts: DigOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.diggers = [new Racer('red', rng, undefined, DIG_GESTURES), new Racer('blue', rng, undefined, DIG_GESTURES)]
    this.layout(150, 700, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: DIG_TIME, moveTimeReduced: DIG_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutDig(W, H, compact)
    for (const d of this.diggers) d.pos.set(this.yFor(d.score, d.mood === 'win'))
    const g = this.geo
    const n = compact ? 0 : 2
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 30,
      y: g.surfaceY * (0.25 + this.rng.next() * 0.35),
      s: 7 * (0.8 + this.rng.next() * 0.5),
      v: 5 * (0.7 + this.rng.next() * 0.6),
    }))
    // 深处土层里的宝石（避开两口井）
    this.glints = compact
      ? []
      : Array.from({ length: 6 }, (_, i) => ({
          x: [W * 0.08, W * 0.5, W * 0.92, W * 0.45, W * 0.1, W * 0.55][i]!,
          y: g.surfaceY + g.pitch * (4.5 + i * 0.55),
          phase: this.rng.next() * Math.PI * 2,
          color: GEM_COLORS[i % GEM_COLORS.length]!,
        }))
    this.worm = { x: W * 0.5, y: g.surfaceY + g.pitch * 1.6, out: 0, show: 0, timer: 3 + this.rng.next() * 4 }
  }

  /** 得 score 分时脚下的 y（第 score 层的底），赢了站在宝箱上 */
  yFor(score: number, won = false): number {
    const g = this.geo
    if (won) return g.chestTop
    return g.surfaceY + g.pitch * clamp(score, 0, this.target) * (8 / this.target)
  }

  digger(team: Team): Racer {
    return this.diggers[team === 'red' ? 0 : 1]
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    this.diggers.forEach((d, i) => {
      const forward = d.apply(s, (score, won) => this.yFor(score, won), this.timing)
      if (forward) this.dirt(i, 4 + Math.round(d.boost.value * 3))
    })
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
    if (s.phase === 'countdown' || s.phase === 'lobby') {
      this.particles.clear()
      this.gemLeft = 0
      for (const gl of this.chestGlow) gl.value = 0
    }
    // 不在结束态就把箱盖合上（新一局；测试里也会直接从结束跳回比赛中）
    if (s.phase !== 'ended') {
      this.gemLeft = 0
      for (let i = 0; i < 2; i++) {
        if (this.opened[i]) {
          this.opened[i] = false
          this.chestOpen[i]!.set(0)
        }
      }
    }
    // 晚进来的观战者：已经结束的局直接把胜方的宝箱画成开着的
    if (s.phase === 'ended' && s.winner) {
      const i = s.winner === 'red' ? 0 : 1
      if (this.opened[1 - i]) {
        this.opened[1 - i] = false
        this.chestOpen[1 - i]!.set(0)
      }
      const d = this.diggers[i]!
      if (!this.opened[i] && d.pos.done) this.openChest(i)
    }
  }

  /** 迸出来的泥土 */
  private dirt(i: number, n: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const d = this.diggers[i]!
    this.particles.emit({
      x: g.shaftX[i]! + g.size * 0.3,
      y: d.pos.value - g.size * 0.05,
      count: n,
      speed: 90 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.1,
      life: 0.7,
      size: 2.6 * g.k,
      colors: ['#a5713d', '#c39055', '#8a6a4a', '#d9b98a'],
      gravity: 260 * g.k,
      drag: 1.2,
    })
  }

  /** 镐碰到石头（B72）：迸两颗火星 */
  private sparks(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const d = this.diggers[i]!
    this.particles.emit({
      x: g.shaftX[i]! + g.size * 0.5,
      y: d.pos.value - g.size * 0.12,
      count: 2,
      speed: 100 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 0.7,
      life: 0.6,
      size: 4.5 * g.k,
      colors: ['#fff3a0', '#ffd24a'],
      shape: 'flake',
      gravity: 220 * g.k,
      drag: 1,
    })
  }

  private gems(i: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    this.particles.emit({
      x: g.shaftX[i]!,
      y: g.chestTop + g.chestH * 0.3,
      count: 18,
      speed: 130 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.1,
      life: 1.4,
      size: 3.5 * g.k,
      colors: GEM_COLORS,
      shape: 'flake',
      gravity: 160 * g.k,
      drag: 1.1,
    })
  }

  private openChest(i: number): void {
    this.opened[i] = true
    this.chestOpen[i]!.to(1, this.animated ? OPEN_TIME : 0.2)
    this.chestGlow[i]!.kick(1)
    this.gems(i)
    this.gemLeft = GEM_ROUNDS - 1
    this.gemT = 0
  }

  private go(): void {
    this.diggers.forEach((d, i) => {
      d.boost.kick(0.5)
      this.swingT[i] = 0
      this.dirt(i, 5)
    })
  }

  onEvent(e: GameEvent): void {
    actEvent(e, (t) => this.digger(t).act)
    switch (e.type) {
      case 'countdown':
        for (const d of this.diggers) d.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point':
        this.digger(e.team).boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        break
      case 'streak':
        this.digger(e.team).boost.kick(1)
        break
      case 'lead':
        this.digger(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.chestGlow[e.team === 'red' ? 0 : 1]!.kick(1)
        break
      case 'finished':
        // 箱盖等胜方挖到底（位移结束）再开，见 step
        break
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：蹦一下、挥几下镐 */
  /** 终局特写（B63）要对准的点：这一队的角色现在在盒子里的位置 */
  focus(team: Team): { x: number; y: number } {
    const g = this.geo
    const i = team === 'red' ? 0 : 1
    const d = this.diggers[i]!
    return { x: g.shaftX[i]!, y: d.pos.value - g.size * 0.5 }
  }
  poke(team: Team): void {
    const d = this.digger(team)
    d.poke.kick(1)
    d.boost.kick(0.6)
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
      if (!g.compact) {
        const w = this.worm
        if (w.show > 0) {
          w.show -= dt
          const target = w.show > 0.6 ? 1 : 0
          w.out += (target - w.out) * Math.min(1, dt * 4)
          if (w.show <= 0) w.out = 0
        } else {
          w.timer -= dt * (this.sprint ? 2 : 1)
          if (w.timer <= 0) {
            w.timer = 5 + this.rng.next() * 4
            w.show = 2.4
            w.out = 0
            w.x = g.W * (0.42 + this.rng.next() * 0.16)
            w.y = g.surfaceY + g.pitch * (1.2 + this.rng.next() * 1.6)
          }
        }
      }
    }
    this.diggers.forEach((d, i) => {
      d.step(dt, 2.2, animated)
      this.chestOpen[i]!.step(dt)
      this.chestGlow[i]!.step(dt)
      // 挖的时候每半个周期迸一次土
      this.swingT[i] = this.swingT[i]! + dt
      if (d.moving > 0.4 && this.swingT[i]! > 0.22 / (1 + d.boost.value * 0.6)) {
        this.swingT[i] = 0
        this.dirt(i, 2 + Math.round(d.boost.value * 2) + (this.sprint ? 1 : 0))
      }
      if (d.mood === 'win' && !this.opened[i] && d.pos.done) this.openChest(i)
      // 一题里的表演（B72）：答对使劲刨下去、土块飞；答错镐碰到石头迸火星
      const a = d.act
      const strike = STRIKE_AT * RIGHT_TIME
      if (a.rightT >= strike && this.lastRight[i]! < strike) this.dirt(i, 7)
      const clang = CLANG_AT * WRONG_TIME
      if (a.wrongT >= clang && this.lastWrong[i]! < clang) this.sparks(i)
      this.lastRight[i] = a.rightT
      this.lastWrong[i] = a.wrongT
    })
    if (this.gemLeft > 0 && this.winner) {
      this.gemT += dt
      if (this.gemT >= GEM_GAP) {
        this.gemT = 0
        this.gemLeft -= 1
        this.gems(this.winner === 'red' ? 0 : 1)
      }
    }
    this.particles.step(dt)
  }

  /** 离地高度（倒数原地蹦、胜利蹦） */
  liftOf(d: Racer): number {
    return this.liftOfBase(d) + d.poke.value * this.geo.size * 0.25
  }

  private liftOfBase(d: Racer): number {
    const g = this.geo
    if (!this.animated) return 0
    if (d.mood === 'ready') return Math.abs(Math.sin(d.hop)) * g.size * 0.12
    if (d.mood === 'win') return Math.abs(Math.sin(d.phase)) * g.size * 0.1
    return 0
  }

  /** 镐的角度：扛肩上 / 抡 / 举起 / 放下；比赛中再叠上一题里的表演（B72） */
  swingOf(d: Racer): number {
    if (d.mood === 'ready') return -1.1
    if (d.mood === 'lose') return 0.5
    if (d.mood === 'win') return d.phase
    // 抡镐：举到 −1.3 再刨到 +0.6
    const base = d.moving < 0.02 ? -0.35 + (this.animated ? Math.sin(d.hop) * 0.06 : 0) : -0.35 + Math.sin(d.phase) * 0.95 * d.moving
    return this.actSwing(d, base)
  }

  /**
   * 一题里的镐（B72）：正在按 = 举起镐蓄力（按一下再往后一压）；拄着镐歇 = 镐头朝下杵在地上；敲地面 = 镐头一下下点地；
   * 答对 = 举到头顶再使劲刨下去；答错 = 刨下去碰到石头弹回来、震得直抖。减少动画时只留举起镐（不动）
   */
  private actSwing(d: Racer, base: number): number {
    const a = d.act
    let sw = base + (-1.35 - base) * a.typing
    if (!this.animated) return sw
    sw -= a.press.value * 0.3
    if (a.gesture === 'stretch' || a.gesture === 'nod') {
      const env = Math.sin(Math.PI * Math.min(1, a.gestureT))
      const tap = a.gesture === 'nod' ? 1.0 + 0.35 * Math.abs(Math.sin(a.gestureT * Math.PI * 5)) : 1.45
      sw += (tap - sw) * env
    }
    if (a.rightT >= 0) {
      const q = a.rightT / RIGHT_TIME
      const hit = q < 0.1 ? -1.45 : q < STRIKE_AT ? -1.45 + (q - 0.1) / (STRIKE_AT - 0.1) * 2.45 : q < 0.45 ? 1.0 : 1.0 + (sw - 1.0) * Math.min(1, (q - 0.45) / 0.3)
      sw = q < 0.1 ? sw + (hit - sw) * (q / 0.1) : hit
    } else if (a.wrongT >= 0) {
      const q = a.wrongT / WRONG_TIME
      let hit: number
      if (q < CLANG_AT) hit = sw + (0.7 - sw) * (q / CLANG_AT)
      else if (q < 0.3) hit = 0.7 - ((q - CLANG_AT) / (0.3 - CLANG_AT)) * 1.6 + Math.sin(q * 90) * 0.12
      else if (q < 0.65) hit = -0.9 + Math.sin(q * 70) * 0.1 * (1 - (q - 0.3) / 0.35)
      else hit = -0.9 + (sw + 0.9) * Math.min(1, (q - 0.65) / 0.25)
      sw = hit
    }
    return sw
  }

  /** 镐碰到的那块石头露出来的程度（B72）：答错那一拍里淡入、站好前淡出 */
  rockOf(d: Racer): number {
    const a = d.act
    if (a.wrongT < 0) return 0
    const q = a.wrongT / WRONG_TIME
    return q < 0.08 ? q / 0.08 : q < 0.7 ? 1 : Math.max(0, 1 - (q - 0.7) / 0.25)
  }

  sitOf(d: Racer): number {
    return d.mood === 'lose' ? Math.min(1, d.moodT / 0.8) : 0
  }

  /** 头灯亮度：输了一闪一闪 */
  lampOf(d: Racer): number {
    if (d.mood !== 'lose' || !this.animated) return 1
    return Math.sin(this.time * 9) > 0.3 ? 1 : 0.2
  }

  swayOf(d: Racer): number {
    if (!this.animated || d.mood === 'ready') return 0
    return Math.sin(this.time * 1.4 + (d.team === 'red' ? 0 : 1.7)) * 0.2
  }

  /** 宝石闪烁的亮度 */
  glintOf(gl: Glint): number {
    if (!this.animated || this.quality >= 1) return 0.7
    return 0.35 + 0.65 * Math.max(0, Math.sin(this.time * (this.sprint ? 6 : 2.5) + gl.phase))
  }
}
