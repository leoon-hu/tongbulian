// @vitest-environment happy-dom
// 五上「六 多边形的面积」「☆ 有趣的密铺」的专项渲染检查，以及五年级给 GeoFigure 加的两样可选的东西：
// dot 的 r（画成圆）、line 的 dim（尺寸线）。原来的用法画得和以前一样。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { GeoFig, Question, StemPart } from '@/types/models'
import { setLang } from '@/engine/i18n'
import GeoFigure from '@/components/math/GeoFigure.vue'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'

afterEach(() => setLang('zh'))

describe('GeoFigure：五年级加的圆与尺寸线', () => {
  it('dot 给了 r 画成圆（涂色在下、边在上），不画黑点；label 挪到圆外', () => {
    const fig: GeoFig = {
      w: 100,
      h: 60,
      items: [
        { t: 'dot', at: [30, 30], r: 20, fill: 'a', label: 'O', side: 'e' },
        { t: 'dot', at: [80, 30], r: 10, stroke: 'b', dash: true, thin: true },
        { t: 'dot', at: [60, 50], label: 'A' },
      ],
    }
    const w = mount(GeoFigure, { props: { figs: [fig], alt: '两个圆' } })
    const fills = w.findAll('circle.fill')
    expect(fills).toHaveLength(1)
    expect(fills[0]!.classes()).toContain('f-a')
    const rings = w.findAll('circle.stroke')
    expect(rings).toHaveLength(2)
    expect(rings[1]!.classes()).toEqual(expect.arrayContaining(['s-b', 'dash', 'thin']))
    // 圆不画黑点，普通的点照旧是一个黑点
    expect(w.findAll('circle.dot')).toHaveLength(1)
    const r0 = Number(rings[0]!.attributes('r'))
    const r1 = Number(rings[1]!.attributes('r'))
    expect(r0 / r1).toBeCloseTo(2, 1)
    // 字母在圆外：离圆心比半径远
    const o = w.findAll('svg text').find((t) => t.text() === 'O')!
    const cx = Number(fills[0]!.attributes('cx'))
    expect(Number(o.attributes('x')) - cx).toBeGreaterThan(r0)
    w.unmount()
  })

  it('line 给了 dim 画成尺寸线：一条细线带两个箭头、两头引线，中间写字；不画普通的线', () => {
    const fig: GeoFig = { w: 120, h: 60, items: [{ t: 'poly', pts: [[10, 20], [110, 20], [110, 50], [10, 50]] }, { t: 'line', a: [10, 20], b: [110, 20], dim: '18', off: 16 }] }
    const w = mount(GeoFigure, { props: { figs: [fig], alt: '长方形' } })
    const dim = w.findAll('path.dimline')
    expect(dim).toHaveLength(1)
    const d = dim[0]!.attributes('d')!
    // 主线 + 两条引线 + 两个箭头 = 5 段（M 开头）
    expect(d.match(/M /g)).toHaveLength(5)
    const txt = w.findAll('svg text').find((t) => t.text() === '18')!
    expect(txt.classes()).toContain('dimtxt')
    // a→b 朝右、off 为正：画在线段上面（y 更小）
    const ys = w.findAll('path.stroke').filter((p) => !p.classes().includes('dimline'))
    expect(ys).toHaveLength(1)
    expect(Number(txt.attributes('y'))).toBeLessThan(30)
    w.unmount()
  })

  it('off 为正画在从 a 走向 b 的左手边：a→b 朝下时在右边，为负时在左边', () => {
    const fig: GeoFig = {
      w: 100,
      h: 100,
      items: [
        { t: 'line', a: [50, 10], b: [50, 90], dim: '8', off: 20 },
        { t: 'line', a: [50, 10], b: [50, 90], dim: '9', off: -20 },
      ],
    }
    const w = mount(GeoFigure, { props: { figs: [fig], alt: '' } })
    const x = (s: string): number => Number(w.findAll('svg text').find((t) => t.text() === s)!.attributes('x'))
    expect(x('8')).toBeGreaterThan(x('9'))
    w.unmount()
  })

  it('尺寸线太短放不下字时字挪到外侧（不压线）；off 为 0 时两头画短竖线', () => {
    const fig: GeoFig = { w: 40, h: 40, items: [{ t: 'line', a: [10, 30], b: [24, 30], dim: '1.6' }] }
    const w = mount(GeoFigure, { props: { figs: [fig], alt: '' } })
    const txt = w.findAll('svg text').find((t) => t.text() === '1.6')!
    expect(txt.classes()).not.toContain('dimtxt')
    expect(w.find('path.dimline').attributes('d')!.match(/M /g)).toHaveLength(5)
    w.unmount()
  })

  it('不用新参数时画得和以前一样（线、点没有多出东西）', () => {
    const fig: GeoFig = { w: 50, h: 50, items: [{ t: 'line', a: [0, 0], b: [40, 40], dots: [true, true] }, { t: 'dot', at: [20, 5], label: 'P' }] }
    const w = mount(GeoFigure, { props: { figs: [fig], alt: '' } })
    expect(w.findAll('path.dimline')).toHaveLength(0)
    expect(w.findAll('circle.dot')).toHaveLength(3)
    expect(w.findAll('circle.stroke')).toHaveLength(0)
    w.unmount()
  })
})

// ── 真实题目的渲染：每幅图都画出来，编号、边上的数、尺寸线的数都在，说明只给读屏；手机竖屏放得下 ──

type Geo = Extract<StemPart, { kind: 'geo' }>
const KPS = ['m5s1-06-parallelogram', 'm5s1-06-hectare', 'm5s1-06-triangle', 'm5s1-06-trapezoid', 'm5s1-06-composite', 'm5s1-06-irregular', 'm5s1-07-tiling']

describe('多边形的面积、有趣的密铺：真实题目的渲染', () => {
  for (const kp of KPS) {
    it(`${kp}：图都画出来，编号、标的数、尺寸线、圆都在，说明不显示；中英文都能挂`, () => {
      const gen = getGenerator(kp)!
      let figs = 0
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 12; seed++)
          for (const d of [1, 2, 3] as const) {
            const q: Question = gen(d, createRng(seed * 13 + d))
            const w = mount(QuestionRenderer, { props: { question: q } })
            expect(w.html(), q.id).not.toMatch(/NaN|undefined/)
            expect(w.text(), q.id).not.toMatch(/\bm5\.[a-zA-Z]/)
            for (const part of q.stem.filter((p): p is Geo => p.kind === 'geo')) {
              figs += part.figs.length
              expect(w.findAll('svg.geo-svg').length, q.id).toBe(part.figs.length)
              const caps = w.findAll('.geo-fig figcaption').map((c) => c.text())
              expect(caps, q.id).toEqual(part.numbered ? part.figs.map((_, i) => String(i + 1)) : [])
              const shown = w.findAll('svg text').map((t) => t.text())
              let rings = 0
              let dims = 0
              for (const fig of part.figs)
                for (const it of fig.items) {
                  if (it.t === 'poly') for (const l of it.labels ?? []) if (l) expect(shown, q.id).toContain(l)
                  if (it.t === 'text') expect(shown, q.id).toContain(it.text)
                  if (it.t === 'line' && it.dim) {
                    expect(shown, q.id).toContain(it.dim)
                    dims++
                  }
                  if (it.t === 'dot' && it.r) rings++
                }
              expect(w.findAll('circle.stroke').length, q.id).toBe(rings)
              expect(w.findAll('path.dimline').length, q.id).toBe(dims)
              expect(w.text()).not.toContain(part.alt)
              expect(w.find('.geo').attributes('aria-label')).toBe(part.alt)
              for (const svg of w.findAll('svg.geo-svg')) {
                expect(Number(svg.attributes('width')), q.id).toBeLessThanOrEqual(part.figs.length > 1 ? 340 : 301)
                expect(Number(svg.attributes('height')), q.id).toBeLessThanOrEqual(191)
              }
            }
            w.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            panel.unmount()
          }
      }
      if (kp !== 'm5s1-06-hectare') expect(figs).toBeGreaterThan(10)
    })
  }
})
