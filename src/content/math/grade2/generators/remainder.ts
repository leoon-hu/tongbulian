import type { DivLine, Difficulty, LStr, Question, SeqCell, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 有余数的除法（二下第一单元）：认识余数（看图分东西）、有余数除法的计算（除法竖式、余数比除数小、求被除数）、
// 用有余数的除法解决问题（进一、去尾、周期规律）。课本全单元都是用乘法口诀试商，商都在 9 以内。
// ─────────────────────────────────────────────────────────────

const ITEMS = ['🍪', '🍬', '🍎', '⭐', '🎈', '🌸', '🧁', '🥟', '🍓', '🎁']

/** 取一组有余数的数：被除数 t、除数 n，t ÷ n 余数不为 0，商在 1…9（课本只用乘法口诀试商） */
export function withRemainder(rng: RNG, divisorMax: number, dividendMax: number, quotientMin = 1): { t: number; n: number } {
  const n = rng.int(2, divisorMax)
  const q = rng.int(Math.min(quotientMin, 9), Math.max(Math.min(quotientMin, 9), Math.min(9, Math.floor((dividendMax - 1) / n))))
  const r = rng.int(1, n - 1)
  return { t: n * q + r, n }
}

function genRemainder(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-02-remainder'
  const item = rng.pick(ITEMS)
  const { t, n } = withRemainder(rng, d === 1 ? 4 : 6, d === 1 ? 15 : 24)
  const quotient = Math.floor(t / n)
  const rem = t % n
  const pic: StemPart = { kind: 'objects', icon: item, count: t }
  const roll = rng.next()
  const kind = roll < 0.25 ? 'groups' : roll < 0.5 ? 'left' : roll < 0.75 ? 'eachKid' : 'kidLeft'
  const askQuotient = kind === 'groups' || kind === 'eachKid'
  const text: LStr =
    kind === 'groups'
      ? { k: 'q.rem.groups', p: { item, t, n } }
      : kind === 'left'
        ? { k: 'q.rem.left', p: { item, t, n } }
        : kind === 'eachKid'
          ? { k: 'q.rem.eachKid', p: { item, t, k: n } }
          : { k: 'q.rem.kidLeft', p: { item, t, k: n } }
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `${kind}-${t}-${n}`,
    stem: [{ kind: 'text', text }, pic],
    value: askQuotient ? quotient : rem,
    rng,
    min: 0,
    max: 24,
    smart: askQuotient ? [rem, quotient + 1, quotient - 1, n] : [quotient, rem + 1, rem - 1, n],
  })
}
defineGenerator('m2s2-02-remainder', genRemainder)

/** 两位数（或一位数）被除数在竖式里最后一位的位置 */
const lastCol = (t: number): number => String(t).length - 1

/**
 * 有余数除法的计算（例 3、例 4）：照课本用除法竖式——问商时竖式里商那一格空着；问余数时竖式写好商和「除数 × 商」的积，
 * 最后一行（余数）空着（第 2 档起有一半只写题目、不写过程）。另有余数要比除数小（例 2）、根据商和余数求被除数（例 3「13 = 4 × 3 + 1」）。
 */
function genRemCalc(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-02-rem-calc'
  const roll = rng.next()
  if (roll < 0.15) {
    // 除数是 b，余数最大是几
    const b = rng.int(2, 9)
    return numberQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `maxrem-${b}`,
      stem: [{ kind: 'text', text: { k: 'q.rem.maxRem', p: { b } } }],
      value: b - 1,
      rng,
      min: 0,
      max: 9,
      smart: [b, b + 1, 1],
    })
  }
  if (roll < (d === 1 ? 0.25 : 0.32)) {
    // 一个数除以 b 商 q 余 r，这个数是几
    const b = rng.int(2, 9)
    const q = rng.int(1, 9)
    const r = rng.int(1, b - 1)
    return numberQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `dividend-${b}-${q}-${r}`,
      stem: [{ kind: 'text', text: { k: 'q.rem.dividend', p: { b, q, r } } }],
      value: b * q + r,
      rng,
      min: 1,
      max: 90,
      smart: [b * q, b * q - r, b + q + r, b * r + q],
    })
  }
  const { t, n } = withRemainder(rng, 9, 90, 2)
  const quotient = Math.floor(t / n)
  const rem = t % n
  const end = lastCol(t)
  if (rng.chance(0.55)) {
    // 商是几：竖式里商那一格空着（和被除数一样宽，不透露商有几位）
    const fig: StemPart = { kind: 'long-division', divisor: n, dividend: t, quotient: { text: '?', end, w: end + 1 } }
    return numberQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `q-${t}-${n}`,
      stem: [{ kind: 'text', text: { k: 'q.rem.calcQ', p: { t, n } } }, fig],
      value: quotient,
      rng,
      min: 0,
      max: 9,
      smart: [quotient + 1, quotient - 1, rem, n],
    })
  }
  // 余数是几：写好商和积，余数那一行空着；第 2 档起一半只写题目
  const worked = d === 1 || rng.chance(0.5)
  const rows: DivLine[] = [
    { text: String(n * quotient), end, line: true },
    { text: '?', end, w: 1 },
  ]
  const fig: StemPart = worked
    ? { kind: 'long-division', divisor: n, dividend: t, quotient: { text: String(quotient), end }, rows }
    : { kind: 'long-division', divisor: n, dividend: t }
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `r-${t}-${n}-${worked ? 'w' : 'p'}`,
    stem: [{ kind: 'text', text: { k: 'q.rem.calcR', p: { t, n } } }, fig],
    value: rem,
    rng,
    min: 0,
    max: 9,
    smart: [quotient, rem + 1, rem - 1, n],
  })
}
defineGenerator('m2s2-02-rem-calc', genRemCalc)

// ── 用有余数的除法解决问题（例 5 进一 / 去尾、做一做、例 6 周期规律）──

/** 周期规律里的珠子（选项问颜色） */
const BEADS: { icon: string; color: string }[] = [
  { icon: '🔴', color: 'red' },
  { icon: '🟡', color: 'yellow' },
  { icon: '🔵', color: 'blue' },
  { icon: '🟢', color: 'green' },
]

function genRemSolve(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-02-rem-solve'
  const roll = rng.next()
  const ask = (sig: string, text: LStr, value: number, smart: number[]): Question =>
    numberQuestion({ kpId, type: 'divide', difficulty: d, sig, stem: [{ kind: 'text', text }], value, rng, min: 1, max: 12, smart })
  if (roll < 0.35) {
    // 进一：装下全部蛋糕要几个盒子（例 5）、至少要几条船
    const { t, n } = withRemainder(rng, d === 1 ? 6 : 9, 60)
    const q = Math.floor(t / n)
    return rng.chance(0.55)
      ? ask(`cake-${t}-${n}`, { k: 'q.rem.cakeBoxes', p: { t, n } }, q + 1, [q, q + 2, t % n])
      : ask(`boats-${t}-${n}`, { k: 'q.rem.boats', p: { t, n } }, q + 1, [q, q + 2, t % n])
  }
  if (roll < 0.65) {
    // 去尾：可以装满几盒（做一做「20 个面包，3 个装一盒」）、最多可以买几盒（「一盒 9 元，30 元」）
    const { t, n } = withRemainder(rng, 9, 60)
    const q = Math.floor(t / n)
    return rng.chance(0.5)
      ? ask(`bread-${t}-${n}`, { k: 'q.rem.breadFull', p: { t, n } }, q, [q + 1, t % n, q - 1])
      : ask(`buy-${t}-${n}`, { k: 'q.rem.buyBoxes', p: { p: n, m: t } }, q, [q + 1, t % n, q - 1])
  }
  // 周期规律：按「1 黄 2 红」这样一组一组摆，第 k 个是什么颜色（例 6、做一做的珠子）
  const size = d === 1 ? rng.int(2, 3) : rng.int(3, 4)
  const colors = rng.shuffle(BEADS).slice(0, size === 4 ? rng.int(2, 3) : 2)
  // 一组：每种颜色至少一个，按颜色连着排（「1 黄 2 红」「2 蓝 3 红」）
  const counts = colors.map(() => 1)
  for (let i = colors.length; i < size; i++) counts[rng.int(0, colors.length - 1)]! += 1
  const group = colors.flatMap((c, i) => Array.from({ length: counts[i]! }, () => c))
  const k = rng.int(size * 2 + 1, Math.min(40, size * 9 + size - 1))
  const target = group[(k - 1) % size]!
  const shown = Array.from({ length: size * 2 + Math.min(2, size - 1) }, (_, i) => group[i % size]!.icon)
  const cells: SeqCell[] = [...shown.map((label): SeqCell => ({ kind: 'item', label })), { kind: 'item', label: '…' }]
  const others = colors.filter((c) => c.color !== target.color)
  const extra = BEADS.filter((b) => !colors.includes(b))[0]!
  return labelQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `pattern-${group.map((b) => b.icon).join('')}-${k}`,
    stem: [
      { kind: 'text', text: { k: 'q.rem.pattern', p: { k } } },
      { kind: 'sequence', cells },
    ],
    correct: { k: `cat.${target.color}` },
    distractors: [...others, ...(others.length < 2 ? [extra] : [])].map((c) => ({ k: `cat.${c.color}` })),
    rng,
  })
}
defineGenerator('m2s2-02-rem-solve', genRemSolve)
