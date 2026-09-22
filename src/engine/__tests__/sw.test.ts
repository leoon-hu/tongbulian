import { describe, expect, it, vi } from 'vitest'
import { UPDATE_CHECK_GAP_MS, setupSwUpdates, type SwLike } from '../sw'

function fakeSw(controller: unknown): SwLike & { fire(): void; update: ReturnType<typeof vi.fn> } {
  const fns: Array<() => void> = []
  const update = vi.fn(async () => undefined)
  return {
    controller,
    addEventListener: (_t, fn) => void fns.push(fn),
    getRegistration: async () => ({ update }),
    fire: () => fns.forEach((fn) => fn()),
    update,
  }
}
function fakeDoc(): { addEventListener: (t: string, fn: () => void) => void; visibilityState: string; show(): void } {
  const fns: Array<() => void> = []
  return {
    visibilityState: 'hidden',
    addEventListener: (_t, fn) => void fns.push(fn),
    show() {
      this.visibilityState = 'visible'
      fns.forEach((fn) => fn())
    },
  }
}

describe('新版本 Service Worker 接管后重载页面（B43）', () => {
  it('首次安装的接管不重载；之后的接管不在对战里就马上重载', () => {
    const sw = fakeSw(null)
    const reload = vi.fn()
    setupSwUpdates(() => false, { sw, doc: null, reload })
    sw.fire()
    expect(reload).not.toHaveBeenCalled() // 首次安装
    sw.fire()
    expect(reload).toHaveBeenCalledTimes(1) // 真正的更新
  })

  it('页面一开始就有 SW 在管：接管就是更新；在对战里先攒着，flush() 时不忙了才重载', () => {
    const sw = fakeSw({})
    const reload = vi.fn()
    let busy = true
    const { flush } = setupSwUpdates(() => busy, { sw, doc: null, reload })
    sw.fire()
    expect(reload).not.toHaveBeenCalled()
    flush()
    expect(reload).not.toHaveBeenCalled()
    busy = false
    flush()
    expect(reload).toHaveBeenCalledTimes(1)
    flush()
    expect(reload).toHaveBeenCalledTimes(1) // 攒着的只用一次
  })

  it('回到前台时查一次更新（10 分钟内不重复、对战里不查）；没有 SW 的环境什么都不做', async () => {
    const sw = fakeSw({})
    const doc = fakeDoc()
    let t = 0
    let busy = false
    setupSwUpdates(() => busy, { sw, doc, reload: vi.fn(), now: () => t })
    doc.show()
    await Promise.resolve()
    await Promise.resolve()
    expect(sw.update).toHaveBeenCalledTimes(0) // 刚打开的页面本来就是新的
    t = UPDATE_CHECK_GAP_MS
    busy = true
    doc.show()
    await Promise.resolve()
    expect(sw.update).toHaveBeenCalledTimes(0) // 对战里不查
    busy = false
    doc.show()
    await Promise.resolve()
    await Promise.resolve()
    expect(sw.update).toHaveBeenCalledTimes(1)
    doc.show()
    await Promise.resolve()
    expect(sw.update).toHaveBeenCalledTimes(1) // 10 分钟内不重复
    t = UPDATE_CHECK_GAP_MS * 2
    doc.show()
    await Promise.resolve()
    await Promise.resolve()
    expect(sw.update).toHaveBeenCalledTimes(2)
    const reload = vi.fn()
    const { flush } = setupSwUpdates(() => false, { sw: null, doc: null, reload })
    flush()
    expect(reload).not.toHaveBeenCalled()
  })
})
