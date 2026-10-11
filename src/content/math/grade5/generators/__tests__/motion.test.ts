import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, MotionItem, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'
import { HALVES, PIECES, type Rot, TRI_NEW, fullOf, rotAbout } from '../motion'

// 五上「图形的运动」的专项检查：答案都从图上的方格坐标（对称轴、点、图形、平移 / 旋转后的虚线图）、表盘、钟摆和风车的参数重新推一遍。

const SEEDS = 150
const zh = (l: LStr): string => translate(l, 'zh')
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
const kind = (q: Question): string => sigOf(q).split('-')[0]!
type Geo = Extract<StemPart, { kind: 'geo' }>
type Dial = Extract<StemPart, { kind: 'dial' }>
type Motion = Extract<StemPart, { kind: 'motion-figs' }>
const geoOf = (q: Question): Geo => q.stem.find((p): p is Geo => p.kind === 'geo')!
const textOf = (q: Question): { k: string; p: Record<string, unknown> } => {
  const t = (q.stem.find((p) => p.kind === 'text') as { text: LStr }).text
  return typeof t === 'string' ? { k: t, p: {} } : { k: t.k, p: (t.p ?? {}) as Record<string, unknown> }
}
const answerLabel = (q: Question): LStr => q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : labelKey(answerLabel(q)))
const key = (k: string): string => labelKey({ k })
const turnOf = (l: unknown): Rot => (l as { k: string }).k.split('.').pop() as Rot

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
function mirror(p: GeoPt, a: GeoPt, b: GeoPt): GeoPt {
  const d: GeoPt = [b[0] - a[0], b[1] - a[1]]
  const t = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1])
  const f: GeoPt = [a[0] + d[0] * t, a[1] + d[1] * t]
  return [2 * f[0] - p[0], 2 * f[1] - p[1]]
}
function toLine(p: GeoPt, a: GeoPt, b: GeoPt): number {
  return Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / dist(a, b)
}
const sideOf = (p: GeoPt, a: GeoPt, b: GeoPt): number => Math.sign(Math.round(((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) * 1e6))
const axisOf = (f: GeoFig): Line => lines(f).filter((l) => l.stroke === 'd' && l.dash).sort((a, b) => dist(b.a, b.b) - dist(a.a, a.b))[0]!
const samePointSet = (a: GeoPt[], b: GeoPt[], tol = 0.01): boolean => a.length === b.length && a.every((p) => b.some((q) => dist(p, q) < tol))
const shoelace = (pts: GeoPt[]): number => Math.abs(pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length]![1] - pts[(i + 1) % pts.length]![0] * p[1], 0)) / 2
/** 号码牌：离 c 最近的那块 */
const badgeNear = (f: GeoFig, c: GeoPt): string =>
  texts(f)
    .filter((t) => t.badge)
    .sort((a, b) => dist(a.at, c) - dist(b.at, c))[0]!.text
const center = (pts: GeoPt[]): GeoPt => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]

describe('轴对称（m5s1-04-symmetry）', () => {
  const KP = 'm5s1-04-symmetry'
  it('课本的半个图形：松树（例 1）的 A 到对称轴 3 格、B 2 格；五角星（例 2）、心形（做一做 1）、两个练习八 2 的图都是轴对称的', () => {
    const tree = fullOf(HALVES.tree!)
    expect(tree.some((p) => p[0] === -3 && p[1] === 4)).toBe(true)
    expect(tree.some((p) => p[0] === -2 && p[1] === 2)).toBe(true)
    for (const h of Object.values(HALVES)) {
      const full = fullOf(h)
      expect(samePointSet(full.map(([x, y]): GeoPt => [-x, y]), full)).toBe(true)
      expect(h[0]![0]).toBe(0)
      expect(h[h.length - 1]![0]).toBe(0)
    }
  })

  it('点 A（A′）到对称轴是几格：A 与 A′ 关于红色虚线对称、在格点上，图形本身也是轴对称的', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'dist') return
      n++
      const f = geoOf(q).figs[0]!
      const g = gridOf(f)
      const ax = axisOf(f)
      expect(dist(ax.a, ax.b), q.id).toBeCloseTo(ax.a[0] === ax.b[0] ? g.h : g.w, 6)
      const A = dots(f).find((d) => d.label === 'A')!.at
      const A2 = dots(f).find((d) => d.label === 'A′')!.at
      expect(samePointSet([mirror(A, ax.a, ax.b)], [A2]), q.id).toBe(true)
      expect(isInt(A[0]) && isInt(A[1]), q.id).toBe(true)
      const shape = polys(f)[0]!.pts
      expect(samePointSet(shape.map((p) => mirror(p, ax.a, ax.b)), shape), `${q.id} 图形是轴对称的`).toBe(true)
      const ask = textOf(q).p.p === 'A' ? A : A2
      expect(answer(q), q.id).toBe(String(Math.round(toLine(ask, ax.a, ax.b))))
    })
    expect(n).toBeGreaterThan(40)
  })

  it('找对应点：答案那个点是 A 关于对称轴的对称点，另外两个都不是', () => {
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
        const want = given!.pts.map((p) => mirror(p, ax.a, ax.b))
        return want.length === added!.pts.length && want.every((p, i) => dist(p, added!.pts[i]!) < 1e-6)
      })
      expect(ok.filter(Boolean).length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(String(ok.indexOf(true) + 1))
    })
    expect(n).toBeGreaterThan(40)
  })

  /** 多边形有几条对称轴：过中心和某个顶点或某条边的中点的直线里，把图形对称到自己身上的有几条 */
  function axesOf(pts: GeoPt[]): number {
    const c = center(pts)
    const through = [...pts, ...pts.map((p, i): GeoPt => [(p[0] + pts[(i + 1) % pts.length]![0]) / 2, (p[1] + pts[(i + 1) % pts.length]![1]) / 2])]
    const angles = new Set<number>()
    for (const t of through) {
      if (dist(t, c) < 1e-6) continue
      if (!samePointSet(pts.map((p) => mirror(p, c, t)), pts)) continue
      angles.add(Math.round(((Math.atan2(t[1] - c[1], t[0] - c[0]) * 180) / Math.PI + 360) % 180))
    }
    return angles.size
  }
  it('有几条对称轴：按方格纸上的图形数出来（长方形 2、正方形 4、等腰三角形 1……）；第 1 档只有长方形、正方形、等腰三角形', () => {
    each(KP, (q, d) => {
      if (kind(q) !== 'axes') return
      const s = sigOf(q).split('-')[1]!
      if (d === 1) expect(['rect', 'square', 'iso'], q.id).toContain(s)
      const pts = polys(geoOf(q).figs[0]!)[0]!.pts
      if (s === 'rect' || s === 'square') expect(answer(q), q.id).toBe(String(axesOf(pts)))
      else expect(answer(q), q.id).toBe('1')
    })
  })

  it('红色虚线是不是对称轴（练习八 1 改判断、做一做 1 的心形和梯形）：把图形沿虚线对称过去，和原来重合才是', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'isaxis' && kind(q) !== 'dashj') return
      n++
      const f = geoOf(q).figs[0]!
      const pts = polys(f)[0]!.pts
      const l = axisOf(f)
      expect(answer(q), q.id).toBe(key(samePointSet(pts.map((p) => mirror(p, l.a, l.b)), pts) ? 'm5.mot.yes' : 'm5.mot.no'))
    })
    expect(n).toBeGreaterThan(40)
  })

  it('做一做 1：点 A、B 到红色虚线的格数；课本心形 3、3（是），梯形 4、5（不是）', () => {
    const book = new Map<string, string>()
    each(KP, (q) => {
      if (kind(q) !== 'dash') return
      const f = geoOf(q).figs[0]!
      const l = axisOf(f)
      const p = textOf(q).p.p as string
      const at = dots(f).find((d) => d.label === p)!.at
      expect(answer(q), q.id).toBe(String(Math.round(toLine(at, l.a, l.b))))
      const name = sigOf(q).split('-')[1]!
      if (name === 'heart' || name === 'trap') book.set(`${name}-${p}`, answer(q))
    })
    expect(Object.fromEntries(book)).toEqual({ 'heart-A': '3', 'heart-B': '3', 'trap-A': '4', 'trap-B': '5' })
  })

  it('对应点到对称轴的格数一样；判断题按词条定对错；「2 格」不出现', () => {
    const J: Record<string, boolean> = { 'm5.mot.j.sameDist': true, 'm5.mot.j.perp': true, 'm5.mot.j.diffDist': false, 'm5.mot.j.fold': true }
    each(KP, (q) => {
      const t = textOf(q)
      if (t.k === 'm5.mot.otherDistQ') {
        expect(answer(q)).toBe(String(t.p.n))
        expect(t.p.n).not.toBe(2)
      }
      if (J[t.k] !== undefined) expect(answer(q)).toBe(key(J[t.k] ? 'm5.mot.yes' : 'm5.mot.no'))
    })
  })

  it('第 1 档覆盖例 1、例 2 与做一做：到对称轴几格、找对应点、补全、到虚线几格、判断对称轴、对称轴的条数、特点', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(kind(q))
    })
    for (const k of ['dist', 'partner', 'complete', 'dash', 'dashj', 'axes', 'odist', 'j']) expect(seen, k).toContain(k)
  })
})

describe('平移（m5s1-04-translate）', () => {
  const KP = 'm5s1-04-translate'
  const DIR_OF = (v: GeoPt): string => (v[0] > 0 ? 'right' : v[0] < 0 ? 'left' : v[1] > 0 ? 'down' : 'up')
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

  it('平移了几格、向哪个方向、怎样平移：按涂色的图和虚线的图上对应点算；课本小房子 / 小旗向右 9 格', () => {
    let gapTrap = 0
    let book = 0
    each(KP, (q, d) => {
      if (!['far', 'dir', 'move'].includes(kind(q))) return
      const f = geoOf(q).figs[0]!
      const { orig, dashed } = parts(f)
      const v = shift(orig, dashed)
      expect(v[0] === 0 || v[1] === 0, q.id).toBe(true)
      const n = Math.abs(v[0] + v[1])
      const dir = DIR_OF(v)
      const xs = orig.flatMap((p) => p.pts.map((pt) => (v[0] ? pt[0] : pt[1])))
      const ext = Math.max(...xs) - Math.min(...xs)
      if (d === 1) expect(n, q.id).toBeGreaterThan(ext)
      if (kind(q) === 'far') {
        expect(answer(q), q.id).toBe(String(n))
        expect((textOf(q).p.dir as { k: string }).k).toBe(`m5.mot.dir.${dir}`)
        if (q.choices?.some((c) => c.label === String(n - ext))) gapTrap++
        if (/^far-(home|flag)-right-9$/.test(sigOf(q))) book++
      }
      if (kind(q) === 'dir') expect(answer(q), q.id).toBe(key(`m5.mot.to.${dir}`))
      if (kind(q) === 'move') {
        const p = (answerLabel(q) as unknown as { p: { dir: { k: string }; n: number } }).p
        expect(p.dir.k, q.id).toBe(`m5.mot.dir.${dir}`)
        expect(p.n, q.id).toBe(n)
      }
    })
    expect(gapTrap, '选项里要有「数中间空了几格」的错法').toBeGreaterThan(10)
    expect(book, '课本例 3、做一做 2').toBeGreaterThan(5)
  })

  it('平移 n 格后得到哪一个：答案那个虚线图正好是涂色图平移 n 格；有一个中间正好空 n 格的、一个方向反了的；课本的小船平移 4 格', () => {
    let boat = 0
    each(KP, (q) => {
      if (kind(q) !== 'which') return
      const f = geoOf(q).figs[0]!
      const { orig, dashed } = parts(f)
      const k = orig.length
      expect(dashed.length, q.id).toBe(3 * k)
      const dir = (textOf(q).p.dir as { k: string }).k.split('.').pop()!
      const steps = Number(textOf(q).p.n)
      const res = [0, 1, 2].map((i) => {
        const v = shift(orig, dashed.slice(i * k, i * k + k))
        const c = center(dashed.slice(i * k, i * k + k).flatMap((p) => p.pts))
        return { v, badge: badgeNear(f, [c[0], 0.45]) }
      })
      const ok = res.filter((r) => DIR_OF(r.v) === dir && Math.abs(r.v[0] + r.v[1]) === steps)
      expect(ok.length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(ok[0]!.badge)
      const xs = orig.flatMap((p) => p.pts.map((pt) => pt[0]))
      const ext = Math.max(...xs) - Math.min(...xs)
      expect(res.some((r) => DIR_OF(r.v) === dir && Math.abs(r.v[0] + r.v[1]) === steps + ext), q.id).toBe(true)
      if (sigOf(q).startsWith('which-boat-right-4-')) boat++
    })
    expect(boat).toBeGreaterThan(3)
  })

  it('例 5：凸出的半圆平移 L 格补进凹进去的半圆，拼成 L × D 的长方形（课本 6 × 4 = 24）', () => {
    let book = 0
    each(KP, (q) => {
      if (kind(q) !== 'bump') return
      const pts = polys(geoOf(q).figs[0]!)[0]!.pts
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      const vertical = Math.max(...ys) - Math.min(...ys) > Math.max(...xs) - Math.min(...xs)
      const [lo, hi, w0, w1] = vertical ? [Math.min(...ys), Math.max(...ys), Math.min(...xs), Math.max(...xs)] : [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
      const D = w1 - w0
      const L = hi - lo - D / 2
      expect(shoelace(pts), q.id).toBeCloseTo(L * D, 6)
      if (sigOf(q).startsWith('bump-shift')) expect(answer(q), q.id).toBe(String(L))
      else expect(answer(q), q.id).toBe(String(L * D))
      if (sigOf(q) === 'bump-area-6-4-h') book++
    })
    expect(book).toBeGreaterThan(0)
  })

  it('做一做火箭：图形的面积（尖头平移过去补进缺口）就是答案；课本 11 × 4 = 44', () => {
    let book = 0
    each(KP, (q) => {
      if (kind(q) !== 'rocket') return
      const pts = polys(geoOf(q).figs[0]!)[0]!.pts
      expect(answer(q), q.id).toBe(String(Math.round(shoelace(pts))))
      expect(shoelace(pts)).toBeCloseTo(Math.round(shoelace(pts)), 6)
      if (answer(q) === '44' && sigOf(q) === 'rocket-11-4-2') book++
    })
    expect(book).toBeGreaterThan(0)
  })

  it('台阶的周长：图形的边加起来；边都是横的或竖的，有拐点不在格线上', () => {
    each(KP, (q) => {
      if (kind(q) !== 'stairs') return
      const pts = polys(geoOf(q).figs[0]!)[0]!.pts
      const per = pts.reduce((s, p, i) => s + dist(p, pts[(i + 1) % pts.length]!), 0)
      expect(answer(q), q.id).toBe(String(Math.round(per)))
      pts.forEach((p, i) => {
        const r = pts[(i + 1) % pts.length]!
        expect(p[0] === r[0] || p[1] === r[1], q.id).toBe(true)
      })
      expect(pts.some((p) => !isInt(p[0]) || !isInt(p[1])), q.id).toBe(true)
    })
  })

  it('做一做 1 小动物卡片：先横着平移的格数、再怎样平移，按图上两格的位置算；课本小狗→骨头 右 9 下 4', () => {
    const book = new Set<string>()
    each(KP, (q) => {
      if (kind(q) !== 'two') return
      const f = geoOf(q).figs[0]!
      const { a, b, dir } = textOf(q).p as { a: string; b: string; dir: { k: string } }
      const A = texts(f).find((t) => t.text === a)!.at
      const B = texts(f).find((t) => t.text === b)!.at
      const dx = B[0] - A[0]
      const dy = B[1] - A[1]
      expect(dir.k).toBe(`m5.mot.dir.${dx > 0 ? 'right' : 'left'}`)
      if (sigOf(q).endsWith('-first')) expect(answer(q), q.id).toBe(String(Math.abs(dx)))
      else {
        const p = (answerLabel(q) as unknown as { p: { dir: { k: string }; n: number } }).p
        expect(p.dir.k, q.id).toBe(`m5.mot.dir.${dy > 0 ? 'down' : 'up'}`)
        expect(p.n, q.id).toBe(Math.abs(dy))
      }
      if (sigOf(q).includes('-book-')) book.add(`${a}${Math.abs(dx)}${Math.abs(dy)}`)
    })
    expect([...book].sort()).toEqual(['🐶94', '🐼89', '\u{1F43F}\u{FE0F}107'].sort())
  })

  it('涂色部分占几分之几：按图上涂色的面积算（挖掉的白色部分减掉）', () => {
    each(KP, (q) => {
      if (kind(q) !== 'frac') return
      const ps = polys(geoOf(q).figs[0]!)
      const outline = ps.filter((p) => !p.fill).sort((a, b) => shoelace(b.pts) - shoelace(a.pts))[0]!
      const shaded = ps.filter((p) => p.fill && p.fill !== 'paper').reduce((s, p) => s + shoelace(p.pts), 0) - ps.filter((p) => p.fill === 'paper').reduce((s, p) => s + shoelace(p.pts), 0)
      const [n, m] = zh(answerLabel(q)).split('/').map(Number)
      expect(shaded / shoelace(outline.pts), q.id).toBeCloseTo(n! / m!, 6)
    })
  })

  it('判断题；第 1 档覆盖例 3、例 4、例 5 与做一做', () => {
    const J: Record<string, boolean> = { 'm5.mot.j.points': true, 'm5.mot.j.gap': false, 'm5.mot.j.same': true, 'm5.mot.j.dist': true }
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (kind(q) === 'j') expect(answer(q)).toBe(key(J[textOf(q).k] ? 'm5.mot.yes' : 'm5.mot.no'))
      if (d === 1) seen.add(kind(q))
    })
    for (const k of ['far', 'dir', 'move', 'which', 'bump', 'rocket', 'two', 'j', 'stairs']) expect(seen, k).toContain(k)
  })
})

describe('旋转（m5s1-04-rotate）', () => {
  const KP = 'm5s1-04-rotate'
  /** 屏幕坐标里从 u 转到 v：叉积为正是顺时针 */
  const wayOf = (u: GeoPt, v: GeoPt): 'cw' | 'ccw' => (u[0] * v[1] - u[1] * v[0] > 0 ? 'cw' : 'ccw')
  const ROT_J: Record<string, boolean> = { center: true, length: false, turnDir: true, moveDir: true, size: true, shape: false }
  const SELF: Record<string, boolean> = { rect180: true, rect90: false, square90: true, circle: true }

  it('表盘：从 a 走到 b 顺时针转了 30° × 走过的数；从 a 转 n° 指向几', () => {
    const book = new Set<string>()
    each(KP, (q) => {
      const dial = q.stem.find((p): p is Dial => p.kind === 'dial')
      if (kind(q) === 'dial') {
        const { a, b } = textOf(q).p as { a: number; b: number }
        expect([dial!.from, dial!.to]).toEqual([a, b])
        expect(answer(q), q.id).toBe(String(30 * ((b - a + 12) % 12)))
        book.add(`${a}-${b}`)
      }
      if (kind(q) === 'dialto') {
        const { a, deg } = textOf(q).p as { a: number; deg: number }
        expect(dial!.to).toBe(a)
        expect(dial!.from).toBeUndefined()
        expect(answer(q), q.id).toBe(String(((a - 1 + deg / 30) % 12) + 1))
      }
    })
    for (const p of ['12-1', '1-3', '3-6', '6-12']) expect(book.has(p), p).toBe(true)
  })

  it('道闸：实线（原来）和虚线（转到）的方向按叉积定顺 / 逆时针；左边那根抬起来是顺时针、右边那根是逆时针', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'gate' && kind(q) !== 'gatedeg') return
      n++
      const f = geoOf(q).figs[0]!
      const target = polys(f).find((p) => p.dash)!
      const pivots = dots(f).map((d) => d.at)
      const tc = center(target.pts)
      const pivot = pivots.sort((a, b) => dist(a, tc) - dist(b, tc))[0]!
      // 和虚线同一边的实线横杆 / 竖杆（离同一个点最近的那块涂色的长条）
      const arms = polys(f).filter((p) => p.fill === 'a')
      const from = arms.sort((a, b) => dist(center(a.pts), pivot) - dist(center(b.pts), pivot))[0]!
      const u: GeoPt = [center(from.pts)[0] - pivot[0], center(from.pts)[1] - pivot[1]]
      const v: GeoPt = [tc[0] - pivot[0], tc[1] - pivot[1]]
      expect(Math.abs(u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v)), `${q.id} 转了 90°`).toBeLessThan(0.1)
      if (kind(q) === 'gate') expect(answer(q), q.id).toBe(key(`m5.mot.way.${wayOf(u, v)}`))
      else expect(answer(q)).toBe('90')
      const side = sigOf(q).split('-')[1]
      const raise = sigOf(q).endsWith('-up')
      expect(wayOf(u, v)).toBe((side === 'left') === raise ? 'cw' : 'ccw')
    })
    expect(n).toBeGreaterThan(5)
  })

  it('三角尺：直角顶点 O，原来朝某方向的直角边转 90° 以后朝哪', () => {
    const DIRV: Record<string, GeoPt> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }
    each(KP, (q) => {
      if (kind(q) !== 'setsq') return
      const tri = polys(geoOf(q).figs[0]!)[0]!.pts
      const O = tri[0]!
      const { way, from } = textOf(q).p as { way: { k: string }; from: { k: string } }
      const fromDir = from.k.split('.').pop()!
      // 原来朝 fromDir 的那条直角边真在图上
      expect(tri.slice(1).some((p) => same([Math.sign(p[0] - O[0]), Math.sign(p[1] - O[1])], DIRV[fromDir]!)), q.id).toBe(true)
      const r = way.k.split('.').pop() as Rot
      const to = rotAbout(DIRV[fromDir]!, [0, 0], r)
      const want = Object.keys(DIRV).find((k) => same(DIRV[k]!, to))!
      expect(answer(q), q.id).toBe(key(`m5.mot.to.${want}`))
    })
  })

  it('三角形 AOB 绕点 O 旋转后是哪幅图：只有答案那幅的虚线三角形是原三角形绕 O 转过去的；课本例 7 三角形出得到', () => {
    let book = 0
    each(KP, (q) => {
      if (kind(q) !== 'trifig') return
      const r = turnOf(textOf(q).p.turn)
      const figs = geoOf(q).figs
      const ok = figs.map((f) => {
        const orig = polys(f).find((p) => !p.dash)!.pts
        const res = polys(f).find((p) => p.dash)!.pts
        const O = dots(f).find((d) => d.label === 'O')!.at
        expect(same(orig[1]!, O), q.id).toBe(true)
        return samePointSet(orig.map((p) => rotAbout(p, O, r)), res)
      })
      expect(ok.filter(Boolean).length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(String(ok.indexOf(true) + 1))
      if (sigOf(q).startsWith(`trifig-${TRI_NEW.id}-`)) book++
    })
    expect(book).toBeGreaterThan(5)
  })

  it('点 A 转到了哪个位置、转过去后 A 离 O 几格', () => {
    each(KP, (q) => {
      if (kind(q) === 'tripoint') {
        const f = geoOf(q).figs[0]!
        const r = turnOf(textOf(q).p.turn)
        const A = dots(f).find((d) => d.label === 'A')!.at
        const O = dots(f).find((d) => d.label === 'O')!.at
        expect(answer(q), q.id).toBe(badgeNear(f, rotAbout(A, O, r)))
        const cand = dots(f).filter((d) => !d.label)
        expect(cand.filter((d) => same(d.at, rotAbout(A, O, r))).length, q.id).toBe(1)
      }
      if (kind(q) === 'trilen') {
        const f = geoOf(q).figs[0]!
        const A = dots(f).find((d) => d.label === 'A')!.at
        const O = dots(f).find((d) => d.label === 'O')!.at
        expect(answer(q), q.id).toBe(String(dist(A, O)))
      }
    })
  })

  it('练习九 2：图形 AOBC 转出的三个，答案那个正好是原来的图形绕 O 转过去的', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'four' && kind(q) !== 'fourhow') return
      n++
      const f = geoOf(q).figs[0]!
      const O = dots(f).find((d) => d.label === 'O')!.at
      const orig = polys(f).find((p) => p.fill)!.pts
      const copies = polys(f).filter((p) => !p.fill)
      expect(copies.length).toBe(3)
      const turnFor = (pts: GeoPt[]): Rot => (['cw', 'ccw', 'half'] as Rot[]).find((r) => samePointSet(orig.map((p) => rotAbout(p, O, r)), pts))!
      if (kind(q) === 'four') {
        const r = turnOf(textOf(q).p.turn)
        const hit = copies.find((c) => turnFor(c.pts) === r)!
        const tip = hit.pts.sort((a, b) => dist(b, O) - dist(a, O))[0]!
        expect(answer(q), q.id).toBe(badgeNear(f, tip))
      } else {
        const no = String(textOf(q).p.n)
        const hit = copies.find((c) => badgeNear(f, c.pts.sort((a, b) => dist(b, O) - dist(a, O))[0]!) === no)!
        expect(answer(q), q.id).toBe(key(`m5.mot.turn.${turnFor(hit.pts)}`))
      }
    })
    expect(n).toBeGreaterThan(10)
  })

  it('练习九 3、4：线段、长方形绕一个端点 / 顶点旋转后是哪一个', () => {
    each(KP, (q) => {
      if (kind(q) === 'seg') {
        const f = geoOf(q).figs[0]!
        const r = turnOf(textOf(q).p.turn)
        const P = dots(f).find((d) => d.label === textOf(q).p.p)!.at
        const other = dots(f).find((d) => d.label !== textOf(q).p.p)!.at
        const want = rotAbout(other, P, r)
        const hits = lines(f).filter((l) => l.dash && same(l.a, P) && same(l.b, want))
        expect(hits.length, q.id).toBe(1)
        expect(answer(q), q.id).toBe(badgeNear(f, want))
      }
      if (kind(q) === 'rect') {
        const r = turnOf(textOf(q).p.turn)
        const ok = geoOf(q).figs.map((f) => {
          const A = dots(f).find((d) => d.label === 'A')!.at
          const orig = polys(f).find((p) => !p.dash)!.pts
          return samePointSet(orig.map((p) => rotAbout(p, A, r)), polys(f).find((p) => p.dash)!.pts)
        })
        expect(ok.filter(Boolean).length, q.id).toBe(1)
        expect(answer(q), q.id).toBe(String(ok.indexOf(true) + 1))
      }
    })
  })

  it('钟摆往左摆是顺时针、风车叶片挪一个位置是 90°、卡片方向变了是旋转', () => {
    each(KP, (q) => {
      const mf = q.stem.find((p): p is Motion => p.kind === 'motion-figs')
      if (kind(q) === 'pend') {
        const it = mf!.items[0] as MotionItem
        expect(answer(q), q.id).toBe(key(`m5.mot.way.${it.swing === 'left' ? 'cw' : 'ccw'}`))
      }
      if (kind(q) === 'pin') {
        const [a, b] = mf!.items.map((it) => (it as MotionItem).spin ?? 0)
        const turn = ((b! - a!) % 360 + 360) % 360
        if (turn === 180) expect(answer(q)).toBe('180')
        else expect(answer(q), q.id).toBe(key(`m5.mot.way.${turn === 90 ? 'cw' : 'ccw'}`))
        expect(mf!.arrows).toBe(true)
      }
      if (kind(q) === 'card') {
        const f = geoOf(q).figs[0]!
        const reds = polys(f).filter((p) => p.fill === 'd')
        const cards = polys(f).filter((p) => p.fill === 'paper')
        // 红三角的直角顶点在卡片的哪个角：方向一样是平移，不一样是旋转
        const cornerOf = (tri: Poly, card: Poly): number => card.pts.findIndex((c) => same(c, tri.pts[0]!))
        const same2 = cornerOf(reds[0]!, cards[0]!) === cornerOf(reds[1]!, cards[1]!)
        expect(answer(q), q.id).toBe(key(same2 ? 'm5.mot.translate' : 'm5.mot.rotate'))
      }
    })
  })

  it('判断题、旋转后重合、两块拼成正方形（课本三组都是 9 格）', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (kind(q) === 'j') expect(answer(q), q.id).toBe(key(ROT_J[s.slice(2)] ? 'm5.mot.yes' : 'm5.mot.no'))
      if (kind(q) === 'self') expect(answer(q), q.id).toBe(key(SELF[s.slice(5)] ? 'm5.mot.yes' : 'm5.mot.no'))
      if (kind(q) === 'pieces') {
        const ps = polys(geoOf(q).figs[0]!)
        expect(ps.reduce((a, p) => a + shoelace(p.pts), 0), q.id).toBeCloseTo(9, 6)
        expect(answer(q)).toBe('9')
      }
    })
    for (const p of PIECES) expect(p.pts.reduce((a, pts) => a + shoelace(pts), 0)).toBeCloseTo(9, 6)
  })

  it('第 1 档覆盖例 6（1）（2）、做一做、例 7、做一做、例 8 的结论；第 2、3 档有练习九、练习十', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      seen.add(`${d}-${kind(q)}`)
      if (d === 1 && kind(q) === 'trifig') seen.add(`1-trifig-${turnOf(textOf(q).p.turn)}`)
    })
    for (const k of ['1-dial', '1-dialto', '1-gate', '1-setsq', '1-trifig-cw', '1-trifig-ccw', '1-tripoint', '1-trilen', '1-j', '2-four', '2-fourhow', '2-seg', '2-rect', '2-pend', '2-pin', '2-card', '3-self', '3-pieces'])
      expect(seen.has(k), k).toBe(true)
  })

  it('用词：不提「杆」「标着」「指着」，没有圆括号', () => {
    each(KP, (q) => {
      for (const t of [...q.stem.filter((p) => p.kind === 'text').map((p) => zh((p as { text: LStr }).text)), ...(q.choices ?? []).map((c) => zh(c.label))]) {
        expect(t, q.id).not.toMatch(/杆|标着|指着|[（）()]/)
      }
    })
  })
})
