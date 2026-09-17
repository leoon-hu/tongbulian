import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 表内乘法：乘法的初步认识、2~6 与 7~9 的口诀、乘加乘减、用乘法解决问题
// ─────────────────────────────────────────────────────────────

const ITEMS = ['🍎', '🍬', '⭐', '🎈', '🍪', '🌸', '🎁', '⚽', '🧁', '🥟']

/** 乘法算式题：a × b = ?，干扰项取口诀里相邻的积（差一个 a 或 b）与个位算错 */
export function productQuestion(kpId: string, d: Difficulty, a: number, b: number, rng: RNG, extraStem: StemPart[] = []): Question {
  const value = a * b
  return numberQuestion({
    kpId,
    type: 'multiply',
    difficulty: d,
    sig: `${a}x${b}`,
    stem: [...extraStem, { kind: 'expr', expr: `${a} × ${b} = ?` }],
    value,
    rng,
    min: 0,
    max: 81,
    smart: [value + a, value - a, value + b, value - b, a + b],
  })
}

/** 填因数：? × b = c 或 a × ? = c */
function missingFactor(kpId: string, d: Difficulty, a: number, b: number, rng: RNG): Question {
  const first = rng.chance(0.5)
  return numberQuestion({
    kpId,
    type: 'multiply',
    difficulty: d,
    sig: first ? `f?x${b}=${a * b}` : `f${a}x?=${a * b}`,
    stem: [{ kind: 'expr', expr: first ? `? × ${b} = ${a * b}` : `${a} × ? = ${a * b}` }],
    value: first ? a : b,
    rng,
    min: 1,
    max: 9,
    smart: first ? [a + 1, a - 1, b] : [b + 1, b - 1, a],
  })
}

// ── 乘法的初步认识 ──
function genMultIntro(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-02-mult-intro'
  const n = rng.int(2, d === 1 ? 4 : 6) // 每份几个
  const k = rng.int(2, d === 1 ? 4 : 5) // 几份
  const icon = rng.pick(ITEMS)
  const rows = Array.from({ length: k }, () => ({ icon, count: n }))
  const roll = rng.next()
  if (roll < 0.35) {
    // 看图：每行 n 个、k 行，一共多少个
    return numberQuestion({
      kpId,
      type: 'multiply',
      difficulty: d,
      sig: `array-${n}x${k}`,
      stem: [
        { kind: 'text', text: { k: 'q.mul.arrayTotal', p: { n, k } } },
        { kind: 'compare-rows', rows },
      ],
      value: n * k,
      rng,
      min: 1,
      max: 36,
      smart: [n + k, n * (k + 1), n * (k - 1), n * k + 1],
    })
  }
  if (roll < 0.55) {
    // 看图：一共有几个 n
    return numberQuestion({
      kpId,
      type: 'multiply',
      difficulty: d,
      sig: `groups-${n}x${k}`,
      stem: [
        { kind: 'text', text: { k: 'q.mul.groups', p: { n } } },
        { kind: 'compare-rows', rows },
      ],
      value: k,
      rng,
      min: 1,
      max: 9,
      smart: [n, n * k, k + 1, k - 1],
    })
  }
  const sum = Array.from({ length: k }, () => String(n)).join(' + ')
  if (roll < 0.8) {
    // 连加改乘法：n + n + n = n × ?
    return numberQuestion({
      kpId,
      type: 'multiply',
      difficulty: d,
      sig: `sum2mul-${n}x${k}`,
      stem: [{ kind: 'expr', expr: `${sum} = ${n} × ?` }],
      value: k,
      rng,
      min: 1,
      max: 9,
      smart: [n, n * k, k + 1, k - 1],
    })
  }
  // k 个 n 相加，写成乘法算式是？
  return labelQuestion({
    kpId,
    type: 'multiply',
    difficulty: d,
    sig: `rewrite-${n}x${k}`,
    stem: [
      { kind: 'text', text: { k: 'q.mul.rewrite', p: { n, k } } },
      { kind: 'expr', expr: sum },
    ],
    correct: `${n} × ${k}`,
    distractors: [`${n} + ${k}`, `${n} × ${k + 1}`, `${n + 1} × ${k}`],
    rng,
  })
}
defineGenerator('m2s1-02-mult-intro', genMultIntro)

// ── 2~6 的乘法口诀 ──
defineGenerator('m2s1-02-table-6', (d, rng) => {
  const kpId = 'm2s1-02-table-6'
  const a = d === 1 ? rng.int(2, 5) : rng.int(2, 6)
  const b = d === 1 ? rng.int(1, 5) : rng.int(1, 6)
  if (d === 3 && rng.chance(0.35)) return missingFactor(kpId, d, a, b, rng)
  if (rng.chance(0.2)) {
    // k 个 n 是多少（k ≥ 2，「1 个 5」没意思）
    const k = Math.max(2, b)
    return numberQuestion({
      kpId,
      type: 'multiply',
      difficulty: d,
      sig: `kofn-${k}-${a}`,
      stem: [{ kind: 'text', text: { k: 'q.mul.kOfN', p: { k, n: a } } }],
      value: a * k,
      rng,
      min: 1,
      max: 36,
      smart: [a + k, a * (k + 1), a * (k - 1)],
    })
  }
  return rng.chance(0.5) ? productQuestion(kpId, d, a, b, rng) : productQuestion(kpId, d, b, a, rng)
})

// ── 乘加、乘减 ──
function genMultAddSub(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-02-mult-addsub'
  const a = rng.int(2, 6)
  const b = rng.int(2, d === 1 ? 4 : 6)
  if (d === 1 || rng.chance(0.3)) {
    // 看图：k 满行 + 一行零头，先乘再加
    const icon = rng.pick(ITEMS)
    const m = rng.int(1, a - 1)
    const rows = [...Array.from({ length: b }, () => ({ icon, count: a })), { icon, count: m }]
    return numberQuestion({
      kpId,
      type: 'multiply',
      difficulty: d,
      sig: `pic-${a}x${b}+${m}`,
      stem: [
        { kind: 'text', text: { k: 'q.mul.arrayPlus' } },
        { kind: 'compare-rows', rows },
        { kind: 'expr', expr: `${a} × ${b} + ${m} = ?` },
      ],
      value: a * b + m,
      rng,
      min: 1,
      max: 50,
      smart: [a * (b + m), a * b, a * b + m + 1, a * b + m - 1],
    })
  }
  const add = rng.chance(0.5)
  const c = add ? rng.int(1, 9) : rng.int(1, Math.min(9, a * b - 1))
  const value = add ? a * b + c : a * b - c
  return numberQuestion({
    kpId,
    type: 'multiply',
    difficulty: d,
    sig: `${a}x${b}${add ? '+' : '-'}${c}`,
    stem: [{ kind: 'expr', expr: `${a} × ${b} ${add ? '+' : '-'} ${c} = ?` }],
    value,
    rng,
    min: 0,
    max: 60,
    // 常见错误：先算了加减（a × (b ± c)）、忘了加减
    smart: [a * (add ? b + c : Math.max(1, b - c)), a * b, value + 1, value - 1],
  })
}
defineGenerator('m2s1-02-mult-addsub', genMultAddSub)

// ── 7、8、9 的乘法口诀 ──
defineGenerator('m2s1-06-table-9', (d, rng) => {
  const kpId = 'm2s1-06-table-9'
  const big = d === 1 ? 7 : d === 2 ? 8 : rng.pick([7, 8, 9])
  const other = rng.int(1, 9)
  if (d === 3 && rng.chance(0.35)) return missingFactor(kpId, d, big, other, rng)
  return rng.chance(0.5) ? productQuestion(kpId, d, big, other, rng) : productQuestion(kpId, d, other, big, rng)
})

// ── 用乘法解决问题（选择一种运算 / 购物问题）──
// 「几只」的「只」单独朗读会读错声调，所以用车轮：一辆 🚲 两个轮子、一辆 🚗 四个轮子
const WHEELS: { icon: string; wheels: number }[] = [
  { icon: '🚲', wheels: 2 },
  { icon: '🚗', wheels: 4 },
]

function wordQuestion(kpId: string, d: Difficulty, sig: string, text: LStr, value: number, rng: RNG, smart: number[], extra: StemPart[] = []): Question {
  return numberQuestion({ kpId, type: 'multiply', difficulty: d, sig, stem: [{ kind: 'text', text }, ...extra], value, rng, min: 1, max: 81, smart })
}

function genMultSolve(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-02-mult-solve'
  const cap = d === 1 ? 5 : 6 // 这一单元只到 6 的口诀
  const item = rng.pick(ITEMS)
  const roll = rng.next()
  if (roll < 0.3) {
    const p = rng.int(2, cap)
    const n = rng.int(2, cap)
    return wordQuestion(kpId, d, `price-${p}-${n}`, { k: 'q.mul.price', p: { item, p, n } }, p * n, rng, [p + n, p * (n + 1), p * (n - 1)])
  }
  if (roll < 0.55) {
    const n = rng.int(2, cap)
    const k = rng.int(2, Math.min(cap, 5))
    const rows = Array.from({ length: k }, () => ({ icon: item, count: n }))
    return wordQuestion(kpId, d, `rows-${k}-${n}`, { k: 'q.mul.rows', p: { item, k, n } }, k * n, rng, [k + n, n * (k + 1), n * (k - 1)], [
      { kind: 'compare-rows', rows },
    ])
  }
  if (roll < 0.8) {
    const k = rng.int(2, cap)
    const n = rng.int(2, cap)
    return wordQuestion(kpId, d, `each-${k}-${n}`, { k: 'q.mul.each', p: { item, k, n } }, k * n, rng, [k + n, n * (k + 1), n * (k - 1)])
  }
  const vehicle = rng.pick(WHEELS)
  const n = rng.int(2, cap)
  return wordQuestion(kpId, d, `wheels-${vehicle.icon}-${n}`, { k: 'q.mul.wheels', p: { item: vehicle.icon, wheels: vehicle.wheels, n } }, vehicle.wheels * n, rng, [
    vehicle.wheels + n,
    vehicle.wheels * (n + 1),
    vehicle.wheels * (n - 1),
  ])
}
defineGenerator('m2s1-02-mult-solve', genMultSolve)

// ── 解决连续两问的问题（7~9 的表内乘、除法）：先乘 / 除，再加 / 减 ──
function genTwoQuestions(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-06-two-questions'
  const item = rng.pick(ITEMS)
  const roll = rng.next()
  if (roll < 0.3) {
    // k 排每排 n 个，送走 m 个，还剩几个
    const k = rng.int(2, 9)
    const n = rng.int(2, 9)
    const m = rng.int(1, Math.min(k * n - 1, 40))
    return numberQuestion({
      kpId,
      type: 'multiply',
      difficulty: d,
      sig: `rowsLeft-${k}-${n}-${m}`,
      stem: [{ kind: 'text', text: { k: 'q.two.rowsLeft', p: { item, k, n, m } } }],
      value: k * n - m,
      rng,
      min: 0,
      max: 81,
      smart: [k * n, k * n + m, k * n - m + 1, k * n - m - 1],
    })
  }
  if (roll < 0.55) {
    // 有 n 个又买了 k 个，平均分给 p 人
    const p = rng.int(2, 9)
    const each = rng.int(2, 9)
    const total = p * each
    const k = rng.int(1, total - 1)
    return numberQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `buyShare-${total}-${k}-${p}`,
      stem: [{ kind: 'text', text: { k: 'q.two.buyShare', p: { item, n: total - k, k, p } } }],
      value: each,
      rng,
      min: 1,
      max: 81,
      smart: [total, p, each + 1, each - 1],
    })
  }
  if (roll < 0.8) {
    // 一个 p 元买 n 个，付了 pay 元，找回几元
    const p = rng.int(2, 9)
    const n = rng.int(2, 9)
    const pay = p * n <= 50 ? 50 : 100
    return numberQuestion({
      kpId,
      type: 'multiply',
      difficulty: d,
      sig: `change-${p}-${n}-${pay}`,
      stem: [{ kind: 'text', text: { k: 'q.two.change', p: { item, p, n, pay } } }],
      value: pay - p * n,
      rng,
      min: 0,
      max: 100,
      smart: [p * n, pay - p, pay - n, pay - p * n + 1],
    })
  }
  // t 个每 n 个一袋，装了 k 袋后还剩几个
  const n = rng.int(2, 9)
  const bags = rng.int(2, 9)
  const k = rng.int(1, bags - 1)
  const extra = rng.int(0, n - 1)
  const t = n * bags + extra
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `bagsLeft-${t}-${n}-${k}`,
    stem: [{ kind: 'text', text: { k: 'q.two.bagsLeft', p: { item, t, n, k } } }],
    value: t - n * k,
    rng,
    min: 0,
    max: 90,
    smart: [n * k, t - k, t - n, t - n * k + n],
  })
}
defineGenerator('m2s1-06-two-questions', genTwoQuestions)
