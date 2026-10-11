import type { Difficulty, FracPic, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { mixed } from '@/engine/fraction'
import { type Frac, fs, gcd, less, parseF, reduce, same } from './fracadd'

// ─────────────────────────────────────────────────────────────
// 分数和小数的互化（五下第 4 单元「分数的意义和性质」的第 6 小节，课本 p77–79，平台当前的旧版课本；五年级数学 I，照 H 的笔记写）。
// 例 1：3 m 的绳子平均分成 10 段、5 段，每段 0.3 m = 3/10 m、0.6 m = 3/5 m；小数可以直接写成分母是 10、100、1000 的分数再化简
//   （0.07 = 7/100、0.24 = 24/100 = 6/25、0.123 = 123/1000）。
// 例 2：7/10、39/100 直接写；3/4 = 3÷4 = 0.75、9/40 = 0.225；除不尽的保留两位小数 2/9 ≈ 0.22、5/14 ≈ 0.36。做一做：0.7、9/10、0.25、
//   43/100、7/25、13/47 排大小。
// 练习十九：涂色部分用小数和分数表示、0.05 里面有 5 个百分之一、相等的小数和分数连线、猎豹和小汽车的速度、化成小数（7 道）、数线上的点、
//   单位换算（40 cm = 0.4 m = 2/5 m）、排大小（2 4/7、2.35、13/6、11/16、2.035）、谁打字快、谁家远；你知道吗：有限小数。
// 作答：分数、小数一律选项卡（数字键盘只出整数：分母、分子、1/4 小时是 15 分钟）。「化成最简分数」的题考的是写法，干扰项里可以有没约分的
// 等值分数（6/10）；别的题选项里不放等值的两种写法。干扰项照课本暴露的错法：分母的位数写错（0.07 → 7/10）、分子分母写反、
// 照抄分子分母（3/4 → 0.34）、小数点错一位、保留两位时直接去尾（5/14 → 0.35）。小数、分数都从课本的数里取（每个数都是一条朗读音频）。
// 不出：数线上填数（直接问「1/8 化成小数是多少」）、连线（改问「和 0.45 相等的分数是哪个」）、排序（改问最大 / 最小的是哪个）。
// 朗读：例 1 的「3 m 长的绳子」「每段长多少米」写成「一条 3 米的绳子」「每段是多少米」；速度照课本写「20 米/秒」（读「米每秒」）。
// ─────────────────────────────────────────────────────────────

const K = 'm5s2-05-decimal'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })

// ══ 小数（千分之几的整数）══

/** 小数（字符串）→ 千分之几：'0.225' → 225，'3.25' → 3250 */
export function milli(s: string): number {
  const [i = '0', f = ''] = s.split('.')
  return Number(i) * 1000 + Number(`${f}000`.slice(0, 3))
}
/** 千分之几 → 小数，末尾的 0 去掉：750 → '0.75'，3000 → '3' */
export function dec(m: number): string {
  const i = Math.floor(m / 1000)
  const f = String(m % 1000).padStart(3, '0').replace(/0+$/, '')
  return f ? `${i}.${f}` : String(i)
}
/** 小数 → 分数（没约分）：'0.24' → [24, 100] */
export function decFrac(s: string): Frac {
  const [i = '0', f = ''] = s.split('.')
  const den = 10 ** f.length
  return [Number(i) * den + Number(f || '0'), den]
}
/** 分数化成小数：除得尽（三位以内）的写准确值，否则 null */
export function exactDec(f: Frac): string | null {
  return (f[0] * 1000) % f[1] === 0 ? dec((f[0] * 1000) / f[1]) : null
}
/** 保留两位小数（四舍五入），写两位：2/9 → '0.22'，5/14 → '0.36' */
export function round2(f: Frac): string {
  const hundredths = Math.floor((f[0] * 100) / f[1])
  const third = Math.floor((f[0] * 1000) / f[1]) % 10
  const v = hundredths + (third >= 5 ? 1 : 0)
  return `${Math.floor(v / 100)}.${String(v % 100).padStart(2, '0')}`
}
/** 直接去尾（保留两位时的错法）：5/14 → '0.35' */
function trunc2(f: Frac): string {
  const v = Math.floor((f[0] * 100) / f[1])
  return `${Math.floor(v / 100)}.${String(v % 100).padStart(2, '0')}`
}
/** 两位小数写法的值（百分之几） */
const hund = (s: string): number => Math.round(milli(s) / 10)

/** 小数答案的干扰项：值互不相同、不等于正确答案、不是 0；按给的顺序取前 count 个 */
export function decWrongs(correct: string, cands: string[], count = 3): string[] {
  const out: string[] = []
  for (const c of cands) {
    if (!/^\d+(\.\d+)?$/.test(c) || milli(c) === 0 || milli(c) === milli(correct)) continue
    if (out.some((o) => milli(o) === milli(c))) continue
    out.push(c)
    if (out.length >= count) break
  }
  return out
}
/** 小数点错一位、分子分母写反的错法 */
function shifts(m: number): string[] {
  return [dec(m * 10), m % 10 === 0 ? dec(m / 10) : '', dec(m * 100)].filter(Boolean)
}
/**
 * 分数答案的干扰项：别的值一律写成最简、值互不相同；allowRaw（「化成最简分数」「用最简分数表示」的题考的是写法）时
 * 可以放一个没约分的等值分数（6/10），只放一个。
 */
function fracCands(correct: Frac, cands: Frac[], allowRaw: boolean, count = 3): string[] {
  const c = reduce(correct)
  const out: Frac[] = []
  let raw = false
  for (const f of cands) {
    if (f[0] <= 0 || f[1] <= 0 || !Number.isInteger(f[0]) || !Number.isInteger(f[1]) || f[1] > 1000) continue
    if (same(f, c)) {
      if (!allowRaw || raw || (f[0] === c[0] && f[1] === c[1])) continue
      raw = true
      out.push(f)
    } else {
      const r = reduce(f)
      if (out.some((o) => same(o, r))) continue
      out.push(r)
    }
    if (out.length >= count) break
  }
  return out.map(([n, d]) => (d === 1 ? String(n) : `${n}/${d}`))
}

// ══ 例 1：绳子平均分（3 m 平均分成 10 段、5 段），小数和分数两种写法 ══

export const ROPES: [number, number][] = [
  [3, 10],
  [3, 5],
  [2, 5],
  [4, 5],
  [1, 4],
  [3, 4],
  [9, 10],
  [7, 10],
]
function qRope(d: Difficulty, rng: RNG): Question {
  const [l, n] = d === 1 && rng.chance(0.4) ? rng.pick(ROPES.slice(0, 2)) : rng.pick(ROPES)
  const value: Frac = reduce([l, n])
  const stem = (k: string): StemPart[] => [T('m5.fdec.rope', { l, n }), T(k)]
  if (rng.chance(0.5)) {
    const m = (l * 1000) / n
    const back = exactDec([n, l])
    // 错法：没乘绳子的长度（1 ÷ n）、小数点错一位、反过来除
    return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `rope-dec-${l}-${n}`, stem: stem('m5.fdec.useDec'), correct: dec(m), distractors: decWrongs(dec(m), [dec(1000 / n), ...shifts(m), back ?? '', dec(m + 100)]), rng })
  }
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `rope-frac-${l}-${n}`, stem: stem('m5.fdec.useFrac'), correct: fs(value), distractors: fracCands(value, [[n, l], [1, n], [l, n * 10], [l + 1, n]], false), rng })
}

// ══ 小数化分数 ══

/** 例 1 的「自己试一试」和练习里的小数 */
export const DEC_BOOK = ['0.3', '0.6', '0.07', '0.24', '0.123']
export const DEC_MORE = ['0.8', '0.05', '0.36', '0.45', '0.25', '0.75', '0.5', '0.4', '0.18', '0.03', '0.007', '0.125', '0.625', '3.25']
/** 化成最简分数：干扰项是没约分的写法、分母的位数写错、分子分母写反、只约了一半 */
function toFracCands(x: string): Frac[] {
  const raw = decFrac(x)
  const r = reduce(raw)
  const out: Frac[] = [raw]
  if (raw[1] >= 100) out.push([raw[0], raw[1] / 10])
  if (raw[1] <= 100) out.push([raw[0], raw[1] * 10])
  if (r[0] > 1) out.push([r[1], r[0]])
  const g = gcd(raw[0], raw[1])
  if (g > 2 && g % 2 === 0) out.push([raw[0] / 2, raw[1] / 2])
  out.push([r[0] + 1, r[1]])
  return out
}
function qToFrac(d: Difficulty, rng: RNG): Question {
  const x = d === 1 && rng.chance(0.5) ? rng.pick(DEC_BOOK) : rng.pick(DEC_MORE)
  const value = reduce(decFrac(x))
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `tofrac-${x}`, stem: [T('m5.fdec.toFrac', { x })], correct: fs(value), distractors: fracCands(value, toFracCands(x), true), rng })
}
/** 「0.07 = 7/( )」「0.24 = 24/( ) = ( )/25」：分母、分子是多少（数字键盘） */
export const DEN_ASK: [string, number][] = [
  ['0.07', 7],
  ['0.123', 123],
  ['0.24', 24],
  ['0.3', 3],
  ['0.05', 5],
  ['0.007', 7],
  ['0.36', 36],
]
export const NUM_ASK: [string, number][] = [
  ['0.24', 25],
  ['0.6', 5],
  ['0.36', 25],
  ['0.45', 20],
  ['0.75', 4],
  ['0.18', 50],
]
function qDenNum(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [x, n] = rng.pick(DEN_ASK)
    const den = decFrac(x)[1]
    return numberQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `den-${x}`, stem: [T('m5.fdec.denQ', { x, n })], value: den, rng, min: 1, max: 10000, smart: [den / 10, den * 10, 10, 100, 1000].filter((v) => v !== den), input: 'numpad' })
  }
  const [x, den] = rng.pick(NUM_ASK)
  const [n0, d0] = decFrac(x)
  const value = (n0 * den) / d0
  return numberQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `num-${x}-${den}`, stem: [T('m5.fdec.numQ', { x, d: den })], value, rng, min: 1, max: 100, smart: [n0, value + 1, value - 1], input: 'numpad' })
}

// ══ 分数化小数 ══

/** 例 2（除得尽）与练习里的分数 */
export const FRAC_BOOK = ['7/10', '39/100', '3/4', '9/40']
export const FRAC_MORE = ['1/4', '1/2', '2/5', '3/5', '1/8', '5/8', '4/5', '3/20', '7/25', '9/20', '31/100', '2/25', '11/50', '23/20']
/** 例 2（除不尽，保留两位小数） */
export const ROUND_BOOK = ['2/9', '5/14']
export const ROUND_MORE = ['7/30', '4/9', '5/6', '1/3', '2/3', '13/47']
/** 照抄分子、分母（3/4 → 0.34）、分子分母写反、小数点错一位 */
function toDecCands(f: Frac): string[] {
  const m = (f[0] * 1000) / f[1]
  const copy = f[0] < 10 && f[1] < 100 ? dec(milli(`0.${f[0]}${f[1]}`)) : ''
  const back = exactDec([f[1], f[0]]) ?? round2([f[1], f[0]])
  return [copy, ...shifts(m), back, dec(m + (m >= 100 ? 10 : 1))]
}
function qToDec(d: Difficulty, rng: RNG): Question {
  const src = d === 1 && rng.chance(0.5) ? rng.pick(FRAC_BOOK) : rng.pick(FRAC_MORE)
  const f = parseF(src)
  const correct = exactDec(f)!
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `todec-${src}`, stem: [T('m5.fdec.toDec'), E(`${src} = ?`)], correct, distractors: decWrongs(correct, toDecCands(f)), rng })
}
function qRound(d: Difficulty, rng: RNG): Question {
  const pool = d === 1 ? ROUND_BOOK : [...ROUND_BOOK, ...ROUND_MORE.slice(0, d === 2 ? 5 : 6)]
  const src = rng.pick(pool)
  const f = parseF(src)
  const correct = round2(f)
  // 直接去尾、多进了一、分子分母写反、只保留了一位
  const up = hund(correct) + 1
  const cands = [trunc2(f), `${Math.floor(up / 100)}.${String(up % 100).padStart(2, '0')}`, round2([f[1], f[0]]), dec(Math.round((f[0] * 10) / f[1]) * 100)]
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `round-${src}`, stem: [T('m5.fdec.round'), E(`${src} ≈ ?`)], correct, distractors: decWrongs(correct, cands), rng })
}

// ══ 比大小（做一做、练习十九 8）══

/** 做一做的六个数（13/47 ≈ 0.277，和 7/25 = 0.28 保留两位一样，只在第 3 档比） */
export const SIX = ['0.7', '9/10', '0.25', '43/100', '7/25', '13/47']
/** 练习十九 8 的五个数（带分数 2 4/7） */
export const FIVE = [mixed(2, 4, 7), '2.35', '13/6', '11/16', '2.035']
/** 数的值（化成分数）：小数、分数、带分数 */
export function valueOf(s: string): Frac {
  const mx = /^(\d+) (\d+)\/(\d+)$/.exec(s)
  if (mx) return reduce([Number(mx[1]) * Number(mx[3]) + Number(mx[2]), Number(mx[3])])
  if (s.includes('/')) return parseF(s)
  return reduce(decFrac(s))
}
function qExtreme(d: Difficulty, rng: RNG): Question {
  const set = d === 1 ? SIX.slice(0, 5) : rng.chance(0.5) ? FIVE : SIX
  const most = rng.chance(0.5)
  const sorted = [...set].sort((a, b) => (less(valueOf(a), valueOf(b)) ? -1 : 1))
  const correct = most ? sorted[sorted.length - 1]! : sorted[0]!
  const others = rng.shuffle(set.filter((s) => s !== correct)).slice(0, 3)
  return labelQuestion({ kpId: K, type: 'compare', difficulty: d, sig: `${most ? 'max' : 'min'}-${set === FIVE ? 'five' : set.length}-${others.join('|')}`, stem: [T(most ? 'm5.fdec.max' : 'm5.fdec.min'), E(set.join('、'))], correct, distractors: others, rng })
}
/** 比一比：做一做的几对、课本里相等的小数和分数（0.25 和 1/4……）；13/47 和 7/25 只在第 3 档 */
export const CMP_PAIRS: [string, string][] = [
  ['0.7', '9/10'],
  ['0.25', '7/25'],
  ['43/100', '0.7'],
  ['7/25', '0.25'],
  ['0.25', '1/4'],
  ['0.6', '3/5'],
  ['3/4', '0.75'],
  ['9/10', '43/100'],
  ['0.45', '9/20'],
  ['5/6', '0.9'],
]
function qCmp(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 3 && rng.chance(0.4) ? (['13/47', '7/25'] as [string, string]) : rng.pick(CMP_PAIRS)
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a]
  const vx = valueOf(x)
  const vy = valueOf(y)
  const correct = same(vx, vy) ? '=' : less(vx, vy) ? '<' : '>'
  return labelQuestion({ kpId: K, type: 'compare', difficulty: d, sig: `cmp-${x}|${y}`, stem: [T('m5.fdec.cmp'), E(`${x} ○ ${y}`)], correct, distractors: ['>', '<', '='].filter((s) => s !== correct), rng })
}

// ══ 练习十九 ══

/** 1：涂色部分用小数、分数表示（课本：10 条涂 3 条、100 格涂 25 格、圆平均分 10 份涂 4 份；同样的图换几个数） */
export const PICS: { pic: FracPic; k: number; n: number }[] = [
  { pic: { shape: 'rect', parts: 10, shaded: [0, 1, 2] }, k: 3, n: 10 },
  { pic: { shape: 'square', parts: 100, rows: 10, shaded: [...Array.from({ length: 10 }, (_, r) => [r * 10, r * 10 + 1]).flat(), 52, 62, 72, 82, 92] }, k: 25, n: 100 },
  { pic: { shape: 'circle', parts: 10, shaded: [1, 3, 6, 8] }, k: 4, n: 10 },
  { pic: { shape: 'rect', parts: 10, shaded: [0, 1, 2, 3, 4, 5, 6] }, k: 7, n: 10 },
  { pic: { shape: 'square', parts: 100, rows: 10, shaded: Array.from({ length: 10 }, (_, r) => [r * 10, r * 10 + 1, r * 10 + 2, r * 10 + 3]).flat().concat([44, 54, 64, 74, 84]) }, k: 45, n: 100 },
  { pic: { shape: 'circle', parts: 10, shaded: [0, 2, 4, 5, 7, 9] }, k: 6, n: 10 },
]
function qPicture(d: Difficulty, rng: RNG): Question {
  const { pic, k, n } = rng.pick(PICS)
  const stem = (key: string): StemPart[] => [T(key), { kind: 'frac-shape', items: [pic] }]
  const m = (k * 1000) / n
  if (rng.chance(0.5)) {
    return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `pic-dec-${k}-${n}-${pic.shape}`, stem: stem('m5.fdec.picDec'), correct: dec(m), distractors: decWrongs(dec(m), [...shifts(m), dec(((n - k) * 1000) / n), dec(k * 100)]), rng })
  }
  const value = reduce([k, n])
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `pic-frac-${k}-${n}-${pic.shape}`, stem: stem('m5.fdec.picFrac'), correct: fs(value), distractors: fracCands(value, [[k, n], [n - k, n], [k, n * 10], [n, k]], true), rng })
}
/** 2：0.05 里面有 5 个几分之一 */
export const UNIT_ASK = ['0.8', '0.05', '0.007', '0.36', '0.3', '0.123', '0.07']
function qUnitOf(d: Difficulty, rng: RNG): Question {
  const x = rng.pick(UNIT_ASK)
  const [n, den] = decFrac(x)
  const key = den === 10 ? 'u10' : den === 100 ? 'u100' : 'u1000'
  const all = ['u10', 'u100', 'u1000']
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `unit-${x}`, stem: [T('m5.fdec.unitQ', { x, n })], correct: L(`m5.fdec.${key}`), distractors: all.filter((k) => k !== key).map((k) => L(`m5.fdec.${k}`)), rng })
}
/** 3：和 0.45 相等的分数是哪个（课本连线的五对） */
export const MATCH: [string, string][] = [
  ['0.6', '3/5'],
  ['0.03', '3/100'],
  ['0.45', '9/20'],
  ['3.25', '13/4'],
  ['0.18', '9/50'],
]
function qMatch(d: Difficulty, rng: RNG): Question {
  const [x, f] = rng.pick(MATCH)
  const others = rng.shuffle(MATCH.filter(([y]) => y !== x).map(([, g]) => g)).slice(0, 3)
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `match-${x}`, stem: [T('m5.fdec.match', { x })], correct: f, distractors: others, rng })
}
/** 4：小汽车 20 米/秒、猎豹 31 米/秒 */
function qSpeed(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: 'speed-times', stem: [T('m5.fdec.speed'), T('m5.fdec.speed.times')], correct: '1.55', distractors: ['0.65', '1.5', '11'], rng })
  }
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: 'speed-frac', stem: [T('m5.fdec.speed'), T('m5.fdec.speed.frac')], correct: '20/31', distractors: ['31/20', '11/31', '20/11'], rng })
}
/** 7：单位换算，用小数 / 最简分数表示（课本 40 cm、150 g、125 cm²、3680 dm³；练习二十 4 的 25 cm、600 g、750 mL） */
export const CONV: { a: number; from: string; to: string; rate: number }[] = [
  { a: 40, from: 'cm', to: 'm', rate: 100 },
  { a: 150, from: 'g', to: 'kg', rate: 1000 },
  { a: 25, from: 'cm', to: 'm', rate: 100 },
  { a: 600, from: 'g', to: 'kg', rate: 1000 },
  { a: 750, from: 'ml', to: 'l', rate: 1000 },
  { a: 125, from: 'cm2', to: 'dm2', rate: 100 },
  { a: 3680, from: 'dm3', to: 'm3', rate: 1000 },
]
function qConv(d: Difficulty, rng: RNG): Question {
  const c = d === 3 ? rng.pick(CONV.slice(5)) : rng.pick(CONV.slice(0, 5))
  const f: Frac = reduce([c.a, c.rate])
  const m = (c.a * 1000) / c.rate
  const head = T('m5.fdec.conv', { a: c.a, from: L(`m5.fdec.u.${c.from}`), to: L(`m5.fdec.u.${c.to}`) })
  if (rng.chance(0.5)) {
    return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `conv-dec-${c.a}${c.from}`, stem: [head, T('m5.fdec.useDec')], correct: dec(m), distractors: decWrongs(dec(m), [...shifts(m), dec(m / 10 >= 1 ? m / 10 : m * 1000)]), rng })
  }
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `conv-frac-${c.a}${c.from}`, stem: [head, T('m5.fdec.useFrac')], correct: fs(f), distractors: fracCands(f, [[c.a, c.rate / 10], [f[1], f[0]], [c.a, c.rate * 10], [f[0] + 1, f[1]]], false), rng })
}
/** 9：李阿姨每秒打 0.9 个字、王叔叔每秒打 5/6 个字，谁快（再换一组数） */
export const TYPING: [string, string][] = [
  ['0.9', '5/6'],
  ['0.8', '5/6'],
  ['0.7', '3/4'],
]
function qTyping(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(TYPING)
  const liFaster = less(valueOf(b), valueOf(a))
  return labelQuestion({ kpId: K, type: 'compare', difficulty: d, sig: `typing-${a}-${b}`, stem: [T('m5.fdec.typing', { a, b })], correct: L(liFaster ? 'm5.fdec.li' : 'm5.fdec.wang'), distractors: [L(liFaster ? 'm5.fdec.wang' : 'm5.fdec.li')], rng })
}
/** 10：小林走 25 分钟、小东走 1/4 小时：1/4 小时是 15 分钟，谁家远 */
function qWalk(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    return numberQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: 'walk-min', stem: [T('m5.fdec.walk'), T('m5.fdec.walk.min')], value: 15, rng, min: 1, max: 60, smart: [25, 4, 40], input: 'numpad' })
  }
  return labelQuestion({ kpId: K, type: 'compare', difficulty: d, sig: 'walk-far', stem: [T('m5.fdec.walk'), T('m5.fdec.walk.far')], correct: L('m5.fdec.linHome'), distractors: [L('m5.fdec.dongHome')], rng })
}
/** 你知道吗：分母只有质因数 2 和 5 的最简分数能化成有限小数（7/20 能，7/30 不能） */
export const FINITE: [string, boolean][] = [
  ['7/20', true],
  ['7/30', false],
  ['3/16', true],
  ['5/12', false],
  ['9/40', true],
  ['2/15', false],
]
function qFinite(d: Difficulty, rng: RNG): Question {
  const [f, ok] = rng.pick(FINITE)
  return labelQuestion({ kpId: K, type: 'fraction', difficulty: d, sig: `finite-${f}`, stem: [T('m5.fdec.finite', { f })], correct: L(ok ? 'm5.fdec.yes' : 'm5.fdec.no'), distractors: [L(ok ? 'm5.fdec.no' : 'm5.fdec.yes')], rng })
}

function gen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1（绳子、小数化分数、分母分子是几）、例 2（化成小数、保留两位小数）、做一做（排大小改问最大 / 最小、比一比）
    if (roll < 0.14) return qRope(d, rng)
    if (roll < 0.32) return qToFrac(d, rng)
    if (roll < 0.44) return qDenNum(d, rng)
    if (roll < 0.62) return qToDec(d, rng)
    if (roll < 0.74) return qRound(d, rng)
    if (roll < 0.86) return qExtreme(d, rng)
    return qCmp(d, rng)
  }
  if (d === 2) {
    // 练习十九
    if (roll < 0.14) return qPicture(d, rng)
    if (roll < 0.24) return qUnitOf(d, rng)
    if (roll < 0.34) return qMatch(d, rng)
    if (roll < 0.42) return qSpeed(d, rng)
    if (roll < 0.54) return rng.chance(0.5) ? qToDec(d, rng) : qRound(d, rng)
    if (roll < 0.66) return qConv(d, rng)
    if (roll < 0.76) return qExtreme(d, rng)
    if (roll < 0.86) return qTyping(d, rng)
    return qWalk(d, rng)
  }
  // 第 3 档：13/47 和 7/25、有限小数、难一点的单位换算
  if (roll < 0.3) return qCmp(d, rng)
  if (roll < 0.6) return qFinite(d, rng)
  if (roll < 0.8) return qConv(d, rng)
  return qRound(d, rng)
}
defineGenerator(K, gen)
