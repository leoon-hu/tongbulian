/**
 * 跷跷板的渲染：renderBackground 画不动的部分（天空、山丘、小树、草地、支座），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、板与扶手、砝码、两只角色、粒子）——板上的东西在板坐标系里画。
 */
import { gradient, withTransform } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawCloud, drawHill, drawSun, drawTeamBadge, drawTree, skyGradient } from '@/battle/game/sprites/scenery'
import { drawFulcrum, drawPlank, drawRider, drawWeight } from '@/battle/game/sprites/seesaw'
import type { SeesawGeometry, SeesawModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: SeesawGeometry): void {
  const { W, H, k } = g
  const skyH = g.pivotY * 1.1
  ctx.fillStyle = skyGradient(ctx, skyH)
  ctx.fillRect(0, 0, W, skyH)
  if (!g.compact) {
    drawHill(ctx, W * 0.2, skyH * 0.98, W * 0.3, skyH * 0.5, '#b9e59c')
    drawHill(ctx, W * 0.75, skyH * 1.02, W * 0.36, skyH * 0.55, '#a8dd8b')
    for (const fx of [0.06, 0.16, 0.84, 0.94]) drawTree(ctx, W * fx, skyH * 0.95, g.size * 0.9)
  }
  ctx.fillStyle = gradient(ctx, 0, skyH * 0.9, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, skyH * 0.9, W, H - skyH * 0.9)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, H - g.groundY)
  drawFulcrum(ctx, g.pivotX, g.groundY, g.pivotH, g.pivotH * 1.1)
  // 两头地上的队色圆牌（B32）
  drawTeamBadge(ctx, g.pivotX - g.half * 0.9, g.groundY - Math.max(4, 6 * k), Math.min(g.size * 0.22, 8 * k), 'red')
  drawTeamBadge(ctx, g.pivotX + g.half * 0.9, g.groundY - Math.max(4, 6 * k), Math.min(g.size * 0.22, 8 * k), 'blue')
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: SeesawModel): void {
  const g = m.geo
  const { k } = g
  const t = m.time
  if (!g.compact) drawSun(ctx, g.W * 0.82, g.pivotY * 0.35, 11 * k, m.animated ? breathe(t, 3) : 0.5)
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  const a = m.angle()
  withTransform(ctx, g.pivotX, g.pivotY, a, 1, 1, () => {
    drawPlank(ctx, g.half, g.thick, m.glow[0]!.value, m.glow[1]!.value)
    m.riders.forEach((r, i) => {
      for (let n = 0; n < m.weights[i]!.length; n++) {
        const w = m.weights[i]![n]!
        if (w.delay > 0) continue
        drawWeight(ctx, g.slots[i]![n]!, -g.thick / 2 + w.drop.value, g.weightS, r.team)
      }
      drawRider(ctx, g.seat[i]!, -g.thick / 2, g.size, r.team, m.kinds[i]!, {
        lift: m.liftOf(r, i),
        cheer: r.mood === 'win' ? 1 : 0,
        scared: m.scaredOf(r),
        swing: t * 3 + i,
        dangle: m.dangleOf(i),
        blink: r.blink.value,
        look: r.look.value,
        wave: m.waveOf(r),
        dir: i === 0 ? 1 : -1,
      })
    })
  })
  m.particles.draw(ctx)
}
