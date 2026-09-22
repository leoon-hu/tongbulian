// 对战中继服务（需求 B47）的构建：把 server/index.ts 连同 ws 一起打成一个文件 dist-server/battle.mjs，
// 服务器上不用 npm install，`node battle.mjs` 就能跑。协议与比赛状态机从 src/battle/ 共用（@ 别名）。
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { compatId } from './scripts/lib/build-id.mjs'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 与网站同一个版本号（B43）：服务器据此拒绝版本旧了的页面，让它自己更新
  define: { __BUILD__: JSON.stringify(compatId()) },
  // 服务不用 public/ 里的东西：不关的话每次 build:server 都把 70 MB 音频复制进 dist-server/ 再删
  publicDir: false,
  build: {
    ssr: 'server/index.ts',
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node20',
    minify: false,
    sourcemap: false,
    rollupOptions: {
      output: { entryFileNames: 'battle.mjs', format: 'es' },
    },
  },
  ssr: { noExternal: true },
})
