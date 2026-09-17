import { existsSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import manifest from '../manifest.json'
import corpusJson from '../corpus.json'
import { collectCorpus } from '../corpus'

const AUDIO_DIR = new URL('../../../public/audio/', import.meta.url)
const table = manifest as { version: number; zh: Record<string, string>; en: Record<string, string> }

describe('朗读音频包', () => {
  const corpus = collectCorpus()

  it('语料文件与代码一致（改了题目模板 / 生成器后要重跑 npm run audio）', () => {
    expect(corpusJson).toEqual(corpus)
  })

  for (const lang of ['zh', 'en'] as const) {
    it(`${lang}：每个可能读到的片段都有音频文件`, () => {
      const missing = corpus[lang].filter((t) => !table[lang][t] || !existsSync(new URL(`${table[lang][t]}.mp3`, AUDIO_DIR)))
      expect(missing, `缺音频：${missing.slice(0, 10).join('、')}${missing.length > 10 ? '…' : ''}`).toEqual([])
    })
  }

  it('manifest 里没有指向不存在文件的条目，目录里也没有多余的 mp3', () => {
    const files = new Set(readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)))
    const listed = new Set([...Object.values(table.zh), ...Object.values(table.en)])
    for (const f of listed) expect(files.has(f), `${f}.mp3 不存在`).toBe(true)
    for (const f of files) expect(listed.has(f), `${f}.mp3 没在 manifest 里`).toBe(true)
  })
})
