// @vitest-environment happy-dom
// 三年级数学的渲染冒烟测试（单独一个文件：happy-dom 每次挂载都会攒一点内存，和一、二年级放在一起会超过 4 GB 堆）。
// 各单元新教具的专项检查在 render-math3-<单元>.test.ts。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/math/grade3/curriculum'
import { createRng, getGenerator, hasGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'

afterEach(() => setLang('zh'))

describe('三年级数学题目渲染冒烟测试（每个知识点三档各挂几道）', () => {
  for (const kp of KNOWLEDGE_POINTS.filter((k) => hasGenerator(k.id))) {
    it(`${kp.id} 的题干与作答面板都能正常渲染（中英文）`, () => {
      const gen = getGenerator(kp.id)!
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 3; seed++) {
          for (const d of [1, 2, 3] as const) {
            const q = gen(d, createRng(seed * 7 + d))
            const stem = mount(QuestionRenderer, { props: { question: q } })
            const html = stem.html()
            expect(html.length).toBeGreaterThan(0)
            // 词条漏写会原样显示 key
            expect(stem.text(), q.id).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN/)
            stem.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            expect(panel.text(), q.id).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN/)
            panel.unmount()
          }
        }
      }
    })
  }
})

describe('秤面（ScaleDial）照课本的刻度', () => {
  it('体重秤 100 小格、每 10 格一个数、第 5 格画长一点、画大一点；盘秤每 50 克一个数；读屏说明不说指针指着几', async () => {
    const { default: ScaleDial } = await import('@/components/math/ScaleDial.vue')
    const body = mount(ScaleDial, { props: { max: 100, major: 10, minor: 10, value: 27, unit: 'kg' } })
    expect(body.findAll('line.tick')).toHaveLength(100)
    expect(body.findAll('line.tick.big')).toHaveLength(10)
    expect(body.findAll('line.tick.mid')).toHaveLength(10)
    expect(body.find('svg').attributes('style')).toContain('230px')
    expect(body.find('svg').attributes('aria-label')).not.toContain('27')
    body.unmount()
    const pan = mount(ScaleDial, { props: { max: 1000, major: 50, minor: 1, value: 350, unit: 'g' } })
    expect(pan.findAll('text.num').map((t) => t.text())).toEqual(Array.from({ length: 20 }, (_, i) => String(i * 50)))
    expect(pan.findAll('line.tick.mid')).toHaveLength(0)
    expect(pan.find('svg').attributes('aria-label')).not.toContain('350')
    pan.unmount()
  })
})
