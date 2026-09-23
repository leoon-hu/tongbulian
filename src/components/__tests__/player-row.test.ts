// @vitest-environment happy-dom
// 竞技场的一行（PlayerRow）：手机紧凑版数字键盘的显示框画在题干那一栏，跟着键盘的 input 事件走。
// player 对象每按一个键（单设备 setInput）、每来一份快照（线上）都会换成新的——显示框不能因此被清空、题目也不能重读（2026-09-23 用户截图）
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import '@/content/math/grade1'
import { setLang } from '@/engine/i18n'
import { questionAt } from '@/battle/stream'
import type { Player } from '@/battle/protocol'
import PlayerRow from '@/components/battle/PlayerRow.vue'

vi.mock('@/engine/voice', () => ({ say: vi.fn(() => Promise.resolve()), hush: vi.fn() }))
import { say } from '@/engine/voice'

const KP = 's1-04-simple-addsub'

/** 题目流里第 0、1 题都是数字键盘的种子 */
function numpadSeed(): number {
  for (let s = 1; s < 1000; s++) if (questionAt(KP, s, 0).input === 'numpad' && questionAt(KP, s, 1).input === 'numpad') return s
  throw new Error('no numpad seed')
}

function setup() {
  const seed = numpadSeed()
  const player = ref<Player>({ id: 'a', name: '小兔', team: 'red', kind: 'human', seed, index: 0, correct: 0, streak: 0, input: '', online: true })
  const Host = defineComponent({
    setup() {
      return () =>
        h(PlayerRow, {
          player: player.value,
          question: questionAt(KP, seed, player.value.index),
          feedback: null,
          operable: true,
          autoRead: true,
          solo: true,
          compact: true,
          // 与单设备的 store.setInput 一样：每次输入都换一个新的 player 对象
          onInput: (v: string) => (player.value = { ...player.value, input: v }),
        })
    },
  })
  const w = mount(Host)
  const press = async (d: string): Promise<void> => {
    await w.findAll('.numpad .key').find((k) => k.text() === d)!.trigger('click')
    await nextTick()
    await nextTick()
  }
  return { w, player, press }
}

beforeEach(() => vi.mocked(say).mockClear())
afterEach(() => setLang('zh'))

describe('紧凑版的显示框', () => {
  it('按键写进显示框，player 对象跟着换也不清空、不重读题', async () => {
    const { w, press } = setup()
    await nextTick()
    expect(vi.mocked(say)).toHaveBeenCalledTimes(1)
    await press('1')
    expect(w.find('.typed').text()).toBe('1')
    await press('2')
    expect(w.find('.typed').text()).toBe('12')
    await press('⌫')
    expect(w.find('.typed').text()).toBe('1')
    expect(vi.mocked(say)).toHaveBeenCalledTimes(1)
  })

  it('线上快照换掉 player 对象（题号没变）：显示框留着', async () => {
    const { w, player, press } = setup()
    await press('7')
    player.value = { ...player.value, online: true }
    await nextTick()
    await nextTick()
    expect(w.find('.typed').text()).toBe('7')
    expect(vi.mocked(say)).toHaveBeenCalledTimes(1)
  })

  it('换到下一题：显示框清空、读新题一次', async () => {
    const { w, player, press } = setup()
    await press('7')
    player.value = { ...player.value, index: 1, input: '' }
    await nextTick()
    await nextTick()
    expect(w.find('.typed').text()).toBe('?')
    expect(vi.mocked(say)).toHaveBeenCalledTimes(2)
    await press('3')
    expect(w.find('.typed').text()).toBe('3')
  })
})
