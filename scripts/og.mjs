/**
 * 分享图 public/og.png（1200×630，index.html 与静态页的 og:image / twitter:image）：用无头 Chrome（CDP）把一张
 * 内联 HTML 截成图。文案里的年级与知识点数取自 src/seo/site.ts 的 homeMeta()，加了年级 / 学科后重跑 `npm run og`。
 * 环境变量 CHROME 可指定浏览器路径。
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer, createServerModuleRunner } from 'vite'

const CH = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [W, H] = [1200, 630]
const out = resolve('public/og.png')

// 文案来自目录（与入口页的 SEO 文案同源）
const server = await createServer({
  configFile: 'vite.config.ts',
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
})
let meta
try {
  const runner = createServerModuleRunner(server.environments.ssr)
  meta = (await runner.import('/src/seo/site.ts')).homeMeta()
} finally {
  await server.close()
}

const fonts = pathToFileURL(resolve('public/fonts')).href
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8" />
<style>
  @font-face { font-family: 'Andika'; src: url('${fonts}/andika-400-latin.woff2') format('woff2'); }
  @font-face { font-family: 'Andika'; src: url('${fonts}/andika-400-latin-ext.woff2') format('woff2'); unicode-range: U+0100-02BA, U+1E00-1EFF; }
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
  body { background: #fdf6ec; color: #3d2c1e; font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif; display: flex; align-items: center; justify-content: space-between; padding: 0 72px; box-sizing: border-box; }
  .left { display: flex; flex-direction: column; gap: 22px; max-width: 640px; }
  .brand { display: flex; align-items: center; gap: 26px; }
  .icon { width: 128px; height: 128px; border-radius: 30px; background: #ff8a3d; color: #fff; font-size: 78px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 24px rgba(242, 105, 29, 0.28); }
  .name { font-size: 84px; font-weight: 800; line-height: 1; }
  .tagline { font-size: 34px; color: #8a7a6d; margin-top: 12px; font-weight: 600; }
  ul { list-style: none; margin: 8px 0 0; padding: 0; font-size: 28px; font-weight: 600; line-height: 1.8; white-space: nowrap; }
  li::before { content: '✓'; color: #3ecf8e; font-weight: 800; margin-right: 12px; }
  .card { width: 400px; padding: 34px 36px 30px; border-radius: 34px; background: #fff; box-shadow: 0 14px 36px rgba(61, 44, 30, 0.14); text-align: center; }
  .card ruby { font-size: 30px; font-weight: 700; line-height: 2.1; }
  .card rt { font-family: 'Andika', sans-serif; font-size: 0.55em; font-weight: 400; color: #8a7a6d; padding: 0 0.15em; }
  .expr { font-size: 74px; font-weight: 800; letter-spacing: 6px; margin: 6px 0 22px; }
  .frame { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; width: 300px; margin: 0 auto; padding: 8px; border: 4px solid #3d2c1e; border-radius: 12px; }
  .cell { height: 48px; display: flex; align-items: center; justify-content: center; }
  .dot { width: 36px; height: 36px; border-radius: 50%; background: #ff8a3d; box-shadow: inset 0 -4px 0 rgba(0,0,0,0.12); }
  .dot.b { background: #4aa3ff; }
  .extra { display: flex; justify-content: center; gap: 10px; margin-top: 18px; }
</style></head>
<body>
  <div class="left">
    <div class="brand"><div class="icon">练</div><div><div class="name">同步练</div><div class="tagline">人教版小学同步练习</div></div></div>
    <ul>
      <li>${meta.grades}数学 ${meta.kpCount} 个知识点</li>
      <li>按单元随机出题，汉字标拼音、自动朗读</li>
      <li>免费、无广告、离线可用</li>
    </ul>
  </div>
  <div class="card">
    <div><ruby>一<rt>yí</rt>共<rt>gòng</rt>有<rt>yǒu</rt>多<rt>duō</rt>少<rt>shao</rt>个<rt>ge</rt>？</ruby></div>
    <div class="expr">9 + 5 = ?</div>
    <div class="frame">${'<div class="cell"><div class="dot"></div></div>'.repeat(9)}<div class="cell"></div></div>
    <div class="extra">${'<div class="dot b"></div>'.repeat(5)}</div>
  </div>
</body></html>`

const profile = mkdtempSync(join(tmpdir(), 'og-'))
const pageFile = join(profile, 'og.html')
writeFileSync(pageFile, html)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = 9700 + Math.floor(Math.random() * 200)
const chrome = spawn(
  CH,
  [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--window-size=${W},${H}`, '--no-first-run', `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: 'ignore' },
)
async function json(u) {
  for (let i = 0; i < 40; i++) {
    try {
      return await (await fetch(u)).json()
    } catch {
      await sleep(250)
    }
  }
  throw new Error('chrome not ready')
}
try {
  const targets = await json(`http://127.0.0.1:${port}/json`)
  const page = targets.find((t) => t.type === 'page') ?? targets[0]
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d)
      pending.delete(d.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id
      pending.set(i, r)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: pathToFileURL(pageFile).href })
  await sleep(1500)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (!shot.result?.data) throw new Error('截图失败')
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
  ws.close()
  console.log(`✓ ${out}`)
} finally {
  await new Promise((r) => {
    chrome.once('exit', r)
    chrome.kill()
  })
  rmSync(profile, { recursive: true, force: true, maxRetries: 3 })
}
