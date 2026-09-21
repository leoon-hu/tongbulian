/**
 * 爬梯子场景的道具与角色：木梯（横档会弯）、树屋平台与栏杆、旗子、树干与树冠、落叶，以及抓着梯子的小动物（面朝观众）。
 * 角色原点在脚下正中；s 是身高。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'
import type { CritterKind } from './scenery'
import { FUR } from './tug'

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

const WOOD = '#c9955a'
const WOOD_DARK = '#a8743f'

/** 一架木梯：两根竖杆 + rungs 级横档；flexAt 那一级往下弯 sag 像素 */
export function drawLadder(ctx: CanvasRenderingContext2D, x: number, bottom: number, top: number, gap: number, rungYs: readonly number[], rail: number, flexAt: number, sag: number): void {
  const half = gap / 2
  for (const d of [-1, 1] as const) fillRoundRect(ctx, x + d * half - rail / 2, top - rail, rail, bottom - top + rail * 2, rail / 2, WOOD)
  ctx.strokeStyle = WOOD_DARK
  ctx.lineCap = 'round'
  ctx.lineWidth = rail * 0.85
  rungYs.forEach((y, i) => {
    ctx.beginPath()
    ctx.moveTo(x - half, y)
    if (i === flexAt && sag > 0.2) ctx.quadraticCurveTo(x, y + sag * 2, x + half, y)
    else ctx.lineTo(x + half, y)
    ctx.stroke()
  })
}

/** 树屋平台：一块木板 + 后面的栏杆（栏杆可以不画） */
export function drawPlatform(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, h: number, railing: boolean, k: number): void {
  if (railing) {
    const rh = h * 3.2
    ctx.strokeStyle = WOOD_DARK
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1.5, 2 * k)
    ctx.beginPath()
    const n = 4
    for (let i = 0; i <= n; i++) {
      const px = x0 + ((x1 - x0) * i) / n
      ctx.moveTo(px, y)
      ctx.lineTo(px, y - rh)
    }
    ctx.moveTo(x0, y - rh)
    ctx.lineTo(x1, y - rh)
    ctx.stroke()
  }
  fillRoundRect(ctx, x0, y, x1 - x0, h, h * 0.3, WOOD)
  ctx.fillStyle = WOOD_DARK
  ctx.fillRect(x0, y + h * 0.65, x1 - x0, h * 0.35)
  ctx.strokeStyle = 'rgba(120,80,30,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  const planks = Math.max(3, Math.round((x1 - x0) / (10 * k)))
  for (let i = 1; i < planks; i++) {
    const px = x0 + ((x1 - x0) * i) / planks
    ctx.moveTo(px, y)
    ctx.lineTo(px, y + h * 0.65)
  }
  ctx.stroke()
}

/** 旗子：杆 + 队色三角旗（wave 是飘动相位，glow 是还差一分的光晕）；原点在杆的底部 */
export function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, team: Team, wave: number, glow: number, strength = 1): void {
  const c = TEAM[team]
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.55, () => {
      ctx.fillStyle = '#fff3b0'
      circle(ctx, x + h * 0.25, y - h * 0.75, h * 0.45)
      ctx.fill()
    })
  }
  ctx.strokeStyle = '#6b4f2e'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1.5, h * 0.07)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - h)
  ctx.stroke()
  ctx.fillStyle = '#ffd54a'
  circle(ctx, x, y - h, h * 0.06)
  ctx.fill()
  const fw = h * 0.55
  const fh = h * 0.34
  const flutter = Math.sin(wave) * fh * 0.22 * strength
  const flutter2 = Math.sin(wave * 1.4 + 1) * fh * 0.12 * strength
  ctx.fillStyle = c.main
  ctx.beginPath()
  ctx.moveTo(x, y - h * 0.98)
  ctx.quadraticCurveTo(x + fw * 0.5, y - h * 0.98 + flutter2, x + fw, y - h * 0.98 + fh * 0.5 + flutter)
  ctx.quadraticCurveTo(x + fw * 0.5, y - h * 0.98 + fh + flutter2, x, y - h * 0.98 + fh)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = c.dark
  ctx.fillRect(x, y - h * 0.98, Math.max(1, h * 0.04), fh)
}

/** 树干 */
export function drawTrunk(ctx: CanvasRenderingContext2D, x: number, bottom: number, top: number, w: number): void {
  fillRoundRect(ctx, x - w / 2, top, w, bottom - top, w * 0.2, '#9a6a48')
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fillRect(x + w * 0.2, top, w * 0.3, bottom - top)
  ctx.strokeStyle = 'rgba(60,35,15,0.35)'
  ctx.lineWidth = Math.max(1, w * 0.05)
  ctx.beginPath()
  ctx.moveTo(x - w * 0.15, top + (bottom - top) * 0.3)
  ctx.quadraticCurveTo(x - w * 0.05, top + (bottom - top) * 0.45, x - w * 0.18, top + (bottom - top) * 0.6)
  ctx.stroke()
}

/** 树冠：几团绿 */
export function drawCanopy(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const blobs: [number, number, number, string][] = [
    [-0.3, 0.1, 0.42, '#4ea63f'],
    [0.3, 0.12, 0.4, '#4ea63f'],
    [0, -0.1, 0.5, '#5fb84a'],
    [-0.15, 0.3, 0.32, '#7ccf62'],
    [0.2, 0.32, 0.3, '#7ccf62'],
  ]
  for (const [dx, dy, r, color] of blobs) {
    ctx.fillStyle = color
    ellipse(ctx, x + dx * w, y + dy * h, r * w, r * h * 1.1)
    ctx.fill()
  }
}

/** 一片叶子 */
export function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, color: string): void {
  withTransform(ctx, x, y, rot, 1, 1, () => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-s, 0)
    ctx.quadraticCurveTo(0, -s * 0.7, s, 0)
    ctx.quadraticCurveTo(0, s * 0.7, -s, 0)
    ctx.closePath()
    ctx.fill()
  })
}

export interface ClimberPose {
  /** 手脚交替 −1…1（正数 = 左手右脚在上） */
  climb: number
  /** 手抓在头顶的横档上 0…1（0 = 站在地上手放下） */
  grip: number
  /** 离地高度（px） */
  lift: number
  /** 举双手欢呼 0…1 */
  cheer: number
  /** 挂在横档上晃腿 0…1（输了） */
  hang: number
  /** 晃腿相位 */
  swing: number
  /** 手里举着旗 0…1 */
  flag: number
  /** 旗子飘动相位 */
  wave: number
  blink: number
  /** 回头 / 仰头看 0…1 */
  look: number
  /** 左右摆 −1…1 */
  sway: number
}

/** 抓着梯子的小动物（面朝观众）：圆脸、队色头带与背心、四肢；原点在脚下正中 */
export function drawClimber(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: ClimberPose): void {
  const c = TEAM[team]
  const [fur, accent] = FUR[kind]
  const hang = p.hang
  withTransform(ctx, x + p.sway * s * 0.04, y - p.lift + hang * s * 0.22, p.sway * 0.04, 1, 1, () => {
    ctx.lineCap = 'round'
    const hipY = -0.42 * s
    const shY = -0.66 * s
    // 腿
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.12)
    for (const d of [-1, 1] as const) {
      const up = Math.max(0, d < 0 ? -p.climb : p.climb) * (1 - hang)
      const dangle = hang * Math.sin(p.swing + (d < 0 ? Math.PI : 0)) * s * 0.1
      ctx.beginPath()
      ctx.moveTo(d * 0.1 * s, hipY)
      ctx.lineTo(d * 0.15 * s + dangle, -up * 0.16 * s + hang * s * 0.05)
      ctx.stroke()
      ctx.fillStyle = fur
      ellipse(ctx, d * 0.16 * s + dangle, -up * 0.16 * s + hang * s * 0.05, s * 0.07, s * 0.045)
      ctx.fill()
    }
    // 背心
    ctx.fillStyle = c.main
    ctx.beginPath()
    ctx.roundRect(-0.2 * s, shY - 0.02 * s, 0.4 * s, 0.32 * s, 0.08 * s)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(-0.14 * s, shY + 0.14 * s, 0.28 * s, 0.05 * s)
    // 手臂
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.1)
    for (const d of [-1, 1] as const) {
      const up = Math.max(0, d < 0 ? p.climb : -p.climb)
      let hx: number
      let hy: number
      if (p.cheer > 0) {
        hx = d * 0.34 * s
        hy = -1.12 * s - Math.sin(p.wave * 1.5 + d) * 0.05 * s
        if (p.flag > 0 && d > 0) hy = -1.05 * s
      } else if (hang > 0) {
        hx = d * 0.2 * s
        hy = -1.05 * s + hang * 0.05 * s
      } else if (p.grip < 0.5) {
        hx = d * 0.24 * s
        hy = shY + 0.28 * s
      } else {
        hx = d * 0.22 * s
        hy = -0.98 * s - up * 0.14 * s
      }
      ctx.beginPath()
      ctx.moveTo(d * 0.16 * s, shY + 0.04 * s)
      ctx.lineTo(hx, hy)
      ctx.stroke()
      ctx.fillStyle = fur
      circle(ctx, hx, hy, s * 0.06)
      ctx.fill()
      if (p.flag > 0 && d > 0) drawFlag(ctx, hx, hy + s * 0.12, s * 0.75, team, p.wave, 0, 1.4)
    }
    // 头
    const tilt = -p.look * 0.35
    withTransform(ctx, 0, -0.88 * s, tilt, 1, 1, () => {
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
      const ey = -0.03 * s - p.look * 0.03 * s
      for (const ex of [-0.1 * s, 0.1 * s]) {
        if (p.blink > 0.5) ctx.fillRect(ex - 0.035 * s, ey, 0.07 * s, Math.max(1, 0.02 * s))
        else {
          circle(ctx, ex, ey, 0.035 * s)
          ctx.fill()
        }
      }
      ctx.strokeStyle = '#8a5a3a'
      ctx.lineWidth = Math.max(1, 0.03 * s)
      ctx.beginPath()
      if (p.cheer > 0) {
        ctx.fillStyle = '#c0392b'
        ellipse(ctx, 0, 0.11 * s, 0.05 * s, 0.04 * s)
        ctx.fill()
      } else if (hang > 0.5) ctx.arc(0, 0.12 * s, 0.03 * s, 0, Math.PI * 2)
      else ctx.arc(0, 0.08 * s, 0.06 * s, 0.15, Math.PI - 0.15)
      ctx.stroke()
      // 队色头带
      fillRoundRect(ctx, -0.27 * s, -0.2 * s, 0.54 * s, 0.09 * s, 0.045 * s, c.dark)
    })
  })
}
