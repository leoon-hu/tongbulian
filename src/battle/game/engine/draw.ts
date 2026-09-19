/** 画图助手：圆角矩形、圆、椭圆、渐变、带变换 / 透明度的局部绘制。都只用 Canvas 2D 的基本调用。 */

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
): void {
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.closePath()
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.closePath()
}

export function gradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: readonly (readonly [number, string])[],
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  for (const [at, color] of stops) g.addColorStop(at, color)
  return g
}

/** 在 (x, y) 处按旋转 / 缩放画一段东西，画完恢复 */
export function withTransform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  sx: number,
  sy: number,
  fn: () => void,
): void {
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
  fn()
  ctx.restore()
}

export function withAlpha(ctx: CanvasRenderingContext2D, alpha: number, fn: () => void): void {
  const prev = ctx.globalAlpha
  ctx.globalAlpha = prev * Math.max(0, Math.min(1, alpha))
  fn()
  ctx.globalAlpha = prev
}
