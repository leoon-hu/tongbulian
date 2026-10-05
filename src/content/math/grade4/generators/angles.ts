import type { Difficulty, GeoFig, GeoItem, GeoPt, InputMode, LParam, LStr, ProtractorPoint, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberDistractors, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 角的度量（四上二，第 28–38 页）：角的再认识（射线旋转得到五种角、1 周角 = 2 平角 = 4 直角）、角的度量（1°、量角器、
// 各种角的度数、一副三角尺的角、用 180° / 360° 减）、画角（例 3：在量角器的哪条刻度线上点点，开口向左向右；练习五 3 以射线 OA 为边）。
// 课本没有的不出：优角、对顶角、角的大小与边的长短无关这句结论（做一做 2 只让量一量、比一比）。
// 图都画准：量角器上的角就是题目的度数（Protractor，kind: 'protractor'），别的图用 GeoFigure（kind: 'geo'），图里只放数、字母、°。
// ─────────────────────────────────────────────────────────────

// ── 几何图的小工具（平行四边形和梯形 quads.ts 也用；和三年级 lines.ts 的同名工具一样，各包自己一份，免得互相加载）──

export const r1 = (n: number): number => Math.round(n * 10) / 10
export const rad = (deg: number): number => (deg * Math.PI) / 180
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

/** 题干里的一段几何图（alt 是静态页 / 读屏的说明，不能把答案写出来） */
export function geoPart(figs: GeoFig[], alt: string, numbered = false): StemPart {
  return numbered ? { kind: 'geo', figs, alt, numbered: true } : { kind: 'geo', figs, alt }
}

export const text = (k: string, p?: Record<string, LParam>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })

/** 选项里挑 n − 1 个干扰项（打乱后取前几个） */
export function some<T>(rng: RNG, pool: T[], n: number): T[] {
  return rng.shuffle(pool).slice(0, n)
}

/** 判断题的两个选项（一律「……，对吗？」配 对 / 不对） */
export const YES: LStr = { k: 'm4.ang.yes' }
export const NO: LStr = { k: 'm4.ang.no' }

/** 比大小的三个选项 */
type Rel = '>' | '<' | '='
const RELS: Rel[] = ['>', '<', '=']
const relOf = (a: number, b: number): Rel => (a > b ? '>' : a < b ? '<' : '=')

// ─────────────────────────────────────────────────────────────
// 五种角
// ─────────────────────────────────────────────────────────────

export type AngleKind = 'acute' | 'right' | 'obtuse' | 'straight' | 'full'
export const KINDS: AngleKind[] = ['acute', 'right', 'obtuse', 'straight', 'full']
export const kindL = (k: AngleKind): LStr => ({ k: `m4.ang.${k}` })
/** 课本的大小顺序：锐角 < 直角 < 钝角 < 平角 < 周角 */
const ORDER: Record<AngleKind, number> = { acute: 0, right: 1, obtuse: 2, straight: 3, full: 4 }
export function kindOfDeg(deg: number): AngleKind {
  if (deg < 90) return 'acute'
  if (deg === 90) return 'right'
  if (deg < 180) return 'obtuse'
  return deg === 180 ? 'straight' : 'full'
}

/** 按档取一个角的度数：锐角、钝角离直角远（第 3 档近一些，也还看得出），直角 90、平角 180、周角 360 */
function degFor(kind: AngleKind, d: Difficulty, rng: RNG): number {
  if (kind === 'acute') return d === 3 ? rng.int(14, 15) * 5 : rng.int(5, 13) * 5
  if (kind === 'obtuse') return d === 3 ? rng.int(21, 22) * 5 : rng.int(23, 32) * 5
  return { right: 90, straight: 180, full: 360 }[kind]
}

type Mark = 'arc' | 'right' | 'turn' | null
/**
 * 一个角（顶点在原点）：一条边朝 rot 度，另一条边朝 rot + deg 度（deg = 180 是一条直线、顶点画点，deg = 360 只画一条射线）。
 * mark：arc 角上的小弧、right 直角方块、turn 带箭头的弧（射线从第一条边逆时针转到第二条边，课本第 28 页）；label = 写在角里的编号
 */
export function angleItems(deg: number, rot: number, o: { arms?: [number, number]; vertex?: boolean; mark?: Mark; label?: string } = {}): GeoItem[] {
  const [l1, l2] = o.arms ?? [110, 110]
  const V: GeoPt = [0, 0]
  const A = along(V, dir(rot), l1)
  const out: GeoItem[] = []
  if (deg >= 360) {
    out.push({ t: 'line', a: V, b: A })
    if (o.mark) out.push({ t: 'arc', at: V, a: A, b: A, ccw: true, arrow: o.mark === 'turn', r: 24 })
    out.push({ t: 'dot', at: V })
    return out
  }
  if (deg === 180) {
    const B = along(V, dir(rot + 180), l2)
    out.push({ t: 'line', a: B, b: A })
    if (o.mark) out.push({ t: 'arc', at: V, a: A, b: B, ccw: true, arrow: o.mark === 'turn', r: 20 })
    out.push({ t: 'dot', at: V })
    return out
  }
  const B = along(V, dir(rot + deg), l2)
  out.push({ t: 'line', a: V, b: A }, { t: 'line', a: V, b: B })
  if (o.mark === 'right') out.push({ t: 'arc', at: V, a: A, b: B, right: true })
  else if (o.mark === 'arc') out.push({ t: 'arc', at: V, a: A, b: B })
  else if (o.mark === 'turn') out.push({ t: 'arc', at: V, a: A, b: B, ccw: true, arrow: true, r: 24 })
  if (o.vertex) out.push({ t: 'dot', at: V })
  if (o.label) out.push({ t: 'text', at: along(V, dir(rot + deg / 2), labelDist(deg)), text: o.label, tone: 'd' })
  return out
}

/** 角里的编号离顶点多远：角小的时候往外挪，别压在边上 */
export const labelDist = (deg: number, min = 34, max = 60): number => Math.min(max, Math.max(min, 13 / Math.sin(rad(Math.max(deg, 2) / 2))))

/** 角的图：周角、平角的整圈 / 半圈弧画在顶点四周，留边宽一点 */
const angleFig = (deg: number, rot: number, o: Parameters<typeof angleItems>[2] = {}): GeoFig => fitFig(angleItems(deg, rot, o), deg >= 180 ? 30 : 16)

const ROTS = [0, 0, 0, 15, 30, 45, 60, 90, 120, 135, 150, 180, 200, 225, 270, 300, 315, 330]
/** 直角不画方块时只摆正（横竖），一眼看得出是直角 */
const RIGHT_ROTS = [0, 90, 180, 270]

/** 看图说出是什么角（做一做 p29、练习五 1）：直角有时画方块、有时画弧；平角是一条直线 + 中间的点，周角是一条射线 + 一整圈 */
function genName(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick<AngleKind>(d === 1 ? ['acute', 'acute', 'right', 'obtuse', 'obtuse', 'straight', 'full'] : KINDS)
  const deg = degFor(kind, d, rng)
  const square = kind === 'right' && rng.chance(d === 1 ? 0.6 : 0.35)
  const rot =
    kind === 'straight' ? rng.pick(d === 1 ? [0, 0, 20, -20] : [0, 25, -25, 35, -35, 90]) : kind === 'full' ? rng.pick([0, 30, 150, 180, 210, 330]) : kind === 'right' && !square ? rng.pick(RIGHT_ROTS) : rng.pick(ROTS)
  const mark: Mark = square ? 'right' : 'arc'
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `name-${deg}-${rot}-${mark}`,
    // 说明里不说是什么角（静态页会印出来）
    stem: [text('m4.ang.nameQ'), geoPart([angleFig(deg, rot, { vertex: deg >= 180, mark })], '（一个角，角上画着记号）')],
    correct: kindL(kind),
    distractors: some(
      rng,
      KINDS.filter((k) => k !== kind),
      3,
    ).map(kindL),
    rng,
  })
}

/** 射线旋转几周（第 28 页）：1 周 → 周角，1/2 周 → 平角，1/4 周 → 直角，不到 1/4 周 → 锐角，超过 1/4 周、不到 1/2 周 → 钝角 */
const TURNS: { key: string; kind: AngleKind }[] = [
  { key: 'm4.ang.turnFull', kind: 'full' },
  { key: 'm4.ang.turnHalf', kind: 'straight' },
  { key: 'm4.ang.turnQuarter', kind: 'right' },
  { key: 'm4.ang.turnLess', kind: 'acute' },
  { key: 'm4.ang.turnMore', kind: 'obtuse' },
]

/** 一条射线绕端点旋转多少，形成什么角；第 1 档一半配旋转的图（带箭头的弧） */
function genRotate(kpId: string, d: Difficulty, rng: RNG): Question {
  const t = rng.pick(TURNS)
  const pic = d === 1 && rng.chance(0.4)
  const deg = degFor(t.kind, d, rng)
  const stem: StemPart[] = [text('m4.ang.rotQ', { turn: { k: t.key } })]
  if (pic) stem.push(geoPart([angleFig(deg, 0, { vertex: true, mark: 'turn' })], '（一条射线绕它的端点旋转，箭头表示旋转的方向）'))
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `rot-${t.kind}${pic ? `-pic${deg}` : ''}`,
    stem,
    correct: kindL(t.kind),
    distractors: some(
      rng,
      KINDS.filter((k) => k !== t.kind),
      3,
    ).map(kindL),
    rng,
  })
}

/** 反过来：形成这种角，射线要旋转多少 */
function genTurnOf(kpId: string, d: Difficulty, rng: RNG): Question {
  const t = rng.pick(TURNS)
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `turnof-${t.kind}`,
    stem: [text('m4.ang.turnOfQ', { kind: kindL(t.kind) })],
    correct: { k: t.key },
    distractors: some(
      rng,
      TURNS.filter((x) => x !== t),
      d === 1 ? 2 : 3,
    ).map((x): LStr => ({ k: x.key })),
    rng,
  })
}

/** 例 1(1)：比一比它们的大小（锐角 < 直角 < 钝角 < 平角 < 周角） */
function genCompare(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.shuffle(KINDS).slice(0, 2) as [AngleKind, AngleKind]
  const rel = relOf(ORDER[a], ORDER[b])
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `cmp-${a}-${b}`,
    stem: [text('m4.ang.cmpQ'), text('m4.ang.cmpExpr', { a: kindL(a), b: kindL(b) })],
    correct: rel,
    distractors: RELS.filter((r) => r !== rel),
    rng,
  })
}

/** 五种角里最大 / 最小的 */
function genExtreme(kpId: string, d: Difficulty, rng: RNG): Question {
  const max = rng.chance(0.5)
  const correct: AngleKind = max ? 'full' : 'acute'
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `ext-${max ? 'max' : 'min'}`,
    stem: [text(max ? 'm4.ang.maxQ' : 'm4.ang.minQ')],
    correct: kindL(correct),
    distractors: some(
      rng,
      KINDS.filter((k) => k !== correct),
      3,
    ).map(kindL),
    rng,
  })
}

/** 例 1(2)：1 周角 =（2）平角 =（4）直角；第 2 档反过来问几个直角合起来是 1 个平角 / 周角 */
const RELATIONS: { key: string; value: number; d2?: boolean }[] = [
  { key: 'm4.ang.relFullStraight', value: 2 },
  { key: 'm4.ang.relFullRight', value: 4 },
  { key: 'm4.ang.relStraightRight', value: 2 },
  { key: 'm4.ang.relRightsStraight', value: 2, d2: true },
  { key: 'm4.ang.relRightsFull', value: 4, d2: true },
  { key: 'm4.ang.relStraightsFull', value: 2, d2: true },
]
function genRelation(kpId: string, d: Difficulty, rng: RNG): Question {
  const r = rng.pick(RELATIONS.filter((x) => (d === 1 ? !x.d2 : true)))
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `rel-${r.key}`,
    stem: [text(r.key)],
    value: r.value,
    rng,
    min: 1,
    max: 8,
    smart: [1, 2, 3, 4].filter((x) => x !== r.value),
  })
}

/** 三个角里挑出指定的一种（做一做 p29 的四个角） */
function genPick(kpId: string, d: Difficulty, rng: RNG): Question {
  const kinds = rng.shuffle(KINDS).slice(0, 3)
  const target = rng.pick(kinds)
  const degs = kinds.map((k) => degFor(k, d, rng))
  const figs = kinds.map((k, i) => {
    const deg = degs[i]!
    const rot = k === 'straight' ? 0 : k === 'full' ? 0 : k === 'right' ? 0 : rng.pick([0, 0, 10, 20])
    return fitFig(angleItems(deg, rot, { arms: [70, 70], vertex: deg >= 180, mark: k === 'right' && d === 1 ? 'right' : 'arc' }), deg >= 180 ? 28 : 10)
  })
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `pick-${target}-${degs.join('.')}`,
    stem: [text('m4.ang.pickQ', { kind: kindL(target) }), geoPart(figs, '（三个角，编号 1 到 3）', true)],
    value: kinds.indexOf(target) + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 练习六 3 的判断题（课本的四句，外加例 1 关系的说法） */
const JUDGES: { key: string; yes: boolean }[] = [
  { key: 'm4.ang.jSplit', yes: true },
  { key: 'm4.ang.jFullTwoRight', yes: false },
  { key: 'm4.ang.jTwoAcute', yes: false },
  { key: 'm4.ang.jAcuteRight', yes: true },
  { key: 'm4.ang.jFullFourRight', yes: true },
  { key: 'm4.ang.jStraightTwoRight', yes: true },
  { key: 'm4.ang.jStraightFourRight', yes: false },
  { key: 'm4.ang.jFullTwoStraight', yes: true },
  { key: 'm4.ang.jObtuseBig', yes: true },
]
function genJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const j = rng.pick(JUDGES)
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `judge-${j.key}`,
    stem: [text(j.key)],
    correct: j.yes ? YES : NO,
    distractors: [j.yes ? NO : YES],
    rng,
  })
}

/** 第 3 档：平角分成两个角、射线接着转、钟面上的角 */
function genSplit(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.pick<AngleKind>(['right', 'acute', 'obtuse'])
  const other: AngleKind = k === 'right' ? 'right' : k === 'acute' ? 'obtuse' : 'acute'
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `split-${k}`,
    stem: [text('m4.ang.splitQ', { kind: kindL(k) })],
    correct: kindL(other),
    distractors: (['acute', 'right', 'obtuse', 'straight'] as AngleKind[]).filter((x) => x !== other).map(kindL),
    rng,
  })
}
function genTwoTurns(kpId: string, d: Difficulty, rng: RNG): Question {
  const quarter = rng.chance(0.5)
  const correct: AngleKind = quarter ? 'straight' : 'full'
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `twoturns-${quarter ? 'q' : 'h'}`,
    stem: [text(quarter ? 'm4.ang.twoQuarterQ' : 'm4.ang.twoHalfQ')],
    correct: kindL(correct),
    distractors: (['right', 'obtuse', 'straight', 'full'] as AngleKind[]).filter((x) => x !== correct).map(kindL),
    rng,
  })
}
/** 练习五 *8（第 3 档）：从一个点引出 3 / 4 / 5 条射线，一共组成几个角（3、6、10；所有射线都在一个平角以内，每两条组成一个角） */
function genFanCount(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([3, 4, 4, 5])
  const start = rng.int(0, 4) * 5
  const angles = [start]
  for (let i = 1; i < n; i++) angles.push(angles[i - 1]! + rng.int(5, 8) * 5)
  const items: GeoItem[] = [...angles.map((a): GeoItem => ({ t: 'line', a: [0, 0], b: along([0, 0], dir(a), rng.int(11, 14) * 10) })), { t: 'dot', at: [0, 0] }]
  const value = (n * (n - 1)) / 2
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `fan-${angles.join('.')}`,
    stem: [text('m4.ang.fanQ'), geoPart([fitFig(items, 14)], `（从一个点引出 ${n} 条射线）`)],
    value,
    rng,
    min: 0,
    max: 15,
    smart: [n - 1, n, value + 1],
  })
}

defineGenerator('m4s1-03-angles', (d, rng) => {
  const kpId = 'm4s1-03-angles'
  const roll = rng.next()
  if (d === 1) {
    // 第 28–29 页：五种角（旋转几周）、例 1 比大小与 1 周角 = 2 平角 = 4 直角、做一做看图写名称
    if (roll < 0.28) return genName(kpId, d, rng)
    if (roll < 0.42) return genRotate(kpId, d, rng)
    if (roll < 0.54) return genTurnOf(kpId, d, rng)
    if (roll < 0.68) return genCompare(kpId, d, rng)
    if (roll < 0.82) return genRelation(kpId, d, rng)
    if (roll < 0.94) return genPick(kpId, d, rng)
    return genExtreme(kpId, d, rng)
  }
  if (d === 2) {
    // 练习五 1（斜放的平角、周角）、练习六 3 的判断
    if (roll < 0.4) return genJudge(kpId, d, rng)
    if (roll < 0.62) return genName(kpId, d, rng)
    if (roll < 0.78) return genRelation(kpId, d, rng)
    if (roll < 0.9) return genTurnOf(kpId, d, rng)
    return genPick(kpId, d, rng)
  }
  if (roll < 0.35) return genSplit(kpId, d, rng)
  if (roll < 0.6) return genTwoTurns(kpId, d, rng)
  return genFanCount(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 角的度量：1°、量角器读数、各种角的度数、三角尺、用 180° / 360° 减
// ─────────────────────────────────────────────────────────────

/** 度数的题：数字键盘按数，选项写成「60°」；干扰项先用 smart（量角器看错圈的 180 − x、差 10° 的），不够再在邻近补 */
export function degQuestion(o: { kpId: string; d: Difficulty; sig: string; stem: StemPart[]; value: number; rng: RNG; smart?: number[]; input?: InputMode; max?: number; type?: QuestionType }): Question {
  const type = o.type ?? 'angle'
  const input: InputMode = o.input ?? (o.rng.chance(0.45) ? 'choice' : 'numpad')
  if (input === 'numpad') return numberQuestion({ kpId: o.kpId, type, difficulty: o.d, sig: o.sig, stem: o.stem, value: o.value, rng: o.rng, max: o.max ?? 360, input })
  const smart = (o.smart ?? []).filter((x) => x > 0 && x !== o.value)
  const wrong = numberDistractors(o.value, { min: 5, max: o.max ?? 360, smart: [...smart, o.value + 10, o.value - 10, o.value + 5, o.value - 5] })
  return labelQuestion({ kpId: o.kpId, type, difficulty: o.d, sig: o.sig, stem: o.stem, correct: `${o.value}°`, distractors: wrong.map((w) => `${w}°`), rng: o.rng })
}

/** 课本里读量角器、量角的度数：例 2 的 ∠1 30°、∠2 75°，做一做 1 的 50°、55°，做一做 2 的 45°，做一做 3 的 20°、90°、120°，练习六 1 的 60°、135° */
const TEXTBOOK_READS = [30, 75, 50, 55, 45, 20, 90, 120, 60, 135]

/** 一个放在量角器上的角：一条边和左边或右边的 0° 刻度线重合，另一条边对着 at；tilt = 量角器斜放 */
function protractorAngle(deg: number, left: boolean, tilt: number, name?: string): StemPart {
  const base = left ? 180 : 0
  const other = left ? 180 - deg : deg
  const part: StemPart = {
    kind: 'protractor',
    rays: [{ at: base }, { at: other }],
    arc: [Math.min(base, other), Math.max(base, other)],
    alt: `（量角器上的一个角：顶点对着量角器的中心，一条边和${left ? '左' : '右'}边的 0° 刻度线重合${tilt ? '，量角器斜着放' : ''}）`,
  }
  if (tilt) part.tilt = tilt
  if (name) part.name = name
  return part
}

/** 例 2、做一做 1：看量角器上的刻度读出角的度数（第 1 档 10° 的整数倍或课本的度数，第 2 档 5° 的整数倍、多斜放） */
function genRead(kpId: string, d: Difficulty, rng: RNG): Question {
  const deg = d === 1 ? (rng.chance(0.4) ? rng.pick(TEXTBOOK_READS) : rng.int(1, 17) * 10) : rng.int(2, 34) * 5
  const left = rng.chance(d === 1 ? 0.4 : 0.5)
  const tilt = rng.chance(d === 1 ? 0.2 : 0.4) ? rng.pick([-8, -6, 6, 8]) : 0
  return degQuestion({
    kpId,
    d,
    sig: `read-${deg}-${left ? 'l' : 'r'}-${tilt}`,
    stem: [text('m4.ang.readQ'), protractorAngle(deg, left, tilt)],
    value: deg,
    rng,
    max: 180,
    smart: [180 - deg, deg + 10, deg - 10],
  })
}

/** 练习五 6(3)：∠1 的大小有（30）个 1°，即（30）° */
function genOnes(kpId: string, d: Difficulty, rng: RNG): Question {
  const deg = rng.chance(0.4) ? 30 : rng.int(2, 16) * 10
  const left = rng.chance(0.3)
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `ones-${deg}-${left ? 'l' : 'r'}`,
    stem: [text('m4.ang.onesQ'), protractorAngle(deg, left, 0, '1')],
    value: deg,
    rng,
    min: 1,
    max: 180,
    smart: [180 - deg, deg + 10, deg - 10],
  })
}

/** 第 30 页：1 周角 = 360°，1 平角 = 180°，1 直角 = 90° */
function genDegOf(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick<AngleKind>(['full', 'straight', 'right'])
  const value = { full: 360, straight: 180, right: 90 }[kind as 'full' | 'straight' | 'right']
  return degQuestion({
    kpId,
    d,
    sig: `degof-${kind}`,
    stem: [text('m4.ang.degOfQ', { kind: kindL(kind) })],
    value,
    rng,
    smart: [90, 180, 360, 100, 270].filter((x) => x !== value),
  })
}

/** 第 30 页：把圆平均分成 360 份，1 份所对的角是 1°；量角器把半圆分成 180 等份 */
function genUnit(kpId: string, d: Difficulty, rng: RNG): Question {
  const circle = rng.chance(0.55)
  const value = circle ? 360 : 180
  return numberQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `unit-${circle ? 'circle' : 'half'}`,
    stem: [text(circle ? 'm4.ang.circleQ' : 'm4.ang.halfQ')],
    value,
    rng,
    min: 1,
    max: 400,
    smart: circle ? [180, 100, 90] : [360, 90, 100],
  })
}

/** 例 2 量角的步骤：中心与顶点重合、0° 刻度线与一条边重合、另一条边对着的刻度就是度数 */
const MEASURE_STEPS: { key: string; correct: string; wrong: string[] }[] = [
  { key: 'm4.ang.stepCenterQ', correct: 'm4.ang.vertex', wrong: ['m4.ang.aSide', 'm4.ang.otherSide'] },
  { key: 'm4.ang.stepZeroQ', correct: 'm4.ang.aSide', wrong: ['m4.ang.vertex'] },
  { key: 'm4.ang.stepReadQ', correct: 'm4.ang.degrees', wrong: ['m4.ang.sideLength', 'm4.ang.vertex'] },
]
function genMeasureStep(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.pick(MEASURE_STEPS)
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `mstep-${s.key}`,
    stem: [text(s.key)],
    correct: { k: s.correct },
    distractors: s.wrong.map((k): LStr => ({ k })),
    rng,
  })
}

/** 整理和复习的度数范围：0° < 锐角 < 90°、直角 = 90°、90° < 钝角 < 180°、平角 = 180°、周角 = 360° */
function genKindByDeg(kpId: string, d: Difficulty, rng: RNG, draw = false): Question {
  // 画角时课本给的度数：例 3 的 60°，做一做的 75°、105°、20°、30°、85°、90°、120°、135°，练习六 2 的 70°、45°、115°、150°、180°
  const textbook = draw ? [60, 75, 105, 20, 30, 85, 90, 120, 135, 70, 45, 115, 150, 180] : [90, 180, 360, 30, 75, 120, 150]
  const deg = rng.chance(0.5) ? rng.pick(textbook) : rng.int(1, 35) * 5
  const kind = kindOfDeg(deg)
  const pool = (draw ? (['acute', 'right', 'obtuse', 'straight'] as AngleKind[]) : KINDS).filter((k) => k !== kind)
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `${draw ? 'dkind' : 'kind'}-${deg}`,
    stem: [text(draw ? 'm4.ang.drawKindQ' : 'm4.ang.degKindQ', { deg })],
    correct: kindL(kind),
    distractors: some(rng, pool, 3).map(kindL),
    rng,
  })
}

/** 做一做 2：两个角量一量、比一比——一样大的两个角边画得一长一短；不一样大的差得多（20° 以上），大的那个边反而短 */
function genSame(kpId: string, d: Difficulty, rng: RNG): Question {
  const rel = rng.pick<Rel>(['=', '=', '>', '<'])
  const a = (rel === '>' ? rng.int(11, 28) : rel === '<' ? rng.int(5, 22) : rng.int(6, 28)) * 5
  const b = rel === '=' ? a : rel === '>' ? a - rng.int(4, 6) * 5 : a + rng.int(4, 6) * 5
  const longFirst = rel === '=' ? rng.chance(0.5) : rel === '<'
  const arm = (long: boolean): [number, number] => (long ? [rng.int(11, 13) * 10, rng.int(11, 13) * 10] : [rng.int(5, 7) * 10, rng.int(5, 7) * 10])
  const figs = [a, b].map((deg, i) => fitFig(angleItems(deg, 0, { arms: arm(i === 0 ? longFirst : !longFirst), mark: 'arc', label: String(i + 1) }), 12))
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `same-${a}-${b}-${longFirst ? 'L' : 'S'}`,
    stem: [text('m4.ang.sameQ'), geoPart(figs, '（两个角 ∠1、∠2，边画得一长一短）'), { kind: 'expr', expr: '∠1 ○ ∠2' }],
    correct: rel,
    distractors: RELS.filter((r) => r !== rel),
    rng,
  })
}

// ── 三角尺（练习五 4） ──

type RulerKind = 45 | 30
/**
 * 一块三角尺：顶点 V 处的角是 at（30、45、60 或 90，要是这块尺上有的角），一条边从 V 朝 rot 方向，另一条边朝 rot + at；
 * 不是直角的那个角，直角放在第一条边的那头。L 是第一条边的长。
 */
function rulerPts(kind: RulerKind, at: number, rot: number, L = 100): GeoPt[] {
  const V: GeoPt = [0, 0]
  if (at === 90) {
    // 直角在 V：45° 尺两条直角边一样长，30° 尺长直角边是短的 √3 倍
    const other = kind === 45 ? L : L * Math.sqrt(3)
    return [V, along(V, dir(rot), L), along(V, dir(rot + 90), kind === 45 ? other : L / Math.sqrt(3))]
  }
  return [V, along(V, dir(rot), L), along(V, dir(rot + at), L / Math.cos(rad(at)))]
}

/** 顶点 p 处、两条边 p→a、p→b 夹着的角里，沿角平分线离 p 远 dist 的点 */
export function inside(p: GeoPt, a: GeoPt, b: GeoPt, dist: number): GeoPt {
  const ua = [a[0] - p[0], a[1] - p[1]]
  const ub = [b[0] - p[0], b[1] - p[1]]
  const la = Math.hypot(ua[0]!, ua[1]!)
  const lb = Math.hypot(ub[0]!, ub[1]!)
  const u = [ua[0]! / la + ub[0]! / lb, ua[1]! / la + ub[1]! / lb]
  const l = Math.hypot(u[0]!, u[1]!)
  return [p[0] + (u[0]! / l) * dist, p[1] + (u[1]! / l) * dist]
}

/** 练习五 4(1)：一块三角尺上的三个角 ∠1、∠2、∠3（45° 尺：45°、45°、90°；30° 尺：30°、60°、90°） */
function genRuler(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind: RulerKind = rng.chance(0.5) ? 45 : 30
  // 照课本摆：45° 尺 ∠1 在左下、∠2 在上、∠3（直角）在右下；30° 尺 ∠1（30°）在左、∠2（60°）在右上、∠3（直角）在右下
  const pts = rulerPts(kind, kind, 0, kind === 45 ? 120 : 150)
  const angs = kind === 45 ? [45, 90, 45] : [30, 90, 60] // pts 的顺序：V（左）、直角、上面的顶点
  const turn = rng.pick([0, 0, 90, 180, 270])
  const c: GeoPt = [60, -40]
  const shown = pts.map((p) => rotate(p, turn, c))
  const nums = ['1', '3', '2'] // 照课本：V 是 ∠1、直角是 ∠3、上面的是 ∠2
  const items: GeoItem[] = [{ t: 'poly', pts: shown, fill: 'b', stroke: 'b' }]
  shown.forEach((p, i) => {
    const prev = shown[(i + 2) % 3]!
    const next = shown[(i + 1) % 3]!
    items.push({ t: 'arc', at: p, a: prev, b: next })
    items.push({ t: 'text', at: inside(p, prev, next, labelDist(angs[i]!, 30, 52)), text: nums[i]!, tone: 'd' })
  })
  const ask = rng.int(1, 3)
  const value = angs[nums.indexOf(String(ask))]!
  return degQuestion({
    kpId,
    d,
    sig: `ruler-${kind}-${turn}-${ask}`,
    stem: [text('m4.ang.rulerQ', { n: ask }), geoPart([fitFig(items, 14)], `（一块${kind === 45 ? '等腰直角' : '有一个角是 30° 的'}三角尺，三个角标着 1、2、3）`)],
    value,
    rng,
    max: 180,
    smart: [30, 45, 60, 90].filter((x) => x !== value),
  })
}

/** 练习五 4(2)：一副三角尺拼成的角——∠1 = 30° + 45° = 75°、∠2 = 90° + 60° = 150°，以及 45° + 60°、90° + 30°、90° + 45° */
const COMBOS: [number, number][] = [
  [30, 45],
  [90, 60],
  [45, 60],
  [90, 30],
  [45, 90],
]
function genCombo(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(COMBOS)
  // 两个角各是哪块尺上的：45° 一定是 45° 尺的；30°、60° 是 30° 尺的；90° 给另一块
  const kindOf = (x: number, other: number): RulerKind => (x === 45 ? 45 : x === 90 ? (other === 45 ? 30 : 45) : 30)
  const rot = rng.pick([0, 0, 10, 15])
  // 第一条边的长度按角取：斜边（L / cos 角）不超过 150，两块尺差不多大
  const leg = (x: number): number => (x === 90 ? 110 : Math.min(110, 150 * Math.cos(rad(x))))
  const p1 = rulerPts(kindOf(a, b), a, rot, leg(a))
  const p2 = rulerPts(kindOf(b, a), b, rot + a, leg(b))
  const V: GeoPt = [0, 0]
  const A = along(V, dir(rot), 60)
  const B = along(V, dir(rot + a + b), 60)
  const items: GeoItem[] = [
    { t: 'poly', pts: p1, fill: 'b', stroke: 'b' },
    { t: 'poly', pts: p2, fill: 'c', stroke: 'c' },
    { t: 'arc', at: V, a: A, b: B, ccw: true, r: 24 },
    // 编号写在大的那块尺的那一半里（两块尺的接缝正好在角平分线附近，写在正中会压在线上）；红弧包住整个角
    { t: 'text', at: along(V, dir(rot + (a >= b ? a / 2 : a + b / 2)), 40), text: '1', tone: 'd' },
  ]
  const value = a + b
  return degQuestion({
    kpId,
    d,
    sig: `combo-${a}-${b}-${rot}`,
    stem: [text('m4.ang.comboQ'), geoPart([fitFig(items, 14)], '（一副三角尺拼在一起，拼成的角标着 1）')],
    value,
    rng,
    max: 180,
    smart: [Math.abs(a - b), value + 15, value - 15].filter((x) => x > 0),
  })
}

/** 练习六 5(1)：一条直线上立一条射线，∠1 + ∠2 = 180° */
function genLine(kpId: string, d: Difficulty, rng: RNG): Question {
  // ∠1 不取 90°（那就是两个直角）
  const a = rng.pick(d === 1 ? [3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15] : [2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16]) * 10 + (d === 1 ? 0 : rng.pick([0, 0, 5]))
  const O: GeoPt = [0, 0]
  const R = along(O, dir(0), 120)
  const L = along(O, dir(180), 120)
  const T = along(O, dir(a), 110)
  const askRight = rng.chance(0.4) // 问 ∠1（右边）还是 ∠2（左边）
  const known = askRight ? 180 - a : a
  const items: GeoItem[] = [
    { t: 'line', a: L, b: R },
    { t: 'line', a: O, b: T },
    { t: 'arc', at: O, a: R, b: T },
    { t: 'arc', at: O, a: T, b: L },
    { t: 'text', at: along(O, dir(a / 2), labelDist(a)), text: '1', tone: 'd' },
    { t: 'text', at: along(O, dir((a + 180) / 2), labelDist(180 - a)), text: '2', tone: 'd' },
  ]
  return degQuestion({
    kpId,
    d,
    sig: `line-${a}-${askRight ? 1 : 2}`,
    stem: [text('m4.ang.lineQ', { known: askRight ? 2 : 1, deg: known, ask: askRight ? 1 : 2 }), geoPart([fitFig(items, 14)], '（一条直线上立着一条射线，分成 ∠1 和 ∠2）')],
    value: 180 - known,
    rng,
    max: 360,
    smart: [known, 360 - known, 190 - known],
  })
}

/** 练习六 5(2)、练习五 5：两条直线相交成 ∠1（右）、∠2（上）、∠3（左）、∠4（下）；已知 ∠1，求另一个 */
function genCross(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(d === 3 ? 5 : 6, d === 3 ? 13 : 12) * 5 // ∠1 是锐角：30°–60°（第 3 档 25°–65°）
  const q = -a / 2 + rng.pick([-10, -5, 0, 5, 10])
  const p = q + a
  const O: GeoPt = [0, 0]
  const L = 115
  const ray = (deg: number): GeoPt => along(O, dir(deg), L)
  const at = (deg: number, half: number): GeoPt => along(O, dir(deg), labelDist(half * 2, 32, 60))
  const items: GeoItem[] = [
    { t: 'line', a: ray(q + 180), b: ray(q) },
    { t: 'line', a: ray(p + 180), b: ray(p) },
    { t: 'arc', at: O, a: ray(q), b: ray(p) },
    { t: 'arc', at: O, a: ray(p), b: ray(q + 180) },
    { t: 'arc', at: O, a: ray(q + 180), b: ray(p + 180) },
    { t: 'arc', at: O, a: ray(p + 180), b: ray(q + 360) },
    { t: 'text', at: at(q + a / 2, a / 2), text: '1', tone: 'd' },
    { t: 'text', at: at(p + (180 - a) / 2, (180 - a) / 2), text: '2', tone: 'd' },
    { t: 'text', at: at(q + 180 + a / 2, a / 2), text: '3', tone: 'd' },
    { t: 'text', at: at(p + 180 + (180 - a) / 2, (180 - a) / 2), text: '4', tone: 'd' },
  ]
  const ask = rng.pick([2, 3, 4])
  const value = ask === 3 ? a : 180 - a
  return degQuestion({
    kpId,
    d,
    sig: `cross-${a}-${q}-${ask}`,
    stem: [text('m4.ang.crossQ', { deg: a, ask }), geoPart([fitFig(items, 14)], '（两条直线相交，四个角按右、上、左、下标着 1、2、3、4）')],
    value,
    rng,
    max: 360,
    smart: [a, 180 - a, 90].filter((x) => x !== value),
  })
}

/** 练习五 *7（第 3 档）：比平角大的角——∠1 是图上的小角，∠2 是红弧绕外面一大圈的那个角，∠2 = 360° − ∠1 */
function genReflex(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.pick([90, 90, 130, 120, 60, 45, 150])
  const rot = rng.pick([0, 90, 180, 270])
  const V: GeoPt = [0, 0]
  const A = along(V, dir(rot), 110)
  const B = along(V, dir(rot + a), 110)
  const items: GeoItem[] = [
    { t: 'line', a: V, b: A },
    { t: 'line', a: V, b: B },
    a === 90 ? { t: 'arc', at: V, a: A, b: B, right: true } : { t: 'arc', at: V, a: A, b: B },
    { t: 'arc', at: V, a: B, b: A, ccw: true, r: 26 },
    { t: 'text', at: along(V, dir(rot + a / 2), 38), text: '1', tone: 'd' },
    { t: 'text', at: along(V, dir(rot + a / 2 + 180), 42), text: '2', tone: 'd' },
  ]
  return degQuestion({
    kpId,
    d,
    sig: `reflex-${a}-${rot}`,
    stem: [text('m4.ang.reflexQ', { deg: a }), geoPart([fitFig(items, 40)], '（一个角：小的一边标着 1，绕外面一大圈的弧标着 2）')],
    value: 360 - a,
    rng,
    max: 360,
    smart: [180 - a > 0 ? 180 - a : 0, a, 180 + a].filter((x) => x > 0 && x !== 360 - a),
  })
}

defineGenerator('m4s1-03-measure', (d, rng) => {
  const kpId = 'm4s1-03-measure'
  const roll = rng.next()
  if (d === 1) {
    // 第 29–31 页：1° 与 1 周角 / 平角 / 直角的度数、量角器、例 2 量角的步骤与读数、做一做 1–3、练习五 6；整理和复习的度数范围
    if (roll < 0.4) return genRead(kpId, d, rng)
    if (roll < 0.48) return genOnes(kpId, d, rng)
    if (roll < 0.58) return genDegOf(kpId, d, rng)
    if (roll < 0.65) return genUnit(kpId, d, rng)
    if (roll < 0.74) return genMeasureStep(kpId, d, rng)
    if (roll < 0.88) return genKindByDeg(kpId, d, rng)
    return genSame(kpId, d, rng)
  }
  if (d === 2) {
    // 练习五 2、4、5，练习六 1、5：量角器读 5° 的整数倍、斜放；三角尺上的角与拼成的角；用 180° 减
    if (roll < 0.26) return genRead(kpId, d, rng)
    if (roll < 0.42) return genRuler(kpId, d, rng)
    if (roll < 0.6) return genCombo(kpId, d, rng)
    if (roll < 0.76) return genLine(kpId, d, rng)
    if (roll < 0.92) return genCross(kpId, d, rng)
    return genSame(kpId, d, rng)
  }
  if (roll < 0.35) return genReflex(kpId, d, rng)
  if (roll < 0.6) return genCross(kpId, d, rng)
  if (roll < 0.8) return genCombo(kpId, d, rng)
  return genLine(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 画角（例 3）：射线的端点对着量角器的中心、0° 刻度线和射线重合，在几度的刻度线上点点，再连起来
// ─────────────────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D']

/**
 * 量角器外沿上的几个候选点（从左往右标 A、B、C……，字母和对错无关）：right 是对的那个位置，
 * 其余的是常见的错：看错了圈（180 − 度数的位置）、差 10° / 20°。候选点之间至少隔 10°，都在 10°–170° 里。
 */
function candidates(right: number, wrongs: number[], n: number, rng: RNG, avoid: number[] = []): { points: ProtractorPoint[]; answer: string } {
  const ats = [right]
  const ok = (at: number): boolean => at >= 10 && at <= 170 && ats.every((x) => Math.abs(x - at) >= 10) && avoid.every((x) => Math.abs(x - at) >= 10)
  for (const w of wrongs) if (ats.length < n && ok(w)) ats.push(w)
  for (const off of rng.shuffle([10, -10, 20, -20, 30, -30])) if (ats.length < n && ok(right + off)) ats.push(right + off)
  const sorted = [...ats].sort((x, y) => y - x)
  return { points: sorted.map((at, i) => ({ at, label: LETTERS[i]! })), answer: LETTERS[sorted.indexOf(right)]! }
}

/** 课本画的角：例 3 的 60°（还有「开口向左的 60°」）、做一做 1 的 75°、105°，做一做 2 的 20°、30°、85°、90°、120°、135°，练习六 2 的 70°、45°、115°、150° */
const DRAW_DEGS = [60, 75, 105, 20, 30, 85, 90, 120, 135, 70, 45, 115, 150]

/** 例 3、做一做：画 X° 的角，量角器已经摆好（中心对着射线的端点、0° 刻度线和射线重合），应该在哪个点上画点 */
function genDrawPoint(kpId: string, d: Difficulty, rng: RNG): Question {
  const deg = d === 1 ? (rng.chance(0.6) ? rng.pick(DRAW_DEGS) : rng.int(2, 16) * 10) : rng.int(3, 33) * 5
  const left = rng.chance(0.4) // 射线朝左：画出来的角开口向左
  const base = left ? 180 : 0
  const right = left ? 180 - deg : deg
  const { points, answer } = candidates(right, deg === 90 ? [] : [left ? deg : 180 - deg], d === 1 ? 3 : 4, rng)
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `dpoint-${deg}-${left ? 'l' : 'r'}-${points.map((p) => p.at).join('.')}`,
    stem: [
      text(left ? 'm4.ang.drawLeftQ' : 'm4.ang.drawPointQ', { deg }),
      { kind: 'protractor', rays: [{ at: base }], points, alt: `（量角器的中心对着射线的端点，0° 刻度线和射线重合，射线朝${left ? '左' : '右'}；量角器外沿上有 ${points.map((p) => p.label).join('、')} 几个点）` },
    ],
    correct: answer,
    distractors: points.map((p) => p.label).filter((l) => l !== answer),
    rng,
  })
}

/** 练习五 3：以射线 OA 为角的一条边，画 X° 的角，另一条边可以经过哪个点（另一个对的位置不放点） */
function genDrawOA(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const pos = rng.pick([30, 40, 50, 60, 70, 110, 120, 130, 140, 150])
    const deg = rng.pick(d === 1 ? [50, 30, 40, 60] : [20, 30, 40, 50, 60, 70, 80])
    const goods = [pos + deg, pos - deg].filter((x) => x >= 10 && x <= 170)
    if (!goods.length) continue
    const good = rng.pick(goods)
    // 常见的错：不从 OA 起数，直接对着 X° 的刻度（左右两圈）点；差 10°
    const wrongs = rng.shuffle([deg, 180 - deg, good + (good > pos ? 10 : -10), good + (good > pos ? -10 : 10)])
    const avoid = [pos, ...[pos + deg, pos - deg].filter((x) => x !== good)]
    const { points, answer } = candidates(good, wrongs, d === 1 ? 3 : 4, rng, avoid)
    if (points.length < 3) continue
    // 字母 A 留给射线 OA：候选点从 B 起标
    const relabel = (l: string): string => LETTERS[LETTERS.indexOf(l) + 1] ?? 'E'
    return labelQuestion({
      kpId,
      type: 'angle',
      difficulty: d,
      sig: `doa-${pos}-${deg}-${points.map((p) => p.at).join('.')}`,
      stem: [
        text('m4.ang.drawOAQ', { deg }),
        {
          kind: 'protractor',
          rays: [{ at: pos, label: 'A' }],
          center: 'O',
          points: points.map((p) => ({ at: p.at, label: relabel(p.label) })),
          alt: `（量角器的中心是点 O，射线 OA 从中心画出去；量角器外沿上有 ${points.map((p) => relabel(p.label)).join('、')} 几个点）`,
        },
      ],
      correct: relabel(answer),
      distractors: points.map((p) => relabel(p.label)).filter((l) => l !== relabel(answer)),
      rng,
    })
  }
}

/** 例 3 画角的步骤 */
const DRAW_STEPS: { key: string; correct: string; wrong: string[] }[] = [
  { key: 'm4.ang.drawFirstQ', correct: 'm4.ang.ray', wrong: ['m4.ang.segment', 'm4.ang.line'] },
  { key: 'm4.ang.drawCenterQ', correct: 'm4.ang.endpoint', wrong: ['m4.ang.anyPoint'] },
  { key: 'm4.ang.drawZeroQ', correct: 'm4.ang.theRay', wrong: ['m4.ang.theEndpoint'] },
  { key: 'm4.ang.drawLastQ', correct: 'm4.ang.ray', wrong: ['m4.ang.segment', 'm4.ang.line'] },
]
function genDrawStep(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.pick(DRAW_STEPS)
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `dstep-${s.key}`,
    stem: [text(s.key)],
    correct: { k: s.correct },
    distractors: s.wrong.map((k): LStr => ({ k })),
    rng,
  })
}

/** 一副三角尺能直接画出（拼出）的角：两块尺上的角相加（练习五 4(3)、练习六 2「选择合适的方法」） */
const RULER_SUMS = [75, 105, 120, 135, 150]
const NOT_RULER = [70, 80, 100, 110, 125, 140, 160]
function genRulerDraw(kpId: string, d: Difficulty, rng: RNG): Question {
  const can = rng.chance(0.6)
  const correct = rng.pick(can ? RULER_SUMS : NOT_RULER)
  const wrong = some(
    rng,
    (can ? NOT_RULER : RULER_SUMS).filter((x) => x !== correct),
    2,
  )
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `rdraw-${can ? 'can' : 'cannot'}-${correct}`,
    stem: [text(can ? 'm4.ang.rulerCanQ' : 'm4.ang.rulerCannotQ')],
    correct: `${correct}°`,
    distractors: wrong.map((w) => `${w}°`),
    rng,
  })
}

/** 第 3 档：用一副三角尺画 X° 的角，用哪两个角拼 */
const PAIRS: { sum: number; a: number; b: number }[] = [
  { sum: 75, a: 45, b: 30 },
  { sum: 105, a: 45, b: 60 },
  { sum: 120, a: 90, b: 30 },
  { sum: 135, a: 90, b: 45 },
  { sum: 150, a: 90, b: 60 },
]
function genRulerPair(kpId: string, d: Difficulty, rng: RNG): Question {
  const p = rng.pick(PAIRS)
  const label = (x: { a: number; b: number }): LStr => ({ k: 'm4.ang.pair', p: { a: x.a, b: x.b } })
  return labelQuestion({
    kpId,
    type: 'angle',
    difficulty: d,
    sig: `rpair-${p.sum}`,
    stem: [text('m4.ang.rulerPairQ', { deg: p.sum })],
    correct: label(p),
    distractors: some(
      rng,
      PAIRS.filter((x) => x !== p),
      2,
    ).map(label),
    rng,
  })
}

defineGenerator('m4s1-03-draw', (d, rng) => {
  const kpId = 'm4s1-03-draw'
  const roll = rng.next()
  if (d === 1) {
    // 例 3：画 60° 的角（也画开口向左的）、做一做的度数；画角的步骤；练习六 2 画出的是什么角；练习五 3 以 OA 为边
    if (roll < 0.5) return genDrawPoint(kpId, d, rng)
    if (roll < 0.66) return genDrawStep(kpId, d, rng)
    if (roll < 0.84) return genKindByDeg(kpId, d, rng, true)
    return genDrawOA(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.36) return genDrawPoint(kpId, d, rng)
    if (roll < 0.62) return genDrawOA(kpId, d, rng)
    if (roll < 0.86) return genRulerDraw(kpId, d, rng)
    return genKindByDeg(kpId, d, rng, true)
  }
  if (roll < 0.4) return genRulerPair(kpId, d, rng)
  if (roll < 0.7) return genDrawOA(kpId, d, rng)
  return genDrawPoint(kpId, d, rng)
})

