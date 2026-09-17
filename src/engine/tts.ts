/**
 * 浏览器 TTS，只做音频片段缺失时的兜底（正常情况下所有声音都来自 public/audio/ 的预合成音频）。
 * 按语言自动选一个语音，不提供给用户挑选。
 */
import type { Lang } from '@/types/models'

const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window
const PREFERRED: Record<Lang, string[]> = {
  zh: ['Tingting', '婷婷', 'Google 普通话', 'Huihui', 'Xiaoxiao', 'Yaoyao', 'Lili'],
  en: ['Samantha', 'Google US English', 'Zira', 'Aria', 'Jenny'],
}
const LANG_TAG: Record<Lang, string> = { zh: 'zh-CN', en: 'en-US' }
let currentUtterance: SpeechSynthesisUtterance | null = null
let pendingSpeak: ReturnType<typeof setTimeout> | null = null

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!hasTTS) return undefined
  const want = lang === 'zh' ? /^(zh|cmn)([-_]|$)/i : /^en([-_]|$)/i
  const voices = speechSynthesis.getVoices().filter((v) => want.test(v.lang))
  const exact = voices.filter((v) => new RegExp(LANG_TAG[lang].replace('-', '[-_]'), 'i').test(v.lang))
  const pool = exact.length ? exact : voices
  for (const name of PREFERRED[lang]) {
    const hit = pool.find((v) => v.name.includes(name))
    if (hit) return hit
  }
  return pool[0]
}

/** 读一段文字；signal 中止时停止。结束、出错、超时都会 resolve。 */
export function tts(text: string, lang: Lang, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (!hasTTS || !text || signal?.aborted) return resolve()
    stopTTS()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = LANG_TAG[lang]
    u.rate = 0.9
    const voice = pickVoice(lang)
    if (voice) u.voice = voice
    let done = false
    const finish = () => {
      if (done) return
      done = true
      signal?.removeEventListener('abort', onAbort)
      if (currentUtterance === u) currentUtterance = null
      resolve()
    }
    const onAbort = () => {
      speechSynthesis.cancel()
      finish()
    }
    u.onend = finish
    u.onerror = finish
    signal?.addEventListener('abort', onAbort, { once: true })
    // 挂到模块变量防止被 GC 后 onend 不触发（Chrome 已知问题）
    currentUtterance = u
    // cancel() 后立刻 speak() 在部分浏览器会吞掉新语音，稍等一拍
    pendingSpeak = setTimeout(() => {
      pendingSpeak = null
      if (done) return
      speechSynthesis.speak(u)
    }, 40)
    // 兜底：按字数估算，避免 onend 不触发时序列卡死
    setTimeout(finish, 600 + text.length * 250)
  })
}

export function stopTTS(): void {
  if (!hasTTS) return
  if (pendingSpeak) {
    clearTimeout(pendingSpeak)
    pendingSpeak = null
  }
  speechSynthesis.cancel()
  currentUtterance = null
}
