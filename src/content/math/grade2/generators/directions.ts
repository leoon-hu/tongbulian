import type { Difficulty, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 校园小导游（综合与实践）：认识东、南、西、北
// ─────────────────────────────────────────────────────────────

type Dir = 'east' | 'south' | 'west' | 'north'
const DIRS: Dir[] = ['east', 'south', 'west', 'north'] // 顺时针
const OPT: Record<Dir, string> = { east: 'opt.east', south: 'opt.south', west: 'opt.west', north: 'opt.north' }

const idx = (d: Dir): number => DIRS.indexOf(d)
const turn = (d: Dir, steps: number): Dir => DIRS[(idx(d) + steps + 4) % 4]!
/** 面向 d 时：后面是对面，右边是顺时针下一个，左边是逆时针下一个 */
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

function genDirections(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.2) {
    // 太阳从东边升起、西边落下
    const rise = rng.chance(0.5)
    return dirQuestion(d, rise ? 'sunrise' : 'sunset', rise ? 'q.dir.sunrise' : 'q.dir.sunset', {}, rise ? 'east' : 'west', rng)
  }
  if (roll < 0.45) {
    // 某方向的对面
    const from = rng.pick(DIRS)
    return dirQuestion(d, `opp-${from}`, 'q.dir.opposite', { dir: { k: OPT[from] } }, behind(from), rng)
  }
  if (roll < 0.7 || d === 1) {
    // 地图：上北下南左西右东
    const side = rng.pick(['up', 'down', 'left', 'right'] as const)
    return dirQuestion(d, `map-${side}`, 'q.dir.map', { side: { k: `side.${side}` } }, MAP[side], rng)
  }
  // 面向某方向，后面 / 左边 / 右边是哪个方向
  const facing = rng.pick(DIRS)
  const rel = d === 2 ? 'back' : rng.pick(['back', 'left', 'right'] as const)
  const answer = rel === 'back' ? behind(facing) : rel === 'left' ? leftOf(facing) : rightOf(facing)
  return dirQuestion(d, `face-${facing}-${rel}`, 'q.dir.facing', { dir: { k: OPT[facing] }, side: { k: `side.${rel}` } }, answer, rng)
}
defineGenerator('m2s1-04-directions', genDirections)
