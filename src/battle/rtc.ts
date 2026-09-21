/**
 * 一条点对点语音连接（需求 B57）：RTCPeerConnection 的薄封装。只管一条连接——加本机的音轨（没开麦就不加，只收不发）、
 * 发 / 收 SDP 与候选、把对方的音轨挂到隐藏的 <audio> 上（不走朗读队列、不被 hush() 打断）、报连接状态与音量。
 * 谁发 offer 由外面定（voice.ts 的 pairOfferer）：发 offer 的一方建好就发，另一方收到 offer 才应答，所以没有 glare。
 * 连接失败不做 ICE 重启：由发 offer 的一方整条重建（stores/voice.ts），两边都是干净的新连接，比续用旧的稳。
 * 没开麦的人收远端声音时 Safari 可能按自动播放策略拦下：记着 playBlocked，下一次触摸再 retryPlay()。
 * RTCPeerConnection / audio 元素 / 计时器都可注入（测试用假的）。
 */
import type { IceServer, RtcCandidate, RtcSignal } from './protocol'
import { CandidateBatch, type BatchTimer } from './voice'

export type PeerState = 'connecting' | 'connected' | 'failed' | 'closed'

export interface PeerDeps {
  createPc: (config: RTCConfiguration) => RTCPeerConnection
  /** 播对方声音的隐藏 <audio>（自动播放、内联，iOS 要 playsinline） */
  createAudio: () => HTMLAudioElement
  timer: BatchTimer
}

export interface PeerOptions {
  /** 对方的对外身份 */
  id: string
  /** 我这边发 offer */
  offerer: boolean
  /** 本机麦克风；null = 没开麦，只收不发 */
  stream: MediaStream | null
  iceServers: readonly IceServer[]
  send: (data: RtcSignal) => void
  onState: (state: PeerState) => void
  /** 远端声音的自动播放被浏览器拦下了（要等用户手势） */
  onPlayBlocked?: () => void
  deps?: Partial<PeerDeps>
}

function defaultAudio(): HTMLAudioElement {
  const a = document.createElement('audio')
  a.autoplay = true
  a.setAttribute('playsinline', '')
  a.style.display = 'none'
  document.body.appendChild(a)
  return a
}

const DEFAULT_DEPS: PeerDeps = {
  createPc: (config) => new RTCPeerConnection(config),
  createAudio: defaultAudio,
  timer: { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
}

export class VoicePeer {
  readonly id: string
  readonly offerer: boolean
  state: PeerState = 'connecting'
  /** 已经收过对方的 SDP：再收到 offer 就是对方整条重建了，外面要换一条新的 */
  hasRemote = false
  /** 远端声音的播放被自动播放策略拦下，等手势 */
  playBlocked = false
  private readonly pc: RTCPeerConnection
  private readonly audio: HTMLAudioElement
  private readonly batch: CandidateBatch
  private readonly pending: RtcCandidate[] = []
  private makingOffer = false

  constructor(private readonly opts: PeerOptions) {
    const deps: PeerDeps = { ...DEFAULT_DEPS, ...opts.deps }
    this.id = opts.id
    this.offerer = opts.offerer
    this.audio = deps.createAudio()
    this.batch = new CandidateBatch((candidates) => opts.send({ candidates }), undefined, deps.timer)
    this.pc = deps.createPc({ iceServers: opts.iceServers.map((s) => ({ ...s })) })
    // 开了麦的先把自己的音轨加上（应答方要在 createAnswer 之前加，answer 里才是双向的）；没开麦的不加，answer 就是只收
    if (opts.stream) for (const track of opts.stream.getAudioTracks()) this.pc.addTrack(track, opts.stream)
    this.pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track])
      this.audio.srcObject = stream
      this.play()
    }
    this.pc.onicecandidate = (e) => {
      const c = e.candidate
      if (c) this.batch.add({ candidate: c.candidate, sdpMid: c.sdpMid ?? null, sdpMLineIndex: c.sdpMLineIndex ?? null })
      else this.batch.flush()
    }
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState
      if (s === 'connected') this.setState('connected')
      else if (s === 'failed') this.setState('failed')
      else if (s === 'closed') this.setState('closed')
      // disconnected 可能自己恢复，先不动
    }
    if (opts.offerer) void this.offer()
  }

  private play(): void {
    const p = this.audio.play?.()
    if (!p || typeof p.then !== 'function') return
    p.then(
      () => {
        this.playBlocked = false
      },
      () => {
        if (this.state === 'closed') return
        this.playBlocked = true
        this.opts.onPlayBlocked?.()
      },
    )
  }

  /** 用户手势里再试一次播放（没开麦的人第一次收到声音时 Safari 可能拦下） */
  retryPlay(): void {
    if (!this.playBlocked || this.state === 'closed') return
    this.play()
  }

  private setState(s: PeerState): void {
    if (this.state === s || this.state === 'closed') return
    this.state = s
    this.opts.onState(s)
  }

  private async offer(): Promise<void> {
    try {
      this.makingOffer = true
      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)
      const d = this.pc.localDescription ?? offer
      this.opts.send({ sdp: { type: 'offer', sdp: d.sdp ?? '' } })
    } catch {
      this.setState('failed')
    } finally {
      this.makingOffer = false
    }
  }

  /** 收到对方经服务器转来的信令 */
  async handle(data: RtcSignal): Promise<void> {
    if (this.state === 'closed') return
    try {
      if ('sdp' in data) {
        const desc = data.sdp
        if (desc.type === 'offer') {
          // 只有应答方会收到 offer；发 offer 的一方收到 offer 是对方搞错了，忽略
          if (this.offerer || this.makingOffer) return
          await this.pc.setRemoteDescription({ type: 'offer', sdp: desc.sdp })
          this.hasRemote = true
          await this.drain()
          const answer = await this.pc.createAnswer()
          await this.pc.setLocalDescription(answer)
          const d = this.pc.localDescription ?? answer
          this.opts.send({ sdp: { type: 'answer', sdp: d.sdp ?? '' } })
        } else {
          if (!this.offerer || this.pc.signalingState !== 'have-local-offer') return
          await this.pc.setRemoteDescription({ type: 'answer', sdp: desc.sdp })
          this.hasRemote = true
          await this.drain()
        }
      } else {
        if (this.hasRemote) await this.addAll(data.candidates)
        else this.pending.push(...data.candidates)
      }
    } catch {
      this.setState('failed')
    }
  }

  private async drain(): Promise<void> {
    const list = this.pending.splice(0)
    await this.addAll(list)
  }

  private async addAll(list: RtcCandidate[]): Promise<void> {
    for (const c of list) {
      try {
        await this.pc.addIceCandidate(c)
      } catch {
        /* 一条候选不行不影响别的 */
      }
    }
  }

  /** 对方现在的音量 0…1（接收端的同步源报告；不支持的浏览器一律 0） */
  level(): number {
    let max = 0
    const receivers = typeof this.pc.getReceivers === 'function' ? this.pc.getReceivers() : []
    for (const r of receivers) {
      const sources = (r as { getSynchronizationSources?: () => { audioLevel?: number }[] }).getSynchronizationSources?.() ?? []
      for (const s of sources) max = Math.max(max, s.audioLevel ?? 0)
    }
    return max
  }

  close(): void {
    if (this.state === 'closed') return
    this.state = 'closed'
    this.batch.dispose()
    try {
      this.pc.ontrack = null
      this.pc.onicecandidate = null
      this.pc.onconnectionstatechange = null
      this.pc.close()
    } catch {
      /* 已经关了 */
    }
    try {
      this.audio.srcObject = null
      this.audio.remove()
    } catch {
      /* 假元素 */
    }
    this.opts.onState('closed')
  }
}

export interface LevelMeter {
  /** 本机麦克风现在的音量 0…1（时域 RMS） */
  level(): number
  close(): void
}

const SILENT: LevelMeter = { level: () => 0, close: () => {} }

/** 本机麦克风的音量表（自己那颗 🎤 说话时脉动用）：只接分析器、不接输出，不会把自己的声音放出来；没有 WebAudio 就一律 0 */
export function createLevelMeter(stream: MediaStream, ctx: AudioContext | null): LevelMeter {
  if (!ctx || typeof ctx.createMediaStreamSource !== 'function') return SILENT
  try {
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)
    return {
      level() {
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (const v of buf) {
          const d = (v - 128) / 128
          sum += d * d
        }
        return Math.sqrt(sum / buf.length)
      },
      close() {
        try {
          src.disconnect()
        } catch {
          /* 已断 */
        }
      },
    }
  } catch {
    return SILENT
  }
}
