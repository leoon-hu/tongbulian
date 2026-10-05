// @vitest-environment happy-dom
// 四上「多位数乘两位数」的竖式（VerticalForm 加的 steps / zeros / work / mark）：两次乘得的数各占一行、第二次的末位对齐十位、
// 个位不写 0；末尾有 0 的把 0 写在竖式外面；写好的竖式（改错、箭头题）照写、箭头画在那一行右边；按的数填在积那一行，答完填上两次乘得的数。
// 不传新加的 prop 时和原来一模一样（一到三年级的竖式）。还有 QuestionRenderer 的转发、hasBlank，以及第三、四单元每种题中英文都能渲染。
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Question } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import VerticalForm from '@/components/math/VerticalForm.vue'
import { hasBlank } from '@/components/practice/blank'

afterEach(() => setLang('zh'))

/** 每一行的格子文字（不含运算符那一格、箭头格），空格子是 ''（.text() 会去掉空白） */
const rowCells = (w: VueWrapper): string[][] => w.findAll('.row').map((r) => r.findAll('.digit').map((c) => c.text()))
/** 两次乘得的数那两行：哪几格是小虚线格（没答完）——按格的序号 */
const phAt = (w: VueWrapper, k: number): number[] =>
  w
    .findAll('.part')
    [k]!.findAll('.digit')
    .map((c, i) => (c.classes().includes('ph') ? i : -1))
    .filter((i) => i >= 0)

describe('不传新加的 prop：原来的竖式不变', () => {
  it('加法 345 + 78、乘一位数 604 × 8 都是三行（两个数、答案行），没有 .mul', () => {
    const add = mount(VerticalForm, { props: { a: 345, op: '+', b: 78 } })
    expect(add.findAll('.row')).toHaveLength(3)
    expect(add.find('.mul').exists()).toBe(false)
    add.unmount()
    const mul = mount(VerticalForm, { props: { a: 604, op: '×', b: 8, answer: '48', done: false } })
    expect(mul.findAll('.row')).toHaveLength(3)
    expect(mul.find('.part').exists()).toBe(false)
    expect(mul.findAll('.answer .typed').map((c) => c.text()).slice(-2)).toEqual(['4', '8'])
    mul.unmount()
  })
})

describe('乘数是两位数的竖式（steps）', () => {
  it('例 2 的 37 × 48：296 对齐个位，148 对齐十位、个位空着，积 1776 写满四格', () => {
    const w = mount(VerticalForm, { props: { a: 37, op: '×', b: 48, steps: true } })
    expect(w.find('.mul').exists()).toBe(true)
    const rows = rowCells(w)
    expect(rows).toHaveLength(5)
    expect(rows[0]).toEqual(['', '', '3', '7'])
    expect(rows[1]).toEqual(['', '', '4', '8'])
    expect(w.findAll('.row')[1]!.find('.op').text()).toBe('×')
    // 没答完：两次乘得的数只画小虚线格，位置和位数照课本
    expect(phAt(w, 0)).toEqual([1, 2, 3])
    expect(phAt(w, 1)).toEqual([0, 1, 2])
    expect(rows[2]!.every((c) => c === '')).toBe(true)
    // 积那一行四格都是答案格，两条横线
    expect(w.findAll('.answer .digit.blank')).toHaveLength(4)
    expect(w.findAll('.rule')).toHaveLength(2)
    w.unmount()
  })

  it('按的数填在积那一行（右对齐）；答完把两次乘得的数填上', () => {
    const typing = mount(VerticalForm, { props: { a: 37, op: '×', b: 48, steps: true, answer: '17', done: false } })
    expect(typing.findAll('.answer .typed').map((c) => c.text())).toEqual(['', '', '', '1', '7'])
    typing.unmount()
    const done = mount(VerticalForm, { props: { a: 37, op: '×', b: 48, steps: true, answer: '1776', done: true } })
    const rows = rowCells(done)
    expect(rows[2]).toEqual(['', '2', '9', '6'])
    expect(rows[3]).toEqual(['1', '4', '8', ''])
    expect(done.find('.answer.done').exists()).toBe(true)
    expect(done.findAll('.ph')).toHaveLength(0)
    done.unmount()
  })

  it('三位数乘两位数 425 × 36：2550、1275 左移一位，积 15300 五位', () => {
    const w = mount(VerticalForm, { props: { a: 425, op: '×', b: 36, steps: true, done: true, answer: '15300' } })
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['', '', '4', '2', '5'])
    expect(rows[2]).toEqual(['', '2', '5', '5', '0'])
    expect(rows[3]).toEqual(['1', '2', '7', '5', ''])
    w.unmount()
  })
})

describe('末尾有 0 的乘法（zeros）：0 写在竖式外面', () => {
  it('704 × 90：9 对着 4，90 的 0 伸在外面；乘数只有一位不是 0，没有两次乘得的数', () => {
    const w = mount(VerticalForm, { props: { a: 704, op: '×', b: 90, steps: true, zeros: true } })
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['', '7', '0', '4', ''])
    expect(rows[1]).toEqual(['', '', '', '9', '0'])
    expect(w.find('.part').exists()).toBe(false)
    expect(w.findAll('.answer .digit.blank')).toHaveLength(5)
    w.unmount()
  })

  it('580 × 12：12 对着 58，580 的 0 在外面；两次乘得的数是 58 × 2、58 × 1，积 6960', () => {
    const w = mount(VerticalForm, { props: { a: 580, op: '×', b: 12, steps: true, zeros: true, done: true, answer: '6960' } })
    const rows = rowCells(w)
    expect(rows[0]).toEqual(['', '5', '8', '0'])
    expect(rows[1]).toEqual(['', '1', '2', ''])
    expect(rows[2]).toEqual(['1', '1', '6', ''])
    expect(rows[3]).toEqual(['5', '8', '', ''])
    w.unmount()
  })
})

describe('写好的竖式（work）与箭头（mark）', () => {
  it('练习八 3 的 650 × 12：1300、650（左移一位）、7800，箭头指着第二行', () => {
    const w = mount(VerticalForm, { props: { a: 650, op: '×', b: 12, steps: true, work: { p1: 1300, p2: 650, sum: 7800 }, mark: 2 } })
    const rows = rowCells(w)
    expect(rows[2]).toEqual(['1', '3', '0', '0'])
    expect(rows[3]).toEqual(['6', '5', '0', ''])
    expect(rows[4]).toEqual(['7', '8', '0', '0'])
    expect(w.find('.answer').exists()).toBe(false)
    expect(w.findAll('.arrow').map((a) => a.text())).toEqual(['', '', '', '←', ''])
    w.unmount()
  })

  it('改错题：第二次乘得的数没有错位（flat）就和上一行右对齐，照写错的积', () => {
    const w = mount(VerticalForm, { props: { a: 22, op: '×', b: 43, steps: true, work: { p1: 66, p2: 88, sum: 154, flat: true } } })
    const rows = rowCells(w)
    expect(rows[2]).toEqual(['', '6', '6'])
    expect(rows[3]).toEqual(['', '8', '8'])
    expect(rows[4]).toEqual(['1', '5', '4'])
    expect(w.findAll('.arrow')).toHaveLength(0)
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

  it('竖式计算题：转发 zeros，按的数填进积那一行；hasBlank 为真', () => {
    const q = sample('m4s1-04-written', (x) => x.input === 'numpad' && x.stem.some((p) => p.kind === 'mul-vertical' && !!p.zeros))
    expect(hasBlank(q)).toBe(true)
    const w = mount(QuestionRenderer, { props: { question: q, fill: { value: '12', done: false } } })
    expect(w.find('.vertical.mul').exists()).toBe(true)
    expect(w.findAll('.vertical .answer .typed').map((c) => c.text()).slice(-2)).toEqual(['1', '2'])
    w.unmount()
  })

  it('写好的竖式（改错、箭头）：没有积那一行，按的数不往竖式里填；hasBlank 为假', () => {
    const q = sample('m4s1-04-written', (x) => x.input === 'numpad' && x.stem.some((p) => p.kind === 'mul-vertical' && !!p.work))
    expect(hasBlank(q)).toBe(false)
    const w = mount(QuestionRenderer, { props: { question: q, fill: { value: '12', done: false } } })
    expect(w.find('.vertical .answer').exists()).toBe(false)
    expect(w.find('.vertical .sum').exists()).toBe(true)
    w.unmount()
    const marked = sample('m4s1-04-written', (x) => x.stem.some((p) => p.kind === 'mul-vertical' && !!p.mark))
    const m = mount(QuestionRenderer, { props: { question: marked } })
    expect(m.findAll('.vertical .arrow').filter((a) => a.text() === '←')).toHaveLength(1)
    m.unmount()
  })

  it('对战里（不传 fill）积那一行是空的', () => {
    const q = sample('m4s1-04-written', (x) => x.stem.some((p) => p.kind === 'mul-vertical' && !p.work))
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.findAll('.vertical .answer .typed').every((c) => c.text() === '')).toBe(true)
    w.unmount()
  })
})

describe('第三、四单元每个知识点的题都能渲染（中英文，三档各几道）', () => {
  for (const kp of ['m4s1-04-oral', 'm4s1-04-written', 'm4s1-04-pattern', 'm4s1-04-estimate', 'm4s1-05-total-part', 'm4s1-05-price', 'm4s1-05-speed']) {
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
