// @vitest-environment happy-dom
// 三年级英语的渲染测试（和语文、数学分文件：happy-dom 每次挂载都会攒一点内存）
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/english/grade3' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/english/grade3/curriculum'
import { UNIT_ITEMS } from '@/content/english/grade3/generators'
import { createRng } from '@/engine'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import EnglishText from '@/components/english/EnglishText.vue'
import { hasBlank, hasChoiceBlank } from '@/components/practice/blank'

describe('英语的单词 / 句子卡（EnglishText）', () => {
  it('一个词是大号卡，句子是一行；挖空的句子画空格，答完填上', () => {
    const word = mount(EnglishText, { props: { text: 'apple' } })
    expect(word.find('.english').classes()).toContain('big')
    expect(word.text()).toBe('apple')
    const long = mount(EnglishText, { props: { text: 'grandmother' } })
    expect(long.find('.english').classes()).toContain('long-word')
    const line = mount(EnglishText, { props: { text: 'Nice to meet you.' } })
    expect(line.find('.english').classes()).toContain('line')
    const cloze = mount(EnglishText, { props: { text: 'I like apples.', blank: [2, 4] } })
    expect(cloze.find('.blank').exists()).toBe(true)
    expect(cloze.find('.blank').text()).toBe('')
    expect(cloze.text().replace(/\s+/g, ' ').trim()).toBe('I apples.')
    const filled = mount(EnglishText, { props: { text: 'I like apples.', blank: [2, 4], fill: 'like' } })
    expect(filled.find('.blank.done').text()).toBe('like')
  })
})

describe('三年级英语题目渲染冒烟测试（每个知识点的每种题目模板各挂一道）', () => {
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
        stem.unmount()
        const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
        expect(panel.findAll('button').length).toBeGreaterThan(0)
        if (q.choiceStyle) expect(panel.find('.cards').classes()).toContain(`as-${q.choiceStyle}`)
        if (q.choiceStyle === 'english') expect(panel.findAll('.card .en').length).toBe(q.choices!.length)
        panel.unmount()
        expect(hasBlank(q)).toBe(false)
        if (name === 'cloze') expect(hasChoiceBlank(q)).toBe(true)
        mounted += 1
      }
      expect(mounted).toBeGreaterThan(3)
    })
  }
})
