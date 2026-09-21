/**
 * 挖宝的渲染：renderBackground 画不动的部分（天空、草地、八层土与里面的石子 / 树根 / 骨头、井口的滑轮架），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、蚯蚓、闪烁的宝石、宝箱、竖井、绳子、头灯的光、粒子、两只角色）。
 */
import { withAlpha } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { STRATA, drawBone, drawChest, drawDigger, drawGem, drawLampGlow, drawPebble, drawPulley, drawRoot, drawRope, drawShaft, drawStratum, drawWorm } from '@/battle/game/sprites/dig'
import { drawCloud, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import type { DigGeometry, DigModel } from './model'

/** 土层里的装饰：按层固定摆放（避开两口井），不用随机数，尺寸变了重画也一样 */
function decorate(ctx: CanvasRenderingContext2D, g: DigGeometry): void {
  const { W, k } = g
  const free = [W * 0.09, W * 0.5, W * 0.91]
  for (let i = 0; i < 8; i++) {
    const top = g.surfaceY + g.pitch * i
    const y = top + g.pitch * (0.3 + ((i * 7) % 5) * 0.1)
    const x = free[i % 3]! + (((i * 13) % 7) - 3) * k
    if (i < 3) drawRoot(ctx, x, y, 9 * k)
    else if (i === 3 || i === 6) drawBone(ctx, x, y, 8 * k, i === 3 ? 0.4 : -0.6)
    drawPebble(ctx, free[(i + 1) % 3]! + ((i * 5) % 4) * k, top + g.pitch * 0.7, (2 + (i % 3)) * k)
    drawPebble(ctx, free[(i + 2) % 3]! - ((i * 3) % 5) * k, top + g.pitch * 0.45, (1.6 + ((i + 1) % 2)) * k)
  }
}

export function renderBackground(ctx: CanvasRenderingContext2D, g: DigGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.surfaceY)
  ctx.fillRect(0, 0, W, g.surfaceY)
  for (let i = 0; i < 8; i++) drawStratum(ctx, 0, g.surfaceY + g.pitch * i, W, g.pitch + 1, i)
  drawStratum(ctx, 0, g.surfaceY + g.pitch * 8, W, H - g.surfaceY - g.pitch * 8, 7)
  if (!g.compact) decorate(ctx, g)
  // 草地
  ctx.fillStyle = '#8fd47a'
  ctx.fillRect(0, g.surfaceY - Math.max(3, 5 * k), W, Math.max(3, 5 * k))
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.surfaceY - Math.max(1, 1.5 * k), W, Math.max(1, 1.5 * k))
  for (const x of g.shaftX) drawPulley(ctx, x, g.surfaceY - Math.max(3, 5 * k), g.size * 0.8)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: DigModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, W * 0.82, g.surfaceY * 0.4, 7 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
    for (const gl of m.glints) drawGem(ctx, gl.x, gl.y, 3.2 * k, gl.color, m.glintOf(gl))
    drawWorm(ctx, m.worm.x, m.worm.y, 7 * k, t * 6, m.worm.out)
  }
  m.diggers.forEach((d, i) => {
    const x = g.shaftX[i]!
    const reached = d.pos.value >= g.chestTop - 0.5
    // 宝箱（没挖到时隔着土隐约看得见）
    drawChest(ctx, x, g.chestTop, g.chestW, g.chestH, d.team, m.chestOpen[i]!.value, m.chestGlow[i]!.value)
    if (!reached) {
      withAlpha(ctx, 0.5, () => {
        ctx.fillStyle = STRATA[7]!
        ctx.fillRect(x - g.shaftW / 2, g.chestTop - g.chestH * 0.4, g.shaftW, g.chestH * 1.5)
      })
    }
    // 竖井：从地面挖到脚下
    drawShaft(ctx, x, g.surfaceY - 1, d.pos.value + 1.5 * k, g.shaftW, k)
    if (d.mood !== 'ready') drawRope(ctx, x - g.size * 0.3, g.surfaceY - g.size * 0.75, d.pos.value - g.size * 0.55, k)
    drawLampGlow(ctx, x, d.pos.value - m.liftOf(d) - g.size * 0.6, g.size * 0.9, m.lampOf(d) * (d.mood === 'ready' ? 0.3 : 1))
  })
  m.particles.draw(ctx)
  m.diggers.forEach((d, i) => {
    drawDigger(ctx, g.shaftX[i]!, d.pos.value, g.size, d.team, m.kinds[i]!, {
      swing: m.swingOf(d),
      lift: m.liftOf(d),
      cheer: d.mood === 'win' ? 1 : 0,
      sit: m.sitOf(d),
      lamp: m.lampOf(d),
      blink: d.blink.value,
      look: d.look.value,
      sway: m.swayOf(d),
    })
  })
}
