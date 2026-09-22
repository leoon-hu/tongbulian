import { describe, expect, it, vi } from 'vitest'
import { analyticsAttrs, analyticsConfig, analyticsTag, setupPageTracking, trackPage, trackedTitle, trackedUrl, type UmamiTracker } from '../analytics'

const full = { VITE_UMAMI_SCRIPT: 'https://stats.example.com/script.js', VITE_UMAMI_WEBSITE_ID: 'abc-123', SITE_URL: 'https://tongbulian.example.com' }

describe('analyticsConfig（需求 N7：两项都配了才统计）', () => {
  it('两项齐全才有配置，顺手去掉空白，域名取自 SITE_URL', () => {
    expect(analyticsConfig(full)).toEqual({ script: 'https://stats.example.com/script.js', websiteId: 'abc-123', domain: 'tongbulian.example.com' })
    expect(analyticsConfig({ ...full, VITE_UMAMI_WEBSITE_ID: '  abc-123 ' })?.websiteId).toBe('abc-123')
  })

  it('缺任何一项、或只有空白 → 不统计', () => {
    expect(analyticsConfig({})).toBeNull()
    expect(analyticsConfig({ VITE_UMAMI_SCRIPT: full.VITE_UMAMI_SCRIPT })).toBeNull()
    expect(analyticsConfig({ VITE_UMAMI_WEBSITE_ID: 'abc' })).toBeNull()
    expect(analyticsConfig({ ...full, VITE_UMAMI_SCRIPT: '   ' })).toBeNull()
  })

  it('没有 SITE_URL 或它不是合法地址 → 不限域名', () => {
    expect(analyticsConfig({ ...full, SITE_URL: undefined })?.domain).toBe('')
    expect(analyticsConfig({ ...full, SITE_URL: 'not a url' })?.domain).toBe('')
  })
})

describe('analyticsTag / analyticsAttrs（写进页面的标签）', () => {
  it('defer + src + website id，有域名时带 data-domains', () => {
    const cfg = analyticsConfig(full)!
    expect(analyticsAttrs(cfg)).toEqual({ defer: true, src: full.VITE_UMAMI_SCRIPT, 'data-website-id': 'abc-123', 'data-domains': 'tongbulian.example.com' })
    expect(analyticsTag(cfg)).toBe('<script defer src="https://stats.example.com/script.js" data-website-id="abc-123" data-domains="tongbulian.example.com"></script>')
    expect(analyticsTag({ ...cfg, domain: '' })).not.toContain('data-domains')
    // 入口页关掉自动记录（翻页由应用上报）；静态页默认开着
    expect(analyticsAttrs(cfg, false)['data-auto-track']).toBe('false')
    expect(analyticsAttrs(cfg)['data-auto-track']).toBeUndefined()
  })

  it('没配置就是空串；属性值里的引号与尖括号转义', () => {
    expect(analyticsTag(null)).toBe('')
    expect(analyticsTag({ script: 'https://x/s.js?a=1&b="<', websiteId: 'id', domain: '' })).toBe('<script defer src="https://x/s.js?a=1&amp;b=&quot;&lt;" data-website-id="id"></script>')
  })
})

describe('trackedUrl / trackPage（翻页上报：房间号不进统计库、等 tracker 加载好）', () => {
  it('地址去掉查询串，房间号换成 room；标题里的房间号也换掉', () => {
    expect(trackedUrl({ pathname: '/', hash: '#/s/math/g/g1?sem=2' })).toBe('/#/s/math/g/g1')
    expect(trackedUrl({ pathname: '/', hash: '#/battle/ABC234?t=red' })).toBe('/#/battle/room')
    expect(trackedUrl({ pathname: '/', hash: '#/battle/ABC234' })).toBe('/#/battle/room')
    expect(trackedUrl({ pathname: '/', hash: '#/battle/new/s1-05-carry-add' })).toBe('/#/battle/new/s1-05-carry-add')
    expect(trackedUrl({ pathname: '/', hash: '' })).toBe('/')
    expect(trackedTitle('房间 ABC234 · 对战 · 同步练-对战版', { hash: '#/battle/ABC234?t=red' })).toBe('房间 room · 对战 · 同步练-对战版')
    expect(trackedTitle('凑十法 · 一年级数学 · 同步练-对战版', { hash: '#/s/math' })).toBe('凑十法 · 一年级数学 · 同步练-对战版')
  })

  function fakeWindow(umami?: UmamiTracker) {
    const timers: (() => void)[] = []
    const win = {
      umami,
      location: { pathname: '/', hash: '#/battle/ABC234?t=red' },
      document: { title: '房间 ABC234 · 对战' },
      setTimeout: vi.fn((fn: () => void) => {
        timers.push(fn)
        return timers.length
      }),
    }
    return { win: win as unknown as Parameters<typeof trackPage>[0], timers }
  }

  it('延迟一拍后把脱敏的地址与标题交给 tracker', () => {
    const track = vi.fn<UmamiTracker['track']>(async () => {})
    const { win, timers } = fakeWindow({ track })
    trackPage(win)
    expect(track).not.toHaveBeenCalled()
    timers[0]!()
    expect(track).toHaveBeenCalledTimes(1)
    const build = track.mock.calls[0]![0]
    expect(build({ url: '/#/battle/ABC234?t=red', title: '房间 ABC234 · 对战', referrer: 'r' })).toEqual({ url: '/#/battle/room', title: '房间 room · 对战', referrer: 'r' })
  })

  it('tracker 还没加载：隔一会儿再看，最多几次；一直没有（没配置 / 离线）就不报', () => {
    const { win, timers } = fakeWindow(undefined)
    trackPage(win, 2)
    timers[0]!()
    expect(timers).toHaveLength(2)
    timers[1]!()
    expect(timers).toHaveLength(3)
    timers[2]!()
    expect(timers).toHaveLength(3)
    // 中途加载好了
    const track = vi.fn<UmamiTracker['track']>(async () => {})
    const late = fakeWindow(undefined)
    trackPage(late.win, 3)
    late.timers[0]!()
    ;(late.win as unknown as { umami?: UmamiTracker }).umami = { track }
    late.timers[1]!()
    expect(track).toHaveBeenCalledTimes(1)
  })

  it('setupPageTracking：首屏报一次，之后每次路由 afterEach 再报', () => {
    const track = vi.fn<UmamiTracker['track']>(async () => {})
    const { win, timers } = fakeWindow({ track })
    let after: (() => void) | null = null
    setupPageTracking({ afterEach: (fn) => (after = fn) }, win)
    timers[0]!()
    expect(track).toHaveBeenCalledTimes(1)
    after!()
    timers[1]!()
    expect(track).toHaveBeenCalledTimes(2)
  })
})
