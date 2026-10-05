import type { BarSeries, Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 条形统计图（四上第六单元，课本 p88–101）：两个小节两个知识点。
// 单式条形统计图：例 1 A 市 8 月的天气（1 格代表 1 天）、例 2 最喜欢的图书（1 格代表 2 人、17 人用半格）、做一做 出生月份（1 格 1 人）、
//   做一做 捐书（每格代表 5 本，刻度自己填；四（3）班每格代表 10 本）；练习十八：电视机销售量（1 格 5 台）、上学方式（横向，1 格 2 人）、
//   动物的平均寿命（横向，1 格 5 年 / 10 年两幅）、A 市 9 月的天气（1 格 2 天，有半格）。
// 复式条形统计图：例 3 城乡人口（条顶写数、图例）、做一做 男生女生喜欢的运动项目；练习十九：运动队、两个社区的垃圾分类（横向）、
//   跳绳成绩分段、电话用户、三组的新能源发电量。
// 读图的数都落在格线或半格上（单式图是满格方格纸、条上不写数；复式图条顶写数），不出要估读的题。画图、调查、提建议、预测不出；
// 课本里没有唯一答案的（全校数据 1 格代表几、捐书估算、垃圾一年多少吨）不出，「23 年在哪幅图上表示比较准确」有唯一答案，出。
// 图里的字不注音不朗读（同三年级的统计表），所以题目里说出问的是哪一类。
// ─────────────────────────────────────────────────────────────

const KS = 'm4s1-07-single'
const KD = 'm4s1-07-double'
type P = Record<string, LStr | number>
type Tone = 'blue' | 'pink' | 'green'
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const text = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)
const cat = (id: string): LStr => L(`m4.bar.cat.${id}`)
const ser = (id: string): LStr => L(`m4.bar.ser.${id}`)
const unit = (id: string): LStr => L(`m4.bar.u.${id}`)
const yearL = (y: number): LStr => L('m4.bar.yearOpt', { y })
const monL = (m: number): LStr => L(`m4.bar.mon.${m}`)

/** 最大（或最小）的只有一个时返回它的位置，并列返回 -1 */
export function uniqueExtreme(xs: number[], most: boolean): number {
  const v = most ? Math.max(...xs) : Math.min(...xs)
  return xs.filter((x) => x === v).length === 1 ? xs.indexOf(v) : -1
}
/** 在 [lo, hi] 里取 n 个互不相同的整数（不排序） */
function distinct(rng: RNG, n: number, lo: number, hi: number): number[] {
  return rng.shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, n)
}
/** 干扰项里的别的类别：先放离答案最近的（第二多 / 第二少），再随便补，最多 3 个 */
function otherNames(names: LStr[], values: number[], at: number, rng: RNG): LStr[] {
  const others = names.map((_, i) => i).filter((i) => i !== at)
  const near = [...others].sort((a, b) => Math.abs(values[a]! - values[at]!) - Math.abs(values[b]! - values[at]!))[0]!
  return [near, ...rng.shuffle(others.filter((i) => i !== near))].slice(0, 3).map((i) => names[i]!)
}

// ── 条形统计图部件 ──

interface ChartSpec {
  dir?: 'v' | 'h'
  title?: string
  cats: LStr[]
  series: BarSeries[]
  step: number
  cells: number
  valueAxis: string
  catAxis: string
  grid?: boolean
  numbers?: boolean
  hideScale?: boolean
}
export function chart(s: ChartSpec): StemPart {
  return {
    kind: 'bar-chart',
    ...(s.dir === 'h' ? { dir: 'h' as const } : {}),
    ...(s.title ? { title: L(`m4.bar.title.${s.title}`) } : {}),
    cats: s.cats,
    series: s.series,
    step: s.step,
    cells: s.cells,
    valueAxis: L(`m4.bar.axis.${s.valueAxis}`),
    catAxis: L(`m4.bar.axis.${s.catAxis}`),
    ...(s.grid ? { grid: true } : {}),
    ...(s.numbers ? { numbers: true } : {}),
    ...(s.hideScale ? { hideScale: true } : {}),
  }
}

// ══ 单式条形统计图 ══

export type SingleId = 'weather' | 'book' | 'donate' | 'month' | 'tv' | 'way' | 'life' | 'sept'
export interface Single {
  id: SingleId
  /** 图上的类别 */
  cats: LStr[]
  /** 句子、选项里的说法（星期图上写缩写、出生月份图上只写 1—12） */
  names: LStr[]
  values: number[]
  step: number
  dir: 'v' | 'h'
  valueAxis: string
  catAxis: string
  title?: string
  /** 句子里的单位（m4.bar.u.*） */
  unit: string
}
/** 方格纸上画几格：最高的一条上面再留一格，刻度从 0 开始 */
const cellsOf = (values: number[], step: number): number => Math.floor(Math.max(...values) / step) + 1
export function singleChart(s: Single, opts: { missing?: number; hideScale?: boolean } = {}): StemPart {
  return chart({
    dir: s.dir,
    title: s.title,
    cats: s.cats,
    series: [{ values: s.values.map((v, i) => (i === opts.missing ? null : v)) }],
    step: s.step,
    cells: cellsOf(s.values, s.step),
    valueAxis: s.valueAxis,
    catAxis: s.catAxis,
    grid: true,
    hideScale: opts.hideScale,
  })
}
const singleSig = (s: Single): string => `${s.id}-${s.step}-${s.values.join('.')}`
/** 题目词条前缀：9 月的天气和例 1 共用天气的问法 */
const base = (s: Single): string => (s.id === 'sept' ? 'weather' : s.id)

const WEATHER = ['sunny', 'overcast', 'cloudy', 'shower', 'storm']
/** 课本例 1 的数：A 市 8 月晴 9、阴 6、多云 9、阵雨 5、雷阵雨 2 天（晴和多云并列最多，不拿来问「最多」） */
export const WEATHER_AUG = [9, 6, 9, 5, 2]
/**
 * 例 1：一个月（30 或 31 天）五种天气；恰好有两种天数一样（课本：晴、多云都是 9 天），最多、最少都只有一个。
 * textbook = 可以用课本的数（三成）
 */
function weatherData(rng: RNG, textbook = false): Single {
  const make = (vs: number[]): Single => {
    const cats = WEATHER.map(cat)
    return { id: 'weather', cats, names: cats, values: vs, step: 1, dir: 'v', valueAxis: 'days', catAxis: 'weather', unit: 'day' }
  }
  if (textbook && rng.chance(0.3)) return make(WEATHER_AUG)
  for (;;) {
    const total = rng.pick([30, 31])
    const vs = [rng.int(3, 10), rng.int(2, 9), rng.int(2, 10), rng.int(1, 7), rng.int(1, 5)]
    if (sum(vs) !== total) continue
    const counts = new Map<number, number>()
    for (const v of vs) counts.set(v, (counts.get(v) ?? 0) + 1)
    const reps = [...counts.values()]
    if (reps.filter((c) => c === 2).length !== 1 || reps.some((c) => c > 2)) continue
    if (uniqueExtreme(vs, true) < 0 || uniqueExtreme(vs, false) < 0) continue
    return make(vs)
  }
}
const BOOKS = ['history', 'literature', 'art', 'science']
/** 例 2：四类图书，人数 8–32 的偶数（1 格代表 2 人，课本历史类 12、文学类 28、艺术类 16、科学类 32）；odd = 其中一类是单数（画半格） */
export const BOOK_DATA = [12, 28, 16, 32]
function bookData(rng: RNG, odd = false): Single {
  for (;;) {
    const vs = !odd && rng.chance(0.25) ? [...BOOK_DATA] : distinct(rng, 4, 4, 16).map((k) => k * 2)
    if (odd) {
      const i = rng.int(0, 3)
      vs[i] = vs[i]! + rng.pick([-1, 1])
    }
    if (new Set(vs).size < 4) continue
    const cats = BOOKS.map(cat)
    return { id: 'book', cats, names: cats, values: vs, step: 2, dir: 'v', valueAxis: 'people', catAxis: 'bookType', unit: 'people' }
  }
}
const GROUPS = ['g1', 'g2', 'g3', 'g4', 'g5']
/** 做一做：五个小组捐书；step 5（四（2）班，课本 40、30、25、35、45）或 10（四（3）班，课本 20、30、50、40、30） */
export const DONATE_2 = [40, 30, 25, 35, 45]
export const DONATE_3 = [20, 30, 50, 40, 30]
function donateData(rng: RNG, step: 5 | 10): Single {
  const textbook = rng.chance(0.25)
  const vs = step === 5 ? (textbook ? DONATE_2 : distinct(rng, 5, 3, 9).map((k) => k * 5)) : textbook ? DONATE_3 : distinct(rng, 5, 1, 6).map((k) => k * 10)
  const cats = GROUPS.map(cat)
  return { id: 'donate', cats, names: cats, values: vs, step, dir: 'v', valueAxis: 'amountBook', catAxis: 'group', title: step === 5 ? 'donate2' : 'donate3', unit: 'book' }
}
/** 做一做：本班同学出生的月份（每月 0–7 人，最多、最少的月份都只有一个，一班 24–50 人） */
function monthData(rng: RNG): Single {
  for (;;) {
    const [hi, lo] = distinct(rng, 2, 0, 11) as [number, number]
    const top = rng.int(5, 7)
    const bottom = rng.int(0, 1)
    const vs = Array.from({ length: 12 }, (_, i) => (i === hi ? top : i === lo ? bottom : rng.int(bottom + 1, top - 1)))
    if (sum(vs) < 24 || sum(vs) > 50) continue
    return {
      id: 'month',
      cats: vs.map((_, i) => String(i + 1)),
      names: vs.map((_, i) => monL(i + 1)),
      values: vs,
      step: 1,
      dir: 'v',
      valueAxis: 'people',
      catAxis: 'month',
      unit: 'people',
    }
  }
}
const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
/** 练习十八 3：一星期电视机的销售量（课本 15、10、20、25、30、50、45 台，周末卖得多），1 格代表 5 台 */
export const TV_SALES = [15, 10, 20, 25, 30, 50, 45]
function tvData(rng: RNG): Single {
  for (;;) {
    const vs = rng.chance(0.25) ? TV_SALES : WEEK.map((w) => (w === 'sat' || w === 'sun' ? rng.int(7, 10) : rng.int(2, 7)) * 5)
    if (uniqueExtreme(vs, true) < 0 || uniqueExtreme(vs, false) < 0) continue
    return {
      id: 'tv',
      cats: WEEK.map((w) => cat(`wd.${w}`)),
      names: WEEK.map((w) => L(`m4.bar.day.${w}`)),
      values: vs,
      step: 5,
      dir: 'v',
      valueAxis: 'sales',
      catAxis: 'time',
      unit: 'tv',
    }
  }
}
/** 练习十八 2：上学方式（横向，1 格代表 2 人）；横向图第一类画在最下面，所以按自己上学、大人接送、校车接送排（课本从上往下是校车接送……） */
function wayData(rng: RNG): Single {
  const vs = distinct(rng, 3, 2, 11).map((k) => k * 2)
  const cats = ['self', 'parent', 'bus'].map(cat)
  return { id: 'way', cats, names: cats, values: vs, step: 2, dir: 'h', valueAxis: 'people', catAxis: 'way', unit: 'people' }
}
/** 练习十八 4：动物的平均寿命（课本狗 10、长颈鹿 25、大象 75、河马 40 年；长颈鹿换成斑马），横向，1 格代表 5 年或 10 年 */
export const LIFE = [10, 25, 75, 40]
function lifeData(step: 5 | 10): Single {
  const cats = ['dog', 'zebra', 'elephant', 'hippo'].map(cat)
  return { id: 'life', cats, names: cats, values: LIFE, step, dir: 'h', valueAxis: 'life', catAxis: 'animal', unit: 'year' }
}
/** 练习十八 5：A 市 9 月的天气（课本 9 月晴 18、阴 4、多云 3、雨 5 天；8 月晴 9、阴 6、多云 9、雨 7 天），1 格代表 2 天，单数画半格 */
export const SEPT = [18, 4, 3, 5]
export const AUG = [9, 6, 9, 7]
function septData(rng: RNG): { s: Single; aug: number[] } {
  const cats = ['sunny', 'overcast', 'cloudy', 'rain'].map(cat)
  const make = (vs: number[]): Single => ({ id: 'sept', cats, names: cats, values: vs, step: 2, dir: 'v', valueAxis: 'days', catAxis: 'weather', title: 'sept', unit: 'day' })
  if (rng.chance(0.35)) return { s: make(SEPT), aug: AUG }
  for (;;) {
    const vs = [rng.int(8, 18), rng.int(2, 9), rng.int(2, 9)]
    vs.push(30 - sum(vs))
    const aug = [rng.int(5, 12), rng.int(3, 9), rng.int(4, 10)]
    aug.push(31 - sum(aug))
    if (vs[3]! < 1 || aug[3]! < 2) continue
    if (vs.every((v) => v % 2 === 0)) continue
    if (uniqueExtreme(vs, true) < 0 || uniqueExtreme(vs, false) < 0) continue
    return { s: make(vs), aug }
  }
}

/** 一条的数（例 1「天气是晴的有几天」，例 2、捐书、电视机……）：常错成格数、差一格、看错一条 */
function qCount(d: Difficulty, rng: RNG, s: Single, at: number, tag = 'count'): Question {
  const v = s.values[at]!
  const params: P = s.id === 'month' ? { m: at + 1, mon: s.names[at]! } : { x: s.names[at]! }
  const cells = v / s.step
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `${tag}-${singleSig(s)}-${at}`,
    stem: [text(`m4.bar.${base(s)}.count`, params), singleChart(s)],
    value: v,
    rng,
    min: 0,
    max: Math.max(99, v * 2),
    smart: [...(Number.isInteger(cells) && cells !== v ? [cells] : []), v + s.step, v - s.step, ...(s.step === 2 ? [v + 1, v - 1] : []), ...s.values.filter((x) => x !== v)],
  })
}
/** 哪一类最多 / 最少（最多、最少只有一个才问） */
function qMost(d: Difficulty, rng: RNG, s: Single, most: boolean): Question | null {
  const at = uniqueExtreme(s.values, most)
  if (at < 0) return null
  return labelQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `${most ? 'most' : 'least'}-${singleSig(s)}`,
    stem: [text(`m4.bar.${base(s)}.${most ? 'most' : 'least'}`), singleChart(s)],
    correct: s.names[at]!,
    distractors: otherNames(s.names, s.values, at, rng),
    rng,
  })
}
/** 两类相差多少（「晴的天数比阴的多几天」）：常错成两数的和、差一格 */
function qDiff(d: Difficulty, rng: RNG, s: Single): Question {
  const idx = s.values.map((_, i) => i)
  let i = 0
  let j = 0
  do [i, j] = rng.shuffle(idx).slice(0, 2) as [number, number]
  while (s.values[i] === s.values[j])
  const [a, b] = s.values[i]! > s.values[j]! ? [i, j] : [j, i]
  const v = s.values[a]! - s.values[b]!
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `diff-${singleSig(s)}-${a}-${b}`,
    stem: [text(`m4.bar.${base(s)}.diff`, { a: s.names[a]!, b: s.names[b]! }), singleChart(s)],
    value: v,
    rng,
    min: 0,
    max: 199,
    smart: [s.values[a]! + s.values[b]!, v + s.step, v - s.step, v / s.step].filter((x) => Number.isInteger(x)),
  })
}
/** 一共多少（出生月份「参加统计的同学一共有多少人」、捐书、电视机一星期） */
function qTotal(d: Difficulty, rng: RNG, s: Single): Question {
  const v = sum(s.values)
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `total-${singleSig(s)}`,
    stem: [text(`m4.bar.${base(s)}.total`), singleChart(s)],
    value: v,
    rng,
    min: 0,
    max: v * 2 + 50,
    smart: [v - s.values[s.values.length - 1]!, v + s.step, v - s.step, v + 10, v - 10],
  })
}
/** 例 1：哪两种天气的天数同样多（课本晴和多云都是 9 天） */
function qSame(d: Difficulty, rng: RNG, s: Single): Question {
  const idx = s.values.map((_, i) => i)
  const pairs = idx.flatMap((i) => idx.filter((j) => j > i).map((j) => [i, j] as [number, number]))
  const tie = pairs.find(([i, j]) => s.values[i] === s.values[j])!
  const pair = ([i, j]: [number, number]): LStr => L('m4.bar.pair', { a: s.names[i]!, b: s.names[j]! })
  // 干扰项先放差一点点的两种（看错一格）
  const others = pairs.filter((p) => p !== tie).sort((p, q) => Math.abs(s.values[p[0]]! - s.values[p[1]]!) - Math.abs(s.values[q[0]]! - s.values[q[1]]!))
  const wrongs = [others[0]!, ...rng.shuffle(others.slice(1)).slice(0, 2)]
  return labelQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `same-${singleSig(s)}`,
    stem: [text('m4.bar.weather.same'), singleChart(s)],
    correct: pair(tie),
    distractors: wrongs.map(pair),
    rng,
  })
}
/** 天数最多的天气比最少的多几天（先找出最多、最少，再相减） */
function qRange(d: Difficulty, rng: RNG, s: Single): Question {
  const v = Math.max(...s.values) - Math.min(...s.values)
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `range-${singleSig(s)}`,
    stem: [text('m4.bar.weather.range'), singleChart(s)],
    value: v,
    rng,
    min: 0,
    max: 99,
    smart: [Math.max(...s.values) + Math.min(...s.values), v + 1, v - 1, Math.max(...s.values)],
  })
}
/** 「这幅图里，1 格代表几人」（练习十八 4「每格代表（ ）年」）：常错成 1、看成隔一条格线的数 */
function qStep(d: Difficulty, rng: RNG, s: Single): Question {
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `step-${singleSig(s)}`,
    stem: [text('m4.bar.stepAsk', { u: unit(s.unit) }), singleChart(s)],
    value: s.step,
    rng,
    min: 1,
    max: 50,
    smart: [1, 2, 5, 10, s.step * 2].filter((x) => x !== s.step),
  })
}
/** 例 2「可以用半格代表（ ）人」：1 格代表 2 人，半格就是 1 人（1 格代表 10 本，半格 5 本） */
function qHalf(d: Difficulty, rng: RNG, s: Single): Question {
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `half-${singleSig(s)}`,
    stem: [text('m4.bar.halfAsk', { s: s.step, u: unit(s.unit) }), singleChart(s)],
    value: s.step / 2,
    rng,
    min: 1,
    max: 50,
    smart: [s.step, s.step * 2, s.step / 2 + 1],
  })
}
/**
 * 按统计表画：这一条要画几格（例 2「最喜欢艺术类图书的有 17 人，在上图中怎样表示」、捐书做一做）。图上这一条还空着（「?」）。
 * 格数是整数用数字键盘 / 数字选项；带半格的用选项「8 格半」，干扰项两个带「半」两个不带（不让人从格式上认出答案）
 */
function qCellsFor(d: Difficulty, rng: RNG, s: Single, at: number): Question {
  const v = s.values[at]!
  const key = s.id === 'book' ? 'm4.bar.book.cellsFor' : 'm4.bar.donate.cellsFor'
  const stem = [text(key, { x: s.names[at]!, v }), singleChart(s, { missing: at })]
  const sig = `cells-${singleSig(s)}-${at}`
  const n = v / s.step
  if (Number.isInteger(n)) {
    return numberQuestion({ kpId: KS, type: 'stat', difficulty: d, sig, stem, value: n, rng, min: 1, max: 99, smart: [v, n + 1, n - 1, n * 2] })
  }
  const k = Math.floor(n)
  const cells = (x: number): LStr => L('m4.bar.cells', { n: x })
  const half = (x: number): LStr => L('m4.bar.cellsHalf', { n: x })
  return labelQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig,
    stem,
    correct: half(k),
    // 常错：舍掉半格、多画半格、忘了 1 格代表 2（17 人画 17 格）
    distractors: [cells(k), half(k + 1), cells(v)],
    rng,
  })
}
/** 捐书做一做：刻度上的数没写，「一组捐了 40 本，这一条画了 8 格，每格代表几本」 */
function qStepHidden(d: Difficulty, rng: RNG, s: Single): Question {
  const at = rng.int(0, s.values.length - 1)
  const v = s.values[at]!
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `hidden-${singleSig(s)}-${at}`,
    stem: [text('m4.bar.donate.stepAsk', { x: s.names[at]!, v, n: v / s.step }), singleChart(s, { hideScale: true })],
    value: s.step,
    rng,
    min: 1,
    max: 99,
    smart: [v / s.step, 1, 10, 2, s.step * 2].filter((x) => x !== s.step),
  })
}
/** 练习十八 4 (4)：平均寿命 23 年，在 1 格代表 5 年和 1 格代表 10 年的哪幅图上表示比较准确（不是 5 的倍数的，前一幅准） */
function qWhich(d: Difficulty, rng: RNG): Question {
  let v = 0
  do v = rng.int(11, 69)
  while (v % 5 === 0)
  const chartL = (s: number): LStr => L('m4.bar.life.chart', { s })
  return labelQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `which-${v}`,
    stem: [text('m4.bar.life.which', { v })],
    correct: chartL(5),
    distractors: [chartL(10)],
    rng,
  })
}
/** 练习十八 5：8 月的天数在文字里，9 月的在图上，9 月比 8 月多（少）几天 */
function qSept(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const { s, aug } = septData(rng)
    const at = rng.int(0, 3)
    const v9 = s.values[at]!
    const v8 = aug[at]!
    if (v9 === v8) continue
    const v = Math.abs(v9 - v8)
    return numberQuestion({
      kpId: KS,
      type: 'stat',
      difficulty: d,
      sig: `sept-${singleSig(s)}-${at}-${v8}`,
      stem: [text(v9 > v8 ? 'm4.bar.sept.more' : 'm4.bar.sept.fewer', { x: s.names[at]!, a: v8 }), singleChart(s)],
      value: v,
      rng,
      min: 0,
      max: 99,
      smart: [v9 + v8, v + 1, v - 1, v9 / 2].filter((x) => Number.isInteger(x)),
    })
  }
}

function single(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const sub = rng.next()
  if (d === 1) {
    if (roll < 0.34) {
      // 例 1：天气（1 格代表 1 天）；课本的数晴、多云并列最多，问「最多」时不用
      const s = weatherData(rng, sub < 0.3 || sub >= 0.5)
      if (sub < 0.3) return qCount(d, rng, s, rng.int(0, 4))
      if (sub < 0.5) return qMost(d, rng, s, true)!
      if (sub < 0.62) return qMost(d, rng, s, false)!
      if (sub < 0.8) return qSame(d, rng, s)
      return qDiff(d, rng, s)
    }
    if (roll < 0.6) {
      // 例 2：图书（1 格代表 2 人、半格）
      if (sub < 0.3) return qCellsFor(d, rng, bookData(rng), rng.int(0, 3)) // 偶数：整格
      if (sub < 0.45) {
        // 课本 (2)：17 人这种单数用半格
        const s = bookData(rng, true)
        return qCellsFor(d, rng, s, s.values.findIndex((v) => v % 2 === 1))
      }
      const s = bookData(rng)
      if (sub < 0.62) return qCount(d, rng, s, rng.int(0, 3))
      if (sub < 0.77) return qMost(d, rng, s, rng.chance(0.75))!
      if (sub < 0.89) return qStep(d, rng, s)
      return qHalf(d, rng, s)
    }
    if (roll < 0.84) {
      // 做一做：捐书（每格代表 5 本，刻度自己推；四（3）班每格代表 10 本）
      if (sub < 0.3) return qStepHidden(d, rng, donateData(rng, 5))
      const s = donateData(rng, rng.chance(0.65) ? 5 : 10)
      if (sub < 0.5) return qCount(d, rng, s, rng.int(0, 4))
      if (sub < 0.65) return qMost(d, rng, s, rng.chance(0.6))!
      if (sub < 0.88) return qCellsFor(d, rng, s, rng.int(0, 4))
      return qHalf(d, rng, donateData(rng, 10))
    }
    // 做一做：出生月份（1 格代表 1 人，十二个月）
    const s = monthData(rng)
    if (sub < 0.35) return qCount(d, rng, s, rng.int(0, 11))
    if (sub < 0.6) return qMost(d, rng, s, true)!
    if (sub < 0.75) return qMost(d, rng, s, false)!
    return qTotal(d, rng, s)
  }
  if (d === 2) {
    if (roll < 0.22) {
      // 练习十八 3：电视机（1 格代表 5 台）
      const s = tvData(rng)
      if (sub < 0.35) return qMost(d, rng, s, rng.chance(0.5))!
      if (sub < 0.6) return qCount(d, rng, s, rng.int(0, 6))
      if (sub < 0.85) return qDiff(d, rng, s)
      return qTotal(d, rng, s)
    }
    if (roll < 0.4) {
      // 练习十八 2：上学方式（横向，1 格代表 2 人）
      const s = wayData(rng)
      if (sub < 0.45) return qMost(d, rng, s, rng.chance(0.65))!
      if (sub < 0.85) return qCount(d, rng, s, rng.int(0, 2))
      return qStep(d, rng, s)
    }
    if (roll < 0.65) {
      // 练习十八 4：动物的平均寿命（横向，1 格代表 5 年或 10 年；10 年的那幅 25、75 画半格）
      const s = lifeData(rng.chance(0.5) ? 5 : 10)
      if (sub < 0.3) return qCount(d, rng, s, rng.int(0, 3))
      if (sub < 0.55) return qMost(d, rng, s, rng.chance(0.5))!
      if (sub < 0.75) return qStep(d, rng, s)
      return qWhich(d, rng)
    }
    if (roll < 0.85) {
      // 练习十八 5：9 月的天气（1 格代表 2 天，单数画半格）
      const { s } = septData(rng)
      if (sub < 0.55) return qCount(d, rng, s, rng.int(0, 3))
      if (sub < 0.75) return qMost(d, rng, s, rng.chance(0.6))!
      return qStep(d, rng, s)
    }
    // 两类相差多少、一共多少（捐书、例 2）
    if (sub < 0.5) return qDiff(d, rng, donateData(rng, rng.chance(0.5) ? 5 : 10))
    if (sub < 0.75) return qTotal(d, rng, donateData(rng, rng.chance(0.5) ? 5 : 10))
    return qDiff(d, rng, bookData(rng))
  }
  // 第 3 档：两步的（最多比最少多几天、两张图对比、周末两天一共）、半格的读数
  if (roll < 0.25) return qRange(d, rng, weatherData(rng))
  if (roll < 0.45) return qSept(d, rng)
  if (roll < 0.65) {
    const s = tvData(rng)
    if (rng.chance(0.5)) return qTotal(d, rng, s)
    const v = s.values[5]! + s.values[6]!
    return numberQuestion({
      kpId: KS,
      type: 'stat',
      difficulty: d,
      sig: `weekend-${singleSig(s)}`,
      stem: [text('m4.bar.tv.weekend'), singleChart(s)],
      value: v,
      rng,
      min: 0,
      max: 199,
      smart: [Math.abs(s.values[5]! - s.values[6]!), v + 5, v - 5, v / 5],
    })
  }
  if (roll < 0.82) {
    const s = bookData(rng, true)
    return qCount(d, rng, s, s.values.findIndex((v) => v % 2 === 1), 'odd')
  }
  return qTotal(d, rng, donateData(rng, rng.chance(0.5) ? 5 : 10))
}
defineGenerator(KS, single)

// ══ 复式条形统计图 ══

export type DoubleId = 'pop' | 'sport' | 'team' | 'trash' | 'rope' | 'phone' | 'power'
export interface Double {
  id: DoubleId
  cats: LStr[]
  names: LStr[]
  series: { id: string; tone: Tone; values: number[] }[]
  step: number
  cells: number
  dir: 'v' | 'h'
  valueAxis: string
  catAxis: string
  title?: string
}
export function doubleChart(s: Double): StemPart {
  return chart({
    dir: s.dir,
    title: s.title,
    cats: s.cats,
    series: s.series.map((x) => ({ name: ser(x.id), tone: x.tone, values: x.values })),
    step: s.step,
    cells: s.cells,
    valueAxis: s.valueAxis,
    catAxis: s.catAxis,
    numbers: true,
  })
}
const doubleSig = (s: Double): string => `${s.id}-${s.series.map((x) => x.values.join('.')).join('|')}`
const totals = (s: Double): number[] => s.cats.map((_, i) => sum(s.series.map((x) => x.values[i]!)))

/** 例 3：某地区城乡人口（课本：城镇 21、27、35、46、59，农村 58、54、49、43、34 万人），城镇逐年增加、农村逐年减少 */
export const POP_YEARS = [1980, 1990, 2000, 2010, 2020]
export const POP_TOWN = [21, 27, 35, 46, 59]
export const POP_RURAL = [58, 54, 49, 43, 34]
function popData(rng: RNG): Double {
  const make = (town: number[], rural: number[]): Double => ({
    id: 'pop',
    cats: POP_YEARS.map(String),
    names: POP_YEARS.map(yearL),
    series: [
      { id: 'town', tone: 'pink', values: town },
      { id: 'rural', tone: 'blue', values: rural },
    ],
    step: 10,
    cells: 6,
    dir: 'v',
    valueAxis: 'pop',
    catAxis: 'year',
    title: 'pop',
  })
  if (rng.chance(0.3)) return make(POP_TOWN, POP_RURAL)
  for (;;) {
    const town = [rng.int(12, 26)]
    const rural = [rng.int(45, 59)]
    for (let i = 1; i < 5; i++) {
      town.push(town[i - 1]! + rng.int(3, 12))
      rural.push(rural[i - 1]! - rng.int(2, 9))
    }
    if (town[4]! > 59 || rural[4]! < 8) continue
    const gaps = town.map((x, i) => Math.abs(x - rural[i]!))
    if (gaps.includes(0) || uniqueExtreme(gaps, true) < 0 || uniqueExtreme(gaps, false) < 0) continue
    return make(town, rural)
  }
}
/** 做一做：男生、女生喜欢的运动项目（课本男 17、18、8、14、7，女 13、4、6、13、16），1 格代表 5 人 */
const SPORTS = ['pingpong', 'soccer', 'run', 'swim', 'rope']
export const SPORT_BOYS = [17, 18, 8, 14, 7]
export const SPORT_GIRLS = [13, 4, 6, 13, 16]
function sportData(rng: RNG): Double {
  for (;;) {
    const textbook = rng.chance(0.25)
    const boys = textbook ? SPORT_BOYS : SPORTS.map(() => rng.int(2, 19))
    const girls = textbook ? SPORT_GIRLS : SPORTS.map(() => rng.int(2, 19))
    const all = boys.map((b, i) => b + girls[i]!)
    if (![boys, girls, all].every((xs) => uniqueExtreme(xs, true) >= 0 && uniqueExtreme(xs, false) >= 0)) continue
    const cats = SPORTS.map(cat)
    return {
      id: 'sport',
      cats,
      names: cats,
      series: [
        { id: 'boys', tone: 'blue', values: boys },
        { id: 'girls', tone: 'pink', values: girls },
      ],
      step: 5,
      cells: Math.floor(Math.max(...boys, ...girls) / 5) + 1,
      dir: 'v',
      valueAxis: 'people',
      catAxis: 'item',
      title: 'sport',
    }
  }
}
/** 练习十九 1：体育运动队（课本男 20、24、18、22，女 15、8、26、25） */
const TEAMS = ['basketballTeam', 'soccerTeam', 'skateTeam', 'pingpongTeam']
function teamData(rng: RNG): Double {
  for (;;) {
    const textbook = rng.chance(0.25)
    const boys = textbook ? [20, 24, 18, 22] : TEAMS.map(() => rng.int(6, 29))
    const girls = textbook ? [15, 8, 26, 25] : TEAMS.map(() => rng.int(6, 29))
    if (![boys, girls, boys.map((b, i) => b + girls[i]!)].every((xs) => uniqueExtreme(xs, true) >= 0)) continue
    const cats = TEAMS.map(cat)
    return {
      id: 'team',
      cats,
      names: cats,
      series: [
        { id: 'boys', tone: 'blue', values: boys },
        { id: 'girls', tone: 'pink', values: girls },
      ],
      step: 5,
      cells: Math.floor(Math.max(...boys, ...girls) / 5) + 1,
      dir: 'v',
      valueAxis: 'people',
      catAxis: 'team',
      title: 'team',
    }
  }
}
/** 练习十九 2：两个社区某月的垃圾分类（课本 A 24、50、3、70，B 25、61、5、65 吨），横向，1 格代表 10 吨 */
const TRASH = ['recyclable', 'kitchen', 'hazard', 'other']
function trashData(rng: RNG): Double {
  const ranges: [number, number][] = [
    [15, 35],
    [40, 70],
    [2, 9],
    [50, 75],
  ]
  let a = [24, 50, 3, 70]
  let b = [25, 61, 5, 65]
  if (!rng.chance(0.35)) {
    do {
      a = ranges.map(([lo, hi]) => rng.int(lo, hi))
      b = ranges.map(([lo, hi]) => rng.int(lo, hi))
    } while (a.some((x, i) => x === b[i]))
  }
  const cats = TRASH.map(cat)
  return {
    id: 'trash',
    cats,
    names: cats,
    series: [
      { id: 'commA', tone: 'pink', values: a },
      { id: 'commB', tone: 'blue', values: b },
    ],
    step: 10,
    cells: 8,
    dir: 'h',
    valueAxis: 'mass',
    catAxis: 'trash',
    title: 'trash',
  }
}
/** 练习十九 3：一分钟跳绳成绩分段（课本男 2、8、18、14、3，女 1、4、17、8、9），没有图题 */
export const ROPE_BOYS = [2, 8, 18, 14, 3]
export const ROPE_GIRLS = [1, 4, 17, 8, 9]
/** 各段的下限、上限（图上写「100及以下」「101~120」……「161及以上」） */
export const ROPE_SEGS: [number, number | null][] = [
  [0, 100],
  [101, 120],
  [121, 140],
  [141, 160],
  [161, null],
]
function ropeData(rng: RNG): Double {
  const textbook = rng.chance(0.35)
  const gen = (): number[] => [rng.int(0, 4), rng.int(3, 10), rng.int(10, 19), rng.int(5, 16), rng.int(2, 12)]
  const boys = textbook ? ROPE_BOYS : gen()
  const girls = textbook ? ROPE_GIRLS : gen()
  return {
    id: 'rope',
    cats: [L('m4.bar.seg.max', { a: 100 }), '101~120', '121~140', '141~160', L('m4.bar.seg.min', { a: 161 })],
    names: ROPE_SEGS.map(segSay),
    series: [
      { id: 'boys', tone: 'blue', values: boys },
      { id: 'girls', tone: 'pink', values: girls },
    ],
    step: 5,
    cells: 4,
    dir: 'v',
    valueAxis: 'people',
    catAxis: 'score',
  }
}
function segSay([lo, hi]: [number, number | null]): LStr {
  if (lo === 0) return L('m4.bar.seg.maxSay', { a: hi! })
  if (hi === null) return L('m4.bar.seg.minSay', { a: lo })
  return L('m4.bar.seg.rangeSay', { a: lo, b: hi })
}
/** 练习十九 4：我国 2018—2023 年电话用户数（万户，课本的数） */
export const PHONE_YEARS = [2018, 2019, 2020, 2021, 2022, 2023]
export const PHONE_FIXED = [19209, 19103, 18191, 18070, 17941, 17333]
export const PHONE_MOBILE = [156610, 160135, 159407, 164283, 168344, 174358]
const PHONE: Double = {
  id: 'phone',
  cats: PHONE_YEARS.map(String),
  names: PHONE_YEARS.map(yearL),
  series: [
    { id: 'fixed', tone: 'pink', values: PHONE_FIXED },
    { id: 'mobile', tone: 'blue', values: PHONE_MOBILE },
  ],
  step: 25000,
  cells: 8,
  dir: 'v',
  valueAxis: 'users',
  catAxis: 'year',
}
/** 练习十九 5：我国 2025 年 9—12 月新能源发电量（亿千瓦时，课本的数），三组 */
export const POWER: Double = {
  id: 'power',
  cats: [9, 10, 11, 12].map(monL),
  names: [9, 10, 11, 12].map(monL),
  series: [
    { id: 'nuclear', tone: 'pink', values: [362, 387, 398, 446] },
    { id: 'wind', tone: 'blue', values: [672, 733, 1046, 1041] },
    { id: 'solar', tone: 'green', values: [465, 394, 412, 422] },
  ],
  step: 100,
  cells: 11,
  dir: 'v',
  valueAxis: 'power',
  catAxis: 'monthOnly',
  title: 'power',
}

/** 某一组哪一类最多 / 最少（「哪一年城镇人口最多」「喜欢哪个项目的男生最多」「几月风力发电最多」） */
function qSerMost(d: Difficulty, rng: RNG, s: Double, j: number, most: boolean): Question | null {
  const vs = s.series[j]!.values
  const at = uniqueExtreme(vs, most)
  if (at < 0) return null
  const m = most ? 'most' : 'least'
  const key: Record<DoubleId, string> = {
    pop: `m4.bar.pop.${m}`,
    sport: `m4.bar.sport.${m}`,
    team: 'm4.bar.team.most',
    trash: '',
    rope: '',
    phone: `m4.bar.phone.${m}`,
    power: `m4.bar.power.${m}`,
  }
  const param: P = s.id === 'pop' || s.id === 'sport' || s.id === 'team' ? { g: ser(s.series[j]!.id) } : { x: ser(s.series[j]!.id) }
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `ser-${m}-${doubleSig(s)}-${j}`,
    stem: [text(key[s.id], param), doubleChart(s)],
    correct: s.names[at]!,
    distractors: otherNames(s.names, vs, at, rng),
    rng,
  })
}
/** 两组合起来哪一类最多 / 最少（做一做「喜欢哪个项目的人数最多」：男生、女生要加起来） */
function qAllMost(d: Difficulty, rng: RNG, s: Double, most: boolean): Question {
  const all = totals(s)
  const at = uniqueExtreme(all, most)
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `all-${most ? 'most' : 'least'}-${doubleSig(s)}`,
    stem: [text(most ? 'm4.bar.sport.allMost' : 'm4.bar.sport.allLeast'), doubleChart(s)],
    correct: s.names[at]!,
    distractors: allWrongs(s, all, at, most, rng),
    rng,
  })
}
/** 两组合起来最多的干扰项：常错成只看了一组（男生最多的那项、女生最多的那项），再随便补 */
function allWrongs(s: Double, all: number[], at: number, most: boolean, rng: RNG): LStr[] {
  const first = [uniqueExtreme(s.series[0]!.values, most), uniqueExtreme(s.series[1]!.values, most)].filter((i) => i >= 0 && i !== at)
  const picked = [...new Set(first)]
  for (const i of rng.shuffle(all.map((_, k) => k))) if (i !== at && !picked.includes(i)) picked.push(i)
  return picked.slice(0, 3).map((i) => s.names[i]!)
}
/** 例 3：哪一年城乡人口数相差最大 / 最小 */
function qGap(d: Difficulty, rng: RNG, s: Double, most: boolean): Question {
  const gaps = s.cats.map((_, i) => Math.abs(s.series[0]!.values[i]! - s.series[1]!.values[i]!))
  const at = uniqueExtreme(gaps, most)
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `gap-${most ? 'most' : 'least'}-${doubleSig(s)}`,
    stem: [text(most ? 'm4.bar.pop.gapMost' : 'm4.bar.pop.gapLeast'), doubleChart(s)],
    correct: s.names[at]!,
    distractors: otherNames(s.names, gaps, at, rng),
    rng,
  })
}
/** 同一类两组相差多少（「2000 年农村人口比城镇人口多多少万人」「喜欢跳绳的女生比男生多几人」） */
function qPairDiff(d: Difficulty, rng: RNG, s: Double, i: number): Question {
  const v0 = s.series[0]!.values[i]!
  const v1 = s.series[1]!.values[i]!
  const [a, b] = v0 > v1 ? [0, 1] : [1, 0]
  const v = Math.abs(v0 - v1)
  const A = ser(s.series[a]!.id)
  const B = ser(s.series[b]!.id)
  const stem: Record<string, StemPart> = {
    pop: text('m4.bar.pop.diff', { y: POP_YEARS[i]!, a: A, b: B }),
    sport: text('m4.bar.sport.diff', { x: s.names[i]!, a: A, b: B }),
    team: text('m4.bar.team.diff', { x: s.names[i]!, a: A, b: B }),
    trash: text('m4.bar.trash.diff', { x: s.names[i]!, a: A, b: B }),
  }
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `pdiff-${doubleSig(s)}-${i}`,
    stem: [stem[s.id]!, doubleChart(s)],
    value: v,
    rng,
    min: 0,
    max: 199,
    smart: [v0 + v1, v + 1, v - 1, v + 10, v - 10],
  })
}
/** 同一类两组一共多少（「2000 年城镇和农村一共有多少万人」「喜欢跳绳的一共有多少人」） */
function qPairSum(d: Difficulty, rng: RNG, s: Double, i: number): Question {
  const v0 = s.series[0]!.values[i]!
  const v1 = s.series[1]!.values[i]!
  const v = v0 + v1
  const stem: Record<string, StemPart> = {
    pop: text('m4.bar.pop.sum', { y: POP_YEARS[i]! }),
    sport: text('m4.bar.sport.sum', { x: s.names[i]! }),
    team: text('m4.bar.team.sum', { x: s.names[i]! }),
  }
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `psum-${doubleSig(s)}-${i}`,
    stem: [stem[s.id]!, doubleChart(s)],
    value: v,
    rng,
    min: 0,
    max: 199,
    smart: [Math.abs(v0 - v1), v + 1, v - 1, v + 10, v - 10],
  })
}
/** 读一条（条顶写着数）：「喜欢足球的女生有几人」「阳光社区的厨余垃圾有多少吨」「11 月风力发电多少亿千瓦时」 */
function qCell(d: Difficulty, rng: RNG, s: Double, i: number, j: number): Question {
  const v = s.series[j]!.values[i]!
  const g = ser(s.series[j]!.id)
  const stem: Record<string, StemPart> = {
    sport: text('m4.bar.sport.cell', { x: s.names[i]!, g }),
    team: text('m4.bar.team.cell', { x: s.names[i]!, g }),
    trash: text('m4.bar.trash.cell', { x: s.names[i]!, a: g }),
    rope: text('m4.bar.rope.cell', { seg: s.names[i]!, g }),
    power: text('m4.bar.power.cell', { m: [9, 10, 11, 12][i]!, mon: s.names[i]!, x: g }),
  }
  // 常错：读成另一组的那一条、旁边那一类
  const other = s.series.filter((_, k) => k !== j).map((x) => x.values[i]!)
  const near = [i - 1, i + 1].filter((k) => k >= 0 && k < s.cats.length).map((k) => s.series[j]!.values[k]!)
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `cell-${doubleSig(s)}-${i}-${j}`,
    stem: [stem[s.id]!, doubleChart(s)],
    value: v,
    rng,
    min: 0,
    max: Math.max(199, v * 2),
    smart: [...other, ...near, v + 1, v - 1],
  })
}
/** 看图例：「图中粉色的条表示什么」 */
function qLegend(d: Difficulty, rng: RNG, s: Double): Question {
  const j = rng.int(0, s.series.length - 1)
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `legend-${doubleSig(s)}-${j}`,
    stem: [text('m4.bar.legend', { c: L(`m4.bar.color.${s.series[j]!.tone}`) }), doubleChart(s)],
    correct: ser(s.series[j]!.id),
    distractors: s.series.filter((_, k) => k !== j).map((x) => ser(x.id)),
    rng,
  })
}
/** 练习十九 2：哪个社区产生的某类垃圾更多 */
function qTrashMore(d: Difficulty, rng: RNG, s: Double): Question {
  const i = rng.int(0, 3)
  const [a, b] = [s.series[0]!.values[i]!, s.series[1]!.values[i]!]
  const win = a > b ? 0 : 1
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `more-${doubleSig(s)}-${i}`,
    stem: [text('m4.bar.trash.more', { x: s.names[i]! }), doubleChart(s)],
    correct: ser(s.series[win]!.id),
    distractors: [ser(s.series[1 - win]!.id)],
    rng,
  })
}
/** 练习十九 2 (2)「图中 1 格代表（ ）t」（没有方格，指相邻两个刻度之间） */
function qTrashStep(d: Difficulty, rng: RNG, s: Double): Question {
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `tstep-${doubleSig(s)}`,
    stem: [text('m4.bar.stepAsk', { u: unit('ton') }), doubleChart(s)],
    value: s.step,
    rng,
    min: 1,
    max: 99,
    smart: [1, 5, 20, 2],
  })
}
/** 练习十九 3 (1)：成绩在 121 到 160 次的男生一共有多少人（相邻两段加起来） */
function qRopeSum(d: Difficulty, rng: RNG, s: Double): Question {
  const i = rng.pick([1, 2])
  const j = rng.int(0, 1)
  const vs = s.series[j]!.values
  const v = vs[i]! + vs[i + 1]!
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `rsum-${doubleSig(s)}-${i}-${j}`,
    stem: [text('m4.bar.rope.sum2', { a: ROPE_SEGS[i]![0], b: ROPE_SEGS[i + 1]![1]!, g: ser(s.series[j]!.id) }), doubleChart(s)],
    value: v,
    rng,
    min: 0,
    max: 99,
    smart: [vs[i]!, vs[i + 1]!, v + s.series[1 - j]!.values[i]!, v + 1, v - 1],
  })
}
/** 练习十九 3 (1) 后半：135 次及以上算优秀，135 到 140 次的有 12 人，优秀的一共有几人（12 + 141~160 + 161 及以上） */
function qRopeGood(d: Difficulty, rng: RNG, s: Double): Question {
  const j = rng.int(0, 1)
  const vs = s.series[j]!.values
  const k = rng.int(1, Math.max(1, vs[2]!))
  const v = k + vs[3]! + vs[4]!
  const g = ser(s.series[j]!.id)
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `good-${doubleSig(s)}-${j}-${k}`,
    stem: [text('m4.bar.rope.good', { g, k }), doubleChart(s)],
    value: v,
    rng,
    min: 0,
    max: 99,
    // 常错：把 121~140 那一整段都算上、漏了 161 及以上
    smart: [vs[2]! + vs[3]! + vs[4]!, k + vs[3]!, vs[3]! + vs[4]!, v + 1],
  })
}
/** 练习十九 4：某一年移动电话用户比固定电话用户多多少万户 */
function qPhoneDiff(d: Difficulty, rng: RNG): Question {
  const i = rng.int(0, PHONE_YEARS.length - 1)
  const v = PHONE_MOBILE[i]! - PHONE_FIXED[i]!
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `phone-diff-${i}`,
    stem: [text('m4.bar.phone.diff', { y: PHONE_YEARS[i]! }), doubleChart(PHONE)],
    value: v,
    rng,
    min: 0,
    max: 999999,
    smart: [PHONE_MOBILE[i]! + PHONE_FIXED[i]!, v + 1000, v - 1000, v + 10000],
  })
}
/** 练习十九 5 (2)：9 到 12 月某一种发电一共多少亿千瓦时（四个数连加） */
function qPowerSum(d: Difficulty, rng: RNG): Question {
  const j = rng.int(0, 2)
  const vs = POWER.series[j]!.values
  const v = sum(vs)
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `power-sum-${j}`,
    stem: [text('m4.bar.power.sum', { x: ser(POWER.series[j]!.id) }), doubleChart(POWER)],
    value: v,
    rng,
    min: 0,
    max: 9999,
    smart: [v - vs[3]!, v + 100, v - 100, v + 10],
  })
}
/** 是单式还是复式（例 3「这是复式条形统计图，看看它与单式条形统计图有什么区别」） */
function qKind(d: Difficulty, rng: RNG): Question {
  const isDouble = rng.chance(0.5)
  let part: StemPart
  let scene: string
  if (isDouble) {
    const s = rng.chance(0.5) ? popData(rng) : sportData(rng)
    part = doubleChart(s)
    scene = doubleSig(s)
  } else {
    const s = rng.pick([weatherData, (r: RNG): Single => bookData(r), tvData])(rng)
    part = singleChart(s)
    scene = singleSig(s)
  }
  const askDouble = rng.chance(0.5)
  const yes = isDouble === askDouble
  const sig = `kind-${askDouble ? 'd' : 's'}-${scene}`
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig,
    stem: [text(askDouble ? 'm4.bar.isDouble' : 'm4.bar.isSingle'), part],
    correct: L(yes ? 'm4.bar.yes' : 'm4.bar.no'),
    distractors: [L(yes ? 'm4.bar.no' : 'm4.bar.yes')],
    rng,
  })
}

function double(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const sub = rng.next()
  if (d === 1) {
    if (roll < 0.5) {
      // 例 3：城乡人口（条顶写数、图例：粉色是城镇、蓝色是农村）
      const s = popData(rng)
      if (sub < 0.3) return qSerMost(d, rng, s, rng.int(0, 1), rng.chance(0.55))!
      if (sub < 0.5) return qGap(d, rng, s, rng.chance(0.55))
      if (sub < 0.7) return qPairDiff(d, rng, s, rng.int(0, 4))
      if (sub < 0.82) return qPairSum(d, rng, s, rng.int(0, 4))
      return qLegend(d, rng, s)
    }
    // 做一做：男生、女生喜欢的运动项目（蓝色是男生、粉色是女生）
    const s = sportData(rng)
    if (sub < 0.3) return qSerMost(d, rng, s, rng.int(0, 1), rng.chance(0.55))!
    if (sub < 0.5) return qAllMost(d, rng, s, rng.chance(0.55))
    const cols = s.cats.map((_, i) => i).filter((i) => s.series[0]!.values[i] !== s.series[1]!.values[i])
    if (sub < 0.72 && cols.length) return qPairDiff(d, rng, s, rng.pick(cols))
    if (sub < 0.84) return qPairSum(d, rng, s, rng.int(0, 4))
    if (sub < 0.93) return qCell(d, rng, s, rng.int(0, 4), rng.int(0, 1))
    return qLegend(d, rng, s)
  }
  if (d === 2) {
    if (roll < 0.2) {
      // 练习十九 1：运动队
      const s = teamData(rng)
      if (sub < 0.35) return qSerMost(d, rng, s, rng.int(0, 1), true)!
      const cols = s.cats.map((_, i) => i).filter((i) => s.series[0]!.values[i] !== s.series[1]!.values[i])
      if (sub < 0.75 && cols.length) return qPairDiff(d, rng, s, rng.pick(cols))
      return qCell(d, rng, s, rng.int(0, 3), rng.int(0, 1))
    }
    if (roll < 0.42) {
      // 练习十九 2：两个社区的垃圾分类（横向）
      const s = trashData(rng)
      if (sub < 0.2) return qTrashStep(d, rng, s)
      if (sub < 0.5) return qTrashMore(d, rng, s)
      if (sub < 0.75) return qPairDiff(d, rng, s, rng.int(0, 3))
      return qCell(d, rng, s, rng.int(0, 3), rng.int(0, 1))
    }
    if (roll < 0.6) {
      // 练习十九 3：跳绳成绩分段
      const s = ropeData(rng)
      if (sub < 0.5) return qCell(d, rng, s, rng.int(0, 4), rng.int(0, 1))
      return qRopeSum(d, rng, s)
    }
    if (roll < 0.72) {
      // 练习十九 4：电话用户（哪一年最多 / 最少）
      return qSerMost(d, rng, PHONE, rng.int(0, 1), rng.chance(0.6))!
    }
    if (roll < 0.9) {
      // 练习十九 5：三组的新能源发电量
      if (sub < 0.55) {
        for (;;) {
          const q = qSerMost(d, rng, POWER, rng.int(0, 2), rng.chance(0.6))
          if (q) return q
        }
      }
      return qCell(d, rng, POWER, rng.int(0, 3), rng.int(0, 2))
    }
    return qKind(d, rng)
  }
  // 第 3 档：四个数连加、跳绳的优秀人数、电话用户相差多少、运动队两组合起来最多
  if (roll < 0.3) return qPowerSum(d, rng)
  if (roll < 0.55) return qRopeGood(d, rng, ropeData(rng))
  if (roll < 0.75) return qPhoneDiff(d, rng)
  const s = teamData(rng)
  return qPairSum(d, rng, s, rng.int(0, 3))
}
defineGenerator(KD, double)
