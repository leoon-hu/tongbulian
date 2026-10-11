// 五下「1 观察物体（三）」（平台当前的旧版课本）的生成器（五年级数学 A）。
// 出题办法同五上「观察简单组合体」（combine.ts，旧版这一单元就是新版五上第一单元的前身），词条换成旧版课本的「几何体」（m5.view.*）。
import type { CubeSolid, Difficulty, LParam, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, numberQuestion } from '@/engine'
import {
  E3Z,
  P5,
  P6,
  P7,
  P9,
  type Pre,
  type Rows,
  buildPick,
  countShape,
  countViews,
  cubeCount,
  fit,
  flipRows,
  frontHeights,
  howMany,
  least,
  leftFrom,
  mirrorRows,
  okShape,
  randomThing,
  randomTop,
  rowsId,
  sideL,
  topCount,
  topPick,
  variants,
  viewOf,
  viewKey,
  who,
} from './combine'

// ─────────────────────────────────────────────────────────────
// 观察物体（三）（旧版五下一，第 2–4 页）：没有小节标题，照平台同步课分两节——
// 按要求摆几何体：例 1（1）用 4 个小正方体摆出从前面看是三格一排的几何体（后面加在左边、中间……）、（2）再加一个、从前面看不变；
// 练习一 1（5 个，前面 + 上面 → 从左面看是哪个）、3（十个几何体，旧版 ① 是一个小正方体）、5（从前面看是 L，最少几个）。
// 根据看到的图形摆几何体：例 2 由三个方向看到的图形摆（3 个；只看前面、左面有两种摆法，加上从上面看就定了）；练习一 2（4 个、7 个）、
// 4（从前面看、从上面看符合要求的是哪一个：对的、前后弄反的、只有一排的）、6（标数的俯视图）。
// 画图题、「你是怎样摆的」改成选一选；练习一 3（2）「有多少种摆法」、3（3）、5（2）开放题不出。
// ─────────────────────────────────────────────────────────────

const T = 'view' as const
const PRE: Pre = 'm5.view'
export const KP_ARRANGE = 'm5s2-01-arrange'
export const KP_RESTORE2 = 'm5s2-01-restore'

const say = (k: string, p?: Record<string, LParam>): StemPart => ({ kind: 'text', text: p ? { k: `${PRE}.${k}`, p } : { k: `${PRE}.${k}` } })
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)

/** 例 1（1）：用 4 个小正方体摆出从前面看是三格一排的（小明后面左边加一个、小红后面中间加一个，也可以加在右边、前面） */
export const OLD_E1: Rows[] = [
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
]
/** 例 1（1）的干扰：也是 4 个，从前面看不是三格一排 */
const OLD_E1_WRONG: Rows[] = [
  [[1, 2, 1]],
  [[2, 1, 1]],
  [[1, 1, 2]],
  [
    [1, 1],
    [1, 1],
  ],
  [[1, 1, 1, 1]],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
]
/** 例 2：从前面看两格一排、从左面看两格一排、从上面看 L，3 个 */
export const OLD_E2: Rows = [
  [1, 0],
  [1, 1],
]
/** 练习一 4：从前面看「下 4 + 第二格上 1」、从上面看「下排左 1 + 上排右 3」，对的是第一个（另两个前后弄反了、只有一排） */
export const OLD_P4: Rows = [
  [0, 2, 1, 1],
  [1, 0, 0, 0],
]
/** 练习一 3 的十个几何体：旧版 ① 是一个小正方体，②–⑩ 和新版五上一样 */
export const OLD_P7: Rows[] = [[[1]], ...P7.slice(1)]

/**
 * 在 rows 上再加一个小正方体的所有摆法（摞在一摞上面，或放在旁边的桌面上；四周可以多出一排、一列），看得清的才要
 */
export function addOne(rows: Rows): Rows[] {
  const R = rows.length
  const C = rows[0]!.length
  // 四周各多一圈空格，加完再把空的排、列去掉
  const big: Rows = [range(C + 2).map(() => 0), ...rows.map((r) => [0, ...r, 0]), range(C + 2).map(() => 0)]
  const out: Rows[] = []
  for (let r = 0; r < R + 2; r++) {
    for (let c = 0; c < C + 2; c++) {
      const h = big[r]![c]!
      const near = [big[r - 1]?.[c], big[r + 1]?.[c], big[r]![c - 1], big[r]![c + 1]].some((x) => !!x)
      if (h === 0 && !near) continue
      const v = big.map((row) => [...row])
      v[r]![c]! += 1
      const trimmed = trim(v)
      if (okShape(trimmed) && !out.some((x) => rowsId(x) === rowsId(trimmed))) out.push(trimmed)
    }
  }
  return out
}
function trim(rows: Rows): Rows {
  const keepR = rows.filter((r) => r.some((h) => h > 0))
  const C = keepR[0]!.length
  const cols = range(C).filter((c) => keepR.some((r) => r[c]! > 0))
  return keepR.map((r) => cols.map((c) => r[c]!))
}

/** 例 1（2）：在例 1（1）的摆法上再加一个，从前面看不变的对、变了的错 */
function addOneFit(kpId: string, d: Difficulty, rng: RNG): Question | null {
  const base = rng.pick(OLD_E1)
  const all = addOne(base)
  const want = viewKey(viewOf(base, 'front'))
  const good = all.filter((x) => viewKey(viewOf(x, 'front')) === want)
  const bad = all.filter((x) => viewKey(viewOf(x, 'front')) !== want)
  if (!good.length) return null
  return fit(PRE, kpId, d, rng, `add${rowsId(base)}`, rng.pick(good), bad, 'front', 5)
}

/**
 * 「哪个几何体符合从前面看是……、从上面看是……的要求？」（练习一 4）：三个几何体标 1、2、3——对的、前后弄反的
 * （从前面看一样、从上面看上下颠倒）、平铺成一排的（从前面看一样、从上面看是一排）或换一种摆法的
 */
function twoViews(kpId: string, d: Difficulty, rng: RNG, rows: Rows): Question | null {
  const key = (r: Rows): string => `${viewKey(viewOf(r, 'front'))}|${viewKey(viewOf(r, 'top'))}`
  const want = key(rows)
  const row: Rows = [frontHeights(rows)]
  const pool = [flipRows(rows), row, mirrorRows(rows), ...variants(rows)].filter((w, i, all) => key(w) !== want && all.findIndex((x) => rowsId(x) === rowsId(w)) === i)
  // 课本的三个：前后弄反的（这一个后面那一摞被挡住一点，课本照样画了）、只有一排的
  const book = rowsId(rows) === rowsId(OLD_P4)
  const usable = pool.filter((w) => okShape(w) || (book && rowsId(w) === rowsId(flipRows(rows))))
  if (usable.length < 2) return null
  const first = usable.find((w) => rowsId(w) === rowsId(flipRows(rows))) ?? usable[0]!
  const second = usable.find((w) => rowsId(w) === rowsId(row) && w !== first) ?? rng.pick(usable.filter((w) => w !== first))
  const objs = rng.shuffle([rows, first, second])
  const solids: CubeSolid[] = objs.map((o) => ({ rows: o }))
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `two-${objs.map(rowsId).join('_')}`,
    stem: [
      say('twoViews'),
      { kind: 'cube-views', items: (['front', 'top'] as const).map((s) => ({ blocks: viewOf(rows, s), caption: sideL(PRE, s) })) },
      { kind: 'cube-solids', items: solids, numbered: true },
    ],
    value: objs.indexOf(rows) + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

function arrange(d: Difficulty, rng: RNG): Question | null {
  const kp = KP_ARRANGE
  const roll = rng.next()
  if (d === 1) {
    // 例 1（1）：用 4 个摆出从前面看是三格一排的，哪种摆法对；例 1（2）：再加一个，从前面看不变的是哪一种
    if (roll < 0.55) return fit(PRE, kp, d, rng, 'e1', rng.pick(OLD_E1), OLD_E1_WRONG, 'front', 4)
    return addOneFit(kp, d, rng)
  }
  if (d === 2) {
    // 练习一 1：前面 + 上面 + 5 个 → 从左面看；练习一 5：从前面看是 L，最少几个；练习一 3：十个几何体里挑几个；换一个几何体
    if (roll < 0.2) return leftFrom(PRE, kp, d, rng, P5)
    if (roll < 0.35) return least(PRE, kp, d, rng, rng.pick([[1, 2], [2, 1], [1, 1, 2], [2, 1, 1], [1, 2, 1], [1, 3], [2, 2, 1]]))
    if (roll < 0.6) {
      const idx = rng
        .shuffle(range(OLD_P7.length))
        .slice(0, rng.chance(0.5) ? 3 : 5)
        .sort((a, b) => a - b)
      const objs = idx.map((i) => OLD_P7[i]!)
      const id = `p3o${idx.join('.')}`
      if (objs.length === 3) return who(PRE, kp, d, rng, id, objs, rng.pick(['front', 'top', 'left'] as const))
      return howMany(PRE, kp, d, rng, id, objs, rng.pick(['front', 'left'] as const))
    }
    const th = randomThing(rng, false)
    if (!th) return null
    const rows = (th.solid as { rows: Rows }).rows
    return fit(PRE, kp, d, rng, rowsId(rows), rows, variants(rows), 'front', cubeCount(rows))
  }
  // 第 3 档：更多、更高的几何体；前面 + 上面 + 个数 → 从左面看
  if (roll < 0.5) {
    const th = randomThing(rng, true)
    if (!th) return null
    const rows = (th.solid as { rows: Rows }).rows
    return fit(PRE, kp, d, rng, rowsId(rows), rows, variants(rows), rng.pick(['front', 'left'] as const), cubeCount(rows))
  }
  const rows = countShape(rng, true)
  return rows && leftFrom(PRE, kp, d, rng, rows)
}

defineGenerator(KP_ARRANGE, (d, rng) => {
  for (let i = 0; i < 60; i++) {
    const q = arrange(d, rng)
    if (q) return q
  }
  return fit(PRE, KP_ARRANGE, d, rng, 'e1', OLD_E1[0]!, OLD_E1_WRONG, 'front', 4)!
})

function restore2(d: Difficulty, rng: RNG): Question | null {
  const kp = KP_RESTORE2
  const roll = rng.next()
  if (d === 1) {
    // 例 2：三个方向看到的图形 → 用了几个、是哪一个；练习一 2：4 个、7 个；练习一 4：符合前面、上面要求的是哪一个
    if (roll < 0.25) return countViews(PRE, kp, d, rng, rng.pick([OLD_E2, OLD_E2, P6, E3Z]))
    if (roll < 0.65) return buildPick(PRE, kp, d, rng, rng.pick([OLD_E2, OLD_E2, E3Z]))
    return twoViews(kp, d, rng, OLD_P4)
  }
  if (d === 2) {
    // 换一个几何体：用了几个、是哪一个、符合两面要求的是哪一个；练习一 6：标数的俯视图从前面 / 左面看
    if (roll < 0.25) {
      const rows = countShape(rng, false)
      return rows && countViews(PRE, kp, d, rng, rows)
    }
    if (roll < 0.5) {
      const rows = countShape(rng, false)
      return rows && buildPick(PRE, kp, d, rng, rows)
    }
    if (roll < 0.75) {
      const th = randomThing(rng, false)
      return th && (th.solid as { rows: Rows }).rows.length > 1 ? twoViews(kp, d, rng, (th.solid as { rows: Rows }).rows) : null
    }
    return topPick(PRE, kp, d, rng, 'p6o', P9, rng.pick(['front', 'left'] as const))
  }
  // 第 3 档：标数的俯视图一共几个、3 排 3 层的几何体
  if (roll < 0.3) return topCount(PRE, kp, d, rng, rng.chance(0.4) ? P9 : (randomTop(rng) ?? P9))
  if (roll < 0.65) {
    const rows = countShape(rng, true)
    return rows && countViews(PRE, kp, d, rng, rows)
  }
  const rows = countShape(rng, true)
  return rows && buildPick(PRE, kp, d, rng, rows)
}

defineGenerator(KP_RESTORE2, (d, rng) => {
  for (let i = 0; i < 60; i++) {
    const q = restore2(d, rng)
    if (q) return q
  }
  return countViews(PRE, KP_RESTORE2, d, rng, OLD_E2)
})
