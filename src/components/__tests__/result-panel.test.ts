// @vitest-environment happy-dom
// 结果页（B9）的按钮组合：单设备（再来一局 / 换个游戏 / 退出）、线上（三个角色一样：下一章最大 + 再来一局 + 不玩了；本册最后一个知识点写「打完啦」）
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/math/grade1'
import { setLang, ui } from '@/engine/i18n'
import { nextKp } from '@/engine/catalog'
import { createMatch, startMatch } from '@/battle/match'
import type { MatchState } from '@/battle/protocol'
import ResultPanel from '@/components/battle/ResultPanel.vue'

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

afterEach(() => {
  setLang('zh')
})

describe('结果页按钮（B9）', () => {
  it('单设备：再来一局（绿）+ 换个游戏 + 退出，没有下一章 / 不玩了', () => {
    const w = mount(ResultPanel, { props: { state: ended() } })
    const btns = w.findAll('.big-btn')
    expect(btns).toHaveLength(3)
    expect(btns[0]!.classes()).toContain('green')
    expect(shown(btns[0]!)).toContain('再来一局')
    expect(shown(btns[1]!)).toContain('换个游戏')
    expect(shown(btns[2]!)).toContain('退出')
    expect(w.find('.next-btn').exists()).toBe(false)
    expect(w.find('.quit-btn').exists()).toBe(false)
    expect(w.find('.next-hint').exists()).toBe(false)
  })

  it('线上（三个角色一样，不看主持人）：下一章最大（绿）+ 再来一局（蓝）+ 不玩了，上面写着下一章的知识点；点了各发各的事件', async () => {
    const next = nextKp(KP)!
    const w = mount(ResultPanel, { props: { state: ended(), online: true, next } })
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
    expect(w.emitted('exit')).toBeUndefined()
  })

  it('线上在本册最后一个知识点：没有下一章、写「这一册都打完啦」，再来一局回到绿色，仍有不玩了', () => {
    expect(nextKp('s1-05-carry-add')).toBeNull() // 上册最后一个知识点
    const w = mount(ResultPanel, { props: { state: ended(), online: true, next: null } })
    expect(w.find('.next-btn').exists()).toBe(false)
    expect(shown(w.find('.next-hint.done'))).toContain('打完啦')
    const btns = w.findAll('.big-btn')
    expect(btns).toHaveLength(2)
    expect(btns[0]!.classes()).toContain('green')
    expect(shown(btns[1]!)).toContain('不玩了')
    setLang('en')
  })
})
