/**
 * 语音通话的纯逻辑（需求 B57）：连谁、谁发 offer、名额、候选打包、信令形状。
 * 浏览器层（RTCPeerConnection、麦克风）在 rtc.ts，客户端状态在 stores/voice.ts；服务器也用这里的形状校验。
 * 规则：房间里每个人自动收听，🎤 只管自己的麦克风——开了麦的人向房间里所有在线成员各建一条连接（最多 MAX_PEERS 条），
 * 没开麦的人只收不发、不请求权限。这里不碰 DOM / WebRTC，node 里能单测。
 */
import type { IceServer, Member, RtcCandidate, RtcSignal } from './protocol'

/** 一个房间里最多几个人开麦（说话名额）：再多每台设备的上行就吃不消 */
export const VOICE_MAX = 4
/** 开了麦的人最多向几个人发声音（开了麦的优先、其余按进房顺序）：家里两三台设备远够不到 */
export const MAX_PEERS = 6
/** 候选攒多久发一包（一条连接刚建立时候选会一下冒出十几条，逐条发会撞每秒 20 条的限流） */
export const CANDIDATE_BATCH_MS = 100
/** 没配 TURN 时的兜底：Cloudflare 的公共 STUN（免费、不限量）；同一 WiFi / 普通家用宽带靠它就能直连 */
export const DEFAULT_ICE_SERVERS: readonly IceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }]
/** 信令的上限：SDP 常有 2–4 KB，给 16 K 字；候选一包 ≤ 64 条、每条 ≤ 512 字 */
export const MAX_SDP_CHARS = 16_000
export const MAX_CANDIDATES = 64
export const MAX_CANDIDATE_CHARS = 512

/** 房间里除了我、在线且开了麦的人（我没开麦时只收他们的） */
export function voicePeers(members: readonly Member[], me: string): string[] {
  return members.filter((m) => m.clientId !== me && m.online && m.voice).map((m) => m.clientId)
}

/**
 * 我要和谁连：开了麦的人连房间里所有在线的人（开了麦的优先，其余按进房顺序，最多 MAX_PEERS 个）；
 * 没开麦的人只和开了麦的人连（等他们来连）
 */
export function wantedPeers(members: readonly Member[], me: string, meSpeaks: boolean): string[] {
  if (!meSpeaks) return voicePeers(members, me)
  return members
    .filter((m) => m.clientId !== me && m.online)
    .sort((a, b) => Number(b.voice) - Number(a.voice) || a.joinedAt - b.joinedAt || (a.clientId < b.clientId ? -1 : a.clientId > b.clientId ? 1 : 0))
    .slice(0, MAX_PEERS)
    .map((m) => m.clientId)
}

/** 我还能开麦吗：名额 VOICE_MAX（别人开着的算，掉线的也算——他回来还是占名额；我自己不算） */
export function canEnableVoice(members: readonly Member[], me: string): boolean {
  return members.filter((m) => m.clientId !== me && m.voice).length < VOICE_MAX
}

/** 两个都开了麦的人之间谁发 offer：对外身份字典序小的一方。两边算出来一样，不会同时发（没有 glare） */
export function isOfferer(me: string, other: string): boolean {
  return me < other
}

/** 一对人里谁发 offer：都开了麦按字典序小的；只有一方开了麦就是那一方；都没开不连（null） */
export function pairOfferer(a: string, aSpeaks: boolean, b: string, bSpeaks: boolean): string | null {
  if (aSpeaks && bSpeaks) return isOfferer(a, b) ? a : b
  if (aSpeaks) return a
  if (bSpeaks) return b
  return null
}

/** 对着新名单算出要新建 / 要关掉的连接 */
export function planPeers(current: Iterable<string>, wanted: readonly string[]): { open: string[]; close: string[] } {
  const have = new Set(current)
  const want = new Set(wanted)
  return { open: wanted.filter((id) => !have.has(id)), close: [...have].filter((id) => !want.has(id)) }
}

function isCandidate(v: unknown): v is RtcCandidate {
  if (!v || typeof v !== 'object') return false
  const c = v as Record<string, unknown>
  return (
    typeof c.candidate === 'string' &&
    c.candidate.length <= MAX_CANDIDATE_CHARS &&
    (c.sdpMid === null || typeof c.sdpMid === 'string') &&
    (c.sdpMLineIndex === null || (typeof c.sdpMLineIndex === 'number' && Number.isInteger(c.sdpMLineIndex)))
  )
}

/** 信令的形状（客户端与服务器都用它把不对的丢掉）：一份 SDP 或一批候选，不能两样都有 */
export function isRtcSignal(v: unknown): v is RtcSignal {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length !== 1) return false
  if ('sdp' in o) {
    const d = o.sdp as Record<string, unknown> | null
    return !!d && typeof d === 'object' && (d.type === 'offer' || d.type === 'answer') && typeof d.sdp === 'string' && d.sdp.length <= MAX_SDP_CHARS
  }
  if ('candidates' in o) return Array.isArray(o.candidates) && o.candidates.length <= MAX_CANDIDATES && o.candidates.every(isCandidate)
  return false
}

const ICE_URL = /^(stun|stuns|turn|turns):[A-Za-z0-9.-]+(:\d{1,5})?(\?transport=(udp|tcp))?$/
/**
 * 服务器 / 别处给的 ICE 服务器清单：只留形状对的——urls 只能是 stun(s): / turn(s): 加主机名（带端口、transport 也行），
 * turn(s) 必须带用户名与口令（没有凭据的 turn 条目会让 new RTCPeerConnection 直接抛错）
 */
export function cleanIceServers(v: unknown): IceServer[] {
  if (!Array.isArray(v)) return []
  const out: IceServer[] = []
  for (const item of v) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    const raw = typeof s.urls === 'string' ? [s.urls] : Array.isArray(s.urls) ? s.urls.filter((u): u is string => typeof u === 'string') : []
    const urls = raw.filter((u) => ICE_URL.test(u))
    if (!urls.length) continue
    const server: IceServer = { urls }
    if (typeof s.username === 'string') server.username = s.username
    if (typeof s.credential === 'string') server.credential = s.credential
    if (urls.some((u) => u.startsWith('turn')) && (!server.username || !server.credential)) continue
    out.push(server)
  }
  return out
}

/** 这个环境能不能语音：有 getUserMedia 与 RTCPeerConnection（微信内置浏览器、旧系统没有） */
export function voiceSupported(env: { mediaDevices?: { getUserMedia?: unknown } | undefined; pc?: unknown }): boolean {
  return typeof env.mediaDevices?.getUserMedia === 'function' && typeof env.pc === 'function'
}

export interface BatchTimer {
  set(fn: () => void, ms: number): unknown
  clear(handle: unknown): void
}

/** 候选打包器：add 攒着，到时间一起 flush（一条连接一个）；计时器可注入 */
export class CandidateBatch {
  private items: RtcCandidate[] = []
  private handle: unknown = null
  constructor(
    private readonly send: (candidates: RtcCandidate[]) => void,
    private readonly ms = CANDIDATE_BATCH_MS,
    private readonly timer: BatchTimer = { set: (fn, t) => setTimeout(fn, t), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
  ) {}

  add(c: RtcCandidate): void {
    this.items.push(c)
    if (this.items.length >= MAX_CANDIDATES) {
      this.flush()
      return
    }
    if (this.handle === null) this.handle = this.timer.set(() => this.flush(), this.ms)
  }

  flush(): void {
    if (this.handle !== null) this.timer.clear(this.handle)
    this.handle = null
    if (!this.items.length) return
    const batch = this.items
    this.items = []
    this.send(batch)
  }

  dispose(): void {
    if (this.handle !== null) this.timer.clear(this.handle)
    this.handle = null
    this.items = []
  }
}
