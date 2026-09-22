import { describe, expect, it, vi } from 'vitest'
import { CONCURRENCY, MAX_FAILURES, audioFiles, prefetchAudio, saveData, type CacheLike, type OfflineDeps } from '../offline'

/** 假缓存：url → 有没有 */
function fakeCache(initial: string[] = []) {
  const store = new Set(initial)
  const cache: CacheLike = {
    match: async (url) => (store.has(url) ? { ok: true } : undefined),
    put: async (url) => {
      store.add(url)
    },
    keys: async () => [...store].map((url) => ({ url })),
    delete: async (url) => store.delete(url),
  }
  return { cache, store }
}

function deps(cache: CacheLike | null, opts: { fail?: (url: string) => boolean; online?: () => boolean; onFetch?: (url: string) => void } = {}): OfflineDeps {
  let inflight = 0
  let peak = 0
  const d: OfflineDeps & { peak: () => number } = {
    openCache: async () => cache,
    resolve: (p) => `https://x.test/${p}`,
    online: opts.online ?? (() => true),
    fetch: async (url) => {
      inflight += 1
      peak = Math.max(peak, inflight)
      opts.onFetch?.(url)
      await Promise.resolve()
      inflight -= 1
      if (opts.fail?.(url)) return new Response('', { status: 404 })
      return new Response('mp3', { status: 200 })
    },
    peak: () => peak,
  }
  return d
}

describe('离线朗读包（N8 ⑦）', () => {
  it('audioFiles：按语言列出全部片段地址；saveData 只在 connection.saveData 为 true 时', () => {
    const zh = audioFiles('zh')
    expect(zh.length).toBeGreaterThan(1000)
    expect(zh[0]).toMatch(/^audio\/zh-[a-z0-9]{10}\.mp3$/)
    expect(new Set(zh).size).toBe(zh.length)
    expect(saveData({ connection: { saveData: true } })).toBe(true)
    expect(saveData({ connection: { saveData: false } })).toBe(false)
    expect(saveData({})).toBe(false)
  })

  it('只下缓存里没有的，并发不超过 CONCURRENCY；下完一轮把不在清单上的旧片段删掉；缓存打不开就什么都不做', async () => {
    const files = audioFiles('zh')
    const have = files.slice(0, 100).map((f) => `https://x.test/${f}`)
    const stale = ['https://x.test/audio/zh-oldoldold1.mp3', 'https://x.test/audio/en-keepkeepk1.mp3', 'https://x.test/assets/index.js']
    const { cache, store } = fakeCache([...have, ...stale])
    const fetched: string[] = []
    const d = deps(cache, { onFetch: (u) => fetched.push(u) })
    const r = await prefetchAudio('zh', d)
    expect(r).toEqual({ total: files.length, cached: files.length, fetched: files.length - 100, stopped: false })
    expect(fetched).not.toContain(have[0])
    expect((d as unknown as { peak: () => number }).peak()).toBeLessThanOrEqual(CONCURRENCY)
    expect(store.has('https://x.test/audio/zh-oldoldold1.mp3')).toBe(false) // 中文的旧片段删了
    expect(store.has('https://x.test/audio/en-keepkeepk1.mp3')).toBe(true) // 别的语言不动
    expect(store.has('https://x.test/assets/index.js')).toBe(true)
    // 再跑一遍：一个都不用下
    const again = await prefetchAudio('zh', deps(cache))
    expect(again.fetched).toBe(0)
    expect(await prefetchAudio('zh', deps(null))).toEqual({ total: files.length, cached: 0, fetched: 0, stopped: true })
  })

  it('连续失败 MAX_FAILURES 次停下（不删旧片段）；断网停下；signal 取消停下', async () => {
    const { cache, store } = fakeCache(['https://x.test/audio/zh-oldoldold1.mp3'])
    const r = await prefetchAudio('zh', deps(cache, { fail: () => true }))
    expect(r.stopped).toBe(true)
    expect(r.fetched).toBe(0)
    expect(store.has('https://x.test/audio/zh-oldoldold1.mp3')).toBe(true)
    let calls = 0
    const offline = await prefetchAudio('zh', deps(fakeCache().cache, { online: () => calls++ > 0 && false, onFetch: () => undefined }))
    expect(offline.stopped).toBe(true)
    const ac = new AbortController()
    ac.abort()
    const aborted = await prefetchAudio('zh', deps(fakeCache().cache), ac.signal)
    expect(aborted.stopped).toBe(true)
    expect(aborted.fetched).toBe(0)
    void MAX_FAILURES
    void vi
  })
})
