import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import type { ClientMsg, ServerMsg } from '@/battle/protocol'
import { createBattleServer, type BattleServer } from '../index'

/** 一个测试客户端：收到的消息排队，按条件等 */
class Client {
  ws: WebSocket
  inbox: ServerMsg[] = []
  private waiters: { test: (m: ServerMsg) => boolean; resolve: (m: ServerMsg) => void }[] = []
  constructor(port: number) {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}/ws`)
    this.ws.on('message', (d) => {
      const m = JSON.parse(d.toString()) as ServerMsg
      this.inbox.push(m)
      const i = this.waiters.findIndex((w) => w.test(m))
      if (i >= 0) this.waiters.splice(i, 1)[0]!.resolve(m)
    })
  }
  open(): Promise<void> {
    return new Promise((r) => this.ws.once('open', () => r()))
  }
  send(m: ClientMsg): void {
    this.ws.send(JSON.stringify(m))
  }
  /** 先在收件箱里找，没有就等（最多 3 秒） */
  wait(test: (m: ServerMsg) => boolean): Promise<ServerMsg> {
    const i = this.inbox.findIndex(test)
    if (i >= 0) return Promise.resolve(this.inbox.splice(i, 1)[0]!)
    return new Promise((resolve, reject) => {
      const t = setTimeout(
        () =>
          reject(
            new Error(
              '等消息超时；收件箱：' +
                JSON.stringify(this.inbox.map((m) => (m.type === 'state' ? `state:${m.room.match?.phase ?? 'lobby'}:${m.room.members.length}` : m.type === 'event' ? `event:${m.e.type}` : m.type === 'error' ? `error:${m.error}` : m.type))),
            ),
          ),
        3000,
      )
      this.waiters.push({
        test,
        resolve: (m) => {
          clearTimeout(t)
          this.inbox.splice(this.inbox.indexOf(m), 1)
          resolve(m)
        },
      })
    })
  }
  state(pred: (s: Extract<ServerMsg, { type: 'state' }>) => boolean = () => true): Promise<Extract<ServerMsg, { type: 'state' }>> {
    return this.wait((m) => m.type === 'state' && pred(m)) as Promise<Extract<ServerMsg, { type: 'state' }>>
  }
  close(): void {
    this.ws.close()
  }
}

let server: BattleServer
const logs: string[] = []
beforeAll(async () => {
  server = await createBattleServer({ port: 0, schedule: (fn) => setTimeout(fn, 20), log: (l) => logs.push(l) })
})
afterAll(async () => {
  await server.close()
})

describe('中继服务（B41–B46）', () => {
  it('建房 → 加入 → 就绪 → 开始 → 倒数 → 开打 → 答题 → 结束 → 再来一局 → 离开；重连接回座位；错版本 / 错房间号被拒', async () => {
    const a = new Client(server.port)
    const b = new Client(server.port)
    await Promise.all([a.open(), b.open()])
    a.send({ type: 'hello', clientId: 'aaaaaa', name: '小兔', version: 'v1' })
    a.send({ type: 'create', kpId: 's1-05-carry-add', skin: 'race' })
    const created = await a.state()
    const code = created.room.code
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(created.you).toBe('aaaaaa')
    expect(created.room.hostId).toBe('aaaaaa')
    expect(server.rooms.size).toBe(1)

    b.send({ type: 'hello', clientId: 'bbbbbb', name: '小虎', version: 'v1', code, t: 'blue' })
    const joinedB = await b.state()
    expect(joinedB.room.members.map((m) => [m.clientId, m.role])).toEqual([
      ['aaaaaa', 'red'],
      ['bbbbbb', 'blue'],
    ])
    a.send({ type: 'team', role: 'red' })
    a.send({ type: 'ready', ready: true })
    b.send({ type: 'ready', ready: true })
    await b.state((s) => s.room.members.every((m) => m.ready))
    a.send({ type: 'start' })
    const countdown = await a.wait((m) => m.type === 'event' && m.e.type === 'countdown')
    expect(countdown.type).toBe('event')
    await b.wait((m) => m.type === 'event' && m.e.type === 'go')
    const play = await b.state((s) => s.room.match?.phase === 'playing')
    expect(play.room.match!.players.map((p) => p.team)).toEqual(['red', 'blue'])

    a.send({ type: 'answer', index: 0, given: '7', correct: true })
    const point = await b.wait((m) => m.type === 'event' && m.e.type === 'point')
    expect(point.type === 'event' && point.e.type === 'point' && point.e.team).toBe('red')
    await b.state((s) => s.room.match?.score.red === 1)
    b.send({ type: 'input', input: '4' })
    await a.state((s) => s.room.match?.players[1]?.input === '4')
    for (let i = 1; i < 8; i++) a.send({ type: 'answer', index: i, given: '7', correct: true })
    await b.wait((m) => m.type === 'event' && m.e.type === 'finished')
    const ended = await b.state((s) => s.room.match?.phase === 'ended')
    expect(ended.room.match!.winner).toBe('red')

    b.send({ type: 'rematch' })
    const notHost = await b.wait((m) => m.type === 'error')
    expect(notHost.type === 'error' && notHost.error).toBe('notHost')
    a.send({ type: 'rematch' })
    // 测试里倒数只有 20 ms，快照按 100 ms 节流会把倒数那份合掉：等倒数事件，再等开打后的快照
    await b.wait((m) => m.type === 'event' && m.e.type === 'countdown')
    const again = await b.state((s) => s.room.match?.phase === 'playing' && s.room.match.score.red === 0)
    expect(again.room.match!.players.map((p) => p.correct)).toEqual([0, 0])

    // 重连：同一 clientId 再 hello 进同一房间，接回座位；旧连接被顶掉
    const b2 = new Client(server.port)
    await b2.open()
    b2.send({ type: 'hello', clientId: 'bbbbbb', name: '小虎', version: 'v1', code, t: 'red' })
    const back = await b2.state()
    expect(back.room.members.find((m) => m.clientId === 'bbbbbb')!.role).toBe('blue')
    const replaced = await b.wait((m) => m.type === 'error')
    expect(replaced.type === 'error' && replaced.error).toBe('replaced')

    const c = new Client(server.port)
    await c.open()
    c.send({ type: 'hello', clientId: 'cccccc', name: '路人', version: 'v2', code, t: 'red' })
    const bad = await c.wait((m) => m.type === 'error')
    expect(bad.type === 'error' && bad.error).toBe('version')
    c.send({ type: 'hello', clientId: 'cccccc', name: '路人', version: 'v1', code: 'ZZZZZZ' })
    const none = await c.wait((m) => m.type === 'error')
    expect(none.type === 'error' && none.error).toBe('noRoom')
    c.send({ type: 'ping' })
    await c.wait((m) => m.type === 'pong')

    b2.send({ type: 'leave' })
    await a.state((s) => s.room.members.length === 1)
    a.close()
    b2.close()
    c.close()
    expect(logs[0]).toContain('/ws')
  })

  it('没先 hello 就发别的 → bad；超过 4 KB 的消息被断开', async () => {
    const x = new Client(server.port)
    await x.open()
    x.send({ type: 'ready', ready: true })
    const e = await x.wait((m) => m.type === 'error')
    expect(e.type === 'error' && e.error).toBe('bad')
    const closed = new Promise<number>((r) => x.ws.once('close', (code) => r(code)))
    x.ws.send('x'.repeat(5000))
    expect(await closed).toBeGreaterThan(1000)
  })
})
