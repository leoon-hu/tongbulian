/**
 * 融冰的渲染：renderBackground 画不动的部分（天空、远处的浮冰、水的底色），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（极光、雪花、水面波纹、小鱼、两摞冰、企鹅、粒子、涟漪、最上面半透明的水层）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { drawAurora, drawFish, drawFlake, drawIceBlock, drawIceberg, drawPenguin, fillWave } from '@/battle/game/sprites/ice'
import { drawRipple, drawSweat } from '@/battle/game/sprites/tug'
import type { IceGeometry, IceModel, Side } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: IceGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = gradient(ctx, 0, 0, 0, H, [
    [0, '#9fcbff'],
    [1, '#e9f5ff'],
  ])
  ctx.fillRect(0, 0, W, H)
  if (!g.compact) {
    drawIceberg(ctx, W * 0.5, g.waterY + 2 * k, W * 0.16, H * 0.05)
    drawIceberg(ctx, W * 0.02, g.waterY + 2 * k, W * 0.1, H * 0.035)
    drawIceberg(ctx, W * 0.98, g.waterY + 2 * k, W * 0.1, H * 0.03)
  }
  ctx.fillStyle = gradient(ctx, 0, g.waterY, 0, H, [
    [0, '#7cc4ff'],
    [1, '#3d8fe6'],
  ])
  ctx.fillRect(0, g.waterY + 3 * k, W, H - g.waterY - 3 * k)
}

function penguinTilt(m: IceModel, side: Side, i: number): number {
  if (!m.animated) return 0
  const t = m.time
  const sway = Math.sin(t * (m.sprint ? 2.6 : 1.6) + i * 1.7) * 0.06
  return sway + Math.sin(t * 30) * 0.12 * side.wobble.value
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: IceModel): void {
  const g = m.geo
  const { W, H, k } = g
  const t = m.time
  const scenery = m.animated && m.quality < 1
  if (!g.compact) drawAurora(ctx, W, H * 0.02, H * 0.16, scenery ? t : 0, 0.55)
  for (const f of m.flakes) drawFlake(ctx, f.x, f.y, f.r, f.r > 2 * k, f.phase)
  // 水面的浪花线
  fillWave(ctx, W, g.waterY, g.waterY + 6 * k, scenery ? t * 2 : 0, 1.5 * k, 9 * k, '#9fd8ff')
  // 小鱼（结束时跳出水面）
  const fishS = g.compact ? 6 : 8 * k
  const fishMid = g.waterY + (H - g.waterY) * 0.55
  if (m.fishJumpT >= 0) {
    const u = Math.min(1, m.fishJumpT)
    drawFish(ctx, m.fishX, fishMid - Math.sin(Math.PI * u) * H * 0.06, fishS, m.fishDir, m.fishWag, (u - 0.5) * -1.6 * m.fishDir)
  } else drawFish(ctx, m.fishX, fishMid, fishS, m.fishDir, m.fishWag, 0)
  // 两摞冰
  for (const side of m.sides) {
    const x = g.colX[side.team === 'red' ? 0 : 1]
    for (const b of side.blocks) {
      if (b.state === 'gone') continue
      const shake = b.state === 'cracking' && m.animated ? Math.sin(t * 60) * 1.5 * k * b.crack : 0
      drawIceBlock(ctx, x + shake, m.blockTop(b.level), g.colW, g.blockH, b.crack, b.melt, m.alarmOf(side, b), k)
    }
  }
  // 企鹅
  m.sides.forEach((side, i) => {
    const x = g.colX[i]
    const y = m.penguinY(side) + (side.splashed ? Math.sin(side.floatT * 2) * 2 * k : 0)
    const lift = m.liftOf(side)
    if (side.worry.value > 0.05 && !side.splashed) drawSweat(ctx, x, y - lift - g.size * 0.75, g.size, side.worry.value, 1)
    drawPenguin(ctx, x, y, g.size, side.team, {
      lift,
      tilt: penguinTilt(m, side, i),
      flap: Math.max(side.flap.value, side.mood === 'win' ? 0.5 + Math.sin(side.hop) * 0.5 : 0),
      blink: side.blink.value,
      worry: side.worry.value,
      cheer: side.mood === 'win' ? 1 : 0,
      float: side.drop.value,
      kick: side.floatT * 8,
      squash: side.wobble.value * 0.5,
    })
  })
  m.particles.draw(ctx)
  if (m.rippleT >= 0) {
    drawRipple(ctx, m.rippleX, g.waterY + 2 * k, g.colW * 0.7, 4 * k, m.rippleT / 1.2, Math.max(1, 1.5 * k))
    drawRipple(ctx, m.rippleX, g.waterY + 2 * k, g.colW * 0.7, 4 * k, (m.rippleT - 0.35) / 1.0, Math.max(1, 1.2 * k))
  }
  // 最上面半透明的一层水：泡在水里的东西看得出淹着
  fillWave(ctx, W, g.waterY + 1.5 * k, H, scenery ? t * 2 : 0, 1.5 * k, 9 * k, 'rgba(74,163,255,0.32)')
}
