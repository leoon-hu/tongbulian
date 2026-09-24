/**
 * 开火车的渲染：renderBackground 画不动的部分（天空、山丘、树、草地、两条铁轨、站台与雨棚、山体与隧道洞），
 * index.ts 缓存到离屏 canvas；renderDynamic 每帧画会动的部分（太阳、云、信号灯、站台上的乘客与站长、
 * 两列火车（裁在隧道口右边，从洞里开出来）、石门柱与队色圆牌、站牌钟与铃、烟与彩纸）。
 */
import { drawActFx, type ActPose } from '@/battle/game/engine/act'
import { gradient, withTransform } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawCloud, drawCritter, drawHill, drawStarter, drawSun, drawTeamBadge, drawTree, skyGradient, type CritterKind } from '@/battle/game/sprites/scenery'
import { drawBell, drawClock, drawLocomotive, drawMountain, drawPortal, drawSignal, drawStation, drawStationPost, drawTrack, drawTunnelMouth, drawWagon } from '@/battle/game/sprites/train'
import { HOP_DELAY, type TrainGeometry, type TrainModel } from './model'

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
  const heads: [number, number, ActPose][] = []
  m.trains.forEach((c, idx) => {
    const i = idx as 0 | 1
    const y = g.laneY[i]
    const s = g.size
    const bounce = m.lift(c)
    // 一题里的表演（B72）：车头跳 / 颠 / 抖、以车尾为基准压扁拉长；车厢一节比一节晚一点跟着跳
    const a = c.act.pose()
    const b = m.body(i)
    for (let j = m.target; j >= 1; j--) {
      const x = m.wagonX(i, j)
      if (x <= g.mouthX) continue
      const hop = Math.min(m.hopAt(c, j * HOP_DELAY) * s * 0.7, b.room)
      drawWagon(ctx, x + b.dx, y, g.carLen, s, c.team, j, m.wheel[i], bounce + hop + b.dy)
    }
    const x = c.pos.value + b.dx
    const lift = bounce + b.lift + b.dy
    withTransform(ctx, x - s * 1.04, y, 0, b.sx, b.sy, () =>
      drawLocomotive(ctx, s * 1.04, 0, s, c.team, m.kinds[i], {
        wheel: m.wheel[i],
        bounce: lift,
        light: m.light(c),
        whistle: m.whistle[i].value,
        blink: c.blink.value,
        look: Math.max(c.look.value, a.look),
        sad: m.sad(c),
        headTilt: a.lean * 1.6 + a.shake * 1.2,
        headLift: a.arms * s * 0.05,
        wave: a.wave,
        face: { happy: a.happy, wide: a.wide, arms: a.arms, scratch: a.scratch, beat: a.beat * 2 },
      }),
    )
    // 司机头顶在驾驶室顶上面（图标画在隧道口的裁剪外面，免得车还在洞口时被裁掉）
    heads.push([x - s * 0.8, y - lift - s * 0.84 * b.sy, a])
  })
  ctx.restore()
  // 石门柱盖在火车上面，柱子上每条道一个队色圆牌（B32）
  drawPortal(ctx, g.mouthX, g.archTop, g.roadBottom, k)
  g.laneY.forEach((y, i) => drawTeamBadge(ctx, g.mouthX, y - g.size * 0.3, Math.min(g.size * 0.17, 8 * k), i === 0 ? 'red' : 'blue'))
  // 司机头顶的图标（B72）：画在隧道口裁剪与石门柱外面，离盒子顶边太近就往下挪一点
  const r = Math.max(g.size * 0.42, 22)
  for (const [hx, hy, a] of heads) drawActFx(ctx, hx, Math.max(hy, r * 0.56), g.size * 0.42, a, { side: 1, quality: m.quality })
  if (!g.compact) {
    const cx = (g.platformX + g.W) / 2
    drawClock(ctx, cx + 10 * k, g.roofY + 15 * k, 5.5 * k, m.signGlow.value)
    const swing = m.animated ? Math.sin(t * 14) * 0.35 * m.bell.value : 0
    drawBell(ctx, cx - 12 * k, g.roofY + 8 * k, 8 * k, swing)
  }
  m.particles.draw(ctx)
}
