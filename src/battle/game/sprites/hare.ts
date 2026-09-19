/**
 * 兔子（蓝队）：身体、头、两只长耳朵（跑时向后甩、待机抖一下）、长后腿、前爪、棉尾巴、蓝头巾。
 * 坐标：原点在脚下正中，朝右；s 是身高（约 34px，耳朵另算）。
 */
import { circle, ellipse, withTransform } from '../engine/draw'

export interface HarePose {
  /** 跳跃相位（弧度）；跑动时 |sin| 决定离地高度 */
  phase: number
  /** 0 = 站着，1 = 全速跑 */
  run: number
  /** 眼皮闭合 0…1 */
  blink: number
  /** 耳朵后甩 0…1（跑动） */
  earBack: number
  /** 耳朵抖动角（弧度） */
  earTwitch: number
  /** 落地压扁 0…1 */
  squash: number
  /** 整体旋转（弧度）：后空翻用 */
  flip: number
  /** 耷拉坐下 0…1（输了的收尾） */
  sit: number
  /** 回头看 0…1 */
  look: number
  /** 离地高度（px） */
  lift: number
}

const FUR = '#efe8dc'
const FUR_DARK = '#c9bfae'
const INNER = '#f8b4c4'
const BAND = '#4aa3ff'

export function drawHare(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: HarePose): void {
  const sx = 1 + p.squash * 0.12
  const sy = 1 - p.squash * 0.16 - p.sit * 0.12
  withTransform(ctx, x, y - p.lift, p.flip + p.run * 0.1, sx, sy, () => {
    ctx.lineWidth = Math.max(1, s * 0.05)
    ctx.lineJoin = 'round'
    // 后腿（大）+ 脚
    ctx.fillStyle = FUR_DARK
    const kick = p.run * 0.5 * Math.sin(p.phase)
    withTransform(ctx, -0.16 * s, -0.24 * s, kick, 1, 1, () => {
      ellipse(ctx, 0, 0, 0.2 * s, 0.15 * s)
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(-0.05 * s, 0.1 * s, 0.34 * s, 0.11 * s, 0.05 * s)
      ctx.fill()
    })
    // 尾巴
    ctx.fillStyle = '#fff'
    circle(ctx, -0.34 * s, -0.4 * s, 0.09 * s)
    ctx.fill()
    // 身体
    ctx.fillStyle = FUR
    ellipse(ctx, 0, -0.46 * s, 0.3 * s, 0.34 * s)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ellipse(ctx, 0.06 * s, -0.4 * s, 0.16 * s, 0.2 * s)
    ctx.fill()
    // 前爪
    ctx.fillStyle = FUR_DARK
    const paw = p.run * 0.4 * Math.sin(p.phase + Math.PI)
    circle(ctx, 0.24 * s + paw * 0.05 * s, -0.36 * s, 0.07 * s)
    ctx.fill()
    circle(ctx, 0.32 * s - paw * 0.05 * s, -0.4 * s, 0.07 * s)
    ctx.fill()
    // 头巾（队色，脖子处）
    ctx.fillStyle = BAND
    ctx.beginPath()
    ctx.roundRect(0.04 * s, -0.66 * s, 0.34 * s, 0.09 * s, 0.04 * s)
    ctx.fill()
    // 头
    const turn = p.look * 0.6
    withTransform(ctx, 0.28 * s, -0.8 * s, -turn, 1, 1, () => {
      // 耳朵（画在头后面）
      const earA = -0.25 - p.earBack * 1.0 + p.earTwitch
      for (const side of [-1, 1]) {
        withTransform(ctx, -0.06 * s + side * 0.08 * s, -0.12 * s, earA + side * 0.12 - p.sit * 0.9, 1, 1, () => {
          ctx.fillStyle = FUR
          ellipse(ctx, 0, -0.26 * s, 0.075 * s, 0.28 * s)
          ctx.fill()
          ctx.fillStyle = INNER
          ellipse(ctx, 0, -0.26 * s, 0.035 * s, 0.2 * s)
          ctx.fill()
        })
      }
      ctx.fillStyle = FUR
      circle(ctx, 0, 0, 0.22 * s)
      ctx.fill()
      // 眼睛
      ctx.fillStyle = '#fff'
      circle(ctx, 0.08 * s, -0.04 * s, 0.075 * s)
      ctx.fill()
      if (p.blink > 0.5) {
        ctx.strokeStyle = FUR_DARK
        ctx.beginPath()
        ctx.moveTo(0.02 * s, -0.04 * s)
        ctx.lineTo(0.14 * s, -0.04 * s)
        ctx.stroke()
      } else {
        ctx.fillStyle = '#2b2b2b'
        circle(ctx, 0.1 * s, -0.04 * s, 0.04 * s)
        ctx.fill()
      }
      // 鼻子 + 胡须
      ctx.fillStyle = INNER
      circle(ctx, 0.2 * s, 0.03 * s, 0.035 * s)
      ctx.fill()
      ctx.strokeStyle = FUR_DARK
      ctx.beginPath()
      ctx.moveTo(0.12 * s, 0.06 * s)
      ctx.lineTo(0.02 * s, 0.09 * s)
      ctx.moveTo(0.12 * s, 0.08 * s)
      ctx.lineTo(0.03 * s, 0.13 * s)
      ctx.stroke()
    })
  })
}
