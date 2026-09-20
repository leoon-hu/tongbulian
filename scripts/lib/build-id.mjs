// 对战的「版本」（需求 B43）：只看会影响出题 / 判分的源码——内容包、出题引擎、比赛状态机、题目流、协议与类型。
// 多设备房间里所有人的题要能由同一个 seed 复现，所以这些文件一变版本就变；只改界面的发布不算新版本，
// 旧页面照样能进房间。网站与中继服务的构建都用它（vite.config.ts / vite.server.config.ts），两边一致。
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** 参与计算的文件 / 目录（相对项目根；目录下递归，跳过 __tests__ 与 *.test.ts） */
export const COMPAT_SOURCES = [
  'src/content',
  'src/engine/session.ts',
  'src/engine/rng.ts',
  'src/engine/question.ts',
  'src/engine/answer.ts',
  'src/engine/catalog.ts',
  'src/types/models.ts',
  'src/battle/match.ts',
  'src/battle/stream.ts',
  'src/battle/protocol.ts',
]

export function compatId(root = process.cwd()) {
  const files = []
  const walk = (p) => {
    const st = statSync(p)
    if (st.isDirectory()) {
      for (const name of readdirSync(p).sort()) {
        if (name === '__tests__') continue
        walk(join(p, name))
      }
    } else if (/\.(ts|json)$/.test(p) && !/\.test\.ts$/.test(p)) files.push(p)
  }
  for (const rel of COMPAT_SOURCES) {
    try {
      walk(join(root, rel))
    } catch {
      /* 没有这个文件就跳过 */
    }
  }
  const h = createHash('sha1')
  for (const f of files.sort()) {
    h.update(f.slice(root.length).replaceAll('\\', '/'))
    h.update('\0')
    h.update(readFileSync(f))
    h.update('\0')
  }
  return h.digest('hex').slice(0, 12)
}
