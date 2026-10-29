// @vitest-environment happy-dom
// 五年级道德与法治的渲染测试（和别的学科分文件：happy-dom 每次挂载都会攒一点内存）
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/morality/grade5' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/morality/grade5/curriculum'
import { items } from '@/content/morality/grade5/generators'
import { createRng } from '@/engine'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import { hasBlank, hasChoiceBlank } from '@/components/practice/blank'

describe('五年级道德与法治题目渲染冒烟测试（每课的每种题目模板各挂一道）', () => {
  for (const kp of KNOWLEDGE_POINTS) {
    it(`${kp.id} 的题干与作答面板都能正常渲染，文字都注了音`, () => {
      const { items: byName, mix } = items.get(kp.id)!
      let mounted = 0
      const names = new Set(([1, 2, 3] as const).flatMap((d) => mix[d].map(([n]) => n)))
      for (const name of names) {
        const it = byName[name]?.[0]
        if (!it) continue
        const q = it.build(2, createRng(mounted + 1))
        const stem = mount(QuestionRenderer, { props: { question: q } })
        expect(stem.html().length).toBeGreaterThan(0)
        // 题目、做法全部注音（D4）
        expect(stem.findAll('rt').length).toBeGreaterThan(0)
        if (name === 'cloze') expect(stem.find('.verse').exists()).toBe(true)
        stem.unmount()
        const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
        expect(panel.findAll('button').length).toBe(q.choices!.length)
        expect(panel.findAll('rt').length).toBeGreaterThan(0)
        panel.unmount()
        expect(hasBlank(q)).toBe(false)
        expect(hasChoiceBlank(q)).toBe(name === 'cloze')
        mounted += 1
      }
      // 有的历史课只有判断题和问答（课本里没有能做填空的句子），各模板都挂上了就行
      expect(mounted).toBe(names.size)
      expect(mounted).toBeGreaterThanOrEqual(2)
    })
  }
})
