/**
 * 离线用的朗读片段（需求 N8 ⑦，2026-09-22 用户报「旧手机刷新多次还是旧版本」后改的）。
 *
 * 以前全部 mp3 和页面代码在同一个 Service Worker 预缓存里：新版本要把几千个文件（几十 MB）全部下完才能装好、才能换掉
 * 旧页面，老手机上要几十分钟、中途一个失败整次作废，刷新多少次都是旧版。现在预缓存只有页面外壳（几 MB，几秒装好），
 * 朗读片段由这里在后台分批下载进另一个缓存（AUDIO_CACHE，与 SW 的运行时缓存同名，离线时 SW 从它取）：
 * - 文件名是文本的哈希（audio/clips.ts），换版本只补新增的，已有的一个都不重下；下了一半断网，下次接着下；
 * - 每次最多 CONCURRENCY 个并发，页面空闲了才开始，省流量模式（saveData）下不主动下；
 * - 一轮全部下完后把这门语言里已经不用的旧片段删掉。
 * 练习 / 对战里点到还没下好的片段，audio.ts 照常从网络取（经 SW 也会存进同一个缓存）；真离线时缺的片段退 TTS。
 */
import { en, zh } from 'virtual:audio-clips'
import { HASH_LEN } from '@/audio/clips'
import type { Lang } from '@/types/models'

/** 与 vite.config.ts 里 runtimeCaching 的 cacheName 一致 */
export const AUDIO_CACHE = 'audio'
export const CONCURRENCY = 4
/** 连续失败这么多次就停（断网 / 服务器不通），等下次 online / 回到前台再来 */
export const MAX_FAILURES = 5
const PACKED: Record<Lang, string> = { zh, en }

/** 这门语言全部片段的相对地址（audio/zh-xxxxxxxxxx.mp3） */
export function audioFiles(lang: Lang): string[] {
  const packed = PACKED[lang]
  const out: string[] = []
  for (let i = 0; i + HASH_LEN <= packed.length; i += HASH_LEN) out.push(`audio/${lang}-${packed.slice(i, i + HASH_LEN)}.mp3`)
  return out
}

export interface CacheLike {
  match(url: string): Promise<{ ok?: boolean } | undefined>
  put(url: string, res: Response): Promise<void>
  keys(): Promise<readonly { url: string }[]>
  delete(url: string): Promise<boolean>
}
export interface OfflineDeps {
  openCache(): Promise<CacheLike | null>
  fetch(url: string): Promise<Response>
  /** 相对地址 → 绝对地址（按页面地址解析，子路径部署也对） */
  resolve(path: string): string
  online(): boolean
}

export interface PrefetchResult {
  /** 这门语言一共多少条、这一轮之后缓存里有多少条、这一轮新下了几条 */
  total: number
  cached: number
  fetched: number
  /** 因为失败 / 断网 / 被取消而停下 */
  stopped: boolean
}

function defaultDeps(): OfflineDeps {
  return {
    openCache: async () => (typeof caches === 'undefined' ? null : caches.open(AUDIO_CACHE)),
    fetch: (url) => fetch(url),
    resolve: (path) => new URL(path, location.href.split('#')[0]).href,
    online: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
  }
}

/**
 * 把这门语言的片段补进缓存。signal 可取消（切语言 / 离开）；返回时缓存里的数量 = cached。
 * 缓存打不开（不支持 / file:// / 隐私模式）就什么都不做。
 */
export async function prefetchAudio(lang: Lang, deps: OfflineDeps = defaultDeps(), signal?: AbortSignal): Promise<PrefetchResult> {
  const files = audioFiles(lang)
  const result: PrefetchResult = { total: files.length, cached: 0, fetched: 0, stopped: false }
  const cache = await deps.openCache().catch(() => null)
  if (!cache) return { ...result, stopped: true }
  // 先看缓存里有哪些（一次 keys() 比几千次 match() 快得多）
  const have = new Set<string>()
  try {
    for (const k of await cache.keys()) have.add(k.url)
  } catch {
    /* 有的浏览器 keys() 不给，退回逐个 match */
  }
  const todo: string[] = []
  for (const f of files) {
    const url = deps.resolve(f)
    if (have.has(url)) result.cached += 1
    else todo.push(url)
  }
  let failures = 0
  let i = 0
  const worker = async (): Promise<void> => {
    while (i < todo.length) {
      if (signal?.aborted || !deps.online() || failures >= MAX_FAILURES) {
        result.stopped = true
        return
      }
      const url = todo[i++]!
      try {
        if (!have.size && (await cache.match(url))) {
          result.cached += 1
          continue
        }
        const res = await deps.fetch(url)
        if (!res.ok) throw new Error(String(res.status))
        await cache.put(url, res)
        result.cached += 1
        result.fetched += 1
        failures = 0
      } catch {
        failures += 1
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  if (!result.stopped && result.cached >= result.total) await prune(cache, lang, new Set(files.map(deps.resolve)))
  return result
}

/** 一轮全部下完后：这门语言里不在清单上的旧片段删掉（改过文案、重做过音频的） */
async function prune(cache: CacheLike, lang: Lang, keep: Set<string>): Promise<void> {
  try {
    for (const k of await cache.keys()) {
      if (keep.has(k.url)) continue
      if (!new RegExp(`/audio/${lang}-[a-z0-9]+\\.mp3$`).test(k.url)) continue
      await cache.delete(k.url)
    }
  } catch {
    /* 删不掉就留着，无害 */
  }
}

/** 省流量模式（Android Chrome 的 Data Saver）：不主动下 */
export function saveData(nav: { connection?: { saveData?: boolean } } = typeof navigator === 'undefined' ? {} : (navigator as unknown as { connection?: { saveData?: boolean } })): boolean {
  return nav.connection?.saveData === true
}
