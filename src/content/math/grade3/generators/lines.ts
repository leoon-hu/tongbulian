import type { Difficulty, GeoFig, GeoItem, GeoPt, GeoSide, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelKey, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 线和角（三上五）：线段、射线、直线；角的认识；锐角、直角、钝角。
// 这一册不量角、没有度数（图里用度数控制形状）、没有平角 / 周角 / 垂直 / 平行。图都用 GeoFigure（kind: 'geo'）画，
// 图里只有字母、数和 emoji；下面的几何小工具长方形和正方形（rect.ts）、图形的面积（area.ts）也用。
// ─────────────────────────────────────────────────────────────

// ── 几何图的小工具 ──

export const r1 = (n: number): number => Math.round(n * 10) / 10
const rad = (deg: number): number => (deg * Math.PI) / 180
/** 方向 deg（度，0° 朝右、逆时针为正）的单位向量，换成 y 向下的坐标 */
export const dir = (deg: number): GeoPt => [Math.cos(rad(deg)), -Math.sin(rad(deg))]
/** 从 p 沿 u 走 t */
export const along = (p: GeoPt, u: GeoPt, t: number): GeoPt => [p[0] + u[0] * t, p[1] + u[1] * t]
/** 绕 c 转 deg 度（屏幕上看是逆时针） */
export function rotate(p: GeoPt, deg: number, c: GeoPt = [0, 0]): GeoPt {
  const cos = Math.cos(rad(deg))
  const sin = Math.sin(rad(deg))
  const x = p[0] - c[0]
  const y = p[1] - c[1]
  return [c[0] + x * cos + y * sin, c[1] - x * sin + y * cos]
}

/** 对一样东西的每个点做 f（grid 只挪起点） */
export function mapItem(it: GeoItem, f: (p: GeoPt) => GeoPt): GeoItem {
  switch (it.t) {
    case 'poly':
      return { ...it, pts: it.pts.map(f) }
    case 'curve':
      return { ...it, pts: it.pts.map(f) }
    case 'line':
      return { ...it, a: f(it.a), b: f(it.b) }
    case 'dot':
      return { ...it, at: f(it.at) }
    case 'text':
      return { ...it, at: f(it.at) }
    case 'arc':
      return { ...it, at: f(it.at), a: f(it.a), b: f(it.b) }
    case 'grid': {
      const [x, y] = f([it.x, it.y])
      return { ...it, x, y }
    }
  }
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

/** 把一组东西挪到左上角留 m 的地方，外框就是图的大小（坐标取一位小数） */
export function fitFig(items: GeoItem[], m = 10, px?: number): GeoFig {
  const b = bounds(items)
  const f = (p: GeoPt): GeoPt => [r1(p[0] - b.x0 + m), r1(p[1] - b.y0 + m)]
  const fig: GeoFig = { w: r1(b.x1 - b.x0 + 2 * m), h: r1(b.y1 - b.y0 + 2 * m), items: items.map((it) => mapItem(it, f)) }
  if (px) fig.px = px
  return fig
}

/** 题干里的一段几何图 */
export function geoPart(figs: GeoFig[], alt: string, numbered = false): StemPart {
  return numbered ? { kind: 'geo', figs, alt, numbered: true } : { kind: 'geo', figs, alt }
}

export const text = (k: string, p?: Record<string, string | number | LStr>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })

const SIDE_ANGLE: [GeoSide, number][] = [
  ['e', 0],
  ['ne', 45],
  ['n', 90],
  ['nw', 135],
  ['w', 180],
  ['sw', 225],
  ['s', 270],
  ['se', 315],
]
/** 向量 v 最接近哪个方位 */
export function sideOf(v: GeoPt): GeoSide {
  const a = ((Math.atan2(-v[1], v[0]) * 180) / Math.PI + 360) % 360
  let best: GeoSide = 's'
  let bd = 999
  for (const [s, deg] of SIDE_ANGLE) {
    const dd = Math.min(Math.abs(a - deg), 360 - Math.abs(a - deg))
    if (dd < bd) {
      bd = dd
      best = s
    }
  }
  return best
}
/** 线上的字母标在哪边：垂直于线、尽量朝下；差不多竖着的线标在左边 */
function letterSide(u: GeoPt): GeoSide {
  let n: GeoPt = [-u[1], u[0]]
  if (Math.abs(n[1]) < 0.35) n = n[0] < 0 ? n : [-n[0], -n[1]]
  else if (n[1] < 0) n = [-n[0], -n[1]]
  return sideOf(n)
}

/** 正 n 边形的顶点（外接圆半径 r，第一个顶点朝 rot 度） */
export function regularPts(n: number, r: number, rot = 90): GeoPt[] {
  return Array.from({ length: n }, (_, i) => {
    const u = dir(rot + (360 * i) / n)
    return [u[0] * r, u[1] * r] as GeoPt
  })
}

/** 每个顶点处的转角（度，0–180）和整个多边形是不是凸的 */
export function turns(pts: GeoPt[]): { turn: number[]; convex: boolean } {
  const n = pts.length
  const turn: number[] = []
  const signs = new Set<number>()
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n]!
    const b = pts[i]!
    const c = pts[(i + 1) % n]!
    const e1 = [b[0] - a[0], b[1] - a[1]]
    const e2 = [c[0] - b[0], c[1] - b[1]]
    const cross = e1[0]! * e2[1]! - e1[1]! * e2[0]!
    const dot = e1[0]! * e2[0]! + e1[1]! * e2[1]!
    turn.push((Math.atan2(Math.abs(cross), dot) * 180) / Math.PI)
    signs.add(Math.sign(cross))
  }
  return { turn, convex: signs.size === 1 }
}

const edgeLen = (pts: GeoPt[], i: number): number => {
  const a = pts[i]!
  const b = pts[(i + 1) % pts.length]!
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

/** 不规则的凸 n 边形：顶点方向、到中心的距离都抖一抖；每个角都明显不是平的（转角 ≥ 24°），边也不会太短 */
export function irregularPts(n: number, r: number, rng: RNG): GeoPt[] {
  for (;;) {
    const rot = rng.int(0, 71) * 5
    const pts = Array.from({ length: n }, (_, i) => {
      const u = dir(rot + (360 * (i + (rng.next() - 0.5) * 0.55)) / n)
      const rr = r * (0.68 + rng.next() * 0.32)
      return [r1(u[0] * rr), r1(u[1] * rr)] as GeoPt
    })
    const t = turns(pts)
    if (!t.convex || t.turn.some((x) => x < 24)) continue
    if (pts.some((_, i) => edgeLen(pts, i) < r * 0.36)) continue
    return pts
  }
}

/** 多边形的正则化签名（给 sig 用）：坐标按 10 取整 */
export const shapeSig = (pts: GeoPt[]): string => pts.map((p) => `${Math.round(p[0] / 10)}.${Math.round(p[1] / 10)}`).join('_')

// ─────────────────────────────────────────────────────────────
// 线段、射线、直线
// ─────────────────────────────────────────────────────────────

type Straight = 'segment' | 'ray' | 'line'
type LineKind = Straight | 'arc' | 'wave'
const STRAIGHT: Straight[] = ['segment', 'ray', 'line']
const kindL = (k: Straight): LStr => ({ k: `m3.line.${k}` })
const NONE: LStr = { k: 'm3.line.none' }
const KIND_ZH: Record<LineKind, string> = { segment: '线段', ray: '射线', line: '直线', arc: '曲线', wave: '曲线' }
/** 线的方向：各个方向都有，免得孩子靠「横着的」判断 */
const ROTS = [0, 0, 12, -12, 25, -28, 40, -45, 90, 65, -65]
const FLAT_ROTS = [0, 0, 10, -10, 20, -22, 30, -30]

/**
 * 一条线的图（原点在中间）：
 * 线段两头画点；射线只有起点画点，另一头一直画出去；直线两头都不画点（letters 时在中间取两个点 A、B，midDots 只画点不标字母）；
 * 曲线是一段圆弧或波浪线（endDots = 两头画点：有两个「端点」的曲线也不是线段）。
 */
export function lineItems(kind: LineKind, rot: number, o: { letters?: boolean; len?: number; midDots?: boolean; endDots?: boolean } = {}): GeoItem[] {
  const L = o.len ?? 180
  const u = dir(rot)
  const at = (t: number): GeoPt => [u[0] * t, u[1] * t]
  const side = letterSide(u)
  const out: GeoItem[] = []
  const pt = (p: GeoPt, label?: string): void => {
    out.push(label ? { t: 'dot', at: p, label, side } : { t: 'dot', at: p })
  }
  if (kind === 'segment') {
    out.push({ t: 'line', a: at(-L / 2), b: at(L / 2), dots: [true, true] })
    if (o.letters) {
      pt(at(-L / 2), 'A')
      pt(at(L / 2), 'B')
    }
  } else if (kind === 'ray') {
    out.push({ t: 'line', a: at(-L / 2), b: at(L * 0.62), dots: [true, false] })
    if (o.letters) {
      pt(at(-L / 2), 'A')
      pt(at(L * 0.08), 'B')
    }
  } else if (kind === 'line') {
    out.push({ t: 'line', a: at(-L * 0.62), b: at(L * 0.62) })
    if (o.letters) {
      pt(at(-L * 0.22), 'A')
      pt(at(L * 0.22), 'B')
    } else if (o.midDots) {
      pt(at(-L * 0.22))
      pt(at(L * 0.22))
    }
  } else {
    const pts: GeoPt[] =
      kind === 'arc'
        ? Array.from({ length: 5 }, (_, i) => {
            const v = dir(145 - i * 27.5)
            return [v[0] * L * 0.55, v[1] * L * 0.55 + L * 0.3] as GeoPt
          })
        : Array.from({ length: 7 }, (_, i) => [-L / 2 + (i * L) / 6, (i % 2 ? -1 : 1) * L * (i === 0 || i === 6 ? 0.07 : 0.13)] as GeoPt)
    out.push({ t: 'curve', pts: pts.map((p) => rotate(p, rot)), ...(o.endDots ? { dots: [true, true] as [boolean, boolean] } : {}) })
  }
  return out
}

function lineAlt(kind: LineKind, letters: boolean, endDots = false): string {
  if (kind === 'arc' || kind === 'wave') return `（一条${endDots ? '两头画着点的' : ''}曲线）`
  return `（一条${KIND_ZH[kind]}${letters ? ' AB' : ''}）`
}

/** 看图说出是线段、射线还是直线（曲线选「都不是」） */
function genName(kpId: string, d: Difficulty, rng: RNG): Question {
  const curve = rng.chance(d === 1 ? 0.2 : 0.3)
  const kind: LineKind = curve ? rng.pick(['arc', 'wave'] as const) : rng.pick(STRAIGHT)
  const rot = rng.pick(curve ? FLAT_ROTS : ROTS)
  const letters = !curve && rng.chance(d === 1 ? 0.5 : 0.8)
  const endDots = curve && d >= 2 && rng.chance(0.6)
  const midDots = kind === 'line' && !letters && rng.chance(0.5)
  const correct = curve ? NONE : kindL(kind as Straight)
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `name-${kind}-${rot}-${letters ? 'L' : midDots ? 'M' : ''}${endDots ? 'D' : ''}`,
    // 图的说明不说是哪种线（静态页会印出来，别把答案写出来）
    stem: [text('m3.line.name'), geoPart([fitFig(lineItems(kind, rot, { letters, endDots, midDots }), 18)], `（一条${letters ? '标着字母 A、B 的' : ''}线）`)],
    correct,
    distractors: [...STRAIGHT.map(kindL), NONE].filter((x) => labelKey(x) !== labelKey(correct)),
    rng,
  })
}

/** 四幅图（线段、射线、直线、一条曲线）里挑出指定的一种 */
function genPick(kpId: string, d: Difficulty, rng: RNG): Question {
  const target = rng.pick(STRAIGHT)
  const kinds = rng.shuffle<LineKind>(['segment', 'ray', 'line', rng.pick(['arc', 'wave'] as const)])
  const figs = kinds.map((k) =>
    fitFig(lineItems(k, rng.pick(FLAT_ROTS), { len: 100, midDots: k === 'line' && rng.chance(0.4), endDots: d >= 2 && (k === 'arc' || k === 'wave') }), 8),
  )
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `pick-${target}-${kinds.join(',')}`,
    stem: [text('m3.line.pick', { kind: kindL(target) }), geoPart(figs, '（四幅图，编号 1 到 4，各画着一条线）', true)],
    value: kinds.indexOf(target) + 1,
    rng,
    min: 1,
    max: 4,
    input: 'choice',
  })
}

/** 线段、射线、直线各有几个端点（2、1、0） */
function genEnds(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(STRAIGHT)
  const value = { segment: 2, ray: 1, line: 0 }[kind]
  const letters = kind !== 'line' && rng.chance(0.5)
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `ends-${kind}`,
    stem: [text('m3.line.ends', { kind: kindL(kind) }), geoPart([fitFig(lineItems(kind, rng.pick(ROTS), { letters }), 18)], lineAlt(kind, letters))],
    value,
    rng,
    min: 0,
    max: 3,
    smart: [0, 1, 2, 3].filter((x) => x !== value),
  })
}

/** 三种线的区别（课本 p62 三个小朋友说的话、p61 的定义） */
const LINE_FACTS: { key: string; answer: Straight }[] = [
  { key: 'm3.line.factMeasure', answer: 'segment' },
  { key: 'm3.line.factTwoEnds', answer: 'segment' },
  { key: 'm3.line.factOneEnd', answer: 'ray' },
  { key: 'm3.line.factNoEnd', answer: 'line' },
  { key: 'm3.line.factExtendOne', answer: 'ray' },
  { key: 'm3.line.factExtendTwo', answer: 'line' },
]
function genFact(kpId: string, d: Difficulty, rng: RNG): Question {
  const f = rng.pick(LINE_FACTS)
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `fact-${f.key}`,
    stem: [text(f.key)],
    correct: kindL(f.answer),
    distractors: STRAIGHT.filter((k) => k !== f.answer).map(kindL),
    rng,
  })
}

/** 哪两种线可以无限延伸（射线和直线） */
function genInfinite(kpId: string, d: Difficulty, rng: RNG): Question {
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: 'infinite',
    stem: [text('m3.line.factInfinite')],
    correct: { k: 'm3.line.rayLine' },
    distractors: [{ k: 'm3.line.segRay' }, { k: 'm3.line.segLine' }],
    rng,
  })
}

/** 两点间所有连线中线段最短，这条线段的长度叫作两点间的距离（p62 红字） */
function genDistance(kpId: string, d: Difficulty, rng: RNG): Question {
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: 'dist',
    stem: [text('m3.line.distQ')],
    correct: { k: 'm3.line.distance' },
    distractors: [{ k: 'm3.line.route' }, kindL('line')],
    rng,
  })
}

/** 两点之间三条路：一条弯路、一条直路、一条折线，哪条最近（例 1、做一做 2） */
function genRoute(kpId: string, d: Difficulty, rng: RNG): Question {
  const place = rng.pick([
    { key: 'm3.line.routeShop', icon: '🏪', zh: '超市' },
    { key: 'm3.line.routeSchool', icon: '🏫', zh: '学校' },
  ])
  const A: GeoPt = [0, 0]
  const B: GeoPt = [240, 0]
  const up = rng.chance(0.5) ? -1 : 1 // 弯路在上面（-1）还是下面
  const h1 = rng.int(40, 62)
  const h2 = rng.int(28, 55)
  const x1 = rng.int(45, 85)
  const x2 = rng.int(150, 195)
  const top = Math.max(h1, h2) + 8
  const curve: GeoPt[] = [A, [x1, up * h1], [(x1 + x2) / 2, up * top], [x2, up * h2], B]
  const vx = rng.int(85, 165)
  const vy = -up * rng.int(58, 75)
  const nums = rng.shuffle([1, 2, 3]) // 弯路、直路、折线各是几号
  const items: GeoItem[] = [
    { t: 'curve', pts: curve },
    { t: 'line', a: A, b: B },
    { t: 'poly', pts: [A, [vx, vy], B], open: true },
    { t: 'dot', at: A },
    { t: 'dot', at: B },
    { t: 'dot', at: [vx, vy] },
    { t: 'text', at: [-26, 0], text: '🏠', big: true },
    { t: 'text', at: [266, 0], text: place.icon, big: true },
    { t: 'text', at: [(x1 + x2) / 2, up * (top + 20)], text: String(nums[0]), badge: true },
    { t: 'text', at: [120, up * 16], text: String(nums[1]), badge: true },
    { t: 'text', at: [vx, vy - up * 20], text: String(nums[2]), badge: true },
  ]
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `route-${place.icon}-${up}-${nums.join('')}`,
    stem: [text(place.key), geoPart([fitFig(items, 16)], `（从家到${place.zh}有三条路，分别标着 1、2、3 号）`)],
    value: nums[1]!,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 过一个点能画无数条直线，过两个点只能画一条（练习十二 2(3)） */
function genThrough(kpId: string, d: Difficulty, rng: RNG): Question {
  const two = rng.chance(0.5)
  const items: GeoItem[] = two
    ? [
        { t: 'dot', at: [0, 0], label: 'A', side: 'n' },
        { t: 'dot', at: [rng.int(90, 140), rng.int(-40, 40)], label: 'B', side: 'n' },
      ]
    : [{ t: 'dot', at: [0, 0], label: 'A', side: 'n' }]
  const opts: LStr[] = [{ k: 'm3.line.nTiao', p: { n: 1 } }, { k: 'm3.line.nTiao', p: { n: 2 } }, { k: 'm3.line.countless' }]
  const correct = two ? opts[0]! : opts[2]!
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `through-${two ? 2 : 1}`,
    stem: [text(two ? 'm3.line.throughTwo' : 'm3.line.throughOne'), geoPart([fitFig(items, 34)], two ? '（两个点 A、B）' : '（一个点 A）')],
    correct,
    distractors: opts.filter((o) => o !== correct),
    rng,
  })
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/** 一条直线上的 n 个点（间隔不一样），字母标在上面 */
function pointsOnLine(n: number, rng: RNG): GeoItem[] {
  const xs: number[] = [0]
  for (let i = 1; i < n; i++) xs.push(xs[i - 1]! + rng.int(40, 80))
  const end = xs[n - 1]!
  return [{ t: 'line', a: [-40, 0], b: [end + 45, 0] }, ...xs.map((x, i): GeoItem => ({ t: 'dot', at: [x, 0], label: LETTERS[i]!, side: 'n' }))]
}

/** 直线上有 A、B、C 三个点，以点 A 为一个端点的线段有几条（练习十二 3） */
function genSegFrom(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 3 ? rng.int(3, 4) : 3
  const names = LETTERS.slice(0, n)
  const p = rng.pick(names)
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `from-${n}-${p}`,
    stem: [text('m3.line.segFrom', { n, p }), geoPart([fitFig(pointsOnLine(n, rng), 14)], `（直线上依次有 ${names.join('、')} ${n} 个点）`)],
    value: n - 1,
    rng,
    min: 0,
    max: 10,
    smart: [n, n - 2, 2 * (n - 1)],
  })
}

/** 直线上有 n 个点：一共几条线段（n(n-1)/2）、几条射线（2n，练习十四 1） */
function genCountOnLine(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(3, 5)
  const rays = rng.chance(0.45)
  const value = rays ? 2 * n : (n * (n - 1)) / 2
  const names = LETTERS.slice(0, n)
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `${rays ? 'rays' : 'segs'}-${n}`,
    stem: [text(rays ? 'm3.line.countRays' : 'm3.line.countSegs', { n }), geoPart([fitFig(pointsOnLine(n, rng), 14)], `（直线上依次有 ${names.join('、')} ${n} 个点）`)],
    value,
    rng,
    min: 0,
    max: 20,
    smart: rays ? [n, n - 1, (n * (n - 1)) / 2, 2 * n - 2] : [n, n - 1, 2 * n, n + 1],
  })
}

/** n 个点每两点连一条线段，最多能连几条（练习十二 *7：1、3、6、10、15） */
function genConnect(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(3, 6)
  const rot = rng.int(0, 71) * 5
  const pts = regularPts(n, 70, rot).map((p) => along(p, dir(rng.int(0, 359)), rng.int(4, 14)))
  const value = (n * (n - 1)) / 2
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `connect-${n}`,
    stem: [text('m3.line.connect', { n }), geoPart([fitFig(pts.map((p): GeoItem => ({ t: 'dot', at: p })), 16)], `（${n} 个点，任意三个点都不在一条直线上）`)],
    value,
    rng,
    min: 0,
    max: 30,
    smart: [n, n - 1, n * (n - 1), value + 1],
  })
}

/** 比较关系 */
type Rel = '>' | '<' | '='
const RELS: Rel[] = ['>', '<', '=']

/** 想一想（p63）：点 A 与点 C 重合，看 B、D 的位置比 AB 和 CD */
function genOverlap(kpId: string, d: Difficulty, rng: RNG): Question {
  const rel = rng.pick(RELS)
  const ab = rng.int(4, 7) * 25
  const cd = rel === '=' ? ab : rel === '>' ? ab - rng.int(1, 2) * 25 : ab + rng.int(1, 2) * 25
  const end = Math.max(ab, cd)
  const items: GeoItem[] = [
    { t: 'line', a: [-30, 0], b: [end + 40, 0], thin: true },
    { t: 'dot', at: [0, 0], label: 'A', side: 'n' },
    { t: 'dot', at: [0, 0], label: 'C', side: 's' },
    { t: 'dot', at: [ab, 0], label: 'B', side: 'n' },
    { t: 'dot', at: [cd, 0], label: 'D', side: 's' },
  ]
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `overlap-${ab}-${cd}`,
    stem: [text('m3.line.overlap'), geoPart([fitFig(items, 16)], '（线段 AB 和 CD 画在同一条线上，点 A、C 重合在左端）'), { kind: 'expr', expr: 'AB ○ CD' }],
    correct: rel,
    distractors: RELS.filter((r) => r !== rel),
    rng,
  })
}

/** 两根木条 AC 与 BD 重叠在一起（练习十二 6）：AB 和 CD 的关系就是 AC 和 BD 的关系 */
function genStrips(kpId: string, d: Difficulty, rng: RNG): Question {
  const rel = rng.pick(RELS)
  const b = rng.int(4, 8) * 10
  const o = rng.int(7, 12) * 10
  const cd = rel === '=' ? b : rel === '>' ? b - rng.int(2, 3) * 10 : b + rng.int(2, 3) * 10
  const [xa, xb, xc, xd] = [0, b, b + o, b + o + cd]
  const bar = (x0: number, x1: number, y: number, fill: 'a' | 'c'): GeoItem => ({
    t: 'poly',
    pts: [
      [x0, y],
      [x1, y],
      [x1, y + 12],
      [x0, y + 12],
    ],
    fill,
    stroke: fill,
  })
  const items: GeoItem[] = [
    ...[xa, xb, xc, xd].map((x): GeoItem => ({ t: 'line', a: [x, -6], b: [x, 42], dash: true, stroke: 'soft' })),
    bar(xb, xd, 8, 'c'),
    bar(xa, xc, 22, 'a'),
    ...[xa, xb, xc, xd].map((x, i): GeoItem => ({ t: 'text', at: [x, -18], text: LETTERS[i]!, letter: true })),
  ]
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `strips-${b}-${o}-${cd}`,
    stem: [text('m3.line.strips', { rel }), geoPart([fitFig(items, 12)], '（木条 AC 在下、BD 在上，中间 BC 一段重叠）'), { kind: 'expr', expr: 'AC ○ BD' }],
    correct: rel,
    distractors: RELS.filter((r) => r !== rel),
    rng,
  })
}

/** 看一看，量一量（练习十二 5）：两头带箭头 / 带叉的线段看着不一样长，在方格上数一数才知道 */
function genIllusion(kpId: string, d: Difficulty, rng: RNG): Question {
  const rel = rng.pick(['=', '=', '>', '<'] as const)
  const l1 = rng.int(5, 7)
  const l2 = rel === '=' ? l1 : rel === '>' ? l1 - rng.int(1, 2) : l1 + rng.int(1, 2)
  // 两头的箭头伸出 0.8 格，线段放在第 1–11 格之间
  const x1 = rng.int(1, 11 - l1)
  const x2 = rng.int(1, 11 - l2)
  const topOut = rng.chance(0.5) // 上面那条带「叉」（看着更长）
  const fins = (xa: number, xb: number, y: number, out: boolean): GeoItem[] => {
    const s = out ? -1 : 1
    return [
      { t: 'line', a: [xa, y], b: [xa + s * 0.8, y - 0.6] },
      { t: 'line', a: [xa, y], b: [xa + s * 0.8, y + 0.6] },
      { t: 'line', a: [xb, y], b: [xb - s * 0.8, y - 0.6] },
      { t: 'line', a: [xb, y], b: [xb - s * 0.8, y + 0.6] },
    ]
  }
  const items: GeoItem[] = [
    { t: 'grid', x: 0, y: 0, w: 12, h: 7 },
    { t: 'line', a: [x1, 2], b: [x1 + l1, 2], stroke: 'd' },
    ...fins(x1, x1 + l1, 2, topOut),
    { t: 'line', a: [x2, 5], b: [x2 + l2, 5], stroke: 'b' },
    ...fins(x2, x2 + l2, 5, !topOut),
    { t: 'dot', at: [x1, 2] },
    { t: 'dot', at: [x1 + l1, 2] },
    { t: 'dot', at: [x2, 5] },
    { t: 'dot', at: [x2 + l2, 5] },
    // 字母离线远一点，别压在箭头上
    { t: 'text', at: [x1, 0.9], text: 'A', letter: true },
    { t: 'text', at: [x1 + l1, 0.9], text: 'B', letter: true },
    { t: 'text', at: [x2, 6.1], text: 'C', letter: true },
    { t: 'text', at: [x2 + l2, 6.1], text: 'D', letter: true },
  ]
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `illusion-${x1}-${l1}-${x2}-${l2}-${topOut ? 'o' : 'i'}`,
    stem: [text('m3.line.illusion'), geoPart([{ w: 12, h: 7, px: 22, items }], '（方格上两条线段 AB 和 CD，两头画着方向相反的箭头）'), { kind: 'expr', expr: 'AB ○ CD' }],
    correct: rel,
    distractors: RELS.filter((r) => r !== rel),
    rng,
  })
}

defineGenerator('m3s1-07-lines', (d, rng) => {
  const kpId = 'm3s1-07-lines'
  const roll = rng.next()
  if (d === 1) {
    // 课本这一节：认线（做一做 1）、三种线的区别、例 1 哪条路最近与「两点间的距离」、例 2 想一想（点 A 与点 C 重合比长短）
    if (roll < 0.2) return genName(kpId, d, rng)
    if (roll < 0.34) return genPick(kpId, d, rng)
    if (roll < 0.46) return genEnds(kpId, d, rng)
    if (roll < 0.6) return genFact(kpId, d, rng)
    if (roll < 0.65) return genDistance(kpId, d, rng)
    if (roll < 0.85) return genRoute(kpId, d, rng)
    return genOverlap(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十二：过一点 / 两点画直线、以 A 为端点的线段、看一看量一量、木条重叠
    if (roll < 0.14) return genThrough(kpId, d, rng)
    if (roll < 0.3) return genSegFrom(kpId, d, rng)
    if (roll < 0.4) return genInfinite(kpId, d, rng)
    if (roll < 0.56) return genStrips(kpId, d, rng)
    if (roll < 0.68) return genIllusion(kpId, d, rng)
    if (roll < 0.8) return genRoute(kpId, d, rng)
    return roll < 0.9 ? genName(kpId, d, rng) : genPick(kpId, d, rng)
  }
  if (roll < 0.3) return genCountOnLine(kpId, d, rng)
  if (roll < 0.5) return genConnect(kpId, d, rng)
  if (roll < 0.65) return genOverlap(kpId, d, rng)
  if (roll < 0.82) return genStrips(kpId, d, rng)
  return genIllusion(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 角的认识
// ─────────────────────────────────────────────────────────────

/**
 * 一个角（顶点在原点）：一条边朝 rot 度，另一条边朝 rot + deg 度；arms 是两条边画多长。
 * vertex = 顶点画点；mark = 画弧 / 直角方块（课本的直角记号）
 */
export function angleItems(deg: number, rot: number, o: { arms?: [number, number]; vertex?: boolean; mark?: 'arc' | 'right' | null } = {}): GeoItem[] {
  const [l1, l2] = o.arms ?? [120, 120]
  const V: GeoPt = [0, 0]
  const A = along(V, dir(rot), l1)
  const B = along(V, dir(rot + deg), l2)
  const out: GeoItem[] = [
    { t: 'line', a: V, b: A },
    { t: 'line', a: V, b: B },
  ]
  if (o.mark) out.push(o.mark === 'right' ? { t: 'arc', at: V, a: A, b: B, right: true } : { t: 'arc', at: V, a: A, b: B })
  if (o.vertex) out.push({ t: 'dot', at: V })
  return out
}

/** 不是角的图（练习十三 1）：round = 顶点是一段圆弧；curved = 一条边是弯的 */
function notAngleItems(kind: 'round' | 'curved', deg: number, rot: number, L = 120): GeoItem[] {
  const V: GeoPt = [0, 0]
  const u1 = dir(rot)
  const u2 = dir(rot + deg)
  const A = along(V, u1, L)
  const B = along(V, u2, L)
  if (kind === 'round') {
    const r = L * 0.3
    const p1 = along(V, u1, r)
    const p2 = along(V, u2, r)
    const m: GeoPt = [(p1[0] + p2[0]) / 4, (p1[1] + p2[1]) / 4]
    return [
      { t: 'line', a: p1, b: A },
      { t: 'line', a: p2, b: B },
      { t: 'curve', pts: [p1, m, p2] },
    ]
  }
  const mid = along(along(V, u2, L * 0.5), dir(rot + deg + 90), L * 0.2)
  return [
    { t: 'line', a: V, b: A },
    { t: 'curve', pts: [V, mid, B] },
  ]
}

const ANGLE_ROTS = Array.from({ length: 24 }, (_, i) => i * 15)

/** 这个图形是角，对吗（练习十三 1；判断题一律「……，对吗？」配 对 / 不对） */
function genIsAngle(kpId: string, d: Difficulty, rng: RNG): Question {
  const yes = rng.chance(0.5)
  const deg = rng.pick([35, 50, 65, 90, 110, 130, 150])
  const rot = rng.pick(ANGLE_ROTS)
  const not = rng.pick(['round', 'curved'] as const)
  const items = yes ? angleItems(deg, rot, { arms: [rng.int(9, 13) * 10, rng.int(9, 13) * 10] }) : notAngleItems(not, deg, rot)
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `is-${yes ? 'y' : not}-${deg}-${rot}`,
    // 图的说明不说是不是角（静态页会印出来）
    stem: [text('m3.line.isAngle'), geoPart([fitFig(items, 14)], '（一个由两条线组成的图形）')],
    correct: { k: yes ? 'm3.line.ok' : 'm3.line.notOk' },
    distractors: [{ k: yes ? 'm3.line.notOk' : 'm3.line.ok' }],
    rng,
  })
}

/** 一个角有几个顶点（1）、几条边（2） */
function genParts(kpId: string, d: Difficulty, rng: RNG): Question {
  const vertex = rng.chance(0.5)
  const deg = rng.pick([40, 60, 90, 120, 140])
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `parts-${vertex ? 'v' : 'e'}`,
    stem: [text(vertex ? 'm3.line.vertexCount' : 'm3.line.sideCount'), geoPart([fitFig(angleItems(deg, rng.pick(ANGLE_ROTS), { vertex: true, mark: deg === 90 ? 'right' : 'arc' }), 14)], '（一个角：顶点画着圆点）')],
    value: vertex ? 1 : 2,
    rng,
    min: 0,
    max: 4,
    smart: vertex ? [2, 0, 3] : [1, 3, 4],
  })
}

/** 角通常用符号「∠」来表示，右图的角可以记作「∠1」（p66）：图上角里标着一个数，选它的记法 */
function genSymbol(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(1, 4)
  const deg = rng.pick([30, 40, 50, 60, 70, 110, 130])
  const rot = rng.pick([0, 0, 15, 30, 330, 345])
  const items: GeoItem[] = [...angleItems(deg, rot, { arms: [130, 120], vertex: true, mark: 'arc' }), { t: 'text', at: along([0, 0], dir(rot + deg / 2), 42), text: String(n) }]
  // 选项读出来是「1」「1」（∠ 不读），答错时只读正确答案，所以不用另配读法
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `sym-${n}-${deg}-${rot}`,
    stem: [text('m3.line.symbolQ'), geoPart([fitFig(items, 14)], `（一个角，角里标着数 ${n}）`)],
    correct: `∠${n}`,
    distractors: [`${n}∠`, '∠'],
    rng,
  })
}

/** 角的定义、张口越大角越大（p66） */
function genAngleDef(kpId: string, d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['def', 'sides', 'fan'] as const)
  if (which === 'fan') {
    return labelQuestion({
      kpId,
      type: 'angle',
      difficulty: d,
      sig: 'def-fan',
      stem: [text('m3.line.fanQ')],
      correct: { k: 'm3.line.getBigger' },
      distractors: [{ k: 'm3.line.getSmaller' }, { k: 'm3.line.noChange' }],
      rng,
    })
  }
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `def-${which}`,
    stem: [text(which === 'def' ? 'm3.line.angleDef' : 'm3.line.angleSides')],
    correct: kindL('ray'),
    distractors: [kindL('segment'), kindL('line')],
    rng,
  })
}

/** 剪去一个角的图怎么剪（说明不说剩下几个角） */
const CUT_ALT = {
  sides: '（一张正方形纸，虚线从相邻两条边上各取一点，剪去一个角）',
  vertex: '（一张正方形纸，虚线从一个顶点剪到一条边上）',
  diagonal: '（一张正方形纸，虚线连着两个相对的顶点）',
} as const

/** 多边形有几个角、几条线段（练习十四 2）：d1 规则的三、四、五边形，d2 起有不规则的、六边形、八边形 */
function genPolyAngles(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? rng.pick([3, 4, 4, 5]) : rng.pick([4, 5, 6, 8])
  const regular = d === 1 || rng.chance(0.5)
  const pts = regular ? regularPts(n, 70, rng.int(0, 23) * 15) : irregularPts(n, 75, rng)
  const ask = d >= 2 && rng.chance(0.4) ? 'segs' : 'angles'
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `poly-${ask}-${n}-${shapeSig(pts)}`,
    stem: [text(ask === 'segs' ? 'm3.line.segsIn' : 'm3.line.anglesIn'), geoPart([fitFig([{ t: 'poly', pts, fill: 'b', stroke: 'b' }], 12)], `（一个${regular ? '' : '不规则的'}多边形）`)],
    value: n,
    rng,
    min: 0,
    max: 12,
    smart: [n - 1, n + 1, 2 * n],
  })
}

/** 两个角比大小（张口越大角越大）：大的那个故意画短一些的边 */
function genBigger(kpId: string, d: Difficulty, rng: RNG): Question {
  let a = 0
  let b = 0
  do {
    a = rng.int(5, 30) * 5
    b = rng.int(5, 30) * 5
  } while (Math.abs(a - b) < (d === 3 ? 20 : 30))
  const big = a > b ? 1 : 2
  const figs = [a, b].map((deg, i) => {
    const long = (i + 1 === big ? rng.int(6, 8) : rng.int(11, 13)) * 10
    const rot = rng.int(0, 20) * 5 - (deg > 90 ? 30 : 0)
    return fitFig(angleItems(deg, rot, { arms: [long, long], vertex: true, mark: 'arc' }), 10)
  })
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `bigger-${a}-${b}`,
    stem: [text('m3.line.whichBigger'), geoPart(figs, '（两个角，编号 1、2，边画得一长一短）', true)],
    correct: String(big),
    distractors: [String(3 - big), { k: 'm3.line.same' }],
    rng,
  })
}

/** 两条直线相交：组成几个角（4）、相交于哪个点（O）（练习十四 3） */
function genCross(kpId: string, d: Difficulty, rng: RNG): Question {
  const a1 = rng.int(-6, 6) * 5
  const a2 = a1 + rng.int(8, 16) * 5
  const L = 95
  const O: GeoPt = [0, 0]
  const pA = along(O, dir(a1 + 180), L * 0.78)
  const pB = along(O, dir(a1), L * 0.78)
  const pC = along(O, dir(a2), L * 0.78)
  const pD = along(O, dir(a2 + 180), L * 0.78)
  const items: GeoItem[] = [
    { t: 'line', a: along(O, dir(a1 + 180), L), b: along(O, dir(a1), L) },
    { t: 'line', a: along(O, dir(a2 + 180), L), b: along(O, dir(a2), L) },
    // 字母标在「大角」那一侧（两条线夹的小角里太挤）
    { t: 'dot', at: pA, label: 'A', side: sideOf(dir(a1 + 90)) },
    { t: 'dot', at: pB, label: 'B', side: sideOf(dir(a1 - 90)) },
    { t: 'dot', at: pC, label: 'C', side: sideOf(dir(a2 + 90)) },
    { t: 'dot', at: pD, label: 'D', side: sideOf(dir(a2 - 90)) },
    { t: 'dot', at: O, label: 'O', side: sideOf(dir((a1 + a2) / 2 + 90)) },
  ]
  const fig = geoPart([fitFig(items, 16)], '（直线 AB 和直线 CD 相交于点 O）')
  if (rng.chance(d === 2 ? 0.7 : 0.5)) {
    return numberQuestion({
      kpId,
      type: 'angle',
      difficulty: d,
      sig: `cross-n-${a1}-${a2}`,
      stem: [text('m3.line.cross'), fig],
      value: 4,
      rng,
      min: 0,
      max: 8,
      smart: [2, 3, 6],
    })
  }
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `cross-o-${a1}-${a2}`,
    stem: [text('m3.line.crossAt'), fig],
    correct: 'O',
    distractors: rng.pick([
      ['A', 'C'],
      ['B', 'D'],
      ['A', 'D'],
    ]),
    rng,
  })
}

/** 从一个顶点引出 3 / 4 条射线，一共有几个角（练习十三 6：3、6） */
function genFan(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([3, 3, 4, 4, 4])
  const start = rng.int(0, 6) * 5
  const angles = [start]
  for (let i = 1; i < n; i++) angles.push(angles[i - 1]! + rng.int(5, 9) * 5)
  const items: GeoItem[] = [...angles.map((a): GeoItem => ({ t: 'line', a: [0, 0], b: along([0, 0], dir(a), rng.int(12, 15) * 10) })), { t: 'dot', at: [0, 0] }]
  const value = (n * (n - 1)) / 2
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `fan-${angles.join('.')}`,
    stem: [text('m3.line.fanCount'), geoPart([fitFig(items, 14)], `（从一个顶点引出 ${n} 条射线）`)],
    value,
    rng,
    min: 0,
    max: 12,
    smart: [n - 1, n, value + 1],
  })
}

/** 正方体 / 长方体盒子上的直角（练习十四 *4：每个面 4 个，一共 24 个） */
function genCube(kpId: string, d: Difficulty, rng: RNG): Question {
  const pick = rng.pick([
    { key: 'm3.line.cubeFace', shape: 'cube' as const, value: 4, smart: [2, 3, 6] },
    { key: 'm3.line.cubeAll', shape: 'cube' as const, value: 24, smart: [6, 8, 12] },
    { key: 'm3.line.cuboidAll', shape: 'cuboid' as const, value: 24, smart: [6, 8, 12] },
  ])
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `cube-${pick.key}`,
    stem: [text(pick.key), { kind: 'shape', shape: pick.shape }],
    value: pick.value,
    rng,
    min: 0,
    max: 40,
    smart: pick.smart,
  })
}

/** 正方形纸剪去一个角还剩几个角（练习十三 8）：剪法画成虚线——从两条边上剪剩 5 个，从一个顶点剪到边上剩 4 个，沿对角线剪剩 3 个 */
function genCut(kpId: string, d: Difficulty, rng: RNG): Question {
  const way = rng.pick(['sides', 'vertex', 'diagonal'] as const)
  const s = 120
  const turn = rng.int(0, 3) * 90
  let keep: GeoPt[]
  let cut: GeoPt[]
  if (way === 'sides') {
    const a = rng.int(5, 7) * 10
    const b = rng.int(4, 7) * 10
    keep = [
      [0, 0],
      [a, 0],
      [s, s - b],
      [s, s],
      [0, s],
    ]
    cut = [
      [a, 0],
      [s, 0],
      [s, s - b],
    ]
  } else if (way === 'vertex') {
    const b = rng.int(4, 8) * 10
    keep = [
      [0, 0],
      [s, s - b],
      [s, s],
      [0, s],
    ]
    cut = [
      [0, 0],
      [s, 0],
      [s, s - b],
    ]
  } else {
    keep = [
      [0, 0],
      [s, s],
      [0, s],
    ]
    cut = [
      [0, 0],
      [s, 0],
      [s, s],
    ]
  }
  const c: GeoPt = [s / 2, s / 2]
  const tr = (p: GeoPt): GeoPt => rotate(p, turn, c)
  const items: GeoItem[] = [
    { t: 'poly', pts: cut.map(tr), fill: 'soft', stroke: 'soft', dash: true },
    { t: 'poly', pts: keep.map(tr), fill: 'a', stroke: 'a' },
    { t: 'line', a: tr(cut[0]!), b: tr(cut[2]!), stroke: 'd', dash: true },
  ]
  const value = { sides: 5, vertex: 4, diagonal: 3 }[way]
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `cut-${way}-${turn}-${shapeSig(keep)}`,
    stem: [text('m3.line.cut'), geoPart([fitFig(items, 12)], CUT_ALT[way])],
    value,
    rng,
    min: 0,
    max: 8,
    smart: [3, 4, 5, 6].filter((x) => x !== value),
  })
}

defineGenerator('m3s1-07-angles', (d, rng) => {
  const kpId = 'm3s1-07-angles'
  const roll = rng.next()
  if (d === 1) {
    // p66–67：角的定义、顶点和边、「∠1」的记法、打开折扇张口越大角越大；练习十四 2 数多边形的角
    if (roll < 0.28) return genIsAngle(kpId, d, rng)
    if (roll < 0.44) return genParts(kpId, d, rng)
    if (roll < 0.6) return genAngleDef(kpId, d, rng)
    if (roll < 0.72) return genSymbol(kpId, d, rng)
    if (roll < 0.82) return genBigger(kpId, d, rng)
    return genPolyAngles(kpId, d, rng)
  }
  if (d === 2) return roll < 0.3 ? genPolyAngles(kpId, d, rng) : roll < 0.6 ? genBigger(kpId, d, rng) : roll < 0.82 ? genCross(kpId, d, rng) : genIsAngle(kpId, d, rng)
  return roll < 0.3 ? genFan(kpId, d, rng) : roll < 0.5 ? genCube(kpId, d, rng) : roll < 0.8 ? genCut(kpId, d, rng) : genBigger(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 锐角、直角、钝角：锐角比直角小，钝角比直角大（这一册只和直角比，不量度数）
// ─────────────────────────────────────────────────────────────

type AngleKind = 'acute' | 'right' | 'obtuse'
const AKINDS: AngleKind[] = ['acute', 'right', 'obtuse']
const akindL = (k: AngleKind): LStr => ({ k: `m3.line.${k}` })
const kindOf = (deg: number): AngleKind => (deg < 90 ? 'acute' : deg === 90 ? 'right' : 'obtuse')

/** 按档取一个角的度数：d1 / d2 锐角 25–65、钝角 115–160（离直角远），d3 锐角 65–78、钝角 102–115（接近直角） */
function degOf(kind: AngleKind, d: Difficulty, rng: RNG): number {
  if (kind === 'right') return 90
  if (d === 3) return kind === 'acute' ? rng.pick([65, 68, 70, 72, 75]) : rng.pick([105, 108, 110, 112, 115])
  return kind === 'acute' ? rng.int(5, 13) * 5 : rng.int(23, 32) * 5
}

/** 看一个角，选锐角 / 直角 / 钝角；直角的小方块有时画、有时不画，d3 是接近直角的角 */
function genKind(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick<AngleKind>(['acute', 'acute', 'right', 'obtuse', 'obtuse'])
  const deg = degOf(kind, d, rng)
  const rot = rng.pick(ANGLE_ROTS)
  const mark: 'arc' | 'right' | null = kind === 'right' ? (rng.chance(d === 1 ? 0.5 : d === 2 ? 0.25 : 0) ? 'right' : null) : rng.chance(d === 1 ? 0.6 : 0.3) ? 'arc' : null
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `kind-${deg}-${rot}-${mark ?? 'n'}`,
    stem: [text('m3.line.kindQ'), geoPart([fitFig(angleItems(deg, rot, { vertex: true, mark }), 14)], `（一个角${mark === 'right' ? '，顶点处画着小方块' : ''}）`)],
    correct: akindL(kind),
    distractors: AKINDS.filter((k) => k !== kind).map(akindL),
    rng,
  })
}

/** 三个角（锐角、直角、钝角）里挑出指定的一种 */
function genPickKind(kpId: string, d: Difficulty, rng: RNG): Question {
  const target = rng.pick(AKINDS)
  const order = rng.shuffle(AKINDS)
  const degs = order.map((k) => degOf(k, d, rng))
  const figs = degs.map((deg) => fitFig(angleItems(deg, rng.int(0, 7) * 5, { arms: [80, 80], vertex: true, mark: deg === 90 && d === 1 && rng.chance(0.5) ? 'right' : null }), 8))
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `pk-${target}-${degs.join('.')}`,
    stem: [text('m3.line.pick', { kind: akindL(target) }), geoPart(figs, '（三个角，编号 1 到 3）', true)],
    value: order.indexOf(target) + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 锐角、钝角和直角比（p68） */
function genKindDef(kpId: string, d: Difficulty, rng: RNG): Question {
  const f = rng.pick([
    { key: 'm3.line.smaller', correct: akindL('acute'), distractors: [akindL('right'), akindL('obtuse')] },
    { key: 'm3.line.larger', correct: akindL('obtuse'), distractors: [akindL('right'), akindL('acute')] },
    { key: 'm3.line.acuteVs', correct: akindL('right'), distractors: [akindL('acute'), { k: 'm3.line.same' }] },
    { key: 'm3.line.obtuseVs', correct: akindL('obtuse'), distractors: [akindL('right'), { k: 'm3.line.same' }] },
  ])
  return labelQuestion({ kpId, type: 'angle', difficulty: d, sig: `kdef-${f.key}`, stem: [text(f.key)], correct: f.correct, distractors: f.distractors, rng })
}

/** 三角尺：斜边上是两个锐角，另一个是直角（外面一个直角三角形，中间挖空一个小的） */
function rulerItems(sixty: boolean): GeoItem[] {
  const a = 110
  const b = sixty ? 190 : 110
  const outer: GeoPt[] = [
    [0, 0],
    [0, a],
    [b, a],
  ]
  const k = 0.42
  const inner: GeoPt[] = [
    [a * 0.2, a * 0.2 + a * (1 - k) * 0.5],
    [a * 0.2, a * 0.2 + a * (1 - k) * 0.5 + a * k],
    [a * 0.2 + b * k, a * 0.2 + a * (1 - k) * 0.5 + a * k],
  ]
  return [
    { t: 'poly', pts: outer, fill: 'b', stroke: 'b' },
    { t: 'poly', pts: inner, fill: 'paper', stroke: 'b' },
  ]
}

function genRuler(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['right', 'acute'] as const)
  const sixty = rng.chance(0.5)
  const value = kind === 'right' ? 1 : 2
  const turn = rng.pick([0, 0, 90, 180])
  const items = rulerItems(sixty).map((it) => mapItem(it, (p) => rotate(p, turn, [55, 55])))
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `ruler-${kind}-${sixty ? 60 : 45}`,
    stem: [text('m3.line.rulerQ', { kind: akindL(kind) }), geoPart([fitFig(items, 12)], '（一个三角尺）')],
    value,
    rng,
    min: 0,
    max: 4,
    smart: [0, 1, 2, 3].filter((x) => x !== value),
  })
}

/** 整时钟面上时针和分针组成的角（p66 的 4 时钟面）：3 时、9 时直角，1、2、10、11 时锐角，4、5、7、8 时钝角 */
function genClock(kpId: string, d: Difficulty, rng: RNG): Question {
  const hour = rng.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11])
  const kind: AngleKind = hour === 3 || hour === 9 ? 'right' : [1, 2, 10, 11].includes(hour) ? 'acute' : 'obtuse'
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `clock-${hour}`,
    stem: [text('m3.line.clock'), { kind: 'clock', hour, minute: 0 }],
    correct: akindL(kind),
    distractors: AKINDS.filter((k) => k !== kind).map(akindL),
    rng,
  })
}

/** 三角形：直角三角形（直角 + 两个锐角）、锐角三角形（三个锐角）、钝角三角形（钝角 + 两个锐角）；按两个底角的度数画 */
function trianglePts(kind: AngleKind, rng: RNG): { pts: GeoPt[]; angles: number[] } {
  let A = 0
  let B = 0
  if (kind === 'right') {
    A = 90
    B = rng.int(6, 12) * 5
  } else if (kind === 'acute') {
    // 三个角都在 45°–80° 之间
    A = rng.int(10, 15) * 5
    B = rng.int(Math.max(10, 19 - A / 5), Math.min(15, 27 - A / 5)) * 5
  } else {
    // 钝角 110°–130°，另外两个角都不小于 20°
    A = rng.int(22, 26) * 5
    B = rng.int(5, Math.min(8, 32 - A / 5)) * 5
  }
  const C = 180 - A - B
  const base = 160
  // 底边 AB 在 x 轴上，顶点由两个底角定
  const tA = Math.tan(rad(A))
  const tB = Math.tan(rad(B))
  let x: number
  let h: number
  if (A === 90) {
    x = 0
    h = base * tB
  } else {
    x = (base * tB) / (tA + tB)
    h = x * tA
  }
  const pts: GeoPt[] = [
    [0, 0],
    [base, 0],
    [x, -h],
  ]
  return { pts, angles: [A, B, C] }
}

/** 数一数图形里有几个直角 / 锐角 / 钝角（做一做 p68 2、练习十三 5） */
function genCountKind(kpId: string, d: Difficulty, rng: RNG): Question {
  let pts: GeoPt[]
  let angles: number[]
  let name: string
  let rtri = false
  // 第 1、2 档是做一做 p68 2 的三种图形（长方形、正方形、直角三角形）；第 3 档是练习十三 5 的各种三角形和四边形
  if (d <= 2) {
    const s = rng.pick(['rect', 'square', 'rtri'] as const)
    if (s === 'rtri') ({ pts, angles } = trianglePts('right', rng))
    else {
      const w = s === 'square' ? 110 : rng.int(15, 19) * 10
      const h = s === 'square' ? 110 : rng.int(8, 11) * 10
      pts = [
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
      ]
      angles = [90, 90, 90, 90]
    }
    // 说明里不说「直角三角形」（静态页会印出来，等于把直角数写出来）
    name = { rect: '长方形', square: '正方形', rtri: '三角形' }[s]
    rtri = s === 'rtri'
  } else if (rng.chance(0.5)) {
    const kind = rng.pick(AKINDS)
    ;({ pts, angles } = trianglePts(kind, rng))
    name = '三角形'
  } else {
    const q = rng.pick(['para', 'trap', 'rtrap', 'rect'] as const)
    const a = rng.pick([50, 55, 60, 65, 70])
    const off = 60 / Math.tan(rad(a))
    if (q === 'para') {
      pts = [
        [0, 60],
        [150, 60],
        [150 + off, 0],
        [off, 0],
      ]
      angles = [a, 180 - a, a, 180 - a]
    } else if (q === 'trap') {
      pts = [
        [0, 60],
        [170, 60],
        [170 - off, 0],
        [off, 0],
      ]
      angles = [a, a, 180 - a, 180 - a]
    } else if (q === 'rtrap') {
      pts = [
        [0, 60],
        [160, 60],
        [160 - off, 0],
        [0, 0],
      ]
      angles = [90, a, 180 - a, 90]
    } else {
      pts = [
        [0, 0],
        [150, 0],
        [150, 80],
        [0, 80],
      ]
      angles = [90, 90, 90, 90]
    }
    // 课本没教梯形、平行四边形的名字：说明里一律叫四边形
    name = '四边形'
  }
  const ask: AngleKind = d === 1 ? 'right' : d === 2 ? (rtri && rng.chance(0.4) ? 'acute' : 'right') : rng.pick(AKINDS)
  const value = angles.filter((x) => kindOf(x) === ask).length
  const turn = rng.pick([0, 0, 15, -15, 90, 180])
  const shown = pts.map((p) => rotate(p, turn))
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `ck-${ask}-${angles.join('.')}-${turn}`,
    stem: [text('m3.line.countKind', { kind: akindL(ask) }), geoPart([fitFig([{ t: 'poly', pts: shown, fill: 'c', stroke: 'c' }], 12)], `（一个${name}）`)],
    value,
    rng,
    min: 0,
    max: 6,
    smart: [0, 1, 2, 3, 4].filter((x) => x !== value),
  })
}

defineGenerator('m3s1-07-angle-kinds', (d, rng) => {
  const kpId = 'm3s1-07-angle-kinds'
  const roll = rng.next()
  if (d === 1) {
    // p67–68：三角尺上的直角、做一做 2 数直角、例 3 锐角比直角小、钝角比直角大、「每个三角尺上都有两个锐角」
    if (roll < 0.36) return genKind(kpId, d, rng)
    if (roll < 0.54) return genPickKind(kpId, d, rng)
    if (roll < 0.7) return genKindDef(kpId, d, rng)
    if (roll < 0.9) return genCountKind(kpId, d, rng)
    return genRuler(kpId, d, rng)
  }
  if (d === 2) return roll < 0.3 ? genCountKind(kpId, d, rng) : roll < 0.58 ? genClock(kpId, d, rng) : roll < 0.68 ? genRuler(kpId, d, rng) : roll < 0.86 ? genKind(kpId, d, rng) : genPickKind(kpId, d, rng)
  return roll < 0.4 ? genKind(kpId, d, rng) : roll < 0.6 ? genPickKind(kpId, d, rng) : genCountKind(kpId, d, rng)
})
