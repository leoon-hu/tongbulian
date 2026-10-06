// @vitest-environment happy-dom
// 四下（四年级数学下册 D）的教具：小数竖式（VerticalForm 加的 lines / result）与移多补少图（EvenOut）。先用手写的数据查画得对——
// 小数点那一列画窄、各行的小数点在同一列、位数少的右边空着、改错题照写错的样子、横线下一排空格子；不传 lines 时整数竖式和原来一样；
// 移多补少图一人一行、一个瓶子一格、数轴每格标数、平均数的虚线和补上的虚线空瓶。再挂真实题目查 QuestionRenderer 把字段都转发了，
// 以及「小数的加法和减法」「平均数与条形统计图」「营养午餐」「鸡兔同笼」每种题中英文都能渲染。
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Question } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import VerticalForm from '@/components/math/VerticalForm.vue'
import EvenOut from '@/components/math/EvenOut.vue'
import { hasBlank, hasChoiceBlank } from '@/components/practice/blank'

afterEach(() => setLang('zh'))

/** 每一行的格子文字（不含运算符那一格），空格子是 '' */
const rowCells = (w: VueWrapper): string[][] => w.findAll('.row').map((r) => r.findAll('.digit').map((c) => c.text()))

describe('小数竖式（VerticalForm 的 lines）', () => {
  it('例 1 的 16.45 + 14.29：小数点那一列窄，加号写在第二行，横线下一排空格子（小数点那一格不画虚线）', () => {
    const w = mount(VerticalForm, { props: { a: 0, op: '+', b: 0, lines: ['16.45', '14.29'] } })
    expect(w.find('.vertical.dec').exists()).toBe(true)
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['1', '6', '.', '4', '5'])
    expect(rows[1]).toEqual(['1', '4', '.', '2', '9'])
    expect(w.findAll('.row')[1]!.find('.op').text()).toBe('+')
    expect(w.findAll('.row')[0]!.find('.op').text()).toBe('')
    // 小数点那一列是窄的（pt），每行都一样
    for (const r of w.findAll('.row')) expect(r.findAll('.digit').map((c) => c.classes().includes('pt'))).toEqual([false, false, true, false, false])
    expect(w.findAll('.answer .digit.blank')).toHaveLength(4)
    expect(w.find('.answer .digit.pt').exists()).toBe(true)
    expect((w.find('.vertical').attributes('style') ?? '').replace(/\s/g, '')).toContain('--tmpl:1.1em1.1em1.1em0.42em1.1em1.1em')
    w.unmount()
  })

  it('例 2 的 18.3 − 16.45：位数少的右边空着不补 0；减号用「−」', () => {
    const w = mount(VerticalForm, { props: { a: 0, op: '-', b: 0, lines: ['18.3 ', '16.45'] } })
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['1', '8', '.', '3', ''])
    expect(rows[1]).toEqual(['1', '6', '.', '4', '5'])
    expect(w.findAll('.row')[1]!.find('.op').text()).toBe('−')
    w.unmount()
  })

  it('例 3 三个数连加：三行数、加号写在最后一行、整体小一号', () => {
    const w = mount(VerticalForm, { props: { a: 0, op: '+', b: 0, lines: ['17.45', '15.8 ', '14.69'] } })
    expect(w.find('.vertical.dec.three').exists()).toBe(true)
    const ops = w.findAll('.row').map((r) => r.find('.op').text())
    expect(ops).toEqual(['', '', '+', ''])
    w.unmount()
  })

  it('改错题：按末位对齐的 12.5 + 3.79 = 50.4，小数点落在不同的列（那几列照常宽）；漏写小数点的「10 0」照位置写', () => {
    const bad = mount(VerticalForm, { props: { a: 0, op: '+', b: 0, lines: ['12.5', '3.79'], result: '50.4' } })
    const rows = rowCells(bad)
    expect(rows[0]).toEqual(['1', '2', '.', '5'])
    expect(rows[1]).toEqual(['3', '.', '7', '9'])
    expect(rows[2]).toEqual(['5', '0', '.', '4'])
    expect(bad.findAll('.digit.pt')).toHaveLength(0)
    expect(bad.find('.answer').exists()).toBe(false)
    expect(bad.find('.sum').exists()).toBe(true)
    bad.unmount()
    const dot = mount(VerticalForm, { props: { a: 0, op: '-', b: 0, lines: ['23.4', '13.4'], result: '10 0' } })
    expect(rowCells(dot)[2]).toEqual(['1', '0', '', '0'])
    // 小数点那一列只有点和空格，还是窄的
    expect(dot.findAll('.row')[2]!.findAll('.digit')[2]!.classes()).toContain('pt')
    dot.unmount()
  })

  it('不传 lines：整数竖式和原来一样（没有 .dec）', () => {
    const w = mount(VerticalForm, { props: { a: 345, op: '+', b: 78 } })
    expect(w.find('.dec').exists()).toBe(false)
    expect(w.findAll('.row')).toHaveLength(3)
    expect(rowCells(w)[0]).toEqual(['3', '4', '5'])
    expect(rowCells(w)[1]).toEqual(['', '7', '8'])
    w.unmount()
  })
})

describe('移多补少图（EvenOut）', () => {
  const rows = [
    { name: { k: 'm4.avg.who.hong' }, count: 14 },
    { name: { k: 'm4.avg.who.lan' }, count: 12 },
    { name: { k: 'm4.avg.who.liang' }, count: 11 },
    { name: { k: 'm4.avg.who.ming' }, count: 15 },
  ]
  it('一人一行、一个瓶子一格；数轴 0…15 每格标数；没给平均数就不画虚线和空瓶', () => {
    const w = mount(EvenOut, { props: { rows, max: 15 } })
    expect(w.findAll('g.bottle')).toHaveLength(52)
    expect(w.findAll('g.ghost')).toHaveLength(0)
    expect(w.find('line.avg').exists()).toBe(false)
    expect(w.findAll('text.tick-label').map((t) => t.text())).toEqual(Array.from({ length: 16 }, (_, i) => String(i)))
    expect(w.findAll('text.name').map((t) => t.text())).toEqual(['小红', '小兰', '小亮', '小明'])
    expect(w.find('svg').attributes('aria-label')).toBe('收集的空水瓶')
    // 小明（15 个）的最后一个瓶子在小红（14 个）最后一个的右边一格
    w.unmount()
  })

  it('给了平均数：在 13 那里画红色虚线，小兰补 1 个、小亮补 2 个虚线空瓶', () => {
    const w = mount(EvenOut, { props: { rows, max: 15, avg: 13 } })
    expect(w.findAll('g.bottle')).toHaveLength(52)
    expect(w.findAll('g.ghost')).toHaveLength(3)
    const line = w.find('line.avg')
    expect(line.exists()).toBe(true)
    // 虚线和刻度 13 在同一个 x 上
    const tick13 = w.findAll('text.tick-label').find((t) => t.text() === '13')!
    expect(Number(line.attributes('x1'))).toBeCloseTo(Number(tick13.attributes('x')))
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

  it('小数竖式题：转发 lines / op；得数在选项里选，竖式里没有要填的空（hasBlank 为假）', () => {
    const q = sample('m4s2-06-addsub', (x) => x.input === 'choice' && x.stem.some((p) => p.kind === 'dec-vertical' && p.result === undefined))
    expect(hasBlank(q)).toBe(false)
    const part = q.stem.find((p) => p.kind === 'dec-vertical')! as Extract<Question['stem'][number], { kind: 'dec-vertical' }>
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.find('.vertical.dec').exists()).toBe(true)
    expect(rowCells(w).slice(0, part.lines.length).map((r) => r.join('').trim())).toEqual(part.lines.map((l) => l.replace(/ /g, '')))
    w.unmount()
  })

  it('改错题：转发 result（横线下照写错的得数，没有空格子）', () => {
    const q = sample('m4s2-06-addsub', (x) => x.stem.some((p) => p.kind === 'dec-vertical' && p.result !== undefined))
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.find('.vertical.dec .sum').exists()).toBe(true)
    expect(w.find('.vertical.dec .answer').exists()).toBe(false)
    w.unmount()
  })

  it('移多补少图：转发 rows / max / avg', () => {
    const plain = sample('m4s2-08-average', (x) => x.stem.some((p) => p.kind === 'even-out' && p.avg === undefined))
    const a = mount(QuestionRenderer, { props: { question: plain } })
    expect(a.find('figure.even-out').exists()).toBe(true)
    expect(a.find('line.avg').exists()).toBe(false)
    a.unmount()
    const lined = sample('m4s2-08-average', (x) => x.stem.some((p) => p.kind === 'even-out' && p.avg !== undefined))
    const b = mount(QuestionRenderer, { props: { question: lined } })
    expect(b.find('line.avg').exists()).toBe(true)
    b.unmount()
  })

  it('鸡兔同笼的列表题：表里的「?」就是要填的空（数字键盘的数填进去）', () => {
    const q = sample('m4s2-10-chicken', (x) => x.input === 'numpad' && x.id.includes(':list-'))
    expect(hasBlank(q)).toBe(true)
    const w = mount(QuestionRenderer, { props: { question: q, fill: { value: '24', done: false } } })
    expect(w.find('.stat-table .q').text()).toBe('24')
    w.unmount()
  })

  it('电话费表要填的那一格是选择题：答完填上（hasChoiceBlank）', () => {
    const q = sample('m4s2-06-addsub', (x) => x.id.includes(':bill-'))
    expect(hasChoiceBlank(q)).toBe(true)
  })
})

describe('四年级数学下册 D 每个知识点的题都能渲染（中英文，三档各几道）', () => {
  for (const kp of ['m4s2-06-addsub', 'm4s2-06-mixed', 'm4s2-06-laws', 'm4s2-08-average', 'm4s2-08-double', 'm4s2-09-lunch', 'm4s2-10-chicken']) {
    it(kp, () => {
      const gen = getGenerator(kp)!
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 12; seed++) {
          for (const d of [1, 2, 3] as const) {
            const q = gen(d, createRng(seed * 31 + d))
            const stem = mount(QuestionRenderer, { props: { question: q, fill: q.input === 'numpad' ? { value: '', done: false } : null } })
            expect(stem.text(), q.id).not.toMatch(/\bm4\.[a-zA-Z]|undefined|NaN/)
            stem.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.text(), q.id).not.toMatch(/\bm4\.[a-zA-Z]|undefined|NaN/)
            panel.unmount()
          }
        }
      }
    })
  }
})
