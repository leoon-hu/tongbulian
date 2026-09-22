import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Member, RtcCandidate } from '@/battle/protocol'
import { CANDIDATE_BATCH_MS, CandidateBatch, MAX_CANDIDATES, MAX_PEERS, MAX_SDP_CHARS, VOICE_MAX, canEnableVoice, cleanIceServers, isOfferer, isRtcSignal, pairOfferer, planPeers, voicePeers, voiceSupported, wantedPeers } from '../voice'

const m = (clientId: string, o: Partial<Member> = {}): Member => ({ clientId, name: clientId, role: 'red', ready: false, online: true, joinedAt: 0, voice: false, ...o })
const cand = (candidate: string): RtcCandidate => ({ candidate, sdpMid: '0', sdpMLineIndex: 0 })

describe('语音的纯逻辑（B57）', () => {
  it('voicePeers：除了我、在线且开了麦的人；canEnableVoice：名额 VOICE_MAX，别人开着的算、掉线的也算、我自己不算', () => {
    const members = [m('me', { voice: true }), m('a', { voice: true }), m('b'), m('c', { voice: true, online: false }), m('d', { voice: true, role: 'watch' })]
    expect(voicePeers(members, 'me')).toEqual(['a', 'd'])
    expect(voicePeers(members, 'a')).toEqual(['me', 'd'])
    expect(VOICE_MAX).toBe(4)
    expect(canEnableVoice(members, 'me')).toBe(true) // 别人开着 3 个（a、掉线的 c、观战的 d）
    expect(canEnableVoice(members, 'b')).toBe(false) // 别人开着 4 个（me a c d）
    expect(canEnableVoice(members.filter((x) => x.clientId !== 'd'), 'b')).toBe(true)
    expect(canEnableVoice([...members, m('e', { voice: true })], 'me')).toBe(false) // 我自己不算，但别人已经 4 个
    expect(canEnableVoice([], 'x')).toBe(true)
  })

  it('wantedPeers：开了麦的人连所有在线的人（开了麦的优先、其余按进房顺序、最多 MAX_PEERS）；没开麦的只连开了麦的；pairOfferer：都开按字典序、只一方开就是那一方、都没开不连', () => {
    const ms = [m('me'), m('s1', { voice: true, joinedAt: 5 }), m('l1', { joinedAt: 1 }), m('l2', { joinedAt: 2 }), m('off', { online: false }), m('s2', { voice: true, joinedAt: 9, online: false })]
    expect(wantedPeers(ms, 'me', false)).toEqual(['s1'])
    expect(wantedPeers(ms, 'me', true)).toEqual(['s1', 'l1', 'l2'])
    const many = [m('me'), ...Array.from({ length: 8 }, (_, i) => m(`l${i}`, { joinedAt: 8 - i })), m('sp', { voice: true, joinedAt: 100 })]
    const w = wantedPeers(many, 'me', true)
    expect(w).toHaveLength(MAX_PEERS)
    expect(w[0]).toBe('sp')
    expect(w.slice(1)).toEqual(['l7', 'l6', 'l5', 'l4', 'l3'])
    expect(wantedPeers(many, 'me', false)).toEqual(['sp'])
    expect(pairOfferer('a', true, 'b', true)).toBe('a')
    expect(pairOfferer('b', true, 'a', true)).toBe('a')
    expect(pairOfferer('b', true, 'a', false)).toBe('b')
    expect(pairOfferer('b', false, 'a', true)).toBe('a')
    expect(pairOfferer('a', false, 'b', false)).toBeNull()
  })

  it('isOfferer：字典序小的一方发 offer，两边算出来互补；planPeers：多的关、少的建', () => {
    expect(isOfferer('a', 'b')).toBe(true)
    expect(isOfferer('b', 'a')).toBe(false)
    expect(isOfferer('a', 'a')).toBe(false)
    expect(planPeers(['a', 'b'], ['b', 'c'])).toEqual({ open: ['c'], close: ['a'] })
    expect(planPeers([], [])).toEqual({ open: [], close: [] })
    expect(planPeers(new Set(['x']), ['x'])).toEqual({ open: [], close: [] })
  })

  it('isRtcSignal：一份 SDP 或一批候选；形状不对、太大、两样都有的不认', () => {
    expect(isRtcSignal({ sdp: { type: 'offer', sdp: 'v=0' } })).toBe(true)
    expect(isRtcSignal({ sdp: { type: 'answer', sdp: '' } })).toBe(true)
    expect(isRtcSignal({ candidates: [] })).toBe(true)
    expect(isRtcSignal({ candidates: [cand('c'), { candidate: 'x', sdpMid: null, sdpMLineIndex: null }] })).toBe(true)
    expect(isRtcSignal({ sdp: { type: 'pranswer', sdp: '' } })).toBe(false)
    expect(isRtcSignal({ sdp: { type: 'offer', sdp: 'x'.repeat(MAX_SDP_CHARS + 1) } })).toBe(false)
    expect(isRtcSignal({ sdp: { type: 'offer', sdp: 'x'.repeat(MAX_SDP_CHARS) } })).toBe(true)
    expect(isRtcSignal({ sdp: { type: 'offer', sdp: 'v', extra: 1 } })).toBe(true) // 多余字段无所谓
    expect(isRtcSignal({ sdp: { type: 'offer', sdp: 'v' }, candidates: [] })).toBe(false)
    expect(isRtcSignal({ candidates: [{ candidate: 1 }] })).toBe(false)
    expect(isRtcSignal({ candidates: [{ candidate: 'c', sdpMid: 0, sdpMLineIndex: 0 }] })).toBe(false)
    expect(isRtcSignal({ candidates: [{ candidate: 'c', sdpMid: null, sdpMLineIndex: 1.5 }] })).toBe(false)
    expect(isRtcSignal({ candidates: Array.from({ length: MAX_CANDIDATES + 1 }, () => cand('c')) })).toBe(false)
    expect(isRtcSignal({ candidates: [cand('x'.repeat(600))] })).toBe(false)
    expect(isRtcSignal({})).toBe(false)
    expect(isRtcSignal(null)).toBe(false)
    expect(isRtcSignal('sdp')).toBe(false)
    expect(isRtcSignal({ nope: 1 })).toBe(false)
  })

  it('cleanIceServers：只留 urls 合法的（字符串变数组、只认 stun / turn 协议），turn 必须带用户名与口令', () => {
    expect(
      cleanIceServers([
        { urls: 'stun:a' },
        { urls: ['turn:b', 3], username: 'u', credential: 'c' },
        { urls: [] },
        { urls: 5 },
        null,
        'x',
        { username: 'u' },
        { urls: 'turn:d', username: 1 },
        { urls: 'turns:e.example.com:443?transport=tcp', username: 'u', credential: 'c' },
        { urls: 'http://evil.example', username: 'u', credential: 'c' },
        { urls: 'stun:a b' },
      ]),
    ).toEqual([
      { urls: ['stun:a'] },
      { urls: ['turn:b'], username: 'u', credential: 'c' },
      { urls: ['turns:e.example.com:443?transport=tcp'], username: 'u', credential: 'c' },
    ])
    expect(cleanIceServers('x')).toEqual([])
    expect(cleanIceServers(undefined)).toEqual([])
  })

  it('voiceSupported：要有 getUserMedia 与 RTCPeerConnection', () => {
    expect(voiceSupported({ mediaDevices: { getUserMedia: () => {} }, pc: class {} })).toBe(true)
    expect(voiceSupported({ mediaDevices: { getUserMedia: () => {} }, pc: undefined })).toBe(false)
    expect(voiceSupported({ mediaDevices: undefined, pc: class {} })).toBe(false)
    expect(voiceSupported({ mediaDevices: {}, pc: class {} })).toBe(false)
  })

  describe('CandidateBatch', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('攒 CANDIDATE_BATCH_MS 一包；满 MAX_CANDIDATES 立刻发；flush 马上发、空的不发；dispose 丢掉', () => {
      const sent: RtcCandidate[][] = []
      const b = new CandidateBatch((c) => sent.push(c))
      b.add(cand('1'))
      b.add(cand('2'))
      expect(sent).toEqual([])
      vi.advanceTimersByTime(CANDIDATE_BATCH_MS - 1)
      expect(sent).toEqual([])
      vi.advanceTimersByTime(1)
      expect(sent).toEqual([[cand('1'), cand('2')]])
      b.flush()
      expect(sent).toHaveLength(1)
      b.add(cand('3'))
      b.flush()
      expect(sent[1]).toEqual([cand('3')])
      for (let i = 0; i < MAX_CANDIDATES; i++) b.add(cand(`m${i}`))
      expect(sent[2]).toHaveLength(MAX_CANDIDATES)
      b.add(cand('4'))
      b.dispose()
      vi.advanceTimersByTime(CANDIDATE_BATCH_MS * 2)
      expect(sent).toHaveLength(3)
    })

    it('计时器可注入', () => {
      const sent: RtcCandidate[][] = []
      const timers: (() => void)[] = []
      const b = new CandidateBatch((c) => sent.push(c), 50, { set: (fn) => timers.push(fn), clear: () => {} })
      b.add(cand('a'))
      expect(timers).toHaveLength(1)
      timers[0]!()
      expect(sent).toEqual([[cand('a')]])
    })
  })
})
