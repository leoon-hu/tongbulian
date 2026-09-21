/**
 * 摘果子场景的道具与角色：大果树（树干 + 会晃的树冠）、苹果 / 李子、篮子（分前后两半，果子堆在中间）、
 * 以及守着篮子的小动物（面朝观众，系队色围巾）。角色原点在脚下正中；s 是身高。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'
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
  look: number
  /** 头上落了一片叶子 0…1 */
  leaf: number
  dir: 1 | -1
}

/** 守篮子的小动物：队色围巾；原点在脚下正中 */
export function drawPicker(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: PickerPose): void {
  const c = TEAM[team]
  const [fur, accent] = FUR[kind]
  withTransform(ctx, x, y - p.lift, 0, p.dir, 1, () => {
    ctx.lineCap = 'round'
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.12)
    for (const d of [-1, 1] as const) {
      ctx.beginPath()
      ctx.moveTo(d * 0.1 * s, -0.4 * s)
      ctx.lineTo(d * 0.14 * s, 0)
      ctx.stroke()
      ctx.fillStyle = fur
      ellipse(ctx, d * 0.16 * s, 0, s * 0.08, s * 0.045)
      ctx.fill()
    }
    ctx.fillStyle = fur
    ellipse(ctx, 0, -0.5 * s, 0.24 * s, 0.3 * s)
    ctx.fill()
    fillRoundRect(ctx, -0.22 * s, -0.7 * s, 0.44 * s, 0.1 * s, 0.05 * s, c.main)
    ctx.fillStyle = c.dark
    ctx.fillRect(0.06 * s, -0.66 * s, 0.09 * s, 0.2 * s)
    // 手臂：欢呼举起 / 挠头 / 自然垂着
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.1)
    ctx.beginPath()
    for (const d of [-1, 1] as const) {
      ctx.moveTo(d * 0.16 * s, -0.6 * s)
      if (p.cheer > 0) ctx.lineTo(d * 0.3 * s, -1.05 * s)
      else if (p.scratch > 0.3 && d < 0) ctx.lineTo(-0.2 * s, -1.02 * s)
      else ctx.lineTo(d * 0.3 * s, -0.34 * s)
    }
    ctx.stroke()
    withTransform(ctx, 0, -0.88 * s, -p.look * 0.3 + p.scratch * 0.1, 1, 1, () => {
      ctx.fillStyle = fur
      circle(ctx, -0.23 * s, -0.16 * s, 0.09 * s)
      ctx.fill()
      circle(ctx, 0.23 * s, -0.16 * s, 0.09 * s)
      ctx.fill()
      circle(ctx, 0, 0, 0.26 * s)
      ctx.fill()
      ctx.fillStyle = accent
      if (kind === 'panda') {
        ellipse(ctx, -0.1 * s, -0.03 * s, 0.08 * s, 0.1 * s)
        ctx.fill()
        ellipse(ctx, 0.1 * s, -0.03 * s, 0.08 * s, 0.1 * s)
        ctx.fill()
      } else {
        ellipse(ctx, 0, 0.08 * s, 0.13 * s, 0.09 * s)
        ctx.fill()
      }
      ctx.fillStyle = kind === 'panda' ? '#ffffff' : '#2b2b2b'
      for (const ex of [-0.1 * s, 0.1 * s]) {
        if (p.blink > 0.5) ctx.fillRect(ex - 0.035 * s, -0.03 * s, 0.07 * s, Math.max(1, 0.02 * s))
        else {
          circle(ctx, ex, -0.03 * s, 0.035 * s)
          ctx.fill()
        }
      }
      ctx.strokeStyle = '#8a5a3a'
      ctx.lineWidth = Math.max(1, 0.03 * s)
      ctx.beginPath()
      if (p.cheer > 0) {
        ctx.fillStyle = '#c0392b'
        ellipse(ctx, 0.02 * s, 0.11 * s, 0.05 * s, 0.04 * s)
        ctx.fill()
      } else ctx.arc(0, 0.09 * s, 0.06 * s, 0.15, Math.PI - 0.15)
      ctx.stroke()
      if (p.leaf > 0.05) {
        withAlpha(ctx, Math.min(1, p.leaf), () => {
          ctx.fillStyle = '#7ccf62'
          withTransform(ctx, 0.02 * s, -0.27 * s, 0.4, 1, 1, () => {
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
  })
}
