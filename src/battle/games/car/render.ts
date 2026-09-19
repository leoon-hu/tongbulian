/**
 * 赛车的渲染：renderBackground 画不动的部分（天空、山丘、树、草地、柏油路、路肩、车道线、起点线、格子终点线、终点柱），
 * index.ts 缓存到离屏 canvas；renderDynamic 每帧画会动的部分（太阳、云、发令员、观众、旗、粒子、速度线、两辆车）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawCar } from '@/battle/game/sprites/car'
import { drawCheckerFlag, drawCloud, drawCritter, drawFinishPost, drawHill, drawStarter, drawSun, drawTeamBadge, drawTree, skyGradient, type CritterKind } from '@/battle/game/sprites/scenery'
import type { CarGeometry, CarModel } from './model'

const CROWD_KINDS: CritterKind[] = ['bear', 'pig', 'panda', 'monkey']
const DRIVERS: [CritterKind, CritterKind] = ['monkey', 'panda']

export function renderBackground(ctx: CanvasRenderingContext2D, g: CarGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.skyH * 1.3)
  ctx.fillRect(0, 0, W, g.skyH * 1.3)
  if (!g.compact) {
    drawHill(ctx, W * 0.2, g.skyH * 1.05, W * 0.3, g.skyH * 0.5, '#b9e59c')
    drawHill(ctx, W * 0.7, g.skyH * 1.1, W * 0.36, g.skyH * 0.55, '#a8dd8b')
    for (const fx of [0.08, 0.25, 0.4, 0.55, 0.7, 0.88]) drawTree(ctx, W * fx, g.skyH * 0.98, g.size * 0.5)
  }
  ctx.fillStyle = gradient(ctx, 0, g.skyH, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.skyH, W, H - g.skyH)
  // 柏油路 + 路肩红白条
  ctx.fillStyle = '#4a4a55'
  ctx.fillRect(0, g.roadTop, W, g.roadBottom - g.roadTop)
  const curb = Math.max(2, 3 * k)
  for (const y of [g.roadTop - curb, g.roadBottom]) {
    for (let x = 0, i = 0; x < W; x += 12 * k, i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ff6b6b' : '#ffffff'
      ctx.fillRect(x, y, 12 * k, curb)
    }
  }
  // 车道分界虚线
  ctx.save()
  ctx.setLineDash([10 * k, 8 * k])
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = Math.max(1, 2 * k)
  ctx.beginPath()
  ctx.moveTo(0, (g.roadTop + g.roadBottom) / 2)
  ctx.lineTo(W, (g.roadTop + g.roadBottom) / 2)
  ctx.stroke()
  ctx.restore()
  // 起点线 + 每条车道起点的队色圆牌（B32）
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(g.startX, g.roadTop, Math.max(2, 3 * k), g.roadBottom - g.roadTop)
  g.laneY.forEach((y, i) => drawTeamBadge(ctx, g.startX - 12 * k, y - g.size * 0.22, Math.min(g.size * 0.16, 9 * k), i === 0 ? 'red' : 'blue'))
  // 格子终点线
  const cell = Math.max(3, 5 * k)
  for (let y = g.roadTop, j = 0; y < g.roadBottom; y += cell, j++) {
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#222222'
      ctx.fillRect(g.finishX + i * cell, y, cell, Math.min(cell, g.roadBottom - y))
    }
  }
  drawFinishPost(ctx, g.finishX + cell * 2 + 2 * k, g.roadTop - 6 * k, g.roadBottom, Math.max(5, 7 * k))
  if (!g.compact) {
    ctx.fillStyle = '#b8895a'
    ctx.fillRect(g.finishX + cell * 2 - 1 * k, g.roadTop - g.size * 0.9, 6 * k, g.size * 0.9)
  }
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: CarModel): void {
  const g = m.geo
  const { k } = g
  const t = m.time
  if (!g.compact) drawSun(ctx, g.W * 0.8, g.skyH * 0.3, 11 * k, m.animated ? breathe(t, 3) : 0.5)
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  if (!g.compact) {
    drawStarter(ctx, g.startX - 22 * k, g.roadTop - 2 * k, g.size * 0.8, m.starter.value)
    const cs = g.size * 0.5
    for (let i = 0; i < CROWD_KINDS.length; i++) {
      const x = g.finishX + 26 * k + i * cs * 0.75
      const jump = m.crowdJump > 0 && m.animated ? Math.abs(Math.sin(m.crowdJump * 6 + i)) * cs * 0.5 : 0
      const sway = m.animated ? Math.sin(t * 1.5 + i) * cs * 0.05 : 0
      drawCritter(ctx, x, g.roadTop - 4 * k, cs, CROWD_KINDS[i]!, jump + sway, m.crowdWave[i]!)
    }
  }
  const cell = Math.max(3, 5 * k)
  drawCheckerFlag(ctx, g.finishX + cell * 2 + 6 * k, g.roadTop - 6 * k, g.compact ? g.size * 0.8 : g.size * 0.55, m.animated ? m.flagWave : 0)
  m.particles.draw(ctx)
  m.cars.forEach((c, i) => {
    const x = c.pos.value
    const y = g.laneY[i]!
    // 速度线
    if (c.moving > 0.3 && m.animated) {
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * c.moving})`
      ctx.lineWidth = Math.max(1, 1.5 * k)
      for (let j = 0; j < 3; j++) {
        const ly = y - g.size * 0.15 - j * g.size * 0.12
        const len = (10 + j * 4 + c.boost.value * 14) * k
        ctx.beginPath()
        ctx.moveTo(x - g.size * 0.6, ly)
        ctx.lineTo(x - g.size * 0.6 - len, ly)
        ctx.stroke()
      }
    }
    drawCar(ctx, x, y, g.size, c.team, DRIVERS[i]!, {
      wheel: m.wheel[i]!,
      bounce: m.lift(c),
      tilt: m.tilt(c),
      nitro: m.nitro(c),
      blink: c.blink.value,
      look: c.look.value,
    })
  })
}
