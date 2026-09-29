import type { Difficulty, DivLine, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 除数是一位数的除法（三下二，p10–38）：口算除法（含估算）、笔算除法、商中间或末尾有 0、用乘除法解决问题（连乘、连除、归一、归总）。
// 课本的范围（笔记 C）：口算最大到 9000 ÷ 3、6400 ÷ 8；两位数 ÷ 一位数全都能整除，余数只在三位数 ÷ 一位数里有；
// 四位数 ÷ 一位数只有带星号的练习，这里不出。
// 数字键盘一次只能填一个数：有余数的题分开问商或余数，题干写清楚问哪个。竖式用 LongDivision（课本的厂字形，简便写法）。
// 朗读：算式里的「……」读不出「余」，所以题干都用文字说「商是 / 余数是」；不用「得」「地」「长」「行」「种」「只」「数一数」。
// ─────────────────────────────────────────────────────────────

const text = (k: string, p?: Record<string, LStr | number>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const opt = (k: string): LStr => ({ k })
const noZero = (n: number): boolean => !String(n).includes('0')
/** 数位对调（12 → 21），笔算常见的把商写反 */
const swapped = (n: number): number => Number(String(n).split('').reverse().join(''))

// ── 竖式 ──

export interface Work {
  quotient: number
  remainder: number
  rows: DivLine[]
}

/**
 * 按课本的写法（p15、p17、p22、p24，含简便写法）算出竖式的每一行：
 * 最高位不够除就试除前两位；每一位的乘积写在那一位下面、画横线；差和落下来的一位合起来写成下一行（差是 0 时只写落下来的数）；
 * 某一位不够除，商 0，不写乘积和差（简便写法）；最后一位不够除时，落下来的数就是余数（245 ÷ 8 的最后一行 5），
 * 落下来的是 0（余数 0）就只在上一步的差那里写 0（650 ÷ 5）。
 */
export function divisionWork(dividend: number, divisor: number): Work {
  const ds = String(dividend).split('').map(Number)
  const n = ds.length
  const rows: DivLine[] = []
  let i = 0
  let cur = ds[0]!
  if (cur < divisor && n > 1) {
    i = 1
    cur = cur * 10 + ds[1]!
  }
  let q = 0
  let first = true
  let lastEnd = i
  for (;;) {
    const digit = Math.floor(cur / divisor)
    q = q * 10 + digit
    if (digit === 0 && !first) {
      if (i === n - 1) {
        rows.push(ds[i] === 0 ? { text: '0', end: lastEnd } : { text: String(cur), end: i })
        return { quotient: q, remainder: cur, rows }
      }
      i += 1
      cur = cur * 10 + ds[i]!
      continue
    }
    if (!first) rows.push({ text: String(cur), end: i })
    const product = digit * divisor
    rows.push({ text: String(product), end: i, line: true })
    const diff = cur - product
    lastEnd = i
    first = false
    if (i === n - 1) {
      rows.push({ text: String(diff), end: i })
      return { quotient: q, remainder: diff, rows }
    }
    i += 1
    cur = diff * 10 + ds[i]!
  }
}

/** 只有题目的竖式：商那一行是要填的空（和被除数一样宽，不透露商有几位） */
function askFigure(a: number, b: number): StemPart {
  const n = String(a).length
  return { kind: 'long-division', divisor: b, dividend: a, quotient: { text: '?', end: n - 1, w: n } }
}
/** 只有题目、不填空的竖式（问余数、判断商是几位数） */
const plainFigure = (a: number, b: number): StemPart => ({ kind: 'long-division', divisor: b, dividend: a })
/** 算好了的竖式（改错题：看对不对） */
function workedFigure(a: number, b: number, quotient: DivLine, rows: DivLine[]): StemPart {
  return { kind: 'long-division', divisor: b, dividend: a, quotient, rows }
}

interface Div {
  a: number
  b: number
  q: number
  r: number
}
const make = (b: number, q: number, r = 0): Div => ({ a: b * q + r, b, q, r })

/** 商的干扰项：差 1、差 10、数位写反、漏写 0 / 多写 0 */
function quotientSmart(q: number): number[] {
  const s = String(q)
  const out = [q + 1, q - 1, q + 10, q - 10, swapped(q)]
  if (s.includes('0')) out.unshift(Number(s.replace(/0/g, '')))
  else if (s.length === 2) out.unshift(Number(`${s[0]}0${s[1]}`))
  return out.filter((x) => x > 0 && x !== q)
}

/** 一道算商的题（竖式里填商）或算余数的题 */
function askQ(kpId: string, d: Difficulty, x: Div, rng: RNG): Question {
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `q-${x.a}-${x.b}`,
    stem: [text('m3.div.calcQ', { a: x.a, b: x.b }), askFigure(x.a, x.b)],
    value: x.q,
    rng,
    min: 1,
    max: 999,
    smart: quotientSmart(x.q),
  })
}
function askR(kpId: string, d: Difficulty, x: Div, rng: RNG): Question {
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `r-${x.a}-${x.b}`,
    stem: [text('m3.div.calcR', { a: x.a, b: x.b }), plainFigure(x.a, x.b)],
    value: x.r,
    rng,
    min: 0,
    max: 9,
    smart: [x.r + 1, x.r - 1, x.b - x.r, x.b],
  })
}

// ─────────────────────────────────────────────────────────────
// 口算除法（p10–11 例 1–3、练习二 1–6）
// ─────────────────────────────────────────────────────────────

/** 整十、整百、整千数除以一位数，最高位能整除（例 1：60 ÷ 3 = 20，想一想 600 ÷ 3、6000 ÷ 3） */
export function oralRound(rng: RNG): Div {
  const b = rng.int(2, 9)
  const q0 = rng.int(1, Math.floor(9 / b))
  const k = rng.pick([10, 100, 1000])
  return make(b, q0 * k)
}
/** 两位数除以一位数，十位、个位都能整除（例 2：69 ÷ 3 = 23） */
export function oralEach(rng: RNG): Div {
  const b = rng.pick([2, 2, 3, 3, 4, 5, 6, 7, 8, 9])
  const top = Math.floor(9 / b)
  return make(b, rng.int(1, top) * 10 + rng.int(1, top))
}
/** 最高位不够除，看成几十个十 / 几十个百（例 3：120 ÷ 3，把 120 看作 12 个十；练习二 6400 ÷ 8） */
export function oralShort(rng: RNG): Div {
  for (;;) {
    const b = rng.int(2, 9)
    const q0 = rng.int(2, 9)
    const p = b * q0
    if (p < 10 || Math.floor(p / 10) >= b) continue
    const k = rng.chance(0.75) ? 10 : 100
    return make(b, q0 * k)
  }
}

function oralExpr(kpId: string, d: Difficulty, x: Div, rng: RNG): Question {
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `${x.a}÷${x.b}`,
    stem: [{ kind: 'expr', expr: `${x.a} ÷ ${x.b} = ?` }],
    value: x.q,
    rng,
    min: 1,
    max: 9999,
    // 多写 / 少写 0 是口算最常见的错
    smart: [x.q * 10, Math.floor(x.q / 10), x.q + 1, x.q - 1].filter((v) => v > 0 && v !== x.q),
  })
}

/** 口算的应用题（例 1 手工纸、练习二 3 集体舞、练习二 4 花坛、练习二 5 老虎的体重） */
function oralWord(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['paper', 'dance', 'flowers', 'tiger'] as const)
  let x: Div
  if (kind === 'dance') x = make(rng.pick([3, 5, 6, 9]), rng.pick([10, 20, 30]))
  else if (kind === 'tiger') x = make(rng.pick([2, 3, 4, 6]), rng.pick([40, 60, 80]))
  else x = rng.chance(0.5) ? oralEach(rng) : oralRound(rng)
  if (x.a > 999) x = oralEach(rng)
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `word-${kind}-${x.a}-${x.b}`,
    stem: [text(`m3.div.o.${kind}`, { a: x.a, b: x.b })],
    value: x.q,
    rng,
    min: 1,
    max: 999,
    smart: [x.q * 10, Math.floor(x.q / 10), x.a - x.b, x.q + 1].filter((v) => v > 0 && v !== x.q),
  })
}

/** 在「?」里填几（练习二 *11）：96 ÷ 3 + ? = 50、(47 + 19) ÷ ? = 33、40 + ? × 3 = 100、30 + ? ÷ 4 = 41 */
function oralFill(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  let expr: string
  let value: number
  if (kind === 0) {
    const x = oralEach(rng)
    value = rng.int(5, 40)
    expr = `${x.a} ÷ ${x.b} + ? = ${x.q + value}`
  } else if (kind === 1) {
    const x = oralEach(rng)
    const left = rng.int(Math.max(11, Math.floor(x.a / 3)), x.a - 11)
    value = x.b
    expr = `(${left} + ${x.a - left}) ÷ ? = ${x.q}`
  } else if (kind === 2) {
    const b = rng.int(2, 5)
    value = rng.pick([10, 20, 30])
    const left = rng.int(10, 60)
    expr = `${left} + ? × ${b} = ${left + value * b}`
  } else {
    const x = oralEach(rng)
    const left = rng.int(10, 50)
    value = x.a
    expr = `${left} + ? ÷ ${x.b} = ${left + x.q}`
  }
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `fill-${expr.replace(/\s+/g, '')}`,
    stem: [text('m3.div.fillBox'), { kind: 'expr', expr }],
    value,
    rng,
    min: 1,
    max: 999,
    input: 'numpad',
  })
}

defineGenerator('m3s2-02-oral', (d, rng) => {
  const kpId = 'm3s2-02-oral'
  const roll = rng.next()
  if (d === 1) return oralExpr(kpId, d, roll < 0.5 ? oralRound(rng) : oralEach(rng), rng)
  if (d === 2) return oralExpr(kpId, d, roll < 0.65 ? oralShort(rng) : roll < 0.8 ? oralRound(rng) : oralEach(rng), rng)
  return roll < 0.45 ? oralWord(kpId, d, rng) : roll < 0.7 ? oralFill(kpId, d, rng) : oralExpr(kpId, d, oralShort(rng), rng)
})

// ─────────────────────────────────────────────────────────────
// 估算（p12 例 4、练习二 7–9、练习七 5）：把被除数看成接近的整十、整百数来估商；商在哪两个整十数之间
// ─────────────────────────────────────────────────────────────

/** 估的数：r 是好算的整十 / 整百数（r ÷ b = e），a 在 r 附近（不等于 r） */
export function estimatePair(rng: RNG): { a: number; b: number; r: number; e: number } {
  for (;;) {
    const b = rng.int(2, 9)
    const e = rng.chance(0.25) ? rng.pick([100, 200, 300]) : rng.int(2, 9) * 10
    const r = b * e
    if (r < 120 || r > 900) continue
    const spread = Math.max(3, Math.round(r * 0.04))
    const a = r + (rng.chance(0.5) ? 1 : -1) * rng.int(1, spread)
    if (a === r || a % 10 === 0) continue
    return { a, b, r, e }
  }
}

function genEstimateTo(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = estimatePair(rng)
  const kind = rng.pick(['asIs', 'asIs', 'bike', 'peach', 'walk'] as const)
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `to-${kind}-${x.a}-${x.b}-${x.r}`,
    stem: [text(`m3.div.e.${kind}`, { a: x.a, b: x.b, r: x.r })],
    value: x.e,
    rng,
    min: 1,
    max: 999,
    smart: [x.e * 10, x.e + 10, x.e - 10, x.e / 10].filter((v) => Number.isInteger(v) && v > 0),
  })
}

/** 商是几十多（练习二 9：先算 320 ÷ 4、360 ÷ 4，326 ÷ 4 的商是八十多）；或商在哪两个整十数之间（例 4「90 < 283 ÷ 3 < 100」） */
export function tensPair(rng: RNG): { a: number; b: number; t: number } {
  for (;;) {
    const b = rng.int(3, 9)
    const t = rng.int(3, 8)
    const lo = b * t * 10
    const hi = b * (t + 1) * 10
    // 离两头都别太近：一眼就能夹在中间（练习二 10 的 445 ÷ 5、635 ÷ 7 这种估不出来的不要）
    const a = rng.int(lo + Math.max(b, 3), hi - Math.max(b, 3))
    if (a > 999 || a % 10 === 0) continue
    return { a, b, t }
  }
}
function genTensMore(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = tensPair(rng)
  if (rng.chance(0.5)) {
    return labelQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `more-${x.a}-${x.b}`,
      stem: [text('m3.div.e.tensMore', { a: x.a, b: x.b })],
      correct: opt(`m3.div.more${x.t}`),
      distractors: [opt(`m3.div.more${x.t - 1}`), opt(`m3.div.more${x.t + 1}`)],
      rng,
    })
  }
  const between = (lo: number): LStr => ({ k: 'm3.div.betweenOpt', p: { x: lo * 10, y: lo * 10 + 10 } })
  return labelQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `between-${x.a}-${x.b}`,
    stem: [text('m3.div.e.between', { a: x.a, b: x.b })],
    correct: between(x.t),
    distractors: [between(x.t - 1), between(x.t + 1)],
    rng,
  })
}

/** 情境里估一估，选项差出数量级（练习二 7 衣服、练习二 8 走路）：大约 50 元 / 500 元 / 5 元 */
function genEstimateMagnitude(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = estimatePair(rng)
  if (x.e >= 100) return genEstimateMagnitude(kpId, d, rng)
  const yuan = rng.chance(0.5)
  const about = (n: number): LStr => ({ k: yuan ? 'm3.div.aboutYuan' : 'm3.div.aboutM', p: { n } })
  return labelQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `mag-${yuan ? 'y' : 'm'}-${x.a}-${x.b}`,
    stem: [text(yuan ? 'm3.div.e.clothes' : 'm3.div.e.meters', { a: x.a, b: x.b })],
    correct: about(x.e),
    distractors: [about(x.e * 10), about(x.e / 10)],
    rng,
  })
}

/** 估一估，哪个颜色的书包每个最便宜（练习七 5）：三种的单价至少差 12 元，估一估就分得出 */
export const BAGS = ['red', 'blue', 'yellow'] as const
function genCheapest(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const prices = rng.shuffle([55, 60, 65, 70, 75, 80, 85, 90, 95]).slice(0, 3)
    const sorted = [...prices].sort((p, q) => p - q)
    if (sorted[1]! - sorted[0]! < 12 || sorted[2]! - sorted[1]! < 12) continue
    const counts = rng.shuffle([3, 4, 5, 6]).slice(0, 3)
    const totals = prices.map((p, i) => counts[i]! * p + rng.int(-2, 2))
    if (totals.some((t) => t > 999)) continue
    const cheapest = prices.indexOf(sorted[0]!)
    return labelQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `bags-${counts.join(',')}-${totals.join(',')}`,
      stem: [text('m3.div.e.bags', { c1: counts[0]!, a1: totals[0]!, c2: counts[1]!, a2: totals[1]!, c3: counts[2]!, a3: totals[2]! })],
      correct: opt(`m3.div.bag.${BAGS[cheapest]}`),
      distractors: BAGS.filter((_, i) => i !== cheapest).map((c) => opt(`m3.div.bag.${c}`)),
      rng,
    })
  }
}

defineGenerator('m3s2-02-estimate', (d, rng) => {
  const kpId = 'm3s2-02-estimate'
  const roll = rng.next()
  if (d === 1) return genEstimateTo(kpId, d, rng)
  if (d === 2) return roll < 0.6 ? genTensMore(kpId, d, rng) : genEstimateTo(kpId, d, rng)
  return roll < 0.45 ? genEstimateMagnitude(kpId, d, rng) : roll < 0.75 ? genCheapest(kpId, d, rng) : genTensMore(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 笔算除法（p15–21 例 1–3、练习三）：只放商里没有 0 的（商中间、末尾有 0 是下一个知识点）
// ─────────────────────────────────────────────────────────────

/** 两位数除以一位数，都能整除（例 1：36 ÷ 2 = 18；做一做 84 ÷ 6、76 ÷ 4） */
export function written2(rng: RNG): Div {
  for (;;) {
    const b = rng.int(2, 9)
    const q = rng.int(11, Math.floor(99 / b))
    if (noZero(q)) return make(b, q)
  }
}
/** 三位数除以一位数，百位够除，商三位（例 2：256 ÷ 2 = 128；练习三 417 ÷ 3） */
export function written3(rng: RNG, withRem: boolean): Div {
  for (;;) {
    const b = rng.int(2, 7)
    const q = rng.int(100, Math.floor(999 / b))
    const r = withRem ? rng.int(1, b - 1) : 0
    if (noZero(q) && b * q + r <= 999) return make(b, q, r)
  }
}
/** 三位数除以一位数，百位不够除，商两位（例 3：148 ÷ 6 = 24……4） */
export function written3short(rng: RNG, withRem: boolean): Div {
  for (;;) {
    const b = rng.int(2, 9)
    const q = rng.int(Math.ceil(100 / b), 99)
    const r = withRem ? rng.int(1, b - 1) : 0
    if (noZero(q) && b * q + r >= 100) return make(b, q, r)
  }
}

/** 第 1 档：直接笔算，三位数的约三成问余数 */
function genWrittenCalc(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.3) return askQ(kpId, d, written2(rng), rng)
  const x = roll < 0.6 ? written3(rng, rng.chance(0.4)) : written3short(rng, rng.chance(0.6))
  return x.r > 0 && rng.chance(0.45) ? askR(kpId, d, x, rng) : askQ(kpId, d, x, rng)
}

/** 先判断商是几位数（p18 做一做 2、练习三 6） */
function genDigits(kpId: string, d: Difficulty, rng: RNG): Question {
  const three = rng.chance(0.5)
  const x = three ? written3(rng, rng.chance(0.5)) : written3short(rng, rng.chance(0.5))
  return labelQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `digits-${x.a}-${x.b}`,
    stem: [text('m3.div.digits', { a: x.a, b: x.b }), plainFigure(x.a, x.b)],
    correct: opt(three ? 'm3.div.threeDigit' : 'm3.div.twoDigit'),
    distractors: [opt(three ? 'm3.div.twoDigit' : 'm3.div.threeDigit')],
    rng,
  })
}

/** 验算（p15 没有余数：商 × 除数；p18 有余数：商 × 除数 + 余数） */
function genCheck(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.chance(0.5) ? written3short(rng, true) : rng.chance(0.5) ? written2(rng) : written3(rng, false)
  const stem: StemPart[] =
    x.r > 0
      ? [text('m3.div.checkRem', { a: x.a, b: x.b, q: x.q, r: x.r }), { kind: 'expr', expr: `${x.q} × ${x.b} + ${x.r} = ?` }]
      : [text('m3.div.checkExact', { a: x.a, b: x.b, q: x.q }), { kind: 'expr', expr: `${x.q} × ${x.b} = ?` }]
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `check-${x.a}-${x.b}`,
    stem,
    value: x.a,
    rng,
    min: 1,
    max: 999,
    smart: [x.q * x.b, x.a + x.r, x.a + 1, x.a - 1].filter((v) => v !== x.a),
  })
}

/** 应用题（例 1–3、做一做、练习三 3 / 5 / 8 / 10）：ask = 问商还是余数 */
interface WordTpl {
  key: string
  make: (rng: RNG) => Div
  ask: 'q' | 'r'
}
const WRITTEN_WORDS: WordTpl[] = [
  { key: 'm3.div.w.volunteers', make: written2, ask: 'q' },
  { key: 'm3.div.w.trees', make: written2, ask: 'q' },
  { key: 'm3.div.w.ribbon', make: written2, ask: 'q' },
  { key: 'm3.div.w.essays', make: (rng) => written3(rng, false), ask: 'q' },
  { key: 'm3.div.w.episodes', make: (rng) => written3short(rng, false), ask: 'q' },
  { key: 'm3.div.w.pomegranates', make: (rng) => written3short(rng, true), ask: 'q' },
  { key: 'm3.div.w.pomegranatesLeft', make: (rng) => written3short(rng, true), ask: 'r' },
  { key: 'm3.div.w.drinks', make: (rng) => (rng.chance(0.5) ? written3(rng, true) : written3short(rng, true)), ask: 'q' },
  { key: 'm3.div.w.drinksLeft', make: (rng) => (rng.chance(0.5) ? written3(rng, true) : written3short(rng, true)), ask: 'r' },
  { key: 'm3.div.w.bowls', make: (rng) => written3short(rng, rng.chance(0.5)), ask: 'q' },
]
function genWrittenWord(kpId: string, d: Difficulty, rng: RNG): Question {
  const tpl = rng.pick(WRITTEN_WORDS)
  const x = tpl.make(rng)
  const value = tpl.ask === 'q' ? x.q : x.r
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `word-${tpl.key}-${x.a}-${x.b}`,
    stem: [text(tpl.key, { a: x.a, b: x.b })],
    value,
    rng,
    min: 0,
    max: 999,
    smart: tpl.ask === 'q' ? quotientSmart(x.q) : [x.r + 1, x.r - 1, x.b - x.r, x.q],
  })
}

/** 余数最大是几、被除数最大 / 最小是几（练习四 9(3)「甲数 ÷ 乙数 = 25……6，甲数最大是 181」其实是最小） */
function genRemainderLimit(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['maxRem', 'maxDividend', 'minDividend'] as const)
  const q = rng.int(12, 99)
  if (kind === 'minDividend') {
    const r = rng.int(2, 8)
    return numberQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `min-${q}-${r}`,
      stem: [text('m3.div.minDividend', { q, r })],
      value: q * (r + 1) + r,
      rng,
      min: 1,
      max: 999,
      smart: [q * 9 + r, q * r + r, q * (r + 1)],
    })
  }
  const b = rng.int(3, 9)
  const maxRem = kind === 'maxRem'
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `${kind}-${b}-${q}`,
    stem: [text(maxRem ? 'm3.div.maxRem' : 'm3.div.maxDividend', { b, q })],
    value: maxRem ? b - 1 : q * b + b - 1,
    rng,
    min: 0,
    max: 999,
    smart: maxRem ? [b, b + 1, b - 2] : [q * b + b, q * b, q * b + 1],
  })
}

/** 方框里最小 / 最大填几（练习三 12：□6 ÷ 8 的商是两位数；□72 ÷ 4 的商是三位数） */
function genBoxDigit(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['min3', 'max2', 'min2'] as const)
  const b = kind === 'min2' ? rng.int(3, 9) : kind === 'max2' ? rng.int(3, 9) : rng.int(2, 9)
  // 被除数：方框那一位先随便放一个数（画出来是空方框），后面的位随便取
  const rest = kind === 'min2' ? rng.int(0, 9) : rng.int(10, 99)
  const dividend = (kind === 'min2' ? 10 : 100) + rest
  const value = kind === 'max2' ? b - 1 : b
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `box-${kind}-${rest}-${b}`,
    stem: [
      text(kind === 'max2' ? 'm3.div.boxMax2' : kind === 'min2' ? 'm3.div.boxMin2' : 'm3.div.boxMin3'),
      { kind: 'long-division', divisor: b, dividend, box: 0 },
    ],
    value,
    rng,
    min: 1,
    max: 9,
    smart: [b + 1, b - 1, b - 2].filter((v) => v !== value),
  })
}

/** 彩灯按 1 红 2 黄 3 蓝的规律排列，第 n 个是什么颜色（练习三 11）：n ÷ 6 看余数 */
export const LIGHT_COLORS = ['red', 'yellow', 'yellow', 'blue', 'blue', 'blue'] as const
function genLights(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(25, 99)
  const color = LIGHT_COLORS[(n - 1) % 6]!
  const icon = { red: '🔴', yellow: '🟡', blue: '🔵' }
  return labelQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `lights-${n}`,
    stem: [text('m3.div.lights', { n }), { kind: 'scatter', items: [...LIGHT_COLORS, ...LIGHT_COLORS].map((c) => icon[c]) }],
    correct: opt(`m3.div.color.${color}`),
    distractors: (['red', 'yellow', 'blue'] as const).filter((c) => c !== color).map((c) => opt(`m3.div.color.${c}`)),
    rng,
  })
}

/**
 * 改错（练习三 2）：两位数除以一位数的竖式，或对、或是课本里的两种错——
 * carry：十位除完的余数忘了和个位合起来（68 ÷ 4 写成 12）；skip：商的十位漏写了（48 ÷ 4 只写了 2）。
 * 百位不够除的三位数：对的，或商写错了位置（148 ÷ 6 的商 24 写在百位、十位上面）。
 */
export type WrittenSlip = 'right' | 'carry' | 'skip' | 'place'
export function writtenSlip(rng: RNG, kind: WrittenSlip): { a: number; b: number; shown: DivLine; rows: DivLine[]; right: number } {
  for (;;) {
    if (kind === 'carry') {
      const x = written2(rng)
      const t = Math.floor(x.a / 10)
      const u = x.a % 10
      if (t % x.b === 0 || u % x.b !== 0 || u < x.b) continue
      const hi = Math.floor(t / x.b)
      return {
        a: x.a,
        b: x.b,
        shown: { text: String(hi * 10 + u / x.b), end: 1 },
        rows: [
          { text: String(hi * x.b), end: 0, line: true },
          { text: String(u), end: 1 },
          { text: String(u), end: 1, line: true },
          { text: '0', end: 1 },
        ],
        right: x.q,
      }
    }
    if (kind === 'skip') {
      const x = written2(rng)
      if (Math.floor(x.q / 10) !== 1) continue
      return {
        a: x.a,
        b: x.b,
        shown: { text: String(x.q % 10), end: 1 },
        rows: [
          { text: String(x.a), end: 1, line: true },
          { text: '0', end: 1 },
        ],
        right: x.q,
      }
    }
    const x = kind === 'place' || rng.chance(0.5) ? written3short(rng, rng.chance(0.5)) : written2(rng)
    const w = divisionWork(x.a, x.b)
    const n = String(x.a).length
    // 放错位置：商从最高位上面写起（除到哪一位，商就要写在那一位的上面）
    return { a: x.a, b: x.b, shown: { text: String(w.quotient), end: kind === 'place' ? n - 2 : n - 1 }, rows: w.rows, right: w.quotient }
  }
}
function genWrittenFix(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['right', 'right', 'carry', 'skip', 'place'] as const)
  const s = writtenSlip(rng, kind)
  // 算错了的一半问「对吗」，一半问正确的商
  if (kind !== 'right' && kind !== 'place' && rng.chance(0.5)) {
    return numberQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `fixv-${kind}-${s.a}-${s.b}`,
      stem: [text('m3.div.fixValue'), workedFigure(s.a, s.b, s.shown, s.rows)],
      value: s.right,
      rng,
      min: 1,
      max: 999,
      smart: [Number(s.shown.text.replace(/\s/g, '')), ...quotientSmart(s.right)],
    })
  }
  return labelQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `fix-${kind}-${s.a}-${s.b}`,
    stem: [text('m3.div.fixCheck'), workedFigure(s.a, s.b, s.shown, s.rows)],
    correct: opt(kind === 'right' ? 'm3.opt.right' : 'm3.opt.wrong'),
    distractors: [opt(kind === 'right' ? 'm3.opt.wrong' : 'm3.opt.right')],
    rng,
  })
}

/** 说法对不对（p18 讨论框的三条法则、p35 整理和复习） */
export const WRITTEN_STATEMENTS: { key: string; ok: boolean }[] = [
  { key: 'm3.div.st.highFirst', ok: true },
  { key: 'm3.div.st.lowFirst', ok: false },
  { key: 'm3.div.st.aboveDigit', ok: true },
  { key: 'm3.div.st.remSmaller', ok: true },
  { key: 'm3.div.st.remBigger', ok: false },
  { key: 'm3.div.st.checkMul', ok: true },
  { key: 'm3.div.st.twoByOne', ok: false },
]
export const ZERO_STATEMENTS: { key: string; ok: boolean }[] = [
  { key: 'm3.div.st.notAlways3', ok: true },
  { key: 'm3.div.st.zeroTail', ok: false },
  { key: 'm3.div.st.zeroDiv', ok: true },
  { key: 'm3.div.st.zeroDivisor', ok: false },
  { key: 'm3.div.st.zeroHold', ok: true },
]
function genStatement(kpId: string, d: Difficulty, rng: RNG, pool: { key: string; ok: boolean }[]): Question {
  const s = rng.pick(pool)
  return labelQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `st-${s.key}`,
    stem: [text('m3.div.judge'), text(s.key)],
    correct: opt(s.ok ? 'm3.opt.right' : 'm3.opt.wrong'),
    distractors: [opt(s.ok ? 'm3.opt.wrong' : 'm3.opt.right')],
    rng,
  })
}

defineGenerator('m3s2-02-written', (d, rng) => {
  const kpId = 'm3s2-02-written'
  const roll = rng.next()
  if (d === 1) return genWrittenCalc(kpId, d, rng)
  if (d === 2)
    return roll < 0.25
      ? genDigits(kpId, d, rng)
      : roll < 0.45
        ? genCheck(kpId, d, rng)
        : roll < 0.75
          ? genWrittenWord(kpId, d, rng)
          : genWrittenCalc(kpId, d, rng)
  return roll < 0.3
    ? genWrittenFix(kpId, d, rng)
    : roll < 0.5
      ? genRemainderLimit(kpId, d, rng)
      : roll < 0.65
        ? genBoxDigit(kpId, d, rng)
        : roll < 0.85
          ? genLights(kpId, d, rng)
          : genStatement(kpId, d, rng, WRITTEN_STATEMENTS)
})

// ─────────────────────────────────────────────────────────────
// 商中间或末尾有 0 的除法（p22–26 例 4–6、练习四）
// ─────────────────────────────────────────────────────────────

/** 被除数中间是 0：百位、个位都能整除，商中间有 0（例 5：208 ÷ 2 = 104） */
export function zeroMiddle(rng: RNG): Div {
  const b = rng.pick([2, 2, 3, 3, 4, 5, 6, 7, 8, 9])
  const top = Math.floor(9 / b)
  return make(b, rng.int(1, top) * 100 + rng.int(1, top))
}
/** 被除数末尾是 0，商末尾有 0（例 6：650 ÷ 5 = 130） */
export function zeroEnd(rng: RNG): Div {
  for (;;) {
    const b = rng.int(2, 9)
    const m = rng.int(11, Math.floor(99 / b))
    if (noZero(m)) return make(b, m * 10)
  }
}
/** 十位不够除，商中间有 0（216 ÷ 2 = 108、545 ÷ 5 = 109），可以有余数（316 ÷ 3 = 105……1） */
export function zeroShort(rng: RNG, withRem: boolean): Div {
  for (;;) {
    const b = rng.int(2, 9)
    const h = rng.int(1, Math.floor(9 / b))
    const t = rng.int(1, b - 1)
    const u = rng.int(0, 9)
    const a = b * h * 100 + t * 10 + u
    const r = a % b
    if (r > 0 === withRem) return { a, b, q: Math.floor(a / b), r }
  }
}
/** 有余数、商里有 0 的（245 ÷ 8 = 30……5、631 ÷ 3 = 210……1、403 ÷ 8 = 50……3、501 ÷ 5 = 100……1） */
export function zeroRem(rng: RNG): Div {
  for (;;) {
    const b = rng.int(2, 9)
    const a = rng.int(100, 999)
    const q = Math.floor(a / b)
    const r = a % b
    if (r > 0 && String(q).includes('0')) return { a, b, q, r }
  }
}

/** 0 除以任何不是 0 的数都得 0（例 4）；课本做一做把 0 ÷ 3、0 × 7、0 + 6 混在一起 */
function genZeroFacts(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(1, 9)
  const kind = rng.pick(['div', 'div', 'mul', 'mulR', 'add', 'sub'] as const)
  const expr = { div: `0 ÷ ${n}`, mul: `0 × ${n}`, mulR: `${n} × 0`, add: `0 + ${n}`, sub: `${n} - 0` }[kind]
  const value = kind === 'add' || kind === 'sub' ? n : 0
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `zero-${expr.replace(/\s+/g, '')}`,
    stem: [{ kind: 'expr', expr: `${expr} = ?` }],
    value,
    rng,
    min: 0,
    max: 9,
    smart: value === 0 ? [n, 1] : [0, n + 1],
  })
}

/** 比大小（练习四 7）：504 ÷ 6 ○ 504 ÷ 7、736 ÷ 8 ○ 816 ÷ 8、304 ÷ 8 ○ 342 ÷ 9（=）；都能整除 */
function genZeroCompare(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const kind = rng.pick(['sameA', 'sameB', 'equal', 'mixed'] as const)
    let l: Div
    let r: Div
    if (kind === 'sameA') {
      const [b1, b2] = rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 2) as [number, number]
      const lcm = (b1 * b2) / gcd(b1, b2)
      const a = lcm * rng.int(Math.ceil(100 / lcm), Math.floor(999 / lcm))
      l = make(b1, a / b1)
      r = make(b2, a / b2)
    } else if (kind === 'sameB') {
      const b = rng.int(2, 9)
      l = make(b, rng.int(Math.ceil(100 / b), Math.floor(999 / b)))
      r = make(b, rng.int(Math.ceil(100 / b), Math.floor(999 / b)))
    } else if (kind === 'equal') {
      const [b1, b2] = rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 2) as [number, number]
      const q = rng.int(Math.ceil(100 / Math.min(b1, b2)), Math.floor(999 / Math.max(b1, b2)))
      l = make(b1, q)
      r = make(b2, q)
    } else {
      l = rng.chance(0.5) ? zeroMiddle(rng) : zeroEnd(rng)
      r = rng.chance(0.5) ? zeroShort(rng, false) : zeroMiddle(rng)
    }
    if (l.a === r.a && l.b === r.b) continue
    if (l.a < 100 || r.a < 100 || l.a > 999 || r.a > 999) continue
    // 至少一边的商里有 0（这是「商中间或末尾有 0」的题）
    if (noZero(l.q) && noZero(r.q)) continue
    const correct = l.q > r.q ? '>' : l.q < r.q ? '<' : '='
    return labelQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `cmp-${l.a}÷${l.b}-${r.a}÷${r.b}`,
      stem: [text('m3.div.compare'), { kind: 'expr', expr: `${l.a} ÷ ${l.b} ○ ${r.a} ÷ ${r.b}` }],
      correct,
      distractors: ['>', '<', '='].filter((s) => s !== correct),
      rng,
    })
  }
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * 改错（练习四 8）：mid 商中间的 0 漏写（406 ÷ 2 写成 2 3）；end 商末尾的 0 漏写（760 ÷ 4 写成 19）；
 * rem 最后一位没落下来就直接商 0（250 ÷ 3 写成 80……1，应该是 83……1）；right 对的。
 */
export type ZeroSlip = 'right' | 'mid' | 'end' | 'rem'
export function zeroSlip(rng: RNG, kind: ZeroSlip): { a: number; b: number; shown: DivLine; rows: DivLine[]; right: number } {
  for (;;) {
    if (kind === 'mid') {
      const x = zeroMiddle(rng)
      const w = divisionWork(x.a, x.b)
      const s = String(x.q)
      return { a: x.a, b: x.b, shown: { text: `${s[0]} ${s[2]}`, end: 2 }, rows: w.rows, right: x.q }
    }
    if (kind === 'end') {
      const x = zeroEnd(rng)
      const w = divisionWork(x.a, x.b)
      return { a: x.a, b: x.b, shown: { text: String(x.q / 10), end: 1 }, rows: w.rows, right: x.q }
    }
    if (kind === 'rem') {
      const b = rng.int(3, 9)
      const head = rng.int(Math.max(10, b + 1), b * 10 - 1) // 前两位：百位不够除
      if (head % b === 0) continue
      const a = head * 10
      const w = divisionWork(a, b)
      const hi = Math.floor(head / b)
      return {
        a,
        b,
        shown: { text: `${hi}0`, end: 2 },
        rows: [
          { text: String(hi * b), end: 1, line: true },
          { text: String(head - hi * b), end: 1 },
        ],
        right: w.quotient,
      }
    }
    const x = rng.pick([zeroMiddle, zeroEnd, (r: RNG) => zeroShort(r, rng.chance(0.5)), zeroRem])(rng)
    const w = divisionWork(x.a, x.b)
    return { a: x.a, b: x.b, shown: { text: String(w.quotient), end: String(x.a).length - 1 }, rows: w.rows, right: w.quotient }
  }
}
function genZeroFix(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['right', 'right', 'mid', 'end', 'rem'] as const)
  const s = zeroSlip(rng, kind)
  if (kind !== 'right' && rng.chance(0.5)) {
    return numberQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `fixv-${kind}-${s.a}-${s.b}`,
      stem: [text('m3.div.fixValue'), workedFigure(s.a, s.b, s.shown, s.rows)],
      value: s.right,
      rng,
      min: 1,
      max: 999,
      smart: [Number(s.shown.text.replace(/\s/g, '')), ...quotientSmart(s.right)],
    })
  }
  return labelQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `fix-${kind}-${s.a}-${s.b}`,
    stem: [text('m3.div.fixCheck'), workedFigure(s.a, s.b, s.shown, s.rows)],
    correct: opt(kind === 'right' ? 'm3.opt.right' : 'm3.opt.wrong'),
    distractors: [opt(kind === 'right' ? 'm3.opt.wrong' : 'm3.opt.right')],
    rng,
  })
}

/** 应用题（练习四 2 火车票、3 藤椅、5 飞机、10 商和余数都是 3） */
function genZeroWord(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['ticket', 'chairs', 'plane', 'riddle'] as const)
  const withZero = (lo: number, hi: number): number => {
    for (;;) {
      const v = rng.int(lo, hi)
      if (String(v).includes('0')) return v
    }
  }
  let p: Record<string, number>
  let value: number
  let smart: number[]
  if (kind === 'ticket') {
    const q = withZero(101, 499)
    p = { a: q * 2 }
    value = q
    smart = quotientSmart(q)
  } else if (kind === 'chairs') {
    const p1 = withZero(101, 409)
    const m = rng.int(3, 6)
    const p2 = rng.int(40, Math.min(p1 - 20, Math.floor(999 / m)))
    p = { a: p1 * 2, m, c: p2 * m }
    value = p1 - p2
    smart = [p1 * 2 - p2 * m, p1 + p2, p1 - p2 + 10].filter((v) => v > 0 && v !== value)
  } else if (kind === 'plane') {
    const q = withZero(101, 199)
    p = { v: q * 5 }
    value = q
    smart = quotientSmart(q)
  } else {
    const r = rng.int(1, 3)
    p = { r }
    value = r * (r * 3) + r
    smart = [r * r * 3, r * 3 + r, value + 1]
  }
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `word-${kind}-${Object.values(p).join('-')}`,
    stem: [text(`m3.div.z.${kind}`, p)],
    value,
    rng,
    min: 1,
    max: 999,
    smart: smart.filter((v) => v > 0 && v !== value),
  })
}

defineGenerator('m3s2-02-zeros', (d, rng) => {
  const kpId = 'm3s2-02-zeros'
  const roll = rng.next()
  if (d === 1) return roll < 0.2 ? genZeroFacts(kpId, d, rng) : askQ(kpId, d, roll < 0.6 ? zeroMiddle(rng) : zeroEnd(rng), rng)
  if (d === 2) {
    if (roll < 0.3) return askQ(kpId, d, zeroShort(rng, false), rng)
    if (roll < 0.7) {
      const x = rng.chance(0.5) ? zeroRem(rng) : zeroShort(rng, true)
      return rng.chance(0.55) ? askQ(kpId, d, x, rng) : askR(kpId, d, x, rng)
    }
    return roll < 0.8 ? genZeroFacts(kpId, d, rng) : askQ(kpId, d, rng.chance(0.5) ? zeroMiddle(rng) : zeroEnd(rng), rng)
  }
  return roll < 0.3
    ? genZeroCompare(kpId, d, rng)
    : roll < 0.6
      ? genZeroFix(kpId, d, rng)
      : roll < 0.8
        ? genStatement(kpId, d, rng, ZERO_STATEMENTS)
        : genZeroWord(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 用乘除法解决问题（p27–34 例 7–10、练习五 / 六 / 七、p36 鸡蛋组题）：连乘、连除、先求一份（归一）、先求总数（归总）。
// 每一步都是两位数、三位数乘除一位数以内。
// ─────────────────────────────────────────────────────────────

interface Solve {
  key: string
  p: Record<string, number>
  value: number
  type: 'multiply' | 'divide'
  smart: number[]
}
type SolveMaker = (rng: RNG) => Solve | null

const others = (rng: RNG, lo: number, hi: number, not: number): number => {
  for (;;) {
    const v = rng.int(lo, hi)
    if (v !== not) return v
  }
}

/** 连乘、连除（第 1 档：数都小） */
export const SOLVE_CHAIN: SolveMaker[] = [
  (rng) => {
    const a = rng.int(2, 4)
    const b = rng.int(3, 8)
    const c = rng.pick([10, 20, 25, 30, 40, 50])
    if (a * b * c > 999) return null
    return { key: 'm3.div.s.cups', p: { a, b, c }, value: a * b * c, type: 'multiply', smart: [a * b + c, b * c, a * c] }
  },
  (rng) => {
    const r = rng.int(3, 8)
    const c = rng.int(3, 8)
    const n = rng.int(2, 5)
    return { key: 'm3.div.s.phalanx', p: { r, c, n }, value: r * c * n, type: 'multiply', smart: [r * c, r * c + n, (r + c) * n] }
  },
  (rng) => {
    const r = rng.int(2, 3)
    const c = rng.int(2, 6)
    const n = rng.int(2, 9)
    return { key: 'm3.div.s.eggBoxes', p: { r, c, n }, value: r * c * n, type: 'multiply', smart: [r * c, c * n, r * c + n] }
  },
  (rng) => {
    const a = rng.int(3, 5)
    const b = rng.int(8, 15)
    const c = rng.int(2, 6)
    return { key: 'm3.div.s.rice', p: { a, b, c }, value: a * b * c, type: 'multiply', smart: [a * b, b * c, a * b + c] }
  },
  (rng) => {
    const a = rng.int(2, 4)
    const b = rng.int(2, 5)
    const k = rng.int(2, 9)
    const t = a * b * k
    if (t > 99) return null
    return { key: 'm3.div.s.teams', p: { t, a, b }, value: k, type: 'divide', smart: [t / a, t / b, k + 1] }
  },
  (rng) => {
    const a = rng.int(2, 4)
    const b = rng.int(2, 3)
    const k = rng.int(2, 6)
    const t = a * b * k
    return { key: 'm3.div.s.eggPack', p: { t, a, b }, value: k, type: 'divide', smart: [t / a, t / b, k + 1] }
  },
]
/** 先求一份、先求总数（第 2 档：例 9 树苗、练习六 1 蜜蜂 / 2 蜗牛 / 7 毽子、例 10 货车和轿车、练习六 3 看书、p36 鸡蛋换大盒） */
export const SOLVE_UNIT: SolveMaker[] = [
  (rng) => {
    const a = rng.int(2, 6)
    const u = rng.int(4, 18) * 5
    const b = others(rng, 2, 9, a)
    return { key: 'm3.div.s.seedlings', p: { a, p: a * u, b }, value: u * b, type: 'multiply', smart: [a * u * b, a * u + b, u * a] }
  },
  (rng) => {
    const a = rng.int(2, 6)
    const u = rng.int(8, 30)
    const b = others(rng, 3, 9, a)
    return { key: 'm3.div.s.bees', p: { a, p: a * u, b }, value: u * b, type: 'multiply', smart: [a * u * b, a * u + b, u + b] }
  },
  (rng) => {
    const a = rng.int(2, 5)
    const u = rng.int(2, 8)
    const b = others(rng, 3, 9, a)
    return { key: 'm3.div.s.snail', p: { a, p: a * u, b }, value: u * b, type: 'multiply', smart: [a * u * b, a * u + b, u * a] }
  },
  (rng) => {
    const a = rng.int(2, 6)
    const u = rng.int(3, 9)
    const b = others(rng, 2, 9, a)
    return { key: 'm3.div.s.shuttle', p: { a, p: a * u, b }, value: u * b, type: 'multiply', smart: [a * u * b, a * u + b, u + b] }
  },
  (rng) => {
    const v = rng.int(4, 8) * 10
    const t = rng.int(3, 6)
    const u = rng.int(2, t - 1)
    if ((v * t) % u !== 0) return null
    return { key: 'm3.div.s.cars', p: { v, t, u }, value: (v * t) / u, type: 'divide', smart: [v * t, v + t, (v * u) / t] }
  },
  (rng) => {
    const a = rng.int(5, 20)
    const b = rng.int(3, 10)
    const c = others(rng, 2, 30, a)
    if ((a * b) % c !== 0 || (a * b) / c < 2) return null
    return { key: 'm3.div.s.pages', p: { a, b, c }, value: (a * b) / c, type: 'divide', smart: [a * b, (c * b) / a, b + 1] }
  },
  (rng) => {
    const a = rng.pick([4, 6, 8, 10, 12])
    const b = rng.int(10, 60)
    const c = others(rng, 4, 12, a)
    if ((a * b) % c !== 0 || a * b > 999) return null
    return { key: 'm3.div.s.eggRepack', p: { a, b, c }, value: (a * b) / c, type: 'divide', smart: [a * b, b + 1, (c * b) / a] }
  },
]
/** 三步或反过来想（第 3 档：练习五 5 书架、8 布娃娃、6 游泳池来回、4 药片，练习七 6 绳子剪两段） */
export const SOLVE_HARD: SolveMaker[] = [
  (rng) => {
    const a = rng.int(2, 4)
    const b = rng.int(3, 6)
    const k = rng.int(10, 60)
    const t = a * b * k
    if (t > 999) return null
    return { key: 'm3.div.s.shelves', p: { t, a, b }, value: k, type: 'divide', smart: [t / a, t / b, k + 1] }
  },
  (rng) => {
    const a = rng.int(2, 6)
    const b = rng.int(4, 9)
    const k = rng.int(2, 9)
    return { key: 'm3.div.s.dolls', p: { t: a * b * k, a, b }, value: k, type: 'divide', smart: [a * k, b * k, k + 1] }
  },
  (rng) => {
    const d = rng.pick([25, 50])
    const k = rng.int(2, 8)
    return { key: 'm3.div.s.pool', p: { d, k }, value: d * 2 * k, type: 'multiply', smart: [d * k, d * 2, d * k + d] }
  },
  (rng) => {
    const s = rng.int(20, 300)
    return { key: 'm3.div.s.rope', p: { t: s * 3 }, value: s * 2, type: 'divide', smart: [(s * 3) / 2, s, s * 3 * 2] }
  },
  (rng) => {
    const a = rng.int(2, 3)
    const b = rng.int(1, 3)
    const k = rng.int(5, 40)
    return { key: 'm3.div.s.pills', p: { t: a * b * k, a, b }, value: k, type: 'divide', smart: [(a * b * k) / a, (a * b * k) / b, k + 1] }
  },
]

function genSolve(kpId: string, d: Difficulty, rng: RNG, pool: SolveMaker[]): Question {
  for (;;) {
    const s = rng.pick(pool)(rng)
    if (!s) continue
    return numberQuestion({
      kpId,
      type: s.type,
      difficulty: d,
      sig: `${s.key}-${Object.values(s.p).join('-')}`,
      stem: [text(s.key, s.p)],
      value: s.value,
      rng,
      min: 1,
      max: 9999,
      smart: s.smart.filter((v) => Number.isInteger(v) && v > 0 && v !== s.value),
    })
  }
}

defineGenerator('m3s2-02-solve', (d, rng) => {
  const kpId = 'm3s2-02-solve'
  const roll = rng.next()
  if (d === 1) return genSolve(kpId, d, rng, SOLVE_CHAIN)
  if (d === 2) return genSolve(kpId, d, rng, roll < 0.75 ? SOLVE_UNIT : SOLVE_CHAIN)
  return genSolve(kpId, d, rng, roll < 0.6 ? SOLVE_HARD : SOLVE_UNIT)
})
