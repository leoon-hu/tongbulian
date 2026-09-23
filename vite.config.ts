import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { compatId } from './scripts/lib/build-id.mjs'
import { analyticsAttrs, analyticsConfig } from './src/engine/analytics'

/**
 * index.html 里需要绝对地址的标签（canonical / og:url / og:image / JSON-LD 的 url）：地址来自本机 .env 的 SITE_URL
 * （不进仓库），构建时替换 __SITE_URL__ 占位；没有配置时把含占位的行整行去掉（JSON-LD 一行一个键，删一行仍合法）。
 * 静态 SEO 页、robots.txt、sitemap.xml 由 scripts/seo.mjs 在构建前写进 public/（package.json 的 prebuild / predev）。
 */
function siteMeta(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '')
  return {
    name: 'site-meta',
    transformIndexHtml(html) {
      if (!base) return html.split('\n').filter((line) => !line.includes('__SITE_URL__')).join('\n')
      return html.replaceAll('__SITE_URL__', base)
    },
    // dev 服务器对目录地址（/math/g1/）会回退成入口页，这里补上 index.html，与 nginx / vite preview 一致
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (path.endsWith('/') && path !== '/' && existsSync(join(server.config.publicDir, path, 'index.html'))) {
          req.url = `${path}index.html${req.url!.slice(path.length)}`
        }
        next()
      })
    },
  }
}

/**
 * 访问统计标签（需求 N7，engine/analytics.ts）：.env 里 VITE_UMAMI_SCRIPT / VITE_UMAMI_WEBSITE_ID 都有时，正式构建把
 * 一行 <script defer> 写进 index.html 的 <head>；dev 不加，没配置什么都不加。静态 SEO 页的同一行由 scripts/seo.mjs 写。
 */
function analyticsTag(env: Record<string, string>): Plugin {
  const cfg = analyticsConfig(env)
  return {
    name: 'analytics-tag',
    apply: 'build',
    // 入口页的翻页由应用自己上报（engine/analytics.ts 的 setupPageTracking：房间号不进统计库），关掉 tracker 的自动记录
    transformIndexHtml: () => (cfg ? [{ tag: 'script', attrs: analyticsAttrs(cfg, false), injectTo: 'head' }] : []),
  }
}

/**
 * 朗读音频清单的紧凑版（N8）：src/audio/manifest.json 是「文本 → 文件名」全表（265 KB），页面里其实只需要知道
 * 「有哪些文件」——文件名是文本的 sha1 前 10 位（src/audio/clips.ts 在页面里算），所以这里把它压成每种语言一串
 * 排好序的哈希（约 65 KB），以虚拟模块 virtual:audio-clips 提供；dev / 构建 / 测试 / 脚本都走这一份
 */
function audioClips(): Plugin {
  const VID = 'virtual:audio-clips'
  const RID = `\0${VID}`
  const file = fileURLToPath(new URL('./src/audio/manifest.json', import.meta.url))
  return {
    name: 'audio-clips',
    resolveId: (id) => (id === VID ? RID : undefined),
    load(id) {
      if (id !== RID) return undefined
      this.addWatchFile(file)
      const m = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, string>>
      const pack = (table: Record<string, string> | undefined): string =>
        Object.values(table ?? {})
          .map((f) => f.slice(f.indexOf('-') + 1))
          .sort()
          .join('')
      return `export const zh = ${JSON.stringify(pack(m.zh))}\nexport const en = ${JSON.stringify(pack(m.en))}\n`
    },
  }
}

/**
 * 当前版本（F1「版本与更新」，engine/version.ts）：构建时刻的北京时间「2026-09-23 14:05」（与构建机器的时区无关）。
 * 页面里是 __APP_VERSION__；同一份写进 dist/version.json 给首页页脚的「检查更新」比对（不进离线包，见 globIgnores），
 * dev 服务器也回同一份。
 */
function buildVersion(d = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`
}
function versionFile(version: string): Plugin {
  const body = `${JSON.stringify({ version })}\n`
  return {
    name: 'version-file',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(body)
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: body })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const version = buildVersion()
  return {
    // 对战版本（B43）：出题相关源码的哈希（scripts/lib/build-id.mjs），中继服务用同一个；只改界面不算新版本
    // __APP_VERSION__：当前版本（构建时刻），首页页脚的版本卡片显示、「检查更新」比对（与 __BUILD__ 不同：那个只随出题代码变）
    define: { __BUILD__: JSON.stringify(compatId()), __APP_VERSION__: JSON.stringify(version) },
    // 开发时把 /ws 代理到本机的对战中继服务（npm run battle:dev，B46）
    // 开发时把 /ws 代理到本机的对战中继服务（npm run battle:dev 起在 8787；BATTLE_PORT 可改，方便另起一份测试）
    server: { proxy: { '/ws': { target: `ws://127.0.0.1:${process.env.BATTLE_PORT ?? 8787}`, ws: true } } },
    // 相对路径：构建产物放在任何路径下都能开（配合 hash 路由；file:// 直接双击不行——浏览器不许 file:// 加载模块脚本）
    base: './',
    plugins: [
      vue(),
      audioClips(),
      siteMeta(env.SITE_URL ?? ''),
      analyticsTag(env),
      versionFile(version),
      // PWA：「添加到主屏幕」后离线可用。预缓存只有页面外壳（代码 / 字体 / 图标，几 MB，几秒装好）——新版本几秒就能换上；
      // 朗读片段（中文 3400 条 29 MB、英文 3200 条 28 MB）不进预缓存：由页面在后台分批下进运行时缓存 audio
      // （engine/offline.ts），SW 离线时从它取。以前 mp3 都在预缓存里，新版本要下完几十 MB 才能装好，老手机刷新多少次
      // 都是旧版（N8 ⑦，2026-09-22 用户报的）
      VitePWA({
        registerType: 'autoUpdate',
        // 注册脚本用 defer（默认是同步的 <script src>，会挡住 HTML 解析一个来回）
        injectRegister: 'script-defer',
        includeManifestIcons: false,
        manifest: {
          id: './',
          name: '同步练-对战版 · 课本知识点对战学习',
          short_name: '同步练-对战版',
          description: '把人教版课本的知识点测验变成游戏积分，谁先答对 8 题谁赢；也能一个人练，汉字标拼音、题目自动朗读',
          lang: 'zh-CN',
          categories: ['education', 'kids', 'games'],
          start_url: './',
          scope: './',
          display: 'standalone',
          orientation: 'any',
          background_color: '#fdf6ec',
          theme_color: '#ff8a3d',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          // Chrome 有截图 + 描述才给完整的安装对话框（不然只有一条迷你信息栏）；两张图在 public/screenshots/，不进离线包
          screenshots: [
            { src: 'screenshots/battle-ipad.png', sizes: '2048x1536', type: 'image/png', form_factor: 'wide', label: '两人一台平板对战' },
            { src: 'screenshots/home.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow', label: '首页' },
          ],
        },
        workbox: {
          // 新 SW 装好马上接管（skipWaiting）、并接管已经开着的页面（clientsClaim）：engine/sw.ts 的「接管后自动重新载入」
          // （B43 / N8 ⑦）靠它们。autoUpdate 本来会自动加，但只在 injectRegister 是 auto 时——上面改成 script-defer 后
          // 插件就不加了（2026-09-22 到 09-23 线上的 sw.js 里没有它们：新版本装好一直等着、所有页面关掉才换上；
          // 首次安装后页面要再打开一次才离线可用），所以这里显式写上，engine/__tests__/sw.test.ts 查着
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2,json}'],
          // 子目录里的 html 是给搜索引擎的静态页（<学科>/<年级>/…），og.png 是分享图、screenshots/ 是安装对话框的截图，
          // qrcode-*.js 是大厅页的二维码库（多设备本来就要联网），version.json 是「检查更新」要现取的：都不进离线包
          globIgnores: ['*/**/*.html', '404.html', 'og.png', 'screenshots/**', '**/qrcode-*.js', 'version.json'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: 'index.html',
          // 只有入口页那一个地址走回退：带目录的是静态页，带扩展名的是文件（sitemap.xml / robots.txt / og.png / 站长验证文件），
          // 不带尾斜杠的目录名（/help、/math/g1）让服务器 301 到带斜杠的——都不能被换成入口页
          navigateFallbackDenylist: [/^\/[^/]+\//, /\.[a-z0-9]+$/i, /^\/[^/.]+$/],
          runtimeCaching: [
            {
              // 朗读片段：缓存里有就用缓存，没有才取网络并存下（页面后台下载的也存在同一个缓存里）；
              // 文件名是内容哈希，旧片段由 engine/offline.ts 下完一轮后清掉，这里不做过期
              urlPattern: /\/audio\/(zh|en)-[a-z0-9]+\.mp3$/,
              handler: 'CacheFirst',
              options: { cacheName: 'audio', cacheableResponse: { statuses: [0, 200] } },
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        // 二维码库只有大厅页用，固定切成 qrcode-*.js，方便离线包排除（Vite 8 / rolldown 只认函数形式）
        output: {
          manualChunks: (id: string) =>
            id.includes('/node_modules/qrcode/') || id.includes('/node_modules/dijkstrajs/') || id.includes('/node_modules/encode-utf8/') ? 'qrcode' : undefined,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/__tests__/**/*.test.ts', 'server/**/__tests__/**/*.test.ts'],
    },
  }
})
