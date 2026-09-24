/**
 * 与中继服务的连接（需求 B23、B42–B46）：同源 ws(s)://<域名>/ws，JSON 消息；
 * 断线自动重连（1、2、4、8 秒退避，一直试），重连后用同一个 clientId 再 hello 进原房间接回座位；
 * 每 25 秒 ping（Cloudflare 代理 100 秒空闲会断）。WebSocket 与计时器可注入，node 里能测。
 */
import type { ArenaEvent, AutoIdentity, ClientMsg, IceServer, Role, RoomError, RoomSnapshot, RtcSignal, ServerMsg } from './protocol'
import { isEmoteId, type EmoteId } from './emotes'
import type { AvatarId } from './avatars'
import { cleanIceServers, isRtcSignal } from './voice'

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'

export const PING_MS = 25_000
export const BACKOFF_MS: readonly number[] = [1000, 2000, 4000, 8000]
/** 连上多久不掉才算稳定（退避归零） */
export const STABLE_MS = 5000
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/

/** 同源 /ws 地址；file:// 打开或没有 location 就 null（B46） */
export function socketUrl(loc: Location | undefined = typeof location === 'undefined' ? undefined : location): string | null {
  if (!loc || loc.protocol === 'file:' || !loc.host) return null
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws`
}

export interface SocketLike {
  readonly readyState: number
  send(data: string): void
  close(code?: number, reason?: string): void
  onopen: ((ev: unknown) => void) | null
  onmessage: ((ev: { data: unknown }) => void) | null
  onclose: ((ev: unknown) => void) | null
  onerror: ((ev: unknown) => void) | null
}

export interface RoomClientOptions {
  url: string
  clientId: string
  name: string
  version: string
  /** 我的小动物（B66）：随 hello 发给服务器 */
  avatar?: AvatarId
  /** 名字 / 小动物哪样是随机的（B17）：随 hello 发，服务器按它去重 */
  auto?: AutoIdentity
  onState(room: RoomSnapshot, you: string, now: number): void
  onEvent(e: ArenaEvent): void
  onError(error: RoomError): void
  onStatus(status: SocketStatus): void
  /** 口令查到的房间号与身份（B19） */
  onFound?(code: string, t: Role): void
  /** 语音信令（B57）：from 是对方的对外身份 */
  onRtc?(from: string, data: RtcSignal): void
  /** ICE 服务器清单（B57） */
  onTurn?(iceServers: IceServer[], ttl: number): void
  /** 别人发的表情（B58） */
  onEmote?(from: string, role: Role, id: EmoteId): void
  /** 可注入的 WebSocket（测试用假的） */
  factory?: (url: string) => SocketLike
  /** 退避抖动的随机源（0…1）；测试注入固定值 */
  jitter?: () => number
}

const OPEN = 1

export class RoomClient {
  status: SocketStatus = 'idle'
  /** 正在 / 打算待的房间；重连时再进 */
  code: string | null = null
  private role: Role | undefined
  private ws: SocketLike | null = null
  private outbox: ClientMsg[] = []
  private attempt = 0
  private closedByUs = false
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly opts: RoomClientOptions) {}

  /** 连上并进房（code）；不带 code = 只报身份，接着 create */
  connect(code?: string, t?: Role): void {
    this.code = code ?? null
    this.role = t
    this.closedByUs = false
    this.attempt = 0
    this.open()
  }

  /** 发一条；还没连上就先攒着，连上后跟在 hello 后面发 */
  send(msg: ClientMsg): void {
    if (this.ws && this.ws.readyState === OPEN && this.status === 'open') this.ws.send(JSON.stringify(msg))
    else this.outbox.push(msg)
  }

  /** 页面回到前台 / 网络回来：正在等退避的话立刻再连一次（B23） */
  kick(): void {
    if (this.closedByUs || !this.retryTimer) return
    clearTimeout(this.retryTimer)
    this.retryTimer = null
    this.open()
  }

  close(): void {
    this.closedByUs = true
    this.stopTimers()
    this.setStatus('closed')
    const ws = this.ws
    this.ws = null
    if (ws) {
      ws.onclose = null
      try {
        ws.close(1000, 'bye')
      } catch {
        /* 已经关了 */
      }
    }
  }

  private setStatus(s: SocketStatus): void {
    if (this.status === s) return
    this.status = s
    this.opts.onStatus(s)
  }

  private stopTimers(): void {
    if (this.pingTimer) clearInterval(this.pingTimer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.pingTimer = null
    this.retryTimer = null
  }

  private open(): void {
    this.stopTimers()
    this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting')
    let ws: SocketLike
    try {
      ws = (this.opts.factory ?? ((url: string) => new WebSocket(url) as unknown as SocketLike))(this.opts.url)
    } catch {
      this.scheduleRetry()
      return
    }
    this.ws = ws
    ws.onopen = () => {
      if (this.ws !== ws) return
      this.setStatus('open')
      // 连上并稳定了一会儿才把退避归零：服务器「接受后立刻关掉」不会变成每秒一次的重连循环
      const opened = this.attempt
      setTimeout(() => {
        if (this.ws === ws && this.attempt === opened) this.attempt = 0
      }, STABLE_MS)
      const hello: ClientMsg = { type: 'hello', clientId: this.opts.clientId, name: this.opts.name, version: this.opts.version }
      if (this.opts.avatar) hello.avatar = this.opts.avatar
      if (this.opts.auto?.name || this.opts.auto?.avatar) hello.auto = this.opts.auto
      if (this.code) {
        hello.code = this.code
        hello.t = this.role
      }
      ws.send(JSON.stringify(hello))
      for (const m of this.outbox.splice(0)) ws.send(JSON.stringify(m))
      this.pingTimer = setInterval(() => {
        if (this.ws === ws && ws.readyState === OPEN) ws.send(JSON.stringify({ type: 'ping' }))
      }, PING_MS)
    }
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return
      let msg: ServerMsg
      try {
        msg = JSON.parse(String(ev.data)) as ServerMsg
      } catch {
        return
      }
      // 服务器是自己的，但坏掉的一条也别让整页抛错：形状不对就丢掉
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return
      if (msg.type === 'state') {
        const r = msg.room
        if (!r || typeof r !== 'object' || typeof msg.you !== 'string' || typeof msg.now !== 'number') return
        if (!CODE_RE.test(String(r.code)) || !Array.isArray(r.members) || typeof r.kpId !== 'string' || typeof r.skin !== 'string') return
        if (r.match !== null && (!r.match || typeof r.match !== 'object' || !Array.isArray(r.match.players))) return
        if (!r.passcodes || typeof r.passcodes !== 'object') return
        if (!r.members.every((m) => m && typeof m === 'object' && typeof m.clientId === 'string' && typeof m.name === 'string' && typeof m.role === 'string')) return
        this.code = r.code
        this.opts.onState(r, msg.you, msg.now)
      } else if (msg.type === 'event') {
        if (msg.e && typeof msg.e === 'object' && typeof msg.e.type === 'string') this.opts.onEvent(msg.e)
      } else if (msg.type === 'found') {
        if (CODE_RE.test(String(msg.code)) && (msg.t === 'red' || msg.t === 'blue' || msg.t === 'watch')) this.opts.onFound?.(msg.code, msg.t)
      } else if (msg.type === 'rtc') {
        if (typeof msg.from === 'string' && isRtcSignal(msg.data)) this.opts.onRtc?.(msg.from, msg.data)
      } else if (msg.type === 'turn') {
        this.opts.onTurn?.(cleanIceServers(msg.iceServers), typeof msg.ttl === 'number' && msg.ttl > 0 ? msg.ttl : 0)
      } else if (msg.type === 'emote') {
        if (typeof msg.from === 'string' && (msg.role === 'red' || msg.role === 'blue' || msg.role === 'watch') && isEmoteId(msg.id)) this.opts.onEmote?.(msg.from, msg.role, msg.id)
      } else if (msg.type === 'error') {
        if (typeof msg.error !== 'string') return
        // 被顶掉 / 房间没了 / 版本不对：不再重连
        if (msg.error === 'replaced' || msg.error === 'closed' || msg.error === 'noRoom' || msg.error === 'version') {
          this.closedByUs = true
          this.code = null
        }
        this.opts.onError(msg.error)
      }
    }
    ws.onclose = () => {
      if (this.ws !== ws) return
      this.ws = null
      if (this.pingTimer) clearInterval(this.pingTimer)
      this.pingTimer = null
      if (this.closedByUs) {
        this.setStatus('closed')
        return
      }
      this.scheduleRetry()
    }
    ws.onerror = () => {
      /* close 会跟着来 */
    }
  }

  private scheduleRetry(): void {
    this.setStatus('reconnecting')
    // 退避加一点随机抖动：一片设备同时掉线（WiFi 闪断）不会同一毫秒一起撞回来
    const wait = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)]! * (1 + (this.opts.jitter ?? Math.random)() * 0.25)
    this.attempt += 1
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (!this.closedByUs) this.open()
    }, wait)
  }
}
