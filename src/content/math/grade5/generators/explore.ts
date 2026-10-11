// 五下「☆ 探索图形」的生成器（五年级数学 G）。
import type { Difficulty, LParam, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 探索图形（课本 p44）：用棱长 1 cm 的小正方体拼成正方体（每条棱 2、3、4 个……），把表面涂上颜色，
// 三面、两面、一面涂色和没有涂色的小正方体各有几个，第④、⑤个呢；(1) 接着写第⑥、⑦、⑧个。
// 第 1 档：每条棱 2–5 个（课本的 ①②③ 和表里的 ④⑤），图用 CubeSolids 画 n × n × n；
// 第 2 档：每条棱 6 个（还画图）、各类小正方体在什么位置、一共几个；第 3 档：每条棱 7–9 个（课本的 ⑥⑦⑧），只用文字。
// 不出 (2)*「墙角金字塔」：课本只问「你会数吗？」，没说数块数还是数涂色。
// 规律（每条棱 n 个）：三面涂色 8 个（在 8 个顶点上）、两面 12 × (n − 2)（每条棱去掉两头）、一面 6 × (n − 2)²（每个面的中间）、
// 没有涂色 (n − 2)³（里面）；四类加起来正好 n³。
// ─────────────────────────────────────────────────────────────

const T = 'solid' as const
export const KP_EXPLORE = 'm5s2-04-explore'
const K = (k: string, p?: Record<string, LParam>): LStr => (p ? { k: `m5.explore.${k}`, p } : { k: `m5.explore.${k}` })
const text = (k: string, p?: Record<string, LParam>): StemPart => ({ kind: 'text', text: K(k, p) })

/** 涂了几面：3、2、1、0 */
export type Paint = 3 | 2 | 1 | 0
export const PAINTS: Paint[] = [3, 2, 1, 0]
/** 每条棱 n 个小正方体的大正方体，表面涂色后涂了 k 面的小正方体有几个 */
export function painted(n: number, k: Paint): number {
  const m = Math.max(0, n - 2)
  return k === 3 ? 8 : k === 2 ? 12 * m : k === 1 ? 6 * m * m : m * m * m
}
/** 大正方体的图：n × n 的高度图、每格 n 个 */
export const bigCube = (n: number): number[][] => Array.from({ length: n }, () => Array.from({ length: n }, () => n))
/** 各类在哪里 */
const WHERE: Record<Paint, string> = { 3: 'vertex', 2: 'edge', 1: 'face', 0: 'inside' }

function gen(d: Difficulty, rng: RNG): Question {
  const count = (n: number, figure: boolean): Question => {
    const k = rng.pick(PAINTS)
    const v = painted(n, k)
    // 干扰项：别的几类的个数、两面涂色没去掉两头（12n）、一面涂色没去掉边（6n²）、没有涂色当成 n³
    const smart = [...PAINTS.filter((x) => x !== k).map((x) => painted(n, x)), k === 2 ? 12 * n : k === 1 ? 6 * n * n : k === 0 ? n * n * n : 6]
    const stem: StemPart[] = figure
      ? [text('q', { kind: K(`k${k}`) }), { kind: 'cube-solids', items: [{ rows: bigCube(n) }] }]
      : [text('qText', { n, kind: K(`k${k}`) })]
    return numberQuestion({
      kpId: KP_EXPLORE,
      type: T,
      difficulty: d,
      sig: `${figure ? 'pic' : 'text'}-${n}-${k}`,
      stem,
      value: v,
      rng,
      min: 0,
      max: Math.max(v * 10, n * n * n, 20),
      smart: smart.filter((x) => x !== v && x >= 0),
    })
  }
  const total = (n: number): Question =>
    numberQuestion({
      kpId: KP_EXPLORE,
      type: T,
      difficulty: d,
      sig: `total-${n}`,
      stem: [text('total'), { kind: 'cube-solids', items: [{ rows: bigCube(n) }] }],
      value: n * n * n,
      rng,
      min: 0,
      max: n * n * n * 10,
      smart: [n * n * 6, n * n, n * 3],
    })
  const where = (): Question => {
    const k = rng.pick(PAINTS)
    const at = (x: Paint): LStr => K(`at.${WHERE[x]}`)
    return labelQuestion({
      kpId: KP_EXPLORE,
      type: T,
      difficulty: d,
      sig: `where-${k}`,
      stem: [text('where', { kind: K(`k${k}`) })],
      correct: at(k),
      distractors: rng.shuffle(PAINTS.filter((x) => x !== k)).slice(0, 3).map(at),
      rng,
    })
  }
  if (d === 1) return rng.chance(0.12) ? total(rng.int(2, 4)) : count(rng.int(2, 5), true)
  if (d === 2) {
    const r = rng.next()
    return r < 0.45 ? count(6, true) : r < 0.75 ? where() : r < 0.9 ? count(rng.int(3, 5), false) : total(rng.int(4, 5))
  }
  return rng.chance(0.8) ? count(rng.int(7, 9), false) : where()
}

defineGenerator(KP_EXPLORE, gen)
