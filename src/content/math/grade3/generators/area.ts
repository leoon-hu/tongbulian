import type { Difficulty, GeoFig, GeoItem, GeoPt, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelKey, labelQuestion, numberQuestion } from '@/engine'
import { fitFig, geoPart, r1, text } from './lines'
import { LEN_ZH, cellPerimeter, drawSize, gridFig, lenL, orient, polyomino, rectItems, TETROS, type LenUnit } from './rect'

// ─────────────────────────────────────────────────────────────
// 图形的面积（三下四）：面积和面积单位、长方形和正方形的面积、面积单位间的进率。
// 面积单位只有平方厘米、平方分米、平方米（课本题目一律写汉字，不写 cm²）；进率只讲相邻两级（100），课本没教 10000：
// 跨两级的只有「1000 平方厘米 ○ 1 平方米」那种经平方分米就比得出来的（练习十三 2，第 3 档）。乘法控制在表内和
// 「两位数 × 一位数」（10 × 10 课本 p58 算过），不出两位数乘两位数；铺地砖的除数只有 1、4、9。
// 按 G12：课本例题与做一做（比面积、5 × 3、10 × 7 的纸剪最大的正方形、估课桌面、交通标志牌）第 1 档都出得到，
// 练习十一到十三的题放第 2 档。图的说明（alt，静态页会印出来）不写答案。
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
    stem: [text('m3.area.countQ', { u1: areaL(u, true), u: areaL(u) }), geoPart([gridFig(cells, { px: 26, margin: 0 })], `（方格纸上用小方格拼成的一个图形，每格 1 ${AREA_ZH[u]}）`)],
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
/** 选面积单位（练习十一 3 身份证、课桌面、教室、操场，4；p54 的手指甲、报纸拼的 1 平方米） */
const AREA_THINGS: Thing[] = [
  { id: 'stamp', n: 4, u: 'cm2' },
  { id: 'nail', n: 1, u: 'cm2' },
  { id: 'card', n: 46, u: 'cm2' },
  { id: 'hanky', n: 4, u: 'dm2' },
  { id: 'desk', n: 24, u: 'dm2' },
  { id: 'book', n: 6, u: 'dm2' },
  { id: 'board', n: 4, u: 'm2' },
  { id: 'room', n: 60, u: 'm2' },
  { id: 'field', n: 5000, u: 'm2' },
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

/** 面积的意思（p52）、测量面积要统一的面积单位（p53）、1 平方厘米是边长 1 厘米的正方形的面积（p54） */
function genAreaDef(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.3) {
    return labelQuestion({
      kpId,
      type: 'area',
      difficulty: d,
      sig: 'def',
      stem: [text('m3.area.defQ')],
      correct: L('m3.area.area'),
      distractors: [L('m3.area.perimeter'), L('m3.area.length')],
      rng,
    })
  }
  if (roll < 0.45) {
    return labelQuestion({
      kpId,
      type: 'area',
      difficulty: d,
      sig: 'unify',
      stem: [text('m3.area.unifyQ')],
      correct: L('m3.area.unitArea'),
      distractors: [L('m3.area.unitLen'), L('m3.area.unitMass')],
      rng,
    })
  }
  const lu = rng.pick<LenUnit>(['cm', 'dm', 'm'])
  const sq = SQ_OF[lu]
  // 干扰项里也有面积单位（同格式），正确项不能靠「唯一带平方」认出来
  const other = rng.pick((['cm2', 'dm2', 'm2'] as AreaUnit[]).filter((x) => x !== sq))
  return labelQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `unitsq-${lu}`,
    stem: [text('m3.area.unitSq', { lu: lenL(lu) })],
    correct: nU(1, areaL(sq, true)),
    distractors: [nU(1, lenL(lu)), nU(4, areaL(sq)), nU(1, areaL(other, true))],
    rng,
  })
}

/** 画满小方格的 a × b 长方形 */
function rectCells(a: number, b: number): GeoPt[] {
  const out: GeoPt[] = []
  for (let r = 0; r < b; r++) for (let c = 0; c < a; c++) out.push([c, r])
  return out
}
/** p53 比面积的两个长方形（课本是 5 × 2 和 4 × 3），加几组面积差不多、一眼看不出的 */
const RECT_PAIRS: [number, number, number, number][] = [
  [5, 2, 4, 3],
  [5, 2, 4, 3],
  [5, 2, 4, 3],
  [6, 2, 4, 3],
  [3, 3, 5, 2],
  [4, 2, 3, 3],
  [6, 2, 5, 2],
  [4, 3, 5, 3],
  [3, 2, 4, 2],
  [7, 2, 5, 3],
  [4, 4, 6, 3],
  [6, 3, 5, 4],
]
const cellsSig = (c: GeoPt[]): string => c.map((x) => x.join('.')).join('_')

/** 三个图形比面积，问哪个最大 / 最小（练习十一 2） */
function genCmpThree(kpId: string, d: Difficulty, rng: RNG): Question {
  const ns = rng.shuffle([5, 6, 7, 8, 9, 10, 11]).slice(0, 3)
  const shapes = ns.map((n) => polyomino(n, rng, 5, 4))
  const max = rng.chance(0.5)
  const at = ns.indexOf(max ? Math.max(...ns) : Math.min(...ns))
  const correct = String(at + 1)
  return labelQuestion({
    kpId,
    type: 'area',
    difficulty: d,
    sig: `three-${max ? 'max' : 'min'}-${shapes.map(cellsSig).join('-')}`,
    stem: [text(max ? 'm3.area.maxQ' : 'm3.area.minQ'), geoPart(shapes.map((c) => gridFig(c, { px: 18, margin: 0, fill: 'c' })), '（方格纸上三个用小方格拼成的图形，分别标着 1、2、3）', true)],
    correct,
    distractors: ['1', '2', '3'].filter((x) => x !== correct),
    rng,
  })
}

/** 两个图形比面积（p53「（ ）号图形的面积大，大（ ）个小方格」、练习十一 2）：一半是课本那样画满方格的两个长方形 */
function genCmpArea(kpId: string, d: Difficulty, rng: RNG): Question {
  if (d >= 2 && rng.chance(0.4)) return genCmpThree(kpId, d, rng)
  let a: GeoPt[]
  let b: GeoPt[]
  let alt: string
  if (rng.chance(0.5)) {
    const [a1, b1, a2, b2] = rng.pick(RECT_PAIRS)
    ;[a, b] = rng.chance(0.5) ? [rectCells(a1, b1), rectCells(a2, b2)] : [rectCells(a2, b2), rectCells(a1, b1)]
    alt = '（方格纸上两个画满小方格的长方形，分别标着 1、2）'
  } else {
    const n1 = rng.int(5, 11)
    const n2 = rng.chance(0.2) ? n1 : n1 + rng.pick([-3, -2, -1, 1, 2, 3])
    a = polyomino(n1, rng, 5, 4)
    b = polyomino(n2, rng, 5, 4)
    // 一样大的时候别画成一模一样的两个
    for (let i = 0; n1 === n2 && i < 20 && JSON.stringify(a) === JSON.stringify(b); i++) b = polyomino(n2, rng, 5, 4)
    alt = '（方格纸上两个用小方格拼成的图形，分别标着 1、2）'
  }
  const n1 = a.length
  const n2 = b.length
  const same = n1 === n2
  const figs = [a, b].map((c) => gridFig(c, { px: 22, margin: 0, fill: 'c' }))
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
  // 第 1 档：数方格、比面积（p53）、选单位、面积 / 统一单位 / 1 平方厘米（p52–54）；
  // 第 2 档：练习十一的长度单位与面积单位混填、三个图形比、四连方的面积和周长（5）、判断（练习十三 6）
  if (d === 1) return roll < 0.3 ? genCountArea(kpId, d, rng) : roll < 0.5 ? genCmpArea(kpId, d, rng) : roll < 0.8 ? genChooseUnit(kpId, d, rng) : genAreaDef(kpId, d, rng)
  if (d === 2) return roll < 0.3 ? genChooseUnit(kpId, d, rng) : roll < 0.55 ? genTetroPerim(kpId, d, rng) : roll < 0.75 ? genAreaJudge(kpId, d, rng) : genCmpArea(kpId, d, rng)
  return roll < 0.3 ? genTetroPerim(kpId, d, rng) : roll < 0.6 ? genAreaJudge(kpId, d, rng) : roll < 0.8 ? genCmpArea(kpId, d, rng) : genChooseUnit(kpId, d, rng)
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

/** 看图求面积（例 1 的 5 × 3、做一做的 10 × 7，练习十二 1）：d1 表内乘法和 10 × 一位数（一半画出方格），
 *  d2 两位数 × 一位数，正方形边长到 10（10 × 10 课本 p58 算过；不出 11 × 11 这种两位数乘两位数） */
function genRectAreaFig(kpId: string, d: Difficulty, rng: RNG): Question {
  const sq = rng.chance(0.35)
  const u = rng.pick<LenUnit>(['cm', 'cm', 'dm', 'm'])
  let a: number
  let b: number
  if (d === 1) {
    a = rng.int(sq ? 2 : 3, sq ? 9 : 10)
    b = sq ? a : rng.int(2, Math.min(a - 1, 9))
  } else if (sq) {
    a = rng.chance(0.4) ? 10 : rng.int(4, 9)
    b = a
  } else {
    a = rng.int(11, 30)
    b = rng.int(2, 9)
  }
  const grid = d === 1 && a <= 10 && b <= 6 && rng.chance(0.5)
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
    correct: L(sq ? 'm3.area.fSqSq' : 'm3.area.fRectA'),
    // 干扰项是周长公式和「加起来」，和正确项一样是「两个量算一次」的样子
    distractors: sq ? [L('m3.area.fSq4'), L('m3.area.fSqAdd')] : [L('m3.area.fRectP'), L('m3.area.fRectS')],
    rng,
  })
}

interface Word {
  key: string
  p: Record<string, number | LStr>
  value: number
  smart: number[]
}

/** 面积文字题。d1 是课本的例题与做一做：花坛、手帕（2–4 分米）、纸（做一做 10 × 7）、从纸上剪下最大的正方形（做一做 (2)）、
 *  估测面积（例 2：数学书封面约 3 × 2 分米，课桌面大约有几个封面那么大；做一做估教室）。
 *  d2 是练习十二、十三：正方形池塘（已知周长）、两位数 × 一位数的空地、粉刷墙壁（减去黑板）、扫地机器人、洒水车 */
function areaWord(d: Difficulty, rng: RNG): Word {
  if (d === 1) {
    return rng.pick([
      (): Word => {
        const a = rng.int(3, 9)
        const b = rng.int(2, a - 1)
        return { key: 'm3.area.wBed', p: { a, b }, value: a * b, smart: [2 * (a + b), a + b] }
      },
      (): Word => {
        const a = rng.int(2, 4)
        return { key: 'm3.area.wHanky', p: { a }, value: a * a, smart: [4 * a, 2 * a] }
      },
      (): Word => {
        const a = rng.int(4, 10)
        const b = rng.int(2, Math.min(a - 1, 9))
        return { key: 'm3.area.wPaper', p: { a, b }, value: a * b, smart: [2 * (a + b), a + b] }
      },
      (): Word => {
        // 做一做：10 厘米 × 7 厘米的纸，剪下的最大正方形边长就是宽
        const b = rng.int(4, 9)
        const a = rng.int(b + 1, Math.min(10, b + 6))
        return { key: 'm3.area.wCut', p: { a, b }, value: b * b, smart: [a * b, a * a, 4 * b] }
      },
      (): Word => {
        const t = rng.pick([
          { thing: 'm3.area.est.book', a: 3, b: 2, u: 'dm' as LenUnit },
          { thing: 'm3.area.est.desk', a: 6, b: 4, u: 'dm' as LenUnit },
          { thing: 'm3.area.est.room', a: 9, b: 7, u: 'm' as LenUnit },
          { thing: 'm3.area.est.room', a: 8, b: 6, u: 'm' as LenUnit },
          { thing: 'm3.area.est.board', a: 4, b: 1, u: 'm' as LenUnit },
        ])
        return { key: 'm3.area.wEst', p: { thing: L(t.thing), a: t.a, b: t.b, u: lenL(t.u), su: areaL(SQ_OF[t.u]) }, value: t.a * t.b, smart: [2 * (t.a + t.b), t.a + t.b] }
      },
      (): Word => {
        // 例 2：课桌面大约有几个数学书封面（约 3 分米 × 2 分米）那么大
        const k = rng.int(3, 8)
        return { key: 'm3.area.wDesk', p: { a: 3, b: 2, k }, value: 6 * k, smart: [5 * k, k + 6, 6 + k * 2] }
      },
    ])()
  }
  return rng.pick([
    (): Word => {
      const s = rng.int(3, 9)
      return { key: 'm3.area.wPond', p: { p: 4 * s }, value: s * s, smart: [4 * s, 16 * s * s, s] }
    },
    (): Word => {
      const a = rng.int(11, 30)
      const b = rng.int(2, 9)
      return { key: 'm3.area.wYard', p: { a, b }, value: a * b, smart: [2 * (a + b), a + b, a * b + b] }
    },
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
      // 练习十三 5：每分钟行驶 200 米，洒水宽 8 米，5 分钟
      const v = rng.pick([100, 200])
      const w = rng.int(5, 9)
      const t = rng.int(2, 5)
      return { key: 'm3.area.wTruck', p: { v, w, t }, value: v * t * w, smart: [v * t, v * w, v * t + w] }
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
    max: 99999,
    smart: w.smart.filter((x) => Number.isInteger(x) && x > 0 && x !== w.value),
  })
}

/** 同一个长方形，有时问周长、有时问面积（一道只问一样；整理和复习 p62「与之前学习的周长有什么联系和区别」、练习十二 1、6） */
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
    stem: [area ? text('m3.area.rectQ', { u: areaL(SQ_OF[u]) }) : text('m3.area.perimQ', { u: lenL(u) }), geoPart([fitFig(rectItems(W, H, [String(a), null, null, String(b)]), 6)], `（长方形：长 ${a}、宽 ${b}，单位${LEN_ZH[u]}）`)],
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

defineGenerator('m3s2-04-rect-area', (d, rng) => {
  const kpId = 'm3s2-04-rect-area'
  const roll = rng.next()
  // 第 1 档：看图求面积（例 1）、公式、例题与做一做的文字题（含估测面积、剪最大的正方形）、周长还是面积
  if (d === 1) return roll < 0.35 ? genRectAreaFig(kpId, d, rng) : roll < 0.45 ? genAreaFormula(kpId, d, rng) : roll < 0.85 ? genAreaWord(kpId, d, rng) : genPerimOrArea(kpId, d, rng)
  // 第 2 档：练习十二、十三（池塘、空地、粉刷墙壁、扫地机器人、洒水车、剪去一块、L 形草坪）和两位数 × 一位数的图
  if (d === 2) return roll < 0.4 ? genAreaWord(kpId, d, rng) : roll < 0.55 ? genLShape(kpId, d, rng) : roll < 0.7 ? genCutOut(kpId, d, rng) : roll < 0.85 ? genPerimOrArea(kpId, d, rng) : genRectAreaFig(kpId, d, rng)
  return roll < 0.3 ? genLShape(kpId, d, rng) : roll < 0.6 ? genCutOut(kpId, d, rng) : genAreaWord(kpId, d, rng)
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

/** 相邻的两个常用面积单位之间的进率是 100（p59 想一想）；p58 边长 1 分米（10 厘米）的正方形是 100 平方厘米、p59 1 平方米是 100 平方分米 */
function genRate(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const big = rng.pick<LenUnit>(['dm', 'm'])
    const su: AreaUnit = big === 'dm' ? 'cm2' : 'dm2'
    return numberQuestion({
      kpId,
      type: 'area',
      difficulty: d,
      sig: `bigsq-${big}`,
      stem: [text('m3.area.unitSqIn', { lu: lenL(big), su: areaL(su) })],
      value: 100,
      rng,
      min: 1,
      max: 99999,
      smart: [10, 1000, 4, 40],
    })
  }
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
    // 跨两级：1000 平方厘米 ○ 1 平方米（练习十三 2）。课本没教 10000，只出经平方分米就比得出来的（1000 平方厘米是 10 平方分米）
    const x = rng.int(1, 5)
    const y = rng.pick([x * 1000, x * 100])
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

/** 交通标志牌近似正方形（做一做 p59 2，课本是 8 分米）：面积大约是多少平方分米？合多少平方厘米？两问各一半 */
function genSign(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.chance(0.3) ? 8 : rng.int(3, 9)
  const toCm = rng.chance(0.5)
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

/** 铺地砖（练习十三 4，课本 15 米 × 6 米、边长 3 分米）：先把地面的面积换成平方分米，再看一块地砖几平方分米。
 *  地砖边长只用 1、2、3 分米（除数 1、4、9，不出两位数除数），面积的平方米数正好是它的倍数（9000 ÷ 9 这种口算得出） */
function genTiles(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const book = rng.chance(0.2)
    const a = book ? 15 : rng.int(2, 15)
    const b = book ? 6 : rng.int(2, Math.min(a, 9))
    const s = book ? 3 : rng.pick([1, 2, 3])
    if ((a * b) % (s * s) !== 0) continue
    const value = (a * b * 100) / (s * s)
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
  // 第 1 档：例 3 与做一做的换算、进率（p58–59）、交通标志牌（做一做 2）、比大小
  if (d === 1) return roll < 0.5 ? genConv(kpId, d, rng) : roll < 0.65 ? genRate(kpId, d, rng) : roll < 0.8 ? genSign(kpId, d, rng) : genCmpUnits(kpId, d, rng)
  // 第 2 档：练习十二、十三（数大一些的换算、比大小、判断、铺地砖）
  if (d === 2) return roll < 0.25 ? genCmpUnits(kpId, d, rng) : roll < 0.45 ? genJudgeConv(kpId, d, rng) : roll < 0.65 ? genConv(kpId, d, rng) : roll < 0.75 ? genSign(kpId, d, rng) : genTiles(kpId, d, rng)
  return roll < 0.3 ? genTiles(kpId, d, rng) : roll < 0.6 ? genCmpUnits(kpId, d, rng) : roll < 0.8 ? genSign(kpId, d, rng) : genJudgeConv(kpId, d, rng)
})
