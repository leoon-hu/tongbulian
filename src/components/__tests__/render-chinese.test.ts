// @vitest-environment happy-dom
// 语文的渲染测试（单独一个文件：happy-dom 每次挂载都会攒一点内存，和数学放在一个进程里会超过 4 GB 堆）
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question } from '@/types/models'
import '@/content/chinese/grade1' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/chinese/grade1/curriculum'
import { LESSON_ITEMS } from '@/content/chinese/grade1/generators'
import { createRng, getGenerator } from '@/engine'
import { answerText } from '@/engine/answer'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import { hasBlank, hasChoiceBlank } from '@/components/practice/blank'
import ChoiceCards from '@/components/ui/ChoiceCards.vue'

describe('题目渲染冒烟测试（每个知识点的每种题目模板各挂一道）', () => {
  for (const kp of KNOWLEDGE_POINTS) {
    it(`${kp.id} 的题干与作答面板都能正常渲染`, () => {
      const { items, mix } = LESSON_ITEMS.get(kp.id)!
      let mounted = 0
      for (const d of [1, 2, 3] as const) {
        for (const [name] of mix[d]) {
          const list = items[name] ?? []
          // 头尾两条：同一模板的条目题干结构一样，挂两条够了
          for (const it of new Set([list[0], list[list.length - 1]])) {
            if (!it) continue
            const q = it.build(d, createRng(mounted + 1))
            const stem = mount(QuestionRenderer, { props: { question: q } })
            expect(stem.html().length).toBeGreaterThan(0)
            stem.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            if (q.choiceStyle) expect(panel.find('.cards').classes()).toContain(`as-${q.choiceStyle}`)
            panel.unmount()
            // 语文的空在选择题里（答完填上正确答案），数字键盘题没有要填的空
            expect(hasBlank(q)).toBe(false)
            mounted += 1
          }
        }
      }
      expect(mounted).toBeGreaterThan(3)
    })
  }
})

describe('语文的题干与选项（需求 Y2–Y4）', () => {
  afterEach(() => setLang('zh'))

  /** 语文某个知识点里第一道满足条件的题（三档、多个种子里找） */
  function find(kp: string, ok: (q: Question) => boolean): Question {
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 200; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        if (ok(q)) return q
      }
    }
    throw new Error(`${kp} 里找不到`)
  }
  const maker = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!

  it('看字选读音：田字格里的字不注音，选项是拼音（初学者字体）', () => {
    const q = find('c1s1-05-qiutian', (x) => maker(x) === 'zipy')
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.findAll('.hanzi .cell')).toHaveLength(1)
    expect(w.find('.hanzi').findAll('rt')).toHaveLength(0)
    w.unmount()
    const cards = mount(ChoiceCards, { props: { choices: q.choices!, revealed: null, choiceStyle: q.choiceStyle } })
    expect(cards.find('.cards').classes()).toContain('as-pinyin')
    expect(cards.findAll('rt')).toHaveLength(0)
    cards.unmount()
  })

  it('考认字的楷体选项一个音也不注；听音题屏幕上没有要听的字', () => {
    const q = find('c1s1-06-riyueming', (x) => maker(x) === 'listen')
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.find('.listen').exists()).toBe(true)
    expect(w.find('.listen').text()).not.toContain(answerText(q))
    w.unmount()
    const cards = mount(ChoiceCards, { props: { choices: q.choices!, revealed: null, choiceStyle: q.choiceStyle } })
    expect(cards.find('.cards').classes()).toContain('as-hanzi')
    expect(cards.findAll('rt')).toHaveLength(0)
    expect(cards.findAll('button').map((b) => b.text())).toContain(answerText(q))
    cards.unmount()
  })

  it('选词填空：句子逐字注音、挖掉的字不出现，答完填进去变绿；英文界面不注音', () => {
    const han = (t: string): number => Array.from(t).filter((c) => /\p{Script=Han}/u.test(c)).length
    const q = find('c1s1-05-siji', (x) => x.stem.some((p) => p.kind === 'verse' && !!p.blank && han(p.text) >= 8))
    const verse = q.stem.find((p) => p.kind === 'verse')!
    if (verse.kind !== 'verse' || !verse.blank) throw new Error('not a verse')
    const chars = Array.from(verse.text)
    const hidden = chars.slice(verse.blank[0], verse.blank[0] + verse.blank[1]).join('')
    expect(hasChoiceBlank(q)).toBe(true)
    const w = mount(QuestionRenderer, { props: { question: q } })
    const shown = w.find('.verse')
    // 露出来的汉字每个一个注音，挖掉的字和它的拼音都不在页面上
    expect(shown.findAll('ruby')).toHaveLength(han(verse.text) - han(hidden))
    expect(shown.find('.blank').text()).toBe('')
    expect(shown.text().replace(/[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\s]/g, '')).not.toContain(hidden)
    w.unmount()
    const done = mount(QuestionRenderer, { props: { question: q, fill: { value: answerText(q), done: true } } })
    expect(done.find('.verse .blank.done').text()).toBe(answerText(q))
    done.unmount()
    setLang('en')
    const en = mount(QuestionRenderer, { props: { question: q } })
    expect(en.findAll('rt')).toHaveLength(0)
    expect(en.find('.verse').text()).toContain(chars.slice(0, verse.blank[0]).join('').replace(/\n/g, ''))
    en.unmount()
  })

  it('拼音卡、看图：拼音卡原样显示音节，图是一个大 emoji', () => {
    const spell = find('c1s1-03-gkh', (x) => maker(x) === 'spell')
    const w = mount(QuestionRenderer, { props: { question: spell } })
    expect(w.find('.pinyin').text()).toMatch(/^[a-zü]+ \+ /)
    w.unmount()
    const pic = find('c1s1-01-riyue', (x) => x.stem.some((p) => p.kind === 'picture'))
    const p = mount(QuestionRenderer, { props: { question: pic } })
    expect(p.find('.picture').text().length).toBeGreaterThan(0)
    p.unmount()
  })

  it('加一加：「？」格答完填上正确的字', () => {
    const q = find('c1s2-01-caizimi', (x) => maker(x) === 'compose')
    expect(hasChoiceBlank(q)).toBe(true)
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.find('.hanzi .ask').text()).toBe('？')
    w.unmount()
    const done = mount(QuestionRenderer, { props: { question: q, fill: { value: answerText(q), done: true } } })
    expect(done.find('.hanzi .ask.done').text()).toBe(answerText(q))
    done.unmount()
  })
})
