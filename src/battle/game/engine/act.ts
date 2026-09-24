/**
 * 角色表演（需求 B72）：比赛进行中每队一个「演员」。它不画角色，只把一题里的四拍——
 * 等答题（呼吸、晃、隔一会儿做个小动作，等久了冒「想」的泡泡）、正在按（灯泡一亮、身子前倾蓄力、每按一下点一下头）、
 * 答对（蓄力 → 跳起来 → 落地压扁 → 举手欢呼，头上迸亮片；连对再翻个跟头）、
 * 答错（一愣、冒汗 → 摇头 → 甩一甩 → 重新站好；不后退、不丢分，U4 没有惩罚）——
 * 变成每帧一组数（ActPose）。游戏把整体那几样（离地 / 前倾 / 晃 / 翻跟头 / 压扁拉长）交给 withActBody，
 * 手势（举手 / 挠头 / 挥手 / 张望）与表情接到自己角色的姿势上，头顶的小图标由 drawActFx 统一画。
 * 纯数据、随机数可注种子，node 里可测。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '../contract'
import { circle, ellipse, withAlpha, withTransform } from './draw'
import { Decay, advancePhase } from './rig'
import { clamp01, ease } from './tween'

/** 等答题时的小动作：张望、挠头、伸懒腰、蹦两下、挥手、点头 */
export type Gesture = 'look' | 'scratch' | 'stretch' | 'hop' | 'wave' | 'nod'

/** 答对一拍的时长（秒）：蓄力 0.1 → 跳 0.4 → 落地 0.12 → 欢呼 */
export const RIGHT_TIME = 1.1
/** 答错一拍的时长（秒）：与答错的反馈窗口（1.2 秒）一样长，下一题出来时正好站好 */
export const WRONG_TIME = 1.2
/** 开始按键时灯泡亮多久 */
export const BULB_TIME = 0.9
/** 等了这么久还没按就冒「想」的泡泡（秒）：只是「在想呢」，不是计时（U4 不计时） */
export const THINK_AFTER = 4
/** 两个小动作之间隔多久（秒） */
export const GESTURE_GAP: readonly [number, number] = [2, 4]
export const GESTURE_TIME = 1.4

export interface ActPose {
  /** 整体离地，单位 = 角色身高 */
  lift: number
  /** 朝前进方向前倾（弧度，负 = 往后仰），绕脚下转 */
  lean: number
  /** 左右晃 / 摇头（弧度），绕脚下转 */
  shake: number
  /** 翻跟头（弧度，0…2π），绕身体中心转；连对才有 */
  spin: number
  /** 压扁拉长（以脚下为基准） */
  sx: number
  sy: number
  /** 手势 0…1：举手欢呼、挠头、挥手、张望 / 回头 */
  arms: number
  scratch: number
  wave: number
  look: number
  /** 表情 0…1：瞪大眼（答错一愣）、笑眯眯（答对） */
  wide: number
  happy: number
  /** 头顶图标 0…1：想的泡泡、灯泡、汗珠；亮片是进度（0 = 没有） */
  think: number
  bulb: number
  sweat: number
  sparkle: number
  /** 正在按 0…1（平滑）与刚按了一下 0…1（很快回落）：游戏拿来做蓄力、原地小碎步、踩油门 */
  typing: number
  press: number
  /** 挥手 / 甩手的相位（弧度） */
  beat: number
  /** 演员自己的时钟（秒）：泡泡里的点一个个跳 */
  t: number
}

export const NEUTRAL_POSE: Readonly<ActPose> = Object.freeze({
  lift: 0,
  lean: 0,
  shake: 0,
  spin: 0,
  sx: 1,
  sy: 1,
  arms: 0,
  scratch: 0,
  wave: 0,
  look: 0,
  wide: 0,
  happy: 0,
  think: 0,
  bulb: 0,
  sweat: 0,
  sparkle: 0,
  typing: 0,
  press: 0,
  beat: 0,
  t: 0,
})

/** 没指定时的小动作：人形的小动物都做得出来 */
export const DEFAULT_GESTURES: readonly Gesture[] = ['look', 'scratch', 'stretch', 'hop', 'wave', 'nod']

export class Actor {
  playing = false
  /** 这一题等了多久（秒）：开打 / 答完清零，答对答错那一拍里不算 */
  waitT = 0
  /** 正在按：0…1 平滑 */
  typing = 0
  /** 每按一下点一下 */
  press = new Decay(0.09)
  /** 各拍进行了多久（秒），−1 = 没在做 */
  bulbT = -1
  rightT = -1
  wrongT = -1
  /** 这次答对是连对（3 / 5）：翻个跟头 */
  big = false
  gesture: Gesture | null = null
  gestureT = 0
  think = 0
  t = 0
  private input = ''
  private gestureWait: number
  private lastGesture: Gesture | null = null
  private breath: number
  private sway: number
  private beat = 0

  /**
   * gestures：这个角色适合做的小动作（空 = 只呼吸、不做小动作）；
   * animated = false（减少动画）时不跳不晃不做小动作，只留举手 / 表情 / 头顶图标这些静止的变化
   */
  constructor(
    private readonly rng: RNG,
    readonly gestures: readonly Gesture[] = DEFAULT_GESTURES,
    public animated = true,
  ) {
    this.breath = rng.next() * Math.PI * 2
    this.sway = rng.next() * Math.PI * 2
    this.gestureWait = this.nextGap()
  }

  private nextGap(): number {
    const [a, b] = GESTURE_GAP
    return a + this.rng.next() * (b - a)
  }

  /** 快照：阶段与这一队正在按的内容（几个人的拼在一起）；变了且不空 = 按了一下 */
  sync(phase: GameState['phase'], input: string): void {
    const playing = phase === 'playing'
    if (playing && !this.playing) this.fresh()
    if (!playing) {
      // 倒数 / 结束 / 大厅：各拍收掉，胜负动作交给游戏
      this.rightT = -1
      this.wrongT = -1
      this.bulbT = -1
      this.gesture = null
      this.waitT = 0
    }
    this.playing = playing
    if (input !== this.input) {
      if (playing && input) {
        if (!this.input) this.bulbT = 0
        this.press.kick(1)
        this.gesture = null
      }
      this.input = input
    }
  }

  private fresh(): void {
    this.waitT = 0
    this.think = 0
    this.gesture = null
    this.gestureWait = this.nextGap()
  }

  /** 这一队有人答了一题 */
  answered(correct: boolean): void {
    if (!this.playing) return
    this.fresh()
    this.bulbT = -1
    this.big = false
    if (correct) {
      this.rightT = 0
      this.wrongT = -1
    } else {
      this.wrongT = 0
      this.rightT = -1
    }
  }

  /** 连对（3 / 5）：刚开始的这一跳改成翻跟头 */
  streak(): void {
    if (this.rightT >= 0 && this.rightT < 0.3) this.big = true
  }

  get busy(): boolean {
    return this.rightT >= 0 || this.wrongT >= 0
  }

  step(dt: number): void {
    this.t += dt
    const animated = this.animated
    this.press.step(dt)
    const typingNow = this.playing && this.input !== ''
    this.typing += ((typingNow ? 1 : 0) - this.typing) * Math.min(1, dt * 8)
    if (this.bulbT >= 0) {
      this.bulbT += dt
      if (this.bulbT >= BULB_TIME) this.bulbT = -1
    }
    if (this.rightT >= 0) {
      this.rightT += dt
      if (this.rightT >= RIGHT_TIME) this.rightT = -1
    }
    if (this.wrongT >= 0) {
      this.wrongT += dt
      if (this.wrongT >= WRONG_TIME) this.wrongT = -1
    }
    if (this.playing && !this.busy && !typingNow) this.waitT += dt
    const thinkOn = this.playing && !this.busy && !typingNow && this.waitT > THINK_AFTER
    // 冒出来慢一点（带回弹），收掉要快：半大不小、半透明的泡泡看着像一团灰
    this.think += ((thinkOn ? 1 : 0) - this.think) * Math.min(1, dt * (thinkOn ? 5 : 16))
    if (animated) {
      this.breath = advancePhase(this.breath, dt, 0.9)
      this.sway = advancePhase(this.sway, dt, 0.35)
      this.beat = advancePhase(this.beat, dt, 3)
    }
    // 小动作：比赛中、没在答对答错那一拍里、没在按的时候，隔一会儿做一个
    if (this.gesture) {
      this.gestureT += dt / GESTURE_TIME
      if (this.gestureT >= 1) {
        this.gesture = null
        this.gestureWait = this.nextGap()
      }
    } else if (animated && this.playing && !this.busy && !typingNow && this.gestures.length > 0) {
      this.gestureWait -= dt
      if (this.gestureWait <= 0) this.startGesture()
    }
  }

  private startGesture(): void {
    const list = this.gestures
    let g: Gesture
    // 等久了（冒泡泡了）多半在挠头
    if (this.think > 0.5 && list.includes('scratch') && this.rng.next() < 0.6) g = 'scratch'
    else {
      const pool = list.length > 1 ? list.filter((x) => x !== this.lastGesture) : list
      g = pool[Math.floor(this.rng.next() * pool.length)] ?? list[0]!
    }
    this.gesture = g
    this.lastGesture = g
    this.gestureT = 0
  }

  /** 做个小动作（测试、点一下之外的地方用） */
  forceGesture(g: Gesture): void {
    this.gesture = g
    this.lastGesture = g
    this.gestureT = 0
  }

  pose(): ActPose {
    const p: ActPose = { ...NEUTRAL_POSE, t: this.t, beat: this.beat, think: this.think, typing: this.typing, press: this.press.value }
    const animated = this.animated
    // 头顶图标
    if (this.bulbT >= 0) {
      const q = this.bulbT / BULB_TIME
      p.bulb = q < 0.75 ? 1 : 1 - (q - 0.75) / 0.25
    }
    if (animated) {
      // 呼吸与重心晃动：一直有
      const b = Math.sin(this.breath)
      p.sy += 0.035 * b
      p.sx -= 0.02 * b
      p.shake += 0.035 * Math.sin(this.sway)
      // 正在按：前倾蓄力，每按一下点一下
      p.lean += 0.14 * this.typing
      p.sy -= 0.06 * this.typing + 0.07 * this.press.value
      p.sx += 0.04 * this.typing + 0.04 * this.press.value
    }
    if (this.gesture) this.applyGesture(p, this.gesture, this.gestureT, animated)
    if (this.rightT >= 0) this.applyRight(p, this.rightT / RIGHT_TIME, animated)
    if (this.wrongT >= 0) this.applyWrong(p, this.wrongT / WRONG_TIME, animated)
    return p
  }

  private applyGesture(p: ActPose, g: Gesture, q: number, animated: boolean): void {
    const env = Math.sin(Math.PI * clamp01(q))
    switch (g) {
      case 'look':
        p.look = Math.max(p.look, env)
        break
      case 'scratch':
        p.scratch = env
        if (animated) p.shake += 0.08 * env
        break
      case 'stretch':
        p.arms = Math.max(p.arms, 0.7 * env)
        if (animated) {
          p.sy += 0.12 * env
          p.sx -= 0.06 * env
        }
        break
      case 'hop':
        if (animated) {
          p.lift += 0.22 * Math.abs(Math.sin(q * Math.PI * 2)) * (1 - q * 0.4)
          p.sy += 0.06 * env
        }
        break
      case 'wave':
        p.wave = env
        break
      case 'nod':
        if (animated) p.lean += 0.12 * Math.sin(q * Math.PI * 4) * env
        break
    }
  }

  /** 答对：蓄力 → 跳 → 落地 → 欢呼 */
  private applyRight(p: ActPose, q: number, animated: boolean): void {
    p.happy = q < 0.62 ? 1 : 1 - (q - 0.62) / 0.38
    p.arms = Math.max(p.arms, q < 0.1 ? 0 : q < 0.62 ? (q - 0.1) / 0.52 : 1 - (q - 0.62) / 0.38)
    p.think = 0
    if (!animated) return
    p.sparkle = q > 0.08 && q < 0.95 ? (q - 0.08) / 0.87 : 0
    if (q < 0.1) {
      const k = q / 0.1
      p.sy -= 0.18 * k
      p.sx += 0.12 * k
    } else if (q < 0.5) {
      const k = (q - 0.1) / 0.4
      const up = Math.sin(Math.PI * k)
      p.lift += (this.big ? 0.75 : 0.5) * up
      p.sy += 0.14 * up
      p.sx -= 0.08 * up
      if (this.big) p.spin = Math.PI * 2 * ease.inOutSine(k)
    } else if (q < 0.62) {
      const k = Math.sin(Math.PI * ((q - 0.5) / 0.12))
      p.sy -= 0.16 * k
      p.sx += 0.1 * k
    } else {
      // 欢呼：原地蹦两下
      const k = (q - 0.62) / 0.38
      p.lift += 0.1 * Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k)
    }
  }

  /** 答错：一愣（往后一仰、瞪眼、冒汗）→ 摇头 → 甩一甩 → 站好 */
  private applyWrong(p: ActPose, q: number, animated: boolean): void {
    p.wide = q < 0.5 ? 1 : 1 - (q - 0.5) / 0.5
    p.sweat = q < 0.8 ? 1 : (1 - q) / 0.2
    p.think = 0
    if (!animated) return
    if (q < 0.12) {
      const k = q / 0.12
      p.lift += 0.12 * Math.sin(Math.PI * k)
      p.lean -= 0.22 * k
    } else if (q < 0.65) {
      const k = (q - 0.12) / 0.53
      p.lean -= 0.22 * (1 - k)
      p.shake += 0.22 * Math.sin(k * Math.PI * 6) * (1 - k * 0.6)
      p.sy -= 0.06 * Math.sin(Math.PI * k)
    } else {
      const k = (q - 0.65) / 0.35
      p.sx += 0.07 * Math.sin(k * Math.PI * 6) * (1 - k)
      p.lean += 0.08 * Math.sin(Math.PI * k)
    }
  }
}

/** 快照里这一队正在按的内容：几个人的拼在一起（B72） */
export function teamInput(s: GameState, team: Team): string {
  return s.inputs?.[team] ?? ''
}

/** 游戏的 onEvent 里先交给它：答了一题 / 连对分给那一队的演员 */
export function actEvent(e: GameEvent, of: (team: Team) => Actor | undefined): void {
  if (e.type === 'answered' && e.team) of(e.team)?.answered(e.correct)
  else if (e.type === 'streak') of(e.team)?.streak()
}

/** 游戏的 setState 里交给它：阶段与每队正在按的内容 */
export function actState(s: GameState, of: (team: Team) => Actor | undefined): void {
  for (const team of ['red', 'blue'] as const) of(team)?.sync(s.phase, teamInput(s, team))
}

/**
 * 按表演画角色的整体：脚下 (x, y) 为原点，先离地、再绕脚下前倾 / 晃、绕身体中心翻跟头、以脚下为基准压扁拉长，
 * 然后在 (0, 0) 画角色（draw 里按原点在脚下来画）。dir = 前进方向（1 朝右 / 朝上，−1 朝左），前倾跟着它；
 * size 是角色身高（离地、翻跟头的中心都按它算）。
 */
export function withActBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  p: ActPose,
  dir: 1 | -1,
  draw: () => void,
): void {
  const rot = (p.lean + p.shake) * dir
  withTransform(ctx, x, y - p.lift * size, rot, 1, 1, () => {
    const spin = p.spin * dir
    if (spin) {
      withTransform(ctx, 0, -size * 0.5, spin, 1, 1, () => {
        withTransform(ctx, 0, size * 0.5, 0, p.sx, p.sy, draw)
      })
    } else withTransform(ctx, 0, 0, 0, p.sx, p.sy, draw)
  })
}

export interface ActFxOptions {
  /** 泡泡往哪边冒：1 右上、−1 左上 */
  side: 1 | -1
  /** 降级等级：≥ 2 不画亮片 */
  quality: number
}

/**
 * 头顶的小图标：(x, y) 是角色头顶，s 是角色身高（图标按 max(s, 22) 算，紧凑版也看得见）。
 * 想的泡泡（三个点一个个跳）、灯泡、汗珠（顺着脸往下滑）、亮片（从头顶往外迸）。
 */
export function drawActFx(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: ActPose, o: ActFxOptions): void {
  const r = Math.max(s, 22)
  if (p.think > 0.03) drawThink(ctx, x + o.side * r * 0.32, y - r * 0.12, r, p.think, p.t)
  if (p.bulb > 0.03) drawBulb(ctx, x, y - r * 0.28, r, p.bulb)
  if (p.sweat > 0.03) {
    withAlpha(ctx, Math.min(1, p.sweat * 1.5), () => {
      ctx.fillStyle = '#8fd0ff'
      const fall = (1 - p.sweat) * r * 0.25
      for (const [dx, dy, k] of [
        [0.3, 0.1, 1],
        [0.42, 0.28, 0.75],
      ] as const) {
        const cx = x - o.side * dx * r
        const cy = y + dy * r + fall
        const w = r * 0.06 * k
        ctx.beginPath()
        ctx.moveTo(cx, cy - w * 2.2)
        ctx.quadraticCurveTo(cx + w * 1.3, cy, cx, cy + w)
        ctx.quadraticCurveTo(cx - w * 1.3, cy, cx, cy - w * 2.2)
        ctx.fill()
      }
    })
  }
  if (p.sparkle > 0 && o.quality < 2) drawSparkles(ctx, x, y + r * 0.2, r, p.sparkle)
}

function drawThink(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, amount: number, t: number): void {
  const k = 0.5 + 0.5 * ease.outBack(clamp01(amount))
  withAlpha(ctx, clamp01(amount * amount * 1.6), () => {
    withTransform(ctx, x, y, 0, k, k, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.strokeStyle = 'rgba(80,90,110,0.35)'
      ctx.lineWidth = Math.max(1, r * 0.025)
      circle(ctx, -r * 0.1, r * 0.05, r * 0.04)
      ctx.fill()
      circle(ctx, 0, -r * 0.08, r * 0.065)
      ctx.fill()
      ellipse(ctx, r * 0.16, -r * 0.3, r * 0.2, r * 0.13)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#6b7385'
      for (let i = 0; i < 3; i++) {
        const hop = Math.max(0, Math.sin(t * 6 - i * 0.9)) * r * 0.035
        circle(ctx, r * (0.08 + i * 0.08), -r * 0.3 - hop, r * 0.025)
        ctx.fill()
      }
    })
  })
}

function drawBulb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, amount: number): void {
  const k = ease.outBack(clamp01(amount))
  withAlpha(ctx, clamp01(amount * 1.5), () => {
    withTransform(ctx, x, y, 0, k, k, () => {
      ctx.strokeStyle = '#ffd24a'
      ctx.lineWidth = Math.max(1, r * 0.03)
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.55
        ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15)
        ctx.lineTo(Math.cos(a) * r * 0.23, Math.sin(a) * r * 0.23)
      }
      ctx.stroke()
      ctx.fillStyle = '#ffe066'
      circle(ctx, 0, 0, r * 0.1)
      ctx.fill()
      ctx.fillStyle = '#9aa3b5'
      ctx.fillRect(-r * 0.045, r * 0.08, r * 0.09, r * 0.06)
    })
  })
}

function drawSparkles(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, q: number): void {
  const dist = r * (0.25 + 0.45 * ease.outCubic(q))
  const size = r * 0.09 * (1 - q * 0.5)
  withAlpha(ctx, 1 - q, () => {
    ctx.fillStyle = '#ffd24a'
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.6
      const cx = x + Math.cos(a) * dist
      const cy = y + Math.sin(a) * dist
      ctx.beginPath()
      ctx.moveTo(cx, cy - size)
      ctx.quadraticCurveTo(cx, cy, cx + size, cy)
      ctx.quadraticCurveTo(cx, cy, cx, cy + size)
      ctx.quadraticCurveTo(cx, cy, cx - size, cy)
      ctx.quadraticCurveTo(cx, cy, cx, cy - size)
      ctx.fill()
    }
  })
}
