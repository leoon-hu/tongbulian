/**
 * 吹泡泡的渲染：renderBackground 画不动的部分（天空、山丘、草地、小花），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、小鸟、顶上的星星、空中的小泡泡、两只角色与泡泡棒、两颗泡泡、粒子）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawBlower, drawBubble, drawFlowerDot, drawStarRow, drawWand } from '@/battle/game/sprites/bubble'
import { drawBubble as drawMote } from '@/battle/game/sprites/fish'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { drawBird } from '@/battle/game/sprites/town'
import type { BubbleGeometry, BubbleModel } from './model'

const FLOWERS: [number, string][] = [
  [0.08, '#ff9ad5'],
  [0.2, '#ffb347'],
  [0.45, '#c9a3ff'],
  [0.6, '#ff9ad5'],
  [0.85, '#ffb347'],
  [0.95, '#c9a3ff'],
]

export function renderBackground(ctx: CanvasRenderingContext2D, g: BubbleGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.groundY)
  ctx.fillRect(0, 0, W, g.groundY)
  if (!g.compact) {
    drawHill(ctx, W * 0.25, g.groundY - g.size * 0.5, W * 0.5, g.size * 0.9, '#b9e59c')
    drawHill(ctx, W * 0.85, g.groundY - g.size * 0.4, W * 0.55, g.size * 1.0, '#a8dd8b')
  }
  ctx.fillStyle = gradient(ctx, 0, g.groundY - g.size * 0.3, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.groundY - g.size * 0.3, W, H - g.groundY + g.size * 0.3)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, Math.max(1, 2 * k))
  if (!g.compact) for (const [fx, color] of FLOWERS) drawFlowerDot(ctx, W * fx, g.groundY + 5 * k + (fx * 100) % 4, 2.4 * k, color)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: BubbleModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, W * 0.82, g.topY + g.H * 0.05, 8 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
    if (m.bird) drawBird(ctx, m.bird.x, m.bird.y, 5 * k, m.bird.flap)
    for (const mo of m.motes) drawMote(ctx, mo.x + Math.sin(mo.wob) * 3 * k, mo.y, mo.r)
  }
  drawStarRow(ctx, 6 * k, W - 6 * k, g.starsY, Math.max(2, 3.5 * k), m.starGlow[0]!.value, m.starGlow[1]!.value, m.animated ? t : 0)
  m.blowers.forEach((b, i) => {
    const x = g.laneX[i]!
    const lift = m.liftOf(b)
    drawBlower(ctx, x, g.groundY, g.size, b.team, m.kinds[i]!, {
      puff: Math.min(1, m.puff[i]!.value),
      lift,
      cheer: b.mood === 'win' ? 1 : 0,
      blink: b.blink.value,
      look: b.look.value,
      dir: i === 0 ? 1 : -1,
    })
    const wandX = x + (i === 0 ? 1 : -1) * g.size * 0.3
    drawWand(ctx, wandX, g.wandY - lift - (b.mood === 'win' ? g.size * 0.3 : 0), g.size, (i === 0 ? 1 : -1) * (b.mood === 'win' ? -0.6 : 0.5))
    const lb = m.loserBubble(b)
    if (lb) drawBubble(ctx, wandX, lb.y, lb.r, 1, 1, 0, 0, 0)
  })
  m.particles.draw(ctx)
  m.blowers.forEach((b, i) => {
    const [sx, sy] = m.wobbleOf(i)
    drawBubble(ctx, g.laneX[i]!, m.cyOf(b) + m.driftOf(b, i), m.rOf(b), sx, sy, m.rainbow[i]!.value, m.rotOf(), m.starGlow[i]!.value * 0.6)
  })
}
