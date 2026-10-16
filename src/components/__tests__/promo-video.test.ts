// @vitest-environment happy-dom
// 首页宣传片（需求 F1）：进到画面里才下载、静音循环播放，离开画面就停；点一下从头带声音播；减少动画时只有封面和播放键；跟着界面语言换一版。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PromoVideo from '@/components/ui/PromoVideo.vue'
import { setLang } from '@/engine/i18n'
import { soundOn } from '@/engine/sound'
import zhVideo from '@/assets/promo/promo-zh.mp4'
import enVideo from '@/assets/promo/promo-en.mp4'
import zhPoster from '@/assets/promo/promo-zh.webp'
import enPoster from '@/assets/promo/promo-en.webp'

/** 假的播放状态：happy-dom 不会真播 */
const paused = new WeakMap<HTMLMediaElement, boolean>()
const pausedDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'paused')
let seen: ((entries: { isIntersecting: boolean }[]) => void) | null = null
let reduceMotion = false

beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get(this: HTMLMediaElement) {
      return paused.get(this) ?? true
    },
  })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    paused.set(this, false)
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    paused.set(this, true)
  })
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        seen = cb
      }
      observe(): void {}
      disconnect(): void {}
    },
  )
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduceMotion && q.includes('reduce'), media: q }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (pausedDesc) Object.defineProperty(HTMLMediaElement.prototype, 'paused', pausedDesc)
  seen = null
  reduceMotion = false
  soundOn.value = true
  setLang('zh')
})

const videoOf = (w: ReturnType<typeof mount>) => w.find('video').element as HTMLVideoElement

describe('首页宣传片', () => {
  it('进到画面里才给 src、静音循环播放；离开画面就暂停，回来接着播', async () => {
    const w = mount(PromoVideo)
    const v = videoOf(w)
    expect(v.getAttribute('poster')).toBe(zhPoster)
    expect(v.getAttribute('src')).toBeNull()
    expect(v.loop).toBe(true)
    expect(v.hasAttribute('playsinline')).toBe(true)
    seen!([{ isIntersecting: true }])
    expect(v.getAttribute('src')).toBe(zhVideo)
    expect(v.muted).toBe(true)
    expect(v.paused).toBe(false)
    seen!([{ isIntersecting: false }])
    expect(v.paused).toBe(true)
    seen!([{ isIntersecting: true }])
    expect(v.paused).toBe(false)
    w.unmount()
  })

  it('点一下从头带声音播，再点一下关掉声音；全站静音时点了也不出声、角上不画声音标记', async () => {
    const w = mount(PromoVideo)
    const v = videoOf(w)
    seen!([{ isIntersecting: true }])
    await nextTick()
    expect(w.find('.promo-sound').text()).toBe('🔇')
    expect(w.find('.promo').attributes('aria-label')).toBe('宣传片，点一下听声音')
    v.currentTime = 6
    await w.find('.promo').trigger('click')
    expect(v.muted).toBe(false)
    expect(v.currentTime).toBe(0)
    expect(w.find('.promo-sound').text()).toBe('🔊')
    await w.find('.promo').trigger('click')
    expect(v.muted).toBe(true)
    // 打开声音后再把全站静音：马上不出声
    await w.find('.promo').trigger('click')
    expect(v.muted).toBe(false)
    soundOn.value = false
    await nextTick()
    expect(v.muted).toBe(true)
    expect(w.find('.promo-sound').exists()).toBe(false)
    await w.find('.promo').trigger('click')
    expect(v.muted).toBe(true)
    w.unmount()
  })

  it('系统要求减少动画：不自动播放、不下载，只有封面和播放键；点了才播（带声音）', async () => {
    reduceMotion = true
    const w = mount(PromoVideo)
    const v = videoOf(w)
    seen!([{ isIntersecting: true }])
    await nextTick()
    expect(v.getAttribute('src')).toBeNull()
    expect(v.paused).toBe(true)
    expect(w.find('.promo-play').exists()).toBe(true)
    expect(w.find('.promo').attributes('aria-label')).toBe('宣传片，点一下播放')
    await w.find('.promo').trigger('click')
    expect(v.getAttribute('src')).toBe(zhVideo)
    expect(v.paused).toBe(false)
    expect(v.muted).toBe(false)
    expect(w.find('.promo-play').exists()).toBe(false)
    w.unmount()
  })

  it('跟着界面语言换成那一版的视频和封面，正在播就接着播', async () => {
    const w = mount(PromoVideo)
    const v = videoOf(w)
    seen!([{ isIntersecting: true }])
    setLang('en')
    await nextTick()
    expect(v.getAttribute('poster')).toBe(enPoster)
    expect(v.getAttribute('src')).toBe(enVideo)
    expect(v.paused).toBe(false)
    expect(w.find('.promo').attributes('aria-label')).toBe('Promo video, tap to hear the sound')
    w.unmount()
  })
})
