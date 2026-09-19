/** 盖楼场景的道具与角色：砖块、屋顶与队旗、小鸟、戴安全帽的小工人、地基。 */
import type { Team } from '@/battle/protocol'
import { circle, withTransform } from '../engine/draw'

const TEAM: Record<Team, { main: string; dark: string; light: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', light: '#ff9b9b' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', light: '#8fc3ff' },
}

/** 一块砖：level 决定窗户排布（奇数层两扇、偶数层一扇宽窗）；lit 亮成暖黄 */
export function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, team: Team, level: number, lit: boolean): void {
  const c = TEAM[team]
  const r = Math.min(h * 0.18, w * 0.12)
  ctx.fillStyle = c.main
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y, w, h, r)
  ctx.fill()
  ctx.fillStyle = c.dark
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y + h * 0.82, w, h * 0.18, r)
  ctx.fill()
  ctx.fillStyle = c.light
  ctx.beginPath()
  ctx.roundRect(x - w / 2 + r, y + h * 0.06, w - r * 2, h * 0.08, r * 0.5)
  ctx.fill()
  const glass = lit ? '#ffe27a' : '#cfeeff'
  const frame = lit ? '#e6b93a' : '#8fc3ff'
  const wy = y + h * 0.3
  const wh = h * 0.42
  ctx.lineWidth = Math.max(1, h * 0.04)
  ctx.strokeStyle = frame
  if (level % 2 === 1) {
    for (const dx of [-0.22, 0.22]) {
      ctx.fillStyle = glass
      ctx.beginPath()
      ctx.roundRect(x + dx * w - w * 0.12, wy, w * 0.24, wh, r * 0.4)
      ctx.fill()
      ctx.stroke()
    }
  } else {
    ctx.fillStyle = glass
    ctx.beginPath()
    ctx.roundRect(x - w * 0.3, wy, w * 0.6, wh, r * 0.4)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, wy)
    ctx.lineTo(x, wy + wh)
    ctx.stroke()
  }
}

/** 屋顶（三角）+ 旗杆 + 挥动的队旗 */
export function drawRoof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, team: Team, wave: number): void {
  const c = TEAM[team]
  ctx.fillStyle = c.dark
  ctx.beginPath()
  ctx.moveTo(x - w * 0.6, y)
  ctx.lineTo(x, y - h)
  ctx.lineTo(x + w * 0.6, y)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#6b4f2e'
  ctx.fillRect(x - h * 0.03, y - h * 1.9, h * 0.06, h * 0.95)
  withTransform(ctx, x + h * 0.03, y - h * 1.9, Math.sin(wave) * 0.1, 1, 1, () => {
    ctx.fillStyle = c.main
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(h * 0.6 + Math.sin(wave * 1.3) * h * 0.05, h * 0.18)
    ctx.lineTo(0, h * 0.36)
    ctx.closePath()
    ctx.fill()
  })
}

/** 地基 */
export function drawFoundation(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = '#9a8a78'
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y, w, h, h * 0.3)
  ctx.fill()
  ctx.fillStyle = '#7d6e5d'
  ctx.fillRect(x - w / 2, y + h * 0.6, w, h * 0.4)
}

/** 飞鸟：两道弧线组成的 V，flap 是扇翅膀相位 */
export function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number): void {
  const lift = Math.sin(flap) * s * 0.35
  ctx.strokeStyle = '#3d2c1e'
  ctx.lineWidth = Math.max(1, s * 0.12)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - s, y - lift)
  ctx.quadraticCurveTo(x - s * 0.5, y + s * 0.2, x, y)
  ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.2, x + s, y - lift)
  ctx.stroke()
}

export interface BuilderPose {
  /** 离地高度（px） */
  lift: number
  /** 锤子角度（弧度，0 = 举着） */
  hammer: number
  /** 坐下 0…1 */
  sit: number
  /** 举双手欢呼 0…1 */
  cheer: number
  /** 眼皮 0…1 */
  blink: number
  /** 挠头 / 看向对面 0…1 */
  look: number
}

/** 小工人：圆脸、队色安全帽、背心、两条小腿、锤子。原点在脚下正中。 */
export function drawBuilder(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, p: BuilderPose): void {
  const c = TEAM[team]
  const sitY = p.sit * s * 0.25
  withTransform(ctx, x, y - p.lift + sitY, 0, 1, 1 - p.sit * 0.15, () => {
    ctx.lineWidth = Math.max(1, s * 0.05)
    // 腿
    ctx.fillStyle = '#5a6b8a'
    const legSpread = 0.12 + p.sit * 0.2
    ctx.fillRect(-s * (legSpread + 0.1), -s * 0.3, s * 0.12, s * 0.3)
    ctx.fillRect(s * (legSpread - 0.02), -s * 0.3, s * 0.12, s * 0.3)
    // 身体（背心）
    ctx.fillStyle = c.main
    ctx.beginPath()
    ctx.roundRect(-s * 0.24, -s * 0.66, s * 0.48, s * 0.4, s * 0.1)
    ctx.fill()
    ctx.fillStyle = '#ffd54a'
    ctx.fillRect(-s * 0.24, -s * 0.5, s * 0.48, s * 0.06)
    // 手臂 + 锤子（右手）
    const armA = p.cheer > 0 ? -1.6 - Math.sin(p.hammer) * 0.3 : p.hammer
    withTransform(ctx, s * 0.22, -s * 0.58, armA, 1, 1, () => {
      ctx.strokeStyle = '#f2c9a0'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(s * 0.3, 0)
      ctx.stroke()
      ctx.fillStyle = '#6b4f2e'
      ctx.fillRect(s * 0.28, -s * 0.02, s * 0.22, s * 0.05)
      ctx.fillStyle = '#7a7a8a'
      ctx.beginPath()
      ctx.roundRect(s * 0.44, -s * 0.11, s * 0.14, s * 0.18, s * 0.03)
      ctx.fill()
    })
    // 左手（欢呼时举起，挠头时放头上）
    const leftA = p.cheer > 0 ? -1.4 + Math.sin(p.hammer) * 0.3 : p.look > 0.3 ? -2.2 : 0.4
    withTransform(ctx, -s * 0.22, -s * 0.58, leftA, 1, 1, () => {
      ctx.strokeStyle = '#f2c9a0'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-s * 0.28, 0)
      ctx.stroke()
    })
    // 头
    const turn = p.look * 0.5
    withTransform(ctx, 0, -s * 0.84, turn * 0.2, 1, 1, () => {
      ctx.fillStyle = '#f9dcb8'
      circle(ctx, 0, 0, s * 0.2)
      ctx.fill()
      // 眼睛
      ctx.fillStyle = '#2b2b2b'
      if (p.blink > 0.5) {
        ctx.fillRect(-s * 0.1, -s * 0.02, s * 0.08, s * 0.02)
        ctx.fillRect(s * 0.02, -s * 0.02, s * 0.08, s * 0.02)
      } else {
        circle(ctx, -s * 0.06 + turn * s * 0.05, -s * 0.02, s * 0.03)
        ctx.fill()
        circle(ctx, s * 0.06 + turn * s * 0.05, -s * 0.02, s * 0.03)
        ctx.fill()
      }
      // 笑
      ctx.strokeStyle = '#c98a5a'
      ctx.beginPath()
      ctx.arc(0, s * 0.05, s * 0.07, 0.2, Math.PI - 0.2)
      ctx.stroke()
      // 安全帽
      ctx.fillStyle = c.main
      ctx.beginPath()
      ctx.arc(0, -s * 0.06, s * 0.22, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = c.dark
      ctx.beginPath()
      ctx.roundRect(-s * 0.27, -s * 0.09, s * 0.54, s * 0.06, s * 0.03)
      ctx.fill()
    })
  })
}
