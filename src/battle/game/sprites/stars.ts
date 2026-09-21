/**
 * 点亮星星场景的道具与角色：夜空、小星星、月亮、山影、小云、大星星（暗 / 亮 / 发光）、星星之间的连线、
 * 以及坐在云上举魔法棒的小动物（面朝观众）。角色原点在屁股坐着的云面上、身体正中；s 是坐高。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, gradient, withAlpha, withTransform } from '../engine/draw'
import type { CritterKind } from './scenery'
import { starPath } from './space'
import { FUR } from './tug'

const TEAM: Record<Team, { main: string; dark: string; glow: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', glow: 'rgba(255,107,107,0.55)' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', glow: 'rgba(74,163,255,0.55)' },
}

export function nightGradient(ctx: CanvasRenderingContext2D, h: number): CanvasGradient {
  return gradient(ctx, 0, 0, 0, h, [
    [0, '#141b3d'],
    [0.7, '#2a2a5e'],
    [1, '#4a3a6e'],
  ])
}

/** 一弯月亮 */
export function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  withAlpha(ctx, 0.25, () => {
    ctx.fillStyle = '#fff3b0'
    circle(ctx, x, y, r * 1.8)
    ctx.fill()
  })
  ctx.fillStyle = '#fff3b0'
  circle(ctx, x, y, r)
  ctx.fill()
  ctx.fillStyle = '#1b2148'
  circle(ctx, x + r * 0.45, y - r * 0.2, r * 0.82)
  ctx.fill()
}

/** 底下一排山的剪影 */
export function drawHillsSilhouette(ctx: CanvasRenderingContext2D, W: number, y: number, h: number): void {
  ctx.fillStyle = '#1b1f45'
  ctx.beginPath()
  ctx.moveTo(0, y + h)
  const n = 7
  for (let i = 0; i <= n; i++) {
    const x = (W * i) / n
    const peak = y + h * (i % 2 === 0 ? 0.55 : 0.05 + ((i * 3) % 4) * 0.1)
    ctx.quadraticCurveTo(x - W / n / 2, peak, x, y + h * (i % 2 === 0 ? 0.25 : 0.7))
  }
  ctx.lineTo(W, y + h)
  ctx.closePath()
  ctx.fill()
}

/** 大星星：lit 亮起来（金色 + 队色光晕），暗的只有轮廓；pulse 是还差一分时的一闪一闪 */
export function drawBigStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, team: Team, lit: number, scale: number, pulse: number): void {
  const c = TEAM[team]
  if (lit > 0.02) {
    withAlpha(ctx, lit * 0.9, () => {
      ctx.fillStyle = c.glow
      circle(ctx, x, y, r * (1.9 + pulse * 0.3) * scale)
      ctx.fill()
    })
  } else if (pulse > 0.02) {
    withAlpha(ctx, pulse * 0.5, () => {
      ctx.fillStyle = c.glow
      circle(ctx, x, y, r * 1.6)
      ctx.fill()
    })
  }
  withTransform(ctx, x, y, 0, scale, scale, () => {
    if (lit > 0.02) {
      ctx.fillStyle = '#ffd54a'
      starPath(ctx, 0, 0, r)
      ctx.fill()
      withAlpha(ctx, lit * 0.8, () => {
        ctx.fillStyle = '#fff6c8'
        starPath(ctx, 0, 0, r * 0.5)
        ctx.fill()
      })
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      starPath(ctx, 0, 0, r)
      ctx.fill()
      ctx.strokeStyle = 'rgba(200,210,255,0.55)'
      ctx.lineWidth = Math.max(1, r * 0.12)
      ctx.stroke()
    }
  })
}

/** 星星之间的连线：progress 0…1 从第一颗连到最后一颗 */
export function drawConstellation(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[], progress: number, team: Team, width: number): void {
  if (progress <= 0.01 || pts.length < 2) return
  const total = (pts.length - 1) * progress
  ctx.strokeStyle = TEAM[team].main
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  withAlpha(ctx, 0.9, () => {
    ctx.beginPath()
    ctx.moveTo(pts[0]!.x, pts[0]!.y)
    for (let i = 1; i < pts.length; i++) {
      const seg = total - (i - 1)
      if (seg <= 0) break
      const a = pts[i - 1]!
      const b = pts[i]!
      const t = Math.min(1, seg)
      ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    }
    ctx.stroke()
  })
}

/** 飞着的火花 */
export function drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, team: Team, alpha: number): void {
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = TEAM[team].glow
    circle(ctx, x, y, r * 2.2)
    ctx.fill()
    ctx.fillStyle = '#fff6c8'
    starPath(ctx, x, y, r)
    ctx.fill()
  })
}

/** 小云（角色坐的） */
export function drawPuff(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = 'rgba(230,236,255,0.9)'
  circle(ctx, x - s * 0.45, y, s * 0.32)
  ctx.fill()
  circle(ctx, x + s * 0.45, y, s * 0.32)
  ctx.fill()
  circle(ctx, x, y - s * 0.1, s * 0.45)
  ctx.fill()
  fillRoundRect(ctx, x - s * 0.7, y, s * 1.4, s * 0.3, s * 0.15, 'rgba(230,236,255,0.9)')
}

export interface StarKidPose {
  /** 魔法棒挥动 0…1 */
  wave: number
  lift: number
  cheer: number
  /** 睡着了 0…1 */
  sleepy: number
  blink: number
  look: number
  dir: 1 | -1
}

/** 坐在云上的小动物：队色围巾、一只手举着顶着星星的魔法棒；原点在坐着的云面上、身体正中 */
export function drawStarKid(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: StarKidPose): void {
  const c = TEAM[team]
  const [fur, accent] = FUR[kind]
  const sleepy = p.sleepy
  withTransform(ctx, x, y - p.lift, sleepy * 0.25 * p.dir, p.dir, 1, () => {
    ctx.lineCap = 'round'
    // 盘着的腿
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.13)
    ctx.beginPath()
    ctx.moveTo(-0.12 * s, -0.16 * s)
    ctx.lineTo(-0.34 * s, 0)
    ctx.moveTo(0.12 * s, -0.16 * s)
    ctx.lineTo(0.34 * s, 0)
    ctx.stroke()
    // 身子 + 围巾
    ctx.fillStyle = fur
    ellipse(ctx, 0, -0.42 * s, 0.26 * s, 0.32 * s)
    ctx.fill()
    fillRoundRect(ctx, -0.22 * s, -0.66 * s, 0.44 * s, 0.1 * s, 0.05 * s, c.main)
    ctx.fillStyle = c.dark
    ctx.fillRect(0.06 * s, -0.62 * s, 0.09 * s, 0.2 * s)
    // 手臂：右手举魔法棒（挥动 / 欢呼举高 / 睡着垂下）
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.1)
    const armA = sleepy > 0.5 ? 0.9 : p.cheer > 0 ? -1.5 : -0.9 + p.wave * 0.8
    const hx = 0.16 * s + Math.cos(armA) * 0.34 * s
    const hy = -0.6 * s + Math.sin(armA) * 0.34 * s
    ctx.beginPath()
    ctx.moveTo(0.16 * s, -0.6 * s)
    ctx.lineTo(hx, hy)
    ctx.moveTo(-0.16 * s, -0.6 * s)
    ctx.lineTo(p.cheer > 0 ? -0.3 * s : -0.3 * s, p.cheer > 0 ? -1.0 * s : -0.4 * s)
    ctx.stroke()
    // 魔法棒
    const wandA = armA - 0.9 - p.wave * 0.6
    withTransform(ctx, hx, hy, wandA, 1, 1, () => {
      ctx.strokeStyle = '#c9a3ff'
      ctx.lineWidth = Math.max(1.5, s * 0.06)
      ctx.beginPath()
      ctx.moveTo(0, s * 0.08)
      ctx.lineTo(0, -s * 0.42)
      ctx.stroke()
      ctx.fillStyle = '#ffd54a'
      starPath(ctx, 0, -s * 0.5, s * 0.13)
      ctx.fill()
    })
    ctx.fillStyle = fur
    circle(ctx, hx, hy, s * 0.06)
    ctx.fill()
    // 头
    withTransform(ctx, 0, -0.84 * s, -p.look * 0.3 + sleepy * 0.2, 1, 1, () => {
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
      const closed = p.blink > 0.5 || sleepy > 0.5
      for (const ex of [-0.1 * s, 0.1 * s]) {
        if (closed) ctx.fillRect(ex - 0.035 * s, -0.03 * s, 0.07 * s, Math.max(1, 0.02 * s))
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
      } else ctx.arc(0, 0.09 * s, sleepy > 0.5 ? 0.03 * s : 0.06 * s, 0.15, Math.PI - 0.15)
      ctx.stroke()
    })
  })
}
