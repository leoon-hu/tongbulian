import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 表内除法：平均分（看图）、用口诀求商（2~6 / 7~9）、用除法解决问题
// ─────────────────────────────────────────────────────────────

const ITEMS = ['🍎', '🍬', '⭐', '🎈', '🍪', '🌸', '🎁', '🧁', '🥟', '🍓']

/** 除法算式题：a ÷ b = ?，干扰项取相邻的商、被除数减除数、乘了 */
export function quotientQuestion(kpId: string, d: Difficulty, dividend: number, divisor: number, rng: RNG): Question {
  const value = dividend / divisor
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `${dividend}/${divisor}`,
    stem: [{ kind: 'expr', expr: `${dividend} ÷ ${divisor} = ?` }],
    value,
    rng,
    min: 0,
    max: 81,
    smart: [value + 1, value - 1, dividend - divisor, divisor],
  })
}

/** 填被除数 / 除数：? ÷ b = q、a ÷ ? = q */
function missingPart(kpId: string, d: Difficulty, divisor: number, quotient: number, rng: RNG): Question {
  const dividend = divisor * quotient
  const first = rng.chance(0.5)
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: first ? `?/${divisor}=${quotient}` : `${dividend}/?=${quotient}`,
    stem: [{ kind: 'expr', expr: first ? `? ÷ ${divisor} = ${quotient}` : `${dividend} ÷ ? = ${quotient}` }],
    value: first ? dividend : divisor,
    rng,
    min: 1,
    max: 81,
    smart: first ? [divisor + quotient, dividend + divisor, dividend - divisor] : [divisor + 1, divisor - 1, quotient],
  })
}

/** 想乘法算除法：因为 a × b = c，所以 c ÷ a = ? */
function fromMultiplication(kpId: string, d: Difficulty, a: number, b: number, rng: RNG): Question {
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `frommul-${a}x${b}`,
    stem: [{ kind: 'text', text: { k: 'q.div.fromMul', p: { a, b, c: a * b } } }],
    value: b,
    rng,
    min: 1,
    max: 81,
    smart: [a, a * b, b + 1, b - 1],
  })
}

// ── 平均分（看图） ──
function genShare(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-03-share'
  const item = rng.pick(ITEMS)
  const k = rng.int(2, d === 1 ? 3 : 5) // 份数 / 人数
  const each = rng.int(2, d === 1 ? 4 : 5) // 每份几个
  const t = k * each
  const pic: StemPart = { kind: 'objects', icon: item, count: t }
  const roll = rng.next()
  if (roll < 0.4) {
    return numberQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `each-${t}-${k}`,
      stem: [{ kind: 'text', text: { k: 'q.div.shareEach', p: { item, t, k } } }, pic],
      value: each,
      rng,
      min: 1,
      max: 12,
      smart: [k, t - k, each + 1, each - 1],
    })
  }
  if (roll < 0.7) {
    return numberQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `groups-${t}-${each}`,
      stem: [{ kind: 'text', text: { k: 'q.div.shareGroups', p: { item, t, n: each } } }, pic],
      value: k,
      rng,
      min: 1,
      max: 12,
      smart: [each, t - each, k + 1, k - 1],
    })
  }
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `kids-${t}-${k}`,
    stem: [{ kind: 'text', text: { k: 'q.div.shareKids', p: { item, t, k } } }, pic],
    value: each,
    rng,
    min: 1,
    max: 12,
    smart: [k, t - k, each + 1, each - 1],
  })
}
defineGenerator('m2s1-03-share', genShare)

// ── 认识除法算式：被除数 / 除数 / 商 各在哪、平均分怎么写成除法 ──
function genDivParts(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-03-div-parts'
  const divisor = rng.int(2, 6)
  const quotient = rng.int(2, 6)
  const dividend = divisor * quotient
  if (d >= 2 && rng.chance(0.4)) {
    // 把 t 个平均分成 k 份每份 q 个，写成除法算式
    const item = rng.pick(ITEMS)
    return labelQuestion({
      kpId,
      type: 'divide',
      difficulty: d,
      sig: `write-${dividend}-${divisor}`,
      stem: [
        { kind: 'text', text: { k: 'q.div.writeEq', p: { item, t: dividend, k: divisor, q: quotient } } },
        { kind: 'objects', icon: item, count: dividend },
      ],
      correct: `${dividend} ÷ ${divisor} = ${quotient}`,
      distractors: [`${divisor} × ${quotient} = ${dividend}`, `${dividend} - ${divisor} = ${dividend - divisor}`, `${dividend} + ${divisor} = ${dividend + divisor}`],
      rng,
    })
  }
  const part = rng.pick(['dividend', 'divisor', 'quotient'] as const)
  const value = part === 'dividend' ? dividend : part === 'divisor' ? divisor : quotient
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `${part}-${dividend}-${divisor}`,
    stem: [
      { kind: 'expr', expr: `${dividend} ÷ ${divisor} = ${quotient}` },
      { kind: 'text', text: { k: `q.div.part.${part}` } },
    ],
    value,
    rng,
    min: 1,
    max: 36,
    smart: [dividend, divisor, quotient].filter((n) => n !== value),
  })
}
defineGenerator('m2s1-03-div-parts', genDivParts)

// ── 用 2~6 的乘法口诀求商 ──
defineGenerator('m2s1-03-div-6', (d, rng) => {
  const kpId = 'm2s1-03-div-6'
  const divisor = rng.int(2, d === 1 ? 5 : 6)
  const quotient = rng.int(1, d === 1 ? 5 : 6)
  const roll = rng.next()
  if (d === 3 && roll < 0.3) return missingPart(kpId, d, divisor, quotient, rng)
  if (d === 1 && roll < 0.3) return fromMultiplication(kpId, d, divisor, quotient, rng)
  return quotientQuestion(kpId, d, divisor * quotient, divisor, rng)
})

// ── 用 7、8、9 的乘法口诀求商（7~9 的表内乘、除法）──
defineGenerator('m2s1-06-div-9', (d, rng) => {
  const kpId = 'm2s1-06-div-9'
  const big = d === 1 ? 7 : d === 2 ? 8 : rng.pick([7, 8, 9])
  const other = rng.int(1, 9)
  const roll = rng.next()
  if (d === 3 && roll < 0.3) return missingPart(kpId, d, big, other, rng)
  // 除数与商谁是 7~9 都有
  return rng.chance(0.5) ? quotientQuestion(kpId, d, big * other, big, rng) : quotientQuestion(kpId, d, big * other, other, rng)
})

// ── 用除法解决问题（1~6 的表内除法） ──
export function word(kpId: string, d: Difficulty, sig: string, text: LStr, value: number, rng: RNG, smart: number[]): Question {
  return numberQuestion({ kpId, type: 'divide', difficulty: d, sig, stem: [{ kind: 'text', text }], value, rng, min: 1, max: 81, smart })
}

function genDivSolve(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-03-div-solve'
  const cap = d === 1 ? 5 : 6 // 这一单元只到 6 的口诀
  const item = rng.pick(ITEMS)
  const k = rng.int(2, cap)
  const each = rng.int(2, cap)
  const t = k * each
  const roll = rng.next()
  if (roll < 0.25) return word(kpId, d, `pp-${t}-${k}`, { k: 'q.div.perPerson', p: { item, t, k } }, each, rng, [k, t - k, each + 1, each - 1])
  if (roll < 0.5) return word(kpId, d, `bag-${t}-${each}`, { k: 'q.div.bags', p: { item, t, n: each } }, k, rng, [each, t - each, k + 1, k - 1])
  if (roll < 0.7) return word(kpId, d, `price-${t}-${k}`, { k: 'q.div.priceEach', p: { item, total: t, n: k } }, each, rng, [k, t - k, each + 1, each - 1])
  return word(kpId, d, `buy-${t}-${each}`, { k: 'q.div.canBuy', p: { item, p: each, money: t } }, k, rng, [each, t - each, k + 1, k - 1])
}
defineGenerator('m2s1-03-div-solve', genDivSolve)
