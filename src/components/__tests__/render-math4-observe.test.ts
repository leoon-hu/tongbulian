// @vitest-environment happy-dom
// 四下「观察物体（二）」的新教具：小正方体搭的物体（CubeSolids，斜二测）、看到的图形（CubeViews）。
// 先用手写的数据查画得对（画的顺序、正面是正方形、往后的棱向右上斜、长方体一整条、几幅共用一个格子大小），
// 再挂真实题目查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'
import type { CubeSolid, CubeViewFig, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import CubeSolids from '@/components/math/CubeSolids.vue'
import CubeViews from '@/components/math/CubeViews.vue'
import { OBLIQUE } from '@/content/math/grade4/generators/observe'

afterEach(() => setLang('zh'))

/** 去掉拼音（<rt>）后的文字 */
const shown = (w: { html(): string }): string => w.html().replace(/<rt[^>]*>[^<]*<\/rt>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, '')
type Pt = [number, number]
const pts = (el: DOMWrapper<Element>): Pt[] =>
  el
    .attributes('points')!
    .split(' ')
    .map((s) => s.split(',').map(Number) as Pt)
const span = (p: Pt[]): { w: number; h: number } => ({
  w: Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0])),
  h: Math.max(...p.map((q) => q[1])) - Math.min(...p.map((q) => q[1])),
})
const P1 = [
  [2, 1, 1],
  [1, 1, 1],
]

describe('小正方体搭的物体（CubeSolids）', () => {
  it('一块一块按「从后往前、从下往上、从左往右」画（后画的盖住先画的），个数和高度图一样', () => {
    const w = mount(CubeSolids, { props: { items: [{ rows: P1 }] } })
    const boxes = w.findAll('g.box').map((g) => ({ x: Number(g.attributes('data-x')), d: Number(g.attributes('data-d')), z: Number(g.attributes('data-z')) }))
    expect(boxes).toHaveLength(7)
    for (let i = 1; i < boxes.length; i++) {
      const a = boxes[i - 1]!
      const b = boxes[i]!
      expect(a.d > b.d || (a.d === b.d && (a.z < b.z || (a.z === b.z && a.x < b.x)))).toBe(true)
    }
    // 后排左边那一摞有 2 层：d = 1、x = 0 的有 z = 0、1
    expect(boxes.filter((b) => b.d === 1 && b.x === 0).map((b) => b.z)).toEqual([0, 1])
    expect(w.findAll('g.box.bar')).toHaveLength(0)
    expect(w.find('.solids').attributes('aria-label')).toBe('小正方体搭的物体')
    expect(w.find('figcaption').exists()).toBe(false)
    w.unmount()
  })

  it('斜二测：正面是正方形，顶面往右上斜（往后一格挪 K 格）', () => {
    const w = mount(CubeSolids, { props: { items: [{ rows: [[1]] }] } })
    const front = pts(w.find('polygon.front'))
    const top = pts(w.find('polygon.top'))
    const s = span(front).w
    expect(span(front).h).toBeCloseTo(s, 0)
    // 顶面：前边就是正面的上边，后边往右、往上各挪 K·s
    expect(span(top).w).toBeCloseTo(s * (1 + OBLIQUE), 0)
    expect(span(top).h).toBeCloseTo(s * OBLIQUE, 0)
    expect(Math.min(...top.map((p) => p[1]))).toBeLessThan(Math.min(...front.map((p) => p[1])))
    expect(span(pts(w.find('polygon.right'))).w).toBeCloseTo(s * OBLIQUE, 0)
    w.unmount()
  })

  it('正方体和长方体（练习四 2）：长方体一整块（3 个那么长）、正方体在它上面', () => {
    const w = mount(CubeSolids, { props: { items: [{ bar: 3, on: 0 }] as CubeSolid[] } })
    const gs = w.findAll('g.box')
    expect(gs).toHaveLength(2)
    expect(gs[0]!.classes()).toContain('bar')
    expect(gs[0]!.attributes('data-w')).toBe('3')
    expect(gs[1]!.classes()).toContain('cube')
    expect([gs[1]!.attributes('data-x'), gs[1]!.attributes('data-z')]).toEqual(['0', '1'])
    const bar = span(pts(gs[0]!.find('polygon.front')))
    expect(bar.w).toBeCloseTo(bar.h * 3, 0)
    expect(w.find('.solids').attributes('aria-label')).toBe('正方体和长方体')
    w.unmount()
  })

  it('几个并排共用一个格子大小，numbered 时下面标 1、2、3；四个以上换小号', () => {
    const items = [{ rows: [[1]] }, { rows: [[2, 1, 1]] }, { rows: [[1, 1, 3]] }]
    const w = mount(CubeSolids, { props: { items, numbered: true } })
    const sizes = w.findAll('polygon.front').map((p) => Math.round(span(pts(p)).w))
    expect(new Set(sizes).size).toBe(1)
    expect(w.findAll('figcaption').map((f) => f.text())).toEqual(['1', '2', '3'])
    expect(w.find('.solids').classes()).toContain('many')
    expect(w.find('.solids').classes()).not.toContain('crowd')
    w.unmount()
    const six = mount(CubeSolids, { props: { items: [...items, ...items], numbered: true } })
    expect(six.find('.solids').classes()).toContain('crowd')
    six.unmount()
  })
})

describe('看到的图形（CubeViews）', () => {
  const lFig: CubeViewFig = {
    blocks: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
  }

  it('一块一个正方形，从下往上数：第 0 行画在最下面', () => {
    const w = mount(CubeViews, { props: { items: [lFig] } })
    const rects = w.findAll('rect')
    expect(rects).toHaveLength(3)
    const at = (x: number, y: number): DOMWrapper<Element> => rects.find((r) => r.attributes('data-x') === String(x) && r.attributes('data-y') === String(y))!
    expect(Number(at(0, 0).attributes('y'))).toBeGreaterThan(Number(at(0, 1).attributes('y')))
    expect(Number(at(1, 0).attributes('x'))).toBeGreaterThan(Number(at(0, 0).attributes('x')))
    expect(at(0, 0).attributes('width')).toBe(at(0, 0).attributes('height'))
    expect(w.findAll('.cube')).toHaveLength(3)
    expect(w.find('.cviews').attributes('aria-label')).toBe('看到的图形')
    expect(w.find('figcaption').exists()).toBe(false)
    w.unmount()
  })

  it('长方体那一面是一整条橙色；几幅共用一个格子大小、标号', () => {
    const bar: CubeViewFig = { blocks: [{ x: 0, y: 0, w: 3, tone: 'bar' }, { x: 0, y: 1 }] }
    const w = mount(CubeViews, { props: { items: [bar, lFig], numbered: true } })
    const b = w.find('rect.bar')
    expect(Number(b.attributes('width'))).toBeCloseTo(Number(b.attributes('height')) * 3, 5)
    const cells = w.findAll('rect.cube').map((r) => r.attributes('width'))
    expect(new Set(cells).size).toBe(1)
    expect(w.findAll('.num').map((f) => f.text())).toEqual(['1', '2'])
    w.unmount()
  })

  it('图下面写「从前面看」（注音），英文写 From the front；三幅带字的排得下一行（格子缩小）', () => {
    const cap = (s: string): CubeViewFig => ({ ...lFig, caption: { k: `m4.obs.side.${s}` } })
    const four: CubeViewFig = { blocks: [0, 1, 2, 3].map((x) => ({ x, y: 0 })), caption: { k: 'm4.obs.side.front' } }
    const w = mount(CubeViews, { props: { items: [four, cap('top'), cap('left')] } })
    expect(w.findAll('.cap').map((c) => shown(c))).toEqual(['从前面看', '从上面看', '从左面看'])
    expect(w.find('.cap rt').exists()).toBe(true)
    const cell = Number(w.find('rect').attributes('width'))
    expect(cell).toBeLessThanOrEqual(24)
    expect(cell).toBeGreaterThanOrEqual(12)
    w.unmount()
    setLang('en')
    const en = mount(CubeViews, { props: { items: [cap('front')] } })
    expect(en.find('.cap').text()).toBe('From the front')
    expect(en.find('.cviews').attributes('aria-label')).toBe('shape seen')
    en.unmount()
  })
})

describe('QuestionRenderer 转发物体、图形的全部字段（真实题目）', () => {
  function find(kind: 'cube-solids' | 'cube-views', ok: (p: StemPart) => boolean = () => true): { q: Question; part: StemPart }[] {
    const out: { q: Question; part: StemPart }[] = []
    for (const kp of ['m4s2-02-positions', 'm4s2-02-objects']) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 150 && out.length < 24; seed++) {
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          const part = q.stem.find((p) => p.kind === kind && ok(p))
          if (part) out.push({ q, part })
        }
      }
    }
    expect(out.length).toBeGreaterThan(0)
    return out
  }
  const cubes = (s: CubeSolid): number => ('bar' in s ? 2 : s.rows.flat().reduce((a, b) => a + b, 0))

  it('物体：几个物体、每个几块、标不标号', () => {
    const cases = [
      ...find('cube-solids'),
      ...find('cube-solids', (p) => p.kind === 'cube-solids' && !!p.numbered),
      ...find('cube-solids', (p) => p.kind === 'cube-solids' && p.items.some((s) => 'bar' in s)),
    ]
    for (const { q, part } of cases) {
      if (part.kind !== 'cube-solids') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      const figs = w.findAll('.solids .solid')
      expect(figs, q.id).toHaveLength(part.items.length)
      part.items.forEach((s, i) => expect(figs[i]!.findAll('g.box'), q.id).toHaveLength(cubes(s)))
      expect(w.findAll('.solids figcaption'), q.id).toHaveLength(part.numbered ? part.items.length : 0)
      expect(w.find('g.box.bar').exists(), q.id).toBe(part.items.some((s) => 'bar' in s))
      w.unmount()
    }
  })

  it('图形：几幅、每幅几块、标号、图下面的字', () => {
    const cases = [
      ...find('cube-views'),
      ...find('cube-views', (p) => p.kind === 'cube-views' && !!p.numbered),
      ...find('cube-views', (p) => p.kind === 'cube-views' && p.items.some((f) => !!f.caption)),
      ...find('cube-views', (p) => p.kind === 'cube-views' && p.items.some((f) => f.blocks.some((b) => b.tone === 'bar'))),
    ]
    for (const { q, part } of cases) {
      if (part.kind !== 'cube-views') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      const figs = w.findAll('.cviews .cview')
      expect(figs, q.id).toHaveLength(part.items.length)
      part.items.forEach((f, i) => {
        expect(figs[i]!.findAll('rect'), q.id).toHaveLength(f.blocks.length)
        expect(figs[i]!.findAll('rect.bar'), q.id).toHaveLength(f.blocks.filter((b) => b.tone === 'bar').length)
      })
      expect(w.findAll('.cviews .num'), q.id).toHaveLength(part.numbered ? part.items.length : 0)
      expect(w.findAll('.cviews .cap'), q.id).toHaveLength(part.items.filter((f) => f.caption).length)
      w.unmount()
    }
  })
})
