/** 太空场景的道具：星空渐变、闪烁的星星、五角星（目标星）、带环的行星、月亮、发射台、流星。 */
import { circle, ellipse, gradient, withTransform } from '../engine/draw'

export function spaceGradient(ctx: CanvasRenderingContext2D, h: number): CanvasGradient {
  return gradient(ctx, 0, 0, 0, h, [
    [0, '#0b1440'],
    [0.55, '#22225f'],
    [0.9, '#4b2b7c'],
    [1, '#7a4a6a'],
  ])
}

/** 背景小星星（圆点），alpha 由闪烁决定 */
export function drawTwinkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.fillStyle = '#ffffff'
  circle(ctx, x, y, r)
  ctx.fill()
  ctx.restore()
}

/** 五角星路径 */
export function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot = -Math.PI / 2): void {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45
    const a = rot + (Math.PI / 5) * i
    const px = x + rr * Math.cos(a)
    const py = y + rr * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/** 目标星：光晕按 pulse 脉动；reached 时炸开成光芒（rays 是光芒的旋转相位） */
export function drawGoalStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pulse: number, reached: boolean, rays: number): void {
  ctx.save()
  ctx.globalAlpha *= 0.25 + pulse * 0.35
  ctx.fillStyle = '#ffe27a'
  circle(ctx, x, y, r * (1.8 + pulse * 0.8))
  ctx.fill()
  ctx.restore()
  if (reached) {
    ctx.save()
    ctx.globalAlpha *= 0.7
    ctx.strokeStyle = '#fff3b0'
    ctx.lineWidth = Math.max(1, r * 0.12)
    for (let i = 0; i < 8; i++) {
      const a = rays + (Math.PI / 4) * i
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3)
      ctx.lineTo(x + Math.cos(a) * r * (2.6 + (i % 2) * 0.8), y + Math.sin(a) * r * (2.6 + (i % 2) * 0.8))
      ctx.stroke()
    }
    ctx.restore()
  }
  ctx.fillStyle = '#ffd54a'
  starPath(ctx, x, y, r * (1 + pulse * 0.15))
  ctx.fill()
  ctx.fillStyle = '#fff3b0'
  starPath(ctx, x - r * 0.1, y - r * 0.1, r * 0.45)
  ctx.fill()
}

/** 带环的行星 */
export function drawPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  withTransform(ctx, x, y, -0.35, 1, 1, () => {
    ctx.strokeStyle = 'rgba(255, 221, 160, 0.7)'
    ctx.lineWidth = Math.max(1, r * 0.18)
    ellipse(ctx, 0, 0, r * 1.7, r * 0.5)
    ctx.stroke()
    ctx.fillStyle = '#e9a86b'
    circle(ctx, 0, 0, r)
    ctx.fill()
    ctx.fillStyle = '#f4c48c'
    ctx.beginPath()
    ctx.roundRect(-r * 0.8, -r * 0.3, r * 1.6, r * 0.18, r * 0.09)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(-r * 0.7, r * 0.15, r * 1.4, r * 0.14, r * 0.07)
    ctx.fill()
    // 环的前半段盖在行星上
    ctx.strokeStyle = 'rgba(255, 233, 190, 0.9)'
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 1.7, r * 0.5, 0, 0.15, Math.PI - 0.15)
    ctx.stroke()
  })
}

export function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = '#fff6d5'
  circle(ctx, x, y, r)
  ctx.fill()
  ctx.fillStyle = '#e8dcb5'
  circle(ctx, x - r * 0.3, y - r * 0.2, r * 0.22)
  ctx.fill()
  circle(ctx, x + r * 0.25, y + r * 0.3, r * 0.16)
  ctx.fill()
}

/** 发射台：平台 + 小塔 + 台下的暖光（glow 0…1） */
export function drawLaunchPad(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, glow: number): void {
  if (glow > 0.02) {
    ctx.save()
    ctx.globalAlpha *= glow * 0.6
    ctx.fillStyle = '#ffb347'
    ellipse(ctx, x, y, w * 0.9, h * 0.8)
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = '#5a5a7a'
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h * 0.3, w, h * 0.3, h * 0.1)
  ctx.fill()
  ctx.fillStyle = '#3d3d5c'
  ctx.fillRect(x - w * 0.42, y, w * 0.84, h * 0.12)
  // 小塔（在右侧）
  ctx.fillStyle = '#8a8aa8'
  ctx.fillRect(x + w * 0.3, y - h * 1.3, w * 0.1, h)
  ctx.fillRect(x + w * 0.22, y - h * 1.3, w * 0.26, h * 0.08)
  ctx.fillStyle = '#ff6b6b'
  circle(ctx, x + w * 0.35, y - h * 1.36, h * 0.08)
  ctx.fill()
}

/** 流星：一条渐隐的斜线 */
export function drawShootingStar(ctx: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, alpha: number, len: number): void {
  const n = Math.hypot(vx, vy) || 1
  const dx = (vx / n) * len
  const dy = (vy / n) * len
  const g = ctx.createLinearGradient(x, y, x - dx, y - dy)
  g.addColorStop(0, `rgba(255,255,255,${alpha})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.strokeStyle = g
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - dx, y - dy)
  ctx.stroke()
}
