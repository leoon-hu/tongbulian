import type { BarRow, ChainTerm, Difficulty, FracPic, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { mixed } from '@/engine/fraction'

// ─────────────────────────────────────────────────────────────
// 分数乘法（六上第二单元，课本 p16–31，2022 版课标新教材；六年级数学 B）。课本三个小节「分数乘整数」「一个数乘分数」
// 「分数、小数混合运算及运算律」，例 5、例 6 没印小节名（照知识结构图）。按例题拆成七个知识点：
// 分数乘整数：例 1 纸花 3/8 × 2、3/8 × 8（几个相同分数的和、先约分）、做一做面包 3/10 × 3；练习三 2、练习四 1、8，练习六 1、4。
// 一个数乘分数：例 2（1）2 公顷的 5/8（求一个数的几分之几 = 几分之几倍，2 ÷ 8 × 5，画图是 10 个 1/8 公顷）；练习三 3①、4、6–11。
// 分数乘分数：例 2（2）4/5 公顷的 2/3（格子图）、法则与「整数看成分母是 1 的分数」、做一做 1 看图计算、做一做 2；练习三 1、2、3②、5、12。
// 小数乘分数：例 3 松鼠尾巴 2.1 × 3/4、2.4 × 3/4（化成小数 / 化成分数 / 约分）、做一做 1–4；练习四 1、2，练习六 1。
// 分数混合运算和运算律：p22 混合运算顺序、三组比一比、例 4（交换结合、分配、连乘直接约分）、做一做 1、2；练习四 3–7、9、10、12、13，练习六 2、5、6。
// 连续求一个数的几分之几：例 5 休闲场所 4800 × 3/5 × 1/4（阅读理解、两种算法、回顾反思）、做一做 1、2；练习五 1、2、3。
// 求比一个数多或少几分之几的数：例 6 厨余垃圾 100 × (1 − 1/4)、做一做心跳 75 × (1 + 4/5)；练习五 4–9，练习四 11，练习六 3。
// 课本的规矩：结果约成最简分数，比 1 大的写最简假分数（例 2 写 5/4，不化带分数；只有拆数的 87 × 3/86 和练习三 12 用带分数）；
// 小数和分数相乘，结果是三位以内的有限小数写小数（1.8、1.575），否则写分数（7/6、27/160）。整数答案用数字键盘，其余做成选项，
// 选项里不放等值的两种写法，干扰项照课本暴露的错法造（分子分母都乘、整数和分子约分、分子相加分母相加、算错顺序、分配律只乘一项……）。
// 不出：涂色、画图、说理、称体重（练习三 11（2））、举例验证（练习四 13 改问照规律算的结果）。
// 朗读：「长」只在「长度」「长方形」「长江」里；「重」只在「体重」「超重」里（面包写「质量」、大象写「体重」）；「种」写「种植」，
// 「15 种」照写；「为」「还」「得」「应」「只有」「相当于」「处」不写；松鼠乐乐改叫贝贝；「六（1）班」写「六年级一班」；光盘行动不加引号。
// ─────────────────────────────────────────────────────────────

const K_INT = 'm6s1-02-frac-int'
const K_NUM = 'm6s1-02-num-frac'
const K_FF = 'm6s1-02-frac-frac'
const K_DEC = 'm6s1-02-dec-frac'
const K_LAW = 'm6s1-02-laws'
const K_CHAIN = 'm6s1-02-chain'
const K_ML = 'm6s1-02-more-less'

type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k: `m6.fmul.${k}`, p } : { k: `m6.fmul.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })
const range = (n: number, from = 0): number[] => Array.from({ length: n }, (_, i) => from + i)

// ══ 分数、小数的算法（分子、分母都是整数，分母 > 0）══

export type Frac = readonly [number, number]
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
export function reduce([n, d]: Frac): Frac {
  const g = gcd(n, d) || 1
  return [n / g, d / g]
}
export const mul = (...fs: Frac[]): Frac => reduce(fs.reduce<Frac>((p, f) => [p[0] * f[0], p[1] * f[1]], [1, 1]))
export const div = (a: Frac, b: Frac): Frac => reduce([a[0] * b[1], a[1] * b[0]])
export const add = (a: Frac, b: Frac): Frac => reduce([a[0] * b[1] + b[0] * a[1], a[1] * b[1]])
export const sub = (a: Frac, b: Frac): Frac => reduce([a[0] * b[1] - b[0] * a[1], a[1] * b[1]])
export const same = (a: Frac, b: Frac): boolean => a[0] * b[1] === b[0] * a[1]
export const less = (a: Frac, b: Frac): boolean => a[0] * b[1] < b[0] * a[1]
const I = (n: number): Frac => [n, 1]

/** 一个数的写法 → 分数：'3/8' → [3, 8]，'4' → [4, 1]，'2.4' → [12, 5]，带分数「3 3/86」（细空格）→ [261, 86] */
export function num(s: string): Frac {
  const m = /^(\d+) (\d+)\/(\d+)$/.exec(s)
  if (m) return reduce([Number(m[1]) * Number(m[3]) + Number(m[2]), Number(m[3])])
  const f = /^(\d+)\/(\d+)$/.exec(s)
  if (f) return [Number(f[1]), Number(f[2])]
  const dm = /^(\d+)\.(\d+)$/.exec(s)
  if (dm) return reduce([Number(dm[1]! + dm[2]!), 10 ** dm[2]!.length])
  return [Number(s), 1]
}
/** 写成分数：最简，分母是 1 的写整数 */
export function fs(f: Frac): string {
  const [n, d] = reduce(f)
  return d === 1 ? String(n) : `${n}/${d}`
}
/** 写成小数：三位以内的有限小数（1.8、1.575、0.72），不是就 null */
export function ds(f: Frac): string | null {
  const [n, d] = reduce(f)
  for (let k = 0; k <= 3; k++) {
    const p = 10 ** k
    if ((n * p) % d === 0) {
      const v = (n * p) / d
      if (k === 0) return String(v)
      const s = String(v).padStart(k + 1, '0')
      return `${s.slice(0, -k)}.${s.slice(-k)}`
    }
  }
  return null
}
/** 算式的值（整数、小数、分数、带分数、+ − × ÷、小括号）；「=」后面的不算 */
export function evalExpr(src: string): Frac {
  const toks = src.split('=')[0]!.match(/\d+ \d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[-+−×÷()]/g) ?? []
  let i = 0
  const atom = (): Frac => {
    const t = toks[i++]!
    if (t === '(') {
      const v = sum()
      i++ // )
      return v
    }
    return num(t)
  }
  const prod = (): Frac => {
    let v = atom()
    while (toks[i] === '×' || toks[i] === '÷') {
      const op = toks[i++]
      const r = atom()
      v = op === '×' ? mul(v, r) : div(v, r)
    }
    return v
  }
  const sum = (): Frac => {
    let v = prod()
    while (toks[i] === '+' || toks[i] === '−' || toks[i] === '-') {
      const op = toks[i++]
      const r = prod()
      v = op === '+' ? add(v, r) : sub(v, r)
    }
    return v
  }
  return sum()
}

/** 分数答案的干扰项：最简、值互不相同、不等于正确答案、大于 0；cands 是课本暴露的错法，不够再补「多一份 / 少一份 / 分母大一 / 翻一倍」 */
export function fracWrongs(correct: Frac, cands: Frac[], count = 3): string[] {
  const c = reduce(correct)
  const extra: Frac[] = [[c[0] + 1, c[1]], [c[0] - 1, c[1]], [c[0], c[1] + 1], [c[0] + 2, c[1]], [c[0] * 2, c[1]], [c[0] + c[1], c[1]], [1, c[1] + 1]]
  const out: Frac[] = []
  for (const f of [...cands, ...extra]) {
    if (!Number.isInteger(f[0]) || !Number.isInteger(f[1]) || f[1] <= 0 || f[0] <= 0) continue
    const r = reduce(f)
    if (r[1] > 999 || r[0] > 99999) continue
    if (same(r, c) || out.some((o) => same(o, r))) continue
    out.push(r)
    if (out.length >= count) break
  }
  return out.map(fs)
}
/** 小数答案的干扰项：照样写成小数（三位以内），值互不相同；不够补「小数点点错」「多 0.1」 */
export function decWrongs(correct: Frac, cands: Frac[], count = 3): string[] {
  const c = reduce(correct)
  const extra: Frac[] = [[c[0] * 10, c[1]], [c[0], c[1] * 10], add(c, [1, 10]), sub(c, [1, 10]), add(c, [1, 2]), [c[0] * 2, c[1]]]
  const out: Frac[] = []
  const labels: string[] = []
  for (const f of [...cands, ...extra]) {
    if (!Number.isInteger(f[0]) || !Number.isInteger(f[1]) || f[1] <= 0 || f[0] <= 0) continue
    const r = reduce(f)
    if (same(r, c) || out.some((o) => same(o, r))) continue
    const s = ds(r)
    if (s === null) continue
    out.push(r)
    labels.push(s)
    if (labels.length >= count) break
  }
  return labels
}

/** 带大图（格子图、线段图、平均分的图）的题：数字键盘四行太高，图 + 题 + 键盘手机一屏放不下（排版普查），整数答案也做成选项卡 */
const BIG_FIGS: StemPart['kind'][] = ['frac-area', 'frac-bars', 'frac-shape']
const hasBigFig = (stem: StemPart[]): boolean => stem.some((p) => BIG_FIGS.includes(p.kind))
/** 整数答案：数字键盘；题里有大图时是选项卡（干扰项先用 smart 里的常见错误） */
function intQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[] = [], type: QuestionType = 'frac-calc'): Question {
  // 上限要放得下 smart 里的错数（不然选项卡退到「答案 ± 1」）
  return numberQuestion({ kpId, type, difficulty: d, sig, stem, value, rng, input: hasBigFig(stem) ? 'choice' : 'numpad', min: 0, max: Math.max(30, value * 3 + 20, ...smart), smart })
}
/** 答案是一个数：整数用数字键盘；dec 时三位以内的有限小数写小数；其余写最简分数（选项） */
function valQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: Frac, cands: Frac[], rng: RNG, opts: { dec?: boolean; type?: QuestionType } = {}): Question {
  const v = reduce(value)
  const type = opts.type ?? 'frac-calc'
  if (v[1] === 1) {
    const smart = cands.map(reduce).filter((f) => f[1] === 1 && f[0] >= 0 && f[0] !== v[0]).map((f) => f[0])
    return intQ(kpId, d, sig, stem, v[0], rng, smart, type)
  }
  const dec = opts.dec ? ds(v) : null
  if (dec !== null) return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: dec, distractors: decWrongs(v, cands), rng })
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: fs(v), distractors: fracWrongs(v, cands), rng })
}
/** 选项是文字 / 算式 */
function textQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, wrongs: LStr[], rng: RNG, type: QuestionType = 'frac-calc'): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: wrongs, rng })
}
/** 判断题「……，对吗？」：对 / 不对 */
function judgeQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], right: boolean, rng: RNG, type: QuestionType = 'frac-calc'): Question {
  return textQ(kpId, d, sig, stem, L(right ? 'yes' : 'no'), [L(right ? 'no' : 'yes')], rng, type)
}
/** 比一比，填 >、< 或 = */
function cmpQ(kpId: string, d: Difficulty, sig: string, left: string, right: string, rng: RNG, type: QuestionType = 'frac-calc'): Question {
  const vl = evalExpr(left)
  const vr = evalExpr(right)
  const correct = same(vl, vr) ? '=' : less(vl, vr) ? '<' : '>'
  return labelQuestion({ kpId, type, difficulty: d, sig, stem: [T('cmp'), E(`${left} ○ ${right}`)], correct, distractors: ['>', '<', '='].filter((s) => s !== correct), rng })
}

/** 分数乘整数（或整数乘分数）算错的样子：分母也乘（结果没变）、只乘分母、分子加整数、当成加法、分子多一 / 少一、乘反 */
export function intErrors(f: Frac, n: number): Frac[] {
  const [a, b] = f
  return [[a, b * n], f, [a + n, b], add(f, I(n)), [a * n + 1, b], [a * n - 1, b], [b * n, a], [n, b]]
}
/** 分数乘分数算错的样子：分母相加、交叉相乘（当成除法）、分子相加分母相加（练习三 3②）、当成加法、只乘分子、分子多一 */
export function ffErrors(f: Frac, g: Frac): Frac[] {
  const [a, b] = f
  const [c, d] = g
  return [[a * c, b + d], [a * d, b * c], [a + c, b + d], add(f, g), [a * c, b], [a * c + 1, b * d], [a * c, b * d + 1]]
}
/** 小数乘分数算错的样子：乘反、只除没乘、只乘没除、小数点点错 */
export function decErrors(x: Frac, f: Frac): Frac[] {
  const v = mul(x, f)
  return [mul(x, [f[1], f[0]]), div(x, I(f[1])), mul(x, I(f[0])), [v[0] * 10, v[1]], [v[0], v[1] * 10]]
}

const fr = (n: number | string, d: number | string): ChainTerm => ({ n: String(n), d: String(d) })
const tx = (t: string): ChainTerm => ({ t })
const chain = (terms: ChainTerm[]): StemPart => ({ kind: 'frac-chain', terms })

// ═════════════════════════════════════════════════════════════
// 1. 分数乘整数（p16：例 1、做一做；练习三 2、练习四 1、8，练习六 1、4）
// ═════════════════════════════════════════════════════════════

/** 例 1 做纸花用的分数（课本 3/8）与换的几个 */
export const FLOWER_F: Frac[] = [[3, 8], [1, 4], [2, 5], [3, 10], [5, 12], [2, 9], [3, 4], [2, 3]]
/** 例 1：做一朵纸花用 a/b 张纸，做 n 朵用多少张（课本 3/8 × 2 = 3/4、3/8 × 8 = 3） */
function qFlower(d: Difficulty, rng: RNG): Question {
  const book = rng.chance(0.45)
  const f: Frac = book ? [3, 8] : rng.pick(FLOWER_F)
  const n = book ? rng.pick([2, 8]) : rng.int(2, 9)
  return valQ(K_INT, d, `flower-${fs(f)}x${n}`, [T('flower', { f: fs(f), n })], mul(f, I(n)), intErrors(f, n), rng)
}
/**
 * 例 1 的图：两个「平均分成 b 条、涂 a 条」的长方形（一个长方形是 1 张纸，课本画 2 朵）——一共几个 1/b 张、一共多少张。
 * 只画两幅、不写分数：三幅在手机上折成两行，图下的分数又占一行（排版普查）
 */
const PIC_F: Frac[] = [[3, 8], [1, 4], [2, 5], [3, 5], [1, 3], [2, 3], [3, 4], [5, 8]]
function qFlowerPic(d: Difficulty, rng: RNG): Question {
  const f: Frac = rng.chance(0.4) ? [3, 8] : rng.pick(PIC_F)
  const n = 2
  const items: FracPic[] = range(n).map(() => ({ shape: 'rect', parts: f[1], shaded: range(f[0]) }))
  const pic: StemPart = { kind: 'frac-shape', items }
  if (rng.chance(0.5)) {
    return intQ(K_INT, d, `pic-units-${fs(f)}x${n}`, [T('pic.units', { n, u: `1/${f[1]}` }), pic], f[0] * n, rng, [f[0] + n, f[1] * n, f[0]])
  }
  return valQ(K_INT, d, `pic-sum-${fs(f)}x${n}`, [T('pic.sum', { n }), pic], mul(f, I(n)), intErrors(f, n), rng)
}
/** 例 1 的虚线框：几个相同分数相加就是分数乘整数 */
const MEAN_F: Frac[] = [[3, 8], [2, 9], [3, 10], [2, 7], [5, 12]]
function qMeaning(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(MEAN_F)
  const k = rng.int(2, 4)
  if (rng.chance(0.5)) {
    const sum = range(k).map(() => fs(f)).join(' + ')
    return textQ(K_INT, d, `addmul-${fs(f)}-${k}`, [T('addAsMul'), E(sum)], `${fs(f)} × ${k}`, [`${fs(f)} × ${f[1]}`, `${f[0]} × ${k}`, `${fs(f)} + ${k}`], rng)
  }
  return textQ(K_INT, d, `means-${fs(f)}-${k}`, [T('mulMeans'), E(`${fs(f)} × ${k}`)], L('opt.sumOf', { n: k, f: fs(f) }), [L('opt.plusN', { f: fs(f), n: k }), L('opt.sumOf', { n: k, f: `1/${f[1]}` })], rng)
}
/** 例 1 的 (3×2)/8：分母不变，分子是多少（分数链，不约分这一步） */
function qChainInt(d: Difficulty, rng: RNG): Question {
  const f: Frac = rng.chance(0.4) ? [3, 8] : rng.pick(FLOWER_F)
  const n = rng.int(2, 6)
  const terms = [fr(f[0], f[1]), tx('×'), tx(String(n)), tx('='), fr(`${f[0]}×${n}`, f[1]), tx('='), fr('?', f[1])]
  return intQ(K_INT, d, `chain-${fs(f)}x${n}`, [T('chainInt', { e: `${fs(f)} × ${n}` }), chain(terms)], f[0] * n, rng, [f[0] + n, f[1] * n])
}
/** 法则：「用分子乘整数的积作分子」「分母不变」 */
function qRuleInt(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return textQ(K_INT, d, 'rule-den', [T('rule.int.den')], L('opt.same'), [L('opt.mulN'), L('opt.addN')], rng)
  return textQ(K_INT, d, 'rule-num', [T('rule.int.num')], L('opt.num'), [L('opt.den'), L('opt.both')], rng)
}
/** 例 1（2）：3/8 × 8 先把分母 8 和整数 8 约分（整数只能和分母约分） */
export const REDUCE_FIRST: [Frac, number][] = [[[3, 8], 8], [[5, 12], 9], [[2, 9], 3], [[7, 10], 4], [[5, 6], 4], [[3, 10], 5], [[8, 15], 5]]
function qReduceFirst(d: Difficulty, rng: RNG): Question {
  const [f, n] = rng.chance(0.35) ? REDUCE_FIRST[0]! : rng.pick(REDUCE_FIRST)
  const [a, b] = f
  return textQ(K_INT, d, `first-${fs(f)}x${n}`, [T('reduceFirst', { e: `${fs(f)} × ${n}` })], L('opt.denInt', { d: b, n }), [L('opt.numInt', { a, n }), L('opt.numDen', { a, d: b })], rng)
}
/** 计算：结果是整数（键盘）、不用约分、要约分（课本 3/8 × 2、练习三 2 的 2/9 × 3、练习六 1 的 8/15 × 5…）、第 2 档的大一点的数 */
export const INT_RESULT: [Frac, number][] = [[[3, 8], 8], [[5, 6], 12], [[2, 9], 18], [[3, 10], 20], [[3, 4], 8], [[2, 5], 15], [[7, 12], 24]]
export const INT_PLAIN: [Frac, number][] = [[[2, 9], 4], [[3, 10], 3], [[1, 8], 5], [[2, 7], 3], [[3, 11], 3], [[4, 15], 2]]
export const INT_REDUCE: [Frac, number][] = [[[3, 8], 2], [[8, 15], 5], [[2, 9], 3], [[5, 12], 9], [[7, 12], 4], [[5, 6], 4]]
export const INT_BIG: [Frac, number][] = [[[27, 50], 2], [[11, 24], 16], [[7, 30], 12], [[9, 40], 16], [[8, 15], 5], [[13, 36], 8]]
function qCalcInt(d: Difficulty, rng: RNG, pool: [Frac, number][], tag: string): Question {
  const [f, n] = rng.pick(pool)
  return valQ(K_INT, d, `${tag}-${fs(f)}x${n}`, [T('calc'), E(`${fs(f)} × ${n} = ?`)], mul(f, I(n)), intErrors(f, n), rng)
}
/** 做一做：一袋面包 3/10 千克，3 袋多少千克（课本「□ × □ = □」——另一种问法是列式） */
export const BREAD: [Frac, number][] = [[[3, 10], 3], [[1, 10], 7], [[3, 10], 2], [[2, 5], 2], [[1, 4], 3], [[3, 8], 2]]
function qBread(d: Difficulty, rng: RNG): Question {
  const [f, n] = rng.chance(0.45) ? BREAD[0]! : rng.pick(BREAD)
  if (rng.chance(0.25)) {
    return textQ(K_INT, d, `breadform-${fs(f)}x${n}`, [T('breadForm', { f: fs(f), n })], `${fs(f)} × ${n}`, [`${fs(f)} + ${n}`, `${f[0]} × ${n}`, `${fs(f)} × ${f[1]}`], rng)
  }
  return valQ(K_INT, d, `bread-${fs(f)}x${n}`, [T('bread', { f: fs(f), n })], mul(f, I(n)), intErrors(f, n), rng)
}
/** 判断：分母也乘了整数（3/16）、分子分母都乘（6/16 照写不约分）、对的 */
function qJudgeInt(d: Difficulty, rng: RNG): Question {
  const [f, n] = rng.pick([...INT_REDUCE, ...INT_PLAIN])
  const kind = rng.int(0, 2)
  const shown = kind === 0 ? fs(mul(f, I(n))) : kind === 1 ? `${f[0]}/${f[1] * n}` : `${f[0] * n}/${f[1] * n}`
  return judgeQ(K_INT, d, `judge-${fs(f)}x${n}-${kind}`, [T('judge'), E(`${fs(f)} × ${n} = ${shown}`)], kind === 0, rng)
}
/** 练习四 8：一朵纸花用 1/4 张纸，小宇剪了 9 朵，小婷剪了 11 朵，一共用了多少张（结果是整数） */
export const KIDS: [Frac, number, number][] = [[[1, 4], 9, 11], [[1, 3], 7, 5], [[1, 5], 8, 12], [[1, 6], 10, 8], [[3, 4], 5, 3]]
function qTwoKids(d: Difficulty, rng: RNG): Question {
  const [f, x, y] = rng.chance(0.4) ? KIDS[0]! : rng.pick(KIDS)
  const v = mul(f, I(x + y))
  return intQ(K_INT, d, `kids-${fs(f)}-${x}-${y}`, [T('twoKids', { f: fs(f), x, y })], v[0], rng, [mul(f, I(x))[0], x + y])
}
/** 练习六 4：装了 4 箱，每箱 25 袋，每袋 1/2 千克 */
export const CANDY: [number, number, Frac][] = [[4, 25, [1, 2]], [3, 20, [1, 4]], [5, 12, [3, 4]], [6, 15, [2, 3]]]
function qCandy(d: Difficulty, rng: RNG): Question {
  const [x, y, f] = rng.pick(CANDY)
  return intQ(K_INT, d, `candy-${x}-${y}-${fs(f)}`, [T('candy', { x, y, f: fs(f) })], mul(I(x * y), f)[0], rng, [x * y, x + y])
}
/** 第 2 档：把分子和整数约分了（错），比一比积和原数 */
export const BAD_REDUCE: [Frac, number][] = [[[3, 8], 6], [[2, 9], 4], [[3, 10], 9], [[4, 7], 6], [[6, 11], 4]]
function qJudgeBadReduce(d: Difficulty, rng: RNG): Question {
  const [f, n] = rng.pick(BAD_REDUCE)
  const g = gcd(f[0], n)
  const wrong = `${fs(f)} × ${n} = ${f[0] / g}/${f[1]} × ${n / g} = ${fs([(f[0] / g) * (n / g), f[1]])}`
  return judgeQ(K_INT, d, `badreduce-${fs(f)}x${n}`, [T('judge'), E(wrong)], false, rng)
}
function qCmpInt(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(FLOWER_F)
  const n = rng.pick([1, 2, 3, 5])
  return cmpQ(K_INT, d, `cmp-${fs(f)}x${n}`, `${fs(f)} × ${n}`, fs(f), rng)
}
/** 第 3 档：两步——小婷比小宇多剪了几朵 */
function qKidsMore(d: Difficulty, rng: RNG): Question {
  const k = rng.pick([3, 4, 5])
  const x = rng.int(3, 9)
  let m = rng.int(1, 6)
  while ((2 * x + m) % k !== 0) m++
  return intQ(K_INT, d, `kidsmore-${k}-${x}-${m}`, [T('kidsMore', { f: `1/${k}`, x, m })], (2 * x + m) / k, rng, [(x + m) / k, x + m])
}

function intGen(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.16) return qFlower(d, rng)
    if (r < 0.26) return qFlowerPic(d, rng)
    if (r < 0.36) return qMeaning(d, rng)
    if (r < 0.44) return qChainInt(d, rng)
    if (r < 0.52) return qRuleInt(d, rng)
    if (r < 0.59) return qReduceFirst(d, rng)
    if (r < 0.67) return qCalcInt(d, rng, INT_RESULT, 'int')
    if (r < 0.75) return qCalcInt(d, rng, INT_PLAIN, 'plain')
    if (r < 0.84) return qCalcInt(d, rng, INT_REDUCE, 'reduce')
    if (r < 0.94) return qBread(d, rng)
    if (r < 0.97) return qJudgeInt(d, rng)
    return qTwoKids(d, rng)
  }
  if (d === 2) {
    if (r < 0.3) return qCalcInt(d, rng, INT_BIG, 'big')
    if (r < 0.45) return qJudgeInt(d, rng)
    if (r < 0.6) return qJudgeBadReduce(d, rng)
    if (r < 0.75) return qCandy(d, rng)
    if (r < 0.88) return qCmpInt(d, rng)
    return qTwoKids(d, rng)
  }
  if (r < 0.5) return qKidsMore(d, rng)
  if (r < 0.75) return qJudgeBadReduce(d, rng)
  return qCalcInt(d, rng, INT_BIG, 'big')
}
defineGenerator(K_INT, intGen)

// ═════════════════════════════════════════════════════════════
// 2. 一个数乘分数（p17：例 2（1）；练习三 3①、4、6–11）
// ═════════════════════════════════════════════════════════════

/** 例 2（1）：2 公顷的 5/8 种植柳树苗（课本），换数 */
export const SEEDLING: [number, Frac][] = [[2, [5, 8]], [3, [2, 5]], [4, [3, 8]], [6, [3, 4]], [5, [2, 3]], [8, [3, 4]], [10, [3, 5]], [3, [5, 6]]]
/** 整数乘分数算错的样子 */
export function numErrors(n: number, f: Frac): Frac[] {
  const [a, b] = f
  return [[a, b * n], [n * b, a], [n, b], [n * a, 1], [a + n, b], add(I(n), f), [n * a + 1, b]]
}
function qSeedling(d: Difficulty, rng: RNG): Question {
  const [n, f] = rng.chance(0.45) ? SEEDLING[0]! : rng.pick(SEEDLING)
  return valQ(K_NUM, d, `seed-${n}x${fs(f)}`, [T('seedling', { n, f: fs(f) })], mul(I(n), f), numErrors(n, f), rng)
}
/** 机器人：求 2 公顷的 5/8 是多少，也就是求 2 公顷的几倍；用什么方法计算 */
function qTimes(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) return textQ(K_NUM, d, 'whichop', [T('whichOp')], L('opt.mul'), [L('opt.add'), L('opt.sub')], rng)
  const [n, f] = rng.chance(0.5) ? SEEDLING[0]! : rng.pick(SEEDLING)
  const t = (s: string): LStr => L('opt.times', { f: s })
  return textQ(K_NUM, d, `times-${n}x${fs(f)}`, [T('times', { n, f: fs(f) })], t(fs(f)), [t(fs([f[1], f[0]])), t(String(f[0])), t(String(f[1]))], rng)
}
/** 男孩：把 2 公顷平均分成 8 份，求其中的 5 份；每份是 2/8 = 1/4 公顷 */
function qSplit(d: Difficulty, rng: RNG): Question {
  const [n, f] = rng.chance(0.5) ? SEEDLING[0]! : rng.pick(SEEDLING)
  const kind = rng.int(0, 2)
  if (kind === 0) return intQ(K_NUM, d, `split-parts-${n}x${fs(f)}`, [T('split.parts', { n, f: fs(f) })], f[1], rng, [f[0], n])
  if (kind === 1) return intQ(K_NUM, d, `split-take-${n}x${fs(f)}`, [T('split.take', { n, f: fs(f) })], f[0], rng, [f[1], n])
  // 每份是多少公顷（n 比 b 小时是分数）
  const each: Frac = reduce([n, f[1]])
  return valQ(K_NUM, d, `each-${n}-${f[1]}`, [T('each', { n, b: f[1] })], each, [[1, f[1]], [f[1], n], f, [n, f[1] + 1]], rng)
}
/** 女孩的图：整个长方形是 n 公顷（一横条是 1 公顷），竖着平均分成 b 份、涂了 a 份——涂色部分有几个 1/b 公顷 */
function qGrid(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.6) ? 2 : 3
  const f: Frac = rng.chance(0.5) ? [5, 8] : rng.pick<Frac>([[3, 4], [2, 5], [3, 5], [5, 6], [3, 8], [2, 3]])
  const shaded = range(n).flatMap((r) => range(f[0]).map((c) => r * f[1] + c))
  const pic: StemPart = { kind: 'frac-shape', items: [{ shape: 'rect', parts: n * f[1], rows: n, shaded }] }
  return intQ(K_NUM, d, `grid-${n}x${fs(f)}`, [T('grid', { n, u: `1/${f[1]}` }), pic], n * f[0], rng, [f[0], n + f[0], n * f[1]])
}
/** 法则：「用整数乘分子的积作分子」，分母不变 */
function qRuleNum(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return textQ(K_NUM, d, 'rule-num', [T('rule.nf.num')], L('opt.num'), [L('opt.den'), L('opt.both')], rng)
  return textQ(K_NUM, d, 'rule-den', [T('rule.nf.den')], L('opt.same'), [L('opt.mulN'), L('opt.addN')], rng)
}
/** 计算：结果是整数（练习六 1 的 26 × 2/13 等）、是分数（例 2 的 2 × 5/8、做一做 2 的 6 × 11/12 等） */
export const NUM_INT: [number, Frac][] = [[26, [2, 13]], [20, [1, 4]], [15, [3, 5]], [72, [5, 24]], [40, [1, 10]], [18, [5, 6]], [36, [7, 12]]]
export const NUM_FRAC: [number, Frac][] = [[2, [5, 8]], [4, [4, 7]], [6, [11, 12]], [3, [2, 9]], [5, [3, 10]], [4, [5, 6]]]
function qCalcNum(d: Difficulty, rng: RNG, pool: [number, Frac][], tag: string): Question {
  const [n, f] = rng.pick(pool)
  return valQ(K_NUM, d, `${tag}-${n}x${fs(f)}`, [T('calc'), E(`${n} × ${fs(f)} = ?`)], mul(I(n), f), numErrors(n, f), rng)
}
/** 练习三 4：一面墙 20 平方米，刷完了 1/4（另一种问法是列式） */
export const WALL: [number, Frac][] = [[20, [1, 4]], [24, [3, 8]], [30, [2, 5]], [18, [5, 6]]]
function qWall(d: Difficulty, rng: RNG): Question {
  const [s, f] = rng.chance(0.45) ? WALL[0]! : rng.pick(WALL)
  if (rng.chance(0.35)) {
    return textQ(K_NUM, d, `wallform-${s}x${fs(f)}`, [T('wallForm', { s, f: fs(f) })], `${s} × ${fs(f)}`, [`${s} + ${fs(f)}`, `${s} × ${f[1]}`, `${s} × ${f[0]}`], rng)
  }
  return intQ(K_NUM, d, `wall-${s}x${fs(f)}`, [T('wall', { s, f: fs(f) })], mul(I(s), f)[0], rng, [s * f[1], s - f[0]])
}
/** 练习三 6、7、8、9、10：故宫、鹤、织女星、空气质量、再生纸（课本的数） */
function qBookApp(d: Difficulty, rng: RNG, which?: number): Question {
  const k = which ?? rng.int(0, 4)
  if (k === 0) return intQ(K_NUM, d, 'palace', [T('palace')], 15, rng, [72 - 5, 24])
  if (k === 1) return intQ(K_NUM, d, 'crane', [T('crane')], 9, rng, [25, 6])
  if (k === 2) return intQ(K_NUM, d, 'star', [T('star')], 14, rng, [13, 2])
  if (k === 3) {
    const w = rng.chance(0.5) ? 80 : rng.pick([60, 45, 100])
    return intQ(K_NUM, d, `paper-${w}`, [T('paper', { w })], (w * 4) / 5, rng, [w / 5, w - 4])
  }
  return intQ(K_NUM, d, 'paperall', [T('paperAll')], 6817, rng, [13634, 6834])
}
/** 练习三 11（1）：书包不要超过体重的 1/10——最多几千克、超重了吗 */
export const BAGS: [number, string][] = [[40, '3.6'], [40, '4.5'], [30, '3.2'], [50, '4.8'], [30, '2.8']]
function qBag(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const w = rng.pick([40, 30, 50])
    return intQ(K_NUM, d, `bagmax-${w}`, [T('bagMax', { w })], w / 10, rng, [w - 10, w * 10])
  }
  const [w, x] = rng.chance(0.4) ? BAGS[0]! : rng.pick(BAGS)
  const over = less(I(w / 10), num(x))
  return textQ(K_NUM, d, `bagover-${w}-${x}`, [T('bagOver', { w, x })], L(over ? 'opt.over' : 'opt.notOver'), [L(over ? 'opt.notOver' : 'opt.over')], rng)
}
/** 第 2 档：练习三 3①（整数和分子约分是错的）、哪个算式的结果是整数 */
function qJudgeNum(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return judgeQ(K_NUM, d, 'judge-44-7', [T('judgeNum')], false, rng)
  return valQ(K_NUM, d, 'fix-44-7', [T('fixNum')], [16, 7], [[1, 7], [4, 7], [8, 7]], rng)
}
function qWhichInt(d: Difficulty, rng: RNG): Question {
  const [n, f] = rng.pick(NUM_INT)
  const others = rng.shuffle(NUM_FRAC).slice(0, 3)
  return textQ(K_NUM, d, `whichint-${n}x${fs(f)}`, [T('whichInt')], `${n} × ${fs(f)}`, others.map(([m, g]) => `${m} × ${fs(g)}`), rng)
}
/** 第 3 档：剩下的种植银杏树苗 */
function qLeftover(d: Difficulty, rng: RNG): Question {
  const [n, f] = rng.pick(SEEDLING)
  const left = sub(I(1), f)
  return valQ(K_NUM, d, `left-${n}x${fs(f)}`, [T('leftover', { n, f: fs(f) })], mul(I(n), left), [mul(I(n), f), left, numErrors(n, left)[0]!], rng)
}

function numGen(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.15) return qSeedling(d, rng)
    if (r < 0.24) return qTimes(d, rng)
    if (r < 0.35) return qSplit(d, rng)
    if (r < 0.42) return qGrid(d, rng)
    if (r < 0.47) return qRuleNum(d, rng)
    if (r < 0.55) return qCalcNum(d, rng, NUM_INT, 'int')
    if (r < 0.63) return qCalcNum(d, rng, NUM_FRAC, 'frac')
    if (r < 0.72) return qWall(d, rng)
    if (r < 0.91) return qBookApp(d, rng, rng.int(0, 4))
    return qBag(d, rng)
  }
  if (d === 2) {
    if (r < 0.2) return intQ(K_NUM, d, 'air', [T('air')], 290, rng, [365 - 58, 73])
    if (r < 0.4) return qJudgeNum(d, rng)
    if (r < 0.55) return qWhichInt(d, rng)
    if (r < 0.7) return qBag(d, rng)
    if (r < 0.85) return qCalcNum(d, rng, NUM_FRAC, 'frac')
    return qBookApp(d, rng, 4)
  }
  if (r < 0.6) return qLeftover(d, rng)
  return qJudgeNum(d, rng)
}
defineGenerator(K_NUM, numGen)

// ═════════════════════════════════════════════════════════════
// 3. 分数乘分数（p18：例 2（2）、法则、做一做 1、2；练习三 1、2、3②、5、12）
// ═════════════════════════════════════════════════════════════

/** 格子图：第一个乘数沿行（或列）画斜线，第二个乘数在它里面沿另一个方向取几条画交叉线；ghost = 不属于这块地的几行 */
function areaPart(f: Frac, g: Frac, along: 'row' | 'col', opts: { ghost?: boolean; end?: boolean } = {}): StemPart {
  const ghost = opts.ghost ? f[1] - f[0] : undefined
  const second = { n: g[0], ...(opts.end ? { from: 'end' as const } : {}) }
  return along === 'row'
    ? { kind: 'frac-area', rows: f[1], cols: g[1], first: { along, n: f[0] }, second, ...(ghost ? { ghost } : {}) }
    : { kind: 'frac-area', rows: g[1], cols: f[1], first: { along, n: f[0] }, second, ...(ghost ? { ghost } : {}) }
}
/** 例 2（2）：4/5 公顷的 2/3 种植银杏树苗（课本），换数；配格子图（整个长方形是 1 公顷） */
export const GINKGO: [Frac, Frac][] = [[[4, 5], [2, 3]], [[3, 4], [1, 2]], [[2, 5], [3, 4]], [[5, 6], [2, 5]], [[4, 7], [1, 2]], [[3, 5], [2, 3]]]
function qGinkgo(d: Difficulty, rng: RNG): Question {
  const [f, g] = rng.chance(0.45) ? GINKGO[0]! : rng.pick(GINKGO)
  return valQ(K_FF, d, `ginkgo-${fs(f)}x${fs(g)}`, [T('ginkgo', { f: fs(f), g: fs(g) }), T('areaNote'), areaPart(f, g, 'row', { ghost: true })], mul(f, g), ffErrors(f, g), rng)
}
/** 做一做 1 看图计算（课本三幅）与同样画法的变体 */
export const BOOK_PICS: [Frac, Frac, 'row' | 'col'][] = [[[1, 2], [1, 2], 'row'], [[2, 3], [4, 5], 'row'], [[3, 4], [3, 4], 'col']]
const proper = (q: number): number[] => range(q - 1, 1).filter((p) => gcd(p, q) === 1)
function qAreaPic(d: Difficulty, rng: RNG): Question {
  let f: Frac
  let g: Frac
  let along: 'row' | 'col'
  if (rng.chance(0.5)) [f, g, along] = rng.pick(BOOK_PICS)
  else {
    const q = rng.int(2, 5)
    const s = rng.int(2, 5)
    f = [rng.pick(proper(q)), q]
    g = [rng.pick(proper(s)), s]
    along = rng.chance(0.5) ? 'row' : 'col'
  }
  return valQ(K_FF, d, `pic-${fs(f)}x${fs(g)}-${along}`, [T('areaPic', { e: `${fs(f)} × ${fs(g)}` }), areaPart(f, g, along)], mul(f, g), ffErrors(f, g), rng)
}
/** 练习三 1：这块地 1 公顷，先画出 1/5 公顷，再画出 1/5 公顷的 3/4（交叉线的部分） */
export const PAINT: [Frac, Frac][] = [[[1, 5], [3, 4]], [[1, 4], [2, 3]], [[1, 3], [3, 4]], [[1, 6], [1, 2]], [[1, 4], [3, 5]]]
function qPaint(d: Difficulty, rng: RNG): Question {
  const [f, g] = rng.chance(0.45) ? PAINT[0]! : rng.pick(PAINT)
  return valQ(K_FF, d, `paint-${fs(f)}x${fs(g)}`, [T('paint', { f: fs(f), g: fs(g) }), areaPart(f, g, 'col')], mul(f, g), ffErrors(f, g), rng)
}
/** 例 2（2）的 (4×2)/(5×3)：分数链填积的分子或分母（不约分这一步） */
function qChainFF(d: Difficulty, rng: RNG): Question {
  const [f, g] = rng.chance(0.4) ? GINKGO[0]! : rng.pick([...GINKGO, ...PAINT])
  const [a, b] = f
  const [c, e] = g
  const head = [fr(a, b), tx('×'), fr(c, e), tx('='), fr(`${a}×${c}`, `${b}×${e}`), tx('=')]
  if (rng.chance(0.6)) return intQ(K_FF, d, `chain-n-${fs(f)}x${fs(g)}`, [T('chainFF', { e: `${fs(f)} × ${fs(g)}` }), chain([...head, fr('?', b * e)])], a * c, rng, [a + c, b * e])
  return intQ(K_FF, d, `chain-d-${fs(f)}x${fs(g)}`, [T('chainFF', { e: `${fs(f)} × ${fs(g)}` }), chain([...head, fr(a * c, '?')])], b * e, rng, [b + e, a * c])
}
/** 法则：分子相乘的积作分子、分母相乘的积作分母；整数可以看成分母是 1 的分数 */
function qRuleFF(d: Difficulty, rng: RNG): Question {
  const k = rng.int(0, 3)
  if (k === 0) return textQ(K_FF, d, 'rule-num', [T('rule.ff.num')], L('opt.num'), [L('opt.den'), L('opt.both')], rng)
  if (k === 1) return textQ(K_FF, d, 'rule-den', [T('rule.ff.den')], L('opt.den'), [L('opt.num'), L('opt.both')], rng)
  if (k === 2) return intQ(K_FF, d, 'int-as-frac', [T('intAsFrac')], 1, rng, [0, 10])
  const n = rng.pick([6, 10, 3, 5])
  return textQ(K_FF, d, `int-as-frac-${n}`, [T('intAsFrac2', { n })], `${n}/1`, [`1/${n}`, `${n}/${n}`], rng)
}
/** 计算（课本做一做 2、练习三 2、练习六 1…） */
export const FF_PLAIN: [Frac, Frac][] = [[[2, 3], [4, 5]], [[1, 4], [3, 5]], [[3, 8], [3, 4]], [[1, 2], [3, 5]], [[1, 3], [2, 5]], [[3, 4], [3, 4]], [[1, 2], [1, 2]]]
export const FF_REDUCE: [Frac, Frac][] = [[[4, 7], [1, 4]], [[20, 9], [3, 10]], [[7, 18], [9, 14]], [[6, 5], [3, 4]], [[6, 5], [2, 3]], [[6, 5], [1, 2]], [[2, 9], [3, 4]], [[2, 9], [1, 2]], [[6, 5], [5, 3]]]
export const FF_BIG: [Frac, Frac][] = [[[11, 28], [8, 33]], [[13, 23], [46, 15]], [[15, 28], [21, 25]], [[5, 54], [27, 4]], [[3, 5], [55, 6]]]
function qCalcFF(d: Difficulty, rng: RNG, pool: [Frac, Frac][], tag: string): Question {
  const [f, g] = rng.pick(pool)
  return valQ(K_FF, d, `${tag}-${fs(f)}x${fs(g)}`, [T('calc'), E(`${fs(f)} × ${fs(g)} = ?`)], mul(f, g), ffErrors(f, g), rng)
}
/** 做一做 2 里带整数的两道：5/4 × 10、6 × 11/12 */
function qCalcWithInt(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return valQ(K_FF, d, 'mix-5/4x10', [T('calc'), E('5/4 × 10 = ?')], [25, 2], [[5, 40], [50, 4 * 10], [15, 4]], rng)
  return valQ(K_FF, d, 'mix-6x11/12', [T('calc'), E('6 × 11/12 = ?')], [11, 2], [[11, 72], [17, 12], [66, 72]], rng)
}
/** 练习三 5：1/4 吨的 3/5 是多少吨、3/8 米的 3/4 是多少米 */
export const TON: [string, Frac, Frac][] = [['ton', [1, 4], [3, 5]], ['meter', [3, 8], [3, 4]], ['ton', [2, 3], [3, 4]], ['meter', [4, 5], [1, 2]], ['ton', [5, 6], [2, 5]], ['meter', [3, 4], [2, 3]]]
function qTon(d: Difficulty, rng: RNG): Question {
  const [unit, f, g] = rng.chance(0.4) ? rng.pick(TON.slice(0, 2)) : rng.pick(TON)
  return valQ(K_FF, d, `${unit}-${fs(f)}x${fs(g)}`, [T(unit, { f: fs(f), g: fs(g) })], mul(f, g), ffErrors(f, g), rng)
}
/** 练习三 2 的发现：乘大于 1 的数积比原数大、乘小于 1 的数积比原数小、乘 1 不变（不用算，比一比） */
function qCmpFF(d: Difficulty, rng: RNG): Question {
  const x = rng.pick(['2/9', '6/5', '3/4', '5/8'])
  const y = rng.pick(['3', '1/2', '3/4', '5/3', '2/3', '1'])
  return cmpQ(K_FF, d, `cmp-${x}x${y}`, `${x} × ${y}`, x, rng, 'compare')
}
/** 先约分的一步（键盘）：20 和 10 约分，20 变成几 */
export const REDUCE_STEP: [string, number, number][] = [['20/9 × 3/10', 20, 10], ['20/9 × 3/10', 9, 3], ['7/18 × 9/14', 18, 9], ['7/18 × 9/14', 14, 7], ['4/7 × 1/4', 4, 4], ['11/28 × 8/33', 33, 11], ['11/28 × 8/33', 28, 8]]
function qReduceStep(d: Difficulty, rng: RNG): Question {
  const [e, p, q] = rng.pick(REDUCE_STEP)
  return intQ(K_FF, d, `step-${e}-${p}-${q}`, [T('reduceStep', { e, p, q })], p / gcd(p, q), rng, [q / gcd(p, q), gcd(p, q)])
}
/** 练习三 3②：7/10 × 6/5 约分后把分子相加、分母相加算成 1（错），同样的错法再两道；对的写法 */
export const ADD_ERR: [string, string, string, string][] = [
  ['7/10 × 6/5', '7/5 × 3/5', '10/10 = 1', '21/25'],
  ['3/4 × 2/9', '1/2 × 1/3', '2/5', '1/6'],
  ['5/8 × 4/15', '1/2 × 1/3', '2/5', '1/6'],
]
function qJudgeFF(d: Difficulty, rng: RNG): Question {
  const i = rng.chance(0.5) ? 0 : rng.int(0, ADD_ERR.length - 1)
  const [e, m, wrong, right] = ADD_ERR[i]!
  const kind = rng.int(0, 2)
  if (kind === 2) {
    const wv = evalExpr(wrong.split('=').pop()!.trim())
    return valQ(K_FF, d, `fix-${e}`, [T('fix', { e })], num(right), [wv, [num(right)[0], num(right)[1] * 2], [num(right)[0] + 1, num(right)[1]]], rng)
  }
  return judgeQ(K_FF, d, `judge-${e}-${kind}`, [T('judge'), E(`${e} = ${m} = ${kind === 0 ? wrong : right}`)], kind === 1, rng)
}
/** 第 2 档：乘小于 1 / 大于 1 的数，积和原数比；哪个算式的积比 6/5 小；长方形的面积 */
function qRuleBig(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return textQ(K_FF, d, 'rule-less', [T('ruleLess')], L('opt.smaller'), [L('opt.bigger'), L('opt.same')], rng)
  return textQ(K_FF, d, 'rule-more', [T('ruleMore')], L('opt.bigger'), [L('opt.smaller'), L('opt.same')], rng)
}
function qWhichLess(d: Difficulty, rng: RNG): Question {
  const x = rng.pick(['6/5', '2/9', '3/4'])
  const small = rng.pick(['1/2', '2/3', '3/4'])
  const big = rng.shuffle(['5/3', '3', '7/4']).slice(0, 2)
  return textQ(K_FF, d, `whichless-${x}-${small}`, [T('whichLess', { x })], `${x} × ${small}`, [...big.map((y) => `${x} × ${y}`), `${x} × 1`], rng, 'compare')
}
export const RECT: [Frac, Frac][] = [[[5, 4], [3, 5]], [[3, 4], [2, 3]], [[7, 8], [4, 7]], [[5, 6], [3, 5]]]
function qRect(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(RECT)
  return valQ(K_FF, d, `rect-${fs(a)}x${fs(b)}`, [T('rect', { a: fs(a), b: fs(b) })], mul(a, b), [...ffErrors(a, b), add(a, b), mul(add(a, b), I(2))], rng)
}
/** 第 3 档：练习三 12 带分数；把分子和分子约分了（错） */
function qMixedEq(d: Difficulty, rng: RNG): Question {
  const right = `${mixed(4, 1, 5)} × 3/7 = ${mixed(1, 4, 5)}`
  const wrongs = [`${mixed(5, 1, 4)} × 3/7 = ${mixed(1, 4, 5)}`, `${mixed(1, 4, 5)} × 3/7 = ${mixed(4, 1, 5)}`, `${mixed(5, 1, 4)} × 3/7 = ${mixed(4, 1, 5)}`]
  return textQ(K_FF, d, 'mixed-eq', [T('mixedEq')], right, wrongs, rng)
}
function qJudgeNumNum(d: Difficulty, rng: RNG): Question {
  const [e, wrong] = rng.pick([['6/5 × 2/3', '3/5 × 1/3 = 1/5'], ['4/9 × 2/5', '2/9 × 1/5 = 2/45'], ['6/7 × 3/4', '2/7 × 1/4 = 1/14']])
  return judgeQ(K_FF, d, `judge-numnum-${e}`, [T('judge'), E(`${e} = ${wrong}`)], false, rng)
}

function ffGen(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.13) return qGinkgo(d, rng)
    if (r < 0.25) return qAreaPic(d, rng)
    if (r < 0.32) return qPaint(d, rng)
    if (r < 0.4) return qChainFF(d, rng)
    if (r < 0.48) return qRuleFF(d, rng)
    if (r < 0.57) return qCalcFF(d, rng, FF_PLAIN, 'plain')
    if (r < 0.67) return qCalcFF(d, rng, FF_REDUCE, 'reduce')
    if (r < 0.73) return qCalcWithInt(d, rng)
    if (r < 0.81) return qTon(d, rng)
    if (r < 0.88) return qCmpFF(d, rng)
    if (r < 0.94) return qReduceStep(d, rng)
    return qJudgeFF(d, rng)
  }
  if (d === 2) {
    if (r < 0.25) return qCalcFF(d, rng, FF_BIG, 'big')
    if (r < 0.4) return qRuleBig(d, rng)
    if (r < 0.55) return qWhichLess(d, rng)
    if (r < 0.7) return qRect(d, rng)
    if (r < 0.85) return qJudgeFF(d, rng)
    return qReduceStep(d, rng)
  }
  if (r < 0.5) return qMixedEq(d, rng)
  if (r < 0.75) return qJudgeNumNum(d, rng)
  return qCalcFF(d, rng, FF_BIG, 'big')
}
defineGenerator(K_FF, ffGen)

// ═════════════════════════════════════════════════════════════
// 4. 小数乘分数（p21：例 3、做一做 1–4；练习四 1、2，练习六 1）
// ═════════════════════════════════════════════════════════════

/** 例 3：松鼠尾巴的长度大约是身体长度的 3/4（欢欢 2.1 分米、乐乐 2.4 分米；乐乐改叫贝贝），换几个身体长度 */
export const SQUIRREL = ['2.4', '2.8', '3.2', '2', '1.6']
function qSquirrel(d: Difficulty, rng: RNG): Question {
  const book = rng.chance(0.45)
  const x = book ? rng.pick(['2.1', '2.4']) : rng.pick(SQUIRREL)
  const who = x === '2.1' ? 'huan' : rng.chance(0.5) || x === '2.4' ? 'bei' : 'huan'
  const f: Frac = [3, 4]
  return valQ(K_DEC, d, `squirrel-${x}`, [T('squirrel', { who: L(`name.${who}`), x })], mul(num(x), f), decErrors(num(x), f), rng, { dec: true })
}
/** 例 3 男孩：可以把分数化成小数，也可以把小数化成分数 */
export const TO_DEC: [string, string, string, string[]][] = [
  ['2.1', '3/4', '0.75', ['0.34', '3.4', '0.43']],
  ['1.2', '3/5', '0.6', ['0.35', '3.5', '0.53']],
  ['2.5', '4/5', '0.8', ['0.45', '4.5', '0.54']],
  ['0.8', '1/4', '0.25', ['0.14', '1.4', '0.41']],
]
export const TO_FRAC: [string, string, string, string[]][] = [
  ['2.1', '3/4', '21/10', ['21/100', '1/21', '21/1000']],
  ['0.7', '2/3', '7/10', ['7/100', '1/7', '7/1000']],
  ['1.3', '5/6', '13/10', ['13/100', '1/13', '13/1000']],
]
function qConvert(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.55)) {
    const [x, f, c, w] = rng.chance(0.4) ? TO_DEC[0]! : rng.pick(TO_DEC)
    return textQ(K_DEC, d, `todec-${x}x${f}`, [T('toDec', { e: `${x} × ${f}`, f })], c, w, rng)
  }
  const [x, f, c, w] = rng.chance(0.4) ? TO_FRAC[0]! : rng.pick(TO_FRAC)
  return textQ(K_DEC, d, `tofrac-${x}x${f}`, [T('toFrac', { e: `${x} × ${f}`, x })], c, w, rng)
}
/** 例 3（2）的约分：2.4 和 4 约分，2.4 变成 0.6 */
export const REDUCE_DEC: [string, string, string, string[]][] = [
  ['2.4', '3/4', '0.6', ['6', '0.06', '0.4']],
  ['1.2', '5/6', '0.2', ['2', '0.02', '0.6']],
  ['2.5', '3/5', '0.5', ['5', '0.05', '2']],
  ['3.6', '5/9', '0.4', ['4', '0.04', '0.9']],
  ['4.8', '5/8', '0.6', ['6', '0.06', '0.8']],
]
function qReduceDec(d: Difficulty, rng: RNG): Question {
  const [x, f, c, w] = rng.chance(0.4) ? REDUCE_DEC[0]! : rng.pick(REDUCE_DEC)
  return textQ(K_DEC, d, `reducedec-${x}x${f}`, [T('reduceDec', { e: `${x} × ${f}`, x, b: num(f)[1] })], c, w, rng)
}
/** 做一做 1 的四道（课本）与换的几道；第 2 档是练习四 1 的四道 */
export const DEC_CALC: [string, string][] = [['1.2', '3/5'], ['2.5', '3/5'], ['1.4', '5/6'], ['2.4', '5/6'], ['0.6', '2/3'], ['3.2', '5/8'], ['4.5', '2/9'], ['2.4', '3/8']]
export const DEC_CALC2: [string, string][] = [['20/39', '7.8'], ['7/18', '0.36'], ['9/16', '0.3'], ['5/54', '6.75']]
function qCalcDec(d: Difficulty, rng: RNG, pool: [string, string][], tag: string): Question {
  const [x, y] = rng.chance(0.4) && tag === 'do' ? rng.pick(pool.slice(0, 4)) : rng.pick(pool)
  const decFirst = x.includes('.')
  const [dx, fy] = decFirst ? [num(x), num(y)] : [num(y), num(x)]
  return valQ(K_DEC, d, `${tag}-${x}x${y}`, [T('calc'), E(`${x} × ${y} = ?`)], mul(num(x), num(y)), decErrors(dx, fy), rng, { dec: true })
}
/** 做一做 2：蜂鸟每分钟飞 0.8 千米，3/4 分钟、5 分钟飞多少千米 */
export const BIRD = ['3/4', '5', '1/2', '1/4']
function qBird(d: Difficulty, rng: RNG): Question {
  const t = rng.chance(0.5) ? rng.pick(BIRD.slice(0, 2)) : rng.pick(BIRD)
  const v: Frac = [4, 5]
  return valQ(K_DEC, d, `bird-${t}`, [T('bird', { t })], mul(v, num(t)), decErrors(v, num(t)), rng, { dec: true })
}
/** 做一做 3、4，练习四 2：人均国内生产总值、蜂蜜、鸵鸟和帝企鹅（课本的数） */
function qDecApp(d: Difficulty, rng: RNG): Question {
  const k = rng.int(0, 2)
  if (k === 0) return valQ(K_DEC, d, 'gdp', [T('gdp')], [36, 5], decErrors([81, 10], [8, 9]), rng, { dec: true })
  if (k === 1) {
    const w = rng.chance(0.5) ? '2.5' : rng.pick(['1.5', '5'])
    return valQ(K_DEC, d, `honey-${w}`, [T('honey', { w })], mul(num(w), [4, 5]), decErrors(num(w), [4, 5]), rng, { dec: true })
  }
  return valQ(K_DEC, d, 'ostrich', [T('ostrich')], [6, 5], decErrors([5, 2], [12, 25]), rng, { dec: true })
}
/** 积和原数比一比（小数乘分数） */
function qCmpDec(d: Difficulty, rng: RNG): Question {
  const x = rng.pick(['2.4', '1.2', '0.8', '3.6'])
  const f = rng.pick(['3/4', '5/6', '5/4', '1'])
  return cmpQ(K_DEC, d, `cmp-${x}x${f}`, `${x} × ${f}`, x, rng)
}
/** 第 2 档：蜂蜜带上「3/5 以上」的背景（多余的信息） */
function qHoneyNoise(d: Difficulty, rng: RNG): Question {
  const w = rng.pick(['2.5', '1.5', '5'])
  return valQ(K_DEC, d, `honey2-${w}`, [T('honey2', { w })], mul(num(w), [4, 5]), [mul(num(w), [3, 5]), ...decErrors(num(w), [4, 5])], rng, { dec: true })
}
/** 第 3 档：两只松鼠的尾巴一共多少分米 */
function qSquirrelSum(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.pick([['2.1', '2.4'], ['2.4', '2.8'], ['1.6', '3.2']])
  const v = mul(add(num(x), num(y)), [3, 4])
  return valQ(K_DEC, d, `squirrelsum-${x}-${y}`, [T('squirrelSum', { x, y })], v, [add(num(x), num(y)), mul(num(x), [3, 4]), mul(add(num(x), num(y)), [4, 3])], rng, { dec: true })
}

function decGen(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.24) return qSquirrel(d, rng)
    if (r < 0.34) return qConvert(d, rng)
    if (r < 0.42) return qReduceDec(d, rng)
    if (r < 0.62) return qCalcDec(d, rng, DEC_CALC, 'do')
    if (r < 0.72) return qBird(d, rng)
    if (r < 0.92) return qDecApp(d, rng)
    return qCmpDec(d, rng)
  }
  if (d === 2) {
    if (r < 0.45) return qCalcDec(d, rng, DEC_CALC2, 'ex')
    if (r < 0.65) return qHoneyNoise(d, rng)
    if (r < 0.85) return qCmpDec(d, rng)
    return qSquirrel(d, rng)
  }
  if (r < 0.6) return qSquirrelSum(d, rng)
  return qCalcDec(d, rng, DEC_CALC2, 'ex')
}
defineGenerator(K_DEC, decGen)

// ═════════════════════════════════════════════════════════════
// 5. 分数混合运算和运算律（p22：混合运算顺序、三组比一比、例 4、做一做；练习四 3–7、9、10、12、13，练习六 2、5、6）
// ═════════════════════════════════════════════════════════════

/** p22：(4/5 + 1/2) × 2 和 4/5 × 2 + 1/2 × 2（课本），换数 */
export const ORDER_PAIR: [Frac, Frac, number][] = [[[4, 5], [1, 2], 2], [[1, 3], [1, 4], 12], [[2, 3], [1, 6], 6], [[3, 4], [1, 2], 2], [[5, 6], [1, 3], 3]]
function qOrderPair(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = rng.chance(0.45) ? ORDER_PAIR[0]! : rng.pick(ORDER_PAIR)
  const spread = rng.chance(0.5)
  const e = spread ? `${fs(a)} × ${n} + ${fs(b)} × ${n}` : `(${fs(a)} + ${fs(b)}) × ${n}`
  const cands: Frac[] = [add(a, mul(b, I(n))), add(mul(a, I(n)), b), add(a, b)]
  return valQ(K_LAW, d, `order-${spread ? 's' : 'p'}-${fs(a)}-${fs(b)}-${n}`, [T('calc'), E(`${e} = ?`)], mul(add(a, b), I(n)), cands, rng)
}
/** 先算什么（混合运算顺序和整数相同） */
export const ORDER_FIRST: [string, string, string][] = [
  ['1/2 + 5/4 × 4/5', '5/4 × 4/5', '1/2 + 5/4'],
  ['1/3 × 3/5 + 1', '1/3 × 3/5', '3/5 + 1'],
  ['1/6 × (5 − 2/3)', '5 − 2/3', '1/6 × 5'],
  ['7/8 × 7 + 3/8', '7/8 × 7', '7 + 3/8'],
  ['5/7 − 5/9 × 5/7', '5/9 × 5/7', '5/7 − 5/9'],
]
function qOrderFirst(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.25)) return textQ(K_LAW, d, 'order-rule', [T('orderRule')], L('opt.intOrder'), [L('opt.leftRight'), L('opt.addFirst')], rng)
  const [e, c, w] = rng.pick(ORDER_FIRST)
  return textQ(K_LAW, d, `first-${e}`, [T('order'), E(e)], c, [w], rng)
}
/** 三组比一比（课本）与换数；另配不相等的，免得答案总是「=」 */
export const LAW_TRIPLES: [Frac, Frac, Frac][] = [[[1, 2], [1, 3], [1, 5]], [[1, 4], [2, 3], [3, 5]], [[2, 3], [3, 4], [1, 2]], [[3, 5], [5, 6], [2, 3]]]
function lawEq(law: 'comm' | 'assoc' | 'dist', a: Frac, b: Frac, c: Frac): [string, string] {
  if (law === 'comm') return [`${fs(a)} × ${fs(b)}`, `${fs(b)} × ${fs(a)}`]
  if (law === 'assoc') return [`(${fs(a)} × ${fs(b)}) × ${fs(c)}`, `${fs(a)} × (${fs(b)} × ${fs(c)})`]
  return [`(${fs(a)} + ${fs(b)}) × ${fs(c)}`, `${fs(a)} × ${fs(c)} + ${fs(b)} × ${fs(c)}`]
}
function qCmpLaw(d: Difficulty, rng: RNG): Question {
  const book = rng.chance(0.45)
  const law = rng.pick(['comm', 'assoc', 'dist'] as const)
  const [a, b, c] = book ? (law === 'assoc' ? LAW_TRIPLES[1]! : LAW_TRIPLES[0]!) : rng.pick(LAW_TRIPLES)
  let [x, y] = lawEq(law, a, b, c)
  if (rng.chance(0.25)) y = law === 'dist' ? `${fs(a)} × ${fs(c)} + ${fs(b)}` : `${fs(a)} + ${fs(b)}` // 不相等的对照
  if (rng.chance(0.5)) [x, y] = [y, x]
  return cmpQ(K_LAW, d, `cmp-${x}|${y}`, x, y, rng, 'law')
}
function qWhichLaw(d: Difficulty, rng: RNG): Question {
  const law = rng.pick(['comm', 'assoc', 'dist'] as const)
  const [a, b, c] = rng.pick(LAW_TRIPLES)
  const [x, y] = lawEq(law, a, b, c)
  const name = (k: string): LStr => L(`opt.${k}`)
  return textQ(K_LAW, d, `which-${law}-${x}`, [T('whichLaw'), E(`${x} = ${y}`)], name(law), ['comm', 'assoc', 'dist'].filter((k) => k !== law).map(name), rng, 'law')
}
/** 例 4①：3/5 × 1/6 × 5（交换、结合），做一做 1 的 2/3 × 1/7 × 3，换数 */
export const EX4A: [Frac, Frac, number][] = [[[3, 5], [1, 6], 5], [[2, 3], [1, 7], 3], [[5, 8], [2, 9], 8], [[4, 9], [3, 8], 9], [[3, 4], [5, 6], 4]]
function qEx4a(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = rng.chance(0.45) ? rng.pick(EX4A.slice(0, 2)) : rng.pick(EX4A)
  const e = `${fs(a)} × ${fs(b)} × ${n}`
  if (rng.chance(0.3)) {
    return textQ(K_LAW, d, `lawused-${e}`, [T('lawUsed', { e, p: `${fs(a)} × ${n}` })], L('opt.commAssoc'), [L('opt.dist'), L('opt.addComm')], rng, 'law')
  }
  return valQ(K_LAW, d, `ex4a-${e}`, [T('simple'), E(`${e} = ?`)], mul(a, b, I(n)), [mul(a, b), mul(a, I(n)), ...ffErrors(a, b)], rng)
}
/** 例 4②：(5/6 + 1/4) × 12（分配律）；做一做 1 的 (8/9 + 4/27) × 27、练习六 2 的 (1/5 + 2/3) × 15，换数（结果都是整数） */
export const EX4B: [Frac, Frac, number][] = [[[5, 6], [1, 4], 12], [[8, 9], [4, 27], 27], [[1, 5], [2, 3], 15], [[3, 4], [1, 6], 12], [[1, 2], [2, 5], 10]]
function qEx4b(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = rng.chance(0.45) ? EX4B[0]! : rng.pick(EX4B)
  const e = `(${fs(a)} + ${fs(b)}) × ${n}`
  const k = rng.int(0, 3)
  if (k === 0) {
    const pa = mul(a, I(n))
    return intQ(K_LAW, d, `diststep-${e}`, [T('distStep', { e, p: `${fs(a)} × ${n}` })], pa[0], rng, [mul(b, I(n))[0], n])
  }
  if (k === 1) {
    return textQ(K_LAW, d, `distform-${e}`, [T('distForm', { e })], `${fs(a)} × ${n} + ${fs(b)} × ${n}`, [`${fs(a)} + ${fs(b)} × ${n}`, `${fs(a)} × ${n} + ${fs(b)}`], rng, 'law')
  }
  const v = mul(add(a, b), I(n))
  return intQ(K_LAW, d, `ex4b-${e}`, [T('simple'), E(`${e} = ?`)], v[0], rng, [add(mul(a, I(n)), b)[0], n])
}
/** 例 4③：几个数连乘时，可以直接约分（2/3 × 8/7 × 14 × 9/4 = 24），换数 */
export const EX4C = ['2/3 × 8/7 × 14 × 9/4', '3/4 × 5/9 × 12 × 6/5', '5/6 × 3/10 × 16 × 5/4', '4/5 × 7/9 × 15/8 × 6']
function qEx4c(d: Difficulty, rng: RNG): Question {
  const e = rng.chance(0.45) ? EX4C[0]! : rng.pick(EX4C)
  const v = evalExpr(e)
  return intQ(K_LAW, d, `ex4c-${e}`, [T('direct'), E(`${e} = ?`)], v[0], rng, [v[0] * 2, v[0] + 1])
}
/** 做一做 2：每头奶牛平均每天产奶 1/50 吨，42 头 100 天 */
export const COW: [Frac, number, number][] = [[[1, 50], 42, 100], [[1, 40], 30, 80], [[1, 60], 45, 120]]
function qCow(d: Difficulty, rng: RNG): Question {
  const [f, x, y] = rng.chance(0.5) ? COW[0]! : rng.pick(COW)
  return intQ(K_LAW, d, `cow-${fs(f)}-${x}-${y}`, [T('cow', { f: fs(f), x, y })], mul(f, I(x * y))[0], rng, [x * y, mul(f, I(x))[0]])
}
/** 第 2 档：练习四 3 混合运算、练习四 4 改错、练习四 5 / 6 与练习六 2 的简便计算、拆数（87 × 3/86）、练习四 7 / 9 / 10 与练习六 5 */
export const MIXED_OPS = ['1/3 × 3/5 + 1', '5/7 − 5/9 × 5/7', '1 − 15/28 × 21/25', '1/2 + 5/4 × 4/5', '1/6 × (5 − 2/3)', '7/8 × 7 + 3/8']
export const SIMPLE_MORE = [
  '2/9 − 7/16 × 2/9',
  '2/27 × 4 × 3/4',
  '5/7 × 16 × 42/25',
  '1/2 × 1/15 + 1/3 × 1/2',
  '4/5 × 7/9 × 15/8',
  '5/6 × 5/9 + 5/9 × 1/6',
  '7/12 × 6 + 17/12 × 6',
  '4/9 × 5 × 18',
  '(14 + 7/2) × 1/14',
  '1/3 × 5/16 × 3/5',
  '4/7 × 5/9 + 3/7 × 5/9',
  '11/9 × 3/20 × 9/11',
  '2/5 + 1/4 + 3/4',
  '0.75 × 3/7 + 1/4 × 3/7',
]
function qMixedOps(d: Difficulty, rng: RNG, pool: string[], tag: string, lead: string): Question {
  const e = rng.pick(pool)
  const v = evalExpr(e)
  return valQ(K_LAW, d, `${tag}-${e}`, [T(lead), E(`${e} = ?`)], v, [[v[0] + 1, v[1]], [v[0], v[1] + 1], [v[0] * 2, v[1]]], rng)
}
export const OPS_ERR: [string, string, string][] = [
  ['5 − 3 × 7/9', '2 × 7/9', '14/9'],
  ['(1/6 + 3/4) × 6', '1 + 3/4', '7/4'],
]
function qJudgeOps(d: Difficulty, rng: RNG): Question {
  const [e, m, w] = rng.pick(OPS_ERR)
  if (rng.chance(0.5)) return judgeQ(K_LAW, d, `judge-${e}`, [T('judge'), E(`${e} = ${m} = ${w}`)], false, rng)
  return valQ(K_LAW, d, `fix-${e}`, [T('fix', { e })], evalExpr(e), [num(w), evalExpr(m)], rng)
}
function qSplitNum(d: Difficulty, rng: RNG): Question {
  const [n, f, w] = rng.chance(0.6) ? ([87, [3, 86], mixed(3, 3, 86)] as const) : ([99, [5, 98], mixed(5, 5, 98)] as const)
  const wrongs = [`${f[0]}/${f[1]}`, `${n}/${f[1]}`, mixed(f[0], 1, f[1])]
  return textQ(K_LAW, d, `split-${n}x${fs(f)}`, [T('simple'), E(`${n} × ${fs(f)} = ?`)], w, wrongs, rng)
}
function qLawApp(d: Difficulty, rng: RNG): Question {
  const k = rng.int(0, 4)
  if (k === 0) return valQ(K_LAW, d, 'tri', [T('tri')], [1, 6], [[1, 3], [43, 36], [2, 3]], rng)
  if (k === 1) return valQ(K_LAW, d, 'trap', [T('trap')], [1, 2], [[1, 1], [3, 2], [5, 6]], rng)
  if (k === 2) return valQ(K_LAW, d, 'desk', [T('desk')], [3, 20], [[3, 4], [33, 20], [1, 5]], rng)
  if (k === 3) return intQ(K_LAW, d, 'power', [T('power')], 2100, rng, [2400, 800])
  return intQ(K_LAW, d, 'garbage', [T('garbage')], 350, rng, [1050, 70])
}
/** 第 3 档：练习四 12、13 的规律，练习六 6 的表格 */
function qPattern(d: Difficulty, rng: RNG): Question {
  const k = rng.int(0, 2)
  if (k === 0) {
    const [eq, c, w] = rng.chance(0.5) ? ['? + 5/2 = ? × 5/2', '5/3', ['5/2', '3/5', '2/5']] : ['6 + ? = 6 × ?', '6/5', ['5/6', '6/7', '1/6']]
    return textQ(K_LAW, d, `pattern12-${eq}`, [T('pattern12'), E(eq)], c, w as string[], rng)
  }
  if (k === 1) {
    const n = rng.int(5, 9)
    return valQ(K_LAW, d, `pattern13-${n}`, [T('pattern13'), E(`1/${n} − 1/${n + 1} = ?`)], [1, n * (n + 1)], [[1, n], [1, n + 1], [2, n * (n + 1)], [1, 2 * n + 1]], rng)
  }
  const table: StemPart = {
    kind: 'stat-table',
    head: 'both',
    rows: [
      ['×', '1/2', '2/3', '3/5'],
      ['7/4', '7/8', '7/6', '21/20'],
      ['6/5', '3/5', '4/5', '18/25'],
      ['5/8', '5/16', '5/12', '3/8'],
    ],
  }
  return valQ(K_LAW, d, 'table', [T('table'), table], [21, 80], [[21, 40], [7, 40], [3, 8]], rng)
}

function lawGen(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.12) return qOrderPair(d, rng)
    if (r < 0.22) return qOrderFirst(d, rng)
    if (r < 0.36) return qCmpLaw(d, rng)
    if (r < 0.44) return qWhichLaw(d, rng)
    if (r < 0.58) return qEx4a(d, rng)
    if (r < 0.76) return qEx4b(d, rng)
    if (r < 0.86) return qEx4c(d, rng)
    if (r < 0.94) return qCow(d, rng)
    return qSplitNum(d, rng) // 做一做 1 的 87 × 3/86
  }
  if (d === 2) {
    if (r < 0.2) return qMixedOps(d, rng, MIXED_OPS, 'mixed', 'calc')
    if (r < 0.32) return qJudgeOps(d, rng)
    if (r < 0.6) return qMixedOps(d, rng, SIMPLE_MORE, 'simple', 'simpleIf')
    if (r < 0.7) return qSplitNum(d, rng)
    return qLawApp(d, rng)
  }
  return qPattern(d, rng)
}
defineGenerator(K_LAW, lawGen)

// ═════════════════════════════════════════════════════════════
// 6. 连续求一个数的几分之几（p25–26：例 5、做一做 1、2；练习五 1、2、3）
// ═════════════════════════════════════════════════════════════

/** 例 5：休闲场所 4800 平方米，3/5 做运动健身区域，器械类占运动健身区域的 1/4（课本），换数 */
export const PARK: [number, Frac, Frac][] = [[4800, [3, 5], [1, 4]], [3600, [2, 3], [1, 4]], [6000, [3, 5], [1, 3]], [2400, [5, 8], [2, 5]]]
function qPark(d: Difficulty, rng: RNG): Question {
  const [s, f, g] = rng.chance(0.5) ? PARK[0]! : rng.pick(PARK)
  const story = T('park', { s, f: fs(f), g: fs(g) })
  const sig = `${s}-${fs(f)}-${fs(g)}`
  const k = rng.next()
  if (k < 0.3) {
    return intQ(K_CHAIN, d, `park-${sig}`, [story, T('park.q'), T('park.pic'), areaPart(f, g, 'col')], mul(I(s), f, g)[0], rng, [mul(I(s), f)[0], mul(I(s), g)[0], mul(I(s), add(f, g))[0]], 'quantity')
  }
  if (k < 0.42) return intQ(K_CHAIN, d, `park1-${sig}`, [story, T('park.q1')], mul(I(s), f)[0], rng, [mul(I(s), g)[0], s - f[0]], 'quantity')
  if (k < 0.54) return valQ(K_CHAIN, d, `parkf-${sig}`, [story, T('park.qf')], mul(f, g), [add(f, g), [f[0] + g[0], f[1] + g[1]], g, f], rng)
  const area = (k2: string): LStr => L(`opt.${k2}`)
  if (k < 0.64) return textQ(K_CHAIN, d, `who1-${sig}`, [story, T('park.who1', { f: fs(f) })], area('wholePark'), [area('sportArea'), area('gymArea')], rng, 'quantity')
  if (k < 0.74) return textQ(K_CHAIN, d, `who2-${sig}`, [story, T('park.who2', { g: fs(g) })], area('sportArea'), [area('wholePark'), area('gymArea')], rng, 'quantity')
  if (k < 0.87) {
    return textQ(K_CHAIN, d, `form-${sig}`, [story, T('park.form')], `${s} × ${fs(f)} × ${fs(g)}`, [`${s} × ${fs(g)}`, `${s} × ${fs(f)} + ${fs(g)}`, `${s} × (${fs(f)} + ${fs(g)})`], rng, 'quantity')
  }
  return textQ(K_CHAIN, d, `reflect-${sig}`, [story, T('park.reflect', { e: `${s} × (${fs(f)} × ${fs(g)})`, h: fs(mul(f, g)) })], area('wholePark'), [area('sportArea'), area('gymArea')], rng, 'quantity')
}
/** 做一做 1：36 名学生，想当教师的占 1/3，想当科学家的是想当教师的 3/4；做一做 2：海象 40 年、海狮是海象的 3/4、海豹是海狮的 2/3 */
export const CLASS: [number, Frac, Frac][] = [[36, [1, 3], [3, 4]], [40, [1, 4], [3, 5]], [45, [1, 5], [2, 3]]]
export const SEAL: [number, Frac, Frac][] = [[40, [3, 4], [2, 3]], [36, [2, 3], [3, 4]], [60, [3, 5], [5, 6]]]
function qDoChain(d: Difficulty, rng: RNG): Question {
  const step = rng.chance(0.3)
  if (rng.chance(0.5)) {
    const [n, f, g] = rng.chance(0.5) ? CLASS[0]! : rng.pick(CLASS)
    const sig = `${n}-${fs(f)}-${fs(g)}`
    const story = T('class', { n, f: fs(f), g: fs(g) })
    if (step) return intQ(K_CHAIN, d, `class1-${sig}`, [story, T('class.q1')], mul(I(n), f)[0], rng, [mul(I(n), g)[0]], 'quantity')
    return intQ(K_CHAIN, d, `class-${sig}`, [story, T('class.q')], mul(I(n), f, g)[0], rng, [mul(I(n), f)[0], mul(I(n), g)[0]], 'quantity')
  }
  const [x, f, g] = rng.chance(0.5) ? SEAL[0]! : rng.pick(SEAL)
  const sig = `${x}-${fs(f)}-${fs(g)}`
  const story = T('seal', { x, f: fs(f), g: fs(g) })
  if (step) return intQ(K_CHAIN, d, `seal1-${sig}`, [story, T('seal.q1')], mul(I(x), f)[0], rng, [mul(I(x), g)[0]], 'quantity')
  return intQ(K_CHAIN, d, `seal-${sig}`, [story, T('seal.q')], mul(I(x), f, g)[0], rng, [mul(I(x), f)[0], mul(I(x), g)[0]], 'quantity')
}
/** 练习五 1（1）：一共 120 棵树，柳树和桃树共占 5/6，桃树占柳树和桃树的 1/4（格子图最下面一行） */
export const TREES: [number, Frac, Frac][] = [[120, [5, 6], [1, 4]], [96, [3, 4], [1, 3]], [100, [4, 5], [1, 4]]]
function qTrees(d: Difficulty, rng: RNG): Question {
  const [n, f, g] = rng.chance(0.5) ? TREES[0]! : rng.pick(TREES)
  return intQ(K_CHAIN, d, `trees-${n}-${fs(f)}-${fs(g)}`, [T('trees', { n, f: fs(f), g: fs(g) }), areaPart(f, g, 'col', { end: true })], mul(I(n), f, g)[0], rng, [mul(I(n), f)[0], mul(I(n), g)[0]], 'quantity')
}
/** 练习五 1（2）：苹果 160 个，桃是苹果的 3/4，橘子是桃的 5/6（三行线段图） */
export const FRUIT: [number, Frac, Frac][] = [[160, [3, 4], [5, 6]], [120, [2, 3], [3, 4]], [200, [3, 5], [2, 3]]]
function qFruit(d: Difficulty, rng: RNG): Question {
  const [n, f, g] = rng.chance(0.5) ? FRUIT[0]! : rng.pick(FRUIT)
  const rows: BarRow[] = [
    { name: L('name.apple'), len: f[1], braces: [{ from: 0, to: f[1], side: 'top', label: String(n) }] },
    { name: L('name.peach'), len: f[0], parts: g[1] },
    { name: L('name.orange'), len: (f[0] * g[0]) / g[1], parts: 1, braces: [{ from: 0, to: (f[0] * g[0]) / g[1], side: 'bottom', label: '?' }] },
  ]
  return intQ(K_CHAIN, d, `fruit-${n}-${fs(f)}-${fs(g)}`, [T('fruit', { n, f: fs(f), g: fs(g) }), { kind: 'frac-bars', unit: f[1], rows, guides: true }], mul(I(n), f, g)[0], rng, [mul(I(n), f)[0], mul(I(n), g)[0]], 'quantity')
}
/** 练习五 3：芍药 32 天，玫瑰是芍药的 5/8，水仙是玫瑰的 3/4 */
export const PEONY: [number, Frac, Frac][] = [[32, [5, 8], [3, 4]], [24, [5, 6], [3, 5]], [40, [3, 4], [2, 3]]]
function qPeony(d: Difficulty, rng: RNG): Question {
  const [x, f, g] = rng.chance(0.5) ? PEONY[0]! : rng.pick(PEONY)
  return intQ(K_CHAIN, d, `peony-${x}-${fs(f)}-${fs(g)}`, [T('peony', { x, f: fs(f), g: fs(g) })], mul(I(x), f, g)[0], rng, [mul(I(x), f)[0], mul(I(x), g)[0]], 'quantity')
}
/** 一个数的几分之几的几分之几（例 5 方法二、回顾反思）；纯数的连续求 */
function qPartOf(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [, f, g] = rng.pick([...PARK, ...CLASS, ...SEAL])
    return valQ(K_CHAIN, d, `partof-${fs(f)}-${fs(g)}`, [T('partOf', { f: fs(f), g: fs(g) })], mul(f, g), [add(f, g), [f[0] + g[0], f[1] + g[1]], g], rng)
  }
  const [n, f, g] = rng.pick<[number, Frac, Frac]>([[60, [2, 3], [3, 4]], [48, [3, 4], [1, 3]], [90, [2, 5], [5, 6]], [72, [5, 6], [3, 5]]])
  return intQ(K_CHAIN, d, `pure-${n}-${fs(f)}-${fs(g)}`, [T('pure', { n, f: fs(f), g: fs(g) })], mul(I(n), f, g)[0], rng, [mul(I(n), f)[0], mul(I(n), g)[0]])
}
/** 第 2 档：练习五 2 血液（结果是分数）；第 3 档：连续三次 */
function qBlood(d: Difficulty, rng: RNG): Question {
  return valQ(K_CHAIN, d, 'blood', [T('blood')], [1, 20], [[8, 1], [1, 8], [2, 5], [1, 160]], rng, { type: 'quantity' })
}
function qChain3(d: Difficulty, rng: RNG): Question {
  const [n, f, g, h] = rng.pick<[number, Frac, Frac, Frac]>([[240, [3, 4], [2, 3], [1, 2]], [180, [5, 6], [3, 5], [1, 3]], [360, [5, 6], [3, 5], [2, 3]]])
  return intQ(K_CHAIN, d, `chain3-${n}`, [T('chain3', { n, f: fs(f), g: fs(g), h: fs(h) })], mul(I(n), f, g, h)[0], rng, [mul(I(n), f, g)[0], mul(I(n), h)[0]])
}

function chainGen(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.4) return qPark(d, rng)
    if (r < 0.6) return qDoChain(d, rng)
    if (r < 0.69) return qTrees(d, rng)
    if (r < 0.78) return qFruit(d, rng)
    if (r < 0.88) return qPeony(d, rng)
    return qPartOf(d, rng)
  }
  if (d === 2) {
    if (r < 0.3) return qBlood(d, rng)
    if (r < 0.55) return qPark(d, rng)
    if (r < 0.75) return qFruit(d, rng)
    return qPartOf(d, rng)
  }
  if (r < 0.6) return qChain3(d, rng)
  return qBlood(d, rng)
}
defineGenerator(K_CHAIN, chainGen)

// ═════════════════════════════════════════════════════════════
// 7. 求比一个数多或少几分之几的数（p27–28：例 6、做一做；练习五 4–9，练习四 11，练习六 3）
// ═════════════════════════════════════════════════════════════

/** 例 6：原来每天 100 千克厨余垃圾，比原来减少了 1/4（课本），换数；线段图照课本：原来 4 段、现在 3 段实线 + 1 段虚线 */
export const KITCHEN: [number, Frac][] = [[100, [1, 4]], [120, [1, 4]], [80, [1, 5]], [90, [1, 3]]]
function kitchenBars(n: number, f: Frac): StemPart {
  const b = f[1]
  const rows: BarRow[] = [
    { name: L('name.before'), len: b, braces: [{ from: 0, to: b, side: 'top', label: String(n) }] },
    { name: L('name.now'), len: b, dash: [b - f[0], b], braces: [{ from: 0, to: b - f[0], side: 'bottom', label: '?' }, { from: b - f[0], to: b, side: 'top', label: fs(f) }] },
  ]
  return { kind: 'frac-bars', unit: b, rows, guides: true }
}
function qKitchen(d: Difficulty, rng: RNG): Question {
  const [n, f] = rng.chance(0.5) ? KITCHEN[0]! : rng.pick(KITCHEN)
  const story = T('kitchen', { n, f: fs(f) })
  const sig = `${n}-${fs(f)}`
  const now = mul(I(n), sub(I(1), f))[0]
  const k = rng.next()
  if (k < 0.3) return intQ(K_ML, d, `kitchen-${sig}`, [story, T('kitchen.q')], now, rng, [mul(I(n), f)[0], mul(I(n), add(I(1), f))[0]], 'quantity')
  if (k < 0.45) return intQ(K_ML, d, `kitchenbars-${sig}`, [story, T('kitchen.q'), kitchenBars(n, f)], now, rng, [mul(I(n), f)[0], mul(I(n), add(I(1), f))[0]], 'quantity')
  if (k < 0.57) return intQ(K_ML, d, `kitchen1-${sig}`, [story, T('kitchen.q1')], mul(I(n), f)[0], rng, [now, n - f[0]], 'quantity')
  if (k < 0.69) return valQ(K_ML, d, `kitchenf-${sig}`, [story, T('kitchen.qf')], sub(I(1), f), [f, add(I(1), f), [1, f[1] - 1]], rng, { type: 'quantity' })
  if (k < 0.8) return textQ(K_ML, d, `who-${sig}`, [story, T('kitchen.who', { f: fs(f) })], L('opt.before'), [L('opt.after')], rng, 'quantity')
  return textQ(K_ML, d, `form-${sig}`, [story, T('kitchen.form')], `${n} × (1 − ${fs(f)})`, [`${n} × ${fs(f)}`, `${n} × (1 + ${fs(f)})`, `${n} − ${fs(f)}`], rng, 'quantity')
}
/** 做一做：青少年每分钟心跳 75 次，婴儿比青少年多 4/5（课本），换数 */
export const HEART: [number, Frac][] = [[75, [4, 5]], [70, [2, 5]], [80, [1, 2]]]
function qHeart(d: Difficulty, rng: RNG): Question {
  const [n, f] = rng.chance(0.5) ? HEART[0]! : rng.pick(HEART)
  const story = T('heart', { n, f: fs(f) })
  const sig = `${n}-${fs(f)}`
  const k = rng.next()
  if (k < 0.55) return intQ(K_ML, d, `heart-${sig}`, [story, T('heart.q')], mul(I(n), add(I(1), f))[0], rng, [mul(I(n), f)[0], mul(I(n), sub(I(1), f))[0]], 'quantity')
  if (k < 0.75) return intQ(K_ML, d, `heart1-${sig}`, [story, T('heart.q1')], mul(I(n), f)[0], rng, [mul(I(n), add(I(1), f))[0]], 'quantity')
  return valQ(K_ML, d, `heartf-${sig}`, [story, T('heart.qf')], add(I(1), f), [f, sub(I(1), f), [f[1], f[0] + f[1]]], rng, { type: 'quantity' })
}
/** 练习五 4：梅花比兰花多 1/3（线段图）、女生比男生少 1/6（线段图），换数 */
export const PLUM: [number, Frac][] = [[60, [1, 3]], [48, [1, 4]], [50, [2, 5]]]
export const GIRLS: [number, Frac][] = [[180, [1, 6]], [120, [1, 4]], [150, [2, 5]]]
function qBarsMoreLess(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [n, f] = rng.chance(0.5) ? PLUM[0]! : rng.pick(PLUM)
    const b = f[1]
    const rows: BarRow[] = [
      { name: L('name.lan'), len: b, braces: [{ from: 0, to: b, side: 'top', label: String(n) }] },
      { name: L('name.mei'), len: b + f[0], parts: 1, braces: [{ from: b, to: b + f[0], side: 'top', label: fs(f) }, { from: 0, to: b + f[0], side: 'bottom', label: '?' }] },
    ]
    return intQ(K_ML, d, `plum-${n}-${fs(f)}`, [T('plum', { n, f: fs(f) }), { kind: 'frac-bars', unit: b, rows, guides: true }], mul(I(n), add(I(1), f))[0], rng, [mul(I(n), f)[0], mul(I(n), sub(I(1), f))[0]], 'quantity')
  }
  const [n, f] = rng.chance(0.5) ? GIRLS[0]! : rng.pick(GIRLS)
  const b = f[1]
  const rows: BarRow[] = [
    { name: L('name.boys'), len: b, braces: [{ from: 0, to: b, side: 'top', label: String(n) }] },
    { name: L('name.girls'), len: b, parts: 1, dash: [b - f[0], b], braces: [{ from: 0, to: b - f[0], side: 'bottom', label: '?' }, { from: b - f[0], to: b, side: 'bottom', label: fs(f) }] },
  ]
  return intQ(K_ML, d, `girls-${n}-${fs(f)}`, [T('girls', { n, f: fs(f) }), { kind: 'frac-bars', unit: b, rows, guides: true }], mul(I(n), sub(I(1), f))[0], rng, [mul(I(n), f)[0], mul(I(n), add(I(1), f))[0]], 'quantity')
}
/** 练习五 5、6、7，练习六 3（课本的数） */
function qMlApp(d: Difficulty, rng: RNG): Question {
  const k = rng.int(0, 4)
  if (k === 0) return intQ(K_ML, d, 'swordfish', [T('swordfish')], 130, rng, [50, 30], 'quantity')
  if (k === 1) return intQ(K_ML, d, 'train', [T('train')], 12, rng, [7, 2], 'quantity')
  if (k === 2) return valQ(K_ML, d, 'ele-small', [T('eleSmall')], [1, 5], [[4, 1], [21, 5], [1, 20]], rng, { type: 'quantity' })
  if (k === 3) return intQ(K_ML, d, 'ele-big', [T('eleBig')], 6, rng, [2, 4], 'quantity')
  return intQ(K_ML, d, 'sun', [T('sun')], 2600, rng, [750, 1100], 'quantity')
}
/** 判断：「比原来减少了 1/4」不是「是原来的 1/4」；「比原来多 1/2」就是「是原来的 3/2」 */
function qJudgeMl(d: Difficulty, rng: RNG): Question {
  const f = rng.pick<Frac>([[1, 4], [1, 3], [2, 5], [1, 2]])
  const k = rng.int(0, 2)
  if (k === 0) return judgeQ(K_ML, d, `judge-less-${fs(f)}`, [T('judgeLess', { f: fs(f) })], false, rng, 'quantity')
  const g = k === 1 ? add(I(1), f) : f
  return judgeQ(K_ML, d, `judge-more-${fs(f)}-${k}`, [T('judgeMore', { f: fs(f), g: fs(g) })], k === 1, rng, 'quantity')
}
/** 第 2 档：练习五 8 拼图（比小丽的 3/4 多 20 秒）、练习四 11 长江（比尼罗河的 9/10 多 297 千米） */
function qPlusAfter(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return intQ(K_ML, d, 'puzzle', [T('puzzle')], 380, rng, [360, 6, 26], 'quantity')
  return intQ(K_ML, d, 'yangtze', [T('yangtze')], 6300, rng, [6003, 6967], 'quantity')
}
/** 第 3 档：练习五 9 弹球——每次比前一次降低 2/5，第三次弹起多高 */
function qBall(d: Difficulty, rng: RNG): Question {
  return valQ(K_ML, d, 'ball', [T('ball')], [54, 5], [[18, 1], [30, 1], [20, 1], [162, 25]], rng, { dec: true, type: 'quantity' })
}

function mlGen(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.42) return qKitchen(d, rng)
    if (r < 0.58) return qHeart(d, rng)
    if (r < 0.74) return qBarsMoreLess(d, rng)
    if (r < 0.92) return qMlApp(d, rng)
    return qJudgeMl(d, rng)
  }
  if (d === 2) {
    if (r < 0.45) return qPlusAfter(d, rng)
    if (r < 0.7) return qBarsMoreLess(d, rng)
    return qJudgeMl(d, rng)
  }
  if (r < 0.6) return qBall(d, rng)
  return qPlusAfter(d, rng)
}
defineGenerator(K_ML, mlGen)
