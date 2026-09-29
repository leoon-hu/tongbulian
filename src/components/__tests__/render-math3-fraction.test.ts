// @vitest-environment happy-dom
// 三年级「分数的初步认识」「小数的初步认识」的新教具：平均分的图（FracShape + fracGeometry）、平均分的线（FracLine）、
// 一些物体看作一个整体（FracSet），以及这两个单元的题目在题干 / 选项里的渲染（分数画成上下两层）。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { FracPic, FracShapeKind } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import FracShape from '@/components/math/FracShape.vue'
import FracLine from '@/components/math/FracLine.vue'
import FracSet from '@/components/math/FracSet.vue'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import { fracGeometry, isEvenShape } from '@/components/math/fracGeometry'

afterEach(() => setLang('zh'))

/** 每种图形能切的份数 */
const CASES: [FracShapeKind, number[], number?][] = [
  ['circle', [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
  ['rect', [2, 3, 4, 5, 6, 7, 8, 9, 10]],
  ['rect', [6, 8, 10], 2],
  ['rect', [12], 3],
  ['rect-h', [2, 3, 4, 5, 6]],
  ['square', [2, 3, 4, 5, 10]],
  ['square', [4], 2],
  ['square', [9], 3],
  ['square-diag', [2, 4, 8]],
  ['triangle', [2]],
  ['polygon', [5, 6, 8]],
  ['parallelogram', [2]],
  ['cross', [5]],
  ['circle-uneven', [2, 3, 4, 5]],
  ['rect-uneven', [2, 3, 4]],
  ['triangle-cut', [2, 3]],
  ['board', [4]],
]

describe('平均分的图的几何（fracGeometry）', () => {
  it('平均分的每块一样大，反例每块不一样大；块数 = 份数', () => {
    for (const [shape, ns, rows] of CASES) {
      for (const n of ns) {
        const g = fracGeometry({ shape, parts: n, rows })
        expect(g.pieces, `${shape} ${n}`).toHaveLength(n)
        const areas = g.pieces.map((p) => p.area)
        const equal = areas.every((a) => Math.abs(a - areas[0]!) < 1e-6)
        expect(equal, `${shape} ${n} 份${rows ? `（${rows} 行）` : ''}`).toBe(isEvenShape(shape))
        for (const a of areas) expect(a, `${shape} ${n}`).toBeGreaterThan(0)
        // 画得下：宽不超过 160、高不超过 110（viewBox 单位）
        expect(g.w).toBeLessThanOrEqual(160)
        expect(g.h).toBeLessThanOrEqual(110)
      }
    }
  })

  it('黑板报是 1/2、1/4、1/8、1/8', () => {
    const areas = fracGeometry({ shape: 'board', parts: 4 }).pieces.map((p) => p.area)
    const total = areas.reduce((s, a) => s + a, 0)
    expect(areas.map((a) => Math.round(total / a))).toEqual([2, 4, 8, 8])
  })
})

describe('FracShape：平均分的图', () => {
  it('涂色、另一种颜色、整个涂满的、图下面的数', () => {
    const items: FracPic[] = [
      { shape: 'circle', parts: 8, shaded: [0, 1, 2], alt: [3, 4], label: '3/8' },
      { shape: 'square', parts: 10, shaded: [0, 1, 2, 3, 4], whole: 2, label: '2.5' },
    ]
    const w = mount(FracShape, { props: { items } })
    const figs = w.findAll('figure')
    expect(figs).toHaveLength(2)
    const a = figs[0]!
    expect(a.findAll('.piece')).toHaveLength(8)
    expect(a.findAll('.piece.on')).toHaveLength(3)
    expect(a.findAll('.piece.alt')).toHaveLength(2)
    expect(a.findAll('.cut')).toHaveLength(8)
    // 分数画成上下两层
    expect(a.find('figcaption .frac').exists()).toBe(true)
    expect(a.find('figcaption .num').text()).toBe('3')
    const b = figs[1]!
    // 两个整个涂满的 + 十条里涂 5 条
    expect(b.findAll('.piece')).toHaveLength(12)
    expect(b.findAll('.piece.on')).toHaveLength(7)
    expect(b.find('figcaption').text()).toBe('2.5')
    w.unmount()
  })
})

describe('FracLine：平均分的线', () => {
  it('线段：只画刻度不标数，括号括出一段', () => {
    const w = mount(FracLine, { props: { units: 1, per: 5, bracket: [1, 2], labels: false } })
    expect(w.findAll('line.tick')).toHaveLength(6)
    expect(w.findAll('text.num')).toHaveLength(0)
    expect(w.find('path.brace').exists()).toBe(true)
    expect(w.find('.arrow').exists()).toBe(false)
    w.unmount()
  })
  it('米尺 / 数轴：整份处标 0、1 m、2 m，箭头指着一个刻度', () => {
    const w = mount(FracLine, { props: { units: 2, per: 10, arrow: 14, unit: 'm' } })
    expect(w.findAll('line.tick')).toHaveLength(21)
    expect(w.findAll('text.num').map((t) => t.text())).toEqual(['0', '1 m', '2 m'])
    expect(w.find('.arrow').exists()).toBe(true)
    expect(w.find('path.brace').exists()).toBe(false)
    w.unmount()
  })
  it('1 分米的尺子：每个刻度都标数，末尾写 cm', () => {
    const w = mount(FracLine, { props: { units: 1, per: 10, bracket: [2, 7], ruler: true, unit: 'cm' } })
    expect(w.findAll('text.num').map((t) => t.text())).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    expect(w.find('text.unit').text()).toBe('cm')
    expect(w.find('rect.body').exists()).toBe(true)
    w.unmount()
  })
})

describe('FracSet：一些物体看作一个整体', () => {
  it('分组、涂色的几份、每份的个数', () => {
    const w = mount(FracSet, { props: { icon: '🍎', groups: 4, per: 3, shaded: 1, dir: undefined, boxed: undefined } })
    expect(w.findAll('.grp')).toHaveLength(4)
    expect(w.findAll('.grp.on')).toHaveLength(1)
    expect(w.findAll('.obj')).toHaveLength(12)
    expect(w.classes()).toContain('framed')
    w.unmount()
  })
  it('圆点：涂色的实心；每份 1 个不画框；排一排 / 一列', () => {
    const dots = mount(FracSet, { props: { icon: 'dot', groups: 8, per: 1, shaded: 5, boxed: false } })
    expect(dots.classes()).toContain('dots')
    expect(dots.classes()).not.toContain('framed')
    expect(dots.findAll('.obj.on')).toHaveLength(5)
    dots.unmount()
    const rows = mount(FracSet, { props: { icon: 'dot', groups: 3, per: 4, shaded: 2, dir: 'row', boxed: undefined } })
    expect(rows.classes()).toContain('dir-row')
    expect(rows.findAll('.grp')[0]!.attributes('style')).toContain('repeat(4')
    rows.unmount()
    const cols = mount(FracSet, { props: { icon: 'dot', groups: 5, per: 3, shaded: 3, dir: 'col', boxed: undefined } })
    expect(cols.findAll('.grp')[0]!.attributes('style')).toContain('repeat(1')
    cols.unmount()
  })
})

describe('分数、小数题的渲染（中英文）', () => {
  const KPS = ['m3s1-08-unit-frac', 'm3s1-08-frac', 'm3s1-08-frac-calc', 'm3s1-08-frac-of-set', 'm3s2-07-know', 'm3s2-07-compare', 'm3s2-07-addsub']
  it('题干与选项都能渲染；选项里的分数画成上下两层', () => {
    let fracCards = 0
    for (const kp of KPS) {
      const gen = getGenerator(kp)!
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 6; seed++) {
          for (const d of [1, 2, 3] as const) {
            const q = gen(d, createRng(seed * 13 + d))
            const stem = mount(QuestionRenderer, { props: { question: q } })
            expect(stem.text(), q.id).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN/)
            // 题干里写成「3/8」的都画成上下两层（不留斜线）
            expect(stem.text(), q.id).not.toMatch(/\d\/\d/)
            for (const p of q.stem) {
              if (p.kind === 'frac-shape') expect(stem.findAll('.frac-shapes figure').length).toBeGreaterThanOrEqual(p.items.length)
              if (p.kind === 'frac-line') expect(stem.find('svg.frac-line').exists()).toBe(true)
              if (p.kind === 'frac-set') expect(stem.find('.frac-set').exists()).toBe(true)
            }
            stem.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            expect(panel.text(), q.id).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN|\d\/\d/)
            fracCards += panel.findAll('.card .frac').length
            panel.unmount()
          }
        }
      }
    }
    expect(fracCards).toBeGreaterThan(50)
  })
})
