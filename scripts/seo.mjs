// SEO 产物（构建 / 起 dev 之前跑，package.json 的 prebuild / predev；也可单独 npm run seo）：
//   public/<学科>/<年级>/index.html、<知识点 id>.html   每个上线课程与知识点一张不用 JS 的静态页（含示例题）
//   public/robots.txt、public/sitemap.xml                sitemap 只在 .env 配了 SITE_URL 时生成（要绝对地址）
//   index.html 里 <!-- seo:head --> / <!-- seo:body --> 两段   标题、描述、JSON-LD、应用挂载前的静态简介
// 页面文案都在 src/seo/site.ts；这里用 Vite 的模块加载器跑项目里的 TS（含 @ 别名与内容包注册），不另配一套构建。
// public/ 下的产物不进仓库（含站点地址，随环境变），index.html 的两段进仓库、有测试保证与目录一致。
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createServer, createServerModuleRunner, loadEnv } from 'vite'

const siteUrl = (loadEnv('production', process.cwd(), '').SITE_URL ?? '').replace(/\/+$/, '')
const publicDir = 'public'

const server = await createServer({
  configFile: 'vite.config.ts',
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
})
try {
  const runner = createServerModuleRunner(server.environments.ssr)
  const seo = await runner.import('/src/seo/site.ts')

  const index = readFileSync('index.html', 'utf8')
  const next = seo.applyHome(index)
  if (next !== index) writeFileSync('index.html', next)

  for (const dir of seo.STATIC_DIRS) rmSync(join(publicDir, dir), { recursive: true, force: true })
  const pages = seo.staticPages(siteUrl)
  for (const p of pages) {
    const file = join(publicDir, p.file)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, p.html)
  }
  writeFileSync(join(publicDir, 'robots.txt'), seo.robotsTxt(siteUrl))
  if (siteUrl) writeFileSync(join(publicDir, 'sitemap.xml'), seo.sitemapXml(siteUrl))
  else if (existsSync(join(publicDir, 'sitemap.xml'))) rmSync(join(publicDir, 'sitemap.xml'))

  console.log(
    `SEO：静态页 ${pages.length} 张、robots.txt${siteUrl ? '、sitemap.xml' : ''} → public/；index.html ${next !== index ? '已更新' : '未变'}` +
      (siteUrl ? `；站点 ${siteUrl}` : '（没设 SITE_URL：不生成 sitemap 与绝对地址）'),
  )
} finally {
  await server.close()
}
