/**
 * 当前版本与手动更新（需求 F1「版本与更新」，child-education 三个静态站统一，逻辑同一套）：
 * - 版本号 = 构建时刻的北京时间（「2026-09-23 14:05」），vite.config.ts 写进 __APP_VERSION__，同一份写进 dist/version.json；
 * - 「检查更新」：不走任何缓存取一次 version.json，与本页的版本比，不一样就是有新版本；
 * - 更新：让 Service Worker 去取新版本（装好就让它接管），接管后重新载入页面；没有 SW 就直接重新载入（页面本来就走网络）；
 * - 重新载入之前把「要更新到哪个版本」记进 sessionStorage，载入后比对：到了说「已更新」，没到说「更新没有完成」并给「重新安装」；
 * - 「重新安装」：注销 SW、删掉全部缓存、重新载入——从服务器拿一份全新的（学习记录在 localStorage，不动）。
 * 纯逻辑，浏览器对象都可注入，有单测。
 */

/** 本页的版本（构建时写进来） */
export const APP_VERSION: string = __APP_VERSION__

/** 取 version.json 最多等多久 */
export const FETCH_TIMEOUT_MS = 10_000
/** registration.update() 最多等多久：上一个 SW 还在装时它会等装完才返回，别跟着死等 */
export const UPDATE_CHECK_MS = 15_000
/** 新版本下了这么久还没接管：告诉家长「还在下载，好了会自动刷新」，同时给「重新安装」 */
export const UPDATE_SLOW_MS = 60_000
/** sessionStorage：刚才要更新到哪个版本（重新载入后比对用） */
export const UPDATE_NOTE_KEY = 'tongbulian:update'

export type VersionCheck = { kind: 'latest' } | { kind: 'newer'; version: string } | { kind: 'offline' } | { kind: 'failed' }

export interface CheckDeps {
  fetch: (url: string, init: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>
  /** navigator.onLine：明确是 false 才当没网 */
  online: () => boolean
  now: () => number
  timeoutMs?: number
}

function defaultCheckDeps(): CheckDeps {
  return {
    fetch: (url, init) => fetch(url, init),
    online: () => typeof navigator === 'undefined' || navigator.onLine !== false,
    now: Date.now,
  }
}

/**
 * 服务器上现在是哪个版本：相对地址（子路径部署也对），带时间戳 + no-store，浏览器缓存、CDN、SW 都不会拦下；
 * 没网 → offline，拿不到 / 格式不对 → failed。
 */
export async function checkVersion(current: string, deps: CheckDeps = defaultCheckDeps()): Promise<VersionCheck> {
  if (!deps.online()) return { kind: 'offline' }
  const ctrl = typeof AbortController === 'undefined' ? null : new AbortController()
  const timer = setTimeout(() => ctrl?.abort(), deps.timeoutMs ?? FETCH_TIMEOUT_MS)
  try {
    const res = await deps.fetch(`version.json?t=${deps.now()}`, { cache: 'no-store', signal: ctrl?.signal })
    if (!res.ok) return { kind: 'failed' }
    const data = (await res.json()) as { version?: unknown } | null
    const version = typeof data?.version === 'string' ? data.version.trim() : ''
    if (!version) return { kind: 'failed' }
    return version === current ? { kind: 'latest' } : { kind: 'newer', version }
  } catch {
    return deps.online() ? { kind: 'failed' } : { kind: 'offline' }
  } finally {
    clearTimeout(timer)
  }
}

/** 只声明用到的成员，测试里好造 */
export interface WorkerLike {
  state: string
  postMessage(msg: unknown): void
  addEventListener(type: 'statechange', fn: () => void): void
}
export interface RegistrationLike {
  update(): Promise<unknown>
  installing: WorkerLike | null
  waiting: WorkerLike | null
  unregister(): Promise<boolean>
}
export interface ContainerLike {
  getRegistration(): Promise<RegistrationLike | undefined>
  getRegistrations?(): Promise<readonly RegistrationLike[]>
  addEventListener(type: 'controllerchange', fn: () => void): void
}
export interface CachesLike {
  keys(): Promise<string[]>
  delete(name: string): Promise<boolean>
}

export interface ApplyDeps {
  sw: ContainerLike | null
  reload: () => void
  wait: (ms: number) => Promise<void>
}

function swContainer(): ContainerLike | null {
  return typeof navigator === 'undefined' ? null : ((navigator.serviceWorker as unknown as ContainerLike | undefined) ?? null)
}

function defaultApplyDeps(): ApplyDeps {
  return { sw: swContainer(), reload: () => location.reload(), wait: (ms) => new Promise((r) => setTimeout(r, ms)) }
}

/**
 * 换到新版本。成功时页面重新载入（返回的 promise 不再 resolve）；新版本下得慢 → 'slow'（还在等，接管了照样自动重新载入），
 * 新版本没装成（SW 变成 redundant）→ 'failed'。
 * 等着的 SW 发 SKIP_WAITING 让它马上接管（Workbox 生成的和自写的 SW 都认这条消息；自己会 skipWaiting 的发了也无妨）。
 */
export async function applyUpdate(deps: ApplyDeps = defaultApplyDeps()): Promise<'slow' | 'failed'> {
  const never = new Promise<never>(() => {})
  let reloaded = false
  const reload = (): void => {
    if (reloaded) return
    reloaded = true
    deps.reload()
  }
  const sw = deps.sw
  const reg = sw ? await sw.getRegistration().catch(() => undefined) : undefined
  // 没有 SW（不支持、file://、还没注册上）：页面本来就从网络取，重新载入就是新的
  if (!sw || !reg) {
    reload()
    return never
  }
  sw.addEventListener('controllerchange', reload)
  await Promise.race([reg.update().catch(() => undefined), deps.wait(UPDATE_CHECK_MS)])
  const worker = reg.installing ?? reg.waiting
  // 没有在装 / 等着的：新版本的 SW 早就接管了（只是这一页还是旧的），重新载入就换上
  if (!worker) {
    reload()
    return never
  }
  const skip = (w: WorkerLike | null): void => {
    try {
      w?.postMessage({ type: 'SKIP_WAITING' })
    } catch {
      /* 已经不在了 */
    }
  }
  skip(reg.waiting)
  return new Promise((resolve) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') skip(worker)
      else if (worker.state === 'activated') reload()
      else if (worker.state === 'redundant' && !reloaded) resolve('failed')
    })
    void deps.wait(UPDATE_SLOW_MS).then(() => {
      if (!reloaded) resolve('slow')
    })
  })
}

export interface ReinstallDeps {
  sw: ContainerLike | null
  caches: CachesLike | null
  reload: () => void
}

function defaultReinstallDeps(): ReinstallDeps {
  return { sw: swContainer(), caches: typeof caches === 'undefined' ? null : caches, reload: () => location.reload() }
}

/**
 * 「重新安装」：注销本站全部 SW、删掉全部缓存（页面外壳与朗读片段），然后重新载入。给「怎么都还是旧版」兜底；
 * 学习记录在 localStorage，不动。哪一步出错都照样重新载入。
 */
export async function reinstall(deps: ReinstallDeps = defaultReinstallDeps()): Promise<void> {
  try {
    const sw = deps.sw
    const regs = sw ? (sw.getRegistrations ? await sw.getRegistrations() : [await sw.getRegistration()]) : []
    for (const r of regs) await r?.unregister().catch(() => false)
  } catch {
    /* 没有就算了 */
  }
  try {
    if (deps.caches) for (const name of await deps.caches.keys()) await deps.caches.delete(name)
  } catch {
    /* 删不掉也照样重新载入 */
  }
  deps.reload()
}

export interface NoteStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function session(): NoteStore | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/** 重新载入之前记一笔：how = 更新 / 重新安装，to = 要更新到的版本（重新安装不知道就留空） */
export function noteUpdate(how: 'update' | 'reinstall', to: string, store: NoteStore | null = session()): void {
  try {
    store?.setItem(UPDATE_NOTE_KEY, JSON.stringify({ how, to }))
  } catch {
    /* 存不了就不报结果 */
  }
}

export type UpdateOutcome = 'updated' | 'reinstalled' | 'incomplete'

/** 载入后取出并清掉那一笔：版本到了 → updated / reinstalled，没到 → incomplete；没记过 → null */
export function takeUpdateNote(current: string, store: NoteStore | null = session()): UpdateOutcome | null {
  let raw: string | null = null
  try {
    raw = store?.getItem(UPDATE_NOTE_KEY) ?? null
    store?.removeItem(UPDATE_NOTE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const note = JSON.parse(raw) as { how?: unknown; to?: unknown }
    if (typeof note.to === 'string' && note.to && note.to !== current) return 'incomplete'
    return note.how === 'reinstall' ? 'reinstalled' : 'updated'
  } catch {
    return null
  }
}
