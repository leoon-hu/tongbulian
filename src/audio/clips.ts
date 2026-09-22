/**
 * 朗读片段 → 音频文件名（N8）。文件名是 `<语言>-<sha1(文本)[:10]>`（scripts/build-audio.py 定的），所以页面不需要
 * 「文本 → 文件名」的全表（src/audio/manifest.json，265 KB）：构建时 vite.config.ts 的 audioClips 插件把它压成
 * 每种语言一串排好序的 10 位哈希（virtual:audio-clips，约 65 KB、只在朗读模块里），这里算出哈希查一下有没有。
 * manifest.json 仍是生成脚本与 manifest 测试的依据，只是不再进页面。
 */
import type { Lang } from '@/types/models'
import { sha1Hex } from '@/engine/sha1'
import { en, zh } from 'virtual:audio-clips'

export const HASH_LEN = 10
const PACKED: Record<Lang, string> = { zh, en }
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
  const h = sha1Hex(text).slice(0, HASH_LEN)
  return setOf(lang).has(h) ? `${lang}-${h}` : null
}
