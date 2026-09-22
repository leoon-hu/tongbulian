/**
 * 开火车的渲染：renderBackground 画不动的部分（天空、山丘、树、草地、两条铁轨、站台与雨棚、山体与隧道洞），
 * index.ts 缓存到离屏 canvas；renderDynamic 每帧画会动的部分（太阳、云、信号灯、站台上的乘客与站长、
 * 两列火车（裁在隧道口右边，从洞里开出来）、石门柱与队色圆牌、站牌钟与铃、烟与彩纸）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawCloud, drawCritter, drawHill, drawStarter, drawSun, drawTeamBadge, drawTree, skyGradient, type CritterKind } from '@/battle/game/sprites/scenery'
import { drawBell, drawClock, drawLocomotive, drawMountain, drawPortal, drawSignal, drawStation, drawStationPost, drawTrack, drawTunnelMouth, drawWagon } from '@/battle/game/sprites/train'
import type { TrainGeometry, TrainModel } from './model'

const CROWD_KINDS: CritterKind[] = ['panda', 'monkey', 'bear']

export function renderBackground(ctx: CanvasRenderingContext2D, g: TrainGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.skyH * 1.3)
  ctx.fillRect(0, 0, W, g.skyH * 1.3)
  if (!g.compact) {
    drawHill(ctx, W * 0.3, g.skyH * 1.05, W * 0.28, g.skyH * 0.5, '#b9e59c')
    drawHill(ctx, W * 0.62, g.skyH * 1.1, W * 0.3, g.skyH * 0.55, '#a8dd8b')
    for (const fx of [0.2, 0.34, 0.47, 0.6, 0.72]) drawTree(ctx, W * fx, g.skyH * 0.98, g.size * 0.5)
  }
  ctx.fillStyle = gradient(ctx, 0, g.skyH, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.skyH, W, H - g.skyH)
  for (const y of g.laneY) drawTrack(ctx, y, W, k)
  drawStation(ctx, g.platformX, W, g.roadTop, g.roofY, k, g.compact)
  drawMountain(ctx, g.mouthX, g.archTop, g.roadBottom, H, k, g.compact)
  drawTunnelMouth(ctx, g.mouthX, g.archTop, g.roadBottom, g.archW)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: TrainModel): void {
  const g = m.geo
  const { k } = g
  const t = m.time
  if (!g.compact) drawSun(ctx, g.W * 0.74, g.skyH * 0.3, 11 * k, m.animated ? breathe(t, 3) : 0.5)
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  if (!g.compact) {
    drawSignal(ctx, g.mouthX + g.size * 0.5, g.roadTop - 2 * k, g.size * 0.68, k, m.signal.value)
    // 站台上的乘客与举旗的站长
    const cs = g.size * 0.42
    const platformY = g.roadTop - 7 * k
    for (let i = 0; i < CROWD_KINDS.length; i++) {
      const x = g.platformX + 22 * k + i * cs * 0.8
      const jump = m.crowdJump > 0 && m.animated ? Math.abs(Math.sin(m.crowdJump * 6 + i)) * cs * 0.5 : 0
      const sway = m.animated ? Math.sin(t * 1.5 + i) * cs * 0.05 : 0
      drawCritter(ctx, x, platformY, cs, CROWD_KINDS[i]!, jump + sway, m.crowdWave[i]!)
    }
    drawStarter(ctx, g.W - 26 * k, platformY, g.size * 0.62, 1 - m.greet.value)
  } else {
    drawStationPost(ctx, g.stationX + 8 * k, g.roadTop + 4 * k, g.roadBottom, k, m.signGlow.value)
  }
  // 两列火车：裁在隧道口右边，洞里的部分看不见
  ctx.save()
  ctx.beginPath()
  ctx.rect(g.mouthX, 0, g.W, g.H)
  ctx.clip()
  m.trains.forEach((c, idx) => {
    const i = idx as 0 | 1
    const y = g.laneY[i]
    const bounce = m.lift(c)
    for (let j = m.target; j >= 1; j--) {
      const x = m.wagonX(i, j)
      if (x <= g.mouthX) continue
      drawWagon(ctx, x, y, g.carLen, g.size, c.team, j, m.wheel[i], bounce)
    }
    drawLocomotive(ctx, c.pos.value, y, g.size, c.team, m.kinds[i], {
      wheel: m.wheel[i],
      bounce,
      light: m.light(c),
      whistle: m.whistle[i].value,
      blink: c.blink.value,
      look: c.look.value,
      sad: m.sad(c),
    })
  })
  ctx.restore()
  // 石门柱盖在火车上面，柱子上每条道一个队色圆牌（B32）
  drawPortal(ctx, g.mouthX, g.archTop, g.roadBottom, k)
  g.laneY.forEach((y, i) => drawTeamBadge(ctx, g.mouthX, y - g.size * 0.3, Math.min(g.size * 0.17, 8 * k), i === 0 ? 'red' : 'blue'))
  if (!g.compact) {
    const cx = (g.platformX + g.W) / 2
    drawClock(ctx, cx + 10 * k, g.roofY + 15 * k, 5.5 * k, m.signGlow.value)
    const swing = m.animated ? Math.sin(t * 14) * 0.35 * m.bell.value : 0
    drawBell(ctx, cx - 12 * k, g.roofY + 8 * k, 8 * k, swing)
  }
  m.particles.draw(ctx)
}
