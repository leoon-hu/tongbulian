import type { Difficulty, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 万以内的加法和减法（二下）：三位数加法 / 减法（笔算，配竖式）、加减法各部分间的关系（求未知数、验算）
// ─────────────────────────────────────────────────────────────

function written(kpId: string, d: Difficulty, a: number, op: '+' | '-', b: number, rng: RNG): Question {
  const value = op === '+' ? a + b : a - b
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `${a}${op}${b}`,
    stem: [
      { kind: 'expr', expr: `${a} ${op} ${b} = ?` },
      { kind: 'vertical', a, op, b },
    ],
    value,
    rng,
    min: 0,
    max: 2000,
    // 常见错误：忘了进 / 退位（差 10、100）、个位算错
    smart: [value - 10, value + 10, value - 100, value + 100, value + 1, value - 1],
  })
}

/** 按位拼三位数 */
const num = (h: number, t: number, o: number): number => h * 100 + t * 10 + o

/** 三位数加法：d1 不进位，d2 一次进位（个位或十位），d3 连续进位、和可超过 1000 */
defineGenerator('m2s2-05-add', (d, rng) => {
  const kpId = 'm2s2-05-add'
  if (d === 1) {
    const h1 = rng.int(1, 8)
    const t1 = rng.int(0, 8)
    const o1 = rng.int(0, 8)
    const b = rng.chance(0.3)
      ? num(0, rng.int(1, 9 - t1), rng.int(0, 9 - o1)) // 三位数 + 两位数
      : num(rng.int(1, 9 - h1), rng.int(0, 9 - t1), rng.int(0, 9 - o1))
    return written(kpId, d, num(h1, t1, o1), '+', Math.max(b, 10), rng)
  }
  if (d === 2) {
    const onesCarry = rng.chance(0.5)
    const h1 = rng.int(1, 7)
    const h2 = rng.int(1, 8 - h1) // 百位之和 ≤ 8：十位进上来的 1 也不会再进位
    const t1 = onesCarry ? rng.int(0, 7) : rng.int(1, 9)
    const t2 = onesCarry ? rng.int(0, 8 - t1) : rng.int(10 - t1, 9)
    const o1 = onesCarry ? rng.int(1, 9) : rng.int(0, 8)
    const o2 = onesCarry ? rng.int(10 - o1, 9) : rng.int(0, 9 - o1)
    return written(kpId, d, num(h1, t1, o1), '+', num(h2, t2, o2), rng)
  }
  // 连续进位：个位、十位都进
  const h1 = rng.int(1, 9)
  const h2 = rng.int(1, 9)
  const t1 = rng.int(1, 9)
  const t2 = rng.int(Math.max(1, 9 - t1), 9)
  const o1 = rng.int(1, 9)
  const o2 = rng.int(10 - o1, 9)
  return written(kpId, d, num(h1, t1, o1), '+', num(h2, t2, o2), rng)
})

/** 三位数减法：d1 不退位，d2 一次退位，d3 连续退位 / 被减数中间有 0 */
defineGenerator('m2s2-05-sub', (d, rng) => {
  const kpId = 'm2s2-05-sub'
  if (d === 1) {
    const h1 = rng.int(2, 9)
    const t1 = rng.int(1, 9)
    const o1 = rng.int(1, 9)
    const b = rng.chance(0.3) ? num(0, rng.int(1, t1), rng.int(0, o1)) : num(rng.int(1, h1 - 1), rng.int(0, t1), rng.int(0, o1))
    return written(kpId, d, num(h1, t1, o1), '-', Math.max(b, 10), rng)
  }
  if (d === 2) {
    const onesBorrow = rng.chance(0.5)
    const h1 = rng.int(2, 9)
    const h2 = rng.int(1, h1 - 1)
    const t1 = onesBorrow ? rng.int(1, 9) : rng.int(0, 8)
    const t2 = onesBorrow ? rng.int(0, t1 - 1) : rng.int(t1 + 1, 9)
    const o1 = onesBorrow ? rng.int(0, 8) : rng.int(1, 9)
    const o2 = onesBorrow ? rng.int(o1 + 1, 9) : rng.int(0, o1)
    return written(kpId, d, num(h1, t1, o1), '-', num(h2, t2, o2), rng)
  }
  if (rng.chance(0.4)) {
    // 被减数中间有 0：如 403 − 158
    const h1 = rng.int(2, 9)
    const o1 = rng.int(0, 8)
    const h2 = rng.int(1, h1 - 1)
    return written(kpId, d, num(h1, 0, o1), '-', num(h2, rng.int(1, 9), rng.int(o1 + 1, 9)), rng)
  }
  // 连续退位：个位、十位都不够减
  const h1 = rng.int(2, 9)
  const h2 = rng.int(1, h1 - 1)
  const t1 = rng.int(0, 8)
  const t2 = rng.int(t1 + 1, 9)
  const o1 = rng.int(0, 8)
  const o2 = rng.int(o1 + 1, 9)
  return written(kpId, d, num(h1, t1, o1), '-', num(h2, t2, o2), rng)
})

/** 加减法各部分间的关系：求未知的加数 / 被减数 / 减数、选验算的算式 */
defineGenerator('m2s2-05-relations', (d, rng) => {
  const kpId = 'm2s2-05-relations'
  const cap = d === 1 ? 100 : 1000
  const a = rng.int(cap / 10, cap - cap / 10)
  const b = rng.int(cap / 20, cap - a)
  const c = a + b
  if (d >= 2 && rng.chance(0.3)) {
    // 验算：a + b = c 用 c − b = a 验算；a − b = c 用 c + b = a 验算
    const add = rng.chance(0.5)
    if (add) {
      return labelQuestion({
        kpId,
        type: 'arith',
        difficulty: d,
        sig: `chk+-${a}-${b}`,
        stem: [{ kind: 'text', text: { k: 'q.chk.add', p: { a, b, c } } }],
        correct: `${c} - ${b} = ${a}`,
        distractors: [`${a} - ${b} = ?`, `${c} + ${b} = ?`, `${a} + ${c} = ?`],
        rng,
      })
    }
    return labelQuestion({
      kpId,
      type: 'arith',
      difficulty: d,
      sig: `chk--${c}-${b}`,
      stem: [{ kind: 'text', text: { k: 'q.chk.sub', p: { a: c, b, c: a } } }],
      correct: `${a} + ${b} = ${c}`,
      distractors: [`${c} + ${b} = ?`, `${a} - ${b} = ?`, `${c} - ${a} = ?`],
      rng,
    })
  }
  const kind = rng.pick(['addend1', 'addend2', 'minuend', 'subtrahend'] as const)
  const expr =
    kind === 'addend1' ? `? + ${b} = ${c}` : kind === 'addend2' ? `${a} + ? = ${c}` : kind === 'minuend' ? `? - ${b} = ${a}` : `${c} - ? = ${a}`
  const value = kind === 'addend1' ? a : kind === 'addend2' ? b : kind === 'minuend' ? c : b
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `${kind}-${a}-${b}`,
    stem: [{ kind: 'expr', expr }],
    value,
    rng,
    min: 0,
    max: 1000,
    // 常见错误：把两个已知数直接相加 / 相减
    smart: kind === 'minuend' ? [a - b, a + b + b, a] : [a + b, c + b, c + a],
  })
})
