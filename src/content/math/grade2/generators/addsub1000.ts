import type { Difficulty, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 万以内的加法和减法（二下）：加法 / 减法（笔算，配竖式；三位数为主，也有四位数和 1000 减三位数）、
// 加、减法各部分间的关系（求未知数、验算、估算）
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
    max: 10000,
    // 常见错误：忘了进 / 退位（差 10、100）、个位算错
    smart: [value - 10, value + 10, value - 100, value + 100, value + 1, value - 1],
  })
}

/** 按位拼数（千、百、十、个） */
const num = (h: number, t: number, o: number, k = 0): number => k * 1000 + h * 100 + t * 10 + o

/** 加法要进几次位 */
export function carriesOf(a: number, b: number): number {
  let c = 0
  let n = 0
  for (let i = 0; i < 4; i++) {
    const s = (Math.floor(a / 10 ** i) % 10) + (Math.floor(b / 10 ** i) % 10) + c
    c = s >= 10 ? 1 : 0
    n += c
  }
  return n
}

/** 不进位：三位数 + 三位数 / 两位数 */
function addNoCarry(rng: RNG): [number, number] {
  const h1 = rng.int(1, 8)
  const t1 = rng.int(0, 8)
  const o1 = rng.int(0, 8)
  const b = rng.chance(0.3) ? num(0, rng.int(1, 9 - t1), rng.int(0, 9 - o1)) : num(rng.int(1, 9 - h1), rng.int(0, 9 - t1), rng.int(0, 9 - o1))
  return [num(h1, t1, o1), Math.max(b, 10)]
}

/** 只进一次位：个位满十、十位满十（例 1「271 + 31」），或百位满十进到千位（试一试「271 + 903」、做一做「360 + 820」） */
function addOneCarry(rng: RNG): [number, number] {
  const where = rng.pick(['o', 't', 'h'] as const)
  if (where === 'h') {
    const h1 = rng.int(2, 9)
    const t1 = rng.int(0, 8)
    const o1 = rng.int(0, 8)
    return [num(h1, t1, o1), num(rng.int(10 - h1, 9), rng.int(0, 9 - t1), rng.int(0, 9 - o1))]
  }
  const h1 = rng.int(1, 7)
  const h2 = rng.chance(0.25) ? 0 : rng.int(1, 8 - h1) // 百位之和 ≤ 8：十位进上来的 1 也不会再进位；h2 = 0 是三位数 + 两位数
  if (where === 'o') {
    const t1 = rng.int(0, 7)
    const o1 = rng.int(1, 9)
    return [num(h1, t1, o1), num(h2, rng.int(h2 ? 0 : 1, 8 - t1), rng.int(10 - o1, 9))]
  }
  const t1 = rng.int(1, 9)
  const o1 = rng.int(0, 8)
  return [num(h1, t1, o1), num(h2, rng.int(10 - t1, 9), rng.int(0, 9 - o1))]
}

/** 连续进位：个位、十位都满十（例 2「445 + 298」） */
function addTwoCarry(rng: RNG): [number, number] {
  const h1 = rng.int(1, 9)
  const h2 = rng.int(1, 9)
  const t1 = rng.int(1, 9)
  const t2 = rng.int(Math.max(1, 9 - t1), 9)
  const o1 = rng.int(1, 9)
  const o2 = rng.int(10 - o1, 9)
  return [num(h1, t1, o1), num(h2, t2, o2)]
}

/** 四位数加三位数 / 四位数（试一试「6432 + 1595」、练一练「565 + 4398、2565 + 4398」），和不超过 9999 */
function addFourDigit(rng: RNG): [number, number] {
  const a = rng.int(1000, 6999)
  const b = rng.chance(0.4) ? rng.int(100, 999) : rng.int(1000, 9999 - a)
  return rng.chance(0.5) ? [a, Math.max(100, b)] : [Math.max(100, b), a]
}

/**
 * 加法（二下「万以内的加法和减法」1. 加法）：例 1 就是一次进位，所以第 1 档以一次进位为主，也有不进位和连续进位；
 * 第 2 档是连续进位和四位数（试一试 6432 + 1595），第 3 档四位数为主。
 */
defineGenerator('m2s2-05-add', (d, rng) => {
  const kpId = 'm2s2-05-add'
  const roll = rng.next()
  const [a, b] =
    d === 1
      ? roll < 0.15
        ? addNoCarry(rng)
        : roll < 0.65
          ? addOneCarry(rng)
          : addTwoCarry(rng)
      : d === 2
        ? roll < 0.5
          ? addTwoCarry(rng)
          : addFourDigit(rng)
        : roll < 0.6
          ? addFourDigit(rng)
          : addTwoCarry(rng)
  return written(kpId, d, a, '+', b, rng)
})

/** 不退位 */
function subNoBorrow(rng: RNG): [number, number] {
  const h1 = rng.int(2, 9)
  const t1 = rng.int(1, 9)
  const o1 = rng.int(1, 9)
  const b = rng.chance(0.3) ? num(0, rng.int(1, t1), rng.int(0, o1)) : num(rng.int(1, h1 - 1), rng.int(0, t1), rng.int(0, o1))
  return [num(h1, t1, o1), Math.max(b, 10)]
}

/** 退一次位：个位不够减或十位不够减（例 1「278 − 98」），减数可以是两位数 */
function subOneBorrow(rng: RNG): [number, number] {
  const onesBorrow = rng.chance(0.5)
  const h1 = rng.int(2, 9)
  const h2 = rng.chance(0.25) ? 0 : rng.int(1, h1 - 1)
  const t1 = onesBorrow ? rng.int(1, 9) : rng.int(0, 8)
  const t2 = onesBorrow ? rng.int(0, t1 - 1) : rng.int(t1 + 1, 9)
  const o1 = onesBorrow ? rng.int(0, 8) : rng.int(1, 9)
  const o2 = onesBorrow ? rng.int(o1 + 1, 9) : rng.int(0, o1)
  return [num(h1, t1, o1), Math.max(10, num(h2, t2, o2))]
}

/** 连续退位：个位、十位都不够减（例 2「213 − 145」） */
function subTwoBorrow(rng: RNG): [number, number] {
  const h1 = rng.int(2, 9)
  const h2 = rng.int(1, h1 - 1)
  const t1 = rng.int(0, 8)
  const t2 = rng.int(t1 + 1, 9)
  const o1 = rng.int(0, 8)
  const o2 = rng.int(o1 + 1, 9)
  return [num(h1, t1, o1), num(h2, t2, o2)]
}

/** 被减数中间有 0（例 3「301 − 145」） */
function subMiddleZero(rng: RNG): [number, number] {
  const h1 = rng.int(2, 9)
  const o1 = rng.int(0, 8)
  const h2 = rng.int(1, h1 - 1)
  return [num(h1, 0, o1), num(h2, rng.int(1, 9), rng.int(o1 + 1, 9))]
}

/** 1000 减三位数、几千减三位数（做一做「1000 − 439」、练一练「1000 − 586」） */
function subThousand(rng: RNG): [number, number] {
  const a = rng.chance(0.6) ? 1000 : rng.int(2, 9) * 1000
  return [a, rng.int(101, 999)]
}

/**
 * 减法（2. 减法）：例 1 就是退一次位，第 1 档以退一次位为主，也有不退位、连续退位和被减数中间有 0；
 * 第 2、3 档是中间有 0、连续退位和 1000 / 几千减三位数。
 */
defineGenerator('m2s2-05-sub', (d, rng) => {
  const kpId = 'm2s2-05-sub'
  const roll = rng.next()
  const [a, b] =
    d === 1
      ? roll < 0.15
        ? subNoBorrow(rng)
        : roll < 0.6
          ? subOneBorrow(rng)
          : roll < 0.85
            ? subTwoBorrow(rng)
            : subMiddleZero(rng)
      : roll < 0.35
        ? subMiddleZero(rng)
        : roll < (d === 2 ? 0.65 : 0.5)
          ? subTwoBorrow(rng)
          : subThousand(rng)
  return written(kpId, d, a, '-', b, rng)
})

/** 估算里买的东西（都有名字，朗读要读） */
const BIG_GOODS = ['⚽', '🏀', '🧸', '🎒', '🚲']

/**
 * 加、减法各部分间的关系（3.）：求未知的加数 / 被减数 / 减数（例 1、例 2）、选验算的算式（加法交换加数再算一遍，减法用加法或减法验算）、
 * 估算（例 3「358 + 249，500 元够吗？700 元呢？」、做一做「500 个座位」）
 */
defineGenerator('m2s2-05-relations', (d, rng) => {
  const kpId = 'm2s2-05-relations'
  const roll = rng.next()
  if (roll < 0.25) return estimate(kpId, d, rng)
  const a = rng.int(100, 800)
  const b = rng.int(50, 999 - a)
  const c = a + b
  if (roll < 0.5 && a !== b) {
    // 验算：选项都只写算式、不写得数（写了得数就看得出哪个是对的）
    const add = rng.chance(0.5)
    if (add) {
      // a + b = c：交换加数的位置再算一遍（p65）
      return labelQuestion({
        kpId,
        type: 'arith',
        difficulty: d,
        sig: `chk+-${a}-${b}`,
        stem: [{ kind: 'text', text: { k: 'q.chk.add', p: { a, b, c } } }],
        correct: `${b} + ${a}`,
        distractors: [`${c} + ${b}`, `${c} + ${a}`, a > b ? `${a} - ${b}` : `${b} - ${a}`],
        rng,
      })
    }
    // c − b = a：差 + 减数 = 被减数，或 被减数 − 差 = 减数（p70、p74），两个只放一个
    const byAdd = rng.chance(0.6)
    return labelQuestion({
      kpId,
      type: 'arith',
      difficulty: d,
      sig: `chk--${c}-${b}-${byAdd ? 'a' : 's'}`,
      stem: [{ kind: 'text', text: { k: 'q.chk.sub', p: { a: c, b, c: a } } }],
      correct: byAdd ? `${a} + ${b}` : `${c} - ${a}`,
      distractors: [`${c} + ${b}`, `${c} + ${a}`, a > b ? `${a} - ${b}` : `${b} - ${a}`],
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

/**
 * 估算：两个三位数的和与整百数比（只看百位）。m 是两个百位数的和（不够，358 + 249 和 500）或再加 2 个百（够，和 700）——
 * 用不着算出得数就能判断。
 */
function estimate(kpId: string, d: Difficulty, rng: RNG): Question {
  const ha = rng.int(1, 5)
  const hb = rng.int(1, 6 - ha)
  const a = ha * 100 + rng.int(1, 99)
  const b = hb * 100 + rng.int(1, 99)
  const enough = rng.chance(0.5)
  const m = (ha + hb + (enough ? 2 : 0)) * 100
  const correct = { k: enough ? 'opt.enough' : 'opt.notEnough' }
  const wrong = { k: enough ? 'opt.notEnough' : 'opt.enough' }
  if (rng.chance(0.6)) {
    const [i1, i2] = rng.shuffle(BIG_GOODS).slice(0, 2) as [string, string]
    return labelQuestion({
      kpId,
      type: 'arith',
      difficulty: d,
      sig: `est-buy-${a}-${b}-${m}`,
      stem: [{ kind: 'text', text: { k: 'q.est.buy', p: { i1, a, i2, b, m } } }],
      correct,
      distractors: [wrong],
      rng,
    })
  }
  return labelQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `est-seat-${a}-${b}-${m}`,
    stem: [{ kind: 'text', text: { k: 'q.est.seats', p: { a, b, m } } }],
    correct,
    distractors: [wrong],
    rng,
  })
}
