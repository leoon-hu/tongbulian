import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 长度单位：认识厘米和米（选单位 / 1 米 = 100 厘米 / 剪绳子 / 比较）、量一量（读尺子）；线段在 segment.ts
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

/** 换算：二上只有「1 米 = 100 厘米」（p58），不出 2 米以上的换算（三位数到二下才学） */
function genConvert(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    return numberQuestion({
      kpId,
      type: 'length',
      difficulty: d,
      sig: 'm2cm-1',
      stem: [{ kind: 'text', text: { k: 'q.len.m2cm', p: { n: 1 } } }],
      value: 100,
      rng,
      min: 1,
      max: 100,
      smart: [10, 1, 60],
    })
  }
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: 'cm2m-100',
    stem: [{ kind: 'text', text: { k: 'q.len.cm2m', p: { n: 100 } } }],
    value: 1,
    rng,
    min: 1,
    max: 100,
    smart: [10, 100, 2],
  })
}

/** 一根 1 米的绳子剪去 n 厘米，还剩几厘米（p60 第 8 题） */
function genCut(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? rng.int(1, 9) * 10 : rng.int(5, 95)
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `cut-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.len.cut', p: { n } } }],
    value: 100 - n,
    rng,
    min: 1,
    max: 99,
    smart: [n, 110 - n, 90 - n],
  })
}

/**
 * 比较（p59 练一练 3「10 米○10 厘米、100 厘米○1 米、80 厘米○1 米」）：数都在 100 以内，
 * 想「1 米 = 100 厘米」就能比，不用把几米换成几百厘米。
 */
function genCompare(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  let m: number
  let cm: number
  if (roll < 0.3) {
    // n 米 ○ n 厘米：数一样，单位不一样
    m = rng.int(2, 30)
    cm = m
  } else if (roll < 0.75) {
    // n 厘米 ○ 1 米（n 可能正好是 100）
    m = 1
    cm = rng.chance(0.25) ? 100 : rng.int(d === 1 ? 2 : 5, 9) * 10 + (d === 1 ? 0 : rng.int(0, 9))
  } else {
    // 几米 ○ 不到 100 厘米
    m = rng.int(2, 9)
    cm = rng.int(10, 99)
  }
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

/** 认识厘米和米：选单位（例 4）、1 米 = 100 厘米、剪绳子、比较 */
defineGenerator('m2s1-05-cm-m', (d, rng) => {
  const kpId = 'm2s1-05-cm-m'
  const roll = rng.next()
  if (roll < 0.35) return genUnit(kpId, d, rng)
  if (roll < 0.5) return genConvert(kpId, d, rng)
  if (roll < 0.7) return genCut(kpId, d, rng)
  return genCompare(kpId, d, rng)
})

/**
 * 量一量：尺子上压着一条线段，读出长度。
 * 例 1 从 0 刻度量起；练一练也有不从 0 起的（p60、p66「从 2 量到 8」），数一数中间有几个 1 厘米。第 1 档四分之一不从 0 起。
 */
function genMeasure(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-05-measure'
  const length = d === 1 ? 8 : 10
  const len = rng.int(2, d === 1 ? 7 : 8)
  const shifted = d === 1 ? rng.chance(0.25) : true
  const from = shifted ? rng.int(1, length - len) : 0
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
