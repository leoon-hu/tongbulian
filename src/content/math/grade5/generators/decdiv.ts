import type { Difficulty, DivLine, DivMark, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { DOT_ABOVE, repeating } from '@/engine/fraction'

// ─────────────────────────────────────────────────────────────
// 小数除法（五上第三单元，新教材 p24–38；五年级数学 C）：四个知识点。
// 除数是整数的小数除法：例 1（22 ÷ 4、22.4 ÷ 4，余下 2 元转化为 20 角，商的小数点和被除数的小数点对齐）、例 2（3 ÷ 4 不够商 1 商 0、
//   添 0 继续除）、两个做一做；练习五 1–3、7、9–13。
// 循环小数：例 3（400 ÷ 75 = 5.333…，余数总是 25）、试一试（28 ÷ 18、78.6 ÷ 11）、循环小数 / 循环节 / 简便写法 / 有限小数和无限小数、
//   做一做 1、3（几分之七）；练习五 4（循环小数保留三位）、14（几分之十一）、15（比大小）。
// 一个数除以小数：例 4（7.65 ÷ 0.85：单位换算、商不变的规律，移动小数点）、例 5（12.6 ÷ 0.28，被除数末尾补 0）、做一做；练习六；
//   练习七 1、4、6、10。
// 商的近似数：例 3 做一做 2（除不尽的保留两位小数）、练习五 5、6、8、练习七 2（按要求保留几位小数），例 6（32 ÷ 2.7 精确到分；
//   2.7 ÷ 0.8 装满 3 瓶、要准备 4 个瓶子）和做一做（丝带）、练习七 3、5、7。
// 作答：商是整数的用数字键盘（或整数选项），小数、循环小数、近似数一律是选项卡（G14）；干扰项照课本暴露的错法造——
// 商漏点小数点、商的小数点没对齐（扩大 / 缩小 10 倍）、商中间漏写 0、没添 0 继续除、余数写在小数点后面、只移除数的小数点、
// 被除数的小数点多移 / 少移；近似数的干扰项是没四舍五入（直接去尾）、保留的位数不对、保留两位时去掉了末尾的 0（1.20 写成 1.2，考写法，允许）。
// 数一律用课本的数（每个不同的小数都是一条朗读音频）；例 6 换数的几组（红小豆、丝带）是自己定的，报告里写着。
// 竖式照课本逐题画（LongDivision 的小数模式）：被除数是整数而要添 0 继续除的，被除数上不写 .0（例 1 的 22、例 3 的 400）。
// 朗读：题干单位写汉字；不写「长」（「菜地的长度」）、「重」（「体重是」）、括号（要求另起一句「得数保留两位小数。」）。
// ─────────────────────────────────────────────────────────────

const K1 = 'm5s1-03-int-divisor'
const K2 = 'm5s1-03-repeating'
const K3 = 'm5s1-03-dec-divisor'
const K4 = 'm5s1-03-approx'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k: `m5.ddiv.${k}`, p } : { k: `m5.ddiv.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })
const YES = L('yes')
const NO = L('no')

// ══ 数：有理数（分子 / 分母都是安全整数），免得浮点误差 ══

export interface Rat {
  n: number
  d: number
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
const rat = (n: number, d: number): Rat => {
  const g = gcd(n, d) || 1
  return { n: n / g, d: d / g }
}
/** '22.4' → 224/10（约分） */
export const R = (s: string): Rat => {
  const [i = '0', f = ''] = s.split('.')
  return rat(Number(i + f), 10 ** f.length)
}
export const quo = (a: Rat, b: Rat): Rat => rat(a.n * b.d, a.d * b.n)
const times = (a: Rat, k: number): Rat => rat(a.n * k, a.d)
const eq = (a: Rat, b: Rat): boolean => a.n * b.d === b.n * a.d
const less = (a: Rat, b: Rat): boolean => a.n * b.d < b.n * a.d
/** 小数位数 */
const places = (s: string): number => (s.split('.')[1] ?? '').length

/** 小数展开：整数部分、不循环的小数部分、循环节（有限小数的循环节是空串） */
export function expand(r: Rat): { int: string; pre: string; rep: string } {
  const int = Math.floor(r.n / r.d)
  let rem = r.n % r.d
  const seen = new Map<number, number>()
  const digits: string[] = []
  while (rem !== 0 && !seen.has(rem)) {
    seen.set(rem, digits.length)
    rem *= 10
    digits.push(String(Math.floor(rem / r.d)))
    rem %= r.d
  }
  if (rem === 0) return { int: String(int), pre: digits.join(''), rep: '' }
  const at = seen.get(rem)!
  return { int: String(int), pre: digits.slice(0, at).join(''), rep: digits.slice(at).join('') }
}
/** 一个数的写法：有限小数去掉末尾的 0（课本结论），循环小数用简便写法（循环节首末位上面点圆点） */
export function show(r: Rat): string {
  const e = expand(r)
  if (e.rep) return repeating(e.int, e.pre, e.rep)
  return e.pre ? `${e.int}.${e.pre}` : e.int
}
/** 循环小数的完整写法（课本：一位的循环节写三遍、几位的写两遍，后面跟「…」）：5.333…、7.14545… */
export function full(r: Rat): string {
  const e = expand(r)
  if (!e.rep) return show(r)
  return `${e.int}.${e.pre}${e.rep.repeat(e.rep.length === 1 ? 3 : 2)}…`
}
const isFinite10 = (r: Rat): boolean => !expand(r).rep
const fixed = (scaled: number, p: number): string => {
  if (p === 0) return String(scaled)
  const s = String(scaled).padStart(p + 1, '0')
  return `${s.slice(0, -p)}.${s.slice(-p)}`
}
/** 保留 p 位小数（四舍五入，末尾的 0 不去掉：1.20） */
export const roundTo = (r: Rat, p: number): string => fixed(Math.floor((2 * r.n * 10 ** p + r.d) / (2 * r.d)), p)
/** 去尾到 p 位（没四舍五入的错法） */
export const floorTo = (r: Rat, p: number): string => fixed(Math.floor((r.n * 10 ** p) / r.d), p)

// ══ 竖式（LongDivision 的小数模式）══

/**
 * 按课本的写法算出竖式的每一行（除数已经是整数）：digits 是被除数照写的各位（含添上 / 补上的 0），pt = 整数部分几位
 * （除数是小数时是移动以后的）；最高位不够除就往后多看一位（不写商）；个位还不够商 1 就商 0；每一位的乘积写在这一位下面、画横线，
 * 差和落下来的一位合起来写成下一行（差是 0 时只写落下来的数）；中间某一位不够除商 0、不写乘积；除尽了最后一行写 0，
 * 除不尽的除到小数点后 maxPlaces 位为止，最后一行写余数。
 */
export function divWork(divisor: number, digits: number[], pt: number, maxPlaces = 4): { quotient: DivLine; rows: DivLine[]; cols: number; rem: number } {
  const at = (c: number): number => (c < digits.length ? digits[c]! : 0)
  const q: (string | undefined)[] = []
  const rows: DivLine[] = []
  let i = 0
  let cur = at(0)
  while (cur < divisor && i < pt - 1) {
    i += 1
    cur = cur * 10 + at(i)
  }
  let first = true
  for (;;) {
    const dgt = Math.floor(cur / divisor)
    if (dgt === 0) {
      if (!first || i >= pt - 1) q[i] = '0'
    } else {
      q[i] = String(dgt)
      if (!first) rows.push({ text: String(cur), end: i })
      rows.push({ text: String(dgt * divisor), end: i, line: true })
      cur -= dgt * divisor
      first = false
    }
    const last = i >= digits.length - 1
    if (last && cur === 0 && !first) {
      rows.push({ text: '0', end: i })
      break
    }
    if (last && i - pt + 1 >= maxPlaces) {
      rows.push({ text: String(cur), end: i })
      break
    }
    i += 1
    cur = cur * 10 + at(i)
  }
  const cols = q.length
  const from = q.findIndex((x) => x !== undefined)
  let text = ''
  for (let c = from; c < cols; c++) text += `${c === pt && c > from ? '.' : ''}${q[c] ?? ' '}`
  return { quotient: { text, end: cols - 1 }, rows, cols, rem: cur }
}

/** 一道除法：照课本写的被除数（shown，含补上的 0）、除数；除数是小数时 moved = 移动以后整数部分几位 */
interface Div {
  a: string
  b: string
}
/** 被除数照写（除数是小数时末尾补上不够的 0）、移动以后整数部分几位、补了几个 0、除数变成的整数 */
function layoutOf({ a, b }: Div): { shown: string; pt: number; pad: number; divisor: number; moved?: number } {
  const k = places(b)
  const intLen = a.split('.')[0]!.length
  const pa = places(a)
  const pad = Math.max(0, k - pa)
  const shown = a + '0'.repeat(pad)
  const divisor = Number(b.replace('.', ''))
  if (!k) return { shown, pt: intLen, pad, divisor }
  return { shown, pt: intLen + k, pad, divisor, moved: intLen + k }
}
/** 算好的竖式（课本例题的图）：hl = 绿底标出哪几行（按 rows 下标，标前面几个字），boxed = 商的第几个数字画红框 */
function workFigure(div: Div, o: { maxPlaces?: number; hl?: (rows: DivLine[]) => DivMark[]; boxed?: number; noDot?: boolean } = {}): StemPart {
  const lay = layoutOf(div)
  // 例 2 的 3 ÷ 4：课本把被除数写成「3.0」（添上的 0 是红字）
  if (div.a === '3' && div.b === '4') Object.assign(lay, { shown: '3.0', pad: 1 })
  const digits = lay.shown.replace('.', '').split('').map(Number)
  const w = divWork(lay.divisor, digits, lay.pt, o.maxPlaces)
  // 例 1 的 22 ÷ 4 只写到余数（5 余 2）：商不带小数点
  const quotient = o.noDot ? { ...w.quotient, text: w.quotient.text.replace('.', '') } : w.quotient
  return {
    kind: 'dec-division',
    divisor: div.b,
    dividend: lay.shown,
    quotient,
    rows: w.rows,
    cols: Math.max(w.cols, digits.length),
    ...(lay.moved !== undefined ? { moved: lay.moved } : {}),
    ...(lay.pad ? { pad: lay.pad } : {}),
    ...(o.hl ? { hl: o.hl(w.rows) } : {}),
    ...(o.boxed !== undefined ? { boxed: o.boxed } : {}),
  }
}
/** 只有题目的竖式：除数是小数的照课本划好小数点、补好 0，商那一行是要填的空（和移动后的整数部分一样宽，不透露商有几位） */
function askFigure(div: Div): StemPart {
  const lay = layoutOf(div)
  return {
    kind: 'dec-division',
    divisor: div.b,
    dividend: lay.shown,
    quotient: { text: '?', end: lay.pt - 1, w: lay.pt },
    ...(lay.moved !== undefined ? { moved: lay.moved } : {}),
    ...(lay.pad ? { pad: lay.pad } : {}),
  }
}
/** 只写题目的竖式（不划、不填）：「用竖式计算」 */
const plainFigure = ({ a, b }: Div): StemPart => ({ kind: 'dec-division', divisor: b, dividend: a })
const exprOf = ({ a, b }: Div, tail = ' = ?'): string => `${a} ÷ ${b}${tail}`
const valueOf = ({ a, b }: Div): Rat => quo(R(a), R(b))

// ══ 选项：小数答案的干扰项 ══

/** 和正确答案同样写法的邻近数：最后一位 ±1、±2（末位变成 0 的不要：课本会把它写短） */
function neighbors(s: string): string[] {
  const p = places(s)
  const v = R(s)
  const out: string[] = []
  for (const k of [1, -1, 2, -2, 3]) {
    const scaled = Math.round((v.n * 10 ** p) / v.d) + k
    if (scaled <= 0) continue
    const t = fixed(scaled, p)
    if (p > 0 && t.endsWith('0')) continue
    out.push(t)
  }
  return out
}
/** 去掉末尾多余的 0（干扰项按课本结论写） */
const tidy = (s: string): string => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s)
/**
 * 干扰项：按顺序取错法算出的数（cands：课本暴露的错法排在前面），和正确答案、彼此都不相等；
 * 至少有一个和正确答案一样多位小数（不让孩子从写法上认出答案：没有就把最后一个换成一样位数的错法或邻近的数）；
 * sameValue = 允许和正确答案等值的写法（近似数考写法：1.20 写成 1.2）
 */
function wrongsOf(correct: string, cands: (string | null | undefined)[], count = 3, sameValue: string[] = []): string[] {
  const cv = R(correct)
  const p = places(correct)
  const out: string[] = []
  const ok = (s: string): boolean => /^\d+(?:\.\d+)?$/.test(s) && R(s).n > 0 && s !== correct && !out.includes(s)
  const fresh = (s: string): boolean => !eq(R(s), cv) && !out.some((x) => eq(R(x), R(s)))
  for (const s of sameValue) if (out.length < count && ok(s) && !out.some((x) => eq(R(x), R(s)))) out.push(s)
  const pool = [...cands.filter((s): s is string => !!s), ...neighbors(correct)]
  for (const s of pool) if (out.length < count && ok(s) && fresh(s)) out.push(s)
  if (!out.some((s) => places(s) === p && !eq(R(s), cv))) {
    const same = pool.find((s) => ok(s) && fresh(s) && places(s) === p)
    if (same) {
      if (out.length >= count) out.pop()
      out.push(same)
    }
  }
  return out
}

/** 商的错法（都按课本写法写出来）：商的小数点没对齐（× 10、÷ 10）、中间漏写 0、没添 0 继续除、余数写在小数点后面、只移除数的小数点 */
function quotientErrors(div: Div): string[] {
  const v = valueOf(div)
  const s = show(v)
  const out: string[] = []
  // 被除数是整数、除数是整数：余数写在小数点后面（22 ÷ 4 写成 5.2）
  if (!div.a.includes('.') && !div.b.includes('.')) {
    const a = Number(div.a)
    const b = Number(div.b)
    if (a % b) out.push(`${Math.floor(a / b)}.${a % b}`)
  }
  // 漏写 0：「2.03」写成「2.3」、「10.5」写成「1.5」、「0.09」写成「0.9」
  if (s.includes('.')) {
    const digits = s.replace('.', '')
    const intLen = s.split('.')[0]!.length
    const m = /([1-9])(0+)(?=[1-9])/.exec(digits)
    if (m) {
      const at = m.index + 1
      const dropped = digits.slice(0, at) + digits.slice(at + m[2]!.length)
      const newInt = at < intLen ? Math.max(1, intLen - m[2]!.length) : intLen
      out.push(tidy(`${dropped.slice(0, newInt)}.${dropped.slice(newInt)}`))
    }
    if (/^0\.0+[1-9]/.test(s)) out.push(s.replace(/^0\.0+/, '0.'))
  }
  // 没添 0 继续除：停在被除数（移动以后）的最后一位
  const lay = layoutOf(div)
  const shownPlaces = Math.max(0, lay.shown.replace('.', '').length - lay.pt)
  if (places(s) > shownPlaces) out.push(tidy(floorTo(v, shownPlaces)))
  // 除数是小数：只移除数的小数点、被除数没动（商缩小了）
  const k = places(div.b)
  if (k) out.push(show(rat(v.n, v.d * 10 ** k)))
  // 商的小数点没对齐：扩大 10 倍、缩小到 1/10
  out.push(show(times(v, 10)), show(rat(v.n, v.d * 10)))
  return out.filter((x) => !x.includes(DOT_ABOVE))
}

/** 出一道得数题：整数用数字键盘（或整数选项），小数用选项卡 */
function answerQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: Rat, cands: string[], rng: RNG, o: { numpad?: boolean; type?: QuestionType } = {}): Question {
  const type = o.type ?? 'dec-calc'
  if (value.d === 1) {
    const n = value.n
    const smart = cands.filter((s) => /^\d+$/.test(s)).map(Number).filter((x) => x !== n)
    return numberQuestion({ kpId, type, difficulty: d, sig, stem, value: n, rng, min: 0, max: Math.max(99, n * 11), smart, ...(o.numpad ? { input: 'numpad' as const } : {}) })
  }
  const correct = show(value)
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: wrongsOf(correct, cands), rng })
}
/** 判断题：……，对吗？（对 / 不对） */
const tf = (kpId: string, d: Difficulty, sig: string, stem: StemPart[], ok: boolean, rng: RNG, type: QuestionType = 'dec-calc'): Question =>
  labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: ok ? YES : NO, distractors: [ok ? NO : YES], rng })
/** 比一比，填 >、< 或 = */
function cmpQ(kpId: string, d: Difficulty, sig: string, left: string, right: string, x: Rat, y: Rat, rng: RNG): Question {
  const correct = less(x, y) ? '<' : less(y, x) ? '>' : '='
  return labelQuestion({ kpId, type: 'compare', difficulty: d, sig, stem: [T('compare'), E(`${left} ○ ${right}`)], correct, distractors: ['>', '<', '='].filter((s) => s !== correct), rng })
}
const D = (a: string, b: string): Div => ({ a, b })

// ══ 除数是整数的小数除法（m5s1-03-int-divisor）══

/** 例 1、例 2 和做一做里的除法 */
export const EX1 = [D('22', '4'), D('22.4', '4')]
export const EX2 = D('3', '4')
/** 做一做 1：上下两行对照（42 ÷ 3 = 14 → 4.2 ÷ 3） */
export const PAIRS: [Div, Div][] = [
  [D('42', '3'), D('4.2', '3')],
  [D('84', '4'), D('8.4', '4')],
  [D('154', '14'), D('15.4', '14')],
]
/** 例 1 后做一做 2、例 2 后做一做 1 */
export const DO_INT = [D('72', '15'), D('9', '4'), D('14.21', '7'), D('25.5', '6'), D('6.8', '5'), D('0.54', '6'), D('6.3', '14'), D('3.45', '15'), D('12', '16'), D('2', '25'), D('1.26', '28'), D('0.416', '32')]
/** 练习五 1、3 */
export const P5_CALC = [D('43.5', '29'), D('6.6', '4'), D('18.9', '27'), D('1.35', '15'), D('28.6', '11'), D('37.5', '6'), D('20.4', '24'), D('3.64', '52'), D('15.6', '12'), D('328', '16'), D('1.08', '27'), D('0.646', '19')]
/** 练习五 12：哪些题的商小于 1 */
export const P5_LESS1 = [D('12', '8'), D('1.8', '12'), D('10', '25'), D('0.27', '9'), D('5.04', '6'), D('76.5', '45'), D('45', '36'), D('0.84', '28')]

/** 计算一道（第 1 档有一半画出课本的竖式头：用竖式计算） */
function qCalc(kpId: string, d: Difficulty, rng: RNG, div: Div, tag: string): Question {
  const value = valueOf(div)
  const vertical = d === 1 && rng.chance(0.5)
  // 画竖式的也写出横式（竖式不朗读）；数字键盘题按的数填在竖式商那一行，横式就不写「= ?」
  if (value.d === 1) return answerQ(kpId, d, `${tag}-${div.a}/${div.b}${vertical ? '-v' : ''}`, vertical ? [T('vcalc'), E(exprOf(div, '')), askFigure(div)] : [T('calc'), E(exprOf(div))], value, quotientErrors(div), rng, { numpad: vertical })
  const stem = vertical ? [T('vcalc'), E(exprOf(div)), plainFigure(div)] : [T('calc'), E(exprOf(div))]
  return answerQ(kpId, d, `${tag}-${div.a}/${div.b}${vertical ? '-v' : ''}`, stem, value, quotientErrors(div), rng)
}

/** 例 1 (1)(2)、例 2 做一做 2：平均每人兑换了多少元 / 平均每本多少元 */
function qEx1Money(d: Difficulty, rng: RNG): Question {
  const which = rng.int(0, 2)
  const div = which === 2 ? D('99.8', '4') : EX1[which]!
  const stem = which === 2 ? [T('ex1.books')] : [T('ex1.ask', { g: L(`ex1.g${which + 1}`), m: div.a })]
  return answerQ(K1, d, `ex1-${div.a}`, stem, valueOf(div), quotientErrors(div), rng)
}
/** 例 1 的红框：商里这一位表示几元 / 几角 / 几分（22 ÷ 4 = 5.5、22.4 ÷ 4 = 5.6、99.8 ÷ 4 = 24.95） */
function qMoneyDigit(d: Difficulty, rng: RNG): Question {
  const div = rng.pick([EX1[0]!, EX1[1]!, D('99.8', '4')])
  const q = show(valueOf(div))
  const [ip, fp = ''] = q.split('.')
  // 能框的位：个位（元）、十分位（角）、百分位（分）
  const spots = [{ at: ip!.length - 1, unit: 'yuan' }, ...[...fp].map((_, k) => ({ at: ip!.length + k, unit: k === 0 ? 'jiao' : 'fen' }))]
  const spot = rng.pick(spots)
  const digit = q.replace('.', '')[spot.at]!
  const opt = (u: string): LStr => L(`money.${u}`, { n: digit })
  return labelQuestion({
    kpId: K1,
    type: 'dec-calc',
    difficulty: d,
    sig: `digit-${div.a}-${spot.at}`,
    stem: [T('ex1.boxed', { m: div.a, n: digit }), workFigure(div, { boxed: spot.at })],
    correct: opt(spot.unit),
    distractors: ['yuan', 'jiao', 'fen'].filter((u) => u !== spot.unit).map(opt),
    rng,
  })
}
/** 例 1 (1) 的第一个竖式：4 名同学分 22 元，每人 5 元还剩 2 元——剩下的 2 元转化为多少角继续分 */
function qEx1Rest(d: Difficulty, rng: RNG): Question {
  return numberQuestion({ kpId: K1, type: 'dec-calc', difficulty: d, sig: 'ex1-rest', stem: [T('ex1.rest'), workFigure(EX1[0]!, { maxPlaces: 0, noDot: true })], value: 20, rng, min: 0, max: 99, smart: [2, 200, 10] })
}
/**
 * 竖式里涂色的那一行表示几个 0.1 / 0.01（例 1 (2)「24 个 0.1」、例 2「添 0 继续除，表示 20 个（　）」）：
 * 从课本的竖式里挑小数部分的一行（落下来的数和余数合起来的那一行），它的末位在哪一位就是几个多少
 */
function qUnits(d: Difficulty, rng: RNG, pool: Div[]): Question {
  for (let tries = 0; tries < 20; tries++) {
    const div = rng.pick(pool)
    const lay = layoutOf(div)
    const digits = lay.shown.replace('.', '').split('').map(Number)
    const w = divWork(lay.divisor, digits, lay.pt)
    // 小数部分里「差和落下来的数」那一行（不是乘积、不是最后的 0）
    const cand = w.rows.map((r, i) => ({ r, i })).filter(({ r, i }) => !r.line && i < w.rows.length - 1 && r.end >= lay.pt && r.end - lay.pt <= 2)
    if (!cand.length) continue
    const { r, i } = rng.pick(cand)
    const unit = ['0.1', '0.01', '0.001'][r.end - lay.pt]!
    const others = ['1', '0.1', '0.01', '0.001'].filter((u) => u !== unit)
    return labelQuestion({
      kpId: K1,
      type: 'dec-calc',
      difficulty: d,
      sig: `units-${div.a}/${div.b}-${i}`,
      stem: [T('units', { e: `${div.a} ÷ ${div.b}`, n: r.text }), workFigure(div, { hl: () => [[i, r.text.length]] })],
      correct: unit,
      distractors: rng.shuffle(others).slice(0, 2),
      rng,
    })
  }
  return qCalc(K1, d, rng, rng.pick(pool), 'calc')
}
/** 例 2 的「添上 0，表示 30 个 0.1」：被除数末尾添上的 0（红字），这时被除数表示多少个 0.1 */
function qAddZero(d: Difficulty, rng: RNG): Question {
  return labelQuestion({
    kpId: K1,
    type: 'dec-calc',
    difficulty: d,
    sig: 'ex2-30',
    stem: [T('ex2.zero'), { kind: 'dec-division', divisor: '4', dividend: '3.0', pad: 1 }],
    correct: '0.1',
    distractors: ['1', '0.01'],
    rng,
  })
}
/** 做一做 1：先算整数除法，被除数缩小到原来的 1/10，商也一样（42 ÷ 3 = 14 → 4.2 ÷ 3 = 1.4） */
function qPattern(d: Difficulty, rng: RNG): Question {
  const [big, small] = rng.pick(PAIRS)
  const v = valueOf(small)
  return labelQuestion({
    kpId: K1,
    type: 'dec-calc',
    difficulty: d,
    sig: `pair-${small.a}`,
    stem: [E(`${exprOf(big, '')} = ${show(valueOf(big))}`), T('pattern'), E(exprOf(small))],
    correct: show(v),
    distractors: wrongsOf(show(v), [show(times(v, 10)), show(rat(v.n, v.d * 10))]),
    rng,
  })
}
/** 例 2：个位上不够商 1，商的个位上写几（商 0） */
export const ONES_ZERO = [D('3', '4'), D('2', '25'), D('12', '16'), D('0.54', '6'), D('1.26', '28'), D('0.416', '32'), D('6.3', '14')]
function qOnes(d: Difficulty, rng: RNG): Question {
  const div = rng.pick(ONES_ZERO)
  return numberQuestion({ kpId: K1, type: 'dec-calc', difficulty: d, sig: `ones-${div.a}/${div.b}`, stem: [T('ones', { e: `${div.a} ÷ ${div.b}` }), plainFigure(div)], value: 0, rng, min: 0, max: 9, input: 'numpad' })
}
/** 例 2「怎样验算呢」：用乘法验算——商 × 除数 = 被除数（被除数是整数的用数字键盘），或者选验算的算式 */
export const CHECKS = [D('3', '4'), D('22', '4'), D('12', '16'), D('2', '25'), D('9', '4'), D('72', '15'), D('328', '16')]
function qCheck(d: Difficulty, rng: RNG): Question {
  const div = rng.pick(CHECKS)
  const q = show(valueOf(div))
  if (rng.chance(0.5)) {
    return numberQuestion({ kpId: K1, type: 'dec-calc', difficulty: d, sig: `check-${div.a}/${div.b}`, stem: [T('check.calc'), E(`${div.a} ÷ ${div.b} = ${q}`), E(`${q} × ${div.b} = ?`)], value: Number(div.a), rng, min: 0, max: 999, smart: [Number(div.a) * 10, Number(div.b), Math.round(Number(div.a) / 10)].filter((x) => x > 0), input: 'numpad' })
  }
  return labelQuestion({
    kpId: K1,
    type: 'dec-calc',
    difficulty: d,
    sig: `checkwhich-${div.a}/${div.b}`,
    stem: [T('check.which'), E(`${div.a} ÷ ${div.b} = ${q}`)],
    correct: `${q} × ${div.b}`,
    distractors: [`${q} + ${div.b}`, `${q} ÷ ${div.b}`, `${div.a} × ${div.b}`],
    rng,
  })
}
/** 法则：商的小数点和谁的小数点对齐；除到被除数的末尾还有余数怎么办 */
function qRule1(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    return labelQuestion({ kpId: K1, type: 'dec-calc', difficulty: d, sig: 'rule-align', stem: [T('rule.align')], correct: L('rule.dividend'), distractors: [L('rule.divisor')], rng })
  }
  return labelQuestion({
    kpId: K1,
    type: 'dec-calc',
    difficulty: d,
    sig: 'rule-rest',
    stem: [T('rule.rest')],
    correct: L('rule.addZero'),
    distractors: [L('rule.stop'), L('rule.tail')],
    rng,
  })
}

/** 练习五 2 的改错（课本两道都错）+ 课本做一做、练习里算对了的竖式（判断「对吗」） */
interface Fix {
  div: Div
  /** 写错的商（按列排：数字串、小数点照写错的样子；不填 = 算对了） */
  shown?: DivLine
  rows?: DivLine[]
  cols?: number
}
export const FIX_5: Fix[] = [
  // 24 ÷ 15 = 16：商漏点小数点（16 写在个位、十分位上）
  { div: D('24', '15'), shown: { text: '16', end: 2 }, rows: [{ text: '15', end: 1, line: true }, { text: '90', end: 2 }, { text: '90', end: 2, line: true }, { text: '0', end: 2 }], cols: 3 },
  // 1.26 ÷ 18 = 0.7：十分位不够商 1 没商 0，7 写在了十分位上
  { div: D('1.26', '18'), shown: { text: '0.7', end: 1 }, rows: [{ text: '126', end: 2, line: true }, { text: '0', end: 2 }], cols: 3 },
]
function fixFigure(f: Fix): StemPart {
  if (!f.shown) return workFigure(f.div)
  return { kind: 'dec-division', divisor: f.div.b, dividend: f.div.a, quotient: f.shown, rows: f.rows, cols: f.cols }
}
function qFix(kpId: string, d: Difficulty, rng: RNG, wrong: Fix[], right: Div[]): Question {
  const bad = rng.chance(0.6)
  const f: Fix = bad ? rng.pick(wrong) : { div: rng.pick(right) }
  if (bad && rng.chance(0.5)) {
    // 正确的商是多少
    const v = valueOf(f.div)
    const shownText = f.shown!.text
    return answerQ(kpId, d, `fixans-${f.div.a}/${f.div.b}`, [T('fix.answer'), fixFigure(f)], v, [shownText, ...quotientErrors(f.div)], rng)
  }
  return tf(kpId, d, `fix-${f.div.a}/${f.div.b}${bad ? '-bad' : ''}`, [T('fix.judge'), fixFigure(f)], !bad, rng)
}

/** 练习五 7：青蛙连续 3 次共跳 7.74 米 */
const qFrog = (d: Difficulty, rng: RNG): Question => answerQ(K1, d, 'frog', [T('frog')], valueOf(D('7.74', '3')), quotientErrors(D('7.74', '3')), rng)
/** 练习五 10：班费 24.2 元 + 卖废品 16.4 元，正好买 7 本《少年科技》/ 14 根跳绳 */
function qClassFund(d: Difficulty, rng: RNG): Question {
  const book = rng.chance(0.5)
  const div = D('40.6', book ? '7' : '14')
  const v = valueOf(div)
  const cands = [...quotientErrors(div), show(quo(R('24.2'), R(div.b))), show(quo(R('16.4'), R(div.b)))].filter((s) => !s.includes(DOT_ABOVE))
  return answerQ(K1, d, `fund-${book ? 'book' : 'rope'}`, [T(book ? 'fund.book' : 'fund.rope')], v, cands, rng)
}
/** 练习五 11：登山全程 7.2 千米，上山 3 小时、下山 2 小时；全程的平均速度（第 3 档：往返的路程除以往返的时间，不是两个速度的平均数） */
function qClimb(d: Difficulty, rng: RNG, all = false): Question {
  if (all) {
    const v = quo(R('14.4'), R('5'))
    return answerQ(K1, d, 'climb-all', [T('climb.all')], v, ['3', '2.4', '3.6', '1.44', '28.8'], rng)
  }
  const up = rng.chance(0.5)
  const div = D('7.2', up ? '3' : '2')
  return answerQ(K1, d, `climb-${up ? 'up' : 'down'}`, [T(up ? 'climb.up' : 'climb.down')], valueOf(div), quotientErrors(div), rng)
}
/** 练习五 12：下面哪个算式的商比 1 小（或比 1 大） */
function qLess1(d: Difficulty, rng: RNG): Question {
  const small = P5_LESS1.filter((x) => less(valueOf(x), rat(1, 1)))
  const big = P5_LESS1.filter((x) => !less(valueOf(x), rat(1, 1)))
  const askSmall = rng.chance(0.5)
  const [pickFrom, others] = askSmall ? [small, big] : [big, small]
  const right = rng.pick(pickFrom)
  const wrong = rng.shuffle(others).slice(0, 3)
  return labelQuestion({
    kpId: K1,
    type: 'dec-calc',
    difficulty: d,
    sig: `less1-${askSmall ? 's' : 'b'}-${right.a}/${right.b}`,
    stem: [T(askSmall ? 'less1' : 'more1')],
    correct: exprOf(right, ''),
    distractors: wrong.map((x) => exprOf(x, '')),
    rng,
  })
}
/** 练习五 9：填表（被除数、除数、商；1.5 ÷ 5 = 0.3、15 ÷ □ = 0.3、□ ÷ 500 = 0.3），一次问一格 */
function qTable9(d: Difficulty, rng: RNG): Question {
  const ask = rng.int(0, 2)
  const cols: [string, string, string][] = [
    ['1.5', '5', '0.3'],
    ['15', '50', '0.3'],
    ['150', '500', '0.3'],
  ]
  const hidden: [number, number][] = [
    [2, 0],
    [1, 1],
    [0, 2],
  ]
  const [row, col] = hidden[ask]!
  const rows: (LStr | number | null)[][] = [
    [L('t.dividend'), ...cols.map((c) => c[0])],
    [L('t.divisor'), ...cols.map((c) => c[1])],
    [L('t.quotient'), ...cols.map((c) => c[2])],
  ]
  rows[row]![col + 1] = null
  const stem: StemPart[] = [T('table9'), { kind: 'stat-table', head: 'col', rows }]
  if (ask === 0) return labelQuestion({ kpId: K1, type: 'dec-calc', difficulty: d, sig: 'table9-q', stem, correct: '0.3', distractors: ['3', '0.03', '0.5'], rng })
  return numberQuestion({ kpId: K1, type: 'dec-calc', difficulty: d, sig: `table9-${ask}`, stem, value: ask === 1 ? 50 : 150, rng, min: 0, max: 9999, smart: ask === 1 ? [5, 500, 45] : [15, 1500, 160], input: 'numpad' })
}
/** 练习五 13：体育用品清单（篮球单价 84.00 元，足球 5 个共 433.50 元，合计 769.50 元）：足球单价 / 篮球金额 / 篮球个数 */
function qShop(d: Difficulty, rng: RNG, which: 'price' | 'amount' | 'count' = rng.pick(['price', 'amount', 'count'] as const)): Question {
  const rows: (LStr | number | null)[][] = [
    [L('shop.goods'), L('shop.count'), L('shop.unit'), L('shop.price'), L('shop.amount')],
    [L('shop.basket'), which === 'count' ? null : 4, L('shop.ge'), '84.00', which === 'amount' ? null : '336.00'],
    [L('shop.soccer'), 5, L('shop.ge'), which === 'price' ? null : '86.70', '433.50'],
    [L('shop.total'), '', '', '', '769.50'],
  ]
  if (which === 'count') rows[1]![4] = ''
  const stem: StemPart[] = [T(`shop.ask.${which}`), { kind: 'stat-table', head: 'row', rows }]
  if (which === 'count') return numberQuestion({ kpId: K1, type: 'dec-calc', difficulty: d, sig: 'shop-count', stem, value: 4, rng, min: 0, max: 99, smart: [3, 5, 9], input: 'numpad' })
  const correct = which === 'price' ? '86.70' : '336.00'
  const distractors = which === 'price' ? ['86.07', '8.67', '867.00'] : ['336.50', '1203.00', '346.00']
  return labelQuestion({ kpId: K1, type: 'dec-calc', difficulty: d, sig: `shop-${which}`, stem, correct, distractors, rng })
}

function intDivisor(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1、例 2 与两个做一做
    if (roll < 0.12) return qEx1Money(d, rng)
    if (roll < 0.22) return qMoneyDigit(d, rng)
    if (roll < 0.28) return qEx1Rest(d, rng)
    if (roll < 0.38) return qUnits(d, rng, [EX1[1]!, D('3', '4'), D('6.8', '5'), D('25.5', '6'), D('9', '4')])
    if (roll < 0.42) return qAddZero(d, rng)
    if (roll < 0.5) return qPattern(d, rng)
    if (roll < 0.75) return qCalc(K1, d, rng, rng.pick([...DO_INT, ...EX1, EX2]), 'calc')
    if (roll < 0.82) return qOnes(d, rng)
    if (roll < 0.9) return qCheck(d, rng)
    return qRule1(d, rng)
  }
  if (d === 2) {
    // 练习五 1、2、3、7、9–13
    if (roll < 0.3) return qCalc(K1, d, rng, rng.pick(P5_CALC), 'p5')
    if (roll < 0.42) return qFix(K1, d, rng, FIX_5, [D('15.6', '12'), D('1.08', '27'), D('43.5', '29'), D('20.4', '24')])
    if (roll < 0.5) return qFrog(d, rng)
    if (roll < 0.6) return qClassFund(d, rng)
    if (roll < 0.68) return qClimb(d, rng)
    if (roll < 0.78) return qLess1(d, rng)
    if (roll < 0.88) return qTable9(d, rng)
    return qShop(d, rng, rng.pick(['price', 'amount'] as const))
  }
  // 第 3 档：全程的平均速度、清单里篮球的个数（两步）、三位小数的商
  if (roll < 0.3) return qClimb(d, rng, true)
  if (roll < 0.5) return qShop(d, rng, 'count')
  if (roll < 0.75) return qCalc(K1, d, rng, rng.pick([D('1.26', '28'), D('0.416', '32'), D('0.646', '19'), D('14.21', '7')]), 'hard')
  return qFix(K1, d, rng, FIX_5, [D('0.646', '19'), D('328', '16')])
}
defineGenerator(K1, intDivisor)

// ══ 循环小数（m5s1-03-repeating）══

/** 例 3 和试一试的竖式：余数一直是几、商的小数部分一直重复出现几 */
export const EX3 = [
  { div: D('400', '75'), rem: 25, digit: 3 },
  { div: D('28', '18'), rem: 10, digit: 5 },
]
function qEx3(d: Difficulty, rng: RNG): Question {
  const ex = rng.pick(EX3)
  const fig = workFigure(ex.div, { maxPlaces: 3, hl: (rows) => rows.flatMap((r, i): DivMark[] => (!r.line && r.text.startsWith(String(ex.rem)) && r.end > 1 ? [[i, String(ex.rem).length]] : [])) })
  // 竖式有 8 行，用选项卡（数字键盘放在下面一屏放不下）：干扰项是商的整数部分、余数、除数的末位
  const int = Number(ex.div.a) / Number(ex.div.b) | 0
  return numberQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: `ex3-${ex.div.a}`, stem: [T('ex3.digit', { e: exprOf(ex.div, ''), r: ex.rem }), fig], value: ex.digit, rng, min: 0, max: 99, smart: [int, ex.rem, Number(ex.div.b) % 10].filter((x) => x !== ex.digit), input: 'choice' })
}
/** 例 3、试一试、做一做 2 的除法：一直除下去，能除尽吗 */
export const ENDS = [D('400', '75'), D('28', '18'), D('78.6', '11'), D('15', '7'), D('2.29', '9'), D('15.3', '72'), D('22', '4'), D('3', '4'), D('9', '4'), D('6.3', '14')]
function qEnds(d: Difficulty, rng: RNG): Question {
  const div = rng.pick(ENDS)
  const fin = isFinite10(valueOf(div))
  return labelQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: `ends-${div.a}/${div.b}`, stem: [T('ends', { e: exprOf(div, '') })], correct: L(fin ? 'can' : 'cannot'), distractors: [L(fin ? 'cannot' : 'can')], rng })
}
/** 课本里的循环小数（完整写法的分数，按课本的数）：例 3 / 概念 / 做一做 1 / 练习五 4 */
const RX = (int: string, pre: string, rep: string): Rat => {
  // int.pre(rep) 的值：(int.pre + rep 的循环部分)
  const p = pre.length
  const r = rep.length
  const whole = Number(`${int}${pre}${rep}`) - Number(`${int}${pre}`)
  return rat(whole, (10 ** r - 1) * 10 ** p)
}
export const REPS: { x: Rat; cycle: string; wrong: string[] }[] = [
  { x: RX('5', '', '3'), cycle: '3', wrong: ['5', '5.3'] },
  { x: RX('7', '1', '45'), cycle: '45', wrong: ['145', '4', '5'] },
  { x: RX('6', '9', '258'), cycle: '258', wrong: ['9258', '25', '58'] },
  { x: RX('1', '', '5'), cycle: '5', wrong: ['1', '1.5'] },
  { x: RX('1', '', '746'), cycle: '746', wrong: ['74', '46', '1746'] },
  { x: RX('0', '10', '53'), cycle: '53', wrong: ['105', '1053', '5'] },
  { x: RX('1', '2', '90'), cycle: '90', wrong: ['290', '9', '2909'] },
  { x: RX('0', '', '4'), cycle: '4', wrong: ['0', '0.4'] },
]
/** 课本里的有限小数（概念的例子 0.9375 和前面算出来的商） */
export const FINITES = ['0.9375', '5.5', '0.75', '24.95', '0.2125']
/** 循环节是多少 */
const ZH_DIGIT = '零一二三四五六七八九'
function qCycle(d: Difficulty, rng: RNG): Question {
  const item = rng.pick(REPS)
  // 完整写法写在题目里（读出来），或者简便写法写在小数卡上（不朗读：读出「……循环」就等于报了答案）
  const card = rng.chance(0.35)
  const stem: StemPart[] = card ? [T('cycle.card'), { kind: 'dec-card', n: show(item.x) }] : [T('cycle', { x: full(item.x) })]
  const q = labelQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: card ? `cyclecard-${show(item.x)}` : `cycle-${full(item.x)}`, stem, correct: item.cycle, distractors: item.wrong, rng })
  // 循环节一位一位地读（「七四六」，不读成「七百四十六」）：答错时读的「正确答案是……」
  const right = q.choices!.find((c) => q.answer.kind === 'choice' && c.id === q.answer.choiceId)!
  right.say = [...item.cycle].map((c) => ZH_DIGIT[Number(c)]).join('')
  return q
}
/** 循环小数的简便写法的干扰项：点的位置不对（循环节往前多算一位 / 往后少算一位、漏掉不循环的部分）、不点圆点（变成有限小数）——都和正确答案不相等 */
function notationWrongs(x: Rat): string[] {
  const e = expand(x)
  const out: Rat[] = []
  if (e.pre) out.push(RX(e.int, e.pre.slice(0, -1), e.pre.slice(-1) + e.rep), RX(e.int, '', e.rep))
  if (e.rep.length >= 2) out.push(RX(e.int, e.pre + e.rep[0], e.rep.slice(1)))
  if (e.rep.length >= 3) out.push(RX(e.int, e.pre, e.rep.slice(0, -1)))
  out.push(R(`${e.int}.${e.pre}${e.rep}`), R(`${e.int}.${e.pre}${e.rep}${e.rep[0]}`))
  const seen: Rat[] = [x]
  const strs: string[] = []
  for (const r of out) {
    if (seen.some((s) => eq(s, r))) continue
    seen.push(r)
    strs.push(show(r))
  }
  return strs.slice(0, 3)
}
function qWrite(d: Difficulty, rng: RNG): Question {
  const fromDiv = rng.chance(0.3)
  if (fromDiv) {
    const div = rng.pick([D('28', '18'), D('78.6', '11'), D('400', '75')])
    const v = valueOf(div)
    return labelQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: `writediv-${div.a}`, stem: [T('write.div', { e: exprOf(div, '') })], correct: show(v), distractors: notationWrongs(v), rng })
  }
  const item = rng.pick(REPS)
  return labelQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: `write-${full(item.x)}`, stem: [T('write', { x: full(item.x) })], correct: show(item.x), distractors: notationWrongs(item.x), rng })
}
/** 判断：是不是循环小数（课本的循环小数 / 有限小数） */
function qIsRep(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.55)) {
    const item = rng.pick(REPS)
    return tf(K2, d, `isrep-${full(item.x)}`, [T('isrep', { x: full(item.x) })], true, rng)
  }
  const s = rng.pick(FINITES)
  return tf(K2, d, `isrep-${s}`, [T('isrep', { x: s })], false, rng)
}
/** 有限小数还是无限小数（课本：0.9375 是有限小数，0.2142857（圆点在 1 和 7 上）是无限小数） */
function qFinite(d: Difficulty, rng: RNG): Question {
  const finite = rng.chance(0.45)
  const x = finite ? rng.pick(FINITES) : rng.chance(0.4) ? show(RX('0', '2', '142857')) : rng.chance(0.5) ? show(rng.pick(REPS).x) : full(rng.pick(REPS).x)
  return labelQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: `finite-${x}`, stem: [T('finite', { x })], correct: L(finite ? 'finite.yes' : 'finite.no'), distractors: [L(finite ? 'finite.no' : 'finite.yes')], rng })
}
/** 判断：这样写对吗（完整写法 → 简便写法，写对的 / 点错位置的） */
function qWriteJudge(d: Difficulty, rng: RNG): Question {
  const item = rng.pick(REPS)
  const ok = rng.chance(0.5)
  const shown = ok ? show(item.x) : rng.pick(notationWrongs(item.x))
  return tf(K2, d, `wj-${full(item.x)}-${shown}`, [T('write.judge', { x: full(item.x), y: shown })], ok, rng)
}
/** 做一做 3：几分之七（循环节都是 142857 这六个数字转圈） */
const sevenths = (n: number): Rat => rat(n, 7)
function qSevenths(d: Difficulty, rng: RNG, reverse = false): Question {
  const n = rng.int(3, 6)
  const shown = [E(`1 ÷ 7 = ${show(sevenths(1))}`), E(`2 ÷ 7 = ${show(sevenths(2))}`)]
  if (reverse) {
    const others = rng.shuffle([1, 2, 3, 4, 5, 6].filter((k) => k !== n)).slice(0, 3)
    return labelQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: `sevr-${n}`, stem: [T('whichdiv', { x: show(sevenths(n)) })], correct: `${n} ÷ 7`, distractors: others.map((k) => `${k} ÷ 7`), rng })
  }
  const others = rng.shuffle([1, 2, 3, 4, 5, 6].filter((k) => k !== n)).slice(0, 3)
  return labelQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: `sev-${n}`, stem: [T('seven'), ...shown, E(`${n} ÷ 7 = ?`)], correct: show(sevenths(n)), distractors: others.map((k) => show(sevenths(k))), rng })
}
/** 练习五 14：几分之十一（用计算器算出前几个，找规律直接写出后面的：循环节是 9 × n 的两位数） */
const elevenths = (n: number): string => `0.${String(9 * n).padStart(2, '0').repeat(2)}…`
function qElevenths(d: Difficulty, rng: RNG, reverse = false): Question {
  const n = rng.int(3, 9)
  const others = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => k !== n)).slice(0, 3)
  if (reverse) return labelQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: `elevr-${n}`, stem: [T('whichdiv', { x: elevenths(n) })], correct: `${n} ÷ 11`, distractors: others.map((k) => `${k} ÷ 11`), rng })
  return labelQuestion({
    kpId: K2,
    type: 'dec-calc',
    difficulty: d,
    sig: `elev-${n}`,
    stem: [T('eleven'), E(`1 ÷ 11 = ${elevenths(1)}`), E(`2 ÷ 11 = ${elevenths(2)}`), E(`${n} ÷ 11 = ?`)],
    correct: elevenths(n),
    distractors: others.map(elevenths),
    rng,
  })
}
/** 练习五 15 比大小（课本三道），外加课本的数和它的近似数、两种写法（自己配的） */
export const CMP_REP: { l: string; r: string; x: Rat; y: Rat; hard?: boolean }[] = [
  { l: '0.33', r: show(RX('0', '', '3')), x: R('0.33'), y: RX('0', '', '3') },
  { l: show(RX('1', '', '23')), r: '1.233', x: RX('1', '', '23'), y: R('1.233'), hard: true },
  { l: show(RX('1', '4', '5')), r: show(RX('1', '', '45')), x: RX('1', '4', '5'), y: RX('1', '', '45'), hard: true },
  { l: show(RX('5', '', '3')), r: '5.33', x: RX('5', '', '3'), y: R('5.33') },
  { l: full(RX('5', '', '3')), r: show(RX('5', '', '3')), x: RX('5', '', '3'), y: RX('5', '', '3') },
  { l: show(RX('7', '1', '45')), r: '7.145', x: RX('7', '1', '45'), y: R('7.145') },
  { l: '0.44', r: show(RX('0', '', '4')), x: R('0.44'), y: RX('0', '', '4') },
  { l: show(RX('1', '', '5')), r: '1.56', x: RX('1', '', '5'), y: R('1.56') },
]
function qCmpRep(d: Difficulty, rng: RNG, hard = false): Question {
  const c = rng.pick(CMP_REP.filter((x) => !!x.hard === hard))
  return cmpQ(K2, d, `cmp-${c.l}-${c.r}`, c.l, c.r, c.x, c.y, rng)
}

// ══ 近似数的选项（循环小数保留三位、商的近似数）══

/**
 * 保留 p 位小数的选项：正确的（四舍五入，末尾的 0 不去掉）+ 错法——直接去尾（没四舍五入）、保留的位数不对（多一位 / 少一位）、
 * 保留两位时去掉了末尾的 0（1.20 写成 1.2：考写法，和正确答案等值也放）；不够用最后一位 ±1 补
 */
export function approxOptions(x: Rat, p: number): { correct: string; distractors: string[] } {
  const correct = roundTo(x, p)
  const cands = [floorTo(x, p), p > 1 ? roundTo(x, p - 1) : roundTo(x, p + 1), roundTo(x, p + 1), p > 0 ? roundTo(x, p - 1) : null]
  const sameValue = correct.endsWith('0') && correct.includes('.') ? [tidy(correct)] : []
  return { correct, distractors: wrongsOf(correct, cands, 3, sameValue) }
}

/** 练习五 4：循环小数保留三位小数（课本四个数，两个写成完整写法、两个写成简便写法） */
export const P5_ROUND3: Rat[] = [RX('1', '2', '90'), RX('0', '01', '83'), RX('0', '', '4'), RX('7', '', '275')]
function qRound3(d: Difficulty, rng: RNG, dotted = rng.chance(0.5)): Question {
  const x = rng.pick(P5_ROUND3)
  const label = dotted ? show(x) : full(x)
  const { correct, distractors } = approxOptions(x, 3)
  return labelQuestion({ kpId: K2, type: 'dec-calc', difficulty: d, sig: `r3-${label}`, stem: [T('round3', { x: label })], correct, distractors, rng })
}

function repeatingKp(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 3、试一试、概念与写法、做一做 1、3
    if (roll < 0.14) return qEx3(d, rng)
    if (roll < 0.24) return qEnds(d, rng)
    if (roll < 0.36) return qIsRep(d, rng)
    if (roll < 0.5) return qCycle(d, rng)
    if (roll < 0.68) return qWrite(d, rng)
    if (roll < 0.78) return qFinite(d, rng)
    if (roll < 0.88) return qWriteJudge(d, rng)
    return qSevenths(d, rng)
  }
  if (d === 2) {
    // 练习五 4、14、15
    if (roll < 0.35) return qRound3(d, rng)
    if (roll < 0.65) return qCmpRep(d, rng)
    if (roll < 0.9) return qElevenths(d, rng)
    return qSevenths(d, rng, true)
  }
  if (roll < 0.35) return qCmpRep(d, rng, true)
  if (roll < 0.65) return qElevenths(d, rng, true)
  return qRound3(d, rng, true)
}
defineGenerator(K2, repeatingKp)

// ══ 一个数除以小数（m5s1-03-dec-divisor）══

export const EX4 = D('7.65', '0.85')
export const EX5 = D('12.6', '0.28')
/** 例 4 做一做（先说扩大到原来的多少倍再算） */
export const DO4 = [D('62.4', '2.6'), D('2.38', '0.34'), D('0.544', '0.16')]
/** 例 5 做一做 1 */
export const DO5 = [D('2.19', '0.3'), D('5.58', '3.1'), D('0.84', '3.5'), D('7.05', '0.47'), D('51.3', '0.27'), D('25.6', '0.032'), D('5.88', '0.56'), D('260', '0.13')]
/** 练习六 3、练习七 1 */
export const P6_CALC = [D('5.98', '0.23'), D('19.76', '5.2'), D('10.8', '4.5'), D('2.7', '7.5'), D('21', '1.4'), D('8.84', '1.7'), D('6.21', '0.03'), D('15', '0.06'), D('111', '0.3'), D('2.07', '0.023'), D('1.23', '0.03')]
/** 例 5 做一做 2：同一个被除数除以比 1 大、等于 1、比 1 小的数 */
export const DO5_CMP: [string, string[]][] = [
  ['6', ['1.5', '1', '0.5', '0.2']],
  ['1.2', ['1.2', '1', '0.8', '0.2']],
  ['49.5', ['1.1', '1', '0.45', '0.3']],
]

/** 例 4：0.85 米编一个中国结，7.65 米可以编几个 */
const qKnot = (d: Difficulty, rng: RNG): Question => numberQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: 'knot', stem: [T('ex4.knot')], value: 9, rng, min: 0, max: 99, smart: [90, 8, 10], input: 'numpad' })
/** 例 4 男孩的办法：单位换算（7.65 米 = 765 厘米、0.85 米 = 85 厘米） */
function qCm(d: Difficulty, rng: RNG): Question {
  const m = rng.pick(['7.65', '0.85'])
  const v = Number(m.replace('.', ''))
  return numberQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: `cm-${m}`, stem: [T('ex4.cm', { m })], value: v, rng, min: 0, max: 9999, smart: [v * 10, Math.round(v / 10)], input: 'numpad' })
}
/** 例 4 女孩的办法与做一做：商不变的规律——7.65 ÷ 0.85 = 765 ÷ □、2.38 ÷ 0.34 = □ ÷ 34（填的是整数） */
function qSame(d: Difficulty, rng: RNG, pool: Div[] = [EX4, ...DO4]): Question {
  const div = rng.pick(pool)
  const k = places(div.b)
  const a2 = R(div.a)
  const bigA = show(times(a2, 10 ** k))
  const bigB = String(Number(div.b.replace('.', '')))
  const askA = /^\d+$/.test(bigA) && rng.chance(0.5)
  const expr = askA ? `${div.a} ÷ ${div.b} = ? ÷ ${bigB}` : `${div.a} ÷ ${div.b} = ${bigA} ÷ ?`
  if (askA) return numberQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: `same-${div.a}-a`, stem: [T('same'), E(expr)], value: Number(bigA), rng, min: 0, max: 99999, smart: [Number(bigA) * 10, Math.round(Number(bigA) / 10)], input: 'numpad' })
  return numberQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: `same-${div.a}-b`, stem: [T('same'), E(expr)], value: Number(bigB), rng, min: 0, max: 9999, smart: [Number(bigB) * 10, Math.round(Number(bigB) / 10)].filter((x) => x > 0), input: 'numpad' })
}
/** 例 4 做一做：除数和被除数要同时扩大到原来的多少倍（10 / 100 / 1000 倍） */
function qTimes(d: Difficulty, rng: RNG): Question {
  const div = rng.pick([EX4, EX5, ...DO4, ...DO5])
  const k = places(div.b)
  const opt = (n: number): LStr => L('times', { n })
  return labelQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: `times-${div.a}/${div.b}`, stem: [T('times.q', { e: exprOf(div, '') })], correct: opt(10 ** k), distractors: [10, 100, 1000].filter((n) => n !== 10 ** k).map(opt), rng })
}
/** 例 5：被除数的位数不够，末尾补几个 0 */
export const PADS = [EX5, D('51.3', '0.27'), D('25.6', '0.032'), D('260', '0.13'), D('21', '1.4'), D('15', '0.06'), D('111', '0.3'), D('5.2', '0.32'), D('161', '0.46'), D('2.07', '0.023')]
function qPad(d: Difficulty, rng: RNG): Question {
  const div = rng.pick(PADS)
  const k = places(div.b)
  const pad = layoutOf(div).pad
  return numberQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: `pad-${div.a}/${div.b}`, stem: [T('pad', { e: exprOf(div, ''), k: L(`k${k}`) }), plainFigure(div)], value: pad, rng, min: 0, max: 9, input: 'numpad' })
}
/** 计算（商是整数的画出课本划好的竖式、按的数填在商那一行） */
function qCalc3(d: Difficulty, rng: RNG, div: Div, tag: string): Question {
  const value = valueOf(div)
  if (value.d === 1 && rng.chance(0.6)) return answerQ(K3, d, `${tag}-${div.a}/${div.b}-v`, [T('vcalc'), E(exprOf(div, '')), askFigure(div)], value, quotientErrors(div), rng, { numpad: true })
  return answerQ(K3, d, `${tag}-${div.a}/${div.b}`, [T('calc'), E(exprOf(div))], value, quotientErrors(div), rng)
}
/** 例 5 做一做 2：不计算，比一比商和被除数（除数比 1 大 / 等于 1 / 比 1 小） */
function qCmpDiv(d: Difficulty, rng: RNG): Question {
  const [a, bs] = rng.pick(DO5_CMP)
  const b = rng.pick(bs)
  const v = quo(R(a), R(b))
  return cmpQ(K3, d, `cmpdiv-${a}/${b}`, `${a} ÷ ${b}`, a, v, R(a), rng)
}
/** 法则：先移动谁的小数点；除数的小数点向右移动几位，被除数怎样移动 */
function qRule3(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) return labelQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: 'rule-first', stem: [T('rule.first')], correct: L('rule.divisor'), distractors: [L('rule.dividend')], rng })
  const k = rng.int(1, 3)
  return labelQuestion({
    kpId: K3,
    type: 'dec-calc',
    difficulty: d,
    sig: `rule-move-${k}`,
    stem: [T('rule.move', { k: L(`k${k}`) })],
    correct: L('rule.right', { k: L(`k${k}`) }),
    distractors: [L('rule.left', { k: L(`k${k}`) }), L('rule.stay')],
    rng,
  })
}

/** 练习六 1：转化成除数是整数的除法算式（4.68 ÷ 1.2 = □ ÷ 12 填的是小数，用选项） */
export const P6_TO_INT = [D('4.68', '1.2'), D('2.38', '0.34'), D('5.2', '0.32'), D('161', '0.46')]
function qToInt(d: Difficulty, rng: RNG): Question {
  const div = rng.pick(P6_TO_INT)
  const k = places(div.b)
  const bigA = times(R(div.a), 10 ** k)
  const bigB = Number(div.b.replace('.', ''))
  const stem = [T('toint'), E(`${div.a} ÷ ${div.b} = ? ÷ ${bigB}`)]
  if (bigA.d === 1) return numberQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: `toint-${div.a}`, stem, value: bigA.n, rng, min: 0, max: 99999, smart: [bigA.n * 10, Math.round(bigA.n / 10)], input: 'numpad' })
  const c = show(bigA)
  return labelQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: `toint-${div.a}`, stem, correct: c, distractors: wrongsOf(c, [show(times(bigA, 10)), div.a, show(rat(bigA.n, bigA.d * 10))]), rng })
}
/** 练习六 2 的改错：1.44 ÷ 1.8 写成 8（被除数的小数点多移了一位）、11.7 ÷ 2.6 写成 45（商漏点小数点）、4.48 ÷ 3.2 = 1.4（对） */
export const FIX_6: Fix[] = [
  { div: D('1.44', '1.8'), shown: { text: '8', end: 2 }, rows: [{ text: '144', end: 2, line: true }, { text: '0', end: 2 }], cols: 3 },
  { div: D('11.7', '2.6'), shown: { text: '45', end: 3 }, rows: [{ text: '104', end: 2, line: true }, { text: '130', end: 3 }, { text: '130', end: 3, line: true }, { text: '0', end: 3 }], cols: 4 },
]
function fixFigure6(f: Fix): StemPart {
  if (!f.shown) return workFigure(f.div)
  // 课本照错的样子画：除数、被除数的小数点都划掉，被除数没有点新小数点（1.44 当成 144、11.7 当成 117）
  return { kind: 'dec-division', divisor: f.div.b, dividend: f.div.a, quotient: f.shown, rows: f.rows, cols: f.cols, moved: f.div.a.replace('.', '').length }
}
function qFix6(d: Difficulty, rng: RNG): Question {
  const bad = rng.chance(0.6)
  const f: Fix = bad ? rng.pick(FIX_6) : { div: rng.pick([D('4.48', '3.2'), D('10.8', '4.5'), D('8.84', '1.7')]) }
  if (bad && rng.chance(0.5)) return answerQ(K3, d, `fixans-${f.div.a}`, [T('fix.answer'), fixFigure6(f)], valueOf(f.div), [f.shown!.text, ...quotientErrors(f.div)], rng)
  return tf(K3, d, `fix-${f.div.a}/${f.div.b}${bad ? '-bad' : ''}`, [T('fix.judge'), fixFigure6(f)], !bad, rng)
}
/** 练习六 4：根据 273 ÷ 13 = 21 补全表（一次问一格） */
function qTable273(d: Difficulty, rng: RNG): Question {
  const cols: [string, string, string][] = [
    ['273', '13', '21'],
    ['2730', '130', '21'],
    ['27.3', '1.3', '21'],
    ['2.73', '0.13', '21'],
    ['0.273', '0.013', '21'],
  ]
  const asks: [number, number][] = [
    [1, 1],
    [2, 2],
    [3, 0],
    [4, 2],
  ]
  const [col, row] = rng.pick(asks)
  const rows: (LStr | string | null)[][] = [
    [L('t.dividend'), ...cols.map((c) => c[0])],
    [L('t.divisor'), ...cols.map((c) => c[1])],
    [L('t.quotient'), ...cols.map((c) => c[2])],
  ]
  // 课本表里空着的三格：第二列的除数、第三列的商、第四列的被除数、第五列的商——问一格，别的空格照课本空着（这里写上答案，免得一题两空）
  rows[row]![col + 1] = null
  const value = cols[col]![row]!
  const stem: StemPart[] = [T('table273'), { kind: 'stat-table', head: 'col', rows }]
  if (/^\d+$/.test(value)) return numberQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: `t273-${col}-${row}`, stem, value: Number(value), rng, min: 0, max: 9999, smart: [Number(value) * 10, Math.round(Number(value) / 10), 13, 273].filter((x) => x > 0 && x !== Number(value)), input: 'numpad' })
  return labelQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: `t273-${col}-${row}`, stem, correct: value, distractors: ['27.3', '0.273', '273'], rng })
}
/** 练习六 5：长方形菜地面积 68.4 平方米、宽 7.2 米，长度是多少米 */
const qField = (d: Difficulty, rng: RNG): Question => answerQ(K3, d, 'field', [T('field')], valueOf(D('68.4', '7.2')), quotientErrors(D('68.4', '7.2')), rng)
/** 练习六 6（改成选算式）：81 和 0.5 / 1.5 怎样算得 40.5、162、54、82.5 */
function qWhichOp(d: Difficulty, rng: RNG): Question {
  const cases: { b: string; value: string; op: string }[] = [
    { b: '0.5', value: '40.5', op: '×' },
    { b: '0.5', value: '162', op: '÷' },
    { b: '1.5', value: '54', op: '÷' },
    { b: '1.5', value: '82.5', op: '+' },
  ]
  const c = rng.pick(cases)
  const ops = ['+', '-', '×', '÷']
  return labelQuestion({
    kpId: K3,
    type: 'dec-calc',
    difficulty: d,
    sig: `whichop-${c.value}`,
    stem: [T('whichop', { v: c.value })],
    correct: `81 ${c.op} ${c.b}`,
    distractors: ops.filter((o) => o !== c.op).map((o) => `81 ${o} ${c.b}`),
    rng,
  })
}
/** 练习六 7：两地相距 455 千米，3.5 小时相遇，甲车每小时 68 千米，乙车每小时多少千米 */
const qMeet = (d: Difficulty, rng: RNG): Question => numberQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: 'meet', stem: [T('meet')], value: 62, rng, min: 0, max: 999, smart: [130, 68, 198, 52], input: 'numpad' })
/** 练习七 4：高速公路全程 288 千米，客车 3 小时、货车 3.6 小时，客车每小时比货车多行驶多少千米 */
const qSpeedGap = (d: Difficulty, rng: RNG): Question => numberQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: 'speedgap', stem: [T('speedgap')], value: 16, rng, min: 0, max: 999, smart: [96, 80, 26, 6], input: 'numpad' })
/** 练习七 6：除以 0.5 和乘 2 相等（除以 0.25 = 乘 4、除以 0.2 = 乘 5、除以 0.1 = 乘 10） */
function qHalf(d: Difficulty, rng: RNG): Question {
  const [a, b, k] = rng.pick([
    ['6.8', '0.5', 2],
    ['4.2', '0.25', 4],
    ['2.1', '0.2', 5],
    ['1.9', '0.1', 10],
  ] as const)
  const ks = [2, 4, 5, 10].filter((x) => x !== k)
  return labelQuestion({
    kpId: K3,
    type: 'dec-calc',
    difficulty: d,
    sig: `half-${a}/${b}`,
    stem: [T('half', { e: `${a} ÷ ${b}` })],
    correct: `${a} × ${k}`,
    distractors: [`${a} ÷ ${k}`, ...rng.shuffle(ks).slice(0, 2).map((x) => `${a} × ${x}`)],
    rng,
  })
}
/** 练习七 1 的混合运算（第 3 档） */
export const MIXED7: { e: string; v: Rat }[] = [
  { e: '0.75 × 18 ÷ 0.15', v: quo(R('13.5'), R('0.15')) },
  { e: '21.36 ÷ 0.8 - 12.9', v: rat(138, 10) },
  { e: '7.28 + 3.2 ÷ 2.5', v: rat(856, 100) },
]
function qMixed7(d: Difficulty, rng: RNG): Question {
  const m = rng.pick(MIXED7)
  const cands = m.e.startsWith('7.28') ? ['4.192', '8.65', '0.856', '85.6'] : m.e.startsWith('21.36') ? ['1.38', '138', '14.8', '1.672'] : ['9', '900', '0.9']
  return answerQ(K3, d, `mixed-${m.e}`, [T('calc'), E(`${m.e} = ?`)], m.v, cands, rng)
}
/** 练习六 9：找规律填数（每次 ÷ 2：7、3.5、1.75…；每次 ÷ 2.5：6.25、2.5、1…） */
function qSeq(d: Difficulty, rng: RNG): Question {
  const half = rng.chance(0.5)
  const terms = half ? ['7', '3.5', '1.75', '0.875', '0.4375', '0.21875'] : ['6.25', '2.5', '1', '0.4', '0.16', '0.064']
  const at = rng.pick([3, 4])
  const cells = terms.map((s, i) => (i === at ? { kind: 'blank' as const } : { kind: 'item' as const, label: s }))
  const v = R(terms[at]!)
  const cands = half ? ['0.75', '0.875', '0.4375', '0.375', '0.5'] : ['0.5', '0.4', '0.16', '0.25', '0.1']
  return answerQ(K3, d, `seq-${half ? 'h' : 'f'}-${at}`, [T('seq'), { kind: 'sequence', cells }], v, cands, rng)
}
/** 练习七 10：3.69 除以一个数，商的小数点错向右移了一位得 24.6——除数是多少 */
const qShifted = (d: Difficulty, rng: RNG): Question => answerQ(K3, d, 'shifted', [T('shifted')], R('1.5'), ['0.15', '15', '2.46'], rng)
/** 练习六 10：快递首重 18 元、续重每千克 7 元（以 0.5 千克为计重单位），寄包裹花了 35.5 元，包裹最多有多少千克 */
const qParcel = (d: Difficulty, rng: RNG): Question => answerQ(K3, d, 'parcel', [T('parcel')], R('3.5'), ['2.5', '5.07', '4', '3'], rng)
/** 练习六 8：两家超市的牛奶（A：2.5 元/盒、58 元/箱；B：2.6 元/盒、62 元/箱、买 1 箱送 2 盒，一箱 24 盒），买 30 盒在哪家便宜 */
const qMilk = (d: Difficulty, rng: RNG): Question => labelQuestion({ kpId: K3, type: 'dec-calc', difficulty: d, sig: 'milk', stem: [T('milk')], correct: L('milk.b'), distractors: [L('milk.a')], rng })

function decDivisor(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 4、例 5 与两个做一做
    if (roll < 0.08) return qKnot(d, rng)
    if (roll < 0.14) return qCm(d, rng)
    if (roll < 0.24) return qSame(d, rng)
    if (roll < 0.36) return qTimes(d, rng)
    if (roll < 0.46) return qPad(d, rng)
    if (roll < 0.74) return qCalc3(d, rng, rng.pick([EX4, EX5, ...DO4, ...DO5]), 'calc')
    if (roll < 0.86) return qCmpDiv(d, rng)
    return qRule3(d, rng)
  }
  if (d === 2) {
    // 练习六 1–7、练习七 1、4、6
    if (roll < 0.12) return qToInt(d, rng)
    if (roll < 0.24) return qFix6(d, rng)
    if (roll < 0.46) return qCalc3(d, rng, rng.pick(P6_CALC), 'p6')
    if (roll < 0.56) return qTable273(d, rng)
    if (roll < 0.64) return qField(d, rng)
    if (roll < 0.74) return qWhichOp(d, rng)
    if (roll < 0.8) return qMeet(d, rng)
    if (roll < 0.88) return qSpeedGap(d, rng)
    return qHalf(d, rng)
  }
  // 第 3 档：混合运算、找规律、错移小数点、快递、牛奶
  if (roll < 0.3) return qMixed7(d, rng)
  if (roll < 0.55) return qSeq(d, rng)
  if (roll < 0.7) return qShifted(d, rng)
  if (roll < 0.85) return qParcel(d, rng)
  return qMilk(d, rng)
}
defineGenerator(K3, decDivisor)

// ══ 商的近似数（m5s1-03-approx）══

/** 例 3 做一做 2：除不尽的保留两位小数（15.3 ÷ 72 其实除得尽，照样保留两位）；例 3 王鹏每秒跑多少米 */
export const ROUND2 = [D('15', '7'), D('15.3', '72'), D('2.29', '9')]
/** 练习五 5（保留一 / 两 / 三位）、练习七 2（一位：48 ÷ 2.3 …；两位：3.81 ÷ 7 …） */
export const P5_TABLE = [D('40', '14'), D('26.37', '31'), D('45.5', '38')]
export const P7_ONE = [D('48', '2.3'), D('1.55', '3.8'), D('7.09', '0.52')]
export const P7_TWO = [D('3.81', '7'), D('246.4', '13'), D('5.63', '6.1')]
function qRoundN(kpId: string, d: Difficulty, rng: RNG, div: Div, p: number, tag: string): Question {
  const { correct, distractors } = approxOptions(valueOf(div), p)
  return labelQuestion({ kpId, type: 'dec-calc', difficulty: d, sig: `${tag}-${div.a}/${div.b}-${p}`, stem: [T('roundn', { e: exprOf(div, ''), p: L(`p${p}`) })], correct, distractors, rng })
}
/** 例 3：王鹏跑 400 米用了 75 秒，平均每秒跑多少米（得数保留两位小数） */
function qRunner(d: Difficulty, rng: RNG): Question {
  const { correct, distractors } = approxOptions(valueOf(D('400', '75')), 2)
  return labelQuestion({ kpId: K4, type: 'dec-calc', difficulty: d, sig: 'runner', stem: [T('runner')], correct, distractors, rng })
}
/** 例 6 (1)：32 元买 2.7 千克红小豆，每千克大约多少元（精确到分） */
function qBeanPrice(d: Difficulty, rng: RNG): Question {
  const { correct, distractors } = approxOptions(quo(R('32'), R('2.7')), 2)
  return labelQuestion({ kpId: K4, type: 'dec-calc', difficulty: d, sig: 'beanprice', stem: [T('bean.price')], correct, distractors, rng })
}
/** 例 6 (2)(3)：每瓶装 0.8 千克，2.7 千克装满几瓶（去尾）、要准备几个瓶子（进一）。课本 2.7 和 0.8，换数的几组是自己定的（商都不是整数） */
export const BEANS: [string, string][] = [
  ['2.7', '0.8'],
  ['2.7', '0.8'],
  ['3.5', '0.8'],
  ['4.3', '0.8'],
  ['5', '0.8'],
  ['2.7', '0.5'],
  ['4.5', '0.6'],
  ['3.2', '0.6'],
]
function qBeans(d: Difficulty, rng: RNG, jars = rng.chance(0.5)): Question {
  const [t, e] = rng.pick(BEANS)
  const v = quo(R(t), R(e))
  const fl = Math.floor(v.n / v.d)
  const value = jars ? fl + 1 : fl
  return numberQuestion({ kpId: K4, type: 'dec-calc', difficulty: d, sig: `bean-${jars ? 'jars' : 'full'}-${t}/${e}`, stem: [T(jars ? 'bean.jars' : 'bean.full', { t, e })], value, rng, min: 0, max: 99, smart: [jars ? fl : fl + 1, value + 1, Math.max(1, value - 2)], input: 'numpad' })
}
/** 例 6 做一做：一根 25 米的丝带，每个礼盒用 1.5 米，可以包装多少个（去尾）。课本 25 和 1.5，换数的几组是自己定的 */
export const RIBBONS: [string, string][] = [
  ['25', '1.5'],
  ['25', '1.5'],
  ['20', '1.5'],
  ['30', '1.6'],
  ['18', '1.4'],
  ['25', '1.8'],
  ['16', '1.5'],
]
function qRibbon(d: Difficulty, rng: RNG): Question {
  const [t, e] = rng.pick(RIBBONS)
  const v = quo(R(t), R(e))
  const fl = Math.floor(v.n / v.d)
  return numberQuestion({ kpId: K4, type: 'dec-calc', difficulty: d, sig: `ribbon-${t}/${e}`, stem: [T('ribbon', { t, e })], value: fl, rng, min: 0, max: 99, smart: [fl + 1, fl - 1], input: 'numpad' })
}
/** 回顾反思与整理和复习：根据问题的需要取近似值——装满几瓶 / 可以包装几个（「去尾」法）、准备几个瓶子（「进一」法）、钱数（「四舍五入」法） */
function qMethod(d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['jars', 'full', 'money', 'ribbon'] as const)
  const correct = which === 'jars' ? 'up' : which === 'money' ? 'round' : 'down'
  return labelQuestion({ kpId: K4, type: 'dec-calc', difficulty: d, sig: `method-${which}`, stem: [T(`method.${which}`)], correct: L(`method.${correct}`), distractors: ['up', 'down', 'round'].filter((x) => x !== correct).map((x) => L(`method.${x}`)), rng })
}
/** 练习五 6：鸵鸟的体重是天鹅的多少倍（保留两位小数） */
function qOstrich(d: Difficulty, rng: RNG): Question {
  const { correct, distractors } = approxOptions(quo(R('134'), R('9')), 2)
  return labelQuestion({ kpId: K4, type: 'dec-calc', difficulty: d, sig: 'ostrich', stem: [T('ostrich')], correct, distractors, rng })
}
/** 练习五 8：男子 4 × 100 米接力 37.79 秒，平均每位运动员用了多少秒（保留两位小数） */
function qRelay(d: Difficulty, rng: RNG): Question {
  const { correct, distractors } = approxOptions(quo(R('37.79'), R('4')), 2)
  return labelQuestion({ kpId: K4, type: 'dec-calc', difficulty: d, sig: 'relay', stem: [T('relay')], correct, distractors, rng })
}
/** 练习七 3：100 元买单价 18.5 元的字典，可以买几本（去尾） */
const qDict = (d: Difficulty, rng: RNG): Question => numberQuestion({ kpId: K4, type: 'dec-calc', difficulty: d, sig: 'dict', stem: [T('dict')], value: 5, rng, min: 0, max: 99, smart: [6, 4, 54], input: 'numpad' })
/** 练习七 5：10000 平方米的森林每星期吸收 2.8 吨二氧化碳，50000 平方米的森林 8 月份（31 天）一共吸收多少吨 */
const qForest = (d: Difficulty, rng: RNG): Question => numberQuestion({ kpId: K4, type: 'dec-calc', difficulty: d, sig: 'forest', stem: [T('forest')], value: 62, rng, min: 0, max: 999, smart: [56, 14, 434, 60], input: 'numpad' })
/** 练习七 7：丛书原价 83.2 元、现价 62.4 元，剩下的钱正好买 4 本笔记本（一本多少元；现价平均每本多少元） */
function qSeries(d: Difficulty, rng: RNG): Question {
  const note = rng.chance(0.5)
  const div = note ? D('20.8', '4') : D('62.4', '4')
  return answerQ(K4, d, `series-${note ? 'note' : 'each'}`, [T(note ? 'series.note' : 'series.each')], valueOf(div), [...quotientErrors(div), ...(note ? ['20.8', '15.6', '36.4'] : ['20.8', '5.2', '1.56'])], rng)
}

function approx(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 3 做一做 2、例 3 的每秒跑多少米、例 6 与做一做
    if (roll < 0.2) return qRoundN(K4, d, rng, rng.pick(ROUND2), 2, 'r2')
    if (roll < 0.28) return qRunner(d, rng)
    if (roll < 0.38) return qBeanPrice(d, rng)
    if (roll < 0.52) return qBeans(d, rng, false)
    if (roll < 0.66) return qBeans(d, rng, true)
    if (roll < 0.8) return qRibbon(d, rng)
    if (roll < 0.9) return qRoundN(K4, d, rng, rng.pick(P5_TABLE), rng.int(1, 2), 'p5')
    return qMethod(d, rng)
  }
  if (d === 2) {
    // 练习五 5、6、8，练习七 2、3，取近似值的方法
    if (roll < 0.2) return qRoundN(K4, d, rng, rng.pick(P5_TABLE), rng.int(1, 3), 'p5')
    if (roll < 0.35) return qRoundN(K4, d, rng, rng.pick(P7_ONE), 1, 'p7')
    if (roll < 0.5) return qRoundN(K4, d, rng, rng.pick(P7_TWO), 2, 'p7')
    if (roll < 0.6) return qOstrich(d, rng)
    if (roll < 0.7) return qRelay(d, rng)
    if (roll < 0.82) return qDict(d, rng)
    return qMethod(d, rng)
  }
  // 第 3 档：森林吸碳、丛书、保留三位
  if (roll < 0.35) return qForest(d, rng)
  if (roll < 0.65) return qSeries(d, rng)
  return qRoundN(K4, d, rng, rng.pick(P5_TABLE), 3, 'p5')
}
defineGenerator(K4, approx)
