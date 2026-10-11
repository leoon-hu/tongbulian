import type { Difficulty, InputMode, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 五下「2 因数和倍数」（平台当前的旧版五下，课本第 5–17 页；五年级数学 F）：六个知识点——
//   因数和倍数的认识（例 1、做一做）、找一个数的因数和倍数（例 2、例 3 与「发现」）、2、5 的倍数的特征（例 1、奇数偶数）、
//   3 的倍数的特征（例 2）、质数和合数（1～20 各数的因数表、定义、例 1 质数表）、和的奇偶性（质数和合数小节里的例 2）。
// 这本书的单元里没有分解质因数、公因数、公倍数（最大公因数 / 最小公倍数在第 4 单元）。
// 术语照这本书：乘法算式里的数也叫「因数」（男孩「2 × 6 = 12，2 和 6 是 12 的因数」）；研究因数和倍数只讲自然数（一般不包括 0），
// 奇偶讲「整数中」，0 是偶数——因数、倍数题的数都 ≥ 1，0 只出现在奇偶题里。
// 作答：列一串数（18 的因数有哪些）、说法（4 是 24 的因数）、奇数 / 偶数、质数 / 合数一律是选项；个数、最大最小、填数字用数字键盘。
// 判断题一律「……，对吗？」配 对 / 不对。图：百数表（HundredChart，圈 / 框 / 去掉）、数字卡片（CodeStrip 的卡片样式）、
// 摆奇偶的小方块（PairTiles）。
// 朗读避坑（课本原话改写）：不写「数数」「数出来」（数 shǔ）、「划去」（改「去掉」）、「为」（改「是」）、「说得对」、「两个两个地」（地）、
// 「差」（改「a − b 的结果」）；序数不用阿拉伯数字；「（2 除外）」这类括号会读出「括号」，改成「2 要留下」；「～」改「到」。
// 「奇数」的「奇」（jī）、「还是」请合成后核听。
// ─────────────────────────────────────────────────────────────

type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })

export const YES: LStr = L('m5.fac.yes')
export const NO: LStr = L('m5.fac.no')
export const FACTOR: LStr = L('m5.fac.factor')
export const MULTIPLE: LStr = L('m5.fac.multiple')
export const ODD: LStr = L('m5.fac.odd')
export const EVEN: LStr = L('m5.fac.even')
export const PRIME: LStr = L('m5.fac.prime')
export const COMPOSITE: LStr = L('m5.fac.composite')
export const NEITHER: LStr = L('m5.fac.neither')

// ── 数的小工具（测试也用）──

/** n 的全部因数，从小到大 */
export function factorsOf(n: number): number[] {
  const out: number[] = []
  for (let k = 1; k <= n; k++) if (n % k === 0) out.push(k)
  return out
}
export const isPrime = (n: number): boolean => n >= 2 && factorsOf(n).length === 2
export const digitSum = (n: number): number => [...String(n)].reduce((s, c) => s + Number(c), 0)
/** 课本列数的写法：中文逗号隔开 */
export const listText = (ns: number[]): string => ns.join('，')
/** 前 5 个倍数，末尾「，…」（倍数的个数是无限的） */
export const multiplesText = (n: number, from = 1, more = true): string =>
  listText([0, 1, 2, 3, 4].map((i) => n * (from + i))) + (more ? '，…' : '')

function judge(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], truth: boolean): Question {
  return labelQuestion({ kpId, type: 'factor', difficulty: d, sig: `${sig}-${truth ? 'y' : 'n'}`, stem, correct: truth ? YES : NO, distractors: [truth ? NO : YES], rng })
}
function pick(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[]): Question {
  return labelQuestion({ kpId, type: 'factor', difficulty: d, sig, stem, correct, distractors, rng })
}
function num(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: number, smart: number[], max = 999, min = 0, input?: InputMode): Question {
  // 带百数表的题一律出成选项：表占了大半屏，再放数字键盘，手机竖屏一屏放不下
  const pick: InputMode | undefined = input ?? (stem.some((p) => p.kind === 'hundred-chart') ? 'choice' : undefined)
  return numberQuestion({ kpId, type: 'factor', difficulty: d, sig, stem, value, rng, min, max, input: pick, smart: smart.filter((x) => x >= min && x !== value) })
}
/** 从 pool 里挑 k 个不同的、满足 ok 的数（打乱）；不够就有多少给多少 */
function some(rng: RNG, pool: readonly number[], k: number, ok: (n: number) => boolean = () => true): number[] {
  return rng.shuffle([...new Set(pool)].filter(ok)).slice(0, k)
}
/** 一道「下面哪个数……」：一个对的 + 三个错的（都是数） */
function whichNum(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], good: readonly number[], bad: readonly number[]): Question {
  const right = rng.pick(good)
  const wrong = some(rng, bad, 3, (x) => x !== right)
  return pick(kpId, d, rng, `${sig}-${right}-${[...wrong].sort((a, b) => a - b).join('.')}`, stem, String(right), wrong.map(String))
}

// ═════════════════════════════════════════════════════════════
// 1. 因数和倍数的认识（例 1、做一做；练习二 5）
// ═════════════════════════════════════════════════════════════

const K1 = 'm5s2-02-meaning'
/** 例 1 第一种情况（整除）：被除数、除数、商 */
export const DIV_BOOK: [number, number, number][] = [
  [12, 2, 6],
  [20, 10, 2],
  [30, 6, 5],
  [21, 21, 1],
  [63, 9, 7],
]
/** 例 1 第二种情况（有余数）：被除数、除数、商、余数 */
export const REM_BOOK: [number, number, number, number][] = [
  [8, 3, 2, 2],
  [9, 5, 1, 4],
  [19, 7, 2, 5],
  [26, 8, 3, 2],
]
/** 做一做的 4 组数（照课本的先后） */
export const PAIR_BOOK: [number, number][] = [
  [4, 24],
  [26, 13],
  [75, 25],
  [81, 9],
]

/** 一道整除的算式：课本的或 b、c 在 2–12 之间 */
function division(rng: RNG): [number, number, number] {
  if (rng.chance(0.4)) return rng.pick(DIV_BOOK)
  const b = rng.int(2, 12)
  const c = rng.int(2, 12)
  return [b * c, b, c]
}
/** 除法算式里谁是谁的因数 / 倍数（例 1：12 ÷ 2 = 6，2 是 12 的因数，12 是 2 的倍数；12 ÷ 6 = 2 也可以说 6 是 12 的因数） */
function qDivRole(d: Difficulty, rng: RNG): Question {
  const [a, b, c] = division(rng)
  // 被除数和除数一样（21 ÷ 21 = 1）时只问 1 和 21：21 是 21 的因数、也是 21 的倍数，问它就有两个对的
  const asks: [number, number, boolean][] = a === b ? [[c, a, true], [a, c, false]] : [[b, a, true], [a, b, false], [c, a, true], [a, c, false]]
  const [x, y, isFactor] = rng.pick(asks)
  return pick(K1, d, rng, `div-${a}-${b}-${x}-${y}`, [E(`${a} ÷ ${b} = ${c}`), T('m5.fac.role.ask', { x, y })], isFactor ? FACTOR : MULTIPLE, [isFactor ? MULTIPLE : FACTOR])
}
/** 乘法算式（例 1 男孩：2 × 6 = 12，2 和 6 是 12 的因数，12 是 2 和 6 的倍数） */
function qMulRole(d: Difficulty, rng: RNG): Question {
  const [a, b, c] = rng.chance(0.3) ? ([12, 2, 6] as [number, number, number]) : division(rng)
  if (b === c || a === b) {
    // 两个因数一样（6 × 6）、或有一个是 1：只问积和其中一个
    const [x, y, isFactor] = rng.pick<[number, number, boolean]>([[b, a, true], [a, b, false]])
    return pick(K1, d, rng, `mul-${b}x${c}-${x}-${y}`, [E(`${b} × ${c} = ${a}`), T('m5.fac.role.ask', { x, y })], isFactor ? FACTOR : MULTIPLE, [isFactor ? MULTIPLE : FACTOR])
  }
  const form = rng.int(0, 2)
  if (form === 0) {
    return pick(K1, d, rng, `mul-${b}x${c}-both`, [E(`${b} × ${c} = ${a}`), T('m5.fac.role.both', { x: b, y: c, z: a })], FACTOR, [MULTIPLE])
  }
  if (form === 1) {
    return pick(K1, d, rng, `mul-${b}x${c}-rev`, [E(`${b} × ${c} = ${a}`), T('m5.fac.role.bothRev', { x: b, y: c, z: a })], MULTIPLE, [FACTOR])
  }
  const [x, y, isFactor] = rng.pick<[number, number, boolean]>([[b, a, true], [c, a, true], [a, b, false], [a, c, false]])
  return pick(K1, d, rng, `mul-${b}x${c}-${x}-${y}`, [E(`${b} × ${c} = ${a}`), T('m5.fac.role.ask', { x, y })], isFactor ? FACTOR : MULTIPLE, [isFactor ? MULTIPLE : FACTOR])
}
/** 有余数的不算（例 1 第二种情况）；整除的对、说反了的不对 */
function qRemainder(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    let row: [number, number, number, number] = rng.pick(REM_BOOK)
    if (rng.chance(0.5)) {
      const b = rng.int(3, 9)
      const q = rng.int(1, 9)
      const r = rng.int(1, b - 1)
      row = [b * q + r, b, q, r]
    }
    const [a, b, q, r] = row
    return judge(K1, d, rng, `rem-${a}-${b}`, [T('m5.fac.rem.data', { a, b, q, r }), T('m5.fac.j.factor', { x: b, y: a })], false)
  }
  const [a, b, c] = division(rng)
  if (a === b) return judge(K1, d, rng, `exact-${a}-${b}-one`, [E(`${a} ÷ ${b} = ${c}`), T('m5.fac.j.factor', { x: c, y: a })], true)
  const form = rng.int(0, 3)
  const stem = (k: string, x: number, y: number): StemPart[] => [E(`${a} ÷ ${b} = ${c}`), T(k, { x, y })]
  if (form === 0) return judge(K1, d, rng, `exact-${a}-${b}-f`, stem('m5.fac.j.factor', b, a), true)
  if (form === 1) return judge(K1, d, rng, `exact-${a}-${b}-m`, stem('m5.fac.j.multiple', a, b), true)
  if (form === 2) return judge(K1, d, rng, `exact-${a}-${b}-fx`, stem('m5.fac.j.factor', a, b), false)
  return judge(K1, d, rng, `exact-${a}-${b}-mx`, stem('m5.fac.j.multiple', b, a), false)
}
/** 做一做：两个数，谁是谁的因数、谁是谁的倍数（只有一句对） */
function qPair(d: Difficulty, rng: RNG): Question {
  let [p, q] = rng.pick(PAIR_BOOK)
  if (rng.chance(0.55)) {
    const s = rng.int(2, 15)
    const big = s * rng.int(2, Math.min(9, Math.floor(100 / s)))
    ;[p, q] = rng.chance(0.5) ? [s, big] : [big, s]
  }
  const small = Math.min(p, q)
  const big = Math.max(p, q)
  const sf = L('m5.fac.s.factor', { x: small, y: big })
  const bm = L('m5.fac.s.multiple', { x: big, y: small })
  const bf = L('m5.fac.s.factor', { x: big, y: small })
  const sm = L('m5.fac.s.multiple', { x: small, y: big })
  const factorRight = rng.chance(0.5)
  return pick(K1, d, rng, `pair-${p}-${q}-${factorRight ? 'f' : 'm'}`, [T('m5.fac.pair.q', { a: p, b: q })], factorRight ? sf : bm, [bf, sm])
}

// 第 2 档：练习二 5 的判断
const DECIMALS: [string, number][] = [
  ['5.7', 3],
  ['4.8', 2],
  ['7.5', 5],
]
function qBook5(d: Difficulty, rng: RNG): Question {
  const form = rng.int(0, 5)
  if (form === 0) return judge(K1, d, rng, 'one', [T('m5.fac.j.one')], true)
  if (form === 1) {
    // 8 的倍数只有 16，24，32，40，48（不对：倍数有无数个，8 自己也是）
    const n = rng.chance(0.4) ? 8 : rng.int(3, 12)
    return judge(K1, d, rng, `only-${n}`, [T('m5.fac.j.only', { n, list: listText([2, 3, 4, 5, 6].map((k) => k * n)) })], false)
  }
  if (form === 2) {
    // 因为 36 ÷ 9 = 4，所以 36 是 9 的倍数（对）；说成 9 是 36 的倍数（不对）
    const [a, b, c] = rng.chance(0.4) ? ([36, 9, 4] as [number, number, number]) : division(rng)
    if (a === b) return judge(K1, d, rng, `because-${a}-${b}`, [T('m5.fac.j.because', { a, b, c, x: a, y: c })], true)
    const right = rng.chance(0.6)
    return judge(K1, d, rng, `because-${a}-${b}-${right ? 'ok' : 'swap'}`, [T('m5.fac.j.because', { a, b, c, x: right ? a : b, y: right ? b : a })], right)
  }
  if (form === 3) {
    // 5.7 是 3 的倍数（不对：研究因数和倍数只讲自然数）
    const [x, y] = rng.pick(DECIMALS)
    return judge(K1, d, rng, `dec-${x}-${y}`, [T('m5.fac.j.multiple', { x, y })], false)
  }
  // 一个数是它自己的因数，也是它自己的倍数（对）
  const n = rng.int(2, 30)
  const asFactor = rng.chance(0.5)
  return judge(K1, d, rng, `self-${n}-${asFactor ? 'f' : 'm'}`, [T(asFactor ? 'm5.fac.j.factor' : 'm5.fac.j.multiple', { x: n, y: n })], true)
}
/** 第 3 档：因数和倍数是相互依存的——只说「12 是倍数，2 是因数」不对 */
function qBare(d: Difficulty, rng: RNG): Question {
  const [a, b] = division(rng)
  if (a === b) return qBook5(d, rng)
  return judge(K1, d, rng, `bare-${a}-${b}`, [E(`${a} ÷ ${b} = ${a / b}`), T('m5.fac.j.bare', { a, b })], false)
}

function meaning(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.3) return qDivRole(d, rng)
    if (roll < 0.5) return qMulRole(d, rng)
    if (roll < 0.72) return qRemainder(d, rng)
    return qPair(d, rng)
  }
  if (d === 2) {
    if (roll < 0.6) return qBook5(d, rng)
    if (roll < 0.8) return qPair(d, rng)
    return qRemainder(d, rng)
  }
  if (roll < 0.5) return qBare(d, rng)
  return qBook5(d, rng)
}
defineGenerator(K1, meaning)

// ═════════════════════════════════════════════════════════════
// 2. 找一个数的因数和倍数（例 2、例 3、发现；练习二 1–4、6–8）
// ═════════════════════════════════════════════════════════════

const K2 = 'm5s2-02-find'
/** 例 2 与练习二要找因数的数（列全部因数的题只用因数不太多的：48、60 只问个数） */
export const FIND_BOOK = [18, 30, 36, 10, 17, 28, 32, 15]
const FIND_MORE = [12, 16, 20, 21, 24, 26, 27, 35, 40, 42, 45, 49, 50, 54, 56]
/** 问「有几个因数」的数：练习二 6 的 1、7、10，例 2 的 18、30、36，练习二 2 的 48 */
export const COUNT_BOOK = [1, 7, 10, 18, 30, 36, 48, 60, 17, 28, 32, 15]
/** 例 3 与练习二 2(2) 找倍数的数 */
export const MULT_BOOK = [2, 3, 5, 4, 7, 10, 6, 9]
/** 练习二 1 热气球题中间的数、练习二 3 星星上的数 */
export const BALLOON = [1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 30, 36, 60]
export const STARS = [5, 35, 10, 92, 48, 55, 81, 27, 60, 8, 12, 100]

/** 「18 的因数有哪些」的干扰项：漏了 1 和它本身、漏了中间一个、多写一个不是因数的、写成了倍数 */
function factorListWrongs(n: number, rng: RNG): string[] {
  const fs = factorsOf(n)
  const out: string[] = []
  const mid = fs.slice(1, -1)
  if (mid.length) out.push(listText(mid))
  if (mid.length >= 2) {
    const drop = rng.pick(mid)
    out.push(listText(fs.filter((x) => x !== drop)))
  }
  const nonF = Array.from({ length: n - 2 }, (_, i) => i + 2).filter((x) => n % x !== 0)
  if (nonF.length) {
    const extra = rng.pick(nonF)
    out.push(listText([...fs, extra].sort((a, b) => a - b)))
  }
  out.push(multiplesText(n))
  if (fs.length === 2) out.push(String(n))
  return rng.shuffle([...new Set(out)].filter((s) => s !== listText(fs))).slice(0, 3)
}
function qListFactors(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.55) ? rng.pick(FIND_BOOK) : rng.pick(FIND_MORE)
  return pick(K2, d, rng, `listF-${n}`, [T('m5.fac.listF.q', { n })], listText(factorsOf(n)), factorListWrongs(n, rng))
}
function qCountFactors(d: Difficulty, rng: RNG, k = K2, pool: readonly number[] = COUNT_BOOK, hi = 60): Question {
  const n = rng.chance(0.5) ? rng.pick(pool) : rng.int(2, hi)
  const c = factorsOf(n).length
  // 常错：漏了 1 或它本身、两个都漏了、把平方数中间那个数算了两次
  return num(k, d, rng, `countF-${n}`, [T('m5.fac.countF.q', { n })], c, [c - 1, c + 1, c - 2, c + 2], 99)
}
/** 「2 的倍数有哪些」：对的末尾有「，…」；干扰项：没有省略号（只有这几个）、写成因数、漏了它本身、连着的数 */
function qListMultiples(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.6) ? rng.pick(MULT_BOOK) : rng.int(8, 15)
  const wrongs = [multiplesText(n, 2), listText([0, 1, 2, 3, 4].map((i) => n + i)) + '，…']
  if (rng.chance(0.5)) wrongs.push(multiplesText(n, 1, false))
  if (factorsOf(n).length >= 2) wrongs.push(listText(factorsOf(n)))
  return pick(K2, d, rng, `listM-${n}`, [T('m5.fac.listM.q', { n })], multiplesText(n), rng.shuffle(wrongs).slice(0, 3))
}
function qWhich(d: Difficulty, rng: RNG): Question {
  const form = rng.int(0, 2)
  if (form === 0) {
    // 哪个数是 36（60、18、30……）的因数：在热气球的数里挑
    const n = rng.pick([36, 60, 18, 30, 24, 48])
    const fs = factorsOf(n).filter((x) => x !== 1 && x !== n)
    const bad = BALLOON.filter((x) => n % x !== 0).concat([n * 2, n + 1])
    return whichNum(K2, d, rng, `whichF-${n}`, [T('m5.fac.whichF.q', { n })], fs, bad)
  }
  if (form === 1) {
    // 哪个数不是 n 的因数
    const n = rng.pick([36, 60, 24, 48])
    const fs = factorsOf(n).filter((x) => x !== 1 && x !== n)
    const bad = BALLOON.filter((x) => n % x !== 0 && x < n)
    return whichNum(K2, d, rng, `notF-${n}`, [T('m5.fac.whichNotF.q', { n })], bad, fs)
  }
  // 哪个数是 5（2、3……）的倍数：5 用课本星星上的数
  const n = rng.chance(0.4) ? 5 : rng.pick([2, 3, 4, 6, 7, 9])
  const pool = n === 5 ? STARS : Array.from({ length: 60 }, (_, i) => i + 6)
  return whichNum(K2, d, rng, `whichM-${n}`, [T('m5.fac.whichM.q', { n })], pool.filter((x) => x % n === 0 && x !== n), pool.filter((x) => x % n !== 0))
}
/** 发现框：最小因数是 1、最大因数是它本身、最小倍数是它本身 */
function qMinMax(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.5) ? rng.pick([18, 30, 36, 2, 3, 5, 7, 15]) : rng.int(4, 40)
  const form = rng.int(0, 2)
  if (form === 0) return num(K2, d, rng, `minF-${n}`, [T('m5.fac.minF.q', { n })], 1, [n, 2, 0], 99)
  if (form === 1) return num(K2, d, rng, `maxF-${n}`, [T('m5.fac.maxF.q', { n })], n, [n - 1, 2 * n, Math.floor(n / 2)], 99)
  return num(K2, d, rng, `minM-${n}`, [T('m5.fac.minM.q', { n })], n, [2 * n, 1, n + 1], 99)
}
/** 发现框的三句结论（判断） */
export const FACTS: [string, boolean][] = [
  ['m5.fac.f.minF', true],
  ['m5.fac.f.maxF', true],
  ['m5.fac.f.minM', true],
  ['m5.fac.f.maxM', false],
  ['m5.fac.f.finiteF', true],
  ['m5.fac.f.finiteM', false],
  ['m5.fac.f.infiniteM', true],
]
function qFacts(d: Difficulty, rng: RNG): Question {
  const [k, truth] = rng.pick(FACTS)
  return judge(K2, d, rng, `fact-${k.split('.').pop()}`, [T(k)], truth)
}

// 第 2 档：练习二 1、4、6、7、8
function qBoth(d: Difficulty, rng: RNG): Question {
  const form = rng.int(0, 2)
  if (form === 0) {
    const n = rng.chance(0.4) ? 18 : rng.int(5, 40)
    return num(K2, d, rng, `both-${n}`, [T('m5.fac.both.q', { n })], n, [2 * n, 1, n - 1], 99)
  }
  if (form === 1) return num(K2, d, rng, 'minM1', [T('m5.fac.minM1.q')], 1, [0, 2, 10], 99)
  return num(K2, d, rng, 'maxF1', [T('m5.fac.maxF1.q')], 1, [0, 2, 10], 99)
}
/**
 * 猜数游戏（练习二 7）：它是 42 的因数，又是 7 的倍数——可能是 7、14、21、42；它也是 2 和 3 的倍数——是 42。
 * 换数时找一组条件，让答案只有一个。
 */
export interface Guess {
  n: number
  a: number
  /** 最后一个条件：一个数或两个数 */
  b: number[]
  answer: number
}
export const GUESS_BOOK: Guess = { n: 42, a: 7, b: [2, 3], answer: 42 }
export function guessCandidates(g: { n: number; a: number; b: number[] }): number[] {
  return factorsOf(g.n).filter((x) => x % g.a === 0 && g.b.every((m) => x % m === 0))
}
function makeGuess(rng: RNG): Guess {
  for (let tries = 0; tries < 40; tries++) {
    const n = rng.pick([24, 30, 36, 40, 42, 48, 60, 72, 84, 90])
    const a = rng.pick([2, 3, 4, 5, 6, 7].filter((x) => n % x === 0))
    if (guessCandidates({ n, a, b: [] }).length < 3) continue
    const conds = rng.shuffle([[2, 3], [2, 5], [3, 5], [4], [5], [6], [8], [9], [10], [12]].filter((b) => b.every((m) => m !== a)))
    for (const b of conds) {
      const c = guessCandidates({ n, a, b })
      if (c.length === 1) return { n, a, b, answer: c[0]! }
    }
  }
  return GUESS_BOOK
}
function qGuess(d: Difficulty, rng: RNG): Question {
  const g = rng.chance(0.35) ? GUESS_BOOK : makeGuess(rng)
  const b: LStr | number = g.b.length === 2 ? L('m5.fac.and', { x: g.b[0]!, y: g.b[1]! }) : g.b[0]!
  const cands = guessCandidates({ n: g.n, a: g.a, b: [] }).filter((x) => x !== g.answer)
  return num(K2, d, rng, `guess-${g.n}-${g.a}-${g.b.join('.')}`, [T('m5.fac.guess.q', { n: g.n, a: g.a, b })], g.answer, [...cands, g.n, g.a], 999)
}
/** 练习二 1：既不是 36 的因数，也不是 60 的因数（8、16、24） */
function qNeither(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick<[number, number]>([[36, 60], [36, 60], [24, 36], [18, 30], [30, 45]])
  const pool = a === 36 && b === 60 ? BALLOON : Array.from({ length: Math.max(a, b) }, (_, i) => i + 1)
  const good = pool.filter((x) => a % x !== 0 && b % x !== 0 && x < Math.max(a, b))
  const bad = pool.filter((x) => a % x === 0 || b % x === 0)
  return whichNum(K2, d, rng, `neither-${a}-${b}`, [T('m5.fac.neither.q', { a, b })], good, bad)
}
/** 练习二 8：两个 7 的倍数的和、两个 9 的倍数相减的结果，还是 7（9）的倍数 */
function qSumDiff(d: Difficulty, rng: RNG): Question {
  const sum = rng.chance(0.5)
  let [n, a, b] = sum ? [7, 14, 21] : [9, 27, 18]
  if (rng.chance(0.6)) {
    n = rng.int(3, 9)
    const i = rng.int(2, 9)
    const j = rng.int(2, 9)
    if (i === j) return qSumDiff(d, rng)
    ;[a, b] = sum ? [n * i, n * j] : [n * Math.max(i, j), n * Math.min(i, j)]
  }
  return judge(K2, d, rng, `${sum ? 'sum' : 'diff'}-${n}-${a}-${b}`, [T(sum ? 'm5.fac.sum.j' : 'm5.fac.diff.j', { a, b, n })], true)
}
/** 练习二 4：15 是哪些数的倍数 */
function qOfWhich(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.4) ? 15 : rng.pick([18, 20, 21, 24, 28, 30, 35, 36, 42, 45])
  const fs = factorsOf(n).filter((x) => x !== 1 && x !== n)
  const bad = Array.from({ length: 10 }, (_, i) => i + 2).filter((x) => n % x !== 0).concat([2 * n])
  return whichNum(K2, d, rng, `ofWhich-${n}`, [T('m5.fac.ofWhich.q', { n })], fs, bad)
}

function find(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2：找因数、因数的个数；例 3：找倍数；看数挑因数 / 倍数（练习二 1、3 的数）；发现框
    if (roll < 0.2) return qListFactors(d, rng)
    if (roll < 0.36) return qCountFactors(d, rng)
    if (roll < 0.52) return qListMultiples(d, rng)
    if (roll < 0.7) return qWhich(d, rng)
    if (roll < 0.85) return qMinMax(d, rng)
    return qFacts(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return qBoth(d, rng)
    if (roll < 0.4) return qGuess(d, rng)
    if (roll < 0.6) return qNeither(d, rng)
    if (roll < 0.8) return qSumDiff(d, rng)
    return qOfWhich(d, rng)
  }
  if (roll < 0.5) return qGuess(d, rng)
  return qCountFactors(d, rng, K2, COUNT_BOOK, 100)
}
defineGenerator(K2, find)

// ═════════════════════════════════════════════════════════════
// 3. 2、5 的倍数的特征（例 1、做一做，奇数和偶数；练习三 1、2、4、7、8）
// ═════════════════════════════════════════════════════════════

const K3 = 'm5s2-02-two-five'
/** 做一做的数 */
export const DOYI_25 = [35, 67, 99, 106, 60, 75, 130, 521, 280, 6018]
/** 练习三 1 的数 */
export const ODD_EVEN_BOOK = [33, 98, 355, 0, 123, 881, 8089, 1000, 988, 565, 3678, 677]
/** 一个 2–4 位的数：个位随便 */
const anyNum = (rng: RNG): number => (rng.chance(0.5) ? rng.int(10, 99) : rng.int(100, 9999))
/** 要个位是某几个数字之一的 2–4 位数 */
function endingIn(rng: RNG, digits: readonly number[]): number {
  const head = rng.chance(0.4) ? rng.int(1, 9) : rng.chance(0.6) ? rng.int(10, 99) : rng.int(100, 999)
  return head * 10 + rng.pick(digits)
}

/** 百数表的一半（0–49 或 50–99）：课本的表是 0–99，练习页一屏放不下整张，就分两半出 */
function halfChart(rng: RNG): { start: number; count: number } {
  return rng.chance(0.6) ? { start: 0, count: 50 } : { start: 50, count: 50 }
}
const range = (start: number, count: number): number[] => Array.from({ length: count }, (_, i) => start + i)
const ONES_05 = L('m5.fac.ones.05')
const ONES_EVEN = L('m5.fac.ones.even')
const ONES_ODD = L('m5.fac.ones.odd')
const ONES_5 = L('m5.fac.ones.only5')
const ONES_0 = L('m5.fac.ones.only0')
/** 例 1：表里圈出 5 的倍数、框出 2 的倍数，看看有什么特征 */
function qChart25(d: Difficulty, rng: RNG): Question {
  const { start, count } = halfChart(rng)
  const ns = range(start, count)
  const fives = ns.filter((n) => n % 5 === 0)
  const twos = ns.filter((n) => n % 2 === 0)
  const form = rng.int(0, 4)
  const chart = (circled: number[], boxed: number[]): StemPart => ({ kind: 'hundred-chart', start, count, circled, boxed })
  if (form === 0) return num(K3, d, rng, `chart-c5-${start}`, [chart(fives, []), T('m5.fac.chart.circledOf')], 5, [2, 10, 0, 1], 99)
  if (form === 1) return num(K3, d, rng, `chart-b2-${start}`, [chart([], twos), T('m5.fac.chart.boxedOf')], 2, [5, 4, 1, 10], 99)
  if (form === 2) return pick(K3, d, rng, `chart-c5ones-${start}`, [chart(fives, []), T('m5.fac.chart.circledOnes')], ONES_05, [ONES_EVEN, ONES_5, ONES_ODD])
  if (form === 3) return pick(K3, d, rng, `chart-b2ones-${start}`, [chart([], twos), T('m5.fac.chart.boxedOnes')], ONES_EVEN, [ONES_05, ONES_ODD, ONES_0])
  // 既画了圈、又画了框：个位是 0
  return pick(K3, d, rng, `chart-both-${start}`, [chart(fives, twos), T('m5.fac.chart.bothOnes')], ONES_0, [ONES_05, ONES_EVEN, ONES_5])
}
/** 做一做：哪个数是 2 的倍数 / 5 的倍数 / 既是 2 的倍数又是 5 的倍数 */
function qWhich25(d: Difficulty, rng: RNG): Question {
  const book = rng.chance(0.5)
  const form = rng.int(0, 2)
  if (form === 2) {
    const good = book ? DOYI_25.filter((n) => n % 10 === 0) : [endingIn(rng, [0])]
    // 干扰项：只是 2 的倍数、只是 5 的倍数、都不是
    const bad = [endingIn(rng, [2, 4, 6, 8]), endingIn(rng, [5]), endingIn(rng, [1, 3, 7, 9]), ...(book ? DOYI_25.filter((n) => n % 10 !== 0) : [])]
    return whichNum(K3, d, rng, 'which25', [T('m5.fac.which25.q')], good, bad)
  }
  const m = form === 0 ? 2 : 5
  const pool = book ? [...DOYI_25, ...STARS] : [anyNum(rng), anyNum(rng), anyNum(rng), anyNum(rng), anyNum(rng), anyNum(rng), anyNum(rng)]
  const good = pool.filter((n) => n % m === 0)
  const bad = pool.filter((n) => n % m !== 0)
  // 随机的数不一定凑得齐：补几个
  if (!good.length) good.push(m === 2 ? endingIn(rng, [0, 2, 4, 6, 8]) : endingIn(rng, [0, 5]))
  while (bad.length < 3) bad.push(m === 2 ? endingIn(rng, [1, 3, 5, 7, 9]) : endingIn(rng, [1, 2, 3, 4, 6, 7, 8, 9]))
  return whichNum(K3, d, rng, `which${m}`, [T('m5.fac.whichM.q', { n: m })], good, bad)
}
/** 奇数还是偶数（练习三 1；0 也是偶数） */
function qOddEven(d: Difficulty, rng: RNG, k = K3): Question {
  const n = rng.chance(0.5) ? rng.pick([...ODD_EVEN_BOOK, ...DOYI_25]) : anyNum(rng)
  const even = n % 2 === 0
  return pick(k, d, rng, `oe-${n}`, [T('m5.fac.oddEven.q', { n })], even ? EVEN : ODD, [even ? ODD : EVEN])
}
/** 例 1 的结论、奇数偶数的定义（判断） */
export const RULES_25: [string, boolean][] = [
  ['m5.fac.r.two', true],
  ['m5.fac.r.five', true],
  ['m5.fac.r.fiveNotTwo', false],
  ['m5.fac.r.twoNotFive', false],
  ['m5.fac.r.zeroBoth', true],
  ['m5.fac.r.zeroEven', true],
  ['m5.fac.r.oddDef', true],
  ['m5.fac.r.evenDef', false],
]
/** 练习三 8(2)(3) */
export const RULES_25_MORE: [string, boolean][] = [
  ['m5.fac.r.oddOnes', true],
  ['m5.fac.r.allInt', true],
  ['m5.fac.r.oddOnesEven', false],
]
function qRule(k: string, d: Difficulty, rng: RNG, rules: [string, boolean][]): Question {
  const [key, truth] = rng.pick(rules)
  return judge(k, d, rng, `rule-${key.split('.').pop()}`, [T(key)], truth)
}
/** 看一个数判断：n 是 2（5）的倍数，对吗？ */
function qIs25(d: Difficulty, rng: RNG): Question {
  const m = rng.chance(0.5) ? 2 : 5
  const n = rng.chance(0.4) ? rng.pick(DOYI_25) : anyNum(rng)
  return judge(K3, d, rng, `is${m}-${n}`, [T('m5.fac.j.multiple', { x: n, y: m })], n % m === 0)
}

// 第 2 档：练习三 2、4、7
/** 数字卡片（练习三 2(2)「3 5 □ 既是 2 的倍数，又是 5 的倍数」）：问号处填几，或者问号处可以填哪个数字 */
function qCard25(d: Difficulty, rng: RNG): Question {
  const a = rng.chance(0.4) ? 3 : rng.int(1, 9)
  const b = rng.chance(0.4) ? 5 : rng.int(0, 9)
  const cards: StemPart = { kind: 'digit-cards', digits: `${a}${b}?` }
  const form = rng.int(0, 3)
  if (form === 0) return num(K3, d, rng, `card25-${a}${b}`, [cards, T('m5.fac.card.q25')], 0, [5, 2, 10], 9)
  if (form === 1) return num(K3, d, rng, `card5odd-${a}${b}`, [cards, T('m5.fac.card.q5odd')], 5, [0, 1, 3], 9)
  const m = form === 2 ? 2 : 5
  const good = m === 2 ? [0, 2, 4, 6, 8] : [0, 5]
  const bad = [1, 2, 3, 4, 6, 7, 8, 9].filter((x) => !good.includes(x))
  return whichNum(K3, d, rng, `cardPick${m}-${a}${b}`, [cards, T(m === 2 ? 'm5.fac.card.pick2' : 'm5.fac.card.pick5')], good, bad)
}
/** 练习三 2(1)：两个数位上的数相同，并且是 5 的倍数（55）；练习三 2(3)：既是 2 的倍数，又是 5 的倍数的最小三位数（100） */
export const EXT_25: [string, number][] = [
  ['m5.fac.ext.min3', 100],
  ['m5.fac.ext.max2', 90],
  ['m5.fac.ext.min2', 10],
  ['m5.fac.ext.max3', 990],
]
function qExt25(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) return num(K3, d, rng, 'same5', [T('m5.fac.same5.q')], 55, [50, 5, 25], 99)
  const [what, v] = rng.pick(EXT_25)
  // 干扰项：差一个 10、差 5（只看了 5 的倍数），都还是两位数 / 三位数
  return num(K3, d, rng, `ext25-${what.split('.').pop()}`, [T('m5.fac.ext.q', { a: 2, b: 5, what: L(what) })], v, [v + 10, v - 10, v + 5, v - 5], 9999, 10)
}
/** 练习三 7：马蹄莲 10 元一枝、郁金香 5 元一枝，一共要付的钱一定是 5 的倍数（87 元不对） */
function qFlowers(d: Difficulty, rng: RNG): Question {
  const data = T('m5.fac.flower.data')
  const wrongTotal = (): number => {
    for (;;) {
      const m = rng.int(30, 120)
      if (m % 5 !== 0) return m
    }
  }
  if (rng.chance(0.4)) {
    const m = rng.chance(0.4) ? 87 : wrongTotal()
    return judge(K3, d, rng, `flower-${m}`, [data, T('m5.fac.flower.judge', { m })], false)
  }
  const right = 5 * rng.int(4, 24)
  const wrongs = new Set<number>([rng.chance(0.5) ? 87 : wrongTotal()])
  while (wrongs.size < 3) wrongs.add(wrongTotal())
  const yuan = (m: number): LStr => L('m5.fac.yuan', { m })
  return pick(K3, d, rng, `flowerPick-${right}-${[...wrongs].sort((x, y) => x - y).join('.')}`, [data, T('m5.fac.flower.pick')], yuan(right), [...wrongs].map(yuan))
}
/** 练习三 4（女孩：你能说出 3 个是 5 的倍数的奇数吗）：哪个数是 5 的倍数，又是奇数 */
function qFiveOdd(d: Difficulty, rng: RNG): Question {
  const good = [endingIn(rng, [5]), endingIn(rng, [5])]
  const bad = [endingIn(rng, [0]), endingIn(rng, [1, 3, 7, 9]), endingIn(rng, [2, 4, 6, 8]), endingIn(rng, [0])]
  return whichNum(K3, d, rng, 'fiveOdd', [T('m5.fac.fiveOdd.q')], good, bad)
}

function twoFive(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1：表里圈 5 的倍数、框 2 的倍数；做一做；奇数偶数；结论与定义
    if (roll < 0.22) return qChart25(d, rng)
    if (roll < 0.44) return qWhich25(d, rng)
    if (roll < 0.62) return qOddEven(d, rng)
    if (roll < 0.8) return qIs25(d, rng)
    return qRule(K3, d, rng, RULES_25)
  }
  if (d === 2) {
    if (roll < 0.25) return qCard25(d, rng)
    if (roll < 0.45) return qExt25(d, rng)
    if (roll < 0.65) return qFlowers(d, rng)
    if (roll < 0.82) return qFiveOdd(d, rng)
    return qRule(K3, d, rng, RULES_25_MORE)
  }
  if (roll < 0.5) return qFlowers(d, rng)
  return qExt25(d, rng)
}
defineGenerator(K3, twoFive)

// ═════════════════════════════════════════════════════════════
// 4. 3 的倍数的特征（例 2、做一做；练习三 3、5、8(1)、9–12）
// ═════════════════════════════════════════════════════════════

const K4 = 'm5s2-02-three'
/** 练习三 3 的数 */
export const EX3_BOOK = [92, 75, 36, 206, 65, 3051, 779, 99999, 111, 49, 165, 5988, 655, 131, 2222, 7203]
/** 做一做：数字卡片摆出的数 */
export const CARDS_BOOK = [24, 58, 47, 96]

function threeNum(rng: RNG): number {
  return rng.chance(0.5) ? rng.pick([...EX3_BOOK, ...CARDS_BOOK]) : anyNum(rng)
}
/** 各位上的数的和 */
function qDigitSum(d: Difficulty, rng: RNG): Question {
  const n = threeNum(rng)
  const s = digitSum(n)
  return num(K4, d, rng, `dsum-${n}`, [T('m5.fac.dsum.q', { n })], s, [s + 1, s - 1, s + 10, n % 10], 99)
}
function qIsThree(d: Difficulty, rng: RNG): Question {
  const n = threeNum(rng)
  return judge(K4, d, rng, `is3-${n}`, [T('m5.fac.j.multiple', { x: n, y: 3 })], n % 3 === 0)
}
/** 哪个数是 3 的倍数：干扰项多用个位是 3、6、9 却不是 3 的倍数的数（常错：只看个位） */
function qWhich3(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) {
    // 做一做：数字卡片摆出的 24、58、47、96 里挑（每次只放一个对的）
    const good = rng.pick([24, 96])
    return pick(K4, d, rng, `which3card-${good}`, [T('m5.fac.whichM.q', { n: 3 })], String(good), ['58', '47', String(rng.pick([13, 26, 49, 16, 29]))])
  }
  const good = [...EX3_BOOK.filter((n) => n % 3 === 0), rng.int(4, 333) * 3]
  const bad = [...EX3_BOOK.filter((n) => n % 3 !== 0), ...[13, 16, 19, 23, 26, 29, 43, 46, 49, 53, 76, 89, 103, 106, 109]]
  return whichNum(K4, d, rng, 'which3', [T('m5.fac.whichM.q', { n: 3 })], good, bad)
}
/** 做一做后半：在 24 后面加一张数字卡片，使这个三位数是 3 的倍数（选项里只有一张行） */
function qAddCard(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.5) ? rng.pick(CARDS_BOOK) : rng.int(10, 99)
  const ok = Array.from({ length: 10 }, (_, i) => i).filter((x) => (digitSum(n) + x) % 3 === 0)
  const no = Array.from({ length: 10 }, (_, i) => i).filter((x) => !ok.includes(x))
  return whichNum(K4, d, rng, `addCard-${n}`, [{ kind: 'digit-cards', digits: `${n}?` }, T('m5.fac.addCard.q', { n })], ok, no)
}
/** 例 2：表里圈出 3 的倍数（个位可以是 0～9 中任何一个数） */
function qChart3(d: Difficulty, rng: RNG): Question {
  const { start, count } = halfChart(rng)
  const threes = range(start, count).filter((n) => n % 3 === 0)
  const chart: StemPart = { kind: 'hundred-chart', start, count, circled: threes }
  const form = rng.int(0, 2)
  if (form === 0) return num(K4, d, rng, `chart3-${start}`, [chart, T('m5.fac.chart.circledOf')], 3, [6, 9, 2, 5], 99)
  if (form === 1) return judge(K4, d, rng, `chart3only-${start}`, [chart, T('m5.fac.chart.only369')], false)
  return judge(K4, d, rng, `chart3any-${start}`, [chart, T('m5.fac.chart.any09')], true)
}
export const RULES_3: [string, boolean][] = [
  ['m5.fac.r.three', true],
  ['m5.fac.r.threeOnly', false],
]

// 第 2 档：练习三 5、8(1)、9、10、12、4
/** 练习三 5 的五个数（「?」是要填的那一位）与填法的种数 */
export const WAYS_BOOK: [string, number][] = [
  ['?7', 3],
  ['4?2', 4],
  ['?44', 3],
  ['65?', 3],
  ['12?1', 3],
]
/** 在「?」处填一个数字，使这个数是 3 的倍数：有几种填法（打头的一位不能填 0） */
export function waysOf(pattern: string): number {
  let count = 0
  for (let x = 0; x <= 9; x++) {
    if (x === 0 && pattern.startsWith('?')) continue
    if (digitSum(Number(pattern.replace('?', String(x)))) % 3 === 0) count++
  }
  return count
}
function qWays(d: Difficulty, rng: RNG): Question {
  let pattern = rng.pick(WAYS_BOOK)[0]
  if (rng.chance(0.55)) {
    const len = rng.int(2, 4)
    const digits = Array.from({ length: len }, (_, i) => String(i === 0 ? rng.int(1, 9) : rng.int(0, 9)))
    digits[rng.int(0, len - 1)] = '?'
    pattern = digits.join('')
  }
  const w = waysOf(pattern)
  return num(K4, d, rng, `ways-${pattern}`, [{ kind: 'digit-cards', digits: pattern }, T('m5.fac.ways.q')], w, [w + 1, w - 1, 10, 3], 10)
}
/** 练习三 9：22 名学生，至少再来几名就可以正好 3 人一组 */
function qTeams(d: Difficulty, rng: RNG): Question {
  let n = 22
  if (rng.chance(0.6)) {
    do n = rng.int(10, 60)
    while (n % 3 === 0)
  }
  const v = 3 - (n % 3)
  return num(K4, d, rng, `teams-${n}`, [T('m5.fac.teams.q', { n })], v, [n % 3, 3, 0, 1, 2], 9)
}
/** 练习三 10：从 4、3、0、5 四张卡片里取三张组成三位数 */
export const FOUR_CARDS = [4, 3, 0, 5]
export function threeDigitNumbers(cards: number[]): number[] {
  const out: number[] = []
  for (const a of cards) for (const b of cards) for (const c of cards) {
    if (a === 0) continue
    const used = [a, b, c]
    if (cards.every((x) => used.filter((y) => y === x).length <= cards.filter((y) => y === x).length)) out.push(100 * a + 10 * b + c)
  }
  return [...new Set(out)]
}
function qFourCards(d: Difficulty, rng: RNG): Question {
  const all = threeDigitNumbers(FOUR_CARDS)
  const six = rng.chance(0.4)
  const good = all.filter((n) => n % 3 === 0 && (!six || n % 2 === 0))
  const bad = six ? all.filter((n) => n % 3 === 0 && n % 2 === 1).concat(all.filter((n) => n % 3 !== 0 && n % 2 === 0)) : all.filter((n) => n % 3 !== 0)
  return whichNum(K4, d, rng, `four${six ? 6 : 3}`, [{ kind: 'digit-cards', digits: FOUR_CARDS.join('') }, T(six ? 'm5.fac.four.q6' : 'm5.fac.four.q3')], good, bad)
}
/** 练习三 12：既是 2 和 5 的倍数，又是 3 的倍数的最小两位数（30）；既是 2 的倍数，又是 3 的倍数的最小三位数（102）、最大三位数（996） */
export const EXT_3: { k: string; ms: number[]; what: string; v: number }[] = [
  { k: 'three', ms: [2, 5, 3], what: 'm5.fac.ext.min2', v: 30 },
  { k: 'three', ms: [2, 5, 3], what: 'm5.fac.ext.max2', v: 90 },
  { k: 'three', ms: [2, 5, 3], what: 'm5.fac.ext.min3', v: 120 },
  { k: 'two', ms: [2, 3], what: 'm5.fac.ext.min3', v: 102 },
  { k: 'two', ms: [2, 3], what: 'm5.fac.ext.max3', v: 996 },
  { k: 'two', ms: [2, 3], what: 'm5.fac.ext.min2', v: 12 },
  { k: 'two', ms: [2, 3], what: 'm5.fac.ext.max2', v: 96 },
  { k: 'two', ms: [3, 5], what: 'm5.fac.ext.min2', v: 15 },
  { k: 'two', ms: [3, 5], what: 'm5.fac.ext.min3', v: 105 },
  { k: 'two', ms: [3, 5], what: 'm5.fac.ext.max3', v: 990 },
]
function qExt3(d: Difficulty, rng: RNG): Question {
  // 课本的三问（30、102、996）多出一些
  const e = rng.chance(0.4) ? rng.pick(EXT_3.filter((x) => x.v === 30 || x.v === 102 || x.v === 996)) : rng.pick(EXT_3)
  const what = L(e.what)
  const stem = e.ms.length === 3 ? T('m5.fac.ext.q3', { a: e.ms[0]!, b: e.ms[1]!, c: e.ms[2]!, what }) : T('m5.fac.ext.q', { a: e.ms[0]!, b: e.ms[1]!, what })
  // 这几个数两两没有公因数，同时是它们的倍数 = 是它们的积的倍数；干扰项：差一个积、差 2、差 3
  const step = e.ms.reduce((x, y) => x * y, 1)
  return num(K4, d, rng, `ext3-${e.ms.join('')}-${e.what.split('.').pop()}`, [stem], e.v, [e.v + 2, e.v - 2, e.v + step, e.v - step, e.v + 3], 9999)
}
/** 练习三 4（男孩：你能说出 3 个是 3 的倍数的偶数吗） */
function qEvenThree(d: Difficulty, rng: RNG): Question {
  const good = [6 * rng.int(2, 160), 6 * rng.int(2, 160)]
  // 干扰项：是 3 的倍数的奇数、不是 3 的倍数的偶数
  const bad = [3 * (2 * rng.int(1, 150) + 1), 3 * (2 * rng.int(1, 150) + 1), 2 * (3 * rng.int(1, 150) + 1), 2 * (3 * rng.int(1, 150) + 2)]
  return whichNum(K4, d, rng, 'evenThree', [T('m5.fac.evenThree.q')], good, bad)
}
/** 第 3 档：练习三 11（1–50 的表圈出 4 的倍数：4 的倍数都是 2 的倍数吗） */
function qFour(d: Difficulty, rng: RNG): Question {
  const fours = range(1, 50).filter((n) => n % 4 === 0)
  const chart: StemPart = { kind: 'hundred-chart', start: 1, count: 50, circled: fours }
  return rng.chance(0.5) ? judge(K4, d, rng, 'four2', [chart, T('m5.fac.r.four2')], true) : judge(K4, d, rng, 'two4', [chart, T('m5.fac.r.two4')], false)
}

function three(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2：表里圈 3 的倍数、各位上的数的和、结论；做一做：数字卡片摆的数、后面加一张卡片
    if (roll < 0.18) return qChart3(d, rng)
    if (roll < 0.38) return qDigitSum(d, rng)
    if (roll < 0.55) return qIsThree(d, rng)
    if (roll < 0.72) return qWhich3(d, rng)
    if (roll < 0.9) return qAddCard(d, rng)
    return qRule(K4, d, rng, [RULES_3[0]!])
  }
  if (d === 2) {
    if (roll < 0.2) return qWays(d, rng)
    if (roll < 0.32) return qRule(K4, d, rng, RULES_3)
    if (roll < 0.47) return qTeams(d, rng)
    if (roll < 0.62) return qFourCards(d, rng)
    if (roll < 0.84) return qExt3(d, rng)
    return qEvenThree(d, rng)
  }
  if (roll < 0.5) return qFour(d, rng)
  return qWays(d, rng)
}
defineGenerator(K4, three)

// ═════════════════════════════════════════════════════════════
// 5. 质数和合数（1～20 各数的因数表、定义、例 1 质数表；练习四 1–3、6）
// ═════════════════════════════════════════════════════════════

const K5 = 'm5s2-02-prime'
/** 课本定义后举的例子与练习四 2 的数 */
export const PRIME_BOOK = [2, 3, 5, 7, 4, 6, 15, 49, 27, 37, 41, 58, 61, 73, 83, 95, 11, 14, 33, 47, 57, 62, 87, 99]
/** 是奇数的合数（「所有的奇数都是质数」的反例，挑质数时的干扰项） */
export const ODD_COMPOSITES = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93, 95, 99]
const PRIMES_100 = range(2, 99).filter(isPrime)

function qPrimeOrComposite(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.15) ? 1 : rng.chance(0.5) ? rng.pick(PRIME_BOOK) : rng.int(2, rng.chance(0.5) ? 20 : 100)
  const right = n === 1 ? NEITHER : isPrime(n) ? PRIME : COMPOSITE
  return pick(K5, d, rng, `pc-${n}`, [T('m5.fac.pc.q', { n })], right, [PRIME, COMPOSITE, NEITHER].filter((x) => x !== right))
}
function qWhichPrime(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) return whichNum(K5, d, rng, 'whichP', [T('m5.fac.whichP.q')], PRIMES_100, ODD_COMPOSITES)
  return whichNum(K5, d, rng, 'whichC', [T('m5.fac.whichC.q')], [...ODD_COMPOSITES, 4, 6, 8, 10, 12, 14, 16, 18], [...PRIMES_100.slice(0, 15), 1])
}
/** 例 1：用表找质数——先去掉 1 和 2 的倍数（2 留下），再去掉 3 的倍数……下一步去掉几的倍数 */
export function sieveCrossed(upTo: number, through: number[]): number[] {
  return range(1, upTo).filter((n) => n === 1 || through.some((p) => n !== p && n % p === 0))
}
function qSieveNext(d: Difficulty, rng: RNG): Question {
  const step = rng.int(1, 3)
  const done = [2, 3, 5].slice(0, step)
  const next = [3, 5, 7][step - 1]!
  // 课本的表是 1–100；练习页一屏放不下整张，第 1 档用前一半（1–50）
  const count = 50
  const chart: StemPart = { kind: 'hundred-chart', start: 1, count, crossed: sieveCrossed(count, done) }
  return num(K5, d, rng, `sieve${step}-${count}`, [chart, T(`m5.fac.sieve.next${step}`)], next, [next + 1, next - 1, 9, 10], 99)
}
function qSieveLeft(d: Difficulty, rng: RNG): Question {
  const count = 50
  const chart: StemPart = { kind: 'hundred-chart', start: 1, count, crossed: sieveCrossed(count, [2, 3, 5, 7]) }
  return pick(K5, d, rng, `sieveLeft-${count}`, [chart, T('m5.fac.sieve.left')], PRIME, [COMPOSITE, EVEN])
}
/** 定义：只有 1 和它本身两个因数的数叫质数；除了 1 和它本身还有别的因数的叫合数；1 既不是质数也不是合数 */
function qDefinition(d: Difficulty, rng: RNG): Question {
  const form = rng.int(0, 4)
  if (form === 0) return pick(K5, d, rng, 'defP', [T('m5.fac.def.prime')], PRIME, [COMPOSITE, ODD, EVEN])
  if (form === 1) return pick(K5, d, rng, 'defC', [T('m5.fac.def.composite')], COMPOSITE, [PRIME, ODD, EVEN])
  const [k, truth] = rng.pick<[string, boolean]>([
    ['m5.fac.j.onePrime', false],
    ['m5.fac.j.oneNeither', true],
    ['m5.fac.j.oneComposite', false],
  ])
  return judge(K5, d, rng, `one-${k.split('.').pop()}`, [T(k)], truth)
}
function qSmallest(d: Difficulty, rng: RNG): Question {
  return rng.chance(0.5) ? num(K5, d, rng, 'minPrime', [T('m5.fac.minPrime.q')], 2, [1, 3, 0], 9) : num(K5, d, rng, 'minComposite', [T('m5.fac.minComposite.q')], 4, [1, 2, 6, 9], 9)
}

// 第 2 档：练习四 1、3、6；数一数表里剩下几个质数
export const PRIME_JUDGE: [string, boolean][] = [
  ['m5.fac.p.oddPrime', false],
  ['m5.fac.p.evenComposite', false],
  ['m5.fac.p.rest', false],
  ['m5.fac.p.sumEven', false],
  ['m5.fac.p.twoBoth', true],
  ['m5.fac.p.nineBoth', true],
]
/** 练习四 3：两个质数的和是 10、积是 21（3 和 7）；和是 20、积是 91（7 和 13） */
export const RIDDLE_BOOK: [number, number][] = [
  [3, 7],
  [7, 13],
]
function qRiddle(d: Difficulty, rng: RNG): Question {
  let [p, q] = rng.pick(RIDDLE_BOOK)
  if (rng.chance(0.55)) {
    const ps = [2, 3, 5, 7, 11, 13]
    for (;;) {
      p = rng.pick(ps)
      q = rng.pick(ps)
      if (p < q && p * q <= 100) break
    }
  }
  const big = rng.chance(0.5)
  return num(K5, d, rng, `riddle-${p}-${q}-${big ? 'b' : 's'}`, [T(big ? 'm5.fac.riddle.big' : 'm5.fac.riddle.small', { s: p + q, p: p * q })], big ? q : p, [big ? p : q, p + q, p * q, 1], 99)
}
/** 练习四 6：一人说出大于 2 的偶数，另一人找出和是这个数的两个质数（偶数 10：3 + 7 = 10） */
function qGoldbach(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const n = rng.chance(0.3) ? 10 : 2 * rng.int(3, 25)
    const p = rng.pick(PRIMES_100.filter((x) => x < n && isPrime(n - x)))
    if (n === 10 && p !== 3 && rng.chance(0.5)) continue
    return num(K5, d, rng, `gold-${n}-${p}`, [T('m5.fac.gold.q', { n }), E(`${n} = ${p} + ?`)], n - p, [n - p + 2, n - p - 2, n + p, p], 99)
  }
}
function qCountPrimes(d: Difficulty, rng: RNG): Question {
  // 100 以内的质数（课本的质数表，25 个）放第 3 档：整张表练习页一屏放不下
  const m = d === 3 ? 100 : rng.pick([20, 30, 50])
  const chart: StemPart = { kind: 'hundred-chart', start: 1, count: m, crossed: sieveCrossed(m, [2, 3, 5, 7]) }
  const c = range(1, m).filter(isPrime).length
  return num(K5, d, rng, `countP-${m}`, [chart, T('m5.fac.countP.q', { m })], c, [c + 1, c - 1, c + 2, m / 2], 99)
}

function prime(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 1～20 各数的因数表（有几个因数）、定义、例 1 用表找质数；最小的质数和合数
    if (roll < 0.17) return qCountFactors(d, rng, K5, range(1, 20), 20)
    if (roll < 0.4) return qPrimeOrComposite(d, rng)
    if (roll < 0.58) return qWhichPrime(d, rng)
    if (roll < 0.72) return qSieveNext(d, rng)
    if (roll < 0.78) return qSieveLeft(d, rng)
    if (roll < 0.92) return qDefinition(d, rng)
    return qSmallest(d, rng)
  }
  if (d === 2) {
    if (roll < 0.3) return qPrimeJudge(d, rng)
    if (roll < 0.5) return qRiddle(d, rng)
    if (roll < 0.7) return qGoldbach(d, rng)
    if (roll < 0.85) return qCountPrimes(d, rng)
    return qPrimeOrComposite(d, rng)
  }
  if (roll < 0.35) return num(K5, d, rng, 'stopAt', [T('m5.fac.stop.q')], 7, [10, 9, 5, 11], 99)
  if (roll < 0.6) return qCountPrimes(d, rng)
  return qRiddle(d, rng)
}
function qPrimeJudge(d: Difficulty, rng: RNG): Question {
  const [k, truth] = rng.pick(PRIME_JUDGE)
  return judge(K5, d, rng, `pj-${k.split('.').pop()}`, [T(k)], truth)
}
defineGenerator(K5, prime)

// ═════════════════════════════════════════════════════════════
// 6. 和的奇偶性（质数和合数小节的例 2；练习四 4、5）
// ═════════════════════════════════════════════════════════════

const K6 = 'm5s2-02-parity'
/** 例 2 女孩试的几个算式，回顾与反思的 319 + 534 */
export const PARITY_BOOK: [number, number][] = [
  [5, 8],
  [7, 8],
  [5, 7],
  [7, 9],
  [8, 12],
  [12, 24],
  [319, 534],
]
const kindOf = (n: number): LStr => (n % 2 === 0 ? EVEN : ODD)
/** 奇数 + 偶数、奇数 + 奇数、偶数 + 偶数（例 2 的三问，加上偶数 + 奇数） */
function qRuleSum(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.pick<[number, number]>([[1, 0], [0, 1], [1, 1], [0, 0]])
  return pick(K6, d, rng, `ruleSum-${x}${y}`, [T('m5.fac.par.rule', { x: x ? ODD : EVEN, y: y ? ODD : EVEN })], (x + y) % 2 ? ODD : EVEN, [(x + y) % 2 ? EVEN : ODD])
}
function qNumSum(d: Difficulty, rng: RNG, k3 = false): Question {
  let [a, b] = rng.pick(PARITY_BOOK)
  if (rng.chance(0.6)) {
    a = rng.chance(0.5) ? rng.int(11, 99) : rng.int(100, 999)
    b = rng.chance(0.5) ? rng.int(11, 99) : rng.int(100, 999)
  }
  if (k3) {
    const c = rng.int(11, 99)
    return pick(K6, d, rng, `sum3-${a}-${b}-${c}`, [T('m5.fac.par.three', { a, b, c })], kindOf(a + b + c), [kindOf(a + b + c + 1)])
  }
  return pick(K6, d, rng, `numSum-${a}-${b}`, [T('m5.fac.par.nums', { a, b })], kindOf(a + b), [kindOf(a + b + 1)])
}
/** 用小方块摆一摆：一堆是几个（两个一列摆成两排，单出来的在右下角），或两堆合起来 */
function qTiles(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) {
    const n = rng.int(1, 11)
    return pick(K6, d, rng, `tiles1-${n}`, [{ kind: 'pair-tiles', groups: [n] }, T('m5.fac.par.tiles1')], kindOf(n), [kindOf(n + 1)])
  }
  const a = rng.int(1, 9)
  const b = rng.int(2, 8)
  return pick(K6, d, rng, `tiles2-${a}-${b}`, [{ kind: 'pair-tiles', groups: [a, b] }, T('m5.fac.par.tiles2')], kindOf(a + b), [kindOf(a + b + 1)])
}
/** 练习四 4：积的奇偶 */
function qProduct(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [x, y] = rng.pick<[number, number]>([[1, 1], [1, 0], [0, 1], [0, 0]])
    return pick(K6, d, rng, `ruleProd-${x}${y}`, [T('m5.fac.par.prodRule', { x: x ? ODD : EVEN, y: y ? ODD : EVEN })], x && y ? ODD : EVEN, [x && y ? EVEN : ODD])
  }
  const a = rng.int(11, 99)
  const b = rng.int(3, 49)
  return pick(K6, d, rng, `prod-${a}-${b}`, [T('m5.fac.par.prodNums', { a, b })], kindOf(a * b), [kindOf(a * b + 1)])
}
/** 练习四 5：30 名学生分成甲、乙两队，甲队的人数是奇数，乙队的人数是奇数还是偶数 */
function qTeamsParity(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.4) ? 30 : rng.int(15, 45)
  const x = rng.int(0, 1)
  const y = (n - x) % 2
  return pick(K6, d, rng, `teams-${n}-${x}`, [T('m5.fac.par.teams', { n, x: x ? ODD : EVEN })], y ? ODD : EVEN, [y ? EVEN : ODD])
}

function parity(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2：三种和的奇偶、举例的算式、小方块摆一摆、回顾与反思的大数
    if (roll < 0.3) return qRuleSum(d, rng)
    if (roll < 0.65) return qNumSum(d, rng)
    return qTiles(d, rng)
  }
  if (d === 2) {
    if (roll < 0.5) return qProduct(d, rng)
    if (roll < 0.85) return qTeamsParity(d, rng)
    return qNumSum(d, rng)
  }
  if (roll < 0.5) return qNumSum(d, rng, true)
  return qTeamsParity(d, rng)
}
defineGenerator(K6, parity)
