import type { Difficulty, Question, ShapeKind } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { labelQuestion, numberQuestion } from './common'
import { FLAT_SHAPES, SOLID_SHAPES } from '@/content/math/shared/labels'

/**
 * 图形认识：
 * - 认名字：显示一个图形，选它的名称
 * - 数一数：一堆图形里，数指定图形有几个
 */
function makeShapeGen(kpId: string, family: ShapeKind[]) {
  return (d: Difficulty, rng: RNG): Question => {
    // 数图形（d≥2 更常见）
    if (rng.chance(d === 1 ? 0.3 : 0.5)) {
      const target = rng.pick(family)
      const others = family.filter((s) => s !== target)
      const targetCount = rng.int(1, 4)
      const shapes: ShapeKind[] = Array.from({ length: targetCount }, () => target)
      const noise = rng.int(2, 4)
      for (let i = 0; i < noise; i++) shapes.push(rng.pick(others))
      const mixed = rng.shuffle(shapes)
      return numberQuestion({
        kpId,
        type: 'shape-match',
        difficulty: d,
        sig: `cnt-${target}-${mixed.join(',')}`,
        stem: [
          { kind: 'text', text: { k: 'q.countShape', p: { shape: { k: `shape.${target}` } } } },
          { kind: 'shape-group', shapes: mixed },
        ],
        value: targetCount,
        rng,
        min: 0,
        max: 9,
      })
    }
    // 认名字
    const shape = rng.pick(family)
    const correct = { k: `shape.${shape}` }
    const distractors = rng
      .shuffle(family.filter((s) => s !== shape))
      .slice(0, 3)
      .map((s) => ({ k: `shape.${s}` }))
    return labelQuestion({
      kpId,
      type: 'shape-match',
      difficulty: d,
      sig: `name-${shape}`,
      stem: [
        { kind: 'text', text: { k: 'q.whatShape' } },
        { kind: 'shape', shape },
      ],
      correct,
      distractors,
      rng,
    })
  }
}

/**
 * 图形拼组（拼一拼）：用一排排小正方形拼成矩形。
 * - 数一数：拼成的图形用了几个小正方形（= 行 × 列）
 * - 认一认：拼成的是正方形还是长方形
 */
function genCompose(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const rows = rng.int(2, d === 1 ? 2 : 3)
    const cols = rng.int(2, d === 1 ? 3 : d === 2 ? 4 : 5)
    return numberQuestion({
      kpId,
      type: 'shape-match',
      difficulty: d,
      sig: `tiles-cnt-${rows}x${cols}`,
      stem: [
        { kind: 'text', text: { k: 'q.tilesCount' } },
        { kind: 'tiles', rows, cols },
      ],
      value: rows * cols,
      rng,
      min: 0,
      max: 25,
    })
  }
  // 正方形：行=列；长方形：列>行
  const isSquare = rng.chance(0.5)
  const side = rng.int(2, 4)
  const rows = side
  const cols = isSquare ? side : side + rng.int(1, 2)
  const correctKind: ShapeKind = isSquare ? 'square' : 'rectangle'
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `tiles-name-${rows}x${cols}`,
    stem: [
      { kind: 'text', text: { k: 'q.tilesName' } },
      { kind: 'tiles', rows, cols },
    ],
    correct: { k: `shape.${correctKind}` },
    distractors: rng
      .shuffle(FLAT_SHAPES.filter((s) => s !== correctKind))
      .slice(0, 3)
      .map((s) => ({ k: `shape.${s}` })),
    rng,
  })
}

defineGenerator('s1-03-solid-shapes', makeShapeGen('s1-03-solid-shapes', SOLID_SHAPES))

const flatBase = makeShapeGen('s2-01-flat-shapes', FLAT_SHAPES)
defineGenerator('s2-01-flat-shapes', (d, rng) =>
  rng.chance(0.3) ? genCompose('s2-01-flat-shapes', d, rng) : flatBase(d, rng),
)
