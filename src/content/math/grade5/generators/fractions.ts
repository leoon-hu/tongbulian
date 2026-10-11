// 五下「4 分数的意义和性质」前 9 个知识点的生成器（五年级数学 H）。
import type { ChainArc, ChainTerm, Difficulty, FracPic, FracShapeKind, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { mixed } from '@/engine/fraction'

// ─────────────────────────────────────────────────────────────
// 五下第四单元「分数的意义和性质」（课本 p45–82，平台当前的旧版五下；「分数和小数的互化」由 fracdec.ts 出）：
//   1. 分数的意义——分数的产生、分数的意义（例 1：一盒糖 12 颗分成 2 / 3 / 4 / 6 份，单位“1”、分数单位；做一做看图写分数、
//      一排物体、分数墙）、分数与除法（例 2 / 例 3 月饼平均分、例 4 求一个数是另一个数的几分之几；做一做、练习十二）。
//   2. 真分数和假分数（例 1、例 2：比 1 小 / 大于或等于 1，带分数；例 3 假分数化成整数或带分数；练习十三）。
//   3. 分数的基本性质（例 1 三张正方形纸 1/2 = 2/4 = 4/8、箭头图；例 2 化成分母是 12 的分数；练习十四）。
//   4. 约分——最大公因数（例 1 集合图、例 2 列举 / 圈一圈、例 3 铺地砖；练习十五）、约分（例 4、最简分数；练习十六）。
//   5. 通分——最小公倍数（例 1 集合图、例 2、例 3 用长方形地砖铺正方形；练习十七）、通分（例 4 同分母 / 同分子比大小、
//      例 5 通分；练习十八）。
// 知识点按书签小标题设：分数的意义 / 分数与除法 / 真分数和假分数 / 假分数化成整数或带分数 / 分数的基本性质 / 最大公因数 /
// 约分 / 最小公倍数 / 通分，共 9 个。
// 规矩：分数、带分数、一串数、文字的答案一律选项卡，数字键盘只答整数（分子、分母、个数、最大公因数、最小公倍数……）；
// 「约分」之前的知识点答案不化简（课本 30/100 米、25/50），选项里不放和答案等值的另一种写法；题目明说「最简分数」的
// 才拿没约完的等值分数当干扰项。干扰项照课本暴露的错法造（分子分母颠倒、把没涂色的份数当分子、商和余数颠倒、
// 约分没约完、通分只改分母……）。分数从课本的数和小的池子里取（每个不同的分数都是一条朗读音频）。
// 带分数写成 mixed(2, 1, 5)（界面画成整数紧挨着上下两层的分数，读「二又五分之一」）。
// 要填数的分数（「2/3 = ?/12」）画成分数链（frac-chain，不朗读，题干文字把要问的说全），集合图画成 venn。
// ─────────────────────────────────────────────────────────────

export const KP_MEANING = 'm5s2-05-meaning'
export const KP_DIVISION = 'm5s2-05-division'
export const KP_PROPER = 'm5s2-05-proper'
export const KP_MIXED = 'm5s2-05-mixed'
export const KP_PROPERTY = 'm5s2-05-property'
export const KP_GCF = 'm5s2-05-gcf'
export const KP_REDUCE = 'm5s2-05-reduce'
export const KP_LCM = 'm5s2-05-lcm'
export const KP_COMMON = 'm5s2-05-common'

type P = Record<string, LStr | number>
export const K = (k: string, p?: P): LStr => (p ? { k: `m5.frac.${k}`, p } : { k: `m5.frac.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: K(k, p) })
type Maker = (d: Difficulty, rng: RNG) => Question
type Table = Record<Difficulty, [number, Maker][]>

/** 按权重挑一种题 */
function pickBy(rng: RNG, table: [number, Maker][], d: Difficulty): Question {
  const total = table.reduce((s, [w]) => s + w, 0)
  let r = rng.next() * total
  for (const [w, make] of table) {
    if (r < w) return make(d, rng)
    r -= w
  }
  return table[table.length - 1]![1](d, rng)
}
const uniq = <X>(xs: X[]): X[] => [...new Set(xs)]
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)

// ═════════════════════════════════════════════════════════════
// 整数：因数、倍数、最大公因数、最小公倍数
// ═════════════════════════════════════════════════════════════

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}
export const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b
/** n 的全部因数（从小到大） */
export function factorsOf(n: number): number[] {
  const out: number[] = []
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i)
  return out
}
/** 一串数照课本用中文逗号隔开：「1，2，4」「12，24，36，…」 */
export const listText = (xs: (number | string)[]): string => xs.join('，')

// ═════════════════════════════════════════════════════════════
// 分数与带分数
// ═════════════════════════════════════════════════════════════

/** 分数 [分子, 分母] */
export type Frac = readonly [number, number]
export const fs = (n: number | string, d: number | string): string => `${n}/${d}`
export const fstr = (f: Frac): string => fs(f[0], f[1])
export const sameVal = (a: Frac, b: Frac): boolean => a[0] * b[1] === b[0] * a[1]
/** a 比 b：正数 a 大、负数 b 大、0 相等 */
export const cmpFrac = (a: Frac, b: Frac): number => a[0] * b[1] - b[0] * a[1]
export const simplest = (f: Frac): Frac => {
  const g = gcd(f[0], f[1])
  return [f[0] / g, f[1] / g]
}
export const isSimplest = (f: Frac): boolean => gcd(f[0], f[1]) === 1

/** 带分数 [整数部分, 分子, 分母]（分子 < 分母） */
export type Mix = readonly [number, number, number]
export const mstr = (m: Mix): string => mixed(m[0], m[1], m[2])
/** 带分数化成假分数 */
export const mixVal = (m: Mix): Frac => [m[0] * m[2] + m[1], m[2]]
/** 假分数化成带分数（分子不是分母的倍数）：商是整数部分、余数是分子、分母不变 */
export const toMix = (f: Frac): Mix => {
  const q = Math.floor(f[0] / f[1])
  return [q, f[0] - q * f[1], f[1]]
}

const okFrac = (f: Frac): boolean => Number.isInteger(f[0]) && Number.isInteger(f[1]) && f[0] >= 1 && f[1] >= 2 && f[0] <= 999 && f[1] <= 1000

/**
 * 分数干扰项（最多 count 个）：不合规的（分子 < 1、分母 < 2、太大）跳过；字面和答案、彼此都不同；
 * eq = false（只考数值，默认）时数值也和答案、彼此都不相等；eq = true（考写法：约成最简分数）时可以和答案等值。
 * 候选不够用分子、分母差一点的补。
 */
export function fracWrongs(correct: Frac, cands: (Frac | null | undefined)[], eq = false, count = 3): string[] {
  const out: Frac[] = []
  const push = (f: Frac | null | undefined): void => {
    if (!f || out.length >= count || !okFrac(f)) return
    if (f[0] === correct[0] && f[1] === correct[1]) return
    // 分子等于分母的（4/4）只在答案也是这样时才放
    if (f[0] === f[1] && correct[0] !== correct[1]) return
    if (!eq && sameVal(f, correct)) return
    if (out.some((o) => o[0] === f[0] && o[1] === f[1])) return
    if (!eq && out.some((o) => sameVal(o, f))) return
    out.push(f)
  }
  for (const c of cands) push(c)
  const [n, d] = correct
  for (const c of [[n + 1, d], [n, d + 1], [n + 2, d], [n - 1, d], [n, d - 1], [d, n], [n + 1, d + 1], [n, d + 2]] as Frac[]) push(c)
  return out.map(fstr)
}

const okMix = (m: Mix): boolean => m.every((x) => Number.isInteger(x)) && m[0] >= 1 && m[1] >= 1 && m[1] < m[2] && m[2] >= 2

/** 带分数的干扰项：同上；eq = true（考约成最简）时可以和答案等值（1 3/12 对 1 1/4） */
export function mixWrongs(correct: Mix, cands: (Mix | null | undefined)[], eq = false, count = 3): string[] {
  const out: Mix[] = []
  const cv = mixVal(correct)
  const push = (m: Mix | null | undefined): void => {
    if (!m || out.length >= count || !okMix(m)) return
    if (m[0] === correct[0] && m[1] === correct[1] && m[2] === correct[2]) return
    if (!eq && sameVal(mixVal(m), cv)) return
    if (out.some((o) => o[0] === m[0] && o[1] === m[1] && o[2] === m[2])) return
    if (!eq && out.some((o) => sameVal(mixVal(o), mixVal(m)))) return
    out.push(m)
  }
  for (const c of cands) push(c)
  const [w, n, d] = correct
  for (const c of [[w + 1, n, d], [w, n + 1, d], [w, n - 1, d], [w - 1, n, d], [w + 2, n, d], [w, n, d + 1]] as Mix[]) push(c)
  return out.map(mstr)
}

/** 假分数化成带分数的常见错法：商和余数颠倒（7/3 → 1 2/3）、分母写成被除数（2 1/7）、商多 1、商少 1、余数写成分母减余数 */
export function mixCands(f: Frac): Mix[] {
  const [q, r, d] = toMix(f)
  return [[r, q, d], [q, r, f[0]], [q + 1, r, d], [q - 1, r, d], [q, d - r, d]]
}

// ═════════════════════════════════════════════════════════════
// 出题骨架
// ═════════════════════════════════════════════════════════════

/** 分数答案的选择题 */
function fracQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: Frac, cands: (Frac | null | undefined)[], rng: RNG, o: { eq?: boolean; type?: QuestionType } = {}): Question {
  return labelQuestion({ kpId, type: o.type ?? 'fraction', difficulty: d, sig, stem, correct: fstr(correct), distractors: fracWrongs(correct, cands, o.eq), rng })
}

/** 带分数答案的选择题 */
function mixQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: Mix, cands: (Mix | null | undefined)[], rng: RNG, eq = false): Question {
  return labelQuestion({ kpId, type: 'fraction', difficulty: d, sig, stem, correct: mstr(correct), distractors: mixWrongs(correct, cands, eq), rng })
}

/** 整数答案（数字键盘或选项）；numpad = 题干里有要填的「?」（分数链、算式），只用数字键盘，按的数填进去 */
function intQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[] = [], o: { type?: QuestionType; numpad?: boolean; max?: number } = {}): Question {
  return numberQuestion({
    kpId,
    type: o.type ?? 'fraction',
    difficulty: d,
    sig,
    stem,
    value,
    rng,
    min: 1,
    max: o.max ?? Math.max(20, value * 2 + 10),
    smart: uniq(smart.filter((x) => Number.isInteger(x) && x >= 1 && x !== value)),
    ...(o.numpad ? { input: 'numpad' as const } : {}),
  })
}

/** 判断题：……，对吗？（对 / 不对） */
function tfQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], ok: boolean, rng: RNG, type: QuestionType = 'fraction'): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: K(ok ? 'yes' : 'no'), distractors: [K(ok ? 'no' : 'yes')], rng })
}

/** 词条选项的选择题（干扰项去重、去掉和答案一样的） */
function keyQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, wrongs: LStr[], rng: RNG, type: QuestionType = 'fraction'): Question {
  const key = JSON.stringify(correct)
  const ds = uniq(wrongs.map((w) => JSON.stringify(w)))
    .filter((w) => w !== key)
    .slice(0, 3)
    .map((w) => JSON.parse(w) as LStr)
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: ds, rng })
}

/** 几个字面不同的选项（一串数、算式）：去重、去掉和答案一样的，最多 3 个 */
function strQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: string, wrongs: string[], rng: RNG, type: QuestionType = 'fraction'): Question {
  const ds = uniq(wrongs.filter((w) => w !== correct)).slice(0, 3)
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: ds, rng })
}

/** 比一比，填 >、< 或 =（sign：正数左边大） */
function cmpQ(kpId: string, d: Difficulty, sig: string, a: string, b: string, sign: number, rng: RNG, type: QuestionType, key = 'cmp'): Question {
  const correct = sign > 0 ? '>' : sign < 0 ? '<' : '='
  return labelQuestion({ kpId, type, difficulty: d, sig, stem: [T(key), { kind: 'expr', expr: `${a} ○ ${b}` }], correct, distractors: ['>', '<', '='].filter((s) => s !== correct), rng })
}

// ── 图 ──

const picPart = (...items: FracPic[]): StemPart => ({ kind: 'frac-shape', items })
/** 签名里的图形：形状 + 格子行数 */
const shapeSig = (p: FracPic): string => `${p.shape}${p.rows ? `x${p.rows}` : ''}`

/** 能平均分成 n 份的图形（课本做一做 1 的长方形切片、椭圆、方格、正方形的对角线分法、正六边形） */
function evenShapes(n: number): { shape: FracShapeKind; rows?: number }[] {
  const out: { shape: FracShapeKind; rows?: number }[] = []
  if (n >= 2 && n <= 12) out.push({ shape: 'circle' })
  if (n >= 2 && n <= 10) out.push({ shape: 'rect' })
  const gridRows: Record<number, number> = { 4: 2, 6: 2, 8: 2, 9: 3, 10: 2, 12: 3 }
  if (gridRows[n]) out.push({ shape: n === 4 || n === 9 ? 'square' : 'rect', rows: gridRows[n] })
  if (n === 4 || n === 8) out.push({ shape: 'square-diag' })
  if (n === 5 || n === 6 || n === 8) out.push({ shape: 'polygon' })
  return out
}

/** 一幅平均分成 n 份、涂 m 份的图（方格随便涂几格，圆、正多边形、米字挨着涂，竖条从左往右涂） */
function evenPic(n: number, m: number, rng: RNG): FracPic {
  const { shape, rows } = rng.pick(evenShapes(n))
  let shaded: number[]
  if (rows && rows > 1) shaded = rng.shuffle(range(n)).slice(0, m).sort((a, b) => a - b)
  else if (shape === 'circle' || shape === 'polygon' || shape === 'square-diag') {
    const s = rng.int(0, n - 1)
    shaded = range(m).map((i) => (s + i) % n).sort((a, b) => a - b)
  } else shaded = range(m)
  return { shape, parts: n, shaded, ...(rows ? { rows } : {}) }
}

/** 几个一样的图形：涂了 m 份（每个平均分成 n 份）——前面整个涂满的画成 whole，最后一个涂 r 份（m 是 n 的倍数时最后一个也涂满） */
function impPic(n: number, m: number, shape: FracShapeKind): FracPic {
  let w = Math.floor(m / n)
  let r = m - w * n
  if (r === 0) {
    w -= 1
    r = n
  }
  return { shape, parts: n, shaded: range(r), ...(w > 0 ? { whole: w } : {}) }
}

// ── 分数链（frac-chain）与集合图（venn） ──

const fr = (n: number | string, d: number | string): ChainTerm => ({ n: String(n), d: String(d) })
const tx = (t: string): ChainTerm => ({ t })
const mx = (w: number | string, n: number | string, d: number | string): ChainTerm => ({ w: String(w), n: String(n), d: String(d) })
const chain = (terms: ChainTerm[], arcs?: ChainArc[]): StemPart => ({ kind: 'frac-chain', terms, ...(arcs ? { arcs } : {}) })

/** 集合图：left / right 是两个圈上面的名字，三块里写的数；ask = 这一块画「?」 */
function vennPart(left: LStr, right: LStr, only1: (number | string)[], both: (number | string)[], only2: (number | string)[], caption: LStr, ask?: 'only1' | 'both' | 'only2'): StemPart {
  return { kind: 'venn', left, right, only1: only1.map(String), both: both.map(String), only2: only2.map(String), caption, ...(ask ? { ask } : {}) }
}

// ═════════════════════════════════════════════════════════════
// 1. 分数的意义（p45–48：分数的产生、例 1、做一做 1–4；练习十一）
// ═════════════════════════════════════════════════════════════

/** 做一做 1、引入的 1/4：把一个图形看作单位“1”，涂色部分用分数表示（干扰：颠倒、涂色比没涂色、没涂色部分） */
function meaningPicQ(d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? rng.pick([3, 4, 5, 6, 8, 9, 10]) : rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 12])
  const m = rng.int(1, n - 1)
  const pic = evenPic(n, m, rng)
  return fracQ(KP_MEANING, d, `pic-${shapeSig(pic)}-${n}-${m}`, [T('pic'), picPart(pic)], [m, n], [[n, m], [m, n - m], [n - m, n], [m + 1, n]], rng)
}

/** 例 1：一些物体看作一个整体（一盒糖 12 颗、一盒月饼 8 个……），平均分成 k 份 */
const SETS = [
  { id: 'candy', icon: '🍬', total: 12, ks: [2, 3, 4, 6] },
  { id: 'cake', icon: '🥮', total: 8, ks: [2, 4] },
  { id: 'apple', icon: '🍎', total: 6, ks: [2, 3] },
  { id: 'peach', icon: '🍑', total: 10, ks: [2, 5] },
  { id: 'pencil', icon: '✏️', total: 9, ks: [3] },
] as const
export const SET_IDS = SETS.map((s) => s.id)

/** 例 1：把一盒糖看作单位“1”，平均分成 k 份，j 份是这盒糖的几分之几（干扰：颠倒、用总个数作分母、没涂的份数、一份） */
function setQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.pick(SETS)
  const k = rng.pick(s.ks)
  const j = rng.int(1, k - 1)
  const per = s.total / k
  const stem: StemPart[] = [T('set', { a: K(`set.${s.id}.one`), b: K(`set.${s.id}.this`), k, j }), { kind: 'frac-set', icon: s.icon, groups: k, per, shaded: j }]
  return fracQ(kpId, d, `set-${s.id}-${k}-${j}`, stem, [j, k], [[k, j], [j, s.total], [k - j, k], [1, k]], rng)
}

/** 做一做 2 / 3：一排 n 个圆点看作单位“1”，涂色的 j 个是它的几分之几 */
function rowQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(4, 9)
  const j = rng.int(1, n - 1)
  const stem: StemPart[] = [T('row', { n, j }), { kind: 'frac-set', icon: 'dot', groups: n, per: 1, shaded: j, boxed: false }]
  return fracQ(kpId, d, `row-${n}-${j}`, stem, [j, n], [[n, j], [j, n - j], [n - j, n], [1, n]], rng)
}

/** 分数单位：课本例 1 与练习十一 3 的分数 */
const UNIT_FRACS: Frac[] = [[2, 3], [3, 4], [5, 6], [2, 7], [3, 5], [5, 9], [3, 8], [7, 10], [5, 12], [4, 9], [2, 5], [7, 8]]
const UNIT_FRACS2: Frac[] = [[4, 15], [11, 18], [7, 100], [9, 20], [13, 50], [3, 10], [7, 12], [17, 25]]

/** 例 1 后：m/n 的分数单位是多少（干扰：1/分子、分数本身、颠倒） */
function unitOfQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const f = rng.pick(d === 1 ? UNIT_FRACS : [...UNIT_FRACS, ...UNIT_FRACS2])
  return fracQ(kpId, d, `unit-${fstr(f)}`, [T('unitOf', { f: fstr(f) })], [1, f[1]], [[1, f[0]], f, [f[1], f[0]], [1, f[1] + 1]], rng)
}

/** 练习十一 3：m/n 里有几个 1/n（键盘） */
function unitCountQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const f = rng.pick(d === 1 ? UNIT_FRACS : [...UNIT_FRACS, ...UNIT_FRACS2])
  return intQ(kpId, d, `ucount-${fstr(f)}`, [T('unitCount', { f: fstr(f), u: fs(1, f[1]) })], f[0], rng, [f[1], f[1] - f[0], f[0] + 1], { max: Math.max(20, f[1] + 5) })
}

/** 做一做 4（分数墙）：k 个 1/n 是几分之几；improper = k 比 n 大（真分数和假分数例 2：4 个 1/3） */
function unitsMakeQ(kpId: string, d: Difficulty, rng: RNG, improper: boolean): Question {
  const den = improper ? rng.int(2, 9) : rng.int(3, 12)
  const k = improper ? rng.int(den + 1, den * 2 + 2) : rng.int(2, den - 1)
  return fracQ(kpId, d, `make-${k}-${den}`, [T('unitsMake', { k, u: fs(1, den) })], [k, den], [[den, k], [1, k * den], [k, den + k], [k + 1, den], [k - 1, den]], rng)
}

/** 做一做 4：1 里面有几个 1/n、几个 1/n 组成 1（键盘） */
function oneQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const den = rng.int(2, 12)
  const make = rng.chance(0.5)
  return intQ(kpId, d, `${make ? 'onemake' : 'onehas'}-${den}`, [T(make ? 'oneMake' : 'oneHas', { u: fs(1, den) })], den, rng, [den - 1, den + 1, 1, 10])
}

/** 练习十一 1：涂色的花占这些花的 j/k，没涂色的占几分之几 */
function restQ(d: Difficulty, rng: RNG): Question {
  const k = rng.pick([2, 3, 4, 5, 6])
  const per = rng.pick(k <= 4 ? [1, 2, 3] : [1, 2])
  const j = rng.int(1, k - 1)
  const stem: StemPart[] = [T('rest', { f: fs(j, k) }), { kind: 'frac-set', icon: '🌷', groups: k, per, shaded: j }]
  return fracQ(KP_MEANING, d, `rest-${j}-${k}-${per}`, stem, [k - j, k], [[j, k], [k - j, j], [1, k], [k - j, k + 1]], rng)
}

/** 练习十一 2：一包饼干平均分给 k 人，每人分到这包的几分之几 / 一包 t 块，每人几块 */
function biscuitQ(d: Difficulty, rng: RNG): Question {
  const k = rng.int(2, 6)
  if (rng.chance(0.5)) return fracQ(KP_MEANING, d, `bisf-${k}`, [T('biscuitFrac', { k })], [1, k], [[1, k + 1], [1, k - 1], [k - 1, k]], rng)
  const each = rng.int(2, 6)
  const t = each * k
  return intQ(KP_MEANING, d, `bisc-${t}-${k}`, [T('biscuitCount', { t, k })], each, rng, [t - k, k, each + 1])
}

/** 练习十一 4、真分数和假分数做一做 1：直线上箭头指的点用分数表示（units 个整份，每份平均分成 per 小格）；每一小格是几分之几 */
function lineQ(kpId: string, d: Difficulty, rng: RNG, units: 1 | 2): Question {
  const per = rng.pick(units === 1 ? [3, 4, 5, 6, 8, 10] : [2, 3, 4, 5, 6])
  if (units === 1 && rng.chance(0.25)) {
    return fracQ(kpId, d, `lunit-${per}`, [T('lineUnit'), { kind: 'frac-line', units, per }], [1, per], [[1, per + 1], [1, per - 1], [2, per], [per - 1, per]], rng)
  }
  let k = rng.int(1, units * per - 1)
  if (k % per === 0) k += 1
  if (k >= units * per) k -= 2
  return fracQ(kpId, d, `line-${units}-${per}-${k}`, [T('line'), { kind: 'frac-line', units, per, arrow: k }], [k, per], [[k, units * per], [per, k], [k + 1, per], [k - 1, per]], rng)
}

/** 判断：分母越大分数单位越小、m/n 的分数单位、1 里面有几个 1/n、一些物体看作一个整体 */
function meaningTfQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 3)
  if (r === 0) return tfQ(KP_MEANING, d, 'tf-smaller', [T('tf.unitSmaller')], true, rng)
  if (r === 1) {
    const f = rng.pick(UNIT_FRACS)
    const ok = rng.chance(0.5)
    return tfQ(KP_MEANING, d, `tf-unit-${fstr(f)}-${ok ? 1 : 0}`, [T('tf.unitIs', { f: fstr(f), u: fs(1, ok ? f[1] : f[0]) })], ok, rng)
  }
  if (r === 2) {
    const den = rng.int(3, 12)
    const ok = rng.chance(0.5)
    const n = ok ? den : rng.pick([den - 1, den + 1])
    return tfQ(KP_MEANING, d, `tf-one-${den}-${n}`, [T('tf.oneHas', { n, u: fs(1, den) })], ok, rng)
  }
  return tfQ(KP_MEANING, d, 'tf-whole', [T('tf.setAsOne')], true, rng)
}

/** 分数墙的发现：两个分数单位哪个大（分母小的大） */
function unitCmpQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(2, 12)
  let b = rng.int(2, 12)
  if (b === a) b = a === 12 ? 11 : a + 1
  return labelQuestion({ kpId: KP_MEANING, type: 'fraction', difficulty: d, sig: `ucmp-${a}-${b}`, stem: [T('cmpUnit', { u: fs(1, a), v: fs(1, b) })], correct: fs(1, Math.min(a, b)), distractors: [fs(1, Math.max(a, b))], rng })
}

const MEANING: Table = {
  1: [
    [20, (d, rng) => meaningPicQ(d, rng)],
    [16, (d, rng) => setQ(KP_MEANING, d, rng)],
    [12, (d, rng) => rowQ(KP_MEANING, d, rng)],
    [16, (d, rng) => unitOfQ(KP_MEANING, d, rng)],
    [12, (d, rng) => unitCountQ(KP_MEANING, d, rng)],
    [12, (d, rng) => unitsMakeQ(KP_MEANING, d, rng, false)],
    [12, (d, rng) => oneQ(KP_MEANING, d, rng)],
  ],
  2: [
    [10, (d, rng) => meaningPicQ(d, rng)],
    [10, (d, rng) => setQ(KP_MEANING, d, rng)],
    [12, (d, rng) => restQ(d, rng)],
    [12, (d, rng) => biscuitQ(d, rng)],
    [16, (d, rng) => lineQ(KP_MEANING, d, rng, 1)],
    [12, (d, rng) => unitOfQ(KP_MEANING, d, rng)],
    [12, (d, rng) => unitCountQ(KP_MEANING, d, rng)],
    [16, (d, rng) => meaningTfQ(d, rng)],
  ],
  3: [
    [30, (d, rng) => meaningTfQ(d, rng)],
    [25, (d, rng) => unitCmpQ(d, rng)],
    [25, (d, rng) => lineQ(KP_MEANING, d, rng, 1)],
    [20, (d, rng) => unitCountQ(KP_MEANING, d, rng)],
  ],
}
defineGenerator(KP_MEANING, (d, rng) => pickBy(rng, MEANING[d], d))

// ═════════════════════════════════════════════════════════════
// 2. 分数与除法（p49–52：例 2、例 3 月饼、例 4 求几分之几；做一做；练习十二）
// ═════════════════════════════════════════════════════════════

/** 例 2 / 例 3：把 a 个月饼（或 a 张饼）平均分给 b 人，每人分到多少个（a < b；配图：a 个圆各平均分成 b 份，每个涂一份） */
function shareQ(d: Difficulty, rng: RNG): Question {
  const cake = rng.chance(0.7)
  const a = d === 1 && rng.chance(0.25) ? 1 : rng.int(1, 5)
  const b = rng.int(a + 1, 9)
  const stem: StemPart[] = [T(cake ? 'share' : 'shareBing', { a, b })]
  const pic = a <= 4 && b <= 8 && rng.chance(0.6)
  if (pic) stem.push(picPart(...range(a).map((): FracPic => ({ shape: 'circle', parts: b, shaded: [0] }))))
  return fracQ(KP_DIVISION, d, `share-${cake ? 'c' : 'b'}-${a}-${b}${pic ? '-p' : ''}`, stem, [a, b], [[b, a], [1, b], [a, a + b], [a, b + 1]], rng)
}

/** 做一做 1、练习十二 3：除法的商用分数表示 */
const QUOTS: [number, number][] = [[7, 13], [24, 25], [16, 49], [2, 9], [11, 12], [1, 4], [3, 4], [5, 8], [4, 7], [3, 10], [9, 20], [5, 6]]
const pickQuot = (d: Difficulty, rng: RNG): [number, number] => {
  if (rng.chance(d === 1 ? 0.5 : 0.35)) return rng.pick(QUOTS)
  const b = rng.int(3, 12)
  return [rng.int(1, b - 1), b]
}

function quotQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = pickQuot(d, rng)
  return fracQ(KP_DIVISION, d, `quot-${a}-${b}`, [T('quot'), { kind: 'expr', expr: `${a} ÷ ${b} = ?` }], [a, b], [[b, a], [1, b], [a, a + b], [a, b - a]], rng)
}

/** 做一做 1：5/8 可以写成哪个除法算式（干扰：被除数和除数颠倒、1 ÷ 分母、乘法） */
function toDivQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(QUOTS.filter((q) => q[0] > 1))
  return strQ(KP_DIVISION, d, `todiv-${a}-${b}`, [T('toDiv', { f: fs(a, b) })], `${a} ÷ ${b}`, [`${b} ÷ ${a}`, `1 ÷ ${b}`, `${a} × ${b}`], rng)
}

/** 做一做 1：( ) ÷ 7 = 4/7、4 ÷ ( ) = 4/7（键盘，按的数填进算式） */
function fillDivQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = pickQuot(d, rng)
  const askNum = rng.chance(0.6)
  const expr = askNum ? `? ÷ ${b} = ${fs(a, b)}` : `${a} ÷ ? = ${fs(a, b)}`
  return intQ(KP_DIVISION, d, `fill-${askNum ? 'n' : 'd'}-${a}-${b}`, [T('fill'), { kind: 'expr', expr }], askNum ? a : b, rng, askNum ? [b, b - a, a + 1] : [a, a + b, b + 1], { numpad: true })
}

/** 例 4：两种东西各有几个（不用「只」：棵、朵、本、人） */
export const PW_CTX = ['tree', 'flower', 'book', 'kids'] as const
const pwText = (ctx: string): P => ({ x: K(`pw.${ctx}.x`), y: K(`pw.${ctx}.y`), u: K(`pw.${ctx}.u`) })

/** 例 4、做一做 2：y 的数量是 x 的几分之几（课本 7 和 10、4 和 9；干扰：颠倒、用和作分母、相差的） */
function pwQ(d: Difficulty, rng: RNG): Question {
  const ctx = rng.pick(PW_CTX)
  let a: number
  let b: number
  if (rng.chance(d === 1 ? 0.3 : 0.2)) [a, b] = rng.pick([[10, 7], [9, 4]] as [number, number][])
  else {
    a = rng.int(5, 12)
    b = rng.int(1, a - 1)
  }
  return fracQ(KP_DIVISION, d, `pw-${ctx}-${a}-${b}`, [T('pw', { ...pwText(ctx), a, b })], [b, a], [[a, b], [b, a + b], [a - b, a], [b, a - b]], rng)
}

/** 例 4：x 的数量是 y 的几倍（整数，键盘或选项；课本鸡 20 是鸭 10 的 2 倍） */
function timesQ(d: Difficulty, rng: RNG): Question {
  const ctx = rng.pick(PW_CTX)
  const b = rng.int(3, 9)
  const t = rng.int(2, 5)
  const a = b * t
  return intQ(KP_DIVISION, d, `times-${ctx}-${a}-${b}`, [T('pwTimes', { ...pwText(ctx), a, b })], t, rng, [t + 1, a - b, b])
}

/** 例 3 后：分数与除法的关系，被除数相当于分子、除数相当于分母 */
function relQ(d: Difficulty, rng: RNG): Question {
  const num = rng.chance(0.5)
  return keyQ(KP_DIVISION, d, `rel-${num ? 'n' : 'd'}`, [T(num ? 'rel.num' : 'rel.den')], K(num ? 'w.num' : 'w.den'), [K(num ? 'w.den' : 'w.num'), K('w.bar')], rng)
}

/** 练习十二 1 / 2 / 8 / 9：用分数表示每份的量（葡萄干、花坛、绸带、走路；单位写汉字） */
const SHARE_CTX = ['raisin', 'bed', 'ribbon', 'walk'] as const
function unitShareQ(d: Difficulty, rng: RNG): Question {
  const ctx = rng.pick(SHARE_CTX)
  const a = ctx === 'walk' || ctx === 'raisin' ? rng.pick([1, 1, 2, 3]) : rng.int(2, 5)
  const b = rng.int(a + 1, ctx === 'walk' ? 15 : 9)
  return fracQ(KP_DIVISION, d, `us-${ctx}-${a}-${b}`, [T(`us.${ctx}`, { a, b })], [a, b], [[b, a], [1, b], [a, b + 1], [a + 1, b]], rng)
}

/** 练习十二 4：低级单位的数改写成高级单位（用分数表示，不化简）；[数, 原单位, 新单位, 进率] */
export const CONV: [number, string, string, number][] = [
  [9, 'cm', 'dm', 10],
  [30, 'cm', 'm', 100],
  [7, 'dm', 'm', 10],
  [56, 'cm2', 'dm2', 100],
  [53, 'ml', 'l', 1000],
  [23, 'kg', 't', 1000],
  [13, 's', 'min', 60],
  [48, 'ha', 'km2', 100],
  [133, 'dm3', 'm3', 1000],
  [3, 'dm', 'm', 10],
  [17, 'cm', 'm', 100],
  [29, 's', 'min', 60],
  [7, 'g', 'kg', 1000],
  [41, 'ml', 'l', 1000],
  [9, 'dm2', 'm2', 100],
]
/** 进率用错的（9 厘米写成 9/100 分米） */
const WRONG_RATE: Record<number, number[]> = { 10: [100, 1000], 100: [10, 1000], 1000: [100, 10], 60: [100, 10] }

function convQ(d: Difficulty, rng: RNG): Question {
  const [a, u, v, r] = rng.pick(d === 1 ? CONV.slice(0, 9) : CONV)
  const [w1, w2] = WRONG_RATE[r]!
  return fracQ(KP_DIVISION, d, `conv-${a}-${u}-${v}`, [T('conv', { a, u: K(`u.${u}`), v: K(`u.${v}`) })], [a, r], [[a, w1!], [r, a], [a, w2!]], rng)
}

/** 练习十二 13：几分之几年是几个月；大月占全年的几分之几；周六、周日占一周的几分之几（小月要不要算二月课本说法不一，不出） */
const YEAR_F: Frac[] = [[1, 2], [3, 4], [1, 3], [2, 3], [1, 4], [1, 6], [5, 6], [1, 12], [5, 12], [7, 12]]
function yearQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 3)
  if (r <= 1) {
    const f = rng.pick(YEAR_F)
    const months = (12 * f[0]) / f[1]
    return intQ(KP_DIVISION, d, `year-${fstr(f)}`, [T('year', { f: fstr(f) })], months, rng, [12 / f[1], f[0], f[1], months + 1])
  }
  if (r === 2) return fracQ(KP_DIVISION, d, 'bigmonth', [T('bigMonth')], [7, 12], [[5, 12], [7, 5], [1, 7]], rng)
  return fracQ(KP_DIVISION, d, 'weekend', [T('weekend')], [2, 7], [[5, 7], [1, 7], [7, 2]], rng)
}

/** 练习二十 1：a 米的木条平均锯成 b 段，每段是这根木条的几分之几 / 每段是多少米（两问互为干扰项） */
const STICK: [number, number][] = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 7], [5, 8]]
function stickQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(STICK)
  if (rng.chance(0.5)) return fracQ(KP_DIVISION, d, `stickp-${a}-${b}`, [T('stickPart', { a, b })], [1, b], [[a, b], [b, a], [1, a]], rng)
  return fracQ(KP_DIVISION, d, `stickl-${a}-${b}`, [T('stickLen', { a, b })], [a, b], [[1, b], [b, a], [a, a + b]], rng)
}

/** 练习十二 10 / 11、练习二十 9：售价是标价的几分之几、获奖作品占几分之几、纸飞机飞的距离是几分之几 */
const PRICE: [number, number][] = [[11, 9], [12, 7], [13, 10], [15, 8], [20, 13], [9, 7]]
const PRIZE: [number, number][] = [[17, 4], [15, 4], [19, 6], [21, 5], [13, 3], [23, 7]]
function storyQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 2)
  if (r === 0) {
    const [a, b] = rng.pick(PRICE)
    return fracQ(KP_DIVISION, d, `price-${a}-${b}`, [T('price', { a, b })], [b, a], [[a, b], [a - b, a], [b, a - b]], rng)
  }
  if (r === 1) {
    const [a, b] = rng.pick(PRIZE)
    return fracQ(KP_DIVISION, d, `prize-${a}-${b}`, [T('prize', { a, b })], [b, a], [[a, b], [b, a - b], [a - b, a]], rng)
  }
  const a = rng.int(5, 9)
  const b = rng.int(3, a - 1)
  return fracQ(KP_DIVISION, d, `plane-${a}-${b}`, [T('plane', { a, b })], [b, a], [[a, b], [b, a + b], [a - b, a]], rng)
}

/** 判断：a ÷ b = a/b（对）、= b/a（不对）；分数的分母不能是 0 */
function divTfQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 2)
  if (r === 2) return tfQ(KP_DIVISION, d, 'tf-den0', [T('tf.den0')], true, rng)
  const [a, b] = rng.pick(QUOTS)
  const ok = r === 0
  return tfQ(KP_DIVISION, d, `tf-div-${a}-${b}-${ok ? 1 : 0}`, [T('tf.div', { e: `${a} ÷ ${b}`, f: ok ? fs(a, b) : fs(b, a) })], ok, rng)
}

const DIVISION: Table = {
  1: [
    [18, (d, rng) => shareQ(d, rng)],
    [14, (d, rng) => quotQ(d, rng)],
    [10, (d, rng) => toDivQ(d, rng)],
    [12, (d, rng) => fillDivQ(d, rng)],
    [18, (d, rng) => pwQ(d, rng)],
    [12, (d, rng) => timesQ(d, rng)],
    [8, (d, rng) => relQ(d, rng)],
  ],
  2: [
    [16, (d, rng) => unitShareQ(d, rng)],
    [16, (d, rng) => convQ(d, rng)],
    [12, (d, rng) => yearQ(d, rng)],
    [12, (d, rng) => stickQ(d, rng)],
    [16, (d, rng) => storyQ(d, rng)],
    [10, (d, rng) => pwQ(d, rng)],
    [10, (d, rng) => divTfQ(d, rng)],
    [8, (d, rng) => fillDivQ(d, rng)],
  ],
  3: [
    [25, (d, rng) => convQ(d, rng)],
    [25, (d, rng) => unitShareQ(d, rng)],
    [25, (d, rng) => divTfQ(d, rng)],
    [25, (d, rng) => pwQ(d, rng)],
  ],
}
defineGenerator(KP_DIVISION, (d, rng) => pickBy(rng, DIVISION[d], d))

// ═════════════════════════════════════════════════════════════
// 3. 真分数和假分数（p53–54 例 1、例 2、做一做 1；练习十三 1–3、7、8、10）
// ═════════════════════════════════════════════════════════════

/** 课本里的真分数、假分数（例 1、例 2、做一做 1、练习十三、整理和复习 1） */
export const PROPER_POOL: Frac[] = [[1, 3], [5, 6], [1, 6], [3, 8], [4, 15], [5, 7], [4, 10], [2, 3], [3, 4], [7, 9], [2, 5], [9, 10], [5, 12], [7, 8]]
export const IMPROPER_POOL: Frac[] = [[3, 3], [5, 3], [7, 6], [13, 6], [18, 6], [13, 9], [25, 5], [7, 4], [11, 5], [4, 3], [9, 8], [6, 6], [10, 7], [8, 5], [12, 7], [9, 9]]

/** 从 pool 里挑 count 个和 avoid、彼此都不等值的分数 */
function distinctFracs(pool: Frac[], avoid: Frac[], count: number, rng: RNG): Frac[] {
  const out: Frac[] = []
  for (const f of rng.shuffle(pool)) {
    if (out.length >= count) break
    if (avoid.some((a) => sameVal(a, f)) || out.some((o) => sameVal(o, f))) continue
    out.push(f)
  }
  return out
}

/** 例 1、例 2、做一做 1：下面哪个是假分数（真分数）——一个对的，三个另一种 */
function kindPickQ(d: Difficulty, rng: RNG): Question {
  const imp = rng.chance(0.5)
  const correct = rng.pick(imp ? IMPROPER_POOL : PROPER_POOL)
  const wrongs = distinctFracs(imp ? PROPER_POOL : IMPROPER_POOL, [correct], 3, rng)
  return labelQuestion({ kpId: KP_PROPER, type: 'fraction', difficulty: d, sig: `kind-${imp ? 'i' : 'p'}-${fstr(correct)}`, stem: [T(imp ? 'pickImproper' : 'pickProper')], correct: fstr(correct), distractors: wrongs.map(fstr), rng })
}

/** 判断：m/n 是假分数（真分数），对吗？（分子等于分母的也是假分数） */
function kindTfQ(d: Difficulty, rng: RNG): Question {
  const f = rng.pick([...PROPER_POOL, ...IMPROPER_POOL])
  const askImp = rng.chance(0.5)
  const isImp = f[0] >= f[1]
  return tfQ(KP_PROPER, d, `kindtf-${askImp ? 'i' : 'p'}-${fstr(f)}`, [T(askImp ? 'isImproper' : 'isProper', { f: fstr(f) })], askImp === isImp, rng)
}

/** 例 2、练习十三 1 / 6：把一个图形看作单位“1”，几个图形一共涂了几份（干扰：把几个图形当一个整体、只看最后一个、颠倒） */
function picImpQ(d: Difficulty, rng: RNG, withHex: boolean): Question {
  const hex = withHex && rng.chance(0.3)
  const n = hex ? 6 : rng.int(2, 6)
  const m = rng.int(n + 1, d === 1 ? 3 * n - 1 : 3 * n + 2)
  const shape: FracShapeKind = hex ? 'polygon' : rng.pick(['circle', 'circle', 'rect', 'square'] as const)
  const pic = impPic(n, m, shape)
  const count = (pic.whole ?? 0) + 1
  return fracQ(KP_PROPER, d, `imp-${shape}-${n}-${m}`, [T('picMany'), picPart(pic)], [m, n], [[m, n * count], [pic.shaded.length, n], [n, m], [m, n + 1]], rng)
}

/** 例 2：像 2 1/5 这样的数叫作什么；分子比分母小的叫作什么；分子大于或等于分母的叫作什么 */
const NAME_MIX: Mix[] = [[2, 1, 5], [1, 3, 4], [3, 1, 2], [2, 2, 3], [1, 1, 6], [4, 3, 5]]
function nameQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 2)
  if (r === 0) {
    const m = rng.pick(NAME_MIX)
    return keyQ(KP_PROPER, d, `name-m-${m.join('-')}`, [T('name.mixed', { m: mstr(m) })], K('w.mixed'), [K('w.improper'), K('w.proper')], rng)
  }
  if (r === 1) return keyQ(KP_PROPER, d, 'name-p', [T('name.proper')], K('w.proper'), [K('w.improper'), K('w.mixed')], rng)
  return keyQ(KP_PROPER, d, 'name-i', [T('name.improper')], K('w.improper'), [K('w.proper'), K('w.mixed')], rng)
}

/** 例 1 / 例 2「这些分数比 1 大还是比 1 小」：比一比，填 >、< 或 = */
function cmpOneQ(d: Difficulty, rng: RNG): Question {
  const f = rng.pick([...PROPER_POOL, ...IMPROPER_POOL])
  return cmpQ(KP_PROPER, d, `cmp1-${fstr(f)}`, fstr(f), '1', f[0] - f[1], rng, 'fraction')
}

/** 练习十三 3：有 a 杯水，b 个人平均分，每人分到多少杯（a > b） */
function drinkQ(d: Difficulty, rng: RNG): Question {
  const b = rng.int(2, 5)
  const a = b * rng.int(1, 2) + rng.int(1, b - 1)
  return fracQ(KP_PROPER, d, `drink-${a}-${b}`, [T('drink', { a, b })], [a, b], [[b, a], [1, b], [a, a + b]], rng)
}

/** 练习十三 7：熊冬眠约 5 个月、睡鼠约 7 个月 */
function sleepQ(d: Difficulty, rng: RNG): Question {
  const bear = rng.chance(0.5)
  const c: Frac = bear ? [5, 7] : [7, 5]
  return fracQ(KP_PROPER, d, bear ? 'bear' : 'mouse', [T(bear ? 'sleepBear' : 'sleepMouse', { a: 5, b: 7 })], c, [[c[1], c[0]], [5, 12], [7, 12], [2, 7]], rng)
}

/** 练习十三 8：分母是 n 的真分数有几个（n − 1）、分子是 n 的假分数有几个（n） */
function countQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const den = rng.int(3, 12)
    return intQ(KP_PROPER, d, `cntp-${den}`, [T('countProper', { d: den })], den - 1, rng, [den, den - 2, den + 1])
  }
  const n = rng.int(3, 9)
  return intQ(KP_PROPER, d, `cnti-${n}`, [T('countImproper', { n })], n, rng, [n - 1, n + 1, n * 2])
}

/** 练习十三 10：下面哪个分数等于 1 */
function eqOneQ(d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 9)
  return strQ(KP_PROPER, d, `eq1-${n}`, [T('eqOne')], fs(n, n), [fs(1, n), fs(n + 1, n), fs(n - 1, n), fs(n, n + 1)], rng)
}

/** 练习十三 2（1）：吃了一个西瓜的 m/n，可能吗（比 1 大的不可能） */
function melonQ(d: Difficulty, rng: RNG): Question {
  const f = rng.pick([...PROPER_POOL, ...IMPROPER_POOL.filter((x) => x[0] % x[1] !== 0)])
  const possible = f[0] <= f[1]
  return keyQ(KP_PROPER, d, `melon-${fstr(f)}`, [T('melon', { f: fstr(f) })], K(possible ? 'possible' : 'impossible'), [K(possible ? 'impossible' : 'possible')], rng)
}

/** 练习十三 2（3）：一块巧克力，妹妹吃了 a/n，姐姐吃了 b/n，正好吃完，对吗（a + b = n 才对） */
function chocoQ(d: Difficulty, rng: RNG): Question {
  const n = rng.int(4, 9)
  const a = rng.int(1, n - 1)
  const b = rng.chance(0.5) ? n - a : rng.pick(range(n - 1).map((i) => i + 1).filter((x) => x !== n - a))
  return tfQ(KP_PROPER, d, `choco-${a}-${b}-${n}`, [T('choco', { f: fs(a, n), g: fs(b, n) })], a + b === n, rng)
}

/** 练习二十 2 等：真分数、假分数的说法 */
const PROPER_TF: [string, boolean][] = [
  ['tf.allLess', false],
  ['tf.impNumLess', false],
  ['tf.properLess', true],
  ['tf.impGreater', false],
  ['tf.impGe', true],
]
function properTfQ(d: Difficulty, rng: RNG): Question {
  const [k, ok] = rng.pick(PROPER_TF)
  return tfQ(KP_PROPER, d, `ptf-${k}`, [T(k)], ok, rng)
}

const PROPER: Table = {
  1: [
    [16, (d, rng) => kindPickQ(d, rng)],
    [12, (d, rng) => kindTfQ(d, rng)],
    [16, (d, rng) => picImpQ(d, rng, false)],
    [12, (d, rng) => unitsMakeQ(KP_PROPER, d, rng, true)],
    [14, (d, rng) => lineQ(KP_PROPER, d, rng, 2)],
    [10, (d, rng) => nameQ(d, rng)],
    [12, (d, rng) => cmpOneQ(d, rng)],
  ],
  2: [
    [12, (d, rng) => picImpQ(d, rng, true)],
    [10, (d, rng) => drinkQ(d, rng)],
    [6, (d, rng) => sleepQ(d, rng)],
    [12, (d, rng) => countQ(d, rng)],
    [10, (d, rng) => eqOneQ(d, rng)],
    [12, (d, rng) => melonQ(d, rng)],
    [12, (d, rng) => chocoQ(d, rng)],
    [12, (d, rng) => kindPickQ(d, rng)],
    [12, (d, rng) => lineQ(KP_PROPER, d, rng, 2)],
  ],
  3: [
    [35, (d, rng) => properTfQ(d, rng)],
    [25, (d, rng) => countQ(d, rng)],
    [20, (d, rng) => chocoQ(d, rng)],
    [20, (d, rng) => kindTfQ(d, rng)],
  ],
}
defineGenerator(KP_PROPER, (d, rng) => pickBy(rng, PROPER[d], d))

// ═════════════════════════════════════════════════════════════
// 4. 假分数化成整数或带分数（p54 例 3、做一做 2；练习十三 4、5、6、9）
// ═════════════════════════════════════════════════════════════

/** 分子是分母倍数的假分数（例 3(1) 3/3、8/4，做一做 2 21/7、30/15……） */
export const TO_INT: Frac[] = [[3, 3], [8, 4], [21, 7], [30, 15], [18, 6], [25, 5], [12, 4], [20, 5], [24, 8], [36, 9], [14, 7], [16, 8], [27, 9], [45, 15]]
/** 能化成带分数的假分数（例 3(2) 7/3、6/5，做一做 2 15/2、8/5、50/9、43/12、69/20……） */
export const TO_MIX: Frac[] = [[7, 3], [6, 5], [15, 2], [8, 5], [50, 9], [43, 12], [69, 20], [11, 5], [7, 4], [13, 6], [5, 3], [10, 3], [13, 4], [17, 5], [9, 2], [23, 6], [19, 8], [29, 9], [11, 4], [22, 7]]

/** 例 3(1)：把 8/4 化成整数（键盘） */
function toIntQ(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(TO_INT)
  const v = f[0] / f[1]
  return intQ(KP_MIXED, d, `int-${fstr(f)}`, [T('toInt', { f: fstr(f) })], v, rng, [f[0] - f[1], f[1], v + 1, v * 10])
}

/** 第 2、3 档多一些（余数和分母互质，化成的带分数分数部分是最简的，同课本做一做） */
const TO_MIX2: Frac[] = [[31, 8], [25, 6], [38, 9], [47, 10], [29, 4], [37, 5], [45, 7], [53, 12], [41, 11], [33, 10], [27, 8], [44, 9], [59, 15], [71, 20], [36, 11], [55, 7]]

/** 例 3(2)、做一做 2：把 7/3 化成带分数（干扰：商余颠倒、分母写成被除数、商多 1……） */
function toMixQ(d: Difficulty, rng: RNG): Question {
  const f = d === 1 || rng.chance(0.5) ? rng.pick(TO_MIX) : rng.pick(TO_MIX2)
  return mixQ(KP_MIXED, d, `mix-${fstr(f)}`, [T('toMixed', { f: fstr(f) })], toMix(f), mixCands(f), rng)
}

/** 例 3(2)（键盘）：7/3 = ? 1/3（整数部分是几）、7/3 = 2 ?/3（分子是几）——画成分数链，按的数填进问号 */
function mixPartQ(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(TO_MIX)
  const [q, r, den] = toMix(f)
  const whole = rng.chance(0.5)
  const stem: StemPart[] = [T(whole ? 'mixWhole' : 'mixNum', { f: fstr(f) }), chain([fr(f[0], den), tx('='), whole ? mx('?', r, den) : mx(q, '?', den)])]
  return intQ(KP_MIXED, d, `mixp-${whole ? 'w' : 'n'}-${fstr(f)}`, stem, whole ? q : r, rng, whole ? [r, q + 1, q - 1] : [q, den - r, r + 1], { numpad: true })
}

/** 例 3「有些假分数的分子恰好是分母的倍数，它们实际上是整数」：下面哪个假分数能化成整数 */
function canIntQ(d: Difficulty, rng: RNG): Question {
  const c = rng.pick(TO_INT.filter((f) => f[0] !== f[1]))
  const wrongs = distinctFracs(TO_MIX, [c], 3, rng)
  return labelQuestion({ kpId: KP_MIXED, type: 'fraction', difficulty: d, sig: `canint-${fstr(c)}`, stem: [T('canInt')], correct: fstr(c), distractors: wrongs.map(fstr), rng })
}

/** 练习十三 4：一板药有 n 粒，每天吃 k 粒，能吃多少天（用带分数表示；余数和 k 互质，答案就是最简的） */
const PILLS: [number, number][] = [[10, 3], [8, 3], [14, 4], [20, 3], [9, 2], [11, 4], [13, 3], [17, 5], [7, 2], [12, 5]]
function pillQ(d: Difficulty, rng: RNG): Question {
  const [n, k] = rng.pick(PILLS)
  return mixQ(KP_MIXED, d, `pill-${n}-${k}`, [T('pill', { n, k })], toMix([n, k]), mixCands([n, k]), rng)
}

/** 练习十三 5：数线 0–3 / 0–4，每份平均分成 per 小格，箭头指的点写成带分数 / 假分数 */
function lineMixQ(d: Difficulty, rng: RNG): Question {
  const per = rng.pick([3, 4, 5])
  const units = rng.pick([3, 4])
  let k = rng.int(per + 1, units * per - 1)
  if (k % per === 0) k += 1
  if (k >= units * per) k -= 2
  const part: StemPart = { kind: 'frac-line', units, per, arrow: k }
  if (rng.chance(0.55)) return mixQ(KP_MIXED, d, `lmix-${units}-${per}-${k}`, [T('lineMix'), part], toMix([k, per]), mixCands([k, per]), rng)
  return fracQ(KP_MIXED, d, `limp-${units}-${per}-${k}`, [T('lineImp'), part], [k, per], [[k, units * per], [per, k], [k + 1, per], [k - 1, per]], rng)
}

/** 练习十三 6：几个图形，前 w 个涂满、最后一个涂 r 份，用带分数表示 */
function picMixQ(d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 6)
  const w = rng.int(1, 3)
  const r = rng.int(1, n - 1)
  const shape = rng.pick(['circle', 'rect', 'square'] as const)
  return mixQ(KP_MIXED, d, `picmix-${shape}-${w}-${r}-${n}`, [T('picMix'), picPart({ shape, parts: n, shaded: range(r), whole: w })], [w, r, n], [[w + 1, r, n], [w, n - r, n], [r, w, n], [w, r, n * (w + 1)]], rng)
}

/** 练习十三 9（反过来）：8 2/9 化成假分数，分子是几（键盘，分数链） */
export const TO_IMP: Mix[] = [[8, 2, 9], [3, 1, 25], [1, 7, 9], [2, 1, 5], [1, 3, 4], [2, 1, 3], [3, 1, 2], [2, 3, 5], [4, 1, 6], [1, 5, 8], [5, 2, 3], [3, 3, 4]]
function toImpQ(d: Difficulty, rng: RNG): Question {
  const m = rng.pick(TO_IMP)
  const [w, n, den] = m
  const v = w * den + n
  return intQ(KP_MIXED, d, `toimp-${w}-${n}-${den}`, [T('toImp', { m: mstr(m) }), chain([mx(w, n, den), tx('='), fr('?', den)])], v, rng, [w * den, w + n, w * n + den, v + 1], { numpad: true, max: v * 2 + 10 })
}

/** 练习十三 9：带分数、假分数、整数比大小（课本 7/9 ○ 1 7/9、3 1/25 ○ 75/25、46/12 ○ 4、8 2/9 ○ 74/9） */
function cmpMixQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 5)
  if (r === 0) return cmpQ(KP_MIXED, d, 'cmpm-7/9', fs(7, 9), mstr([1, 7, 9]), -1, rng, 'fraction')
  if (r === 1) return cmpQ(KP_MIXED, d, 'cmpm-3-1-25', mstr([3, 1, 25]), fs(75, 25), 1, rng, 'fraction')
  if (r === 2) {
    const f = rng.pick([[46, 12], [17, 4], [23, 5], [13, 3], [26, 6]] as Frac[])
    const n = rng.pick([Math.floor(f[0] / f[1]), Math.ceil(f[0] / f[1])])
    return cmpQ(KP_MIXED, d, `cmpm-${fstr(f)}-${n}`, fstr(f), String(n), cmpFrac(f, [n, 1]), rng, 'fraction')
  }
  const m: Mix = rng.pick(TO_IMP)
  const [w, n, den] = m
  const v = w * den + n + rng.pick([-1, 0, 0, 1])
  const left = rng.chance(0.5)
  const f: Frac = [v, den]
  const sign = cmpFrac(mixVal(m), f)
  return left ? cmpQ(KP_MIXED, d, `cmpm-${w}-${n}-${den}-${v}`, mstr(m), fstr(f), sign, rng, 'fraction') : cmpQ(KP_MIXED, d, `cmpm-${v}-${den}-${w}-${n}`, fstr(f), mstr(m), -sign, rng, 'fraction')
}

const MIXED: Table = {
  1: [
    [24, (d, rng) => toIntQ(d, rng)],
    [30, (d, rng) => toMixQ(d, rng)],
    [26, (d, rng) => mixPartQ(d, rng)],
    [20, (d, rng) => canIntQ(d, rng)],
  ],
  2: [
    [14, (d, rng) => toMixQ(d, rng)],
    [14, (d, rng) => pillQ(d, rng)],
    [16, (d, rng) => lineMixQ(d, rng)],
    [14, (d, rng) => picMixQ(d, rng)],
    [16, (d, rng) => toImpQ(d, rng)],
    [16, (d, rng) => cmpMixQ(d, rng)],
    [10, (d, rng) => mixPartQ(d, rng)],
  ],
  3: [
    [30, (d, rng) => toMixQ(d, rng)],
    [25, (d, rng) => cmpMixQ(d, rng)],
    [25, (d, rng) => toImpQ(d, rng)],
    [20, (d, rng) => pillQ(d, rng)],
  ],
}
defineGenerator(KP_MIXED, (d, rng) => pickBy(rng, MIXED[d], d))

// ═════════════════════════════════════════════════════════════
// 5. 分数的基本性质（p57–59：例 1 三张正方形纸、箭头图、性质；例 2 化成分母是 12 的分数；练习十四）
// ═════════════════════════════════════════════════════════════

/** 最简的真分数（性质、约分、通分的底子） */
export const BASE_F: Frac[] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6], [3, 7], [3, 8], [5, 8], [4, 9], [7, 10]]

/**
 * 例 1：两个一样大的图，一个标着它涂色部分的分数，另一个分得更细、涂色部分一样大——另一个的涂色部分是几分之几。
 * 一部分照课本用两张正方形纸（1/2、2/4、4/8：横着对半分、田字格、横竖中线加两条对角线），其余用竖着切的长方形
 */
const SQUARES: { pic: FracPic; f: Frac }[] = [
  { pic: { shape: 'square', parts: 2, rows: 2, shaded: [0] }, f: [1, 2] },
  { pic: { shape: 'square', parts: 4, rows: 2, shaded: [0, 1] }, f: [2, 4] },
  { pic: { shape: 'square-diag', parts: 8, shaded: [0, 1, 2, 7] }, f: [4, 8] },
]
function pairPicQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) {
    const [x, y] = rng.shuffle([0, 1, 2]).slice(0, 2).sort((m, n) => m - n) as [number, number]
    const known = SQUARES[x]!
    const ask = SQUARES[y]!
    const [a, b] = ask.f
    return fracQ(KP_PROPERTY, d, `ppsq-${fstr(known.f)}-${fstr(ask.f)}`, [T('pair2sq'), picPart({ ...known.pic, label: fstr(known.f) }, ask.pic)], ask.f, [[a, b / 2], [a / 2, b], [b - a + 1, b], [a + 1, b]], rng)
  }
  const b = rng.pick([2, 3, 4, 5, 6])
  const k = rng.pick(b * 3 <= 12 ? [2, 3] : [2])
  const a = rng.int(1, b - 1)
  const left: FracPic = { shape: 'rect', parts: b, shaded: range(a), label: fs(a, b) }
  const right: FracPic = { shape: 'rect', parts: b * k, shaded: range(a * k) }
  return fracQ(KP_PROPERTY, d, `pp-${a}-${b}-${k}`, [T('pair2'), picPart(left, right)], [a * k, b * k], [[a, b * k], [a * k, b + k], [a + k, b + k], [b * k - a * k, b * k]], rng)
}

/** 例 1 箭头图：从 1/2 到 2/4，分子和分母都乘几；从 4/8 到 2/4，都除以几（键盘，问号在箭头上） */
function arcQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(BASE_F)
  const k = rng.int(2, 5)
  const big: Frac = [a * k, b * k]
  const mul = rng.chance(0.5)
  const from: Frac = mul ? [a, b] : big
  const to: Frac = mul ? big : [a, b]
  const lab = `${mul ? '×' : '÷'}?`
  const stem: StemPart[] = [T(mul ? 'arcMul' : 'arcDiv', { f: fstr(from), g: fstr(to) }), chain([fr(from[0], from[1]), tx('='), fr(to[0], to[1])], [{ from: 0, to: 2, top: lab, bottom: lab }])]
  return intQ(KP_PROPERTY, d, `arc-${mul ? 'm' : 'd'}-${a}-${b}-${k}`, stem, k, rng, [k + 1, k - 1, a * k, b], { numpad: true })
}

/** 例 2：把 2/3 化成分母是 12 的分数（下面的箭头写着分母乘几），分子是几（键盘） */
const TO_DEN2: [Frac, number][] = [[[145, 500], 100], [[3, 2], 10], [[1, 5], 10], [[6, 20], 10], [[24, 30], 10], [[15, 50], 10], [[3, 4], 100], [[7, 20], 100]]
function toDenQ(d: Difficulty, rng: RNG): Question {
  let from: Frac
  let D: number
  const book = rng.next()
  if (book < 0.15) [from, D] = [[2, 3], 12]
  else if (book < 0.25) [from, D] = [[10, 24], 12]
  else if (d >= 2 && book < 0.45) [from, D] = rng.pick(TO_DEN2)
  else {
    const [a, b] = rng.pick(BASE_F)
    const k = rng.int(2, 5)
    const up = rng.chance(0.6)
    from = up ? [a, b] : [a * k, b * k]
    D = up ? b * k : b
  }
  const ans = (from[0] * D) / from[1]
  const lab = D > from[1] ? `×${D / from[1]}` : `÷${from[1] / D}`
  const stem: StemPart[] = [T('toDen', { f: fstr(from), D }), chain([fr(from[0], from[1]), tx('='), fr('?', D)], [{ from: 0, to: 2, bottom: lab }])]
  return intQ(KP_PROPERTY, d, `toden-${fstr(from)}-${D}`, stem, ans, rng, [from[0], ans + 1, D - ans], { numpad: true, max: Math.max(20, ans * 2 + 10) })
}

/** 例 1 的性质：说法对不对（分子分母同时乘或者除以不是 0 的相同的数大小不变；同时加、只乘分子、乘 0 都不对） */
function ruleQ(d: Difficulty, rng: RNG): Question {
  const r = rng.pick(['ok', 'add', 'one', 'zero'])
  return tfQ(KP_PROPERTY, d, `rule-${r}`, [T(`rule.${r}`)], r === 'ok', rng)
}

/** 练习十四 2：两个分数相等吗（课本 3/5 和 6/10、9/18 和 1/9、7/12 和 21/36、5/15 和 1/5） */
const EQ_PAIRS: [Frac, Frac][] = [
  [[3, 5], [6, 10]],
  [[9, 18], [1, 9]],
  [[7, 12], [21, 36]],
  [[5, 15], [1, 5]],
]
function eqTfQ(kpId: string, d: Difficulty, rng: RNG): Question {
  let f: Frac
  let g: Frac
  if (rng.chance(0.35)) [f, g] = rng.pick(EQ_PAIRS)
  else {
    const [a, b] = rng.pick(BASE_F)
    const k = rng.int(2, 4)
    f = [a, b]
    const r = rng.int(0, 2)
    // 对的：分子分母都乘 k；错的：分子分母乘的数不一样、分子分母都加 k
    g = r === 0 ? [a * k, b * k] : r === 1 ? [a * k, b * (k + 1)] : [a + k, b + k]
    if (rng.chance(0.5)) [f, g] = [g, f]
  }
  return tfQ(kpId, d, `eqtf-${fstr(f)}-${fstr(g)}`, [T('eqTf', { f: fstr(f), g: fstr(g) })], sameVal(f, g), rng)
}

/** 练习十四 3、约分做一做 2：下面哪个分数和 f 相等（一个相等，三个不等） */
function whichEqQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(BASE_F)
  const k = rng.int(2, 4)
  const f: Frac = [a, b]
  const c: Frac = [a * k, b * k]
  return fracQ(kpId, d, `which-${fstr(f)}-${k}`, [T('whichEq', { f: fstr(f) })], c, [[a + k, b + k], [a * k, b], [a, b * k], [a * k + 1, b * k], [a * k, b * k + 1]], rng)
}

/** 练习十四 4：一班 2/5 的同学参加舞蹈小组，4/10 的同学参加书法小组，哪个小组的人多 */
function groupsQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(BASE_F)
  const k = rng.int(2, 3)
  const r = rng.int(0, 2)
  const f: Frac = [a, b]
  const g: Frac = r === 0 ? [a * k, b * k] : r === 1 ? [a * k + 1, b * k] : [Math.max(1, a * k - 1), b * k]
  const s = cmpFrac(f, g)
  const ans = s === 0 ? 'same' : s > 0 ? 'g.dance' : 'g.calli'
  return keyQ(KP_PROPERTY, d, `grp-${fstr(f)}-${fstr(g)}`, [T('groups', { f: fstr(f), g: fstr(g) })], K(ans), [K('same'), K('g.dance'), K('g.calli')], rng)
}

/** 练习十四 6：1/4 = 5/?（分子乘几、分母也乘几；键盘） */
function toNumQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(BASE_F)
  const k = rng.int(2, 6)
  const N = a * k
  const stem: StemPart[] = [T('toNum', { f: fs(a, b), N }), chain([fr(a, b), tx('='), fr(N, '?')], [{ from: 0, to: 2, top: `×${k}` }])]
  return intQ(KP_PROPERTY, d, `tonum-${a}-${b}-${k}`, stem, b * k, rng, [b + N - a, b * k + 1, N], { numpad: true })
}

/** 练习十四 9：3/4 = ?/8 = 9/?——三个分数相等，只空一个（键盘） */
function chainFillQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(BASE_F)
  const k1 = rng.int(2, 4)
  const k2 = rng.int(k1 + 1, 6)
  const slot = rng.int(0, 3)
  const t1: [number | string, number | string] = [a * k1, b * k1]
  const t2: [number | string, number | string] = [a * k2, b * k2]
  const value = [a * k1, b * k1, a * k2, b * k2][slot]!
  if (slot < 2) t1[slot] = '?'
  else t2[slot - 2] = '?'
  const stem: StemPart[] = [T('chainFill'), chain([fr(a, b), tx('='), fr(t1[0], t1[1]), tx('='), fr(t2[0], t2[1])])]
  return intQ(KP_PROPERTY, d, `cfill-${a}-${b}-${k1}-${k2}-${slot}`, stem, value, rng, [value + 1, value - 1, a * k1 + b, b * k2 - 1], { numpad: true })
}

/** 练习十四 8：两个一样大的长方形，一个涂了 a/b；另一个平均分成 b × k 格，要涂几格涂色部分才一样大（键盘） */
function shadeMoreQ(d: Difficulty, rng: RNG): Question {
  const b = rng.pick([2, 3, 4, 5])
  const k = rng.pick([2, 3])
  const a = rng.int(1, b - 1)
  return intQ(KP_PROPERTY, d, `smore-${a}-${b}-${k}`, [T('shadeMore'), picPart({ shape: 'rect', parts: b, shaded: range(a), label: fs(a, b) }, { shape: 'rect', parts: b * k, shaded: [] })], a * k, rng, [a, a + k, b * k - a * k])
}

/** 练习十四 10：一节课 40 分钟，一班练习 x 分钟，二班练习的时间占 f，哪个班练习的时间多 */
const MINUTE_F: Frac[] = [[1, 4], [1, 5], [3, 8], [1, 2], [3, 10], [1, 8]]
function minutesQ(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(MINUTE_F)
  const exact = (40 * f[0]) / f[1]
  const x = rng.pick([exact, exact, exact + 5, Math.max(1, exact - 3)])
  const ans = x === exact ? 'same' : x > exact ? 'c1' : 'c2'
  return keyQ(KP_PROPERTY, d, `min-${x}-${fstr(f)}`, [T('minutes', { x, f: fstr(f) })], K(ans), [K('same'), K('c1'), K('c2')], rng)
}

/** 练习十四 13*：分母不变、分子乘 k；分子不变、分母除以 k（都是扩大到原来的 k 倍）；分母乘 k（缩小到原来的 1/k） */
function changeQ(d: Difficulty, rng: RNG): Question {
  const k = rng.int(2, 6)
  const r = rng.int(0, 2)
  const key = ['change.numMul', 'change.denDiv', 'change.denMul'][r]!
  const up = K('res.up', { k })
  const down = K('res.down', { u: fs(1, k) })
  return keyQ(KP_PROPERTY, d, `chg-${r}-${k}`, [T(key, { k })], r < 2 ? up : down, [up, down, K('res.same')], rng)
}

const PROPERTY: Table = {
  1: [
    [24, (d, rng) => pairPicQ(d, rng)],
    [28, (d, rng) => arcQ(d, rng)],
    [30, (d, rng) => toDenQ(d, rng)],
    [18, (d, rng) => ruleQ(d, rng)],
  ],
  2: [
    [12, (d, rng) => eqTfQ(KP_PROPERTY, d, rng)],
    [12, (d, rng) => whichEqQ(KP_PROPERTY, d, rng)],
    [10, (d, rng) => groupsQ(d, rng)],
    [12, (d, rng) => toNumQ(d, rng)],
    [14, (d, rng) => toDenQ(d, rng)],
    [12, (d, rng) => chainFillQ(d, rng)],
    [10, (d, rng) => shadeMoreQ(d, rng)],
    [8, (d, rng) => minutesQ(d, rng)],
    [10, (d, rng) => pairPicQ(d, rng)],
  ],
  3: [
    [30, (d, rng) => changeQ(d, rng)],
    [25, (d, rng) => chainFillQ(d, rng)],
    [25, (d, rng) => eqTfQ(KP_PROPERTY, d, rng)],
    [20, (d, rng) => toNumQ(d, rng)],
  ],
}
defineGenerator(KP_PROPERTY, (d, rng) => pickBy(rng, PROPERTY[d], d))

// ═════════════════════════════════════════════════════════════
// 6. 最大公因数（p60–64：例 1 集合图、例 2、做一做 1–3、例 3 铺地砖；练习十五）
// ═════════════════════════════════════════════════════════════

/** 两个数：一般的、一个是另一个倍数的、只有公因数 1 的（课本例 2、做一做 3、练习十五 2 的数） */
const GCF_GENERAL: [number, number][] = [[8, 12], [18, 27], [16, 24], [12, 18], [6, 9], [15, 12], [42, 54], [30, 45], [99, 36], [10, 15], [14, 49], [8, 20], [16, 20], [24, 36], [12, 16], [20, 30], [9, 12], [18, 24], [28, 42], [45, 60]]
const GCF_MULTIPLE: [number, number][] = [[4, 8], [12, 36], [16, 48], [34, 17], [13, 78], [9, 27], [15, 45], [7, 42]]
const GCF_ONE: [number, number][] = [[8, 9], [5, 11], [12, 35], [15, 16], [1, 7], [5, 9], [9, 10], [14, 15], [4, 9], [7, 12]]
/** 因数不多、集合图里放得下的（左右两块都有数） */
const VENN_CF: [number, number][] = [[8, 12], [12, 18], [16, 24], [10, 15], [12, 16], [9, 12], [6, 9], [18, 27], [8, 20], [16, 20]]
const SMALL_CF: [number, number][] = [[8, 12], [16, 24], [12, 18], [10, 15], [14, 49], [18, 27], [6, 9], [12, 15], [8, 20], [16, 20], [12, 16], [9, 12], [20, 30]]

/** 例 1：8 和 12 的公因数有哪些（干扰：只写了其中一个数的因数、漏了 1、多写了一个不是公因数的） */
function cfListQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(d === 1 ? SMALL_CF : [...SMALL_CF, ...GCF_GENERAL])
  const fa = factorsOf(a)
  const fb = factorsOf(b)
  const cf = fa.filter((x) => fb.includes(x))
  const extra = [...fa, ...fb].filter((x) => !cf.includes(x)).sort((x, y) => x - y)[0]
  const wrongs = [listText(fa), listText(fb), cf.length > 1 ? listText(cf.slice(1)) : '', extra ? listText([...cf, extra].sort((x, y) => x - y)) : ''].filter(Boolean)
  return strQ(KP_GCF, d, `cfl-${a}-${b}`, [T('cfList', { a, b })], listText(cf), wrongs, rng, 'factor')
}

/** 例 1、做一做 2：下面哪个数是 a 和 b 的公因数（一个公因数，三个只是其中一个数的因数或都不是） */
function cfPickQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(SMALL_CF.filter(([x, y]) => gcd(x, y) > 1))
  const fa = factorsOf(a)
  const fb = factorsOf(b)
  const cf = fa.filter((x) => fb.includes(x) && x > 1)
  const c = rng.pick(cf)
  const only = rng.shuffle([...fa, ...fb].filter((x) => !fa.includes(x) || !fb.includes(x)))
  const neither = [7, 11, 13, 5, 3, 9, 10].filter((x) => a % x !== 0 && b % x !== 0)
  const wrongs = uniq([...only, ...neither]).filter((x) => x !== c).slice(0, 3)
  return strQ(KP_GCF, d, `cfp-${a}-${b}-${c}`, [T('cfPick', { a, b })], String(c), wrongs.map(String), rng, 'factor')
}

/** 集合图三块（因数）：只是 a 的、公有的、只是 b 的 */
function cfRegions(a: number, b: number): { only1: number[]; both: number[]; only2: number[] } {
  const fa = factorsOf(a)
  const fb = factorsOf(b)
  return { only1: fa.filter((x) => !fb.includes(x)), both: fa.filter((x) => fb.includes(x)), only2: fb.filter((x) => !fa.includes(x)) }
}
const REGION_KEY = { only1: 'venn.left', both: 'venn.mid', only2: 'venn.right' } as const

/**
 * 集合图（例 1「还可以这样表示」、做一做 1 / 2）：中间那一块是哪些数（问号）、某个数写在哪一块（图里先拿掉它）、
 * 看图说出最大公因数（键盘）
 */
function vennCfQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(VENN_CF)
  const { only1, both, only2 } = cfRegions(a, b)
  const left = K('vf', { n: a })
  const right = K('vf', { n: b })
  const cap = K('vcf', { a, b })
  const mode = rng.int(0, 2)
  if (mode === 0) {
    const stem: StemPart[] = [T('vennMid'), vennPart(left, right, only1, both, only2, cap, 'both')]
    return strQ(KP_GCF, d, `vmid-${a}-${b}`, stem, listText(both), [listText(only1), listText(only2), listText(factorsOf(a))], rng, 'factor')
  }
  if (mode === 1) {
    const all = [...only1.map((x) => ['only1', x] as const), ...both.map((x) => ['both', x] as const), ...only2.map((x) => ['only2', x] as const)]
    const [region, x] = rng.pick(all)
    const drop = (xs: number[]): number[] => xs.filter((y) => y !== x)
    const stem: StemPart[] = [T('vennWhere', { x }), vennPart(left, right, drop(only1), drop(both), drop(only2), cap)]
    return keyQ(KP_GCF, d, `vwhere-${a}-${b}-${x}`, stem, K(REGION_KEY[region]), [K('venn.left'), K('venn.mid'), K('venn.right')], rng, 'factor')
  }
  const g = gcd(a, b)
  return intQ(KP_GCF, d, `vgcf-${a}-${b}`, [T('vennGcf', { a, b }), vennPart(left, right, only1, both, only2, cap)], g, rng, [both[both.length - 2] ?? 1, Math.min(a, b), g * 2], { type: 'factor' })
}

/** 例 2、做一做 3、练习十五 2：a 和 b 的最大公因数（三类数都要出） */
function gcfQ(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  const pool = r < 0.5 ? (d === 1 ? GCF_GENERAL.slice(0, 14) : GCF_GENERAL) : r < 0.75 ? GCF_MULTIPLE : GCF_ONE
  const [a, b] = rng.pick(pool)
  const g = gcd(a, b)
  return intQ(KP_GCF, d, `gcf-${a}-${b}`, [T('gcf', { a, b })], g, rng, [Math.min(a, b), g * 2, Math.max(1, g - 1), a * b <= 999 ? 1 : g + 1], { type: 'factor', max: Math.max(a, b) + 10 })
}

/** 例 3：长方形地面铺正方形地砖，边长最大是几分米（键盘）；边长 s 分米的能正好铺满吗 */
const TILES: [number, number][] = [[16, 12], [18, 12], [20, 15], [24, 18], [30, 20], [21, 14], [24, 16], [15, 10], [28, 21], [27, 18]]
function tileQ(d: Difficulty, rng: RNG): Question {
  const [L, W] = rng.pick(TILES)
  const g = gcd(L, W)
  if (rng.chance(0.65)) return intQ(KP_GCF, d, `tile-${L}-${W}`, [T('tile', { L, W })], g, rng, [W, L - W, g * 2, g - 1], { type: 'factor' })
  const yes = factorsOf(g).filter((x) => x > 1)
  const no = uniq([...factorsOf(L), ...factorsOf(W)]).filter((x) => x > 1 && x < W && (L % x !== 0 || W % x !== 0))
  const ok = no.length === 0 || rng.chance(0.5)
  const s = rng.pick(ok ? yes : no)
  return keyQ(KP_GCF, d, `tilecan-${L}-${W}-${s}`, [T('tileCan', { L, W, s })], K(ok ? 'can' : 'cannot'), [K(ok ? 'cannot' : 'can')], rng, 'factor')
}

/** 练习十五 3 / 4 / 5 / 6、练习十六 7、练习二十 5：三个数、分子和分母、剪正方形、站排、分本子、大扫除分组 */
const GCF3: [number, number, number][] = [[8, 16, 20], [12, 18, 30], [6, 9, 15], [12, 16, 44], [10, 20, 25], [18, 24, 30], [9, 12, 21], [14, 21, 28]]
const FRAC_GCF: Frac[] = [[7, 9], [8, 36], [18, 72], [9, 15], [21, 49], [11, 66], [12, 30], [16, 40], [15, 25], [14, 35]]
const PAPER: [number, number][] = [[70, 50], [60, 40], [48, 36], [45, 30], [56, 42], [80, 60]]
const ROWS: [number, number][] = [[48, 36], [40, 32], [45, 30], [54, 42], [36, 24], [56, 48]]
const SHARE2: [number, number][] = [[48, 64], [36, 54], [24, 40], [30, 45], [42, 56], [32, 48]]
const SWEEP: [number, number][] = [[48, 54], [42, 56], [36, 45], [40, 48], [45, 60]]
function gcfStoryQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 6)
  if (r === 0) {
    const [a, b, c] = rng.pick(GCF3)
    const g = gcd(gcd(a, b), c)
    return intQ(KP_GCF, d, `gcf3-${a}-${b}-${c}`, [T('gcf3', { a, b, c })], g, rng, [gcd(a, b), gcd(b, c), g * 2], { type: 'factor' })
  }
  if (r === 1) {
    const f = rng.pick(FRAC_GCF)
    const g = gcd(f[0], f[1])
    return intQ(KP_GCF, d, `fgcf-${fstr(f)}`, [T('fracGcf', { f: fstr(f) })], g, rng, [f[0], g * 2, Math.max(1, g - 1)], { type: 'factor', max: f[1] })
  }
  if (r === 2) {
    const [L, W] = rng.pick(PAPER)
    const g = gcd(L, W)
    return intQ(KP_GCF, d, `paper-${L}-${W}`, [T('paper', { L, W })], g, rng, [g / 2, g * 2, L - W], { type: 'factor' })
  }
  if (r === 3) {
    const [a, b] = rng.pick(ROWS)
    const g = gcd(a, b)
    if (rng.chance(0.6)) return intQ(KP_GCF, d, `rows-${a}-${b}`, [T('rows', { a, b })], g, rng, [g / 2, a - b, g * 2], { type: 'factor' })
    return intQ(KP_GCF, d, `rowsb-${a}-${b}`, [T('rowsBoys', { a, b })], a / g, rng, [b / g, g, a / g + 1], { type: 'factor' })
  }
  if (r === 4) {
    const [a, b] = rng.pick(SHARE2)
    const g = gcd(a, b)
    return intQ(KP_GCF, d, `share2-${a}-${b}`, [T('share2', { a, b })], g, rng, [g / 2, b - a, g * 2], { type: 'factor' })
  }
  if (r === 5) {
    const [a, b] = rng.pick(SWEEP)
    const g = gcd(a, b)
    return intQ(KP_GCF, d, `sweep-${a}-${b}`, [T('sweep', { a, b })], g, rng, [g / 2, b - a, g * 2], { type: 'factor' })
  }
  // 练习十五 9(3)：甲数是乙数的倍数，最大公因数是乙数
  return keyQ(KP_GCF, d, 'jiayi', [T('jiaYi')], K('jy.b'), [K('jy.a'), '1', K('jy.prod')], rng, 'factor')
}

/** 练习十五 8（改成选择）：哪两个数的最大公因数是 1；练习十五 11*：三根木棒截成一样的小段 */
const ONE_PAIRS: [number, number][] = [[8, 9], [4, 15], [9, 10], [14, 15], [7, 12], [5, 8]]
const NOT_ONE_PAIRS: [number, number][] = [[6, 9], [4, 10], [12, 15], [8, 14], [9, 21], [10, 25], [6, 8]]
const STICKS3: [number, number, number][] = [[12, 16, 44], [18, 24, 30], [20, 30, 45], [16, 24, 40], [15, 21, 27]]
function gcfHardQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [a, b] = rng.pick(ONE_PAIRS)
    const wrongs = rng.shuffle(NOT_ONE_PAIRS).slice(0, 3).map(([x, y]) => K('pair', { a: x, b: y }))
    return keyQ(KP_GCF, d, `one-${a}-${b}`, [T('gcfOne')], K('pair', { a, b }), wrongs, rng, 'factor')
  }
  const [a, b, c] = rng.pick(STICKS3)
  const g = gcd(gcd(a, b), c)
  return intQ(KP_GCF, d, `sticks-${a}-${b}-${c}`, [T('sticks', { a, b, c })], g, rng, [gcd(a, b), g * 2, g / 2], { type: 'factor' })
}

const GCF: Table = {
  1: [
    [18, (d, rng) => cfListQ(d, rng)],
    [14, (d, rng) => cfPickQ(d, rng)],
    [22, (d, rng) => vennCfQ(d, rng)],
    [28, (d, rng) => gcfQ(d, rng)],
    [18, (d, rng) => tileQ(d, rng)],
  ],
  2: [
    [40, (d, rng) => gcfStoryQ(d, rng)],
    [20, (d, rng) => gcfQ(d, rng)],
    [12, (d, rng) => cfListQ(d, rng)],
    [14, (d, rng) => vennCfQ(d, rng)],
    [14, (d, rng) => tileQ(d, rng)],
  ],
  3: [
    [40, (d, rng) => gcfHardQ(d, rng)],
    [35, (d, rng) => gcfStoryQ(d, rng)],
    [25, (d, rng) => gcfQ(d, rng)],
  ],
}
defineGenerator(KP_GCF, (d, rng) => pickBy(rng, GCF[d], d))

// ═════════════════════════════════════════════════════════════
// 7. 约分（p65–67：例 4、最简分数、做一做 1 / 2；练习十六）
// ═════════════════════════════════════════════════════════════

/** 课本约分的分数（例 4、做一做、练习十六） */
const REDUCE_BOOK: Frac[] = [[24, 30], [20, 45], [4, 18], [12, 48], [9, 15], [16, 24], [28, 42], [15, 45], [14, 56], [25, 75], [10, 30], [7, 28], [5, 20], [15, 36], [18, 27], [12, 16], [6, 8], [8, 12], [21, 35], [30, 48]]
function reduceSource(d: Difficulty, rng: RNG): Frac {
  if (rng.chance(0.6)) return rng.pick(REDUCE_BOOK)
  const [a, b] = rng.pick(BASE_F)
  // 乘的倍数收窄（每个不同的分数都是一条朗读音频）
  const k = rng.int(2, d === 1 ? 3 : 4)
  return [a * k, b * k]
}

/** 例 4：把 24/30 约成最简分数（考写法：没约完的 12/15、8/10 也是干扰项；还有颠倒的、只约了分子的） */
function simplestQ(d: Difficulty, rng: RNG): Question {
  const f = reduceSource(d, rng)
  const s = simplest(f)
  const g = gcd(f[0], f[1])
  const partial: Frac[] = factorsOf(g).filter((x) => x > 1 && x < g).map((x) => [f[0] / x, f[1] / x])
  return fracQ(KP_REDUCE, d, `simp-${fstr(f)}`, [T('simplest', { f: fstr(f) })], s, [...rng.shuffle(partial), f, [s[1], s[0]], [s[0], f[1]], [s[0], s[1] + 1]], rng, { eq: true })
}

/** 例 4「有没有更简便的方法」：分子和分母同时除以几，一次约成最简分数（键盘，问号在箭头上） */
function gcdDivQ(d: Difficulty, rng: RNG): Question {
  const f = reduceSource(d, rng)
  const s = simplest(f)
  const g = gcd(f[0], f[1])
  const stem: StemPart[] = [T('gcdDiv', { f: fstr(f) }), chain([fr(f[0], f[1]), tx('='), fr(s[0], s[1])], [{ from: 0, to: 2, top: '÷?', bottom: '÷?' }])]
  return intQ(KP_REDUCE, d, `gdiv-${fstr(f)}`, stem, g, rng, [...factorsOf(g).filter((x) => x > 1 && x < g), 2, g * 2], { numpad: true })
}

/** 做一做 1：下面哪个是最简分数；某个分数是最简分数吗 */
const SIMPLEST_YES: Frac[] = [[15, 16], [10, 21], [17, 30], [6, 11], [5, 12], [7, 9], [4, 15], [9, 20], [8, 15], [11, 14]]
const SIMPLEST_NO: Frac[] = [[20, 45], [4, 18], [12, 48], [9, 15], [6, 9], [14, 21], [10, 16], [15, 25], [12, 20], [8, 14]]
function pickSimplestQ(d: Difficulty, rng: RNG): Question {
  const c = rng.pick(SIMPLEST_YES)
  const wrongs = distinctFracs(SIMPLEST_NO, [c], 3, rng)
  return labelQuestion({ kpId: KP_REDUCE, type: 'fraction', difficulty: d, sig: `psimp-${fstr(c)}`, stem: [T('pickSimplest')], correct: fstr(c), distractors: wrongs.map(fstr), rng })
}
function isSimplestQ(d: Difficulty, rng: RNG): Question {
  const f = rng.pick([...SIMPLEST_YES, ...SIMPLEST_NO])
  return tfQ(KP_REDUCE, d, `issimp-${fstr(f)}`, [T('isSimplest', { f: fstr(f) })], isSimplest(f), rng)
}

/** 做一做 2：下面哪个分数和 4/6 相等（答案是约成最简的） */
const EQ_MATCH: Frac[] = [[4, 6], [3, 9], [6, 8], [9, 21], [10, 25], [8, 12], [6, 15], [12, 18], [15, 20], [14, 21]]
function eqMatchQ(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(EQ_MATCH)
  const s = simplest(f)
  return fracQ(KP_REDUCE, d, `eqm-${fstr(f)}`, [T('whichEq', { f: fstr(f) })], s, [[s[1], s[0]], [s[0], s[1] + 1], [s[0] + 1, s[1]], [f[0] - 1, f[1] - 1], [s[0] + 1, s[1] + 1]], rng)
}

/** 练习十六 1：两个一样大的圆，左边分 p × k 份涂 q × k 份，右边分 p 份涂 q（或差一份）——哪边涂色部分大 */
function circlesQ(d: Difficulty, rng: RNG): Question {
  const p = rng.pick([4, 6, 8])
  const q = rng.int(1, p - 1)
  const k = p <= 6 ? rng.pick([2, 3]) : 2
  const equal = rng.chance(0.5)
  const q2 = equal ? q : q === 1 ? 2 : q === p - 1 ? p - 2 : q + rng.pick([-1, 1])
  const swap = rng.chance(0.5)
  const many: FracPic = { shape: 'circle', parts: p * k, shaded: range(q * k) }
  const few: FracPic = { shape: 'circle', parts: p, shaded: range(q2) }
  const [left, right] = swap ? [few, many] : [many, few]
  const lv: Frac = swap ? [q2, p] : [q * k, p * k]
  const rv: Frac = swap ? [q * k, p * k] : [q2, p]
  const s = cmpFrac(lv, rv)
  return keyQ(KP_REDUCE, d, `circ-${fstr(lv)}-${fstr(rv)}`, [T('circles'), picPart(left, right)], K(s === 0 ? 'side.same' : s > 0 ? 'side.left' : 'side.right'), [K('side.left'), K('side.right'), K('side.same')], rng)
}

/** 练习十六 2：下面哪个分数的分子和分母有公因数 k */
const HAS_CF: Frac[] = [[4, 8], [9, 12], [15, 20], [30, 45], [40, 60], [84, 96], [6, 10], [10, 25], [21, 27], [14, 35], [7, 9], [11, 13], [5, 12]]
function hasCfQ(d: Difficulty, rng: RNG): Question {
  const k = rng.pick([2, 3, 5])
  const yes = HAS_CF.filter((f) => f[0] % k === 0 && f[1] % k === 0)
  const no = HAS_CF.filter((f) => f[0] % k !== 0 || f[1] % k !== 0)
  const c = rng.pick(yes)
  return strQ(KP_REDUCE, d, `hascf-${k}-${fstr(c)}`, [T('hasCf', { k })], fstr(c), distinctFracs(no, [c], 3, rng).map(fstr), rng)
}

/** 练习十六 3：约分后的分数已经是最简分数了吗（16/24 = 4/6 没约完；15/36 = 5/12 约完了） */
const DONE: [Frac, Frac][] = [
  [[16, 24], [4, 6]],
  [[15, 36], [5, 12]],
  [[28, 42], [14, 21]],
  [[15, 45], [3, 9]],
  [[78, 87], [26, 29]],
  [[12, 18], [2, 3]],
  [[20, 30], [2, 3]],
  [[24, 36], [6, 9]],
  [[18, 24], [3, 4]],
  [[40, 60], [4, 6]],
]
function doneQ(d: Difficulty, rng: RNG): Question {
  const [f, g] = rng.pick(DONE)
  return tfQ(KP_REDUCE, d, `done-${fstr(f)}`, [T('done', { f: fstr(f), g: fstr(g) })], isSimplest(g), rng)
}

/** 练习十六 4：拍了 t 张照片，a 张是喜欢的——喜欢的 / 其他的占几分之几（用最简分数表示） */
const PHOTO: [number, number][] = [[80, 35], [60, 24], [48, 30], [72, 45], [50, 35], [36, 27], [40, 15]]
function photoQ(d: Difficulty, rng: RNG): Question {
  const [t, a] = rng.pick(PHOTO)
  const other = rng.chance(0.4)
  const f: Frac = other ? [t - a, t] : [a, t]
  const s = simplest(f)
  return fracQ(KP_REDUCE, d, `photo-${t}-${a}-${other ? 'o' : 'l'}`, [T(other ? 'photoOther' : 'photo', { t, a })], s, [f, [s[1] - s[0], s[1]], [a, t - a], [s[1], s[0]]], rng, { eq: true })
}

/** 练习十六 5：下面哪个分数等于 1/4（1/3）——其余几个等于另一个 */
const QUARTER: Frac[] = [[14, 56], [7, 28], [5, 20], [11, 44], [6, 24], [9, 36]]
const THIRD: Frac[] = [[25, 75], [10, 30], [15, 45], [33, 99], [6, 18], [12, 36]]
function eqToQ(d: Difficulty, rng: RNG): Question {
  const quarter = rng.chance(0.5)
  const c = rng.pick(quarter ? QUARTER : THIRD)
  const wrongs = rng.shuffle(quarter ? THIRD : QUARTER).slice(0, 3)
  return strQ(KP_REDUCE, d, `eqto-${quarter ? 4 : 3}-${fstr(c)}`, [T('eqTo', { u: quarter ? '1/4' : '1/3' })], fstr(c), wrongs.map(fstr), rng)
}

/** 练习十六 8：晚上 s 时睡、早上 w 时起，睡觉的时间占全天的几分之几（最简） */
const SLEEP: [number, number][] = [[9, 7], [8, 6], [9, 6], [10, 7], [8, 7], [10, 6]]
function sleepDayQ(d: Difficulty, rng: RNG): Question {
  const [s, w] = rng.pick(SLEEP)
  const h = 12 - s + w
  const ans = simplest([h, 24])
  return fracQ(KP_REDUCE, d, `sleep-${s}-${w}`, [T('sleepDay', { s, w })], ans, [[h, 24], [24 - h, 24], [h, 12], [ans[1], ans[0]]], rng, { eq: true })
}

/** 练习十六 9：先约分，再化成带分数（考写法：没约分的带分数也是干扰项） */
const REDUCE_MIX: Frac[] = [[15, 12], [20, 12], [77, 21], [70, 32], [90, 80], [150, 60], [18, 8], [26, 6], [21, 6], [44, 8]]
function reduceMixQ(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(REDUCE_MIX)
  const s = simplest(f)
  const m = toMix(s)
  return mixQ(KP_REDUCE, d, `rmix-${fstr(f)}`, [T('reduceMix', { f: fstr(f) })], m, [toMix(f), ...mixCands(s)], rng, true)
}

/** 练习十六 10：先约分，再比一比 */
const REDUCE_CMP: [Frac, Frac][] = [
  [[12, 16], [9, 12]],
  [[4, 12], [5, 20]],
  [[4, 14], [9, 21]],
  [[70, 35], [90, 40]],
  [[6, 8], [10, 15]],
  [[10, 25], [6, 15]],
  [[15, 18], [20, 24]],
  [[8, 20], [9, 15]],
]
function reduceCmpQ(d: Difficulty, rng: RNG): Question {
  const [f, g] = rng.pick(REDUCE_CMP)
  return cmpQ(KP_REDUCE, d, `rcmp-${fstr(f)}-${fstr(g)}`, fstr(f), fstr(g), cmpFrac(f, g), rng, 'fraction', 'reduceCmp')
}

/** 练习十六 11(1)：几厘米是几分之几分米（最简） */
function dmQ(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([2, 4, 5, 6, 8, 12, 15, 25])
  const s = simplest([a, 10])
  return fracQ(KP_REDUCE, d, `dm-${a}`, [T('dm', { a })], s, [[a, 10], [a, 100], [s[1], s[0]], [s[0], s[1] + 1]], rng, { eq: true })
}

/** 练习十六 13*：一个分数用 2 约了两次、用 3 约了一次，得到 s，原来的分数（12 倍） */
const ORIG: Frac[] = [[3, 8], [1, 2], [2, 3], [3, 4], [5, 6], [4, 5], [2, 5]]
function origQ(d: Difficulty, rng: RNG): Question {
  const s = rng.pick(ORIG)
  return fracQ(KP_REDUCE, d, `orig-${fstr(s)}`, [T('orig', { f: fstr(s) })], [s[0] * 12, s[1] * 12], [[s[0] * 4, s[1] * 4], [s[0] * 6, s[1] * 6], [s[0] * 7, s[1] * 7], [s[0] * 24, s[1] * 24]], rng, { eq: true })
}

/** 第 3 档：看着能约、其实是最简的（31/91），看着是最简、其实能约的（51/85 = 3/5） */
const TRAP: [Frac, boolean][] = [
  [[31, 91], true],
  [[51, 85], false],
  [[57, 76], false],
  [[39, 91], false],
  [[23, 69], false],
  [[29, 87], false],
  [[37, 74], false],
  [[17, 51], false],
  [[19, 95], false],
  [[13, 91], false],
  [[41, 87], true],
  [[47, 91], true],
]
function trapQ(d: Difficulty, rng: RNG): Question {
  const [f] = rng.pick(TRAP)
  return tfQ(KP_REDUCE, d, `trap-${fstr(f)}`, [T('isSimplest', { f: fstr(f) })], isSimplest(f), rng)
}

const REDUCE: Table = {
  1: [
    [30, (d, rng) => simplestQ(d, rng)],
    [20, (d, rng) => gcdDivQ(d, rng)],
    [18, (d, rng) => pickSimplestQ(d, rng)],
    [12, (d, rng) => isSimplestQ(d, rng)],
    [20, (d, rng) => eqMatchQ(d, rng)],
  ],
  2: [
    [12, (d, rng) => circlesQ(d, rng)],
    [10, (d, rng) => hasCfQ(d, rng)],
    [10, (d, rng) => doneQ(d, rng)],
    [12, (d, rng) => photoQ(d, rng)],
    [10, (d, rng) => eqToQ(d, rng)],
    [10, (d, rng) => sleepDayQ(d, rng)],
    [12, (d, rng) => reduceMixQ(d, rng)],
    [12, (d, rng) => reduceCmpQ(d, rng)],
    [12, (d, rng) => dmQ(d, rng)],
  ],
  3: [
    [30, (d, rng) => origQ(d, rng)],
    [30, (d, rng) => trapQ(d, rng)],
    [20, (d, rng) => reduceMixQ(d, rng)],
    [20, (d, rng) => simplestQ(d, rng)],
  ],
}
defineGenerator(KP_REDUCE, (d, rng) => pickBy(rng, REDUCE[d], d))

// ═════════════════════════════════════════════════════════════
// 8. 最小公倍数（p68–72：例 1 集合图、例 2、做一做、例 3 用长方形地砖铺正方形；练习十七）
// ═════════════════════════════════════════════════════════════

const LCM_GENERAL: [number, number][] = [[4, 6], [6, 8], [8, 10], [6, 15], [6, 9], [4, 10], [8, 12], [9, 12], [10, 15], [12, 18], [4, 14], [6, 10]]
const LCM_MULTIPLE: [number, number][] = [[3, 6], [2, 8], [3, 9], [5, 10], [4, 12], [6, 18], [7, 21], [8, 16]]
const LCM_ONE: [number, number][] = [[5, 6], [4, 9], [4, 15], [1, 7], [3, 4], [2, 5], [3, 5], [7, 8], [5, 8], [3, 7]]
const VENN_CM: [number, number][] = [[4, 6], [3, 4], [2, 3], [4, 10], [6, 8], [6, 9], [3, 5], [4, 5]]

/** 例 1：下面哪个数是 a 和 b 的公倍数（一个公倍数，三个只是其中一个数的倍数或都不是） */
function cmPickQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick([...LCM_GENERAL, ...LCM_ONE].filter(([x, y]) => lcm(x, y) <= 40 && x > 1))
  const l = lcm(a, b)
  const c = l * rng.int(1, Math.max(1, Math.floor(60 / l)))
  const near: number[] = []
  for (let x = 2; x <= 60; x++) if ((x % a === 0) !== (x % b === 0)) near.push(x)
  const wrongs = rng.shuffle(near.filter((x) => Math.abs(x - c) <= 24)).slice(0, 3)
  return strQ(KP_LCM, d, `cmp-${a}-${b}-${c}`, [T('cmPick', { a, b })], String(c), wrongs.map(String), rng, 'factor')
}

/** 集合图三块（倍数，列到三个公倍数为止，后面写「…」；左右两块最多写 6 个，图里放得下） */
export function cmRegions(a: number, b: number): { only1: number[]; both: number[]; only2: number[] } {
  const lim = lcm(a, b) * 3
  const ma: number[] = []
  const mb: number[] = []
  for (let x = a; x <= lim; x += a) ma.push(x)
  for (let x = b; x <= lim; x += b) mb.push(x)
  return { only1: ma.filter((x) => !mb.includes(x)).slice(0, 6), both: ma.filter((x) => mb.includes(x)), only2: mb.filter((x) => !ma.includes(x)).slice(0, 6) }
}
const dots = (xs: (number | string)[]): string[] => [...xs.map(String), '…']

/** 集合图（例 1、做一做）：中间那一块是哪些数、某个数写在哪一块、看图说出最小公倍数 */
function vennCmQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(VENN_CM)
  const { only1, both, only2 } = cmRegions(a, b)
  const left = K('vm', { n: a })
  const right = K('vm', { n: b })
  const cap = K('vcm', { a, b })
  const mode = rng.int(0, 2)
  if (mode === 0) {
    const stem: StemPart[] = [T('vennMid'), vennPart(left, right, dots(only1), dots(both), dots(only2), cap, 'both')]
    const wrongs = [listText(dots(only1.slice(0, 3))), listText(dots(only2.slice(0, 3))), listText(dots([a, a * 2, a * 3]))]
    return strQ(KP_LCM, d, `cmid-${a}-${b}`, stem, listText(dots(both)), wrongs, rng, 'factor')
  }
  if (mode === 1) {
    const all = [...only1.map((x) => ['only1', x] as const), ...both.map((x) => ['both', x] as const), ...only2.map((x) => ['only2', x] as const)]
    const [region, x] = rng.pick(all)
    const drop = (xs: number[]): string[] => dots(xs.filter((y) => y !== x))
    const stem: StemPart[] = [T('vennWhere', { x }), vennPart(left, right, drop(only1), drop(both), drop(only2), cap)]
    return keyQ(KP_LCM, d, `cwhere-${a}-${b}-${x}`, stem, K(REGION_KEY[region]), [K('venn.left'), K('venn.mid'), K('venn.right')], rng, 'factor')
  }
  const l = lcm(a, b)
  return intQ(KP_LCM, d, `vlcm-${a}-${b}`, [T('vennLcm', { a, b }), vennPart(left, right, dots(only1), dots(both), dots(only2), cap)], l, rng, [a * b === l ? l * 2 : a * b, l * 2, Math.max(a, b)], { type: 'factor' })
}

/** 例 2、做一做、练习十七 2：最小公倍数（三类数都要出） */
function lcmQ(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  const pool = r < 0.5 ? LCM_GENERAL : r < 0.75 ? LCM_MULTIPLE : LCM_ONE
  const [a, b] = rng.pick(pool)
  const l = lcm(a, b)
  return intQ(KP_LCM, d, `lcm-${a}-${b}`, [T('lcm', { a, b })], l, rng, [a * b === l ? l * 2 : a * b, l * 2, Math.max(a, b), gcd(a, b) === 1 ? a + b : l / 2], { type: 'factor', max: Math.max(l * 3, 40) })
}

/** 例 3：长方形地砖铺成正方形，边长最小是几分米 */
const SQUARE: [number, number][] = [[3, 2], [4, 3], [6, 4], [5, 3], [8, 6], [9, 6], [10, 4], [12, 8]]
function squareQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(SQUARE)
  const l = lcm(a, b)
  return intQ(KP_LCM, d, `sq-${a}-${b}`, [T('square', { a, b })], l, rng, [a * b === l ? l * 2 : a * b, a + b, l * 2], { type: 'factor' })
}

/** 例 3 后的做一做：每 a 人一组或每 b 人一组都正好分完——最少多少人（键盘）；不到 lim 人，可能是多少人（只有一个选项对） */
const GROUPS: [number, number][] = [[6, 9], [4, 6], [6, 8], [4, 10], [3, 4], [5, 6], [6, 10], [8, 12]]
function groupQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(GROUPS)
  const l = lcm(a, b)
  if (rng.chance(0.5)) return intQ(KP_LCM, d, `gmin-${a}-${b}`, [T('groupMin', { a, b })], l, rng, [a * b === l ? l * 2 : a * b, a + b, l * 2], { type: 'factor' })
  const lim = l * 2 + rng.int(1, l - 1)
  const c = rng.pick([l, l * 2])
  const wrongs: number[] = []
  for (let x = Math.min(a, b); x < lim; x++) if ((x % a === 0) !== (x % b === 0)) wrongs.push(x)
  return strQ(KP_LCM, d, `gmay-${a}-${b}-${lim}-${c}`, [T('groupMay', { a, b, lim })], String(c), rng.shuffle(wrongs).slice(0, 3).map(String), rng, 'factor')
}

/** 例 1「两个数有没有最大的公倍数」 */
function noMaxQ(d: Difficulty, rng: RNG): Question {
  return tfQ(KP_LCM, d, 'nomax', [T('noMax')], true, rng, 'factor')
}

/** 练习十七：100 以内公倍数有几个、某数是不是公倍数、两句判断、既是…又是…的倍数、浇水、分母的最小公倍数、公交车、跑步、方巾、喷泉 */
const WATER: [number, number][] = [[4, 6], [3, 4], [2, 5], [4, 5], [3, 5], [2, 7], [6, 8], [3, 8]]
const BUS: [number, number][] = [[6, 8], [4, 6], [10, 15], [8, 12], [6, 9], [5, 6]]
const RUN: [number, number][] = [[3, 4], [4, 6], [3, 5], [4, 5], [6, 8], [2, 3]]
const CLOTH: [number, number][] = [[8, 10], [6, 8], [10, 15], [4, 6], [6, 9], [12, 18]]
const FOUNTAIN: [number, number][] = [[10, 6], [8, 6], [12, 8], [15, 10], [9, 6]]
const DEN_PAIRS: [Frac, Frac][] = [
  [[1, 12], [7, 6]],
  [[3, 8], [2, 3]],
  [[7, 9], [5, 6]],
  [[1, 4], [5, 6]],
  [[3, 10], [4, 15]],
  [[5, 8], [1, 6]],
]
function lcmStoryQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 9)
  if (r === 0) {
    const [a, b] = rng.pick([[6, 10], [4, 6], [8, 12], [6, 9], [10, 15]] as [number, number][])
    const n = Math.floor(100 / lcm(a, b))
    return intQ(KP_LCM, d, `cnt-${a}-${b}`, [T('countCm', { a, b })], n, rng, [n + 1, n - 1, Math.floor(100 / a)], { type: 'factor' })
  }
  if (r === 1) {
    const [a, b] = rng.pick([[6, 18], [21, 14], [12, 8], [9, 24]] as [number, number][])
    const x = rng.pick([36, 48, 84])
    return tfQ(KP_LCM, d, `iscm-${x}-${a}-${b}`, [T('isCm', { x, a, b })], x % a === 0 && x % b === 0, rng, 'factor')
  }
  if (r === 2) {
    const big = rng.chance(0.5)
    return tfQ(KP_LCM, d, big ? 'tf-bigger' : 'tf-product', [T(big ? 'tf.lcmBigger' : 'tf.product')], !big, rng, 'factor')
  }
  if (r === 3) {
    const [a, b] = rng.pick([[8, 6], [4, 6], [6, 9], [4, 10]] as [number, number][])
    const l = lcm(a, b)
    const c = l * rng.int(1, 3)
    const wrongs: number[] = []
    for (let x = 10; x <= 72; x++) if ((x % a === 0) !== (x % b === 0)) wrongs.push(x)
    return strQ(KP_LCM, d, `both-${a}-${b}-${c}`, [T('both', { a, b })], String(c), rng.shuffle(wrongs).slice(0, 3).map(String), rng, 'factor')
  }
  if (r === 4) {
    const [a, b] = rng.pick(WATER)
    const day = 1 + lcm(a, b)
    return intQ(KP_LCM, d, `water-${a}-${b}`, [T('water', { a, b })], day, rng, [lcm(a, b), a * b + 1, day + 1], { type: 'factor', max: 31 })
  }
  if (r === 5) {
    const [f, g] = rng.pick(DEN_PAIRS)
    const l = lcm(f[1], g[1])
    return intQ(KP_LCM, d, `denlcm-${fstr(f)}-${fstr(g)}`, [T('denLcm', { f: fstr(f), g: fstr(g) })], l, rng, [f[1] * g[1], Math.max(f[1], g[1]), l * 2], { type: 'factor', max: Math.max(80, l * 3) })
  }
  if (r === 6) {
    const [a, b] = rng.pick(BUS)
    const l = lcm(a, b)
    return intQ(KP_LCM, d, `bus-${a}-${b}`, [T('bus', { a, b })], l, rng, [a * b === l ? l * 2 : a * b, a + b, l * 2], { type: 'factor' })
  }
  if (r === 7) {
    const [a, b] = rng.pick(RUN)
    const l = lcm(a, b)
    if (rng.chance(0.6)) return intQ(KP_LCM, d, `run-${a}-${b}`, [T('run', { a, b })], l, rng, [a * b === l ? l * 2 : a * b, a + b, l * 2], { type: 'factor' })
    return intQ(KP_LCM, d, `runl-${a}-${b}`, [T('runLaps', { a, b })], l / a, rng, [l / b, a, l / a + 1], { type: 'factor' })
  }
  if (r === 8) {
    const [a, b] = rng.pick(CLOTH)
    const l = lcm(a, b)
    return intQ(KP_LCM, d, `cloth-${a}-${b}`, [T('cloth', { a, b })], l, rng, [a * b === l ? l * 2 : a * b, gcd(a, b), l * 2], { type: 'factor' })
  }
  const [a, b] = rng.pick(FOUNTAIN)
  const l = lcm(a, b)
  return intQ(KP_LCM, d, `ftn-${a}-${b}`, [T('fountain', { a, b })], l, rng, [a * b === l ? l * 2 : a * b, a + b, l * 2], { type: 'factor' })
}

/** 练习十七 11*：n 是下面哪两个数的最小公倍数；练习十八 10：两个数的积 = 最大公因数 × 最小公倍数；练习二十 10*：石榴 */
const WHICH_N = [36, 24, 30, 12, 20, 18]
const PAIR_CANDS: [number, number][] = [[4, 9], [9, 12], [12, 18], [4, 18], [6, 12], [3, 12], [2, 18], [6, 9], [4, 6], [3, 8], [6, 8], [8, 12], [2, 12], [3, 6], [5, 6], [6, 10], [3, 10], [10, 15], [5, 10], [3, 5], [4, 5], [4, 10], [2, 10], [5, 4], [2, 9], [3, 4], [2, 6]]
const OTHER: [number, number][] = [[12, 18], [8, 12], [6, 15], [10, 15], [12, 16], [9, 12], [6, 8], [4, 6]]
const POME: [number, number, number][] = [[8, 9, 3], [6, 8, 1], [4, 6, 2], [5, 6, 1], [6, 9, 2], [4, 5, 3]]
function lcmHardQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 2)
  if (r === 0) {
    const n = rng.pick(WHICH_N)
    const ok = PAIR_CANDS.filter(([x, y]) => lcm(x, y) === n && x !== n && y !== n)
    const no = PAIR_CANDS.filter(([x, y]) => lcm(x, y) !== n)
    const [a, b] = rng.pick(ok)
    const wrongs = rng.shuffle(no).slice(0, 3).map(([x, y]) => K('pair', { a: x, b: y }))
    return keyQ(KP_LCM, d, `which-${n}-${a}-${b}`, [T('whichLcm', { n })], K('pair', { a, b }), wrongs, rng, 'factor')
  }
  if (r === 1) {
    const [x, y] = rng.pick(OTHER)
    const first = rng.chance(0.5)
    const a = first ? x : y
    const ans = first ? y : x
    const g = gcd(x, y)
    const l = lcm(x, y)
    return intQ(KP_LCM, d, `other-${x}-${y}-${a}`, [T('other', { g, l, a })], ans, rng, [l / g, l - a, g * a], { type: 'factor' })
  }
  const [a, b, rem] = rng.pick(POME)
  const v = lcm(a, b) + rem
  return intQ(KP_LCM, d, `pome-${a}-${b}-${rem}`, [T('pome', { a, b, r: rem })], v, rng, [lcm(a, b), a * b + rem, v + a], { type: 'factor', max: v * 2 })
}

const LCM: Table = {
  1: [
    [16, (d, rng) => cmPickQ(d, rng)],
    [18, (d, rng) => vennCmQ(d, rng)],
    [26, (d, rng) => lcmQ(d, rng)],
    [16, (d, rng) => squareQ(d, rng)],
    [16, (d, rng) => groupQ(d, rng)],
    [8, (d, rng) => noMaxQ(d, rng)],
  ],
  2: [
    [50, (d, rng) => lcmStoryQ(d, rng)],
    [16, (d, rng) => lcmQ(d, rng)],
    [12, (d, rng) => vennCmQ(d, rng)],
    [12, (d, rng) => groupQ(d, rng)],
    [10, (d, rng) => squareQ(d, rng)],
  ],
  3: [
    [50, (d, rng) => lcmHardQ(d, rng)],
    [30, (d, rng) => lcmStoryQ(d, rng)],
    [20, (d, rng) => lcmQ(d, rng)],
  ],
}
defineGenerator(KP_LCM, (d, rng) => pickBy(rng, LCM[d], d))

// ═════════════════════════════════════════════════════════════
// 9. 通分（p73–76：例 4 同分母 / 同分子比大小、例 5 通分；做一做；练习十八）
// ═════════════════════════════════════════════════════════════

/** 例 4、做一做：同分母分数比大小（课本的数 + 随机的） */
const SAME_DEN_BOOK: [number, number, number][] = [[3, 7, 10], [3, 4, 13], [2, 4, 7], [5, 2, 9], [5, 23, 68], [5, 3, 7], [7, 11, 16], [11, 13, 21], [19, 9, 25], [3, 1, 8], [11, 17, 25], [5, 8, 13]]
function sameDenQ(d: Difficulty, rng: RNG): Question {
  let a: number
  let b: number
  let den: number
  if (rng.chance(0.5)) [a, b, den] = rng.pick(SAME_DEN_BOOK)
  else {
    den = rng.pick([7, 9, 11, 12])
    a = rng.int(1, den - 1)
    b = rng.int(1, den - 1)
    if (b === a) b = a === 1 ? 2 : a - 1
  }
  return cmpQ(KP_COMMON, d, `sd-${a}-${b}-${den}`, fs(a, den), fs(b, den), a - b, rng, 'compare')
}

/** 例 4「再比较一下」、做一做：同分子分数比大小（分母小的大） */
const SAME_NUM_BOOK: [number, number, number][] = [[3, 8, 11], [5, 6, 8], [12, 17, 19], [19, 94, 73], [3, 5, 4], [4, 9, 5], [10, 19, 13], [15, 17, 22], [5, 7, 17], [12, 23, 19]]
function sameNumQ(d: Difficulty, rng: RNG): Question {
  let n: number
  let a: number
  let b: number
  if (rng.chance(0.5)) [n, a, b] = rng.pick(SAME_NUM_BOOK)
  else {
    n = rng.int(1, 5)
    a = rng.int(6, 12)
    b = rng.int(6, 12)
    if (b === a) b = a === 12 ? 11 : a + 1
  }
  return cmpQ(KP_COMMON, d, `sn-${n}-${a}-${b}`, fs(n, a), fs(n, b), b - a, rng, 'compare')
}

/** 例 4 / 例 5 的情境：陆地和海洋、黄豆和蚕豆；看书的页数（f、g 可能相等） */
function ctxCmpQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 3)
  if (r === 0) return keyQ(KP_COMMON, d, 'earth', [T('earth', { f: '3/10', g: '7/10' })], K('sea'), [K('land'), K('sameBig')], rng, 'compare')
  if (r === 1) return keyQ(KP_COMMON, d, 'bean', [T('bean', { f: '2/5', g: '1/4' })], K('bean.h'), [K('bean.c'), K('sameHigh')], rng, 'compare')
  const [f, g] = rng.pick(COMMON_PAIRS)
  const k = rng.int(2, 3)
  const g2: Frac = rng.chance(0.25) ? [f[0] * k, f[1] * k] : g
  const s = cmpFrac(f, g2)
  return keyQ(KP_COMMON, d, `read-${fstr(f)}-${fstr(g2)}`, [T('read', { f: fstr(f), g: fstr(g2) })], K(s === 0 ? 'same' : s > 0 ? 'p.ming' : 'p.hong'), [K('p.ming'), K('p.hong'), K('same')], rng, 'compare')
}

/** 例 5、做一做 2、练习十八 5 的两个分数 */
const COMMON_PAIRS: [Frac, Frac][] = [
  [[2, 3], [1, 5]],
  [[3, 4], [5, 8]],
  [[5, 6], [8, 15]],
  [[4, 7], [6, 11]],
  [[5, 6], [7, 8]],
  [[3, 7], [2, 9]],
  [[4, 9], [7, 18]],
  [[3, 8], [5, 9]],
  [[2, 5], [1, 4]],
  [[4, 5], [6, 7]],
  [[9, 10], [3, 4]],
  [[1, 6], [3, 4]],
  [[5, 12], [3, 8]],
  [[2, 9], [1, 6]],
]

/** 例 5、做一做 2：通分时用两个分母的最小公倍数作公分母，公分母是多少（键盘） */
function commonDenQ(d: Difficulty, rng: RNG): Question {
  const [f, g] = rng.pick(COMMON_PAIRS)
  const D = lcm(f[1], g[1])
  return intQ(KP_COMMON, d, `cden-${fstr(f)}-${fstr(g)}`, [T('commonDen', { f: fstr(f), g: fstr(g) })], D, rng, [f[1] * g[1] === D ? D * 2 : f[1] * g[1], f[1] + g[1], Math.max(f[1], g[1])], { max: Math.max(80, D * 3) })
}

/** 例 5：通分后其中一个分数的分子是多少（分数链，下面的箭头写着分母乘几；键盘） */
function commonNumQ(d: Difficulty, rng: RNG): Question {
  const [f, g] = rng.pick(COMMON_PAIRS)
  const D = lcm(f[1], g[1])
  const h = rng.chance(0.5) ? f : g
  const k = D / h[1]
  const stem: StemPart[] = [T('commonNum', { f: fstr(f), g: fstr(g), D, h: fstr(h) }), chain([fr(h[0], h[1]), tx('='), fr('?', D)], [{ from: 0, to: 2, bottom: `×${k}` }])]
  return intQ(KP_COMMON, d, `cnum-${fstr(f)}-${fstr(g)}-${fstr(h)}`, stem, h[0] * k, rng, [h[0], h[0] + k, D - h[0] * k], { numpad: true, max: Math.max(40, D) })
}

/** 一组通分的结果对不对：两个分数分母相同，且各自和原来的分数相等 */
export const validPair = (f: Frac, g: Frac, F: Frac, G: Frac): boolean => F[1] === G[1] && sameVal(f, F) && sameVal(g, G)

/** 例 5：通分的结果是哪一组（干扰：只改了分母、两个分子乘错了数、公分母对了分子没变） */
function commonPairQ(d: Difficulty, rng: RNG): Question {
  const [f, g] = rng.pick(COMMON_PAIRS)
  const D = lcm(f[1], g[1])
  const kf = D / f[1]
  const kg = D / g[1]
  const F: Frac = [f[0] * kf, D]
  const G: Frac = [g[0] * kg, D]
  const cands: [Frac, Frac][] = [
    [[f[0], D], [g[0], D]],
    [[f[0] * kg, D], [g[0] * kf, D]],
    [F, [g[0], D]],
    [[f[0], D], G],
    [[f[0] * kf, D], [g[0] * kg + 1, D]],
  ]
  const wrongs = cands.filter(([x, y]) => !validPair(f, g, x, y) && x[0] >= 1 && y[0] >= 1)
  const pair = (x: Frac, y: Frac): LStr => K('pair', { a: fstr(x), b: fstr(y) })
  return keyQ(KP_COMMON, d, `cpair-${fstr(f)}-${fstr(g)}`, [T('commonPair', { f: fstr(f), g: fstr(g) })], pair(F, G), wrongs.map(([x, y]) => pair(x, y)), rng)
}

/** 例 5、做一做 1、练习十八 2 / 8：异分母分数比大小（有相等的 4/30 和 2/15） */
const DIFF_BOOK: [Frac, Frac][] = [
  [[2, 5], [1, 4]],
  [[2, 3], [3, 5]],
  [[4, 30], [2, 15]],
  [[8, 9], [5, 6]],
  [[1, 3], [3, 7]],
  [[2, 5], [3, 10]],
  [[5, 8], [7, 10]],
  [[2, 3], [5, 6]],
  [[19, 20], [14, 15]],
  [[4, 5], [7, 8]],
  [[2, 9], [1, 6]],
]
function diffCmpQ(d: Difficulty, rng: RNG): Question {
  let f: Frac
  let g: Frac
  if (rng.chance(0.45)) [f, g] = rng.pick(DIFF_BOOK)
  else if (d >= 2 && rng.chance(0.2)) [f, g] = rng.pick([[[13, 16], [3, 2]], [[5, 4], [7, 6]], [[9, 8], [8, 7]]] as [Frac, Frac][])
  else {
    const [a, b] = rng.pick(BASE_F)
    if (rng.chance(0.2)) {
      ;[f, g] = [[a, b], [a * 2, b * 2]]
    } else {
      let [c, e] = rng.pick(BASE_F)
      if (e === b) [c, e] = [c, e + 1 <= 12 ? e + 1 : e - 1]
      if (c >= e) c = e - 1
      ;[f, g] = [[a, b], [c, e]]
    }
  }
  if (rng.chance(0.5)) [f, g] = [g, f]
  return cmpQ(KP_COMMON, d, `dc-${fstr(f)}-${fstr(g)}`, fstr(f), fstr(g), cmpFrac(f, g), rng, 'compare')
}

/** 练习十八 3：下面哪个分数小于（大于）1/4 */
const QUARTER_CMP: Frac[] = [[1, 2], [1, 5], [3, 16], [3, 8], [3, 10], [1, 3], [2, 9], [2, 7], [3, 13], [4, 13]]
function lessQ(d: Difficulty, rng: RNG): Question {
  const less = rng.chance(0.5)
  const q: Frac = [1, 4]
  const side = QUARTER_CMP.filter((f) => (less ? cmpFrac(f, q) < 0 : cmpFrac(f, q) > 0))
  const other = QUARTER_CMP.filter((f) => (less ? cmpFrac(f, q) > 0 : cmpFrac(f, q) < 0))
  const c = rng.pick(side)
  return strQ(KP_COMMON, d, `${less ? 'less' : 'more'}-${fstr(c)}`, [T(less ? 'lessQ' : 'moreQ', { u: '1/4' })], fstr(c), rng.shuffle(other).slice(0, 3).map(fstr), rng, 'compare')
}

/** 练习十八 4 / 6 / 7：张叔叔和李叔叔、三个洲、喜欢的课外读物 */
function storyCmpQ(d: Difficulty, rng: RNG): Question {
  const r = rng.int(0, 3)
  if (r === 0) {
    const [f, g] = rng.pick([...COMMON_PAIRS, [[1, 2], [3, 5]] as [Frac, Frac]])
    const s = cmpFrac(f, g)
    return keyQ(KP_COMMON, d, `worker-${fstr(f)}-${fstr(g)}`, [T('worker', { f: fstr(f), g: fstr(g) })], K(s === 0 ? 'same' : s > 0 ? 'p.zhang' : 'p.li'), [K('p.zhang'), K('p.li'), K('same')], rng, 'compare')
  }
  if (r === 1) {
    const max = rng.chance(0.5)
    return keyQ(KP_COMMON, d, max ? 'cont-max' : 'cont-min', [T(max ? 'continent' : 'continentMin', { a: '3/10', b: '1/5', c: '3/25' })], K(max ? 'ct.asia' : 'ct.sa'), [K('ct.asia'), K('ct.africa'), K('ct.sa')], rng, 'compare')
  }
  if (r === 2) {
    const max = rng.chance(0.5)
    return keyQ(KP_COMMON, d, max ? 'book-max' : 'book-min', [T(max ? 'bookType' : 'bookTypeMin', { a: '7/12', b: '1/6', c: '1/4' })], K(max ? 'bk.sci' : 'bk.tale'), [K('bk.sci'), K('bk.tale'), K('bk.hist')], rng, 'compare')
  }
  return extremeQ(d, rng)
}

/** 练习十八 9：几个分数里最大（最小）的是哪个 */
const EXTREME_SETS: Frac[][] = [
  [[4, 5], [11, 12], [5, 6], [7, 10]],
  [[1, 2], [7, 10], [4, 5], [5, 6]],
  [[2, 3], [3, 4], [5, 8], [7, 12]],
  [[3, 5], [5, 8], [7, 10], [2, 3]],
  [[1, 3], [2, 5], [3, 8], [1, 4]],
  [[5, 6], [7, 9], [3, 4], [11, 12]],
]
function extremeQ(d: Difficulty, rng: RNG): Question {
  const set = rng.pick(EXTREME_SETS)
  const max = rng.chance(0.5)
  const sorted = [...set].sort((x, y) => cmpFrac(x, y))
  const c = max ? sorted[sorted.length - 1]! : sorted[0]!
  return strQ(KP_COMMON, d, `ext-${max ? 'max' : 'min'}-${set.map(fstr).join('_')}`, [T(max ? 'maxOf' : 'minOf')], fstr(c), set.filter((f) => f !== c).map(fstr), rng, 'compare')
}

/** 练习十八 11*、练习二十 11*：比 u 大又比 v 小的分数；思考题：一个最简分数，分子加 1 等于 1，分母加 1 等于 p/q */
const BETWEEN: [Frac, Frac, Frac, Frac[]][] = [
  [[1, 6], [1, 5], [11, 60], [[1, 7], [1, 4], [2, 9]]],
  [[1, 5], [1, 4], [2, 9], [[1, 6], [3, 10], [1, 3]]],
  [[7, 10], [4, 5], [3, 4], [[2, 3], [5, 6], [7, 8]]],
  [[1, 3], [1, 2], [2, 5], [[1, 4], [3, 5], [2, 7]]],
  [[2, 3], [3, 4], [7, 10], [[3, 5], [4, 5], [5, 6]]],
]
const RIDDLE: [Frac, Frac][] = [
  [[1, 2], [2, 3]],
  [[2, 3], [4, 5]],
  [[3, 4], [6, 7]],
  [[4, 5], [8, 9]],
  [[5, 6], [10, 11]],
]
function commonHardQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.55)) {
    const [u, v, c, wrongs] = rng.pick(BETWEEN)
    return strQ(KP_COMMON, d, `btw-${fstr(u)}-${fstr(v)}`, [T('between', { u: fstr(u), v: fstr(v) })], fstr(c), wrongs.map(fstr), rng, 'compare')
  }
  const [t, ans] = rng.pick(RIDDLE)
  const others = RIDDLE.map((x) => x[1]).filter((x) => x !== ans)
  return strQ(KP_COMMON, d, `riddle-${fstr(t)}`, [T('riddle', { f: fstr(t) })], fstr(ans), rng.shuffle(others).slice(0, 3).map(fstr), rng)
}

const COMMON: Table = {
  1: [
    [16, (d, rng) => sameDenQ(d, rng)],
    [14, (d, rng) => sameNumQ(d, rng)],
    [12, (d, rng) => ctxCmpQ(d, rng)],
    [16, (d, rng) => commonDenQ(d, rng)],
    [16, (d, rng) => commonNumQ(d, rng)],
    [12, (d, rng) => commonPairQ(d, rng)],
    [14, (d, rng) => diffCmpQ(d, rng)],
  ],
  2: [
    [16, (d, rng) => diffCmpQ(d, rng)],
    [10, (d, rng) => lessQ(d, rng)],
    [20, (d, rng) => storyCmpQ(d, rng)],
    [12, (d, rng) => extremeQ(d, rng)],
    [12, (d, rng) => commonNumQ(d, rng)],
    [10, (d, rng) => commonPairQ(d, rng)],
    [10, (d, rng) => sameNumQ(d, rng)],
    [10, (d, rng) => commonDenQ(d, rng)],
  ],
  3: [
    [45, (d, rng) => commonHardQ(d, rng)],
    [30, (d, rng) => diffCmpQ(d, rng)],
    [25, (d, rng) => extremeQ(d, rng)],
  ],
}
defineGenerator(KP_COMMON, (d, rng) => pickBy(rng, COMMON[d], d))
