import type { BarSeries, Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 平均数与条形统计图（四下第八单元，课本 p87–96，旧版结构）：两个小节两个知识点（四年级数学下册 D）。
// 平均数：例 1 环保小队 4 人收集空水瓶（14、12、11、15 个，移多补少的图 + (14 + 12 + 11 + 15) ÷ 4 = 13，「13 就是这 4 个数的平均数」）、
//   例 2 踢毽比赛男生队 5 人、女生队 4 人（人数不同，用平均成绩比：17 个、19 个）、做一做 5 名学生捐书（平均 9 本）；
//   练习二十二：一周气温、上学时间、平均数的意义（判断）、两组仰卧起坐（给总数和人数）、身高体重、草莓销量的条形统计图；
//   练习二十三 6*：去掉一个最高分和一个最低分再求平均（选学，只放第 2 档）。课本的平均数都是整数（G14：平均数都整除）。
// 复式条形统计图：例 3 城乡人口（竖着、横着两种画法，图例；最多、最少、相差最大最小的一年）、做一做 男生女生喜欢的运动项目；
//   练习二十三：跳绳成绩分段、人均住房面积（横向，小数）、人均寿命（统计表）、体重分段（横向）、电话用户；总复习的玩具、邮件。
// 画统计图、调查、提问题、说一说不出；数据大多用课本的，自己造的数照课本的样子造（读图的数写在条顶）。
// 图里的字（名字、类别、图例、轴名）不注音、不朗读，所以题目文字里说清问的是谁、哪一类。
// ─────────────────────────────────────────────────────────────

const KA = 'm4s2-08-average'
const KD = 'm4s2-08-double'
type P = Record<string, LStr | number>
type Tone = 'blue' | 'pink' | 'green'
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)
const avgOf = (xs: number[]): number => sum(xs) / xs.length

/** 最大（或最小）的只有一个时返回它的位置，并列返回 -1 */
export function uniqueAt(xs: number[], most: boolean): number {
  const v = most ? Math.max(...xs) : Math.min(...xs)
  return xs.filter((x) => x === v).length === 1 ? xs.indexOf(v) : -1
}
/**
 * n 个整数（lo…hi）的一组数据，平均数是整数、不是每个都一样（课本的平均数都整除）；spread = 最大和最小至少差几
 */
export function evenData(rng: RNG, n: number, lo: number, hi: number, spread = 2): number[] {
  for (;;) {
    const xs = Array.from({ length: n }, () => rng.int(lo, hi))
    if (sum(xs) % n !== 0) continue
    if (Math.max(...xs) - Math.min(...xs) < spread) continue
    return xs
  }
}
/** 平均数题的干扰项：常错成总数、除错了人数（多一个 / 少一个）、最大的数、中间那个数 */
function avgSmart(xs: number[]): number[] {
  const s = sum(xs)
  const out = [s, Math.max(...xs), Math.min(...xs)]
  for (const k of [xs.length - 1, xs.length + 1]) if (s % k === 0) out.push(s / k)
  return out
}
function avgQ(d: Difficulty, rng: RNG, sig: string, stem: StemPart[], xs: number[], numpad = false): Question {
  const v = avgOf(xs)
  return numberQuestion({ kpId: KA, type: 'stat', difficulty: d, sig, stem, value: v, rng, min: 0, max: Math.max(99, sum(xs) + 10), smart: avgSmart(xs), ...(numpad ? { input: 'numpad' as const } : {}) })
}

// ══ 平均数（m4s2-08-average）══

/** 例 1：环保小队 4 人（小红、小兰、小亮、小明）收集的空水瓶，课本 14、12、11、15 个 */
export const BOTTLES = [14, 12, 11, 15]
const WHO = ['hong', 'lan', 'liang', 'ming']
const who = (i: number): LStr => L(`m4.avg.who.${WHO[i]}`)
function bottleData(rng: RNG): number[] {
  if (rng.chance(0.3)) return [...BOTTLES]
  return evenData(rng, 4, 8, 16, 3)
}
function evenOut(xs: number[], withAvg: boolean): StemPart {
  return { kind: 'even-out', rows: xs.map((count, i) => ({ name: who(i), count })), max: Math.max(15, ...xs), ...(withAvg ? { avg: avgOf(xs) } : {}) }
}
/** 看图求平均每人收集了多少个（移多补少或先合再分都行） */
function qBottleAvg(d: Difficulty, rng: RNG): Question {
  const xs = bottleData(rng)
  return avgQ(d, rng, `bottle-avg-${xs.join('.')}`, [T('m4.avg.bottle.avg'), evenOut(xs, false)], xs)
}
/** 移多补少：图上画好了平均数的虚线，谁要拿出几个 / 补上几个 */
function qBottleMove(d: Difficulty, rng: RNG): Question {
  const xs = bottleData(rng)
  const a = avgOf(xs)
  const rows = xs.map((_, i) => i).filter((i) => xs[i] !== a)
  const i = rng.pick(rows)
  const more = xs[i]! > a
  const v = Math.abs(xs[i]! - a)
  return numberQuestion({
    kpId: KA,
    type: 'stat',
    difficulty: d,
    sig: `bottle-move-${xs.join('.')}-${i}`,
    stem: [T(more ? 'm4.avg.bottle.out' : 'm4.avg.bottle.in', { x: who(i) }), evenOut(xs, true)],
    value: v,
    rng,
    min: 1,
    max: 20,
    smart: [xs[i]!, a, v + 1, v - 1],
  })
}
/** 先合再分：(14 + 12 + 11 + 15) ÷ 4（算式求得数；或第一步一共收集了多少个） */
function qBottleCalc(d: Difficulty, rng: RNG): Question {
  const xs = bottleData(rng)
  const expr = `(${xs.join(' + ')}) ÷ ${xs.length}`
  if (rng.chance(0.3)) {
    const s = sum(xs)
    return numberQuestion({ kpId: KA, type: 'stat', difficulty: d, sig: `bottle-total-${xs.join('.')}`, stem: [T('m4.avg.bottle.total'), evenOut(xs, false)], value: s, rng, min: 0, max: 99, smart: [s - 10, s + 10, avgOf(xs), s + 1] })
  }
  return avgQ(d, rng, `bottle-expr-${xs.join('.')}`, [T('m4.avg.calc'), E(`${expr} = ?`)], xs)
}
/** 求平均每人收集多少个，哪个算式对（括号、除以人数） */
function qBottleWay(d: Difficulty, rng: RNG): Question {
  const xs = bottleData(rng)
  const s = xs.join(' + ')
  return labelQuestion({
    kpId: KA,
    type: 'stat',
    difficulty: d,
    sig: `bottle-way-${xs.join('.')}`,
    stem: [T('m4.avg.bottle.way'), evenOut(xs, false)],
    correct: `(${s}) ÷ 4`,
    distractors: [`${s} ÷ 4`, `(${s}) ÷ 2`, `(${s}) × 4`],
    rng,
  })
}

/** 例 2：踢毽比赛，男生队 5 人（课本 19、15、16、20、15，平均 17 个）、女生队 4 人（18、20、19、19，平均 19 个） */
export const KICK_BOYS = [19, 15, 16, 20, 15]
export const KICK_GIRLS = [18, 20, 19, 19]
function kickData(rng: RNG): [number[], number[]] {
  if (rng.chance(0.3)) return [[...KICK_BOYS], [...KICK_GIRLS]]
  for (;;) {
    const boys = evenData(rng, 5, 12, 22)
    const girls = evenData(rng, 4, 12, 22)
    // 平均数不一样，而且总数大的那一队平均数反而小（课本：男生队一共 85 个比女生队 76 个多，平均却少）——比总数不公平
    if (avgOf(boys) === avgOf(girls)) continue
    if (rng.chance(0.6) && (sum(boys) > sum(girls)) === (avgOf(boys) > avgOf(girls))) continue
    return [boys, girls]
  }
}
const kickTable = (boys: number[], girls: number[]): StemPart => ({
  kind: 'stat-table',
  title: L('m4.avg.kick.title'),
  head: 'col',
  rows: [
    [L('m4.avg.kick.boys'), ...boys],
    [L('m4.avg.kick.girls'), ...girls, ''],
  ],
})
function qKickAvg(d: Difficulty, rng: RNG): Question {
  const [boys, girls] = kickData(rng)
  const g = rng.chance(0.5)
  const xs = g ? girls : boys
  return avgQ(d, rng, `kick-avg-${boys.join('.')}-${girls.join('.')}-${g ? 'g' : 'b'}`, [T(g ? 'm4.avg.kick.avgGirls' : 'm4.avg.kick.avgBoys'), kickTable(boys, girls)], xs)
}
function qKickBetter(d: Difficulty, rng: RNG): Question {
  const [boys, girls] = kickData(rng)
  const g = avgOf(girls) > avgOf(boys)
  return labelQuestion({
    kpId: KA,
    type: 'stat',
    difficulty: d,
    sig: `kick-better-${boys.join('.')}-${girls.join('.')}`,
    stem: [T('m4.avg.kick.better'), kickTable(boys, girls)],
    correct: L(g ? 'm4.avg.kick.girls' : 'm4.avg.kick.boys'),
    distractors: [L(g ? 'm4.avg.kick.boys' : 'm4.avg.kick.girls')],
    rng,
  })
}
/** 例 2：人数不同怎么比——用每队的平均成绩来比较 */
function qKickWhy(d: Difficulty, rng: RNG): Question {
  return labelQuestion({
    kpId: KA,
    type: 'stat',
    difficulty: d,
    sig: 'kick-why',
    stem: [T('m4.avg.kick.why')],
    correct: L('m4.avg.kick.byAvg'),
    distractors: [L('m4.avg.kick.byTotal'), L('m4.avg.kick.byBest')],
    rng,
  })
}

/** 做一做：5 名学生捐书（课本 8、6、9、8、14 本，平均 9 本） */
export const DONATE = [8, 6, 9, 8, 14]
function qDonate(d: Difficulty, rng: RNG): Question {
  const xs = rng.chance(0.35) ? [...DONATE] : evenData(rng, 5, 3, 15, 4)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L('m4.avg.donate.name'), ...['yang', 'wang', 'liu', 'zhang', 'tang'].map((k) => L(`m4.avg.donate.${k}`))],
      [L('m4.avg.donate.books'), ...xs],
    ],
  }
  return avgQ(d, rng, `donate-${xs.join('.')}`, [T('m4.avg.donate.ask'), table], xs)
}

/** 练习二十二 1：一周的最高气温（课本 21、21、22、24、22、21、23 °C，平均 22）、最低气温（10、10、12、12、11、11、11，平均 11） */
export const TEMP_HIGH = [21, 21, 22, 24, 22, 21, 23]
export const TEMP_LOW = [10, 10, 12, 12, 11, 11, 11]
function qTemp(d: Difficulty, rng: RNG): Question {
  const high = rng.chance(0.5)
  const xs = rng.chance(0.4) ? [...(high ? TEMP_HIGH : TEMP_LOW)] : evenData(rng, 7, high ? 18 : 6, high ? 27 : 14)
  const table: StemPart = {
    kind: 'stat-table',
    title: L('m4.avg.temp.title'),
    head: 'col',
    rows: [
      [L('m4.avg.temp.day'), ...['1', '2', '3', '4', '5', '6', '7'].map((n) => L(`m4.avg.temp.d${n}`))],
      [L(high ? 'm4.avg.temp.high' : 'm4.avg.temp.low'), ...xs],
    ],
  }
  return avgQ(d, rng, `temp-${high ? 'h' : 'l'}-${xs.join('.')}`, [T(high ? 'm4.avg.temp.askHigh' : 'm4.avg.temp.askLow'), table], xs)
}
/** 练习二十二 2：小明周一至周五上学花的时间（课本 15、17、14、16、18 分，平均 16） */
export const SCHOOL_TIME = [15, 17, 14, 16, 18]
function qTime(d: Difficulty, rng: RNG): Question {
  const xs = rng.chance(0.4) ? [...SCHOOL_TIME] : evenData(rng, 5, 10, 25)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L('m4.avg.time.day'), ...['1', '2', '3', '4', '5'].map((n) => L(`m4.avg.temp.d${n}`))],
      [L('m4.avg.time.min'), ...xs],
    ],
  }
  return avgQ(d, rng, `time-${xs.join('.')}`, [T('m4.avg.time.ask'), table], xs)
}
/**
 * 练习二十二 3：平均数的意义（判断）。王悦 5 次跳远总成绩 10 米，每次肯定都是 2 米（不对）；排球队平均身高 160 厘米，
 * 有的可能超过、有的可能不到（对）；两个小组的平均体重 36、34 千克，小东一定比小刚重（不对）。数换成别的也一样。
 */
function qJudge(d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['jump', 'height', 'weight'] as const)
  let p: P = {}
  if (kind === 'jump') {
    const [n, a] = rng.pick([
      [5, 2],
      [4, 3],
      [5, 3],
      [4, 2],
    ] as const)
    p = { n, t: n * a, a }
  } else if (kind === 'height') {
    p = { h: rng.pick([160, 150, 155, 165]) }
  } else {
    const a = rng.int(32, 40)
    p = { a, b: a - rng.int(1, 4) }
  }
  const yes = kind === 'height'
  return labelQuestion({
    kpId: KA,
    type: 'stat',
    difficulty: d,
    sig: `judge-${kind}-${Object.values(p).join('.')}`,
    stem: [T(`m4.avg.judge.${kind}`, p)],
    correct: L(yes ? 'm4.avg.yes' : 'm4.avg.no'),
    distractors: [L(yes ? 'm4.avg.no' : 'm4.avg.yes')],
    rng,
  })
}
/** 练习二十二 4：两个小组做仰卧起坐，第一小组 4 人一共 132 个，第二小组 5 人一共 155 个，哪个小组的成绩好些（33 > 31） */
function situpData(rng: RNG): [number, number] {
  if (rng.chance(0.35)) return [33, 31]
  for (;;) {
    const a = rng.int(20, 40)
    const b = rng.int(20, 40)
    if (a !== b && 4 * a < 5 * b === a > b) return [a, b]
  }
}
function qSitup(d: Difficulty, rng: RNG): Question {
  const [a, b] = situpData(rng)
  const stem = [T('m4.avg.situp.data', { s: 4 * a, t: 5 * b })]
  if (rng.chance(0.5)) {
    const first = rng.chance(0.5)
    const v = first ? a : b
    const tot = first ? 4 * a : 5 * b
    return numberQuestion({ kpId: KA, type: 'stat', difficulty: d, sig: `situp-avg-${a}-${b}-${first ? 1 : 2}`, stem: [...stem, T(first ? 'm4.avg.situp.avg1' : 'm4.avg.situp.avg2')], value: v, rng, min: 0, max: 199, smart: [tot / (first ? 5 : 4), tot, v + 1, v - 1].filter((x) => Number.isInteger(x)) })
  }
  return labelQuestion({
    kpId: KA,
    type: 'stat',
    difficulty: d,
    sig: `situp-better-${a}-${b}`,
    stem: [...stem, T('m4.avg.situp.better')],
    correct: L(a > b ? 'm4.avg.situp.g1' : 'm4.avg.situp.g2'),
    distractors: [L(a > b ? 'm4.avg.situp.g2' : 'm4.avg.situp.g1')],
    rng,
  })
}
/** 练习二十二 5：某小组 6 名同学的身高（课本 139、140、135、138、139、137 cm，平均 138）、体重（34、38、35、34、36、33 kg，平均 35） */
export const HEIGHTS = [139, 140, 135, 138, 139, 137]
export const WEIGHTS = [34, 38, 35, 34, 36, 33]
function qBody(d: Difficulty, rng: RNG): Question {
  const textbook = rng.chance(0.4)
  const hs = textbook ? [...HEIGHTS] : evenData(rng, 6, 130, 145)
  const ws = textbook ? [...WEIGHTS] : evenData(rng, 6, 28, 40)
  const askH = rng.chance(0.5)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L('m4.avg.body.name'), ...['hua', 'ming', 'feng', 'li', 'bing', 'zhang'].map((k) => L(`m4.avg.body.${k}`))],
      [L('m4.avg.body.cm'), ...hs],
      [L('m4.avg.body.kg'), ...ws],
    ],
  }
  return avgQ(d, rng, `body-${askH ? 'h' : 'w'}-${hs.join('.')}-${ws.join('.')}`, [T(askH ? 'm4.avg.body.askH' : 'm4.avg.body.askW'), table], askH ? hs : ws)
}
/** 练习二十二 6：草莓最近 7 天的销量（课本 18—24 日 8、12、11、9、10、9、11 千克，平均 10），竖向条形统计图，条顶写数、1 格 2 千克 */
export const BERRY = [8, 12, 11, 9, 10, 9, 11]
function qBerry(d: Difficulty, rng: RNG): Question {
  const xs = rng.chance(0.4) ? [...BERRY] : evenData(rng, 7, 6, 14)
  const chart: StemPart = {
    kind: 'bar-chart',
    cats: xs.map((_, i) => L('m4.avg.berry.day', { n: 18 + i })),
    series: [{ values: xs }],
    step: 2,
    cells: Math.floor(Math.max(...xs) / 2) + 1,
    valueAxis: L('m4.avg.ax.sales'),
    catAxis: L('m4.avg.ax.date'),
    numbers: true,
  }
  return avgQ(d, rng, `berry-${xs.join('.')}`, [T('m4.avg.berry.ask'), chart], xs)
}
/** 练习二十三 6*：7 位评委打分，去掉一个最高分、一个最低分再求平均（课本 92、99、91、93、82、95、94，平均 93）；选学，只放第 2 档 */
export const SCORES = [92, 99, 91, 93, 82, 95, 94]
function scoreData(rng: RNG): number[] {
  if (rng.chance(0.35)) return [...SCORES]
  for (;;) {
    const xs = Array.from({ length: 7 }, () => rng.int(80, 99))
    if (uniqueAt(xs, true) < 0 || uniqueAt(xs, false) < 0) continue
    const mid = [...xs].sort((a, b) => a - b).slice(1, 6)
    if (sum(mid) % 5 !== 0) continue
    return xs
  }
}
function qDrop(d: Difficulty, rng: RNG): Question {
  const xs = scoreData(rng)
  const mid = [...xs].sort((a, b) => a - b).slice(1, 6)
  const v = sum(mid) / 5
  const table: StemPart = {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L('m4.avg.drop.judge'), 1, 2, 3, 4, 5, 6, 7],
      [L('m4.avg.drop.score'), ...xs],
    ],
  }
  return numberQuestion({
    kpId: KA,
    type: 'stat',
    difficulty: d,
    sig: `drop-${xs.join('.')}`,
    stem: [T('m4.avg.drop.ask'), table],
    value: v,
    rng,
    min: 0,
    max: 100,
    smart: [Math.round(sum(xs) / 7), Math.floor(sum(xs) / 7), v + 1, v - 1].filter((x) => x !== v),
  })
}
/** 总复习 16：小华跳远五跳（170、168、171、167、169 厘米），比赛成绩取最好的一跳（171），不用平均成绩 169 */
export const LONG_JUMP = [170, 168, 171, 167, 169]
function qBest(d: Difficulty, rng: RNG): Question {
  const table: StemPart = {
    kind: 'stat-table',
    head: 'row',
    rows: [[1, 2, 3, 4, 5].map((n) => L(`m4.avg.best.j${n}`)), LONG_JUMP.map((v) => L('m4.avg.best.cm', { v }))],
  }
  const choice = (v: number): LStr => L('m4.avg.best.opt', { v })
  return labelQuestion({
    kpId: KA,
    type: 'stat',
    difficulty: d,
    sig: 'best',
    stem: [T('m4.avg.best.ask'), table],
    correct: choice(Math.max(...LONG_JUMP)),
    distractors: [choice(avgOf(LONG_JUMP)), choice(Math.min(...LONG_JUMP)), choice(LONG_JUMP[0]!)],
    rng,
  })
}

function average(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1（看图求平均、移多补少、先合再分、哪个算式对）、例 2（踢毽：平均每人、哪队好、用什么比）、做一做（捐书）
    if (roll < 0.17) return qBottleAvg(d, rng)
    if (roll < 0.3) return qBottleMove(d, rng)
    if (roll < 0.42) return qBottleCalc(d, rng)
    if (roll < 0.5) return qBottleWay(d, rng)
    if (roll < 0.63) return qKickAvg(d, rng)
    if (roll < 0.74) return qKickBetter(d, rng)
    if (roll < 0.8) return qKickWhy(d, rng)
    return qDonate(d, rng)
  }
  if (d === 2) {
    // 练习二十二：气温、上学时间、判断、仰卧起坐、身高体重、草莓；练习二十三 6* 去掉最高最低分
    if (roll < 0.15) return qTemp(d, rng)
    if (roll < 0.27) return qTime(d, rng)
    if (roll < 0.43) return qJudge(d, rng)
    if (roll < 0.57) return qSitup(d, rng)
    if (roll < 0.71) return qBody(d, rng)
    if (roll < 0.86) return qBerry(d, rng)
    return qDrop(d, rng)
  }
  // 第 3 档：比赛成绩用平均数合适吗（取最好的一跳）、七天气温、身高体重
  if (roll < 0.35) return qBest(d, rng)
  if (roll < 0.7) return qTemp(d, rng)
  return qBody(d, rng)
}
defineGenerator(KA, average)

// ══ 复式条形统计图（m4s2-08-double）══

export interface Double {
  id: string
  /** 图上的类别 */
  cats: LStr[]
  /** 句子、选项里的说法 */
  names: LStr[]
  series: { id: string; tone: Tone; values: number[] }[]
  step: number
  cells: number
  dir: 'v' | 'h'
  valueAxis: string
  catAxis: string
  title?: string
  /** 句子里数量的单位（万人、人、平方米……） */
  unit: string
}
export function doubleChart(s: Double): StemPart {
  const series: BarSeries[] = s.series.map((x) => ({ name: L(`m4.avg.ser.${x.id}`), tone: x.tone, values: x.values }))
  return {
    kind: 'bar-chart',
    ...(s.dir === 'h' ? { dir: 'h' as const } : {}),
    ...(s.title ? { title: L(`m4.avg.title.${s.title}`) } : {}),
    cats: s.cats,
    series,
    step: s.step,
    cells: s.cells,
    valueAxis: L(`m4.avg.ax.${s.valueAxis}`),
    catAxis: L(`m4.avg.ax.${s.catAxis}`),
    numbers: true,
  }
}
const dsig = (s: Double): string => `${s.id}-${s.dir}-${s.series.map((x) => x.values.join('.')).join('|')}`
const ser = (s: Double, j: number): LStr => L(`m4.avg.ser.${s.series[j]!.id}`)
const totals = (s: Double): number[] => s.cats.map((_, i) => sum(s.series.map((x) => x.values[i]!)))
const yearL = (y: number): LStr => L('m4.avg.year', { y })
/** 横着画的复式图很高（每一类两条）：问数的题用选项卡，数字键盘和它的显示框放不下（U5，手机竖屏一屏放下） */
const hInput = (s: Double): { input?: 'choice' } => (s.dir === 'h' ? { input: 'choice' } : {})
/** 干扰项里别的类别：先放离答案最近的，再随便补，最多 3 个 */
function others(s: Double, vals: number[], at: number, rng: RNG): LStr[] {
  const idx = s.names.map((_, i) => i).filter((i) => i !== at)
  const near = [...idx].sort((a, b) => Math.abs(vals[a]! - vals[at]!) - Math.abs(vals[b]! - vals[at]!))[0]!
  return [near, ...rng.shuffle(idx.filter((i) => i !== near))].slice(0, 3).map((i) => s.names[i]!)
}

/** 例 3：某地区城乡人口数（课本 1980—2020 年城镇 21、27、35、46、55，农村 58、54、49、43、38 万人），竖着或横着画 */
export const POP_YEARS = [1980, 1990, 2000, 2010, 2020]
export const POP_TOWN = [21, 27, 35, 46, 55]
export const POP_RURAL = [58, 54, 49, 43, 38]
function popData(rng: RNG, dir: 'v' | 'h' = rng.chance(0.5) ? 'v' : 'h'): Double {
  const make = (town: number[], rural: number[]): Double => ({
    id: 'pop',
    cats: POP_YEARS.map(String),
    names: POP_YEARS.map(yearL),
    series: [
      { id: 'town', tone: 'blue', values: town },
      { id: 'rural', tone: 'green', values: rural },
    ],
    step: 10,
    cells: 6,
    dir,
    valueAxis: 'pop',
    catAxis: 'year',
    title: 'pop',
    unit: 'wanren',
  })
  if (rng.chance(0.35)) return make([...POP_TOWN], [...POP_RURAL])
  for (;;) {
    const town = [rng.int(12, 26)]
    const rural = [rng.int(45, 59)]
    for (let i = 1; i < 5; i++) {
      town.push(town[i - 1]! + rng.int(3, 12))
      rural.push(rural[i - 1]! - rng.int(2, 9))
    }
    if (town[4]! > 59 || rural[4]! < 8) continue
    const gaps = town.map((x, i) => Math.abs(x - rural[i]!))
    if (gaps.includes(0) || uniqueAt(gaps, true) < 0 || uniqueAt(gaps, false) < 0) continue
    return make(town, rural)
  }
}
/** 做一做：四年级学生喜欢的运动项目（课本男生 17、18、8、14、7，女生 13、4、6、13、16 人），1 格代表 5 人 */
export const SPORT_BOYS = [17, 18, 8, 14, 7]
export const SPORT_GIRLS = [13, 4, 6, 13, 16]
const SPORTS = ['pingpong', 'soccer', 'run', 'swim', 'rope']
function sportData(rng: RNG): Double {
  for (;;) {
    const textbook = rng.chance(0.35)
    const boys = textbook ? [...SPORT_BOYS] : SPORTS.map(() => rng.int(2, 19))
    const girls = textbook ? [...SPORT_GIRLS] : SPORTS.map(() => rng.int(2, 19))
    if (![boys, girls, boys.map((b, i) => b + girls[i]!)].every((xs) => uniqueAt(xs, true) >= 0 && uniqueAt(xs, false) >= 0)) continue
    const cats = SPORTS.map((k) => L(`m4.avg.cat.${k}`))
    return {
      id: 'sport',
      cats,
      names: cats,
      series: [
        { id: 'boys', tone: 'blue', values: boys },
        { id: 'girls', tone: 'pink', values: girls },
      ],
      step: 5,
      cells: 4,
      dir: 'v',
      valueAxis: 'people',
      catAxis: 'item',
      title: 'sport',
      unit: 'ren',
    }
  }
}
/** 练习二十三 1：一分钟跳绳成绩分段（课本男生 2、8、18、14、3，女生 1、4、17、8、9 人） */
export const ROPE_BOYS = [2, 8, 18, 14, 3]
export const ROPE_GIRLS = [1, 4, 17, 8, 9]
const ROPE: Double = {
  id: 'rope',
  cats: [L('m4.avg.seg.max', { a: 100 }), '101~120', '121~140', '141~160', L('m4.avg.seg.min', { a: 161 })],
  names: [L('m4.avg.seg.maxSay', { a: 100 }), L('m4.avg.seg.rangeSay', { a: 101, b: 120 }), L('m4.avg.seg.rangeSay', { a: 121, b: 140 }), L('m4.avg.seg.rangeSay', { a: 141, b: 160 }), L('m4.avg.seg.minSay', { a: 161 })],
  series: [
    { id: 'boys', tone: 'blue', values: ROPE_BOYS },
    { id: 'girls', tone: 'pink', values: ROPE_GIRLS },
  ],
  step: 5,
  cells: 4,
  dir: 'v',
  valueAxis: 'people',
  catAxis: 'score',
  unit: 'ren',
}
/** 练习二十三 2：人均住房面积（横向，课本 2016、2018、2020 年城镇 24.96、26.2、28.2，农村 27.64、28.9、32.6 平方米） */
export const HOUSE_TOWN = ['24.96', '26.2', '28.2']
export const HOUSE_RURAL = ['27.64', '28.9', '32.6']
const HOUSE: Double = {
  id: 'house',
  cats: ['2016', '2018', '2020'],
  names: [2016, 2018, 2020].map(yearL),
  series: [
    { id: 'rural', tone: 'green', values: HOUSE_RURAL.map(Number) },
    { id: 'town', tone: 'blue', values: HOUSE_TOWN.map(Number) },
  ],
  step: 5,
  cells: 7,
  dir: 'h',
  valueAxis: 'area',
  catAxis: 'year',
  title: 'house',
  unit: 'm2',
}
/** 练习二十三 4：四年级学生体重分段（横向，课本男生 4、7、15、13，女生 3、8、14、11 人；从下往上 33 以下……37 以上） */
const KG: Double = {
  id: 'kg',
  cats: [L('m4.avg.kg.c1'), L('m4.avg.kg.c2'), L('m4.avg.kg.c3'), L('m4.avg.kg.c4')],
  names: [L('m4.avg.kg.s1'), L('m4.avg.kg.s2'), L('m4.avg.kg.s3'), L('m4.avg.kg.s4')],
  series: [
    { id: 'boys', tone: 'blue', values: [4, 7, 15, 13] },
    { id: 'girls', tone: 'pink', values: [3, 8, 14, 11] },
  ],
  step: 2,
  cells: 8,
  dir: 'h',
  valueAxis: 'people',
  catAxis: 'weight',
  title: 'kg',
  unit: 'ren',
}
/** 练习二十三 5：我国 2016—2021 年电话用户数（万户，课本的数） */
export const PHONE_YEARS = [2016, 2017, 2018, 2019, 2020, 2021]
export const PHONE_FIXED = [20663, 19376, 18225, 19104, 18191, 18070]
export const PHONE_MOBILE = [132193, 141749, 156610, 160134, 159407, 164283]
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
  unit: 'wanhu',
}
/** 总复习 4：四年级学生喜欢的玩具（课本男生 22、3、15、18，女生 8、24、13、14 人） */
const TOYS: Double = {
  id: 'toys',
  cats: ['car', 'doll', 'chess', 'puzzle'].map((k) => L(`m4.avg.cat.${k}`)),
  names: ['car', 'doll', 'chess', 'puzzle'].map((k) => L(`m4.avg.cat.${k}`)),
  series: [
    { id: 'boys', tone: 'blue', values: [22, 3, 15, 18] },
    { id: 'girls', tone: 'pink', values: [8, 24, 13, 14] },
  ],
  step: 5,
  cells: 5,
  dir: 'v',
  valueAxis: 'people',
  catAxis: 'toy',
  title: 'toys',
  unit: 'ren',
}
/** 总复习 14：高阿姨收到的普通邮件和电子邮件（横向，课本 1990—2020 年普通 20、18、10、1，电子 0、6、20、45 封） */
const MAIL: Double = {
  id: 'mail',
  cats: ['1990', '2000', '2010', '2020'],
  names: [1990, 2000, 2010, 2020].map(yearL),
  series: [
    { id: 'post', tone: 'pink', values: [20, 18, 10, 1] },
    { id: 'email', tone: 'green', values: [0, 6, 20, 45] },
  ],
  step: 10,
  cells: 5,
  dir: 'h',
  valueAxis: 'letters',
  catAxis: 'year',
  unit: 'feng',
}

/** 某一组哪一类最多 / 最少（「哪一年城镇人口数最多」「喜欢哪个项目的男生最多」） */
function qSerMost(d: Difficulty, rng: RNG, s: Double, j: number, most: boolean): Question | null {
  const vs = s.series[j]!.values
  const at = uniqueAt(vs, most)
  if (at < 0) return null
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `ser-${most ? 'most' : 'least'}-${dsig(s)}-${j}`,
    stem: [T(`m4.avg.${s.id}.${most ? 'most' : 'least'}`, { g: ser(s, j) }), doubleChart(s)],
    correct: s.names[at]!,
    distractors: others(s, vs, at, rng),
    rng,
  })
}
/** 两组合起来哪一类最多 / 最少（做一做「喜欢哪个项目的人最多」：男生、女生要加起来） */
function qAllMost(d: Difficulty, rng: RNG, s: Double, most: boolean): Question | null {
  const all = totals(s)
  const at = uniqueAt(all, most)
  if (at < 0) return null
  // 干扰项先放只看了一组的（男生最多的那项、女生最多的那项）
  const first = [uniqueAt(s.series[0]!.values, most), uniqueAt(s.series[1]!.values, most)].filter((i) => i >= 0 && i !== at)
  const picked = [...new Set(first)]
  for (const i of rng.shuffle(all.map((_, k) => k))) if (i !== at && !picked.includes(i)) picked.push(i)
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `all-${most ? 'most' : 'least'}-${dsig(s)}`,
    stem: [T(`m4.avg.${s.id}.${most ? 'allMost' : 'allLeast'}`), doubleChart(s)],
    correct: s.names[at]!,
    distractors: picked.slice(0, 3).map((i) => s.names[i]!),
    rng,
  })
}
/** 例 3：哪一年城乡人口数相差的数量最大 / 最小 */
function qGap(d: Difficulty, rng: RNG, s: Double, most: boolean): Question {
  const gaps = s.cats.map((_, i) => Math.abs(s.series[0]!.values[i]! - s.series[1]!.values[i]!))
  const at = uniqueAt(gaps, most)
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `gap-${most ? 'most' : 'least'}-${dsig(s)}`,
    stem: [T(most ? 'm4.avg.pop.gapMost' : 'm4.avg.pop.gapLeast'), doubleChart(s)],
    correct: s.names[at]!,
    distractors: others(s, gaps, at, rng),
    rng,
  })
}
/** 同一类两组相差多少（「2000 年农村人口比城镇人口多多少万人」「喜欢跳绳的女生比男生多几人」） */
function qPairDiff(d: Difficulty, rng: RNG, s: Double, i: number): Question {
  const v0 = s.series[0]!.values[i]!
  const v1 = s.series[1]!.values[i]!
  const [a, b] = v0 > v1 ? [0, 1] : [1, 0]
  const v = Math.abs(v0 - v1)
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `pdiff-${dsig(s)}-${i}`,
    stem: [T(`m4.avg.${s.id}.diff`, { x: s.names[i]!, a: ser(s, a), b: ser(s, b) }), doubleChart(s)],
    value: v,
    rng,
    min: 0,
    max: 199,
    smart: [v0 + v1, v + 1, v - 1, v + 10, v - 10],
    ...hInput(s),
  })
}
/** 同一类两组一共多少（「1990 年城镇和农村一共有多少万人」「喜欢跳绳的一共有多少人」） */
function qPairSum(d: Difficulty, rng: RNG, s: Double, i: number): Question {
  const v0 = s.series[0]!.values[i]!
  const v1 = s.series[1]!.values[i]!
  const v = v0 + v1
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `psum-${dsig(s)}-${i}`,
    stem: [T(`m4.avg.${s.id}.sum`, { x: s.names[i]! }), doubleChart(s)],
    value: v,
    rng,
    min: 0,
    max: 199,
    smart: [Math.abs(v0 - v1), v + 1, v - 1, v + 10, v - 10],
    ...hInput(s),
  })
}
/** 读一条（条顶写着数）：「喜欢足球的女生有几人」「2010 年城镇人口有多少万人」 */
function qCell(d: Difficulty, rng: RNG, s: Double, i: number, j: number): Question {
  const v = s.series[j]!.values[i]!
  const other = s.series.filter((_, k) => k !== j).map((x) => x.values[i]!)
  const near = [i - 1, i + 1].filter((k) => k >= 0 && k < s.cats.length).map((k) => s.series[j]!.values[k]!)
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `cell-${dsig(s)}-${i}-${j}`,
    stem: [T(`m4.avg.${s.id}.cell`, { x: s.names[i]!, g: ser(s, j) }), doubleChart(s)],
    value: v,
    rng,
    min: 0,
    max: Math.max(199, v * 2),
    smart: [...other, ...near, v + 1, v - 1],
    ...hInput(s),
  })
}
/** 看图例：「图中绿色的条表示什么」 */
function qLegend(d: Difficulty, rng: RNG, s: Double): Question {
  const j = rng.int(0, s.series.length - 1)
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `legend-${dsig(s)}-${j}`,
    stem: [T('m4.avg.legend', { c: L(`m4.avg.color.${s.series[j]!.tone}`) }), doubleChart(s)],
    correct: ser(s, j),
    distractors: s.series.filter((_, k) => k !== j).map((x) => L(`m4.avg.ser.${x.id}`)),
    rng,
  })
}
/** 「这幅图里，1 格代表多少万人」（相邻两个刻度之间） */
function qStep(d: Difficulty, rng: RNG, s: Double): Question {
  return numberQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `step-${dsig(s)}`,
    stem: [T('m4.avg.stepAsk', { u: L(`m4.avg.u.${s.unit}`) }), doubleChart(s)],
    value: s.step,
    rng,
    min: 1,
    max: 99,
    smart: [1, 2, 5, 10, 20, s.step * 2].filter((x) => x !== s.step),
  })
}
/** 例 3「这是复式条形统计图」：给一幅图，问是不是复式条形统计图 / 单式条形统计图（单式图用城镇人口一组） */
function qKind(d: Difficulty, rng: RNG): Question {
  const s = popData(rng, 'v')
  const isDouble = rng.chance(0.5)
  const part = isDouble ? doubleChart(s) : { ...(doubleChart({ ...s, series: [s.series[0]!] }) as Extract<StemPart, { kind: 'bar-chart' }>), title: L('m4.avg.title.town') }
  const askDouble = rng.chance(0.5)
  const yes = isDouble === askDouble
  return labelQuestion({
    kpId: KD,
    type: 'stat',
    difficulty: d,
    sig: `kind-${isDouble ? 'd' : 's'}-${askDouble ? 'd' : 's'}-${dsig(s)}`,
    stem: [T(askDouble ? 'm4.avg.isDouble' : 'm4.avg.isSingle'), part],
    correct: L(yes ? 'm4.avg.yes' : 'm4.avg.no'),
    distractors: [L(yes ? 'm4.avg.no' : 'm4.avg.yes')],
    rng,
  })
}
/** 练习二十三 1 (1)：成绩在 121 到 160 次的男生（女生）有多少人（两段加起来） */
function qRopeSum(d: Difficulty, rng: RNG): Question {
  const j = rng.int(0, 1)
  const vs = ROPE.series[j]!.values
  const v = vs[2]! + vs[3]!
  return numberQuestion({ kpId: KD, type: 'stat', difficulty: d, sig: `rope-sum-${j}`, stem: [T('m4.avg.rope.sum', { g: ser(ROPE, j) }), doubleChart(ROPE)], value: v, rng, min: 0, max: 99, smart: [vs[2]!, vs[3]!, v + ROPE.series[1 - j]!.values[2]!, v + 1, v - 1] })
}
/** 练习二十三 1 (1) 后半：女生 135 次及以上为优秀，135 到 140 次的有 12 人，优秀的女生有多少人（12 + 8 + 9 = 29） */
function qRopeGood(d: Difficulty, rng: RNG): Question {
  const vs = ROPE.series[1]!.values
  const k = 12
  const v = k + vs[3]! + vs[4]!
  return numberQuestion({ kpId: KD, type: 'stat', difficulty: d, sig: 'rope-good', stem: [T('m4.avg.rope.good', { k }), doubleChart(ROPE)], value: v, rng, min: 0, max: 99, smart: [vs[2]! + vs[3]! + vs[4]!, k + vs[3]!, vs[3]! + vs[4]!, v + 1] })
}
/** 练习二十三 2 (1)：2020 年与 2016 年相比，城镇（农村）人均住房面积增加了多少平方米（小数，选项卡：3.24、4.96） */
function qHouseInc(d: Difficulty, rng: RNG): Question {
  const town = rng.chance(0.5)
  const [a, b] = town ? [HOUSE_TOWN[2]!, HOUSE_TOWN[0]!] : [HOUSE_RURAL[2]!, HOUSE_RURAL[0]!]
  // 两位小数用整数（百分之几）算：28.2 − 24.96 = 3.24，32.6 − 27.64 = 4.96
  const c = (x: string): number => Math.round(Number(x) * 100)
  const v = c(a) - c(b)
  const fmt = (h: number): string => (h / 100).toFixed(2).replace(/\.?0+$/, '')
  // 常错：位数不同没添 0（28.2 − 24.96 按末位对齐成 2.82 − 24.96 不行，就当成 28.2 − 2.496……）、退位时少减 1、两个数相加
  const wrongs = [v + 10, v - 10, v + 100, c(a) + c(b)].map(fmt)
  return labelQuestion({ kpId: KD, type: 'stat', difficulty: d, sig: `house-inc-${town ? 't' : 'r'}`, stem: [T('m4.avg.house.inc', { g: L(`m4.avg.ser.${town ? 'town' : 'rural'}`) }), doubleChart(HOUSE)], correct: fmt(v), distractors: wrongs.slice(0, 3), rng })
}
/** 练习二十三 3：某市人均寿命统计表（课本 1990—2020 年男性 71、74、75、77 岁，女性 76、78、80、82 岁）：某一年女性比男性多几岁 */
export const LIFE_MEN = [71, 74, 75, 77]
export const LIFE_WOMEN = [76, 78, 80, 82]
function qLife(d: Difficulty, rng: RNG): Question {
  const i = rng.int(0, 3)
  const year = [1990, 2000, 2010, 2020][i]!
  const v = LIFE_WOMEN[i]! - LIFE_MEN[i]!
  const table: StemPart = {
    kind: 'stat-table',
    title: L('m4.avg.life.title'),
    head: 'both',
    rows: [
      [L('m4.avg.life.year'), 1990, 2000, 2010, 2020],
      [L('m4.avg.life.men'), ...LIFE_MEN],
      [L('m4.avg.life.women'), ...LIFE_WOMEN],
    ],
  }
  return numberQuestion({ kpId: KD, type: 'stat', difficulty: d, sig: `life-${i}`, stem: [T('m4.avg.life.ask', { y: year }), table], value: v, rng, min: 0, max: 99, smart: [v + 1, v - 1, LIFE_WOMEN[i]!, v + 2] })
}
/** 总复习 14：两种邮件的数量有什么变化趋势（普通邮件越来越少，电子邮件越来越多） */
function qTrend(d: Difficulty, rng: RNG): Question {
  const t = (k: string): LStr => L(`m4.avg.mail.${k}`)
  return labelQuestion({ kpId: KD, type: 'stat', difficulty: d, sig: 'mail-trend', stem: [T('m4.avg.mail.trend'), doubleChart(MAIL)], correct: t('t1'), distractors: [t('t2'), t('t3'), t('t4')], rng })
}

function double(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const sub = rng.next()
  if (d === 1) {
    if (roll < 0.55) {
      // 例 3：城乡人口（竖着、横着两种画法）：哪一年最多 / 最少、相差最大 / 最小、某一年相差多少、一共多少、图例、1 格代表几、是不是复式
      // 横着画的图问「哪一年」（选项卡）；问数的（相差、一共、1 格代表几）用竖着画的，数字键盘放得下
      const s = popData(rng)
      if (sub < 0.25) return qSerMost(d, rng, s, rng.int(0, 1), rng.chance(0.55))!
      if (sub < 0.42) return qGap(d, rng, s, rng.chance(0.55))
      if (sub < 0.58) return qPairDiff(d, rng, popData(rng, 'v'), rng.int(0, 4))
      if (sub < 0.68) return qPairSum(d, rng, popData(rng, 'v'), rng.int(0, 4))
      if (sub < 0.78) return qLegend(d, rng, s)
      if (sub < 0.88) return qStep(d, rng, popData(rng, 'v'))
      return qKind(d, rng)
    }
    // 做一做：男生、女生喜欢的运动项目
    const s = sportData(rng)
    if (sub < 0.3) return qSerMost(d, rng, s, rng.int(0, 1), rng.chance(0.55))!
    if (sub < 0.55) return qAllMost(d, rng, s, rng.chance(0.55))!
    const cols = s.cats.map((_, i) => i).filter((i) => s.series[0]!.values[i] !== s.series[1]!.values[i])
    if (sub < 0.72 && cols.length) return qPairDiff(d, rng, s, rng.pick(cols))
    if (sub < 0.86) return qPairSum(d, rng, s, rng.int(0, 4))
    return qCell(d, rng, s, rng.int(0, 4), rng.int(0, 1))
  }
  if (d === 2) {
    if (roll < 0.2) {
      // 练习二十三 1：跳绳成绩分段
      if (sub < 0.5) return qCell(d, rng, ROPE, rng.int(0, 4), rng.int(0, 1))
      return qRopeSum(d, rng)
    }
    if (roll < 0.34) return qHouseInc(d, rng) // 练习二十三 2：人均住房面积增加了多少（小数）
    if (roll < 0.48) {
      // 练习二十三 4：体重分段（横向）
      if (sub < 0.4) return qPairSum(d, rng, KG, rng.int(0, 3))
      return qCell(d, rng, KG, rng.int(0, 3), rng.int(0, 1))
    }
    if (roll < 0.6) return qSerMost(d, rng, PHONE, rng.int(0, 1), true)! // 练习二十三 5：电话用户
    if (roll < 0.72) return qLife(d, rng) // 练习二十三 3：人均寿命
    // 总复习 4：玩具
    if (sub < 0.4) return qSerMost(d, rng, TOYS, rng.int(0, 1), true)!
    if (sub < 0.7) return qAllMost(d, rng, TOYS, true)!
    return qPairDiff(d, rng, TOYS, rng.int(0, 3))
  }
  // 第 3 档：跳绳优秀的女生、两种邮件的变化趋势、邮件哪年最多、城乡人口一共多少
  if (roll < 0.3) return qRopeGood(d, rng)
  if (roll < 0.55) return qTrend(d, rng)
  if (roll < 0.75) return qSerMost(d, rng, MAIL, rng.int(0, 1), true)!
  return qPairSum(d, rng, popData(rng), rng.int(0, 4))
}
defineGenerator(KD, double)
