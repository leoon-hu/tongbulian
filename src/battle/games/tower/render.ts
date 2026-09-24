/**
 * 盖楼的渲染：renderBackground 画不动的部分（天空、太阳、山丘、草地、地基），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（云、小鸟、冲刺的星星、砖块、屋顶与旗、工人、粒子）。
 */
import { drawActFx, withActBody, type ActPose } from '@/battle/game/engine/act'
import { breathe } from '@/battle/game/engine/rig'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { starPath } from '@/battle/game/sprites/space'
import { withTransform } from '@/battle/game/engine/draw'
import { drawBird, drawBlock, drawBuilder, drawFoundation, drawRoof } from '@/battle/game/sprites/town'
import type { Tower, TowerGeometry, TowerModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: TowerGeometry): void {
  const { W, H } = g
  ctx.fillStyle = skyGradient(ctx, H)
  ctx.fillRect(0, 0, W, H)
  if (!g.compact) {
    drawSun(ctx, W * 0.82, H * 0.07, 8 * g.k, 0.5)
    drawHill(ctx, W * 0.3, g.groundY + 4 * g.k, W * 0.5, H * 0.09, '#b9e59c')
    drawHill(ctx, W * 0.8, g.groundY + 6 * g.k, W * 0.55, H * 0.1, '#a8dd8b')
  }
  ctx.fillStyle = '#7fcf62'
  ctx.fillRect(0, g.groundY, W, H - g.groundY)
  ctx.fillStyle = '#5fb84a'
  ctx.fillRect(0, g.groundY, W, Math.max(2, 3 * g.k))
  for (const x of g.colX) drawFoundation(ctx, x, g.groundY - g.foundH, g.colW * 1.15, g.foundH)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: TowerModel): void {
  const g = m.geo
  const t = m.time
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  if (m.bird) drawBird(ctx, m.bird.x, m.bird.y, 5 * g.k, m.bird.flap)
  for (const tw of m.towers) {
    const x = g.colX[tw.team === 'red' ? 0 : 1]
    const landed = m.landedCount(tw)
    // 落稳的砖：整座楼从地基处按压缩比缩放；答错时最上面那块砖晃一晃（B72），工人站在上面跟着晃
    const sq = m.squashOf(tw)
    const top = landed > 0 ? tw.bricks[landed - 1] : undefined
    const wob = top ? m.wobbleOf(tw) : 0
    const pivotY = top ? top.y.value + g.blockH : 0
    ctx.save()
    ctx.translate(0, g.groundY - g.foundH)
    ctx.scale(1, sq)
    ctx.translate(0, -(g.groundY - g.foundH))
    for (const b of tw.bricks) {
      if (!b.landed) continue
      if (b === top && wob) withTransform(ctx, x, pivotY, wob, 1, 1, () => drawBlock(ctx, 0, b.y.value - pivotY, g.colW, g.blockH, tw.team, b.level, b.level <= tw.lit))
      else drawBlock(ctx, x, b.y.value, g.colW, g.blockH, tw.team, b.level, b.level <= tw.lit)
    }
    ctx.restore()
    // 正在落的砖
    for (const b of tw.bricks) {
      if (b.landed || b.delay > 0) continue
      drawBlock(ctx, x, b.y.value, g.colW, g.blockH, tw.team, b.level, false)
    }
    // 冲刺：领先的楼顶上方一颗闪着的星（比工人头顶的想 / 灯泡再高一截，不叠在一起，B72）
    if (m.sprint && tw.score === Math.max(m.towers[0].score, m.towers[1].score) && tw.score < m.target) {
      const pulse = m.animated ? breathe(t, 0.8) : 0.5
      ctx.save()
      ctx.globalAlpha *= 0.5 + pulse * 0.5
      ctx.fillStyle = '#ffd54a'
      starPath(ctx, x, m.topOf(landed) - g.size * 2.4 - pulse * 3 * g.k, g.size * 0.35)
      ctx.fill()
      ctx.restore()
    }
    // 屋顶与旗（赢了）
    if (tw.roof) drawRoof(ctx, x, tw.roof.value, g.colW, g.roofH, tw.team, m.animated ? m.flagWave : 0)
    // 工人：整体（跳 / 前倾 / 晃 / 压扁）交给 withActBody，手势与表情接到姿势上，头顶图标最后画（B72）
    const a = tw.act.pose()
    if (wob) withTransform(ctx, x, pivotY, wob, 1, 1, () => drawWorker(ctx, m, tw, 0, pivotY, a))
    else drawWorker(ctx, m, tw, x, 0, a)
  }
  m.particles.draw(ctx)
}

/** 工人站着的地方相对 (ox, oy) 画：晃砖时原点挪到砖底中点 */
function drawWorker(ctx: CanvasRenderingContext2D, m: TowerModel, tw: Tower, ox: number, oy: number, a: ActPose): void {
  const g = m.geo
  const s = g.size
  const inward: 1 | -1 = tw.team === 'red' ? 1 : -1
  const bx = ox - inward * g.colW * 0.05
  const by = tw.builderY.value - oy
  const lift = m.liftOf(tw)
  const playing = tw.mood === 'idle'
  const cheer = tw.mood === 'win' || tw.cheer.value > 0.3 ? 1 : 0
  const sit = tw.mood === 'lose' ? Math.min(1, tw.moodT * 2) : 0
  // 右手（锤子）：平时垂在身边；轻敲（wave）一下下往脚下的砖敲；按键时举起锤子、每按一下敲一下；答错两手张开保持平衡
  let hammer =
    tw.mood === 'lose' ? 0.9 + Math.sin(tw.hammer) * 0.12 : tw.mood === 'ready' ? -0.6 + Math.sin(tw.hammer * 2) * 0.3 : !playing ? (m.animated ? -0.4 + Math.sin(tw.hammer) * 0.9 : 0.3) : m.animated ? 1 + Math.sin(tw.hammer) * 0.1 : 1
  let left: number | undefined
  if (playing) {
    const tap = 0.15 + 1.15 * Math.max(0, Math.sin(a.beat * 0.7))
    hammer += (tap - hammer) * a.wave
    hammer += (-1.3 + a.press * 1.1 - hammer) * a.typing
    // 擦汗 / 张望：左手搭到额头（擦汗来回抹）
    const brow = Math.max(a.scratch, a.look)
    if (brow > 0.02) left = 1.1 + (-2 + Math.sin(a.beat * 2) * 0.25 * a.scratch - 1.1) * brow
    const balance = a.wide
    if (balance > 0.02) {
      const flail = Math.sin(a.beat * 2) * 0.35
      hammer += (-0.15 + flail - hammer) * balance
      left = (left ?? 1.1) + (-0.1 - flail - (left ?? 1.1)) * balance
    }
  }
  // 轻敲时往锤子那边弯一点腰，按键时往前压（正面朝人，前倾只做一半）；张望时手搭凉棚左右转着看
  const pose: ActPose = { ...a, lean: a.lean * 0.5 + a.wave * 0.12, shake: a.shake + (m.animated ? 0.12 * Math.sin(a.t * 4) * a.look : 0) }
  withActBody(ctx, bx, by, s, pose, inward, () =>
    drawBuilder(ctx, 0, 0, s, tw.team, {
      lift,
      hammer,
      sit,
      cheer,
      blink: tw.blink.value,
      look: Math.max(tw.look.value, a.look),
      arms: a.arms,
      left,
      happy: a.happy,
      wide: a.wide,
    }),
  )
  drawActFx(ctx, bx, by - lift - (a.lift + 1.12) * s, s, a, { side: inward, quality: m.quality })
}
