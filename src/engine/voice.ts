/**
 * 朗读：把 speech.ts 切出来的片段序列按 manifest 找到音频文件，串起来播。
 * 独占：同一时刻只播一句；静音开关（settings.soundEnabled）在这里生效。
 *
 * 播法（B37）：
 * - cut（默认）：新的一句打断正在播的一切（练习页、倒数、页面切换的提示都是这样）；
 * - hold：这一句必须播完（对战里点 🔊 读题）——自己再点、另一方点、弹出提示都不能打断，
 *   要读的排在后面，播完接着读；只有 cut 与 hush（离开页面 / 静音）能停它；
 * - wait：正在播一句必须播完的（或队伍里还有人等着）就排到后面，否则与 cut 一样；
 * - skip：正在播一句必须播完的就不读了（屏幕上有字，一会儿再读就过时了），否则与 cut 一样。
 * 排队时同一个 key 只留最新的一条（一行的读题一个 key、一种提示一个 key），forget(key) 撤回还没轮到的那条。
 */
import type { Lang } from '@/types/models'
import { clipFile } from '@/audio/clips'
import { watch } from 'vue'
import { playSequence, preload, stop, type SeqItem } from './audio'
import { soundOn } from './sound'
import { cancel, check, run, sleep } from './runner'
import { joinSpeech, PAUSE, phraseSpeech, piecesOf } from './speech'

export type SayMode = 'cut' | 'hold' | 'wait' | 'skip'

export interface SayOptions {
  mode?: SayMode
  /** 排队用：同一个 key 只留最新的一条；不传就按 mode 分 */
  key?: string
}

interface Item {
  key: string
  /** 语言 + 片段序列，判断「正在播的就是这一句」 */
  sig: string
  tokens: string[]
  lang: Lang
  delayMs: number
  hold: boolean
  done: Promise<void>
  finish: () => void
}

// 开关真值在 engine/sound.ts（settings 只改它）；关掉就闭嘴
watch(soundOn, (on) => {
  if (!on) hush()
})
/** 正在播的那句（含它的 delay 期间） */
let current: Item | null = null
/** 等着播的，按先来后到 */
const queue: Item[] = []

export function setVoiceEnabled(on: boolean): void {
  soundOn.value = on
  if (!on) hush()
}

export function isVoiceEnabled(): boolean {
  return soundOn.value
}

/** 片段对应的音频文件名（不含 .mp3）；没有就 null（会退 TTS） */
export function clipFor(token: string, lang: Lang): string | null {
  return clipFile(token, lang)
}

/**
 * 片段 → 要播的条目：停顿标记是一个停顿；有音频的直接播；并成一条的短语没有音频（语料里没枚举到这个组合）
 * 就拆回小片段（「有 / 14 / 个」「比 / 小猪」）各播各的，小片段也不全就整条退 TTS（读一整句比逐段 TTS 自然）。
 */
export function sequenceFor(tokens: string[], lang: Lang): SeqItem[] {
  const out: SeqItem[] = []
  for (const token of tokens) {
    if (token === PAUSE) {
      out.push({ pause: true })
      continue
    }
    const file = clipFor(token, lang)
    if (file === null) {
      const parts = piecesOf(token, lang)
      if (parts.length > 1 && parts.every((p) => clipFor(p, lang) !== null)) {
        for (const p of parts) out.push({ file: clipFor(p, lang), text: p })
        continue
      }
    }
    out.push({ file, text: token })
  }
  return out
}

function makeItem(tokens: string[], lang: Lang, delayMs: number, mode: SayMode, key: string | undefined): Item {
  let finish: () => void = () => {}
  const done = new Promise<void>((resolve) => {
    finish = resolve
  })
  return { key: key ?? mode, sig: `${lang}\u0001${tokens.join('\u0001')}`, tokens, lang, delayMs, hold: mode === 'hold', done, finish }
}

/** 正在播的那句必须播完、或者已经有人排队：新来的也排队 */
function serialized(): boolean {
  return current !== null && (current.hold || queue.length > 0)
}

function clearQueue(): void {
  for (const it of queue.splice(0)) it.finish()
}

function start(item: Item): Promise<void> {
  current = item
  // run() 会中止上一句
  run(async (signal) => {
    if (item.delayMs > 0) await sleep(item.delayMs, signal)
    await playSequence(sequenceFor(item.tokens, item.lang), item.lang, signal)
    check(signal)
  }).then(() => {
    item.finish()
    // 被 cut / hush 掉的：后面的事由打断者管
    if (current !== item) return
    current = null
    const next = queue.shift()
    if (next) start(next)
  })
  return item.done
}

/** 顺序播一串片段；delayMs 先停一下（页面切换动画结束后再开口）。静音时什么都不做。返回的 Promise 在播完（或被撤掉）时兑现。 */
export function say(tokens: string[], lang: Lang, delayMs = 0, opts: SayOptions = {}): Promise<void> {
  if (!soundOn.value || tokens.length === 0) return Promise.resolve()
  const mode = opts.mode ?? 'cut'
  const item = makeItem(tokens, lang, delayMs, mode, opts.key)
  if (mode !== 'cut' && current) {
    // 正在播的就是这一句（点 🔊 时它正在自动读）：不重头来，只把它升级成必须播完
    if (mode === 'hold' && current.key === item.key && current.sig === item.sig) {
      current.hold = true
      return current.done
    }
    if (serialized()) {
      if (mode === 'skip') return Promise.resolve()
      const i = queue.findIndex((q) => q.key === item.key)
      if (i >= 0) {
        queue[i]!.finish()
        queue[i] = item
      } else {
        queue.push(item)
      }
      return item.done
    }
  }
  clearQueue()
  return start(item)
}

/**
 * 读几条固定词条（F13 / B39a）：页面打开、切到某个功能、弹出面板或提示时，把屏幕上的提示语读给还不太会认字的孩子听。
 * 词条要在 corpus.ts 的 FIXED_KEYS 里（有预合成的音频）；几条之间停顿一下；播法与 say 一样。
 */
export function sayKeys(keys: string[], lang: Lang, delayMs = 0, opts: SayOptions = {}): Promise<void> {
  return say(
    joinSpeech(keys.map((k) => phraseSpeech({ k }, lang))),
    lang,
    delayMs,
    opts,
  )
}

/** 撤回还没轮到的那句（提示已经消失了就不用读了）；正在播的不动 */
export function forget(key: string): void {
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i]!.key === key) queue.splice(i, 1)[0]!.finish()
  }
}

/** 停掉正在播的一切，连排队的一起撤掉 */
export function hush(): void {
  cancel()
  stop()
  current = null
  clearQueue()
}

/** 预解码一批片段的音频（进练习页时把这一轮要读的都备好） */
export function warmUp(tokens: string[], lang: Lang): void {
  const files = [...new Set(sequenceFor(tokens, lang).map((it) => it.file ?? null).filter((f): f is string => f !== null))]
  if (files.length) preload(files).catch(() => {})
}
