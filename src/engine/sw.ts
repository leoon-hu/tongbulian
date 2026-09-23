/**
 * 新版本上线后让开着的页面自己换过去（需求 B43）：vite-plugin-pwa 的 autoUpdate 只是装好新 Service Worker 并接管，
 * 页面里跑的还是旧包，要重载一次才是新的——不然旧页面会带着旧版本号去建房 / 进房。
 * 这里做两件事：① 页面回到前台时查一次更新（长开着的主屏幕应用没有导航，浏览器不会自己查）；
 * ② 新 SW 接管（controllerchange）后，不在对战里就马上重载，在对战里等退出竞技场再重载（不打断一局）。
 * 首次安装接管不算更新，不重载。手动「检查更新」「重新安装」在 engine/version.ts（首页页脚的版本卡片，F1）。
 */
export interface RegistrationLike {
  update(): Promise<unknown>
  installing?: unknown
  waiting?: unknown
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
