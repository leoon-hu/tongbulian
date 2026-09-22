/**
 * 新版本上线后让开着的页面自己换过去（需求 B43）：vite-plugin-pwa 的 autoUpdate 只是装好新 Service Worker 并接管，
 * 页面里跑的还是旧包，要重载一次才是新的——不然旧页面会带着旧版本号去建房 / 进房。
 * 这里做两件事：① 页面回到前台时查一次更新（长开着的主屏幕应用没有导航，浏览器不会自己查）；
 * ② 新 SW 接管（controllerchange）后，不在对战里就马上重载，在对战里等退出竞技场再重载（不打断一局）。
 * 首次安装接管不算更新，不重载。
 */
export interface RegistrationLike {
  update(): Promise<unknown>
  installing?: unknown
  waiting?: unknown
  unregister?(): Promise<boolean>
}
export interface SwLike {
  controller: unknown
  addEventListener(type: 'controllerchange', fn: () => void): void
  getRegistration(): Promise<RegistrationLike | undefined>
}

export interface DocLike {
  visibilityState: string
  addEventListener(type: 'visibilitychange', fn: () => void): void
}

export interface SwUpdateDeps {
  sw: SwLike | null
  doc: DocLike | null
  reload(): void
  now?: () => number
}

/** 回到前台查更新的最短间隔：切个微信再回来不用每次都去要 sw.js */
export const UPDATE_CHECK_GAP_MS = 10 * 60 * 1000
/** 手动「检查更新」：有新版本在装时最多等多久它接管（外壳只有几 MB） */
export const MANUAL_UPDATE_WAIT_MS = 60_000

function defaultDeps(): SwUpdateDeps {
  return {
    sw: typeof navigator === 'undefined' ? null : ((navigator.serviceWorker as unknown as SwLike | undefined) ?? null),
    doc: typeof document === 'undefined' ? null : document,
    reload: () => location.reload(),
  }
}

/**
 * isBusy：现在不能重载（对战里）。返回 flush()：忙完了调一下，有攒着的更新就重载。
 */
export function setupSwUpdates(isBusy: () => boolean, deps: SwUpdateDeps = defaultDeps()): { flush(): void } {
  let pending = false
  const flush = (): void => {
    if (pending && !isBusy()) {
      pending = false
      deps.reload()
    }
  }
  const sw = deps.sw
  if (!sw) return { flush }
  let had = !!sw.controller
  sw.addEventListener('controllerchange', () => {
    const wasUpdate = had
    had = true
    if (!wasUpdate) return
    pending = true
    flush()
  })
  // 回到前台查更新：对战里不查（新 SW 安装要下载几十 MB 音频、装好还会立刻接管），10 分钟内不重复查
  const now = deps.now ?? Date.now
  let lastCheck = now()
  deps.doc?.addEventListener('visibilitychange', () => {
    if (deps.doc?.visibilityState !== 'visible' || isBusy()) return
    const t = now()
    if (t - lastCheck < UPDATE_CHECK_GAP_MS) return
    lastCheck = t
    sw.getRegistration()
      .then((r) => r?.update())
      .catch(() => undefined)
  })
  return { flush }
}

export type UpdateCheck = 'updating' | 'latest' | 'unavailable'

/**
 * 帮助页的「检查更新」（N8 ⑦）：向服务器要一次 sw.js；有新版本在装 / 等着就返回 updating（装好接管后 setupSwUpdates 会重载），
 * 没有就 latest；这个环境没有 SW（没 https、file://）就 unavailable。等待接管最多 MANUAL_UPDATE_WAIT_MS，超时也算 updating
 * （下次打开会是新的）。
 */
export async function checkForUpdate(deps: Pick<SwUpdateDeps, 'sw'> & { wait?: (ms: number) => Promise<void> } = defaultDeps()): Promise<UpdateCheck> {
  const sw = deps.sw
  if (!sw) return 'unavailable'
  const reg = await sw.getRegistration().catch(() => undefined)
  if (!reg) return 'unavailable'
  await reg.update().catch(() => undefined)
  if (!reg.installing && !reg.waiting) return 'latest'
  const wait = deps.wait ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)))
  await Promise.race([new Promise<void>((r) => sw.addEventListener('controllerchange', () => r())), wait(MANUAL_UPDATE_WAIT_MS)])
  return 'updating'
}

/**
 * 「重装应用」：注销 Service Worker、删掉全部缓存（页面外壳与朗读片段），然后重载——从服务器重新拿一份最新的。
 * 给「怎么都还是旧版」这种情况兜底；学习记录在 localStorage，不动。
 */
export async function reinstall(deps: { sw: SwLike | null; caches?: { keys(): Promise<string[]>; delete(name: string): Promise<boolean> } | null; reload(): void }): Promise<void> {
  try {
    const reg = await deps.sw?.getRegistration()
    if (reg?.unregister) await reg.unregister()
  } catch {
    /* 没有就算了 */
  }
  try {
    const store = deps.caches === undefined ? (typeof caches === 'undefined' ? null : caches) : deps.caches
    if (store) for (const name of await store.keys()) await store.delete(name)
  } catch {
    /* 删不掉也照样重载 */
  }
  deps.reload()
}

