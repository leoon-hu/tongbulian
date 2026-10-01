import type { Difficulty, InputMode, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 多位数乘一位数（三上四）：口算乘法、笔算乘法、有 0 的乘法、用估算解决问题。
// 课本把两个数都叫「乘数」；积最多 4 位（612 × 7 = 4284，带 * 的 1392 × 4）。
// 算式：乘号「×」、减号 ASCII「-」、括号「( )」、比大小用「○」（朗读读作「和」，所以题目文字里不写「○」）。
// 竖式用 vertical 部件，多位数写在上面、一位数写在下面。
// ─────────────────────────────────────────────────────────────

export const ORAL = 'm3s1-05-oral-mul'
export const WRITTEN = 'm3s1-05-written-mul'
export const ZERO = 'm3s1-05-zero-mul'
export const ESTIMATE = 'm3s1-05-estimate'

type Params = Record<string, LStr | number>
const text = (k: string, p?: Params): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const expr = (e: string): StemPart => ({ kind: 'expr', expr: e })
const flat = (e: string): string => e.replace(/\s+/g, '')

/** 各位数字（高位在前） */
export const digitsOf = (n: number): number[] => String(n).split('').map(Number)

/** 每一位乘出来都不满十（口算、不进位的笔算） */
export const noCarry = (a: number, b: number): boolean => digitsOf(a).every((d) => d * b < 10)

/** 忘了加进上来的数：每一位只写乘得的个位，最高位照写（16 × 3 → 38，24 × 9 → 186，604 × 8 → 4802） */
export function forgotCarry(a: number, b: number): number {
  return Number(digitsOf(a).map((d, i) => (i === 0 ? d * b : (d * b) % 10)).join(''))
}

/** 每一位乘得的积直接连着写（23 × 4 → 812，208 × 4 → 8032，课本「下面的计算正确吗」里的错法） */
export function concatProducts(a: number, b: number): number {
  return Number(digitsOf(a).map((d) => d * b).join(''))
}

/** 笔算乘法的常见错误（选项的干扰项）：先放个位和正确的积一样的，免得看个位就能排除 */
function writtenSmart(a: number, b: number): number[] {
  const p = a * b
  return [forgotCarry(a, b), concatProducts(a, b), p + 10, p - 10, p + 100, p - 100, p + 20, p - 20]
}

/** 数值题：键盘或选项（input 不填就随机） */
function numQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[], input?: InputMode): Question {
  return numberQuestion({
    kpId,
    type: 'multiply',
    difficulty: d,
    sig,
    stem,
    value,
    rng,
    min: 0,
    max: 99999,
    input,
    smart: smart.filter((x) => Number.isInteger(x) && x >= 0 && x !== value),
  })
}

/** 选项题（够 / 不够、对 / 不对、选范围……） */
function pickQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[], rng: RNG, type: 'multiply' | 'compare' = 'multiply'): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors, rng })
}

/** 竖式题：a × b = ?，下面画竖式（多位数在上）；多数用键盘，按的数直接写在横线下面 */
function verticalQ(kpId: string, d: Difficulty, a: number, b: number, rng: RNG, smart: number[] = writtenSmart(a, b)): Question {
  const e = `${a} × ${b} = ?`
  return numQ(kpId, d, flat(e), [expr(e), { kind: 'vertical', a, op: '×', b }], a * b, rng, smart, rng.chance(0.8) ? 'numpad' : 'choice')
}

// ─────────────────────────────────────────────────────────────
// 口算乘法（p40–42）：整十、整百、整千数乘一位数；两位数乘一位数（不进位）。
// 第 1 档：20 × 3、200 × 7（首位乘出来不满十或不带 0），12 × 3 这类每一位都不进位的；「20 是 2 个十」；坐游乐项目的钱。
// 第 2 档：整千数、积末尾的 0 比乘数多（50 × 4、500 × 8）；找规律（6 × 9 → 600 × 9）；一步应用题；「300 是 3 个百」。
// 第 3 档：两步计算（7 × 8 + 6、70 × 9 - 120、(406 - 385) × 3）；比槐树的 2 倍多 5 棵；买足球找钱。
// ─────────────────────────────────────────────────────────────

/** 整十、整百、整千数乘一位数：第 1 档首位乘出来不以 0 结尾；第 2 档是整千数，或积末尾的 0 比乘数多；积都在万以内 */
function roundFactor(d: Difficulty, rng: RNG): { a: number; b: number; lead: number; place: number } {
  for (;;) {
    const place = d === 1 ? rng.pick([10, 10, 100]) : rng.pick([10, 100, 1000, 1000])
    const lead = rng.int(1, 9)
    const b = rng.int(2, 9)
    const extraZero = (lead * b) % 10 === 0
    if (d === 1 && extraZero) continue
    if (d >= 2 && place !== 1000 && !extraZero) continue
    if (lead * place * b > 9999) continue
    return { a: lead * place, b, lead, place }
  }
}

/** 两位数乘一位数、每一位都不进位的全部组合（11 × 9、12 × 3、21 × 4、32 × 3、44 × 2……） */
export const NO_CARRY_2: [number, number][] = (() => {
  const out: [number, number][] = []
  for (let a = 11; a <= 99; a++) {
    if (a % 10 === 0) continue
    for (let b = 2; b <= 9; b++) if (noCarry(a, b)) out.push([a, b])
  }
  return out
})()

/** 十块条的图：每组 tens 根、ones 个，组数 = 乘数（组太多在手机上太挤，最多 6 组） */
function blocksOf(a: number, b: number): StemPart[] {
  if (a >= 100 || b > 6 || Math.floor(a / 10) > 4) return []
  return [{ kind: 'blocks', groups: b, tens: Math.floor(a / 10), ones: a % 10 }]
}

function oralRound(d: Difficulty, rng: RNG): Question {
  const { a, b, lead, place } = roundFactor(d, rng)
  const p = a * b
  const pic = d === 1 && place === 10 && rng.chance(0.4) ? blocksOf(a, b) : []
  const e = `${a} × ${b} = ?`
  // 常见错误：少写 0、多写 0、多乘 / 少乘了一次
  return numQ(ORAL, d, flat(e), [...pic, expr(e)], p, rng, [(lead * b * place) / 10, p * 10, p + a, p - a])
}

function oralTwoDigit(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(NO_CARRY_2)
  const t = Math.floor(a / 10)
  const o = a % 10
  const p = a * b
  const pic = rng.chance(0.45) ? blocksOf(a, b) : []
  const e = `${a} × ${b} = ?`
  // 常见错误：只乘了十位或只乘了个位、差一个十
  return numQ(ORAL, d, flat(e), [...pic, expr(e)], p, rng, [t * 10 * b + o, t * 10 + o * b, p + 10, p - 10])
}

/** 「20 是 2 个十。20 × 3 是几个十？」两句话分两行（一行放不下时不在「几个 / 十」中间断开） */
function countStem(a: number, k: number, b: number, hundreds: boolean): StemPart[] {
  return hundreds
    ? [text('m3.mul.hundredsIs', { a, k }), text('m3.mul.hundredsAsk', { a, b })]
    : [text('m3.mul.tensIs', { a, k }), text('m3.mul.tensAsk', { a, b })]
}

/** 「20 是 2 个十，20 × 3 是几个十？」「300 是 3 个百，300 × 4 是几个百？」（都是变成表内乘法来口算） */
function oralCount(d: Difficulty, rng: RNG): Question {
  const hundreds = d >= 2
  const lead = rng.int(1, 9)
  const b = rng.int(2, 9)
  const a = lead * (hundreds ? 100 : 10)
  return numQ(ORAL, d, `${hundreds ? 'h' : 't'}-${a}x${b}`, countStem(a, lead, b, hundreds), lead * b, rng, [a * b, lead + b, lead * b + 1, lead * b - 1])
}

/** 坐游乐项目（单元首页：激流勇进 10 元、碰碰车 12 元、过山车 20 元；例 1、例 2） */
function oralRide(d: Difficulty, rng: RNG): Question {
  const ride = rng.pick([
    { key: 'm3.mul.w.coaster', p: 20, ns: [2, 3, 4, 6, 7, 8, 9] },
    { key: 'm3.mul.w.bumper', p: 12, ns: [2, 3, 4] },
    { key: 'm3.mul.w.rapids', p: 10, ns: [2, 3, 4, 5, 6, 7, 8, 9] },
  ])
  const n = rng.pick(ride.ns)
  const p = ride.p * n
  return numQ(ORAL, d, `${ride.key}-${n}`, [text(ride.key, { p: ride.p, n })], p, rng, [ride.p + n, p + 10, p - 10, p * 10])
}

/** 一步应用题（练习八 3、4、5、7、10，练习十一 2） */
function oralWord(d: Difficulty, rng: RNG): Question {
  const pool: (() => { key: string; p: Params; value: number; smart: number[] })[] = [
    () => {
      const p = rng.pick([60, 70, 80, 90])
      const n = rng.int(2, 9)
      return { key: 'm3.mul.w.tricycle', p: { p, n }, value: p * n, smart: [p + n, (p / 10) * n, p * n + p] }
    },
    () => {
      const p = rng.pick([10, 20, 30, 50])
      const n = rng.int(2, 9)
      return { key: 'm3.mul.w.saving', p: { p, n }, value: p * n, smart: [p + n, (p / 10) * n, p * n - p] }
    },
    () => {
      const p = rng.pick([20, 30])
      const n = rng.int(2, 9)
      return { key: 'm3.mul.w.tomato', p: { p, n }, value: p * n, smart: [p + n, (p / 10) * n, p * n + p] }
    },
    () => {
      const n = rng.int(2, 4)
      return { key: 'm3.mul.w.shuttle', p: { p: 12, n }, value: 12 * n, smart: [12 + n, 12 * n + 10, 12 * n - 10] }
    },
    () => {
      const n = rng.pick([100, 200, 300, 400])
      return { key: 'm3.mul.w.desks', p: { n }, value: n * 2, smart: [n + 2, n, n * 2 + 100] }
    },
    () => {
      const a = rng.pick([30, 40])
      const k = rng.int(2, 3)
      return { key: 'm3.mul.w.cheetah', p: { a, k }, value: a * k, smart: [a + k, a * k + a, (a / 10) * k] }
    },
    () => {
      const n = rng.int(2, 9)
      return { key: 'm3.mul.w.coaster', p: { p: 20, n }, value: 20 * n, smart: [20 + n, 2 * n, 20 * n + 20] }
    },
  ]
  const w = rng.pick(pool)()
  return numQ(ORAL, d, `${w.key}-${Object.values(w.p).join('-')}`, [text(w.key, w.p)], w.value, rng, w.smart)
}

/** 找规律（练习八 2、练习十 6）：先给 6 × 9 = 54，再算 600 × 9；两位数的也行（21 × 3 → 2100 × 3） */
function patternQ(kpId: string, d: Difficulty, rng: RNG, scales: number[]): Question {
  const two = rng.chance(0.4)
  const [x, b] = two ? rng.pick(NO_CARRY_2) : [rng.int(2, 9), rng.int(2, 9)]
  const s = rng.pick(scales)
  const a = x * s
  const p = a * b
  if (p > 9999) return patternQ(kpId, d, rng, scales)
  const e = `${a} × ${b} = ?`
  return numQ(kpId, d, `pat-${flat(e)}`, [text('m3.mul.pattern'), expr(`${x} × ${b} = ${x * b}`), expr(e)], p, rng, [x * b, p / 10, p * 10, p + a])
}

/** 两步计算（练习八 8）：a × b + c、a × b - c、(m - n) × b */
function twoStepExpr(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 2)
  let e: string
  let value: number
  let smart: number[]
  if (kind === 0) {
    // 7 × 8 + 6、20 × 3 + 98、2000 × 4 + 1980
    const size = rng.int(0, 2)
    const b = rng.int(2, size === 2 ? 4 : 9)
    const x = size === 0 ? rng.int(2, 9) : size === 1 ? rng.int(1, 9) * 10 : rng.int(1, Math.floor(8 / b)) * 1000
    const c = size === 0 ? rng.int(1, 9) : size === 1 ? rng.int(11, 99) : rng.int(1001, Math.min(1999, 9999 - x * b))
    e = `${x} × ${b} + ${c}`
    value = x * b + c
    smart = [x * (b + c), x * b, value + 10, value - 10]
  } else if (kind === 1) {
    // 70 × 9 - 120
    const x = rng.int(2, 9) * 10
    const b = rng.int(2, 9)
    const c = rng.int(1, (x * b) / 10 - 1) * 10
    e = `${x} × ${b} - ${c}`
    value = x * b - c
    smart = [x * b, value + 10, value - 10, value + 100]
  } else {
    // (406 - 385) × 3：括号里的差是两位数、乘的时候不进位
    const [q, b] = rng.pick(NO_CARRY_2)
    const m = rng.int(300, 499)
    const n = m - q
    e = `(${m} - ${n}) × ${b}`
    value = q * b
    smart = [m - n * b, q + b, value + 10, value - 10]
  }
  return numQ(kpId, d, flat(e), [expr(`${e} = ?`)], value, rng, smart)
}

/** 栽的杨树比槐树的 2 倍多 5 棵（练习八 11） */
function treesQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const pairs = NO_CARRY_2.filter(([, b]) => b <= 4)
  const [a, k] = rng.pick(pairs)
  const m = rng.int(1, 9)
  return numQ(kpId, d, `trees-${a}-${k}-${m}`, [text('m3.mul.w.trees', { a, k, m })], a * k + m, rng, [a * k, a * k - m, (a + m) * k, a + k + m])
}

/** 买足球付钱找钱（练习十一 3，这里用整十的价钱口算） */
function footballQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 4)
  const p = rng.pick([20, 30, 40])
  const cost = n * p
  const pay = Math.ceil((cost + 1) / 100) * 100
  return numQ(kpId, d, `football-${n}-${p}-${pay}`, [text('m3.mul.w.football', { n, p, pay })], pay - cost, rng, [cost, pay - p, pay - cost + 10, pay - cost - 10])
}

defineGenerator(ORAL, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.33) return oralRound(d, rng)
    if (roll < 0.66) return oralTwoDigit(d, rng)
    if (roll < 0.82) return oralCount(d, rng)
    return oralRide(d, rng)
  }
  if (d === 2) {
    if (roll < 0.3) return oralRound(d, rng)
    if (roll < 0.52) return patternQ(ORAL, d, rng, [10, 100])
    if (roll < 0.62) return oralCount(d, rng)
    return oralWord(d, rng)
  }
  if (roll < 0.45) return twoStepExpr(ORAL, d, rng)
  if (roll < 0.75) return treesQ(ORAL, d, rng)
  return footballQ(ORAL, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 笔算乘法（p43–48）：两位数、三位数乘一位数，不进位、一次进位、连续进位；用竖式算。
// 第 1 档：两位数乘一位数（24 × 2、16 × 3、27 × 4、39 × 2、41 × 8）约 40%；三位数乘一位数约 35%（课本每个例题的「试一试」和
//          做一做就有：213 × 2、312 × 3、162 × 4、421 × 3、326 × 8、137 × 6，不进位、一次进位、连续进位都有，积最多 4 位）；
//          例 1–3 的应用题约 25%，含三位数的（东北虎 213 × 3、快递）。
// 第 2 档：三位数乘一位数（499 × 3、824 × 5，多数要进位）；三位数的应用题。
// 第 3 档：下面的计算正确吗（12 × 7 = 74、23 × 4 = 812）；四位数乘一位数；两步的应用题（最后一辆车、火车票、高铁座位）。
// 中间、末尾有 0 的归「有0的乘法」。
// ─────────────────────────────────────────────────────────────

/** 两位数乘一位数（个位不是 0）：约 3/4 要进位 */
function twoDigit(rng: RNG): [number, number] {
  const carry = rng.chance(0.75)
  for (;;) {
    const a = rng.int(11, 99)
    const b = rng.int(2, 9)
    if (a % 10 === 0 || noCarry(a, b) === carry) continue
    return [a, b]
  }
}

/** 没有 0 的多位数（digits 位），乘一位数、积不超过 max */
function noZeroNumber(rng: RNG, digits: number, b: number, max = 9999): number {
  for (;;) {
    let a = 0
    for (let i = 0; i < digits; i++) a = a * 10 + rng.int(1, 9)
    if (a * b <= max) return a
  }
}

/** 三位数乘一位数（各位都不是 0）：多数要进位；给了 carry 就按它定要不要进位（第 1 档约 1/4 不进位，像 213 × 2、312 × 3） */
function threeDigit(rng: RNG, carry?: boolean): [number, number] {
  for (;;) {
    const b = rng.int(2, 9)
    const a = noZeroNumber(rng, 3, b)
    if (carry === undefined ? noCarry(a, b) && rng.chance(0.7) : noCarry(a, b) === carry) continue
    return [a, b]
  }
}

/** 个位不是 0 的数 */
function notRound(rng: RNG, lo: number, hi: number): number {
  for (;;) {
    const x = rng.int(lo, hi)
    if (x % 10 !== 0) return x
  }
}

/** 应用题（例 1–3、练习九） */
function writtenWord(d: Difficulty, rng: RNG): Question {
  const two: (() => { key: string; p: Params; value: number })[] = [
    () => {
      const a = notRound(rng, 12, 36)
      const n = rng.int(2, 9)
      return { key: 'm3.mul.w.pens', p: { a, n }, value: a * n }
    },
    () => {
      const a = notRound(rng, 12, 25)
      const n = rng.int(2, 9)
      return { key: 'm3.mul.w.comics', p: { a, n }, value: a * n }
    },
    () => {
      const a = rng.pick([12, 15, 16, 18, 24])
      const n = rng.int(2, 9)
      return { key: 'm3.mul.w.water', p: { a, n }, value: a * n }
    },
    () => {
      const n = rng.int(3, 9)
      const a = notRound(rng, 12, 28)
      return { key: 'm3.mul.w.building', p: { n, a }, value: a * n }
    },
    () => {
      const a = notRound(rng, 35, 98)
      const n = rng.int(3, 9)
      return { key: 'm3.mul.w.fan', p: { a, n }, value: a * n }
    },
    () => {
      const p = notRound(rng, 12, 29)
      const n = rng.int(2, 9)
      return { key: 'm3.mul.w.mango', p: { p, n }, value: p * n }
    },
  ]
  const three: (() => { key: string; p: Params; value: number })[] = [
    () => {
      const a = notRound(rng, 111, 199)
      const n = rng.int(2, 9)
      return { key: 'm3.mul.w.courier', p: { a, n }, value: a * n }
    },
    () => {
      const a = notRound(rng, 112, 168)
      const n = rng.int(3, 9)
      return { key: 'm3.mul.w.flowerBox', p: { a, n }, value: a * n }
    },
    () => {
      const a = notRound(rng, 152, 219)
      const n = rng.int(3, 9)
      return { key: 'm3.mul.w.bike', p: { a, n }, value: a * n }
    },
    () => {
      const a = notRound(rng, 152, 248)
      const k = rng.int(2, 4)
      return { key: 'm3.mul.w.bear', p: { a, k }, value: a * k }
    },
  ]
  const pool = rng.chance(d === 1 ? 0.4 : 0.7) ? three : two
  const w = rng.pick(pool)()
  const nums = Object.values(w.p) as number[]
  const [x, y] = [Math.max(...nums), Math.min(...nums)]
  return numQ(WRITTEN, d, `${w.key}-${nums.join('-')}`, [text(w.key, w.p)], w.value, rng, writtenSmart(x, y))
}

/** 下面的计算正确吗（练习九 8、练习十 11）：一半是对的，一半是忘了进位 / 把每一位的积连着写 */
function judgeQ(kpId: string, d: Difficulty, rng: RNG, pickA: () => [number, number]): Question {
  for (;;) {
    const [a, b] = pickA()
    const p = a * b
    const wrongs = [forgotCarry(a, b), concatProducts(a, b), a % 10 === 0 ? p / 10 : NaN].filter((w) => Number.isInteger(w) && w !== p && w > 0)
    const right = rng.chance(0.45)
    if (!right && !wrongs.length) continue
    const shown = right ? p : rng.pick(wrongs)
    return pickQ(
      kpId,
      d,
      `judge-${a}x${b}=${shown}`,
      [text('m3.mul.check'), expr(`${a} × ${b} = ${shown}`)],
      { k: right ? 'm3.mul.right' : 'm3.mul.wrong' },
      [{ k: right ? 'm3.mul.wrong' : 'm3.mul.right' }],
      rng,
    )
  }
}

/** 370 名学生乘 7 辆汽车，前 6 辆各坐 54 名，最后一辆坐几名（练习九 12） */
function lastBusQ(d: Difficulty, rng: RNG): Question {
  const k = rng.int(3, 8)
  const e = rng.int(41, 58)
  const last = rng.int(e - 20, e - 1)
  const t = e * (k - 1) + last
  return numQ(WRITTEN, d, `lastbus-${t}-${k}-${e}`, [text('m3.mul.w.lastBus', { t, k, k1: k - 1, e })], last, rng, [e, e - last, last + 10, last - 10])
}

/** 火车票：两张成人票加一张儿童票（练习十 14，儿童票是半价） */
function trainFareQ(d: Difficulty, rng: RNG): Question {
  const q = rng.int(61, 149)
  const p = q * 2
  return numQ(WRITTEN, d, `fare-${p}-${q}`, [text('m3.mul.w.trainFare', { p, q })], p * 2 + q, rng, [p + q, p * 3, p * 2 + q * 2, p * 2])
}

/** 高铁一等座 / 二等座车厢的座位（练习九 15） */
function seatsQ(d: Difficulty, rng: RNG): Question {
  const r1 = rng.int(10, 15)
  const r2 = rng.int(15, 20)
  const [c1, c2] = [4, 5]
  const value = r2 * c2 - r1 * c1
  return numQ(WRITTEN, d, `seats-${r1}-${r2}`, [text('m3.mul.w.seats', { r1, c1, r2, c2 })], value, rng, [r2 * c2 + r1 * c1, r2 * c2, r1 * c1, r2 - r1])
}

defineGenerator(WRITTEN, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.4) {
      const [a, b] = twoDigit(rng)
      return verticalQ(WRITTEN, d, a, b, rng)
    }
    if (roll < 0.75) {
      const [a, b] = threeDigit(rng, rng.chance(0.75))
      return verticalQ(WRITTEN, d, a, b, rng)
    }
    return writtenWord(d, rng)
  }
  if (d === 2) {
    if (roll < 0.66) {
      const [a, b] = threeDigit(rng)
      return verticalQ(WRITTEN, d, a, b, rng)
    }
    return writtenWord(d, rng)
  }
  if (roll < 0.35) return judgeQ(WRITTEN, d, rng, () => (rng.chance(0.5) ? twoDigit(rng) : threeDigit(rng)))
  if (roll < 0.5) {
    const b = rng.int(2, 7)
    return verticalQ(WRITTEN, d, noZeroNumber(rng, 4, b), b, rng)
  }
  if (roll < 0.67) return lastBusQ(d, rng)
  if (roll < 0.84) return trainFareQ(d, rng)
  return seatsQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 有0的乘法（p49–50、练习十）：0 和任何数相乘都得 0；乘数中间有 0（604 × 8）、末尾有 0（280 × 3）的笔算。
// 第 1 档：0 × 6、6 × 0 和 5 + 0、0 + 8 混着口算；中间 / 末尾有 0 的竖式；例 5、例 6 的应用题。
// 第 2 档：哪个算式的得数是 0（课本「填运算符号」，只出答案唯一的）；找规律（21 × 3 → 2100 × 3）；
//          「280 是 28 个十」；604 × 8 积的十位上写几（课本「十位上写几？」）。
// 第 3 档：比大小（8 × 0 ○ 8 + 0、304 × 8 ○ 2400、14 × 6 ○ 16 × 4）；方阵、往返两次；四位数里有 0 的竖式（1207 × 8）。
// ─────────────────────────────────────────────────────────────

/** 0 的口算，和加 0、减 0 混着出（做一做 1、练习十 2） */
function zeroOral(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.7) ? rng.int(1, 9) : rng.int(10, 999)
  const form = rng.int(0, 4)
  const e = [`0 × ${n}`, `${n} × 0`, `${n} + 0`, `0 + ${n}`, `${n} - 0`][form]!
  const value = form <= 1 ? 0 : n
  const smart = form <= 1 ? [n, 1, 10] : [0, n + 1, n - 1]
  return numQ(ZERO, d, `z-${flat(e)}`, [expr(`${e} = ?`)], value, rng, smart)
}

/** 中间有 0 的三位数（604）或末尾有 0 的（280），乘一位数 */
function zeroFactor(rng: RNG, middle: boolean): [number, number] {
  const b = rng.int(2, 9)
  const h = rng.int(1, 9)
  const a = middle ? h * 100 + rng.int(1, 9) : h * 100 + rng.int(1, 9) * 10
  return [a, b]
}

function zeroVertical(d: Difficulty, rng: RNG): Question {
  if (d === 3) {
    // 四位数里有 0（1207 × 8、2900 × 3），积不超过四位
    for (;;) {
      const b = rng.int(2, 8)
      const a = rng.int(1001, Math.floor(9999 / b))
      if (!/0/.test(String(a).slice(1))) continue
      return verticalQ(ZERO, d, a, b, rng, [forgotCarry(a, b), a * b + 10, a * b - 10, a * b + 100, a * b - 100])
    }
  }
  const middle = rng.chance(0.5)
  const [a, b] = zeroFactor(rng, middle)
  const p = a * b
  // 中间有 0：进上来的数忘了写在 0 那一位；末尾有 0：积的末尾少写 / 多写一个 0
  const smart = middle ? [forgotCarry(a, b), p + 10, p - 10, p + 100] : [p / 10, p * 10, forgotCarry(a, b), p + 100]
  return verticalQ(ZERO, d, a, b, rng, smart)
}

/** 例 5 运动场的座位（604 × 8）、例 6 科普丛书（280 × 3） */
function zeroWord(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [s, n] = zeroFactor(rng, true)
    return numQ(ZERO, d, `stadium-${n}-${s}`, [text('m3.mul.w.stadium', { n, s })], n * s, rng, [forgotCarry(s, n), n * s + 10, n * s - 10])
  }
  const [p, n] = zeroFactor(rng, false)
  return numQ(ZERO, d, `science-${n}-${p}`, [text('m3.mul.w.scienceBooks', { n, p })], n * p, rng, [(n * p) / 10, n * p * 10, n * p + 100])
}

/**
 * 哪个算式的得数是几（做一做 2「在○里填上适当的运算符号」，只出答案唯一的）：
 * n × 0 = 0（n + 0、n - 0 都是 n）、0 + n = n（0 × n、n × 0 都是 0）、n - n = 0（n ≥ 2 时 n + n、n × n 都不是 0）、0 × n = 0。
 * 0 ○ 4 = 0（× 或 ÷）、0 ○ 0 = 0 这种答案不唯一的不出。
 */
function whichOpQ(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.75) ? rng.int(2, 9) : rng.int(10, 99)
  const form = rng.int(0, 3)
  const [c, correct, others] =
    form === 0
      ? [0, `${n} × 0`, [`${n} + 0`, `${n} - 0`]]
      : form === 1
        ? [n, `0 + ${n}`, [`0 × ${n}`, `${n} × 0`]]
        : form === 2
          ? [0, `${n} - ${n}`, [`${n} + ${n}`, `${n} × ${n}`]]
          : [0, `0 × ${n}`, [`0 + ${n}`, `${n} - 0`]]
  return pickQ(ZERO, d, `op-${form}-${n}`, [text('m3.mul.whichOp', { c })], correct, others, rng)
}

/** 280 是 28 个十，280 × 3 是几个十（「看作 28 个十乘 3，得 84 个十」）；1500 是 15 个百 */
function zeroCount(d: Difficulty, rng: RNG): Question {
  const x = rng.int(11, 99)
  if (x % 10 === 0) return zeroCount(d, rng)
  const hundreds = rng.chance(0.35)
  const b = rng.int(2, hundreds ? 6 : 9)
  if (hundreds && x * 100 * b > 9999) return zeroCount(d, rng)
  const a = x * (hundreds ? 100 : 10)
  const v = x * b
  return numQ(ZERO, d, `${hundreds ? 'h' : 't'}-${a}x${b}`, countStem(a, x, b, hundreds), v, rng, [v * 10, forgotCarry(x, b), v + 10, v - 10])
}

/** 604 × 8 用竖式算，积的十位上写几（例 5「十位上写几？」）：个位乘出来进的数写在 0 那一位 */
function tensDigitQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const [a, b] = zeroFactor(rng, true)
    const o = a % 10
    if (o * b < 10 && rng.chance(0.8)) continue
    const tens = Math.floor((a * b) / 10) % 10
    const pool = [0, (o * b) % 10, tens + 1, tens === 0 ? 1 : tens - 1, b].filter((x) => x !== tens && x <= 9)
    const distractors = [...new Set(pool)].slice(0, 3).map(String)
    return pickQ(ZERO, d, `tens-${a}x${b}`, [text('m3.mul.tensDigit', { a, b }), { kind: 'vertical', a, op: '×', b }], String(tens), distractors, rng)
  }
}

/** 比大小（练习十 2）：和 0 有关的、304 × 8 ○ 2400 这种估一估的、14 × 6 ○ 16 × 4 */
function compareQ(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.6) ? rng.int(2, 9) : rng.int(10, 199)
  const kind = rng.int(0, 6)
  let left: string
  let right: string
  let lv: number
  let rv: number
  if (kind === 0) [left, right, lv, rv] = [`${n} × 0`, `${n} + 0`, 0, n]
  else if (kind === 1) [left, right, lv, rv] = [`${n} × 0`, `${n} - 0`, 0, n]
  else if (kind === 2) [left, right, lv, rv] = [`${n} + 0`, `${n} - 0`, n, n]
  else if (kind === 3) [left, right, lv, rv] = [`0 × ${n}`, `${n} × 0`, 0, 0]
  else if (kind === 4) {
    // 304 × 8 ○ 2400（比 300 × 8 多）、296 × 8 ○ 2400（比 300 × 8 少）
    const b = rng.int(2, 9)
    const h = rng.int(1, 9)
    const up = rng.chance(0.5)
    const a = up ? h * 100 + rng.int(1, 9) : h * 100 - rng.int(1, 9)
    ;[left, right, lv, rv] = [`${a} × ${b}`, String(h * 100 * b), a * b, h * 100 * b]
  } else if (kind === 5) {
    // 400 + 9 ○ 400 × 9
    const x = rng.pick([rng.int(2, 9), rng.int(2, 9) * 10, rng.int(2, 9) * 100])
    const y = rng.int(2, 9)
    ;[left, right, lv, rv] = [`${x} + ${y}`, `${x} × ${y}`, x + y, x * y]
  } else {
    // 14 × 6 ○ 16 × 4：两个算式都是 1 个十加几乘几，比的是 10 × 6 和 10 × 4
    const x = rng.int(2, 9)
    let y = rng.int(2, 9)
    if (y === x) y = x === 9 ? 2 : x + 1
    ;[left, right, lv, rv] = [`${10 + x} × ${y}`, `${10 + y} × ${x}`, (10 + x) * y, (10 + y) * x]
  }
  const correct = lv > rv ? '>' : lv < rv ? '<' : '='
  return pickQ(ZERO, d, `cmp-${flat(left)}-${flat(right)}`, [text('m3.mul.compare'), expr(`${left} ○ ${right}`)], correct, ['>', '<', '='].filter((s) => s !== correct), rng, 'compare')
}

/** 每个方阵 108 名学生（练习十 4）；小峰每天往返学校两次（练习十 7：家到学校的路要走 4 趟） */
function zeroStory(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const a = rng.int(101, 109)
    const n = rng.int(2, 9)
    return numQ(ZERO, d, `squares-${a}-${n}`, [text('m3.mul.w.squares', { a, n })], a * n, rng, [forgotCarry(a, n), a * n + 10, a * n - 10, a + n])
  }
  const dist = rng.int(1, 9) * 100 + rng.int(1, 9) * 10
  return numQ(ZERO, d, `roundtrip-${dist}`, [text('m3.mul.w.roundTrip', { d: dist })], dist * 4, rng, [dist * 2, dist * 3, dist * 4 + 100, dist * 4 - 100])
}

defineGenerator(ZERO, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.35) return zeroOral(d, rng)
    if (roll < 0.82) return zeroVertical(d, rng)
    return zeroWord(d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return whichOpQ(d, rng)
    if (roll < 0.43) return patternQ(ZERO, d, rng, [100, 1000])
    if (roll < 0.61) return zeroCount(d, rng)
    if (roll < 0.8) return tensDigitQ(d, rng)
    return zeroVertical(d, rng)
  }
  if (roll < 0.45) return compareQ(d, rng)
  if (roll < 0.75) return zeroStory(d, rng)
  if (roll < 0.87) return judgeQ(ZERO, d, rng, () => zeroFactor(rng, rng.chance(0.5)))
  return zeroVertical(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 用估算解决问题（p45、p51、练习十、练习十一）：只问够不够、能不能时，估一估就能判断。
// 往大估还够 → 一定够（987 人看成 1000 人，8 × 1000 = 8000，钱够）；往小估已经不够 → 一定不够（218 元看成 200 元，5 双已经 1000 元）。
// 题目里的数都按这个道理取：估出来的数正好等于钱数 / 路程，真正的得数一定在它的一边，答案唯一。
// 第 1 档：够不够（题里提示把几看成几）；积在哪两个整十数乘出来的数之间（例 3）。
// 第 2 档：够不够（不提示）；积在哪两个数之间；积最接近哪个数；7 分钟能不能走到学校。
// 第 3 档：限乘人数里包括司机；纽扣够不够；三个班次选哪个；8 袋稻谷能不能一次运走。
// ─────────────────────────────────────────────────────────────

const ENOUGH: LStr = { k: 'm3.mul.enough' }
const NOT_ENOUGH: LStr = { k: 'm3.mul.notEnough' }
const CAN: LStr = { k: 'm3.mul.can' }
const CANNOT: LStr = { k: 'm3.mul.cannot' }

/** 离整百（整十）差一点的数：base ± δ，个位不是 0（987、218、197） */
function near(rng: RNG, base: number, up: boolean, spread: number): number {
  for (;;) {
    const delta = rng.int(1, spread)
    const v = up ? base + delta : base - delta
    if (v % 10 !== 0) return v
  }
}

/**
 * 够不够：人数版（学生人数 × 每人几元，钱数 = 整百人数 × 单价）或单价版（件数 × 单价，钱数 = 件数 × 整百单价）。
 * enough = 往大估（把数看成比它大的整百数）还够；否则往小估已经不够。hint = 题里写「把几看成几」
 */
function enoughQ(d: Difficulty, rng: RNG, hint: boolean): Question {
  const enough = rng.chance(0.5)
  if (rng.chance(0.45)) {
    const key = rng.pick(['m3.mul.est.tickets', 'm3.mul.est.water'])
    const r = rng.pick(key === 'm3.mul.est.tickets' ? [300, 400, 500, 600, 700, 800, 900, 1000] : [200, 300, 400, 500])
    const p = rng.int(2, 9)
    const n = near(rng, r, !enough, r <= 200 ? 15 : 29)
    const m = r * p
    const stem = [text(key, { n, p, m }), ...(hint ? [text('m3.mul.est.hint', { x: n, r })] : [])]
    return pickQ(ESTIMATE, d, `enough-${key}-${n}-${p}-${m}`, stem, enough ? ENOUGH : NOT_ENOUGH, [enough ? NOT_ENOUGH : ENOUGH], rng)
  }
  const key = rng.pick(['m3.mul.est.skates', 'm3.mul.est.storyBooks', 'm3.mul.est.fans'])
  const R = rng.pick(key === 'm3.mul.est.skates' ? [100, 200, 300] : [100, 200, 300, 400, 500])
  // 「台」不在「2 读两」的量词表里：电风扇至少买 3 台
  const q = rng.int(key === 'm3.mul.est.fans' ? 3 : 2, 9)
  const price = near(rng, R, !enough, R <= 200 ? 15 : 29)
  const m = R * q
  const stem = [text(key, { q, p: price, m }), ...(hint ? [text('m3.mul.est.hint', { x: price, r: R })] : [])]
  return pickQ(ESTIMATE, d, `enough-${key}-${q}-${price}-${m}`, stem, enough ? ENOUGH : NOT_ENOUGH, [enough ? NOT_ENOUGH : ENOUGH], rng)
}

/** 积在哪两个数之间（例 3「20 < 24 < 30，24 × 9 的得数应该在 180 和 270 之间」）：两位数用整十、三位数用整百夹住 */
function betweenQ(d: Difficulty, rng: RNG): Question {
  const three = d >= 2 && rng.chance(0.5)
  const step = three ? 100 : 10
  const b = rng.int(2, 9)
  let a = three ? rng.int(201, 999) : rng.int(21, 99)
  if (a % step === 0) a += rng.int(1, 9)
  const lo = Math.floor(a / step) * step * b
  const hi = lo + step * b
  const range = (x: number, y: number): LStr => ({ k: 'm3.mul.est.range', p: { lo: x, hi: y } })
  return pickQ(ESTIMATE, d, `between-${a}x${b}`, [text('m3.mul.est.between'), expr(`${a} × ${b}`)], range(lo, hi), [range(lo - step * b, lo), range(hi, hi + step * b)], rng)
}

/** 积最接近哪个数（p97「估一估，连一连」）：把两位数看成整十数、三位数看成整百数；只出离整十 / 整百很近的数，不出正好一半的 */
function closestQ(d: Difficulty, rng: RNG): Question {
  const three = rng.chance(0.5)
  const step = three ? 100 : 10
  for (;;) {
    const a = three ? rng.int(101, 999) : rng.int(11, 99)
    const b = rng.int(2, 9)
    const r = Math.round(a / step) * step
    if (Math.abs(a - r) > step * 0.3 || a === r) continue
    const est = r * b
    const others = [(r + step) * b, (r - step) * b, (r + 2 * step) * b].filter((x) => x > 0 && x !== est)
    return pickQ(ESTIMATE, d, `closest-${a}x${b}`, [text('m3.mul.est.closest'), expr(`${a} × ${b}`)], String(est), others.slice(0, 3).map(String), rng)
  }
}

/** 每分钟走 65 米，7 分钟能不能走完 400 米（练习十一 2）：能 = 往小估（60 × 7 = 420）已经够远；不能 = 往大估也不够 */
function walkQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const v = rng.int(51, 89)
    const t = rng.int(5, 9)
    if (v % 10 === 0) continue
    const can = rng.chance(0.5)
    const est = (can ? Math.floor(v / 10) : Math.ceil(v / 10)) * 10 * t
    const dist = can ? Math.floor(est / 100) * 100 : Math.ceil(est / 100) * 100
    if (dist < 200 || dist > 900 || Math.abs(est - dist) > 50) continue
    return pickQ(ESTIMATE, d, `walk-${dist}-${v}-${t}`, [text('m3.mul.est.walk', { d: dist, v, t })], can ? CAN : CANNOT, [can ? CANNOT : CAN], rng)
  }
}

/** 417 名师生、每辆车限乘 49 人（包括司机）、8 辆车够吗（练习十 9）：每辆车坐 48 名师生 */
function busQ(d: Difficulty, rng: RNG): Question {
  const c = rng.int(41, 59)
  const s = c - 1
  const k = rng.int(5, 9)
  const enough = rng.chance(0.5)
  const n = enough ? Math.floor(s / 10) * 10 * k - rng.int(0, 30) : Math.ceil(s / 10) * 10 * k + rng.int(1, 30)
  return pickQ(ESTIMATE, d, `bus-${n}-${c}-${k}`, [text('m3.mul.est.bus', { n, c, k })], enough ? ENOUGH : NOT_ENOUGH, [enough ? NOT_ENOUGH : ENOUGH], rng)
}

/** 7 颗纽扣缝一朵花，缝 68 朵，买 400 颗够不够、500 颗呢（练习十一 4） */
function buttonsQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const k = rng.int(3, 9)
    const n = rng.int(21, 89)
    if (n % 10 === 0) continue
    const enough = rng.chance(0.5)
    const est = (enough ? Math.ceil(n / 10) : Math.floor(n / 10)) * 10 * k
    const m = enough ? Math.ceil(est / 100) * 100 : Math.floor(est / 100) * 100
    if (m < 100 || Math.abs(est - m) > 40) continue
    return pickQ(ESTIMATE, d, `buttons-${k}-${n}-${m}`, [text('m3.mul.est.buttons', { k, n, m })], enough ? ENOUGH : NOT_ENOUGH, [enough ? NOT_ENOUGH : ENOUGH], rng)
  }
}

/** 张阿姨陪 4 位老人，三个班次 197、208、242 元，1000 元就够了，买的哪个班次（练习十 10）：一共 5 个人 */
function trainQ(d: Difficulty, rng: RNG): Question {
  const R = rng.pick([100, 200, 300])
  const m = rng.int(2, 4)
  const people = m + 1
  const b = R * people
  const p1 = R - rng.int(2, 9)
  const p2 = R + rng.int(5, 15)
  const p3 = R + rng.int(30, 60)
  const fare = (p: number): LStr => ({ k: 'm3.mul.est.fare', p: { p } })
  return pickQ(ESTIMATE, d, `train-${m}-${p1}-${p2}-${p3}`, [text('m3.mul.est.train', { m, p1, p2, p3, b })], fare(p1), [fare(p2), fare(p3)], rng)
}

/**
 * 张大爷家的稻谷能不能一次运走（练习十 15）：每袋都看成整十千克来估，估的和真的结论一样——
 * 8 袋 56–61 千克（估成 60，480 < 500，最多 488）→ 能；9 袋 57–63 千克（估成 60，540 > 500，最少 513）→ 不能；
 * 9 袋 50–54 千克（估成 50，450，最多 486）→ 能；8 袋 66–72 千克（估成 70，560，最少 528）→ 不能。
 */
function riceQ(d: Difficulty, rng: RNG): Question {
  const plan = rng.pick([
    { bags: 8, lo: 56, hi: 61, can: true },
    { bags: 9, lo: 57, hi: 63, can: false },
    { bags: 9, lo: 50, hi: 54, can: true },
    { bags: 8, lo: 66, hi: 72, can: false },
  ])
  const w = Array.from({ length: plan.bags }, () => rng.int(plan.lo, plan.hi))
  const p: Params = { cap: 500 }
  w.forEach((x, i) => (p[`w${i + 1}`] = x))
  return pickQ(ESTIMATE, d, `rice-${w.join('-')}`, [text(`m3.mul.est.rice${plan.bags}`, p)], plan.can ? CAN : CANNOT, [plan.can ? CANNOT : CAN], rng)
}

defineGenerator(ESTIMATE, (d, rng) => {
  const roll = rng.next()
  if (d === 1) return roll < 0.8 ? enoughQ(d, rng, true) : betweenQ(d, rng)
  if (d === 2) {
    if (roll < 0.35) return enoughQ(d, rng, false)
    if (roll < 0.58) return betweenQ(d, rng)
    if (roll < 0.8) return closestQ(d, rng)
    return walkQ(d, rng)
  }
  if (roll < 0.25) return busQ(d, rng)
  if (roll < 0.5) return buttonsQ(d, rng)
  if (roll < 0.75) return trainQ(d, rng)
  return riceQ(d, rng)
})
