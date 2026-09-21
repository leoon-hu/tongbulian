/**
 * 钓鱼的渲染：renderBackground 画不动的部分（天空、水、沙地、贝壳与海星、两段码头），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、水面亮纹、水草、气泡、杂鱼、鱼线、浮漂、两条鱼、粒子、两个钓鱼人）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawAngler, drawBobber, drawBubble, drawDock, drawLine, drawMinnow, drawSeaweed, drawShell, drawStarfish, drawTeamFish } from '@/battle/game/sprites/fish'
import { drawCloud, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { drawShimmer } from '@/battle/game/sprites/swim'
import type { FishGeometry, FishModel } from './model'

const WEED: [number, number, string][] = [
  [0.06, 1.2, '#3ea36b'],
  [0.14, 0.9, '#57c48a'],
  [0.86, 1.0, '#57c48a'],
  [0.94, 1.3, '#3ea36b'],
]

export function renderBackground(ctx: CanvasRenderingContext2D, g: FishGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.waterY)
  ctx.fillRect(0, 0, W, g.waterY)
  ctx.fillStyle = gradient(ctx, 0, g.waterY, 0, H, [
    [0, '#6fd3ee'],
    [0.5, '#3aa9dc'],
    [1, '#1f6fa3'],
  ])
  ctx.fillRect(0, g.waterY, W, H - g.waterY)
  ctx.fillStyle = '#e8d6a0'
  ctx.fillRect(0, g.bottomY, W, H - g.bottomY)
  ctx.fillStyle = '#d6c28a'
  ctx.fillRect(0, g.bottomY, W, Math.max(1, 1.5 * k))
  if (!g.compact) {
    drawShell(ctx, W * 0.3, g.bottomY + 2 * k, 4 * k)
    drawStarfish(ctx, W * 0.62, g.bottomY + 3 * k, 4.5 * k, 0.3)
  }
  drawDock(ctx, 0, g.dockEnd[0], g.dockY, g.plankH, g.waterY + 10 * k, k)
  drawDock(ctx, g.dockEnd[1], W, g.dockY, g.plankH, g.waterY + 10 * k, k)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: FishModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, W * 0.5, g.dockY * 0.35, 7 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
    for (const [fx, fh, color] of WEED) {
      const sway = m.animated && m.quality < 1 ? Math.sin(t * (m.sprint ? 3 : 1.4) + fx * 20) * 0.35 : 0.15
      drawSeaweed(ctx, W * fx, g.bottomY, g.size * fh, sway, color)
    }
    for (const b of m.bubbles) drawBubble(ctx, b.x + Math.sin(b.wob) * 2 * k, b.y, b.r)
    if (m.minnow) drawMinnow(ctx, m.minnow.x, m.minnow.y, 7 * k, m.minnow.v > 0 ? 1 : -1, m.minnow.wag)
  }
  if (m.animated && m.quality < 1) drawShimmer(ctx, g.dockEnd[0] + 4 * k, g.dockEnd[1] - 4 * k, g.waterY + 3 * k, t * 1.2, 1.2 * k, 16 * k, Math.max(1, 1.2 * k), 0.45)
  // 鱼线与浮漂（鱼在线的尽头）
  const rods = m.fishes.map((_, i) => m.rodOf(i))
  const fishXY = m.fishes.map((f, i) => ({ x: m.xOf(f, i), y: m.yOf(f) }))
  m.fishes.forEach((f, i) => {
    const rod = rods[i]!
    const p = fishXY[i]!
    const mouthX = p.x
    const mouthY = f.mood === 'win' ? p.y : p.y - g.fishS * 0.45 * m.up[i]!
    const end = m.lineEnd(i, rod, mouthX, mouthY)
    if (!(f.mood === 'win' && m.laidOf(f) > 0.5)) drawLine(ctx, rod.tipX, rod.tipY, end.x, end.y, k)
    if (f.mood !== 'win' && end.y > g.waterY + 2 * k) {
      const bx = rod.tipX + ((end.x - rod.tipX) * (g.waterY - rod.tipY)) / Math.max(1, end.y - rod.tipY)
      drawBobber(ctx, bx, g.waterY + (m.animated ? Math.sin(t * 3 + i) * 1.2 * k : 0), Math.max(2, 3 * k), m.bobberGlow[i]!.value)
    }
  })
  m.particles.draw(ctx)
  // 钓鱼人先画，鱼在后面画：举到手里的鱼要在人前面
  m.fishes.forEach((f, i) => {
    drawAngler(ctx, g.anglerX[i]!, g.dockY, g.size, f.team, m.kinds[i]!, {
      facing: g.facing[i]!,
      bend: m.bend[i]!.value,
      reel: m.reel[i]!,
      laid: m.laidOf(f),
      lift: m.liftOf(f),
      cheer: f.mood === 'win' && f.moodT >= REEL_TIME_FOR_CHEER ? 1 : 0,
      scratch: m.scratchOf(f),
      swing: m.animated ? t * 2.2 + i : 0,
      blink: f.blink.value,
      look: f.look.value,
    })
  })
  m.fishes.forEach((f, i) => {
    const p = fishXY[i]!
    drawTeamFish(ctx, p.x, p.y, g.fishS, f.team, {
      facing: g.facing[i]! === 1 ? 1 : -1,
      up: m.up[i]!,
      thrash: m.thrashOf(f, i),
      wag: m.animated ? f.phase + t * (f.mood === 'lose' ? 3 : 6) : 0,
      blink: f.blink.value,
      mouth: m.mouthOf(f, i),
    })
  })
}

/** 鱼飞到手里之后才举手（与模型里的位移时长一致） */
const REEL_TIME_FOR_CHEER = 0.8
