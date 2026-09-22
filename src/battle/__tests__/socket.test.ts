import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IceServer, RoomSnapshot, RtcSignal, ServerMsg } from '@/battle/protocol'
import { BACKOFF_MS, PING_MS, RoomClient, socketUrl, type RoomClientOptions, type SocketStatus } from '../socket'
import { FakeWs } from './fake-socket'

const SNAP: RoomSnapshot = { code: 'ABC234', kpId: 's1-05-carry-add', skin: 'race', hostId: 'aaaaaa', locked: false, createdAt: 0, members: [], match: null, passcodes: { red: '111111', blue: '222222', watch: '333333' } }

function client(overrides: Partial<RoomClientOptions> = {}) {
  const calls = { state: [] as [RoomSnapshot, string, number][], events: [] as unknown[], errors: [] as string[], status: [] as SocketStatus[] }
  const c = new RoomClient({
    url: 'ws://x/ws',
    clientId: 'aaaaaa',
    name: '小兔',
    version: 'v1',
    onState: (r, y, n) => calls.state.push([r, y, n]),
    onEvent: (e) => calls.events.push(e),
    onError: (e) => calls.errors.push(e),
    onStatus: (s) => calls.status.push(s),
    factory: (url) => new FakeWs(url),
    jitter: () => 0,
    ...overrides,
  })
  return { c, calls }
}

beforeEach(() => {
  vi.useFakeTimers()
  FakeWs.reset()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('socketUrl（B46）', () => {
  it('同源 /ws：https → wss、http → ws；file:// 或没有 location 就 null', () => {
    expect(socketUrl({ protocol: 'https:', host: 'tongbulian.example' } as Location)).toBe('wss://tongbulian.example/ws')
    expect(socketUrl({ protocol: 'http:', host: 'localhost:5173' } as Location)).toBe('ws://localhost:5173/ws')
    expect(socketUrl({ protocol: 'file:', host: '' } as Location)).toBeNull()
    expect(socketUrl(undefined)).toBeNull()
  })
})

describe('RoomClient（B23 / B42 / B44）', () => {
  it('连上先 hello（带房间号与默认身份），没连上时发的消息攒着跟在后面；收到 state / event / error 各自回调；每 25 秒 ping', () => {
    const { c, calls } = client()
    c.connect('ABC234', 'red')
    expect(c.status).toBe('connecting')
    c.send({ type: 'ready', ready: true })
    const ws = FakeWs.last()
    expect(ws.url).toBe('ws://x/ws')
    expect(ws.sent).toEqual([])
    ws.open()
    expect(c.status).toBe('open')
    expect(ws.msgs).toEqual([
      { type: 'hello', clientId: 'aaaaaa', name: '小兔', version: 'v1', code: 'ABC234', t: 'red' },
      { type: 'ready', ready: true },
    ])
    c.send({ type: 'start' })
    expect(ws.msgs[2]).toEqual({ type: 'start' })

    ws.receive({ type: 'state', room: SNAP, you: 'aaaaaa', now: 12345 })
    expect(calls.state).toEqual([[SNAP, 'aaaaaa', 12345]])
    ws.receive({ type: 'event', e: { type: 'go' } })
    expect(calls.events).toEqual([{ type: 'go' }])
    ws.receive({ type: 'error', error: 'teamFull' })
    expect(calls.errors).toEqual(['teamFull'])
    expect(c.status).toBe('open')
    ws.onmessage!({ data: '{oops' }) // 坏消息忽略
    ws.receive({ type: 'pong' })

    vi.advanceTimersByTime(PING_MS)
    expect(ws.msgs[ws.msgs.length - 1]).toEqual({ type: 'ping' })
    expect(calls.status).toEqual(['connecting', 'open'])
  })

  it('断线按 1、2、4、8、8 秒退避重连，连上后重新 hello 进原房间、退避归零；断线后不再对死连接 ping', () => {
    const { c } = client()
    c.connect('ABC234')
    const first = FakeWs.last()
    first.open()
    const pings = first.msgs.length
    first.drop()
    expect(c.status).toBe('reconnecting')
    expect(FakeWs.all).toHaveLength(1)
    vi.advanceTimersByTime(BACKOFF_MS[0]!)
    expect(FakeWs.all).toHaveLength(2)
    FakeWs.last().drop()
    vi.advanceTimersByTime(BACKOFF_MS[1]! - 1)
    expect(FakeWs.all).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(FakeWs.all).toHaveLength(3)
    FakeWs.last().drop()
    vi.advanceTimersByTime(BACKOFF_MS[2]!)
    expect(FakeWs.all).toHaveLength(4)
    FakeWs.last().drop()
    vi.advanceTimersByTime(BACKOFF_MS[3]!)
    expect(FakeWs.all).toHaveLength(5)
    FakeWs.last().drop()
    vi.advanceTimersByTime(BACKOFF_MS[3]!)
    expect(FakeWs.all).toHaveLength(6)

    const back = FakeWs.last()
    back.open()
    expect(c.status).toBe('open')
    expect(back.msgs[0]).toEqual({ type: 'hello', clientId: 'aaaaaa', name: '小兔', version: 'v1', code: 'ABC234', t: undefined })
    vi.advanceTimersByTime(PING_MS)
    expect(first.msgs).toHaveLength(pings) // 死连接不再 ping
    expect(back.msgs[back.msgs.length - 1]).toEqual({ type: 'ping' })
    back.drop()
    vi.advanceTimersByTime(BACKOFF_MS[0]!)
    expect(FakeWs.all).toHaveLength(7)
  })

  it('kick()：正在等退避时立刻再连一次；连着 / 关了都不动', () => {
    const { c } = client()
    c.connect('ABC234')
    FakeWs.last().open()
    c.kick()
    expect(FakeWs.all).toHaveLength(1)
    FakeWs.last().drop()
    c.kick()
    expect(FakeWs.all).toHaveLength(2)
    expect(c.status).toBe('reconnecting')
    FakeWs.last().open()
    expect(c.status).toBe('open')
    c.close()
    c.kick()
    expect(FakeWs.all).toHaveLength(2)
  })

  it('被顶掉 / 房间没了 / 版本不对：不再重连；close() 之后也不重连，再发的消息只攒着不报错', () => {
    const a = client()
    a.c.connect('ABC234')
    FakeWs.last().open()
    FakeWs.last().receive({ type: 'error', error: 'replaced' })
    expect(a.calls.errors).toEqual(['replaced'])
    expect(a.c.code).toBeNull()
    FakeWs.last().drop()
    expect(a.c.status).toBe('closed')
    vi.advanceTimersByTime(60_000)
    expect(FakeWs.all).toHaveLength(1)

    FakeWs.reset()
    const b = client()
    b.c.connect('ABC234')
    const ws = FakeWs.last()
    ws.open()
    b.c.close()
    expect(ws.closed).toBe(true)
    expect(b.c.status).toBe('closed')
    b.c.send({ type: 'ping' })
    vi.advanceTimersByTime(60_000)
    expect(FakeWs.all).toHaveLength(1)
    expect(ws.msgs.filter((m) => m.type === 'ping')).toHaveLength(0)
  })

  it('建不出连接（构造就抛）也按退避再试', () => {
    let tries = 0
    const { c } = client({
      factory: () => {
        tries += 1
        throw new Error('no WebSocket')
      },
    })
    c.connect()
    expect(tries).toBe(1)
    expect(c.status).toBe('reconnecting')
    vi.advanceTimersByTime(BACKOFF_MS[0]!)
    expect(tries).toBe(2)
    c.close()
    vi.advanceTimersByTime(60_000)
    expect(tries).toBe(2)
  })
})

describe('语音信令（B57）', () => {
  it('rtc / turn 各自回调，形状不对的丢掉；ICE 清单只留合法的、ttl 非正数当 0', () => {
    const rtc: [string, RtcSignal][] = []
    const turn: [IceServer[], number][] = []
    const { c } = client({ onRtc: (f, d) => rtc.push([f, d]), onTurn: (l, t) => turn.push([l, t]) })
    c.connect('ABC234')
    const ws = FakeWs.last()
    ws.open()
    ws.receive({ type: 'rtc', from: 'bbbb', data: { sdp: { type: 'offer', sdp: 'o' } } })
    ws.receive({ type: 'rtc', from: 'bbbb', data: { nope: 1 } } as unknown as ServerMsg)
    ws.receive({ type: 'rtc', from: 5, data: { candidates: [] } } as unknown as ServerMsg)
    ws.receive({ type: 'turn', iceServers: [{ urls: 'stun:x' }, { bad: 1 }], ttl: 100 } as unknown as ServerMsg)
    ws.receive({ type: 'turn', iceServers: 'x', ttl: -1 } as unknown as ServerMsg)
    expect(rtc).toEqual([['bbbb', { sdp: { type: 'offer', sdp: 'o' } }]])
    expect(turn).toEqual([
      [[{ urls: ['stun:x'] }], 100],
      [[], 0],
    ])
    c.send({ type: 'rtc', to: 'bbbb', data: { candidates: [] } })
    expect(ws.msgs.at(-1)).toEqual({ type: 'rtc', to: 'bbbb', data: { candidates: [] } })
  })
})
