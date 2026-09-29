import type { Difficulty, GeoFig, GeoItem, GeoPt, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelKey, labelQuestion, numberQuestion } from '@/engine'
import { fitFig, geoPart, r1, text } from './lines'
import { LEN_ZH, cellPerimeter, drawSize, gridFig, lenL, orient, polyomino, rectItems, TETROS, type LenUnit } from './rect'

// ─────────────────────────────────────────────────────────────
// 图形的面积（三下四）：面积和面积单位、长方形和正方形的面积、面积单位间的进率。
// 面积单位只有平方厘米、平方分米、平方米（课本题目一律写汉字，不写 cm²）；进率只讲相邻两级（100），
// 跨两级的只有「1 平方米 = 10000 平方厘米」那种比较（第 3 档）。乘法控制在表内和「两位数 × 一位数」，不出两位数乘两位数。
// 换算、比大小的题干用「毫米、分米和千米」单元的通用模板 m3.u.conv / cmpAsk / cmpLine / isRight。
// ─────────────────────────────────────────────────────────────

export type AreaUnit = 'cm2' | 'dm2' | 'm2'
const AREA_ZH: Record<AreaUnit, string> = { cm2: '平方厘米', dm2: '平方分米', m2: '平方米' }
/** 面积单位；one = 英文单数（1 square meter） */
const areaL = (u: AreaUnit, one = false): LStr => ({ k: `m3.area.${one ? 'u1' : 'u'}.${u}` })
const SQ_OF: Record<LenUnit, AreaUnit> = { cm: 'cm2', dm: 'dm2', m: 'm2' }
const BASE_OF: Record<AreaUnit, LenUnit> = { cm2: 'cm', dm2: 'dm', m2: 'm' }
const L = (k: string, p?: Record<string, string | number | LStr>): LStr => (p ? { k, p } : { k })
const nU = (n: number, u: LStr): LStr => ({ k: 'm3.area.nU', p: { n, u } })
const BLANK = '___'
const RIGHT: LStr = { k: 'm3.area.right' }
const WRONG: LStr = { k: 'm3.area.wrong' }

// ─────────────────────────────────────────────────────────────
// 面积和面积单位
// ─────────────────────────────────────────────────────────────

/** 数方格求面积（p53、练习十一 2）：每个小方格代表 1 平方厘米（也有平方分米、平方米） */
function genCountArea(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? rng.int(4, 12) : rng.int(8, 14)
  // 第 1 档最多 3 排：手机上题目、方格和数字键盘一屏放得下
  const cells = polyomino(n, rng, 6, d === 1 ? 3 : 4)
  const u: AreaUnit = d === 1 ? rng.pick<AreaUnit>(['cm2', 'cm2', 'cm2', 'dm2', 'm2']) : rng.pick<AreaUnit>(['cm2', 'dm2', 'm2'])
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `count-${u}-${cells.map((c) => c.join('.')).join('_')}`,
    stem: [text('m3.area.countQ', { u1: areaL(u, true), u: areaL(u) }), geoPart([gridFig(cells, { px: 26, margin: 0 })], `（方格纸上 ${n} 个小方格拼成的图形，每格 1 ${AREA_ZH[u]}）`)],
    value: n,
    rng,
    min: 1,
    max: 30,
    smart: [cellPerimeter(cells), n + 1, n - 1],
  })
}

interface Thing {
  id: string
  n: number
  u: LenUnit | AreaUnit
}
/** 选面积单位（练习十一 3、4，p54 的手指甲、报纸拼的 1 平方米） */
const AREA_THINGS: Thing[] = [
  { id: 'stamp', n: 4, u: 'cm2' },
  { id: 'nail', n: 1, u: 'cm2' },
  { id: 'card', n: 46, u: 'cm2' },
  { id: 'hanky', n: 4, u: 'dm2' },
  { id: 'desk', n: 24, u: 'dm2' },
  { id: 'book', n: 6, u: 'dm2' },
  { id: 'board', n: 4, u: 'm2' },
  { id: 'room', n: 60, u: 'm2' },
  { id: 'school', n: 9000, u: 'm2' },
]
/** 长度单位、面积单位混在一起填（练习十一 4、练习十三 1） */
const MIX_THINGS: Thing[] = [
  { id: 'boardLen', n: 4, u: 'm' },
  { id: 'height', n: 128, u: 'cm' },
  { id: 'waist', n: 6, u: 'dm' },
  { id: 'tree', n: 16, u: 'm' },
  { id: 'crayon', n: 1, u: 'dm' },
  { id: 'dict', n: 5, u: 'cm' },
  { id: 'stamp', n: 4, u: 'cm2' },
  { id: 'hanky', n: 4, u: 'dm2' },
  { id: 'board', n: 4, u: 'm2' },
  { id: 'school', n: 9000, u: 'm2' },
]
const isArea = (u: LenUnit | AreaUnit): u is AreaUnit => u.endsWith('2')
const unitL = (u: LenUnit | AreaUnit): LStr => (isArea(u) ? areaL(u) : lenL(u))

function genChooseUnit(kpId: string, d: Difficulty, rng: RNG): Question {
  const mix = d >= 2
  const t = rng.pick(mix ? MIX_THINGS : AREA_THINGS)
  const u = t.u
  let distractors: (LenUnit | AreaUnit)[]
  if (!mix) distractors = (['cm2', 'dm2', 'm2'] as AreaUnit[]).filter((x) => x !== u)
  else if (isArea(u)) {
    // 同一个「底」的长度单位 + 另一个面积单位
    const other = rng.pick((['cm2', 'dm2', 'm2'] as AreaUnit[]).filter((x) => x !== u))
    distractors = [BASE_OF[u], other]
  } else {
    const other = rng.pick((['cm', 'dm', 'm'] as LenUnit[]).filter((x) => x !== u))
    distractors = [SQ_OF[u], other]
  }
  return labelQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `unit-${t.id}-${mix ? 'mix' : 'area'}`,
    stem: [text(`m3.area.it.${t.id}`, { n: t.n, u: BLANK }), text('m3.u.which')],
    correct: unitL(u),
    distractors: distractors.map(unitL),
    rng,
  })
}

/** 面积的意思、1 平方厘米是边长 1 厘米的正方形的面积（p52、p54） */
function genAreaDef(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) {
    return labelQuestion({
      kpId,
      type: 'area',
      difficulty: d,
      sig: 'def',
      stem: [text('m3.area.defQ')],
      correct: L('m3.area.area'),
      distractors: [L('m3.rect.perimeter'), L('m3.area.length')],
      rng,
    })
  }
  const lu = rng.pick<LenUnit>(['cm', 'dm', 'm'])
  return labelQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `unitsq-${lu}`,
    stem: [text('m3.area.unitSq', { lu: lenL(lu) })],
    correct: nU(1, areaL(SQ_OF[lu], true)),
    distractors: [nU(1, lenL(lu)), nU(4, lenL(lu))],
    rng,
  })
}

/** 两个图形比面积（练习十一 2、p53「②号图形的面积大，大 2 个小方格」） */
function genCmpArea(kpId: string, d: Difficulty, rng: RNG): Question {
  const n1 = rng.int(5, 11)
  const same = rng.chance(0.2)
  const n2 = same ? n1 : n1 + rng.pick([-3, -2, -1, 1, 2, 3])
  const a = polyomino(n1, rng, 5, 4)
  let b = polyomino(n2, rng, 5, 4)
  // 一样大的时候别画成一模一样的两个
  for (let i = 0; same && i < 20 && JSON.stringify(a) === JSON.stringify(b); i++) b = polyomino(n2, rng, 5, 4)
  const figs = [a, b].map((c) => gridFig(c, { px: 22, margin: 0, fill: 'c' }))
  const alt = `（方格纸上两个图形：1 号 ${n1} 格，2 号 ${n2} 格）`
  if (!same && rng.chance(0.4)) {
    return numberQuestion({
      kpId,
      type: 'area',
      difficulty: d,
      sig: `diff-${a.map((c) => c.join('.')).join('_')}-${b.map((c) => c.join('.')).join('_')}`,
      stem: [text('m3.area.diffQ'), geoPart(figs, alt, true)],
      value: Math.abs(n1 - n2),
      rng,
      min: 0,
      max: 20,
      smart: [n1, n2, n1 + n2],
    })
  }
  const correct: LStr = same ? L('m3.area.same') : n1 > n2 ? '1' : '2'
  return labelQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `cmp-${a.map((c) => c.join('.')).join('_')}-${b.map((c) => c.join('.')).join('_')}`,
    stem: [text('m3.area.cmpQ'), geoPart(figs, alt, true)],
    correct,
    distractors: (['1', '2', L('m3.area.same')] as LStr[]).filter((x) => labelKey(x) !== labelKey(correct)),
    rng,
  })
}

/** 同样用 4（或 5）个 1 平方厘米的正方形拼成的图形：面积一样，周长不一定一样（练习十一 5） */
function genTetroPerim(kpId: string, d: Difficulty, rng: RNG): Question {
  const five = rng.chance(0.3)
  const cells = five ? polyomino(5, rng, 4, 3) : orient(TETROS[rng.pick(['I', 'O', 'L', 'S', 'T'] as const)], rng.int(0, 3), rng.chance(0.5))
  const n = cells.length
  const askArea = rng.chance(0.25)
  const perim = cellPerimeter(cells)
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `tetro-${askArea ? 'a' : 'p'}-${cells.map((c) => c.join('.')).join('_')}`,
    stem: [text(askArea ? 'm3.area.piecesArea' : 'm3.area.piecesPerim', { n }), geoPart([gridFig(cells, { px: 30, margin: 0, lines: false, fill: 'a' })], `（${n} 个小正方形拼成的图形）`)],
    value: askArea ? n : perim,
    rng,
    min: 1,
    max: 30,
    smart: askArea ? [perim, n + 1, 2 * n] : [n, perim + 2, perim - 2, 4 * n],
  })
}

/** 判断（练习十三 6、成长小档案「1 厘米和 1 平方厘米不一样」） */
const AREA_JUDGE: { key: string; ok: boolean }[] = [
  { key: 'm3.area.s.eight', ok: true },
  { key: 'm3.area.s.oneWay', ok: false },
  { key: 'm3.area.s.samePerim', ok: false },
  { key: 'm3.area.s.meter', ok: true },
  { key: 'm3.area.s.sameArea', ok: false },
  { key: 'm3.area.s.cmSame', ok: false },
]
function genAreaJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.pick(AREA_JUDGE)
  return labelQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `judge-${s.key}`,
    stem: [text(s.key), text('m3.u.isRight')],
    correct: s.ok ? RIGHT : WRONG,
    distractors: [s.ok ? WRONG : RIGHT],
    rng,
  })
}

defineGenerator('m3s2-04-area-units', (d, rng) => {
  const kpId = 'm3s2-04-area-units'
  const roll = rng.next()
  if (d === 1) return roll < 0.45 ? genCountArea(kpId, d, rng) : roll < 0.8 ? genChooseUnit(kpId, d, rng) : genAreaDef(kpId, d, rng)
  if (d === 2) return roll < 0.4 ? genCmpArea(kpId, d, rng) : roll < 0.8 ? genChooseUnit(kpId, d, rng) : genCountArea(kpId, d, rng)
  return roll < 0.4 ? genTetroPerim(kpId, d, rng) : roll < 0.75 ? genAreaJudge(kpId, d, rng) : genCmpArea(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 长方形和正方形的面积：长方形的面积 = 长 × 宽，正方形的面积 = 边长 × 边长
// ─────────────────────────────────────────────────────────────

/** 标了长和宽的长方形（长标在上边、宽标在左边，同课本 p56）；grid = 里面画 1 个单位的方格（看出 5 × 3） */
function areaRectFig(a: number, b: number, grid: boolean, sq: boolean): GeoFig {
  const labels = [String(a), null, null, sq ? null : String(b)]
  if (!grid) {
    const [W, H] = sq ? [110, 110] : drawSize(a, b)
    return fitFig(rectItems(W, H, labels, sq ? 'c' : 'a'), 6)
  }
  const px = Math.min(28, Math.floor(230 / a), Math.floor(150 / b))
  const items: GeoItem[] = [
    ...rectItems(a, b, labels, sq ? 'c' : 'a'),
    { t: 'grid', x: 0, y: 0, w: a, h: b },
  ]
  return { w: a, h: b, px, items }
}

/** 看图求面积（例 1，练习十二 1）：d1 表内乘法（一半画出方格），d2 两位数 × 一位数 */
function genRectAreaFig(kpId: string, d: Difficulty, rng: RNG): Question {
  const sq = rng.chance(0.35)
  const u = rng.pick<LenUnit>(['cm', 'cm', 'dm', 'm'])
  let a: number
  let b: number
  if (d === 1) {
    a = rng.int(sq ? 2 : 3, 9)
    b = sq ? a : rng.int(2, a - 1)
  } else if (sq) {
    a = rng.int(10, 12)
    b = a
  } else {
    a = rng.int(11, 30)
    b = rng.int(2, 9)
  }
  const grid = d === 1 && a <= 9 && b <= 6 && rng.chance(0.5)
  const value = a * b
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `fig-${sq ? 'sq' : 'rect'}-${a}-${b}-${u}-${grid ? 'g' : ''}`,
    stem: [text(sq ? 'm3.area.sqQ' : 'm3.area.rectQ', { u: areaL(SQ_OF[u]) }), geoPart([areaRectFig(a, b, grid, sq)], `（${sq ? `正方形，边长 ${a}` : `长方形：长 ${a}、宽 ${b}`}，单位${LEN_ZH[u]}${grid ? '，里面画着 1 个单位的小方格' : ''}）`)],
    value,
    rng,
    min: 1,
    max: 999,
    smart: sq ? [4 * a, 2 * a, a * a + a] : [2 * (a + b), a + b, value + a],
  })
}

/** 面积公式（p57） */
function genAreaFormula(kpId: string, d: Difficulty, rng: RNG): Question {
  const sq = rng.chance(0.5)
  return labelQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `formula-${sq ? 'sq' : 'rect'}`,
    stem: [text(sq ? 'm3.area.howSq' : 'm3.area.howRect')],
    correct: L(sq ? 'm3.rect.fSqSq' : 'm3.rect.fRectA'),
    distractors: sq ? [L('m3.rect.fSq4'), L('m3.area.fSqAdd')] : [L('m3.rect.fRectP'), L('m3.rect.fRectS')],
    rng,
  })
}

interface Word {
  key: string
  p: Record<string, number | LStr>
  value: number
  smart: number[]
}

/** 面积文字题：d1 花坛、手帕、纸；d2 正方形池塘（已知周长）、剪最大的正方形、估一估、两位数 × 一位数的空地 */
function areaWord(d: Difficulty, rng: RNG): Word {
  if (d === 1) {
    return rng.pick([
      (): Word => {
        const a = rng.int(3, 9)
        const b = rng.int(2, a - 1)
        return { key: 'm3.area.wBed', p: { a, b }, value: a * b, smart: [2 * (a + b), a + b] }
      },
      (): Word => {
        const a = rng.int(2, 9)
        return { key: 'm3.area.wHanky', p: { a }, value: a * a, smart: [4 * a, 2 * a] }
      },
      (): Word => {
        const a = rng.int(4, 9)
        const b = rng.int(2, a - 1)
        return { key: 'm3.area.wPaper', p: { a, b }, value: a * b, smart: [2 * (a + b), a + b] }
      },
    ])()
  }
  return rng.pick([
    (): Word => {
      const s = rng.int(3, 9)
      return { key: 'm3.area.wPond', p: { p: 4 * s }, value: s * s, smart: [4 * s, 16 * s * s, s] }
    },
    (): Word => {
      const b = rng.int(4, 9)
      const a = b + rng.int(1, 6)
      return { key: 'm3.area.wCut', p: { a, b }, value: b * b, smart: [a * b, a * a, 4 * b] }
    },
    (): Word => {
      const t = rng.pick([
        { thing: 'm3.area.est.book', a: 3, b: 2, u: 'dm' as LenUnit },
        { thing: 'm3.area.est.desk', a: 6, b: 4, u: 'dm' as LenUnit },
        { thing: 'm3.area.est.room', a: 9, b: 7, u: 'm' as LenUnit },
        { thing: 'm3.area.est.board', a: 4, b: 1, u: 'm' as LenUnit },
      ])
      return { key: 'm3.area.wEst', p: { thing: L(t.thing), a: t.a, b: t.b, u: lenL(t.u), su: areaL(SQ_OF[t.u]) }, value: t.a * t.b, smart: [2 * (t.a + t.b), t.a + t.b] }
    },
    (): Word => {
      const a = rng.int(11, 30)
      const b = rng.int(2, 9)
      return { key: 'm3.area.wYard', p: { a, b }, value: a * b, smart: [2 * (a + b), a + b, a * b + b] }
    },
  ])()
}

function genAreaWord(kpId: string, d: Difficulty, rng: RNG): Question {
  const w = areaWord(d, rng)
  const nums = Object.values(w.p).filter((x): x is number => typeof x === 'number')
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `${w.key}-${nums.join('-')}`,
    stem: [text(w.key, w.p)],
    value: w.value,
    rng,
    min: 1,
    max: 999,
    smart: w.smart.filter((x) => Number.isInteger(x) && x > 0 && x !== w.value),
  })
}

/** 同一个长方形，有时问周长、有时问面积（一道只问一样） */
function genPerimOrArea(kpId: string, d: Difficulty, rng: RNG): Question {
  const u = rng.pick<LenUnit>(['cm', 'dm', 'm'])
  const a = rng.int(3, 9)
  const b = rng.int(2, a - 1)
  const area = rng.chance(0.5)
  const [W, H] = drawSize(a, b)
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `pa-${area ? 'a' : 'p'}-${a}-${b}-${u}`,
    stem: [area ? text('m3.area.rectQ', { u: areaL(SQ_OF[u]) }) : text('m3.rect.rectPerimQ', { u: lenL(u) }), geoPart([fitFig(rectItems(W, H, [String(a), null, null, String(b)]), 6)], `（长方形：长 ${a}、宽 ${b}，单位${LEN_ZH[u]}）`)],
    value: area ? a * b : 2 * (a + b),
    rng,
    min: 1,
    max: 200,
    smart: area ? [2 * (a + b), a + b] : [a * b, a + b],
  })
}

/** L 形草坪（练习十二 8）：左边一条 + 右下一块，面积 = 两个长方形的和 */
function genLShape(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(3, 8) // 左边竖条的宽
  const H = rng.int(7, 12) // 总高
  const b = rng.int(4, 10) // 右下伸出去的长
  const c = rng.int(2, Math.min(6, H - 3)) // 右下那块的高
  const k = Math.min(210 / (a + b), 150 / H)
  const s = (v: number): number => r1(v * k)
  const pts: GeoPt[] = [
    [0, 0],
    [s(a), 0],
    [s(a), s(H - c)],
    [s(a + b), s(H - c)],
    [s(a + b), s(H)],
    [0, s(H)],
  ]
  const labels = [String(a), null, String(b), String(c), null, String(H)]
  const value = a * H + b * c
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `lshape-${a}-${H}-${b}-${c}`,
    stem: [text('m3.area.lawn'), geoPart([fitFig([{ t: 'poly', pts, fill: 'c', stroke: 'c', labels }], 6)], `（L 形草坪：左边宽 ${a}、高 ${H}，右下伸出长 ${b}、高 ${c}；单位：米）`)],
    value,
    rng,
    min: 1,
    max: 999,
    smart: [(a + b) * H, a * H + b * H, value + c],
  })
}

/** 从正方形纸上剪去一个长方形（练习十二 7）：剪在角上、剪在边上，剩下的面积 = 正方形 − 长方形 */
function genCutOut(kpId: string, d: Difficulty, rng: RNG): Question {
  const sq = rng.int(5, 9)
  const p = rng.int(2, sq - 2) // 剪去的宽
  const q = rng.int(2, sq - 2) // 剪去的深
  const onEdge = rng.chance(0.5)
  const x0 = onEdge ? rng.int(1, sq - p - 1) : sq - p
  const k = 150 / sq
  const s = (v: number): number => r1(v * k)
  // 剩下的部分（从左上角顺时针），剪去的口在上边
  const keep: GeoPt[] = onEdge
    ? [
        [0, 0],
        [s(x0), 0],
        [s(x0), s(q)],
        [s(x0 + p), s(q)],
        [s(x0 + p), 0],
        [s(sq), 0],
        [s(sq), s(sq)],
        [0, s(sq)],
      ]
    : [
        [0, 0],
        [s(x0), 0],
        [s(x0), s(q)],
        [s(sq), s(q)],
        [s(sq), s(sq)],
        [0, s(sq)],
      ]
  const cut: GeoPt[] = [
    [s(x0), 0],
    [s(x0 + p), 0],
    [s(x0 + p), s(q)],
    [s(x0), s(q)],
  ]
  const keepLabels = onEdge ? [null, String(q), String(p), null, null, null, String(sq), null] : [null, String(q), String(p), null, String(sq), null]
  const items: GeoItem[] = [
    { t: 'poly', pts: cut, fill: 'paper', stroke: 'soft', dash: true },
    { t: 'poly', pts: keep, fill: 'a', stroke: 'a', labels: keepLabels },
  ]
  const value = sq * sq - p * q
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `cut-${sq}-${p}-${q}-${onEdge ? x0 : 'c'}`,
    stem: [text('m3.area.cutQ'), geoPart([fitFig(items, 6)], `（边长 ${sq} 厘米的正方形纸，${onEdge ? '上边中间' : '右上角'}剪去一个长 ${p}、宽 ${q} 的长方形）`)],
    value,
    rng,
    min: 1,
    max: 200,
    smart: [sq * sq, p * q, value - p],
  })
}

/** 第 3 档文字题：粉刷墙壁（减去黑板）、扫地机器人（面积 ÷ 每分钟扫的）、两个长方形拼成正方形 */
function genAreaWord3(kpId: string, d: Difficulty, rng: RNG): Question {
  const pick = rng.pick([
    (): Word => {
      const a = rng.int(5, 9)
      const b = rng.int(3, 4)
      const c = rng.int(2, 4)
      return { key: 'm3.area.wWall', p: { a, b, c }, value: a * b - c, smart: [a * b, a * b + c, 2 * (a + b) - c] }
    },
    (): Word => {
      const r = rng.int(2, 5)
      for (;;) {
        const a = rng.int(3, 9)
        const b = rng.int(2, a)
        if ((a * b) % r === 0 && a * b > r) return { key: 'm3.area.wRobot', p: { r, a, b }, value: (a * b) / r, smart: [a * b, a * b * r, a + b] }
      }
    },
    (): Word => {
      const b = rng.int(2, 5)
      return { key: 'm3.area.wTwo', p: { a: 2 * b, b }, value: 4 * b * b, smart: [2 * b * b, 8 * b, 6 * b] }
    },
  ])()
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `${pick.key}-${Object.values(pick.p).join('-')}`,
    stem: [text(pick.key, pick.p)],
    value: pick.value,
    rng,
    min: 1,
    max: 999,
    smart: pick.smart.filter((x) => Number.isInteger(x) && x > 0 && x !== pick.value),
  })
}

defineGenerator('m3s2-04-rect-area', (d, rng) => {
  const kpId = 'm3s2-04-rect-area'
  const roll = rng.next()
  if (d === 1) return roll < 0.55 ? genRectAreaFig(kpId, d, rng) : roll < 0.7 ? genAreaFormula(kpId, d, rng) : genAreaWord(kpId, d, rng)
  if (d === 2) return roll < 0.45 ? genAreaWord(kpId, d, rng) : roll < 0.75 ? genPerimOrArea(kpId, d, rng) : genRectAreaFig(kpId, d, rng)
  return roll < 0.3 ? genLShape(kpId, d, rng) : roll < 0.6 ? genCutOut(kpId, d, rng) : genAreaWord3(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 面积单位间的进率：1 平方米 = 100 平方分米，1 平方分米 = 100 平方厘米
// ─────────────────────────────────────────────────────────────

const PAIRS: [AreaUnit, AreaUnit][] = [
  ['m2', 'dm2'],
  ['dm2', 'cm2'],
]
/** 换算（例 3、做一做、练习十二 2）：d1 几个大单位 ↔ 整百个小单位，d2 数大一些 */
function genConv(kpId: string, d: Difficulty, rng: RNG): Question {
  const [big, small] = rng.pick(PAIRS)
  const a = d === 1 ? rng.int(1, 9) : rng.int(10, 60)
  const down = rng.chance(0.55)
  const [from, to, n, value]: [AreaUnit, AreaUnit, number, number] = down ? [big, small, a, a * 100] : [small, big, a * 100, a]
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `conv-${from}-${n}`,
    stem: [text('m3.u.conv', { a: n, ua: areaL(from, n === 1), ub: areaL(to) })],
    value,
    rng,
    min: 0,
    max: 99999,
    smart: down ? [a * 10, a * 1000, a] : [a * 10, a * 100, Math.max(1, Math.round(a / 10))],
  })
}

/** 相邻的两个常用面积单位之间的进率是 100（p59 想一想） */
function genRate(kpId: string, d: Difficulty, rng: RNG): Question {
  return labelQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: 'rate',
    stem: [text('m3.area.rateQ')],
    correct: '100',
    distractors: ['10', '1000'],
    rng,
  })
}

/** 比大小（练习十三 2）：换成同一个单位再比；常见的错是把进率当成 10 */
function genCmpUnits(kpId: string, d: Difficulty, rng: RNG): Question {
  const cross = d === 3 && rng.chance(0.4)
  let left: [number, AreaUnit]
  let right: [number, AreaUnit]
  if (cross) {
    // 跨两级：1000 平方厘米 ○ 1 平方米
    const x = rng.int(1, 5)
    const y = rng.pick([x * 1000, x * 100, x * 10000, x * 10000 - rng.int(1, 9) * 100])
    left = [y, 'cm2']
    right = [x, 'm2']
  } else if (rng.chance(0.2)) {
    const u = rng.pick<AreaUnit>(['cm2', 'dm2', 'm2'])
    const x = rng.int(2, 9) * rng.pick([1, 10])
    left = [x * 10, u]
    right = [x, u]
  } else {
    const [big, small] = rng.pick(PAIRS)
    const x = rng.int(1, 9) * (d === 1 ? 1 : rng.pick([1, 1, 10]))
    const y = rng.pick([x * 100, x * 100, x * 10, x * 100 + rng.pick([-1, 1]) * rng.pick([1, 10, 50]), x * 1000])
    left = [x, big]
    right = [y, small]
  }
  if (rng.chance(0.5)) [left, right] = [right, left]
  const inCm = (v: [number, AreaUnit]): number => v[0] * { cm2: 1, dm2: 100, m2: 10000 }[v[1]]
  const lv = inCm(left)
  const rv = inCm(right)
  const correct = lv > rv ? '>' : lv < rv ? '<' : '='
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty: d,
    sig: `cmp-${left.join('')}-${right.join('')}`,
    stem: [text('m3.u.cmpAsk'), text('m3.u.cmpLine', { a: left[0], ua: areaL(left[1], left[0] === 1), b: right[0], ub: areaL(right[1], right[0] === 1) })],
    correct,
    distractors: ['>', '<', '='].filter((x) => x !== correct),
    rng,
  })
}

/** 判断「6 平方米 = 60 平方分米」对不对（练习十三 6） */
function genJudgeConv(kpId: string, d: Difficulty, rng: RNG): Question {
  const [big, small] = rng.pick(PAIRS)
  const a = rng.int(2, 9)
  const ok = rng.chance(0.45)
  const b = ok ? a * 100 : rng.pick([a * 10, a * 1000])
  return labelQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `judge-${big}-${a}-${b}`,
    stem: [text('m3.area.eqLine', { a, ua: areaL(big), b, ub: areaL(small) }), text('m3.u.isRight')],
    correct: ok ? RIGHT : WRONG,
    distractors: [ok ? WRONG : RIGHT],
    rng,
  })
}

/** 交通标志牌近似正方形（做一做 p59 2）：先算平方分米，再换成平方厘米 */
function genSign(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(3, 9)
  const toCm = d === 3
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `sign-${a}-${toCm ? 'cm' : 'dm'}`,
    stem: [text('m3.area.sign', { a, su: areaL(toCm ? 'cm2' : 'dm2') })],
    value: toCm ? a * a * 100 : a * a,
    rng,
    min: 1,
    max: 99999,
    smart: toCm ? [a * a, a * a * 10, a * 400] : [4 * a, a * a * 100, 2 * a],
  })
}

/** 跨两级：几平方米是几平方厘米（1 平方米 = 10000 平方厘米，练习十三 2 里隐含的） */
function genCross(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(1, 9)
  return numberQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `cross-${a}`,
    stem: [text('m3.u.conv', { a, ua: areaL('m2', a === 1), ub: areaL('cm2') })],
    value: a * 10000,
    rng,
    min: 0,
    max: 99999,
    smart: [a * 100, a * 1000, a * 10],
  })
}

/** 铺地砖（练习十三 4）：先把地面的面积换成平方分米，再看一块地砖几平方分米 */
function genTiles(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const a = rng.int(2, 15)
    const b = rng.int(2, Math.min(a, 9))
    const s = rng.pick([1, 2, 3, 5])
    const total = a * b * 100
    if (total % (s * s) !== 0) continue
    const value = total / (s * s)
    if (value > 99999) continue
    return numberQuestion({
      kpId,
      type: 'area',
      difficulty: d,
      sig: `tiles-${a}-${b}-${s}`,
      stem: [text('m3.area.tiles', { a, b, s })],
      value,
      rng,
      min: 1,
      max: 99999,
      smart: [(a * b) / (s * s), a * b * 100, Math.round((a * b * 10) / s)].filter((x) => Number.isInteger(x) && x > 0),
    })
  }
}

defineGenerator('m3s2-04-area-convert', (d, rng) => {
  const kpId = 'm3s2-04-area-convert'
  const roll = rng.next()
  if (d === 1) return roll < 0.72 ? genConv(kpId, d, rng) : roll < 0.84 ? genRate(kpId, d, rng) : genCmpUnits(kpId, d, rng)
  if (d === 2) return roll < 0.35 ? genCmpUnits(kpId, d, rng) : roll < 0.6 ? genJudgeConv(kpId, d, rng) : roll < 0.85 ? genConv(kpId, d, rng) : genSign(kpId, d, rng)
  return roll < 0.25 ? genSign(kpId, d, rng) : roll < 0.45 ? genCross(kpId, d, rng) : roll < 0.75 ? genTiles(kpId, d, rng) : genCmpUnits(kpId, d, rng)
})
