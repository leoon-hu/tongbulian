/** canvas 的尺寸与像素比：把画布调到盒子大小 × dpr，之后一律用 CSS 像素坐标画。 */

/** 像素比封顶 2（B34a ⑥）：Retina 够清楚，再高只是白耗 GPU */
export function deviceScale(max = 2): number {
  const raw = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.min(max, raw)
}

/**
 * 把 canvas 调成 width × height（CSS 像素）× dpr，返回已按 dpr 缩放的 2D 上下文；
 * 环境没有 canvas（测试里的 happy-dom）返回 null，调用方要能在 null 下静默。
 */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
): CanvasRenderingContext2D | null {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = canvas.getContext('2d')
  } catch {
    ctx = null
  }
  if (!ctx || typeof ctx.setTransform !== 'function') return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

/** 用户系统设置了「减少动态效果」 */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
