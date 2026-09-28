// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { dictKeys, setLang } from '@/engine/i18n'
import { SKINS, finishKey, ruleKey } from '@/battle/skins'
import Countdown, { RULE_MAX_MS, RULE_MIN_MS } from '@/components/battle/Countdown.vue'

vi.mock('@/engine/voice', () => ({ say: vi.fn(() => Promise.resolve()), hush: vi.fn(), warmUp: vi.fn(), isVoiceEnabled: () => false }))
vi.mock('@/battle/sfx', async (orig) => ({ ...(await orig<typeof import('@/battle/sfx')>()), playSfx: vi.fn() }))

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

  it('规则卡点一下（或回车）就直接「开始！」：跳过预备和 3 2 1，0.6 秒后 done；原来的等待到点了也不再往下走', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const voice = await import('@/engine/voice')
    vi.mocked(voice.say).mockClear()
    const w = mount(Countdown, { props: { rule: ruleKey('rocket'), skin: 'rocket' } })
    const card = w.find('.rule')
    expect(card.attributes('role')).toBe('button')
    expect(shown(card.find('.rule-skip').html())).toBe('点一下，直接开始')
    expect(card.find('.rule-close').text()).toBe('✕')
    await card.trigger('click')
    expect(w.find('.rule').exists()).toBe(false)
    expect(w.find('.go').exists()).toBe(true)
    // 「开始！」用默认播法：打断还没读完的规则
    expect(vi.mocked(voice.say).mock.calls.at(-1)![3]).toBeUndefined()
    vi.advanceTimersByTime(600)
    expect(w.emitted('done')).toHaveLength(1)
    vi.advanceTimersByTime(RULE_MAX_MS)
    await flushPromises()
    expect(w.find('.ready').exists()).toBe(false)
    expect(w.emitted('done')).toHaveLength(1)
    w.unmount()
    // 回车也行；「预备…」之后没有卡片，点不到
    const k = mount(Countdown, { props: { rule: ruleKey('race') } })
    await k.find('.rule').trigger('keydown', { key: 'Enter' })
    expect(k.find('.go').exists()).toBe(true)
    k.unmount()
  })

  it('「开始」时放这个游戏开始的一声（B73：赛跑发令枪、火车汽笛）；不知道是哪个游戏就是通用的「嘟」', async () => {
    const { playSfx } = await import('@/battle/sfx')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    for (const [skin, sounds] of [
      ['race', ['pistol']],
      ['train', ['whistle']],
      [null, ['go']],
    ] as const) {
      vi.mocked(playSfx).mockClear()
      const w = mount(Countdown, { props: { rule: null, skin } })
      vi.advanceTimersByTime(3800)
      await flushPromises()
      const played = vi.mocked(playSfx).mock.calls.map((c) => c[0]).filter((x) => x !== 'tick')
      expect(played, String(skin)).toEqual(sounds)
      w.unmount()
    }
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
    expect(ruleKey('bogus')).toBe('battle.rule.default')
  })
})
