import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 混合运算（三上二）：只有加减或只有乘除（从左往右）、先乘除后加减、有括号先算括号里的、解决多步计算的实际问题。
// 课本的范围：加减到三位数（结果 < 1000）；乘、除全在乘法口诀内、都整除，没有余数、没有负的中间结果。
// 算式里的减号用 ASCII「-」（朗读按运算符读「减」），括号用「( )」（读「括号」）。
// ─────────────────────────────────────────────────────────────

/** 一道算式题：题干「算式 = ?」，数字键盘或选项 */
function exprQ(kpId: string, d: Difficulty, expr: string, value: number, rng: RNG, smart: number[]): Question {
  return numberQuestion({
    kpId,
    type: 'mixed-ops',
    difficulty: d,
    sig: expr.replace(/\s+/g, ''),
    stem: [{ kind: 'expr', expr: `${expr} = ?` }],
    value,
    rng,
    min: 0,
    max: 999,
    smart: smart.filter((x) => Number.isInteger(x) && x >= 0 && x !== value),
  })
}

/** 口诀内的一道乘法：a × b（2–9） */
function tableMul(rng: RNG): [number, number, number] {
  const a = rng.int(2, 9)
  const b = rng.int(2, 9)
  return [a, b, a * b]
}
/** 口诀内的一道除法：p ÷ a = q（a、q 2–9） */
function tableDiv(rng: RNG): [number, number, number] {
  const a = rng.int(2, 9)
  const q = rng.int(2, 9)
  return [a * q, a, q]
}

// ── 只有加减或只有乘除：从左往右 ──

/** a ± b ± c：第 1 档约三分之二两位数（结果 0–100）、三分之一三位数（做一做 120 + 40 - 51），第 2 档起三位数（结果 < 1000） */
function addSubChain(d: Difficulty, rng: RNG): { expr: string; value: number; wrong: number; first: number } {
  const big = d >= 2 || rng.chance(0.35)
  for (;;) {
    const a = big ? rng.int(100, 500) : rng.int(20, 90)
    const op1 = rng.chance(0.5) ? '+' : '-'
    const b = op1 === '+' ? rng.int(big ? 20 : 5, big ? 400 : 99 - a < 5 ? 5 : 99 - a) : rng.int(big ? 10 : 3, a - (big ? 20 : 3))
    const mid = op1 === '+' ? a + b : a - b
    const op2 = rng.chance(0.5) ? '+' : '-'
    const c = op2 === '+' ? rng.int(big ? 10 : 2, Math.max(big ? 10 : 2, (big ? 999 : 100) - mid)) : rng.int(big ? 10 : 2, Math.max(big ? 10 : 2, mid))
    const value = op2 === '+' ? mid + c : mid - c
    if (value < 0 || value >= (big ? 1000 : 101) || mid <= 0) continue
    // 常见错误：先算了后面两个数（a − (b + c) 当成 a − b + c）
    const inner = op2 === '+' ? b + c : b - c
    const wrong = op1 === '+' ? a + inner : a - inner
    return { expr: `${a} ${op1} ${b} ${op2} ${c}`, value, wrong, first: mid }
  }
}

/** 口诀内的连乘除：a × b ÷ c、a ÷ b × c、a ÷ b ÷ c、a × b × c（中间结果都在口诀内） */
function mulDivChain(rng: RNG): { expr: string; value: number; wrong: number; first: number } {
  const kind = rng.int(0, 3)
  if (kind === 0) {
    // a ÷ b × c：15 ÷ 5 × 7
    const [p, b, q] = tableDiv(rng)
    const c = rng.int(2, 9)
    return { expr: `${p} ÷ ${b} × ${c}`, value: q * c, wrong: Number.isInteger(p / (b * c)) ? p / (b * c) : q + c, first: q }
  }
  if (kind === 1) {
    // a × b ÷ c：2 × 8 ÷ 4（积能被 c 整除、商在口诀内）
    for (;;) {
      const [a, b, p] = tableMul(rng)
      const cs = [2, 3, 4, 5, 6, 7, 8, 9].filter((c) => p % c === 0 && p / c <= 9 && p / c >= 1)
      if (!cs.length) continue
      const c = rng.pick(cs)
      return { expr: `${a} × ${b} ÷ ${c}`, value: p / c, wrong: Number.isInteger(b / c) ? a * (b / c) : a + b, first: p }
    }
  }
  if (kind === 2) {
    // a ÷ b ÷ c：56 ÷ 7 ÷ 2
    for (;;) {
      const c = rng.int(2, 4)
      const q = rng.int(1, 4)
      const b = rng.int(2, 9)
      const a = b * c * q
      if (a > 81 || c * q > 9) continue
      return { expr: `${a} ÷ ${b} ÷ ${c}`, value: q, wrong: Number.isInteger(a / (b / c)) ? a / (b / c) : q + 1, first: c * q }
    }
  }
  // a × b × c：2 × 2 × 5（积不超过 81）
  for (;;) {
    const a = rng.int(2, 5)
    const b = rng.int(2, 5)
    const c = rng.int(2, 9)
    if (a * b > 9 || a * b * c > 81) continue
    return { expr: `${a} × ${b} × ${c}`, value: a * b * c, wrong: a * b + c, first: a * b }
  }
}

function genInOrder(d: Difficulty, rng: RNG): Question {
  const kpId = 'm3s1-02-in-order'
  const roll = rng.next()
  if (d === 3 && roll < 0.35) return genCheck(kpId, d, rng)
  if (d >= 2 && roll < 0.55) {
    const c = rng.chance(0.5) ? addSubChain(d, rng) : mulDivChain(rng)
    return firstValueQ(kpId, d, c.expr, c.first, rng)
  }
  const c = d === 1 ? (rng.chance(0.55) ? addSubChain(1, rng) : mulDivChain(rng)) : rng.chance(0.6) ? addSubChain(d, rng) : mulDivChain(rng)
  return exprQ(kpId, d, c.expr, c.value, rng, [c.wrong, c.first, c.value + 10, c.value - 10])
}
defineGenerator('m3s1-02-in-order', genInOrder)

/** 第一步算出几（例 1、例 2「先说一说运算顺序」） */
function firstValueQ(kpId: string, d: Difficulty, expr: string, first: number, rng: RNG): Question {
  return numberQuestion({
    kpId,
    type: 'mixed-ops',
    difficulty: d,
    sig: `first-${expr.replace(/\s+/g, '')}`,
    stem: [{ kind: 'text', text: { k: 'm3.mix.firstValue' } }, { kind: 'expr', expr }],
    value: first,
    rng,
    min: 0,
    max: 999,
  })
}

/**
 * 改错（练习二 5）：给一串计算，问对不对。错的写法是没按从左往右、先算了后面两个数：
 * 36 − 13 + 7 = 36 − 20 = 16、18 ÷ 3 × 3 = 18 ÷ 9 = 2；对的写法先写第一步的结果。
 */
function genCheck(kpId: string, d: Difficulty, rng: RNG): Question {
  let expr: string
  let rightChain: string
  let wrongChain: string
  if (rng.chance(0.6)) {
    // a − b ± c（第二个数前面是减号，先算后面两个数就错了）
    const big = d >= 2 && rng.chance(0.5)
    for (;;) {
      const a = big ? rng.int(100, 500) : rng.int(30, 99)
      const b = rng.int(big ? 20 : 5, a - (big ? 30 : 10))
      const plus = rng.chance(0.5)
      const c = rng.int(2, plus ? 30 : Math.max(2, a - b - 1))
      const mid = a - b
      const value = plus ? mid + c : mid - c
      const inner = plus ? b + c : b - c
      const wrong = a - inner
      if (value < 0 || inner <= 0 || wrong < 0 || wrong === value) continue
      expr = `${a} - ${b} ${plus ? '+' : '-'} ${c}`
      rightChain = `${expr} = ${mid} ${plus ? '+' : '-'} ${c} = ${value}`
      wrongChain = `${expr} = ${a} - ${inner} = ${wrong}`
      break
    }
  } else {
    // a ÷ b × c，b × c 也在口诀内且能整除 a（18 ÷ 3 × 3）
    for (;;) {
      const [p, b, q] = tableDiv(rng)
      const c = rng.int(2, 9)
      if (b * c > 81 || p % (b * c) !== 0 || p / (b * c) === q * c) continue
      expr = `${p} ÷ ${b} × ${c}`
      rightChain = `${expr} = ${q} × ${c} = ${q * c}`
      wrongChain = `${expr} = ${p} ÷ ${b * c} = ${p / (b * c)}`
      break
    }
  }
  const right = rng.chance(0.4)
  return labelQuestion({
    kpId,
    type: 'mixed-ops',
    difficulty: d,
    sig: `check-${right ? 'r' : 'w'}-${expr.replace(/\s+/g, '')}`,
    stem: [{ kind: 'text', text: { k: 'm3.mix.check' } }, { kind: 'expr', expr: right ? rightChain : wrongChain }],
    correct: { k: right ? 'm3.opt.right' : 'm3.opt.wrong' },
    distractors: [{ k: right ? 'm3.opt.wrong' : 'm3.opt.right' }],
    rng,
  })
}

// ── 先乘除后加减 ──

interface Two {
  expr: string
  value: number
  /** 从左往右算（没先算乘除）的错误结果；算不出整数时是 NaN */
  wrong: number
  first: string
  firstValue: number
  /** 从左往右时先算的那一步（第一步算什么的干扰项） */
  firstWrong: string
}
function mulFirstExpr(d: Difficulty, rng: RNG): Two {
  const big = d >= 2
  for (;;) {
    // 第 1 档也有两个乘除式相加减（做一做 4 × 9 - 5 × 3，kind 4、5 约占三分之一）；a 有时是一位数（例 2 的 4 + 6 × 3）
    const kind = rng.int(0, 5)
    const a = big ? rng.int(100, 499) : rng.chance(0.25) ? rng.int(2, 9) : rng.int(10, 99)
    if (kind <= 1) {
      // a ± b × c / b × c ± a
      const [b, c, p] = tableMul(rng)
      const plus = rng.chance(0.5) || a < p
      const value = plus ? a + p : a - p
      if (kind === 0) {
        const wrong = plus ? (a + b) * c : (a - b) * c
        return { expr: `${a} ${plus ? '+' : '-'} ${b} × ${c}`, value, wrong, first: `${b} × ${c}`, firstValue: p, firstWrong: `${a} ${plus ? '+' : '-'} ${b}` }
      }
      // 乘积在前：减的时候乘积要比 a 大
      const plus1 = rng.chance(0.5) || p <= a
      const v2 = plus1 ? p + a : p - a
      return { expr: `${b} × ${c} ${plus1 ? '+' : '-'} ${a}`, value: v2, wrong: NaN, first: `${b} × ${c}`, firstValue: p, firstWrong: `${c} ${plus1 ? '+' : '-'} ${a}` }
    }
    if (kind <= 3) {
      // a ± p ÷ b（32 − 18 ÷ 2）
      const [p, b, q] = tableDiv(rng)
      const plus = rng.chance(0.5) || a < q
      const value = plus ? a + q : a - q
      const lr = plus ? a + p : a - p
      const wrong = lr > 0 && lr % b === 0 ? lr / b : NaN
      if (kind === 2) return { expr: `${a} ${plus ? '+' : '-'} ${p} ÷ ${b}`, value, wrong, first: `${p} ÷ ${b}`, firstValue: q, firstWrong: `${a} ${plus ? '+' : '-'} ${p}` }
      // 商在前（商 ≤ 9、a ≥ 10）：只能是加
      return { expr: `${p} ÷ ${b} + ${a}`, value: q + a, wrong: NaN, first: `${p} ÷ ${b}`, firstValue: q, firstWrong: `${b} + ${a}` }
    }
    // 两个乘除相加减：4 × 9 − 5 × 3、63 ÷ 9 + 8 × 4
    const div = rng.chance(0.5)
    const [x, y, p1] = div ? tableDiv(rng) : tableMul(rng)
    const op1 = div ? '÷' : '×'
    const [a2, b2, p2] = tableMul(rng)
    const plus = rng.chance(0.5) || p1 < p2
    const value = plus ? p1 + p2 : p1 - p2
    if (value < 0) continue
    return { expr: `${x} ${op1} ${y} ${plus ? '+' : '-'} ${a2} × ${b2}`, value, wrong: NaN, first: `${x} ${op1} ${y}`, firstValue: p1, firstWrong: `${y} ${plus ? '+' : '-'} ${a2}` }
  }
}

function genMulFirst(d: Difficulty, rng: RNG): Question {
  const kpId = 'm3s1-02-mul-first'
  const roll = rng.next()
  if (d <= 2 && roll < 0.25) {
    // 第一步算什么
    const e = mulFirstExpr(d, rng)
    return labelQuestion({
      kpId,
      type: 'mixed-ops',
      difficulty: d,
      sig: `step-${e.expr.replace(/\s+/g, '')}`,
      stem: [{ kind: 'text', text: { k: 'm3.mix.firstStep' } }, { kind: 'expr', expr: e.expr }],
      correct: e.first,
      distractors: [e.firstWrong],
      rng,
    })
  }
  if (d === 3 && roll < 0.35) return genCompare(kpId, d, rng)
  if (d === 3 && roll < 0.55) {
    // 改错：从左往右算的（7 + 14 ÷ 7 = 21 ÷ 7 = 3）
    for (;;) {
      const e = mulFirstExpr(1, rng)
      if (Number.isNaN(e.wrong) || e.wrong === e.value) continue
      const parts = e.expr.split(' ')
      const right = rng.chance(0.4)
      const lr = evalLR(Number(parts[0]), parts[1]!, Number(parts[2]))
      const shown = right ? `${e.expr} = ${parts[0]} ${parts[1]} ${e.firstValue} = ${e.value}` : `${e.expr} = ${lr} ${parts[3]} ${parts[4]} = ${e.wrong}`
      return labelQuestion({
        kpId,
        type: 'mixed-ops',
        difficulty: d,
        sig: `check-${right ? 'r' : 'w'}-${e.expr.replace(/\s+/g, '')}`,
        stem: [{ kind: 'text', text: { k: 'm3.mix.check' } }, { kind: 'expr', expr: shown }],
        correct: { k: right ? 'm3.opt.right' : 'm3.opt.wrong' },
        distractors: [{ k: right ? 'm3.opt.wrong' : 'm3.opt.right' }],
        rng,
      })
    }
  }
  const e = mulFirstExpr(d, rng)
  return exprQ(kpId, d, e.expr, e.value, rng, [e.wrong, e.firstValue, e.value + 10, e.value - 10])
}
function evalLR(a: number, op: string, b: number): number {
  return op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b
}
defineGenerator('m3s1-02-mul-first', genMulFirst)

/** ○ 里填 >、<、=（练习二 7）：左边一道先乘除后加减的算式，右边一个数（有时就是得数） */
function genCompare(kpId: string, d: Difficulty, rng: RNG): Question {
  const e = mulFirstExpr(1, rng)
  const delta = rng.pick([0, 0, rng.int(1, 9), -rng.int(1, 9)])
  const right = Math.max(0, e.value + delta)
  const correct = e.value > right ? '>' : e.value < right ? '<' : '='
  return labelQuestion({
    kpId,
    type: 'mixed-ops',
    difficulty: d,
    sig: `cmp-${e.expr.replace(/\s+/g, '')}-${right}`,
    stem: [{ kind: 'text', text: { k: 'm3.mix.compare' } }, { kind: 'expr', expr: `${e.expr} ○ ${right}` }],
    correct,
    distractors: ['>', '<', '='].filter((s) => s !== correct),
    rng,
  })
}

// ── 有括号先算括号里的 ──

interface Paren {
  expr: string
  value: number
  /** 不看括号、按先乘除后加减算的错误结果（算不出整数时 NaN） */
  wrong: number
  inner: number
}
function parenExpr(d: Difficulty, rng: RNG): Paren {
  const big = d >= 2
  for (;;) {
    // 第 1 档约四分之一是三位数的 a - (b ± c)（做一做 388 - (27 - 18)）
    const kind = big ? rng.int(0, 7) : rng.chance(0.25) ? rng.int(6, 7) : rng.int(0, 5)
    if (kind === 0 || kind === 1) {
      // (a ± b) × c：和 / 差在 2–9
      const inner = rng.int(2, 9)
      const c = rng.int(2, 9)
      const plus = kind === 0
      const a = plus ? rng.int(1, inner - 1) : inner + rng.int(1, 60)
      const b = plus ? inner - a : a - inner
      const wrong = plus ? a + b * c : a - b * c
      return { expr: `(${a} ${plus ? '+' : '-'} ${b}) × ${c}`, value: inner * c, wrong: wrong >= 0 ? wrong : NaN, inner }
    }
    if (kind === 2 || kind === 3) {
      // (a ± b) ÷ c：和 / 差是口诀内能整除的数（(25 + 15) ÷ 8）
      const [p, c, q] = tableDiv(rng)
      const plus = kind === 2
      const a = plus ? rng.int(1, p - 1) : p + rng.int(1, big ? 300 : 60)
      const b = plus ? p - a : a - p
      if (b <= 0) continue
      const w = plus ? a + b / c : a - b / c
      return { expr: `(${a} ${plus ? '+' : '-'} ${b}) ÷ ${c}`, value: q, wrong: Number.isInteger(w) && w >= 0 ? w : NaN, inner: p }
    }
    if (kind === 4) {
      // a ÷ (b × c)：56 ÷ (2 × 4)
      const b = rng.int(2, 4)
      const c = rng.int(2, 4)
      const q = rng.int(1, 9)
      const a = b * c * q
      if (b * c > 9 || a > 81) continue
      return { expr: `${a} ÷ (${b} × ${c})`, value: q, wrong: (a / b) * c, inner: b * c }
    }
    if (kind === 5) {
      // a × (b ÷ c)：4 × (49 ÷ 7)
      const [p, c, q] = tableDiv(rng)
      const a = rng.int(2, 9)
      return { expr: `${a} × (${p} ÷ ${c})`, value: a * q, wrong: Number.isInteger((a * p) / c) ? (a * p) / c : NaN, inner: q }
    }
    // 三位数：a − (b ± c)（388 − (27 − 18)、238 − (112 + 23)）
    const plus = kind === 6
    const b = rng.int(plus ? 50 : 20, plus ? 300 : 99)
    const c = plus ? rng.int(10, 99) : rng.int(5, b - 5)
    const inner = plus ? b + c : b - c
    const a = rng.int(Math.max(inner + 10, 100), 999)
    const wrong = plus ? a - b + c : a - b - c
    return { expr: `${a} - (${b} ${plus ? '+' : '-'} ${c})`, value: a - inner, wrong: wrong >= 0 ? wrong : NaN, inner }
  }
}

function genParens(d: Difficulty, rng: RNG): Question {
  const kpId = 'm3s1-02-parens'
  const roll = rng.next()
  if (d === 3 && roll < 0.35) return genWhichExpr(kpId, d, rng)
  if (d === 3 && roll < 0.6) return genMerge(kpId, d, rng)
  if (d >= 2 && roll < 0.2) {
    const p = parenExpr(d, rng)
    return firstValueQ(kpId, d, p.expr, p.inner, rng)
  }
  const p = parenExpr(d, rng)
  return exprQ(kpId, d, p.expr, p.value, rng, [p.wrong, p.inner, p.value + 1, p.value - 1])
}
defineGenerator('m3s1-02-parens', genParens)

/** 先算……再……，综合算式是哪一个（例 3「怎样表示才能先算 25 + 15 呢？」） */
function genWhichExpr(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [p, c] = tableDiv(rng)
    const a = rng.int(10, p - 1 > 10 ? p - 1 : 11)
    const b = p - a
    if (b <= 0) return genWhichExpr(kpId, d, rng)
    return labelQuestion({
      kpId,
      type: 'mixed-ops',
      difficulty: d,
      sig: `which-div-${a}-${b}-${c}`,
      stem: [{ kind: 'text', text: { k: 'm3.mix.addThenDiv', p: { a, b, c } } }],
      correct: `(${a} + ${b}) ÷ ${c}`,
      distractors: [`${a} + ${b} ÷ ${c}`, `${a} + (${b} ÷ ${c})`],
      rng,
    })
  }
  const c = rng.int(2, 9)
  const b = rng.int(2, 30)
  const a = b + rng.int(2, 9)
  return labelQuestion({
    kpId,
    type: 'mixed-ops',
    difficulty: d,
    sig: `which-mul-${a}-${b}-${c}`,
    stem: [{ kind: 'text', text: { k: 'm3.mix.subThenMul', p: { a, b, c } } }],
    correct: `(${a} - ${b}) × ${c}`,
    distractors: [`${a} - ${b} × ${c}`, `${a} - (${b} × ${c})`],
    rng,
  })
}

/** 把两个分步算式合并成一个综合算式（练习二 13）：54 + 9 = 63、63 ÷ 7 = 9 → (54 + 9) ÷ 7 */
function genMerge(kpId: string, d: Difficulty, rng: RNG): Question {
  const [p, c, q] = tableDiv(rng)
  const b = rng.int(2, Math.min(20, p - 1))
  const a = p - b
  if (a <= 0) return genMerge(kpId, d, rng)
  const s1 = `${a} + ${b} = ${p}`
  const s2 = `${p} ÷ ${c} = ${q}`
  return labelQuestion({
    kpId,
    type: 'mixed-ops',
    difficulty: d,
    sig: `merge-${a}-${b}-${c}`,
    stem: [{ kind: 'text', text: { k: 'm3.mix.merge', p: { s1, s2 } } }],
    correct: `(${a} + ${b}) ÷ ${c}`,
    // 干扰项也有带括号的，正确项不是唯一带括号的那个
    distractors: [`${a} + ${b} ÷ ${c}`, `${a} + (${b} ÷ ${c})`, `(${a} + ${p}) ÷ ${c}`],
    rng,
  })
}

// ── 解决多步计算的实际问题 ──

interface Step {
  key: string
  p: Record<string, number>
  value: number
  smart: number[]
}
/** 各种两步应用题（例 4–6、做一做、练习三 / 四），数都按课本的样子取 */
function stepProblem(d: Difficulty, rng: RNG): Step {
  const pool: (() => Step)[] = [
    () => {
      const t = rng.int(60, 99)
      const a = rng.int(10, 25)
      const b = rng.int(10, 25)
      return { key: rng.chance(0.5) ? 'm3.step.paperCut' : 'm3.step.books', p: { t, a, b }, value: t - a - b, smart: [t - a, t - b, t - a + b] }
    },
    () => {
      const n = rng.int(3, 8)
      const total = n * rng.int(4, 9)
      const a = rng.int(Math.ceil(total / 3), total - 5)
      return { key: 'm3.step.groups', p: { a, b: total - a, n }, value: total / n, smart: [total, a + n, total - n] }
    },
    () => {
      const n = rng.int(3, 8)
      const total = n * rng.int(2, 6)
      const a = rng.int(Math.ceil(total / 2), total - 2)
      return { key: 'm3.step.rabbits', p: { a, b: total - a, n }, value: total / n, smart: [total, a / n, total - n] }
    },
    () => {
      const n = rng.int(5, 9)
      const total = n * rng.int(3, 9)
      const a = rng.int(Math.ceil(total / 2), total - 3)
      return { key: 'm3.step.peaches', p: { a, b: total - a, n }, value: total / n, smart: [total, total - n, total / n + 1] }
    },
    () => {
      const d0 = rng.int(1, 4)
      const p = d0 + rng.int(3, 9)
      const n = rng.int(2, 5)
      return { key: 'm3.step.towels', p: { p, d: d0, n }, value: (p - d0) * n, smart: [p * n, p * n - d0, p - d0] }
    },
    // 例 5 小军做花 (8 - 3) × 2
    () => {
      const b = rng.int(1, 5)
      const a = b + rng.int(2, 7)
      const k = rng.int(2, 4)
      return { key: 'm3.step.flowers', p: { a, b, k }, value: (a - b) * k, smart: [a * k, a - b, a * k - b] }
    },
    // 例 6 红黄珠子 72 ÷ 8 - 56 ÷ 8（两次除法都在口诀内）
    () => {
      const n = rng.int(4, 9)
      const yb = rng.int(3, 8)
      const rb = yb + rng.int(1, 9 - yb)
      return { key: 'm3.step.beads', p: { a: rb * n, b: yb * n, n }, value: rb - yb, smart: [rb, (rb - yb) * n, yb] }
    },
    // 做一做 4：1 支铅笔 3 元、4 个笔记本，一共 19 元
    () => {
      const n = rng.int(2, 6)
      const each = rng.int(2, 9)
      const p = rng.int(1, 5)
      return { key: 'm3.step.pencil', p: { n, t: p + n * each, p }, value: each, smart: [(p + n * each) / n, each + 1, p + each] }
    },
  ]
  if (d >= 2) {
    pool.push(() => {
      const p = rng.int(15, 40)
      const q = rng.int(2, 9)
      const n = rng.int(2, 6)
      return { key: 'm3.step.toys', p: { p, q, n }, value: p + n * q, smart: [(p + q) * n, p + q, p * n + q] }
    })
  }
  if (d === 3) {
    pool.push(
      () => {
        const n = rng.int(4, 8)
        const b = rng.int(2, 9)
        const sum = n * rng.int(5, 9)
        const a = (sum + b) / 2
        if (!Number.isInteger(a) || a - b <= 0) return stepProblem(d, rng)
        return { key: 'm3.step.eggs', p: { a, b, n }, value: sum / n, smart: [(a + a + b) / n, a / n, sum] }
      },
      () => {
        const r = rng.int(3, 8)
        const c = rng.int(3, 9)
        const t = r * c + rng.int(10, 40)
        return { key: 'm3.step.drums', p: { t, r, c }, value: t - r * c, smart: [t - r - c, r * c, t - r] }
      },
    )
  }
  return rng.pick(pool)()
}

defineGenerator('m3s1-02-steps', (d, rng) => {
  const kpId = 'm3s1-02-steps'
  const s = stepProblem(d, rng)
  return numberQuestion({
    kpId,
    type: 'mixed-ops',
    difficulty: d,
    sig: `${s.key}-${Object.values(s.p).join('-')}`,
    stem: [{ kind: 'text', text: { k: s.key, p: s.p as Record<string, LStr | number> } }],
    value: s.value,
    rng,
    min: 0,
    max: 999,
    smart: s.smart.filter((x) => Number.isInteger(x) && x >= 0 && x !== s.value),
  })
})
