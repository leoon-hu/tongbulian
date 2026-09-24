// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ClientMsg, Member, RoomSnapshot } from '@/battle/protocol'
import { FakeAudio, FakePc, fakePeerDeps, fakeStream, type FakeStream } from '@/battle/__tests__/fake-rtc'
import { CONNECT_SHOW_MS, CONNECT_TIMEOUT_MS, DUCK_HOLD_MS, LEVEL_MS, RETRY_MS, TURN_WAIT_MS, VOICE_ERROR_MS, useVoiceStore } from '../voice'

const m = (clientId: string, o: Partial<Member> = {}): Member => ({ clientId, name: clientId, role: 'red', ready: false, online: true, joinedAt: 0, voice: false, ...o })
const snap = (members: Member[]): RoomSnapshot => ({ code: 'ABC234', kpId: 's1-05-carry-add', skin: 'race', hostId: 'aaaa', locked: false, createdAt: 0, members, match: null, passcodes: { red: '111111', blue: '222222', watch: '333333' } })

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}
/** 发出去的 offer 都给了谁（按顺序） */
const offersTo = (sent: ClientMsg[]): string[] => sent.filter((x): x is Extract<ClientMsg, { type: 'rtc' }> => x.type === 'rtc' && 'sdp' in x.data && x.data.sdp.type === 'offer').map((x) => x.to)

const STUN = [{ urls: 'stun:stun.cloudflare.com:3478' }]

function setup(opts: { supported?: boolean; deny?: boolean } = {}) {
  const store = useVoiceStore()
  const sent: ClientMsg[] = []
  /** 每次申请都给一条新的流（被收回后再开要新的） */
  const streams: FakeStream[] = []
  const ducks: boolean[] = []
  store.useDeps({
    getUserMedia: async () => {
      if (opts.deny) throw new Error('NotAllowedError')
      const st = fakeStream()
      streams.push(st)
      return st
    },
    supported: () => opts.supported ?? true,
    peer: fakePeerDeps(),
    now: () => Date.now(),
    duck: (on) => ducks.push(on),
  })
  store.attach({ send: (msg) => sent.push(msg) })
  /** 开麦：申请 + 服务器回一份只有 STUN 的清单 */
  const enable = async (): Promise<void> => {
    await store.toggle()
    store.onTurn(STUN, 0)
    await flush()
  }
  return { store, sent, streams, ducks, enable, get stream(): FakeStream { return streams[0]! } }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers()
  FakePc.reset()
  FakeAudio.all.length = 0
  FakeAudio.blockPlay = false
})
afterEach(() => vi.useRealTimers())

describe('语音 store（B57）', () => {
  it('没开麦也自动收听：开了麦的人的 offer 来了就建一条只收的连接（不加音轨、不申请麦克风）并应答；他说话时 talking；他关麦连接关掉、整条重建再收就换新的、掉线也关；自己没开麦名字旁没有 🎤', async () => {
    const { store, sent, streams } = setup()
    store.onSnapshot(snap([m('aaaa'), m('bbbb', { voice: true })]), 'aaaa')
    store.onTurn(STUN, 0)
    await flush()
    expect(FakePc.all).toHaveLength(0) // 我没开麦：等 bbbb 来连
    expect(store.enabled).toBe(false)
    expect(store.markOf('bbbb')).toBe('on')
    expect(store.markOf('aaaa')).toBeNull()

    store.onSignal('bbbb', { sdp: { type: 'offer', sdp: 'o1' } })
    await flush()
    expect(FakePc.all).toHaveLength(1)
    const pc = FakePc.all[0]!
    expect(pc.tracks).toEqual([])
    expect(pc.remote?.sdp).toBe('o1')
    expect(sent).toEqual([{ type: 'turn' }, { type: 'rtc', to: 'bbbb', data: { sdp: { type: 'answer', sdp: 'answer#1' } } }])
    expect(streams).toHaveLength(0) // 没申请麦克风
    expect(store.peers.bbbb).toMatchObject({ state: 'connecting', level: 0, fails: 0 })
    pc.setConnection('connected')
    pc.level = 0.5
    vi.advanceTimersByTime(LEVEL_MS)
    expect(store.peers.bbbb).toMatchObject({ state: 'connected', level: 0.5 })
    expect(store.markOf('bbbb')).toBe('talking')
    store.onSignal('bbbb', { candidates: [{ candidate: 'c', sdpMid: null, sdpMLineIndex: null }] })
    await flush()
    expect(pc.candidates).toHaveLength(1)
    // 不是房间成员的 offer 不认
    store.onSignal('zzzz', { sdp: { type: 'offer', sdp: 'x' } })
    await flush()
    expect(FakePc.all).toHaveLength(1)

    store.onSnapshot(snap([m('aaaa'), m('bbbb')]), 'aaaa')
    expect(pc.closed).toBe(true)
    expect(store.peers).toEqual({})
    expect(store.markOf('bbbb')).toBeNull()

    store.onSnapshot(snap([m('aaaa'), m('bbbb', { voice: true })]), 'aaaa')
    store.onSignal('bbbb', { sdp: { type: 'offer', sdp: 'o2' } })
    await flush()
    expect(FakePc.all).toHaveLength(2)
    expect(FakePc.all[1]!.remote?.sdp).toBe('o2')
    store.onSignal('bbbb', { sdp: { type: 'offer', sdp: 'o3' } })
    await flush()
    expect(FakePc.all[1]!.closed).toBe(true)
    expect(FakePc.all[2]!.remote?.sdp).toBe('o3')
    store.onSnapshot(snap([m('aaaa'), m('bbbb', { voice: true, online: false })]), 'aaaa')
    expect(FakePc.all[2]!.closed).toBe(true)
    expect(store.peers).toEqual({})
  })

  it('开麦：申请麦克风 → 发 voice:true 与 turn → 向所有在线的人建连接（开了麦的优先）：对方开了麦且身份比我小的由他发（我关掉旧的等他），其余我发；对方开 / 关麦后重建；关麦：释放麦克风、发 voice:false，开了麦的人会把连接重建成只收的', async () => {
    const { store, sent, streams, enable } = setup()
    // me = mmmm：aaaa 开了麦且比我小 → 他发；zzzz 开了麦比我大 → 我发；l1 没开麦 → 我发；off 掉线不连
    const base = [m('mmmm'), m('aaaa', { voice: true, joinedAt: 1 }), m('zzzz', { voice: true, joinedAt: 2 }), m('l1', { joinedAt: 3 }), m('off', { online: false, joinedAt: 0 })]
    store.onSnapshot(snap(base), 'mmmm')
    store.onTurn(STUN, 0)
    store.onSignal('aaaa', { sdp: { type: 'offer', sdp: 'a1' } })
    await flush()
    expect(FakePc.all).toHaveLength(1)
    expect(FakePc.all[0]!.tracks).toEqual([])

    await enable()
    expect(store.enabled).toBe(true)
    expect(store.busy).toBe(false)
    expect(sent.filter((x) => x.type === 'voice')).toEqual([{ type: 'voice', on: true }])
    expect(sent.filter((x) => x.type === 'turn')).toHaveLength(1) // 只听时要过一份，开麦时还新鲜就不再要
    expect(FakePc.all[0]!.closed).toBe(true) // 和 aaaa 的旧连接是只收的，关掉等他重建
    expect(Object.keys(store.peers).sort()).toEqual(['l1', 'zzzz'])
    expect(offersTo(sent)).toEqual(['zzzz', 'l1'])
    expect(FakePc.all).toHaveLength(3)
    expect(FakePc.all[1]!.tracks).toHaveLength(1)
    expect(FakePc.all[2]!.tracks).toHaveLength(1)
    expect(store.markOf('mmmm')).toBe('on')
    expect(store.markOf('l1')).toBeNull() // 没开麦的人虽然连着，名字旁没有 🎤
    expect(store.markOf('zzzz')).toBe('on')

    store.onSignal('aaaa', { sdp: { type: 'offer', sdp: 'a2' } })
    await flush()
    expect(FakePc.all).toHaveLength(4)
    expect(FakePc.all[3]!.remote?.sdp).toBe('a2')
    expect(FakePc.all[3]!.tracks).toHaveLength(1)
    expect(sent.at(-1)).toMatchObject({ type: 'rtc', to: 'aaaa', data: { sdp: { type: 'answer' } } })
    store.onSignal('zzzz', { sdp: { type: 'answer', sdp: 'z' } })
    await flush()
    expect(FakePc.all[1]!.remote?.type).toBe('answer')
    // 该我发的一对里对方发来 offer：不认
    store.onSignal('zzzz', { sdp: { type: 'offer', sdp: 'wrong' } })
    await flush()
    expect(FakePc.all).toHaveLength(4)

    // l1 开麦（他比我小 → 变成他发）：我关掉旧的等他，他的 offer 来了换一条新的
    store.onSnapshot(snap([m('mmmm', { voice: true }), m('aaaa', { voice: true, joinedAt: 1 }), m('zzzz', { voice: true, joinedAt: 2 }), m('l1', { voice: true, joinedAt: 3 })]), 'mmmm')
    expect(FakePc.all[2]!.closed).toBe(true)
    expect(store.peers.l1).toBeUndefined()
    expect(FakePc.all).toHaveLength(4)
    store.onSignal('l1', { sdp: { type: 'offer', sdp: 'l' } })
    await flush()
    expect(FakePc.all).toHaveLength(5)
    expect(store.peers.l1?.state).toBe('connecting')

    // zzzz 关麦（他比我大 → 还是我发，但他变成只收）：我整条重建
    store.onSnapshot(snap([m('mmmm', { voice: true }), m('aaaa', { voice: true, joinedAt: 1 }), m('zzzz', { joinedAt: 2 }), m('l1', { voice: true, joinedAt: 3 })]), 'mmmm')
    await flush()
    expect(FakePc.all[1]!.closed).toBe(true)
    expect(FakePc.all).toHaveLength(6)
    expect(FakePc.all[5]!.local?.type).toBe('offer')
    expect(store.markOf('zzzz')).toBeNull()

    // 关麦：释放、发 voice:false；开了麦的人（aaaa、l1）的连接关掉等他们重建成只收的，没开麦的 zzzz 直接关
    store.disable()
    expect(store.enabled).toBe(false)
    expect(streams[0]!.stopped).toBe(1)
    expect(sent.at(-1)).toEqual({ type: 'voice', on: false })
    expect(FakePc.all.every((pc) => pc.closed)).toBe(true)
    expect(store.peers).toEqual({})
    expect(store.markOf('mmmm')).toBeNull()
    store.onSignal('aaaa', { sdp: { type: 'offer', sdp: 'a3' } })
    await flush()
    expect(FakePc.all.at(-1)!.tracks).toEqual([])
    expect(store.peers.aaaa?.state).toBe('connecting')
    store.disable()
    expect(sent.filter((x) => x.type === 'voice')).toHaveLength(2)
  })

  it('名额：别人开着 4 个就开不了（full，VOICE_ERROR_MS 后消失）；不支持 unsupported；拒绝权限 denied——都不发消息、不占麦克风', async () => {
    const { store, sent } = setup()
    store.onSnapshot(snap([m('aaaa'), m('b', { voice: true }), m('c', { voice: true }), m('d', { voice: true, online: false }), m('e', { voice: true, role: 'watch' })]), 'aaaa')
    expect(store.canEnable).toBe(false)
    await store.toggle()
    expect(store.enabled).toBe(false)
    expect(store.error).toBe('full')
    vi.advanceTimersByTime(VOICE_ERROR_MS)
    expect(store.error).toBeNull()
    expect(sent.filter((x) => x.type !== 'turn')).toEqual([])

    setActivePinia(createPinia())
    const u = setup({ supported: false })
    u.store.onSnapshot(snap([m('aaaa')]), 'aaaa')
    await u.store.toggle()
    expect(u.store.error).toBe('unsupported')
    expect(u.sent).toEqual([])

    setActivePinia(createPinia())
    const d = setup({ deny: true })
    d.store.onSnapshot(snap([m('aaaa')]), 'aaaa')
    await d.store.toggle()
    expect(d.store.enabled).toBe(false)
    expect(d.store.busy).toBe(false)
    expect(d.store.error).toBe('denied')
    expect(d.sent).toEqual([])
  })

  it('连接失败：我发 offer 的那条隔 RETRY_MS 整条重建（新 pc、新 offer）；应答的不自己重建，等对方', async () => {
    const { store, sent, enable } = setup()
    store.onSnapshot(snap([m('aaaa'), m('bbbb', { voice: true }), m('0000', { voice: true })]), 'aaaa')
    await enable()
    expect(offersTo(sent)).toEqual(['bbbb'])
    const first = FakePc.all[0]!
    first.setConnection('failed')
    expect(store.peers.bbbb?.state).toBe('failed')
    vi.advanceTimersByTime(RETRY_MS - 1)
    expect(FakePc.all).toHaveLength(1)
    vi.advanceTimersByTime(1)
    await flush()
    expect(first.closed).toBe(true)
    expect(FakePc.all).toHaveLength(2)
    expect(store.peers.bbbb?.state).toBe('connecting')
    expect(offersTo(sent)).toEqual(['bbbb', 'bbbb'])

    store.onSignal('0000', { sdp: { type: 'offer', sdp: 'o1' } })
    await flush()
    const answerer = FakePc.all[2]!
    expect(answerer.remote?.sdp).toBe('o1')
    answerer.setConnection('failed')
    vi.advanceTimersByTime(RETRY_MS * 2)
    expect(FakePc.all).toHaveLength(3)
  })

  it('turn：清单没回音 TURN_WAIT_MS 后先用手上的（只 STUN）；清单进来后新建的连接用它；重连接回座位再发一次 voice:true；leave 全部关掉归零；申请期间离开了房间不留麦克风', async () => {
    const { store, sent, streams } = setup()
    store.onSnapshot(snap([m('aaaa'), m('bbbb', { voice: true })]), 'aaaa')
    await store.toggle()
    await flush()
    expect(FakePc.all).toHaveLength(0) // 等清单
    vi.advanceTimersByTime(TURN_WAIT_MS)
    await flush()
    expect(FakePc.all[0]!.config.iceServers).toEqual([{ urls: 'stun:stun.cloudflare.com:3478' }])
    store.onTurn([{ urls: ['turn:t'], username: 'u', credential: 'c' }], 7200)
    store.onReconnected()
    expect(sent.slice(-1)).toEqual([{ type: 'voice', on: true }])
    store.onSnapshot(snap([m('aaaa', { voice: true }), m('bbbb', { voice: true }), m('cccc', { voice: true })]), 'aaaa')
    await flush()
    expect(FakePc.all).toHaveLength(2)
    expect(FakePc.all[1]!.config.iceServers).toEqual([{ urls: ['turn:t'], username: 'u', credential: 'c' }])
    expect(sent.filter((x) => x.type === 'turn')).toHaveLength(1) // 清单还新鲜，不再要
    store.onTurn([], 0)

    store.leave()
    expect(store.enabled).toBe(false)
    expect(streams[0]!.stopped).toBe(1)
    expect(FakePc.all.every((pc) => pc.closed)).toBe(true)
    expect(store.peers).toEqual({})
    expect(store.markOf('bbbb')).toBeNull()
    store.onReconnected()
    expect(sent.at(-1)).toEqual({ type: 'voice', on: false })
    // 离开后再来的信令不理
    store.onSignal('bbbb', { sdp: { type: 'offer', sdp: 'late' } })
    await flush()
    expect(FakePc.all).toHaveLength(2)

    // 申请期间离开了房间（transport 没了）：拿到的麦克风直接释放、不算开着
    setActivePinia(createPinia())
    const late = setup()
    late.store.onSnapshot(snap([m('aaaa')]), 'aaaa')
    const p = late.store.toggle()
    late.store.attach(null)
    await p
    expect(late.store.enabled).toBe(false)
    expect(late.streams[0]!.stopped).toBe(1)
    expect(late.sent).toEqual([])
  })

  it('没开麦收声音被自动播放拦下：下一次触摸 / 按键再试一次播放；离开房间后不再管', async () => {
    FakeAudio.blockPlay = true
    const { store } = setup()
    store.onSnapshot(snap([m('aaaa'), m('bbbb', { voice: true })]), 'aaaa')
    store.onTurn(STUN, 0)
    store.onSignal('bbbb', { sdp: { type: 'offer', sdp: 'o' } })
    await flush()
    FakePc.last().emitTrack({} as MediaStream)
    await flush()
    const audio = FakeAudio.last()
    expect(audio.played).toBe(1)
    FakeAudio.blockPlay = false
    document.dispatchEvent(new Event('pointerdown'))
    await flush()
    expect(audio.played).toBe(2)
    document.dispatchEvent(new Event('keydown'))
    await flush()
    expect(audio.played).toBe(2) // 已经放出来了，不再试
    store.leave()
    document.dispatchEvent(new Event('pointerdown'))
    expect(audio.played).toBe(2)
  })

  it('ICE 清单：只听的人快照里有开麦的就先要一份；开麦后等清单回来才建连接、同时只要一次；有 TURN 的到期前一分钟再要、没回音 TURN_WAIT_MS 后先用手上的；服务器说没 TURN 十分钟内不再要', async () => {
    const { store, sent } = setup()
    store.onSnapshot(snap([m('aaaa'), m('zzzz', { voice: true })]), 'aaaa')
    expect(sent).toEqual([{ type: 'turn' }])
    await store.toggle()
    await flush()
    expect(FakePc.all).toHaveLength(0)
    expect(sent.filter((x) => x.type === 'turn')).toHaveLength(1)
    store.onTurn([{ urls: ['turn:t'], username: 'u', credential: 'c' }], 7200)
    await flush()
    expect(FakePc.all).toHaveLength(1)
    expect(FakePc.all[0]!.config.iceServers).toEqual([{ urls: ['turn:t'], username: 'u', credential: 'c' }])

    vi.setSystemTime(Date.now() + (7200 - 30) * 1000)
    store.onSnapshot(snap([m('aaaa'), m('zzzz', { voice: true }), m('yyyy', { voice: true })]), 'aaaa')
    await flush()
    expect(sent.filter((x) => x.type === 'turn')).toHaveLength(2)
    expect(FakePc.all).toHaveLength(1)
    vi.advanceTimersByTime(TURN_WAIT_MS)
    await flush()
    expect(FakePc.all).toHaveLength(2)

    setActivePinia(createPinia())
    const b = setup()
    b.store.onSnapshot(snap([m('aaaa'), m('zzzz', { voice: true })]), 'aaaa')
    b.store.onTurn(STUN, 0)
    vi.setSystemTime(Date.now() + 5 * 60 * 1000)
    await b.store.toggle()
    await flush()
    expect(b.sent.filter((x) => x.type === 'turn')).toHaveLength(1)
    expect(FakePc.all).toHaveLength(3)
  })

  it('连接状态 link：刚建不写、超过 CONNECT_SHOW_MS 写连接中、连上 ok、失败或 CONNECT_TIMEOUT_MS 没连上写连不上（重建后失败计数留着，连上才清）；只听的人没有一个开麦的会连他就是 crowded', async () => {
    const { store, enable } = setup()
    store.onSnapshot(snap([m('aaaa'), m('bbbb')]), 'aaaa')
    expect(store.link).toBe('idle')
    await enable()
    expect(FakePc.all).toHaveLength(1)
    expect(store.link).toBe('idle')
    vi.advanceTimersByTime(CONNECT_SHOW_MS + LEVEL_MS)
    expect(store.link).toBe('connecting')
    FakePc.all[0]!.setConnection('connected')
    expect(store.link).toBe('ok')
    FakePc.all[0]!.setConnection('failed')
    expect(store.link).toBe('failed')
    expect(store.peers.bbbb?.fails).toBe(1)
    vi.advanceTimersByTime(RETRY_MS)
    await flush()
    expect(FakePc.all).toHaveLength(2)
    expect(store.peers.bbbb?.state).toBe('connecting')
    expect(store.link).toBe('failed') // 失败过就一直写着，直到连上
    FakePc.all[1]!.setConnection('connected')
    expect(store.link).toBe('ok')
    expect(store.peers.bbbb?.fails).toBe(0)

    setActivePinia(createPinia())
    const b = setup()
    b.store.onSnapshot(snap([m('aaaa'), m('bbbb')]), 'aaaa')
    await b.enable()
    vi.advanceTimersByTime(CONNECT_TIMEOUT_MS + LEVEL_MS)
    expect(b.store.link).toBe('failed')

    setActivePinia(createPinia())
    const c = setup()
    const crowd = [m('zzzz', { joinedAt: 99 }), m('s', { voice: true }), ...Array.from({ length: 6 }, (_, i) => m(`l${i}`, { joinedAt: i }))]
    c.store.onSnapshot(snap(crowd), 'zzzz')
    expect(c.store.link).toBe('crowded')
    c.store.onSnapshot(snap(crowd.slice(0, 7)), 'zzzz')
    expect(c.store.link).toBe('idle')
  })

  it('麦克风被系统收回：音轨 ended → 自动关麦、提示 lost、发 voice:false；静音期间 muted；回到前台发现音轨已结束也当收回；再点一下重新申请', async () => {
    const { store, sent, streams, enable } = setup()
    store.onSnapshot(snap([m('aaaa'), m('bbbb')]), 'aaaa')
    await enable()
    expect(store.enabled).toBe(true)
    streams[0]!.mute()
    expect(store.muted).toBe(true)
    streams[0]!.unmute()
    expect(store.muted).toBe(false)
    streams[0]!.end()
    expect(store.enabled).toBe(false)
    expect(store.error).toBe('lost')
    expect(sent.at(-1)).toEqual({ type: 'voice', on: false })
    expect(FakePc.all.every((pc) => pc.closed)).toBe(true)

    await enable()
    expect(store.enabled).toBe(true)
    expect(streams).toHaveLength(2)
    streams[1]!.track.readyState = 'ended'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(store.enabled).toBe(false)
    expect(store.error).toBe('lost')
    // 正常关麦不算收回
    await enable()
    store.disable()
    expect(store.error).toBeNull() // 正常关麦没有提示
    expect(streams[2]!.stopped).toBe(1)
  })

  it('别人说话时压低朗读：对方音量过阈值 duck(true)，停了 DUCK_HOLD_MS 后 duck(false)；离开恢复', async () => {
    const { store, ducks } = setup()
    store.onSnapshot(snap([m('aaaa'), m('bbbb', { voice: true })]), 'aaaa')
    store.onTurn(STUN, 0)
    store.onSignal('bbbb', { sdp: { type: 'offer', sdp: 'o' } })
    await flush()
    const pc = FakePc.last()
    pc.level = 0.5
    vi.advanceTimersByTime(LEVEL_MS)
    expect(ducks).toEqual([true])
    pc.level = 0
    vi.advanceTimersByTime(DUCK_HOLD_MS - LEVEL_MS)
    expect(ducks).toEqual([true])
    vi.advanceTimersByTime(LEVEL_MS * 2)
    expect(ducks).toEqual([true, false])
    pc.level = 0.5
    vi.advanceTimersByTime(LEVEL_MS)
    expect(ducks).toEqual([true, false, true])
    store.leave()
    expect(ducks.at(-1)).toBe(false)
  })

  it('应答时清单还没到：等的时候又来了新 offer 就从新的开始；清单没回音 TURN_WAIT_MS 后用手上的（只 STUN）；等的时候离开了房间就都不要了', async () => {
    const { store, sent } = setup()
    store.onSnapshot(snap([m('aaaa'), m('bbbb')]), 'aaaa')
    store.onSignal('bbbb', { sdp: { type: 'offer', sdp: 'o1' } })
    store.onSignal('bbbb', { candidates: [{ candidate: 'old', sdpMid: null, sdpMLineIndex: null }] })
    store.onSignal('bbbb', { sdp: { type: 'offer', sdp: 'o2' } })
    store.onSignal('bbbb', { candidates: [{ candidate: 'new', sdpMid: null, sdpMLineIndex: null }] })
    await flush()
    expect(FakePc.all).toHaveLength(0)
    expect(sent.filter((x) => x.type === 'turn')).toHaveLength(1) // 同时只要一次
    vi.advanceTimersByTime(TURN_WAIT_MS)
    await flush()
    expect(FakePc.all).toHaveLength(1)
    expect(FakePc.all[0]!.config).toEqual({ iceServers: STUN })
    expect(FakePc.all[0]!.remote?.sdp).toBe('o2')
    expect(FakePc.all[0]!.candidates.map((c) => c.candidate)).toEqual(['new'])
    expect(sent.filter((x) => x.type === 'rtc')).toHaveLength(1)

    // 另一个房间：等清单的时候离开
    store.leave()
    store.attach({ send: (msg) => sent.push(msg) })
    store.onSnapshot(snap([m('aaaa'), m('cccc')]), 'aaaa')
    store.onSignal('cccc', { sdp: { type: 'offer', sdp: 'x' } })
    store.leave()
    vi.advanceTimersByTime(TURN_WAIT_MS)
    await flush()
    expect(FakePc.all).toHaveLength(1)
  })

  it('时序：开麦的人的 offer 常比「他开了麦」的快照先到（快照广播有节流）——先要清单、等回来再应答（带着 TURN），期间的候选不丢；之后快照来了连接留着不重建（联调撞过）', async () => {
    const { store, sent } = setup()
    store.onSnapshot(snap([m('aaaa'), m('bbbb')]), 'aaaa')
    expect(sent).toEqual([]) // 快照里还没人开麦：没去要清单
    store.onSignal('bbbb', { sdp: { type: 'offer', sdp: 'o1' } })
    store.onSignal('bbbb', { candidates: [{ candidate: 'c1', sdpMid: null, sdpMLineIndex: null }] })
    await flush()
    expect(FakePc.all).toHaveLength(0) // 只带 STUN 的连接没有中转候选：先等清单
    expect(sent).toEqual([{ type: 'turn' }])
    const TURN = [...STUN, { urls: ['turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'p' }]
    store.onTurn(TURN, 3600)
    await flush()
    expect(FakePc.all).toHaveLength(1)
    expect(FakePc.all[0]!.config).toEqual({ iceServers: TURN })
    expect(FakePc.all[0]!.remote?.sdp).toBe('o1')
    expect(FakePc.all[0]!.candidates).toHaveLength(1)
    expect(sent.filter((x) => x.type === 'rtc')).toHaveLength(1)
    store.onSnapshot(snap([m('aaaa'), m('bbbb', { voice: true })]), 'aaaa')
    await flush()
    expect(FakePc.all).toHaveLength(1)
    expect(FakePc.all[0]!.closed).toBe(false)
    expect(store.peers.bbbb?.state).toBe('connecting')
    // 再来几份快照（比赛中快照很勤）也不动
    store.onSnapshot(snap([m('aaaa'), m('bbbb', { voice: true })]), 'aaaa')
    expect(FakePc.all[0]!.closed).toBe(false)
    // 他关麦：关掉
    store.onSnapshot(snap([m('aaaa'), m('bbbb')]), 'aaaa')
    expect(FakePc.all[0]!.closed).toBe(true)
  })
})
