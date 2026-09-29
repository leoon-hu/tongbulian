import type { Difficulty, FracPic, LStr, MoneyPiece, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 小数的初步认识（三下六）：认识小数、小数的大小比较、简单的小数加减法。
// 课本的范围：小数最多两位；加减只算一位小数（进位 / 退位都有，整数部分到两位）；两位小数只读写、比大小。
// 数字键盘没有小数点：答案是小数的一律选项卡，能问整数的才用键盘（0.7 里面有几个 0.1、0.8 元是几角、1.20 米是多少厘米）。
// 钱写「3.5 元」，不写 ¥。数在程序里一律用整数表示：一位小数按「几个 0.1」（tenths）、两位按「几个 0.01」，免得浮点误差。
// 答案避开「x.0」（课本这一单元没学小数的性质，5.0 和 5 算不算一样没讲），数列里照课本写「3.0」。
// ─────────────────────────────────────────────────────────────

/** 一位小数：t 个 0.1 → 「2.3」 */
const d1 = (t: number): string => `${Math.floor(t / 10)}.${t % 10}`
/** 两位小数：h 个 0.01 → 「1.34」「0.05」 */
const d2 = (h: number): string => `${Math.floor(h / 100)}.${String(h % 100).padStart(2, '0')}`
/** 一位小数，整十的写成整数（「6」「6.6」：加减法的算式里） */
const d1n = (t: number): string => (t % 10 ? d1(t) : String(t / 10))
const milli = (s: string): number => {
  const m = /^(\d+)\/(\d+)$/.exec(s)
  return m ? Math.round((Number(m[1]) / Number(m[2])) * 1000) : Math.round(Number(s) * 1000)
}
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)
const T = (k: string, p?: Record<string, LStr | number>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
/** 合规的数：整数或小数（不以 0 开头的多位整数部分），末尾不是「.0」 */
const WELL_FORMED = /^(0|[1-9]\d*)(\.\d+)?$/

/**
 * 小数（或整数）选项的干扰项：写法合规、和正确答案不相等、彼此不相等，按给的顺序取前 count 个。
 * 不出「x.0」（与整数 x 相等，课本没讲）。
 */
export function decWrongs(correct: string, cands: string[], count = 3): string[] {
  const out: string[] = []
  const cv = milli(correct)
  for (const c of cands) {
    if (!WELL_FORMED.test(c) || /\.0$/.test(c)) continue
    if (milli(c) === cv || out.some((o) => milli(o) === milli(c))) continue
    out.push(c)
    if (out.length >= count) break
  }
  return out
}

type Unit = 'm' | 'dm' | 'yuan' | 't' | 'km'
/** 小数答案的选择题；unit 给了就把每个选项写成「0.3 米」 */
function decQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: string, cands: string[], rng: RNG, unit?: Unit): Question {
  const wrap = (s: string): LStr => (unit ? { k: `m3.dec.u.${unit}`, p: { n: s } } : s)
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig, stem, correct: wrap(correct), distractors: decWrongs(correct, cands).map(wrap), rng })
}
/** 整数答案（键盘或选项） */
function intQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[], max = 999): Question {
  return numberQuestion({ kpId, type: 'decimal', difficulty: d, sig, stem, value, rng, min: 0, max, smart: smart.filter((x) => Number.isInteger(x) && x >= 0 && x !== value) })
}
/** > < = 选项 */
function cmpQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], a: string, b: string, rng: RNG): Question {
  const x = milli(a)
  const y = milli(b)
  const correct = x > y ? '>' : x < y ? '<' : '='
  return labelQuestion({ kpId, type: 'compare', difficulty: d, sig, stem, correct, distractors: ['>', '<', '='].filter((s) => s !== correct), rng })
}
const picPart = (...items: FracPic[]): StemPart => ({ kind: 'frac-shape', items })
/** 十等分的正方形：涂前 k 条；whole = 前面再画几个整个涂满的 */
const tenths = (k: number, whole = 0, label?: string): FracPic => ({ shape: 'square', parts: 10, shaded: range(k), ...(whole ? { whole } : {}), ...(label ? { label } : {}) })

// ── 读法：「三点四五」（要注音：数字是词条），英文整句「three point four five」──
const DIG = (n: number): LStr => ({ k: `m3.dec.d.${n}` })
const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const enInt = (i: number): string => (i < 20 ? EN_ONES[i]! : `${EN_TENS[Math.floor(i / 10)]}${i % 10 ? `-${EN_ONES[i % 10]}` : ''}`)
/** 整数部分（0–99）的读法：零、三、十、十八、三十六 */
function intWords(i: number): LStr {
  if (i < 10) return DIG(i)
  const t = Math.floor(i / 10)
  const o = i % 10
  return { k: 'm3.dec.tens', p: { a: t === 1 ? '' : DIG(t), b: o ? DIG(o) : '' } }
}
/** 一个小数（一位或两位）的读法：整数部分按整数读，小数部分一位一位读，0 读「零」 */
export function decReading(x: string): LStr {
  const [ip, fp = ''] = x.split('.')
  const i = Number(ip)
  const ds = [...fp].map(Number)
  const en = `${enInt(i)} point ${ds.map((n) => EN_ONES[n]).join(' ')}`
  if (ds.length === 1) return { k: 'm3.dec.read1', p: { i: intWords(i), a: DIG(ds[0]!), en } }
  return { k: 'm3.dec.read2', p: { i: intWords(i), a: DIG(ds[0]!), b: DIG(ds[1]!), en } }
}

// ═════════════════════════════════════════════════════════════
// 认识小数（p86–88、练习十六 1 / 2、练习十七 1 / 2）
// ═════════════════════════════════════════════════════════════

/** 几分米是多少米、几角是多少元（1 分米是 1/10 米，也可以写成 0.1 米） */
function tenthUnit(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(1, 9)
  const money = rng.chance(0.5)
  return decQ(kpId, d, `${money ? 'j2y' : 'dm2m'}-${n}`, [T(money ? 'm3.dec.jiaoToYuan' : 'm3.dec.dmToM', { n })], `0.${n}`, [String(n), `0.0${n}`, `${n}0`], rng, money ? 'yuan' : 'm')
}

/** 几米几分米、几元几角写成小数（1 米 3 分米是 1.3 米） */
function mixedTenth(kpId: string, d: Difficulty, rng: RNG): Question {
  const money = rng.chance(0.5)
  const a = money ? rng.int(1, 9) : rng.int(1, 3)
  const b = rng.int(1, 9)
  return decQ(kpId, d, `${money ? 'yj' : 'mdm'}-${a}-${b}`, [T(money ? 'm3.dec.yjToYuan' : 'm3.dec.mdmToM', { a, b })], `${a}.${b}`, [`${a}.0${b}`, `${b}.${a}`, `${a}${b}`, String(a + b)], rng, money ? 'yuan' : 'm')
}

/** 看钱写小数（练习十六 2）：几张 / 几枚元和角 */
function moneyPic(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(1, 9)
  const j = rng.int(1, 9)
  const pieces: MoneyPiece[] = []
  if (a >= 5) pieces.push({ fen: 500, form: 'note' })
  for (let i = 0; i < a % 5; i++) pieces.push({ fen: 100, form: 'coin' })
  if (j >= 5) pieces.push({ fen: 50, form: 'coin' })
  for (let i = 0; i < j % 5; i++) pieces.push({ fen: 10, form: 'coin' })
  return decQ(kpId, d, `money-${a}-${j}`, [T('m3.dec.money'), { kind: 'money', pieces }], `${a}.${j}`, [`${a}.0${j}`, `${j}.${a}`, String(a + j), `${a}${j}`], rng, 'yuan')
}

/** 十等分的正方形涂了几条：0.k（第 2 档起前面还有整个涂满的：1.k、2.k） */
function barDec(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.int(1, 9)
  const whole = d >= 2 && rng.chance(0.5) ? rng.int(1, 2) : 0
  const c = `${whole}.${k}`
  const stem: StemPart[] = [T(whole ? 'm3.dec.barWhole' : 'm3.dec.bar'), picPart(tenths(k, whole))]
  return decQ(kpId, d, `bar-${whole}-${k}`, stem, c, [`${whole}.${10 - k}`, `${whole}.0${k}`, whole ? `${whole + 1}.${k}` : String(k), whole ? `${k}.${whole}` : `1.${k}`], rng)
}

/** 0.k 里面有几个 0.1（键盘）；第 3 档整数部分不是 0（1.3 里面有 13 个 0.1） */
function tenthsIn(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.int(2, 9)
  const a = d === 3 ? rng.int(1, 3) : 0
  const t = a * 10 + k
  return intQ(kpId, d, `tin-${t}`, [T('m3.dec.tenthsIn', { x: d1(t) })], t, rng, [k, t + 1, t - 1, a], 99)
}

/** k 个 0.1 是多少（选项） */
function tenthsMake(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.int(2, 9)
  return decQ(kpId, d, `tmake-${k}`, [T('m3.dec.tenthsMake', { k })], `0.${k}`, [String(k), `0.0${k}`, `${k}0`, `1.${k}`], rng)
}

/** k/10 米写成小数（5/10 米 = 0.5 米）；第 3 档 k/100 写成小数（7/100 = 0.07） */
function fracToDec(kpId: string, d: Difficulty, rng: RNG): Question {
  if (d === 3 && rng.chance(0.6)) {
    const k = rng.chance(0.5) ? rng.int(1, 9) : rng.int(11, 99)
    if (k % 10 === 0) return fracToDec(kpId, d, rng)
    const c = d2(k)
    const cands = k < 10 ? [`0.${k}`, String(k), `${k}0`] : [d1(k), String(k), `0.${k % 10}${Math.floor(k / 10)}`]
    return decQ(kpId, d, `f2d-${k}-100`, [T('m3.dec.fracToDec', { f: `${k}/100` })], c, cands, rng)
  }
  const k = rng.int(1, 9)
  return decQ(kpId, d, `f2dm-${k}`, [T('m3.dec.fracMToDec', { f: `${k}/10` })], `0.${k}`, [`${k}.10`, `0.0${k}`, String(k)], rng, 'm')
}

/** 0.k 写成分数（选项是分数） */
function decToFrac(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.int(2, 9)
  const correct = `${k}/10`
  const cands = [`${k}/100`, `1/${k}`, `10/${k}`].filter((c) => milli(c) !== milli(correct))
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `d2f-${k}`, stem: [T('m3.dec.decToFrac', { x: `0.${k}` })], correct, distractors: cands, rng })
}

/** 「三点五」写作什么：一位小数（第 2 档两位，第 3 档带 0 的、整数部分两位的） */
function writeAs(kpId: string, d: Difficulty, rng: RNG): Question {
  let c: string
  let cands: string[]
  if (d === 1) {
    const x = rng.chance(0.4) ? 0 : rng.int(1, 9)
    const y = rng.int(1, 9)
    c = `${x}.${y}`
    cands = x === 0 ? [String(y), `0.0${y}`, `${y}0`] : [`${x}${y}`, `${y}.${x}`, `${x}.0${y}`]
  } else if (d === 2) {
    const x = rng.chance(0.4) ? 0 : rng.int(1, 9)
    const p = rng.int(0, 9)
    const q = rng.int(1, 9)
    c = `${x}.${p}${q}`
    cands = [`${x}${p}.${q}`, `${x}.${q}${p}`, `${x}${p}${q}`, `${p}${q}`, `${x}.${q}`, `${x}.0${p}${q}`]
  } else {
    // 课本读法里最容易错的：3.05（中间的 0 读「零」）、4.20（末尾的 0 也要读）、18.5 / 36.6（整数部分两位）
    const kind = rng.int(0, 2)
    if (kind === 0) {
      const x = rng.int(1, 9)
      const q = rng.int(1, 9)
      c = `${x}.0${q}`
      cands = [`${x}.${q}`, `${x}0.${q}`, `${x}0${q}`]
    } else if (kind === 1) {
      const x = rng.int(1, 9)
      const p = rng.int(1, 9)
      c = `${x}.${p}0`
      cands = [`${x}.0${p}`, `${x}${p}`, `${x}0.${p}`, `${x}${p}0`]
    } else {
      const i = rng.int(10, 99)
      const p = rng.int(1, 9)
      c = `${i}.${p}`
      cands = [`${Math.floor(i / 10)}.${i % 10}${p}`, `${i}${p}`, `${i}.0${p}`]
    }
  }
  return decQ(kpId, d, `write-${c}`, [T('m3.dec.writeAs', { r: decReading(c) })], c, cands, rng)
}

/** 小数换回整数问（键盘）：0.8 元是几角、1.3 米是 1 米几分米 */
function toWhole(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.int(1, 9)
  if (rng.chance(0.5)) return intQ(kpId, d, `y2j-${k}`, [T('m3.dec.yuanToJiao', { x: `0.${k}` })], k, rng, [k * 10, k + 1, 10 - k], 99)
  const a = rng.int(1, 3)
  return intQ(kpId, d, `m2dm-${a}-${k}`, [T('m3.dec.mToDm', { x: `${a}.${k}`, a })], k, rng, [a, a * 10 + k, k + 1], 99)
}

/** 几厘米 / 几分是多少米 / 元（两位小数：1 厘米是 1/100 米，写成小数是 0.01 米） */
function hundredthUnit(kpId: string, d: Difficulty, rng: RNG): Question {
  const money = rng.chance(0.4)
  if (money) {
    const n = rng.int(1, 9)
    return decQ(kpId, d, `f2y-${n}`, [T('m3.dec.fenToYuan', { n })], `0.0${n}`, [`0.${n}`, String(n), `${n}0`], rng, 'yuan')
  }
  let n = rng.chance(0.75) ? rng.int(11, 99) : rng.int(1, 9)
  if (n % 10 === 0) n += 1
  const cands = n < 10 ? [`0.${n}`, String(n), `${n}0`] : [d1(n), String(n), `0.${n % 10}${Math.floor(n / 10)}`]
  return decQ(kpId, d, `cm2m-${n}`, [T('m3.dec.cmToM', { n })], d2(n), cands, rng, 'm')
}

/** 1 米 34 厘米、1 元 8 角 5 分写成小数 */
function mixedHundredth(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const a = rng.int(1, 9)
    const j = rng.int(1, 9)
    const f = rng.int(1, 9)
    return decQ(kpId, d, `yjf-${a}-${j}-${f}`, [T('m3.dec.yjfToYuan', { a, b: j, c: f })], `${a}.${j}${f}`, [`${a}.${f}${j}`, `${a}${j}.${f}`, `${a}${j}${f}`, `${a}.0${j}`], rng, 'yuan')
  }
  const a = rng.int(1, 2)
  let b = rng.int(11, 99)
  if (b % 10 === 0) b += 1
  const t = Math.floor(b / 10)
  const o = b % 10
  return decQ(kpId, d, `mcm-${a}-${b}`, [T('m3.dec.mcmToM', { a, b })], `${a}.${b}`, [`${a}${t}.${o}`, `${a}.${o}${t}`, `${a}${b}`, `${a}.0${b}`], rng, 'm')
}

/** 两位小数换回整数问（键盘）：0.34 米是几厘米、有几个 0.01 米，0.05 元是几分 */
function toWhole2(kpId: string, d: Difficulty, rng: RNG): Question {
  const h = rng.chance(0.8) ? rng.int(11, 99) : rng.int(2, 9)
  const kind = rng.int(0, 2)
  if (kind === 0) return intQ(kpId, d, `m2cm-${h}`, [T('m3.dec.mToCm', { x: d2(h) })], h, rng, [Math.floor(h / 10), h * 10, h + 1], 999)
  if (kind === 1) return intQ(kpId, d, `hin-${h}`, [T('m3.dec.hundredthsIn', { x: d2(h) })], h, rng, [Math.floor(h / 10), h % 10, h + 1], 999)
  return intQ(kpId, d, `y2f-${h}`, [T('m3.dec.yuanToFen', { x: d2(h) })], h, rng, [Math.floor(h / 10), h * 10, h + 1], 999)
}

/** 整数、分数、小数分类（练习十七 1）：哪个数是小数 / 分数 / 整数 */
const DECS = ['0.9', '4.20', '18.5', '0.03', '0.86', '2.60', '36.6', '3.45', '0.5', '1.2']
const FRACS = ['2/3', '3/10', '7/100', '1/2', '5/8', '3/4']
const INTS = ['20', '4', '35', '12', '7', '100']
function classify(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 2)
  const [key, pool, others] =
    kind === 0 ? (['m3.dec.whichDec', DECS, [...FRACS, ...INTS]] as const) : kind === 1 ? (['m3.dec.whichFrac', FRACS, [...DECS, ...INTS]] as const) : (['m3.dec.whichInt', INTS, [...DECS, ...FRACS]] as const)
  const correct = rng.pick(pool)
  // 选项的值也互不相等（1/2 和 0.5 不同时出现，免得孩子以为「一样大」就都对）
  const wrong: string[] = []
  for (const o of rng.shuffle([...others])) if (wrong.length < 3 && ![correct, ...wrong].some((x) => milli(x) === milli(o))) wrong.push(o)
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `class-${kind}-${correct}-${[...wrong].sort().join(',')}`, stem: [T(key)], correct, distractors: wrong, rng })
}

/** 尺子上量出几厘米，是多少分米（1 厘米 = 0.1 分米，做一做 1） */
function rulerDm(kpId: string, d: Difficulty, rng: RNG): Question {
  const c = rng.int(1, 9)
  const s = rng.int(0, Math.min(3, 10 - c))
  return decQ(kpId, d, `rdm-${s}-${c}`, [T('m3.dec.rulerDm'), { kind: 'ruler', length: 10, from: s, to: s + c }], `0.${c}`, [String(c), `0.0${c}`, `0.${s + c}`, `${c}0`], rng, 'dm')
}

defineGenerator('m3s2-07-know', (d, rng) => {
  const kpId = 'm3s2-07-know'
  const roll = rng.next()
  if (d === 1) {
    // 主干：一位小数——几分米 / 几角是零点几米 / 元、几米几分米、看钱写小数、十等分图、几个 0.1、读法
    if (roll < 0.17) return tenthUnit(kpId, d, rng)
    if (roll < 0.32) return mixedTenth(kpId, d, rng)
    if (roll < 0.45) return moneyPic(kpId, d, rng)
    if (roll < 0.58) return barDec(kpId, d, rng)
    if (roll < 0.68) return tenthsIn(kpId, d, rng)
    if (roll < 0.76) return tenthsMake(kpId, d, rng)
    if (roll < 0.84) return fracToDec(kpId, d, rng)
    if (roll < 0.92) return writeAs(kpId, d, rng)
    return toWhole(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.22) return hundredthUnit(kpId, d, rng)
    if (roll < 0.42) return mixedHundredth(kpId, d, rng)
    if (roll < 0.57) return writeAs(kpId, d, rng)
    if (roll < 0.72) return toWhole2(kpId, d, rng)
    if (roll < 0.82) return decToFrac(kpId, d, rng)
    if (roll < 0.92) return barDec(kpId, d, rng)
    return toWhole(kpId, d, rng)
  }
  if (roll < 0.22) return classify(kpId, d, rng)
  if (roll < 0.44) return writeAs(kpId, d, rng)
  if (roll < 0.62) return fracToDec(kpId, d, rng)
  if (roll < 0.8) return rulerDm(kpId, d, rng)
  if (roll < 0.9) return tenthsIn(kpId, d, rng)
  return mixedHundredth(kpId, d, rng)
})

// ═════════════════════════════════════════════════════════════
// 小数的大小比较（p89、练习十六 3、练习十七 2 / 4、练习十八 6）
// ═════════════════════════════════════════════════════════════

/** 两个一位小数比大小（整数部分相同或不同）；一半带单位（0.6 元 ○ 0.9 元、3.8 米 ○ 4.5 米） */
function cmp1(kpId: string, d: Difficulty, rng: RNG): Question {
  let a: number
  let b: number
  if (rng.chance(0.5)) {
    const i = rng.int(0, 9)
    a = i * 10 + rng.int(1, 9)
    do b = i * 10 + rng.int(1, 9)
    while (b === a)
  } else {
    a = rng.int(0, 9) * 10 + rng.int(1, 9)
    do b = rng.int(0, 9) * 10 + rng.int(1, 9)
    while (Math.floor(b / 10) === Math.floor(a / 10))
  }
  const unit = rng.pick([null, 'm', 'yuan'] as const)
  const cmp: StemPart = unit ? T(unit === 'm' ? 'm3.dec.cmpM' : 'm3.dec.cmpYuan', { a: d1(a), b: d1(b) }) : { kind: 'expr', expr: `${d1(a)} ○ ${d1(b)}` }
  return cmpQ(kpId, d, `c1-${unit ?? 'n'}-${a}-${b}`, [T('m3.dec.compare'), cmp], d1(a), d1(b), rng)
}

/** 看图比较（做一做 2）：两张十等分图，0.4 ○ 0.6；第 2 档起带整个的（2.5 ○ 1.8） */
function barCmp(kpId: string, d: Difficulty, rng: RNG): Question {
  const wholes = d >= 2 && rng.chance(0.6)
  const w1 = wholes ? rng.int(1, 2) : 0
  const w2 = wholes ? rng.int(1, 2) : 0
  const k1 = rng.int(1, 9)
  let k2 = rng.int(1, 9)
  if (w1 === w2 && k2 === k1) k2 = k1 === 9 ? 8 : k1 + 1
  const a = `${w1}.${k1}`
  const b = `${w2}.${k2}`
  return cmpQ(kpId, d, `bar-${a}-${b}`, [T('m3.dec.compare'), picPart(tenths(k1, w1, a), tenths(k2, w2, b)), { kind: 'expr', expr: `${a} ○ ${b}` }], a, b, rng)
}

/** 数轴 / 米尺上箭头指的小数（做一做 1、练习十八 6）：0–1、0–2 或 0–3 米，每小格 0.1 米 */
function lineRead(kpId: string, d: Difficulty, rng: RNG): Question {
  const units = d === 1 ? rng.int(1, 2) : rng.int(2, 3)
  let k = rng.int(1, units * 10 - 1)
  if (k % 10 === 0) k += 1
  const cands = [d1(k + 1), d1(k - 1), k > 10 ? `0.${k % 10}` : `1.${k}`, `${k % 10}.${Math.floor(k / 10)}`, d1(k + 10)]
  return decQ(kpId, d, `line-${units}-${k}`, [T('m3.dec.arrowM'), { kind: 'frac-line', units, per: 10, arrow: k, unit: 'm' }], d1(k), cands, rng, 'm')
}

/** 几个小数里哪个最大 / 最小 */
function pickExtreme(kpId: string, d: Difficulty, rng: RNG, two: boolean): Question {
  const vals = new Set<string>()
  const i = rng.int(0, 5)
  while (vals.size < (two ? 4 : 3)) {
    if (two) vals.add(rng.chance(0.5) ? d2((i + rng.int(0, 1)) * 100 + rng.int(1, 99)) : d1((i + rng.int(0, 1)) * 10 + rng.int(1, 9)))
    else vals.add(d1((i + rng.int(0, 1)) * 10 + rng.int(1, 9)))
  }
  const list = [...vals].filter((v) => !/0$/.test(v.split('.')[1] ?? '1'))
  if (new Set(list.map(milli)).size !== list.length || list.length < 3) return pickExtreme(kpId, d, rng, two)
  const max = rng.chance(0.5)
  const pick = list.reduce((m, v) => ((max ? milli(v) > milli(m) : milli(v) < milli(m)) ? v : m))
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `ext-${max ? 'max' : 'min'}-${[...list].sort().join(',')}`, stem: [T(max ? 'm3.dec.maxOf' : 'm3.dec.minOf')], correct: pick, distractors: list.filter((v) => v !== pick), rng })
}

/** 两位小数比大小（1.15 元 ○ 1.51 元、0.88 ○ 0.96、10 元 ○ 9.9 元、0.5 ○ 0.45） */
function cmp2(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  let a: string
  let b: string
  if (kind === 0) {
    const i = rng.int(0, 5)
    const p = rng.int(1, 9)
    let q = rng.int(1, 9)
    if (q === p) q = p === 9 ? 8 : p + 1
    ;[a, b] = [`${i}.${p}${q}`, `${i}.${q}${p}`]
  } else if (kind === 1) {
    const i = rng.int(0, 3)
    ;[a, b] = [d2(i * 100 + rng.int(11, 99)), d2(i * 100 + rng.int(11, 99))]
    if (a === b || /0$/.test(a) || /0$/.test(b)) return cmp2(kpId, d, rng)
  } else if (kind === 2) {
    const n = rng.int(2, 20)
    ;[a, b] = [String(n), d1((n - 1) * 10 + rng.int(1, 9))]
  } else {
    const t = rng.int(1, 9)
    const h = rng.int(1, 99)
    if (h % 10 === 0 || Math.floor(h / 10) === t) return cmp2(kpId, d, rng)
    ;[a, b] = [`0.${t}`, d2(h)]
  }
  if (rng.chance(0.5)) [a, b] = [b, a]
  const unit = rng.pick([null, 'm', 'yuan'] as const)
  const cmp: StemPart = unit ? T(unit === 'm' ? 'm3.dec.cmpM' : 'm3.dec.cmpYuan', { a, b }) : { kind: 'expr', expr: `${a} ○ ${b}` }
  return cmpQ(kpId, d, `c2-${unit ?? 'n'}-${a}-${b}`, [T('m3.dec.compare'), cmp], a, b, rng)
}

/** 四名男生的跳高成绩（例 3）：谁是第一名 / 第四名 */
const JUMP = [88, 96, 110, 120, 105, 92, 99, 115, 125, 101, 90, 130, 85, 118, 108, 95]
const JUMPERS = ['ming', 'gang', 'qiang', 'lin'] as const
function jump(kpId: string, d: Difficulty, rng: RNG): Question {
  const vals = rng.shuffle(JUMP).slice(0, 4)
  const first = rng.chance(0.5)
  const pickIdx = vals.indexOf(first ? Math.max(...vals) : Math.min(...vals))
  const score = (i: number): LStr => ({ k: 'm3.dec.score', p: { who: { k: `m3.dec.who.${JUMPERS[i]}` }, x: d2(vals[i]!) } })
  return labelQuestion({
    kpId,
    type: 'decimal',
    difficulty: d,
    sig: `jump-${first ? 1 : 4}-${vals.join(',')}`,
    stem: [T('m3.dec.jump', { a: score(0), b: score(1), c: score(2), d: score(3), ask: { k: first ? 'm3.dec.jumpFirst' : 'm3.dec.jumpLast' } })],
    correct: { k: `m3.dec.who.${JUMPERS[pickIdx]}` },
    distractors: JUMPERS.filter((_, i) => i !== pickIdx).map((w) => ({ k: `m3.dec.who.${w}` })),
    rng,
  })
}

/** 化成厘米来比较：1.20 米是多少厘米（键盘） */
function mToCm(kpId: string, d: Difficulty, rng: RNG): Question {
  const h = rng.chance(0.3) ? rng.int(5, 19) * 10 : rng.int(50, 199)
  return intQ(kpId, d, `m2cm-${h}`, [T('m3.dec.mToCm', { x: d2(h) })], h, rng, [Math.floor(h / 10), h * 10, h + 1], 999)
}

/** 小数和分数、换了单位的比（练习十六 3）：0.27 米 ○ 27/100 米、2 分米 ○ 7/10 米、0.5 元 ○ 5 角、35 厘米 ○ 0.4 米 */
function cmpMixed(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  let text: StemPart
  let a: string // 统一换成「米」「元」比
  let b: string
  if (kind === 0) {
    const h = rng.int(11, 99)
    const k = rng.pick([h, h, h + 1, h - 1])
    const two = h % 10 !== 0 && rng.chance(0.6)
    const x = two ? d2(h) : `0.${Math.floor(h / 10)}`
    const xv = two ? h : Math.floor(h / 10) * 10
    const f = two ? `${k}/100` : `${rng.pick([xv / 10, xv / 10, xv / 10 + 1, Math.max(1, xv / 10 - 1)])}/10`
    ;[a, b] = [x, f]
    if (rng.chance(0.5)) [a, b] = [b, a]
    text = T('m3.dec.cmpM', { a, b })
  } else if (kind === 1) {
    const n = rng.int(1, 9)
    const k = rng.int(1, 9)
    const f = rng.chance(0.5) ? `${k}/10` : `0.${k}`
    text = T('m3.dec.cmpDmM', { a: n, b: f })
    ;[a, b] = [`0.${n}`, f]
  } else if (kind === 2) {
    const k = rng.int(1, 9)
    const j = rng.pick([k, k, rng.int(1, 9)])
    text = T('m3.dec.cmpYJ', { a: `0.${k}`, b: j })
    ;[a, b] = [`0.${k}`, `0.${j}`]
  } else {
    const c = rng.int(11, 99)
    const t = rng.pick([Math.floor(c / 10), Math.floor(c / 10) + 1, Math.floor(c / 10) - 1].filter((x) => x >= 1 && x <= 9))
    text = T('m3.dec.cmpCmM', { a: c, b: `0.${t}` })
    ;[a, b] = [d2(c), `0.${t}`]
  }
  return cmpQ(kpId, d, `cm-${kind}-${JSON.stringify(text.kind === 'text' ? text.text : '')}`, [T('m3.dec.compare'), text], a, b, rng)
}

/** 价钱排大小（练习十七 2）：3.5 元、0.5 元、4.99 元、3.49 元，哪个最贵 / 最便宜；一半是整数部分都一样的（要看十分位、百分位） */
function prices(kpId: string, d: Difficulty, rng: RNG): Question {
  let vals: string[]
  const i = rng.int(2, 7)
  if (rng.chance(0.5)) {
    const t = rng.int(3, 8)
    vals = [`${i}.${t}`, `${i}.${t - 1}${rng.int(1, 9)}`, `0.${rng.int(1, 9)}`, `${i + 1}.${rng.int(1, 9)}${rng.int(1, 9)}`]
  } else {
    const set = new Set<string>()
    while (set.size < 4) set.add(rng.chance(0.5) ? `${i}.${rng.int(1, 9)}` : `${i}.${rng.int(0, 9)}${rng.int(1, 9)}`)
    vals = [...set]
    if (new Set(vals.map(milli)).size < 4) return prices(kpId, d, rng)
  }
  const max = rng.chance(0.5)
  const pick = vals.reduce((m, v) => ((max ? milli(v) > milli(m) : milli(v) < milli(m)) ? v : m))
  const wrap = (s: string): LStr => ({ k: 'm3.dec.u.yuan', p: { n: s } })
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `price-${max ? 'max' : 'min'}-${[...vals].sort().join(',')}`, stem: [T(max ? 'm3.dec.priceMax' : 'm3.dec.priceMin')], correct: wrap(pick), distractors: vals.filter((v) => v !== pick).map(wrap), rng })
}

/** 1、2、3 和小数点四张卡片（练习十七 4）：最大的、最小的、一共几个（12 个） */
function cards(kpId: string, d: Difficulty, rng: RNG): Question {
  const ds = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3).sort((x, y) => x - y)
  const [a, b, c] = ds as [number, number, number]
  const kind = rng.int(0, 2)
  const p = { a, b, c }
  if (kind === 2) return intQ(kpId, d, `cards-n-${a}${b}${c}`, [T('m3.dec.cardsCount', p)], 12, rng, [6, 3, 9], 99)
  if (kind === 0) return decQ(kpId, d, `cards-max-${a}${b}${c}`, [T('m3.dec.cardsMax', p)], `${c}${b}.${a}`, [`${c}.${b}${a}`, `${c}${a}.${b}`, `${b}${c}.${a}`], rng)
  return decQ(kpId, d, `cards-min-${a}${b}${c}`, [T('m3.dec.cardsMin', p)], `${a}.${b}${c}`, [`${a}.${c}${b}`, `${a}${b}.${c}`, `${b}.${a}${c}`], rng)
}

defineGenerator('m3s2-07-compare', (d, rng) => {
  const kpId = 'm3s2-07-compare'
  const roll = rng.next()
  if (d === 1) {
    // 主干：一位小数比大小（带不带单位）、看十等分图比、米尺上读一位小数、几个一位小数挑最大 / 最小
    if (roll < 0.45) return cmp1(kpId, d, rng)
    if (roll < 0.62) return barCmp(kpId, d, rng)
    if (roll < 0.85) return lineRead(kpId, d, rng)
    return pickExtreme(kpId, d, rng, false)
  }
  if (d === 2) {
    if (roll < 0.35) return cmp2(kpId, d, rng)
    if (roll < 0.55) return jump(kpId, d, rng)
    if (roll < 0.7) return mToCm(kpId, d, rng)
    if (roll < 0.82) return barCmp(kpId, d, rng)
    if (roll < 0.92) return lineRead(kpId, d, rng)
    return pickExtreme(kpId, d, rng, true)
  }
  if (roll < 0.3) return cmpMixed(kpId, d, rng)
  if (roll < 0.52) return prices(kpId, d, rng)
  if (roll < 0.75) return cards(kpId, d, rng)
  if (roll < 0.9) return cmp2(kpId, d, rng)
  return pickExtreme(kpId, d, rng, true)
})

// ═════════════════════════════════════════════════════════════
// 简单的小数加、减法（p90、练习十六 4–6、练习十七 3、练习十八 7）
// ═════════════════════════════════════════════════════════════

/** 一道一位小数的加法：第 1 档不进位（有时是 6 + 0.6 这样整数加小数），第 2 档起进位 */
function addTerms(d: Difficulty, rng: RNG, carry: boolean): { A: number; B: number; S: number; cands: string[] } {
  for (;;) {
    if (!carry && rng.chance(0.2)) {
      // 整数 + 小数：6 + 0.6（小数点没对齐会算成 1.2）
      const a = rng.int(1, 9)
      const B = rng.chance(0.5) ? rng.int(1, 9) : rng.int(1, 5) * 10 + rng.int(1, 9)
      const A = a * 10
      const S = A + B
      return { A, B, S, cands: [d1(a + B), `0.${a}${B % 10}`, String(a + (B % 10)), d1(S + 10), d1(S - 1)] }
    }
    const big = d >= 2 && rng.chance(0.4)
    const a = big ? rng.int(10, 15) : rng.int(0, 8)
    const b = rng.int(0, big ? 9 : 9 - a)
    const x = rng.int(1, 9)
    const y = carry ? rng.int(10 - x, 9) : rng.int(1, 9 - x)
    if (carry && x + y === 10) continue // 和的末尾是 0（5.0）不出
    if (!carry && x + y > 9) continue
    const A = a * 10 + x
    const B = b * 10 + y
    const S = A + B
    if (S % 10 === 0) continue
    const cands = carry ? [d1(S - 10), `${a + b}.${x + y}`, `${a + b + 1}.${x + y}`, String(S), d1(S + 1)] : [String(S), d2(S), d1(S + 10), d1(S - 10), d1(S + 1), d1(S - 1)]
    return { A, B, S, cands }
  }
}

/** 一道一位小数的减法：第 1 档不退位，第 2 档起退位（13.2 − 2.3、1.4 − 0.8） */
function subTerms(d: Difficulty, rng: RNG, borrow: boolean): { A: number; B: number; R: number; cands: string[] } {
  for (;;) {
    const big = d >= 2 && rng.chance(0.4)
    const a = big ? rng.int(10, 19) : rng.int(1, 9)
    const b = rng.int(0, Math.min(a - (borrow ? 1 : 0), big ? 9 : a))
    const x = borrow ? rng.int(0, 8) : rng.int(1, 9)
    const y = borrow ? rng.int(x + 1, 9) : rng.int(1, x)
    const A = a * 10 + x
    const B = b * 10 + y
    const R = A - B
    if (R <= 0 || R % 10 === 0 || A % 10 === 0) continue
    const cands = borrow ? [`${a - b}.${y - x}`, d1(R + 10), d1(A + B), d1(R - 1), d1(R + 1)] : [d1(A + B), d1(R + 10), String(R), d1(R + 1), d1(R - 1)]
    return { A, B, R, cands }
  }
}

function addQ(kpId: string, d: Difficulty, rng: RNG, carry: boolean): Question {
  const { A, B, S, cands } = addTerms(d, rng, carry)
  return decQ(kpId, d, `add-${A}-${B}`, [{ kind: 'expr', expr: `${d1n(A)} + ${d1n(B)} = ?` }], d1(S), cands, rng)
}
function subQ(kpId: string, d: Difficulty, rng: RNG, borrow: boolean): Question {
  const { A, B, R, cands } = subTerms(d, rng, borrow)
  return decQ(kpId, d, `sub-${A}-${B}`, [{ kind: 'expr', expr: `${d1(A)} - ${d1(B)} = ?` }], d1(R), cands, rng)
}

/** 化成角来计算（例 4）：1.5 元 + 3.8 元 = 15 角 + 38 角 = 53 角（键盘） */
function toJiao(kpId: string, d: Difficulty, rng: RNG): Question {
  const add = rng.chance(0.6)
  if (add) {
    const { A, B, S } = addTerms(d, rng, d >= 2 && rng.chance(0.5))
    return intQ(kpId, d, `jiao-add-${A}-${B}`, [T('m3.dec.toJiao', { a: d1n(A), b: d1n(B) })], S, rng, [A + B + 10, A * 10 + B, S - 10], 999)
  }
  const { A, B, R } = subTerms(d, rng, d >= 2 && rng.chance(0.5))
  return intQ(kpId, d, `jiao-sub-${A}-${B}`, [T('m3.dec.toJiaoSub', { a: d1(A), b: d1(B) })], R, rng, [A + B, R + 10, R - 1], 999)
}

/** 文具的价钱（例 4、练习十七 3）：两样一共多少、谁比谁贵 / 便宜多少 */
const ITEMS = ['eraser', 'pencil', 'bag', 'book', 'paint', 'ruler'] as const
const one = (i: string): LStr => ({ k: `m3.dec.one.${i}` })
const item = (i: string): LStr => ({ k: `m3.dec.item.${i}` })
function priceStory(kpId: string, d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.shuffle([...ITEMS]).slice(0, 2) as [string, string]
  const kind = rng.int(0, 2)
  if (kind === 0) {
    const { A, B, S, cands } = addTerms(d, rng, rng.chance(0.6))
    return decQ(kpId, d, `sum-${x}-${y}-${A}-${B}`, [T('m3.dec.sum2', { x: one(x), y: one(y), a: d1n(A), b: d1n(B) })], d1(S), cands, rng, 'yuan')
  }
  const { A, B, R, cands } = subTerms(d, rng, rng.chance(0.6))
  const key = kind === 1 ? 'm3.dec.diff2' : 'm3.dec.cheaper2'
  return decQ(kpId, d, `${kind === 1 ? 'dear' : 'cheap'}-${x}-${y}-${A}-${B}`, [T(key, { x: one(x), y: one(y), xn: item(x), yn: item(y), a: d1(A), b: d1(B) })], d1(R), cands, rng, 'yuan')
}

/** 20 元够吗（例 4 做一做、练习十七 3）：两样的价钱加起来和 20 元比 */
function enough(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const S = rng.int(181, 219)
    const A = rng.int(40, S - 40)
    const B = S - A
    if (S === 200 || A % 10 === 0 || B % 10 === 0) continue
    const [x, y] = rng.shuffle([...ITEMS]).slice(0, 2) as [string, string]
    const ok = S <= 200
    return labelQuestion({
      kpId,
      type: 'decimal',
      difficulty: d,
      sig: `enough-${x}-${y}-${A}-${B}`,
      stem: [T('m3.dec.enough', { x: one(x), y: one(y), a: d1(A), b: d1(B) })],
      correct: { k: ok ? 'm3.dec.yes' : 'm3.dec.no' },
      distractors: [{ k: ok ? 'm3.dec.no' : 'm3.dec.yes' }],
      rng,
    })
  }
}

/** 两步 / 情境（练习十六 4 / 5、七 p100）：竹竿接起来、河水多深、货物多重、小鹿走了多远 */
function story(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  for (;;) {
    if (kind === 0) {
      // 两根竹竿接起来：a + b − c
      const a = rng.int(15, 40)
      const b = rng.int(15, 40)
      const c = rng.int(3, 9)
      const r = a + b - c
      if (a % 10 === 0 || b % 10 === 0 || r % 10 === 0) continue
      return decQ(kpId, d, `poles-${a}-${b}-${c}`, [T('m3.dec.poles', { a: d1(a), b: d1(b), c: d1(c) })], d1(r), [d1(a + b), d1(a + b + c), d1(r + 10), d1(r - 1)], rng, 'm')
    }
    const [lo, hi, dlo, dhi, key, unit] =
      kind === 1 ? ([30, 60, 5, 15, 'm3.dec.river', 'm'] as const) : kind === 2 ? ([100, 190, 40, 90, 'm3.dec.truck', 't'] as const) : ([20, 90, 5, 60, 'm3.dec.walk', 'km'] as const)
    const a = rng.int(lo, hi)
    const b = rng.int(dlo, Math.min(dhi, a - 5))
    const r = a - b
    if (a % 10 === 0 || b % 10 === 0 || r % 10 === 0) continue
    // 常见错：加成了、退位时忘了减 1、小的减大的
    const [ai, ax, bi, bx] = [Math.floor(a / 10), a % 10, Math.floor(b / 10), b % 10]
    const cands = [d1(a + b), ax < bx ? d1(r + 10) : d1(r - 10), ax < bx ? `${ai - bi}.${bx - ax}` : d1(r + 1), d1(r - 1)]
    return decQ(kpId, d, `${key.slice(7)}-${a}-${b}`, [T(key, { a: d1(a), b: d1(b) })], d1(r), cands, rng, unit)
  }
}

/** 按规律填数（练习十六 6）：1.1，1.2，1.3，……；0.6，1.2，1.8，…… */
function pattern(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const step = rng.pick([1, 2, 3, 5, 6])
    const start = rng.int(1, 20)
    const terms = range(5).map((i) => start + i * step)
    const next = start + 5 * step
    if (next % 10 === 0 || next > 99) continue
    return decQ(
      kpId,
      d,
      `pat-${start}-${step}`,
      [T('m3.dec.nextNum'), { kind: 'sequence', cells: [...terms.map((t) => ({ kind: 'item' as const, label: d1(t) })), { kind: 'blank' }] }],
      d1(next),
      [d1(next + step), d1(next - 1), d1(next + 1), d1(next + 10), d1(next + 2), d1(next - 2)],
      rng,
    )
  }
}

defineGenerator('m3s2-07-addsub', (d, rng) => {
  const kpId = 'm3s2-07-addsub'
  const roll = rng.next()
  if (d === 1) {
    // 主干：一位小数不进位加、不退位减（小数点对齐），化成角来算
    if (roll < 0.4) return addQ(kpId, d, rng, false)
    if (roll < 0.75) return subQ(kpId, d, rng, false)
    return toJiao(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return addQ(kpId, d, rng, true)
    if (roll < 0.5) return subQ(kpId, d, rng, true)
    if (roll < 0.72) return priceStory(kpId, d, rng)
    if (roll < 0.87) return enough(kpId, d, rng)
    return toJiao(kpId, d, rng)
  }
  if (roll < 0.4) return story(kpId, d, rng)
  if (roll < 0.65) return pattern(kpId, d, rng)
  if (roll < 0.85) return priceStory(kpId, d, rng)
  return rng.chance(0.5) ? addQ(kpId, d, rng, true) : subQ(kpId, d, rng, true)
})
