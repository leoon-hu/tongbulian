// @vitest-environment happy-dom
// 四年级英语的渲染测试（和语文、数学、三年级英语分文件：happy-dom 每次挂载都会攒一点内存）
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/english/grade4' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/english/grade4/curriculum'
import { UNIT_ITEMS } from '@/content/english/grade4/generators'
import { createRng } from '@/engine'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import { hasBlank, hasChoiceBlank } from '@/components/practice/blank'

describe('四年级英语题目渲染冒烟测试（每个知识点的每种题目模板各挂一道）', () => {
  for (const kp of KNOWLEDGE_POINTS) {
    it(`${kp.id} 的题干与作答面板都能正常渲染`, () => {
      const { items, mix } = UNIT_ITEMS.get(kp.id)!
      let mounted = 0
      const names = new Set(([1, 2, 3] as const).flatMap((d) => mix[d].map(([n]) => n)))
      for (const name of names) {
        const it = items[name]?.[0]
        if (!it) continue
        const q = it.build(2, createRng(mounted + 1))
        const stem = mount(QuestionRenderer, { props: { question: q } })
        expect(stem.html().length).toBeGreaterThan(0)
        if (q.stem.some((p) => p.kind === 'english')) expect(stem.find('.english').exists()).toBe(true)
        if (q.stem.some((p) => p.kind === 'listen')) expect(stem.find('.listen').exists()).toBe(true)
        // 补全字母组合：挖了空的词画成空格（答完填上），不显示要补的字母
        if (name === 'digraph') {
          expect(stem.find('.english .blank').exists()).toBe(true)
          expect(stem.find('.english').text()).not.toContain((q.stem.find((p) => p.kind === 'listen') as { say: string }).say)
        }
        stem.unmount()
        const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
        expect(panel.findAll('button').length).toBeGreaterThan(0)
        if (q.choiceStyle) expect(panel.find('.cards').classes()).toContain(`as-${q.choiceStyle}`)
        if (q.choiceStyle === 'english') expect(panel.findAll('.card .en').length).toBe(q.choices!.length)
        panel.unmount()
        expect(hasBlank(q)).toBe(false)
        if (name === 'cloze' || name === 'digraph') expect(hasChoiceBlank(q)).toBe(true)
        mounted += 1
      }
      expect(mounted).toBeGreaterThan(3)
    })
  }
})
