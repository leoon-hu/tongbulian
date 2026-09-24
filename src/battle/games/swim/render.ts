/**
 * 游泳的渲染：renderBackground 画不动的部分（天空、瓷砖甲板、遮阳伞、救生圈、池沿、池水、泳道中线、未亮的地砖、分道线、出发台、池壁），
 * index.ts 缓存到离屏 canvas；renderDynamic 每帧画会动的部分（太阳、云、发令员、观众、水纹、亮起的地砖、触板、粒子、白浪、两只泳员）。
 */
import { RIGHT_TIME, WRONG_TIME, drawActFx, type ActPose } from '@/battle/game/engine/act'
import { ellipse, gradient, withAlpha, withTransform } from '@/battle/game/engine/draw'
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

/**
 * 俯视的泳员怎么演一题（B72）：跳起来 = 身子放大（离水面近了）+ 往前一跃，前倾 = 往前探，晃 / 摇头 = 身子绕腰左右摆，
 * 翻跟头 = 原地转一圈，压扁拉长沿身子方向（身长 ↔ sy、身宽 ↔ sx），都绕身子中间。
 */
function withSwimAct(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, a: ActPose, draw: () => void): void {
  const air = 1 + a.lift * 0.6
  const mid = -s * 0.45
  withTransform(ctx, x + (a.lean * 0.3 + a.lift * 0.35) * s + mid, y, a.shake * 0.8 + a.spin, a.sy * air, a.sx * air, () => {
    ctx.translate(-mid, 0)
    draw()
  })
}

/** 头顶图标别出盒子（紧凑版头顶离上沿很近）：放不下就往下挪到放得下、再往旁边让开脸（B72） */
function fxAt(x: number, y: number, s: number, side: 1 | -1): [number, number] {
  const r = Math.max(s, 22)
  return y >= r * 0.6 ? [x, y] : [x + side * r * 0.4, r * 0.6]
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
  const s = g.size
  m.swimmers.forEach((sw, i) => {
    const x = m.xOf(sw, i)
    const y = g.laneY[i]! + m.bobOf(sw, i)
    const act = sw.act
    const a = act.pose()
    const tread = m.treadOf(sw)
    drawBowWave(ctx, x, y, s * 0.23, m.bowOf(sw))
    // 一题里的表演（B72）：踩水时身边一圈圈水纹、跃起时水面上的影子、落回水里的一圈浪
    if (m.animated) {
      if (tread > 0.3 && m.quality < 1) {
        const q = (a.t / 1.8) % 1
        withAlpha(ctx, (1 - q) * 0.45 * tread, () => {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = Math.max(1, s * 0.035)
          ellipse(ctx, x - s * 0.4, y, s * (0.5 + q * 0.35), s * (0.22 + q * 0.2))
          ctx.stroke()
        })
      }
      if (a.lift > 0.02) {
        withAlpha(ctx, Math.min(0.3, a.lift * 0.8), () => {
          ctx.fillStyle = '#12507a'
          ellipse(ctx, x - s * 0.45 + a.lift * s * 0.2, y + a.lift * s * 0.28, s * 0.5, s * 0.18)
          ctx.fill()
        })
      }
      if (act.rightT >= RIGHT_TIME * 0.5) {
        const q = (act.rightT / RIGHT_TIME - 0.5) / 0.5
        withAlpha(ctx, (1 - q) * 0.85, () => {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = Math.max(1.5, s * 0.06)
          ellipse(ctx, x - s * 0.35, y, s * (0.55 + q * 0.5), s * (0.3 + q * 0.3))
          ctx.stroke()
        })
      }
    }
    const wrongQ = act.wrongT >= 0 ? act.wrongT / WRONG_TIME : -1
    withSwimAct(ctx, x, y, s, a, () =>
      drawSwimmer(ctx, 0, 0, s, sw.team, m.kinds[i]!, {
        phase: sw.phase,
        swim: sw.moving,
        crouch: sw.mood === 'ready' ? 1 : 0,
        air: m.airOf(i),
        // 答对那一拍举手欢呼；伸展那个小动作是两手往前伸，不算举手
        cheer: sw.mood === 'win' ? 1 : act.rightT >= 0 ? a.arms : 0,
        float: m.floatOf(sw),
        blink: sw.blink.value,
        look: Math.max(sw.look.value, a.look),
        kick: t * 3,
        tread,
        treadT: m.animated ? a.t * 2.4 : 0,
        reach: Math.max(act.typing, act.gesture === 'stretch' ? a.arms / 0.7 : 0),
        press: a.press,
        wave: a.wave,
        waveSide: i === 0 ? -1 : 1,
        beat: a.beat,
        scratch: a.scratch,
        turn: wrongQ >= 0 ? a.shake * 2.2 : 0,
        happy: a.happy,
        wide: a.wide,
        gulp: wrongQ >= 0 && wrongQ < 0.5 ? Math.sin((wrongQ / 0.5) * Math.PI) : 0,
      }),
    )
    const [fx, fy] = fxAt(x + (a.lean * 0.3 + a.lift * 0.35) * s, y - s * 0.24 * (1 + a.lift * 0.6), s, 1)
    drawActFx(ctx, fx, fy, s, a, { side: 1, quality: m.quality })
  })
}
