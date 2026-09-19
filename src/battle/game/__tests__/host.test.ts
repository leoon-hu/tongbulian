// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { SeqEvent } from '@/battle/protocol'
import type { GameFactory, GameModule, GameState } from '../contract'
import GameHost from '../host/GameHost.vue'
import GameSlot from '@/components/battle/GameSlot.vue'

const state = (red = 0, blue = 0): GameState => ({ red, blue, target: 8, phase: 'playing', winner: null, lastPoint: null })

/** 记录调用的假游戏；可以让某个方法抛错 */
function spyGame(opts: { throwIn?: keyof GameModule; renderer?: '2d' | 'webgl' } = {}) {
  const calls: string[] = []
  const events: string[] = []
  const boom = (name: keyof GameModule): void => {
    if (opts.throwIn === name) throw new Error(`boom in ${name}`)
  }
  const mod: GameModule = {
    meta: { id: 'spy', renderer: opts.renderer ?? '2d' },
    mount: () => {
      calls.push('mount')
      boom('mount')
    },
    setState: (s) => {
      calls.push(`setState:${s.red}:${s.blue}`)
      boom('setState')
    },
    onEvent: (e) => {
      events.push(e.type)
      calls.push(`event:${e.type}`)
    },
    resize: () => calls.push('resize'),
    tick: () => {
      calls.push('tick')
      boom('tick')
    },
    pause: () => calls.push('pause'),
    resume: () => calls.push('resume'),
    destroy: () => calls.push('destroy'),
  }
  const factory: GameFactory = () => mod
  return { calls, events, load: () => Promise.resolve(factory) }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('GameHost（B34a：宿主）', () => {
  it('挂载后加载游戏、喂快照；根元素不接触摸；快照与新事件转发，历史事件不重放；卸载时销毁', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const spy = spyGame()
    const history: SeqEvent[] = [{ seq: 1, e: { type: 'countdown' } }]
    const w = mount(GameHost, { props: { load: spy.load, state: state(), events: history } })
    await flushPromises()
    await flushPromises()
    const root = w.find('.game-host')
    expect(root.attributes('data-status')).toBe('game')
    expect(root.attributes('style')).toContain('pointer-events: none')
    expect(root.attributes('aria-hidden')).toBe('true')
    expect(w.find('.game-host > canvas.game-canvas').exists()).toBe(true)
    expect(spy.calls.slice(0, 2)).toEqual(['mount', 'setState:0:0'])
    expect(spy.events).toEqual([])

    await w.setProps({ state: state(1, 0) })
    expect(spy.calls).toContain('setState:1:0')
    const more: SeqEvent[] = [...history, { seq: 2, e: { type: 'go' } }, { seq: 3, e: { type: 'point', team: 'red', playerId: 'a', streak: 1 } }]
    await w.setProps({ events: more })
    expect(spy.events).toEqual(['go', 'point'])
    await w.setProps({ events: [...more] })
    expect(spy.events).toEqual(['go', 'point'])

    w.unmount()
    expect(spy.calls[spy.calls.length - 1]).toBe('destroy')
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('帧循环跑起来会调 tick；切后台暂停、回来恢复', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    const spy = spyGame()
    const w = mount(GameHost, { props: { load: spy.load, state: state(), events: [] } })
    await flushPromises()
    await flushPromises()
    vi.advanceTimersByTime(100)
    expect(spy.calls.filter((c) => c === 'tick').length).toBeGreaterThan(0)
    const ticks = spy.calls.filter((c) => c === 'tick').length
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(spy.calls).toContain('pause')
    vi.advanceTimersByTime(100)
    expect(spy.calls.filter((c) => c === 'tick').length).toBe(ticks)
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(spy.calls).toContain('resume')
    vi.advanceTimersByTime(100)
    expect(spy.calls.filter((c) => c === 'tick').length).toBeGreaterThan(ticks)
    w.unmount()
  })

  it('游戏运行时抛错 → 换成保底画面，不冒泡；加载失败也是保底画面', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = spyGame({ throwIn: 'setState' })
    const w = mount(GameHost, { props: { load: bad.load, state: state(2, 1), events: [] } })
    await flushPromises()
    await flushPromises()
    expect(w.find('.game-host').attributes('data-status')).toBe('fallback')
    expect(bad.calls).toContain('destroy')
    expect(warn).toHaveBeenCalledTimes(1)
    // 保底画面照常收快照与事件，不再抛
    await w.setProps({ state: state(3, 1), events: [{ seq: 1, e: { type: 'go' } }] })
    expect(w.find('.game-host').attributes('data-status')).toBe('fallback')
    w.unmount()

    const w2 = mount(GameHost, { props: { load: () => Promise.reject(new Error('chunk 404')), state: state(), events: [] } })
    await flushPromises()
    await flushPromises()
    expect(w2.find('.game-host').attributes('data-status')).toBe('fallback')
    w2.unmount()
  })

  it('WebGL 游戏出错换保底画面时给它一块新 canvas（拿过 WebGL 上下文的拿不到 2D）；2D 游戏出错则沿用原来的', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gl = spyGame({ throwIn: 'setState', renderer: 'webgl' })
    const w = mount(GameHost, { props: { load: gl.load, state: state(2, 1), events: [] } })
    const before = w.find('.game-host > canvas.game-canvas').element
    await flushPromises()
    await flushPromises()
    expect(w.find('.game-host').attributes('data-status')).toBe('fallback')
    const canvases = w.findAll('.game-host canvas')
    expect(canvases).toHaveLength(1)
    expect(canvases[0]!.element).not.toBe(before)
    expect(canvases[0]!.classes()).toContain('game-canvas')
    w.unmount()

    const flat = spyGame({ throwIn: 'setState' })
    const w2 = mount(GameHost, { props: { load: flat.load, state: state(2, 1), events: [] } })
    const same = w2.find('.game-host > canvas.game-canvas').element
    await flushPromises()
    await flushPromises()
    expect(w2.find('.game-host').attributes('data-status')).toBe('fallback')
    expect(w2.find('.game-host > canvas.game-canvas').element).toBe(same)
    w2.unmount()
  })
})

describe('GameSlot（盒子里放什么）', () => {
  const base = { id: 'x', icon: '🎮', slot: 'top' as const, kind: 'race' as const }
  const CssSkin = defineComponent({ props: ['red', 'blue'], render: () => h('div', { class: 'css-skin' }) })

  it('注册了 game 的皮肤放 GameHost，没有的放 CSS 组件', async () => {
    const spy = spyGame()
    const w = mount(GameSlot, {
      props: { meta: { ...base, load: () => Promise.resolve(CssSkin), game: spy.load }, state: state(), events: [] },
    })
    await flushPromises()
    await flushPromises()
    expect(w.find('.game-host canvas').exists()).toBe(true)
    expect(w.find('.css-skin').exists()).toBe(false)
    w.unmount()

    const w2 = mount(GameSlot, { props: { meta: { ...base, load: () => Promise.resolve(CssSkin) }, state: state(), events: [] } })
    await flushPromises()
    await flushPromises()
    expect(w2.find('.css-skin').exists()).toBe(true)
    expect(w2.find('.game-host').exists()).toBe(false)
    w2.unmount()
  })
})
