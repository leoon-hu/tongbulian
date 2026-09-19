/**
 * 对战中继服务（需求 B41–B49）：WebSocket 一层薄壳——连接、房间表、心跳、限流、节流广播；
 * 房间与比赛逻辑都在 room.ts（纯函数）。只在内存里，不落库、不记内容日志。
 * 生产：nginx 把 wss://<域名>/ws 反代到这里（默认 127.0.0.1:8787）；开发：Vite 把 /ws 代理过来。
 * 运行：node dist-server/battle.mjs（npm run build:server 打成单文件，含 ws）。环境变量 PORT / HOST。
 */
import { pathToFileURL } from 'node:url'
import { WebSocketServer, type WebSocket } from 'ws'
import type { ClientMsg, RoomError, ServerMsg } from '@/battle/protocol'
import { apply, autoStart, createRoom, expired, isCode, join, makeCode, reassignHost, setOnline, snapshot, tick, type Effect, type Room } from './room'

export const MAX_ROOMS = 500
export const MAX_MSG_BYTES = 4096
export const RATE_PER_SEC = 20
export const HEARTBEAT_MS = 60_000
export const BROADCAST_MS = 100
/** 心跳 / 交接 / GC 的检查间隔（测试可注入） */
export const SWEEP_MS = 10_000

interface Conn {
  ws: WebSocket
  clientId: string | null
  name: string
  version: string
  code: string | null
  lastSeen: number
  /** 限流：这一秒收了几条 */
  windowStart: number
  count: number
}

export interface BattleServerOptions {
  port?: number
  host?: string
  now?: () => number
  /** 倒数到点的定时（测试可注入） */
  schedule?: (fn: () => void, ms: number) => void
  seed?: () => number
  log?: (line: string) => void
  /** 心跳 / 交接 / GC 的间隔（测试注入短一点） */
  sweepMs?: number
}

export interface BattleServer {
  wss: WebSocketServer
  rooms: Map<string, Room>
  port: number
  close(): Promise<void>
}

export function createBattleServer(opts: BattleServerOptions = {}): Promise<BattleServer> {
  const now = opts.now ?? Date.now
  const schedule = opts.schedule ?? ((fn, ms) => setTimeout(fn, Math.max(0, ms)))
  const seed = opts.seed ?? (() => Math.floor(Math.random() * 2 ** 31))
  const log = opts.log ?? ((line: string) => console.log(line))
  const rooms = new Map<string, Room>()
  const conns = new Set<Conn>()
  const pendingFlush = new Set<string>()

  function send(ws: WebSocket, msg: ServerMsg): void {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
  }
  function fail(ws: WebSocket, error: RoomError): void {
    send(ws, { type: 'error', error })
  }
  function connsOf(code: string): Conn[] {
    const out: Conn[] = []
    for (const c of conns) if (c.code === code) out.push(c)
    return out
  }

  /** 广播整份快照，每房间最多每 BROADCAST_MS 一次（B42） */
  function flush(code: string): void {
    if (pendingFlush.has(code)) return
    pendingFlush.add(code)
    setTimeout(() => {
      pendingFlush.delete(code)
      const room = rooms.get(code)
      if (!room) return
      const snap = snapshot(room)
      const t = now()
      for (const c of connsOf(code)) if (c.clientId) send(c.ws, { type: 'state', room: snap, you: c.clientId, now: t })
    }, BROADCAST_MS)
  }

  function runEffects(code: string, effects: Effect[]): void {
    for (const e of effects) {
      if (e.type === 'broadcast') flush(code)
      else if (e.type === 'event') for (const c of connsOf(code)) send(c.ws, { type: 'event', e: e.e })
      else for (const c of connsOf(code)) if (c.clientId === e.to) fail(c.ws, e.error)
    }
  }

  function commit(code: string, res: { room: Room; effects: Effect[] }): void {
    const before = rooms.get(code)
    rooms.set(code, res.room)
    runEffects(code, res.effects)
    // 刚进入倒数：到点开打
    const m = res.room.match
    if (m && m.phase === 'countdown' && (!before?.match || before.match.phase !== 'countdown' || before.match.startedAt !== m.startedAt)) {
      const at = m.startedAt
      schedule(() => {
        const room = rooms.get(code)
        if (!room || !room.match || room.match.startedAt !== at) return
        commit(code, tick(room, Math.max(now(), at)))
      }, at - now())
    }
    // 红蓝两队都有人在线且还没开过局：自动开始（B21）；开始后 match 不为 null，这里不会再进
    const auto = autoStart(res.room, now(), seed)
    if (auto.room !== res.room) commit(code, auto)
  }

  function leaveRoom(c: Conn, remove: boolean): void {
    const code = c.code
    if (!code || !c.clientId) return
    const room = rooms.get(code)
    c.code = null
    if (!room) return
    if (remove) {
      const res = apply(room, c.clientId, { type: 'leave' }, now())
      if (res.room.members.length === 0) {
        rooms.delete(code)
        return
      }
      commit(code, res)
    } else commit(code, setOnline(room, c.clientId, false, now()))
  }

  function onHello(c: Conn, msg: Extract<ClientMsg, { type: 'hello' }>): void {
    if (typeof msg.clientId !== 'string' || !/^[A-Za-z0-9_-]{6,40}$/.test(msg.clientId) || typeof msg.version !== 'string') {
      fail(c.ws, 'bad')
      return
    }
    c.clientId = msg.clientId
    c.name = typeof msg.name === 'string' ? msg.name : ''
    c.version = msg.version.slice(0, 40)
    if (msg.code === undefined) return
    if (!isCode(msg.code)) {
      fail(c.ws, 'noRoom')
      return
    }
    const room = rooms.get(msg.code)
    if (!room) {
      fail(c.ws, 'noRoom')
      return
    }
    // 同一个 clientId 再开一个标签页：后开的顶掉先开的（B24）
    for (const other of connsOf(msg.code)) {
      if (other !== c && other.clientId === c.clientId) {
        fail(other.ws, 'replaced')
        other.code = null
        other.ws.close(4000, 'replaced')
      }
    }
    const res = join(room, { clientId: c.clientId, name: c.name, t: msg.t, version: c.version }, now())
    if (res.error === 'version' || res.error === 'full') {
      fail(c.ws, res.error)
      return
    }
    if (res.error) fail(c.ws, res.error)
    c.code = msg.code
    // 加入 / 重连的人马上拿到一份快照，别人按节流广播；两队齐了 commit 里会自动开始
    send(c.ws, { type: 'state', room: snapshot(res.room), you: c.clientId, now: now() })
    commit(msg.code, { room: res.room, effects: [{ type: 'broadcast' }] })
  }

  function onCreate(c: Conn, msg: Extract<ClientMsg, { type: 'create' }>): void {
    if (!c.clientId) {
      fail(c.ws, 'bad')
      return
    }
    if (typeof msg.kpId !== 'string' || !msg.kpId || msg.kpId.length > 64 || typeof msg.skin !== 'string' || !msg.skin || msg.skin.length > 32) {
      fail(c.ws, 'bad')
      return
    }
    if (rooms.size >= MAX_ROOMS) {
      fail(c.ws, 'busy')
      return
    }
    if (c.code) leaveRoom(c, true)
    let code = makeCode()
    while (rooms.has(code)) code = makeCode()
    const room = createRoom({ code, kpId: msg.kpId, skin: msg.skin, host: { clientId: c.clientId, name: c.name }, version: c.version, now: now() })
    rooms.set(code, room)
    c.code = code
    send(c.ws, { type: 'state', room: snapshot(room), you: c.clientId, now: now() })
  }

  function onMessage(c: Conn, data: string): void {
    const t = now()
    c.lastSeen = t
    if (t - c.windowStart >= 1000) {
      c.windowStart = t
      c.count = 0
    }
    if (++c.count > RATE_PER_SEC) return
    let msg: ClientMsg
    try {
      msg = JSON.parse(data) as ClientMsg
    } catch {
      fail(c.ws, 'bad')
      return
    }
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
      fail(c.ws, 'bad')
      return
    }
    if (msg.type === 'ping') {
      send(c.ws, { type: 'pong' })
      return
    }
    if (msg.type === 'hello') {
      onHello(c, msg)
      return
    }
    if (msg.type === 'create') {
      onCreate(c, msg)
      return
    }
    if (!c.code || !c.clientId) {
      fail(c.ws, 'bad')
      return
    }
    const room = rooms.get(c.code)
    if (!room) {
      c.code = null
      fail(c.ws, 'closed')
      return
    }
    if (msg.type === 'leave') {
      leaveRoom(c, true)
      return
    }
    commit(c.code, apply(room, c.clientId, msg, t, seed))
  }

  const wss = new WebSocketServer({ host: opts.host ?? '127.0.0.1', port: opts.port ?? 8787, path: '/ws', maxPayload: MAX_MSG_BYTES })

  wss.on('connection', (ws) => {
    const c: Conn = { ws, clientId: null, name: '', version: '', code: null, lastSeen: now(), windowStart: now(), count: 0 }
    conns.add(c)
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        ws.close(1003, 'text only')
        return
      }
      onMessage(c, data.toString())
    })
    ws.on('close', () => {
      conns.delete(c)
      leaveRoom(c, false)
    })
    ws.on('error', () => {
      /* close 会跟着来 */
    })
  })

  // 心跳（B44）：60 秒没消息就当掉线；主持人掉线太久交接（B22）；房间 GC（B19）
  const heartbeat = setInterval(() => {
    const t = now()
    for (const c of conns) if (t - c.lastSeen > HEARTBEAT_MS) c.ws.terminate()
    for (const [code, room] of rooms) {
      const handover = reassignHost(room, t)
      if (handover.room !== room) commit(code, handover)
      if (!expired(room, t)) continue
      for (const c of connsOf(code)) {
        fail(c.ws, 'closed')
        c.code = null
      }
      rooms.delete(code)
    }
  }, opts.sweepMs ?? SWEEP_MS)

  return new Promise((resolve, reject) => {
    wss.once('error', reject)
    wss.once('listening', () => {
      const addr = wss.address()
      const port = typeof addr === 'object' && addr ? addr.port : (opts.port ?? 8787)
      log(`对战中继服务：ws://${opts.host ?? '127.0.0.1'}:${port}/ws`)
      resolve({
        wss,
        rooms,
        port,
        close: () =>
          new Promise<void>((done) => {
            clearInterval(heartbeat)
            for (const c of conns) c.ws.terminate()
            wss.close(() => done())
          }),
      })
    })
  })
}

// 直接运行（node dist-server/battle.mjs）就起服务；被 import（测试）时不起
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === entry) {
  createBattleServer({ port: Number(process.env.PORT ?? 8787), host: process.env.HOST ?? '127.0.0.1' }).catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })
}
