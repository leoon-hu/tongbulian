/**
 * 播放引擎：public/audio/<file>.mp3 预合成音频优先，缺失时才退回浏览器 TTS。
 * - 一个共享 AudioContext，首次触摸时解锁（iOS / Safari 的自动播放限制），之后序列播放不再受手势约束。
 * - 片段解码成 AudioBuffer 缓存（起播延迟 < 10ms），做 LRU。
 * - file:// 打开（fetch 不可用）时退化为 <audio> 元素池。
 * - 一句话 = 一串片段：playSequence 先把要用的片段都解码好，再按 AudioContext 的时钟一次排到时间轴上
 *   （片段之间只留 JOIN_GAP_S，停顿标记留 PAUSE_S），不再一条播完等 onended 再起下一条——那样每个接缝
 *   都是「文件里自带的静音 + 事件延迟」的一百多毫秒，一句 13 段的题听起来一顿一顿的（F14）。
 * 同一时刻只播一个声音；新的 play / playSequence 会打断上一个。
 */
import type { Lang } from '@/types/models'
import { tts, stopTTS } from './tts'

const settings = { volume: 1, ttsFallback: true }
let ctx: AudioContext | null = null
let gain: GainNode | null = null
let elementMode = false
const buffers = new Map<string, AudioBuffer>()
const MAX_BUFFERS = 400
/** 解码后的 PCM 总量上限（字节）：400 条并句后的片段解码开约 100 MB，按体积再卡一道，平板上不至于常驻这么多（N8） */
const MAX_BUFFER_BYTES = 40 * 1024 * 1024
let bufferBytes = 0
const inflight = new Map<string, Promise<AudioBuffer | null>>()
/** 正在预解码队列里的文件（几批 preload 撞在一起不重复排） */
const queued = new Set<string>()
/** 上下文解锁失败后一小段时间内不再等：不然退回逐条播的那一句里每条都要空等 1 秒 */
let ctxBlockedUntil = 0
/** 确认不存在（404）的文件，避免反复请求 */
const missing = new Set<string>()
let current: { stop(): void } | null = null

const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
const pool: HTMLAudioElement[] = []
let poolIndex = 0

const inBrowser = typeof window !== 'undefined'

/** 序列里的一项：一个片段（file 为 null = 没音频，退 TTS 读 text）或一个停顿 */
export interface SeqItem {
  pause?: boolean
  file?: string | null
  text?: string
}
/** 片段之间留多久（秒）：一个词接下一个词 */
export const JOIN_GAP_S = 0.03
/** 停顿标记（逗号、句号）停多久（秒） */
export const PAUSE_S = 0.28
/** 每条 mp3 自带的首尾数字静音（build-audio.py 的 LEAD_SILENCE_MS + TAIL_SILENCE_MS），排时间轴时让下一条盖住它 */
export const CLIP_PAD_S = 0.1
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

/** 共享的 AudioContext（对战音效在上面合成短音；没有 WebAudio 的环境返回 null） */
export function audioContext(): AudioContext | null {
  return ensureContext()
}

/** 压低时的音量倍数（对战语音里别人说话时朗读让一让，B57） */
export const DUCK_LEVEL = 0.45
let ducked = false
function applyGain(): void {
  if (!ctx || !gain) return
  const v = settings.volume * (ducked ? DUCK_LEVEL : 1)
  if (typeof gain.gain.setTargetAtTime === 'function') gain.gain.setTargetAtTime(v, ctx.currentTime, 0.05)
  else gain.gain.value = v
}
/** 别人说话时压低朗读（只压走共享增益的朗读片段，对战音效不走它）；on = false 恢复 */
export function duckAudio(on: boolean): void {
  if (ducked === on) return
  ducked = on
  applyGain()
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

const bytesOf = (buf: AudioBuffer): number => buf.length * buf.numberOfChannels * 4

function remember(file: string, buf: AudioBuffer): void {
  if (buffers.has(file)) buffers.delete(file)
  else bufferBytes += bytesOf(buf)
  buffers.set(file, buf)
  while (buffers.size > MAX_BUFFERS || (bufferBytes > MAX_BUFFER_BYTES && buffers.size > 1)) {
    const oldest = buffers.keys().next().value
    if (oldest === undefined) break
    bufferBytes -= bytesOf(buffers.get(oldest)!)
    buffers.delete(oldest)
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
  const queue = files.filter((f) => !buffers.has(f) && !queued.has(f))
  for (const f of queue) queued.add(f)
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const f = queue.shift()
      if (!f) continue
      try {
        await getBuffer(f)
      } finally {
        queued.delete(f)
      }
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
  if (Date.now() < ctxBlockedUntil) return false
  ac.resume().catch((e: unknown) => warn('resume 失败', e))
  const deadline = Date.now() + 1000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 25))
    if ((ac.state as string) === 'running') return true
  }
  warn('AudioContext 一直是', ac.state)
  ctxBlockedUntil = Date.now() + 1000
  return false
}

/** 播放速率（机器人说话 1.2，B61）：只在不是 1 时设，测试的假音源没有 playbackRate */
function setRate(src: AudioBufferSourceNode, rate: number): void {
  if (rate !== 1 && src.playbackRate) src.playbackRate.value = rate
}

/** 返回 false 表示上下文没准备好，没有播 */
async function playBuffer(buf: AudioBuffer, signal?: AbortSignal, rate = 1): Promise<boolean> {
  const ac = ensureContext()!
  if (signal?.aborted) return true
  if (!(await contextReady(ac))) return false
  if (signal?.aborted) return true
  return new Promise((resolve) => {
    const src = ac.createBufferSource()
    src.buffer = buf
    setRate(src, rate)
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
    setTimeout(finish, (buf.duration / rate) * 1000 + 1500)
  })
}

/** <audio> 元素播放；返回 false 表示文件缺失或无法播放（需要兜底） */
function playElement(file: string, signal?: AbortSignal, rate = 1): Promise<boolean> {
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
    try {
      el.playbackRate = rate
    } catch {
      /* 不支持就原速 */
    }
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
export async function play(file: string | null, text: string, lang: Lang, signal?: AbortSignal, rate = 1): Promise<void> {
  stop()
  if (signal?.aborted || !inBrowser) return
  if (file && !missing.has(file)) {
    const buf = await getBuffer(file)
    if (signal?.aborted) return
    if (buf) {
      if (await playBuffer(buf, signal, rate)) return
      // 上下文没解锁：<audio> 元素在手势里还是能播的
      warn('改走 <audio> 元素', file)
    }
    if (!missing.has(file)) {
      const ok = await playElement(file, signal, rate)
      if (ok || signal?.aborted) return
      warn('音频播放失败，退回 TTS', file)
    }
  } else if (!file) {
    warn('没有音频，退回 TTS', text)
  }
  if (settings.ttsFallback && text) await tts(text, lang, signal)
}

/**
 * 一串有 buffer 的片段（与停顿）按时钟排到时间轴上一起播。返回 false 表示上下文没准备好（没播），
 * 调用方改走逐条的 play()。
 */
async function playRun(run: Array<{ item: SeqItem; buf: AudioBuffer | null }>, signal?: AbortSignal, rate = 1): Promise<boolean> {
  const ac = ensureContext()!
  if (signal?.aborted) return true
  if (!(await contextReady(ac))) return false
  if (signal?.aborted) return true
  return new Promise((resolve) => {
    const sources: AudioBufferSourceNode[] = []
    let t = ac.currentTime + 0.03
    let lastEnd = t
    for (const { item, buf } of run) {
      if (item.pause || !buf) {
        t += PAUSE_S
        continue
      }
      const src = ac.createBufferSource()
      src.buffer = buf
      setRate(src, rate)
      src.connect(gain ?? ac.destination)
      src.start(t)
      sources.push(src)
      const dur = buf.duration / rate
      lastEnd = t + dur
      t += Math.max(0.05, dur - CLIP_PAD_S) + JOIN_GAP_S
    }
    // 最后一条播完再等它后面的停顿（如果有）
    const tailMs = Math.max(0, t - lastEnd - JOIN_GAP_S) * 1000
    let done = false
    const finish = () => {
      if (done) return
      done = true
      signal?.removeEventListener('abort', stopNow)
      if (current?.stop === stopNow) current = null
      resolve(true)
    }
    const stopNow = () => {
      for (const s of sources) {
        try {
          s.stop()
        } catch {
          /* 已经停了 */
        }
      }
      finish()
    }
    const last = sources[sources.length - 1]
    if (last) last.onended = () => setTimeout(finish, tailMs)
    else setTimeout(finish, tailMs)
    signal?.addEventListener('abort', stopNow, { once: true })
    current = { stop: stopNow }
    // 兜底：onended 不触发（标签页切后台等）时不要卡住序列
    setTimeout(finish, (t - ac.currentTime) * 1000 + 1500)
  })
}

/**
 * 播一句话：能排时间轴的（有 buffer 的片段与停顿）连成一段一起排；没 buffer 的（缺文件 / file:// / 解码失败）
 * 走 play() 的老路（<audio> 元素 → TTS）。resolve 表示播完或被打断。
 */
export async function playSequence(items: SeqItem[], lang: Lang, signal?: AbortSignal, rate = 1): Promise<void> {
  stop()
  if (signal?.aborted || !inBrowser) return
  const ac = elementMode ? null : ensureContext()
  const bufs = await Promise.all(items.map((it) => (ac && !it.pause && it.file && !missing.has(it.file) ? getBuffer(it.file) : Promise.resolve(null))))
  if (signal?.aborted) return
  let i = 0
  while (i < items.length) {
    const run: Array<{ item: SeqItem; buf: AudioBuffer | null }> = []
    while (i < items.length && (items[i]!.pause || bufs[i])) {
      run.push({ item: items[i]!, buf: bufs[i]! })
      i++
    }
    if (run.length) {
      if (ac && (await playRun(run, signal, rate))) {
        if (signal?.aborted) return
        continue
      }
      // 上下文没解锁 / 没有 WebAudio：逐条来
      for (const { item } of run) {
        if (signal?.aborted) return
        if (item.pause) await new Promise((r) => setTimeout(r, PAUSE_S * 1000))
        else await play(item.file ?? null, item.text ?? '', lang, signal, rate)
      }
      continue
    }
    const it = items[i++]!
    await play(it.file ?? null, it.text ?? '', lang, signal, rate)
    if (signal?.aborted) return
  }
}

export function stop(): void {
  current?.stop()
  current = null
  stopTTS()
}
