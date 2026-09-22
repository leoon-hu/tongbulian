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
import type { ClientMsg, IceServer, RoomError, ServerMsg } from '@/battle/protocol'
import { EMOTE_SERVER_GAP_MS, isEmoteId } from '@/battle/emotes'
import { cleanName } from '@/battle/names'
import { DEFAULT_ICE_SERVERS, cleanIceServers, isRtcSignal } from '@/battle/voice'
import { apply, autoStart, createRoom, expired, findByPasscode, isCode, isKpId, isPasscode, isSkinId, join, makeCode, makePasscodes, randomSeed, reassignHost, setOnline, snapshot, tick, type Effect, type Room } from './room'

export const MAX_ROOMS = 500
/** 同一个 IP 同时最多开几个房间、10 分钟内最多建几次（N6 ⑨）：不然几个 IP 几分钟就把 MAX_ROOMS 占满，所有人建房都回 busy */
export const MAX_ROOMS_PER_IP = 20
export const MAX_CREATES_PER_IP = 30
export const MAX_MSG_BYTES = 4096
/** 语音信令 rtc 单独放宽（B57）：SDP 常有 2–4 KB */
export const MAX_RTC_BYTES = 16384
export const RATE_PER_SEC = 20
/** 语音信令另算一个窗口（B57）：开麦时向 5–6 个人同时建连接，候选每 100 ms 一包，突发能到每秒几十条，不能挤占比赛消息的额度 */
export const RTC_RATE_PER_SEC = 60
/** 发给一个连接的数据攒到这么多还没被读走：快照可以丢（下一份 100 ms 后就来）；再多就是不读的连接，直接断开（N6 ⑨） */
export const SEND_SKIP_BYTES = 256 * 1024
export const SEND_KILL_BYTES = 1024 * 1024
/** TURN 临时凭据的有效期（秒）与提前多久换新（B57）：凭据全服务共用、发出去就收不回，所以只给 1 小时 */
export const TURN_TTL_S = 3600
export const TURN_MARGIN_MS = 10 * 60 * 1000
/** 取凭据失败后隔多久再试；向 Cloudflare 取凭据的超时 */
export const TURN_RETRY_MS = 60 * 1000
export const TURN_FETCH_TIMEOUT_MS = 8000
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
  /** 限流：这一秒收了几条（比赛消息 / 语音信令各一个计数） */
  windowStart: number
  count: number
  rtcCount: number
  /** 口令 / 房间号连错了几次 */
  badPass: number
  /** 上一个表情的时刻（B58：每连接 EMOTE_SERVER_GAP_MS 最多一条） */
  lastEmote: number
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

export interface TurnInfo {
  iceServers: IceServer[]
  /** 凭据有效期（秒） */
  ttl: number
}
/** 取一份带临时凭据的 ICE 服务器清单；取不到返回 null（客户端退到只有 STUN） */
export type TurnProvider = () => Promise<TurnInfo | null>

/**
 * Cloudflare Realtime TURN（B57）：用长期的 TURN 密钥向 Cloudflare 换一份 TURN_TTL_S 秒有效的临时凭据
 * （接口 generate-ice-servers 直接返回可喂给 RTCPeerConnection 的 iceServers）。密钥只在服务器上，页面拿到的只是临时凭据。
 */
export function cloudflareTurn(keyId: string, token: string, fetchFn: typeof fetch = fetch): TurnProvider {
  return async () => {
    const res = await fetchFn(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: TURN_TTL_S }),
      signal: AbortSignal.timeout(TURN_FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { iceServers?: unknown }
    const iceServers = cleanIceServers(Array.isArray(body.iceServers) ? body.iceServers : [body.iceServers])
    return iceServers.length ? { iceServers, ttl: TURN_TTL_S } : null
  }
}

export interface BattleServerOptions {
  port?: number
  host?: string
  now?: () => number
  /** 语音的 TURN 凭据来源（B57）：不传 = 只给 STUN */
  turn?: TurnProvider
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
  const seed = opts.seed ?? randomSeed
  const log = opts.log ?? ((line: string) => console.log(line))
  const rooms = new Map<string, Room>()
  const conns = new Set<Conn>()
  /** 每个房间里的连接（广播 / 转发不用扫全表） */
  const connsByCode = new Map<string, Set<Conn>>()
  const pendingFlush = new Set<string>()
  /** 每个 IP 当前的连接数 / 口令错误计数 / 建房计数（B45a、N6 ⑨） */
  const connsByIp = new Map<string, number>()
  const badPassByIp = new Map<string, Window>()
  const badPassGlobal: Window = { start: 0, count: 0 }
  const createsByIp = new Map<string, Window>()
  /** 每个房间是哪个 IP 建的（按 IP 限房间数用） */
  const roomIp = new Map<string, string>()
  const roomsByIp = new Map<string, number>()
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
  /**
   * 这个 IP 口令错太多，暂时不给查；全服务的上限只拦「本窗口里自己也错过」的 IP——不然十来个 IP 各错 30 次就能让
   * 所有人的「加入对战」一直回「服务器忙」，全服务上限本身成了一个公开的开关
   */
  function passBlocked(ip: string, t: number): boolean {
    const w = badPassByIp.get(ip)
    const mine = w && t - w.start < BAD_PASS_WINDOW_MS ? w.count : 0
    const all = t - badPassGlobal.start < BAD_PASS_WINDOW_MS && badPassGlobal.count >= MAX_BAD_PASS_GLOBAL
    return mine >= MAX_BAD_PASS_PER_IP || (all && mine > 0)
  }

  /**
   * 发一条消息；对方一直不读（bufferedAmount 攒着）就别再往里塞：快照可以丢，下一份 100 ms 后还会来；
   * 攒过 SEND_KILL_BYTES 的连接直接断开——不然慢速 / 停摆的客户端会让服务端的写缓冲无限长
   */
  function send(ws: WebSocket, msg: ServerMsg | string): void {
    if (ws.readyState !== ws.OPEN) return
    if (ws.bufferedAmount > SEND_KILL_BYTES) {
      ws.terminate()
      return
    }
    if (ws.bufferedAmount > SEND_SKIP_BYTES && (typeof msg === 'string' || msg.type === 'state')) return
    ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  function fail(ws: WebSocket, error: RoomError): void {
    send(ws, { type: 'error', error })
  }
  function connsOf(code: string): Iterable<Conn> {
    return connsByCode.get(code) ?? []
  }
  /** 连接进 / 出房间：同时维护按房间的索引 */
  function setCode(c: Conn, code: string | null): void {
    if (c.code) {
      const set = connsByCode.get(c.code)
      set?.delete(c)
      if (set && set.size === 0) connsByCode.delete(c.code)
    }
    c.code = code
    if (code) {
      let set = connsByCode.get(code)
      if (!set) connsByCode.set(code, (set = new Set()))
      set.add(c)
    }
  }

  /** 广播整份快照，每房间最多每 BROADCAST_MS 一次（B42）；快照只序列化一次，每个连接只补自己的 you */
  function flush(code: string): void {
    if (pendingFlush.has(code)) return
    pendingFlush.add(code)
    setTimeout(() => {
      pendingFlush.delete(code)
      try {
        const room = rooms.get(code)
        if (!room) return
        const head = JSON.stringify({ type: 'state', room: snapshot(room), now: now() }).slice(0, -1)
        for (const c of connsOf(code)) if (c.clientId) send(c.ws, `${head},"you":${JSON.stringify(c.clientId)}}`)
      } catch (e) {
        log(`广播出错：${String(e)}`)
      }
    }, BROADCAST_MS)
  }

  function dropRoom(code: string): void {
    rooms.delete(code)
    const ip = roomIp.get(code)
    if (ip !== undefined) {
      roomIp.delete(code)
      const n = (roomsByIp.get(ip) ?? 1) - 1
      if (n > 0) roomsByIp.set(ip, n)
      else roomsByIp.delete(ip)
    }
  }

  /** 关掉房间（「不玩了」/ 过期）：每个连接收到 closed 并脱离房间，房间从表里删掉 */
  function closeRoom(code: string): void {
    for (const c of [...connsOf(code)]) {
      fail(c.ws, 'closed')
      setCode(c, null)
    }
    dropRoom(code)
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
        try {
          const room = rooms.get(code)
          if (!room || !room.match || room.match.startedAt !== at) return
          commit(code, tick(room, Math.max(now(), at)))
        } catch (e) {
          log(`开局出错：${String(e)}`)
        }
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
    setCode(c, null)
    if (!room) return
    if (remove) {
      const res = apply(room, c.clientId, { type: 'leave' }, now())
      if (res.room.members.length === 0) {
        dropRoom(code)
        return
      }
      commit(code, res)
    } else commit(code, setOnline(room, c.clientId, false, now()))
  }

  /** 房间号 / 口令猜错一次：计数，连错 MAX_BAD_PASS 次断开（房间号与口令一样是密钥，猜法要一样贵） */
  function badGuess(c: Conn, t: number): void {
    noteBadPass(c.ip, t)
    fail(c.ws, 'noRoom')
    if (++c.badPass >= MAX_BAD_PASS) c.ws.close(4002, 'too many tries')
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
    // 同一条连接又 hello 一次：同一个身份是重连，标掉线等它接回；换了身份就把原来的座位整个撤掉——
    // 不然一条连接反复换身份就能用幽灵成员把房间或某队塞满
    const id = publicId(msg.clientId)
    if (c.code) leaveRoom(c, c.clientId !== null && c.clientId !== id)
    c.clientId = id
    c.name = typeof msg.name === 'string' ? cleanName(msg.name) : ''
    c.version = msg.version.slice(0, 40)
    if (msg.code === undefined) return
    const t = now()
    if (passBlocked(c.ip, t)) {
      fail(c.ws, 'busy')
      return
    }
    const room = isCode(msg.code) ? rooms.get(msg.code) : undefined
    if (!room) {
      badGuess(c, t)
      return
    }
    // 同一个 clientId 再开一个标签页：后开的顶掉先开的（B24）
    for (const other of [...connsOf(msg.code)]) {
      if (other !== c && other.clientId === c.clientId) {
        fail(other.ws, 'replaced')
        setCode(other, null)
        other.ws.close(4000, 'replaced')
      }
    }
    const res = join(room, { clientId: c.clientId, name: c.name, t: msg.t, version: c.version }, now())
    if (res.error === 'version' || res.error === 'full') {
      fail(c.ws, res.error)
      return
    }
    if (res.error) fail(c.ws, res.error)
    setCode(c, msg.code)
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
    // 全服务、这个 IP 同时开着的、这个 IP 10 分钟内建过的（N6 ⑨）
    const t = now()
    let creates = createsByIp.get(c.ip)
    if (!creates) createsByIp.set(c.ip, (creates = { start: t, count: 0 }))
    if (rooms.size >= MAX_ROOMS || (roomsByIp.get(c.ip) ?? 0) >= MAX_ROOMS_PER_IP || bump(creates, t) > MAX_CREATES_PER_IP) {
      fail(c.ws, 'busy')
      return
    }
    if (c.code) leaveRoom(c, true)
    let code = makeCode()
    while (rooms.has(code)) code = makeCode()
    // 口令全服务器唯一（B19）：避开别的房间正在用的
    const taken = new Set<string>()
    for (const r of rooms.values()) for (const p of Object.values(r.passcodes)) taken.add(p)
    const room = createRoom({ code, kpId: msg.kpId, skin: msg.skin, host: { clientId: c.clientId, name: c.name }, version: c.version, now: t, passcodes: makePasscodes(taken) })
    rooms.set(code, room)
    roomIp.set(code, c.ip)
    roomsByIp.set(c.ip, (roomsByIp.get(c.ip) ?? 0) + 1)
    setCode(c, code)
    send(c.ws, { type: 'state', room: snapshot(room), you: c.clientId, now: t })
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
    badGuess(c, t)
  }

  // ── 语音（B57）：信令只转发、ICE 清单按需取 ──

  /** 临时凭据的缓存（全服务一份，过期前 TURN_MARGIN_MS 换新）；取失败记下时间，TURN_RETRY_MS 内不再试 */
  let turnCache: { until: number; info: TurnInfo } | null = null
  let turnFailedAt = 0
  let turnInflight: Promise<TurnInfo | null> | null = null
  const stunOnly = (): TurnInfo => ({ iceServers: DEFAULT_ICE_SERVERS.map((s) => ({ ...s })), ttl: 0 })
  async function getTurn(): Promise<TurnInfo> {
    if (!opts.turn) return stunOnly()
    const t = now()
    if (turnCache && t < turnCache.until - TURN_MARGIN_MS) return turnCache.info
    if (t - turnFailedAt < TURN_RETRY_MS) return stunOnly()
    if (!turnInflight) {
      turnInflight = opts
        .turn()
        .catch(() => null)
        .then((info) => {
          turnInflight = null
          if (info) turnCache = { until: now() + info.ttl * 1000, info }
          else turnFailedAt = now()
          return info
        })
    }
    const info = await turnInflight
    return info ?? stunOnly()
  }
  function onTurn(c: Conn, room: Room): void {
    // 只给在房间里、而且房间里不止自己一个人在线的连接：凭据全服务共用、发出去就收不回（可在房间外当中继用、流量记到站长账上），
    // 一个人建个空房就来领是最便宜的拿法；只 STUN 的清单随便给
    const alone = room.members.filter((m) => m.online).length < 2
    if (alone) {
      const info = stunOnly()
      send(c.ws, { type: 'turn', iceServers: info.iceServers, ttl: info.ttl })
      return
    }
    void getTurn().then((info) => send(c.ws, { type: 'turn', iceServers: info.iceServers, ttl: info.ttl }))
  }
  /**
   * 转给同房间在线的目标；目标不在（离开了 / 别的房间的人 / 自己）就丢掉不报错，形状不对才报 bad。
   * offer 只转发快照里开着麦的人发的（谁开了麦谁发 offer，B57）：没标 🎤 的连接推不出音频、也占不了名额
   */
  function onRtc(c: Conn, room: Room, msg: Extract<ClientMsg, { type: 'rtc' }>): void {
    if (typeof msg.to !== 'string' || !isRtcSignal(msg.data)) {
      fail(c.ws, 'bad')
      return
    }
    if (msg.to === c.clientId) return
    const target = room.members.find((m) => m.clientId === msg.to)
    if (!target || !target.online) return
    const sdp = (msg.data as { sdp?: { type?: unknown } }).sdp
    if (sdp && sdp.type === 'offer' && !room.members.some((m) => m.clientId === c.clientId && m.voice)) return
    for (const other of connsOf(room.code)) if (other.clientId === msg.to) send(other.ws, { type: 'rtc', from: c.clientId!, data: msg.data })
  }

  /** 表情（B58）：只认表里的 id、每连接隔 EMOTE_SERVER_GAP_MS 一条，转发给同房间的其他人（带发送者的身份与座位）；不进快照、不存 */
  function onEmote(c: Conn, room: Room, msg: Extract<ClientMsg, { type: 'emote' }>): void {
    if (!isEmoteId(msg.id)) {
      fail(c.ws, 'bad')
      return
    }
    const t = now()
    if (t - c.lastEmote < EMOTE_SERVER_GAP_MS) return
    c.lastEmote = t
    const me = room.members.find((m) => m.clientId === c.clientId)
    if (!me) return
    for (const other of connsOf(room.code)) if (other !== c && other.clientId) send(other.ws, { type: 'emote', from: c.clientId!, role: me.role, id: msg.id })
  }

  function onMessage(c: Conn, data: string, bytes: number): void {
    const t = now()
    c.lastSeen = t
    if (t - c.windowStart >= 1000) {
      c.windowStart = t
      c.count = 0
      c.rtcCount = 0
    }
    // 语音信令（B57）另算一个窗口：先看开头是不是 rtc（不用先解析整条），比赛消息与信令互不挤占
    const isRtc = /^\{\s*"type"\s*:\s*"rtc"/.test(data)
    if (isRtc ? ++c.rtcCount > RTC_RATE_PER_SEC : ++c.count > RATE_PER_SEC) return
    // 普通消息 ≤ MAX_MSG_BYTES（B45，按字节算）；只有语音信令 rtc 可以到 MAX_RTC_BYTES（ws 层的 maxPayload）
    const big = bytes > MAX_MSG_BYTES
    let msg: ClientMsg
    try {
      msg = JSON.parse(data) as ClientMsg
    } catch {
      if (big) c.ws.close(1009, 'too big')
      else fail(c.ws, 'bad')
      return
    }
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
      if (big) c.ws.close(1009, 'too big')
      else fail(c.ws, 'bad')
      return
    }
    if (big && msg.type !== 'rtc') {
      c.ws.close(1009, 'too big')
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
    if (msg.type === 'rtc') {
      onRtc(c, room, msg)
      return
    }
    if (msg.type === 'turn') {
      onTurn(c, room)
      return
    }
    if (msg.type === 'emote') {
      onEmote(c, room, msg)
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
    maxPayload: MAX_RTC_BYTES,
    verifyClient: (info: { req: IncomingMessage }) => admit(info.req),
  })

  wss.on('connection', (ws, req) => {
    const ip = clientIp(req)
    const c: Conn = { ws, clientId: null, name: '', version: '', code: null, ip, lastSeen: now(), windowStart: now(), count: 0, rtcCount: 0, badPass: 0, lastEmote: 0 }
    conns.add(c)
    connsByIp.set(ip, (connsByIp.get(ip) ?? 0) + 1)
    // 每条消息 / 每次断开都兜住异常（N6 ⑨）：一条畸形消息把整个进程杀掉 = 所有在玩的房间清空
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        ws.close(1003, 'text only')
        return
      }
      try {
        const text = data.toString()
        onMessage(c, text, Buffer.isBuffer(data) ? data.length : Buffer.byteLength(text))
      } catch (e) {
        log(`处理消息出错：${String(e)}`)
        ws.close(1011, 'error')
      }
    })
    ws.on('close', () => {
      conns.delete(c)
      const n = (connsByIp.get(ip) ?? 1) - 1
      if (n > 0) connsByIp.set(ip, n)
      else connsByIp.delete(ip)
      try {
        leaveRoom(c, false)
      } catch (e) {
        log(`断开处理出错：${String(e)}`)
      }
    })
    ws.on('error', () => {
      /* close 会跟着来 */
    })
  })

  // 心跳（B44）：60 秒没消息就当掉线；主持人掉线太久交接（B22）；房间 GC（B19）；过期的口令错误计数清掉
  const heartbeat = setInterval(() => {
    try {
      const t = now()
      for (const c of conns) if (t - c.lastSeen > HEARTBEAT_MS) c.ws.terminate()
      for (const [ip, w] of badPassByIp) if (t - w.start >= BAD_PASS_WINDOW_MS) badPassByIp.delete(ip)
      for (const [ip, w] of createsByIp) if (t - w.start >= BAD_PASS_WINDOW_MS) createsByIp.delete(ip)
      for (const [code, room] of rooms) {
        const handover = reassignHost(room, t)
        if (handover.room !== room) commit(code, handover)
        if (!expired(room, t)) continue
        closeRoom(code)
      }
    } catch (e) {
      log(`定时检查出错：${String(e)}`)
    }
  }, opts.sweepMs ?? SWEEP_MS)

  return new Promise((resolve, reject) => {
    wss.once('error', reject)
    wss.once('listening', () => {
      const addr = wss.address()
      const port = typeof addr === 'object' && addr ? addr.port : (opts.port ?? 8787)
      log(`对战中继服务：ws://${opts.host ?? '127.0.0.1'}:${port}/ws（版本 ${opts.version ?? '不限'}，来源 ${opts.origins?.join(' ') ?? '不限'}，语音 TURN ${opts.turn ? '已配置' : '未配置、只 STUN'}）`)
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
// 环境变量：PORT / HOST；ALLOWED_ORIGINS = 允许的页面来源，逗号分隔（如 https://tongbulian.jiaci.app），不设就不限；
// TURN_KEY_ID / TURN_KEY_TOKEN = Cloudflare Realtime TURN 的密钥（语音穿透用，B57），两个都设了才向 Cloudflare 取临时凭据，不设只给 STUN
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === entry) {
  const origins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const turnId = process.env.TURN_KEY_ID?.trim()
  const turnToken = process.env.TURN_KEY_TOKEN?.trim()
  // 进程级兜底：记下来、不退出——退出 = 清空所有在玩的房间（systemd 会拉起来，但比赛没了）
  process.on('uncaughtException', (e) => console.error('未捕获的异常：', e))
  process.on('unhandledRejection', (e) => console.error('未处理的 rejection：', e))
  createBattleServer({
    port: Number(process.env.PORT ?? 8787),
    host: process.env.HOST ?? '127.0.0.1',
    version: __BUILD__,
    origins: origins.length ? origins : undefined,
    turn: turnId && turnToken ? cloudflareTurn(turnId, turnToken) : undefined,
  }).catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })
}
