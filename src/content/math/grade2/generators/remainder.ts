import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 有余数的除法：认识余数（看图分东西，分几份 / 剩几个）、有余数除法的计算（商、余数、最大余数、求被除数）
// ─────────────────────────────────────────────────────────────

const ITEMS = ['🍪', '🍬', '🍎', '⭐', '🎈', '🌸', '🧁', '🥟', '🍓', '🎁']

/** 取一组有余数的数：被除数 t、除数 n，t ÷ n 余数不为 0 */
function withRemainder(rng: RNG, divisorMax: number, dividendMax: number): { t: number; n: number } {
  const n = rng.int(2, divisorMax)
  const q = rng.int(1, Math.floor((dividendMax - 1) / n))
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

function genRemCalc(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-02-rem-calc'
  const roll = rng.next()
  if (d >= 2 && roll < 0.15) {
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
  if (d === 3 && roll < 0.35) {
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
  const { t, n } = withRemainder(rng, d === 1 ? 5 : 9, d === 1 ? 30 : 81)
  const quotient = Math.floor(t / n)
  const rem = t % n
  const askQuotient = rng.chance(0.5)
  return numberQuestion({
    kpId,
    type: 'divide',
    difficulty: d,
    sig: `${askQuotient ? 'q' : 'r'}-${t}-${n}`,
    stem: [
      { kind: 'expr', expr: `${t} ÷ ${n}` },
      { kind: 'text', text: { k: askQuotient ? 'q.rem.quotient' : 'q.rem.remainder' } },
    ],
    value: askQuotient ? quotient : rem,
    rng,
    min: 0,
    max: 81,
    smart: askQuotient ? [rem, quotient + 1, quotient - 1, t - n] : [quotient, rem + 1, rem - 1, n],
  })
}
defineGenerator('m2s2-02-rem-calc', genRemCalc)
