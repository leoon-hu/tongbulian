import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'

// 三角形（四下五）的专项检查：答案都从题目本身（图上的点和线、题干的参数）重新推一遍。

const SEEDS = 150
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
const kind = (q: Question): string => sigOf(q).split('-')[0]!
type Geo = Extract<StemPart, { kind: 'geo' }>
const geoOf = (q: Question): Geo | undefined => q.stem.find((p): p is Geo => p.kind === 'geo')
const textOf = (q: Question): { k: string; p: Record<string, unknown> } => {
  const t = (q.stem.find((p) => p.kind === 'text') as { text: LStr }).text
  return typeof t === 'string' ? { k: t, p: {} } : { k: t.k, p: (t.p ?? {}) as Record<string, unknown> }
}
const answerLabel = (q: Question): LStr => q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : labelKey(answerLabel(q)))
const degAnswer = (q: Question): number => Number(answer(q).replace('°', ''))
const key = (k: string): string => labelKey({ k })
const zh = (l: LStr): string => translate(l, 'zh')
const num = (v: unknown): number => Number(v)

type Poly = Extract<GeoItem, { t: 'poly' }>
type Line = Extract<GeoItem, { t: 'line' }>
type Txt = Extract<GeoItem, { t: 'text' }>
type Arc = Extract<GeoItem, { t: 'arc' }>
const polys = (f: GeoFig): Poly[] => f.items.filter((it): it is Poly => it.t === 'poly')
const lines = (f: GeoFig): Line[] => f.items.filter((it): it is Line => it.t === 'line')
const texts = (f: GeoFig): Txt[] => f.items.filter((it): it is Txt => it.t === 'text')
const arcs = (f: GeoFig): Arc[] => f.items.filter((it): it is Arc => it.t === 'arc')
const sub = (a: GeoPt, b: GeoPt): GeoPt => [a[0] - b[0], a[1] - b[1]]
const dist = (a: GeoPt, b: GeoPt): number => Math.hypot(a[0] - b[0], a[1] - b[1])
const same = (a: GeoPt, b: GeoPt): boolean => dist(a, b) < 0.5
const dot = (a: GeoPt, b: GeoPt): number => a[0] * b[0] + a[1] * b[1]
/** 第 i 个顶点的内角 */
function corner(pts: GeoPt[], i: number): number {
  const n = pts.length
  const a = sub(pts[(i - 1 + n) % n]!, pts[i]!)
  const b = sub(pts[(i + 1) % n]!, pts[i]!)
  return (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (Math.hypot(...a) * Math.hypot(...b))))) * 180) / Math.PI
}
/** p 在线段 ab 上的位置（0–1），离线段多远 */
function onSeg(p: GeoPt, a: GeoPt, b: GeoPt): { t: number; off: number } {
  const ab = sub(b, a)
  const t = dot(sub(p, a), ab) / dot(ab, ab)
  const f: GeoPt = [a[0] + ab[0] * t, a[1] + ab[1] * t]
  return { t, off: dist(f, p) }
}
/** 离 p 最近的字母 */
const letterNear = (f: GeoFig, p: GeoPt): string => texts(f).filter((t) => t.letter).sort((a, b) => dist(a.at, p) - dist(b.at, p))[0]!.text
const shoelace = (pts: GeoPt[]): number => Math.abs(pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length]![1] - pts[(i + 1) % pts.length]![0] * p[1], 0)) / 2

/** 一幅图是不是「由 3 条线段围成的图形」：只有一个封闭的、三个顶点的多边形 */
const isTriangleFig = (f: GeoFig): boolean => f.items.length === 1 && f.items[0]!.t === 'poly' && !f.items[0]!.open && f.items[0]!.pts.length === 3

describe('三角形的特性（m4s2-05-traits）', () => {
  const KP = 'm4s2-05-traits'
  it('边、角、顶点都是 3 个；一个三角形能画 3 条高；3 根同样长的小棒只能围出 1 种三角形', () => {
    each(KP, (q) => {
      if (kind(q) === 'count' || kind(q) === 'hcount') expect(answer(q), q.id).toBe('3')
      if (sigOf(q) === 'st-onekind') expect(answer(q)).toBe('1')
    })
  })

  it('哪个是三角形 / 哪个不是：答案那幅正好是（不是）三条线段首尾相连围成的，别的都相反', () => {
    each(KP, (q) => {
      if (kind(q) !== 'istri' && kind(q) !== 'nottri') return
      const figs = geoOf(q)!.figs
      const tri = figs.map(isTriangleFig)
      const want = kind(q) === 'istri'
      expect(tri.filter((x) => x === want).length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(String(tri.indexOf(want) + 1))
      expect(geoOf(q)!.numbered).toBe(true)
    })
  })

  it('画了高的三角形：红色虚线从一个顶点垂直画到对边上（垂足在边上、画着直角记号），问什么答什么', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'hname') return
      n++
      const f = geoOf(q)!.figs[0]!
      const tri = polys(f)[0]!.pts
      const h = lines(f).find((l) => l.dash && l.stroke === 'd')!
      const v = tri.findIndex((p) => same(p, h.a))
      expect(v, q.id).toBeGreaterThanOrEqual(0)
      const P = tri[(v + 1) % 3]!
      const Q = tri[(v + 2) % 3]!
      const s = onSeg(h.b, P, Q)
      expect(s.off, q.id).toBeLessThan(0.5)
      expect(s.t > 0.03 && s.t < 0.97, `${q.id} 高要画在三角形里面`).toBe(true)
      expect(Math.abs(dot(sub(h.a, h.b), sub(Q, P))) / (dist(h.a, h.b) * dist(P, Q)), q.id).toBeLessThan(0.01)
      expect(arcs(f).some((a) => a.right && same(a.at, h.b)), `${q.id} 垂足画直角记号`).toBe(true)
      const V = letterNear(f, tri[v]!)
      const side = [letterNear(f, P), letterNear(f, Q)].sort().join('')
      const ask = sigOf(q).split('-')[1]
      if (ask === 'what') expect(answer(q)).toBe(key('m4.tri.height'))
      if (ask === 'base') {
        expect(answer(q)).toBe(key('m4.tri.base'))
        expect(textOf(q).p).toMatchObject({ v: V, s: side })
      }
      if (ask === 'from') expect(answer(q), q.id).toBe(V)
      if (ask === 'on') expect(answer(q), q.id).toBe(side)
    })
    expect(n).toBeGreaterThan(30)
  })

  it('哪幅图中的虚线是红色底上的高：只有一幅是从对着的顶点垂直画到底上的，答案就是它', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'pick') return
      n++
      const figs = geoOf(q)!.figs
      expect(figs.length).toBe(3)
      const ok = figs.map((f) => {
        const tri = polys(f)[0]!.pts
        const base = lines(f).find((l) => l.stroke === 'd' && !l.dash)!
        const dashed = lines(f).filter((l) => l.dash)
        expect(dashed.length, q.id).toBe(1)
        const dl = dashed[0]!
        const V = tri.find((p) => !same(p, base.a) && !same(p, base.b))!
        const s = onSeg(dl.b, base.a, base.b)
        const perp = Math.abs(dot(sub(dl.a, dl.b), sub(base.b, base.a))) / (dist(dl.a, dl.b) * dist(base.a, base.b)) < 0.01
        return same(dl.a, V) && s.off < 0.5 && s.t > 0 && s.t < 1 && perp
      })
      expect(ok.filter(Boolean).length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(String(ok.indexOf(true) + 1))
    })
    expect(n).toBeGreaterThan(50)
  })

  it('对边、三角形的记法：按图上的字母推出答案', () => {
    each(KP, (q) => {
      if (kind(q) === 'opp') {
        const v = textOf(q).p.v as string
        expect(answer(q), q.id).toBe(['A', 'B', 'C'].filter((x) => x !== v).join(''))
      }
      if (kind(q) === 'name') {
        const f = geoOf(q)!.figs[0]!
        const letters = texts(f)
          .filter((t) => t.letter)
          .map((t) => t.text)
          .sort()
          .join('')
        expect(zh(answerLabel(q)), q.id).toBe(`三角形${letters}`)
      }
    })
  })

  it('稳定性：拉不动的是三角形框架、更牢固的是钉成三角形的篱笆、不容易变形的框架是三角形', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s === 'st-pull') expect(answer(q)).toBe(key('m4.tri.triFrame'))
      if (s === 'st-prop') expect(answer(q)).toBe(key('m4.tri.stability'))
      if (s.startsWith('st-use-')) expect(answer(q), q.id).toMatch(/m4\.tri\.use\.(ac|crane|pole|bike|roof)/)
      if (s.startsWith('st-fence-')) {
        // 斜着钉的那一幅有斜线
        const figs = geoOf(q)!.figs
        const slanted = figs.map((f) => lines(f).some((l) => Math.abs(l.a[0] - l.b[0]) > 1 && Math.abs(l.a[1] - l.b[1]) > 1))
        expect(answer(q), q.id).toBe(String(slanted.indexOf(true) + 1))
      }
      if (s.startsWith('st-frame-')) {
        const figs = geoOf(q)!.figs
        const three = figs.map((f) => polys(f)[0]!.pts.length === 3)
        expect(answer(q), q.id).toBe(String(three.indexOf(true) + 1))
      }
    })
  })

  it('判断题按词条定对错', () => {
    const truth: Record<string, boolean> = {
      'm4.tri.j.parts': true,
      'm4.tri.j.oneHeight': false,
      'm4.tri.j.threeSegs': false,
      'm4.tri.j.heightDef': true,
      'm4.tri.j.quadStable': false,
      'm4.tri.j.heightUpright': false,
    }
    each(KP, (q) => {
      if (kind(q) !== 'j') return
      expect(answer(q)).toBe(key(truth[textOf(q).k]! ? 'm4.ang.yes' : 'm4.ang.no'))
    })
  })

  it('第 1 档覆盖例 1、例 2 与做一做：边角顶点、认三角形、定义、高和底、垂足、指定底上的高、几条高、对边、三角形 ABC、稳定性', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(kind(q))
    })
    for (const k of ['count', 'istri', 'def', 'hname', 'foot', 'pick', 'hcount', 'opp', 'name', 'st']) expect(seen, k).toContain(k)
  })
})

describe('三角形的三边关系（m4s2-05-sides）', () => {
  const KP = 'm4s2-05-sides'
  const can = (s: number[]): boolean => {
    const [a, b, c] = [...s].sort((x, y) => x - y)
    return a! + b! > c!
  }
  it('走哪条路最近：直的那条路上的编号', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'route') return
      n++
      const f = geoOf(q)!.figs[0]!
      const straight = lines(f).filter((l) => l.stroke === 'b')
      expect(straight.length, q.id).toBe(1)
      const badges = texts(f).filter((t) => t.badge)
      expect(badges.length).toBe(3)
      const onLine = badges.filter((b) => onSeg(b.at, straight[0]!.a, straight[0]!.b).off < 1)
      expect(onLine.length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(onLine[0]!.text)
    })
    expect(n).toBeGreaterThan(20)
  })

  it('3 根小棒能不能围成三角形：两根短的和大于最长的才能（等于也不能）；图上的小棒按比例画、标着长度', () => {
    let eq = 0
    each(KP, (q, d) => {
      if (kind(q) !== 'can') return
      const { a, b, c } = textOf(q).p
      const s = [num(a), num(b), num(c)]
      expect(answer(q), q.id).toBe(key(can(s) ? 'm4.tri.can' : 'm4.tri.cannot'))
      const sorted = [...s].sort((x, y) => x - y)
      if (sorted[0]! + sorted[1]! === sorted[2]!) eq++
      const g = geoOf(q)
      if (d === 1) expect(g, q.id).toBeDefined()
      if (g) {
        const f = g.figs[0]!
        const ws = polys(f).map((p) => p.pts[1]![0] - p.pts[0]![0])
        expect(texts(f).map((t) => Number(t.text)), q.id).toEqual(s)
        s.forEach((L, i) => expect(ws[i]! / L, q.id).toBeCloseTo(ws[0]! / s[0]!, 5))
      }
    })
    expect(eq, '两根的和正好等于第三根的要常出').toBeGreaterThan(20)
  })

  it('哪一组能（不能）围成：只有答案那组符合', () => {
    each(KP, (q) => {
      if (kind(q) !== 'group') return
      const want = textOf(q).k === 'm4.tri.pickCanQ'
      const ok = q.choices!.map((c) => {
        const p = (c.label as unknown as { p: Record<string, number> }).p
        return can([p.a!, p.b!, p.c!]) === want
      })
      expect(ok.filter(Boolean).length, q.id).toBe(1)
      expect(q.choices![ok.indexOf(true)]!.id).toBe((q.answer as { choiceId: string }).choiceId)
    })
  })

  it('第三条边可能是几厘米、最多是几厘米', () => {
    each(KP, (q) => {
      const { a, b } = textOf(q).p
      if (kind(q) === 'third') {
        const fits = q.choices!.map((c) => {
          const n = Number((c.label as unknown as { p: { n: number } }).p.n)
          return n > Math.abs(num(a) - num(b)) && n < num(a) + num(b)
        })
        expect(fits.filter(Boolean).length, q.id).toBe(1)
        expect(q.choices![fits.indexOf(true)]!.id).toBe((q.answer as { choiceId: string }).choiceId)
      }
      if (kind(q) === 'max') expect(answer(q), q.id).toBe(String(num(a) + num(b) - 1))
    })
  })

  it('6 根小棒能围出几种三角形：按图上的长度逐个组合数一遍（课本 2、2、5、6、6、6 是 4 种）', () => {
    let book = 0
    each(KP, (q) => {
      if (kind(q) !== 'kinds') return
      const sticks = texts(geoOf(q)!.figs[0]!).map((t) => Number(t.text))
      expect(sticks.length).toBe(textOf(q).p.n)
      const set = new Set<string>()
      for (let i = 0; i < sticks.length; i++)
        for (let j = i + 1; j < sticks.length; j++)
          for (let k = j + 1; k < sticks.length; k++) {
            const s = [sticks[i]!, sticks[j]!, sticks[k]!].sort((x, y) => x - y)
            if (can(s)) set.add(s.join())
          }
      expect(answer(q), q.id).toBe(String(set.size))
      if (sticks.join() === '2,2,5,6,6,6') {
        book++
        expect(answer(q)).toBe('4')
      }
    })
    expect(book).toBeGreaterThan(0)
  })

  it('定义与判断', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s === 'short') expect(answer(q)).toBe(key('m4.tri.segment'))
      if (s === 'dist') expect(answer(q)).toBe(key('m4.tri.distWord'))
      if (s === 'rule') expect(answer(q)).toBe(key('m4.tri.gt'))
      if (kind(q) === 'j') expect(answer(q)).toBe(key(textOf(q).k === 'm4.tri.j.rule' ? 'm4.ang.yes' : 'm4.ang.no'))
    })
  })

  it('第 1 档覆盖例 3、例 4：走哪条路最近、线段最短、两点间的距离、任意两边的和大于第三边、几组小棒能不能围成', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(kind(q))
    })
    for (const k of ['route', 'short', 'dist', 'rule', 'can', 'group']) expect(seen, k).toContain(k)
  })
})

describe('三角形的分类（m4s2-05-kinds）', () => {
  const KP = 'm4s2-05-kinds'
  const KIND_KEY = (angles: number[]): string => {
    const m = Math.max(...angles)
    return key(m < 89.5 ? 'm4.tri.acute' : m < 90.5 ? 'm4.tri.right' : 'm4.tri.obtuse')
  }
  it('看图按角分：按图上量出来的角定答案；第 1 档锐角三角形最大的角不超过 80°、钝角至少 105°，直角都画着记号', () => {
    each(KP, (q, d) => {
      if (kind(q) !== 'fig') return
      const f = geoOf(q)!.figs[0]!
      const tri = polys(f)[0]!.pts
      const angles = [0, 1, 2].map((i) => corner(tri, i))
      expect(answer(q), q.id).toBe(KIND_KEY(angles))
      const m = Math.max(...angles)
      if (d === 1) expect(m < 80.5 || Math.abs(m - 90) < 0.5 || m > 104.5, q.id).toBe(true)
      if (Math.abs(m - 90) < 0.5) {
        const r = angles.findIndex((a) => Math.abs(a - 90) < 0.5)
        const marked = arcs(f).some((a) => a.right && same(a.at, tri[r]!))
        // 不画记号的直角，两条直角边一定一横一竖
        if (!marked) {
          const a = sub(tri[(r + 1) % 3]!, tri[r]!)
          const b = sub(tri[(r + 2) % 3]!, tri[r]!)
          expect(Math.min(Math.abs(a[0]), Math.abs(a[1])) < 0.5 && Math.min(Math.abs(b[0]), Math.abs(b[1])) < 0.5, q.id).toBe(true)
          expect(d, q.id).toBeGreaterThan(1)
        }
      }
    })
  })

  it('三个角的度数、两个角说种类：度数和是 180°', () => {
    each(KP, (q) => {
      if (kind(q) !== 'deg') return
      const { a, b, c } = textOf(q).p
      expect(num(a) + num(b) + num(c)).toBe(180)
      expect(answer(q), q.id).toBe(KIND_KEY([num(a), num(b), num(c)]))
    })
  })

  it('分一分：三幅图锐角、直角、钝角三角形各一个，答案那幅就是要找的那种', () => {
    each(KP, (q) => {
      if (kind(q) !== 'pk') return
      const want = key(((textOf(q).p.kind as { k: string }).k))
      const kinds = geoOf(q)!.figs.map((f) => {
        const tri = polys(f)[0]!.pts
        return KIND_KEY([0, 1, 2].map((i) => corner(tri, i)))
      })
      expect(new Set(kinds).size, q.id).toBe(3)
      expect(answer(q), q.id).toBe(String(kinds.indexOf(want) + 1))
    })
  })

  it('等腰三角形各部分的名称：红边是两条相等的边之一就是腰、否则是底；问号在两腰的夹角里是顶角、否则是底角', () => {
    each(KP, (q) => {
      if (kind(q) !== 'iso') return
      const f = geoOf(q)!.figs[0]!
      const tri = polys(f)[0]!.pts
      const sides = [0, 1, 2].map((i) => dist(tri[i]!, tri[(i + 1) % 3]!))
      // 两条相等的边交于顶点（顶角）
      const eq = [0, 1, 2].filter((i) => Math.abs(sides[i]! - sides[(i + 2) % 3]!) < 0.5)
      expect(eq.length, `${q.id} 是等腰（不是等边）三角形`).toBe(1)
      const apex = eq[0]!
      const red = lines(f).find((l) => l.stroke === 'd')
      if (red) {
        const isLeg = same(red.a, tri[apex]!) || same(red.b, tri[apex]!)
        expect(answer(q), q.id).toBe(key(isLeg ? 'm4.tri.leg' : 'm4.tri.base'))
      } else {
        const mark = texts(f).find((t) => t.text === '?')!
        const near = [0, 1, 2].sort((x, y) => dist(tri[x]!, mark.at) - dist(tri[y]!, mark.at))[0]!
        expect(answer(q), q.id).toBe(key(near === apex ? 'm4.tri.apex' : 'm4.tri.baseAngle'))
      }
    })
  })

  it('三条边的长度：两条相等是等腰、三条都相等是等边（这时选项里没有「等腰」「锐角」）', () => {
    each(KP, (q) => {
      if (kind(q) !== 'sides') return
      const { a, b, c } = textOf(q).p
      const s = [num(a), num(b), num(c)]
      expect(can(s), q.id).toBe(true)
      const equi = s[0] === s[1] && s[1] === s[2]
      expect(answer(q), q.id).toBe(key(equi ? 'm4.tri.equi' : 'm4.tri.iso'))
      const opts = q.choices!.map((c2) => labelKey(c2.label))
      if (equi) for (const k of ['m4.tri.iso', 'm4.tri.acute']) expect(opts).not.toContain(key(k))
    })
    function can(s: number[]): boolean {
      const [x, y, z] = [...s].sort((p, r) => p - r)
      return x! + y! > z!
    }
  })

  it('定义、描述、猜一猜、最多最少、判断', () => {
    const DEF: Record<string, string> = {
      'm4.tri.defAcuteQ': 'm4.tri.acute',
      'm4.tri.defRightQ': 'm4.tri.right',
      'm4.tri.defObtuseQ': 'm4.tri.obtuse',
      'm4.tri.defIsoQ': 'm4.tri.iso',
      'm4.tri.defEquiQ': 'm4.tri.equi',
      'm4.tri.equiAlsoQ': 'm4.tri.regular',
      'm4.tri.defLegQ': 'm4.tri.leg',
      'm4.tri.defApexQ': 'm4.tri.apex',
      'm4.tri.defBaseAngleQ': 'm4.tri.baseAngle',
      'm4.tri.desc.isoRight': 'm4.tri.isoRight',
      'm4.tri.desc.twoAcute': 'm4.tri.obtuse',
      'm4.tri.desc.threeEq': 'm4.tri.equi',
      'm4.tri.desc.noRightObtuse': 'm4.tri.acute',
      'm4.tri.guessQ': 'm4.tri.acuteOrRight',
      'm4.tri.guessTwoQ': 'm4.tri.anyKind',
    }
    const NUM: Record<string, number> = { 'm4.tri.mostRightQ': 1, 'm4.tri.mostObtuseQ': 1, 'm4.tri.leastAcuteQ': 2 }
    const J: Record<string, boolean> = { 'm4.tri.j.equiIsIso': true, 'm4.tri.j.isoIsEqui': false, 'm4.tri.j.isoBaseEq': true, 'm4.tri.j.equiAnglesEq': true, 'm4.tri.j.isoTopEq': false }
    each(KP, (q) => {
      const k = textOf(q).k
      if (DEF[k]) expect(answer(q), q.id).toBe(key(DEF[k]!))
      if (NUM[k] !== undefined) expect(answer(q), q.id).toBe(String(NUM[k]))
      if (J[k] !== undefined) expect(answer(q), q.id).toBe(key(J[k] ? 'm4.ang.yes' : 'm4.ang.no'))
    })
  })

  it('第 1 档覆盖例 5：看图分、看度数分、三种定义、分一分、等腰三角形各部分、等腰 / 等边的定义、按边长认、等边也是等腰', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(kind(q))
    })
    for (const k of ['fig', 'deg', 'defa', 'pk', 'iso', 'defs', 'sides', 'ei']) expect(seen, k).toContain(k)
  })
})

describe('三角形的内角和（m4s2-05-angle-sum）', () => {
  const KP = 'm4s2-05-angle-sum'
  it('已知两个角求第三个：答案 = 180° − 两个角；图上写的度数就是图上的角，标问号的角量出来就是答案', () => {
    let book = 0
    each(KP, (q) => {
      if (kind(q) !== 'third') return
      const p = textOf(q).p
      const f = geoOf(q)!.figs[0]!
      const tri = polys(f)[0]!.pts
      const angles = [0, 1, 2].map((i) => corner(tri, i))
      const v = degAnswer(q)
      if (textOf(q).k === 'm4.tri.thirdRightQ') expect(v, q.id).toBe(90 - num(p.a))
      else expect(v, q.id).toBe(180 - num(p.a) - num(p.b))
      const labels = texts(f)
      for (const t of labels) {
        const at = [0, 1, 2].sort((x, y) => dist(tri[x]!, t.at) - dist(tri[y]!, t.at))[0]!
        const want = t.text === '?' ? v : Number(t.text.replace('°', ''))
        expect(angles[at]!, `${q.id} ${t.text}`).toBeCloseTo(want, 0)
      }
      // 直角画直角记号
      for (let i = 0; i < 3; i++) if (Math.abs(angles[i]! - 90) < 0.5 && !labels.some((t) => t.text === '?' && dist(t.at, tri[i]!) < 70)) expect(arcs(f).some((a) => a.right && same(a.at, tri[i]!)), q.id).toBe(true)
      if (/^third-(65\.37\.78|90\.30\.60|25\.135\.20)-/.test(sigOf(q))) book++
    })
    expect(book, '练习十六 1 的三个三角形').toBeGreaterThan(0)
  })

  it('∠1、∠2、∠3：题目里的两个角对得上图上编号的角，答案是第三个', () => {
    let book = 0
    each(KP, (q) => {
      if (kind(q) !== 'num') return
      const { a, da, b, db, c } = textOf(q).p
      const f = geoOf(q)!.figs[0]!
      const tri = polys(f)[0]!.pts
      const angleOf = (name: unknown): number => {
        const t = texts(f).find((x) => x.text === String(name))!
        const at = [0, 1, 2].sort((x, y) => dist(tri[x]!, t.at) - dist(tri[y]!, t.at))[0]!
        return corner(tri, at)
      }
      expect(angleOf(a), q.id).toBeCloseTo(num(da), 0)
      expect(angleOf(b), q.id).toBeCloseTo(num(db), 0)
      expect(angleOf(c), q.id).toBeCloseTo(degAnswer(q), 0)
      expect(degAnswer(q)).toBe(180 - num(da) - num(db))
      if (a === '1' && da === 140 && b === '3' && db === 25 && c === '2') book++
    })
    expect(book, '做一做 1：∠1 = 140°，∠3 = 25°').toBeGreaterThan(0)
  })

  it('直角三角形、等腰三角形、等边三角形、∠1 + ∠2、两个角说种类、剪开和撕拼', () => {
    each(KP, (q) => {
      const p = textOf(q).p
      const k = textOf(q).k
      if (k === 'm4.tri.sumQ' || sigOf(q) === 'cut') expect(degAnswer(q), q.id).toBe(180)
      if (k === 'm4.tri.rightAcuteQ') expect(degAnswer(q), q.id).toBe(90 - num(p.a))
      if (k === 'm4.tri.isoBaseQ') expect(degAnswer(q) * 2 + num(p.a), q.id).toBe(180)
      if (k === 'm4.tri.isoTopQ' || k === 'm4.tri.kiteQ') expect(degAnswer(q) + 2 * num(p.a), q.id).toBe(180)
      if (k === 'm4.tri.equiQ') expect(degAnswer(q)).toBe(60)
      if (k === 'm4.tri.sumTwoQ') expect(degAnswer(q), q.id).toBe(180 - num(p.s))
      if (k === 'm4.tri.tearQ') expect(answer(q)).toBe(key('m4.ang.straight'))
      if (k === 'm4.tri.kindTwoQ') {
        const third = 180 - num(p.a) - num(p.b)
        expect(num(p.a) < 90 && num(p.b) < 90, q.id).toBe(true)
        const m = Math.max(num(p.a), num(p.b), third)
        expect(answer(q), q.id).toBe(key(m < 90 ? 'm4.tri.acute' : m === 90 ? 'm4.tri.right' : 'm4.tri.obtuse'))
      }
      if (k === 'm4.tri.rightPairQ') {
        const sums = q.choices!.map((c) => {
          const pp = (c.label as unknown as { p: { a: number; b: number } }).p
          return pp.a + pp.b
        })
        expect(sums.filter((s) => s === 90).length, q.id).toBe(1)
        expect(q.choices![sums.indexOf(90)]!.id).toBe((q.answer as { choiceId: string }).choiceId)
      }
    })
  })

  it('第 1 档覆盖例 6 与做一做：内角和、已知两个角、∠1∠2∠3、直角三角形、等腰（顶角 / 底角）、等边、剪开、撕拼', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(kind(q))
    })
    for (const k of ['fact', 'third', 'num', 'racute', 'isob', 'isot', 'equi', 'cut', 'tear']) expect(seen, k).toContain(k)
  })
})

describe('多边形的内角和（m4s2-05-polygon）', () => {
  const KP = 'm4s2-05-polygon'
  it('分成几个三角形：图上 n 边形从一个顶点画了 n − 3 条虚线，答案 n − 2', () => {
    each(KP, (q) => {
      if (kind(q) !== 'split' && kind(q) !== 'quad2') return
      const f = geoOf(q)!.figs[0]!
      const poly = polys(f)[0]!.pts
      const diag = lines(f).filter((l) => l.dash)
      expect(diag.length, q.id).toBe(poly.length - 3)
      for (const l of diag) expect(same(l.a, poly[0]!), q.id).toBe(true)
      if (kind(q) === 'split') expect(answer(q), q.id).toBe(String(poly.length - 2))
      else expect(answer(q)).toBe('360')
    })
  })

  it('n 边形的内角和 = 180° ×（n − 2）：图上的边数和题目说的一致', () => {
    each(KP, (q) => {
      const k = textOf(q).k
      if (k === 'm4.tri.polySumFigQ') {
        const n = Number((textOf(q).p.shape as { k: string }).k.split('.').pop())
        expect(polys(geoOf(q)!.figs[0]!)[0]!.pts.length, q.id).toBe(n)
        expect(degAnswer(q), q.id).toBe((n - 2) * 180)
      }
      if (k === 'm4.tri.formulaQ') {
        const n = Number((textOf(q).p.shape as { k: string }).k.split('.').pop())
        expect(answer(q), q.id).toBe(String(n - 2))
      }
      if (k === 'm4.tri.sidesFromSumQ') expect(Number(answer(q)) - 2, q.id).toBe(num(textOf(q).p.s) / 180)
      if (k === 'm4.tri.quadFourthQ') expect(degAnswer(q), q.id).toBe(360 - num(textOf(q).p.a) - num(textOf(q).p.b) - num(textOf(q).p.c))
      if (['m4.tri.quadSumQ', 'm4.tri.rectSumQ', 'm4.tri.squareSumQ', 'm4.tri.trapSumQ', 'm4.tri.paraSumQ'].includes(k)) expect(degAnswer(q)).toBe(360)
      if (k === 'm4.tri.tear4Q') expect(answer(q)).toBe(key('m4.ang.full'))
    })
  })

  it('第 1 档覆盖例 7、做一做与练习十六 4：四边形 360°、长方形 / 正方形 / 梯形、分成几个三角形、n 边形的内角和（含六边形）、180° × ___、剪拼成周角', () => {
    const seen = new Set<string>()
    let hexagon = 0
    each(KP, (q, d) => {
      if (d !== 1) return
      seen.add(kind(q))
      if (sigOf(q) === 'sum-6') hexagon++
    })
    for (const k of ['quad', 'named', 'split', 'sum', 'formula', 'tear4', 'quad2']) expect(seen, k).toContain(k)
    expect(hexagon).toBeGreaterThan(0)
  })

  it('图都画成凸多边形（内角和用「分成三角形」能对上）', () => {
    each(KP, (q) => {
      const g = geoOf(q)
      if (!g) return
      const pts = polys(g.figs[0]!)[0]!.pts
      const sum = pts.reduce((s, _, i) => s + corner(pts, i), 0)
      expect(sum, q.id).toBeCloseTo((pts.length - 2) * 180, 0)
      expect(shoelace(pts)).toBeGreaterThan(0)
    })
  })
})
