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

/** 两个数比大小：x ○ y，填 >、<、=（课本一上起都写 ○，G9）；numberLine = 下面配一条数轴（from~to） */
export function compareTwoQuestion(kpId: string, difficulty: Difficulty, x: number, y: number, rng: RNG, numberLine?: [number, number]): Question {
  const correct = x > y ? '>' : x < y ? '<' : '='
  const stem: StemPart[] = [
    { kind: 'text', text: { k: 'q.fillCompare' } },
    { kind: 'expr', expr: `${x} ○ ${y}` },
  ]
  if (numberLine) stem.push({ kind: 'number-line', from: numberLine[0], to: numberLine[1], marks: [x, y] })
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

/** 比大小（数）：min~max 里的两个数，约 5% 相等 */
export function compareNumberQuestion(kpId: string, difficulty: Difficulty, max: number, rng: RNG, min = 0): Question {
  const x = rng.int(min, max)
  let y = rng.int(min, max)
  if (rng.chance(0.05)) y = x
  else if (y === x) y = x === max ? x - 1 : x + 1
  return compareTwoQuestion(kpId, difficulty, x, y, rng)
}

// 数学游戏里的比多少（p5「男生多 1 个」、p9 抢椅子）：课本这几页的数不超过 6
defineGenerator('s1-00-compare', (d, rng) => compareConcreteQuestion('s1-00-compare', d, d === 1 ? 5 : 6, rng))

/** 两位数比大小（一下 p33 例 5：42 ○ 37 先比十位，23 ○ 25 十位相同比个位；做一做 29 ○ 30、81 ○ 18、37 ○ 73） */
export function twoDigitCompare(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  let x: number
  let y: number
  if (roll < 0.4) {
    // 十位相同，比个位
    const t = rng.int(1, 9) * 10
    x = t + rng.int(0, 9)
    y = t + rng.int(0, 9)
    if (y === x && !rng.chance(0.1)) y = x % 10 === 9 ? x - 1 : x + 1
  } else if (roll < 0.55) {
    // 两个数字对调（81 ○ 18）
    const a = rng.int(1, 9)
    let b = rng.int(1, 9)
    if (b === a) b = a === 9 ? 8 : a + 1
    x = a * 10 + b
    y = b * 10 + a
  } else if (roll < 0.62) {
    // 和 100 比
    x = rng.int(90, 99)
    y = 100
    if (rng.chance(0.5)) [x, y] = [y, x]
  } else {
    // 十位不同
    x = rng.int(10, 99)
    y = rng.int(10, 99)
    if (Math.floor(x / 10) === Math.floor(y / 10)) y = ((Math.floor(y / 10) + rng.int(1, 8) - 1) % 9) * 10 + 10 + (y % 10)
  }
  // 第 2 档起配数轴（p34 例 6 在数轴上排 87、31、25、99）
  return compareTwoQuestion(kpId, d, x, y, rng, d >= 2 ? [0, 100] : undefined)
}
