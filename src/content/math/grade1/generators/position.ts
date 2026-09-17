import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { labelQuestion, numberQuestion } from './common'

const ANIMALS = ['🐰', '🐶', '🐱', '🐼', '🦊', '🐷', '🐸', '🐵', '🐯', '🦁']

type Axis = 'lr' | 'ud' | 'fb'
const AXES: Axis[] = ['lr', 'ud', 'fb']

/** 每个方位轴的词条键：起点/终点方向词、两端「最X」、邻居前/后。 */
const AXIS_WORDS: Record<
  Axis,
  { fromStart: string; fromEnd: string; sideStart: string; sideEnd: string; relPrev: string; relNext: string }
> = {
  lr: { fromStart: 'dir.left', fromEnd: 'dir.right', sideStart: 'side.left', sideEnd: 'side.right', relPrev: 'rel.left', relNext: 'rel.right' },
  ud: { fromStart: 'dir.up', fromEnd: 'dir.down', sideStart: 'side.up', sideEnd: 'side.down', relPrev: 'rel.up', relNext: 'rel.down' },
  fb: { fromStart: 'dir.front', fromEnd: 'dir.back', sideStart: 'side.front', sideEnd: 'side.back', relPrev: 'rel.front', relNext: 'rel.back' },
}

/**
 * 位置（上下前后左右 / 第几）：一排(左右/前后)或一列(上下)小动物。
 * - which：某个从起点数排第几（序数概念）
 * - from：从起点/终点数第 k 个是谁
 * - endmost：谁在最起点/最终点
 * - neighbor：某个的前一个/后一个是谁（建立方位）
 */
function genPosition(d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? 4 : d === 2 ? 5 : 6
  const items = rng.shuffle(ANIMALS).slice(0, n)
  const axis = rng.pick(AXES)
  const w = AXIS_WORDS[axis]
  const kind = rng.pick(['which', 'from', 'endmost', 'neighbor'] as const)

  if (kind === 'which') {
    const idx = rng.int(0, n - 1)
    return numberQuestion({
      kpId: 's1-00-position',
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
    text = { k: 'q.posFrom', p: { k, from: { k: fromEnd ? w.fromEnd : w.fromStart } } }
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
    kpId: 's1-00-position',
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
