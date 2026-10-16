// 六上「☆ 水是生命之源」的生成器（六年级数学 E）。
import type { Difficulty, LParam, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { fix, pctOf, pickDistinct } from './percent'

// ─────────────────────────────────────────────────────────────
// 六上「☆ 水是生命之源」（综合与实践，课本第 101–105 页，106–110.jpg）：一个知识点。
// 课本的数据（活动一）：每年 3 月 22 日是「世界水日」（1993 年 1 月 18 日联合国大会决议）；2021 年世界人均可再生淡水资源 5429.5 立方米、
//   我国 1991.6 立方米；2024 年水资源总量（亿立方米）北京 52.9、天津 25.2、河北 247.9、江苏 496.3、安徽 889.7、山东 461.7、河南 417.7；
//   南水北调分东、中、西三条线路，构想始于 1952 年，东线一期 2013 年 11 月 15 日通水、中线一期 2014 年 12 月 12 日通水，截至 2025 年 12 月
//   东、中线累计调水超 844 亿立方米，其中生态补水超 123 亿立方米。
// 课本是空表、数是编的（要用户核）：活动二测 3 个水龙头的出水量（课本给了空的条形统计图：出水量/升 0–30、每格 5）——编成 10 分钟
//   1 号 5 升、2 号 15 升、3 号 25 升（另一组 10、20、30 升）；活动三一周节水实验——编成节水前 3200 升、节水后 2800 升（另一组 2500 → 2000）；
//   关不紧的水龙头每分钟滴水约 60 / 50 毫升；预计每天节水 60 升。
// 不出：查资料、调查方案、问卷、节水海报、成长小档案。
// 朗读：「南水北调」「调水」的调读 diào——题干写「向北方送水」，「南水北调」是专名照写（合成后听一下）；不写「空调冷凝水」（调 tiáo）、
// 「开着」「不停地」（着、地）；「3 个水龙头」不写 ①②③（读不出来），图上照课本画 ①②③ 的位置写「1号」「2号」「3号」。
// 排版（练习页手机竖屏一屏放下）：水资源表的说明写成表题（不朗读），表头写短；南水北调每道题只给它要用的那几句；
// 带表、带图的计算题用选项卡（数字键盘四行太高），干扰项照常见错误给。
// ─────────────────────────────────────────────────────────────

export const KP_WATER = 'm6s1-08-water'
type P = Record<string, LParam>
const L = (k: string, p?: P): LStr => (p ? { k: `m6.water.${k}`, p } : { k: `m6.water.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const PL = (k: string): LStr => ({ k: `m6.pct.${k}` })

function choice(d: Difficulty, sig: string, stem: StemPart[], correct: LStr, cands: LStr[], rng: RNG, type: 'percent' | 'stat' = 'stat'): Question {
  return labelQuestion({ kpId: KP_WATER, type, difficulty: d, sig, stem, correct, distractors: pickDistinct(correct, cands), rng })
}
function keypad(d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG): Question {
  return numberQuestion({ kpId: KP_WATER, type: 'stat', difficulty: d, sig, stem, value, rng, max: Math.max(10, value * 2), input: 'numpad' })
}
/** 带图的整数答案：选项卡，smart 是常见的错答（不合适的自动跳过） */
function cards(d: Difficulty, sig: string, stem: StemPart[], value: number, smart: number[], rng: RNG): Question {
  return numberQuestion({ kpId: KP_WATER, type: 'stat', difficulty: d, sig, stem, value, rng, min: 1, max: Math.max(100, value * 3), input: 'choice', smart })
}

// ── 活动一：课本的数据 ──

/** 2021 年人均可再生淡水资源（立方米，存成十分之几的整数）：世界 5429.5、我国 1991.6 */
export const WORLD = 54295
export const CHINA = 19916
/** 2024 年水资源总量（亿立方米，十分之几的整数） */
export const PLACES: [string, number][] = [
  ['bj', 529],
  ['tj', 252],
  ['hb', 2479],
  ['js', 4963],
  ['ah', 8897],
  ['sd', 4617],
  ['hn', 4177],
]
const placeTable = (): StemPart => ({
  kind: 'stat-table',
  head: 'row',
  title: L('t.title'),
  rows: [[L('t.place'), L('t.total')], ...PLACES.map(([k, v]) => [L(`p.${k}`), fix(v, 1)])],
})
/** 两地比较、相加问的几对（第一个比第二个多） */
export const PLACE_DIFF: [string, string][] = [
  ['hb', 'bj'],
  ['sd', 'hn'],
  ['js', 'sd'],
  ['ah', 'js'],
  ['hn', 'hb'],
  ['bj', 'tj'],
]
export const PLACE_SUM: [string, string][] = [
  ['bj', 'tj'],
  ['js', 'sd'],
  ['hb', 'hn'],
]
const placeVal = (k: string): number => PLACES.find(([p]) => p === k)![1]

function qDay(d: Difficulty, rng: RNG): Question {
  const date = (m: number, day: number): LStr => L('date', { m, d: day })
  return choice(d, 'day', [T('dayQ')], date(3, 22), [date(1, 18), date(6, 5), date(3, 12)], rng)
}
function qPerCapita(d: Difficulty, rng: RNG): Question {
  const stem0 = T('perIntro')
  if (d === 1 && rng.chance(0.5)) {
    const v = WORLD - CHINA
    return choice(d, 'per-less', [stem0, T('lessQ')], fix(v, 1), [fix(WORLD + CHINA, 1), fix(v + 10, 1), fix(v - 1000, 1)], rng)
  }
  const p = pctOf(CHINA, WORLD)
  return choice(d, 'per-pct', [stem0, T('pctQ'), { kind: 'text', text: PL('keep1') }], p.text, [pctOf(WORLD - CHINA, WORLD).text, pctOf(WORLD, CHINA).text, `${fix(Math.floor((CHINA * 2000 + WORLD) / (2 * WORLD)), 3)}%`], rng, 'percent')
}
function qPlaceMax(d: Difficulty, rng: RNG): Question {
  const most = rng.chance(0.5)
  const sorted = [...PLACES].sort((a, b) => b[1] - a[1])
  const ans = most ? sorted[0]![0] : sorted[sorted.length - 1]![0]
  const others = rng.shuffle(PLACES.map(([k]) => k).filter((k) => k !== ans)).slice(0, 3)
  return choice(d, most ? 'most' : 'least', [placeTable(), T(most ? 'mostQ' : 'leastQ')], L(`p.${ans}`), others.map((k) => L(`p.${k}`)), rng)
}
// 表有 8 行，一律选项卡（得数是整数的也是）：错法是加减弄反、差一个 1 或 0.1（数位没对齐）
function qPlaceCalc(d: Difficulty, rng: RNG): Question {
  const stem0: StemPart[] = [placeTable()]
  if (rng.chance(0.6)) {
    const [a, b] = rng.pick(PLACE_DIFF)
    const v = placeVal(a) - placeVal(b)
    const stem = [...stem0, T('diffQ', { a: L(`p.${a}`), b: L(`p.${b}`) })]
    return choice(d, `diff-${a}-${b}`, stem, fix(v, 1), [fix(placeVal(a) + placeVal(b), 1), fix(v + 10, 1), fix(v - 10, 1), fix(v + 1, 1)], rng)
  }
  const [a, b] = rng.pick(PLACE_SUM)
  const v = placeVal(a) + placeVal(b)
  const stem = [...stem0, T('sumQ', { a: L(`p.${a}`), b: L(`p.${b}`) })]
  return choice(d, `sum-${a}-${b}`, stem, fix(v, 1), [fix(Math.abs(placeVal(a) - placeVal(b)), 1), fix(v + 10, 1), fix(v - 10, 1), fix(v + 1, 1)], rng)
}
// 课本那一段（三条线路、1952 年构想、两条线一期通水）拆开：每道题只给它要用的那一两句
function qDiversion(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (r < 0.25) return keypad(d, 'sn-lines', [T('snLines'), T('linesQ')], 3, rng)
  if (r < 0.6) {
    const east = rng.chance(0.6)
    const year = (y: number): LStr => L('year', { y })
    return choice(d, east ? 'sn-east' : 'sn-mid', [T('snOpen'), T(east ? 'eastQ' : 'midQ')], year(east ? 2013 : 2014), [year(east ? 2014 : 2013), year(1952), year(2025)], rng)
  }
  return keypad(d, 'sn-years', [T('snYears'), T('yearsQ')], 2013 - 1952, rng)
}
function qEco(d: Difficulty, rng: RNG): Question {
  const p = pctOf(123, 844)
  return choice(d, 'eco', [T('ecoQ'), { kind: 'text', text: PL('keep1') }], p.text, [pctOf(844 - 123, 844).text, pctOf(844, 123).text, '12.3%'], rng, 'percent')
}

// ── 活动二、三：课本是空表，数是编的 ──

/** 3 个水龙头 10 分钟的出水量（升）：课本的空图纵轴 0–30、每格 5 */
export const TAPS: number[][] = [
  [5, 15, 25],
  [10, 20, 30],
  [5, 20, 25],
]
const tapChart = (v: number[]): StemPart => ({
  kind: 'bar-chart',
  dir: 'v',
  cats: v.map((_, i) => L('tap', { n: i + 1 })),
  series: [{ values: v }],
  step: 5,
  cells: 6,
  grid: true,
  valueAxis: L('flow'),
  catAxis: L('taps'),
})
// 带条形统计图：选项卡。错法：看错一格（±5）、只加了两个、加减弄反
function qTaps(d: Difficulty, rng: RNG): Question {
  const ti = rng.int(0, TAPS.length - 1)
  const v = TAPS[ti]!
  const stem0: StemPart[] = [tapChart(v)]
  if (rng.chance(0.6)) {
    const [a, b] = rng.pick([
      [3, 1],
      [2, 1],
      [3, 2],
    ] as [number, number][])
    const x = v[a - 1]! - v[b - 1]!
    return cards(d, `tapdiff-${ti}-${a}-${b}`, [...stem0, T('tapDiffQ', { a, b })], x, [v[a - 1]! + v[b - 1]!, x + 5, x - 5, v[a - 1]!], rng)
  }
  const sum = v[0]! + v[1]! + v[2]!
  return cards(d, `tapsum-${ti}`, [...stem0, T('tapSumQ')], sum, [sum - 5, sum + 5, v[1]! + v[2]!, v[0]! + v[1]!, sum + 10], rng)
}
/** 一周节水实验：节水前、节水后一周的用水量（升） */
export const SAVE: [number, number][] = [
  [3200, 2800],
  [2500, 2000],
  [3000, 2700],
]
function qSave(d: Difficulty, rng: RNG): Question {
  const si = rng.int(0, SAVE.length - 1)
  const [a, b] = SAVE[si]!
  const intro = T('saveIntro', { a, b })
  if (rng.chance(0.5)) return keypad(d, `save-${si}`, [intro, T('saveQ')], a - b, rng)
  const p = pctOf(a - b, a)
  return choice(d, `savepct-${si}`, [intro, T('savePctQ')], p.text, [pctOf(a - b, b).text, pctOf(b, a).text, `${(a - b) / 100}%`], rng, 'percent')
}
function qHabit(d: Difficulty, rng: RNG): Question {
  const good = rng.chance(0.5) ? 'mop' : 'veg'
  return choice(d, `habit-${good}`, [T('habitQ')], L(`h.${good}`), rng.shuffle([L('h.dish'), L('h.leak'), L('h.flush')]), rng)
}
// ── 第 2 档 ──
function qTimesWorld(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    // 5429.5 ÷ 1991.6 ≈ 2.73 → 2.7；错法：倒过来除（0.4）、去尾后再进（2.8）、相差（3437.9 当成倍数没意义，不放）
    return choice(d, 'times-world', [T('perIntro'), T('timesQ')], '2.7', ['0.4', '2.8', '3.7'], rng)
  }
  const p = pctOf(WORLD - CHINA, WORLD)
  return choice(d, 'less-pct', [T('perIntro'), T('lessPctQ'), { kind: 'text', text: PL('keep1') }], p.text, [pctOf(CHINA, WORLD).text, pctOf(WORLD - CHINA, CHINA).text, '6.3%'], rng, 'percent')
}
function qBjTj(d: Difficulty, rng: RNG): Question {
  // 52.9 ÷ 25.2 ≈ 2.099 → 2.1；错法：倒过来（0.5）、去尾（2.0）、相减（27.7）
  return choice(d, 'bjtj', [placeTable(), T('bjtjQ')], '2.1', ['0.5', '2.0', '27.7'], rng)
}
/** 关不紧的水龙头每分钟滴水（毫升），一天 24 小时浪费多少升 */
export const DRIPS = [60, 50, 25]
function qDrip(d: Difficulty, rng: RNG): Question {
  const m = rng.pick(DRIPS)
  const ml = m * 60 * 24
  const stem = [T('dripQ', { m })]
  if (ml % 1000 === 0) return keypad(d, `drip-${m}`, stem, ml / 1000, rng)
  return choice(d, `drip-${m}`, stem, fix(ml, 3), [fix(m * 60, 3), fix(ml * 10, 3), String(ml)], rng)
}
function qLag(d: Difficulty, rng: RNG): Question {
  return keypad(d, 'lag', [T('snOpen'), T('lagQ')], 1, rng)
}
// ── 第 3 档 ──
function qOver400(d: Difficulty, rng: RNG): Question {
  const n = PLACES.filter(([, v]) => v > 4000).length
  const p = pctOf(n, PLACES.length)
  return choice(d, 'over400', [placeTable(), T('over400Q'), { kind: 'text', text: PL('keep1') }], p.text, [pctOf(PLACES.length - n, PLACES.length).text, pctOf(n, 10).text, `${n}%`], rng, 'percent')
}
function qPlan(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return keypad(d, 'plan-week', [T('planQ1')], 60 * 7, rng)
  const p = pctOf(350, 420)
  return choice(d, 'plan-pct', [T('planQ2'), { kind: 'text', text: PL('keep1') }], p.text, [pctOf(70, 420).text, pctOf(420, 350).text, '35%'], rng, 'percent')
}

function gen(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.08) return qDay(d, rng)
    if (r < 0.2) return qPerCapita(d, rng)
    if (r < 0.32) return qPlaceMax(d, rng)
    if (r < 0.46) return qPlaceCalc(d, rng)
    if (r < 0.6) return qDiversion(d, rng)
    if (r < 0.68) return qEco(d, rng)
    if (r < 0.8) return qTaps(d, rng)
    if (r < 0.92) return qSave(d, rng)
    return qHabit(d, rng)
  }
  if (d === 2) {
    if (r < 0.25) return qTimesWorld(d, rng)
    if (r < 0.45) return qBjTj(d, rng)
    if (r < 0.7) return qDrip(d, rng)
    if (r < 0.85) return qLag(d, rng)
    return qPerCapita(d, rng)
  }
  if (r < 0.5) return qOver400(d, rng)
  return qPlan(d, rng)
}
defineGenerator(KP_WATER, gen)
