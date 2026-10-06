import type { Difficulty, GeoFig, InputMode, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 运算律（四下第三单元，课本 p17–31，平台当前的旧版结构）：加法运算律（例 1 交换律、例 2 结合律、例 3 连加凑整、例 4 连减）、
// 乘法运算律（例 5 交换律、例 6 结合律、例 7 分配律、例 8 拆数与连除）。课本用框框出、起了名字的只有五条：加法交换律、
// 加法结合律、乘法交换律、乘法结合律、乘法分配律；连减、连除课本没有起名，题目里不写「减法的性质」「除法的性质」。
// 字母照课本小写（a + b = b + a），乘号「×」不省略；减号 ASCII「-」，小括号「( )」（读「括号」）。
// 「怎样简便就怎样计算」只判得数；方法另出「先算哪两个数」「□ 里填几」（算式里的「?」）这类题；递等式只问某一步的结果。
// 题目文字里不写圆括号、不写「长」（游泳池写「长度」），「间 / 副 / 册 / 篇」前面的数不出 2，「只」前面不放数。
// ─────────────────────────────────────────────────────────────

export const ADD_LAWS = 'm4s2-03-add-laws'
export const ADD_APPLY = 'm4s2-03-add-apply'
export const MUL_LAWS = 'm4s2-03-mul-laws'
export const DISTRIB = 'm4s2-03-distrib'
export const MUL_APPLY = 'm4s2-03-mul-apply'

type Params = Record<string, LStr | number>
const text = (k: string, p?: Params): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const expr = (e: string): StemPart => ({ kind: 'expr', expr: e })
const key = (k: string, p?: Params): LStr => (p ? { k, p } : { k })
const flat = (e: string): string => e.replace(/\s+/g, '')

/** 数值题：键盘或选项（input 不填就随机） */
function numQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[], input?: InputMode): Question {
  return numberQuestion({
    kpId,
    type: 'law',
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
  return labelQuestion({ kpId, type: 'law', difficulty: d, sig, stem, correct, distractors: ds, rng })
}

const RIGHT: LStr = { k: 'm4.law.right' }
const WRONG: LStr = { k: 'm4.law.wrong' }
const judge = (ok: boolean): [LStr, LStr[]] => (ok ? [RIGHT, [WRONG]] : [WRONG, [RIGHT]])
const law = (w: string): LStr => ({ k: `m4.law.w.${w}` })

/** 按「先乘除后加减、有括号先算括号里的」算一个算式（只有 + - × ÷ ( ) 和整数），给选项去掉和正确项同值的用 */
export function evalExpr(e: string): number {
  const src = e.replace(/×/g, '*').replace(/÷/g, '/').replace(/\[/g, '(').replace(/\]/g, ')')
  let i = 0
  const peek = (): string => src[i] ?? ''
  const skip = (): void => {
    while (peek() === ' ') i++
  }
  const num = (): number => {
    skip()
    if (peek() === '(') {
      i++
      const v = sum()
      skip()
      i++ // ')'
      return v
    }
    let s = ''
    while (/\d/.test(peek())) s += src[i++]
    return Number(s)
  }
  const prod = (): number => {
    let v = num()
    for (;;) {
      skip()
      const o = peek()
      if (o !== '*' && o !== '/') return v
      i++
      const r = num()
      v = o === '*' ? v * r : v / r
    }
  }
  const sum = (): number => {
    let v = prod()
    for (;;) {
      skip()
      const o = peek()
      if (o !== '+' && o !== '-') return v
      i++
      const r = prod()
      v = o === '+' ? v + r : v - r
    }
  }
  return sum()
}

/** 比一比：左右两边按运算律相等，或者改了一个数（> / <）；朗读「○」读「和」，题目写「比一比，填 >、< 或 =」 */
function cmpQ(kpId: string, d: Difficulty, rng: RNG, left: string, right: string, changed: string | null): Question {
  const r = changed ?? right
  const [a, b] = [evalExpr(left), evalExpr(r)]
  const rel = a > b ? '>' : a < b ? '<' : '='
  return pickQ(kpId, d, `cmp-${flat(left)}-${flat(r)}`, [text('m4.law.cmp'), expr(`${left} ○ ${r}`)], rel, ['>', '<', '='].filter((s) => s !== rel), rng)
}

/** 把右边的算式里某一个数改大或改小一点（不等的「比一比」） */
function nudge(e: string, rng: RNG): string {
  const nums = [...e.matchAll(/\d+/g)]
  const m = rng.pick(nums)
  const v = Number(m[0])
  const dv = rng.pick([1, 2, 10])
  const nv = rng.chance(0.5) || v - dv < 2 ? v + dv : v - dv
  return e.slice(0, m.index) + String(nv) + e.slice(m.index! + m[0].length)
}

/** 「下面的算式运用了什么运算律」：correct 是 law 键（addComm …） */
function whichLawQ(kpId: string, d: Difficulty, rng: RNG, e: string, correct: string, pool: string[]): Question {
  return pickQ(kpId, d, `which-${flat(e)}`, [text('m4.law.q.whichLaw'), expr(e)], law(correct), pool.filter((p) => p !== correct).map(law), rng)
}

/** 末尾有几个 0（凑整的程度） */
function zeros(v: number): number {
  let z = 0
  for (let x = Math.abs(v); x > 0 && Number.isInteger(x) && x % 10 === 0; x /= 10) z++
  return z
}

/** 「先算哪两个数最简便」：correct 是那一步（「14 + 186」），wrongs 是别的组合——
 *  碰巧也凑整（末尾的 0 一样多）的组合不放进选项（不然有两个对的）；一个都不剩就改成算得数 */
function firstQ(kpId: string, d: Difficulty, rng: RNG, e: string, correct: string, wrongs: string[], kq = 'm4.law.q.firstPair'): Question {
  const z = zeros(evalExpr(correct))
  const ok = wrongs.filter((w) => zeros(evalExpr(w)) < z)
  if (!ok.length) return easyQ(kpId, d, rng, e, [evalExpr(e) + 10, evalExpr(e) + 100])
  return pickQ(kpId, d, `first-${flat(e)}`, [text(kq, { e })], correct, ok, rng, 2)
}

/** 「怎样简便就怎样计算」：只判得数 */
function easyQ(kpId: string, d: Difficulty, rng: RNG, e: string, smart: number[]): Question {
  const v = evalExpr(e)
  return numQ(kpId, d, `easy-${flat(e)}`, [text('m4.law.easy'), expr(`${e} = ?`)], v, rng, smart)
}

/** 算式里的「?」：按运算律填数（只判那个数） */
function fillQ(kpId: string, d: Difficulty, rng: RNG, kq: string, e: string, value: number, smart: number[]): Question {
  return numQ(kpId, d, `fill-${flat(e)}`, [text(kq), expr(e)], value, rng, smart, 'numpad')
}

/** 加起来是整十、整百的两个数：a + b = h */
function pairTo(rng: RNG, h: number, lo: number): [number, number] {
  const a = rng.int(lo, h - lo)
  return [a, h - a]
}

// ─────────────────────────────────────────────────────────────
// 加法交换律和结合律（p17–19，例 1、例 2、做一做，练习五）
// 第 1 档：例 1 的 40 + 56 ○ 56 + 40、例 2 的 (88 + 104) + 96 ○ 88 + (104 + 96)（多数相等，少数改了一个数）；两条运算律的名字；
//          用字母表示（a + b = b + a、(a + b) + c = a + (b + c)）、文字表示（甲数 + 乙数 = 乙数 + 甲数）；做一做的填数
//          （300 + 600 = 600 + ?、(25 + 68) + 32 = 25 + (68 + ?)）；练习五 1 用了什么运算律；例 2 三天一共骑了多少千米。
// 第 2 档：练习五 2 用交换律验算；练习五 3 加法表；练习五 4 电器销售统计表的合计；练习五 5 哪两个数的和是 100；两条都用了的。
// 第 3 档：两条都用了、不等的比一比、表格。
// ─────────────────────────────────────────────────────────────

function addCmpQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(20, 300)
  const b = rng.int(20, 300)
  const c = rng.int(20, 300)
  const assoc = rng.chance(0.5)
  const [l, r] = assoc ? [`(${a} + ${b}) + ${c}`, `${a} + (${b} + ${c})`] : [`${a} + ${b}`, `${b} + ${a}`]
  const unequal = rng.chance(d === 1 ? 0.25 : 0.5)
  return cmpQ(ADD_LAWS, d, rng, l, r, unequal ? nudge(r, rng) : null)
}

const LAW_DEFS: Record<string, { q: string; a: string; w: string[] }[]> = {
  add: [
    { q: 'addComm', a: 'addComm', w: ['addAssoc'] },
    { q: 'addAssoc', a: 'addAssoc', w: ['addComm'] },
  ],
  mul: [
    { q: 'mulComm', a: 'mulComm', w: ['mulAssoc', 'addComm'] },
    { q: 'mulAssoc', a: 'mulAssoc', w: ['mulComm', 'addAssoc'] },
  ],
  dist: [{ q: 'distrib', a: 'distrib', w: ['mulAssoc', 'mulComm'] }],
}
function lawDefQ(kpId: string, d: Difficulty, rng: RNG, set: 'add' | 'mul' | 'dist'): Question {
  const it = rng.pick(LAW_DEFS[set]!)
  return pickQ(kpId, d, `def-${it.q}`, [text(`m4.law.q.def.${it.q}`)], law(it.a), it.w.map(law), rng)
}

/** 用字母表示运算律：选出那个式子，或者算式里的「?」是哪个字母；文字表示（甲数、乙数） */
const LETTER_FORMS: Record<string, { right: string; wrong: string[]; fill: [string, string][] }> = {
  addComm: { right: 'a + b = b + a', wrong: ['(a + b) + c = a + (b + c)', 'a - b = b - a'], fill: [['a + b = b + ?', 'a'], ['a + ? = b + a', 'b']] },
  addAssoc: { right: '(a + b) + c = a + (b + c)', wrong: ['a + b = b + a', '(a - b) - c = a - (b - c)'], fill: [['(a + b) + c = a + (? + c)', 'b'], ['(a + b) + c = ? + (b + c)', 'a']] },
  mulComm: { right: 'a × b = b × a', wrong: ['a + b = b + a', '(a × b) × c = a × (b × c)'], fill: [['a × b = b × ?', 'a'], ['a × ? = b × a', 'b']] },
  mulAssoc: { right: '(a × b) × c = a × (b × c)', wrong: ['a × b = b × a', '(a + b) + c = a + (b + c)'], fill: [['(a × b) × c = a × (? × c)', 'b'], ['(a × b) × c = a × (b × ?)', 'c']] },
  distrib: { right: '(a + b) × c = a × c + b × c', wrong: ['(a + b) × c = a × c + b', '(a + b) × c = a + b × c'], fill: [['(a + b) × c = a × c + ? × c', 'b'], ['a × (b + c) = a × b + a × ?', 'c']] },
}
function letterQ(kpId: string, d: Difficulty, rng: RNG, names: string[]): Question {
  const name = rng.pick(names)
  const f = LETTER_FORMS[name]!
  if (rng.chance(0.5)) return pickQ(kpId, d, `letter-${name}`, [text('m4.law.q.letter', { law: law(name) })], f.right, f.wrong, rng)
  const [e, ans] = rng.pick(f.fill)
  return pickQ(kpId, d, `letterfill-${flat(e)}`, [text('m4.law.q.whichLetter', { law: law(name) }), expr(e)], ans, ['a', 'b', 'c'].filter((x) => x !== ans), rng, 2)
}

/** 分配律的字母式：(a + b) × c、a × (b + c) 等于哪一个 */
function distLetterQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return letterQ(DISTRIB, d, rng, ['distrib'])
  if (rng.chance(0.5)) return pickQ(DISTRIB, d, 'letter-eq-1', [text('m4.law.q.equalTo'), expr('(a + b) × c')], 'a × c + b × c', ['a × c + b', 'a + b × c'], rng)
  return pickQ(DISTRIB, d, 'letter-eq-2', [text('m4.law.q.equalTo'), expr('a × (b + c)')], 'a × b + a × c', ['a × b + c', 'a × b × c'], rng)
}

/** 文字表示：甲数 + 乙数 = 乙数 + ___ */
function wordFormQ(d: Difficulty, rng: RNG): Question {
  return pickQ(ADD_LAWS, d, 'words-comm', [text('m4.law.q.wordFill'), text('m4.law.words.comm')], key('m4.law.word.jia'), [key('m4.law.word.yi')], rng)
}

/** 做一做：根据加法交换律 / 结合律填数 */
function addFillQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(11, 400)
  const b = rng.int(11, 400)
  const c = rng.int(11, 400)
  if (rng.chance(0.5)) {
    const forms: [string, number][] = [
      [`${a} + ${b} = ${b} + ?`, a],
      [`? + ${b} = ${b} + ${a}`, a],
      [`${a} + ? = ${c} + ${a}`, c],
    ]
    const [e, v] = rng.pick(forms)
    return fillQ(ADD_LAWS, d, rng, 'm4.law.fillComm', e, v, [a + b, v + 1, v + 10])
  }
  const forms: [string, number][] = [
    [`(${a} + ${b}) + ${c} = ${a} + (${b} + ?)`, c],
    [`${a} + (${b} + ${c}) = (${a} + ?) + ${c}`, b],
    [`(${a} + ?) + ${c} = ${a} + (${b} + ${c})`, b],
  ]
  const [e, v] = rng.pick(forms)
  return fillQ(ADD_LAWS, d, rng, 'm4.law.fillAssoc', e, v, [a + b, b + c, v + 10])
}

/** 练习五 1：下面的算式运用了什么运算律（76 + 18 = 18 + 76、56 + 72 + 28 = 56 + (72 + 28)、31 + 67 + 19 = 31 + 19 + 67、24 + 42 + 76 + 58 = (24 + 76) + (42 + 58)） */
function addWhichQ(d: Difficulty, rng: RNG): Question {
  const [a, b, c] = rng.shuffle(Array.from({ length: 89 }, (_, i) => i + 11)).slice(0, 3) as [number, number, number]
  const pool = ['addComm', 'addAssoc', 'addBoth']
  const kind = d === 1 ? rng.int(0, 2) : rng.int(0, 3)
  if (kind === 0) return whichLawQ(ADD_LAWS, d, rng, `${a} + ${b} = ${b} + ${a}`, 'addComm', pool)
  if (kind === 1) return whichLawQ(ADD_LAWS, d, rng, `${a} + ${b} + ${c} = ${a} + (${b} + ${c})`, 'addAssoc', pool)
  if (kind === 2) return whichLawQ(ADD_LAWS, d, rng, `${a} + ${b} + ${c} = ${a} + ${c} + ${b}`, 'addComm', pool)
  const [x, z] = pairTo(rng, 100, 11)
  let [y, w] = pairTo(rng, 100, 11)
  if (y === x || y === z) [y, w] = [w + 1, y - 1]
  return whichLawQ(ADD_LAWS, d, rng, `${x} + ${y} + ${z} + ${w} = (${x} + ${z}) + (${y} + ${w})`, 'addBoth', pool)
}

/** 例 1、例 2：李叔叔骑车（一天两段、三天一共多少千米，后两天凑成整百） */
function rideQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) {
    const [a, b] = [rng.int(25, 70), rng.int(25, 70)]
    return numQ(ADD_LAWS, d, `ride2-${a}-${b}`, [text('m4.law.ride2', { a, b })], a + b, rng, [Math.abs(a - b), a + b + 10, a + b - 10])
  }
  const a = rng.int(60, 99)
  const [b, c] = pairTo(rng, rng.pick([200, 300]), 90)
  return numQ(ADD_LAWS, d, `ride3-${a}-${b}-${c}`, [text('m4.law.ride3', { a, b, c })], a + b + c, rng, [a + b, b + c, a + b + c + 10, a + b + c - 100])
}

/** 练习五 2：计算再用加法交换律验算——验算时算哪个算式 */
function addVerifyQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(38, 450)
  let b = rng.int(89, 480)
  if (b === a) b += 3
  const e = `${a} + ${b}`
  return pickQ(ADD_LAWS, d, `verify-${a}-${b}`, [text('m4.law.q.verify', { e })], `${b} + ${a}`, [`${a} + ${b}`, a > b ? `${a} - ${b}` : `${b} - ${a}`], rng)
}

/** 练习五 3：加法表（左上角「+」，表头和左列是同样几个数），缺一格 */
function addTableQ(d: Difficulty, rng: RNG): Question {
  const xs = rng.shuffle([rng.int(21, 99), rng.int(100, 199), rng.int(200, 399)])
  const n = xs.length
  const r = rng.int(0, n - 1)
  const c = rng.int(0, n - 1)
  const rows: (number | LStr | null)[][] = [['+', ...xs], ...xs.map((x, i) => [x, ...xs.map((y, j) => (i === r && j === c ? null : x + y))])]
  const v = xs[r]! + xs[c]!
  return numQ(ADD_LAWS, d, `table-${xs.join('-')}-${r}${c}`, [text('m4.law.table'), { kind: 'stat-table', rows, head: 'both' }], v, rng, [v + 10, v - 10, v + 100], 'numpad')
}

/** 练习五 4：某商场第一季度电器销售情况统计表（单位：台），求一行的合计——每行都藏着凑整 */
function salesQ(d: Difficulty, rng: RNG): Question {
  const items = ['tv', 'fridge', 'washer']
  const data = items.map(() => {
    const [a, b] = pairTo(rng, rng.int(6, 9) * 100, 150)
    const c = rng.int(250, 550)
    return rng.chance(0.5) ? [a, b, c] : [c, a, b]
  })
  const ask = rng.int(0, items.length - 1)
  const rows: (number | LStr | null)[][] = [
    [key('m4.law.t.item'), key('m4.law.t.m1'), key('m4.law.t.m2'), key('m4.law.t.m3'), key('m4.law.t.total')],
    ...data.map((row, i) => [key(`m4.law.t.${items[i]}`), ...row, i === ask ? null : row.reduce((s, x) => s + x, 0)]),
  ]
  const v = data[ask]!.reduce((s, x) => s + x, 0)
  return numQ(ADD_LAWS, d, `sales-${data.flat().join('-')}-${ask}`, [text('m4.law.sales'), { kind: 'stat-table', title: key('m4.law.salesTitle'), rows, head: 'both' }], v, rng, [v + 100, v - 100, v + 10], 'numpad')
}

/** 练习五 5：和 a 相加得 100 的数（常见错误：每一位都凑成 10，18 → 92） */
function pair100Q(d: Difficulty, rng: RNG): Question {
  const a = rng.int(4, 96)
  const v = 100 - a
  const digitErr = (10 - (a % 10)) % 10 + (10 - Math.floor(a / 10)) * 10
  return numQ(ADD_LAWS, d, `pair100-${a}`, [text('m4.law.q.pair100', { a })], v, rng, [digitErr, v + 10, v - 10], 'choice')
}

defineGenerator(ADD_LAWS, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.18) return addCmpQ(d, rng)
    if (roll < 0.28) return lawDefQ(ADD_LAWS, d, rng, 'add')
    if (roll < 0.42) return letterQ(ADD_LAWS, d, rng, ['addComm', 'addAssoc'])
    if (roll < 0.46) return wordFormQ(d, rng)
    if (roll < 0.66) return addFillQ(d, rng)
    if (roll < 0.84) return addWhichQ(d, rng)
    return rideQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.18) return addVerifyQ(d, rng)
    if (roll < 0.36) return addTableQ(d, rng)
    if (roll < 0.54) return salesQ(d, rng)
    if (roll < 0.7) return pair100Q(d, rng)
    if (roll < 0.86) return addWhichQ(d, rng)
    return addCmpQ(d, rng)
  }
  if (roll < 0.3) return addWhichQ(d, rng)
  if (roll < 0.55) return addCmpQ(d, rng)
  if (roll < 0.8) return salesQ(d, rng)
  return addTableQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 加法运算律的应用（p20–23，例 3、例 4、两个做一做，练习六）
// 第 1 档：例 3 后四天的骑行（线段图 A—E，115 + 132 + 118 + 85，先算哪两个数、递等式里填数、一共多少千米）；
//          做一做的连加凑整（425 + 14 + 186、75 + 168 + 25、245 + 180 + 20 + 155、67 + 25 + 33 + 75）与体育用品；
//          例 4 读书还剩多少页（234 - 66 - 34），和它得数相等的算式、a - b - c 等于哪个式子；做一做 1 的填数
//          （868 - 52 - 48 = 868 - (52 + ?)），做一做 2 的连减（528 - 53 - 47、545 - 167 - 145、487 - 187 - 139 - 61、169 - 25 - 25 - 50）。
// 第 2 档：练习六 1 的八道（含 672 - 36 + 64 这样的）；练习六的应用题（收到的钱、山的海拔、冰箱、电视机原价、批改作文、班级人数表）。
// 第 3 档：练习六 9*（1 + 2 + … + 100 这样的）、练习六 4 原木堆、五个数的连加。
// ─────────────────────────────────────────────────────────────

/** 例 3：后四天的骑行 a + b + c + d，a + d 凑成整百，b + c 凑成整十（课本 115 + 132 + 118 + 85） */
function ex3Nums(rng: RNG): [number, number, number, number] {
  const [a, dd] = pairTo(rng, rng.pick([200, 300]), 70)
  const [b, c] = pairTo(rng, rng.pick([200, 250, 300]), 95)
  return [a, b, c, dd]
}

function ex3Q(d: Difficulty, rng: RNG): Question {
  const [a, b, c, dd] = ex3Nums(rng)
  const e = `${a} + ${b} + ${c} + ${dd}`
  const kind = rng.int(0, 3)
  if (kind === 0) {
    const line: StemPart = {
      kind: 'part-line',
      parts: [a, b, c, dd].map((x) => ({ len: x, label: `${x} km` })),
      total: '?',
      names: ['A', 'B', 'C', 'D', 'E'],
    }
    // 四段路程只标在线段图上，题目不再把数念一遍
    return numQ(ADD_APPLY, d, `trip-${flat(e)}`, [text('m4.law.trip4'), line], a + b + c + dd, rng, [a + b + c, a + dd + 100, a + b + c + dd + 10])
  }
  if (kind === 1) return firstQ(ADD_APPLY, d, rng, e, `${a} + ${dd}`, [`${a} + ${b}`, `${c} + ${dd}`])
  if (kind === 2) return fillQ(ADD_APPLY, d, rng, 'm4.law.fillQ', `${e} = (${a} + ${dd}) + (${b} + ?)`, c, [dd, b, c + 10])
  return easyQ(ADD_APPLY, d, rng, e, [a + b + c, a + b + c + dd + 100, a + b + c + dd - 10])
}

/** 做一做 1：连加凑整（三个数里两个凑整、四个数两两凑整） */
function addRound(rng: RNG): { e: string; first: string; wrongs: string[] } {
  const kind = rng.int(0, 2)
  if (kind === 0) {
    // 425 + 14 + 186：后两个凑整
    const x = rng.int(105, 499)
    const [p, q] = pairTo(rng, rng.pick([100, 200]), 11)
    return { e: `${x} + ${p} + ${q}`, first: `${p} + ${q}`, wrongs: [`${x} + ${p}`, `${x} + ${q}`] }
  }
  if (kind === 1) {
    // 75 + 168 + 25：头尾凑整
    const [p, q] = pairTo(rng, 100, 15)
    const x = rng.int(105, 499)
    return { e: `${p} + ${x} + ${q}`, first: `${p} + ${q}`, wrongs: [`${p} + ${x}`, `${x} + ${q}`] }
  }
  // 245 + 180 + 20 + 155、67 + 25 + 33 + 75：两两凑整
  const [p, q] = rng.chance(0.5) ? pairTo(rng, rng.pick([300, 400]), 120) : pairTo(rng, 100, 15)
  const [r, s] = rng.chance(0.5) ? pairTo(rng, 200, 15) : pairTo(rng, 100, 15)
  return { e: `${p} + ${r} + ${s} + ${q}`, first: `${p} + ${q}`, wrongs: [`${p} + ${r}`, `${s} + ${q}`] }
}

function addRoundQ(d: Difficulty, rng: RNG): Question {
  const x = addRound(rng)
  if (rng.chance(0.35)) return firstQ(ADD_APPLY, d, rng, x.e, x.first, x.wrongs)
  const v = evalExpr(x.e)
  return easyQ(ADD_APPLY, d, rng, x.e, [v + 10, v - 10, v + 100])
}

/** 做一做 2：刘老师买体育用品（48、55、52、45 元这样两两凑成 100） */
function sportsQ(d: Difficulty, rng: RNG): Question {
  const [a, c] = pairTo(rng, 100, 35)
  const [b, dd] = pairTo(rng, 100, 35)
  const v = a + b + c + dd
  return numQ(ADD_APPLY, d, `sports-${a}-${b}-${c}-${dd}`, [text('m4.law.sports', { a, b, c, d: dd })], v, rng, [v - 10, v + 10, a + b + c])
}

/** 例 4：一本书 234 页，已经读了 66 页，今天又读了 34 页，还剩多少页（两个减数凑整） */
function bookNums(rng: RNG): [number, number, number] {
  const [a, b] = pairTo(rng, rng.pick([100, 100, 200]), 11)
  const t = rng.int(a + b + 20, a + b + 300)
  return [t, a, b]
}

function bookQ(d: Difficulty, rng: RNG): Question {
  const [t, a, b] = bookNums(rng)
  const kind = rng.int(0, 2)
  if (kind === 0) return numQ(ADD_APPLY, d, `book-${t}-${a}-${b}`, [text('m4.law.book', { t, a, b })], t - a - b, rng, [t - a + b, t - a, t - (a + b) + 10])
  const e = `${t} - ${a} - ${b}`
  if (kind === 1) {
    // 和 t - a - b 得数相等的：t - (a + b)（小兵）或 t - b - a（小东）
    const right = rng.chance(0.5) ? `${t} - (${a} + ${b})` : `${t} - ${b} - ${a}`
    const wrongs = [a > b ? `${t} - (${a} - ${b})` : `${t} - (${b} - ${a})`, `${t} - ${a} + ${b}`, `${t} + (${a} + ${b})`].filter((w) => evalExpr(w) !== t - a - b)
    return pickQ(ADD_APPLY, d, `same-${flat(e)}-${flat(right)}`, [text('m4.law.q.sameAs', { e })], right, wrongs, rng, 2)
  }
  return pickQ(ADD_APPLY, d, 'subletter', [text('m4.law.q.equalTo'), expr('a - b - c')], 'a - (b + c)', ['a - (b - c)', 'a + (b - c)'], rng)
}

/** 做一做 1：868 - 52 - 48 = 868 - (52 + ?)、1500 - 28 - 272 = ? - (28 + 272)、415 - 74 - 26 = 415 - 26 - ? */
function subFillQ(d: Difficulty, rng: RNG): Question {
  const [t, a, b] = bookNums(rng)
  const big = rng.chance(0.3)
  const T = big ? rng.int(10, 20) * 100 : t
  const forms: [string, number][] = [
    [`${T} - ${a} - ${b} = ${T} - (${a} + ?)`, b],
    [`${T} - ${a} - ${b} = ? - (${a} + ${b})`, T],
    [`${T} - ${a} - ${b} = ${T} - ${b} - ?`, a],
  ]
  const [e, v] = rng.pick(forms)
  return fillQ(ADD_APPLY, d, rng, 'm4.law.fillQ', e, v, [a + b, v + 10, Math.abs(a - b)])
}

/** 做一做 2：连减（528 - 53 - 47 两个减数凑整、545 - 167 - 145 被减数先减一个凑整、487 - 187 - 139 - 61、169 - 25 - 25 - 50） */
function subCalc(rng: RNG): { e: string; first?: [string, string[]] } {
  const kind = rng.int(0, 3)
  if (kind === 0) {
    const [a, b] = pairTo(rng, 100, 11)
    const t = rng.int(150, 900)
    return { e: `${t} - ${a} - ${b}`, first: [`${a} + ${b}`, [`${t} - ${a}`, `${t} - ${b}`]] }
  }
  if (kind === 1) {
    // 545 - 167 - 145：先减 145 得整百
    const h = rng.int(2, 6) * 100
    const b = rng.int(101, 199)
    const t = h + b
    const a = rng.int(101, h - 1)
    if (a === b) return subCalc(rng)
    return { e: `${t} - ${a} - ${b}`, first: [`${t} - ${b}`, [`${t} - ${a}`, a > b ? `${a} - ${b}` : `${b} - ${a}`]] }
  }
  if (kind === 2) {
    // 487 - 187 - 139 - 61
    const a = rng.int(101, 299)
    const t = a + rng.int(2, 6) * 100
    const [b, c] = pairTo(rng, rng.pick([100, 200]), 20)
    if (t - a - b - c <= 0) return subCalc(rng)
    return { e: `${t} - ${a} - ${b} - ${c}` }
  }
  // 169 - 25 - 25 - 50
  const a = rng.pick([25, 15, 35])
  const c = 100 - a - a
  const t = rng.int(110, 400)
  return { e: `${t} - ${a} - ${a} - ${c}` }
}

function subCalcQ(d: Difficulty, rng: RNG): Question {
  const x = subCalc(rng)
  if (x.first && rng.chance(0.35)) return firstQ(ADD_APPLY, d, rng, x.e, x.first[0], x.first[1], 'm4.law.q.firstStep')
  const v = evalExpr(x.e)
  return easyQ(ADD_APPLY, d, rng, x.e, [v + 10, v - 10, v + 100])
}

/** 练习六 1：60 + 255 + 40、282 + 41 + 159、548 + 52 + 468、800 - 138 - 162、672 - 36 - 64、672 - 36 + 64、13 + 46 + 55 + 54 + 87、5 + 137 + 45 + 63 + 50 */
function mixedCalc(rng: RNG): string {
  const kind = rng.int(0, 5)
  if (kind === 0) {
    const [a, c] = pairTo(rng, 100, 10)
    return `${a} + ${rng.int(120, 480)} + ${c}`
  }
  if (kind === 1) {
    const [b, c] = pairTo(rng, 200, 25)
    return `${rng.int(120, 480)} + ${b} + ${c}`
  }
  if (kind === 2) {
    const h = rng.pick([300, 600])
    const [a, b] = pairTo(rng, h, 40)
    const t = rng.int(h / 100 + 1, 9) * 100
    return `${t} - ${a} - ${b}`
  }
  if (kind === 3) {
    // 672 - 36 + 64：先加后减也行（672 + 64 - 36）
    const b = rng.int(21, 69)
    const t = rng.int(300, 800)
    const c = rng.int(b + 5, 99)
    return `${t} - ${b} + ${c}`
  }
  if (kind === 4) {
    const [a, b] = pairTo(rng, 100, 11)
    return `${rng.int(300, 800)} - ${a} - ${b}`
  }
  // 13 + 46 + 55 + 54 + 87：两两凑成 100，再加一个
  const [a, e] = pairTo(rng, 100, 11)
  const [b, dd] = pairTo(rng, 100, 11)
  return `${a} + ${b} + ${rng.int(11, 99)} + ${dd} + ${e}`
}

function mixedCalcQ(d: Difficulty, rng: RNG): Question {
  const e = mixedCalc(rng)
  const v = evalExpr(e)
  return easyQ(ADD_APPLY, d, rng, e, [v + 10, v - 10, v + 100])
}

/** 练习六的应用题：收到的钱、山的海拔、冰箱、电视机原价、批改作文 */
function addStoryQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 4)
  if (kind === 0) {
    const [a, c] = pairTo(rng, rng.pick([400, 500]), 120)
    const b = rng.int(120, 480)
    return numQ(ADD_APPLY, d, `money-${a}-${b}-${c}`, [text('m4.law.money', { a, b, c })], a + b + c, rng, [a + c, a + b + c + 100, a + b + c - 10])
  }
  if (kind === 1) {
    const h = rng.int(15, 30) * 100
    const [x, y] = pairTo(rng, rng.pick([500, 600, 700]), 150)
    return numQ(ADD_APPLY, d, `mountain-${h}-${x}-${y}`, [text('m4.law.mountain', { h, x, y })], h - x - y, rng, [h - x, h - x + y, h - x - y + 100])
  }
  if (kind === 2) {
    const [a, b] = pairTo(rng, rng.pick([200, 300]), 50)
    const t = a + b + rng.int(50, 250)
    return numQ(ADD_APPLY, d, `fridge-${t}-${a}-${b}`, [text('m4.law.fridge', { t, a, b })], t - a - b, rng, [t - a, t - a + b, t - a - b + 100])
  }
  if (kind === 3) {
    // 电视机：样品现价 p，先降价 a，样品又降价 b，原价 = p + b + a（p + b 凑整）
    const h = rng.int(18, 40) * 100
    const b = rng.int(110, 390)
    const p = h - b
    const a = rng.int(120, 480)
    return numQ(ADD_APPLY, d, `tv-${p}-${a}-${b}`, [text('m4.law.tv', { p, a, b })], p + a + b, rng, [p - a - b, p + a, p + a + b + 100])
  }
  // 批改作文：第二天比第一天多 k 篇
  const a = rng.int(12, 30)
  const k = rng.int(3, 12)
  const t = a + a + k + rng.int(5, 30)
  return numQ(ADD_APPLY, d, `essay-${t}-${a}-${k}`, [text('m4.law.essay', { t, a, k })], t - a - (a + k), rng, [t - a - k, t - a, t - a - a])
}

/** 练习六 5：班级人数统计表，一个年级的总人数或缺的一个班 */
function classTableQ(d: Difficulty, rng: RNG): Question {
  const grades = rng.shuffle(['g3', 'g4', 'g5', 'g6']).slice(0, 3)
  const data = grades.map(() => [rng.int(30, 45), rng.int(30, 45), rng.int(30, 45)])
  const ask = rng.int(0, 2)
  const askClass = rng.chance(0.4)
  const col = rng.int(0, 2)
  const rows: (number | LStr | null)[][] = [
    [key('m4.law.t.grade'), key('m4.law.t.c1'), key('m4.law.t.c2'), key('m4.law.t.c3'), key('m4.law.t.people')],
    ...data.map((r, i) => {
      const total = r.reduce((s, x) => s + x, 0)
      if (i !== ask) return [key(`m4.law.t.${grades[i]}`), ...r, total]
      return askClass ? [key(`m4.law.t.${grades[i]}`), ...r.map((x, j) => (j === col ? null : x)), total] : [key(`m4.law.t.${grades[i]}`), ...r, null]
    }),
  ]
  const v = askClass ? data[ask]![col]! : data[ask]!.reduce((s, x) => s + x, 0)
  return numQ(ADD_APPLY, d, `class-${data.flat().join('-')}-${ask}-${askClass ? col : 't'}`, [text('m4.law.classTable'), { kind: 'stat-table', title: key('m4.law.classTitle'), rows, head: 'both' }], v, rng, [v + 1, v - 1, v + 10], 'numpad')
}

/** 练习六 9*：1 + 2 + … + 100、2 + 4 + … + 20、5 + 10 + … + 100、20 - 19 + 18 - 17 + … + 2 - 1；练习六 4 原木堆 */
function seriesQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 4)
  if (kind === 0) {
    const n = rng.pick([10, 20, 50, 100])
    const v = (n * (n + 1)) / 2
    return numQ(ADD_APPLY, d, `sum-${n}`, [text('m4.law.fit'), expr(`1 + 2 + 3 + … + ${n - 2} + ${n - 1} + ${n} = ?`)], v, rng, [v + n, (n * n) / 2, v - n])
  }
  if (kind === 1) {
    const n = rng.pick([10, 15, 20])
    const v = n * (n + 1)
    return numQ(ADD_APPLY, d, `even-${n}`, [text('m4.law.fit'), expr(`2 + 4 + 6 + … + ${2 * n - 4} + ${2 * n - 2} + ${2 * n} = ?`)], v, rng, [v / 2, v + 2 * n, v - 2 * n])
  }
  if (kind === 2) {
    const n = rng.pick([10, 20])
    const v = (5 * n * (n + 1)) / 2
    return numQ(ADD_APPLY, d, `five-${n}`, [text('m4.law.fit'), expr(`5 + 10 + 15 + … + ${5 * n - 10} + ${5 * n - 5} + ${5 * n} = ?`)], v, rng, [v - 5 * n, v + 5 * n, v * 2])
  }
  if (kind === 3) {
    const n = rng.pick([10, 20, 30])
    return numQ(ADD_APPLY, d, `alt-${n}`, [text('m4.law.fit'), expr(`${2 * n} - ${2 * n - 1} + ${2 * n - 2} - ${2 * n - 3} + … + 4 - 3 + 2 - 1 = ?`)], n, rng, [n + 1, 2 * n, n - 1])
  }
  const n = rng.int(6, 12)
  const v = (n * (n + 1)) / 2
  return numQ(ADD_APPLY, d, `logs-${n}`, [text('m4.law.logs', { n })], v, rng, [n * n, v + n, v - n])
}

defineGenerator(ADD_APPLY, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.22) return ex3Q(d, rng)
    if (roll < 0.4) return addRoundQ(d, rng)
    if (roll < 0.48) return sportsQ(d, rng)
    if (roll < 0.64) return bookQ(d, rng)
    if (roll < 0.8) return subFillQ(d, rng)
    return subCalcQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.34) return mixedCalcQ(d, rng)
    if (roll < 0.7) return addStoryQ(d, rng)
    if (roll < 0.82) return classTableQ(d, rng)
    if (roll < 0.92) return subCalcQ(d, rng)
    return addRoundQ(d, rng)
  }
  if (roll < 0.4) return seriesQ(d, rng)
  if (roll < 0.7) return mixedCalcQ(d, rng)
  return addStoryQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 乘法交换律和结合律（p24–25，例 5、例 6、做一做，练习七 1–3、10，练习八 4）
// 第 1 档：植树活动（25 个小组，每组 4 人挖坑种树：一共多少人；每组种 5 棵树，每棵浇 2 桶水：一共多少桶水）；
//          4 × 25 ○ 25 × 4、(25 × 5) × 2 ○ 25 × (5 × 2)；两条运算律的名字、字母式；做一做的填数（12 × 32 = 32 × ?、
//          30 × 6 × 7 = 30 × (6 × ?)、125 × (8 × 40) = (125 × ?) × 40）；练习七 1 的口算（25 × 4、125 × 8……）。
// 第 2 档：练习七 2 的填数；练习七 3 游泳 7 个来回；练习七 10 教学楼的课桌椅；练习八 4 用了哪些运算律；连乘简便计算与先算哪两个数。
// 第 3 档：两条都用了的、连乘简便计算。
// ─────────────────────────────────────────────────────────────

/** 植树活动：g 个小组，每组 p 人挖坑种树、q 人抬水浇树，每组种 t 棵树，每棵浇 w 桶水（课本 25、4、2、5、2） */
function plantNums(rng: RNG): { g: number; p: number; q: number; t: number; w: number } {
  if (rng.chance(0.35)) return { g: 25, p: 4, q: 2, t: 5, w: 2 }
  const g = rng.pick([25, 25, 15, 35, 45, 125])
  const p = g === 125 ? 8 : g === 25 ? rng.pick([4, 8, 3]) : rng.pick([4, 6, 8])
  return { g, p, q: rng.int(1, 3), t: rng.int(3, 9), w: rng.pick([2, 3, 4]) }
}

/** 每道题只写这一问用得着的条件（问挖坑的人数就不写几棵树、几桶水，问桶数就不写人数），不把整幅植树图搬进题目 */
function plantQ(kpId: string, d: Difficulty, rng: RNG, ask: 'diggers' | 'water' | 'all'): Question {
  const n = plantNums(rng)
  if (ask === 'diggers') return numQ(kpId, d, `plant-dig-${n.g}-${n.p}`, [text('m4.law.plantDig', { g: n.g, p: n.p })], n.g * n.p, rng, [n.g + n.p, n.g * n.p + n.g, n.g * n.p + 10])
  if (ask === 'water') return numQ(kpId, d, `plant-water-${n.g}-${n.t}-${n.w}`, [text('m4.law.plantWater', { g: n.g, t: n.t, w: n.w })], n.g * n.t * n.w, rng, [n.g * n.t, n.g * n.w, n.t * n.w])
  return numQ(kpId, d, `plant-all-${n.g}-${n.p}-${n.q}`, [text('m4.law.plantAll', { g: n.g, p: n.p, q: n.q })], (n.p + n.q) * n.g, rng, [n.p * n.g + n.q, n.p + n.q * n.g, n.p * n.g])
}

function mulCmpQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(4, 125)
  const b = rng.int(2, 40)
  const c = rng.int(2, 9)
  const assoc = rng.chance(0.5)
  const [l, r] = assoc ? [`(${a} × ${b}) × ${c}`, `${a} × (${b} × ${c})`] : [`${a} × ${b}`, `${b} × ${a}`]
  const unequal = rng.chance(d === 1 ? 0.25 : 0.5)
  return cmpQ(MUL_LAWS, d, rng, l, r, unequal ? nudge(r, rng) : null)
}

/** 做一做：12 × 32 = 32 × ?、108 × 75 = 75 × ?、30 × 6 × 7 = 30 × (6 × ?)、125 × (8 × 40) = (125 × ?) × 40；
 *  练习七 2：25 × 7 × 4 = 25 × 4 × ?、(60 × 25) × ? = 60 × (25 × 8)、125 × (8 × ?) = (125 × 8) × 14、3 × 4 × 8 × 5 = (3 × 4) × (8 × ?) */
function mulFillQ(d: Difficulty, rng: RNG): Question {
  const easy = d === 1
  const a = rng.int(11, 120)
  const b = rng.int(11, 99)
  const c = rng.int(2, 9)
  const forms: [string, number][] = easy
    ? [
        [`${a} × ${b} = ${b} × ?`, a],
        [`${a} × ${c} × ${b} = ${a} × (${c} × ?)`, b],
        [`125 × (8 × ${b}) = (125 × ?) × ${b}`, 8],
        [`(${a} × ${c}) × ${b} = ${a} × (? × ${b})`, c],
      ]
    : [
        [`25 × ${b} × 4 = 25 × 4 × ?`, b],
        [`(${a} × 25) × ? = ${a} × (25 × 4)`, 4],
        [`125 × (8 × ?) = (125 × 8) × ${b}`, b],
        [`${c} × 4 × 8 × 5 = (${c} × 4) × (8 × ?)`, 5],
        [`${a} × ${b} = ${b} × ?`, a],
      ]
  const [e, v] = rng.pick(forms)
  return fillQ(MUL_LAWS, d, rng, 'm4.law.fillMul', e, v, [v + 1, v * 2, v + 10])
}

/** 练习七 1：口算（12 × 5、35 × 2、125 × 8、45 × 2、16 × 5、24 × 5、25 × 4、25 × 8） */
function oralQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 4)
  const [x, y] =
    kind === 0
      ? [rng.int(6, 48) * 2, 5]
      : kind === 1
        ? [rng.int(1, 9) * 10 + 5, 2]
        : kind === 2
          ? [25, rng.pick([4, 8, 12, 16, 40])]
          : kind === 3
            ? [125, rng.pick([8, 4, 16, 24])]
            : [rng.pick([5, 50]), rng.pick([2, 4, 6, 8]) * (rng.chance(0.5) ? 1 : 10)]
  const e = rng.chance(0.7) ? `${x} × ${y}` : `${y} × ${x}`
  return numQ(MUL_LAWS, d, `oral-${flat(e)}`, [text('m4.law.oral'), expr(`${e} = ?`)], x * y, rng, [x * y * 10, x * y + y, x + y])
}

/** 练习七 3：游泳池的长度是 50 米，游了 7 个来回 */
function poolQ(d: Difficulty, rng: RNG): Question {
  const l = rng.pick([25, 50])
  const n = rng.int(2, 9)
  return numQ(MUL_LAWS, d, `pool-${l}-${n}`, [text('m4.law.pool', { l, n })], l * 2 * n, rng, [l * n, l * 2 * n + l, l + n])
}

/** 练习七 10：教学楼 4 层，每层 7 间教室，每间 35 套课桌椅（层数和套数凑整） */
function buildingQ(d: Difficulty, rng: RNG): Question {
  const [f, k] = rng.pick([[4, 25], [4, 35], [4, 45], [8, 25], [5, 40], [4, 15]] as [number, number][])
  const r = rng.int(3, 9)
  return numQ(MUL_LAWS, d, `building-${f}-${r}-${k}`, [text('m4.law.building', { f, r, k })], f * r * k, rng, [f * r + k, f * k, r * k])
}

/** 练习八 4：106 × 25 = 25 × 106、5 × 17 × 4 = 5 × 4 × 17、13 × 3 × 2 = 13 × (3 × 2)、25 × 8 × 4 = 8 × (25 × 4) */
function mulWhichQ(d: Difficulty, rng: RNG): Question {
  const a = rng.pick(Array.from({ length: 110 }, (_, i) => i + 11).filter((x) => x !== 25))
  const [b, c] = rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 2) as [number, number]
  const pool = ['mulComm', 'mulAssoc', 'mulBoth']
  const kind = d === 1 ? rng.int(0, 2) : rng.int(0, 3)
  if (kind === 0) return whichLawQ(MUL_LAWS, d, rng, `${a} × 25 = 25 × ${a}`, 'mulComm', pool)
  if (kind === 1) return whichLawQ(MUL_LAWS, d, rng, `5 × ${a} × 4 = 5 × 4 × ${a}`, 'mulComm', pool)
  if (kind === 2) return whichLawQ(MUL_LAWS, d, rng, `${a} × ${b} × ${c} = ${a} × (${b} × ${c})`, 'mulAssoc', pool)
  return whichLawQ(MUL_LAWS, d, rng, `25 × ${a} × 4 = ${a} × (25 × 4)`, 'mulBoth', pool)
}

/** 连乘的简便计算：25 × 13 × 4、125 × 7 × 8、5 × 37 × 20 */
function mulChain(rng: RNG): { e: string; first: string; wrongs: string[] } {
  const [p, q] = rng.pick([[25, 4], [125, 8], [5, 20], [50, 2], [25, 8]] as [number, number][])
  const a = rng.int(3, 49)
  const kind = rng.int(0, 2)
  if (kind === 0) return { e: `${p} × ${a} × ${q}`, first: `${p} × ${q}`, wrongs: [`${p} × ${a}`] }
  if (kind === 1) return { e: `${a} × ${p} × ${q}`, first: `${p} × ${q}`, wrongs: [`${a} × ${p}`] }
  return { e: `${p} × ${a} × ${q}`, first: `${p} × ${q}`, wrongs: [`${a} × ${q}`] }
}

function mulSmartQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = mulChain(rng)
  if (rng.chance(0.4)) return firstQ(kpId, d, rng, x.e, x.first, x.wrongs)
  const v = evalExpr(x.e)
  return easyQ(kpId, d, rng, x.e, [v * 10, v / 10, v + 100])
}

defineGenerator(MUL_LAWS, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.1) return plantQ(MUL_LAWS, d, rng, 'diggers')
    if (roll < 0.2) return plantQ(MUL_LAWS, d, rng, 'water')
    if (roll < 0.34) return mulCmpQ(d, rng)
    if (roll < 0.44) return lawDefQ(MUL_LAWS, d, rng, 'mul')
    if (roll < 0.56) return letterQ(MUL_LAWS, d, rng, ['mulComm', 'mulAssoc'])
    if (roll < 0.72) return mulFillQ(d, rng)
    if (roll < 0.88) return oralQ(d, rng)
    return mulWhichQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.22) return mulFillQ(d, rng)
    if (roll < 0.36) return poolQ(d, rng)
    if (roll < 0.5) return buildingQ(d, rng)
    if (roll < 0.7) return mulWhichQ(d, rng)
    if (roll < 0.9) return mulSmartQ(MUL_LAWS, d, rng)
    return mulCmpQ(d, rng)
  }
  if (roll < 0.35) return mulWhichQ(d, rng)
  if (roll < 0.7) return mulSmartQ(MUL_LAWS, d, rng)
  return buildingQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 乘法分配律（p26–28，例 7、做一做，练习七 4–9、11*）
// 第 1 档：植树活动一共多少名同学（(4 + 2) × 25 与 4 × 25 + 2 × 25），(4 + 2) × 25 ○ 4 × 25 + 2 × 25；运算律的名字；
//          字母式 (a + b) × c = a × c + b × c、a × (b + c) = a × b + a × c；做一做 1 判断（56 × (19 + 28) = 56 × 19 + 28 不对、
//          32 × (7 × 3) = 32 × 7 + 32 × 3 不对、64 × 64 + 36 × 64 = (64 + 36) × 64 对）；做一做 2 看竖式 25 × 12（第二行写 250）；按分配律填数。
// 第 2 档：练习七 4 哪个运用了分配律；练习七 6 用分配律算 103 × 12；练习七 7 两个算式得数相等算一个；练习七 5 运动服；
//          练习七 8 动物丛书每本 9 元 5 角；练习七 9 判断；把相同的因数提出来算（64 × 64 + 36 × 64）。
// 第 3 档：练习七 11*（167 × 2 + 167 × 3 + 167 × 5 = 167 × ?）、减法的形式（265 × 105 - 265 × 5）。
// ─────────────────────────────────────────────────────────────

/** 例 7 的两种算法：和 (4 + 2) × 25 得数相等的是 4 × 25 + 2 × 25（植树的情境放在「一共多少人」那道题里，这里只看算式） */
function plantAlsoQ(d: Difficulty, rng: RNG): Question {
  const n = plantNums(rng)
  const e = `(${n.p} + ${n.q}) × ${n.g}`
  // 干扰项里也有两个积相加的（不然正确项最长，看长短就能选）
  return pickQ(DISTRIB, d, `also-${n.g}-${n.p}-${n.q}`, [text('m4.law.q.equalTo'), expr(e)], `${n.p} × ${n.g} + ${n.q} × ${n.g}`, rng.shuffle([`${n.p} × ${n.g} + ${n.q}`, `${n.p} + ${n.q} × ${n.g}`, `${n.p} × ${n.q} + ${n.q} × ${n.g}`]), rng, 2)
}

function distCmpQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(2, 60)
  const b = rng.int(2, 60)
  const c = rng.int(3, 99)
  const front = rng.chance(0.5)
  const l = front ? `(${a} + ${b}) × ${c}` : `${c} × (${a} + ${b})`
  const r = front ? `${a} × ${c} + ${b} × ${c}` : `${c} × ${a} + ${c} × ${b}`
  // 不等的：照典型错法少乘一次（(a + b) × c ○ a × c + b）
  const unequal = rng.chance(d === 1 ? 0.25 : 0.5)
  return cmpQ(DISTRIB, d, rng, l, r, unequal ? (front ? `${a} × ${c} + ${b}` : `${c} × ${a} + ${b}`) : null)
}

/** 做一做 1、练习七 9：判断算式对不对（典型错法：少乘一次、把乘法当成分配） */
function distJudgeQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(11, 99)
  const b = rng.int(11, 59)
  const c = rng.int(11, 59)
  const [x, y] = pairTo(rng, 100, 11)
  const p = rng.int(2, 9)
  const q = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== p))
  const forms: [string, boolean][] = [
    [`${a} × (${b} + ${c}) = ${a} × ${b} + ${c}`, false],
    [`${a} × (${p} × ${q}) = ${a} × ${p} + ${a} × ${q}`, false],
    [`${x} × ${x} + ${y} × ${x} = (${x} + ${y}) × ${x}`, true],
    [`${a} × ${x} + ${y} × ${a} = ${a} × (${x} + ${y})`, true],
  ]
  if (d >= 2) {
    forms.push(
      [`${a} × (100 + 1) = ${a} × 100 + 1`, false],
      [`125 × (8 × ${p}) = (125 × 8) × ${p}`, true],
      [`${a} × 12 = ${a} × 10 × 2`, false],
      [`${a} × (100 + 1) = ${a} × 100 + ${a}`, true],
    )
  }
  const [e, ok] = rng.pick(forms)
  const [cc, w] = judge(ok)
  return pickQ(DISTRIB, d, `judge-${flat(e)}`, [text('m4.law.q.right'), expr(e)], cc, w, rng)
}

/** 做一做 2：看竖式 25 × 12（50、250、300，第二行照这本课本写出末尾的 0），说用了什么运算律；250 是哪两个数相乘得到的 */
function verticalQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(12, 49)
  const u = rng.int(2, 9)
  const b = 10 + u
  const part: StemPart = { kind: 'mul-vertical', a, b, work: { p1: a * u, p2: a * 10, sum: a * b, flat: true } }
  if (rng.chance(0.5)) return pickQ(DISTRIB, d, `vert-law-${a}-${b}`, [text('m4.law.q.vertical'), part], law('distrib'), [law('mulComm'), law('mulAssoc')], rng)
  return pickQ(DISTRIB, d, `vert-row-${a}-${b}`, [text('m4.law.q.vertRow', { n: a * 10 }), part], `${a} × 10`, [`${a} × 1`, `${a} × ${u}`], rng)
}

/** 按分配律填数：(4 + 2) × 25 = 4 × 25 + ? × 25、25 × (4 + 2) = 25 × 4 + 25 × ?、a × c + b × c = (a + ?) × c */
function distFillQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(2, 60)
  const b = rng.int(2, 60)
  const c = rng.int(3, 99)
  const forms: [string, number][] = [
    [`(${a} + ${b}) × ${c} = ${a} × ${c} + ? × ${c}`, b],
    [`${c} × (${a} + ${b}) = ${c} × ${a} + ${c} × ?`, b],
    [`${a} × ${c} + ${b} × ${c} = (${a} + ?) × ${c}`, b],
    [`${c} × ${a} + ${c} × ${b} = ? × (${a} + ${b})`, c],
  ]
  const [e, v] = rng.pick(forms)
  return fillQ(DISTRIB, d, rng, 'm4.law.fillDist', e, v, [a, c, v + 1])
}

/** 练习七 4：下面哪个算式运用了乘法分配律 */
function usesDistQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(101, 199)
  const [b, c] = [rng.int(2, 9), rng.int(2, 9)]
  const right = `${a} × (${b} + ${c}) = ${a} × ${b} + ${a} × ${c}`
  const x = rng.int(11, 40)
  const [y, z] = [rng.int(2, 9), rng.int(11, 19)]
  const [u, v, w] = [rng.int(11, 60), rng.int(2, 9), rng.int(2, 9)]
  // 干扰项：只算了括号里的、乘法当成分配、少乘一次（错的，和正确项一样长）
  return pickQ(DISTRIB, d, `uses-${flat(right)}`, [text('m4.law.q.usesDist')], right, rng.shuffle([`${x} × (${y} + ${z}) = ${x} × ${y + z}`, `${u} × (${v} × ${w}) = ${u} × ${w} × ${v}`, `${x} × (${y} + ${z}) = ${x} × ${y} + ${z}`]), rng, 2)
}

/** 练习七 6：用乘法分配律计算 103 × 12、20 × 55、24 × 205（算得数，或填拆开以后的那个数） */
function distCalcQ(d: Difficulty, rng: RNG): Question {
  const h = rng.pick([100, 200])
  const r = rng.int(1, 9)
  const n = h + r
  const m = rng.int(11, 49)
  const e = rng.chance(0.5) ? `${n} × ${m}` : `${m} × ${n}`
  if (rng.chance(0.35)) return fillQ(DISTRIB, d, rng, 'm4.law.fillDist', `${n} × ${m} = ${h} × ${m} + ? × ${m}`, r, [n, r * 10, h])
  return numQ(DISTRIB, d, `calc-${flat(e)}`, [text('m4.law.useDist'), expr(`${e} = ?`)], n * m, rng, [h * m + r, h * m, n * m + m])
}

/** 练习七 7：两个算式得数相等，选一个算出得数 */
function equalPairQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(11, 49)
  const r = rng.int(2, 9)
  const kind = rng.int(0, 3)
  const [e1, e2] =
    kind === 0
      ? [`${a} × (200 + ${r})`, `${a} × 200 + ${a} × ${r}`]
      : kind === 1
        ? [`${a} × 201`, `${a} × 200 + ${a}`]
        : kind === 2
          ? [`${a * 10 + r} × ${100 + r} - ${a * 10 + r} × ${r}`, `${a * 10 + r} × (${100 + r} - ${r})`]
          : [`25 × ${a} × 4`, `${a} × (25 × 4)`]
  const v = evalExpr(e1)
  return numQ(DISTRIB, d, `pair-${flat(e1)}`, [text('m4.law.equalPair'), expr(e1), expr(e2)], v, rng, [v + a, v - a, v + 100])
}

/** 练习七 5：运动服上衣 75 元、裤子 45 元，卖出 60 套 */
function clothesQ(d: Difficulty, rng: RNG): Question {
  const s = rng.pick([100, 120, 150, 200])
  const a = rng.int(Math.ceil(s * 0.5), s - 25)
  const b = s - a
  const n = rng.int(3, 9) * 10
  return numQ(DISTRIB, d, `clothes-${a}-${b}-${n}`, [text('m4.law.clothes', { a, b, n })], s * n, rng, [a * n + b, a + b * n, s * n + n])
}

/** 练习七 8：一套动物丛书 5 本，每本 9 元 5 角（答案用元、角写，不写小数：这一单元还没学小数） */
function zooBooksQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const n = rng.int(3, 9)
    const y = rng.int(4, 15)
    const j = rng.int(1, 9)
    if ((j * n) % 10 === 0) continue
    const yuan = y * n + Math.floor((j * n) / 10)
    const jiao = (j * n) % 10
    const yj = (Y: number, J: number): LStr => key('m4.law.yj', { y: Y, j: J })
    const wrongs: LStr[] = [yj(y * n, j)]
    if (j * n >= 10) wrongs.push(yj(y * n, j * n))
    wrongs.push(key('m4.law.yOnly', { y: yuan }))
    return pickQ(DISTRIB, d, `zoobooks-${n}-${y}-${j}`, [text('m4.law.zooBooks', { n, y, j })], yj(yuan, jiao), wrongs, rng)
  }
}

/** 把相同的因数提出来：64 × 64 + 36 × 64、26 × 57 + 43 × 26（两个数凑成 100） */
function reverseQ(d: Difficulty, rng: RNG): Question {
  const [x, y] = pairTo(rng, 100, 11)
  const a = rng.int(11, 99)
  const e = rng.chance(0.5) ? `${a} × ${x} + ${y} × ${a}` : `${x} × ${a} + ${y} × ${a}`
  return easyQ(DISTRIB, d, rng, e, [a * 10, a * x + y, a * 100 + a])
}

/** 练习七 11*：167 × 2 + 167 × 3 + 167 × 5 = 167 × ?、28 × 225 - 2 × 225 - 6 × 225 = ? × 225、39 × 8 + 6 × 39 - 39 × 4 = 39 × ? */
function star11Q(d: Difficulty, rng: RNG): Question {
  const a = rng.int(101, 299)
  const kind = rng.int(0, 2)
  if (kind === 0) {
    const x = rng.int(1, 4)
    const y = rng.int(1, 4)
    const z = 10 - x - y
    return fillQ(DISTRIB, d, rng, 'm4.law.fillQ', `${a} × ${x} + ${a} × ${y} + ${a} × ${z} = ${a} × ?`, 10, [x + y, 9, 11])
  }
  if (kind === 1) {
    const b = rng.int(25, 40)
    const x = rng.int(2, 9)
    const y = b - x - 20
    if (y < 1) return star11Q(d, rng)
    return fillQ(DISTRIB, d, rng, 'm4.law.fillQ', `${b} × ${a} - ${x} × ${a} - ${y} × ${a} = ? × ${a}`, 20, [b - x, 21, 19])
  }
  const m = rng.int(11, 49)
  const x = rng.int(5, 9)
  const y = rng.int(2, 9)
  const z = x + y - 10
  if (z < 1) return star11Q(d, rng)
  return fillQ(DISTRIB, d, rng, 'm4.law.fillQ', `${m} × ${x} + ${y} × ${m} - ${m} × ${z} = ${m} × ?`, 10, [x + y, x + y + z, 9])
}

/** 减法的形式：265 × 105 - 265 × 5、17 × 23 - 23 × 7（两个数相差整十、整百） */
function subDistQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(11, 299)
  const diff = rng.pick([10, 100])
  const c = rng.int(2, 9)
  const b = c + diff
  const e = rng.chance(0.5) ? `${a} × ${b} - ${a} × ${c}` : `${b} × ${a} - ${a} × ${c}`
  return easyQ(DISTRIB, d, rng, e, [a * b - c, a * diff + a, a * (b + c)])
}

defineGenerator(DISTRIB, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.12) return plantQ(DISTRIB, d, rng, 'all')
    if (roll < 0.2) return plantAlsoQ(d, rng)
    if (roll < 0.32) return distCmpQ(d, rng)
    if (roll < 0.4) return lawDefQ(DISTRIB, d, rng, 'dist')
    if (roll < 0.52) return distLetterQ(d, rng)
    if (roll < 0.7) return distJudgeQ(d, rng)
    if (roll < 0.82) return verticalQ(d, rng)
    return distFillQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.14) return usesDistQ(d, rng)
    if (roll < 0.3) return distCalcQ(d, rng)
    if (roll < 0.44) return equalPairQ(d, rng)
    if (roll < 0.56) return clothesQ(d, rng)
    if (roll < 0.66) return zooBooksQ(d, rng)
    if (roll < 0.82) return distJudgeQ(d, rng)
    return reverseQ(d, rng)
  }
  if (roll < 0.4) return star11Q(d, rng)
  if (roll < 0.7) return subDistQ(d, rng)
  return distCalcQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 乘法运算律的应用（p29–31，例 8、做一做，练习八）
// 第 1 档：例 8 王老师买羽毛球（25 筒每筒 12 个：12 × 25 拆成 3 × 4 × 25 或 (10 + 2) × 25，拆成哪两个数相乘最简便、递等式里填数）；
//          5 副球拍 330 元每支多少元（330 ÷ 5 ÷ 2 = 330 ÷ (5 × 2)，和它得数相等的算式、填数）；
//          做一做的 35 × 5 × 20、25 × (4 + 8)、2000 ÷ 125 ÷ 8（算得数、先算哪两个数）。
// 第 2 档：练习八 1 的八道（98 + 265 + 202、273 - 73 - 27、250 × 13 × 4、3200 ÷ 4 ÷ 25、88 × 125、99 × 38 + 38、17 × 23 - 23 × 7、72 × 125）；
//          练习八 2 捐书、3 相册够不够、5 一个学期多少天、6 判断、7 牛奶和豆浆、8 李大爷家的菜地（L 形）。
// 第 3 档：思考题（课本用三角、方块、圆，朗读读不出图形，换成三种水果）、菜地、练习八 1。
// ─────────────────────────────────────────────────────────────

/** 例 8：12 × 25、88 × 125 这样的——拆成两个数相乘（凑出 100、1000），或者拆成整十数加几（用分配律） */
function splitNums(rng: RNG): { a: number; m: number; k: number; q: number } {
  if (rng.chance(0.6)) {
    const k = rng.int(3, 11)
    return { a: k * 4, m: 25, k, q: 4 }
  }
  const k = rng.int(2, 11)
  return { a: k * 8, m: 125, k, q: 8 }
}

function splitQ(d: Difficulty, rng: RNG): Question {
  const { a, m, k, q } = splitNums(rng)
  const e = `${a} × ${m}`
  const kind = rng.int(0, 3)
  if (kind === 0) return easyQ(MUL_APPLY, d, rng, e, [a * m + m, k * m, a * 100])
  if (kind === 1) {
    // 拆成哪两个数相乘最简便：k × 4（和 25 凑成 100）、k × 8（和 125 凑成 1000）
    const pairs: string[] = []
    for (let x = 1; x * x <= a; x++) if (a % x === 0 && x !== q && a / x !== q) pairs.push(`${x} × ${a / x}`)
    return pickQ(MUL_APPLY, d, `split-${a}-${m}`, [text('m4.law.q.splitHow', { e, a })], `${k} × ${q}`, rng.shuffle(pairs), rng, 2)
  }
  if (kind === 2) return fillQ(MUL_APPLY, d, rng, 'm4.law.fillAssocCalc', `${e} = ${k} × (${q} × ${m}) = ${k} × ?`, q * m, [q + m, a * m, k * m])
  const t = Math.floor(a / 10) * 10
  const r = a - t
  if (r === 0 || t === 0) return easyQ(MUL_APPLY, d, rng, e, [a * m + m, k * m, a * 100])
  return fillQ(MUL_APPLY, d, rng, 'm4.law.fillDistCalc', `${e} = ${t} × ${m} + ? × ${m}`, r, [a, t, r + 1])
}

/** 例 8 (1)：王老师买了 25 筒羽毛球，每筒 12 个 */
function shuttleQ(d: Difficulty, rng: RNG): Question {
  const { a, m } = splitNums(rng)
  return numQ(MUL_APPLY, d, `shuttle-${m}-${a}`, [text('m4.law.shuttle', { n: m, k: a })], a * m, rng, [a + m, a * m + m, a * 100])
}

/** 例 8 (2)：5 副羽毛球拍 330 元，每副 2 支，每支多少元（连除）；和 330 ÷ 5 ÷ 2 得数相等的算式；填数 */
function racketQ(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([5, 5, 3, 4, 6, 7, 8, 9])
  const p = rng.int(15, 60)
  const t = n * 2 * p
  const kind = rng.int(0, 2)
  if (kind === 0) return numQ(MUL_APPLY, d, `racket-${n}-${t}`, [text('m4.law.racket', { n, t })], p, rng, [t / n, p * 2, p + 2])
  const e = `${t} ÷ ${n} ÷ 2`
  if (kind === 1) return pickQ(MUL_APPLY, d, `racketsame-${n}-${t}`, [text('m4.law.q.sameAs', { e })], `${t} ÷ (${n} × 2)`, [`${t} ÷ ${n} × 2`, `${t} ÷ (${n} + 2)`, `${t} - (${n} × 2)`], rng, 2)
  return fillQ(MUL_APPLY, d, rng, 'm4.law.fillQ', `${e} = ${t} ÷ (${n} × ?)`, 2, [n, 1, 4])
}

/** 做一做：35 × 5 × 20、25 × (4 + 8)、2000 ÷ 125 ÷ 8 这样的 */
function dozMul(rng: RNG): { e: string; first?: [string, string[]] } {
  const kind = rng.int(0, 4)
  if (kind === 0) {
    const [p, q] = rng.pick([[5, 20], [25, 4], [125, 8], [5, 2]] as [number, number][])
    const a = rng.int(11, 99)
    return { e: `${a} × ${p} × ${q}`, first: [`${p} × ${q}`, [`${a} × ${p}`]] }
  }
  if (kind === 1) {
    const b = rng.pick([2, 3, 5, 6, 7, 8, 9, 10, 11, 12])
    return { e: rng.chance(0.5) ? `25 × (4 + ${b})` : `(${b} + 4) × 25` }
  }
  if (kind === 2) {
    const b = rng.int(2, 9)
    return { e: `125 × (8 + ${b})` }
  }
  if (kind === 3) {
    const k = rng.int(2, 9)
    return { e: `${k * 1000} ÷ 125 ÷ 8`, first: [`125 × 8`, [`${k * 1000} ÷ 125`]] }
  }
  const k = rng.int(2, 9)
  return { e: `${k * 100} ÷ 25 ÷ 4`, first: [`25 × 4`, [`${k * 100} ÷ 25`]] }
}

function dozMulQ(d: Difficulty, rng: RNG): Question {
  const x = dozMul(rng)
  if (x.first && rng.chance(0.35)) return firstQ(MUL_APPLY, d, rng, x.e, x.first[0], x.first[1], x.e.includes('÷') ? 'm4.law.q.firstStep' : 'm4.law.q.firstPair')
  const v = evalExpr(x.e)
  return easyQ(MUL_APPLY, d, rng, x.e, [v + 10, v * 10, v + 100])
}

/** 练习八 1 */
function ex81(rng: RNG): string {
  const kind = rng.int(0, 7)
  if (kind === 0) {
    const [a, c] = pairTo(rng, rng.pick([200, 300]), 60)
    return `${a} + ${rng.int(120, 480)} + ${c}`
  }
  if (kind === 1) {
    const a = rng.int(21, 99)
    const t = a + rng.int(2, 6) * 100
    return `${t} - ${a} - ${rng.int(11, 99)}`
  }
  if (kind === 2) return `250 × ${rng.int(11, 39)} × 4`
  if (kind === 3) return `${rng.int(11, 99) * 100} ÷ 4 ÷ 25`
  if (kind === 4) return `${rng.pick([16, 24, 32, 48, 56, 64, 72, 88])} × 125`
  if (kind === 5) {
    const a = rng.int(11, 99)
    return `99 × ${a} + ${a}`
  }
  if (kind === 6) {
    const b = rng.int(11, 99)
    const c = rng.int(2, 9)
    return `${c + 10} × ${b} - ${b} × ${c}`
  }
  return `${rng.pick([12, 16, 24, 28, 32, 36, 44])} × 25`
}

function ex81Q(d: Difficulty, rng: RNG): Question {
  const e = ex81(rng)
  const v = evalExpr(e)
  return easyQ(MUL_APPLY, d, rng, e, [v + 10, v * 10, v - 10])
}

/** 练习八 2：捐赠图书平均分给 14 个班（除数是两个一位数的积，也能连除） */
function donateQ(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([12, 14, 15, 16, 18, 24, 25])
  const q = rng.int(11, 40)
  return numQ(MUL_APPLY, d, `donate-${n * q}-${n}`, [text('m4.law.donate', { t: n * q, n })], q, rng, [n * q - n, q + 1, q * 2])
}

/** 练习八 3：一本相册 32 页，每页 6 张，900 张照片用 5 本够不够 */
function albumQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const p = rng.int(20, 40)
    const k = rng.int(4, 8)
    const m = rng.int(3, 6)
    const cap = p * k * m
    const photos = Math.round((cap + rng.pick([-1, 1]) * rng.int(20, 120)) / 10) * 10
    if (photos === cap || photos <= 0) continue
    const ok = cap >= photos
    return pickQ(MUL_APPLY, d, `album-${p}-${k}-${m}-${photos}`, [text('m4.law.album', { p, k, m, n: photos })], key(ok ? 'm4.law.enough' : 'm4.law.notEnough'), [key(ok ? 'm4.law.notEnough' : 'm4.law.enough')], rng)
  }
}

/** 练习八 5：某学期 3 月 1 日开学、7 月 1 日放暑假，一共多少天（大月、小月） */
const MONTH_DAYS: Record<number, number> = { 3: 31, 4: 30, 5: 31, 6: 30, 9: 30, 10: 31, 11: 30, 12: 31 }
function semesterQ(d: Difficulty, rng: RNG): Question {
  const [m1, m2] = rng.pick([[3, 7], [3, 6], [9, 1], [9, 12]] as [number, number][])
  const months = m2 > m1 ? Array.from({ length: m2 - m1 }, (_, i) => m1 + i) : [9, 10, 11, 12]
  const v = months.reduce((s, m) => s + MONTH_DAYS[m]!, 0)
  return numQ(MUL_APPLY, d, `semester-${m1}-${m2}`, [text('m4.law.semester', { m1, m2 })], v, rng, [v + 1, v - 1, months.length * 30])
}

/** 练习八 6：判断（29 + 22 + 78 = 29 + 100 对、35 × 16 = 35 × 2 × 8 对、123 - 68 + 32 = 123 - (68 + 32) 不对、
 *  102 × 56 = 100 × 56 + 2 不对、12 × 97 + 3 = 12 × 100 不对） */
function mixJudgeQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(11, 99)
  const [b, c] = pairTo(rng, 100, 11)
  const [x, y] = [rng.int(2, 4), rng.int(3, 9)]
  const forms: [string, boolean][] = [
    [`${a} + ${b} + ${c} = ${a} + 100`, true],
    [`${a} × ${x * y} = ${a} × ${x} × ${y}`, true],
    [`${a + 100} - ${b} + ${c} = ${a + 100} - (${b} + ${c})`, false],
    [`${100 + x} × ${a} = 100 × ${a} + ${x}`, false],
    [`${a} × ${b} + ${c} = ${a} × 100`, false],
  ]
  const [e, ok] = rng.pick(forms)
  const [cc, w] = judge(ok)
  return pickQ(MUL_APPLY, d, `judge-${flat(e)}`, [text('m4.law.q.right'), expr(e)], cc, w, rng)
}

/** 练习八 7：每天买一盒牛奶和一袋豆浆，一星期要花多少元 */
function milkQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(3, 8)
  const b = rng.int(1, 4)
  return numQ(MUL_APPLY, d, `milk-${a}-${b}`, [text('m4.law.milk', { a, b })], (a + b) * 7, rng, [a + b * 7, a * 7 + b, a + b + 7])
}

/** 练习八 8：李大爷家的菜地（L 形，课本 9 m、21 m、19 m、9 m）：竖条 w × h + 横条 l × w2（宽一样时 = w × (h + l)） */
function gardenQ(d: Difficulty, rng: RNG): Question {
  const w = rng.int(5, 12)
  const h = rng.int(w + 6, 30)
  const l = rng.int(8, 30)
  const w2 = rng.chance(0.7) ? w : rng.int(4, h - 4)
  const v = w * h + l * w2
  // 图：左边竖条 w 宽、h 高；右下横条从竖条右边伸出去 l、高 w2（单位 m；1 m 画 8 像素左右，太大就整体缩）
  const W = w + l
  const fig: GeoFig = {
    w: W,
    h,
    px: Math.min(8, 220 / W, 100 / h),
    items: [
      {
        t: 'poly',
        pts: [[0, 0], [w, 0], [w, h - w2], [W, h - w2], [W, h], [0, h]],
        fill: 'b',
        labels: [`${w} m`, null, `${l} m`, `${w2} m`, null, `${h} m`],
      },
    ],
  }
  return numQ(MUL_APPLY, d, `garden-${w}-${h}-${l}-${w2}`, [text('m4.law.garden'), { kind: 'geo', figs: [fig], alt: `L 形的菜地：上边 ${w} 米，左边 ${h} 米，右下伸出去的一块上边 ${l} 米、右边 ${w2} 米` }], v, rng, [w * h, (w + l) * h, w * (h + l) + l, v + w])
}

/** 思考题：🍎 + 🍎 = 🍌 + 🍌 + 🍌，🍌 + 🍌 + 🍌 = 🍇 + 🍇 + 🍇 + 🍇，🍎 + 🍌 + 🍇 + 🍇 = 400（课本的三角、方块、圆换成水果，朗读读得出来） */
function fruitPuzzleQ(d: Difficulty, rng: RNG): Question {
  const m = rng.int(10, 30)
  const [A, B, C] = [6 * m, 4 * m, 3 * m]
  const total = A + B + C + C
  const ask = rng.pick(['🍎', '🍌', '🍇'] as const)
  const v = ask === '🍎' ? A : ask === '🍌' ? B : C
  return numQ(MUL_APPLY, d, `fruit-${m}-${ask}`, [text('m4.law.puzzle'), expr('🍎 + 🍎 = 🍌 + 🍌 + 🍌'), expr('🍌 + 🍌 + 🍌 = 🍇 + 🍇 + 🍇 + 🍇'), expr(`🍎 + 🍌 + 🍇 + 🍇 = ${total}`), text('m4.law.puzzleAsk', { x: ask })], v, rng, [A, B, C, total / 4].filter((x) => x !== v))
}

defineGenerator(MUL_APPLY, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.3) return splitQ(d, rng)
    if (roll < 0.4) return shuttleQ(d, rng)
    if (roll < 0.6) return racketQ(d, rng)
    return dozMulQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.3) return ex81Q(d, rng)
    if (roll < 0.38) return donateQ(d, rng)
    if (roll < 0.48) return albumQ(d, rng)
    if (roll < 0.56) return semesterQ(d, rng)
    if (roll < 0.7) return mixJudgeQ(d, rng)
    if (roll < 0.8) return milkQ(d, rng)
    if (roll < 0.92) return gardenQ(d, rng)
    return splitQ(d, rng)
  }
  if (roll < 0.35) return fruitPuzzleQ(d, rng)
  if (roll < 0.7) return ex81Q(d, rng)
  return gardenQ(d, rng)
})
