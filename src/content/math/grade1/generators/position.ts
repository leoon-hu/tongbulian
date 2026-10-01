import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { labelQuestion, numberQuestion } from './common'

const ANIMALS = ['🐰', '🐶', '🐱', '🐼', '🦊', '🐷', '🐸', '🐵', '🐯', '🦁']

// 一上数学游戏（p6–9）只教前面 / 后面、左边 / 右边和「我左边的第 3 个同学」「我是第 4 个」；
// 上 / 下没有专门教（只在「左上角」「第 2 层」里出现过），所以只出前后、左右两个方向。
type Axis = 'lr' | 'fb'
const AXES: Axis[] = ['lr', 'fb']

/** 每个方位轴的词条键：起点/终点方向词、两端「最X」、邻居前/后。 */
const AXIS_WORDS: Record<
  Axis,
  { fromStart: string; fromEnd: string; sideStart: string; sideEnd: string; relPrev: string; relNext: string }
> = {
  lr: { fromStart: 'dir.left', fromEnd: 'dir.right', sideStart: 'side.left', sideEnd: 'side.right', relPrev: 'rel.left', relNext: 'rel.right' },
  fb: { fromStart: 'dir.front', fromEnd: 'dir.back', sideStart: 'side.front', sideEnd: 'side.back', relPrev: 'rel.front', relNext: 'rel.back' },
}

/**
 * 前后左右（数学游戏）：一排小动物，横排标左右或前后。
 * - which：某个从起点数排第几（序数概念）
 * - from：从起点/终点数第 k 个是谁
 * - endmost：谁在最起点/最终点
 * - neighbor：某个的前一个/后一个是谁（建立方位）
 */
/** 各档一排几个小动物 */
const LINE_SIZE: Record<Difficulty, number> = { 1: 4, 2: 5, 3: 6 }

function genPosition(d: Difficulty, rng: RNG): Question {
  return positionQuestion('s1-00-position', d, LINE_SIZE[d], rng.pick(['which', 'from', 'endmost', 'neighbor'] as const), rng.pick(AXES), rng)
}

function positionQuestion(kpId: string, d: Difficulty, n: number, kind: 'which' | 'from' | 'endmost' | 'neighbor', axis: Axis, rng: RNG): Question {
  const items = rng.shuffle(ANIMALS).slice(0, n)
  const w = AXIS_WORDS[axis]

  if (kind === 'which') {
    const idx = rng.int(0, n - 1)
    return numberQuestion({
      kpId,
      type: 'position',
      difficulty: d,
      sig: `which-${axis}-${items.join('')}-${idx}`,
      stem: [
        { kind: 'text', text: { k: 'q.posWhich', p: { item: items[idx]!, from: { k: w.fromStart } } } },
        { kind: 'lineup', items, highlight: idx, axis },
      ],
      value: idx + 1,
      rng,
      min: 1,
      max: n,
    })
  }

  let text: LStr
  let correct: string
  let sig: string
  let highlight: number | undefined
  if (kind === 'from') {
    const fromEnd = rng.chance(0.5)
    const k = rng.int(1, n)
    text = { k: 'q.posFrom', p: { nth: { k: `q.posNum.${k}` }, from: { k: fromEnd ? w.fromEnd : w.fromStart } } }
    correct = fromEnd ? items[n - k]! : items[k - 1]!
    sig = `from-${axis}-${fromEnd ? 'e' : 's'}-${items.join('')}-${k}`
  } else if (kind === 'endmost') {
    const atEnd = rng.chance(0.5)
    text = { k: 'q.posEndmost', p: { side: { k: atEnd ? w.sideEnd : w.sideStart } } }
    correct = atEnd ? items[n - 1]! : items[0]!
    sig = `end-${axis}-${items.join('')}-${atEnd ? 'E' : 'S'}`
  } else {
    const idx = rng.int(1, n - 2) // 保证前后都有邻居
    const next = rng.chance(0.5)
    text = { k: 'q.posNeighbor', p: { item: items[idx]!, rel: { k: next ? w.relNext : w.relPrev } } }
    correct = next ? items[idx + 1]! : items[idx - 1]!
    highlight = idx
    sig = `nb-${axis}-${items.join('')}-${idx}-${next ? 'n' : 'p'}`
  }

  const stem: StemPart[] = [
    { kind: 'text', text },
    { kind: 'lineup', items, highlight, axis },
  ]
  return labelQuestion({
    kpId,
    type: 'position',
    difficulty: d,
    sig,
    stem,
    correct,
    distractors: items.filter((it) => it !== correct).slice(0, 3),
    rng,
  })
}

defineGenerator('s1-00-position', genPosition)

/** 排队时某个的前面 / 后面有几个（一上 p19「有 5 人排队，排第 2，他前面有□人，后面有□人」）：前后一排 */
function aheadQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const items = rng.shuffle(ANIMALS).slice(0, n)
  const idx = rng.int(0, n - 1)
  const ahead = rng.chance(0.5)
  const value = ahead ? idx : n - 1 - idx
  return numberQuestion({
    kpId,
    type: 'position',
    difficulty: d,
    sig: `ahead-${ahead ? 'f' : 'b'}-${items.join('')}-${idx}`,
    stem: [
      { kind: 'text', text: { k: ahead ? 'q.posAhead' : 'q.posBehind', p: { item: items[idx]! } } },
      { kind: 'lineup', items, highlight: idx, axis: 'fb' },
    ],
    value,
    rng,
    min: 0,
    max: n,
    smart: [idx + 1, n - idx, n - 1 - value],
  })
}

/**
 * 第几（一上第一单元 p19）：排队排第几、他前面 / 后面有几人（前后一排）；从左边 / 右边数第几个是谁、排第几（左右一排）。
 * 5 以内（这一单元认识的数）。
 */
defineGenerator('s1-01-ordinal', (d, rng) => {
  const kpId = 's1-01-ordinal'
  const roll = rng.next()
  if (roll < 0.25) return positionQuestion(kpId, d, 5, 'which', 'fb', rng)
  if (roll < 0.55) return aheadQuestion(kpId, d, 5, rng)
  if (roll < 0.8) return positionQuestion(kpId, d, 5, 'from', 'lr', rng)
  return positionQuestion(kpId, d, 5, 'which', 'lr', rng)
})

/**
 * 「从哪边数第几个是谁」的全部说法（语料收集用）：第几个用汉字写，不是朗读里的「数字槽」，
 * 随机抽样没碰到的组合拆不回小片段、只能退 TTS，所以方向 × 第一到第六逐个收齐。
 */
export function everyPosFrom(): LStr[] {
  const out: LStr[] = []
  for (const axis of AXES) {
    for (const from of [AXIS_WORDS[axis].fromStart, AXIS_WORDS[axis].fromEnd]) {
      for (let k = 1; k <= LINE_SIZE[3]; k++) out.push({ k: 'q.posFrom', p: { nth: { k: `q.posNum.${k}` }, from: { k: from } } })
    }
  }
  return out
}
