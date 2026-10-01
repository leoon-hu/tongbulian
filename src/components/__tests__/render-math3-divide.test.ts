// @vitest-environment happy-dom
// 三下「除数是一位数的除法」的除法竖式（LongDivision）：数字按数位对齐、商写在对应数位上方、「?」空里填按的数（右对齐、
// 不透露商有几位）、改错题的空位与横线、方框；QuestionRenderer 把字段和练习页按的数都转发过去；除法五个知识点每种题中英文都能渲染。
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Question } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import LongDivision from '@/components/math/LongDivision.vue'
import { hasBlank } from '@/components/practice/blank'
import { divisionWork } from '@/content/math/grade3/generators/divide'

afterEach(() => setLang('zh'))

/** 每个数字：[文字, x, y] */
const cells = (w: VueWrapper): [string, number, number][] => w.findAll('text.num').map((t) => [t.text(), Number(t.attributes('x')), Number(t.attributes('y'))])
/** 按行（y）分组的文字 */
function rowsOf(w: VueWrapper): Map<number, [string, number][]> {
  const m = new Map<number, [string, number][]>()
  for (const [s, x, y] of cells(w)) m.set(y, [...(m.get(y) ?? []), [s, x]])
  return m
}

describe('除法竖式（LongDivision）', () => {
  it('课本的 148 ÷ 6：商 24 写在十位、个位上面，下面每一行按数位对齐，两条横线', () => {
    const work = divisionWork(148, 6)
    const w = mount(LongDivision, { props: { divisor: 6, dividend: 148, quotient: { text: '24', end: 2 }, rows: work.rows } })
    const byRow = [...rowsOf(w).entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r)
    // 第 0 行商、第 1 行除数和被除数、下面 4 行
    const [q, top, ...rest] = byRow
    expect(top!.map(([s]) => s)).toEqual(['6', '1', '4', '8'])
    const xs = top!.slice(1).map(([, x]) => x)
    expect(q!.map(([s]) => s)).toEqual(['2', '4'])
    expect(q!.map(([, x]) => x)).toEqual([xs[1], xs[2]])
    expect(rest.map((r) => r.map(([s]) => s).join(''))).toEqual(['12', '28', '24', '4'])
    expect(rest[0]!.map(([, x]) => x)).toEqual([xs[0], xs[1]])
    expect(rest[3]!.map(([, x]) => x)).toEqual([xs[2]])
    expect(w.findAll('line.rule')).toHaveLength(2)
  })

  it('问商的空：和被除数一样宽；按的数右对齐写进去（个位对个位），判完变绿', () => {
    const empty = mount(LongDivision, { props: { divisor: 6, dividend: 148, quotient: { text: '?', end: 2, w: 3 }, answer: '' } })
    const slot = empty.find('rect.slot')
    expect(slot.exists()).toBe(true)
    expect(Number(slot.attributes('width'))).toBeGreaterThan(22 * 3 - 4)
    expect(empty.findAll('text.typed').map((t) => t.text())).toEqual(['?'])

    const typed = mount(LongDivision, { props: { divisor: 6, dividend: 148, quotient: { text: '?', end: 2, w: 3 }, answer: '24' } })
    const digitsX = [...rowsOf(typed).entries()]
      .sort((a, b) => a[0] - b[0])[1]![1]
      .slice(1)
      .map(([, x]) => x)
    const t = typed.findAll('text.typed')
    expect(t.map((x) => x.text())).toEqual(['2', '4'])
    expect(t.map((x) => Number(x.attributes('x')))).toEqual([digitsX[1], digitsX[2]])

    const done = mount(LongDivision, { props: { divisor: 6, dividend: 148, quotient: { text: '?', end: 2, w: 3 }, answer: '24', done: true } })
    expect(done.find('.long-division').classes()).toContain('done')
  })

  it('改错题的商可以空一位（406 ÷ 2 写成「2 3」）；方框题的那一位画成空方框、不显示数字', () => {
    const w = mount(LongDivision, { props: { divisor: 2, dividend: 406, quotient: { text: '2 3', end: 2 }, rows: divisionWork(406, 2).rows } })
    const [q] = [...rowsOf(w).entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r)
    expect(q!.map(([s]) => s)).toEqual(['2', '3'])
    expect(q![1]![1] - q![0]![1]).toBeCloseTo(44) // 中间空了一位（每位 22）
    const box = mount(LongDivision, { props: { divisor: 4, dividend: 172, box: 0 } })
    expect(box.findAll('rect.box')).toHaveLength(1)
    expect(cells(box).map(([s]) => s)).toEqual(['4', '7', '2'])
  })

  it('QuestionRenderer 把除法竖式的全部字段和练习页按的数转发过去；只有问商的数字键盘题有「空」', () => {
    const q: Question = {
      id: 't:1',
      kpId: 'm3s2-02-written',
      type: 'divide',
      difficulty: 1,
      input: 'numpad',
      answer: { kind: 'number', value: 24 },
      stem: [{ kind: 'long-division', divisor: 6, dividend: 148, quotient: { text: '?', end: 2, w: 3 }, box: 1 }],
    }
    expect(hasBlank(q)).toBe(true)
    const r = mount(QuestionRenderer, { props: { question: q, fill: { value: '24', done: false } } })
    expect(r.findAll('text.typed').map((t) => t.text())).toEqual(['2', '4'])
    expect(r.findAll('rect.box')).toHaveLength(1)
    expect(hasBlank({ ...q, stem: [{ kind: 'long-division', divisor: 6, dividend: 148 }] })).toBe(false)
    expect(hasBlank({ ...q, input: 'choice' })).toBe(false)
  })

  it('除法四个知识点每种题中英文都能渲染（带竖式的题填上按的数）', () => {
    for (const kpId of ['m3s2-02-oral', 'm3s2-02-written', 'm3s2-02-zeros', 'm3s2-02-solve']) {
      const gen = getGenerator(kpId)!
      const seen = new Set<string>()
      for (let seed = 1; seed <= 150; seed++)
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          const kind = q.id.split(':')[1]!.split('-').slice(0, 2).join('-')
          if (seen.has(kind)) continue
          seen.add(kind)
          for (const lang of ['zh', 'en'] as const) {
            setLang(lang)
            const fill = hasBlank(q) ? { value: '12', done: false } : null
            const w = mount(QuestionRenderer, { props: { question: q, fill } })
            expect(w.text(), q.id).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN/)
            w.unmount()
            const p = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(p.text(), q.id).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN/)
            p.unmount()
          }
          setLang('zh')
        }
      expect(seen.size, kpId).toBeGreaterThanOrEqual(3)
    }
  })
})
