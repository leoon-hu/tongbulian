// 五上「一 观察简单组合体」的生成器（五年级数学 A）；五下「观察物体（三）」（views.ts）也用这里的出题办法，换成「几何体」的词条。
import type { CubeSolid, CubeViewFig, Difficulty, LParam, LStr, Question, StemPart, TopCell, ViewBlock } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 观察简单组合体（五上一，第 1–6 页）：课本没印小节标题，照平台同步课分两节——
// 观察简单组合体：例 1 用 4 个小正方体摆、连一连看到的图形是从什么方向看的；例 2 + 做一做 三个组合体从哪个方向看到的图形相同、
// 哪个不同；练习一 1、2、3（画出三个方向看到的图形 → 选图）、4、7（1）；练习一 9 标数的俯视图（第 3 档）。
// 还原简单组合体：例 3（1）从前面看到的是 L，下面哪种摆法对（加在前面 / 后面也行）；例 3（2）+ 做一做 由三个方向看到的图形
// 摆出组合体（改成「用了几个小正方体」「是下面哪一个」）；练习一 5（前面 + 上面 + 5 个 → 从左面看是哪个）、6、8（最少几个）；
// 标数的俯视图一共几个（第 3 档）。
// 课本只说「从前面 / 上面 / 左面看」；画法：从上面看后排画在上面，从左面看组合体的后面画在左边（练习一 1、9 可以验证）。
// 「连一连」「摆一摆」「画一画」改成选一选；练习一 7（2）「有多少种摆法」、10（转了方向的组合体）不出。
// 组合体用高度图表示（rows：第一行是最后面、最后一行是最前面，列从左到右，每格是这一摞几个），看到的图形由它算出来
// （算法同四下「观察物体（二）」，按规矩不导入四年级的生成器文件，这里各一份）。
// ─────────────────────────────────────────────────────────────

const T = 'view' as const
export const KP_OBSERVE = 'm5s1-01-observe'
export const KP_RESTORE = 'm5s1-01-restore'

/** 词条前缀：五上 m5.comb（课本说「组合体」），五下 m5.view（旧版课本说「几何体」）；两边的键一样 */
export type Pre = 'm5.comb' | 'm5.view'

/** 高度图：第一行是最后面（离看的人最远）、最后一行是最前面，列从左到右，每格是这一摞有几个小正方体 */
export type Rows = number[][]
export type Side = 'front' | 'top' | 'left'
export const SIDES: Side[] = ['front', 'top', 'left']

const say = (pre: Pre, k: string, p?: Record<string, LParam>): StemPart => ({ kind: 'text', text: p ? { k: `${pre}.${k}`, p } : { k: `${pre}.${k}` } })
export const sideL = (pre: Pre, s: Side): LStr => ({ k: `${pre}.side.${s}` })
const yesL = (pre: Pre): LStr => ({ k: `${pre}.yes` })
const noL = (pre: Pre): LStr => ({ k: `${pre}.no` })
const solidsPart = (items: CubeSolid[], numbered = false): StemPart => ({ kind: 'cube-solids', items, ...(numbered ? { numbered: true } : {}) })
const viewsPart = (items: CubeViewFig[], numbered = false): StemPart => ({ kind: 'cube-views', items, ...(numbered ? { numbered: true } : {}) })
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)
export const rowsId = (rows: Rows): string => rows.map((r) => r.join('')).join('.')

// ─────────────────────────────────────────────────────────────
// 看到的图形：由高度图算
// ─────────────────────────────────────────────────────────────

export const cubeCount = (rows: Rows): number => rows.flat().reduce((a, b) => a + b, 0)
/** 从前面看：每一列有几层（这一列前后几摞里最高的） */
export const frontHeights = (rows: Rows): number[] => rows[0]!.map((_, c) => Math.max(...rows.map((r) => r[c] ?? 0)))
/** 从左面看：每一排有几层，从左到右是组合体的从后到前 */
export const leftHeights = (rows: Rows): number[] => rows.map((r) => Math.max(...r))

/** 从某个方向看到的图形（一格一块）：从前面 / 左面看是一列一列摞起来的；从上面看是有小正方体的格子，后排在上面 */
export function viewOf(rows: Rows, side: Side): ViewBlock[] {
  const columns = (hs: number[]): ViewBlock[] => hs.flatMap((h, x) => range(h).map((y) => ({ x, y })))
  if (side === 'front') return columns(frontHeights(rows))
  if (side === 'left') return columns(leftHeights(rows))
  return rows.flatMap((row, i) => row.flatMap((h, x) => (h > 0 ? [{ x, y: rows.length - 1 - i }] : [])))
}

/** 一个正方体和一个长方体（练习一 2）：长方体横放、len 个正方体那么长，正方体放在它上面从左数第 on 格 */
export function barView(len: number, on: number, side: Side): ViewBlock[] {
  const bar = (x: number, w: number): ViewBlock => (w > 1 ? { x, y: 0, w, tone: 'bar' } : { x, y: 0, tone: 'bar' })
  if (side === 'front') return [bar(0, len), { x: on, y: 1 }]
  if (side === 'left') return [bar(0, 1), { x: 0, y: 1 }]
  return [...(on > 0 ? [bar(0, on)] : []), { x: on, y: 0 }, ...(on < len - 1 ? [bar(on + 1, len - 1 - on)] : [])]
}

/** 图形的样子（挪到左下角以后的那几块），两个图形一样 ⇔ key 一样 */
export function viewKey(v: ViewBlock[]): string {
  const x0 = Math.min(...v.map((b) => b.x))
  const y0 = Math.min(...v.map((b) => b.y))
  return v
    .map((b) => `${b.x - x0},${b.y - y0},${b.w ?? 1}${b.tone === 'bar' ? 'b' : ''}`)
    .sort()
    .join(' ')
}
const widthOf = (v: ViewBlock[]): number => Math.max(...v.map((b) => b.x + (b.w ?? 1)))
const heightOf = (v: ViewBlock[]): number => Math.max(...v.map((b) => b.y + 1))
/** 左右翻过来（从左面看把后面画到了右边：练习一 9 的 ④ 就是这种错） */
export const mirrorView = (v: ViewBlock[]): ViewBlock[] => v.map((b) => ({ ...b, x: widthOf(v) - b.x - (b.w ?? 1) }))
/** 上下翻过来（从上面看把前排画到了上面） */
export const flipView = (v: ViewBlock[]): ViewBlock[] => v.map((b) => ({ ...b, y: heightOf(v) - 1 - b.y }))
const transpose = (v: ViewBlock[]): ViewBlock[] => v.map((b) => ({ x: b.y, y: b.x }))
/** 转一转、翻一翻能重合（只有一格一格的图形）：从上面看的图转了个方向，孩子会觉得是「一样的」 */
export function congruent(a: ViewBlock[], b: ViewBlock[]): boolean {
  const forms = (v: ViewBlock[]): string[] => {
    const out: string[] = []
    let cur = v
    for (let i = 0; i < 4; i++) {
      cur = mirrorView(transpose(cur)) // 转 90°
      out.push(viewKey(cur), viewKey(mirrorView(cur)))
    }
    return out
  }
  return forms(a).includes(viewKey(b))
}
function connected(v: ViewBlock[]): boolean {
  const has = new Set(v.map((b) => `${b.x},${b.y}`))
  const seen = new Set<string>([`${v[0]!.x},${v[0]!.y}`])
  const todo = [v[0]!]
  while (todo.length) {
    const c = todo.pop()!
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const k = `${c.x + dx},${c.y + dy}`
      if (has.has(k) && !seen.has(k)) {
        seen.add(k)
        todo.push({ x: c.x + dx, y: c.y + dy })
      }
    }
  }
  return seen.size === has.size
}

/** 斜二测往后一格在图上往右、往上各挪几格：和 CubeSolids.vue 的 K 一样 */
export const OBLIQUE = 0.38
type Pt = [number, number]
/** 一个小正方体：从左数第 x 格、往后第 d 排（0 = 最前排）、第 z 层 */
interface Cube {
  x: number
  d: number
  z: number
}
/** 照画的顺序排好的小正方体（同 CubeSolids：从后往前、从下往上、从左往右，后画的盖住先画的） */
function cubesInOrder(rows: Rows): Cube[] {
  const out: Cube[] = []
  rows.forEach((row, i) =>
    row.forEach((h, x) => {
      for (let z = 0; z < h; z++) out.push({ x, d: rows.length - 1 - i, z })
    }),
  )
  return out.sort((a, b) => b.d - a.d || a.z - b.z || a.x - b.x)
}
const proj = (x: number, z: number, d: number): Pt => [x + d * OBLIQUE, -(z + d * OBLIQUE)]
/** 一个小正方体画出来的三个面（前面、上面、右面），每个是凸四边形 */
function facesOf(c: Cube): Pt[][] {
  const { x, d, z } = c
  return [
    [proj(x, z, d), proj(x + 1, z, d), proj(x + 1, z + 1, d), proj(x, z + 1, d)],
    [proj(x, z + 1, d), proj(x + 1, z + 1, d), proj(x + 1, z + 1, d + 1), proj(x, z + 1, d + 1)],
    [proj(x + 1, z, d), proj(x + 1, z, d + 1), proj(x + 1, z + 1, d + 1), proj(x + 1, z + 1, d)],
  ]
}
/** 点在凸四边形里面（不算边上） */
function inside(p: Pt, q: Pt[]): boolean {
  let sign = 0
  for (let i = 0; i < q.length; i++) {
    const a = q[i]!
    const b = q[(i + 1) % q.length]!
    const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
    if (Math.abs(cr) < 1e-9) return false
    const s = Math.sign(cr)
    if (sign && s !== sign) return false
    sign = s
  }
  return true
}
/** 每一摞最上面那个小正方体的顶面露出来多少（0–1，按画的顺序看后画的盖住了多少），与 rows 一一对应（空格是 1） */
export function topVisible(rows: Rows): number[][] {
  const order = cubesInOrder(rows)
  const N = 8
  return rows.map((row, i) =>
    row.map((h, x) => {
      if (h === 0) return 1
      const d = rows.length - 1 - i
      const at = order.findIndex((c) => c.x === x && c.d === d && c.z === h - 1)
      const later = order.slice(at + 1).flatMap(facesOf)
      let seen = 0
      for (let a = 0; a < N; a++) {
        for (let b = 0; b < N; b++) {
          const p = proj(x + (a + 0.5) / N, h, d + (b + 0.5) / N)
          if (!later.some((q) => inside(p, q))) seen += 1
        }
      }
      return seen / (N * N)
    }),
  )
}

/**
 * 能画、能看清的组合体：每一排、每一列都有小正方体，连成一片（从上面看），每一摞都不比它前面的矮，
 * 而且每一摞的顶面至少露出一半——不然后面那一摞被挡住，孩子看不清
 */
export function okShape(rows: Rows): boolean {
  const R = rows.length
  const C = rows[0]?.length ?? 0
  if (!R || !C || rows.some((r) => r.length !== C || r.some((h) => !Number.isInteger(h) || h < 0))) return false
  if (rows.some((r) => r.every((h) => h === 0))) return false
  if (range(C).some((c) => rows.every((r) => r[c] === 0))) return false
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const h = rows[r]![c]!
      if (h > 0 && rows.slice(r + 1).some((row) => row[c]! > h)) return false
    }
  }
  if (!connected(viewOf(rows, 'top'))) return false
  return topVisible(rows).every((row) => row.every((v) => v >= 0.5))
}

/**
 * 由从前面、上面、左面看到的图形摆组合体：从上面看定下哪几格有，每格摞 1…（这一列、这一排最高的）个，
 * 每一列、每一排最高的要和看到的一样。返回所有摆法（找到 limit 种就停）
 */
export function arrangements(front: number[], left: number[], foot: boolean[][], limit = 2): Rows[] {
  const R = foot.length
  const C = foot[0]!.length
  const cells: [number, number][] = []
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (foot[r]![c]) cells.push([r, c])
  const rows: Rows = range(R).map(() => range(C).map(() => 0))
  const out: Rows[] = []
  const same = (a: number[], b: number[]): boolean => a.length === b.length && a.every((x, i) => x === b[i])
  const rec = (i: number): void => {
    if (out.length >= limit) return
    if (i === cells.length) {
      if (same(frontHeights(rows), front) && same(leftHeights(rows), left)) out.push(rows.map((r) => [...r]))
      return
    }
    const [r, c] = cells[i]!
    for (let h = 1; h <= Math.min(front[c] ?? 0, left[r] ?? 0); h++) {
      rows[r]![c] = h
      rec(i + 1)
    }
    rows[r]![c] = 0
  }
  rec(0)
  return out
}
/** 三个方向看到的图形只能摆出这一种 */
export function uniqueFromViews(rows: Rows): boolean {
  const foot = rows.map((r) => r.map((h) => h > 0))
  return arrangements(frontHeights(rows), leftHeights(rows), foot).length === 1
}

/**
 * 只知道从前面看、从上面看和一共几个（练习一 5）：所有摆法从左面看到的图形（key）；只有一种 key 才能问「从左面看是哪个」
 */
export function leftKeysFrom(front: number[], foot: boolean[][], n: number): Set<string> {
  const R = foot.length
  const C = foot[0]!.length
  const cells: [number, number][] = []
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (foot[r]![c]) cells.push([r, c])
  const rows: Rows = range(R).map(() => range(C).map(() => 0))
  const keys = new Set<string>()
  const rec = (i: number, used: number): void => {
    if (used > n) return
    if (i === cells.length) {
      if (used === n && frontHeights(rows).every((h, c) => h === front[c])) keys.add(viewKey(viewOf(rows, 'left')))
      return
    }
    const [r, c] = cells[i]!
    for (let h = 1; h <= (front[c] ?? 0); h++) {
      rows[r]![c] = h
      rec(i + 1, used + h)
    }
    rows[r]![c] = 0
  }
  rec(0, 0)
  return keys
}

/**
 * 随便搭一个：R 排 C 列里连成一片的几格（每排每列都有），先每格放 1 个，再往上摞，摞的时候保证每一摞都不比它前面的矮；
 * 最高 maxH 层，一共 cubes 个
 */
export function randomRows(rng: RNG, R: number, C: number, cubes: number, maxH: number): Rows | null {
  for (let tries = 0; tries < 30; tries++) {
    const f = rng.int(Math.max(R, C), Math.min(R * C, cubes))
    const rows: Rows = range(R).map(() => range(C).map(() => 0))
    rows[rng.int(0, R - 1)]![rng.int(0, C - 1)] = 1
    for (let n = 1; n < f; n++) {
      const cand: [number, number][] = []
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          if (rows[r]![c]) continue
          if ([rows[r - 1]?.[c], rows[r + 1]?.[c], rows[r]![c - 1], rows[r]![c + 1]].some((h) => !!h)) cand.push([r, c])
        }
      }
      const [r, c] = rng.pick(cand)
      rows[r]![c] = 1
    }
    let extra = cubes - f
    while (extra > 0) {
      const cand: [number, number][] = []
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          const h = rows[r]![c]!
          if (h === 0 || h >= maxH) continue
          // 摞高以后，它后面有小正方体的那几摞还要比它高或一样高
          if (rows.slice(0, r).some((row) => row[c]! > 0 && row[c]! < h + 1)) continue
          cand.push([r, c])
        }
      }
      if (!cand.length) break
      const [r, c] = rng.pick(cand)
      rows[r]![c]! += 1
      extra -= 1
    }
    if (extra === 0 && okShape(rows)) return rows
  }
  return null
}

/** 前后倒过来（从上面看就上下颠倒了：五下练习一 4 的错法）、左右倒过来 */
export const flipRows = (rows: Rows): Rows => [...rows].reverse().map((r) => [...r])
export const mirrorRows = (rows: Rows): Rows => rows.map((r) => [...r].reverse())

// ─────────────────────────────────────────────────────────────
// 课本里的组合体
// ─────────────────────────────────────────────────────────────

/** 观察：例 1（小红平铺、小亮摞高）、练习一 1、3（1）、3（2） */
export const BOOK_OBS: Record<string, Rows> = {
  e1a: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  e1b: [[1, 2, 1]],
  p1: [
    [2, 1, 1],
    [1, 1, 1],
  ],
  p3a: [
    [2, 2],
    [1, 0],
  ],
  p3b: [[2, 1, 2]],
}
/** 例 2、做一做、练习一 4 的三个组合体 */
export const BOOK_SETS: Record<string, Rows[]> = {
  e2: [[[2, 1, 1]], [[1, 2, 1]], [[1, 1, 2]]],
  e2z: [[[3, 1, 1]], [[1, 3, 1]], [[1, 1, 3]]],
  p4: [
    [
      [1, 2, 1],
      [0, 1, 0],
    ],
    [
      [2, 1],
      [1, 1],
    ],
    [
      [1, 1, 2],
      [0, 1, 0],
    ],
  ],
}
/** 练习一 7 的十个组合体（①–⑩）；五下旧版练习一 3 只有 ① 不一样（一个小正方体） */
export const P7: Rows[] = [
  [[1], [1]],
  [[1, 1]],
  [[1], [1], [1]],
  [[1, 1, 1]],
  [[2], [1]],
  [[2, 1]],
  [
    [1, 1],
    [1, 0],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 0],
  ],
  [
    [2, 1],
    [1, 0],
  ],
]
/** 例 3（2）：三个方向看到的图形摆出来，5 个（只有一种摆法） */
export const E3: Rows = [
  [2, 1],
  [1, 0],
  [1, 0],
]
/** 例 3 做一做（五下练习一 2（2））：7 个 */
export const E3Z: Rows = [
  [0, 0, 2, 1],
  [1, 1, 1, 1],
]
/** 练习一 6（五下练习一 2（1））：4 个（后面那一个被前面两层的挡住了，只出看到的图形，不画组合体） */
export const P6: Rows = [
  [1, 0],
  [2, 1],
]
/** 练习一 5（五下练习一 1）：用 5 个，从前面看是「下 3 + 右上 1」、从上面看是「下 3 + 上中 1」，只能这样摆 */
export const P5: Rows = [
  [0, 1, 0],
  [1, 1, 2],
]
/** 例 3（1）：从前面看到的是「下 2 + 左上 1」——用 3 个摆，或在前面、后面再加一个（课本画的几种里看得清的） */
export const E3A: Rows[] = [
  [[2, 1]],
  [
    [2, 1],
    [1, 0],
  ],
  [
    [2, 1],
    [0, 1],
  ],
]
/** 练习一 9（五下练习一 6）：标数的俯视图，7 个 */
export const P9: Rows = [
  [0, 3, 1],
  [1, 2, 0],
]

// ─────────────────────────────────────────────────────────────
// 观察简单组合体
// ─────────────────────────────────────────────────────────────

/** 一个要观察的组合体：小正方体摆的，或正方体和长方体 */
interface Thing {
  id: string
  solid: CubeSolid
  view: (s: Side) => ViewBlock[]
}
export const stackThing = (id: string, rows: Rows): Thing => ({ id, solid: { rows }, view: (s) => viewOf(rows, s) })
export const barThing = (len: number, on: number): Thing => ({ id: `bar${len}${on}`, solid: { bar: len, on }, view: (s) => barView(len, on, s) })

/** 选项图形的来历（签名里用）：F / T / L 三个方向看到的，M 左右翻了，V 上下翻了 */
type Role = Side | 'mirror' | 'flip'
const ROLE: Record<Role, string> = { front: 'F', top: 'T', left: 'L', mirror: 'M', flip: 'V' }

/**
 * 「从某面看，看到的是哪个图形？」（例 1 的连一连）：三幅图下面标 1、2、3——正确的那幅 + 另外两个方向看到的；
 * trap 时先放常见的画错的：从左面看把后面画到右边（左右翻）、从上面看把前排画到上面（上下翻）
 */
export function pickView(pre: Pre, kpId: string, d: Difficulty, rng: RNG, th: Thing, side: Side, trap: boolean): Question | null {
  const correct = th.view(side)
  const pool: { role: Role; v: ViewBlock[] }[] = []
  if (trap && side === 'left') pool.push({ role: 'mirror', v: mirrorView(correct) })
  if (trap && side === 'top') pool.push({ role: 'flip', v: flipView(correct) })
  for (const s of rng.shuffle(SIDES.filter((x) => x !== side))) pool.push({ role: s, v: th.view(s) })
  const keys = new Set([viewKey(correct)])
  const picked: { role: Role; v: ViewBlock[] }[] = []
  for (const p of pool) {
    const k = viewKey(p.v)
    if (keys.has(k)) continue
    keys.add(k)
    picked.push(p)
    if (picked.length === 2) break
  }
  if (picked.length < 2) return null
  const opts = rng.shuffle([{ role: side as Role, v: correct }, ...picked])
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `pick-${th.id}-${side}-${opts.map((o) => ROLE[o.role]).join('')}`,
    stem: [say(pre, 'pick', { side: sideL(pre, side) }), solidsPart([th.solid]), viewsPart(opts.map((o) => ({ blocks: o.v })), true)],
    value: opts.findIndex((o) => o.role === side) + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 「下面的图形是从什么方向看到的？」：这个图形只有从这一面看得到（另外两面看到的不一样）才问 */
export function whichSide(pre: Pre, kpId: string, d: Difficulty, rng: RNG, th: Thing, side: Side): Question | null {
  const key = viewKey(th.view(side))
  if (SIDES.some((s) => s !== side && viewKey(th.view(s)) === key)) return null
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `which-${th.id}-${side}`,
    stem: [say(pre, 'which'), solidsPart([th.solid]), viewsPart([{ blocks: th.view(side) }])],
    correct: sideL(pre, side),
    distractors: SIDES.filter((s) => s !== side).map((s) => sideL(pre, s)),
    rng,
  })
}

/** 随便搭一个组合体（不行就 null，外面重来） */
export function randomThing(rng: RNG, hard: boolean): Thing | null {
  let rows: Rows | null
  if (hard) {
    const R = rng.pick([2, 2, 3])
    const C = rng.pick(R === 3 ? [2, 3] : [3, 4])
    rows = randomRows(rng, R, C, rng.int(Math.max(R, C) + 2, Math.min(R * C + 3, 8)), 3)
  } else if (rng.chance(0.3)) {
    const C = rng.pick([3, 4])
    rows = randomRows(rng, 1, C, C + rng.int(1, 2), 2)
  } else {
    const C = rng.pick([2, 3, 3])
    rows = randomRows(rng, 2, C, rng.int(4, Math.min(6, 2 * C + 1)), 2)
  }
  return rows ? stackThing(`r${rowsId(rows)}`, rows) : null
}

/** 几个组合体从同一面看：都一样（same）、两两都不一样（diff）、有的一样有的不一样（mixed） */
export type Status = 'same' | 'diff' | 'mixed'
export function statusOf(objs: Rows[], side: Side): Status {
  const keys = objs.map((o) => viewKey(viewOf(o, side)))
  const n = new Set(keys).size
  return n === 1 ? 'same' : n === keys.length ? 'diff' : 'mixed'
}

/** 「这几个组合体从某面看都相同，是哪个图形」的近似图形：左右翻、上下翻、横竖倒过来、多一格、少一格（少了以后还要连在一起） */
function nearViews(v: ViewBlock[], side: Side): { role: string; v: ViewBlock[] }[] {
  const out: { role: string; v: ViewBlock[] }[] = []
  if (side !== 'top') out.push({ role: 'M', v: mirrorView(v) })
  else out.push({ role: 'V', v: flipView(v) })
  out.push({ role: 'T', v: transpose(v) })
  const bottom = v.filter((b) => b.y === 0)
  out.push({ role: 'P', v: [...v, { x: Math.max(...bottom.map((b) => b.x)) + 1, y: 0 }] })
  if (v.length > 1) {
    const top = Math.max(...v.map((b) => b.y))
    const last = v.filter((b) => b.y === top).reduce((a, b) => (b.x > a.x ? b : a))
    const less = v.filter((b) => b !== last)
    if (connected(less)) out.push({ role: 'S', v: less })
  }
  return out
}

/**
 * 一组组合体出一道题：从下面几种问法里挑一种这组问得清楚的（只有一个对的答案）——
 * 从哪个方向看都相同 / 哪个方向不同 / 哪个方向都不相同、从某面看相同吗、都一样的是哪个图形、哪个组合体看到的是这个图形、
 * 哪两个看到的相同。课本例 2 有两面都相同的（上面和左面），不问「从哪个方向看相同」（两个对的），问哪个方向不同、每一面相同吗
 */
export function setQuestion(pre: Pre, kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[]): Question | null {
  const n = objs.length
  const st = Object.fromEntries(SIDES.map((s) => [s, statusOf(objs, s)])) as Record<Side, Status>
  const same = SIDES.filter((s) => st[s] === 'same')
  const notSame = SIDES.filter((s) => st[s] !== 'same')
  const diff = SIDES.filter((s) => st[s] === 'diff')
  const solids = (): StemPart => solidsPart(objs.map((rows) => ({ rows })))
  const askSide = (key: string, side: Side, fam: string) => (): Question =>
    labelQuestion({
      kpId,
      type: T,
      difficulty: d,
      sig: `${fam}-${id}`,
      stem: [say(pre, key, { n }), solids()],
      correct: sideL(pre, side),
      distractors: SIDES.filter((s) => s !== side).map((s) => sideL(pre, s)),
      rng,
    })
  // 课本问的就是「从哪个方向看相同 / 不同」，这几种多出一些（权重 3），别的问法各 1
  const cands: { w: number; make: () => Question | null }[] = []
  const add = (w: number, make: () => Question | null): void => {
    cands.push({ w, make })
  }
  if (same.length === 1) add(3, askSide('sameSide', same[0]!, 'sameside'))
  if (notSame.length === 1) add(3, askSide('diffSide', notSame[0]!, 'diffside'))
  else if (diff.length === 1) add(3, askSide('allDiff', diff[0]!, 'alldiff'))
  for (const s of SIDES) {
    if (st[s] === 'mixed') continue
    add(1, () =>
      labelQuestion({
        kpId,
        type: T,
        difficulty: d,
        sig: `issame-${id}-${s}`,
        stem: [say(pre, 'isSame', { side: sideL(pre, s), n }), solids()],
        correct: { k: `${pre}.${st[s] === 'same' ? 'same' : 'diff'}` },
        distractors: [{ k: `${pre}.${st[s] === 'same' ? 'diff' : 'same'}` }],
        rng,
      }),
    )
  }
  for (const s of same) add(1, () => allSee(pre, kpId, d, rng, id, objs, s))
  for (const s of SIDES) add(1, () => who(pre, kpId, d, rng, id, objs, s))
  if (n === 3) for (const s of SIDES) if (st[s] === 'mixed') add(1, () => pairSame(pre, kpId, d, rng, id, objs, s))
  // 按权重抽一种；这组问不清的（返回 null）去掉再抽
  while (cands.length) {
    let r = rng.next() * cands.reduce((a, c) => a + c.w, 0)
    let i = cands.findIndex((c) => (r -= c.w) < 0)
    if (i < 0) i = cands.length - 1
    const q = cands[i]!.make()
    if (q) return q
    cands.splice(i, 1)
  }
  return null
}

/** 「从某面看，这几个组合体看到的图形相同，是下面哪一个？」（例 2 的结论图）：正确的 + 两个近似的图形，标 1、2、3 */
function allSee(pre: Pre, kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[], side: Side): Question | null {
  const correct = viewOf(objs[0]!, side)
  const keys = new Set([viewKey(correct)])
  const near = nearViews(correct, side).filter((o) => {
    const k = viewKey(o.v)
    if (keys.has(k)) return false
    keys.add(k)
    return true
  })
  if (near.length < 2) return null
  // 从左面看先放左右翻过来的（后面画在左边）
  const picked = side === 'left' && near[0]!.role === 'M' ? [near[0]!, rng.pick(near.slice(1))] : rng.shuffle(near).slice(0, 2)
  const opts = rng.shuffle([{ role: 'C', v: correct }, ...picked])
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `allsee-${id}-${side}-${opts.map((o) => o.role).join('')}`,
    stem: [say(pre, 'allSee', { side: sideL(pre, side), n: objs.length }), solidsPart(objs.map((rows) => ({ rows }))), viewsPart(opts.map((o) => ({ blocks: o.v })), true)],
    value: opts.findIndex((o) => o.role === 'C') + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/**
 * 「从某面看，哪个组合体看到的是这个图形？」（练习一 7（1）改成选一个）：组合体换个顺序标 1、2、3……；
 * 只有一个看到的是它才问；从上面看时，别的组合体的图形转一转也不能和它重合（转了方向孩子会当成一样）
 */
export function who(pre: Pre, kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[], side: Side): Question | null {
  const views = objs.map((o) => viewOf(o, side))
  const keys = views.map(viewKey)
  const ok = range(objs.length).filter(
    (i) => keys.filter((k) => k === keys[i]).length === 1 && (side !== 'top' || views.every((v, j) => j === i || !congruent(v, views[i]!))),
  )
  if (!ok.length) return null
  const target = rng.pick(ok)
  const order = rng.shuffle(range(objs.length))
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `who-${id}-${side}-${target}-${order.join('')}`,
    stem: [say(pre, 'who', { side: sideL(pre, side) }), viewsPart([{ blocks: views[target]! }]), solidsPart(order.map((i) => ({ rows: objs[i]! })), true)],
    value: order.indexOf(target) + 1,
    rng,
    min: 1,
    max: objs.length,
    input: 'choice',
  })
}

/** 「从某面看，哪两个组合体看到的图形相同？」（练习一 4：从上面看第一个和第三个相同）：三个里恰好两个一样 */
function pairSame(pre: Pre, kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[], side: Side): Question | null {
  const order = rng.shuffle([0, 1, 2])
  const keys = order.map((i) => viewKey(viewOf(objs[i]!, side)))
  const pairs: [number, number][] = [
    [1, 2],
    [1, 3],
    [2, 3],
  ]
  const hit = pairs.filter(([a, b]) => keys[a - 1] === keys[b - 1])
  if (hit.length !== 1) return null
  const label = ([a, b]: [number, number]): LStr => ({ k: `${pre}.pair`, p: { a, b } })
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `pair-${id}-${side}-${order.join('')}`,
    stem: [say(pre, 'pairSame', { side: sideL(pre, side) }), solidsPart(order.map((i) => ({ rows: objs[i]! })), true)],
    correct: label(hit[0]!),
    distractors: pairs.filter((p) => p !== hit[0]).map(label),
    rng,
  })
}

/** 「从某面看，看到的图形是这样的有几个？」（练习一 7（1）：哪些从前面看是一格）：组合体都标号，图形是其中几个看到的 */
export function howMany(pre: Pre, kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[], side: Side): Question {
  const views = objs.map((o) => viewOf(o, side))
  const keys = views.map(viewKey)
  const pick = rng.int(0, objs.length - 1)
  const value = keys.filter((k) => k === keys[pick]).length
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `many-${id}-${side}-${keys[pick]}`,
    stem: [say(pre, 'howMany', { side: sideL(pre, side) }), viewsPart([{ blocks: views[pick]! }]), solidsPart(objs.map((rows) => ({ rows })), true)],
    value,
    rng,
    min: 1,
    max: objs.length,
    input: 'choice',
  })
}

/** 几个组合体的底（一层），在不同的格子上再摞 1–2 个，就是一组「不同的组合体」（例 2 的做法） */
const BASES_EASY: Rows[] = [
  [[1, 1, 1]],
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
]
const BASES_HARD: Rows[] = [
  [
    [1, 1, 1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
  ],
]
export function familySet(rng: RNG, hard: boolean): Rows[] | null {
  const base = rng.pick(hard ? BASES_HARD : BASES_EASY)
  const cands: Rows[] = []
  for (let r = 0; r < base.length; r++) {
    for (let c = 0; c < base[0]!.length; c++) {
      if (!base[r]![c]) continue
      for (const k of hard ? [1, 2] : [1, 1, 2]) {
        const rows = base.map((row) => [...row])
        rows[r]![c]! += k
        if (okShape(rows) && !cands.some((x) => rowsId(x) === rowsId(rows))) cands.push(rows)
      }
    }
  }
  return cands.length >= 3 ? rng.shuffle(cands).slice(0, hard ? rng.pick([3, 4]) : 3) : null
}

/** 例 2 男孩的话「从同一方向观察不同组合体，看到的图形可能相同」改成判断 */
export const JUDGES: { key: string; yes: boolean }[] = [
  { key: 'maybe', yes: true },
  { key: 'must', yes: false },
]
export function judge(pre: Pre, kpId: string, d: Difficulty, rng: RNG, j: { key: string; yes: boolean }): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig: `judge-${j.key}`, stem: [say(pre, j.key)], correct: j.yes ? yesL(pre) : noL(pre), distractors: [j.yes ? noL(pre) : yesL(pre)], rng })
}

/** 标数的俯视图（练习一 9）：从上面看到的格子，每格写这一摞几个；后排在上面 */
export function topCells(rows: Rows): TopCell[] {
  return rows.flatMap((row, i) => row.flatMap((h, x) => (h > 0 ? [{ x, y: rows.length - 1 - i, n: h }] : [])))
}
const topPart = (rows: Rows): StemPart => ({ kind: 'cube-top', cells: topCells(rows) })

/**
 * 标数的俯视图「从前面（左面）看是哪个图形」（练习一 9，第 3 档）：三幅图标 1、2、3——对的、另一个方向看到的、
 * 从左面看时把后面画到右边的（练习一 9 的 ④）/ 从前面看时左右反了的
 */
export function topPick(pre: Pre, kpId: string, d: Difficulty, rng: RNG, id: string, rows: Rows, side: 'front' | 'left'): Question | null {
  const correct = viewOf(rows, side)
  const other = viewOf(rows, side === 'front' ? 'left' : 'front')
  const keys = new Set([viewKey(correct)])
  const picked: { role: string; v: ViewBlock[] }[] = []
  for (const p of [
    { role: 'M', v: mirrorView(correct) },
    { role: 'O', v: other },
    { role: 'T', v: viewOf(rows, 'top') },
  ]) {
    const k = viewKey(p.v)
    if (keys.has(k)) continue
    keys.add(k)
    picked.push(p)
    if (picked.length === 2) break
  }
  if (picked.length < 2) return null
  const opts = rng.shuffle([{ role: 'C', v: correct }, ...picked])
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `toppick-${id}-${side}-${opts.map((o) => o.role).join('')}`,
    stem: [say(pre, 'topPick', { side: sideL(pre, side) }), topPart(rows), viewsPart(opts.map((o) => ({ blocks: o.v })), true)],
    value: opts.findIndex((o) => o.role === 'C') + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 标数的俯视图「一共用了几个小正方体」（第 3 档）：只数格子数是常见错 */
export function topCount(pre: Pre, kpId: string, d: Difficulty, rng: RNG, rows: Rows): Question {
  const value = cubeCount(rows)
  const cells = rows.flat().filter((h) => h > 0).length
  return numberQuestion({ kpId, type: T, difficulty: d, sig: `topcount-${rowsId(rows)}`, stem: [say(pre, 'topCount'), topPart(rows)], value, rng, min: 1, max: 30, smart: [cells, value - 1, value + 1] })
}

/** 随便一个标数的俯视图（2 排、2–3 列，每格 1–3 个） */
export function randomTop(rng: RNG): Rows | null {
  const rows = randomRows(rng, 2, rng.pick([2, 3, 3]), rng.int(5, 8), 3)
  return rows && rows.flat().some((h) => h >= 2) ? rows : null
}

function observe(d: Difficulty, rng: RNG): Question | null {
  const pre: Pre = 'm5.comb'
  const kp = KP_OBSERVE
  const roll = rng.next()
  const side = rng.pick(SIDES)
  if (d === 1) {
    // 例 1、练习一 1、2、3：看课本的组合体选图形 / 说从哪个方向看；例 2、做一做、练习一 4：三个组合体从哪个方向看相同、不同
    if (roll < 0.42) {
      const id = rng.pick(Object.keys(BOOK_OBS))
      const th = stackThing(id, BOOK_OBS[id]!)
      return rng.chance(0.55) ? pickView(pre, kp, d, rng, th, side, rng.chance(0.5)) : whichSide(pre, kp, d, rng, th, side)
    }
    if (roll < 0.52) {
      const th = barThing(3, 0)
      return rng.chance(0.5) ? pickView(pre, kp, d, rng, th, side, false) : whichSide(pre, kp, d, rng, th, side)
    }
    if (roll < 0.94) {
      const id = rng.pick(Object.keys(BOOK_SETS))
      return setQuestion(pre, kp, d, rng, id, BOOK_SETS[id]!)
    }
    return judge(pre, kp, d, rng, JUDGES[0]!)
  }
  if (d === 2) {
    // 换一个摆法（4–6 个）、正方体放在长方体中间 / 右端；换一组组合体；练习一 7（1）：十个里挑几个；判断
    if (roll < 0.3) {
      const th = randomThing(rng, false)
      if (!th) return null
      return rng.chance(0.55) ? pickView(pre, kp, d, rng, th, side, rng.chance(0.6)) : whichSide(pre, kp, d, rng, th, side)
    }
    if (roll < 0.42) {
      const th = barThing(3, rng.pick([1, 2]))
      return rng.chance(0.5) ? pickView(pre, kp, d, rng, th, side, false) : whichSide(pre, kp, d, rng, th, side)
    }
    if (roll < 0.62) {
      const objs = familySet(rng, false)
      return objs && setQuestion(pre, kp, d, rng, `f${objs.map(rowsId).join('_')}`, objs)
    }
    if (roll < 0.9) {
      const idx = rng
        .shuffle(range(P7.length))
        .slice(0, rng.chance(0.5) ? 3 : 5)
        .sort((a, b) => a - b)
      const objs = idx.map((i) => P7[i]!)
      const id = `p7${idx.join('.')}`
      if (objs.length === 3) return who(pre, kp, d, rng, id, objs, rng.pick(SIDES))
      return howMany(pre, kp, d, rng, id, objs, rng.pick(['front', 'left'] as const))
    }
    return judge(pre, kp, d, rng, rng.pick(JUDGES))
  }
  // 第 3 档：摆得更多、更高（最多 3 排 3 层）；三四个一组；练习一 9 标数的俯视图从前面 / 左面看是哪个
  if (roll < 0.25) {
    const th = randomThing(rng, true)
    if (!th) return null
    return rng.chance(0.5) ? pickView(pre, kp, d, rng, th, side, true) : whichSide(pre, kp, d, rng, th, side)
  }
  if (roll < 0.55) {
    const objs = familySet(rng, true)
    return objs && setQuestion(pre, kp, d, rng, `h${objs.map(rowsId).join('_')}`, objs)
  }
  if (roll < 0.75) return topPick(pre, kp, d, rng, 'p9', P9, rng.pick(['front', 'left'] as const))
  const rows = randomTop(rng)
  return rows && topPick(pre, kp, d, rng, rowsId(rows), rows, rng.pick(['front', 'left'] as const))
}

defineGenerator(KP_OBSERVE, (d, rng) => {
  for (let i = 0; i < 60; i++) {
    const q = observe(d, rng)
    if (q) return q
  }
  return setQuestion('m5.comb', KP_OBSERVE, d, rng, 'e2', BOOK_SETS.e2!)!
})

// ─────────────────────────────────────────────────────────────
// 还原简单组合体
// ─────────────────────────────────────────────────────────────

const allViewsKey = (rows: Rows): string => SIDES.map((s) => viewKey(viewOf(rows, s))).join('|')
const captioned = (pre: Pre, rows: Rows, sides: Side[] = SIDES): StemPart => viewsPart(sides.map((s) => ({ blocks: viewOf(rows, s), caption: sideL(pre, s) })))

/**
 * 「从某面看是这个图形，下面哪个组合体是这样摆的？」（例 3（1）、五下例 1）：三个组合体标 1、2、3，只有一个从这一面看是它；
 * n = 题目里说用几个小正方体（都用这么多），不说就 0
 */
export function fit(pre: Pre, kpId: string, d: Difficulty, rng: RNG, id: string, ok: Rows, wrongs: Rows[], side: Side, n = 0): Question | null {
  const want = viewKey(viewOf(ok, side))
  const pool = wrongs.filter((w, i) => viewKey(viewOf(w, side)) !== want && rowsId(w) !== rowsId(ok) && wrongs.findIndex((x) => rowsId(x) === rowsId(w)) === i)
  if (pool.length < 2) return null
  const objs = rng.shuffle([ok, ...rng.shuffle(pool).slice(0, 2)])
  const text = n ? say(pre, 'fitN', { n, side: sideL(pre, side) }) : say(pre, 'who', { side: sideL(pre, side) })
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `fit-${id}-${side}-${objs.map(rowsId).join('_')}`,
    stem: [text, viewsPart([{ blocks: viewOf(ok, side) }]), solidsPart(objs.map((rows) => ({ rows })), true)],
    value: objs.indexOf(ok) + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 和 rows 一样多个、从 side 看不一样的几种摆法（fit 的干扰）：摞的位置挪一挪、左右倒过来、前后倒过来、平铺成一排 */
export function variants(rows: Rows): Rows[] {
  const out: Rows[] = [mirrorRows(rows), flipRows(rows)]
  const R = rows.length
  const C = rows[0]!.length
  // 挪一个最上面的小正方体：从一摞上拿下来，放到别的有小正方体的格子上面，或者接在边上（一层）
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (!rows[r]![c]) continue
      for (let r2 = 0; r2 < R; r2++) {
        for (let c2 = 0; c2 < C; c2++) {
          if (r2 === r && c2 === c) continue
          if (!rows[r2]![c2] && rows[r]![c] === 1) continue
          const v = rows.map((row) => [...row])
          v[r]![c]! -= 1
          v[r2]![c2]! += 1
          out.push(v)
        }
      }
    }
  }
  // 平铺成一排
  const n = cubeCount(rows)
  if (n <= 5) out.push([range(n).map(() => 1)])
  return out.filter(okShape)
}

/** 由三个方向看到的图形数出用了几个小正方体（例 3（2）、做一做、练习一 6）：只能摆出一种的才问 */
export function countViews(pre: Pre, kpId: string, d: Difficulty, rng: RNG, rows: Rows): Question {
  const views = SIDES.map((s) => viewOf(rows, s))
  const value = cubeCount(rows)
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `count-${rowsId(rows)}`,
    stem: [say(pre, 'count'), captioned(pre, rows)],
    value,
    rng,
    min: 1,
    max: 30,
    // 常见错：只数了从前面看 / 从上面看的格子
    smart: [views[0]!.length, views[1]!.length, value - 1, value + 1],
  })
}

/** 「照这三个方向看到的图形摆，是下面哪一个？」：对的 + 两个三面里至少有一面不一样的（前后倒过来、挪了一块、少一块） */
export function buildPick(pre: Pre, kpId: string, d: Difficulty, rng: RNG, rows: Rows): Question | null {
  const want = allViewsKey(rows)
  const minus: Rows[] = []
  rows.forEach((row, r) =>
    row.forEach((h, c) => {
      if (h > 0) {
        const v = rows.map((x) => [...x])
        v[r]![c]! -= 1
        minus.push(v)
      }
    }),
  )
  const pool = [...variants(rows), ...minus.filter(okShape)].filter((w, i, all) => allViewsKey(w) !== want && all.findIndex((x) => rowsId(x) === rowsId(w)) === i)
  if (pool.length < 2) return null
  // 先放前后倒过来的（从上面看颠倒了）
  const flipped = pool.find((w) => rowsId(w) === rowsId(flipRows(rows)))
  const wrongs = flipped ? [flipped, rng.pick(pool.filter((w) => w !== flipped))] : rng.shuffle(pool).slice(0, 2)
  const objs = rng.shuffle([rows, ...wrongs])
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `build-${objs.map(rowsId).join('_')}`,
    stem: [say(pre, 'build'), captioned(pre, rows), solidsPart(objs.map((o) => ({ rows: o })), true)],
    value: objs.indexOf(rows) + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 「从前面看是这个图形，最少要用几个小正方体？」（练习一 8）：每列摞到这么高、排成一排就最少 */
export function least(pre: Pre, kpId: string, d: Difficulty, rng: RNG, heights: number[]): Question {
  const value = heights.reduce((a, b) => a + b, 0)
  const blocks = heights.flatMap((h, x) => range(h).map((y) => ({ x, y })))
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `least-${heights.join('')}`,
    stem: [say(pre, 'least', { side: sideL(pre, 'front') }), viewsPart([{ blocks }])],
    value,
    rng,
    min: 1,
    max: 20,
    smart: [value + 1, value - 1, heights.length],
  })
}

/**
 * 「用 n 个小正方体摆，从前面看、从上面看是这样，从左面看是哪个？」（练习一 5）：三幅图标 1、2、3——对的、左右翻过来的
 * （后面画到右边）、另一种；只有所有摆法从左面看都一样才问
 */
export function leftFrom(pre: Pre, kpId: string, d: Difficulty, rng: RNG, rows: Rows): Question | null {
  const n = cubeCount(rows)
  const foot = rows.map((r) => r.map((h) => h > 0))
  if (leftKeysFrom(frontHeights(rows), foot, n).size !== 1) return null
  const correct = viewOf(rows, 'left')
  const keys = new Set([viewKey(correct)])
  const picked: { role: string; v: ViewBlock[] }[] = []
  const lh = leftHeights(rows)
  for (const p of [
    { role: 'M', v: mirrorView(correct) },
    { role: 'F', v: viewOf(rows, 'front') },
    { role: 'P', v: lh.flatMap((h, x) => range(x === lh.length - 1 ? h + 1 : h).map((y) => ({ x, y }))) },
    { role: 'S', v: lh.flatMap((h, x) => range(h > 1 ? h - 1 : h).map((y) => ({ x, y }))) },
  ]) {
    const k = viewKey(p.v)
    if (keys.has(k)) continue
    keys.add(k)
    picked.push(p)
    if (picked.length === 2) break
  }
  if (picked.length < 2) return null
  const opts = rng.shuffle([{ role: 'C', v: correct }, ...picked])
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `leftfrom-${rowsId(rows)}-${opts.map((o) => o.role).join('')}`,
    stem: [say(pre, 'leftFrom', { n }), captioned(pre, rows, ['front', 'top']), viewsPart(opts.map((o) => ({ blocks: o.v })), true)],
    value: opts.findIndex((o) => o.role === 'C') + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 能由三个方向看到的图形唯一摆出来的组合体（第 2 档 2 排、最多 2 层，第 3 档可以 3 排、3 层） */
export function countShape(rng: RNG, hard: boolean): Rows | null {
  const R = hard ? rng.pick([2, 3]) : 2
  const C = hard ? rng.pick([2, 3, 4]) : rng.pick([3, 4])
  const rows = randomRows(rng, R, C, rng.int(5, hard ? 9 : 7), hard ? 3 : 2)
  return rows && uniqueFromViews(rows) ? rows : null
}

/** 例 3（1）的干扰：用同样多的小正方体，从前面看不是「下 2 + 左上 1」的 */
const E3A_WRONG: Rows[] = [
  [[1, 2]],
  [[1, 1, 1]],
  [
    [1, 2],
    [1, 0],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [[2, 2]],
  [[1, 2, 1]],
  [
    [1, 2],
    [0, 1],
  ],
]

function restore(d: Difficulty, rng: RNG): Question | null {
  const pre: Pre = 'm5.comb'
  const kp = KP_RESTORE
  const roll = rng.next()
  if (d === 1) {
    // 例 3（1）：从前面看到的是 L，下面哪种摆法对；例 3（2）、做一做、练习一 6：由三个方向看到的图形，用了几个、是哪一个
    if (roll < 0.4) {
      const ok = rng.pick(E3A)
      const n = cubeCount(ok)
      return fit(pre, kp, d, rng, 'e3a', ok, E3A_WRONG.filter((w) => cubeCount(w) === n), 'front', n)
    }
    if (roll < 0.62) return countViews(pre, kp, d, rng, rng.pick([E3, E3Z, P6]))
    return buildPick(pre, kp, d, rng, rng.pick([E3, E3Z]))
  }
  if (d === 2) {
    // 练习一 5：前面 + 上面 + 5 个 → 从左面看；练习一 8：最少几个；换一个组合体：从某面看是这个图形的是哪个、用了几个、是哪一个
    if (roll < 0.18) return leftFrom(pre, kp, d, rng, P5)
    if (roll < 0.32) return least(pre, kp, d, rng, rng.pick([[1, 2], [2, 1], [1, 2, 1], [2, 1, 1], [1, 1, 2], [3, 1], [2, 2, 1], [1, 3, 1]]))
    if (roll < 0.55) {
      const th = randomThing(rng, false)
      if (!th) return null
      const rows = (th.solid as { rows: Rows }).rows
      return fit(pre, kp, d, rng, rowsId(rows), rows, variants(rows), rng.pick(['front', 'front', 'left'] as const), cubeCount(rows))
    }
    if (roll < 0.75) {
      const rows = countShape(rng, false)
      return rows && countViews(pre, kp, d, rng, rows)
    }
    if (roll < 0.88) {
      const rows = countShape(rng, false)
      return rows && buildPick(pre, kp, d, rng, rows)
    }
    const rows = countShape(rng, false)
    return rows && leftFrom(pre, kp, d, rng, rows)
  }
  // 第 3 档：标数的俯视图一共几个（练习一 9）、3 排 3 层的组合体
  if (roll < 0.3) return topCount(pre, kp, d, rng, rng.chance(0.4) ? P9 : (randomTop(rng) ?? P9))
  if (roll < 0.6) {
    const rows = countShape(rng, true)
    return rows && countViews(pre, kp, d, rng, rows)
  }
  if (roll < 0.8) {
    const rows = countShape(rng, true)
    return rows && buildPick(pre, kp, d, rng, rows)
  }
  const rows = countShape(rng, true)
  return rows && leftFrom(pre, kp, d, rng, rows)
}

defineGenerator(KP_RESTORE, (d, rng) => {
  for (let i = 0; i < 60; i++) {
    const q = restore(d, rng)
    if (q) return q
  }
  return countViews('m5.comb', KP_RESTORE, d, rng, E3)
})
