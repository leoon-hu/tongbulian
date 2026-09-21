// 测试用的假 RTCPeerConnection / 音频元素 / 麦克风流（B57）：记下调用，测试自己触发候选、音轨、连接状态
import type { PeerDeps } from '@/battle/rtc'

export class FakePc {
  static all: FakePc[] = []
  static last(): FakePc {
    const pc = FakePc.all[FakePc.all.length - 1]
    if (!pc) throw new Error('还没有建立过连接')
    return pc
  }
  static reset(): void {
    FakePc.all.length = 0
  }

  tracks: unknown[] = []
  local: RTCSessionDescriptionInit | null = null
  remote: RTCSessionDescriptionInit | null = null
  candidates: RTCIceCandidateInit[] = []
  closed = false
  signalingState: RTCSignalingState = 'stable'
  connectionState: RTCPeerConnectionState = 'new'
  /** 对方的音量（getSynchronizationSources 报告的） */
  level = 0
  offers = 0
  answers = 0
  ontrack: ((e: { streams: MediaStream[]; track: MediaStreamTrack }) => void) | null = null
  onicecandidate: ((e: { candidate: RTCIceCandidateInit | null }) => void) | null = null
  onconnectionstatechange: (() => void) | null = null

  constructor(public readonly config: RTCConfiguration) {
    FakePc.all.push(this)
  }
  get localDescription(): RTCSessionDescriptionInit | null {
    return this.local
  }
  addTrack(track: unknown, _stream?: unknown): unknown {
    this.tracks.push(track)
    return {}
  }
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    this.offers += 1
    return { type: 'offer', sdp: `offer#${this.offers}` }
  }
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    this.answers += 1
    return { type: 'answer', sdp: `answer#${this.answers}` }
  }
  async setLocalDescription(d: RTCSessionDescriptionInit): Promise<void> {
    this.local = d
    this.signalingState = d.type === 'offer' ? 'have-local-offer' : 'stable'
  }
  async setRemoteDescription(d: RTCSessionDescriptionInit): Promise<void> {
    this.remote = d
    this.signalingState = d.type === 'offer' ? 'have-remote-offer' : 'stable'
  }
  async addIceCandidate(c: RTCIceCandidateInit): Promise<void> {
    if (c.candidate === 'bad') throw new Error('bad candidate')
    this.candidates.push(c)
  }
  getReceivers(): unknown[] {
    return [{ getSynchronizationSources: () => [{ audioLevel: this.level }] }]
  }
  close(): void {
    this.closed = true
    this.connectionState = 'closed'
  }
  // ── 测试驱动 ──
  emitCandidate(c: RTCIceCandidateInit | null): void {
    this.onicecandidate?.({ candidate: c })
  }
  emitTrack(stream: MediaStream): void {
    this.ontrack?.({ streams: [stream], track: {} as MediaStreamTrack })
  }
  setConnection(s: RTCPeerConnectionState): void {
    this.connectionState = s
    this.onconnectionstatechange?.()
  }
}

export class FakeAudio {
  static all: FakeAudio[] = []
  /** 模拟自动播放被拦：play() 拒绝 */
  static blockPlay = false
  static last(): FakeAudio {
    const a = FakeAudio.all[FakeAudio.all.length - 1]
    if (!a) throw new Error('还没有建过音频元素')
    return a
  }
  srcObject: unknown = null
  played = 0
  removed = false
  autoplay = false
  style: Record<string, string> = {}
  constructor() {
    FakeAudio.all.push(this)
  }
  play(): Promise<void> {
    this.played += 1
    return FakeAudio.blockPlay ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve()
  }
  remove(): void {
    this.removed = true
  }
  setAttribute(): void {}
}

export interface FakeTrack {
  kind: 'audio'
  enabled: boolean
  readyState: 'live' | 'ended'
  muted: boolean
  onended: (() => void) | null
  onmute: (() => void) | null
  onunmute: (() => void) | null
  stop(): void
}
export type FakeStream = MediaStream & {
  stopped: number
  track: FakeTrack
  /** 系统把麦克风收回了（音轨结束） */
  end(): void
  mute(): void
  unmute(): void
}

/** 假的麦克风流：一条音轨，stop 计数，能模拟被系统收回 / 静音 */
export function fakeStream(): FakeStream {
  const track: FakeTrack = {
    kind: 'audio',
    enabled: true,
    readyState: 'live',
    muted: false,
    onended: null,
    onmute: null,
    onunmute: null,
    stop() {
      s.stopped += 1
      track.readyState = 'ended'
    },
  }
  const s = {
    stopped: 0,
    track,
    getAudioTracks: () => [track],
    getTracks: () => [track],
    end() {
      track.readyState = 'ended'
      track.onended?.()
    },
    mute() {
      track.muted = true
      track.onmute?.()
    },
    unmute() {
      track.muted = false
      track.onunmute?.()
    },
  }
  return s as unknown as FakeStream
}

export function fakePeerDeps(): Partial<PeerDeps> {
  return {
    createPc: (config) => new FakePc(config) as unknown as RTCPeerConnection,
    createAudio: () => new FakeAudio() as unknown as HTMLAudioElement,
  }
}
