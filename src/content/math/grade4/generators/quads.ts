import type { Difficulty, GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { NO, YES, along, degQuestion as angleDegQuestion, dir, fitFig, geoPart, inside, labelDist, rad, rotate, some, text } from './angles'

// ─────────────────────────────────────────────────────────────
// 平行四边形和梯形（四上五，第 70–87 页）：平行和垂直（例 1）、点到直线的距离（例 2–5：画垂线、垂直线段最短、画平行线、
// 平行线之间的垂直线段、画长方形）、认识平行四边形（例 6）、认识梯形（例 7、8 与四边形之间的关系）。
// 新教材这一单元没有「底」「高」「画高」「平行线间的距离」「平行四边形容易变形」，都不出；画图题只出能判对错的部分
// （哪幅图画对了、三角尺怎么放、先画什么）。图按真实的角度画：判断垂直的图要么画了直角记号、要么摆正在方格纸上、
// 要么题目里写着量得的度数，肉眼分不清的（87°、93°）不出。图都用 GeoFigure（kind: 'geo'），图里只放字母、数、cm、°。
// ─────────────────────────────────────────────────────────────

const T = 'parallel' as const
/** 度数的题（题型记 parallel） */
const degQuestion = (o: Omit<Parameters<typeof angleDegQuestion>[0], 'type'>): Question => angleDegQuestion({ ...o, type: T })
type Rel = 'par' | 'perp' | 'cross'
const REL_KEY: Record<Rel, string> = { par: 'm4.quad.parallel', perp: 'm4.quad.perp', cross: 'm4.quad.cross' }
const relL = (r: Rel): LStr => ({ k: REL_KEY[r] })
const RELS: Rel[] = ['par', 'perp', 'cross']

/** 三种关系的选择题（互相平行 / 互相垂直 / 相交但不垂直） */
function relQuestion(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], rel: Rel): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig, stem, correct: relL(rel), distractors: RELS.filter((r) => r !== rel).map(relL), rng })
}
/** 判断题 */
function judge(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], yes: boolean): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig, stem, correct: yes ? YES : NO, distractors: [yes ? NO : YES], rng })
}
/** 几个词条里选一个 */
function pickWord(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: string, wrong: string[]): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig, stem, correct: { k: correct }, distractors: wrong.map((k): LStr => ({ k })), rng })
}

const norm = (v: GeoPt): GeoPt => {
  const l = Math.hypot(v[0], v[1]) || 1
  return [v[0] / l, v[1] / l]
}
const sub = (a: GeoPt, b: GeoPt): GeoPt => [a[0] - b[0], a[1] - b[1]]
const add = (a: GeoPt, b: GeoPt): GeoPt => [a[0] + b[0], a[1] + b[1]]
const mul = (a: GeoPt, k: number): GeoPt => [a[0] * k, a[1] * k]
/** 方向向量的方向角（度，0 朝右、逆时针，0–180：直线不分正反） */
const lineDeg = (v: GeoPt): number => (((Math.atan2(-v[1], v[0]) * 180) / Math.PI) % 180 + 180) % 180
/** 两条直线的夹角（0–90） */
function lineAngle(u: GeoPt, v: GeoPt): number {
  const d = Math.abs(lineDeg(u) - lineDeg(v))
  return Math.min(d, 180 - d)
}

/** 多边形顶点外侧的字母（凸多边形：从中心往顶点的方向再走 pad） */
function vertexLetters(pts: GeoPt[], names: string[], pad = 15): GeoItem[] {
  const c: GeoPt = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
  return pts.map((p, i): GeoItem => ({ t: 'text', at: add(p, mul(norm(sub(p, c)), pad)), text: names[i]!, letter: true }))
}
/** 多边形第 i 个顶点处的角弧 + 角里的字（编号或度数） */
function cornerMark(pts: GeoPt[], i: number, label?: string): GeoItem[] {
  const n = pts.length
  const p = pts[i]!
  const prev = pts[(i - 1 + n) % n]!
  const next = pts[(i + 1) % n]!
  const out: GeoItem[] = [{ t: 'arc', at: p, a: prev, b: next }]
  if (label) {
    const deg = interiorAt(pts, i)
    const far = label.length > 2 ? 10 : 0 // 「135°」比「1」宽，往里挪一点
    out.push({ t: 'text', at: inside(p, prev, next, labelDist(deg, 30, 56) + far), text: label, tone: 'd' })
  }
  return out
}
/** 凸多边形第 i 个顶点的内角（度） */
export function interiorAt(pts: GeoPt[], i: number): number {
  const n = pts.length
  const p = pts[i]!
  const a = norm(sub(pts[(i - 1 + n) % n]!, p))
  const b = norm(sub(pts[(i + 1) % n]!, p))
  return (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]))) * 180) / Math.PI
}

// ─────────────────────────────────────────────────────────────
// 两条直线（例 1）：方格纸上画两条直线，平行、垂直、相交但不垂直，还有「图里没相交、画长了就相交」的
// ─────────────────────────────────────────────────────────────

/** 过 p、方向 v 的直线在方格 [m, W − m] × [m, H − m] 里的一段 */
function clipLine(p: GeoPt, v: GeoPt, W: number, H: number, m = 0.4): [GeoPt, GeoPt] | null {
  let t0 = -Infinity
  let t1 = Infinity
  const lim: [number, number, number, number][] = [
    [p[0], v[0], m, W - m],
    [p[1], v[1], m, H - m],
  ]
  for (const [p0, d0, lo, hi] of lim) {
    if (Math.abs(d0) < 1e-9) {
      if (p0 < lo || p0 > hi) return null
      continue
    }
    const a = (lo - p0) / d0
    const b = (hi - p0) / d0
    t0 = Math.max(t0, Math.min(a, b))
    t1 = Math.min(t1, Math.max(a, b))
  }
  if (t1 - t0 < 1e-6) return null
  return [add(p, mul(v, t0)), add(p, mul(v, t1))]
}
const segLen = (s: [GeoPt, GeoPt]): number => Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1])

/** 格子里的方向：横、竖、斜的（斜率 ±1、±1/2、±2） */
const DIRS: GeoPt[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
  [2, 1],
  [2, -1],
  [1, 2],
  [1, -2],
]
const axisAligned = (v: GeoPt): boolean => v[0] === 0 || v[1] === 0

interface TwoLines {
  rel: Rel
  items: GeoItem[]
  /** 图里没相交、画长了才相交（例 1 的图⑤） */
  converge: boolean
  sig: string
}
/**
 * 方格纸（W × H 格）上的两条直线。perp 时斜着的一定画直角记号（横竖的第 1 档也常画）；cross 的夹角离直角远（≤ 70° 或 ≥ 110°）；
 * converge：两条线一头靠近、在方格里不相交（相交但不垂直），ext = 用虚线画长到相交
 */
function gridLines(rel: Rel, W: number, H: number, rng: RNG, o: { mark?: boolean; converge?: boolean; ext?: boolean; letters?: boolean } = {}): TwoLines {
  for (;;) {
    let segs: [GeoPt, GeoPt][] = []
    let sig = ''
    let cross: GeoPt | null = null
    const extra: GeoItem[] = []
    if (rel === 'par') {
      const v = rng.pick(DIRS)
      const n: GeoPt = [-v[1], v[0]]
      const c: GeoPt = [Math.round(W / 2), Math.round(H / 2)]
      const off = rng.pick([1, 2, 2, 3])
      const shift = rng.int(-1, 1)
      const p1 = add(c, mul(n, shift))
      const p2 = add(p1, mul(n, off))
      const s1 = clipLine(p1, v, W, H)
      const s2 = clipLine(p2, v, W, H)
      if (!s1 || !s2) continue
      segs = [s1, s2]
      sig = `par${v.join('.')}-${shift}-${off}`
    } else if (rel === 'perp' || (rel === 'cross' && !o.converge)) {
      const u = rng.pick(DIRS)
      let v: GeoPt
      if (rel === 'perp') v = [-u[1], u[0]]
      else {
        const cands = DIRS.filter((x) => {
          const a = lineAngle(u, x)
          return a >= 25 && a <= 70
        })
        v = rng.pick(cands)
      }
      const c: GeoPt = [rng.int(2, W - 2), rng.int(2, H - 2)]
      const s1 = clipLine(c, u, W, H)
      const s2 = clipLine(c, v, W, H)
      if (!s1 || !s2) continue
      segs = [s1, s2]
      cross = c
      sig = `${rel}${u.join('.')}_${v.join('.')}-${c.join('.')}`
      if (rel === 'perp' && (o.mark || !axisAligned(u))) {
        extra.push({ t: 'arc', at: c, a: add(c, u), b: add(c, v), right: true })
        sig += 'm'
      }
    } else {
      // 一头靠近的两条线：从左边开口、往右张开（或反过来），夹角约 20°–40°，相交的地方在方格外面
      // （要画虚线延长时张得大一点，交点落在方格左边沿附近）
      const spread = o.ext ? rng.pick([1.5, 2]) : rng.pick([1, 1.5, 2]) // 宽的那头每条线往外偏几格
      const flip = rng.chance(0.5)
      const x0 = 1.5
      const x1 = W - 1
      const yMid = H / 2
      const gap0 = 0.8
      const p1: GeoPt = [x0, yMid - gap0 / 2]
      const p2: GeoPt = [x0, yMid + gap0 / 2]
      const q1: GeoPt = [x1, yMid - gap0 / 2 - spread]
      const q2: GeoPt = [x1, yMid + gap0 / 2 + spread]
      const f = (p: GeoPt): GeoPt => (flip ? [W - p[0], p[1]] : p)
      segs = [
        [f(p1), f(q1)],
        [f(p2), f(q2)],
      ]
      // 交点：两条线往开口那头延长，离左端 (gap0 / 2) ÷ 斜率
      const meet = f([x0 - ((gap0 / 2) * (x1 - x0)) / spread, yMid])
      if (o.ext) {
        extra.push({ t: 'line', a: f(p1), b: meet, dash: true, stroke: 'soft' }, { t: 'line', a: f(p2), b: meet, dash: true, stroke: 'soft' })
      }
      sig = `conv-${spread}-${flip ? 'r' : 'l'}${o.ext ? 'x' : ''}`
    }
    if (segs.some((s) => segLen(s) < 3)) continue
    const items: GeoItem[] = [{ t: 'grid', x: 0, y: 0, w: W, h: H }, ...segs.map((s): GeoItem => ({ t: 'line', a: s[0], b: s[1] })), ...extra]
    if (o.letters) {
      segs.forEach((s, i) => {
        const end = s[0][0] <= s[1][0] ? s[1] : s[0]
        items.push({ t: 'text', at: add(end, [0.35, i === 0 ? -0.35 : 0.35]), text: i === 0 ? 'a' : 'b', letter: true })
      })
    }
    void cross
    return { rel, items, converge: !!o.converge, sig }
  }
}

/** 例 1：方格纸上的两条直线是什么关系 */
function genRelation(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const rel: Rel = roll < 0.34 ? 'par' : roll < 0.67 ? 'perp' : 'cross'
  const converge = rel === 'cross' && rng.chance(d === 1 ? 0.35 : 0.5)
  const W = 8
  const H = 6
  const tl = gridLines(rel, W, H, rng, { mark: d === 1 ? rng.chance(0.6) : rng.chance(0.3), converge, ext: converge && d === 1 && rng.chance(0.5) })
  return relQuestion(kpId, d, rng, `rel-${tl.sig}`, [text('m4.quad.relQ'), geoPart([{ w: W, h: H, px: 26, items: tl.items }], '（方格纸上画着两条直线）')], rel)
}

/** 四幅方格图里挑出两条直线互相平行（或互相垂直）的那一幅 */
function genPickLines(kpId: string, d: Difficulty, rng: RNG): Question {
  const target: Rel = rng.chance(0.5) ? 'par' : 'perp'
  const others: Rel[] = target === 'par' ? ['perp', 'cross', 'cross'] : ['par', 'cross', 'cross']
  const rels = rng.shuffle<Rel>([target, ...others])
  const W = 6
  const H = 5
  const figs: GeoFig[] = []
  const sigs: string[] = []
  rels.forEach((r, i) => {
    const conv = r === 'cross' && i % 2 === 0 && target === 'par'
    const tl = gridLines(r, W, H, rng, { mark: r === 'perp', converge: conv })
    figs.push({ w: W, h: H, px: 17, items: tl.items })
    sigs.push(tl.sig)
  })
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `pickl-${target}-${sigs.join(',')}`,
    stem: [text(target === 'par' ? 'm4.quad.pickParQ' : 'm4.quad.pickPerpQ'), geoPart(figs, '（四幅方格图，编号 1 到 4，各画着两条直线）', true)],
    value: rels.indexOf(target) + 1,
    rng,
    min: 1,
    max: 4,
    input: 'choice',
  })
}

/** 例 1 的定义：平行线、互相垂直、垂线、垂足 */
const DEFS: { key: string; correct: string; wrong: string[] }[] = [
  { key: 'm4.quad.defParQ', correct: 'm4.quad.parallelLines', wrong: ['m4.quad.perpLine', 'm4.quad.rays'] },
  { key: 'm4.quad.defPerpQ', correct: 'm4.quad.perp', wrong: ['m4.quad.parallel'] },
  { key: 'm4.quad.defPerpLineQ', correct: 'm4.quad.perpLine', wrong: ['m4.quad.parallelLines', 'm4.quad.foot'] },
  { key: 'm4.quad.defFootQ', correct: 'm4.quad.foot', wrong: ['m4.quad.perpLine', 'm4.quad.vertex'] },
  { key: 'm4.quad.defPlaneQ', correct: 'm4.quad.parallel', wrong: ['m4.quad.perp'] },
]
function genDefine(kpId: string, d: Difficulty, rng: RNG): Question {
  const f = rng.pick(DEFS)
  return pickWord(kpId, d, rng, `def-${f.key}`, [text(f.key)], f.correct, f.wrong)
}

/** 记法：a // b 读作「a 平行于 b」、a ⊥ b 读作「a 垂直于 b」（问读法时式子画在图里：写在题目文字里会被读出来） */
function genNotation(kpId: string, d: Difficulty, rng: RNG): Question {
  const par = rng.chance(0.5)
  if (rng.chance(0.5)) {
    return labelQuestion({
      kpId,
      type: T,
      difficulty: d,
      sig: `write-${par ? 'par' : 'perp'}`,
      stem: [text('m4.quad.writeQ', { rel: { k: par ? 'm4.quad.parWord' : 'm4.quad.perpWord' } })],
      correct: par ? 'a // b' : 'a ⊥ b',
      distractors: [par ? 'a ⊥ b' : 'a // b'],
      rng,
    })
  }
  const sym = par ? 'a // b' : 'a ⊥ b'
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `read-${par ? 'par' : 'perp'}`,
    stem: [text('m4.quad.readQ'), geoPart([{ w: 120, h: 40, items: [{ t: 'text', at: [60, 20], text: sym, big: true }] }], '（一个式子）')],
    correct: { k: par ? 'm4.quad.readPar' : 'm4.quad.readPerp' },
    distractors: [{ k: par ? 'm4.quad.readPerp' : 'm4.quad.readPar' }],
    rng,
  })
}

/** 互相垂直的两条直线 a、b（画直角记号），交点 O，另外两个点 C 在 a 上、D 在 b 上：问垂足是哪个点、a 是 b 的什么 */
function genFoot(kpId: string, d: Difficulty, rng: RNG): Question {
  const rot = rng.pick([0, 0, 20, -20, 30, -30])
  const O: GeoPt = [0, 0]
  const ua = dir(rot + 90)
  const ub = dir(rot)
  const L = 90
  const items: GeoItem[] = [
    { t: 'line', a: along(O, ua, -L), b: along(O, ua, L) },
    { t: 'line', a: along(O, ub, -L - 20), b: along(O, ub, L + 20) },
    { t: 'arc', at: O, a: along(O, ua, 10), b: along(O, ub, 10), right: true },
    { t: 'dot', at: O, label: 'O', side: 'sw' },
    { t: 'dot', at: along(O, ua, -55), label: 'C', side: rot >= 0 ? 'w' : 'e' },
    { t: 'dot', at: along(O, ub, 62), label: 'D', side: 's' },
    { t: 'text', at: along(along(O, ua, L), ub, 14), text: 'a', letter: true },
    { t: 'text', at: along(along(O, ub, L + 20), ua, -14), text: 'b', letter: true },
  ]
  const fig = geoPart([fitFig(items, 16)], '（直线 a 和直线 b 相交，交点处画着直角记号；图上标着点 O、C、D）')
  if (rng.chance(0.55)) {
    return labelQuestion({ kpId, type: T, difficulty: d, sig: `foot-${rot}`, stem: [text('m4.quad.footQ'), fig], correct: 'O', distractors: ['C', 'D'], rng })
  }
  return pickWord(kpId, d, rng, `perpof-${rot}`, [text('m4.quad.perpOfQ'), fig], 'm4.quad.perpLine', ['m4.quad.parallelLines', 'm4.quad.foot'])
}

/** 两条相交直线，画出 ∠1：一个角的图（按 deg 画准） */
function crossFig(deg: number, rot: number): GeoFig {
  const O: GeoPt = [0, 0]
  const L = 95
  const u = dir(rot)
  const v = dir(rot + deg)
  return fitFig(
    [
      { t: 'line', a: along(O, u, -L), b: along(O, u, L) },
      { t: 'line', a: along(O, v, -L), b: along(O, v, L) },
      deg === 90 ? { t: 'arc', at: O, a: along(O, u, 10), b: along(O, v, 10), right: true } : { t: 'arc', at: O, a: along(O, u, 10), b: along(O, v, 10) },
      { t: 'text', at: along(O, dir(rot + deg / 2), labelDist(deg)), text: '1', tone: 'd' },
    ],
    14,
  )
}

/** 做一做 3（p72）：量得 ∠1 是多少度，这两条直线互相垂直吗（课本的约 97°、73°，不出肉眼分不清的） */
function genMeasured(kpId: string, d: Difficulty, rng: RNG): Question {
  const deg = rng.pick([90, 90, 90, 97, 73, 60, 80, 100, 110, 120])
  const rot = rng.pick([0, 10, 20, 30, -15, -25])
  return judge(kpId, d, rng, `meas-${deg}-${rot}`, [text('m4.quad.measuredQ', { deg }), geoPart([crossFig(deg, rot)], '（两条直线相交，其中一个角标着 1）')], deg === 90)
}

/** 练习十五 1：图形里的两条线段是什么关系（长方形 ABCD、直角三角形 AEC 中的 BD、L 形 ABCDEF） */
interface SegFig {
  name: string
  pts: Record<string, GeoPt>
  /** 画的线段（按字母对） */
  segs: string[]
  /** 字母标在哪个方向（从点往外挪的单位向量） */
  sides: Record<string, GeoPt>
  /** 问的线段对和答案 */
  pairs: [string, string, Rel][]
  /** 画直角记号的顶点 [顶点, 一边的点, 另一边的点] */
  rights: [string, string, string][]
}
function segFigs(rng: RNG): SegFig[] {
  const w = rng.int(15, 19) * 10
  const h = rng.int(8, 10) * 10
  return [
    {
      name: 'rect',
      pts: { A: [0, 0], B: [w, 0], C: [w, h], D: [0, h] },
      segs: ['AB', 'BC', 'CD', 'DA'],
      sides: { A: [-1, -0.6], B: [1, -0.6], C: [1, 0.6], D: [-1, 0.6] },
      pairs: [
        ['AB', 'DC', 'par'],
        ['AD', 'BC', 'par'],
        ['AB', 'BC', 'perp'],
        ['AD', 'DC', 'perp'],
        ['AB', 'AD', 'perp'],
        ['BC', 'CD', 'perp'],
      ],
      rights: [],
    },
    {
      // 直角三角形 AEC（E 是直角），B 在 AC 上、D 在 EC 上，BD 竖直
      name: 'tri',
      pts: { A: [0, 0], E: [0, 90], C: [220, 90], B: [90, (90 * 90) / 220], D: [90, 90] },
      segs: ['AE', 'EC', 'CA', 'BD'],
      sides: { A: [-1, -0.4], E: [-1, 0.6], C: [1, 0.4], B: [0.3, -1], D: [0, 1] },
      pairs: [
        ['AE', 'BD', 'par'],
        ['AE', 'EC', 'perp'],
        ['BD', 'DC', 'perp'],
        ['AC', 'BD', 'cross'],
        ['AC', 'EC', 'cross'],
      ],
      rights: [],
    },
    {
      // L 形：A 左中、B 中、C 中上、D 右上、E 右下、F 左下
      name: 'L',
      pts: { A: [0, 50], B: [110, 50], C: [110, 0], D: [180, 0], E: [180, 120], F: [0, 120] },
      segs: ['AB', 'BC', 'CD', 'DE', 'EF', 'FA'],
      sides: { A: [-1, -0.4], B: [-0.6, -1], C: [-0.6, -1], D: [1, -0.6], E: [1, 0.6], F: [-1, 0.6] },
      pairs: [
        ['AB', 'CD', 'par'],
        ['BC', 'DE', 'par'],
        ['AB', 'FE', 'par'],
        ['AF', 'DE', 'par'],
        ['AB', 'BC', 'perp'],
        ['CD', 'DE', 'perp'],
        ['EF', 'FA', 'perp'],
        ['FA', 'AB', 'perp'],
        ['BC', 'CD', 'perp'],
        ['DE', 'EF', 'perp'],
      ],
      rights: [],
    },
  ]
}
function genSegments(kpId: string, d: Difficulty, rng: RNG): Question {
  const figs = segFigs(rng)
  const f = rng.pick(d === 1 ? figs.slice(0, 2) : figs)
  const [s1, s2, rel] = rng.pick(f.pairs)
  const items: GeoItem[] = f.segs.map((s): GeoItem => ({ t: 'line', a: f.pts[s[0]!]!, b: f.pts[s[1]!]! }))
  for (const [k, p] of Object.entries(f.pts)) items.push({ t: 'text', at: add(p, mul(norm(f.sides[k]!), 15)), text: k, letter: true })
  return relQuestion(
    kpId,
    d,
    rng,
    `seg-${f.name}-${s1}-${s2}`,
    [text('m4.quad.segRelQ', { a: s1, b: s2 }), geoPart([fitFig(items, 14)], f.name === 'rect' ? '（长方形 ABCD）' : f.name === 'tri' ? '（三角形 AEC，B 在 AC 上、D 在 EC 上，连着线段 BD）' : '（一个六边形 ABCDEF，边都是横的或竖的）')],
    rel,
  )
}

/** 练习十五 4：两条直线相交，∠1 是直角，另外三个角也是直角 */
function genRightAll(kpId: string, d: Difficulty, rng: RNG): Question {
  const ask = rng.int(2, 4)
  const O: GeoPt = [0, 0]
  const L = 80
  const at = (deg: number): GeoPt => along(O, dir(deg), 26)
  const items: GeoItem[] = [
    { t: 'line', a: [-L, 0], b: [L, 0] },
    { t: 'line', a: [0, -L], b: [0, L] },
    { t: 'arc', at: O, a: [10, 0], b: [0, -10], right: true },
    { t: 'text', at: at(45), text: '1', tone: 'd' },
    { t: 'text', at: at(135), text: '2', tone: 'd' },
    { t: 'text', at: at(225), text: '3', tone: 'd' },
    { t: 'text', at: at(315), text: '4', tone: 'd' },
  ]
  return degQuestion({
    kpId,
    d,
    sig: `rightall-${ask}`,
    stem: [text('m4.quad.rightAllQ', { n: ask }), geoPart([fitFig(items, 14)], '（两条直线相交成四个角，右上的 ∠1 画着直角记号）')],
    value: 90,
    rng,
    max: 360,
    smart: [180, 45, 270],
  })
}

/** 判断题（例 1 的定义；两条线段不相交不一定平行——课本「这里画的是直线，它们真的不相交吗？」） */
const PAR_JUDGES: { key: string; yes: boolean }[] = [
  { key: 'm4.quad.jNoCross', yes: true },
  { key: 'm4.quad.jSegNoCross', yes: false },
  { key: 'm4.quad.jRightPerp', yes: true },
  { key: 'm4.quad.jPerpLine', yes: true },
  { key: 'm4.quad.jFootLine', yes: false },
  { key: 'm4.quad.jParPerp', yes: false },
]
function genParJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const j = rng.pick(PAR_JUDGES)
  return judge(kpId, d, rng, `pj-${j.key}`, [text(j.key)], j.yes)
}

/** 练习十五 12（第 3 档）：a // b，一条直线穿过它们，同一个位置上的 ∠1、∠2 一样大 */
function genCorresponding(kpId: string, d: Difficulty, rng: RNG): Question {
  const deg = rng.pick([40, 45, 50, 55, 60, 65, 70, 110, 120, 130])
  const slope = rng.pick([-14, -10, 0, 8])
  const u = dir(slope)
  const v = dir(slope + deg)
  const P1: GeoPt = [0, 0]
  const P2: GeoPt = along(P1, v, -80)
  const L = 120
  const items: GeoItem[] = [
    { t: 'line', a: along(P1, u, -L), b: along(P1, u, L) },
    { t: 'line', a: along(P2, u, -L), b: along(P2, u, L) },
    { t: 'line', a: along(P1, v, 60), b: along(P2, v, -60) },
    { t: 'arc', at: P1, a: along(P1, u, 10), b: along(P1, v, 10) },
    { t: 'arc', at: P2, a: along(P2, u, 10), b: along(P2, v, 10) },
    { t: 'text', at: along(P1, dir(slope + deg / 2), labelDist(deg)), text: '1', tone: 'd' },
    { t: 'text', at: along(P2, dir(slope + deg / 2), labelDist(deg)), text: '2', tone: 'd' },
    { t: 'text', at: add(along(P1, u, -L), [-4, -12]), text: 'a', letter: true },
    { t: 'text', at: add(along(P2, u, -L), [-4, -12]), text: 'b', letter: true },
  ]
  return degQuestion({
    kpId,
    d,
    sig: `corr-${deg}-${slope}`,
    stem: [text('m4.quad.corrQ', { deg }), geoPart([fitFig(items, 14)], '（两条平行线 a、b，一条直线穿过它们，同一侧同一个位置上标着 ∠1、∠2）')],
    value: deg,
    rng,
    max: 180,
    smart: [180 - deg, 90, deg + 10],
  })
}

defineGenerator('m4s1-06-parallel', (d, rng) => {
  const kpId = 'm4s1-06-parallel'
  const roll = rng.next()
  if (d === 1) {
    // 例 1：方格纸上两条直线的位置关系、平行线和互相垂直的定义、a // b、a ⊥ b、垂线和垂足；做一做 3 量得的角；练习十五 1
    if (roll < 0.28) return genRelation(kpId, d, rng)
    if (roll < 0.4) return genPickLines(kpId, d, rng)
    if (roll < 0.54) return genDefine(kpId, d, rng)
    if (roll < 0.66) return genNotation(kpId, d, rng)
    if (roll < 0.76) return genFoot(kpId, d, rng)
    if (roll < 0.86) return genMeasured(kpId, d, rng)
    return genSegments(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return genSegments(kpId, d, rng)
    if (roll < 0.5) return genRelation(kpId, d, rng)
    if (roll < 0.72) return genParJudge(kpId, d, rng)
    if (roll < 0.85) return genRightAll(kpId, d, rng)
    return genMeasured(kpId, d, rng)
  }
  if (roll < 0.5) return genCorresponding(kpId, d, rng)
  if (roll < 0.75) return genParJudge(kpId, d, rng)
  return genSegments(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 点到直线的距离（例 2–5）
// ─────────────────────────────────────────────────────────────

const BADGES = ['1', '2', '3', '4']

/** 例 3：从直线外一点 A 到直线画几条线段，哪一条最短（垂直的那条；第 1 档照课本画直角记号）。编号写在每条线段的下端、直线下面 */
function genShortest(kpId: string, d: Difficulty, rng: RNG): Question {
  const h = rng.int(8, 11) * 10
  const A: GeoPt = [0, -h]
  // 垂足在 0，别的线段落在两边，下端至少隔 40（编号不挤在一起）
  const pool = [-130, -85, 50, 95, 140]
  let others: number[]
  do others = some(rng, pool, rng.chance(0.5) ? 2 : 3)
  while (others.some((x, i) => others.some((y, j) => i !== j && Math.abs(x - y) < 40)))
  const xs = [0, ...others]
  const order = rng.shuffle(xs.map((_, i) => i))
  const items: GeoItem[] = [{ t: 'line', a: [-160, 0], b: [160, 0] }, { t: 'dot', at: A, label: 'A', side: 'n' }]
  xs.forEach((x, i) => {
    items.push({ t: 'line', a: A, b: [x, 0], thin: true })
    items.push({ t: 'text', at: [x, 20], text: BADGES[order[i]!]!, badge: true })
  })
  if (d === 1) items.push({ t: 'arc', at: [0, 0], a: [10, 0], b: [0, -10], right: true })
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `short-${h}-${xs.join('.')}-${order.join('')}${d === 1 ? 'm' : ''}`,
    stem: [text('m4.quad.shortestQ'), geoPart([fitFig(items, 16)], `（点 A 到直线画了 ${xs.length} 条线段，下端标着 1 到 ${xs.length}）`)],
    value: order[0]! + 1,
    rng,
    min: 1,
    max: xs.length,
    input: 'choice',
  })
}

/** 例 3 的结论：垂直线段最短，它的长度叫作这点到直线的距离 */
function genDistDef(kpId: string, d: Difficulty, rng: RNG): Question {
  return rng.chance(0.5)
    ? pickWord(kpId, d, rng, 'ddef-short', [text('m4.quad.shortDefQ')], 'm4.quad.perpSeg', ['m4.quad.slantSeg'])
    : pickWord(kpId, d, rng, 'ddef-dist', [text('m4.quad.distDefQ')], 'm4.quad.distWord', ['m4.quad.perpLine', 'm4.quad.foot'])
}

/** 做一做 3（过马路）、练习十五 10（幸福镇修路）、9（跳远）：三条路线里垂直的那条最短 */
function genRoute(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['road', 'town', 'jump'] as const)
  const order = rng.shuffle([0, 1, 2]) // 垂直的、左斜的、右斜的各是几号
  const items: GeoItem[] = []
  let ends: GeoPt[]
  let from: GeoPt
  if (kind === 'road') {
    // 马路：上下两条边，A 在下边上，三条路线走到上边
    items.push({ t: 'poly', pts: [[-140, -90], [140, -90], [140, 0], [-140, 0]], fill: 'soft', stroke: 'soft' })
    items.push({ t: 'line', a: [-140, -90], b: [140, -90] }, { t: 'line', a: [-140, 0], b: [140, 0] })
    from = [rng.int(-2, 2) * 10, 0]
    ends = [[from[0], -90], [from[0] - rng.int(6, 9) * 10, -90], [from[0] + rng.int(6, 9) * 10, -90]]
    items.push({ t: 'dot', at: from, label: 'A', side: 's' })
  } else if (kind === 'town') {
    // 幸福镇在左上，公路是两条斜着的平行线
    const rot = rng.pick([-35, -45, -25])
    const u = dir(rot)
    const n: GeoPt = [u[1], -u[0]] // 朝左上的法向
    const P: GeoPt = [0, 0]
    items.push({ t: 'line', a: along(P, u, -130), b: along(P, u, 130) }, { t: 'line', a: along(along(P, n, -24), u, -130), b: along(along(P, n, -24), u, 130) })
    from = along(P, n, 95)
    const foot = P
    ends = [foot, along(foot, u, -rng.int(6, 8) * 10), along(foot, u, rng.int(6, 8) * 10)]
    items.push({ t: 'dot', at: from }, { t: 'text', at: add(from, [0, -22]), text: '🏘️', big: true })
  } else {
    // 跳远：竖着的起跳线，落脚点 A 在右边
    items.push({ t: 'poly', pts: [[0, -90], [160, -90], [160, 90], [0, 90]], fill: 'a', stroke: 'a' })
    items.push({ t: 'line', a: [0, -100], b: [0, 100] })
    from = [rng.int(10, 13) * 10, rng.int(-2, 2) * 10]
    ends = [[0, from[1]], [0, from[1] - rng.int(5, 7) * 10], [0, from[1] + rng.int(5, 7) * 10]]
    items.push({ t: 'dot', at: from, label: 'A', side: 'e' })
  }
  ends.forEach((e, i) => {
    // 三条路线画得一样（虚线），只看哪条和对面的边垂直；编号写在路线那头再往外一点（三个编号分得开）
    items.push({ t: 'line', a: from, b: e, dash: true, stroke: 'b' })
    items.push({ t: 'text', at: along(e, norm(sub(e, from)), 18), text: BADGES[order[i]!]!, badge: true })
  })
  const key = { road: 'm4.quad.roadQ', town: 'm4.quad.townQ', jump: 'm4.quad.jumpQ' }[kind]
  const alt = { road: '（马路的下边上有一点 A，三条路线走到马路对面，标着 1、2、3）', town: '（一个镇子和一条公路，镇子到公路画了三条路线，标着 1、2、3）', jump: '（起跳线和沙坑里的落脚点 A，三条线段连到起跳线上，标着 1、2、3）' }[kind]
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `route-${kind}-${order.join('')}-${ends.map((e) => e.map(Math.round).join('.')).join('_')}`,
    stem: [text(key), geoPart([fitFig(items, 18)], alt)],
    value: order[0]! + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/**
 * 例 2、做一做 1：过点 A 画直线 l 的垂线，哪幅图画对了——对的：过 A 且垂直；错的：垂直但不过 A、过 A 但不垂直。
 * 点 A 在直线上（例 2(1)）或在直线外（例 2(2)）；直线横着、竖着或斜着。三幅图画得小一点，手机上排得下一行
 */
function genPerpDraw(kpId: string, d: Difficulty, rng: RNG): Question {
  const on = rng.chance(0.4)
  const rot = rng.pick(d === 1 ? [0, 0, 90] : [0, 90, 30, -30, 45, -45])
  const u = dir(rot)
  const n: GeoPt = [u[1], -u[0]]
  const off = 42 // 点 A 离直线多远
  const A: GeoPt = on ? [0, 0] : along([0, 0], n, off)
  const kinds = rng.shuffle(['good', 'miss', 'tilt'] as const)
  const figs = kinds.map((k) => {
    const items: GeoItem[] = [{ t: 'line', a: along([0, 0], u, -58), b: along([0, 0], u, 58) }, { t: 'text', at: add(along([0, 0], u, 58), mul(n, -12)), text: 'l', letter: true }]
    let foot: GeoPt = [0, 0]
    let dirv: GeoPt = n
    let lean = 0 // 画的线往哪边歪（字母 A 标在另一边）
    if (k === 'miss') foot = along([0, 0], u, rng.pick([-26, 26]))
    if (k === 'tilt') {
      lean = rng.pick([-28, 28])
      dirv = dir(rot + 90 + lean)
      // 过 A：从 A 沿 dirv 往回走到直线上
      foot = along(A, dirv, -(on ? 0 : off) / (dirv[0] * n[0] + dirv[1] * n[1]))
    }
    items.push({ t: 'line', a: along(foot, dirv, -22), b: along(foot, dirv, on ? 50 : off + 22), stroke: 'b' })
    if (k !== 'tilt') items.push({ t: 'arc', at: foot, a: along(foot, u, 9), b: along(foot, n, 9), right: true })
    const label = add(A, mul(dir(rot + 90 + (lean > 0 ? -55 : 55)), 15))
    items.push({ t: 'dot', at: A }, { t: 'text', at: label, text: 'A', letter: true })
    return fitFig(items, 8)
  })
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `pdraw-${on ? 'on' : 'off'}-${rot}-${kinds.join('')}`,
    stem: [text('m4.quad.perpDrawQ'), geoPart(figs, '（三幅图，编号 1 到 3：直线 l 和点 A，每幅图里都画了一条线）', true)],
    value: kinds.indexOf('good') + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 例 4、做一做 1：过点 A 画直线 a 的平行线，哪幅图画对了——对的：过 A 且平行；错的：平行但不过 A、过 A 但不平行 */
function genParDraw(kpId: string, d: Difficulty, rng: RNG): Question {
  const rot = rng.pick(d === 1 ? [0, 0, -20] : [0, -20, 20, -35])
  const u = dir(rot)
  const n: GeoPt = [u[1], -u[0]]
  const A: GeoPt = along([0, 0], n, 36)
  const kinds = rng.shuffle(['good', 'miss', 'tilt'] as const)
  const L = 58
  const figs = kinds.map((k) => {
    const items: GeoItem[] = [{ t: 'line', a: along([0, 0], u, -L), b: along([0, 0], u, L) }, { t: 'text', at: add(along([0, 0], u, L), mul(n, -12)), text: 'a', letter: true }]
    if (k === 'good') items.push({ t: 'line', a: along(A, u, -L), b: along(A, u, L), stroke: 'b' })
    else if (k === 'miss') {
      const B = along([0, 0], n, rng.pick([18, 56]))
      items.push({ t: 'line', a: along(B, u, -L), b: along(B, u, L), stroke: 'b' })
    } else {
      const v = dir(rot + rng.pick([-14, 14]))
      items.push({ t: 'line', a: along(A, v, -L), b: along(A, v, L), stroke: 'b' })
    }
    items.push({ t: 'dot', at: A }, { t: 'text', at: add(add(A, mul(n, 16)), mul(u, -11)), text: 'A', letter: true })
    return fitFig(items, 8)
  })
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `pardraw-${rot}-${kinds.join('')}`,
    stem: [text('m4.quad.parDrawQ'), geoPart(figs, '（三幅图，编号 1 到 3：直线 a 和点 A，每幅图里都画了一条线）', true)],
    value: kinds.indexOf('good') + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 例 2 用三角尺画垂线：用的是直角；一条直角边和直线重合、另一条直角边过这个点 */
function genRulerPerp(kpId: string, d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['angle', 'good', 'bad'] as const)
  if (which === 'angle') return pickWord(kpId, d, rng, 'rperp-angle', [text('m4.quad.rulerAngleQ')], 'm4.quad.rightAngle', ['m4.quad.acuteAngle'])
  return judge(kpId, d, rng, `rperp-${which}`, [text(which === 'good' ? 'm4.quad.rulerGoodQ' : 'm4.quad.rulerBadQ')], which === 'good')
}

/** 例 4(2)：a // b，从 a 上的点向 b 画垂直的线段，它们和 a 也垂直，长度都相等 */
function genParSegs(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 3 ? 4 : 3
  const gap = rng.int(6, 9) * 10
  const xs = [0]
  for (let i = 1; i < n; i++) xs.push(xs[i - 1]! + rng.int(4, 7) * 10)
  const top = ['A', 'B', 'C', 'D'].slice(0, n)
  const bot = ['E', 'F', 'G', 'H'].slice(0, n)
  const end = xs[n - 1]!
  const items: GeoItem[] = [
    { t: 'line', a: [-40, 0], b: [end + 50, 0] },
    { t: 'line', a: [-40, gap], b: [end + 50, gap] },
    { t: 'text', at: [-54, 0], text: 'a', letter: true },
    { t: 'text', at: [-54, gap], text: 'b', letter: true },
  ]
  xs.forEach((x, i) => {
    items.push({ t: 'line', a: [x, 0], b: [x, gap], stroke: 'd', thin: true })
    items.push({ t: 'arc', at: [x, gap], a: [x + 10, gap], b: [x, gap - 10], right: true })
    items.push({ t: 'text', at: [x, -14], text: top[i]!, letter: true }, { t: 'text', at: [x, gap + 16], text: bot[i]!, letter: true })
  })
  const fig = geoPart([fitFig(items, 12)], `（两条平行线 a、b，从 a 上的点 ${top.join('、')} 向 b 画了垂直的线段）`)
  const segs = top.map((t, i) => `${t}${bot[i]}`)
  const roll = rng.next()
  if (roll < 0.55) {
    const [known, ask] = rng.shuffle(segs).slice(0, 2) as [string, string]
    const len = rng.int(2, 6)
    return numberQuestion({
      kpId,
      type: T,
      difficulty: d,
      sig: `pseg-len-${xs.join('.')}-${known}-${ask}-${len}`,
      stem: [text('m4.quad.parSegQ', { list: segs.join('、'), known, ask, n: len }), fig],
      value: len,
      rng,
      min: 1,
      max: 12,
      smart: [len + 1, len - 1, len * 2],
    })
  }
  const [s1, s2] = rng.shuffle(segs).slice(0, 2) as [string, string]
  const key = roll < 0.7 ? 'm4.quad.parSegPerpQ' : roll < 0.85 ? 'm4.quad.parSegEqQ' : 'm4.quad.parSegDiffQ'
  return judge(kpId, d, rng, `pseg-${key}-${s1}-${s2}-${xs.join('.')}`, [text(key, { a: s1, b: s2 }), fig], key !== 'm4.quad.parSegDiffQ')
}

/** 做一做 2（p75）、练习十五 3：两条直线都和第三条垂直（或都和第三条平行），这两条直线互相平行 */
function genTwoPerp(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) {
    const perp = rng.chance(0.6)
    return relQuestion(kpId, d, rng, `sticks-${perp ? 'perp' : 'par'}`, [text(perp ? 'm4.quad.sticksPerpQ' : 'm4.quad.sticksParQ')], 'par')
  }
  // 点子图上画直线 c，a、b 都和 c 垂直（画直角记号）
  const vertical = rng.chance(0.5)
  const W = 10
  const H = 8
  // 竖着的 c：整幅图沿对角线翻过来（x、y 对调）
  const items: GeoItem[] = [{ t: 'grid', x: 0, y: 0, w: vertical ? H : W, h: vertical ? W : H, dots: true }]
  const xa = rng.int(2, 4)
  const xb = xa + rng.int(2, 4)
  const yc = rng.int(4, 6)
  const map = (p: GeoPt): GeoPt => (vertical ? [p[1], p[0]] : p)
  items.push({ t: 'line', a: map([0.5, yc]), b: map([W - 0.5, yc]) })
  for (const [x, name] of [
    [xa, 'a'],
    [xb, 'b'],
  ] as const) {
    items.push({ t: 'line', a: map([x, 0.5]), b: map([x, H - 0.5]), stroke: 'b' })
    items.push({ t: 'arc', at: map([x, yc]), a: map([x + 1, yc]), b: map([x, yc - 1]), right: true })
    items.push({ t: 'text', at: map([x + 0.35, 0.6]), text: name, letter: true })
  }
  items.push({ t: 'text', at: map([W - 0.6, yc - 0.4]), text: 'c', letter: true })
  return relQuestion(
    kpId,
    d,
    rng,
    `twoperp-${vertical ? 'v' : 'h'}-${xa}-${xb}-${yc}`,
    [text('m4.quad.twoPerpQ'), geoPart([{ w: vertical ? H : W, h: vertical ? W : H, px: vertical ? 18 : 22, items }], '（点子图上的直线 c，直线 a、b 都和 c 相交，交点处画着直角记号）')],
    'par',
  )
}

/** 例 5 画长方形：先画直角，用圆规截出长和宽，再过两个点作垂线；做一做 3（p75）长方形的对边互相平行、相邻的边互相垂直 */
const RECT_STEPS: { key: string; correct: string; wrong: string[] }[] = [
  { key: 'm4.quad.rectFirstQ', correct: 'm4.quad.rightAngle', wrong: ['m4.quad.acuteAngle', 'm4.quad.obtuseAngle'] },
  { key: 'm4.quad.rectCompassQ', correct: 'm4.quad.compass', wrong: ['m4.quad.protractor'] },
  { key: 'm4.quad.rectAdjQ', correct: 'm4.quad.perp', wrong: ['m4.quad.parallel'] },
  { key: 'm4.quad.rectOppQ', correct: 'm4.quad.parallel', wrong: ['m4.quad.perp'] },
]
function genRectSteps(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.pick(RECT_STEPS)
  return pickWord(kpId, d, rng, `rstep-${s.key}`, [text(s.key)], s.correct, s.wrong)
}

/** 方格纸上点 A 到直线 l 的距离（每格 1 厘米）：数一数垂直线段有几格；或者在三条线段里挑出表示距离的那条 */
function genGridDist(kpId: string, d: Difficulty, rng: RNG): Question {
  // 先按横着的直线 l 画（W × H 格），竖着的（第 2 档起）整幅图 x、y 对调
  const W = 8
  const H = 6
  const vertical = d >= 2 && rng.chance(0.5)
  const map = (p: GeoPt): GeoPt => (vertical ? [p[1], p[0]] : p)
  const gw = vertical ? H : W
  const gh = vertical ? W : H
  const low = rng.chance(0.5) // 直线 l 在下面（竖着时在右边）
  const ly = low ? H - 1 : 1
  const ax = rng.int(2, W - 2)
  const dist = rng.int(2, H - 2)
  const ay = low ? ly - dist : ly + dist
  const A: GeoPt = [ax, ay]
  const away = (p: GeoPt, k: number): GeoPt => map([p[0], p[1] + (low ? k : -k)]) // 往直线外侧挪一点（标字母用）
  const items: GeoItem[] = [
    { t: 'grid', x: 0, y: 0, w: gw, h: gh },
    { t: 'line', a: map([0.4, ly]), b: map([W - 0.4, ly]) },
    { t: 'text', at: away([W - 0.6, ly], 0.5), text: 'l', letter: true },
  ]
  const fig = (): GeoFig => ({ w: gw, h: gh, px: 26, items })
  if (rng.chance(d === 1 ? 0.5 : 0.4)) {
    // 三条线段连到直线上，只有一条垂直
    const offs = rng.shuffle([0, rng.pick([-2, -3]), rng.pick([2, 3])])
    const names = ['B', 'C', 'D']
    offs.forEach((o, i) => {
      const P: GeoPt = [ax + o, ly]
      items.push({ t: 'line', a: map(A), b: map(P), stroke: 'b' }, { t: 'text', at: away(P, 0.55), text: names[i]!, letter: true }, { t: 'dot', at: map(P) })
    })
    items.push({ t: 'dot', at: map(A) }, { t: 'text', at: away(A, -0.55), text: 'A', letter: true })
    const correct = `A${names[offs.indexOf(0)]}`
    return labelQuestion({
      kpId,
      type: T,
      difficulty: d,
      sig: `gdist-seg-${vertical ? 'v' : 'h'}-${ax}-${ay}-${ly}-${offs.join('.')}`,
      stem: [text('m4.quad.whichDistQ'), geoPart([fig()], '（方格纸上的直线 l 和点 A，从 A 画了三条线段到直线上）')],
      correct,
      distractors: names.filter((x) => `A${x}` !== correct).map((x) => `A${x}`),
      rng,
    })
  }
  items.push({ t: 'dot', at: map(A) }, { t: 'text', at: away(A, -0.55), text: 'A', letter: true })
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `gdist-${vertical ? 'v' : 'h'}-${ax}-${ay}-${ly}`,
    stem: [text('m4.quad.gridDistQ'), geoPart([fig()], '（方格纸上的直线 l 和点 A）')],
    value: dist,
    rng,
    min: 1,
    max: 8,
    smart: [dist + 1, dist - 1, dist + 2],
  })
}

defineGenerator('m4s1-06-distance', (d, rng) => {
  const kpId = 'm4s1-06-distance'
  const roll = rng.next()
  if (d === 1) {
    // 例 2 画垂线（哪幅图画对了、三角尺怎么放）、例 3 垂直线段最短与距离、做一做 3 过马路、例 4 画平行线与平行线间的垂直线段、
    // 做一做 2 两条直线都垂直于 c、例 5 画长方形的步骤；方格纸上的距离
    if (roll < 0.16) return genShortest(kpId, d, rng)
    if (roll < 0.26) return genDistDef(kpId, d, rng)
    if (roll < 0.38) return genRoute(kpId, d, rng)
    if (roll < 0.48) return genPerpDraw(kpId, d, rng)
    if (roll < 0.54) return genRulerPerp(kpId, d, rng)
    if (roll < 0.64) return genParSegs(kpId, d, rng)
    if (roll < 0.72) return genParDraw(kpId, d, rng)
    if (roll < 0.8) return genTwoPerp(kpId, d, rng)
    if (roll < 0.88) return genRectSteps(kpId, d, rng)
    return genGridDist(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.15) return genShortest(kpId, d, rng)
    if (roll < 0.33) return genRoute(kpId, d, rng)
    if (roll < 0.48) return genPerpDraw(kpId, d, rng)
    if (roll < 0.6) return genParDraw(kpId, d, rng)
    if (roll < 0.75) return genParSegs(kpId, d, rng)
    return genGridDist(kpId, d, rng)
  }
  if (roll < 0.4) return genGridDist(kpId, d, rng)
  if (roll < 0.7) return genParSegs(kpId, d, rng)
  return genPerpDraw(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 四边形：平行四边形、梯形（等腰、直角、一般的）、一般四边形、长方形
// ─────────────────────────────────────────────────────────────

/**
 * 平行四边形 ABCD（课本的摆法：A 左上、B 右上、C 右下、D 左下）：下边长 w，上下相距 h，锐角 acute；lean = 上边往右（1）还是往左（−1）错开。
 * 锐角在左下（lean = 1）或右下（lean = −1）
 */
function paraPts(w: number, h: number, acute: number, lean: 1 | -1): GeoPt[] {
  const s = (h / Math.tan(rad(acute))) * lean
  return [
    [s, 0],
    [w + s, 0],
    [w, h],
    [0, h],
  ]
}
/** 梯形（上底在上、下底在下）：下底 wb、上底 wt、上下相距 h；上底左端离下底左端 sl（等腰：(wb − wt) / 2，直角：0 或 wb − wt） */
function trapPts(wb: number, wt: number, h: number, sl: number): GeoPt[] {
  return [
    [sl, 0],
    [sl + wt, 0],
    [wb, h],
    [0, h],
  ]
}
type TrapKind = 'iso' | 'right' | 'plain'
/**
 * 一个梯形（上底在上）：上下相距 h、上底 wt；两条腰往外偏出去 sl、sr（下底 = wt + sl + sr）。
 * 等腰的两边偏得一样多；直角的一边不偏（竖着）；一般的两条腰都明显斜着（偏出去至少 0.35 h，不会看成直角梯形），
 * 而且斜得明显不一样（差至少 0.6 h，不会看成等腰梯形）
 */
function makeTrap(kind: TrapKind, rng: RNG): GeoPt[] {
  const h = rng.int(7, 9) * 10
  const wt = rng.int(6, 9) * 10
  const step = (lo: number, hi: number): number => rng.int(Math.ceil((lo * h) / 5), Math.floor((hi * h) / 5)) * 5
  if (kind === 'iso') {
    const off = step(0.4, 0.8)
    return trapPts(wt + 2 * off, wt, h, off)
  }
  if (kind === 'right') {
    const off = step(0.5, 1)
    return trapPts(wt + off, wt, h, rng.chance(0.5) ? 0 : off)
  }
  const a = step(0.35, 0.55)
  const b = a + step(0.6, 0.9)
  const [sl, sr] = rng.chance(0.5) ? [a, b] : [b, a]
  return trapPts(wt + sl + sr, wt, h, sl)
}
/** 一般四边形：没有平行的边（两组对边的方向都差 14° 以上）、凸的 */
function plainQuad(rng: RNG): GeoPt[] {
  for (;;) {
    const pts: GeoPt[] = [
      [rng.int(0, 4) * 10, rng.int(0, 3) * 10],
      [rng.int(13, 18) * 10, rng.int(0, 4) * 10],
      [rng.int(14, 19) * 10, rng.int(8, 10) * 10],
      [rng.int(-2, 3) * 10, rng.int(7, 10) * 10],
    ]
    const e = (i: number): GeoPt => sub(pts[(i + 1) % 4]!, pts[i]!)
    if (lineAngle(e(0), e(2)) < 14 || lineAngle(e(1), e(3)) < 14) continue
    const crosses = [0, 1, 2, 3].map((i) => {
      const a = e(i)
      const b = e((i + 1) % 4)
      return Math.sign(a[0] * b[1] - a[1] * b[0])
    })
    if (new Set(crosses).size !== 1) continue
    if ([0, 1, 2, 3].some((i) => interiorAt(pts, i) < 40 || interiorAt(pts, i) > 150)) continue
    return pts
  }
}
const rectPts = (w: number, h: number): GeoPt[] => [
  [0, 0],
  [w, 0],
  [w, h],
  [0, h],
]
/** 图形转个角度（绕中心） */
function turnPts(pts: GeoPt[], deg: number): GeoPt[] {
  const c: GeoPt = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
  return pts.map((p) => rotate(p, deg, c))
}
/** 两组对边各平不平行：[AB // CD, BC // DA] */
export function parallelPairs(pts: GeoPt[]): [boolean, boolean] {
  const e = (i: number): GeoPt => sub(pts[(i + 1) % 4]!, pts[i]!)
  return [lineAngle(e(0), e(2)) < 0.5, lineAngle(e(1), e(3)) < 0.5]
}
type QuadKind = 'para' | 'rect' | 'trap' | 'plain'
function quadOf(kind: QuadKind, rng: RNG): GeoPt[] {
  if (kind === 'para') return paraPts(rng.int(14, 17) * 10, rng.int(7, 9) * 10, rng.pick([45, 50, 55, 60, 65, 70]), rng.chance(0.5) ? 1 : -1)
  if (kind === 'rect') return rectPts(rng.int(13, 17) * 10, rng.int(7, 9) * 10)
  if (kind === 'trap') return makeTrap(rng.pick(['iso', 'right', 'plain'] as const), rng)
  return plainQuad(rng)
}
const quadSig = (pts: GeoPt[]): string => pts.map((p) => `${Math.round(p[0] / 5)}.${Math.round(p[1] / 5)}`).join('_')
/** 等比缩放到宽 width（几幅图排一行的挑图题：每幅一样宽，手机上三幅排得下一行） */
function toWidth(pts: GeoPt[], width = 76): GeoPt[] {
  const xs = pts.map((p) => p[0])
  const k = width / (Math.max(...xs) - Math.min(...xs))
  return pts.map((p): GeoPt => [p[0] * k, p[1] * k])
}
const QUAD_FILL: Record<QuadKind, 'b' | 'c' | 'a'> = { para: 'b', rect: 'c', trap: 'a', plain: 'c' }

// ─────────────────────────────────────────────────────────────
// 认识平行四边形（例 6）
// ─────────────────────────────────────────────────────────────

const SHAPE_KEY = { para: 'm4.quad.para', trap: 'm4.quad.trap', rect: 'm4.quad.rect', tri: 'm4.quad.tri' } as const
const shapeL = (k: keyof typeof SHAPE_KEY): LStr => ({ k: SHAPE_KEY[k] })

/** 定义：两组对边分别平行的四边形叫作平行四边形；平行四边形有 2 组、梯形只有 1 组对边平行 */
function genParaDef(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.55)) return labelQuestion({ kpId, type: T, difficulty: d, sig: 'pdef', stem: [text('m4.quad.paraDefQ')], correct: shapeL('para'), distractors: [shapeL('trap')], rng })
  return numberQuestion({ kpId, type: T, difficulty: d, sig: 'ppairs', stem: [text('m4.quad.paraPairsQ')], value: 2, rng, min: 0, max: 4, smart: [1, 4, 0] })
}

/** 这个图形是平行四边形吗（第 1 档：平行四边形、梯形、一般四边形；第 2 档加长方形——长方形是特殊的平行四边形） */
function genIsPara(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick<QuadKind>(d === 1 ? ['para', 'para', 'trap', 'plain'] : ['para', 'rect', 'trap', 'plain'])
  const turn = rng.pick(d === 1 ? [0, 0, 180] : [0, 90, 180, 30, -30])
  const pts = turnPts(quadOf(kind, rng), turn)
  return judge(
    kpId,
    d,
    rng,
    `ispara-${kind}-${quadSig(pts)}`,
    [text('m4.quad.isParaQ'), geoPart([fitFig([{ t: 'poly', pts, fill: QUAD_FILL[kind], stroke: QUAD_FILL[kind] }], 14)], '（一个四边形）')],
    kind === 'para' || kind === 'rect',
  )
}

/** 三个四边形里挑出平行四边形（干扰项里没有长方形：长方形也是平行四边形） */
function genPickPara(kpId: string, d: Difficulty, rng: RNG): Question {
  const kinds = rng.shuffle<QuadKind>(['para', 'trap', 'plain'])
  const shapes = kinds.map((k) => toWidth(turnPts(quadOf(k, rng), rng.pick([0, 0, 180]))))
  const figs = shapes.map((pts, i) => fitFig([{ t: 'poly', pts, fill: QUAD_FILL[kinds[i]!], stroke: QUAD_FILL[kinds[i]!] }], 8))
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `ppick-${shapes.map(quadSig).join(',')}`,
    stem: [text('m4.quad.pickParaQ'), geoPart(figs, '（三个四边形，编号 1 到 3）', true)],
    value: kinds.indexOf('para') + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 平行四边形 ABCD 的图：字母、边上标的长度、角的编号 / 度数 */
function paraFig(pts: GeoPt[], o: { sides?: (string | null)[]; corners?: (string | null)[] }): GeoFig {
  const items: GeoItem[] = [{ t: 'poly', pts, fill: 'b', stroke: 'b', ...(o.sides ? { labels: o.sides } : {}) }]
  o.corners?.forEach((c, i) => {
    if (c !== null) items.push(...cornerMark(pts, i, c))
  })
  items.push(...vertexLetters(pts, ['A', 'B', 'C', 'D']))
  return fitFig(items, 22)
}

/** 例 6(1)：平行四边形的对边相等——标着 AB、AD 的长度，问 CD 或 BC */
function genParaSides(kpId: string, d: Difficulty, rng: RNG): Question {
  const ab = rng.int(4, 9)
  let ad = rng.int(2, 7)
  if (ad === ab) ad = ab - 1
  const pts = paraPts(150, 80, rng.pick([50, 55, 60, 65, 70]), rng.chance(0.5) ? 1 : -1)
  const askCD = rng.chance(0.5)
  // 边的顺序：AB、BC、CD、DA；标 AB 和 DA（或 BC）
  const showBC = rng.chance(0.4)
  const sides: (string | null)[] = [`${ab} cm`, showBC ? `${ad} cm` : null, null, showBC ? null : `${ad} cm`]
  const ask = askCD ? 'CD' : showBC ? 'AD' : 'BC'
  const value = askCD ? ab : ad
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `psides-${ab}-${ad}-${ask}-${showBC ? 'bc' : 'da'}-${quadSig(pts)}`,
    stem: [text('m4.quad.paraSideQ', { side: ask }), geoPart([paraFig(pts, { sides })], '（平行四边形 ABCD，两条边上标着长度）')],
    value,
    rng,
    min: 1,
    max: 20,
    smart: askCD ? [ad, ab + ad, ab + 1] : [ab, ab + ad, ad + 1],
  })
}

/** 例 6(2)、做一做 4：平行四边形的对角相等，相邻两个角拼成平角（∠1 左下、∠2 右下、∠3 右上、∠4 左上） */
function genParaAngles(kpId: string, d: Difficulty, rng: RNG): Question {
  const acute = rng.pick([45, 50, 55, 60, 65, 70, 75])
  const lean: 1 | -1 = rng.chance(0.5) ? 1 : -1
  const pts = paraPts(150, 80, acute, lean)
  // pts：A 左上、B 右上、C 右下、D 左下；∠1 = D、∠2 = C、∠3 = B、∠4 = A
  const idx = [3, 2, 1, 0]
  const degAt = (n: number): number => Math.round(interiorAt(pts, idx[n - 1]!))
  const known = rng.int(1, 4)
  let ask = rng.int(1, 4)
  if (ask === known) ask = (known % 4) + 1
  const corners: (string | null)[] = [null, null, null, null]
  for (let n = 1; n <= 4; n++) corners[idx[n - 1]!] = String(n)
  return degQuestion({
    kpId,
    d,
    sig: `pang-${acute}-${lean}-${known}-${ask}`,
    stem: [text('m4.quad.paraAngleQ', { known, deg: degAt(known), ask }), geoPart([paraFig(pts, { corners })], '（平行四边形 ABCD，四个角标着 1、2、3、4）')],
    value: degAt(ask),
    rng,
    max: 360,
    smart: [degAt(known), 180 - degAt(ask), 360 - degAt(known)].filter((x) => x > 0),
  })
}

/** 做一做 3：平行四边形 ABCD 的 BC 标着 5 cm、∠C 标着 135°，还能知道哪些边、哪些角（∠1 在 B、∠2 在 A、∠3 在 D） */
function genParaKnow(kpId: string, d: Difficulty, rng: RNG): Question {
  const c = rng.pick([135, 135, 120, 125, 130, 140])
  const bc = rng.pick([5, 5, 4, 6, 7, 8])
  // 照课本摆：左边往右斜（lean = 1），D、B 是锐角，A、C 是钝角；画得高一点，A、C 两个钝角里的字不挤在一起
  const pts = paraPts(160, 85, 180 - c, 1)
  const corners: (string | null)[] = ['2', '1', `${c}°`, '3']
  const sides: (string | null)[] = [null, `${bc} cm`, null, null]
  const ask = rng.pick(['AD', 'n2', 'n1', 'n3'] as const)
  const fig = geoPart([paraFig(pts, { sides, corners })], '（平行四边形 ABCD：BC 边上标着长度，∠C 标着度数，另外三个角标着 1、2、3）')
  if (ask === 'AD') {
    return numberQuestion({ kpId, type: T, difficulty: d, sig: `pknow-AD-${c}-${bc}`, stem: [text('m4.quad.paraSideQ', { side: 'AD' }), fig], value: bc, rng, min: 1, max: 20, smart: [bc + 1, bc * 2, bc - 1] })
  }
  const n = Number(ask.slice(1))
  const value = n === 2 ? c : 180 - c
  return degQuestion({ kpId, d, sig: `pknow-${ask}-${c}-${bc}`, stem: [text('m4.quad.paraKnowQ', { n }), fig], value, rng, max: 360, smart: [n === 2 ? 180 - c : c, 90, 360 - c] })
}

/** 平行四边形的特点：对边相等、对角相等 */
function genParaProp(kpId: string, d: Difficulty, rng: RNG): Question {
  const sides = rng.chance(0.5)
  return pickWord(kpId, d, rng, `pprop-${sides ? 's' : 'a'}`, [text(sides ? 'm4.quad.paraSideEqQ' : 'm4.quad.paraAngleEqQ')], 'm4.quad.equal', ['m4.quad.notEqual'])
}

/** 练习十六 5：平行四边形花坛的周长、AB 边的长度，求 BC 边 */
function genPerimeter(kpId: string, d: Difficulty, rng: RNG): Question {
  const ab = rng.int(8, 20)
  let bc = rng.int(5, 15)
  if (bc === ab) bc += 1
  const p = 2 * (ab + bc)
  const pts = paraPts(150, 70, 60, 1)
  const reverse = d === 3 && rng.chance(0.5) // 第 3 档：知道 BC 求 AB
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `perim-${p}-${ab}${reverse ? 'r' : ''}`,
    stem: [
      text(reverse ? 'm4.quad.perimRevQ' : 'm4.quad.perimQ', { p, n: reverse ? bc : ab }),
      geoPart([paraFig(pts, { sides: [reverse ? null : `${ab} m`, reverse ? `${bc} m` : null, null, null] })], '（平行四边形花坛 ABCD，一条边上标着长度）'),
    ],
    value: reverse ? ab : bc,
    rng,
    min: 1,
    max: 100,
    smart: [p - ab, p / 2, p - 2 * ab, p / 4].filter((x) => Number.isInteger(x) && x > 0),
  })
}

/** 长方形、正方形和平行四边形、梯形的关系（整理和复习的知识结构图、练习十七 6(1)） */
const SPECIAL_JUDGES: { key: string; yes: boolean }[] = [
  { key: 'm4.quad.jRectPara', yes: true },
  { key: 'm4.quad.jParaRect', yes: false },
  { key: 'm4.quad.jSquareRect', yes: true },
  { key: 'm4.quad.jTrapPara', yes: false },
]
function genSpecial(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) return labelQuestion({ kpId, type: T, difficulty: d, sig: 'special-right', stem: [text('m4.quad.paraRightQ')], correct: shapeL('rect'), distractors: [shapeL('trap')], rng })
  const j = rng.pick(SPECIAL_JUDGES)
  return judge(kpId, d, rng, `special-${j.key}`, [text(j.key)], j.yes)
}

/** 两组平行线相交的图：练习十六 2 画两组平行线、练习十七 4 两张长方形纸条交叉，涂色（重叠）的部分是平行四边形 */
function genOverlapPara(kpId: string, d: Difficulty, rng: RNG): Question {
  const strips = rng.chance(0.5)
  const th = rng.pick([55, 60, 65, 70, 115, 120, 125])
  const h1 = rng.int(4, 6) * 10
  const h2 = rng.int(4, 6) * 10
  const v = dir(th)
  const n2: GeoPt = [-v[1], v[0]] // 第二组线的法向（和 v 垂直的单位向量）
  // 第一组：y = ±h1/2；第二组：p · n2 = ±h2/2
  const corner = (sy: number, s2: number): GeoPt => {
    const y = (sy * h1) / 2
    // n2x * x + n2y * y = s2 * h2 / 2
    const x = ((s2 * h2) / 2 - n2[1] * y) / n2[0]
    return [x, y]
  }
  const over: GeoPt[] = [corner(-1, -1), corner(-1, 1), corner(1, 1), corner(1, -1)]
  const items: GeoItem[] = []
  const L = 110
  if (strips) {
    const band1: GeoPt[] = [
      [-L, -h1 / 2],
      [L, -h1 / 2],
      [L, h1 / 2],
      [-L, h1 / 2],
    ]
    const c2 = (s: number, t: number): GeoPt => add(mul(n2, (s * h2) / 2), mul(v, t))
    const band2: GeoPt[] = [c2(-1, -L), c2(1, -L), c2(1, L), c2(-1, L)]
    items.push({ t: 'poly', pts: band1, fill: 'paper' }, { t: 'poly', pts: band2, fill: 'paper' }, { t: 'poly', pts: over, fill: 'd', stroke: 'd' })
  } else {
    items.push({ t: 'poly', pts: over, fill: 'd', stroke: 'd' })
    for (const s of [-1, 1]) {
      items.push({ t: 'line', a: [-L, (s * h1) / 2], b: [L, (s * h1) / 2] })
      const base = mul(n2, (s * h2) / 2)
      items.push({ t: 'line', a: along(base, v, -L * 0.8), b: along(base, v, L * 0.8) })
    }
  }
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `overp-${strips ? 's' : 'l'}-${th}-${h1}-${h2}`,
    stem: [text(strips ? 'm4.quad.stripsQ' : 'm4.quad.twoPairsQ'), geoPart([fitFig(items, 10)], strips ? '（两张长方形纸条交叉摆放，重叠的部分涂了颜色）' : '（两组平行线相交，围成的部分涂了颜色）')],
    correct: shapeL('para'),
    distractors: [shapeL('trap'), shapeL('tri')],
    rng,
  })
}

/**
 * 练习十六 8：方格纸上的四边形 ABCD（AB、DC 都是横的，所以是个梯形），把点 D 移到哪个点就成了平行四边形——
 * 下面一行上的 E、F、G 三个点里，对的那个让 DC 和 AB 一样长（数格子）；三个点和 D、C 之间都至少隔 2 格，字母不挤
 */
function genGridFix(kpId: string, d: Difficulty, rng: RNG): Question {
  const W = 11
  const H = 6
  for (;;) {
    const A: GeoPt = [rng.int(2, 4), 1]
    const B: GeoPt = [A[0] + rng.int(3, 5), 1]
    const C: GeoPt = [B[0] + rng.pick([-2, -1, 1, 2]), H - 1] // C 不在 B 的正下方：改好的是一般的平行四边形，不是长方形
    const good: GeoPt = add(A, sub(C, B)) // 平行四边形的第四个顶点
    const D: GeoPt = [good[0] + rng.pick([-2, 2]), H - 1]
    const xs = [D[0], C[0]]
    const ok = (x: number): boolean => x >= 0 && x <= W && xs.every((y) => Math.abs(x - y) >= 2)
    if (D[0] < 0 || D[0] > W || C[0] > W || !ok(good[0])) continue
    xs.push(good[0])
    const others: number[] = []
    for (const off of rng.shuffle([-4, -3, -2, 2, 3, 4])) {
      const x = good[0] + off
      if (others.length < 2 && ok(x)) {
        others.push(x)
        xs.push(x)
      }
    }
    if (others.length < 2) continue
    const cands = rng.shuffle([good[0], ...others])
    const names = ['E', 'F', 'G']
    const items: GeoItem[] = [{ t: 'grid', x: 0, y: 0, w: W, h: H }, { t: 'poly', pts: [A, B, C, D], stroke: 'ink' }]
    const quad: [string, GeoPt, GeoPt][] = [
      ['A', A, [-0.35, -0.4]],
      ['B', B, [0.35, -0.4]],
      ['C', C, [0.35, 0.45]],
      ['D', D, [-0.35, 0.45]],
    ]
    for (const [n, p, o] of quad) items.push({ t: 'text', at: add(p, o), text: n, letter: true })
    cands.forEach((x, i) => items.push({ t: 'dot', at: [x, H - 1] }, { t: 'text', at: [x, H - 0.45], text: names[i]!, letter: true }))
    const correct = names[cands.indexOf(good[0])]!
    return labelQuestion({
      kpId,
      type: T,
      difficulty: d,
      sig: `gfix-${A.join('.')}-${B.join('.')}-${C.join('.')}-${D[0]}-${cands.join('.')}`,
      stem: [text('m4.quad.gridFixQ'), geoPart([{ w: W, h: H, px: 24, items }], '（方格纸上的四边形 ABCD，下面一行上还有 E、F、G 三个点）')],
      correct,
      distractors: names.filter((x) => x !== correct),
      rng,
    })
  }
}

/** 练习十六 4：一个四边形被正方形的纸遮住一部分，露出来的上下两条边互相平行——可能是平行四边形，也可能是梯形 */
function genCovered(kpId: string, d: Difficulty, rng: RNG): Question {
  const W = 7
  const H = 5
  // 右边那条边：上端在第 xr 格，下端往左（slant > 0）或往右错开；下端不能缩进纸底下
  const [xr, slant] = rng.pick<[number, number]>([
    [6, 1],
    [6, -1],
    [5, -1],
  ])
  const top = 1
  const bot = 4
  const items: GeoItem[] = [
    { t: 'grid', x: 0, y: 0, w: W, h: H },
    { t: 'line', a: [3.6, top], b: [xr, top] },
    { t: 'line', a: [xr, top], b: [xr - slant, bot] },
    { t: 'line', a: [xr - slant, bot], b: [3.6, bot] },
    { t: 'poly', pts: [[0.3, 0.3], [3.7, 0.3], [3.7, 4.7], [0.3, 4.7]], fill: 'b', stroke: 'b' },
  ]
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `cover-${xr}-${slant}`,
    stem: [text('m4.quad.coverQ'), geoPart([{ w: W, h: H, px: 26, items }], '（方格纸上一个四边形的左边被一张正方形的纸遮住了，露出的上下两条边都是横的）')],
    correct: { k: 'm4.quad.coverBoth' },
    distractors: [{ k: 'm4.quad.coverPara' }, { k: 'm4.quad.coverTrap' }],
    rng,
  })
}

defineGenerator('m4s1-06-parallelogram', (d, rng) => {
  const kpId = 'm4s1-06-parallelogram'
  const roll = rng.next()
  if (d === 1) {
    // 第 78 页的定义、例 6 对边相等对角相等、做一做 3（BC = 5 cm、∠C = 135°）、做一做 4 相邻两个角、练习十六 5 周长
    if (roll < 0.1) return genParaDef(kpId, d, rng)
    if (roll < 0.24) return genIsPara(kpId, d, rng)
    if (roll < 0.34) return genPickPara(kpId, d, rng)
    if (roll < 0.48) return genParaSides(kpId, d, rng)
    if (roll < 0.64) return genParaAngles(kpId, d, rng)
    if (roll < 0.76) return genParaKnow(kpId, d, rng)
    if (roll < 0.84) return genParaProp(kpId, d, rng)
    return genPerimeter(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十六 2、4、5、8，练习十七 3、4、6
    if (roll < 0.18) return genPerimeter(kpId, d, rng)
    if (roll < 0.34) return genParaAngles(kpId, d, rng)
    if (roll < 0.52) return genSpecial(kpId, d, rng)
    if (roll < 0.66) return genOverlapPara(kpId, d, rng)
    if (roll < 0.8) return genGridFix(kpId, d, rng)
    if (roll < 0.9) return genCovered(kpId, d, rng)
    return genIsPara(kpId, d, rng)
  }
  if (roll < 0.35) return genGridFix(kpId, d, rng)
  if (roll < 0.65) return genPerimeter(kpId, d, rng)
  return genParaAngles(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 认识梯形（例 7、例 8）
// ─────────────────────────────────────────────────────────────

const TRAP_KEY: Record<TrapKind, string> = { iso: 'm4.quad.isoTrap', right: 'm4.quad.rightTrap', plain: 'm4.quad.neither' }

/** 定义：只有一组对边平行的四边形叫作梯形；直角梯形、等腰梯形；梯形有几组对边平行 */
function genTrapDef(kpId: string, d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['trap', 'right', 'iso', 'pairs'] as const)
  if (which === 'pairs') return numberQuestion({ kpId, type: T, difficulty: d, sig: 'tpairs', stem: [text('m4.quad.trapPairsQ')], value: 1, rng, min: 0, max: 4, smart: [2, 0, 4] })
  if (which === 'trap') return labelQuestion({ kpId, type: T, difficulty: d, sig: 'tdef', stem: [text('m4.quad.trapDefQ')], correct: shapeL('trap'), distractors: [shapeL('para')], rng })
  const right = which === 'right'
  return pickWord(kpId, d, rng, `tdef-${which}`, [text(right ? 'm4.quad.rightTrapDefQ' : 'm4.quad.isoTrapDefQ')], right ? 'm4.quad.rightTrap' : 'm4.quad.isoTrap', [right ? 'm4.quad.isoTrap' : 'm4.quad.rightTrap', 'm4.quad.para'])
}

/** 第 80 页：梯形各部分的名称——红色的那条边是上底、下底还是腰 */
function genTrapParts(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick<TrapKind>(['plain', 'iso', 'iso', 'right'])
  const pts = makeTrap(kind, rng)
  const side = rng.pick([0, 1, 2, 3]) // 0 上底、1 右腰、2 下底、3 左腰
  const part = side === 0 ? 'm4.quad.top' : side === 2 ? 'm4.quad.bottom' : 'm4.quad.leg'
  const items: GeoItem[] = [{ t: 'poly', pts, fill: 'a', stroke: 'a' }, { t: 'line', a: pts[side]!, b: pts[(side + 1) % 4]!, stroke: 'd' }]
  return pickWord(kpId, d, rng, `parts-${kind}-${side}-${quadSig(pts)}`, [text('m4.quad.partQ'), geoPart([fitFig(items, 16)], '（一个梯形，上底在上面，其中一条边画成红色）')], part, ['m4.quad.top', 'm4.quad.bottom', 'm4.quad.leg'].filter((k) => k !== part))
}

/** 做一做 1（p81）：这个梯形是等腰梯形、直角梯形，还是都不是（梯形倒过来、竖过来摆的也有；直角梯形第 1 档画直角记号） */
function genTrapKind(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick<TrapKind>(['iso', 'right', 'plain'])
  const turn = rng.pick(d === 1 ? [0, 0, 180, 90] : [0, 180, 90, 270])
  const raw = makeTrap(kind, rng)
  const pts = turnPts(raw, turn)
  const rights = kind === 'right' && (d === 1 || rng.chance(0.5)) ? [0, 1, 2, 3].filter((i) => Math.abs(interiorAt(raw, i) - 90) < 0.5) : []
  const items: GeoItem[] = [{ t: 'poly', pts, fill: 'a', stroke: 'a', ...(rights.length ? { right: rights } : {}) }]
  return pickWord(
    kpId,
    d,
    rng,
    `tkind-${kind}-${turn}-${quadSig(raw)}${rights.length ? 'm' : ''}`,
    [text('m4.quad.trapKindQ'), geoPart([fitFig(items, 14)], '（一个梯形）')],
    TRAP_KEY[kind],
    (['iso', 'right', 'plain'] as TrapKind[]).filter((k) => k !== kind).map((k) => TRAP_KEY[k]),
  )
}

/** 例 7：等腰梯形的两腰相等，同一条底上的两个角也相等（∠1 左下、∠2 右下） */
function genIsoAngle(kpId: string, d: Difficulty, rng: RNG): Question {
  const base = rng.pick([55, 60, 65, 70, 75])
  const wb = rng.int(16, 19) * 10
  const h = 70
  const off = h / Math.tan(rad(base))
  const pts = trapPts(wb, wb - 2 * off, h, off)
  const items: GeoItem[] = [{ t: 'poly', pts, fill: 'a', stroke: 'a' }, ...cornerMark(pts, 3, '1'), ...cornerMark(pts, 2, '2')]
  return degQuestion({
    kpId,
    d,
    sig: `isoang-${base}-${wb}`,
    stem: [text('m4.quad.isoAngleQ', { deg: base }), geoPart([fitFig(items, 16)], '（一个等腰梯形，下底的两个角标着 1、2）')],
    value: base,
    rng,
    max: 180,
    smart: [180 - base, 90, base + 10],
  })
}

/** 做一做 2（p81）：a // b，两条平行线之间画了几条线段（两两不平行），数一数有几个梯形 */
function genCountTrap(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? 3 : d === 2 ? rng.pick([3, 4]) : 4
  for (;;) {
    const gap = 90
    const tops: number[] = []
    const bots: number[] = []
    let x = 0
    let y = rng.int(-3, 0) * 10
    for (let i = 0; i < n; i++) {
      tops.push(x)
      bots.push(y)
      x += rng.int(5, 8) * 10
      y += rng.int(5, 8) * 10
    }
    const dx = tops.map((t, i) => bots[i]! - t)
    // 两两不平行（斜得不一样，差 20 以上看得出来），线段之间不交叉（上下的顺序一样，上面已经保证）
    let ok = true
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.abs(dx[i]! - dx[j]!) < 20) ok = false
    if (!ok) continue
    const minX = Math.min(...tops, ...bots) - 40
    const maxX = Math.max(...tops, ...bots) + 40
    const topN = ['A', 'B', 'C', 'D'].slice(0, n)
    const botN = ['E', 'F', 'G', 'H'].slice(0, n)
    const items: GeoItem[] = [
      { t: 'line', a: [minX, 0], b: [maxX, 0] },
      { t: 'line', a: [minX, gap], b: [maxX, gap] },
      { t: 'text', at: [minX - 12, -2], text: 'a', letter: true },
      { t: 'text', at: [minX - 12, gap - 2], text: 'b', letter: true },
    ]
    tops.forEach((t, i) => {
      items.push({ t: 'line', a: [t, 0], b: [bots[i]!, gap] })
      items.push({ t: 'text', at: [t, -14], text: topN[i]!, letter: true }, { t: 'text', at: [bots[i]!, gap + 16], text: botN[i]!, letter: true })
    })
    const value = (n * (n - 1)) / 2
    return numberQuestion({
      kpId,
      type: T,
      difficulty: d,
      sig: `tcount-${tops.join('.')}-${bots.join('.')}`,
      stem: [text('m4.quad.countTrapQ'), geoPart([fitFig(items, 12)], `（两条平行线 a、b 之间画了 ${n} 条线段，上面的端点 ${topN.join('、')}，下面的端点 ${botN.join('、')}）`)],
      value,
      rng,
      min: 0,
      max: 12,
      smart: [n, n - 1, value + 1],
    })
  }
}

/** 三个四边形里挑出梯形（干扰项：平行四边形、长方形、一般四边形——都不是梯形） */
function genPickTrap(kpId: string, d: Difficulty, rng: RNG): Question {
  const kinds = rng.shuffle<QuadKind>(['trap', rng.pick<QuadKind>(['para', 'rect']), 'plain'])
  const shapes = kinds.map((k) => toWidth(turnPts(quadOf(k, rng), rng.pick([0, 0, 180]))))
  const figs = shapes.map((pts, i) => fitFig([{ t: 'poly', pts, fill: QUAD_FILL[kinds[i]!], stroke: QUAD_FILL[kinds[i]!] }], 8))
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `tpick-${shapes.map(quadSig).join(',')}`,
    stem: [text('m4.quad.pickTrapQ'), geoPart(figs, '（三个四边形，编号 1 到 3）', true)],
    value: kinds.indexOf('trap') + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 练习十七 6(2)(3) 与梯形的说法 */
const TRAP_JUDGES: { key: string; yes: boolean }[] = [
  { key: 'm4.quad.jTwoTrapPara', yes: true },
  { key: 'm4.quad.jTwoTrapRect', yes: false },
  { key: 'm4.quad.jTwoRightTrapRect', yes: true },
  { key: 'm4.quad.jTrapLegs', yes: false },
  { key: 'm4.quad.jIsoLegs', yes: true },
]
function genTrapJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const j = rng.pick(TRAP_JUDGES)
  return judge(kpId, d, rng, `tj-${j.key}`, [text(j.key)], j.yes)
}

/** 练习十七 5：点子图上点 A 在上面一行往右移——三角形 → 梯形 → 直角梯形 → 平行四边形 → 又是梯形 */
function genMoveA(kpId: string, d: Difficulty, rng: RNG): Question {
  const ax = rng.pick([2, 3, 4, 5, 6, 7])
  const B0: GeoPt = [1, 4]
  const B1: GeoPt = [5, 4]
  const T0: GeoPt = [2, 1]
  const A: GeoPt = [ax, 1]
  const pts: GeoPt[] = ax === 2 ? [B0, B1, T0] : [B0, B1, A, T0]
  const state = ax === 2 ? 'tri' : ax === 5 ? 'rtrap' : ax === 6 ? 'para' : 'trap'
  const items: GeoItem[] = [
    { t: 'grid', x: 0, y: 0, w: 8, h: 5, dots: true },
    { t: 'poly', pts, fill: 'a', stroke: 'a', ...(state === 'rtrap' ? { right: [1] } : {}) },
    { t: 'dot', at: A, label: 'A', side: 'n' },
  ]
  const choices: Record<string, [LStr, LStr[]]> = {
    tri: [shapeL('tri'), [shapeL('trap'), shapeL('para')]],
    trap: [shapeL('trap'), [shapeL('para'), shapeL('tri')]],
    rtrap: [{ k: 'm4.quad.rightTrap' }, [shapeL('para'), { k: 'm4.quad.isoTrap' }]],
    para: [shapeL('para'), [shapeL('trap'), shapeL('tri')]],
  }
  const [correct, wrong] = choices[state]!
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `move-${ax}`,
    stem: [text('m4.quad.moveQ'), geoPart([{ w: 8, h: 5, px: 28, items }], '（点子图上：下面一条边的两个端点不动，点 A 在上面一行，连成一个图形）')],
    correct,
    distractors: wrong,
    rng,
  })
}

/** 练习十七 4：长方形纸和三角形纸交叉摆放，重叠的部分是梯形 */
function genOverlapTrap(kpId: string, d: Difficulty, rng: RNG): Question {
  const Hh = 140
  const Wh = rng.int(6, 8) * 10
  const y1 = -rng.int(8, 10) * 10
  const y2 = y1 + rng.int(4, 5) * 10
  const hw = (y: number): number => Wh * (1 + y / Hh)
  const tri: GeoPt[] = [
    [0, -Hh],
    [Wh, 0],
    [-Wh, 0],
  ]
  const L = Wh + 40
  const band: GeoPt[] = [
    [-L, y1],
    [L, y1],
    [L, y2],
    [-L, y2],
  ]
  const over: GeoPt[] = [
    [-hw(y1), y1],
    [hw(y1), y1],
    [hw(y2), y2],
    [-hw(y2), y2],
  ]
  const turn = rng.pick([0, 0, 15, -15])
  const tf = (ps: GeoPt[]): GeoPt[] => ps.map((p) => rotate(p, turn))
  const items: GeoItem[] = [{ t: 'poly', pts: tf(tri), fill: 'paper' }, { t: 'poly', pts: tf(band), fill: 'paper' }, { t: 'poly', pts: tf(over), fill: 'd', stroke: 'd' }]
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `overt-${Wh}-${y1}-${y2}-${turn}`,
    stem: [text('m4.quad.overlapTrapQ'), geoPart([fitFig(items, 10)], '（一张三角形纸和一张长方形纸条交叉摆放，重叠的部分涂了颜色）')],
    correct: shapeL('trap'),
    distractors: [shapeL('para'), shapeL('tri')],
    rng,
  })
}

/** 练习十六 3(2)：在梯形纸上沿虚线剪一刀（过上底的一个端点、和一条腰平行），剪下一个平行四边形，另一个是三角形 */
function genCutTrap(kpId: string, d: Difficulty, rng: RNG): Question {
  const pts = makeTrap('plain', rng)
  const [A, B, C, D] = pts as [GeoPt, GeoPt, GeoPt, GeoPt]
  // 过 B 画 DA 的平行线，交下底于 E：ABED 是平行四边形，BCE 是三角形
  const E: GeoPt = add(D, sub(B, A))
  const items: GeoItem[] = [{ t: 'poly', pts, fill: 'a', stroke: 'a' }, { t: 'line', a: B, b: E, dash: true, stroke: 'd' }]
  void C
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `tcut-${quadSig(pts)}`,
    stem: [text('m4.quad.cutTrapQ'), geoPart([fitFig(items, 14)], '（一个梯形，虚线从上底的一个端点画到下底，和一条腰平行）')],
    correct: shapeL('tri'),
    distractors: [shapeL('trap'), shapeL('rect')],
    rng,
  })
}

/**
 * 做一做 3(1)（p81）：在平行四边形里画一条线段分出直角梯形；练习十六 3(1)：剪一刀，剪下的两个图形都是梯形。
 * 三幅一样的平行四边形，各画一条虚线：对的那条（过上面一个顶点画下边的垂线 / 上下两边之间一条和腰不平行的线段），
 * 错的是对角线（剪出两个三角形）和与腰平行的线段（剪出两个平行四边形）
 */
function genCutPara(kpId: string, d: Difficulty, rng: RNG): Question {
  const right = d === 1 ? rng.chance(0.6) : rng.chance(0.4)
  const w = 120
  const h = 70
  const acute = rng.pick([50, 55, 60, 65])
  const pts = paraPts(w, h, acute, 1) // A 左上、B 右上、C 右下、D 左下，左边往右斜
  const [A, B, C, D] = pts as [GeoPt, GeoPt, GeoPt, GeoPt]
  const s = A[0] - D[0] // 上边比下边往右错开多少
  // 虚线的上端在上边的 t 处；剪成两个梯形的那条下端在下边的 u 处，和 t 至少差 0.3（斜得和腰明显不一样）
  const t = rng.pick([0.25, 0.4, 0.55, 0.7])
  const u = rng.pick([0.2, 0.3, 0.45, 0.6, 0.75, 0.85].filter((x) => Math.abs(x - t) >= 0.3))
  const P: GeoPt = [A[0] + w * t, 0]
  const goodLine: [GeoPt, GeoPt] = right
    ? [A, [A[0], h]] // 过 A 画下边的垂线，垂足在 DC 上（s < w）
    : [P, [D[0] + w * u, h]] // 上下两边之间、和腰不平行
  const lines: Record<'good' | 'diag' | 'par', [GeoPt, GeoPt]> = {
    good: goodLine,
    diag: rng.chance(0.5) ? [A, C] : [B, D],
    par: [P, [P[0] - s, h]],
  }
  const kinds = rng.shuffle(['good', 'diag', 'par'] as const)
  // 三幅图一样大：平行四边形缩到宽 76（手机上排得下一行）
  const k = 76 / (w + s)
  const sc = (p: GeoPt): GeoPt => [p[0] * k, p[1] * k]
  const figs = kinds.map((kind) => {
    const [a, b] = lines[kind]
    const items: GeoItem[] = [{ t: 'poly', pts: pts.map(sc), fill: 'b', stroke: 'b' }, { t: 'line', a: sc(a), b: sc(b), stroke: 'd', dash: true }]
    if (kind === 'good' && right) items.push({ t: 'arc', at: sc(b), a: add(sc(b), [10, 0]), b: add(sc(b), [0, -10]), right: true })
    return fitFig(items, 8)
  })
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `cutp-${right ? 'r' : 't'}-${acute}-${t}-${right ? '' : u}-${kinds.join('')}`,
    stem: [text(right ? 'm4.quad.cutRightQ' : 'm4.quad.cutTwoQ'), geoPart(figs, '（三个一样的平行四边形，编号 1 到 3，各画着一条虚线）', true)],
    value: kinds.indexOf('good') + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 整理和复习的知识结构图：按对边平行的组数给四边形分类 */
function genQuadClass(kpId: string, d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['one', 'none'] as const)
  if (which === 'one') return labelQuestion({ kpId, type: T, difficulty: d, sig: 'qclass-one', stem: [text('m4.quad.oneParQ')], correct: shapeL('trap'), distractors: [shapeL('para'), shapeL('rect')], rng })
  return judge(kpId, d, rng, 'qclass-none', [text('m4.quad.noneParQ')], false)
}

defineGenerator('m4s1-06-trapezoid', (d, rng) => {
  const kpId = 'm4s1-06-trapezoid'
  const roll = rng.next()
  if (d === 1) {
    // 第 80 页梯形的定义与各部分名称、例 7 直角梯形与等腰梯形、例 8 比较四边形、做一做 1（√ / ○）、做一做 2 数梯形
    if (roll < 0.12) return genTrapDef(kpId, d, rng)
    if (roll < 0.28) return genTrapParts(kpId, d, rng)
    if (roll < 0.48) return genTrapKind(kpId, d, rng)
    if (roll < 0.58) return genIsoAngle(kpId, d, rng)
    if (roll < 0.7) return genCountTrap(kpId, d, rng)
    if (roll < 0.8) return genPickTrap(kpId, d, rng)
    if (roll < 0.9) return genCutPara(kpId, d, rng)
    return genQuadClass(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十六 3、练习十七 4、5、6
    if (roll < 0.2) return genTrapJudge(kpId, d, rng)
    if (roll < 0.38) return genMoveA(kpId, d, rng)
    if (roll < 0.5) return genOverlapTrap(kpId, d, rng)
    if (roll < 0.6) return genCutTrap(kpId, d, rng)
    if (roll < 0.72) return genCutPara(kpId, d, rng)
    if (roll < 0.84) return genCountTrap(kpId, d, rng)
    return genTrapKind(kpId, d, rng)
  }
  if (roll < 0.4) return genCountTrap(kpId, d, rng)
  if (roll < 0.7) return genMoveA(kpId, d, rng)
  return genTrapJudge(kpId, d, rng)
})
