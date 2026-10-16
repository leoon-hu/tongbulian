// @vitest-environment happy-dom
// 六年级数学 F 的教具：温度计（Thermometer，新）、带正负数的直线（DecScale 的 points、负数刻度、不写数的长刻度）、
// 小数卡（DecCard 的正负号、℃、%、带符号的分数）——画得对、不传新字段时和原来一样；QuestionRenderer 把新字段都转发过去；
// 负数、百分数（二）每种题中英文都能渲染。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import Thermometer from '@/components/math/Thermometer.vue'
import DecScale from '@/components/math/DecScale.vue'
import DecCard from '@/components/math/DecCard.vue'

afterEach(() => setLang('zh'))

describe('温度计（Thermometer）', () => {
  it('刻度从 min 到 max 每 minor 一个，major 的倍数写数、0 是红字、负数写「−」；液柱越高温度越高；两支并排写名字', () => {
    const w = mount(Thermometer, { props: { items: [{ value: -10 }], min: -40, max: 40, major: 10, minor: 2 } })
    expect(w.findAll('line.tick')).toHaveLength(41)
    expect(w.findAll('line.tick.long')).toHaveLength(9)
    expect(w.findAll('text.num').map((t) => t.text())).toEqual(['−40', '−30', '−20', '−10', '0', '10', '20', '30', '40'])
    expect(w.find('text.num.zero').text()).toBe('0')
    expect(w.find('text.unit').text()).toBe('℃')
    expect(w.attributes('aria-label')).toBe('温度计')
    // 液柱顶在 −10 那一根长刻度上
    const tickY = Number(w.findAll('line.tick.long')[3]!.attributes('y1'))
    expect(Number(w.find('rect.liquid').attributes('y'))).toBeCloseTo(tickY)
    w.unmount()

    const two = mount(Thermometer, { props: { items: [{ value: -18, name: '甲' }, { value: -3, name: '乙' }], min: -30, max: 30, major: 10, minor: 2 } })
    const tops = two.findAll('rect.liquid').map((r) => Number(r.attributes('y')))
    expect(tops).toHaveLength(2)
    // 低的温度液柱短（顶的 y 大）
    expect(tops[0]!).toBeGreaterThan(tops[1]!)
    expect(two.findAll('figcaption.name').map((c) => c.text())).toEqual(['甲', '乙'])
    two.unmount()
  })
})

describe('带正负数的直线（DecScale 的新字段）', () => {
  it('例 3：刻度字带负号和单位、小一号，点上写名字，直线往下挪出写名字的地方', () => {
    const labels = ['−4 m', '−3 m', '−2 m', '−1 m', '0', '1 m', '2 m', '3 m', '4 m']
    const points = [
      { i: 0, name: '小雯' },
      { i: 4, name: '树' },
      { i: 8, name: '小东' },
    ]
    const w = mount(DecScale, { props: { labels, per: 1, points } })
    expect(w.findAll('text.num').map((t) => t.text())).toEqual(labels)
    expect(w.findAll('text.num.signed')).toHaveLength(9)
    expect(w.findAll('.point circle')).toHaveLength(3)
    expect(w.findAll('.point text').map((t) => t.text())).toEqual(['小雯', '树', '小东'])
    // 点在刻度上
    const ticks = w.findAll('line.tick')
    expect(Number(w.findAll('.point circle')[1]!.attributes('cx'))).toBeCloseTo(Number(ticks[4]!.attributes('x1')))
    const axisY = Number(w.find('line.axis').attributes('y1'))
    expect(axisY).toBe(36)
    expect(Number(w.findAll('.point text')[0]!.attributes('y'))).toBeLessThan(axisY)
    w.unmount()
  })

  it('做一做：每 0.5 一小格、只写 0 和 1，不写数的长刻度不画字；箭头指在 −2.5', () => {
    const labels = ['', '', '', '', '0', '1', '', '', '']
    const w = mount(DecScale, { props: { labels, per: 2, arrow: 3 } })
    expect(w.findAll('line.tick')).toHaveLength(17)
    expect(w.findAll('text.num').map((t) => t.text())).toEqual(['0', '1'])
    expect(Number(w.find('.arrow line').attributes('x1'))).toBeCloseTo(Number(w.findAll('line.tick')[3]!.attributes('x1')))
    w.unmount()
  })

  it('不传新字段时和原来一样：直线在 16 的高度，没有点，字不是小一号', () => {
    const w = mount(DecScale, { props: { labels: ['0', '1', '2'], per: 10 } })
    expect(Number(w.find('line.axis').attributes('y1'))).toBe(16)
    expect(w.findAll('.point')).toHaveLength(0)
    expect(w.findAll('text.num.signed')).toHaveLength(0)
    expect(w.findAll('text.num').map((t) => t.attributes('class'))).toEqual(['num', 'num', 'num'])
    w.unmount()
  })
})

describe('小数卡（DecCard 的新写法）', () => {
  it('正负号、℃、% 各画成自己的样子，数字照旧是一格一格的', () => {
    const t = mount(DecCard, { props: { n: '−6 ℃' } })
    expect(t.text().replace(/\s/g, '')).toBe('−6℃')
    expect(t.findAll('.sg').map((x) => x.text())).toEqual(['−'])
    expect(t.findAll('.d').map((x) => x.text())).toEqual(['6'])
    expect(t.findAll('.u').map((x) => x.text())).toEqual(['℃'])
    expect(t.findAll('.sp')).toHaveLength(1)
    t.unmount()
    const pct = mount(DecCard, { props: { n: '35%' } })
    expect(pct.findAll('.d').map((x) => x.text())).toEqual(['3', '5'])
    expect(pct.findAll('.u').map((x) => x.text())).toEqual(['%'])
    pct.unmount()
    const plus = mount(DecCard, { props: { n: '+4.7' } })
    expect(plus.findAll('.sg').map((x) => x.text())).toEqual(['+'])
    expect(plus.findAll('.pt')).toHaveLength(1)
    plus.unmount()
  })

  it('带符号的分数：符号在分数前面；不传 sign 的分数和原来一样', () => {
    const f = mount(DecCard, { props: { frac: [3, 8], sign: '−' } })
    expect(f.find('.sg').text()).toBe('−')
    expect(f.find('.frac .num').text()).toBe('3')
    expect(f.find('.frac .den').text()).toBe('8')
    expect(f.find('.frac').attributes('aria-label')).toBe('−3/8')
    f.unmount()
    const old = mount(DecCard, { props: { frac: [47, 1000] } })
    expect(old.find('.sg').exists()).toBe(false)
    expect(old.find('.frac').attributes('aria-label')).toBe('47/1000')
    old.unmount()
    const dec = mount(DecCard, { props: { n: '340.09', marks: [4] } })
    expect(dec.findAll('.d')).toHaveLength(5)
    expect(dec.findAll('.sg, .u, .sp')).toHaveLength(0)
    dec.unmount()
  })
})

describe('QuestionRenderer 与负数、百分数（二）的题', () => {
  it('把温度计、直线的点、卡片的符号都转发过去', () => {
    const q: Question = {
      id: 't:1',
      kpId: 'm6s2-01-meaning',
      type: 'negative',
      difficulty: 1,
      input: 'choice',
      answer: { kind: 'choice', choiceId: 'a' },
      choices: [
        { id: 'a', label: '1' },
        { id: 'b', label: '2' },
      ],
      stem: [
        { kind: 'thermo', items: [{ value: -4 }, { value: 6, name: '乙' }], min: -30, max: 30, major: 10, minor: 2 },
        { kind: 'dec-scale', labels: ['−1', '0', '1'], per: 1, points: [{ i: 0, name: 'A' }] },
        { kind: 'dec-card', frac: [1, 3], sign: '−' },
      ],
    }
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.findComponent(Thermometer).props()).toMatchObject({ min: -30, max: 30, major: 10, minor: 2 })
    expect(w.findAll('rect.liquid')).toHaveLength(2)
    expect(w.findComponent(DecScale).props('points')).toEqual([{ i: 0, name: 'A' }])
    expect(w.find('.point text').text()).toBe('A')
    expect(w.findComponent(DecCard).props('sign')).toBe('−')
    w.unmount()
  })

  it('十个知识点每种题中英文都能渲染（词条不漏、选项都画出来）', () => {
    const kps = ['m6s1-04-negative', 'm6s2-01-meaning', 'm6s2-01-line', 'm6s1-07-discount', 'm6s1-07-interest', 'm6s2-02-discount', 'm6s2-02-chengshu', 'm6s2-02-tax', 'm6s2-02-interest', 'm6s2-02-sale']
    for (const kpId of kps) {
      const gen = getGenerator(kpId)!
      const seen = new Set<string>()
      for (let seed = 1; seed <= 60; seed++)
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          const kind = q.id.split(':')[1]!.split('-')[0]!
          if (seen.has(kind)) continue
          seen.add(kind)
          for (const lang of ['zh', 'en'] as const) {
            setLang(lang)
            const r = mount(QuestionRenderer, { props: { question: q } })
            expect(r.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
            r.unmount()
            const p = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(p.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
            if (q.input === 'choice') expect(p.findAll('button').length, q.id).toBeGreaterThanOrEqual(q.choices!.length)
            p.unmount()
          }
          setLang('zh')
        }
    }
  })
})
