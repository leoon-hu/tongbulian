/**
 * 抢旗的渲染：renderBackground 画不动的部分（天空、山丘、草地、赛场的格子石子、两座城堡的地毯），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、两座城堡（旗帜挥、城门、发光）、两只角色、旗子、粒子）。
 */
import { drawActFx, withActBody } from '@/battle/game/engine/act'
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawCastle, drawRug, drawStarFlag, drawStone } from '@/battle/game/sprites/flag'
import { PICKER_HEAD, drawPicker, gestureEnv, pickerAct } from '@/battle/game/sprites/fruit'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import type { FlagGeometry, FlagModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: FlagGeometry): void {
  const { W, H, k } = g
  const skyH = g.groundY - g.castleH * 0.6
  ctx.fillStyle = skyGradient(ctx, skyH)
  ctx.fillRect(0, 0, W, skyH)
  if (!g.compact) {
    drawHill(ctx, W * 0.3, skyH * 1.0, W * 0.3, skyH * 0.45, '#b9e59c')
    drawHill(ctx, W * 0.7, skyH * 1.04, W * 0.34, skyH * 0.5, '#a8dd8b')
  }
  ctx.fillStyle = gradient(ctx, 0, skyH * 0.9, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, skyH * 0.9, W, H - skyH * 0.9)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, H - g.groundY)
  for (let d = -8; d <= 8; d++) drawStone(ctx, g.center - d * g.cell, g.groundY + 3 * k, Math.max(1.5, 2.2 * k), d === 0)
  drawRug(ctx, g.kidX[0], g.groundY + 1.5 * k, g.size * 1.1, Math.max(3, 4 * k), 'red')
  drawRug(ctx, g.kidX[1], g.groundY + 1.5 * k, g.size * 1.1, Math.max(3, 4 * k), 'blue')
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: FlagModel): void {
  const g = m.geo
  const { k } = g
  const t = m.time
  if (!g.compact) drawSun(ctx, g.W * 0.5, g.H * 0.2, 10 * k, m.animated ? breathe(t, 3) : 0.5)
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  m.kids.forEach((kid, i) => {
    const facing: 1 | -1 = i === 0 ? 1 : -1
    drawCastle(ctx, g.castleX[i]!, g.groundY, g.castleW, g.castleH, kid.team, facing, m.animated ? m.bannerOf(i) : 0, m.gate[i]!.value, m.glow[i]!.value)
    // 一题里的表演（B72）：整体交给 withActBody，手势与表情接到 drawPicker 上
    const s = g.size
    const x = g.kidX[i]!
    const lift = m.liftOf(kid, i)
    const a = kid.act.pose()
    const base = pickerAct(kid.act, a)
    // 原地踏步（蹦两下换的）：不离地，两脚轮流抬
    const march = gestureEnv(kid.act, 'hop')
    if (march > 0) a.lift = 0
    // 正在按：蹲下准备冲——再压低一点、两腿分开、手收在胸前
    const typing = kid.act.typing
    if (m.animated) {
      a.sy -= 0.08 * typing
      a.sx += 0.05 * typing
    }
    // 答错：脚下一绊——往前一栽（盖掉通用的往后一仰）、两手乱挥、后面那只脚踢起来，站稳后冒汗摇头
    const trip = m.tripOf(kid)
    if (trip > 0) {
      a.lean = 0.42 * trip
      a.shake *= 0.3
    }
    withActBody(ctx, x, g.groundY, s, a, facing, () =>
      drawPicker(ctx, 0, 0, s, kid.team, m.kinds[i]!, {
        ...base,
        lift,
        cheer: kid.mood === 'win' ? 1 : 0,
        scratch: Math.max(base.scratch, m.scratchOf(kid)),
        blink: kid.blink.value,
        look: Math.abs(base.look) > kid.look.value ? base.look : kid.look.value,
        leaf: 0,
        dir: facing,
        march,
        step: a.t * 10,
        crouch: typing,
        ready: typing * 0.6,
        flail: trip,
        kick: trip,
      }),
    )
    drawActFx(ctx, x + facing * s * 0.05, g.groundY - lift - (a.lift + PICKER_HEAD) * s, s, a, { side: facing, quality: m.quality })
  })
  const f = m.flagAt()
  drawStarFlag(ctx, f.x, f.y, g.flagH, f.team, m.animated ? t * 5 : 0, f.team === 'blue' ? -1 : 1)
  m.particles.draw(ctx)
}
