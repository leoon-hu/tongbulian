/**
 * 拆城堡的渲染：renderBackground 画不动的部分（天空、山丘、草地），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、小鸟、两座塔的砖、塔顶与队旗、炮与烟、角色、炮弹、粒子、废墟）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawBattlement, drawCannon, drawCannonball, drawCastleBrick, drawPuffSmoke, drawRubble } from '@/battle/game/sprites/castle'
import { drawPicker } from '@/battle/game/sprites/fruit'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { starPath } from '@/battle/game/sprites/space'
import { drawBird } from '@/battle/game/sprites/town'
import type { CastleGeometry, CastleModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: CastleGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.groundY)
  ctx.fillRect(0, 0, W, g.groundY)
  if (!g.compact) {
    drawHill(ctx, W * 0.25, g.groundY - g.size * 0.4, W * 0.5, g.size * 1.2, '#b9e59c')
    drawHill(ctx, W * 0.85, g.groundY - g.size * 0.3, W * 0.55, g.size * 1.3, '#a8dd8b')
  }
  ctx.fillStyle = gradient(ctx, 0, g.groundY - g.size * 0.3, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.groundY - g.size * 0.3, W, H - g.groundY + g.size * 0.3)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, Math.max(1, 2 * k))
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: CastleModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, W * 0.5, g.H * 0.06, 8 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
    if (m.bird) drawBird(ctx, m.bird.x, m.bird.y, 5 * k, m.bird.flap)
  }
  m.guards.forEach((gd, i) => {
    const x = g.towerX[i]!
    const dir: 1 | -1 = i === 0 ? 1 : -1
    if (m.collapsed[i] && m.topY[i]!.done) drawRubble(ctx, x, g.groundY, g.brickW, gd.team)
    m.bricks[i]!.forEach((b, n) => {
      if (b.state === 'gone') return
      drawCastleBrick(ctx, x, m.brickTop(n), g.brickW, g.brickH, gd.team, m.crackOf(b), m.alarmOf(i, n))
    })
    const top = m.topY[i]!.value
    if (!(m.collapsed[i] && m.topY[i]!.done)) drawBattlement(ctx, x, top - g.topH, g.brickW, g.topH, gd.team, m.animated ? m.flagWave + i : 0)
    const floorY = m.collapsed[i] && m.topY[i]!.done ? g.groundY : top - g.topH
    drawCannon(ctx, x + dir * g.brickW * 0.3, floorY, g.cannonS, dir, m.recoil[i]!.value)
    const sm = m.smoke[i]!.value
    if (sm > 0.05 && m.animated) drawPuffSmoke(ctx, x + dir * g.brickW * 0.72, floorY - g.cannonS * 0.55, g.cannonS * 0.35 * (1.4 - sm * 0.6), Math.min(1, sm))
    drawPicker(ctx, x - dir * g.brickW * 0.2, floorY, g.size, gd.team, m.kinds[i]!, {
      lift: m.liftOf(gd),
      cheer: gd.mood === 'win' ? 1 : 0,
      scratch: gd.mood === 'lose' && !m.collapsed[i] ? Math.min(1, gd.moodT / 0.8) : 0,
      blink: gd.blink.value,
      look: gd.look.value,
      leaf: 0,
      dir,
    })
    if (m.dizzyOf(i) > 0 && m.animated) {
      ctx.fillStyle = '#ffd54a'
      for (let s = 0; s < 3; s++) {
        const a = t * 4 + (s * Math.PI * 2) / 3
        starPath(ctx, x - dir * g.brickW * 0.2 + Math.cos(a) * g.size * 0.35, floorY - g.size * 1.15 + Math.sin(a) * g.size * 0.1, g.size * 0.08)
        ctx.fill()
      }
    }
  })
  for (const sh of m.shots) {
    if (sh.delay > 0) continue
    const p = m.shotAt(sh)
    drawCannonball(ctx, p.x, p.y, Math.max(2, g.cannonS * 0.16))
  }
  m.particles.draw(ctx)
}
