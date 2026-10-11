// @vitest-environment happy-dom
// 五上「小数乘法」（五年级数学 B）的教具：小数乘法竖式（VerticalForm 加的 decFactors / product）、小数倍的线段图（RatioLines）、
// 分段计费的线段图（PartLine 加的 ticks / tail）。先用手写的数据查画得照课本——两个乘数末尾对齐、小数点画在这一位的右下角不占一列、
// 整数乘数末尾的 0 写在外面、两次乘得的数照整数写、补 0 的积往左伸；不传新参数时原来的竖式 / 线段图和以前一样。
// 再挂真实题目查 QuestionRenderer 把字段都转发了，七个知识点中英文都能渲染。
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import VerticalForm from '@/components/math/VerticalForm.vue'
import RatioLines from '@/components/math/RatioLines.vue'
import PartLine from '@/components/math/PartLine.vue'
import { hasBlank } from '@/components/practice/blank'

afterEach(() => setLang('zh'))

/** 每一行的格子：数字（空格子是 ''），带小数点的在后面加「.」 */
const rowCells = (w: VueWrapper): string[][] => w.findAll('.row').map((r) => r.findAll('.digit').map((c) => c.text() + (c.find('.pt').exists() ? '.' : '')))
const dm = (a: string, b: string, extra: Record<string, unknown> = {}): VueWrapper => mount(VerticalForm, { props: { a: 0, op: '×', b: 0, decFactors: [a, b] as [string, string], ...extra } })

describe('小数乘法竖式（VerticalForm 的 decFactors）', () => {
  it('例 1 的 9.5 × 3：3 对着 5（末尾对齐），小数点画在 9 的右下角不占一列；横线下一条虚线（不按位画格子）', () => {
    const w = dm('9.5', '3')
    expect(w.find('.vertical.dmul').exists()).toBe(true)
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['', '9.', '5'])
    expect(rows[1]).toEqual(['', '', '3'])
    expect(w.findAll('.row')[1]!.find('.op').text()).toBe('×')
    expect(w.find('.answer .blank-line').exists()).toBe(true)
    expect(w.findAll('.answer .digit')).toHaveLength(0)
    w.unmount()
  })

  it('试一试的 1.92 × 0.9：0.9 的 9 对着 1.92 的 2，两个小数点不在同一列', () => {
    const w = dm('1.92', '0.9')
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['', '1.', '9', '2'])
    expect(rows[1]).toEqual(['', '', '0.', '9'])
    w.unmount()
  })

  it('例 2 的 0.72 × 60：6 对着 2、60 末尾的 0 写在外面，积 4320 的 0 也落在外面那一列', () => {
    const w = dm('0.72', '60', { zeros: true, product: '4320' })
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['0.', '7', '2', ''])
    expect(rows[1]).toEqual(['', '', '6', '0'])
    expect(rows[2]).toEqual(['4', '3', '2', '0'])
    expect(w.find('.answer').exists()).toBe(false)
    w.unmount()
  })

  it('练习二 1 的 0.46 × 300：两个 0 都写在外面', () => {
    const w = dm('0.46', '300', { zeros: true, product: '13800' })
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['0.', '4', '6', '', ''])
    expect(rows[1]).toEqual(['', '', '3', '0', '0'])
    expect(rows[2]).toEqual(['1', '3', '8', '0', '0'])
    w.unmount()
  })

  it('例 4 的 0.56 × 0.04：补了 0 的积 0.0224 往左伸出去', () => {
    const w = dm('0.56', '0.04', { product: '0.0224' })
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['', '', '0.', '5', '6'])
    expect(rows[1]).toEqual(['', '', '0.', '0', '4'])
    expect(rows[2]).toEqual(['0.', '0', '2', '2', '4'])
    w.unmount()
  })

  it('例 5 的 3.9 × 1.2：两次乘得的数照整数写（78、39 左移一位），只在积上点小数点；五行小一号', () => {
    const w = dm('3.9', '1.2', { product: '4.68', steps: true })
    expect(w.find('.vertical.dmul.tall').exists()).toBe(true)
    const rows = rowCells(w)
    expect(rows).toEqual([
      ['', '3.', '9'],
      ['', '1.', '2'],
      ['', '7', '8'],
      ['3', '9', ''],
      ['4.', '6', '8'],
    ])
    expect(w.findAll('.rule')).toHaveLength(2)
    w.unmount()
  })

  it('乘数是一位数时 steps 不画两次乘得的数；练习四 8 的「1.□2」照写', () => {
    const w = dm('1.92', '0.9', { product: '1728', steps: true })
    expect(w.findAll('.row')).toHaveLength(3)
    w.unmount()
    const box = dm('1.□2', '5.3')
    expect(rowCells(box)[0]).toEqual(['', '1.', '□', '2'])
    expect(box.find('.answer .blank-line').exists()).toBe(true)
    box.unmount()
  })

  it('不传 decFactors：整数竖式、四上的乘法竖式和原来一样（没有 .dmul）', () => {
    const plain = mount(VerticalForm, { props: { a: 345, op: '×', b: 7 } })
    expect(plain.find('.dmul').exists()).toBe(false)
    // 积 2415 是四位：上面的数左边空一格（原来的样子）
    expect(rowCells(plain)[0]).toEqual(['', '3', '4', '5'])
    plain.unmount()
    const four = mount(VerticalForm, { props: { a: 704, op: '×', b: 90, zeros: true } })
    expect(four.find('.vertical.mul').exists()).toBe(true)
    expect(four.find('.dmul').exists()).toBe(false)
    four.unmount()
  })
})

describe('小数倍的线段图（RatioLines）', () => {
  const rows = [
    { name: { k: 'm5.dmul.cls.1' }, len: 10, top: { k: 'm5.dmul.rl.one' }, bottom: '3.9 kg' },
    { name: { k: 'm5.dmul.cls.2' }, len: 8, top: { k: 'm5.dmul.rl.times', p: { r: '0.8' } }, bottom: '? kg' },
    { name: { k: 'm5.dmul.cls.3' }, len: 12, top: { k: 'm5.dmul.rl.times', p: { r: '1.2' } }, bottom: '? kg' },
  ]
  it('例 5：第一条平均分成 10 小段（11 个刻度），0.8 倍那条长 8 小段，1.2 倍那条长出的两小段画刻度；名字、倍数、千克数照写', () => {
    const w = mount(RatioLines, { props: { per: 10, rows } })
    const groups = w.findAll('g.row')
    expect(groups).toHaveLength(3)
    expect(groups[0]!.findAll('line.tick')).toHaveLength(11)
    expect(groups[1]!.findAll('line.tick')).toHaveLength(2)
    expect(groups[2]!.findAll('line.tick')).toHaveLength(4) // 0、10、11、12
    expect(w.findAll('text.name').map((t) => t.text())).toEqual(['一班', '二班', '三班'])
    expect(w.findAll('text.top').map((t) => t.text())).toEqual(['“1”倍', '0.8 倍', '1.2 倍'])
    expect(w.findAll('text.bottom').map((t) => t.text())).toEqual(['3.9 kg', '? kg', '? kg'])
    expect(w.findAll('text.bottom.ask')).toHaveLength(2)
    // 线长按小段数：二班的线是一班的 0.8，三班的是 1.2
    const len = (g: VueWrapper['element'] | undefined): number => {
      const l = (g as SVGGElement).querySelector('line.line')!
      return Number(l.getAttribute('x2')) - Number(l.getAttribute('x1'))
    }
    const base = len(groups[0]!.element)
    expect(len(groups[1]!.element) / base).toBeCloseTo(0.8, 2)
    expect(len(groups[2]!.element) / base).toBeCloseTo(1.2, 2)
    // 竖虚线：二班对着一班的第 8 个刻度，三班对着一班的右端
    const guides = w.findAll('line.guide')
    expect(guides).toHaveLength(2)
    const baseTicks = groups[0]!.findAll('line.tick').map((t) => Number(t.attributes('x1')))
    expect(Number(guides[0]!.attributes('x1'))).toBeCloseTo(baseTicks[8]!)
    expect(Number(guides[1]!.attributes('x1'))).toBeCloseTo(baseTicks[10]!)
    expect(w.find('svg').attributes('aria-label')).toBe('线段图')
    w.unmount()
  })
})

describe('分段计费的线段图（PartLine 的 ticks / tail）', () => {
  const parts = [
    { len: 3, label: '8 元' },
    { len: 1, label: '1.5 元' },
    { len: 3, label: '' },
  ]
  it('例 8：0–7 千米每 1 千米一个刻度，只括前两段，整条下面「? 元」，右端接虚线', () => {
    const w = mount(PartLine, { props: { parts, total: '? 元', names: ['0 km', '3 km', '', '7 km'], ticks: 1, tail: true } })
    expect(w.findAll('path.brace')).toHaveLength(3) // 两段 + 整条
    expect(w.findAll('text.label').map((t) => t.text())).toEqual(['8 元', '1.5 元'])
    expect(w.findAll('line.tick:not(.minor)')).toHaveLength(4)
    expect(w.findAll('line.tick.minor')).toHaveLength(3 + 0 + 2 - 1) // 1、2、5、6 千米
    expect(w.find('line.tail').exists()).toBe(true)
    expect(w.find('text.total.ask').text()).toBe('? 元')
    // 按比例：3 千米那个分点在 3/7 处
    const xs = w.findAll('line.tick:not(.minor)').map((t) => Number(t.attributes('x1')))
    expect((xs[1]! - xs[0]!) / (xs[3]! - xs[0]!)).toBeCloseTo(3 / 7, 2)
    w.unmount()
  })

  it('不传 ticks：和四下的线段图一样（每段都有大括号、短段拉长、没有虚线）', () => {
    const w = mount(PartLine, { props: { parts: [{ len: 814, label: '814 km' }, { len: 100, label: '?' }], total: '1956 km' } })
    expect(w.findAll('path.brace')).toHaveLength(3)
    expect(w.find('line.tail').exists()).toBe(false)
    expect(w.findAll('line.tick.minor')).toHaveLength(0)
    w.unmount()
  })
})

describe('QuestionRenderer 与练习页', () => {
  const sample = (kp: string, pred: (q: Question) => boolean): Question => {
    const gen = getGenerator(kp)!
    for (let seed = 1; seed < 3000; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        if (pred(q)) return q
      }
    }
    throw new Error(`${kp} 找不到要的题`)
  }
  const part = <K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> => q.stem.find((p) => p.kind === kind) as Extract<StemPart, { kind: K }>

  it('小数乘法竖式：转发 a / b / zeros / product / steps', () => {
    const q = sample('m5s1-02-dec-int', (x) => x.id.endsWith(':point-0.46x300'))
    const p = part(q, 'dec-mul')
    expect(p.zeros).toBe(true)
    const w = mount(QuestionRenderer, { props: { question: q, fill: q.input === 'numpad' ? { value: '', done: false } : null } })
    expect(w.find('.vertical.dmul').exists()).toBe(true)
    const rows = rowCells(w)
    expect(rows[1]).toEqual(['', '', '3', '0', '0'])
    expect(rows[2]!.join('')).toBe('13800')
    w.unmount()
    const steps = sample('m5s1-02-dec-int', (x) => x.id.endsWith(':point-3.13x53'))
    const s = mount(QuestionRenderer, { props: { question: steps } })
    expect(s.find('.vertical.dmul.tall').exists()).toBe(true)
    expect(s.findAll('.vertical .row')).toHaveLength(5)
    s.unmount()
  })

  it('用竖式计算的空竖式：得数在选项里选，竖式里没有要填的空（hasBlank 为假）', () => {
    const q = sample('m5s1-02-dec-dec', (x) => x.input === 'choice' && x.id.endsWith(':do-0.56x0.04-v'))
    expect(hasBlank(q)).toBe(false)
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.find('.vertical.dmul .answer .blank-line').exists()).toBe(true)
    w.unmount()
  })

  it('小数倍的线段图与分段计费的线段图：转发字段', () => {
    const q = sample('m5s1-02-times', (x) => x.id.endsWith(':peanut-3.9x0.8'))
    const a = mount(QuestionRenderer, { props: { question: q } })
    expect(a.find('svg.ratio-lines').exists()).toBe(true)
    expect(a.findAll('svg.ratio-lines g.row')).toHaveLength(2)
    a.unmount()
    const t = sample('m5s1-02-tiered', (x) => x.id.endsWith(':taxiline-7'))
    const b = mount(QuestionRenderer, { props: { question: t } })
    expect(b.find('svg.part-line line.tail').exists()).toBe(true)
    expect(b.findAll('svg.part-line line.tick.minor')).toHaveLength(4)
    expect(b.find('svg.part-line').attributes('aria-label')).toBe('线段图')
    b.unmount()
  })
})

describe('五上「小数乘法」每个知识点的题都能渲染（中英文，三档各几道）', () => {
  for (const kp of ['m5s1-02-dec-int', 'm5s1-02-dec-dec', 'm5s1-02-approx', 'm5s1-02-times', 'm5s1-02-laws', 'm5s1-02-estimate', 'm5s1-02-tiered']) {
    it(kp, () => {
      const gen = getGenerator(kp)!
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 12; seed++) {
          for (const d of [1, 2, 3] as const) {
            const q = gen(d, createRng(seed * 31 + d))
            const stem = mount(QuestionRenderer, { props: { question: q, fill: q.input === 'numpad' ? { value: '', done: false } : null } })
            expect(stem.text(), q.id).not.toMatch(/\bm5\.[a-zA-Z]|undefined|NaN/)
            stem.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.text(), q.id).not.toMatch(/\bm5\.[a-zA-Z]|undefined|NaN/)
            panel.unmount()
          }
        }
      }
    })
  }
})
