import type { Difficulty, LParam, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { labelQuestion, numberQuestion } from './common'

const PIC_ICONS = ['🍎', '🐶', '⭐', '🎈', '🍓', '🐟', '🌸', '🚗']
/** 文字题里的东西：都是论「个」的（别写「只」——「数字 + 只」朗读容易读错） */
export const WORD_ITEMS = ['🍎', '🍐', '🍑', '🍊', '🎈', '🍪', '🎁', '⚽', '🏀']
/** 文字题里的人物 */
export const WORD_NAMES = ['🐰', '🐶', '🐱', '🐼', '🦊', '🐷']

/** 比大小的答案：x 与 y 比 */
function cmp(x: number, y: number): '>' | '<' | '=' {
  return x > y ? '>' : x < y ? '<' : '='
}

/** 算式和一个数比大小（课本「9 + 5 ○ 15」「10 + 7 ○ 14」）：○ 读「和」，题目要求是「比一比，填 >、< 或 =」（G9） */
export function exprCompareQuestion(kpId: string, d: Difficulty, expr: string, value: number, rng: RNG): Question {
  const n = rng.chance(0.2) ? value : value + rng.pick([-2, -1, 1, 2])
  const correct = cmp(value, n)
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty: d,
    sig: `ec-${expr}-${n}`,
    stem: [
      { kind: 'text', text: { k: 'q.fillCompare' } },
      { kind: 'expr', expr: `${expr} ○ ${n}` },
    ],
    correct,
    distractors: ['>', '<', '='].filter((s) => s !== correct),
    rng,
  })
}

// ─────────────────────────────────────────────────────────────
// 20 以内的进位加法（一上第五单元），课本三个小节：9 加几（p89）/ 8、7、6 加几（p91）/ 5、4、3、2 加几（p93），
// 每个小节一个知识点；例 5、例 6 的解决问题（p96–98）并进各小节，用这一节的加数出。
// d1：这一节的全部算式（40% 配十格阵）+ 约 20% 解决问题；
// d2：凑十的连加（9 + 1 + 4、7 + 3 + 3，各节「做一做」）、算式和数比大小（p90 / p95）、填未知加数（p95「6 + □ = 15」）、
//     解决问题；「5、4、3、2 加几」另有找得数是几的卡片（p93 数学游戏）；d3 混合。
// ─────────────────────────────────────────────────────────────

/** 第一个加数是 firsts 里的数、和满十的全部加法：a + b ≥ 11，b ≤ 9 */
function carryPairs(firsts: number[]): [number, number][] {
  const out: [number, number][] = []
  for (const a of firsts) for (let b = 11 - a; b <= 9; b++) out.push([a, b])
  return out
}
const ALL_CARRY = carryPairs([2, 3, 4, 5, 6, 7, 8, 9])

/** 进位加法的解决问题（a、b 两部分，求一共 / 原来）：例 5 前排后排（p96）、例 6 领走了剩下（p97）、又拿来（p94 练一练 4） */
function carryWord(kpId: string, d: Difficulty, a: number, b: number, rng: RNG): Question {
  const item = rng.pick(WORD_ITEMS)
  const key = rng.pick(['q.wpRows', 'q.wpTookLeft', 'q.wpCome'])
  const q = numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `wp-${key}-${a}-${b}-${item}`,
    stem: [{ kind: 'text', text: { k: key, p: { a, b, item } } }],
    value: a + b,
    rng,
    min: 1,
    max: 20,
    smart: [a + b - 10, a + b + 1, a + b - 1, Math.abs(a - b)],
  })
  q.explain = { kind: 'make-ten', a, b }
  return q
}

/** 找得数是 n 的卡片（p93 数学游戏）：四张加法卡片，只有一张的和是 n */
function findSumQuestion(kpId: string, d: Difficulty, a: number, b: number, rng: RNG): Question {
  const n = a + b
  const others = rng.shuffle(ALL_CARRY.filter(([x, y]) => x + y !== n))
  const picked: string[] = []
  for (const [x, y] of others) {
    if (picked.length >= 3) break
    if (picked.some((e) => eval2(e) === x + y)) continue // 干扰的三张得数也各不相同
    picked.push(`${x} + ${y}`)
  }
  return labelQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `card-${n}-${a}+${b}`,
    stem: [{ kind: 'text', text: { k: 'q.findSum', p: { n } } }],
    correct: `${a} + ${b}`,
    distractors: picked,
    rng,
  })
}
function eval2(e: string): number {
  const [x, y] = e.split(' + ').map(Number)
  return x! + y!
}

function makeCarryGen(kpId: string, firsts: number[], cards: boolean) {
  const pairs = carryPairs(firsts)
  return (d: Difficulty, rng: RNG): Question => {
    const [a, b] = rng.pick(pairs)
    const roll = rng.next()
    if (d === 1) return roll < 0.2 ? carryWord(kpId, d, a, b, rng) : sumQuestion(kpId, d, [a, b], rng)
    if (cards && roll < 0.15) return findSumQuestion(kpId, d, a, b, rng)
    if (roll < 0.35) return sumQuestion(kpId, d, [a, 10 - a, a + b - 10], rng) // 凑十的连加：9 + 1 + 4 = 9 + 5
    if (roll < 0.55) return exprCompareQuestion(kpId, d, `${a} + ${b}`, a + b, rng)
    if (roll < 0.75) return missingAddend(kpId, d, a, b, rng)
    if (roll < 0.9) return carryWord(kpId, d, a, b, rng)
    return sumQuestion(kpId, d, [a, b], rng)
  }
}

/** 填未知加数「a + ? = s」（p95 练一练 8；退位减法的「想加算减」也是这个样子） */
function missingAddend(kpId: string, d: Difficulty, a: number, b: number, rng: RNG): Question {
  const s = a + b
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `miss-${a}-${s}`,
    stem: [{ kind: 'expr', expr: `${a} + ? = ${s}` }],
    value: b,
    rng,
    min: 1,
    max: 20,
    smart: [s, b + 1, b - 1, s - 10],
  })
}

/** 加法算式；两个加数时 40% 配十格阵图示（看图列式的直观形态），并带凑十演示。 */
function sumQuestion(kpId: string, d: Difficulty, operands: number[], rng: RNG): Question {
  const value = operands.reduce((s, n) => s + n, 0)
  const expr = `${operands.join(' + ')} = ?`
  const [a, b] = operands
  const twoTerms = operands.length === 2
  const useTenFrame = twoTerms && rng.chance(0.4)
  const stem: StemPart[] = useTenFrame
    ? [
        { kind: 'text', text: { k: 'q.countDots' } },
        { kind: 'tenframe', filled: a!, extra: b! },
        { kind: 'expr', expr },
      ]
    : [{ kind: 'expr', expr }]
  const q = numberQuestion({
    kpId,
    type: useTenFrame ? 'pic-equation' : 'arith',
    difficulty: d,
    sig: operands.join('+'),
    stem,
    value,
    rng,
    min: 1,
    max: 20,
  })
  if (twoTerms) q.explain = { kind: 'make-ten', a: a!, b: b! }
  return q
}

defineGenerator('s1-05-carry-add', makeCarryGen('s1-05-carry-add', [9], false))
defineGenerator('s1-05-add-876', makeCarryGen('s1-05-add-876', [8, 7, 6], false))
defineGenerator('s1-05-add-5432', makeCarryGen('s1-05-add-5432', [5, 4, 3, 2], true))

// ─────────────────────────────────────────────────────────────
// 通用两项加减题（5/10 以内、10 加几、100 以内口算 / 笔算共用）
// ─────────────────────────────────────────────────────────────
export function twoTermQuestion(opts: {
  kpId: string
  difficulty: Difficulty
  a: number
  op: '+' | '-'
  b: number
  rng: RNG
  max: number
  /** 看图列式：加法画两行实物，减法画十格阵里划掉减数（课本一上 p26–27 的「划掉」图） */
  pic?: boolean
  /** 笔算：算式下面再画竖式 */
  vertical?: boolean
  explain?: Question['explain']
}): Question {
  const value = opts.op === '+' ? opts.a + opts.b : opts.a - opts.b
  const stem: StemPart[] = []
  let type: Question['type'] = 'arith'
  // 加法两行都得有实物（0 个画出来是一行空白，孩子没法看图）
  if (opts.pic && opts.op === '+' && opts.a > 0 && opts.b > 0) {
    const icon = opts.rng.pick(PIC_ICONS)
    type = 'pic-equation'
    stem.push({ kind: 'text', text: { k: 'q.countPicAll' } })
    stem.push({ kind: 'compare-rows', rows: [{ icon, count: opts.a }, { icon, count: opts.b }] })
  }
  // 减法：十格阵里 a 个点，划掉 b 个，数剩下的（10 以内、真的拿走了几个、没有全拿走）
  if (opts.pic && opts.op === '-' && opts.a <= 10 && opts.b > 0 && opts.b < opts.a) {
    type = 'pic-equation'
    stem.push({ kind: 'text', text: { k: 'q.countPicLeft' } })
    stem.push({ kind: 'tenframe', filled: opts.a, taken: opts.b })
  }
  stem.push({ kind: 'expr', expr: `${opts.a} ${opts.op} ${opts.b} = ?` })
  if (opts.vertical) stem.push({ kind: 'vertical', a: opts.a, op: opts.op, b: opts.b })
  const q = numberQuestion({
    kpId: opts.kpId,
    type,
    difficulty: opts.difficulty,
    sig: `${opts.a}${opts.op}${opts.b}`,
    stem,
    value,
    rng: opts.rng,
    min: 0,
    max: opts.max,
    // 常见错误：进/退位算错 ±1、忘了进/退位（差 10）、加减混淆
    smart: [value + 1, value - 1, value + 10, value - 10, opts.op === '+' ? opts.a - opts.b : opts.a + opts.b],
  })
  if (opts.explain) q.explain = opts.explain
  return q
}

/**
 * 加减法的两个项，和（减法是被减数）在 lo~hi 里：常规题两项都非零、减法不出「a - a」；
 * 约 15% 出「有关 0 的加减法」（a + 0、0 + a、a - 0、a - a），这是教材单独的一小节，但不能喧宾夺主。
 * （若按「a 随机、b 在余量里随机」取，+0 / -0 / a-a 会占到四成以上。）
 */
function addSubTerms(lo: number, hi: number, op: '+' | '-', rng: RNG): [number, number] {
  if (rng.chance(0.15)) {
    const a = rng.int(Math.max(1, lo - 1), hi)
    if (op === '+') return rng.chance(0.5) ? [a, 0] : [0, a]
    return rng.chance(0.5) ? [a, 0] : [a, a]
  }
  const t = rng.int(Math.max(2, lo), hi)
  if (op === '+') {
    const a = rng.int(1, t - 1)
    return [a, t - a]
  }
  return [t, rng.int(1, t - 1)]
}

// ── 分与合（一上 p20–21、p39–41、p55）：「5 可以分成 2 和几」「3 和几组成 5」「2 和 7 组成几」──
function composeQuestion(kpId: string, d: Difficulty, total: number, rng: RNG): Question {
  const part = rng.int(1, total - 1)
  const rest = total - part
  const kind = rng.pick(['split', 'with', 'of'] as const)
  const text: LStr =
    kind === 'split'
      ? { k: 'q.decompose', p: { total, part } }
      : kind === 'with'
        ? { k: 'q.composeWith', p: { total, part } }
        : { k: 'q.composeOf', p: { a: part, b: rest } }
  const value = kind === 'of' ? total : rest
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `${kind}-${total}-${part}`,
    stem: [{ kind: 'text', text }],
    value,
    rng,
    min: 0,
    max: 10,
    smart: kind === 'of' ? [total + 1, total - 1, Math.abs(part - rest)] : [part, total, rest + 1, rest - 1],
  })
}

// 5 以内的分与合（p20–21）：主例是 5 的分与合，试一试 4，做一做还有 3 和 2；还没学加号（p24 才教），不出加法算式
defineGenerator('s1-01-compose-5', (d, rng) => {
  const total = d === 1 ? rng.pick([5, 5, 4, 4, 3, 2]) : d === 2 ? rng.pick([5, 4]) : rng.int(2, 5)
  return composeQuestion('s1-01-compose-5', d, total, rng)
})

// 5 以内的加、减法（1~5 的加、减法 p24–27，0 的认识和加、减法 p30）：加法画两行实物、减法画划掉的图
defineGenerator('s1-01-addsub-5', (d, rng) => {
  const op: '+' | '-' = rng.chance(0.5) ? '+' : '-'
  const [a, b] = addSubTerms(2, 5, op, rng)
  return twoTermQuestion({ kpId: 's1-01-addsub-5', difficulty: d, a, op, b, rng, max: 5, pic: rng.chance(0.35) })
})

// 6~10 的分与合（6、7 → 8、9 → 10，p39–41、p55）：每个数都在第 1 档
defineGenerator('s1-02-compose-10', (d, rng) => {
  const total = d === 2 ? rng.pick([8, 9, 10]) : rng.int(6, 10)
  return composeQuestion('s1-02-compose-10', d, total, rng)
})

/** 10 以内的解决问题（p45 例 2「一共有几」、p46 例 3 / p51 例 5「还剩几」）：两部分合起来用加法、去掉一部分用减法 */
function smallWord(kpId: string, d: Difficulty, a: number, op: '+' | '-', b: number, rng: RNG): Question {
  const item = rng.pick(WORD_ITEMS)
  const text: LStr = op === '+' ? { k: 'q.wpTotal', p: { a, b, item } } : { k: 'q.wpTakeAway', p: { n: a, b, item } }
  const value = op === '+' ? a + b : a - b
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `wp${op}-${a}-${b}-${item}`,
    stem: [{ kind: 'text', text }],
    value,
    rng,
    min: 0,
    max: 10,
    smart: [op === '+' ? Math.abs(a - b) : a + b, value + 1, value - 1],
  })
}

// 10 以内的加、减法（6 和 7、8 和 9、10 的加、减法，p44–58）：第 1 档的和 / 被减数就是 6~10，约四分之一是解决问题
defineGenerator('s1-02-addsub-10', (d, rng) => {
  const kpId = 's1-02-addsub-10'
  const op: '+' | '-' = rng.chance(0.5) ? '+' : '-'
  if (rng.chance(0.25)) {
    const t = rng.int(6, 10)
    const part = rng.int(1, t - 1)
    return op === '+' ? smallWord(kpId, d, part, '+', t - part, rng) : smallWord(kpId, d, t, '-', part, rng)
  }
  const [a, b] = addSubTerms(d === 1 ? 6 : 2, 10, op, rng)
  // 第 2 档：填未知加数（p57「1 + □ = 10」）、算式和数比大小（p66「3 + 6 ○ 9」）
  if (d > 1 && op === '+' && a > 0 && b > 0) {
    const roll = rng.next()
    if (roll < 0.2) return missingAddend(kpId, d, a, b, rng)
    if (roll < 0.4) return exprCompareQuestion(kpId, d, `${a} + ${b}`, a + b, rng)
  }
  return twoTermQuestion({ kpId, difficulty: d, a, op, b, rng, max: 10, pic: rng.chance(0.3) })
})

// 连加、连减（p59）和加减混合（p60）：第一个数到 10（课本 8 - 2 - 2、10 - 3 - □、10 - 6 + 5），每一步都在 0~10；
// 约四分之一配情境（小鸡先跑来 2 只、又跑来 1 只；天鹅飞来飞走——这里说成「先拿来 / 拿走几个，又拿来 / 拿走几个」）
defineGenerator('s1-02-mixed', (d, rng) => {
  const a = rng.int(2, 10)
  const useAdd2 = a <= 8 && rng.chance(0.5)
  const b = useAdd2 ? rng.int(1, 9 - a) : rng.int(1, a - 1)
  const mid = useAdd2 ? a + b : a - b
  const addLast = rng.chance(0.5)
  const c = addLast ? rng.int(1, 10 - mid) : rng.int(1, mid)
  const value = addLast ? mid + c : mid - c
  const op1 = useAdd2 ? '+' : '-'
  const op2 = addLast ? '+' : '-'
  const stem: StemPart[] = []
  let sig = `mx-${a}${op1}${b}${op2}${c}`
  if (rng.chance(0.25)) {
    const item = rng.pick(WORD_ITEMS)
    sig += `-${item}`
    stem.push({ kind: 'text', text: { k: 'q.mixStory', p: { a, b, c, item, v1: { k: useAdd2 ? 'q.verbIn' : 'q.verbOut' }, v2: { k: addLast ? 'q.verbIn' : 'q.verbOut' } } } })
  }
  stem.push({ kind: 'expr', expr: `${a} ${op1} ${b} ${op2} ${c} = ?` })
  return numberQuestion({
    kpId: 's1-02-mixed',
    type: 'arith',
    difficulty: d,
    sig,
    stem,
    value,
    rng,
    min: 0,
    max: 10,
    smart: [value + 1, value - 1, mid],
  })
})

// 简单的加、减法（11~20 的认识，p81–84）：例 4 的 10 + 3、13 - 3、13 - 10，例 5 的 11 + 2、13 - 2（不进位、不退位），
// 例 6 的「排第 10 和排第 15 之间有几人」；第 2 档另有算式和数比大小（p84「10 + 7 ○ 14」）
defineGenerator('s1-04-simple-addsub', (d, rng) => {
  const kpId = 's1-04-simple-addsub'
  const roll = rng.next()
  const t = rng.int(1, 9)
  if (d > 1 && roll < 0.25) {
    const a = 10 + rng.int(0, 7)
    const b = rng.int(1, 19 - a)
    const plus = rng.chance(0.5)
    return plus ? exprCompareQuestion(kpId, d, `${a} + ${b}`, a + b, rng) : exprCompareQuestion(kpId, d, `${a + b} - ${b}`, a, rng)
  }
  if (roll < 0.12) return twoTermQuestion({ kpId, difficulty: d, a: 10, op: '+', b: t, rng, max: 20 })
  if (roll < 0.18) return twoTermQuestion({ kpId, difficulty: d, a: t, op: '+', b: 10, rng, max: 20 })
  if (roll < 0.32) return twoTermQuestion({ kpId, difficulty: d, a: 10 + t, op: '-', b: t, rng, max: 20 })
  if (roll < 0.46) return twoTermQuestion({ kpId, difficulty: d, a: 10 + t, op: '-', b: 10, rng, max: 20 })
  if (roll < 0.66) {
    // 十几加几（个位相加不满十）
    const o = rng.int(1, 8)
    return twoTermQuestion({ kpId, difficulty: d, a: 10 + o, op: '+', b: rng.int(1, 9 - o), rng, max: 20 })
  }
  if (roll < 0.86) {
    // 十几减几（个位够减，得数还是十几）
    const o = rng.int(2, 9)
    return twoTermQuestion({ kpId, difficulty: d, a: 10 + o, op: '-', b: rng.int(1, o - 1), rng, max: 20 })
  }
  // 例 6：之间有几个
  const [n1, n2] = rng.shuffle(WORD_NAMES).slice(0, 2) as [string, string]
  const a = rng.int(1, 15)
  const b = rng.int(a + 2, Math.min(20, a + 9))
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `between-${a}-${b}`,
    stem: [{ kind: 'text', text: { k: 'q.between', p: { a1: n1, a2: n2, a, b } } }],
    value: b - a - 1,
    rng,
    min: 0,
    max: 20,
    smart: [b - a, b - a + 1, b - a - 2],
  })
})

// ─────────────────────────────────────────────────────────────
// 20 以内的退位减法（一下第二单元），课本三个小节：十几减 9（p9）/ 十几减 8、7、6（p12）/ 十几减 5、4、3、2（p16），
// 每个小节一个知识点；例 5 的解决问题（p17–19：一共几个、其中一部分几个、另一部分几个）并进各小节，用这一节的减数出。
// d1：这一节的全部算式（35% 配十格阵）+ 想加算减（p9「想：9 加几等于 15」、p13「7 + □ = 11」）+ 约四分之一解决问题；
// d2 同样几种，解决问题里偶尔多一句没用的信息（例 5「4 个人」）。10 减几不算退位，不出。
// ─────────────────────────────────────────────────────────────

/** 减数是 subs 里的数、个位不够减的全部十几减几 [被减数, 减数] */
function borrowPairs(subs: number[]): [number, number][] {
  const out: [number, number][] = []
  for (const s of subs) for (let u = 1; u < s; u++) out.push([10 + u, s])
  return out
}

/** 想加算减：「算 15 减 9，可以想：」配「9 + ? = 15」（课本 p9「想：9 加几等于 15？」；算式本身就读成「9 加几等于 15」，题目要求不再重复） */
function thinkAdd(kpId: string, d: Difficulty, minuend: number, subtrahend: number, rng: RNG): Question {
  const value = minuend - subtrahend
  const q = numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `think-${minuend}-${subtrahend}`,
    stem: [
      { kind: 'text', text: { k: 'q.thinkAdd', p: { b: subtrahend, n: minuend } } },
      { kind: 'expr', expr: `${subtrahend} + ? = ${minuend}` },
    ],
    value,
    rng,
    min: 0,
    max: 20,
    smart: [value + 1, value - 1, minuend, minuend - 10],
  })
  q.explain = { kind: 'break-ten', minuend, subtrahend }
  return q
}

/** 退位减法的解决问题：还剩几个（例 1、例 2）、求另一部分（例 3、例 5、练一练）；extra = 多一句没用的信息 */
function borrowWord(kpId: string, d: Difficulty, minuend: number, subtrahend: number, rng: RNG, extra: boolean): Question {
  const item = rng.pick(WORD_ITEMS)
  const [a1, a2] = rng.shuffle(WORD_NAMES).slice(0, 2) as [string, string]
  const kind = extra ? 'q.wpPartExtra' : rng.pick(['q.wpGive', 'q.wpTakeAway', 'q.wpPart'])
  const p: Record<string, LParam> & { item: string } =
    kind === 'q.wpPartExtra'
      ? { m: rng.int(3, 5), n: minuend, b: subtrahend, item: '🪁' }
      : kind === 'q.wpPart'
        ? { a1, a2, n: minuend, b: subtrahend, item }
        : { n: minuend, b: subtrahend, item }
  const value = minuend - subtrahend
  const q = numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `wp-${kind}-${minuend}-${subtrahend}-${p.item}`,
    stem: [{ kind: 'text', text: { k: kind, p } }],
    value,
    rng,
    min: 0,
    max: 20,
    smart: [minuend + subtrahend, value + 1, value - 1, 10 - subtrahend],
  })
  q.explain = { kind: 'break-ten', minuend, subtrahend }
  return q
}

function makeBorrowGen(kpId: string, subs: number[]) {
  const pairs = borrowPairs(subs)
  return (d: Difficulty, rng: RNG): Question => {
    const [minuend, subtrahend] = rng.pick(pairs)
    const roll = rng.next()
    if (roll < (d === 1 ? 0.6 : 0.4)) return borrowExpr(kpId, d, minuend, subtrahend, rng)
    if (roll < (d === 1 ? 0.75 : 0.6)) return thinkAdd(kpId, d, minuend, subtrahend, rng)
    return borrowWord(kpId, d, minuend, subtrahend, rng, d > 1 && rng.chance(0.25))
  }
}

/** 十几减几的算式；35% 配十格阵（G5：格里划掉减数，剩下的加外面的） */
function borrowExpr(kpId: string, d: Difficulty, minuend: number, subtrahend: number, rng: RNG): Question {
  const units = minuend - 10
  const value = minuend - subtrahend
  const usePic = rng.chance(0.35)
  const stem: StemPart[] = []
  let type: Question['type'] = 'arith'
  if (usePic) {
    type = 'pic-equation'
    // 图要把「减」画出来（2026-09-22 用户说只画 10 + 个位看不明白）：格里划掉减数那几个，只留剩下的亮着，加外面的就是答案
    stem.push({ kind: 'text', text: { k: 'q.breakTenHint', p: { n: subtrahend } } })
    stem.push({ kind: 'tenframe', filled: 10, extra: units, taken: subtrahend })
  }
  stem.push({ kind: 'expr', expr: `${minuend} - ${subtrahend} = ?` })
  const q = numberQuestion({
    kpId,
    type,
    difficulty: d,
    sig: `bs-${minuend}-${subtrahend}`,
    stem,
    value,
    rng,
    min: 0,
    max: 20,
    smart: [value + 1, value - 1, units + subtrahend, 10 - subtrahend],
  })
  q.explain = { kind: 'break-ten', minuend, subtrahend }
  return q
}

defineGenerator('s2-02-borrow-sub', makeBorrowGen('s2-02-borrow-sub', [9]))
defineGenerator('s2-02-sub-876', makeBorrowGen('s2-02-sub-876', [8, 7, 6]))
defineGenerator('s2-02-sub-5432', makeBorrowGen('s2-02-sub-5432', [5, 4, 3, 2]))
