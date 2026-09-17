import type { Difficulty, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

export const CATEGORIES: { key: string; name: string; items: string[] }[] = [
  { key: 'fruit', name: '水果', items: ['🍎', '🍌', '🍓', '🍇', '🍊', '🍉'] },
  { key: 'animal', name: '小动物', items: ['🐶', '🐱', '🐰', '🐼', '🐷', '🐸'] },
  { key: 'vehicle', name: '交通工具', items: ['🚗', '🚕', '🚌', '✈️', '🚂', '🚲'] },
]

/**
 * 分类与整理：
 * - 数一类：一堆混合物体里，数某一类有几个
 * - 找不同：四个里挑出不同类的那个
 */
function genSorting(d: Difficulty, rng: RNG): Question {
  const [catA, catB] = rng.shuffle(CATEGORIES).slice(0, 2) as [
    (typeof CATEGORIES)[number],
    (typeof CATEGORIES)[number],
  ]

  if (rng.chance(0.6)) {
    // 数一类有几个
    const a = rng.int(2, 5)
    const b = rng.int(2, 5)
    const picksA = rng.shuffle(catA.items).slice(0, a)
    const picksB = rng.shuffle(catB.items).slice(0, b)
    const items = rng.shuffle([...picksA, ...picksB])
    return numberQuestion({
      kpId: 'm2s1-01-sorting',
      type: 'sort',
      difficulty: d,
      sig: `cnt-${catA.key}-${items.join('')}`,
      stem: [
        { kind: 'text', text: { k: 'q.countCategory', p: { category: { k: `cat.${catA.key}` } } } },
        { kind: 'scatter', items },
      ],
      value: a,
      rng,
      min: 0,
      max: a + b,
      smart: [b, a + b, a + 1, a - 1],
    })
  }

  // 找不同：三个同类 + 一个异类
  const sameThree = rng.shuffle(catA.items).slice(0, 3)
  const odd = rng.pick(catB.items)
  return labelQuestion({
    kpId: 'm2s1-01-sorting',
    type: 'sort',
    difficulty: d,
    sig: `odd-${sameThree.join('')}-${odd}`,
    stem: [{ kind: 'text', text: { k: 'q.oddOne' } }],
    correct: odd,
    distractors: sameThree,
    rng,
  })
}

defineGenerator('m2s1-01-sorting', genSorting)
