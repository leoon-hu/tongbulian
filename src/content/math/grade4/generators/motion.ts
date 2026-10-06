// 四下「图形的运动（二）」的生成器（四年级数学下册 B）。
import type { Difficulty, GeoFig, GeoItem, GeoPt, GeoSide, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { NO, YES, fitFig, geoPart, some, text } from './angles'

// ─────────────────────────────────────────────────────────────
// 图形的运动（二）（四下七，第 79–86 页）：轴对称（例 1 方格纸上对应点到对称轴的距离「几小格」、例 2 补全轴对称图形、
// 做一做；练习二十 1 长方形 / 正方形 / 等边三角形 / 正六边形各有几条对称轴、3 画对称轴说对应点、5 补另一半、7* 斜的对称轴）、
// 平移（例 3 向上 / 下 / 左 / 右平移几格、做一做小旗；例 4 把半圆剪下来平移拼成长方形求面积、做一做火箭；
// 练习二十一 1 找平移 4 格后的小船、2 直角梯形、3 涂色部分占几分之几、4 阶梯形的周长、5 小动物平移两次吃到食物）。
// 画图题都改成「选出正确的图」；平移数的是对应点之间的格数，不是两个图形中间空了几格（练习二十一 1 的陷阱）。
// 图都用 GeoFigure 的方格纸（kind: 'geo'）：对称轴是红色虚线、平移后的图形画虚线、涂色的是原来的图形，图里只放字母、数、cm、emoji。
// 剪纸、脸谱、折纸剪图案这类动手题不出。
// ─────────────────────────────────────────────────────────────

const SYM: QuestionType = 'symmetry'
const MOV: QuestionType = 'motion'

function judge(kpId: string, type: QuestionType, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], yes: boolean): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: yes ? YES : NO, distractors: [yes ? NO : YES], rng })
}
function pickFig(kpId: string, type: QuestionType, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], count: number, answer: number): Question {
  const all = Array.from({ length: count }, (_, i) => String(i + 1))
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: String(answer + 1), distractors: all.filter((x) => x !== String(answer + 1)), rng })
}

// ── 方格纸 ──

/** 方格纸 w × h 格（每格 px 像素），items 用格子坐标（格点是整数） */
export function gridFig(w: number, h: number, items: GeoItem[], px = 22): GeoFig {
  return { w, h, px, items: [{ t: 'grid', x: 0, y: 0, w, h }, ...items] }
}
/** 红色虚线的对称轴 */
const axisLine = (a: GeoPt, b: GeoPt): GeoItem => ({ t: 'line', a, b, stroke: 'd', dash: true })
const same = (a: GeoPt, b: GeoPt): boolean => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6
const key = (p: GeoPt): string => `${p[0]},${p[1]}`

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
/** 左半边上可以标 A 的点：不在对称轴上、在整个图形的凸包上 */
function outerVertices(half: GeoPt[]): number[] {
  const hull = hullKeys(fullOf(half))
  return half.map((p, i) => (p[0] < 0 && hull.has(key(p)) ? i : -1)).filter((i) => i >= 0)
}

// ─────────────────────────────────────────────────────────────
// 轴对称（例 1、例 2、做一做，练习二十）
// ─────────────────────────────────────────────────────────────

/**
 * 轴对称图形的左半边：竖的对称轴是 x = 0，从对称轴上的一点出发、沿外轮廓走到对称轴上的另一点（x ≤ 0，y 向下，单位是格）。
 * tree 例 1 的松树、star 例 2 的五角星、kite 做一做 2、dart / vase 练习二十 5、house 练习二十一 6，其余是同样大小的随手图形。
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
  kite: [
    [0, 2],
    [-5, 0],
    [-3, 9],
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
    [0, 3],
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
  heart: [
    [0, 2],
    [-1, 0],
    [-3, 0],
    [-4, 2],
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

/** 摆在方格纸上：对称轴在第 ax 条竖线（或横线，horiz），图形从第 y0 条线开始；horiz = 整个图转过来，对称轴是横的 */
interface Place {
  ax: number
  y0: number
  horiz: boolean
}
const placeAt = (pl: Place, p: GeoPt): GeoPt => (pl.horiz ? [pl.y0 + p[1], pl.ax + p[0]] : [pl.ax + p[0], pl.y0 + p[1]])
/** 对称轴（整条，贯穿方格纸） */
const axisOf = (pl: Place, gw: number, gh: number): GeoItem => (pl.horiz ? axisLine([0, pl.ax], [gw, pl.ax]) : axisLine([pl.ax, 0], [pl.ax, gh]))

/** 例 1：点 A（或 A′）到对称轴的距离是几小格（第 1 档有一半像课本那样连着 AA′、画直角记号；第 2 档有横的对称轴） */
function genDist(kpId: string, d: Difficulty, rng: RNG): Question {
  const name = rng.pick(ALL_HALVES)
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
    stem: [text('m4.mov.distQ', { p: ask }), geoPart([gridFig(gw, gh, items)], `（方格纸上一个轴对称图形，红色虚线是对称轴，图上标着点 A 和它的对应点 A′）`)],
    value: dist,
    rng,
    max: 12,
    min: 1,
    smart: [dist + 1, dist - 1, 2 * dist],
  })
}

/**
 * 补全时找对应点（例 2「先找对应点」）：左半边 + 对称轴 + 点 A，另一边同一行上画了 B、C、D 三个点，哪个是 A 的对应点。
 * 错的：离对称轴近一格、远一格、远两格，或者照着左半边平移过去的位置（都在同一行，只能数到对称轴的格数）。
 */
type Cand = 'ok' | 'near' | 'far' | 'far2' | 'shift'
function genPartner(kpId: string, d: Difficulty, rng: RNG): Question {
  const name = rng.pick(ALL_HALVES)
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
    stem: [text('m4.mov.partnerQ'), geoPart([gridFig(gw, gh, items)], '（方格纸上一个轴对称图形的一半，红色虚线是对称轴，图形上标着点 A，对称轴另一边同一行上有 B、C、D 三个点）')],
    correct: answer,
    distractors: names.slice(0, order.length).filter((n) => n !== answer),
    rng,
  })
}

/** 补全后是哪一幅（例 2、做一做 2、练习二十 5）：左半边黑线，补上的一半蓝线；错的：照着平移过去、一个点离对称轴远了一格、上下颠倒 */
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
    [text('m4.mov.completeQ'), geoPart(figs, '（三幅方格纸，红色虚线是对称轴，左边是同样的半个图形，右边用蓝线补了另一半）', true)],
    order.length,
    order.indexOf('ok'),
  )
}

/** 练习二十 1、3：这个图形有几条对称轴（长方形 2、正方形 4、等边三角形 3、正六边形 6、筝形 1；第 2 档还有等腰三角形、等腰梯形） */
type AxShape = 'rect' | 'square' | 'equi' | 'hexagon' | 'kite' | 'iso' | 'trap'
const AXES: Record<AxShape, number> = { rect: 2, square: 4, equi: 3, hexagon: 6, kite: 1, iso: 1, trap: 1 }
/** 静态页上的说明用（课本练习二十 1 只画图不写名称） */
const AX_NAME: Record<AxShape, string> = { rect: '长方形', square: '正方形', equi: '等边三角形', hexagon: '正六边形', kite: '风筝形状的四边形', iso: '等腰三角形', trap: '等腰梯形' }
function axShapePts(s: AxShape): GeoPt[] {
  switch (s) {
    case 'rect':
      return [
        [0, 0],
        [160, 0],
        [160, 96],
        [0, 96],
      ]
    case 'square':
      return [
        [0, 0],
        [110, 0],
        [110, 110],
        [0, 110],
      ]
    case 'equi':
      // 等边：高 = 65 × √3
      return [
        [0, 112.6],
        [130, 112.6],
        [65, 0],
      ]
    case 'hexagon':
      return [0, 1, 2, 3, 4, 5].map((k): GeoPt => [70 + 70 * Math.cos((k * Math.PI) / 3), 61 + 70 * Math.sin((k * Math.PI) / 3)])
    case 'kite':
      return [
        [60, 0],
        [100, 70],
        [60, 125],
        [20, 70],
      ]
    case 'iso':
      return [
        [0, 120],
        [80, 120],
        [40, 0],
      ]
    case 'trap':
      return [
        [35, 0],
        [115, 0],
        [150, 85],
        [0, 85],
      ]
  }
}
function genAxes(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.pick<AxShape>(d === 1 ? ['rect', 'square', 'equi', 'hexagon', 'kite'] : ['rect', 'square', 'equi', 'hexagon', 'kite', 'iso', 'trap'])
  const n = AXES[s]
  return numberQuestion({
    kpId,
    type: SYM,
    difficulty: d,
    sig: `axes-${s}`,
    stem: [text('m4.mov.axesQ'), geoPart([fitFig([{ t: 'poly', pts: axShapePts(s), stroke: 'b', fill: 'b' }], 12)], `（一个${AX_NAME[s]}）`)],
    value: n,
    rng,
    max: 8,
    min: 1,
    smart: [n === 4 ? 2 : n + 1, n - 1, n * 2],
  })
}

/** 第 2、3 档：红色虚线是不是这个图形的对称轴（长方形的对角线不是、正方形的对角线是……） */
const IS_AXIS: { key: string; shape: AxShape | 'para'; line: [GeoPt, GeoPt]; yes: boolean }[] = [
  { key: 'rect-mid', shape: 'rect', line: [[80, -12], [80, 108]], yes: true },
  { key: 'rect-midh', shape: 'rect', line: [[-12, 48], [172, 48]], yes: true },
  { key: 'rect-diag', shape: 'rect', line: [[-10, -6], [170, 102]], yes: false },
  { key: 'square-diag', shape: 'square', line: [[-10, -10], [120, 120]], yes: true },
  { key: 'iso-height', shape: 'iso', line: [[40, -12], [40, 132]], yes: true },
  { key: 'iso-median', shape: 'iso', line: [[-8, 128], [66, 54]], yes: false },
  { key: 'para-mid', shape: 'para', line: [[85, -12], [85, 102]], yes: false },
  { key: 'equi-median', shape: 'equi', line: [[65, -12], [65, 125]], yes: true },
  { key: 'hexagon-vertex', shape: 'hexagon', line: [[-12, 61], [152, 61]], yes: true },
  { key: 'kite-h', shape: 'kite', line: [[8, 70], [112, 70]], yes: false },
  { key: 'trap-diag', shape: 'trap', line: [[23.5, -8.5], [161.5, 93.5]], yes: false },
]
function genIsAxis(kpId: string, d: Difficulty, rng: RNG): Question {
  const c = rng.pick(IS_AXIS)
  const pts: GeoPt[] =
    c.shape === 'para'
      ? [
          [40, 0],
          [170, 0],
          [130, 90],
          [0, 90],
        ]
      : axShapePts(c.shape)
  const items: GeoItem[] = [{ t: 'poly', pts, stroke: 'b', fill: 'b' }, axisLine(c.line[0], c.line[1])]
  return judge(kpId, SYM, d, rng, `isaxis-${c.key}`, [text('m4.mov.isAxisQ'), geoPart([fitFig(items, 10)], '（一个图形，上面画着一条红色虚线）')], c.yes)
}

/** 第 1 档：点 A 到对称轴有 n 小格，对应点 A′ 有几小格（2 不出：「2 小格」会读成「二小格」） */
function genOtherDist(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([1, 3, 4, 5, 6])
  return numberQuestion({ kpId, type: SYM, difficulty: d, sig: `odist-${n}`, stem: [text('m4.mov.otherDistQ', { n })], value: n, rng, max: 12, min: 1, smart: [n + 1, n - 1, 2 * n] })
}

/** 做一做 1「说一说轴对称图形有哪些特点」改成判断 */
const SYM_JUDGE: [string, boolean][] = [
  ['m4.mov.j.sameDist', true],
  ['m4.mov.j.diffDist', false],
  ['m4.mov.j.fold', true],
]
function genSymJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(SYM_JUDGE)
  return judge(kpId, SYM, d, rng, `j-${k}`, [text(k)], yes)
}

/** 练习二十 7*：对称轴是方格纸的对角线（从左上角到右下角），找点 A 的对应点（第 3 档） */
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
    stem: [text('m4.mov.partnerQ'), geoPart([gridFig(h.n, h.n, items, 20)], '（方格纸上一个轴对称图形的一半，红色虚线对称轴是从左上角到右下角的斜线，标着点 A，另一边有 B、C、D 三个点）')],
    correct: answer,
    distractors: names.slice(0, order.length).filter((n) => n !== answer),
    rng,
  })
}

defineGenerator('m4s2-07-symmetry', (d, rng) => {
  const kpId = 'm4s2-07-symmetry'
  const roll = rng.next()
  if (d === 1) {
    // 例 1：点 A、A′ 到对称轴的距离；例 2、做一做 2：补全（先找对应点、补全后是哪幅）；做一做 1 轴对称图形的特点；练习二十 1、3 对称轴的条数
    if (roll < 0.26) return genDist(kpId, d, rng)
    if (roll < 0.46) return genPartner(kpId, d, rng)
    if (roll < 0.68) return genComplete(kpId, d, rng)
    if (roll < 0.84) return genAxes(kpId, d, rng)
    if (roll < 0.9) return genOtherDist(kpId, d, rng)
    return genSymJudge(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.18) return genDist(kpId, d, rng)
    if (roll < 0.36) return genPartner(kpId, d, rng)
    if (roll < 0.54) return genComplete(kpId, d, rng)
    if (roll < 0.68) return genAxes(kpId, d, rng)
    if (roll < 0.92) return genIsAxis(kpId, d, rng)
    return genSymJudge(kpId, d, rng)
  }
  if (roll < 0.4) return genDiagonal(kpId, d, rng)
  if (roll < 0.7) return genIsAxis(kpId, d, rng)
  return genComplete(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 平移（例 3、例 4、做一做，练习二十一）
// ─────────────────────────────────────────────────────────────

/** 平移用的小图形（格子坐标，左上角是原点）：例 3 的箭头、做一做的小旗、练习二十一 1 的小船、2 的直角梯形，和几个随手的 */
export interface MShape {
  name: string
  w: number
  h: number
  parts: { pts: GeoPt[]; open?: boolean }[]
}
export const M_SHAPES: MShape[] = [
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
    name: 'house',
    w: 2,
    h: 3,
    parts: [
      {
        pts: [
          [0, 1],
          [1, 0],
          [2, 1],
          [2, 3],
          [0, 3],
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

type Dir = 'up' | 'down' | 'left' | 'right'
const DIRS: Dir[] = ['up', 'down', 'left', 'right']
const STEP: Record<Dir, GeoPt> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const dirL = (dir: Dir): LStr => ({ k: `m4.mov.dir.${dir}` })
const toL = (dir: Dir): LStr => ({ k: `m4.mov.to.${dir}` })
const moveL = (dir: Dir, n: number): LStr => ({ k: 'm4.mov.move', p: { dir: dirL(dir), n } })
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
function moved(rng: RNG, d: Difficulty): Moved {
  const s = rng.pick(M_SHAPES)
  const dir = rng.pick(DIRS)
  const ext = horizontal(dir) ? s.w : s.h
  const top = horizontal(dir) ? 9 : 6
  // 第 1 档两个图不重叠（课本例 3、做一做）；第 2 档有一半重叠，只能数对应点
  const n = d === 1 ? rng.int(ext + 1, top) : rng.chance(0.45) ? rng.int(1, ext) : rng.int(ext + 1, top + 2)
  const W = horizontal(dir) ? s.w + n + 2 : s.w + 4
  const H = horizontal(dir) ? s.h + 2 : s.h + n + 2
  const [sx, sy] = STEP[dir]
  const from: GeoPt = [dir === 'left' ? 1 + n : horizontal(dir) ? 1 : 2, dir === 'up' ? 1 + n : horizontal(dir) ? 1 : 1]
  const to: GeoPt = [from[0] + sx * n, from[1] + sy * n]
  return { s, dir, n, ext, fig: gridFig(W, H, [...shapeItems(s, from, false), ...shapeItems(s, to, true)], 20) }
}
const movedAlt = '（方格纸上一个涂色的图形，平移后的位置画成虚线）'

/** 例 3、做一做：向右（左、上、下）平移到虚线的位置，平移了几格（干扰项有「数中间空了几格」的错法） */
function genHowFar(kpId: string, d: Difficulty, rng: RNG): Question {
  const m = moved(rng, d)
  const gap = m.n - m.ext
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `far-${m.s.name}-${m.dir}-${m.n}`,
    stem: [text('m4.mov.howFarQ', { dir: dirL(m.dir) }), geoPart([m.fig], movedAlt)],
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
  return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `dir-${m.s.name}-${m.dir}-${m.n}`, stem: [text('m4.mov.dirQ'), geoPart([m.fig], movedAlt)], correct: toL(m.dir), distractors: DIRS.filter((x) => x !== m.dir).map(toL), rng })
}

/** 例 3 的「向（ ）平移（ ）格」：方向和格数一起选 */
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
    stem: [text('m4.mov.moveQ'), geoPart([m.fig], movedAlt)],
    correct: moveL(m.dir, m.n),
    distractors: wrong.slice(0, 3).map(([dir, n]) => moveL(dir, n)),
    rng,
  })
}

/** 练习二十一 1：把涂色的图形向右（左）平移 n 格，得到的是哪一个（三个虚线的图上标着 1、2、3；有一个和原图中间正好空 n 格） */
function genWhich(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.pick(M_SHAPES)
  // 只横着排（竖着排四个图太高，手机上缩得太小）；上下平移在「平移了几格」「怎样平移」里出
  const dir = rng.pick<Dir>(d === 1 ? ['right', 'right', 'left'] : ['right', 'left'])
  const ext = horizontal(dir) ? s.w : s.h
  const n = rng.int(ext, ext + (horizontal(dir) ? 3 : 2))
  // 沿平移方向的位置：原图在 p0，对的在 p0 ± n，「中间空 n 格」的在 p0 ± (n + ext)，方向反了的在 p0 ∓ n
  const sign = dir === 'right' || dir === 'down' ? 1 : -1
  const len = 2 * n + 2 * ext + 2
  const p0 = sign > 0 ? n + 1 : len - n - 1 - ext
  const pos: Record<'ok' | 'gap' | 'back', number> = { ok: p0 + sign * n, gap: p0 + sign * (n + ext), back: p0 - sign * n }
  const order = rng.shuffle<'ok' | 'gap' | 'back'>(['ok', 'gap', 'back'])
  const across = horizontal(dir) ? s.h : s.w
  const at = (p: number): GeoPt => (horizontal(dir) ? [p, 1] : [1, p])
  const items: GeoItem[] = [...shapeItems(s, at(p0), false)]
  order.forEach((c, i) => {
    items.push(...shapeItems(s, at(pos[c]), true))
    const mid = pos[c] + ext / 2
    items.push({ t: 'text', at: horizontal(dir) ? [mid, 0.45] : [0.45, mid], text: String(i + 1), badge: true })
  })
  const fig = horizontal(dir) ? gridFig(len, across + 2, items, 16) : gridFig(across + 2, len, items, 16)
  return labelQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `which-${s.name}-${dir}-${n}-${order.join('.')}`,
    stem: [text('m4.mov.whichQ', { dir: dirL(dir), n }), geoPart([fig], '（方格纸上一个涂色的图形，还有三个虚线画的同样的图形，标着 1、2、3）')],
    correct: String(order.indexOf('ok') + 1),
    distractors: ['1', '2', '3'].filter((x) => x !== String(order.indexOf('ok') + 1)),
    rng,
  })
}

// ── 利用平移求面积、周长（例 4、做一做，练习二十一 3、4） ──

const ARC_N = 12
/** 半圆上的点：圆心 c、半径 r，从 a0 度转到 a1 度（0° 朝右、y 向下时 90° 朝下） */
function arc(c: GeoPt, r: number, a0: number, a1: number): GeoPt[] {
  return Array.from({ length: ARC_N + 1 }, (_, k): GeoPt => {
    const a = ((a0 + ((a1 - a0) * k) / ARC_N) * Math.PI) / 180
    return [Math.round((c[0] + r * Math.cos(a)) * 1000) / 1000, Math.round((c[1] + r * Math.sin(a)) * 1000) / 1000]
  })
}
const transpose = (p: GeoPt): GeoPt => [p[1], p[0]]

/** 例 4 的图：长 L 格、高 D 格的长方形，左边凸出一个半圆（直径 D），右边凹进一个同样的半圆；vertical = 转过来（上面凸、下面凹） */
export function bumpShape(L: number, D: number, vertical: boolean): { fig: GeoFig; pts: GeoPt[] } {
  const r = D / 2
  const a = 1 + r
  const y0 = 1
  // 上边从左往右（左上角 (a, y0) 是最后一个点，封口时连回去），接着：
  const pts: GeoPt[] = [
    // 右边凹进去的半圆：从上往下，往左凹
    ...arc([a + L, y0 + r], r, -90, -270),
    // 左边凸出去的半圆：从下往上，往左凸，停在左上角
    ...arc([a, y0 + r], r, 90, 270),
  ]
  const W = L + r + 2
  const H = D + 2
  const shape = vertical ? pts.map(transpose) : pts
  const gw = vertical ? H : W
  const gh = vertical ? W : H
  const items: GeoItem[] = [{ t: 'poly', pts: shape, fill: 'd', stroke: 'ink' }, { t: 'text', at: [gw - 0.5, -0.62], text: '1 cm' }]
  return { fig: gridFig(gw, gh, items, 20), pts: shape }
}

/** 例 4：把凸出的半圆剪下来平移几格拼成长方形 / 这个图形的面积是多少平方厘米 */
function genArea(kpId: string, d: Difficulty, rng: RNG): Question {
  const book = d === 1 && rng.chance(0.3)
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
      stem: [text('m4.mov.bumpQ', { side: { k: vertical ? 'm4.mov.side.top' : 'm4.mov.side.left' }, dir: dirL(vertical ? 'down' : 'right') }), geoPart([fig], alt)],
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
    stem: [text('m4.mov.areaQ'), geoPart([fig], alt)],
    value: L * D,
    rng,
    max: 100,
    min: 1,
    smart: [(L + D / 2) * D, (L + D) * 2, L * D + D, L * D - D],
  })
}

/** 例 4 做一做：火箭（长方形左边挖进一个三角形、右边接一个同样的三角形），长和宽标在图上 */
export function rocketFig(L: number, Wd: number, tip: number): GeoFig {
  const k = 17
  const pts: GeoPt[] = [
    [0, 0],
    [L * k, 0],
    [(L + tip) * k, (Wd * k) / 2],
    [L * k, Wd * k],
    [0, Wd * k],
    [tip * k, (Wd * k) / 2],
  ]
  return fitFig(
    [
      { t: 'poly', pts, fill: 'b', stroke: 'ink', labels: [null, null, null, `${L} cm`, null, null] },
      { t: 'line', a: [L * k, 0], b: [L * k, Wd * k], thin: true },
      { t: 'text', at: [L * k - 26, (Wd * k) / 2], text: `${Wd} cm` },
    ],
    14,
  )
}
function genRocket(kpId: string, d: Difficulty, rng: RNG): Question {
  const book = d === 1 && rng.chance(0.3)
  const L = book ? 9 : rng.int(6, 10)
  const Wd = book ? 3 : rng.int(2, 4)
  const tip = book ? 2.5 : rng.pick([1.5, 2, 2.5])
  return numberQuestion({
    kpId,
    type: MOV,
    difficulty: d,
    sig: `rocket-${L}-${Wd}`,
    stem: [text('m4.mov.rocketQ'), geoPart([rocketFig(L, Wd, tip)], `（一个火箭形状的图形：长方形部分下边标着 ${L} cm、右边那条竖线旁标着 ${Wd} cm，左边挖进一个三角形，右边接着一个同样的三角形）`)],
    value: L * Wd,
    rng,
    max: 100,
    min: 1,
    smart: [(L + tip) * Wd, (L + Wd) * 2, L * Wd + Wd],
  })
}

/** 练习二十一 4：阶梯形的周长（上面几级台阶的拐点故意不在格线上，只能把边平移成长方形）= (W + H) × 2 */
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
    stem: [text('m4.mov.stairsQ'), geoPart([gridFig(W + 2, H + 2, items, 18)], '（方格纸上一个阶梯形状的图形，边都是横的或竖的，上面几级台阶的拐点不在格线上，方格纸旁标着 1 cm）')],
    value: p,
    rng,
    max: 80,
    min: 1,
    smart: [W + H, W * H, p - 2, p + 2],
  })
}

/** 练习二十一 5：小动物先横着平移、再竖着平移，吃到它喜欢的食物 */
const PAIRS: [string, string][] = [
  ['🐶', '🦴'],
  ['🐼', '🎋'],
  ['🐰', '🥕'],
  ['🐱', '🐟'],
  ['🐵', '🍌'],
]
function genTwoMoves(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(PAIRS)
  const C = 10
  const R = 8
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
  const h: Dir = c2 > c1 ? 'right' : 'left'
  const v: Dir = r2 > r1 ? 'down' : 'up'
  const dx = Math.abs(c2 - c1)
  const dy = Math.abs(r2 - r1)
  const fig = geoPart(
    [
      gridFig(
        C,
        R,
        [
          { t: 'text', at: [c1 + 0.5, r1 + 0.5], text: a },
          { t: 'text', at: [c2 + 0.5, r2 + 0.5], text: b },
        ],
        26,
      ),
    ],
    `（方格纸上一格里有 ${a}，另一格里有 ${b}）`,
  )
  const sig = `two-${a}-${c1}.${r1}-${c2}.${r2}`
  if (rng.chance(0.5))
    return numberQuestion({ kpId, type: MOV, difficulty: d, sig: `${sig}-first`, stem: [text('m4.mov.firstQ', { a, b, dir: dirL(h), dir2: dirL(v) }), fig], value: dx, rng, max: 12, min: 1, smart: [dx - 1, dx + 1, dy] })
  const pool: [Dir, number][] = [
    [OPP[v], dy],
    [v, dy + 1],
    [v, dy - 1],
    [h, dy],
  ]
  const wrong = pool.filter(([, n]) => n >= 1)
  return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `${sig}-then`, stem: [text('m4.mov.thenQ', { a, b, dir: dirL(h), n: dx }), fig], correct: moveL(v, dy), distractors: some(rng, wrong, 3).map(([dir, n]) => moveL(dir, n)), rng })
}

/** 练习二十一 3：涂色部分占整个图形的几分之几（把一块平移过去就看出来了） */
type FracKind = 'strips' | 'band' | 'para'
const FRACS = ['1/2', '1/3', '1/4', '1/5', '2/3', '3/4', '2/5']
export function fracFig(kind: FracKind, k: number): { fig: GeoFig; answer: string } {
  if (kind === 'strips') {
    // 长方形竖着平均分成 k 条：左边一条涂色、挖掉一个白色半圆；最右边一条里有一个涂色的半圆
    const s = 40
    const items: GeoItem[] = [
      {
        t: 'poly',
        pts: [
          [0, 0],
          [s, 0],
          [s, 2 * s],
          [0, 2 * s],
        ],
        fill: 'd',
        stroke: 'ink',
      },
      { t: 'poly', pts: arc([s, s], s, -90, -270), fill: 'paper', stroke: 'ink' },
      { t: 'poly', pts: arc([k * s, s], s, -90, -270), fill: 'd', stroke: 'ink' },
      {
        t: 'poly',
        pts: [
          [0, 0],
          [k * s, 0],
          [k * s, 2 * s],
          [0, 2 * s],
        ],
        stroke: 'ink',
      },
      ...Array.from({ length: k - 1 }, (_, j): GeoItem => ({ t: 'line', a: [(j + 1) * s, 0], b: [(j + 1) * s, 2 * s], thin: true })),
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
    ...Array.from({ length: k - 1 }, (_, j): GeoItem => ({ t: 'line', a: [(j + 2) * s, 0], b: [(j + 2) * s, s], thin: true })),
  ]
  return { fig: fitFig(items, 8), answer: `1/${k + 1}` }
}
function genFraction(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick<FracKind>(['strips', 'band', 'para'])
  const k = kind === 'strips' ? rng.int(3, 4) : kind === 'band' ? rng.int(2, 3) : rng.int(2, 3)
  const { fig, answer } = fracFig(kind, k)
  const alt = { strips: '（一个长方形平均分成几条，左边一条涂了色、挖掉一个半圆，右边一条里涂了一个同样的半圆）', band: '（一个长方形里两条一样的弧线，中间夹着的弯带涂了色）', para: '（一个平行四边形，分成左右两个三角形和中间几个正方形，两个三角形涂了色）' }[kind]
  return labelQuestion({ kpId, type: MOV, difficulty: d, sig: `frac-${kind}-${k}`, stem: [text('m4.mov.fracQ'), geoPart([fig], alt)], correct: answer, distractors: some(rng, FRACS.filter((f) => f !== answer), 3), rng })
}

/** 数格子的方法（判断） */
const MOV_JUDGE: [string, boolean][] = [
  ['m4.mov.j.points', true],
  ['m4.mov.j.gap', false],
]
function genMoveJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(MOV_JUDGE)
  return judge(kpId, MOV, d, rng, `j-${k}`, [text(k)], yes)
}

defineGenerator('m4s2-07-translate', (d, rng) => {
  const kpId = 'm4s2-07-translate'
  const roll = rng.next()
  if (d === 1) {
    // 例 3：向上 / 下 / 左 / 右平移几格；做一做小旗；练习二十一 1 找平移后的图形；例 4（剪下半圆平移拼成长方形求面积）与做一做火箭；练习二十一 4 周长
    if (roll < 0.18) return genHowFar(kpId, d, rng)
    if (roll < 0.26) return genDir(kpId, d, rng)
    if (roll < 0.36) return genMove(kpId, d, rng)
    if (roll < 0.52) return genWhich(kpId, d, rng)
    if (roll < 0.76) return genArea(kpId, d, rng)
    if (roll < 0.86) return genRocket(kpId, d, rng)
    if (roll < 0.9) return genMoveJudge(kpId, d, rng)
    return genStairs(kpId, d, rng)
  }
  if (d === 2) {
    // 练习二十一 1–5：重叠着平移、竖着平移、阶梯形的周长、两次平移、涂色部分占几分之几
    if (roll < 0.12) return genHowFar(kpId, d, rng)
    if (roll < 0.26) return genWhich(kpId, d, rng)
    if (roll < 0.36) return genMove(kpId, d, rng)
    if (roll < 0.5) return genArea(kpId, d, rng)
    if (roll < 0.64) return genStairs(kpId, d, rng)
    if (roll < 0.82) return genTwoMoves(kpId, d, rng)
    return genFraction(kpId, d, rng)
  }
  if (roll < 0.35) return genTwoMoves(kpId, d, rng)
  if (roll < 0.7) return genFraction(kpId, d, rng)
  return genStairs(kpId, d, rng)
})
