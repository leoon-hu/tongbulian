/**
 * 播放引擎：public/audio/<file>.mp3 预合成音频优先，缺失时才退回浏览器 TTS。
 * - 一个共享 AudioContext，首次触摸时解锁（iOS / Safari 的自动播放限制），之后序列播放不再受手势约束。
 * - 片段解码成 AudioBuffer 缓存（起播延迟 < 10ms），做 LRU。
 * - file:// 打开（fetch 不可用）时退化为 <audio> 元素池。
 * 同一时刻只播一个声音；新的 play 会打断上一个，序列播放靠 await 串起来。
 */
import type { Lang } from '@/types/models'
import { tts, stopTTS } from './tts'

const settings = { volume: 1, ttsFallback: true }
let ctx: AudioContext | null = null
let gain: GainNode | null = null
let elementMode = false
const buffers = new Map<string, AudioBuffer>()
const MAX_BUFFERS = 400
const inflight = new Map<string, Promise<AudioBuffer | null>>()
/** 确认不存在（404）的文件，避免反复请求 */
const missing = new Set<string>()
let current: { stop(): void } | null = null

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
const pool: HTMLAudioElement[] = []
let poolIndex = 0

const inBrowser = typeof window !== 'undefined'
const DEV = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV
function warn(...args: unknown[]): void {
  if (DEV) console.warn('[audio]', ...args)
}

function url(file: string): string {
  return `${import.meta.env.BASE_URL}audio/${file}.mp3`
}

function ensureContext(): AudioContext | null {
  if (!inBrowser || !('AudioContext' in window)) return null
  if (!ctx) {
    ctx = new AudioContext()
    gain = ctx.createGain()
    gain.gain.value = settings.volume
    gain.connect(ctx.destination)
  }
  return ctx
}

/** 在用户手势里调用（每次触摸都可以调，很便宜）：恢复 AudioContext、解锁 <audio> 元素池 */
export function unlockAudio(): void {
  if (!inBrowser) return
  if (location.protocol === 'file:') elementMode = true
  const ac = ensureContext()
  if (ac) {
    if ((ac.state as string) !== 'running') ac.resume().catch((e: unknown) => warn('resume 失败', e))
    // 播一帧静音，iOS 才真正解锁
    try {
      const buf = ac.createBuffer(1, 1, ac.sampleRate)
      const src = ac.createBufferSource()
      src.buffer = buf
      src.connect(ac.destination)
      src.start()
    } catch (e) {
      warn('静音帧失败', e)
    }
  }
  if (typeof Audio === 'undefined') return
  if (!pool.length) {
    for (let i = 0; i < 3; i++) {
      const el = new Audio()
      el.preload = 'auto'
      el.volume = settings.volume
      pool.push(el)
    }
  }
  for (const el of pool) {
    if (el.src) continue
    el.src = SILENT_WAV
    Promise.resolve(el.play())
      .then(() => el.pause())
      .catch(() => {})
  }
}

async function decode(ac: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // 老 Safari 只支持回调式 decodeAudioData
  return new Promise((resolve, reject) => {
    const p = ac.decodeAudioData(data, resolve, reject)
    if (p && typeof (p as Promise<AudioBuffer>).then === 'function') {
      ;(p as Promise<AudioBuffer>).then(resolve, reject)
    }
  })
}

function remember(file: string, buf: AudioBuffer): void {
  buffers.delete(file)
  buffers.set(file, buf)
  if (buffers.size > MAX_BUFFERS) {
    const oldest = buffers.keys().next().value
    if (oldest !== undefined) buffers.delete(oldest)
  }
}

/** 取（并缓存）解码后的 buffer；取不到返回 null（缺文件 / file:// / 解码失败） */
function getBuffer(file: string): Promise<AudioBuffer | null> {
  const cached = buffers.get(file)
  if (cached) {
    remember(file, cached)
    return Promise.resolve(cached)
  }
  const pending = inflight.get(file)
  if (pending) return pending
  const ac = ensureContext()
  if (!ac || elementMode || missing.has(file)) return Promise.resolve(null)
  const task = (async () => {
    try {
      const res = await fetch(url(file))
      if (!res.ok) {
        // 只记确定缺失的；网络抖动不记，否则一次断网会把文件永久拉黑
        if (res.status === 404 || res.status === 410) missing.add(file)
        return null
      }
      const buf = await decode(ac, await res.arrayBuffer())
      remember(file, buf)
      return buf
    } catch {
      // fetch 在 file:// 下会直接抛错：以后都走 <audio> 元素
      if (location.protocol === 'file:') elementMode = true
      return null
    } finally {
      inflight.delete(file)
    }
  })()
  inflight.set(file, task)
  return task
}

/** 预解码一批文件（并发 6），失败静默 */
export async function preload(files: string[]): Promise<void> {
  if (elementMode || !ensureContext()) return
  const queue = files.filter((f) => !buffers.has(f))
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const f = queue.shift()
      if (f) await getBuffer(f)
    }
  })
  await Promise.all(workers)
}

/**
 * 上下文还没 running 时 start() 永远不会 ended：先 resume，最多等 1 秒（Safari 首次解锁可能要几百毫秒），
 * 仍不行就返回 false，让调用方改走 <audio> 元素。
 */
async function contextReady(ac: AudioContext): Promise<boolean> {
  if ((ac.state as string) === 'running') return true
  ac.resume().catch((e: unknown) => warn('resume 失败', e))
  const deadline = Date.now() + 1000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 25))
    if ((ac.state as string) === 'running') return true
  }
  warn('AudioContext 一直是', ac.state)
  return false
}

/** 返回 false 表示上下文没准备好，没有播 */
async function playBuffer(buf: AudioBuffer, signal?: AbortSignal): Promise<boolean> {
  const ac = ensureContext()!
  if (signal?.aborted) return true
  if (!(await contextReady(ac))) return false
  if (signal?.aborted) return true
  return new Promise((resolve) => {
    const src = ac.createBufferSource()
    src.buffer = buf
    src.connect(gain ?? ac.destination)
    let done = false
    const finish = () => {
      if (done) return
      done = true
      signal?.removeEventListener('abort', stopNow)
      if (current?.stop === stopNow) current = null
      resolve(true)
    }
    const stopNow = () => {
      try {
        src.stop()
      } catch {
        /* 已经停了 */
      }
      finish()
    }
    src.onended = finish
    signal?.addEventListener('abort', stopNow, { once: true })
    current = { stop: stopNow }
    src.start()
    // 兜底：onended 不触发（标签页切后台等）时不要卡住序列
    setTimeout(finish, buf.duration * 1000 + 1500)
  })
}

/** <audio> 元素播放；返回 false 表示文件缺失或无法播放（需要兜底） */
function playElement(file: string, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pool.length) unlockAudio()
    const el = pool[poolIndex++ % pool.length]
    if (!el) return resolve(false)
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      el.onended = null
      el.onerror = null
      signal?.removeEventListener('abort', stopNow)
      if (current?.stop === stopNow) current = null
      resolve(ok)
    }
    const stopNow = () => {
      el.pause()
      finish(true)
    }
    el.onended = () => finish(true)
    el.onerror = () => {
      // file:// 下没有别的办法判断文件是否存在：加载失败就记为缺失
      if (elementMode && el.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) missing.add(file)
      finish(false)
    }
    signal?.addEventListener('abort', stopNow, { once: true })
    current = { stop: stopNow }
    el.src = url(file)
    el.volume = settings.volume
    Promise.resolve(el.play()).catch((err: unknown) => {
      // 还没有用户手势：当作播完，不要退回 TTS（TTS 同样会被拦）
      const notAllowed = err instanceof DOMException && err.name === 'NotAllowedError'
      finish(notAllowed)
    })
  })
}

/**
 * 播放一个片段。resolve 表示播完或被打断。
 * file 为 null 表示没有这条音频（不在 manifest 里），直接退 TTS 读 text。
 */
export async function play(file: string | null, text: string, lang: Lang, signal?: AbortSignal): Promise<void> {
  stop()
  if (signal?.aborted || !inBrowser) return
  if (file && !missing.has(file)) {
    const buf = await getBuffer(file)
    if (signal?.aborted) return
    if (buf) {
      if (await playBuffer(buf, signal)) return
      // 上下文没解锁：<audio> 元素在手势里还是能播的
      warn('改走 <audio> 元素', file)
    }
    if (!missing.has(file)) {
      const ok = await playElement(file, signal)
      if (ok || signal?.aborted) return
      warn('音频播放失败，退回 TTS', file)
    }
  } else if (!file) {
    warn('没有音频，退回 TTS', text)
  }
  if (settings.ttsFallback && text) await tts(text, lang, signal)
}

export function stop(): void {
  current?.stop()
  current = null
  stopTTS()
}
