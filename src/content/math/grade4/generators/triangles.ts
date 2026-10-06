// 四下「三角形」的生成器（四年级数学下册 B）。
import type { Difficulty, GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { NO, YES, degQuestion as angleDegQuestion, dir, fitFig, geoPart, inside, kindL, rotate, some, text } from './angles'

// ─────────────────────────────────────────────────────────────
// 三角形（四下五，第 57–68 页）：三角形的特性（例 1 边、角、顶点，定义，高和底，三角形 ABC；例 2 稳定性）、
// 三边关系（例 3 两点间的距离、任意两边的和大于第三边；例 4 四组纸条围三角形）、三角形的分类（例 5 按角分、按边认等腰 / 等边）、
// 三角形的内角和（例 6）、多边形的内角和（例 7 四边形 360°、做一做六边形、练习十六 4 的表）。
// 课本没有的不出：画在三角形外面的高、外角、「两边之差」、不等边三角形、△ 记号、图形的拼组。
// 画图题只出能判对错的部分（哪幅图里的虚线是这条底上的高）。图都用 GeoFigure（kind: 'geo'），按真实的角度画：
// 三角形蓝边、高是红色虚线、垂足画直角记号，角里写度数 / ? / 编号，图里只放数、字母、°、emoji。
// ─────────────────────────────────────────────────────────────

const T = 'triangle' as const

/** 度数的题（题型记 triangle）：数字键盘按数，选项写成「60°」 */
const degQuestion = (o: Omit<Parameters<typeof angleDegQuestion>[0], 'type'>): Question => angleDegQuestion({ ...o, type: T })
/** 几个词条里选一个 */
function pickWord(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: string, wrong: string[]): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig, stem, correct: { k: correct }, distractors: wrong.map((k): LStr => ({ k })), rng })
}
/** 判断题（「……，对吗？」配 对 / 不对） */
function judge(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], yes: boolean): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig, stem, correct: yes ? YES : NO, distractors: [yes ? NO : YES], rng })
}
/** 一组编号的图里选一个：选项就是图下面的 1、2、3…… */
function pickFig(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], count: number, answer: number): Question {
  const all = Array.from({ length: count }, (_, i) => String(i + 1))
  return labelQuestion({ kpId, type: T, difficulty: d, sig, stem, correct: String(answer + 1), distractors: all.filter((x) => x !== String(answer + 1)), rng })
}

// ── 几何小工具 ──

const add = (a: GeoPt, b: GeoPt): GeoPt => [a[0] + b[0], a[1] + b[1]]
const sub = (a: GeoPt, b: GeoPt): GeoPt => [a[0] - b[0], a[1] - b[1]]
const mul = (a: GeoPt, k: number): GeoPt => [a[0] * k, a[1] * k]
const mid = (a: GeoPt, b: GeoPt): GeoPt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
const len = (v: GeoPt): number => Math.hypot(v[0], v[1])
const unit = (v: GeoPt): GeoPt => {
  const l = len(v) || 1
  return [v[0] / l, v[1] / l]
}
const lerp = (a: GeoPt, b: GeoPt, t: number): GeoPt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const centroid = (pts: GeoPt[]): GeoPt => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]

/** p 到直线 ab 的垂足，t = 垂足在 a→b 上的位置（0 在 a、1 在 b） */
export function footOn(p: GeoPt, a: GeoPt, b: GeoPt): { at: GeoPt; t: number } {
  const ab = sub(b, a)
  const t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] * ab[0] + ab[1] * ab[1])
  return { at: lerp(a, b, t), t }
}

/** 底边水平（从左往右）、左下角 alpha、右下角 beta 的三角形：[左下, 右下, 上面的顶点]（y 向下，顶点在上面） */
export function triAB(alpha: number, beta: number, L = 160): GeoPt[] {
  const gamma = 180 - alpha - beta
  const side = (L * Math.sin((beta * Math.PI) / 180)) / Math.sin((gamma * Math.PI) / 180)
  const P0: GeoPt = [0, 0]
  const P1: GeoPt = [L, 0]
  return [P0, P1, add(P0, mul(dir(alpha), side))]
}

/** 绕重心转 rot 度，再放大到最长的一条边是 size */
function place(pts: GeoPt[], rot: number, size = 170): GeoPt[] {
  const c = centroid(pts)
  const r = pts.map((p) => rotate(p, rot, c))
  const longest = Math.max(...r.map((p, i) => len(sub(r[(i + 1) % r.length]!, p))))
  return r.map((p) => mul(sub(p, c), size / longest))
}

/** 多边形第 i 个顶点的内角（度） */
export function cornerDeg(pts: GeoPt[], i: number): number {
  const n = pts.length
  const p = pts[i]!
  const a = unit(sub(pts[(i - 1 + n) % n]!, p))
  const b = unit(sub(pts[(i + 1) % n]!, p))
  return (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]))) * 180) / Math.PI
}

/** 顶点外侧的字母（从重心往顶点的方向再走 pad） */
function letters(pts: GeoPt[], names: string[], pad = 17): GeoItem[] {
  const c = centroid(pts)
  return pts.map((p, i): GeoItem => ({ t: 'text', at: add(p, mul(unit(sub(p, c)), pad)), text: names[i]!, letter: true }))
}

/** 第 i 个顶点处的角弧，角里写 label（度数、?、编号）；right = 画直角记号、不写字 */
function corner(pts: GeoPt[], i: number, label?: string, right = false): GeoItem[] {
  const n = pts.length
  const p = pts[i]!
  const prev = pts[(i - 1 + n) % n]!
  const next = pts[(i + 1) % n]!
  if (right) return [{ t: 'arc', at: p, a: prev, b: next, right: true }]
  const out: GeoItem[] = [{ t: 'arc', at: p, a: prev, b: next }]
  if (label) {
    // 字放在角里：沿角平分线从近往远找一个位置——整个字（按字数估的小方框）离三条边都有空、在三角形里面、离自己的顶点比离别的顶点近；
    // 找不到（很尖的角、对边又短）就写在这个顶点外面
    const wHalf = 5 * label.length + 1
    const hHalf = 9
    const clear = (x: GeoPt, a: GeoPt, b: GeoPt): boolean => {
      const e = unit(sub(b, a))
      const nv: GeoPt = [-e[1], e[0]]
      const dLine = Math.abs((x[0] - a[0]) * nv[0] + (x[1] - a[1]) * nv[1])
      return dLine >= wHalf * Math.abs(nv[0]) + hHalf * Math.abs(nv[1]) + 2
    }
    const side = (x: GeoPt): number => (next[0] - prev[0]) * (x[1] - prev[1]) - (next[1] - prev[1]) * (x[0] - prev[0])
    const fits = (x: GeoPt): boolean =>
      len(sub(x, p)) < 0.85 * Math.min(len(sub(x, prev)), len(sub(x, next))) && side(x) * side(p) > 0 && clear(x, p, prev) && clear(x, p, next) && clear(x, prev, next)
    // 从角上的小弧（半径 16）外面开始找
    const u = unit(sub(inside(p, prev, next, 1), p))
    const r0 = 18 + wHalf * Math.abs(u[0]) + hHalf * Math.abs(u[1])
    let at: GeoPt | null = null
    for (let rr = r0; rr <= r0 + 80 && !at; rr += 3) if (fits(inside(p, prev, next, rr))) at = inside(p, prev, next, rr)
    out.push({ t: 'text', at: at ?? inside(p, prev, next, -(14 + 5 * label.length)), text: label, tone: label === '?' ? 'd' : 'ink' })
  }
  return out
}

/** 三角形（蓝边） */
const triPoly = (pts: GeoPt[]): GeoItem => ({ t: 'poly', pts, stroke: 'b' })

/** 角里的字（度数、?、编号）互相离得够远（扁的三角形两个角挨得近，字会叠在一起） */
function labelsApart(items: GeoItem[], gap = 40): boolean {
  const at = items.filter((it): it is Extract<GeoItem, { t: 'text' }> => it.t === 'text' && !it.letter && !it.badge).map((it) => it.at)
  return at.every((p, i) => at.every((q, j) => j <= i || len(sub(p, q)) >= gap))
}

const LETTERS = ['A', 'B', 'C']

// ── 随手画的三角形（装饰用、认三角形用）：三个角都不太小 ──

const DECOR: [number, number][] = [
  [60, 70],
  [55, 45],
  [75, 50],
  [90, 40],
  [40, 35],
  [65, 65],
  [50, 80],
  [100, 40],
]
function decorTri(rng: RNG, size = 150): GeoPt[] {
  const [a, b] = rng.pick(DECOR)
  return place(triAB(a, b), rng.pick([0, 0, 10, -10, 20, -20]), size)
}

// ─────────────────────────────────────────────────────────────
// 三角形的特性（例 1、例 2）
// ─────────────────────────────────────────────────────────────

/** 例 1：三角形有几条边、几个角、几个顶点（一半配一个三角形的图，图只是陪衬，签名不看图） */
function genCount(kpId: string, d: Difficulty, rng: RNG): Question {
  const part = rng.pick(['sides', 'angles', 'vertices'] as const)
  const key = { sides: 'm4.tri.countSides', angles: 'm4.tri.countAngles', vertices: 'm4.tri.countVertices' }[part]
  const stem: StemPart[] = [text(key)]
  if (rng.chance(0.5)) stem.push(geoPart([fitFig([triPoly(decorTri(rng))], 14)], '（一个三角形）'))
  return numberQuestion({ kpId, type: T, difficulty: d, sig: `count-${part}`, stem, value: 3, rng, max: 8, min: 1, smart: [2, 4, 6] })
}

/** 认三角形用的几种图：真的三角形，和几种「不是由 3 条线段围成」的 */
export type FakeKind = 'tri' | 'gap' | 'over' | 'curve' | 'quad' | 'apart'
const FAKES: FakeKind[] = ['gap', 'over', 'curve', 'quad', 'apart']

function fakeItems(kind: FakeKind, rng: RNG): GeoItem[] {
  const [A, B, C] = decorTri(rng, 120)
  switch (kind) {
    case 'tri':
      return [triPoly([A!, B!, C!])]
    case 'gap': {
      // 有一个顶点处两条线段的端点没连上
      const [P, Q, R] = rng.shuffle([A!, B!, C!])
      return [{ t: 'poly', pts: [P!, Q!, R!, lerp(R!, P!, 0.8)], open: true, stroke: 'b' }]
    }
    case 'over': {
      // 三条线段交叉，端点伸出去
      const ext = (p: GeoPt, q: GeoPt): GeoItem => ({ t: 'line', a: lerp(p, q, -0.18), b: lerp(p, q, 1.18), stroke: 'b' })
      return [ext(A!, B!), ext(B!, C!), ext(C!, A!)]
    }
    case 'curve': {
      // 两条线段 + 一条曲线
      const m = mid(A!, B!)
      const out = mul(unit(sub(m, centroid([A!, B!, C!]))), len(sub(B!, A!)) * 0.22)
      return [
        { t: 'poly', pts: [A!, C!, B!], open: true, stroke: 'b' },
        { t: 'curve', pts: [A!, add(lerp(A!, B!, 0.25), mul(out, 0.8)), add(m, out), add(lerp(A!, B!, 0.75), mul(out, 0.8)), B!], stroke: 'b' },
      ]
    }
    case 'quad': {
      const w = rng.int(95, 120)
      const h = rng.int(60, 80)
      const s = rng.int(10, 30)
      return [{ t: 'poly', pts: [[s, 0], [w, 0], [w - s / 2, h], [0, h]], stroke: 'b' }]
    }
    case 'apart': {
      // 三条线段都没连上
      const seg = (p: GeoPt, q: GeoPt): GeoItem => ({ t: 'line', a: lerp(p, q, 0.12), b: lerp(p, q, 0.88), stroke: 'b' })
      return [seg(A!, B!), seg(B!, C!), seg(C!, A!)]
    }
  }
}

/** 例 1 的定义：下面哪个图形是三角形（第 2 档还有「哪个不是三角形」：两个三角形 + 一个不是的） */
function genIsTriangle(kpId: string, d: Difficulty, rng: RNG, not = false): Question {
  // 三幅一排（四幅在手机上要折成两行，一屏放不下）
  const kinds: FakeKind[] = not ? [rng.pick(FAKES), 'tri', 'tri'] : ['tri', ...some(rng, FAKES, 2)]
  const order = rng.shuffle(kinds)
  const figs = order.map((k) => fitFig(fakeItems(k, rng), 8))
  const answer = not ? order.findIndex((k) => k !== 'tri') : order.indexOf('tri')
  return pickFig(
    kpId,
    d,
    rng,
    `${not ? 'nottri' : 'istri'}-${order.join('.')}`,
    [text(not ? 'm4.tri.notTriQ' : 'm4.tri.isTriQ'), geoPart(figs, `（${order.length} 个由线段或曲线组成的图形，下面标着 1 到 ${order.length}）`, true)],
    order.length,
    answer,
  )
}

/** 例 1 的定义填名称 */
function genDefine(kpId: string, d: Difficulty, rng: RNG): Question {
  return pickWord(kpId, d, rng, 'def', [text('m4.tri.defQ')], 'm4.tri.triangle', ['m4.tri.quad', 'm4.tri.angleWord'])
}

// ── 高和底 ──

/** 画高用的三角形：锐角三角形以水平的边为底；直角三角形以斜边为底（高从直角顶点画）；钝角三角形以最长的边为底——高都画在三角形里面 */
export type HFam = 'acute' | 'right' | 'obtuse'
export interface HTri {
  pts: GeoPt[]
  /** 底的两个端点下标 */
  base: [number, number]
  /** 高从哪个顶点画 */
  v: number
  fam: HFam
  key: string
}
function heightTri(rng: RNG, fam: HFam, rot: number): HTri {
  if (fam === 'acute') {
    let a = 60
    let b = 60
    do {
      a = rng.int(10, 15) * 5
      b = rng.int(10, 15) * 5
    } while (Math.abs(a - b) < 15 || 180 - a - b < 45 || 180 - a - b > 80)
    return { pts: place(triAB(a, b), rot), base: [0, 1], v: 2, fam, key: `a${a}.${b}.${rot}` }
  }
  if (fam === 'right') {
    // 直角在左下或右下，两条直角边一横一竖；底是斜边
    const b = rng.int(6, 11) * 5
    const left = rng.chance(0.5)
    const pts = left ? triAB(90, b) : triAB(b, 90)
    const v = left ? 0 : 1
    const base: [number, number] = left ? [1, 2] : [0, 2]
    return { pts: place(pts, rot), base, v, fam, key: `r${b}${left ? 'L' : 'R'}.${rot}` }
  }
  let a = 30
  let b = 30
  do {
    a = rng.int(4, 9) * 5
    b = rng.int(4, 9) * 5
  } while (Math.abs(a - b) < 10 || 180 - a - b < 105 || 180 - a - b > 125)
  return { pts: place(triAB(a, b), rot), base: [0, 1], v: 2, fam, key: `o${a}.${b}.${rot}` }
}

/** 高的虚线 + 垂足处的直角记号 */
function heightItems(t: HTri, stroke: 'd' | 'ink' = 'd'): GeoItem[] {
  const V = t.pts[t.v]!
  const P = t.pts[t.base[0]]!
  const Q = t.pts[t.base[1]]!
  const F = footOn(V, P, Q).at
  const far = len(sub(Q, F)) > len(sub(P, F)) ? Q : P
  return [
    { t: 'line', a: V, b: F, stroke, dash: true },
    { t: 'arc', at: F, a: far, b: V, right: true },
  ]
}

const fams = (d: Difficulty, rng: RNG): HFam => rng.pick<HFam>(d === 1 ? ['acute', 'acute', 'right', 'obtuse'] : ['acute', 'right', 'obtuse', 'obtuse'])
const rots = (d: Difficulty, rng: RNG): number => rng.pick(d === 1 ? [0, 0, 0, 10, -10] : [0, 15, -15, 180, 165, 195])

/** 一个画了高的三角形 ABC：红色虚线是什么、BC 是什么、从哪个顶点画的、哪条边上的高 */
function genHeightName(kpId: string, d: Difficulty, rng: RNG): Question {
  const t = heightTri(rng, fams(d, rng), rots(d, rng))
  // 顶点的字母：课本的图 A 在上、B 左下、C 右下；第 1 档高总从 A 画，「从哪个顶点」「哪条边上」的题字母打乱
  const ask = rng.pick(['what', 'base', 'from', 'on'] as const)
  const names = ask === 'from' || ask === 'on' ? rng.shuffle(LETTERS) : t.v === 2 ? ['B', 'C', 'A'] : t.v === 0 ? ['A', 'B', 'C'] : ['B', 'A', 'C']
  const items: GeoItem[] = [triPoly(t.pts), ...heightItems(t), ...letters(t.pts, names)]
  const V = names[t.v]!
  const side = [names[t.base[0]]!, names[t.base[1]]!].sort().join('')
  const fig = geoPart([fitFig(items, 22)], `（三角形 ${[...names].sort().join('')}，从一个顶点向对边画了一条红色虚线，垂足处画着直角记号）`)
  const sig = `hname-${ask}-${t.key}-${names.join('')}`
  if (ask === 'what') return pickWord(kpId, d, rng, sig, [text('m4.tri.heightWhatQ'), fig], 'm4.tri.height', ['m4.tri.base', 'm4.tri.side'])
  if (ask === 'base') return pickWord(kpId, d, rng, sig, [text('m4.tri.baseWhatQ', { v: V, s: side }), fig], 'm4.tri.base', ['m4.tri.height', 'm4.tri.vertex'])
  if (ask === 'from') return labelQuestion({ kpId, type: T, difficulty: d, sig, stem: [text('m4.tri.fromWhichQ'), fig], correct: V, distractors: LETTERS.filter((x) => x !== V), rng })
  const sides = ['AB', 'AC', 'BC']
  return labelQuestion({ kpId, type: T, difficulty: d, sig, stem: [text('m4.tri.onWhichQ'), fig], correct: side, distractors: sides.filter((x) => x !== side), rng })
}

/** 「高」的定义：顶点和什么之间的线段 */
function genFoot(kpId: string, d: Difficulty, rng: RNG): Question {
  return pickWord(kpId, d, rng, 'foot', [text('m4.tri.footQ')], 'm4.tri.foot', ['m4.tri.midpoint', 'm4.tri.otherVertex'])
}

/** 画错的高：连到底的中点（不垂直）、另一个顶点到它对边的高（垂直，但不是这条底上的）、垂直于底但不从对着的顶点画 */
export type HWrong = 'mid' | 'other' | 'off'
function wrongHeight(t: HTri, w: HWrong): GeoItem[] | null {
  const V = t.pts[t.v]!
  const P = t.pts[t.base[0]]!
  const Q = t.pts[t.base[1]]!
  const baseLen = len(sub(Q, P))
  if (w === 'mid') {
    const M = mid(P, Q)
    if (len(sub(M, footOn(V, P, Q).at)) < baseLen * 0.13) return null
    return [{ t: 'line', a: V, b: M, stroke: 'ink', dash: true }]
  }
  if (w === 'other') {
    if (t.fam !== 'acute') return null
    const f = footOn(P, V, Q)
    if (f.t < 0.12 || f.t > 0.88) return null
    return [
      { t: 'line', a: P, b: f.at, stroke: 'ink', dash: true },
      { t: 'arc', at: f.at, a: f.t > 0.5 ? V : Q, b: P, right: true },
    ]
  }
  // 从另一条边的中间往底作垂线（垂直于底，但不经过对着的顶点）
  const X = lerp(V, offSide(t) ? P : Q, 0.45)
  const f = footOn(X, P, Q)
  if (f.t < 0.1 || f.t > 0.9 || len(sub(f.at, footOn(V, P, Q).at)) < baseLen * 0.12) return null
  return [
    { t: 'line', a: X, b: f.at, stroke: 'ink', dash: true },
    { t: 'arc', at: f.at, a: f.t > 0.5 ? P : Q, b: X, right: true },
  ]
}
/** 「off」画在哪条边上：按三角形的签名定（同一道题同一个图） */
const offSide = (t: HTri): boolean => t.key.length % 2 === 0

/** 做一做、练习十五 1：画出指定底边上的高 → 哪幅图中的虚线是红色这条底上的高（三幅图是同一个三角形） */
function genPickHeight(kpId: string, d: Difficulty, rng: RNG): Question {
  let t = heightTri(rng, fams(d, rng), rots(d, rng))
  let wrongs: HWrong[] = []
  for (let k = 0; ; k++) {
    wrongs = (['mid', 'other', 'off'] as HWrong[]).filter((w) => wrongHeight(t, w))
    if (wrongs.length >= 2) break
    // 一般几次就有；实在凑不出两种画错的，用一个固定的锐角三角形（55°、75°）
    t = k < 30 ? heightTri(rng, fams(d, rng), rots(d, rng)) : { pts: place(triAB(55, 75), 0), base: [0, 1], v: 2, fam: 'acute', key: 'a55.75.0' }
  }
  const pick = some(rng, wrongs, 2)
  const order = rng.shuffle<'ok' | HWrong>(['ok', ...pick])
  const P = t.pts[t.base[0]]!
  const Q = t.pts[t.base[1]]!
  const figs = order.map((k) => {
    const dash = k === 'ok' ? heightItems(t, 'ink') : wrongHeight(t, k)!
    return fitFig([triPoly(t.pts), { t: 'line', a: P, b: Q, stroke: 'd' }, ...dash], 10)
  })
  return pickFig(
    kpId,
    d,
    rng,
    `pick-${t.key}-${order.join('.')}`,
    [text('m4.tri.pickHeightQ'), geoPart(figs, '（同一个三角形画了三次，红色的边是底，每幅图里画了一条虚线）', true)],
    3,
    order.indexOf('ok'),
  )
}

/** 例 1 机器人：一个三角形可以画几条高 */
function genHeightCount(kpId: string, d: Difficulty, rng: RNG): Question {
  return numberQuestion({ kpId, type: T, difficulty: d, sig: 'hcount', stem: [text('m4.tri.heightCountQ')], value: 3, rng, max: 6, min: 1, smart: [1, 2, 4] })
}

/** 三角形 ABC 里顶点的对边（高要画到对边上） */
function genOpposite(kpId: string, d: Difficulty, rng: RNG): Question {
  const v = rng.pick(LETTERS)
  const side = LETTERS.filter((x) => x !== v).join('')
  const phr = rng.pick(['opp', 'draw'] as const)
  const pts = decorTri(rng, 150)
  const fig = geoPart([fitFig([triPoly(pts), ...letters(pts, ['B', 'C', 'A'])], 22)], '（三角形 ABC）')
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `opp-${phr}-${v}`,
    stem: [text(phr === 'opp' ? 'm4.tri.oppositeQ' : 'm4.tri.drawToQ', { n: 'ABC', v }), fig],
    correct: side,
    distractors: ['AB', 'AC', 'BC'].filter((x) => x !== side),
    rng,
  })
}

/** 三角形 ABC 的记法：用三个顶点的字母（第 1 档是 ABC，第 2 档换别的字母） */
const NAME_SETS = [
  ['A', 'B', 'C'],
  ['D', 'E', 'F'],
  ['E', 'F', 'G'],
  ['M', 'N', 'P'],
]
function genNotation(kpId: string, d: Difficulty, rng: RNG): Question {
  const set = d === 1 && rng.chance(0.6) ? NAME_SETS[0]! : rng.pick(NAME_SETS)
  const other = rng.pick(NAME_SETS.filter((s) => s !== set))
  const pts = decorTri(rng, 150)
  const names = rng.shuffle(set)
  const fig = geoPart([fitFig([triPoly(pts), ...letters(pts, names)], 22)], `（一个三角形，三个顶点标着 ${set.join('、')}）`)
  const name = (n: string): LStr => ({ k: 'm4.tri.triName', p: { n } })
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `name-${set.join('')}-${other.join('')}`,
    stem: [text('m4.tri.nameQ'), fig],
    correct: name(set.join('')),
    distractors: [name(set.slice(0, 2).join('')), name(other.join(''))],
    rng,
  })
}

// ── 稳定性（例 2） ──

/** 例 2 的几问：3 根同样长的小棒能围出几种三角形、哪个框架拉不动、这说明什么、生活里哪些用了三角形的稳定性 */
const USE_YES = ['m4.tri.use.ac', 'm4.tri.use.crane', 'm4.tri.use.pole', 'm4.tri.use.bike', 'm4.tri.use.roof']
const USE_NO = ['m4.tri.use.gate', 'm4.tri.use.wheel', 'm4.tri.use.board']
function genStable(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['oneKind', 'pull', 'property', 'use', 'use', 'fence', 'frame'] as const)
  if (kind === 'oneKind') return numberQuestion({ kpId, type: T, difficulty: d, sig: 'st-onekind', stem: [text('m4.tri.oneKindQ')], value: 1, rng, max: 4, min: 1, smart: [2, 3] })
  if (kind === 'pull') return pickWord(kpId, d, rng, 'st-pull', [text('m4.tri.pullQ')], 'm4.tri.triFrame', ['m4.tri.quadFrame'])
  if (kind === 'property') return pickWord(kpId, d, rng, 'st-prop', [text('m4.tri.stableQ')], 'm4.tri.stability', ['m4.tri.easyChange'])
  if (kind === 'use') {
    const yes = rng.pick(USE_YES)
    const no = some(rng, USE_NO, 2)
    return pickWord(kpId, d, rng, `st-use-${yes}-${no.join('.')}`, [text('m4.tri.useQ')], yes, no)
  }
  if (kind === 'fence') {
    // 练习十五 2：方格的篱笆和斜着钉成三角形的篱笆
    const braced = rng.chance(0.5) ? 0 : 1
    const figs = [0, 1].map((i) => fitFig(i === braced ? fenceBraced() : fenceGrid(), 8))
    return pickFig(kpId, d, rng, `st-fence-${braced}`, [text('m4.tri.fenceQ'), geoPart(figs, '（两种篱笆：一种横竖钉成方格，一种斜着钉、和横木围成三角形）', true)], 2, braced)
  }
  // 用小棒钉成的框架：三角形、四边形（正方形或平行四边形），第 2 档再加五边形
  const shapes = rng.shuffle<'tri' | 'sq' | 'para' | 'pent'>(d === 1 ? ['tri', rng.pick(['sq', 'para'] as const)] : ['tri', rng.pick(['sq', 'para'] as const), 'pent'])
  const figs = shapes.map((s) => fitFig(frameItems(s), 10))
  return pickFig(kpId, d, rng, `st-frame-${shapes.join('.')}`, [text('m4.tri.frameQ'), geoPart(figs, '（几个用小棒钉成的框架，连接处有钉子）', true)], shapes.length, shapes.indexOf('tri'))
}

function fenceGrid(): GeoItem[] {
  const out: GeoItem[] = []
  for (let i = 0; i < 4; i++) out.push({ t: 'line', a: [i * 34, 0], b: [i * 34, 86], stroke: 'a' })
  for (const y of [16, 43, 70]) out.push({ t: 'line', a: [-8, y], b: [110, y], stroke: 'a' })
  return out
}
function fenceBraced(): GeoItem[] {
  const out: GeoItem[] = []
  for (let i = 0; i < 3; i++) {
    out.push({ t: 'line', a: [i * 34, 0], b: [(i + 1) * 34, 86], stroke: 'a' })
    out.push({ t: 'line', a: [(i + 1) * 34, 0], b: [i * 34, 86], stroke: 'a' })
  }
  for (const y of [16, 43, 70]) out.push({ t: 'line', a: [-8, y], b: [110, y], stroke: 'a' })
  return out
}
function frameItems(s: 'tri' | 'sq' | 'para' | 'pent'): GeoItem[] {
  const pts: GeoPt[] =
    s === 'tri'
      ? [
          [0, 80],
          [90, 80],
          [45, 2],
        ]
      : s === 'sq'
        ? [
            [0, 0],
            [80, 0],
            [80, 80],
            [0, 80],
          ]
        : s === 'para'
          ? [
              [25, 0],
              [105, 0],
              [80, 75],
              [0, 75],
            ]
          : [0, 1, 2, 3, 4].map((k): GeoPt => [45 + 46 * Math.sin((k * 2 * Math.PI) / 5), 48 - 46 * Math.cos((k * 2 * Math.PI) / 5)])
  return [{ t: 'poly', pts, stroke: 'a' }, ...pts.map((p): GeoItem => ({ t: 'dot', at: p }))]
}

/** 判断题（第 2、3 档） */
const TRAIT_JUDGE: [string, boolean][] = [
  ['m4.tri.j.parts', true],
  ['m4.tri.j.oneHeight', false],
  ['m4.tri.j.threeSegs', false],
  ['m4.tri.j.heightDef', true],
  ['m4.tri.j.quadStable', false],
  ['m4.tri.j.heightUpright', false],
]
function genTraitJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(TRAIT_JUDGE)
  return judge(kpId, d, rng, `j-${k}`, [text(k)], yes)
}

defineGenerator('m4s2-05-traits', (d, rng) => {
  const kpId = 'm4s2-05-traits'
  const roll = rng.next()
  if (d === 1) {
    // 例 1：边、角、顶点，三角形的定义，高和底（垂足、对边），一个三角形能画几条高，三角形 ABC；做一做画指定底边上的高；例 2 稳定性
    if (roll < 0.1) return genCount(kpId, d, rng)
    if (roll < 0.22) return genIsTriangle(kpId, d, rng)
    if (roll < 0.27) return genDefine(kpId, d, rng)
    if (roll < 0.42) return genHeightName(kpId, d, rng)
    if (roll < 0.47) return genFoot(kpId, d, rng)
    if (roll < 0.61) return genPickHeight(kpId, d, rng)
    if (roll < 0.65) return genHeightCount(kpId, d, rng)
    if (roll < 0.72) return genOpposite(kpId, d, rng)
    if (roll < 0.79) return genNotation(kpId, d, rng)
    return genStable(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十五 1（画高）、2（围篱笆）；判断题
    if (roll < 0.14) return genIsTriangle(kpId, d, rng, true)
    if (roll < 0.36) return genPickHeight(kpId, d, rng)
    if (roll < 0.52) return genHeightName(kpId, d, rng)
    if (roll < 0.7) return genStable(kpId, d, rng)
    if (roll < 0.88) return genTraitJudge(kpId, d, rng)
    return genNotation(kpId, d, rng)
  }
  if (roll < 0.4) return genPickHeight(kpId, d, rng)
  if (roll < 0.7) return genTraitJudge(kpId, d, rng)
  if (roll < 0.85) return genIsTriangle(kpId, d, rng, true)
  return genStable(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 三角形的三边关系（例 3、例 4，练习十五 5、6、7，练习十六 6(2)）
// ─────────────────────────────────────────────────────────────

/** 例 3、练习十五 5：从 🏠 到 🏫 的三条路，哪条最近（直的那条）；路上标着 1、2、3 */
export type RouteLayout = 'kite' | 'quad' | 'curve'
function genRoute(kpId: string, d: Difficulty, rng: RNG): Question {
  const layout = rng.pick<RouteLayout>(['kite', 'kite', 'quad', 'curve'])
  const nums = rng.shuffle(['1', '2', '3'])
  let H: GeoPt
  let S: GeoPt
  const routes: { items: GeoItem[]; at: GeoPt; straight: boolean }[] = []
  if (layout === 'quad') {
    // 练习十五 5：学校在左上，出发点在右下，另两个地方在右上、左下
    S = [0, 0]
    H = [240, 150]
    const TR: GeoPt = [rng.int(170, 200), rng.int(5, 20)]
    const BL: GeoPt = [rng.int(-60, -40), rng.int(135, 150)]
    routes.push({ items: [{ t: 'line', a: H, b: S, stroke: 'b' }], at: lerp(H, S, 0.5), straight: true })
    routes.push({ items: [{ t: 'poly', pts: [H, TR, S], open: true, stroke: 'b' }, { t: 'dot', at: TR }], at: add(TR, [14, -14]), straight: false })
    routes.push({ items: [{ t: 'poly', pts: [H, BL, S], open: true, stroke: 'b' }, { t: 'dot', at: BL }], at: add(BL, [-14, 14]), straight: false })
  } else {
    H = [0, 0]
    S = [270, 0]
    const P: GeoPt = [rng.int(100, 160), -rng.int(55, 75)]
    const Q: GeoPt = [rng.int(90, 170), rng.int(55, 75)]
    routes.push({ items: [{ t: 'line', a: H, b: S, stroke: 'b' }], at: [135, 0], straight: true })
    if (layout === 'curve') {
      const top: GeoPt = [P[0], P[1] - 8]
      routes.push({ items: [{ t: 'curve', pts: [H, [70, -48], top, [210, -46], S], stroke: 'b' }], at: add(top, [0, -16]), straight: false })
    } else {
      routes.push({ items: [{ t: 'poly', pts: [H, P, S], open: true, stroke: 'b' }, { t: 'dot', at: P }], at: add(P, [0, -18]), straight: false })
    }
    routes.push({ items: [{ t: 'poly', pts: [H, Q, S], open: true, stroke: 'b' }, { t: 'dot', at: Q }], at: add(Q, [0, 18]), straight: false })
  }
  const away = unit(sub(H, S))
  const items: GeoItem[] = [
    ...routes.flatMap((r) => r.items),
    { t: 'dot', at: H },
    { t: 'dot', at: S },
    { t: 'text', at: add(H, mul(away, 26)), text: '🏠', big: true },
    { t: 'text', at: add(S, mul(away, -26)), text: '🏫', big: true },
    ...routes.map((r, i): GeoItem => ({ t: 'text', at: r.at, text: nums[i]!, badge: true })),
  ]
  const answer = nums[routes.findIndex((r) => r.straight)]!
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `route-${layout}-${nums.join('')}`,
    stem: [text('m4.tri.routeQ'), geoPart([fitFig(items, 14)], '（从 🏠 到 🏫 有三条路，路上标着 1、2、3：一条是直的，另两条拐了弯）')],
    correct: answer,
    distractors: nums.filter((x) => x !== answer),
    rng,
  })
}

function genShortest(kpId: string, d: Difficulty, rng: RNG): Question {
  return pickWord(kpId, d, rng, 'short', [text('m4.tri.shortQ')], 'm4.tri.segment', ['m4.tri.curveLine', 'm4.tri.brokenLine'])
}
function genDistDef(kpId: string, d: Difficulty, rng: RNG): Question {
  return pickWord(kpId, d, rng, 'dist', [text('m4.tri.distQ')], 'm4.tri.distWord', ['m4.tri.distLine', 'm4.tri.segWord'])
}
function genRule(kpId: string, d: Difficulty, rng: RNG): Question {
  return pickWord(kpId, d, rng, 'rule', [text('m4.tri.ruleQ')], 'm4.tri.gt', ['m4.tri.eq', 'm4.tri.lt'])
}

/** 三根小棒能不能围成三角形：两根短的和大于最长的那根才能（等于也不能） */
export const canForm = (s: number[]): boolean => {
  const [a, b, c] = [...s].sort((x, y) => x - y)
  return a! + b! > c!
}

/** 例 4、练习十五 6 的几组 */
const TB_SETS: [number, number, number][] = [
  [6, 7, 8],
  [4, 5, 9],
  [3, 6, 10],
  [8, 11, 11],
  [3, 4, 5],
  [3, 3, 3],
  [2, 2, 6],
  [3, 3, 5],
]
type SetKind = 'yes' | 'eq' | 'no'
/** 一组小棒（从小到大）：yes 能围成、eq 两根短的和正好等于最长的、no 两根短的和小于最长的 */
function stickSet(rng: RNG, kind: SetKind, max = 12): [number, number, number] {
  for (;;) {
    const a = rng.int(2, max - 2)
    const b = rng.int(a, max - 1)
    const c = kind === 'yes' ? rng.int(b, Math.min(max, a + b - 1)) : kind === 'eq' ? a + b : rng.int(a + b + 1, a + b + 4)
    if (c <= max && c >= b) return [a, b, c]
  }
}

/** 三根小棒按比例画（左端对齐，长度写在右端，单位厘米） */
export function sticksFig(lens: number[]): GeoFig {
  const k = 17
  const items: GeoItem[] = []
  lens.forEach((L, i) => {
    const y = i * 24
    const x1 = L * k
    items.push({ t: 'poly', pts: [[0, y], [x1, y], [x1, y + 8], [0, y + 8]], fill: 'c', stroke: 'c' })
    items.push({ t: 'text', at: [x1 + 16, y + 4], text: String(L) })
  })
  return fitFig(items, 8)
}

/** 例 4：3 根小棒的长度分别是…，能围成三角形吗 */
function genCanForm(kpId: string, d: Difficulty, rng: RNG): Question {
  let s: number[]
  if (d === 1 && rng.chance(0.4)) s = [...rng.pick(TB_SETS)]
  else s = stickSet(rng, rng.pick<SetKind>(['yes', 'yes', 'eq', 'eq', 'no']), d === 1 ? 12 : 15)
  if (d > 1) s = rng.shuffle(s)
  const [a, b, c] = s as [number, number, number]
  const ok = canForm(s)
  const stem: StemPart[] = [text('m4.tri.canQ', { a, b, c })]
  if (d === 1 || rng.chance(0.5)) stem.push(geoPart([sticksFig(s)], `（三根小棒，分别标着 ${a}、${b}、${c}）`))
  return pickWord(kpId, d, rng, `can-${a}-${b}-${c}`, stem, ok ? 'm4.tri.can' : 'm4.tri.cannot', [ok ? 'm4.tri.cannot' : 'm4.tri.can'])
}

/** 练习十五 6：哪一组能围成（第 2 档还有「哪一组不能」） */
function genPickGroup(kpId: string, d: Difficulty, rng: RNG): Question {
  const not = d > 1 && rng.chance(0.4)
  const kinds: SetKind[] = not ? ['eq', 'yes', 'yes'] : ['yes', 'eq', 'no']
  if (not && rng.chance(0.4)) kinds[0] = 'no'
  const sets: [number, number, number][] = []
  for (const k of kinds) {
    let s = stickSet(rng, k, d === 1 ? 12 : 15)
    while (sets.some((x) => x.join() === s.join())) s = stickSet(rng, k, d === 1 ? 12 : 15)
    sets.push(s)
  }
  const label = (s: number[]): LStr => ({ k: 'm4.tri.three', p: { a: s[0]!, b: s[1]!, c: s[2]! } })
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `group-${not ? 'not' : 'can'}-${sets.map((s) => s.join('.')).join('-')}`,
    stem: [text(not ? 'm4.tri.pickCannotQ' : 'm4.tri.pickCanQ')],
    correct: label(sets[0]!),
    distractors: sets.slice(1).map(label),
    rng,
  })
}

/** 练习十六 6(2)：两条边是 a 和 b，第三条边可能是几厘米（整厘米数） */
function genThird(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(2, 9)
  let b = rng.int(2, 9)
  while (b === a) b = rng.int(2, 9)
  const lo = Math.abs(a - b)
  const correct = rng.int(lo + 1, a + b - 1)
  const pool = [a + b, a + b + 1, a + b + 2, lo, lo - 1].filter((x) => x >= 1 && x !== correct)
  const wrong = some(rng, [...new Set(pool)], 2)
  const cm = (n: number): LStr => ({ k: 'm4.tri.cm', p: { n } })
  return labelQuestion({ kpId, type: T, difficulty: d, sig: `third-${a}-${b}-${correct}-${wrong.join('.')}`, stem: [text('m4.tri.thirdSideQ', { a, b })], correct: cm(correct), distractors: wrong.map(cm), rng })
}

/** 第三条边是整厘米数，最多是几厘米 */
function genMaxThird(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(2, 12)
  const b = rng.int(2, 12)
  return numberQuestion({ kpId, type: T, difficulty: d, sig: `max-${Math.min(a, b)}-${Math.max(a, b)}`, stem: [text('m4.tri.maxThirdQ', { a, b })], value: a + b - 1, rng, max: 30, min: 1, smart: [a + b, a + b + 1, a + b - 2] })
}

/** 练习十五 7：几根小棒里每次选 3 根，能围出几种不同的三角形（按三条边的长度算种类） */
export function triangleKinds(sticks: number[]): number {
  const seen = new Set<string>()
  for (let i = 0; i < sticks.length; i++)
    for (let j = i + 1; j < sticks.length; j++)
      for (let k = j + 1; k < sticks.length; k++) {
        const s = [sticks[i]!, sticks[j]!, sticks[k]!].sort((x, y) => x - y)
        if (canForm(s)) seen.add(s.join('.'))
      }
  return seen.size
}
function genKindsCount(kpId: string, d: Difficulty, rng: RNG): Question {
  let sticks: number[]
  if (rng.chance(d === 2 ? 0.6 : 0.35)) sticks = [2, 2, 5, 6, 6, 6]
  else {
    let n = 0
    do {
      sticks = Array.from({ length: rng.int(4, 6) }, () => rng.int(2, 9)).sort((x, y) => x - y)
      n = triangleKinds(sticks)
    } while (n < 2 || n > 8)
  }
  const n = triangleKinds(sticks)
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `kinds-${sticks.join('.')}`,
    stem: [text('m4.tri.kindsQ', { n: sticks.length }), geoPart([sticksFig(sticks)], `（${sticks.length} 根小棒，分别标着 ${sticks.join('、')}）`)],
    value: n,
    rng,
    max: 12,
    min: 1,
    smart: [n + 1, n - 1, sticks.length],
  })
}

const SIDE_JUDGE: [string, boolean][] = [
  ['m4.tri.j.rule', true],
  ['m4.tri.j.ruleEq', false],
  ['m4.tri.j.anyThree', false],
]
function genSideJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(SIDE_JUDGE)
  return judge(kpId, d, rng, `j-${k}`, [text(k)], yes)
}

defineGenerator('m4s2-05-sides', (d, rng) => {
  const kpId = 'm4s2-05-sides'
  const roll = rng.next()
  if (d === 1) {
    // 例 3：走哪条路最近、两点间的距离、任意两边的和大于第三边；例 4：几组小棒能不能围成三角形；练习十五 6
    if (roll < 0.18) return genRoute(kpId, d, rng)
    if (roll < 0.24) return genShortest(kpId, d, rng)
    if (roll < 0.3) return genDistDef(kpId, d, rng)
    if (roll < 0.38) return genRule(kpId, d, rng)
    if (roll < 0.82) return genCanForm(kpId, d, rng)
    return genPickGroup(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十五 5、6、7，练习十六 6(2)
    if (roll < 0.22) return genCanForm(kpId, d, rng)
    if (roll < 0.4) return genPickGroup(kpId, d, rng)
    if (roll < 0.58) return genThird(kpId, d, rng)
    if (roll < 0.7) return genMaxThird(kpId, d, rng)
    if (roll < 0.8) return genKindsCount(kpId, d, rng)
    if (roll < 0.9) return genSideJudge(kpId, d, rng)
    return genRoute(kpId, d, rng)
  }
  // 练习十五 7：能围出几种三角形
  if (roll < 0.4) return genKindsCount(kpId, d, rng)
  if (roll < 0.65) return genMaxThird(kpId, d, rng)
  if (roll < 0.85) return genThird(kpId, d, rng)
  return genPickGroup(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 三角形的分类（例 5，练习十五 3、4、8，练习十六 5）
// ─────────────────────────────────────────────────────────────

export type TriKind = 'acute' | 'right' | 'obtuse'
const TRI_KINDS: TriKind[] = ['acute', 'right', 'obtuse']
const TRI_KEY: Record<TriKind, string> = { acute: 'm4.tri.acute', right: 'm4.tri.right', obtuse: 'm4.tri.obtuse' }
export const triKindOf = (angles: number[]): TriKind => {
  const m = Math.max(...angles)
  return m < 90 ? 'acute' : m === 90 ? 'right' : 'obtuse'
}

/** 按种类取三个角（整度数，和是 180）：第 1 档锐角三角形最大的角不超过 80°、钝角三角形的钝角至少 105°，第 2 档靠近直角一些 */
export function anglesFor(kind: TriKind, d: Difficulty, rng: RNG): [number, number, number] {
  if (kind === 'right') {
    const a = rng.int(5, 13) * 5
    return [90, a, 90 - a]
  }
  if (kind === 'obtuse') {
    const big = d === 1 ? rng.int(21, 28) * 5 : rng.int(98, 140)
    const a = rng.int(15, 180 - big - 15)
    return [big, a, 180 - big - a]
  }
  const top = d === 1 ? 80 : 85
  for (;;) {
    const a = d === 1 ? rng.int(8, 16) * 5 : rng.int(35, top)
    const b = d === 1 ? rng.int(8, 16) * 5 : rng.int(35, top)
    const c = 180 - a - b
    if (c >= 35 && c <= top) return [a, b, c]
  }
}

/** 按三个角画三角形：angles[0] 在左下、[1] 在右下、[2] 在上面；直角画直角记号（mark = false 时只在直角边一横一竖时省掉） */
function kindFig(angles: [number, number, number], rot: number, mark = true, size = 160): { pts: GeoPt[]; items: GeoItem[] } {
  const pts = place(triAB(angles[0], angles[1]), rot, size)
  const items: GeoItem[] = [triPoly(pts)]
  const r = angles.indexOf(90)
  if (r >= 0 && mark) items.push(...corner(pts, r, undefined, true))
  return { pts, items }
}

/** 三个角排一排：特殊的那个角（直角、钝角、最大的锐角）放在哪个顶点 */
function arrange(angles: [number, number, number], rng: RNG): [number, number, number] {
  return rng.shuffle(angles) as [number, number, number]
}

/** 例 5：按角来分，这是什么三角形（直角画记号；第 2 档直角边一横一竖时一半不画记号，角也更靠近直角） */
function genClassifyFig(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(TRI_KINDS)
  const angles = arrange(anglesFor(kind, d, rng), rng)
  const upright = kind === 'right' && angles[2] !== 90
  const rot = upright && d > 1 && rng.chance(0.5) ? 0 : rng.pick(d === 1 ? [0, 0, 10, -10, 20, -20] : [0, 25, -25, 45, 180, 160])
  const mark = !(upright && rot === 0 && d > 1)
  const f = kindFig(angles, rot, mark)
  return pickWord(
    kpId,
    d,
    rng,
    `fig-${angles.join('.')}-${rot}${mark ? '' : '-nm'}`,
    [text('m4.tri.byAngleQ'), geoPart([fitFig(f.items, 14)], '（一个三角形）')],
    TRI_KEY[kind],
    TRI_KINDS.filter((k) => k !== kind).map((k) => TRI_KEY[k]),
  )
}

/** 三个角的度数说是什么三角形 */
function genClassifyDeg(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(TRI_KINDS)
  const [a, b, c] = rng.shuffle(anglesFor(kind, d, rng))
  return pickWord(kpId, d, rng, `deg-${a}-${b}-${c}`, [text('m4.tri.byDegQ', { a: a!, b: b!, c: c! })], TRI_KEY[kind], TRI_KINDS.filter((k) => k !== kind).map((k) => TRI_KEY[k]))
}

/** 例 5 的三条定义 */
function genDefAngle(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(TRI_KINDS)
  const key = { acute: 'm4.tri.defAcuteQ', right: 'm4.tri.defRightQ', obtuse: 'm4.tri.defObtuseQ' }[kind]
  return pickWord(kpId, d, rng, `defa-${kind}`, [text(key)], TRI_KEY[kind], TRI_KINDS.filter((k) => k !== kind).map((k) => TRI_KEY[k]))
}

/** 例 5 分一分：三个三角形（锐角、直角、钝角各一个），哪个是某一种 */
function genPickKind(kpId: string, d: Difficulty, rng: RNG): Question {
  const target = rng.pick(TRI_KINDS)
  const order = rng.shuffle(TRI_KINDS)
  const shapes = order.map((k) => arrange(anglesFor(k, d, rng), rng))
  const figs = shapes.map((a) => fitFig(kindFig(a, rng.pick([0, 0, 15, -15]), true, 120).items, 8))
  return pickFig(
    kpId,
    d,
    rng,
    `pk-${target}-${shapes.map((a) => a.join('.')).join('-')}`,
    [text('m4.tri.pickKindQ', { kind: { k: TRI_KEY[target] } }), geoPart(figs, '（三个三角形，直角上画着直角记号）', true)],
    3,
    order.indexOf(target),
  )
}

/** 等腰三角形：顶角 apex 度，顶点朝上（rot = 整体转几度） */
function isoTri(apex: number, rot: number, size = 160): GeoPt[] {
  const b = (180 - apex) / 2
  return place(triAB(b, b), rot, size)
}
type IsoPart = 'leg' | 'base' | 'apex' | 'baseAngle'
const ISO_APEX = [30, 40, 50, 70, 80, 100, 110, 120]

/** 例 5：等腰三角形的腰、底、顶角、底角（红色的边 / 标着问号的角叫什么） */
function genIsoParts(kpId: string, d: Difficulty, rng: RNG): Question {
  const part = rng.pick<IsoPart>(['leg', 'base', 'apex', 'baseAngle'])
  const apex = rng.pick(ISO_APEX)
  const rot = rng.pick(d === 1 ? [0, 0, 0, 10, -10] : [0, 90, 180, 270, 30, -30])
  const pts = isoTri(apex, rot)
  const side = rng.chance(0.5) ? 0 : 1
  const items: GeoItem[] = [triPoly(pts)]
  if (part === 'leg') items.push({ t: 'line', a: pts[2]!, b: pts[side]!, stroke: 'd' })
  else if (part === 'base') items.push({ t: 'line', a: pts[0]!, b: pts[1]!, stroke: 'd' })
  else items.push(...corner(pts, part === 'apex' ? 2 : side, '?'))
  const sig = `iso-${part}-${apex}-${rot}-${side}`
  const fig = geoPart([fitFig(items, 16)], part === 'leg' || part === 'base' ? '（一个等腰三角形，有一条边画成红色）' : '（一个等腰三角形，有一个角里标着问号）')
  if (part === 'leg' || part === 'base') return pickWord(kpId, d, rng, sig, [text('m4.tri.isoSideQ'), fig], part === 'leg' ? 'm4.tri.leg' : 'm4.tri.base', [part === 'leg' ? 'm4.tri.base' : 'm4.tri.leg', 'm4.tri.height'])
  return pickWord(kpId, d, rng, sig, [text('m4.tri.isoAngleQ'), fig], part === 'apex' ? 'm4.tri.apex' : 'm4.tri.baseAngle', [part === 'apex' ? 'm4.tri.baseAngle' : 'm4.tri.apex', 'm4.tri.rightAngle'])
}

/** 例 5 按边：等腰三角形、等边三角形（正三角形）、腰、顶角、底角的定义 */
const DEF_SIDES: { key: string; correct: string; wrong: string[] }[] = [
  { key: 'm4.tri.defIsoQ', correct: 'm4.tri.iso', wrong: ['m4.tri.equi', 'm4.tri.right'] },
  { key: 'm4.tri.defEquiQ', correct: 'm4.tri.equi', wrong: ['m4.tri.right', 'm4.tri.obtuse'] },
  { key: 'm4.tri.equiAlsoQ', correct: 'm4.tri.regular', wrong: ['m4.tri.right', 'm4.tri.square'] },
  { key: 'm4.tri.defLegQ', correct: 'm4.tri.leg', wrong: ['m4.tri.base', 'm4.tri.height'] },
  { key: 'm4.tri.defApexQ', correct: 'm4.tri.apex', wrong: ['m4.tri.baseAngle'] },
  { key: 'm4.tri.defBaseAngleQ', correct: 'm4.tri.baseAngle', wrong: ['m4.tri.apex'] },
]
function genDefSide(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(DEF_SIDES)
  return pickWord(kpId, d, rng, `defs-${x.key}`, [text(x.key)], x.correct, x.wrong)
}

/** 三条边的长度说是等腰还是等边三角形（三条边都相等的，选项里不放「等腰」「锐角」：它们也对） */
function genSideLengths(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(3, 9)
  const equi = rng.chance(0.35)
  let b = a
  if (!equi) while (b === a) b = rng.int(2, 2 * a - 1)
  const s = rng.shuffle([a, a, b])
  const stem = [text('m4.tri.sidesQ', { a: s[0]!, b: s[1]!, c: s[2]! })]
  const sig = `sides-${s.join('.')}`
  if (equi) return pickWord(kpId, d, rng, sig, stem, 'm4.tri.equi', ['m4.tri.right', 'm4.tri.obtuse'])
  return pickWord(kpId, d, rng, sig, stem, 'm4.tri.iso', ['m4.tri.equi'])
}

/** 「等边三角形也是等腰三角形」 */
function genEquiIso(kpId: string, d: Difficulty, rng: RNG): Question {
  const yes = rng.chance(0.5)
  return judge(kpId, d, rng, `ei-${yes ? 'y' : 'n'}`, [text(yes ? 'm4.tri.j.equiIsIso' : 'm4.tri.j.isoIsEqui')], yes)
}

/** 练习十五 8：没有钝角的三角形可能是什么三角形（第 3 档：有两个锐角的呢） */
function genGuess(kpId: string, d: Difficulty, rng: RNG): Question {
  if (d === 3 && rng.chance(0.5)) return pickWord(kpId, d, rng, 'guess-two', [text('m4.tri.guessTwoQ')], 'm4.tri.anyKind', ['m4.tri.onlyAcute', 'm4.tri.onlyRight'])
  return pickWord(kpId, d, rng, 'guess-noobtuse', [text('m4.tri.guessQ')], 'm4.tri.acuteOrRight', ['m4.tri.onlyAcute', 'm4.tri.obtuse'])
}

/** 练习十六 5：按描述说是什么三角形 */
const DESCRIBE: { key: string; correct: string; wrong: string[] }[] = [
  { key: 'm4.tri.desc.isoRight', correct: 'm4.tri.isoRight', wrong: ['m4.tri.equi', 'm4.tri.obtuse'] },
  { key: 'm4.tri.desc.twoAcute', correct: 'm4.tri.obtuse', wrong: ['m4.tri.acute', 'm4.tri.equi'] },
  { key: 'm4.tri.desc.threeEq', correct: 'm4.tri.equi', wrong: ['m4.tri.right', 'm4.tri.obtuse'] },
  { key: 'm4.tri.desc.noRightObtuse', correct: 'm4.tri.acute', wrong: ['m4.tri.right', 'm4.tri.obtuse'] },
]
function genDescribe(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(DESCRIBE)
  return pickWord(kpId, d, rng, `desc-${x.key}`, [text(x.key)], x.correct, x.wrong)
}

/** 第 2 档：量一量等腰三角形、等边三角形的各个角（课本没印结论，出判断） */
const ANGLE_JUDGE: [string, boolean][] = [
  ['m4.tri.j.isoBaseEq', true],
  ['m4.tri.j.equiAnglesEq', true],
  ['m4.tri.j.isoTopEq', false],
]
function genAngleJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(ANGLE_JUDGE)
  return judge(kpId, d, rng, `j-${k}`, [text(k)], yes)
}

/** 第 3 档：一个三角形里最多有几个直角 / 钝角，至少有几个锐角 */
function genAtMost(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick([
    { key: 'm4.tri.mostRightQ', v: 1 },
    { key: 'm4.tri.mostObtuseQ', v: 1 },
    { key: 'm4.tri.leastAcuteQ', v: 2 },
  ])
  return numberQuestion({ kpId, type: T, difficulty: d, sig: `most-${x.key}`, stem: [text(x.key)], value: x.v, rng, max: 3, min: 0, smart: [0, 1, 2, 3] })
}

defineGenerator('m4s2-05-kinds', (d, rng) => {
  const kpId = 'm4s2-05-kinds'
  const roll = rng.next()
  if (d === 1) {
    // 例 5：按角分（看图、看度数、定义、分一分）、等腰三角形各部分的名称、等腰 / 等边三角形的定义、等边三角形也是等腰三角形
    if (roll < 0.22) return genClassifyFig(kpId, d, rng)
    if (roll < 0.33) return genClassifyDeg(kpId, d, rng)
    if (roll < 0.41) return genDefAngle(kpId, d, rng)
    if (roll < 0.52) return genPickKind(kpId, d, rng)
    if (roll < 0.68) return genIsoParts(kpId, d, rng)
    if (roll < 0.8) return genDefSide(kpId, d, rng)
    if (roll < 0.92) return genSideLengths(kpId, d, rng)
    return genEquiIso(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十五 3、4、8，练习十六 5，量一量等腰 / 等边三角形的角
    if (roll < 0.18) return genClassifyFig(kpId, d, rng)
    if (roll < 0.3) return genClassifyDeg(kpId, d, rng)
    if (roll < 0.4) return genPickKind(kpId, d, rng)
    if (roll < 0.5) return genIsoParts(kpId, d, rng)
    if (roll < 0.64) return genGuess(kpId, d, rng)
    if (roll < 0.8) return genDescribe(kpId, d, rng)
    if (roll < 0.9) return genAngleJudge(kpId, d, rng)
    return genSideLengths(kpId, d, rng)
  }
  if (roll < 0.3) return genAtMost(kpId, d, rng)
  if (roll < 0.55) return genDescribe(kpId, d, rng)
  if (roll < 0.8) return genGuess(kpId, d, rng)
  return genClassifyDeg(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 三角形的内角和（例 6、做一做，练习十六 1、2、3、6(1)）
// ─────────────────────────────────────────────────────────────

function genSumFact(kpId: string, d: Difficulty, rng: RNG): Question {
  return degQuestion({ kpId, d, sig: 'fact', stem: [text('m4.tri.sumQ')], value: 180, rng, smart: [90, 360] })
}

/** 练习十六 1 的三个三角形（65°、37°；直角、30°；25°、20°）与随手的度数 */
const TB_THIRD: { angles: [number, number, number]; ask: number }[] = [
  { angles: [65, 37, 78], ask: 2 },
  { angles: [90, 30, 60], ask: 2 },
  { angles: [25, 135, 20], ask: 1 },
]

/** 已知两个角（图里写着度数），求标着问号的第三个角；直角画直角记号 */
function genThirdFig(kpId: string, d: Difficulty, rng: RNG): Question {
  let angles: [number, number, number] = [60, 60, 60]
  let ask = 0
  let rot = 0
  let items: GeoItem[] = []
  const draw = (): boolean => {
    const pts = place(triAB(angles[0], angles[1]), rot, 190)
    items = [triPoly(pts)]
    angles.forEach((deg, i) => items.push(...(i === ask ? corner(pts, i, '?') : deg === 90 ? corner(pts, i, undefined, true) : corner(pts, i, `${deg}°`))))
    return labelsApart(items)
  }
  let ok = false
  if (d === 1 && rng.chance(0.3)) {
    const t = rng.pick(TB_THIRD)
    angles = t.angles
    ask = t.ask
    ok = draw()
  }
  // 随手取的度数：画出来字挤在一起（扁的三角形）就换一组
  for (let k = 0; !ok && k < 40; k++) {
    const a = d === 1 ? rng.int(4, 22) * 5 : rng.int(18, 120)
    const b = d === 1 ? rng.int(4, 22) * 5 : rng.int(18, 120)
    if (180 - a - b < 18) continue
    angles = [a, b, 180 - a - b]
    ask = rng.int(0, 2)
    rot = rng.pick([0, 0, 10, -10])
    ok = draw()
  }
  if (!ok) {
    angles = [65, 37, 78]
    ask = 2
    rot = 0
    draw()
  }
  const known = angles.filter((_, i) => i !== ask) as [number, number]
  const value = angles[ask]!
  const right = known.includes(90)
  return degQuestion({
    kpId,
    d,
    sig: `third-${angles.join('.')}-${ask}-${rot}`,
    stem: [text(right ? 'm4.tri.thirdRightQ' : 'm4.tri.thirdQ', right ? { a: known.find((x) => x !== 90)! } : { a: known[0], b: known[1] }), geoPart([fitFig(items, 18)], right ? '（一个直角三角形，一个锐角里写着度数，另一个锐角里标着问号）' : '（一个三角形，两个角里写着度数，第三个角里标着问号）')],
    value,
    rng,
    smart: [180 - value, 360 - known[0] - known[1], value + 10, value - 10],
    max: 180,
  })
}

/** 做一做 1：∠1 = 140°，∠3 = 25°，求∠2（图里的角标着 1、2、3） */
function genAngleNum(kpId: string, d: Difficulty, rng: RNG): Question {
  let angles: [number, number, number] = [60, 60, 60]
  let nums = ['1', '2', '3']
  let ask = 0
  let rot = 0
  let items: GeoItem[] = []
  const draw = (): boolean => {
    const pts = place(triAB(angles[0], angles[1]), rot, 190)
    items = [triPoly(pts)]
    angles.forEach((_, i) => items.push(...corner(pts, i, nums[i])))
    return labelsApart(items, 30)
  }
  if (d === 1 && rng.chance(0.3)) {
    // 课本的图：∠1 在下面（钝角 140°），∠2 在左上（15°），∠3 在右上（25°）——画成顶点朝下，所以左下的转到右上
    angles = [25, 15, 140]
    nums = ['3', '2', '1']
    ask = 1
    rot = 180
    draw()
  } else {
    do {
      angles = arrange(anglesFor(rng.pick(TRI_KINDS), d, rng), rng)
      nums = rng.shuffle(['1', '2', '3'])
      ask = rng.int(0, 2)
      rot = rng.pick([0, 0, 10, -10])
    } while (!draw())
  }
  const known = [0, 1, 2].filter((i) => i !== ask).sort((x, y) => Number(nums[x]) - Number(nums[y]))
  const [i1, i2] = known as [number, number]
  return degQuestion({
    kpId,
    d,
    sig: `num-${angles.join('.')}-${nums.join('')}-${ask}`,
    stem: [text('m4.tri.numQ', { a: nums[i1]!, da: angles[i1]!, b: nums[i2]!, db: angles[i2]!, c: nums[ask]! }), geoPart([fitFig(items, 18)], '（一个三角形，三个角里分别标着 1、2、3）')],
    value: angles[ask]!,
    rng,
    smart: [180 - angles[ask]!, angles[ask]! + 10, angles[ask]! - 10],
    max: 180,
  })
}

/** 练习十六 2(3)：直角三角形中一个锐角是 a，另一个锐角是多少度 */
function genRightAcute(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = d === 1 ? rng.int(4, 17) * 5 : rng.int(12, 78)
  return degQuestion({ kpId, d, sig: `racute-${a}`, stem: [text('m4.tri.rightAcuteQ', { a })], value: 90 - a, rng, smart: [180 - a, 180 - 90 - a + 10, 90 + a], max: 180 })
}

/** 练习十六 2(2)：等腰三角形的顶角，求底角 */
function genIsoBase(kpId: string, d: Difficulty, rng: RNG): Question {
  // 练习十六 2(2) 的顶角是 96°
  const top = d === 1 ? (rng.chance(0.25) ? 96 : rng.int(2, 14) * 10) : rng.int(10, 79) * 2
  const base = (180 - top) / 2
  return degQuestion({ kpId, d, sig: `isob-${top}`, stem: [text('m4.tri.isoBaseQ', { a: top })], value: base, rng, smart: [180 - top, top, 90 - top / 2 + 10], max: 180 })
}

/** 练习十六 3：等腰三角形的风筝，一个底角，求顶角 */
function genIsoTop(kpId: string, d: Difficulty, rng: RNG): Question {
  const base = d === 1 ? rng.int(5, 17) * 5 : rng.int(25, 88)
  const kite = rng.chance(0.4)
  const top = 180 - 2 * base
  return degQuestion({ kpId, d, sig: `isot-${base}-${kite ? 'k' : 't'}`, stem: [text(kite ? 'm4.tri.kiteQ' : 'm4.tri.isoTopQ', { a: base })], value: top, rng, smart: [180 - base, base, 90 - base], max: 180 })
}

function genEquiAngle(kpId: string, d: Difficulty, rng: RNG): Question {
  return degQuestion({ kpId, d, sig: 'equi', stem: [text('m4.tri.equiQ')], value: 60, rng, smart: [90, 180, 45] })
}

/** 做一做 2：沿虚线（高）剪成两个小三角形，每个小三角形的内角和（图只是陪衬） */
function genCutHalf(kpId: string, d: Difficulty, rng: RNG): Question {
  const t = heightTri(rng, 'acute', 0)
  const fig = geoPart([fitFig([triPoly(t.pts), heightItems(t)[0]!], 16)], '（一个三角形，从上面的顶点到下面的边画着一条虚线）')
  return degQuestion({ kpId, d, sig: 'cut', stem: [text('m4.tri.cutQ'), fig], value: 180, rng, smart: [90, 360], input: rng.chance(0.6) ? 'choice' : 'numpad' })
}

/** 例 6：三个角剪下来拼成什么角 */
function genTear(kpId: string, d: Difficulty, rng: RNG): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig: 'tear', stem: [text('m4.tri.tearQ')], correct: kindL('straight'), distractors: [kindL('right'), kindL('full')], rng })
}

/** 练习十六 6(1)：一个角是直角，另外两个角可能是多少度 */
function genRightPair(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(4, 14) * 5
  const pair = (x: number, y: number): LStr => ({ k: 'm4.tri.pair', p: { a: x, b: y } })
  const wrongs: [number, number][] = [
    [a, 100 - a],
    [a + 10, 90 - a + 10],
    [a, 80 - a],
  ]
  const pick = some(rng, wrongs, 2)
  return labelQuestion({ kpId, type: T, difficulty: d, sig: `rpair-${a}-${pick.map((p) => p.join('.')).join('-')}`, stem: [text('m4.tri.rightPairQ')], correct: pair(a, 90 - a), distractors: pick.map(([x, y]) => pair(x, y)), rng })
}

/** 两个角求出第三个，再说是什么三角形 */
function genKindFromTwo(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(TRI_KINDS)
  const angles = rng.shuffle(anglesFor(kind, 2, rng))
  // 给的两个角都不是直角、钝角（要先算出第三个角才知道）
  const [a, b] = angles.filter((x) => x < 90).slice(0, 2) as [number, number]
  return pickWord(kpId, d, rng, `two-${a}-${b}`, [text('m4.tri.kindTwoQ', { a, b })], TRI_KEY[kind], TRI_KINDS.filter((k) => k !== kind).map((k) => TRI_KEY[k]))
}

/** 第 3 档：∠1 + ∠2 = s，求∠3 */
function genSumTwo(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.int(30, 160)
  return degQuestion({ kpId, d, sig: `sum2-${s}`, stem: [text('m4.tri.sumTwoQ', { s })], value: 180 - s, rng, smart: [360 - s, s, 180 - s + 10], max: 360 })
}

defineGenerator('m4s2-05-angle-sum', (d, rng) => {
  const kpId = 'm4s2-05-angle-sum'
  const roll = rng.next()
  if (d === 1) {
    // 例 6：内角和 180°、剪下来拼成平角；做一做 1（∠1、∠2、∠3）、做一做 2（剪成两个小三角形）；练习十六 1、2、3
    if (roll < 0.06) return genSumFact(kpId, d, rng)
    if (roll < 0.32) return genThirdFig(kpId, d, rng)
    if (roll < 0.46) return genAngleNum(kpId, d, rng)
    if (roll < 0.58) return genRightAcute(kpId, d, rng)
    if (roll < 0.68) return genIsoBase(kpId, d, rng)
    if (roll < 0.78) return genIsoTop(kpId, d, rng)
    if (roll < 0.84) return genEquiAngle(kpId, d, rng)
    if (roll < 0.92) return genCutHalf(kpId, d, rng)
    return genTear(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.22) return genThirdFig(kpId, d, rng)
    if (roll < 0.34) return genAngleNum(kpId, d, rng)
    if (roll < 0.44) return genRightAcute(kpId, d, rng)
    if (roll < 0.56) return genIsoBase(kpId, d, rng)
    if (roll < 0.68) return genIsoTop(kpId, d, rng)
    if (roll < 0.8) return genRightPair(kpId, d, rng)
    if (roll < 0.92) return genKindFromTwo(kpId, d, rng)
    return genCutHalf(kpId, d, rng)
  }
  if (roll < 0.3) return genKindFromTwo(kpId, d, rng)
  if (roll < 0.55) return genSumTwo(kpId, d, rng)
  if (roll < 0.7) return genIsoBase(kpId, d, rng)
  if (roll < 0.85) return genIsoTop(kpId, d, rng)
  return genRightPair(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 多边形的内角和（例 7、做一做，练习十六 4）
// ─────────────────────────────────────────────────────────────

export const polySum = (n: number): number => (n - 2) * 180
const POLY_NAME = (n: number): LStr => ({ k: `m4.tri.poly.${n}` })

/** n 边形（略不规则的凸多边形；hexagon = true 画正六边形）；diag = 从第一个顶点往别的顶点画红色虚线 */
function polyFig(n: number, rng: RNG, o: { diag?: boolean; regular?: boolean } = {}): GeoFig {
  const R = 80
  const start = rng.pick([0, 15, 30, 45]) - 90
  const pts: GeoPt[] = []
  for (let k = 0; k < n; k++) {
    const jitter = o.regular ? 0 : rng.int(-7, 7)
    const r = o.regular ? R : R * (0.86 + rng.int(0, 14) / 100)
    const a = ((start + (360 / n) * k + jitter) * Math.PI) / 180
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  const items: GeoItem[] = [{ t: 'poly', pts, stroke: 'b' }]
  if (o.diag) for (let k = 2; k < n - 1; k++) items.push({ t: 'line', a: pts[0]!, b: pts[k]!, stroke: 'd', dash: true })
  return fitFig(items, 12)
}

function genQuadSum(kpId: string, d: Difficulty, rng: RNG): Question {
  const stem: StemPart[] = [text('m4.tri.quadSumQ')]
  if (rng.chance(0.5)) stem.push(geoPart([polyFig(4, rng)], '（一个四边形）'))
  return degQuestion({ kpId, d, sig: 'quad', stem, value: 360, rng, smart: [180, 540, 720], max: 1080 })
}

/** 例 7 阅读与理解：长方形、正方形（4 个角都是直角）、梯形、平行四边形的内角和 */
function genNamedSum(kpId: string, d: Difficulty, rng: RNG): Question {
  const shape = rng.pick(['rect', 'square', 'trap', 'para'] as const)
  const key = { rect: 'm4.tri.rectSumQ', square: 'm4.tri.squareSumQ', trap: 'm4.tri.trapSumQ', para: 'm4.tri.paraSumQ' }[shape]
  return degQuestion({ kpId, d, sig: `named-${shape}`, stem: [text(key)], value: 360, rng, smart: [180, 90, 540], max: 1080 })
}

/** 练习十六 4 的表：从一个顶点画虚线，分成了几个三角形 */
function genSplit(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? rng.int(4, 7) : rng.int(5, 8)
  return numberQuestion({ kpId, type: T, difficulty: d, sig: `split-${n}`, stem: [text('m4.tri.splitQ'), geoPart([polyFig(n, rng, { diag: true })], `（一个 ${n} 条边的图形，从一个顶点向别的顶点画了红色虚线）`)], value: n - 2, rng, max: 12, min: 1, smart: [n, n - 1, n - 3] })
}

/** 五边形、六边形（做一做）、七边形的内角和（配图） */
function genPolySum(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? rng.pick([5, 6, 6, 7]) : d === 2 ? rng.int(5, 8) : rng.int(7, 8)
  const fig = geoPart([polyFig(n, rng, { regular: n === 6 })], `（一个 ${n} 条边的图形）`)
  return degQuestion({ kpId, d, sig: `sum-${n}`, stem: [text('m4.tri.polySumFigQ', { shape: POLY_NAME(n) }), fig], value: polySum(n), rng, smart: [n * 180, polySum(n) - 180, polySum(n) + 180], max: 1800 })
}

/** 表里的「180° × ___」：n 边形的内角和是 180° 乘几 */
function genFormula(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? rng.int(4, 7) : rng.int(5, 8)
  return numberQuestion({ kpId, type: T, difficulty: d, sig: `formula-${n}`, stem: [text('m4.tri.formulaQ', { shape: POLY_NAME(n) })], value: n - 2, rng, max: 12, min: 1, smart: [n, n - 1, n + 1] })
}

/** 例 7：四个角剪下来拼成什么角 */
function genTear4(kpId: string, d: Difficulty, rng: RNG): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig: 'tear4', stem: [text('m4.tri.tear4Q')], correct: kindL('full'), distractors: [kindL('straight'), kindL('right')], rng })
}

/** 例 7：分成 2 个三角形，内角和是 180° + 180°，等于多少度 */
function genQuadTwo(kpId: string, d: Difficulty, rng: RNG): Question {
  const fig = geoPart([polyFig(4, rng, { diag: true })], '（一个四边形，画了一条红色虚线，分成两个三角形）')
  return numberQuestion({ kpId, type: T, difficulty: d, sig: 'quad2', stem: [text('m4.tri.quadTwoQ'), fig], value: 360, rng, max: 1080, min: 0, smart: [180, 540, 720] })
}

/** 第 2、3 档：已知内角和，有几条边 */
function genSidesFromSum(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 2 ? rng.int(4, 7) : rng.int(5, 8)
  return numberQuestion({ kpId, type: T, difficulty: d, sig: `sides-${n}`, stem: [text('m4.tri.sidesFromSumQ', { s: polySum(n) })], value: n, rng, max: 12, min: 3, smart: [n - 2, n + 2, n - 1] })
}

/** 第 2、3 档：四边形的三个角，求第四个（课本例 7 的结论用一用） */
function genQuadFourth(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const a = d === 2 ? rng.int(8, 26) * 5 : rng.int(40, 140)
    const b = d === 2 ? rng.int(8, 26) * 5 : rng.int(40, 140)
    const c = d === 2 ? rng.int(8, 26) * 5 : rng.int(40, 140)
    const x = 360 - a - b - c
    if (x >= 40 && x <= 150) return degQuestion({ kpId, d, sig: `q4-${a}-${b}-${c}`, stem: [text('m4.tri.quadFourthQ', { a, b, c })], value: x, rng, smart: [x + 10, x - 10, x + 20], max: 360 })
  }
}

defineGenerator('m4s2-05-polygon', (d, rng) => {
  const kpId = 'm4s2-05-polygon'
  const roll = rng.next()
  if (d === 1) {
    // 例 7：长方形、正方形、梯形……的内角和，四边形剪拼成周角、分成 2 个三角形，四边形的内角和 360°；做一做六边形；练习十六 4 的表
    if (roll < 0.14) return genQuadSum(kpId, d, rng)
    if (roll < 0.28) return genNamedSum(kpId, d, rng)
    if (roll < 0.44) return genSplit(kpId, d, rng)
    if (roll < 0.64) return genPolySum(kpId, d, rng)
    if (roll < 0.8) return genFormula(kpId, d, rng)
    if (roll < 0.9) return genTear4(kpId, d, rng)
    return genQuadTwo(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return genPolySum(kpId, d, rng)
    if (roll < 0.4) return genSidesFromSum(kpId, d, rng)
    if (roll < 0.62) return genQuadFourth(kpId, d, rng)
    if (roll < 0.8) return genFormula(kpId, d, rng)
    return genSplit(kpId, d, rng)
  }
  if (roll < 0.35) return genSidesFromSum(kpId, d, rng)
  if (roll < 0.7) return genQuadFourth(kpId, d, rng)
  return genPolySum(kpId, d, rng)
})
