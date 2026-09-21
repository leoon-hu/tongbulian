/**
 * 访问统计（需求 N7，2026-09-21 四个站统一）：自建的 Umami（开源、无 cookie、不存 IP），页面里只多一行 <script defer>。
 * 脚本地址与站点 id 来自构建期环境变量 VITE_UMAMI_SCRIPT / VITE_UMAMI_WEBSITE_ID（.env，不进仓库）：两项都有才加标签，
 * 别人自己部署时不配就什么都不加。标签由 vite.config.ts 在正式构建时写进 index.html、seo/site.ts 写进静态 SEO 页；
 * dev 不加。data-domains 限定只在正式域名（SITE_URL 的主机名）下上报：本机 preview、双击打开 dist/index.html 都不算。
 * 上报的是页面地址（含 hash 路由）、标题、来源、屏幕尺寸、语言，学习记录不上报。
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

/** 标签的属性（vite 的 transformIndexHtml 直接用；静态页用 analyticsTag 拼成字符串） */
export function analyticsAttrs(cfg: AnalyticsConfig): Record<string, string | true> {
  return {
    defer: true,
    src: cfg.script,
    'data-website-id': cfg.websiteId,
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
  location: { href: string }
  addEventListener: Window['addEventListener']
  removeEventListener: Window['removeEventListener']
  setTimeout: Window['setTimeout']
}

/** tracker 自己对 pushState 也是等 300 毫秒（让标题先换），这里对齐 */
const DELAY_MS = 300

/**
 * tracker 只钩 pushState / replaceState，浏览器 / 手机系统的「返回」是 popstate，它不记；这里补上：
 * 返回后把当前地址报一次页面浏览（tracker 记着的地址还停在上一个，所以显式传 url）。返回的函数用于卸载监听。
 */
export function trackBackNavigation(win: TrackerWindow = window): () => void {
  const onPop = () => {
    win.setTimeout(() => {
      void win.umami?.track((props) => ({ ...props, url: win.location.href }))
    }, DELAY_MS)
  }
  win.addEventListener('popstate', onPop)
  return () => win.removeEventListener('popstate', onPop)
}
