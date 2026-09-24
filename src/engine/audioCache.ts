/**
 * 朗读片段的缓存清理（需求 N8 ⑦）。
 *
 * 朗读片段不预先下载：页面读到哪条才取哪条，Service Worker 顺手存进运行时缓存 AUDIO_CACHE（缓存优先，再读就不用联网；
 * 不保证没有网也能用）。文件名是文本的哈希（audio/clips.ts），改过文案、重做过音频的片段换了新地址，旧的就一直留在缓存里——
 * 这里在页面打开一会儿后把两种语言的片段表里都没有的旧片段删掉。只读写本机缓存、不联网。
 */
import { knownClip } from '@/audio/clips'
import type { Lang } from '@/types/models'

/** 与 vite.config.ts 里 runtimeCaching 的 cacheName 一致 */
export const AUDIO_CACHE = 'audio'
const CLIP_RE = /\/audio\/(zh|en)-([a-z0-9]+)\.mp3$/

export interface CacheLike {
  keys(): Promise<readonly { url: string }[]>
  delete(url: string): Promise<boolean>
}

/** 删掉缓存里已经不用的旧片段，返回删了几条；缓存打不开（不支持 / file:// / 隐私模式）就什么都不做 */
export async function pruneAudioCache(
  openCache: () => Promise<CacheLike | null> = async () => (typeof caches === 'undefined' ? null : caches.open(AUDIO_CACHE)),
): Promise<number> {
  const cache = await openCache().catch(() => null)
  if (!cache) return 0
  let removed = 0
  try {
    for (const k of await cache.keys()) {
      const m = CLIP_RE.exec(new URL(k.url).pathname)
      if (!m || knownClip(m[1] as Lang, m[2]!)) continue
      if (await cache.delete(k.url)) removed += 1
    }
  } catch {
    /* 删不掉就留着，无害 */
  }
  return removed
}
