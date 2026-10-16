import type { AreaBrace, BarRow, Difficulty, LStr, Question, QuestionType, SegBrace, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { mixed } from '@/engine/fraction'

// ─────────────────────────────────────────────────────────────
// 六上「三 分数除法」（课本 p32–43，2022 版课标新教材）的生成器（六年级数学 C）。五个知识点：
// 倒数的认识：p32 引入（3/8 × 8/3 等 4 道乘法）、定义「乘积是 1 的两个数互为倒数」、例 1（8 个数里哪两个互为倒数、分子分母交换位置、
//   1 / 0 / 0.2 的倒数）、做一做（4/11、16/9、35、7/8、4/15）；练习九 5、8 的字母题改成数字版（甲 × 乙 × 8、3/4 × c = 3/4 ÷ d）。
// 分数除以整数：例 1 菜地 4/5 公顷平均分给 2 个 / 3 个小组（面积条 frac-area：(4÷2) 个 1/5、4/5 的 1/2），做一做 9/10 ÷ 3、3/8 ÷ 2、
//   丝带 4/5 米剪成 8 段；练习七 8 梯形、《九章算术》经分只在第 3 档。
// 一个数除以分数：例 2 的算法（160 ÷ 4/5 先求 1 份 / 乘 5/4 / 两种方法的联系、2/5 ÷ 2/3 = 2/5 × 1/2 × 3）、法则、p36 ▲ 推理的数字版
//   （因为 2/3 × 3/5 = 2/5，所以 2/5 ÷ 2/3 = 3/5）、做一做 1–3（商和被除数比大小）；练习七 1–5、10，练习九 2、8 的数字版在第 2、3 档。
// 已知一个数的几分之几，求这个数：例 2 的数量关系（牛奶 160 克是砂糖的 4/5，两条线段图 frac-bars；鸡蛋 2/5 千克是面粉的 2/3）、
//   整理和复习的乘除对比（18 × 2/3、12 ÷ 2/3，线段 seg-braces）、练习七 6、7，练习九 1、3、7；齿轮（3）、夏至、楼层在第 2 档。
// 把整体看作1：例 3 栈道（每天修 1/12、1/18，课本答案 7.2 天是选项；假设 36 千米；把全长看作 1）、做一做（师傅 3 小时、徒弟 6 小时，
//   完成 3/4），练习八 1、2、4，练习九 4、6；练习八 3、5 在第 2、3 档。换数的合作题第 1 档只用结果是整数的一对（数字键盘）。
// 课本的规矩：结果约成最简分数，假分数不化成带分数（「你知道吗」的 1 4/21 除外）；整数答案数字键盘，分数、小数答案选项卡；
// 选项里不放等值的两种写法；不出「在 ○ 里填运算符号」「方程」；单独一个小写字母不做答案。
// 朗读：「长」只在「长方形」「长度」里（丝带问「每段是多少米」、栈道说「这条栈道的 1/12」、夏至说「黑夜的时间是白天的 3/5」）；
// 植树写「栽」，楼写「一栋」，七楼写汉字；「相向而行」写「相对开出」，「相背而行」写「朝相反的方向走」；「还剩」写「剩下」；
// 不写「得数」「只开」「重」。「倒数」「互为」「转」改不了说法，要主会话加 SAY_AS（见回复）。
// ─────────────────────────────────────────────────────────────

const K1 = 'm6s1-03-reciprocal'
const K2 = 'm6s1-03-frac-int'
const K3 = 'm6s1-03-div-frac'
const K4 = 'm6s1-03-find-whole'
const K5 = 'm6s1-03-as-one'

type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k: `m6.fdiv.${k}`, p } : { k: `m6.fdiv.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })
const range = (n: number, from = 0): number[] => Array.from({ length: n }, (_, i) => from + i)

// ══ 分数的算法（分子、分母都是非负整数，分母 > 0）══

export type Frac = readonly [number, number]
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
function red([n, d]: Frac): Frac {
  const g = gcd(n, d) || 1
  return [n / g, d / g]
}
const mul = (a: Frac, b: Frac): Frac => red([a[0] * b[0], a[1] * b[1]])
const dv = (a: Frac, b: Frac): Frac => red([a[0] * b[1], a[1] * b[0]])
const add = (a: Frac, b: Frac): Frac => red([a[0] * b[1] + b[0] * a[1], a[1] * b[1]])
const sub = (a: Frac, b: Frac): Frac => red([a[0] * b[1] - b[0] * a[1], a[1] * b[1]])
const same = (a: Frac, b: Frac): boolean => a[0] * b[1] === b[0] * a[1]
const less = (a: Frac, b: Frac): boolean => a[0] * b[1] < b[0] * a[1]
const inv = (a: Frac): Frac => red([a[1], a[0]])
const ONE: Frac = [1, 1]
/** 写成文字：先约分，分母是 1 的写整数 */
export function fs(f: Frac): string {
  const [n, d] = red(f)
  return d === 1 ? String(n) : `${n}/${d}`
}
/** '3/8' → [3, 8]，'6' → [6, 1]，'0.25' → [1, 4] */
export function F(s: string | number): Frac {
  if (typeof s === 'number') return [s, 1]
  const m = /^(\d+)\/(\d+)$/.exec(s)
  if (m) return red([Number(m[1]), Number(m[2])])
  if (s.includes('.')) {
    const k = s.split('.')[1]!.length
    return red([Math.round(Number(s) * 10 ** k), 10 ** k])
  }
  return [Number(s), 1]
}
/** 算式的值：整数、分数、+ − × ÷、小括号（先乘除后加减）；「=」后面的不算。lr = 不管先乘除、从左往右算（造干扰项）；
 *  flip = 把 ÷ 当成 ×（忘了乘倒数，造干扰项） */
export function evalF(src: string, opts: { lr?: boolean; flip?: boolean } = {}): Frac {
  const toks = src.split('=')[0]!.match(/\d+\/\d+|\d+|[-−+×÷()]/g) ?? []
  let i = 0
  const atom = (): Frac => {
    const t = toks[i++]!
    if (t === '(') {
      const v = sum()
      i++ // )
      return v
    }
    return F(t)
  }
  const apply = (v: Frac, op: string, r: Frac): Frac =>
    op === '+' ? add(v, r) : op === '×' || (op === '÷' && opts.flip) ? mul(v, r) : op === '÷' ? dv(v, r) : sub(v, r)
  const term = (): Frac => {
    let v = atom()
    while (i < toks.length && (toks[i] === '×' || toks[i] === '÷')) {
      const op = toks[i++]!
      v = apply(v, op, atom())
    }
    return v
  }
  const sum = (): Frac => {
    if (opts.lr) {
      let v = atom()
      while (i < toks.length && toks[i] !== ')') {
        const op = toks[i++]!
        v = apply(v, op, atom())
      }
      return v
    }
    let v = term()
    while (i < toks.length && (toks[i] === '+' || toks[i] === '-' || toks[i] === '−')) {
      const op = toks[i++]!
      v = apply(v, op, term())
    }
    return v
  }
  return sum()
}

/**
 * 分数答案的干扰项：一律写成最简、值互不相同、不等于正确答案、大于 0；cands 是课本暴露的错法（没乘倒数、被除数也颠倒、
 * 只求了一份……），不够三个再补「多一份 / 翻一倍 / 分母大一」。
 */
export function fracWrongs(correct: Frac, cands: Frac[], count = 3): string[] {
  const c = red(correct)
  const extra: Frac[] = [[c[0] + 1, c[1]], [c[0] * 2, c[1]], [c[0], c[1] + 1], [c[0] + c[1], c[1]], [c[1], c[0] + 1], [c[0] + 2, c[1]], [1, c[1] + 1], [c[0], c[1] * 2]]
  const out: Frac[] = []
  for (const f of [...cands, ...extra]) {
    if (!Number.isInteger(f[0]) || !Number.isInteger(f[1]) || f[0] <= 0 || f[1] <= 0) continue
    const r = red(f)
    if (r[1] > 999 || r[0] > 99999) continue
    if (same(r, c) || out.some((o) => same(o, r))) continue
    out.push(r)
    if (out.length >= count) break
  }
  return out.map(fs)
}

/** 答案是数：整数用数字键盘，分数用选项卡（干扰项照 cands） */
function ans(kpId: string, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], value: Frac, cands: Frac[], rng: RNG): Question {
  const v = red(value)
  if (v[1] === 1) return numberQuestion({ kpId, type, difficulty: d, sig, stem, value: v[0], rng, min: 0, max: 99999, input: 'numpad' })
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: fs(v), distractors: fracWrongs(v, cands), rng })
}
/** 整数答案（数字键盘） */
const intQ = (kpId: string, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG): Question =>
  numberQuestion({ kpId, type, difficulty: d, sig, stem, value, rng, min: 0, max: 99999, input: 'numpad' })
/**
 * 带图的整数题用选项卡（排版普查：图 + 数字键盘四行约 300px，手机一屏放不下；选项卡两行约 150px，同五年级 notify.ts）：
 * 干扰项照常见错误给（smart，只留正整数）
 */
function intPick(kpId: string, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], value: number, smart: number[], rng: RNG): Question {
  const ok = smart.filter((v) => Number.isInteger(v) && v > 0 && v !== value)
  return numberQuestion({ kpId, type, difficulty: d, sig, stem, value, rng, min: 1, max: Math.max(99, value * 10, ...ok), smart: ok, input: 'choice' })
}
/** 文字 / 算式选项：选项按值或写法互不相同，由调用方保证 */
const pickQ = (kpId: string, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, wrongs: LStr[], rng: RNG): Question =>
  labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: wrongs, rng })
/** 判断题：……，对吗？ */
const tf = (kpId: string, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], ok: boolean, rng: RNG): Question =>
  pickQ(kpId, type, d, sig, stem, L(ok ? 'yes' : 'no'), [L(ok ? 'no' : 'yes')], rng)
/** 比一比，填 >、< 或 = */
function cmpQ(kpId: string, type: QuestionType, d: Difficulty, sig: string, lead: StemPart, left: string, right: string, x: Frac, y: Frac, rng: RNG): Question {
  const correct = less(x, y) ? '<' : less(y, x) ? '>' : '='
  return pickQ(kpId, type, d, sig, [lead, E(`${left} ○ ${right}`)], correct, ['>', '<', '='].filter((s) => s !== correct), rng)
}
/** 算式选项：正确的一个 + 值和它不同、彼此也不同的几个（课本暴露的错法） */
function exprQ(kpId: string, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], correct: string, wrongs: string[], rng: RNG): Question {
  const target = evalF(correct)
  const seen: Frac[] = [target]
  const ws: string[] = []
  for (const w of wrongs) {
    const v = evalF(w)
    if (seen.some((s) => same(s, v)) || ws.includes(w)) continue
    seen.push(v)
    ws.push(w)
    if (ws.length >= 3) break
  }
  return pickQ(kpId, type, d, sig, stem, correct, ws, rng)
}
/** 按概率 p 从课本的数里取，否则从补充的数里取 */
const bookOr = <T>(rng: RNG, p: number, book: readonly T[], more: readonly T[]): T => (rng.chance(p) || more.length === 0 ? rng.pick(book) : rng.pick(more))

// ══ 倒数的认识（m6s1-03-reciprocal，p32）══

/** 引入：先计算，再观察（积都是 1） */
export const INTRO: [string, string][] = [
  ['3/8', '8/3'],
  ['7/15', '15/7'],
  ['5', '1/5'],
  ['1/12', '12'],
]
/** 例 1 的 3/5、7/2 和做一做的 4/11、16/9、7/8、4/15 */
export const REC_BOOK = ['3/5', '7/2', '4/11', '16/9', '7/8', '4/15']
const REC_MORE = ['5/3', '2/7', '3/8', '8/3', '7/15', '15/7', '2/3', '3/4', '4/5', '5/6', '5/8', '9/10', '7/12', '9/4', '11/6']
/** 例 1 的 6、做一做的 35（引入里的 5、12 也在） */
export const REC_INT_BOOK = [6, 35]
const REC_INT_MORE = [2, 3, 4, 5, 7, 8, 9, 10, 12]
/** 例 1 给的 8 个数 */
export const EX1_NUMS = ['3/5', '6', '7/2', '5/3', '1/6', '1', '2/7', '0']
/** 例 1 里互为倒数的三组 */
export const EX1_PAIRS: [string, string][] = [
  ['3/5', '5/3'],
  ['6', '1/6'],
  ['7/2', '2/7'],
]
/** 判断题里的一对数：对的照例 1、引入，不对的是分子分母只像了一半 */
export const TF_PAIRS: [string, string, boolean][] = [
  ['3/8', '8/3', true],
  ['6', '1/6', true],
  ['7/2', '2/7', true],
  ['4/11', '11/4', true],
  ['4/9', '9/5', false],
  ['2/3', '3/5', false],
  ['3/4', '4/5', false],
  ['5/6', '6/7', false],
]
/** 判断「n 的倒数是 n」：1 对，0、5 不对 */
const TF_SELF: number[] = [1, 0, 5]

/** 一个数的倒数算错的样子：没变、当成「和是 1」、只把分子取倒数、差一 */
function recipCands(x: Frac): Frac[] {
  const [n, d] = x
  if (d === 1) return [[n, 1], [n - 1, n], [1, n + 1], [1, n - 1]]
  const out: Frac[] = [[n, d]]
  if (n < d) out.push([d - n, d])
  if (n > 1) out.push([1, n])
  out.push([d, n + 1], [d + 1, n])
  return out
}
const isRecipPair = (a: string, b: string): boolean => {
  const x = F(a)
  const y = F(b)
  return x[0] * y[0] === x[1] * y[1] && x[0] > 0
}

function qIntro(d: Difficulty, rng: RNG): Question {
  let a: string
  let b: string
  if (rng.chance(0.7)) [a, b] = rng.pick(INTRO)
  else if (rng.chance(0.6)) {
    const x = rng.pick(REC_MORE)
    a = x
    b = fs(inv(F(x)))
  } else {
    const n = rng.pick(REC_INT_MORE)
    ;[a, b] = rng.chance(0.5) ? [String(n), `1/${n}`] : [`1/${n}`, String(n)]
  }
  return intQ(K1, 'frac-calc', d, `intro-${a}x${b}`, [T('r.intro'), E(`${a} × ${b} = ?`)], 1, rng)
}
function qRecFrac(d: Difficulty, rng: RNG, pool?: readonly string[]): Question {
  const x = pool ? rng.pick(pool) : bookOr(rng, 0.6, REC_BOOK, REC_MORE)
  const f = F(x)
  return ans(K1, 'frac-calc', d, `frac-${x}`, [T('r.of', { x })], inv(f), recipCands(f), rng)
}
function qRecInt(d: Difficulty, rng: RNG): Question {
  const n = bookOr(rng, 0.5, [...REC_INT_BOOK, 5, 12], REC_INT_MORE)
  return ans(K1, 'frac-calc', d, `int-${n}`, [T('r.of', { x: n })], [1, n], recipCands([n, 1]), rng)
}
/** 分子是 1 的分数：倒数是整数（引入的 1/12、1/5，例 1 的 1/6） */
function qRecUnit(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 35])
  return intQ(K1, 'frac-calc', d, `unit-${n}`, [T('r.ofJi', { x: `1/${n}` })], n, rng)
}
/** 互为：6 的倒数是 1/6，那么 1/6 的倒数是几 */
function qRecBack(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([6, 5, 12, 35, 8])
  return intQ(K1, 'frac-calc', d, `back-${n}`, [T('r.back', { n, r: `1/${n}` })], n, rng)
}
/** 例 1：1 的倒数是多少 */
const qRecOne = (d: Difficulty, rng: RNG): Question => intQ(K1, 'frac-calc', d, 'one', [T('r.ofJi', { x: 1 })], 1, rng)
/** 例 1：0 有倒数吗 */
const qRecZero = (d: Difficulty, rng: RNG): Question =>
  pickQ(K1, 'frac-calc', d, 'zero', [T('r.zero')], L('r.zero.none'), [L('r.zero.zero'), L('r.zero.one')], rng)
/** 例 1：0.2 呢（0.2 = 1/5，倒数是 5） */
function qRecDec(d: Difficulty, rng: RNG): Question {
  const x = bookOr(rng, 0.45, ['0.2'], ['0.5', '0.25', '0.1'])
  return intQ(K1, 'frac-calc', d, `dec-${x}`, [T('r.ofJi', { x })], inv(F(x))[0], rng)
}
/** 例 1：下面哪两个数互为倒数（照例 1 的 8 个数配对） */
function qRecPair(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(EX1_PAIRS)
  const wrong: [string, string][] = []
  for (let i = 0; i < EX1_NUMS.length; i++) {
    for (let j = i + 1; j < EX1_NUMS.length; j++) if (!isRecipPair(EX1_NUMS[i]!, EX1_NUMS[j]!)) wrong.push([EX1_NUMS[i]!, EX1_NUMS[j]!])
  }
  const ws = rng.shuffle(wrong).slice(0, 3)
  return pickQ(K1, 'frac-calc', d, `pair-${a}-${b}`, [T('r.pair')], L('pairOf', { a, b }), ws.map(([x, y]) => L('pairOf', { a: x, b: y })), rng)
}
/** 2/7 × ? = 1（例 1 的验算写法） */
function qRecFill(d: Difficulty, rng: RNG): Question {
  const x = rng.chance(0.75) ? bookOr(rng, 0.5, REC_BOOK, REC_MORE) : String(rng.pick([6, 12, 35]))
  const left = rng.chance(0.5)
  const f = F(x)
  return ans(K1, 'frac-calc', d, `fill-${x}-${left ? 'l' : 'r'}`, [T('what'), E(left ? `${x} × ? = 1` : `? × ${x} = 1`)], inv(f), recipCands(f), rng)
}
/** 例 1：你是怎样找一个数的倒数的；想一想：互为倒数的两个数有什么特点 */
function qRecHow(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.55)) return pickQ(K1, 'frac-calc', d, 'how', [T('r.how')], L('r.how.swap'), [L('r.how.double'), L('r.how.one')], rng)
  return pickQ(K1, 'frac-calc', d, 'feat', [T('r.feat')], L('r.feat.swap'), [L('r.feat.same'), L('r.feat.num')], rng)
}
function qRecTf(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.7)) {
    const [a, b, ok] = rng.pick(TF_PAIRS)
    return tf(K1, 'frac-calc', d, `tf-${a}-${b}`, [T('r.tf.mutual', { a, b })], ok, rng)
  }
  const n = rng.pick(TF_SELF)
  return tf(K1, 'frac-calc', d, `tfself-${n}`, [T('r.tf.self', { n })], n === 1, rng)
}
/** 定义：乘积是几的两个数互为倒数；反过来：互为倒数的两个数乘积是几 */
const qRecDef = (d: Difficulty, rng: RNG): Question =>
  rng.chance(0.5) ? intQ(K1, 'frac-calc', d, 'def', [T('r.def')], 1, rng) : intQ(K1, 'frac-calc', d, 'prod', [T('r.prod')], 1, rng)

/** 小数的倒数（第 2 档）：0.4 = 2/5 → 5/2；0.125、0.04 的倒数是整数 */
export const DEC2: [string, string, string[]][] = [
  ['0.4', '5/2', ['2/5', '1/4', '4']],
  ['0.75', '4/3', ['3/4', '1/4', '4']],
  ['1.25', '4/5', ['5/4', '1/5', '5']],
  ['1.5', '2/3', ['3/2', '1/2', '5']],
]
function qRecDec2(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) {
    const x = rng.pick(['0.125', '0.04'])
    return intQ(K1, 'frac-calc', d, `dec-${x}`, [T('r.ofJi', { x })], inv(F(x))[0], rng)
  }
  const [x, c, ws] = rng.pick(DEC2)
  return pickQ(K1, 'frac-calc', d, `dec2-${x}`, [T('r.of', { x })], c, ws, rng)
}
/** 第 2 档的判断：真分数 / 假分数的倒数、倒数一定比它小、定义反过来说、0.2 和 5 */
function qRecTf2(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.2) return tf(K1, 'frac-calc', d, 'tf2-proper', [T('r.tf.proper')], true, rng)
  if (roll < 0.4) return tf(K1, 'frac-calc', d, 'tf2-improper', [T('r.tf.improper')], false, rng)
  if (roll < 0.6) return tf(K1, 'frac-calc', d, 'tf2-smaller', [T('r.tf.smaller')], false, rng)
  if (roll < 0.8) return tf(K1, 'frac-calc', d, 'tf2-def', [T('r.tf.def')], true, rng)
  return tf(K1, 'frac-calc', d, 'tf2-0.2-5', [T('r.tf.mutual', { a: '0.2', b: '5' })], true, rng)
}
/** 第 2 档：比一比一个数和它的倒数 */
function qRecCmp(d: Difficulty, rng: RNG): Question {
  const x = rng.pick([...REC_MORE, '3/5', '7/2', '4/11', '16/9'])
  const f = F(x)
  const r = fs(inv(f))
  return cmpQ(K1, 'frac-calc', d, `cmp-${x}`, T('cmp2'), x, r, f, inv(f), rng)
}
/** 练习九 8 机器人：3/4 × c = 3/4 ÷ d，c 和 d 是什么关系 */
const qRecCd = (d: Difficulty, rng: RNG): Question =>
  pickQ(K1, 'frac-calc', d, 'cd', [T('r.cd'), E('3/4 × c = 3/4 ÷ d')], L('r.cd.recip'), [L('r.cd.equal'), L('r.cd.sum')], rng)
/** 练习九 5 的数字版：甲、乙互为倒数，甲 × 乙 × k、甲 × 乙 ÷ k */
function qRecJy(d: Difficulty, rng: RNG): Question {
  const k = rng.pick([5, 6, 8, 9, 20, 42, 72])
  if (rng.chance(0.5)) return intQ(K1, 'frac-calc', d, `jymul-${k}`, [T('r.jy.mul', { k })], k, rng)
  return ans(K1, 'frac-calc', d, `jydiv-${k}`, [T('r.jy.div', { k })], [1, k], [[k, 1], [1, k + 1], [2, k]], rng)
}
/** 倒数等于它本身的数 */
const qRecSelf = (d: Difficulty, rng: RNG): Question => intQ(K1, 'frac-calc', d, 'self', [T('r.self')], 1, rng)
/** 第 3 档：带分数的倒数（本单元课本没有带分数，只在这里） */
export const MIXED_REC: [number, number, number][] = [
  [1, 1, 2],
  [2, 1, 3],
  [1, 3, 4],
  [3, 1, 2],
  [1, 2, 5],
]
function qRecMixed(d: Difficulty, rng: RNG): Question {
  const [w, n, den] = rng.pick(MIXED_REC)
  const improper: Frac = [w * den + n, den]
  return ans(K1, 'frac-calc', d, `mixed-${w}-${n}-${den}`, [T('r.of', { x: mixed(w, n, den) })], inv(improper), [[den, n], [w * n + den, n], improper], rng)
}

function reciprocalGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 引入、定义、例 1（分数 / 整数 / 1/n / 1 / 0 / 0.2 / 配对 / 怎样找）、做一做、判断
    if (roll < 0.08) return qIntro(d, rng)
    if (roll < 0.15) return qRecDef(d, rng)
    if (roll < 0.31) return qRecFrac(d, rng)
    if (roll < 0.41) return qRecInt(d, rng)
    if (roll < 0.48) return qRecUnit(d, rng)
    if (roll < 0.53) return qRecBack(d, rng)
    if (roll < 0.57) return qRecOne(d, rng)
    if (roll < 0.62) return qRecZero(d, rng)
    if (roll < 0.69) return qRecDec(d, rng)
    if (roll < 0.77) return qRecPair(d, rng)
    if (roll < 0.85) return qRecFill(d, rng)
    if (roll < 0.92) return qRecHow(d, rng)
    return qRecTf(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return qRecDec2(d, rng)
    if (roll < 0.45) return qRecTf2(d, rng)
    if (roll < 0.55) return qRecSelf(d, rng)
    if (roll < 0.7) return qRecCmp(d, rng)
    if (roll < 0.8) return qRecCd(d, rng)
    if (roll < 0.9) return qRecJy(d, rng)
    return qRecFrac(d, rng, REC_MORE)
  }
  if (roll < 0.5) return qRecMixed(d, rng)
  if (roll < 0.7) return qRecCd(d, rng)
  return qRecJy(d, rng)
}
defineGenerator(K1, reciprocalGen)

// ══ 分数除以整数（m6s1-03-frac-int，p33–34）══

/** 分子能被整数整除的（例 1（1）4/5 ÷ 2 的想法：(4 ÷ 2) 个 1/5）；分母不超过 10，面积条画得清 */
export const DIV_POOL: [number, number, number][] = [
  [4, 5, 2],
  [4, 5, 4],
  [6, 7, 2],
  [6, 7, 3],
  [8, 9, 2],
  [8, 9, 4],
  [9, 10, 3],
  [3, 4, 3],
  [2, 3, 2],
  [4, 7, 2],
]
/** 分子不能整除的（例 1（2）4/5 ÷ 3：只能乘 1/3）；整数不超过 4，竖着分的列画得清 */
export const NONDIV_POOL: [number, number, number][] = [
  [4, 5, 3],
  [3, 5, 2],
  [2, 3, 3],
  [3, 4, 2],
  [5, 6, 2],
  [2, 5, 3],
  [5, 8, 3],
  [7, 10, 2],
  [3, 7, 2],
  [5, 9, 2],
  [3, 8, 2],
  [4, 7, 3],
]
/** 做一做 1（9/10 ÷ 3、3/8 ÷ 2）与例 1 的两道 */
export const CALC_BOOK: [number, number, number][] = [
  [9, 10, 3],
  [3, 8, 2],
  [4, 5, 2],
  [4, 5, 3],
]
/** 做一做 2 丝带 4/5 米剪成 8 段，和别的丝带 */
export const RIBBON: [number, number, number][] = [
  [4, 5, 8],
  [3, 4, 6],
  [2, 3, 4],
  [5, 6, 5],
  [9, 10, 3],
  [7, 8, 7],
]
/** 第 2 档：要约分的（p36 做一做 2 的 8/9 ÷ 4、6/13 ÷ 4，练习九 2 的 15/22 ÷ 10）、假分数 15/8 ÷ 2（做一做 3） */
export const CALC2: [number, number, number][] = [
  [8, 9, 4],
  [6, 13, 4],
  [15, 22, 10],
  [15, 8, 2],
  [9, 14, 6],
  [10, 11, 4],
  [12, 13, 8],
]
const fr = (a: number, b: number): string => `${a}/${b}`
/** 分数除以整数算错的样子：乘了整数（= 分母除以整数）、被除数也颠倒、分子分母都除以整数（原数没变）、两个都颠倒 */
const intCands = (a: number, b: number, n: number): Frac[] => [
  [a * n, b],
  [b, a * n],
  [a, b],
  [b * n, a],
]
function randomFracInt(rng: RNG): [number, number, number] {
  for (;;) {
    const b = rng.int(3, 12)
    const a = rng.int(1, b - 1)
    if (gcd(a, b) !== 1) continue
    return [a, b, rng.int(2, 9)]
  }
}
/** 例 1 的面积条：整个长方形是 1 公顷，横着分 b 条、下面 a 条是这块地（上面的画虚线）；竖着分 cols 列；左边括号写 a/b */
function areaFig(a: number, b: number, cols: number, shade?: { along: 'row' | 'col'; cells: number[] }): StemPart {
  const braces: AreaBrace[] = [{ side: 'left', from: 0, to: a, label: fr(a, b) }]
  return { kind: 'frac-area', rows: b, cols, solid: a, ...(shade ? { shade } : {}), braces }
}

/** 例 1（1）：平均分给 n 个小组，分子能整除，图上涂下面 a ÷ n 条 */
function qPlotDiv(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = bookOr(rng, 0.45, [[4, 5, 2] as [number, number, number]], DIV_POOL)
  const stem = [areaFig(a, b, 1, { along: 'row', cells: range(a / n) }), T('fi.plot', { a: fr(a, b), n })]
  return ans(K2, 'frac-calc', d, `plot1-${fr(a, b)}-${n}`, stem, [a, b * n], intCands(a, b, n), rng)
}
/** 例 1（1）男孩的想法：把 4 个 1/5 公顷平均分成 2 份，每份是几个 1/5 公顷（图不涂色） */
function qUnits(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = bookOr(rng, 0.45, [[4, 5, 2] as [number, number, number]], DIV_POOL)
  const stem = [areaFig(a, b, 1), T('fi.units', { n, k: a, u: fr(1, b) })]
  return intPick(K2, 'frac-calc', d, `units-${fr(a, b)}-${n}`, stem, a / n, [n, a, a * n, a + n], rng)
}
/** 例 1 女孩的想法：每份是 4/5 公顷的几分之几（竖着分 n 列、涂一列） */
function qPart(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = bookOr(rng, 0.45, [[4, 5, 2], [4, 5, 3]] as [number, number, number][], [...DIV_POOL.filter((t) => t[2] <= 4), ...NONDIV_POOL])
  const stem = [areaFig(a, b, n, { along: 'col', cells: [n - 1] }), T('fi.part', { a: fr(a, b), n })]
  return ans(K2, 'frac-calc', d, `part-${fr(a, b)}-${n}`, stem, [1, n], [[n, 1], [a, b * n], [1, n + 1], [1, b]], rng)
}
/** 例 1（2）：平均分给 3 个小组呢（分子不能整除，图竖着分 n 列、涂一列） */
function qPlotNonDiv(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = bookOr(rng, 0.45, [[4, 5, 3] as [number, number, number]], NONDIV_POOL)
  const stem = [areaFig(a, b, n, { along: 'col', cells: [n - 1] }), T('fi.plot', { a: fr(a, b), n })]
  return ans(K2, 'frac-calc', d, `plot2-${fr(a, b)}-${n}`, stem, [a, b * n], intCands(a, b, n), rng)
}
/** 做一做 1 的写法：9/10 ÷ 3 = 9/10 × ?（「○」里填运算符号不出） */
function qTimes(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = rng.chance(0.55) ? rng.pick(CALC_BOOK) : randomFracInt(rng)
  return ans(K2, 'frac-calc', d, `times-${fr(a, b)}-${n}`, [T('what'), E(`${fr(a, b)} ÷ ${n} = ${fr(a, b)} × ?`)], [1, n], [[n, 1], [1, n + 1], [1, 2 * n], [n, 2]], rng)
}
/** 做一做 1 计算（课本数 + 换数）；第 2 档用要约分的 */
function qCalcInt(d: Difficulty, rng: RNG, pool?: readonly [number, number, number][]): Question {
  const [a, b, n] = pool ? rng.pick(pool) : rng.chance(0.55) ? rng.pick(CALC_BOOK) : randomFracInt(rng)
  return ans(K2, 'frac-calc', d, `calc-${fr(a, b)}-${n}`, [T('calc'), E(`${fr(a, b)} ÷ ${n} = ?`)], [a, b * n], intCands(a, b, n), rng)
}
/** 做一做 2：把一根 4/5 米的丝带平均剪成 8 段 */
function qRibbon(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = bookOr(rng, 0.5, [RIBBON[0]!], RIBBON.slice(1))
  return ans(K2, 'frac-calc', d, `ribbon-${fr(a, b)}-${n}`, [T('fi.ribbon', { a: fr(a, b), n })], [a, b * n], intCands(a, b, n), rng)
}
/** 讨论的结论：分数除以整数（0 除外），等于乘这个整数的倒数 */
const qRuleInt = (d: Difficulty, rng: RNG): Question => pickQ(K2, 'frac-calc', d, 'rule', [T('fi.rule')], L('w.recip'), [L('w.self'), L('w.half')], rng)
/** 例 1 的列式 */
function qWhichInt(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = bookOr(rng, 0.4, [[4, 5, 3], [4, 5, 2]] as [number, number, number][], NONDIV_POOL)
  const x = fr(a, b)
  return exprQ(K2, 'frac-calc', d, `which-${x}-${n}`, [T('fi.which', { a: x, n })], `${x} ÷ ${n}`, [`${x} × ${n}`, `${n} ÷ ${x}`], rng)
}
/** 判断：4/5 ÷ 2 = 4/5 × 2 对吗（课本的两种想法、乘倒数、被除数颠倒、算出的结果） */
function qTfInt(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = rng.chance(0.5) ? rng.pick(CALC_BOOK) : rng.pick([...DIV_POOL, ...NONDIV_POOL])
  const x = fr(a, b)
  const forms: [string, string, boolean][] = [
    ['recip', `${x} × 1/${n}`, true],
    ['mul', `${x} × ${n}`, false],
    ['flip', `${fs([b, a])} × 1/${n}`, false],
    ['value', fs([a, b * n]), true],
    ['wrong', fs([a * n, b]), false],
  ]
  const [tag, rhs, ok] = rng.pick(forms)
  return tf(K2, 'frac-calc', d, `tf-${x}-${n}-${tag}`, [T('judge'), E(`${x} ÷ ${n} = ${rhs}`)], ok, rng)
}
/** 哪个算式和 3/8 ÷ 2 的结果一样 */
function qSameInt(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = rng.chance(0.5) ? rng.pick(CALC_BOOK) : rng.pick([...DIV_POOL, ...NONDIV_POOL])
  const x = fr(a, b)
  const y = fs([b, a])
  return exprQ(K2, 'frac-calc', d, `same-${x}-${n}`, [T('same', { e: `${x} ÷ ${n}` })], `${x} × 1/${n}`, [`${x} × ${n}`, `${y} × 1/${n}`, `${y} × ${n}`], rng)
}
/** 例 1（1）的算法：分子能被整除时，直接用分子除以整数 */
function qDirect(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = bookOr(rng, 0.4, [[4, 5, 2] as [number, number, number]], DIV_POOL)
  const x = fr(a, b)
  return ans(K2, 'frac-calc', d, `direct-${x}-${n}`, [T('fi.direct', { e: `${x} ÷ ${n}`, a, n })], [a, b * n], [[a / n, b * n], ...intCands(a, b, n)], rng)
}
/** 第 2 档：下面哪道题可以直接用分子除以整数来算 */
function qCanDirect(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = rng.pick(DIV_POOL)
  const ws = rng.shuffle(NONDIV_POOL).slice(0, 2)
  const show = ([p, q, m]: [number, number, number]): string => `${fr(p, q)} ÷ ${m}`
  return pickQ(K2, 'frac-calc', d, `candirect-${fr(a, b)}-${n}`, [T('fi.canDirect')], show([a, b, n]), ws.map(show), rng)
}
/** 第 2 档：比一比（做一做 3 前两道：分数除以整数，商比被除数小；两个商比大小） */
function qCmpInt(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = rng.pick([...CALC_BOOK, ...DIV_POOL, ...NONDIV_POOL, [6, 7, 3], [15, 8, 2]] as [number, number, number][])
  const x = fr(a, b)
  if (rng.chance(0.55)) return cmpQ(K2, 'frac-calc', d, `cmp-${x}-${n}`, T('cmp'), `${x} ÷ ${n}`, x, [a, b * n], [a, b], rng)
  let m = rng.int(2, 6)
  if (m === n) m += 1
  return cmpQ(K2, 'frac-calc', d, `cmp2-${x}-${n}-${m}`, T('cmp'), `${x} ÷ ${n}`, `${x} ÷ ${m}`, [a, b * n], [a, b * m], rng)
}
/** 第 2 档：别的情境（果汁平均分给几个人、糖平均装进几个袋子） */
function qShareInt(d: Difficulty, rng: RNG): Question {
  const [a, b, n] = rng.pick([...NONDIV_POOL, ...DIV_POOL, ...CALC2.filter((t) => t[0] < t[1])])
  const juice = rng.chance(0.5)
  return ans(K2, 'frac-calc', d, `${juice ? 'juice' : 'sugar'}-${fr(a, b)}-${n}`, [T(juice ? 'fi.juice' : 'fi.sugar', { a: fr(a, b), n })], [a, b * n], intCands(a, b, n), rng)
}
/** 第 2 档：一个数除以 n，等于这个数乘几 */
function qByN(d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 9)
  return ans(K2, 'frac-calc', d, `byn-${n}`, [T('fi.byN', { n })], [1, n], [[n, 1], [1, n + 1], [1, n - 1]], rng)
}
/** 第 3 档：连除两个整数 */
function qTwoInt(d: Difficulty, rng: RNG): Question {
  const [a, b] = randomFracInt(rng)
  const m = rng.int(2, 5)
  const n = rng.int(2, 5)
  const x = fr(a, b)
  return ans(K2, 'frac-calc', d, `two-${x}-${m}-${n}`, [T('calc'), E(`${x} ÷ ${m} ÷ ${n} = ?`)], [a, b * m * n], [[a * m * n, b], [a * m, b * n], [a, b * (m + n)]], rng)
}
/** 第 3 档：练习七 8 等腰梯形玻璃的面积（上底 3/5 米、下底 4/5 米、高 3/4 米 → 21/40 平方米） */
export const TRAP: [string, string, string][] = [
  ['3/5', '4/5', '3/4'],
  ['1/2', '5/6', '3/5'],
  ['2/3', '4/3', '1/2'],
]
function qTrap(d: Difficulty, rng: RNG): Question {
  const [p, q, h] = rng.pick(TRAP)
  const s = add(F(p), F(q))
  const value = dv(mul(s, F(h)), [2, 1])
  return ans(K2, 'frac-calc', d, `trap-${p}-${q}-${h}`, [T('fi.trap', { a: p, b: q, h })], value, [mul(s, F(h)), dv(mul(F(p), F(h)), [1, 1]), mul(F(q), F(h))], rng)
}
/** 第 3 档：你知道吗（《九章算术》经分）7 个人平均分 8 1/3 钱，每人 1 4/21 钱（带分数选项，照课本） */
function qShare9(d: Difficulty, rng: RNG): Question {
  return pickQ(K2, 'frac-calc', d, 'jiuzhang', [T('fi.share', { m: mixed(8, 1, 3) })], mixed(1, 4, 21), [mixed(1, 1, 7), mixed(8, 1, 21), mixed(58, 1, 3)], rng)
}

function fracIntGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1（1）（2）的图和两种想法、做一做 1、2、讨论的结论、列式、判断
    if (roll < 0.1) return qPlotDiv(d, rng)
    if (roll < 0.18) return qUnits(d, rng)
    if (roll < 0.26) return qPart(d, rng)
    if (roll < 0.36) return qPlotNonDiv(d, rng)
    if (roll < 0.46) return qTimes(d, rng)
    if (roll < 0.62) return qCalcInt(d, rng)
    if (roll < 0.72) return qRibbon(d, rng)
    if (roll < 0.77) return qRuleInt(d, rng)
    if (roll < 0.84) return qWhichInt(d, rng)
    if (roll < 0.9) return qTfInt(d, rng)
    if (roll < 0.95) return qSameInt(d, rng)
    return qDirect(d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return qCalcInt(d, rng, CALC2)
    if (roll < 0.37) return qCanDirect(d, rng)
    if (roll < 0.52) return qCmpInt(d, rng)
    if (roll < 0.8) return qShareInt(d, rng)
    if (roll < 0.9) return qByN(d, rng)
    return qRibbon(d, rng)
  }
  if (roll < 0.4) return qTwoInt(d, rng)
  if (roll < 0.7) return qTrap(d, rng)
  return qShare9(d, rng)
}
defineGenerator(K2, fracIntGen)

// ══ 一个数除以分数（m6s1-03-div-frac，p34–36）══

/** 整数 ÷ 分数、商是整数：例 2（1）160 ÷ 4/5、做一做 1 的 24 ÷ 8/9、练习七 2 的 3 ÷ 1/3、5 ÷ 5/6、练习九 2 的 45 ÷ 9/14 */
export const INT_BOOK: [number, string][] = [
  [160, '4/5'],
  [24, '8/9'],
  [3, '1/3'],
  [5, '5/6'],
  [45, '9/14'],
]
const DIVISORS = ['2/3', '3/4', '4/5', '5/6', '3/5', '2/5', '3/8', '5/8', '7/8', '8/9', '1/3', '1/4', '1/5', '1/6']
function randomIntDiv(rng: RNG): [number, string] {
  const c = rng.pick(DIVISORS)
  return [F(c)[0] * rng.int(2, 12), c]
}
/** 例 2（2）2/5 ÷ 2/3、做一做 1 的 7/16 ÷ 4/5、做一做 2 的四道 */
export const CALC_T1: [string, string][] = [
  ['2/5', '2/3'],
  ['7/16', '4/5'],
  ['3/10', '14/45'],
  ['15', '10/13'],
  ['8/9', '4'],
  ['6/13', '4'],
]
function randomFracFrac(rng: RNG): [string, string] {
  for (;;) {
    const b = rng.int(2, 10)
    const a = rng.int(1, b - 1)
    const dd = rng.int(2, 10)
    const c = rng.int(1, dd - 1)
    if (gcd(a, b) !== 1 || gcd(c, dd) !== 1 || (a === c && b === dd)) continue
    return [fr(a, b), fr(c, dd)]
  }
}
/** 做一做 3：不计算，商和被除数比大小（课本 8 道） */
export const CMP_BOOK: [string, string][] = [
  ['6/7', '3'],
  ['15/8', '2'],
  ['9', '3/4'],
  ['6', '5/4'],
  ['1/2', '2/3'],
  ['14/9', '7/30'],
  ['5/7', '5/2'],
  ['4/5', '4/5'],
]
const CMP_DIVIDEND = ['6', '9', '8', '3/4', '5/6', '7/8', '2/3', '5/9']
const CMP_DIVISOR = ['3/4', '2/3', '1/2', '5/6', '5/4', '3/2', '7/3', '2', '3', '1']
/** 练习七 1：根据乘法算式写两道除法算式 */
export const MUL_BOOK: [string, string][] = [
  ['3/4', '5'],
  ['3/7', '2/5'],
]
/** 一个数除以分数算错的样子：没取倒数、颠倒了被除数（= 正确答案的倒数）、两个都颠倒、只乘分母、只除以分子 */
const divCands = (x: Frac, y: Frac): Frac[] => [mul(x, y), mul(inv(x), y), mul(inv(x), inv(y)), mul(x, [y[1], 1]), dv(x, [y[0], 1])]
/** 有限小数的写法（课本例 3：36/5 天写成 7.2 天）；不是有限小数返回 null */
function decStr(f: Frac): string | null {
  const [n, d] = red(f)
  const s = String(Math.round((n / d) * 1000) / 1000)
  return same(F(s), [n, d]) ? s : null
}

/** 例 2（1）：160 ÷ 4/5（整数 ÷ 分数，商是整数） */
function qIntDiv(d: Difficulty, rng: RNG): Question {
  const [n, c] = rng.chance(0.55) ? rng.pick(INT_BOOK) : randomIntDiv(rng)
  return ans(K3, 'frac-calc', d, `int-${n}-${c}`, [T('calc'), E(`${n} ÷ ${c} = ?`)], dv([n, 1], F(c)), divCands([n, 1], F(c)), rng)
}
/** 例 2（1）的方法一：已知 4 份是 160 克，先求 1 份（160 ÷ 4），再乘 5 */
function qStep(d: Difficulty, rng: RNG): Question {
  let [n, c] = rng.chance(0.5) ? INT_BOOK[0]! : randomIntDiv(rng)
  while (F(c)[0] === 1) [n, c] = randomIntDiv(rng)
  const [p, q] = F(c)
  if (rng.chance(0.4)) return intQ(K3, 'frac-calc', d, `step2-${n}-${c}`, [T('what'), E(`${n} ÷ ${c} = ${n} ÷ ${p} × ?`)], q, rng)
  return intQ(K3, 'frac-calc', d, `step1-${n}-${c}`, [T('df.step1', { e: `${n} ÷ ${c}`, a: n, c: p })], n / p, rng)
}
/** 例 2（1）的方法二：160 ÷ 4/5 = 160 × 5/4；做一做 1 的 24 ÷ 8/9 = 24 × ? */
function qAsMul(d: Difficulty, rng: RNG): Question {
  const [x, c] = rng.chance(0.55) ? rng.pick([['160', '4/5'], ['24', '8/9'], ['2/5', '2/3']] as [string, string][]) : rng.chance(0.5) ? (randomIntDiv(rng).map(String) as [string, string]) : randomFracFrac(rng)
  const y = F(c)
  return ans(K3, 'frac-calc', d, `asmul-${x}-${c}`, [T('what'), E(`${x} ÷ ${c} = ${x} × ?`)], inv(y), [y, [y[1], 1], [1, y[0]], [y[0], 1]], rng)
}
/** 例 2（1）两种方法的联系：160 ÷ 4 × 5 = 160 × 5/4 */
function qLink(d: Difficulty, rng: RNG): Question {
  const [n, c] = rng.chance(0.5) ? INT_BOOK[0]! : randomIntDiv(rng)
  const [p, q] = F(c)
  if (p === 1) return qAsMul(d, rng)
  return ans(K3, 'frac-calc', d, `link-${n}-${p}-${q}`, [T('what'), E(`${n} ÷ ${p} × ${q} = ${n} × ?`)], [q, p], [[p, q], [q, 1], [1, p]], rng)
}
/** 例 2（2）与做一做 1、2 的计算 */
function qCalcDiv(d: Difficulty, rng: RNG, pool?: readonly [string, string][]): Question {
  const [x, y] = pool ? rng.pick(pool) : rng.chance(0.55) ? rng.pick(CALC_T1) : randomFracFrac(rng)
  return ans(K3, 'frac-calc', d, `calc-${x}-${y}`, [T('calc'), E(`${x} ÷ ${y} = ?`)], dv(F(x), F(y)), divCands(F(x), F(y)), rng)
}
/** 例 2（2）课本的拆法：2/5 ÷ 2/3 = 2/5 × 1/2 × 3 = 2/5 × ? */
function qSplit(d: Difficulty, rng: RNG): Question {
  let [x, c] = rng.chance(0.5) ? CALC_T1[0]! : randomFracFrac(rng)
  if (F(c)[0] === 1) [x, c] = CALC_T1[0]!
  const [p, q] = F(c)
  return ans(K3, 'frac-calc', d, `split-${x}-${c}`, [T('what'), E(`${x} ÷ ${c} = ${x} × 1/${p} × ${q} = ${x} × ?`)], [q, p], [[p, q], [q, 1], [1, p]], rng)
}
/** 例 1、例 2 的结论：除以一个数（0 除外），等于乘这个数的倒数 */
const qRuleDiv = (d: Difficulty, rng: RNG): Question => pickQ(K3, 'frac-calc', d, 'rule', [T('df.rule')], L('w.recip'), [L('w.self'), L('w.half')], rng)
/** 做一做 3：不计算，比一比商和被除数 */
function qCmpDiv(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.chance(0.6) ? rng.pick(CMP_BOOK) : [rng.pick(CMP_DIVIDEND), rng.pick(CMP_DIVISOR)]
  return cmpQ(K3, 'compare', d, `cmp-${x}-${y}`, T('cmp'), `${x} ÷ ${y}`, x, dv(F(x), F(y)), F(x), rng)
}
/** p36 ▲ 的推理（数字版）：因为 2/3 × 3/5 = 2/5，所以 2/5 ÷ 2/3 = ? */
function qInverse(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.chance(0.5) ? CALC_T1[0]! : randomFracFrac(rng)
  const q = dv(F(x), F(y))
  return ans(K3, 'frac-calc', d, `inv-${x}-${y}`, [T('df.inv', { m: `${y} × ${fs(q)} = ${x}` }), E(`${x} ÷ ${y} = ?`)], q, [F(y), mul(F(x), F(y)), inv(q)], rng)
}
/** 练习七 1：根据乘法算式写除法算式 */
function qFromMul(d: Difficulty, rng: RNG): Question {
  let p: string
  let q: string
  if (rng.chance(0.55)) [p, q] = rng.pick(MUL_BOOK)
  else [p, q] = randomFracFrac(rng)
  const r = fs(mul(F(p), F(q)))
  const byQ = rng.chance(0.5)
  const stem = [T('df.fromMul', { m: `${p} × ${q} = ${r}` }), E(byQ ? `${r} ÷ ${q} = ?` : `${r} ÷ ${p} = ?`)]
  const value = F(byQ ? p : q)
  return ans(K3, 'frac-calc', d, `frommul-${p}-${q}-${byQ ? 'q' : 'p'}`, stem, value, [F(byQ ? q : p), F(r), inv(value)], rng)
}
/** 判断：2/5 ÷ 2/3 = 5/2 × 2/3 对吗（乘倒数、没取倒数、颠倒了被除数、两个都颠倒） */
function qTfDiv(d: Difficulty, rng: RNG): Question {
  const [x, c] = rng.chance(0.5) ? rng.pick([['2/5', '2/3'], ['160', '4/5'], ['24', '8/9']] as [string, string][]) : randomFracFrac(rng)
  const X = F(x)
  const Y = F(c)
  const forms: [string, string, boolean][] = [
    ['recip', `${x} × ${fs(inv(Y))}`, true],
    ['self', `${x} × ${c}`, false],
    ['flipx', `${fs(inv(X))} × ${c}`, false],
    ['both', `${fs(inv(X))} × ${fs(inv(Y))}`, false],
  ]
  const [tag, rhs] = rng.pick(forms)
  return tf(K3, 'frac-calc', d, `tf-${x}-${c}-${tag}`, [T('judge'), E(`${x} ÷ ${c} = ${rhs}`)], same(evalF(rhs), dv(X, Y)), rng)
}
/** 哪个算式和 160 ÷ 4/5 的结果一样 */
function qSameDiv(d: Difficulty, rng: RNG): Question {
  const [n, c] = rng.chance(0.5) ? INT_BOOK[0]! : randomIntDiv(rng)
  const [p, q] = F(c)
  return exprQ(K3, 'frac-calc', d, `same-${n}-${c}`, [T('same', { e: `${n} ÷ ${c}` })], `${n} × ${fs([q, p])}`, [`${n} × ${c}`, `${n} ÷ ${p} ÷ ${q}`, `${fs([q, p])} ÷ ${n}`, `${n} ÷ ${q} × ${p}`], rng)
}
/** 例 2（1）放在情境里（KP4 也有）：160 克牛奶是砂糖的 4/5，砂糖有多少克 */
function qMilkCalc(d: Difficulty, rng: RNG): Question {
  return milkQ(K3, d, rng, 0.6)
}

/** 第 2 档：练习七 2、练习九 2 的一步除法 */
export const EX_DIV: [string, string][] = [
  ['1/4', '3/5'],
  ['3', '1/3'],
  ['5', '5/6'],
  ['5/14', '10/21'],
  ['2/3', '14/27'],
  ['2/7', '16/35'],
  ['8/27', '2/9'],
  ['4/15', '28/45'],
  ['15/22', '10'],
  ['45', '9/14'],
  ['3/5', '1/6'],
  ['2/7', '8/21'],
]
/** 第 2 档：练习七 3、练习九 2 的混合运算；第 3 档：长一点的 */
export const MIX2 = ['2 − 6/13 ÷ 9/26 − 2/3', '8/9 ÷ 4/7 ÷ 1/3', '5/14 ÷ 4/21 × 16/25', '4 ÷ 8/3 − 3/5', '7 − 7/9 ÷ 7/3 − 2/3', '15/16 ÷ 5/8 × 8', '35 ÷ (1 − 2/7)', '21/40 ÷ (1/10 + 3/5)']
export const MIX3 = ['26 ÷ 13/25 ÷ 15/22', '2/9 × 3/8 ÷ 6/7', '3/4 × 5/6 + 3/4 × 1/6', '2 − 6/13 ÷ 9/26 − 2/3', '7 − 7/9 ÷ 7/3 − 2/3']
function qMix(d: Difficulty, rng: RNG, pool: readonly string[]): Question {
  const e = rng.pick(pool)
  const value = evalF(e)
  return ans(K3, 'frac-calc', d, `mix-${e}`, [T('calc'), E(`${e} = ?`)], value, [evalF(e, { lr: true }), evalF(e, { flip: true })], rng)
}
/** 练习七 4：3/4 升橙汁装进容积 1/8 升的小瓶，能装满几瓶 */
export const BOTTLE: [string, string][] = [
  ['3/4', '1/8'],
  ['5/6', '1/12'],
  ['2/3', '1/6'],
  ['9/10', '3/10'],
  ['4/5', '1/10'],
]
function qBottle(d: Difficulty, rng: RNG): Question {
  const [a, b] = bookOr(rng, 0.4, [BOTTLE[0]!], BOTTLE.slice(1))
  return intQ(K3, 'frac-calc', d, `bottle-${a}-${b}`, [T('df.bottle', { a, b })], dv(F(a), F(b))[0], rng)
}
/** 练习七 5：电影每 1/24 秒播放一张照片，半秒、1 分钟各放多少张 */
function qFilm(d: Difficulty, rng: RNG): Question {
  const t = bookOr(rng, 0.6, ['1/24'], ['1/30', '1/60'])
  const half = rng.chance(0.5)
  const value = half ? dv([1, 2], F(t))[0] : dv([60, 1], F(t))[0]
  return intQ(K3, 'frac-calc', d, `film-${t}-${half ? 'half' : 'min'}`, [T(half ? 'df.film.half' : 'df.film.min', { t })], value, rng)
}
/** 练习七 10：按步骤 ÷ 2/3 ÷ 3/4 × 1/2，最后的数和开始的数一样 */
function qChain(d: Difficulty, rng: RNG): Question {
  const x = rng.chance(0.6) ? rng.pick(['7/15', '16/19']) : randomFracFrac(rng)[0]
  const X = F(x)
  return ans(K3, 'frac-calc', d, `chain-${x}`, [T('calc'), E(`${x} ÷ 2/3 ÷ 3/4 × 1/2 = ?`)], X, [mul(X, [1, 4]), mul(X, [4, 1]), mul(X, [2, 1])], rng)
}
/** 练习九 8 的数字版：3/4 × 5/2 ○ 3/4 ÷ 5/2 */
function qCmpMulDiv(d: Difficulty, rng: RNG): Question {
  const x = rng.chance(0.5) ? '3/4' : rng.pick(['2/3', '5/6', '4/5', '6'])
  const y = rng.pick(['5/2', '2/5', '4/3', '3/4', '1', '7/2', '2/7'])
  return cmpQ(K3, 'compare', d, `cmpmd-${x}-${y}`, T('cmp'), `${x} × ${y}`, `${x} ÷ ${y}`, mul(F(x), F(y)), dv(F(x), F(y)), rng)
}
/** 第 2 档：商和被除数的规律（判断） */
function qTfRule(d: Difficulty, rng: RNG): Question {
  const small = rng.chance(0.5)
  return tf(K3, 'frac-calc', d, small ? 'tfrule-small' : 'tfrule-big', [T(small ? 'df.tf.small' : 'df.tf.big')], small, rng)
}

function divFracGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2（1）（2）的算法、两种方法的联系、法则、▲ 推理、做一做 1–3、练习七 1、判断
    if (roll < 0.12) return qIntDiv(d, rng)
    if (roll < 0.18) return qMilkCalc(d, rng)
    if (roll < 0.26) return qStep(d, rng)
    if (roll < 0.34) return qAsMul(d, rng)
    if (roll < 0.39) return qLink(d, rng)
    if (roll < 0.55) return qCalcDiv(d, rng)
    if (roll < 0.61) return qSplit(d, rng)
    if (roll < 0.65) return qRuleDiv(d, rng)
    if (roll < 0.77) return qCmpDiv(d, rng)
    if (roll < 0.83) return qInverse(d, rng)
    if (roll < 0.89) return qFromMul(d, rng)
    if (roll < 0.95) return qTfDiv(d, rng)
    return qSameDiv(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return qCalcDiv(d, rng, EX_DIV)
    if (roll < 0.4) return qMix(d, rng, MIX2)
    if (roll < 0.52) return qBottle(d, rng)
    if (roll < 0.64) return qFilm(d, rng)
    if (roll < 0.74) return qChain(d, rng)
    if (roll < 0.86) return qCmpMulDiv(d, rng)
    return qTfRule(d, rng)
  }
  if (roll < 0.6) return qMix(d, rng, MIX3)
  return qChain(d, rng)
}
defineGenerator(K3, divFracGen)

// ══ 已知一个数的几分之几，求这个数（m6s1-03-find-whole：例 2 的数量关系、整理和复习、练习七、九）══

/** 例 2（1）牛奶 160 克是砂糖的 4/5（[牛奶, 分子, 分母]），换数时砂糖都是整数克 */
export const MILK: [number, number, number][] = [
  [160, 4, 5],
  [24, 2, 3],
  [30, 3, 5],
  [45, 3, 4],
  [42, 6, 7],
  [28, 7, 10],
  [60, 5, 6],
  [90, 3, 4],
  [120, 4, 5],
  [150, 5, 8],
]
/** 例 2（2）鸡蛋 2/5 千克是面粉的 2/3（[鸡蛋, 分数]），面粉是分数 */
export const EGG: [string, string][] = [
  ['2/5', '2/3'],
  ['3/8', '3/4'],
  ['4/9', '2/3'],
  ['3/4', '3/5'],
  ['5/6', '5/8'],
  ['1/4', '1/2'],
]
/** 例 2 的两条线段图：砂糖 b 段、牛奶 a 段（每段一样长）；mode：whole 问砂糖、part 问 1 份、flip 问砂糖是牛奶的几分之几 */
function milkBars(a: number, b: number, y: number, mode: 'whole' | 'part' | 'flip'): StemPart {
  const sugar: BarRow = { name: L('fw.n.sugar'), len: b, ...(mode === 'part' ? {} : { braces: [{ from: 0, to: b, side: 'bottom', label: '?' }] }) }
  const milk: BarRow = {
    name: L('fw.n.milk'),
    len: a,
    braces:
      mode === 'flip'
        ? [{ from: 0, to: a, side: 'bottom', label: fr(a, b) }]
        : mode === 'part'
          ? [
              { from: 0, to: 1, side: 'top', label: '?' },
              { from: 0, to: a, side: 'bottom', label: String(y) },
            ]
          : [{ from: 0, to: a, side: 'bottom', label: String(y) }],
  }
  return { kind: 'frac-bars', unit: b, rows: [sugar, milk] }
}
/** 已知部分求整体算错的样子：用了乘法、只求了 1 份、乘了分母忘了除以分子、颠倒 */
const wholeCands = (y: Frac, f: Frac): Frac[] => [mul(y, f), dv(y, [f[0], 1]), mul(y, [f[1], 1]), dv(f, y)]

/** 部分是整体的 a/b、整体 w、部分 part 时，求部分 / 求整体算错的样子（乘除用反、只求了 1 份、另一部分、乘了分母） */
const partWrongs = (w: number, part: number, a: number, b: number): number[] => [w / b, w - part, (w * b) / a, w]
const wholeWrongs = (w: number, part: number, a: number, b: number): number[] => [(part * a) / b, part / a, part * b, w / b]

/** 例 2（1）：牛奶 160 克，是砂糖的 4/5，砂糖有多少克（KP3 也用；带线段图，选项卡） */
function milkQ(kpId: string, d: Difficulty, rng: RNG, pBook: number): Question {
  const [y, a, b] = bookOr(rng, pBook, [MILK[0]!], MILK.slice(1))
  const f = fr(a, b)
  const sugar = (y * b) / a
  return intPick(kpId, kpId === K3 ? 'frac-calc' : 'quantity', d, `milk-${y}-${f}`, [T('fw.milk', { y, f }), milkBars(a, b, y, 'whole')], sugar, wholeWrongs(sugar, y, a, b), rng)
}
/** 例 2（2）：鸡蛋 2/5 千克，是面粉的 2/3，面粉有多少千克 */
function qEgg(d: Difficulty, rng: RNG, pBook = 0.5): Question {
  const [x, f] = bookOr(rng, pBook, [EGG[0]!], EGG.slice(1))
  return ans(K4, 'quantity', d, `egg-${x}-${f}`, [T('fw.egg', { x, f })], dv(F(x), F(f)), wholeCands(F(x), F(f)), rng)
}
/** 例 2 方法一「先求出 1 份」：砂糖平均分成 5 份，1 份是多少克；面粉平均分成 3 份，1 份是多少千克 */
function qOnePart(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) {
    const [y, a, b] = bookOr(rng, 0.5, [MILK[0]!], MILK.slice(1))
    const f = fr(a, b)
    return intPick(K4, 'quantity', d, `mpart-${y}-${f}`, [T('fw.milkPart', { y, f, b }), milkBars(a, b, y, 'part')], y / a, [y / b, (y * b) / a, y], rng)
  }
  const [x, f] = bookOr(rng, 0.5, [EGG[0]!], EGG.slice(1))
  const [c, dd] = F(f)
  return ans(K4, 'quantity', d, `epart-${x}-${f}`, [T('fw.eggPart', { x, f, d: dd })], dv(F(x), [c, 1]), [F(x), dv(F(x), [dd, 1]), dv(F(x), F(f))], rng)
}
/** 例 2 方法二：牛奶是砂糖的 4/5，砂糖就是牛奶的 5/4 */
function qFlip(d: Difficulty, rng: RNG): Question {
  const f = bookOr(rng, 0.45, ['4/5'], ['2/3', '3/4', '5/6', '3/5', '5/8', '7/10'])
  const [a, b] = F(f)
  return ans(K4, 'quantity', d, `flip-${f}`, [T('fw.flip', { f }), milkBars(a, b, 0, 'flip')], [b, a], [[a, b], [b - a, b], [b - a, a], [1, a]], rng)
}
/** 例 2 的「因为……所以……」：求砂糖怎样列式 */
function qExprWhole(d: Difficulty, rng: RNG): Question {
  const [y, a, b] = bookOr(rng, 0.5, [MILK[0]!], MILK.slice(1))
  const f = fr(a, b)
  return exprQ(K4, 'quantity', d, `expr-${y}-${f}`, [T('fw.expr', { y, f })], `${y} ÷ ${f}`, [`${y} × ${f}`, `${f} ÷ ${y}`, `${y} ÷ ${a}`, `${y} × ${b}`], rng)
}
/** 整理和复习：18 的 2/3（乘）与一个数的 2/3 是 12（除），都配线段图 */
function qOfWhole(d: Difficulty, rng: RNG): Question {
  const book = rng.chance(0.45)
  const b = book ? 3 : rng.int(3, 6)
  const a = book ? 2 : rng.pick(range(b - 1, 1).filter((k) => gcd(k, b) === 1))
  const w = book ? 18 : b * rng.int(2, 10)
  const part = (w / b) * a
  if (rng.chance(0.5)) {
    const braces: SegBrace[] = [
      { from: 0, to: b, side: 'top', label: String(w) },
      { from: 0, to: a, side: 'bottom', label: '?' },
    ]
    return intPick(K4, 'quantity', d, `of-${w}-${fr(a, b)}`, [T('fw.of', { w, f: fr(a, b) }), { kind: 'seg-braces', parts: b, braces }], part, partWrongs(w, part, a, b), rng)
  }
  const braces: SegBrace[] = [
    { from: 0, to: a, side: 'top', label: String(part) },
    { from: 0, to: b, side: 'bottom', label: '?' },
  ]
  return intPick(K4, 'quantity', d, `whole-${part}-${fr(a, b)}`, [T('fw.whole', { f: fr(a, b), y: part }), { kind: 'seg-braces', parts: b, braces }], w, wholeWrongs(w, part, a, b), rng)
}
/** 整理和复习：用乘法还是除法 */
function qMethod(d: Difficulty, rng: RNG): Question {
  const div = rng.chance(0.55)
  const words = [L('w.div'), L('w.mul'), L('w.add')]
  return pickQ(K4, 'quantity', d, div ? 'method-div' : 'method-mul', [T(div ? 'fw.method.div' : 'fw.method.mul')], words[div ? 0 : 1]!, [words[div ? 1 : 0]!, words[2]!], rng)
}
/** 练习九 1：看图列式（整条 24，前 3 段是问号；前 3 段是 18，整条是问号） */
function qLook(d: Difficulty, rng: RNG): Question {
  const book = rng.chance(0.45)
  const b = book ? 4 : rng.int(3, 6)
  const a = book ? 3 : rng.pick(range(b - 1, 1).filter((k) => gcd(k, b) === 1))
  const w = book ? 24 : b * rng.int(2, 10)
  const part = (w / b) * a
  const findPart = rng.chance(0.5)
  const braces: SegBrace[] = findPart
    ? [
        { from: 0, to: a, side: 'top', label: '?' },
        { from: 0, to: b, side: 'bottom', label: String(w) },
      ]
    : [
        { from: 0, to: a, side: 'top', label: String(part) },
        { from: 0, to: b, side: 'bottom', label: '?' },
      ]
  const stem: StemPart[] = [T('fw.look'), { kind: 'seg-braces', parts: b, braces }]
  const sig = `look-${findPart ? 'part' : 'whole'}-${w}-${fr(a, b)}`
  return intPick(K4, 'quantity', d, sig, stem, findPart ? part : w, findPart ? partWrongs(w, part, a, b) : wholeWrongs(w, part, a, b), rng)
}
/** 练习九 3：读了 35 页，占全书的 5/7 */
export const BOOK: [number, number, number][] = [
  [35, 5, 7],
  [24, 3, 8],
  [45, 3, 5],
  [30, 3, 10],
  [40, 2, 7],
]
function qBook(d: Difficulty, rng: RNG): Question {
  const [y, a, b] = bookOr(rng, 0.5, [BOOK[0]!], BOOK.slice(1))
  return intQ(K4, 'quantity', d, `book-${y}-${fr(a, b)}`, [T('fw.book', { y, f: fr(a, b) })], (y * b) / a, rng)
}
/** 练习七 6：神舟十号约 15 天，是神舟十三号的 5/61 → 183 天 */
const qShip = (d: Difficulty, rng: RNG): Question => intQ(K4, 'quantity', d, 'ship', [T('fw.ship')], 183, rng)
/** 练习七 7：东西约 5200 千米，是南北的 52/55 → 5500 千米 */
const qLand = (d: Difficulty, rng: RNG): Question => intQ(K4, 'quantity', d, 'land', [T('fw.land')], 5500, rng)
/** 练习九 7（1）（2）：大齿轮 140 个齿、小齿轮是它的 1/5（乘）；小齿轮 28 个齿、是大齿轮的 1/5（除） */
export const GEAR: [number, number, number][] = [
  [140, 1, 5],
  [120, 1, 4],
  [90, 1, 3],
  [100, 2, 5],
  [60, 3, 4],
  [72, 5, 6],
]
function qGear(d: Difficulty, rng: RNG): Question {
  const [big, a, b] = bookOr(rng, 0.5, [GEAR[0]!], GEAR.slice(1))
  const small = (big * a) / b
  const f = fr(a, b)
  if (rng.chance(0.5)) return intQ(K4, 'quantity', d, `gears-${big}-${f}`, [T('fw.gear.small', { big, f })], small, rng)
  return intQ(K4, 'quantity', d, `gearb-${small}-${f}`, [T('fw.gear.big', { small, f })], big, rng)
}
/** 第 2 档：练习九 7（3）小齿轮每分钟转 400 周，大齿轮比它少 4/5 */
export const TURN: [number, string][] = [
  [400, '4/5'],
  [300, '2/3'],
  [360, '3/4'],
  [500, '3/5'],
]
function qTurn(d: Difficulty, rng: RNG): Question {
  const [r, f] = bookOr(rng, 0.5, [TURN[0]!], TURN.slice(1))
  return intQ(K4, 'quantity', d, `turn-${r}-${f}`, [T('fw.gear.turn', { r, f })], mul([r, 1], sub(ONE, F(f)))[0], rng)
}
/** 第 2 档：练习九 9 夏至黑夜是白天的 3/5（一天 24 小时）；冬至黑夜比白天多 */
export const SUN: ['summer' | 'winter', string][] = [
  ['summer', '3/5'],
  ['summer', '5/7'],
  ['summer', '1/2'],
  ['winter', '7/5'],
  ['winter', '5/3'],
]
function qSun(d: Difficulty, rng: RNG): Question {
  const [when, f] = bookOr(rng, 0.5, [SUN[0]!], SUN.slice(1))
  const day = dv([24, 1], add(ONE, F(f)))[0]
  const askDay = rng.chance(0.5)
  return intQ(K4, 'quantity', d, `sun-${when}-${f}-${askDay ? 'day' : 'night'}`, [T(askDay ? 'fw.day.sun' : 'fw.day.night', { when: L(`fw.${when}`), f })], askDay ? day : 24 - day, rng)
}
/** 第 2 档：练习七 9 楼高 50 米、共 15 层，七楼的地板离地面多少米（下面只有 6 层） */
export const FLOOR: [number, number, number][] = [
  [15, 50, 7],
  [15, 50, 4],
  [12, 40, 4],
  [12, 40, 7],
  [21, 70, 4],
  [9, 30, 7],
  [15, 50, 10],
]
function qFloor(d: Difficulty, rng: RNG): Question {
  const [n, h, k] = bookOr(rng, 0.5, [FLOOR[0]!], FLOOR.slice(1))
  return intQ(K4, 'quantity', d, `floor-${n}-${h}-${k}`, [T('fw.floor', { n, h, fl: L(`fw.fl.${k}`) })], (h * (k - 1)) / n, rng)
}
/** 第 2 档：把谁看作整体“1” */
function qUnit1(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(['4/5', '2/3', '3/4', '5/6'])
  return pickQ(K4, 'quantity', d, `unit1-${f}`, [T('fw.unit1', { f })], L('fw.n.sugar'), [L('fw.n.milk')], rng)
}
/** 第 3 档：比原来多 / 少几分之几，求原来（新教材没有这种例题） */
export const MORE: [number, string, boolean][] = [
  [50, '1/4', true],
  [60, '1/5', true],
  [35, '2/5', true],
  [28, '3/4', true],
  [30, '1/4', false],
  [36, '2/5', false],
  [45, '1/10', false],
]
function qMore(d: Difficulty, rng: RNG): Question {
  const [y, f, more] = rng.pick(MORE)
  const value = dv([y, 1], more ? add(ONE, F(f)) : sub(ONE, F(f)))[0]
  return intQ(K4, 'quantity', d, `${more ? 'more' : 'less'}-${y}-${f}`, [T(more ? 'fw.more' : 'fw.less', { y, f })], value, rng)
}

function findWholeGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2（1）（2）、两种方法、列式、整理和复习、练习九 1、3、7（1）（2）、练习七 6、7
    if (roll < 0.12) return milkQ(K4, d, rng, 0.5)
    if (roll < 0.22) return qEgg(d, rng)
    if (roll < 0.3) return qOnePart(d, rng)
    if (roll < 0.37) return qFlip(d, rng)
    if (roll < 0.44) return qExprWhole(d, rng)
    if (roll < 0.59) return qOfWhole(d, rng)
    if (roll < 0.64) return qMethod(d, rng)
    if (roll < 0.72) return qLook(d, rng)
    if (roll < 0.8) return qBook(d, rng)
    if (roll < 0.84) return qShip(d, rng)
    if (roll < 0.88) return qLand(d, rng)
    return qGear(d, rng)
  }
  if (d === 2) {
    if (roll < 0.15) return qTurn(d, rng)
    if (roll < 0.35) return qSun(d, rng)
    if (roll < 0.55) return qFloor(d, rng)
    if (roll < 0.65) return qUnit1(d, rng)
    if (roll < 0.8) return qEgg(d, rng, 0)
    if (roll < 0.9) return milkQ(K4, d, rng, 0)
    return qBook(d, rng)
  }
  if (roll < 0.6) return qMore(d, rng)
  if (roll < 0.8) return qFloor(d, rng)
  return qSun(d, rng)
}
defineGenerator(K4, findWholeGen)

// ══ 把整体看作1（m6s1-03-as-one：例 3 栈道、做一做、练习八、练习九 4、6）══

/** 合作完成的时间是整数的一对（单独做要 x、y 天 / 小时 / 次）：xy / (x + y) 是整数 */
export const INT_PAIRS: [number, number][] = [
  [3, 6],
  [6, 3],
  [4, 12],
  [12, 4],
  [6, 12],
  [12, 6],
  [10, 15],
  [15, 10],
  [12, 24],
  [20, 30],
  [9, 18],
  [8, 24],
  [5, 20],
  [6, 30],
  [10, 40],
  [12, 36],
  [14, 35],
  [15, 30],
  [21, 28],
  [18, 36],
]
/** 合作时间不是整数的一对（第 2 档） */
export const FRAC_PAIRS: [number, number][] = [
  [2, 3],
  [4, 6],
  [8, 10],
  [12, 10],
  [3, 4],
  [5, 6],
  [6, 8],
]
const together = (x: number, y: number): Frac => red([x * y, x + y])
/** 合作时间算错的样子：时间相加、时间的平均数、把每天合做的几分之几当答案、时间的差 */
const togetherCands = (x: number, y: number): Frac[] => [[x + y, 1], [x + y, 2], add([1, x], [1, y]), [Math.abs(x - y), 1]]
const unit = (x: number): string => `1/${x}`

/** 例 3：甲队每天修 1/12，乙队每天修 1/18，合修几天（课本答案 7.2 天，选项）；换数用整数结果的一对 */
function qRoad(d: Difficulty, rng: RNG, pool: readonly [number, number][] = INT_PAIRS): Question {
  if (pool === INT_PAIRS && rng.chance(0.4)) {
    return pickQ(K5, 'quantity', d, 'road-12-18', [T('as.road', { p: '1/12', q: '1/18' })], '7.2', ['30', '15', '5/36'], rng)
  }
  const [x, y] = rng.pick(pool)
  return ans(K5, 'quantity', d, `road-${x}-${y}`, [T('as.road', { p: unit(x), q: unit(y) })], together(x, y), togetherCands(x, y), rng)
}
/** 例 3：两队合修，每天修这条栈道的几分之几 */
function qRate(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.chance(0.45) ? ([12, 18] as [number, number]) : rng.pick(INT_PAIRS)
  return ans(K5, 'quantity', d, `rate-${x}-${y}`, [T('as.rate', { p: unit(x), q: unit(y) })], add([1, x], [1, y]), [[2, x + y], [1, x + y], [1, x * y], together(x, y)], rng)
}
/** 例 3 的假设法：假设栈道 36 千米，甲、乙、合修每天修几千米，要几天（36 ÷ 5 = 7.2 是选项） */
export const ASSUME: [number, number, number][] = [
  [12, 18, 36],
  [12, 18, 72],
  [10, 15, 30],
  [6, 12, 12],
  [20, 30, 60],
]
function qAssume(d: Difficulty, rng: RNG): Question {
  const [x, y, len] = bookOr(rng, 0.5, [ASSUME[0]!], ASSUME.slice(1))
  const ask = rng.pick(['a', 'b', 'both', 'days'] as const)
  const stem = [T('as.assume', { L: len, p: unit(x), q: unit(y), ask: L(`as.ask.${ask}`) })]
  const sig = `assume-${x}-${y}-${len}-${ask}`
  const a = len / x
  const b = len / y
  if (ask === 'a') return intQ(K5, 'quantity', d, sig, stem, a, rng)
  if (ask === 'b') return intQ(K5, 'quantity', d, sig, stem, b, rng)
  if (ask === 'both') return intQ(K5, 'quantity', d, sig, stem, a + b, rng)
  const days = red([len, a + b])
  if (days[1] === 1) return intQ(K5, 'quantity', d, sig, stem, days[0], rng)
  // 课本：18 ÷ 2.5 = 7.2、36 ÷ 5 = 7.2，天数写小数
  return pickQ(K5, 'quantity', d, sig, stem, decStr(days) ?? fs(days), [String(x + y), String((x + y) / 2), String(a + b)], rng)
}
/** 例 3 回顾反思：不管栈道多长，合修的天数不变（判断） */
function qTfLen(d: Difficulty, rng: RNG): Question {
  const diff = rng.chance(0.5)
  return tf(K5, 'quantity', d, diff ? 'tflen-diff' : 'tflen-same', [T(diff ? 'as.tf.diff' : 'as.tf.same')], !diff, rng)
}
/** 例 3：把全长看作 1，怎样列式 */
function qExprOne(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.chance(0.5) ? ([12, 18] as [number, number]) : rng.pick(INT_PAIRS)
  const p = unit(x)
  const q = unit(y)
  return exprQ(K5, 'quantity', d, `expr-${x}-${y}`, [T('as.expr', { p, q })], `1 ÷ (${p} + ${q})`, [`1 ÷ ${p} + 1 ÷ ${q}`, `${p} + ${q}`, `(${x} + ${y}) ÷ 2`], rng)
}
/** 做一做的第一步：师傅单独做要 3 小时完成，每小时做这批零件的几分之几 */
function qRateOf(d: Difficulty, rng: RNG): Question {
  const x = bookOr(rng, 0.4, [3], [6, 4, 5, 8, 10, 12])
  return ans(K5, 'quantity', d, `rateof-${x}`, [T('as.rateOf', { x })], [1, x], [[x, 1], [1, x + 1], [1, 2 * x]], rng)
}
/** 做一做：师傅 3 小时、徒弟 6 小时，一起做完成这批零件的 3/4 要多少小时 */
export const PART_DO: [number, number, string][] = [
  [3, 6, '3/4'],
  [3, 6, '1/2'],
  [4, 12, '2/3'],
  [6, 12, '3/4'],
  [4, 12, '1/2'],
  [6, 3, '2/3'],
  [10, 15, '1/2'],
  [3, 6, '1/4'],
]
function qPartDo(d: Difficulty, rng: RNG): Question {
  const [x, y, p] = bookOr(rng, 0.45, [PART_DO[0]!], PART_DO.slice(1))
  const t = together(x, y)
  return ans(K5, 'quantity', d, `partdo-${x}-${y}-${p}`, [T('as.partDo', { x, y, p })], mul(F(p), t), [t, mul(F(p), add([1, x], [1, y])), dv(add([1, x], [1, y]), F(p)), [x + y, 1]], rng)
}
/** 做一做变式：两人一起做完全部要几小时 */
function qAllDo(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.chance(0.4) ? ([3, 6] as [number, number]) : rng.pick(INT_PAIRS)
  return intQ(K5, 'quantity', d, `alldo-${x}-${y}`, [T('as.allDo', { x, y })], together(x, y)[0], rng)
}
/** 练习八 1：甲车 2 小时、乙车 3 小时，相对开出几小时相遇（课本 6/5 小时） */
function qMeet(d: Difficulty, rng: RNG, pool: readonly [number, number][] = INT_PAIRS): Question {
  const [x, y] = pool === INT_PAIRS && rng.chance(0.4) ? ([2, 3] as [number, number]) : rng.pick(pool)
  return ans(K5, 'quantity', d, `meet-${x}-${y}`, [T('as.meet', { x, y })], together(x, y), togetherCands(x, y), rng)
}
/** 练习八 2：甲队 12 天、乙队 10 天，合栽 6 天能栽完吗（判断） */
export const CAN: [number, number, number][] = [
  [12, 10, 6],
  [12, 15, 6],
  [10, 15, 5],
  [10, 15, 6],
  [20, 30, 10],
  [20, 30, 12],
  [6, 12, 4],
  [6, 12, 3],
]
function qCan(d: Difficulty, rng: RNG): Question {
  const [x, y, n] = bookOr(rng, 0.4, [CAN[0]!], CAN.slice(1))
  const done = mul(add([1, x], [1, y]), [n, 1])
  return tf(K5, 'quantity', d, `can-${x}-${y}-${n}`, [T('as.can', { x, y, n })], !less(done, ONE), rng)
}
/** 练习九 4：甲车 6 次运完、乙车 3 次运完，一起运几次 */
function qTruck(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.chance(0.4) ? ([6, 3] as [number, number]) : rng.pick(INT_PAIRS)
  return intQ(K5, 'quantity', d, `truck-${x}-${y}`, [T('as.truck', { x, y })], together(x, y)[0], rng)
}
/** 练习八 4：钱正好买 6 支签字笔或 12 支笔芯，一支笔配一支笔芯能买几套 */
function qPen(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.chance(0.4) ? ([6, 12] as [number, number]) : rng.pick(INT_PAIRS.filter(([p, q]) => p < q))
  return intQ(K5, 'quantity', d, `pen-${x}-${y}`, [T('as.pen', { x, y })], together(x, y)[0], rng)
}
/** 练习九 6：单独开甲出口 6 分钟、乙出口 4 分钟走完，两个同时开（课本 12/5 分钟） */
function qExit(d: Difficulty, rng: RNG, pool: readonly [number, number][] = INT_PAIRS): Question {
  const [x, y] = pool === INT_PAIRS && rng.chance(0.4) ? ([6, 4] as [number, number]) : rng.pick(pool)
  return ans(K5, 'quantity', d, `exit-${x}-${y}`, [T('as.exit', { x, y })], together(x, y), togetherCands(x, y), rng)
}
/** 第 2 档：练习八 3 一起做 3 小时后剩下 100 个，一共多少个 */
export const LEFT: [number, number, number, number][] = [
  [5, 9, 3, 100],
  [6, 12, 2, 50],
  [4, 12, 2, 60],
  [10, 15, 4, 40],
  [6, 9, 2, 20],
]
function qLeft(d: Difficulty, rng: RNG): Question {
  const [x, y, t, r] = bookOr(rng, 0.5, [LEFT[0]!], LEFT.slice(1))
  const rest = sub(ONE, mul(add([1, x], [1, y]), [t, 1]))
  return intQ(K5, 'quantity', d, `left-${x}-${y}-${t}-${r}`, [T('as.left', { x, y, t, r })], dv([r, 1], rest)[0], rng)
}
/** 第 2 档：练习八 5（1）小明 8 分钟、爷爷 10 分钟一圈，朝相反的方向走，几分钟第一次相遇（课本 40/9 分钟） */
function qWalk(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.chance(0.5) ? ([8, 10] as [number, number]) : rng.pick(INT_PAIRS.filter(([p, q]) => p < q))
  return ans(K5, 'quantity', d, `walk-${x}-${y}`, [T('as.walk', { x, y })], together(x, y), togetherCands(x, y), rng)
}
/** 第 3 档：练习八 5（2）朝同一个方向走，几分钟后小明比爷爷多走一整圈（1 ÷ (1/8 − 1/10) = 40） */
export const LAP: [number, number][] = [
  [8, 10],
  [6, 8],
  [10, 12],
  [4, 6],
  [5, 6],
  [12, 15],
]
function qLap(d: Difficulty, rng: RNG): Question {
  const [x, y] = bookOr(rng, 0.5, [LAP[0]!], LAP.slice(1))
  return intQ(K5, 'quantity', d, `lap-${x}-${y}`, [T('as.lap', { x, y })], dv(ONE, sub([1, x], [1, y]))[0], rng)
}

function asOneGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 3（合修天数、每天合修几分之几、假设法、回顾反思、列式）、做一做、练习八 1、2、4，练习九 4、6
    if (roll < 0.12) return qRoad(d, rng)
    if (roll < 0.19) return qRate(d, rng)
    if (roll < 0.29) return qAssume(d, rng)
    if (roll < 0.34) return qTfLen(d, rng)
    if (roll < 0.41) return qExprOne(d, rng)
    if (roll < 0.47) return qRateOf(d, rng)
    if (roll < 0.56) return qPartDo(d, rng)
    if (roll < 0.62) return qAllDo(d, rng)
    if (roll < 0.7) return qMeet(d, rng)
    if (roll < 0.77) return qCan(d, rng)
    if (roll < 0.84) return qTruck(d, rng)
    if (roll < 0.91) return qPen(d, rng)
    return qExit(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return qLeft(d, rng)
    if (roll < 0.4) return qWalk(d, rng)
    if (roll < 0.55) return qRoad(d, rng, FRAC_PAIRS)
    if (roll < 0.7) return qMeet(d, rng, FRAC_PAIRS)
    if (roll < 0.85) return qExit(d, rng, FRAC_PAIRS)
    return qPartDo(d, rng)
  }
  if (roll < 0.5) return qLap(d, rng)
  if (roll < 0.75) return qLeft(d, rng)
  return qWalk(d, rng)
}
defineGenerator(K5, asOneGen)
