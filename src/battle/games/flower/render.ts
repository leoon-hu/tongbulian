/**
 * 种花的渲染：renderBackground 画不动的部分（天空、山丘、栅栏、草地），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、蜜蜂、花盆、小芽 / 茎 / 叶 / 花苞 / 花朵、洒水壶、蝴蝶、粒子）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawBee, drawBloom, drawBud, drawButterfly, drawFence, drawLeaf, drawPot, drawSprout, drawStem, drawWateringCan } from '@/battle/game/sprites/flower'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { LEAVES, type FlowerGeometry, type FlowerModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: FlowerGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.groundY)
  ctx.fillRect(0, 0, W, g.groundY)
  if (!g.compact) {
    drawHill(ctx, W * 0.25, g.groundY - g.potH * 0.9, W * 0.5, g.potH * 0.9, '#b9e59c')
    drawHill(ctx, W * 0.85, g.groundY - g.potH * 0.8, W * 0.55, g.potH * 1.0, '#a8dd8b')
    drawFence(ctx, 0, W, g.groundY - g.potH * 0.75, g.potH * 1.1, k)
  }
  ctx.fillStyle = gradient(ctx, 0, g.groundY - g.potH * 0.8, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.groundY - g.potH * 0.8, W, H - g.groundY + g.potH * 0.8)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, Math.max(1, 2 * k))
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: FlowerModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, W * 0.82, g.tipMax * 0.45, 8 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
    if (m.bee) drawBee(ctx, m.bee.x, m.beeY(), 5 * k, m.bee.v > 0 ? 1 : -1, t * 40)
  }
  m.plants.forEach((p, i) => {
    const lift = m.liftOf(p)
    drawPot(ctx, g.plantX[i]!, g.potTop - lift, g.potW, g.potH, p.team)
    const H = m.stemH(p)
    if (H < 0.5) {
      drawSprout(ctx, g.plantX[i]!, g.soilY - lift, g.potW * 0.28, m.wiggleOf(p))
    } else {
      const c = m.stemCurve(i)
      drawStem(ctx, c.x0, c.y0, c.cx, c.cy, c.x1, c.y1, Math.max(2.5, g.potW * 0.1))
      for (let n = 1; n <= LEAVES; n++) {
        const sc = m.leafScale(p, n)
        if (sc < 0.02) continue
        const pt = m.stemPoint(i, m.leafH(n))
        const side = n % 2 === 1 ? -1 : 1
        const tilt = pt.ang + Math.PI / 2
        const ang = side < 0 ? Math.PI + 0.45 + tilt : -0.45 + tilt
        drawLeaf(ctx, pt.x, pt.y, g.leafLen, ang, sc)
      }
      const tip = m.tip(i)
      const bud = m.budScale(p, i)
      drawBud(ctx, tip.x, tip.y - g.bloomR * 0.45 * bud, g.bloomR * 0.55, p.team, bud, m.budGlow[i]!.value * (1 - m.bloom[i]!.value))
      drawBloom(ctx, tip.x, tip.y - g.bloomR * 0.3, g.bloomR, p.team, m.bloom[i]!.value, m.animated ? t * 1.5 + i : 0, m.budGlow[i]!.value * m.bloom[i]!.value)
    }
    const w = m.water[i]!.value
    if (w > 0.05) {
      const can = m.canPos(i)
      drawWateringCan(ctx, can.x, can.y, g.potW * 0.7, -0.75 * Math.min(1, w), can.dir)
    }
  })
  for (const b of m.butterflies) {
    const at = m.butterflyAt(b)
    drawButterfly(ctx, at.x, at.y, 5 * k, at.flap, b.color)
  }
  m.particles.draw(ctx)
}
