/**
 * 乌龟（红队）：代码画的矢量部件——壳（六角纹）、腹甲、头（会伸缩、眨眼）、四条短腿、小尾巴、红头巾。
 * 坐标：原点在脚下正中，朝右；s 是身高（约 34px）。
 */
import { circle, ellipse, withTransform } from '../engine/draw'

export interface TortoisePose {
  /** 跑步相位（弧度） */
  phase: number
  /** 0 = 站着，1 = 全速跑（腿摆幅、前倾） */
  run: number
  /** 眼皮闭合 0…1 */
  blink: number
  /** 头缩进壳里 0…1（输了的收尾） */
  hide: number
  /** 整体旋转（弧度）：胜利转圈用 */
  spin: number
  /** 回头看 0…1 */
  look: number
  /** 原地小跳的高度（px） */
  lift: number
  /** 脖子再往前上方伸 0…1（伸懒腰 / 蓄力 / 欢呼，B72） */
  neck?: number
  /** 张嘴笑 0…1（答对） */
  happy?: number
  /** 瞪大眼、嘴成 o 0…1（答错一愣） */
  wide?: number
}

const SHELL = '#5fa64b'
const SHELL_DARK = '#3f7d33'
const SHELL_LIGHT = '#8fd06a'
const SKIN = '#8ccf6a'
const SKIN_DARK = '#5a9a45'
const PLATE = '#e6c983'
const BAND = '#ff6b6b'

function hexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6
    const px = x + r * Math.cos(a)
    const py = y + r * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

export function drawTortoise(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: TortoisePose): void {
  const lean = p.run * 0.12
  withTransform(ctx, x, y - p.lift, lean + p.spin, 1, 1, () => {
    ctx.lineWidth = Math.max(1, s * 0.05)
    ctx.lineJoin = 'round'
    // 四条腿：前后各两条，跑起来交替摆
    const legX = [-0.32, -0.14, 0.12, 0.3]
    for (let i = 0; i < 4; i++) {
      const a = p.run * 0.7 * Math.sin(p.phase + (i % 2 === 0 ? 0 : Math.PI) + (i < 2 ? 0.4 : 0))
      withTransform(ctx, legX[i]! * s, -0.3 * s, a, 1, 1, () => {
        ctx.fillStyle = i < 2 ? SKIN_DARK : SKIN
        ctx.beginPath()
        ctx.roundRect(-0.07 * s, 0, 0.14 * s, 0.3 * s, 0.05 * s)
        ctx.fill()
      })
    }
    // 尾巴
    ctx.fillStyle = SKIN
    ctx.beginPath()
    ctx.moveTo(-0.46 * s, -0.36 * s)
    ctx.lineTo(-0.62 * s, -0.24 * s)
    ctx.lineTo(-0.42 * s, -0.24 * s)
    ctx.closePath()
    ctx.fill()
    // 腹甲
    ctx.fillStyle = PLATE
    ctx.beginPath()
    ctx.roundRect(-0.5 * s, -0.38 * s, 1.0 * s, 0.16 * s, 0.07 * s)
    ctx.fill()
    // 头 + 脖子（可缩进）
    const neck = p.neck ?? 0
    const happy = p.happy ?? 0
    const wide = p.wide ?? 0
    const hx = (0.52 - p.hide * 0.3 + neck * 0.12) * s
    const hy = (-0.46 - neck * 0.12) * s
    const turn = p.look * 0.6 + neck * 0.25
    ctx.fillStyle = SKIN
    ctx.beginPath()
    ctx.roundRect(0.25 * s, hy - 0.08 * s, hx - 0.2 * s, 0.18 * s, 0.06 * s)
    ctx.fill()
    withTransform(ctx, hx, hy, -turn, 1, 1, () => {
      ctx.fillStyle = SKIN
      circle(ctx, 0, 0, 0.18 * s)
      ctx.fill()
      // 头巾（队色）
      ctx.fillStyle = BAND
      ctx.beginPath()
      ctx.roundRect(-0.2 * s, 0.04 * s, 0.4 * s, 0.09 * s, 0.04 * s)
      ctx.fill()
      // 眼睛（答错一愣时瞪大、眼珠变小）
      ctx.fillStyle = '#fff'
      circle(ctx, 0.06 * s, -0.05 * s, 0.07 * s * (1 + wide * 0.35))
      ctx.fill()
      if (p.blink > 0.5 && wide < 0.3) {
        ctx.strokeStyle = SKIN_DARK
        ctx.beginPath()
        ctx.moveTo(0.0 * s, -0.05 * s)
        ctx.lineTo(0.12 * s, -0.05 * s)
        ctx.stroke()
      } else if (happy > 0.4 && wide < 0.3) {
        // 笑眯眯：眼睛弯成 ∩
        ctx.strokeStyle = '#2b2b2b'
        ctx.beginPath()
        ctx.arc(0.07 * s, -0.03 * s, 0.035 * s, Math.PI, 0)
        ctx.stroke()
      } else {
        ctx.fillStyle = '#2b2b2b'
        circle(ctx, 0.08 * s, -0.05 * s, 0.035 * s * (1 - wide * 0.3))
        ctx.fill()
      }
      // 嘴：平时笑，答对张嘴笑，答错嘴成 o
      if (wide > 0.3) {
        ctx.fillStyle = '#7a3b2e'
        ellipse(ctx, 0.1 * s, 0.07 * s, 0.03 * s, 0.04 * s)
        ctx.fill()
      } else if (happy > 0.3) {
        ctx.fillStyle = '#c94f4f'
        ctx.beginPath()
        ctx.arc(0.07 * s, 0.03 * s, 0.075 * s, 0.1, Math.PI - 0.5)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.strokeStyle = SKIN_DARK
        ctx.beginPath()
        ctx.arc(0.06 * s, 0.03 * s, 0.07 * s, 0.15, Math.PI - 0.6)
        ctx.stroke()
      }
    })
    // 壳
    ctx.fillStyle = SHELL
    ellipse(ctx, 0, -0.56 * s, 0.5 * s, 0.34 * s)
    ctx.fill()
    ctx.strokeStyle = SHELL_DARK
    ctx.stroke()
    ctx.fillStyle = SHELL_LIGHT
    hexagon(ctx, 0, -0.6 * s, 0.13 * s)
    ctx.fill()
    hexagon(ctx, -0.24 * s, -0.54 * s, 0.09 * s)
    ctx.fill()
    hexagon(ctx, 0.24 * s, -0.54 * s, 0.09 * s)
    ctx.fill()
  })
}
