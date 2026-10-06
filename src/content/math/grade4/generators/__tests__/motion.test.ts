import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'

// 图形的运动（二）（四下七）的专项检查：答案都从图上的方格坐标（对称轴、点、图形、平移后的虚线图）重新推一遍。

const SEEDS = 150
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
const kind = (q: Question): string => sigOf(q).split('-')[0]!
type Geo = Extract<StemPart, { kind: 'geo' }>
const geoOf = (q: Question): Geo => q.stem.find((p): p is Geo => p.kind === 'geo')!
const textOf = (q: Question): { k: string; p: Record<string, unknown> } => {
  const t = (q.stem.find((p) => p.kind === 'text') as { text: LStr }).text
  return typeof t === 'string' ? { k: t, p: {} } : { k: t.k, p: (t.p ?? {}) as Record<string, unknown> }
}
const answerLabel = (q: Question): LStr => q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : labelKey(answerLabel(q)))
const key = (k: string): string => labelKey({ k })

type Poly = Extract<GeoItem, { t: 'poly' }>
type Line = Extract<GeoItem, { t: 'line' }>
type Txt = Extract<GeoItem, { t: 'text' }>
type Dot = Extract<GeoItem, { t: 'dot' }>
type Grid = Extract<GeoItem, { t: 'grid' }>
const polys = (f: GeoFig): Poly[] => f.items.filter((it): it is Poly => it.t === 'poly')
const lines = (f: GeoFig): Line[] => f.items.filter((it): it is Line => it.t === 'line')
const texts = (f: GeoFig): Txt[] => f.items.filter((it): it is Txt => it.t === 'text')
const dots = (f: GeoFig): Dot[] => f.items.filter((it): it is Dot => it.t === 'dot')
const gridOf = (f: GeoFig): Grid => f.items.find((it): it is Grid => it.t === 'grid')!
const dist = (a: GeoPt, b: GeoPt): number => Math.hypot(a[0] - b[0], a[1] - b[1])
const same = (a: GeoPt, b: GeoPt): boolean => dist(a, b) < 1e-6
const isInt = (v: number): boolean => Math.abs(v - Math.round(v)) < 1e-9
/** 关于直线 ab 的对称点 */
function mirror(p: GeoPt, a: GeoPt, b: GeoPt): GeoPt {
  const d: GeoPt = [b[0] - a[0], b[1] - a[1]]
  const t = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1])
  const f: GeoPt = [a[0] + d[0] * t, a[1] + d[1] * t]
  return [2 * f[0] - p[0], 2 * f[1] - p[1]]
}
/** 点到直线 ab 的距离 */
function toLine(p: GeoPt, a: GeoPt, b: GeoPt): number {
  return Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / dist(a, b)
}
/** 点在直线 ab 的哪一边（+1 / −1 / 0） */
const sideOf = (p: GeoPt, a: GeoPt, b: GeoPt): number => Math.sign(Math.round(((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) * 1e6))
/** 对称轴：红色虚线里最长的那条 */
const axisOf = (f: GeoFig): Line => lines(f).filter((l) => l.stroke === 'd' && l.dash).sort((a, b) => dist(b.a, b.b) - dist(a.a, a.b))[0]!
const samePointSet = (a: GeoPt[], b: GeoPt[], tol = 0.01): boolean => a.length === b.length && a.every((p) => b.some((q) => dist(p, q) < tol))
const shoelace = (pts: GeoPt[]): number => Math.abs(pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length]![1] - pts[(i + 1) % pts.length]![0] * p[1], 0)) / 2

describe('轴对称（m4s2-07-symmetry）', () => {
  const KP = 'm4s2-07-symmetry'
  it('点 A（A′）到对称轴是几小格：A 与 A′ 关于红色虚线对称、在格点上，图形本身也是轴对称的，答案就是到对称轴的格数', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'dist') return
      n++
      const f = geoOf(q).figs[0]!
      const g = gridOf(f)
      const ax = axisOf(f)
      // 对称轴贯穿整张方格纸
      expect(dist(ax.a, ax.b), q.id).toBeCloseTo(ax.a[0] === ax.b[0] ? g.h : g.w, 6)
      const A = dots(f).find((d) => d.label === 'A')!.at
      const A2 = dots(f).find((d) => d.label === 'A′')!.at
      expect(samePointSet([mirror(A, ax.a, ax.b)], [A2]), q.id).toBe(true)
      expect(isInt(A[0]) && isInt(A[1]), q.id).toBe(true)
      const shape = polys(f)[0]!.pts
      expect(samePointSet(shape.map((p) => mirror(p, ax.a, ax.b)), shape), `${q.id} 图形是轴对称的`).toBe(true)
      expect(shape.some((p) => same(p, A)), `${q.id} A 是图形的顶点`).toBe(true)
      const ask = textOf(q).p.p === 'A' ? A : A2
      expect(answer(q), q.id).toBe(String(Math.round(toLine(ask, ax.a, ax.b))))
    })
    expect(n).toBeGreaterThan(40)
  })

  it('找对应点：答案那个点是 A 关于对称轴的对称点，另外两个都不是（都在对称轴另一边、和 A 同一行）', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'partner' && kind(q) !== 'diag') return
      n++
      const f = geoOf(q).figs[0]!
      const ax = axisOf(f)
      const A = dots(f).find((d) => d.label === 'A')!.at
      const cands = dots(f).filter((d) => d.label !== 'A')
      expect(cands.map((c) => c.label).sort(), q.id).toEqual(['B', 'C', 'D'])
      const m = mirror(A, ax.a, ax.b)
      const hit = cands.filter((c) => dist(c.at, m) < 1e-6)
      expect(hit.length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(hit[0]!.label)
      for (const c of cands) expect(sideOf(c.at, ax.a, ax.b), q.id).toBe(-sideOf(A, ax.a, ax.b))
      // 半个图形的两头在对称轴上
      const half = polys(f)[0]!.pts
      expect(toLine(half[0]!, ax.a, ax.b), q.id).toBeLessThan(1e-6)
      expect(toLine(half[half.length - 1]!, ax.a, ax.b), q.id).toBeLessThan(1e-6)
      if (kind(q) === 'partner') {
        const row = (p: GeoPt): number => (ax.a[0] === ax.b[0] ? p[1] : p[0])
        for (const c of cands) expect(row(c.at), q.id).toBe(row(A))
      }
    })
    expect(n).toBeGreaterThan(40)
  })

  it('补全后是哪一幅：答案那幅的蓝线正好是黑线关于对称轴的对称图形，另外两幅都不是', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'complete') return
      n++
      const figs = geoOf(q).figs
      expect(figs.length).toBe(3)
      const ok = figs.map((f) => {
        const ax = axisOf(f)
        const [given, added] = polys(f)
        expect(given!.stroke, q.id).toBe('ink')
        expect(added!.stroke, q.id).toBe('b')
        const want = given!.pts.map((p) => mirror(p, ax.a, ax.b))
        return want.length === added!.pts.length && want.every((p, i) => dist(p, added!.pts[i]!) < 1e-6)
      })
      expect(ok.filter(Boolean).length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(String(ok.indexOf(true) + 1))
    })
    expect(n).toBeGreaterThan(40)
  })

  /** 凸多边形有几条对称轴：过中心和某个顶点或某条边的中点的直线里，把图形对称到自己身上的有几条 */
  function axesOf(pts: GeoPt[]): number {
    const c: GeoPt = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
    const through = [...pts, ...pts.map((p, i): GeoPt => [(p[0] + pts[(i + 1) % pts.length]![0]) / 2, (p[1] + pts[(i + 1) % pts.length]![1]) / 2])]
    const angles = new Set<number>()
    for (const t of through) {
      if (dist(t, c) < 1e-6) continue
      // 图上的坐标取了一位小数（fitFig），正六边形斜着的对称轴要放宽一点
      if (!samePointSet(pts.map((p) => mirror(p, c, t)), pts, 0.3)) continue
      angles.add(Math.round(((Math.atan2(t[1] - c[1], t[0] - c[0]) * 180) / Math.PI + 360) % 180))
    }
    return angles.size
  }
  it('有几条对称轴：按图形本身数出来（长方形 2、正方形 4、等边三角形 3、正六边形 6……）', () => {
    each(KP, (q) => {
      if (kind(q) !== 'axes') return
      const pts = polys(geoOf(q).figs[0]!)[0]!.pts
      // 中心取顶点的平均：等腰三角形、梯形、筝形的平均点不一定在对称轴上，换成用对称轴本身判断
      const s = sigOf(q).split('-')[1]!
      if (['rect', 'square', 'equi', 'hexagon'].includes(s)) expect(answer(q), q.id).toBe(String(axesOf(pts)))
      else expect(answer(q), q.id).toBe('1')
    })
  })

  it('红色虚线是不是对称轴：把图形沿虚线对称过去，和原来重合才是', () => {
    each(KP, (q) => {
      if (kind(q) !== 'isaxis') return
      const f = geoOf(q).figs[0]!
      const pts = polys(f)[0]!.pts
      const l = lines(f)[0]!
      const yes = samePointSet(
        pts.map((p) => mirror(p, l.a, l.b)),
        pts,
      )
      expect(answer(q), q.id).toBe(key(yes ? 'm4.ang.yes' : 'm4.ang.no'))
    })
  })

  it('对应点到对称轴的格数一样；判断题按词条定对错；「2 小格」不出现（会读成「二小格」）', () => {
    const J: Record<string, boolean> = { 'm4.mov.j.sameDist': true, 'm4.mov.j.diffDist': false, 'm4.mov.j.fold': true }
    each(KP, (q) => {
      const t = textOf(q)
      if (t.k === 'm4.mov.otherDistQ') {
        expect(answer(q)).toBe(String(t.p.n))
        expect(t.p.n).not.toBe(2)
      }
      if (J[t.k] !== undefined) expect(answer(q)).toBe(key(J[t.k] ? 'm4.ang.yes' : 'm4.ang.no'))
    })
  })

  it('第 1 档覆盖例 1、例 2 与做一做：到对称轴几小格、找对应点、补全、对称轴的条数、特点（判断）', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(kind(q))
    })
    for (const k of ['dist', 'partner', 'complete', 'axes', 'odist', 'j']) expect(seen, k).toContain(k)
  })
})

describe('平移（m4s2-07-translate）', () => {
  const KP = 'm4s2-07-translate'
  const DIR_OF = (v: GeoPt): string => (v[0] > 0 ? 'right' : v[0] < 0 ? 'left' : v[1] > 0 ? 'down' : 'up')
  /** 涂色的原图和虚线的平移后的图：按顺序一块对一块，返回平移的向量（每块的每个点都平移了同样多） */
  function shift(orig: Poly[], copy: Poly[]): GeoPt {
    expect(copy.length).toBe(orig.length)
    const v: GeoPt = [copy[0]!.pts[0]![0] - orig[0]!.pts[0]![0], copy[0]!.pts[0]![1] - orig[0]!.pts[0]![1]]
    orig.forEach((o, i) => o.pts.forEach((p, j) => expect(same([p[0] + v[0], p[1] + v[1]], copy[i]!.pts[j]!)).toBe(true)))
    return v
  }
  const parts = (f: GeoFig): { orig: Poly[]; dashed: Poly[] } => {
    const ps = polys(f)
    return { orig: ps.filter((p) => !p.dash), dashed: ps.filter((p) => p.dash) }
  }

  it('平移了几格、向哪个方向、怎样平移：按涂色的图和虚线的图上对应点算（横着或竖着平移，格数是对应点之间的格数）', () => {
    let gapTrap = 0
    each(KP, (q, d) => {
      if (!['far', 'dir', 'move'].includes(kind(q))) return
      const f = geoOf(q).figs[0]!
      const { orig, dashed } = parts(f)
      expect(orig.some((p) => p.fill === 'a'), q.id).toBe(true)
      const v = shift(orig, dashed)
      expect(v[0] === 0 || v[1] === 0, q.id).toBe(true)
      const n = Math.abs(v[0] + v[1])
      const dir = DIR_OF(v)
      // 第 1 档两个图不重叠（课本例 3、做一做）
      const xs = orig.flatMap((p) => p.pts.map((pt) => (v[0] ? pt[0] : pt[1])))
      const ext = Math.max(...xs) - Math.min(...xs)
      if (d === 1) expect(n, q.id).toBeGreaterThan(ext)
      if (kind(q) === 'far') {
        expect(answer(q), q.id).toBe(String(n))
        expect((textOf(q).p.dir as { k: string }).k).toBe(`m4.mov.dir.${dir}`)
        if (q.choices?.some((c) => c.label === String(n - ext))) gapTrap++
      }
      if (kind(q) === 'dir') expect(answer(q), q.id).toBe(key(`m4.mov.to.${dir}`))
      if (kind(q) === 'move') {
        const p = (answerLabel(q) as unknown as { p: { dir: { k: string }; n: number } }).p
        expect(p.dir.k, q.id).toBe(`m4.mov.dir.${dir}`)
        expect(p.n, q.id).toBe(n)
      }
    })
    expect(gapTrap, '选项里要有「数中间空了几格」的错法').toBeGreaterThan(10)
  })

  it('平移 n 格后得到哪一个：答案那个虚线图正好是涂色图平移 n 格；有一个和原图中间正好空 n 格的（陷阱）、一个方向反了的', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'which') return
      n++
      const f = geoOf(q).figs[0]!
      const { orig, dashed } = parts(f)
      const k = orig.length
      expect(dashed.length, q.id).toBe(3 * k)
      const dir = (textOf(q).p.dir as { k: string }).k.split('.').pop()!
      const steps = Number(textOf(q).p.n)
      const badges = texts(f).filter((t) => t.badge)
      const res = [0, 1, 2].map((i) => {
        const v = shift(orig, dashed.slice(i * k, i * k + k))
        const xs = dashed.slice(i * k, i * k + k).flatMap((p) => p.pts)
        const c: GeoPt = [(Math.min(...xs.map((p) => p[0])) + Math.max(...xs.map((p) => p[0]))) / 2, (Math.min(...xs.map((p) => p[1])) + Math.max(...xs.map((p) => p[1]))) / 2]
        const badge = badges.sort((a, b) => dist(a.at, c) - dist(b.at, c))[0]!.text
        return { v, badge }
      })
      const ok = res.filter((r) => DIR_OF(r.v) === dir && Math.abs(r.v[0] + r.v[1]) === steps)
      expect(ok.length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(ok[0]!.badge)
      expect(new Set(res.map((r) => r.badge)).size).toBe(3)
      // 陷阱：中间正好空 n 格
      const xs = orig.flatMap((p) => p.pts.map((pt) => (dir === 'left' || dir === 'right' ? pt[0] : pt[1])))
      const ext = Math.max(...xs) - Math.min(...xs)
      expect(res.some((r) => DIR_OF(r.v) === dir && Math.abs(r.v[0] + r.v[1]) === steps + ext), q.id).toBe(true)
    })
    expect(n).toBeGreaterThan(30)
  })

  it('例 4：凸出的半圆平移 L 格补进凹进去的半圆，拼成 L × D 的长方形；图形的面积就是长方形的面积', () => {
    let book = 0
    each(KP, (q) => {
      if (kind(q) !== 'bump') return
      const f = geoOf(q).figs[0]!
      const pts = polys(f)[0]!.pts
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      // 平移的方向是图形长的那个方向（L + D/2 总比 D 长）
      const vertical = Math.max(...ys) - Math.min(...ys) > Math.max(...xs) - Math.min(...xs)
      expect(sigOf(q).endsWith(vertical ? '-v' : '-h'), q.id).toBe(true)
      if (textOf(q).k === 'm4.mov.bumpQ') expect((textOf(q).p.side as { k: string }).k, q.id).toBe(vertical ? 'm4.mov.side.top' : 'm4.mov.side.left')
      // 长方形部分的长 L、宽 D：凸出的半圆在外面（左边 / 上边），所以包围盒的长是 L + D/2
      const [lo, hi, w0, w1] = vertical ? [Math.min(...ys), Math.max(...ys), Math.min(...xs), Math.max(...xs)] : [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
      const D = w1 - w0
      const L = hi - lo - D / 2
      expect(shoelace(pts), `${q.id} 面积（半圆凸出去的和凹进来的一样大）`).toBeCloseTo(L * D, 6)
      if (sigOf(q).startsWith('bump-shift')) expect(answer(q), q.id).toBe(String(L))
      else expect(answer(q), q.id).toBe(String(L * D))
      expect(texts(f).some((t) => t.text === '1 cm'), q.id).toBe(true)
      if (sigOf(q) === 'bump-area-6-4-h') book++
    })
    expect(book, '课本例 4：6 × 4 = 24').toBeGreaterThan(0)
  })

  it('火箭：图上标的长和宽相乘就是面积（尖头平移过去补进缺口），图形本身的面积也一样', () => {
    each(KP, (q) => {
      if (kind(q) !== 'rocket') return
      const f = geoOf(q).figs[0]!
      const poly = polys(f)[0]!
      const L = parseFloat(poly.labels![3]!)
      const W = parseFloat(texts(f).find((t) => /cm/.test(t.text))!.text)
      expect(answer(q), q.id).toBe(String(L * W))
      const k = (poly.pts[1]![0] - poly.pts[0]![0]) / L
      expect(shoelace(poly.pts) / (k * k), q.id).toBeCloseTo(L * W, 6)
    })
  })

  it('阶梯形的周长：图形的边加起来（横的、竖的平移后正好是长方形的周长）', () => {
    each(KP, (q) => {
      if (kind(q) !== 'stairs') return
      const f = geoOf(q).figs[0]!
      const pts = polys(f)[0]!.pts
      const per = pts.reduce((s, p, i) => s + dist(p, pts[(i + 1) % pts.length]!), 0)
      expect(answer(q), q.id).toBe(String(Math.round(per)))
      expect(per).toBeCloseTo(Math.round(per), 6)
      // 边都是横的或竖的，台阶的拐点有不在格线上的
      pts.forEach((p, i) => {
        const r = pts[(i + 1) % pts.length]!
        expect(p[0] === r[0] || p[1] === r[1], q.id).toBe(true)
      })
      expect(pts.some((p) => !isInt(p[0]) || !isInt(p[1])), q.id).toBe(true)
    })
  })

  it('小动物平移两次：先横着平移的格数、再怎样平移，按图上两格的位置算', () => {
    each(KP, (q) => {
      if (kind(q) !== 'two') return
      const f = geoOf(q).figs[0]!
      const { a, b, dir } = textOf(q).p as { a: string; b: string; dir: { k: string } }
      const A = texts(f).find((t) => t.text === a)!.at
      const B = texts(f).find((t) => t.text === b)!.at
      const dx = B[0] - A[0]
      const dy = B[1] - A[1]
      expect(dir.k).toBe(`m4.mov.dir.${dx > 0 ? 'right' : 'left'}`)
      if (sigOf(q).endsWith('-first')) {
        expect(answer(q), q.id).toBe(String(Math.abs(dx)))
        expect((textOf(q).p.dir2 as { k: string }).k).toBe(`m4.mov.dir.${dy > 0 ? 'down' : 'up'}`)
      } else {
        expect(textOf(q).p.n).toBe(Math.abs(dx))
        const p = (answerLabel(q) as unknown as { p: { dir: { k: string }; n: number } }).p
        expect(p.dir.k, q.id).toBe(`m4.mov.dir.${dy > 0 ? 'down' : 'up'}`)
        expect(p.n, q.id).toBe(Math.abs(dy))
      }
    })
  })

  it('涂色部分占几分之几：按图上涂色的面积算（挖掉的白色部分减掉）', () => {
    each(KP, (q) => {
      if (kind(q) !== 'frac') return
      const f = geoOf(q).figs[0]!
      const ps = polys(f)
      const outline = ps.filter((p) => !p.fill).sort((a, b) => shoelace(b.pts) - shoelace(a.pts))[0]!
      const shaded = ps.filter((p) => p.fill && p.fill !== 'paper').reduce((s, p) => s + shoelace(p.pts), 0) - ps.filter((p) => p.fill === 'paper').reduce((s, p) => s + shoelace(p.pts), 0)
      const [n, m] = answer(q).split('/').map(Number)
      expect(shaded / shoelace(outline.pts), q.id).toBeCloseTo(n! / m!, 6)
    })
  })

  it('判断题', () => {
    each(KP, (q) => {
      if (kind(q) !== 'j') return
      expect(answer(q)).toBe(key(textOf(q).k === 'm4.mov.j.points' ? 'm4.ang.yes' : 'm4.ang.no'))
    })
  })

  it('第 1 档覆盖例 3、例 4 与做一做：平移了几格、方向、向（ ）平移（ ）格、找平移后的图形、拼成长方形求面积、火箭、数格子的方法、周长', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(kind(q))
    })
    for (const k of ['far', 'dir', 'move', 'which', 'bump', 'rocket', 'j', 'stairs']) expect(seen, k).toContain(k)
  })
})
