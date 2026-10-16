// @vitest-environment happy-dom
// 六下「鸽巢问题」的新教具（六年级数学 A）：放法图（Pigeonholes）——容器个数、每个里面放几个、旁边多出的几个照传的画；
// QuestionRenderer 把字段都转发过去；每种题中英文都能渲染（含摸球盒、涂色格）。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import Pigeonholes from '@/components/math/Pigeonholes.vue'
import type { Question } from '@/types/models'

afterEach(() => setLang('zh'))

describe('放法图（Pigeonholes）', () => {
  it('3 个笔筒各放 1 支，旁边多出 1 支（例 1 小明的想法）', () => {
    const w = mount(Pigeonholes, { props: { holder: 'cup', icon: '✏️', counts: [1, 1, 1], extra: 1 } })
    const holders = w.findAll('.holder')
    expect(holders).toHaveLength(3)
    expect(holders.every((h) => h.classes('cup'))).toBe(true)
    expect(holders.map((h) => h.findAll('.it').length)).toEqual([1, 1, 1])
    expect(w.find('.extra').findAll('.it')).toHaveLength(1)
    expect(w.text()).toBe('✏️✏️✏️✏️')
    expect(w.attributes('aria-label')).toBe('放法图')
  })

  it('抽屉、鸽笼；没有多出的不画虚线框', () => {
    const w = mount(Pigeonholes, { props: { holder: 'drawer', icon: '📘', counts: [2, 2, 2] } })
    expect(w.findAll('.holder.drawer')).toHaveLength(3)
    expect(w.findAll('.it')).toHaveLength(6)
    expect(w.find('.extra').exists()).toBe(false)
    const c = mount(Pigeonholes, { props: { holder: 'cage', icon: '🕊️', counts: [1, 1, 1], extra: 2 } })
    expect(c.findAll('.holder.cage')).toHaveLength(3)
    expect(c.find('.extra').attributes('data-n')).toBe('2')
  })
})

describe('QuestionRenderer 与鸽巢问题', () => {
  it('把放法图的字段转发过去', () => {
    const q: Question = {
      id: 't:1',
      kpId: 'm6s2-07-pigeonhole',
      type: 'logic',
      difficulty: 1,
      input: 'numpad',
      answer: { kind: 'number', value: 3 },
      stem: [{ kind: 'pigeonholes', holder: 'drawer', icon: '📘', counts: [2, 2, 2], extra: 1 }],
    }
    const r = mount(QuestionRenderer, { props: { question: q } })
    expect(r.findAll('.pigeonholes .holder.drawer')).toHaveLength(3)
    expect(r.findAll('.pigeonholes .it')).toHaveLength(7)
  })

  it('每种题中英文都能渲染（不漏词条）', () => {
    const gen = getGenerator('m6s2-07-pigeonhole')!
    const seen = new Set<string>()
    for (let seed = 1; seed <= 200; seed++)
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const kind = q.id.split(':')[1]!.split('-')[0]!
        if (seen.has(kind)) continue
        seen.add(kind)
        for (const lang of ['zh', 'en'] as const) {
          setLang(lang)
          const w = mount(QuestionRenderer, { props: { question: q } })
          expect(w.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
          w.unmount()
          const p = mount(AnswerPanel, { props: { question: q, revealed: null } })
          expect(p.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
          p.unmount()
        }
        setLang('zh')
      }
    expect(seen.size).toBeGreaterThanOrEqual(15)
  })
})
