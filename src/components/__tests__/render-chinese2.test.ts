// @vitest-environment happy-dom
// 二年级语文的渲染测试（和一年级分两个文件：happy-dom 每次挂载都会攒一点内存，放在一个进程里会超过 4 GB 堆）
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question } from '@/types/models'
import '@/content/chinese/grade2' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/chinese/grade2/curriculum'
import { LESSON_ITEMS } from '@/content/chinese/grade2/generators'
import { createRng, getGenerator } from '@/engine'
import { answerText } from '@/engine/answer'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import { hasBlank } from '@/components/practice/blank'
import ChoiceCards from '@/components/ui/ChoiceCards.vue'

describe('二年级题目渲染冒烟测试（每个知识点的每种题目模板各挂一道）', () => {
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

describe('二年级新题型的样子（需求 Y9）', () => {
  /** 某个知识点里第一道满足条件的题（三档、多个种子里找） */
  function find(ok: (q: Question) => boolean): Question {
    for (const kp of KNOWLEDGE_POINTS) {
      const gen = getGenerator(kp.id)!
      for (let seed = 1; seed <= 60; seed++) {
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          if (ok(q)) return q
        }
      }
    }
    throw new Error('找不到')
  }
  const maker = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!

  it('多音字：大字格写出整个词、考的字标红，不注音；选项是拼音', () => {
    const q = find((x) => maker(x) === 'poly')
    const grid = q.stem.find((p) => p.kind === 'hanzi')!
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.findAll('.hanzi .cell')).toHaveLength(Array.from(grid.kind === 'hanzi' ? grid.text : '').length)
    expect(w.findAll('.hanzi .cell.mark')).toHaveLength(1)
    expect(w.find('.hanzi').findAll('rt')).toHaveLength(0)
    w.unmount()
    const cards = mount(ChoiceCards, { props: { choices: q.choices!, revealed: null, choiceStyle: q.choiceStyle } })
    expect(cards.find('.cards').classes()).toContain('as-pinyin')
    cards.unmount()
  })

  it('看拼音选词语：拼音卡是整个词的音节，选项是不注音的楷体词语', () => {
    const q = find((x) => maker(x) === 'pyci')
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.find('.pinyin').text().split(/\s+/).length).toBe(Array.from(answerText(q)).length)
    w.unmount()
    const cards = mount(ChoiceCards, { props: { choices: q.choices!, revealed: null, choiceStyle: q.choiceStyle } })
    expect(cards.find('.cards').classes()).toContain('as-hanzi')
    expect(cards.findAll('rt')).toHaveLength(0)
    cards.unmount()
  })

  it('部首查字法：先查哪个部首是选择题，除去部首几画是数字键盘', () => {
    const which = find((x) => maker(x) === 'bushou')
    expect(which.input).toBe('choice')
    const n = find((x) => maker(x) === 'bushouN')
    expect(n.input).toBe('numpad')
    const panel = mount(AnswerPanel, { props: { question: n, revealed: null } })
    expect(panel.find('.numpad').exists()).toBe(true)
    panel.unmount()
  })
})
