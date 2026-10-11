// @vitest-environment happy-dom
// 五上「小数除法」的教具（五年级数学 C）：LongDivision 的小数模式（小数点在两列之间、和被除数的小数点对齐、添 0 往右延伸、
// 除数是小数的划法、补的 0、绿底、红框）、DecCard 的循环小数圆点；三下的整数竖式样子不变；QuestionRenderer 把字段和按的数都转发过去；
// 四个知识点每种题中英文都能渲染。
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Question } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import { repeating } from '@/engine/fraction'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import LongDivision from '@/components/math/LongDivision.vue'
import DecCard from '@/components/math/DecCard.vue'
import { hasBlank } from '@/components/practice/blank'
import { divWork } from '@/content/math/grade5/generators/decdiv'

afterEach(() => setLang('zh'))

/** 每个数字：[文字, x, y] */
const cells = (w: VueWrapper): [string, number, number][] => w.findAll('text.num').map((t) => [t.text(), Number(t.attributes('x')), Number(t.attributes('y'))])
/** 按行（y）分组的文字 */
function rowsOf(w: VueWrapper): [string, number][][] {
  const m = new Map<number, [string, number][]>()
  for (const [s, x, y] of cells(w)) m.set(y, [...(m.get(y) ?? []), [s, x]])
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r.sort((a, b) => a[1] - b[1]))
}
/** 小数点：[x, y] */
const points = (w: VueWrapper): [number, number][] => w.findAll('circle.pt').map((c) => [Number(c.attributes('cx')), Number(c.attributes('cy'))])

describe('LongDivision 的小数模式', () => {
  it('例 1 (2) 22.4 ÷ 4 = 5.6：小数点画在两列之间、不占一格，商的小数点和被除数的小数点上下对齐', () => {
    const work = divWork(4, [2, 2, 4], 2)
    const w = mount(LongDivision, { props: { divisor: '4', dividend: '22.4', quotient: work.quotient, rows: work.rows, cols: work.cols } })
    const [q, top] = rowsOf(w)
    expect(q!.map(([s]) => s)).toEqual(['5', '6'])
    // 第 1 行：除数 4 和被除数的三位 2、2、4（小数点不是一个字）
    expect(top!.map(([s]) => s)).toEqual(['4', '2', '2', '4'])
    const xs = top!.slice(1).map(([, x]) => x)
    expect(q!.map(([, x]) => x)).toEqual([xs[1], xs[2]])
    const pts = points(w)
    expect(pts).toHaveLength(2)
    // 两个小数点在同一个 x 上，在第二个 2 和 4 之间
    expect(pts[0]![0]).toBeCloseTo(pts[1]![0])
    expect(pts[0]![0]).toBeGreaterThan(xs[1]!)
    expect(pts[0]![0]).toBeLessThan(xs[2]!)
    expect(w.findAll('line.rule')).toHaveLength(2)
  })

  it('例 1 (1) 22 ÷ 4 = 5.5：被除数不写 .0，商往右多一列，上面那条横线跟着延长；红框框住商的第二个 5', () => {
    const work = divWork(4, [2, 2], 2)
    const w = mount(LongDivision, { props: { divisor: '4', dividend: '22', quotient: work.quotient, rows: work.rows, cols: work.cols, boxed: 1 } })
    const [q, top] = rowsOf(w)
    expect(top!.map(([s]) => s)).toEqual(['4', '2', '2'])
    expect(q!.map(([s]) => s)).toEqual(['5', '5'])
    // 第二个 5 在被除数右边一格
    const step = top![2]![1] - top![1]![1]
    expect(q![1]![1] - top![2]![1]).toBeCloseTo(step)
    // 被除数上没有小数点，商里有一个
    expect(points(w)).toHaveLength(1)
    const bar = w.findAll('line.bar')[0]!
    expect(Number(bar.attributes('x2'))).toBeGreaterThan(q![1]![1])
    const box = w.find('rect.boxed')
    expect(box.exists()).toBe(true)
    expect(Number(box.attributes('x')) + Number(box.attributes('width')) / 2).toBeCloseTo(q![1]![1])
  })

  it('例 2 3 ÷ 4：被除数写成 3.0，添上的 0 是红字；例 3 的余数 25 绿底', () => {
    const a = mount(LongDivision, { props: { divisor: '4', dividend: '3.0', pad: 1 } })
    expect(a.findAll('text.num.added').map((t) => t.text())).toEqual(['0'])
    const work = divWork(75, [4, 0, 0], 3, 3)
    const b = mount(LongDivision, { props: { divisor: '75', dividend: '400', quotient: work.quotient, rows: work.rows, cols: work.cols, hl: [[1, 2], [7, 2]] } })
    expect(b.findAll('rect.mark')).toHaveLength(2)
    expect(rowsOf(b)[0]!.map(([s]) => s)).toEqual(['5', '3', '3', '3'])
  })

  it('例 4 0.85 ) 7.65：除数前面的 0 和两个小数点画红线划掉；移动以后被除数还有小数部分的点上新的小数点（4.48 → 44.8）', () => {
    const a = mount(LongDivision, { props: { divisor: '0.85', dividend: '7.65', moved: 3, quotient: { text: '9', end: 2 } } })
    // 划掉：除数的 0、除数的小数点、被除数原来的小数点
    expect(a.findAll('line.strike')).toHaveLength(3)
    expect(points(a)).toHaveLength(2)
    const top = rowsOf(a)[1]!
    expect(top.map(([s]) => s)).toEqual(['0', '8', '5', '7', '6', '5'])
    const b = mount(LongDivision, { props: { divisor: '3.2', dividend: '4.48', moved: 2, quotient: { text: '1.4', end: 2 }, rows: divWork(32, [4, 4, 8], 2).rows } })
    // 除数的小数点、被除数原来的小数点划掉；新的小数点和商的小数点对齐
    expect(b.findAll('line.strike')).toHaveLength(2)
    const pts = points(b)
    expect(pts).toHaveLength(4)
    const xsOnTop = pts.filter(([, y]) => y > 30 && y < 60).map(([x]) => x)
    const qPoint = pts.find(([, y]) => y < 30)!
    expect(xsOnTop.some((x) => Math.abs(x - qPoint[0]) < 0.01)).toBe(true)
  })

  it('问商的空（数字键盘）：和移动以后的整数部分一样宽，按的数右对齐填进去', () => {
    const w = mount(LongDivision, { props: { divisor: '0.28', dividend: '12.60', moved: 4, pad: 1, quotient: { text: '?', end: 3, w: 4 }, answer: '45' } })
    const slot = w.find('rect.slot')
    expect(Number(slot.attributes('width'))).toBeGreaterThan(22 * 4 - 4)
    const typed = w.findAll('text.typed')
    expect(typed.map((t) => t.text())).toEqual(['4', '5'])
    const top = rowsOf(w)[1]!
    // 4 在 6 的上方、5 在补的 0 上方
    expect(typed.map((t) => Number(t.attributes('x')))).toEqual([top[5]![1], top[6]![1]])
  })

  it('三下的整数竖式样子不变：传数的时候除数写在 x = 16、没有小数点和红线', () => {
    const w = mount(LongDivision, { props: { divisor: 6, dividend: 148, quotient: { text: '24', end: 2 } } })
    expect(cells(w)[0]).toEqual(['6', 16, 3 + 30 + 22])
    expect(points(w)).toHaveLength(0)
    expect(w.findAll('line.strike')).toHaveLength(0)
    expect(w.find('svg').attributes('viewBox')).toBe(`0 0 ${40 + 22 * 3 + 10} ${3 + 30 * 2 + 4}`)
  })
})

describe('DecCard 的循环小数', () => {
  it('上点画在那一位上（不占一个字）；没有上点的小数和原来一样', () => {
    const w = mount(DecCard, { props: { n: repeating('7', '1', '45') } })
    expect(w.text()).toBe('7.145')
    expect(w.findAll('.d.rep').map((d) => d.text())).toEqual(['4', '5'])
    const plain = mount(DecCard, { props: { n: '340.09', marks: [4] } })
    expect(plain.findAll('.d.rep')).toHaveLength(0)
    expect(plain.findAll('.d.mark').map((d) => d.text())).toEqual(['0'])
  })
})

describe('QuestionRenderer 与练习页', () => {
  it('把小数除法竖式的全部字段转发过去；只有商那一行有空的数字键盘题算「答案填在题目里」', () => {
    const q: Question = {
      id: 't:1',
      kpId: 'm5s1-03-dec-divisor',
      type: 'dec-calc',
      difficulty: 1,
      input: 'numpad',
      answer: { kind: 'number', value: 45 },
      stem: [{ kind: 'dec-division', divisor: '0.28', dividend: '12.60', moved: 4, pad: 1, cols: 4, quotient: { text: '?', end: 3, w: 4 }, hl: [[0, 1]], boxed: 0, rows: [{ text: '112', end: 2, line: true }] }],
    }
    expect(hasBlank(q)).toBe(true)
    const r = mount(QuestionRenderer, { props: { question: q, fill: { value: '45', done: false } } })
    expect(r.findAll('text.typed').map((t) => t.text())).toEqual(['4', '5'])
    expect(r.findAll('line.strike').length).toBeGreaterThanOrEqual(3)
    expect(r.findAll('text.num.added').map((t) => t.text())).toEqual(['0'])
    expect(r.findAll('rect.mark')).toHaveLength(1)
    expect(hasBlank({ ...q, stem: [{ kind: 'dec-division', divisor: '4', dividend: '22.4' }] })).toBe(false)
    expect(hasBlank({ ...q, input: 'choice' })).toBe(false)
  })

  it('四个知识点每种题中英文都能渲染（带空的题填上按的数）', () => {
    for (const kpId of ['m5s1-03-int-divisor', 'm5s1-03-repeating', 'm5s1-03-dec-divisor', 'm5s1-03-approx']) {
      const gen = getGenerator(kpId)!
      const seen = new Set<string>()
      for (let seed = 1; seed <= 120; seed++)
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          const kind = q.id.split(':')[1]!.split('-')[0]!
          if (seen.has(kind)) continue
          seen.add(kind)
          for (const lang of ['zh', 'en'] as const) {
            setLang(lang)
            const fill = hasBlank(q) ? { value: '12', done: false } : null
            const w = mount(QuestionRenderer, { props: { question: q, fill } })
            expect(w.text(), q.id).not.toMatch(/\bm5\.[a-zA-Z]|undefined|NaN/)
            w.unmount()
            const p = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(p.text(), q.id).not.toMatch(/\bm5\.[a-zA-Z]|undefined|NaN/)
            p.unmount()
          }
          setLang('zh')
        }
      expect(seen.size, kpId).toBeGreaterThanOrEqual(6)
    }
  })
})
