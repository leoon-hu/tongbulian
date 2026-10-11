import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'
import { LEAVES, classifyCells, sampleCurve, shoelace } from '../areas'

// 多边形的面积（五上六）与有趣的密铺（五上☆）的专项检查：答案都从题目本身（题干的参数、图上标的数、图形的顶点）重新算一遍。

const SEEDS = 150
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
const kind = (q: Question): string => sigOf(q).split('-')[0]!
type Geo = Extract<StemPart, { kind: 'geo' }>
const geoOf = (q: Question): Geo | undefined => q.stem.find((p): p is Geo => p.kind === 'geo')
const texts = (q: Question): { k: string; p: Record<string, unknown> }[] =>
  q.stem.flatMap((p) => (p.kind === 'text' ? [typeof p.text === 'string' ? { k: p.text, p: {} } : { k: p.text.k, p: (p.text.p ?? {}) as Record<string, unknown> }] : []))
const param = (q: Question, name: string): number => {
  for (const t of texts(q)) if (name in t.p) return Number(t.p[name])
  throw new Error(`${q.id} 题干里没有参数 ${name}`)
}
const textKey = (q: Question): string => texts(q).map((t) => t.k).join('|')
const answerLabel = (q: Question): LStr => q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
/** 答案：数字键盘的数；选项是数的取它的值；别的取词条键或字面量 */
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : labelKey(answerLabel(q)))
const numAnswer = (q: Question): number => Number(q.answer.kind === 'number' ? q.answer.value : translate(answerLabel(q), 'zh'))
const key = (k: string): string => labelKey({ k })
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6

type Poly = Extract<GeoItem, { t: 'poly' }>
type Line = Extract<GeoItem, { t: 'line' }>
type Txt = Extract<GeoItem, { t: 'text' }>
type Dot = Extract<GeoItem, { t: 'dot' }>
const polys = (f: GeoFig): Poly[] => f.items.filter((it): it is Poly => it.t === 'poly')
const lines = (f: GeoFig): Line[] => f.items.filter((it): it is Line => it.t === 'line')
const txts = (f: GeoFig): Txt[] => f.items.filter((it): it is Txt => it.t === 'text')
/** 图上写着的全部数（边上的标注、字、尺寸线；「18 cm」取 18） */
function shownNumbers(f: GeoFig): number[] {
  const out: string[] = []
  for (const it of f.items) {
    if (it.t === 'poly') for (const l of it.labels ?? []) if (l) out.push(l)
    if (it.t === 'text') out.push(it.text)
    if (it.t === 'line' && it.dim) out.push(it.dim)
  }
  return out.map((s) => parseFloat(s)).filter((n) => Number.isFinite(n))
}
const sigNums = (q: Question): number[] =>
  sigOf(q)
    .split('-')
    .slice(1)
    .map(Number)
    .filter((n) => Number.isFinite(n))
const sub = (a: GeoPt, b: GeoPt): GeoPt => [a[0] - b[0], a[1] - b[1]]
const dot = (a: GeoPt, b: GeoPt): number => a[0] * b[0] + a[1] * b[1]
const len = (a: GeoPt): number => Math.hypot(a[0], a[1])

/** 图里每样东西：坐标是有限数、不写汉字 */
function figuresSane(q: Question): void {
  for (const part of q.stem) {
    if (part.kind !== 'geo') continue
    expect(part.alt.length, q.id).toBeGreaterThan(2)
    for (const fig of part.figs) {
      expect(fig.w > 0 && fig.h > 0, q.id).toBe(true)
      for (const it of fig.items) {
        const json = JSON.stringify(it)
        expect(json, q.id).not.toMatch(/NaN|Infinity/)
        const pts: GeoPt[] = it.t === 'poly' || it.t === 'curve' ? it.pts : it.t === 'line' ? [it.a, it.b] : it.t === 'dot' || it.t === 'text' ? [it.at] : it.t === 'grid' ? (it.cells ?? []) : [it.at, it.a, it.b]
        for (const p of pts) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), q.id).toBe(true)
        expect(json, q.id).not.toMatch(/\p{Script=Han}/u)
      }
    }
  }
}

describe('多边形的面积：图都画得出来', () => {
  for (const kp of ['m5s1-06-parallelogram', 'm5s1-06-hectare', 'm5s1-06-triangle', 'm5s1-06-trapezoid', 'm5s1-06-composite', 'm5s1-06-irregular', 'm5s1-07-tiling']) {
    it(`${kp}：坐标都是数、图里没有汉字、都有读屏说明`, () => each(kp, (q) => figuresSane(q)))
  }
})

describe('平行四边形的面积（m5s1-06-parallelogram）', () => {
  const KP = 'm5s1-06-parallelogram'
  it('图上标底和高、文字题：面积 = 底 × 高；标出来的数就是题目的参数', () => {
    let n = 0
    each(KP, (q) => {
      const k = kind(q)
      if (k === 'calc' || k === 'dec' || k === 'turn') {
        const [a, h] = sigNums(q)
        const shown = shownNumbers(geoOf(q)!.figs[0]!)
        expect(shown, q.id).toContain(a)
        expect(shown, q.id).toContain(h)
        expect(near(numAnswer(q), a! * h!), q.id).toBe(true)
        n++
      }
      if (k === 'field') expect(numAnswer(q), q.id).toBe(param(q, 'a') * param(q, 'h'))
      if (k === 'inv') {
        const s = param(q, 's')
        expect(numAnswer(q), q.id).toBe(textKey(q).includes('heightQ') ? s / param(q, 'a') : s / param(q, 'h'))
      }
      if (k === 'square') expect(numAnswer(q), q.id).toBe((param(q, 'p') / 4) ** 2)
      if (k === 'mid') {
        // 涂色的小平行四边形正好是大的一半
        const [shaded, big] = polys(geoOf(q)!.figs[0]!)
        expect(near(shoelace(shaded!.pts) * 2, shoelace(big!.pts)), q.id).toBe(true)
        expect(numAnswer(q), q.id).toBe(param(q, 's') / 2)
      }
      if (k === 'same') {
        const [a, h] = sigNums(q)
        const [p1, p2] = polys(geoOf(q)!.figs[0]!)
        // 两个平行四边形共用上边，下边在同一条直线上：等底等高，面积相等
        expect(near(shoelace(p1!.pts), shoelace(p2!.pts)), q.id).toBe(true)
        expect(near(numAnswer(q), a! * h!), q.id).toBe(true)
      }
    })
    expect(n).toBeGreaterThan(100)
  })

  it('方格纸上数：平行四边形的顶点在格点上，答案就是它的面积（平移那块不多算）', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'grid') return
      const fig = geoOf(q)!.figs[0]!
      const para = polys(fig)[0]!
      for (const p of para.pts) expect(Number.isInteger(p[0]) && Number.isInteger(p[1]), q.id).toBe(true)
      expect(numAnswer(q), q.id).toBe(shoelace(para.pts))
      n++
    })
    expect(n).toBeGreaterThan(20)
  })

  it('看图找高：只有答案那幅的虚线和底垂直、画了直角记号', () => {
    let n = 0
    each(KP, (q) => {
      if (kind(q) !== 'pickh') return
      const figs = geoOf(q)!.figs
      const good = figs.map((f) => {
        const l = lines(f).find((x) => x.dash)!
        const v = sub(l.b, l.a)
        return Math.abs(v[0]) < 1e-6 && f.items.some((it) => it.t === 'arc' && it.right)
      })
      expect(good.filter(Boolean).length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(String(good.indexOf(true) + 1))
      // 错的那两幅：虚线明显斜着（和竖直方向差得多）
      figs.forEach((f, i) => {
        if (good[i]) return
        const l = lines(f).find((x) => x.dash)!
        const v = sub(l.b, l.a)
        expect(Math.abs(v[0]) / Math.abs(v[1]), q.id).toBeGreaterThan(0.3)
      })
      n++
    })
    expect(n).toBeGreaterThan(5)
  })

  it('定义、剪拼、公式、判断：答案对得上', () => {
    const want: Record<string, string> = {
      'def-h': key('m5.area.w.height'),
      'def-b': key('m5.area.w.base'),
      'cut-w': key('m5.area.w.height'),
      'cut-same': key('m5.area.w.noChange'),
      'cut-f': key('m5.area.f.para'),
      letter: labelKey('S = ah'),
      'j-jSides': key('m5.area.no'),
      'j-jSameBH': key('m5.area.yes'),
      'j-jPull': key('m5.area.no'),
      'j-jNeighbor': key('m5.area.no'),
      'j-jRect': key('m5.area.yes'),
    }
    const seen = new Set<string>()
    each(KP, (q) => {
      const s = sigOf(q)
      if (s in want) {
        expect(answer(q), q.id).toBe(want[s])
        seen.add(s)
      }
    })
    expect([...seen].sort()).toEqual(Object.keys(want).sort())
  })

  it('邻边那一题（第 2 档）：选项里有「底 × 邻边」的错法时它不等于答案', () => {
    each(KP, (q) => {
      if (kind(q) !== 'turn') return
      const [a, h, side] = sigNums(q)
      expect(numAnswer(q), q.id).toBe(a! * h!)
      if (side) expect(numAnswer(q), q.id).not.toBe(a! * side)
      if (side) expect(shownNumbers(geoOf(q)!.figs[0]!), q.id).toContain(side)
    })
  })
})

describe('公顷和平方千米（m5s1-06-hectare）', () => {
  const KP = 'm5s1-06-hectare'
  const IN_M2: Record<string, number> = { 'm5.area.u.m2': 1, 'm5.area.u.ha': 10000, 'm5.area.u.km2': 1000000, 'm5.area.u1.m2': 1, 'm5.area.u1.ha': 10000, 'm5.area.u1.km2': 1000000 }
  const unitOf = (q: Question, name: string): number => {
    for (const t of texts(q)) if (name in t.p) return IN_M2[(t.p[name] as { k: string }).k]!
    throw new Error(q.id)
  }
  it('进率与换算：按 1 公顷 = 10000 平方米、1 平方千米 = 100 公顷算', () => {
    let n = 0
    each(KP, (q) => {
      const k = kind(q)
      if (k === 'rate') expect(numAnswer(q), q.id).toBe(unitOf(q, 'ua') / unitOf(q, 'ub'))
      if (k === 'conv') {
        expect(near(numAnswer(q), (param(q, 'a') * unitOf(q, 'ua')) / unitOf(q, 'ub')), q.id).toBe(true)
        n++
      }
      if (k === 'squares') expect(numAnswer(q), q.id).toBe(10000 / param(q, 'n') ** 2)
      if (k === 'fieldha') expect(numAnswer(q), q.id).toBe((param(q, 'a') * param(q, 'h')) / 10000)
      if (k === 'pool') expect(numAnswer(q), q.id).toBe(10000 / (param(q, 'l') * param(q, 'w')))
      if (k === 'wheat') expect(near(numAnswer(q), param(q, 't') / ((param(q, 'a') * param(q, 'h')) / 10000)), q.id).toBe(true)
      if (k === 'seed') expect(numAnswer(q), q.id).toBe((param(q, 'w') * param(q, 'v') * 1000 * param(q, 't')) / 10000)
      if (k === 'cmp') {
        const l = param(q, 'a') * unitOf(q, 'ua')
        const r = param(q, 'b') * unitOf(q, 'ub')
        expect(answer(q), q.id).toBe(l > r ? '>' : l < r ? '<' : '=')
      }
    })
    expect(n).toBeGreaterThan(80)
  })
  it('选单位：实物的面积配对的单位', () => {
    const want: Record<string, string> = { cube: 'ha', nest: 'ha', palace: 'ha', summer: 'ha', track: 'ha', square: 'ha', hk: 'km2', xihu: 'km2', beijing: 'km2', taiwan: 'km2', classroom: 'm2', court: 'm2', football: 'm2', home: 'm2' }
    each(KP, (q) => {
      if (kind(q) !== 'unit') return
      const id = sigOf(q).split('-')[1]!
      expect(answer(q), q.id).toBe(key(`m5.area.u.${want[id]}`))
    })
  })
  it('边长 100 米是 1 公顷、边长 1 千米是 1 平方千米', () => {
    each(KP, (q) => {
      if (sigOf(q) === 'side-100m') expect(answer(q)).toBe(key('m5.area.u1.ha'))
      if (sigOf(q) === 'side-1km') expect(answer(q)).toBe(key('m5.area.u1.km2'))
      if (sigOf(q) === 'land') expect(answer(q)).toBe(key('m5.area.u.ha'))
      if (sigOf(q) === 'bigland') expect(answer(q)).toBe(key('m5.area.u.km2'))
    })
  })
})

describe('三角形的面积（m5s1-06-triangle）', () => {
  const KP = 'm5s1-06-triangle'
  it('图上标底和高、文字题：面积 = 底 × 高 ÷ 2', () => {
    let n = 0
    each(KP, (q) => {
      const k = kind(q)
      if (k === 'calc' || k === 'dec' || k === 'turn') {
        const [a, h] = sigNums(q)
        const shown = shownNumbers(geoOf(q)!.figs[0]!)
        expect(shown, q.id).toContain(a)
        expect(shown, q.id).toContain(h)
        expect(near(numAnswer(q), (a! * h!) / 2), q.id).toBe(true)
        // 忘了除以 2 的错法在选项里时不是答案
        n++
      }
      if (k === 'word') expect(near(numAnswer(q), (param(q, 'a') * param(q, 'h')) / 2), q.id).toBe(true)
      if (k === 'half') expect(numAnswer(q), q.id).toBe(param(q, 's') / 2)
      if (k === 'inv') {
        const s = param(q, 's')
        expect(numAnswer(q), q.id).toBe(textKey(q).includes('heightQ') ? (s * 2) / param(q, 'a') : (s * 2) / param(q, 'h'))
      }
      if (k === 'quarter') {
        const [shaded, big] = polys(geoOf(q)!.figs[0]!)
        expect(near(shoelace(shaded!.pts) * 4, shoelace(big!.pts)), q.id).toBe(true)
        expect(numAnswer(q), q.id).toBe(param(q, 's') / 4)
      }
      if (k === 'peri') {
        // 两条高：下边上的、斜边上的；两条边 = 面积 × 2 ÷ 高
        const s = param(q, 's')
        const hs = txts(geoOf(q)!.figs[0]!).map((t) => parseFloat(t.text))
        expect(hs.length, q.id).toBe(2)
        expect(numAnswer(q), q.id).toBe(((s * 2) / hs[0]! + (s * 2) / hs[1]!) * 2)
      }
    })
    expect(n).toBeGreaterThan(100)
  })
  it('方格纸上剪拼：拼成的平行四边形和三角形面积相等，高是一半、底相等', () => {
    let n = 0
    each(KP, (q) => {
      if (!kind(q).startsWith('mid')) return
      const fig = geoOf(q)!.figs[0]!
      const [trap, top, moved] = polys(fig)
      const tri = shoelace(trap!.pts) + shoelace(top!.pts)
      expect(near(shoelace(moved!.pts), shoelace(top!.pts)), q.id).toBe(true)
      const k = kind(q)
      if (k === 'midg') expect(numAnswer(q), q.id).toBe(tri)
      if (k === 'midh') expect(answer(q), q.id).toBe(key('m5.area.w.cmpHalf'))
      if (k === 'midb' || k === 'mida') expect(answer(q), q.id).toBe(key('m5.area.w.cmpSame'))
      n++
    })
    expect(n).toBeGreaterThan(20)
  })
  it('看图找高：只有答案那幅的虚线是竖直的、画了直角记号', () => {
    each(KP, (q) => {
      if (kind(q) !== 'pickh') return
      const figs = geoOf(q)!.figs
      const good = figs.map((f) => {
        const l = lines(f).find((x) => x.dash)!
        return Math.abs(l.a[0] - l.b[0]) < 1e-6 && f.items.some((it) => it.t === 'arc' && it.right)
      })
      expect(good.filter(Boolean).length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(String(good.indexOf(true) + 1))
    })
  })
  it('等积三角形：梯形里和三角形 ABC 等积的是 DBC、和 ABE 等积的是 DCE、一共 3 对', () => {
    each(KP, (q) => {
      if (sigOf(q) === 'eq-abc') expect(answer(q)).toBe(labelKey({ k: 'm5.area.t.triName', p: { n: 'DBC' } }))
      if (sigOf(q) === 'eq-abe') expect(answer(q)).toBe(labelKey({ k: 'm5.area.t.triName', p: { n: 'DCE' } }))
      if (sigOf(q) === 'eq-pairs') expect(answer(q)).toBe('3')
      if (sigOf(q) === 'pairs') expect(answer(q)).toBe('3')
    })
  })
})

describe('梯形的面积（m5s1-06-trapezoid）', () => {
  const KP = 'm5s1-06-trapezoid'
  it('图上标上底、下底、高，文字题：面积 = (上底 + 下底) × 高 ÷ 2', () => {
    let n = 0
    each(KP, (q) => {
      const k = kind(q)
      if (k === 'calc' || k === 'dec' || k === 'turn' || k === 'dam') {
        const [t, b, h] = sigNums(q)
        const shown = shownNumbers(geoOf(q)!.figs[0]!)
        for (const x of [t, b, h]) expect(shown, q.id).toContain(x)
        expect(near(numAnswer(q), ((t! + b!) * h!) / 2), q.id).toBe(true)
        n++
      }
      if (k === 'word') expect(numAnswer(q), q.id).toBe(((param(q, 't') + param(q, 'b')) * param(q, 'h')) / 2)
      if (k === 'ditch') expect(near(numAnswer(q), ((param(q, 'a') + param(q, 'b')) * param(q, 'h')) / 2), q.id).toBe(true)
      if (k === 'trees') expect(numAnswer(q), q.id).toBe(((param(q, 't') + param(q, 'b')) * param(q, 'h')) / 2 / param(q, 'e'))
      if (k === 'inv') {
        const s = param(q, 's')
        if (sigOf(q).startsWith('inv-b')) expect(near(numAnswer(q), (s * 2) / param(q, 'h') - param(q, 't')), q.id).toBe(true)
        else expect(near(numAnswer(q), (s * 2) / param(q, 'ab')), q.id).toBe(true)
      }
      if (k === 'logs') {
        // 一根圆木是一个涂色的圆
        const logs = geoOf(q)!.figs[0]!.items.filter((it): it is Dot => it.t === 'dot' && !!it.r && !!it.fill)
        expect(numAnswer(q), q.id).toBe(logs.length)
        const tb = param(q, 't') + param(q, 'b')
        expect(numAnswer(q), q.id).toBe((tb * (param(q, 'b') - param(q, 't') + 1)) / 2)
      }
      if (k === 'window') {
        const [t1, b1, t2, b2, h] = sigNums(q)
        const left = sigOf(q).endsWith('-l')
        expect(numAnswer(q), q.id).toBe(left ? ((t1! + b1!) * h!) / 2 : ((t2! + b2!) * h!) / 2)
      }
      if (k === 'fence') {
        const f = param(q, 'f')
        const h = shownNumbers(geoOf(q)!.figs[0]!)[0]!
        expect(numAnswer(q), q.id).toBe(((f - h) * h) / 2)
      }
      if (k === 'path') {
        const [t, b, h] = shownNumbers(geoOf(q)!.figs[0]!)
        expect(numAnswer(q), q.id).toBe(((t! + b!) * h!) / 2 - param(q, 'w') * h!)
      }
    })
    expect(n).toBeGreaterThan(100)
  })
  it('寻找合适的条件：从尺寸线推出缺的那条底', () => {
    let n = 0
    each(KP, (q) => {
      if (!kind(q).startsWith('find')) return
      const dims = geoOf(q)!.figs[0]!.items.filter((it): it is Line => it.t === 'line' && !!it.dim).map((l) => parseFloat(l.dim!))
      if (kind(q) === 'find1') {
        const [t, b, h] = dims
        expect(numAnswer(q), q.id).toBe(((t! + b!) * h!) / 2)
      } else {
        const [p, r, b, h] = dims
        expect(near(numAnswer(q), ((b! - p! - r! + b!) * h!) / 2), q.id).toBe(true)
      }
      n++
    })
    expect(n).toBeGreaterThan(20)
  })
  it('方格纸上剪拼：上半部分转过去拼成平行四边形，面积不变；梯形顶点都在格点上', () => {
    each(KP, (q) => {
      if (!kind(q).startsWith('mid')) return
      const [bottom, top, moved] = polys(geoOf(q)!.figs[0]!)
      expect(near(shoelace(moved!.pts), shoelace(top!.pts)), q.id).toBe(true)
      if (kind(q) === 'midg') expect(numAnswer(q), q.id).toBe(shoelace(bottom!.pts) + shoelace(top!.pts))
      for (const p of [...bottom!.pts, ...top!.pts]) expect(Number.isInteger(p[0]) && Number.isInteger(p[1]), q.id).toBe(true)
    })
  })
  it('各部分名称：标 ? 的是哪一部分', () => {
    each(KP, (q) => {
      if (kind(q) !== 'part') return
      const which = sigOf(q).split('-')[1]!
      expect(answer(q), q.id).toBe(key(`m5.area.w.${which}`))
      const fig = geoOf(q)!.figs[0]!
      const marks = [...polys(fig).flatMap((p) => p.labels ?? []), ...txts(fig).map((t) => t.text)].filter((x) => x === '?')
      expect(marks.length, q.id).toBe(1)
    })
  })
})

describe('组合图形的面积（m5s1-06-composite）', () => {
  const KP = 'm5s1-06-composite'
  it('每种组合图形：按分割 / 添补算出的面积等于答案（数都取自图上标的）', () => {
    let n = 0
    each(KP, (q) => {
      const k = kind(q)
      const nums = sigNums(q)
      const fig = geoOf(q)?.figs[0]
      const shown = fig ? shownNumbers(fig) : []
      const has = (...xs: number[]): void => {
        for (const x of xs) expect(shown, q.id).toContain(x)
      }
      let want: number | null = null
      if (k === 'house') {
        const [w, H, r] = nums as [number, number, number]
        has(w, H, r)
        want = w * H + (w * r) / 2
      }
      if (k === 'wall') {
        const [w, H, r, c] = nums as [number, number, number, number]
        has(w, H, r)
        want = (w * H + (w * r) / 2) * c
        expect(param(q, 'n'), q.id).toBe(c)
      }
      if (k === 'htrap') {
        const [w, H, r] = nums as [number, number, number]
        has(w, H, r)
        want = (H + H + r) * (w / 2) / 2
      }
      if (k === 'flag') {
        const [L, s, d] = nums as [number, number, number]
        has(L, s, d)
        want = L * 2 * s - (2 * s * d) / 2
      }
      if (k === 'pool') {
        const [t, b, h, p, r] = nums as [number, number, number, number, number]
        has(t, b, h, p, r)
        want = ((t + b) * h) / 2 - p * r
      }
      if (k === 'sign') {
        const [a, c, e, f] = nums as [number, number, number, number]
        has(a, c, e, f)
        want = a * c + (e * f) / 2
      }
      if (k === 'veg') {
        const [x, h1, s, h2] = nums as [number, number, number, number]
        has(x, h1, s, h2)
        want = x * h1 + (s * h2) / 2
      }
      if (k === 'step') {
        const [B, Q, c, P] = nums as [number, number, number, number]
        has(B, Q, c, P)
        want = B * Q + ((B - c) * (P - Q)) / 2
      }
      if (k === 'rocket') {
        const [w, t, L, W, f] = nums as [number, number, number, number, number]
        has(w, t, L, W, f)
        want = (w * t) / 2 + w * L + ((w + W) * f) / 2
      }
      if (k === 'letterA') {
        // 左图：梯形纸；右图：去掉的三角形与梯形缺口
        const [paper, cut] = geoOf(q)!.figs
        const [t, b, h] = shownNumbers(paper!)
        const c = shownNumbers(cut!)
        const [tb, th, ch, ct, cb] = c
        want = ((t! + b!) * h!) / 2 - (tb! * th!) / 2 - ((ct! + cb!) * ch!) / 2
      }
      if (k === 'garden') {
        const [a, b] = nums as [number, number]
        has(a, b)
        want = sigOf(q).endsWith('green') ? (a * b) / 2 : (a * b) / 4
      }
      if (k === 'tangram') {
        const [s, i] = nums as [number, number]
        has(s)
        const ps = polys(fig!)
        const shaded = ps.find((p) => p.fill === 'a')!
        const total = ps.reduce((sum, p) => sum + shoelace(p.pts), 0)
        expect(ps.indexOf(shaded), q.id).toBe(i)
        want = (s * s * shoelace(shaded.pts)) / total
      }
      if (want !== null) {
        expect(near(numAnswer(q), want), q.id).toBe(true)
        n++
      }
    })
    expect(n).toBeGreaterThan(200)
  })
  it('分成哪两个图形：答案照图里虚线的分法', () => {
    const want: Record<string, string> = {
      'cut-houseSq': 'sqTri',
      'cut-houseRect': 'rectTri',
      'cut-houseV': 'twoTrap',
      'cut-sign': 'rectTri',
      'cut-veg': 'paraTri',
      'cut-stepH': 'rectTri',
      'cut-stepV': 'trapRect',
    }
    const seen = new Set<string>()
    each(KP, (q) => {
      const s = sigOf(q)
      if (!(s in want)) return
      expect(answer(q), q.id).toBe(key(`m5.area.c.p.${want[s]}`))
      // 答案是「正方形和三角形」时，「长方形和三角形」不当干扰项（正方形也是长方形）
      if (s === 'cut-houseSq') expect(q.choices!.map((c) => labelKey(c.label))).not.toContain(key('m5.area.c.p.rectTri'))
      seen.add(s)
    })
    expect(seen.size).toBe(Object.keys(want).length)
  })
})

describe('不规则图形的面积（m5s1-06-irregular）', () => {
  const KP = 'm5s1-06-irregular'
  it('叶子：满格、非满格按画出来的曲线数；不满 1 格按半格算', () => {
    for (const leaf of LEAVES) {
      const { full, partial } = classifyCells(sampleCurve(leaf.pts, true), leaf.W, leaf.H)
      expect(full.length).toBe(leaf.full.length)
      expect(partial.length).toBe(leaf.partial.length)
      // 估出来的和真的面积差得不多
      const est = full.length + partial.length / 2
      expect(Math.abs(est - shoelace(sampleCurve(leaf.pts, true)))).toBeLessThan(4)
    }
    each(KP, (q) => {
      const k = kind(q)
      const i = Number(sigOf(q).split('-')[1])
      const leaf = LEAVES[i]
      if (k === 'full') {
        expect(numAnswer(q), q.id).toBe(leaf!.full.length)
        const grid = geoOf(q)!.figs[0]!.items.find((it) => it.t === 'grid') as Extract<GeoItem, { t: 'grid' }>
        expect(grid.cells!.length, q.id).toBe(leaf!.full.length)
      }
      if (k === 'range') expect(answer(q), q.id).toBe(labelKey({ k: 'm5.area.i.between', p: { a: param(q, 'f'), b: param(q, 'f') + param(q, 'p') } }))
      if (k === 'half') {
        expect(near(numAnswer(q), param(q, 'f') + param(q, 'p') / 2), q.id).toBe(true)
        expect(param(q, 'f'), q.id).toBe(leaf!.full.length)
        expect(param(q, 'p'), q.id).toBe(leaf!.partial.length)
      }
      if (k === 'para') expect(numAnswer(q), q.id).toBe(param(q, 'a') * param(q, 'h'))
    })
  })
  it('方格纸上的四边形算得准；近似平行四边形的地保留整数；估计题选项差得远', () => {
    each(KP, (q) => {
      const k = kind(q)
      if (k === 'poly') {
        const p = polys(geoOf(q)!.figs[0]!)[0]!
        expect(numAnswer(q), q.id).toBe(shoelace(p.pts))
      }
      if (k === 'land') expect(numAnswer(q), q.id).toBe(Math.round(param(q, 'a') * param(q, 'h')))
      if (k === 'est') {
        const v = numAnswer(q)
        for (const c of q.choices!) {
          const x = Number(translate(c.label, 'zh'))
          if (x !== v) expect(Math.abs(x - v) / v, q.id).toBeGreaterThan(0.4)
        }
      }
    })
  })
})

describe('有趣的密铺（m5s1-07-tiling）', () => {
  const KP = 'm5s1-07-tiling'
  it('能不能密铺、角的度数', () => {
    const can: Record<string, boolean> = { para: true, trap: true, tri: true, square: true, rect: true, hex: true, quad: true, circle: false, penta: false }
    each(KP, (q) => {
      const s = sigOf(q)
      const k = kind(q)
      if (k === 'can') expect(answer(q), q.id).toBe(key(can[s.split('-')[1]!] ? 'm5.area.yes' : 'm5.area.no'))
      if (k === 'pickno') expect(can[s.split('-')[1]!], q.id).toBe(false)
      if (k === 'pickyes') expect(can[s.split('-')[1]!], q.id).toBe(true)
      if (s === 'pic-trap') expect(answer(q)).toBe(key('m5.area.yes'))
      if (s === 'pic-circle') expect(answer(q)).toBe(key('m5.area.no'))
      if (s === 'count-q') expect(answer(q)).toBe('4')
      if (s === 'count-t') expect(answer(q)).toBe('6')
      if (k === 'deg') expect(answer(q), q.id).toBe('360')
      if (s === 'sum-q') expect(answer(q)).toBe('360')
      if (s === 'sum-t') expect(answer(q)).toBe('180')
      if (s === 'penta3') expect(answer(q)).toBe('324')
      if (s === 'penta-gap') expect(answer(q)).toBe('36')
      if (s === 'penta4') expect(answer(q)).toBe('72')
      if (s === 'hex') expect(answer(q)).toBe('3')
      if (s === 'square') expect(answer(q)).toBe('4')
      if (k === 'tri') expect(answer(q), q.id).toBe('2')
      if (k === 'q4') expect(numAnswer(q), q.id).toBe(360 - param(q, 'a') - param(q, 'b') - param(q, 'c'))
      if (s === 'design-t') expect(answer(q)).toBe(key('m5.tile.w.translate'))
      if (s === 'design-r') expect(answer(q)).toBe(key('m5.tile.w.rotate'))
    })
  })
  it('四边形密铺的图：红点周围正好四块，四个角加起来 360°，各是这个四边形的四个角', () => {
    each(KP, (q) => {
      if (sigOf(q) !== 'count-q' && sigOf(q) !== 'deg-q') return
      const fig = geoOf(q)!.figs[0]!
      const ps = polys(fig)
      expect(ps.length).toBe(4)
      const center = fig.items.find((it): it is Dot => it.t === 'dot')!.at
      let sum = 0
      const angles: number[] = []
      for (const p of ps) {
        const i = p.pts.findIndex((v) => len(sub(v, center)) < 0.6)
        expect(i, q.id).toBeGreaterThanOrEqual(0)
        const a = sub(p.pts[(i + 3) % 4]!, center)
        const b = sub(p.pts[(i + 1) % 4]!, center)
        const ang = (Math.acos(dot(a, b) / (len(a) * len(b))) * 180) / Math.PI
        sum += ang
        angles.push(Math.round(ang))
      }
      expect(Math.abs(sum - 360), q.id).toBeLessThan(1)
      expect(new Set(angles).size, q.id).toBe(4)
    })
  })
})
