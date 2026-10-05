import type { Difficulty, InputMode, LStr, MulWork, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 多位数乘两位数（四上第三单元，课本 p39–57）：口算乘法、笔算乘法（含乘数中间或末尾有 0）、积的变化规律、用估算解决问题。
// 课本把乘法里的两个数都叫「乘数」，结果叫「积」，不说因数、部分积；竖式里第二次乘得的数末尾的 0 不写
// （例 1「个位的0可以省略不写」），末尾有 0 的乘法把 0 写在竖式外面（例 3 做一做）；估算写「往大估 / 往小估」，算式用「=」不用「≈」。
// 算式：乘号「×」、减号 ASCII「-」；比大小用「○」（朗读读作「和」，题目文字里不写「○」）。
// 数的范围：口算的积多在万以内；笔算是两位数、三位数乘两位数，四位数乘两位数只在练习里（第 3 档），积最多 6 位。
// ─────────────────────────────────────────────────────────────

export const ORAL = 'm4s1-04-oral'
export const WRITTEN = 'm4s1-04-written'
export const PATTERN = 'm4s1-04-pattern'
export const ESTIMATE = 'm4s1-04-estimate'

type Params = Record<string, LStr | number>
const text = (k: string, p?: Params): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const expr = (e: string): StemPart => ({ kind: 'expr', expr: e })
const key = (k: string, p?: Params): LStr => (p ? { k, p } : { k })
const flat = (e: string): string => e.replace(/\s+/g, '')

/** 各位数字（高位在前） */
export const digitsOf = (n: number): number[] => String(n).split('').map(Number)

/** 末尾有几个 0 */
export function trailingZeros(n: number): number {
  let z = 0
  for (let x = n; x > 0 && x % 10 === 0; x /= 10) z++
  return z
}

/** 乘的时候不进位：a 的每一位乘 b 的每一位都不满十（课本例 1 的 12 × 13、做一做的 343 × 12） */
export const noCarry = (a: number, b: number): boolean => digitsOf(a).every((x) => digitsOf(b).every((y) => x * y < 10))

/** 乘一位数时忘了加进上来的数：每一位只写乘得的个位，最高位照写（16 × 3 → 38，342 × 3 → 926） */
export function forgotCarry(a: number, b: number): number {
  return Number(digitsOf(a).map((d, i) => (i === 0 ? d * b : (d * b) % 10)).join(''))
}

/** 个位不是 0 的数 */
function notRound(rng: RNG, lo: number, hi: number): number {
  for (;;) {
    const x = rng.int(lo, hi)
    if (x % 10 !== 0) return x
  }
}

/** 各位都不是 0 的 n 位数 */
function noZero(rng: RNG, n: number): number {
  let x = 0
  for (let i = 0; i < n; i++) x = x * 10 + rng.int(1, 9)
  return x
}

/** 数值题：键盘或选项（input 不填就随机） */
function numQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[], input?: InputMode, type: 'multiply' | 'compare' = 'multiply'): Question {
  return numberQuestion({
    kpId,
    type,
    difficulty: d,
    sig,
    stem,
    value,
    rng,
    min: 0,
    max: 999999999,
    input,
    smart: smart.filter((x) => Number.isInteger(x) && x >= 0 && x !== value),
  })
}

/** 选项题（够 / 不够、对 / 不对、选算式……） */
function pickQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[], rng: RNG, type: 'multiply' | 'compare' = 'multiply'): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors, rng })
}

const RIGHT: LStr = { k: 'm4.mul.right' }
const WRONG: LStr = { k: 'm4.mul.wrong' }
const ENOUGH: LStr = { k: 'm4.mul.enough' }
const NOT_ENOUGH: LStr = { k: 'm4.mul.notEnough' }
const CAN: LStr = { k: 'm4.mul.can' }
const CANNOT: LStr = { k: 'm4.mul.cannot' }
const yesNo = (yes: boolean, a: LStr, b: LStr): [LStr, LStr[]] => (yes ? [a, [b]] : [b, [a]])

// ─────────────────────────────────────────────────────────────
// 口算乘法（p39–42，练习七；练习九 1、练习十一 1 也是口算）
// 第 1 档：例 1 两位数乘一位数（积不超过 100，16 × 3 有进位）与几百几十乘一位数（160 × 3、做一做 110 × 5）；
//          例 2 乘 10（6 × 10、试一试 18 × 10）与两位数乘整十数（12 × 20、31 × 30、30 × 20）、做一做下行的 120 × 30、30 × 200；
//          「16 × 3 可以怎样口算」（拆成 10 × 3 + 6 × 3）、「12 × 20 可以怎样算」（12 × 2 × 10）；例题的应用题（草莓、橙子、苹果）。
// 第 2 档：练习七、九、十一里大一点的（220 × 4、480 × 5、910 × 8、300 × 60、23 × 300、70 × 140、102 × 30）；
//          练习七的应用题（水牛、灯笼、漏水、作文纸、糖葫芦、客车）、够不够（中国结）、能不能坐下（客车）。
// 第 3 档：两步（灯笼一共多少钱、漏水 1 天）、带 * 的「一个数乘 10 比原来大 72」。
// ─────────────────────────────────────────────────────────────

/** 两位数乘一位数（个位不是 0），积不超过 max：第 1 档 100（例 1、做一做） */
function twoByOne(rng: RNG, max = 100, hi = 49): [number, number] {
  for (;;) {
    const a = notRound(rng, 11, hi)
    const b = rng.int(2, 9)
    if (a * b <= max) return [a, b]
  }
}

/** 十块条的图（例 1 的小方块）：组数 = 乘数，每组几根十块条、几个小方块（组太多在手机上太挤，最多 6 组） */
function blocksOf(a: number, b: number): StemPart[] {
  const tens = Math.floor(a / 10)
  if (a >= 100 || b > 6 || tens > 4) return []
  return [{ kind: 'blocks', groups: b, tens, ones: a % 10 }]
}

/** 两位数乘一位数：16 × 3 */
function oralTwoByOne(d: Difficulty, rng: RNG): Question {
  const [a, b] = twoByOne(rng)
  const t = Math.floor(a / 10)
  const o = a % 10
  const p = a * b
  const pic = rng.chance(0.4) ? blocksOf(a, b) : []
  const e = `${a} × ${b} = ?`
  // 常见错误：忘了进位、只乘了十位或只乘了个位、差一个十
  return numQ(ORAL, d, flat(e), [...pic, expr(e)], p, rng, [forgotCarry(a, b), t * 10 * b + o, t * 10 + o * b, p + 10, p - 10])
}

/** 几百几十乘一位数：160 × 3（第 1 档的两位数部分乘出来不超过 100，第 2 档到 910 × 8） */
function oralHundredsTens(d: Difficulty, rng: RNG): Question {
  const [x, b] = d === 1 ? twoByOne(rng) : twoByOne(rng, 999, 99)
  const a = x * 10
  const p = a * b
  const e = `${a} × ${b} = ?`
  // 常见错误：积末尾漏写 0、多写 0、忘了进位
  return numQ(ORAL, d, flat(e), [expr(e)], p, rng, [x * b, p * 10, forgotCarry(x, b) * 10, p + 100, p - 100])
}

/** 乘 10（例 2：6 × 10、试一试 5 × 10、18 × 10、40 × 10、练习七 21 × 10） */
function oralTimesTen(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.35) ? rng.int(2, 9) : rng.int(11, 99)
  const e = rng.chance(0.75) ? `${n} × 10 = ?` : `10 × ${n} = ?`
  return numQ(ORAL, d, flat(e), [expr(e)], n * 10, rng, [n, n * 100, n + 10, n * 10 + 10])
}

/**
 * 两位数乘整十数（例 2：12 × 20；做一做 12 × 30、31 × 30、14 × 20、30 × 20；练习七 13 × 20、41 × 20、22 × 30、50 × 16）：
 * 先算两位数乘几、再在积的末尾添一个 0；整十数也有写在前面的（50 × 16）。第 1 档两位数乘几不超过 100，第 2 档到 144（72 × 20）
 */
function oralByTens(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const x = rng.chance(0.15) ? rng.int(2, 9) * 10 : notRound(rng, 11, d === 1 ? 49 : 79)
    const k = rng.int(2, 9)
    const base = x * k
    if (base > (d === 1 ? 100 : 160)) continue
    const tens = k * 10
    const e = rng.chance(0.85) ? `${x} × ${tens} = ?` : `${tens} × ${x} = ?`
    const p = base * 10
    return numQ(ORAL, d, flat(e), [expr(e)], p, rng, [base, p * 10, forgotCarry(x, k) * 10, p + 10, p - 10])
  }
}

/**
 * 末尾有 0 的大一点的口算（做一做下行 120 × 30、310 × 30、140 × 20、30 × 200；练习九 300 × 60、102 × 30、70 × 140；
 * 练习十一 23 × 300、14 × 500、270 × 30）：x × y 能口算，两个乘数末尾一共有几个 0，积的末尾就添几个 0
 */
function oralBig(d: Difficulty, rng: RNG): Question {
  for (;;) {
    let x: number
    let y: number
    let za: number
    let zb: number
    if (d === 1) {
      // 做一做下行：几百几十 × 整十数（x 是两位数、y 一位数、x × y 不超过 100），或整十 × 整百（30 × 200）
      if (rng.chance(0.75)) {
        ;[x, y] = twoByOne(rng)
        ;[za, zb] = [1, 1]
      } else {
        ;[x, y] = [rng.int(2, 9), rng.int(2, 9)]
        ;[za, zb] = rng.chance(0.5) ? [1, 2] : [2, 1]
      }
    } else {
      x = rng.chance(0.2) ? rng.int(101, 109) : rng.chance(0.3) ? rng.int(2, 9) : notRound(rng, 11, 99)
      y = rng.int(2, 9)
      if (x * y > 300) continue
      ;[za, zb] = rng.pick([
        [1, 1],
        [0, 2],
        [2, 0],
        [0, 1],
        [1, 2],
      ] as [number, number][])
      if (x < 10 && za + zb < 2) continue
    }
    let a = x * 10 ** za
    let b = y * 10 ** zb
    // 课本的口算里两个乘数都不超过三位（300 × 60、23 × 300、70 × 140、102 × 30）
    if (a > 999 || b > 999) continue
    if (rng.chance(0.3)) [a, b] = [b, a]
    const p = a * b
    const e = `${a} × ${b} = ?`
    // 常见错误：积末尾的 0 少写一个、多写一个，只算了 0 前面的数
    return numQ(ORAL, d, flat(e), [expr(e)], p, rng, [p / 10, p * 10, x * y, p / 100])
  }
}

/** 「16 × 3 可以怎样口算？」（例 1 的拆法）、「12 × 20 可以怎样算？」（例 2：先算 12 × 2，再乘 10） */
function oralMethod(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) {
    const [a, b] = twoByOne(rng)
    const t = Math.floor(a / 10) * 10
    const o = a % 10
    const correct = `${t} × ${b} + ${o} × ${b}`
    const others = [`${t} × ${b} + ${o}`, `${t} + ${o} × ${b}`, `${t / 10} × ${b} + ${o} × ${b}`]
    return pickQ(ORAL, d, `how-${a}x${b}`, [text('m4.mul.howOral', { e: `${a} × ${b}` })], correct, others, rng)
  }
  const [x, k] = twoByOne(rng)
  const correct = `${x} × ${k} × 10`
  const others = [`${x} × ${k} + 10`, `${x} × 10 + ${k}`, `${x} + ${k} × 10`]
  return pickQ(ORAL, d, `how-${x}x${k * 10}`, [text('m4.mul.howOral', { e: `${x} × ${k * 10}` })], correct, others, rng)
}

/** 例题的应用题：草莓（例 1）、橙子（例 2(1)）、苹果（例 2(2)） */
function oralExampleWord(d: Difficulty, rng: RNG): Question {
  const roll = rng.int(0, 2)
  if (roll === 0) {
    const [a, n] = twoByOne(rng, 100, 33)
    return numQ(ORAL, d, `straw-${a}-${n}`, [text('m4.mul.w.strawberry', { a, n })], a * n, rng, [forgotCarry(a, n), a + n, a * n + 10])
  }
  if (roll === 1) {
    const a = rng.int(3, 9)
    const n = rng.pick([10, 20, 30])
    return numQ(ORAL, d, `orange-${a}-${n}`, [text('m4.mul.w.orange', { a, n })], a * n, rng, [a + n, a * n / 10, a * n + a])
  }
  for (;;) {
    const a = notRound(rng, 11, 25)
    const n = rng.pick([20, 30, 40])
    if ((a * n) / 10 > 100) continue
    return numQ(ORAL, d, `apple-${a}-${n}`, [text('m4.mul.w.apples', { a, n })], a * n, rng, [(a * n) / 10, a + n, a * n * 10])
  }
}

/** 练习七的应用题（第 2 档）：水牛的体重、灯笼、漏水的水龙头、作文纸、糖葫芦、客车 */
function oralWord(d: Difficulty, rng: RNG): Question {
  const pool: (() => { k: string; p: Params; value: number; smart: number[] })[] = [
    () => {
      const a = rng.pick([180, 220, 240, 260, 280, 320, 340, 360])
      const k = rng.int(2, 3)
      return { k: 'm4.mul.w.buffalo', p: { a, k }, value: a * k, smart: [a + k, a * k + a, (a / 10) * k] }
    },
    () => {
      const a = notRound(rng, 11, 24)
      const n = rng.pick([20, 30, 40])
      return { k: 'm4.mul.w.lantern', p: { a, n }, value: a * n, smart: [(a * n) / 10, a + n, a * n * 10] }
    },
    () => {
      const g = rng.int(3, 9)
      return { k: 'm4.mul.w.tap', p: { g }, value: g * 60, smart: [g * 24, g * 100, g + 60] }
    },
    () => {
      const a = rng.pick([20, 30])
      const n = notRound(rng, 11, 29)
      return { k: 'm4.mul.w.essay', p: { a, n }, value: a * n, smart: [(a / 10) * n, a + n, a * n + a] }
    },
    () => {
      const a = notRound(rng, 11, 24)
      const n = rng.pick([20, 30, 40])
      return { k: 'm4.mul.w.haw', p: { a, n }, value: a * n, smart: [(a * n) / 10, a + n, a * n + a] }
    },
    () => {
      const p = rng.int(3, 9)
      const n = rng.pick([20, 30, 40, 50])
      return { k: 'm4.mul.w.hawSell', p: { p, n }, value: p * n, smart: [p + n, (p * n) / 10, p * n + p] }
    },
    () => {
      const [a, n] = twoByOne(rng, 100, 32)
      return { k: 'm4.mul.w.coach', p: { a, n }, value: a * n, smart: [a + n, forgotCarry(a, n), a * n + a] }
    },
  ]
  const w = rng.pick(pool)()
  return numQ(ORAL, d, `${w.k}-${Object.values(w.p).join('-')}`, [text(w.k, w.p)], w.value, rng, w.smart)
}

/** 够不够、能不能坐下（练习七 10 中国结、11(2) 客车）：真算出来比一比，不出正好相等的 */
function oralJudge(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    for (;;) {
      const c = rng.pick([70, 80, 90, 110, 120])
      const n = rng.int(3, 9)
      const m = rng.int(5, 12)
      const need = c * n
      if (need === m * 100 || Math.abs(need - m * 100) > 300) continue
      const [correct, others] = yesNo(need < m * 100, ENOUGH, NOT_ENOUGH)
      return pickQ(ORAL, d, `knot-${c}-${m}-${n}`, [text('m4.mul.w.knot', { c, m, n })], correct, others, rng)
    }
  }
  for (;;) {
    const [a, n] = twoByOne(rng, 100, 32)
    if (n < 3 || a < 18) continue
    const cap = a * n
    const m = cap + rng.pick([-6, -4, -3, -2, 2, 3, 4, 6])
    const [correct, others] = yesNo(m <= cap, CAN, CANNOT)
    return pickQ(ORAL, d, `coachfit-${a}-${m}-${n}`, [text('m4.mul.w.coachFit', { a, m, n })], correct, others, rng)
  }
}

/** 两步（第 3 档）：灯笼一共多少钱（练习七 4(2)）、漏水 1 天（练习七 6(2)）、带 * 的「一个数乘 10 比原来大 72」（练习七 12） */
function oralTwoStep(d: Difficulty, rng: RNG): Question {
  const roll = rng.int(0, 2)
  if (roll === 0) {
    const a = notRound(rng, 11, 19)
    const n = rng.pick([20, 30, 40])
    const p = rng.int(2, 5)
    return numQ(ORAL, d, `lanterncost-${a}-${n}-${p}`, [text('m4.mul.w.lanternCost', { a, n, p })], a * n * p, rng, [a * n, a * p, a * n + p, a * n * p * 10])
  }
  if (roll === 1) {
    const g = rng.int(2, 9)
    return numQ(ORAL, d, `tapday-${g}`, [text('m4.mul.w.tapDay', { g })], g * 60 * 24, rng, [g * 60, g * 24, g * 60 * 12, g * 1440 + 100])
  }
  const n = rng.int(2, 12)
  return numQ(ORAL, d, `plusten-${n}`, [text('m4.mul.w.plusTen', { d: 9 * n })], n, rng, [9 * n, n * 10, n + 1, n - 1])
}

defineGenerator(ORAL, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.22) return oralTwoByOne(d, rng)
    if (roll < 0.38) return oralHundredsTens(d, rng)
    if (roll < 0.5) return oralTimesTen(d, rng)
    if (roll < 0.68) return oralByTens(d, rng)
    if (roll < 0.78) return oralBig(d, rng)
    if (roll < 0.88) return oralMethod(d, rng)
    return oralExampleWord(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return oralHundredsTens(d, rng)
    if (roll < 0.35) return oralByTens(d, rng)
    if (roll < 0.55) return oralBig(d, rng)
    if (roll < 0.85) return oralWord(d, rng)
    return oralJudge(d, rng)
  }
  if (roll < 0.6) return oralTwoStep(d, rng)
  if (roll < 0.8) return oralJudge(d, rng)
  return oralBig(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 笔算乘法（p43–48，练习八；练习九 2、4，练习十一 2）
// 第 1 档：竖式——两位数乘两位数、三位数乘两位数，不进位（例 1 的 12 × 13、做一做 23 × 13、343 × 12）和进位的（例 2 的
//          37 × 48、试一试 237 × 48、做一做 78 × 82、425 × 36），乘数中间有 0（例 3 的 106 × 63、做一做 206 × 53）、
//          末尾有 0（做一做 704 × 90、580 × 12、472 × 30，0 写在竖式外面）；例 1、例 2 的应用题；
//          笔算法则「用十位上的数去乘，得数的末位和乘数的哪一位对齐」；竖式里箭头所指的一步算的是什么（例 1 的「12 × 10 的积」）；
//          「160 × 60：先算 16 × 6，积的末尾添几个 0」（例 3 试一试）。
// 第 2 档：三位数乘两位数（两位数写在前面的 43 × 139 也有）；练习八、九的应用题；跑道上箭头所指的一步是跑几圈的长度（练习八 3）；
//          下面的计算正确吗（练习八 2、6）；哪个算式的得数是几（练习八 7 连一连）；大象的食物够不够（练习八 11）。
// 第 3 档：四位数乘两位数（练习九 2、练习十一 2 的 3700 × 35、2005 × 85、7003 × 78）；算错的竖式，正确的积是多少；改错题。
// ─────────────────────────────────────────────────────────────

/** 竖式里的两次乘得的数：p1 = a × 个位，p2 = a × 十位（末尾的 0 不写） */
function partsOf(a: number, b: number): [number, number] {
  return [a * (b % 10), a * Math.floor(b / 10)]
}

/** 笔算的常见错误（选项的干扰项）：第二次乘得的数没有错位、乘的时候忘了进位、差一百 / 一千 */
function writtenSmart(a: number, b: number): number[] {
  const p = a * b
  const u = b % 10
  const t = Math.floor(b / 10)
  return [a * u + a * t, forgotCarry(a, u || 1) * (u ? 1 : 0) + forgotCarry(a, t) * 10, p + 100, p - 100, p + 1000, p - 1000, p + 10]
}

type WrittenKind = 'two-plain' | 'three-plain' | 'two-carry' | 'three-carry' | 'mid-zero' | 'end-zero'

/** 按类别取一道竖式题的两个数（a 在上、b 是两位数）；zeros = 用「0 写在外面」的竖式 */
function pickWritten(rng: RNG, kind: WrittenKind): { a: number; b: number; zeros: boolean } {
  for (;;) {
    if (kind === 'end-zero') {
      if (rng.chance(0.5)) {
        // 580 × 12：被乘的数末尾有 0，乘数是两位数
        const a = notRound(rng, 11, 99) * 10
        const b = noZero(rng, 2)
        return { a, b, zeros: true }
      }
      // 704 × 90、472 × 30：乘数是整十数
      const a = rng.chance(0.3) ? rng.int(1, 9) * 100 + rng.int(1, 9) : noZero(rng, 3)
      return { a, b: rng.int(2, 9) * 10, zeros: true }
    }
    if (kind === 'mid-zero') {
      const a = rng.int(1, 9) * 100 + rng.int(1, 9)
      const b = noZero(rng, 2)
      return { a, b, zeros: false }
    }
    const three = kind.startsWith('three')
    const plain = kind.endsWith('plain')
    const a = noZero(rng, three ? 3 : 2)
    const b = noZero(rng, 2)
    if (noCarry(a, b) !== plain) continue
    if (a % 11 === 0 && b % 11 === 0 && rng.chance(0.7)) continue
    return { a, b, zeros: false }
  }
}

/** 竖式题：横式写成 a × b = ?（两位数也可以写在前面），竖式里多位数在上面 */
function verticalQ(kpId: string, d: Difficulty, a: number, b: number, rng: RNG, zeros = false, swap = false): Question {
  const e = swap ? `${b} × ${a} = ?` : `${a} × ${b} = ?`
  const smart = zeros ? [(a * b) / 10, a * b * 10, ...writtenSmart(a, b)] : writtenSmart(a, b)
  const part: StemPart = zeros ? { kind: 'mul-vertical', a, b, zeros: true } : { kind: 'mul-vertical', a, b }
  return numQ(kpId, d, flat(e), [expr(e), part], a * b, rng, smart, rng.chance(0.8) ? 'numpad' : 'choice')
}

/** 例 1（一套书 12 册，买了 13 套）、例 2（48 个班，每班 37 人，每人一盒酸奶） */
function writtenExampleWord(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const a = notRound(rng, 11, 29)
    const n = notRound(rng, 11, 29)
    return numQ(WRITTEN, d, `books-${a}-${n}`, [text('m4.mul.w.books', { a, n })], a * n, rng, writtenSmart(a, n))
  }
  const n = notRound(rng, 21, 49)
  const a = notRound(rng, 31, 45)
  return numQ(WRITTEN, d, `yogurt-${n}-${a}`, [text('m4.mul.w.yogurt', { n, a })], a * n, rng, writtenSmart(a, n))
}

const PLACE: LStr[] = [{ k: 'm4.mul.ones' }, { k: 'm4.mul.tens' }, { k: 'm4.mul.hundreds' }]

/** 笔算法则（例 2 的框）：用乘数个位 / 十位上的数去乘，得数的末位和乘数的哪一位对齐 */
function alignQ(d: Difficulty, rng: RNG): Question {
  const a = rng.chance(0.5) ? noZero(rng, 2) : noZero(rng, 3)
  const b = noZero(rng, 2)
  const tens = rng.chance(0.65)
  const digit = tens ? Math.floor(b / 10) : b % 10
  const correct = PLACE[tens ? 1 : 0]!
  const others = PLACE.filter((p) => p !== correct)
  return pickQ(WRITTEN, d, `align-${a}x${b}-${tens ? 't' : 'o'}`, [text('m4.mul.align', { e: `${a} × ${b}`, place: PLACE[tens ? 1 : 0]!, n: digit, a })], correct, others, rng)
}

/** 写好的竖式（正确的） */
function workOf(a: number, b: number): MulWork {
  const [p1, p2] = partsOf(a, b)
  return { p1, p2, sum: a * b }
}

/** 竖式里箭头所指的一步算的是什么（例 1「12 × 3 的积」「12 × 10 的积」）：第二次乘得的数是 a 乘几十 */
function stepQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const a = rng.chance(0.6) ? noZero(rng, 2) : noZero(rng, 3)
    const b = noZero(rng, 2)
    const t = Math.floor(b / 10)
    const u = b % 10
    if (t === u) continue
    const mark: 1 | 2 = rng.chance(0.7) ? 2 : 1
    const all = [`${a} × ${t * 10}`, `${a} × ${t}`, `${a} × ${u}`, `${a} × ${b}`]
    const correct = mark === 2 ? all[0]! : all[2]!
    return pickQ(
      WRITTEN,
      d,
      `step-${a}x${b}-${mark}`,
      [{ kind: 'mul-vertical', a, b, work: workOf(a, b), mark }, text('m4.mul.stepIs')],
      correct,
      all.filter((x) => x !== correct),
      rng,
    )
  }
}

/** 末尾有 0 的乘法（例 3 试一试 160 × 60）：先算 0 前面的数，积的末尾再添上几个 0 */
function zeroCountQ(d: Difficulty, rng: RNG): Question {
  const x = rng.chance(0.6) ? notRound(rng, 11, 49) : rng.int(2, 9)
  const y = rng.int(2, 9)
  const [za, zb] = rng.pick([
    [1, 1],
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 0],
  ] as [number, number][])
  const a = x * 10 ** za
  const b = y * 10 ** zb
  const z = za + zb
  return numQ(WRITTEN, d, `zeros-${a}x${b}`, [text('m4.mul.zeroCount', { e: `${a} × ${b}`, e2: `${x} × ${y}`, p: x * y })], z, rng, [z - 1, z + 1, z + 2], 'choice')
}

/**
 * 两个乘数末尾都有 0（例 3 试一试 160 × 60、做一做 180 × 70、练习九 480 × 50）：横式直接算——先乘 0 前面的数，再在积的末尾添上
 * 两个乘数末尾一共几个 0。不画竖式（课本这几道没有画竖式，两个数都把 0 写在外面的竖式不好对齐）
 */
function bothZeroQ(d: Difficulty, rng: RNG): Question {
  const x = notRound(rng, 11, d === 1 ? 49 : 99)
  const y = rng.int(2, 9)
  const [a, b] = rng.chance(0.75) ? [x * 10, y * 10] : [y * 10, x * 10]
  const p = a * b
  const e = `${a} × ${b} = ?`
  return numQ(WRITTEN, d, flat(e), [expr(e)], p, rng, [p / 10, p * 10, x * y * 10, forgotCarry(x, y) * 100])
}

/** 练习八、九的应用题（第 2 档）：绿道、羽毛球、明信片、骑车、蔬菜、体育用品 */
function writtenWord(d: Difficulty, rng: RNG): Question {
  const plants = [{ k: 'm4.mul.n.pepper' }, { k: 'm4.mul.n.tomato' }, { k: 'm4.mul.n.pumpkin' }]
  const balls = [{ k: 'm4.mul.n.basketball' }, { k: 'm4.mul.n.football' }, { k: 'm4.mul.n.volleyball' }]
  const pool: (() => { k: string; p: Params; value: number; x: number; y: number })[] = [
    () => {
      const l = rng.int(8, 18) * 50
      const n = notRound(rng, 11, 29)
      return { k: 'm4.mul.w.track', p: { l, n }, value: l * n, x: l, y: n }
    },
    () => {
      const a = notRound(rng, 11, 15)
      const n = notRound(rng, 11, 29)
      return { k: 'm4.mul.w.shuttle', p: { a, n }, value: a * n, x: a, y: n }
    },
    () => {
      const p = notRound(rng, 31, 59)
      const n = notRound(rng, 11, 29)
      return { k: 'm4.mul.w.shuttleCost', p: { p, n }, value: p * n, x: p, y: n }
    },
    () => {
      const p = notRound(rng, 12, 19)
      const n = notRound(rng, 121, 199)
      return { k: 'm4.mul.w.postcard', p: { c: rng.pick([8, 10, 12]), p, n }, value: p * n, x: n, y: p }
    },
    () => {
      const v = rng.int(21, 32) * 10
      const t = notRound(rng, 11, 19)
      return { k: 'm4.mul.w.ride', p: { v, t }, value: v * t, x: v, y: t }
    },
    () => {
      const p = notRound(rng, 11, 19)
      const n = notRound(rng, 121, 349)
      return { k: 'm4.mul.w.plants', p: { name: rng.pick(plants), p, n }, value: p * n, x: n, y: p }
    },
    () => {
      const p = notRound(rng, 101, 169)
      const n = notRound(rng, 21, 39)
      return { k: 'm4.mul.w.sport', p: { name: rng.pick(balls), p, n }, value: p * n, x: p, y: n }
    },
  ]
  const w = rng.pick(pool)()
  const nums = Object.values(w.p).filter((v): v is number => typeof v === 'number')
  return numQ(WRITTEN, d, `${w.k}-${nums.join('-')}`, [text(w.k, w.p)], w.value, rng, writtenSmart(w.x, w.y))
}

/** 绿道一圈 650 米，跑了 12 圈，竖式里箭头所指的一步算的是跑几圈的长度（练习八 3） */
function lapsQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const l = rng.int(8, 18) * 50
    const n = rng.int(11, 29)
    const t = Math.floor(n / 10)
    const u = n % 10
    if (u === 0 || u === t) continue
    const mark: 1 | 2 = rng.chance(0.75) ? 2 : 1
    const laps = (k: number): LStr => key('m4.mul.lapsOf', { k })
    const correct = laps(mark === 2 ? t * 10 : u)
    const others = (mark === 2 ? [u, t, n] : [t * 10, t, n]).map(laps)
    return pickQ(WRITTEN, d, `laps-${l}-${n}-${mark}`, [text('m4.mul.lapsAsk', { l, n }), { kind: 'mul-vertical', a: l, b: n, work: workOf(l, n), mark }], correct, others, rng)
  }
}

/** 一道算错的竖式：flat = 第二次乘得的数没有错位（练习八 2 的 22 × 43、6 的 134 × 16），carry = 有一次乘的时候忘了进位（342 × 32） */
function wrongWork(a: number, b: number, how: 'flat' | 'carry'): MulWork | null {
  const u = b % 10
  const t = Math.floor(b / 10)
  let [p1, p2] = partsOf(a, b)
  if (how === 'flat') return { p1, p2, sum: p1 + p2, flat: true }
  if (forgotCarry(a, t) !== a * t) p2 = forgotCarry(a, t)
  else if (forgotCarry(a, u) !== a * u) p1 = forgotCarry(a, u)
  else return null
  return { p1, p2, sum: p1 + p2 * 10 }
}

/** 下面的计算正确吗（练习八 2、6）：一半左右是对的 */
function judgeQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const a = rng.chance(0.4) ? noZero(rng, 2) : noZero(rng, 3)
    const b = noZero(rng, 2)
    const right = rng.chance(0.45)
    const w = right ? workOf(a, b) : wrongWork(a, b, rng.chance(0.5) ? 'flat' : 'carry')
    if (!w) continue
    const [correct, others] = yesNo(right, RIGHT, WRONG)
    return pickQ(WRITTEN, d, `judge-${a}x${b}-${w.p1}-${w.p2}-${w.flat ? 'f' : 's'}`, [text('m4.mul.check'), { kind: 'mul-vertical', a, b, work: w }], correct, others, rng)
  }
}

/** 这道题算错了，正确的积是多少（改错） */
function fixQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const a = noZero(rng, 3)
    const b = noZero(rng, 2)
    const w = wrongWork(a, b, rng.chance(0.5) ? 'flat' : 'carry')
    if (!w) continue
    return numQ(WRITTEN, d, `fix-${a}x${b}-${w.p1}-${w.p2}-${w.flat ? 'f' : 's'}`, [text('m4.mul.fixAsk'), { kind: 'mul-vertical', a, b, work: w }], a * b, rng, [w.sum, ...writtenSmart(a, b)], 'numpad')
  }
}

/** 哪个算式的得数是几（练习八 7 连一连）：四个算式的积各不相同 */
function matchQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const pairs: [number, number][] = Array.from({ length: 4 }, () => [rng.chance(0.5) ? noZero(rng, 2) : noZero(rng, 3), noZero(rng, 2)])
    const products = pairs.map(([a, b]) => a * b)
    if (new Set(products).size < 4) continue
    const labels = pairs.map(([a, b]) => `${a} × ${b}`)
    if (new Set(labels).size < 4) continue
    return pickQ(WRITTEN, d, `match-${labels.map(flat).join('-')}`, [text('m4.mul.whichIs', { v: products[0]! })], labels[0]!, labels.slice(1), rng)
  }
}

/** 两头大象一天吃 350 千克，准备了 5 吨，够吃 20 天吗（练习八 11） */
function elephantQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const a = rng.pick([250, 300, 350, 400, 450])
    const days = rng.pick([10, 12, 15, 20, 30])
    const need = a * days
    const t = rng.int(3, 12)
    if (need === t * 1000 || Math.abs(need - t * 1000) > 3000) continue
    const [correct, others] = yesNo(need <= t * 1000, ENOUGH, NOT_ENOUGH)
    return pickQ(WRITTEN, d, `elephant-${a}-${t}-${days}`, [text('m4.mul.w.elephant', { a, t, days })], correct, others, rng)
  }
}

/** 四位数乘两位数（练习九 2、练习十一 2：3700 × 35、3070 × 35、2500 × 58、2005 × 85、4060 × 56、7003 × 78） */
function fourDigit(rng: RNG): { a: number; b: number; zeros: boolean } {
  for (;;) {
    const b = noZero(rng, 2)
    const kind = rng.int(0, 3)
    let a: number
    let zeros = false
    if (kind === 0) {
      // 3700、2500：末尾两个 0（写在竖式外面）
      a = notRound(rng, 11, 99) * 100
      zeros = true
    } else if (kind === 1) {
      // 3070、4060：中间有 0、末尾也有 0
      a = (rng.int(1, 9) * 100 + rng.int(1, 9)) * 10
      zeros = true
    } else if (kind === 2) {
      // 2005、7003：中间有两个 0
      a = rng.int(1, 9) * 1000 + rng.int(1, 9)
    } else {
      a = noZero(rng, 4)
    }
    if (a * b > 999999) continue
    return { a, b, zeros }
  }
}

defineGenerator(WRITTEN, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.52) {
      const r = rng.next()
      const kind: WrittenKind = r < 0.12 ? 'two-plain' : r < 0.22 ? 'three-plain' : r < 0.45 ? 'two-carry' : r < 0.66 ? 'three-carry' : r < 0.83 ? 'mid-zero' : 'end-zero'
      const { a, b, zeros } = pickWritten(rng, kind)
      return verticalQ(WRITTEN, d, a, b, rng, zeros)
    }
    if (roll < 0.66) return writtenExampleWord(d, rng)
    if (roll < 0.76) return alignQ(d, rng)
    if (roll < 0.88) return stepQ(d, rng)
    if (roll < 0.94) return zeroCountQ(d, rng)
    return bothZeroQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.38) {
      const r = rng.next()
      const kind: WrittenKind = r < 0.5 ? 'three-carry' : r < 0.75 ? 'mid-zero' : 'end-zero'
      const { a, b, zeros } = pickWritten(rng, kind)
      // 两位数写在前面的（43 × 139、87 × 165）：竖式照样把三位数写在上面
      return verticalQ(WRITTEN, d, a, b, rng, zeros, !zeros && rng.chance(0.25))
    }
    if (roll < 0.44) return bothZeroQ(d, rng)
    if (roll < 0.62) return writtenWord(d, rng)
    if (roll < 0.7) return lapsQ(d, rng)
    if (roll < 0.82) return judgeQ(d, rng)
    if (roll < 0.92) return matchQ(d, rng)
    return elephantQ(d, rng)
  }
  if (roll < 0.4) {
    const { a, b, zeros } = fourDigit(rng)
    return verticalQ(WRITTEN, d, a, b, rng, zeros)
  }
  if (roll < 0.65) return fixQ(d, rng)
  if (roll < 0.85) return judgeQ(d, rng)
  return elephantQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 积的变化规律（p49–50 例 4、例 5，练习九 3、5–10，练习十一 3、8）
// 课本的规律：一个乘数不变，另一个乘数乘几或除以几（0 除外），积也乘几或除以几。
// 第 1 档：根据第一个算式的积写出另一个的得数（例 4 的 6 × 2 → 6 × 20、6 × 200，20 × 4 → 10 × 4、5 × 4；做一做 1 的
//          12 × 3 → 120 × 3、120 × 30，48 × 5 → 48 × 500，4 × 15 → 160 × 15）；第二个乘数乘了几、第一个乘数除以了几、积乘了几；
//          规律本身（一个乘数不变，另一个乘数乘 10，积会怎样）；做一做 2 的长方形绿地（宽度变成 3 倍，面积也变成 3 倍）；
//          例 5 用计算器找规律（11 × 11、111 × 111……；做一做 9 × 9、99 × 99……，6 × 7、66 × 67……）。
// 第 2 档：比一比填 >、<、=（练习九 3）；一个乘数乘 2、3、4、8（练习九 5、8）；表格里填缺少的数（练习九 7）；练习九 9、10 的规律。
// 第 3 档：两个乘数都变（练习十一 3 的 16 × 30、做一做的 120 × 30）；长度、宽度各增加 1 米（练习十一 8）；思考题 74 × 76。
// ─────────────────────────────────────────────────────────────

/** 一组「已知的积」：两个乘数都不太大，积能口算或已经给出 */
function basePair(rng: RNG): [number, number] {
  return rng.pick([
    () => [rng.int(2, 9), rng.int(2, 9)] as [number, number],
    () => [notRound(rng, 11, 49), rng.int(2, 9)] as [number, number],
    () => [rng.int(2, 9), notRound(rng, 11, 49)] as [number, number],
    () => [notRound(rng, 11, 79), notRound(rng, 11, 29)] as [number, number],
  ])()
}

/** 根据 a × b = p，写出一个乘数乘（除以）k 以后的积（例 4、做一做 1、练习九 5、6、8） */
function chainQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const [a, b] = basePair(rng)
    const p = a * b
    const k = d === 1 ? rng.pick([10, 10, 100, 2, 3, 4, 5]) : rng.pick([2, 3, 4, 5, 8, 10, 20])
    const second = rng.chance(0.5)
    const down = rng.chance(d === 1 ? 0.25 : 0.3)
    let a2 = a
    let b2 = b
    if (down) {
      if (second ? b % k !== 0 || b / k < 2 : a % k !== 0 || a / k < 2) continue
      if (second) b2 = b / k
      else a2 = a / k
    } else if (second) b2 = b * k
    else a2 = a * k
    const p2 = a2 * b2
    if (p2 > 99999) continue
    const e = `${a2} × ${b2} = ?`
    return numQ(PATTERN, d, `chain-${a}x${b}-${flat(e)}`, [text('m4.mul.pat.from'), expr(`${a} × ${b} = ${p}`), expr(e)], p2, rng, [p, down ? p * k : p / k, p2 * 10, p2 / 10])
  }
}

/** 规律本身（例 4 的框）：一个乘数不变，另一个乘数乘几（除以几），积会怎样 */
function ruleQ(d: Difficulty, rng: RNG): Question {
  const k = rng.pick([2, 3, 4, 5, 10, 100])
  if (rng.chance(0.55)) {
    return pickQ(PATTERN, d, `rule-mul-${k}`, [text('m4.mul.pat.ruleMul', { k })], key('m4.mul.pat.mulToo', { k }), [key('m4.mul.pat.divBy', { k }), key('m4.mul.pat.same')], rng)
  }
  return pickQ(PATTERN, d, `rule-div-${k}`, [text('m4.mul.pat.ruleDiv', { k })], key('m4.mul.pat.divToo', { k }), [key('m4.mul.pat.mulBy', { k }), key('m4.mul.pat.same')], rng)
}

/** 例 4 的填空：第二个乘数乘了几、第一个乘数除以了几、积乘了几（看两个算式回答） */
function timesQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const [a, b] = basePair(rng)
    const k = rng.pick([2, 4, 5, 10, 100])
    const kind = rng.int(0, 2)
    if (kind === 1) {
      if (a % k !== 0 || a / k < 1 || a === k) continue
      const a2 = a / k
      return numQ(PATTERN, d, `k1div-${a}x${b}-${k}`, [expr(`${a} × ${b} = ${a * b}`), expr(`${a2} × ${b} = ${a2 * b}`), text('m4.mul.pat.k1div')], k, rng, [a2, a - a2, k * 10, k + 1])
    }
    const b2 = b * k
    if (a * b2 > 99999) continue
    const ask = kind === 0 ? 'm4.mul.pat.k2mul' : 'm4.mul.pat.kProd'
    return numQ(PATTERN, d, `${ask}-${a}x${b}-${k}`, [expr(`${a} × ${b} = ${a * b}`), expr(`${a} × ${b2} = ${a * b2}`), text(ask)], k, rng, [k * 10, b2, k + 1, k === 10 ? 100 : 10])
  }
}

/** 做一做 2：长方形绿地，长度不变，宽度从 8 米增加到 24 米，扩大后的面积是多少 */
function areaQ(d: Difficulty, rng: RNG): Question {
  const w = rng.int(4, 10)
  const l = rng.int(3, 10) * 5
  const k = rng.int(2, 4)
  const s = l * w
  return numQ(PATTERN, d, `area-${s}-${w}-${k}`, [text('m4.mul.pat.area', { s, w, w2: w * k })], s * k, rng, [s + w * k, s * k * 10, s + k, w * k * l * 2])
}

/** 例 5 与做一做、练习九 9、10、思考题：用计算器算出前几个，找规律写下一个 */
type Chain = { exprs: (n: number) => string; value: (n: number) => number; from: number; to: number; wrong: (n: number) => number[] }
const rep = (ch: string, n: number): string => ch.repeat(n)
const pal = (n: number): number => Number(`${'123456789'.slice(0, n)}${'87654321'.slice(9 - n)}`)
const CHAINS: Chain[] = [
  // 11 × 11 = 121，111 × 111 = 12321……
  { exprs: (n) => `${rep('1', n)} × ${rep('1', n)}`, value: (n) => pal(n), from: 2, to: 5, wrong: (n) => [pal(n - 1), Number(`${'123456789'.slice(0, n)}${'87654321'.slice(9 - n + 1)}`), pal(n) + 10 ** (n - 1)] },
  // 9 × 9 = 81，99 × 99 = 9801，999 × 999 = 998001……
  { exprs: (n) => `${rep('9', n)} × ${rep('9', n)}`, value: (n) => (10 ** n - 1) ** 2, from: 1, to: 4, wrong: (n) => [(10 ** (n - 1) - 1) ** 2, Number(`${rep('9', n - 1)}8${rep('0', n - 2)}1`), Number(`${rep('9', n)}8${rep('0', n - 1)}1`)] },
  // 6 × 7 = 42，66 × 67 = 4422……
  { exprs: (n) => `${rep('6', n)} × ${rep('6', n - 1)}7`, value: (n) => Number(`${rep('4', n)}${rep('2', n)}`), from: 1, to: 4, wrong: (n) => [Number(`${rep('4', n - 1)}${rep('2', n + 1)}`), Number(`${rep('4', n + 1)}${rep('2', n - 1)}`), Number(`${rep('4', n)}${rep('2', n - 1)}`)] },
  // 3 × 4 = 12，33 × 34 = 1122……（练习九 10）
  { exprs: (n) => `${rep('3', n)} × ${rep('3', n - 1)}4`, value: (n) => Number(`${rep('1', n)}${rep('2', n)}`), from: 1, to: 4, wrong: (n) => [Number(`${rep('1', n - 1)}${rep('2', n + 1)}`), Number(`${rep('1', n + 1)}${rep('2', n - 1)}`), Number(`${rep('1', n)}${rep('2', n - 1)}`)] },
]

function calcChainQ(d: Difficulty, rng: RNG): Question {
  const c = rng.pick(CHAINS)
  const last = rng.int(c.from + 2, c.to)
  const stem: StemPart[] = [text('m4.mul.pat.next'), ...[last - 2, last - 1].map((n) => expr(`${c.exprs(n)} = ${c.value(n)}`)), expr(`${c.exprs(last)} = ?`)]
  const v = c.value(last)
  return numQ(PATTERN, d, `calc-${flat(c.exprs(last))}`, stem, v, rng, c.wrong(last), v >= 1e6 ? 'choice' : undefined)
}

/** 15 × 15 = 225、25 × 25 = 625……（练习九 9）；31 × 39 = 1209……（思考题：十位相同、个位相加得 10） */
function squaresQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const all = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    const ask = rng.int(4, 9)
    const shown = rng.shuffle(all.filter((x) => x < ask)).slice(0, 3).sort((x, y) => x - y)
    const sq = (x: number): number => (10 * x + 5) ** 2
    const v = sq(ask)
    return numQ(PATTERN, d, `sq5-${ask}`, [text('m4.mul.pat.next'), ...shown.map((x) => expr(`${10 * x + 5} × ${10 * x + 5} = ${sq(x)}`)), expr(`${10 * ask + 5} × ${10 * ask + 5} = ?`)], v, rng, [v - 100, v + 100, ask * ask * 100 + 25])
  }
  const tens = rng.shuffle([3, 5, 6, 7, 8, 9]).slice(0, 4)
  const pairOf = (t: number): [number, number] => {
    const u = rng.int(1, 4)
    return [10 * t + u, 10 * t + 10 - u]
  }
  const shown = tens.slice(0, 3).map(pairOf)
  const [x, y] = pairOf(tens[3]!)
  const v = x * y
  return numQ(PATTERN, d, `ten-${x}x${y}`, [text('m4.mul.pat.next'), ...shown.map(([a, b]) => expr(`${a} × ${b} = ${a * b}`)), expr(`${x} × ${y} = ?`)], v, rng, [v + 100, v - 100, Math.floor(x / 10) * Math.floor(x / 10) * 100 + (x % 10) * (y % 10)])
}

/** 比一比（练习九 3）：120 × 20 ○ 12 × 200、500 × 10 ○ 10 × 550、16 × 400 ○ 165 × 4 这类，用规律就能比 */
function compareQ(d: Difficulty, rng: RNG): Question {
  const x = rng.chance(0.5) ? notRound(rng, 11, 49) : rng.int(2, 9)
  const y = rng.int(2, 9)
  const kind = rng.int(0, 2)
  let left: string
  let right: string
  if (kind === 0) {
    // 一个乘数乘 10、另一个除以 10：积不变
    ;[left, right] = [`${x * 10} × ${y * 10}`, `${x} × ${y * 100}`]
  } else if (kind === 1) {
    // 末尾的 0 挪了地方，另一个数差一点
    const y2 = y + rng.pick([-1, 1, 2]) || y + 1
    ;[left, right] = [`${x} × ${y * 100}`, `${x * 10} × ${y2 * 10}`]
  } else {
    const c = rng.int(1, 9)
    ;[left, right] = [`${x} × ${y * 100}`, `${x * 10 + c} × ${y}`]
  }
  if (rng.chance(0.5)) [left, right] = [right, left]
  const value = (s: string): number => s.split(' × ').map(Number).reduce((m, n) => m * n, 1)
  const [lv, rv] = [value(left), value(right)]
  const correct = lv > rv ? '>' : lv < rv ? '<' : '='
  return pickQ(PATTERN, d, `cmp-${flat(left)}-${flat(right)}`, [text('m4.mul.compare'), expr(`${left} ○ ${right}`)], correct, ['>', '<', '='].filter((s) => s !== correct), rng, 'compare')
}

/** 练习九 7：表格里两组乘数和积，第一组是全的，第二组缺一个数 */
function tableQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const x = rng.pick([20, 40, 50, 200, 30, 60])
    const y = rng.int(2, 9)
    const k = rng.pick([2, 5, 10])
    const changeFirst = rng.chance(0.5)
    const [x2, y2] = changeFirst ? [x * k, y] : [x, y * k]
    // 缺的是变了的那个乘数或者积（没变的那个乘数照抄就行，不问）
    const missing = rng.chance(0.5) ? 2 : changeFirst ? 0 : 1
    const col2: (number | null)[] = [x2, y2, x2 * y2]
    const value = col2[missing]!
    if (x2 * y2 > 99999) continue
    col2[missing] = null
    const factor: LStr = { k: 'm4.mul.pat.tFactor' }
    const rows: (number | LStr | null)[][] = [
      [factor, x, col2[0]!],
      [factor, y, col2[1]!],
      [{ k: 'm4.mul.pat.tProduct' }, x * y, col2[2]!],
    ]
    return numQ(PATTERN, d, `table-${x}-${y}-${x2}-${y2}-${missing}`, [text('m4.mul.pat.table'), { kind: 'stat-table', rows, head: 'col' }], value, rng, [value * 10, value / 10, x * y, value + k], 'numpad')
  }
}

/** 两个乘数都变（练习十一 3 的 32 × 15 → 16 × 30、320 × 15 → 640 × 15；做一做 1 的 12 × 3 → 120 × 30） */
function bothQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const [a, b] = basePair(rng)
    const kind = rng.int(0, 1)
    let a2: number
    let b2: number
    if (kind === 0) {
      // 一个乘 k、一个除以 k：积不变
      const k = rng.pick([2, 3, 5])
      if (a % k !== 0) continue
      ;[a2, b2] = [a / k, b * k]
    } else {
      const [k1, k2] = rng.pick([
        [10, 10],
        [2, 10],
        [10, 2],
        [2, 2],
        [2, 5],
      ] as [number, number][])
      ;[a2, b2] = [a * k1, b * k2]
    }
    if (a2 * b2 > 999999 || (a2 === a && b2 === b)) continue
    const e = `${a2} × ${b2} = ?`
    return numQ(PATTERN, d, `both-${a}x${b}-${flat(e)}`, [text('m4.mul.pat.from'), expr(`${a} × ${b} = ${a * b}`), expr(e)], a2 * b2, rng, [a * b, a * b * 10, (a2 * b2) / 10, a2 * b2 * 2])
  }
}

/** 练习十一 8：长度增加 1 米面积增加 16 平方米、宽度增加 1 米面积增加 25 平方米，原来的面积是多少 */
function areaPlusQ(d: Difficulty, rng: RNG): Question {
  const l = rng.int(15, 30)
  const w = rng.int(8, l - 2)
  return numQ(PATTERN, d, `areaplus-${l}-${w}`, [text('m4.mul.pat.areaPlus', { w, l })], l * w, rng, [l + w, (l + w) * 2, l * w + l + w, (l + 1) * (w + 1)])
}

defineGenerator(PATTERN, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.36) return chainQ(d, rng)
    if (roll < 0.5) return ruleQ(d, rng)
    if (roll < 0.66) return timesQ(d, rng)
    if (roll < 0.78) return areaQ(d, rng)
    return calcChainQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.28) return compareQ(d, rng)
    if (roll < 0.5) return chainQ(d, rng)
    if (roll < 0.7) return tableQ(d, rng)
    if (roll < 0.85) return squaresQ(d, rng)
    return calcChainQ(d, rng)
  }
  if (roll < 0.4) return bothQ(d, rng)
  if (roll < 0.65) return areaPlusQ(d, rng)
  if (roll < 0.85) return squaresQ(d, rng)
  return compareQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 用估算解决问题（p53–54 例 6、做一做、练习十；练习十一 5、7）：只问够不够、能不能时，估一估就能判断。
// 往大估了还不超过 → 一定够（例 6：108 × 18 往大估成 110 × 20 = 2200，2200 < 2600）；
// 往小估了已经超过 → 一定不够（208 × 18 往小估成 200 × 18 = 3600，3600 > 2600）。估成整十、整百，算式用「=」（课本没写「≈」）。
// 题目里的数都按这个道理取：估出来的数在钱数的哪一边，真正的得数一定也在那一边，答案唯一。
// 第 1 档：例 6 够不够（题里写出把几往大 / 往小估成几、估出来是多少）、哪一款买不起；做一做的限乘人数里包括司机；
//          把一个算式往大 / 往小估成哪个算式；回顾反思「要说明一定够 / 一定不够，往大估还是往小估」。
// 第 2 档：够不够、能不能（不提示）：录入文章、运水蜜桃（吨）、门票、排球；飞船绕地球 201 圈大约多少分钟（练习十 4）。
// 第 3 档：练习十一 7 的电话机哪一种买不起、限乘人数的车够不够、服装哪一款买不起。
// ─────────────────────────────────────────────────────────────

/** 估成整十或整百：三位数离整百不到 10 就估成整百（108 → 100、192 → 200、293 → 300），其余估成整十 */
export function roundUp(x: number): number {
  if (x % 10 === 0) return x
  if (x >= 100 && Math.ceil(x / 100) * 100 - x < 10) return Math.ceil(x / 100) * 100
  return Math.ceil(x / 10) * 10
}
export function roundDown(x: number): number {
  if (x % 10 === 0) return x
  if (x >= 100 && x - Math.floor(x / 100) * 100 < 10) return Math.floor(x / 100) * 100
  return Math.floor(x / 10) * 10
}

/** 估一估的提示：把几往大（往小）估成几、估出来是多少（例 6 女孩的写法，只写真的估了的数） */
function hintParts(up: boolean, x: number, y: number, x2: number, y2: number): StemPart[] {
  const dir = up ? 'up' : 'down'
  const moved = [x !== x2 ? [x, x2] : null, y !== y2 ? [y, y2] : null].filter(Boolean) as [number, number][]
  const hint =
    moved.length === 2
      ? text(`m4.mul.est.${dir}2`, { x: moved[0]![0], x2: moved[0]![1], y: moved[1]![0], y2: moved[1]![1] })
      : text(`m4.mul.est.${dir}1`, { x: moved[0]![0], x2: moved[0]![1] })
  return [hint, expr(`${x2} × ${y2} = ${x2 * y2}`)]
}

/**
 * 估一估：往大估（往小估）可以两个数都估（108 × 18 → 110 × 20），也可以只估一个（130 × 18 → 130 × 20、208 × 18 → 200 × 18）；
 * 取估出来和真正的积相差不到 15% 的那种（一个数估成整十丢得太多的不用），至少要真的估了一个数
 */
function estimateOf(up: boolean, x: number, y: number): [number, number] | null {
  const r = up ? roundUp : roundDown
  const ways: [number, number][] = [
    [r(x), r(y)],
    [r(x), y],
    [x, r(y)],
  ]
  for (const [x2, y2] of ways) {
    if (x2 === x && y2 === y) continue
    if (Math.abs(x2 * y2 - x * y) <= x * y * 0.15) return [x2, y2]
  }
  return null
}

/**
 * 够不够（例 6 的服装、练习十 5 的门票、练习十一 5 的排球）：钱数 m 取在估出来的数的同一边——
 * 够：往大估了 x′ × y′ ≤ m；不够：往小估了 x′ × y′ ≥ m，而且真的往小估了一个数（真正的积比 m 大）
 */
function enoughQ(d: Difficulty, rng: RNG, hint: boolean): Question {
  for (;;) {
    const ctx = rng.pick(['clothes', 'clothes', 'tickets', 'volleyball'] as const)
    // 价钱 × 数量：服装每套 101–299 元买 11–39 套；门票每人 21–49 元、151–299 人；排球每个 101–129 元、41–69 个
    const [x, y] =
      ctx === 'clothes' ? [rng.int(101, 299), notRound(rng, 11, 39)] : ctx === 'tickets' ? [notRound(rng, 21, 49), rng.int(151, 299)] : [rng.int(101, 129), notRound(rng, 41, 69)]
    if (x % 10 === 0 && y % 10 === 0) continue
    const enough = rng.chance(0.5)
    const est = estimateOf(enough, x, y)
    if (!est) continue
    const e = est[0] * est[1]
    const m = enough ? Math.ceil(e / 100) * 100 : Math.floor(e / 100) * 100
    const real = x * y
    if (enough ? real > m : real <= m) continue
    const [correct, others] = yesNo(enough, ENOUGH, NOT_ENOUGH)
    const k = ctx === 'clothes' ? 'm4.mul.est.clothes' : ctx === 'tickets' ? 'm4.mul.est.tickets' : 'm4.mul.est.volleyball'
    const stem = [text(k, { n: y, p: x, m }), ...(hint ? hintParts(enough, x, y, est[0], est[1]) : [])]
    return pickQ(ESTIMATE, d, `enough-${ctx}-${x}-${y}-${m}${hint ? '-h' : ''}`, stem, correct, others, rng)
  }
}

/**
 * 几款里哪一款买不起（例 6 的三款服装、练习十一 7 的四种电话机）：能买的把单价往大估（数量也可以往大估）也不超过钱数，
 * 买不起的把单价往小估了已经不少于钱数（208 × 18 → 200 × 18 = 3600；210 × 15 → 200 × 15 = 3000，真正的积更大）
 */
function whichNotQ(d: Difficulty, rng: RNG, phones: boolean): Question {
  for (;;) {
    const n = phones ? notRound(rng, 11, 19) : notRound(rng, 12, 29)
    const m = phones ? rng.pick([2000, 3000, 4000]) : rng.int(20, 50) * 100
    const okP = (p: number): boolean => roundUp(p) * n <= m || roundUp(p) * roundUp(n) <= m
    const badP = (p: number): boolean => p % 10 !== 0 && roundDown(p) * n >= m && p < (m / n) * 1.4
    const want = phones ? 3 : 2
    const ok: number[] = []
    let bad = 0
    for (let i = 0; i < 60 && (ok.length < want || !bad); i++) {
      const p = rng.int(101, 299)
      if (ok.length < want && okP(p) && !ok.includes(p)) ok.push(p)
      else if (!bad && badP(p)) bad = p
    }
    if (ok.length < want || !bad) continue
    const prices = rng.shuffle([...ok, bad])
    const label = (p: number): LStr => key(phones ? 'm4.mul.est.eachPhone' : 'm4.mul.est.eachSet', { p })
    const p: Params = { n, m }
    prices.forEach((x, i) => (p[`p${i + 1}`] = x))
    const k = phones ? 'm4.mul.est.phones' : 'm4.mul.est.whichNot'
    return pickQ(ESTIMATE, d, `which-${phones ? 'phone' : 'set'}-${n}-${m}-${prices.join('-')}`, [text(k, p)], label(bad), ok.map(label), rng)
  }
}

/**
 * 限乘人数里包括司机（例 6 做一做：1026 名师生、每辆限乘 48 人、19 辆车够吗）：每辆车只能坐 c - 1 名师生。
 * 不够：往大估 50 × 20 = 1000 还比人数少；够：把每辆坐的人数往小估（40 多看成 40），乘车数还不少于人数
 */
function busQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const c = rng.int(41, 59)
    const s = c - 1
    const k = notRound(rng, 11, 29)
    if (s % 10 === 0) continue
    const enough = rng.chance(0.5)
    const way = estimateOf(!enough, s, k)
    if (!way) continue
    const est = way[0] * way[1]
    const n = enough ? est - rng.int(0, 30) : est + rng.int(6, 60)
    const real = s * k
    if (enough ? real < n : real >= n) continue
    const [correct, others] = yesNo(enough, ENOUGH, NOT_ENOUGH)
    return pickQ(ESTIMATE, d, `bus-${n}-${c}-${k}`, [text('m4.mul.est.bus', { n, c, k })], correct, others, rng)
  }
}

/** 把 108 × 18 往大（往小）估，可以估成哪个算式 */
function roundExprQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const x = rng.int(101, 299)
    const y = notRound(rng, 11, 59)
    if (x % 10 === 0) continue
    const up = rng.chance(0.5)
    const [xu, xd, yu, yd] = [roundUp(x), roundDown(x), roundUp(y), roundDown(y)]
    const all = [`${xu} × ${yu}`, `${xd} × ${yd}`, `${xd} × ${yu}`, `${xu} × ${yd}`]
    const correct = up ? all[0]! : all[1]!
    if (new Set(all).size < 4) continue
    return pickQ(ESTIMATE, d, `round-${x}x${y}-${up ? 'u' : 'd'}`, [text(up ? 'm4.mul.est.roundUp' : 'm4.mul.est.roundDown', { e: `${x} × ${y}` })], correct, all.filter((a) => a !== correct), rng)
  }
}

/** 回顾反思：要说明钱一定够，往大估；一定不够，往小估 */
function directionQ(d: Difficulty, rng: RNG): Question {
  const sure = rng.chance(0.5)
  const [correct, others] = yesNo(sure, { k: 'm4.mul.est.bigger' }, { k: 'm4.mul.est.smaller' })
  return pickQ(ESTIMATE, d, `dir-${sure ? 'enough' : 'not'}`, [text(sure ? 'm4.mul.est.why' : 'm4.mul.est.whyNot')], correct, others, rng)
}

/** 录入文章（练习十 1）：每分钟 105 个字，30 分钟能录完 3000 字吗——往小估 100 × 30 = 3000，能 */
function typingQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const v = rng.chance(0.5) ? rng.int(101, 109) : rng.int(91, 99)
    const t = rng.pick([20, 30, 40, 50])
    const can = v > 100
    const w = (can ? roundDown(v) : roundUp(v)) * t
    const [correct, others] = yesNo(can, CAN, CANNOT)
    if (w > 6000) continue
    return pickQ(ESTIMATE, d, `typing-${w}-${v}-${t}`, [text('m4.mul.est.typing', { w, v, t })], correct, others, rng)
  }
}

/** 运水蜜桃（练习十 3）：293 箱、每箱 18 千克，6 吨的货车一次能运走吗——往大估 300 × 20 = 6000 千克 = 6 吨，能 */
function peachQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const can = rng.chance(0.5)
    const H = rng.pick([200, 300, 400, 500])
    const n = can ? H - rng.int(1, 9) : H + rng.int(1, 9)
    const a = can ? rng.int(11, 19) : rng.int(21, 29)
    const est = can ? roundUp(n) * roundUp(a) : roundDown(n) * roundDown(a)
    if (est % 1000 !== 0) continue
    const t = est / 1000
    const [correct, others] = yesNo(can, CAN, CANNOT)
    return pickQ(ESTIMATE, d, `peach-${n}-${a}-${t}`, [text('m4.mul.est.peach', { n, a, t })], correct, others, rng)
  }
}

/** 飞船绕地球一圈大约 90 分钟，绕 201 圈大约需要多少分钟（练习十 4）：把 201 看成 200，只有这一种估法；选项差 10 倍 */
function aboutQ(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([60, 70, 80, 90])
  const H = rng.pick([100, 200, 300])
  const n = H + rng.pick([1, 2, 3, -1, -2])
  const est = a * H
  return numQ(ESTIMATE, d, `about-${a}-${n}`, [text('m4.mul.est.about', { a, n })], est, rng, [est / 10, est * 10, est / 100], 'choice')
}

defineGenerator(ESTIMATE, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.4) return enoughQ(d, rng, true)
    if (roll < 0.55) return whichNotQ(d, rng, false)
    if (roll < 0.7) return busQ(d, rng)
    if (roll < 0.87) return roundExprQ(d, rng)
    return directionQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.35) return enoughQ(d, rng, false)
    if (roll < 0.55) return typingQ(d, rng)
    if (roll < 0.75) return peachQ(d, rng)
    if (roll < 0.88) return aboutQ(d, rng)
    return busQ(d, rng)
  }
  if (roll < 0.4) return whichNotQ(d, rng, true)
  if (roll < 0.7) return whichNotQ(d, rng, false)
  return busQ(d, rng)
})
