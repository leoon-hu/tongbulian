/**
 * 钓鱼场景的道具与角色：木码头、钓竿（弯、绕线轮）、鱼线、浮漂、水草、气泡、沙地上的贝壳与海星、杂鱼、队色的卡通鱼，
 * 以及坐在码头边钓鱼的小猫（红队）/ 小熊（蓝队）。钓鱼人的原点在屁股坐着的码头面上、身体正中；s 是坐高（头顶到码头面）。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'

const TEAM: Record<Team, { main: string; dark: string; light: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', light: '#ffb3b3' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', light: '#a9d3ff' },
}

export type AnglerKind = 'cat' | 'bear'

const SKIN: Record<AnglerKind, { fur: string; face: string }> = {
  cat: { fur: '#f2a65a', face: '#ffe6c7' },
  bear: { fur: '#b98a5c', face: '#e9c9a3' },
}

/** 钓竿的角度（离竖直的弧度）与长度（× 坐高） */
export const ROD_ANGLE = 0.6
export const ROD_LEN = 0.9

/** 码头：木板 + 两根桩子；从 x0 到 x1，y 是板面 */
export function drawDock(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, h: number, postBottom: number, k: number): void {
  const w = x1 - x0
  ctx.fillStyle = '#8a6a48'
  for (const px of [x0 + w * 0.2, x0 + w * 0.8]) ctx.fillRect(px - 1.5 * k, y, 3 * k, postBottom - y)
  fillRoundRect(ctx, x0, y, w, h, h * 0.3, '#c9955a')
  ctx.fillStyle = '#a8743f'
  ctx.fillRect(x0, y + h * 0.65, w, h * 0.35)
  ctx.strokeStyle = 'rgba(120,80,30,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  const planks = Math.max(2, Math.round(w / (8 * k)))
  for (let i = 1; i < planks; i++) {
    const px = x0 + (w * i) / planks
    ctx.moveTo(px, y)
    ctx.lineTo(px, y + h * 0.65)
  }
  ctx.stroke()
}

export interface RodGeometry {
  pivotX: number
  pivotY: number
  tipX: number
  tipY: number
  /** 竿身的控制点（弯的时候往下压） */
  ctrlX: number
  ctrlY: number
}

/** 钓竿的几何：手握处、竿尖（弯了竿尖往下往回一点）；x, y 是钓鱼人的原点 */
export function rodGeometry(x: number, y: number, s: number, facing: 1 | -1, bend: number, laid: number): RodGeometry {
  const pivotX = x + facing * 0.22 * s
  const pivotY = y - 0.5 * s
  const L = ROD_LEN * s
  const a = ROD_ANGLE + laid * 0.9
  const dx = facing * Math.sin(a) * L
  const dy = -Math.cos(a) * L
  const tipX = pivotX + dx - facing * bend * L * 0.12
  const tipY = pivotY + dy + bend * L * 0.32
  return {
    pivotX,
    pivotY,
    tipX,
    tipY,
    ctrlX: pivotX + dx * 0.6 - facing * bend * L * 0.02,
    ctrlY: pivotY + dy * 0.6 + bend * L * 0.1,
  }
}

/** 鱼线 */
export function drawLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, k: number, alpha = 0.85): void {
  withAlpha(ctx, alpha, () => {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(1, 1.1 * k)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  })
}

/** 浮漂：上红下白，glow 是还差一分的光 */
export function drawBobber(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, glow: number): void {
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.6, () => {
      ctx.fillStyle = '#fff3b0'
      circle(ctx, x, y, r * 3)
      ctx.fill()
    })
  }
  ctx.fillStyle = '#ffffff'
  circle(ctx, x, y, r)
  ctx.fill()
  ctx.fillStyle = '#ff6b6b'
  ctx.beginPath()
  ctx.arc(x, y, r, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffd54a'
  ctx.fillRect(x - r * 0.15, y - r * 1.8, r * 0.3, r * 0.8)
}

/** 水草：一条会摇的带子 */
export function drawSeaweed(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, sway: number, color: string): void {
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, h * 0.12)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + sway * h * 0.5, y - h * 0.55, x + sway * h * 0.25, y - h)
  ctx.stroke()
}

export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = Math.max(0.8, r * 0.3)
  circle(ctx, x, y, r)
  ctx.stroke()
}

export function drawShell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#f7c9b0'
  ctx.beginPath()
  ctx.arc(x, y, s, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(180,110,90,0.5)'
  ctx.lineWidth = Math.max(0.8, s * 0.12)
  ctx.beginPath()
  for (const a of [-0.6, 0, 0.6]) {
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.sin(a) * s, y - Math.cos(a) * s)
  }
  ctx.stroke()
}

export function drawStarfish(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number): void {
  ctx.fillStyle = '#ff9f43'
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? s : s * 0.45
    const a = rot + (Math.PI / 5) * i
    const px = x + rr * Math.cos(a)
    const py = y + rr * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

/** 杂鱼：灰色的小鱼 */
export function drawMinnow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: 1 | -1, wag: number): void {
  withTransform(ctx, x, y, 0, dir, 1, () => {
    ctx.fillStyle = '#b8c4cf'
    ctx.beginPath()
    ctx.moveTo(-s * 0.4, 0)
    ctx.lineTo(-s * 0.75, -s * 0.25 + Math.sin(wag) * s * 0.15)
    ctx.lineTo(-s * 0.75, s * 0.25 + Math.sin(wag) * s * 0.15)
    ctx.closePath()
    ctx.fill()
    ellipse(ctx, 0, 0, s * 0.45, s * 0.22)
    ctx.fill()
    ctx.fillStyle = '#2b2f3a'
    circle(ctx, s * 0.25, -s * 0.05, s * 0.05)
    ctx.fill()
  })
}

export interface FishPose {
  /** 朝向：1 头朝右、−1 头朝左（横着游的时候） */
  facing: 1 | -1
  /** 0 = 横着游，1 = 被线拉着头朝上 */
  up: number
  /** 挣扎的扭动角（弧度） */
  thrash: number
  /** 摆尾相位 */
  wag: number
  blink: number
  /** 嘴张开 0…1 */
  mouth: number
}

/** 队色的卡通鱼：原点在身体中心，s 是身长 */
export function drawTeamFish(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, p: FishPose): void {
  const c = TEAM[team]
  const rot = p.facing * (-Math.PI / 2) * p.up + p.thrash
  withTransform(ctx, x, y, rot, p.facing, 1, () => {
    const w = Math.sin(p.wag) * 0.3
    // 尾巴
    ctx.fillStyle = c.dark
    ctx.beginPath()
    ctx.moveTo(-s * 0.38, 0)
    ctx.lineTo(-s * 0.7, -s * 0.28 + w * s * 0.3)
    ctx.lineTo(-s * 0.62, w * s * 0.3)
    ctx.lineTo(-s * 0.7, s * 0.28 + w * s * 0.3)
    ctx.closePath()
    ctx.fill()
    // 背鳍
    ctx.beginPath()
    ctx.moveTo(-s * 0.2, -s * 0.2)
    ctx.quadraticCurveTo(0, -s * 0.5, s * 0.15, -s * 0.22)
    ctx.closePath()
    ctx.fill()
    // 身体 + 肚皮 + 条纹
    ctx.fillStyle = c.main
    ellipse(ctx, 0, 0, s * 0.48, s * 0.27)
    ctx.fill()
    ctx.fillStyle = c.light
    ellipse(ctx, s * 0.05, s * 0.1, s * 0.34, s * 0.13)
    ctx.fill()
    ctx.fillStyle = c.dark
    for (const sx of [-0.12, 0.04]) {
      ctx.beginPath()
      ctx.ellipse(sx * s, 0, s * 0.045, s * 0.24, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    // 胸鳍
    ctx.fillStyle = c.dark
    ellipse(ctx, s * 0.02, s * 0.14, s * 0.12, s * 0.06)
    ctx.fill()
    // 眼睛
    ctx.fillStyle = '#ffffff'
    circle(ctx, s * 0.27, -s * 0.07, s * 0.09)
    ctx.fill()
    ctx.fillStyle = '#2b2b2b'
    if (p.blink > 0.5) ctx.fillRect(s * 0.19, -s * 0.08, s * 0.16, Math.max(1, s * 0.03))
    else {
      circle(ctx, s * 0.3, -s * 0.07, s * 0.045)
      ctx.fill()
    }
    // 嘴
    ctx.fillStyle = c.dark
    if (p.mouth > 0.3) {
      circle(ctx, s * 0.45, s * 0.05, s * 0.05 * p.mouth + s * 0.02)
      ctx.fill()
    } else {
      ctx.strokeStyle = c.dark
      ctx.lineWidth = Math.max(1, s * 0.03)
      ctx.beginPath()
      ctx.arc(s * 0.4, s * 0.05, s * 0.06, -0.5, 0.9)
      ctx.stroke()
    }
  })
}

export interface AnglerPose {
  facing: 1 | -1
  /** 钓竿弯曲 0…1 */
  bend: number
  /** 绕线轮的转角 */
  reel: number
  /** 竿放平 0…1（赢了把鱼举起来的时候） */
  laid: number
  /** 离座高度（px） */
  lift: number
  /** 举起双手 0…1（手里拿着鱼） */
  cheer: number
  /** 挠头 0…1（输了） */
  scratch: number
  /** 晃腿相位 */
  swing: number
  blink: number
  /** 回头 0…1 */
  look: number
}

/** 坐在码头边钓鱼的小猫 / 小熊：原点在坐着的码头面、身体正中，本地朝右，蓝队 facing = −1 镜像 */
export function drawAngler(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: AnglerKind, p: AnglerPose): void {
  const c = TEAM[team]
  const sk = SKIN[kind]
  const rod = rodGeometry(x, y - p.lift, s, p.facing, p.bend, p.laid)
  // 钓竿（先画，手在上面）
  ctx.strokeStyle = '#6b4f2e'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1.5, s * 0.06)
  ctx.beginPath()
  ctx.moveTo(rod.pivotX - p.facing * s * 0.12, rod.pivotY + s * 0.1)
  ctx.quadraticCurveTo(rod.ctrlX, rod.ctrlY, rod.tipX, rod.tipY)
  ctx.stroke()
  // 绕线轮
  ctx.fillStyle = '#7a7a8a'
  circle(ctx, rod.pivotX - p.facing * s * 0.04, rod.pivotY + s * 0.12, s * 0.08)
  ctx.fill()
  ctx.strokeStyle = '#2b2b2b'
  ctx.lineWidth = Math.max(1, s * 0.03)
  ctx.beginPath()
  ctx.moveTo(rod.pivotX - p.facing * s * 0.04, rod.pivotY + s * 0.12)
  ctx.lineTo(rod.pivotX - p.facing * s * 0.04 + Math.cos(p.reel) * s * 0.08, rod.pivotY + s * 0.12 + Math.sin(p.reel) * s * 0.08)
  ctx.stroke()
  withTransform(ctx, x, y - p.lift, 0, p.facing, 1, () => {
    ctx.lineCap = 'round'
    // 腿：垂在码头边晃
    ctx.strokeStyle = sk.fur
    ctx.lineWidth = Math.max(1.5, s * 0.13)
    for (const d of [-1, 1] as const) {
      const sw = Math.sin(p.swing + (d < 0 ? Math.PI : 0)) * s * 0.08
      ctx.beginPath()
      ctx.moveTo(d * 0.1 * s + 0.1 * s, -0.12 * s)
      ctx.lineTo(d * 0.1 * s + 0.24 * s + sw, 0.32 * s)
      ctx.stroke()
      ctx.fillStyle = sk.fur
      ellipse(ctx, d * 0.1 * s + 0.26 * s + sw, 0.33 * s, s * 0.08, s * 0.045)
      ctx.fill()
    }
    // 身体 + 背心
    ctx.fillStyle = sk.fur
    ellipse(ctx, 0, -0.42 * s, 0.26 * s, 0.32 * s)
    ctx.fill()
    ctx.fillStyle = c.main
    ctx.beginPath()
    ctx.roundRect(-0.2 * s, -0.66 * s, 0.4 * s, 0.34 * s, 0.08 * s)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(-0.14 * s, -0.5 * s, 0.28 * s, 0.05 * s)
    // 手臂：握竿 / 举鱼 / 挠头
    ctx.strokeStyle = sk.fur
    ctx.lineWidth = Math.max(1.5, s * 0.1)
    ctx.beginPath()
    if (p.cheer > 0) {
      ctx.moveTo(0.14 * s, -0.6 * s)
      ctx.lineTo(0.12 * s, -1.08 * s)
      ctx.moveTo(-0.14 * s, -0.6 * s)
      ctx.lineTo(-0.1 * s, -1.08 * s)
    } else {
      ctx.moveTo(0.14 * s, -0.6 * s)
      ctx.lineTo(0.22 * s, -0.5 * s)
      ctx.moveTo(-0.14 * s, -0.6 * s)
      if (p.scratch > 0.3) ctx.lineTo(-0.2 * s, -1.02 * s)
      else ctx.lineTo(0.1 * s, -0.42 * s)
    }
    ctx.stroke()
    // 头
    withTransform(ctx, 0, -0.86 * s, -p.look * 0.4 + p.scratch * 0.1, 1, 1, () => {
      ctx.fillStyle = sk.fur
      if (kind === 'cat') {
        for (const d of [-1, 1] as const) {
          ctx.beginPath()
          ctx.moveTo(d * 0.08 * s, -0.16 * s)
          ctx.lineTo(d * 0.26 * s, -0.38 * s)
          ctx.lineTo(d * 0.28 * s, -0.08 * s)
          ctx.closePath()
          ctx.fill()
        }
      } else {
        circle(ctx, -0.22 * s, -0.18 * s, 0.09 * s)
        ctx.fill()
        circle(ctx, 0.22 * s, -0.18 * s, 0.09 * s)
        ctx.fill()
      }
      circle(ctx, 0, 0, 0.26 * s)
      ctx.fill()
      ctx.fillStyle = sk.face
      ellipse(ctx, 0, 0.07 * s, 0.14 * s, 0.1 * s)
      ctx.fill()
      if (kind === 'cat') {
        ctx.strokeStyle = 'rgba(120,80,30,0.5)'
        ctx.lineWidth = Math.max(0.8, s * 0.02)
        ctx.beginPath()
        for (const d of [-1, 1] as const) {
          ctx.moveTo(d * 0.1 * s, 0.06 * s)
          ctx.lineTo(d * 0.3 * s, 0.02 * s)
          ctx.moveTo(d * 0.1 * s, 0.1 * s)
          ctx.lineTo(d * 0.3 * s, 0.12 * s)
        }
        ctx.stroke()
      }
      ctx.fillStyle = '#2b2b2b'
      for (const d of [-1, 1] as const) {
        if (p.blink > 0.5) ctx.fillRect(d * 0.1 * s - 0.035 * s, -0.03 * s, 0.07 * s, Math.max(1, 0.02 * s))
        else {
          circle(ctx, d * 0.1 * s, -0.03 * s, 0.035 * s)
          ctx.fill()
        }
      }
      circle(ctx, 0, 0.05 * s, 0.03 * s)
      ctx.fill()
      ctx.strokeStyle = '#8a5a3a'
      ctx.lineWidth = Math.max(1, 0.03 * s)
      ctx.beginPath()
      if (p.cheer > 0) ctx.arc(0, 0.1 * s, 0.06 * s, 0, Math.PI)
      else ctx.arc(0, 0.09 * s, 0.05 * s, 0.2, Math.PI - 0.2)
      ctx.stroke()
      // 队色渔夫帽
      ctx.fillStyle = c.main
      ctx.beginPath()
      ctx.moveTo(-0.3 * s, -0.16 * s)
      ctx.lineTo(0.3 * s, -0.16 * s)
      ctx.lineTo(0.22 * s, -0.4 * s)
      ctx.lineTo(-0.22 * s, -0.4 * s)
      ctx.closePath()
      ctx.fill()
      fillRoundRect(ctx, -0.34 * s, -0.19 * s, 0.68 * s, 0.07 * s, 0.035 * s, c.dark)
    })
    // 握竿的手
    ctx.fillStyle = sk.fur
    circle(ctx, 0.22 * s, -0.5 * s, s * 0.065)
    ctx.fill()
    if (p.cheer > 0) {
      circle(ctx, 0.12 * s, -1.08 * s, s * 0.065)
      ctx.fill()
      circle(ctx, -0.1 * s, -1.08 * s, s * 0.065)
      ctx.fill()
    }
  })
}
