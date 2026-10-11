// @vitest-environment happy-dom
// 五上「观察简单组合体」、五下「观察物体（三）」用到的教具：CubeViews 加的「格子里写数」（标数的俯视图，cube-top 部件）、
// 只加载五年级时 CubeSolids / CubeViews 的读屏文字（四年级的 m4.* 词条不在也不出键名）；再挂真实题目查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CubeSolid, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { hasEntry, setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import CubeSolids from '@/components/math/CubeSolids.vue'
import CubeViews from '@/components/math/CubeViews.vue'

afterEach(() => setLang('zh'))

const KPS = ['m5s1-01-observe', 'm5s1-01-restore', 'm5s2-01-arrange', 'm5s2-01-restore']
function find(kind: StemPart['kind'], ok: (p: StemPart) => boolean = () => true): { q: Question; part: StemPart }[] {
  const out: { q: Question; part: StemPart }[] = []
  for (const kp of KPS) {
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 150 && out.length < 30; seed++) {
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

describe('CubeViews 的格子里写数（标数的俯视图）', () => {
  it('nums 和 blocks 一一对应，每块写一个数、浅色底；不传 nums 和原来一样', () => {
    const blocks = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]
    const w = mount(CubeViews, { props: { items: [{ blocks }], nums: [[3, 1, 1, 2]] } })
    expect(w.findAll('rect')).toHaveLength(4)
    expect(w.findAll('rect.numbered')).toHaveLength(4)
    expect(w.findAll('text.cell-n').map((t) => t.text())).toEqual(['3', '1', '1', '2'])
    // 数写在自己那一块的正中间
    const r = w.findAll('rect')[0]!
    const t = w.findAll('text.cell-n')[0]!
    expect(Number(t.attributes('x'))).toBeCloseTo(Number(r.attributes('x')) + Number(r.attributes('width')) / 2, 5)
    expect(Number(t.attributes('y'))).toBeCloseTo(Number(r.attributes('y')) + Number(r.attributes('height')) / 2, 5)
    w.unmount()
    const plain = mount(CubeViews, { props: { items: [{ blocks }] } })
    expect(plain.findAll('text.cell-n')).toHaveLength(0)
    expect(plain.findAll('rect.numbered')).toHaveLength(0)
    plain.unmount()
  })

  it('只加载五年级时读屏文字也是中文（四年级的 m4.* 词条不在，不显示键名）', () => {
    // 这个文件只加载了五年级的包：四年级的读屏词条确实不在
    expect(hasEntry('m4.obs.ariaView', 'zh')).toBe(false)
    expect(hasEntry('m4.obs.ariaSolid', 'zh')).toBe(false)
    const v = mount(CubeViews, { props: { items: [{ blocks: [{ x: 0, y: 0 }] }] } })
    expect(v.find('.cviews').attributes('aria-label')).toBe('看到的图形')
    v.unmount()
    const s = mount(CubeSolids, { props: { items: [{ rows: [[1, 2]] }] as CubeSolid[] } })
    expect(s.find('.solids').attributes('aria-label')).toBe('小正方体搭的物体')
    s.unmount()
    const b = mount(CubeSolids, { props: { items: [{ bar: 3, on: 0 }] as CubeSolid[] } })
    expect(b.find('.solids').attributes('aria-label')).toBe('正方体和长方体')
    b.unmount()
    setLang('en')
    const e = mount(CubeViews, { props: { items: [{ blocks: [{ x: 0, y: 0 }] }] } })
    expect(e.find('.cviews').attributes('aria-label')).toBe('shape seen')
    e.unmount()
  })

  it('题目里的标数俯视图（cube-top）：每个有小正方体的格子一块、数就是这一摞的个数，后排画在上面', () => {
    for (const { q, part } of find('cube-top')) {
      if (part.kind !== 'cube-top') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      const fig = w.findAll('.cviews').find((v) => v.findAll('text.cell-n').length > 0)!
      expect(fig.findAll('rect'), q.id).toHaveLength(part.cells.length)
      expect(fig.findAll('text.cell-n').map((t) => Number(t.text())), q.id).toEqual(part.cells.map((c) => c.n))
      // 后排（y 大）画在上面（SVG 的 y 小）
      const ys = fig.findAll('rect').map((r, i) => ({ y: Number(r.attributes('y')), row: part.cells[i]!.y }))
      for (const a of ys) for (const b of ys) if (a.row > b.row) expect(a.y, q.id).toBeLessThan(b.y)
      w.unmount()
    }
  })
})

describe('五年级观察物体的题目：组合体 / 几何体、看到的图形都转发了', () => {
  it('组合体：几个、每个几块、标不标号', () => {
    const cases = [...find('cube-solids'), ...find('cube-solids', (p) => p.kind === 'cube-solids' && !!p.numbered), ...find('cube-solids', (p) => p.kind === 'cube-solids' && p.items.some((s) => 'bar' in s))]
    for (const { q, part } of cases) {
      if (part.kind !== 'cube-solids') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      const figs = w.findAll('.solids .solid')
      expect(figs, q.id).toHaveLength(part.items.length)
      part.items.forEach((s, i) => expect(figs[i]!.findAll('g.box'), q.id).toHaveLength(cubes(s)))
      expect(w.findAll('.solids figcaption'), q.id).toHaveLength(part.numbered ? part.items.length : 0)
      w.unmount()
    }
  })

  it('看到的图形：几幅、每幅几块、标号、图下面的字（还原题的三个方向）', () => {
    const cases = [...find('cube-views'), ...find('cube-views', (p) => p.kind === 'cube-views' && !!p.numbered), ...find('cube-views', (p) => p.kind === 'cube-views' && p.items.some((f) => !!f.caption))]
    for (const { q, part } of cases) {
      if (part.kind !== 'cube-views') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      const views = w.findAll('.cviews').filter((v) => v.findAll('text.cell-n').length === 0)
      const idx = q.stem.filter((p) => p.kind === 'cube-views').indexOf(part)
      const figs = views[idx]!.findAll('.cview')
      expect(figs, q.id).toHaveLength(part.items.length)
      part.items.forEach((f, i) => expect(figs[i]!.findAll('rect'), q.id).toHaveLength(f.blocks.length))
      expect(views[idx]!.findAll('.num'), q.id).toHaveLength(part.numbered ? part.items.length : 0)
      expect(views[idx]!.findAll('.cap'), q.id).toHaveLength(part.items.filter((f) => f.caption).length)
      w.unmount()
    }
  })
})
