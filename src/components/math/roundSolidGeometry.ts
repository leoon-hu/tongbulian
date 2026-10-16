import type { RoundSolidSpec } from '@/types/models'

/**
 * 圆柱、圆锥立体图（RoundSolid.vue）的几何：把立体图形当成「转出来的」——一串圆环（离底面多高、半径多大）沿着一根轴摆好，
 * 相邻两个圆环之间是一段侧面（圆柱、圆锥、圆台都是这样的一段），按课本的视角（斜着往下看 16°，底面画成扁椭圆）正投影到纸上：
 * - 每段侧面朝着人的那一半涂色，左右两条轮廓线是侧面和人的视线相切的地方（圆锥的轮廓线从顶点连到底面椭圆上相切的两点）；
 * - 圆环在看得见的面旁边的那部分画实线，看不见的那半圈（底面后面的半圈、圆柱和圆锥接口后面的半圈）画虚线；
 * - 朝着人的底面整个画出来并涂浅色。
 * 立着、倒着、横放、斜放只是轴的方向不同，同一套算法。尺寸标注、字母标记按画好的位置放在图外，字不随图缩放。
 * 只在这里算坐标，画在 RoundSolid.vue。
 */

type P2 = [number, number]
type V3 = [number, number, number]
type Pose = NonNullable<RoundSolidSpec['pose']>

const RAD = Math.PI / 180
const TAU = Math.PI * 2
/** 往下看的角度：底面椭圆的扁度 sin 16° ≈ 0.28（课本的圆柱底面大约这么扁） */
const ALPHA = 16 * RAD
const SA = Math.sin(ALPHA)
const CA = Math.cos(ALPHA)
/** 从物体指向看图的人 */
const VIEW: V3 = [0, SA, CA]
const STEP = 4 * RAD
/** 最短的尺寸至少画成最长的几倍 */
const MIN_RATIO = 0.3

const dot3 = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit3 = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
/** 正投影到纸上：x 向右、y 向下 */
const project = (p: V3): P2 => [p[0], p[2] * SA - p[1] * CA]
const wrap = (t: number): number => ((t % TAU) + TAU) % TAU
/** 两个角相差多少（-π…π） */
const angleDiff = (a: number, b: number): number => {
  const d = wrap(a - b)
  return d > Math.PI ? d - TAU : d
}

/** 每种摆法的轴（从底面圆心指向另一头） */
export const POSE_AXIS: Record<Pose, V3> = {
  up: [0, 1, 0],
  down: [0, -1, 0],
  // 横放：轴在纸上是水平的（往纸里斜 18°，左端的底面才看得见；y 分量抵掉投影后的上下偏）
  side: unit3([Math.cos(18 * RAD), -Math.sin(18 * RAD) * Math.tan(16 * RAD), -Math.sin(18 * RAD)]),
  tilt: unit3([Math.sin(42 * RAD), Math.cos(42 * RAD), 0]),
  lie: unit3([0.92, -0.3, -0.24]),
}

interface Ring {
  /** 沿轴离底面多高 */
  y: number
  rho: number
  /** 斜切的顶面：高度随 cos t 变化（cut） */
  slope: number
  /** 看不见的那半圈画虚线 */
  hidden: boolean
}
interface Lathe {
  rings: Ring[]
  /** 每段侧面的颜色（rings.length - 1 个） */
  segs: string[]
  /** 两头的底面（有就给颜色） */
  bottomCap?: string
  topCap?: string
}

const ring = (y: number, rho: number, hidden = true, slope = 0): Ring => ({ y, rho, slope, hidden })

/** 画图用的比例：半径、高悬殊时把短的放大（标的数照写，图只是示意） */
export function drawDims(s: RoundSolidSpec): { r: number; h: number; h2: number } {
  const h2 = s.h2 ?? (s.shape === 'silo' || s.shape === 'hopper' ? s.h * 0.6 : 0)
  const total = s.h + h2
  const long = Math.max(2 * s.r, total)
  let r = s.r
  let h = s.h
  let k2 = h2
  if (2 * r < MIN_RATIO * long) r = (MIN_RATIO * long) / 2
  if (total < MIN_RATIO * long) {
    const f = (MIN_RATIO * long) / total
    h *= f
    k2 *= f
  }
  return { r, h, h2: k2 }
}

/** 瓶子的各部分（以瓶身半径 r、瓶身高 h 为准）：肩、颈、盖 */
export function bottleParts(r: number, h: number): { shoulder: number; neck: number; neckR: number; cap: number } {
  return { shoulder: r * 0.7, neck: h * 0.22, neckR: r * 0.38, cap: h * 0.12 }
}

function latheOf(s: RoundSolidSpec, r: number, h: number, h2: number): Lathe {
  switch (s.shape) {
    case 'cylinder':
      return { rings: [ring(0, r), ring(h, r)], segs: ['side'], bottomCap: 'cap', topCap: 'cap' }
    case 'cone':
      return { rings: [ring(0, r), ring(h, 0)], segs: ['side'], bottomCap: 'cap' }
    case 'frustum':
      return { rings: [ring(0, r), ring(h, r * 0.5)], segs: ['side'], bottomCap: 'cap', topCap: 'cap' }
    case 'cut':
      return { rings: [ring(0, r), ring(h, r, true, 0.55)], segs: ['side'], bottomCap: 'cap', topCap: 'cap' }
    case 'silo':
      return { rings: [ring(0, r), ring(h, r), ring(h + h2, 0)], segs: ['side', 'side2'], bottomCap: 'cap' }
    case 'hopper':
      return { rings: [ring(0, 0), ring(h2, r), ring(h2 + h, r)], segs: ['side2', 'side'], topCap: 'cap' }
    case 'bottle': {
      const b = bottleParts(r, h)
      const y1 = h + b.shoulder
      const y2 = y1 + b.neck
      return {
        rings: [ring(0, r, false), ring(h, r, false), ring(y1, b.neckR, false), ring(y2, b.neckR, false), ring(y2 + b.cap, b.neckR, false)],
        segs: ['glass', 'glass', 'glass', 'lid'],
        bottomCap: 'glass-cap',
        topCap: 'lid-top',
      }
    }
    case 'sphere':
      return { rings: [], segs: [] }
  }
}

interface Frame {
  a: V3
  e1: V3
  e2: V3
  c1: number
  c2: number
  ca: number
}
function frameOf(pose: Pose): Frame {
  const a = POSE_AXIS[pose]
  const w: V3 = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  const e1 = unit3(cross(w, a))
  const e2 = cross(a, e1)
  return { a, e1, e2, c1: dot3(e1, VIEW), c2: dot3(e2, VIEW), ca: dot3(a, VIEW) }
}
/** 圆环上角度 t 的点（模型坐标，底面圆心在原点） */
function ringPoint(f: Frame, rg: Ring, t: number): V3 {
  const c = Math.cos(t)
  const s = Math.sin(t)
  const y = rg.y + rg.slope * rg.rho * c
  return [
    f.a[0] * y + rg.rho * (f.e1[0] * c + f.e2[0] * s),
    f.a[1] * y + rg.rho * (f.e1[1] * c + f.e2[1] * s),
    f.a[2] * y + rg.rho * (f.e1[2] * c + f.e2[2] * s),
  ]
}
const axisPoint = (f: Frame, y: number): V3 => [f.a[0] * y, f.a[1] * y, f.a[2] * y]

/** 一段侧面朝着人的那部分：always / never，或以 phi 为中心、左右各 w 的一段角度 */
interface SegVis {
  always: boolean
  never: boolean
  phi: number
  w: number
}
function segVis(f: Frame, A: Ring, B: Ring): SegVis {
  const D = B.y - A.y
  const dr = B.rho - A.rho
  // 外法向 ∝ D·n(t) − dr·a，朝着人：D (c1 cos t + c2 sin t) > dr·ca
  const R = D * Math.hypot(f.c1, f.c2)
  const K = dr * f.ca
  const phi = Math.atan2(f.c2, f.c1)
  if (R < 1e-9) return { always: K < 0, never: K >= 0, phi, w: 0 }
  const q = K / R
  if (q >= 1) return { always: false, never: true, phi, w: 0 }
  if (q <= -1) return { always: true, never: false, phi, w: Math.PI }
  return { always: false, never: false, phi, w: Math.acos(q) }
}
const visAt = (v: SegVis, t: number): boolean => v.always || (!v.never && Math.abs(angleDiff(t, v.phi)) < v.w)

/** 一段角度上的点（从 t0 到 t1，t1 可以小于 t0 表示倒着走） */
function arcPts(f: Frame, rg: Ring, t0: number, t1: number): V3[] {
  const n = Math.max(2, Math.ceil(Math.abs(t1 - t0) / STEP) + 1)
  return Array.from({ length: n }, (_, i) => ringPoint(f, rg, t0 + ((t1 - t0) * i) / (n - 1)))
}

interface Raw {
  fills: { pts: P2[]; cls: string }[]
  hidden: P2[][]
  edges: P2[][]
  /** 每个圆环的圆心（模型坐标投影） */
  centers: P2[]
  /** 每个圆环投影后的点（一圈） */
  outlines: P2[][]
  /** 顶点（圆锥、粮仓、漏斗） */
  apex: P2 | null
  /** 看得见的底面是第几个圆环（没有就是 -1） */
  capRing: number
  /** 另一个底面 */
  otherCap: number
  /** 侧面中间朝着人的一点、高的那根轴（底面圆心 → 顶点） */
  sidePoint: P2
  frame: Frame
  lathe: Lathe
  segVis: SegVis[]
}

function rawSolid(s: RoundSolidSpec): Raw {
  const pose: Pose = s.pose ?? 'up'
  const f = frameOf(pose)
  const { r, h, h2 } = drawDims(s)
  const lathe = latheOf(s, r, h, h2)
  const fills: Raw['fills'] = []
  const hidden: P2[][] = []
  const edges: P2[][] = []
  if (s.shape === 'sphere') {
    // 球：轮廓是一个圆，赤道前半圈实线、后半圈虚线
    const eq = ring(0, r)
    const circle = Array.from({ length: 91 }, (_, i) => [r * Math.cos((i * TAU) / 90), r * Math.sin((i * TAU) / 90)] as P2)
    fills.push({ pts: circle, cls: 'side' })
    edges.push(circle)
    const v = segVis(f, ring(-1, r), ring(1, r))
    const front = arcPts(f, eq, v.phi - v.w, v.phi + v.w).map(project)
    const back = arcPts(f, eq, v.phi + v.w, v.phi - v.w + TAU).map(project)
    edges.push(front)
    hidden.push(back)
    return {
      fills,
      hidden,
      edges,
      centers: [[0, 0]],
      outlines: [circle],
      apex: null,
      capRing: -1,
      otherCap: -1,
      sidePoint: project(ringPoint(f, eq, v.phi + 0.5)).map((x) => x * 0.6) as P2,
      frame: f,
      lathe,
      segVis: [],
    }
  }
  const rings = lathe.rings
  const n = rings.length
  const vis = lathe.segs.map((_, i) => segVis(f, rings[i]!, rings[i + 1]!))
  const topNormal: V3 = [f.a[0] - rings[n - 1]!.slope * f.e1[0], f.a[1] - rings[n - 1]!.slope * f.e1[1], f.a[2] - rings[n - 1]!.slope * f.e1[2]]
  const bottomCapVis = !!lathe.bottomCap && rings[0]!.rho > 0 && -f.ca > 0
  const topCapVis = !!lathe.topCap && rings[n - 1]!.rho > 0 && dot3(topNormal, VIEW) > 0
  const capVis = (i: number): boolean => (i === 0 && bottomCapVis) || (i === n - 1 && topCapVis)
  const ringVis = (i: number, t: number): boolean => capVis(i) || (i > 0 && visAt(vis[i - 1]!, t)) || (i < n - 1 && visAt(vis[i]!, t))

  // 1. 涂色：每段侧面朝着人的那部分、朝着人的底面
  vis.forEach((v, i) => {
    if (v.never) return
    const A = rings[i]!
    const B = rings[i + 1]!
    const lo = v.always ? 0 : v.phi - v.w
    const hi = v.always ? TAU : v.phi + v.w
    const pts = [...arcPts(f, A, lo, hi), ...arcPts(f, B, hi, lo)].map(project)
    fills.push({ pts, cls: lathe.segs[i]! })
  })
  if (bottomCapVis) fills.push({ pts: arcPts(f, rings[0]!, 0, TAU).map(project), cls: lathe.bottomCap! })
  if (topCapVis) fills.push({ pts: arcPts(f, rings[n - 1]!, 0, TAU).map(project), cls: lathe.topCap! })

  // 2. 圆环：看得见的实线、看不见的虚线（分界在侧面的轮廓线上）
  const outlines: P2[][] = []
  rings.forEach((rg, i) => {
    if (rg.rho <= 0) {
      outlines.push([project(ringPoint(f, rg, 0))])
      return
    }
    outlines.push(arcPts(f, rg, 0, TAU).map(project))
    const cuts = new Set<number>()
    for (let k = 0; k * STEP < TAU - 1e-9; k++) cuts.add(k * STEP)
    for (const v of [vis[i - 1], vis[i]]) {
      if (!v || v.always || v.never) continue
      cuts.add(wrap(v.phi - v.w))
      cuts.add(wrap(v.phi + v.w))
    }
    const ts = [...cuts].sort((x, y) => x - y)
    ts.push(TAU)
    const runs: { vis: boolean; pts: V3[] }[] = []
    for (let j = 0; j + 1 < ts.length; j++) {
      const t0 = ts[j]!
      const t1 = ts[j + 1]!
      if (t1 - t0 < 1e-9) continue
      const v = ringVis(i, (t0 + t1) / 2)
      const last = runs[runs.length - 1]
      if (last && last.vis === v) last.pts.push(ringPoint(f, rg, t1))
      else runs.push({ vis: v, pts: [ringPoint(f, rg, t0), ringPoint(f, rg, t1)] })
    }
    if (runs.length > 1 && runs[0]!.vis === runs[runs.length - 1]!.vis) {
      const lastRun = runs.pop()!
      runs[0]!.pts = [...lastRun.pts, ...runs[0]!.pts.slice(1)]
    }
    for (const run of runs) {
      const pts = run.pts.map(project)
      if (run.vis) edges.push(pts)
      else if (rg.hidden) hidden.push(pts)
    }
  })

  // 3. 侧面的轮廓线
  vis.forEach((v, i) => {
    if (v.always || v.never) return
    for (const t of [v.phi - v.w, v.phi + v.w]) edges.push([project(ringPoint(f, rings[i]!, t)), project(ringPoint(f, rings[i + 1]!, t))])
  })

  const apexIdx = rings.findIndex((rg) => rg.rho <= 0)
  const capRing = topCapVis ? n - 1 : bottomCapVis ? 0 : -1
  const caps = [0, n - 1].filter((i) => rings[i]!.rho > 0)
  const otherCap = caps.find((i) => i !== capRing) ?? -1
  // 侧面上朝着人、稍偏一点的一点：第一段侧面的中间（圆锥取靠底面的 40%）。往左偏还是往右偏：立着、倒着、斜放的取左边那一点，
  // 横放、横倒的取下面那一点——侧面的字母就放在左边 / 下面，不和右边 / 上面的高挤在一起
  const v0 = vis[0]!
  const A0 = rings[0]!
  const B0 = rings[1]!
  const along = B0.rho <= 0 ? 0.35 : A0.rho <= 0 ? 0.65 : 0.5
  const sideAt = (t: number): P2 => {
    const pa = ringPoint(f, A0, t)
    const pb = ringPoint(f, B0, t)
    return project([pa[0] + (pb[0] - pa[0]) * along, pa[1] + (pb[1] - pa[1]) * along, pa[2] + (pb[2] - pa[2]) * along])
  }
  const off = Math.min(0.55, v0.w * 0.5)
  const [s1, s2] = [sideAt(v0.phi - off), sideAt(v0.phi + off)]
  const leftward = pose === 'up' || pose === 'down' || pose === 'tilt'
  const sidePoint = leftward ? (s1[0] <= s2[0] ? s1 : s2) : s1[1] >= s2[1] ? s1 : s2
  return {
    fills,
    hidden,
    edges,
    centers: rings.map((rg) => project(axisPoint(f, rg.y))),
    outlines,
    apex: apexIdx >= 0 ? project(axisPoint(f, rings[apexIdx]!.y)) : null,
    capRing,
    otherCap,
    sidePoint,
    frame: f,
    lathe,
    segVis: vis,
  }
}

/** 透明容器里的水（圆柱、瓶子）：水的侧面（朝着人的部分）和水面（整个椭圆） */
function waterOf(s: RoundSolidSpec, raw: Raw): { fills: { pts: P2[]; cls: string }[]; surface: P2[]; level: number } | null {
  if (s.water === undefined || (s.shape !== 'cylinder' && s.shape !== 'bottle')) return null
  const f = raw.frame
  const { r, h } = drawDims(s)
  const k = s.water / s.h
  const flip = s.shape === 'bottle' && (s.pose ?? 'up') === 'down'
  let rings: Ring[]
  let level: number
  if (s.shape === 'cylinder') {
    level = h * k
    rings = [ring(0, r * 0.97), ring(level, r * 0.97)]
  } else {
    const b = bottleParts(r, h)
    if (!flip) {
      level = h * k
      rings = [ring(0, r * 0.95), ring(level, r * 0.95)]
    } else {
      // 瓶口朝下：water 是上面（原来的瓶底那头）没有水的那一段；水在瓶颈、瓶肩和瓶身靠下的部分
      level = h * k
      rings = [ring(level, r * 0.95), ring(h, r * 0.95), ring(h + b.shoulder, b.neckR * 0.9), ring(h + b.shoulder + b.neck, b.neckR * 0.9)]
    }
  }
  const fills: { pts: P2[]; cls: string }[] = []
  for (let i = 0; i + 1 < rings.length; i++) {
    const v = segVis(f, rings[i]!, rings[i + 1]!)
    if (v.never) continue
    const lo = v.always ? 0 : v.phi - v.w
    const hi = v.always ? TAU : v.phi + v.w
    fills.push({ pts: [...arcPts(f, rings[i]!, lo, hi), ...arcPts(f, rings[i + 1]!, hi, lo)].map(project), cls: 'water' })
  }
  const surfRing = rings.find((rg) => Math.abs(rg.y - level) < 1e-9)!
  return { fills, surface: arcPts(f, surfRing, 0, TAU).map(project), level }
}

// ─────────────────────────────────────────────────────────────
// 换算成像素、放尺寸标注和字母标记
// ─────────────────────────────────────────────────────────────

export interface SolidText {
  x: number
  y: number
  text: string
  anchor: 'start' | 'middle' | 'end'
}
export interface SolidBadge {
  x: number
  y: number
  text: string
  /** 引线（从字母的圈边到指着的点） */
  lead: [number, number, number, number] | null
}
export interface SolidDrawing {
  width: number
  height: number
  fills: { d: string; cls: string }[]
  hidden: string[]
  edges: string[]
  /** 尺寸线（细线 + 两头的箭头） */
  dims: string[]
  /** 高的虚线（圆锥的顶点到底面圆心）、半径线 */
  axes: string[]
  radii: string[]
  dots: P2[]
  texts: SolidText[]
  badges: SolidBadge[]
  water: { fills: { d: string; cls: string }[]; surface: string } | null
}

const LABEL_FONT = 15
const BADGE_R = 11
/** 字大概多宽 */
const textW = (s: string): number => s.length * LABEL_FONT * 0.6 + 2

const r1 = (x: number): number => Math.round(x * 10) / 10
const pathOf = (pts: P2[], closed = false): string =>
  pts.map((p, i) => `${i ? 'L' : 'M'} ${r1(p[0])} ${r1(p[1])}`).join(' ') + (closed ? ' Z' : '')

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}
const boxOf = (ps: P2[]): Box => ({
  x0: Math.min(...ps.map((p) => p[0])),
  y0: Math.min(...ps.map((p) => p[1])),
  x1: Math.max(...ps.map((p) => p[0])),
  y1: Math.max(...ps.map((p) => p[1])),
})
const extreme = (ps: P2[], key: (p: P2) => number): P2 => ps.reduce((best, p) => (key(p) > key(best) ? p : best), ps[0]!)

/** 一个图在模型单位下的外框（定比例用） */
export function modelBox(s: RoundSolidSpec): { w: number; h: number } {
  const raw = rawSolid(s)
  const b = boxOf([...raw.outlines.flat(), ...(raw.apex ? [raw.apex] : [])])
  return { w: b.x1 - b.x0, h: b.y1 - b.y0 }
}

/** 按像素比例 k 画一个（坐标还没平移，最后统一挪到从 0 开始） */
function drawOne(s: RoundSolidSpec, k: number): SolidDrawing {
  const raw = rawSolid(s)
  const px = (p: P2): P2 => [p[0] * k, p[1] * k]
  const fills = raw.fills.map((fl) => ({ pts: fl.pts.map(px), cls: fl.cls }))
  const hidden = raw.hidden.map((ps) => ps.map(px))
  const edges = raw.edges.map((ps) => ps.map(px))
  const outlines = raw.outlines.map((ps) => ps.map(px))
  const centers = raw.centers.map(px)
  const apex = raw.apex ? px(raw.apex) : null
  const water = waterOf(s, raw)
  const waterPx = water ? { fills: water.fills.map((fl) => ({ pts: fl.pts.map(px), cls: fl.cls })), surface: water.surface.map(px) } : null
  const fig = boxOf([...outlines.flat(), ...(apex ? [apex] : [])])
  const pose = s.pose ?? 'up'
  const vertical = pose === 'up' || pose === 'down'
  const dims: string[] = []
  const axes: string[] = []
  const radii: string[] = []
  const dots: P2[] = []
  const texts: SolidText[] = []
  const badges: SolidBadge[] = []
  const lab = s.labels ?? {}
  const n = outlines.length
  const capRing = raw.capRing >= 0 ? raw.capRing : 0
  const cap = outlines[capRing] ?? []
  const capC = centers[capRing] ?? [0, 0]

  // 高：立着的画在右边，横放的画在上面（圆锥、粮仓量到顶点，粮仓 / 漏斗分成圆柱和圆锥两段）
  let hDim: { line: string; mid: P2; side: 'right' | 'top' } | null = null
  const wantH = lab.h !== undefined || (s.marks ?? []).some((m) => m.at === 'h' && s.shape !== 'cone')
  if (wantH && s.shape !== 'sphere' && (vertical || pose === 'side')) {
    let i0 = 0
    let i1 = n - 1
    if (s.shape === 'silo') i1 = 1
    if (s.shape === 'hopper') i0 = 1
    const endOf = (i: number): P2 => {
      const c = centers[i]!
      if (raw.lathe.rings[i]!.rho <= 0) return c
      return vertical ? [extreme(outlines[i]!, (p) => p[0])[0], c[1]] : [c[0], extreme(outlines[i]!, (p) => -p[1])[1]]
    }
    if (vertical) {
      const x = fig.x1 + 12
      const a = endOf(i0)
      const b = endOf(i1)
      hDim = { line: dimLine(a, b, x, 'v'), mid: [x, (a[1] + b[1]) / 2], side: 'right' }
    } else {
      const y = fig.y0 - 12
      const a = endOf(i0)
      const b = endOf(i1)
      hDim = { line: dimLine(a, b, y, 'h'), mid: [(a[0] + b[0]) / 2, y], side: 'top' }
    }
    dims.push(hDim.line)
    if (lab.h !== undefined) texts.push(hDim.side === 'right' ? { x: hDim.mid[0] + 7, y: hDim.mid[1] + 5, text: lab.h, anchor: 'start' } : { x: hDim.mid[0], y: hDim.mid[1] - 6, text: lab.h, anchor: 'middle' })
  }
  // 粮仓 / 漏斗的圆锥部分的高
  if (lab.h2 !== undefined && vertical && (s.shape === 'silo' || s.shape === 'hopper')) {
    const x = fig.x1 + 12
    const i0 = s.shape === 'silo' ? 1 : 0
    const i1 = s.shape === 'silo' ? 2 : 1
    const a: P2 = raw.lathe.rings[i0]!.rho > 0 ? [extreme(outlines[i0]!, (p) => p[0])[0], centers[i0]![1]] : centers[i0]!
    const b: P2 = raw.lathe.rings[i1]!.rho > 0 ? [extreme(outlines[i1]!, (p) => p[0])[0], centers[i1]![1]] : centers[i1]!
    dims.push(dimLine(a, b, x, 'v'))
    texts.push({ x: x + 7, y: (a[1] + b[1]) / 2 + 5, text: lab.h2, anchor: 'start' })
  }
  // 直径：立着的画在底面的上面（或下面），横放的画在左边
  if (lab.d !== undefined && s.shape !== 'sphere') {
    if (vertical) {
      const atBottom = s.dAt === 'bottom'
      const ringIdx = atBottom ? (pose === 'down' ? n - 1 : 0) : pose === 'down' ? 0 : n - 1
      const useIdx = raw.lathe.rings[ringIdx]!.rho > 0 ? ringIdx : capRing
      const o = outlines[useIdx]!
      const L = extreme(o, (p) => -p[0])
      const R = extreme(o, (p) => p[0])
      const c = centers[useIdx]!
      const y = atBottom ? fig.y1 + 12 : fig.y0 - 12
      dims.push(dimLine([L[0], c[1]], [R[0], c[1]], y, 'h'))
      texts.push({ x: (L[0] + R[0]) / 2, y: atBottom ? y + 17 : y - 6, text: lab.d, anchor: 'middle' })
    } else if (pose === 'side') {
      const o = outlines[0]!
      const T = extreme(o, (p) => -p[1])
      const B = extreme(o, (p) => p[1])
      const x = fig.x0 - 12
      dims.push(dimLine([centers[0]![0], T[1]], [centers[0]![0], B[1]], x, 'v'))
      texts.push({ x: x - 7, y: (T[1] + B[1]) / 2 + 5, text: lab.d, anchor: 'end' })
    }
  }
  // 半径：从底面圆心画到边（立着的画到最右边那一点，横放的画到最上面那一点）
  if (lab.r !== undefined && s.shape !== 'sphere') {
    const E = vertical || pose === 'tilt' ? extreme(cap, (p) => p[0]) : extreme(cap, (p) => -p[1])
    radii.push(`M ${r1(capC[0])} ${r1(capC[1])} L ${r1(E[0])} ${r1(E[1])}`)
    dots.push(capC)
    const mid: P2 = [(capC[0] + E[0]) / 2, (capC[1] + E[1]) / 2]
    texts.push(vertical || pose === 'tilt' ? { x: mid[0], y: mid[1] - 5, text: lab.r, anchor: 'middle' } : { x: mid[0] - 6, y: mid[1] + 5, text: lab.r, anchor: 'end' })
  }
  // 水的高度（透明容器、瓶子）：立着的画在左边，瓶子倒过来画在右边
  if (lab.water !== undefined && water && waterPx) {
    const flip = (s.pose ?? 'up') === 'down'
    const o0 = outlines[0]!
    const base: P2 = flip ? [extreme(o0, (p) => p[0])[0], centers[0]![1]] : [extreme(o0, (p) => -p[0])[0], centers[0]![1]]
    const surf = waterPx.surface
    const top: P2 = flip ? [extreme(surf, (p) => p[0])[0], (Math.min(...surf.map((p) => p[1])) + Math.max(...surf.map((p) => p[1]))) / 2] : [extreme(surf, (p) => -p[0])[0], (Math.min(...surf.map((p) => p[1])) + Math.max(...surf.map((p) => p[1]))) / 2]
    const x = flip ? fig.x1 + 12 : fig.x0 - 12
    dims.push(dimLine(base, top, x, 'v'))
    texts.push(flip ? { x: x + 7, y: (base[1] + top[1]) / 2 + 5, text: lab.water, anchor: 'start' } : { x: x - 7, y: (base[1] + top[1]) / 2 + 5, text: lab.water, anchor: 'end' })
  }

  // 字母标记：沿着「图的中心 → 指着的点」往外，出了图再放字母，引线连回去
  const marks = s.marks ?? []
  const figC: P2 = [(fig.x0 + fig.x1) / 2, (fig.y0 + fig.y1) / 2]
  const taken: P2[] = texts.map((t) => [t.x, t.y - 5] as P2)
  for (const m of marks) {
    let target: P2
    let dir: P2 | null = null
    if (m.at === 'base') target = raw.capRing >= 0 ? capC : centers[0]!
    else if (m.at === 'base2') {
      const i = raw.otherCap >= 0 ? raw.otherCap : 0
      const v = raw.segVis[i === 0 ? 0 : raw.segVis.length - 1]!
      const rg = raw.lathe.rings[i]!
      target = px(project(ringPoint(raw.frame, rg, v.phi)))
      // 指向底面前沿里面一点
      target = [target[0] + (centers[i]![0] - target[0]) * 0.35, target[1] + (centers[i]![1] - target[1]) * 0.35]
    } else if (m.at === 'side') target = px(raw.sidePoint)
    else if (m.at === 'apex') target = apex ?? centers[n - 1]!
    else {
      // 高：圆柱是右边的尺寸线（上面已经画了），圆锥是顶点到底面圆心的虚线
      if (s.shape === 'cone' && apex) {
        const c = centers[0]!
        axes.push(`M ${r1(c[0])} ${r1(c[1])} L ${r1(apex[0])} ${r1(apex[1])}`)
        dots.push(c)
        target = [(c[0] + apex[0]) / 2, (c[1] + apex[1]) / 2]
        // 横倒的圆锥：字母放在轴的上方（侧面的字母在下方）
        const ax: P2 = [apex[0] - c[0], apex[1] - c[1]]
        const al = Math.hypot(ax[0], ax[1]) || 1
        dir = vertical ? [1, 0] : ax[0] / al >= 0 ? [ax[1] / al, -ax[0] / al] : [-ax[1] / al, ax[0] / al]
      } else if (hDim) {
        const pos: P2 = hDim.side === 'right' ? [hDim.mid[0] + BADGE_R + 5, hDim.mid[1]] : [hDim.mid[0], hDim.mid[1] - BADGE_R - 5]
        badges.push({ x: pos[0], y: pos[1], text: m.text, lead: null })
        taken.push(pos)
        continue
      } else {
        // 斜放的圆柱：沿轴画一根平行的尺寸线
        const c0 = centers[0]!
        const c1 = centers[n - 1]!
        const ax: P2 = [c1[0] - c0[0], c1[1] - c0[1]]
        const len = Math.hypot(ax[0], ax[1]) || 1
        const nrm: P2 = [ax[1] / len, -ax[0] / len]
        const side: P2 = nrm[0] > 0 ? nrm : [-nrm[0], -nrm[1]]
        // 离开轴的距离：半径再多 12 像素
        const off = Math.max(...outlines[0]!.map((p) => (p[0] - c0[0]) * side[0] + (p[1] - c0[1]) * side[1])) + 12
        const a: P2 = [c0[0] + side[0] * off, c0[1] + side[1] * off]
        const b: P2 = [c1[0] + side[0] * off, c1[1] + side[1] * off]
        dims.push(dimLineAny(a, b))
        const pos: P2 = [(a[0] + b[0]) / 2 + side[0] * (BADGE_R + 5), (a[1] + b[1]) / 2 + side[1] * (BADGE_R + 5)]
        badges.push({ x: pos[0], y: pos[1], text: m.text, lead: null })
        taken.push(pos)
        continue
      }
    }
    let d: P2 = dir ?? [target[0] - figC[0], target[1] - figC[1]]
    const dl = Math.hypot(d[0], d[1])
    d = dl < 1e-6 ? [-1, 0] : [d[0] / dl, d[1] / dl]
    let pos: P2 = [0, 0]
    for (let tryN = 0; tryN < 8; tryN++) {
      const ang = (tryN % 2 ? 1 : -1) * Math.ceil(tryN / 2) * 22 * RAD
      const dd: P2 = [d[0] * Math.cos(ang) - d[1] * Math.sin(ang), d[0] * Math.sin(ang) + d[1] * Math.cos(ang)]
      // 走出图的外框再留 16 像素
      let sExit = 0
      for (let sStep = 0; sStep < 400; sStep += 2) {
        const p: P2 = [target[0] + dd[0] * sStep, target[1] + dd[1] * sStep]
        if (p[0] < fig.x0 - 2 || p[0] > fig.x1 + 2 || p[1] < fig.y0 - 2 || p[1] > fig.y1 + 2) {
          sExit = sStep
          break
        }
      }
      pos = [target[0] + dd[0] * (sExit + BADGE_R + 10), target[1] + dd[1] * (sExit + BADGE_R + 10)]
      if (taken.every((q) => Math.hypot(q[0] - pos[0], q[1] - pos[1]) > 2 * BADGE_R + 6)) break
    }
    const ll = Math.hypot(pos[0] - target[0], pos[1] - target[1]) || 1
    const from: P2 = [pos[0] + ((target[0] - pos[0]) / ll) * BADGE_R, pos[1] + ((target[1] - pos[1]) / ll) * BADGE_R]
    badges.push({ x: pos[0], y: pos[1], text: m.text, lead: [from[0], from[1], target[0], target[1]] })
    dots.push(target)
    taken.push(pos)
  }
  if (marks.some((m) => m.at === 'base') && raw.capRing >= 0 && !dots.some((p) => p === capC)) dots.push(capC)

  // 收拢：所有东西的外框（字按大概的宽度算），平移到从 PAD 开始
  const PAD = 4
  const all: P2[] = [...outlines.flat(), ...(apex ? [apex] : [])]
  const pathPts = (d: string): P2[] => {
    const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
    const out: P2[] = []
    for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i]!, nums[i + 1]!])
    return out
  }
  for (const d of dims) all.push(...pathPts(d))
  for (const t of texts) {
    const w = textW(t.text)
    const x0 = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2
    all.push([x0, t.y - LABEL_FONT], [x0 + w, t.y + 3])
  }
  for (const b of badges) all.push([b.x - BADGE_R - 1, b.y - BADGE_R - 1], [b.x + BADGE_R + 1, b.y + BADGE_R + 1])
  const box = boxOf(all)
  const dx = PAD - box.x0
  const dy = PAD - box.y0
  const mv = (p: P2): P2 => [p[0] + dx, p[1] + dy]
  const shiftPath = (d: string): string => {
    let i = 0
    return d.replace(/-?\d+(\.\d+)?/g, (m) => String(r1(Number(m) + (i++ % 2 === 0 ? dx : dy))))
  }
  return {
    width: Math.ceil(box.x1 - box.x0 + 2 * PAD),
    height: Math.ceil(box.y1 - box.y0 + 2 * PAD),
    fills: fills.map((fl) => ({ d: pathOf(fl.pts.map(mv), true), cls: fl.cls })),
    hidden: hidden.map((ps) => pathOf(ps.map(mv))),
    edges: edges.map((ps) => pathOf(ps.map(mv))),
    dims: dims.map(shiftPath),
    axes: axes.map(shiftPath),
    radii: radii.map(shiftPath),
    dots: dots.map(mv),
    texts: texts.map((t) => ({ ...t, x: r1(t.x + dx), y: r1(t.y + dy) })),
    badges: badges.map((b) => ({
      x: r1(b.x + dx),
      y: r1(b.y + dy),
      text: b.text,
      lead: b.lead ? [r1(b.lead[0] + dx), r1(b.lead[1] + dy), r1(b.lead[2] + dx), r1(b.lead[3] + dy)] : null,
    })),
    water: waterPx ? { fills: waterPx.fills.map((fl) => ({ d: pathOf(fl.pts.map(mv), true), cls: fl.cls })), surface: pathOf(waterPx.surface.map(mv), true) } : null,
  }
}

/** 竖的（v：x 固定）或横的（h：y 固定）尺寸线：两端从 a、b 引出到同一条线上 */
function dimLine(a: P2, b: P2, at: number, dir: 'v' | 'h'): string {
  const A: P2 = dir === 'v' ? [at, a[1]] : [a[0], at]
  const B: P2 = dir === 'v' ? [at, b[1]] : [b[0], at]
  const ext = (p: P2, P: P2): string => {
    const len = Math.hypot(P[0] - p[0], P[1] - p[1])
    if (len < 4) return ''
    const u: P2 = [(P[0] - p[0]) / len, (P[1] - p[1]) / len]
    return `M ${r1(p[0] + u[0] * 3)} ${r1(p[1] + u[1] * 3)} L ${r1(P[0] + u[0] * 5)} ${r1(P[1] + u[1] * 5)} `
  }
  return `${ext(a, A)}${ext(b, B)}${dimLineAny(A, B)}`
}
/** 两点之间的尺寸线（两头画向外的箭头） */
function dimLineAny(A: P2, B: P2): string {
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1
  const u: P2 = [(B[0] - A[0]) / len, (B[1] - A[1]) / len]
  const nrm: P2 = [-u[1], u[0]]
  const head = (P: P2, s: number): string => {
    const w1: P2 = [P[0] + u[0] * s * 7 + nrm[0] * 3.5, P[1] + u[1] * s * 7 + nrm[1] * 3.5]
    const w2: P2 = [P[0] + u[0] * s * 7 - nrm[0] * 3.5, P[1] + u[1] * s * 7 - nrm[1] * 3.5]
    return ` M ${r1(w1[0])} ${r1(w1[1])} L ${r1(P[0])} ${r1(P[1])} L ${r1(w2[0])} ${r1(w2[1])}`
  }
  return `M ${r1(A[0])} ${r1(A[1])} L ${r1(B[0])} ${r1(B[1])}${len > 18 ? head(A, 1) + head(B, -1) : ''}`
}

/** 一个图最大多大（像素）：单个、两个并排、编号的一组（手机竖屏上题干 + 图 + 数字键盘要一屏放下；编号的一组一行放得下 4 个） */
const FIT = {
  one: { w: 210, h: 112 },
  pair: { w: 116, h: 108 },
  many: { w: 64, h: 76 },
}

/** 画一组（共用一个比例） */
export function drawSolids(items: RoundSolidSpec[]): SolidDrawing[] {
  const fit = items.length === 1 ? FIT.one : items.length === 2 ? FIT.pair : FIT.many
  const boxes = items.map(modelBox)
  const k = Math.min(...boxes.map((b) => Math.min(fit.w / Math.max(b.w, 1e-6), fit.h / Math.max(b.h, 1e-6))))
  return items.map((s) => drawOne(s, k))
}
