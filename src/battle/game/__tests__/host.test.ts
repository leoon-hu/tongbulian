// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { SeqEvent } from '@/battle/protocol'
import type { GameFactory, GameModule, GameState } from '../contract'
import GameHost from '../host/GameHost.vue'
import GameSlot from '@/components/battle/GameSlot.vue'

const state = (red = 0, blue = 0): GameState => ({ red, blue, target: 8, phase: 'playing', winner: null, lastPoint: null })

/** 记录调用的假游戏；可以让某个方法抛错 */
function spyGame(opts: { throwIn?: keyof GameModule } = {}) {
  const calls: string[] = []
  const events: string[] = []
  const boom = (name: keyof GameModule): void => {
    if (opts.throwIn === name) throw new Error(`boom in ${name}`)
  }
  const mod: GameModule = {
    meta: { id: 'spy' },
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
    poke: (x, y, team) => calls.push(`poke:${team}:${Math.round(x)},${Math.round(y)}`),
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
})

describe('GameSlot（盒子里放什么）', () => {
  const base = { id: 'x', icon: '🎮', slot: 'top' as const, kind: 'race' as const }

  it('盒子里放 GameHost 跑注册表里的游戏；换皮肤 id 重建宿主', async () => {
    const spy = spyGame()
    const w = mount(GameSlot, { props: { meta: { ...base, game: spy.load }, state: state(), events: [] } })
    await flushPromises()
    await flushPromises()
    expect(w.find('.game-host canvas').exists()).toBe(true)
    expect(spy.calls).toContain('mount')
    const other = spyGame()
    await w.setProps({ meta: { ...base, id: 'y', game: other.load } })
    await flushPromises()
    await flushPromises()
    expect(spy.calls).toContain('destroy')
    expect(other.calls).toContain('mount')
    w.unmount()
  })
})

describe('点一下游戏（B59）', () => {
  it('canvas 收 pointerdown：坐标与 sideOf 猜的一方交给游戏的 poke、画一圈涟漪、往上报 poke；150 ms 内只算一次；根元素仍不接触摸', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const spy = spyGame()
    const w = mount(GameHost, { props: { load: spy.load, state: state(), events: [], sideOf: (x: number) => (x < 50 ? 'red' : 'blue') } })
    await flushPromises()
    await flushPromises()
    expect(w.find('.game-host').attributes('style')).toContain('pointer-events: none')
    await w.find('canvas').trigger('pointerdown', { clientX: 10, clientY: 20 })
    expect(spy.calls.at(-1)).toBe('poke:red:10,20')
    expect(w.findAll('.ripple')).toHaveLength(1)
    expect(w.emitted('poke')).toEqual([['red']])
    // 太快的第二下不算
    await w.find('canvas').trigger('pointerdown', { clientX: 90, clientY: 20 })
    expect(spy.calls.filter((c) => c.startsWith('poke')).length).toBe(1)
    vi.advanceTimersByTime(200)
    await w.find('canvas').trigger('pointerdown', { clientX: 90, clientY: 20 })
    expect(spy.calls.at(-1)).toBe('poke:blue:90,20')
    expect(w.emitted('poke')).toEqual([['red'], ['blue']])
    vi.advanceTimersByTime(600)
    await flushPromises()
    expect(w.findAll('.ripple')).toHaveLength(0)
    w.unmount()
  })

  it('游戏没实现 poke 也不出错（只有涟漪）；poke 抛错 → 换保底画面', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const spy = spyGame()
    const bare = { ...spy }
    const w = mount(GameHost, {
      props: {
        load: () =>
          bare.load().then((f) => () => {
            const m = f()
            delete m.poke
            return m
          }),
        state: state(),
        events: [],
      },
    })
    await flushPromises()
    await flushPromises()
    await w.find('canvas').trigger('pointerdown', { clientX: 10, clientY: 20 })
    expect(w.findAll('.ripple')).toHaveLength(1)
    expect(w.emitted('poke')).toEqual([['blue']]) // 没传 sideOf：1×1 的假盒子里 y=20 在下半
    expect(spy.calls.some((c) => c.startsWith('poke'))).toBe(false)
    w.unmount()

    const boom = spyGame()
    const w2 = mount(GameHost, {
      props: {
        load: () =>
          boom.load().then((f) => () => {
            const m = f()
            m.poke = () => {
              throw new Error('poke boom')
            }
            return m
          }),
        state: state(),
        events: [],
      },
    })
    await flushPromises()
    await flushPromises()
    await w2.find('canvas').trigger('pointerdown', { clientX: 10, clientY: 20 })
    expect(w2.find('.game-host').attributes('data-status')).toBe('fallback')
    expect(warn).toHaveBeenCalled()
    w2.unmount()
  })

  it('GameSlot 按皮肤猜一方：横条的并行 / 收集类上半红下半蓝，拉锯类与竖条左红右蓝', async () => {
    const cases: Array<[{ slot: 'top' | 'center'; kind: 'race' | 'tug' | 'grow' | 'consume' }, number, number, string]> = [
      [{ slot: 'top', kind: 'race' }, 900, 10, 'red'],
      [{ slot: 'top', kind: 'grow' }, 900, 100, 'blue'],
      [{ slot: 'top', kind: 'tug' }, 100, 100, 'red'],
      [{ slot: 'top', kind: 'tug' }, 900, 10, 'blue'],
      [{ slot: 'center', kind: 'race' }, 20, 690, 'red'],
      [{ slot: 'center', kind: 'consume' }, 130, 10, 'blue'],
    ]
    for (const [meta, x, y, team] of cases) {
      const spy = spyGame()
      const w = mount(GameSlot, { props: { meta: { id: 'x', icon: '🎮', ...meta, game: spy.load }, state: state(), events: [] } })
      await flushPromises()
      await flushPromises()
      // 假盒子量出来是 1×1：把 sideOf 的判断按 1000×120 / 150×700 的比例换算，直接调宿主的 sideOf 看结果
      const host = w.findComponent(GameHost)
      const sideOf = host.props('sideOf') as (x: number, y: number, w: number, h: number) => string
      const [W, H] = meta.slot === 'top' ? [1000, 120] : [150, 700]
      expect(sideOf(x, y, W, H), `${meta.slot}/${meta.kind} (${x},${y})`).toBe(team)
      w.unmount()
    }
  })
})
