/**
 * 孵蛋场景的道具与角色：小红谷仓、木栅栏、草窝（分前后两半，蛋坐在里面）、带裂缝 / 小洞 / 顶起壳盖的蛋、小鸡、系头巾的母鸡。
 * 蛋的原点在蛋心，w / h 是蛋的宽高；小鸡与母鸡的原点在脚下正中。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

const SHELL = '#fff4dc'
const SHELL_DARK = '#e8d9b8'
const CHICK = '#ffd54a'
const CHICK_DARK = '#e6b93a'
const ORANGE = '#ff9f43'

/** 远处的小红谷仓 */
export function drawBarn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = '#c94444'
  ctx.fillRect(x - w / 2, y - h * 0.6, w, h * 0.6)
  ctx.fillStyle = '#7a2e2e'
  ctx.beginPath()
  ctx.moveTo(x - w * 0.58, y - h * 0.6)
  ctx.lineTo(x - w * 0.3, y - h)
  ctx.lineTo(x + w * 0.3, y - h)
  ctx.lineTo(x + w * 0.58, y - h * 0.6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f4f1ea'
  ctx.fillRect(x - w * 0.16, y - h * 0.42, w * 0.32, h * 0.42)
  ctx.strokeStyle = '#c94444'
  ctx.lineWidth = Math.max(1, w * 0.03)
  ctx.beginPath()
  ctx.moveTo(x - w * 0.16, y - h * 0.42)
  ctx.lineTo(x + w * 0.16, y)
  ctx.moveTo(x + w * 0.16, y - h * 0.42)
  ctx.lineTo(x - w * 0.16, y)
  ctx.stroke()
}

/** 木栅栏：两道横杆 + 木桩 */
export function drawWoodFence(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, h: number, k: number): void {
  const step = Math.max(14, 22 * k)
  ctx.fillStyle = '#a8743f'
  for (let x = x0 + step * 0.4; x < x1; x += step) ctx.fillRect(x - 1.5 * k, y - h, 3 * k, h)
  ctx.fillStyle = '#c9955a'
  ctx.fillRect(x0, y - h * 0.75, x1 - x0, Math.max(1.5, 2.5 * k))
  ctx.fillRect(x0, y - h * 0.35, x1 - x0, Math.max(1.5, 2.5 * k))
}

/** 草窝：part = back 画蛋后面的一半，front 画蛋前面的一圈；(x, y) 是窝口椭圆的中心 */
export function drawNest(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, part: 'back' | 'front'): void {
  if (part === 'back') {
    ctx.fillStyle = '#b0813f'
    ellipse(ctx, x, y + h * 0.35, w * 0.55, h * 0.75)
    ctx.fill()
    ctx.fillStyle = '#6b4a2f'
    ellipse(ctx, x, y, w * 0.48, h * 0.42)
    ctx.fill()
    return
  }
  ctx.fillStyle = '#c9955a'
  ctx.beginPath()
  ctx.ellipse(x, y + h * 0.15, w * 0.55, h * 0.55, 0, 0, Math.PI)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#d9ab6a'
  ctx.beginPath()
  ctx.ellipse(x, y + h * 0.05, w * 0.5, h * 0.4, 0, 0, Math.PI)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#e6c37e'
  ctx.lineWidth = Math.max(1, h * 0.07)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i < 7; i++) {
    const px = x - w * 0.45 + (w * 0.9 * i) / 6
    ctx.moveTo(px, y + h * 0.1)
    ctx.lineTo(px + w * 0.1, y + h * 0.5)
  }
  ctx.stroke()
}

/** 蛋壳上的裂缝：按顺序一条条多起来（蛋坐标：x ±0.5 = 宽，y ±0.5 = 高） */
const CRACKS: readonly (readonly [number, number])[][] = [
  [[0.05, -0.35], [0.12, -0.22], [0.06, -0.1]],
  [[-0.2, -0.05], [-0.1, 0.05], [-0.22, 0.15]],
  [[0.2, 0.06], [0.3, 0.16], [0.22, 0.28]],
  [[-0.05, 0.2], [0.05, 0.3], [-0.02, 0.4]],
  [[-0.3, -0.25], [-0.22, -0.15], [-0.32, -0.02]],
  [[0.28, -0.2], [0.36, -0.1], [0.3, 0.0]],
  [[-0.12, -0.42], [-0.05, -0.3], [-0.15, -0.2]],
  [[0.1, 0.42], [0.02, 0.35], [0.12, 0.25]],
]

function eggPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath()
  ctx.moveTo(0, -h * 0.5)
  ctx.bezierCurveTo(w * 0.38, -h * 0.5, w * 0.5, -h * 0.05, w * 0.5, h * 0.12)
  ctx.bezierCurveTo(w * 0.5, h * 0.4, w * 0.25, h * 0.5, 0, h * 0.5)
  ctx.bezierCurveTo(-w * 0.25, h * 0.5, -w * 0.5, h * 0.4, -w * 0.5, h * 0.12)
  ctx.bezierCurveTo(-w * 0.5, -h * 0.05, -w * 0.38, -h * 0.5, 0, -h * 0.5)
  ctx.closePath()
}

/** 裂开的那条线：锯齿 */
function zigzag(ctx: CanvasRenderingContext2D, w: number, y: number, dir: 1 | -1): void {
  const n = 6
  for (let i = 1; i <= n; i++) {
    const x = dir * (-w * 0.47 + (w * 0.94 * i) / n)
    ctx.lineTo(x, y + (i % 2 === 1 ? -w * 0.05 : w * 0.05))
  }
}

/** 壳的上盖（裂开线以上） */
function capPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const y = -h * 0.12
  ctx.beginPath()
  ctx.moveTo(-w * 0.47, y)
  zigzag(ctx, w, y, 1)
  ctx.bezierCurveTo(w * 0.5, -h * 0.3, w * 0.3, -h * 0.5, 0, -h * 0.5)
  ctx.bezierCurveTo(-w * 0.3, -h * 0.5, -w * 0.5, -h * 0.3, -w * 0.47, y)
  ctx.closePath()
}

/** 壳的下半（裂开线以下） */
function bottomPath(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const y = -h * 0.12
  ctx.beginPath()
  ctx.moveTo(w * 0.47, y)
  zigzag(ctx, w, y, -1)
  ctx.bezierCurveTo(-w * 0.52, h * 0.1, -w * 0.5, h * 0.4, 0, h * 0.5)
  ctx.bezierCurveTo(w * 0.5, h * 0.4, w * 0.52, h * 0.1, w * 0.47, y)
  ctx.closePath()
}

function shellFill(ctx: CanvasRenderingContext2D, w: number): void {
  ctx.fillStyle = SHELL
  ctx.fill()
  ctx.strokeStyle = SHELL_DARK
  ctx.lineWidth = Math.max(1, w * 0.03)
  ctx.stroke()
}

/** 小鸡的脑袋（从壳缝里探出来的那部分，也用在整只小鸡上） */
function chickHead(ctx: CanvasRenderingContext2D, r: number, blink: number, look: number): void {
  ctx.fillStyle = CHICK
  circle(ctx, 0, 0, r)
  ctx.fill()
  ctx.fillStyle = '#2b2b2b'
  for (const d of [-1, 1] as const) {
    if (blink > 0.5) ctx.fillRect(d * r * 0.38 - r * 0.14 + look * r * 0.1, -r * 0.1, r * 0.28, Math.max(1, r * 0.08))
    else {
      circle(ctx, d * r * 0.38 + look * r * 0.1, -r * 0.1, r * 0.13)
      ctx.fill()
    }
  }
  ctx.fillStyle = ORANGE
  ctx.beginPath()
  ctx.moveTo(-r * 0.2, r * 0.18)
  ctx.lineTo(r * 0.2, r * 0.18)
  ctx.lineTo(0, r * 0.45)
  ctx.closePath()
  ctx.fill()
}

export interface EggPose {
  /** 裂缝数 0…8 */
  cracks: number
  /** 小洞 0…1 */
  hole: number
  /** 从洞里探出的嘴 0…1 */
  beak: number
  /** 壳盖被顶起 0…1（露出小鸡的眼睛） */
  lift: number
  /** 壳盖已经飞走（孵出来了）：只画下半个壳 */
  broken: boolean
  /** 晃动角 */
  rot: number
  /** 还差一分 / 孵出来时的光 */
  glow: number
  blink: number
  look: number
}

/** 蛋：整只 → 有裂缝 → 有洞和嘴 → 壳盖顶起露出小鸡 → 只剩下半个壳 */
export function drawEgg(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: EggPose): void {
  if (p.glow > 0.02) {
    withAlpha(ctx, p.glow * 0.55, () => {
      ctx.fillStyle = '#fff3b0'
      ellipse(ctx, x, y, w * 0.95, h * 0.8)
      ctx.fill()
    })
  }
  withTransform(ctx, x, y, p.rot, 1, 1, () => {
    if (p.broken) {
      bottomPath(ctx, w, h)
      shellFill(ctx, w)
      return
    }
    if (p.lift > 0.02) {
      bottomPath(ctx, w, h)
      shellFill(ctx, w)
      // 缝里的小鸡脑袋
      withTransform(ctx, 0, -h * 0.12 - p.lift * h * 0.1, 0, 1, 1, () => chickHead(ctx, w * 0.28, p.blink, p.look))
      withTransform(ctx, 0, -p.lift * h * 0.24, p.lift * 0.22, 1, 1, () => {
        capPath(ctx, w, h)
        shellFill(ctx, w)
      })
    } else {
      eggPath(ctx, w, h)
      shellFill(ctx, w)
    }
    // 斑点
    ctx.fillStyle = 'rgba(200,170,120,0.35)'
    circle(ctx, -w * 0.18, -h * 0.2, w * 0.05)
    ctx.fill()
    circle(ctx, w * 0.22, h * 0.24, w * 0.04)
    ctx.fill()
    // 裂缝
    ctx.strokeStyle = '#6b6b78'
    ctx.lineWidth = Math.max(1, w * 0.035)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i < Math.min(CRACKS.length, p.cracks); i++) {
      const line = CRACKS[i]!
      line.forEach(([cx, cy], j) => {
        if (j === 0) ctx.moveTo(cx * w, cy * h)
        else ctx.lineTo(cx * w, cy * h)
      })
    }
    ctx.stroke()
    // 小洞 + 探出的嘴
    if (p.hole > 0.02) {
      ctx.fillStyle = '#3d2c1e'
      ellipse(ctx, w * 0.15, h * 0.12, w * 0.15 * p.hole, h * 0.11 * p.hole)
      ctx.fill()
      if (p.beak > 0.02) {
        ctx.fillStyle = ORANGE
        ctx.beginPath()
        ctx.moveTo(w * 0.12, h * 0.05)
        ctx.lineTo(w * 0.12, h * 0.19)
        ctx.lineTo(w * (0.12 + 0.2 * p.beak), h * 0.12)
        ctx.closePath()
        ctx.fill()
      }
    }
  })
}

export interface ChickPose {
  /** 离地高度 */
  lift: number
  /** 拍小翅膀 0…1 */
  flap: number
  /** 头上扣着的壳盖 0…1 */
  hat: number
  blink: number
  look: number
  dir: 1 | -1
}

/** 孵出来的小鸡：圆身子、小翅膀、橙嘴橙脚；原点在脚下正中 */
export function drawChick(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, p: ChickPose): void {
  withTransform(ctx, x, y - p.lift, 0, p.dir, 1, () => {
    ctx.strokeStyle = ORANGE
    ctx.lineWidth = Math.max(1, s * 0.06)
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const d of [-1, 1] as const) {
      ctx.moveTo(d * s * 0.12, -s * 0.15)
      ctx.lineTo(d * s * 0.16, 0)
      ctx.moveTo(d * s * 0.16, 0)
      ctx.lineTo(d * s * 0.26, 0)
    }
    ctx.stroke()
    ctx.fillStyle = CHICK
    ellipse(ctx, 0, -s * 0.42, s * 0.36, s * 0.32)
    ctx.fill()
    const wing = 0.3 - p.flap * 1.4
    for (const d of [-1, 1] as const) {
      withTransform(ctx, d * s * 0.3, -s * 0.45, d * wing, 1, 1, () => {
        ctx.fillStyle = CHICK_DARK
        ellipse(ctx, 0, s * 0.1, s * 0.09, s * 0.2)
        ctx.fill()
      })
    }
    withTransform(ctx, 0, -s * 0.82, 0, 1, 1, () => chickHead(ctx, s * 0.3, p.blink, p.look))
    if (p.hat > 0.02) {
      withTransform(ctx, s * 0.05, -s * 1.02, 0.2, p.hat, p.hat, () => {
        capPath(ctx, s * 0.62, s * 0.62)
        shellFill(ctx, s * 0.62)
      })
    }
  })
}

export interface HenPose {
  /** 翅膀张开 0…1.5 */
  flap: number
  lift: number
  /** 歪头 −1…1 */
  tilt: number
  blink: number
  dir: 1 | -1
}

/** 母鸡：白身子、红冠、黄嘴、队色头巾；原点在脚下正中，本地朝右 */
export function drawHen(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, p: HenPose): void {
  const c = TEAM[team]
  withTransform(ctx, x, y - p.lift, 0, p.dir, 1, () => {
    ctx.strokeStyle = ORANGE
    ctx.lineWidth = Math.max(1, s * 0.06)
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const d of [-1, 1] as const) {
      ctx.moveTo(d * s * 0.1, -s * 0.22)
      ctx.lineTo(d * s * 0.12, 0)
      ctx.moveTo(d * s * 0.12, 0)
      ctx.lineTo(d * s * 0.24, 0)
    }
    ctx.stroke()
    // 尾羽
    ctx.fillStyle = '#e8e2d2'
    for (const a of [-0.5, -0.2, 0.15]) {
      withTransform(ctx, -s * 0.34, -s * 0.5, a, 1, 1, () => {
        ellipse(ctx, -s * 0.16, 0, s * 0.18, s * 0.07)
        ctx.fill()
      })
    }
    // 身子
    ctx.fillStyle = '#fbf8f0'
    ellipse(ctx, 0, -s * 0.46, s * 0.4, s * 0.3)
    ctx.fill()
    // 翅膀（张开时从肩膀往上抬）
    const wing = 0.35 - Math.min(1.5, p.flap) * 1.6
    withTransform(ctx, -s * 0.05, -s * 0.52, wing, 1, 1, () => {
      ctx.fillStyle = '#ece6d6'
      ellipse(ctx, -s * 0.12, s * 0.06, s * 0.24, s * 0.12)
      ctx.fill()
    })
    // 头巾（脖子）
    fillRoundRect(ctx, s * 0.1, -s * 0.78, s * 0.26, s * 0.1, s * 0.05, c.main)
    ctx.fillStyle = c.dark
    ctx.beginPath()
    ctx.moveTo(s * 0.12, -s * 0.74)
    ctx.lineTo(-s * 0.02, -s * 0.66)
    ctx.lineTo(s * 0.1, -s * 0.62)
    ctx.closePath()
    ctx.fill()
    // 头
    withTransform(ctx, s * 0.26, -s * 0.9, p.tilt * 0.3, 1, 1, () => {
      ctx.fillStyle = '#fbf8f0'
      circle(ctx, 0, 0, s * 0.2)
      ctx.fill()
      ctx.fillStyle = '#e04848'
      for (const [dx, r] of [
        [-0.1, 0.07],
        [0, 0.09],
        [0.1, 0.07],
      ] as const) {
        circle(ctx, dx * s, -s * 0.2, r * s)
        ctx.fill()
      }
      ellipse(ctx, s * 0.14, s * 0.16, s * 0.05, s * 0.08)
      ctx.fill()
      ctx.fillStyle = ORANGE
      ctx.beginPath()
      ctx.moveTo(s * 0.16, -s * 0.02)
      ctx.lineTo(s * 0.36, s * 0.05)
      ctx.lineTo(s * 0.16, s * 0.1)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#2b2b2b'
      if (p.blink > 0.5) ctx.fillRect(s * 0.02, -s * 0.05, s * 0.09, Math.max(1, s * 0.025))
      else {
        circle(ctx, s * 0.07, -s * 0.05, s * 0.04)
        ctx.fill()
      }
    })
  })
}
