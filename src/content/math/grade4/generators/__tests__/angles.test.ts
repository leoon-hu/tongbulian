import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'

// 角的度量（四上二）的专项检查：答案都从题目本身（图上的线和弧、量角器上的边和点、题干的参数）重新推一遍。

const SEEDS = 150
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
type Geo = Extract<StemPart, { kind: 'geo' }>
type Pro = Extract<StemPart, { kind: 'protractor' }>
const geoOf = (q: Question): Geo => q.stem.find((p): p is Geo => p.kind === 'geo')!
const proOf = (q: Question): Pro => q.stem.find((p): p is Pro => p.kind === 'protractor')!
const textOf = (q: Question): { k: string; p: Record<string, unknown> } => {
  const t = (q.stem.find((p) => p.kind === 'text') as { text: LStr }).text
  return typeof t === 'string' ? { k: t, p: {} } : { k: t.k, p: (t.p ?? {}) as Record<string, unknown> }
}
/** 正确答案：数字键盘的数，或选项的 labelKey */
const answer = (q: Question): string => {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return labelKey(q.choices!.find((c) => c.id === id)!.label)
}
/** 度数题的答案（数字键盘的数或「60°」选项）换成数 */
const degAnswer = (q: Question): number => Number(answer(q).replace('°', ''))
const key = (k: string): string => labelKey({ k })
const zh = (l: LStr): string => translate(l, 'zh')

type Line = Extract<GeoItem, { t: 'line' }>
type Arc = Extract<GeoItem, { t: 'arc' }>
const linesOf = (f: GeoFig): Line[] => f.items.filter((it): it is Line => it.t === 'line')
const arcsOf = (f: GeoFig): Arc[] => f.items.filter((it): it is Arc => it.t === 'arc')
const dist = (a: GeoPt, b: GeoPt): number => Math.hypot(a[0] - b[0], a[1] - b[1])
const same = (a: GeoPt, b: GeoPt): boolean => dist(a, b) < 0.6
/** 方向角（度，0 朝右、逆时针，0–360） */
const heading = (from: GeoPt, to: GeoPt): number => ((Math.atan2(-(to[1] - from[1]), to[0] - from[0]) * 180) / Math.PI + 360) % 360
/** 从顶点 v 看 a、b 两点的夹角（0–180） */
function between(v: GeoPt, a: GeoPt, b: GeoPt): number {
  const d = Math.abs(heading(v, a) - heading(v, b)) % 360
  return Math.min(d, 360 - d)
}
/** 弧从 a 那条边逆时针转到 b 那条边转过的角（ccw 的弧；a、b 同向是 360） */
function ccwTurn(arc: Arc): number {
  const t = (heading(arc.at, arc.b) - heading(arc.at, arc.a) + 360) % 360
  return t < 0.5 ? 360 : t
}
const KIND_OF = (deg: number): string => (deg < 89.5 ? 'acute' : deg < 90.5 ? 'right' : deg < 179.5 ? 'obtuse' : deg < 180.5 ? 'straight' : 'full')

/** 一幅角的图是多少度：一条线 + 整圈弧是周角，一条线 + 半圈弧是平角，两条线看夹角 */
function figDeg(f: GeoFig): number {
  const ls = linesOf(f)
  const arc = arcsOf(f)[0]
  if (ls.length === 1) {
    expect(arc?.ccw, '周角、平角的弧是逆时针画的').toBe(true)
    return ccwTurn(arc!)
  }
  expect(ls.length).toBe(2)
  const [l1, l2] = ls as [Line, Line]
  const v = [l1.a, l1.b].find((p) => same(p, l2.a) || same(p, l2.b))!
  expect(v, '两条边有公共的顶点').toBeDefined()
  return between(v, same(l1.a, v) ? l1.b : l1.a, same(l2.a, v) ? l2.b : l2.a)
}

describe('角的再认识', () => {
  const KP = 'm4s1-03-angles'

  it('看图说角的名称：按图上画的角（周角是整圈、平角是半圈）定答案；直角没画方块时一定摆正', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('name-')) return
      n++
      const f = geoOf(q).figs[0]!
      const deg = figDeg(f)
      expect(answer(q)).toBe(key(`m4.ang.${KIND_OF(deg)}`))
      if (Math.abs(deg - 90) < 0.5 && !arcsOf(f).some((a) => a.right)) {
        // 两条边都是横的或竖的
        for (const l of linesOf(f)) expect(Math.abs(l.a[0] - l.b[0]) < 0.6 || Math.abs(l.a[1] - l.b[1]) < 0.6, q.id).toBe(true)
      }
      // 选项是四种角名，互不相同
      expect(q.choices!.length).toBe(4)
    })
    expect(n).toBeGreaterThan(80)
  })

  it('射线旋转几周：1 周是周角、1/2 周平角、1/4 周直角、不到 1/4 周锐角、超过 1/4 周不到 1/2 周钝角；配的图和说法一致', () => {
    const TURN: Record<string, string> = {
      'm4.ang.turnFull': 'full',
      'm4.ang.turnHalf': 'straight',
      'm4.ang.turnQuarter': 'right',
      'm4.ang.turnLess': 'acute',
      'm4.ang.turnMore': 'obtuse',
    }
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('rot-')) {
        const turn = (textOf(q).p.turn as { k: string }).k
        expect(answer(q)).toBe(key(`m4.ang.${TURN[turn]}`))
        const g = q.stem.find((p) => p.kind === 'geo') as Geo | undefined
        if (g) {
          const f = g.figs[0]!
          expect(KIND_OF(figDeg(f))).toBe(TURN[turn])
          expect(arcsOf(f).every((a) => a.ccw && a.arrow), '旋转的图画带箭头的弧').toBe(true)
        }
      }
      if (s.startsWith('turnof-')) {
        const kind = (textOf(q).p.kind as { k: string }).k.replace('m4.ang.', '')
        const want = Object.keys(TURN).find((k) => TURN[k] === kind)!
        expect(answer(q)).toBe(key(want))
      }
    })
  })

  it('比大小（锐角 < 直角 < 钝角 < 平角 < 周角）、最大最小、1 周角 = 2 平角 = 4 直角', () => {
    const ORDER = ['acute', 'right', 'obtuse', 'straight', 'full']
    const REL: Record<string, number> = {
      'm4.ang.relFullStraight': 2,
      'm4.ang.relFullRight': 4,
      'm4.ang.relStraightRight': 2,
      'm4.ang.relRightsStraight': 2,
      'm4.ang.relRightsFull': 4,
      'm4.ang.relStraightsFull': 2,
    }
    each(KP, (q) => {
      const s = sigOf(q)
      const t = textOf(q)
      if (s.startsWith('cmp-')) {
        const e = (q.stem[1] as { text: { p: Record<string, { k: string }> } }).text.p
        const a = ORDER.indexOf(e.a!.k.replace('m4.ang.', ''))
        const b = ORDER.indexOf(e.b!.k.replace('m4.ang.', ''))
        expect(a).not.toBe(b)
        expect(answer(q)).toBe(a < b ? '<' : '>')
      }
      if (s === 'ext-max') expect(answer(q)).toBe(key('m4.ang.full'))
      if (s === 'ext-min') expect(answer(q)).toBe(key('m4.ang.acute'))
      if (s.startsWith('rel-')) expect(Number(answer(q))).toBe(REL[t.k])
    })
  })

  it('三个角里挑：只有一个是要找的那种', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('pick-')) return
      const target = (textOf(q).p.kind as { k: string }).k.replace('m4.ang.', '')
      const kinds = geoOf(q).figs.map((f) => KIND_OF(figDeg(f)))
      expect(kinds.filter((k) => k === target)).toHaveLength(1)
      expect(Number(answer(q))).toBe(kinds.indexOf(target) + 1)
    })
  })

  it('判断题、平角分成两个角、射线接着转、数角', () => {
    const YES = new Set(['m4.ang.jSplit', 'm4.ang.jAcuteRight', 'm4.ang.jFullFourRight', 'm4.ang.jStraightTwoRight', 'm4.ang.jFullTwoStraight', 'm4.ang.jObtuseBig'])
    each(KP, (q) => {
      const s = sigOf(q)
      const t = textOf(q)
      if (s.startsWith('judge-')) expect(answer(q)).toBe(key(YES.has(t.k) ? 'm4.ang.yes' : 'm4.ang.no'))
      if (s.startsWith('split-')) {
        const k = (t.p.kind as { k: string }).k
        expect(answer(q)).toBe(key({ 'm4.ang.right': 'm4.ang.right', 'm4.ang.acute': 'm4.ang.obtuse', 'm4.ang.obtuse': 'm4.ang.acute' }[k]!))
      }
      if (s === 'twoturns-q') expect(answer(q)).toBe(key('m4.ang.straight'))
      if (s === 'twoturns-h') expect(answer(q)).toBe(key('m4.ang.full'))
      if (s.startsWith('fan-')) {
        // 从一个点引出 n 条射线，所有射线在一个平角以内：每两条组成一个角
        const ls = linesOf(geoOf(q).figs[0]!)
        const n = ls.length
        const heads = ls.map((l) => heading(l.a, l.b))
        expect(Math.max(...heads) - Math.min(...heads)).toBeLessThan(180)
        expect(Number(answer(q))).toBe((n * (n - 1)) / 2)
      }
    })
  })

  it('第 1 档覆盖课本这一节：看图认角、旋转几周、例 1 比大小与 1 周角 = 2 平角 = 4 直角、做一做挑角', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(sigOf(q).split('-')[0]!)
    })
    for (const k of ['name', 'rot', 'turnof', 'cmp', 'rel', 'pick', 'ext']) expect(seen, k).toContain(k)
  })
})

describe('角的度量', () => {
  const KP = 'm4s1-03-measure'

  /** 量角器上的角：两条边对着的位置之差 */
  const proDeg = (p: Pro): number => Math.abs(p.rays[0]!.at - p.rays[1]!.at)

  it('读量角器：答案就是两条边之间的度数；一条边压在左边或右边的 0° 刻度线上，红弧画在两条边之间', () => {
    let n = 0
    each(KP, (q, d) => {
      const s = sigOf(q)
      if (!s.startsWith('read-') && !s.startsWith('ones-')) return
      n++
      const p = proOf(q)
      expect(p.rays).toHaveLength(2)
      expect([0, 180]).toContain(p.rays[0]!.at)
      const deg = proDeg(p)
      expect(s.startsWith('ones-') ? Number(answer(q)) : degAnswer(q)).toBe(deg)
      expect([...p.arc!].sort((a, b) => a - b)).toEqual([p.rays[0]!.at, p.rays[1]!.at].sort((a, b) => a - b))
      // 第 1 档：10° 的整数倍或课本的度数；读屏说明不说度数
      if (d === 1) expect(deg % 10 === 0 || [75, 55, 45, 135].includes(deg), q.id).toBe(true)
      expect(deg % 5).toBe(0)
      expect(p.alt).not.toMatch(new RegExp(`\\b${deg}\\b`))
      // 选项里有「看错圈」的 180 − 度数（不是直角时）
      if (q.input === 'choice' && deg !== 90) expect(q.choices!.map((c) => labelKey(c.label))).toContain(s.startsWith('ones-') ? String(180 - deg) : `${180 - deg}°`)
    })
    expect(n).toBeGreaterThan(100)
  })

  it('1°、1 周角 / 平角 / 直角的度数、量角的步骤、按度数说是什么角', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      const t = textOf(q)
      if (s.startsWith('degof-')) expect(degAnswer(q)).toBe({ full: 360, straight: 180, right: 90 }[s.slice(6)])
      if (s === 'unit-circle') expect(Number(answer(q))).toBe(360)
      if (s === 'unit-half') expect(Number(answer(q))).toBe(180)
      if (s.startsWith('mstep-')) expect(answer(q)).toBe(key({ 'm4.ang.stepCenterQ': 'm4.ang.vertex', 'm4.ang.stepZeroQ': 'm4.ang.aSide', 'm4.ang.stepReadQ': 'm4.ang.degrees' }[t.k]!))
      if (s.startsWith('kind-')) expect(answer(q)).toBe(key(`m4.ang.${KIND_OF(Number(t.p.deg))}`))
    })
  })

  it('两个角比大小：按图上的度数；一样大的两个角边一长一短，不一样大的差 20° 以上、大的那个边短', () => {
    let eq = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('same-')) return
      const [f1, f2] = geoOf(q).figs as [GeoFig, GeoFig]
      const [a, b] = [figDeg(f1), figDeg(f2)]
      const rel = Math.abs(a - b) < 0.5 ? '=' : a > b ? '>' : '<'
      expect(answer(q)).toBe(rel)
      const arm = (f: GeoFig): number => dist(linesOf(f)[0]!.a, linesOf(f)[0]!.b)
      if (rel === '=') {
        eq++
        expect(Math.abs(arm(f1) - arm(f2))).toBeGreaterThan(30)
      } else {
        expect(Math.abs(a - b)).toBeGreaterThanOrEqual(19.5)
        const [big, small] = a > b ? [f1, f2] : [f2, f1]
        expect(arm(big)).toBeLessThan(arm(small))
      }
    })
    expect(eq).toBeGreaterThan(10)
  })

  it('三角尺上的角：标着几的那个角量出来就是答案（30°、45°、60°、90°）', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('ruler-')) return
      const f = geoOf(q).figs[0]!
      const poly = f.items.find((it): it is Extract<GeoItem, { t: 'poly' }> => it.t === 'poly')!
      const n = String(textOf(q).p.n)
      const label = f.items.find((it): it is Extract<GeoItem, { t: 'text' }> => it.t === 'text' && it.text === n)!
      // 标号离哪个顶点最近，就是哪个角
      const i = poly.pts.map((p) => dist(p, label.at)).reduce((bi, x, j, arr) => (x < arr[bi]! ? j : bi), 0)
      const v = poly.pts[i]!
      const deg = between(v, poly.pts[(i + 1) % 3]!, poly.pts[(i + 2) % 3]!)
      expect(Math.round(deg)).toBe(degAnswer(q))
      expect([30, 45, 60, 90]).toContain(degAnswer(q))
    })
  })

  it('三角尺拼角：红弧转过的角就是答案，等于两块尺上两个角的和', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('combo-')) return
      const f = geoOf(q).figs[0]!
      const arc = arcsOf(f)[0]!
      expect(Math.round(ccwTurn(arc))).toBe(degAnswer(q))
      const polys = f.items.filter((it): it is Extract<GeoItem, { t: 'poly' }> => it.t === 'poly')
      expect(polys).toHaveLength(2)
      const angAt = (pts: GeoPt[]): number => between(pts[0]!, pts[1]!, pts[2]!)
      expect(Math.round(angAt(polys[0]!.pts) + angAt(polys[1]!.pts))).toBe(degAnswer(q))
    })
  })

  it('用 180° 减：直线上立一条射线，∠1 + ∠2 = 180°；两条直线相交，相对的角相等、相邻的两个角合起来 180°', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      const t = textOf(q)
      if (s.startsWith('line-')) {
        const f = geoOf(q).figs[0]!
        const [base, ray] = linesOf(f) as [Line, Line]
        const one = between(ray.a, base.b, ray.b) // ∠1：射线和右半边的夹角
        const known = Number(t.p.known) === 1 ? one : 180 - one
        expect(Math.round(known)).toBe(Number(t.p.deg))
        expect(degAnswer(q)).toBe(180 - Number(t.p.deg))
      }
      if (s.startsWith('cross-')) {
        const f = geoOf(q).figs[0]!
        const [l1, l2] = linesOf(f) as [Line, Line]
        const one = Math.round(between([0, 0].map((_, i) => (l1.a[i]! + l1.b[i]!) / 2) as GeoPt, l1.b, l2.b))
        expect(one).toBe(Number(t.p.deg))
        expect(degAnswer(q)).toBe(Number(t.p.ask) === 3 ? one : 180 - one)
      }
      if (s.startsWith('reflex-')) {
        const f = geoOf(q).figs[0]!
        expect(Math.round(figDeg({ ...f, items: f.items.filter((it) => it.t !== 'arc') }))).toBe(Number(t.p.deg))
        expect(degAnswer(q)).toBe(360 - Number(t.p.deg))
      }
    })
  })

  it('第 1 档覆盖课本这一节：量角器读数、∠1 有几个 1°、1 周角多少度、把圆分成 360 份、量角的步骤、按度数认角、做一做 2 比大小', () => {
    const seen = new Set<string>()
    each(KP, (q, d) => {
      if (d === 1) seen.add(sigOf(q).split('-')[0]!)
    })
    for (const k of ['read', 'ones', 'degof', 'unit', 'mstep', 'kind', 'same']) expect(seen, k).toContain(k)
  })
})

describe('画角', () => {
  const KP = 'm4s1-03-draw'

  it('在哪个点画点：射线朝右就是从右边的 0 起数，朝左从左边的 0 起数；只有一个点在对的位置，另一个是看错圈的位置', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('dpoint-')) return
      n++
      const p = proOf(q)
      const deg = Number(textOf(q).p.deg)
      expect(p.rays).toHaveLength(1)
      const left = p.rays[0]!.at === 180
      expect(textOf(q).k).toBe(left ? 'm4.ang.drawLeftQ' : 'm4.ang.drawPointQ')
      const want = left ? 180 - deg : deg
      const pts = p.points!
      expect(pts.filter((x) => x.at === want)).toHaveLength(1)
      expect(answer(q)).toBe(pts.find((x) => x.at === want)!.label)
      if (deg !== 90) expect(pts.map((x) => x.at)).toContain(180 - want)
      // 点从左往右标 A、B、C……，都在外沿 10°–170° 之间，相邻至少隔 10°
      expect(pts.map((x) => x.label)).toEqual(['A', 'B', 'C', 'D'].slice(0, pts.length))
      for (let i = 1; i < pts.length; i++) expect(pts[i - 1]!.at - pts[i]!.at).toBeGreaterThanOrEqual(10)
      for (const x of pts) expect(x.at >= 10 && x.at <= 170).toBe(true)
      expect(p.alt).not.toMatch(new RegExp(`\\b${deg}\\b`))
    })
    expect(n).toBeGreaterThan(80)
  })

  it('以射线 OA 为一条边：答案那个点和 OA 正好差题目的度数，别的点都不是（另一个对的位置不放点）', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('doa-')) return
      n++
      const p = proOf(q)
      const deg = Number(textOf(q).p.deg)
      const oa = p.rays[0]!.at
      expect(p.rays[0]!.label).toBe('A')
      expect(p.center).toBe('O')
      const good = p.points!.filter((x) => Math.abs(x.at - oa) === deg)
      expect(good).toHaveLength(1)
      expect(answer(q)).toBe(good[0]!.label)
      expect(p.points!.map((x) => x.label)).not.toContain('A')
    })
    expect(n).toBeGreaterThan(40)
  })

  it('画角的步骤、画出来是什么角、一副三角尺能拼出的角', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      const t = textOf(q)
      if (s.startsWith('dstep-'))
        expect(answer(q)).toBe(key({ 'm4.ang.drawFirstQ': 'm4.ang.ray', 'm4.ang.drawCenterQ': 'm4.ang.endpoint', 'm4.ang.drawZeroQ': 'm4.ang.theRay', 'm4.ang.drawLastQ': 'm4.ang.ray' }[t.k]!))
      if (s.startsWith('dkind-')) {
        expect(answer(q)).toBe(key(`m4.ang.${KIND_OF(Number(t.p.deg))}`))
        expect(Number(t.p.deg)).toBeLessThanOrEqual(180)
      }
      if (s.startsWith('rdraw-')) {
        const can = t.k === 'm4.ang.rulerCanQ'
        // 一副三角尺的角（30°、45°、60°、90°）两两相加
        const sums = new Set([30, 45, 60, 90].flatMap((a) => [30, 45, 60, 90].map((b) => a + b)))
        const opts = q.choices!.map((c) => Number(labelKey(c.label).replace('°', '')))
        expect(opts.filter((o) => sums.has(o) === can)).toEqual([degAnswer(q)])
      }
      if (s.startsWith('rpair-')) {
        const p = (JSON.parse(answer(q)) as { p: { a: number; b: number } }).p
        expect(p.a + p.b).toBe(Number(t.p.deg))
        expect(zh(JSON.parse(answer(q)) as LStr)).toContain('和')
      }
    })
  })

  it('第 1 档覆盖例 3 与做一做：在哪个点画点（含开口向左）、画角的步骤、画出的是什么角、以 OA 为边', () => {
    const seen = new Set<string>()
    let left = 0
    each(KP, (q, d) => {
      if (d !== 1) return
      seen.add(sigOf(q).split('-')[0]!)
      if (sigOf(q).startsWith('dpoint-') && sigOf(q).includes('-l-')) left++
    })
    for (const k of ['dpoint', 'dstep', 'dkind', 'doa']) expect(seen, k).toContain(k)
    expect(left).toBeGreaterThan(10)
  })
})
