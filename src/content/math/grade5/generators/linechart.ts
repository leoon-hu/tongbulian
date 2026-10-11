import type { Difficulty, LineSeries, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 折线统计图（五下第 7 单元，课本 p104–111，平台当前的旧版课本；五年级数学 I）：课本没印小节标题，按例题分两个知识点。
// 单式折线统计图：例 1 全国总人口（条形图和折线图对比：点表示多少、连线看出变化；条形统计图直观呈现多少，折线统计图看清变化趋势）、
//   做一做 1 高铁营业里程（点上标数，哪一年比前一年增加的最多：2019 年）、做一做 2 机器人大赛参赛队伍（按统计表画图）；
//   练习二十六 1 GDP（哪一年突破 100 万亿元：2020 年）、2 小东 0～10 岁的身高（哪一年长得最快：0～1 岁，26 cm）、5 用条形还是折线。
// 复式折线统计图：例 2 出生人口和死亡人口（两条线越来越靠近：相差越来越小）、做一做 北京市空气优良和重污染天数；
//   练习二十六 3 甲、乙两地月平均气温、4 某地区 7～15 岁男生、女生平均身高。
// 数据都是课本的（年份太多的截一段，标题跟着换年份）；只出不用估读的题：点上标了数，或数在统计表里。
// 「画折线统计图」改成「哪一年的点画错了」（统计表 + 有一个点画错的图，错一格以上）。不出：按趋势预测、谈感想、调查、剪报、
// 画自己的身高；树莓那题（课本的 7～10 °C 和图对不上）。
// 朗读：问句不写「长得最快」「长高了」「自然增长」（「长」），写「身高增加的最多」「出生人口比死亡人口多多少」；
// 不写「重污染」（「重」读不准），写「空气污染很严重的天数」；图里的字（图题、轴名、图例、点上的数）不朗读，图例照课本写。
// ─────────────────────────────────────────────────────────────

const K1 = 'm5s2-09-single'
const K2 = 'm5s2-09-double'
type P = Record<string, LStr | number>
type Tone = NonNullable<LineSeries['tone']>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const span = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i)

/** 一幅课本里的折线统计图的数据：cats 是年份 / 月份 / 年龄；th = 问句里怎么说这条线（词条 m5.line.th.*），u = 单位（m5.line.u.*） */
export interface LineSet {
  id: string
  cats: number[]
  kind: 'year' | 'month' | 'age'
  series: { id: string; tone: Tone; values: number[]; digits?: number }[]
  step: number
  cells: number
  from?: number
  axis: string
  numbers: boolean
}
export const RAIL: LineSet = { id: 'rail', cats: span(2009, 2021), kind: 'year', series: [{ id: 'rail', tone: 'green', values: [2699, 5133, 6601, 9356, 11028, 16456, 19838, 22980, 25164, 29904, 35388, 37929, 40139] }], step: 5000, cells: 10, axis: 'rail', numbers: true }
export const ROBOT: LineSet = { id: 'robot', cats: span(2012, 2021), kind: 'year', series: [{ id: 'robot', tone: 'blue', values: [128, 123, 137, 168, 175, 190, 212, 203, 247, 264] }], step: 50, cells: 6, axis: 'robot', numbers: true }
export const GDP: LineSet = { id: 'gdp', cats: span(2012, 2021), kind: 'year', series: [{ id: 'gdp', tone: 'orange', digits: 1, values: [538580.0, 592963.2, 643563.1, 688858.2, 746395.1, 832035.9, 919281.1, 986515.2, 1013567.0, 1143669.7] }], step: 200000, cells: 6, axis: 'gdp', numbers: true }
export const HEIGHT: LineSet = { id: 'height', cats: span(0, 10), kind: 'age', series: [{ id: 'height', tone: 'blue', values: [50, 76, 88, 97, 104, 111, 118, 124, 130, 135, 141] }], step: 10, cells: 11, from: 50, axis: 'height', numbers: true }
export const WATER: LineSet = { id: 'water', cats: span(2014, 2021), kind: 'year', series: [{ id: 'water', tone: 'blue', values: [767, 794, 822, 838, 860, 872, 863, 909] }], step: 50, cells: 6, from: 700, axis: 'water', numbers: true }
export const POP: LineSet = { id: 'pop', cats: span(2010, 2021), kind: 'year', series: [{ id: 'pop', tone: 'blue', values: [134091, 134916, 135922, 136726, 137646, 138326, 139232, 140011, 140541, 141008, 141212, 141260] }], step: 5000, cells: 6, from: 120000, axis: 'pop', numbers: false }
export const AIR: LineSet = {
  id: 'air',
  cats: span(2013, 2021),
  kind: 'year',
  series: [
    { id: 'good', tone: 'green', values: [176, 172, 186, 198, 226, 227, 240, 276, 288] },
    { id: 'bad', tone: 'orange', values: [58, 47, 46, 39, 23, 15, 4, 0, 8] },
  ],
  step: 60,
  cells: 5,
  axis: 'days',
  numbers: true,
}
export const BIRTH: LineSet = {
  id: 'birth',
  cats: span(2014, 2021),
  kind: 'year',
  series: [
    { id: 'birth', tone: 'blue', values: [1667, 1655, 1786, 1723, 1523, 1465, 1200, 1062] },
    { id: 'death', tone: 'orange', values: [977, 975, 977, 986, 993, 998, 996, 1014] },
  ],
  step: 500,
  cells: 4,
  axis: 'pop',
  numbers: true,
}
export const TEMP: LineSet = {
  id: 'temp',
  cats: span(1, 12),
  kind: 'month',
  series: [
    { id: 'tempA', tone: 'green', values: [3, 5, 10, 16.1, 21.3, 25.7, 28.8, 28.2, 23.3, 17.5, 11.1, 5.4] },
    { id: 'tempB', tone: 'orange', values: [17, 18, 22, 24.9, 27.4, 28.1, 28.4, 27.7, 26.8, 24.8, 21.8, 18.7] },
  ],
  step: 3,
  cells: 11,
  axis: 'temp',
  numbers: true,
}
export const KIDS: LineSet = {
  id: 'kids',
  cats: span(7, 15),
  kind: 'age',
  series: [
    { id: 'boys', tone: 'blue', values: [125, 132, 136, 140, 145, 152, 160, 166, 170] },
    { id: 'girls', tone: 'orange', values: [123, 128, 135, 141, 147, 153, 156, 158, 160] },
  ],
  step: 5,
  cells: 11,
  from: 120,
  axis: 'kidsHeight',
  numbers: true,
}

/** 截一段（[a, b] 是下标）：标题里的起止年份跟着换 */
export function slice(s: LineSet, a: number, b: number): LineSet {
  return { ...s, cats: s.cats.slice(a, b + 1), series: s.series.map((x) => ({ ...x, values: x.values.slice(a, b + 1) })) }
}
/** 画图：opts.values 换掉某条线的数（「点画错了」的题）、numbers / grid 另给 */
export function chart(s: LineSet, opts: { numbers?: boolean; grid?: boolean; values?: number[][] } = {}): StemPart {
  const series: LineSeries[] = s.series.map((x, j) => ({
    ...(s.series.length > 1 ? { name: L(`m5.line.lg.${x.id}`) } : {}),
    tone: x.tone,
    values: opts.values?.[j] ?? x.values,
    ...(x.digits !== undefined ? { digits: x.digits } : {}),
  }))
  return {
    kind: 'line-chart',
    title: L(`m5.line.t.${s.id}`, { a: s.cats[0]!, b: s.cats[s.cats.length - 1]! }),
    cats: s.cats.map(String),
    series,
    step: s.step,
    cells: s.cells,
    ...(s.from !== undefined ? { from: s.from } : {}),
    valueAxis: L(`m5.line.ax.${s.axis}`),
    catAxis: L(`m5.line.ax.${s.kind}`),
    numbers: opts.numbers ?? s.numbers,
    ...(opts.grid ? { grid: true } : {}),
  }
}
/** 问句里的「2015 年」「3 岁」「7 月」 */
const catText = (s: LineSet, c: number): LStr => L(`m5.line.c.${s.kind}`, { y: c })
const th = (id: string): LStr => L(`m5.line.th.${id}`)
const unit = (id: string): LStr => L(`m5.line.u.${UNIT[id]!}`)
/** 每条线的单位 */
export const UNIT: Record<string, string> = {
  rail: 'km',
  robot: 'team',
  gdp: 'yi',
  height: 'cm',
  water: 'water',
  pop: 'wan',
  good: 'day',
  bad: 'day',
  birth: 'wan',
  death: 'wan',
  tempA: 'deg',
  tempB: 'deg',
  boys: 'cm',
  girls: 'cm',
}
/** 选项里的年份 / 年龄段 / 月份 */
const catOpt = (s: LineSet, c: number): LStr => L(`m5.line.opt.${s.kind}`, { y: c })
/** 下标里挑几个别的（不含 skip），给类别选项当干扰项 */
function otherIdx(n: number, skip: number[], rng: RNG, count = 3): number[] {
  return rng.shuffle(span(0, n - 1).filter((i) => !skip.includes(i))).slice(0, count)
}
const fmt = (v: number, digits?: number): string => (digits === undefined ? String(v) : v.toFixed(digits))

// ══ 读图：一个点的数、最多 / 最少、相邻两年是增加还是减少、每格代表多少 ══

/** 读一个点上的数（点上标了数）；整数用数字键盘，有小数的（气温）用选项 */
function qRead(kp: string, d: Difficulty, rng: RNG, s: LineSet, j: number): Question {
  const x = s.series[j]!
  const i = rng.int(0, s.cats.length - 1)
  const v = x.values[i]!
  const stem = [T(`m5.line.read.${s.kind}`, { c: catText(s, s.cats[i]!), th: th(x.id), u: unit(x.id) }), chart(s)]
  const sig = `read-${s.id}-${s.cats[0]}-${s.cats.length}-${x.id}-${s.cats[i]}`
  if (Number.isInteger(v) && x.digits === undefined) {
    return numberQuestion({ kpId: kp, type: 'stat', difficulty: d, sig, stem, value: v, rng, min: 0, max: 10 ** 7, input: 'numpad' })
  }
  // 小数：别的月份、另一条线同一个月的数
  const others = [...new Set([...s.series.map((y) => y.values[i]!), x.values[i - 1], x.values[i + 1], x.values[i + 2]].filter((y): y is number => y !== undefined && y !== v).map((y) => fmt(y, x.digits)))]
  return labelQuestion({ kpId: kp, type: 'stat', difficulty: d, sig, stem, correct: fmt(v, x.digits), distractors: others.slice(0, 3), rng })
}
/** 最多（最高）/ 最少（最低）的是哪一年（哪个月）：最大、最小只有一个 */
function qExtreme(kp: string, d: Difficulty, rng: RNG, s: LineSet, j: number): Question {
  const x = s.series[j]!
  const most = rng.chance(0.5)
  const target = most ? Math.max(...x.values) : Math.min(...x.values)
  const at = x.values.indexOf(target)
  const w = s.id === 'temp' || s.kind === 'age' ? (most ? 'high' : 'low') : most ? 'most' : 'least'
  return labelQuestion({
    kpId: kp,
    type: 'stat',
    difficulty: d,
    sig: `ext-${s.id}-${s.cats[0]}-${s.cats.length}-${x.id}-${w}`,
    stem: [T(`m5.line.ext.${s.kind}`, { th: th(x.id), w: L(`m5.line.w.${w}`) }), chart(s)],
    correct: catOpt(s, s.cats[at]!),
    distractors: otherIdx(s.cats.length, [at], rng).map((i) => catOpt(s, s.cats[i]!)),
    rng,
  })
}
/** 相邻的两年是增加了还是减少了（数不一样的两年） */
function qUpDown(kp: string, d: Difficulty, rng: RNG, s: LineSet, j: number): Question {
  const x = s.series[j]!
  const pairs = span(0, s.cats.length - 2).filter((i) => x.values[i] !== x.values[i + 1])
  // 有减少的年份就多问一点（不然永远是「增加了」）
  const downs = pairs.filter((i) => x.values[i + 1]! < x.values[i]!)
  const i = downs.length && rng.chance(0.4) ? rng.pick(downs) : rng.pick(pairs)
  const up = x.values[i + 1]! > x.values[i]!
  return labelQuestion({
    kpId: kp,
    type: 'stat',
    difficulty: d,
    sig: `updown-${s.id}-${s.cats[0]}-${s.cats.length}-${x.id}-${s.cats[i]}`,
    stem: [T('m5.line.updown', { a: catText(s, s.cats[i]!), b: catText(s, s.cats[i + 1]!), th: th(x.id) }), chart(s)],
    correct: L(up ? 'm5.line.up' : 'm5.line.down'),
    distractors: [L(up ? 'm5.line.down' : 'm5.line.up')],
    rng,
  })
}
/** 纵轴上每格代表多少（数字键盘） */
function qScale(kp: string, d: Difficulty, rng: RNG, s: LineSet): Question {
  const x = s.series[0]!
  return numberQuestion({ kpId: kp, type: 'stat', difficulty: d, sig: `scale-${s.id}-${s.cats[0]}-${s.cats.length}`, stem: [T('m5.line.scale', { u: unit(x.id) }), chart(s)], value: s.step, rng, min: 1, max: 10 ** 7, input: 'numpad' })
}
/** 总体是怎样变化的：一直增加、一直减少、总体增加（有的年份少了）、总体减少（有的年份多了） */
export function trendOf(v: number[]): 'up' | 'down' | 'mostlyUp' | 'mostlyDown' {
  const steps = v.slice(1).map((x, i) => x - v[i]!)
  if (steps.every((x) => x > 0)) return 'up'
  if (steps.every((x) => x < 0)) return 'down'
  return v[v.length - 1]! > v[0]! ? 'mostlyUp' : 'mostlyDown'
}
const TREND_WRONG: Record<ReturnType<typeof trendOf>, string[]> = {
  up: ['down', 'upDown'],
  down: ['up', 'downUp'],
  mostlyUp: ['up', 'mostlyDown'],
  mostlyDown: ['down', 'mostlyUp'],
}
function qTrend(kp: string, d: Difficulty, rng: RNG, s: LineSet, j: number): Question {
  const x = s.series[j]!
  const t = trendOf(x.values)
  return labelQuestion({
    kpId: kp,
    type: 'stat',
    difficulty: d,
    sig: `trend-${s.id}-${s.cats[0]}-${s.cats.length}-${x.id}`,
    stem: [T('m5.line.trend', { a: catText(s, s.cats[0]!), b: catText(s, s.cats[s.cats.length - 1]!), th: th(x.id) }), chart(s)],
    correct: L(`m5.line.tr.${t}`),
    distractors: TREND_WRONG[t].map((k) => L(`m5.line.tr.${k}`)),
    rng,
  })
}
/** 哪一年（哪个年龄段）比上一年增加的最多（最少）：只出增加量最大（最小）只有一个的 */
function qIncrease(kp: string, d: Difficulty, rng: RNG, s: LineSet, j: number, least = false): Question {
  const x = s.series[j]!
  const inc = x.values.slice(1).map((v, i) => Math.round((v - x.values[i]!) * 10) / 10)
  const target = least ? Math.min(...inc) : Math.max(...inc)
  const at = inc.indexOf(target)
  const order = span(0, inc.length - 1)
    .filter((i) => i !== at)
    .sort((a, b) => (least ? inc[a]! - inc[b]! : inc[b]! - inc[a]!))
  const opt = (i: number): LStr => (s.kind === 'age' ? L('m5.line.opt.ages', { a: s.cats[i]!, b: s.cats[i + 1]! }) : catOpt(s, s.cats[i + 1]!))
  const key = s.kind === 'age' ? `m5.line.inc.age.${least ? 'least' : 'most'}` : `m5.line.inc.year.${least ? 'least' : 'most'}`
  return labelQuestion({
    kpId: kp,
    type: 'stat',
    difficulty: d,
    sig: `inc-${s.id}-${s.cats[0]}-${s.cats.length}-${x.id}-${least ? 'least' : 'most'}`,
    stem: [T(key, { th: th(x.id) }), chart(s)],
    correct: opt(at),
    distractors: order.slice(0, 3).map(opt),
    rng,
  })
}
/** 从某一年到某一年增加了多少（数字键盘；只挑增加了的两年） */
function qDiff(kp: string, d: Difficulty, rng: RNG, s: LineSet, j: number): Question {
  const x = s.series[j]!
  const n = s.cats.length
  const pairs: [number, number][] = []
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (x.values[b]! > x.values[a]! && (d > 1 || b === a + 1)) pairs.push([a, b])
  const [a, b] = rng.pick(pairs)
  const value = x.values[b]! - x.values[a]!
  return numberQuestion({
    kpId: kp,
    type: 'stat',
    difficulty: d,
    sig: `diff-${s.id}-${s.cats[0]}-${n}-${x.id}-${s.cats[a]}-${s.cats[b]}`,
    stem: [T('m5.line.diff', { a: catText(s, s.cats[a]!), b: catText(s, s.cats[b]!), th: th(x.id), u: unit(x.id) }), chart(s)],
    value,
    rng,
    min: 0,
    max: 10 ** 7,
    input: 'numpad',
  })
}

// ══ 单式折线统计图 ══

/** 高铁 13 年太挤：第 1 档截 7 年 */
function railPart(rng: RNG): LineSet {
  const a = rng.int(0, RAIL.cats.length - 7)
  return slice(RAIL, a, a + 6)
}
/** 第 1 档读图用的单式图 */
function singleSet(rng: RNG): LineSet {
  return rng.pick([railPart(rng), ROBOT, WATER, HEIGHT])
}
/** 例 1 的结论：点表示多少、折线看变化；条形统计图直观呈现多少，折线统计图看清变化趋势 */
function qConcept(d: Difficulty, rng: RNG): Question {
  const which = rng.int(0, 2)
  if (which === 0) {
    return labelQuestion({ kpId: K1, type: 'stat', difficulty: d, sig: 'concept-points', stem: [T('m5.line.cq.points')], correct: L('m5.line.ca.points'), distractors: [L('m5.line.ca.bars'), L('m5.line.ca.colors')], rng })
  }
  const line = L('m5.line.chart.line')
  const bar = L('m5.line.chart.bar')
  return which === 1
    ? labelQuestion({ kpId: K1, type: 'stat', difficulty: d, sig: 'concept-trend', stem: [T('m5.line.cq.trend')], correct: line, distractors: [bar], rng })
    : labelQuestion({ kpId: K1, type: 'stat', difficulty: d, sig: 'concept-amount', stem: [T('m5.line.cq.amount')], correct: bar, distractors: [line], rng })
}
/** 练习二十六 5：用条形统计图还是折线统计图（课本两组 + 同样的问法） */
export const SCENES: [string, 'line' | 'bar'][] = [
  ['vacation', 'bar'],
  ['water', 'line'],
  ['height', 'line'],
  ['fruit', 'bar'],
  ['temp', 'line'],
  ['class', 'bar'],
  ['rail', 'line'],
  ['sport', 'bar'],
]
function qChoose(d: Difficulty, rng: RNG): Question {
  const [id, kind] = rng.pick(SCENES)
  const line = L('m5.line.chart.line')
  const bar = L('m5.line.chart.bar')
  return labelQuestion({ kpId: K1, type: 'stat', difficulty: d, sig: `choose-${id}`, stem: [T('m5.line.choose', { x: L(`m5.line.sc.${id}`) })], correct: kind === 'line' ? line : bar, distractors: [kind === 'line' ? bar : line], rng })
}
/** 做一做 2「根据统计表绘制折线统计图」→ 统计表 + 画好的图，有一个点画错了（错一格以上），问哪一年 */
function qWrongPoint(d: Difficulty, rng: RNG): Question {
  // 截连着的 6 年：统计表只要一段，对战窄栏、打怪兽两人的小屏上表和图放得下（2026-10-11 普查：10 年分两段时题干要滚 100 多像素）
  const full = rng.chance(0.6) ? ROBOT : WATER
  const from = rng.int(0, full.cats.length - 6)
  const s = slice(full, from, from + 5)
  const x = s.series[0]!
  const base = s.from ?? 0
  const top = s.from === undefined ? s.cells * s.step : s.from + (s.cells - 1) * s.step
  const i = rng.int(0, s.cats.length - 1)
  const v = x.values[i]!
  const shifts = [s.step, -s.step, Math.round(s.step * 1.5), -Math.round(s.step * 1.5)].filter((k) => v + k >= base && v + k <= top)
  const values = [...x.values]
  values[i] = v + rng.pick(shifts)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L(`m5.line.ax.${s.kind}`), ...s.cats],
      [L(`m5.line.tb.${s.id}`), ...x.values],
    ],
  }
  return labelQuestion({
    kpId: K1,
    type: 'stat',
    difficulty: d,
    sig: `wrong-${s.id}-${s.cats[i]}-${values[i]}`,
    stem: [T('m5.line.wrong'), table, chart(s, { numbers: false, grid: true, values: [values] })],
    correct: catOpt(s, s.cats[i]!),
    distractors: otherIdx(s.cats.length, [i], rng).map((k) => catOpt(s, s.cats[k]!)),
    rng,
  })
}
/** 练习二十六 1：哪一年第一次超过 100 万亿元（2020 年；图上的数以亿元为单位） */
function qGdp(d: Difficulty, rng: RNG): Question {
  const x = GDP.series[0]!
  const at = x.values.findIndex((v) => v > 1000000)
  return labelQuestion({ kpId: K1, type: 'stat', difficulty: d, sig: 'gdp-100', stem: [T('m5.line.gdp100'), chart(GDP)], correct: catOpt(GDP, GDP.cats[at]!), distractors: [at - 1, at + 1, at - 2].map((i) => catOpt(GDP, GDP.cats[i]!)), rng })
}
/** 例 1：总人口逐年上升，但是上升的幅度越来越小 */
function qPop(d: Difficulty, rng: RNG): Question {
  return labelQuestion({ kpId: K1, type: 'stat', difficulty: d, sig: 'pop-trend', stem: [T('m5.line.popTrend', { a: POP.cats[0]!, b: POP.cats[POP.cats.length - 1]! }), chart(POP)], correct: L('m5.line.pop.slower'), distractors: [L('m5.line.pop.faster'), L('m5.line.tr.down')], rng })
}

function singleGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1（点和线、条形和折线）、做一做 1（读数、怎样变化）、做一做 2（画图改成找画错的点、最多的一年）、练习二十六 5
    if (roll < 0.22) return qRead(K1, d, rng, singleSet(rng), 0)
    if (roll < 0.36) return qExtreme(K1, d, rng, rng.pick([railPart(rng), ROBOT, WATER]), 0)
    if (roll < 0.48) return qUpDown(K1, d, rng, rng.pick([railPart(rng), ROBOT, WATER]), 0)
    if (roll < 0.56) return qScale(K1, d, rng, singleSet(rng))
    if (roll < 0.66) return qConcept(d, rng)
    if (roll < 0.76) return qChoose(d, rng)
    if (roll < 0.86) return qWrongPoint(d, rng)
    return qTrend(K1, d, rng, rng.pick([railPart(rng), ROBOT, WATER, HEIGHT]), 0)
  }
  if (d === 2) {
    // 做一做 1、2 的「比上一年增加的最多」、练习二十六 1（GDP）、2（小东哪一年增加的最多、增加了多少）、例 1 的趋势
    // 高铁 13 年太挤：截 9 年，2014 年（+5428）和 2019 年（+5484）都在里面，要算一算才分得出
    if (roll < 0.28) return qIncrease(K1, d, rng, rng.pick([slice(RAIL, 3, 11), slice(RAIL, 4, 12), ROBOT, WATER, HEIGHT]), 0)
    if (roll < 0.52) return qDiff(K1, d, rng, rng.pick([railPart(rng), ROBOT, WATER, HEIGHT]), 0)
    if (roll < 0.64) return qGdp(d, rng)
    if (roll < 0.76) return qPop(d, rng)
    if (roll < 0.88) return qTrend(K1, d, rng, rng.pick([railPart(rng), ROBOT, WATER, GDP]), 0)
    return qWrongPoint(d, rng)
  }
  // 第 3 档：增加的最少的一年（高铁 2009—2017 年里的 2011 年）、GDP 增加的最多的一年、人口的趋势
  if (roll < 0.4) return qIncrease(K1, d, rng, slice(RAIL, 0, 8), 0, true)
  if (roll < 0.7) return qIncrease(K1, d, rng, GDP, 0)
  return qPop(d, rng)
}
defineGenerator(K1, singleGen)

// ══ 复式折线统计图 ══

/** 出生、死亡人口截最近 8 年（课本 24 年，挤不下） */
function doubleSet(rng: RNG): LineSet {
  return rng.pick([AIR, BIRTH, KIDS, TEMP])
}
/** 图例：图中某种颜色的折线表示什么 */
function qLegend(d: Difficulty, rng: RNG): Question {
  const s = rng.pick([AIR, BIRTH, TEMP, KIDS])
  const j = rng.int(0, 1)
  const x = s.series[j]!
  return labelQuestion({
    kpId: K2,
    type: 'stat',
    difficulty: d,
    sig: `legend-${s.id}-${x.id}`,
    stem: [T('m5.line.legend', { c: L(`m5.line.col.${x.tone}`) }), chart(s)],
    correct: th(x.id),
    distractors: [th(s.series[1 - j]!.id)],
    rng,
  })
}
/** 例 2：两条线越来越靠近——出生人口数和死亡人口数相差越来越小 */
function qGap(d: Difficulty, rng: RNG): Question {
  return labelQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: 'gap', stem: [T('m5.line.gap'), chart(BIRTH)], correct: L('m5.line.gap.closer'), distractors: [L('m5.line.gap.wider'), L('m5.line.gap.more')], rng })
}
/** 例 2 机器人「出生人口数减去死亡人口数的差是人口自然增长数」：某一年出生人口比死亡人口多多少万人（数字键盘） */
function qNatural(d: Difficulty, rng: RNG): Question {
  const i = rng.int(0, BIRTH.cats.length - 1)
  const [b, de] = BIRTH.series.map((x) => x.values[i]!) as [number, number]
  return numberQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: `natural-${BIRTH.cats[i]}`, stem: [T('m5.line.natural', { c: catText(BIRTH, BIRTH.cats[i]!) }), chart(BIRTH)], value: b - de, rng, min: 0, max: 9999, input: 'numpad' })
}
/** 练习二十六 3：哪几个月甲地的月平均气温比乙地高（7 月和 8 月） */
function qTempHigher(d: Difficulty, rng: RNG): Question {
  const [a, b] = TEMP.series.map((x) => x.values)
  const months = TEMP.cats.filter((_, i) => a![i]! > b![i]!)
  const pair = (x: number, y: number): LStr => L('m5.line.opt.months', { a: x, b: y })
  const wrong: [number, number][] = [[6, 7], [8, 9], [1, 2], [11, 12]]
  return labelQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: 'temp-higher', stem: [T('m5.line.tempHigher'), chart(TEMP)], correct: pair(months[0]!, months[1]!), distractors: rng.shuffle(wrong).slice(0, 3).map(([x, y]) => pair(x, y)), rng })
}
/** 哪个地方一年里气温的变化大（甲地 3～28.8，乙地 17～28.4） */
function qTempRange(d: Difficulty, rng: RNG): Question {
  return labelQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: 'temp-range', stem: [T('m5.line.tempRange'), chart(TEMP)], correct: L('m5.line.lg.tempA'), distractors: [L('m5.line.lg.tempB')], rng })
}
/** 某个月甲地比乙地高还是低（课本：「十一」去甲地旅游，10 月甲地低 7.3 °C） */
function qTempMonth(d: Difficulty, rng: RNG): Question {
  const [a, b] = TEMP.series.map((x) => x.values)
  const i = rng.chance(0.4) ? 9 : rng.int(0, 11)
  const higher = a![i]! > b![i]!
  return labelQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: `temp-month-${i + 1}`, stem: [T('m5.line.tempMonth', { m: i + 1 }), chart(TEMP)], correct: L(higher ? 'm5.line.higher' : 'm5.line.lower'), distractors: [L(higher ? 'm5.line.lower' : 'm5.line.higher')], rng })
}
/** 甲地一年中最高和最低的月平均气温相差多少（28.8 − 3 = 25.8，第 3 档） */
function qTempSpan(d: Difficulty, rng: RNG): Question {
  const j = rng.int(0, 1)
  const v = TEMP.series[j]!.values
  const span10 = Math.round((Math.max(...v) - Math.min(...v)) * 10)
  const str = (x: number): string => (x % 10 === 0 ? String(x / 10) : (x / 10).toFixed(1))
  const wrongs = [Math.round(Math.max(...v) * 10), Math.round(Math.min(...v) * 10), span10 + 10, span10 - 10].filter((x) => x !== span10 && x > 0).map(str)
  return labelQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: `temp-span-${j}`, stem: [T('m5.line.tempSpan', { p: L(`m5.line.lg.${TEMP.series[j]!.id}`) }), chart(TEMP)], correct: str(span10), distractors: [...new Set(wrongs)].slice(0, 3), rng })
}
/** 练习二十六 4：哪几岁时女生的平均身高比男生高（10、11、12 岁） */
function qGirls(d: Difficulty, rng: RNG): Question {
  const [boys, girls] = KIDS.series.map((x) => x.values)
  const ages = KIDS.cats.filter((_, i) => girls![i]! > boys![i]!)
  const set = (xs: number[]): LStr => L('m5.line.opt.ageSet', { s: xs.join('、') })
  const wrong = [[7, 8, 9], [13, 14, 15], [9, 10, 11], [12, 13, 14]]
  return labelQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: 'girls-taller', stem: [T('m5.line.girls'), chart(KIDS)], correct: set(ages), distractors: rng.shuffle(wrong).slice(0, 3).map(set), rng })
}
/** 某个年龄男生的平均身高比女生高多少厘米（男生高的那几岁，数字键盘） */
function qKidsDiff(d: Difficulty, rng: RNG): Question {
  const [boys, girls] = KIDS.series.map((x) => x.values)
  const idx = KIDS.cats.map((_, i) => i).filter((i) => boys![i]! > girls![i]!)
  const i = rng.pick(idx)
  return numberQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: `kids-diff-${KIDS.cats[i]}`, stem: [T('m5.line.kidsDiff', { a: KIDS.cats[i]! }), chart(KIDS)], value: boys![i]! - girls![i]!, rng, min: 0, max: 99, input: 'numpad' })
}
/** 从几岁起男生的平均身高又比女生高了（13 岁，第 3 档） */
function qKidsAgain(d: Difficulty, rng: RNG): Question {
  const [boys, girls] = KIDS.series.map((x) => x.values)
  const at = KIDS.cats.findIndex((_, i) => i > 0 && boys![i]! > girls![i]! && girls![i - 1]! > boys![i - 1]!)
  return numberQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: 'kids-again', stem: [T('m5.line.kidsAgain'), chart(KIDS)], value: KIDS.cats[at]!, rng, min: 0, max: 20, input: 'numpad' })
}
/** 做一做：某一年空气优良的天数比另一年多多少天（数字键盘） */
function qAirDiff(d: Difficulty, rng: RNG): Question {
  return qDiff(K2, d, rng, AIR, 0)
}
/** 哪一年出生人口数和死亡人口数相差最小（2021 年） */
function qBirthGap(d: Difficulty, rng: RNG): Question {
  const [b, de] = BIRTH.series.map((x) => x.values)
  const gaps = b!.map((v, i) => v - de![i]!)
  const at = gaps.indexOf(Math.min(...gaps))
  const order = gaps.map((_, i) => i).filter((i) => i !== at).sort((x, y) => gaps[x]! - gaps[y]!)
  return labelQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: 'birth-gap', stem: [T('m5.line.birthGap'), chart(BIRTH)], correct: catOpt(BIRTH, BIRTH.cats[at]!), distractors: order.slice(0, 3).map((i) => catOpt(BIRTH, BIRTH.cats[i]!)), rng })
}
/** 哪一年空气污染很严重的天数比上一年多（2021 年，只有这一年，第 3 档） */
function qBadUp(d: Difficulty, rng: RNG): Question {
  const v = AIR.series[1]!.values
  const ups = v.map((x, i) => (i > 0 && x > v[i - 1]! ? i : -1)).filter((i) => i > 0)
  const at = ups[0]!
  return labelQuestion({ kpId: K2, type: 'stat', difficulty: d, sig: 'bad-up', stem: [T('m5.line.badUp'), chart(AIR)], correct: catOpt(AIR, AIR.cats[at]!), distractors: otherIdx(AIR.cats.length, [at, 0], rng).map((i) => catOpt(AIR, AIR.cats[i]!)), rng })
}

function doubleGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2（两条线怎样变化、越来越靠近、出生比死亡多多少）、做一做（读数、最多最少、趋势）、图例
    if (roll < 0.12) return qLegend(d, rng)
    if (roll < 0.34) {
      const s = doubleSet(rng)
      return qRead(K2, d, rng, s, rng.int(0, 1))
    }
    if (roll < 0.52) {
      const s = rng.pick([AIR, TEMP, KIDS])
      return qExtreme(K2, d, rng, s, s === KIDS ? 0 : rng.int(0, 1))
    }
    if (roll < 0.7) return qTrend(K2, d, rng, rng.pick([AIR, BIRTH]), rng.int(0, 1))
    if (roll < 0.82) return qGap(d, rng)
    return qNatural(d, rng)
  }
  if (d === 2) {
    // 练习二十六 3、4 与做一做的算数
    if (roll < 0.14) return qTempHigher(d, rng)
    if (roll < 0.24) return qTempRange(d, rng)
    if (roll < 0.36) return qTempMonth(d, rng)
    if (roll < 0.5) return qAirDiff(d, rng)
    if (roll < 0.62) return qIncrease(K2, d, rng, AIR, 0)
    if (roll < 0.76) return qGirls(d, rng)
    if (roll < 0.88) return qKidsDiff(d, rng)
    return qBirthGap(d, rng)
  }
  if (roll < 0.3) return qKidsAgain(d, rng)
  if (roll < 0.6) return qBadUp(d, rng)
  return qTempSpan(d, rng)
}
defineGenerator(K2, doubleGen)
