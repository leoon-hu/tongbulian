/**
 * 打怪兽观众席里的真人与能量拳（需求 M9 / M12）：多设备人多时，台下的孩子坐在观众席前排（在剪影前面、更亮），
 * 是自己的小动物，双手举着一块队色边框的牌子（牌子上画他那只小动物的脸，没有字）；他答对时从牌子里飞出一个队色发光的
 * 「能量拳」打向 Boss。都是代码画的矢量卡通。
 * 十来个人同时在场，所以同一种颜色的部件并成一条路径画（整排人只有几十次填充）：圆用 roundRect（半径 = 半边长）一笔画出来，
 * 牌子只左右晃、不旋转。座位的原点 (x, y) 在台子后沿上（身子在它下面、被台子挡住，画的时候裁在后沿之上），r 是头的半径。
 */
import type { Team } from '@/battle/protocol'
import { withAlpha } from '../engine/draw'
import type { BoxerKind } from './boxer'
import { TEAM_COLOR } from './ring'
import { FUR } from './tug'

/** 头的半径 = 拳手身高 × SEAT_R（坐得比剪影近，比剪影的头大一圈） */
export const SEAT_R = 0.11
/**
 * 一个座位的尺寸（单位 = 头的半径）：pitch 相邻两个座位的间距、half 占地的半宽（牌子晃到头也不出界）、
 * top 牌子顶离台子后沿多高、lift 举高时再高多少、hop 蹦一下多高、sink 沉到多深就整个看不见了
 */
export const SEAT = { pitch: 3.2, half: 1.45, top: 5.6, lift: 1.1, hop: 0.9, sink: 7.8 } as const

/** 一个座位这一刻的样子 */
export interface SeatFigure {
  x: number
  /** 台子后沿（身子从这儿往上露出来） */
  y: number
  r: number
  kind: BoxerKind
  team: Team
  /** 升起来多少 0…1（从台子后沿后面冒出来 / 沉下去） */
  rise: number
  /** 整个人往上蹦多高（px） */
  hop: number
  /** 牌子举高 0…1 */
  lift: number
  /** 牌子左右晃（px，手跟着） */
  shake: number
  /** 笑眯眯 0…1（举牌时） */
  happy: number
}

const INK = 'rgba(40,20,60,0.6)'
const ROBOT = { fur: '#d5dbe6', ear: '#5ad1ff', screen: '#2b3a55', eye: '#7df9ff' } as const

interface Palette {
  fur: string
  /** 耳朵（熊猫是黑的） */
  ear: string
  /** 口鼻（熊猫没有、机器人是屏幕） */
  muzzle: string | null
  /** 兔子耳朵里、猴子耳朵里 */
  inner: string | null
  eye: string
  /** 手臂与手 */
  limb: string
}

function paletteOf(kind: BoxerKind): Palette {
  if (kind === 'robot') return { fur: ROBOT.fur, ear: ROBOT.ear, muzzle: ROBOT.screen, inner: null, eye: ROBOT.eye, limb: ROBOT.fur }
  const [fur, accent] = FUR[kind]
  if (kind === 'panda') return { fur, ear: accent, muzzle: null, inner: null, eye: '#ffffff', limb: accent }
  return {
    fur,
    ear: fur,
    muzzle: kind === 'pig' ? '#fbc2cf' : accent,
    inner: kind === 'rabbit' || kind === 'monkey' ? accent : null,
    eye: '#2b2b2b',
    limb: fur,
  }
}

/** 一批同色的形状：圆角矩形（圆也是）与三角形，按颜色并成一条路径填（颜色按先来后到的顺序） */
class Batch {
  private readonly rects = new Map<string, number[]>()
  private readonly tris = new Map<string, number[]>()

  round(color: string, x: number, y: number, w: number, h: number, rad: number): void {
    let list = this.rects.get(color)
    if (!list) {
      list = []
      this.rects.set(color, list)
      if (!this.tris.has(color)) this.tris.set(color, [])
    }
    list.push(x, y, w, h, Math.min(rad, w / 2, h / 2))
  }

  circle(color: string, x: number, y: number, r: number): void {
    this.round(color, x - r, y - r, r * 2, r * 2, r)
  }

  tri(color: string, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): void {
    let list = this.tris.get(color)
    if (!list) {
      list = []
      this.tris.set(color, list)
      if (!this.rects.has(color)) this.rects.set(color, [])
    }
    list.push(ax, ay, bx, by, cx, cy)
  }

  /** 按颜色填；stroke 给了就改成描边（线宽 lw） */
  flush(ctx: CanvasRenderingContext2D, stroke?: { lw: number }): void {
    for (const [color, rs] of this.rects) {
      const ts = this.tris.get(color) ?? []
      if (!rs.length && !ts.length) continue
      ctx.beginPath()
      for (let i = 0; i < rs.length; i += 5) ctx.roundRect(rs[i]!, rs[i + 1]!, rs[i + 2]!, rs[i + 3]!, rs[i + 4]!)
      for (let i = 0; i < ts.length; i += 6) {
        ctx.moveTo(ts[i]!, ts[i + 1]!)
        ctx.lineTo(ts[i + 2]!, ts[i + 3]!)
        ctx.lineTo(ts[i + 4]!, ts[i + 5]!)
        ctx.closePath()
      }
      if (stroke) {
        ctx.strokeStyle = color
        ctx.lineWidth = stroke.lw
        ctx.stroke()
      } else {
        ctx.fillStyle = color
        ctx.fill()
      }
    }
  }
}

/**
 * 一张小动物的正脸（画在 (x, y)，头的半径 R）：耳朵、头、口鼻、眼睛分到各自那一批里。
 * outline 给了就把头的轮廓也加进去（先描一圈深色、再填毛色，只露出外面半圈）
 */
function face(
  kind: BoxerKind,
  x: number,
  y: number,
  R: number,
  happy: number,
  b: { outline: Batch; fur: Batch; accent: Batch; patch: Batch; eyes: Batch },
): void {
  const c = paletteOf(kind)
  b.outline.circle(INK, x, y, R)
  // 耳朵（在头后面）
  if (kind === 'rabbit') {
    for (const sd of [-1, 1]) {
      b.fur.round(c.ear, x + sd * 0.37 * R - 0.22 * R, y - 2.02 * R, 0.44 * R, 1.36 * R, 0.22 * R)
      b.accent.round(c.inner!, x + sd * 0.37 * R - 0.1 * R, y - 1.8 * R, 0.2 * R, 0.9 * R, 0.1 * R)
    }
  } else if (kind === 'cat' || kind === 'pig') {
    for (const sd of [-1, 1]) b.fur.tri(c.ear, x + sd * 0.3 * R, y - 0.8 * R, x + sd * 0.85 * R, y - 1.42 * R, x + sd * 0.95 * R, y - 0.45 * R)
  } else if (kind === 'monkey') {
    for (const sd of [-1, 1]) {
      b.fur.circle(c.ear, x + sd * 1.02 * R, y + 0.05 * R, 0.32 * R)
      b.accent.circle(c.inner!, x + sd * 1.02 * R, y + 0.05 * R, 0.17 * R)
    }
  } else if (kind === 'robot') {
    b.fur.circle(c.ear, x, y - 1.28 * R, 0.24 * R)
  } else {
    for (const sd of [-1, 1]) b.fur.circle(c.ear, x + sd * 0.72 * R, y - 0.74 * R, 0.34 * R)
  }
  b.fur.circle(c.fur, x, y, R)
  if (kind === 'panda') {
    for (const sd of [-1, 1]) b.patch.round('#2b2b2b', x + sd * 0.32 * R - 0.25 * R, y - 0.42 * R, 0.5 * R, 0.62 * R, 0.25 * R)
  } else if (c.muzzle) {
    const robot = kind === 'robot'
    const w = robot ? 1.3 : kind === 'pig' ? 0.78 : 0.94
    const h = robot ? 0.85 : kind === 'pig' ? 0.52 : 0.66
    b.accent.round(c.muzzle, x - (w / 2) * R, y + (robot ? -0.45 : 0.08) * R, w * R, h * R, (robot ? 0.2 : h / 2) * R)
  }
  // 眼睛（笑的时候压扁成一条）与鼻头
  const eh = (happy > 0.4 ? 0.13 : 0.3) * R
  for (const sd of [-1, 1]) b.eyes.round(c.eye, x + sd * 0.32 * R - 0.15 * R, y - 0.12 * R - eh / 2, 0.3 * R, eh, 0.15 * R)
  if (kind !== 'robot') b.eyes.round(kind === 'pig' ? '#c9667e' : '#3b2a24', x - 0.15 * R, y + 0.18 * R, 0.3 * R, 0.2 * R, 0.1 * R)
}

/** 座位这一刻的原点（升起 / 蹦一下都算进去）：身子从这儿往上画 */
export function seatOrigin(s: SeatFigure): { x: number; y: number } {
  return { x: s.x, y: s.y + (1 - s.rise) * SEAT.sink * s.r - s.hop }
}

/** 牌子（队色边框）的中心：在头顶上方，举高时再高一截，左右晃时跟着晃 */
export function signCenter(s: SeatFigure): { x: number; y: number } {
  const o = seatOrigin(s)
  return { x: o.x + s.shake, y: o.y - (4.75 + SEAT.lift * s.lift) * s.r }
}

/**
 * 观众席里的一排真人：每个人一团淡淡的队色光（比后面的剪影亮）、队色衣服、举过头顶的两只手、自己的小动物脸，
 * 头顶一块队色边框的牌子，牌子里是同一只小动物的脸。glow = false（降级）时不画那团光
 */
export function drawSeats(ctx: CanvasRenderingContext2D, seats: readonly SeatFigure[], glow: boolean): void {
  const shown = seats.filter((s) => s.rise > 0.01 && s.r > 0.5)
  if (!shown.length) return
  const r0 = shown[0]!.r
  if (glow) {
    const halo = new Batch()
    for (const s of shown) {
      const o = seatOrigin(s)
      halo.circle(TEAM_COLOR[s.team].main, o.x, o.y - 2.2 * s.r, 2.1 * s.r)
    }
    withAlpha(ctx, 0.22, () => halo.flush(ctx))
  }
  const frame = new Batch()
  const inner = new Batch()
  const body = new Batch()
  for (const s of shown) {
    const o = seatOrigin(s)
    const c = signCenter(s)
    const t = TEAM_COLOR[s.team]
    frame.round(t.main, c.x - 1.2 * s.r, c.y - 0.9 * s.r, 2.4 * s.r, 1.8 * s.r, 0.32 * s.r)
    inner.round(t.light, c.x - 0.98 * s.r, c.y - 0.68 * s.r, 1.96 * s.r, 1.36 * s.r, 0.2 * s.r)
    body.round(t.dark, o.x - 1.15 * s.r, o.y - 1.3 * s.r, 2.3 * s.r, 2.6 * s.r, 1.1 * s.r)
  }
  frame.flush(ctx)
  inner.flush(ctx)
  body.flush(ctx)
  // 两只手从肩膀举到牌子下沿（在头后面：头挡住里面半截，看着像举在头两边）
  ctx.lineCap = 'round'
  const limbs = new Map<string, SeatFigure[]>()
  for (const s of shown) {
    const limb = paletteOf(s.kind).limb
    const list = limbs.get(limb)
    if (list) list.push(s)
    else limbs.set(limb, [s])
  }
  const paws = new Batch()
  for (const [color, list] of limbs) {
    ctx.beginPath()
    for (const s of list) {
      const o = seatOrigin(s)
      const c = signCenter(s)
      for (const sd of [-1, 1]) {
        ctx.moveTo(o.x + sd * 0.95 * s.r, o.y - 0.95 * s.r)
        ctx.lineTo(c.x + sd * 0.8 * s.r, c.y + 0.85 * s.r)
        paws.circle(color, c.x + sd * 0.8 * s.r, c.y + 0.85 * s.r, 0.3 * s.r)
      }
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 0.36 * r0
    ctx.stroke()
  }
  const b = { outline: new Batch(), fur: new Batch(), accent: new Batch(), patch: new Batch(), eyes: new Batch() }
  for (const s of shown) {
    const o = seatOrigin(s)
    const c = signCenter(s)
    face(s.kind, o.x, o.y - 1.85 * s.r, 0.9 * s.r, s.happy, b)
    face(s.kind, c.x, c.y + 0.08 * s.r, 0.46 * s.r, 1, b)
  }
  b.outline.flush(ctx, { lw: 0.2 * r0 })
  b.fur.flush(ctx)
  paws.flush(ctx)
  b.accent.flush(ctx)
  b.patch.flush(ctx)
  b.eyes.flush(ctx)
}

/** 一个飞着的能量拳：位置、大小、往哪飞（单位向量）、拖尾（旧位置，新的在前）、外面那圈光有多亮（≤ 0.35）、合力拳是金色的 */
export interface EnergyFigure {
  x: number
  y: number
  r: number
  team: Team
  dx: number
  dy: number
  trail: readonly { x: number; y: number }[]
  halo: number
  gold: boolean
}

const GOLD = { main: '#ffd24a', dark: '#c99a1c', light: '#fff3b0' } as const

/** 拖尾：从拳头往回连着旧位置的一条越来越细的彗星尾巴（一个多边形，按颜色并成一条路径） */
function streak(ctx: CanvasRenderingContext2D, f: EnergyFigure): void {
  const pts = [{ x: f.x, y: f.y }, ...f.trail]
  const n = pts.length
  if (n < 2) return
  const left: [number, number][] = []
  const right: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const p = pts[i]!
    const q = i === 0 ? { x: f.x - f.dx, y: f.y - f.dy } : pts[i - 1]!
    const dx = i === 0 ? f.dx : q.x - p.x
    const dy = i === 0 ? f.dy : q.y - p.y
    const len = Math.hypot(dx, dy) || 1
    const w = f.r * 0.95 * (1 - i / n)
    left.push([p.x - (dy / len) * w, p.y + (dx / len) * w])
    right.push([p.x + (dy / len) * w, p.y - (dx / len) * w])
  }
  const last = pts[n - 1]!
  const prev = pts[n - 2]!
  ctx.moveTo(left[0]![0], left[0]![1])
  for (let i = 1; i < n; i++) ctx.lineTo(left[i]![0], left[i]![1])
  ctx.lineTo(last.x + (last.x - prev.x) * 0.5, last.y + (last.y - prev.y) * 0.5)
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i]![0], right[i]![1])
  ctx.closePath()
}

/**
 * 能量拳：外面一圈柔光（亮度 ≤ 35%，光敏安全）、身后一条越来越细的彗星尾巴、一只朝前打出去的队色拳套（白护腕、
 * 大拇指在上、描一圈亮边）——和台上拳手的圆拳套一眼分得出。柔光与尾巴同色的并成一条路径画
 */
export function drawEnergy(ctx: CanvasRenderingContext2D, fists: readonly EnergyFigure[]): void {
  if (!fists.length) return
  const colorsOf = (f: EnergyFigure): { main: string; dark: string; light: string } => (f.gold ? GOLD : TEAM_COLOR[f.team])
  const halo = new Batch()
  let haloA = 0
  for (const f of fists) {
    if (f.halo <= 0.01) continue
    haloA = Math.max(haloA, f.halo)
    halo.circle(colorsOf(f).light, f.x, f.y, f.r * 2)
  }
  if (haloA > 0) withAlpha(ctx, Math.min(0.35, haloA), () => halo.flush(ctx))
  const tails = fists.filter((f) => f.trail.length)
  if (tails.length) {
    withAlpha(ctx, 0.6, () => {
      for (const color of new Set(tails.map((f) => colorsOf(f).light))) {
        ctx.beginPath()
        for (const f of tails) if (colorsOf(f).light === color) streak(ctx, f)
        ctx.fillStyle = color
        ctx.fill()
      }
    })
  }
  for (const f of fists) {
    const c = colorsOf(f)
    const r = f.r
    ctx.save()
    ctx.translate(f.x, f.y)
    ctx.rotate(Math.atan2(f.dy, f.dx))
    // 往左飞的时候翻过来：大拇指还在上面
    if (f.dx < 0) ctx.scale(1, -1)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(-1.6 * r, -0.62 * r, 0.7 * r, 1.24 * r, 0.22 * r)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(-1.05 * r, -r, 2 * r, 2 * r, r)
    ctx.roundRect(-0.55 * r, -1.28 * r, 0.9 * r, 0.62 * r, 0.31 * r)
    ctx.fillStyle = c.main
    ctx.fill()
    ctx.strokeStyle = c.light
    ctx.lineWidth = Math.max(1, r * 0.22)
    ctx.stroke()
    ctx.restore()
  }
}

/**
 * 命中处 / 减少动画时 Boss 身上的一团光（只在这一小块，亮度 ≤ 35%）；ring 给了就再描一圈这个颜色的环
 * （减少动画时那团光慢慢亮、慢慢暗，不是闪光，环让它在花花绿绿的 Boss 身上也看得出来）
 */
export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number, ring?: string): void {
  if (alpha <= 0.01 || r <= 0.5) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  withAlpha(ctx, Math.min(0.35, alpha), () => {
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  })
  if (!ring) return
  withAlpha(ctx, Math.min(0.7, alpha * 2), () => {
    ctx.strokeStyle = ring
    ctx.lineWidth = Math.max(1.5, r * 0.1)
    ctx.beginPath()
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2)
    ctx.stroke()
  })
}
