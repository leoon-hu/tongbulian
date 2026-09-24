/**
 * 摘果子场景的道具与角色：大果树（树干 + 会晃的树冠）、苹果 / 李子、篮子（分前后两半，果子堆在中间）、
 * 以及守着篮子的小动物（面朝观众，系队色围巾）。角色原点在脚下正中；s 是身高。
 * 小动物拼图、抢旗、拆城堡也用；一题里的表演（B72）的手势 / 表情由 pickerAct 接上来。
 */
import type { Team } from '@/battle/protocol'
import type { ActPose, Actor, Gesture } from '../engine/act'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'
import { clamp, clamp01 } from '../engine/tween'
import type { CritterKind } from './scenery'
import { FUR } from './tug'

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

export type FruitKind = 'apple' | 'plum'

/** 树干：从地面到树冠 */
export function drawTrunk(ctx: CanvasRenderingContext2D, x: number, bottom: number, top: number, w: number): void {
  ctx.fillStyle = '#8a5a3c'
  ctx.beginPath()
  ctx.moveTo(x - w * 0.5, top)
  ctx.lineTo(x + w * 0.5, top)
  ctx.lineTo(x + w * 0.7, bottom)
  ctx.lineTo(x - w * 0.7, bottom)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fillRect(x + w * 0.15, top, w * 0.3, bottom - top)
}

/** 树冠：几团绿，sway 是横向晃动（px） */
export function drawCanopy(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sway: number): void {
  const blobs: [number, number, number, string][] = [
    [-0.32, 0.15, 0.4, '#4ea63f'],
    [0.32, 0.15, 0.4, '#4ea63f'],
    [0, -0.12, 0.48, '#5fb84a'],
    [-0.2, -0.3, 0.32, '#6cc457'],
    [0.22, -0.3, 0.3, '#6cc457'],
    [-0.12, 0.38, 0.3, '#7ccf62'],
    [0.14, 0.4, 0.28, '#7ccf62'],
  ]
  for (const [dx, dy, r, color] of blobs) {
    ctx.fillStyle = color
    ellipse(ctx, x + dx * w + sway * (0.5 - dy), y + dy * h, r * w, r * h * 1.05)
    ctx.fill()
  }
}

/** 一个果子：苹果（红、有柄和叶）/ 李子（蓝紫、有柄）；shine 是高光亮度 */
export function drawFruit(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kind: FruitKind, shine = 1): void {
  if (kind === 'apple') {
    ctx.fillStyle = '#ff5c5c'
    circle(ctx, x - r * 0.28, y, r * 0.78)
    ctx.fill()
    circle(ctx, x + r * 0.28, y, r * 0.78)
    ctx.fill()
    circle(ctx, x, y + r * 0.1, r * 0.8)
    ctx.fill()
    ctx.strokeStyle = '#6b4a2f'
    ctx.lineWidth = Math.max(1, r * 0.16)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y - r * 0.6)
    ctx.lineTo(x + r * 0.15, y - r * 1.15)
    ctx.stroke()
    ctx.fillStyle = '#5fb84a'
    ellipse(ctx, x + r * 0.4, y - r * 0.95, r * 0.35, r * 0.18)
    ctx.fill()
  } else {
    ctx.fillStyle = '#5d6df0'
    ellipse(ctx, x, y, r * 0.85, r)
    ctx.fill()
    ctx.fillStyle = '#4756c9'
    ellipse(ctx, x + r * 0.35, y, r * 0.3, r * 0.9)
    ctx.fill()
    ctx.strokeStyle = '#6b4a2f'
    ctx.lineWidth = Math.max(1, r * 0.16)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y - r * 0.8)
    ctx.lineTo(x - r * 0.1, y - r * 1.25)
    ctx.stroke()
  }
  withAlpha(ctx, 0.55 * shine, () => {
    ctx.fillStyle = '#ffffff'
    ellipse(ctx, x - r * 0.32, y - r * 0.32, r * 0.22, r * 0.14)
    ctx.fill()
  })
}

/** 篮子：part = back 画后半（果子后面），front 画前面那一圈与提手；(x, top) 是篮口中心 */
export function drawBasket(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, h: number, team: Team, part: 'back' | 'front', glow: number): void {
  const c = TEAM[team]
  if (part === 'back') {
    if (glow > 0.02) {
      withAlpha(ctx, glow * 0.6, () => {
        ctx.fillStyle = '#fff3b0'
        ellipse(ctx, x, top + h * 0.3, w * 0.9, h * 1.1)
        ctx.fill()
      })
    }
    ctx.fillStyle = '#b07a45'
    ctx.beginPath()
    ctx.ellipse(x, top, w * 0.5, h * 0.22, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#7a5230'
    ellipse(ctx, x, top, w * 0.42, h * 0.16)
    ctx.fill()
    return
  }
  // 篮身（下宽上窄的梯形 + 编织纹）
  ctx.fillStyle = '#c9955a'
  ctx.beginPath()
  ctx.moveTo(x - w * 0.5, top)
  ctx.lineTo(x + w * 0.5, top)
  ctx.lineTo(x + w * 0.42, top + h)
  ctx.lineTo(x - w * 0.42, top + h)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(120,80,30,0.4)'
  ctx.lineWidth = Math.max(1, h * 0.05)
  ctx.beginPath()
  for (let i = 1; i < 4; i++) {
    const yy = top + (h * i) / 4
    ctx.moveTo(x - w * (0.5 - 0.02 * i), yy)
    ctx.lineTo(x + w * (0.5 - 0.02 * i), yy)
  }
  for (let i = 0; i < 5; i++) {
    const xx = x - w * 0.4 + (w * 0.8 * i) / 4
    ctx.moveTo(xx, top)
    ctx.lineTo(xx * 0.96 + x * 0.04, top + h)
  }
  ctx.stroke()
  // 篮口前沿 + 队色带
  fillRoundRect(ctx, x - w * 0.52, top - h * 0.06, w * 1.04, h * 0.16, h * 0.06, '#a8743f')
  ctx.fillStyle = c.main
  ctx.fillRect(x - w * 0.42, top + h * 0.45, w * 0.84, h * 0.14)
  // 提手
  ctx.strokeStyle = '#a8743f'
  ctx.lineWidth = Math.max(1.5, h * 0.08)
  ctx.beginPath()
  ctx.arc(x, top, w * 0.36, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()
}

export interface PickerPose {
  lift: number
  /** 举篮欢呼 0…1 */
  cheer: number
  /** 挠头 0…1 */
  scratch: number
  blink: number
  /** 回头 / 张望（正负是两边） */
  look: number
  /** 头上落了一片叶子 0…1 */
  leaf: number
  dir: 1 | -1
  // —— 一题里的表演（B72）：都可选，不给就是原来的样子；「前面」= 本地朝右 = 朝 dir 那边 ——
  /** 两手举过头顶 0…1（欢呼 / 伸懒腰） */
  arms?: number
  /** 前面那只手挥手 0…1；beat 是挥手 / 挠头 / 乱挥的相位（弧度） */
  wave?: number
  beat?: number
  /** 敬礼 0…1 */
  salute?: number
  /** 两手伸到胸前准备 0…1 */
  ready?: number
  /** 前面那只手往外伸、搭在东西上 0…1（守卫搭大炮） */
  reach?: number
  /** 前面那只手往斜上方够 0…1（踮脚够果子） */
  reachUp?: number
  /** 两手捧着下巴 0…1（在想） */
  chin?: number
  /** 两手乱挥 0…1（脚下一绊） */
  flail?: number
  /** 原地踏步 0…1；step 是步子的相位（弧度） */
  march?: number
  step?: number
  /** 后面那只脚踢起来 0…1（绊一下） */
  kick?: number
  /** 两腿分开半蹲 0…1（准备冲） */
  crouch?: number
  /** 笑眯眯、张嘴笑 0…1 */
  happy?: number
  /** 瞪大眼、嘴成 o 0…1 */
  wide?: number
  /** 抬头往上看 0…1 */
  lookUp?: number
  /** 叶子离头顶多高 / 往旁边偏多少（单位 = 身高，0 = 落在头上）与转角 */
  leafY?: number
  leafX?: number
  leafRot?: number
}

/** 头顶离脚下多高（单位 = 身高）：头顶的小图标（B72）画在这里 */
export const PICKER_HEAD = 1.14

type Pt = [number, number]

/** 把点 a 往 b 挪 t（0…1） */
function toward(a: Pt, b: Pt, t: number | undefined): void {
  if (!t || t <= 0) return
  const k = Math.min(1, t)
  a[0] += (b[0] - a[0]) * k
  a[1] += (b[1] - a[1]) * k
}

/**
 * 一只胳膊的手肘与手（单位 = 身高，本地坐标，脚下为原点）：d = −1 后面那只 / 1 前面那只。
 * 从自然垂着出发，按姿势一样一样插值过去（后面的盖过前面的：准备 → 托下巴 → 伸手 / 挠头 → 挥手 → 敬礼 → 够 → 举手 → 乱挥）。
 */
function armOf(d: 1 | -1, p: PickerPose): [Pt, Pt] {
  const beat = p.beat ?? 0
  const swingY = (p.march ?? 0) * 0.06 * Math.sin((p.step ?? 0) + (d > 0 ? Math.PI : 0))
  const elbow: Pt = [0.24 * d, -0.47 + swingY * 0.5]
  const hand: Pt = [0.3 * d, -0.34 + swingY]
  const set = (w: number | undefined, e: Pt, h: Pt): void => {
    toward(elbow, e, w)
    toward(hand, h, w)
  }
  set(p.ready, [0.32 * d, -0.5], [0.12 * d, -0.64])
  set(p.chin, [0.28 * d, -0.5], [0.08 * d, -0.72])
  if (d > 0) set(p.reach, [0.36, -0.5], [0.58, -0.3])
  else set(p.scratch, [-0.42, -0.84], [-0.2 + Math.sin(beat * 2) * 0.04, -1.06])
  if (d > 0) {
    const a = -Math.PI / 2 + 0.55 * Math.sin(beat * 0.8)
    set(p.wave, [0.38, -0.8], [0.38 + Math.cos(a) * 0.26, -0.8 + Math.sin(a) * 0.26])
    set(p.salute, [0.42, -0.82], [0.14, -0.98])
    set(p.reachUp, [0.34, -0.92], [0.44, -1.28])
  }
  set(Math.max(p.cheer, p.arms ?? 0), [0.3 * d, -0.86], [0.36 * d, -1.14])
  if (p.flail) {
    // 风车一样乱挥：两只手错开半圈
    const a = beat * 1.3 + (d > 0 ? 0 : Math.PI)
    set(p.flail, [0.16 * d + Math.cos(a + 0.5) * 0.16 * d, -0.6 + Math.sin(a + 0.5) * 0.16], [0.16 * d + Math.cos(a) * 0.32 * d, -0.6 + Math.sin(a) * 0.32])
  }
  return [elbow, hand]
}

/** 守篮子的小动物：队色围巾；原点在脚下正中 */
export function drawPicker(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: PickerPose): void {
  const c = TEAM[team]
  const [fur, accent] = FUR[kind]
  // 熊猫的胳膊腿是黑的（原来白的在浅色背景上看不出手在干什么）
  const limb = kind === 'panda' ? accent : fur
  const happy = Math.max(p.cheer, p.happy ?? 0)
  const wide = p.wide ?? 0
  withTransform(ctx, x, y - p.lift, 0, p.dir, 1, () => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // 腿：踏步时轮流抬脚，半蹲时分开、膝盖往外，绊一下时后面那只脚踢起来
    const march = p.march ?? 0
    const crouch = p.crouch ?? 0
    ctx.strokeStyle = limb
    ctx.fillStyle = limb
    ctx.lineWidth = Math.max(1.5, s * 0.12)
    for (const d of [-1, 1] as const) {
      const up = march * 0.2 * Math.max(0, Math.sin((p.step ?? 0) + (d > 0 ? 0 : Math.PI)))
      const foot: Pt = [(0.14 + crouch * 0.1) * d, -up]
      if (d < 0) toward(foot, [-0.36, -0.24], p.kick)
      const knee: Pt = [(0.1 * d + foot[0]) / 2 + d * (crouch * 0.08 + up * 0.5), (-0.4 + foot[1]) / 2]
      ctx.beginPath()
      ctx.moveTo(d * 0.1 * s, -0.4 * s)
      ctx.lineTo(knee[0] * s, knee[1] * s)
      ctx.lineTo(foot[0] * s, foot[1] * s)
      ctx.stroke()
      ellipse(ctx, (foot[0] + d * 0.02) * s, foot[1] * s, s * 0.08, s * 0.045)
      ctx.fill()
    }
    ctx.fillStyle = fur
    ellipse(ctx, 0, -0.5 * s, 0.24 * s, 0.3 * s)
    ctx.fill()
    fillRoundRect(ctx, -0.22 * s, -0.7 * s, 0.44 * s, 0.1 * s, 0.05 * s, c.main)
    ctx.fillStyle = c.dark
    ctx.fillRect(0.06 * s, -0.66 * s, 0.09 * s, 0.2 * s)
    // 胳膊：肩膀 → 手肘 → 手（线画在头后面，手画在头前面：挠头 / 敬礼 / 托下巴时看得见）
    const arms = [armOf(-1, p), armOf(1, p)] as const
    ctx.strokeStyle = limb
    ctx.lineWidth = Math.max(1.5, s * 0.1)
    ctx.beginPath()
    arms.forEach(([e, h], n) => {
      const d = n === 0 ? -1 : 1
      ctx.moveTo(d * 0.16 * s, -0.6 * s)
      ctx.lineTo(e[0] * s, e[1] * s)
      ctx.lineTo(h[0] * s, h[1] * s)
    })
    ctx.stroke()
    const look = p.look
    const lookUp = p.lookUp ?? 0
    withTransform(ctx, 0, -0.88 * s, -look * 0.3 + p.scratch * 0.1, 1, 1, () => {
      // 抬头往上看：五官往上挪、耳朵往下挪一点，像头往后仰
      const earY = (-0.16 + lookUp * 0.05) * s
      ctx.fillStyle = fur
      circle(ctx, -0.23 * s, earY, 0.09 * s)
      ctx.fill()
      circle(ctx, 0.23 * s, earY, 0.09 * s)
      ctx.fill()
      circle(ctx, 0, 0, 0.26 * s)
      ctx.fill()
      // 五官：抬头往上挪、张望往那边挪一点
      const fx = -look * 0.04 * s
      const fy = -lookUp * 0.08 * s
      ctx.fillStyle = accent
      if (kind === 'panda') {
        ellipse(ctx, -0.1 * s + fx, -0.03 * s + fy, 0.08 * s, 0.1 * s)
        ctx.fill()
        ellipse(ctx, 0.1 * s + fx, -0.03 * s + fy, 0.08 * s, 0.1 * s)
        ctx.fill()
      } else {
        ellipse(ctx, fx, 0.08 * s + fy, 0.13 * s, 0.09 * s)
        ctx.fill()
      }
      // 眼睛：眨眼一条线，笑眯眯弯成 ∩，瞪大眼是白眼圈 + 小眼珠
      const eyeColor = kind === 'panda' ? '#ffffff' : '#2b2b2b'
      const ey = -0.03 * s + fy - lookUp * 0.015 * s
      for (const ex of [-0.1 * s + fx, 0.1 * s + fx]) {
        if (wide > 0.3) {
          ctx.fillStyle = '#ffffff'
          circle(ctx, ex, ey, 0.06 * s)
          ctx.fill()
          ctx.fillStyle = '#2b2b2b'
          circle(ctx, ex, ey, 0.025 * s)
          ctx.fill()
        } else if (p.blink > 0.5) {
          ctx.fillStyle = eyeColor
          ctx.fillRect(ex - 0.035 * s, ey, 0.07 * s, Math.max(1, 0.02 * s))
        } else if (happy > 0.4) {
          ctx.strokeStyle = eyeColor
          ctx.lineWidth = Math.max(1, 0.03 * s)
          ctx.beginPath()
          ctx.arc(ex, ey + 0.015 * s, 0.035 * s, Math.PI, 0)
          ctx.stroke()
        } else {
          ctx.fillStyle = eyeColor
          circle(ctx, ex, ey, 0.035 * s)
          ctx.fill()
        }
      }
      // 嘴：平时笑，欢呼 / 答对张嘴笑，答错一愣嘴成 o
      ctx.strokeStyle = '#8a5a3a'
      ctx.lineWidth = Math.max(1, 0.03 * s)
      if (wide > 0.3) {
        ctx.fillStyle = '#7a3b2e'
        ellipse(ctx, fx + 0.01 * s, 0.12 * s + fy, 0.03 * s, 0.042 * s)
        ctx.fill()
      } else if (happy > 0.3) {
        ctx.fillStyle = '#c0392b'
        ellipse(ctx, 0.02 * s + fx, 0.11 * s + fy, 0.05 * s * (0.8 + happy * 0.3), 0.04 * s * (0.8 + happy * 0.4))
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(fx, 0.09 * s + fy, 0.06 * s, 0.15, Math.PI - 0.15)
        ctx.stroke()
      }
      if (p.leaf > 0.05) {
        withAlpha(ctx, Math.min(1, p.leaf), () => {
          ctx.fillStyle = '#7ccf62'
          withTransform(ctx, (0.02 + (p.leafX ?? 0)) * s, (-0.27 - (p.leafY ?? 0)) * s, 0.4 + (p.leafRot ?? 0), 1, 1, () => {
            ctx.beginPath()
            ctx.moveTo(-0.12 * s, 0)
            ctx.quadraticCurveTo(0, -0.09 * s, 0.12 * s, 0)
            ctx.quadraticCurveTo(0, 0.09 * s, -0.12 * s, 0)
            ctx.closePath()
            ctx.fill()
          })
        })
      }
    })
    // 手
    ctx.fillStyle = limb
    for (const [, h] of arms) {
      circle(ctx, h[0] * s, h[1] * s, 0.065 * s)
      ctx.fill()
    }
  })
}

/** 这一刻在做的小动作是不是 g：是就给出 0…1 的包络（游戏拿来把通用小动作换成自己角色的，比如「蹦两下」换成原地踏步） */
export function gestureEnv(act: Actor, g: Gesture): number {
  return act.gesture === g ? Math.sin(Math.PI * clamp01(act.gestureT)) : 0
}

/**
 * 一题里的表演（B72）接到 drawPicker 上的通用部分：举手、挠头、挥手、张望（左右各看一眼）、笑眯眯 / 瞪大眼；
 * 离地 / 前倾 / 晃 / 压扁拉长交给 withActBody，头顶的小图标交给 drawActFx。各游戏再按自己的角色换（踏步、敬礼、托下巴……）。
 */
export function pickerAct(act: Actor, a: ActPose): Pick<Required<PickerPose>, 'arms' | 'scratch' | 'wave' | 'beat' | 'look' | 'happy' | 'wide'> {
  const q = clamp01(act.gestureT)
  const look = act.gesture === 'look' ? clamp(gestureEnv(act, 'look') * Math.sin(Math.PI * 2 * q) * 1.6, -1, 1) : a.look
  return { arms: a.arms, scratch: a.scratch, wave: a.wave, beat: a.beat, look, happy: a.happy, wide: a.wide }
}
