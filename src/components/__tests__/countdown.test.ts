// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { dictKeys, setLang } from '@/engine/i18n'
import { SKINS, finishKey, ruleKey } from '@/battle/skins'
import Countdown, { RULE_MAX_MS, RULE_MIN_MS } from '@/components/battle/Countdown.vue'

vi.mock('@/engine/voice', () => ({ say: vi.fn(() => Promise.resolve()), hush: vi.fn(), warmUp: vi.fn(), isVoiceEnabled: () => false }))

afterEach(() => {
  vi.useRealTimers()
  setLang('zh')
  localStorage.clear()
})

const shown = (html: string): string => html.replace(/<rt[^>]*>[^<]*<\/rt>/g, "").replace(/<[^>]+>/g, "")

describe('开局倒数（B6）：先讲规则再倒数', () => {
  it('传了 rule 先显示规则句（带注音），至少停 RULE_MIN_MS 再「预备…」，然后 3 2 1 开始 → done', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = mount(Countdown, { props: { rule: ruleKey('rocket') } })
    expect(w.find('.rule').exists()).toBe(true)
    expect(shown(w.find('.rule').html())).toContain('火箭')
    expect(w.find('.rule').html()).toMatch(/<rt[\s>]/)
    vi.advanceTimersByTime(RULE_MIN_MS - 10)
    await flushPromises()
    expect(w.find('.rule').exists()).toBe(true)
    vi.advanceTimersByTime(20)
    await flushPromises()
    await flushPromises()
    expect(w.find('.ready').exists()).toBe(true)
    vi.advanceTimersByTime(800)
    await flushPromises()
    expect(w.find('.num').text()).toBe('3')
    vi.advanceTimersByTime(3000)
    await flushPromises()
    expect(w.find('.go').exists()).toBe(true)
    vi.advanceTimersByTime(600)
    expect(w.emitted('done')).toHaveLength(1)
    w.unmount()
  })

  it('没传 rule（再来一局）直接从「预备…」开始；总时长还是 4.4 秒', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const w = mount(Countdown, { props: { rule: null } })
    expect(w.find('.rule').exists()).toBe(false)
    expect(w.find('.ready').exists()).toBe(true)
    vi.advanceTimersByTime(4400)
    await flushPromises()
    expect(w.emitted('done')).toHaveLength(1)
    w.unmount()
  })

  it('音频卡住也不会卡倒数：最多 RULE_MAX_MS 就往下走；中途卸载不再动', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const voice = await import('@/engine/voice')
    vi.mocked(voice.say).mockImplementationOnce(() => new Promise(() => {}))
    const w = mount(Countdown, { props: { rule: ruleKey('race') } })
    vi.advanceTimersByTime(RULE_MAX_MS - 10)
    await flushPromises()
    expect(w.find('.rule').exists()).toBe(true)
    vi.advanceTimersByTime(20)
    await flushPromises()
    await flushPromises()
    expect(w.find('.ready').exists()).toBe(true)
    w.unmount()
    vi.advanceTimersByTime(10000)
    expect(w.emitted('done')).toBeUndefined()
  })

  it('每种皮肤都有开场规则句与结束语的词条（中英）', () => {
    const zh = new Set(dictKeys('zh'))
    const en = new Set(dictKeys('en'))
    for (const s of SKINS) {
      for (const key of [ruleKey(s.id), finishKey(s.id)]) {
        expect(zh.has(key), `${s.id} 缺 ${key}（zh）`).toBe(true)
        expect(en.has(key), `${s.id} 缺 ${key}（en）`).toBe(true)
      }
    }
    expect(ruleKey('rocket3d')).toBe('battle.rule.rocket')
    expect(ruleKey('bogus')).toBe('battle.rule.default')
  })
})
