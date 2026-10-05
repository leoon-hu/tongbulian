import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 四上「☆ 1亿有多大」（课本 p24–27，综合与实践）：只有「算一算」能判对错——100 张纸厚 1 cm，算 1 万张、1 亿张有多高
// （「100 个一百是一万，所以 10000 张纸高 100 cm，也就是 1 m」「10000 个一万是一亿，1 亿张纸摞起来就有 10000 m 高」「比珠穆朗玛峰还高」）。
// 课本里 1 亿粒大米、写 1 亿个字、1 亿名同学手拉手、1 纳米只给结论或是小讲堂的阅读，不出题（R4g）。
// 换着纸张数和单位出：几张纸高几厘米、几米，多少张纸摞起来高几厘米、几米；几个一百是一万、几个一万是一亿；填「算一算」的表。
// 不用多位数乘法：都是「100 张 1 厘米」「1 万张 1 米」按几个一百、几个一万推出来的。题目里写「厘米」「米」（朗读读得准）。
// ─────────────────────────────────────────────────────────────

const KP = 'm4s1-02-yi'
type P = Record<string, LStr | number>
const K = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: K(k, p) })

/** 数的答案：键盘为主，偶尔选项；干扰项是十倍、百倍的错（单位换错、几个一百数错） */
function numQ(d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, wrongs: number[]): Question {
  const smart = [...new Set(wrongs.filter((w) => Number.isInteger(w) && w >= 0 && w !== value))]
  return numberQuestion({ kpId: KP, type: 'big-number', difficulty: d, sig, stem, value, rng, min: 0, max: 1e9, smart, input: rng.chance(0.75) ? 'numpad' : undefined })
}

/** N 张纸摞起来高多少厘米（100 张 1 厘米）：第 1 档几百、几千、1 万张，第 2 档几万张 */
const CM_SHEETS: Record<Difficulty, number[]> = {
  1: [200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 5000, 10000],
  2: [1500, 2500, 20000, 50000, 100000],
  3: [100000, 1000000],
}
function cmQ(d: Difficulty, rng: RNG): Question {
  const n = rng.pick(CM_SHEETS[d])
  const v = n / 100
  return numQ(d, `cm-${n}`, [T('m4.yi.cm', { n })], v, rng, [v * 10, v / 10, n / 10, n / 10000])
}

/** N 张纸摞起来高多少米（1 万张高 1 米）：课本问的 1 亿张单独一句（写「1 亿」） */
const M_SHEETS: Record<Difficulty, number[]> = {
  1: [10000, 20000, 30000, 50000, 100000, 1000000, 10000000],
  2: [200000, 500000, 2000000, 5000000, 50000000],
  3: [3000000, 20000000, 50000000],
}
function mQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(d === 1 ? 0.3 : 0.15)) return numQ(d, 'm-yi', [T('m4.yi.yiM')], 10000, rng, [1000, 100000, 1000000, 100])
  const n = rng.pick(M_SHEETS[d])
  const v = n / 10000
  return numQ(d, `m-${n}`, [T('m4.yi.m', { n })], v, rng, [v * 10, v * 100, v / 10, n / 100])
}

/** 多少张纸摞起来高 h 厘米 / h 米 */
function sheetsQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const h = rng.pick(d === 1 ? [1, 2, 3, 5, 10, 50, 100] : [20, 30, 80, 200, 500])
    const v = h * 100
    return numQ(d, `scm-${h}`, [T('m4.yi.sheetsCm', { h })], v, rng, [h * 10, h * 1000, h * 10000, h])
  }
  const h = rng.pick(d === 1 ? [1, 2, 5, 10, 100, 1000, 10000] : [3, 20, 50, 500, 2000])
  const v = h * 10000
  return numQ(d, `sm-${h}`, [T('m4.yi.sheetsM', { h })], v, rng, [h * 100, h * 1000, h * 100000, h])
}

/** 10000 张纸高 100 厘米，也就是多少米（课本的话） */
function cmToMQ(d: Difficulty, rng: RNG): Question {
  return numQ(d, 'cm2m', [T('m4.yi.cmToM')], 1, rng, [10, 100, 1000])
}

/** 几个一百是一万、几个一万是一亿（键盘）；100 个一百、10000 个一万是多少（选项是计数单位，答错时读数） */
function factQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 4)
  if (kind === 0) return numQ(d, 'f-100s', [T('m4.yi.hundreds')], 100, rng, [10, 1000, 10000])
  if (kind === 1) return numQ(d, 'f-wans', [T('m4.yi.wans')], 10000, rng, [1000, 100, 100000])
  if (kind === 2) return numQ(d, 'f-qianwans', [T('m4.yi.qianwans')], 10, rng, [100, 1000, 10000])
  const big = kind === 4
  const correct = big ? 'm4.yi.w.yi' : 'm4.yi.w.wan'
  const wrongs = big ? ['m4.yi.w.qianwan', 'm4.yi.w.shiyi', 'm4.yi.w.baiwan'] : ['m4.yi.w.qian', 'm4.yi.w.shiwan', 'm4.yi.w.baiwan']
  const q = labelQuestion({ kpId: KP, type: 'big-number', difficulty: d, sig: big ? 'f-wanwan' : 'f-baibai', stem: [T(big ? 'm4.yi.wanWans' : 'm4.yi.hundredHundreds')], correct: K(correct), distractors: wrongs.map((w) => K(w)), rng })
  const id = q.answer.kind === 'choice' ? q.answer.choiceId : ''
  q.choices = q.choices!.map((c) => (c.id === id ? { ...c, say: big ? '100000000' : '10000' } : c))
  return q
}

/** 课本「算一算」的表：纸张数 100 / 10000 / 100000000，高度 1 厘米 / ? / ?——填一格（键盘，按的数填进表里） */
function tableQ(d: Difficulty, rng: RNG): Question {
  const askWan = rng.chance(0.5)
  const inCm = askWan && rng.chance(0.5)
  const value = askWan ? (inCm ? 100 : 1) : 10000
  const rows: (number | LStr | null)[][] = [
    [K('m4.yi.head.sheets'), 100, 10000, 100000000],
    [K('m4.yi.head.height'), K('m4.yi.cell.cm', { n: 1 }), askWan ? null : K('m4.yi.cell.m', { n: 1 }), askWan ? K('m4.yi.cell.m', { n: 10000 }) : null],
  ]
  const key = inCm ? 'm4.yi.tableCm' : 'm4.yi.tableM'
  return numQ(d, `tbl-${askWan ? (inCm ? 'wcm' : 'wm') : 'ym'}`, [T(key), { kind: 'stat-table', rows, head: 'col' }], value, rng, [value * 10, value * 100, value / 10, value / 100])
}

/** 1 亿张纸摞起来大约高 10000 米，比珠穆朗玛峰（8800 多米）高（课本的「哇，比珠穆朗玛峰还高」） */
function everestQ(d: Difficulty, rng: RNG): Question {
  const high = rng.chance(0.5)
  return labelQuestion({ kpId: KP, type: 'big-number', difficulty: d, sig: `ev-${high ? 'h' : 'l'}`, stem: [T(high ? 'm4.yi.everestHigh' : 'm4.yi.everestLow')], correct: K(high ? 'm4.yi.yes' : 'm4.yi.no'), distractors: [K(high ? 'm4.yi.no' : 'm4.yi.yes')], rng })
}

/** 第 2、3 档：1 亿张纸高多少千米、多少张纸摞起来高 1 千米（1 千米 = 1000 米，三年级学过） */
function kmQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return numQ(d, 'km-yi', [T('m4.yi.yiKm')], 10, rng, [10000, 100, 1])
  const h = rng.pick([1, 2, 5])
  const v = h * 10000000
  return numQ(d, `skm-${h}`, [T('m4.yi.sheetsKm', { h })], v, rng, [h * 10000, h * 1000000, h * 100000000])
}

type Maker = (d: Difficulty, rng: RNG) => Question
const TABLE: Record<Difficulty, [number, Maker][]> = {
  1: [
    [22, cmQ],
    [22, mQ],
    [18, sheetsQ],
    [6, cmToMQ],
    [16, factQ],
    [10, tableQ],
    [6, everestQ],
  ],
  2: [
    [25, cmQ],
    [25, mQ],
    [25, sheetsQ],
    [10, factQ],
    [15, kmQ],
  ],
  3: [
    [30, mQ],
    [30, sheetsQ],
    [40, kmQ],
  ],
}
defineGenerator(KP, (d, rng) => {
  const table = TABLE[d]
  const total = table.reduce((s, [w]) => s + w, 0)
  let r = rng.next() * total
  for (const [w, make] of table) {
    if (r < w) return make(d, rng)
    r -= w
  }
  return table[table.length - 1]![1](d, rng)
})
