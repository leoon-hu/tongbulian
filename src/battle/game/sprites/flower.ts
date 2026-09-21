/**
 * 种花场景的道具：花盆、小芽、茎、叶、花苞、花朵、洒水壶、蜜蜂、蝴蝶、栅栏。
 * 都只用 Canvas 2D 的基本调用；茎是一条二次曲线，叶子按角度贴在茎上。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'

const TEAM: Record<Team, { main: string; dark: string; light: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', light: '#ffb3b3' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', light: '#a9d3ff' },
}

const STEM = '#4ea63f'
const STEM_DARK = '#3b8a32'
const LEAF = '#5fb84a'
const LEAF_DARK = '#3f9a35'

/** 花盆：上宽下窄 + 盆沿 + 队色带 + 盆里的土；top 是盆沿的顶边 */
export function drawPot(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, h: number, team: Team): void {
  ctx.fillStyle = '#d98a55'
  ctx.beginPath()
  ctx.moveTo(x - w * 0.5, top + h * 0.22)
  ctx.lineTo(x + w * 0.5, top + h * 0.22)
  ctx.lineTo(x + w * 0.4, top + h)
  ctx.lineTo(x - w * 0.4, top + h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = TEAM[team].main
  ctx.beginPath()
  ctx.moveTo(x - w * 0.47, top + h * 0.4)
  ctx.lineTo(x + w * 0.47, top + h * 0.4)
  ctx.lineTo(x + w * 0.45, top + h * 0.56)
  ctx.lineTo(x - w * 0.45, top + h * 0.56)
  ctx.closePath()
  ctx.fill()
  fillRoundRect(ctx, x - w * 0.55, top, w * 1.1, h * 0.24, h * 0.08, '#e29a63')
  ctx.fillStyle = '#6b4a2f'
  ellipse(ctx, x, top + h * 0.12, w * 0.46, h * 0.08)
  ctx.fill()
}

/** 还没长起来的小芽：两片小叶 */
export function drawSprout(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, wiggle: number): void {
  withTransform(ctx, x, y, wiggle, 1, 1, () => {
    ctx.strokeStyle = STEM
    ctx.lineWidth = Math.max(1, s * 0.12)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -s * 0.6)
    ctx.stroke()
    ctx.fillStyle = LEAF
    for (const d of [-1, 1] as const) {
      ellipse(ctx, d * s * 0.28, -s * 0.62, s * 0.3, s * 0.16)
      ctx.fill()
    }
  })
}

/** 茎：从 (x0,y0) 经控制点到 (x1,y1) 的二次曲线，深色宽线打底、亮色细线在上 */
export function drawStem(ctx: CanvasRenderingContext2D, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, width: number): void {
  ctx.lineCap = 'round'
  for (const [color, w] of [
    [STEM_DARK, width],
    [STEM, width * 0.6],
  ] as const) {
    ctx.strokeStyle = color
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(cx, cy, x1, y1)
    ctx.stroke()
  }
}

/** 叶子：从 (x,y) 沿 ang 方向伸出 len 长，scale 是弹出来的程度 */
export function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, scale: number): void {
  if (scale < 0.02) return
  withTransform(ctx, x, y, ang, scale, scale, () => {
    ctx.fillStyle = LEAF
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0)
    ctx.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = LEAF_DARK
    ctx.lineWidth = Math.max(0.8, len * 0.04)
    ctx.beginPath()
    ctx.moveTo(len * 0.08, 0)
    ctx.lineTo(len * 0.85, 0)
    ctx.stroke()
  })
}

/** 花苞：队色的水滴形 + 三片绿萼；glow 是还差一分的光 */
export function drawBud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, team: Team, scale: number, glow: number): void {
  if (scale < 0.02) return
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.55, () => {
      ctx.fillStyle = '#fff3b0'
      circle(ctx, x, y, r * 2 * scale)
      ctx.fill()
    })
  }
  withTransform(ctx, x, y, 0, scale, scale, () => {
    ctx.fillStyle = TEAM[team].main
    ctx.beginPath()
    ctx.moveTo(0, -r * 1.3)
    ctx.quadraticCurveTo(r * 1.1, -r * 0.4, 0, r * 0.7)
    ctx.quadraticCurveTo(-r * 1.1, -r * 0.4, 0, -r * 1.3)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = TEAM[team].light
    ellipse(ctx, -r * 0.3, -r * 0.4, r * 0.18, r * 0.4)
    ctx.fill()
    ctx.fillStyle = LEAF_DARK
    for (const a of [-0.9, 0, 0.9]) {
      ctx.beginPath()
      ctx.moveTo(0, r * 0.7)
      ctx.lineTo(Math.sin(a) * r * 0.8, r * 0.7 - Math.cos(a) * r * 0.9)
      ctx.lineTo(Math.sin(a) * r * 0.25, r * 0.15)
      ctx.closePath()
      ctx.fill()
    }
  })
}

/** 花朵：六片队色花瓣绕着黄花心；scale 是开的程度，wave 是轻轻转的相位 */
export function drawBloom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, team: Team, scale: number, wave: number, glow: number): void {
  if (scale < 0.02) return
  const c = TEAM[team]
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.5, () => {
      ctx.fillStyle = '#fff3b0'
      circle(ctx, x, y, r * 1.8 * scale)
      ctx.fill()
    })
  }
  withTransform(ctx, x, y, Math.sin(wave) * 0.06, scale, scale, () => {
    for (let i = 0; i < 6; i++) {
      withTransform(ctx, 0, 0, (i * Math.PI) / 3, 1, 1, () => {
        ctx.fillStyle = c.main
        ellipse(ctx, 0, -r * 0.62, r * 0.34, r * 0.6)
        ctx.fill()
        ctx.fillStyle = c.light
        ellipse(ctx, 0, -r * 0.72, r * 0.16, r * 0.34)
        ctx.fill()
      })
    }
    ctx.fillStyle = '#ffd54a'
    circle(ctx, 0, 0, r * 0.36)
    ctx.fill()
    ctx.fillStyle = '#ffe9a0'
    circle(ctx, -r * 0.1, -r * 0.1, r * 0.14)
    ctx.fill()
  })
}

/** 洒水壶：壶身 + 提手 + 壶嘴；tilt 是倾倒的角度（负数 = 壶嘴朝下），dir 1 壶嘴朝左浇、−1 朝右 */
export function drawWateringCan(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, tilt: number, dir: 1 | -1): void {
  withTransform(ctx, x, y, tilt * dir, dir, 1, () => {
    fillRoundRect(ctx, -s * 0.35, -s * 0.28, s * 0.7, s * 0.56, s * 0.12, '#7fa7c9')
    ctx.fillStyle = '#5f88aa'
    ctx.fillRect(-s * 0.35, -s * 0.28, s * 0.7, s * 0.08)
    ctx.strokeStyle = '#5f88aa'
    ctx.lineWidth = Math.max(1.5, s * 0.09)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, -s * 0.28, s * 0.22, Math.PI, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-s * 0.3, -s * 0.05)
    ctx.lineTo(-s * 0.72, -s * 0.42)
    ctx.stroke()
    ctx.fillStyle = '#5f88aa'
    circle(ctx, -s * 0.74, -s * 0.44, s * 0.13)
    ctx.fill()
    ctx.fillStyle = '#9ec3e0'
    for (const [dx, dy] of [
      [-0.08, -0.06],
      [0.06, 0.02],
      [-0.02, 0.09],
    ] as const) {
      circle(ctx, -s * 0.74 + dx * s, -s * 0.44 + dy * s, s * 0.025)
      ctx.fill()
    }
  })
}

/** 小蜜蜂：黄黑条纹的身子、两片扇动的翅膀 */
export function drawBee(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: 1 | -1, flap: number): void {
  withTransform(ctx, x, y, 0, dir, 1, () => {
    const w = 0.4 + Math.abs(Math.sin(flap)) * 0.6
    withAlpha(ctx, 0.7, () => {
      ctx.fillStyle = '#e6f4ff'
      ellipse(ctx, -s * 0.1, -s * 0.35, s * 0.32 * w, s * 0.2)
      ctx.fill()
      ellipse(ctx, s * 0.15, -s * 0.35, s * 0.28 * w, s * 0.18)
      ctx.fill()
    })
    ctx.fillStyle = '#ffd54a'
    ellipse(ctx, 0, 0, s * 0.45, s * 0.3)
    ctx.fill()
    ctx.fillStyle = '#2b2b2b'
    for (const sx of [-0.2, 0.05]) {
      ctx.beginPath()
      ctx.ellipse(sx * s, 0, s * 0.07, s * 0.29, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    circle(ctx, s * 0.42, -s * 0.02, s * 0.14)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    circle(ctx, s * 0.46, -s * 0.06, s * 0.05)
    ctx.fill()
    ctx.strokeStyle = '#2b2b2b'
    ctx.lineWidth = Math.max(0.8, s * 0.04)
    ctx.beginPath()
    ctx.moveTo(-s * 0.45, 0)
    ctx.lineTo(-s * 0.6, 0)
    ctx.stroke()
  })
}

/** 蝴蝶：两对翅膀按 flap 开合、细身子 */
export function drawButterfly(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number, color: string): void {
  const open = 0.25 + Math.abs(Math.cos(flap)) * 0.75
  withTransform(ctx, x, y, Math.sin(flap * 0.5) * 0.15, 1, 1, () => {
    ctx.fillStyle = color
    for (const d of [-1, 1] as const) {
      ellipse(ctx, d * s * 0.42 * open, -s * 0.18, s * 0.42 * open, s * 0.32)
      ctx.fill()
      ellipse(ctx, d * s * 0.32 * open, s * 0.22, s * 0.3 * open, s * 0.22)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (const d of [-1, 1] as const) {
      circle(ctx, d * s * 0.45 * open, -s * 0.2, s * 0.1)
      ctx.fill()
    }
    ctx.strokeStyle = '#3d2c1e'
    ctx.lineWidth = Math.max(1, s * 0.08)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.4)
    ctx.lineTo(0, s * 0.4)
    ctx.moveTo(0, -s * 0.4)
    ctx.lineTo(-s * 0.15, -s * 0.6)
    ctx.moveTo(0, -s * 0.4)
    ctx.lineTo(s * 0.15, -s * 0.6)
    ctx.stroke()
  })
}

/** 白色木栅栏：一根根尖头木条 + 两道横条 */
export function drawFence(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, h: number, k: number): void {
  const step = Math.max(8, 11 * k)
  const w = step * 0.45
  ctx.fillStyle = '#f4f1ea'
  for (let x = x0 + step * 0.3; x < x1; x += step) {
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y)
    ctx.lineTo(x - w / 2, y - h + w * 0.6)
    ctx.lineTo(x, y - h)
    ctx.lineTo(x + w / 2, y - h + w * 0.6)
    ctx.lineTo(x + w / 2, y)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#e6e2d8'
  ctx.fillRect(x0, y - h * 0.7, x1 - x0, Math.max(1.5, 2.5 * k))
  ctx.fillRect(x0, y - h * 0.3, x1 - x0, Math.max(1.5, 2.5 * k))
}
