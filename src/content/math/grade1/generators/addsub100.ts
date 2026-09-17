import { defineGenerator, numberQuestion } from '@/engine'
import { twoTermQuestion } from './arithmetic'

// ─────────────────────────────────────────────────────────────
// 100 以内的加减法（一下）：整十数加减法（100 以内数的认识里的「简单的加、减法」）、
// 口算加 / 减（两位数 ± 一位数、± 整十数，含进位 / 退位）、笔算加 / 减（两位数 ± 两位数，配竖式）
// ─────────────────────────────────────────────────────────────

const ITEMS = ['🍎', '🍬', '⭐', '🎈', '🍪', '📚', '🌸', '🎁']

/** 整十数加减法：整十 ± 整十、整十 + 一位数、几十几 − 几 / − 几十 */
defineGenerator('s2-03-tens-addsub', (d, rng) => {
  const kpId = 's2-03-tens-addsub'
  const roll = rng.next()
  if (d === 1 || roll < 0.4) {
    // 整十 ± 整十
    if (rng.chance(0.5)) {
      const i = rng.int(1, 8)
      return twoTermQuestion({ kpId, difficulty: d, a: i * 10, op: '+', b: rng.int(1, 9 - i) * 10, rng, max: 100 })
    }
    const i = rng.int(2, 10)
    return twoTermQuestion({ kpId, difficulty: d, a: i * 10, op: '-', b: rng.int(1, i - 1) * 10, rng, max: 100 })
  }
  const tens = rng.int(1, 9) * 10
  const ones = rng.int(1, 9)
  if (roll < 0.6) return twoTermQuestion({ kpId, difficulty: d, a: tens, op: '+', b: ones, rng, max: 100 })
  if (roll < 0.75) return twoTermQuestion({ kpId, difficulty: d, a: ones, op: '+', b: tens, rng, max: 100 })
  if (roll < 0.9) return twoTermQuestion({ kpId, difficulty: d, a: tens + ones, op: '-', b: ones, rng, max: 100 })
  return twoTermQuestion({ kpId, difficulty: d, a: tens + ones, op: '-', b: tens, rng, max: 100 })
})

/**
 * 口算加法：d1 两位数 + 一位数（不进位）/ 两位数 + 整十数；d2 两位数 + 一位数（进位）；d3 混合
 */
defineGenerator('s2-04-oral-add', (d, rng) => {
  const kpId = 's2-04-oral-add'
  const kind = d === 1 ? rng.pick(['plain', 'tens'] as const) : d === 2 ? 'carry' : rng.pick(['plain', 'tens', 'carry', 'carry'] as const)
  const t = rng.int(1, 8)
  if (kind === 'tens') {
    const a = t * 10 + rng.int(1, 9)
    return twoTermQuestion({ kpId, difficulty: d, a, op: '+', b: rng.int(1, 9 - t) * 10, rng, max: 100 })
  }
  if (kind === 'plain') {
    const o = rng.int(1, 8)
    return twoTermQuestion({ kpId, difficulty: d, a: t * 10 + o, op: '+', b: rng.int(1, 9 - o), rng, max: 100 })
  }
  const o = rng.int(2, 9)
  return twoTermQuestion({ kpId, difficulty: d, a: t * 10 + o, op: '+', b: rng.int(10 - o, 9), rng, max: 100 })
})

/**
 * 口算减法：d1 两位数 − 一位数（不退位）/ 两位数 − 整十数；d2 两位数 − 一位数（退位）；d3 混合 + 用连减解决问题
 */
defineGenerator('s2-04-oral-sub', (d, rng) => {
  const kpId = 's2-04-oral-sub'
  if (d === 3 && rng.chance(0.3)) {
    // 连减：有 n 个，先用了 a 个，又用了 b 个，还剩几个
    const n = rng.int(30, 90)
    const a = rng.int(5, 30)
    const b = rng.int(5, Math.min(30, n - a - 1))
    const item = rng.pick(ITEMS)
    return numberQuestion({
      kpId,
      type: 'arith',
      difficulty: d,
      sig: `chain-${n}-${a}-${b}`,
      stem: [
        { kind: 'text', text: { k: 'q.usedTwice', p: { item, n, a, b } } },
        { kind: 'expr', expr: `${n} - ${a} - ${b} = ?` },
      ],
      value: n - a - b,
      rng,
      min: 0,
      max: 100,
      smart: [n - a, n - a - b + 10, n - a - b - 10, n - b],
    })
  }
  const kind = d === 1 ? rng.pick(['plain', 'tens'] as const) : d === 2 ? 'borrow' : rng.pick(['plain', 'tens', 'borrow', 'borrow'] as const)
  const t = rng.int(2, 9)
  if (kind === 'tens') {
    const a = t * 10 + rng.int(1, 9)
    return twoTermQuestion({ kpId, difficulty: d, a, op: '-', b: rng.int(1, t - 1) * 10, rng, max: 100 })
  }
  if (kind === 'plain') {
    const o = rng.int(2, 9)
    return twoTermQuestion({ kpId, difficulty: d, a: t * 10 + o, op: '-', b: rng.int(1, o - 1), rng, max: 100 })
  }
  const o = rng.int(0, 7)
  return twoTermQuestion({ kpId, difficulty: d, a: t * 10 + o, op: '-', b: rng.int(o + 1, 9), rng, max: 100 })
})

/** 笔算加法：两位数 + 两位数，配竖式。d1 不进位，d2 进位（和 < 100），d3 混合、和可到 100 */
defineGenerator('s2-05-written-add', (d, rng) => {
  const kpId = 's2-05-written-add'
  const carry = d === 1 ? false : d === 2 ? true : rng.chance(0.6)
  if (!carry) {
    const t1 = rng.int(1, 8)
    const t2 = rng.int(1, 9 - t1)
    const o1 = rng.int(1, 8)
    const o2 = rng.int(1, 9 - o1)
    return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10 + o1, op: '+', b: t2 * 10 + o2, rng, max: 100, vertical: true })
  }
  const maxTensSum = d === 3 ? 9 : 8 // 个位进 1 后十位 ≤ 9；d3 十位可凑满 10（和正好 100）
  const t1 = rng.int(1, maxTensSum - 1)
  const t2 = rng.int(1, maxTensSum - t1)
  const o1 = rng.int(1, 9)
  const o2 = t1 + t2 === 9 ? 10 - o1 : rng.int(Math.max(1, 10 - o1), 9)
  return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10 + o1, op: '+', b: t2 * 10 + o2, rng, max: 100, vertical: true })
})

/** 笔算减法：两位数 − 两位数，配竖式。d1 不退位，d2 退位，d3 混合 + 整十 / 100 减两位数 */
defineGenerator('s2-05-written-sub', (d, rng) => {
  const kpId = 's2-05-written-sub'
  if (d === 3 && rng.chance(0.3)) {
    const a = rng.chance(0.5) ? 100 : rng.int(3, 9) * 10
    let b = rng.int(11, a - 1)
    if (b % 10 === 0) b += rng.int(1, 9)
    return twoTermQuestion({ kpId, difficulty: d, a, op: '-', b, rng, max: 100, vertical: true })
  }
  const borrow = d === 1 ? false : d === 2 ? true : rng.chance(0.6)
  const t1 = rng.int(2, 9)
  const t2 = rng.int(1, t1 - 1)
  if (!borrow) {
    const o1 = rng.int(1, 9)
    return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10 + o1, op: '-', b: t2 * 10 + rng.int(0, o1), rng, max: 100, vertical: true })
  }
  const o1 = rng.int(0, 8)
  return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10 + o1, op: '-', b: t2 * 10 + rng.int(o1 + 1, 9), rng, max: 100, vertical: true })
})
