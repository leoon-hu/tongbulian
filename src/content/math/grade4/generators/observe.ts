// 四下「观察物体（二）」的生成器（四年级数学下册 E）。
import type { CubeSolid, CubeViewFig, Difficulty, LParam, LStr, Question, StemPart, ViewBlock } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { NO, YES } from './angles'

// ─────────────────────────────────────────────────────────────
// 观察物体（二）（四下二，第 13–16 页）：课本没印小节标题，按例 1、例 2 分两个知识点——
// 从不同位置观察物体（例 1 + 做一做，练习四 1、2、3、6、7*）：4–7 个小正方体搭的物体从前面、上面、左面看到的图形，
// 正方体和长方体摆在一起，由三个位置看到的图形摆出物体（问用了几个小正方体）；
// 观察不同的物体（例 2 + 做一做，练习四 4、5）：几个物体从同一个位置看，图形可能相同，问从哪面看相同、哪面看不同。
// 课本只说「从前面 / 上面 / 左面看」（没有右面、后面，也不说主视图）；画法照课本：从上面看时后排画在上面，
// 从左面看时物体的后面画在左边（练习四 1）。「连一连」「摆一摆」「画一画」改成选一选：选看到的图形（图下面标 1、2、3）
// 或选从哪面看的；三个物体「从哪面看相同」只有一个对的才问（课本例 2 有两面相同的，就问「哪面不同」、每一面「相同吗」）。
// 物体都用高度图表示（rows：第一行是最后面、最后一行是最前面，每格这一摞几个），看到的图形由它算出来。
// ─────────────────────────────────────────────────────────────

const T = 'view' as const
export const KP_POS = 'm4s2-02-positions'
export const KP_OBJ = 'm4s2-02-objects'

/** 高度图：第一行是最后面（离看的人最远）、最后一行是最前面，列从左到右，每格是这一摞有几个小正方体 */
export type Rows = number[][]
export type Side = 'front' | 'top' | 'left'
export const SIDES: Side[] = ['front', 'top', 'left']

const text = (k: string, p?: Record<string, LParam>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
export const sideL = (s: Side): LStr => ({ k: `m4.obs.side.${s}` })
const solidsPart = (items: CubeSolid[], numbered = false): StemPart => ({ kind: 'cube-solids', items, ...(numbered ? { numbered: true } : {}) })
const viewsPart = (items: CubeViewFig[], numbered = false): StemPart => ({ kind: 'cube-views', items, ...(numbered ? { numbered: true } : {}) })
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)
const rowsId = (rows: Rows): string => rows.map((r) => r.join('')).join('.')

// ─────────────────────────────────────────────────────────────
// 看到的图形：由高度图算
// ─────────────────────────────────────────────────────────────

export const cubeCount = (rows: Rows): number => rows.flat().reduce((a, b) => a + b, 0)
/** 从前面看：每一列有几层（这一列前后几摞里最高的） */
export const frontHeights = (rows: Rows): number[] => rows[0]!.map((_, c) => Math.max(...rows.map((r) => r[c] ?? 0)))
/** 从左面看：每一排有几层，从左到右是物体的从后到前 */
export const leftHeights = (rows: Rows): number[] => rows.map((r) => Math.max(...r))

/** 从某个位置看到的图形（一格一块）：从前面 / 左面看是一列一列摞起来的；从上面看是有小正方体的格子，后排在上面 */
export function viewOf(rows: Rows, side: Side): ViewBlock[] {
  const columns = (hs: number[]): ViewBlock[] => hs.flatMap((h, x) => range(h).map((y) => ({ x, y })))
  if (side === 'front') return columns(frontHeights(rows))
  if (side === 'left') return columns(leftHeights(rows))
  return rows.flatMap((row, i) => row.flatMap((h, x) => (h > 0 ? [{ x, y: rows.length - 1 - i }] : [])))
}

/**
 * 正方体和长方体（练习四 2）：长方体横放、len 个正方体那么长，正方体放在它上面从左数第 on 格。
 * 从前面看：下面一整条长方体、上面一格正方体；从左面看：长方体的一头在下、正方体在上；从上面看：正方体盖住长方体的那一格
 */
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
/** 左右翻过来（从左面看把后面画到了右边：G14 说的常见错） */
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
  const kb = viewKey(b)
  return forms(a).includes(kb)
}
const connected = (v: ViewBlock[]): boolean => {
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
/**
 * 每一摞最上面那个小正方体的顶面露出来多少（0–1，按画的顺序看后画的盖住了多少），与 rows 一一对应（空格是 1）。
 * 斜着画时往后两排差不多往右挪了一格，前面右边高的那一摞会把后面的整个挡住，光看「后面不比前面矮」不够
 */
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
 * 能画、能看清的物体：每一排、每一列都有小正方体，连成一片（从上面看），每一摞都不比它前面的矮（课本的物体都是这样：
 * 练习四 1 后排比前排高），而且每一摞的顶面至少露出一半——不然后面那一摞被挡住，孩子看不清
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
 * 由从前面、上面、左面看到的图形摆物体（练习四 6）：从上面看定下哪几格有，每格摞 1…（这一列、这一排最高的）个，
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
/** 三个位置看到的图形只能摆出这一种 */
export function uniqueFromViews(rows: Rows): boolean {
  const foot = rows.map((r) => r.map((h) => h > 0))
  return arrangements(frontHeights(rows), leftHeights(rows), foot).length === 1
}

/** 台阶状的物体（练习四 7*）：n 排 n 列，越往左后越高（左后角 n 层） */
export const stairs = (n: number): Rows => range(n).map((r) => range(n).map((c) => Math.max(0, n - r - c)))

/**
 * 随便搭一个：R 排 C 列里连成一片的几格（每排每列都有），先每格放 1 个，再往上摞，摞的时候保证每一摞都不比它前面的矮
 * （往前排摞要后面那一摞更高才行）；最高 maxH 层，一共 cubes 个
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

// ─────────────────────────────────────────────────────────────
// 课本里的物体
// ─────────────────────────────────────────────────────────────

/** 从不同位置观察物体：例 1、做一做、练习四 1、3（1）、3（2） */
export const BOOK_POS: Record<string, Rows> = {
  e1: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  e1z: [
    [0, 1, 0],
    [1, 1, 1],
  ],
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
/** 练习四 6：从前面、上面、左面看到的图形摆出来，7 个 */
export const P6: Rows = [
  [0, 0, 2, 1],
  [1, 1, 1, 1],
]
/** 观察不同的物体：例 2、做一做、练习四 4 的三个物体 */
export const SETS: Record<string, Rows[]> = {
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
/** 练习四 5 的六个物体（都只有一层，各 4 个） */
export const P5: Rows[] = [
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1],
    [0, 1],
    [0, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [1, 1, 1],
    [0, 0, 1],
  ],
]
/** 一层 4 个的物体（练习四 5 的六个，再加几个摆法）：第 2 档以后从这里挑 */
const FLAT: Rows[] = [
  ...P5,
  [[1, 1, 1, 1]],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [0, 1],
  ],
  [
    [0, 1],
    [0, 1],
    [1, 1],
  ],
  [
    [1, 1],
    [1, 0],
    [1, 0],
  ],
]
/** 几个物体的底（一层），在不同的格子上再摞 1–2 个，就是一组「不同的物体」（例 2 的做法） */
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

// ─────────────────────────────────────────────────────────────
// 从不同位置观察物体
// ─────────────────────────────────────────────────────────────

/** 一个要观察的物体：小正方体搭的，或正方体和长方体 */
interface Thing {
  id: string
  solid: CubeSolid
  view: (s: Side) => ViewBlock[]
}
const stackThing = (id: string, rows: Rows): Thing => ({ id, solid: { rows }, view: (s) => viewOf(rows, s) })
const barThing = (len: number, on: number): Thing => ({ id: `bar${len}${on}`, solid: { bar: len, on }, view: (s) => barView(len, on, s) })

/** 选项图形的来历（签名里用）：F / T / L 三个位置看到的，M 左右翻了，V 上下翻了 */
type Role = Side | 'mirror' | 'flip'
const ROLE: Record<Role, string> = { front: 'F', top: 'T', left: 'L', mirror: 'M', flip: 'V' }

/**
 * 「从某面看，看到的是哪个图形？」（例 1 的连一连）：三幅图下面标 1、2、3——正确的那幅 + 另外两个位置看到的；
 * trap 时先放常见的画错的：从左面看把后面画到右边（左右翻）、从上面看把前排画到上面（上下翻）
 */
function pickView(kpId: string, d: Difficulty, rng: RNG, th: Thing, side: Side, trap: boolean): Question | null {
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
    stem: [text('m4.obs.pick', { side: sideL(side) }), solidsPart([th.solid]), viewsPart(opts.map((o) => ({ blocks: o.v })), true)],
    value: opts.findIndex((o) => o.role === side) + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 「下面的图形是从什么位置看到的？」：这个图形只有从这一面看得到（另外两面看到的不一样）才问 */
function whichSide(kpId: string, d: Difficulty, rng: RNG, th: Thing, side: Side): Question | null {
  const key = viewKey(th.view(side))
  if (SIDES.some((s) => s !== side && viewKey(th.view(s)) === key)) return null
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `which-${th.id}-${side}`,
    stem: [text('m4.obs.which'), solidsPart([th.solid]), viewsPart([{ blocks: th.view(side) }])],
    correct: sideL(side),
    distractors: SIDES.filter((s) => s !== side).map(sideL),
    rng,
  })
}

/** 由三个位置看到的图形数出用了几个小正方体（练习四 6 的「摆出来」）：只能摆出一种的才问 */
function countViews(kpId: string, d: Difficulty, rng: RNG, rows: Rows): Question {
  const views = SIDES.map((s) => viewOf(rows, s))
  const value = cubeCount(rows)
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `count-${rowsId(rows)}`,
    stem: [text('m4.obs.count'), viewsPart(SIDES.map((s, i) => ({ blocks: views[i]!, caption: sideL(s) })))],
    value,
    rng,
    min: 1,
    max: 30,
    // 常见错：只数了从前面看 / 从上面看的格子
    smart: [views[0]!.length, views[1]!.length, value - 1, value + 1],
  })
}

/** 台阶状的物体由几个小正方体搭成（练习四 7*，看不见的也算）：只数看得见的那几摞是常见错 */
function pile(kpId: string, d: Difficulty, rng: RNG, n: number): Question {
  const rows = stairs(n)
  const value = cubeCount(rows)
  const stacks = rows.flat().filter((h) => h > 0).length
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `pile-${n}`,
    stem: [text('m4.obs.pile'), solidsPart([{ rows }])],
    value,
    rng,
    min: 1,
    max: 40,
    smart: [stacks, value - 1, value + 1],
  })
}

/** 随便搭一个物体（不行就 null，外面重来） */
function randomThing(rng: RNG, hard: boolean): Thing | null {
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

/** 能由三个位置看到的图形唯一摆出来的物体（第 2 档 2 排、最多 2 层，第 3 档可以 3 排、3 层） */
function countShape(rng: RNG, hard: boolean): Rows | null {
  const R = hard ? rng.pick([2, 3]) : 2
  const C = hard ? rng.pick([2, 3, 4]) : rng.pick([3, 4])
  const rows = randomRows(rng, R, C, rng.int(5, hard ? 9 : 7), hard ? 3 : 2)
  return rows && uniqueFromViews(rows) ? rows : null
}

function positions(d: Difficulty, rng: RNG): Question | null {
  const kp = KP_POS
  const roll = rng.next()
  const side = rng.pick(SIDES)
  if (d === 1) {
    // 例 1、做一做、练习四 1、3：看小正方体搭的物体选图形 / 说从哪面看；练习四 2：正方体放在长方体左端上面
    if (roll < 0.8) {
      const id = rng.pick(Object.keys(BOOK_POS))
      const th = stackThing(id, BOOK_POS[id]!)
      return roll < 0.45 ? pickView(kp, d, rng, th, side, rng.chance(0.5)) : whichSide(kp, d, rng, th, side)
    }
    const th = barThing(3, 0)
    return rng.chance(0.5) ? pickView(kp, d, rng, th, side, false) : whichSide(kp, d, rng, th, side)
  }
  if (d === 2) {
    // 变式：换一个搭法（4–6 个）、正方体放在长方体的中间 / 右端；练习四 6：由三个位置看到的图形数出用了几个
    if (roll < 0.35) {
      const th = randomThing(rng, false)
      return th && pickView(kp, d, rng, th, side, rng.chance(0.6))
    }
    if (roll < 0.55) {
      const th = randomThing(rng, false)
      return th && whichSide(kp, d, rng, th, side)
    }
    if (roll < 0.7) {
      const th = barThing(3, rng.pick([1, 2]))
      return rng.chance(0.5) ? pickView(kp, d, rng, th, side, false) : whichSide(kp, d, rng, th, side)
    }
    if (rng.chance(0.4)) return countViews(kp, d, rng, P6)
    const rows = countShape(rng, false)
    return rows && countViews(kp, d, rng, rows)
  }
  // 第 3 档：搭得更多、更高（最多 3 排 3 层），长方体换长短；由三个位置看到的图形数个数；练习四 7* 台阶
  if (roll < 0.25) {
    const th = randomThing(rng, true)
    return th && pickView(kp, d, rng, th, side, true)
  }
  if (roll < 0.4) {
    const th = randomThing(rng, true)
    return th && whichSide(kp, d, rng, th, side)
  }
  if (roll < 0.5) {
    const len = rng.pick([2, 4])
    const th = barThing(len, rng.int(0, len - 1))
    return rng.chance(0.5) ? pickView(kp, d, rng, th, side, false) : whichSide(kp, d, rng, th, side)
  }
  if (roll < 0.8) {
    const rows = countShape(rng, true)
    return rows && countViews(kp, d, rng, rows)
  }
  return pile(kp, d, rng, rng.pick([3, 4, 4]))
}

defineGenerator(KP_POS, (d, rng) => {
  for (let i = 0; i < 60; i++) {
    const q = positions(d, rng)
    if (q) return q
  }
  return whichSide(KP_POS, d, rng, stackThing('e1', BOOK_POS.e1!), 'front')!
})

// ─────────────────────────────────────────────────────────────
// 观察不同的物体
// ─────────────────────────────────────────────────────────────

/** 几个物体从同一面看：都一样（same）、两两都不一样（diff）、有的一样有的不一样（mixed） */
export type Status = 'same' | 'diff' | 'mixed'
export function statusOf(objs: Rows[], side: Side): Status {
  const keys = objs.map((o) => viewKey(viewOf(o, side)))
  const n = new Set(keys).size
  return n === 1 ? 'same' : n === keys.length ? 'diff' : 'mixed'
}
const SAME: LStr = { k: 'm4.obs.same' }
const DIFF: LStr = { k: 'm4.obs.diff' }

/** 「这几个物体从哪面看相同」时的近似图形：左右翻、上下翻、横竖倒过来、多一格、少一格（少了以后还要连在一起） */
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
 * 一组物体出一道题：从下面几种问法里挑一种这组物体问得清楚的（只有一个对的答案）——
 * 从哪面看都相同 / 哪面不同 / 哪面都不相同、从某面看相同吗、都一样的是哪个图形、哪个物体看到的是这个图形、
 * 哪两个物体看到的相同。课本例 2 有两面都相同的（上面和左面），不问「从哪面看相同」（两个对的），问哪面不同、每一面相同吗
 */
function setQuestion(kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[]): Question | null {
  const n = objs.length
  const st = Object.fromEntries(SIDES.map((s) => [s, statusOf(objs, s)])) as Record<Side, Status>
  const same = SIDES.filter((s) => st[s] === 'same')
  const notSame = SIDES.filter((s) => st[s] !== 'same')
  const diff = SIDES.filter((s) => st[s] === 'diff')
  const solids = (numbered = false): StemPart => solidsPart(objs.map((rows) => ({ rows })), numbered)
  const askSide = (key: string, side: Side, fam: string) => (): Question =>
    labelQuestion({
      kpId,
      type: T,
      difficulty: d,
      sig: `${fam}-${id}`,
      stem: [text(key, { n }), solids()],
      correct: sideL(side),
      distractors: SIDES.filter((s) => s !== side).map(sideL),
      rng,
    })
  // 课本问的就是「从哪面看相同 / 不同」，这几种多出一些（权重 3），别的问法各 1
  const cands: { w: number; make: () => Question | null }[] = []
  const add = (w: number, make: () => Question | null): void => {
    cands.push({ w, make })
  }
  if (same.length === 1) add(3, askSide('m4.obs.sameSide', same[0]!, 'sameside'))
  if (notSame.length === 1) add(3, askSide('m4.obs.diffSide', notSame[0]!, 'diffside'))
  else if (diff.length === 1) add(3, askSide('m4.obs.allDiff', diff[0]!, 'alldiff'))
  for (const s of SIDES) {
    if (st[s] === 'mixed') continue
    add(1, () =>
      labelQuestion({
        kpId,
        type: T,
        difficulty: d,
        sig: `issame-${id}-${s}`,
        stem: [text('m4.obs.isSame', { side: sideL(s), n }), solids()],
        correct: st[s] === 'same' ? SAME : DIFF,
        distractors: [st[s] === 'same' ? DIFF : SAME],
        rng,
      }),
    )
  }
  for (const s of same) add(1, () => allSee(kpId, d, rng, id, objs, s))
  for (const s of SIDES) add(1, () => who(kpId, d, rng, id, objs, s))
  if (n === 3) for (const s of SIDES) if (st[s] === 'mixed') add(1, () => pairSame(kpId, d, rng, id, objs, s))
  // 按权重抽一种；这组物体问不清的（返回 null）去掉再抽
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

/** 「从某面看，这几个物体看到的图形相同，是下面哪一个？」（例 2 的结论图）：正确的 + 两个近似的图形，标 1、2、3 */
function allSee(kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[], side: Side): Question | null {
  const correct = viewOf(objs[0]!, side)
  const keys = new Set([viewKey(correct)])
  const near = nearViews(correct, side).filter((o) => {
    const k = viewKey(o.v)
    if (keys.has(k)) return false
    keys.add(k)
    return true
  })
  if (near.length < 2) return null
  // 从左面看先放左右翻过来的（G14：后面画在左边）
  const picked = side === 'left' && near[0]!.role === 'M' ? [near[0]!, rng.pick(near.slice(1))] : rng.shuffle(near).slice(0, 2)
  const opts = rng.shuffle([{ role: 'C', v: correct }, ...picked])
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `allsee-${id}-${side}-${opts.map((o) => o.role).join('')}`,
    stem: [text('m4.obs.allSee', { side: sideL(side), n: objs.length }), solidsPart(objs.map((rows) => ({ rows }))), viewsPart(opts.map((o) => ({ blocks: o.v })), true)],
    value: opts.findIndex((o) => o.role === 'C') + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/**
 * 「从某面看，哪个物体看到的是这个图形？」（练习四 5 的「看到的图形是 ▭▭ 的有哪几个」改成选一个）：物体换个顺序标 1、2、3……；
 * 只有一个物体看到的是它才问；从上面看时，别的物体的图形转一转也不能和它重合（转了方向孩子会当成一样）
 */
function who(kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[], side: Side): Question | null {
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
    stem: [text('m4.obs.who', { side: sideL(side) }), viewsPart([{ blocks: views[target]! }]), solidsPart(order.map((i) => ({ rows: objs[i]! })), true)],
    value: order.indexOf(target) + 1,
    rng,
    min: 1,
    max: objs.length,
    input: 'choice',
  })
}

/** 「从某面看，哪两个物体看到的图形相同？」（练习四 4：从上面看甲和丙相同）：三个物体里恰好两个一样 */
function pairSame(kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[], side: Side): Question | null {
  const order = rng.shuffle([0, 1, 2])
  const keys = order.map((i) => viewKey(viewOf(objs[i]!, side)))
  const pairs: [number, number][] = [
    [1, 2],
    [1, 3],
    [2, 3],
  ]
  const hit = pairs.filter(([a, b]) => keys[a - 1] === keys[b - 1])
  if (hit.length !== 1) return null
  const label = ([a, b]: [number, number]): LStr => ({ k: 'm4.obs.pair', p: { a, b } })
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `pair-${id}-${side}-${order.join('')}`,
    stem: [text('m4.obs.pairSame', { side: sideL(side) }), solidsPart(order.map((i) => ({ rows: objs[i]! })), true)],
    correct: label(hit[0]!),
    distractors: pairs.filter((p) => p !== hit[0]).map(label),
    rng,
  })
}

/** 「从某面看，看到的图形是这样的有几个？」（练习四 5（1）（2））：物体都标号，图形是其中几个看到的 */
function howMany(kpId: string, d: Difficulty, rng: RNG, id: string, objs: Rows[], side: Side): Question {
  const views = objs.map((o) => viewOf(o, side))
  const keys = views.map(viewKey)
  const pick = rng.int(0, objs.length - 1)
  const value = keys.filter((k) => k === keys[pick]).length
  return numberQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `many-${id}-${side}-${keys[pick]}`,
    stem: [text('m4.obs.howMany', { side: sideL(side) }), viewsPart([{ blocks: views[pick]! }]), solidsPart(objs.map((rows) => ({ rows })), true)],
    value,
    rng,
    min: 1,
    max: objs.length,
    input: 'choice',
  })
}

/** 一组「不同的物体」：同一个底，在不同的格子上摞 1–2 个（例 2 的做法） */
function familySet(rng: RNG, hard: boolean): Rows[] | null {
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

const JUDGES: { key: string; yes: boolean }[] = [
  { key: 'm4.obs.maybe', yes: true },
  { key: 'm4.obs.must', yes: false },
]

function objects(d: Difficulty, rng: RNG): Question | null {
  const kp = KP_OBJ
  const roll = rng.next()
  if (d === 1) {
    // 例 2、做一做、练习四 4：三个物体从哪面看相同 / 不同；练习四 5：从某面看是这个图形的有几个、是哪一个
    if (roll < 0.7) {
      const id = rng.pick(Object.keys(SETS))
      return setQuestion(kp, d, rng, id, SETS[id]!)
    }
    if (roll < 0.85) return howMany(kp, d, rng, 'p5', P5, rng.pick(['front', 'left'] as const))
    const idx = rng.shuffle(range(P5.length)).slice(0, 3).sort()
    return who(kp, d, rng, `p5${idx.join('')}`, idx.map((i) => P5[i]!), rng.pick(SIDES))
  }
  if (d === 2) {
    // 换一组物体（同一个底、在不同的格子上摞）；一层的物体挑几个；成长小档案的结论（判断）
    if (roll < 0.55) {
      const objs = familySet(rng, false)
      return objs && setQuestion(kp, d, rng, `f${objs.map(rowsId).join('_')}`, objs)
    }
    if (roll < 0.85) {
      const idx = rng.shuffle(range(FLAT.length)).slice(0, rng.chance(0.5) ? 3 : 5)
      const objs = idx.map((i) => FLAT[i]!)
      const id = `flat${idx.join('.')}`
      if (objs.length === 3) return who(kp, d, rng, id, objs, rng.pick(SIDES))
      return howMany(kp, d, rng, id, objs, rng.pick(['front', 'left'] as const))
    }
    const j = rng.pick(JUDGES)
    return labelQuestion({ kpId: kp, type: T, difficulty: d, sig: `judge-${j.key}`, stem: [text(j.key)], correct: j.yes ? YES : NO, distractors: [j.yes ? NO : YES], rng })
  }
  // 第 3 档：两排、更高的物体，三四个一组
  const objs = familySet(rng, true)
  return objs && setQuestion(kp, d, rng, `h${objs.map(rowsId).join('_')}`, objs)
}

defineGenerator(KP_OBJ, (d, rng) => {
  for (let i = 0; i < 60; i++) {
    const q = objects(d, rng)
    if (q) return q
  }
  return setQuestion(KP_OBJ, d, rng, 'e2', SETS.e2!)!
})
