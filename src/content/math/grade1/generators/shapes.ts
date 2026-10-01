import type { Difficulty, GeoFig, GeoItem, GeoPt, GeoTone, LStr, Question, ShapeKind } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { labelQuestion, numberQuestion } from './common'
import { FLAT_SHAPES, SOLID_SHAPES } from '@/content/math/shared/labels'

const name = (s: ShapeKind): LStr => ({ k: `shape.${s}` })
const isFlat = (s: ShapeKind): boolean => FLAT_SHAPES.includes(s)

/** 平面图形的样子随机：颜色、角度（课本一下 p1 有斜放的正方形、各种方向和形状的三角形），免得孩子靠颜色和摆法认 */
function flatLook(rng: RNG): { tone: number; turn: number; form: number } {
  return { tone: rng.int(0, 5), turn: rng.chance(0.4) ? rng.pick([15, 30, 45, -20, 90, 180]) : 0, form: rng.int(0, 2) }
}

/**
 * 认名字 / 数一数（立体图形一上 p68–72、平面图形一下 p1–2 的「分一分」）：
 * - 认名字：显示一个图形，选它的名称
 * - 数一数：一堆图形里，数指定图形有几个
 */
function nameOrCount(kpId: string, family: ShapeKind[], d: Difficulty, rng: RNG, count: boolean): Question {
  if (count) {
    const target = rng.pick(family)
    const others = family.filter((s) => s !== target)
    const targetCount = rng.int(1, 4)
    const shapes: ShapeKind[] = Array.from({ length: targetCount }, () => target)
    const noise = rng.int(2, 4)
    for (let i = 0; i < noise; i++) shapes.push(rng.pick(others))
    const mixed = rng.shuffle(shapes)
    const looks = mixed.map(() => flatLook(rng))
    const flat = isFlat(target)
    return numberQuestion({
      kpId,
      type: 'shape-match',
      difficulty: d,
      sig: `cnt-${target}-${mixed.join(',')}`,
      stem: [
        { kind: 'text', text: { k: 'q.countShape', p: { shape: name(target) } } },
        flat
          ? { kind: 'shape-group', shapes: mixed, tones: looks.map((l) => l.tone), turns: looks.map((l) => l.turn), forms: looks.map((l) => l.form) }
          : { kind: 'shape-group', shapes: mixed },
      ],
      value: targetCount,
      rng,
      min: 0,
      max: 9,
    })
  }
  const shape = rng.pick(family)
  const look = flatLook(rng)
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `name-${shape}-${isFlat(shape) ? `${shape === 'triangle' ? look.form : ''}-${look.turn}` : ''}`,
    stem: [
      { kind: 'text', text: { k: 'q.whatShape' } },
      isFlat(shape) ? { kind: 'shape', shape, ...look } : { kind: 'shape', shape },
    ],
    correct: name(shape),
    distractors: rng
      .shuffle(family.filter((s) => s !== shape))
      .slice(0, 3)
      .map(name),
    rng,
  })
}

/**
 * 认识立体图形（一上第三单元）：认名字、在组合图里数某一种（p72 练一练），
 * 以及课本说的特点「球能向四面八方滚动」（p68）
 */
defineGenerator('s1-03-solid-shapes', (d, rng) => {
  const kpId = 's1-03-solid-shapes'
  const roll = rng.next()
  if (roll < 0.12) {
    return labelQuestion({
      kpId,
      type: 'shape-match',
      difficulty: d,
      sig: 'roll',
      stem: [{ kind: 'text', text: { k: 'q.rollAnyWay' } }],
      correct: name('sphere'),
      distractors: (['cuboid', 'cube', 'cylinder'] as ShapeKind[]).map(name),
      rng,
    })
  }
  return nameOrCount(kpId, SOLID_SHAPES, d, rng, roll < (d === 1 ? 0.4 : 0.55))
})

// ── 认识平面图形（一下第一单元）──

/** 用哪个物体可以画出这个图形（p1 例 1 描立体图形的面，p6 练一练 1）：三角形要三棱柱，画不了，不出；干扰项里不放也能画出来的物体 */
const TRACE: Partial<Record<ShapeKind, { solid: ShapeKind; others: ShapeKind[] }>> = {
  rectangle: { solid: 'cuboid', others: ['cube', 'cylinder', 'sphere'] },
  square: { solid: 'cube', others: ['cylinder', 'sphere'] },
  circle: { solid: 'cylinder', others: ['cuboid', 'cube'] },
}
function traceQuestion(kpId: string, d: Difficulty, rng: RNG): Question {
  const shape = rng.pick(['rectangle', 'square', 'circle'] as ShapeKind[])
  const t = TRACE[shape]!
  const look = flatLook(rng)
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `trace-${shape}`,
    stem: [
      { kind: 'text', text: { k: 'q.traceFrom' } },
      { kind: 'shape', shape, tone: look.tone, turn: shape === 'circle' ? 0 : look.turn },
    ],
    correct: name(t.solid),
    distractors: t.others.map(name),
    rng,
  })
}

/** 拼一拼（p3 例 2）：两个 / 四个同样的图形拼在一起，拼成的是什么图形。图里每一块一种颜色，块与块之间有边线 */
interface Join {
  id: string
  part: ShapeKind
  n: number
  result: ShapeKind
  w: number
  h: number
  pieces: GeoPt[][]
  alt: string
}
const JOINS: Join[] = [
  { id: 'tri-para', part: 'triangle', n: 2, result: 'parallelogram', w: 5, h: 3, pieces: [[[1, 0], [5, 0], [4, 3]], [[1, 0], [4, 3], [0, 3]]], alt: '两个同样的三角形拼在一起' },
  { id: 'tri-square', part: 'triangle', n: 2, result: 'square', w: 3, h: 3, pieces: [[[0, 0], [3, 0], [3, 3]], [[0, 0], [3, 3], [0, 3]]], alt: '两个同样的三角形拼在一起' },
  { id: 'tri-rect', part: 'triangle', n: 2, result: 'rectangle', w: 5, h: 3, pieces: [[[0, 0], [5, 0], [5, 3]], [[0, 0], [5, 3], [0, 3]]], alt: '两个同样的三角形拼在一起' },
  { id: 'tri-tri', part: 'triangle', n: 2, result: 'triangle', w: 6, h: 3, pieces: [[[0, 3], [3, 3], [3, 0]], [[3, 3], [6, 3], [3, 0]]], alt: '两个同样的三角形拼在一起' },
  { id: 'rect-rect', part: 'rectangle', n: 2, result: 'rectangle', w: 6, h: 2, pieces: [[[0, 0], [3, 0], [3, 2], [0, 2]], [[3, 0], [6, 0], [6, 2], [3, 2]]], alt: '两个同样的长方形拼在一起' },
  { id: 'rect-square', part: 'rectangle', n: 2, result: 'square', w: 4, h: 4, pieces: [[[0, 0], [4, 0], [4, 2], [0, 2]], [[0, 2], [4, 2], [4, 4], [0, 4]]], alt: '两个同样的长方形拼在一起' },
  { id: 'sq2-rect', part: 'square', n: 2, result: 'rectangle', w: 4, h: 2, pieces: [[[0, 0], [2, 0], [2, 2], [0, 2]], [[2, 0], [4, 0], [4, 2], [2, 2]]], alt: '两个同样的正方形拼在一起' },
  { id: 'sq4-square', part: 'square', n: 4, result: 'square', w: 4, h: 4, pieces: [[[0, 0], [2, 0], [2, 2], [0, 2]], [[2, 0], [4, 0], [4, 2], [2, 2]], [[0, 2], [2, 2], [2, 4], [0, 4]], [[2, 2], [4, 2], [4, 4], [2, 4]]], alt: '四个同样的正方形拼在一起' },
]
const JOIN_TONES: GeoTone[] = ['a', 'b', 'c', 'd']
const JOIN_RESULTS: ShapeKind[] = ['rectangle', 'square', 'triangle', 'parallelogram']

function joinQuestion(kpId: string, d: Difficulty, rng: RNG): Question {
  const j = rng.pick(JOINS)
  const tones = rng.shuffle(JOIN_TONES)
  const items: GeoItem[] = j.pieces.map((pts, i) => ({ t: 'poly', pts, fill: tones[i % tones.length]! }))
  const fig: GeoFig = { w: j.w, h: j.h, px: 34, items }
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `join-${j.id}`,
    stem: [
      { kind: 'text', text: { k: 'q.joinedShape', p: { n: j.n, part: name(j.part) } } },
      { kind: 'geo', figs: [fig], alt: j.alt },
    ],
    correct: name(j.result),
    distractors: JOIN_RESULTS.filter((s) => s !== j.result).map(name),
    rng,
  })
}

/**
 * 七巧板（p4 例 3「一套七巧板有 7 块，其中有 1 个正方形、1 个平行四边形……」）：4 × 4 的正方形切成
 * 2 个大三角形、1 个中三角形、2 个小三角形、1 个正方形、1 个平行四边形
 */
const TANGRAM: { pts: GeoPt[]; fill: GeoTone; kind: ShapeKind }[] = [
  { pts: [[0, 0], [4, 0], [2, 2]], fill: 'a', kind: 'triangle' },
  { pts: [[0, 0], [2, 2], [0, 4]], fill: 'b', kind: 'triangle' },
  { pts: [[4, 2], [4, 4], [2, 4]], fill: 'c', kind: 'triangle' },
  { pts: [[4, 0], [4, 2], [3, 1]], fill: 'd', kind: 'triangle' },
  { pts: [[1, 3], [2, 2], [3, 3]], fill: 'c', kind: 'triangle' },
  { pts: [[2, 2], [3, 1], [4, 2], [3, 3]], fill: 'soft', kind: 'square' },
  { pts: [[0, 4], [1, 3], [3, 3], [2, 4]], fill: 'd', kind: 'parallelogram' },
]
function tangramQuestion(kpId: string, d: Difficulty, rng: RNG): Question {
  const fig: GeoFig = { w: 4, h: 4, px: 40, items: TANGRAM.map((p) => ({ t: 'poly', pts: p.pts, fill: p.fill })) }
  const geo = { kind: 'geo' as const, figs: [fig], alt: '一套七巧板拼成的正方形' }
  const what = rng.pick(['all', 'triangle', 'triangle', 'square', 'parallelogram'] as const)
  const value = what === 'all' ? TANGRAM.length : TANGRAM.filter((p) => p.kind === what).length
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `tangram-${what}`,
    stem: [
      { kind: 'text', text: what === 'all' ? { k: 'q.tangramPieces' } : { k: 'q.tangramCount', p: { shape: name(what) } } },
      geo,
    ],
    value,
    rng,
    min: 0,
    max: 9,
    smart: [value + 1, value - 1, 4, 7],
  })
}

/**
 * 认识平面图形（一下 p1–7）：认名字、数某一种（例 1 画一画分一分）、用哪个物体能画出这个图形（练一练 1）、
 * 两个同样的图形拼成什么（例 2）、七巧板有几块 / 几个三角形（例 3）——都在第 1 档。图形的颜色、方向随机。
 */
defineGenerator('s2-01-flat-shapes', (d, rng) => {
  const kpId = 's2-01-flat-shapes'
  const roll = rng.next()
  if (roll < 0.22) return nameOrCount(kpId, FLAT_SHAPES, d, rng, false)
  if (roll < 0.42) return nameOrCount(kpId, FLAT_SHAPES, d, rng, true)
  if (roll < 0.6) return traceQuestion(kpId, d, rng)
  if (roll < 0.85) return joinQuestion(kpId, d, rng)
  return tangramQuestion(kpId, d, rng)
})
