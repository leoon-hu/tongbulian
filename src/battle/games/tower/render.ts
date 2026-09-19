/**
 * 盖楼的渲染：renderBackground 画不动的部分（天空、太阳、山丘、草地、地基），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（云、小鸟、冲刺的星星、砖块、屋顶与旗、工人、粒子）。
 */
import { breathe } from '@/battle/game/engine/rig'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { starPath } from '@/battle/game/sprites/space'
import { drawBird, drawBlock, drawBuilder, drawFoundation, drawRoof } from '@/battle/game/sprites/town'
import type { TowerGeometry, TowerModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: TowerGeometry): void {
  const { W, H } = g
  ctx.fillStyle = skyGradient(ctx, H)
  ctx.fillRect(0, 0, W, H)
  if (!g.compact) {
    drawSun(ctx, W * 0.82, H * 0.07, 8 * g.k, 0.5)
    drawHill(ctx, W * 0.3, g.groundY + 4 * g.k, W * 0.5, H * 0.09, '#b9e59c')
    drawHill(ctx, W * 0.8, g.groundY + 6 * g.k, W * 0.55, H * 0.1, '#a8dd8b')
  }
  ctx.fillStyle = '#7fcf62'
  ctx.fillRect(0, g.groundY, W, H - g.groundY)
  ctx.fillStyle = '#5fb84a'
  ctx.fillRect(0, g.groundY, W, Math.max(2, 3 * g.k))
  for (const x of g.colX) drawFoundation(ctx, x, g.groundY - g.foundH, g.colW * 1.15, g.foundH)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: TowerModel): void {
  const g = m.geo
  const t = m.time
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  if (m.bird) drawBird(ctx, m.bird.x, m.bird.y, 5 * g.k, m.bird.flap)
  for (const tw of m.towers) {
    const x = g.colX[tw.team === 'red' ? 0 : 1]
    const landed = m.landedCount(tw)
    // 落稳的砖：整座楼从地基处按压缩比缩放
    const sq = m.squashOf(tw)
    ctx.save()
    ctx.translate(0, g.groundY - g.foundH)
    ctx.scale(1, sq)
    ctx.translate(0, -(g.groundY - g.foundH))
    for (const b of tw.bricks) {
      if (!b.landed) continue
      drawBlock(ctx, x, b.y.value, g.colW, g.blockH, tw.team, b.level, b.level <= tw.lit)
    }
    ctx.restore()
    // 正在落的砖
    for (const b of tw.bricks) {
      if (b.landed || b.delay > 0) continue
      drawBlock(ctx, x, b.y.value, g.colW, g.blockH, tw.team, b.level, false)
    }
    // 冲刺：领先的楼顶上方一颗闪着的星
    if (m.sprint && tw.score === Math.max(m.towers[0].score, m.towers[1].score) && tw.score < m.target) {
      const pulse = m.animated ? breathe(t, 0.8) : 0.5
      ctx.save()
      ctx.globalAlpha *= 0.5 + pulse * 0.5
      ctx.fillStyle = '#ffd54a'
      starPath(ctx, x, m.topOf(landed) - g.size * 1.6 - pulse * 3 * g.k, g.size * 0.35)
      ctx.fill()
      ctx.restore()
    }
    // 屋顶与旗（赢了）
    if (tw.roof) drawRoof(ctx, x, tw.roof.value, g.colW, g.roofH, tw.team, m.animated ? m.flagWave : 0)
    // 工人
    const cheer = tw.mood === 'win' || tw.cheer.value > 0.3 ? 1 : 0
    const sit = tw.mood === 'lose' ? Math.min(1, tw.moodT * 2) : 0
    const hammer =
      tw.mood === 'lose' ? 0.9 + Math.sin(tw.hammer) * 0.12 : tw.mood === 'ready' ? -0.6 + Math.sin(tw.hammer * 2) * 0.3 : m.animated ? -0.4 + Math.sin(tw.hammer) * 0.9 : 0.3
    drawBuilder(ctx, x + (tw.team === 'red' ? -1 : 1) * g.colW * 0.05, tw.builderY.value, g.size, tw.team, {
      lift: m.liftOf(tw),
      hammer,
      sit,
      cheer,
      blink: tw.blink.value,
      look: tw.look.value,
    })
  }
  m.particles.draw(ctx)
}
