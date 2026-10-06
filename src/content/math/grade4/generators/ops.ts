import type { Difficulty, InputMode, LStr, Question, StemPart, TreeStep } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 四则运算（四下第一单元，课本 p2–12，平台当前的旧版结构）：加、减法的意义和各部分间的关系；乘、除法的意义和各部分间的关系
// （含例 3 有关 0 的运算）；括号（例 4 小括号、中括号）；解决问题（例 5 租船、练习三的租车与两种方案）。
// 术语照这本课本：相加的两个数叫加数、相乘的两个数叫因数（四上新教材叫「乘数」，这本旧版课本叫「因数」）、
// 减法是加法的逆运算、除法是乘法的逆运算、加减乘除统称四则运算；有余数的除法：被除数 = 商 × 除数 + 余数。
// 算式：乘号「×」、除号「÷」、减号 ASCII「-」，小括号「( )」、中括号「[ ]」（朗读读「括号」「中括号」）。
// 未知数照课本的「🌸 代表几」写成算式里的「?」（练习页把按的数填进去）；0 不能作除数，不出 a ÷ 0。
// 题目文字里不写圆括号（读「括号」）、不写「长」「全长」（读音不唯一），「只」前面不放数（读错），2 后面只跟量词表里有的量词。
// ─────────────────────────────────────────────────────────────

export const ADDSUB = 'm4s2-01-addsub'
export const MULDIV = 'm4s2-01-muldiv'
export const BRACKETS = 'm4s2-01-brackets'
export const SOLVE = 'm4s2-01-solve'

type Params = Record<string, LStr | number>
type QType = 'arith' | 'mixed-ops'
const TYPE: Record<string, QType> = { [ADDSUB]: 'arith', [MULDIV]: 'arith', [BRACKETS]: 'mixed-ops', [SOLVE]: 'mixed-ops' }

const text = (k: string, p?: Params): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const expr = (e: string): StemPart => ({ kind: 'expr', expr: e })
const key = (k: string, p?: Params): LStr => (p ? { k, p } : { k })
const flat = (e: string): string => e.replace(/\s+/g, '')

/** 数值题：键盘或选项（input 不填就随机） */
function numQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[], input?: InputMode): Question {
  return numberQuestion({
    kpId,
    type: TYPE[kpId]!,
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
function pickQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[], rng: RNG, n = 3): Question {
  const k = (l: LStr): string => (typeof l === 'string' ? l : JSON.stringify(l))
  const seen = new Set([k(correct)])
  const ds: LStr[] = []
  for (const x of distractors) {
    if (seen.has(k(x)) || ds.length >= n) continue
    seen.add(k(x))
    ds.push(x)
  }
  return labelQuestion({ kpId, type: TYPE[kpId]!, difficulty: d, sig, stem, correct, distractors: ds, rng })
}

const RIGHT: LStr = { k: 'm4.ops.right' }
const WRONG: LStr = { k: 'm4.ops.wrong' }
const judge = (ok: boolean): [LStr, LStr[]] => (ok ? [RIGHT, [WRONG]] : [WRONG, [RIGHT]])
const word = (w: string): LStr => ({ k: `m4.ops.w.${w}` })

// ─────────────────────────────────────────────────────────────
// 加、减法的意义和各部分间的关系（p2–4，例 1、做一做，练习一）
// 第 1 档：例 1 西宁—格尔木—拉萨（配线段图：求全程、求后一段、求前一段；也出别的线路）；做一做「根据 2468 + 575 = 3043，
//          直接写出得数」；加法、减法的意义与加数、和、被减数、逆运算这些名称，算式里的数叫什么；各部分间的关系（横线上填什么、
//          由两个数求第三个数）；练习一 3 的「🌸 代表几」；练习一 1 的四道应用题（滑雪场门票、练习本、男生女生）。
// 第 2 档：练习一 2「根据 67 - 55 = 12 写出另外两个算式」（改成直接写得数）；四位数的未知数；应用题「用什么方法计算」；
//          练习一 5 的验算（选哪个算式验算）。
// 第 3 档：四位数的未知数、验算、由两个数求第三个数。
// ─────────────────────────────────────────────────────────────

const ROUTES = [
  ['xining', 'geermu', 'lasa'],
  ['jia', 'yi', 'bing'],
].map((r) => r.map((p) => key(`m4.ops.place.${p}`)))

/** 例 1：铁路线（线段图）。textbook = 课本的 814、1142、1956 */
function railQ(d: Difficulty, rng: RNG): Question {
  const textbook = rng.chance(0.3)
  const [x, y] = textbook ? [814, 1142] : [rng.int(320, 980), rng.int(420, 1480)]
  const t = x + y
  const [a, b, c] = textbook ? ROUTES[0]! : ROUTES[1]!
  const ask = rng.pick(['sum', 'second', 'first'] as const)
  const parts =
    ask === 'sum'
      ? [{ len: x, label: `${x} km` }, { len: y, label: `${y} km` }]
      : ask === 'second'
        ? [{ len: x, label: `${x} km` }, { len: y, label: '?' }]
        : [{ len: x, label: '?' }, { len: y, label: `${y} km` }]
  const line: StemPart = { kind: 'part-line', parts, total: ask === 'sum' ? '?' : `${t} km`, names: [a!, b!, c!] }
  // 站名和数都在线段图上，题目只问一句（课本例 1 的问法）
  if (ask === 'sum') return numQ(ADDSUB, d, `rail-sum-${x}-${y}`, [text('m4.ops.rail.sum', { a: a!, c: c! }), line], t, rng, [t + 100, t - 100, Math.abs(y - x), t + 10])
  if (ask === 'second') return numQ(ADDSUB, d, `rail-2nd-${t}-${x}`, [text('m4.ops.rail.second', { b: b!, c: c! }), line], y, rng, [t + x, y + 100, y - 100, y + 10])
  return numQ(ADDSUB, d, `rail-1st-${t}-${y}`, [text('m4.ops.rail.first', { a: a!, b: b! }), line], x, rng, [t + y, x + 100, x - 100, x + 10])
}

/** 做一做：根据 2468 + 575 = 3043，直接写出 3043 - 2468、3043 - 575 的得数 */
function addInverseQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(1000, 4999)
  const b = rng.int(100, 999)
  const c = a + b
  const askA = rng.chance(0.5)
  const known = `${a} + ${b} = ${c}`
  const e = askA ? `${c} - ${b} = ?` : `${c} - ${a} = ?`
  const v = askA ? a : b
  return numQ(ADDSUB, d, `inv-${flat(known)}-${askA ? 'a' : 'b'}`, [text('m4.ops.direct', { e: known }), expr(e)], v, rng, [askA ? b : a, c, v + 10, v - 10])
}

/** 练习一 2：根据 67 - 55 = 12，直接写出另外两个算式的得数（55 + 12、67 - 12） */
function subInverseQ(d: Difficulty, rng: RNG): Question {
  const a = d === 3 ? rng.int(1000, 9999) : rng.int(100, 999)
  let b = rng.int(Math.floor(a / 5), a - Math.floor(a / 5))
  if (b * 2 === a) b += 1
  const c = a - b
  const known = `${a} - ${b} = ${c}`
  const askSum = rng.chance(0.5)
  const e = askSum ? (rng.chance(0.5) ? `${b} + ${c} = ?` : `${c} + ${b} = ?`) : `${a} - ${c} = ?`
  const v = askSum ? a : b
  return numQ(ADDSUB, d, `subinv-${flat(known)}-${flat(e)}`, [text('m4.ops.direct', { e: known }), expr(e)], v, rng, [askSum ? b - c : c, v + 10, v - 10, askSum ? b : a])
}

interface DefItem {
  q: string
  a: string
  w: string[]
}
/** 课本里的名称：加法、减法的意义，加数、和、被减数，逆运算 */
const ADD_DEFS: DefItem[] = [
  { q: 'addDef', a: 'add', w: ['sub', 'mul'] },
  { q: 'subDef', a: 'sub', w: ['add', 'div'] },
  { q: 'addend', a: 'addend', w: ['sum', 'minuend'] },
  { q: 'sum', a: 'sum', w: ['addend', 'diff'] },
  { q: 'minuend', a: 'minuend', w: ['subtrahend', 'diff'] },
  { q: 'subInverse', a: 'add', w: ['mul', 'div'] },
]
const MUL_DEFS: DefItem[] = [
  { q: 'mulDef', a: 'mul', w: ['add', 'div'] },
  { q: 'divDef', a: 'div', w: ['mul', 'sub'] },
  { q: 'factor', a: 'factor', w: ['product', 'addend'] },
  { q: 'product', a: 'product', w: ['factor', 'quotient'] },
  { q: 'dividend', a: 'dividend', w: ['divisor', 'quotient'] },
  { q: 'divInverse', a: 'mul', w: ['add', 'sub'] },
]

function defQ(kpId: string, d: Difficulty, rng: RNG, defs: DefItem[]): Question {
  const it = rng.pick(defs)
  return pickQ(kpId, d, `def-${it.q}`, [text(`m4.ops.q.${it.q}`)], word(it.a), it.w.map(word), rng)
}

/** 一道算式里的数叫什么（加数 / 和，被减数 / 减数 / 差，因数 / 积，被除数 / 除数 / 商）：三个数互不相同 */
function partNameQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const mul = kpId === MULDIV
  for (;;) {
    let e: string
    let names: [number, string][]
    let pool: string[]
    if (!mul) {
      const a = rng.int(100, 999)
      const b = rng.int(100, 999)
      if (rng.chance(0.5)) {
        e = `${a} + ${b} = ${a + b}`
        names = [[a, 'addend'], [b, 'addend'], [a + b, 'sum']]
        pool = ['addend', 'sum', 'diff']
      } else {
        const [m, s] = a > b ? [a, b] : [b, a]
        e = `${m} - ${s} = ${m - s}`
        names = [[m, 'minuend'], [s, 'subtrahend'], [m - s, 'diff']]
        pool = ['minuend', 'subtrahend', 'diff']
      }
    } else {
      const a = rng.int(11, 99)
      const b = rng.int(11, 99)
      if (rng.chance(0.5)) {
        e = `${a} × ${b} = ${a * b}`
        names = [[a, 'factor'], [b, 'factor'], [a * b, 'product']]
        pool = ['factor', 'product', 'quotient']
      } else {
        e = `${a * b} ÷ ${a} = ${b}`
        names = [[a * b, 'dividend'], [a, 'divisor'], [b, 'quotient']]
        pool = ['dividend', 'divisor', 'quotient']
      }
    }
    if (new Set(names.map((x) => x[0])).size !== 3) continue
    const [n, name] = rng.pick(names)
    return pickQ(kpId, d, `name-${flat(e)}-${n}`, [text('m4.ops.q.partName', { e, n })], word(name), pool.filter((p) => p !== name).map(word), rng)
  }
}

/** 各部分间的关系：横线上填什么（课本的关系框） */
const ADD_BLANKS: DefItem[] = [
  { q: 'sumAdd', a: 'addend', w: ['sum', 'diff'] },
  { q: 'addendSub', a: 'otherAddend', w: ['sum', 'diff'] },
  { q: 'diffSub', a: 'subtrahend', w: ['diff', 'sum'] },
  { q: 'subSub', a: 'diff', w: ['subtrahend', 'sum'] },
  { q: 'minAdd', a: 'diff', w: ['minuend', 'addend'] },
]
const MUL_BLANKS: DefItem[] = [
  { q: 'productMul', a: 'factor', w: ['product', 'quotient'] },
  { q: 'factorDiv', a: 'otherFactor', w: ['product', 'quotient'] },
  { q: 'quotientDiv', a: 'divisor', w: ['quotient', 'product'] },
  { q: 'divisorDiv', a: 'quotient', w: ['divisor', 'product'] },
  { q: 'dividendMul', a: 'divisor', w: ['dividend', 'remainder'] },
  { q: 'remainder', a: 'remainder', w: ['quotient', 'dividend'] },
]

function blankQ(kpId: string, d: Difficulty, rng: RNG, items: DefItem[]): Question {
  const it = rng.pick(items)
  return pickQ(kpId, d, `rel-${it.q}`, [text('m4.ops.q.whichFill'), text(`m4.ops.blank.${it.q}`)], word(it.a), it.w.map(word), rng)
}

/** 由各部分间的关系求第三个数：减数和差求被减数、被减数和差求减数、和与一个加数求另一个加数 */
function addRelNumQ(d: Difficulty, rng: RNG): Question {
  const big = d >= 2
  const kind = rng.int(0, 2)
  if (kind === 0) {
    const b = big ? rng.int(1000, 4999) : rng.int(100, 499)
    const c = big ? rng.int(1000, 4999) : rng.int(100, 499)
    return numQ(ADDSUB, d, `rn-min-${b}-${c}`, [text('m4.ops.rn.minuend', { b, c })], b + c, rng, [Math.abs(b - c), b + c + 10, b + c - 100])
  }
  if (kind === 1) {
    const a = big ? rng.int(2000, 9999) : rng.int(300, 999)
    const c = rng.int(Math.floor(a / 5), a - Math.floor(a / 5))
    return numQ(ADDSUB, d, `rn-sub-${a}-${c}`, [text('m4.ops.rn.subtrahend', { a, c })], a - c, rng, [a + c, a - c + 10, a - c - 10])
  }
  const s = big ? rng.int(2000, 9999) : rng.int(300, 999)
  const x = rng.int(Math.floor(s / 5), s - Math.floor(s / 5))
  return numQ(ADDSUB, d, `rn-add-${s}-${x}`, [text('m4.ops.rn.addend', { s, x })], s - x, rng, [s + x, s - x + 10, s - x - 10])
}

/** 练习一 3：「🌸 代表几」写成算式里的「?」（? + 18 = 37、150 + ? = 210、540 - ? = 210、? - 73 = 100） */
function addUnknownQ(d: Difficulty, rng: RNG): Question {
  const big = d >= 2
  const lo = big ? 1000 : 10
  const hi = big ? 5000 : 400
  const form = rng.int(0, 3)
  const x = rng.int(lo, hi)
  const y = rng.int(lo, hi)
  let e: string
  let v: number
  let smart: number[]
  if (form === 0) {
    e = `? + ${y} = ${x + y}`
    v = x
    smart = [x + y + y, x + 10, x - 10]
  } else if (form === 1) {
    e = `${x} + ? = ${x + y}`
    v = y
    smart = [x + y + x, y + 10, y - 10]
  } else if (form === 2) {
    // a - ? = c：常见错误是 a + c
    const [a, c] = [x + y, x]
    e = `${a} - ? = ${c}`
    v = y
    smart = [a + c, y + 10, y - 10]
  } else {
    // ? - b = c：常见错误是 c - b
    e = `? - ${y} = ${x}`
    v = x + y
    smart = [Math.abs(x - y), v + 10, v - 10]
  }
  return numQ(ADDSUB, d, `unk-${flat(e)}`, [text('m4.ops.fillQ'), expr(e)], v, rng, smart)
}

/** 练习一 1 的四道应用题（滑雪场上午 / 下午 / 全天的门票、练习本卖出和还剩、男生女生） */
function addStory(d: Difficulty, rng: RNG): { k: string; p: Params; v: number; add: boolean; smart: number[] } {
  const big = d >= 2
  const kind = rng.int(0, 3)
  if (kind === 0) {
    const [a, b] = big ? [rng.int(120, 480), rng.int(120, 480)] : [rng.int(40, 99), rng.int(30, 99)]
    return { k: 'm4.ops.st.ski', p: { a, b }, v: a + b, add: true, smart: [Math.abs(a - b), a + b + 10, a + b - 10] }
  }
  if (kind === 1) {
    const [a, b] = big ? [rng.int(120, 480), rng.int(120, 480)] : [rng.int(40, 99), rng.int(30, 99)]
    return { k: 'm4.ops.st.skiPm', p: { t: a + b, a }, v: b, add: false, smart: [a + b + a, b + 10, b - 10] }
  }
  if (kind === 2) {
    const [a, b] = [rng.int(12, 60) * 10, rng.int(12, 60) * 10]
    return { k: 'm4.ops.st.books', p: { a, b }, v: a + b, add: true, smart: [Math.abs(a - b), a + b + 100, a + b - 100] }
  }
  const t = big ? rng.int(1200, 2400) : rng.int(500, 999)
  const a = rng.int(Math.floor(t * 0.4), Math.floor(t * 0.6))
  return { k: 'm4.ops.st.school', p: { t, a }, v: t - a, add: false, smart: [t + a, t - a + 10, t - a - 10] }
}

function addStoryQ(d: Difficulty, rng: RNG): Question {
  const s = addStory(d, rng)
  return numQ(ADDSUB, d, `${s.k}-${Object.values(s.p).join('-')}`, [text(s.k, s.p)], s.v, rng, s.smart)
}

/** 练习一 1「用什么方法计算？」：选加法还是减法 */
function addMethodQ(d: Difficulty, rng: RNG): Question {
  const s = addStory(d, rng)
  const [c, w] = s.add ? ['add', 'sub'] : ['sub', 'add']
  return pickQ(ADDSUB, d, `method-${s.k}-${Object.values(s.p).join('-')}`, [text(s.k, s.p), text('m4.ops.q.method')], word(c), [word(w)], rng)
}

/** 练习一 5：计算并验算——下面哪个算式可以用来验算（只放一个对的） */
function addVerifyQ(d: Difficulty, rng: RNG): Question {
  const big = d === 3
  const a = big ? rng.int(1000, 4999) : rng.int(120, 699)
  let b = big ? rng.int(1000, 4999) : rng.int(98, 499)
  if (b === a) b += 7
  if (rng.chance(0.5)) {
    const c = a + b
    const e = `${a} + ${b} = ${c}`
    const right = rng.chance(0.5) ? `${c} - ${b}` : `${c} - ${a}`
    return pickQ(ADDSUB, d, `verify-${flat(e)}-${flat(right)}`, [text('m4.ops.q.verify', { e })], right, rng.shuffle([`${c} + ${b}`, `${c} + ${a}`, a > b ? `${a} - ${b}` : `${b} - ${a}`]), rng, 2)
  }
  const [m, s] = a > b ? [a, b] : [b, a]
  const c = m - s
  const e = `${m} - ${s} = ${c}`
  const right = rng.chance(0.5) ? `${c} + ${s}` : `${m} - ${c}`
  return pickQ(ADDSUB, d, `verify-${flat(e)}-${flat(right)}`, [text('m4.ops.q.verify', { e })], right, rng.shuffle([c > s ? `${c} - ${s}` : `${s} - ${c}`, `${m} + ${c}`, `${m} + ${s}`]), rng, 2)
}

defineGenerator(ADDSUB, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.2) return railQ(d, rng)
    if (roll < 0.34) return addInverseQ(d, rng)
    if (roll < 0.44) return defQ(ADDSUB, d, rng, ADD_DEFS)
    if (roll < 0.5) return partNameQ(ADDSUB, d, rng)
    if (roll < 0.58) return blankQ(ADDSUB, d, rng, ADD_BLANKS)
    if (roll < 0.66) return addRelNumQ(d, rng)
    if (roll < 0.83) return addUnknownQ(d, rng)
    return addStoryQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.18) return subInverseQ(d, rng)
    if (roll < 0.36) return addUnknownQ(d, rng)
    if (roll < 0.52) return addMethodQ(d, rng)
    if (roll < 0.62) return addStoryQ(d, rng)
    if (roll < 0.8) return addVerifyQ(d, rng)
    if (roll < 0.9) return addRelNumQ(d, rng)
    return railQ(d, rng)
  }
  if (roll < 0.3) return addUnknownQ(d, rng)
  if (roll < 0.55) return addVerifyQ(d, rng)
  if (roll < 0.8) return addRelNumQ(d, rng)
  return subInverseQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 乘、除法的意义和各部分间的关系（p5–8，例 2、做一做、例 3 有关 0 的运算，练习二）
// 第 1 档：例 2 插花（4 个花瓶每瓶 3 枝一共几枝、每 3 枝插一瓶插几瓶、平均插到 4 个花瓶每瓶几枝；3 + 3 + 3 + 3 用乘法写）；
//          乘法、除法的意义与因数、积、被除数、逆运算；算式里的数叫什么；各部分间的关系（横线上填什么，含有余数的除法
//          「被除数 = 商 × 除数 + 余数」）、由两个数求第三个数；做一做「根据 36 × 14 = 504，直接写出得数」；例 3 有关 0 的运算
//          （直接写得数、说法对不对）；练习二 3 的未知数（只要乘或除以一位数的）；练习二 1 的应用题（除数是一位数的）。
// 第 2 档：练习二 3 课本大小的未知数（除以两位数）；练习二 4 有余数除法的表；练习二 2 由除法写另外两个；练习二 1、6 的
//          应用题（大象体重、铅笔装盒、分桃还剩）；练习二 8 宇宙飞船的表；练习二 5 选验算的算式；练习二 9 图形（水果）算式对不对。
// 第 3 档：思考题「破译密码」；有余数除法表求除数；课本大小的未知数；水果算式。
// ─────────────────────────────────────────────────────────────

/** 例 2 插花：每瓶 a 枝（不出 2：「枝」不在 2 读「两」的量词表里），n 个花瓶 */
function flowersQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(3, 9)
  const n = rng.int(3, 9)
  const t = a * n
  const kind = rng.int(0, 3)
  if (kind === 0) return numQ(MULDIV, d, `fl-total-${a}-${n}`, [text('m4.ops.fl.total', { a, n })], t, rng, [a + n, t + a, t - a])
  if (kind === 1) return numQ(MULDIV, d, `fl-vases-${t}-${a}`, [text('m4.ops.fl.vases', { t, a })], n, rng, [t - a, n + 1, n - 1])
  if (kind === 2) return numQ(MULDIV, d, `fl-each-${t}-${n}`, [text('m4.ops.fl.each', { t, n })], a, rng, [t - n, a + 1, a - 1])
  // 3 + 3 + 3 + 3 = 12 用乘法算：几个相同加数的和（加数不超过 5 个，免得算式太长）
  const k = rng.int(3, 5)
  const b = rng.pick([3, 4, 5, 6, 7, 8, 9].filter((x) => x !== k))
  const sum = Array.from({ length: k }, () => String(b)).join(' + ')
  const s = `${sum} = ${b * k}`
  return pickQ(MULDIV, d, `fl-tomul-${b}-${k}`, [text('m4.ops.fl.toMul', { s })], `${b} × ${k} = ${b * k}`, rng.shuffle([`${b} + ${k} = ${b + k}`, `${b} × ${b} = ${b * b}`, `${k} × ${k} = ${k * k}`]), rng, 2)
}

/** 由两个数求第三个数：被除数（除数、商）、除数（被除数、商）、另一个因数（积、一个因数）、有余数的被除数 */
function mulRelNumQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  if (kind === 0) {
    const [b, c] = [rng.int(11, 40), rng.int(2, 30)]
    return numQ(MULDIV, d, `rn-dividend-${b}-${c}`, [text('m4.ops.rn.dividend', { b, c })], b * c, rng, [b + c, b * c + b, b * c - c])
  }
  if (kind === 1) {
    // 除以一位数（第 1 档）/ 两位数（第 2 档起）
    const c = d === 1 ? rng.int(2, 9) : rng.int(11, 40)
    const b = rng.int(11, 60)
    return numQ(MULDIV, d, `rn-divisor-${b * c}-${c}`, [text('m4.ops.rn.divisor', { a: b * c, c })], b, rng, [b * c * c, b + 1, b - 1])
  }
  if (kind === 2) {
    const x = d === 1 ? rng.int(2, 9) : rng.int(11, 40)
    const y = rng.int(11, 60)
    return numQ(MULDIV, d, `rn-factor-${x * y}-${x}`, [text('m4.ops.rn.factor', { p: x * y, x })], y, rng, [x * y * x, x * y - x, y + 1])
  }
  const b = d === 1 ? rng.int(3, 9) : rng.int(11, 30)
  const c = rng.int(5, 40)
  const r = rng.int(1, b - 1)
  return numQ(MULDIV, d, `rn-rem-${b}-${c}-${r}`, [text('m4.ops.rn.remDividend', { b, c, r })], b * c + r, rng, [b * c, b * c - r, b * c + r + b, (b + r) * c])
}

/** 做一做：根据 36 × 14 = 504，直接写出 504 ÷ 14、504 ÷ 36 的得数 */
function mulInverseQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(11, 99)
  const b = rng.pick(Array.from({ length: 89 }, (_, i) => i + 11).filter((x) => x !== a))
  const p = a * b
  const askA = rng.chance(0.5)
  const known = `${a} × ${b} = ${p}`
  const e = askA ? `${p} ÷ ${b} = ?` : `${p} ÷ ${a} = ?`
  const v = askA ? a : b
  return numQ(MULDIV, d, `inv-${flat(known)}-${askA ? 'a' : 'b'}`, [text('m4.ops.direct', { e: known }), expr(e)], v, rng, [askA ? b : a, p, v + 10, v - 10])
}

/** 练习二 2：根据 1125 ÷ 25 = 45，直接写出另外两个算式的得数（45 × 25、1125 ÷ 45） */
function divInverseQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(11, 99)
  const b = rng.int(11, 60)
  const p = a * b
  const known = `${p} ÷ ${a} = ${b}`
  const askP = rng.chance(0.5)
  const e = askP ? (rng.chance(0.5) ? `${a} × ${b} = ?` : `${b} × ${a} = ?`) : `${p} ÷ ${b} = ?`
  const v = askP ? p : a
  return numQ(MULDIV, d, `divinv-${flat(known)}-${flat(e)}`, [text('m4.ops.direct', { e: known }), expr(e)], v, rng, [askP ? a + b : b, v + 10, v - 10, askP ? p + a : p])
}

/** 例 3 有关 0 的说法：对的、不对的（不出「a ÷ 0」这样的算式） */
const ZERO_SAYS: [string, boolean][] = [
  ['add0', true],
  ['add0Wrong', false],
  ['sameSub', true],
  ['sub0', true],
  ['sub0Wrong', false],
  ['mul0', true],
  ['mul0Wrong', false],
  ['div0', true],
  ['divisor0', false],
]

/** 例 3、练习二 7：有关 0 的运算——直接写得数，或判断说法 */
function zeroQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) {
    const [k, ok] = rng.pick(ZERO_SAYS)
    const [c, w] = judge(ok)
    return pickQ(MULDIV, d, `zero-say-${k}`, [text(`m4.ops.z.${k}`)], c, w, rng)
  }
  const n = rng.chance(0.5) ? rng.int(2, 99) : rng.int(100, 999)
  const forms: [string, number][] = [
    [`${n} + 0 = ?`, n],
    [`0 + ${n} = ?`, n],
    [`${n} - ${n} = ?`, 0],
    [`${n} - 0 = ?`, n],
    [`0 × ${n} = ?`, 0],
    [`${n} × 0 = ?`, 0],
    [`0 ÷ ${n} = ?`, 0],
  ]
  const [e, v] = rng.pick(forms)
  return numQ(MULDIV, d, `zero-${flat(e)}`, [expr(e)], v, rng, v === 0 ? [n, 1, 10] : [0, n + 1, n * 10])
}

/** 练习二 3：「🌸 代表几」——第 1 档只要乘法或除以一位数，第 2 档起照课本（89 × ? = 356、? × 18 = 774、672 ÷ ? = 24、858 ÷ ? = 39） */
function mulUnknownQ(d: Difficulty, rng: RNG): Question {
  const easy = d === 1
  const form = rng.int(0, 3)
  let e: string
  let v: number
  let smart: number[]
  if (form === 0 || form === 1) {
    // 一个因数 × ? = 积：求另一个因数
    const known = easy ? rng.int(2, 9) : rng.int(11, 99)
    const x = easy ? rng.int(11, 99) : rng.int(2, 60)
    const p = known * x
    e = form === 0 ? `${known} × ? = ${p}` : `? × ${known} = ${p}`
    v = x
    smart = [p - known, p * known, x + 1, x - 1]
  } else if (form === 2) {
    // 被除数 ÷ ? = 商：除数 = 被除数 ÷ 商
    const q = easy ? rng.int(2, 9) : rng.int(11, 60)
    const x = rng.int(11, 40)
    e = `${q * x} ÷ ? = ${q}`
    v = x
    smart = [q * x * q, q * x - q, x + 1, x - 1]
  } else {
    // ? ÷ 除数 = 商：被除数 = 商 × 除数（乘法，第 1 档也出两位数）
    const b = rng.int(easy ? 3 : 11, easy ? 30 : 60)
    const q = rng.int(easy ? 11 : 11, easy ? 60 : 99)
    e = `? ÷ ${b} = ${q}`
    v = b * q
    smart = [b + q, b * q + b, b * q - q]
  }
  return numQ(MULDIV, d, `unk-${flat(e)}`, [text('m4.ops.fillQ'), expr(e)], v, rng, smart)
}

/** 练习二 4：有余数的除法表（被除数 | 除数 | 商 | 余数），缺一格 */
function remainderTableQ(d: Difficulty, rng: RNG): Question {
  const easy = d === 1
  const b = easy ? rng.int(3, 9) : rng.int(11, 40)
  const c = rng.int(easy ? 11 : 6, easy ? 60 : 40)
  const r = rng.int(1, b - 1)
  const a = b * c + r
  // 第 1 档：求被除数（乘再加）或除以一位数求商、余数；第 2 档起也求除数（(a - r) ÷ c）
  const ask = easy ? rng.pick([0, 0, 2, 3]) : d === 3 ? rng.pick([1, 1, 0, 2, 3]) : rng.pick([0, 1, 2, 3])
  const row: (number | null)[] = [a, b, c, r]
  const v = row[ask]!
  row[ask] = null
  const head: LStr[] = ['dividend', 'divisor', 'quotient', 'remainder'].map(word)
  const smart = ask === 0 ? [b * c, b * c - r, a + b] : ask === 1 ? [b + 1, b - 1, Math.floor(a / c)] : ask === 2 ? [c + 1, c - 1, Math.floor(a / b) - 1] : [r + 1, b - r, (r + b) % (b + 1)]
  return numQ(MULDIV, d, `remtab-${a}-${b}-${ask}`, [text('m4.ops.tableFill'), { kind: 'stat-table', rows: [head, row], head: 'row' }], v, rng, smart, 'numpad')
}

/** 练习二 1、6 的应用题 */
function mulStoryQ(d: Difficulty, rng: RNG): Question {
  const easy = d === 1
  const kind = easy ? rng.int(0, 3) : rng.int(2, 5)
  if (kind === 0) {
    const [v, t] = [rng.int(3, 9), rng.int(3, 9)]
    return numQ(MULDIV, d, `snail1-${v}-${t}`, [text('m4.ops.st.snail', { v, t })], v * t, rng, [v + t, v * t + v, v * t - t])
  }
  if (kind === 1) {
    const [v, t] = [rng.int(3, 9), rng.int(3, 9)]
    return numQ(MULDIV, d, `snail2-${t}-${v * t}`, [text('m4.ops.st.snailAvg', { t, d: v * t })], v, rng, [v * t - t, v + 1, v - 1])
  }
  if (kind === 2) {
    // 铅笔装盒：第 1 档每盒一位数，第 2 档起每盒 12 支这样的两位数
    const k = easy ? rng.int(3, 9) : rng.pick([10, 12, 15, 20, 24])
    const m = rng.int(easy ? 11 : 5, easy ? 30 : 40)
    return numQ(MULDIV, d, `pencils-${k * m}-${k}`, [text('m4.ops.st.pencils', { n: k * m, k })], m, rng, [k * m - k, m + 1, m - 1])
  }
  if (kind === 3) {
    // 大象的体重是牛的几倍：求牛的体重（课本 5600 ÷ 8）
    const k = rng.int(3, 9)
    const w = rng.int(5, 9) * 100
    return numQ(MULDIV, d, `elephant-${w * k}-${k}`, [text('m4.ops.st.elephant', { w: w * k, k })], w, rng, [w * k * k, w * k - k, w + 100])
  }
  if (kind === 4) {
    // 分桃（练习二 6，「只」前面不放数，改成分给小朋友）：被除数 = 商 × 除数 + 余数
    const n = rng.int(3, 9)
    const k = rng.int(6, 15)
    const r = rng.int(1, n - 1)
    return numQ(MULDIV, d, `peaches-${n}-${k}-${r}`, [text('m4.ops.st.peaches', { n, k, r })], n * k + r, rng, [n * k, n * k - r, n + k + r, (n + r) * k])
  }
  const k = rng.int(3, 9)
  const w = rng.int(11, 90) * 10
  return numQ(MULDIV, d, `elephant-${w * k}-${k}`, [text('m4.ops.st.elephant', { w: w * k, k })], w, rng, [w * k - k, w + 10, w - 10])
}

/** 练习二 8：宇宙飞船 5 秒飞行 55 千米，表里时间 / 路程缺一格 */
function shipQ(d: Difficulty, rng: RNG): Question {
  const v = rng.pick([8, 9, 11, 12])
  const t0 = rng.int(3, 6)
  const ts = rng.shuffle([2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 15, 16].filter((x) => x !== t0)).slice(0, 3).sort((a, b) => a - b)
  const ask = rng.int(0, 2)
  const askTime = rng.chance(0.5)
  const timeRow: (number | LStr | null)[] = [key('m4.ops.t.time'), ...ts]
  const distRow: (number | LStr | null)[] = [key('m4.ops.t.dist'), ...ts.map((t) => t * v)]
  const value = askTime ? ts[ask]! : ts[ask]! * v
  if (askTime) timeRow[ask + 1] = null
  else distRow[ask + 1] = null
  return numQ(MULDIV, d, `ship-${v}-${t0}-${ts.join('-')}-${ask}${askTime ? 't' : 'd'}`, [text('m4.ops.st.ship', { t: t0, d: t0 * v }), { kind: 'stat-table', rows: [timeRow, distRow], head: 'col' }], value, rng, askTime ? [value + 1, value - 1, value * v] : [value + v, value - v, ts[ask]! + v], 'numpad')
}

/** 练习二 5：计算并验算——下面哪个算式可以用来验算 */
function mulVerifyQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(11, 99)
  const b = rng.int(11, 99)
  const p = a * b
  if (rng.chance(0.5)) {
    const e = `${a} × ${b} = ${p}`
    const right = rng.chance(0.5) ? `${p} ÷ ${b}` : `${p} ÷ ${a}`
    return pickQ(MULDIV, d, `verify-${flat(e)}-${flat(right)}`, [text('m4.ops.q.verify', { e })], right, rng.shuffle([`${p} × ${b}`, `${p} - ${a}`, `${a} + ${b}`]), rng, 2)
  }
  const e = `${p} ÷ ${a} = ${b}`
  const right = rng.chance(0.5) ? `${b} × ${a}` : `${p} ÷ ${b}`
  return pickQ(MULDIV, d, `verify-${flat(e)}-${flat(right)}`, [text('m4.ops.q.verify', { e })], right, rng.shuffle([`${p} × ${a}`, `${b} + ${a}`, `${p} - ${b}`]), rng, 2)
}

/** 练习二 9：已知 🍎 + 🍌 = 🍇（或 🍎 × 🍌 = 🍇），下面的算式对吗（课本用图形，这里用水果：图形符号朗读读不出来） */
function fruitQ(d: Difficulty, rng: RNG): Question {
  const mul = rng.chance(0.5)
  const [A, B, C] = ['🍎', '🍌', '🍇']
  const [op, inv] = mul ? ['×', '÷'] : ['+', '-']
  const known = `${A} ${op} ${B} = ${C}`
  const says: [string, boolean][] = [
    [`${C} ${inv} ${A} = ${B}`, true],
    [`${C} ${inv} ${B} = ${A}`, true],
    [`${B} ${op} ${A} = ${C}`, true],
    [`${B} ${op} ${C} = ${A}`, false],
    [`${A} ${inv} ${B} = ${C}`, false],
    [`${C} ${op} ${A} = ${B}`, false],
    [`${B} ${inv} ${C} = ${A}`, false],
  ]
  const [s, ok] = rng.pick(says)
  const [c, w] = judge(ok)
  return pickQ(MULDIV, d, `fruit-${flat(known)}-${flat(s)}`, [text('m4.ops.fr.q', { k: known }), expr(s)], c, w, rng)
}

/** 思考题「破译密码」：14 + 82 - ? = 87、? × 6 + 10 = 58（? 是一位数） */
function codeQ(d: Difficulty, rng: RNG): Question {
  const x = rng.int(1, 9)
  if (rng.chance(0.5)) {
    const a = rng.int(11, 60)
    const b = rng.int(11, 60)
    const e = `${a} + ${b} - ? = ${a + b - x}`
    return numQ(MULDIV, d, `code-${flat(e)}`, [text('m4.ops.code'), expr(e)], x, rng, [a + b + x, x + 1, x + 10])
  }
  const k = rng.int(3, 9)
  const m = rng.int(2, 20)
  const e = `? × ${k} + ${m} = ${x * k + m}`
  return numQ(MULDIV, d, `code-${flat(e)}`, [text('m4.ops.code'), expr(e)], x, rng, [x * k + m - m, x + 1, k])
}

defineGenerator(MULDIV, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.16) return flowersQ(d, rng)
    if (roll < 0.25) return defQ(MULDIV, d, rng, MUL_DEFS)
    if (roll < 0.3) return partNameQ(MULDIV, d, rng)
    if (roll < 0.38) return blankQ(MULDIV, d, rng, MUL_BLANKS)
    if (roll < 0.46) return mulRelNumQ(d, rng)
    if (roll < 0.58) return mulInverseQ(d, rng)
    if (roll < 0.76) return zeroQ(d, rng)
    if (roll < 0.86) return mulUnknownQ(d, rng)
    if (roll < 0.93) return mulStoryQ(d, rng)
    return remainderTableQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.16) return mulUnknownQ(d, rng)
    if (roll < 0.3) return remainderTableQ(d, rng)
    if (roll < 0.42) return divInverseQ(d, rng)
    if (roll < 0.56) return mulStoryQ(d, rng)
    if (roll < 0.68) return shipQ(d, rng)
    if (roll < 0.8) return mulVerifyQ(d, rng)
    if (roll < 0.92) return fruitQ(d, rng)
    return zeroQ(d, rng)
  }
  if (roll < 0.3) return codeQ(d, rng)
  if (roll < 0.55) return remainderTableQ(d, rng)
  if (roll < 0.8) return mulUnknownQ(d, rng)
  return fruitQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 括号（p9–12，例 4、做一做，练习三 1–3、6，思考题）
// 第 1 档：例 4 同一组数（96、12、4、2 这样）：不加括号、加小括号、再加中括号各算多少，第一步 / 第二步算什么、第一步算出几；
//          做一做的 360 ÷ (70 - 4 × 16)、168 ÷ [(28 + 44) ÷ 9]；四则运算这个名称、有小括号又有中括号时先算哪里。
// 第 2 档：练习三 1 的四种算式（38 + 56 ÷ 7 × 4、450 + 390 ÷ 130 - 123、209 + 102 ÷ (52 - 35)、940 × [128 - (154 - 31)]）；
//          练习三 2 的树状图（按顺序填框、选综合算式）；练习三 3 同一组数加不同的括号；把几步算式改写成综合算式（练习二 10*）。
// 第 3 档：思考题「3 3 3 3」——哪个算式的得数是几（不出「填运算符号」）；树状图只填最后一个框；练习三 1、3。
// ─────────────────────────────────────────────────────────────

/** 例 4：a ÷ b + c × d、a ÷ (b + c) × d、a ÷ [(b + c) × d]，都能整除 */
function ex4Nums(rng: RNG): { a: number; b: number; c: number; dd: number; m: number } {
  for (;;) {
    const b = rng.int(3, 15)
    const c = rng.int(2, 9)
    const dd = rng.int(2, 5)
    const m = rng.int(2, 9)
    const a = (b + c) * dd * m
    if (a % b !== 0 || a > 999 || a / b === c * dd) continue
    return { a, b, c, dd, m }
  }
}

function ex4Q(d: Difficulty, rng: RNG): Question {
  const { a, b, c, dd, m } = ex4Nums(rng)
  const s = b + c
  const e1 = `${a} ÷ ${b} + ${c} × ${dd}`
  const e2 = `${a} ÷ (${b} + ${c}) × ${dd}`
  const e3 = `${a} ÷ [(${b} + ${c}) × ${dd}]`
  const v1 = a / b + c * dd
  const v2 = (a / s) * dd
  const v3 = m
  const kind = rng.int(0, 5)
  if (kind <= 2) {
    // 算一算（三个里挑一个）；干扰项是另外两种加括号的结果
    const [e, v] = ([[e1, v1], [e2, v2], [e3, v3]] as [string, number][])[kind]!
    return numQ(BRACKETS, d, `ex4-${flat(e)}`, [expr(`${e} = ?`)], v, rng, [v1, v2, v3, v + 10])
  }
  if (kind === 3) {
    // 加小括号的那一个：第一步算什么
    return pickQ(BRACKETS, d, `ex4-first-${flat(e2)}`, [text('m4.ops.q.firstStep'), expr(e2)], `${b} + ${c}`, [`${a} ÷ ${b}`, `${c} × ${dd}`], rng)
  }
  if (kind === 4) {
    // 加中括号的那一个：第二步算什么
    return pickQ(BRACKETS, d, `ex4-second-${flat(e3)}`, [text('m4.ops.q.secondStep'), expr(e3)], `${s} × ${dd}`, [`${a} ÷ ${s}`, `${a} ÷ ${dd}`, `${b} + ${c}`], rng)
  }
  // 递等式的某一步：96 ÷ [(12 + 4) × 2] = 96 ÷ [? × 2]，或 = 96 ÷ ?
  if (rng.chance(0.5)) return numQ(BRACKETS, d, `ex4-step1-${flat(e3)}`, [text('m4.ops.q.stepFill'), expr(`${e3} = ${a} ÷ [? × ${dd}]`)], s, rng, [b * c, s + 1, s - 1], 'numpad')
  return numQ(BRACKETS, d, `ex4-step2-${flat(e3)}`, [text('m4.ops.q.stepFill'), expr(`${e3} = ${a} ÷ ?`)], s * dd, rng, [s + dd, s * dd + dd, a / b], 'numpad')
}

/** 做一做：a ÷ (b - c × d)（360 ÷ (70 - 4 × 16)）与 a ÷ [(b + c) ÷ d]（168 ÷ [(28 + 44) ÷ 9]） */
function dozQ(d: Difficulty, rng: RNG): Question {
  const first = rng.chance(0.3)
  if (rng.chance(0.5)) {
    for (;;) {
      const c = rng.int(2, 9)
      const dd = rng.int(11, 19)
      const inner = rng.int(2, 9)
      const b = c * dd + inner
      const m = rng.int(5, 90)
      const a = inner * m
      if (a > 999 || b > 200) continue
      const e = `${a} ÷ (${b} - ${c} × ${dd})`
      if (first) return pickQ(BRACKETS, d, `doz-first-${flat(e)}`, [text('m4.ops.q.firstStep'), expr(e)], `${c} × ${dd}`, [`${b} - ${c}`, `${a} ÷ ${b}`], rng)
      return numQ(BRACKETS, d, `doz-${flat(e)}`, [expr(`${e} = ?`)], m, rng, [inner, m + 10, m - 10, a - inner])
    }
  }
  for (;;) {
    const dd = rng.int(3, 9)
    const q = rng.int(2, 9)
    const s = dd * q
    const b = rng.int(Math.ceil(s / 4), s - Math.ceil(s / 4))
    const c = s - b
    const r = rng.int(5, 40)
    const a = q * r
    if (b < 2 || c < 2 || a > 999 || b === c) continue
    const e = `${a} ÷ [(${b} + ${c}) ÷ ${dd}]`
    if (first) return pickQ(BRACKETS, d, `doz-first-${flat(e)}`, [text('m4.ops.q.firstStep'), expr(e)], `${b} + ${c}`, [`${c} ÷ ${dd}`, `${a} ÷ ${b}`], rng)
    return numQ(BRACKETS, d, `doz-${flat(e)}`, [expr(`${e} = ?`)], r, rng, [q, r + 10, r - 10, a - q])
  }
}

/** 四则运算这个名称；运算顺序的规矩 */
const ORDER_ITEMS: DefItem[] = [
  { q: 'fourOps', a: 'fourOps', w: ['mixedOps', 'simpleOps'] },
  { q: 'bothBrackets', a: 'inSmall', w: ['inMiddle', 'outside'] },
  { q: 'noBrackets', a: 'mulDivFirst', w: ['addSubFirst'] },
  { q: 'sameLevel', a: 'leftToRight', w: ['rightToLeft', 'subFirst'] },
]
function orderTermQ(d: Difficulty, rng: RNG): Question {
  return defQ(BRACKETS, d, rng, ORDER_ITEMS)
}

/** 练习三 1 的四种算式 */
function ex31(rng: RNG): { e: string; v: number; first: string; wrong: string[]; smart: number[] } {
  const kind = rng.int(0, 3)
  if (kind === 0) {
    // 38 + 56 ÷ 7 × 4：a + b ÷ c × d
    const c = rng.int(2, 9)
    const q = rng.int(2, 12)
    const b = c * q
    const dd = rng.int(2, 9)
    const a = rng.int(10, 99)
    return { e: `${a} + ${b} ÷ ${c} × ${dd}`, v: a + q * dd, first: `${b} ÷ ${c}`, wrong: [`${a} + ${b}`, `${c} × ${dd}`], smart: [a + q + dd, (a + b) / c * dd, a + q * dd + 10] }
  }
  if (kind === 1) {
    // 450 + 390 ÷ 130 - 123：a + b ÷ c - d
    const c = rng.int(11, 150)
    const q = rng.int(2, 9)
    const b = c * q
    if (b > 999) return ex31(rng)
    const a = rng.int(100, 500)
    const dd = rng.int(10, a)
    return { e: `${a} + ${b} ÷ ${c} - ${dd}`, v: a + q - dd, first: `${b} ÷ ${c}`, wrong: [`${a} + ${b}`, `${c} - ${dd}`], smart: [a + b - dd, a + q + dd, a + q - dd + 10] }
  }
  if (kind === 2) {
    // 209 + 102 ÷ (52 - 35)：a + b ÷ (c - d)
    const s = rng.int(3, 20)
    const q = rng.int(2, 9)
    const b = s * q
    const dd = rng.int(11, 60)
    const c = dd + s
    const a = rng.int(100, 400)
    return { e: `${a} + ${b} ÷ (${c} - ${dd})`, v: a + q, first: `${c} - ${dd}`, wrong: [`${a} + ${b}`, `${b} ÷ ${c}`], smart: [a + b, a + q + 10, a + q - 1] }
  }
  // 940 × [128 - (154 - 31)]：a × [b - (c - d)]
  const f = rng.int(2, 9)
  const inner = rng.int(30, 150)
  const b = inner + f
  const dd = rng.int(11, 60)
  const c = inner + dd
  const a = rng.int(11, 99) * 10
  return { e: `${a} × [${b} - (${c} - ${dd})]`, v: a * f, first: `${c} - ${dd}`, wrong: [`${a} × ${b}`, `${b} - ${c}`], smart: [a * (f + 1), a * (f - 1), a * f + 10] }
}

function ex31Q(d: Difficulty, rng: RNG): Question {
  const x = ex31(rng)
  if (rng.chance(0.3)) return pickQ(BRACKETS, d, `ex31-first-${flat(x.e)}`, [text('m4.ops.q.firstStep'), expr(x.e)], x.first, x.wrong, rng)
  return numQ(BRACKETS, d, `ex31-${flat(x.e)}`, [expr(`${x.e} = ?`)], x.v, rng, x.smart.filter((s) => Number.isInteger(s)))
}

/** 练习三 3：同一组数加不同的括号（72、4、6、3 与 6000、75、60、10 这样） */
function sameNumsQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    for (;;) {
      const dv = rng.int(2, 3)
      const k = rng.int(2, 4)
      const c = dv * k
      const b = rng.int(2, 9)
      const a = rng.int(30, 99)
      if (a - b * k < 1) continue
      const list: [string, number][] = [
        [`${a} - ${b} × ${c} ÷ ${dv}`, a - b * k],
        [`(${a} - ${b}) × ${c} ÷ ${dv}`, (a - b) * k],
        [`(${a} - ${b}) × (${c} ÷ ${dv})`, (a - b) * k],
      ]
      const [e, v] = rng.pick(list)
      return numQ(BRACKETS, d, `same-${flat(e)}`, [expr(`${e} = ?`)], v, rng, [a - b * k, (a - b) * c, v + 10, v - 10])
    }
  }
  for (;;) {
    const p = rng.pick([10, 12, 15, 20, 25, 30])
    const z = rng.pick([5, 10, 15, 20])
    const q = p + z
    const x = rng.int(p + z + 2, 90)
    const y = x - p
    const lcm = [x, p, q].reduce((m, n) => (m * n) / gcd(m, n))
    if (lcm > 9999) continue
    const t = rng.int(1, Math.floor(9999 / lcm))
    const A = lcm * t
    const v1 = A / x - y - z
    if (v1 <= 0) continue
    const list: [string, number][] = [
      [`${A} ÷ ${x} - ${y} - ${z}`, v1],
      [`${A} ÷ (${x} - ${y}) - ${z}`, A / p - z],
      [`${A} ÷ [${x} - (${y} - ${z})]`, A / q],
    ]
    const [e, v] = rng.pick(list)
    return numQ(BRACKETS, d, `same-${flat(e)}`, [expr(`${e} = ?`)], v, rng, list.map((l) => l[1]).concat([v + 10]))
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** 树状图的两种形状（练习三 2）：w × [(x + y) ÷ z]、(w + x ÷ y) × z */
function treeShape(rng: RNG): { a: number; b: number; steps: { op: TreeStep['op']; n?: number; left?: boolean; v: number }[]; combined: string; wrongs: string[] } {
  if (rng.chance(0.5)) {
    const z = rng.int(5, 30)
    const r2 = rng.int(2, 20)
    const r1 = z * r2
    if (r1 < 30) return treeShape(rng)
    const lo = Math.max(10, Math.ceil(r1 / 4))
    const x = rng.int(lo, r1 - lo)
    const y = r1 - x
    const w = rng.int(10, 400)
    return {
      a: x,
      b: y,
      steps: [
        { op: '+', v: r1 },
        { op: '÷', n: z, v: r2 },
        { op: '×', n: w, left: true, v: w * r2 },
      ],
      combined: `${w} × [(${x} + ${y}) ÷ ${z}]`,
      // 干扰项里也有带中括号的（不然只有正确项带中括号，看格式就能选）
      wrongs: [`${w} × ${x} + ${y} ÷ ${z}`, `(${w} × ${x} + ${y}) ÷ ${z}`, `${w} + [(${x} + ${y}) ÷ ${z}]`],
    }
  }
  const y = rng.int(3, 80)
  const r1 = rng.int(2, 9)
  const x = y * r1
  const w = rng.int(100, 999)
  const z = rng.int(2, 40)
  if (x > 999) return treeShape(rng)
  return {
    a: x,
    b: y,
    steps: [
      { op: '÷', v: r1 },
      { op: '+', n: w, left: true, v: w + r1 },
      { op: '×', n: z, v: (w + r1) * z },
    ],
    combined: `(${w} + ${x} ÷ ${y}) × ${z}`,
    wrongs: [`${w} + ${x} ÷ ${y} × ${z}`, `(${w} + ${x}) ÷ ${y} × ${z}`, `${w} + ${x} ÷ (${y} × ${z})`],
  }
}

/** 练习三 2：按顺序计算并填写树状图的框（ask = 第几步的框，前面的框填好、后面的空着；last = 只填最后一个框，前面都空着），或选综合算式 */
function treeQ(d: Difficulty, rng: RNG, mode: 'box' | 'last' | 'merge'): Question {
  const sh = treeShape(rng)
  const ask = mode === 'last' ? sh.steps.length - 1 : rng.int(0, sh.steps.length - 1)
  const steps: TreeStep[] = sh.steps.map((s, i) => ({
    op: s.op,
    ...(s.n !== undefined ? { n: String(s.n) } : {}),
    ...(s.left ? { left: true } : {}),
    v: mode === 'merge' ? '' : i === ask ? '?' : i < ask && mode === 'box' ? String(s.v) : '',
  }))
  const tree: StemPart = { kind: 'calc-tree', a: String(sh.a), b: String(sh.b), steps }
  const sig = `tree-${sh.a}-${sh.b}-${sh.steps.map((s) => `${s.op}${s.n ?? ''}${s.left ? 'L' : ''}`).join('')}`
  if (mode === 'merge') return pickQ(BRACKETS, d, `${sig}-merge`, [text('m4.ops.q.treeMerge'), tree], sh.combined, rng.shuffle(sh.wrongs), rng, 2)
  const v = sh.steps[ask]!.v
  const prev = ask > 0 ? sh.steps[ask - 1]!.v : 0
  return numQ(BRACKETS, d, `${sig}-${mode}${ask}`, [text('m4.ops.q.treeFill'), tree], v, rng, [v + 10, v - 10, prev, v + 1], 'numpad')
}

/** 练习二 10*：把几步算式改写成一个综合算式 */
function mergeQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    // (a - b) × (c + e)
    const b = rng.int(5, 40)
    const r1 = rng.int(3, 30)
    const a = b + r1
    const c = rng.int(5, 30)
    const e = rng.int(2, 20)
    const r2 = c + e
    const s1 = `${a} - ${b} = ${r1}`
    const s2 = `${c} + ${e} = ${r2}`
    const s3 = `${r1} × ${r2} = ${r1 * r2}`
    return pickQ(BRACKETS, d, `merge-${flat(s1)}-${flat(s2)}`, [text('m4.ops.q.merge', { s1, s2, s3 })], `(${a} - ${b}) × (${c} + ${e})`, rng.shuffle([`${a} - ${b} × ${c} + ${e}`, `(${a} - ${b}) × ${c} + ${e}`, `${a} - ${b} × (${c} + ${e})`]), rng, 2)
  }
  // a × b - c ÷ e（这一种不用加括号）
  const a = rng.int(11, 40)
  const b = rng.int(3, 9)
  const e = rng.int(2, 9)
  const q = rng.int(2, 9)
  const c = e * q
  const s1 = `${a} × ${b} = ${a * b}`
  const s2 = `${c} ÷ ${e} = ${q}`
  const s3 = `${a * b} - ${q} = ${a * b - q}`
  return pickQ(BRACKETS, d, `merge-${flat(s1)}-${flat(s2)}`, [text('m4.ops.q.merge', { s1, s2, s3 })], `${a} × ${b} - ${c} ÷ ${e}`, rng.shuffle([`(${a} × ${b} - ${c}) ÷ ${e}`, `${a} × ${b} - ${c} × ${e}`, `${a} + ${b} - ${c} ÷ ${e}`]), rng, 2)
}

/** 四个同样的数（3 3 3 3）中间放三个运算符号、不加括号，按运算顺序算出的得数（中途出现分数的不要） */
function fourSame(k: number): { e: string; v: number }[] {
  const ops = ['+', '-', '×', '÷'] as const
  const out: { e: string; v: number }[] = []
  for (const o1 of ops) for (const o2 of ops) for (const o3 of ops) {
    const v = evalFlat([k, k, k, k], [o1, o2, o3])
    if (v === null) continue
    out.push({ e: `${k} ${o1} ${k} ${o2} ${k} ${o3} ${k}`, v })
  }
  return out
}

/** 不带括号的算式按「先乘除后加减、从左往右」算；乘除算出分数、得数是负数的返回 null */
function evalFlat(nums: number[], ops: readonly string[]): number | null {
  const terms: number[] = [nums[0]!]
  const signs: string[] = []
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i]!
    const n = nums[i + 1]!
    if (o === '×' || o === '÷') {
      const last = terms.pop()!
      const r = o === '×' ? last * n : last / n
      if (!Number.isInteger(r)) return null
      terms.push(r)
    } else {
      signs.push(o)
      terms.push(n)
    }
  }
  let v = terms[0]!
  for (let i = 0; i < signs.length; i++) {
    v = signs[i] === '+' ? v + terms[i + 1]! : v - terms[i + 1]!
    if (v < 0) return null
  }
  return v
}

/** 思考题：3 3 3 3 中间放运算符号——下面哪个算式的得数是 n（课本 1、2、3、7、8、9），不出「在 ○ 里填运算符号」 */
function fourThreesQ(d: Difficulty, rng: RNG): Question {
  const k = rng.chance(0.6) ? 3 : rng.pick([4, 5])
  const all = fourSame(k)
  const targets = [...new Set(all.map((x) => x.v))].filter((v) => v <= 30)
  const n = k === 3 && rng.chance(0.7) ? rng.pick([1, 2, 3, 7, 8, 9]) : rng.pick(targets)
  const right = rng.pick(all.filter((x) => x.v === n))
  const wrongs = rng.shuffle(all.filter((x) => x.v !== n)).map((x) => x.e)
  return pickQ(BRACKETS, d, `four-${k}-${n}-${flat(right.e)}`, [text('m4.ops.q.whichIs', { n })], right.e, wrongs, rng, 2)
}

defineGenerator(BRACKETS, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.5) return ex4Q(d, rng)
    if (roll < 0.85) return dozQ(d, rng)
    return orderTermQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.28) return ex31Q(d, rng)
    if (roll < 0.46) return treeQ(d, rng, 'box')
    if (roll < 0.56) return treeQ(d, rng, 'merge')
    if (roll < 0.76) return sameNumsQ(d, rng)
    if (roll < 0.9) return mergeQ(d, rng)
    return ex4Q(d, rng)
  }
  if (roll < 0.3) return fourThreesQ(d, rng)
  if (roll < 0.55) return treeQ(d, rng, 'last')
  if (roll < 0.8) return ex31Q(d, rng)
  return sameNumsQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 解决问题（p10–12，例 5 租船，练习三 4 租车、5 两种价格方案）
// 第 1 档：例 5 的每一步——大船、小船每个座位多少元，租哪种船每个座位更便宜，都坐大船能坐满几条、还剩几人，
//          某种租法一共多少元、有几个座位没人坐，怎样租船最省钱（先多租便宜的，再尽量不空座位）。
// 第 2 档：练习三 4 租车（一共多少人、大车每个座位多少元、怎样租最省钱、最少多少元）；练习三 5 两种价格方案（各要多少元、选哪种合算）。
// 第 3 档：租车最少多少元、选哪种方案合算、人多一些的租船。
// 每个座位的价钱都是整数（课本练习三 4 的 900 ÷ 40 是小数，这一单元还没学小数，不出）。
// ─────────────────────────────────────────────────────────────

interface Rent {
  n: number
  s: number
  ps: number
  b: number
  pb: number
}
interface Plan {
  x: number
  y: number
  cost: number
  seats: number
}

/** 所有能坐下的租法里花钱最少的（只多租一条也不行的不算：x 条大船、y 条小船，y 取最少够坐的） */
function plans(r: Rent): Plan[] {
  const out: Plan[] = []
  for (let x = 0; x <= Math.ceil(r.n / r.b); x++) {
    const y = Math.max(0, Math.ceil((r.n - x * r.b) / r.s))
    out.push({ x, y, cost: x * r.pb + y * r.ps, seats: x * r.b + y * r.s })
  }
  return out
}
function bestPlan(r: Rent): Plan | null {
  const all = plans(r)
  const min = Math.min(...all.map((p) => p.cost))
  const best = all.filter((p) => p.cost === min)
  return best.length === 1 ? best[0]! : null
}

/** 例 5 那样的租船：大船每个座位更便宜；先都坐大船会剩下几人（不是整条），最省钱的租法不空座位、和「先坐满大船」的不一样 */
function boats(rng: RNG, big: boolean): Rent {
  for (;;) {
    const s = rng.pick([4, 5])
    const b = rng.pick([6, 8])
    const us = rng.int(5, 12)
    const ub = rng.int(Math.max(3, us - 4), us - 1)
    const n = big ? rng.int(40, 80) : rng.int(20, 50)
    const r: Rent = { n, s, ps: s * us, b, pb: b * ub }
    const rest = n % b
    if (rest === 0 || rest >= s) continue
    const best = bestPlan(r)
    const naive = { x: Math.floor(n / b), y: 1 }
    if (!best || (best.x === naive.x && best.y === naive.y) || best.seats !== n) continue
    return r
  }
}

const planLabel = (kind: 'boat' | 'car', p: { x: number; y: number }): LStr =>
  p.y === 0 ? key(`m4.ops.${kind}.planBig`, { x: p.x }) : p.x === 0 ? key(`m4.ops.${kind}.planSmall`, { y: p.y }) : key(`m4.ops.${kind}.plan`, { x: p.x, y: p.y })

/** 「怎样租最省钱」：最省钱的租法 + 先坐满大的、全租小的、全租大的里面贵的 */
function bestRentQ(kpId: string, d: Difficulty, rng: RNG, kind: 'boat' | 'car', r: Rent, info: StemPart): Question {
  const best = bestPlan(r)!
  const cands = [
    { x: Math.floor(r.n / r.b), y: Math.ceil((r.n % r.b) / r.s) },
    { x: 0, y: Math.ceil(r.n / r.s) },
    { x: Math.ceil(r.n / r.b), y: 0 },
    { x: best.x + 1, y: Math.max(0, Math.ceil((r.n - (best.x + 1) * r.b) / r.s)) },
  ].filter((p) => !(p.x === best.x && p.y === best.y) && p.x * r.pb + p.y * r.ps > best.cost)
  return pickQ(kpId, d, `${kind}-best-${r.n}-${r.s}-${r.ps}-${r.b}-${r.pb}`, [info, text(`m4.ops.${kind}.best`)], planLabel(kind, best), rng.shuffle(cands).map((p) => planLabel(kind, p)), rng, 2)
}

function boatQ(d: Difficulty, rng: RNG): Question {
  const r = boats(rng, d === 3)
  const info = text('m4.ops.boat.info', { n: r.n, s: r.s, ps: r.ps, b: r.b, pb: r.pb })
  const sig = `boat-${r.n}-${r.s}-${r.ps}-${r.b}-${r.pb}`
  const ub = r.pb / r.b
  const us = r.ps / r.s
  const full = Math.floor(r.n / r.b)
  const rest = r.n - full * r.b
  const best = bestPlan(r)!
  const naive = { x: full, y: 1 }
  const ask = d === 3 ? 'best' : rng.pick(['seatBig', 'seatSmall', 'cheaper', 'full', 'rest', 'cost', 'empty', 'best', 'best'] as const)
  switch (ask) {
    case 'seatBig':
      return numQ(SOLVE, d, `${sig}-seatbig`, [info, text('m4.ops.boat.seatBig')], ub, rng, [r.pb - r.b, us, ub + 1])
    case 'seatSmall':
      return numQ(SOLVE, d, `${sig}-seatsmall`, [info, text('m4.ops.boat.seatSmall')], us, rng, [r.ps - r.s, ub, us + 1])
    case 'cheaper': {
      // 只问哪种便宜的时候，也出小船每个座位便宜的（不然孩子不比也知道选大船）
      if (rng.chance(0.35)) {
        const ub2 = rng.int(6, 12)
        const us2 = rng.int(4, ub2 - 1)
        const r2: Rent = { ...r, ps: r.s * us2, pb: r.b * ub2 }
        const info2 = text('m4.ops.boat.info', { n: r2.n, s: r2.s, ps: r2.ps, b: r2.b, pb: r2.pb })
        return pickQ(SOLVE, d, `boat-${r2.n}-${r2.s}-${r2.ps}-${r2.b}-${r2.pb}-cheaper`, [info2, text('m4.ops.boat.cheaper')], key('m4.ops.boat.small'), [key('m4.ops.boat.big')], rng)
      }
      return pickQ(SOLVE, d, `${sig}-cheaper`, [info, text('m4.ops.boat.cheaper')], key('m4.ops.boat.big'), [key('m4.ops.boat.small')], rng)
    }
    case 'full':
      return numQ(SOLVE, d, `${sig}-full`, [info, text('m4.ops.boat.full')], full, rng, [full + 1, rest, Math.ceil(r.n / r.s)])
    case 'rest':
      return numQ(SOLVE, d, `${sig}-rest`, [info, text('m4.ops.boat.rest', { x: full })], rest, rng, [r.b - rest, rest + 1, full])
    case 'cost': {
      const p = rng.chance(0.5) ? naive : best
      const v = p.x * r.pb + p.y * r.ps
      return numQ(SOLVE, d, `${sig}-cost-${p.x}-${p.y}`, [info, text('m4.ops.boat.cost', { x: p.x, y: p.y })], v, rng, [p.x * r.ps + p.y * r.pb, p.x * r.pb + p.y * r.pb, v + 10])
    }
    case 'empty': {
      const v = naive.x * r.b + naive.y * r.s - r.n
      return numQ(SOLVE, d, `${sig}-empty`, [info, text('m4.ops.boat.empty', { x: naive.x, y: naive.y })], v, rng, [rest, r.s - v === v ? v + 1 : r.s - v, v + 1])
    }
    default:
      return bestRentQ(SOLVE, d, rng, 'boat', r, info)
  }
}

/** 练习三 4 那样的租车：老师 t 人、学生 k 人；每个座位大车便宜，都是整数元 */
function cars(rng: RNG): { t: number; k: number; r: Rent } {
  for (;;) {
    const b = rng.pick([40, 45, 50])
    const s = rng.pick([20, 25])
    const ub = rng.int(15, 22)
    const us = rng.int(ub + 2, ub + 6)
    const x = rng.int(4, 9)
    const n = b * x + s
    const t = rng.int(12, 30)
    const r: Rent = { n, s, ps: s * us, b, pb: b * ub }
    if (n - t < 100 || !bestPlan(r)) continue
    return { t, k: n - t, r }
  }
}

function carQ(d: Difficulty, rng: RNG): Question {
  const { t, k, r } = cars(rng)
  const info = text('m4.ops.car.info', { t, k, b: r.b, pb: r.pb, s: r.s, ps: r.ps })
  const sig = `car-${t}-${k}-${r.b}-${r.pb}-${r.s}-${r.ps}`
  const best = bestPlan(r)!
  const ask = d === 3 ? 'min' : rng.pick(['total', 'seat', 'best', 'best', 'min'] as const)
  if (ask === 'total') return numQ(SOLVE, d, `${sig}-total`, [info, text('m4.ops.car.total')], r.n, rng, [k - t, r.n + 10, r.n - 10])
  if (ask === 'seat') return numQ(SOLVE, d, `${sig}-seat`, [info, text('m4.ops.car.seatBig')], r.pb / r.b, rng, [r.ps / r.s, r.pb - r.b, r.pb / r.b + 1])
  if (ask === 'min') {
    const naiveUp = Math.ceil(r.n / r.b) * r.pb
    return numQ(SOLVE, d, `${sig}-min`, [info, text('m4.ops.car.min')], best.cost, rng, [naiveUp, Math.ceil(r.n / r.s) * r.ps, best.cost + r.ps])
  }
  return bestRentQ(SOLVE, d, rng, 'car', r, info)
}

/** 练习三 5：两种价格方案——成人、儿童一共 10 人（正好够团体），选哪种合算，或某种方案要多少元 */
function planQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const a = rng.int(12, 18) * 10
    const c = rng.int(4, 8) * 10
    const g = rng.int(8, 12) * 10
    const x = rng.int(2, 8)
    const y = 10 - x
    const one = a * x + c * y
    const two = g * 10
    if (one === two) continue
    const info = text('m4.ops.plan.info', { a, c, g })
    const sig = `plan-${a}-${c}-${g}-${x}`
    const ask = d === 3 ? 'which' : rng.pick(['which', 'which', 'one', 'two'] as const)
    if (ask === 'one') return numQ(SOLVE, d, `${sig}-one`, [info, text('m4.ops.plan.costOne', { x, y })], one, rng, [two, a * y + c * x, (a + c) * 10])
    if (ask === 'two') return numQ(SOLVE, d, `${sig}-two`, [info, text('m4.ops.plan.costTwo', { x, y })], two, rng, [one, g * x, g * 10 + g])
    const [right, wrong] = one < two ? ['one', 'two'] : ['two', 'one']
    return pickQ(SOLVE, d, `${sig}-which`, [info, text('m4.ops.plan.which', { x, y })], key(`m4.ops.plan.${right}`), [key(`m4.ops.plan.${wrong}`)], rng)
  }
}

defineGenerator(SOLVE, (d, rng) => {
  const roll = rng.next()
  if (d === 1) return boatQ(d, rng)
  if (d === 2) {
    if (roll < 0.45) return carQ(d, rng)
    if (roll < 0.85) return planQ(d, rng)
    return boatQ(d, rng)
  }
  if (roll < 0.35) return carQ(d, rng)
  if (roll < 0.7) return planQ(d, rng)
  return boatQ(d, rng)
})
