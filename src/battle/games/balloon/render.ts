/**
 * 热气球的渲染：renderBackground 画不动的部分（天空渐变、山丘、草地），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、目标云层与光晕、小鸟、粒子、两只气球）。
 */
import { drawActFx } from '@/battle/game/engine/act'
import { gradient, withAlpha } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawBalloon } from '@/battle/game/sprites/balloon'
import { drawCloud, drawHill, drawSun } from '@/battle/game/sprites/scenery'
import { drawBird } from '@/battle/game/sprites/town'
import type { BalloonGeometry, BalloonModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: BalloonGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = gradient(ctx, 0, 0, 0, H, [
    [0, '#4fa3ff'],
    [0.5, '#8fcaff'],
    [1, '#dff1ff'],
  ])
  ctx.fillRect(0, 0, W, H)
  if (!g.compact) {
    drawHill(ctx, W * 0.25, g.groundY + 6 * k, W * 0.5, H * 0.08, '#b9e59c')
    drawHill(ctx, W * 0.8, g.groundY + 8 * k, W * 0.55, H * 0.09, '#a8dd8b')
  }
  ctx.fillStyle = '#8fd47a'
  ctx.fillRect(0, g.groundY, W, H - g.groundY)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, Math.max(2, 3 * k))
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: BalloonModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) drawSun(ctx, W * 0.82, g.goalY + g.size * 0.5, 9 * k, m.animated ? breathe(t, 3) : 0.5)
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  // 目标云层：还差一分时发光
  if (m.cloudGlow.value > 0.02) {
    withAlpha(ctx, m.cloudGlow.value * (0.35 + (m.animated ? breathe(t, 0.8) * 0.25 : 0)), () => {
      ctx.fillStyle = '#fff3b0'
      ctx.fillRect(0, g.cloudY - g.bandH * 0.4, W, g.bandH * 1.8)
    })
  }
  const cs = g.bandH * 0.55
  const n = Math.max(3, Math.round(W / (cs * 1.6)))
  for (let i = 0; i <= n; i++) {
    const x = (W * i) / n
    const y = g.cloudY + g.bandH * (0.45 + (i % 2) * 0.15)
    drawCloud(ctx, x, y, cs * (i % 3 === 0 ? 1.1 : 0.9))
  }
  if (m.bird) drawBird(ctx, m.bird.x, m.bird.y, 5 * k, m.bird.flap)
  m.particles.draw(ctx)
  // 一题里的表演（B72）：答对往上一蹿、答错往下一沉，球囊跟着呼吸；乘客趴在篮边、探头、挥手 / 挠头 / 举手、表情；头顶图标最后画
  m.balloons.forEach((b, i) => {
    const s = g.size
    const a = b.act.pose()
    const body = m.body(b)
    const x = g.colX[i]!
    const y = m.yOf(b) + body.dy
    const sway = m.swayOf(b)
    const wave = Math.max(m.wave[i]!.value, a.wave)
    const look = Math.max(b.look.value, a.look)
    drawBalloon(ctx, x, y, s, b.team, m.passengers[i]!, {
      sway,
      flame: m.flameOf(b, i),
      wave,
      deflate: m.deflateOf(b),
      blink: b.blink.value,
      look,
      sx: body.sx,
      sy: body.sy,
      headDx: body.headDx,
      headTilt: body.headTilt,
      bodySx: body.bodySx,
      bodySy: body.bodySy,
      face: { happy: a.happy, wide: a.wide, arms: a.arms, scratch: a.scratch, beat: a.beat * 2 },
      rest: [1 - Math.max(a.arms, a.scratch), 1 - Math.max(a.arms, wave)],
    })
    // 乘客头顶（在气球的摆动里转一下）：泡泡 / 灯泡往对面那只气球那边偏一点，别全压在颈口上
    const side = i === 0 ? 1 : -1
    const lx = look * s * 0.02 + body.headDx + side * s * 0.06
    const ly = s * 0.9 - s * 0.34 * 0.66 * body.bodySy
    drawActFx(ctx, x + lx * Math.cos(sway) - ly * Math.sin(sway), y - s + lx * Math.sin(sway) + ly * Math.cos(sway), s * 0.34, a, { side, quality: m.quality })
  })
}
