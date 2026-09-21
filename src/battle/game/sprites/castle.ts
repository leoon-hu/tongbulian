/**
 * 拆城堡场景的道具：队色城砖（裂 / 闪）、带城垛与队旗的塔顶、小炮、炮弹、塌了之后的废墟。小动物复用摘果子的 drawPicker。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'

const TEAM: Record<Team, { main: string; dark: string; wall: string; wallDark: string; light: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', wall: '#f2c9b8', wallDark: '#d9a08a', light: '#ffe3e3' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', wall: '#c9dcf2', wallDark: '#96b9dc', light: '#dfeeff' },
}

/** 一块城砖：(x, top) 是这块的顶边中点；crack 0…1 裂纹长出来，glow 只剩一块时的闪 */
export function drawCastleBrick(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, h: number, team: Team, crack: number, glow: number): void {
  const c = TEAM[team]
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.6, () => {
      ctx.fillStyle = '#fff3b0'
      ctx.beginPath()
      ctx.roundRect(x - w * 0.62, top - h * 0.15, w * 1.24, h * 1.3, h * 0.3)
      ctx.fill()
    })
  }
  ctx.fillStyle = c.wall
  ctx.fillRect(x - w / 2, top, w, h)
  ctx.fillStyle = c.wallDark
  ctx.fillRect(x - w / 2, top + h * 0.82, w, h * 0.18)
  // 砖缝
  ctx.strokeStyle = 'rgba(90,60,40,0.3)'
  ctx.lineWidth = Math.max(1, h * 0.05)
  ctx.beginPath()
  ctx.moveTo(x - w / 2, top + h * 0.45)
  ctx.lineTo(x + w / 2, top + h * 0.45)
  ctx.moveTo(x, top)
  ctx.lineTo(x, top + h * 0.45)
  ctx.moveTo(x - w * 0.25, top + h * 0.45)
  ctx.lineTo(x - w * 0.25, top + h * 0.82)
  ctx.moveTo(x + w * 0.25, top + h * 0.45)
  ctx.lineTo(x + w * 0.25, top + h * 0.82)
  ctx.stroke()
  if (crack > 0.02) {
    ctx.strokeStyle = '#3d2c1e'
    ctx.lineWidth = Math.max(1, h * 0.06)
    ctx.lineCap = 'round'
    ctx.beginPath()
    const pts: [number, number][] = [
      [-0.3, 0.1],
      [-0.1, 0.35],
      [0.15, 0.25],
      [0.3, 0.6],
    ]
    const n = Math.max(1, Math.round(crack * pts.length))
    ctx.moveTo(x + pts[0]![0] * w, top + pts[0]![1] * h)
    for (let i = 1; i < n; i++) ctx.lineTo(x + pts[i]![0] * w, top + pts[i]![1] * h)
    ctx.stroke()
  }
}

/** 塔顶：一层带城垛的平台 + 小队旗；(x, top) 是平台顶边中点 */
export function drawBattlement(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, h: number, team: Team, wave: number): void {
  const c = TEAM[team]
  ctx.fillStyle = c.main
  ctx.fillRect(x - w * 0.55, top, w * 1.1, h * 0.35)
  ctx.fillStyle = c.dark
  ctx.fillRect(x - w * 0.55, top + h * 0.28, w * 1.1, h * 0.07)
  const merlon = (w * 1.1) / 7
  for (let i = 0; i < 7; i += 2) {
    ctx.fillStyle = c.main
    ctx.fillRect(x - w * 0.55 + i * merlon, top - merlon * 0.8, merlon, merlon * 0.8)
  }
  ctx.fillStyle = c.wall
  ctx.fillRect(x - w * 0.5, top + h * 0.35, w, h * 0.65)
  // 小旗
  const px = x - w * 0.42
  ctx.strokeStyle = '#6b4f2e'
  ctx.lineWidth = Math.max(1, w * 0.03)
  ctx.beginPath()
  ctx.moveTo(px, top - merlon * 0.8)
  ctx.lineTo(px, top - merlon * 0.8 - h * 0.9)
  ctx.stroke()
  withTransform(ctx, px, top - merlon * 0.8 - h * 0.9, Math.sin(wave) * 0.12, 1, 1, () => {
    ctx.fillStyle = c.main
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(h * 0.5 + Math.sin(wave * 1.3) * h * 0.05, h * 0.15)
    ctx.lineTo(0, h * 0.3)
    ctx.closePath()
    ctx.fill()
  })
}

/** 小炮：炮身 + 轮子；(x, y) 是轮子着地点，dir 是炮口朝向，recoil 0…1 后坐 */
export function drawCannon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: 1 | -1, recoil: number): void {
  withTransform(ctx, x - dir * recoil * s * 0.15, y, 0, dir, 1, () => {
    ctx.fillStyle = '#3d3d4a'
    withTransform(ctx, 0, -s * 0.32, -0.35, 1, 1, () => {
      fillRoundRect(ctx, -s * 0.28, -s * 0.13, s * 0.75, s * 0.26, s * 0.1, '#3d3d4a')
      ctx.fillStyle = '#5a5a6a'
      ctx.fillRect(s * 0.3, -s * 0.15, s * 0.17, s * 0.3)
    })
    ctx.fillStyle = '#8a5a3c'
    circle(ctx, 0, -s * 0.16, s * 0.16)
    ctx.fill()
    ctx.fillStyle = '#c9955a'
    circle(ctx, 0, -s * 0.16, s * 0.07)
    ctx.fill()
  })
}

export function drawCannonball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = '#2b2b33'
  circle(ctx, x, y, r)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.3)
  ctx.fill()
}

/** 塌了之后的废墟：几块歪着的砖 */
export function drawRubble(ctx: CanvasRenderingContext2D, x: number, groundY: number, w: number, team: Team): void {
  const c = TEAM[team]
  for (const [dx, dy, rot, sw] of [
    [-0.3, 0, 0.3, 0.5],
    [0.25, 0, -0.2, 0.45],
    [0, -0.18, 0.1, 0.4],
    [-0.1, -0.3, -0.4, 0.3],
  ] as const) {
    withTransform(ctx, x + dx * w, groundY + dy * w, rot, 1, 1, () => {
      ctx.fillStyle = c.wall
      ctx.fillRect((-sw * w) / 2, (-sw * w) / 2 / 2, sw * w, (sw * w) / 2)
      ctx.fillStyle = c.wallDark
      ctx.fillRect((-sw * w) / 2, (sw * w) / 4 - (sw * w) / 10, sw * w, (sw * w) / 10)
    })
  }
}

/** 炮口的烟：一团淡白 */
export function drawPuffSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = '#f4f4f8'
    circle(ctx, x, y, r)
    ctx.fill()
    ellipse(ctx, x + r * 0.7, y - r * 0.3, r * 0.7, r * 0.55)
    ctx.fill()
  })
}
