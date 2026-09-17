import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { choicesFrom, labelKey, labelQuestion, sigId } from './common'

const ICONS = ['🍎', '🍌', '🐶', '🐱', '⭐', '🎈', '🚗', '🌸', '🐟', '🍓']

/**
 * 比多少（实物一一对应）：两行不同实物，问哪个多。
 * 选项用实物本身，直观；有时两行一样多。
 */
export function compareConcreteQuestion(
  kpId: string,
  difficulty: Difficulty,
  max: number,
  rng: RNG,
): Question {
  const [iconA, iconB] = rng.shuffle(ICONS).slice(0, 2) as [string, string]
  const a = rng.int(1, max)
  // 约 12% 一样多，其余保证不等
  let b = rng.int(1, max)
  if (rng.chance(0.12)) b = a
  else if (b === a) b = a === max ? a - 1 : a + 1
  const correct: LStr = a > b ? iconA : a < b ? iconB : { k: 'opt.same' }
  const stem: StemPart[] = [
    { kind: 'text', text: { k: 'q.whichMore' } },
    { kind: 'compare-rows', rows: [{ icon: iconA, count: a }, { icon: iconB, count: b }] },
  ]
  // 三个选项固定为：上行实物 / 下行实物 / 一样多
  const options: LStr[] = [iconA, iconB, { k: 'opt.same' }]
  const ck = labelKey(correct)
  const { choices, correctId } = choicesFrom(correct, options.filter((o) => labelKey(o) !== ck), rng)
  return {
    id: sigId(kpId, `cc-${iconA}${a}-${iconB}${b}`),
    kpId,
    type: 'compare',
    difficulty,
    stem,
    input: 'choice',
    answer: { kind: 'choice', choiceId: correctId },
    choices,
  }
}

/**
 * 比大小（数）：x ⬜ y，填 >、<、=。
 * 大跨度时配数轴帮助判断。
 */
export function compareNumberQuestion(
  kpId: string,
  difficulty: Difficulty,
  max: number,
  rng: RNG,
): Question {
  const x = rng.int(0, max)
  // 约 5% 相等，其余保证不等
  let y = rng.int(0, max)
  if (rng.chance(0.05)) y = x
  else if (y === x) y = x === max ? x - 1 : x + 1
  const correct = x > y ? '>' : x < y ? '<' : '='
  const stem: StemPart[] = [
    { kind: 'text', text: { k: 'q.fillCompare' } },
    { kind: 'expr', expr: `${x} ⬜ ${y}` },
  ]
  if (difficulty >= 2 && max > 20) {
    stem.push({ kind: 'number-line', from: 0, to: max, marks: [x, y] })
  }
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty,
    sig: `cn-${x}-${y}`,
    stem,
    correct,
    distractors: ['>', '<', '='].filter((s) => s !== correct),
    rng,
  })
}

defineGenerator('s1-00-compare', (d, rng) =>
  compareConcreteQuestion('s1-00-compare', d, d === 1 ? 5 : d === 2 ? 8 : 10, rng),
)

defineGenerator('s2-03-compare-100', (d, rng) =>
  compareNumberQuestion('s2-03-compare-100', d, d === 1 ? 20 : d === 2 ? 50 : 100, rng),
)
