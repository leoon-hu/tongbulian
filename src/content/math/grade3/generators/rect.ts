import type { Difficulty, GeoFig, GeoItem, GeoPt, GeoTone, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelKey, labelQuestion, numberQuestion } from '@/engine'
import { dir, fitFig, geoPart, irregularPts, mapItem, r1, regularPts, rotate, shapeSig, text } from './lines'

// ─────────────────────────────────────────────────────────────
// 长方形和正方形（三下三）：多边形、长方形和正方形的特点、周长、长方形和正方形的周长（含拼图游戏「四连方」）。
// 图里边上只标数（课本写「（单位：厘米）」），单位写在题目里；「长」只在「长方形」「长度」「边长」「周长」里出现，
// 公式选项「(长 + 宽) × 2」「长 × 宽」「长 + 宽」和比较题的「更长」「一样长」是单独的「长」（读法表里要有规则）。
// 课本不讨论「正方形是不是长方形」，这里也不出这种题。
// ─────────────────────────────────────────────────────────────

export type LenUnit = 'cm' | 'dm' | 'm'
export const LEN_ZH: Record<LenUnit, string> = { cm: '厘米', dm: '分米', m: '米' }
/** 长度单位用「毫米、分米和千米」单元的通用词条 m3.u.*（英文界面写 cm、dm、m） */
export const lenL = (u: LenUnit): LStr => ({ k: `m3.u.${u}` })
const L = (k: string, p?: Record<string, string | number | LStr>): LStr => (p ? { k, p } : { k })

// ── 画图的小工具（图形的面积 area.ts 也用） ──

/** 长方形画在图上的大小（像素）：按 a : b 的比例，太扁、太长的压一压（课本的图也不按比例） */
export function drawSize(a: number, b: number, maxW = 200, maxH = 120): [number, number] {
  const r = Math.min(3, Math.max(0.4, a / b))
  let W = maxW
  let H = W / r
  if (H > maxH) {
    H = maxH
    W = H * r
  }
  return [r1(W), r1(H)]
}

/** 标了边的长方形：labels 依次是上、右、下、左四条边（null 不标） */
export function rectItems(W: number, H: number, labels: (string | null)[], fill: GeoTone = 'a'): GeoItem[] {
  return [
    {
      t: 'poly',
      pts: [
        [0, 0],
        [W, 0],
        [W, H],
        [0, H],
      ],
      fill,
      stroke: fill,
      labels,
    },
  ]
}

const cellKey = (c: GeoPt): string => `${c[0]},${c[1]}`

/** 把格子挪到左上角是 (0, 0) */
export function normCells(cells: GeoPt[]): GeoPt[] {
  const x0 = Math.min(...cells.map((c) => c[0]))
  const y0 = Math.min(...cells.map((c) => c[1]))
  return cells.map((c) => [c[0] - x0, c[1] - y0] as GeoPt).sort((a, b) => a[1] - b[1] || a[0] - b[0])
}

/** 一组格子的外框大小 */
export function cellBox(cells: GeoPt[]): { w: number; h: number } {
  return { w: Math.max(...cells.map((c) => c[0])) + 1, h: Math.max(...cells.map((c) => c[1])) + 1 }
}

/** 中间有没有被围住的空格（只会有单个的：本单元的图形都不超过 12 格） */
function hasHole(cells: GeoPt[]): boolean {
  const has = new Set(cells.map(cellKey))
  const { w, h } = cellBox(cells)
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      if (has.has(`${x},${y}`)) continue
      if ([`${x - 1},${y}`, `${x + 1},${y}`, `${x},${y - 1}`, `${x},${y + 1}`].every((k) => has.has(k))) return true
    }
  return false
}

/** 随机长一个 n 格的连通图形（从一格开始往四周长），外框不超过 maxW × maxH，中间没有空洞 */
export function polyomino(n: number, rng: RNG, maxW: number, maxH: number): GeoPt[] {
  for (;;) {
    const list: GeoPt[] = [[0, 0]]
    const has = new Set(['0,0'])
    while (list.length < n) {
      const [c, r] = rng.pick(list)
      const [dc, dr] = rng.pick([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const)
      const k = `${c + dc},${r + dr}`
      if (has.has(k)) continue
      has.add(k)
      list.push([c + dc, r + dr])
    }
    const cells = normCells(list)
    const { w, h } = cellBox(cells)
    if (w > maxW || h > maxH || hasHole(cells)) continue
    return cells
  }
}

/** 格子拼成的图形的周长（外沿有几条小方格的边） */
export function cellPerimeter(cells: GeoPt[]): number {
  const has = new Set(cells.map(cellKey))
  let n = 0
  for (const [c, r] of cells) for (const k of [`${c - 1},${r}`, `${c + 1},${r}`, `${c},${r - 1}`, `${c},${r + 1}`]) if (!has.has(k)) n++
  return n
}

/** 方格纸上的图形：外面留 margin 格空白（lines = false 就只画拼成的小正方形，不画方格纸） */
export function gridFig(cells: GeoPt[], o: { px?: number; margin?: number; lines?: boolean; fill?: GeoTone } = {}): GeoFig {
  const m = o.margin ?? 1
  const { w, h } = cellBox(cells)
  const item: GeoItem = { t: 'grid', x: 0, y: 0, w: w + 2 * m, h: h + 2 * m, cells: cells.map((c) => [c[0] + m, c[1] + m] as GeoPt), fill: o.fill ?? 'a' }
  if (o.lines === false) item.lines = false
  return { w: w + 2 * m, h: h + 2 * m, px: o.px ?? 26, items: [item] }
}

/** 格子转 90° 若干次、翻个面，再挪回左上角 */
export function orient(cells: GeoPt[], quarter: number, flip: boolean): GeoPt[] {
  let out = cells.map((c) => (flip ? ([-c[0], c[1]] as GeoPt) : c))
  for (let i = 0; i < quarter % 4; i++) out = out.map((c) => [-c[1], c[0]] as GeoPt)
  return normCells(out)
}

/** 五种四连方（课本 p49：一字、田字、L、Z、T） */
export const TETROS: Record<'I' | 'O' | 'L' | 'S' | 'T', GeoPt[]> = {
  I: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  O: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  L: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ],
  S: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  T: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
}

/** 不是四连方的：4 个里有两个只是角碰角、3 个的、5 个的 */
const NOT_TETROS: Record<'corner' | 'three' | 'five', GeoPt[][]> = {
  corner: [
    [
      [0, 0],
      [1, 0],
      [2, 1],
      [3, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 2],
      [1, 3],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [2, 2],
    ],
  ],
  three: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
  ],
  five: [
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
  ],
}

/** 三角形的三个顶点（三条边 a = BC、b = CA、c = AB，底边 AB 在下面） */
function triangleFromSides(a: number, b: number, c: number): GeoPt[] {
  const x = (b * b + c * c - a * a) / (2 * c)
  const y = Math.sqrt(Math.max(0, b * b - x * x))
  return [
    [0, 0],
    [c, 0],
    [x, -y],
  ]
}

/** 把一组点缩放到最长的一边约 size 像素 */
function scaleTo(pts: GeoPt[], size: number): GeoPt[] {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1
  return pts.map((p) => [(p[0] * size) / span, (p[1] * size) / span] as GeoPt)
}

const edgeLens = (pts: GeoPt[]): number[] =>
  pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length]!
    return Math.hypot(q[0] - p[0], q[1] - p[1])
  })

// ─────────────────────────────────────────────────────────────
// 多边形
// ─────────────────────────────────────────────────────────────

const polyName = (n: number): LStr => ({ k: `m3.rect.p${n}` })
const POLY_ZH: Record<number, string> = { 3: '三角形', 4: '四边形', 5: '五边形', 6: '六边形', 7: '七边形', 8: '八边形' }

/** 名字选项：正确的 + 边数最接近的两个 */
function nameChoices(n: number, rng: RNG): LStr[] {
  const near = [n - 1, n + 1, n - 2, n + 2].filter((x) => x >= 3 && x <= 8)
  const first = near.slice(0, near.filter((x) => Math.abs(x - n) === 1).length)
  const pool = [...rng.shuffle(first), ...rng.shuffle(near.filter((x) => Math.abs(x - n) === 2))]
  return pool.slice(0, 2).map(polyName)
}

/** 一个多边形（规则的或随手画的），描边、浅色填充 */
function polyItems(pts: GeoPt[], fill: GeoTone | null = 'b'): GeoItem[] {
  return [fill ? { t: 'poly', pts, fill, stroke: fill } : { t: 'poly', pts, stroke: 'b' }]
}

function somePolygon(n: number, regular: boolean, rng: RNG, r = 70): GeoPt[] {
  return regular ? regularPts(n, r, rng.int(0, 23) * 15) : irregularPts(n, r, rng)
}

/** 这是几边形（p39–40）：d1 规则的和随手画的都有，d2 起全是随手画的 */
function genPolyName(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([3, 4, 5, 6, 8])
  const regular = d === 1 ? rng.chance(0.55) : false
  const pts = somePolygon(n, regular, rng)
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `name-${n}-${shapeSig(pts)}`,
    stem: [text('m3.rect.polyName'), geoPart([fitFig(polyItems(pts), 12)], `（一个${regular ? '' : '不规则的'}${POLY_ZH[n]}）`)],
    correct: polyName(n),
    distractors: nameChoices(n, rng),
    rng,
  })
}

/** 数边、数角（边的条数和角的个数一样多） */
function genPolyCount(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? rng.pick([3, 4, 5, 6]) : rng.pick([5, 6, 7, 8])
  const pts = somePolygon(n, d === 1 && rng.chance(0.5), rng)
  const corners = rng.chance(0.5)
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `count-${corners ? 'c' : 's'}-${n}-${shapeSig(pts)}`,
    stem: [text(corners ? 'm3.rect.cornersQ' : 'm3.rect.sidesQ'), geoPart([fitFig(polyItems(pts), 12)], `（一个${POLY_ZH[n]}）`)],
    value: n,
    rng,
    min: 0,
    max: 12,
    smart: [n - 1, n + 1, n + 2],
  })
}

/** 多边形的特点：由线段围成，边的条数和角的个数一样多（p39 小朋友的话） */
function genPolyFact(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    return labelQuestion({
      kpId,
      type: 'shape-match',
      difficulty: d,
      sig: 'fact-same',
      stem: [text('m3.rect.polyFact')],
      correct: L('m3.rect.sameMany'),
      distractors: [L('m3.rect.moreSides'), L('m3.rect.moreCorners')],
      rng,
    })
  }
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: 'fact-made',
    stem: [text('m3.rect.polyMadeOf')],
    correct: L('m3.line.segment'),
    distractors: [L('m3.line.ray'), L('m3.line.line')],
    rng,
  })
}

/** 不看图：「六边形有几个角？」「一个图形有 7 条边，它有几个角？」 */
function genPolyText(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([5, 6, 7, 8])
  const byName = rng.chance(0.5)
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `text-${byName ? 'name' : 'sides'}-${n}`,
    stem: [byName ? text('m3.rect.nameCorners', { name: polyName(n) }) : text('m3.rect.sidesCorners', { n })],
    value: n,
    rng,
    min: 0,
    max: 12,
    smart: [n - 1, n + 1, 2 * n],
  })
}

type Curvy = 'circle' | 'half' | 'leaf' | 'door' | 'fan'
/** 不是多边形的图：有一条边是弯的 */
function curvyItems(kind: Curvy): GeoItem[] {
  const arc = (from: number, to: number, r: number, c: GeoPt = [0, 0], steps = 6): GeoPt[] =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const u = dir(from + ((to - from) * i) / steps)
      return [c[0] + u[0] * r, c[1] + u[1] * r] as GeoPt
    })
  switch (kind) {
    case 'circle':
      return [{ t: 'curve', pts: arc(0, 315, 55, [0, 0], 7), closed: true, stroke: 'b' }]
    case 'half':
      return [
        { t: 'curve', pts: arc(180, 0, 60), stroke: 'b' },
        { t: 'line', a: [-60, 0], b: [60, 0], stroke: 'b' },
      ]
    case 'leaf':
      return [
        {
          t: 'curve',
          pts: [
            [0, 0],
            [55, -32],
            [110, 0],
            [55, 32],
          ],
          closed: true,
          stroke: 'b',
        },
      ]
    case 'door':
      return [
        {
          t: 'poly',
          pts: [
            [-45, -30],
            [-45, 60],
            [45, 60],
            [45, -30],
          ],
          open: true,
          stroke: 'b',
        },
        { t: 'curve', pts: arc(180, 0, 45, [0, -30]), stroke: 'b' },
      ]
    case 'fan':
      return [
        { t: 'line', a: [0, 0], b: [95, 0], stroke: 'b' },
        { t: 'line', a: [0, 0], b: [0, -95], stroke: 'b' },
        { t: 'curve', pts: arc(0, 90, 95), stroke: 'b' },
      ]
  }
}
const CURVY_ZH: Record<Curvy, string> = { circle: '圆', half: '半圆', leaf: '树叶形', door: '拱门形', fan: '扇形' }

/** 哪一个不是多边形（有弯的边） */
function genNotPoly(kpId: string, d: Difficulty, rng: RNG): Question {
  const count = d === 3 ? 4 : 3
  const curvy = rng.pick<Curvy>(d === 3 ? ['half', 'door', 'fan', 'leaf'] : ['circle', 'half', 'leaf', 'door'])
  const ns = rng.shuffle([3, 4, 5, 6]).slice(0, count - 1)
  const at = rng.int(0, count - 1)
  const figs: GeoFig[] = []
  const zh: string[] = []
  let k = 0
  for (let i = 0; i < count; i++) {
    if (i === at) {
      const turn = rng.pick([0, 0, 90, 180, 270])
      figs.push(fitFig(curvyItems(curvy).map((it) => mapItem(it, (p) => rotate(p, turn))), 8))
      zh.push(CURVY_ZH[curvy])
    } else {
      const n = ns[k++]!
      figs.push(fitFig(polyItems(somePolygon(n, rng.chance(0.5), rng, 55), null), 8))
      zh.push(POLY_ZH[n]!)
    }
  }
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `notpoly-${curvy}-${at}-${ns.join('')}`,
    stem: [text('m3.rect.notPoly'), geoPart(figs, `（${zh.map((z, i) => `${i + 1}：${z}`).join('；')}）`, true)],
    value: at + 1,
    rng,
    min: 1,
    max: count,
    input: 'choice',
  })
}

/** 哪一个是正多边形（p41 生活中的数学：正五边形、正六边形、正八边形每条边的长度都相等） */
function genRegular(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) {
    return labelQuestion({
      kpId,
      type: 'shape-match',
      difficulty: d,
      sig: 'reg-fact',
      stem: [text('m3.rect.regularFact')],
      correct: L('m3.rect.allEqual'),
      distractors: [L('m3.rect.notAllEqual')],
      rng,
    })
  }
  const n = rng.pick([5, 6, 8])
  const at = rng.int(0, 2)
  const figs: GeoFig[] = []
  // 另外两个一眼看得出边不一样长：一个是把正多边形横着拉长的，一个是随手画的（最长边至少是最短边的 1.8 倍）
  const fakes = rng.shuffle(['stretch', 'random'] as const)
  let f = 0
  for (let i = 0; i < 3; i++) {
    let pts: GeoPt[]
    if (i === at) pts = regularPts(n, 55, rng.int(0, 11) * 15)
    else if (fakes[f++] === 'stretch') pts = regularPts(n, 46, 90 + rng.int(0, 1) * (180 / n)).map((p) => [p[0] * 1.8, p[1]] as GeoPt)
    else {
      do pts = irregularPts(n, 58, rng)
      while (Math.max(...edgeLens(pts)) / Math.min(...edgeLens(pts)) < 1.8)
    }
    figs.push(fitFig(polyItems(pts), 8))
  }
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `reg-${n}-${at}-${figs.map((f) => shapeSig((f.items[0] as { pts: GeoPt[] }).pts)).join('|')}`,
    stem: [text('m3.rect.regularPick', { name: L(`m3.rect.reg${n}`) }), geoPart(figs, `（三个${POLY_ZH[n]}，${at + 1} 号每条边都一样长）`, true)],
    value: at + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

/** 凹进去的多边形：飞镖形四边形、L 形六边形、凹五边形、箭头七边形、T 形 / 凹字形八边形 */
const CONCAVE: { n: number; pts: GeoPt[] }[] = [
  {
    n: 4,
    pts: [
      [0, 0],
      [110, 45],
      [0, 90],
      [35, 45],
    ],
  },
  {
    n: 5,
    pts: [
      [0, 0],
      [100, 0],
      [100, 80],
      [50, 40],
      [0, 80],
    ],
  },
  {
    n: 6,
    pts: [
      [0, 0],
      [40, 0],
      [40, 60],
      [100, 60],
      [100, 100],
      [0, 100],
    ],
  },
  {
    n: 7,
    pts: [
      [0, 25],
      [60, 25],
      [60, 0],
      [110, 45],
      [60, 90],
      [60, 65],
      [0, 65],
    ],
  },
  {
    n: 8,
    pts: [
      [0, 0],
      [120, 0],
      [120, 35],
      [80, 35],
      [80, 100],
      [40, 100],
      [40, 35],
      [0, 35],
    ],
  },
  {
    n: 8,
    pts: [
      [0, 0],
      [35, 0],
      [35, 55],
      [75, 55],
      [75, 0],
      [110, 0],
      [110, 90],
      [0, 90],
    ],
  },
]
function genConcave(kpId: string, d: Difficulty, rng: RNG): Question {
  const i = rng.int(0, CONCAVE.length - 1)
  const c = CONCAVE[i]!
  const turn = rng.pick([0, 90, 180, 270])
  const pts = c.pts.map((p) => rotate(p, turn))
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `concave-${i}-${turn}`,
    stem: [text('m3.rect.polyName'), geoPart([fitFig(polyItems(pts), 12)], `（一个凹进去的${POLY_ZH[c.n]}）`)],
    correct: polyName(c.n),
    distractors: nameChoices(c.n, rng),
    rng,
  })
}

defineGenerator('m3s2-03-polygons', (d, rng) => {
  const kpId = 'm3s2-03-polygons'
  const roll = rng.next()
  if (d === 1) return roll < 0.45 ? genPolyName(kpId, d, rng) : roll < 0.8 ? genPolyCount(kpId, d, rng) : genPolyFact(kpId, d, rng)
  if (d === 2) return roll < 0.3 ? genPolyName(kpId, d, rng) : roll < 0.55 ? genPolyCount(kpId, d, rng) : roll < 0.75 ? genPolyText(kpId, d, rng) : genNotPoly(kpId, d, rng)
  return roll < 0.35 ? genRegular(kpId, d, rng) : roll < 0.7 ? genConcave(kpId, d, rng) : roll < 0.85 ? genNotPoly(kpId, d, rng) : genPolyText(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 长方形和正方形的特点：长方形对边相等、4 个直角；正方形 4 条边都相等、4 个直角
// ─────────────────────────────────────────────────────────────

const UNITS: LenUnit[] = ['cm', 'cm', 'dm', 'm']

/** 长方形两条相邻的边标了数，另一条边标「?」：对边相等（做一做 p41 3） */
function genOppSide(kpId: string, d: Difficulty, rng: RNG): Question {
  const u = rng.pick(UNITS)
  const a = rng.int(6, d === 1 ? 20 : 40)
  const b = rng.int(2, a - 2)
  // 标数的两条边：上 / 下 选一条，左 / 右 选一条；问号在其中一条的对边
  const horiz = rng.pick([0, 2])
  const vert = rng.pick([1, 3])
  const askHoriz = rng.chance(0.5)
  const labels: (string | null)[] = [null, null, null, null]
  labels[horiz] = String(a)
  labels[vert] = String(b)
  labels[askHoriz ? 2 - horiz : 4 - vert] = '?'
  const [W, H] = drawSize(a, b)
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `opp-${a}-${b}-${u}-${labels.map((x) => x ?? '_').join('')}`,
    stem: [text('m3.rect.qSide', { u: lenL(u) }), geoPart([fitFig(rectItems(W, H, labels), 6)], `（长方形：长 ${a}${LEN_ZH[u]}、宽 ${b}${LEN_ZH[u]}，问号在${askHoriz ? '长' : '宽'}的对边上）`)],
    value: askHoriz ? a : b,
    rng,
    min: 1,
    max: 99,
    smart: [askHoriz ? b : a, a + b, 2 * (a + b)],
  })
}

/** 正方形标了一条边，问另一条边 */
function genSquareSide(kpId: string, d: Difficulty, rng: RNG): Question {
  const u = rng.pick(UNITS)
  const a = rng.int(3, d === 1 ? 20 : 50)
  const known = rng.int(0, 3)
  const ask = (known + rng.int(1, 3)) % 4
  const labels: (string | null)[] = [null, null, null, null]
  labels[known] = String(a)
  labels[ask] = '?'
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `sq-${a}-${u}-${known}${ask}`,
    stem: [text('m3.rect.qSideSq', { u: lenL(u) }), geoPart([fitFig(rectItems(110, 110, labels, 'c'), 6)], `（正方形：一条边 ${a}${LEN_ZH[u]}）`)],
    value: a,
    rng,
    min: 1,
    max: 99,
    smart: [4 * a, 2 * a, a + 1],
  })
}

/** 长方形 / 正方形有几个直角、几条边（4） */
function genRectCount(kpId: string, d: Difficulty, rng: RNG): Question {
  const pick = rng.pick([
    { key: 'm3.rect.rectRights', sq: false },
    { key: 'm3.rect.squareRights', sq: true },
    { key: 'm3.rect.rectSides', sq: false },
    { key: 'm3.rect.bothRights', sq: false },
  ])
  const [W, H] = pick.sq ? [110, 110] : drawSize(rng.int(8, 14), rng.int(4, 7))
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `cnt-${pick.key}`,
    stem: [text(pick.key), geoPart([fitFig(rectItems(W, H, [], pick.sq ? 'c' : 'a'), 6)], pick.sq ? '（一个正方形）' : '（一个长方形）')],
    value: 4,
    rng,
    min: 0,
    max: 8,
    smart: [2, 3, 5],
  })
}

/** 长方形相对的边相等、正方形 4 条边都相等（例 1） */
function genRectFeature(kpId: string, d: Difficulty, rng: RNG): Question {
  const sq = rng.chance(0.5)
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `feat-${sq ? 'sq' : 'rect'}`,
    stem: [text(sq ? 'm3.rect.featSq' : 'm3.rect.featRect')],
    correct: L(sq ? 'm3.rect.allEqual' : 'm3.rect.equal'),
    distractors: [L(sq ? 'm3.rect.notAllEqual' : 'm3.rect.notEqual')],
    rng,
  })
}

/** 按特点说图形：4 条边都相等、4 个直角 → 正方形；对边相等、4 个直角 → 长方形（不把正方形放进长方形那题的选项） */
function genWhichShape(kpId: string, d: Difficulty, rng: RNG): Question {
  const sq = rng.chance(0.5)
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `which-${sq ? 'sq' : 'rect'}`,
    stem: [text(sq ? 'm3.rect.whichSq' : 'm3.rect.whichRect')],
    correct: L(sq ? 'm3.rect.square' : 'm3.rect.rect'),
    distractors: sq ? [L('m3.rect.rect'), L('m3.rect.para')] : [L('m3.rect.para'), L('m3.rect.trap')],
    rng,
  })
}

type Quad = 'rect' | 'square' | 'para' | 'rhombus' | 'trap' | 'rtrap'
function quadPts(q: Quad, rng: RNG): GeoPt[] {
  const a = rng.pick([55, 60, 65, 70])
  const h = 80
  const off = h / Math.tan((a * Math.PI) / 180)
  switch (q) {
    case 'rect': {
      const [W, H] = drawSize(rng.int(8, 14), rng.int(4, 7))
      return [
        [0, 0],
        [W, 0],
        [W, H],
        [0, H],
      ]
    }
    case 'square':
      return [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ]
    case 'para':
      return [
        [off, 0],
        [off + 140, 0],
        [140, h],
        [0, h],
      ]
    case 'rhombus': {
      // 四条边都一样长、角不是直角
      const s = 100
      const dx = s * Math.cos((a * Math.PI) / 180)
      const dy = s * Math.sin((a * Math.PI) / 180)
      return [
        [dx, 0],
        [dx + s, 0],
        [s, dy],
        [0, dy],
      ]
    }
    case 'trap':
      return [
        [off, 0],
        [170 - off, 0],
        [170, h],
        [0, h],
      ]
    case 'rtrap':
      return [
        [0, 0],
        [150 - off, 0],
        [150, h],
        [0, h],
      ]
  }
}
const QUAD_ZH: Record<Quad, string> = { rect: '长方形', square: '正方形', para: '平行四边形', rhombus: '四条边一样长、没有直角的四边形', trap: '梯形', rtrap: '有两个直角的梯形' }

/** 这个四边形是长方形吗 / 是正方形吗（看边和角） */
function genIsRect(kpId: string, d: Difficulty, rng: RNG): Question {
  const askSq = rng.chance(0.45)
  const yes = rng.chance(0.45)
  const q: Quad = askSq ? (yes ? 'square' : rng.pick<Quad>(['rhombus', 'rect'])) : yes ? 'rect' : rng.pick<Quad>(['para', 'trap', 'rtrap'])
  const turn = rng.pick([0, 0, 90, 180])
  const pts = quadPts(q, rng).map((p) => rotate(p, turn))
  return labelQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `is-${askSq ? 'sq' : 'rect'}-${q}-${shapeSig(pts)}`,
    stem: [text(askSq ? 'm3.rect.isSq' : 'm3.rect.isRect'), geoPart([fitFig(polyItems(pts, 'a'), 10)], `（一个${QUAD_ZH[q]}）`)],
    correct: L(yes ? 'm3.line.yes' : 'm3.line.no'),
    distractors: [L(yes ? 'm3.line.no' : 'm3.line.yes')],
    rng,
  })
}

/** 用长方形纸折出最大的正方形，边长等于长方形的宽（做一做 p41 4） */
function genFold(kpId: string, d: Difficulty, rng: RNG): Question {
  const u = rng.pick<LenUnit>(['cm', 'cm', 'dm'])
  const b = rng.int(4, 15)
  const a = b + rng.int(3, 10)
  const [W, H] = drawSize(a, b, 210, 120)
  const items: GeoItem[] = [
    ...rectItems(W, H, [null, null, String(a), String(b)]),
    { t: 'line', a: [H, 0], b: [H, H], dash: true, stroke: 'd' },
    { t: 'line', a: [0, 0], b: [H, H], dash: true, stroke: 'soft' },
  ]
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `fold-${a}-${b}-${u}`,
    stem: [text('m3.rect.fold', { u: lenL(u) }), geoPart([fitFig(items, 6)], `（长方形纸：长 ${a}${LEN_ZH[u]}、宽 ${b}${LEN_ZH[u]}，虚线是折痕）`)],
    value: b,
    rng,
    min: 1,
    max: 99,
    smart: [a, a - b, 4 * b],
  })
}

/** 四连方（拼图游戏 p49）：能拼出几种（5），哪一个是四连方（角碰角的、3 个的、5 个的都不是） */
function genTetro(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) {
    return numberQuestion({
      kpId,
      type: 'shape-match',
      difficulty: d,
      sig: 'tetro-count',
      stem: [text('m3.rect.tetroCount')],
      value: 5,
      rng,
      min: 0,
      max: 9,
      smart: [4, 6, 3],
    })
  }
  const good = rng.pick(Object.keys(TETROS) as (keyof typeof TETROS)[])
  const bads = rng.shuffle(['corner', 'three', 'five'] as const).slice(0, 2)
  const at = rng.int(0, 2)
  const shapes: GeoPt[][] = []
  const zh: string[] = []
  let k = 0
  for (let i = 0; i < 3; i++) {
    if (i === at) {
      shapes.push(orient(TETROS[good], rng.int(0, 3), rng.chance(0.5)))
      zh.push('四连方')
      continue
    }
    const bad = bads[k++]!
    shapes.push(orient(rng.pick(NOT_TETROS[bad]), rng.int(0, 3), rng.chance(0.5)))
    zh.push(bad === 'corner' ? '4 个正方形，有两个只是角碰角' : bad === 'three' ? '3 个正方形' : '5 个正方形')
  }
  const figs = shapes.map((s) => gridFig(s, { px: 22, margin: 0, lines: false, fill: 'b' }))
  return numberQuestion({
    kpId,
    type: 'shape-match',
    difficulty: d,
    sig: `tetro-${good}-${bads.join('.')}-${at}`,
    stem: [text('m3.rect.tetroPick'), geoPart(figs, `（${zh.map((z, i) => `${i + 1}：${z}`).join('；')}）`, true)],
    value: at + 1,
    rng,
    min: 1,
    max: 3,
    input: 'choice',
  })
}

defineGenerator('m3s2-03-rect-features', (d, rng) => {
  const kpId = 'm3s2-03-rect-features'
  const roll = rng.next()
  if (d === 1) return roll < 0.35 ? genOppSide(kpId, d, rng) : roll < 0.55 ? genSquareSide(kpId, d, rng) : roll < 0.75 ? genRectCount(kpId, d, rng) : genRectFeature(kpId, d, rng)
  if (d === 2) return roll < 0.3 ? genIsRect(kpId, d, rng) : roll < 0.5 ? genWhichShape(kpId, d, rng) : roll < 0.75 ? genOppSide(kpId, d, rng) : genSquareSide(kpId, d, rng)
  return roll < 0.35 ? genFold(kpId, d, rng) : roll < 0.75 ? genTetro(kpId, d, rng) : genIsRect(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 周长：封闭图形一周的长度；多边形的周长 = 各边长度相加
// ─────────────────────────────────────────────────────────────

/** 三角形三条边标了长度，求周长（做一做 p44 1 改成直接标数） */
function genTriPerim(kpId: string, d: Difficulty, rng: RNG): Question {
  const u = rng.pick(UNITS)
  let a = 0
  let b = 0
  let c = 0
  do {
    c = rng.int(5, 15)
    a = rng.int(3, 15)
    b = rng.int(3, 15)
  } while (a + b <= c + 2 || a + c <= b + 2 || b + c <= a + 2)
  const turn = rng.pick([0, 0, 180, 90, -90])
  const pts = scaleTo(triangleFromSides(a, b, c), 170).map((p) => rotate(p, turn))
  const value = a + b + c
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `tri-${a}-${b}-${c}-${u}`,
    stem: [text('m3.rect.perimOf', { shape: L('m3.rect.p3'), u: lenL(u) }), geoPart([fitFig([{ t: 'poly', pts, fill: 'b', stroke: 'b', labels: [String(c), String(a), String(b)] }], 6)], `（三角形，三条边分别是 ${c}、${a}、${b}${LEN_ZH[u]}）`)],
    value,
    rng,
    min: 1,
    max: 99,
    smart: [a + b, value + 1, value - 1, a * b],
  })
}

/** 随手画的凸多边形，边长按画出来的长短换成整数（最短的边 ≥ min） */
function sidesOf(pts: GeoPt[], avg: number, step = 1, min = 2): number[] {
  const lens = edgeLens(pts)
  const mean = lens.reduce((x, y) => x + y, 0) / lens.length
  return lens.map((l) => Math.max(min, Math.round((l / mean) * (avg / step)) * step))
}

/** 四边形 / 五边形各边标了长度，求周长 */
function genPolyPerim(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? 4 : rng.pick([4, 5])
  const u = rng.pick(UNITS)
  const pts = irregularPts(n, 80, rng)
  const sides = sidesOf(pts, rng.int(6, 14))
  const value = sides.reduce((x, y) => x + y, 0)
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `poly-${sides.join('.')}-${u}`,
    stem: [text('m3.rect.perimOf', { shape: L(`m3.rect.p${n}`), u: lenL(u) }), geoPart([fitFig([{ t: 'poly', pts, fill: 'b', stroke: 'b', labels: sides.map(String) }], 6)], `（${POLY_ZH[n]}，各边分别是 ${sides.join('、')}${LEN_ZH[u]}）`)],
    value,
    rng,
    min: 1,
    max: 199,
    smart: [value - sides[0]!, value + 1, value - 1, value + 10],
  })
}

/** 公园示意图（练习九 2）：五边形各边几十、一百多米，绕一圈多少米 */
function genPark(kpId: string, d: Difficulty, rng: RNG): Question {
  const pts = irregularPts(5, 90, rng)
  const sides = sidesOf(pts, rng.int(8, 12) * 10, 10, 20)
  const value = sides.reduce((x, y) => x + y, 0)
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `park-${sides.join('.')}`,
    stem: [text('m3.rect.park'), geoPart([fitFig([{ t: 'poly', pts, fill: 'c', stroke: 'c', labels: sides.map(String) }], 6)], `（公园示意图：五条边分别是 ${sides.join('、')} 米）`)],
    value,
    rng,
    min: 1,
    max: 2000,
    smart: [value - sides[1]!, value + 10, value - 10, value + 100],
  })
}

/** 正多边形：边长 × 边数（p41 生活中的数学的延伸） */
function genRegPerim(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([4, 5, 6, 8])
  const u = rng.pick(UNITS)
  const a = rng.int(2, 12)
  const pts = n === 4 ? regularPts(4, 70, 45) : regularPts(n, 70, 90 + (n % 2 ? 0 : 180 / n))
  // 边长标在最下面那条边上
  const mids = pts.map((p, i) => (p[1] + pts[(i + 1) % n]![1]) / 2)
  const bottom = mids.indexOf(Math.max(...mids))
  const labels = pts.map((_, i) => (i === bottom ? String(a) : null))
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `reg-${n}-${a}-${u}`,
    stem: [text('m3.rect.regPerim', { name: L(n === 4 ? 'm3.rect.square' : `m3.rect.reg${n}`), a, u: lenL(u) }), geoPart([fitFig([{ t: 'poly', pts, fill: 'b', stroke: 'b', labels }], 6)], `（${n === 4 ? '正方形' : `正${POLY_ZH[n]}`}，一条边标着 ${a}${LEN_ZH[u]}）`)],
    value: n * a,
    rng,
    min: 1,
    max: 199,
    smart: [(n - 1) * a, (n + 1) * a, n + a],
  })
}

/** 方格纸上的图形：每个小方格边长 1 厘米，数一数周长 */
function genGridPerim(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d === 3 ? rng.int(6, 9) : rng.int(3, 7)
  const cells = polyomino(n, rng, 5, 4)
  const value = cellPerimeter(cells)
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `grid-${cells.map((c) => c.join('.')).join('_')}`,
    stem: [text('m3.rect.gridPerim'), geoPart([gridFig(cells, { px: 26 })], `（方格纸上 ${n} 个小方格拼成的图形）`)],
    value,
    rng,
    min: 1,
    max: 40,
    smart: [n, value + 2, value - 2, 4 * n],
  })
}

/** 周长的定义、怎样求（p43） */
function genPerimDef(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    return labelQuestion({
      kpId,
      type: 'length',
      difficulty: d,
      sig: 'def',
      stem: [text('m3.rect.perimDef')],
      correct: L('m3.rect.perimeter'),
      distractors: [L('m3.rect.sideLen'), L('m3.rect.width')],
      rng,
    })
  }
  return labelQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: 'how',
    stem: [text('m3.rect.perimHow')],
    correct: L('m3.rect.add'),
    distractors: [L('m3.rect.sub'), L('m3.rect.mul')],
    rng,
  })
}

const ONE: LStr = '1'
const TWO: LStr = '2'
const SAME_LEN: LStr = { k: 'm3.rect.sameLen' }

/** 比周长（练习九 6、15）：切掉一个台阶角的长方形一样长；边上挖进一个口的正方形更长；被曲线分开的两块一样长 */
function genCmpPerim(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['step', 'notch', 'split'] as const)
  if (kind === 'split') {
    const W = 200
    const H = 130
    const y1 = rng.int(3, 5) * 10
    const curve: GeoPt[] = [
      [0, 0],
      [45, y1 - 12],
      [100, y1 + 8],
      [160, y1 + 40],
      [W, H],
    ]
    const items: GeoItem[] = [
      ...rectItems(W, H, [], 'b'),
      { t: 'curve', pts: curve, stroke: 'b' },
      { t: 'text', at: [55, 95], text: '1', badge: true },
      { t: 'text', at: [150, 30], text: '2', badge: true },
    ]
    return labelQuestion({
      kpId,
      type: 'length',
      difficulty: d,
      sig: `cmp-split-${y1}`,
      stem: [text('m3.rect.splitPerim'), geoPart([fitFig(items, 6)], '（长方形纸片被一条从左上角到右下角的曲线分成 1、2 两部分）')],
      correct: SAME_LEN,
      distractors: [ONE, TWO],
      rng,
    })
  }
  let plain: GeoPt[]
  let other: GeoPt[]
  let same: boolean
  if (kind === 'step') {
    const w = rng.int(4, 6)
    const h = rng.int(3, 4)
    const cw = rng.int(1, w - 2)
    const ch = rng.int(1, h - 1)
    plain = []
    other = []
    const corner = rng.int(0, 3)
    for (let x = 0; x < w; x++)
      for (let y = 0; y < h; y++) {
        plain.push([x, y])
        const cx = corner % 2 ? w - 1 - x : x
        const cy = corner > 1 ? h - 1 - y : y
        if (!(cx < cw && cy < ch)) other.push([x, y])
      }
    same = true
  } else {
    const s = rng.int(4, 5)
    const nw = rng.int(1, 2)
    const nd = rng.int(1, 2)
    const nx = rng.int(1, s - 1 - nw)
    plain = []
    other = []
    for (let x = 0; x < s; x++)
      for (let y = 0; y < s; y++) {
        plain.push([x, y])
        if (!(x >= nx && x < nx + nw && y < nd)) other.push([x, y])
      }
    same = false
  }
  const plainFirst = rng.chance(0.5)
  const shapes = plainFirst ? [plain, other] : [other, plain]
  const figs = shapes.map((s) => gridFig(s, { px: 22, margin: 1, fill: 'b' }))
  const correct: LStr = same ? SAME_LEN : plainFirst ? TWO : ONE
  return labelQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `cmp-${kind}-${shapes.map((s) => s.length).join('.')}-${cellPerimeter(other)}-${plainFirst ? 'p' : 'o'}`,
    stem: [text('m3.rect.cmpPerim'), geoPart(figs, `（方格纸上两个图形：${kind === 'step' ? '一个长方形和一个角上切掉一块的长方形' : '一个正方形和一个边上挖进一个口的正方形'}）`, true)],
    correct,
    distractors: [ONE, TWO, SAME_LEN].filter((x) => labelKey(x) !== labelKey(correct)),
    rng,
  })
}

defineGenerator('m3s2-03-perimeter', (d, rng) => {
  const kpId = 'm3s2-03-perimeter'
  const roll = rng.next()
  if (d === 1) return roll < 0.4 ? genTriPerim(kpId, d, rng) : roll < 0.7 ? genPolyPerim(kpId, d, rng) : genPerimDef(kpId, d, rng)
  if (d === 2) return roll < 0.25 ? genPark(kpId, d, rng) : roll < 0.55 ? genRegPerim(kpId, d, rng) : roll < 0.85 ? genGridPerim(kpId, d, rng) : genPolyPerim(kpId, d, rng)
  return roll < 0.55 ? genCmpPerim(kpId, d, rng) : roll < 0.8 ? genGridPerim(kpId, d, rng) : genPark(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 长方形和正方形的周长：长方形的周长 = (长 + 宽) × 2，正方形的周长 = 边长 × 4
// ─────────────────────────────────────────────────────────────

/** 看图求长方形 / 正方形的周长（例 2） */
function genRectPerimFig(kpId: string, d: Difficulty, rng: RNG): Question {
  const sq = rng.chance(0.4)
  const u = rng.pick(UNITS)
  if (sq) {
    const a = rng.int(2, d === 1 ? 20 : 45)
    const side = rng.pick([1, 2])
    const labels: (string | null)[] = [null, null, null, null]
    labels[side] = String(a)
    return numberQuestion({
      kpId,
      type: 'length',
      difficulty: d,
      sig: `sqfig-${a}-${u}`,
      stem: [text('m3.rect.sqPerimQ', { u: lenL(u) }), geoPart([fitFig(rectItems(110, 110, labels, 'c'), 6)], `（正方形，边长 ${a}${LEN_ZH[u]}）`)],
      value: 4 * a,
      rng,
      min: 1,
      max: 200,
      smart: [a * a, 2 * a, 4 * a + 4],
    })
  }
  const a = rng.int(4, d === 1 ? 30 : 60)
  const b = rng.int(2, a - 1)
  const top = rng.chance(0.5)
  const labels: (string | null)[] = top ? [String(a), null, null, String(b)] : [null, String(b), String(a), null]
  const [W, H] = drawSize(a, b)
  const value = 2 * (a + b)
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `rectfig-${a}-${b}-${u}`,
    stem: [text('m3.rect.rectPerimQ', { u: lenL(u) }), geoPart([fitFig(rectItems(W, H, labels), 6)], `（长方形：长 ${a}${LEN_ZH[u]}、宽 ${b}${LEN_ZH[u]}）`)],
    value,
    rng,
    min: 1,
    max: 400,
    smart: [a + b, a * b, value + 2],
  })
}

/** 周长公式（p44「长方形的周长 = ____」） */
function genPerimFormula(kpId: string, d: Difficulty, rng: RNG): Question {
  const sq = rng.chance(0.5)
  return labelQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `formula-${sq ? 'sq' : 'rect'}`,
    stem: [text(sq ? 'm3.rect.howSqP' : 'm3.rect.howRectP')],
    correct: L(sq ? 'm3.rect.fSq4' : 'm3.rect.fRectP'),
    distractors: sq ? [L('m3.rect.fSqSq'), L('m3.rect.fSqPlus')] : [L('m3.rect.fRectA'), L('m3.rect.fRectS')],
    rng,
  })
}

interface Word {
  key: string
  p: Record<string, number>
  value: number
  smart: number[]
}

/** 文字题：d1 花坛、手帕；d2 篮球场、作业本、正方形桌面、课桌、黑板、「长度是宽度的几倍」、菜地围篱笆 */
function perimWord(d: Difficulty, rng: RNG): Word {
  const easy: (() => Word)[] = [
    () => {
      const a = rng.int(3, 12)
      const b = rng.int(2, a - 1)
      return { key: 'm3.rect.wBed', p: { a, b }, value: 2 * (a + b), smart: [a + b, a * b, 2 * a + b] }
    },
    () => {
      const a = rng.int(2, 9)
      return { key: 'm3.rect.wHanky', p: { a }, value: 4 * a, smart: [a * a, 2 * a, a + 4] }
    },
  ]
  if (d === 1) return rng.pick(easy)()
  const pool: (() => Word)[] = [
    () => {
      const a = rng.int(20, 30)
      const b = rng.int(12, 18)
      return { key: 'm3.rect.wCourt', p: { a, b }, value: 2 * (a + b), smart: [a + b, 2 * a + b, 2 * (a + b) + 10] }
    },
    () => {
      const a = rng.int(18, 26)
      const b = rng.int(12, a - 3)
      return { key: 'm3.rect.wBook', p: { a, b }, value: 2 * (a + b), smart: [a + b, 2 * a + b, 2 * (a + b) - 10] }
    },
    () => {
      const s = rng.int(15, 90)
      return { key: 'm3.rect.wTable', p: { p: 4 * s }, value: s, smart: [2 * s, 4 * s - 4, s + 4] }
    },
    () => {
      const a = rng.int(5, 12)
      const b = rng.int(2, a - 1)
      return { key: 'm3.rect.wDesk', p: { a, p: 2 * (a + b) }, value: b, smart: [2 * (a + b) - a, a + b, 2 * (a + b) - 2 * a] }
    },
    () => {
      const b = rng.int(1, 3)
      const a = b + rng.int(2, 6)
      return { key: 'm3.rect.wBoard', p: { b, p: 2 * (a + b) }, value: a, smart: [2 * (a + b) - b, a + b, 2 * a] }
    },
    () => {
      const b = rng.int(2, 9)
      const k = rng.int(2, 4)
      return { key: 'm3.rect.wTimes', p: { b, k }, value: 2 * (b + k * b), smart: [b + k * b, 2 * (b + k), k * b * b] }
    },
    () => {
      const a = rng.int(5, 15)
      const b = rng.int(2, a - 1)
      return { key: 'm3.rect.wFence', p: { a, b }, value: 2 * (a + b), smart: [a + b, a * b, a + 2 * b] }
    },
  ]
  return rng.pick(pool)()
}

function genPerimWord(kpId: string, d: Difficulty, rng: RNG): Question {
  const w = perimWord(d, rng)
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `${w.key}-${Object.values(w.p).join('-')}`,
    stem: [text(w.key, w.p)],
    value: w.value,
    rng,
    min: 1,
    max: 999,
    smart: w.smart.filter((x) => Number.isInteger(x) && x > 0 && x !== w.value),
  })
}

/** 一面靠墙：长的那面靠墙，篱笆 = 长 + 宽 × 2（练习九 7） */
function genWall(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(5, 15)
  const b = rng.int(2, a - 1)
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `wall-${a}-${b}`,
    stem: [text('m3.rect.wWall', { a, b })],
    value: a + 2 * b,
    rng,
    min: 1,
    max: 99,
    smart: [2 * a + b, 2 * (a + b), a + b],
  })
}

/** 小正方形拼成的长方形（练习九 11、12）：r × c 个边长 s 的小正方形，周长 = (r + c) × s × 2 */
function genTilesPerim(kpId: string, d: Difficulty, rng: RNG): Question {
  const r = rng.int(1, 3)
  const c = rng.int(r + 1, 6)
  const s = rng.pick([1, 2, 2, 3])
  const cells: GeoPt[] = []
  for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) cells.push([x, y])
  const value = 2 * (r + c) * s
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `tiles-${r}x${c}-${s}`,
    stem: [text('m3.rect.tilesPerim', { n: r * c, s }), geoPart([gridFig(cells, { px: 26, margin: 0, lines: false, fill: 'b' })], `（${r * c} 个小正方形拼成 ${r} 排、每排 ${c} 个的长方形）`)],
    value,
    rng,
    min: 1,
    max: 99,
    smart: [4 * r * c * s, 2 * (r + c), r * c * s],
  })
}

/** 怎样拼周长最短（例 3）：同样多的小正方形，拼得越接近正方形周长越短 */
function genTilesBest(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([8, 12, 16, 18])
  const ways: [number, number][] = []
  for (let r = 1; r * r <= n; r++) if (n % r === 0) ways.push([r, n / r])
  const three = rng.shuffle(ways).slice(0, 3)
  const best = three.reduce((x, y) => (x[0] + x[1] <= y[0] + y[1] ? x : y))
  const figs = three.map(([r, c]) => {
    const cells: GeoPt[] = []
    for (let y = 0; y < r; y++) for (let x = 0; x < c; x++) cells.push([x, y])
    return gridFig(cells, { px: 16, margin: 0, lines: false, fill: 'b' })
  })
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `best-${n}-${three.map((w) => w.join('x')).join('.')}`,
    stem: [text('m3.rect.tilesBest', { n }), geoPart(figs, `（${three.map(([r, c], i) => `${i + 1}：${r} 排、每排 ${c} 个`).join('；')}）`, true)],
    value: three.indexOf(best) + 1,
    rng,
    min: 1,
    max: three.length,
    input: 'choice',
  })
}

/** 组合图形的周长（练习九 16）：上边挖进一个口的长方形 = 长方形周长 + 2 × 口深；台阶形 = 外面那个长方形的周长 */
function genCompositePerim(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const W = rng.int(30, 70)
    const H = rng.int(20, 45)
    const nd = rng.int(5, Math.floor(H / 2))
    const nw = rng.int(Math.ceil(W / 5), Math.floor(W / 3))
    const nx = rng.int(8, W - nw - 8)
    const k = Math.min(200 / W, 130 / H)
    const s = (v: number): number => r1(v * k)
    const pts: GeoPt[] = [
      [0, 0],
      [s(nx), 0],
      [s(nx), s(nd)],
      [s(nx + nw), s(nd)],
      [s(nx + nw), 0],
      [s(W), 0],
      [s(W), s(H)],
      [0, s(H)],
    ]
    const labels = [null, null, null, String(nd), null, null, String(W), String(H)]
    const value = 2 * (W + H) + 2 * nd
    return numberQuestion({
      kpId,
      type: 'length',
      difficulty: d,
      sig: `notch-${W}-${H}-${nd}-${nw}-${nx}`,
      stem: [text('m3.rect.figPerim'), geoPart([fitFig([{ t: 'poly', pts, fill: 'b', stroke: 'b', labels }], 6)], `（长 ${W}、宽 ${H} 的长方形，上边挖进一个深 ${nd} 的口；单位：厘米）`)],
      value,
      rng,
      min: 1,
      max: 999,
      smart: [2 * (W + H), value - nd, value + 2 * nw],
    })
  }
  const W = rng.int(25, 60)
  const h1 = rng.int(12, 30)
  const h2 = rng.int(6, 16)
  const tw = rng.int(8, W - 12)
  const tx = rng.int(4, W - tw - 4)
  const H = h1 + h2
  const k = Math.min(200 / W, 130 / H)
  const s = (v: number): number => r1(v * k)
  const pts: GeoPt[] = [
    [0, s(h2)],
    [s(tx), s(h2)],
    [s(tx), 0],
    [s(tx + tw), 0],
    [s(tx + tw), s(h2)],
    [s(W), s(h2)],
    [s(W), s(H)],
    [0, s(H)],
  ]
  const labels = [null, null, null, String(h2), null, String(h1), String(W), null]
  const value = 2 * (W + H)
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `step-${W}-${h1}-${h2}-${tw}-${tx}`,
    stem: [text('m3.rect.figPerim'), geoPart([fitFig([{ t: 'poly', pts, fill: 'b', stroke: 'b', labels }], 6)], `（下面是长 ${W}、高 ${h1} 的长方形，上面凸出一块高 ${h2}；单位：厘米）`)],
    value,
    rng,
    min: 1,
    max: 999,
    smart: [2 * (W + h1), W + H, value + 2 * h2],
  })
}

/** 长方形纸片正好剪成两个相同的正方形（练习十 1） */
function genTwoSquares(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(5, 25) * 2
  const whole = rng.chance(0.5)
  const items: GeoItem[] = [...rectItems(200, 100, [null, null, String(a), null]), { t: 'line', a: [100, 0], b: [100, 100], dash: true, stroke: 'd' }]
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `two-${a}-${whole ? 'w' : 'h'}`,
    stem: [text(whole ? 'm3.rect.twoSqAll' : 'm3.rect.twoSqOne', { a }), geoPart([fitFig(items, 6)], `（长 ${a} 厘米的长方形纸片，沿虚线剪成两个正方形）`)],
    value: whole ? 3 * a : 2 * a,
    rng,
    min: 1,
    max: 999,
    smart: whole ? [4 * a, 2 * a, 6 * a] : [4 * a, a, 3 * a],
  })
}

/** 4 个相同的长方形拼成大正方形（练习十 4）：每个长方形的周长 = 大正方形周长的一半 */
function genPinwheel(kpId: string, d: Difficulty, rng: RNG): Question {
  const p = rng.pick([16, 20, 24, 28, 32, 36, 40])
  const [l, w] = [3, 1]
  const rect = (x: number, y: number, rw: number, rh: number): GeoItem => ({
    t: 'poly',
    pts: [
      [x, y],
      [x + rw, y],
      [x + rw, y + rh],
      [x, y + rh],
    ],
    fill: 'b',
    stroke: 'b',
  })
  const u = 34
  const items: GeoItem[] = [rect(0, 0, l * u, w * u), rect(l * u, 0, w * u, l * u), rect(w * u, l * u, l * u, w * u), rect(0, w * u, w * u, l * u)]
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `pinwheel-${p}`,
    stem: [text('m3.rect.pinwheel', { p }), geoPart([fitFig(items, 6)], '（4 个相同的长方形围成一个大正方形，中间空着一个小正方形）')],
    value: p / 2,
    rng,
    min: 1,
    max: 99,
    smart: [p / 4, p, p / 2 + 2],
  })
}

/** 一个长方形和一个正方形拼成的图形（练习十 3）：周长 = 两个周长的和 − 重合的两条边 */
function genCombo(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.int(2, 5)
  const w = rng.int(2, 6)
  const h = rng.int(s + 1, s + 6)
  const p1 = 2 * (w + h)
  const p2 = 4 * s
  const k = Math.min(140 / (w + s), 150 / h)
  const items: GeoItem[] = [
    {
      t: 'poly',
      pts: [
        [0, 0],
        [w * k, 0],
        [w * k, h * k],
        [0, h * k],
      ],
      fill: 'b',
      stroke: 'b',
    },
    {
      t: 'poly',
      pts: [
        [w * k, (h - s) * k],
        [(w + s) * k, (h - s) * k],
        [(w + s) * k, h * k],
        [w * k, h * k],
      ],
      fill: 'c',
      stroke: 'c',
    },
  ]
  return numberQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `combo-${w}-${h}-${s}`,
    stem: [text('m3.rect.combo', { p1, p2 }), geoPart([fitFig(items, 6)], `（长方形右下方拼着一个正方形，拼的地方重合了正方形的一条边）`)],
    value: p1 + p2 - 2 * s,
    rng,
    min: 1,
    max: 99,
    smart: [p1 + p2, p1 + p2 - s, p1 + s],
  })
}

defineGenerator('m3s2-03-rect-perimeter', (d, rng) => {
  const kpId = 'm3s2-03-rect-perimeter'
  const roll = rng.next()
  if (d === 1) return roll < 0.55 ? genRectPerimFig(kpId, d, rng) : roll < 0.72 ? genPerimFormula(kpId, d, rng) : genPerimWord(kpId, d, rng)
  if (d === 2) return roll < 0.7 ? genPerimWord(kpId, d, rng) : genRectPerimFig(kpId, d, rng)
  if (roll < 0.14) return genWall(kpId, d, rng)
  if (roll < 0.3) return genTilesPerim(kpId, d, rng)
  if (roll < 0.46) return genTilesBest(kpId, d, rng)
  if (roll < 0.66) return genCompositePerim(kpId, d, rng)
  if (roll < 0.8) return genTwoSquares(kpId, d, rng)
  return roll < 0.9 ? genPinwheel(kpId, d, rng) : genCombo(kpId, d, rng)
})
