/**
 * 拔河的渲染：renderBackground 画不动的部分（天空、山丘、小树、草地、中线、水坑），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、观众、涟漪、汗珠、四只角色、绳子、手、蝴蝶结、粒子）。
 */
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawCloud, drawCritter, drawHill, drawSun, drawTree, skyGradient, type CritterKind } from '@/battle/game/sprites/scenery'
import { drawBow, drawHands, drawPuddle, drawPuller, drawRipple, drawSweat, strokeRope } from '@/battle/game/sprites/tug'
import type { RopeAnchors, Side, TugGeometry, TugModel } from './model'

const CROWD_KINDS: CritterKind[] = ['pig', 'monkey', 'bear', 'panda']

export function renderBackground(ctx: CanvasRenderingContext2D, g: TugGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.skyH * 1.3)
  ctx.fillRect(0, 0, W, g.skyH * 1.3)
  if (!g.compact) {
    drawHill(ctx, W * 0.25, g.skyH * 1.05, W * 0.32, g.skyH * 0.5, '#b9e59c')
    drawHill(ctx, W * 0.72, g.skyH * 1.1, W * 0.36, g.skyH * 0.55, '#a8dd8b')
    for (const fx of [0.012, 0.11, 0.89, 0.988]) drawTree(ctx, W * fx, g.skyH * 0.98, g.size * 0.55)
  }
  ctx.fillStyle = gradient(ctx, 0, g.skyH, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.skyH, W, H - g.skyH)
  // 中线
  ctx.save()
  ctx.setLineDash([6 * k, 5 * k])
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = Math.max(2, 3 * k)
  ctx.beginPath()
  ctx.moveTo(g.centerX, g.skyH + 2 * k)
  ctx.lineTo(g.centerX, H)
  ctx.stroke()
  ctx.restore()
  drawPuddle(ctx, g.centerX, g.puddleY, g.puddleRx, g.puddleRy)
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

function ropePath(ctx: CanvasRenderingContext2D, a: RopeAnchors, g: TugGeometry): void {
  const s = g.size
  const ground = g.groundY - g.k * 1.2
  // 左边的绳尾拖在地上
  ctx.moveTo(a.redBack.x - s * 0.95, ground)
  ctx.quadraticCurveTo(a.redBack.x - s * 0.6, a.redBack.y, a.redBack.x, a.redBack.y)
  ctx.lineTo(a.redFront.x, a.redFront.y)
  // 中段：一条二次曲线，控制点在蝴蝶结下面两倍下垂处，曲线正中就落在蝴蝶结上
  const midY = (a.redFront.y + a.blueFront.y) / 2
  ctx.quadraticCurveTo(a.bow.x, midY + (a.bow.y - midY) * 2, a.blueFront.x, a.blueFront.y)
  ctx.lineTo(a.blueBack.x, a.blueBack.y)
  ctx.quadraticCurveTo(a.blueBack.x + s * 0.6, a.blueBack.y, a.blueBack.x + s * 0.95, ground)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: TugModel): void {
  const g = m.geo
  const { k } = g
  const t = m.time
  if (!g.compact) drawSun(ctx, g.W * 0.8, g.skyH * 0.3, 11 * k, m.animated ? breathe(t, 3) : 0.5)
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  // 观众
  if (!g.compact) {
    const cs = g.size * 0.55
    g.crowdX.forEach((x, i) => {
      const jump = m.crowdJump > 0 && m.animated ? Math.abs(Math.sin(m.crowdJump * 6 + i)) * cs * 0.5 : 0
      const sway = m.animated && m.quality < 1 ? Math.sin(t * 1.5 + i) * cs * 0.05 : 0
      drawCritter(ctx, x, g.groundY - 2 * k, cs, CROWD_KINDS[i]!, jump + sway, m.crowdWave[i]!)
    })
  }
  // 涟漪
  if (m.rippleT >= 0) {
    const py = g.puddleY
    drawRipple(ctx, m.rippleX, py, g.puddleRx * 0.8, g.puddleRy * 0.8, m.rippleT / 1.2, Math.max(1, 1.5 * k))
    drawRipple(ctx, m.rippleX, py, g.puddleRx * 0.8, g.puddleRy * 0.8, (m.rippleT - 0.35) / 1.0, Math.max(1, 1.2 * k))
  }
  // 四只角色
  const a = m.anchors()
  const sides: Side[] = [m.sides[0], m.sides[1]]
  for (const side of sides) {
    const facing = side.team === 'red' ? 1 : -1
    const lean = m.leanOf(side)
    const cheer = m.cheerOf(side)
    side.members.forEach((p, i) => {
      const lift = m.liftOf(side, i)
      const x = p.x.value
      if (side.sweat.value > 0.05 && p.fallen.value === 0) {
        drawSweat(ctx, x - facing * lean * 0.48 * g.size, g.groundY - lift - 0.98 * g.size, g.size, side.sweat.value, facing)
      }
      drawPuller(ctx, x, g.groundY, g.size, p.kind, side.team, {
        facing,
        lean,
        lift,
        handY: g.ropeY - g.groundY,
        cheer,
        fallen: p.fallen.value,
        strain: side.strain.value,
        blink: p.blink.value,
      })
    })
  }
  // 绳子（压在手臂上），再把手画到绳子上
  strokeRope(ctx, Math.max(3, (g.compact ? 4 : 6) * k), () => ropePath(ctx, a, g))
  for (const side of sides) {
    const facing = side.team === 'red' ? 1 : -1
    const holding = side.release.value < 0.5
    side.members.forEach((p, i) => {
      if (!holding || p.fallen.value > 0) return
      const pt = side.team === 'red' ? (i === 0 ? a.redFront : a.redBack) : i === 0 ? a.blueFront : a.blueBack
      drawHands(ctx, pt.x, pt.y, g.size, p.kind, facing)
    })
  }
  // 蝴蝶结
  const tilt = m.animated ? Math.sin(t * 40) * 0.35 * m.bowKick.value : 0
  drawBow(ctx, a.bow.x, a.bow.y, g.size * 0.5, tilt, m.animated ? m.bowGlow.value * (0.6 + breathe(t, 0.8) * 0.4) : m.bowGlow.value)
  m.particles.draw(ctx)
}
