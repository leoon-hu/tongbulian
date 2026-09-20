import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import type { ClientMsg, ServerMsg } from '@/battle/protocol'
import { MAX_BAD_PASS, MAX_BAD_PASS_PER_IP, MAX_CONNS_PER_IP, clientIp, createBattleServer, type BattleServer } from '../index'

/** 一个测试客户端：收到的消息排队，按条件等 */
class Client {
  ws: WebSocket
  inbox: ServerMsg[] = []
  private waiters: { test: (m: ServerMsg) => boolean; resolve: (m: ServerMsg) => void }[] = []
  constructor(port: number, headers: Record<string, string> = {}) {
    this.ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { headers })
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
  it('建房 → 加入 → 两队齐了自动开始 → 倒数 → 开打 → 答题 → 结束 → 再来一局 → 离开；重连接回座位；错版本 / 错房间号被拒', async () => {
    const a = new Client(server.port)
    const b = new Client(server.port)
    await Promise.all([a.open(), b.open()])
    a.send({ type: 'hello', clientId: 'aaaaaa', name: '小兔', version: 'v1' })
    a.send({ type: 'create', kpId: 's1-05-carry-add', skin: 'race' })
    const created = await a.state()
    const code = created.room.code
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    // 对外身份是 clientId 的哈希（B45a）：快照里看不到 clientId 本身，别人拿不到就冒充不了
    const A = created.you
    expect(A).toMatch(/^[A-Za-z0-9_-]{16}$/)
    expect(A).not.toBe('aaaaaa')
    expect(JSON.stringify(created)).not.toContain('aaaaaa')
    expect(created.room.hostId).toBe(A)
    expect(server.rooms.size).toBe(1)
    expect(Object.values(created.room.passcodes).every((p) => /^[1-9][0-9]{5}$/.test(p))).toBe(true)

    // 口令（B19）：另一个连接 hello 后 lookup → found（房间号 + 身份）；不认识的口令 noRoom，连错 MAX_BAD_PASS 次断开
    const d = new Client(server.port)
    await d.open()
    d.send({ type: 'hello', clientId: 'dddddd', name: '口令', version: 'v1' })
    d.send({ type: 'lookup', pass: created.room.passcodes.blue })
    expect(await d.wait((m) => m.type === 'found')).toEqual({ type: 'found', code, t: 'blue' })
    d.send({ type: 'lookup', pass: '000000' })
    const miss = await d.wait((m) => m.type === 'error')
    expect(miss.type === 'error' && miss.error).toBe('noRoom')
    const dClosed = new Promise<number>((r) => d.ws.once('close', (c) => r(c)))
    const wrong = ['999999', '999998', '999997', '999996', '999995'].filter((p) => !Object.values(created.room.passcodes).includes(p))
    for (let i = 1; i < MAX_BAD_PASS; i++) d.send({ type: 'lookup', pass: wrong[i]! })
    expect(await dClosed).toBe(4002)

    b.send({ type: 'hello', clientId: 'bbbbbb', name: '小虎', version: 'v1', code, t: 'blue' })
    const joinedB = await b.state()
    const B = joinedB.you
    expect(joinedB.room.members.map((m) => [m.clientId, m.role])).toEqual([
      [A, 'watch'],
      [B, 'blue'],
    ])
    // 主持人自己也进红队：两队都有人了，服务器自动开始（B21）
    a.send({ type: 'team', role: 'red' })
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

    b.send({ type: 'rematch' }) // 谁都能按（B9）
    // 测试里倒数只有 20 ms，快照按 100 ms 节流会把倒数那份合掉：等倒数事件，再等开打后的快照
    await b.wait((m) => m.type === 'event' && m.e.type === 'countdown')
    const again = await b.state((s) => s.room.match?.phase === 'playing' && s.room.match.score.red === 0)
    expect(again.room.match!.players.map((p) => p.correct)).toEqual([0, 0])

    // 重连：同一 clientId 再 hello 进同一房间，接回座位；旧连接被顶掉
    const b2 = new Client(server.port)
    await b2.open()
    b2.send({ type: 'hello', clientId: 'bbbbbb', name: '小虎', version: 'v1', code, t: 'red' })
    const back = await b2.state()
    expect(back.you).toBe(B)
    expect(back.room.members.find((m) => m.clientId === B)!.role).toBe('blue')
    const replaced = await b.wait((m) => m.type === 'error')
    expect(replaced.type === 'error' && replaced.error).toBe('replaced')
    // 拿着快照里的公开身份冒充别人（B45a）：那不是 clientId，进来只是另一个新成员，顶不掉 b2
    const fake = new Client(server.port)
    await fake.open()
    fake.send({ type: 'hello', clientId: B.replace(/[^A-Za-z0-9_-]/g, 'x').padEnd(6, 'x'), name: '冒充', version: 'v1', code, t: 'watch' })
    const fakeIn = await fake.state()
    expect(fakeIn.you).not.toBe(B)
    expect(fakeIn.room.members.filter((m) => m.clientId === B)).toHaveLength(1)
    expect(fakeIn.room.members.find((m) => m.clientId === B)!.online).toBe(true)
    fake.send({ type: 'leave' })
    await a.state((s) => s.room.members.length === 2 && s.room.members.every((m) => m.clientId === A || m.clientId === B))
    fake.close()

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
    // 知识点 / 皮肤 id 只认格式（B45a）：带路径、大写、太长的都 bad
    c.send({ type: 'hello', clientId: 'cccccc', name: '路人', version: 'v1' })
    c.send({ type: 'create', kpId: '../etc', skin: 'race' })
    const badKp = await c.wait((m) => m.type === 'error')
    expect(badKp.type === 'error' && badKp.error).toBe('bad')
    c.send({ type: 'create', kpId: 's1-05-carry-add', skin: 'Race<b>' })
    const badSkin = await c.wait((m) => m.type === 'error')
    expect(badSkin.type === 'error' && badSkin.error).toBe('bad')

    b2.send({ type: 'leave' })
    await a.state((s) => s.room.members.length === 1)
    a.close()
    b2.close()
    c.close()
    expect(logs[0]).toContain('/ws')
  })

  it('不玩了（B9）：结束后谁发 quit，房间里每个连接都收到 closed、房间销毁', async () => {
    const a = new Client(server.port)
    const b = new Client(server.port)
    await Promise.all([a.open(), b.open()])
    a.send({ type: 'hello', clientId: 'qa0001', name: '甲', version: 'v1' })
    a.send({ type: 'create', kpId: 's1-05-carry-add', skin: 'race' })
    const created = await a.state()
    const code = created.room.code
    a.send({ type: 'team', role: 'red' })
    b.send({ type: 'hello', clientId: 'qb0001', name: '乙', version: 'v1', code, t: 'blue' })
    await b.wait((m) => m.type === 'event' && m.e.type === 'go')
    await b.state((s) => s.room.match?.phase === 'playing')
    for (let i = 0; i < 8; i++) b.send({ type: 'answer', index: i, given: '7', correct: true })
    await a.state((s) => s.room.match?.phase === 'ended')
    const before = server.rooms.size
    b.send({ type: 'quit' })
    const ca = await a.wait((m) => m.type === 'error')
    const cb = await b.wait((m) => m.type === 'error')
    expect(ca.type === 'error' && ca.error).toBe('closed')
    expect(cb.type === 'error' && cb.error).toBe('closed')
    expect(server.rooms.size).toBe(before - 1)
    a.close()
    b.close()
  })

  it('服务器有版本时（B43）：hello 的版本不一致直接回 version（建房 / 查口令都进不了），一致的照常', async () => {
    const vs = await createBattleServer({ port: 0, version: 'v7', log: () => {} })
    try {
      const old = new Client(vs.port)
      await old.open()
      old.send({ type: 'hello', clientId: 'old001', name: '旧页面', version: 'v1' })
      const e = await old.wait((m) => m.type === 'error')
      expect(e.type === 'error' && e.error).toBe('version')
      old.send({ type: 'create', kpId: 's1-05-carry-add', skin: 'race' })
      const e2 = await old.wait((m) => m.type === 'error')
      expect(e2.type === 'error' && e2.error).toBe('bad') // 没通过 hello，不算登记
      const fresh = new Client(vs.port)
      await fresh.open()
      fresh.send({ type: 'hello', clientId: 'new001', name: '新页面', version: 'v7' })
      fresh.send({ type: 'create', kpId: 's1-05-carry-add', skin: 'race' })
      const created = await fresh.state()
      expect(created.room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
      old.close()
      fresh.close()
    } finally {
      await vs.close()
    }
  })

  it('来源名单（B45a）：设了 origins 的服务只接受名单里的 Origin，别的握手直接被拒；没设就不限', async () => {
    const vs = await createBattleServer({ port: 0, origins: ['https://tongbulian.example'], log: () => {} })
    try {
      const ok = new Client(vs.port, { origin: 'https://tongbulian.example' })
      await ok.open()
      ok.send({ type: 'ping' })
      await ok.wait((m) => m.type === 'pong')
      ok.close()
      for (const headers of [{ origin: 'https://evil.example' }, {} as Record<string, string>]) {
        const bad = new Client(vs.port, headers)
        const rejected = await new Promise<boolean>((r) => {
          bad.ws.once('unexpected-response', () => r(true))
          bad.ws.once('error', () => r(true))
          bad.ws.once('open', () => r(false))
        })
        expect(rejected).toBe(true)
      }
    } finally {
      await vs.close()
    }
    const any = new Client(server.port, { origin: 'https://whatever.example' })
    await any.open()
    any.close()
  })

  it('同一个 IP 的连接数上限（B45a）：超过 MAX_CONNS_PER_IP 的握手被拒，断开后又能连；IP 从代理头取', async () => {
    const ip = { 'x-real-ip': '203.0.113.9' }
    const held: Client[] = []
    for (let i = 0; i < MAX_CONNS_PER_IP; i++) held.push(new Client(server.port, ip))
    await Promise.all(held.map((c) => c.open()))
    const extra = new Client(server.port, ip)
    const rejected = await new Promise<boolean>((r) => {
      extra.ws.once('unexpected-response', () => r(true))
      extra.ws.once('error', () => r(true))
      extra.ws.once('open', () => r(false))
    })
    expect(rejected).toBe(true)
    // 别的 IP 不受影响
    const other = new Client(server.port, { 'x-real-ip': '203.0.113.10' })
    await other.open()
    other.close()
    const closedOne = new Promise<void>((r) => held[0]!.ws.once('close', () => r()))
    held[0]!.close()
    await closedOne
    await new Promise((r) => setTimeout(r, 20))
    const again = new Client(server.port, ip)
    await again.open()
    again.close()
    for (const c of held.slice(1)) c.close()
    expect(clientIp({ headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' }, socket: { remoteAddress: '127.0.0.1' } as never })).toBe('198.51.100.7')
    expect(clientIp({ headers: { 'cf-connecting-ip': '198.51.100.8' }, socket: { remoteAddress: '127.0.0.1' } as never })).toBe('198.51.100.8')
    expect(clientIp({ headers: {}, socket: { remoteAddress: '127.0.0.1' } as never })).toBe('127.0.0.1')
  })

  it('猜口令（B45a）：同一个 IP 换着连接猜，错满 MAX_BAD_PASS_PER_IP 次后一律 busy，别的 IP 照常', async () => {
    const vs = await createBattleServer({ port: 0, log: () => {} })
    try {
      const ip = { 'x-real-ip': '203.0.113.99' }
      let tried = 0
      let pass = 200000
      while (tried < MAX_BAD_PASS_PER_IP) {
        const g = new Client(vs.port, ip)
        await g.open()
        g.send({ type: 'hello', clientId: `guess${tried}`, name: '猜', version: 'v1' })
        const closed = new Promise<void>((r) => g.ws.once('close', () => r()))
        for (let i = 0; i < MAX_BAD_PASS && tried < MAX_BAD_PASS_PER_IP; i++, tried++) {
          g.send({ type: 'lookup', pass: String(pass++) })
          const e = await g.wait((m) => m.type === 'error')
          expect(e.type === 'error' && e.error).toBe('noRoom')
        }
        if (tried % MAX_BAD_PASS === 0) await closed
        else g.close()
      }
      const blocked = new Client(vs.port, ip)
      await blocked.open()
      blocked.send({ type: 'hello', clientId: 'guessed', name: '猜', version: 'v1' })
      blocked.send({ type: 'lookup', pass: '123456' })
      const e = await blocked.wait((m) => m.type === 'error')
      expect(e.type === 'error' && e.error).toBe('busy')
      blocked.close()
      const other = new Client(vs.port, { 'x-real-ip': '203.0.113.100' })
      await other.open()
      other.send({ type: 'hello', clientId: 'honest', name: '正常', version: 'v1' })
      other.send({ type: 'lookup', pass: '123456' })
      const e2 = await other.wait((m) => m.type === 'error')
      expect(e2.type === 'error' && e2.error).toBe('noRoom')
      other.close()
    } finally {
      await vs.close()
    }
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
