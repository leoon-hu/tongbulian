import { describe, expect, it, vi } from 'vitest'
import { analyticsAttrs, analyticsConfig, analyticsTag, trackBackNavigation, type UmamiTracker } from '../analytics'

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
  })

  it('没配置就是空串；属性值里的引号与尖括号转义', () => {
    expect(analyticsTag(null)).toBe('')
    expect(analyticsTag({ script: 'https://x/s.js?a=1&b="<', websiteId: 'id', domain: '' })).toBe('<script defer src="https://x/s.js?a=1&amp;b=&quot;&lt;" data-website-id="id"></script>')
  })
})

describe('trackBackNavigation（返回键的 popstate 补记一次页面浏览）', () => {
  function fakeWindow(umami?: UmamiTracker) {
    const listeners: Record<string, (() => void)[]> = {}
    const timers: (() => void)[] = []
    const win = {
      umami,
      location: { href: 'https://tongbulian.example.com/#/math/g1' },
      addEventListener: vi.fn((type: string, fn: () => void) => { (listeners[type] ??= []).push(fn) }),
      removeEventListener: vi.fn((type: string, fn: () => void) => { listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn) }),
      setTimeout: vi.fn((fn: () => void) => { timers.push(fn); return timers.length }),
    }
    return { win: win as unknown as Parameters<typeof trackBackNavigation>[0], listeners, timers }
  }

  it('popstate 后延迟一拍，把当前地址交给 tracker', () => {
    const track = vi.fn<UmamiTracker['track']>(async () => {})
    const { win, listeners, timers } = fakeWindow({ track })
    trackBackNavigation(win)
    expect(listeners.popstate).toHaveLength(1)
    listeners.popstate![0]!()
    expect(track).not.toHaveBeenCalled()
    timers[0]!()
    expect(track).toHaveBeenCalledTimes(1)
    const build = track.mock.calls[0]![0]
    expect(build({ url: 'https://tongbulian.example.com/#/old', title: 't' })).toEqual({ url: 'https://tongbulian.example.com/#/math/g1', title: 't' })
  })

  it('没加载 tracker（没配置 / 离线）时什么都不做；返回的函数卸载监听', () => {
    const { win, listeners, timers } = fakeWindow(undefined)
    const off = trackBackNavigation(win)
    listeners.popstate![0]!()
    expect(() => timers[0]!()).not.toThrow()
    off()
    expect(listeners.popstate).toHaveLength(0)
  })
})
