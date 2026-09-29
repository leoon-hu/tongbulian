import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'
import { fitFig, irregularPts, regularPts, turns } from '../lines'
import { stemText } from '@/seo/site'

// 线和角（三上五）的专项检查：答案都从题目本身（图上的点、线、字母，题干的参数）重新推一遍。

const SEEDS = 150
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
type Geo = Extract<StemPart, { kind: 'geo' }>
const geoOf = (q: Question): Geo => q.stem.find((p): p is Geo => p.kind === 'geo')!
const textKey = (q: Question, i = 0): string => {
  const t = q.stem.filter((p) => p.kind === 'text')[i] as { text: LStr }
  return typeof t.text === 'string' ? t.text : t.text.k
}
const textParams = (q: Question, i = 0): Record<string, unknown> => {
  const t = q.stem.filter((p) => p.kind === 'text')[i] as { text: LStr }
  return typeof t.text === 'string' ? {} : (t.text.p ?? {})
}
/** 正确答案：数字键盘的数，或选项的 labelKey */
const answer = (q: Question): string => {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return labelKey(q.choices!.find((c) => c.id === id)!.label)
}
const key = (k: string): string => labelKey({ k })
const dist = (a: GeoPt, b: GeoPt): number => Math.hypot(a[0] - b[0], a[1] - b[1])
const same = (a: GeoPt, b: GeoPt): boolean => dist(a, b) < 0.6

/** 一幅图里画成点的位置（dot 项 + 线两头画了点的地方） */
function dotsOf(fig: GeoFig): GeoPt[] {
  const out: GeoPt[] = []
  for (const it of fig.items) {
    if (it.t === 'dot') out.push(it.at)
    if (it.t === 'line' && it.dots) {
      if (it.dots[0]) out.push(it.a)
      if (it.dots[1]) out.push(it.b)
    }
    if (it.t === 'curve' && it.dots) {
      if (it.dots[0]) out.push(it.pts[0]!)
      if (it.dots[1]) out.push(it.pts[it.pts.length - 1]!)
    }
  }
  return out
}
/** 看图认线：有曲线就是曲线；否则看直线的两头有没有点——两头都有是线段，一头是射线，都没有是直线 */
function classify(fig: GeoFig): 'segment' | 'ray' | 'line' | 'curve' {
  if (fig.items.some((it) => it.t === 'curve')) return 'curve'
  const line = fig.items.find((it): it is Extract<GeoItem, { t: 'line' }> => it.t === 'line')!
  const dots = dotsOf(fig)
  const ends = [line.a, line.b].filter((e) => dots.some((p) => same(p, e))).length
  return ends === 2 ? 'segment' : ends === 1 ? 'ray' : 'line'
}
const KIND_KEY = { segment: 'm3.line.segment', ray: 'm3.line.ray', line: 'm3.line.line', curve: 'm3.line.none' }

/** 两条线组成的角：公共端点处的夹角（度） */
function angleOf(fig: GeoFig): number {
  const lines = fig.items.filter((it): it is Extract<GeoItem, { t: 'line' }> => it.t === 'line')
  expect(lines.length).toBe(2)
  const [l1, l2] = lines as [Extract<GeoItem, { t: 'line' }>, Extract<GeoItem, { t: 'line' }>]
  const v = [l1.a, l1.b].find((p) => same(p, l2.a) || same(p, l2.b))!
  expect(v, '两条边要有公共的顶点').toBeDefined()
  const a = same(l1.a, v) ? l1.b : l1.a
  const b = same(l2.a, v) ? l2.b : l2.a
  const ua = [a[0] - v[0], a[1] - v[1]]
  const ub = [b[0] - v[0], b[1] - v[1]]
  const cos = (ua[0]! * ub[0]! + ua[1]! * ub[1]!) / (Math.hypot(ua[0]!, ua[1]!) * Math.hypot(ub[0]!, ub[1]!))
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}
const kindOfDeg = (deg: number): 'acute' | 'right' | 'obtuse' => (Math.abs(deg - 90) < 0.5 ? 'right' : deg < 90 ? 'acute' : 'obtuse')

/** 凸多边形各个内角（度） */
function interior(pts: GeoPt[]): number[] {
  return pts.map((v, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length]!
    const b = pts[(i + 1) % pts.length]!
    const ua = [a[0] - v[0], a[1] - v[1]]
    const ub = [b[0] - v[0], b[1] - v[1]]
    const cos = (ua[0]! * ub[0]! + ua[1]! * ub[1]!) / (Math.hypot(ua[0]!, ua[1]!) * Math.hypot(ub[0]!, ub[1]!))
    return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
  })
}
const polysOf = (fig: GeoFig): Extract<GeoItem, { t: 'poly' }>[] => fig.items.filter((it): it is Extract<GeoItem, { t: 'poly' }> => it.t === 'poly')
const polyArea = (pts: GeoPt[]): number => Math.abs(pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length]![1] - pts[(i + 1) % pts.length]![0] * p[1], 0)) / 2

describe('几何图的小工具', () => {
  it('fitFig 把东西挪进外框，外框刚好包住所有点（留边）', () => {
    const fig = fitFig(
      [
        { t: 'line', a: [-50, 20], b: [30, -40] },
        { t: 'dot', at: [100, 0] },
      ],
      10,
    )
    expect(fig.w).toBeCloseTo(170, 0)
    expect(fig.h).toBeCloseTo(80, 0)
    const xs = fig.items.flatMap((it) => (it.t === 'line' ? [it.a[0], it.b[0]] : it.t === 'dot' ? [it.at[0]] : []))
    expect(Math.min(...xs)).toBeCloseTo(10, 0)
    expect(Math.max(...xs)).toBeCloseTo(160, 0)
  })

  it('随手画的多边形是凸的、每个角都看得出来，正多边形的边都一样长', () => {
    for (let s = 1; s <= 200; s++) {
      const n = 3 + (s % 6)
      const pts = irregularPts(n, 70, createRng(s))
      const t = turns(pts)
      expect(t.convex).toBe(true)
      expect(Math.min(...t.turn)).toBeGreaterThanOrEqual(24)
    }
    const reg = regularPts(6, 50, 0)
    const lens = reg.map((p, i) => dist(p, reg[(i + 1) % 6]!))
    expect(Math.max(...lens) - Math.min(...lens)).toBeLessThan(1e-9)
  })
})

describe('线段、射线、直线', () => {
  const KP = 'm3s1-07-lines'

  it('看图说名字：两头都有端点是线段、一头有是射线、都没有是直线，曲线选「都不是」', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('name-')) return
      n++
      expect(answer(q)).toBe(key(KIND_KEY[classify(geoOf(q).figs[0]!)]))
    })
    expect(n).toBeGreaterThan(50)
  })

  it('四幅图里挑：只有一幅是要找的那种线，就是答案', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('pick-')) return
      const target = (textParams(q).kind as { k: string }).k.replace('m3.line.', '') as 'segment' | 'ray' | 'line'
      const kinds = geoOf(q).figs.map(classify)
      expect(kinds.filter((k) => k === target)).toHaveLength(1)
      expect(Number(answer(q))).toBe(kinds.indexOf(target) + 1)
    })
  })

  it('端点个数：线段 2、射线 1、直线 0，和图上一致', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('ends-')) return
      const kind = (textParams(q).kind as { k: string }).k.replace('m3.line.', '') as 'segment' | 'ray' | 'line'
      expect(classify(geoOf(q).figs[0]!)).toBe(kind)
      expect(Number(answer(q))).toBe({ segment: 2, ray: 1, line: 0 }[kind])
    })
  })

  it('哪条路最近：标号离直路最近的那条是答案，另外两条都比直路长', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('route-')) return
      n++
      const fig = geoOf(q).figs[0]!
      const straight = fig.items.find((it): it is Extract<GeoItem, { t: 'line' }> => it.t === 'line')!
      const badges = fig.items.filter((it): it is Extract<GeoItem, { t: 'text' }> => it.t === 'text' && !!it.badge)
      expect(badges).toHaveLength(3)
      const mid: GeoPt = [(straight.a[0] + straight.b[0]) / 2, (straight.a[1] + straight.b[1]) / 2]
      const nearest = badges.reduce((x, y) => (dist(x.at, mid) <= dist(y.at, mid) ? x : y))
      expect(answer(q)).toBe(nearest.text)
      const L = dist(straight.a, straight.b)
      const pathLen = (pts: GeoPt[]): number => pts.slice(1).reduce((s, p, i) => s + dist(pts[i]!, p), 0)
      const curve = fig.items.find((it): it is Extract<GeoItem, { t: 'curve' }> => it.t === 'curve')!
      const bent = polysOf(fig)[0]!
      expect(pathLen(curve.pts)).toBeGreaterThan(L * 1.08)
      expect(pathLen(bent.pts)).toBeGreaterThan(L * 1.08)
    })
    expect(n).toBeGreaterThan(20)
  })

  it('过一点能画无数条直线，过两点只能画一条', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('through-')) return
      const dots = dotsOf(geoOf(q).figs[0]!).length
      expect(answer(q)).toBe(dots === 2 ? labelKey({ k: 'm3.line.nTiao', p: { n: 1 } }) : key('m3.line.countless'))
    })
  })

  it('直线上的点：以一点为端点的线段 n − 1 条，一共 n(n−1)/2 条线段、2n 条射线；n 个点最多连 n(n−1)/2 条', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (!/^(from|segs|rays|connect)-/.test(s)) return
      const n = dotsOf(geoOf(q).figs[0]!).length
      expect(textParams(q).n).toBe(n)
      const v = Number(answer(q))
      if (s.startsWith('from-')) expect(v).toBe(n - 1)
      else if (s.startsWith('segs-') || s.startsWith('connect-')) expect(v).toBe((n * (n - 1)) / 2)
      else expect(v).toBe(2 * n)
      if (s.startsWith('connect-')) {
        // 任意三个点都不在一条直线上（不然连不出那么多条）
        const pts = dotsOf(geoOf(q).figs[0]!)
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) expect(polyArea([pts[i]!, pts[j]!, pts[k]!])).toBeGreaterThan(300)
      }
    })
  })

  it('比长短：点 A、C 重合看 B、D 的位置；木条题 AC 和 BD 的关系跟 AB 和 CD 一样；带箭头的线段按格子数', () => {
    const rel = (x: number, y: number): string => (Math.abs(x - y) < 0.01 ? '=' : x > y ? '>' : '<')
    const letterPos = (fig: GeoFig): Record<string, GeoPt> => {
      const out: Record<string, GeoPt> = {}
      for (const it of fig.items) {
        if (it.t === 'dot' && it.label) out[it.label] = it.at
        if (it.t === 'text' && it.letter) out[it.text] = it.at
      }
      return out
    }
    let seen = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!/^(overlap|strips|illusion)-/.test(s)) return
      seen++
      const at = letterPos(geoOf(q).figs[0]!)
      const ab = Math.abs(at.B![0] - at.A![0])
      const cd = Math.abs(at.D![0] - at.C![0])
      if (s.startsWith('strips-')) {
        expect(textParams(q).rel).toBe(rel(ab, cd))
        const ac = Math.abs(at.C![0] - at.A![0])
        const bd = Math.abs(at.D![0] - at.B![0])
        expect(answer(q)).toBe(rel(ac, bd))
      } else expect(answer(q)).toBe(rel(ab, cd))
      if (s.startsWith('illusion-')) for (const p of [at.A!, at.B!, at.C!, at.D!]) expect(Number.isInteger(p[0])).toBe(true)
      expect(q.stem.some((p) => p.kind === 'expr' && /○/.test(p.expr))).toBe(true)
    })
    expect(seen).toBeGreaterThan(50)
  })

  it('分档：第 1 档是认线、挑线、端点和三种线的区别，第 3 档才有数线段、比长短', () => {
    each(KP, (q, d) => {
      const s = sigOf(q).split('-')[0]!
      if (d === 1) expect(['name', 'pick', 'ends', 'fact']).toContain(s)
      if (d === 3) expect(['segs', 'rays', 'connect', 'overlap', 'strips', 'illusion', 'from']).toContain(s)
    })
  })
})

describe('角的认识', () => {
  const KP = 'm3s1-07-angles'

  it('是不是角：只有两条直直的边、有公共顶点的才是', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('is-')) return
      const fig = geoOf(q).figs[0]!
      const lines = fig.items.filter((it) => it.t === 'line') as Extract<GeoItem, { t: 'line' }>[]
      const isAngle = !fig.items.some((it) => it.t === 'curve') && lines.length === 2 && [lines[0]!.a, lines[0]!.b].some((p) => same(p, lines[1]!.a) || same(p, lines[1]!.b))
      expect(answer(q)).toBe(key(isAngle ? 'm3.line.yes' : 'm3.line.no'))
    })
  })

  it('多边形的角、线段条数都等于顶点个数', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('poly-')) return
      expect(Number(answer(q))).toBe(polysOf(geoOf(q).figs[0]!)[0]!.pts.length)
    })
  })

  it('比角的大小：张口大的角大，而且故意画成边更短的那个', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('bigger-')) return
      n++
      const figs = geoOf(q).figs
      const degs = figs.map(angleOf)
      const big = degs[0]! > degs[1]! ? 0 : 1
      expect(Math.abs(degs[0]! - degs[1]!)).toBeGreaterThanOrEqual(19.5)
      expect(answer(q)).toBe(labelKey(String(big + 1)))
      const arm = (f: GeoFig): number => {
        const l = f.items.find((it): it is Extract<GeoItem, { t: 'line' }> => it.t === 'line')!
        return dist(l.a, l.b)
      }
      expect(arm(figs[big]!)).toBeLessThan(arm(figs[1 - big]!))
    })
    expect(n).toBeGreaterThan(30)
  })

  it('两条直线相交组成 4 个角，交点标 O；一个顶点引出 n 条射线有 n(n−1)/2 个角', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('cross-n')) expect(answer(q)).toBe('4')
      if (s.startsWith('cross-o')) {
        expect(answer(q)).toBe(labelKey('O'))
        const fig = geoOf(q).figs[0]!
        const [l1, l2] = fig.items.filter((it) => it.t === 'line') as Extract<GeoItem, { t: 'line' }>[]
        const o = fig.items.find((it): it is Extract<GeoItem, { t: 'dot' }> => it.t === 'dot' && it.label === 'O')!
        // O 在两条线的中点上（两条线都以交点为中心画）
        expect(same(o.at, [(l1!.a[0] + l1!.b[0]) / 2, (l1!.a[1] + l1!.b[1]) / 2])).toBe(true)
        expect(same(o.at, [(l2!.a[0] + l2!.b[0]) / 2, (l2!.a[1] + l2!.b[1]) / 2])).toBe(true)
      }
      if (s.startsWith('fan-')) {
        const n = geoOf(q).figs[0]!.items.filter((it) => it.t === 'line').length
        expect(Number(answer(q))).toBe((n * (n - 1)) / 2)
      }
    })
  })

  it('剪去一个角：剩下的图形有几个顶点就剩几个角，剪下的和剩下的拼起来是整张正方形', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('cut-')) return
      const [cut, keep] = polysOf(geoOf(q).figs[0]!)
      expect(Number(answer(q))).toBe(keep!.pts.length)
      expect(polyArea(cut!.pts) + polyArea(keep!.pts)).toBeCloseTo(120 * 120, -1)
    })
  })

  it('正方体、长方体盒子上的直角：每个面 4 个，一共 24 个', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('cube-')) return
      expect(Number(answer(q))).toBe(textKey(q) === 'm3.line.cubeFace' ? 4 : 24)
    })
  })
})

describe('锐角、直角、钝角', () => {
  const KP = 'm3s1-07-angle-kinds'

  it('看角分类：按图上两条边的夹角判断；第 1、2 档离直角远，第 3 档接近直角', () => {
    let n = 0
    each(KP, (q, d) => {
      if (!sigOf(q).startsWith('kind-')) return
      n++
      const deg = angleOf(geoOf(q).figs[0]!)
      const kind = kindOfDeg(deg)
      expect(answer(q)).toBe(key(`m3.line.${kind}`))
      if (kind === 'acute') expect(deg).toSatisfy((x: number) => (d === 3 ? x >= 64.5 && x <= 75.5 : x >= 24.5 && x <= 65.5))
      if (kind === 'obtuse') expect(deg).toSatisfy((x: number) => (d === 3 ? x >= 104.5 && x <= 115.5 : x >= 114.5 && x <= 160.5))
      // 直角记号只画在直角上，第 3 档不画
      const marks = geoOf(q).figs[0]!.items.filter((it) => it.t === 'arc' && it.right)
      if (marks.length) expect(kind).toBe('right')
      if (d === 3) expect(marks).toHaveLength(0)
    })
    expect(n).toBeGreaterThan(100)
  })

  it('三个角里挑：只有一个是要找的那种', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('pk-')) return
      const target = (textParams(q).kind as { k: string }).k.replace('m3.line.', '')
      const kinds = geoOf(q).figs.map((f) => kindOfDeg(angleOf(f)))
      expect(kinds.filter((k) => k === target)).toHaveLength(1)
      expect(Number(answer(q))).toBe(kinds.indexOf(target as 'acute') + 1)
    })
  })

  it('数图形里的直角 / 锐角 / 钝角：按图上的内角数', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('ck-')) return
      n++
      const target = (textParams(q).kind as { k: string }).k.replace('m3.line.', '')
      const pts = polysOf(geoOf(q).figs[0]!)[0]!.pts
      const count = interior(pts).filter((x) => kindOfDeg(x) === target).length
      expect(Number(answer(q))).toBe(count)
    })
    expect(n).toBeGreaterThan(50)
  })

  it('三角尺上一个直角、两个锐角（按图上外面那个三角形的角算）', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('ruler-')) return
      const target = (textParams(q).kind as { k: string }).k.replace('m3.line.', '')
      const outer = polysOf(geoOf(q).figs[0]!)[0]!.pts
      expect(Number(answer(q))).toBe(interior(outer).filter((x) => kindOfDeg(x) === target).length)
    })
  })

  it('整时钟面：时针和分针的夹角是 30° × 几时（取小于 180° 的那个）', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('clock-')) return
      const clock = q.stem.find((p): p is Extract<StemPart, { kind: 'clock' }> => p.kind === 'clock')!
      expect(clock.minute).toBe(0)
      const a = (clock.hour % 12) * 30
      const deg = Math.min(a, 360 - a)
      expect(deg).toBeGreaterThan(0)
      expect(deg).toBeLessThan(180)
      expect(answer(q)).toBe(key(`m3.line.${kindOfDeg(deg)}`))
    })
  })

  it('锐角、钝角和直角比', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('kdef-')) return
      const k = textKey(q)
      const expected = { 'm3.line.smaller': 'acute', 'm3.line.larger': 'obtuse', 'm3.line.acuteVs': 'right', 'm3.line.obtuseVs': 'obtuse' }[k]!
      expect(answer(q)).toBe(key(`m3.line.${expected}`))
    })
  })
})

describe('线和角：图和文字', () => {
  it('图里没有汉字（只有字母、数、问号、emoji），坐标都是有限的数；中英文题干都不含没翻译的键', () => {
    for (const kp of ['m3s1-07-lines', 'm3s1-07-angles', 'm3s1-07-angle-kinds']) {
      each(kp, (q) => {
        for (const part of q.stem) {
          if (part.kind !== 'geo') continue
          expect(part.alt.length).toBeGreaterThan(2)
          expect(stemText(part)).toBe(part.alt) // 静态页上的文字版就是这句说明
          for (const fig of part.figs) {
            expect(fig.w).toBeGreaterThan(0)
            expect(fig.h).toBeGreaterThan(0)
            for (const it of fig.items) {
              const json = JSON.stringify(it)
              expect(json, q.id).not.toMatch(/null|NaN|Infinity/)
              expect(json, q.id).not.toMatch(/\p{Script=Han}/u)
            }
          }
        }
        for (const lang of ['zh', 'en'] as const) for (const c of q.choices ?? []) expect(translate(c.label, lang)).not.toMatch(/m3\./)
      })
    }
  })
})
