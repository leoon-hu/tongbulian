// 平均分的图（FracShape，三年级「分数的初步认识」、小数的十等分图）的几何：把一个图形切成几块，每块一条 SVG 路径 + 面积。
// 面积用来在测试里核对「平均分」的图每块真的一样大、反例真的不一样大（不进界面）。
import type { FracPic } from '@/types/models'

export interface FracPiece {
  d: string
  area: number
}
export interface FracGeometry {
  /** 这一幅（不含前面整个涂满的 whole）占的宽、高（viewBox 单位） */
  w: number
  h: number
  pieces: FracPiece[]
  /** 外轮廓 */
  outline: string
  /** 块与块之间的分割线（虚线；黑板报是实线） */
  cuts: string[]
}

type Pt = [number, number]

const f = (n: number): string => (Math.round(n * 100) / 100).toString()
const poly = (pts: Pt[]): string => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`
const seg = (a: Pt, b: Pt): string => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`
/** 多边形面积（鞋带公式） */
function polyArea(pts: Pt[]): number {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!
    const [x2, y2] = pts[(i + 1) % pts.length]!
    s += x1 * y2 - x2 * y1
  }
  return Math.abs(s) / 2
}
const piece = (pts: Pt[]): FracPiece => ({ d: poly(pts), area: polyArea(pts) })

/** 不是平均分的几份（反例）：各块的比例，明显不一样大 */
const UNEVEN: Record<number, number[]> = {
  2: [0.64, 0.36],
  3: [0.48, 0.22, 0.3],
  4: [0.36, 0.14, 0.3, 0.2],
  5: [0.3, 0.13, 0.2, 0.24, 0.13],
}
const unevenWeights = (n: number): number[] => UNEVEN[n] ?? UNEVEN[3]!

/** 圆：从 12 点方向（再转 rot 度）顺时针切成扇形，weights 是每块占的比例 */
function circle(weights: number[], rot: number): FracGeometry {
  const c = 50
  const r = 46
  const at = (deg: number): Pt => [c + r * Math.cos((deg * Math.PI) / 180), c + r * Math.sin((deg * Math.PI) / 180)]
  const pieces: FracPiece[] = []
  const cuts: string[] = []
  let a = -90 + rot
  for (const w of weights) {
    const b = a + w * 360
    const p1 = at(a)
    const p2 = at(b)
    const large = w > 0.5 ? 1 : 0
    pieces.push({ d: `M${c} ${c}L${f(p1[0])} ${f(p1[1])}A${r} ${r} 0 ${large} 1 ${f(p2[0])} ${f(p2[1])}Z`, area: Math.PI * r * r * w })
    if (weights.length > 1) cuts.push(seg([c, c], p1))
    a = b
  }
  return { w: 100, h: 100, pieces, outline: `M${c - r} ${c}A${r} ${r} 0 1 1 ${c + r} ${c}A${r} ${r} 0 1 1 ${c - r} ${c}Z`, cuts }
}

/** 长方形（或正方形）x0…x0+W × y0…y0+H：竖着切成几条（xs 是各条的右边界比例），或 rows × cols 的格子 */
function grid(W: number, H: number, rows: number, colStops: number[], rowStops?: number[]): FracGeometry {
  const x0 = 4
  const y0 = 4
  const xs = [0, ...colStops].map((t) => x0 + t * W)
  const ys = (rowStops ? [0, ...rowStops] : Array.from({ length: rows + 1 }, (_, i) => i / rows)).map((t) => y0 + t * H)
  const pieces: FracPiece[] = []
  for (let r = 0; r < ys.length - 1; r++) {
    for (let c = 0; c < xs.length - 1; c++) {
      pieces.push(piece([[xs[c]!, ys[r]!], [xs[c + 1]!, ys[r]!], [xs[c + 1]!, ys[r + 1]!], [xs[c]!, ys[r + 1]!]]))
    }
  }
  const cuts: string[] = []
  for (const x of xs.slice(1, -1)) cuts.push(seg([x, y0], [x, y0 + H]))
  for (const y of ys.slice(1, -1)) cuts.push(seg([x0, y], [x0 + W, y]))
  return { w: W + 8, h: H + 8, pieces, outline: poly([[x0, y0], [x0 + W, y0], [x0 + W, y0 + H], [x0, y0 + H]]), cuts }
}
const evenStops = (n: number): number[] => Array.from({ length: n }, (_, i) => (i + 1) / n)
const weightStops = (ws: number[]): number[] => ws.map((_, i) => ws.slice(0, i + 1).reduce((s, w) => s + w, 0))

/** 从中心 c 出发连到外轮廓上的这些点，切成三角形（正多边形、正方形的对角线 / 米字） */
function fan(c: Pt, ring: Pt[], w: number, h: number, outline: Pt[]): FracGeometry {
  const pieces = ring.map((p, i) => piece([c, p, ring[(i + 1) % ring.length]!]))
  return { w, h, pieces, outline: poly(outline), cuts: ring.map((p) => seg(c, p)) }
}

/** 一幅图的几何（不含 whole） */
export function fracGeometry(pic: Pick<FracPic, 'shape' | 'parts' | 'rows' | 'rot'>): FracGeometry {
  const n = Math.max(1, pic.parts)
  switch (pic.shape) {
    case 'circle':
      return circle(Array.from({ length: n }, () => 1 / n), pic.rot ?? 0)
    case 'circle-uneven':
      return circle(unevenWeights(n), pic.rot ?? 0)
    case 'rect': {
      const rows = pic.rows && pic.rows > 1 && n % pic.rows === 0 ? pic.rows : 1
      return grid(144, 88, rows, evenStops(n / rows))
    }
    case 'rect-h':
      return grid(120, 96, n, [1])
    case 'rect-uneven':
      return grid(144, 88, 1, weightStops(unevenWeights(n)))
    case 'square': {
      const rows = pic.rows && pic.rows > 1 && n % pic.rows === 0 ? pic.rows : 1
      return grid(96, 96, rows, evenStops(n / rows))
    }
    case 'square-diag': {
      const s = 96
      const [a, b, c, d]: Pt[] = [[4, 4], [4 + s, 4], [4 + s, 4 + s], [4, 4 + s]]
      if (n === 2) {
        return { w: s + 8, h: s + 8, pieces: [piece([a, b, c]), piece([a, c, d])], outline: poly([a, b, c, d]), cuts: [seg(a, c)] }
      }
      const m: Pt = [4 + s / 2, 4 + s / 2]
      if (n === 8) {
        const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
        return fan(m, [a, mid(a, b), b, mid(b, c), c, mid(c, d), d, mid(d, a)], s + 8, s + 8, [a, b, c, d])
      }
      return fan(m, [a, b, c, d], s + 8, s + 8, [a, b, c, d])
    }
    case 'triangle': {
      // 等腰三角形沿高对折：左右两块一样大
      const apex: Pt = [60, 4]
      const bl: Pt = [4, 100]
      const br: Pt = [116, 100]
      const foot: Pt = [60, 100]
      return { w: 120, h: 104, pieces: [piece([apex, bl, foot]), piece([apex, foot, br])], outline: poly([apex, br, bl]), cuts: [seg(apex, foot)] }
    }
    case 'triangle-cut': {
      // 反例：横着切成 n 层（每层一样高），上面的小、下面的大
      const apex: Pt = [60, 4]
      const H = 96
      const at = (t: number): [Pt, Pt] => [[60 - 56 * t, 4 + H * t], [60 + 56 * t, 4 + H * t]]
      const pieces: FracPiece[] = []
      const cuts: string[] = []
      for (let i = 0; i < n; i++) {
        const [l1, r1] = at(i / n)
        const [l2, r2] = at((i + 1) / n)
        pieces.push(piece(i === 0 ? [apex, r2, l2] : [l1, r1, r2, l2]))
        if (i > 0) cuts.push(seg(l1, r1))
      }
      return { w: 120, h: 104, pieces, outline: poly([apex, [116, 100], [4, 100]]), cuts }
    }
    case 'polygon': {
      // 正多边形（5、6、8 边）从中心切成 n 个一样的三角形；一个顶点朝上（六边形、八边形转半格，底边是平的）
      const c: Pt = [54, 54]
      const R = 50
      const start = -90 + (n % 2 === 0 ? 180 / n : 0)
      const ring: Pt[] = Array.from({ length: n }, (_, i) => {
        const t = ((start + (360 / n) * i) * Math.PI) / 180
        return [c[0] + R * Math.cos(t), c[1] + R * Math.sin(t)]
      })
      const ys = ring.map((p) => p[1])
      const top = Math.min(...ys)
      const bottom = Math.max(...ys)
      // 五边形下面空一截：整体往上挪，高度按实际的
      const dy = 4 - top
      const moved: Pt[] = ring.map(([x, y]) => [x, y + dy])
      return fan([c[0], c[1] + dy], moved, 108, bottom - top + 8, moved)
    }
    case 'parallelogram': {
      // 沿对角线分成两个一样大的三角形（看着不像，其实是平均分）
      const tl: Pt = [34, 4]
      const tr: Pt = [150, 4]
      const br: Pt = [120, 88]
      const bl: Pt = [4, 88]
      return { w: 154, h: 92, pieces: [piece([tl, br, bl]), piece([tl, tr, br])], outline: poly([tl, tr, br, bl]), cuts: [seg(tl, br)] }
    }
    case 'cross': {
      // 五个一样的正方形拼成十字
      const s = 32
      const cells: Pt[] = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]
      const sq = ([cx, cy]: Pt): Pt[] => [[4 + cx * s, 4 + cy * s], [4 + (cx + 1) * s, 4 + cy * s], [4 + (cx + 1) * s, 4 + (cy + 1) * s], [4 + cx * s, 4 + (cy + 1) * s]]
      const o = 4
      const outline: Pt[] = [
        [o + s, o], [o + 2 * s, o], [o + 2 * s, o + s], [o + 3 * s, o + s], [o + 3 * s, o + 2 * s], [o + 2 * s, o + 2 * s],
        [o + 2 * s, o + 3 * s], [o + s, o + 3 * s], [o + s, o + 2 * s], [o, o + 2 * s], [o, o + s], [o + s, o + s],
      ]
      return {
        w: 3 * s + 8,
        h: 3 * s + 8,
        pieces: cells.map((c) => piece(sq(c))),
        outline: poly(outline),
        cuts: [seg([o + s, o + s], [o + 2 * s, o + s]), seg([o + s, o + 2 * s], [o + 2 * s, o + 2 * s]), seg([o + s, o + s], [o + s, o + 2 * s]), seg([o + 2 * s, o + s], [o + 2 * s, o + 2 * s])],
      }
    }
    case 'board': {
      // 黑板报（练习十五 3）：左边一半、右上四分之一、右下两个八分之一
      const W = 144
      const H = 88
      const x = (t: number): number => 4 + W * t
      const y = (t: number): number => 4 + H * t
      const rect = (x1: number, y1: number, x2: number, y2: number): Pt[] => [[x(x1), y(y1)], [x(x2), y(y1)], [x(x2), y(y2)], [x(x1), y(y2)]]
      return {
        w: W + 8,
        h: H + 8,
        pieces: [piece(rect(0, 0, 0.5, 1)), piece(rect(0.5, 0, 1, 0.5)), piece(rect(0.5, 0.5, 0.75, 1)), piece(rect(0.75, 0.5, 1, 1))],
        outline: poly(rect(0, 0, 1, 1)),
        cuts: [seg([x(0.5), y(0)], [x(0.5), y(1)]), seg([x(0.5), y(0.5)], [x(1), y(0.5)]), seg([x(0.75), y(0.5)], [x(0.75), y(1)])],
      }
    }
  }
}

/** 这种图是不是「平均分」的（反例与黑板报不是） */
export function isEvenShape(shape: FracPic['shape']): boolean {
  return !['circle-uneven', 'rect-uneven', 'triangle-cut', 'board'].includes(shape)
}
