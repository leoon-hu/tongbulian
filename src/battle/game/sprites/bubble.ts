/**
 * 吹泡泡场景的道具与角色：泡泡（透明 + 淡彩 + 高光，赢了变彩虹泡）、泡泡棒、顶上那排星星、草地上的小花，
 * 以及举着泡泡棒鼓腮帮子吹的小动物（面朝观众）。角色原点在脚下正中；s 是身高。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'
import type { CritterKind } from './scenery'
import { starPath } from './space'
import { FUR } from './tug'

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

export const RAINBOW = ['#ff6b6b', '#ffb347', '#ffe27a', '#7cf7c4', '#8fd0ff', '#c9a3ff']

/** 泡泡：透明圆 + 边上一圈淡彩 + 左上角高光；sx / sy 是颤动的拉伸，rainbow 0…1 泛起彩虹色并按 rot 转 */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sx: number, sy: number, rainbow: number, rot: number, glow: number): void {
  if (r < 0.5) return
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.45, () => {
      ctx.fillStyle = '#fff3b0'
      circle(ctx, x, y, r * 1.35)
      ctx.fill()
    })
  }
  withTransform(ctx, x, y, 0, sx, sy, () => {
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    circle(ctx, 0, 0, r)
    ctx.fill()
    if (rainbow > 0.02) {
      withAlpha(ctx, rainbow * 0.6, () => {
        const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r)
        RAINBOW.forEach((c, i) => g.addColorStop(0.25 + (0.75 * i) / (RAINBOW.length - 1), c))
        g.addColorStop(0, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
        circle(ctx, 0, 0, r)
        ctx.fill()
      })
      ctx.lineWidth = Math.max(1, r * 0.09)
      RAINBOW.forEach((c, i) => {
        ctx.strokeStyle = c
        withAlpha(ctx, rainbow * 0.8, () => {
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.93, rot + (i * Math.PI) / 3, rot + ((i + 1) * Math.PI) / 3)
          ctx.stroke()
        })
      })
    } else {
      // 边上的两道淡彩
      ctx.lineWidth = Math.max(1, r * 0.08)
      withAlpha(ctx, 0.55, () => {
        ctx.strokeStyle = '#ff9ad5'
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.9, 0.2, 1.4)
        ctx.stroke()
        ctx.strokeStyle = '#8fe8ff'
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.9, 1.6, 2.6)
        ctx.stroke()
      })
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = Math.max(1, r * 0.05)
    circle(ctx, 0, 0, r)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ellipse(ctx, -r * 0.4, -r * 0.42, r * 0.2, r * 0.12)
    ctx.fill()
  })
}

/** 泡泡棒：一根棍 + 一个圈；原点在圈心，ang 是棍的方向 */
export function drawWand(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ang: number): void {
  withTransform(ctx, x, y, ang, 1, 1, () => {
    ctx.strokeStyle = '#a78bfa'
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1.5, s * 0.08)
    ctx.beginPath()
    ctx.moveTo(0, s * 0.12)
    ctx.lineTo(0, s * 0.55)
    ctx.stroke()
    ctx.strokeStyle = '#7c5cd6'
    ctx.lineWidth = Math.max(1.5, s * 0.07)
    circle(ctx, 0, 0, s * 0.13)
    ctx.stroke()
  })
}

/** 顶上一排小星星：glow 是每颗的亮度（0…1，按位置插值左右两边），burst 时放大发光 */
export function drawStarRow(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, r: number, glowL: number, glowR: number, t: number): void {
  const n = Math.max(5, Math.round((x1 - x0) / (r * 4)))
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const x = x0 + (x1 - x0) * f
    const glow = glowL * (1 - f) + glowR * f
    const twinkle = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.3)
    withAlpha(ctx, 0.4 + twinkle * 0.3 + glow * 0.3, () => {
      ctx.fillStyle = glow > 0.3 ? '#fff3b0' : '#ffe27a'
      starPath(ctx, x, y + Math.sin(t * 2 + i) * r * 0.2, r * (1 + glow * 0.5 * twinkle))
      ctx.fill()
    })
  }
}

/** 草地上的小花 */
export function drawFlowerDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5
    circle(ctx, x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.55)
    ctx.fill()
  }
  ctx.fillStyle = '#ffe27a'
  circle(ctx, x, y, r * 0.45)
  ctx.fill()
}

export interface BlowerPose {
  /** 鼓腮帮子 0…1 */
  puff: number
  lift: number
  /** 举棒欢呼 0…1 */
  cheer: number
  blink: number
  look: number
  dir: 1 | -1
}

/** 吹泡泡的小动物：队色围巾、一只手把泡泡棒举到嘴边（棒子由外面按 wandTip 画）；原点在脚下正中 */
export function drawBlower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: BlowerPose): void {
  const c = TEAM[team]
  const [fur, accent] = FUR[kind]
  withTransform(ctx, x, y - p.lift, 0, p.dir, 1, () => {
    ctx.lineCap = 'round'
    // 腿
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
    // 身子 + 围巾
    ctx.fillStyle = fur
    ellipse(ctx, 0, -0.5 * s, 0.24 * s, 0.3 * s)
    ctx.fill()
    fillRoundRect(ctx, -0.22 * s, -0.7 * s, 0.44 * s, 0.1 * s, 0.05 * s, c.main)
    ctx.fillStyle = c.dark
    ctx.fillRect(0.06 * s, -0.66 * s, 0.09 * s, 0.2 * s)
    // 手臂：右手举棒到嘴边 / 欢呼举起，左手垂着
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.1)
    ctx.beginPath()
    ctx.moveTo(0.16 * s, -0.6 * s)
    if (p.cheer > 0) ctx.lineTo(0.3 * s, -1.05 * s)
    else ctx.lineTo(0.34 * s, -0.78 * s)
    ctx.moveTo(-0.16 * s, -0.6 * s)
    ctx.lineTo(p.cheer > 0 ? -0.3 * s : -0.28 * s, p.cheer > 0 ? -1.0 * s : -0.34 * s)
    ctx.stroke()
    // 头（吹的时候腮帮子鼓起来）
    const puff = 1 + p.puff * 0.12
    withTransform(ctx, 0, -0.88 * s, -p.look * 0.3, puff, puff, () => {
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
      if (p.puff > 0.2) {
        withAlpha(ctx, p.puff * 0.5, () => {
          ctx.fillStyle = '#ffb3b3'
          circle(ctx, -0.16 * s, 0.06 * s, 0.07 * s)
          ctx.fill()
          circle(ctx, 0.16 * s, 0.06 * s, 0.07 * s)
          ctx.fill()
        })
      }
      ctx.fillStyle = kind === 'panda' ? '#ffffff' : '#2b2b2b'
      for (const ex of [-0.1 * s, 0.1 * s]) {
        if (p.blink > 0.5) ctx.fillRect(ex - 0.035 * s, -0.03 * s, 0.07 * s, Math.max(1, 0.02 * s))
        else {
          circle(ctx, ex, -0.03 * s, 0.035 * s)
          ctx.fill()
        }
      }
      // 嘴：吹的时候是个 o，欢呼张嘴，平时微笑
      if (p.puff > 0.2 || p.cheer > 0) {
        ctx.fillStyle = '#c0392b'
        circle(ctx, 0.04 * s, 0.13 * s, (p.cheer > 0 ? 0.05 : 0.035) * s)
        ctx.fill()
      } else {
        ctx.strokeStyle = '#8a5a3a'
        ctx.lineWidth = Math.max(1, 0.03 * s)
        ctx.beginPath()
        ctx.arc(0, 0.09 * s, 0.06 * s, 0.15, Math.PI - 0.15)
        ctx.stroke()
      }
    })
  })
}
