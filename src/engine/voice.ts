/**
 * 朗读：把 speech.ts 切出来的片段序列按 manifest 找到音频文件，串起来播。
 * 独占：新的一句会打断上一句；静音开关（settings.soundEnabled）在这里生效。
 */
import type { Lang } from '@/types/models'
import manifest from '@/audio/manifest.json'
import { play, preload, stop } from './audio'
import { cancel, check, run, sleep } from './runner'
import { phraseSpeech } from './speech'

interface Manifest {
  version: number
  zh: Record<string, string>
  en: Record<string, string>
}

const CLIPS = manifest as Manifest

let enabled = true

export function setVoiceEnabled(on: boolean): void {
  enabled = on
  if (!on) hush()
}

export function isVoiceEnabled(): boolean {
  return enabled
}

/** 片段对应的音频文件名（不含 .mp3）；没有就 null（会退 TTS） */
export function clipFor(token: string, lang: Lang): string | null {
  return CLIPS[lang][token] ?? null
}

/** 顺序播一串片段；delayMs 先停一下（页面切换动画结束后再开口）。静音时什么都不做。 */
export function say(tokens: string[], lang: Lang, delayMs = 0): Promise<void> {
  if (!enabled || tokens.length === 0) return Promise.resolve()
  return run(async (signal) => {
    if (delayMs > 0) await sleep(delayMs, signal)
    for (const token of tokens) {
      await play(clipFor(token, lang), token, lang, signal)
      check(signal)
    }
  })
}

/**
 * 读几条固定词条（F13 / B39a）：页面打开、切到某个功能、弹出面板或提示时，把屏幕上的提示语读给还不太会认字的孩子听。
 * 词条要在 corpus.ts 的 FIXED_KEYS 里（有预合成的音频）；与 say 一样独占，新的一句打断上一句。
 */
export function sayKeys(keys: string[], lang: Lang, delayMs = 0): Promise<void> {
  return say(
    keys.flatMap((k) => phraseSpeech({ k }, lang)),
    lang,
    delayMs,
  )
}

/** 停掉正在播的一切 */
export function hush(): void {
  cancel()
  stop()
}

/** 预解码一批片段的音频（进练习页时把这一轮要读的都备好） */
export function warmUp(tokens: string[], lang: Lang): void {
  const files = [...new Set(tokens.map((t) => clipFor(t, lang)).filter((f): f is string => f !== null))]
  if (files.length) preload(files).catch(() => {})
}
