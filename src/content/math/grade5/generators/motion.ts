// 五上「四 图形的运动」的生成器（五年级数学 A）：轴对称、平移、旋转；五下「图形的运动（三）」（rotate.ts）也用这里的旋转题。
import type { Difficulty, GeoFig, GeoItem, GeoPt, GeoSide, LParam, LStr, MotionItem, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 图形的运动（五上四，第 39–54 页），课本印了三个小节：
// 轴对称（例 1 松树上点 A、A′ 到对称轴的距离「3格」、例 2 补全五角星、做一做 1 先数点 A、B 到虚线几格再判断（心形是、梯形不是）、
// 做一做 2 补全；练习八 1 画对称轴（只出长方形、正方形、等腰三角形这些不含糊的）、2、5、练习十 2、6* 斜的对称轴）；
// 平移（例 3「（ ）格」小房子平移 9 格、例 4 向右平移 8 格、做一做 1 小动物卡片先横后竖平移、2 小旗平移 9 格；例 5 半圆凸凹
// 平移拼成长方形求面积 6 × 4 = 24、做一做火箭 11 × 4 = 44；练习八 3 小船、4 直角梯形、6 台阶的周长、7* 涂色占几分之几）；
// 旋转（例 6（1）表盘上的指针 12→1 是 30°、（2）三角尺绕点 O 顺时针旋转 90°；做一做 道闸抬起来；例 7 画三角形 AOB 绕点 O
// 旋转 90° 后的图形；做一做 逆时针；例 8 卡片平移或旋转拼成图案；练习九 1 钟摆、2 图形 AOBC 的 ①②③、3 线段、4 长方形、
// 5 风筝；练习十 3 风车、5 两块拼成正方形；练习九 7* 旋转后和原来重合）。
// 这一节的轴对称、平移就是旧版四下「图形的运动（二）」搬过来的（题型同四年级的 motion.ts，按规矩不导入四年级的生成器，抄过来
// 换成五上课本的数和 m5.mot.* 词条；新课本说「3格」，不说「小格」）。画图题都改成「选出正确的图」或问某个点到了哪、有几格；
// 剪纸连线、熊猫卡片、七巧板设计、设计图案这些动手题不出。「车杆」的「杆」读音不定，道闸题不提这个字。
// 图都用 GeoFigure（方格纸、对称轴是红色虚线、平移 / 旋转后的图形画虚线），表盘用 dial、钟摆和风车用 MotionFigs。
// ─────────────────────────────────────────────────────────────

const SYM: QuestionType = 'symmetry'
const MOV: QuestionType = 'motion'
export const KP_SYMMETRY = 'm5s1-04-symmetry'
export const KP_TRANSLATE = 'm5s1-04-translate'
export const KP_ROTATE = 'm5s1-04-rotate'

/** 词条前缀：五上 m5.mot；五下（旧版）的旋转题用 m5.rot（照旧书说「按顺时针方向」「图形 OABC」） */
export type RPre = 'm5.mot' | 'm5.rot'

const text = (k: string, p?: Record<string, LParam>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const YES: LStr = { k: 'm5.mot.yes' }
const NO: LStr = { k: 'm5.mot.no' }

function judge(kpId: string, type: QuestionType, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], yes: boolean): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: yes ? YES : NO, distractors: [yes ? NO : YES], rng })
}
/** 选第几幅图（图下面标着 1、2、3……） */
function pickFig(kpId: string, type: QuestionType, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], count: number, answer: number): Question {
  const all = Array.from({ length: count }, (_, i) => String(i + 1))
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: String(answer + 1), distractors: all.filter((x) => x !== String(answer + 1)), rng })
}
function some<T>(rng: RNG, pool: T[], n: number): T[] {
  return rng.shuffle(pool).slice(0, n)
}

// ── 几何图的小工具（同四年级 angles.ts 的同名工具，各包自己一份）──

const r1 = (n: number): number => Math.round(n * 10) / 10
/** 对一样东西的每个点做 f（grid 只挪起点） */
function mapItem(it: GeoItem, f: (p: GeoPt) => GeoPt): GeoItem {
  if (it.t === 'grid') {
    const [x, y] = f([it.x, it.y])
    return { ...it, x, y }
  }
  const out = { ...it } as Record<string, unknown>
  for (const k of ['at', 'a', 'b'] as const) if (k in it) out[k] = f((it as unknown as Record<string, GeoPt>)[k]!)
  if ('pts' in it) out.pts = (it as { pts: GeoPt[] }).pts.map(f)
  return out as unknown as GeoItem
}
function bounds(items: GeoItem[]): { x0: number; y0: number; x1: number; y1: number } {
  const xs: number[] = []
  const ys: number[] = []
  for (const it of items) {
    if (it.t === 'grid') {
      xs.push(it.x, it.x + it.w)
      ys.push(it.y, it.y + it.h)
      continue
    }
    mapItem(it, (p) => {
      xs.push(p[0])
      ys.push(p[1])
      return p
    })
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}
/** 把一组东西挪到左上角留 m 的地方，外框就是图的大小 */
function fitFig(items: GeoItem[], m = 10): GeoFig {
  const b = bounds(items)
  const f = (p: GeoPt): GeoPt => [r1(p[0] - b.x0 + m), r1(p[1] - b.y0 + m)]
  return { w: r1(b.x1 - b.x0 + 2 * m), h: r1(b.y1 - b.y0 + 2 * m), items: items.map((it) => mapItem(it, f)) }
}
/** 题干里的一段几何图（alt 是静态页 / 读屏的说明，不能把答案写出来） */
function geoPart(figs: GeoFig[], alt: string, numbered = false): StemPart {
  return numbered ? { kind: 'geo', figs, alt, numbered: true } : { kind: 'geo', figs, alt }
}
/** 方格纸 w × h 格（每格 px 像素），items 用格子坐标（格点是整数） */
export function gridFig(w: number, h: number, items: GeoItem[], px = 22): GeoFig {
  return { w, h, px, items: [{ t: 'grid', x: 0, y: 0, w, h }, ...items] }
}
/** 红色虚线（对称轴） */
const axisLine = (a: GeoPt, b: GeoPt): GeoItem => ({ t: 'line', a, b, stroke: 'd', dash: true })
const same = (a: GeoPt, b: GeoPt): boolean => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6
const key = (p: GeoPt): string => `${p[0]},${p[1]}`
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)

/** 字母标在点的哪一边：八个方向里，离别的点（和线上的点）最远的那一边 */
const SIDES: [GeoSide, number, number][] = [
  ['n', 0, -1],
  ['ne', 1, -1],
  ['e', 1, 0],
  ['se', 1, 1],
  ['s', 0, 1],
  ['sw', -1, 1],
  ['w', -1, 0],
  ['nw', -1, -1],
]
function sideAway(p: GeoPt, others: GeoPt[], prefer: GeoSide[] = []): GeoSide {
  let best: GeoSide = 'n'
  let bestD = -Infinity
  for (const [s, dx, dy] of SIDES) {
    const l = Math.hypot(dx, dy)
    const q: GeoPt = [p[0] + (dx / l) * 0.8, p[1] + (dy / l) * 0.8]
    const dmin = Math.min(...others.filter((o) => !same(o, p)).map((o) => Math.hypot(o[0] - q[0], o[1] - q[1])), 99) + (prefer.includes(s) ? 0.15 : 0)
    if (dmin > bestD + 1e-9) {
      best = s
      bestD = dmin
    }
  }
  return best
}
/** 多边形的边上每隔 1/4 格取一个点（给 sideAway 当障碍：字母别压在线上） */
function edgeSamples(pts: GeoPt[], closed: boolean): GeoPt[] {
  const out: GeoPt[] = []
  const n = closed ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % pts.length]!
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4))
    for (let k = 0; k <= steps; k++) out.push([a[0] + ((b[0] - a[0]) * k) / steps, a[1] + ((b[1] - a[1]) * k) / steps])
  }
  return out
}
/** 凸包上的顶点（课本标 A 的都是图形最外面的尖） */
function hullKeys(pts: GeoPt[]): Set<string> {
  const ps = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: GeoPt, a: GeoPt, b: GeoPt): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: GeoPt[] = []
  const upper: GeoPt[] = []
  for (const p of ps) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop()
    lower.push(p)
  }
  for (const p of [...ps].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop()
    upper.push(p)
  }
  return new Set([...lower, ...upper].map(key))
}

// ─────────────────────────────────────────────────────────────
// 轴对称
// ─────────────────────────────────────────────────────────────

/**
 * 轴对称图形的左半边：竖的对称轴是 x = 0，从对称轴上的一点出发、沿外轮廓走到对称轴上的另一点（x ≤ 0，y 向下，单位是格）。
 * tree 例 1 的松树、star 例 2 的五角星、fan 做一做 2、heart 做一做 1 的心形、dart / vase 练习八 2、house 练习十 2，其余是同样大小的随手图形
 */
export const HALVES: Record<string, GeoPt[]> = {
  tree: [
    [0, 0],
    [-2, 2],
    [-1, 2],
    [-3, 4],
    [-1, 3],
    [-1, 6],
    [0, 6],
  ],
  star: [
    [0, 0],
    [-1, 3],
    [-4, 3],
    [-2, 5],
    [-3, 8],
    [0, 6],
  ],
  fan: [
    [0, 2],
    [-6, 0],
    [-3, 4],
    [-4, 7],
    [0, 6],
  ],
  heart: [
    [0, 1],
    [-1, 0],
    [-3, 0],
    [-4, 1],
    [-4, 3],
    [0, 7],
  ],
  dart: [
    [0, 0],
    [-2, 4],
    [0, 2],
  ],
  vase: [
    [0, 0],
    [-1, 0],
    [-1, 2],
    [-2, 4],
    [0, 2],
  ],
  house: [
    [0, 0],
    [-3, 2],
    [-2, 2],
    [-2, 5],
    [0, 5],
  ],
  arrow: [
    [0, 0],
    [-3, 3],
    [-1, 3],
    [-1, 6],
    [0, 6],
  ],
  cup: [
    [0, 0],
    [-3, 0],
    [-2, 3],
    [-1, 3],
    [-1, 5],
    [-2, 6],
    [0, 6],
  ],
  rocket: [
    [0, 0],
    [-1, 2],
    [-1, 5],
    [-2, 7],
    [0, 6],
  ],
}
const ALL_HALVES = Object.keys(HALVES)
/** 小图（一排放三幅也看得清）：半宽不超过 3 格、高不超过 6 格 */
const SMALL_HALVES = ['dart', 'vase', 'house', 'arrow', 'cup', 'rocket', 'tree']

const halfW = (h: GeoPt[]): number => Math.max(...h.map((p) => -p[0]))
const minY = (h: GeoPt[]): number => Math.min(...h.map((p) => p[1]))
const maxY = (h: GeoPt[]): number => Math.max(...h.map((p) => p[1]))
/** 整个轴对称图形：左半边走下来，再把右半边倒着走回去 */
export function fullOf(half: GeoPt[]): GeoPt[] {
  return [...half, ...half.slice(1, -1).reverse().map(([x, y]): GeoPt => [-x, y])]
}
/** 左半边上可以标 A 的点：不在对称轴上、在整个图形的凸包上 */
function outerVertices(half: GeoPt[]): number[] {
  const hull = hullKeys(fullOf(half))
  return half.map((p, i) => (p[0] < 0 && hull.has(key(p)) ? i : -1)).filter((i) => i >= 0)
}

/** 摆在方格纸上：对称轴在第 ax 条竖线（或横线，horiz），图形从第 y0 条线开始；horiz = 整个图转过来，对称轴是横的 */
interface Place {
  ax: number
  y0: number
  horiz: boolean
}
const placeAt = (pl: Place, p: GeoPt): GeoPt => (pl.horiz ? [pl.y0 + p[1], pl.ax + p[0]] : [pl.ax + p[0], pl.y0 + p[1]])
const axisOf = (pl: Place, gw: number, gh: number): GeoItem => (pl.horiz ? axisLine([0, pl.ax], [gw, pl.ax]) : axisLine([pl.ax, 0], [pl.ax, gh]))

/** 例 1：点 A（或 A′）到对称轴的距离是几格（第 1 档有一半像课本那样连着 AA′、画直角记号；第 2 档有横的对称轴） */
function genDist(kpId: string, d: Difficulty, rng: RNG): Question {
  const name = d === 1 && rng.chance(0.35) ? 'tree' : rng.pick(ALL_HALVES)
  const half = HALVES[name]!
  const hw = halfW(half)
  const horiz = d > 1 && rng.chance(0.4)
  const extra = rng.int(0, 2)
  const W = 2 * hw + 2 + extra
  const H = maxY(half) - minY(half) + 2
  const pl: Place = { ax: 1 + hw + rng.int(0, extra), y0: 1 - minY(half), horiz }
  const gw = horiz ? H : W
  const gh = horiz ? W : H
  const vi = rng.pick(outerVertices(half))
  const v = half[vi]!
  const A = placeAt(pl, v)
  const A2 = placeAt(pl, [-v[0], v[1]])
  const ask = rng.chance(0.5) ? 'A' : 'A′'
  const link = d === 1 ? rng.chance(0.5) : rng.chance(0.25)
  const full = fullOf(half).map((p) => placeAt(pl, p))
  const items: GeoItem[] = [{ t: 'poly', pts: full, stroke: 'ink' }, axisOf(pl, gw, gh)]
  const lines = edgeSamples(full, true)
  if (link) {
    const foot = placeAt(pl, [0, v[1]])
    const down: GeoPt = horiz ? [foot[0] + 1, foot[1]] : [foot[0], foot[1] + 1]
    items.push({ t: 'line', a: A, b: A2, stroke: 'd', dash: true }, { t: 'arc', at: foot, a: A2, b: down, right: true })
    lines.push(...edgeSamples([A, A2], false))
  }
  items.push({ t: 'dot', at: A, label: 'A', side: sideAway(A, lines) }, { t: 'dot', at: A2, label: 'A′', side: sideAway(A2, lines) })
  const dist = -v[0]
  return numberQuestion({
    kpId,
    type: SYM,
    difficulty: d,
    sig: `dist-${name}-${vi}-${horiz ? 'h' : 'v'}-${ask === 'A' ? 'a' : 'b'}`,
    stem: [text('m5.mot.distQ', { p: ask }), geoPart([gridFig(gw, gh, items)], '（方格纸上一个轴对称图形，红色虚线是对称轴，图上标着点 A 和它的对应点 A′）')],
    value: dist,
    rng,
    max: 12,
    min: 1,
    smart: [dist + 1, dist - 1, 2 * dist],
  })
}

/**
 * 补全时找对应点（例 2「先找到几个关键点，画出它们的对应点」）：左半边 + 对称轴 + 点 A，另一边同一行上画了 B、C、D 三个点，
 * 哪个是 A 的对应点。错的：离对称轴近一格、远一格、远两格，或者照着左半边平移过去的位置
 */
type Cand = 'ok' | 'near' | 'far' | 'far2' | 'shift'
function genPartner(kpId: string, d: Difficulty, rng: RNG): Question {
  const name = d === 1 && rng.chance(0.5) ? rng.pick(['star', 'fan']) : rng.pick(ALL_HALVES)
  const half = HALVES[name]!
  const hw = halfW(half)
  const horiz = d > 1 && rng.chance(0.4)
  const W = 2 * hw + 4
  const H = maxY(half) - minY(half) + 2
  const pl: Place = { ax: 1 + hw, y0: 1 - minY(half), horiz }
  const gw = horiz ? H : W
  const gh = horiz ? W : H
  const vi = rng.pick(outerVertices(half))
  const [x, y] = half[vi]!
  const dist = -x
  const off: Record<Cand, number> = { ok: dist, near: dist - 1, far: dist + 1, far2: dist + 2, shift: x + hw }
  const maxR = W - 1 - pl.ax
  const pool = (['near', 'far', 'far2', 'shift'] as Cand[]).filter((c) => off[c] >= 1 && off[c] <= maxR && off[c] !== dist)
  const wrongs: Cand[] = []
  for (const c of rng.shuffle(pool)) if (wrongs.length < 2 && !wrongs.some((w) => off[w] === off[c])) wrongs.push(c)
  const order = rng.shuffle<Cand>(['ok', ...wrongs])
  const names = ['B', 'C', 'D']
  const halfPts = half.map((p) => placeAt(pl, p))
  const A = placeAt(pl, [x, y])
  const items: GeoItem[] = [
    { t: 'poly', pts: halfPts, open: true, stroke: 'ink' },
    axisOf(pl, gw, gh),
    { t: 'dot', at: A, label: 'A', side: sideAway(A, edgeSamples(halfPts, false)) },
    ...order.map((c, i): GeoItem => ({ t: 'dot', at: placeAt(pl, [off[c], y]), label: names[i]!, side: horiz ? 'e' : 'n' })),
  ]
  const answer = names[order.indexOf('ok')]!
  return labelQuestion({
    kpId,
    type: SYM,
    difficulty: d,
    sig: `partner-${name}-${vi}-${horiz ? 'h' : 'v'}-${order.join('.')}`,
    stem: [text('m5.mot.partnerQ'), geoPart([gridFig(gw, gh, items)], '（方格纸上一个轴对称图形的一半，红色虚线是对称轴，图形上标着点 A，对称轴另一边同一行上有 B、C、D 三个点）')],
    correct: answer,
    distractors: names.slice(0, order.length).filter((n) => n !== answer),
    rng,
  })
}

/** 补全后是哪一幅（例 2、做一做 2、练习八 2）：左半边黑线，补上的一半蓝线；错的：照着平移过去、一个点离对称轴远了一格、上下颠倒 */
type Fill = 'ok' | 'shift' | 'off' | 'flip'
function otherHalf(half: GeoPt[], f: Fill, vi: number): GeoPt[] {
  const hw = halfW(half)
  const lo = minY(half)
  const hi = maxY(half)
  return half.map(([x, y], i): GeoPt => {
    if (f === 'shift') return [x + hw, y]
    if (f === 'flip') return [-x, lo + hi - y]
    if (f === 'off' && i === vi) return [-x + 1, y]
    return [-x, y]
  })
}
function genComplete(kpId: string, d: Difficulty, rng: RNG): Question {
  const name = rng.pick(SMALL_HALVES)
  const half = HALVES[name]!
  const hw = halfW(half)
  const vi = rng.pick(half.map((p, i) => (p[0] < 0 ? i : -1)).filter((i) => i >= 0))
  const okPts = otherHalf(half, 'ok', vi)
  const wrongPool = (['shift', 'off', 'flip'] as Fill[]).filter((f) => {
    const pts = otherHalf(half, f, vi)
    return pts.some((p, i) => !same(p, okPts[i]!)) && !(f === 'flip' && pts.every((p) => okPts.some((q) => same(p, q))))
  })
  const order = rng.shuffle<Fill>(['ok', ...some(rng, wrongPool, 2)])
  const W = 2 * hw + 2
  const H = maxY(half) - minY(half) + 2
  const pl: Place = { ax: 1 + hw, y0: 1 - minY(half), horiz: false }
  const figs = order.map((f) =>
    gridFig(
      W,
      H,
      [
        axisOf(pl, W, H),
        { t: 'poly', pts: half.map((p) => placeAt(pl, p)), open: true, stroke: 'ink' },
        { t: 'poly', pts: otherHalf(half, f, vi).map((p) => placeAt(pl, p)), open: true, stroke: 'b' },
      ],
      16,
    ),
  )
  return pickFig(
    kpId,
    SYM,
    d,
    rng,
    `complete-${name}-${vi}-${order.join('.')}`,
    [text('m5.mot.completeQ'), geoPart(figs, '（三幅方格纸，红色虚线是对称轴，左边是同样的半个图形，右边用蓝线补了另一半）', true)],
    order.length,
    order.indexOf('ok'),
  )
}

/**
 * 练习八 1「画出对称轴」改成「有几条对称轴」：照课本画在方格纸上；课本那个三角形（底 4 高 4）、六边形（不是正六边形）
 * 看着像等边三角形、正六边形，条数不好说，不出，三角形画成一眼看得出是等腰的（底 4 高 5）
 */
type AxShape = 'rect' | 'square' | 'iso' | 'kite' | 'trap'
const AXES: Record<AxShape, number> = { rect: 2, square: 4, iso: 1, kite: 1, trap: 1 }
const AX_NAME: Record<AxShape, string> = { rect: '长方形', square: '正方形', iso: '等腰三角形', kite: '风筝形状的四边形', trap: '等腰梯形' }
const AX_GRID: Record<AxShape, { w: number; h: number; pts: GeoPt[] }> = {
  rect: {
    w: 8,
    h: 6,
    pts: [
      [1, 1],
      [7, 1],
      [7, 5],
      [1, 5],
    ],
  },
  square: {
    w: 6,
    h: 6,
    pts: [
      [1, 1],
      [5, 1],
      [5, 5],
      [1, 5],
    ],
  },
  iso: {
    w: 6,
    h: 7,
    pts: [
      [1, 6],
      [5, 6],
      [3, 1],
    ],
  },
  kite: {
    w: 6,
    h: 8,
    pts: [
      [3, 1],
      [5, 3],
      [3, 7],
      [1, 3],
    ],
  },
  trap: {
    w: 9,
    h: 5,
    pts: [
      [3, 1],
      [6, 1],
      [8, 4],
      [1, 4],
    ],
  },
}
function genAxes(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.pick<AxShape>(d === 1 ? ['rect', 'square', 'iso'] : ['rect', 'square', 'iso', 'kite', 'trap'])
  const g = AX_GRID[s]
  const n = AXES[s]
  return numberQuestion({
    kpId,
    type: SYM,
    difficulty: d,
    sig: `axes-${s}`,
    stem: [text('m5.mot.axesQ'), geoPart([gridFig(g.w, g.h, [{ t: 'poly', pts: g.pts, stroke: 'b', fill: 'b' }], 20)], `（方格纸上一个${AX_NAME[s]}）`)],
    value: n,
    rng,
    max: 8,
    min: 1,
    smart: [n === 4 ? 2 : n + 1, n - 1, n * 2],
  })
}

/** 第 2、3 档：红色虚线是不是这个图形的对称轴（长方形的对角线不是、正方形的对角线是……） */
const IS_AXIS: { key: string; shape: AxShape | 'para'; line: [GeoPt, GeoPt]; yes: boolean }[] = [
  { key: 'rect-mid', shape: 'rect', line: [[4, 0], [4, 6]], yes: true },
  { key: 'rect-midh', shape: 'rect', line: [[0, 3], [8, 3]], yes: true },
  { key: 'rect-diag', shape: 'rect', line: [[0, 1 / 3], [8, 17 / 3]], yes: false },
  { key: 'square-diag', shape: 'square', line: [[0, 0], [6, 6]], yes: true },
  { key: 'square-mid', shape: 'square', line: [[3, 0], [3, 6]], yes: true },
  { key: 'iso-height', shape: 'iso', line: [[3, 0], [3, 7]], yes: true },
  { key: 'iso-side', shape: 'iso', line: [[1, 0], [1, 7]], yes: false },
  { key: 'kite-v', shape: 'kite', line: [[3, 0], [3, 8]], yes: true },
  { key: 'kite-h', shape: 'kite', line: [[0, 3], [6, 3]], yes: false },
  { key: 'trap-v', shape: 'trap', line: [[4.5, 0], [4.5, 5]], yes: true },
  { key: 'trap-h', shape: 'trap', line: [[0, 2.5], [9, 2.5]], yes: false },
  { key: 'para-mid', shape: 'para', line: [[4, 0], [4, 5]], yes: false },
]
const PARA: { w: number; h: number; pts: GeoPt[] } = {
  w: 8,
  h: 5,
  pts: [
    [3, 1],
    [7, 1],
    [5, 4],
    [1, 4],
  ],
}
function genIsAxis(kpId: string, d: Difficulty, rng: RNG): Question {
  const c = rng.pick(IS_AXIS)
  const g = c.shape === 'para' ? PARA : AX_GRID[c.shape]
  const items: GeoItem[] = [{ t: 'poly', pts: g.pts, stroke: 'b', fill: 'b' }, axisLine(c.line[0], c.line[1])]
  return judge(kpId, SYM, d, rng, `isaxis-${c.key}`, [text('m5.mot.isAxisQ'), geoPart([gridFig(g.w, g.h, items, 20)], '（方格纸上一个图形，上面画着一条红色虚线）')], c.yes)
}

/** 第 1 档：点 A 到对称轴有 n 格，对应点 A′ 有几格（n 不取 2：「2 格」挨着读容易念成「二格」） */
function genOtherDist(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([1, 3, 4, 5, 6])
  return numberQuestion({ kpId, type: SYM, difficulty: d, sig: `odist-${n}`, stem: [text('m5.mot.otherDistQ', { n })], value: n, rng, max: 12, min: 1, smart: [n + 1, n - 1, 2 * n] })
}

/** 例 1「你还发现了轴对称图形的哪些特征」、整理和复习「对应点连线与对称轴垂直，对应点到对称轴的距离相等」改成判断 */
const SYM_JUDGE: [string, boolean][] = [
  ['m5.mot.j.sameDist', true],
  ['m5.mot.j.perp', true],
  ['m5.mot.j.diffDist', false],
  ['m5.mot.j.fold', true],
]
function genSymJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(SYM_JUDGE)
  return judge(kpId, SYM, d, rng, `j-${k}`, [text(k)], yes)
}

/**
 * 做一做 1「先填空，再判断图形是否是轴对称图形」：方格纸上一个图形和一条红色虚线，标着点 A、B；
 * 问点 A（B）到虚线几格，或问这条虚线是不是对称轴。课本的心形（3 格、3 格，是）和梯形（4 格、5 格，不是），
 * 随手的：轴对称图形（是），或把右边的一个尖往外挪一格（不是）
 */
interface DashFig {
  name: string
  pts: GeoPt[]
  ax: number
  A: GeoPt
  B: GeoPt
  W: number
  H: number
}
const DASH_BOOK: DashFig[] = [
  {
    name: 'heart',
    pts: [
      [1, 2],
      [2, 1],
      [4, 1],
      [5, 2],
      [6, 1],
      [8, 1],
      [9, 2],
      [9, 4],
      [5, 8],
      [1, 4],
    ],
    ax: 5,
    A: [2, 1],
    B: [8, 1],
    W: 10,
    H: 9,
  },
  {
    name: 'trap',
    pts: [
      [2, 1],
      [11, 1],
      [8, 7],
      [4, 7],
    ],
    ax: 6,
    A: [2, 1],
    B: [11, 1],
    W: 14,
    H: 9,
  },
]
function randomDash(rng: RNG, symmetric: boolean): DashFig {
  const name = rng.pick(ALL_HALVES)
  const half = HALVES[name]!
  const hw = halfW(half)
  const pl: Place = { ax: 1 + hw, y0: 1 - minY(half), horiz: false }
  const vi = rng.pick(outerVertices(half))
  const v = half[vi]!
  const full = fullOf(half)
  // 右边和 A 对应的那个尖（不对称时往外挪一格）
  const j = full.findIndex((p) => same(p, [-v[0], v[1]]))
  const moved = full.map((p, i): GeoPt => (i === j && !symmetric ? [p[0] + 1, p[1]] : p))
  return {
    name: `${name}${vi}${symmetric ? 'y' : 'n'}`,
    pts: moved.map((p) => placeAt(pl, p)),
    ax: pl.ax,
    A: placeAt(pl, v),
    B: placeAt(pl, moved[j]!),
    W: 2 * hw + 2 + (symmetric ? 0 : 1),
    H: maxY(half) - minY(half) + 2,
  }
}
function dashFig(f: DashFig): GeoFig {
  const lines = edgeSamples(f.pts, true)
  return gridFig(
    f.W,
    f.H,
    [
      { t: 'poly', pts: f.pts, stroke: 'b' },
      axisLine([f.ax, 0], [f.ax, f.H]),
      { t: 'dot', at: f.A, label: 'A', side: sideAway(f.A, lines, ['n', 'nw']) },
      { t: 'dot', at: f.B, label: 'B', side: sideAway(f.B, lines, ['n', 'ne']) },
    ],
    f.W > 12 ? 16 : 20,
  )
}
const isSym = (f: DashFig): boolean => f.pts.every((p) => f.pts.some((q) => same(q, [2 * f.ax - p[0], p[1]])))
function genDash(kpId: string, d: Difficulty, rng: RNG, book: boolean): Question {
  const f = book ? rng.pick(DASH_BOOK) : randomDash(rng, rng.chance(0.5))
  const alt = '（方格纸上一个图形，中间一条红色虚线，图形上标着点 A 和点 B）'
  if (rng.chance(0.55)) {
    const p = rng.chance(0.5) ? 'A' : 'B'
    const at = p === 'A' ? f.A : f.B
    const value = Math.abs(at[0] - f.ax)
    return numberQuestion({ kpId, type: SYM, difficulty: d, sig: `dash-${f.name}-${p}`, stem: [text('m5.mot.dashDistQ', { p }), geoPart([dashFig(f)], alt)], value, rng, max: 12, min: 1, smart: [value + 1, value - 1] })
  }
  return judge(kpId, SYM, d, rng, `dashj-${f.name}`, [text('m5.mot.isAxisQ'), geoPart([dashFig(f)], alt)], isSym(f))
}

/** 练习十 6*：对称轴是方格纸的对角线（从左上角到右下角），找点 A 的对应点（第 3 档） */
const DIAG_HALVES: { n: number; pts: GeoPt[] }[] = [
  {
    n: 10,
    pts: [
      [1, 1],
      [2, 6],
      [5, 9],
      [9, 9],
    ],
  },
  {
    n: 10,
    pts: [
      [3, 3],
      [1, 3],
      [1, 7],
      [3, 7],
      [5, 9],
      [9, 9],
    ],
  },
  {
    n: 8,
    pts: [
      [1, 1],
      [1, 5],
      [3, 7],
      [7, 7],
    ],
  },
]
function genDiagonal(kpId: string, d: Difficulty, rng: RNG): Question {
  const hi = rng.int(0, DIAG_HALVES.length - 1)
  const h = DIAG_HALVES[hi]!
  const vi = rng.pick(h.pts.map((p, i) => (p[1] > p[0] ? i : -1)).filter((i) => i >= 0))
  const [x, y] = h.pts[vi]!
  const ok: GeoPt = [y, x]
  // 错的：当成竖的对称轴去对称（同一行）、当成横的对称轴（同一列）、差一格
  const cands: GeoPt[] = [
    [2 * y - x, y],
    [x, 2 * x - y],
    [y + 1, x],
    [y, x - 1],
  ]
  const pool = cands.filter((p) => p[0] >= 0 && p[1] >= 0 && p[0] <= h.n && p[1] <= h.n && !same(p, ok) && p[1] < p[0] + 1e-9 && !h.pts.some((q) => same(q, p)))
  const uniq = pool.filter((p, i) => pool.findIndex((q) => same(p, q)) === i)
  // 三个点互相至少隔两格（字母不挤在一起）；凑不齐再放宽
  const far2 = (a: GeoPt, b: GeoPt): boolean => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) >= 2
  const wrongs: GeoPt[] = []
  for (const p of rng.shuffle(uniq)) if (wrongs.length < 2 && far2(p, ok) && wrongs.every((w) => far2(w, p))) wrongs.push(p)
  for (const p of rng.shuffle(uniq)) if (wrongs.length < 2 && !wrongs.some((w) => same(w, p))) wrongs.push(p)
  const order = rng.shuffle([ok, ...wrongs])
  const names = ['B', 'C', 'D']
  const obstacles = [...edgeSamples(h.pts, false), ...edgeSamples([[0, 0], [h.n, h.n]], false), ...order]
  const items: GeoItem[] = [
    axisLine([0, 0], [h.n, h.n]),
    { t: 'poly', pts: h.pts, open: true, stroke: 'ink' },
    { t: 'dot', at: [x, y], label: 'A', side: sideAway([x, y], obstacles) },
    ...order.map((p, i): GeoItem => ({ t: 'dot', at: p, label: names[i]!, side: sideAway(p, obstacles, ['ne', 'n', 'e']) })),
  ]
  const answer = names[order.findIndex((p) => same(p, ok))]!
  return labelQuestion({
    kpId,
    type: SYM,
    difficulty: d,
    sig: `diag-${hi}-${vi}-${order.map(key).join('.')}`,
    stem: [text('m5.mot.partnerQ'), geoPart([gridFig(h.n, h.n, items, 20)], '（方格纸上一个轴对称图形的一半，红色虚线对称轴是从左上角到右下角的斜线，标着点 A，另一边有 B、C、D 三个点）')],
    correct: answer,
    distractors: names.slice(0, order.length).filter((n) => n !== answer),
    rng,
  })
}

defineGenerator(KP_SYMMETRY, (d, rng) => {
  const kpId = KP_SYMMETRY
  const roll = rng.next()
  if (d === 1) {
    // 例 1：到对称轴几格；例 2、做一做 2：找对应点、补全后是哪幅；做一做 1：数到虚线几格、判断；练习八 1：对称轴的条数；特点（判断）
    if (roll < 0.2) return genDist(kpId, d, rng)
    if (roll < 0.34) return genPartner(kpId, d, rng)
    if (roll < 0.48) return genComplete(kpId, d, rng)
    if (roll < 0.66) return genDash(kpId, d, rng, rng.chance(0.6))
    if (roll < 0.78) return genAxes(kpId, d, rng)
    if (roll < 0.86) return genOtherDist(kpId, d, rng)
    return genSymJudge(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.16) return genDist(kpId, d, rng)
    if (roll < 0.3) return genPartner(kpId, d, rng)
    if (roll < 0.44) return genComplete(kpId, d, rng)
    if (roll < 0.58) return genDash(kpId, d, rng, false)
    if (roll < 0.68) return genAxes(kpId, d, rng)
    if (roll < 0.9) return genIsAxis(kpId, d, rng)
    return genSymJudge(kpId, d, rng)
  }
  if (roll < 0.4) return genDiagonal(kpId, d, rng)
  if (roll < 0.7) return genIsAxis(kpId, d, rng)
  return genComplete(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 平移
// ─────────────────────────────────────────────────────────────

/** 平移用的小图形（格子坐标，左上角是原点）：例 3 的小房子、例 4 的五边形、做一做 2 的小旗、练习八 3 的小船、4 的直角梯形，和几个随手的 */
export interface MShape {
  name: string
  w: number
  h: number
  parts: { pts: GeoPt[]; open?: boolean }[]
}
export const M_SHAPES: MShape[] = [
  {
    name: 'home',
    w: 4,
    h: 5,
    parts: [
      {
        pts: [
          [2, 0],
          [4, 2],
          [4, 5],
          [0, 5],
          [0, 2],
        ],
      },
    ],
  },
  {
    name: 'gem',
    w: 3,
    h: 3,
    parts: [
      {
        pts: [
          [1, 0],
          [3, 2],
          [2, 3],
          [1, 3],
          [0, 2],
        ],
      },
    ],
  },
  {
    name: 'flag',
    w: 2,
    h: 3,
    parts: [
      {
        pts: [
          [0, 0],
          [2, 2],
          [0, 2],
        ],
      },
      {
        pts: [
          [0, 0],
          [0, 3],
        ],
        open: true,
      },
    ],
  },
  {
    name: 'boat',
    w: 3,
    h: 3,
    parts: [
      {
        pts: [
          [1, 0],
          [2, 1],
          [1, 2],
        ],
      },
      {
        pts: [
          [0, 2],
          [3, 2],
          [2, 3],
          [1, 3],
        ],
      },
    ],
  },
  {
    name: 'trap',
    w: 3,
    h: 2,
    parts: [
      {
        pts: [
          [0, 0],
          [2, 0],
          [3, 2],
          [0, 2],
        ],
      },
    ],
  },
  {
    name: 'arrow',
    w: 3,
    h: 3,
    parts: [
      {
        pts: [
          [1.5, 0],
          [3, 2],
          [2, 2],
          [2, 3],
          [1, 3],
          [1, 2],
          [0, 2],
        ],
      },
    ],
  },
  {
    name: 'ell',
    w: 2,
    h: 3,
    parts: [
      {
        pts: [
          [0, 0],
          [1, 0],
          [1, 2],
          [2, 2],
          [2, 3],
          [0, 3],
        ],
      },
    ],
  },
]
const shapeByName = (name: string): MShape => M_SHAPES.find((s) => s.name === name)!

type Dir = 'up' | 'down' | 'left' | 'right'
const DIRS: Dir[] = ['up', 'down', 'left', 'right']
const STEP: Record<Dir, GeoPt> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const dirL = (dir: Dir): LStr => ({ k: `m5.mot.dir.${dir}` })
const toL = (dir: Dir): LStr => ({ k: `m5.mot.to.${dir}` })
const moveL = (dir: Dir, n: number): LStr => ({ k: 'm5.mot.move', p: { dir: dirL(dir), n } })
const horizontal = (dir: Dir): boolean => dir === 'left' || dir === 'right'

/** 一个图形摆在 at（左上角），涂色的原图或虚线的平移后的图 */
function shapeItems(s: MShape, at: GeoPt, dashed: boolean): GeoItem[] {
  return s.parts.map((p): GeoItem => {
    const pts = p.pts.map((q): GeoPt => [q[0] + at[0], q[1] + at[1]])
    if (dashed) return { t: 'poly', pts, open: p.open, dash: true, stroke: 'a' }
    return p.open ? { t: 'poly', pts, open: true, stroke: 'a' } : { t: 'poly', pts, fill: 'a', stroke: 'a' }
  })
}

/** 一个图形平移 n 格：原图涂色、平移后的画虚线（方格纸刚好放下两个图，四周各留一格） */
interface Moved {
  s: MShape
  dir: Dir
  n: number
  fig: GeoFig
  /** 沿平移方向图形占几格（不重叠时两图中间空 n − ext 格） */
  ext: number
}
function moved(rng: RNG, d: Difficulty, book?: { s: MShape; dir: Dir; n: number }): Moved {
  const s = book?.s ?? rng.pick(M_SHAPES)
  const dir = book?.dir ?? rng.pick(DIRS)
  const ext = horizontal(dir) ? s.w : s.h
  const top = horizontal(dir) ? 9 : 6
  // 第 1 档两个图不重叠（课本例 3、做一做）；第 2 档有一半重叠，只能数对应点
  const n = book?.n ?? (d === 1 ? rng.int(ext + 1, top) : rng.chance(0.45) ? rng.int(1, ext) : rng.int(ext + 1, top + 2))
  const W = horizontal(dir) ? s.w + n + 2 : s.w + 4
  const H = horizontal(dir) ? s.h + 2 : s.h + n + 2
  const [sx, sy] = STEP[dir]
  const from: GeoPt = [dir === 'left' ? 1 + n : horizontal(dir) ? 1 : 2, dir === 'up' ? 1 + n : 1]
  const to: GeoPt = [from[0] + sx * n, from[1] + sy * n]
  return { s, dir, n, ext, fig: gridFig(W, H, [...shapeItems(s, from, false), ...shapeItems(s, to, true)], 20) }
}
const movedAlt = '（方格纸上一个涂色的图形，平移后的位置画成虚线）'

/** 例 3、做一做 2：向右（左、上、下）平移到虚线的位置，平移了几格（干扰项有「数中间空了几格」的错法）；book = 课本的小房子 / 小旗向右 9 格 */
function genHowFar(kpId: string, d: Difficulty, rng: RNG, book = false): Question {
  const m = moved(rng, d, book ? { s: shapeByName(rng.pick(['home', 'flag'])), dir: 'right', n: 9 } : undefined)
  const gap = m.n - m.ext
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `far-${m.s.name}-${m.dir}-${m.n}`,
    stem: [text('m5.mot.howFarQ', { dir: dirL(m.dir) }), geoPart([m.fig], movedAlt)],
    value: m.n,
    rng,
    max: 15,
    min: 1,
    smart: [gap > 0 ? gap : m.n + m.ext, m.n + 1, m.n - 1, m.n + m.ext],
  })
}

/** 例 3：是向哪个方向平移的 */
function genDir(kpId: string, d: Difficulty, rng: RNG): Question {
  const m = moved(rng, d)
  return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `dir-${m.s.name}-${m.dir}-${m.n}`, stem: [text('m5.mot.dirQ'), geoPart([m.fig], movedAlt)], correct: toL(m.dir), distractors: DIRS.filter((x) => x !== m.dir).map(toL), rng })
}

/** 「向（ ）平移（ ）格」：方向和格数一起选（练习八 4 的直角梯形向上、向左） */
function genMove(kpId: string, d: Difficulty, rng: RNG): Question {
  const m = moved(rng, d)
  const pool: [Dir, number][] = [
    [m.dir, m.n - m.ext],
    [OPP[m.dir], m.n],
    [m.dir, m.n + 1],
    [m.dir, m.n - 1],
  ]
  const wrong = pool.filter(([dir, n], i) => n >= 1 && !(dir === m.dir && n === m.n) && pool.findIndex(([d2, n2]) => d2 === dir && n2 === n) === i)
  return labelQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `move-${m.s.name}-${m.dir}-${m.n}`,
    stem: [text('m5.mot.moveQ'), geoPart([m.fig], movedAlt)],
    correct: moveL(m.dir, m.n),
    distractors: wrong.slice(0, 3).map(([dir, n]) => moveL(dir, n)),
    rng,
  })
}

/**
 * 例 4、练习八 3：把涂色的图形向右（左）平移 n 格，得到的是哪一个（三个虚线的图上标着 1、2、3；有一个和原图中间正好空 n 格、
 * 一个方向反了）；book = 练习八 3 的小船向右平移 4 格
 */
function genWhich(kpId: string, d: Difficulty, rng: RNG, book = false): Question {
  const s = book ? shapeByName('boat') : rng.pick(M_SHAPES.filter((x) => x.w <= 3))
  // 只横着排（竖着排四个图太高，手机上缩得太小）；上下平移在「平移了几格」「怎样平移」里出
  const dir: Dir = book ? 'right' : rng.pick<Dir>(d === 1 ? ['right', 'right', 'left'] : ['right', 'left'])
  const ext = s.w
  const n = book ? 4 : rng.int(ext, ext + 3)
  // 沿平移方向的位置：原图在 p0，对的在 p0 ± n，「中间空 n 格」的在 p0 ± (n + ext)，方向反了的在 p0 ∓ n
  const sign = dir === 'right' ? 1 : -1
  const len = 2 * n + 2 * ext + 2
  const p0 = sign > 0 ? n + 1 : len - n - 1 - ext
  const pos: Record<'ok' | 'gap' | 'back', number> = { ok: p0 + sign * n, gap: p0 + sign * (n + ext), back: p0 - sign * n }
  const order = rng.shuffle<'ok' | 'gap' | 'back'>(['ok', 'gap', 'back'])
  const items: GeoItem[] = [...shapeItems(s, [p0, 1], false)]
  order.forEach((c, i) => {
    items.push(...shapeItems(s, [pos[c], 1], true))
    items.push({ t: 'text', at: [pos[c] + ext / 2, 0.45], text: String(i + 1), badge: true })
  })
  return labelQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `which-${s.name}-${dir}-${n}-${order.join('.')}`,
    stem: [text('m5.mot.whichQ', { dir: dirL(dir), n }), geoPart([gridFig(len, s.h + 2, items, 16)], '（方格纸上一个涂色的图形，还有三个虚线画的同样的图形，标着 1、2、3）')],
    correct: String(order.indexOf('ok') + 1),
    distractors: ['1', '2', '3'].filter((x) => x !== String(order.indexOf('ok') + 1)),
    rng,
  })
}

// ── 利用平移求面积、周长（例 5、做一做，练习八 6、7） ──

const ARC_N = 12
/** 圆弧上的点：圆心 c、半径 r，从 a0 度转到 a1 度（0° 朝右、y 向下时 90° 朝下） */
function arc(c: GeoPt, r: number, a0: number, a1: number): GeoPt[] {
  return Array.from({ length: ARC_N + 1 }, (_, k): GeoPt => {
    const a = ((a0 + ((a1 - a0) * k) / ARC_N) * Math.PI) / 180
    return [Math.round((c[0] + r * Math.cos(a)) * 1000) / 1000, Math.round((c[1] + r * Math.sin(a)) * 1000) / 1000]
  })
}
const swap = (p: GeoPt): GeoPt => [p[1], p[0]]

/** 例 5 的图：长 L 格、高 D 格的长方形，左边凸出一个半圆（直径 D），右边凹进一个同样的半圆；vertical = 转过来（上面凸、下面凹） */
export function bumpShape(L: number, D: number, vertical: boolean): { fig: GeoFig; pts: GeoPt[] } {
  const r = D / 2
  const a = 1 + r
  const y0 = 1
  const pts: GeoPt[] = [
    // 右边凹进去的半圆：从上往下，往左凹
    ...arc([a + L, y0 + r], r, -90, -270),
    // 左边凸出去的半圆：从下往上，往左凸，停在左上角
    ...arc([a, y0 + r], r, 90, 270),
  ]
  const W = L + r + 2
  const H = D + 2
  const shape = vertical ? pts.map(swap) : pts
  const gw = vertical ? H : W
  const gh = vertical ? W : H
  const items: GeoItem[] = [{ t: 'poly', pts: shape, fill: 'd', stroke: 'ink' }, { t: 'text', at: [gw - 0.5, -0.62], text: '1 cm' }]
  return { fig: gridFig(gw, gh, items, 20), pts: shape }
}

/** 例 5：把凸出的半圆剪下来平移几格拼成长方形 / 这个图形的面积是多少平方厘米（课本 6 × 4 = 24） */
function genArea(kpId: string, d: Difficulty, rng: RNG): Question {
  const book = d === 1 && rng.chance(0.35)
  const D = book ? 4 : rng.pick(d === 1 ? [2, 4, 4] : [2, 4, 6])
  const L = book ? 6 : rng.int(Math.max(D, 3), 8)
  const vertical = !book && d > 1 && rng.chance(0.4)
  const ask = rng.pick(['shift', 'area', 'area'] as const)
  const { fig } = bumpShape(L, D, vertical)
  const alt = vertical ? '（方格纸上一个图形：上边凸出一个半圆，下边凹进一个同样的半圆，方格纸旁标着 1 cm）' : '（方格纸上一个图形：左边凸出一个半圆，右边凹进一个同样的半圆，方格纸旁标着 1 cm）'
  if (ask === 'shift')
    return numberQuestion({
      kpId,
      type: MOV,
      difficulty: d,
      sig: `bump-shift-${L}-${D}-${vertical ? 'v' : 'h'}`,
      stem: [text('m5.mot.bumpQ', { side: { k: vertical ? 'm5.mot.side.top' : 'm5.mot.side.left' }, dir: dirL(vertical ? 'down' : 'right') }), geoPart([fig], alt)],
      value: L,
      rng,
      max: 15,
      min: 1,
      smart: [L - D / 2, L + D / 2, L - 1, L + 1],
    })
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `bump-area-${L}-${D}-${vertical ? 'v' : 'h'}`,
    stem: [text('m5.mot.areaQ'), geoPart([fig], alt)],
    value: L * D,
    rng,
    max: 100,
    min: 1,
    smart: [(L + D / 2) * D, (L + D) * 2, L * D + D, L * D - D],
  })
}

/**
 * 例 5 做一做：方格纸上的「火箭」——长方形左边挖进一个三角形、右边接一个同样的三角形（尖头宽 t 格、高 W 格），
 * 尖头平移过去补上缺口就是 L × W 的长方形（课本 11 × 4 = 44）
 */
export function rocketPts(L: number, W: number, t: number): GeoPt[] {
  return [
    [1, 1],
    [1 + L, 1],
    [1 + L + t, 1 + W / 2],
    [1 + L, 1 + W],
    [1, 1 + W],
    [1 + t, 1 + W / 2],
  ]
}
function genRocket(kpId: string, d: Difficulty, rng: RNG): Question {
  const book = d === 1 && rng.chance(0.35)
  const L = book ? 11 : rng.int(7, 11)
  const W = book ? 4 : rng.pick([2, 4, 4])
  const t = book ? 2 : rng.pick(W === 2 ? [1, 2] : [1, 2, 3])
  const gw = L + t + 2
  const items: GeoItem[] = [{ t: 'poly', pts: rocketPts(L, W, t), fill: 'c', stroke: 'ink' }, { t: 'text', at: [gw - 0.5, -0.62], text: '1 cm' }]
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `rocket-${L}-${W}-${t}`,
    stem: [text('m5.mot.rocketQ'), geoPart([gridFig(gw, W + 2, items, 18)], '（方格纸上一个火箭形状的图形：左边挖进一个三角形，右边接着一个同样的三角形，方格纸旁标着 1 cm）')],
    value: L * W,
    rng,
    max: 100,
    min: 1,
    smart: [(L + t) * W, (L + W) * 2, L * W + W],
  })
}

/** 练习八 6：台阶形的周长（上面几级台阶的拐点故意不在格线上，只能把边平移成长方形）= (W + H) × 2（课本 10 × 5 → 30） */
export function stairsPts(W: number, H: number, xs: number[], ys: number[]): GeoPt[] {
  const pts: GeoPt[] = [[0, 0]]
  xs.forEach((x, i) => {
    pts.push([x, i === 0 ? 0 : ys[i - 1]!], [x, ys[i]!])
  })
  pts.push([W, ys[ys.length - 1]!], [W, H], [0, H])
  return pts.map(([x, y]): GeoPt => [x + 1, y + 1])
}
function genStairs(kpId: string, d: Difficulty, rng: RNG): Question {
  const W = rng.int(d === 1 ? 6 : 7, d === 3 ? 12 : 10)
  const H = rng.int(4, 6)
  const k = rng.int(2, 3)
  // 拐点取半格（x.5），从小到大、相邻至少差 1 格
  const pick = (max: number): number[] => {
    for (;;) {
      const vs = Array.from({ length: k }, () => rng.int(0, max - 1) + 0.5).sort((a, b) => a - b)
      if (vs.every((v, i) => i === 0 || v - vs[i - 1]! >= 1)) return vs
    }
  }
  const xs = pick(W - 1)
  const ys = pick(H - 1)
  const items: GeoItem[] = [{ t: 'poly', pts: stairsPts(W, H, xs, ys), stroke: 'ink' }, { t: 'text', at: [W + 1.5, -0.62], text: '1 cm' }]
  const p = (W + H) * 2
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `stairs-${W}-${H}`,
    stem: [text('m5.mot.stairsQ'), geoPart([gridFig(W + 2, H + 2, items, 18)], '（方格纸上一个台阶形状的图形，边都是横的或竖的，上面几级台阶的拐点不在格线上，方格纸旁标着 1 cm）')],
    value: p,
    rng,
    max: 80,
    min: 1,
    smart: [W + H, W * H, p - 2, p + 2],
  })
}

/**
 * 做一做 1：小动物卡片先横着平移、再竖着平移，吃到它喜欢的食物。第 1 档有一半是课本那块方格纸（13 × 11，六张卡片：
 * 小狗→骨头 右 9 下 4、松鼠→栗子 左 10 下 7、熊猫→竹子 左 8 上 9）
 */
const SQUIRREL = '\u{1F43F}\u{FE0F}'
const PAIRS: [string, string][] = [
  ['🐶', '🦴'],
  ['🐼', '🎋'],
  [SQUIRREL, '🌰'],
  ['🐰', '🥕'],
  ['🐱', '🐟'],
  ['🐵', '🍌'],
]
const BOARD: { e: string; at: GeoPt }[] = [
  { e: '🎋', at: [3, 0] },
  { e: SQUIRREL, at: [12, 1] },
  { e: '🐶', at: [1, 2] },
  { e: '🦴', at: [10, 6] },
  { e: '🌰', at: [2, 8] },
  { e: '🐼', at: [11, 9] },
]
function genTwoMoves(kpId: string, d: Difficulty, rng: RNG): Question {
  let a: string
  let b: string
  let p1: GeoPt
  let p2: GeoPt
  let C = 10
  let R = 8
  let cards: { e: string; at: GeoPt }[]
  const book = d === 1 && rng.chance(0.5)
  if (book) {
    ;[a, b] = rng.pick(PAIRS.slice(0, 3))
    p1 = BOARD.find((c) => c.e === a)!.at
    p2 = BOARD.find((c) => c.e === b)!.at
    C = 13
    R = 11
    cards = BOARD
  } else {
    ;[a, b] = rng.pick(PAIRS)
    let c1 = 0
    let r1 = 0
    let c2 = 0
    let r2 = 0
    do {
      c1 = rng.int(0, C - 1)
      r1 = rng.int(0, R - 1)
      c2 = rng.int(0, C - 1)
      r2 = rng.int(0, R - 1)
    } while (Math.abs(c1 - c2) < 2 || Math.abs(r1 - r2) < 2)
    p1 = [c1, r1]
    p2 = [c2, r2]
    cards = [
      { e: a, at: p1 },
      { e: b, at: p2 },
    ]
  }
  const h: Dir = p2[0] > p1[0] ? 'right' : 'left'
  const v: Dir = p2[1] > p1[1] ? 'down' : 'up'
  const dx = Math.abs(p2[0] - p1[0])
  const dy = Math.abs(p2[1] - p1[1])
  // 卡片那几格涂浅色（方格纸本身的 cells）
  const board: GeoFig = {
    w: C,
    h: R,
    px: book ? 24 : 26,
    items: [{ t: 'grid', x: 0, y: 0, w: C, h: R, cells: cards.map((c) => c.at), fill: 'soft' }, ...cards.map((c): GeoItem => ({ t: 'text', at: [c.at[0] + 0.5, c.at[1] + 0.5], text: c.e }))],
  }
  const fig = geoPart([board], book ? '（方格纸上六张卡片：竹子、松鼠、小狗、骨头、栗子、熊猫）' : `（方格纸上一格里有 ${a}，另一格里有 ${b}）`)
  const sig = `two-${book ? 'book-' : ''}${a}-${p1.join('.')}-${p2.join('.')}`
  if (rng.chance(0.5))
    return numberQuestion({ kpId, type: MOV, difficulty: d, sig: `${sig}-first`, stem: [text('m5.mot.firstQ', { a, b, dir: dirL(h), dir2: dirL(v) }), fig], value: dx, rng, max: 15, min: 1, smart: [dx - 1, dx + 1, dy] })
  const pool: [Dir, number][] = [
    [OPP[v], dy],
    [v, dy + 1],
    [v, dy - 1],
    [h, dy],
  ]
  const wrong = pool.filter(([, n]) => n >= 1)
  return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `${sig}-then`, stem: [text('m5.mot.thenQ', { a, b, dir: dirL(h), n: dx }), fig], correct: moveL(v, dy), distractors: some(rng, wrong, 3).map(([dir, n]) => moveL(dir, n)), rng })
}

/** 练习八 7*：涂色部分占整个图形的几分之几（把一块平移过去就看出来了；课本 1/3、1/2、1/3） */
type FracKind = 'strips' | 'band' | 'para'
const FRACS = ['1/2', '1/3', '1/4', '1/5', '2/3', '3/4', '2/5']
export function fracFig(kind: FracKind, k: number): { fig: GeoFig; answer: string } {
  if (kind === 'strips') {
    // 长方形平均分成 k 个正方形：左边一格涂色、挖掉一个白色半圆；最右边一格里有一个涂色的半圆
    const s = 40
    const items: GeoItem[] = [
      {
        t: 'poly',
        pts: [
          [0, 0],
          [s, 0],
          [s, s],
          [0, s],
        ],
        fill: 'd',
        stroke: 'ink',
      },
      { t: 'poly', pts: arc([s, s / 2], s / 2, -90, -270), fill: 'paper', stroke: 'ink' },
      { t: 'poly', pts: arc([k * s, s / 2], s / 2, -90, -270), fill: 'd', stroke: 'ink' },
      {
        t: 'poly',
        pts: [
          [0, 0],
          [k * s, 0],
          [k * s, s],
          [0, s],
        ],
        stroke: 'ink',
      },
      ...range(k - 1).map((j): GeoItem => ({ t: 'line', a: [(j + 1) * s, 0], b: [(j + 1) * s, s], thin: true })),
    ]
    return { fig: fitFig(items, 8), answer: `1/${k}` }
  }
  if (kind === 'band') {
    // 长方形（宽是高的 k 倍）里两条一样的四分之一圆弧，中间的弯带涂色
    const H = 60
    const pts: GeoPt[] = [...arc([H, H], H, 180, 270), ...arc([2 * H, H], H, 270, 180)]
    const items: GeoItem[] = [
      { t: 'poly', pts, fill: 'b', stroke: 'ink' },
      {
        t: 'poly',
        pts: [
          [0, 0],
          [k * H, 0],
          [k * H, H],
          [0, H],
        ],
        stroke: 'ink',
      },
    ]
    return { fig: fitFig(items, 8), answer: `1/${k}` }
  }
  // 平行四边形 = 左边一个直角三角形 + k 个正方形 + 右边一个直角三角形，两个三角形涂色
  const s = 46
  const items: GeoItem[] = [
    {
      t: 'poly',
      pts: [
        [0, s],
        [s, 0],
        [s, s],
      ],
      fill: 'c',
      stroke: 'ink',
    },
    {
      t: 'poly',
      pts: [
        [(k + 1) * s, 0],
        [(k + 2) * s, 0],
        [(k + 1) * s, s],
      ],
      fill: 'c',
      stroke: 'ink',
    },
    {
      t: 'poly',
      pts: [
        [0, s],
        [s, 0],
        [(k + 2) * s, 0],
        [(k + 1) * s, s],
      ],
      stroke: 'ink',
    },
    ...range(k - 1).map((j): GeoItem => ({ t: 'line', a: [(j + 2) * s, 0], b: [(j + 2) * s, s], thin: true })),
  ]
  return { fig: fitFig(items, 8), answer: `1/${k + 1}` }
}
function genFraction(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick<FracKind>(['strips', 'band', 'para'])
  const k = kind === 'strips' ? rng.int(3, 4) : kind === 'band' ? rng.int(2, 3) : rng.int(2, 3)
  const { fig, answer } = fracFig(kind, k)
  const alt = {
    strips: '（一个长方形平均分成几个正方形，左边一格涂了色、挖掉一个半圆，最右边一格里涂了一个同样的半圆）',
    band: '（一个长方形里两条一样的弧线，中间夹着的弯带涂了色）',
    para: '（一个平行四边形，分成左右两个三角形和中间几个正方形，两个三角形涂了色）',
  }[kind]
  return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `frac-${kind}-${k}`, stem: [text('m5.mot.fracQ'), geoPart([fig], alt)], correct: answer, distractors: some(rng, FRACS.filter((f) => f !== answer), 3), rng })
}

/** 例 3「你发现了什么」与数格子的方法（判断） */
const MOV_JUDGE: [string, boolean][] = [
  ['m5.mot.j.points', true],
  ['m5.mot.j.gap', false],
  ['m5.mot.j.same', true],
  ['m5.mot.j.dist', true],
]
function genMoveJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(MOV_JUDGE)
  return judge(kpId, MOV, d, rng, `j-${k}`, [text(k)], yes)
}

defineGenerator(KP_TRANSLATE, (d, rng) => {
  const kpId = KP_TRANSLATE
  const roll = rng.next()
  if (d === 1) {
    // 例 3、做一做 2：平移了几格（课本向右 9 格）；例 4、练习八 3：平移 n 格后是哪一个；做一做 1：小动物卡片；
    // 例 5：剪下半圆平移拼成长方形求面积；做一做：火箭；方向、怎样平移、判断、台阶的周长
    if (roll < 0.12) return genHowFar(kpId, d, rng, true)
    if (roll < 0.22) return genHowFar(kpId, d, rng)
    if (roll < 0.29) return genDir(kpId, d, rng)
    if (roll < 0.36) return genMove(kpId, d, rng)
    if (roll < 0.48) return genWhich(kpId, d, rng, rng.chance(0.35))
    if (roll < 0.62) return genArea(kpId, d, rng)
    if (roll < 0.72) return genRocket(kpId, d, rng)
    if (roll < 0.86) return genTwoMoves(kpId, d, rng)
    if (roll < 0.93) return genMoveJudge(kpId, d, rng)
    return genStairs(kpId, d, rng)
  }
  if (d === 2) {
    // 练习八 3、4、6：重叠着平移、竖着平移、怎样平移、台阶形的周长；做一做 1 换位置；例 5 换大小
    if (roll < 0.12) return genHowFar(kpId, d, rng)
    if (roll < 0.26) return genWhich(kpId, d, rng)
    if (roll < 0.38) return genMove(kpId, d, rng)
    if (roll < 0.52) return genArea(kpId, d, rng)
    if (roll < 0.66) return genStairs(kpId, d, rng)
    if (roll < 0.82) return genTwoMoves(kpId, d, rng)
    if (roll < 0.92) return genRocket(kpId, d, rng)
    return genMoveJudge(kpId, d, rng)
  }
  if (roll < 0.3) return genTwoMoves(kpId, d, rng)
  if (roll < 0.7) return genFraction(kpId, d, rng)
  return genStairs(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 旋转
// ─────────────────────────────────────────────────────────────

/** 绕点 o 旋转：cw 顺时针 90°、ccw 逆时针 90°、half 180°（屏幕坐标 y 向下） */
export type Rot = 'cw' | 'ccw' | 'half'
export function rotAbout(p: GeoPt, o: GeoPt, r: Rot): GeoPt {
  const dx = p[0] - o[0]
  const dy = p[1] - o[1]
  if (r === 'cw') return [o[0] - dy, o[1] + dx]
  if (r === 'ccw') return [o[0] + dy, o[1] - dx]
  return [o[0] - dx, o[1] - dy]
}
const CW: Rot[] = ['cw', 'ccw', 'half']
/** 顺时针 / 逆时针（选项）、「顺时针旋转 90°」这种说法（题目和选项） */
const wayL = (pre: RPre, r: 'cw' | 'ccw'): LStr => ({ k: `${pre}.way.${r}` })
export const turnL = (pre: RPre, r: Rot): LStr => ({ k: `${pre}.turn.${r}` })

/**
 * 例 6（1）表盘上的指针：从 a 走到 b，绕点 O 按顺时针方向旋转了多少度（每走一个数 30°）；课本 12→1、1→3、3→6、6→12。
 * 第 1 档转 1–6 个数（30°–180°），以后可以更多
 */
export const DIAL_BOOK: [number, number][] = [
  [12, 1],
  [1, 3],
  [3, 6],
  [6, 12],
]
const dialNext = (a: number, k: number): number => ((a - 1 + k) % 12) + 1
export function genDial(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  let a: number
  let b: number
  if (d === 1 && rng.chance(0.4)) [a, b] = rng.pick(DIAL_BOOK)
  else {
    a = rng.int(1, 12)
    b = dialNext(a, rng.int(1, d === 1 ? 6 : 9))
  }
  const k = (b - a + 12) % 12
  const value = 30 * k
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `dial-${a}-${b}`,
    stem: [text(`${pre}.dialQ`, { a, b }), { kind: 'dial', from: a, to: b }],
    value,
    rng,
    max: 360,
    min: 30,
    // 常见错：少数 / 多数一格、当成逆时针转过来的；都是 30 的倍数（别出 31° 这种选项）
    smart: [value - 30, value + 30, 360 - value, value + 60, value + 90],
  })
}
/** 例 6（1）「从 3 走到（ ），旋转了 90°」：从 a 开始顺时针旋转 deg°，指针指着几 */
export function genDialTo(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const a = d === 1 && rng.chance(0.3) ? 3 : rng.int(1, 12)
  const k = d === 1 && a === 3 ? 3 : rng.int(1, d === 1 ? 6 : 9)
  const b = dialNext(a, k)
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `dialto-${a}-${k}`,
    stem: [text(`${pre}.dialToQ`, { a, deg: 30 * k }), { kind: 'dial', to: a }],
    value: b,
    rng,
    max: 12,
    min: 1,
    smart: [dialNext(a, k + 1), dialNext(a, 12 - k), dialNext(a, k - 1)],
  })
}

/**
 * 做一做（道闸）：两根横着的道闸，一根抬起来（或放下去）——实线是原来的位置、虚线是转到的位置，是按什么方向旋转的、
 * 旋转了多少度。左边那根抬起来是顺时针、右边那根抬起来是逆时针（放下去反过来）。题目不提「杆」（读音不定）
 */
function gateFig(side: 'left' | 'right', raise: boolean): GeoFig {
  const arm = (s: 'left' | 'right', up: boolean): GeoPt[] => {
    const o = s === 'left' ? -8 : 8
    if (up) return [
      [o - 3, 0],
      [o - 3, -66],
      [o + 3, -66],
      [o + 3, 0],
    ]
    const far = s === 'left' ? -74 : 74
    return [
      [o, -3],
      [far, -3],
      [far, 3],
      [o, 3],
    ]
  }
  const post = (x0: number): GeoItem => ({
    t: 'poly',
    pts: [
      [x0, -6],
      [x0 + 11, -6],
      [x0 + 11, 22],
      [x0, 22],
    ],
    fill: 'soft',
    stroke: 'ink',
  })
  const other: 'left' | 'right' = side === 'left' ? 'right' : 'left'
  // 实线：原来的位置（抬起来之前是横着的，放下去之前是竖着的）；虚线：转到的位置
  const items: GeoItem[] = [
    post(-13),
    post(2),
    { t: 'poly', pts: arm(other, false), fill: 'a', stroke: 'ink' },
    { t: 'poly', pts: arm(side, !raise), fill: 'a', stroke: 'ink' },
    { t: 'poly', pts: arm(side, raise), stroke: 'ink', dash: true },
    { t: 'dot', at: [-8, 0] },
    { t: 'dot', at: [8, 0] },
  ]
  return fitFig(items, 8)
}
export function genGate(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const side = rng.pick(['left', 'right'] as const)
  const raise = d === 1 ? rng.chance(0.75) : rng.chance(0.5)
  // 左边的抬起来：从朝左转到朝上，顺时针；右边的抬起来：从朝右转到朝上，逆时针
  const way: 'cw' | 'ccw' = (side === 'left') === raise ? 'cw' : 'ccw'
  const alt = `（停车场的两根道闸，${side === 'left' ? '左边' : '右边'}那根${raise ? '原来横着（实线），虚线是它抬起来竖着的位置' : '原来竖着（实线），虚线是它放下来横着的位置'}）`
  const fig = geoPart([gateFig(side, raise)], alt)
  if (rng.chance(0.75))
    return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `gate-${side}-${raise ? 'up' : 'down'}`, stem: [text(`${pre}.gateQ`), fig], correct: wayL(pre, way), distractors: [wayL(pre, way === 'cw' ? 'ccw' : 'cw')], rng })
  return numberQuestion({ kpId, type: MOV, difficulty: d, sig: `gatedeg-${side}-${raise ? 'up' : 'down'}`, stem: [text(`${pre}.gateDegQ`), fig], value: 90, rng, max: 360, min: 30, smart: [180, 45, 60] })
}

/**
 * 例 6（2）三角尺：直角顶点 O，两条直角边朝着两个方向（课本朝上、朝右）；绕点 O 按顺 / 逆时针方向旋转 90°，
 * 原来朝某个方向的直角边转到了哪个方向。图上标 O，不画转的方向（题目里写着）
 */
type Compass = 'up' | 'right' | 'down' | 'left'
const COMPASS: Compass[] = ['up', 'right', 'down', 'left']
const VEC: Record<Compass, GeoPt> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }
const turnCompass = (c: Compass, r: Rot): Compass => COMPASS[(COMPASS.indexOf(c) + (r === 'cw' ? 1 : r === 'ccw' ? 3 : 2)) % 4]!
const toDirL = (pre: RPre, c: Compass): LStr => ({ k: `${pre}.to.${c}` })
export function genSetSquare(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const k = d === 1 && rng.chance(0.4) ? 0 : rng.int(0, 3)
  const legs: [Compass, Compass] = [COMPASS[k]!, COMPASS[(k + 1) % 4]!]
  const r: 'cw' | 'ccw' = d === 1 && rng.chance(0.5) ? 'cw' : rng.pick(['cw', 'ccw'] as const)
  const ask = rng.pick(legs)
  const L = 5
  const o: GeoPt = [0, 0]
  const tip = (c: Compass): GeoPt => [VEC[c][0] * L, VEC[c][1] * L]
  const items: GeoItem[] = [
    { t: 'poly', pts: [o, tip(legs[0]), tip(legs[1])], fill: 'b', stroke: 'ink', right: [0] },
    { t: 'dot', at: o, label: 'O', side: sideAway(o, [...edgeSamples([o, tip(legs[0])], false), ...edgeSamples([o, tip(legs[1])], false)]) },
  ]
  const fig = gridFig(12, 12, items.map((it) => mapItem(it, (p) => [p[0] + 6, p[1] + 6])), 14)
  const want = turnCompass(ask, r)
  return labelQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `setsq-${k}-${r}-${ask}`,
    stem: [text(`${pre}.setSquareQ`, { way: wayL(pre, r), from: toDirL(pre, ask) }), geoPart([fig], '（方格纸上一块三角尺，直角的顶点是 O，两条直角边朝着两个方向）')],
    correct: toDirL(pre, want),
    distractors: COMPASS.filter((c) => c !== want && c !== ask).map((c) => toDirL(pre, c)),
    rng,
  })
}

/**
 * 例 7（新书）/ 例 3（旧书）：方格纸上的三角形 AOB（直角在 O），绕点 O 旋转后的图形是哪个（三幅图：对的、转反了方向的、
 * 转了 180° 的或绕错了点的）；点 A 转到了哪个位置（同一幅图上画三个点，标 1、2、3）；转过去以后点 A′ 到点 O 有几格
 */
export interface TriCase {
  id: string
  A: GeoPt
  O: GeoPt
  B: GeoPt
}
/** 新书例 7：O(5,5)、A 在左边 3 格、B 在上面 4 格；旧书例 3：O(5,6)、A 在上面 4 格、B 在右边 3 格 */
export const TRI_NEW: TriCase = { id: 'e7', A: [2, 5], O: [5, 5], B: [5, 1] }
export const TRI_OLD: TriCase = { id: 'e3o', A: [5, 2], O: [5, 6], B: [8, 6] }
/** 随手的直角三角形：两条直角边 2–4 格，朝着相邻的两个方向 */
export function randomTri(rng: RNG): TriCase {
  const k = rng.int(0, 3)
  const a = rng.int(2, 4)
  const b = rng.int(2, 4)
  const ca = COMPASS[k]!
  const cb = COMPASS[(k + 1) % 4]!
  const swapAB = rng.chance(0.5)
  const O: GeoPt = [0, 0]
  const A: GeoPt = [VEC[ca][0] * a, VEC[ca][1] * a]
  const B: GeoPt = [VEC[cb][0] * b, VEC[cb][1] * b]
  return { id: `t${k}${a}${b}${swapAB ? 's' : ''}`, A: swapAB ? B : A, O, B: swapAB ? A : B }
}
/** 一组点挪到方格纸里（四周留 m 格），返回挪的量和方格纸大小 */
function frame(pts: GeoPt[], m = 1): { dx: number; dy: number; w: number; h: number } {
  const x0 = Math.min(...pts.map((p) => p[0]))
  const y0 = Math.min(...pts.map((p) => p[1]))
  const x1 = Math.max(...pts.map((p) => p[0]))
  const y1 = Math.max(...pts.map((p) => p[1]))
  return { dx: m - x0, dy: m - y0, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m }
}
const shiftPt = (p: GeoPt, f: { dx: number; dy: number }): GeoPt => [p[0] + f.dx, p[1] + f.dy]

type TriWrong = Rot | 'atA' | 'atB'
function triResult(t: TriCase, r: Rot, wrong: TriWrong | 'ok'): GeoPt[] {
  const tri = [t.A, t.O, t.B]
  if (wrong === 'ok') return tri.map((p) => rotAbout(p, t.O, r))
  if (wrong === 'atA') return tri.map((p) => rotAbout(p, t.A, r))
  if (wrong === 'atB') return tri.map((p) => rotAbout(p, t.B, r))
  return tri.map((p) => rotAbout(p, t.O, wrong))
}
const ptsKey = (pts: GeoPt[]): string =>
  pts
    .map(key)
    .sort()
    .join(' ')
export function genTriFigs(pre: RPre, kpId: string, d: Difficulty, rng: RNG, t: TriCase, r: Rot): Question | null {
  const okPts = triResult(t, r, 'ok')
  const pool: TriWrong[] = [...CW.filter((x) => x !== r), 'atA', 'atB']
  const wrongs: TriWrong[] = []
  const seen = new Set([ptsKey(okPts), ptsKey([t.A, t.O, t.B])])
  // 先放方向反了的（课本做一做就是逆时针）
  const first: TriWrong = r === 'cw' ? 'ccw' : r === 'ccw' ? 'cw' : 'cw'
  for (const w of [first, ...rng.shuffle(pool.filter((x) => x !== first))]) {
    const k = ptsKey(triResult(t, r, w))
    if (seen.has(k)) continue
    seen.add(k)
    wrongs.push(w)
    if (wrongs.length === 2) break
  }
  if (wrongs.length < 2) return null
  const order = rng.shuffle<TriWrong | 'ok'>(['ok', ...wrongs])
  const all = [t.A, t.O, t.B, ...order.flatMap((w) => triResult(t, r, w))]
  const f = frame(all)
  const figs = order.map((w) => {
    const tri = [t.A, t.O, t.B].map((p) => shiftPt(p, f))
    const res = triResult(t, r, w).map((p) => shiftPt(p, f))
    const obstacles = [...edgeSamples(tri, true), ...edgeSamples(res, true)]
    // 原来的三角形标 A、O、B（O 是黑点），转过去的不标
    return gridFig(
      f.w,
      f.h,
      [
        { t: 'poly', pts: tri, fill: 'b', stroke: 'ink' },
        { t: 'poly', pts: res, stroke: 'd', dash: true },
        ...(['A', 'O', 'B'] as const).map((l, i): GeoItem => ({ t: 'dot', at: tri[i]!, label: l, side: sideAway(tri[i]!, obstacles) })),
      ],
      13,
    )
  })
  return pickFig(
    kpId,
    MOV,
    d,
    rng,
    `trifig-${t.id}-${r}-${order.join('.')}`,
    [text(`${pre}.triFigQ`, { turn: turnL(pre, r) }), geoPart(figs, '（三幅方格纸，都画着同一个三角形 AOB（涂色），红色虚线画的是它绕点 O 旋转以后的样子）', true)],
    order.length,
    order.indexOf('ok'),
  )
}
/** 点 A 转到了哪个位置：三角形 AOB（标着字母），三个候选的点标 1、2、3（对的、方向反了的、转了 180° 的） */
export function genTriPoint(pre: RPre, kpId: string, d: Difficulty, rng: RNG, t: TriCase, r: Rot): Question | null {
  const ok = rotAbout(t.A, t.O, r)
  const cands: GeoPt[] = [ok]
  for (const x of rng.shuffle(CW.filter((y) => y !== r))) {
    const p = rotAbout(t.A, t.O, x)
    if (!cands.some((c) => same(c, p))) cands.push(p)
  }
  if (cands.length < 3) return null
  const order = rng.shuffle([0, 1, 2])
  const pts = order.map((i) => cands[i]!)
  // 四周留 2 格：候选点旁边的号码牌别出了方格纸
  const f = frame([t.A, t.O, t.B, ...pts], 2)
  const tri = [t.A, t.O, t.B].map((p) => shiftPt(p, f))
  const lines = edgeSamples(tri, true)
  const items: GeoItem[] = [
    { t: 'poly', pts: tri, fill: 'b', stroke: 'ink' },
    ...(['A', 'O', 'B'] as const).map((l, i): GeoItem => ({ t: 'dot', at: tri[i]!, label: l, side: sideAway(tri[i]!, [...lines, ...pts.map((p) => shiftPt(p, f))]) })),
    ...pts.flatMap((p, i): GeoItem[] => {
      const q = shiftPt(p, f)
      // 号码牌放在点的外侧（离 O 更远的那边），别盖住点
      const dx = p[0] - t.O[0]
      const dy = p[1] - t.O[1]
      const l = Math.hypot(dx, dy) || 1
      return [
        { t: 'dot', at: q },
        { t: 'text', at: [q[0] + (dx / l) * 0.95, q[1] + (dy / l) * 0.95], text: String(i + 1), badge: true },
      ]
    }),
  ]
  const answer = pts.findIndex((p) => same(p, ok)) + 1
  return pickFig(kpId, MOV, d, rng, `tripoint-${t.id}-${r}-${order.join('')}`, [text(`${pre}.triPointQ`, { turn: turnL(pre, r) }), geoPart([gridFig(f.w, f.h, items, 18)], '（方格纸上一个三角形 AOB，还有三个标着 1、2、3 的点）')], 3, answer - 1)
}
/** 转过去以后，点 A′ 到点 O 有几格（例 7 女孩「点 A′ 与点 O 的距离还应该是 4 格」） */
export function genTriLen(pre: RPre, kpId: string, d: Difficulty, rng: RNG, t: TriCase, r: Rot): Question {
  const n = Math.abs(t.A[0] - t.O[0]) + Math.abs(t.A[1] - t.O[1])
  const f = frame([t.A, t.O, t.B])
  const tri = [t.A, t.O, t.B].map((p) => shiftPt(p, f))
  const lines = edgeSamples(tri, true)
  const items: GeoItem[] = [
    { t: 'poly', pts: tri, fill: 'b', stroke: 'ink' },
    ...(['A', 'O', 'B'] as const).map((l, i): GeoItem => ({ t: 'dot', at: tri[i]!, label: l, side: sideAway(tri[i]!, lines) })),
  ]
  const other = Math.abs(t.B[0] - t.O[0]) + Math.abs(t.B[1] - t.O[1])
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `trilen-${t.id}-${r}`,
    stem: [text(`${pre}.triLenQ`, { turn: turnL(pre, r) }), geoPart([gridFig(f.w + 1, f.h + 1, items, 20)], '（方格纸上一个三角形 AOB，直角在 O）')],
    value: n,
    rng,
    max: 12,
    min: 1,
    smart: [other, n + 1, n - 1],
  })
}

/**
 * 练习九 2（旧书练习二十一 4）：图形绕点 O 转出 ①②③ 三个——图上原来的图形（标字母）在上面，另外三个转到右边、下面、左边，
 * 标着 1、2、3（位置随机对应）；问「绕点 O 怎样旋转得到的是哪一个」或「标着 n 的是怎样旋转得到的」。
 * 也用来出旧书练习二十一 5 的小旗（没有字母）
 */
export interface FourShape {
  id: string
  /** 名字（「AOBC」「OABC」），没有就是小旗 */
  name?: string
  /** 朝上的那个：相对 O 的点（几块：多边形或线） */
  parts: { pts: GeoPt[]; open?: boolean }[]
  /** 原来那个图形的顶点字母（和 parts[0].pts 对应，空字符串不标） */
  labels?: string[]
}
/** 新书练习九 2：图形 AOBC（C 在最上面、A 左、B 右）；旧书练习二十一 4：图形 OABC（B 在最上面） */
export const KITE_NEW: FourShape = {
  id: 'kite',
  name: 'AOBC',
  parts: [
    {
      pts: [
        [-1, -3],
        [0, 0],
        [1, -3],
        [0, -4],
      ],
    },
  ],
  labels: ['A', 'O', 'B', 'C'],
}
export const KITE_OLD: FourShape = {
  id: 'kiteo',
  name: 'OABC',
  parts: [
    {
      pts: [
        [0, 0],
        [-1, -3],
        [0, -4],
        [1, -3],
      ],
    },
  ],
  labels: ['O', 'A', 'B', 'C'],
}
/** 旧书练习二十一 5 的小旗：旗杆从 O 往上 5 格，旗面在旗杆顶的左边（宽 1、高 3） */
export const FLAG_OLD: FourShape = {
  id: 'flag',
  parts: [
    {
      pts: [
        [0, 0],
        [0, -5],
      ],
      open: true,
    },
    {
      pts: [
        [-1, -5],
        [0, -5],
        [0, -2],
        [-1, -2],
      ],
    },
  ],
}
export function genFour(pre: RPre, kpId: string, d: Difficulty, rng: RNG, s: FourShape): Question {
  const order = rng.shuffle<Rot>(['cw', 'ccw', 'half'])
  const R = 7
  const o: GeoPt = [R, R]
  const at = (p: GeoPt): GeoPt => [p[0] + R, p[1] + R]
  const items: GeoItem[] = []
  const lines: GeoPt[] = []
  for (const part of s.parts) {
    const pts = part.pts.map(at)
    items.push(part.open ? { t: 'poly', pts, open: true, stroke: 'ink' } : { t: 'poly', pts, fill: 'b', stroke: 'ink' })
    lines.push(...edgeSamples(pts, !part.open))
  }
  order.forEach((r, i) => {
    for (const part of s.parts) {
      const pts = part.pts.map((p) => rotAbout(at(p), o, r))
      items.push(part.open ? { t: 'poly', pts, open: true, stroke: 'ink' } : { t: 'poly', pts, stroke: 'ink' })
      lines.push(...edgeSamples(pts, !part.open))
    }
    // 号码牌放在这个图形最外面那个尖的外侧
    const far = rotAbout(at([0, -s.parts.flatMap((p) => p.pts).reduce((m, p) => Math.max(m, -p[1]), 0)]), o, r)
    const out: GeoPt = [far[0] + Math.sign(far[0] - o[0]) * 0.8, far[1] + Math.sign(far[1] - o[1]) * 0.8]
    items.push({ t: 'text', at: out, text: String(i + 1), badge: true })
  })
  if (s.labels) {
    s.labels.forEach((l, i) => {
      const p = at(s.parts[0]!.pts[i]!)
      if (l) items.push({ t: 'dot', at: p, label: l, side: l === 'O' ? 'se' : sideAway(p, lines, ['nw', 'w']) })
    })
  } else items.push({ t: 'dot', at: o, label: 'O', side: 'se' })
  const fig = geoPart([gridFig(2 * R, 2 * R, items, 18)], s.name ? `（方格纸上图形 ${s.name} 和它绕点 O 转出来的三个图形，标着 1、2、3）` : '（方格纸上一面小旗和它绕点 O 转出来的三个，标着 1、2、3）')
  const nameP = s.name ? { name: s.name } : undefined
  if (rng.chance(0.5)) {
    // 「绕点 O 顺时针旋转 90° 得到的是哪一个」：180° 不分顺逆
    const r = rng.pick(order)
    return pickFig(kpId, MOV, d, rng, `four-${s.id}-${r}-${order.join('.')}`, [text(s.name ? `${pre}.fourQ` : `${pre}.flagQ`, { ...nameP, turn: turnL(pre, r) }), fig], 3, order.indexOf(r))
  }
  const i = rng.int(0, 2)
  const r = order[i]!
  return labelQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `fourhow-${s.id}-${i}-${order.join('.')}`,
    stem: [text(s.name ? `${pre}.fourHowQ` : `${pre}.flagHowQ`, { ...nameP, n: i + 1 }), fig],
    correct: turnL(pre, r),
    distractors: CW.filter((x) => x !== r).map((x) => turnL(pre, x)),
    rng,
  })
}

/** 练习九 3：线段 AB 绕点 A（B）顺 / 逆时针旋转 90° 后是哪一条（同一幅图上三条虚线，标 1、2、3） */
function genSegment(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const L = rng.int(2, 4)
  const horiz = rng.chance(0.6)
  const A: GeoPt = [0, 0]
  const B: GeoPt = horiz ? [L, 0] : [0, L]
  const pivot = rng.pick(['A', 'B'] as const)
  const r = rng.pick(['cw', 'ccw'] as const)
  const P = pivot === 'A' ? A : B
  const Q = pivot === 'A' ? B : A
  const ok = rotAbout(Q, P, r)
  // 错的：方向反了、绕错了另一头
  const back = rotAbout(Q, P, r === 'cw' ? 'ccw' : 'cw')
  const other = rotAbout(P, Q, r)
  const segs: [GeoPt, GeoPt][] = [
    [P, ok],
    [P, back],
    [Q, other],
  ]
  const order = rng.shuffle([0, 1, 2])
  const f = frame([A, B, ...segs.flat()])
  const sh = (p: GeoPt): GeoPt => shiftPt(p, f)
  const items: GeoItem[] = [{ t: 'line', a: sh(A), b: sh(B), stroke: 'b' }]
  order.forEach((si, i) => {
    const [a, b] = segs[si]!
    items.push({ t: 'line', a: sh(a), b: sh(b), stroke: 'd', dash: true })
    const tip = sh(b)
    const dir: GeoPt = [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])]
    items.push({ t: 'text', at: [tip[0] + dir[0] * 0.6 + (dir[0] === 0 ? 0.55 : 0), tip[1] + dir[1] * 0.6 + (dir[1] === 0 ? -0.55 : 0)], text: String(i + 1), badge: true })
  })
  items.push({ t: 'dot', at: sh(A), label: 'A', side: horiz ? 'w' : 'n' }, { t: 'dot', at: sh(B), label: 'B', side: horiz ? 'e' : 's' })
  const answer = order.indexOf(0)
  return pickFig(
    kpId,
    MOV,
    d,
    rng,
    `seg-${L}-${horiz ? 'h' : 'v'}-${pivot}-${r}-${order.join('')}`,
    [text(`${pre}.segQ`, { p: pivot, turn: turnL(pre, r) }), geoPart([gridFig(f.w + 1, f.h + 1, items, 20)], '（方格纸上一条蓝色线段 AB，还有三条标着 1、2、3 的红色虚线段）')],
    3,
    answer,
  )
}

/** 练习九 4：长方形绕一个顶点 A 旋转 90° 后是哪一个（三幅图：对的、方向反了的、转了 180° 的） */
export function genRect(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question | null {
  const w = rng.int(2, 3)
  const h = rng.int(3, 5)
  const corner = rng.int(0, 3)
  const rect: GeoPt[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ]
  const A = rect[corner]!
  const r = rng.pick(['cw', 'ccw'] as const)
  const order = rng.shuffle<Rot>([r, r === 'cw' ? 'ccw' : 'cw', 'half'])
  const results = order.map((x) => rect.map((p) => rotAbout(p, A, x)))
  const f = frame([...rect, ...results.flat()])
  const figs = results.map((res) =>
    gridFig(
      f.w,
      f.h,
      [
        { t: 'poly', pts: rect.map((p) => shiftPt(p, f)), fill: 'b', stroke: 'ink' },
        { t: 'poly', pts: res.map((p) => shiftPt(p, f)), stroke: 'd', dash: true },
        { t: 'dot', at: shiftPt(A, f), label: 'A', side: sideAway(shiftPt(A, f), [...edgeSamples(rect.map((p) => shiftPt(p, f)), true), ...edgeSamples(res.map((p) => shiftPt(p, f)), true)]) },
      ],
      12,
    ),
  )
  return pickFig(kpId, MOV, d, rng, `rect-${w}${h}-${corner}-${r}-${order.join('.')}`, [text(`${pre}.rectQ`, { turn: turnL(pre, r) }), geoPart(figs, '（三幅方格纸，都画着同一个长方形（涂色），红色虚线画的是它绕点 A 旋转以后的样子）', true)], 3, order.indexOf(r))
}

/** 练习九 1 钟摆：从虚线（竖直）摆到实线，是按什么方向旋转的（往左摆是顺时针） */
export function genPendulum(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const swing = rng.pick(['left', 'right'] as const)
  const way: 'cw' | 'ccw' = swing === 'left' ? 'cw' : 'ccw'
  const item: MotionItem = { fig: 'clock', hour: 3, swing }
  return labelQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `pend-${swing}`,
    stem: [text(`${pre}.pendQ`), { kind: 'motion-figs', items: [item], alt: '一个挂钟，钟摆从竖直的位置（虚线）摆到了另一边（实线），下面的红色箭头指着摆的方向' }],
    correct: wayL(pre, way),
    distractors: [wayL(pre, way === 'cw' ? 'ccw' : 'cw')],
    rng,
  })
}

/** 练习十 3 风车：从左图转到右图，是按什么方向旋转了 90°（叶片的颜色挪了一个位置）；转了 180° 的问转了多少度 */
export function genPinwheel(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const s0 = rng.int(0, 3) * 90
  const r: Rot = d === 1 ? rng.pick(['cw', 'ccw'] as const) : rng.pick(['cw', 'ccw', 'ccw', 'half'] as const)
  const s1 = (s0 + (r === 'cw' ? 90 : r === 'ccw' ? 270 : 180)) % 360
  const items: MotionItem[] = [
    { fig: 'pinwheel', spin: s0 },
    { fig: 'pinwheel', spin: s1 },
  ]
  const part: StemPart = { kind: 'motion-figs', items, arrows: true, alt: '两个风车，四片叶子颜色不同，左边的转到了右边的样子' }
  if (r === 'half')
    return numberQuestion({ kpId, type: MOV, difficulty: d, sig: `pin-${s0}-half`, stem: [text(`${pre}.pinDegQ`), part], value: 180, rng, max: 360, min: 30, smart: [90, 270, 360] })
  return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `pin-${s0}-${r}`, stem: [text(`${pre}.pinQ`), part], correct: wayL(pre, r), distractors: [wayL(pre, r === 'cw' ? 'ccw' : 'cw')], rng })
}

/**
 * 例 8 / 旧书例 4（简化）：一张卡片（右上角涂了一个小三角形，看得出方向）经过一次运动到了另一个位置，是平移还是旋转
 * （方向没变是平移，方向变了是旋转）
 */
export function genCard(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const turn = rng.chance(0.5) ? 0 : rng.pick([1, 2, 3])
  const corner = rng.int(0, 3)
  const card = (x0: number, y0: number, c: number): GeoItem[] => {
    const sq: GeoPt[] = [
      [x0, y0],
      [x0 + 2, y0],
      [x0 + 2, y0 + 2],
      [x0, y0 + 2],
    ]
    const p = sq[c % 4]!
    const q = sq[(c + 1) % 4]!
    const s = sq[(c + 3) % 4]!
    const mid = (a: GeoPt, b: GeoPt): GeoPt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    return [
      { t: 'poly', pts: sq, fill: 'paper', stroke: 'ink' },
      { t: 'poly', pts: [p, mid(p, q), mid(p, s)], fill: 'd', stroke: 'ink' },
    ]
  }
  const dy = rng.int(0, 2)
  const items: GeoItem[] = [...card(1, 1 + (dy === 2 ? 2 : 0), corner), ...card(6, 1 + (dy === 1 ? 2 : 0), corner + turn)]
  return labelQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `card-${corner}-${turn}-${dy}`,
    stem: [text(`${pre}.cardQ`), geoPart([gridFig(9, 6, items, 20)], '（方格纸上两张一样的卡片，一角涂着红色的三角形）')],
    correct: { k: turn === 0 ? `${pre}.translate` : `${pre}.rotate` },
    distractors: [{ k: turn === 0 ? `${pre}.rotate` : `${pre}.translate` }],
    rng,
  })
}

/** 判断（例 6（2）、例 8 回顾反思、整理和复习；旧书例 2、例 4） */
export const ROT_JUDGE: Record<RPre, [string, boolean][]> = {
  'm5.mot': [
    ['center', true],
    ['length', false],
    ['turnDir', true],
    ['moveDir', true],
    ['size', true],
    ['shape', false],
  ],
  'm5.rot': [
    ['center', true],
    ['turnDir', true],
    ['movePos', true],
    ['size', true],
    ['shape', false],
  ],
}
export function genRotJudge(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(ROT_JUDGE[pre])
  return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `j-${k}`, stem: [text(`${pre}.j.${k}`)], correct: { k: `${pre}.${yes ? 'yes' : 'no'}` }, distractors: [{ k: `${pre}.${yes ? 'no' : 'yes'}` }], rng })
}

/** 练习九 7*（旧书练习二十一 6）：图形绕中心旋转多少度能和原来重合（长方形 180° 能、90° 不能，正方形 90° 能，圆转多少都能） */
export const SELF_JUDGE: [string, boolean][] = [
  ['rect180', true],
  ['rect90', false],
  ['square90', true],
  ['circle', true],
]
export function genSelf(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(SELF_JUDGE)
  return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `self-${k}`, stem: [text(`${pre}.self.${k}`)], correct: { k: `${pre}.${yes ? 'yes' : 'no'}` }, distractors: [{ k: `${pre}.${yes ? 'no' : 'yes'}` }], rng })
}

/** 练习十 5（旧书练习二十二 1）：两块一样的图形通过平移和旋转拼成一个正方形，这个正方形有几个小方格那么大（课本三组都是 9） */
export const PIECES: { id: string; pts: GeoPt[][] }[] = [
  {
    id: 'trap',
    pts: [
      [
        [2, 0],
        [4, 0],
        [3, 3],
        [2, 3],
      ],
      [
        [1, 3],
        [2, 3],
        [2, 6],
        [0, 6],
      ],
    ],
  },
  {
    id: 'notch',
    pts: [
      [
        [0, 0],
        [2, 0],
        [2, 1],
        [1, 2],
        [1, 3],
        [0, 3],
      ],
      [
        [1, 3],
        [3, 3],
        [3, 4],
        [2, 5],
        [2, 6],
        [1, 6],
      ],
    ],
  },
  {
    id: 'tri',
    pts: [
      [
        [0, 0],
        [3, 0],
        [3, 3],
      ],
      [
        [3, 3],
        [3, 6],
        [6, 6],
      ],
    ],
  },
]
export function genPieces(pre: RPre, kpId: string, d: Difficulty, rng: RNG): Question {
  const p = rng.pick(PIECES)
  const all = p.pts.flat()
  const f = frame(all)
  const items: GeoItem[] = p.pts.map((pts): GeoItem => ({ t: 'poly', pts: pts.map((q) => shiftPt(q, f)), fill: 'b', stroke: 'ink' }))
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `pieces-${p.id}`,
    stem: [text(`${pre}.piecesQ`), geoPart([gridFig(f.w, f.h, items, 18)], '（方格纸上两块一样的图形）')],
    value: 9,
    rng,
    max: 30,
    min: 1,
    smart: [6, 12, 16],
  })
}

defineGenerator(KP_ROTATE, (d, rng) => {
  const pre: RPre = 'm5.mot'
  const kpId = KP_ROTATE
  for (let i = 0; i < 20; i++) {
    const roll = rng.next()
    let q: Question | null
    if (d === 1) {
      // 例 6（1）表盘、（2）三角尺；做一做 道闸；例 7 三角形 AOB 顺时针、做一做 逆时针（选图 / 点 A 到了哪 / A′ 到 O 几格）；
      // 例 8 与整理和复习的结论（判断）；练习九 1 钟摆、练习十 3 风车
      const r: Rot = rng.pick(['cw', 'cw', 'ccw'] as const)
      if (roll < 0.2) q = genDial(pre, kpId, d, rng)
      else if (roll < 0.27) q = genDialTo(pre, kpId, d, rng)
      else if (roll < 0.38) q = genGate(pre, kpId, d, rng)
      else if (roll < 0.49) q = genSetSquare(pre, kpId, d, rng)
      else if (roll < 0.64) q = genTriFigs(pre, kpId, d, rng, rng.chance(0.6) ? TRI_NEW : randomTri(rng), r)
      else if (roll < 0.72) q = genTriPoint(pre, kpId, d, rng, rng.chance(0.5) ? TRI_NEW : randomTri(rng), r)
      else if (roll < 0.77) q = genTriLen(pre, kpId, d, rng, TRI_NEW, r)
      else if (roll < 0.88) q = genRotJudge(pre, kpId, d, rng)
      else if (roll < 0.94) q = genPendulum(pre, kpId, d, rng)
      else q = genPinwheel(pre, kpId, d, rng)
    } else if (d === 2) {
      // 练习九 2 图形 AOBC、3 线段、4 长方形、1 钟摆；练习十 3 风车；例 8 卡片；换一个三角形
      const r: Rot = rng.pick(['cw', 'ccw', 'half'] as const)
      if (roll < 0.16) q = genFour(pre, kpId, d, rng, KITE_NEW)
      else if (roll < 0.3) q = genSegment(pre, kpId, d, rng)
      else if (roll < 0.42) q = genRect(pre, kpId, d, rng)
      else if (roll < 0.5) q = genPendulum(pre, kpId, d, rng)
      else if (roll < 0.58) q = genPinwheel(pre, kpId, d, rng)
      else if (roll < 0.68) q = genCard(pre, kpId, d, rng)
      else if (roll < 0.82) q = genTriFigs(pre, kpId, d, rng, randomTri(rng), r)
      else if (roll < 0.9) q = genTriPoint(pre, kpId, d, rng, randomTri(rng), r)
      else q = genDial(pre, kpId, d, rng)
    } else {
      // 第 3 档：练习九 7* 旋转后和原来重合；练习十 5 两块拼成正方形；三角形转 180°、长方形
      if (roll < 0.25) q = genSelf(pre, kpId, d, rng)
      else if (roll < 0.45) q = genPieces(pre, kpId, d, rng)
      else if (roll < 0.7) q = genTriFigs(pre, kpId, d, rng, randomTri(rng), rng.pick(CW))
      else if (roll < 0.85) q = genRect(pre, kpId, d, rng)
      else q = genFour(pre, kpId, d, rng, KITE_NEW)
    }
    if (q) return q
  }
  return genDial(pre, kpId, d, rng)
})
