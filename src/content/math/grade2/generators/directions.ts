import type { Difficulty, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 校园小导游（综合与实践）：认识东、南、西、北；校园小导游（平面图上按方向找地方）
// ─────────────────────────────────────────────────────────────

type Dir = 'east' | 'south' | 'west' | 'north'
const DIRS: Dir[] = ['east', 'south', 'west', 'north'] // 顺时针
const OPT: Record<Dir, string> = { east: 'opt.east', south: 'opt.south', west: 'opt.west', north: 'opt.north' }

const idx = (d: Dir): number => DIRS.indexOf(d)
const turn = (d: Dir, steps: number): Dir => DIRS[(idx(d) + steps + 4) % 4]!
/** 面向 d 时：后面是对面，右面是顺时针下一个，左面是逆时针下一个 */
const behind = (d: Dir): Dir => turn(d, 2)
const rightOf = (d: Dir): Dir => turn(d, 1)
const leftOf = (d: Dir): Dir => turn(d, -1)

/** 地图上北下南左西右东 */
const MAP: Record<'up' | 'down' | 'left' | 'right', Dir> = { up: 'north', down: 'south', left: 'west', right: 'east' }

function dirQuestion(d: Difficulty, sig: string, textKey: string, p: Record<string, { k: string }>, correct: Dir, rng: RNG): Question {
  return labelQuestion({
    kpId: 'm2s1-04-directions',
    type: 'position',
    difficulty: d,
    sig,
    stem: [{ kind: 'text', text: { k: textKey, p } }],
    correct: { k: OPT[correct] },
    distractors: DIRS.filter((x) => x !== correct).map((x) => ({ k: OPT[x] })),
    rng,
  })
}

/** 面向某方向时的前后左右（课本「前面、后面、左面、右面」） */
type Rel = 'front' | 'back' | 'left' | 'right'
const REL_KEY: Record<Rel, string> = { front: 'side.fFront', back: 'side.back', left: 'side.fLeft', right: 'side.fRight' }
const relOf = (facing: Dir, rel: Rel): Dir => (rel === 'front' ? facing : rel === 'back' ? behind(facing) : rel === 'left' ? leftOf(facing) : rightOf(facing))

/**
 * 认识东、南、西、北（p50–51）：东升西落；早晨面向太阳，前东后西、左北右南；面向某方向时的后面 / 左面 / 右面（记录单）；
 * 东西、南北相对；地图上北下南、左西右东。面向某方向的题是课本的重点，第 1 档就占四成多。
 */
function genDirections(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.15) {
    // 太阳从东边升起、西边落下
    const rise = rng.chance(0.5)
    return dirQuestion(d, rise ? 'sunrise' : 'sunset', rise ? 'q.dir.sunrise' : 'q.dir.sunset', {}, rise ? 'east' : 'west', rng)
  }
  if (roll < 0.33) {
    // 某方向的对面（东和西相对，南和北相对）
    const from = rng.pick(DIRS)
    return dirQuestion(d, `opp-${from}`, 'q.dir.opposite', { dir: { k: OPT[from] } }, behind(from), rng)
  }
  if (roll < 0.53) {
    // 地图：上北下南左西右东
    const side = rng.pick(['up', 'down', 'left', 'right'] as const)
    return dirQuestion(d, `map-${side}`, 'q.dir.map', { side: { k: `side.${side}` } }, MAP[side], rng)
  }
  if (roll < 0.7) {
    // 早晨面向太阳：前面是东，后面是西，左面是北，右面是南
    const rel = rng.pick(['front', 'back', 'left', 'right'] as const)
    return dirQuestion(d, `sun-${rel}`, 'q.dir.sun', { side: { k: REL_KEY[rel] } }, relOf('east', rel), rng)
  }
  // 面向某方向，后面 / 左面 / 右面是哪个方向（记录单「面向北，后面是（ ），左面是（ ），右面是（ ）」）
  const facing = rng.pick(DIRS)
  const rel = rng.pick(['back', 'left', 'right'] as const)
  return dirQuestion(d, `face-${facing}-${rel}`, 'q.dir.facing', { dir: { k: OPT[facing] }, side: { k: REL_KEY[rel] } }, relOf(facing, rel), rng)
}
defineGenerator('m2s1-04-directions', genDirections)

// ─────────────────────────────────────────────────────────────
// 校园小导游（p52「设计导游路线」）：在平面图上按方向找地方。平面图画成 3 × 3 的格子，
// 中间一处、东南西北各一处；表题写着「上北下南、左西右东」（课本的平面图上标着方向）。
// ─────────────────────────────────────────────────────────────

/** 平面图上的地方（都是有名字的 emoji，题目和答案要朗读） */
export const PLACES = ['🏫', '🌳', '🛝', '🚩', '🎡', '🎠', '🚪']
/** 东南西北各在格子的哪一格：[行, 列] */
const CELL: Record<Dir, [number, number]> = { north: [0, 1], south: [2, 1], west: [1, 0], east: [1, 2] }

function genTour(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s1-04-tour'
  const [center, ...sides] = rng.shuffle(PLACES).slice(0, 5) as [string, ...string[]]
  const at: Record<Dir, string> = { north: sides[0]!, east: sides[1]!, south: sides[2]!, west: sides[3]! }
  const grid: string[][] = [
    ['', '', ''],
    ['', center, ''],
    ['', '', ''],
  ]
  for (const dir of DIRS) {
    const [r, c] = CELL[dir]
    grid[r]![c] = at[dir]
  }
  const plan: StemPart = { kind: 'stat-table', title: { k: 'q.tour.title' }, rows: grid, head: 'none' }
  const layout = DIRS.map((x) => at[x]).join('')
  const roll = rng.next()
  if (roll < 0.6) {
    // 某处在中间那处的哪面（或反过来：中间那处在某处的哪面）
    const dir = rng.pick(DIRS)
    const reverse = roll >= 0.4
    const [a, b] = reverse ? [center, at[dir]] : [at[dir], center]
    const correct = reverse ? behind(dir) : dir
    return labelQuestion({
      kpId,
      type: 'position',
      difficulty: d,
      sig: `where-${center}${layout}-${a}-${b}`,
      stem: [{ kind: 'text', text: { k: 'q.tour.where', p: { a, b } } }, plan],
      correct: { k: OPT[correct] },
      distractors: DIRS.filter((x) => x !== correct).map((x) => ({ k: OPT[x] })),
      rng,
    })
  }
  if (roll < 0.8) {
    // 中间那处的某一面是什么
    const dir = rng.pick(DIRS)
    return labelQuestion({
      kpId,
      type: 'position',
      difficulty: d,
      sig: `what-${center}${layout}-${dir}`,
      stem: [{ kind: 'text', text: { k: 'q.tour.what', p: { c: center, dir: { k: OPT[dir] } } } }, plan],
      correct: at[dir],
      distractors: DIRS.filter((x) => x !== dir).map((x) => at[x]),
      rng,
    })
  }
  // 从某处往中间走，先到哪里（「从大门往北走，经过操场先到教学楼」）
  const from = rng.pick(DIRS)
  const go = behind(from)
  return labelQuestion({
    kpId,
    type: 'position',
    difficulty: d,
    sig: `walk-${center}${layout}-${from}`,
    stem: [{ kind: 'text', text: { k: 'q.tour.walk', p: { a: at[from], dir: { k: OPT[go] } } } }, plan],
    correct: center,
    distractors: DIRS.filter((x) => x !== from).map((x) => at[x]),
    rng,
  })
}
defineGenerator('m2s1-04-tour', genTour)
