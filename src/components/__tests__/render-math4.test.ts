// @vitest-environment happy-dom
// 四年级数学的渲染冒烟测试（单独一个文件：happy-dom 每次挂载都会攒一点内存，和一、二年级放在一起会超过 4 GB 堆）。
// 各单元新教具的专项检查在 render-math4-<单元>.test.ts。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/math/grade4/curriculum'
import { createRng, getGenerator, hasGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'

afterEach(() => setLang('zh'))

describe('四年级数学题目渲染冒烟测试（每个知识点三档各挂几道）', () => {
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
            expect(stem.text(), q.id).not.toMatch(/\bm4\.[a-zA-Z]|undefined|NaN/)
            stem.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            expect(panel.text(), q.id).not.toMatch(/\bm4\.[a-zA-Z]|undefined|NaN/)
            panel.unmount()
          }
        }
      }
    })
  }
})

