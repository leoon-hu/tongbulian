// 收集朗读语料 → src/audio/corpus.json（供 scripts/build-audio.py 合成音频）。
// 用 Vite 的模块加载器直接跑项目里的 TS（含 @ 别名与内容包注册），不另配一套构建。
import { writeFileSync } from 'node:fs'
import { createServer, createServerModuleRunner } from 'vite'

const server = await createServer({
  configFile: 'vite.config.ts',
  logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
})
try {
  const runner = createServerModuleRunner(server.environments.ssr)
  const { collectCorpus } = await runner.import('/src/audio/corpus.ts')
  const corpus = collectCorpus()
  writeFileSync('src/audio/corpus.json', JSON.stringify(corpus, null, 2) + '\n')
  console.log(`语料：zh ${corpus.zh.length} 条，en ${corpus.en.length} 条 → src/audio/corpus.json`)
} finally {
  await server.close()
}
