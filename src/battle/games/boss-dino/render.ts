/**
 * 捣蛋龙的渲染：renderBackground 画不动的部分（场馆背景、看台、灯架、台面与裙边、锣架），index.ts 缓存到离屏 canvas
 * （尺寸、排版或灯光色变了才重画）；renderDynamic 每帧画会动的部分——镜头变换里：光柱、观众（剪影 + 前排举牌的真人）、
 * 后排角柱与围绳、锣、各条道的影子 / Boss（第 3 只的泡泡挡在肚子前）/ 拳手（含正在上下台的）、吼的声波、果冻球、
 * 合力拳击掌的金弧、命中的光、前排角柱、能量拳、星星、粒子、冲击环；镜头之外（不跟着震）：最后 10 秒的暖红呼吸、血条与小头像。
 */
import { withAlpha } from '@/battle/game/engine/draw'
import type { ParticlePool } from '@/battle/game/engine/particles'
import { drawBoxer } from '@/battle/game/sprites/boxer'
import { drawEnergy, drawGlow, drawSeats } from '@/battle/game/sprites/crowd'
import { DINO_MOUTH, dinoLook, drawBubble, drawDino, drawDinoIcon, drawJelly, drawRoarWaves } from '@/battle/game/sprites/dino'
import {
  drawBackdrop,
  drawBackPosts,
  drawBeam,
  drawCrowd,
  drawFrontPosts,
  drawGong,
  drawGongStand,
  drawHpBar,
  drawImpact,
  drawLevelDots,
  drawLink,
  drawRingFloor,
  drawRopes,
  drawStands,
  drawTruss,
  starShape,
} from '@/battle/game/sprites/ring'
import { ROAR_END, ROAR_OPEN, ROAR_TIME, type DinoActor, type DinoModel, type Fighter, type LaneState } from './model'

/** 最后 10 秒的暖红（M10） */
const WARM = '#ff6a4d'
const BACKDROP = '#231d45'

export function renderBackground(ctx: CanvasRenderingContext2D, m: DinoModel): void {
  const g = m.geo
  const first = m.lanes[0]
  const light0 = first ? m.lightOf(first) : dinoLook(1).light
  drawBackdrop(ctx, g.W, g.H, g.rings[0]?.backY ?? g.H * 0.7, light0)
  g.rings.forEach((ring, i) => {
    const band = g.crowdBands[i]
    if (band) drawStands(ctx, band.x0, band.x1, band.y0 + (band.y1 - band.y0) * 0.3, ring.backY)
    const lane = m.lanes.find((l) => l.geo.ring === i)
    drawRingFloor(ctx, ring, lane ? m.lightOf(lane) : light0)
  })
  // 灯架：灯罩口按第一条道的灯光色（两条道时各自的颜色由光柱表现）
  if (g.truss)
    drawTruss(
      ctx,
      g.W,
      g.truss.y,
      g.truss.h,
      g.lamps.map((l) => l.x),
      light0,
    )
  if (g.gong) drawGongStand(ctx, g.gong.x, g.gong.y, g.gong.r, g.gong.floorY)
}

function beamColor(m: DinoModel, lane: LaneState): string {
  return m.lastTen ? WARM : m.lightOf(lane)
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number): void {
  if (alpha <= 0.01 || rx <= 0.5) return
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = '#2b1f3f'
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawBoss(ctx: CanvasRenderingContext2D, m: DinoModel, lane: LaneState, a: DinoActor): void {
  if (!a.visible) return
  const g = lane.geo
  const { x, y, s, pose } = m.dinoPose(lane, a)
  // 影子落在台面上：在空中（掉下来、乱飞）时小一点、淡一点
  const airborne = a.mode === 'drop' || a.mode === 'fly'
  const groundY = airborne ? g.floorY : g.floorY + Math.max(a.y, (g.backY - g.floorY) * 0.8)
  const h = Math.max(0, groundY - y)
  const k = Math.max(0.3, 1 - h / (g.u * 1.6))
  shadow(ctx, x, groundY, s * 0.36 * k * (pose.sx || 1), s * 0.07 * k, 0.28 * k * pose.alpha)
  drawDino(ctx, x, y, s, a.look, pose)
  // 第 3 只的泡泡挡在肚子前面（拳手的拳头画在它前面：看得出是一拳把它打破的）
  const bub = m.bubblePoint(lane, a)
  if (bub) drawBubble(ctx, bub.x, bub.y, bub.r, a.clock, pose.alpha)
}

/**
 * 吼出来的声波：从嘴那儿一圈圈往两边扩出去（张嘴之后每 0.17 秒一圈、每圈 0.55 秒）；减少动画时不扩、只在嘴两边留两道弧
 */
function drawRoar(ctx: CanvasRenderingContext2D, m: DinoModel, lane: LaneState, a: DinoActor): void {
  if (a.mode !== 'roar' || a.t < ROAR_OPEN || a.t > ROAR_TIME) return
  const g = lane.geo
  const s = g.u * a.look.scale * a.scale
  const x = g.bossX + a.x + a.push.value + g.facing * DINO_MOUTH.x * s * 0.6
  const y = g.floorY + a.y - a.air + DINO_MOUTH.y * s
  const lw = Math.max(1.5, m.geo.k * 3)
  const rings: { r: number; a: number }[] = []
  if (!m.animated) {
    const fade = a.t > ROAR_END ? 0.3 : 0.6
    rings.push({ r: s * 0.45, a: fade }, { r: s * 0.62, a: fade * 0.7 })
  } else {
    for (let i = 0; i < 6; i++) {
      const age = a.t - ROAR_OPEN - i * 0.17
      if (age < 0 || age > 0.55 || ROAR_OPEN + i * 0.17 > ROAR_END) continue
      const q = age / 0.55
      rings.push({ r: s * (0.3 + 0.95 * q), a: 0.75 * (1 - q) })
    }
  }
  drawRoarWaves(ctx, x, y, rings, lw)
}

/**
 * 粒子（尘土、彩带、泄的气）：同色的并成一次填充——彩带是一片片翻着的小方块（宽度随转角变，不用一片片旋转），
 * 圆点快没了就缩小（不一颗颗改透明度）；池子自带的 draw 每片彩带要 5 次调用，这里的场面粒子多，省下来给别的
 */
function drawParticles(ctx: CanvasRenderingContext2D, pool: ParticlePool): void {
  const items = pool.items
  if (!items.length) return
  const colors: string[] = []
  for (const p of items) if (!colors.includes(p.color)) colors.push(p.color)
  for (const color of colors) {
    ctx.fillStyle = color
    ctx.beginPath()
    for (const p of items) {
      if (p.color !== color) continue
      const k = Math.max(0, 1 - p.age / p.life)
      if (p.shape === 'flake') {
        const sz = p.size * (0.5 + 0.5 * k)
        const w = sz * Math.max(0.2, Math.abs(Math.cos(p.rot)))
        ctx.rect(p.x - w / 2, p.y - sz * 0.33, w, sz * 0.66)
      } else {
        const r = p.size * (0.25 + 0.5 * k)
        ctx.moveTo(p.x + r, p.y)
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      }
    }
    ctx.fill()
  }
}

function drawFighter(ctx: CanvasRenderingContext2D, m: DinoModel, f: Fighter): void {
  const { x, y, b, pose } = m.boxerPose(f)
  // 上下台（从台子外面跳上来 / 跳下去）的时候没有影子；台上挪位置时影子跟着脚
  const offRing = f.glide !== null && f.glide.kind !== 'move'
  if (!offRing) shadow(ctx, x, f.y, b * 0.26, b * 0.05, 0.25 * f.alpha)
  drawBoxer(ctx, x, y, b, f.kind, f.team, pose)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: DinoModel, bg: CanvasImageSource | null): void {
  const g = m.geo
  const { W, H } = g
  ctx.fillStyle = BACKDROP
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  m.camera.apply(ctx)
  if (bg) ctx.drawImage(bg, 0, 0, W, H)
  else renderBackground(ctx, m)
  // 光柱：照着这条道的 Boss，平时慢慢摆（紧凑版 / 降级不动），最后 10 秒变暖红、慢慢呼吸
  const breath = m.lastTen ? 0.5 + 0.5 * Math.sin(m.warm) : 0
  for (const lamp of g.lamps) {
    const lane = m.lanes[lamp.lane]
    if (!lane) continue
    const sway = m.lightT > 0 ? Math.sin(m.lightT * 0.6 + lamp.x * 0.013) * W * 0.035 : 0
    const tx = lane.geo.bossX + lamp.aim + sway
    const alpha = m.lastTen ? 0.2 + 0.12 * breath : 0.22
    drawBeam(ctx, lamp.x, lamp.y, tx, lane.geo.floorY, (g.truss?.h ?? 6) * 1.3, lane.geo.boxerH * 1.5, beamColor(m, lane), alpha)
  }
  // 观众（裁在台子后沿之上：坐着时身子被台面挡住）：剪影，前排是台下举着牌子的真人（M9）
  if (m.crowd.length || m.seats.length) {
    g.crowdBands.forEach((band, bi) => {
      const fans = m.crowd.filter((c) => c.band === bi)
      const seats = m.seats.length ? m.seatFigures(bi) : []
      if (!fans.length && !seats.length) return
      ctx.save()
      ctx.beginPath()
      ctx.rect(band.x0, band.y0, band.x1 - band.x0, band.y1 - band.y0)
      ctx.clip()
      drawCrowd(ctx, fans, m.quality < 2)
      drawSeats(ctx, seats, m.quality < 2)
      ctx.restore()
    })
  }
  g.rings.forEach((ring, i) => {
    drawBackPosts(ctx, ring)
    drawRopes(
      ctx,
      ring,
      (m.ropes[i] ?? []).map((r) => r.value),
    )
  })
  if (g.gong) drawGong(ctx, g.gong.x, g.gong.y, g.gong.r, m.gongSwing.value, m.gongGlow.value)
  // 各条道：后排拳手 → 退场的 → 当前的 Boss → 前排拳手（拳套打在 Boss 肚子上，画在它前面）
  for (const lane of m.lanes) {
    const lg = lane.geo
    const clip = g.stacked
    if (clip) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(lg.x0, lg.y0, lg.x1 - lg.x0, lg.y1 - lg.y0)
      ctx.clip()
    }
    const mine = (m.leaving.length ? [...m.fighters, ...m.leaving] : m.fighters).filter((f) => f.side === lane.side)
    for (const f of mine) if (f.row > 0) drawFighter(ctx, m, f)
    for (const o of lane.outgoing) drawBoss(ctx, m, lane, o)
    if (lane.boss) drawBoss(ctx, m, lane, lane.boss)
    for (const f of mine) if (f.row === 0) drawFighter(ctx, m, f)
    if (lane.boss) drawRoar(ctx, m, lane, lane.boss)
    // 果冻球从拳手头顶飞过去（画在拳手前面）
    const jp = lane.jelly ? m.jellyPos(lane, lane.jelly) : null
    if (jp) drawJelly(ctx, jp.x, jp.y, jp.r, jp.sx, jp.sy, jp.alpha)
    if (clip) ctx.restore()
  }
  // 合力拳击掌 / 碰拳：两只举起来的拳头之间一道金色的弧，最高处闪一下
  for (const l of m.links) {
    const lg = m.linkGeo(l)
    if (lg) drawLink(ctx, lg.ax, lg.ay, lg.bx, lg.by, lg.cx, lg.cy, lg.grow, lg.flash, lg.alpha, g.k)
  }
  // 命中的光（能量拳打到的那一下、减少动画时 Boss 身上慢慢亮起的光）：只在这一小块，亮度 ≤ 35%
  for (const gl of m.glows) drawGlow(ctx, gl.x, gl.y, gl.r, gl.color, gl.level, gl.ring)
  for (const ring of g.rings) drawFrontPosts(ctx, ring)
  // 台下的人打出来的能量拳（从观众席飞过来，画在最前面）
  if (m.energy.length) drawEnergy(ctx, m.energyFigures())
  // 星星：同色的并成一次填充；快没了就缩小（不用一颗颗改透明度）
  if (m.stars.length) {
    for (const color of ['#ffd24a', '#ffe98a', '#ffb347']) {
      ctx.beginPath()
      let any = false
      for (const s of m.stars) {
        if (s.color !== color) continue
        const k = 1 - Math.max(0, (s.age - s.life * 0.6) / (s.life * 0.4))
        if (k <= 0.05) continue
        any = true
        starShape(ctx, s.x, s.y, s.r * k, s.rot)
      }
      if (!any) continue
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#b8860b'
      ctx.lineWidth = Math.max(1, g.k * 1.2)
      ctx.stroke()
    }
  }
  drawParticles(ctx, m.particles)
  for (const fx of m.impacts) drawImpact(ctx, fx.x, fx.y, fx.r, fx.t, fx.color)
  ctx.restore()
  // 最后 10 秒：整个画面淡淡一层暖红，慢慢呼吸（很淡、很慢：光敏安全）
  if (m.lastTen) {
    withAlpha(ctx, 0.04 + 0.06 * breath, () => {
      ctx.fillStyle = WARM
      ctx.fillRect(0, 0, W, H)
    })
  }
  // 血条（不跟着镜头震）：小头像 + 一格一格的血 + 第几只的小圆点
  for (const lane of m.lanes) {
    const b = lane.geo.bar
    const look = dinoLook(lane.bar.level)
    drawDinoIcon(ctx, b.iconX, b.iconY, b.iconR, look)
    drawHpBar(
      ctx,
      b.x,
      b.y,
      b.w,
      b.h,
      lane.bar.shown,
      lane.bar.ghost,
      lane.bar.max,
      { fill: look.body, dark: look.shade },
      lane.bar.refill,
      lane.bar.flash.value,
    )
    drawLevelDots(ctx, b.dotX, b.dotY, b.dotR, lane.bar.level, look.body)
  }
}
