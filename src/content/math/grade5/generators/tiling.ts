import type { Difficulty, GeoFig, GeoItem, LStr, Question, ShapeKind, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion } from '@/engine'
import { type P, W, add, fitFig, geoPart, judge, mul, norm, numQ, pickWord, rotP, sub, text } from './areas'

// ─────────────────────────────────────────────────────────────
// ☆ 有趣的密铺（五上，第 95–97 页，综合与实践）：密铺的意思；哪些图形能密铺（平行四边形、梯形、任意三角形、任意四边形、
// 正六边形能，圆、正五边形不能）；四边形的内角和 360°、三角形 180°，一个顶点周围拼成 360°（四边形 4 个角、三角形 6 个角）；
// 正五边形每个角 108°，3 个拼不成 360°；设计密铺图案用的是平移还是旋转。
// 设计图案、小讲堂、自评表不出。课本没提正八边形，不出。
// 朗读：「密铺」读 mì pū；「重叠」「空隙」整句不切开；不说「只用」「拼着」「还差」。
// ─────────────────────────────────────────────────────────────

const KP = 'm5s1-07-tiling'
type Sh = 'para' | 'trap' | 'tri' | 'square' | 'rect' | 'hex' | 'quad' | 'circle' | 'penta'
const CAN: Sh[] = ['para', 'trap', 'tri', 'square', 'rect', 'hex', 'quad']
const CANNOT: Sh[] = ['circle', 'penta']
const shL = (s: Sh): LStr => W(`m5.tile.s.${s}`)
const GLYPH: Partial<Record<Sh, ShapeKind>> = { para: 'parallelogram', trap: 'trapezoid', tri: 'triangle', square: 'square', rect: 'rectangle', hex: 'hexagon', circle: 'circle', penta: 'pentagon' }
const dir = (deg: number): P => [Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)]

/** 一个图形的小图：能画的用 ShapeGlyph，「四边形」（四条边都不平行）用 GeoFigure */
function shapePart(s: Sh, rng: RNG): StemPart {
  const g = GLYPH[s]
  if (g) return { kind: 'shape', shape: g, tone: rng.int(0, 5), form: s === 'tri' ? rng.pick([0, 2]) : undefined }
  return geoPart([fitFig([{ t: 'poly', pts: [[0, 0], [70, 8], [82, 58], [12, 46]], fill: 'b', stroke: 'b' }], 12)], '（一个四条边都不平行的四边形）')
}

/** 密铺的意思（第 95 页） */
function genDefine(d: Difficulty, rng: RNG): Question {
  return pickWord(KP, d, rng, 'def', [text('m5.tile.defQ')], W('m5.tile.w.tile'), [W('m5.tile.w.translate'), W('m5.tile.w.rotate')])
}

/** 用很多个同样的这种图形，可以密铺吗（判断） */
function genCan(d: Difficulty, rng: RNG): Question {
  const s = rng.chance(0.6) ? rng.pick(CAN) : rng.pick(CANNOT)
  return judge(KP, d, rng, `can-${s}`, [text('m5.tile.canQ', { shape: shL(s) }), shapePart(s, rng)], CAN.includes(s))
}

/** 下面哪种图形不能密铺 / 能密铺 */
function genPick(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const no = rng.pick(CANNOT)
    return pickWord(KP, d, rng, `pickno-${no}`, [text('m5.tile.pickNoQ')], shL(no), rng.shuffle(CAN).slice(0, 3).map(shL))
  }
  const yes = rng.pick(CAN)
  return pickWord(KP, d, rng, `pickyes-${yes}`, [text('m5.tile.pickYesQ')], shL(yes), CANNOT.map(shL))
}

/** 第 95 页的两幅图：梯形铺成一片（能），圆铺起来有空隙（不能） */
function trapTiling(): GeoFig {
  const items: GeoItem[] = []
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 5; i++) {
      const x = i * 1.5
      const y0 = row * 1
      const up = i % 2 === 0
      const pts: P[] = up
        ? [[x, y0 + 1], [x + 2, y0 + 1], [x + 1.5, y0], [x + 0.5, y0]]
        : [[x + 0.5, y0 + 1], [x + 1.5, y0 + 1], [x + 2, y0], [x, y0]]
      items.push({ t: 'poly', pts: pts.map((p) => mul(p, 34)), fill: 'a', stroke: 'b' })
    }
  return fitFig(items, 12)
}
function circleTiling(): GeoFig {
  const R = 16
  const items: GeoItem[] = [{ t: 'poly', pts: [[0, 0], [8 * R, 0], [8 * R, 6 * R], [0, 6 * R]], fill: 'b', stroke: 'b' }]
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) items.push({ t: 'dot', at: [R + c * 2 * R, R + r * 2 * R], r: R, fill: 'a', stroke: 'a' })
  return fitFig(items, 12)
}
function genPicture(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return judge(KP, d, rng, 'pic-trap', [text('m5.tile.trapPicQ'), geoPart([trapTiling()], '（同样的梯形一正一反地铺成一片）')], true)
  return judge(KP, d, rng, 'pic-circle', [text('m5.tile.circlePicQ'), geoPart([circleTiling()], '（长方形里摆着 3 行 4 列同样的圆，圆和圆之间露出空隙）')], false)
}

/**
 * 四边形密铺（第 95–96 页）：同一个四边形 ABCD 绕边的中点转 180°、平移，四个围着顶点 A，角 1、2、3、4 正好是它的四个角。
 * 红点标出那个顶点，角里写编号。
 */
function quadTiling(): GeoFig {
  const A: P = [0, 0]
  const B: P = [3, 0.3]
  // 一般的四边形（四条边都不平行）
  const C: P = [3.6, 2.6]
  const D: P = [0.4, 2]
  const q1 = [A, B, C, D]
  const q2 = q1.map((p) => sub(add(A, B), p)) // 绕 AB 的中点转 180°：B 的角到了 A
  const q3 = q1.map((p) => add(p, sub(A, C))) // 平移：C 的角到了 A
  const q4 = q1.map((p) => sub(add(A, D), p)) // 绕 AD 的中点转 180°：D 的角到了 A
  const sc = 20
  const items: GeoItem[] = []
  const tones = ['a', 'b', 'c', 'd'] as const
  ;[q1, q2, q3, q4].forEach((q, i) => {
    items.push({ t: 'poly', pts: q.map((p) => mul(p, sc)), fill: tones[i], stroke: 'b' })
  })
  // 角里的编号：在 A 处，沿这块的角平分线往里走一点（q 里和 A 重合的那个顶点的两条邻边）
  const label = (q: P[], n: string): void => {
    const i = q.findIndex((p) => Math.hypot(p[0] - A[0], p[1] - A[1]) < 1e-9)
    const prev = q[(i + 3) % 4]!
    const next = q[(i + 1) % 4]!
    const bis = norm(add(norm(sub(prev, A)), norm(sub(next, A))))
    items.push({ t: 'text', at: mul(add(A, mul(bis, 0.75)), sc), text: n })
  }
  label(q1, '1')
  label(q2, '2')
  label(q3, '3')
  label(q4, '4')
  items.push({ t: 'dot', at: [0, 0], r: 3.5, fill: 'd', stroke: 'd' })
  return fitFig(items, 14)
}

/** 三角形密铺（第 96 页）：6 个同样的三角形围着一个点，角里写 1、2、3（每种两个） */
function triTiling(): GeoFig {
  // 三个角差得开一点（45°、59°、76°），编号才看得出是同一个三角形的三个角
  const u: P = [3.2, 0]
  const v: P = [2, -2]
  const O: P = [0, 0]
  const ring: P[] = [u, v, sub(v, u), mul(u, -1), mul(v, -1), sub(u, v)]
  // 原来那个三角形 (O, u, v) 三个角：O 处是 1，u 处是 2，v 处是 3
  const ang = (a: P, b: P): number => (Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180) / Math.PI
  const base = [ang(u, v), ang(sub(O, u), sub(v, u)), ang(sub(O, v), sub(u, v))]
  const sc = 25
  const items: GeoItem[] = []
  for (let i = 0; i < 6; i++) {
    const a = ring[i]!
    const b = ring[(i + 1) % 6]!
    items.push({ t: 'poly', pts: [O, a, b].map((p) => mul(p, sc)), fill: i % 2 ? 'a' : 'b', stroke: 'b' })
    const deg = ang(a, b)
    const n = base.map((x, j) => [Math.abs(x - deg), j] as const).sort((p, q) => p[0] - q[0])[0]![1] + 1
    const bis = norm(add(norm(a), norm(b)))
    items.push({ t: 'text', at: mul(bis, 0.95 * sc), text: String(n) })
  }
  items.push({ t: 'dot', at: [0, 0], r: 3.5, fill: 'd', stroke: 'd' })
  return fitFig(items, 14)
}

/** 正五边形（第 96 页）：三个围着一个点，每个角 108°，留下一条缝 */
function pentaFig(): GeoFig {
  const s = 46
  const V: P = [0, 0]
  const items: GeoItem[] = []
  for (let k = 0; k < 3; k++) {
    const d0 = 100 + k * 108
    const pts: P[] = [V]
    let p = V
    for (let j = 0; j < 4; j++) {
      p = add(p, mul(dir(d0 + j * 72), s))
      pts.push(p)
    }
    items.push({ t: 'poly', pts, fill: 'b', stroke: 'b' })
    if (k === 0) items.push({ t: 'text', at: mul(dir(d0 + 54), 30), text: '108°' })
  }
  // 缝：从第三个的最后一条边转到第一个的第一条边（36°）
  items.push({ t: 'arc', at: V, a: dir(100 + 324), b: dir(100 + 360), ccw: true, r: 22 })
  items.push({ t: 'dot', at: V, r: 3.5, fill: 'd', stroke: 'd' })
  return fitFig(items, 14)
}

/** 一个顶点周围有几个角、加起来是多少度（四边形、三角形，配图） */
function genVertex(d: Difficulty, rng: RNG): Question {
  const quad = rng.chance(0.5)
  const fig = quad ? geoPart([quadTiling()], '（同样的四边形密铺成一片，红点是其中一个顶点，它周围的角标着编号）') : geoPart([triTiling()], '（同样的三角形密铺成一片，红点是其中一个顶点，它周围的角标着编号）')
  if (rng.chance(0.5)) return numQ({ kpId: KP, d, rng, sig: `count-${quad ? 'q' : 't'}`, stem: [text(quad ? 'm5.tile.quadCountQ' : 'm5.tile.triCountQ'), fig], value: quad ? 4 : 6, smart: quad ? [3, 6, 5] : [3, 4, 5] })
  return numQ({ kpId: KP, d, rng, sig: `deg-${quad ? 'q' : 't'}`, stem: [text(quad ? 'm5.tile.quadDegQ' : 'm5.tile.triDegQ'), fig], value: 360, smart: [180, 270, 540] })
}

/** 内角和：四边形 360°、三角形 180° */
function genSum(d: Difficulty, rng: RNG): Question {
  const quad = rng.chance(0.55)
  return numQ({ kpId: KP, d, rng, sig: `sum-${quad ? 'q' : 't'}`, stem: [text(quad ? 'm5.tile.quadSumQ' : 'm5.tile.triSumQ')], value: quad ? 360 : 180, smart: quad ? [180, 540, 720] : [360, 90, 270] })
}

/** 第 2 档：正五边形 3 个角 324°、比 360° 少 36°、4 个角多 72°；正六边形 3 个、正方形 4 个正好 360° */
function genPolygonAngles(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const fig = geoPart([pentaFig()], '（三个正五边形围着一个点，标着一个角 108°，中间留着一条缝）')
  if (roll < 0.25) return numQ({ kpId: KP, d, rng, sig: 'penta3', stem: [text('m5.tile.pentaQ'), fig], value: 324, smart: [360, 216, 432] })
  if (roll < 0.5) return numQ({ kpId: KP, d, rng, sig: 'penta-gap', stem: [text('m5.tile.pentaGapQ'), fig], value: 36, smart: [72, 108, 324] })
  if (roll < 0.6) return numQ({ kpId: KP, d, rng, sig: 'penta4', stem: [text('m5.tile.penta4Q')], value: 72, smart: [36, 432, 108] })
  if (roll < 0.8) return numQ({ kpId: KP, d, rng, sig: 'hex', stem: [text('m5.tile.hexQ'), { kind: 'shape', shape: 'hexagon', tone: rng.int(0, 5) }], value: 3, smart: [4, 6, 2], input: 'choice' })
  return numQ({ kpId: KP, d, rng, sig: 'square', stem: [text('m5.tile.squareQ')], value: 4, smart: [3, 6, 2], input: 'choice' })
}

/** 第 2 档：三角形的三个角，密铺时一个顶点周围同样的角有几个；四边形三个角求第四个 */
const TRI_ANGLES: [number, number, number][] = [
  [50, 60, 70], [40, 60, 80], [30, 70, 80], [45, 55, 80], [35, 65, 80], [60, 60, 60],
]
const QUAD_ANGLES: [number, number, number][] = [
  [70, 110, 95], [80, 100, 90], [60, 120, 100], [75, 105, 85], [90, 90, 70], [65, 115, 110],
]
function genAngleCalc(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [a, b, c] = rng.pick(TRI_ANGLES.filter((t) => new Set(t).size === 3))
    return numQ({ kpId: KP, d, rng, sig: `tri-${a}-${b}-${c}`, stem: [text('m5.tile.triAngQ', { a, b, c })], value: 2, smart: [1, 3, 6], input: 'choice' })
  }
  const [a, b, c] = rng.pick(QUAD_ANGLES)
  return numQ({ kpId: KP, d, rng, sig: `q4-${a}-${b}-${c}`, stem: [text('m5.tile.quad4thQ', { a, b, c })], value: 360 - a - b - c, smart: [360 - a - b, 540 - a - b - c, a + b + c - 180] })
}

/**
 * 第 3 档：设计密铺图案（第 96–97 页）——正方形下面剪下一块向上移动补到上面是平移；左面剪下一块绕点 A 逆时针旋转 90° 补到上面是旋转。
 * 图上画出做好的图形和原来的正方形（虚线）。
 */
function designFig(rot: boolean): GeoFig {
  const sc = 26
  const sq: P[] = [[0, 0], [4, 0], [4, 4], [0, 4]]
  let shape: P[]
  if (!rot) {
    shape = [[0, 0], [1.5, 0], [2, -0.8], [2.5, 0], [4, 0], [4, 4], [2.5, 4], [2, 3.2], [1.5, 4], [0, 4]]
  } else {
    // 左边剪下三角形 (0, 0.5)–(1, 1.5)–(0, 2.5)，绕 A(0, 0) 逆时针转 90° 到上边
    const piece: P[] = [[0, 0.5], [1, 1.5], [0, 2.5]]
    const top = piece.map((p) => rotP(p, 90, [0, 0]))
    shape = [[0, 0], top[0]!, top[1]!, top[2]!, [4, 0], [4, 4], [0, 4], [0, 2.5], [1, 1.5], [0, 0.5]]
  }
  const items: GeoItem[] = [
    { t: 'poly', pts: sq.map((p) => mul(p, sc)), stroke: 'soft', dash: true },
    { t: 'poly', pts: shape.map((p) => mul(p, sc)), fill: 'a', stroke: 'b' },
  ]
  if (rot) items.push({ t: 'dot', at: [0, 0], label: 'A', side: 'nw' })
  return fitFig(items, 18)
}
function genDesign(d: Difficulty, rng: RNG): Question {
  const rot = rng.chance(0.5)
  const correct = W(rot ? 'm5.tile.w.rotate' : 'm5.tile.w.translate')
  const wrong = [W(rot ? 'm5.tile.w.translate' : 'm5.tile.w.rotate'), W('m5.tile.w.reflect')]
  return labelQuestion({
    kpId: KP,
    type: 'motion',
    difficulty: d,
    sig: `design-${rot ? 'r' : 't'}`,
    stem: [text(rot ? 'm5.tile.rotQ' : 'm5.tile.moveQ'), geoPart([designFig(rot)], rot ? '（正方形左边剪去一块，补到了上边，左上角是点 A；虚线是原来的正方形）' : '（正方形下边剪去一块，补到了上边；虚线是原来的正方形）')],
    correct,
    distractors: wrong,
    rng,
  })
}

/** 判断：密铺的说法 */
function genJudge(d: Difficulty, rng: RNG): Question {
  const all: [string, boolean][] = [
    ['m5.tile.jGap', false],
    ['m5.tile.jQuad', true],
    ['m5.tile.jTri', true],
    ['m5.tile.jPenta', false],
  ]
  const [k, yes] = rng.pick(all)
  return judge(KP, d, rng, `j-${k.split('.').pop()}`, [text(k)], yes)
}

defineGenerator(KP, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 第 95 页密铺的意思、哪些图形可以密铺（平行四边形、梯形能，圆不能），四边形密铺一个顶点周围的四个角、三角形的 6 个角
    if (roll < 0.12) return genDefine(d, rng)
    if (roll < 0.38) return genCan(d, rng)
    if (roll < 0.52) return genPick(d, rng)
    if (roll < 0.64) return genPicture(d, rng)
    if (roll < 0.86) return genVertex(d, rng)
    if (roll < 0.94) return genSum(d, rng)
    return genJudge(d, rng)
  }
  if (d === 2) {
    // 第 96 页正五边形 108°、正六边形；三角形、四边形的角
    if (roll < 0.45) return genPolygonAngles(d, rng)
    if (roll < 0.7) return genAngleCalc(d, rng)
    if (roll < 0.85) return genJudge(d, rng)
    return genCan(d, rng)
  }
  // 第 96–97 页设计密铺图案用的运动
  if (roll < 0.6) return genDesign(d, rng)
  return genPolygonAngles(d, rng)
})

