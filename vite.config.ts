import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

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

/** 构建版本（B43）：git 短 hash，没有 git 就用时间戳；多设备房间要求所有人同一个版本 */
function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || String(Date.now())
  } catch {
    return String(Date.now())
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    define: { __BUILD__: JSON.stringify(buildId()) },
    // 开发时把 /ws 代理到本机的对战中继服务（npm run battle:dev，B46）
    // 开发时把 /ws 代理到本机的对战中继服务（npm run battle:dev 起在 8787；BATTLE_PORT 可改，方便另起一份测试）
    server: { proxy: { '/ws': { target: `ws://127.0.0.1:${process.env.BATTLE_PORT ?? 8787}`, ws: true } } },
    // 相对路径：构建产物可直接双击 dist/index.html 离线打开（配合 hash 路由）
    base: './',
    plugins: [
      vue(),
      siteMeta(env.SITE_URL ?? ''),
      // PWA：「添加到主屏幕」后离线可用。页面 + 字体 + 全部朗读片段（约 4 MB）首次打开时预缓存
      VitePWA({
        registerType: 'autoUpdate',
        includeManifestIcons: false,
        manifest: {
          name: '同步练 · 人教版小学同步练习',
          short_name: '同步练',
          description: '按人教版教材单元随机出题的小学同步练习，汉字标拼音、题目自动朗读',
          lang: 'zh-CN',
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
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,mp3}'],
          // 子目录里的 html 是给搜索引擎的静态页（<学科>/<年级>/…），og.png 是分享图，
          // qrcode-*.js 是大厅页的二维码库（多设备本来就要联网）：都不进离线包
          globIgnores: ['*/**/*.html', 'og.png', '**/qrcode-*.js'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: 'index.html',
          // 带目录的地址是静态页，不能被回退成入口页（hash 路由的应用本身只有根地址一个导航目标）
          navigateFallbackDenylist: [/^\/[^/]+\//],
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
