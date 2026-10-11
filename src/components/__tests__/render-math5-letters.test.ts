// @vitest-environment happy-dom
// 五上「用字母表示数和数量关系」的新教具（五年级数学 D）：找规律的图 PatternDots（拼桌子、圆片、棋子）。
// 先用手写的数据查组件画得对（桌子几张、座位几个、黑棋白棋各几个、「……」和编号），再挂真实题目查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import PatternDots from '@/components/math/PatternDots.vue'
import patternSource from '@/components/math/PatternDots.vue?raw'
import { AXB } from '@/content/math/grade5/generators/letters'

afterEach(() => setLang('zh'))

describe('找规律的图（PatternDots）', () => {
  it('拼桌子：每张桌子一个长方形，上下各坐 side 人、两头各 1 人（例 4：3 张坐 8 人；练习十三 6：2 张坐 10 人）', () => {
    const one = mount(PatternDots, { props: { figs: [{ t: 'tables', n: 3, side: 1 }] } })
    expect(one.findAll('rect.table')).toHaveLength(3)
    expect(one.findAll('circle.seat')).toHaveLength(8)
    one.unmount()
    const two = mount(PatternDots, { props: { figs: [{ t: 'tables', n: 2, side: 2 }] } })
    expect(two.findAll('rect.table')).toHaveLength(2)
    expect(two.findAll('circle.seat')).toHaveLength(10)
    two.unmount()
  })

  it('课本的三幅拼桌子并排、后面画「……」：桌子一共 6 张、座位 4 + 6 + 8 个', () => {
    const w = mount(PatternDots, { props: { figs: [1, 2, 3].map((n) => ({ t: 'tables' as const, n, side: 1 as const })), more: true } })
    expect(w.findAll('g.fig')).toHaveLength(3)
    expect(w.findAll('rect.table')).toHaveLength(6)
    expect(w.findAll('circle.seat')).toHaveLength(18)
    expect(w.find('text.more').text()).toBe('……')
    w.unmount()
  })

  it('圆片：一排一排，2、4、6、8 个，每排居中（同一排的圆心等高，左右对称）', () => {
    const w = mount(PatternDots, { props: { figs: [{ t: 'rows', counts: [2, 4, 6, 8] }] } })
    const discs = w.findAll('circle.disc')
    expect(discs).toHaveLength(20)
    const xs = discs.map((c) => Number(c.attributes('cx')))
    const width = Math.max(...xs) + Math.min(...xs)
    // 第一排两个圆片关于整幅图的中线对称
    expect(xs[0]! + xs[1]!).toBeCloseTo(width, 5)
    expect(w.find('text.more').exists()).toBe(false)
    w.unmount()
  })

  it('棋子：r 行 r + 1 列，第 i 行前 i 个黑棋（第三幅 4 行 5 列：黑 10、白 10）；编号 1、2、3', () => {
    const w = mount(PatternDots, { props: { figs: [2, 3, 4].map((r) => ({ t: 'stones' as const, r })), numbered: true } })
    expect(w.findAll('circle.black')).toHaveLength(3 + 6 + 10)
    expect(w.findAll('circle.white')).toHaveLength(3 + 6 + 10)
    expect(w.findAll('text.num-txt').map((x) => x.text())).toEqual(['1', '2', '3'])
    w.unmount()
  })

  it('图里没有字（只有编号和「……」），读屏只说是找规律的图', () => {
    const w = mount(PatternDots, { props: { figs: [{ t: 'tables', n: 2, side: 1 }] } })
    expect(w.find('svg').attributes('aria-label')).toBe('找规律的图')
    expect(w.text()).toBe('')
    w.unmount()
  })

  it('窄栏里不伸出去：SVG 按 viewBox 等比缩小（max-width: 100%、height: auto）', () => {
    const rule = /\nsvg \{([^}]*)\}/.exec(patternSource)?.[1] ?? ''
    expect(rule).toContain('max-width: 100%')
    expect(rule).toContain('height: auto')
  })
})

describe('真实题目：QuestionRenderer 把 pattern-dots 的字段都转发了', () => {
  function find(pred: (q: Question) => boolean): Question {
    const gen = getGenerator(AXB)!
    for (let seed = 1; seed <= 2000; seed++)
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        if (pred(q)) return q
      }
    throw new Error('没找到')
  }
  const dotsOf = (q: Question): Extract<StemPart, { kind: 'pattern-dots' }> | undefined =>
    q.stem.find((p): p is Extract<StemPart, { kind: 'pattern-dots' }> => p.kind === 'pattern-dots')

  it('例 4 拼桌子（figs、more）与练习十二 5 的棋子（numbered）', () => {
    for (const pick of [(q: Question) => dotsOf(q)?.figs[0]?.t === 'tables', (q: Question) => dotsOf(q)?.figs[0]?.t === 'stones']) {
      const q = find(pick)
      const part = dotsOf(q)!
      const w = mount(QuestionRenderer, { props: { question: q } })
      const c = w.findComponent(PatternDots)
      expect(c.exists(), q.id).toBe(true)
      expect(c.props('figs')).toEqual(part.figs)
      expect(c.props('more')).toBe(part.more ?? false)
      expect(c.props('numbered')).toBe(part.numbered ?? false)
      w.unmount()
    }
  })
})
