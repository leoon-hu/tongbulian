import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RtcSignal } from '@/battle/protocol'
import { CANDIDATE_BATCH_MS } from '@/battle/voice'
import { VoicePeer, createLevelMeter, type PeerState } from '../rtc'
import { FakeAudio, FakePc, fakePeerDeps, fakeStream } from './fake-rtc'

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

function peer(offerer: boolean, deps = fakePeerDeps()) {
  const sent: RtcSignal[] = []
  const states: PeerState[] = []
  const p = new VoicePeer({ id: 'other', offerer, stream: fakeStream(), iceServers: [{ urls: 'stun:x' }], send: (d) => sent.push(d), onState: (s) => states.push(s), deps })
  return { p, sent, states, pc: FakePc.last() }
}

beforeEach(() => {
  vi.useFakeTimers()
  FakePc.reset()
  FakeAudio.all.length = 0
  FakeAudio.blockPlay = false
})
afterEach(() => vi.useRealTimers())

describe('VoicePeer（B57）', () => {
  it('发 offer 的一方：加音轨、建好就发 offer；对方的候选在收到 SDP 前先存着；别人的 offer 不认；收到 answer 才 setRemoteDescription 并把存着的候选加进去；本机候选攒一包、收集完立刻发；坏候选不影响别的', async () => {
    const { p, sent, pc } = peer(true)
    expect(pc.config).toEqual({ iceServers: [{ urls: 'stun:x' }] })
    expect(pc.tracks).toHaveLength(1)
    await flush()
    expect(sent).toEqual([{ sdp: { type: 'offer', sdp: 'offer#1' } }])
    expect(pc.local).toEqual({ type: 'offer', sdp: 'offer#1' })
    expect(pc.signalingState).toBe('have-local-offer')

    await p.handle({ candidates: [{ candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 }] })
    expect(pc.candidates).toEqual([])
    await p.handle({ sdp: { type: 'offer', sdp: 'wrong' } })
    expect(pc.remote).toBeNull()
    await p.handle({ sdp: { type: 'answer', sdp: 'a1' } })
    expect(pc.remote).toEqual({ type: 'answer', sdp: 'a1' })
    expect(p.hasRemote).toBe(true)
    expect(pc.candidates).toEqual([{ candidate: 'c1', sdpMid: '0', sdpMLineIndex: 0 }])
    // 再来一份 answer（信令状态已是 stable）：不认
    await p.handle({ sdp: { type: 'answer', sdp: 'a2' } })
    expect(pc.remote).toEqual({ type: 'answer', sdp: 'a1' })

    pc.emitCandidate({ candidate: 'l1', sdpMid: '0', sdpMLineIndex: 0 })
    pc.emitCandidate({ candidate: 'l2', sdpMid: '0', sdpMLineIndex: 0 })
    expect(sent).toHaveLength(1)
    vi.advanceTimersByTime(CANDIDATE_BATCH_MS)
    expect(sent[1]).toEqual({
      candidates: [
        { candidate: 'l1', sdpMid: '0', sdpMLineIndex: 0 },
        { candidate: 'l2', sdpMid: '0', sdpMLineIndex: 0 },
      ],
    })
    pc.emitCandidate({ candidate: 'l3' })
    pc.emitCandidate(null)
    expect(sent[2]).toEqual({ candidates: [{ candidate: 'l3', sdpMid: null, sdpMLineIndex: null }] })

    await p.handle({
      candidates: [
        { candidate: 'bad', sdpMid: null, sdpMLineIndex: null },
        { candidate: 'c2', sdpMid: null, sdpMLineIndex: null },
      ],
    })
    expect(pc.candidates.map((c) => c.candidate)).toEqual(['c1', 'c2'])
  })

  it('应答的一方：不主动发；收到 offer → setRemoteDescription → 应答；对方的音轨挂到隐藏 audio 上播放；连接状态映射（disconnected 不动）；音量来自接收端；close 关 pc、清 audio、报一次 closed，之后什么都不做', async () => {
    const { p, sent, states, pc } = peer(false)
    await flush()
    expect(sent).toEqual([])
    expect(pc.local).toBeNull()

    await p.handle({ sdp: { type: 'offer', sdp: 'o1' } })
    expect(pc.remote).toEqual({ type: 'offer', sdp: 'o1' })
    expect(sent).toEqual([{ sdp: { type: 'answer', sdp: 'answer#1' } }])
    expect(p.hasRemote).toBe(true)
    // 应答方收到 answer：不认
    await p.handle({ sdp: { type: 'answer', sdp: 'x' } })
    expect(pc.remote).toEqual({ type: 'offer', sdp: 'o1' })

    const audio = FakeAudio.last()
    const stream = {} as MediaStream
    pc.emitTrack(stream)
    expect(audio.srcObject).toBe(stream)
    expect(audio.played).toBe(1)

    pc.setConnection('connecting')
    expect(states).toEqual([])
    pc.setConnection('connected')
    expect(p.state).toBe('connected')
    pc.setConnection('disconnected')
    expect(p.state).toBe('connected')
    pc.level = 0.3
    expect(p.level()).toBe(0.3)
    pc.setConnection('failed')
    expect(states).toEqual(['connected', 'failed'])

    p.close()
    expect(pc.closed).toBe(true)
    expect(audio.removed).toBe(true)
    expect(audio.srcObject).toBeNull()
    expect(states).toEqual(['connected', 'failed', 'closed'])
    p.close()
    pc.setConnection('connected')
    await p.handle({ sdp: { type: 'offer', sdp: 'o2' } })
    expect(states).toEqual(['connected', 'failed', 'closed'])
    expect(sent).toHaveLength(1)
  })

  it('没开麦的一方（stream 为 null）：不加音轨、只应答；自动播放被拦记 playBlocked 并回调，retryPlay 在手势里再试、成功就清掉', async () => {
    FakeAudio.blockPlay = true
    let blocked = 0
    const sent: RtcSignal[] = []
    const p = new VoicePeer({ id: 'o', offerer: false, stream: null, iceServers: [], send: (d) => sent.push(d), onState: () => {}, onPlayBlocked: () => (blocked += 1), deps: fakePeerDeps() })
    const pc = FakePc.last()
    expect(pc.tracks).toEqual([])
    await p.handle({ sdp: { type: 'offer', sdp: 'o' } })
    expect(sent).toEqual([{ sdp: { type: 'answer', sdp: 'answer#1' } }])
    pc.emitTrack({} as MediaStream)
    await flush()
    const audio = FakeAudio.last()
    expect(audio.played).toBe(1)
    expect(p.playBlocked).toBe(true)
    expect(blocked).toBe(1)
    FakeAudio.blockPlay = false
    p.retryPlay()
    await flush()
    expect(audio.played).toBe(2)
    expect(p.playBlocked).toBe(false)
    p.retryPlay()
    expect(audio.played).toBe(2)
    p.close()
    p.retryPlay()
    expect(audio.played).toBe(2)
  })

  it('createOffer 抛错 → failed；setRemoteDescription 抛错 → failed', async () => {
    class Boom extends FakePc {
      override async createOffer(): Promise<RTCSessionDescriptionInit> {
        throw new Error('boom')
      }
      override async setRemoteDescription(): Promise<void> {
        throw new Error('boom')
      }
    }
    const deps = { ...fakePeerDeps(), createPc: (c: RTCConfiguration) => new Boom(c) as unknown as RTCPeerConnection }
    const a = peer(true, deps)
    await flush()
    expect(a.states).toEqual(['failed'])
    expect(a.sent).toEqual([])
    const b = peer(false, deps)
    await b.p.handle({ sdp: { type: 'offer', sdp: 'o' } })
    expect(b.states).toEqual(['failed'])
  })

  it('createLevelMeter：没有 AudioContext 一律 0；有的话按时域 RMS，close 断开', () => {
    expect(createLevelMeter({} as MediaStream, null).level()).toBe(0)
    let disconnected = 0
    const ctx = {
      createMediaStreamSource: () => ({ connect: () => {}, disconnect: () => (disconnected += 1) }),
      createAnalyser: () => ({
        fftSize: 0,
        getByteTimeDomainData: (buf: Uint8Array) => buf.fill(128 + 64),
      }),
    } as unknown as AudioContext
    const meter = createLevelMeter({} as MediaStream, ctx)
    expect(meter.level()).toBeCloseTo(0.5, 5)
    meter.close()
    expect(disconnected).toBe(1)
    const broken = { createMediaStreamSource: () => { throw new Error('x') } } as unknown as AudioContext
    expect(createLevelMeter({} as MediaStream, broken).level()).toBe(0)
  })
})
