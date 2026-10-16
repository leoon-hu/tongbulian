// @vitest-environment happy-dom
// 六年级数学 H 的教具：正比例 / 反比例图象（PropGraph）、线段比例尺（ScaleBar）。
// 先用手写的数据查画得对（点的位置和数成比例、直线过 0 点、延长到方格边上、反比例的曲线经过各点、刻度、轴名、读图的虚线和「?」、
// 描出的点、名字；比例尺的 0、每段的数、单位、要填的「?」），再挂真实题目查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import PropGraph from '@/components/math/PropGraph.vue'
import ScaleBar from '@/components/math/ScaleBar.vue'

afterEach(() => setLang('zh'))

const num = (s: string | undefined): number => Number(s)
const texts = (w: ReturnType<typeof mount>, sel: string): string[] => w.findAll(sel).map((t) => t.text())
/** 课本 p44 彩带的图象：每格 1 米、3.5 元 */
const ribbon = {
  x: { name: { k: 'm6.prop.h.qtyM' }, step: 1, cells: 16, every: 2 },
  y: { name: { k: 'm6.prop.h.total' }, step: 3.5, cells: 14, every: 2 },
  series: [{ pts: Array.from({ length: 8 }, (_, i) => [i + 1, (i + 1) * 3.5] as [number, number]), line: 'origin' as const }],
}

describe('正比例 / 反比例图象（PropGraph）', () => {
  it('点的位置和数成比例；直线从 0 点画到最后一个点；刻度每两格标一个数；原点写 0；两条轴的名字', () => {
    const w = mount(PropGraph, { props: ribbon })
    const dots = w.findAll('circle.pt')
    expect(dots).toHaveLength(8)
    const xs = dots.map((d) => num(d.attributes('cx')))
    const ys = dots.map((d) => num(d.attributes('cy')))
    // 横向等距，纵向也等距（3.5 元一格）
    for (let i = 2; i < 8; i++) {
      expect(xs[i]! - xs[i - 1]!).toBeCloseTo(xs[1]! - xs[0]!, 5)
      expect(ys[i - 1]! - ys[i]!).toBeCloseTo(ys[0]! - ys[1]!, 5)
    }
    // 直线：从 0 点（第一个点往左下再退一格）到 (8, 28)
    const d = w.find('path.line').attributes('d')!
    const [x0, y0, x1, y1] = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(x0).toBeCloseTo(xs[0]! - (xs[1]! - xs[0]!), 1)
    expect(y0).toBeCloseTo(ys[0]! + (ys[0]! - ys[1]!), 1)
    expect(x1).toBeCloseTo(xs[7]!, 1)
    expect(y1).toBeCloseTo(ys[7]!, 1)
    expect(texts(w, 'text.tick-y')).toEqual(['7', '14', '21', '28', '35', '42', '49'])
    expect(texts(w, 'text.tick-x')).toEqual(['2', '4', '6', '8', '10', '12', '14', '16'])
    expect(texts(w, 'text.origin')).toEqual(['0'])
    expect(texts(w, 'text.axis-name')).toEqual(['总价/元', '数量/米'])
    // 方格：每格一条竖线、一条横线
    expect(w.findAll('line.grid')).toHaveLength(16 + 14)
    expect(w.find('path.guide').exists()).toBe(false)
    expect(w.find('svg').attributes('aria-label')).toBe('图象')
    expect(w.find('svg').attributes('data-ystep')).toBe('3.5')
    w.unmount()
  })

  it('extend：直线延长到方格的边上；guide：从横轴上的 9 画到线上再到纵轴，纵轴那头画「?」；marks：空心圈', () => {
    const w = mount(PropGraph, { props: { ...ribbon, series: [{ ...ribbon.series[0]!, extend: true }], guide: { x: 9 }, marks: [[10, 35]] as [number, number][] } })
    const dots = w.findAll('circle.pt')
    const unitX = num(dots[1]!.attributes('cx')) - num(dots[0]!.attributes('cx'))
    const unitY = num(dots[0]!.attributes('cy')) - num(dots[1]!.attributes('cy'))
    const ox = num(dots[0]!.attributes('cx')) - unitX
    const oy = num(dots[0]!.attributes('cy')) + unitY
    // 方格顶是 49 元（14 米），比右边 16 米先到：直线画到 (14, 49)
    const [, , ex, ey] = w.find('path.line').attributes('d')!.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(ex).toBeCloseTo(ox + 14 * unitX, 1)
    expect(ey).toBeCloseTo(oy - 14 * unitY, 1)
    // 虚线：从 (9, 0) 上到 (9, 31.5)，再到纵轴
    const g = w.find('path.guide').attributes('d')!.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(g[0]).toBeCloseTo(ox + 9 * unitX, 1)
    expect(g[3]).toBeCloseTo(oy - 9 * unitY, 1)
    expect(g[4]).toBeCloseTo(ox, 1)
    expect(texts(w, 'text.ask')).toEqual(['?'])
    const mark = w.find('circle.mark')
    expect(num(mark.attributes('cx'))).toBeCloseTo(ox + 10 * unitX, 1)
    expect(num(mark.attributes('cy'))).toBeCloseTo(oy - 10 * unitY, 1)
    w.unmount()
  })

  it('反比例：曲线经过每个点（x × y 一样），从方格顶上画到右边；guide 从纵轴上的数画到线上再到横轴', () => {
    const props = {
      x: { name: { k: 'm6.prop.h.baseArea' }, step: 5, cells: 13 },
      y: { name: { k: 'm6.prop.h.waterH' }, step: 5, cells: 13 },
      series: [{ pts: [[10, 30], [15, 20], [20, 15], [30, 10], [60, 5]] as [number, number][], line: 'curve' as const, extend: true }],
      guide: { y: 20 },
    }
    const w = mount(PropGraph, { props })
    const path = w.find('path.line.curve').attributes('d')!
    const pts = [...path.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])] as [number, number])
    expect(pts.length).toBeGreaterThan(40)
    // 每个点都在曲线上：在折线上按横坐标插值，纵坐标差不到 1 像素
    for (const dot of w.findAll('circle.pt')) {
      const cx = num(dot.attributes('cx'))
      const cy = num(dot.attributes('cy'))
      const i = pts.findIndex(([x], k) => k > 0 && x >= cx)
      const [xa, ya] = pts[i - 1]!
      const [xb, yb] = pts[i]!
      expect(Math.abs(ya + ((yb - ya) * (cx - xa)) / (xb - xa) - cy)).toBeLessThan(1)
    }
    // 曲线从方格顶上开始：第一个点的纵坐标就是方格的顶
    const tops = w.findAll('line.grid').map((l) => num(l.attributes('y1')))
    expect(pts[0]![1]).toBeCloseTo(Math.min(...tops), 0)
    // guide 是纵轴上 20 → 线上 (15, 20) → 横轴
    const dot15 = w.findAll('circle.pt')[1]!
    const g = w.find('path.guide').attributes('d')!.match(/-?\d+(\.\d+)?/g)!.map(Number)
    expect(g[2]).toBeCloseTo(num(dot15.attributes('cx')), 1)
    expect(g[3]).toBeCloseTo(num(dot15.attributes('cy')), 1)
    w.unmount()
  })

  it('两组线：名字写在线的末端，颜色不同', () => {
    const w = mount(PropGraph, {
      props: {
        x: { name: { k: 'm6.prop.h.minutes' }, step: 5, cells: 6 },
        y: { name: { k: 'm6.prop.h.distKm' }, step: 4, cells: 6 },
        series: [
          { name: { k: 'm6.prop.d.zebra' }, tone: 'blue' as const, pts: [[10, 12], [20, 24]] as [number, number][], line: 'origin' as const },
          { name: { k: 'm6.prop.d.deer' }, tone: 'orange' as const, pts: [[15, 12], [30, 24]] as [number, number][], line: 'origin' as const },
        ],
      },
    })
    expect(texts(w, 'text.series-name')).toEqual(['斑马', '梅花鹿'])
    expect(w.findAll('path.line.blue')).toHaveLength(1)
    expect(w.findAll('path.line.orange')).toHaveLength(1)
    w.unmount()
    setLang('en')
    const en = mount(PropGraph, { props: ribbon })
    expect(texts(en, 'text.axis-name')).toEqual(['Total price (yuan)', 'Amount (m)'])
    en.unmount()
  })
})

describe('线段比例尺（ScaleBar）', () => {
  it('一段：左端 0、右端 50、单位千米；要填的写「?」；两段写 0、600、1200', () => {
    const w = mount(ScaleBar, { props: { per: 50, unit: { k: 'm6.prop.u.km' } } })
    expect(texts(w, 'text.label')).toEqual(['0', '50'])
    expect(w.find('text.unit').text()).toBe('千米')
    expect(w.findAll('line.tick')).toHaveLength(2)
    expect(w.find('svg').attributes('aria-label')).toBe('线段比例尺')
    w.unmount()
    const blank = mount(ScaleBar, { props: { unit: { k: 'm6.prop.u.m' } } })
    expect(texts(blank, 'text.label')).toEqual(['0', '?'])
    expect(blank.findAll('text.label.ask')).toHaveLength(1)
    expect(blank.find('text.unit').text()).toBe('米')
    blank.unmount()
    const two = mount(ScaleBar, { props: { per: 600, segs: 2, unit: { k: 'm6.prop.u.m' } } })
    expect(texts(two, 'text.label')).toEqual(['0', '600', '1200'])
    expect(two.findAll('line.tick')).toHaveLength(3)
    two.unmount()
  })
})

describe('QuestionRenderer 转发六年级数学 H 的字段（真实题目）', () => {
  function find<K extends 'prop-graph' | 'scale-bar'>(kpIds: string[], kind: K): { q: Question; part: Extract<StemPart, { kind: K }> }[] {
    const out: { q: Question; part: Extract<StemPart, { kind: K }> }[] = []
    for (const kpId of kpIds) {
      const gen = getGenerator(kpId)!
      for (let seed = 1; seed <= 300 && out.length < 30; seed++) {
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          const part = q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === kind)
          if (part) out.push({ q, part })
        }
      }
    }
    expect(out.length).toBeGreaterThan(0)
    return out
  }

  it('图象：点数、描出的点、虚线、刻度的格数', () => {
    for (const { q, part } of find(['m6s2-05-direct', 'm6s2-05-inverse'], 'prop-graph')) {
      const w = mount(QuestionRenderer, { props: { question: q } })
      const svg = w.find('.prop-graph svg')
      expect(svg.attributes('data-xstep'), q.id).toBe(String(part.x.step))
      expect(svg.attributes('data-ycells'), q.id).toBe(String(part.y.cells))
      expect(w.findAll('.prop-graph circle.pt'), q.id).toHaveLength(part.series.reduce((a, s) => a + s.pts.length, 0))
      expect(w.findAll('.prop-graph circle.mark'), q.id).toHaveLength(part.marks?.length ?? 0)
      expect(w.find('.prop-graph path.guide').exists(), q.id).toBe(!!part.guide)
      expect(w.findAll('.prop-graph text.series-name'), q.id).toHaveLength(part.series.filter((s) => s.name).length)
      w.unmount()
    }
  })

  it('线段比例尺：每段的数、单位、要填的「?」', () => {
    for (const { q, part } of find(['m6s2-05-scale', 'm6s2-05-scale-use'], 'scale-bar')) {
      const w = mount(QuestionRenderer, { props: { question: q } })
      const labels = texts(w, '.scale-bar text.label')
      expect(labels[0], q.id).toBe('0')
      expect(labels[labels.length - 1], q.id).toBe(part.per === undefined ? '?' : String(part.per * (part.segs ?? 1)))
      expect(w.find('.scale-bar text.unit').text(), q.id).toMatch(/^(千米|米)$/)
      w.unmount()
    }
  })
})
