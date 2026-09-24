/**
 * 种花的渲染：renderBackground 画不动的部分（天空、山丘、栅栏、草地），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、蜜蜂、花盆、小芽 / 茎 / 叶 / 花苞 / 花朵、洒水壶、蝴蝶、粒子）。
 */
import { NEUTRAL_POSE, drawActFx } from '@/battle/game/engine/act'
import { gradient, withTransform } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawBee, drawBloom, drawBud, drawButterfly, drawFence, drawLeaf, drawPot, drawSprout, drawStem, drawWateringCan } from '@/battle/game/sprites/flower'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { LEAVES, type FlowerGeometry, type FlowerModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: FlowerGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.groundY)
  ctx.fillRect(0, 0, W, g.groundY)
  if (!g.compact) {
    drawHill(ctx, W * 0.25, g.groundY - g.potH * 0.9, W * 0.5, g.potH * 0.9, '#b9e59c')
    drawHill(ctx, W * 0.85, g.groundY - g.potH * 0.8, W * 0.55, g.potH * 1.0, '#a8dd8b')
    drawFence(ctx, 0, W, g.groundY - g.potH * 0.75, g.potH * 1.1, k)
  }
  ctx.fillStyle = gradient(ctx, 0, g.groundY - g.potH * 0.8, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.groundY - g.potH * 0.8, W, H - g.groundY + g.potH * 0.8)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, Math.max(1, 2 * k))
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: FlowerModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, W * 0.82, g.tipMax * 0.45, 8 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
    if (m.bee) drawBee(ctx, m.bee.x, m.beeY(), 5 * k, m.bee.v > 0 ? 1 : -1, t * 40)
  }
  m.plants.forEach((p, i) => {
    const lift = m.liftOf(p)
    const a = m.acts[i]!
    const inward: 1 | -1 = i === 0 ? 1 : -1
    // 花盆是角色（B72）：绕盆底歪、压扁拉长，盆上一张小脸（眨眼、笑、o 嘴、往对面瞧、输了撇嘴）
    const [psx, psy] = m.potScale(i)
    withTransform(ctx, g.plantX[i]!, g.groundY - lift, m.potTilt(i), psx, psy, () =>
      drawPot(ctx, 0, -g.potH, g.potW, g.potH, p.team, {
        blink: p.blink.value,
        happy: Math.max(a.happy, p.mood === 'win' ? 1 : 0),
        wide: a.wide,
        look: Math.max(a.look, p.look.value) * inward,
        sad: p.mood === 'lose' ? 1 : 0,
      }),
    )
    const H = m.stemH(p) + m.reachOf(i)
    if (H < 0.5) {
      const root = m.rootOf(i)
      drawSprout(ctx, root.x, root.y, g.potW * 0.28, m.wiggleOf(p) + m.potTilt(i), m.leafRaise(i, true))
    } else {
      const c = m.stemCurve(i)
      drawStem(ctx, c.x0, c.y0, c.cx, c.cy, c.x1, c.y1, Math.max(2.5, g.potW * 0.1))
      // 最上面那片长好的叶子隔一会儿招一招；叶子按表演举起 / 耷拉（B72）
      let top = 0
      for (let n = 1; n <= LEAVES; n++) if (m.leafScale(p, n) > 0.5) top = n
      for (let n = 1; n <= LEAVES; n++) {
        const sc = m.leafScale(p, n)
        if (sc < 0.02) continue
        const pt = m.stemPoint(i, m.leafH(n))
        const side = n % 2 === 1 ? -1 : 1
        const tilt = pt.ang + Math.PI / 2
        const raise = m.leafRaise(i, n === top)
        const ang = side < 0 ? Math.PI + 0.45 + tilt + raise : -0.45 + tilt - raise
        drawLeaf(ctx, pt.x, pt.y, g.leafLen, ang, sc)
      }
      const tip = m.tip(i)
      const bud = m.budScale(p, i)
      drawBud(ctx, tip.x, tip.y - g.bloomR * 0.45 * bud, g.bloomR * 0.55, p.team, bud, m.budGlow[i]!.value * (1 - m.bloom[i]!.value))
      drawBloom(ctx, tip.x, tip.y - g.bloomR * 0.3, g.bloomR, p.team, m.bloom[i]!.value, m.animated ? t * 1.5 + i : 0, m.budGlow[i]!.value * m.bloom[i]!.value)
    }
    const w = m.water[i]!.value
    if (w > 0.05) {
      const can = m.canPos(i)
      drawWateringCan(ctx, can.x, can.y, g.potW * 0.7, -0.75 * Math.min(1, w), can.dir)
    }
    // 头顶图标（B72）：想的泡泡 / 灯泡冒在盆沿上、茎的里侧；汗珠挂在小脸旁；亮片从花 / 茎尖迸出来
    const s = g.potH * 1.1
    const rimY = g.potTop - lift
    drawActFx(ctx, g.plantX[i]! + inward * g.potW * 0.25, rimY, s, { ...a, sweat: 0, sparkle: 0 }, { side: inward, quality: m.quality })
    if (a.sweat > 0.03) drawActFx(ctx, g.plantX[i]!, rimY + g.potH * 0.45, s, { ...NEUTRAL_POSE, sweat: a.sweat }, { side: inward, quality: m.quality })
    if (a.sparkle > 0) {
      const tip = m.tip(i)
      drawActFx(ctx, tip.x, tip.y - g.bloomR * 0.4, s, { ...NEUTRAL_POSE, sparkle: a.sparkle }, { side: inward, quality: m.quality })
    }
  })
  for (const b of m.butterflies) {
    const at = m.butterflyAt(b)
    drawButterfly(ctx, at.x, at.y, 5 * k, at.flap, b.color)
  }
  m.particles.draw(ctx)
}
