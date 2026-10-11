import type { Difficulty, InputMode, LStr, PatternFig, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 用字母表示数和数量关系（五上第五单元，课本 p55–71，2022 版课标新教材）：例 1 年龄（加减关系）、例 2 地球和月球上能举起的质量
// （乘除关系、省略乘号的写法）、例 3 (1)–(3) 运算律和公式、例 3 (4) 等式的基本性质、例 4 拼桌子（ax+b）、例 5 行程（ax+bx），
// 练习十一、十二、十三与 *探秘百数表。课本没印小节标题，六个知识点的名字照平台同步课的章节名。
// 写法照课本：字母小写（周长 C、面积 S、华氏 F 大写）；数和字母、字母和字母相乘省略乘号（6m、ab、a²），运算律、等式的基本性质、
// 代入求值时照写「×」；练习十一 8 的「·」照课本显示（朗读读「乘」）。运算符前后空一格（「a + 25」，朗读才读「加」）。
// 这一册没有「方程」：等式的基本性质只用来「求等式中的未知数」，题目里不写「方程」「解方程」「解：」。
// 选项里不放单独一个小写字母（朗读会读成拼音字母）：要选一个字母的题，选项写成整个等式（b × 1 = b）。
// 朗读避坑：「长」只在「长度」「长方形」里；课本的「增长」「隧道长 s m」「水路长」「投中」「多得」「倒出」「还剩」「第 1 行」
// 改写成「增加」「隧道的长度」「水路全程」「投进」「多拿」「装满」「剩下」「第一排」；题干单位写汉字（厘米、千克、千米）。
// ─────────────────────────────────────────────────────────────

export const ADDSUB = 'm5s1-05-addsub'
export const MULDIV = 'm5s1-05-muldiv'
export const LAWS = 'm5s1-05-laws'
export const EQUALITY = 'm5s1-05-equality'
export const AXB = 'm5s1-05-axb'
export const AXBX = 'm5s1-05-axbx'

type Params = Record<string, LStr | number>
const text = (k: string, p?: Params): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const expr = (e: string): StemPart => ({ kind: 'expr', expr: e })
const key = (k: string, p?: Params): LStr => (p ? { k, p } : { k })

/** 数值题：键盘或选项（input 不填就随机）；smart 是照常见错法给的干扰数 */
function numQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[] = [], input?: InputMode): Question {
  return numberQuestion({
    kpId,
    type: 'algebra',
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

/** 选项题：干扰项去掉重复的、和正确项一样的，最多留 n 个 */
function pickQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[], rng: RNG, n = 3, type: 'algebra' | 'law' = 'algebra'): Question {
  const k = (l: LStr): string => (typeof l === 'string' ? l : JSON.stringify(l))
  const seen = new Set([k(correct)])
  const ds: LStr[] = []
  for (const x of distractors) {
    if (seen.has(k(x)) || ds.length >= n) continue
    seen.add(k(x))
    ds.push(x)
  }
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: ds, rng })
}

const RIGHT: LStr = { k: 'm5.let.right' }
const WRONG: LStr = { k: 'm5.let.wrong' }
/** 判断题「……，对吗？」配 对 / 不对 */
function judgeQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], ok: boolean, rng: RNG): Question {
  return pickQ(kpId, d, sig, stem, ok ? RIGHT : WRONG, [ok ? WRONG : RIGHT], rng)
}

/** 系数和字母连写，1 省略不写（课本：1 与字母相乘时，1 通常省略不写） */
const term = (c: number, x: string): string => (c === 1 ? x : `${c}${x}`)
/** 小数写法（去掉浮点尾巴） */
const dec = (v: number): string => String(Math.round(v * 1000) / 1000)
/** 第几（汉字写序数，朗读不读「第 6」） */
const ord = (n: number): LStr => key(`m5.let.ord.${n}`)
/** 「当 x = u 时，y 等于多少？」 */
const when1 = (x: string, u: number, y: string): StemPart => text('m5.let.when1', { x, u, y })
/** 「当 x = u，y = v 时，z 等于多少？」 */
const when2 = (x: string, u: number, y: string, v: number, z: string): StemPart => text('m5.let.when2', { x, u, y, v, z })

// ═════════════════════════════════════════════════════════════
// 用字母表示加减关系（例 1 + 试一试 + 做一做，p55–56；练习十一 1–3、5、6，练习十三 1、3）
// 第 1 档：例 1 用含有字母的式子表示爸爸的年龄（a + 25）、两人年龄的关系（b = a + 25）、试一试的求值（a = 11 → 36，b = 57 → 32）、
//          想一想「a 可以是 200 吗」；做一做 1 小华多卖 4 件（m + 4）、两人一共 16 件（16 - m）；做一做 2 线段图（500 + a、a + b、a - 500）；
//          练习里简单的几题（存钱罐、下车、气温、班级人数）。
// 第 2 档：练习十一 1（标准体重 a - 105）、2、3（48 + m、n = 48 + m、求值）、5（20 + a、20 - a 表示什么）、6（身高增加、早晚身高），
//          练习十三 1、3 (1)（a + b 的值，小数做选项）。
// 第 3 档：连着两次比较（小林比小华少卖）、字母的取值合不合实际、求值。
// ═════════════════════════════════════════════════════════════

/** 爸爸比小红大几岁（课本 25） */
const AGE_GAP = [24, 25, 26, 27, 28, 30]
const ageGap = (rng: RNG): number => (rng.chance(0.4) ? 25 : rng.pick(AGE_GAP))

/** 例 1：用含有字母的式子表示爸爸（或小红）现在的年龄 */
function ageExprQ(d: Difficulty, rng: RNG): Question {
  const k = ageGap(rng)
  if (rng.chance(0.7)) return pickQ(ADDSUB, d, `age-${k}`, [text('m5.let.as.age', { k })], `a + ${k}`, [`a - ${k}`, `${k} - a`, `${k}a`], rng)
  return pickQ(ADDSUB, d, `ageRev-${k}`, [text('m5.let.as.ageRev', { k })], `b - ${k}`, [`b + ${k}`, `${k} - b`, `${k}b`], rng)
}

/** 例 1：用 a、b 表示两人的年龄，它们的关系（b = a + 25） */
function ageRelQ(d: Difficulty, rng: RNG): Question {
  const k = ageGap(rng)
  return pickQ(ADDSUB, d, `ageRel-${k}`, [text('m5.let.as.ageRel', { k })], `b = a + ${k}`, [`a = b + ${k}`, `b = a - ${k}`, `b = ${k}a`], rng)
}

/** 试一试：b = a + 25，已知 a 求 b（b = a + 25 = 11 + 25 = 36）、已知 b 求 a（a = b - 25 = 57 - 25 = 32） */
function ageValQ(d: Difficulty, rng: RNG): Question {
  const k = ageGap(rng)
  const chain = rng.chance(0.5)
  if (rng.chance(0.5)) {
    const a = rng.chance(0.3) && k === 25 ? 11 : rng.int(5, 15)
    const stem = chain ? [when1('a', a, 'b'), expr(`b = a + ${k} = ${a} + ${k} = ?`)] : [expr(`b = a + ${k}`), when1('a', a, 'b')]
    return numQ(ADDSUB, d, `ageB-${k}-${a}-${chain ? 1 : 0}`, stem, a + k, rng, [a, a + k + 10, a + k - 1], chain ? 'numpad' : undefined)
  }
  const b = rng.chance(0.3) && k === 25 ? 57 : rng.int(k + 5, k + 25)
  const stem = chain ? [when1('b', b, 'a'), expr(`a = b - ${k} = ${b} - ${k} = ?`)] : [expr(`b = a + ${k}`), when1('b', b, 'a')]
  return numQ(ADDSUB, d, `ageA-${k}-${b}-${chain ? 1 : 0}`, stem, b - k, rng, [b + k, b - k + 10, b - k - 1], chain ? 'numpad' : undefined)
}

/** 想一想：a 表示小红的年龄，a 可以是 200 吗？ */
function ageCanQ(d: Difficulty, rng: RNG): Question {
  const ok = rng.chance(0.4)
  const v = ok ? rng.pick([6, 8, 10, 11, 12]) : rng.pick([120, 150, 200])
  return judgeQ(ADDSUB, d, `can-${v}`, [text('m5.let.as.can', { v })], ok, rng)
}

/** 做一做 1：爱心义卖（小华比小明多卖 4 件 → m + 4；小林和小明一共 16 件 → 16 - m；少卖几件 → m - k） */
function saleQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 2)
  if (kind === 0) {
    const k = rng.int(3, 9)
    return pickQ(ADDSUB, d, `saleMore-${k}`, [text('m5.let.as.saleMore', { k })], `m + ${k}`, [`m - ${k}`, `${k}m`, `${k} - m`], rng)
  }
  if (kind === 1) {
    const t = rng.int(12, 20)
    return pickQ(ADDSUB, d, `saleTotal-${t}`, [text('m5.let.as.saleTotal', { t })], `${t} - m`, [`m - ${t}`, `${t} + m`, `${t}m`], rng)
  }
  const k = rng.int(2, 6)
  return pickQ(ADDSUB, d, `saleLess-${k}`, [text('m5.let.as.saleLess', { k })], `m - ${k}`, [`m + ${k}`, `${k} - m`, `${k}m`], rng)
}

/** 做一做 2 的线段图：超市—兰兰家（500 米）—学校（a 米）—书店（b 米） */
const PLACES: LStr[] = ['market', 'home', 'school', 'store'].map((p) => key(`m5.let.place.${p}`))
function lineQ(d: Difficulty, rng: RNG): Question {
  const p = rng.pick([300, 400, 500, 600, 800])
  const ask = rng.int(0, 2)
  const line: StemPart = { kind: 'part-line', parts: [{ len: 5, label: String(p) }, { len: 9, label: 'a' }, { len: 4, label: 'b' }], names: PLACES }
  const stem: StemPart[] = [text('m5.let.as.lineSee'), line]
  if (ask === 0) return pickQ(ADDSUB, d, `line0-${p}`, [...stem, text('m5.let.as.lineToSchool')], `${p} + a`, [`${p}a`, `a - ${p}`, `${p} + a + b`], rng)
  if (ask === 1) return pickQ(ADDSUB, d, `line1-${p}`, [...stem, text('m5.let.as.lineHomeStore')], 'a + b', ['ab', 'a - b', `${p} + a + b`], rng)
  return pickQ(ADDSUB, d, `line2-${p}`, [...stem, text('m5.let.as.lineMore')], `a - ${p}`, [`${p} - a`, `a + ${p}`, `a + b - ${p}`], rng)
}

/** 练习十一 3 昨天卖出的足球（课本 48）：从小池子里取，每个数都是几条朗读片段 */
const BALL_Y = [45, 48, 50, 52, 56]

/** 练习十一 1–3、6 与练习十三 1 里加减的那几题（easy = 第 1 档只出简单的四种） */
function addSubPracticeQ(d: Difficulty, rng: RNG, easy = false): Question {
  const kind = easy ? rng.int(0, 3) : rng.int(0, 8)
  if (kind === 0) {
    const k = rng.int(2, 9)
    return pickQ(ADDSUB, d, `bank-${k}`, [text('m5.let.as.bank', { k })], `n + ${k}`, [`n - ${k}`, `${k}n`, `${k} - n`], rng)
  }
  if (kind === 1) {
    const k = rng.int(3, 9)
    return pickQ(ADDSUB, d, `bus-${k}`, [text('m5.let.as.bus', { k })], `a - ${k}`, [`a + ${k}`, `${k} - a`, `${k}a`], rng)
  }
  if (kind === 2) {
    const k = rng.int(3, 10)
    return pickQ(ADDSUB, d, `temp-${k}`, [text('m5.let.as.temp', { k })], `a + ${k}`, [`a - ${k}`, `${k}a`, `${k} - a`], rng)
  }
  if (kind === 3) {
    const t = rng.int(30, 45)
    return pickQ(ADDSUB, d, `class-${t}`, [text('m5.let.as.cls', { t })], `${t} - b`, [`b - ${t}`, `${t} + b`, `${t}b`], rng)
  }
  if (kind === 4) return pickQ(ADDSUB, d, 'weight', [text('m5.let.as.weight')], 'a - 105', ['105 - a', 'a + 105', '105a'], rng)
  if (kind === 5) return pickQ(ADDSUB, d, 'height', [text('m5.let.as.height')], 'a + 3', ['a - 3', '3a', '3 - a'], rng)
  if (kind === 6) return pickQ(ADDSUB, d, 'night', [text('m5.let.as.night')], 'd - 2', ['d + 2', '2d', '2 - d'], rng)
  const y = rng.chance(0.4) ? 48 : rng.pick(BALL_Y)
  if (kind === 7) return pickQ(ADDSUB, d, `ball-${y}`, [text('m5.let.as.ball', { y })], `${y} + m`, [`${y} - m`, `${y}m`, `m - ${y}`], rng)
  return pickQ(ADDSUB, d, `ballRel-${y}`, [text('m5.let.as.ballRel', { y })], `n = ${y} + m`, [`m = ${y} + n`, `n = ${y} - m`, `n = ${y}m`], rng)
}

/** 练习十一 3：n = 48 + m，m = 10 时求 n、n = 62 时求 m */
function ballValQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const y = rng.chance(0.4) ? 48 : rng.pick(BALL_Y)
  if (rng.chance(0.5)) {
    const m = rng.int(5, 20)
    return numQ(kpId, d, `ballN-${y}-${m}`, [text('m5.let.as.ballCtx', { y }), expr(`n = ${y} + m`), when1('m', m, 'n')], y + m, rng, [y - m, y + m + 10])
  }
  const n = y + rng.int(5, 20)
  return numQ(kpId, d, `ballM-${y}-${n}`, [text('m5.let.as.ballCtx', { y }), expr(`n = ${y} + m`), when1('n', n, 'm')], n - y, rng, [n + y, n - y + 10])
}

/** 练习十一 5：下面哪句话里的数量可以用 20 + a（20 - a、20 ÷ a、20a）表示 */
type MeanKind = 'add' | 'sub' | 'div' | 'mul'
function meanQ(kpId: string, d: Difficulty, rng: RNG, kinds: MeanKind[]): Question {
  const n = rng.pick([20, 30, 40])
  const kind = rng.pick(kinds)
  const e = kind === 'add' ? `${n} + a` : kind === 'sub' ? `${n} - a` : kind === 'div' ? `${n} ÷ a` : `${n}a`
  const others = rng.shuffle((['add', 'sub', 'div', 'mul'] as const).filter((x) => x !== kind)).slice(0, 2)
  return pickQ(kpId, d, `mean-${kind}-${n}`, [text('m5.let.mean.q', { e })], key(`m5.let.mean.${kind}`, { n }), others.map((w) => key(`m5.let.mean.${w}`, { n })), rng)
}

/** 练习十三 3 (1)：当 a = 2.8，b = 6.3 时，求 a + b 的值（小数做选项：没进位、多进一、小数点错位） */
const DEC_PAIRS: [number, number][] = [
  [2.8, 6.3],
  [1.5, 2.7],
  [3.6, 4.5],
  [0.8, 2.4],
  [5.2, 1.9],
]
function decSumQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(DEC_PAIRS)
  const s = Math.round((a + b) * 10) / 10
  return pickQ(ADDSUB, d, `decsum-${a}-${b}`, [text('m5.let.findVal2', { x: 'a', u: a, y: 'b', v: b, e: 'a + b' })], dec(s), [dec(s - 1), dec(s + 1), dec(s * 10)], rng)
}

/** 第 3 档：小华比小明多卖 k 件，小林比小华少卖 j 件，小林卖出几件 */
function chainQ(d: Difficulty, rng: RNG): Question {
  const k = rng.int(4, 9)
  const j = rng.int(1, k - 1)
  return pickQ(ADDSUB, d, `chain-${k}-${j}`, [text('m5.let.as.chain', { k, j })], `m + ${k - j}`, [`m + ${k + j}`, `m - ${k - j}`, `m + ${k}`], rng)
}

defineGenerator(ADDSUB, (d, rng) => {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.15) return ageExprQ(d, rng)
    if (r < 0.25) return ageRelQ(d, rng)
    if (r < 0.42) return ageValQ(d, rng)
    if (r < 0.47) return ageCanQ(d, rng)
    if (r < 0.63) return saleQ(d, rng)
    if (r < 0.82) return lineQ(d, rng)
    return addSubPracticeQ(d, rng, true)
  }
  if (d === 2) {
    if (r < 0.42) return addSubPracticeQ(d, rng)
    if (r < 0.52) return meanQ(ADDSUB, d, rng, ['add', 'sub'])
    if (r < 0.64) return ballValQ(ADDSUB, d, rng)
    if (r < 0.72) return decSumQ(d, rng)
    if (r < 0.84) return lineQ(d, rng)
    if (r < 0.92) return saleQ(d, rng)
    return ageValQ(d, rng)
  }
  if (r < 0.3) return chainQ(d, rng)
  if (r < 0.45) return ageCanQ(d, rng)
  if (r < 0.65) return decSumQ(d, rng)
  if (r < 0.85) return ballValQ(ADDSUB, d, rng)
  return meanQ(ADDSUB, d, rng, ['add', 'sub'])
})

// ═════════════════════════════════════════════════════════════
// 用字母表示乘除关系（例 2 + 试一试 + 做一做，p57–58；例 2、例 3 的两个蓝框：省略乘号的写法；练习十一 2、4、5、6、7 (1)，练习十三 1、3）
// 第 1 档：例 2 在月球上能举起的质量（6m）、关系式（n = 6m）、试一试（m = 15 → 90，n = 210 → 35）；省略乘号的写法
//          （m × 6 = 6m、b × 1 = b、a × b × c = abc、x × x = x²，练习十一 4 的 a × x、x × x、b × 8、b × 1），6m、a²、ab 表示什么，
//          写法的规则对不对；做一做纸条的面积（宽 3 厘米：表里缺的面积、长度 5.6 厘米、长度 x 厘米 → 3x）；金鱼、饺子。
// 第 2 档：练习十一 2（3b、m ÷ 10）、5（20 ÷ a、20a 表示什么）、6（0.18b、c ÷ 80）、7 (1)（c = an、a = c ÷ n、n = c ÷ a），
//          练习十三 1（3c、d ÷ 3）、3（xy、m ÷ n、4x + y、2a、a² 的值）。
// 第 3 档：练习十二 7（x = 8 时 x² 和 4x；x 不是 0 时 x² = 4x 的 x）、a² 和 2a 什么时候相等、求值。
// ═════════════════════════════════════════════════════════════

/** 例 2：地球上能举起 m 千克，月球上是它的 6 倍 */
const MOON_M = [10, 12, 15, 20, 25, 30, 40, 50]
function moonQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  if (kind === 0) return pickQ(MULDIV, d, 'moon', [text('m5.let.md.moon')], '6m', ['m + 6', 'm ÷ 6', '6 ÷ m'], rng)
  if (kind === 1) return pickQ(MULDIV, d, 'moonRel', [text('m5.let.md.moonRel')], 'n = 6m', ['m = 6n', 'n = m + 6', 'n = m ÷ 6'], rng)
  if (kind === 2) {
    const m = rng.chance(0.4) ? 15 : rng.pick(MOON_M)
    return numQ(MULDIV, d, `moonN-${m}`, [when1('m', m, 'n'), expr(`n = 6m = 6 × ${m} = ?`)], 6 * m, rng, [m + 6, 6 * m + 6], 'numpad')
  }
  const m = rng.chance(0.4) ? 35 : rng.int(20, 50)
  return numQ(MULDIV, d, `moonM-${m}`, [when1('n', 6 * m, 'm'), expr(`m = n ÷ 6 = ${6 * m} ÷ 6 = ?`)], m, rng, [m + 6, m * 6], 'numpad')
}

/** 省略乘号的写法：左边是带乘号的式子，right 是课本的写法，wrong 是常见的错写（数字写在后面、1 没省、两个相同字母相乘写成 2x） */
const OMIT: { e: string; right: string; wrong: string[] }[] = [
  { e: 'm × 6', right: '6m', wrong: ['m6', '6 + m'] },
  { e: 'a × x', right: 'ax', wrong: ['a + x', '2ax'] },
  { e: 'x × x', right: 'x²', wrong: ['2x', 'x + x'] },
  { e: 'b × 8', right: '8b', wrong: ['b8', '8 + b'] },
  { e: 'b × 1', right: 'b', wrong: ['1b', 'b + 1'] },
  { e: 'a × b × c', right: 'abc', wrong: ['a + b + c', '3abc'] },
  { e: '4 × a', right: '4a', wrong: ['a4', '4 + a'] },
  { e: 'y × 7', right: '7y', wrong: ['y7', '7 + y'] },
  { e: 'n × n', right: 'n²', wrong: ['2n', 'n + 2'] },
]
/** 选项写成整个等式（「b × 1 = b」），不让单独一个字母当选项 */
function omitQ(d: Difficulty, rng: RNG): Question {
  const it = rng.pick(OMIT)
  return pickQ(MULDIV, d, `omit-${it.e}`, [text('m5.let.md.omit', { e: it.e })], `${it.e} = ${it.right}`, it.wrong.map((w) => `${it.e} = ${w}`), rng)
}

/** 省略了乘号的式子表示哪个算式（6m = 6 × m、a² = a × a、ab = a × b） */
const MEANS: { e: string; right: string; wrong: string[] }[] = [
  { e: '6m', right: '6 × m', wrong: ['6 + m', 'm ÷ 6'] },
  { e: 'a²', right: 'a × a', wrong: ['a × 2', 'a + a'] },
  { e: '2a', right: '2 × a', wrong: ['a × a', '2 + a'] },
  { e: 'ab', right: 'a × b', wrong: ['a + b', 'b - a'] },
  { e: '3x', right: '3 × x', wrong: ['x × x × x', '3 + x'] },
  { e: 'x²', right: 'x × x', wrong: ['x × 2', 'x + x'] },
]
function meansQ(d: Difficulty, rng: RNG): Question {
  const it = rng.pick(MEANS)
  return pickQ(MULDIV, d, `means-${it.e}`, [text('m5.let.md.means', { e: it.e })], it.right, it.wrong, rng)
}

/** 写法的规则对不对（蓝框的话，和几条写对 / 写错的） */
const OMIT_JUDGE: { e: string; w: string; ok: boolean }[] = [
  { e: 'x × x', w: '2x', ok: false },
  { e: 'x × x', w: 'x²', ok: true },
  { e: 'a × 5', w: 'a5', ok: false },
  { e: 'a × 5', w: '5a', ok: true },
  { e: 'b × 1', w: '1b', ok: false },
  { e: 'a × b', w: 'ab', ok: true },
]
function omitRuleQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  if (kind === 0) return judgeQ(MULDIV, d, 'rule-front', [text('m5.let.md.jFront')], true, rng)
  if (kind === 1) return judgeQ(MULDIV, d, 'rule-one', [text('m5.let.md.jOne')], true, rng)
  if (kind === 2) return judgeQ(MULDIV, d, 'rule-dot', [text('m5.let.md.jDot')], true, rng)
  const it = rng.pick(OMIT_JUDGE)
  return judgeQ(MULDIV, d, `rule-${it.e}-${it.w}`, [text('m5.let.md.jWrite', { e: it.e, w: it.w })], it.ok, rng)
}

/** 做一做：宽 3 厘米的长方形纸条，长度变了面积跟着变（表里缺的面积、长度 5.6 厘米、长度 x 厘米） */
function stripQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 2)
  if (kind === 0) {
    const ls = rng.chance(0.5) ? [2, 4, 8, 15] : rng.shuffle([2, 4, 5, 6, 8, 10, 12, 15]).slice(0, 4).sort((a, b) => a - b)
    const ask = rng.int(1, ls.length - 1)
    const rows: (number | LStr | null)[][] = [
      [key('m5.let.t.len'), ...ls],
      [key('m5.let.t.area'), ...ls.map((l, i) => (i === ask ? null : 3 * l))],
    ]
    const l = ls[ask]!
    return numQ(MULDIV, d, `strip-${ls.join('-')}-${ask}`, [text('m5.let.md.strip'), { kind: 'stat-table', rows, head: 'col' }], 3 * l, rng, [l + 3, 2 * (l + 3)], 'numpad')
  }
  if (kind === 1) {
    const l = rng.chance(0.5) ? 5.6 : rng.pick([2.5, 4.5])
    const v = Math.round(l * 30) / 10
    return pickQ(MULDIV, d, `stripDec-${l}`, [text('m5.let.md.stripDec', { l })], dec(v), [dec(v / 10), dec(v * 10), dec(l + 3)], rng)
  }
  return pickQ(MULDIV, d, 'stripX', [text('m5.let.md.stripX')], '3x', ['x + 3', 'x ÷ 3', '6x'], rng)
}

/** 练习十一 2：每袋 b 条金鱼（3b）、m 个饺子每盘装 10 个（m ÷ 10） */
function fishQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const k = rng.int(3, 6)
    return pickQ(MULDIV, d, `fish-${k}`, [text('m5.let.md.fish', { k })], `${k}b`, [`b + ${k}`, `b ÷ ${k}`, `${k} ÷ b`], rng)
  }
  const p = rng.pick([10, 8, 6, 5])
  return pickQ(MULDIV, d, `dumpling-${p}`, [text('m5.let.md.dumpling', { p })], `m ÷ ${p}`, [`${p}m`, `m - ${p}`, `${p} ÷ m`], rng)
}

/** 练习十三 1、练习十一 6 (2)(3)、7 (1)：3 分球、毽子和足球、骨骼质量、电价、总价单价数量 */
function mulDivPracticeQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 4)
  if (kind === 0) return pickQ(MULDIV, d, 'three', [text('m5.let.md.three')], '3c', ['c + 3', 'c ÷ 3', '3 ÷ c'], rng)
  if (kind === 1) {
    const k = rng.int(3, 5)
    return pickQ(MULDIV, d, `shuttle-${k}`, [text('m5.let.md.shuttle', { k })], `d ÷ ${k}`, [`${k}d`, `d - ${k}`, `${k} ÷ d`], rng)
  }
  if (kind === 2) return pickQ(MULDIV, d, 'bone', [text('m5.let.md.bone')], '0.18b', ['b + 0.18', 'b ÷ 0.18', '18b'], rng)
  if (kind === 3) {
    const w = rng.pick([80, 90, 100, 120])
    return pickQ(MULDIV, d, `power-${w}`, [text('m5.let.md.power', { w })], `c ÷ ${w}`, [`${w}c`, `${w} ÷ c`, `c - ${w}`], rng)
  }
  const y = rng.pick(['c', 'a', 'n'] as const)
  const F = {
    c: ['c = an', ['c = a + n', 'c = a ÷ n', 'c = n ÷ a']],
    a: ['a = c ÷ n', ['a = cn', 'a = n ÷ c', 'a = c - n']],
    n: ['n = c ÷ a', ['n = ac', 'n = a ÷ c', 'n = c - a']],
  } as const
  return pickQ(MULDIV, d, `price-${y}`, [text('m5.let.md.price', { y })], F[y][0], [...F[y][1]], rng)
}

/** 练习十三 3 的求值：xy、m ÷ n、4x + y、2a、a²（第 3 档加练习十二 7 的 x²） */
function mulDivValQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, d === 3 ? 4 : 3)
  if (kind === 0) {
    const x = rng.int(3, 15)
    const y = rng.int(2, 9)
    return numQ(MULDIV, d, `xy-${x}-${y}`, [text('m5.let.findVal2', { x: 'x', u: x, y: 'y', v: y, e: 'xy' })], x * y, rng, [x + y, x * y + 10])
  }
  if (kind === 1) {
    const n = rng.int(2, 9)
    const q = rng.int(3, 12)
    return numQ(MULDIV, d, `mn-${n * q}-${n}`, [text('m5.let.findVal2', { x: 'm', u: n * q, y: 'n', v: n, e: 'm ÷ n' })], q, rng, [n * q * n, n * q - n])
  }
  if (kind === 2) {
    const x = rng.int(5, 25)
    const y = rng.int(1, 10) * 10
    return numQ(MULDIV, d, `4xy-${x}-${y}`, [text('m5.let.findVal2', { x: 'x', u: x, y: 'y', v: y, e: '4x + y' })], 4 * x + y, rng, [4 * (x + y), x + 4 + y, 4 * x])
  }
  if (kind === 3) {
    const a = rng.int(2, 12)
    if (rng.chance(0.5)) return numQ(MULDIV, d, `a2-${a}`, [text('m5.let.findVal', { x: 'a', u: a, e: 'a²' })], a * a, rng, [2 * a, a + 2])
    return numQ(MULDIV, d, `2a-${a}`, [text('m5.let.findVal', { x: 'a', u: a, e: '2a' })], 2 * a, rng, [a * a, a + 2, 20 + a])
  }
  // 练习十二 7：x = 8 时 x²、4x
  const x = rng.int(5, 12)
  if (rng.chance(0.5)) return numQ(MULDIV, d, `x2-${x}`, [text('m5.let.findVal', { x: 'x', u: x, e: 'x²' })], x * x, rng, [2 * x, 4 * x])
  return numQ(MULDIV, d, `4x-${x}`, [text('m5.let.findVal', { x: 'x', u: x, e: '4x' })], 4 * x, rng, [x * x, x + 4])
}

/** 第 3 档：x 不是 0 时 x² 和 4x 正好相等的 x（4）；a² 和 2a 什么时候相等（a = 2） */
function squareEqQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return numQ(MULDIV, d, 'sqEq', [text('m5.let.md.sqEq')], 4, rng, [2, 8, 16])
  const a = rng.pick([2, 3, 4, 5])
  return judgeQ(MULDIV, d, `sq2a-${a}`, [text('m5.let.md.jSq2a', { a })], a === 2, rng)
}

defineGenerator(MULDIV, (d, rng) => {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.3) return moonQ(d, rng)
    if (r < 0.48) return omitQ(d, rng)
    if (r < 0.6) return meansQ(d, rng)
    if (r < 0.68) return omitRuleQ(d, rng)
    if (r < 0.9) return stripQ(d, rng)
    return fishQ(d, rng)
  }
  if (d === 2) {
    if (r < 0.15) return fishQ(d, rng)
    if (r < 0.42) return mulDivPracticeQ(d, rng)
    if (r < 0.52) return meanQ(MULDIV, d, rng, ['div', 'mul'])
    if (r < 0.77) return mulDivValQ(d, rng)
    if (r < 0.87) return omitQ(d, rng)
    return moonQ(d, rng)
  }
  if (r < 0.35) return squareEqQ(d, rng)
  if (r < 0.7) return mulDivValQ(d, rng)
  if (r < 0.85) return mulDivPracticeQ(d, rng)
  return omitRuleQ(d, rng)
})

// ═════════════════════════════════════════════════════════════
// 用字母表示运算律和公式（例 3 (1)–(3)，p58；练习十一 8、10，练习十三 9）
// 第 1 档：(1) 五条运算律的字母式（照这本课本：加法交换律、加法结合律、乘法交换律、乘法结合律、分配律 a × (b + c) = a × b + a × c），
//          正着选字母式、反着说是什么运算律；(2) 正方形 C = 4a、S = a × a（a²），长方形 C = 2(a + b) = 2a + 2b、S = ab，
//          边长给了数用公式求周长、面积；(3) s = vt、v = s ÷ t、t = s ÷ v，v = 250 米/分、t = 20 分时 s = 5000 米。
// 第 2 档：练习十一 8 根据运算律填空（a + (2 + c)、a·b·4、3x + 5x、4(x + 3)，做成「和它相等的是哪一个」），
//          练习十一 10 长方形分成两块（哪一部分的面积是 ac、bc，整个面积 (a + b)c）。
// 第 3 档：练习十三 9 边长 a + b 的正方形（哪个正方形的面积是 a²、b²，整个面积 a² + 2ab + b²）。
// ═════════════════════════════════════════════════════════════

const LAW_FORM: Record<string, string> = {
  addComm: 'a + b = b + a',
  addAssoc: '(a + b) + c = a + (b + c)',
  mulComm: 'a × b = b × a',
  mulAssoc: '(a × b) × c = a × (b × c)',
  distrib: 'a × (b + c) = a × b + a × c',
}
/** 每条运算律的干扰项：别的运算律、减除法照着写的（不成立）、分配律少乘一次 */
const LAW_WRONG: Record<string, string[]> = {
  addComm: ['a - b = b - a', 'a × b = b × a', '(a + b) + c = a + (b + c)'],
  addAssoc: ['(a - b) - c = a - (b - c)', 'a + b = b + a', '(a × b) × c = a × (b × c)'],
  mulComm: ['a ÷ b = b ÷ a', 'a + b = b + a', '(a × b) × c = a × (b × c)'],
  mulAssoc: ['(a ÷ b) ÷ c = a ÷ (b ÷ c)', 'a × b = b × a', 'a × (b + c) = a × b + a × c'],
  distrib: ['a × (b + c) = a × b + c', 'a × (b + c) = a × b × c', '(a × b) × c = a × (b × c)'],
}
const LAW_NAMES = Object.keys(LAW_FORM)
const law = (name: string): LStr => key(`m5.let.law.${name}`)

/** 例 3 (1)：用字母表示运算律（选字母式），反过来说出式子表示的运算律 */
function lawLetterQ(d: Difficulty, rng: RNG): Question {
  const name = rng.pick(LAW_NAMES)
  if (rng.chance(0.55)) return pickQ(LAWS, d, `letter-${name}`, [text('m5.let.lw.letter', { law: law(name) })], LAW_FORM[name]!, rng.shuffle(LAW_WRONG[name]!), rng, 3, 'law')
  const others = rng.shuffle(LAW_NAMES.filter((x) => x !== name)).slice(0, 3)
  return pickQ(LAWS, d, `which-${name}`, [text('m5.let.lw.which'), expr(LAW_FORM[name]!)], law(name), others.map(law), rng, 3, 'law')
}

/** 边长是 a 的正方形；两条邻边是 a（下边）、b（右边）的长方形（图里只写字母） */
const SQUARE_FIG: StemPart = {
  kind: 'geo',
  alt: '边长是 a 的正方形',
  figs: [{ w: 4, h: 4, px: 22, items: [{ t: 'poly', pts: [[0, 0], [4, 0], [4, 4], [0, 4]], fill: 'b', labels: [null, null, 'a', null] }] }],
}
const RECT_FIG: StemPart = {
  kind: 'geo',
  alt: '长方形，下边标着 a，右边标着 b',
  figs: [{ w: 6, h: 3.4, px: 22, items: [{ t: 'poly', pts: [[0, 0], [6, 0], [6, 3.4], [0, 3.4]], fill: 'b', labels: [null, 'b', 'a', null] }] }],
}

/** 例 3 (2)：正方形、长方形的周长和面积公式 */
function formulaQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  if (kind === 0) return pickQ(LAWS, d, 'sqC', [text('m5.let.lw.sqC'), SQUARE_FIG], 'C = 4a', ['C = a²', 'C = 2a', 'C = a + 4'], rng)
  if (kind === 1) {
    const right = rng.chance(0.5) ? 'S = a²' : 'S = a × a'
    return pickQ(LAWS, d, `sqS-${right}`, [text('m5.let.lw.sqS'), SQUARE_FIG], right, ['S = 2a', 'S = 4a', 'S = a + a'], rng)
  }
  if (kind === 2) {
    const right = rng.chance(0.5) ? 'C = 2(a + b)' : 'C = 2a + 2b'
    return pickQ(LAWS, d, `rectC-${right}`, [text('m5.let.lw.rectC'), RECT_FIG], right, ['C = ab', 'C = 2a + b', 'C = a + b'], rng)
  }
  return pickQ(LAWS, d, 'rectS', [text('m5.let.lw.rectS'), RECT_FIG], 'S = ab', ['S = 2(a + b)', 'S = a + b', 'S = 2ab'], rng)
}

/** 用公式求周长、面积（代进去的那一步照课本写出「×」） */
function formulaValQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  if (kind === 0) {
    const a = rng.int(3, 15)
    return numQ(LAWS, d, `sqCv-${a}`, [text('m5.let.lw.sqCv', { a }), expr(`C = 4a = 4 × ${a} = ?`)], 4 * a, rng, [a * a, 2 * a], 'numpad')
  }
  if (kind === 1) {
    const a = rng.int(3, 12)
    return numQ(LAWS, d, `sqSv-${a}`, [text('m5.let.lw.sqSv', { a }), expr(`S = a² = ${a} × ${a} = ?`)], a * a, rng, [2 * a, 4 * a], 'numpad')
  }
  const b = rng.int(3, 9)
  const a = b + rng.int(2, 8)
  // 不画图：手机竖屏上图、两行的算式和数字键盘放不下一屏（a、b 在题目里给了数）
  if (kind === 2) return numQ(LAWS, d, `rectCv-${a}-${b}`, [text('m5.let.lw.rectCv', { a, b }), expr(`C = 2(a + b) = 2 × (${a} + ${b}) = ?`)], 2 * (a + b), rng, [a + b, a * b, 2 * a + b], 'numpad')
  return numQ(LAWS, d, `rectSv-${a}-${b}`, [text('m5.let.lw.rectSv', { a, b }), expr(`S = ab = ${a} × ${b} = ?`)], a * b, rng, [2 * (a + b), a + b], 'numpad')
}

/** 例 3 (3)：路程、速度、时间的公式 */
const SPEED: Record<'s' | 'v' | 't', [string, string[]]> = {
  s: ['s = vt', ['s = v + t', 's = v ÷ t', 's = t ÷ v']],
  v: ['v = s ÷ t', ['v = st', 'v = t ÷ s', 'v = s - t']],
  t: ['t = s ÷ v', ['t = sv', 't = v ÷ s', 't = s - v']],
}
function speedQ(d: Difficulty, rng: RNG): Question {
  const y = rng.pick(['s', 'v', 't'] as const)
  return pickQ(LAWS, d, `speed-${y}`, [text('m5.let.lw.speed', { y })], SPEED[y][0], SPEED[y][1], rng)
}
/** 例 3 (3)：当 v = 250 米/分，t = 20 分时，s = vt = 250 × 20 = 5000（米） */
function speedValQ(d: Difficulty, rng: RNG): Question {
  const [v, t] = rng.chance(0.35) ? [250, 20] : [rng.pick([50, 60, 70, 80, 120, 250]), rng.pick([5, 10, 12, 15, 20, 30])]
  return numQ(LAWS, d, `speedV-${v}-${t}`, [text('m5.let.lw.speedV', { v, t }), expr(`s = vt = ${v} × ${t} = ?`)], v * t, rng, [v + t, v * t * 10], 'numpad')
}

/** 练习十一 8：根据运算律，和 a + (2 + c)、a·b·4、3x + 5x、4(x + 3) 相等的是哪一个 */
function lawEqualQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  let e: string
  let right: string
  let wrongs: string[]
  if (kind === 0) {
    const k = rng.chance(0.4) ? 2 : rng.int(3, 9)
    e = `a + (${k} + c)`
    right = `(a + ${k}) + c`
    wrongs = [`(a + ${k}) × c`, `${k}a + c`, `a + ${k} × c`]
  } else if (kind === 1) {
    const k = rng.chance(0.4) ? 4 : rng.int(2, 9)
    e = `a·b·${k}`
    right = `a·(b·${k})`
    wrongs = [`a·(b + ${k})`, `(a + b)·${k}`]
  } else if (kind === 2) {
    const [p, q] = rng.chance(0.4) ? [3, 5] : (rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 2) as [number, number])
    e = `${p}x + ${q}x`
    right = `(${p} + ${q})·x`
    wrongs = [`(${p} × ${q})·x`, `${p} + ${q}·x`]
  } else {
    const [k, j] = rng.chance(0.4) ? [4, 3] : [rng.int(2, 9), rng.int(2, 9)]
    e = `${k}(x + ${j})`
    right = `${k} × x + ${k} × ${j}`
    wrongs = [`${k} × x + ${j}`, `${k} × x × ${j}`]
  }
  return pickQ(LAWS, d, `equal-${e}`, [text('m5.let.lw.equal'), expr(e)], right, wrongs, rng, 3, 'law')
}

/** 练习十一 10：长方形被一条竖线分成两块，左边宽 a、右边宽 b，高 c */
const SPLIT_FIG: StemPart = {
  kind: 'geo',
  alt: '一个长方形被一条竖线分成左右两块，左边一块下边标着 a，右边一块下边标着 b、右边标着 c',
  figs: [
    {
      w: 8,
      h: 3,
      px: 20,
      items: [
        { t: 'poly', pts: [[0, 0], [3, 0], [3, 3], [0, 3]], fill: 'b', labels: [null, null, 'a', null] },
        { t: 'poly', pts: [[3, 0], [8, 0], [8, 3], [3, 3]], fill: 'b', labels: [null, 'c', 'b', null] },
      ],
    },
  ],
}
function partQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 2)
  const parts = ['left', 'right', 'whole'].map((p) => key(`m5.let.lw.part.${p}`))
  if (kind === 0) return pickQ(LAWS, d, 'part-ac', [text('m5.let.lw.partOf', { e: 'ac' }), SPLIT_FIG], parts[0]!, [parts[1]!, parts[2]!], rng)
  if (kind === 1) return pickQ(LAWS, d, 'part-bc', [text('m5.let.lw.partOf', { e: 'bc' }), SPLIT_FIG], parts[1]!, [parts[0]!, parts[2]!], rng)
  const right = rng.chance(0.5) ? '(a + b)c' : 'ac + bc'
  return pickQ(LAWS, d, `part-all-${right}`, [text('m5.let.lw.partAll'), SPLIT_FIG], right, ['a + b + c', 'ac + b', 'abc'], rng)
}

/** 练习十三 9：边长 a + b 的正方形分成四块——左下边长 a、右上边长 b 两个正方形（蓝），两个 a × b 的长方形（橙） */
const BIG_SQUARE_FIG: StemPart = {
  kind: 'geo',
  alt: '边长 a + b 的大正方形分成四块：左下角是边长 a 的正方形，右上角是边长 b 的正方形，左上角和右下角是两个长方形',
  figs: [
    {
      w: 7,
      h: 7,
      px: 20,
      items: [
        { t: 'poly', pts: [[0, 0], [5, 0], [5, 2], [0, 2]], fill: 'a', labels: [null, null, null, 'b'] },
        { t: 'poly', pts: [[5, 0], [7, 0], [7, 2], [5, 2]], fill: 'b' },
        { t: 'poly', pts: [[0, 2], [5, 2], [5, 7], [0, 7]], fill: 'b', labels: [null, null, 'a', 'a'] },
        { t: 'poly', pts: [[5, 2], [7, 2], [7, 7], [5, 7]], fill: 'a', labels: [null, null, 'b', null] },
      ],
    },
  ],
}
function bigSquareQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 2)
  const opts = ['big', 'small', 'rect'].map((p) => key(`m5.let.lw.sq.${p}`))
  if (kind === 0) return pickQ(LAWS, d, 'bigsq-a2', [text('m5.let.lw.sqPart', { e: 'a²' }), BIG_SQUARE_FIG], opts[0]!, [opts[1]!, opts[2]!], rng)
  if (kind === 1) return pickQ(LAWS, d, 'bigsq-b2', [text('m5.let.lw.sqPart', { e: 'b²' }), BIG_SQUARE_FIG], opts[1]!, [opts[0]!, opts[2]!], rng)
  return pickQ(LAWS, d, 'bigsq-all', [text('m5.let.lw.sqAll'), BIG_SQUARE_FIG], 'a² + 2ab + b²', ['a² + b²', 'a² + ab + b²', '2a + 2b'], rng)
}

defineGenerator(LAWS, (d, rng) => {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.3) return lawLetterQ(d, rng)
    if (r < 0.58) return formulaQ(d, rng)
    if (r < 0.72) return formulaValQ(d, rng)
    if (r < 0.86) return speedQ(d, rng)
    return speedValQ(d, rng)
  }
  if (d === 2) {
    if (r < 0.35) return lawEqualQ(d, rng)
    if (r < 0.6) return partQ(d, rng)
    if (r < 0.75) return formulaValQ(d, rng)
    if (r < 0.85) return speedValQ(d, rng)
    return lawLetterQ(d, rng)
  }
  if (r < 0.45) return bigSquareQ(d, rng)
  if (r < 0.7) return lawEqualQ(d, rng)
  if (r < 0.85) return partQ(d, rng)
  return formulaValQ(d, rng)
})

// ═════════════════════════════════════════════════════════════
// 用字母表示等式的基本性质（例 3 (4) + 试一试 + 做一做，p59；练习十三 2，练习十一 3 (2)、9）
// 第 1 档：如果 a = b，那么 a + c = b + c、a - c = b - c、ac = bc、a ÷ c = b ÷ c（c ≠ 0）——哪个式子一定成立、c 不能是几、
//          练习十三 2 的填数（a + 3 = b + ?……）；利用等式的基本性质求等式中的未知数：例 ① b = a + 25、b = 37 → 12，
//          ② n = 6m、n = 9 → 1.5（小数做选项），试一试 a - 25 = 37 → 62、m ÷ 6 = 9 → 54，两边同时怎样做；
//          做一做王红打字（c = at，a = 45、c = 900 → t = 20）。
// 第 2 档：练习十一 3 (2)（n = 48 + m，n = 62 → 14）、练习十一 9 的三幅线段图（关系式、n = 53 时的 m）、a × 1.5 = b × ?。
// 第 3 档：判断（a - 5 = b + 5、a + 8 = b + 8 推出 a = b、两边同时除以 0、3a = 3b）。
// 课本这一册没有「方程」，题目里只说「求等式中的未知数」。
// ═════════════════════════════════════════════════════════════

/** 如果 a = b，哪个式子一定成立（字母照课本用 c，练习十三 2 还有 m） */
const PROP: Record<'add' | 'sub' | 'mul' | 'div', [string, string[]]> = {
  add: ['a + c = b + c', ['a + c = b - c', 'a + c = bc']],
  sub: ['a - c = b - c', ['a - c = b + c', 'a - c = c - b']],
  mul: ['ac = bc', ['ac = b + c', 'a + c = bc']],
  // 「(c ≠ 0)」里用不换行的空格，选项卡折行时整个挪到下一行
  div: ['a ÷ c = b ÷ c (c\u00a0≠\u00a00)', ['a ÷ c = bc', 'a ÷ c = c ÷ b']],
}
function propQ(d: Difficulty, rng: RNG): Question {
  const op = rng.pick(['add', 'sub', 'mul', 'div'] as const)
  const L = op === 'div' ? 'c' : rng.pick(['c', 'm'])
  const sub = (s: string): string => s.replace(/c/g, L)
  const [right, wrongs] = PROP[op]
  return pickQ(EQUALITY, d, `prop-${op}-${L}`, [text('m5.let.eq.prop')], sub(right), wrongs.map(sub), rng)
}

/** 练习十三 2：如果 a = b，根据等式的基本性质填数（a + 3 = b + ?、a - ? = b - 9、a ÷ ? = b ÷ 10……；小数的 a × 1.5 = b × ? 做选项） */
function fillQ(d: Difficulty, rng: RNG): Question {
  if (d > 1 && rng.chance(0.3)) {
    const k = rng.pick([1.5, 2.5, 0.5])
    return pickQ(EQUALITY, d, `filldec-${k}`, [text('m5.let.eq.fill'), expr(`a × ${k} = b × ?`)], dec(k), [dec(k * 10), dec(k / 10)], rng)
  }
  const op = rng.pick(['+', '-', '×', '÷'])
  const k = rng.pick([2, 3, 5, 6, 8, 9, 10, 12, 15])
  const e = rng.chance(0.5) ? `a ${op} ? = b ${op} ${k}` : `a ${op} ${k} = b ${op} ?`
  return numQ(EQUALITY, d, `fill-${e}`, [text('m5.let.eq.fill'), expr(e)], k, rng, [k + 1, 2 * k], 'numpad')
}

/** a ÷ c = b ÷ c，c 不能是几 */
function zeroQ(d: Difficulty, rng: RNG): Question {
  return numQ(EQUALITY, d, 'zero', [text('m5.let.eq.zero')], 0, rng, [1, 10])
}

/** n = km 求 m 时 m 是小数的几组（课本 6m = 9 → 1.5） */
const DEC_MUL: [number, number][] = [
  [6, 9],
  [6, 15],
  [4, 6],
  [4, 10],
  [8, 12],
  [2, 7],
  [6, 3],
]
/** 例 ①、②、试一试：求等式中的未知数（课本的问法，或直接写出等式） */
function findQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  const direct = rng.chance(0.4)
  if (kind === 0) {
    const k = rng.chance(0.4) ? 25 : rng.pick([15, 18, 20, 30])
    const a = rng.chance(0.4) && k === 25 ? 12 : rng.int(5, 30)
    const b = a + k
    if (direct) return numQ(EQUALITY, d, `solveAdd-${k}-${b}`, [text('m5.let.eq.solve'), expr(`a + ${k} = ${b}`), expr('a = ?')], a, rng, [b + k], 'numpad')
    return numQ(EQUALITY, d, `findAdd-${k}-${b}`, [text('m5.let.eq.findAdd', { k, b })], a, rng, [b + k, a + 10])
  }
  if (kind === 1) {
    const k = rng.chance(0.4) ? 25 : rng.pick([15, 18, 20, 30])
    const b = rng.chance(0.4) && k === 25 ? 37 : rng.int(5, 40)
    if (direct) return numQ(EQUALITY, d, `solveSub-${k}-${b}`, [text('m5.let.eq.solve'), expr(`a - ${k} = ${b}`), expr('a = ?')], b + k, rng, [b - k], 'numpad')
    return numQ(EQUALITY, d, `findSub-${k}-${b}`, [text('m5.let.eq.findSub', { k, b })], b + k, rng, [Math.abs(b - k), b + k + 10])
  }
  if (kind === 2) {
    if (rng.chance(0.5)) {
      // 例 ②：6m = 9，m = 1.5（选项：错乘成 54、减成 3、小数点错位）
      const [k, n] = rng.chance(0.4) ? [6, 9] : rng.pick(DEC_MUL)
      const m = n / k
      const stem = direct ? [text('m5.let.eq.solve'), expr(`${k}m = ${n}`)] : [text('m5.let.eq.findMul', { k, n })]
      return pickQ(EQUALITY, d, `${direct ? 'solve' : 'find'}MulDec-${k}-${n}`, stem, dec(m), [String(k * n), String(Math.abs(n - k)), dec(m * 10)], rng)
    }
    const k = rng.int(2, 9)
    const m = rng.int(2, 12)
    if (direct) return numQ(EQUALITY, d, `solveMul-${k}-${k * m}`, [text('m5.let.eq.solve'), expr(`${k}m = ${k * m}`), expr('m = ?')], m, rng, [k * m * k], 'numpad')
    return numQ(EQUALITY, d, `findMul-${k}-${k * m}`, [text('m5.let.eq.findMul', { k, n: k * m })], m, rng, [k * m * k, k * m - k])
  }
  const k = rng.chance(0.4) ? 6 : rng.int(2, 9)
  const n = rng.chance(0.4) && k === 6 ? 9 : rng.int(2, 12)
  if (direct) return numQ(EQUALITY, d, `solveDiv-${k}-${n}`, [text('m5.let.eq.solve'), expr(`m ÷ ${k} = ${n}`), expr('m = ?')], n * k, rng, [n + k], 'numpad')
  return numQ(EQUALITY, d, `findDiv-${k}-${n}`, [text('m5.let.eq.findDiv', { k, n })], n * k, rng, [n + k, Math.abs(n - k)])
}

/** 求未知数时等式两边要同时怎样做（a + 25 = 37 → 同时减去 25） */
function stepQ(d: Difficulty, rng: RNG): Question {
  const op = rng.pick(['add', 'sub', 'mul', 'div'] as const)
  const k = op === 'add' || op === 'sub' ? rng.pick([25, 15, 18, 20, 30]) : rng.int(2, 9)
  const v = rng.int(2, 9) * (op === 'mul' ? k : 1) + (op === 'add' ? k : 0)
  const e = op === 'add' ? `a + ${k} = ${v}` : op === 'sub' ? `a - ${k} = ${v}` : op === 'mul' ? `${k}a = ${v}` : `a ÷ ${k} = ${v}`
  const undo = { add: 'sub', sub: 'add', mul: 'div', div: 'mul' } as const
  const right = undo[op]
  const others = rng.shuffle((['add', 'sub', 'mul', 'div'] as const).filter((x) => x !== right)).slice(0, 2)
  return pickQ(EQUALITY, d, `step-${e}`, [text('m5.let.eq.step'), expr(e)], key(`m5.let.eq.op.${right}`, { k }), others.map((o) => key(`m5.let.eq.op.${o}`, { k })), rng)
}

/** 做一做：王红每分钟打 a 个字，打了 t 分钟，一共打了 c 个字（c = at；a = 45、c = 900 → t = 20） */
function typingQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) return pickQ(EQUALITY, d, 'typeRel', [text('m5.let.eq.typeRel')], 'c = at', ['c = a + t', 't = ac', 'a = ct'], rng)
  const [a, t] = rng.chance(0.4) ? [45, 20] : [rng.pick([30, 40, 45, 50, 60]), rng.pick([10, 15, 20, 25, 30])]
  return numQ(EQUALITY, d, `typeVal-${a}-${t}`, [text('m5.let.eq.typeVal', { a, c: a * t })], t, rng, [a * t - a, a * t * a])
}

/** 练习十一 9：三幅线段图（m 是 15 和 n 的和；n 是 m 和 20 的和；73 是 n 和 m 的和），写关系式，求 n = 53 时的 m */
function lineRelQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 2)
  const val = rng.chance(0.5)
  if (kind === 0) {
    const k = rng.chance(0.4) ? 15 : rng.int(12, 30)
    const line: StemPart = { kind: 'part-line', parts: [{ len: 3, label: String(k) }, { len: 8, label: 'n' }], total: 'm' }
    if (!val) return pickQ(EQUALITY, d, `lineRel0-${k}`, [text('m5.let.eq.lineRel'), line], `m = n + ${k}`, [`m = n - ${k}`, `n = m + ${k}`, `m = ${k}n`], rng)
    const n = rng.chance(0.4) ? 53 : rng.int(40, 60)
    return numQ(EQUALITY, d, `lineVal0-${k}-${n}`, [text('m5.let.eq.lineVal', { n }), line], n + k, rng, [n - k, n + k + 10])
  }
  if (kind === 1) {
    const k = rng.chance(0.4) ? 20 : rng.int(10, 30)
    const line: StemPart = { kind: 'part-line', parts: [{ len: 8, label: 'm' }, { len: 3, label: String(k) }], total: 'n' }
    if (!val) return pickQ(EQUALITY, d, `lineRel1-${k}`, [text('m5.let.eq.lineRel'), line], `n = m + ${k}`, [`m = n + ${k}`, `n = m - ${k}`, `n = ${k}m`], rng)
    const n = rng.chance(0.4) ? 53 : rng.int(40, 60)
    return numQ(EQUALITY, d, `lineVal1-${k}-${n}`, [text('m5.let.eq.lineVal', { n }), line], n - k, rng, [n + k, n - k + 10])
  }
  const t = rng.chance(0.4) ? 73 : rng.int(65, 99)
  const line: StemPart = { kind: 'part-line', parts: [{ len: 7, label: 'n' }, { len: 4, label: 'm' }], total: String(t) }
  if (!val) return pickQ(EQUALITY, d, `lineRel2-${t}`, [text('m5.let.eq.lineRel'), line], `m + n = ${t}`, [`m - n = ${t}`, `m = n + ${t}`, `mn = ${t}`], rng)
  const n = rng.chance(0.4) && t === 73 ? 53 : rng.int(40, t - 5)
  return numQ(EQUALITY, d, `lineVal2-${t}-${n}`, [text('m5.let.eq.lineVal', { n }), line], t - n, rng, [t + n, t - n + 10])
}

/** 第 3 档：等式的基本性质的判断 */
function propJudgeQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  const k = rng.int(2, 9)
  if (kind === 0) return judgeQ(EQUALITY, d, `j-addsub-${k}`, [text('m5.let.eq.jAddSub', { k })], false, rng)
  if (kind === 1) return judgeQ(EQUALITY, d, `j-back-${k}`, [text('m5.let.eq.jBack', { k })], true, rng)
  if (kind === 2) return judgeQ(EQUALITY, d, 'j-zero', [text('m5.let.eq.jZero')], false, rng)
  return judgeQ(EQUALITY, d, `j-mul-${k}`, [text('m5.let.eq.jMul', { k })], true, rng)
}

defineGenerator(EQUALITY, (d, rng) => {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.14) return propQ(d, rng)
    if (r < 0.28) return fillQ(d, rng)
    if (r < 0.33) return zeroQ(d, rng)
    if (r < 0.68) return findQ(d, rng)
    if (r < 0.8) return stepQ(d, rng)
    return typingQ(d, rng)
  }
  if (d === 2) {
    if (r < 0.35) return lineRelQ(d, rng)
    if (r < 0.5) return ballValQ(EQUALITY, d, rng)
    if (r < 0.65) return fillQ(d, rng)
    if (r < 0.85) return findQ(d, rng)
    return typingQ(d, rng)
  }
  if (r < 0.4) return propJudgeQ(d, rng)
  if (r < 0.7) return lineRelQ(d, rng)
  return findQ(d, rng)
})

// ═════════════════════════════════════════════════════════════
// 用字母表示 ax+b 的数量关系（例 4 + 试一试，p63；做一做 1，p65；练习十二 1、4–6，练习十三 6，练习十一 7 (2)；*探秘百数表）
// 第 1 档：例 4 拼桌子（1 张坐 4 人、2 张 6 人、3 张 8 人：几张坐几人、m 张坐 2 + 2m 人、n = 2 + 2m、表里缺的人数、
//          试一试 m = 15 → 32、n = 52 → 25）；做一做 1 的数列（1, 2, 3, 4；2, 4, 6, 8；1, 3, 5, 7；1, 4, 9, 16：后面的数、
//          第几个数、第 n 个数 2n、2n - 1、n²）。
// 第 2 档：练习十三 6（每边坐 2 人：4m + 2、10 张 42 人、n = 38 → 9）、练习十二 1（圆片：第 n 排 2n 个、最后一排 100 个 → 50 排）、
//          练习十二 4（小正方体：7 个 → 29、n 个 → 4n + 1）、练习十一 7 (2)（120 + 4m、m = 80 → 440）、练习十二 6（一个顶点的对角线 n - 3）、
//          *探秘百数表（田字形的四个数：a + 1、a + 10、a + 11，对角两数之和）。
// 第 3 档：练习十二 5（黑棋和棋子总数，第十五幅图，1 + 2 + … + 100）、多边形一共有几条对角线、对角两数之和 2a + 11。
// ═════════════════════════════════════════════════════════════

/** 拼桌子的图：1、2、3 张拼起来，后面「……」 */
const deskFig = (side: 1 | 2): StemPart => ({ kind: 'pattern-dots', figs: [1, 2, 3].map((n): PatternFig => ({ t: 'tables', n, side })), more: true })
/** 拼桌子：side 1（例 4，n = 2 + 2m）、side 2（练习十三 6，n = 4m + 2） */
function deskQ(d: Difficulty, rng: RNG, side: 1 | 2): Question {
  const seats = (m: number): number => 2 * side * m + 2
  const form = side === 1 ? '2 + 2m' : '4m + 2'
  const stem: StemPart[] = [text(`m5.let.ab.desk${side}`), deskFig(side)]
  const kind = rng.int(0, 5)
  if (kind === 0) {
    const k = side === 2 && rng.chance(0.4) ? 10 : rng.int(4, 10)
    return numQ(AXB, d, `desk${side}-k-${k}`, [...stem, text('m5.let.ab.deskK', { k })], seats(k), rng, [2 * side * k, seats(k) + 2, seats(k) - 2])
  }
  if (kind === 1) {
    const wrongs = side === 1 ? ['4m', '2m', 'm + 4'] : ['6m', '4m', '2m + 4']
    return pickQ(AXB, d, `desk${side}-m`, [...stem, text('m5.let.ab.deskM')], form, wrongs, rng)
  }
  if (kind === 2) {
    const wrongs = side === 1 ? ['n = 4m', 'n = 2m', 'm = 2 + 2n'] : ['n = 6m', 'n = 4m', 'm = 4n + 2']
    return pickQ(AXB, d, `desk${side}-rel`, [...stem, text('m5.let.ab.deskRel')], `n = ${form}`, wrongs, rng)
  }
  if (kind === 3) {
    const m = side === 1 && rng.chance(0.4) ? 15 : rng.int(6, 30)
    return numQ(AXB, d, `desk${side}-n-${m}`, [text('m5.let.ab.deskCtx'), expr(`n = ${form}`), when1('m', m, 'n')], seats(m), rng, [2 * side * m, seats(m) + 2])
  }
  if (kind === 4) {
    const m = side === 1 && rng.chance(0.4) ? 25 : side === 2 && rng.chance(0.4) ? 9 : rng.int(5, 30)
    return numQ(AXB, d, `desk${side}-m-${m}`, [text('m5.let.ab.deskCtx'), expr(`n = ${form}`), when1('n', seats(m), 'm')], m, rng, [seats(m) / 2, m + 1])
  }
  // 课本的列表：桌子张数 1、2、3、4……，可坐人数缺一格
  const ks = side === 1 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]
  const ask = rng.int(3, ks.length - 1)
  const rows: (number | LStr | null)[][] = [
    [key('m5.let.t.desks'), ...ks],
    [key('m5.let.t.seats'), ...ks.map((k, i) => (i === ask ? null : seats(k)))],
  ]
  return numQ(AXB, d, `desk${side}-table-${ask}`, [text(`m5.let.ab.desk${side}`), { kind: 'stat-table', rows, head: 'col' }, text('m5.let.ab.deskTable')], seats(ks[ask]!), rng, [seats(ks[ask]!) + 2, 4 * ks[ask]!], 'numpad')
}

/** 做一做 1 的数列（第 3 档加 3, 6, 9, 12 与 5, 9, 13, 17） */
interface Seq {
  s: number[]
  f: (n: number) => number
  form?: string
  wrong?: string[]
}
const SEQS: Seq[] = [
  { s: [1, 2, 3, 4], f: (n) => n },
  { s: [2, 4, 6, 8], f: (n) => 2 * n, form: '2n', wrong: ['n + 2', '2n + 2', 'n²'] },
  { s: [1, 3, 5, 7], f: (n) => 2 * n - 1, form: '2n - 1', wrong: ['2n + 1', 'n + 2', '2n'] },
  { s: [1, 4, 9, 16], f: (n) => n * n, form: 'n²', wrong: ['2n', '4n', 'n + 3'] },
]
const SEQS_MORE: Seq[] = [
  { s: [3, 6, 9, 12], f: (n) => 3 * n, form: '3n', wrong: ['n + 3', '3n + 3', '3n - 1'] },
  { s: [5, 9, 13, 17], f: (n) => 4 * n + 1, form: '4n + 1', wrong: ['5n', 'n + 4', '4n'] },
]
function seqQ(d: Difficulty, rng: RNG): Question {
  const sq = d === 3 && rng.chance(0.4) ? rng.pick(SEQS_MORE) : rng.pick(SEQS)
  const list = sq.s.join(', ')
  const kind = sq.form ? rng.int(0, 2) : rng.int(0, 1)
  // 「2, 4, 6, 8, ?」的「?」会和前一个数连着读成「8几」，所以问「下一个数」
  if (kind === 0) return numQ(AXB, d, `seqNext-${list}`, [text('m5.let.ab.seqNext'), expr(`${list}, …`)], sq.f(5), rng, [sq.f(5) + 1, sq.s[3]! + 1])
  if (kind === 1) {
    const k = rng.int(6, 10)
    return numQ(AXB, d, `seqNth-${list}-${k}`, [text('m5.let.ab.seqNth', { nth: ord(k) }), expr(`${list}, …`)], sq.f(k), rng, [sq.f(k - 1), sq.f(k) + 1])
  }
  return pickQ(AXB, d, `seqN-${list}`, [text('m5.let.ab.seqN'), expr(`${list}, …`)], sq.form!, sq.wrong!, rng)
}

/** 练习十二 1：圆片第一排 2 个、第二排 4 个……（第 n 排 2n 个；最后一排 100 个，一共 50 排） */
const DISC_FIG: StemPart = { kind: 'pattern-dots', figs: [{ t: 'rows', counts: [2, 4, 6, 8] }] }
function discQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 2)
  const stem: StemPart[] = [text('m5.let.ab.disc'), DISC_FIG]
  if (kind === 0) return pickQ(AXB, d, 'discN', [...stem, text('m5.let.ab.discN')], '2n', ['n + 2', '2n + 2', 'n²'], rng)
  if (kind === 1) {
    const k = rng.chance(0.4) ? 100 : rng.pick([20, 40, 60, 80])
    return numQ(AXB, d, `discRows-${k}`, [...stem, text('m5.let.ab.discRows', { k })], k / 2, rng, [k, k - 2, k / 2 + 1])
  }
  const k = rng.int(5, 10)
  return numQ(AXB, d, `discNth-${k}`, [...stem, text('m5.let.ab.discNth', { nth: ord(k) })], 2 * k, rng, [k + 2, 2 * k + 2])
}

/** 练习十二 4：小正方体竖着一个一个摞起来放在桌面上，露在外面的面 5、9、13……（4n + 1） */
const CUBE_FIG: StemPart = { kind: 'cube-solids', items: [1, 2, 3, 4].map((h) => ({ rows: [[h]] })) }
function cubeQ(d: Difficulty, rng: RNG): Question {
  const stem: StemPart[] = [text('m5.let.ab.cube'), CUBE_FIG]
  if (rng.chance(0.55)) {
    const k = rng.chance(0.4) ? 7 : rng.int(5, 10)
    return numQ(AXB, d, `cubeK-${k}`, [...stem, text('m5.let.ab.cubeK', { k })], 4 * k + 1, rng, [5 * k, 4 * k, 6 * k])
  }
  return pickQ(AXB, d, 'cubeN', [...stem, text('m5.let.ab.cubeN')], '4n + 1', ['5n', '4n', '6n - 1'], rng)
}

/** 练习十一 7 (2)：一张桌子 120 元、一把椅子 m 元，买一张桌子和 4 把椅子（120 + 4m；m = 80 → 440） */
function chairQ(d: Difficulty, rng: RNG): Question {
  const [p, k] = rng.chance(0.4) ? [120, 4] : [rng.pick([120, 150, 200]), rng.pick([4, 6])]
  if (rng.chance(0.5)) return pickQ(AXB, d, `chairs-${p}-${k}`, [text('m5.let.ab.chairs', { p, k })], `${p} + ${k}m`, [`${p + k}m`, `${k}(${p} + m)`, `${p}m + ${k}`], rng)
  const m = rng.chance(0.4) ? 80 : rng.pick([50, 60, 70])
  return numQ(AXB, d, `chairsV-${p}-${k}-${m}`, [text('m5.let.ab.chairsV', { p, k, m })], p + k * m, rng, [p + m, k * (p + m), p * k + m])
}

/** 练习十二 6：多边形和从一个顶点出发的对角线（虚线） */
const DIAG_FIG: StemPart = {
  kind: 'geo',
  alt: '平行四边形、五边形、六边形，从一个顶点分别画出了 1 条、2 条、3 条对角线',
  figs: [
    {
      w: 4,
      h: 3.2,
      px: 20,
      items: [
        { t: 'poly', pts: [[1, 0], [4, 0], [3, 3.2], [0, 3.2]] },
        { t: 'line', a: [1, 0], b: [3, 3.2], dash: true },
      ],
    },
    {
      w: 4,
      h: 3.8,
      px: 20,
      items: [
        { t: 'poly', pts: [[2, 0], [4, 1.45], [3.24, 3.8], [0.76, 3.8], [0, 1.45]] },
        { t: 'line', a: [0, 1.45], b: [4, 1.45], dash: true },
        { t: 'line', a: [0, 1.45], b: [3.24, 3.8], dash: true },
      ],
    },
    {
      w: 4,
      h: 3.46,
      px: 20,
      items: [
        { t: 'poly', pts: [[1, 0], [3, 0], [4, 1.73], [3, 3.46], [1, 3.46], [0, 1.73]] },
        { t: 'line', a: [0, 1.73], b: [3, 0], dash: true },
        { t: 'line', a: [0, 1.73], b: [4, 1.73], dash: true },
        { t: 'line', a: [0, 1.73], b: [3, 3.46], dash: true },
      ],
    },
  ],
}
function diagQ(d: Difficulty, rng: RNG): Question {
  const stem: StemPart[] = [text('m5.let.ab.diag'), DIAG_FIG]
  const kind = d === 3 ? rng.int(0, 2) : rng.int(0, 1)
  if (kind === 0) {
    const k = rng.pick([7, 8, 9, 10, 12])
    return numQ(AXB, d, `diagK-${k}`, [...stem, text('m5.let.ab.diagK', { poly: key(`m5.let.poly.${k}`) })], k - 3, rng, [k - 2, k - 1, k])
  }
  if (kind === 1) return pickQ(AXB, d, 'diagN', [...stem, text('m5.let.ab.diagN')], 'n - 3', ['n - 2', 'n - 1', 'n + 3'], rng)
  const k = rng.pick([5, 6, 7, 8])
  return numQ(AXB, d, `diagAll-${k}`, [...stem, text('m5.let.ab.diagAll', { poly: key(`m5.let.poly.${k}`) })], (k * (k - 3)) / 2, rng, [k * (k - 3), k - 3, k])
}

/** *探秘百数表：框出一个「田」字形的四个数（左上 x、右上 x + 1、左下 x + 10、右下 x + 11） */
function hundredQ(d: Difficulty, rng: RNG): Question {
  const x = rng.int(0, 7) * 10 + rng.int(1, 9)
  const row = Math.floor((x - 1) / 10) * 10 + 1
  const start = row > 1 ? row - 10 : row
  const chart: StemPart = { kind: 'hundred-chart', start, count: 30, boxed: [x, x + 1, x + 10, x + 11] }
  const kind = d === 3 ? rng.int(0, 2) : rng.int(0, 1)
  if (kind === 0) return numQ(AXB, d, `hundredSum-${x}`, [text('m5.let.ab.hundred'), chart, text('m5.let.ab.hundredSum')], 2 * x + 11, rng, [2 * x + 10, 2 * x + 12, x + 11])
  if (kind === 1) {
    const pos = rng.pick(['tr', 'bl', 'br'] as const)
    const right = { tr: 'a + 1', bl: 'a + 10', br: 'a + 11' }[pos]
    const pool = ['a + 1', 'a + 10', 'a + 11', 'a + 9'].filter((w) => w !== right)
    return pickQ(AXB, d, `hundredPos-${pos}-${x}`, [text('m5.let.ab.hundred'), chart, text('m5.let.ab.hundredPos', { pos: key(`m5.let.ab.pos.${pos}`) })], right, pool, rng)
  }
  return pickQ(AXB, d, `hundredAll-${x}`, [text('m5.let.ab.hundred'), chart, text('m5.let.ab.hundredAll')], '2a + 11', ['2a + 10', 'a + 11', '2a + 12'], rng)
}

/** 练习十二 5：棋子（第 1、2、3 幅是 2 行 3 列、3 行 4 列、4 行 5 列，左下角是黑棋的台阶） */
const STONE_FIG: StemPart = { kind: 'pattern-dots', figs: [2, 3, 4].map((r): PatternFig => ({ t: 'stones', r })), more: true, numbered: true }
function stoneQ(d: Difficulty, rng: RNG): Question {
  const stem: StemPart[] = [text('m5.let.ab.stone'), STONE_FIG]
  const kind = rng.int(0, 3)
  if (kind <= 1) {
    const j = rng.chance(0.4) ? 15 : rng.int(4, 8)
    const black = ((j + 1) * (j + 2)) / 2
    const all = (j + 1) * (j + 2)
    if (kind === 0) return numQ(AXB, d, `stoneBlack-${j}`, [...stem, text('m5.let.ab.stoneBlack', { nth: ord(j) })], black, rng, [all, black - (j + 1)])
    return numQ(AXB, d, `stoneAll-${j}`, [...stem, text('m5.let.ab.stoneAll', { nth: ord(j) })], all, rng, [black, (j + 1) * (j + 1)])
  }
  // 「1 + 2 + … + 100」朗读时省略号两边的加号连成「加加」，所以题目用文字说「从 1 一直加到 100」
  if (kind === 2) return numQ(AXB, d, 'sum100', [...stem, text('m5.let.ab.sum100')], 5050, rng, [5000, 10100, 5100], 'numpad')
  // 两个括号连乘照读是「括号……括号括号……括号」，这里把乘号写出来
  return pickQ(AXB, d, 'stoneN', [...stem, text('m5.let.ab.stoneN')], '(n + 1) × (n + 2)', ['n × (n + 1)', '(n + 1) × (n + 1)', '2n + 2'], rng)
}

defineGenerator(AXB, (d, rng) => {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.62) return deskQ(d, rng, 1)
    return seqQ(d, rng)
  }
  if (d === 2) {
    if (r < 0.2) return deskQ(d, rng, 2)
    if (r < 0.33) return discQ(d, rng)
    if (r < 0.46) return cubeQ(d, rng)
    if (r < 0.58) return chairQ(d, rng)
    if (r < 0.7) return diagQ(d, rng)
    if (r < 0.82) return hundredQ(d, rng)
    if (r < 0.92) return seqQ(d, rng)
    return deskQ(d, rng, 1)
  }
  if (r < 0.35) return stoneQ(d, rng)
  if (r < 0.55) return diagQ(d, rng)
  if (r < 0.75) return hundredQ(d, rng)
  if (r < 0.88) return seqQ(d, rng)
  return deskQ(d, rng, 2)
})

// ═════════════════════════════════════════════════════════════
// 用字母表示 ax+bx 的数量关系（例 5 + 试一试，p64–65；做一做 2–4，p65；练习十二 2、3，练习十三 5、7、8）
// 第 1 档：例 5 复兴号每小时 320 千米，甲到乙 a 小时、乙到丙 b 小时（s = 320(a + b)；320a + 320b = 320(a + b)）、
//          试一试 a = 2、b = 3 → 1600，s = 2240、a = 3 → b = 4；做一做 2 快递（135x、15x、x = 3 → 45）、3 隧道（150(a + b)、
//          a = 10、b = 9 → 2850）、4 冰壶单循环赛（10 支队伍 45 场）；练习十三 5 的计算（2a + 6a、11x - 9x、8y - y、b + 7b）。
// 第 2 档：练习十二 3（和谐号、复兴号相向而行：520x、120x）、练习十三 8（游轮：36t、648 - 36t 与求值）、
//          练习十二 2 的求值（充电费 + 装卸费）、合并的计算。
// 第 3 档：练习十二 2 的关系式（b = 0.36a + 200）、练习十三 7（华氏温度：30 ℃ ↔ 86 ℉，F = 1.8C + 32）、冰壶 a 支队伍（a(a - 1) ÷ 2）。
// ═════════════════════════════════════════════════════════════

/** 例 5：复兴号的路程（s = 320(a + b)） */
function trainQ(d: Difficulty, rng: RNG): Question {
  const v = d === 1 || rng.chance(0.5) ? 320 : rng.pick([300, 350])
  const kind = rng.int(0, 3)
  if (kind === 0) return pickQ(AXBX, d, `train-${v}`, [text('m5.let.bx.train', { v })], `s = ${v}(a + b)`, [`s = ${v}a + b`, `s = ${v} + a + b`, `s = ${v}ab`], rng)
  if (kind === 1) return pickQ(AXBX, d, `factor-${v}`, [text('m5.let.bx.factor'), expr(`${v}a + ${v}b`)], `${v}(a + b)`, [`${v}a + b`, `${2 * v}(a + b)`, `${v}ab`], rng)
  const [a, b] = rng.chance(0.4) ? [2, 3] : [rng.int(1, 5), rng.int(1, 5)]
  if (kind === 2) {
    const chain = rng.chance(0.5)
    const stem = chain ? [when2('a', a, 'b', b, 's'), expr(`s = ${v}(a + b) = ${v} × (${a} + ${b}) = ?`)] : [expr(`s = ${v}(a + b)`), when2('a', a, 'b', b, 's')]
    return numQ(AXBX, d, `trainS-${v}-${a}-${b}-${chain ? 1 : 0}`, stem, v * (a + b), rng, [v * a + b, v * a * b], chain ? 'numpad' : undefined)
  }
  const [a2, b2] = rng.chance(0.4) && v === 320 ? [3, 4] : [rng.int(1, 5), rng.int(1, 6)]
  return numQ(AXBX, d, `trainB-${v}-${a2}-${b2}`, [expr(`s = ${v}(a + b)`), when2('s', v * (a2 + b2), 'a', a2, 'b')], b2, rng, [a2 + b2, b2 + 1])
}

/** 做一做 2：张叔叔每天投递 75 份、王叔叔 60 份，每份 x 元（135x、15x，x = 3 → 45） */
const COURIER: [number, number][] = [
  [75, 60],
  [80, 65],
  [90, 70],
  [85, 60],
  [72, 56],
]
function courierQ(d: Difficulty, rng: RNG): Question {
  const [p, q] = rng.chance(0.4) ? [75, 60] : rng.pick(COURIER)
  const intro = text('m5.let.bx.courier', { p, q })
  const kind = rng.int(0, 2)
  if (kind === 0) return pickQ(AXBX, d, `courierSum-${p}-${q}`, [intro, text('m5.let.bx.courierSum')], `${p + q}x`, [`${p + q} + x`, `${p}x + ${q}`, `${p - q}x`], rng)
  if (kind === 1) return pickQ(AXBX, d, `courierDiff-${p}-${q}`, [intro, text('m5.let.bx.courierDiff')], `${p - q}x`, [`${p + q}x`, `${p}x - ${q}`, `${p - q} + x`], rng)
  const x = rng.chance(0.4) ? 3 : rng.int(2, 5)
  return numQ(AXBX, d, `courierVal-${p}-${q}-${x}`, [intro, text('m5.let.bx.courierVal', { x })], (p - q) * x, rng, [(p + q) * x, p - q + x, (p - q) * x + 10])
}

/** 做一做 3：两个工程队从隧道两端同时开凿，150 天完工（s = 150(a + b)；a = 10、b = 9 → 2850） */
function tunnelQ(d: Difficulty, rng: RNG): Question {
  const t = rng.chance(0.5) ? 150 : rng.pick([100, 120])
  const intro = text('m5.let.bx.tunnel', { t })
  if (rng.chance(0.45)) return pickQ(AXBX, d, `tunnel-${t}`, [intro, text('m5.let.bx.tunnelS')], `s = ${t}(a + b)`, [`s = ${t}a + b`, `s = ${t} + a + b`, `s = ${t}ab`], rng)
  const [a, b] = t === 150 && rng.chance(0.4) ? [10, 9] : [rng.int(8, 12), rng.int(6, 10)]
  return numQ(AXBX, d, `tunnelV-${t}-${a}-${b}`, [intro, text('m5.let.bx.tunnelV', { a, b })], t * (a + b), rng, [t * a + b, t * a * b, t + a + b])
}

/** 做一做 4：冰壶单循环赛，每两支队伍之间比一场（10 支 → 45 场；a 支 → a(a - 1) ÷ 2） */
function curlingQ(d: Difficulty, rng: RNG): Question {
  if (d === 3 && rng.chance(0.5)) return pickQ(AXBX, d, 'curlingA', [text('m5.let.bx.curlingA')], 'a × (a - 1) ÷ 2', ['a × (a - 1)', 'a × a', 'a × a ÷ 2'], rng)
  const n = d === 1 ? rng.pick([4, 5, 6, 10]) : rng.int(4, 10)
  return numQ(AXBX, d, `curling-${n}`, [text('m5.let.bx.curling', { n })], (n * (n - 1)) / 2, rng, [n * (n - 1), n * n, n - 1])
}

/** 练习十三 5：计算 2a + 6a、11x - 9x、8y - y、b + 7b（合成一项；干扰项：丢了字母、系数相乘、写成平方、b 当成 0b） */
const CALC_BOOK: [number, '+' | '-', number, string][] = [
  [2, '+', 6, 'a'],
  [11, '-', 9, 'x'],
  [8, '-', 1, 'y'],
  [1, '+', 7, 'b'],
]
function calcQ(d: Difficulty, rng: RNG): Question {
  const base: [number, '+' | '-', number, string] = rng.chance(0.5)
    ? rng.pick(CALC_BOOK)
    : [rng.int(2, 12), rng.pick(['+', '-'] as const), rng.int(1, 9), rng.pick(['a', 'b', 'x', 'y'])]
  const [p0, op, q, L] = base
  // 减出来至少是 2（得数是 1 的话正确项就成了单独一个字母）
  const p = op === '-' && p0 - q < 2 ? q + 2 + (p0 % 4) : p0
  const v = op === '+' ? p + q : p - q
  const e = `${term(p, L)} ${op} ${term(q, L)}`
  const right = term(v, L)
  const wrongs: string[] = []
  if (p === 1 || q === 1) wrongs.push(op === '-' ? String(p) : `${p === 1 ? q : p}${L}`) // 8y - y = 8、b + 7b = 7b
  wrongs.push(String(v)) // 丢了字母
  wrongs.push(op === '+' ? `${term(p * q, L)}` : `${term(p + q, L)}`) // 系数乘了、减号当成加号
  wrongs.push(`${term(v, L)}²`)
  return pickQ(AXBX, d, `calc-${e}`, [text('m5.let.bx.calc'), expr(`${e} = ?`)], right, wrongs.filter((w) => w !== right), rng)
}

/** 练习十二 3：和谐号每小时 200 千米、复兴号每小时 320 千米，从两站同时出发相向而行，x 小时后相遇（520x、120x） */
const MEET: [number, number][] = [
  [200, 320],
  [250, 350],
  [200, 300],
]
function meetQ(d: Difficulty, rng: RNG): Question {
  const [p, q] = rng.chance(0.5) ? [200, 320] : rng.pick(MEET)
  const intro = text('m5.let.bx.meet', { p, q })
  if (rng.chance(0.5)) return pickQ(AXBX, d, `meetSum-${p}-${q}`, [intro, text('m5.let.bx.meetSum')], `${p + q}x`, [`${p + q} + x`, `${p}x + ${q}`, `${q - p}x`], rng)
  return pickQ(AXBX, d, `meetDiff-${p}-${q}`, [intro, text('m5.let.bx.meetDiff')], `${q - p}x`, [`${p + q}x`, `${q}x - ${p}`, `${q - p} + x`], rng)
}

/** 练习十三 8：重庆到宜昌的水路全程 648 千米，游轮每小时 36 千米（36t、648 - 36t；t = 10 → 360，t = 12 → 216） */
function cruiseQ(d: Difficulty, rng: RNG): Question {
  const intro = text('m5.let.bx.cruise')
  const kind = rng.int(0, 3)
  if (kind === 0) return pickQ(AXBX, d, 'cruiseFrom', [intro, text('m5.let.bx.cruiseFrom')], '36t', ['648 - 36t', '36 + t', '648 - t'], rng)
  if (kind === 1) return pickQ(AXBX, d, 'cruiseTo', [intro, text('m5.let.bx.cruiseTo')], '648 - 36t', ['36t', '648 + 36t', '648 - t'], rng)
  if (kind === 2) {
    const t = rng.chance(0.4) ? 10 : rng.int(5, 15)
    return numQ(AXBX, d, `cruiseFromV-${t}`, [intro, text('m5.let.bx.cruiseFromV', { t })], 36 * t, rng, [648 - 36 * t, 36 + t])
  }
  const t = rng.chance(0.4) ? 12 : rng.int(5, 17)
  return numQ(AXBX, d, `cruiseToV-${t}`, [intro, text('m5.let.bx.cruiseToV', { t })], 648 - 36 * t, rng, [36 * t, 648 - t])
}

/** 练习十二 2：电动货车每行驶 100 千米充电 36 元，装卸货物 200 元（a = 500 → 380；b = 0.36a + 200） */
function truckQ(d: Difficulty, rng: RNG): Question {
  const intro = text('m5.let.bx.truck')
  if (d === 3 && rng.chance(0.5)) return pickQ(AXBX, d, 'truckRel', [intro, text('m5.let.bx.truckRel')], 'b = 0.36a + 200', ['b = 36a + 200', 'b = 0.36a', 'b = 0.36(a + 200)'], rng)
  const a = rng.pick([100, 200, 300, 500])
  return numQ(AXBX, d, `truckV-${a}`, [intro, text('m5.let.bx.truckV', { a })], (36 * a) / 100 + 200, rng, [(36 * a) / 100, 36 * a + 200, 236])
}

/** 练习十三 7：华氏温度 = 摄氏温度 × 1.8 + 32（30 ℃ ↔ 86 ℉） */
function tempQ(d: Difficulty, rng: RNG): Question {
  const intro = text('m5.let.bx.temp')
  const kind = rng.int(0, 2)
  if (kind === 0) {
    const c = rng.pick([0, 10, 20, 25, 30, 35, 40])
    return numQ(AXBX, d, `tempF-${c}`, [intro, text('m5.let.bx.tempF', { c })], (c * 18) / 10 + 32, rng, [(c * 18) / 10, c + 32])
  }
  if (kind === 1) {
    const c = rng.pick([10, 20, 25, 30, 35, 40])
    const f = (c * 18) / 10 + 32
    return numQ(AXBX, d, `tempC-${f}`, [intro, text('m5.let.bx.tempC', { f })], c, rng, [f - 32, c + 10])
  }
  return pickQ(AXBX, d, 'tempRel', [intro, text('m5.let.bx.tempRel')], 'F = 1.8C + 32', ['F = 1.8(C + 32)', 'C = 1.8F + 32', 'F = 32C + 1.8'], rng)
}

defineGenerator(AXBX, (d, rng) => {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.32) return trainQ(d, rng)
    if (r < 0.52) return courierQ(d, rng)
    if (r < 0.68) return tunnelQ(d, rng)
    if (r < 0.76) return curlingQ(d, rng)
    return calcQ(d, rng)
  }
  if (d === 2) {
    if (r < 0.2) return meetQ(d, rng)
    if (r < 0.45) return cruiseQ(d, rng)
    if (r < 0.55) return truckQ(d, rng)
    if (r < 0.75) return calcQ(d, rng)
    if (r < 0.85) return trainQ(d, rng)
    if (r < 0.93) return courierQ(d, rng)
    return curlingQ(d, rng)
  }
  if (r < 0.3) return tempQ(d, rng)
  if (r < 0.45) return truckQ(d, rng)
  if (r < 0.65) return curlingQ(d, rng)
  if (r < 0.82) return cruiseQ(d, rng)
  return meetQ(d, rng)
})
