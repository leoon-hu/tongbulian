import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 小数的加法和减法（四下第六单元，课本 p69–78，旧版结构）：三个小节三个知识点（四年级数学下册 D）。
// 小数加减法：例 1 位数相同（16.45 + 14.29、16.45 − 14.29）、例 2 位数不同（16.45 + 18.3、18.3 − 16.45，被减数末尾补 0），
//   做一做两组竖式（含整数加减小数）、小明的体重表；练习十七：口算、竖式、电话费表、改错、复名数用小数算、买球、田径纪录、找规律。
// 小数加减混合运算：例 3 三本书连加（一个竖式里三个数）、付 50 元应找回多少（连减和减去两数的和两种算法）、做一做；练习十八。
// 整数加法运算律推广到小数：两组算式比一比、例 4 凑整（0.6 + 7.91 + 3.4 + 0.09 = 12）、做一做（□ 里填数、怎样简便就怎样计算）；练习十九。
// G14：小数的答案一律是选项卡（数字键盘只出整数答案），干扰项照课本暴露的错法造——小数点没对齐（按末位对齐）、漏进位 / 漏退位、
// 借了位没减、整数减小数没补 0（把减数的小数部分直接落下来）、小数点错一位、加减用反；得数照课本结论去掉末尾的 0（钱数表格题照表里的
// 写法写两位小数），同一题的选项不出现等值的两种写法。小数一律从课本的数里取（每个不同的小数都是一条朗读音频）。
// 数在程序里一律用「千分之几」的整数（milli）算，免得浮点误差。课本没有的题型不出；画路线、提问题、说一说只抽能判的部分。
// 朗读：「少儿绘画」（少 shào）不进题目文字；「便宜」「应找回」整词出现；「重」不单独作动词（说「体重增加了」）。
// ─────────────────────────────────────────────────────────────

const K1 = 'm4s2-06-addsub'
const K2 = 'm4s2-06-mixed'
const K3 = 'm4s2-06-laws'
type P = Record<string, LStr | number>
type Op = '+' | '-'
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })
const SYM: Record<Op, string> = { '+': '+', '-': '-' }

// ══ 小数的写法与竖式里的算法（错法也照竖式一位一位地算出来）══

/** 小数（字符串）→ 千分之几：'16.45' → 16450，'5' → 5000 */
export function milli(s: string): number {
  const [i = '0', f = ''] = s.split('.')
  return Number(i) * 1000 + Number(`${f}000`.slice(0, 3))
}
/** 千分之几 → 小数，末尾的 0 去掉（课本结论）：17200 → '17.2'，12000 → '12' */
export function dec(m: number): string {
  const i = Math.floor(m / 1000)
  const f = String(m % 1000).padStart(3, '0').replace(/0+$/, '')
  return f ? `${i}.${f}` : String(i)
}
/** 钱数写两位小数（课本电话费表、价签的写法）：163540 → '163.54'，162800 → '162.80' */
export function money(m: number): string {
  return `${Math.floor(m / 1000)}.${String(Math.floor((m % 1000) / 10)).padStart(2, '0')}`
}
/** 小数位数 */
export const places = (s: string): number => (s.split('.')[1] ?? '').length
const intLen = (s: string): number => s.split('.')[0]!.length
const isInt = (m: number): boolean => m % 1000 === 0

/** 按小数点对齐后的各位数字（高位在前）：整数部分补到 I 位、小数部分补到 F 位 */
function digitsOf(s: string, I: number, F: number): number[] {
  const [ip = '0', fp = ''] = s.split('.')
  return (ip.padStart(I, '0') + fp.padEnd(F, '0')).split('').map(Number)
}
/** 各位数字（小数部分 F 位）→ 千分之几 */
function fromDigits(ds: number[], F: number): number {
  return ds.reduce((v, x) => v * 10 + x, 0) * 10 ** (3 - F)
}

/** 竖式加法（两三个数）：drop(k) = 第 k 列（从左数）满十没往前一位进（漏进位）；返回千分之几 */
function colAdd(nums: string[], drop: (k: number) => boolean = () => false): number {
  const F = Math.max(...nums.map(places))
  const I = Math.max(...nums.map(intLen)) + 1
  const rows = nums.map((s) => digitsOf(s, I, F))
  const out = Array<number>(I + F).fill(0)
  let carry = 0
  for (let k = I + F - 1; k >= 0; k--) {
    const s = rows.reduce((a, r) => a + r[k]!, 0) + carry
    out[k] = s % 10
    carry = drop(k) ? 0 : Math.floor(s / 10)
  }
  return fromDigits(out, F)
}
/** 竖式加法里进位的列 */
function carryCols(nums: string[]): number[] {
  const F = Math.max(...nums.map(places))
  const I = Math.max(...nums.map(intLen)) + 1
  const rows = nums.map((s) => digitsOf(s, I, F))
  const out: number[] = []
  let carry = 0
  for (let k = I + F - 1; k >= 0; k--) {
    const s = rows.reduce((a, r) => a + r[k]!, 0) + carry
    carry = Math.floor(s / 10)
    if (carry) out.push(k)
  }
  return out
}
/**
 * 竖式减法 a − b（a ≥ b）：
 * forget = 第 k 列借了 1 当 10、前一位却没减去 1（借了位没减；all = 每次都忘）；abs = 每一位都拿大数减小数（不借位）；
 * down = 被减数这一位没有数（位数少、没补 0）时把减数的数直接落下来（整数减小数没补 0：5 − 1.26 写成 4.26）。
 * 不够减（得负数）返回 null。
 */
function colSub(a: string, b: string, mode: { forget?: number | 'all'; abs?: boolean; down?: boolean } = {}): number | null {
  const F = Math.max(places(a), places(b))
  const I = Math.max(intLen(a), intLen(b))
  const ra = digitsOf(a, I, F)
  const rb = digitsOf(b, I, F)
  const pa = places(a)
  const out = Array<number>(I + F).fill(0)
  let borrow = 0
  for (let k = I + F - 1; k >= 0; k--) {
    if (mode.down && k - I >= pa) {
      out[k] = rb[k]!
      continue
    }
    if (mode.abs) {
      out[k] = Math.abs(ra[k]! - rb[k]!)
      continue
    }
    let t = ra[k]! - borrow - rb[k]!
    borrow = 0
    if (t < 0) {
      t += 10
      borrow = mode.forget === 'all' || mode.forget === k ? 0 : 1
    }
    out[k] = t
  }
  return borrow ? null : fromDigits(out, F)
}
/** 竖式减法里借位的列 */
function borrowCols(a: string, b: string): number[] {
  const F = Math.max(places(a), places(b))
  const I = Math.max(intLen(a), intLen(b))
  const ra = digitsOf(a, I, F)
  const rb = digitsOf(b, I, F)
  const out: number[] = []
  let borrow = 0
  for (let k = I + F - 1; k >= 0; k--) {
    const t = ra[k]! - borrow - rb[k]!
    borrow = t < 0 ? 1 : 0
    if (borrow) out.push(k)
  }
  return out
}
/** 一个数按末位对齐时被当成了几（小数点没对齐）：位数比最多的少几位就缩小几个 10 倍；除不尽返回 NaN */
function asIfRight(s: string, F: number): number {
  const m = milli(s)
  const k = 10 ** (F - places(s))
  return m % k === 0 ? m / k : NaN
}

/** 一步加减的结果 */
export function calc(a: string, op: Op, b: string): number {
  return op === '+' ? milli(a) + milli(b) : milli(a) - milli(b)
}
/**
 * 一步加减（竖式）的常见错法，按可能性排：漏进位 / 借了位没减（每一处、全部）、大数减小数、没补 0 直接落下来、小数点没对齐（按末位对齐）。
 * 不含小数点错位、加减用反（各题自己加）。都是千分之几，可能有负数（调用的地方去掉）。
 */
export function stepErrors(a: string, op: Op, b: string): number[] {
  const out: number[] = []
  if (op === '+') {
    for (const k of carryCols([a, b])) out.push(colAdd([a, b], (j) => j === k))
    out.push(colAdd([a, b], () => true))
  } else {
    if (places(a) < places(b)) out.push(colSub(a, b, { down: true }) ?? NaN)
    for (const k of borrowCols(a, b)) out.push(colSub(a, b, { forget: k }) ?? NaN)
    out.push(colSub(a, b, { forget: 'all' }) ?? NaN, colSub(a, b, { abs: true }) ?? NaN)
  }
  if (places(a) !== places(b)) {
    const F = Math.max(places(a), places(b))
    const x = asIfRight(a, F)
    const y = asIfRight(b, F)
    out.push(op === '+' ? x + y : x - y)
  }
  return out.filter((v) => Number.isFinite(v))
}
/** 小数点错一位（得数扩大 10 倍 / 缩小到 1/10，除不尽的不要） */
function shifted(m: number): number[] {
  return [m * 10, m % 10 === 0 ? m / 10 : NaN].filter((v) => Number.isFinite(v))
}
/** 和正确答案同样写法的邻近数：最后一位 ±1、前一位 ±1、整数部分 ±1 */
function neighbors(m: number, fmt: (m: number) => string): number[] {
  const p = places(fmt(m))
  const u = 10 ** (3 - Math.max(0, Math.min(3, p)))
  return [m + u, m - u, m + 10 * u, m - 10 * u, m + 1000, m - 1000, m + 2 * u, m - 2 * u]
}

/**
 * 干扰项：从错法里取，和正确答案不相等、互不相等、都是正数；尽量和正确答案一样多位小数（不让孩子从写法上认出答案），
 * 最多放一个位数不同的（小数点错位那种），不够用邻近的数补；fmt 是写法（默认去掉末尾的 0）。
 */
export function wrongs(correct: number, cands: number[], fmt: (m: number) => string = dec, count = 3): string[] {
  const p = places(fmt(correct))
  const seen = new Set<string>([fmt(correct)])
  const vals = new Set<number>([correct])
  const same: string[] = []
  const other: string[] = []
  const take = (m: number, allowOther: boolean): void => {
    if (!(m > 0) || !Number.isInteger(m) || vals.has(m)) return
    const s = fmt(m)
    if (seen.has(s)) return
    if (places(s) === p) {
      if (same.length < count) {
        same.push(s)
        seen.add(s)
        vals.add(m)
      }
    } else if (allowOther && other.length < 1) {
      other.push(s)
      seen.add(s)
      vals.add(m)
    }
  }
  for (const m of cands) take(m, true)
  for (const m of neighbors(correct, fmt)) take(m, false)
  const out = [...same.slice(0, count - other.length), ...other]
  for (const s of same.slice(count - other.length)) if (out.length < count) out.push(s)
  return out.slice(0, count)
}

/**
 * 出一道得数题：得数是整数就用数字键盘（或整数选项），是小数就用选项卡（G14）。cands 是错法算出的数（千分之几）。
 * fmt：选项的写法（钱数表格题写两位小数）。
 */
function answerQ(
  kpId: string,
  d: Difficulty,
  sig: string,
  stem: StemPart[],
  value: number,
  cands: number[],
  rng: RNG,
  fmt: (m: number) => string = dec,
  type: 'decimal' | 'law' = 'decimal',
  numpad = false,
): Question {
  if (isInt(value) && fmt === dec) {
    const n = value / 1000
    return numberQuestion({
      kpId,
      type,
      difficulty: d,
      sig,
      stem,
      value: n,
      rng,
      ...(numpad ? { input: 'numpad' as const } : {}),
      min: 0,
      max: Math.max(99, n * 2),
      smart: cands.filter((m) => m > 0 && isInt(m)).map((m) => m / 1000),
    })
  }
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: fmt(value), distractors: wrongs(value, cands, fmt), rng })
}

// ── 竖式的排法 ──

/**
 * 按小数点对齐的几行（整数部分右对齐、小数部分左对齐，位数少的右边空着不补 0）；extra 里的数（得数）只用来留够位置。
 * 有小数的竖式里整数（12、27、5）的个位对齐个位，小数点那一列空着。
 */
export function aligned(nums: string[], extra: string[] = []): string[] {
  const all = [...nums, ...extra]
  const F = Math.max(...all.map(places))
  const I = Math.max(...all.map(intLen))
  return nums.map((s) => {
    const [ip = '', fp] = s.split('.')
    const frac = F === 0 ? '' : fp === undefined ? ' '.repeat(F + 1) : `.${fp.padEnd(F, ' ')}`
    return ip.padStart(I, ' ') + frac
  })
}
/** 小数竖式部件：按小数点对齐，value（得数）只用来给横线下留够位置 */
export function decVertical(nums: string[], op: Op, value: number | null = null): StemPart {
  return { kind: 'dec-vertical', lines: aligned(nums, value === null ? [] : [dec(value)]), op }
}
/** 横式：「16.45 + 14.29 = ?」 */
const exprOf = (nums: string[], ops: Op[], tail = ' = ?'): string => nums.map((s, i) => (i === 0 ? s : `${SYM[ops[i - 1]!]} ${s}`)).join(' ') + tail

// ══ 小数加减法（m4s2-06-addsub）══

/** 例 1–3 的书（课本的价钱）；《少儿绘画》（少 shào）只在连加的表里出现，不进题目文字 */
export const BOOKS: { id: string; price: string }[] = [
  { id: 'math', price: '16.45' }, // 《数学家的故事》
  { id: 'fairy', price: '14.29' }, // 《童话选》
  { id: 'nature', price: '18.3' }, // 《神奇的大自然》
  { id: 'space', price: '15.8' }, // 《太空漫步》
  { id: 'ocean', price: '14.69' }, // 《海洋世界》
]
export const PAINT = '17.45' // 《少儿绘画》
const book = (id: string): LStr => L(`m4.dadd.book.${id}`)

/**
 * 例 1、例 2：两本书一共花了多少元 / 贵多少元 / 便宜多少元。课本的两对（数学家的故事和童话选、数学家的故事和神奇的大自然）占四成，
 * 其余两本从课本例 1–3 的书里挑。竖式只在第 1 档有一半画出来（课本的竖式）。
 */
function qBooks(d: Difficulty, rng: RNG, kind: 'add' | 'dearer' | 'cheaper' = rng.pick(['add', 'add', 'dearer', 'cheaper'] as const)): Question {
  let [x, y] = rng.shuffle(BOOKS).slice(0, 2) as [(typeof BOOKS)[0], (typeof BOOKS)[0]]
  if (rng.chance(0.4)) [x, y] = rng.pick([[BOOKS[0]!, BOOKS[1]!], [BOOKS[0]!, BOOKS[2]!]] as const)
  if (milli(x.price) === milli(y.price)) return qBooks(d, rng, kind)
  // 贵 / 便宜：x 是贵的那本
  if (kind !== 'add' && milli(x.price) < milli(y.price)) [x, y] = [y, x]
  const op: Op = kind === 'add' ? '+' : '-'
  const nums = [x.price, y.price]
  const value = calc(x.price, op, y.price)
  const key = kind === 'add' ? 'm4.dadd.books.add' : kind === 'dearer' ? 'm4.dadd.books.dearer' : 'm4.dadd.books.cheaper'
  const stem: StemPart[] = [T(key, { x: book(x.id), y: book(y.id), p: x.price, q: y.price })]
  const showV = d === 1 && rng.chance(0.5)
  if (showV) stem.push(decVertical(nums, op, value))
  const cands = [...stepErrors(x.price, op, y.price), ...shifted(value), op === '+' ? Math.abs(milli(x.price) - milli(y.price)) : milli(x.price) + milli(y.price)]
  return answerQ(K1, d, `books-${kind}-${x.id}-${y.id}${showV ? '-v' : ''}`, stem, value, cands, rng)
}

/** 做一做（第 69、70 页）的竖式：位数相同、位数不同、整数加减小数 */
export const DO_CALC: [string, Op, string][] = [
  ['2.98', '+', '0.56'],
  ['12.53', '+', '4.67'],
  ['6.07', '+', '4.89'],
  ['5.64', '-', '1.78'],
  ['7.2', '-', '0.8'],
  ['15.62', '-', '7.46'],
  ['12', '+', '0.5'],
  ['12.56', '+', '5.8'],
  ['113.04', '+', '7.8'],
  ['27', '-', '0.8'],
  ['16.4', '-', '3.2'],
  ['0.3', '-', '0.18'],
]
/** 练习十七 1 口算、2 竖式 */
export const ORAL_17: [string, Op, string][] = [
  ['2.5', '+', '0.9'],
  ['7.8', '+', '1.6'],
  ['0.39', '+', '0.15'],
  ['1.2', '-', '0.5'],
  ['4.7', '-', '2.8'],
  ['0.96', '-', '0.33'],
]
export const CALC_17: [string, Op, string][] = [
  ['3.64', '+', '0.48'],
  ['21.56', '+', '6.74'],
  ['7.85', '+', '9.19'],
  ['41.2', '-', '15.6'],
  ['8.24', '-', '3.56'],
  ['11.65', '-', '7.39'],
]
/** 一道两个数的加减：横式 +（vertical 时）竖式，选得数 */
function qCalc(kpId: string, d: Difficulty, rng: RNG, [a, op, b]: [string, Op, string], tag: string, vertical: boolean): Question {
  const value = calc(a, op, b)
  const stem: StemPart[] = vertical ? [T('m4.dadd.vcalc'), E(exprOf([a, b], [op])), decVertical([a, b], op, value)] : [T('m4.dadd.calc'), E(exprOf([a, b], [op]))]
  const cands = [...stepErrors(a, op, b), ...shifted(value), op === '+' ? Math.abs(milli(a) - milli(b)) : milli(a) + milli(b)]
  return answerQ(kpId, d, `${tag}-${a}${op}${b}${vertical ? '-v' : ''}`, stem, value, cands, rng)
}

/** 做一做 2：小明的体重（课本 7 岁 26.7、8 岁 30.6、9 岁 34.5、10 岁 38.8 kg） */
export const WEIGHT = ['26.7', '30.6', '34.5', '38.8']
const weightTable = (): StemPart => ({
  kind: 'stat-table',
  title: L('m4.dadd.w.title'),
  head: 'col',
  rows: [
    [L('m4.dadd.w.age'), ...[7, 8, 9, 10].map((n) => L('m4.dadd.w.ageN', { n }))],
    [L('m4.dadd.w.kg'), ...WEIGHT],
  ],
})
/** 体重增加了多少千克（7 到 10 岁、相邻两年、隔一年）；哪一年比上一年增加得最多（10 岁，4.3 kg） */
function qWeight(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) {
    const incs = [1, 2, 3].map((i) => milli(WEIGHT[i]!) - milli(WEIGHT[i - 1]!))
    const at = incs.indexOf(Math.max(...incs))
    const age = (i: number): LStr => L('m4.dadd.w.ageN', { n: 7 + i })
    return labelQuestion({
      kpId: K1,
      type: 'decimal',
      difficulty: d,
      sig: 'weight-most',
      stem: [T('m4.dadd.w.most'), weightTable()],
      correct: age(at + 1),
      distractors: [1, 2, 3].filter((i) => i !== at + 1).map(age),
      rng,
    })
  }
  const [i, j] = rng.pick([
    [0, 3],
    [0, 3],
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 2],
    [1, 3],
  ] as const)
  const a = WEIGHT[j]!
  const b = WEIGHT[i]!
  const value = calc(a, '-', b)
  const key = j - i === 1 ? 'm4.dadd.w.step' : 'm4.dadd.w.total'
  return answerQ(K1, d, `weight-${i}-${j}`, [T(key, { a: 7 + i, b: 7 + j }), weightTable()], value, [...stepErrors(a, '-', b), ...shifted(value), milli(a) + milli(b)], rng)
}

/** 例 2 的结论：计算小数加减法，先把什么对齐（小数点） */
function qAlign(d: Difficulty, rng: RNG): Question {
  return labelQuestion({
    kpId: K1,
    type: 'decimal',
    difficulty: d,
    sig: 'align',
    stem: [T('m4.dadd.align.q')],
    correct: L('m4.dadd.align.point'),
    distractors: [L('m4.dadd.align.last'), L('m4.dadd.align.first')],
    rng,
  })
}
/** 例 2 (2)：被减数的位数少一位（18.3 − 16.45、27 − 0.8、0.3 − 0.18），这一位没有数怎么办——添上 0 再减（只少一位的，问的那一位说得清） */
export const PAD_CASES: [string, string][] = [
  ['18.3', '16.45'],
  ['27', '0.8'],
  ['0.3', '0.18'],
]
function qPad(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(PAD_CASES)
  const pos = places(b) === 1 ? 'tenth' : 'hundredth'
  const digit = Number(b[b.length - 1])
  return labelQuestion({
    kpId: K1,
    type: 'decimal',
    difficulty: d,
    sig: `pad-${a}-${b}`,
    stem: [T('m4.dadd.pad.q', { e: `${a} - ${b}`, pos: L(`m4.dadd.pos.${pos}`) }), decVertical([a, b], '-', calc(a, '-', b))],
    correct: L('m4.dadd.pad.zero'),
    distractors: [L('m4.dadd.pad.down', { n: digit }), L('m4.dadd.pad.skip')],
    rng,
  })
}

/** 练习十七 6 的改错：课本的四道（都是错的），result 照课本写（23.4 − 13.4 的得数漏了小数点，写成「10 0」） */
interface Wrong {
  a: string
  op: Op
  b: string
  /** 写在横线下的得数（按列排之前的样子） */
  shown: string
  /** 竖式按末位对齐（小数点没对齐） */
  right?: boolean
}
export const FIX_17: Wrong[] = [
  { a: '12.5', op: '+', b: '3.79', shown: '50.4', right: true },
  { a: '23.4', op: '-', b: '13.4', shown: '10 0' },
  { a: '5', op: '-', b: '1.26', shown: '4.26' },
  { a: '7.16', op: '-', b: '3', shown: '7.13', right: true },
]
/** 写好的竖式部件（改错题）：按末位对齐的整行右对齐；「10 0」那种漏了小数点的照位置写 */
function workVertical(w: Wrong): StemPart {
  if (w.right) {
    const width = Math.max(w.a.length, w.b.length, w.shown.length)
    return { kind: 'dec-vertical', lines: [w.a.padStart(width), w.b.padStart(width)], op: w.op, result: w.shown.padStart(width) }
  }
  const real = w.shown.includes(' ') ? w.shown.replace(' ', '.') : w.shown
  const lines = aligned([w.a, w.b], [real])
  const res = aligned([real], [w.a, w.b])[0]!
  return { kind: 'dec-vertical', lines, op: w.op, result: w.shown.includes(' ') ? res.replace('.', ' ') : res }
}
/** 课本做一做的竖式算对了 / 照错法算错了（不是课本的四道时，从做一做里挑一道，按一种错法写错） */
function workCase(rng: RNG): { w: Wrong; ok: boolean } {
  if (rng.chance(0.45)) return { w: rng.pick(FIX_17), ok: false }
  // 得数末尾有 0 的（12.53 + 4.67 = 17.20）不拿来当「算对了」的竖式，免得孩子以为写 17.2 不对
  const [a, op, b] = rng.pick(DO_CALC.filter(([x, o, y]) => places(dec(calc(x, o, y))) === Math.max(places(x), places(y))))
  const value = calc(a, op, b)
  if (rng.chance(0.5)) return { w: { a, op, b, shown: dec(value) }, ok: true }
  const errs = stepErrors(a, op, b).filter((m) => m > 0 && m !== value && places(dec(m)) <= Math.max(places(a), places(b)))
  if (!errs.length) return { w: { a, op, b, shown: dec(value) }, ok: true }
  return { w: { a, op, b, shown: dec(rng.pick(errs)) }, ok: false }
}
/** 下面的竖式算得对吗（对 / 不对） */
function qFixJudge(d: Difficulty, rng: RNG): Question {
  const { w, ok } = workCase(rng)
  return labelQuestion({
    kpId: K1,
    type: 'decimal',
    difficulty: d,
    sig: `judge-${w.a}${w.op}${w.b}=${w.shown.replace(' ', '_')}`,
    stem: [T('m4.dadd.fix.judge'), workVertical(w)],
    correct: L(ok ? 'm4.dadd.yes' : 'm4.dadd.no'),
    distractors: [L(ok ? 'm4.dadd.no' : 'm4.dadd.yes')],
    rng,
  })
}
/** 改错：这道题算错了，正确的得数是多少（23.4 − 13.4 = 10 用数字键盘） */
function qFixAnswer(d: Difficulty, rng: RNG, w: Wrong = rng.pick(FIX_17)): Question {
  const value = calc(w.a, w.op, w.b)
  const shownM = milli(w.shown.replace(' ', '.'))
  const cands = [shownM, ...stepErrors(w.a, w.op, w.b), ...shifted(value)]
  return answerQ(K1, d, `fix-${w.a}${w.op}${w.b}`, [T('m4.dadd.fix.answer'), workVertical(w)], value, cands, rng)
}

/**
 * 练习十七 7：复名数先改写成小数再算（课本的六道）。slips = 改写时常错成的数（3 元零 9 分写成 3.9、1 t 30 kg 写成 1.3 t、
 * 3 km 50 m 写成 3.5 km、800 g 写成 0.08 kg……），用它们代进去算出干扰项。
 */
interface Mixed {
  id: string
  a: LStr
  av: string
  op: Op
  b: LStr
  bv: string
  unit: 'yuan' | 'ton' | 'm' | 'kg' | 'km'
  slips: [string, string][]
}
const yjf = (y: number, j: number, f: number): LStr => L('m4.dadd.mu.yjf', { y, j, f })
const y0f = (y: number, f: number): LStr => L('m4.dadd.mu.y0f', { y, f })
const two = (a: number, u1: string, b: number, u2: string): LStr => L('m4.dadd.mu.two', { a, u1: L(`m4.dadd.u.${u1}`), b, u2: L(`m4.dadd.u.${u2}`) })
const one = (a: number, u: string): LStr => L('m4.dadd.mu.one', { a, u: L(`m4.dadd.u.${u}`) })
export const MIXED_17: Mixed[] = [
  { id: 'yuan', a: yjf(5, 6, 2), av: '5.62', op: '+', b: y0f(3, 9), bv: '3.09', unit: 'yuan', slips: [['5.62', '3.9']] },
  { id: 'ton', a: two(1, 'ton', 30, 'kg'), av: '1.03', op: '+', b: one(980, 'kg'), bv: '0.98', unit: 'ton', slips: [['1.3', '0.98'], ['1.03', '9.8']] },
  { id: 'm', a: two(4, 'm', 35, 'cm'), av: '4.35', op: '+', b: two(5, 'm', 70, 'cm'), bv: '5.7', unit: 'm', slips: [['4.35', '5.07']] },
  { id: 'kg', a: one(10, 'kg'), av: '10', op: '-', b: two(4, 'kg', 800, 'g'), bv: '4.8', unit: 'kg', slips: [['10', '4.08']] },
  { id: 'km1', a: two(4, 'km', 800, 'm'), av: '4.8', op: '-', b: two(3, 'km', 50, 'm'), bv: '3.05', unit: 'km', slips: [['4.8', '3.5'], ['4.08', '3.05']] },
  { id: 'km2', a: one(6, 'km'), av: '6', op: '-', b: two(2, 'km', 860, 'm'), bv: '2.86', unit: 'km', slips: [['6', '2.086']] },
]
function qMixed(d: Difficulty, rng: RNG, m: Mixed = rng.pick(MIXED_17)): Question {
  const value = calc(m.av, m.op, m.bv)
  const cands = [...m.slips.map(([a, b]) => calc(a, m.op, b)), ...stepErrors(m.av, m.op, m.bv), ...shifted(value)]
  const stem = [T(m.op === '+' ? 'm4.dadd.mu.add' : 'm4.dadd.mu.sub', { a: m.a, b: m.b, u: L(`m4.dadd.u.${m.unit}`) })]
  return answerQ(K1, d, `mixed-${m.id}`, stem, value, cands, rng)
}

/** 练习十七 9：女子田径的中国纪录和世界纪录（课本，截至 2021 年 8 月），相差多少 */
export const RECORDS: { id: string; cn: string; world: string; unit: 'm' | 's' }[] = [
  { id: 'high', cn: '1.97', world: '2.09', unit: 'm' },
  { id: 'long', cn: '7.01', world: '7.52', unit: 'm' },
  { id: 'shot', cn: '21.76', world: '22.63', unit: 'm' },
  { id: 'discus', cn: '71.68', world: '76.80', unit: 'm' },
  { id: 'javelin', cn: '67.98', world: '72.28', unit: 'm' },
  { id: 'dash', cn: '10.79', world: '10.49', unit: 's' },
]
function qRecord(d: Difficulty, rng: RNG): Question {
  const at = rng.int(0, RECORDS.length - 1)
  const r = RECORDS[at]!
  // 表里放三个项目（问的那个在里面）
  const others = rng.shuffle(RECORDS.filter((_, i) => i !== at)).slice(0, 2)
  const shown = RECORDS.filter((x) => x === r || others.includes(x))
  const cell = (v: string, u: 'm' | 's'): LStr => L(`m4.dadd.rec.v.${u}`, { v })
  const table: StemPart = {
    kind: 'stat-table',
    head: 'both',
    rows: [[L('m4.dadd.rec.item'), L('m4.dadd.rec.cn'), L('m4.dadd.rec.world')], ...shown.map((x) => [L(`m4.dadd.rec.${x.id}`), cell(x.cn, x.unit), cell(x.world, x.unit)])],
  }
  const [hi, lo] = milli(r.cn) > milli(r.world) ? [r.cn, r.world] : [r.world, r.cn]
  const value = calc(hi, '-', lo)
  const key = r.unit === 's' ? 'm4.dadd.rec.askS' : 'm4.dadd.rec.askM'
  return answerQ(K1, d, `record-${r.id}-${shown.map((x) => x.id).join('.')}`, [T(key, { x: L(`m4.dadd.rec.${r.id}`) }), table], value, [...stepErrors(hi, '-', lo), ...shifted(value), milli(hi) + milli(lo)], rng)
}

/** 练习十七 4：小丽家两个月的电话费、宽带费（元），把表填完整：问 4 月合计、5 月合计、电话费总计、全部总计（钱数两位小数） */
export const BILL = { phone: ['83.54', '79.26'], net: ['80.00', '80.00'] }
function qBill(d: Difficulty, rng: RNG): Question {
  const [p4, p5] = BILL.phone as [string, string]
  const [n4, n5] = BILL.net as [string, string]
  const sum4 = calc(p4, '+', n4)
  const sum5 = calc(p5, '+', n5)
  const phoneAll = calc(p4, '+', p5)
  const netAll = calc(n4, '+', n5)
  const all = phoneAll + netAll
  const ask = rng.pick(['sum4', 'sum5', 'phone', 'all'] as const)
  const v = (m: number, key: string): string | null => (key === ask ? null : money(m))
  const rows: (LStr | null)[][] = [
    [L('m4.dadd.bill.item'), L('m4.dadd.bill.phone'), L('m4.dadd.bill.net'), L('m4.dadd.bill.sum')],
    [L('m4.dadd.bill.apr'), p4, n4, v(sum4, 'sum4')],
    [L('m4.dadd.bill.may'), p5, n5, v(sum5, 'sum5')],
    [L('m4.dadd.bill.total'), v(phoneAll, 'phone'), money(netAll), v(all, 'all')],
  ]
  const value = { sum4, sum5, phone: phoneAll, all }[ask]
  const parts: Record<typeof ask, [string, string]> = { sum4: [p4, n4], sum5: [p5, n5], phone: [p4, p5], all: [money(phoneAll), money(netAll)] }
  const [a, b] = parts[ask]
  const cands = [...stepErrors(a, '+', b), ...shifted(value), Math.abs(milli(a) - milli(b))]
  return labelQuestion({
    kpId: K1,
    type: 'decimal',
    difficulty: d,
    sig: `bill-${ask}`,
    stem: [T(`m4.dadd.bill.ask.${ask}`), { kind: 'stat-table', title: L('m4.dadd.bill.title'), head: 'both', rows }],
    correct: money(value),
    distractors: wrongs(value, cands, money),
    rng,
  })
}

/** 练习十七 8：一个足球和一个排球一共多少元（课本的价签：75.80、92.50 元的足球，45.50、58.00 元的排球） */
export const BALLS = { soccer: [['white', '75.80'], ['black', '92.50']], volley: [['tri', '45.50'], ['duo', '58.00']] } as const
function qBalls(d: Difficulty, rng: RNG): Question {
  const [fid, fp] = rng.pick(BALLS.soccer)
  const [vid, vp] = rng.pick(BALLS.volley)
  const value = calc(fp, '+', vp)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'row',
    rows: [[L('m4.dadd.ball.name'), L('m4.dadd.ball.price')], ...[...BALLS.soccer, ...BALLS.volley].map(([id, p]) => [L(`m4.dadd.ball.${id}`), p])],
  }
  return labelQuestion({
    kpId: K1,
    type: 'decimal',
    difficulty: d,
    sig: `balls-${fid}-${vid}`,
    stem: [T('m4.dadd.ball.ask', { f: L(`m4.dadd.ball.${fid}`), v: L(`m4.dadd.ball.${vid}`) }), table],
    correct: money(value),
    distractors: wrongs(value, [...stepErrors(fp, '+', vp), ...shifted(value), Math.abs(milli(fp) - milli(vp))], money),
    rng,
  })
}

/**
 * 练习十七 10：找规律填数。(1) 每次加 0.2，(2) 加 0.05，(3) 加 0.003，(4) 减 0.005；问下一个数（第五个）或再下一个（第六个）。
 * (1) 的第五个是 1（整数，数字键盘）。三位小数的两道只放第 3 档。
 */
export const SEQS: { start: string; step: number }[] = [
  { start: '0.2', step: 200 },
  { start: '1.11', step: 50 },
  { start: '4.363', step: 3 },
  { start: '7.897', step: -5 },
]
function qSeq(d: Difficulty, rng: RNG, at: number): Question {
  const s = SEQS[at]!
  const terms = [0, 1, 2, 3, 4, 5].map((i) => milli(s.start) + i * s.step)
  const which = rng.chance(0.5) ? 4 : 5
  const value = terms[which]!
  const cells: StemPart = {
    kind: 'sequence',
    cells: [...terms.slice(0, 4).map((m) => ({ kind: 'item' as const, label: dec(m) })), ...(which === 5 ? [{ kind: 'item' as const, label: '…' }] : []), { kind: 'blank' as const }],
  }
  const cands = [value + s.step, value - s.step, terms[4]!, value + Math.sign(s.step) * 10 ** (3 - places(s.start)), ...shifted(value)].filter((m) => m !== value)
  // 0.2，0.4，0.6，0.8 的下一个是 1（整数）：只用数字键盘（整数选项 0、2、10 没有意思）
  return answerQ(K1, d, `seq-${at}-${which}`, [T(which === 4 ? 'm4.dadd.seq.next' : 'm4.dadd.seq.sixth'), cells], value, cands, rng, dec, 'decimal', true)
}

function addsub(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1、例 2（两本书）、两组做一做的竖式、体重表、小数点对齐、被减数补 0
    if (roll < 0.3) return qBooks(d, rng)
    if (roll < 0.66) return qCalc(K1, d, rng, rng.pick(DO_CALC), 'do', rng.chance(0.7))
    if (roll < 0.84) return qWeight(d, rng)
    if (roll < 0.92) return qAlign(d, rng)
    return qPad(d, rng)
  }
  if (d === 2) {
    // 练习十七：口算、竖式、改错（对吗 / 正确得数）、复名数、田径纪录、电话费表、买球、找规律（一、两位小数）
    if (roll < 0.14) return qCalc(K1, d, rng, rng.pick(ORAL_17), 'oral', false)
    if (roll < 0.3) return qCalc(K1, d, rng, rng.pick(CALC_17), 'calc', true)
    if (roll < 0.42) return qFixJudge(d, rng)
    if (roll < 0.5) return qFixAnswer(d, rng)
    if (roll < 0.62) return qMixed(d, rng, rng.pick(MIXED_17.slice(0, 4)))
    if (roll < 0.74) return qRecord(d, rng)
    if (roll < 0.83) return qBill(d, rng)
    if (roll < 0.91) return qBalls(d, rng)
    return qSeq(d, rng, rng.int(0, 1))
  }
  // 第 3 档：三位小数的找规律、千米的复名数（中间有 0）、整数减小数的改错、两本书（不画竖式）
  if (roll < 0.3) return qSeq(d, rng, rng.int(2, 3))
  if (roll < 0.55) return qMixed(d, rng, rng.pick(MIXED_17.slice(3)))
  if (roll < 0.75) return qFixAnswer(d, rng, rng.pick([FIX_17[2]!, FIX_17[3]!]))
  return qBooks(d, rng)
}
defineGenerator(K1, addsub)

// ══ 小数加减混合运算（m4s2-06-mixed）══

/** 两三步的算式：nums 与 ops 按顺序，group = 后两个数加了小括号（a − (b + c)）；返回千分之几 */
interface Chain {
  nums: string[]
  ops: Op[]
  group?: boolean
}
export function evalChain(c: Chain): number {
  const [a, b, x] = c.nums as [string, string, string | undefined]
  if (x === undefined) return calc(a, c.ops[0]!, b)
  if (c.group) {
    const inner = calc(b, c.ops[1]!, x)
    return c.ops[0] === '+' ? milli(a) + inner : milli(a) - inner
  }
  const first = calc(a, c.ops[0]!, b)
  return c.ops[1] === '+' ? first + milli(x) : first - milli(x)
}
export function chainExpr(c: Chain, tail = ' = ?'): string {
  const [a, b, x] = c.nums
  if (c.group) return `${a} ${SYM[c.ops[0]!]} (${b} ${SYM[c.ops[1]!]} ${x})${tail}`
  return exprOf(c.nums, c.ops, tail)
}
/**
 * 两步算式的错法：某一步算错（漏进位 / 借位没减……）、去掉括号按顺序算、括号前是减号时里面的符号没变（a − b + c 当成 a − (b + c)）、
 * 小数点错一位。
 */
function chainErrors(c: Chain): number[] {
  const value = evalChain(c)
  const [a, b, x] = c.nums as [string, string, string]
  const out: number[] = []
  if (c.group) {
    const inner = calc(b, c.ops[1]!, x)
    for (const e of stepErrors(b, c.ops[1]!, x)) out.push(c.ops[0] === '+' ? milli(a) + e : milli(a) - e)
    if (inner > 0) for (const e of stepErrors(a, c.ops[0]!, dec(inner))) out.push(e)
    out.push(evalChain({ nums: c.nums, ops: c.ops }))
  } else {
    const first = calc(a, c.ops[0]!, b)
    for (const e of stepErrors(a, c.ops[0]!, b)) out.push(c.ops[1] === '+' ? e + milli(x) : e - milli(x))
    if (first > 0) for (const e of stepErrors(dec(first), c.ops[1]!, x)) out.push(e)
    if (c.ops[0] === '-' && c.ops[1] === '-') out.push(first + milli(x))
    if (c.ops[0] === '-' && c.ops[1] === '+') out.push(milli(a) - milli(b) - milli(x))
  }
  out.push(...shifted(value))
  return out
}
function qChain(kpId: string, d: Difficulty, rng: RNG, c: Chain, tag: string, keyText = 'm4.dadd.calc'): Question {
  const value = evalChain(c)
  return answerQ(kpId, d, `${tag}-${chainExpr(c, '')}`, [T(keyText), E(chainExpr(c))], value, chainErrors(c), rng)
}

/** 例 3 (1)：三本书一共多少元。课本的三本（17.45、15.8、14.69 元）占三成，其余从例 1–3 的六本书里挑三本；一个竖式里三个数连加 */
export const EX3_BOOKS = ['17.45', '15.8', '14.69']
function qThree(d: Difficulty, rng: RNG): Question {
  const pool = [PAINT, ...BOOKS.map((b) => b.price)]
  const prices = rng.chance(0.3) ? EX3_BOOKS : rng.shuffle(pool).slice(0, 3)
  const value = prices.reduce((s, p) => s + milli(p), 0)
  const cands = [...carryCols(prices).map((k) => colAdd(prices, (j) => j === k)), colAdd(prices, () => true), ...shifted(value)]
  const F = Math.max(...prices.map(places))
  const right = prices.map((p) => asIfRight(p, F))
  if (right.every((v) => Number.isFinite(v)) && prices.some((p) => places(p) < F)) cands.push(right.reduce((a, b) => a + b, 0))
  const stem: StemPart[] = [T('m4.dadd.three', { a: prices[0]!, b: prices[1]!, c: prices[2]! })]
  const showV = d === 1 && rng.chance(0.6)
  if (showV) stem.push(decVertical(prices, '+', value))
  return answerQ(K2, d, `three-${prices.join('+')}${showV ? '-v' : ''}`, stem, value, cands, rng)
}
/**
 * 例 3 (2)：买两本书，付给售货员 50 元，应找回多少元（课本 16.45 元和 18.3 元的两本，应找回 15.25 元）；
 * 也问「下面哪个算式也能算出应找回多少钱」（50 − (16.45 + 18.3)）和按顺序算的第一步（50 − 16.45 = 33.55）。
 */
function changeBooks(rng: RNG): [string, string, string, string] {
  if (rng.chance(0.35)) return ['math', BOOKS[0]!.price, 'nature', BOOKS[2]!.price]
  const [x, y] = rng.shuffle(BOOKS).slice(0, 2) as [(typeof BOOKS)[0], (typeof BOOKS)[0]]
  return [x.id, x.price, y.id, y.price]
}
function qChange(d: Difficulty, rng: RNG): Question {
  const [xi, x, yi, y] = changeBooks(rng)
  const c: Chain = { nums: ['50', x, y], ops: ['-', '-'] }
  const value = evalChain(c)
  const stem = [T('m4.dadd.change', { x: book(xi), y: book(yi), p: x, q: y })]
  return answerQ(K2, d, `change-${xi}-${yi}`, stem, value, [...chainErrors(c), milli(x) + milli(y)], rng)
}
function qChangeWay(d: Difficulty, rng: RNG): Question {
  const [xi, x, yi, y] = changeBooks(rng)
  const correct = `50 - (${x} + ${y})`
  const distractors = [`50 - ${x} + ${y}`, `50 + ${x} - ${y}`, `50 - (${x} - ${y})`]
  if (milli(x) < milli(y)) distractors[2] = `50 - (${y} - ${x})`
  return labelQuestion({
    kpId: K2,
    type: 'decimal',
    difficulty: d,
    sig: `way-${xi}-${yi}`,
    stem: [T('m4.dadd.changeWay', { x: book(xi), y: book(yi), p: x, q: y }), E(`50 - ${x} - ${y}`)],
    correct,
    distractors,
    rng,
  })
}
function qChangeStep(d: Difficulty, rng: RNG): Question {
  const [xi, x, yi, y] = changeBooks(rng)
  const value = calc('50', '-', x)
  return answerQ(K2, d, `step-${xi}-${yi}`, [T('m4.dadd.changeStep', { x: book(xi), y: book(yi), p: x, q: y }), E(`50 - ${x} - ${y}`)], value, [...stepErrors('50', '-', x), ...shifted(value), milli('50') - milli(x) - milli(y)], rng)
}
/** 做一做（第 73 页）与练习十八 1、3 */
export const DO_MIXED: Chain[] = [
  { nums: ['0.38', '0.26', '2.6'], ops: ['+', '+'] },
  { nums: ['5.7', '0.81', '1.29'], ops: ['-', '-'] },
  { nums: ['98.2', '32.5', '13.4'], ops: ['+', '-'] },
]
export const ORAL_18: [string, Op, string][] = [
  ['0.4', '+', '8.7'],
  ['4.5', '+', '3.6'],
  ['0.28', '+', '0.54'],
  ['1.4', '-', '0.9'],
  ['7.1', '-', '3.5'],
  ['5', '-', '2.7'],
]
export const CALC_18: Chain[] = [
  { nums: ['7.02', '11.38', '20.96'], ops: ['+', '+'] },
  { nums: ['12.45', '1.96', '0.8'], ops: ['-', '-'] },
  { nums: ['19.92', '14.4', '9.92'], ops: ['+', '-'] },
  { nums: ['85.7', '15.3', '4.8'], ops: ['-', '-'], group: true },
  { nums: ['40', '2.75', '0.86'], ops: ['-', '+'], group: true },
  { nums: ['9.5', '4.85', '6.13'], ops: ['+', '-'] },
]
/** 练习十八 3 带括号的：先算哪一步（小括号里的） */
function qOrder(d: Difficulty, rng: RNG): Question {
  const c = rng.pick(CALC_18.filter((x) => x.group))
  const [a, b, x] = c.nums as [string, string, string]
  return labelQuestion({
    kpId: K2,
    type: 'decimal',
    difficulty: d,
    sig: `order-${chainExpr(c, '')}`,
    stem: [T('m4.dadd.order'), E(chainExpr(c, ''))],
    correct: `${b} ${SYM[c.ops[1]!]} ${x}`,
    distractors: [`${a} ${SYM[c.ops[0]!]} ${b}`, `${a} ${SYM[c.ops[0]!]} ${x}`],
    rng,
  })
}
/** 练习十八 2：箭头链，先加 5.47、再减 9.86（课本 21.6、16.8、37.82）；问中间或最后的数 */
export const CHAIN_18 = ['21.6', '16.8', '37.82']
function qArrows(d: Difficulty, rng: RNG): Question {
  const s = rng.pick(CHAIN_18)
  const mid = calc(s, '+', '5.47')
  const last = mid - milli('9.86')
  const final = rng.chance(0.5)
  const stem = [T(final ? 'm4.dadd.arrow.last' : 'm4.dadd.arrow.mid', { s }), E(`${s} → + 5.47 → ${final ? '□' : '?'} → - 9.86 → ${final ? '?' : '□'}`)]
  const value = final ? last : mid
  const cands = final ? [...stepErrors(dec(mid), '-', '9.86'), ...shifted(value), mid + milli('9.86')] : [...stepErrors(s, '+', '5.47'), ...shifted(value), milli(s) - milli('5.47')]
  return answerQ(K2, d, `arrow-${s}-${final ? 'last' : 'mid'}`, stem, value, cands, rng)
}
/** 练习十八 4：地球表面积大约 5.1 亿平方千米，陆地大约 1.49 亿平方千米，海洋比陆地大多少（两步：先求海洋 3.61，再减 1.49） */
function qEarth(d: Difficulty, rng: RNG): Question {
  const sea = calc('5.1', '-', '1.49')
  const ask = rng.chance(0.4) ? 'sea' : 'more'
  const value = ask === 'sea' ? sea : sea - milli('1.49')
  const cands = ask === 'sea' ? [...stepErrors('5.1', '-', '1.49'), ...shifted(sea)] : [sea, ...stepErrors(dec(sea), '-', '1.49'), ...shifted(value)]
  return answerQ(K2, d, `earth-${ask}`, [T(`m4.dadd.earth.${ask}`)], value, cands, rng)
}
/** 练习十八 5：运动鞋 78 元、跳绳 13.6 元，一共多少；付 100 元找回多少 */
function qShoes(d: Difficulty, rng: RNG): Question {
  const total = calc('78', '+', '13.6')
  if (rng.chance(0.5)) return answerQ(K2, d, 'shoes-total', [T('m4.dadd.shoes.total')], total, [...stepErrors('78', '+', '13.6'), ...shifted(total), milli('78') - milli('13.6')], rng)
  const value = milli('100') - total
  return answerQ(K2, d, 'shoes-change', [T('m4.dadd.shoes.change')], value, [...stepErrors('100', '-', dec(total)), ...shifted(value), milli('100') - milli('78') + milli('13.6')], rng)
}
/** 练习十八 6：张英跳了 1.1 米，王强比张英高 0.15 米，肖红比王强低 0.09 米，肖红（或王强）跳了多少米 */
function qJump(d: Difficulty, rng: RNG): Question {
  const wang = calc('1.1', '+', '0.15')
  const xiao = wang - milli('0.09')
  if (rng.chance(0.35)) return answerQ(K2, d, 'jump-wang', [T('m4.dadd.jump.wang')], wang, [...stepErrors('1.1', '+', '0.15'), milli('1.1') - milli('0.15'), ...shifted(wang)], rng)
  return answerQ(K2, d, 'jump-xiao', [T('m4.dadd.jump.xiao')], xiao, [wang + milli('0.09'), milli('1.1') - milli('0.09'), ...stepErrors(dec(wang), '-', '0.09'), ...shifted(xiao)], rng)
}
/** 练习十八 7：东京奥运会跳水女子双人 10 米跳台决赛五轮得分（课本），某一队的总成绩 */
export const DIVE: { id: string; scores: string[] }[] = [
  { id: 'cn', scores: ['53.40', '57.60', '81.90', '86.40', '84.48'] },
  { id: 'us', scores: ['45.00', '46.80', '70.20', '70.08', '78.72'] },
  { id: 'mx', scores: ['47.40', '43.80', '69.30', '68.16', '71.04'] },
]
function qDive(d: Difficulty, rng: RNG): Question {
  const t = rng.pick(DIVE)
  const value = t.scores.reduce((s, x) => s + milli(x), 0)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'both',
    rows: [[L('m4.dadd.dive.round'), ...[1, 2, 3, 4, 5].map((n) => L(`m4.dadd.dive.r${n}`))], [L(`m4.dadd.dive.${t.id}`), ...t.scores]],
  }
  const cands = [...carryCols(t.scores).map((k) => colAdd(t.scores, (j) => j === k)), value - milli(t.scores[4]!), ...shifted(value)]
  return labelQuestion({ kpId: K2, type: 'decimal', difficulty: d, sig: `dive-${t.id}`, stem: [T('m4.dadd.dive.ask', { x: L(`m4.dadd.dive.${t.id}`) }), table], correct: money(value), distractors: wrongs(value, cands, money), rng })
}
/** 练习十八 8：每满 100 元减 20 元，买电饭煲 149.00 元和电吹风 52.00 元应付多少（201 元满两个 100，减 40，应付 161 元）；题目里写「149 元」，不读「点零零」 */
function qPromo(d: Difficulty, rng: RNG): Question {
  return numberQuestion({ kpId: K2, type: 'decimal', difficulty: d, sig: 'promo', stem: [T('m4.dadd.promo')], value: 161, rng, min: 0, max: 300, smart: [181, 201, 141, 171] })
}
/** 练习十八 9：两家商场的价格，长绳、篮球、足球各买一个，怎样买最省钱，要花多少元（139.06 元） */
export const SHOP = { rope: ['25.50', '26.20'], basket: ['69.88', '72.56'], soccer: ['46.70', '43.68'] }
function qShop(d: Difficulty, rng: RNG): Question {
  const best = (['rope', 'basket', 'soccer'] as const).map((k) => Math.min(milli(SHOP[k][0]!), milli(SHOP[k][1]!)))
  const value = best.reduce((a, b) => a + b, 0)
  const allA = (['rope', 'basket', 'soccer'] as const).reduce((s, k) => s + milli(SHOP[k][0]!), 0)
  const allB = (['rope', 'basket', 'soccer'] as const).reduce((s, k) => s + milli(SHOP[k][1]!), 0)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'both',
    rows: [
      [L('m4.dadd.shop.item'), L('m4.dadd.shop.a'), L('m4.dadd.shop.b')],
      ...(['rope', 'basket', 'soccer'] as const).map((k) => [L(`m4.dadd.shop.${k}`), ...SHOP[k]]),
    ],
  }
  return labelQuestion({ kpId: K2, type: 'decimal', difficulty: d, sig: 'shop', stem: [T('m4.dadd.shop.ask'), table], correct: money(value), distractors: wrongs(value, [allA, allB, value + 10, value - 1000], money), rng })
}

function mixed(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 3 (1) 三本书连加、(2) 应找回多少（两种算法、第一步）、做一做三道
    if (roll < 0.3) return qThree(d, rng)
    if (roll < 0.52) return qChange(d, rng)
    if (roll < 0.64) return qChangeWay(d, rng)
    if (roll < 0.74) return qChangeStep(d, rng)
    return qChain(K2, d, rng, rng.pick(DO_MIXED), 'do')
  }
  if (d === 2) {
    // 练习十八：口算、箭头链、带括号的混合运算（先算哪一步）、地球、运动鞋、跳高
    if (roll < 0.15) return qCalc(K2, d, rng, rng.pick(ORAL_18), 'oral', false)
    if (roll < 0.4) return qChain(K2, d, rng, rng.pick(CALC_18), 'calc')
    if (roll < 0.5) return qOrder(d, rng)
    if (roll < 0.63) return qArrows(d, rng)
    if (roll < 0.74) return qEarth(d, rng)
    if (roll < 0.87) return qShoes(d, rng)
    return qJump(d, rng)
  }
  // 第 3 档：跳水五轮的总成绩、满 100 减 20、两家商场怎样买最省钱
  if (roll < 0.4) return qDive(d, rng)
  if (roll < 0.65) return qPromo(d, rng)
  return qShop(d, rng)
}
defineGenerator(K2, mixed)

// ══ 整数加法运算律推广到小数（m4s2-06-laws）══

/**
 * 引入：两组算式比一比（课本 3.2 + 0.5 ○ 0.5 + 3.2、(4.7 + 2.6) + 7.4 ○ 4.7 + (2.6 + 7.4)，都是 =）；再加做一做里的连减
 * （5.17 − 1.8 − 3.2 ○ 5.17 − (1.8 + 3.2) 是 =，○ 5.17 − (3.2 − 1.8) 是 <），免得孩子只会选 =。
 */
export const COMPARE_PAIRS: [string, string][] = [
  ['3.2 + 0.5', '0.5 + 3.2'],
  ['(4.7 + 2.6) + 7.4', '4.7 + (2.6 + 7.4)'],
  ['1.88 + 2.3 + 3.7', '1.88 + (2.3 + 3.7)'],
  ['6.7 + 4.95 + 3.3', '6.7 + 3.3 + 4.95'],
  ['(1.38 + 1.75) + 0.25', '1.38 + (1.75 + 0.25)'],
  ['5.17 - 1.8 - 3.2', '5.17 - (1.8 + 3.2)'],
  ['5.17 - 1.8 - 3.2', '5.17 - (3.2 - 1.8)'],
  ['4.02 - 3.5 + 0.98', '4.02 + 0.98 - 3.5'],
  ['4.02 - 3.5 + 0.98', '4.02 - (3.5 + 0.98)'],
  ['0.6 + 7.91 + 3.4 + 0.09', '(0.6 + 3.4) + (7.91 + 0.09)'],
]
/** 算式的值（只有 + − 和一层小括号） */
export function evalExpr(s: string): number {
  const tokens = s.replace(/−/g, '-').match(/\d+(?:\.\d+)?|[-+()]/g) ?? []
  let i = 0
  const term = (): number => {
    const t = tokens[i++]!
    if (t === '(') {
      const v = sumOf()
      i++ // )
      return v
    }
    return milli(t)
  }
  const sumOf = (): number => {
    let v = term()
    while (i < tokens.length && (tokens[i] === '+' || tokens[i] === '-')) {
      const op = tokens[i++]
      const r = term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  return sumOf()
}
function qCompare(d: Difficulty, rng: RNG): Question {
  const [x, y] = rng.pick(COMPARE_PAIRS)
  const [a, b] = rng.chance(0.5) ? [x, y] : [y, x]
  const va = evalExpr(a)
  const vb = evalExpr(b)
  const correct = va > vb ? '>' : va < vb ? '<' : '='
  return labelQuestion({
    kpId: K3,
    type: 'law',
    difficulty: d,
    sig: `cmp-${a}|${b}`,
    stem: [T('m4.dadd.cmp'), E(`${a} ○ ${b}`)],
    correct,
    distractors: ['>', '<', '='].filter((s) => s !== correct),
    rng,
  })
}
/**
 * 例 4：几个小数凑成整数再加（课本 0.6 + 7.91 + 3.4 + 0.09 = 12）；其余从课本出现过的「凑整的两个数」里挑两对、打乱顺序。
 * 得数是整数，数字键盘。
 */
export const MAKE_WHOLE: [string, string][] = [
  ['0.6', '3.4'],
  ['7.91', '0.09'],
  ['2.3', '3.7'],
  ['0.98', '0.02'],
  ['13.7', '4.3'],
  ['1.29', '0.71'],
  ['3.7', '6.3'],
  ['3.9', '1.1'],
  ['4.08', '3.92'],
  ['5.26', '0.74'],
  ['0.36', '2.64'],
]
/** 四个数里能凑成整数的两两组合（只许正好是那两对，不然「和谁先加」有两个答案） */
function wholePairs(nums: string[]): number {
  let n = 0
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (isInt(milli(nums[i]!) + milli(nums[j]!))) n++
  return n
}
function wholeSum(rng: RNG): string[] {
  if (rng.chance(0.3)) return ['0.6', '7.91', '3.4', '0.09']
  for (;;) {
    const [p, q] = rng.shuffle(MAKE_WHOLE).slice(0, 2) as [[string, string], [string, string]]
    const nums = [p[0], q[0], p[1], q[1]]
    if (new Set(nums).size < 4 || wholePairs(nums) !== 2) continue
    // 两对的小数位数一样（都是一位或都是两位），「和谁先加」的几个选项看写法分不出来
    if (places(p[0]) !== places(q[0])) continue
    return rng.chance(0.5) ? nums : [q[0], p[0], q[1], p[1]]
  }
}
function qWhole(d: Difficulty, rng: RNG): Question {
  const nums = wholeSum(rng)
  const value = nums.reduce((s, x) => s + milli(x), 0)
  const n = value / 1000
  return numberQuestion({
    kpId: K3,
    type: 'law',
    difficulty: d,
    sig: `whole-${nums.join('+')}`,
    stem: [T('m4.dadd.easy'), E(`${nums.join(' + ')} = ?`)],
    value: n,
    rng,
    min: 0,
    max: 99,
    smart: [n + 1, n - 1, n + 10, n * 10],
  })
}
/** 例 4：0.6 和哪个数先加起来更简便（凑整的那一个） */
function qPartner(d: Difficulty, rng: RNG): Question {
  const nums = wholeSum(rng)
  const [a] = nums as [string]
  const partner = nums.find((x, i) => i > 0 && isInt(milli(a) + milli(x)))!
  return labelQuestion({
    kpId: K3,
    type: 'law',
    difficulty: d,
    sig: `partner-${nums.join('+')}`,
    stem: [T('m4.dadd.partner', { a }), E(nums.join(' + '))],
    correct: partner,
    distractors: nums.filter((x) => x !== a && x !== partner),
    rng,
  })
}
/** 例 4：小丽这样算 (0.6 + 3.4) + (7.91 + 0.09)，用了什么运算律（加法交换律和加法结合律） */
function qWhichLaw(d: Difficulty, rng: RNG): Question {
  const nums = wholeSum(rng)
  const [a, b, c, e] = nums as [string, string, string, string]
  const law = (k: string): LStr => L(`m4.dadd.law.${k}`)
  return labelQuestion({
    kpId: K3,
    type: 'law',
    difficulty: d,
    sig: `law-${nums.join('+')}`,
    stem: [T('m4.dadd.whichLaw'), E(`${a} + ${b} + ${c} + ${e}`), E(`= (${a} + ${c}) + (${b} + ${e})`)],
    correct: law('both'),
    distractors: [law('comm'), law('assoc'), law('dist')],
    rng,
  })
}
/** 做一做 1 (1)：6.7 + 4.95 + 3.3 = 6.7 + □ + 4.95（3.3，加法交换律）；同样的样子换课本里的数。□ 写成「?」（朗读「几」，同第三单元） */
export const SWAP_BOX: [string, string, string][] = [
  ['6.7', '4.95', '3.3'],
  ['1.88', '2.3', '3.7'],
  ['13.7', '0.98', '0.02'],
  ['0.38', '0.36', '2.64'],
  ['5.26', '3.43', '0.74'],
]
function qSwapBox(d: Difficulty, rng: RNG): Question {
  const [a, b, c] = rng.pick(SWAP_BOX)
  return labelQuestion({
    kpId: K3,
    type: 'law',
    difficulty: d,
    sig: `swap-${a}-${b}-${c}`,
    stem: [T('m4.dadd.box'), E(`${a} + ${b} + ${c} = ${a} + ? + ${b}`)],
    correct: c,
    distractors: [b, a],
    rng,
  })
}
/** 做一做 1 (2)：(1.38 + 1.75) + 0.25 = □ + (□ + □)（加法结合律）：选出右边那个算式（干扰项的值都不相等） */
export const ASSOC_BOX: [string, string, string][] = [
  ['1.38', '1.75', '0.25'],
  ['4.7', '2.6', '7.4'],
  ['0.38', '0.36', '2.64'],
  ['1.29', '3.7', '6.3'],
]
function qAssocBox(d: Difficulty, rng: RNG): Question {
  const [a, b, c] = rng.pick(ASSOC_BOX)
  // 干扰项：括号里的加号写成减号、把括号外面的加号当成减号——值都和左边不相等，而且都不是负数
  const [big, small] = milli(b) >= milli(c) ? [b, c] : [c, b]
  const minus = milli(a) + milli(b) > milli(c) ? `(${a} + ${b}) - ${c}` : `(${a} + ${c}) - ${b}`
  return labelQuestion({
    kpId: K3,
    type: 'law',
    difficulty: d,
    sig: `assoc-${a}-${b}-${c}`,
    stem: [T('m4.dadd.assoc'), E(`(${a} + ${b}) + ${c} = ? + (? + ?)`)],
    correct: `${a} + (${b} + ${c})`,
    distractors: [`${a} + (${big} - ${small})`, minus],
    rng,
  })
}
/** 做一做 2 与练习十九 1、5：怎样简便就怎样计算（只判得数）；整数得数用数字键盘 */
export const EASY_DO = ['1.88 + 2.3 + 3.7', '5.17 - 1.8 - 3.2', '4.02 - 3.5 + 0.98', '13.7 + 0.98 + 0.02 + 4.3']
export const EASY_19 = [
  '5.6 + 2.7 + 4.5',
  '9.14 - 1.43 - 4.57',
  '77 + 2.7 + 2.8 + 25',
  '0.38 + 0.36 + 2.64',
  '8.7 - 5.69 + 2.03',
  '5.26 + 3.43 + 0.74',
  '51.27 - 8.03 - 1.34',
  '1.29 + 3.7 + 0.71 + 6.3',
  '10.75 + 0.4 - 9.86',
  '3.9 + 4.08 + 3.92 + 1.1',
  '36.7 - 19.4 + 35.8',
  '1.28 + 3.7 + 2.46',
  '2 - 0.4 - 0.8',
  '6.07 + 0.4 - 0.08',
  '4.01 - 3.5 + 0.31',
  '15.06 - 3.94 - 2.06',
]
/** 简便计算的错法：连减当成减去两数的差、带着符号搬家搬丢了符号、凑整凑错一位、小数点错一位 */
function easyErrors(s: string): number[] {
  const v = evalExpr(s)
  const nums = (s.replace(/−/g, '-').match(/\d+(?:\.\d+)?/g) ?? []).map(milli)
  const ops = s.match(/[+-]/g) ?? []
  const out: number[] = [v + 1000, v - 1000, v + 100, v - 100, ...shifted(v)]
  if (ops.length === 2 && ops[0] === '-' && ops[1] === '-') out.unshift(nums[0]! - Math.abs(nums[1]! - nums[2]!))
  if (ops.length === 2 && ops[0] === '-' && ops[1] === '+') out.unshift(nums[0]! - nums[1]! - nums[2]!, nums[0]! - (nums[1]! + nums[2]!))
  if (ops.length === 2 && ops[0] === '+' && ops[1] === '-') out.unshift(nums[0]! + nums[1]! + nums[2]!)
  return out
}
function qEasy(d: Difficulty, rng: RNG, s: string, tag: string): Question {
  const value = evalExpr(s)
  return answerQ(K3, d, `${tag}-${s}`, [T('m4.dadd.easy'), E(`${s} = ?`)], value, easyErrors(s), rng, dec, 'law')
}
/** 做一做 2 的方法：5.17 − 1.8 − 3.2 怎样算简便（5.17 − (1.8 + 3.2)）；4.02 − 3.5 + 0.98 先算哪两个数（4.02 + 0.98） */
function qHow(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [a, b, c] = rng.pick([
      ['5.17', '1.8', '3.2'],
      ['9.14', '1.43', '4.57'],
      ['15.06', '3.94', '2.06'],
    ] as const)
    return labelQuestion({
      kpId: K3,
      type: 'law',
      difficulty: d,
      sig: `how-sub-${a}-${b}-${c}`,
      stem: [T('m4.dadd.how'), E(`${a} - ${b} - ${c}`)],
      correct: `${a} - (${b} + ${c})`,
      distractors: [`${a} - (${b} - ${c})`, `${a} - ${b} + ${c}`].map((x) => (x.includes(`(${b} - ${c})`) && milli(b) < milli(c) ? `${a} - (${c} - ${b})` : x)),
      rng,
    })
  }
  // 带着符号搬家：a − b + c 先算 a + c（课本做一做 4.02 + 0.98 = 5；另几道用课本里凑整的两个数）
  const [a, b, c] = rng.pick([
    ['4.02', '3.5', '0.98'],
    ['7.91', '3.4', '0.09'],
    ['5.26', '3.43', '0.74'],
    ['1.29', '0.6', '0.71'],
  ] as const)
  const correct = `${a} + ${c}`
  return labelQuestion({
    kpId: K3,
    type: 'law',
    difficulty: d,
    sig: `how-move-${a}-${b}-${c}`,
    stem: [T('m4.dadd.first'), E(`${a} - ${b} + ${c}`)],
    correct,
    distractors: [`${b} + ${c}`, `${a} - ${b}`],
    rng,
  })
}
/** 练习十九 2：超市购物小票（课本两张），应收金额 / 交易找零 */
export const RECEIPTS: { id: string; items: [string, string][]; cash: string }[] = [
  {
    id: 'r1',
    items: [
      ['bread', '4.75'],
      ['water', '0.95'],
      ['ham', '2.05'],
    ],
    cash: '10.00',
  },
  {
    id: 'r2',
    items: [
      ['oil', '39.50'],
      ['vinegar', '12.70'],
      ['shampoo', '20.05'],
      ['slipper', '10.30'],
    ],
    cash: '100.00',
  },
]
function qReceipt(d: Difficulty, rng: RNG): Question {
  const r = rng.pick(RECEIPTS)
  const total = r.items.reduce((s, [, p]) => s + milli(p), 0)
  const change = milli(r.cash) - total
  const askChange = rng.chance(0.45)
  const table: StemPart = {
    kind: 'stat-table',
    title: L('m4.dadd.rc.title'),
    head: 'row',
    rows: [[L('m4.dadd.rc.name'), L('m4.dadd.rc.count'), L('m4.dadd.rc.price')], ...r.items.map(([id, p]) => [L(`m4.dadd.rc.${id}`), 1, p] as (number | LStr)[]), [L('m4.dadd.rc.cash'), '', r.cash]],
  }
  const value = askChange ? change : total
  const cands = askChange ? [...stepErrors(r.cash, '-', money(total)), total, ...shifted(change)] : [...carryCols(r.items.map(([, p]) => p)).map((k) => colAdd(r.items.map(([, p]) => p), (j) => j === k)), ...shifted(total), total - milli(r.items[r.items.length - 1]![1])]
  return labelQuestion({ kpId: K3, type: 'decimal', difficulty: d, sig: `receipt-${r.id}-${askChange ? 'change' : 'total'}`, stem: [T(askChange ? 'm4.dadd.rc.askChange' : 'm4.dadd.rc.askTotal'), table], correct: money(value), distractors: wrongs(value, cands, money), rng })
}
/** 练习十九 3：家到学校两条路（1.80、1.55 千米），学校到公园三条路（2.76、2.30、2.65 千米），怎样走最近、最近多远（3.85 千米） */
export const ROUTES = { home: ['1.80', '1.55'], park: ['2.76', '2.30', '2.65'] }
function qRoute(d: Difficulty, rng: RNG): Question {
  const h = ROUTES.home.map(milli)
  const p = ROUTES.park.map(milli)
  const best = Math.min(...h) + Math.min(...p)
  const all = h.flatMap((x) => p.map((y) => x + y))
  return labelQuestion({
    kpId: K3,
    type: 'decimal',
    difficulty: d,
    sig: 'route',
    stem: [T('m4.dadd.route')],
    correct: dec(best),
    distractors: wrongs(best, all.filter((v) => v !== best).sort((a, b) => a - b)),
    rng,
  })
}
/** 练习十九 4：把分数改写成小数再计算（课本四道） */
export const FRAC_19: [string, Op, string, string, string][] = [
  ['1/10', '+', '4/10', '0.1', '0.4'],
  ['93/100', '-', '76/100', '0.93', '0.76'],
  ['3/100', '+', '5/10', '0.03', '0.5'],
  ['7/10', '-', '61/100', '0.7', '0.61'],
]
function qFrac(d: Difficulty, rng: RNG): Question {
  const [fa, op, fb, a, b] = rng.pick(FRAC_19)
  const value = calc(a, op, b)
  const cands = [...stepErrors(a, op, b), ...shifted(value), op === '+' ? Math.abs(milli(a) - milli(b)) : milli(a) + milli(b)]
  return answerQ(K3, d, `frac-${fa}${op}${fb}`, [T('m4.dadd.frac'), E(`${fa} ${SYM[op]} ${fb} = ?`)], value, cands, rng)
}
/** 练习十九 7：袜子每双 4.68 元，买 5 双送 1 双，买 12 双要付 10 双的钱（46.8 元） */
function qSocks(d: Difficulty, rng: RNG): Question {
  const value = milli('4.68') * 10
  return answerQ(K3, d, 'socks', [T('m4.dadd.socks')], value, [milli('4.68') * 12, milli('4.68') * 11, value / 10, milli('4.68') * 2], rng)
}
/** 练习十九 8*：物体 4 秒落地，第 1 秒落下 4.9 米，以后每秒比前一秒多 9.8 米，下落前离地面多少米（78.4 米） */
function qFall(d: Difficulty, rng: RNG): Question {
  const steps = [0, 1, 2, 3].map((i) => milli('4.9') + i * milli('9.8'))
  const value = steps.reduce((a, b) => a + b, 0)
  return answerQ(K3, d, 'fall', [T('m4.dadd.fall')], value, [steps[3]!, value - steps[3]!, milli('4.9') + milli('9.8') * 4, ...shifted(value)], rng)
}

function laws(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 引入的比一比、例 4（凑整：得数、和谁先加、用了什么运算律）、做一做 □ 里填数、怎样简便就怎样计算（得数与方法）
    if (roll < 0.16) return qCompare(d, rng)
    if (roll < 0.3) return qWhole(d, rng)
    if (roll < 0.4) return qPartner(d, rng)
    if (roll < 0.48) return qWhichLaw(d, rng)
    if (roll < 0.58) return qSwapBox(d, rng)
    if (roll < 0.66) return qAssocBox(d, rng)
    if (roll < 0.88) return qEasy(d, rng, rng.pick(EASY_DO), 'do')
    return qHow(d, rng)
  }
  if (d === 2) {
    // 练习十九：两组简便计算、购物小票、最近的路线、分数改写成小数再算
    if (roll < 0.5) return qEasy(d, rng, rng.pick(EASY_19), 'calc')
    if (roll < 0.68) return qReceipt(d, rng)
    if (roll < 0.8) return qRoute(d, rng)
    return qFrac(d, rng)
  }
  // 第 3 档：买 5 送 1、下落的物体（选做）、凑整的四个数
  if (roll < 0.35) return qSocks(d, rng)
  if (roll < 0.65) return qFall(d, rng)
  return qWhole(d, rng)
}
defineGenerator(K3, laws)
