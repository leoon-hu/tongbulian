// @vitest-environment happy-dom
// 自己练的结算页（F7）：按钮和对战结果页一样是三个——下一章（占一整行）+ 再练一次 + 不练了；本册最后一个知识点没有下一章
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/math/grade1'
import { setLang } from '@/engine/i18n'
import { nextKp } from '@/engine/catalog'
import SessionSummary from '@/components/practice/SessionSummary.vue'

function shown(w: { element: Element }): string {
  const clone = w.element.cloneNode(true) as Element
  clone.querySelectorAll('rt').forEach((rt) => rt.remove())
  return clone.textContent ?? ''
}

afterEach(() => setLang('zh'))

describe('自己练的结算页（F7）', () => {
  it('有下一章：下一章 / 再练一次 / 不练了三个按钮，上面写下一章是哪个知识点；点了各发各的事件', async () => {
    const next = nextKp('s1-04-simple-addsub')!
    expect(next).toBe('s1-05-carry-add')
    const w = mount(SessionSummary, { props: { correct: 6, total: 8, next } })
    const btns = w.findAll('.actions .big-btn')
    expect(btns.map((b) => b.classes().find((c) => c.endsWith('-btn') && c !== 'big-btn'))).toEqual(['next-btn', 'retry-btn', 'quit-btn'])
    expect(btns.map((b) => shown(b).trim())).toEqual(['下一章 ▶', '再练一次', '不练了'])
    expect(btns[0]!.classes()).toContain('green')
    expect(btns[1]!.classes()).toContain('blue')
    expect(shown(w.find('.next-hint'))).toBe('下一章：凑十法')
    expect(shown(w.find('.score'))).toContain('6 / 8')
    await btns[0]!.trigger('click')
    await btns[1]!.trigger('click')
    await btns[2]!.trigger('click')
    expect(Object.keys(w.emitted())).toEqual(expect.arrayContaining(['next', 'retry', 'home']))
    w.unmount()
  })

  it('本册最后一个：没有下一章，写「这一册都练完啦！」，再练一次变绿、和不练了并排', () => {
    expect(nextKp('s1-05-carry-add')).toBeNull()
    const w = mount(SessionSummary, { props: { correct: 8, total: 8, next: null } })
    expect(w.find('.next-btn').exists()).toBe(false)
    expect(w.findAll('.actions .big-btn')).toHaveLength(2)
    expect(w.find('.retry-btn').classes()).toContain('green')
    expect(shown(w.find('.next-hint.done'))).toBe('这一册都练完啦！')
    w.unmount()
  })

  it('英文界面', () => {
    setLang('en')
    const w = mount(SessionSummary, { props: { correct: 5, total: 8, next: 's1-05-carry-add' } })
    expect(w.findAll('.actions .big-btn').map((b) => b.text().trim())).toEqual(['Next chapter ▶', 'Practice again', 'Stop'])
    w.unmount()
  })
})
