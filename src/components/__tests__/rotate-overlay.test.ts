// @vitest-environment happy-dom
// 「请把手机横过来」（需求 B30）：竞技场自己转了就提醒一下，不挡路——几秒自动消失、点一下消失、视口真转成横的立刻消失
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RotateOverlay from '@/components/battle/RotateOverlay.vue'
import { ROTATE_HINT_MS } from '@/battle/layout'
import { setLang } from '@/engine/i18n'
import { forget, say } from '@/engine/voice'

vi.mock('@/engine/voice')

const hint = (): Element | null => document.body.querySelector('.rotate')
/** 页面上看得见的字（去掉注音） */
function shown(el: Element): string {
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll('rt').forEach((rt) => rt.remove())
  return clone.textContent ?? ''
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  setLang('zh')
  document.body.innerHTML = ''
})

describe('「请把手机横过来」（B30）', () => {
  it('竞技场转了就出现（画在 body 上、不跟着竞技场转）、朗读一次；到时自己消失并撤回还没读的那句', async () => {
    vi.useFakeTimers()
    const w = mount(RotateOverlay, { props: { rotated: true } })
    await flushPromises()
    expect(hint()).not.toBeNull()
    expect(shown(hint()!)).toContain('请把手机横过来')
    expect(w.find('.rotate').exists()).toBe(false) // Teleport：不在组件自己的 DOM 里
    expect(say).toHaveBeenCalledTimes(1)
    expect(vi.mocked(say).mock.calls[0][3]).toEqual({ mode: 'wait', key: 'rotate' })
    vi.advanceTimersByTime(ROTATE_HINT_MS - 1)
    await flushPromises()
    expect(hint()).not.toBeNull()
    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(hint()).toBeNull()
    expect(forget).toHaveBeenCalledWith('rotate')
    w.unmount()
  })

  it('点一下就消失；视口真转成横的立刻消失；又竖回来再提醒一次', async () => {
    vi.useFakeTimers()
    const w = mount(RotateOverlay, { props: { rotated: true } })
    await flushPromises()
    ;(hint() as HTMLElement).click()
    await flushPromises()
    expect(hint()).toBeNull()
    expect(forget).toHaveBeenCalledTimes(1)
    await w.setProps({ rotated: false })
    expect(forget).toHaveBeenCalledTimes(1) // 已经没了，不再撤
    await w.setProps({ rotated: true })
    expect(hint()).not.toBeNull()
    expect(say).toHaveBeenCalledTimes(2)
    await w.setProps({ rotated: false })
    expect(hint()).toBeNull()
    expect(forget).toHaveBeenCalledTimes(2)
    w.unmount()
  })

  it('没转就不出现、不朗读；卸载时撤掉提示与定时器', async () => {
    vi.useFakeTimers()
    const w = mount(RotateOverlay, { props: { rotated: false } })
    await flushPromises()
    expect(hint()).toBeNull()
    expect(say).not.toHaveBeenCalled()
    await w.setProps({ rotated: true })
    expect(hint()).not.toBeNull()
    w.unmount()
    expect(hint()).toBeNull()
    expect(forget).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(ROTATE_HINT_MS)
    expect(forget).toHaveBeenCalledTimes(1)
  })
})
