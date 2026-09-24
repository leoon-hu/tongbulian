/**
 * 火箭升空的渲染：只把模型的场景画到 ctx。
 * renderBackground 画不动的部分（星空渐变、行星、月亮、导轨、发射台底座），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（闪烁的星星、流星、目标星、发射台闪光、粒子、两枚火箭）。
 */
import { drawActFx, withActBody } from '@/battle/game/engine/act'
import { breathe } from '@/battle/game/engine/rig'
import { drawRocket } from '@/battle/game/sprites/rocket'
import { drawGoalStar, drawLaunchPad, drawMoon, drawPlanet, drawShootingStar, drawTwinkle, spaceGradient } from '@/battle/game/sprites/space'
import type { RocketGeometry, RocketModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: RocketGeometry): void {
  const { W, H } = g
  ctx.fillStyle = spaceGradient(ctx, H)
  ctx.fillRect(0, 0, W, H)
  // 导轨：目标星到发射台之间的细虚线
  ctx.setLineDash([3 * g.k, 5 * g.k])
  ctx.lineWidth = Math.max(1, 1.5 * g.k)
  for (const [i, x] of g.colX.entries()) {
    ctx.strokeStyle = i === 0 ? 'rgba(255, 140, 140, 0.35)' : 'rgba(140, 190, 255, 0.35)'
    ctx.beginPath()
    ctx.moveTo(x, g.starY + g.starR * 2)
    ctx.lineTo(x, g.padY - g.size * 1.3)
    ctx.stroke()
  }
  ctx.setLineDash([])
  // 地面
  ctx.fillStyle = '#3a2a4a'
  ctx.fillRect(0, g.padY + g.padH * 0.1, W, H - g.padY)
  for (const x of g.colX) drawLaunchPad(ctx, x, g.padY, g.padW, g.padH, 0)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: RocketModel): void {
  const g = m.geo
  const t = m.time
  // 星星闪烁
  for (const s of m.stars) {
    const a = m.animated && m.quality < 1 ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase)) : 0.75
    drawTwinkle(ctx, s.x, s.y, s.r, a)
  }
  if (m.moon) drawMoon(ctx, m.moon.x, m.moon.y, m.moon.r)
  if (m.planet) drawPlanet(ctx, m.planet.x, m.planet.y, m.planet.r)
  if (m.shooting) {
    const s = m.shooting
    drawShootingStar(ctx, s.x, s.y, s.vx, s.vy, 1 - s.age / s.life, 40 * g.k)
  }
  // 发射台闪光
  if (m.padGlow.value > 0.02) for (const x of g.colX) drawLaunchPad(ctx, x, g.padY, g.padW, g.padH, m.padGlow.value)
  // 目标星
  for (const [i, x] of g.colX.entries()) {
    const team = i === 0 ? 'red' : 'blue'
    const base = m.animated ? breathe(t, 2.2) * 0.4 : 0.3
    const pulse = Math.min(1, base + (m.sprint ? 0.5 : 0) + m.goalPulse.value * 0.6)
    drawGoalStar(ctx, x, g.starY, g.starR, pulse, m.winner === team, m.rays)
  }
  // 粒子（烟、烟花）
  m.particles.draw(ctx)
  // 两枚火箭。一题里的表演（B72）：火箭自己是角色——蹿 / 摆 / 翻跟头 / 压扁拉长交给 withActBody（朝上，
  // 「张望」= 朝对面那枚歪一下），尾焰跟着一呼一吸、按键蹿、答对喷大火、答错哑火；头顶图标画在鼻锥上面
  for (const r of m.rockets) {
    const i = r.team === 'red' ? 0 : 1
    const x = g.colX[i] + m.xOffset(r)
    const y = m.yOf(r)
    const a = r.act.pose()
    const toCenter = i === 0 ? 1 : -1
    withActBody(ctx, x, y, g.size, { ...a, lean: a.look * 0.2 * toCenter, shake: a.shake * 1.4 }, 1, () =>
      drawRocket(ctx, 0, 0, g.size, r.team, {
        tilt: m.tiltOf(r),
        flame: m.flameAct(r, m.flameOf(r)),
        flicker: m.animated ? 0.5 + 0.5 * Math.sin(t * 40 + r.phase) : 0,
      }),
    )
    drawActFx(ctx, x, y - (a.lift + 1.18 * a.sy) * g.size, g.size * 0.6, a, { side: toCenter, quality: m.quality })
  }
}
