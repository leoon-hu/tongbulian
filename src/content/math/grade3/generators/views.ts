import type { Difficulty, LStr, Question, ShapeKind, StemPart, ViewKind } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 观察物体（三上一）：从不同方向观察物体、猜一猜是什么立体图形（含骰子）、剪开长方体纸盒（展开图、能不能折成正方体）。
// 课本没有小正方体搭的组合：只有单个立体图形和「圆柱立在长方体上 / 旁边」。
// ─────────────────────────────────────────────────────────────

type Side = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'
const side = (s: Side): LStr => ({ k: `m3.side.${s}` })
const shapeName = (s: ShapeKind): LStr => ({ k: `shape.${s}` })

/** 单个立体图形从前面 / 上面 / 左面看到的平面图形（按 ShapeGlyph 的画法：长方体三个面都不是正方形、圆柱高 > 直径） */
const FLAT_VIEW: Record<'cube' | 'cuboid' | 'cylinder' | 'sphere', Record<'front' | 'top' | 'left', ShapeKind>> = {
  cube: { front: 'square', top: 'square', left: 'square' },
  cuboid: { front: 'rectangle', top: 'rectangle', left: 'rectangle' },
  cylinder: { front: 'rectangle', top: 'circle', left: 'rectangle' },
  sphere: { front: 'circle', top: 'circle', left: 'circle' },
}
const FLAT_OPTIONS: ShapeKind[] = ['square', 'rectangle', 'circle']
const SOLIDS = ['cube', 'cuboid', 'cylinder', 'sphere'] as const

/** 立体图形 + 一个方向 → 看到什么形状（正方形 / 长方形 / 圆） */
function genFlatView(kpId: string, d: Difficulty, rng: RNG): Question {
  const solid = rng.pick(d === 1 ? SOLIDS : SOLIDS)
  const from = rng.pick(['front', 'top', 'left'] as const)
  const seen = FLAT_VIEW[solid][from]
  return labelQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `flat-${solid}-${from}`,
    stem: [{ kind: 'text', text: { k: 'm3.view.from', p: { side: side(from), shape: shapeName(solid) } } }, { kind: 'shape', shape: solid }],
    correct: shapeName(seen),
    distractors: FLAT_OPTIONS.filter((s) => s !== seen).map(shapeName),
    rng,
  })
}

/** 谜语：几个方向看到的样子 → 是什么立体图形（长方体那条不放正方体当选项：正方形也是特殊的长方形） */
const RIDDLES: { key: string; answer: (typeof SOLIDS)[number]; exclude?: (typeof SOLIDS)[number] }[] = [
  { key: 'm3.view.riddleCylinder', answer: 'cylinder' },
  { key: 'm3.view.riddleSphere', answer: 'sphere' },
  { key: 'm3.view.riddleCube', answer: 'cube' },
  { key: 'm3.view.riddleCuboid', answer: 'cuboid', exclude: 'cube' },
]
function genRiddle(kpId: string, d: Difficulty, rng: RNG): Question {
  const r = rng.pick(RIDDLES)
  return labelQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `riddle-${r.answer}`,
    stem: [{ kind: 'text', text: { k: r.key } }],
    correct: shapeName(r.answer),
    distractors: SOLIDS.filter((s) => s !== r.answer && s !== r.exclude).map(shapeName),
    rng,
  })
}

/** 从后面看和从哪面看一样（对面看到的一样）：后 ↔ 前、右 ↔ 左 */
function genSameAs(kpId: string, d: Difficulty, rng: RNG): Question {
  const [from, same] = rng.pick([
    ['back', 'front'],
    ['right', 'left'],
  ] as const)
  return labelQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `same-${from}`,
    stem: [{ kind: 'text', text: { k: 'm3.view.sameAs', p: { side: side(from) } } }, { kind: 'shape', shape: rng.pick(['cuboid', 'cylinder'] as const) }],
    correct: side(same),
    distractors: (['front', 'top', 'left'] as const).filter((s) => s !== same).map(side),
    rng,
  })
}

/** 横放的长方体：从前面 / 后面看是又长又扁的长方形，从左面 / 右面看是短长方形（例 1） */
function genLongBox(kpId: string, d: Difficulty, rng: RNG): Question {
  const from = rng.pick(['front', 'back', 'left', 'right'] as const)
  const answer: ViewKind = from === 'front' || from === 'back' ? 'rect-long' : 'rect-short'
  const items = rng.shuffle<ViewKind>(['rect-long', 'rect-short', 'square'])
  return numberQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `longbox-${from}-${items.join(',')}`,
    stem: [
      { kind: 'text', text: { k: 'm3.view.longBox', p: { side: side(from) } } },
      { kind: 'shape', shape: 'cuboid' },
      { kind: 'views', items, numbered: true },
    ],
    value: items.indexOf(answer) + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 组合体（圆柱立在长方体上 / 旁边）：从某个方向看是哪一幅（做一做 2、练习一 2） */
const SCENE_VIEWS: Record<'on' | 'beside', { side: Side; view: ViewKind }[]> = {
  on: [
    { side: 'front', view: 'on-front' },
    { side: 'left', view: 'on-side' },
    { side: 'top', view: 'on-top' },
  ],
  beside: [
    { side: 'front', view: 'beside-front' },
    { side: 'right', view: 'beside-right' },
    { side: 'top', view: 'beside-top' },
  ],
}
function genScene(kpId: string, d: Difficulty, rng: RNG): Question {
  const arrangement = d === 3 && rng.chance(0.5) ? 'beside' : 'on'
  const pick = rng.pick(SCENE_VIEWS[arrangement])
  const items = rng.shuffle(SCENE_VIEWS[arrangement].map((v) => v.view))
  return numberQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `scene-${arrangement}-${pick.side}-${items.join(',')}`,
    stem: [
      { kind: 'text', text: { k: 'm3.view.scene', p: { side: side(pick.side) } } },
      { kind: 'solid-scene', arrangement },
      { kind: 'views', items, numbered: true },
    ],
    value: items.indexOf(pick.view) + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

defineGenerator('m3s1-01-views', (d, rng) => {
  const kpId = 'm3s1-01-views'
  const roll = rng.next()
  if (d === 1) return roll < 0.6 ? genFlatView(kpId, d, rng) : roll < 0.8 ? genLongBox(kpId, d, rng) : genScene(kpId, d, rng)
  if (d === 2) return roll < 0.3 ? genRiddle(kpId, d, rng) : roll < 0.5 ? genSameAs(kpId, d, rng) : roll < 0.7 ? genLongBox(kpId, d, rng) : genScene(kpId, d, rng)
  return roll < 0.25 ? genRiddle(kpId, d, rng) : genScene(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 猜一猜是什么立体图形：看到一个面推立体图形（可能 / 不可能）、正方体的面、骰子相对两面和是 7
// ─────────────────────────────────────────────────────────────

/** 看到一个面 → 可能是 / 不可能是（选项里只有一个对的：看到正方形时长方体、圆柱也有可能，所以只问「不可能」） */
function genMaybe(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const answer = rng.pick(['sphere', 'cylinder'] as const)
    return labelQuestion({
      kpId,
      type: 'view',
      difficulty: d,
      sig: `maybe-circle-${answer}`,
      stem: [{ kind: 'text', text: { k: 'm3.guess.maybe', p: { face: shapeName('circle') } } }],
      correct: shapeName(answer),
      distractors: [shapeName('cube'), shapeName('cuboid')],
      rng,
    })
  }
  return labelQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: 'cannot-square',
    stem: [{ kind: 'text', text: { k: 'm3.guess.cannot', p: { face: shapeName('square') } } }],
    correct: shapeName('sphere'),
    distractors: [shapeName('cube'), shapeName('cuboid')],
    rng,
  })
}

/** 正方体 / 长方体有几个面、正方体的面是什么形状 */
function genFaces(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) {
    return labelQuestion({
      kpId,
      type: 'view',
      difficulty: d,
      sig: 'face-shape',
      stem: [{ kind: 'text', text: { k: 'm3.guess.faceShape' } }, { kind: 'shape', shape: 'cube' }],
      correct: shapeName('square'),
      distractors: [shapeName('rectangle'), shapeName('circle')],
      rng,
    })
  }
  const solid = rng.pick(['cube', 'cuboid'] as const)
  return numberQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `faces-${solid}`,
    stem: [{ kind: 'text', text: { k: 'm3.guess.faces', p: { shape: shapeName(solid) } } }, { kind: 'shape', shape: solid }],
    value: 6,
    rng,
    min: 1,
    max: 12,
    smart: [4, 8, 5],
  })
}

/** 骰子的三组相对面 */
const OPPOSITE: Record<Side, Side> = { front: 'back', back: 'front', top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

/** 骰子文字题：前面是 1，后面是几（相对两面和是 7） */
function genDiceText(kpId: string, d: Difficulty, rng: RNG): Question {
  const known = rng.pick(['front', 'back', 'top', 'bottom', 'left', 'right'] as const)
  const n = rng.int(1, 6)
  return numberQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `dice-${known}-${n}`,
    stem: [{ kind: 'text', text: { k: 'm3.guess.dice', p: { known: side(known), n, ask: side(OPPOSITE[known]) } } }],
    value: 7 - n,
    rng,
    min: 1,
    max: 6,
    smart: [n, 7 - n + 1, 7 - n - 1],
  })
}

/** 骰子图：前、上、右三面有数（互不相对），问后面 / 下面 / 左面是几 */
export function diceFaces(rng: RNG): { front: number; top: number; right: number } {
  const front = rng.int(1, 6)
  const top = rng.pick([1, 2, 3, 4, 5, 6].filter((x) => x !== front && x !== 7 - front))
  const right = rng.pick([1, 2, 3, 4, 5, 6].filter((x) => x !== front && x !== 7 - front && x !== top && x !== 7 - top))
  return { front, top, right }
}
function genDicePic(kpId: string, d: Difficulty, rng: RNG): Question {
  const f = diceFaces(rng)
  const ask = rng.pick(['back', 'bottom', 'left'] as const)
  const seenOn = OPPOSITE[ask] as 'front' | 'top' | 'right'
  const value = 7 - f[seenOn]
  return numberQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `dicepic-${f.front}${f.top}${f.right}-${ask}`,
    stem: [{ kind: 'text', text: { k: 'm3.guess.dicePic', p: { ask: side(ask) } } }, { kind: 'dice', ...f }],
    value,
    rng,
    min: 1,
    max: 6,
    smart: [f[seenOn], ...(['front', 'top', 'right'] as const).filter((s) => s !== seenOn).map((s) => 7 - f[s])],
  })
}

defineGenerator('m3s1-01-guess', (d, rng) => {
  const kpId = 'm3s1-01-guess'
  const roll = rng.next()
  if (d === 1) return roll < 0.45 ? genMaybe(kpId, d, rng) : roll < 0.75 ? genFaces(kpId, d, rng) : genDiceText(kpId, d, rng)
  if (d === 2) return roll < 0.3 ? genMaybe(kpId, d, rng) : roll < 0.7 ? genDiceText(kpId, d, rng) : genDicePic(kpId, d, rng)
  return roll < 0.3 ? genDiceText(kpId, d, rng) : genDicePic(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 剪开长方体纸盒：面、组、边；展开图上找和「前」相对的面；能不能折成正方体
// 能不能折、哪两格相对都是「滚方块」算出来的，不靠手工标（fold）
// ─────────────────────────────────────────────────────────────

/** 展开图：一行一个字符串，# 是一个面 */
type Net = string[]
export function netCells(net: Net): { r: number; c: number }[] {
  const out: { r: number; c: number }[] = []
  net.forEach((row, r) => [...row].forEach((ch, c) => ch === '#' && out.push({ r, c })))
  return out
}

type Face = 'D' | 'U' | 'N' | 'S' | 'E' | 'W'
interface Cube {
  D: Face
  U: Face
  N: Face
  S: Face
  E: Face
  W: Face
}
/** 往某个方向滚一格后，贴着地面的是原来哪个面（东 = 列 +1，南 = 行 +1） */
function roll(c: Cube, dir: 'E' | 'W' | 'S' | 'N'): Cube {
  switch (dir) {
    case 'E':
      return { ...c, D: c.E, W: c.D, U: c.W, E: c.U }
    case 'W':
      return { ...c, D: c.W, E: c.D, U: c.E, W: c.U }
    case 'S':
      return { ...c, D: c.S, N: c.D, U: c.N, S: c.U }
    case 'N':
      return { ...c, D: c.N, S: c.D, U: c.S, N: c.U }
  }
}

/**
 * 把展开图「滚」一遍：从第一格出发，滚到相邻的格子，记下每格贴地的是正方体的哪个面。
 * 六格落在六个不同的面上 = 能折成正方体；opposite[i] 是和第 i 格相对的那一格。
 */
export function fold(net: Net): { ok: boolean; opposite: number[] } {
  const cells = netCells(net)
  const faceOf: (Face | null)[] = cells.map(() => null)
  const index = (r: number, c: number): number => cells.findIndex((x) => x.r === r && x.c === c)
  const start: Cube = { D: 'D', U: 'U', N: 'N', S: 'S', E: 'E', W: 'W' }
  const queue: [number, Cube][] = [[0, start]]
  faceOf[0] = 'D'
  const steps: [number, number, 'E' | 'W' | 'S' | 'N'][] = [
    [0, 1, 'E'],
    [0, -1, 'W'],
    [1, 0, 'S'],
    [-1, 0, 'N'],
  ]
  while (queue.length) {
    const [i, cube] = queue.shift()!
    for (const [dr, dc, dir] of steps) {
      const j = index(cells[i]!.r + dr, cells[i]!.c + dc)
      if (j < 0 || faceOf[j] !== null) continue
      const next = roll(cube, dir)
      faceOf[j] = next.D
      queue.push([j, next])
    }
  }
  const OPP: Record<Face, Face> = { D: 'U', U: 'D', N: 'S', S: 'N', E: 'W', W: 'E' }
  const ok = cells.length === 6 && faceOf.every((f) => f !== null) && new Set(faceOf).size === 6
  const opposite = faceOf.map((f) => (f === null ? -1 : faceOf.indexOf(OPP[f])))
  return { ok, opposite }
}

/** 能折成正方体的：十一种里挑常见的（含课本附页的十字形、3+3 阶梯） */
export const CUBE_NETS: Net[] = [
  ['.#..', '####', '.#..'],
  ['..#.', '####', '..#.'],
  ['#...', '####', '#...'],
  ['#...', '####', '.#..'],
  ['#...', '####', '..#.'],
  ['#...', '####', '...#'],
  ['.#..', '####', '..#.'],
  ['##..', '.###', '...#'],
  ['##..', '.###', '..#.'],
  ['##...', '.##..', '..##.'],
  ['###..', '..###'],
]
/** 折不成的：两端同侧各一格（课本②）、有田字（课本③）、一行五格、凹字形 */
export const NOT_NETS: Net[] = [
  ['#..#', '####'],
  ['##..', '####'],
  ['#####', '#....'],
  ['#.#', '###', '#..'],
  ['.##.', '####'],
  ['###', '###'],
]

function genUnfoldCount(kpId: string, d: Difficulty, rng: RNG): Question {
  const pick = rng.pick([
    { key: 'm3.unfold.faces', value: 6, smart: [4, 8, 12] },
    { key: 'm3.unfold.groups', value: 3, smart: [2, 6, 4] },
    { key: 'm3.unfold.perGroup', value: 2, smart: [3, 4, 6] },
  ])
  return numberQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `count-${pick.key}`,
    stem: [{ kind: 'text', text: { k: pick.key } }, { kind: 'shape', shape: 'cuboid' }],
    value: pick.value,
    rng,
    min: 1,
    max: 12,
    smart: pick.smart,
  })
}

/** 展开图上标出「前」，其余格子标 1–5，问和「前」相对的是哪一格 */
function genOpposite(kpId: string, d: Difficulty, rng: RNG): Question {
  const net = rng.pick(d === 1 ? CUBE_NETS.slice(0, 3) : CUBE_NETS)
  const cells = netCells(net)
  const { opposite } = fold(net)
  const front = rng.int(0, cells.length - 1)
  const others = cells.map((_, i) => i).filter((i) => i !== front)
  const numberOf = new Map(others.map((i, k) => [i, k + 1]))
  const answer = numberOf.get(opposite[front]!)!
  const stem: StemPart[] = [
    { kind: 'text', text: { k: 'm3.unfold.opposite' } },
    { kind: 'net', cells: cells.map((c, i) => ({ ...c, label: i === front ? { k: 'm3.net.front' } : String(numberOf.get(i)) })) },
  ]
  return numberQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `opp-${net.join('/')}-${front}`,
    stem,
    value: answer,
    rng,
    min: 1,
    max: 5,
    input: 'choice',
  })
}

function genCanFold(kpId: string, d: Difficulty, rng: RNG): Question {
  const yes = rng.chance(0.5)
  const net = rng.pick(yes ? CUBE_NETS : NOT_NETS)
  return labelQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: `canfold-${net.join('/')}`,
    stem: [{ kind: 'text', text: { k: 'm3.unfold.canFold' } }, { kind: 'net', cells: netCells(net) }],
    correct: { k: yes ? 'm3.opt.can' : 'm3.opt.cannot' },
    distractors: [{ k: yes ? 'm3.opt.cannot' : 'm3.opt.can' }],
    rng,
  })
}

/**
 * 没开口的纸盒要剪开几条边（7：留 5 条让 6 个面连着，课本例 3 (1)，第 1 档就出）；
 * 第 3 档另有「长方体有几条边（12）」——课本没问（棱是五年级的内容），只留在第 3 档
 */
function genEdges(kpId: string, d: Difficulty, rng: RNG, cut = rng.chance(0.5)): Question {
  return numberQuestion({
    kpId,
    type: 'view',
    difficulty: d,
    sig: cut ? 'cut-edges' : 'edges',
    stem: [{ kind: 'text', text: { k: cut ? 'm3.unfold.cutEdges' : 'm3.unfold.edges' } }, { kind: 'shape', shape: 'cuboid' }],
    value: cut ? 7 : 12,
    rng,
    min: 1,
    max: 12,
    smart: cut ? [5, 6, 8] : [6, 8, 10],
  })
}

defineGenerator('m3s1-01-unfold', (d, rng) => {
  const kpId = 'm3s1-01-unfold'
  const roll = rng.next()
  if (d === 1)
    return roll < 0.15
      ? genEdges(kpId, d, rng, true)
      : roll < 0.5
        ? genUnfoldCount(kpId, d, rng)
        : roll < 0.75
          ? genOpposite(kpId, d, rng)
          : genCanFold(kpId, d, rng)
  if (d === 2) return roll < 0.1 ? genEdges(kpId, d, rng, true) : roll < 0.25 ? genUnfoldCount(kpId, d, rng) : roll < 0.6 ? genOpposite(kpId, d, rng) : genCanFold(kpId, d, rng)
  return roll < 0.4 ? genEdges(kpId, d, rng) : roll < 0.7 ? genOpposite(kpId, d, rng) : genCanFold(kpId, d, rng)
})
