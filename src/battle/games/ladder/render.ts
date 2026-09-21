/**
 * 爬梯子的渲染：renderBackground 画不动的部分（天空、山丘、草地、树干、树冠、平台与栏杆），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、小鸟、落叶、两架梯子（横档弯 / 晃）、两面旗、粒子、两只角色）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawCanopy, drawClimber, drawFlag, drawLadder, drawLeaf, drawPlatform, drawTrunk } from '@/battle/game/sprites/ladder'
import { drawCloud, drawHill, drawSun } from '@/battle/game/sprites/scenery'
import { drawBird } from '@/battle/game/sprites/town'
import type { LadderGeometry, LadderModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: LadderGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = gradient(ctx, 0, 0, 0, H, [
    [0, '#7cc4ff'],
    [0.6, '#bfe3ff'],
    [1, '#e9f6ff'],
  ])
  ctx.fillRect(0, 0, W, H)
  if (!g.compact) {
    drawHill(ctx, W * 0.2, g.groundY + 4 * k, W * 0.5, H * 0.07, '#b9e59c')
    drawHill(ctx, W * 0.85, g.groundY + 6 * k, W * 0.55, H * 0.08, '#a8dd8b')
  }
  ctx.fillStyle = '#8fd47a'
  ctx.fillRect(0, g.groundY, W, H - g.groundY)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, Math.max(2, 3 * k))
  if (!g.compact) {
    drawTrunk(ctx, W * 0.5, g.groundY + 2 * k, g.canopyBottom - g.size * 0.6, W * 0.14)
    drawCanopy(ctx, W * 0.5, g.canopyBottom - g.size * 0.9, W * 0.62, g.size * 1.5)
  }
  drawPlatform(ctx, g.plankX0, g.plankX1, g.platformY, g.plankH, !g.compact, k)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: LadderModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) drawSun(ctx, W * 0.84, g.platformY + g.size * 0.9, 8 * k, m.animated ? breathe(t, 3) : 0.5)
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  if (m.bird) drawBird(ctx, m.bird.x, m.bird.y, 5 * k, m.bird.flap)
  for (const l of m.leaves) if (l.wait <= 0) drawLeaf(ctx, l.x, l.y, 3.2 * k, l.rot, l.color)
  const rail = Math.max(2, 3 * k)
  const rungs = Array.from({ length: 7 }, (_, i) => m.rungY(i + 1))
  m.climbers.forEach((c, i) => {
    const sag = m.animated ? m.flex[i]!.value * 2.2 * k : 0
    drawLadder(ctx, g.ladderX[i]! + m.shakeX(i), g.groundY + 2 * k, g.platformY, g.railGap, rungs, rail, m.flexRung[i]! - 1, sag)
    if (m.flagOf(c) === 0) drawFlag(ctx, g.flagX[i]!, g.platformY, g.flagH, c.team, m.animated ? m.flagWave + i : 0, m.flagGlow[i]!.value, m.sprint ? 1.6 : 1)
  })
  m.particles.draw(ctx)
  m.climbers.forEach((c, i) => {
    drawClimber(ctx, m.xOf(c, i), c.pos.value, g.size, c.team, m.kinds[i]!, {
      climb: m.climbOf(c),
      grip: c.mood === 'ready' ? 0 : 1,
      lift: m.liftOf(c),
      cheer: c.mood === 'win' ? 1 : 0,
      hang: m.hangOf(c),
      swing: t * 2.5,
      flag: m.flagOf(c),
      wave: m.animated ? m.flagWave + 2 : 0,
      blink: c.blink.value,
      look: Math.max(c.look.value, m.hangOf(c) * 0.8),
      sway: m.swayOf(c),
    })
  })
}
