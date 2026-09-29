import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'

// 图形的面积（三下四）的专项检查：答案都从题目本身（图上的方格、边上标的数，题干的参数）重新推一遍。

const SEEDS = 150
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
type Geo = Extract<StemPart, { kind: 'geo' }>
type Poly = Extract<GeoItem, { t: 'poly' }>
type Grid = Extract<GeoItem, { t: 'grid' }>
const geoOf = (q: Question): Geo => q.stem.find((p): p is Geo => p.kind === 'geo')!
const texts = (q: Question): LStr[] => q.stem.filter((p) => p.kind === 'text').map((p) => (p as { text: LStr }).text)
const textKey = (q: Question, i = 0): string => {
  const t = texts(q)[i]
  return t === undefined ? '' : typeof t === 'string' ? t : t.k
}
const textParams = (q: Question, i = 0): Record<string, number | string | LStr> => {
  const t = texts(q)[i]!
  return typeof t === 'string' ? {} : ((t.p ?? {}) as Record<string, number | string | LStr>)
}
const unitOf = (l: unknown): string => (l as { k: string }).k.replace(/^m3\.(area\.u1?|u)\./, '')
const answer = (q: Question): string => {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return labelKey(q.choices!.find((c) => c.id === id)!.label)
}
const value = (q: Question): number => Number(answer(q))
const key = (k: string): string => labelKey({ k })
const polysOf = (fig: GeoFig): Poly[] => fig.items.filter((it): it is Poly => it.t === 'poly')
const gridOf = (fig: GeoFig): Grid | undefined => fig.items.find((it): it is Grid => it.t === 'grid')
const dist = (a: GeoPt, b: GeoPt): number => Math.hypot(a[0] - b[0], a[1] - b[1])
const polyArea = (pts: GeoPt[]): number => Math.abs(pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length]![1] - pts[(i + 1) % pts.length]![0] * p[1], 0)) / 2
const labelNums = (p: Poly): number[] => (p.labels ?? []).filter((x): x is string => !!x && x !== '?').map(Number)
function perimOfCells(cells: GeoPt[]): number {
  let n = 0
  for (const [c, r] of cells)
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const)
      if (!cells.some(([x, y]) => x === c + dc && y === r + dr)) n++
  return n
}
/** 面积单位换成平方厘米 */
const IN_CM2: Record<string, number> = { cm2: 1, dm2: 100, m2: 10000 }

describe('面积和面积单位', () => {
  const KP = 'm3s2-04-area-units'

  it('数方格：面积就是涂色的格子数（单位跟题目里「每个小方格代表 1 …」一致）', () => {
    let n = 0
    each(KP, (q, d) => {
      if (!sigOf(q).startsWith('count-')) return
      n++
      const cells = gridOf(geoOf(q).figs[0]!)!.cells!
      expect(value(q)).toBe(cells.length)
      expect(unitOf(textParams(q).u)).toBe(unitOf(textParams(q).u1))
      if (d === 1) expect(cells.length).toBeLessThanOrEqual(12)
    })
    expect(n).toBeGreaterThan(80)
  })

  it('选单位：邮票、手指甲、身份证用平方厘米，手帕、课桌面、书封面用平方分米，黑板、教室、学校用平方米；长度的用长度单位', () => {
    const UNIT: Record<string, string> = {
      stamp: 'cm2',
      nail: 'cm2',
      card: 'cm2',
      hanky: 'dm2',
      desk: 'dm2',
      book: 'dm2',
      board: 'm2',
      room: 'm2',
      school: 'm2',
      boardLen: 'm',
      height: 'cm',
      waist: 'dm',
      tree: 'm',
      crayon: 'dm',
      dict: 'cm',
    }
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('unit-')) return
      n++
      const id = textKey(q).replace('m3.area.it.', '')
      const correct = q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
      expect(unitOf(correct)).toBe(UNIT[id])
      expect(textParams(q).u).toBe('___')
      expect(textKey(q, 1)).toBe('m3.u.which')
      // 干扰项里没有别的对的：都是不同的单位
      expect(new Set(q.choices!.map((c) => unitOf(c.label))).size).toBe(3)
    })
    expect(n).toBeGreaterThan(80)
  })

  it('面积的意思；边长 1 的正方形面积是 1 平方（同一个长度单位）', () => {
    each(KP, (q) => {
      if (sigOf(q) === 'def') expect(answer(q)).toBe(key('m3.area.area'))
      if (!sigOf(q).startsWith('unitsq-')) return
      const lu = unitOf(textParams(q).lu)
      const correct = q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label as unknown as { p: { n: number; u: unknown } }
      expect(correct.p.n).toBe(1)
      expect(unitOf(correct.p.u)).toBe(`${lu}2`)
    })
  })

  it('比面积：按两幅图的格子数；相差几格', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('cmp-') && !s.startsWith('diff-')) return
      n++
      const [a, b] = geoOf(q).figs.map((f) => gridOf(f)!.cells!.length) as [number, number]
      if (s.startsWith('diff-')) expect(value(q)).toBe(Math.abs(a - b))
      else expect(answer(q)).toBe(a === b ? key('m3.area.same') : labelKey(a > b ? '1' : '2'))
    })
    expect(n).toBeGreaterThan(50)
  })

  it('同样多的小正方形拼成的图形：面积就是个数，周长按格子数', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('tetro-')) return
      const cells = gridOf(geoOf(q).figs[0]!)!.cells!
      expect(textParams(q).n).toBe(cells.length)
      expect(value(q)).toBe(s.startsWith('tetro-a') ? cells.length : perimOfCells(cells))
    })
  })

  it('判断题', () => {
    const OK: Record<string, boolean> = { 'm3.area.s.eight': true, 'm3.area.s.oneWay': false, 'm3.area.s.samePerim': false, 'm3.area.s.meter': true, 'm3.area.s.sameArea': false, 'm3.area.s.cmSame': false }
    each(KP, (q) => {
      if (!sigOf(q).startsWith('judge-')) return
      expect(answer(q)).toBe(key(OK[textKey(q)] ? 'm3.area.right' : 'm3.area.wrong'))
    })
  })
})

describe('长方形和正方形的面积', () => {
  const KP = 'm3s2-04-rect-area'

  it('看图求面积：长 × 宽 / 边长 × 边长；画了方格的，方格正好是长 × 宽个；第 1 档表内乘法', () => {
    let n = 0
    each(KP, (q, d) => {
      const s = sigOf(q)
      if (!s.startsWith('fig-')) return
      n++
      const fig = geoOf(q).figs[0]!
      const nums = labelNums(polysOf(fig)[0]!)
      const [a, b] = s.startsWith('fig-sq') ? [nums[0]!, nums[0]!] : [nums[0]!, nums[1]!]
      expect(value(q)).toBe(a * b)
      const g = gridOf(fig)
      if (g) {
        expect(g.w).toBe(a)
        expect(g.h).toBe(b)
      }
      if (d === 1) expect(Math.max(a, b)).toBeLessThanOrEqual(9)
      else expect(Math.min(a, b)).toBeLessThanOrEqual(12)
    })
    expect(n).toBeGreaterThan(80)
  })

  it('文字题按题目里的数重算', () => {
    const f: Record<string, (p: Record<string, number>) => number> = {
      'm3.area.wBed': (p) => p.a! * p.b!,
      'm3.area.wHanky': (p) => p.a! * p.a!,
      'm3.area.wPaper': (p) => p.a! * p.b!,
      'm3.area.wPond': (p) => (p.p! / 4) ** 2,
      'm3.area.wCut': (p) => Math.min(p.a!, p.b!) ** 2,
      'm3.area.wEst': (p) => p.a! * p.b!,
      'm3.area.wYard': (p) => p.a! * p.b!,
      'm3.area.wWall': (p) => p.a! * p.b! - p.c!,
      'm3.area.wRobot': (p) => (p.a! * p.b!) / p.r!,
      'm3.area.wTwo': (p) => 2 * p.a! * p.b!,
    }
    const seen = new Set<string>()
    each(KP, (q) => {
      const k = textKey(q)
      if (!(k in f)) return
      seen.add(k)
      const p = textParams(q) as Record<string, number>
      const v = f[k]!(p)
      expect(Number.isInteger(v), q.id).toBe(true)
      expect(value(q), q.id).toBe(v)
      // 拼成正方形：长正好是宽的 2 倍
      if (k === 'm3.area.wTwo') expect(p.a).toBe(2 * p.b!)
    })
    expect(seen.size).toBe(Object.keys(f).length)
  })

  it('同一个长方形问周长或面积：按标的长和宽', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('pa-')) return
      const [a, b] = labelNums(polysOf(geoOf(q).figs[0]!)[0]!) as [number, number]
      expect(value(q)).toBe(s.startsWith('pa-a') ? a * b : 2 * (a + b))
    })
  })

  it('L 形和剪去一块的图形：量图上的面积（按底边或上边标的数换算）', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('lshape-') && !s.startsWith('cut-')) return
      n++
      const polys = polysOf(geoOf(q).figs[0]!)
      const shape = polys[polys.length - 1]!
      const labeled = shape.labels!.map((x, i) => ({ x, i })).filter((l) => !!l.x)
      const { x, i } = labeled[0]!
      const k = dist(shape.pts[i]!, shape.pts[(i + 1) % shape.pts.length]!) / Number(x)
      expect(Math.abs(polyArea(shape.pts) / (k * k) - value(q))).toBeLessThan(1)
    })
    expect(n).toBeGreaterThan(50)
  })

  it('公式选项：长方形长 × 宽，正方形边长 × 边长', () => {
    each(KP, (q) => {
      if (sigOf(q) === 'formula-rect') expect(answer(q)).toBe(key('m3.rect.fRectA'))
      if (sigOf(q) === 'formula-sq') expect(answer(q)).toBe(key('m3.rect.fSqSq'))
    })
  })
})

describe('面积单位间的进率', () => {
  const KP = 'm3s2-04-area-convert'

  it('换算：按进率 100 重算；第 1 档是一位数个大单位或整百个小单位', () => {
    let n = 0
    each(KP, (q, d) => {
      if (textKey(q) !== 'm3.u.conv') return
      n++
      const p = textParams(q)
      const from = unitOf(p.ua)
      const to = unitOf(p.ub)
      expect(value(q)).toBe(((p.a as number) * IN_CM2[from]!) / IN_CM2[to]!)
      if (d === 1) expect(Math.min(p.a as number, value(q))).toBeLessThanOrEqual(9)
      if (d < 3) expect(Math.max(IN_CM2[from]!, IN_CM2[to]!) / Math.min(IN_CM2[from]!, IN_CM2[to]!)).toBe(100)
    })
    expect(n).toBeGreaterThan(100)
  })

  it('比大小：都换成平方厘米再比', () => {
    let n = 0
    each(KP, (q) => {
      if (textKey(q, 1) !== 'm3.u.cmpLine') return
      n++
      expect(q.type).toBe('compare')
      const p = textParams(q, 1)
      const l = (p.a as number) * IN_CM2[unitOf(p.ua)]!
      const r = (p.b as number) * IN_CM2[unitOf(p.ub)]!
      expect(answer(q)).toBe(labelKey(l > r ? '>' : l < r ? '<' : '='))
    })
    expect(n).toBeGreaterThan(50)
  })

  it('判断等式、进率、标志牌、铺地砖', () => {
    each(KP, (q) => {
      const k = textKey(q)
      const p = textParams(q)
      if (k === 'm3.area.eqLine') {
        const ok = (p.a as number) * IN_CM2[unitOf(p.ua)]! === (p.b as number) * IN_CM2[unitOf(p.ub)]!
        expect(answer(q)).toBe(key(ok ? 'm3.area.right' : 'm3.area.wrong'))
      }
      if (k === 'm3.area.rateQ') expect(answer(q)).toBe(labelKey('100'))
      if (k === 'm3.area.sign') expect(value(q)).toBe(((p.a as number) ** 2 * 100) / IN_CM2[unitOf(p.su)]!)
      if (k === 'm3.area.tiles') {
        const s = p.s as number
        expect(value(q)).toBe(((p.a as number) * (p.b as number) * 100) / (s * s))
      }
    })
  })
})

describe('图形的面积：图和文字', () => {
  it('图里没有汉字、坐标都是有限的数；中英文选项都翻译了；没有两位数乘两位数', () => {
    for (const kp of ['m3s2-04-area-units', 'm3s2-04-rect-area', 'm3s2-04-area-convert']) {
      each(kp, (q) => {
        for (const part of q.stem) {
          if (part.kind !== 'geo') continue
          expect(part.alt.length).toBeGreaterThan(2)
          for (const fig of part.figs)
            for (const it of fig.items) {
              expect(JSON.stringify(it), q.id).not.toMatch(/\p{Script=Han}/u)
              const pts: GeoPt[] = it.t === 'poly' || it.t === 'curve' ? it.pts : it.t === 'line' ? [it.a, it.b] : it.t === 'dot' || it.t === 'text' ? [it.at] : it.t === 'grid' ? (it.cells ?? []) : [it.at, it.a, it.b]
              for (const pt of pts) expect(Number.isFinite(pt[0]) && Number.isFinite(pt[1]), q.id).toBe(true)
            }
        }
        for (const lang of ['zh', 'en'] as const) for (const c of q.choices ?? []) expect(translate(c.label, lang)).not.toMatch(/m3\./)
        // 长方形的长和宽：至少有一个是一位数（或整十的数）
        for (const t of texts(q)) {
          if (typeof t === 'string' || !t.p) continue
          const { a, b } = t.p as Record<string, unknown>
          if (typeof a === 'number' && typeof b === 'number' && a < 100 && b < 100) expect(Math.min(a, b) <= 9 || a % 10 === 0 || b % 10 === 0, q.id).toBe(true)
        }
      })
    }
  })
})
