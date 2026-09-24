import { describe, expect, it } from 'vitest'
import { en, zh } from 'virtual:audio-clips'
import { HASH_LEN } from '@/audio/clips'
import { pruneAudioCache, type CacheLike } from '../audioCache'

/** 假缓存：一组 url */
function fakeCache(initial: string[]) {
  const store = new Set(initial)
  const cache: CacheLike = {
    keys: async () => [...store].map((url) => ({ url })),
    delete: async (url) => store.delete(url),
  }
  return { cache, store }
}

describe('朗读片段的缓存清理（N8 ⑦）', () => {
  it('两种语言现在的片段都留着，旧片段删掉，别的文件不动', async () => {
    const zhNow = `https://x.test/sub/audio/zh-${zh.slice(0, HASH_LEN)}.mp3`
    const enNow = `https://x.test/sub/audio/en-${en.slice(HASH_LEN, HASH_LEN * 2)}.mp3`
    const zhOld = 'https://x.test/sub/audio/zh-oldoldold1.mp3'
    const enOld = 'https://x.test/sub/audio/en-oldoldold2.mp3'
    // 中文的哈希放在英文目录下也不算数（两种语言各查各的表）
    const crossed = `https://x.test/sub/audio/en-${zh.slice(0, HASH_LEN)}.mp3`
    const other = ['https://x.test/sub/assets/index.js', 'https://x.test/sub/audio/CREDITS.md']
    const { cache, store } = fakeCache([zhNow, enNow, zhOld, enOld, crossed, ...other])
    const removed = await pruneAudioCache(async () => cache)
    expect([...store].sort()).toEqual([zhNow, enNow, ...other].sort())
    expect(removed).toBe(zh.slice(0, HASH_LEN) === en.slice(0, HASH_LEN) ? 2 : 3)
    expect(await pruneAudioCache(async () => cache)).toBe(0)
  })

  it('缓存打不开 / 抛错就什么都不做', async () => {
    expect(await pruneAudioCache(async () => null)).toBe(0)
    expect(await pruneAudioCache(() => Promise.reject(new Error('no')))).toBe(0)
    const broken: CacheLike = { keys: () => Promise.reject(new Error('x')), delete: async () => true }
    expect(await pruneAudioCache(async () => broken)).toBe(0)
  })
})
