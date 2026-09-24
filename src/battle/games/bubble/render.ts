/**
 * 吹泡泡的渲染：renderBackground 画不动的部分（天空、山丘、草地、小花），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、小鸟、顶上的星星、空中的小泡泡、两只角色与泡泡棒、两颗泡泡、粒子）。
 */
import { NEUTRAL_POSE, drawActFx, withActBody, type ActPose } from '@/battle/game/engine/act'
import { circle, gradient, withAlpha } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawBlower, drawBubble, drawFlowerDot, drawJar, drawStarRow } from '@/battle/game/sprites/bubble'
import { drawBubble as drawMote } from '@/battle/game/sprites/fish'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { drawBird } from '@/battle/game/sprites/town'
import type { BubbleGeometry, BubbleModel } from './model'

const FLOWERS: [number, string][] = [
  [0.08, '#ff9ad5'],
  [0.2, '#ffb347'],
  [0.45, '#c9a3ff'],
  [0.6, '#ff9ad5'],
  [0.85, '#ffb347'],
  [0.95, '#c9a3ff'],
]

export function renderBackground(ctx: CanvasRenderingContext2D, g: BubbleGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.groundY)
  ctx.fillRect(0, 0, W, g.groundY)
  if (!g.compact) {
    drawHill(ctx, W * 0.25, g.groundY - g.size * 0.5, W * 0.5, g.size * 0.9, '#b9e59c')
    drawHill(ctx, W * 0.85, g.groundY - g.size * 0.4, W * 0.55, g.size * 1.0, '#a8dd8b')
  }
  ctx.fillStyle = gradient(ctx, 0, g.groundY - g.size * 0.3, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.groundY - g.size * 0.3, W, H - g.groundY + g.size * 0.3)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, Math.max(1, 2 * k))
  if (!g.compact) for (const [fx, color] of FLOWERS) drawFlowerDot(ctx, W * fx, g.groundY + 5 * k + (fx * 100) % 4, 2.4 * k, color)
  // 脚边的一小瓶泡泡水（B72 等答题时蘸一下）
  g.laneX.forEach((x, i) => drawJar(ctx, x + (i === 0 ? 1 : -1) * g.size * 0.46, g.groundY, g.size))
}

/** 本地点 (lx, ly)（脚下为原点）经 withActBody 之后比平时挪了多少：泡泡还挂在棒上时跟着棒走 */
function bodyShift(a: ActPose, s: number, dir: 1 | -1, lx: number, ly: number): { dx: number; dy: number } {
  const rot = (a.lean + a.shake) * dir
  const px = lx * a.sx
  const py = ly * a.sy
  const c = Math.cos(rot)
  const sn = Math.sin(rot)
  return { dx: px * c - py * sn - lx, dy: px * sn + py * c - a.lift * s - ly }
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: BubbleModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, W * 0.82, g.topY + g.H * 0.05, 8 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
    if (m.bird) drawBird(ctx, m.bird.x, m.bird.y, 5 * k, m.bird.flap)
    for (const mo of m.motes) drawMote(ctx, mo.x + Math.sin(mo.wob) * 3 * k, mo.y, mo.r)
  }
  drawStarRow(ctx, 6 * k, W - 6 * k, g.starsY, Math.max(2, 3.5 * k), m.starGlow[0]!.value, m.starGlow[1]!.value, m.animated ? t : 0)
  // 一题里的表演（B72）：整体（跳 / 前倾 / 晃 / 压扁）交给 withActBody，泡泡棒画在手里跟着走；
  // 按键深吸一口气（腮帮子鼓起来）、等答题时腮帮子一鼓一鼓 / 蘸泡泡水 / 抬头看泡泡；答对举手，答错一愣
  const s = g.size
  const shifts: { dx: number; dy: number }[] = []
  m.blowers.forEach((b, i) => {
    const x = g.laneX[i]!
    const dir: 1 | -1 = i === 0 ? 1 : -1
    const lift = m.liftOf(b)
    const a = b.act.pose()
    const dip = m.dipOf(b)
    const puff = Math.max(m.puff[i]!.value, 0.6 * a.typing + 0.4 * a.press, a.wave * (0.5 + 0.5 * Math.sin(a.beat * 2)))
    const body: ActPose = { ...a, lean: a.lean * 0.6 + dip * 0.2, sy: a.sy + (m.animated ? 0.05 * a.look : 0) }
    withActBody(ctx, x, g.groundY, s, body, dir, () =>
      drawBlower(ctx, 0, 0, s, b.team, m.kinds[i]!, {
        puff: Math.min(1, puff),
        lift,
        cheer: b.mood === 'win' ? 1 : 0,
        blink: b.blink.value,
        look: b.look.value,
        dir,
        arms: a.arms,
        dip,
        up: a.look,
        happy: a.happy,
        wide: a.wide,
        wand: true,
      }),
    )
    const sh = bodyShift(body, s, dir, dir * 0.3 * s, -0.78 * s)
    shifts.push({ dx: sh.dx, dy: sh.dy - lift })
    const lb = m.loserBubble(b)
    if (lb) drawBubble(ctx, x + dir * s * 0.3, lb.y, lb.r, 1, 1, 0, 0, 0)
    // 头顶图标：泡泡 / 灯泡 / 亮片冒在外侧（里侧是大泡泡），汗珠挂在脸外侧
    const headY = g.groundY - lift - (a.lift + 1.18) * s
    drawActFx(ctx, x - dir * s * 0.12, headY, s, { ...a, sweat: 0 }, { side: (-dir) as 1 | -1, quality: m.quality })
    if (a.sweat > 0.03) drawActFx(ctx, x, headY, s, { ...NEUTRAL_POSE, sweat: a.sweat }, { side: dir, quality: m.quality })
  })
  m.particles.draw(ctx)
  m.blowers.forEach((b, i) => {
    const [sx, sy] = m.wobbleOf(i)
    const r = m.rOf(b)
    // 泡泡还在棒上（0…1 分）时跟着棒一起动；越往上飘越不管它
    const stick = Math.max(0, 1 - b.pos.value)
    const cx = g.laneX[i]! + shifts[i]!.dx * stick
    const cy = m.cyOf(b) + m.driftOf(b, i) + shifts[i]!.dy * stick
    drawBubble(ctx, cx, cy, r, sx, sy, m.rainbow[i]!.value, m.rotOf(), m.starGlow[i]!.value * 0.6)
    // 答错：泡泡旁边鼓出一颗小的，啪地破掉（B72）
    const pop = m.popOf(b)
    if (pop !== null) drawSidePop(ctx, cx + (i === 0 ? 1 : -1) * r * 0.95, cy + r * 0.35, Math.max(4 * g.k, r * 0.36), pop)
  })
}

/** 旁边那颗小泡泡：q < 0.4 鼓出来，之后啪地破成一圈短线和小水珠 */
function drawSidePop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, q: number): void {
  if (q < 0.4) {
    const k = q / 0.4
    drawBubble(ctx, x, y, r * (0.4 + 0.6 * k), 1, 1, 0, 0, 0)
    return
  }
  const k = (q - 0.4) / 0.6
  withAlpha(ctx, 1 - k * k, () => {
    // 天是浅蓝的：破开的短线用泡泡边上那两种颜色，才看得出「啪」
    ctx.lineWidth = Math.max(1.2, r * 0.2)
    ctx.lineCap = 'round'
    for (const [color, from] of [
      ['#ff9ad5', 0],
      ['#4fb8f0', 1],
    ] as const) {
      ctx.strokeStyle = color
      ctx.beginPath()
      for (let j = from; j < 6; j += 2) {
        const ang = (j * Math.PI) / 3 + 0.3
        const r0 = r * (0.5 + 0.6 * k)
        const r1 = r * (1 + 0.9 * k)
        ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0)
        ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1)
      }
      ctx.stroke()
    }
    ctx.fillStyle = '#8fd0ff'
    for (let j = 0; j < 3; j++) {
      const ang = (j * Math.PI * 2) / 3 + 0.9
      circle(ctx, x + Math.cos(ang) * r * (1 + k), y + Math.sin(ang) * r * (1 + k) + k * k * r, r * 0.16)
      ctx.fill()
    }
  })
}
