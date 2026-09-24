/**
 * 拔河的纯模型（需求 B36d）：快照 + 事件 + 时间 → 场景数据（蝴蝶结位置、四只角色的位置与姿势、绳子的锚点、观众、云、粒子）。
 * 不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { Actor, RIGHT_TIME, WRONG_TIME, actEvent, actState, type Gesture } from '@/battle/game/engine/act'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Blinker, Decay, advancePhase } from '@/battle/game/engine/rig'
import { clamp, clamp01, ease, lerp, Tween } from '@/battle/game/engine/tween'
import type { CritterKind } from '@/battle/game/sprites/scenery'

export interface TugGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 120px 高的缩放 */
  k: number
  /** 角色身高 */
  size: number
  /** 脚下的地面 y */
  groundY: number
  /** 绳子（手抓的高度）y */
  ropeY: number
  centerX: number
  /** 比赛中蝴蝶结到两队前排手的距离 */
  ropeHalf: number
  /** 同队两只的间距 */
  spacing: number
  /** 比分差拉满时蝴蝶结的最大偏移 */
  maxShift: number
  puddleRx: number
  puddleRy: number
  /** 水坑中心 y */
  puddleY: number
  skyH: number
  /** 观众的 x（左两只是红队粉丝、右两只是蓝队粉丝；紧凑版没有） */
  crowdX: number[]
}

export function layoutTug(W: number, H: number, compact: boolean): TugGeometry {
  const k = H / 120
  const size = compact ? Math.min(26, H * 0.47) : 44 * k
  const groundY = compact ? H * 0.9 : H * 0.86
  const spacing = size * 1.15
  // 两头留给观众的位置（紧凑版没有观众）
  const edge = compact ? size * 0.8 : size * 2
  const centerX = W / 2
  // 赢的时候整套（胜方 + 绳子 + 蝴蝶结）往胜方那边挪 1.75 个 ropeHalf，后排那只还得在画面里、不压到观众
  const ropeHalf = Math.max(size, Math.min(W * 0.17, (centerX - spacing - size * 0.5 - edge) / 1.75))
  // 比分差拉满时的偏移尽量大（一分就看得出来），同样不压到观众
  const maxShift = Math.min(W * 0.22, Math.max(0, centerX - ropeHalf - spacing - size * 0.5 - edge))
  return {
    W,
    H,
    compact,
    k,
    size,
    groundY,
    ropeY: groundY - size * 0.5,
    centerX,
    ropeHalf,
    spacing,
    maxShift,
    puddleRx: size * 1.5,
    puddleRy: compact ? size * 0.16 : size * 0.22,
    puddleY: groundY + size * (compact ? 0.05 : 0.12),
    skyH: compact ? H * 0.5 : H * 0.55,
    crowdX: compact ? [] : [W * 0.03, W * 0.075, W * 0.925, W * 0.97],
  }
}

export type Mood = 'idle' | 'ready' | 'win' | 'lose'

export interface Puller {
  kind: CritterKind
  x: Tween
  blink: Blinker
  /** 摔进水坑 0…1 */
  fallen: Tween
  /** 已经溅过水花 */
  splashed: boolean
  /** 脚下打滑（被对方拉动时） */
  slip: Decay
  dustT: number
}

export interface Side {
  team: Team
  score: number
  /** [前排, 后排] */
  members: [Puller, Puller]
  /** 用力（得分时猛拉） */
  strain: Decay
  /** 被拉得踉跄前倾 */
  stumble: Decay
  /** 被反超冒汗 */
  sweat: Decay
  /** 松手 0…1（赢了欢呼、输了摔倒后绳子落地） */
  release: Tween
  mood: Mood
  moodT: number
  /** 原地蹦 / 欢呼跳的相位 */
  hop: number
  /** 一题里的表演（B72）：一队一个演员，两个人一起演 */
  act: Actor
  /** 等答题时按呼吸的节奏一起一拉的相位 */
  heave: number
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface Pt {
  x: number
  y: number
}

export interface RopeAnchors {
  redBack: Pt
  redFront: Pt
  blueFront: Pt
  blueBack: Pt
  bow: Pt
  sag: number
}

export interface Targets {
  bow: number
  red: [number, number]
  blue: [number, number]
}

export interface TugOptions {
  reducedMotion: boolean
}

/** 得分位移时长（秒） */
export const MOVE_TIME = 0.7
export const MOVE_TIME_REDUCED = 0.3
/** 结束时把对方拖进水坑的时长 */
export const DRAG_TIME = 0.9
/** 冲刺状态：任一队 ≥ 目标 − 2 */
export const SPRINT_FROM = 2

const CROWD = 4
/**
 * 等答题时的小动作（B72）：拔河的手不离开绳子，所以换成——使一把劲（nod 那一拍）、重新握一下绳（scratch 那一拍）、
 * 回头张望、脚下挪一挪（hop 那一拍）
 */
export const TUG_GESTURES: readonly Gesture[] = ['nod', 'scratch', 'look', 'hop']
/** 同队第二个人比第一个慢这么多（弧度），一起一拉时不是完全同步 */
const MEMBER_LAG = 0.7
const KINDS: Record<Team, [CritterKind, CritterKind]> = { red: ['bear', 'pig'], blue: ['panda', 'monkey'] }

export class TugModel {
  geo: TugGeometry = layoutTug(1000, 120, false)
  sides: [Side, Side]
  bow = new Tween(500, ease.outBack)
  /** 得分时蝴蝶结抖一下 */
  bowKick = new Decay(0.3)
  /** 点一下（B59）：那一队蹦一下 */
  pokeHop: [Decay, Decay] = [new Decay(0.45), new Decay(0.45)]
  /** 还差一分时蝴蝶结发光 */
  bowGlow = new Decay(0.8)
  clouds: Cloud[] = []
  crowdWave: number[] = Array.from({ length: CROWD }, () => 0)
  crowdJump = 0
  /** 涟漪计时（-1 = 没有） */
  rippleT = -1
  rippleX = 0
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  particles: ParticlePool
  /** 降级等级（1 停云与观众摆动，2 停粒子） */
  quality = 0
  private readonly rng: RNG
  private readonly opts: TugOptions

  constructor(rng: RNG, opts: TugOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.sides = [this.makeSide('red'), this.makeSide('blue')]
    this.layout(1000, 120, false)
  }

  private makeSide(team: Team): Side {
    const kinds = KINDS[team]
    const member = (kind: CritterKind): Puller => ({
      kind,
      x: new Tween(0, ease.outBack),
      blink: new Blinker(this.rng),
      fallen: new Tween(0, ease.outBounce),
      splashed: false,
      slip: new Decay(0.35),
      dustT: 0,
    })
    return {
      team,
      score: 0,
      members: [member(kinds[0]), member(kinds[1])],
      strain: new Decay(0.5),
      stumble: new Decay(0.4),
      sweat: new Decay(0.8),
      release: new Tween(0, ease.outQuad),
      mood: 'idle',
      moodT: 0,
      hop: this.rng.next() * Math.PI * 2,
      act: new Actor(this.rng, TUG_GESTURES, !this.opts.reducedMotion),
      heave: this.rng.next() * Math.PI * 2,
    }
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  side(team: Team): Side {
    return this.sides[team === 'red' ? 0 : 1]
  }

  /** 比赛中蝴蝶结的 x：只由比分差决定，红队领先偏左 */
  bowXFor(red: number, blue: number): number {
    const pull = clamp((red - blue) / this.target, -1, 1)
    return this.geo.centerX - pull * this.geo.maxShift
  }

  /** 各处该在的位置；winner 非空是结束时的姿势（负方在水坑里、胜方在自己那边） */
  targets(red: number, blue: number, winner: Team | null): Targets {
    const g = this.geo
    if (winner) {
      const dir = winner === 'red' ? -1 : 1
      const bow = g.centerX + dir * g.ropeHalf * 0.75
      const winFront = bow + dir * g.ropeHalf
      const loseFront = g.centerX + dir * g.puddleRx * 0.35
      const win: [number, number] = [winFront, winFront + dir * g.spacing]
      const lose: [number, number] = [loseFront, loseFront - dir * g.spacing * 0.85]
      return winner === 'red' ? { bow, red: win, blue: lose } : { bow, red: lose, blue: win }
    }
    const bow = this.bowXFor(red, blue)
    return { bow, red: [bow - g.ropeHalf, bow - g.ropeHalf - g.spacing], blue: [bow + g.ropeHalf, bow + g.ropeHalf + g.spacing] }
  }

  private resetHold(side: Side): void {
    side.release.set(0)
    for (const m of side.members) {
      m.fallen.set(0)
      m.splashed = false
    }
  }

  private setMood(side: Side, mood: Mood): void {
    if (side.mood === mood) return
    if ((side.mood === 'win' || side.mood === 'lose') && mood !== 'win' && mood !== 'lose') this.resetHold(side)
    side.mood = mood
    side.moodT = 0
  }

  private currentTargets(): Targets {
    const reset = this.phase === 'lobby' || this.phase === 'countdown'
    const [r, b] = this.sides
    return reset ? this.targets(0, 0, null) : this.targets(r.score, b.score, this.phase === 'ended' ? this.winner : null)
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutTug(W, H, compact)
    const tg = this.currentTargets()
    this.bow.set(tg.bow)
    for (const side of this.sides) side.members.forEach((m, i) => m.x.set(tg[side.team][i]!))
    const n = compact ? 1 : 3
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 80,
      y: this.geo.skyH * (0.15 + this.rng.next() * 0.4),
      s: (compact ? 8 : 14) * (0.8 + this.rng.next() * 0.5),
      v: (compact ? 6 : 10) * (0.7 + this.rng.next() * 0.6),
    }))
  }

  setState(s: GameState): void {
    actState(s, (t) => this.side(t).act)
    this.target = Math.max(1, s.target)
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    const scores: Record<Team, number> = { red: s.red, blue: s.blue }
    const reset = s.phase === 'lobby' || s.phase === 'countdown'
    const ended = s.phase === 'ended' && s.winner !== null
    for (const side of this.sides) side.score = scores[side.team]
    const tg = this.currentTargets()
    const animated = this.animated
    const moveDur = animated ? MOVE_TIME : MOVE_TIME_REDUCED
    const dragDur = animated ? DRAG_TIME : MOVE_TIME_REDUCED
    // 蝴蝶结：比赛中带过冲弹过去，结束时被拖到胜方那边
    if (reset) this.bow.set(tg.bow)
    else if (Math.abs(this.bow.target - tg.bow) > 0.01) {
      const towardRed = tg.bow < this.bow.target
      if (ended) this.bow.to(tg.bow, dragDur, animated ? ease.outCubic : ease.linear)
      else {
        this.bow.to(tg.bow, moveDur, animated ? ease.outBack : ease.linear)
        this.bowKick.kick(1)
        // 拉动的一方用力后仰，被拉的一方踉跄打滑
        const puller = this.side(towardRed ? 'red' : 'blue')
        const other = this.side(towardRed ? 'blue' : 'red')
        puller.strain.kick(0.8)
        other.stumble.kick(0.7)
        for (const m of other.members) m.slip.kick(1)
      }
    }
    for (const side of this.sides) {
      const goals = tg[side.team]
      if (reset) {
        side.members.forEach((m, i) => m.x.set(goals[i]!))
        this.resetHold(side)
        this.setMood(side, 'ready')
        continue
      }
      const mood: Mood = ended ? (s.winner === side.team ? 'win' : 'lose') : 'idle'
      this.setMood(side, mood)
      const dur = ended ? dragDur : moveDur
      const fn = !animated ? ease.linear : ended ? ease.outCubic : ease.outBack
      side.members.forEach((m, i) => {
        if (Math.abs(m.x.target - goals[i]!) > 0.01) m.x.to(goals[i]!, dur, fn)
      })
    }
    if (reset) {
      this.particles.clear()
      this.crowdJump = 0
      this.rippleT = -1
      this.bowGlow.value = 0
      this.bowKick.value = 0
    }
    if (prevPhase === 'countdown' && s.phase === 'playing') this.go()
  }

  /** 开始：两队同时用力，绳子绷直 */
  private go(): void {
    for (const side of this.sides) side.strain.kick(0.6)
  }

  private fans(team: Team): number[] {
    return team === 'red' ? [0, 1] : [2, 3]
  }

  onEvent(e: GameEvent): void {
    actEvent(e, (t) => this.side(t).act)
    switch (e.type) {
      case 'answered':
        // 答错（B72）：脚下一滑往前一栽，前脚那儿扬一小撮土
        if (e.team && !e.correct && this.phase === 'playing') this.slipDust(this.side(e.team))
        break
      case 'countdown':
        for (const side of this.sides) this.setMood(side, 'ready')
        break
      case 'go':
        this.go()
        break
      case 'point': {
        this.side(e.team).strain.kick(Math.min(1, 0.7 + (e.streak - 1) * 0.15))
        for (const i of this.fans(e.team)) this.crowdWave[i] = 1
        break
      }
      case 'streak':
        this.side(e.team).strain.kick(1)
        for (const i of this.fans(e.team)) this.crowdWave[i] = 1
        break
      case 'lead':
        // 被反超的一方冒汗
        this.side(e.team === 'red' ? 'blue' : 'red').sweat.kick(1)
        break
      case 'nearWin':
        this.bowGlow.kick(1)
        break
      case 'finished': {
        this.crowdJump = 1
        if (this.animated && this.quality < 2) {
          const g = this.geo
          const win = this.side(e.winner)
          const colors = e.winner === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
          this.particles.emit({
            x: (win.members[0].x.target + win.members[1].x.target) / 2,
            y: g.ropeY - g.size * 0.8,
            count: 26,
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
      }
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：那一队使一把劲、蝴蝶结抖一下、蹦一下 */
  /** 终局特写（B63）要对准的点：这一队的角色现在在盒子里的位置 */
  focus(team: Team): { x: number; y: number } {
    const g = this.geo
    const i = team === 'red' ? 0 : 1
    const side = this.sides[i]!
    return { x: side.members[0]!.x.value, y: g.groundY - g.size * 0.5 }
  }
  poke(team: Team): void {
    const side = this.side(team)
    side.strain.kick(0.8)
    this.bowKick.kick(0.6)
    this.pokeHop[team === 'red' ? 0 : 1]!.kick(1)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 2) this.particles.clear()
  }

  /** 答错时前脚滑出去扬的一小撮土 */
  private slipDust(side: Side): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const facing = side.team === 'red' ? 1 : -1
    const m = side.members[0]
    this.particles.emit({
      x: m.x.value + facing * g.size * 0.45,
      y: g.groundY,
      count: 5,
      speed: 50 * g.k,
      angle: facing > 0 ? 0 : Math.PI,
      spread: Math.PI * 0.6,
      life: 0.5,
      size: 2.6 * g.k,
      colors: ['#e6d3a8', '#f3e5c2'],
      gravity: -20 * g.k,
      drag: 2.5,
    })
  }

  private splash(side: Side, m: Puller): void {
    const g = this.geo
    m.splashed = true
    m.fallen.to(1, this.animated ? 0.45 : 0)
    side.release.to(1, this.animated ? 0.3 : 0)
    if (!this.animated) return
    this.rippleT = 0
    this.rippleX = m.x.value
    if (this.quality >= 2) return
    this.particles.emit({
      x: m.x.value,
      y: g.groundY - 2 * g.k,
      count: 14,
      speed: 110 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.1,
      life: 0.7,
      size: 3 * g.k,
      colors: ['#8fd0ff', '#ffffff', '#5eb8ff'],
      gravity: 260 * g.k,
    })
  }

  step(dt: number): void {
    this.time += dt
    for (const p of this.pokeHop) p.step(dt)
    const g = this.geo
    const animated = this.animated
    if (animated && this.quality < 1) {
      for (const c of this.clouds) {
        c.x += c.v * dt
        if (c.x - c.s * 1.2 > g.W) c.x = -c.s * 1.5
      }
    }
    for (let i = 0; i < CROWD; i++) {
      const w = this.crowdWave[i]!
      this.crowdWave[i] = this.sprint ? Math.max(0.5, w) : w > 0.001 ? w * Math.pow(0.5, dt / 0.6) : 0
    }
    if (this.crowdJump > 0) this.crowdJump += dt
    this.bow.step(dt)
    this.bowKick.step(dt)
    this.bowGlow.step(dt)
    if (this.rippleT >= 0) {
      this.rippleT += dt
      if (this.rippleT > 1.4) this.rippleT = -1
    }
    for (const side of this.sides) {
      side.moodT += dt
      side.act.step(dt)
      if (animated && this.phase === 'playing') side.heave = advancePhase(side.heave, dt, 0.55)
      side.strain.step(dt)
      side.stumble.step(dt)
      side.sweat.step(dt)
      side.release.step(dt)
      if (animated) {
        if (side.mood === 'ready') side.hop = advancePhase(side.hop, dt, 2)
        else if (side.mood === 'win') side.hop = advancePhase(side.hop, dt, 2.6)
      }
      const facing = side.team === 'red' ? 1 : -1
      for (const m of side.members) {
        m.x.step(dt)
        m.blink.step(dt)
        m.slip.step(dt)
        m.fallen.step(dt)
        if (animated && this.quality < 2 && m.slip.value > 0.25 && !m.x.done) {
          m.dustT += dt
          if (m.dustT > 0.08) {
            m.dustT = 0
            this.particles.emit({
              x: m.x.value + facing * g.size * 0.2,
              y: g.groundY,
              count: 2,
              speed: 40 * g.k,
              angle: facing > 0 ? Math.PI : 0,
              spread: Math.PI * 0.7,
              life: 0.5,
              size: 2.6 * g.k,
              colors: ['#e6d3a8', '#f3e5c2'],
              gravity: -20 * g.k,
              drag: 2.5,
            })
          }
        }
        if (side.mood === 'lose' && m.x.done && !m.splashed) this.splash(side, m)
      }
      if (side.mood === 'win' && side.release.target === 0 && side.members.every((m) => m.x.done)) side.release.to(1, animated ? 0.35 : 0)
    }
    this.particles.step(dt)
  }

  /** 后仰程度（负数是被拉得前倾）；i 是第几个人（一起一拉时后面那个慢半拍） */
  leanOf(side: Side, i = 0): number {
    if (!this.animated) return side.mood === 'idle' ? 0.35 : 0.1
    switch (side.mood) {
      case 'ready':
        return 0.08
      case 'win':
        return side.release.value > 0.5 ? 0.1 : 0.9
      case 'lose':
        return -0.3
      default:
        return clamp(0.3 + side.strain.value * 0.55 - side.stumble.value * 0.5 + (this.sprint ? 0.12 + Math.sin(this.time * 30) * 0.04 : 0) + this.actLean(side, i), -0.8, 1.1)
    }
  }

  /**
   * 一题里的表演（B72）叠到后仰上：等答题时按呼吸一仰一回、隔一会儿使一把劲；按键脚跟蹬地更往后仰（每按一下再仰一下）；
   * 答对先往前一送再使劲一拽；答错脚下一滑往前一栽再站回来（手不离开绳子，绳子与蝴蝶结只看比分）
   */
  actLean(side: Side, i = 0): number {
    const a = side.act
    if (!this.animated || !a.playing) return 0
    let l = 0.16 * Math.sin(side.heave - i * MEMBER_LAG) + 0.24 * a.typing + 0.14 * a.press.value
    if (a.gesture === 'nod') l += 0.28 * Math.sin(Math.PI * clamp01(a.gestureT))
    if (a.rightT >= 0) {
      const q = a.rightT / RIGHT_TIME
      l += q < 0.1 ? -0.18 * (q / 0.1) : 0.6 * Math.sin(Math.PI * clamp01((q - 0.1) / 0.6))
    }
    l -= 0.9 * this.slipOf(side)
    return l
  }

  /** 答错脚下一滑的程度 0…1：一下滑出去，愣一会儿，再慢慢站回来 */
  slipOf(side: Side): number {
    const a = side.act
    if (!this.animated || a.wrongT < 0) return 0
    const q = a.wrongT / WRONG_TIME
    if (q < 0.15) return ease.outCubic(q / 0.15)
    if (q < 0.45) return 1
    return 1 - ease.inOutSine((q - 0.45) / 0.55)
  }

  /** 用力（眯眼咬牙）：得分猛拉、按键蓄力、答对那一拽 */
  strainOf(side: Side): number {
    const a = side.act
    const yank = a.rightT >= 0 && a.rightT < RIGHT_TIME * 0.55 ? 1 : 0
    return Math.max(side.strain.value, a.typing * 0.7, yank)
  }

  /** 脚下挪一挪（hop 那一拍）0…1 */
  shuffleOf(side: Side): number {
    const a = side.act
    return this.animated && a.gesture === 'hop' ? Math.sin(Math.PI * clamp01(a.gestureT)) : 0
  }

  /** 离地高度（倒数原地蹦、赢了跳、被点了一下那一队蹦一下、答对拽完蹦两下） */
  liftOf(side: Side, i: number): number {
    const g = this.geo
    const t = side.team === 'red' ? 0 : 1
    const a = side.act
    // 表演的跳：答对那一拍收一收（手还抓着绳），脚下挪一挪那一拍只是小碎步，答错不跳
    const act = a.wrongT >= 0 || a.gesture === 'hop' ? 0 : a.pose().lift * 0.4
    return this.liftOfBase(side, i) + (this.pokeHop[t]!.value * 0.3 + act) * g.size
  }

  private liftOfBase(side: Side, i: number): number {
    const g = this.geo
    if (!this.animated) return 0
    if (side.mood === 'ready') return Math.abs(Math.sin(side.hop + i * 1.3)) * g.size * 0.28
    if (side.mood === 'win' && side.release.value > 0.5) return Math.abs(Math.sin(side.hop + i * 1.5)) * g.size * 0.4
    return 0
  }

  /** 是否举手欢呼 */
  cheerOf(side: Side): number {
    return side.mood === 'win' ? side.release.value : 0
  }

  /** 绳子中间的下垂量 */
  sagOf(): number {
    const g = this.geo
    if (this.phase === 'lobby' || this.phase === 'countdown') return g.size * 0.35
    if (this.sprint || this.phase === 'ended') return 0
    const strain = Math.max(this.sides[0].strain.value, this.sides[1].strain.value)
    return g.size * 0.12 * (1 - strain)
  }

  /** 绳子的锚点：手抓着就在手上，松手 / 摔倒后落到地上 */
  anchors(): RopeAnchors {
    const g = this.geo
    const pt = (side: Side, i: number): Pt => {
      const m = side.members[i]!
      const facing = side.team === 'red' ? 1 : -1
      const held: Pt = { x: m.x.value + facing * 0.5 * g.size, y: g.ropeY - this.liftOf(side, i) }
      const rel = Math.max(side.release.value, m.fallen.value)
      return { x: held.x, y: lerp(held.y, g.groundY - g.k * 1.2, rel) }
    }
    const [red, blue] = this.sides
    const redFront = pt(red, 0)
    const blueFront = pt(blue, 0)
    const sag = this.sagOf()
    const shiver = this.sprint && this.animated ? Math.sin(this.time * 55) * 1.2 * g.k : 0
    return {
      redBack: pt(red, 1),
      redFront,
      blueFront,
      blueBack: pt(blue, 1),
      bow: { x: this.bow.value, y: (redFront.y + blueFront.y) / 2 + sag + shiver },
      sag,
    }
  }
}
