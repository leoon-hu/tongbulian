import type { Difficulty, FracPic, GeoItem, LStr, Question, QuestionType, SegBrace, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 分数的加法和减法（五下第 6 单元，课本 p89–101，平台当前的旧版课本）：三个小节，第 3 小节按例题拆成两个知识点（五年级数学 I）。
// 同分母分数加、减法：例 1 爸爸吃 3/8 张饼、妈妈吃 1/8 张（一共 / 多吃，圆平均分 8 份）、法则「分母不变，只把分子相加、减」、
//   做一做（两幅线段图列式计算、8 道计算含 4 + 1/4、1 − 11/30）；练习二十三（计算、填空、哪些算式等于 1/2 / 2/3、各年级人数占全校的
//   几分之几、连加连减、图书分类、比大小、算式接龙、丝带）。
// 异分母分数加、减法：例 1 垃圾分类（1/8 + 1/4 先通分成 1/8 + 2/8，试一试 1/8 + 3/20，19/40 − 3/20）、法则「先通分」、做一做
//   （计算、运算机 + 3/8 / − 1/4、玉米面 4/5 kg 黄豆面 3/4 kg）；练习二十四（计算、判断对错、浇果树、毛线、分子是 1 的速算、解方程）。
// 分数加减混合运算：例 1 植被表（1/2 + 3/10 − 1/5，小红分步通分、小亮一次通分）、降水表（1 − 11/20 − 2/5 与 1 − (11/20 + 2/5)）、
//   做一做 1（带括号 / 不带括号的四对）、例 3 喝果汁（半杯兑满水再喝半杯：纯果汁 3/4 杯、水 1/4 杯）；练习二十五 1、2、3、5、6、9*、七巧板。
// 整数加法运算律推广到分数：例 2 两组算式比一比（交换律、结合律）、试着计算、做一做 2 简便计算；练习二十五 4（改问「用的是什么运算律」）、
//   7（括号里填数）、8*（裂项）。
// 课本的规矩：计算的结果能约分的要约成最简分数；结果是假分数时就写最简假分数（本单元一个带分数都没有），是整数写整数。
// 选项：分数一律写成最简（同一题没有等值的两种写法，正确答案也不能从「约没约分」认出来），干扰项照课本暴露的错法造——
// 分母也相加（3/8 + 1/8 = 4/16）、分子加分子分母加分母（3/5 + 4/7 = 7/12，练习二十四 5 原题）、只改分母不改分子（1/8 + 1/4 = 2/8）、
// 加减做反、多一份少一份、带括号和不带括号的另一个得数。分数从课本的数和小范围的分母里取（每个不同的分数都是一条朗读音频）。
// 不出：在○里填运算符号（项目规矩，练习二十四 2、练习二十五 4 改问运算律）、用卡片组算式、同桌出题、提问题、调查。
// 朗读：「长」「短」「边长」「得数」「只把」「它们的差」都不写（丝带说「多 / 少」、三角形说「两条边分别是」、法则说「把什么相加」、
// 垃圾分类说「多占几分之几」、果汁的主人公叫小林（「小乐」的乐可能读 yuè）、「五（1）班」写「五年级一班」。
// ─────────────────────────────────────────────────────────────

const K1 = 'm5s2-07-same'
const K2 = 'm5s2-07-diff'
const K3 = 'm5s2-07-mixed'
const K4 = 'm5s2-07-laws'
type P = Record<string, LStr | number>
type Op = '+' | '-'
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })
const range = (n: number, from = 0): number[] => Array.from({ length: n }, (_, i) => from + i)

// ══ 分数的算法（分子、分母都是整数；分母 > 0）══

export type Frac = readonly [number, number]
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
export const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b
export function reduce([n, d]: Frac): Frac {
  const g = gcd(n, d) || 1
  return [n / g, d / g]
}
export const plus = (a: Frac, b: Frac): Frac => reduce([a[0] * b[1] + b[0] * a[1], a[1] * b[1]])
export const minus = (a: Frac, b: Frac): Frac => reduce([a[0] * b[1] - b[0] * a[1], a[1] * b[1]])
export const same = (a: Frac, b: Frac): boolean => a[0] * b[1] === b[0] * a[1]
export const less = (a: Frac, b: Frac): boolean => a[0] * b[1] < b[0] * a[1]
/** 写成文字：先约分，分母是 1 的写整数（3/1 → 「3」） */
export function fs(f: Frac): string {
  const [n, d] = reduce(f)
  return d === 1 ? String(n) : `${n}/${d}`
}
/** 算式里的一个数（照课本写，可以没约分：3/6、16/24）：'3/8' → [3, 8]，'4' → [4, 1] */
export function parseF(s: string): Frac {
  const m = /^(\d+)\/(\d+)$/.exec(s)
  return m ? [Number(m[1]), Number(m[2])] : [Number(s), 1]
}
/** 算式的值（整数、分数、+ −、小括号）；「= ?」后面的不算 */
export function evalF(src: string): Frac {
  const toks = src.split('=')[0]!.match(/\d+\/\d+|\d+|[-+()]/g) ?? []
  let i = 0
  const atom = (): Frac => {
    const t = toks[i++]!
    if (t === '(') {
      const v = sum()
      i++ // )
      return v
    }
    return parseF(t)
  }
  const sum = (): Frac => {
    let v = atom()
    while (i < toks.length && (toks[i] === '+' || toks[i] === '-')) {
      const op = toks[i++]
      const r = atom()
      v = op === '+' ? plus(v, r) : minus(v, r)
    }
    return v
  }
  return sum()
}

/**
 * 分数答案的干扰项：一律写成最简、值互不相同、不等于正确答案、大于 0（分母 ≤ 999）；cands 是课本暴露的错法，
 * 不够三个再补「多一份 / 少一份 / 分母大一 / 翻一倍」。
 */
export function fracWrongs(correct: Frac, cands: Frac[], count = 3): string[] {
  const c = reduce(correct)
  const extra: Frac[] = [[c[0] + 1, c[1]], [c[0] - 1, c[1]], [c[0], c[1] + 1], [c[0] + 2, c[1]], [c[0] * 2, c[1]], [c[0] + c[1], c[1]], [1, c[1] + 1]]
  const out: Frac[] = []
  for (const f of [...cands, ...extra]) {
    if (!Number.isInteger(f[0]) || !Number.isInteger(f[1]) || f[1] <= 0 || f[0] <= 0) continue
    const r = reduce(f)
    if (r[1] > 999 || r[0] > 9999) continue
    if (same(r, c) || out.some((o) => same(o, r))) continue
    out.push(r)
    if (out.length >= count) break
  }
  return out.map(fs)
}

/** 分数答案的选择题：答案是整数时，干扰项里先放一个别的整数（不然一眼就能认出唯一的整数） */
function fracQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: Frac, cands: Frac[], rng: RNG, type: QuestionType = 'fraction'): Question {
  const c = reduce(correct)
  const lead: Frac[] = c[1] === 1 ? [[c[0] + 1, 1]] : []
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: fs(c), distractors: fracWrongs(c, [...lead, ...cands]), rng })
}

/**
 * 一道两个数的加减算式算错的样子（课本暴露的错法）：分子加分子、分母加分母（同分母时是「分母也相加」）、只改分母不改分子、
 * 只把一个分子扩大、加减做反、通分后分子多一 / 少一。
 */
export function errorsOf(a: Frac, op: Op, b: Frac): Frac[] {
  const D = lcm(a[1], b[1])
  const A = (a[0] * D) / a[1]
  const B = (b[0] * D) / b[1]
  const N = op === '+' ? A + B : A - B
  const out: Frac[] = []
  if (op === '+') {
    out.push([a[0] + b[0], a[1] + b[1]])
    if (a[1] !== b[1]) out.push([a[0] + b[0], D], [A + b[0], D], [a[0] + B, D])
    out.push([A - B, D], [N + 1, D], [N - 1, D])
  } else {
    if (a[1] !== b[1] && a[0] > b[0] && a[1] > b[1]) out.push([a[0] - b[0], a[1] - b[1]])
    if (a[1] !== b[1]) out.push([Math.abs(a[0] - b[0]), D], [A - b[0], D])
    out.push([A + B, D], [N + 1, D], [N - 1, D], [N, 2 * D])
  }
  return out
}
/** 一道「a op b = ?」的计算题 */
function calcQ(kpId: string, d: Difficulty, sig: string, a: string, op: Op, b: string, rng: RNG, lead?: StemPart): Question {
  const A = parseF(a)
  const B = parseF(b)
  const value = op === '+' ? plus(A, B) : minus(A, B)
  return fracQ(kpId, d, sig, [lead ?? T('m5.fadd.calc'), E(`${a} ${op} ${b} = ?`)], value, errorsOf(A, op, B), rng)
}

// ══ 同分母分数加、减法 ══

/** 例 1：爸爸吃 a/n 张饼、妈妈吃 b/n 张饼（课本 3/8、1/8），一共吃多少张 / 爸爸比妈妈多吃多少张；配图：圆平均分 n 份 */
function qCake(d: Difficulty, rng: RNG): Question {
  const book = rng.chance(0.35)
  const n = book ? 8 : rng.pick([6, 8, 10, 12])
  const a = book ? 3 : rng.int(2, n - 2)
  const b = book ? 1 : rng.int(1, Math.min(a - 1, n - a))
  const add = rng.chance(0.5)
  const pic: FracPic = { shape: 'circle', parts: n, shaded: range(a), alt: range(b, a) }
  const stem: StemPart[] = [T(add ? 'm5.fadd.cake.add' : 'm5.fadd.cake.sub', { a: `${a}/${n}`, b: `${b}/${n}` }), { kind: 'frac-shape', items: [pic] }]
  const value: Frac = add ? [a + b, n] : [a - b, n]
  const cands: Frac[] = add ? [[a + b, 2 * n], [a - b, n], [a + b + 1, n], [a + b - 1, n]] : [[a + b, n], [a - b + 1, n], [a, n], [a - b - 1, n]]
  return fracQ(K1, d, `cake-${add ? 'add' : 'sub'}-${a}-${b}-${n}`, stem, value, cands, rng)
}

/** 例 1「可以把 3 个 1/8 和 1 个 1/8 直接加起来」：算式的结果里有几个 1/n（数字键盘） */
function qUnits(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([5, 6, 7, 8, 9, 10, 12])
  const add = rng.chance(0.6)
  const a = add ? rng.int(1, n - 2) : rng.int(2, n - 1)
  const b = add ? rng.int(1, n - 1 - a) : rng.int(1, a - 1)
  const value = add ? a + b : a - b
  return numberQuestion({
    kpId: K1,
    type: 'fraction',
    difficulty: d,
    sig: `units-${a}${add ? '+' : '-'}${b}-${n}`,
    stem: [T('m5.fadd.units', { u: `1/${n}` }), E(`${a}/${n} ${add ? '+' : '-'} ${b}/${n}`)],
    value,
    rng,
    min: 0,
    max: 20,
    smart: [add ? a - b : a + b, n, a, b],
    input: 'numpad',
  })
}

/** 做一做 1：线段图列式计算（课本：平均分 5 段，2/5 + 2/5；平均分 7 段，6/7 − 2/7），整条线段是 1 */
function qSeg(d: Difficulty, rng: RNG): Question {
  const book = rng.chance(0.4)
  const add = rng.chance(0.5)
  const n = book ? (add ? 5 : 7) : rng.pick([5, 6, 7, 8, 9, 10])
  if (add) {
    const a = book ? 2 : rng.int(1, n - 2)
    const b = book ? 2 : rng.int(1, n - 1 - a)
    const braces: SegBrace[] = [
      { from: 0, to: a, side: 'bottom', label: `${a}/${n}` },
      { from: a, to: a + b, side: 'bottom', label: `${b}/${n}` },
      { from: 0, to: a + b, side: 'top', label: '?' },
    ]
    return fracQ(K1, d, `seg-add-${a}-${b}-${n}`, [T('m5.fadd.seg'), { kind: 'seg-braces', parts: n, braces }], [a + b, n], [[a + b, 2 * n], [a + b + 1, n], [a + b - 1, n]], rng)
  }
  const c = book ? 6 : rng.int(3, n - 1)
  const a = book ? 2 : rng.int(1, c - 1)
  const braces: SegBrace[] = [
    { from: 0, to: c, side: 'top', label: `${c}/${n}` },
    { from: 0, to: a, side: 'bottom', label: `${a}/${n}` },
    { from: a, to: c, side: 'bottom', label: '?' },
  ]
  return fracQ(K1, d, `seg-sub-${c}-${a}-${n}`, [T('m5.fadd.seg'), { kind: 'seg-braces', parts: n, braces }], [c - a, n], [[c + a, n], [c - a + 1, n], [c - a - 1, n], [c, n]], rng)
}

/** 做一做 2（课本 8 道） */
export const DO_SAME: [string, Op, string][] = [
  ['2/9', '+', '5/9'],
  ['2/7', '+', '5/7'],
  ['5/8', '+', '1/8'],
  ['4', '+', '1/4'],
  ['5/6', '-', '1/6'],
  ['7/10', '-', '1/10'],
  ['7/9', '-', '2/9'],
  ['1', '-', '11/30'],
]
/** 练习二十三 1、2、3 的计算 */
export const EX_SAME: [string, Op, string][] = [
  ['5/12', '+', '1/12'],
  ['3/7', '+', '4/7'],
  ['7/6', '+', '7/6'],
  ['9/25', '+', '6/25'],
  ['3/8', '+', '3/8'],
  ['3/10', '+', '1/10'],
  ['10/33', '+', '1/33'],
  ['15/16', '+', '9/16'],
  ['3/7', '-', '3/7'],
  ['14/15', '-', '4/15'],
  ['9/10', '-', '7/10'],
  ['11/14', '-', '5/14'],
  ['5/8', '-', '1/8'],
  ['7/6', '-', '1/6'],
  ['17/18', '-', '5/18'],
  ['19/20', '-', '7/20'],
  ['1/13', '+', '7/13'],
  ['5/7', '-', '2/7'],
  ['7/17', '+', '8/17'],
]
/** 同分母的两个数：分母从小范围里取（第 1 档和是 1 以内、两个数都是最简分数，像课本做一做；第 2 档可以超过 1、可以没约分，像练习里的 3/12、16/24） */
function sameDenom(rng: RNG, d: Difficulty): [string, Op, string] {
  const n = rng.pick(d === 1 ? [4, 5, 6, 7, 8, 9, 10, 12] : [6, 8, 9, 10, 12])
  const ok = (x: number): boolean => d > 1 || gcd(x, n) === 1
  for (;;) {
    if (rng.chance(0.5)) {
      const a = rng.int(1, n - 1)
      const b = d === 1 ? rng.int(1, n - a) : rng.int(1, n - 1)
      if (ok(a) && ok(b)) return [`${a}/${n}`, '+', `${b}/${n}`]
      continue
    }
    const a = rng.int(2, n - 1)
    const b = rng.int(1, a - 1)
    if (ok(a) && ok(b)) return [`${a}/${n}`, '-', `${b}/${n}`]
  }
}
function qCalcSame(d: Difficulty, rng: RNG, pool: [string, Op, string][], tag: string): Question {
  const [a, op, b] = rng.chance(0.5) ? rng.pick(pool) : sameDenom(rng, d)
  return calcQ(K1, d, `${tag}-${a}${op}${b}`, a, op, b, rng)
}

/** 法则：「同分母分数相加、减，分母不变，只把分子相加、减」「计算的结果，能约分的要约成最简分数」 */
function qRuleSame(d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['what', 'keep', 'reduce'] as const)
  if (which === 'reduce') {
    return labelQuestion({ kpId: K1, type: 'fraction', difficulty: d, sig: 'rule-reduce', stem: [T('m5.fadd.rule.reduce')], correct: L('m5.fadd.rule.simplest'), distractors: [L('m5.fadd.rule.improper'), L('m5.fadd.rule.unitOne')], rng })
  }
  const num = L('m5.fadd.rule.num')
  const den = L('m5.fadd.rule.den')
  const both = L('m5.fadd.rule.both')
  return which === 'what'
    ? labelQuestion({ kpId: K1, type: 'fraction', difficulty: d, sig: 'rule-what', stem: [T('m5.fadd.rule.what')], correct: num, distractors: [den, both], rng })
    : labelQuestion({ kpId: K1, type: 'fraction', difficulty: d, sig: 'rule-keep', stem: [T('m5.fadd.rule.keep')], correct: den, distractors: [num, both], rng })
}

/** 1 − 几分之几（做一做 2 的 1 − 11/30：把 1 看成 30/30） */
function qOneMinus(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 12])
  const a = rng.int(1, n - 1)
  return calcQ(K1, d, `one-${a}-${n}`, '1', '-', `${a}/${n}`, rng)
}

/** 练习二十三 3：括号里填数（课本写「( )」，这里写「?」） */
export const FILL_SAME: { e: string; ans: string; wrong: string[] }[] = [
  { e: '? - 1/12 = 11/12', ans: '1', wrong: ['5/6', '11/12', '2'] },
  { e: '7/5 + ? = 13/5', ans: '6/5', wrong: ['4', '3/5', '13/5'] },
  { e: '7/5 - ? = 3/5', ans: '4/5', wrong: ['2', '2/5', '3/5'] },
  { e: '1/13 + 7/13 = ?', ans: '8/13', wrong: ['4/13', '6/13', '9/13'] },
  { e: '5/7 - 2/7 = ?', ans: '3/7', wrong: ['3/14', '1', '4/7'] },
  { e: '7/17 + 8/17 = ?', ans: '15/17', wrong: ['15/34', '1/17', '14/17'] },
]
function qFillSame(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(FILL_SAME)
  return labelQuestion({ kpId: K1, type: 'fraction', difficulty: d, sig: `fill-${f.e}`, stem: [T('m5.fadd.what'), E(f.e)], correct: f.ans, distractors: f.wrong, rng })
}

/** 练习二十三 4：通过口算把算式分进「= 1/2」「= 2/3」两个框——这里问「哪个算式的结果是 1/2（2/3）」 */
export const HALF = ['1/4 + 1/4', '7/8 - 3/8', '5/16 + 3/16', '17/12 - 11/12']
export const TWO_THIRDS = ['7/12 + 1/12', '8/9 - 2/9', '14/15 - 4/15', '7/18 + 5/18']
function qWhichSame(d: Difficulty, rng: RNG): Question {
  const half = rng.chance(0.5)
  const [mine, other] = half ? [HALF, TWO_THIRDS] : [TWO_THIRDS, HALF]
  const correct = rng.pick(mine)
  return labelQuestion({
    kpId: K1,
    type: 'fraction',
    difficulty: d,
    sig: `which-${correct}`,
    stem: [T('m5.fadd.which', { f: half ? '1/2' : '2/3' })],
    correct,
    distractors: rng.shuffle(other).slice(0, 3),
    rng,
  })
}

/** 练习二十三 5：某小学各年级学生人数占全校的几分之几（一 2/15、二 2/15、三 2/15、四 3/15、五 3/15、六 ?） */
export const GRADES = ['2/15', '2/15', '2/15', '3/15', '3/15', '3/15']
function gradeTable(hideSix: boolean): StemPart {
  return {
    kind: 'stat-table',
    title: L('m5.fadd.gr.title'),
    head: 'row',
    // 表头照课本只写「一」「二」……（表题说了是各年级）
    rows: [range(6, 1).map((g) => L(`m5.fadd.gr.n${g}`)), GRADES.map((f, i) => (hideSix && i === 5 ? null : f))],
  }
}
function qGrades(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  if (kind === 0) {
    // 六年级：1 − 前五个年级的和 = 3/15 = 1/5
    const five = GRADES.slice(0, 5).reduce((s, f) => s + parseF(f)[0], 0)
    return fracQ(K1, d, 'grades-six', [T('m5.fadd.gr.six'), gradeTable(true)], [15 - five, 15], [[five, 15], [3, 30], [1, 6]], rng)
  }
  // 两个年级一共占几分之几（课本问一、二年级），或一个年级比另一个多占几分之几
  const pairs: [number, number][] = [[1, 2], [3, 4], [4, 5], [2, 5], [1, 6]]
  const [x, y] = rng.pick(pairs)
  const fx = parseF(GRADES[x - 1]!)
  const fy = parseF(GRADES[y - 1]!)
  if (kind === 3 && fx[0] !== fy[0]) {
    const [big, small] = fx[0] > fy[0] ? [x, y] : [y, x]
    const fb = parseF(GRADES[big - 1]!)
    const fsm = parseF(GRADES[small - 1]!)
    return fracQ(K1, d, `grades-more-${big}-${small}`, [T('m5.fadd.gr.more', { x: L(`m5.fadd.gr.n${big}`), y: L(`m5.fadd.gr.n${small}`) }), gradeTable(false)], minus(fb, fsm), errorsOf(fb, '-', fsm), rng)
  }
  return fracQ(K1, d, `grades-sum-${x}-${y}`, [T('m5.fadd.gr.sum', { x: L(`m5.fadd.gr.n${x}`), y: L(`m5.fadd.gr.n${y}`) }), gradeTable(false)], plus(fx, fy), errorsOf(fx, '+', fy), rng)
}

/** 练习二十三 6：同分母连加连减（课本 6 道 + 同样的题换数） */
export const THREE_SAME = ['1/9 + 5/9 + 2/9', '6/11 + 3/11 + 1/11', '1/4 + 1/4 + 3/4', '7/10 - 1/10 - 3/10', '11/6 - 7/6 - 1/6', '1 - 2/3 - 1/3']
function threeSame(rng: RNG): string {
  const n = rng.pick([5, 7, 8, 9, 10, 11, 12])
  const kind = rng.int(0, 2)
  if (kind === 0) {
    const a = rng.int(1, n - 2)
    const b = rng.int(1, n - 1 - a)
    return `${a}/${n} + ${b}/${n} + ${rng.int(1, n - a - b)}/${n}`
  }
  if (kind === 1) {
    const a = rng.int(3, n - 1)
    const b = rng.int(1, a - 2)
    return `${a}/${n} - ${b}/${n} - ${rng.int(1, a - b - 1)}/${n}`
  }
  const a = rng.int(2, n - 1)
  const b = rng.int(1, a - 1)
  return `${a}/${n} - ${b}/${n} + ${rng.int(1, n - a + b)}/${n}`
}
/** 连加连减的错法：只算了前两个数、最后一步加减做反、分母也相加 */
function chainErrors(src: string): Frac[] {
  const nums = (src.match(/\d+\/\d+|\d+/g) ?? []).map(parseF)
  const ops = (src.match(/ [-+] /g) ?? []).map((s) => s.trim() as Op)
  const out: Frac[] = []
  if (nums.length >= 3 && ops.length >= 2) {
    const two = ops[0] === '+' ? plus(nums[0]!, nums[1]!) : minus(nums[0]!, nums[1]!)
    out.push(two, ops[1] === '+' ? minus(two, nums[2]!) : plus(two, nums[2]!))
    const D = nums[0]![1]
    if (nums.every((f) => f[1] === D) && ops.every((o) => o === '+')) out.push([nums.reduce((s, f) => s + f[0], 0), D * nums.length])
  }
  return out
}
function qThreeSame(d: Difficulty, rng: RNG, tag = 'three'): Question {
  const src = rng.chance(0.5) ? rng.pick(THREE_SAME) : threeSame(rng)
  return fracQ(K1, d, `${tag}-${src}`, [T('m5.fadd.calc'), E(`${src} = ?`)], evalF(src), chainErrors(src), rng)
}

/** 练习二十三 7：图书馆各类图书占图书总量的几分之几（课本是扇形图，这里画成统计表）：历史类 3/11、科学类 2/11、文学类 5/11、其他 */
export const BOOKS: [string, string][] = [
  ['history', '3/11'],
  ['science', '2/11'],
  ['story', '5/11'],
]
function qLibrary(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  const head = [L('m5.fadd.lib.kind'), L('m5.fadd.lib.part')]
  const rows = (other: boolean): (string | LStr | null)[][] => [head, ...BOOKS.map(([k, f]) => [L(`m5.fadd.lib.${k}`), f]), ...(other ? [[L('m5.fadd.lib.other'), null]] : [])]
  const table = (other: boolean): StemPart => ({ kind: 'stat-table', title: L('m5.fadd.lib.title'), head: 'row', rows: rows(other) })
  const all = BOOKS.map(([, f]) => parseF(f))
  const three = all.reduce((s, f) => plus(s, f))
  if (kind === 0) return fracQ(K1, d, 'lib-three', [T('m5.fadd.lib.three'), table(false)], three, [[10, 33], [9, 11], [1, 1]], rng)
  if (kind === 1) return fracQ(K1, d, 'lib-other', [T('m5.fadd.lib.askOther'), table(true)], minus([1, 1], three), [three, [2, 11], [1, 10]], rng)
  // 两类一共 / 一类比另一类多占几分之几
  const i = rng.int(0, 2)
  const j = (i + rng.int(1, 2)) % 3
  const [a, b] = parseF(BOOKS[i]![1])[0] >= parseF(BOOKS[j]![1])[0] ? [i, j] : [j, i]
  const fa = all[a]!
  const fb = all[b]!
  const name = (k: number): LStr => L(`m5.fadd.lib.${BOOKS[k]![0]}`)
  if (kind === 2) return fracQ(K1, d, `lib-sum-${a}-${b}`, [T('m5.fadd.lib.sum', { x: name(a), y: name(b) }), table(false)], plus(fa, fb), errorsOf(fa, '+', fb), rng)
  return fracQ(K1, d, `lib-more-${a}-${b}`, [T('m5.fadd.lib.more', { x: name(a), y: name(b) }), table(false)], minus(fa, fb), errorsOf(fa, '-', fb), rng)
}

/** 练习二十三 8：比大小（课本 6 道） */
export const CMP_SAME: [string, string][] = [
  ['4/5 - 2/5', '9/10 - 7/10'],
  ['5/8 - 3/8', '3/4 - 1/4'],
  ['1 - 3/14 - 4/14', '3/20 + 8/20'],
  ['3/12 + 5/12', '1/6 + 3/6'],
  ['3/7 + 4/7', '4/11 + 7/11'],
  ['2/3 + 5/3 + 2/3', '3 + 1/3'],
]
function cmpQ(kpId: string, d: Difficulty, sig: string, x: string, y: string, rng: RNG, type: QuestionType = 'fraction'): Question {
  const vx = evalF(x)
  const vy = evalF(y)
  const correct = same(vx, vy) ? '=' : less(vx, vy) ? '<' : '>'
  return labelQuestion({ kpId, type, difficulty: d, sig, stem: [T('m5.fadd.cmp'), E(`${x} ○ ${y}`)], correct, distractors: ['>', '<', '='].filter((s) => s !== correct), rng })
}
function qCmpSame(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(CMP_SAME)
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a]
  return cmpQ(K1, d, `cmp-${x}|${y}`, x, y, rng)
}

/** 练习二十三 11：红丝带比黄丝带多 7/20 米，蓝丝带比黄丝带少 3/20 米，红丝带和蓝丝带相差多少米（课本的「长」「短」改成「多」「少」） */
export const RIBBONS: [string, string][] = [
  ['7/20', '3/20'],
  ['3/10', '1/10'],
  ['5/12', '1/12'],
  ['2/9', '4/9'],
  ['3/16', '5/16'],
]
function qRibbon(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(RIBBONS)
  const fa = parseF(a)
  const fb = parseF(b)
  const diff: Frac = fa[0] >= fb[0] ? minus(fa, fb) : minus(fb, fa)
  return fracQ(K1, d, `ribbon-${a}-${b}`, [T('m5.fadd.ribbon', { a, b })], plus(fa, fb), [diff, fa, fb, [fa[0] + fb[0], 2 * fa[1]]], rng)
}

function sameGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1（饼、几个 1/8、法则）、做一做 1 线段图、做一做 2 计算（课本 8 道 + 换数）、1 减几分之几
    if (roll < 0.18) return qCake(d, rng)
    if (roll < 0.3) return qUnits(d, rng)
    if (roll < 0.46) return qSeg(d, rng)
    if (roll < 0.8) return qCalcSame(d, rng, DO_SAME, 'do')
    if (roll < 0.9) return qOneMinus(d, rng)
    return qRuleSame(d, rng)
  }
  if (d === 2) {
    // 练习二十三
    if (roll < 0.24) return qCalcSame(d, rng, EX_SAME, 'calc')
    if (roll < 0.34) return qFillSame(d, rng)
    if (roll < 0.44) return qWhichSame(d, rng)
    if (roll < 0.56) return qGrades(d, rng)
    if (roll < 0.7) return qThreeSame(d, rng)
    if (roll < 0.8) return qLibrary(d, rng)
    if (roll < 0.9) return qCmpSame(d, rng)
    return qRibbon(d, rng)
  }
  // 第 3 档：算式接龙（连着加减）、丝带、表里的分数
  if (roll < 0.45) return qThreeSame(d, rng, 'chain')
  if (roll < 0.7) return qRibbon(d, rng)
  return qGrades(d, rng)
}
defineGenerator(K1, sameGen)

// ══ 异分母分数加、减法 ══

/** 例 1：某小区生活垃圾分类（课本是扇形图，这里画成统计表）：有害垃圾 1/8、可回收物 3/20、其他垃圾 1/4、厨余垃圾 19/40 */
export const TRASH: [string, string][] = [
  ['harm', '1/8'],
  ['recycle', '3/20'],
  ['other', '1/4'],
  ['kitchen', '19/40'],
]
function trashTable(): StemPart {
  return { kind: 'stat-table', title: L('m5.fadd.tr.title'), head: 'row', rows: [[L('m5.fadd.tr.kind'), L('m5.fadd.tr.part')], ...TRASH.map(([k, f]) => [L(`m5.fadd.tr.${k}`), f])] }
}
const trashName = (i: number): LStr => L(`m5.fadd.tr.${TRASH[i]![0]}`)
/** 课本问的几组：有害 + 其他（1/8 + 1/4）、有害 + 可回收（试一试 1/8 + 3/20）、厨余 − 可回收（19/40 − 3/20）；另外几组同样的问法 */
export const TRASH_ASK: [number, Op, number][] = [
  [0, '+', 2],
  [0, '+', 1],
  [3, '-', 1],
  [1, '+', 2],
  [2, '-', 0],
  [3, '-', 2],
]
function qTrash(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.2)) {
    // 例 1(2)「可回收物多还是厨余垃圾多？」
    const [x, y] = rng.chance(0.5) ? [1, 3] : [3, 1]
    return labelQuestion({ kpId: K2, type: 'fraction', difficulty: d, sig: `trash-more-${x}-${y}`, stem: [T('m5.fadd.tr.which', { x: trashName(x), y: trashName(y) }), trashTable()], correct: trashName(3), distractors: [trashName(1)], rng })
  }
  const pick = d === 1 ? rng.pick(TRASH_ASK.slice(0, 4)) : rng.pick(TRASH_ASK)
  const [i, op, j] = pick
  const a = parseF(TRASH[i]![1])
  const b = parseF(TRASH[j]![1])
  const key = op === '+' ? 'm5.fadd.tr.sum' : 'm5.fadd.tr.more'
  const value = op === '+' ? plus(a, b) : minus(a, b)
  return fracQ(K2, d, `trash-${i}${op}${j}`, [T(key, { x: trashName(i), y: trashName(j) }), trashTable()], value, errorsOf(a, op, b), rng)
}

/** 例 1 的通分：「1/8 + 1/4 先通分，可以写成？」（课本 1/8 + 2/8）；干扰项：只改分母不改分子、分子乘错、用两个分母的积却没改分子 */
export const TONGFEN: [string, Op, string][] = [
  ['1/8', '+', '1/4'],
  ['1/8', '+', '3/20'],
  ['19/40', '-', '3/20'],
  ['1/2', '+', '3/8'],
  ['5/12', '-', '1/4'],
  ['9/10', '-', '1/4'],
  ['5/8', '+', '1/3'],
  ['1/5', '+', '1/8'],
  ['2/3', '-', '1/6'],
  ['3/4', '+', '1/6'],
]
function qTongfen(d: Difficulty, rng: RNG): Question {
  const [a, op, b] = rng.pick(TONGFEN)
  const A = parseF(a)
  const B = parseF(b)
  const D = lcm(A[1], B[1])
  const na = (A[0] * D) / A[1]
  const nb = (B[0] * D) / B[1]
  const w = (x: number, y: number, den = D): string => `${x}/${den} ${op} ${y}/${den}`
  const correct = w(na, nb)
  // 错的写法：只改分母不改分子、只改了一个分子、分子多算一份、分母相乘却没改分子；两个数都和原来相等的（别的公分母）不算错，不放
  const cands: [number, number, number][] = [[A[0], B[0], D], [na, B[0], D], [A[0], nb, D], [na + 1, nb, D], [na, nb + 1, D], [A[0], B[0], A[1] * B[1]]]
  const distractors = [
    ...new Set(cands.filter(([x, y, den]) => !(same([x, den], A) && same([y, den], B))).map(([x, y, den]) => w(x, y, den))),
  ]
    .filter((c) => c !== correct)
    .slice(0, 3)
  return labelQuestion({ kpId: K2, type: 'fraction', difficulty: d, sig: `tongfen-${a}${op}${b}`, stem: [T('m5.fadd.tongfen'), E(`${a} ${op} ${b}`)], correct, distractors, rng })
}

/** 例 1 的配图：1/8 + 1/4（圆平均分 8 份涂 1 份、圆平均分 4 份涂 1 份），同样的图换几组分母成倍数关系的数 */
export const PIC_PAIRS: [number, number, number, number][] = [
  [1, 8, 1, 4],
  [1, 6, 1, 3],
  [1, 4, 1, 2],
  [3, 8, 1, 4],
  [1, 10, 2, 5],
  [1, 6, 1, 2],
  [3, 10, 1, 5],
]
function qPic(d: Difficulty, rng: RNG): Question {
  const [a, p, b, q] = rng.pick(PIC_PAIRS)
  const items: FracPic[] = [
    { shape: 'circle', parts: p, shaded: range(a) },
    { shape: 'circle', parts: q, shaded: [], alt: range(b) },
  ]
  return fracQ(K2, d, `pic-${a}/${p}+${b}/${q}`, [T('m5.fadd.pic'), { kind: 'frac-shape', items }, E(`${a}/${p} + ${b}/${q} = ?`)], plus([a, p], [b, q]), errorsOf([a, p], '+', [b, q]), rng)
}

/** 例 1、做一做的计算（课本：做一做 4 道、运算机 + 3/8 三道和 − 1/4 三道、例 1 的三道） */
export const DO_DIFF: [string, Op, string][] = [
  ['5/8', '+', '1/3'],
  ['1/4', '+', '3/8'],
  ['3/4', '+', '1/7'],
  ['1/5', '+', '1/8'],
  ['1/2', '+', '3/8'],
  ['1/12', '+', '3/8'],
  ['1/24', '+', '3/8'],
  ['5/12', '-', '1/4'],
  ['9/10', '-', '1/4'],
  ['5/7', '-', '1/4'],
  ['1/8', '+', '1/4'],
  ['1/8', '+', '3/20'],
  ['19/40', '-', '3/20'],
]
/** 练习二十四 1 */
export const EX_DIFF: [string, Op, string][] = [
  ['7/8', '-', '5/6'],
  ['2/9', '+', '1/2'],
  ['6/7', '-', '2/3'],
  ['3/10', '+', '1/4'],
  ['3/7', '+', '1/9'],
  ['1/3', '-', '1/5'],
  ['1/6', '+', '1/4'],
  ['5/7', '-', '1/5'],
]
/** 练习二十四 6：分子都是 1 的（第 3 档） */
export const UNIT_PAIRS: [string, Op, string][] = [
  ['1/3', '-', '1/4'],
  ['1/2', '+', '1/5'],
  ['1/6', '-', '1/7'],
  ['1/5', '+', '1/6'],
  ['1/7', '-', '1/8'],
  ['1/8', '+', '1/9'],
  ['1/2', '-', '1/3'],
  ['1/9', '+', '1/10'],
]
/** 异分母的两个最简真分数：分母从 2–12 里取，公分母第 1 档不超过 36 */
const DENOMS = [2, 3, 4, 5, 6, 8, 9, 10, 12]
function diffDenom(rng: RNG, d: Difficulty): [string, Op, string] {
  for (;;) {
    const p = rng.pick(DENOMS)
    const q = rng.pick(DENOMS)
    if (p === q || lcm(p, q) > (d === 1 ? 36 : 60)) continue
    const a = rng.int(1, p - 1)
    const b = rng.int(1, q - 1)
    if (gcd(a, p) !== 1 || gcd(b, q) !== 1) continue
    const A: Frac = [a, p]
    const B: Frac = [b, q]
    if (rng.chance(0.5)) return [`${a}/${p}`, '+', `${b}/${q}`]
    if (same(A, B)) continue
    return less(A, B) ? [`${b}/${q}`, '-', `${a}/${p}`] : [`${a}/${p}`, '-', `${b}/${q}`]
  }
}
function qCalcDiff(d: Difficulty, rng: RNG, pool: [string, Op, string][], tag: string): Question {
  const [a, op, b] = rng.chance(0.5) ? rng.pick(pool) : diffDenom(rng, d)
  return calcQ(K2, d, `${tag}-${a}${op}${b}`, a, op, b, rng)
}

/** 做一做 2：玉米面 4/5 kg、黄豆面 3/4 kg，多用了多少千克、一共用了多少千克（另几组同样的问法） */
export const FLOURS: [string, string][] = [
  ['4/5', '3/4'],
  ['2/3', '1/2'],
  ['3/4', '2/3'],
  ['5/6', '3/4'],
  ['3/5', '1/2'],
]
function qFlour(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 1 && rng.chance(0.4) ? FLOURS[0]! : rng.pick(FLOURS)
  const add = rng.chance(0.5)
  const A = parseF(a)
  const B = parseF(b)
  const value = add ? plus(A, B) : minus(A, B)
  return fracQ(K2, d, `flour-${add ? 'sum' : 'more'}-${a}-${b}`, [T(add ? 'm5.fadd.flour.sum' : 'm5.fadd.flour.more', { a, b })], value, errorsOf(A, add ? '+' : '-', B), rng)
}

/** 法则：「异分母分数相加、减，先通分，再按照同分母分数加、减法进行计算」 */
function qRuleDiff(d: Difficulty, rng: RNG): Question {
  return labelQuestion({ kpId: K2, type: 'fraction', difficulty: d, sig: 'rule-first', stem: [T('m5.fadd.rule.first')], correct: L('m5.fadd.rule.tongfen'), distractors: [L('m5.fadd.rule.yuefen'), L('m5.fadd.rule.addDen')], rng })
}

/** 练习二十四 5：下面的计算对吗（课本 4 道 + 同样的错法换数：分子加分子、分母加分母） */
export const JUDGE_DIFF: [string, Op, string, string][] = [
  ['2/3', '-', '4/9', '2/9'],
  ['3/5', '+', '4/7', '7/12'],
  ['7/10', '-', '3/5', '4/5'],
  ['1/2', '+', '3/7', '13/14'],
  ['1/3', '+', '1/4', '2/7'],
  ['2/5', '+', '1/3', '11/15'],
  ['5/6', '-', '1/2', '1/3'],
  ['3/4', '-', '1/2', '2/2'],
]
function qJudge(d: Difficulty, rng: RNG): Question {
  const [a, op, b, r] = rng.pick(JUDGE_DIFF)
  const value = op === '+' ? plus(parseF(a), parseF(b)) : minus(parseF(a), parseF(b))
  const right = same(value, parseF(r))
  return labelQuestion({ kpId: K2, type: 'fraction', difficulty: d, sig: `judge-${a}${op}${b}=${r}`, stem: [T('m5.fadd.judge'), E(`${a} ${op} ${b} = ${r}`)], correct: L(right ? 'm5.fadd.yes' : 'm5.fadd.no'), distractors: [L(right ? 'm5.fadd.no' : 'm5.fadd.yes')], rng })
}

/** 练习二十四 3：浇果树（1/4 + 3/8 + 3/10 = 37/40，没浇的 3/40） */
function qTrees(d: Difficulty, rng: RNG): Question {
  const done = evalF('1/4 + 3/8 + 3/10')
  if (rng.chance(0.5)) return fracQ(K2, d, 'trees-done', [T('m5.fadd.trees'), T('m5.fadd.trees.done')], done, [[7, 22], [7, 40], [1, 1], [27, 40]], rng)
  return fracQ(K2, d, 'trees-left', [T('m5.fadd.trees'), T('m5.fadd.trees.left')], minus([1, 1], done), [done, [13, 40], [1, 10], [3, 22]], rng)
}

/** 练习二十四 7：毛线织毛衣用去 7/10、织手套用去 1/20（课本让自己提问题，这里问课本答案里的三个） */
function qYarn(d: Difficulty, rng: RNG): Question {
  const a: Frac = [7, 10]
  const b: Frac = [1, 20]
  const kind = rng.int(0, 2)
  const used = plus(a, b)
  if (kind === 0) return fracQ(K2, d, 'yarn-used', [T('m5.fadd.yarn'), T('m5.fadd.yarn.used')], used, errorsOf(a, '+', b), rng)
  if (kind === 1) return fracQ(K2, d, 'yarn-left', [T('m5.fadd.yarn'), T('m5.fadd.yarn.left')], minus([1, 1], used), [used, [3, 10], [19, 20], [1, 5]], rng)
  return fracQ(K2, d, 'yarn-more', [T('m5.fadd.yarn'), T('m5.fadd.yarn.more')], minus(a, b), errorsOf(a, '-', b), rng)
}

/** 做一做 1「分数加、减法的验算方法与整数加、减法的验算方法相同」：验算 a + b = c 用哪个算式（只有一个对的） */
function qVerify(d: Difficulty, rng: RNG): Question {
  const [a, op, b] = rng.pick(DO_DIFF.slice(4, 10))
  const A = parseF(a)
  const B = parseF(b)
  const c = fs(op === '+' ? plus(A, B) : minus(A, B))
  // 加法用减法验算：c − b = a；减法用加法验算：c + b = a
  const correct = op === '+' ? `${c} - ${b} = ${a}` : `${c} + ${b} = ${a}`
  const distractors = op === '+' ? [`${c} + ${b} = ${a}`, `${a} - ${b} = ${c}`] : [`${a} + ${b} = ${c}`, `${c} - ${b} = ${a}`]
  return labelQuestion({ kpId: K2, type: 'fraction', difficulty: d, sig: `verify-${a}${op}${b}`, stem: [T('m5.fadd.verify'), E(`${a} ${op} ${b} = ${c}`)], correct, distractors, rng })
}

/** 练习二十四 4：解方程（第 3 档；x 按字母名读） */
export const EQUATIONS: { e: string; x: Frac; wrong: Frac[] }[] = [
  { e: 'x + 3/7 = 3/4', x: [9, 28], wrong: [[33, 28], [0, 1], [6, 11]] },
  { e: 'x - 5/12 = 3/8', x: [19, 24], wrong: [[1, 24], [8, 20], [2, 5]] },
  { e: 'x - 5/6 = 1', x: [11, 6], wrong: [[1, 6], [6, 7], [5, 6]] },
  { e: '5/9 + x = 3/5', x: [2, 45], wrong: [[52, 45], [2, 4], [1, 9]] },
]
function qEquation(d: Difficulty, rng: RNG): Question {
  const q = rng.pick(EQUATIONS)
  return fracQ(K2, d, `eq-${q.e}`, [T('m5.fadd.eq'), E(q.e)], q.x, q.wrong, rng)
}

/** 练习二十四 9「有趣的三角形」：1/4 + 3/4 + 3/4 + 1/4 = 2、再往下一行 = 4（得数是整数，数字键盘） */
export const PASCAL = ['1/4 + 2/4 + 1/4', '1/4 + 3/4 + 3/4 + 1/4', '1/4 + 4/4 + 6/4 + 4/4 + 1/4', '1/8 + 2/8 + 1/8', '1/8 + 3/8 + 3/8 + 1/8']
function qPascal(d: Difficulty, rng: RNG): Question {
  const src = rng.pick(PASCAL)
  const v = evalF(src)
  if (v[1] !== 1) return fracQ(K2, d, `pascal-${src}`, [T('m5.fadd.calc'), E(`${src} = ?`)], v, chainErrors(src), rng)
  return numberQuestion({ kpId: K2, type: 'fraction', difficulty: d, sig: `pascal-${src}`, stem: [T('m5.fadd.calc'), E(`${src} = ?`)], value: v[0], rng, min: 0, max: 20, input: 'numpad' })
}

function diffGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1（垃圾分类、配图、通分这一步、法则）、做一做（计算、运算机、玉米面）
    if (roll < 0.2) return qTrash(d, rng)
    if (roll < 0.3) return qPic(d, rng)
    if (roll < 0.44) return qTongfen(d, rng)
    if (roll < 0.78) return qCalcDiff(d, rng, DO_DIFF, 'do')
    if (roll < 0.92) return qFlour(d, rng)
    return qRuleDiff(d, rng)
  }
  if (d === 2) {
    // 练习二十四
    if (roll < 0.3) return qCalcDiff(d, rng, EX_DIFF, 'calc')
    if (roll < 0.48) return qJudge(d, rng)
    if (roll < 0.62) return qTrees(d, rng)
    if (roll < 0.76) return qYarn(d, rng)
    if (roll < 0.88) return qVerify(d, rng)
    return qTrash(d, rng)
  }
  // 第 3 档：分子是 1 的速算、解方程、有趣的三角形
  if (roll < 0.45) {
    const [a, op, b] = rng.pick(UNIT_PAIRS)
    return calcQ(K2, d, `unit-${a}${op}${b}`, a, op, b, rng)
  }
  if (roll < 0.8) return qEquation(d, rng)
  return qPascal(d, rng)
}
defineGenerator(K2, diffGen)

// ══ 分数加减混合运算 ══

/** 例 1(1)：某森林公园植被（乔木林 1/2、灌木林 3/10、草地 1/5），森林（乔木林和灌木林）比草地多占几分之几 = 1/2 + 3/10 − 1/5 */
export const PLANTS: [string, string][] = [
  ['tree', '1/2'],
  ['bush', '3/10'],
  ['grass', '1/5'],
]
function plantTable(): StemPart {
  return { kind: 'stat-table', title: L('m5.fadd.pl.title'), head: 'row', rows: [[L('m5.fadd.pl.kind'), L('m5.fadd.pl.part')], ...PLANTS.map(([k, f]) => [L(`m5.fadd.pl.${k}`), f])] }
}
function qForest(d: Difficulty, rng: RNG): Question {
  const [tree, bush, grass] = PLANTS.map(([, f]) => parseF(f)) as [Frac, Frac, Frac]
  const kind = d === 1 ? rng.int(0, 2) : rng.int(0, 3)
  if (kind <= 1) {
    // 课本的问题：森林比草地多占几分之几（列式 1/2 + 3/10 − 1/5）
    const value = minus(plus(tree, bush), grass)
    return fracQ(K3, d, 'forest-more', [T('m5.fadd.pl.forestMore'), plantTable()], value, [plus(tree, bush), plus(plus(tree, bush), grass), minus(tree, grass), [1, 10]], rng)
  }
  if (kind === 2) return fracQ(K3, d, 'forest-all', [T('m5.fadd.pl.forestAll'), plantTable()], plus(tree, bush), errorsOf(tree, '+', bush), rng)
  return fracQ(K3, d, 'forest-tree', [T('m5.fadd.pl.treeMore'), plantTable()], minus(tree, bush), errorsOf(tree, '-', bush), rng)
}
/** 例 1(1) 的两种通分：小红分步（先算 1/2 + 3/10）、小亮一次通分（5/10 + 3/10 − 2/10）——问「一次通分可以写成」 */
export const ONE_SHOT: string[] = ['1/2 + 3/10 - 1/5', '5/6 - 1/2 + 1/3', '1/2 + 1/4 - 1/6', '7/8 - 5/12 + 1/6', '3/4 + 1/2 - 5/8']
function qOneShot(d: Difficulty, rng: RNG): Question {
  const src = rng.pick(ONE_SHOT)
  const nums = (src.match(/\d+\/\d+/g) ?? []).map(parseF)
  const ops = (src.match(/ [-+] /g) ?? []).map((s) => s.trim())
  const D = nums.reduce((m, f) => lcm(m, f[1]), 1)
  const write = (ns: number[], den: number): string => ns.map((n, i) => `${i ? ` ${ops[i - 1]} ` : ''}${n}/${den}`).join('')
  const correct = write(nums.map((f) => (f[0] * D) / f[1]), D)
  const cands = [
    write(nums.map((f) => f[0]), D), // 只改分母不改分子
    write(nums.map((f, i) => (i === nums.length - 1 ? f[0] : (f[0] * D) / f[1])), D), // 最后一个分子忘了改
    write(nums.map((f) => (f[0] * D) / f[1] + (f[1] === D ? 0 : 1)), D),
  ]
  const distractors = [...new Set(cands)].filter((c) => c !== correct).slice(0, 3)
  return labelQuestion({ kpId: K3, type: 'fraction', difficulty: d, sig: `oneshot-${src}`, stem: [T('m5.fadd.oneShot'), E(src)], correct, distractors, rng })
}

/** 例 1(2)：森林和裸露地面的降水（森林 7/20、1/4、2/5；裸露地面 ?、11/20、2/5），裸露地面储存的地下水占降水的几分之几 */
function rainTable(hide: boolean): StemPart {
  return {
    kind: 'stat-table',
    title: L('m5.fadd.rain.title'),
    head: 'both',
    rows: [
      [L('m5.fadd.rain.kind'), L('m5.fadd.rain.under'), L('m5.fadd.rain.surface'), L('m5.fadd.rain.other')],
      [L('m5.fadd.rain.forest'), '7/20', '1/4', '2/5'],
      [L('m5.fadd.rain.bare'), hide ? null : '1/20', '11/20', '2/5'],
    ],
  }
}
function qRain(d: Difficulty, rng: RNG): Question {
  if (d > 1 && rng.chance(0.4)) {
    // 自拟（第 2 档）：森林储存的地下水比裸露地面多占降水的几分之几（7/20 − 1/20 = 3/10）
    return fracQ(K3, d, 'rain-more', [T('m5.fadd.rain.more'), rainTable(false)], minus([7, 20], [1, 20]), [[8, 20], [6, 40], [7, 20]], rng)
  }
  const value = evalF('1 - 11/20 - 2/5')
  return fracQ(K3, d, 'rain-bare', [T('m5.fadd.rain.ask'), rainTable(true)], value, [evalF('11/20 + 2/5'), evalF('1 - 11/20 + 2/5'), [9, 20], [1, 10]], rng)
}
/** 例 1(2) 的两种算法：1 − 11/20 − 2/5 与 1 − (11/20 + 2/5) */
function qTwoWays(d: Difficulty, rng: RNG): Question {
  const src = rng.chance(0.5) ? '1 - 11/20 - 2/5' : '1 - (11/20 + 2/5)'
  return fracQ(K3, d, `ways-${src}`, [T('m5.fadd.calc'), E(`${src} = ?`)], evalF(src), [evalF('11/20 + 2/5'), evalF('1 - 11/20 + 2/5'), [9, 20], [1, 10]], rng)
}

/** 做一做 1：四对算式（不带括号 / 带括号），同一组数的另一个得数是干扰项 */
export const DO_MIXED: [string, string][] = [
  ['5/6 - 1/2 + 1/3', '5/6 - (1/2 + 1/3)'],
  ['7/8 - 5/12 + 1/6', '7/8 - (5/12 + 1/6)'],
  ['1/2 + 1/4 - 1/6', '1/2 + (1/4 - 1/6)'],
  ['9/4 - 1/4 + 1/5', '9/4 - (1/4 + 1/5)'],
]
/** 练习二十五 1 */
export const EX_MIXED = ['4/3 - (2/5 + 3/10)', '5/7 + 1/4 - 9/14', '3/4 + 3/6 - 5/8', '5/9 + (3/4 - 1/2)', '1/10 + 3/8 - 2/5', '3/5 - (2/15 + 1/3)']
/** 带括号和不带括号的另一种算法、从右往左算、只算了前两个数 */
function mixedErrors(src: string): Frac[] {
  const out: Frac[] = []
  const flat = src.replace(/[()]/g, '')
  if (flat !== src) out.push(evalF(flat))
  else {
    // 不带括号的，假装后两个数先算（加了括号）
    const m = /^(.+?) ([-+]) (.+)$/.exec(src)
    if (m) out.push(evalF(`${m[1]} ${m[2]} (${m[3]})`))
  }
  out.push(...chainErrors(flat))
  return out.filter((f) => f[0] > 0)
}
function qCalcMixed(d: Difficulty, rng: RNG): Question {
  const src = d === 1 ? rng.pick(rng.pick(DO_MIXED)) : rng.pick(EX_MIXED)
  return fracQ(K3, d, `mix-${src}`, [T('m5.fadd.calc'), E(`${src} = ?`)], evalF(src), mixedErrors(src), rng)
}
/** 机器人「分数加减混合运算的顺序和整数加减混合运算的顺序相同」：先算哪一步 */
function qOrder(d: Difficulty, rng: RNG): Question {
  const [plain, paren] = rng.pick(DO_MIXED)
  const usePar = rng.chance(0.5)
  const src = usePar ? paren : plain
  const [a, op1, b, , c] = plain.split(' ') as [string, string, string, string, string]
  const first = `${a} ${op1} ${b}`
  const inner = /\(([^)]+)\)/.exec(paren)![1]!
  const outer = `${a} ${op1} ${c}`
  const correct = usePar ? inner : first
  const distractors = [...new Set([first, inner, outer])].filter((s) => s !== correct)
  return labelQuestion({ kpId: K3, type: 'fraction', difficulty: d, sig: `order-${src}`, stem: [T('m5.fadd.order'), E(src)], correct, distractors, rng })
}

/**
 * 例 3 喝果汁：一杯纯果汁，先喝了 a 杯，兑满水，又喝了一半（课本：喝了半杯，又喝了半杯 → 纯果汁 3/4 杯、水 1/4 杯；
 * 练习二十五 6：喝了 1/3 杯 → 纯果汁 2/3 杯、水 1/6 杯）。第二次喝的一半里，纯果汁和水按兑满后的比例各占一半。
 */
export const JUICE: Frac[] = [
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
]
export function juiceOf(a: Frac, all = false): { juice: Frac; water: Frac; second: Frac } {
  // 兑满后：纯果汁 1 − a，水 a；第二次喝一半（all = 全部喝完）
  const k: Frac = all ? [1, 1] : [1, 2]
  const second = reduce([(a[1] - a[0]) * k[0], a[1] * k[1]])
  return { juice: plus(a, second), water: reduce([a[0] * k[0], a[1] * k[1]]), second }
}
function qJuice(d: Difficulty, rng: RNG): Question {
  const a: Frac = d === 1 ? [1, 2] : rng.pick(JUICE)
  const all = d === 3 && rng.chance(0.5)
  const { juice, water, second } = juiceOf(a, all)
  const story = T(all ? 'm5.fadd.juice.all' : 'm5.fadd.juice.half', { a: fs(a) })
  const kind = d === 1 ? rng.int(0, 2) : rng.int(0, 1)
  // 错法：第二次喝的全当成纯果汁 / 全当成水、把两次喝的加在一起当成纯果汁（一共喝了 a + 1/2 或 a + 1 杯）
  const total = plus(a, all ? [1, 1] : [1, 2])
  if (kind === 0) return fracQ(K3, d, `juice-j-${fs(a)}${all ? '-all' : ''}`, [story, T('m5.fadd.juice.askJuice')], juice, [total, water, a, second, [1, 2]], rng)
  if (kind === 1) return fracQ(K3, d, `juice-w-${fs(a)}${all ? '-all' : ''}`, [story, T('m5.fadd.juice.askWater')], water, [second, all ? [1, 1] : [1, 2], a, juice], rng)
  // 分析与解答：第二次喝的半杯里，纯果汁有多少杯（1/2 杯的一半是 1/4 杯）
  return fracQ(K3, d, `juice-s-${fs(a)}`, [story, T('m5.fadd.juice.askSecond')], second, [[1, 2], juice, [1, 3]], rng)
}

/** 练习二十五 2：1 米的铁丝围成三角形，两条边 1/4 米、3/8 米，第三条边多少米、是什么三角形 */
function qWire(d: Difficulty, rng: RNG): Question {
  const third = evalF('1 - 1/4 - 3/8')
  if (rng.chance(0.55)) return fracQ(K3, d, 'wire-third', [T('m5.fadd.wire'), T('m5.fadd.wire.third')], third, [evalF('1/4 + 3/8'), evalF('1 - 1/4 + 3/8'), [1, 4], [1, 8]], rng)
  return labelQuestion({ kpId: K3, type: 'fraction', difficulty: d, sig: 'wire-kind', stem: [T('m5.fadd.wire'), T('m5.fadd.wire.kind')], correct: L('m5.fadd.tri.iso'), distractors: [L('m5.fadd.tri.equi'), L('m5.fadd.tri.right')], rng })
}
/** 练习二十五 3：参观学习一共 10 小时，路上 1/5，吃午饭和休息 3/10，参观学习的时间占几分之几（10 小时是多余的条件） */
function qVisit(d: Difficulty, rng: RNG): Question {
  return fracQ(K3, d, 'visit', [T('m5.fadd.visit')], evalF('1 - 1/5 - 3/10'), [evalF('1/5 + 3/10'), [4, 15], [3, 10], [2, 5]], rng)
}
/** 练习二十五 5：先加 1/9、再减 1/3（课本 8/9、13/18、7/15） */
export const MACHINE = ['8/9', '13/18', '7/15']
function qMachine(d: Difficulty, rng: RNG): Question {
  const a = rng.pick(MACHINE)
  const src = `${a} + 1/9 - 1/3`
  return fracQ(K3, d, `machine-${a}`, [T('m5.fadd.calc'), E(`${src} = ?`)], evalF(src), mixedErrors(src), rng)
}
/** 练习二十五 9*：每个正方形四个角上的数加起来是 1（课本的圆圈图改成算式）：3/10 + 1/4 + 1/20 + ? = 1 等 */
export const SQUARES: { e: string; ans: Frac }[] = [
  { e: '3/10 + 1/4 + 1/20 + ? = 1', ans: [2, 5] },
  { e: '? + 1/5 + 2/5 + 3/10 = 1', ans: [1, 10] },
  { e: '? + 1/10 + 3/10 + 1/4 = 1', ans: [7, 20] },
  { e: '1/10 + ? + 1/4 + 1/5 = 1', ans: [9, 20] },
  { e: '1/4 + 1/5 + 2/5 + ? = 1', ans: [3, 20] },
]
function qSquares(d: Difficulty, rng: RNG): Question {
  const q = rng.pick(SQUARES)
  const nums = (q.e.split('=')[0]!.match(/\d+\/\d+/g) ?? []).map(parseF)
  const sum = nums.reduce((s, f) => plus(s, f))
  return fracQ(K3, d, `square-${q.e}`, [T('m5.fadd.squares'), E(q.e)], q.ans, [sum, [1, 20], plus(q.ans, [1, 20])], rng)
}
/** 思考：七巧板拼成的正方形（边长 4 格）：1、2 号大三角形各 1/4，3、5 号小三角形各 1/16，4 号正方形、6 号平行四边形、7 号中三角形各 1/8 */
export const TANGRAM: { no: number; pts: [number, number][]; part: Frac; tone: 'a' | 'b' | 'c' | 'd' | 'soft' }[] = [
  { no: 1, pts: [[0, 0], [0, 4], [2, 2]], part: [1, 4], tone: 'a' },
  { no: 2, pts: [[0, 4], [4, 4], [2, 2]], part: [1, 4], tone: 'd' },
  { no: 3, pts: [[2, 2], [3, 1], [3, 3]], part: [1, 16], tone: 'soft' },
  { no: 4, pts: [[1, 1], [2, 0], [3, 1], [2, 2]], part: [1, 8], tone: 'c' },
  { no: 5, pts: [[0, 0], [2, 0], [1, 1]], part: [1, 16], tone: 'b' },
  { no: 6, pts: [[3, 1], [4, 2], [4, 4], [3, 3]], part: [1, 8], tone: 'a' },
  { no: 7, pts: [[2, 0], [4, 0], [4, 2]], part: [1, 8], tone: 'b' },
]
function tangramFig(): StemPart {
  const s = 40
  const items: GeoItem[] = TANGRAM.map((p) => ({ t: 'poly', pts: p.pts.map(([x, y]) => [8 + x * s, 8 + y * s] as [number, number]), fill: p.tone }))
  for (const p of TANGRAM) {
    const cx = p.pts.reduce((a, [x]) => a + x, 0) / p.pts.length
    const cy = p.pts.reduce((a, [, y]) => a + y, 0) / p.pts.length
    items.push({ t: 'text', at: [8 + cx * s, 8 + cy * s], text: String(p.no), badge: true })
  }
  return { kind: 'geo', figs: [{ w: 4 * s + 16, h: 4 * s + 16, items }], alt: '七巧板拼成的正方形：1、2 号是大三角形，3、5 号是小三角形，4 号是正方形，6 号是平行四边形，7 号是中等大的三角形' }
}
export const TANGRAM_ASK: number[][] = [[1], [4], [3], [7], [6], [7, 4], [3, 4, 5], [1, 5], [2, 6]]
function qTangram(d: Difficulty, rng: RNG): Question {
  const ask = rng.pick(TANGRAM_ASK)
  const parts = ask.map((no) => TANGRAM.find((p) => p.no === no)!.part)
  const value = parts.reduce((s, f) => plus(s, f))
  const nos = ask.join('、')
  const key = ask.length === 1 ? 'm5.fadd.tg.one' : 'm5.fadd.tg.some'
  return fracQ(K3, d, `tangram-${ask.join('-')}`, [T(key, { n: nos }), tangramFig()], value, [[ask.length, 7], [1, 7], [1, 16], [1, 8], [1, 4], [3, 8]], rng)
}

function mixedGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1（植被表、两种通分、降水表、两种算法、运算顺序）、做一做 1、例 3 喝果汁
    if (roll < 0.14) return qForest(d, rng)
    if (roll < 0.22) return qOneShot(d, rng)
    if (roll < 0.34) return qRain(d, rng)
    if (roll < 0.42) return qTwoWays(d, rng)
    if (roll < 0.66) return qCalcMixed(d, rng)
    if (roll < 0.74) return qOrder(d, rng)
    return qJuice(d, rng)
  }
  if (d === 2) {
    // 练习二十五 1、2、3、5、6 与例题的变式
    if (roll < 0.28) return qCalcMixed(d, rng)
    if (roll < 0.42) return qWire(d, rng)
    if (roll < 0.52) return qVisit(d, rng)
    if (roll < 0.66) return qMachine(d, rng)
    if (roll < 0.86) return qJuice(d, rng)
    return qRain(d, rng)
  }
  // 第 3 档：9* 正方形四个角、七巧板、喝果汁的变式
  if (roll < 0.35) return qSquares(d, rng)
  if (roll < 0.7) return qTangram(d, rng)
  return qJuice(d, rng)
}
defineGenerator(K3, mixedGen)

// ══ 整数加法运算律推广到分数 ══

/** 例 2：交换律 3/7 + 2/5 = 2/5 + 3/7、结合律 (2/3 + 1/4) + 3/4 = 2/3 + (1/4 + 3/4)；同样的样子换课本里的数 */
export const LAW_TRIPLES: [string, string, string][] = [
  ['2/3', '1/4', '3/4'],
  ['1/6', '1/10', '9/10'],
  ['5/6', '1/12', '7/12'],
  ['2/5', '1/3', '3/5'],
  ['1/4', '1/3', '2/3'],
  ['9/7', '1/8', '3/8'],
]
function qWhichLaw(d: Difficulty, rng: RNG): Question {
  const law = (k: string): LStr => L(`m5.fadd.law.${k}`)
  const [a, b, c] = rng.pick(LAW_TRIPLES)
  const kind = d === 1 ? rng.int(0, 1) : rng.int(0, 2)
  if (kind === 0) {
    const [x, y] = rng.chance(0.5) ? ['3/7', '2/5'] : [a, b]
    return labelQuestion({ kpId: K4, type: 'law', difficulty: d, sig: `law-comm-${x}-${y}`, stem: [T('m5.fadd.law.q'), E(`${x} + ${y} = ${y} + ${x}`)], correct: law('comm'), distractors: [law('assoc'), law('mulComm')], rng })
  }
  if (kind === 1) {
    return labelQuestion({ kpId: K4, type: 'law', difficulty: d, sig: `law-assoc-${a}-${b}-${c}`, stem: [T('m5.fadd.law.q'), E(`(${a} + ${b}) + ${c} = ${a} + (${b} + ${c})`)], correct: law('assoc'), distractors: [law('comm'), law('mulComm')], rng })
  }
  // 练习二十五 7 的第三道：(1/12 + 1/4) + (5/12 + 3/4) = (1/12 + 5/12) + (1/4 + 3/4)：交换律和结合律
  return labelQuestion({ kpId: K4, type: 'law', difficulty: d, sig: 'law-both', stem: [T('m5.fadd.law.q'), E('(1/12 + 1/4) + (5/12 + 3/4)'), E('= (1/12 + 5/12) + (1/4 + 3/4)')], correct: law('both'), distractors: [law('comm'), law('assoc')], rng })
}
/** 例 2 的两组算式比一比（都相等）；再加几组不相等的（连减改成减去两数的差、减号搬丢了），免得永远选「=」 */
export const CMP_LAWS: [string, string][] = [
  ['3/7 + 2/5', '2/5 + 3/7'],
  ['(2/3 + 1/4) + 3/4', '2/3 + (1/4 + 3/4)'],
  ['5/6 + 1/12 + 7/12', '5/6 + (1/12 + 7/12)'],
  ['2/5 + 1/3 + 3/5', '2/5 + 3/5 + 1/3'],
  ['5/6 - 1/4 - 1/12', '5/6 - (1/4 + 1/12)'],
  ['5/6 - 1/4 - 1/12', '5/6 - (1/4 - 1/12)'],
  ['7/8 - 1/2 + 1/8', '7/8 - (1/2 + 1/8)'],
  ['3/4 + 1/2 - 1/4', '3/4 - 1/4 + 1/2'],
  ['3/4 + 1/2 - 1/4', '3/4 - (1/2 + 1/4)'],
]
function qCmpLaw(d: Difficulty, rng: RNG): Question {
  const pool = d === 1 ? CMP_LAWS.slice(0, 6) : CMP_LAWS
  const [a, b] = rng.pick(pool)
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a]
  return cmpQ(K4, d, `cmp-${x}|${y}`, x, y, rng, 'law')
}
/** 练习二十五 7：括号里填上适当的数（课本写「( )」，这里写「?」） */
export const BOX_LAWS: { e: string; ans: string; wrong: string[] }[] = [
  { e: '1/2 + 1/4 = ? + 1/2', ans: '1/4', wrong: ['1/2', '3/4'] },
  { e: '1/6 + 1/10 + 9/10 = 1/6 + (1/10 + ?)', ans: '9/10', wrong: ['1/6', '1/10'] },
  { e: '(1/12 + 1/4) + (5/12 + 3/4) = (1/12 + ?) + (1/4 + 3/4)', ans: '5/12', wrong: ['1/4', '3/4'] },
  { e: '3/7 + 2/5 = 2/5 + ?', ans: '3/7', wrong: ['2/5', '5/12'] },
  { e: '(2/3 + 1/4) + 3/4 = 2/3 + (? + 3/4)', ans: '1/4', wrong: ['2/3', '3/4'] },
]
function qBoxLaw(d: Difficulty, rng: RNG): Question {
  const q = rng.pick(BOX_LAWS)
  return labelQuestion({ kpId: K4, type: 'law', difficulty: d, sig: `box-${q.e}`, stem: [T('m5.fadd.what'), E(q.e)], correct: q.ans, distractors: q.wrong, rng })
}
/** 试着计算、做一做 2：用简便方法算（课本 5 道）+ 同样的样子：两个同分母的凑成整数，另一个分数加上去 */
export const EASY_BOOK = ['5/6 + 1/12 + 7/12', '2/5 + 1/3 + 3/5', '1/4 + 1/3 + 1/4 + 2/3', '9/7 + 1/8 + 3/8 + 5/7', '1/3 + 2/7 + 1/5 + 2/3']
function easyMade(rng: RNG): string {
  for (;;) {
    const n = rng.pick([3, 4, 5, 7, 8, 9])
    const a = rng.int(1, n - 1)
    const m = rng.pick([2, 3, 4, 5, 6, 8])
    const c = rng.int(1, m - 1)
    if (m === n || gcd(c, m) !== 1 || gcd(a, n) !== 1 || gcd(n - a, n) !== 1) continue
    return rng.chance(0.5) ? `${a}/${n} + ${c}/${m} + ${n - a}/${n}` : `${c}/${m} + ${a}/${n} + ${n - a}/${n}`
  }
}
function qEasy(d: Difficulty, rng: RNG): Question {
  const src = d === 1 ? (rng.chance(0.5) ? rng.pick(EASY_BOOK.slice(0, 4)) : easyMade(rng)) : rng.chance(0.4) ? EASY_BOOK[4]! : rng.pick([...EASY_BOOK, easyMade(rng)])
  const v = evalF(src)
  const nums = (src.match(/\d+\/\d+/g) ?? []).map(parseF)
  // 错法：凑成整数后把整数丢了、只加了凑整的那两个、分子分母分别相加
  const whole = nums.filter((f, i) => nums.some((g, j) => j !== i && g[1] === f[1] && f[0] + g[0] === f[1]))
  const rest = nums.filter((f) => !whole.includes(f))
  const cands: Frac[] = [rest.length ? rest.reduce((s, f) => plus(s, f)) : [1, 2], [nums.reduce((s, f) => s + f[0], 0), nums.reduce((s, f) => s + f[1], 0)], plus(v, [1, 1]), minus(v, [1, 2])]
  return fracQ(K4, d, `easy-${src}`, [T('m5.fadd.easy'), E(`${src} = ?`)], v, cands, rng, 'law')
}
/** 怎样算简便：先算哪两个数（同分母、能凑成整数的那两个） */
function qPartner(d: Difficulty, rng: RNG): Question {
  const src = rng.chance(0.4) ? rng.pick(['2/5 + 1/3 + 3/5', '5/6 + 1/12 + 7/12']) : easyMade(rng)
  const nums = src.split(' + ')
  const pair = nums.filter((f, i) => nums.some((g, j) => j !== i && parseF(g)[1] === parseF(f)[1]))
  const lone = nums.find((f) => !pair.includes(f))!
  const correct = `${pair[0]} + ${pair[1]}`
  return labelQuestion({ kpId: K4, type: 'law', difficulty: d, sig: `partner-${src}`, stem: [T('m5.fadd.partner'), E(src)], correct, distractors: [`${pair[0]} + ${lone}`, `${lone} + ${pair[1]}`], rng })
}
/** 练习二十五 8*：1 − 1/2 = 1/2，1/2 − 1/3 = 1/6……用发现算 1/2 + 1/6 + 1/12 + 1/20 = 1 − 1/5 = 4/5 */
export const SPLIT = ['1/2 - 1/3', '1/3 - 1/4', '1/4 - 1/5', '1/5 - 1/6', '1/2 + 1/6 + 1/12 + 1/20', '1/2 + 1/6 + 1/12', '1/2 + 1/6 + 1/12 + 1/20 + 1/30']
function qSplit(d: Difficulty, rng: RNG): Question {
  const src = rng.pick(SPLIT)
  const v = evalF(src)
  const nums = (src.match(/\d+\/\d+/g) ?? []).map(parseF)
  return fracQ(K4, d, `split-${src}`, [T('m5.fadd.calc'), E(`${src} = ?`)], v, [[nums.length, nums.reduce((s, f) => s + f[1], 0)], [1, nums[nums.length - 1]![1]], [1, 2], plus(v, [1, 10])], rng, 'law')
}

function lawsGen(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2：比一比、用的什么运算律、括号里填数、试着计算 / 做一做 2 的简便计算、先算哪两个数
    if (roll < 0.2) return qWhichLaw(d, rng)
    if (roll < 0.36) return qCmpLaw(d, rng)
    if (roll < 0.5) return qBoxLaw(d, rng)
    if (roll < 0.8) return qEasy(d, rng)
    return qPartner(d, rng)
  }
  if (d === 2) {
    if (roll < 0.35) return qEasy(d, rng)
    if (roll < 0.55) return qWhichLaw(d, rng)
    if (roll < 0.75) return qCmpLaw(d, rng)
    if (roll < 0.88) return qBoxLaw(d, rng)
    return qPartner(d, rng)
  }
  if (roll < 0.6) return qSplit(d, rng)
  return qEasy(d, rng)
}
defineGenerator(K4, lawsGen)
