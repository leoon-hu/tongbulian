// @vitest-environment happy-dom
// 三年级「线和角」「长方形和正方形」「图形的面积」的几何图（GeoFigure，kind: 'geo'）专项渲染检查：
// 真实题目挂上去看得到每一幅图、编号、边上标的数；再用几幅手写的图查标注的位置、方格的外沿和缩放。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { GeoFig, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import GeoFigure from '@/components/math/GeoFigure.vue'

afterEach(() => setLang('zh'))

const KPS = [
  'm3s1-07-lines',
  'm3s1-07-angles',
  'm3s1-07-angle-kinds',
  'm3s2-03-polygons',
  'm3s2-03-rect-features',
  'm3s2-03-perimeter',
  'm3s2-03-rect-perimeter',
  'm3s2-04-area-units',
  'm3s2-04-rect-area',
  'm3s2-04-area-convert',
]
type Geo = Extract<StemPart, { kind: 'geo' }>

describe('几何图：真实题目的渲染', () => {
  for (const kp of KPS) {
    it(`${kp}：每幅图都画出来，编号、边上的数都在，图的说明不显示；中英文都能挂`, () => {
      const gen = getGenerator(kp)!
      let figs = 0
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 8; seed++)
          for (const d of [1, 2, 3] as const) {
            const q: Question = gen(d, createRng(seed * 13 + d))
            const w = mount(QuestionRenderer, { props: { question: q } })
            const html = w.html()
            expect(html, q.id).not.toMatch(/NaN|undefined/)
            for (const part of q.stem.filter((p): p is Geo => p.kind === 'geo')) {
              figs += part.figs.length
              expect(w.findAll('.geo-fig').length, q.id).toBe(part.figs.length)
              expect(w.findAll('svg.geo-svg').length).toBe(part.figs.length)
              const caps = w.findAll('.geo-fig figcaption').map((c) => c.text())
              expect(caps, q.id).toEqual(part.numbered ? part.figs.map((_, i) => String(i + 1)) : [])
              const shown = w.findAll('svg text').map((t) => t.text())
              for (const fig of part.figs)
                for (const it of fig.items) {
                  if (it.t === 'poly') for (const l of it.labels ?? []) if (l) expect(shown, q.id).toContain(l)
                  if (it.t === 'text' || (it.t === 'dot' && it.label)) expect(shown, q.id).toContain(it.t === 'text' ? it.text : it.label)
                }
              // 说明文字只给静态页和读屏（aria-label），页面上看不到
              expect(w.text()).not.toContain(part.alt)
              expect(w.find('.geo').attributes('aria-label')).toBe(part.alt)
              // 每幅图都在 300 × 210 以内（手机竖屏放得下）
              for (const svg of w.findAll('svg.geo-svg')) {
                expect(Number(svg.attributes('width'))).toBeLessThanOrEqual(part.figs.length > 1 ? 340 : 301)
                expect(Number(svg.attributes('height'))).toBeLessThanOrEqual(191)
              }
            }
            w.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            panel.unmount()
          }
      }
      if (kp !== 'm3s2-04-area-convert') expect(figs).toBeGreaterThan(10)
    })
  }
})

/** 找到画着某段文字的 <text> 的坐标 */
function textAt(w: ReturnType<typeof mount>, s: string): { x: number; y: number } {
  const t = w.findAll('svg text').find((e) => e.text() === s)!
  expect(t, s).toBeDefined()
  return { x: Number(t.attributes('x')), y: Number(t.attributes('y')) }
}

describe('几何图：画法', () => {
  it('长方形四条边的数标在外面：上边的在上面、右边的在右边……', () => {
    const fig: GeoFig = {
      w: 200,
      h: 100,
      items: [
        {
          t: 'poly',
          pts: [
            [0, 0],
            [200, 0],
            [200, 100],
            [0, 100],
          ],
          labels: ['11', '22', '33', '44'],
        },
      ],
    }
    const w = mount(GeoFigure, { props: { figs: [fig] } })
    const pad = 20 // 一幅图时四周的留白
    expect(textAt(w, '11').y).toBeLessThan(pad)
    expect(textAt(w, '22').x).toBeGreaterThan(pad + 200)
    expect(textAt(w, '33').y).toBeGreaterThan(pad + 100)
    expect(textAt(w, '44').x).toBeLessThan(pad)
    w.unmount()
  })

  it('凹进去的口子：口子两壁的数标在口子里（图形外面），不压在图形上', () => {
    // 上边中间挖进一个口：(40..80) 宽、40 深，顶点顺时针
    const pts: [number, number][] = [
      [0, 0],
      [40, 0],
      [40, 40],
      [80, 40],
      [80, 0],
      [120, 0],
      [120, 100],
      [0, 100],
    ]
    const fig: GeoFig = { w: 120, h: 100, items: [{ t: 'poly', pts, labels: [null, '7', '8', '9', null, null, null, null] }] }
    const w = mount(GeoFigure, { props: { figs: [fig] } })
    const pad = 20
    const inNotch = (p: { x: number; y: number }): boolean => p.x > pad + 40 && p.x < pad + 80 && p.y < pad + 40
    expect(inNotch(textAt(w, '7'))).toBe(true)
    expect(inNotch(textAt(w, '8'))).toBe(true)
    expect(inNotch(textAt(w, '9'))).toBe(true)
    w.unmount()
  })

  it('方格：涂色的格子一格一块，外沿的边一共和图形的周长一样多', () => {
    const cells: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ]
    const fig: GeoFig = { w: 5, h: 4, px: 20, items: [{ t: 'grid', x: 1, y: 1, w: 3, h: 2, cells }] }
    const w = mount(GeoFigure, { props: { figs: [fig] } })
    expect(w.findAll('rect.cell')).toHaveLength(4)
    const outline = w.find('path.outline').attributes('d')!
    expect(outline.match(/M/g)).toHaveLength(10) // T 形四连方的周长是 10
    w.unmount()
  })

  it('太大的图等比缩小到 300 宽以内；几幅图共用一个比例', () => {
    const big: GeoFig = { w: 1000, h: 100, items: [{ t: 'line', a: [0, 50], b: [1000, 50] }] }
    const w1 = mount(GeoFigure, { props: { figs: [big] } })
    expect(Number(w1.find('svg').attributes('width'))).toBeLessThanOrEqual(300)
    w1.unmount()
    const a: GeoFig = { w: 100, h: 50, items: [{ t: 'dot', at: [50, 25] }] }
    const b: GeoFig = { w: 200, h: 50, items: [{ t: 'dot', at: [100, 25] }] }
    const w2 = mount(GeoFigure, { props: { figs: [a, b], numbered: true } })
    const [wa, wb] = w2.findAll('svg').map((s) => Number(s.attributes('width')) - 20) as [number, number]
    expect(wb / wa).toBeCloseTo(2, 1)
    expect(w2.findAll('figcaption').map((c) => c.text())).toEqual(['1', '2'])
    w2.unmount()
  })
})
