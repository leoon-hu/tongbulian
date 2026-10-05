// @vitest-environment happy-dom
// 三年级语文的渲染测试（和一、二年级分文件：happy-dom 每次挂载都会攒一点内存，放在一个进程里会超过 4 GB 堆）
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/chinese/grade3' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/chinese/grade3/curriculum'
import { LESSON_ITEMS } from '@/content/chinese/grade3/generators'
import { createRng } from '@/engine'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import { hasBlank } from '@/components/practice/blank'

describe('三年级题目渲染冒烟测试（每个知识点的每种题目模板各挂一道）', () => {
  for (const kp of KNOWLEDGE_POINTS) {
    it(`${kp.id} 的题干与作答面板都能正常渲染`, () => {
      const { items, mix } = LESSON_ITEMS.get(kp.id)!
      let mounted = 0
      const names = new Set(([1, 2, 3] as const).flatMap((d) => mix[d].map(([n]) => n)))
      for (const name of names) {
        const it = items[name]?.[0]
        if (!it) continue
        const q = it.build(2, createRng(mounted + 1))
        const stem = mount(QuestionRenderer, { props: { question: q } })
        expect(stem.html().length).toBeGreaterThan(0)
        stem.unmount()
        const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
        expect(panel.findAll('button').length).toBeGreaterThan(0)
        if (q.choiceStyle) expect(panel.find('.cards').classes()).toContain(`as-${q.choiceStyle}`)
        panel.unmount()
        expect(hasBlank(q)).toBe(false)
        mounted += 1
      }
      expect(mounted).toBeGreaterThan(3)
    })
  }
})
