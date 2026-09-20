/**
 * 页面版本过旧时自己更新（需求 B43）：多设备房间要求大家的出题代码同一个版本，服务器发现本页旧了会回 version。
 * 这时不让用户手动刷新：让 Service Worker 检查更新，等新版本接管（controllerchange）后重新载入页面；
 * 地址不变，房间页重载后自己再进，建房 / 输口令的意图记在 sessionStorage 里重载后接着做。
 * 同一个版本只自动重载一次（sessionStorage 记着），万一重载后还是旧的（更新没下来）就不再刷，让页面显示提示。
 */

/** 本版本已经为此重载过一次 */
export const RELOAD_KEY = 'tongbulian:reloaded'
/** 重载后接着建房（值 = kpId）/ 接着用口令进房（值 = 口令） */
export const AUTOCREATE_KEY = 'tongbulian:autocreate'
export const AUTOJOIN_KEY = 'tongbulian:autojoin'
/** 从开始到重载最多这么久：等新版本 Service Worker 接管，到了也重载 */
export const UPDATE_WAIT_MS = 20_000
/** registration.update() 最多等这么久：旧 SW 还在装（首次预缓存几 MB）时它会等装完才返回，别跟着死等 */
export const UPDATE_CHECK_MS = 3000

export interface UpdateDeps {
  build: string
  storage: Pick<Storage, 'getItem' | 'setItem'> | null
  sw: ServiceWorkerContainer | null
  reload(): void
  wait(ms: number): Promise<void>
}

function defaultDeps(): UpdateDeps {
  let storage: UpdateDeps['storage'] = null
  try {
    storage = typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    storage = null
  }
  return {
    build: __BUILD__,
    storage,
    sw: typeof navigator === 'undefined' ? null : (navigator.serviceWorker ?? null),
    reload: () => location.reload(),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  }
}

/** 记一个「重载后接着做」的意图（没有 sessionStorage 就算了） */
export function remember(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* 隐私模式等 */
  }
}
/** 取出并清掉一个意图 */
export function takeIntent(key: string): string | null {
  try {
    const v = sessionStorage.getItem(key)
    if (v !== null) sessionStorage.removeItem(key)
    return v
  } catch {
    return null
  }
}

/** 这个版本已经自动重载过了吗 */
export function alreadyReloaded(deps: Pick<UpdateDeps, 'build' | 'storage'>): boolean {
  try {
    return deps.storage?.getItem(RELOAD_KEY) === deps.build
  } catch {
    return false
  }
}

/**
 * 自动更新并重载；返回 false = 这个版本已经试过一次、不再重载（调用方显示提示）。
 * 返回 true 之后页面很快就会重新载入。
 */
export async function reloadForNewVersion(deps: UpdateDeps = defaultDeps()): Promise<boolean> {
  if (alreadyReloaded(deps)) return false
  try {
    deps.storage?.setItem(RELOAD_KEY, deps.build)
  } catch {
    /* 存不了也照样重载一次 */
  }
  const sw = deps.sw
  if (sw) {
    // 整个过程有个总期限：到了不管新版本装没装好都重载（重载后没接管的话页面会从网络拿最新的）
    const deadline = deps.wait(UPDATE_WAIT_MS)
    const controlled = new Promise<void>((resolve) => sw.addEventListener('controllerchange', () => resolve(), { once: true }))
    try {
      const reg = await Promise.race([sw.getRegistration(), deadline.then(() => undefined)])
      if (reg) {
        await Promise.race([reg.update().catch(() => undefined), deps.wait(UPDATE_CHECK_MS)])
        // 有新版本在装（或已装好等着）：等它接管再重载，预缓存要下载一会儿
        if (reg.installing || reg.waiting) await Promise.race([controlled, deadline])
      }
    } catch {
      /* 拿不到注册就直接重载 */
    }
  }
  deps.reload()
  return true
}
