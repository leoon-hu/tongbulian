// 测试用的假 WebSocket：记下发出的消息，测试自己决定什么时候「连上」「收到」「断开」
import type { ServerMsg } from '@/battle/protocol'
import type { SocketLike } from '@/battle/socket'

export class FakeWs implements SocketLike {
  static all: FakeWs[] = []
  static last(): FakeWs {
    const ws = FakeWs.all[FakeWs.all.length - 1]
    if (!ws) throw new Error('还没有建立过连接')
    return ws
  }
  static reset(): void {
    FakeWs.all.length = 0
  }

  readyState = 0
  sent: string[] = []
  closed = false
  onopen: ((ev: unknown) => void) | null = null
  onmessage: ((ev: { data: unknown }) => void) | null = null
  onclose: ((ev: unknown) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null

  constructor(public readonly url: string) {
    FakeWs.all.push(this)
  }
  send(data: string): void {
    this.sent.push(data)
  }
  close(): void {
    this.closed = true
    this.readyState = 3
  }
  /** 服务器接受了连接 */
  open(): void {
    this.readyState = 1
    this.onopen?.({})
  }
  /** 服务器发来一条 */
  receive(msg: ServerMsg): void {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }
  /** 网络断了 */
  drop(): void {
    this.readyState = 3
    this.onclose?.({})
  }
  /** 发出去的消息（解析后） */
  get msgs(): Array<{ type: string } & Record<string, unknown>> {
    return this.sent.map((s) => JSON.parse(s) as { type: string } & Record<string, unknown>)
  }
}
