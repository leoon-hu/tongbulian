import { describe, expect, it, vi } from 'vitest'
import { RELOAD_KEY, UPDATE_WAIT_MS, alreadyReloaded, reloadForNewVersion } from '../update'

function mem(): Pick<Storage, 'getItem' | 'setItem'> {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }
}
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe('页面版本旧了自己更新重载（B43）', () => {
  it('没有 Service Worker：记下本版本、直接重载；同一版本只重载一次，换了版本又能重载', async () => {
    const storage = mem()
    const reload = vi.fn()
    const wait = vi.fn(async () => {})
    expect(await reloadForNewVersion({ build: 'abc', storage, sw: null, reload, wait })).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(storage.getItem(RELOAD_KEY)).toBe('abc')
    expect(alreadyReloaded({ build: 'abc', storage })).toBe(true)
    expect(await reloadForNewVersion({ build: 'abc', storage, sw: null, reload, wait })).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(await reloadForNewVersion({ build: 'def', storage, sw: null, reload, wait })).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
    expect(wait).not.toHaveBeenCalled()
  })

  it('有 Service Worker：先 update()；找到新版本就等它接管（controllerchange）再重载；没找到就直接重载；等太久也重载', async () => {
    const listeners: Record<string, Array<() => void>> = {}
    const reg = { installing: null as object | null, waiting: null as object | null, update: vi.fn(async () => void (reg.installing = {})) }
    const sw = {
      addEventListener: (t: string, fn: () => void) => void (listeners[t] ??= []).push(fn),
      getRegistration: vi.fn(async () => reg),
    } as unknown as ServiceWorkerContainer
    const reload = vi.fn()
    let waited = 0
    const never = (ms: number): Promise<void> => new Promise(() => void (waited = ms))
    const p = reloadForNewVersion({ build: 'a1', storage: mem(), sw, reload, wait: never })
    await tick()
    await tick()
    expect(reg.update).toHaveBeenCalledTimes(1)
    expect(reload).not.toHaveBeenCalled()
    expect(waited).toBe(UPDATE_WAIT_MS)
    for (const fn of listeners.controllerchange ?? []) fn()
    expect(await p).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)

    const reg2 = { installing: null, waiting: null, update: vi.fn(async () => {}) }
    const sw2 = { addEventListener: () => {}, getRegistration: vi.fn(async () => reg2) } as unknown as ServiceWorkerContainer
    const reload2 = vi.fn()
    expect(await reloadForNewVersion({ build: 'a2', storage: mem(), sw: sw2, reload: reload2, wait: never })).toBe(true)
    expect(reload2).toHaveBeenCalledTimes(1)

    const reg3 = { installing: {}, waiting: null, update: vi.fn(async () => {}) }
    const sw3 = { addEventListener: () => {}, getRegistration: vi.fn(async () => reg3) } as unknown as ServiceWorkerContainer
    const reload3 = vi.fn()
    expect(await reloadForNewVersion({ build: 'a3', storage: mem(), sw: sw3, reload: reload3, wait: async () => {} })).toBe(true)
    expect(reload3).toHaveBeenCalledTimes(1)

    // 拿注册就抛：照样重载
    const sw4 = { addEventListener: () => {}, getRegistration: vi.fn(async () => { throw new Error('x') }) } as unknown as ServiceWorkerContainer
    const reload4 = vi.fn()
    expect(await reloadForNewVersion({ build: 'a4', storage: mem(), sw: sw4, reload: reload4, wait: never })).toBe(true)
    expect(reload4).toHaveBeenCalledTimes(1)
  })
})
