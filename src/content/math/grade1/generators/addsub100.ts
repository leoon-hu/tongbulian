import type { Difficulty, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, numberQuestion } from '@/engine'
import { twoTermQuestion } from './arithmetic'

// ─────────────────────────────────────────────────────────────
// 100 以内的加减法（一下）：100 以内数的认识里的「简单的加、减法」（整十数加减整十数、整十数加一位数和相应的减法）、
// 口算加 / 减（两位数 ± 一位数、± 整十数、± 两位数，含进位 / 退位，用连减解决问题）、笔算加 / 减（配竖式）
// ─────────────────────────────────────────────────────────────

/** 装袋的东西（论「个」） */
const BAG_ITEMS = ['🍊', '🍎', '🍑', '🍐', '🍪', '🥚']

/** 简单的加、减法（p37）：例 7 整十 ± 整十（10 + 20、30 - 20），例 8 整十 + 一位数、几十几 - 几、几十几 - 几十（做一做 9 道全是这类）；约 4 : 6 */
defineGenerator('s2-03-tens-addsub', (d, rng) => {
  const kpId = 's2-03-tens-addsub'
  const roll = rng.next()
  if (roll < 0.4) {
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

/** 两个加数有时交换位置（课本 4 + 85、7 + 21、5 + 37、2 + 30 这样一位数 / 整十数在前的题） */
function addPair(kpId: string, d: Difficulty, a: number, b: number, rng: RNG, swap = 0.3, vertical = false): Question {
  const [x, y] = rng.chance(swap) ? [b, a] : [a, b]
  return twoTermQuestion({ kpId, difficulty: d, a: x, op: '+', b: y, rng, max: 100, vertical })
}

/**
 * 口算加法（p43–46）：例 1 两位数 + 一位数、+ 整十数（26 + 2、26 + 20），试一试两位数 + 两位数（26 + 22，不进位），
 * 例 2 进位加（28 + 5）——课本这一节的四种算式都在第 1 档；第 2 档多出进位的。和不超过 100。
 */
defineGenerator('s2-04-oral-add', (d, rng) => {
  const kpId = 's2-04-oral-add'
  const kind = d === 2 ? rng.pick(['plain', 'tens', 'two', 'carry', 'carry', 'carry'] as const) : rng.pick(['plain', 'tens', 'two', 'carry'] as const)
  const t = rng.int(1, 8)
  if (kind === 'tens') {
    const a = t * 10 + rng.int(1, 9)
    return addPair(kpId, d, a, rng.int(1, 9 - t) * 10, rng)
  }
  if (kind === 'plain') {
    const o = rng.int(1, 8)
    return addPair(kpId, d, t * 10 + o, rng.int(1, 9 - o), rng)
  }
  if (kind === 'two') {
    // 两位数 + 两位数，不进位：十位、个位各自相加都不满十
    const t2 = rng.int(1, 9 - t)
    const o1 = rng.int(0, 8)
    const o2 = rng.int(1, 9 - o1)
    return twoTermQuestion({ kpId, difficulty: d, a: t * 10 + o1, op: '+', b: t2 * 10 + o2, rng, max: 100 })
  }
  const o = rng.int(2, 9)
  return addPair(kpId, d, t * 10 + o, rng.int(10 - o, 9), rng)
})

/** 用连减解决问题（p50 例 3「26 个橘子，8 个装一袋，可以装满几袋？还剩几个？」、p51 做一做 40 个羽毛球每筒 6 个）：两问拆成两道题 */
function bagQuestion(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.int(5, 9)
  const left = rng.int(1, k - 1)
  const full = rng.int(2, Math.min(6, Math.floor((50 - left) / k)))
  const n = full * k + left
  const item = rng.pick(BAG_ITEMS)
  const askLeft = rng.chance(0.5)
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `bag-${askLeft ? 'left' : 'full'}-${n}-${k}-${item}`,
    stem: [{ kind: 'text', text: { k: askLeft ? 'q.bagLeft' : 'q.bagFull', p: { n, k, item } } }],
    value: askLeft ? left : full,
    rng,
    min: 0,
    max: 20,
    smart: askLeft ? [full, left + 1, k - left, n - k] : [full + 1, full - 1, left, k],
  })
}

/** 「70 连续减 7」（p51 练一练 4）：减了几次以后是几 */
function repeatSubQuestion(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.int(3, 9)
  const n = k * rng.int(5, Math.floor(99 / k))
  const times = rng.int(2, 4)
  const value = n - k * times
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `rep-${n}-${k}-${times}`,
    stem: [{ kind: 'text', text: { k: 'q.repeatSub', p: { n, k, t: times } } }],
    value,
    rng,
    min: 0,
    max: 100,
    smart: [value + k, value - k, n - k, value + 10],
  })
}

/**
 * 口算减法（p47–51）：例 1 两位数 - 一位数、- 整十数（35 - 2、35 - 20，也有 35 - 5、99 - 9），试一试两位数 - 两位数（35 - 22，不退位），
 * 例 2 退位减（36 - 8、30 - 6），例 3 用连减解决问题（装袋）——都在第 1 档；第 2 档多出退位的，另有「70 连续减 7」。
 */
defineGenerator('s2-04-oral-sub', (d, rng) => {
  const kpId = 's2-04-oral-sub'
  const roll = rng.next()
  if (roll < 0.15) return bagQuestion(kpId, d, rng)
  if (d > 1 && roll < 0.25) return repeatSubQuestion(kpId, d, rng)
  const kind = d === 2 ? rng.pick(['plain', 'tens', 'two', 'borrow', 'borrow', 'borrow'] as const) : rng.pick(['plain', 'tens', 'two', 'borrow'] as const)
  const t = rng.int(2, 9)
  if (kind === 'tens') {
    const a = t * 10 + rng.int(1, 9)
    return twoTermQuestion({ kpId, difficulty: d, a, op: '-', b: rng.int(1, t - 1) * 10, rng, max: 100 })
  }
  if (kind === 'plain') {
    // 个位够减（可以减完：35 - 5 = 30）
    const o = rng.int(1, 9)
    return twoTermQuestion({ kpId, difficulty: d, a: t * 10 + o, op: '-', b: rng.int(1, o), rng, max: 100 })
  }
  if (kind === 'two') {
    // 两位数 - 两位数，不退位
    const o1 = rng.int(1, 9)
    return twoTermQuestion({ kpId, difficulty: d, a: t * 10 + o1, op: '-', b: rng.int(1, t - 1) * 10 + rng.int(1, o1), rng, max: 100 })
  }
  const o = rng.int(0, 7)
  return twoTermQuestion({ kpId, difficulty: d, a: t * 10 + o, op: '-', b: rng.int(o + 1, 9), rng, max: 100 })
})

/**
 * 笔算加法（p57–59）：例 1 不进位（35 + 32），例 2 进位（35 + 37，个位满十向十位进 1），试一试两位数 + 一位数（46 + 9）、
 * 练一练 7 + 64——第 1 档都出；第 2 档多出进位的。和不超过 99（课本最大 94），配竖式。
 */
defineGenerator('s2-05-written-add', (d, rng) => {
  const kpId = 's2-05-written-add'
  const roll = rng.next()
  if (roll < 0.2) {
    // 两位数 + 一位数（进位或不进位），一位数有时写在前面
    const t = rng.int(1, 8)
    const o = rng.int(1, 9)
    return addPair(kpId, d, t * 10 + o, rng.int(1, 9), rng, 0.3, true)
  }
  const carry = d === 1 ? roll < 0.6 : roll < 0.75
  if (!carry) {
    const t1 = rng.int(1, 8)
    const t2 = rng.int(1, 9 - t1)
    const o1 = rng.int(1, 8)
    const o2 = rng.int(1, 9 - o1)
    return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10 + o1, op: '+', b: t2 * 10 + o2, rng, max: 100, vertical: true })
  }
  // 个位满十进 1 后十位不超过 9：t1 + t2 ≤ 8
  const t1 = rng.int(1, 7)
  const t2 = rng.int(1, 8 - t1)
  const o1 = rng.int(1, 9)
  const o2 = rng.int(Math.max(1, 10 - o1), 9)
  return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10 + o1, op: '+', b: t2 * 10 + o2, rng, max: 100, vertical: true })
})

/**
 * 笔算减法（p62–65）：例 1 一上来就是退位（52 - 35），例 2 整十数减两位数（60 - 32），试一试两位数 - 一位数（53 - 8）、
 * 不退位（47 - 41）——第 1 档都出；第 2 档多出退位的。没有 100 减两位数。配竖式。
 */
defineGenerator('s2-05-written-sub', (d, rng) => {
  const kpId = 's2-05-written-sub'
  const roll = rng.next()
  const t1 = rng.int(2, 9)
  const t2 = rng.int(1, t1 - 1)
  if (roll < 0.2) {
    // 整十数 - 两位数（个位不是 0）
    return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10, op: '-', b: t2 * 10 + rng.int(1, 9), rng, max: 100, vertical: true })
  }
  if (roll < 0.35) {
    // 两位数 - 一位数（退位或不退位）
    return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10 + rng.int(0, 9), op: '-', b: rng.int(1, 9), rng, max: 100, vertical: true })
  }
  const borrow = d === 1 ? roll < 0.75 : roll < 0.85
  if (!borrow) {
    const o1 = rng.int(1, 9)
    return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10 + o1, op: '-', b: t2 * 10 + rng.int(0, o1), rng, max: 100, vertical: true })
  }
  const o1 = rng.int(0, 8)
  return twoTermQuestion({ kpId, difficulty: d, a: t1 * 10 + o1, op: '-', b: t2 * 10 + rng.int(o1 + 1, 9), rng, max: 100, vertical: true })
})
