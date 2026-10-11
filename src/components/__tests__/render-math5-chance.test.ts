// @vitest-environment happy-dom
// 五上「可能性」的新教具（五年级数学 C）：摸球盒（DrawBox）、转盘（Spinner）——个数、颜色、编号对得上，同一盒球每次画得一样；
// QuestionRenderer 把字段都转发过去；三个知识点每种题中英文都能渲染。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import DrawBox from '@/components/math/DrawBox.vue'
import Spinner from '@/components/math/Spinner.vue'
import type { Question } from '@/types/models'

afterEach(() => setLang('zh'))

describe('摸球盒（DrawBox）', () => {
  it('一个盒子：每个球一个圆，颜色和个数照传的画；同一盒球每次排得一样', () => {
    const props = { boxes: [[{ color: 'red' as const, n: 4 }, { color: 'blue' as const, n: 2 }]] }
    const w = mount(DrawBox, { props })
    const fills = w.findAll('circle.ball').map((c) => c.attributes('fill'))
    expect(fills).toHaveLength(6)
    expect(fills.filter((f) => f === '#e8453c')).toHaveLength(4)
    expect(fills.filter((f) => f === '#3d8fe0')).toHaveLength(2)
    expect(w.find('ellipse.hole').exists()).toBe(true)
    expect(w.find('rect.front').exists()).toBe(true)
    const again = mount(DrawBox, { props })
    expect(again.findAll('circle.ball').map((c) => `${c.attributes('cx')},${c.attributes('cy')},${c.attributes('fill')}`)).toEqual(
      w.findAll('circle.ball').map((c) => `${c.attributes('cx')},${c.attributes('cy')},${c.attributes('fill')}`),
    )
  })

  it('棋子、纸袋、几个盒子并排编号；15 个球的盒子也排得下（球都在盒子前面里）', () => {
    const pawns = mount(DrawBox, { props: { boxes: [[{ color: 'red', n: 8 }]], piece: 'pawn' } })
    expect(pawns.findAll('path.pawn')).toHaveLength(8)
    expect(pawns.findAll('circle.ball')).toHaveLength(0)
    const bag = mount(DrawBox, { props: { boxes: [[{ color: 'red', n: 8 }, { color: 'blue', n: 2 }]], bag: true } })
    expect(bag.find('path.bag').exists()).toBe(true)
    expect(bag.find('rect.front').exists()).toBe(false)
    const two = mount(DrawBox, {
      props: {
        boxes: [
          [{ color: 'red', n: 4 }, { color: 'yellow', n: 4 }, { color: 'blue', n: 4 }, { color: 'green', n: 3 }],
          [{ color: 'green', n: 9 }, { color: 'blue', n: 3 }, { color: 'yellow', n: 2 }, { color: 'red', n: 1 }],
        ],
        numbered: true,
      },
    })
    expect(two.findAll('figcaption.no').map((c) => c.text())).toEqual(['1', '2'])
    for (const fig of two.findAll('figure.draw-box')) {
      const front = fig.find('rect.front')
      const x0 = Number(front.attributes('x'))
      const y0 = Number(front.attributes('y'))
      const balls = fig.findAll('circle.ball')
      expect(balls).toHaveLength(15)
      for (const b of balls) {
        expect(Number(b.attributes('cx'))).toBeGreaterThan(x0)
        expect(Number(b.attributes('cy'))).toBeGreaterThan(y0)
        expect(Number(b.attributes('cy'))).toBeLessThan(y0 + Number(front.attributes('height')))
      }
    }
  })
})

describe('转盘（Spinner）', () => {
  it('平均分成几份、一份一个颜色、一根指针；几个并排编号', () => {
    const w = mount(Spinner, { props: { items: [['yellow', 'yellow', 'red', 'yellow', 'yellow', 'yellow']] } })
    const sectors = w.findAll('path.sector')
    expect(sectors).toHaveLength(6)
    expect(sectors.filter((s) => s.attributes('fill') === '#ee5a52')).toHaveLength(1)
    expect(w.find('line.needle').exists()).toBe(true)
    // 指针朝右
    const n = w.find('line.needle')
    expect(Number(n.attributes('x2'))).toBeGreaterThan(Number(n.attributes('x1')))
    expect(n.attributes('y2')).toBe(n.attributes('y1'))
    const three = mount(Spinner, { props: { items: [Array(8).fill('blue'), Array(8).fill('red'), Array(8).fill('yellow')], numbered: true } })
    expect(three.findAll('figcaption.no').map((c) => c.text())).toEqual(['1', '2', '3'])
    expect(three.findAll('path.sector')).toHaveLength(24)
  })
})

describe('QuestionRenderer 与三个知识点', () => {
  it('把摸球盒、转盘的字段转发过去', () => {
    const q: Question = {
      id: 't:1',
      kpId: 'm5s1-08-likely',
      type: 'chance',
      difficulty: 1,
      input: 'choice',
      answer: { kind: 'choice', choiceId: 'a' },
      choices: [{ id: 'a', label: '1' }, { id: 'b', label: '2' }],
      stem: [
        { kind: 'draw-box', boxes: [[{ color: 'red', n: 3 }], [{ color: 'white', n: 2 }]], piece: 'pawn', numbered: true },
        { kind: 'spinner', items: [['red', 'blue'], ['green', 'green', 'red']], numbered: true },
      ],
    }
    const r = mount(QuestionRenderer, { props: { question: q } })
    expect(r.findAll('path.pawn')).toHaveLength(5)
    expect(r.findAll('.draw-box figcaption.no')).toHaveLength(2)
    expect(r.findAll('path.sector')).toHaveLength(5)
    expect(r.findAll('.spinner figcaption.no')).toHaveLength(2)
  })

  it('三个知识点每种题中英文都能渲染', () => {
    for (const kpId of ['m5s1-08-certain', 'm5s1-08-likely', 'm5s1-08-infer']) {
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
            const w = mount(QuestionRenderer, { props: { question: q } })
            expect(w.text(), q.id).not.toMatch(/\bm5\.[a-zA-Z]|undefined|NaN/)
            w.unmount()
            const p = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(p.text(), q.id).not.toMatch(/\bm5\.[a-zA-Z]|undefined|NaN/)
            p.unmount()
          }
          setLang('zh')
        }
      expect(seen.size, kpId).toBeGreaterThanOrEqual(5)
    }
  })
})
