import type { Difficulty, LStr, PartSeg, Question, QuestionType, RatioRow, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 五上「二 小数乘法」（2022 版课标新教材，课本 p7–23；五年级数学 B）：七个知识点。
// 小数乘整数（例 1 风筝 9.5 × 3、例 2 0.72 × 60、做一做）；小数乘小数（例 3 试验田 4.2 × 0.8、试一试 1.92 × 0.9 / 2.79 × 0.32、
// 例 4 0.56 × 0.04 补 0、两个做一做）；积的近似数（例 4 的做一做 2 嗅觉细胞、练习二 6、11，练习三 4）；小数倍（例 5 花生 0.8 倍 / 1.2 倍、
// 积与乘数大小的规律、做一做彩带与比大小）；整数乘法运算律推广到小数（三组算式、例 6、做一做）；用估算解决问题（例 7 100 元购物、
// 做一做 40 元够吗、练习四 5 满 100 减 5）；分段计费（例 8 出租车、回顾反思的价格表、做一做水费、练习四 9 停车费）。
// 课本叫「乘数」（新教材，不叫因数）。竖式照课本：两个乘数末尾对齐、小数点不占一列，整数乘数末尾的 0 写在外面（dec-mul）。
// G14：小数的答案一律是选项卡（数字键盘只出整数），干扰项照课本暴露的错法造——小数点点错一位（只数了一个乘数的小数位数、
// 把乘数末尾写在外面的 0 当成小数位）、先划掉积末尾的 0 再数位数（0.45 × 0.6 写成 0.027）、位数不够没在前面补 0（0.0224 写成 0.224）、
// 整数部分和小数部分分开乘再拼起来（9.5 × 3 写成 27.15）、第二次乘得的数没有左移、末位算错；只考数值的题选项里没有等值的两种写法，
// 保留两位小数这种考写法的题才用 0.40 / 0.4 区分。小数从课本的数里取（每个不同的小数都是一条朗读音频）。
// 数在程序里一律用「去掉小数点的整数 + 小数位数」算，免得浮点误差。
// 朗读：「长」只在「长度」「长方形」里（试验田写「长度是 4.2 米」、思考题写「原来的长度」、港珠澳大桥写「长度」，长颈鹿换成「一棵树」）；
// 「还买了」写「又买了」、「应付」写「要付」、「约为 / 改为」写「约是 / 改成」、「测得」「量得」「山顶处」不写；「五（1）班」写「一班」；
// 数字后面不跟「只」（「一只梅花鹿」写「一头」）；题干单位一律写汉字（米、千米、千克、吨、平方米、摄氏度），图里可以写字母单位。
// 课本没出、不判分的不出：说一说、调查单价、自己提问题、用计算器；停车场「消费满 200 元免费停车 1 小时」两种理解都说得通，不出。
// ─────────────────────────────────────────────────────────────

export const K_INT = 'm5s1-02-dec-int'
export const K_DEC = 'm5s1-02-dec-dec'
export const K_APX = 'm5s1-02-approx'
export const K_TIMES = 'm5s1-02-times'
export const K_LAWS = 'm5s1-02-laws'
export const K_EST = 'm5s1-02-estimate'
export const K_TIER = 'm5s1-02-tiered'

type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k: `m5.dmul.${k}`, p } : { k: `m5.dmul.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })
const YES = L('yes')
const NO = L('no')

// ══ 小数的算法：去掉小数点的整数 n + 小数位数 p（值 = n ÷ 10^p）══

export interface Dec {
  n: number
  p: number
}
export function parseDec(s: string): Dec {
  const [i = '0', f = ''] = s.split('.')
  return { n: Number(i + f), p: f.length }
}
/** 写成小数，末尾的 0 去掉（课本：小数末尾的 0 可以去掉）：fmtDec(4320, 2) → '43.2'；p 是负数时是整数乘 10 的几次方 */
export function fmtDec(n: number, p: number): string {
  if (n === 0) return '0'
  let m = n
  let q = p
  while (q > 0 && m % 10 === 0) {
    m /= 10
    q--
  }
  if (q <= 0) return String(m * 10 ** -q)
  const s = String(m).padStart(q + 1, '0')
  return `${s.slice(0, -q)}.${s.slice(-q)}`
}
/** 写成小数，保留末尾的 0（竖式里的积、保留两位小数的近似数）：rawDec(4320, 2) → '43.20' */
export function rawDec(n: number, p: number): string {
  if (p <= 0) return String(n * 10 ** -p)
  const s = String(n).padStart(p + 1, '0')
  return `${s.slice(0, -p)}.${s.slice(-p)}`
}
/** 化简（去掉末尾的 0） */
export const canon = (s: string): string => {
  const d = parseDec(s)
  return fmtDec(d.n, d.p)
}
export const places = (s: string): number => (s.split('.')[1] ?? '').length
export function mulDec(a: string, b: string): string {
  const x = parseDec(a)
  const y = parseDec(b)
  return fmtDec(x.n * y.n, x.p + y.p)
}
/** 两个小数通分到一样多位小数 */
function align(a: string, b: string): [number, number, number] {
  const x = parseDec(a)
  const y = parseDec(b)
  const p = Math.max(x.p, y.p)
  return [x.n * 10 ** (p - x.p), y.n * 10 ** (p - y.p), p]
}
export function addDec(a: string, b: string): string {
  const [x, y, p] = align(a, b)
  return fmtDec(x + y, p)
}
export function subDec(a: string, b: string): string {
  const [x, y, p] = align(a, b)
  return fmtDec(x - y, p)
}
export function cmpDec(a: string, b: string): number {
  const [x, y] = align(a, b)
  return Math.sign(x - y)
}
/** 按「四舍五入」法保留 k 位小数（k = 0 是保留整数），末尾的 0 照写：roundDec('0.3978', 2) → '0.40' */
export function roundDec(s: string, k: number): string {
  const { n, p } = parseDec(s)
  if (p <= k) return rawDec(n * 10 ** (k - p), k)
  const f = 10 ** (p - k)
  return rawDec(Math.floor(n / f) + ((n % f) * 2 >= f ? 1 : 0), k)
}
/** 直接截掉（不四舍五入）：truncDec('1.68', 1) → '1.6' */
export function truncDec(s: string, k: number): string {
  const { n, p } = parseDec(s)
  if (p <= k) return rawDec(n * 10 ** (k - p), k)
  return rawDec(Math.floor(n / 10 ** (p - k)), k)
}
/** 往大取整（不足 1 按 1 计算）：ceilDec('6.3') → 7 */
export function ceilDec(s: string): number {
  const { n, p } = parseDec(s)
  return Math.ceil(n / 10 ** p)
}
/** 乘积按整数乘法算出的数字（不点小数点，竖式里横线下的数）：0.56 × 0.04 → '224' */
export const productDigits = (a: string, b: string): string => String(parseDec(a).n * parseDec(b).n)
/** 末尾有几个 0 */
function zerosOf(n: number): number {
  let z = 0
  for (let m = n; m > 0 && m % 10 === 0; m /= 10) z++
  return z
}

/**
 * 乘法的常见错法（按课本暴露的顺序）：只数了一个乘数的小数位数、先划掉积末尾的 0 再数位数、小数点错一位（多数 / 少数一位，
 * 也是「位数不够没补 0」「把整数乘数末尾的 0 当成小数位」的样子）、第二次乘得的数没有左移、末位算错（±1）。
 */
export function mulWrongs(a: string, b: string): string[] {
  const A = parseDec(a)
  const B = parseDec(b)
  const N = A.n * B.n
  const P = A.p + B.p
  const out: string[] = []
  if (A.p > 0 && B.p > 0) out.push(fmtDec(N, Math.max(A.p, B.p)))
  const z = zerosOf(N)
  if (z > 0 && P > 0) out.push(fmtDec(N / 10 ** z, P))
  out.push(fmtDec(N, P + 1))
  if (P >= 1) out.push(fmtDec(N, P - 1))
  if (B.n >= 10 && B.n <= 99 && B.n % 10 !== 0) out.push(fmtDec(A.n * (B.n % 10) + A.n * Math.floor(B.n / 10), P))
  out.push(fmtDec(N + 10 ** z, P), fmtDec(N - 10 ** z, P))
  return out
}
/** 一位小数乘整数时，整数部分、小数部分分开乘再拼起来（9.5 × 3 → 27 和 15 → 27.15）：小数部分乘得满十才是这种错 */
export function partsWrong(a: string, n: number): string | null {
  const [i = '0', f = ''] = a.split('.')
  if (f.length !== 1 || Number(f) * n < 10) return null
  return `${Number(i) * n}.${Number(f) * n}`
}

/**
 * 干扰项：从错法里按顺序取，值互不相同、不等于正确答案、都是正数；不够用末位 ±1 补；
 * 正确答案是小数时至少留一个和它一样多位小数的（不让孩子从写法上认出答案）。
 */
export function pickWrongs(correct: string, cands: (string | null)[], count = 3): string[] {
  const c = canon(correct)
  const seen = new Set([c])
  const out: string[] = []
  const take = (s: string): void => {
    if (out.length >= count || !/^\d+(\.\d+)?$/.test(s)) return
    const k = canon(s)
    if (seen.has(k) || cmpDec(k, '0') <= 0) return
    seen.add(k)
    out.push(k)
  }
  for (const s of cands) if (s) take(s)
  const { n, p } = parseDec(c)
  const near = [1, -1, 2, -2, 3, -3].map((d) => fmtDec(n + d, p))
  for (const s of near) take(s)
  const pc = places(c)
  if (pc > 0 && !out.some((s) => places(s) === pc)) {
    const same = near.find((s) => !seen.has(s) && places(s) === pc && cmpDec(s, '0') > 0)
    if (same) out[out.length - 1] = same
  }
  return out
}

/** 一道得数题：得数是整数用数字键盘（或整数选项），是小数用选项卡（G14） */
function ansQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: string, cands: (string | null)[], rng: RNG, type: QuestionType = 'dec-calc'): Question {
  const c = canon(correct)
  if (!c.includes('.')) {
    const v = Number(c)
    const smart = cands.filter((s): s is string => !!s && /^\d+$/.test(canon(s))).map((s) => Number(canon(s)))
    return numberQuestion({ kpId, type, difficulty: d, sig, stem, value: v, rng, min: 0, max: Math.max(99, v * 20), smart })
  }
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: c, distractors: pickWrongs(c, cands), rng })
}
/** 只用数字键盘的整数题（「乘几得 192」「一共有几位小数」） */
function numQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[] = [], type: QuestionType = 'dec-calc', pad = false): Question {
  const input = pad ? { input: 'numpad' as const } : {}
  return numberQuestion({ kpId, type, difficulty: d, sig, stem, value, rng, min: 0, max: Math.max(99, value * 20), smart: smart.filter((x) => x !== value && x >= 0 && Number.isInteger(x)), ...input })
}
/** 词条选项的选择题 */
function keyQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, wrongs: LStr[], rng: RNG, type: QuestionType = 'dec-calc'): Question {
  const key = JSON.stringify(correct)
  const ds: LStr[] = []
  for (const w of wrongs) if (JSON.stringify(w) !== key && !ds.some((x) => JSON.stringify(x) === JSON.stringify(w))) ds.push(w)
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: ds.slice(0, 3), rng })
}
/** 判断题：……，对吗？（对 / 不对） */
const tfQ = (kpId: string, d: Difficulty, sig: string, stem: StemPart[], ok: boolean, rng: RNG, type: QuestionType = 'dec-calc'): Question =>
  keyQ(kpId, d, sig, stem, ok ? YES : NO, [ok ? NO : YES], rng, type)
/** 比大小：选项 > < =（课本「比一比，填 >、< 或 =」，○ 读「和」） */
function cmpQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], rel: number, rng: RNG, type: QuestionType): Question {
  const correct = rel > 0 ? '>' : rel < 0 ? '<' : '='
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: ['>', '<', '='].filter((s) => s !== correct), rng })
}

/** 小数乘法竖式：整数乘数末尾的 0 写在外面；product 写好的积（不传画空格子），steps 画两次乘得的数 */
export function decMul(a: string, b: string, product?: string, steps = false): StemPart {
  const zeros = (!a.includes('.') && /0$/.test(a) && a.length > 1) || (!b.includes('.') && /0$/.test(b) && b.length > 1)
  return { kind: 'dec-mul', a, b, ...(zeros ? { zeros: true } : {}), ...(product !== undefined ? { product } : {}), ...(steps ? { steps: true } : {}) }
}
/** 竖式里整数写在下面（25 × 1.06 的竖式写成 1.06 在上、25 在下） */
const vertOf = (a: string, b: string, product?: string, steps = false): StemPart => (!a.includes('.') && b.includes('.') ? decMul(b, a, product, steps) : decMul(a, b, product, steps))
const exprQ = (a: string, b: string): string => `${a} × ${b} = ?`

// ══ 小数乘整数（m5s1-02-dec-int）══

/** 例 1 主题图的风筝（课本的价签）：蝴蝶 9.5 元（例 1）、三角 8.6 元、沙燕 14.2 元（做一做 1）、鱼形 6.8 元（做一做 1：40 元买 7 个够吗） */
export const KITES: { id: string; price: string }[] = [
  { id: 'butterfly', price: '9.5' },
  { id: 'delta', price: '8.6' },
  { id: 'swallow', price: '14.2' },
  { id: 'fish', price: '6.8' },
]
const kiteName = (id: string): LStr => L(`kite.${id}`)
/** 课本的三道：买 3 个蝴蝶风筝、6 个沙燕风筝、7 个鱼形风筝 */
const KITE_BOOK: [string, number][] = [
  ['butterfly', 3],
  ['swallow', 6],
  ['fish', 7],
]
function kitePick(rng: RNG): [{ id: string; price: string }, number] {
  if (rng.chance(0.4)) {
    const [id, n] = rng.pick(KITE_BOOK)
    return [KITES.find((k) => k.id === id)!, n]
  }
  return [rng.pick(KITES), rng.int(2, 9)]
}
/** 例 1、做一做 1：买几个风筝要多少元（下面画几个风筝） */
function qKite(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, n] = kitePick(rng)
  const v = mulDec(k.price, String(n))
  const stem: StemPart[] = [T('kite.buy', { k: kiteName(k.id), p: k.price, n }), { kind: 'objects', icon: '🪁', count: n }]
  return ansQ(kpId, d, `kite-${k.id}-${n}`, stem, v, [partsWrong(k.price, n), ...mulWrongs(k.price, String(n))], rng)
}
/** 做一做 1：40 元买 7 个鱼形风筝够吗（课本 6.8 × 7 = 47.6，不够）；别的风筝、个数、钱数（整十，和总价至少差 1 元） */
function qEnough(kpId: string, d: Difficulty, rng: RNG): Question {
  let k = KITES[3]!
  let n = 7
  let budget = 40
  if (!rng.chance(0.3)) {
    k = rng.pick(KITES)
    n = rng.int(3, 8)
    const total = Number(mulDec(k.price, String(n)))
    const ok = rng.chance(0.5)
    budget = ok ? Math.ceil((total + 1) / 10) * 10 : Math.floor((total - 1) / 10) * 10
    if (budget < 10) budget = Math.ceil((total + 1) / 10) * 10
  }
  const total = mulDec(k.price, String(n))
  const ok = cmpDec(String(budget), total) >= 0
  return keyQ(kpId, d, `enough-${k.id}-${n}-${budget}`, [T('kite.enough', { k: kiteName(k.id), p: k.price, b: budget, n })], L(ok ? 'enough' : 'short'), [L(ok ? 'short' : 'enough')], rng)
}
/**
 * 例 1 小亮的方法（把元化成角）：「9.5 元是多少角」→ 95，「95 角乘 3 是多少角」→ 285，「285 角是多少元」→ 28.5（选项）。
 * 课本只有蝴蝶风筝的 9.5 × 3，其余三个风筝的价钱照样问（个数用课本做一做的 6、7 和例 1 的 3）。
 */
function qJiao(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, n0] = kitePick(rng)
  const n = Math.min(n0, 7)
  const j = parseDec(k.price).n // 9.5 元 = 95 角（价钱都是一位小数）
  const step = rng.pick(['y2j', 'jmul', 'j2y'] as const)
  if (step === 'y2j') return numQ(kpId, d, `jiao-y2j-${k.price}`, [T('jiao.y2j', { p: k.price })], j, rng, [j / 10, j * 100])
  if (step === 'jmul') return numQ(kpId, d, `jiao-mul-${j}-${n}`, [T('jiao.mul', { j, n })], j * n, rng, [j * n * 10, j + n])
  const total = j * n
  return ansQ(kpId, d, `jiao-j2y-${total}`, [T('jiao.j2y', { j: total })], fmtDec(total, 1), [fmtDec(total, 2), String(total), fmtDec(total, 3)], rng)
}
/** 积的变化规律（例 1 男孩、例 2 女孩、做一做 2 成对的竖式、练习二 8 的表）：先给整数乘法的积，再问小数乘法的积 */
export const RULE_INT: [string, string][] = [
  ['9.5', '3'],
  ['0.72', '60'],
  ['0.7', '4'],
  ['1.24', '15'],
  ['14.2', '6'],
]
/** 练习二 8：根据 32 × 15 = 480 补全表（课本的六格） */
export const TABLE_32: [string, string][] = [
  ['320', '15'],
  ['32', '150'],
  ['3.2', '15'],
  ['32', '1.5'],
  ['32', '0.15'],
  ['0.32', '15'],
]
const intOf = (s: string): string => String(parseDec(s).n)
function qRule(kpId: string, d: Difficulty, rng: RNG, [a, b]: [string, string]): Question {
  const A = intOf(a)
  const B = intOf(b)
  const v = mulDec(a, b)
  return ansQ(kpId, d, `rule-${a}x${b}`, [T('rule.q'), E(`${A} × ${B} = ${Number(A) * Number(B)}`), E(exprQ(a, b))], v, mulWrongs(a, b), rng)
}
function qTable(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(TABLE_32)
  const v = mulDec(a, b)
  return ansQ(kpId, d, `t32-${a}x${b}`, [T('t32.q'), E(exprQ(a, b))], v, mulWrongs(a, b), rng)
}
/** 例 2 男孩：0.72 是 72 个 0.01，0.72 × 60 是 4320 个 0.01（一位小数按 0.1 数） */
function qUnits(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(RULE_INT)
  const A = parseDec(a)
  const u = A.p === 1 ? '0.1' : '0.01'
  if (rng.chance(0.5)) return numQ(kpId, d, `units-${a}`, [T('units.one', { a, u })], A.n, rng, [A.n * 10, A.n / 10].filter(Number.isInteger))
  const n = A.n * Number(b)
  return numQ(kpId, d, `units-${a}x${b}`, [T('units.prod', { a, b, u })], n, rng, [n / 10, n * 10, A.n].filter(Number.isInteger))
}
/** 想一想（积的小数点位置怎样确定）：两个乘数一共有几位小数 */
function qPlaces(kpId: string, d: Difficulty, rng: RNG, pool: [string, string][]): Question {
  const [a, b] = rng.pick(pool)
  const n = places(a) + places(b)
  return numQ(kpId, d, `places-${a}x${b}`, [T('places.q', { a, b })], n, rng, [], 'dec-calc', true)
}
/** 用竖式计算（做一做 2 的四个竖式、例 1、例 2，练习二 2、3）：画竖式（得数在选项里） */
export const INT_T1: [string, string][] = [
  ['9.5', '3'],
  ['0.72', '60'],
  ['0.7', '4'],
  ['1.24', '15'],
  ['14.2', '6'],
  ['6.8', '7'],
]
export const INT_T2: [string, string][] = [
  ['12.4', '7'],
  ['2.05', '60'],
  ['3.13', '53'],
  ['0.86', '7'],
  ['12.8', '42'],
  ['0.19', '40'],
  ['25', '1.06'],
  ['27', '0.43'],
  ['3.7', '200'],
  ['2.96', '40'],
]
function qCalc(kpId: string, d: Difficulty, rng: RNG, [a, b]: [string, string], vertical: boolean, tag: string): Question {
  const v = mulDec(a, b)
  const stem: StemPart[] = vertical ? [T('vcalc'), E(exprQ(a, b)), vertOf(a, b)] : [T('calc'), E(exprQ(a, b))]
  // 整数乘数是一位数时才有「整数部分、小数部分分开乘」的错法
  const n = !a.includes('.') ? Number(a) : !b.includes('.') ? Number(b) : 0
  const dec = n ? (a.includes('.') ? a : b) : ''
  return ansQ(kpId, d, `${tag}-${a}x${b}${vertical ? '-v' : ''}`, stem, v, [n > 0 && n < 10 ? partsWrong(dec, n) : null, ...mulWrongs(a, b)], rng)
}
/** 做一做 2 的整数竖式：7 × 4、124 × 15（和 0.7 × 4、1.24 × 15 对照着做），按的数填在竖式横线下 */
function qIntPair(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return numQ(kpId, d, 'ipair-7x4', [T('vcalc'), E('7 × 4 = ?'), { kind: 'vertical', a: 7, op: '×', b: 4 }], 28, rng, [11, 24, 32])
  return numQ(kpId, d, 'ipair-124x15', [T('vcalc'), E('124 × 15 = ?'), { kind: 'mul-vertical', a: 124, b: 15 }], 1860, rng, [744, 1240, 620])
}
/**
 * 给积点上小数点（例 2 的 0.72 × 60 = 43.20、练习二 1 的四个竖式、做一做的 1.24 × 15、练习二 2 的 3.13 × 53）：竖式里积只写数字，
 * 问积是多少——整数用数字键盘（4.6 × 30 的积是 138.0，就是 138），小数用选项。
 */
export const POINT_INT_T1: [string, string][] = [
  ['0.72', '60'],
  ['9.5', '3'],
  ['1.24', '15'],
]
export const POINT_INT_T2: [string, string][] = [
  ['4.6', '3'],
  ['4.6', '30'],
  ['0.46', '30'],
  ['0.46', '300'],
  ['3.13', '53'],
  ['2.05', '60'],
]
function qPoint(kpId: string, d: Difficulty, rng: RNG, [a, b]: [string, string], tag = 'point'): Question {
  const v = mulDec(a, b)
  const digits = productDigits(a, b)
  return ansQ(kpId, d, `${tag}-${a}x${b}`, [T('point.q', { a, b }), vertOf(a, b, digits, true)], v, mulWrongs(a, b), rng)
}
/** 练习二 9：地球直径约 1.28 万千米，月球到地球约是它的 30 倍（38.4 万千米） */
function qMoon(kpId: string, d: Difficulty, rng: RNG): Question {
  return ansQ(kpId, d, 'moon', [T('moon')], '38.4', mulWrongs('1.28', '30'), rng)
}
/** 练习二 10：家到学校 1.3 千米，每天往返两次（走 4 趟）；星期一到星期五共走多少千米。课本 1.3，另有几个近的距离 */
export const WALKS = ['1.3', '0.9', '1.2', '1.6']
function qWalk(kpId: string, d: Difficulty, rng: RNG, week: boolean): Question {
  const w = rng.chance(0.5) ? '1.3' : rng.pick(WALKS)
  const day = mulDec(w, '4')
  if (!week) return ansQ(kpId, d, `walk-day-${w}`, [T('walk.day', { d: w })], day, [mulDec(w, '2'), w, ...mulWrongs(w, '4')], rng)
  const all = mulDec(day, '5')
  // 往返两次当成往返一次（× 2 × 5）、只算一趟（× 5）
  return ansQ(kpId, d, `walk-week-${w}`, [T('walk.week', { d: w })], all, [mulDec(w, '10'), mulDec(w, '5'), mulDec(day, '7')], rng)
}
/** 练习二 14：看见闪电 4 秒后听到雷声，雷声每秒约传播 0.34 千米（1.36 千米）；别的秒数 */
function qThunder(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.chance(0.5) ? 4 : rng.pick([3, 5, 6])
  return ansQ(kpId, d, `thunder-${s}`, [T('thunder', { s })], mulDec('0.34', String(s)), mulWrongs('0.34', String(s)), rng)
}
/** 练习三 3：回收 1 吨废纸可以保护 16 棵树，回收 54.5 吨能保护多少棵（872）；别的吨数，得数都是整数 */
export const PAPER = ['54.5', '12.5', '7.5', '3.5', '20.5']
function qPaper(kpId: string, d: Difficulty, rng: RNG): Question {
  const t = rng.chance(0.4) ? '54.5' : rng.pick(PAPER)
  const v = mulDec(t, '16')
  return numQ(kpId, d, `paper-${t}`, [T('paper', { t })], Number(v), rng, [Number(v) * 10, parseDec(t).n * 16].filter(Number.isInteger))
}

/** 练习四 4：王老师骑车每小时 15 千米、用 0.25 小时到学校（3.75 千米）；改成步行每小时 5 千米、用 0.8 小时能到吗（4 千米，能） */
function qTeacher(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return ansQ(kpId, d, 'teacher-dist', [T('teacher.dist')], mulDec('15', '0.25'), mulWrongs('15', '0.25'), rng)
  const ok = cmpDec(mulDec('5', '0.8'), '3.75') >= 0
  return keyQ(kpId, d, 'teacher-walk', [T('teacher.walk')], L(ok ? 'can' : 'cannot'), [L(ok ? 'cannot' : 'can')], rng)
}

function decInt(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1（买风筝、小亮的方法、积的变化规律）、例 2（0.72 × 60、几个 0.01、积的小数点）、做一做（风筝、够不够、成对的竖式）
    if (roll < 0.2) return qKite(K_INT, d, rng)
    if (roll < 0.3) return qEnough(K_INT, d, rng)
    if (roll < 0.42) return qJiao(K_INT, d, rng)
    if (roll < 0.54) return qRule(K_INT, d, rng, rng.pick(RULE_INT))
    if (roll < 0.62) return qUnits(K_INT, d, rng)
    if (roll < 0.7) return qPlaces(K_INT, d, rng, INT_T1)
    if (roll < 0.84) return qCalc(K_INT, d, rng, rng.pick(INT_T1), true, 'do')
    if (roll < 0.9) return qIntPair(K_INT, d, rng)
    return qPoint(K_INT, d, rng, rng.pick(POINT_INT_T1))
  }
  if (d === 2) {
    // 练习二：给积点小数点、竖式与横式、根据 32 × 15 = 480 填表、月球、上学的路、雷声；练习三 3 回收废纸；练习四 4 王老师上班
    if (roll < 0.18) return qPoint(K_INT, d, rng, rng.pick(POINT_INT_T2))
    if (roll < 0.4) return qCalc(K_INT, d, rng, rng.pick(INT_T2), rng.chance(0.5), 'calc')
    if (roll < 0.55) return qTable(K_INT, d, rng)
    if (roll < 0.62) return qMoon(K_INT, d, rng)
    if (roll < 0.72) return qWalk(K_INT, d, rng, false)
    if (roll < 0.82) return qThunder(K_INT, d, rng)
    if (roll < 0.91) return qPaper(K_INT, d, rng)
    return qTeacher(K_INT, d, rng)
  }
  // 第 3 档：一周走多少千米（往返两次是 4 趟）、0.46 × 300 这种乘数末尾有两个 0 的点小数点、两位数乘数的竖式
  if (roll < 0.35) return qWalk(K_INT, d, rng, true)
  if (roll < 0.6) return qPoint(K_INT, d, rng, rng.pick([['0.46', '300'], ['4.6', '30'], ['3.13', '53']] as [string, string][]))
  if (roll < 0.8) return qCalc(K_INT, d, rng, rng.pick([['3.13', '53'], ['12.8', '42'], ['2.05', '60']] as [string, string][]), true, 'calc')
  return qEnough(K_INT, d, rng)
}
defineGenerator(K_INT, decInt)

// ══ 小数乘小数（m5s1-02-dec-dec）══

/** 例 3、试一试、做一做、例 4、例 4 的做一做 1（课本的算式） */
export const DEC_T1: [string, string][] = [
  ['4.2', '0.8'],
  ['1.92', '0.9'],
  ['2.79', '0.32'],
  ['6.7', '0.3'],
  ['2.4', '6.2'],
  ['5.4', '1.07'],
  ['0.45', '0.6'],
  ['0.56', '0.04'],
  ['3.7', '4.6'],
  ['0.48', '1.5'],
  ['0.29', '0.07'],
  ['0.056', '0.15'],
]
/** 练习二 2、3，练习三 1，练习四 1 里的小数乘小数 */
export const DEC_T2: [string, string][] = [
  ['2.3', '1.2'],
  ['0.37', '0.4'],
  ['0.082', '0.14'],
  ['0.055', '0.06'],
  ['0.39', '2.9'],
  ['0.58', '0.08'],
  ['0.18', '8.45'],
  ['4.5', '0.002'],
  ['0.072', '0.15'],
  ['54.9', '0.38'],
]
/** 例 3：长方形试验田的面积（课本长 4.2 米、宽 0.8 米；另有三块自己定的，都是一位小数） */
export const FIELDS: [string, string][] = [
  ['4.2', '0.8'],
  ['2.4', '1.5'],
  ['3.5', '0.6'],
  ['4.8', '0.5'],
]
/** 长方形（课本：长标在下边、宽标在右边），长宽按比例画（太扁的拉高一点） */
function rectFig(l: string, w: string, unit: string, alt: string, fill: 'b' | 'c' = 'b'): StemPart {
  const lw = Number(l)
  const ww = Number(w)
  const W = 200
  const H = Math.max(36, Math.min(130, Math.round((W * ww) / lw)))
  return {
    kind: 'geo',
    alt,
    figs: [{ w: W, h: H, items: [{ t: 'poly', pts: [[0, 0], [W, 0], [W, H], [0, H]], fill, labels: [null, `${w} ${unit}`, `${l} ${unit}`, null] }] }],
  }
}
function qField(kpId: string, d: Difficulty, rng: RNG): Question {
  const [l, w] = rng.chance(0.5) ? FIELDS[0]! : rng.pick(FIELDS)
  const v = mulDec(l, w)
  const stem: StemPart[] = [T('field', { l, w }), rectFig(l, w, 'm', `长方形，长度 ${l} 米，宽度 ${w} 米`, 'c')]
  return ansQ(kpId, d, `field-${l}x${w}`, stem, v, [...mulWrongs(l, w), mulDec(addDec(l, w), '2'), addDec(l, w)], rng)
}
/** 例 3 机器人、试一试的虚线框（转化成整数乘法）：4.2 乘几得 42、0.8 乘几得 8、336 除以几得积 */
function qScale(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.chance(0.4) ? rng.pick([DEC_T1[0]!, DEC_T1[1]!]) : rng.pick(DEC_T1)
  const A = parseDec(a)
  const B = parseDec(b)
  const step = rng.pick(['a', 'b', 'down'] as const)
  if (step === 'a') return numQ(kpId, d, `up-${a}`, [E(`${a} × ${b}`), T('up', { x: a, y: A.n })], 10 ** A.p, rng, [], 'dec-calc', true)
  if (step === 'b') return numQ(kpId, d, `up-${b}`, [E(`${a} × ${b}`), T('up', { x: b, y: B.n })], 10 ** B.p, rng, [], 'dec-calc', true)
  const N = A.n * B.n
  return numQ(kpId, d, `down-${a}x${b}`, [T('down', { x: A.n, y: B.n, z: N, a, b })], 10 ** (A.p + B.p), rng, [], 'dec-calc', true)
}
/** 例 4：位数不够时怎么点小数点（选办法） */
function qPad(kpId: string, d: Difficulty, rng: RNG): Question {
  return keyQ(kpId, d, 'pad', [T('pad.q')], L('pad.front'), [L('pad.back'), L('pad.none')], rng)
}
/** 例 4 与做一做：竖式里先按整数乘法算出积（只写数字），积是多少（补 0、划去末尾的 0） */
export const POINT_DEC: [string, string][] = [
  ['0.56', '0.04'],
  ['0.29', '0.07'],
  ['0.056', '0.15'],
  ['0.45', '0.6'],
  ['0.48', '1.5'],
  ['4.2', '0.8'],
  ['1.92', '0.9'],
]
/** 练习二 5：判断积的小数位数（课本六道，对的两道） */
export const JUDGE_5: [string, string, string][] = [
  ['56.7', '38', '2154.6'],
  ['2.8', '5.6', '1.568'],
  ['0.37', '0.94', '3.478'],
  ['1.23', '29.2', '359.16'],
  ['1.56', '0.9', '1.404'],
  ['0.78', '6.1', '47.58'],
]
function qJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.75)) {
    const [a, b, shown] = rng.pick(JUDGE_5)
    return tfQ(kpId, d, `judge-${a}x${b}=${shown}`, [E(`${a} × ${b} = ${shown}`), T('judge.q')], canon(shown) === mulDec(a, b), rng)
  }
  // 例 3、例 4 与做一做的算式算对了的（积末尾有 0 的不出：0.45 × 0.6 = 0.27 化简过，按「数出几位」看位数对不上，说不清对不对）；
  // 错的只用课本的四道——自己再造错的，每道都多出一个朗读的小数
  const [a, b] = rng.pick(DEC_T1.filter(([x, y]) => !productDigits(x, y).endsWith('0')))
  const v = mulDec(a, b)
  return tfQ(kpId, d, `judge-${a}x${b}=${v}`, [E(`${a} × ${b} = ${v}`), T('judge.q')], true, rng)
}
/** 练习二 7：汽车每小时行驶 70.5 千米，3.4 小时行驶多少千米（239.7；只用课本的数，这个知识点的小数已经很多） */
function qCar(kpId: string, d: Difficulty, rng: RNG): Question {
  return ansQ(kpId, d, 'car-3.4', [T('car', { v: '70.5', t: '3.4' })], mulDec('70.5', '3.4'), mulWrongs('70.5', '3.4'), rng)
}
/** 练习二 12：长方形、正方形的面积（单位：分米） */
export const AREAS: [string, string][] = [
  ['6.25', '3.2'],
  ['4.5', '4.5'],
  ['5.9', '4.23'],
]
function qArea(kpId: string, d: Difficulty, rng: RNG): Question {
  const [l, w] = rng.pick(AREAS)
  const sq = l === w
  const v = mulDec(l, w)
  const stem: StemPart[] = [T(sq ? 'area.square' : 'area.rect'), rectFig(l, w, 'dm', sq ? `正方形，边长 ${l} 分米` : `长方形，长度 ${l} 分米，宽度 ${w} 分米`)]
  return ansQ(kpId, d, `area-${l}x${w}`, stem, v, [...mulWrongs(l, w), mulDec(addDec(l, w), '2')], rng)
}
/** 练习二 15：根据 65 × 39 = 2535，哪个算式的积是 253.5 / 25.35 / 2.535 / 0.2535（选算式） */
function qFact(kpId: string, d: Difficulty, rng: RNG): Question {
  const P = rng.int(1, 4)
  const target = fmtDec(2535, P)
  const pairs: [number, number][] = []
  for (let x = 0; x <= 3; x++) for (let y = 0; y <= 3; y++) if (x + y >= 1 && x + y <= 5) pairs.push([x, y])
  const write = ([x, y]: [number, number]): string => `${fmtDec(65, x)} × ${fmtDec(39, y)}`
  const right = rng.pick(pairs.filter(([x, y]) => x + y === P))
  const wrong = rng.shuffle(pairs.filter(([x, y]) => x + y !== P && Math.abs(x + y - P) <= 2)).slice(0, 3)
  return labelQuestion({ kpId, type: 'dec-calc', difficulty: d, sig: `fact-${P}-${write(right)}`, stem: [T('fact.q', { t: target })], correct: write(right), distractors: wrong.map(write), rng })
}
/** 练习二 4：盘秤上的鱼、西瓜、一袋橘子（每千克 19 元、3.6 元、7.5 元；秤上的质量课本图太小看不清，取 2.6、7.5、3.4 千克） */
export const WEIGHS: { id: string; price: string; kg: string }[] = [
  { id: 'fish', price: '19', kg: '2.6' },
  { id: 'melon', price: '3.6', kg: '7.5' },
  { id: 'orange', price: '7.5', kg: '3.4' },
]
function qWeigh(kpId: string, d: Difficulty, rng: RNG): Question {
  const g = rng.pick(WEIGHS)
  const v = mulDec(g.price, g.kg)
  const stem: StemPart[] = [T('weigh', { g: L(`goods.${g.id}`), p: g.price }), { kind: 'scale', max: 10, major: 1, minor: 10, value: Number(g.kg), unit: 'kg' }]
  return ansQ(kpId, d, `weigh-${g.id}`, stem, v, mulWrongs(g.price, g.kg), rng)
}
/** 思考题：绳子对折 3 次，每段 1.25 米，原来的长度（10 米）；别的折法、段长，得数都是整数 */
export const ROPES: [number, string][] = [
  [3, '1.25'],
  [2, '1.25'],
  [3, '0.75'],
  [2, '2.5'],
  [3, '0.5'],
]
function qRope(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, s] = rng.chance(0.4) ? ROPES[0]! : rng.pick(ROPES)
  const segs = 2 ** k
  const v = Number(mulDec(s, String(segs)))
  const wrongs = [mulDec(s, String(k)), mulDec(s, String(2 * k)), mulDec(s, String(segs / 2))].filter((x) => !x.includes('.')).map(Number)
  return numQ(kpId, d, `rope-${k}-${s}`, [T('rope', { k, s })], v, rng, wrongs)
}
/** 练习四 8：1.□2 × 5.3 的积可能是多少（课本 A 7.526） */
function qDigit(kpId: string, d: Difficulty, rng: RNG): Question {
  return labelQuestion({ kpId, type: 'dec-calc', difficulty: d, sig: 'digit', stem: [T('digit.q'), decMul('1.□2', '5.3')], correct: '7.526', distractors: ['0.996', '11.176', '7.562'], rng })
}
/** 练习三 10：3.3 × 6.7、3.33 × 66.7、3.333 × 666.7 找规律，直接写出 3.3333 × 6666.7 的积 */
function qPattern(kpId: string, d: Difficulty, rng: RNG): Question {
  const stem: StemPart[] = [T('pattern.q'), E('3.3 × 6.7 = 22.11'), E('3.33 × 66.7 = 222.111'), E('3.333 × 666.7 = 2222.1111'), E('3.3333 × 6666.7 = ?')]
  return labelQuestion({ kpId, type: 'dec-calc', difficulty: d, sig: 'pattern', stem, correct: '22222.11111', distractors: ['2222.11111', '22222.1111', '222222.11111'], rng })
}

function decDec(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 3（试验田、转化成整数乘法）、试一试与法则（一共几位小数）、做一做的竖式、例 4（补 0、怎么办）、例 4 的做一做
    if (roll < 0.16) return qField(K_DEC, d, rng)
    if (roll < 0.3) return qScale(K_DEC, d, rng)
    if (roll < 0.4) return qPlaces(K_DEC, d, rng, DEC_T1)
    if (roll < 0.7) return qCalc(K_DEC, d, rng, rng.pick(DEC_T1), rng.chance(0.75), 'do')
    if (roll < 0.92) return qPoint(K_DEC, d, rng, rng.pick(POINT_DEC))
    return qPad(K_DEC, d, rng)
  }
  if (d === 2) {
    // 练习二 2、3、5、7、12、15、4（盘秤），练习三 1，练习四 1
    if (roll < 0.25) return qCalc(K_DEC, d, rng, rng.pick(DEC_T2), rng.chance(0.5), 'calc')
    if (roll < 0.45) return qJudge(K_DEC, d, rng)
    if (roll < 0.55) return qCar(K_DEC, d, rng)
    if (roll < 0.67) return qArea(K_DEC, d, rng)
    if (roll < 0.8) return qFact(K_DEC, d, rng)
    return qWeigh(K_DEC, d, rng)
  }
  // 第 3 档：思考题（对折绳子）、练习四 8（1.□2 × 5.3）、练习三 10（找规律）、积的位数不够的竖式
  if (roll < 0.35) return qRope(K_DEC, d, rng)
  if (roll < 0.55) return qDigit(K_DEC, d, rng)
  if (roll < 0.7) return qPattern(K_DEC, d, rng)
  return qPoint(K_DEC, d, rng, rng.pick([['0.056', '0.15'], ['0.29', '0.07'], ['0.082', '0.14']] as [string, string][]))
}
defineGenerator(K_DEC, decDec)

// ══ 积的近似数（m5s1-02-approx）══

const KEEP = ['int', 'one', 'two'] as const
const keepKey = (k: number): LStr => L(`keep.${KEEP[k]}`)
/** 近似数的干扰项：没四舍五入直接截、多保留 / 少保留一位、四舍五入时错进一位；考写法的（0.40）也放末尾 0 去掉的写法 */
export function approxWrongs(exact: string, k: number): string[] {
  const right = roundDec(exact, k)
  const out = [truncDec(exact, k), roundDec(exact, k + 1), k > 0 ? roundDec(exact, k - 1) : rawDec(parseDec(roundDec(exact, 0)).n * 10, 0)]
  const r = parseDec(right)
  out.push(rawDec(r.n + 1, k), rawDec(Math.max(0, r.n - 1), k))
  if (/\.\d*0$/.test(right)) out.unshift(canon(right))
  return out
}
/** 选项按写法比（0.40 和 0.4 算两个），和正确答案写法一样的、重复的去掉；正数 */
function approxQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], right: string, cands: string[], rng: RNG): Question {
  if (!right.includes('.')) {
    const v = Number(right)
    return numQ(kpId, d, sig, stem, v, rng, cands.filter((s) => /^\d+$/.test(s)).map(Number))
  }
  const seen = new Set([right])
  const ds: string[] = []
  for (const c of cands) {
    if (ds.length >= 3 || seen.has(c) || cmpDec(c, '0') <= 0) continue
    seen.add(c)
    ds.push(c)
  }
  return labelQuestion({ kpId, type: 'dec-calc', difficulty: d, sig, stem, correct: right, distractors: ds, rng })
}
/** 练习二 6（保留一位、两位小数）与练习二 11（保留整数） */
export const ROUNDS: { a: string; b: string; k: number }[] = [
  { a: '1.2', b: '1.4', k: 1 },
  { a: '0.37', b: '8.7', k: 1 },
  { a: '3.14', b: '3.9', k: 1 },
  { a: '0.86', b: '1.6', k: 2 },
  { a: '2.34', b: '0.17', k: 2 },
  { a: '1.05', b: '0.26', k: 2 },
  { a: '3.04', b: '21', k: 0 },
]
function qRound(kpId: string, d: Difficulty, rng: RNG, r: { a: string; b: string; k: number } = rng.pick(ROUNDS)): Question {
  const exact = mulDec(r.a, r.b)
  const right = roundDec(exact, r.k)
  return approxQ(kpId, d, `round-${r.a}x${r.b}-${r.k}`, [E(`${r.a} × ${r.b} ≈ ?`), T('keep.q', { k: keepKey(r.k) })], right, [exact, ...approxWrongs(exact, r.k)], rng)
}
/** 先给出积，再保留（练习二 6、11 的积，嗅觉细胞、高铁的积） */
export const EXACTS: [string, number][] = [
  ['1.68', 1],
  ['3.219', 1],
  ['12.246', 1],
  ['1.376', 2],
  ['0.3978', 2],
  ['0.273', 2],
  ['2.205', 1],
  ['63.84', 0],
  ['4.7586', 2],
]
function qRoundOnly(kpId: string, d: Difficulty, rng: RNG): Question {
  const [x, k] = rng.pick(EXACTS)
  const right = roundDec(x, k)
  return approxQ(kpId, d, `only-${x}-${k}`, [T('keep.only', { x, k: keepKey(k) })], right, approxWrongs(x, k), rng)
}
/** 例 4 的做一做 2：人的嗅觉细胞约 0.049 亿个，狗的是人的 45 倍（2.205 ≈ 2.2 亿个） */
function qDog(kpId: string, d: Difficulty, rng: RNG): Question {
  return approxQ(kpId, d, 'dog', [T('dog')], '2.2', ['2.21', '2.3', '22.1', '2.205'], rng)
}
/** 练习二 11：一幢大楼 21 层，每层高 3.04 米，大约高多少米（保留整数，64）；别的层数 */
export const FLOORS = [21, 18, 30, 16]
function qBuilding(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.4) ? 21 : rng.pick(FLOORS)
  const exact = mulDec('3.04', String(n))
  const right = roundDec(exact, 0)
  return numQ(kpId, d, `building-${n}`, [T('building', { n })], Number(right), rng, [Number(truncDec(exact, 0)), Number(right) * 10, 3 * n])
}
/** 练习三 4：2011 年高铁营业里程约 0.66 万千米，2024 年是它的 7.21 倍（4.7586 ≈ 4.76 万千米） */
function qRail(kpId: string, d: Difficulty, rng: RNG): Question {
  return approxQ(kpId, d, 'rail', [T('rail')], '4.76', ['4.75', '4.8', '4.7586', '47.6'], rng)
}
/** 保留两位小数的写法：0.3978 ≈ 0.40，写成 0.4 不对（G14 考写法）；也问四舍五入对不对 */
function qJudgeKeep(kpId: string, d: Difficulty, rng: RNG): Question {
  const r = rng.pick(ROUNDS.filter((x) => x.k > 0))
  const exact = mulDec(r.a, r.b)
  const right = roundDec(exact, r.k)
  const shown = rng.pick([right, right, canon(right), truncDec(exact, r.k), roundDec(exact, r.k + 1)])
  return tfQ(kpId, d, `jkeep-${r.a}x${r.b}-${shown}`, [E(`${r.a} × ${r.b} ≈ ${shown}`), T('keep.judge', { k: keepKey(r.k) })], shown === right, rng)
}

function approx(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 4 的做一做 2（嗅觉细胞）、练习二 6 的六道与 11（大楼，保留整数）、先给积再保留
    if (roll < 0.15) return qDog(K_APX, d, rng)
    if (roll < 0.55) return qRound(K_APX, d, rng)
    if (roll < 0.82) return qRoundOnly(K_APX, d, rng)
    return qBuilding(K_APX, d, rng)
  }
  if (d === 2) {
    // 练习三 4（高铁）、保留两位小数的写法判断、练习二 6 的两步
    if (roll < 0.25) return qRail(K_APX, d, rng)
    if (roll < 0.55) return qJudgeKeep(K_APX, d, rng)
    if (roll < 0.85) return qRound(K_APX, d, rng)
    return qBuilding(K_APX, d, rng)
  }
  if (roll < 0.5) return qJudgeKeep(K_APX, d, rng)
  if (roll < 0.75) return qRound(K_APX, d, rng, ROUNDS[4]!)
  return qRail(K_APX, d, rng)
}
defineGenerator(K_APX, approx)

// ══ 小数倍（m5s1-02-times）══

/** 例 5：一班 3.9 千克，二班是一班的 0.8 倍、三班是 1.2 倍（课本）；另有两组自己定的 */
export const PEANUTS: { base: string; r: string; cls: 2 | 3 }[] = [
  { base: '3.9', r: '0.8', cls: 2 },
  { base: '3.9', r: '1.2', cls: 3 },
  { base: '4.5', r: '0.6', cls: 2 },
  { base: '4.5', r: '1.4', cls: 3 },
]
const tenths = (r: string): number => Math.round(parseDec(r).n * 10 ** (1 - parseDec(r).p))
function qPeanut(kpId: string, d: Difficulty, rng: RNG): Question {
  const pk = rng.chance(0.6) ? rng.pick(PEANUTS.slice(0, 2)) : rng.pick(PEANUTS)
  const v = mulDec(pk.base, pk.r)
  const cls = L(`cls.${pk.cls}`)
  const rows: RatioRow[] = [
    { name: L('cls.1'), len: 10, top: L('rl.one'), bottom: `${pk.base} kg` },
    { name: cls, len: tenths(pk.r), top: L('rl.times', { r: pk.r }), bottom: '? kg' },
  ]
  const stem: StemPart[] = [T('peanut', { b: pk.base, c: cls, r: pk.r }), { kind: 'ratio-lines', per: 10, rows }]
  // 把倍数当成加上的数（3.9 + 0.8）、小数点点错、末位算错
  return ansQ(kpId, d, `peanut-${pk.base}x${pk.r}`, stem, v, [addDec(pk.base, pk.r), ...mulWrongs(pk.base, pk.r)], rng)
}
/** 做一做 2：比一比（课本 756 × 0.9 ○ 756 等四道）；再用本单元的数和乘数 */
export const CMP_BOOK: [string, string][] = [
  ['756', '0.9'],
  ['0.94', '1'],
  ['4.25', '1.1'],
  ['31.4', '1.2'],
]
const CMP_X = ['756', '0.94', '4.25', '31.4', '3.9', '9.5', '14.2', '3.2']
const CMP_M = ['0.9', '1', '1.1', '1.2', '0.8', '0.5', '1.4', '2.6']
function qCmp(kpId: string, d: Difficulty, rng: RNG): Question {
  const [x, m] = rng.chance(0.4) ? rng.pick(CMP_BOOK) : [rng.pick(CMP_X), rng.pick(CMP_M)]
  return cmpQ(kpId, d, `cmp-${x}x${m}`, [T('compare'), E(`${x} × ${m} ○ ${x}`)], cmpDec(m, '1'), rng, 'compare')
}
/** 第 2 档：两个积比大小（同一个数乘两个不同的数） */
function qCmp2(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(CMP_X)
  const [m1, m2] = rng.shuffle(CMP_M).slice(0, 2) as [string, string]
  return cmpQ(kpId, d, `cmp2-${x}x${m1}-${m2}`, [T('compare'), E(`${x} × ${m1} ○ ${x} × ${m2}`)], cmpDec(m1, m2), rng, 'compare')
}
/** 做一做 1：彩带每米 3.2 元，买 0.8 米、0.5 米、1.4 米、2.6 米 */
export const RIBBONS = ['0.8', '0.5', '1.4', '2.6']
function qRibbon(kpId: string, d: Difficulty, rng: RNG): Question {
  const l = rng.pick(RIBBONS)
  return ansQ(kpId, d, `ribbon-${l}`, [T('ribbon', { p: '3.2', l })], mulDec('3.2', l), [addDec('3.2', l), ...mulWrongs('3.2', l)], rng)
}
/** 例 5 的规律：一个不是 0 的数乘大于 / 小于 1 的数，积比原来的数大 / 小（四种说法）；某个算式的积比第一个乘数大，对吗 */
function qRule5(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const lt = rng.chance(0.5)
    const big = rng.chance(0.5)
    return tfQ(kpId, d, `law-${lt ? 'lt' : 'gt'}-${big ? 'big' : 'small'}`, [T('rule5', { m: L(lt ? 'lt1' : 'gt1'), r: L(big ? 'bigger' : 'smaller') })], lt !== big, rng, 'compare')
  }
  const x = rng.pick(CMP_X.slice(4))
  const m = rng.pick(CMP_M.filter((s) => s !== '1'))
  const big = rng.chance(0.5)
  const ok = big ? cmpDec(m, '1') > 0 : cmpDec(m, '1') < 0
  return tfQ(kpId, d, `rule-${x}x${m}-${big ? 'big' : 'small'}`, [T('rule5.one', { x, m, r: L(big ? 'bigger' : 'smaller') })], ok, rng, 'compare')
}
/** 下面哪个算式的积比 x 小（大）：选算式 */
function qWhich(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(CMP_X.slice(4))
  const small = rng.chance(0.5)
  const lows = ['0.9', '0.8', '0.5', '0.99']
  const highs = ['1.1', '1.2', '1.4', '1.01']
  const right = rng.pick(small ? lows : highs)
  const others = [...rng.shuffle(small ? highs : lows).slice(0, 2), '1']
  return labelQuestion({ kpId, type: 'compare', difficulty: d, sig: `which-${x}-${small ? 's' : 'b'}-${right}`, stem: [T(small ? 'which.small' : 'which.big', { x })], correct: `${x} × ${right}`, distractors: others.map((m) => `${x} × ${m}`), rng })
}
/** 练习三 6：东海大桥长度 32.5 千米，港珠澳大桥比它的 1.6 倍多 3 千米（55） */
function qBridge(kpId: string, d: Difficulty, rng: RNG): Question {
  return numQ(kpId, d, 'bridge', [T('bridge')], 55, rng, [52, 49, 104, 58])
}
/** 练习三 7：梅花鹿高 1.46 米，一棵树的高度是它的 3.5 倍（5.11）；梅花鹿比树矮多少（3.65）。课本是长颈鹿，避开「长」换成树 */
function qTree(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) return ansQ(kpId, d, 'tree-h', [T('tree.h')], '5.11', [addDec('1.46', '3.5'), ...mulWrongs('1.46', '3.5')], rng)
  return ansQ(kpId, d, 'tree-diff', [T('tree.diff')], '3.65', ['5.11', '6.57', '2.04', '3.75'], rng)
}
/** 练习四 2：1 海里约是 1.85 千米，医院船总航程超过 26 万海里（48.1 万千米） */
function qShip(kpId: string, d: Difficulty, rng: RNG): Question {
  return ansQ(kpId, d, 'ship', [T('ship')], '48.1', mulWrongs('26', '1.85'), rng)
}
/** 练习三 9：海拔每升高 100 米气温下降约 0.6 摄氏度；山脚 50 米 16 摄氏度，山顶 850 米（11.2） */
function qTemp(kpId: string, d: Difficulty, rng: RNG): Question {
  return ansQ(kpId, d, 'temp', [T('temp')], '11.2', ['4.8', '11.5', '10.9', '12.4'], rng)
}

function times(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 5（花生、线段图）、规律、做一做 1（彩带）、做一做 2（比一比）、哪个积比它小 / 大
    if (roll < 0.25) return qPeanut(K_TIMES, d, rng)
    if (roll < 0.5) return qCmp(K_TIMES, d, rng)
    if (roll < 0.68) return qRibbon(K_TIMES, d, rng)
    if (roll < 0.86) return qRule5(K_TIMES, d, rng)
    return qWhich(K_TIMES, d, rng)
  }
  if (d === 2) {
    // 练习三 6（大桥）、7（梅花鹿与树）、练习四 2（医院船）、两个积比大小
    if (roll < 0.2) return qBridge(K_TIMES, d, rng)
    if (roll < 0.45) return qTree(K_TIMES, d, rng)
    if (roll < 0.6) return qShip(K_TIMES, d, rng)
    if (roll < 0.85) return qCmp2(K_TIMES, d, rng)
    return qWhich(K_TIMES, d, rng)
  }
  if (roll < 0.5) return qTemp(K_TIMES, d, rng)
  return qCmp2(K_TIMES, d, rng)
}
defineGenerator(K_TIMES, times)

// ══ 整数乘法运算律推广到小数（m5s1-02-laws）══

/** 开头三组算式（交换律、结合律、分配律），再加几组不相等的 */
export const SAME: [string, string, number][] = [
  ['0.7 × 1.2', '1.2 × 0.7', 0],
  ['(0.8 × 0.5) × 0.4', '0.8 × (0.5 × 0.4)', 0],
  ['0.5 × (2.4 + 3.6)', '0.5 × 2.4 + 0.5 × 3.6', 0],
  ['0.5 × (2.4 + 3.6)', '0.5 × 2.4 + 3.6', -1],
  ['1.2 × (5 + 0.5)', '1.2 × 5 + 0.5', 1],
  ['(0.8 × 0.5) × 0.4', '0.8 × 0.5 + 0.4', -1],
]
/** 用了哪个运算律（开头三组与做一做 1 的三道） */
export const WHICH: [string, 'swap' | 'assoc' | 'dist'][] = [
  ['0.7 × 1.2 = 1.2 × 0.7', 'swap'],
  ['(0.8 × 0.5) × 0.4 = 0.8 × (0.5 × 0.4)', 'assoc'],
  ['0.5 × (2.4 + 3.6) = 0.5 × 2.4 + 0.5 × 3.6', 'dist'],
  ['4.2 × 1.69 = 1.69 × 4.2', 'swap'],
  ['0.77 × 2.5 × 0.4 = 0.77 × (2.5 × 0.4)', 'assoc'],
  ['7.2 × 8.4 + 2.8 × 8.4 = (7.2 + 2.8) × 8.4', 'dist'],
]
/** 做一做 1 与例 6 的填数：算式里的 ? 是几（小数用选项、整数用数字键盘填进算式） */
export const FILLS: { e: string; v: string; w: string[] }[] = [
  { e: '4.2 × 1.69 = 1.69 × ?', v: '4.2', w: ['1.69', '0.42', '16.9'] },
  { e: '0.77 × 2.5 × 0.4 = 0.77 × (2.5 × ?)', v: '0.4', w: ['0.77', '2.5', '4'] },
  { e: '7.2 × 8.4 + 2.8 × 8.4 = (7.2 + 2.8) × ?', v: '8.4', w: ['7.2', '2.8', '16.8'] },
  { e: '0.25 × 4.78 × 4 = 4.78 × (0.25 × ?)', v: '4', w: ['4.78', '0.4', '2'] },
  { e: '0.25 × 4.78 × 4 = 4.78 × ?', v: '1', w: ['4', '16', '2'] },
  { e: '0.65 × 202 = 0.65 × 200 + 0.65 × ?', v: '2', w: ['202', '20', '1'] },
  { e: '0.65 × 202 = ? + 1.3', v: '130', w: ['13', '1300', '131.3'] },
  { e: '101 × 0.45 = 100 × 0.45 + ? × 0.45', v: '1', w: ['101', '10', '2'] },
]
/** 例 6、做一做 2、练习三 5、练习四 1 的简便计算：算式、得数、错法 */
export const SIMPLE_T1: { e: string; v: string; w: string[] }[] = [
  { e: '0.25 × 4.78 × 4', v: '4.78', w: ['47.8', '0.478', '19.12'] },
  { e: '0.65 × 202', v: '131.3', w: ['130', '13.13', '131.65'] },
  { e: '0.034 × 0.5 × 0.6', v: '0.0102', w: ['0.102', '0.00102', '0.0112'] },
  { e: '101 × 0.45', v: '45.45', w: ['45', '4.545', '45.9'] },
  { e: '4.75 × 99 + 4.75', v: '475', w: ['470.25', '479.75', '47.5'] },
  { e: '2.73 × 99', v: '270.27', w: ['273', '275.73', '27.027'] },
]
export const SIMPLE_T2: { e: string; v: string; w: string[] }[] = [
  { e: '4.8 × 0.25', v: '1.2', w: ['12', '0.12', '1.25'] },
  { e: '0.78 × 98', v: '76.44', w: ['78', '76.56', '7.644'] },
  { e: '0.5 × 2.33 × 8', v: '9.32', w: ['93.2', '4.66', '18.64'] },
  { e: '1.2 × 2.5 + 0.8 × 2.5', v: '5', w: ['50', '6', '4'] },
  { e: '56 × 1.25', v: '70', w: ['7', '700', '56'] },
  { e: '0.8 × 0.25 × 0.4 × 12.5', v: '1', w: ['10', '100', '2'] },
  { e: '1.25 × 0.7 × 0.8', v: '0.7', w: ['7', '0.07', '0.56'] },
  { e: '9.8 × 25', v: '245', w: ['250', '24.5', '255'] },
  { e: '6.1 × 3.6 + 3.6 × 3.9', v: '36', w: ['3.6', '360', '37'] },
]
function qSame(kpId: string, d: Difficulty, rng: RNG): Question {
  const [l, r, rel] = rng.chance(0.6) ? rng.pick(SAME.slice(0, 3)) : rng.pick(SAME)
  return cmpQ(kpId, d, `same-${l}-${r}`, [T('compare'), E(`${l} ○ ${r}`)], rel, rng, 'law')
}
function qWhichLaw(kpId: string, d: Difficulty, rng: RNG): Question {
  const [e, law] = rng.pick(WHICH)
  return keyQ(kpId, d, `law-${e}`, [E(e), T('law.q')], L(`law.${law}`), (['swap', 'assoc', 'dist'] as const).filter((x) => x !== law).map((x) => L(`law.${x}`)), rng, 'law')
}
function qFill(kpId: string, d: Difficulty, rng: RNG): Question {
  const f = rng.pick(FILLS)
  if (!f.v.includes('.')) {
    return numQ(kpId, d, `fill-${f.e}`, [T('fill.q'), E(f.e)], Number(f.v), rng, f.w.filter((s) => /^\d+$/.test(s)).map(Number), 'law')
  }
  return labelQuestion({ kpId, type: 'law', difficulty: d, sig: `fill-${f.e}`, stem: [T('fill.q'), E(f.e)], correct: f.v, distractors: f.w, rng })
}
function qSimple(kpId: string, d: Difficulty, rng: RNG, s: { e: string; v: string; w: string[] }): Question {
  return ansQ(kpId, d, `simple-${s.e}`, [T('simple'), E(`${s.e} = ?`)], s.v, s.w, rng, 'law')
}
/** 练习三 2：下面各题算得对吗（课本两道都是错的：先算了减法、小数点点错），也出算对的写法与正确的得数 */
export const ORDERS: { e: string; ok: boolean; v: string; w: string[] }[] = [
  { e: '50.4 × 1.9 - 1.8 = 50.4 × 0.1 = 5.04', ok: false, v: '93.96', w: ['5.04', '9.396', '97.56'] },
  { e: '3.76 × 0.25 + 25.8 = 0.094 + 25.8 = 25.894', ok: false, v: '26.74', w: ['25.894', '2.674', '26.84'] },
  { e: '50.4 × 1.9 - 1.8 = 95.76 - 1.8 = 93.96', ok: true, v: '93.96', w: [] },
  { e: '3.76 × 0.25 + 25.8 = 0.94 + 25.8 = 26.74', ok: true, v: '26.74', w: [] },
]
function qOrder(kpId: string, d: Difficulty, rng: RNG): Question {
  const o = rng.pick(ORDERS)
  if (!o.ok && rng.chance(0.5)) {
    const head = o.e.split(' = ')[0]!
    return labelQuestion({ kpId, type: 'law', difficulty: d, sig: `fixv-${head}`, stem: [T('order.fix'), E(o.e)], correct: o.v, distractors: o.w, rng })
  }
  return tfQ(kpId, d, `order-${o.e}`, [T('order.q'), E(o.e)], o.ok, rng, 'law')
}
/** 练习三 8：小云每分钟骑 0.2 千米、小林 0.25 千米，相向而行 10 分钟后相遇，两家相距多少千米（4.5） */
function qMeet(kpId: string, d: Difficulty, rng: RNG): Question {
  return ansQ(kpId, d, 'meet', [T('meet')], '4.5', ['2.5', '0.45', '45', '2'], rng, 'law')
}

/** 练习四 7：冰箱一天耗电 0.69 千瓦时（三级能效）/ 0.54 千瓦时（一级能效），每千瓦时 0.5 元，一个月按 30 天算的电费（10.35 / 8.1 元） */
export const FRIDGES: { level: 1 | 3; kwh: string }[] = [
  { level: 3, kwh: '0.69' },
  { level: 1, kwh: '0.54' },
]
function qFridge(kpId: string, d: Difficulty, rng: RNG): Question {
  const f = rng.pick(FRIDGES)
  const v = mulDec(mulDec(f.kwh, '30'), '0.5')
  // 忘了乘 0.5、忘了乘 30、小数点点错
  const wrongs = [mulDec(f.kwh, '30'), mulDec(f.kwh, '0.5'), ...mulWrongs(f.kwh, '15')]
  return ansQ(kpId, d, `fridge-${f.level}`, [T('fridge.q', { t: L(`fridge.l${f.level}`), e: f.kwh })], v, wrongs, rng, 'law')
}

function laws(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 开头三组算式（比一比、用了哪个运算律）、例 6 与做一做 1（填数）、做一做 2（简便计算）
    if (roll < 0.22) return qSame(K_LAWS, d, rng)
    if (roll < 0.44) return qWhichLaw(K_LAWS, d, rng)
    if (roll < 0.7) return qFill(K_LAWS, d, rng)
    return qSimple(K_LAWS, d, rng, rng.pick(SIMPLE_T1))
  }
  if (d === 2) {
    // 练习三 5、练习四 1（简便计算）、练习三 2（算得对吗）、练习四 7（冰箱的电费，先算 30 × 0.5）
    if (roll < 0.5) return qSimple(K_LAWS, d, rng, rng.pick(SIMPLE_T2))
    if (roll < 0.78) return qOrder(K_LAWS, d, rng)
    if (roll < 0.9) return qFridge(K_LAWS, d, rng)
    return qSame(K_LAWS, d, rng)
  }
  if (roll < 0.4) return qMeet(K_LAWS, d, rng)
  if (roll < 0.75) return qSimple(K_LAWS, d, rng, rng.pick(SIMPLE_T2.slice(3)))
  return qOrder(K_LAWS, d, rng)
}
defineGenerator(K_LAWS, laws)

// ══ 用估算解决问题（m5s1-02-estimate）══

/** 例 7 的表：商品、单价、数量（课本：大米 30.98 元 2 袋，肉每千克 26.48 元 0.8 千克） */
const ex7Table = (): StemPart => ({
  kind: 'stat-table',
  head: 'row',
  rows: [
    [L('th.goods'), L('th.price'), L('th.qty')],
    [L('goods.rice'), '30.98', L('qty.bag', { n: 2 })],
    [L('goods.meat'), '26.48', L('qty.kg', { n: '0.8' })],
  ],
})
/** 例 7：剩下的钱够买一盒 10 元 / 20 元的鸡蛋吗（往大估不超过 89 元，往小估不低于 80 元） */
function qEx7(kpId: string, d: Difficulty, rng: RNG): Question {
  const e = rng.pick([10, 20])
  return keyQ(kpId, d, `ex7-${e}`, [T('ex7.q', { e }), ex7Table()], L(e === 10 ? 'enough' : 'short'), [L(e === 10 ? 'short' : 'enough')], rng)
}
/** 例 7 的两种估法：照课本的数估，一共不超过 89 元 / 不低于 80 元 */
function qEx7Est(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return numQ(kpId, d, 'ex7-up', [T('ex7.up'), ex7Table()], 89, rng, [80, 88, 90, 62])
  return numQ(kpId, d, 'ex7-low', [T('ex7.low'), ex7Table()], 80, rng, [89, 85, 60, 70])
}
/** 往大估 / 往小估：选一个整数（只有一个比它大 / 小，不会两个都对） */
export const ESTS: string[] = ['30.98', '26.48', '1.85', '3.6', '5.7']
function qEstOne(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(ESTS)
  const up = x === '30.98' ? rng.chance(0.5) : true
  const c = ceilDec(x)
  const f = c - 1
  const correct = up ? c : f
  const wrongs = up ? [f, f - 1] : [c, c + 1]
  return labelQuestion({ kpId, type: 'dec-calc', difficulty: d, sig: `est-${x}-${up ? 'up' : 'down'}`, stem: [T(up ? 'est.up' : 'est.down', { x })], correct: String(correct), distractors: wrongs.map(String), rng })
}
/** 做一做 1 的东西（课本：纯牛奶 1.85 元一袋、醋 3.60 元一瓶、牙膏 5.70 元一盒买 4 盒、毛巾 2.40 元、浴巾 6.60 元） */
export const DZ1: { id: string; price: string; n: number; unit: 'bag' | 'bottle' | 'box' | 'piece' }[] = [
  { id: 'milk', price: '1.85', n: 1, unit: 'bag' },
  { id: 'vinegar', price: '3.60', n: 1, unit: 'bottle' },
  { id: 'paste', price: '5.70', n: 4, unit: 'box' },
  { id: 'towel', price: '2.40', n: 1, unit: 'piece' },
  { id: 'bath', price: '6.60', n: 1, unit: 'piece' },
]
export const DZ1_TOTAL = '37.25'
const dz1Table = (): StemPart => ({
  kind: 'stat-table',
  head: 'row',
  rows: [[L('th.goods'), L('th.unitPrice'), L('th.qty')], ...DZ1.map((g) => [L(`goods.${g.id}`), L(`per.${g.unit}`, { v: g.price }), L(`qty.${g.unit}`, { n: g.n })])],
})
function qDz1(kpId: string, d: Difficulty, rng: RNG): Question {
  const b = rng.pick([40, 40, 50, 35, 30])
  const ok = cmpDec(String(b), DZ1_TOTAL) >= 0
  return keyQ(kpId, d, `dz1-${b}`, [T('dz1.q', { b }), dz1Table()], L(ok ? 'enough' : 'short'), [L(ok ? 'short' : 'enough')], rng)
}
/** 练习四 5：2 袋大米（32 元）、8 盒牛奶（2.6 元）、2 盒果汁（10.8 元），能参加满 100 元减 5 元吗（106.4，能）；牛奶换几种盒数 */
export const SALE_MILK = [8, 6, 5, 4]
function qSale(kpId: string, d: Difficulty, rng: RNG): Question {
  const m = rng.chance(0.4) ? 8 : rng.pick(SALE_MILK)
  const total = addDec(addDec(mulDec('32', '2'), mulDec('2.6', String(m))), mulDec('10.8', '2'))
  const ok = cmpDec(total, '100') >= 0
  const table: StemPart = {
    kind: 'stat-table',
    head: 'row',
    rows: [
      [L('th.goods'), L('th.unitPrice'), L('th.qty')],
      [L('goods.rice'), L('per.bag', { v: '32' }), L('qty.bag', { n: 2 })],
      [L('goods.milkBox'), L('per.box', { v: '2.6' }), L('qty.box', { n: m })],
      [L('goods.juice'), L('per.box', { v: '10.8' }), L('qty.box', { n: 2 })],
    ],
  }
  return keyQ(kpId, d, `sale-${m}`, [T('sale.q'), table], L(ok ? 'can' : 'cannot'), [L(ok ? 'cannot' : 'can')], rng)
}
/** 练习四 6：长度 8.1 米、宽度 5.2 米的房间铺边长 0.6 米的正方形地砖，100 块够吗（42.12 平方米 > 36 平方米，不够） */
function qTiles(kpId: string, d: Difficulty, rng: RNG): Question {
  return keyQ(kpId, d, 'tiles', [T('tiles')], L('short'), [L('enough')], rng)
}

function estimate(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 7（够不够、两种估法）、往大估 / 往小估、做一做 1（40 元够吗）
    if (roll < 0.28) return qEx7(K_EST, d, rng)
    if (roll < 0.48) return qEx7Est(K_EST, d, rng)
    if (roll < 0.72) return qEstOne(K_EST, d, rng)
    return qDz1(K_EST, d, rng)
  }
  if (d === 2) {
    // 练习四 5（满 100 元减 5 元）、做一做 1 换钱数、例 7
    if (roll < 0.5) return qSale(K_EST, d, rng)
    if (roll < 0.8) return qDz1(K_EST, d, rng)
    return qEx7(K_EST, d, rng)
  }
  if (roll < 0.5) return qTiles(K_EST, d, rng)
  return qSale(K_EST, d, rng)
}
defineGenerator(K_EST, estimate)

// ══ 分段计费（m5s1-02-tiered）══

/** 出租车：3 千米及以内 8 元，超过 3 千米的部分每千米 1.5 元，不足 1 千米按 1 千米计算（例 8） */
export function taxiFare(km: string): string {
  const k = ceilDec(km)
  return k <= 3 ? '8' : addDec('8', mulDec('1.5', String(k - 3)))
}
/** 例 8 的 6.3 千米与回顾反思的 2、7.8 千米，另有几个距离 */
export const TAXI_T1 = ['6.3', '3.1', '4.5', '7.8']
export const TAXI_T2 = ['2', '2.5', '3', '5', '5.2', '8.4', '9.6', '10']
function taxiWrongs(km: string): string[] {
  const k = ceilDec(km)
  const over = subDec(km, '3')
  const out = [mulDec('1.5', String(k)), addDec('8', mulDec('1.5', String(k)))]
  if (cmpDec(over, '0') > 0) out.unshift(addDec('8', mulDec('1.5', over)), addDec('8', mulDec('1.5', String(Math.max(0, k - 4)))))
  return out
}
function qTaxi(kpId: string, d: Difficulty, rng: RNG, km: string): Question {
  return ansQ(kpId, d, `taxi-${km}`, [T('taxi.rule'), T('taxi.q', { d: km })], taxiFare(km), taxiWrongs(km), rng)
}
/** 例 8：6.3 千米要按 7 千米算，超过 3 千米的部分按 4 千米算 */
function qTaxiKm(kpId: string, d: Difficulty, rng: RNG): Question {
  const km = rng.pick(TAXI_T1)
  const k = ceilDec(km)
  if (rng.chance(0.5)) return numQ(kpId, d, `taxikm-all-${km}`, [T('taxi.rule'), T('taxi.all', { d: km })], k, rng, [k - 1, k + 1])
  return numQ(kpId, d, `taxikm-over-${km}`, [T('taxi.rule'), T('taxi.over', { d: km })], k - 3, rng, [k - 4, k, k - 2].filter((x) => x >= 0))
}
/** 例 8 的线段图：0 千米到 7 千米，括出 0–3 千米「8 元」、3–4 千米「1.5 元」，整条「? 元」；也画到 5、6、8 千米 */
function qTaxiLine(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.chance(0.5) ? 7 : rng.pick([5, 6, 8])
  const parts: PartSeg[] = [{ len: 3, label: '8 元' }, { len: 1, label: '1.5 元' }]
  if (k > 4) parts.push({ len: k - 4, label: '' })
  const names = ['0 km', '3 km', '', `${k} km`].slice(0, parts.length + 1)
  if (k === 4) names[2] = '4 km'
  const line: StemPart = { kind: 'fare-line', parts, total: '? 元', names, ticks: 1, tail: true }
  return ansQ(kpId, d, `taxiline-${k}`, [T('taxi.ruleLine'), T('taxi.line', { k }), line], taxiFare(String(k)), taxiWrongs(String(k)), rng)
}
/** 回顾反思的价格表（1–8 千米）：从表里看行驶几千米要付多少元 */
const fareTable = (): StemPart => ({
  kind: 'stat-table',
  head: 'col',
  rows: [
    [L('th.km'), ...[1, 2, 3, 4, 5, 6, 7, 8].map(String)],
    [L('th.fare'), ...[1, 2, 3, 4, 5, 6, 7, 8].map((k) => taxiFare(String(k)))],
  ],
})
export const TABLE_KM = ['2', '7.8', '5.5', '4.2', '6.7']
function qTaxiTable(kpId: string, d: Difficulty, rng: RNG): Question {
  const km = rng.pick(TABLE_KM)
  return ansQ(kpId, d, `taxitable-${km}`, [T('taxi.table', { d: km }), fareTable()], taxiFare(km), taxiWrongs(km), rng)
}
/** 水费：每月用水 12 吨及以内每吨 2.5 元，超过 12 吨的部分每吨 3.8 元（做一做 2：11 吨、17 吨） */
export function waterFee(t: number): string {
  return t <= 12 ? mulDec('2.5', String(t)) : addDec('30', mulDec('3.8', String(t - 12)))
}
export const WATER = [11, 17, 8, 10, 15, 20]
function qWater(kpId: string, d: Difficulty, rng: RNG): Question {
  const t = rng.chance(0.4) ? rng.pick([11, 17]) : rng.pick(WATER)
  const wrongs = [mulDec('2.5', String(t)), mulDec('3.8', String(t)), addDec('30', mulDec('3.8', String(t)))]
  return ansQ(kpId, d, `water-${t}`, [T('water.rule'), T('water.q', { t })], waterFee(t), wrongs, rng)
}
/** 停车费：1 小时及以内 5 元，超过 1 小时的部分每小时 2.5 元，不足 1 小时按 1 小时（练习四 9 (2)：4.5 小时 15 元） */
export function parkFee(h: string): string {
  const k = ceilDec(h)
  return k <= 1 ? '5' : addDec('5', mulDec('2.5', String(k - 1)))
}
export const PARK = ['4.5', '0.5', '1.5', '2.2', '3.2', '5']
function qPark(kpId: string, d: Difficulty, rng: RNG): Question {
  const h = rng.chance(0.4) ? '4.5' : rng.pick(PARK)
  const k = ceilDec(h)
  const wrongs = [mulDec('2.5', String(k)), addDec('5', mulDec('2.5', String(k))), cmpDec(h, '1') > 0 ? addDec('5', mulDec('2.5', subDec(h, '1'))) : '7.5']
  return ansQ(kpId, d, `park-${h}`, [T('park.rule'), T('park.q', { h })], parkFee(h), wrongs, rng)
}

function tiered(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 8（6.3 千米、按几千米算、线段图）、回顾反思的价格表、做一做 2（水费）
    if (roll < 0.25) return qTaxi(K_TIER, d, rng, rng.chance(0.5) ? '6.3' : rng.pick(TAXI_T1))
    if (roll < 0.43) return qTaxiKm(K_TIER, d, rng)
    if (roll < 0.58) return qTaxiLine(K_TIER, d, rng)
    if (roll < 0.75) return qTaxiTable(K_TIER, d, rng)
    return qWater(K_TIER, d, rng)
  }
  if (d === 2) {
    // 别的里程、用水量，练习四 9 (2) 停车费
    if (roll < 0.4) return qTaxi(K_TIER, d, rng, rng.pick(TAXI_T2))
    if (roll < 0.7) return qWater(K_TIER, d, rng)
    return qPark(K_TIER, d, rng)
  }
  if (roll < 0.5) return qPark(K_TIER, d, rng)
  return qTaxi(K_TIER, d, rng, rng.pick(['9.6', '10', '8.4']))
}
defineGenerator(K_TIER, tiered)
