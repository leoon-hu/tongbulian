/**
 * 对战中继服务（需求 B41–B49）：WebSocket 一层薄壳——连接、房间表、心跳、限流、节流广播；
 * 房间与比赛逻辑都在 room.ts（纯函数）。只在内存里，不落库、不记内容日志。
 * 生产：nginx 把 wss://<域名>/ws 反代到这里（默认 127.0.0.1:8787）；开发：Vite 把 /ws 代理过来。
 * 运行：node dist-server/battle.mjs（npm run build:server 打成单文件，含 ws）。环境变量 PORT / HOST。
 */
import { createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { pathToFileURL } from 'node:url'
import { WebSocketServer, type WebSocket } from 'ws'
import type { ClientMsg, RoomError, ServerMsg } from '@/battle/protocol'
import { cleanName } from '@/battle/names'
import { apply, autoStart, createRoom, expired, findByPasscode, isCode, isKpId, isPasscode, isSkinId, join, makeCode, makePasscodes, reassignHost, setOnline, snapshot, tick, type Effect, type Room } from './room'

export const MAX_ROOMS = 500
export const MAX_MSG_BYTES = 4096
export const RATE_PER_SEC = 20
export const HEARTBEAT_MS = 60_000
/** 一个连接口令连错几次就断开（口令只有 90 万种，别让人一直猜；B19） */
export const MAX_BAD_PASS = 5
/** 同一个 IP 在 BAD_PASS_WINDOW_MS 里口令连错这么多次：之后一段时间查口令一律回 busy（换连接也没用；B45a） */
export const MAX_BAD_PASS_PER_IP = 30
/** 整个服务在 BAD_PASS_WINDOW_MS 里口令错这么多次：所有人的查口令都回 busy（分布式猜口令的兜底） */
export const MAX_BAD_PASS_GLOBAL = 300
export const BAD_PASS_WINDOW_MS = 10 * 60 * 1000
/** 连接数上限（B45a）：整个服务 / 同一个 IP（一个教室几十台 iPad 走同一个出口，别卡太小） */
export const MAX_CONNS = 2000
export const MAX_CONNS_PER_IP = 100
export const BROADCAST_MS = 100
/** 心跳 / 交接 / GC 的检查间隔（测试可注入） */
export const SWEEP_MS = 10_000

interface Conn {
  ws: WebSocket
  /** 对外的身份（clientId 的哈希）：快照里的 members / players 用它，客户端拿到的 you 也是它 */
  clientId: string | null
  name: string
  version: string
  code: string | null
  ip: string
  lastSeen: number
  /** 限流：这一秒收了几条 */
  windowStart: number
  count: number
  /** 口令连错了几次 */
  badPass: number
}

/** 一个时间窗里的计数（口令错几次） */
interface Window {
  start: number
  count: number
}

/**
 * 客户端的 IP：只有 nginx 会连到这个服务（127.0.0.1），nginx 前面又只有 Cloudflare，所以这几个头可信；
 * 都没有（本机开发、测试）就用 socket 的地址。
 */
export function clientIp(req: Pick<IncomingMessage, 'headers' | 'socket'>): string {
  const pick = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v)?.split(',')[0]?.trim() ?? ''
  return pick(req.headers['x-real-ip']) || pick(req.headers['cf-connecting-ip']) || pick(req.headers['x-forwarded-for']) || req.socket.remoteAddress || '?'
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
  /** 当前版本（B43）：hello 的版本不一致就回 version，页面会自己更新重载；不传 = 不检查（测试） */
  version?: string
  /**
   * 允许的页面来源（Origin 头，如 https://tongbulian.jiaci.app；B45a）：不在名单里的握手直接拒绝（403），
   * 别的网站不能借用这个服务。不传 = 不检查（本机开发、测试）。
   */
  origins?: readonly string[]
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
  /** 每个 IP 当前的连接数 / 口令错误计数（B45a） */
  const connsByIp = new Map<string, number>()
  const badPassByIp = new Map<string, Window>()
  const badPassGlobal: Window = { start: 0, count: 0 }
  /**
   * 对外身份 = clientId 的哈希（B45a）：clientId 是设备自己的秘密，只在 hello 里出现；快照里给大家看的是哈希，
   * 别人拿不到你的 clientId，也就不能冒充你重连、把你顶掉。盐每次启动随机，房间本来也不跨重启。
   */
  const salt = randomBytes(16)
  const publicId = (clientId: string): string => createHash('sha256').update(salt).update(clientId).digest('base64url').slice(0, 16)

  /** 时间窗计数：过了窗口就归零，再 +1；返回加完后的数 */
  function bump(w: Window, t: number): number {
    if (t - w.start >= BAD_PASS_WINDOW_MS) {
      w.start = t
      w.count = 0
    }
    return ++w.count
  }
  function noteBadPass(ip: string, t: number): void {
    let w = badPassByIp.get(ip)
    if (!w) badPassByIp.set(ip, (w = { start: t, count: 0 }))
    bump(w, t)
    bump(badPassGlobal, t)
  }
  /** 这个 IP（或整个服务）口令错太多，暂时不给查 */
  function passBlocked(ip: string, t: number): boolean {
    const w = badPassByIp.get(ip)
    const ipHit = !!w && t - w.start < BAD_PASS_WINDOW_MS && w.count >= MAX_BAD_PASS_PER_IP
    const all = t - badPassGlobal.start < BAD_PASS_WINDOW_MS && badPassGlobal.count >= MAX_BAD_PASS_GLOBAL
    return ipHit || all
  }

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

  /** 关掉房间（「不玩了」/ 过期）：每个连接收到 closed 并脱离房间，房间从表里删掉 */
  function closeRoom(code: string): void {
    for (const c of connsOf(code)) {
      fail(c.ws, 'closed')
      c.code = null
    }
    rooms.delete(code)
  }

  function runEffects(code: string, effects: Effect[]): void {
    for (const e of effects) {
      if (e.type === 'broadcast') flush(code)
      else if (e.type === 'event') for (const c of connsOf(code)) send(c.ws, { type: 'event', e: e.e })
      else if (e.type === 'close') closeRoom(code)
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
    // 页面是缓存的旧版本（出题代码不一样）：直接告诉它，它会自己更新重载再来（B43）；不算登记，之后发什么都是 bad
    if (opts.version && msg.version.slice(0, 40) !== opts.version) {
      fail(c.ws, 'version')
      return
    }
    // 同一条连接又 hello 一次（换身份）：先把原来的座位标掉线，别留一个永远在线的幽灵
    if (c.code) leaveRoom(c, false)
    c.clientId = publicId(msg.clientId)
    c.name = typeof msg.name === 'string' ? cleanName(msg.name) : ''
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
    if (!isKpId(msg.kpId) || !isSkinId(msg.skin)) {
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
    // 口令全服务器唯一（B19）：避开别的房间正在用的
    const taken = new Set<string>()
    for (const r of rooms.values()) for (const p of Object.values(r.passcodes)) taken.add(p)
    const room = createRoom({ code, kpId: msg.kpId, skin: msg.skin, host: { clientId: c.clientId, name: c.name }, version: c.version, now: now(), passcodes: makePasscodes(taken) })
    rooms.set(code, room)
    c.code = code
    send(c.ws, { type: 'state', room: snapshot(room), you: c.clientId, now: now() })
  }

  /**
   * 口令换房间号与身份（B19）：不认识就 noRoom，连错 MAX_BAD_PASS 次断开；
   * 同一个 IP 换着连接猜、或者很多 IP 一起猜，超过窗口里的次数就一律回 busy（B45a）
   */
  function onLookup(c: Conn, msg: Extract<ClientMsg, { type: 'lookup' }>): void {
    if (!c.clientId) {
      fail(c.ws, 'bad')
      return
    }
    const t = now()
    if (passBlocked(c.ip, t)) {
      fail(c.ws, 'busy')
      return
    }
    const hit = isPasscode(msg.pass) ? findByPasscode(rooms.values(), msg.pass) : undefined
    if (hit) {
      send(c.ws, { type: 'found', code: hit.code, t: hit.t })
      return
    }
    noteBadPass(c.ip, t)
    fail(c.ws, 'noRoom')
    if (++c.badPass >= MAX_BAD_PASS) c.ws.close(4002, 'too many tries')
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
    if (msg.type === 'lookup') {
      onLookup(c, msg)
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

  /** 握手就拒掉的：来源不在名单里、连接太多（B45a） */
  function admit(req: IncomingMessage): boolean {
    if (opts.origins) {
      const origin = req.headers.origin
      if (typeof origin !== 'string' || !opts.origins.includes(origin)) return false
    }
    if (conns.size >= MAX_CONNS) return false
    if ((connsByIp.get(clientIp(req)) ?? 0) >= MAX_CONNS_PER_IP) return false
    return true
  }

  const wss = new WebSocketServer({
    host: opts.host ?? '127.0.0.1',
    port: opts.port ?? 8787,
    path: '/ws',
    maxPayload: MAX_MSG_BYTES,
    verifyClient: (info: { req: IncomingMessage }) => admit(info.req),
  })

  wss.on('connection', (ws, req) => {
    const ip = clientIp(req)
    const c: Conn = { ws, clientId: null, name: '', version: '', code: null, ip, lastSeen: now(), windowStart: now(), count: 0, badPass: 0 }
    conns.add(c)
    connsByIp.set(ip, (connsByIp.get(ip) ?? 0) + 1)
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        ws.close(1003, 'text only')
        return
      }
      onMessage(c, data.toString())
    })
    ws.on('close', () => {
      conns.delete(c)
      const n = (connsByIp.get(ip) ?? 1) - 1
      if (n > 0) connsByIp.set(ip, n)
      else connsByIp.delete(ip)
      leaveRoom(c, false)
    })
    ws.on('error', () => {
      /* close 会跟着来 */
    })
  })

  // 心跳（B44）：60 秒没消息就当掉线；主持人掉线太久交接（B22）；房间 GC（B19）；过期的口令错误计数清掉
  const heartbeat = setInterval(() => {
    const t = now()
    for (const c of conns) if (t - c.lastSeen > HEARTBEAT_MS) c.ws.terminate()
    for (const [ip, w] of badPassByIp) if (t - w.start >= BAD_PASS_WINDOW_MS) badPassByIp.delete(ip)
    for (const [code, room] of rooms) {
      const handover = reassignHost(room, t)
      if (handover.room !== room) commit(code, handover)
      if (!expired(room, t)) continue
      closeRoom(code)
    }
  }, opts.sweepMs ?? SWEEP_MS)

  return new Promise((resolve, reject) => {
    wss.once('error', reject)
    wss.once('listening', () => {
      const addr = wss.address()
      const port = typeof addr === 'object' && addr ? addr.port : (opts.port ?? 8787)
      log(`对战中继服务：ws://${opts.host ?? '127.0.0.1'}:${port}/ws（版本 ${opts.version ?? '不限'}，来源 ${opts.origins?.join(' ') ?? '不限'}）`)
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

// 直接运行（node dist-server/battle.mjs）就起服务；被 import（测试）时不起。
// 环境变量：PORT / HOST；ALLOWED_ORIGINS = 允许的页面来源，逗号分隔（如 https://tongbulian.jiaci.app），不设就不限
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === entry) {
  const origins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  createBattleServer({
    port: Number(process.env.PORT ?? 8787),
    host: process.env.HOST ?? '127.0.0.1',
    version: __BUILD__,
    origins: origins.length ? origins : undefined,
  }).catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })
}
