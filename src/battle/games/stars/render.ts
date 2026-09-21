/**
 * 点亮星星的渲染：renderBackground 画不动的部分（夜空、山影、月亮），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（闪的小星星、小云与两只角色、连线、大星星、火花、粒子）。
 */
import { circle, withAlpha } from '@/battle/game/engine/draw'
import { drawBigStar, drawConstellation, drawHillsSilhouette, drawMoon, drawPuff, drawSpark, drawStarKid, nightGradient } from '@/battle/game/sprites/stars'
import type { StarsGeometry, StarsModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: StarsGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = nightGradient(ctx, H)
  ctx.fillRect(0, 0, W, H)
  if (!g.compact) {
    drawMoon(ctx, W * 0.9, H * 0.22, 9 * k)
    drawHillsSilhouette(ctx, W, H * 0.8, H * 0.2)
  }
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: StarsModel): void {
  const g = m.geo
  const { k } = g
  for (const t of m.twinkles) {
    withAlpha(ctx, m.twinkleOf(t), () => {
      ctx.fillStyle = '#ffffff'
      circle(ctx, t.x, t.y, t.r)
      ctx.fill()
    })
  }
  m.kids.forEach((kid, i) => {
    const pts = g.stars[i]!
    drawConstellation(ctx, pts, m.lines[i]!.value, kid.team, Math.max(1, 1.6 * k))
    pts.forEach((p, n) => drawBigStar(ctx, p.x, p.y, g.starR, kid.team, m.litOf(i, n), m.scaleOf(i, n), m.pulseOf(i, n)))
    const spark = m.sparkOf(i)
    if (spark) drawSpark(ctx, spark.x, spark.y, g.starR * 0.5, kid.team, spark.alpha)
    const lift = m.liftOf(kid)
    drawPuff(ctx, g.kidX, g.kidY[i]! + g.size * 0.05, g.size * 0.75)
    drawStarKid(ctx, g.kidX, g.kidY[i]!, g.size, kid.team, m.kinds[i]!, {
      wave: m.waveOf(kid, i),
      lift,
      cheer: kid.mood === 'win' ? 1 : 0,
      sleepy: m.sleepyOf(kid),
      blink: kid.blink.value,
      look: kid.look.value,
      dir: 1,
    })
  })
  m.particles.draw(ctx)
}
