import type { Difficulty, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { numberQuestion } from './common'

const PIC_ICONS = ['🍎', '🐶', '⭐', '🎈', '🍓', '🐟', '🌸', '🚗']

/**
 * 凑十法（20 以内进位加法，教材三节：9 加几 / 8、7、6 加几 / 5、4、3、2 加几）
 * d1：9 加几（凑十最直观的入口）
 * d2：8、7、6 加几
 * d3：5、4、3、2 加几（要把大数凑十）+ 体现凑十过程的连加（a + b + c，其中 a + b = 10）
 */
function genCarryAdd(d: Difficulty, rng: RNG): Question {
  if (d === 3 && rng.chance(0.3)) {
    const a = rng.int(6, 9)
    const c = rng.int(2, 9)
    return sumQuestion(d, [a, 10 - a, c], rng)
  }
  const a = d === 1 ? 9 : d === 2 ? rng.pick([8, 7, 6]) : rng.int(2, 5)
  const b = rng.int(11 - a, 9) // 保证进位：a + b ≥ 11
  return sumQuestion(d, [a, b], rng)
}

/** 连加题；两个加数时 40% 配十格阵图示（看图列式的直观形态），并带凑十演示。 */
function sumQuestion(d: Difficulty, operands: number[], rng: RNG): Question {
  const kpId = 's1-05-carry-add'
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

defineGenerator('s1-05-carry-add', genCarryAdd)

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
  /** 看图列式：两行实物（只画加法） */
  pic?: boolean
  /** 笔算：算式下面再画竖式 */
  vertical?: boolean
  explain?: Question['explain']
}): Question {
  const value = opts.op === '+' ? opts.a + opts.b : opts.a - opts.b
  const stem: StemPart[] = []
  let type: Question['type'] = 'arith'
  // 看图列式只画加法，且两行都得有实物（0 个画出来是一行空白，孩子没法看图）
  if (opts.pic && opts.op === '+' && opts.a > 0 && opts.b > 0) {
    const icon = opts.rng.pick(PIC_ICONS)
    type = 'pic-equation'
    stem.push({ kind: 'text', text: { k: 'q.countPicAll' } })
    stem.push({ kind: 'compare-rows', rows: [{ icon, count: opts.a }, { icon, count: opts.b }] })
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
 * 加减法的两个项：常规题两项都非零、减法不出「a - a」；
 * 约 15% 出「有关 0 的加减法」（a + 0、0 + a、a - 0、a - a），这是教材单独的一小节，但不能喧宾夺主。
 * （若按「a 随机、b 在余量里随机」取，+0 / -0 / a-a 会占到四成以上。）
 */
function addSubTerms(cap: number, op: '+' | '-', rng: RNG): [number, number] {
  if (rng.chance(0.15)) {
    const a = rng.int(1, cap)
    if (op === '+') return rng.chance(0.5) ? [a, 0] : [0, a]
    return rng.chance(0.5) ? [a, 0] : [a, a]
  }
  if (op === '+') {
    const a = rng.int(1, cap - 1)
    return [a, rng.int(1, cap - a)]
  }
  const a = rng.int(2, cap)
  return [a, rng.int(1, a - 1)]
}

// ── 分与合 ──
function decomposeQuestion(kpId: string, d: Difficulty, total: number, rng: RNG): Question {
  const part = rng.int(1, total - 1)
  const value = total - part
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `de-${total}-${part}`,
    stem: [{ kind: 'text', text: { k: 'q.decompose', p: { total, part } } }],
    value,
    rng,
    min: 0,
    max: total,
    smart: [part, total, value + 1, value - 1],
  })
}

// 5 以内分与合
defineGenerator('s1-01-compose-5', (d, rng) => {
  const total = d === 1 ? rng.pick([3, 4]) : d === 2 ? 5 : rng.int(3, 5)
  if (rng.chance(0.5)) return decomposeQuestion('s1-01-compose-5', d, total, rng)
  const a = rng.int(1, total - 1)
  return twoTermQuestion({ kpId: 's1-01-compose-5', difficulty: d, a, op: '+', b: total - a, rng, max: 5 })
})

// 5 以内加减法
defineGenerator('s1-01-addsub-5', (d, rng) => {
  const op: '+' | '-' = rng.chance(0.5) ? '+' : '-'
  const [a, b] = addSubTerms(5, op, rng)
  return twoTermQuestion({ kpId: 's1-01-addsub-5', difficulty: d, a, op, b, rng, max: 5, pic: rng.chance(0.35) })
})

// 6~10 的组成（教材：6、7 的组成 → 8、9 的组成 → 10 的认识）；10 的组成是凑十的基础，各档都常出
defineGenerator('s1-02-compose-10', (d, rng) => {
  const total = d === 1 ? rng.pick([6, 7, 10]) : d === 2 ? rng.pick([8, 9, 10]) : rng.int(6, 10)
  return decomposeQuestion('s1-02-compose-10', d, total, rng)
})

// 10 以内加减法
defineGenerator('s1-02-addsub-10', (d, rng) => {
  const cap = d === 1 ? 6 : 10
  const op: '+' | '-' = rng.chance(0.5) ? '+' : '-'
  const [a, b] = addSubTerms(cap, op, rng)
  return twoTermQuestion({ kpId: 's1-02-addsub-10', difficulty: d, a, op, b, rng, max: 10, pic: rng.chance(0.3) })
})

// 连加连减
defineGenerator('s1-02-mixed', (d, rng) => {
  // 保证每一步都落在 1~10 之间（中间结果先控制在 1~9，再 ±c 不超过 10）
  const a = rng.int(2, 6)
  const useAdd2 = rng.chance(0.55)
  const b = useAdd2 ? rng.int(1, 9 - a) : rng.int(1, a - 1)
  const mid = useAdd2 ? a + b : a - b
  const addLast = rng.chance(0.5)
  const c = addLast ? rng.int(1, 10 - mid) : rng.int(1, mid)
  const value = addLast ? mid + c : mid - c
  const op1 = useAdd2 ? '+' : '-'
  const op2 = addLast ? '+' : '-'
  return numberQuestion({
    kpId: 's1-02-mixed',
    type: 'arith',
    difficulty: d,
    sig: `mx-${a}${op1}${b}${op2}${c}`,
    stem: [{ kind: 'expr', expr: `${a} ${op1} ${b} ${op2} ${c} = ?` }],
    value,
    rng,
    min: 0,
    max: 10,
    smart: [value + 1, value - 1, mid],
  })
})

// 简单加、减法（11~20 的认识）：10 加几、十几减整十、十几减个位
defineGenerator('s1-04-simple-addsub', (d, rng) => {
  const roll = rng.next()
  if (d === 1 || roll < 0.5) {
    const b = rng.int(1, 9)
    return twoTermQuestion({ kpId: 's1-04-simple-addsub', difficulty: d, a: 10, op: '+', b, rng, max: 20 })
  }
  const t = rng.int(1, 9)
  const minuend = 10 + t
  if (roll < 0.75) {
    // 十几 - 整十 = 个位
    return twoTermQuestion({ kpId: 's1-04-simple-addsub', difficulty: d, a: minuend, op: '-', b: 10, rng, max: 20 })
  }
  // 十几 - 个位 = 10
  return twoTermQuestion({ kpId: 's1-04-simple-addsub', difficulty: d, a: minuend, op: '-', b: t, rng, max: 20 })
})

// ── 破十法（20 以内退位减法）──
function genBorrowSub(d: Difficulty, rng: RNG): Question {
  // 个位不够减才需要退位：units(minuend) < subtrahend
  // 教材三节：十几减 9 / 十几减 8、7、6 / 十几减 5、4、3、2
  const subtrahend = d === 1 ? 9 : d === 2 ? rng.pick([8, 7, 6]) : rng.int(2, 5)
  const units = rng.int(1, subtrahend - 1) // 个位 1~(减数-1)：既是十几，又保证退位
  const minuend = 10 + units
  const value = minuend - subtrahend
  const usePic = rng.chance(0.35)
  const stem: StemPart[] = []
  let type: Question['type'] = 'arith'
  if (usePic) {
    type = 'pic-equation'
    stem.push({ kind: 'text', text: { k: 'q.breakTenHint' } })
    stem.push({ kind: 'tenframe', filled: 10, extra: units })
  }
  stem.push({ kind: 'expr', expr: `${minuend} - ${subtrahend} = ?` })
  const q = numberQuestion({
    kpId: 's2-02-borrow-sub',
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
defineGenerator('s2-02-borrow-sub', genBorrowSub)
