import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { numberQuestion } from './common'
import { compareConcreteQuestion, compareNumberQuestion } from './comparison'

const ICONS = ['🍎', '🐶', '⭐', '🎈', '🚗', '🌸', '🐟', '🍓', '🦋', '🍭', '🐥', '🌻']

/** 数一数：一组同类实物，问一共几个。 */
export function countObjectsQuestion(
  kpId: string,
  difficulty: Difficulty,
  lo: number,
  hi: number,
  rng: RNG,
): Question {
  const icon = rng.pick(ICONS)
  const n = rng.int(lo, hi)
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty,
    sig: `co-${icon}-${n}`,
    stem: [
      { kind: 'text', text: { k: 'q.countAll' } },
      { kind: 'objects', icon, count: n },
    ],
    value: n,
    rng,
    min: 0,
    max: hi,
  })
}

/** 数的组成：X 个十和 Y 个一是几。 */
export function compositionQuestion(
  kpId: string,
  difficulty: Difficulty,
  tens: number,
  ones: number,
  rng: RNG,
): Question {
  const value = tens * 10 + ones
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty,
    sig: `comp-${tens}-${ones}`,
    stem: [{ kind: 'text', text: { k: 'q.composeTensOnes', p: { tens, ones } } }],
    value,
    rng,
    min: 0,
    max: 100,
    smart: [tens + ones, ones * 10 + tens, value + 10, value - 10],
  })
}

/** 相邻数：某数的前一个 / 后一个 / 多 1 / 少 1。 */
function neighborQuestion(
  kpId: string,
  difficulty: Difficulty,
  max: number,
  rng: RNG,
): Question {
  const n = rng.int(1, max - 1)
  const kind = rng.pick(['after', 'before', 'more', 'less'] as const)
  const value = kind === 'after' || kind === 'more' ? n + 1 : n - 1
  const text: LStr = {
    after: { k: 'q.after', p: { n } },
    before: { k: 'q.before', p: { n } },
    more: { k: 'q.more', p: { n } },
    less: { k: 'q.less', p: { n } },
  }[kind]
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty,
    sig: `nb-${kind}-${n}`,
    stem: [{ kind: 'text', text }],
    value,
    rng,
    min: 0,
    max,
    smart: [n, n + 1, n - 1, n + 10],
  })
}

// ── 注册 ──

// 数一数（10 以内）
defineGenerator('s1-00-count', (d, rng) =>
  countObjectsQuestion('s1-00-count', d, d, d === 1 ? 5 : d === 2 ? 8 : 10, rng),
)

// 1~5 的认识：数数 / 比多少（实物）/ 比大小（>、<、=）
defineGenerator('s1-01-num-5', (d, rng) => {
  const roll = rng.next()
  if (roll < 0.5) return countObjectsQuestion('s1-01-num-5', d, 1, 5, rng)
  if (roll < 0.75) return compareConcreteQuestion('s1-01-num-5', d, 5, rng)
  return compareNumberQuestion('s1-01-num-5', d, 5, rng)
})

// 6~10 的认识：数数 / 比多少（实物）/ 比大小（>、<、=）
defineGenerator('s1-02-num-10', (d, rng) => {
  const roll = rng.next()
  if (roll < 0.5) return countObjectsQuestion('s1-02-num-10', d, d === 1 ? 6 : 4, 10, rng)
  if (roll < 0.75) return compareConcreteQuestion('s1-02-num-10', d, 10, rng)
  return compareNumberQuestion('s1-02-num-10', d, 10, rng)
})

// 11~20 的认识：数的组成 / 比大小 / 数数
defineGenerator('s1-04-num-20', (d, rng) => {
  const roll = rng.next()
  if (roll < 0.5) return compositionQuestion('s1-04-num-20', d, 1, rng.int(1, 9), rng)
  if (roll < 0.8) return compareNumberQuestion('s1-04-num-20', d, 20, rng)
  return countObjectsQuestion('s1-04-num-20', d, 11, 20, rng)
})

// 100 以内的数：数的组成 / 相邻数
defineGenerator('s2-03-num-100', (d, rng) => {
  const maxTens = d === 1 ? 4 : d === 2 ? 7 : 9
  if (rng.chance(0.6)) {
    return compositionQuestion('s2-03-num-100', d, rng.int(1, maxTens), rng.int(0, 9), rng)
  }
  return neighborQuestion('s2-03-num-100', d, maxTens * 10 + 9, rng)
})
