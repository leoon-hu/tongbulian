import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 表内乘法：乘法的初步认识、1~6 与 7~9 的口诀、乘加乘减、用乘法解决问题、连续两问
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
  if (roll < 0.3) {
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
  if (roll < 0.48) {
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
  if (roll < 0.65) {
    // 乘数、积（p12「3 × 5 = 15，读作 3 乘 5 等于 15」；p14「一个乘数是 8，另一个乘数是 3，积是多少」）
    if (rng.chance(0.5)) {
      return numberQuestion({
        kpId,
        type: 'multiply',
        difficulty: d,
        sig: `product-${n}x${k}`,
        stem: [
          { kind: 'expr', expr: `${n} × ${k} = ${n * k}` },
          { kind: 'text', text: { k: 'q.mul.product' } },
        ],
        value: n * k,
        rng,
        min: 1,
        max: 36,
        smart: [n, k, n + k],
      })
    }
    return numberQuestion({
      kpId,
      type: 'multiply',
      difficulty: d,
      sig: `factors-${n}x${k}`,
      stem: [{ kind: 'text', text: { k: 'q.mul.factors', p: { a: n, b: k } } }],
      value: n * k,
      rng,
      min: 1,
      max: 36,
      smart: [n + k, n * (k + 1), n * (k - 1)],
    })
  }
  const sum = Array.from({ length: k }, () => String(n)).join(' + ')
  if (roll < 0.83) {
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

// ── 1~6 的乘法口诀（课本：5 的口诀、1~4 的口诀含「一一得一」、6 的口诀；练一练「根据积想乘数」）──
defineGenerator('m2s1-02-table-6', (d, rng) => {
  const kpId = 'm2s1-02-table-6'
  const a = rng.chance(0.1) ? 1 : rng.int(2, 6)
  const b = rng.int(1, 6)
  if (rng.chance(d === 3 ? 0.35 : 0.2)) return missingFactor(kpId, d, a, b, rng)
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
  const b = rng.int(2, d === 1 ? 5 : 6)
  const roll = rng.next()
  if (roll < 0.3) {
    // 看图乘减（例 3「3 × 4 − 1」）：b 排每排 a 个，最后一排少 m 个
    const icon = rng.pick(ITEMS)
    const m = rng.int(1, a - 1)
    const rows = [...Array.from({ length: b - 1 }, () => ({ icon, count: a })), { icon, count: a - m }]
    return numberQuestion({
      kpId,
      type: 'multiply',
      difficulty: d,
      sig: `picsub-${a}x${b}-${m}`,
      stem: [
        { kind: 'text', text: { k: 'q.mul.arrayPlus' } },
        { kind: 'compare-rows', rows },
        { kind: 'expr', expr: `${a} × ${b} - ${m} = ?` },
      ],
      value: a * b - m,
      rng,
      min: 1,
      max: 50,
      smart: [a * (b - m), a * b, a * b - m + 1, a * b - m - 1],
    })
  }
  if (roll < 0.6) {
    // 看图：k 满行 + 一行零头，先乘再加（例 3「3 × 3 + 2」）
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
  // 先算乘法：a × b ± c
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

// ── 7~9 的乘法口诀（例 1–3：7、8、9 的口诀分量一样；练一练「9 × □ = 63、□ × 8 = 72」）──
defineGenerator('m2s1-06-table-9', (d, rng) => {
  const kpId = 'm2s1-06-table-9'
  const big = rng.pick([7, 8, 9])
  const other = rng.int(1, 9)
  if (rng.chance(d === 3 ? 0.35 : 0.2)) return missingFactor(kpId, d, big, other, rng)
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

/** 价目表上的东西（例 6 的文具架：从几样东西的价钱里选需要的条件） */
const PRICED = ['🎈', '🧁', '⚽', '🎁', '🍎', '🍪']

function genMultSolve(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-02-mult-solve'
  const cap = 6 // 这一单元只到 6 的口诀
  const item = rng.pick(ITEMS)
  const roll = rng.next()
  if (roll < 0.2) {
    // 例 5「有两排桌子，一排有 4 张，另一排有 5 张」：两个数不一样，是加法不是乘法
    const a = rng.int(2, 6)
    const b = rng.pick([2, 3, 4, 5, 6].filter((x) => x !== a))
    return wordQuestion(kpId, d, `tworows-${a}-${b}`, { k: 'q.mul.twoRows', p: { item, a, b } }, a + b, rng, [a * b, a + b + 1, a + b - 1], [
      { kind: 'compare-rows', rows: [{ icon: item, count: a }, { icon: item, count: b }] },
    ])
  }
  if (roll < 0.4) {
    // 例 6 价目表：三样东西的价钱，只用要买的那一样
    const goods = rng.shuffle(PRICED).slice(0, 3)
    const prices = rng.shuffle([2, 3, 4, 5, 6]).slice(0, 3)
    const at = rng.int(0, 2)
    const n = rng.int(2, cap)
    const p = prices[at]!
    const others = prices.filter((_, i) => i !== at).map((x) => x * n)
    return wordQuestion(kpId, d, `menu-${goods.join('')}-${prices.join(',')}-${at}-${n}`, { k: 'q.mul.priceList', p: { item: goods[at]!, n } }, p * n, rng, [...others, p + n], [
      { kind: 'stat-table', title: { k: 'q.mul.priceTitle' }, rows: [goods, prices], head: 'row' },
    ])
  }
  if (roll < 0.55) {
    const p = rng.int(2, cap)
    const n = rng.int(2, cap)
    return wordQuestion(kpId, d, `price-${p}-${n}`, { k: 'q.mul.price', p: { item, p, n } }, p * n, rng, [p + n, p * (n + 1), p * (n - 1)])
  }
  if (roll < 0.7) {
    const n = rng.int(2, cap)
    const k = rng.int(2, Math.min(cap, 5))
    const rows = Array.from({ length: k }, () => ({ icon: item, count: n }))
    return wordQuestion(kpId, d, `rows-${k}-${n}`, { k: 'q.mul.rows', p: { item, k, n } }, k * n, rng, [k + n, n * (k + 1), n * (k - 1)], [
      { kind: 'compare-rows', rows },
    ])
  }
  if (roll < 0.85) {
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

// ── 解决连续两问的问题（7~9 的表内乘、除法，例 6 与练一练）──
// 前一个问题的答案是后一个问题的条件：先乘后除（摩天轮与碰碰车、铅笔分给同学）、先除后加（中性笔）、
// 先除后乘（盆花摆图案）、连除（书分给小组）。中间结果和最后的答案都在表内。
/** 先乘后除的三个数：a × b 的积再除以 c，c 和 a、b 都不一样（不然第二问一眼就看出来），积和商都在表内 */
const MUL_DIV: [number, number, number][] = []
for (let a = 2; a <= 9; a++)
  for (let b = 2; b <= 9; b++)
    for (let c = 2; c <= 9; c++) if (c !== a && c !== b && (a * b) % c === 0 && (a * b) / c >= 2 && (a * b) / c <= 9) MUL_DIV.push([a, b, c])

function genTwoQuestions(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-06-two-questions'
  const roll = rng.next()
  const ask = (sig: string, key: string, p: Record<string, number>, value: number, smart: number[], type: 'multiply' | 'divide' = 'divide'): Question =>
    numberQuestion({ kpId, type, difficulty: d, sig, stem: [{ kind: 'text', text: { k: key, p } }], value, rng, min: 1, max: 81, smart })
  if (roll < 0.45) {
    // 先乘后除：每个轿厢坐 a 人、坐满 b 个，碰碰车 c 人一辆（例 6）；一盒铅笔 a 支、b 盒平均分给 c 名同学（做一做）
    const [a, b, c] = rng.pick(MUL_DIV)
    const v = (a * b) / c
    const wheel = roll < 0.25
    return ask(`${wheel ? 'wheel' : 'pencils'}-${a}-${b}-${c}`, wheel ? 'q.two.wheel' : 'q.two.pencils', { a, b, c }, v, [a * b, a * c, v + 1, v - 1])
  }
  if (roll < 0.65) {
    // 先除后加：t 元买 n 支铅笔，中性笔贵 k 元（练一练 5）
    const n = rng.int(2, 9)
    const each = rng.int(2, 9)
    const k = rng.int(1, 9)
    const t = n * each
    return ask(`pen-${t}-${n}-${k}`, 'q.two.penPrice', { t, n, k }, each + k, [each, t + k, each + k + 1, each + k - 1])
  }
  if (roll < 0.85) {
    // 先除后乘：每 a 盆摆一个图案要 t 盆；花不够，每个图案改用 b 盆（比 a 少），一共几盆（练一练 6）
    const a = rng.int(3, 9)
    const groups = rng.int(2, 9)
    const b = rng.int(2, a - 1)
    const t = a * groups
    return ask(`flowers-${a}-${t}-${b}`, 'q.two.flowers', { a, t, b }, groups * b, [groups, t, t - a + b, groups * a], 'multiply')
  }
  // 连除：t 本书平均分给 g 个小组，每组 k 人，每人几本（练一练 6）
  const g = rng.int(2, 4)
  const k = rng.int(2, 4)
  const each = rng.int(2, Math.floor(9 / k))
  const t = g * k * each
  return ask(`books-${t}-${g}-${k}`, 'q.two.books', { t, g, k }, each, [t / g, t / k, each + 1, g * k])
}
defineGenerator('m2s1-06-two-questions', genTwoQuestions)
