// @vitest-environment happy-dom
// 首页宣传片（需求 F1）：进到画面里才下载、带声音放一遍再静音循环，离开画面就停；浏览器不让出声就先静音、点一下页面再出声；减少动画时只有封面和播放键；跟着界面语言换一版。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PromoVideo, { resetPromoHeard } from '@/components/ui/PromoVideo.vue'
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
/** 模拟没点过页面：带声音的 play() 被拒 */
let blockSound = false

beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
    configurable: true,
    get(this: HTMLMediaElement) {
      return paused.get(this) ?? true
    },
  })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    if (blockSound && !this.muted) return Promise.reject(new DOMException('', 'NotAllowedError'))
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
  blockSound = false
  resetPromoHeard()
  soundOn.value = true
  setLang('zh')
})

const videoOf = (w: ReturnType<typeof mount>) => w.find('video').element as HTMLVideoElement

/** 放完一遍（没有 loop，浏览器放完会停下） */
function end(v: HTMLVideoElement): void {
  paused.set(v, true)
  v.dispatchEvent(new Event('ended'))
}

describe('首页宣传片', () => {
  it('进到画面里才给 src、带声音播；离开画面就暂停，回来接着播', async () => {
    const w = mount(PromoVideo)
    const v = videoOf(w)
    expect(v.getAttribute('poster')).toBe(zhPoster)
    expect(v.getAttribute('src')).toBeNull()
    expect(v.loop).toBe(false)
    expect(v.hasAttribute('playsinline')).toBe(true)
    seen!([{ isIntersecting: true }])
    await flushPromises()
    expect(v.getAttribute('src')).toBe(zhVideo)
    expect(v.muted).toBe(false)
    expect(v.paused).toBe(false)
    expect(w.find('.promo-sound').text()).toBe('🔊')
    expect(w.find('.promo').attributes('aria-label')).toBe('宣传片，点一下关掉声音')
    seen!([{ isIntersecting: false }])
    expect(v.paused).toBe(true)
    seen!([{ isIntersecting: true }])
    expect(v.paused).toBe(false)
    expect(v.muted).toBe(false)
    w.unmount()
  })

  it('带声音放完一遍就静音循环；再回首页也是静音', async () => {
    const w = mount(PromoVideo)
    const v = videoOf(w)
    seen!([{ isIntersecting: true }])
    await flushPromises()
    expect(v.muted).toBe(false)
    v.currentTime = 14
    end(v)
    await flushPromises()
    expect(v.currentTime).toBe(0)
    expect(v.paused).toBe(false)
    expect(v.muted).toBe(true)
    expect(w.find('.promo-sound').text()).toBe('🔇')
    // 静音的这一遍放完接着循环
    end(v)
    await flushPromises()
    expect(v.paused).toBe(false)
    expect(v.muted).toBe(true)
    w.unmount()
    const again = mount(PromoVideo)
    seen!([{ isIntersecting: true }])
    await flushPromises()
    expect(videoOf(again).muted).toBe(true)
    expect(videoOf(again).paused).toBe(false)
    again.unmount()
  })

  it('浏览器不让带声音自动播：先静音播，点一下页面上别的地方就从头带声音放', async () => {
    blockSound = true
    const w = mount(PromoVideo, { attachTo: document.body })
    const v = videoOf(w)
    seen!([{ isIntersecting: true }])
    await flushPromises()
    expect(v.paused).toBe(false)
    expect(v.muted).toBe(true)
    expect(w.find('.promo-play').exists()).toBe(false)
    expect(w.find('.promo-sound').text()).toBe('🔇')
    v.currentTime = 6
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(v.muted).toBe(false)
    expect(v.currentTime).toBe(0)
    expect(w.find('.promo-sound').text()).toBe('🔊')
    // 只开这一次：之后点页面不再管
    await w.find('.promo').trigger('click')
    expect(v.muted).toBe(true)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(v.muted).toBe(true)
    w.unmount()
  })

  it('被拦后第一下点在视频上：照点视频算（打开声音），不会开了又关', async () => {
    blockSound = true
    const w = mount(PromoVideo, { attachTo: document.body })
    const v = videoOf(w)
    seen!([{ isIntersecting: true }])
    await flushPromises()
    expect(v.muted).toBe(true)
    await w.find('.promo').trigger('click')
    expect(v.muted).toBe(false)
    expect(w.find('.promo-sound').text()).toBe('🔊')
    w.unmount()
  })

  it('全站静音关着时被拦：点页面不出声，打开全站声音就从头带声音放', async () => {
    blockSound = true
    soundOn.value = false
    const w = mount(PromoVideo, { attachTo: document.body })
    const v = videoOf(w)
    seen!([{ isIntersecting: true }])
    await flushPromises()
    expect(v.muted).toBe(true)
    expect(v.paused).toBe(false)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(v.muted).toBe(true)
    v.currentTime = 5
    soundOn.value = true
    await nextTick()
    expect(v.muted).toBe(false)
    expect(v.currentTime).toBe(0)
    w.unmount()
  })

  it('点一下关掉声音，再点一下从头带声音播；全站静音时马上不出声、点了也不出声、角上不画声音标记', async () => {
    const w = mount(PromoVideo)
    const v = videoOf(w)
    seen!([{ isIntersecting: true }])
    await flushPromises()
    expect(w.find('.promo-sound').text()).toBe('🔊')
    await w.find('.promo').trigger('click')
    expect(v.muted).toBe(true)
    expect(w.find('.promo-sound').text()).toBe('🔇')
    expect(w.find('.promo').attributes('aria-label')).toBe('宣传片，点一下听声音')
    v.currentTime = 6
    await w.find('.promo').trigger('click')
    expect(v.muted).toBe(false)
    expect(v.currentTime).toBe(0)
    expect(w.find('.promo-sound').text()).toBe('🔊')
    soundOn.value = false
    await nextTick()
    expect(v.muted).toBe(true)
    expect(w.find('.promo-sound').exists()).toBe(false)
    await w.find('.promo').trigger('click')
    expect(v.muted).toBe(true)
    // 自己关过声音：打开全站声音也不自己出声
    soundOn.value = true
    await nextTick()
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
    await flushPromises()
    setLang('en')
    await nextTick()
    expect(v.getAttribute('poster')).toBe(enPoster)
    expect(v.getAttribute('src')).toBe(enVideo)
    expect(v.paused).toBe(false)
    expect(w.find('.promo').attributes('aria-label')).toBe('Promo video, tap to turn the sound off')
    w.unmount()
  })
})
