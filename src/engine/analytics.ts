/**
 * 访问统计（需求 N7，2026-09-21 四个站统一）：自建的 Umami（开源、无 cookie、不存 IP），页面里只多一行 <script defer>。
 * 脚本地址与站点 id 来自构建期环境变量 VITE_UMAMI_SCRIPT / VITE_UMAMI_WEBSITE_ID（.env，不进仓库）：两项都有才加标签，
 * 别人自己部署时不配就什么都不加。标签由 vite.config.ts 在正式构建时写进 index.html、seo/site.ts 写进静态 SEO 页；
 * dev 不加。data-domains 限定只在正式域名（SITE_URL 的主机名）下上报：本机 preview、本地静态服务器都不算。
 * 上报的是页面地址（含 hash 路由）、标题、来源、屏幕尺寸、语言，学习记录不上报。
 * 应用里的翻页由自己上报（data-auto-track="false" + setupPageTracking）：tracker 默认会把整个地址连 hash 与
 * 查询串一起记，房间链接 #/battle/<房间号>?t=red 里的房间号就是进房的钥匙，不能进统计库（N6 ⑨）——上报前把它换成
 * /battle/room、去掉查询串；返回键也走路由的 afterEach，不再另外补记（原来会记两次）。
 */
export interface AnalyticsConfig {
  script: string
  websiteId: string
  /** 只在这个主机名下上报；空 = 不限 */
  domain: string
}

export function analyticsConfig(env: Record<string, string | undefined>): AnalyticsConfig | null {
  const script = env.VITE_UMAMI_SCRIPT?.trim() ?? ''
  const websiteId = env.VITE_UMAMI_WEBSITE_ID?.trim() ?? ''
  if (!script || !websiteId) return null
  let domain = ''
  try {
    if (env.SITE_URL?.trim()) domain = new URL(env.SITE_URL.trim()).hostname
  } catch {
    domain = ''
  }
  return { script, websiteId, domain }
}

/**
 * 标签的属性（vite 的 transformIndexHtml 直接用；静态页用 analyticsTag 拼成字符串）。
 * autoTrack=false 是给应用入口页的：翻页由 setupPageTracking 上报；静态 SEO 页没有自己的脚本，让 tracker 自己记
 */
export function analyticsAttrs(cfg: AnalyticsConfig, autoTrack = true): Record<string, string | true> {
  return {
    defer: true,
    src: cfg.script,
    'data-website-id': cfg.websiteId,
    ...(autoTrack ? {} : { 'data-auto-track': 'false' }),
    ...(cfg.domain ? { 'data-domains': cfg.domain } : {}),
  }
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** 写进静态页 <head> 的标签；没配置就是空串 */
export function analyticsTag(cfg: AnalyticsConfig | null): string {
  if (!cfg) return ''
  const attrs = Object.entries(analyticsAttrs(cfg))
    .map(([k, v]) => (v === true ? k : `${k}="${escapeAttr(v)}"`))
    .join(' ')
  return `<script ${attrs}></script>`
}

/** Umami 的 tracker 挂在 window.umami 上（没加标签或还没加载完就没有） */
export interface UmamiTracker {
  track: (payload: (props: Record<string, unknown>) => Record<string, unknown>) => Promise<void>
}

interface TrackerWindow {
  umami?: UmamiTracker
  location: { pathname: string; hash: string }
  document?: { title: string }
  setTimeout: Window['setTimeout']
}

/** 等标题换好再报（tracker 自己对 pushState 也是等 300 毫秒） */
const DELAY_MS = 300
/** 统计脚本是 defer 的，我们的第一次上报可能比它早：每隔一会儿看一次，最多等这么久 */
const READY_TRIES = 20
const READY_GAP_MS = 250
const ROOM_HASH = /^#\/battle\/[A-Z0-9]{6}(?=[/?#]|$)/

/**
 * 上报用的地址：路径 + hash 里的路由，去掉查询串（?t=red、?sem=2 之类），多设备房间的房间号换成 room
 * （房间号 = 进房的钥匙，不进统计库）
 */
export function trackedUrl(loc: { pathname: string; hash: string }): string {
  const hash = loc.hash.split('?')[0]!.replace(ROOM_HASH, '#/battle/room')
  return `${loc.pathname}${hash}`
}
/** 房间页的标题带房间号，也换掉 */
export function trackedTitle(title: string, loc: { hash: string }): string {
  return ROOM_HASH.test(loc.hash) ? title.replace(/\b[A-Z0-9]{6}\b/, 'room') : title
}

/** 报一次当前页面（等 tracker 加载好；没加统计标签时什么都不做） */
export function trackPage(win: TrackerWindow = window, tries = READY_TRIES): void {
  const send = (left: number): void => {
    const umami = win.umami
    if (!umami) {
      if (left > 0) win.setTimeout(() => send(left - 1), READY_GAP_MS)
      return
    }
    const url = trackedUrl(win.location)
    const title = trackedTitle(win.document?.title ?? '', win.location)
    void umami.track((props) => ({ ...props, url, title }))
  }
  win.setTimeout(() => send(tries), DELAY_MS)
}

/** 挂到路由上：首屏一次 + 之后每次翻页（含返回键，路由的 afterEach 都会走）一次 */
export function setupPageTracking(router: { afterEach(fn: () => void): unknown }, win: TrackerWindow = window): void {
  trackPage(win)
  router.afterEach(() => trackPage(win))
}
