/**
 * 龟兔赛跑的渲染：只把模型的场景画到 ctx。
 * 分两层：renderBackground 画不动的部分（天空、山丘、草地、跑道、起点线、终点柱、拱门横杆），index.ts 会把它缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳光晕、云、亮起的标记、发令员、彩旗、旗子、观众、两只角色、粒子、速度线）。
 */
import { drawActFx, withActBody } from '@/battle/game/engine/act'
import { fillRoundRect, gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawHare } from '@/battle/game/sprites/hare'
import {
  drawArch,
  drawCheckerFlag,
  drawCloud,
  drawCritter,
  drawFinishPost,
  drawHill,
  drawMarker,
  drawStarter,
  drawSun,
  drawTeamBadge,
  drawTree,
  skyGradient,
  type CritterKind,
} from '@/battle/game/sprites/scenery'
import { drawTortoise } from '@/battle/game/sprites/tortoise'
import type { RaceGeometry, RaceModel, Runner } from './model'

const LANE = '#f3dcaa'
const LANE_EDGE = '#e4c48c'
const CRITTER_KINDS: CritterKind[] = ['bear', 'pig', 'panda', 'monkey']

function markerX(g: RaceGeometry, i: number, target: number): number {
  return g.runFrom + ((g.runTo - g.runFrom) * i) / target
}

export function renderBackground(ctx: CanvasRenderingContext2D, g: RaceGeometry, target: number): void {
  const { W, H, k } = g
  // 天空
  ctx.fillStyle = skyGradient(ctx, g.skyH * 1.3)
  ctx.fillRect(0, 0, W, g.skyH * 1.3)
  // 山丘（紧凑版没有）
  if (!g.compact) {
    drawHill(ctx, W * 0.22, g.skyH * 1.05, W * 0.3, g.skyH * 0.5, '#b9e59c')
    drawHill(ctx, W * 0.68, g.skyH * 1.1, W * 0.36, g.skyH * 0.55, '#a8dd8b')
    for (const fx of [0.12, 0.3, 0.47, 0.58, 0.73, 0.86]) drawTree(ctx, W * fx, g.skyH * 0.98, g.size * (0.55 + (fx * 10) % 3 * 0.08))
  }
  // 草地
  ctx.fillStyle = gradient(ctx, 0, g.skyH, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.skyH, W, H - g.skyH)
  // 跑道
  for (const y of g.laneY) {
    fillRoundRect(ctx, g.startX - 6 * k, y, g.finishX - g.startX + 12 * k, g.laneH, 8 * k, LANE)
    ctx.strokeStyle = LANE_EDGE
    ctx.lineWidth = Math.max(1, 2 * k)
    ctx.stroke()
    ctx.setLineDash([8 * k, 6 * k])
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.beginPath()
    ctx.moveTo(g.startX + 8 * k, y + g.laneH / 2)
    ctx.lineTo(g.finishX - 8 * k, y + g.laneH / 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  // 起点线 + 每条赛道起点的队色圆牌（B32）
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(g.startX, g.laneY[0], Math.max(2, 3 * k), g.laneY[1] + g.laneH - g.laneY[0])
  g.laneY.forEach((y, i) => drawTeamBadge(ctx, g.startX - 12 * k, y + g.laneH / 2, Math.min(g.laneH * 0.42, 9 * k), i === 0 ? 'red' : 'blue'))
  // 未亮的标记
  if (!g.compact) {
    for (let i = 1; i <= target; i++) {
      const x = markerX(g, i, target)
      drawMarker(ctx, x, g.laneY[0] + g.laneH * 0.95, g.size * 0.46, false, 'red')
      drawMarker(ctx, x, g.laneY[1] + g.laneH * 0.95, g.size * 0.46, false, 'blue')
    }
  }
  // 终点柱 + 拱门横杆
  drawFinishPost(ctx, g.finishX, g.laneY[0] - 4 * k, g.laneY[1] + g.laneH + 2 * k, Math.max(6, 8 * k))
  if (!g.compact) {
    ctx.fillStyle = '#b8895a'
    ctx.fillRect(g.finishX - 3 * k, g.laneY[0] - g.size * 1.15, 6 * k, g.size * 1.15)
  }
  // 近景草丛
  ctx.fillStyle = '#5fb84a'
  const tuft = Math.max(3, 5 * k)
  for (let x = 4; x < W; x += tuft * 3) {
    ctx.beginPath()
    ctx.moveTo(x, H)
    ctx.lineTo(x + tuft, H - tuft * 1.6)
    ctx.lineTo(x + tuft * 2, H)
    ctx.closePath()
    ctx.fill()
  }
}

function runnerPose(m: RaceModel, r: Runner): { lift: number; run: number; blink: number; look: number } {
  return { lift: m.lift(r), run: r.moving, blink: r.blink.value, look: r.look.value }
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: RaceModel): void {
  const g = m.geo
  const { k } = g
  const t = m.time
  // 太阳（紧凑版没有）
  if (!g.compact) drawSun(ctx, g.W * 0.8, g.skyH * 0.3, 11 * k, m.animated ? breathe(t, 3) : 0.5)
  // 云
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  // 亮起的标记
  if (!g.compact) {
    for (const r of m.runners) {
      const lane = r.team === 'red' ? 0 : 1
      for (let i = 1; i <= Math.min(r.score, m.target); i++) {
        drawMarker(ctx, markerX(g, i, m.target), g.laneY[lane] + g.laneH * 0.95, g.size * 0.46, true, r.team)
      }
    }
  }
  // 发令员、拱门彩旗、观众（紧凑版没有）
  if (!g.compact) {
    drawStarter(ctx, g.startX - 22 * k, g.laneY[0] - 2 * k, g.size * 0.9, m.starter.value)
    drawArch(ctx, g.finishX - 3 * k, g.laneY[0] - g.size * 1.15, g.W - g.finishX + 3 * k - 4, g.size * 0.6, m.animated ? t * 3 : 0, m.bannerGlow.value)
    const cs = g.size * 0.55
    for (let i = 0; i < CRITTER_KINDS.length; i++) {
      const x = g.finishX + 16 * k + i * cs * 0.75
      const jump = m.crowdJump > 0 && m.animated ? Math.abs(Math.sin(m.crowdJump * 6 + i)) * cs * 0.5 : 0
      const sway = m.animated ? Math.sin(t * 1.5 + i) * cs * 0.05 : 0
      drawCritter(ctx, x, g.laneY[0] - 4 * k, cs, CRITTER_KINDS[i]!, jump + sway, m.crowdWave[i]!)
    }
  }
  // 终点旗
  drawCheckerFlag(ctx, g.finishX + 4 * k, g.laneY[0] - 4 * k, g.compact ? g.size * 0.9 : g.size * 0.6, m.animated ? m.flagWave : 0)
  // 粒子（角色后面的尘土先画）
  m.particles.draw(ctx)
  // 两只角色
  const red = m.runners[0]
  const blue = m.runners[1]
  const pr = runnerPose(m, red)
  const pb = runnerPose(m, blue)
  // 速度线
  for (const [r, lane] of [
    [red, 0],
    [blue, 1],
  ] as const) {
    if (r.moving > 0.3 && m.animated) {
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * r.moving})`
      ctx.lineWidth = Math.max(1, 1.5 * k)
      const y0 = g.laneY[lane] + g.laneH * 0.5
      for (let i = 0; i < 3; i++) {
        const y = y0 - g.size * 0.3 + i * g.size * 0.22
        const len = (10 + i * 4 + r.boost.value * 12) * k
        ctx.beginPath()
        ctx.moveTo(r.x.value - g.size * 0.5, y)
        ctx.lineTo(r.x.value - g.size * 0.5 - len, y)
        ctx.stroke()
      }
    }
  }
  // 一题里的表演（B72）：整体（跳 / 前倾 / 晃 / 压扁）交给 withActBody，手势与表情接到各自的姿势上，头顶图标最后画
  const s = g.size
  const ar = red.act.pose()
  const ab = blue.act.pose()
  const groundR = g.laneY[0] + g.laneH * 0.95
  const groundB = g.laneY[1] + g.laneH * 0.95
  // 原地没在跑时腿自己动：按键时原地小碎步，答对腾空时蹬腿
  const march = (r: Runner, a: typeof ar) => (r.moving > 0.02 ? { phase: r.phase, run: 0 } : { phase: a.t * (a.arms > 0.3 ? 16 : 9), run: Math.max(a.typing * 0.35, a.arms * 0.6) })
  const mr = march(red, ar)
  withActBody(ctx, red.x.value, groundR, s, ar, 1, () =>
    drawTortoise(ctx, 0, 0, s, {
      phase: red.moving > 0.02 ? red.phase : mr.phase,
      run: Math.max(pr.run, mr.run),
      blink: pr.blink,
      hide: red.mood === 'lose' ? Math.min(1, red.moodT * 2) * (red.moodT > 2.5 ? 0.5 : 1) : ar.wide * 0.45,
      spin: red.mood === 'win' && m.animated ? (red.moodT * Math.PI * 2) % (Math.PI * 2) : 0,
      look: Math.max(pr.look, ar.look),
      lift: pr.lift,
      neck: Math.max(ar.arms, red.act.typing * 0.5),
      happy: ar.happy,
      wide: ar.wide,
    }),
  )
  const landing = blue.moving > 0.02 ? Math.max(0, 1 - Math.abs(Math.sin(blue.phase)) * 4) : 0
  withActBody(ctx, blue.x.value, groundB, s, ab, 1, () =>
    drawHare(ctx, 0, 0, s, {
      phase: blue.phase,
      run: pb.run,
      blink: pb.blink,
      earBack: Math.max(pb.run, blue.act.typing * 0.6),
      earTwitch: (m.animated && blue.twitch < 0 ? Math.sin(t * 40) * 0.25 : 0) + ab.wave * Math.sin(ab.beat * 2) * 0.45,
      squash: landing * pb.run,
      flip: blue.mood === 'win' && m.animated ? -((blue.moodT * Math.PI * 2 * 1.25) % (Math.PI * 2)) : 0,
      sit: blue.mood === 'lose' ? Math.min(1, blue.moodT * 2) : 0,
      look: Math.max(pb.look, ab.look),
      lift: pb.lift,
      pawsUp: ab.arms,
      pawsFace: ab.scratch,
      rub: ab.beat * 2,
      droop: ab.wide,
      happy: ab.happy,
      wide: ab.wide,
    }),
  )
  const fx = { side: 1 as const, quality: m.quality }
  drawActFx(ctx, red.x.value + s * 0.45, groundR - pr.lift - (ar.lift + 0.72) * s, s, ar, fx)
  drawActFx(ctx, blue.x.value + s * 0.2, groundB - pb.lift - (ab.lift + 1.2) * s, s, ab, { ...fx, side: -1 })
}
