/**
 * 孵蛋的渲染：renderBackground 画不动的部分（天空、谷仓、木栅栏、干草地），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、小鸟、母鸡、草窝、蛋、小鸡、粒子）。
 */
import { drawActFx, withActBody } from '@/battle/game/engine/act'
import { gradient, withAlpha } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawBarn, drawChick, drawEgg, drawFeather, drawHen, drawNest, drawWoodFence } from '@/battle/game/sprites/egg'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { drawBird } from '@/battle/game/sprites/town'
import type { EggGeometry, EggModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: EggGeometry): void {
  const { W, H, k } = g
  const strawTop = g.strawTop
  ctx.fillStyle = skyGradient(ctx, strawTop)
  ctx.fillRect(0, 0, W, strawTop)
  if (!g.compact) {
    drawHill(ctx, W * 0.2, strawTop + 2 * k, W * 0.55, g.henS * 0.7, '#b9e59c')
    drawHill(ctx, W * 0.85, strawTop + 3 * k, W * 0.5, g.henS * 0.6, '#a8dd8b')
    drawBarn(ctx, W * 0.5, strawTop, g.henS * 1.7, g.henS * 1.6)
    drawWoodFence(ctx, 0, W, strawTop, g.henS * 0.7, k)
  }
  ctx.fillStyle = gradient(ctx, 0, strawTop, 0, H, [
    [0, '#e9d48a'],
    [1, '#d2b86a'],
  ])
  ctx.fillRect(0, strawTop, W, H - strawTop)
  ctx.strokeStyle = 'rgba(160,120,50,0.35)'
  ctx.lineWidth = Math.max(1, 1.2 * k)
  ctx.beginPath()
  for (let i = 0; i < 9; i++) {
    const x = (W * (i + 0.3)) / 9
    const y = strawTop + (H - strawTop) * (0.2 + ((i * 7) % 5) * 0.15)
    ctx.moveTo(x, y)
    ctx.lineTo(x + 6 * k, y + 2 * k)
  }
  ctx.stroke()
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: EggModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, W * 0.8, g.H * 0.08, 9 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
    if (m.bird) drawBird(ctx, m.bird.x, m.bird.y, 5 * k, m.bird.flap)
  }
  m.eggs.forEach((e, i) => {
    const dir: 1 | -1 = i === 0 ? 1 : -1
    // 母鸡是角色（B72）：整体（跳 / 前倾 / 晃 / 压扁）交给 withActBody，翅膀、歪头、啄地、回头、表情接到姿势上
    const a = e.act.pose()
    const s = g.henS
    const lift = m.henLift(e)
    // 按键翅膀微张、每按一下扑一下；答对扑着翅膀跳；抖羽毛时翅膀一抖一抖
    let flap = m.henFlap(e, i) + a.typing * 0.35 + a.press * 0.45 + a.arms * (0.9 + 0.5 * Math.sin(a.beat * 4))
    if (a.scratch > 0.02) flap += a.scratch * (0.35 + 0.35 * Math.sin(a.beat * 5))
    withActBody(ctx, g.henX[i]!, g.henY, s, a, dir, () =>
      drawHen(ctx, 0, 0, s, e.team, {
        flap: Math.min(1.5, flap),
        lift,
        tilt: Math.max(m.henTilt(e), a.wave * 0.9),
        blink: e.blink.value,
        dir,
        peck: m.peckOf(e),
        back: a.look,
        happy: a.happy,
        wide: a.wide,
      }),
    )
    drawActFx(ctx, g.henX[i]! + dir * s * 0.26, g.henY - lift - (a.lift + 1.18) * s, s, a, { side: dir, quality: m.quality })
    drawNest(ctx, g.laneX[i]!, g.nestY, g.nestW, g.nestH, 'back')
    const h = m.hatch[i]!.value
    drawEgg(ctx, g.laneX[i]!, g.eggY, g.eggW, g.eggH, {
      cracks: m.cracksOf(e),
      hole: m.holeOf(e),
      beak: m.beakOf(e),
      lift: m.liftOf(e),
      broken: h > 0.05,
      rot: m.rotOf(e, i),
      glow: m.eggGlow[i]!.value,
      blink: e.blink.value,
      look: e.look.value * dir,
    })
    drawNest(ctx, g.laneX[i]!, g.nestY, g.nestW, g.nestH, 'front')
    if (h > 0.05) {
      const at = m.chickAt(i)
      drawChick(ctx, at.x, at.y, g.chickS, {
        lift: at.lift,
        flap: m.animated ? 0.5 + Math.sin(t * 12) * 0.5 : 0.5,
        hat: Math.min(1, h * 1.5),
        blink: e.blink.value,
        look: 0,
        dir,
      })
    }
  })
  for (const f of m.feathersDown) {
    const at = m.featherAt(f)
    withAlpha(ctx, at.alpha, () => drawFeather(ctx, at.x, at.y, Math.max(7, g.henS * 0.3), at.rot))
  }
  m.particles.draw(ctx)
}
