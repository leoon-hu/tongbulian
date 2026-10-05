import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'

// 平行四边形和梯形（四上五）的专项检查：答案都从图上的点和线（或题干的参数）重新推一遍。

const SEEDS = 150
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
type Geo = Extract<StemPart, { kind: 'geo' }>
const geoOf = (q: Question): Geo => q.stem.find((p): p is Geo => p.kind === 'geo')!
const textOf = (q: Question): { k: string; p: Record<string, unknown> } => {
  const t = (q.stem.find((p) => p.kind === 'text') as { text: LStr }).text
  return typeof t === 'string' ? { k: t, p: {} } : { k: t.k, p: (t.p ?? {}) as Record<string, unknown> }
}
const answer = (q: Question): string => {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return labelKey(q.choices!.find((c) => c.id === id)!.label)
}
const degAnswer = (q: Question): number => Number(answer(q).replace('°', ''))
const key = (k: string): string => labelKey({ k })

type Line = Extract<GeoItem, { t: 'line' }>
type Poly = Extract<GeoItem, { t: 'poly' }>
type Txt = Extract<GeoItem, { t: 'text' }>
type Dot = Extract<GeoItem, { t: 'dot' }>
const linesOf = (f: GeoFig): Line[] => f.items.filter((it): it is Line => it.t === 'line')
const polysOf = (f: GeoFig): Poly[] => f.items.filter((it): it is Poly => it.t === 'poly')
const textsOf = (f: GeoFig): Txt[] => f.items.filter((it): it is Txt => it.t === 'text')
const dotsOf = (f: GeoFig): Dot[] => f.items.filter((it): it is Dot => it.t === 'dot')
const sub = (a: GeoPt, b: GeoPt): GeoPt => [a[0] - b[0], a[1] - b[1]]
const dist = (a: GeoPt, b: GeoPt): number => Math.hypot(a[0] - b[0], a[1] - b[1])
/** 两个方向的夹角（直线不分正反，0–90） */
function lineAngle(u: GeoPt, v: GeoPt): number {
  const a = (Math.atan2(-u[1], u[0]) * 180) / Math.PI
  const b = (Math.atan2(-v[1], v[0]) * 180) / Math.PI
  const d = (((a - b) % 180) + 180) % 180
  return Math.min(d, 180 - d)
}
const dirOf = (l: Line): GeoPt => sub(l.b, l.a)
type Rel = 'par' | 'perp' | 'cross'
const relOf = (u: GeoPt, v: GeoPt): Rel => {
  const a = lineAngle(u, v)
  return a < 0.5 ? 'par' : Math.abs(a - 90) < 0.5 ? 'perp' : 'cross'
}
const REL_KEY: Record<Rel, string> = { par: 'm4.quad.parallel', perp: 'm4.quad.perp', cross: 'm4.quad.cross' }
/** 点到直线（过 a、b）的距离 */
function pointLine(p: GeoPt, a: GeoPt, b: GeoPt): number {
  const d = sub(b, a)
  return Math.abs(d[0] * (p[1] - a[1]) - d[1] * (p[0] - a[0])) / Math.hypot(d[0], d[1])
}
/** 两条线段在内部相交（不算端点） */
function segCross(a: [GeoPt, GeoPt], b: [GeoPt, GeoPt]): boolean {
  const cr = (o: GeoPt, p: GeoPt, q: GeoPt): number => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
  const d1 = cr(a[0], a[1], b[0])
  const d2 = cr(a[0], a[1], b[1])
  const d3 = cr(b[0], b[1], a[0])
  const d4 = cr(b[0], b[1], a[1])
  return d1 * d2 < 0 && d3 * d4 < 0
}
/** 凸多边形第 i 个顶点的内角 */
function interior(pts: GeoPt[], i: number): number {
  const n = pts.length
  const p = pts[i]!
  const a = sub(pts[(i - 1 + n) % n]!, p)
  const b = sub(pts[(i + 1) % n]!, p)
  const cos = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]))
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}
const edge = (pts: GeoPt[], i: number): GeoPt => sub(pts[(i + 1) % pts.length]!, pts[i]!)
/** 四边形有几组对边平行 */
const parallelPairCount = (pts: GeoPt[]): number => [0, 1].filter((i) => lineAngle(edge(pts, i), edge(pts, i + 2)) < 0.5).length
type Shape = 'tri' | 'para' | 'rect' | 'trap' | 'rtrap' | 'isotrap' | 'plain'
function shapeOf(pts: GeoPt[]): Shape {
  if (pts.length === 3) return 'tri'
  const n = parallelPairCount(pts)
  const right = [0, 1, 2, 3].some((i) => Math.abs(interior(pts, i) - 90) < 0.5)
  if (n === 2) return right ? 'rect' : 'para'
  if (n === 0) return 'plain'
  if (right) return 'rtrap'
  // 一组对边平行：另外两条边（腰）一样长就是等腰梯形
  const legs = lineAngle(edge(pts, 0), edge(pts, 2)) < 0.5 ? [1, 3] : [0, 2]
  const [l1, l2] = legs.map((i) => Math.hypot(...edge(pts, i))) as [number, number]
  return Math.abs(l1 - l2) < 0.6 ? 'isotrap' : 'trap'
}
/** 字母 → 离它最近的线段端点（图上的点） */
function letterPoints(f: GeoFig): Record<string, GeoPt> {
  const ends = linesOf(f).flatMap((l) => [l.a, l.b])
  const out: Record<string, GeoPt> = {}
  for (const t of textsOf(f).filter((x) => x.letter)) out[t.text] = ends.reduce((a, b) => (dist(a, t.at) <= dist(b, t.at) ? a : b))
  return out
}
/** 离文字最近的多边形顶点下标 */
const nearestVertex = (pts: GeoPt[], at: GeoPt): number => pts.map((p) => dist(p, at)).reduce((bi, x, j, arr) => (x < arr[bi]! ? j : bi), 0)
/** 编号（1、2、3）离谁最近 */
const badgeNear = (f: GeoFig, p: GeoPt): string => textsOf(f).filter((t) => t.badge).reduce((a, b) => (dist(a.at, p) <= dist(b.at, p) ? a : b)).text

describe('平行和垂直', () => {
  const KP = 'm4s1-06-parallel'

  it('方格纸上的两条直线：按图上的方向定平行、垂直、相交但不垂直；没画直角记号的垂直线是横竖的，相交但不垂直的离直角远', () => {
    let conv = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('rel-')) return
      const f = geoOf(q).figs[0]!
      const solid = linesOf(f).filter((l) => !l.dash)
      expect(solid).toHaveLength(2)
      const [l1, l2] = solid as [Line, Line]
      const rel = relOf(dirOf(l1), dirOf(l2))
      expect(answer(q)).toBe(key(REL_KEY[rel]))
      const marked = f.items.some((it) => it.t === 'arc' && it.right)
      if (rel === 'perp' && !marked) for (const l of solid) expect(Math.abs(l.a[0] - l.b[0]) < 1e-6 || Math.abs(l.a[1] - l.b[1]) < 1e-6, q.id).toBe(true)
      if (rel === 'cross') expect(lineAngle(dirOf(l1), dirOf(l2)), q.id).toBeLessThanOrEqual(70)
      if (sigOf(q).includes('conv')) {
        conv++
        expect(segCross([l1.a, l1.b], [l2.a, l2.b]), '一头靠近的两条线在图里没相交').toBe(false)
        expect(rel).toBe('cross')
      }
      expect(geoOf(q).alt).not.toMatch(/平行|垂直|相交/)
    })
    expect(conv).toBeGreaterThan(3)
  })

  it('四幅图里挑：只有一幅是要找的关系', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('pickl-')) return
      const target: Rel = textOf(q).k === 'm4.quad.pickParQ' ? 'par' : 'perp'
      const rels = geoOf(q).figs.map((f) => {
        const [l1, l2] = linesOf(f).filter((l) => !l.dash) as [Line, Line]
        return relOf(dirOf(l1), dirOf(l2))
      })
      expect(rels.filter((r) => r === target)).toHaveLength(1)
      expect(Number(answer(q))).toBe(rels.indexOf(target) + 1)
    })
  })

  it('定义、记法与读法、垂足、垂线、判断题', () => {
    const DEF: Record<string, string> = {
      'm4.quad.defParQ': 'm4.quad.parallelLines',
      'm4.quad.defPerpQ': 'm4.quad.perp',
      'm4.quad.defPerpLineQ': 'm4.quad.perpLine',
      'm4.quad.defFootQ': 'm4.quad.foot',
      'm4.quad.defPlaneQ': 'm4.quad.parallel',
    }
    const YES = new Set(['m4.quad.jNoCross', 'm4.quad.jRightPerp', 'm4.quad.jPerpLine'])
    each(KP, (q) => {
      const s = sigOf(q)
      const t = textOf(q)
      if (s.startsWith('def-')) expect(answer(q)).toBe(key(DEF[t.k]!))
      if (s === 'write-par') expect(answer(q)).toBe('a // b')
      if (s === 'write-perp') expect(answer(q)).toBe('a ⊥ b')
      if (s.startsWith('read-')) {
        const sym = textsOf(geoOf(q).figs[0]!)[0]!.text
        expect(answer(q)).toBe(key(sym.includes('//') ? 'm4.quad.readPar' : 'm4.quad.readPerp'))
      }
      if (s.startsWith('foot-')) {
        // 两条直线的交点就是 O
        const f = geoOf(q).figs[0]!
        const [l1, l2] = linesOf(f) as [Line, Line]
        expect(relOf(dirOf(l1), dirOf(l2))).toBe('perp')
        const O = dotsOf(f).find((x) => x.label === 'O')!.at
        expect(pointLine(O, l1.a, l1.b)).toBeLessThan(0.6)
        expect(pointLine(O, l2.a, l2.b)).toBeLessThan(0.6)
        expect(answer(q)).toBe('O')
      }
      if (s.startsWith('perpof-')) expect(answer(q)).toBe(key('m4.quad.perpLine'))
      if (s.startsWith('pj-')) expect(answer(q)).toBe(key(YES.has(t.k) ? 'm4.ang.yes' : 'm4.ang.no'))
      if (s.startsWith('rightall-')) expect(degAnswer(q)).toBe(90)
    })
  })

  it('量得 ∠1 的度数：图按这个度数画，90° 才互相垂直；不出 85°–95° 之间（除了 90°）分不清的', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('meas-')) return
      const deg = Number(textOf(q).p.deg)
      const [l1, l2] = linesOf(geoOf(q).figs[0]!) as [Line, Line]
      const a = lineAngle(dirOf(l1), dirOf(l2))
      expect(Math.abs(a - Math.min(deg, 180 - deg))).toBeLessThan(0.6)
      expect(deg === 90 || Math.abs(deg - 90) >= 7).toBe(true)
      expect(answer(q)).toBe(key(deg === 90 ? 'm4.ang.yes' : 'm4.ang.no'))
    })
  })

  it('图形里的两条线段：按字母找到图上的点，算出是平行、垂直还是相交', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('seg-')) return
      n++
      const P = letterPoints(geoOf(q).figs[0]!)
      const { a, b } = textOf(q).p as { a: string; b: string }
      const u = sub(P[a[1]!]!, P[a[0]!]!)
      const v = sub(P[b[1]!]!, P[b[0]!]!)
      expect(answer(q)).toBe(key(REL_KEY[relOf(u, v)]))
    })
    expect(n).toBeGreaterThan(40)
  })

  it('a // b 时同一个位置上的 ∠1、∠2 一样大（第 3 档）', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('corr-')) return
      const ls = linesOf(geoOf(q).figs[0]!)
      expect(relOf(dirOf(ls[0]!), dirOf(ls[1]!))).toBe('par')
      expect(degAnswer(q)).toBe(Number(textOf(q).p.deg))
    })
  })

  it('第 1 档覆盖例 1 和做一做：两条直线的关系、挑图、定义、记法、垂足、量得的角、图形里的线段', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(sigOf(q).split('-')[0]!)
    })
    for (const k of ['rel', 'pickl', 'def', 'write', 'read', 'meas', 'seg']) expect(seen, k).toContain(k)
    expect([...seen].some((k) => k === 'foot' || k === 'perpof')).toBe(true)
  })
})

describe('点到直线的距离', () => {
  const KP = 'm4s1-06-distance'

  it('从 A 到直线画的几条线段：垂直的那条最短，编号对得上', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('short-')) return
      n++
      const f = geoOf(q).figs[0]!
      const A = dotsOf(f).find((x) => x.label === 'A')!.at
      const segs = linesOf(f).filter((l) => l.thin)
      const lens = segs.map((l) => dist(l.a, l.b))
      const shortest = segs[lens.indexOf(Math.min(...lens))]!
      const foot = dist(shortest.a, A) < 0.6 ? shortest.b : shortest.a
      expect(Math.abs(foot[0] - A[0])).toBeLessThan(0.6) // 垂直：垂足在 A 的正下方
      expect(answer(q)).toBe(badgeNear(f, foot))
    })
    expect(n).toBeGreaterThan(30)
  })

  it('过马路、修路、跳远：三条路线里最短的那条（和对面的边垂直）就是答案', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('route-')) return
      n++
      const f = geoOf(q).figs[0]!
      const routes = linesOf(f).filter((l) => l.stroke === 'b')
      expect(routes).toHaveLength(3)
      const lens = routes.map((l) => dist(l.a, l.b))
      const best = Math.min(...lens)
      for (const x of lens) if (x !== best) expect(x - best).toBeGreaterThan(8)
      const r = routes[lens.indexOf(best)]!
      expect(answer(q)).toBe(badgeNear(f, r.b))
    })
    expect(n).toBeGreaterThan(30)
  })

  it('哪幅图画对了：画垂线的那幅既过 A 又和 l 垂直，画平行线的那幅既过 A 又和 a 平行，别的都差一样', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('pdraw-') && !s.startsWith('pardraw-')) return
      const want: Rel = s.startsWith('pdraw-') ? 'perp' : 'par'
      const good = geoOf(q).figs.map((f) => {
        const [base, drawn] = [linesOf(f).find((l) => !l.stroke)!, linesOf(f).find((l) => l.stroke === 'b')!]
        const A = dotsOf(f)[0]!.at
        return relOf(dirOf(base), dirOf(drawn)) === want && pointLine(A, drawn.a, drawn.b) < 0.6
      })
      expect(good.filter(Boolean)).toHaveLength(1)
      expect(Number(answer(q))).toBe(good.indexOf(true) + 1)
    })
  })

  it('平行线之间的垂直线段：和两条平行线都垂直、一样长', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('pseg-')) return
      const f = geoOf(q).figs[0]!
      const [la, lb] = linesOf(f).filter((l) => !l.stroke) as [Line, Line]
      expect(relOf(dirOf(la), dirOf(lb))).toBe('par')
      const reds = linesOf(f).filter((l) => l.stroke === 'd')
      for (const r of reds) {
        expect(relOf(dirOf(r), dirOf(la))).toBe('perp')
        expect(dist(r.a, r.b)).toBeCloseTo(dist(reds[0]!.a, reds[0]!.b), 5)
      }
      const t = textOf(q)
      if (s.startsWith('pseg-len-')) expect(Number(answer(q))).toBe(Number(t.p.n))
      else expect(answer(q)).toBe(key(t.k === 'm4.quad.parSegDiffQ' ? 'm4.ang.no' : 'm4.ang.yes'))
    })
  })

  it('垂直于同一条直线的两条直线互相平行（图上 a、b 都和 c 垂直）', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('sticks-')) expect(answer(q)).toBe(key('m4.quad.parallel'))
      if (!s.startsWith('twoperp-')) return
      const f = geoOf(q).figs[0]!
      const [c, a, b] = linesOf(f) as [Line, Line, Line]
      expect(relOf(dirOf(a), dirOf(c))).toBe('perp')
      expect(relOf(dirOf(b), dirOf(c))).toBe('perp')
      expect(answer(q)).toBe(key('m4.quad.parallel'))
    })
  })

  it('方格纸上的距离：数出的格数就是 A 到 l 的距离；三条线段里和 l 垂直的那条表示距离', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('gdist-')) return
      n++
      const f = geoOf(q).figs[0]!
      const l = linesOf(f).find((x) => !x.stroke)!
      const aLabel = textsOf(f).find((t) => t.text === 'A')!
      const A = dotsOf(f).reduce((x, y) => (dist(x.at, aLabel.at) <= dist(y.at, aLabel.at) ? x : y)).at
      if (s.startsWith('gdist-seg-')) {
        const blue = linesOf(f).filter((x) => x.stroke === 'b')
        const perp = blue.filter((x) => relOf(dirOf(x), dirOf(l)) === 'perp')
        expect(perp).toHaveLength(1)
        const end = dist(perp[0]!.a, A) < 0.01 ? perp[0]!.b : perp[0]!.a
        const name = textsOf(f).filter((t) => t.letter && t.text !== 'A' && t.text !== 'l').reduce((x, y) => (dist(x.at, end) <= dist(y.at, end) ? x : y)).text
        expect(answer(q)).toBe(`A${name}`)
      } else expect(Number(answer(q))).toBeCloseTo(pointLine(A, l.a, l.b), 5)
    })
    expect(n).toBeGreaterThan(20)
  })

  it('概念、三角尺、画长方形的步骤', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      const t = textOf(q)
      if (s === 'ddef-short') expect(answer(q)).toBe(key('m4.quad.perpSeg'))
      if (s === 'ddef-dist') expect(answer(q)).toBe(key('m4.quad.distWord'))
      if (s === 'rperp-angle') expect(answer(q)).toBe(key('m4.quad.rightAngle'))
      if (s === 'rperp-good') expect(answer(q)).toBe(key('m4.ang.yes'))
      if (s === 'rperp-bad') expect(answer(q)).toBe(key('m4.ang.no'))
      if (s.startsWith('rstep-'))
        expect(answer(q)).toBe(key({ 'm4.quad.rectFirstQ': 'm4.quad.rightAngle', 'm4.quad.rectCompassQ': 'm4.quad.compass', 'm4.quad.rectAdjQ': 'm4.quad.perp', 'm4.quad.rectOppQ': 'm4.quad.parallel' }[t.k]!))
    })
  })

  it('第 1 档覆盖例 2–例 5 与做一做：画垂线、垂直线段最短、过马路、画平行线、平行线间的垂直线段、两条直线都垂直于 c、画长方形', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(sigOf(q).split('-')[0]!)
    })
    for (const k of ['short', 'ddef', 'route', 'pdraw', 'rperp', 'pseg', 'pardraw', 'twoperp', 'rstep']) expect(seen, k).toContain(k)
  })
})

describe('认识平行四边形', () => {
  const KP = 'm4s1-06-parallelogram'

  it('是不是平行四边形、挑平行四边形：按图上的边算两组对边平不平行（长方形也算）', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('ispara-')) {
        const shape = shapeOf(polysOf(geoOf(q).figs[0]!)[0]!.pts)
        expect(answer(q)).toBe(key(shape === 'para' || shape === 'rect' ? 'm4.ang.yes' : 'm4.ang.no'))
      }
      if (s.startsWith('ppick-')) {
        const shapes = geoOf(q).figs.map((f) => shapeOf(polysOf(f)[0]!.pts))
        expect(shapes.filter((x) => x === 'para' || x === 'rect')).toHaveLength(1)
        expect(Number(answer(q))).toBe(shapes.findIndex((x) => x === 'para') + 1)
      }
      if (s === 'pdef') expect(answer(q)).toBe(key('m4.quad.para'))
      if (s === 'ppairs') expect(Number(answer(q))).toBe(2)
    })
  })

  it('对边相等：问的那条边和标着长度的对边一样长', () => {
    const IDX: Record<string, number> = { AB: 0, BC: 1, CD: 2, DA: 3, AD: 3 }
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('psides-') && !s.startsWith('pknow-AD')) return
      const poly = polysOf(geoOf(q).figs[0]!)[0]!
      expect(shapeOf(poly.pts)).toBe('para')
      const i = IDX[String(textOf(q).p.side)]!
      expect(poly.labels![(i + 2) % 4]).toBe(`${answer(q)} cm`)
    })
  })

  it('对角相等、相邻两个角合起来 180°：答案就是图上那个角的度数', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('pang-') && !(s.startsWith('pknow-n'))) return
      n++
      const f = geoOf(q).figs[0]!
      const pts = polysOf(f)[0]!.pts
      const angleOf = (label: string): number => {
        const t = textsOf(f).find((x) => x.text === label)!
        return Math.round(interior(pts, nearestVertex(pts, t.at)))
      }
      const t = textOf(q)
      if (s.startsWith('pang-')) {
        expect(angleOf(String(t.p.known))).toBe(Number(t.p.deg))
        expect(degAnswer(q)).toBe(angleOf(String(t.p.ask)))
      } else {
        // 做一做 3：∠C 标着度数，问 ∠1、∠2、∠3
        const c = textsOf(f).find((x) => x.text.endsWith('°'))!
        expect(Math.round(interior(pts, nearestVertex(pts, c.at)))).toBe(Number(c.text.replace('°', '')))
        expect(degAnswer(q)).toBe(angleOf(String(t.p.n)))
      }
    })
    expect(n).toBeGreaterThan(60)
  })

  it('周长求边：两条邻边的和是周长的一半', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('perim-')) return
      const t = textOf(q)
      expect(Number(answer(q))).toBe(Number(t.p.p) / 2 - Number(t.p.n))
      expect(Number(answer(q))).toBeGreaterThan(0)
    })
  })

  it('交叉的纸条 / 两组平行线围成平行四边形；把 D 移到哪个点成平行四边形；遮住一部分的四边形', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('overp-')) {
        const red = polysOf(geoOf(q).figs[0]!).find((p) => p.fill === 'd')!
        expect(shapeOf(red.pts)).toMatch(/^(para|rect)$/)
        expect(answer(q)).toBe(key('m4.quad.para'))
      }
      if (s.startsWith('gfix-')) {
        const f = geoOf(q).figs[0]!
        const [A, B, C, D] = polysOf(f)[0]!.pts as [GeoPt, GeoPt, GeoPt, GeoPt]
        expect(shapeOf([A, B, C, D])).not.toBe('para')
        const want: GeoPt = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]]
        const label = textsOf(f).find((t) => t.text === answer(q))!
        const dot = dotsOf(f).reduce((x, y) => (dist(x.at, label.at) <= dist(y.at, label.at) ? x : y))
        expect(dist(dot.at, want)).toBeLessThan(1e-6)
        expect(shapeOf([A, B, C, dot.at])).toBe('para')
      }
      if (s.startsWith('cover-')) expect(answer(q)).toBe(key('m4.quad.coverBoth'))
      if (s.startsWith('special-')) {
        const k = textOf(q).k
        const want = k === 'm4.quad.paraRightQ' ? 'm4.quad.rect' : k === 'm4.quad.jRectPara' || k === 'm4.quad.jSquareRect' ? 'm4.ang.yes' : 'm4.ang.no'
        expect(answer(q)).toBe(key(want))
      }
    })
  })

  it('第 1 档覆盖定义、例 6 与做一做：是不是 / 挑平行四边形、对边相等、对角相等与相邻两个角、做一做 3', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(sigOf(q).split('-')[0]!)
    })
    for (const k of ['ispara', 'ppick', 'psides', 'pang', 'pknow', 'pprop', 'perim']) expect(seen, k).toContain(k)
    expect([...seen].some((k) => k === 'pdef' || k === 'ppairs')).toBe(true)
  })
})

describe('认识梯形', () => {
  const KP = 'm4s1-06-trapezoid'

  it('上底、下底、腰：红色的那条边在梯形上的位置定名称', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('parts-')) return
      const f = geoOf(q).figs[0]!
      const pts = polysOf(f)[0]!.pts
      expect(shapeOf(pts)).toMatch(/trap/)
      const red = linesOf(f).find((l) => l.stroke === 'd')!
      const top = Math.min(...pts.map((p) => p[1]))
      const bottom = Math.max(...pts.map((p) => p[1]))
      const part = Math.abs(red.a[1] - red.b[1]) > 1e-6 ? 'leg' : Math.abs(red.a[1] - top) < 1e-6 ? 'top' : 'bottom'
      expect(Math.abs(red.a[1] - top) < 1e-6 || Math.abs(red.a[1] - bottom) < 1e-6 || part === 'leg').toBe(true)
      expect(answer(q)).toBe(key(`m4.quad.${part}`))
    })
  })

  it('等腰梯形、直角梯形还是都不是：按图上的边和角算；一般的梯形两条腰都明显斜着、斜得也不一样', () => {
    let plain = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('tkind-')) return
      const pts = polysOf(geoOf(q).figs[0]!)[0]!.pts
      const shape = shapeOf(pts)
      expect(answer(q)).toBe(key({ isotrap: 'm4.quad.isoTrap', rtrap: 'm4.quad.rightTrap', trap: 'm4.quad.neither' }[shape as 'isotrap' | 'rtrap' | 'trap']!))
      if (shape === 'trap') {
        plain++
        const angs = [0, 1, 2, 3].map((i) => interior(pts, i))
        for (const a of angs) expect(Math.abs(a - 90), q.id).toBeGreaterThan(15)
        // 下底的两个角差得多（不像等腰梯形）
        const sorted = angs.filter((a) => a < 90).sort((x, y) => x - y)
        expect(sorted[1]! - sorted[0]!).toBeGreaterThan(10)
      }
    })
    expect(plain).toBeGreaterThan(10)
  })

  it('等腰梯形同一条底上的两个角相等；挑梯形；定义与判断题', () => {
    const YES = new Set(['m4.quad.jTwoTrapPara', 'm4.quad.jTwoRightTrapRect', 'm4.quad.jIsoLegs'])
    each(KP, (q) => {
      const s = sigOf(q)
      const t = textOf(q)
      if (s.startsWith('isoang-')) {
        const pts = polysOf(geoOf(q).figs[0]!)[0]!.pts
        expect(shapeOf(pts)).toBe('isotrap')
        expect(Math.round(interior(pts, 3))).toBe(Number(t.p.deg))
        expect(degAnswer(q)).toBe(Math.round(interior(pts, 2)))
      }
      if (s.startsWith('tpick-')) {
        const shapes = geoOf(q).figs.map((f) => shapeOf(polysOf(f)[0]!.pts))
        const traps = shapes.map((x) => /trap/.test(x))
        expect(traps.filter(Boolean)).toHaveLength(1)
        expect(Number(answer(q))).toBe(traps.indexOf(true) + 1)
      }
      if (s === 'tdef') expect(answer(q)).toBe(key('m4.quad.trap'))
      if (s === 'tpairs') expect(Number(answer(q))).toBe(1)
      if (s === 'tdef-right') expect(answer(q)).toBe(key('m4.quad.rightTrap'))
      if (s === 'tdef-iso') expect(answer(q)).toBe(key('m4.quad.isoTrap'))
      if (s.startsWith('tj-')) expect(answer(q)).toBe(key(YES.has(t.k) ? 'm4.ang.yes' : 'm4.ang.no'))
      if (s === 'qclass-one') expect(answer(q)).toBe(key('m4.quad.trap'))
      if (s === 'qclass-none') expect(answer(q)).toBe(key('m4.ang.no'))
    })
  })

  it('数梯形：两条平行线之间 n 条两两不平行、不交叉的线段，每两条围成一个梯形', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('tcount-')) return
      const ls = linesOf(geoOf(q).figs[0]!)
      const segs = ls.filter((l) => Math.abs(l.a[1] - l.b[1]) > 1e-6)
      const n = segs.length
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          expect(lineAngle(dirOf(segs[i]!), dirOf(segs[j]!))).toBeGreaterThan(5)
          expect(segCross([segs[i]!.a, segs[i]!.b], [segs[j]!.a, segs[j]!.b])).toBe(false)
        }
      expect(Number(answer(q))).toBe((n * (n - 1)) / 2)
    })
  })

  it('点 A 移动围成的图形、三角形和长方形纸条重叠的部分、剪下平行四边形后剩下的部分', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('move-')) {
        const shape = shapeOf(polysOf(geoOf(q).figs[0]!)[0]!.pts)
        const want = { tri: 'm4.quad.tri', para: 'm4.quad.para', rtrap: 'm4.quad.rightTrap', trap: 'm4.quad.trap', isotrap: 'm4.quad.trap' }[shape as 'tri']
        expect(answer(q)).toBe(key(want))
      }
      if (s.startsWith('overt-')) {
        const red = polysOf(geoOf(q).figs[0]!).find((p) => p.fill === 'd')!
        expect(shapeOf(red.pts)).toMatch(/trap/)
        expect(answer(q)).toBe(key('m4.quad.trap'))
      }
      if (s.startsWith('tcut-')) {
        const f = geoOf(q).figs[0]!
        const [A, B, C, D] = polysOf(f)[0]!.pts as [GeoPt, GeoPt, GeoPt, GeoPt]
        const cut = linesOf(f)[0]!
        const E = dist(cut.a, B) < 1e-6 ? cut.b : cut.a
        expect(shapeOf([A, B, E, D])).toBe('para')
        expect(shapeOf([B, C, E])).toBe('tri')
        expect(answer(q)).toBe(key('m4.quad.tri'))
      }
    })
  })

  it('在平行四边形里画一条线段：分出直角梯形的那幅是过顶点的垂线；剪成两个梯形的那幅连着上下两边、和腰不平行', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('cutp-')) return
      n++
      const right = s.startsWith('cutp-r')
      const ok = geoOf(q).figs.map((f) => {
        const pts = polysOf(f)[0]!.pts
        const cut = linesOf(f)[0]!
        const isVertex = (p: GeoPt): boolean => pts.some((v) => dist(v, p) < 1e-6)
        const legDir = sub(pts[0]!, pts[3]!)
        const top = Math.min(...pts.map((p) => p[1]))
        const bottom = Math.max(...pts.map((p) => p[1]))
        const spans = Math.abs(Math.abs(cut.a[1] - cut.b[1]) - (bottom - top)) < 1e-6
        if (right) return isVertex(cut.a) && !isVertex(cut.b) && Math.abs(cut.a[0] - cut.b[0]) < 1e-6
        return spans && !isVertex(cut.a) && !isVertex(cut.b) && lineAngle(dirOf(cut), legDir) > 5
      })
      expect(ok.filter(Boolean), q.id).toHaveLength(1)
      expect(Number(answer(q))).toBe(ok.indexOf(true) + 1)
    })
    expect(n).toBeGreaterThan(20)
  })

  it('第 1 档覆盖梯形的定义、各部分名称、例 7、例 8 与做一做：等腰 / 直角梯形、数梯形、挑梯形、分出直角梯形', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(sigOf(q).split('-')[0]!)
    })
    for (const k of ['parts', 'tkind', 'isoang', 'tcount', 'tpick', 'cutp', 'qclass']) expect(seen, k).toContain(k)
    expect([...seen].some((k) => k === 'tdef' || k === 'tpairs')).toBe(true)
  })
})
