import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 长度单位：认识厘米和米（选单位 / 换算 / 比较）、量一量（读尺子）
// ─────────────────────────────────────────────────────────────

/** 选单位用的常见物体：厘米级 / 米级，dim 是「长」还是「高」 */
const CM_ITEMS: { icon: string; n: number; dim: 'long' | 'tall' }[] = [
  { icon: '✏️', n: 18, dim: 'long' },
  { icon: '🖍️', n: 8, dim: 'long' },
  { icon: '📏', n: 20, dim: 'long' },
  { icon: '📱', n: 15, dim: 'long' },
  { icon: '📖', n: 26, dim: 'long' },
  { icon: '🥢', n: 25, dim: 'long' },
  { icon: '🐜', n: 1, dim: 'long' },
  { icon: '🥚', n: 5, dim: 'tall' },
]
const M_ITEMS: { icon: string; n: number; dim: 'long' | 'tall' }[] = [
  { icon: '🚪', n: 2, dim: 'tall' },
  { icon: '🌳', n: 10, dim: 'tall' },
  { icon: '🛏️', n: 2, dim: 'long' },
  { icon: '🚌', n: 12, dim: 'long' },
  { icon: '🦒', n: 5, dim: 'tall' },
  { icon: '🐘', n: 3, dim: 'tall' },
  { icon: '✈️', n: 40, dim: 'long' },
  { icon: '🚂', n: 25, dim: 'long' },
]

const CM: LStr = { k: 'opt.cm' }
const M: LStr = { k: 'opt.m' }

/** 选单位：铅笔长约 18（厘米 / 米） */
function genUnit(kpId: string, d: Difficulty, rng: RNG): Question {
  const useCm = rng.chance(0.5)
  const item = rng.pick(useCm ? CM_ITEMS : M_ITEMS)
  return labelQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `unit-${item.icon}`,
    stem: [{ kind: 'text', text: { k: 'q.len.unit', p: { item: item.icon, dim: { k: `opt.${item.dim}` }, n: item.n } } }],
    correct: useCm ? CM : M,
    distractors: [useCm ? M : CM],
    rng,
  })
}

/** 换算：n 米 = ? 厘米 / n00 厘米 = ? 米 */
function genConvert(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(1, d === 1 ? 5 : 9)
  if (rng.chance(0.5)) {
    return numberQuestion({
      kpId,
      type: 'length',
      difficulty: d,
      sig: `m2cm-${n}`,
      stem: [{ kind: 'text', text: { k: 'q.len.m2cm', p: { n } } }],
      value: n * 100,
      rng,
      min: 1,
      max: 1000,
      smart: [n * 10, n, n * 100 + 10, n * 100 - 10],
    })
  }
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `cm2m-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.len.cm2m', p: { n: n * 100 } } }],
    value: n,
    rng,
    min: 1,
    max: 100,
    smart: [n * 10, n + 1, n - 1, n * 100],
  })
}

/** 几米几厘米 = 几厘米（1 米 30 厘米 = 130 厘米） */
function genCompound(kpId: string, d: Difficulty, rng: RNG): Question {
  const m = rng.int(1, 3)
  const cm = rng.int(1, 9) * 10 + (d === 3 ? rng.int(0, 9) : 0)
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `mcm-${m}-${cm}`,
    stem: [{ kind: 'text', text: { k: 'q.len.compound', p: { m, cm } } }],
    value: m * 100 + cm,
    rng,
    min: 1,
    max: 400,
    smart: [m + cm, m * 10 + cm, m * 100 + cm + 10, m * 100 + cm - 10],
  })
}

/** 比较：a 米 ⬜ b 厘米（要先把米换成厘米） */
function genCompare(kpId: string, d: Difficulty, rng: RNG): Question {
  const m = rng.int(1, d === 3 ? 9 : 5)
  // 厘米那边：一半刻意等于（m×100），其余在 ±（10~90）内
  let cm = m * 100
  if (!rng.chance(0.25)) cm += (rng.chance(0.5) ? 1 : -1) * rng.int(1, 9) * 10
  const mFirst = rng.chance(0.5)
  const left = mFirst ? m * 100 : cm
  const right = mFirst ? cm : m * 100
  const correct = left > right ? '>' : left < right ? '<' : '='
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty: d,
    sig: `cmp-${mFirst ? 'm' : 'c'}-${m}-${cm}`,
    stem: [
      { kind: 'text', text: { k: 'q.len.cmpFill' } },
      { kind: 'text', text: { k: mFirst ? 'q.len.cmpMcm' : 'q.len.cmpCmM', p: mFirst ? { m, cm } : { cm, m } } },
    ],
    correct,
    distractors: ['>', '<', '='].filter((s) => s !== correct),
    rng,
  })
}

defineGenerator('m2s1-05-cm-m', (d, rng) => {
  const kpId = 'm2s1-05-cm-m'
  const roll = rng.next()
  if (d === 1) return roll < 0.55 ? genUnit(kpId, d, rng) : genConvert(kpId, d, rng)
  if (roll < 0.3) return genUnit(kpId, d, rng)
  if (roll < 0.55) return genConvert(kpId, d, rng)
  if (roll < 0.8) return genCompare(kpId, d, rng)
  return genCompound(kpId, d, rng)
})

/**
 * 量一量：尺子上压着一条线段，读出长度。
 * d1 线段从 0 刻度开始；d2 / d3 不从 0 开始，要用「右端 − 左端」。
 */
function genMeasure(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-05-measure'
  const length = d === 1 ? 8 : 10
  const len = rng.int(2, d === 1 ? 7 : 8)
  const from = d === 1 ? 0 : rng.int(1, length - len)
  const to = from + len
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `ruler-${length}-${from}-${to}`,
    stem: [
      { kind: 'text', text: { k: 'q.len.measure' } },
      { kind: 'ruler', length, from, to },
    ],
    value: len,
    rng,
    min: 1,
    max: length,
    smart: [to, len + 1, len - 1, from],
  })
}
defineGenerator('m2s1-05-measure', genMeasure)
