/**
 * 朗读片段 → 音频文件名（N8）。文件名是 `<语言>-<sha1(文本)[:10]>`（scripts/build-audio.py 定的），所以页面不需要
 * 「文本 → 文件名」的全表（src/audio/manifest.json，265 KB）：构建时 vite.config.ts 的 audioClips 插件把它压成
 * 每种语言一串排好序的 10 位哈希（virtual:audio-clips，约 65 KB、只在朗读模块里），这里算出哈希查一下有没有。
 * manifest.json 仍是生成脚本与 manifest 测试的依据，只是不再进页面。
 * 例外：合成时换过读法的片段（多音字，见 scripts/build-audio.py 的 SAY_AS）文件名是换过的文字的哈希——内容变了地址
 * 跟着变，离线缓存 / CDN 里读错的旧文件不会再被用到；这几条走别名表。
 */
import type { Lang } from '@/types/models'
import { sha1Hex } from '@/engine/sha1'
import { en, enAlias, zh, zhAlias } from 'virtual:audio-clips'

export const HASH_LEN = 10
const PACKED: Record<Lang, string> = { zh, en }
const ALIAS: Record<Lang, Record<string, string>> = { zh: zhAlias, en: enAlias }
const sets: Partial<Record<Lang, Set<string>>> = {}

function setOf(lang: Lang): Set<string> {
  let s = sets[lang]
  if (!s) {
    const packed = PACKED[lang]
    s = new Set<string>()
    for (let i = 0; i + HASH_LEN <= packed.length; i += HASH_LEN) s.add(packed.slice(i, i + HASH_LEN))
    sets[lang] = s
  }
  return s
}

/** 这条片段的音频文件名（不带 .mp3）；没有这条音频就是 null */
export function clipFile(text: string, lang: Lang): string | null {
  const t = sha1Hex(text).slice(0, HASH_LEN)
  const h = ALIAS[lang][t] ?? t
  return setOf(lang).has(h) ? `${lang}-${h}` : null
}
