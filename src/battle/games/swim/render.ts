/**
 * 游泳的渲染：renderBackground 画不动的部分（天空、瓷砖甲板、遮阳伞、救生圈、池沿、池水、泳道中线、未亮的地砖、分道线、出发台、池壁），
 * index.ts 缓存到离屏 canvas；renderDynamic 每帧画会动的部分（太阳、云、发令员、观众、水纹、亮起的地砖、触板、粒子、白浪、两只泳员）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawCloud, drawCritter, drawStarter, drawSun, drawTeamBadge, skyGradient, type CritterKind } from '@/battle/game/sprites/scenery'
import { drawBowWave, drawLaneRope, drawPoolTile, drawRingBuoy, drawShimmer, drawStartBlock, drawSwimmer, drawTileDeck, drawTouchPad, drawUmbrella } from '@/battle/game/sprites/swim'
import type { SwimGeometry, SwimModel } from './model'

const CROWD_KINDS: CritterKind[] = ['bear', 'pig', 'panda', 'monkey']
const ROPES: [string, string][] = [
  ['#ff6b6b', '#ffffff'],
  ['#ffd54a', '#ffffff'],
  ['#4aa3ff', '#ffffff'],
]

function tileX(g: SwimGeometry, i: number, target: number): number {
  return g.runFrom + ((g.runTo - g.runFrom) * i) / target
}

/** 地砖标记在每条道靠外的那一侧（红队靠上、蓝队靠下），离中间的分道线远一点看得清 */
function tileY(g: SwimGeometry, lane: number): number {
  return g.laneY[lane]! + g.laneH * 0.28 * (lane === 0 ? -1 : 1)
}

export function renderBackground(ctx: CanvasRenderingContext2D, g: SwimGeometry, target: number): void {
  const { W, H, k } = g
  const rim = Math.max(3, 5 * k)
  if (!g.compact) {
    ctx.fillStyle = skyGradient(ctx, g.deckY * 1.2)
    ctx.fillRect(0, 0, W, g.deckY * 1.2)
    drawTileDeck(ctx, 0, g.deckY, W, H - g.deckY, Math.max(8, 11 * k))
    drawUmbrella(ctx, W * 0.4, g.deckY + (g.poolTop - g.deckY) * 0.45, 9 * k, ['#ff9f43', '#ffffff'])
    drawUmbrella(ctx, W * 0.56, g.deckY + (g.poolTop - g.deckY) * 0.55, 8 * k, ['#3ecf8e', '#ffffff'])
    drawRingBuoy(ctx, W * 0.48, g.deckY + (g.poolTop - g.deckY) * 0.5, 5 * k)
  } else {
    ctx.fillStyle = '#e9eff3'
    ctx.fillRect(0, 0, W, H)
  }
  // 池沿 + 池水
  ctx.fillStyle = '#c7d3dc'
  ctx.fillRect(g.startX - rim, g.poolTop - rim, g.finishX - g.startX + rim * 2, g.poolBottom - g.poolTop + rim * 2)
  ctx.fillStyle = gradient(ctx, 0, g.poolTop, 0, g.poolBottom, [
    [0, '#6fd3ee'],
    [1, '#2fa8d8'],
  ])
  ctx.fillRect(g.startX, g.poolTop, g.finishX - g.startX, g.poolBottom - g.poolTop)
  // 泳道中线（池底的深色线 + 两头的 T）与未亮的地砖
  ctx.strokeStyle = 'rgba(20,90,150,0.55)'
  ctx.lineWidth = Math.max(2, 3 * k)
  ctx.lineCap = 'butt'
  g.laneY.forEach((y, i) => {
    ctx.beginPath()
    ctx.moveTo(g.startX + 8 * k, y)
    ctx.lineTo(g.finishX - 8 * k, y)
    for (const x of [g.startX + 8 * k, g.finishX - 8 * k]) {
      ctx.moveTo(x, y - g.laneH * 0.18)
      ctx.lineTo(x, y + g.laneH * 0.18)
    }
    ctx.stroke()
    for (let n = 1; n <= target; n++) drawPoolTile(ctx, tileX(g, n, target), tileY(g, i), Math.max(4, g.laneH * 0.3), false, i === 0 ? 'red' : 'blue')
  })
  // 分道线
  const bead = Math.max(2, 3.2 * k)
  ;[g.poolTop, g.poolTop + g.laneH, g.poolBottom].forEach((y, i) => drawLaneRope(ctx, g.startX, g.finishX, y, bead, ROPES[i]!))
  // 池壁、出发台、队色圆牌（B32）
  ctx.fillStyle = '#9fb3c2'
  ctx.fillRect(g.startX - rim, g.poolTop - rim, rim, g.poolBottom - g.poolTop + rim * 2)
  ctx.fillRect(g.finishX, g.poolTop - rim, rim, g.poolBottom - g.poolTop + rim * 2)
  g.laneY.forEach((y, i) => {
    drawStartBlock(ctx, g.startX - g.size * 0.55, y - g.size * 0.22, g.size * 0.6, g.size * 0.44, i === 0 ? 'red' : 'blue')
    if (!g.compact) drawTeamBadge(ctx, g.startX - g.size * 0.95, y, Math.min(g.laneH * 0.3, 8 * k), i === 0 ? 'red' : 'blue')
  })
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: SwimModel): void {
  const g = m.geo
  const { k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, g.W * 0.82, g.deckY * 0.42, 10 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
    drawStarter(ctx, g.startX - 24 * k, g.poolTop - 6 * k, g.size * 0.75, m.starter.value)
    const cs = g.size * 0.46
    for (let i = 0; i < CROWD_KINDS.length; i++) {
      const x = g.finishX - 30 * k - i * cs * 0.8
      const jump = m.crowdJump > 0 && m.animated ? Math.abs(Math.sin(m.crowdJump * 6 + i)) * cs * 0.5 : 0
      const sway = m.animated ? Math.sin(t * 1.5 + i) * cs * 0.05 : 0
      drawCritter(ctx, x, g.poolTop - 6 * k, cs, CROWD_KINDS[i]!, jump + sway, m.crowdWave[i]!)
    }
  }
  // 水纹
  if (m.animated && m.quality < 1) {
    const lines = g.compact ? [0.25] : [0.3, -0.22]
    g.laneY.forEach((y, i) => {
      for (const [j, f] of lines.entries()) {
        drawShimmer(ctx, g.startX + 12 * k, g.finishX - 12 * k, y + g.laneH * f, m.waveT * (j % 2 ? -1 : 1) + i * 1.3, 1.4 * k, 28 * k, Math.max(1, 1.5 * k), 0.32)
      }
    })
  }
  // 亮起的地砖
  m.swimmers.forEach((sw, i) => {
    for (let n = 1; n <= Math.min(sw.score, m.target); n++) drawPoolTile(ctx, tileX(g, n, m.target), tileY(g, i), Math.max(4, g.laneH * 0.3), true, sw.team)
  })
  drawTouchPad(ctx, g.finishX, g.poolTop, g.poolBottom, Math.max(4, 6 * k), Math.max(m.padGlow.value, m.padFlash.value))
  m.particles.draw(ctx)
  m.swimmers.forEach((sw, i) => {
    const x = m.xOf(sw, i)
    const y = g.laneY[i]! + m.bobOf(sw, i)
    drawBowWave(ctx, x, y, g.size * 0.23, m.bowOf(sw))
    drawSwimmer(ctx, x, y, g.size, sw.team, m.kinds[i]!, {
      phase: sw.phase,
      swim: sw.moving,
      crouch: sw.mood === 'ready' ? 1 : 0,
      air: m.airOf(i),
      cheer: sw.mood === 'win' ? 1 : 0,
      float: m.floatOf(sw),
      blink: sw.blink.value,
      look: sw.look.value,
      kick: t * 3,
    })
  })
}
