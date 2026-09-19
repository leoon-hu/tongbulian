/**
 * 与中继服务的连接（需求 B23、B42–B46）：同源 ws(s)://<域名>/ws，JSON 消息；
 * 断线自动重连（1、2、4、8 秒退避，一直试），重连后用同一个 clientId 再 hello 进原房间接回座位；
 * 每 25 秒 ping（Cloudflare 代理 100 秒空闲会断）。WebSocket 与计时器可注入，node 里能测。
 */
import type { ArenaEvent, ClientMsg, Role, RoomError, RoomSnapshot, ServerMsg } from './protocol'

export type SocketStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'

export const PING_MS = 25_000
export const BACKOFF_MS: readonly number[] = [1000, 2000, 4000, 8000]

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
  onState(room: RoomSnapshot, you: string, now: number): void
  onEvent(e: ArenaEvent): void
  onError(error: RoomError): void
  onStatus(status: SocketStatus): void
  /** 可注入的 WebSocket（测试用假的） */
  factory?: (url: string) => SocketLike
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
      this.attempt = 0
      const hello: ClientMsg = { type: 'hello', clientId: this.opts.clientId, name: this.opts.name, version: this.opts.version }
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
      if (msg.type === 'state') {
        this.code = msg.room.code
        this.opts.onState(msg.room, msg.you, msg.now)
      } else if (msg.type === 'event') this.opts.onEvent(msg.e)
      else if (msg.type === 'error') {
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
    const wait = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)]!
    this.attempt += 1
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (!this.closedByUs) this.open()
    }, wait)
  }
}
