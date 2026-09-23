// @vitest-environment happy-dom
// 结果页（B9）：三种模式一样——下一章最大 + 再来一局 + 不玩了；本册最后一个知识点没有下一章、写「打完啦」
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import '@/content/math/grade1'
import { setLang, ui } from '@/engine/i18n'
import { nextKp } from '@/engine/catalog'
import { createMatch, startMatch } from '@/battle/match'
import type { MatchState } from '@/battle/protocol'
import ResultPanel from '@/components/battle/ResultPanel.vue'
import { useShareStore } from '@/stores/share'

/** 上册倒数第二个知识点：「下一章」= s1-05-carry-add（上册最后一个） */
const KP = 's1-04-simple-addsub'

function shown(w: { element: Element }): string {
  const clone = w.element.cloneNode(true) as Element
  clone.querySelectorAll('rt').forEach((rt) => rt.remove())
  return clone.textContent ?? ''
}

function ended(): MatchState {
  const m = startMatch(
    createMatch({
      kpId: KP,
      skin: 'race',
      players: [
        { id: 'a', name: '小兔', team: 'red' },
        { id: 'b', name: '小虎', team: 'blue' },
      ],
    }),
    { a: 1, b: 2 },
    1000,
  )
  return { ...m, phase: 'ended', winner: 'red', score: { red: 8, blue: 3 }, startedAt: 1000, endedAt: 9000 }
}

// 结果页的「分享战绩」用 stores/share
beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  setLang('zh')
})

describe('结果页按钮（B9）', () => {
  it('三种模式一样：下一章最大（绿）+ 再来一局（蓝）+ 不玩了，上面写着下一章的知识点；点了各发各的事件；没有换个游戏 / 退出', async () => {
    const next = nextKp(KP)!
    const w = mount(ResultPanel, { props: { state: ended(), next } })
    const btns = w.findAll('.big-btn')
    expect(btns).toHaveLength(3)
    expect(btns[0]!.classes()).toContain('next-btn')
    expect(btns[0]!.classes()).toContain('green')
    expect(shown(btns[0]!)).toContain('下一章')
    expect(btns[1]!.classes()).toContain('blue')
    expect(shown(btns[1]!)).toContain('再来一局')
    expect(btns[2]!.classes()).toContain('quit-btn')
    expect(shown(btns[2]!)).toContain('不玩了')
    expect(shown(w)).not.toContain('换个游戏')
    expect(shown(w)).not.toContain('退出')
    expect(shown(w.find('.next-hint'))).toContain(ui(`kp.${next}`))
    await btns[0]!.trigger('click')
    expect(w.emitted('next')).toHaveLength(1)
    await btns[1]!.trigger('click')
    expect(w.emitted('rematch')).toHaveLength(1)
    await btns[2]!.trigger('click')
    expect(w.emitted('quit')).toHaveLength(1)
    // 「分享战绩」（F1）：小字按钮，分享的是这一局的知识点、比分、谁赢了；测试环境没有 navigator.share → 面板拿到那段话
    const share = w.find('.share-btn')
    expect(shown(share)).toContain('分享战绩')
    await share.trigger('click')
    await flushPromises()
    const panel = useShareStore().panel
    expect(panel?.message).toContain(ui(`kp.${KP}`))
    expect(panel?.message).toContain('8 : 3')
    expect(panel?.message).toContain('红队赢啦')
  })

  it('本册最后一个知识点：没有下一章、写「这一册都打完啦」，再来一局回到绿色，仍有不玩了', () => {
    expect(nextKp('s1-05-carry-add')).toBeNull() // 上册最后一个知识点
    const w = mount(ResultPanel, { props: { state: ended(), next: null } })
    expect(w.find('.next-btn').exists()).toBe(false)
    expect(shown(w.find('.next-hint.done'))).toContain('打完啦')
    const btns = w.findAll('.big-btn')
    expect(btns).toHaveLength(2)
    expect(btns[0]!.classes()).toContain('green')
    expect(shown(btns[1]!)).toContain('不玩了')
    setLang('en')
  })
})

describe('结果页排版（B9：手机上三个按钮在第一屏）', () => {
  it('三个按钮与分享在战报卡里（结果旁边），比分走势与错题在卡片后面、往下滚才看', async () => {
    const timeline = [{ t: 1000, red: 1, blue: 0 }]
    const w = mount(ResultPanel, { props: { state: ended(), next: nextKp(KP), timeline, wrongs: [{ playerId: 'a', index: 0 }] } })
    await flushPromises()
    const card = w.find('.result > .card')
    expect(card.findAll('.side .big-btn')).toHaveLength(3)
    expect(card.find('.side .share-btn').exists()).toBe(true)
    expect(card.find('.summary .score').exists()).toBe(true)
    expect(card.find('.timeline').exists()).toBe(false)
    expect(card.find('.wrong').exists()).toBe(false)
    const order = [...w.element.children].map((e) => e.className)
    expect(order[0]).toContain('card')
    expect(order.slice(1).join(' ')).toMatch(/trend.*wrong/)
    w.unmount()
  })
})

describe('本章战绩（B64）', () => {
  it('有战绩就在用时下面写「本章战绩：小兔 2 : 1 小虎」，先赢两局的名字旁出 🏆；别的知识点的战绩不显示', async () => {
    const w = mount(ResultPanel, { props: { state: ended(), next: nextKp(KP), series: { kpId: KP, wins: { red: 2, blue: 1 } } } })
    await flushPromises()
    const line = shown(w.find('.series')).replace(/\s+/g, ' ')
    expect(line).toContain('本章战绩')
    expect(line).toContain('小兔 🏆 2')
    expect(line).toContain('1 小虎')
    await w.setProps({ series: { kpId: KP, wins: { red: 1, blue: 1 } } })
    expect(shown(w.find('.series'))).not.toContain('🏆')
    await w.setProps({ series: { kpId: 'other', wins: { red: 3, blue: 0 } } })
    expect(w.find('.series').exists()).toBe(false)
    await w.setProps({ series: null })
    expect(w.find('.series').exists()).toBe(false)
    w.unmount()
  })
})

describe('回放条与我的错题（B69）', () => {
  it('有走势就画两条阶梯线、反超处打点；错题列出题干（可点读）与正确答案、「再练一遍」发 practice；没错题写全都答对', async () => {
    const state = ended()
    const timeline = [
      { t: 1000, red: 1, blue: 0 },
      { t: 2000, red: 1, blue: 1 },
      { t: 3000, red: 1, blue: 2 },
      { t: 4000, red: 2, blue: 2 },
      { t: 5000, red: 3, blue: 2 },
    ]
    const w = mount(ResultPanel, { props: { state, next: nextKp(KP), timeline, wrongs: [{ playerId: 'a', index: 0 }, { playerId: 'b', index: 2 }] } })
    await flushPromises()
    expect(w.findAll('.timeline polyline')).toHaveLength(2)
    expect(w.find('.tl-line.red').attributes('points')).toContain('0,')
    // 领先方换了两次：蓝反超（第 3 笔）、红反超（第 5 笔）
    expect(w.findAll('.tl-flip')).toHaveLength(2)
    expect(w.findAll('.tl-flip').map((c) => c.classes().includes('blue'))).toEqual([true, false])
    expect(shown(w.find('.wrong-title'))).toContain('我答错的题')
    const items = w.findAll('.wrong-item')
    expect(items).toHaveLength(2)
    expect(items[0]!.find('.stem').exists()).toBe(true)
    expect(shown(items[0]!.find('.wrong-ans'))).toContain('正确答案')
    expect(items.map((i) => i.find('.wrong-who').text())).toEqual(['小兔', '小虎'])
    await w.find('.practice-btn').trigger('click')
    expect(w.emitted('practice')).toHaveLength(1)
    await w.setProps({ wrongs: [] })
    expect(w.find('.wrong-item').exists()).toBe(false)
    expect(shown(w.find('.wrong-none'))).toContain('全都答对')
    expect(w.find('.practice-btn').exists()).toBe(false)
    await w.setProps({ wrongs: undefined, timeline: [] })
    expect(w.find('.wrong').exists()).toBe(false)
    expect(w.find('.timeline').exists()).toBe(false)
    w.unmount()
  })
})
