/**
 * 语音通话的客户端状态（需求 B57）：麦克风开关、与房间里的人的点对点连接、谁在说话、连接状态。
 * 只在多设备房间里用：stores/room 把消息通道、快照与转来的信令喂进来；界面只读这里，按钮只调 toggle()。
 * 房间里每个人自动收听，🎤 只管自己的麦克风：开了麦的人向所有在线成员各建一条连接（voice.ts 的 wantedPeers），
 * 没开麦的人只收不发、不加音轨、不请求权限。开麦一定在用户点 🎤 的那一下里（N6 ⑧），进房 / 重连 / 刷新后都是关着的。
 * 每条连接记着建立时的三样（谁发 offer / 我开没开麦 / 对方开没开麦），快照一来发现和现在算出来的不一样就重建：
 * 该我发 offer 的整条重建，该对方发的关掉等他的新 offer；连接失败也由发 offer 的一方隔 RETRY_MS 整条重建。
 * 建连接前先把 ICE 清单要到手（turn 回来或 TURN_WAIT_MS 超时），不然第一批连接没有 TURN；清单有有效期，快过期再要。
 * 麦克风被系统收回（iOS 切后台、来电、别的应用占用）：音轨 ended 就自动关麦并提示，mute 期间标「暂时没声音」。
 * 别人说话时把朗读压低一点（engine/audio 的 duckAudio），音效不压。
 * getUserMedia / RTCPeerConnection / 音频元素 / 压低都可注入（测试用假的）。
 */
import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { ClientMsg, IceServer, Member, RoomSnapshot, RtcSignal } from '@/battle/protocol'
import { DEFAULT_ICE_SERVERS, canEnableVoice, pairOfferer, voicePeers, voiceSupported, wantedPeers } from '@/battle/voice'
import { VoicePeer, createLevelMeter, type LevelMeter, type PeerDeps, type PeerState } from '@/battle/rtc'
import { audioContext, duckAudio } from '@/engine/audio'

export type VoiceError = 'denied' | 'unsupported' | 'full' | 'lost'
/** 名字旁边那颗 🎤：开着 / 正在说话 / 没开 */
export type VoiceMark = 'on' | 'talking' | null
/** 连接状态（🎤 下面写的）：没什么可写 / 连接中 / 连上了 / 连不上 / 人太多没人连我 */
export type LinkState = 'idle' | 'connecting' | 'ok' | 'failed' | 'crowded'

/** 出错提示显示多久 */
export const VOICE_ERROR_MS = 3000
/** 音量采样间隔 */
export const LEVEL_MS = 150
/** 算「在说话」的音量：本机是时域 RMS，对方是接收端报告的 audioLevel（都是 0…1） */
export const MY_TALK_LEVEL = 0.04
export const PEER_TALK_LEVEL = 0.02
/** 连接失败后隔多久由发 offer 的一方整条重建 */
export const RETRY_MS = 2000
/** 连败几次就不再自动重建（每次都是新 pc + STUN / TURN 分配，别无限刷） */
export const MAX_RETRIES = 6
/** 建连接前等 ICE 清单最多这么久 */
export const TURN_WAIT_MS = 1000
/** 连了这么久还没连上才写「连接中」；这么久还没连上当「连不上」 */
export const CONNECT_SHOW_MS = 1500
export const CONNECT_TIMEOUT_MS = 10_000
/** 别人一句话说完后朗读音量再压多久 */
export const DUCK_HOLD_MS = 600
/** ICE 清单快过期（还剩不到这么久）就再要一份 */
const ICE_MARGIN_MS = 60_000
/** 服务器说没有 TURN（ttl 0）：隔这么久再问一次 */
const NO_TURN_RECHECK_MS = 10 * 60 * 1000
/** 要清单没回音（旧服务 / 网络慢）：先用手上的，隔这么久再要 */
const ICE_RETRY_MS = 30_000

export interface VoiceDeps {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  supported: () => boolean
  peer: Partial<PeerDeps>
  now: () => number
  /** 别人说话时压低 / 恢复朗读音量 */
  duck: (on: boolean) => void
}

export interface VoiceTransport {
  send(msg: ClientMsg): void
}

/** 一条活着的连接 + 建立时的三样，变了就重建 */
interface Live {
  peer: VoicePeer
  offerer: boolean
  iSpoke: boolean
  remoteSpoke: boolean
}

export interface PeerInfo {
  state: PeerState
  level: number
  /** 这条（含重建前的）连接建起来的时刻 */
  since: number
  /** 失败过几次（连上就归零） */
  fails: number
}

function defaultDeps(): VoiceDeps {
  return {
    getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
    supported: () =>
      typeof navigator !== 'undefined' &&
      voiceSupported({ mediaDevices: navigator.mediaDevices, pc: typeof RTCPeerConnection === 'undefined' ? undefined : RTCPeerConnection }),
    peer: {},
    now: () => Date.now(),
    duck: duckAudio,
  }
}

export const useVoiceStore = defineStore('voice', () => {
  let deps = defaultDeps()
  /** 麦克风开着 */
  const enabled = ref(false)
  /** 正在申请麦克风 */
  const busy = ref(false)
  /** 系统暂时把麦克风静音了（iOS 切后台） */
  const muted = ref(false)
  const error = ref<VoiceError | null>(null)
  /** 每条连接：状态与对方的音量（收听的连接也在这里） */
  const peers = ref<Record<string, PeerInfo>>({})
  const myLevel = ref(0)
  const members = shallowRef<Member[]>([])
  const me = ref('')
  /** 采样时刻（有连接时每 LEVEL_MS 更新），连接状态按它算「连太久」 */
  const clock = ref(0)
  const talking = computed(() => enabled.value && myLevel.value > MY_TALK_LEVEL)
  /** 说话名额还没满（自己开着不算） */
  const canEnable = computed(() => canEnableVoice(members.value, me.value))
  /** 🎤 下面写的连接状态 */
  const link = computed<LinkState>(() => {
    if (!enabled.value) {
      // 我只是听：有人开着麦却没有一个会连我（他们的名额都被别人占了）
      const speakers = voicePeers(members.value, me.value)
      if (speakers.length && !speakers.some((s) => wantedPeers(members.value, s, true).includes(me.value))) return 'crowded'
    }
    const list = Object.values(peers.value)
    if (!list.length) return 'idle'
    if (list.some((p) => p.state === 'connected')) return 'ok'
    const t = clock.value
    if (list.some((p) => p.state === 'failed' || p.fails > 0 || (p.state === 'connecting' && t - p.since > CONNECT_TIMEOUT_MS))) return 'failed'
    if (list.some((p) => p.state === 'connecting' && t - p.since > CONNECT_SHOW_MS)) return 'connecting'
    return 'idle'
  })

  let transport: VoiceTransport | null = null
  let stream: MediaStream | null = null
  let meter: LevelMeter | null = null
  let iceServers: IceServer[] = DEFAULT_ICE_SERVERS.map((s) => ({ ...s }))
  /** 手上这份清单用到什么时候（含 ICE_MARGIN_MS 的边距）；0 = 还没要过 */
  let iceUntil = 0
  let iceWaiting: Promise<void> | null = null
  let iceResolve: (() => void) | null = null
  let iceTimer: ReturnType<typeof setTimeout> | null = null
  const live = new Map<string, Live>()
  /**
   * 应答方等 ICE 清单时先攒着的信令（按发来的人）：开麦的人的 offer 常比「他开了麦」的快照先到，我这边还没去要 TURN 凭据——
   * 马上应答的话这条连接只有 STUN、没有中转候选，我所在的网络只能走 TCP / 443 时就连不上（线上强制只走中转验出来的）
   */
  const held = new Map<string, RtcSignal[]>()
  let levelTimer: ReturnType<typeof setInterval> | null = null
  let errorTimer: ReturnType<typeof setTimeout> | null = null
  const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()
  let domHooked = false
  let duckUntil = 0
  let ducked = false

  const speaking = (): boolean => enabled.value && stream !== null
  const memberSpeaks = (id: string): boolean => members.value.some((m) => m.clientId === id && m.voice)

  function useDeps(d: Partial<VoiceDeps>): void {
    deps = { ...defaultDeps(), ...d }
  }

  /** 没开麦的人第一次收到声音可能被自动播放策略拦下：任何一次触摸 / 按键再试一次播放 */
  function onGesture(): void {
    for (const l of live.values()) l.peer.retryPlay()
  }
  /** 回到前台：麦克风可能已经被系统收回（音轨 ended）或还静音着 */
  function onVisible(): void {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    checkTracks()
  }
  function hookDom(on: boolean): void {
    if (typeof document === 'undefined' || domHooked === on) return
    domHooked = on
    if (on) {
      document.addEventListener('pointerdown', onGesture, { capture: true, passive: true })
      document.addEventListener('keydown', onGesture, { capture: true, passive: true })
      document.addEventListener('visibilitychange', onVisible)
    } else {
      document.removeEventListener('pointerdown', onGesture, { capture: true })
      document.removeEventListener('keydown', onGesture, { capture: true })
      document.removeEventListener('visibilitychange', onVisible)
    }
  }

  /** stores/room 连上时给消息通道，离开时给 null */
  function attach(t: VoiceTransport | null): void {
    transport = t
    hookDom(t !== null)
  }

  function setError(e: VoiceError): void {
    error.value = e
    if (errorTimer) clearTimeout(errorTimer)
    errorTimer = setTimeout(() => {
      if (error.value === e) error.value = null
      errorTimer = null
    }, VOICE_ERROR_MS)
  }

  // ── ICE 清单（B57 ⑤）：建连接前要到手；没配 TURN 的服务回只有 STUN 的清单（ttl 0） ──

  const iceFresh = (): boolean => deps.now() < iceUntil - ICE_MARGIN_MS
  function finishIce(got: boolean): void {
    if (iceTimer) clearTimeout(iceTimer)
    iceTimer = null
    if (!got && !iceFresh()) iceUntil = deps.now() + ICE_MARGIN_MS + ICE_RETRY_MS
    const r = iceResolve
    iceWaiting = null
    iceResolve = null
    r?.()
  }
  /** 清单还新鲜就直接过；否则要一份（同时只要一次），等回来或超时 */
  function ensureIce(): Promise<void> {
    if (iceFresh() || !transport) return Promise.resolve()
    if (iceWaiting) return iceWaiting
    transport.send({ type: 'turn' })
    iceWaiting = new Promise<void>((resolve) => {
      iceResolve = resolve
      iceTimer = setTimeout(() => finishIce(false), TURN_WAIT_MS)
    })
    return iceWaiting
  }
  function onTurn(list: IceServer[], ttl: number): void {
    if (list.length) {
      iceServers = list
      iceUntil = deps.now() + (ttl > 0 ? ttl * 1000 : NO_TURN_RECHECK_MS + ICE_MARGIN_MS)
    }
    finishIce(list.length > 0)
  }

  // ── 音量、压低、连接状态的时钟 ──

  function setDuck(on: boolean): void {
    if (ducked === on) return
    ducked = on
    deps.duck(on)
  }
  function tickLevels(): void {
    const now = deps.now()
    clock.value = now
    myLevel.value = meter?.level() ?? 0
    let changed = false
    let someoneTalking = false
    const next = { ...peers.value }
    for (const [id, l] of live) {
      const cur = next[id]
      if (!cur) continue
      const level = l.peer.level()
      if (level > PEER_TALK_LEVEL) someoneTalking = true
      if (Math.abs(cur.level - level) > 0.005) {
        next[id] = { ...cur, level }
        changed = true
      }
    }
    if (changed) peers.value = next
    if (someoneTalking) duckUntil = now + DUCK_HOLD_MS
    setDuck(now < duckUntil)
  }
  /** 有连接或开着麦就采样 */
  function syncLevels(): void {
    const need = live.size > 0 || enabled.value
    if (need && !levelTimer) levelTimer = setInterval(tickLevels, LEVEL_MS)
    if (!need && levelTimer) {
      clearInterval(levelTimer)
      levelTimer = null
      setDuck(false)
    }
  }

  // ── 连接 ──

  function clearRetry(id: string): void {
    const t = retryTimers.get(id)
    if (t) clearTimeout(t)
    retryTimers.delete(id)
  }

  function closePeer(id: string): void {
    clearRetry(id)
    const l = live.get(id)
    if (l) {
      live.delete(id)
      l.peer.close()
    }
    if (id in peers.value) {
      const { [id]: _drop, ...rest } = peers.value
      peers.value = rest
    }
    syncLevels()
  }
  function closeAll(): void {
    for (const id of [...live.keys()]) closePeer(id)
  }

  /**
   * 建一条连接（先关掉旧的，失败次数留着）：offerer = 我发 offer；开了麦就带音轨，没开就只收。
   * remoteSpoke 默认按快照；应答别人的 offer 时传 true——发 offer 的人一定开着麦，而他的 offer 常常比「他开了麦」的快照先到
   * （服务器的快照广播有 100 ms 节流，turn 回复没有），按快照记成「没开」的话下一份快照一来就会当配置变了把连接关掉（联调撞过）。
   */
  function openPeer(id: string, offerer: boolean, remoteSpoke = memberSpeaks(id)): void {
    const fails = peers.value[id]?.fails ?? 0
    closePeer(id)
    const iSpoke = speaking()
    const peer: VoicePeer = new VoicePeer({
      id,
      offerer,
      stream: iSpoke ? stream : null,
      iceServers,
      send: (data) => transport?.send({ type: 'rtc', to: id, data }),
      onState: (state) => {
        if (live.get(id)?.peer !== peer || state === 'closed') return
        const cur = peers.value[id]
        if (cur) peers.value = { ...peers.value, [id]: { ...cur, state, fails: state === 'connected' ? 0 : state === 'failed' ? cur.fails + 1 : cur.fails } }
        // 失败了：发 offer 的一方隔一会儿整条重建（两边都是新连接），间隔按失败次数翻倍（2、4、8…最多 32 秒）、
        // 连败 MAX_RETRIES 次就不再试（界面上停在「连不上」，对方重新开关麦克风会从头来）；应答方等对方的新 offer
        const fails = peers.value[id]?.fails ?? 0
        if (state === 'failed' && offerer && !retryTimers.has(id) && fails <= MAX_RETRIES) {
          retryTimers.set(
            id,
            setTimeout(
              () => {
                retryTimers.delete(id)
                const meSpeaks = speaking()
                if (wantedPeers(members.value, me.value, meSpeaks).includes(id) && pairOfferer(me.value, meSpeaks, id, memberSpeaks(id)) === me.value) openPeer(id, true)
              },
              RETRY_MS * Math.min(16, 2 ** Math.max(0, fails - 1)),
            ),
          )
        }
      },
      deps: deps.peer,
    })
    live.set(id, { peer, offerer, iSpoke, remoteSpoke })
    peers.value = { ...peers.value, [id]: { state: 'connecting', level: 0, since: deps.now(), fails } }
    clock.value = deps.now()
    syncLevels()
  }

  /**
   * 对着快照调整连接：不该有的关掉；该有的算出这一对由谁发 offer——和现有连接建立时的三样一样就留着，
   * 不一样（谁开 / 关了麦）就重建：该我发的整条重建，该对方发的关掉等他的新 offer；还没有的同理。
   * 要新建的先把 ICE 清单要到手再建。
   */
  function syncPeers(): void {
    if (!transport) return
    const meSpeaks = speaking()
    const wanted = wantedPeers(members.value, me.value, meSpeaks)
    for (const id of [...live.keys()]) if (!wanted.includes(id)) closePeer(id)
    const opens: string[] = []
    for (const id of wanted) {
      const remoteSpeaks = memberSpeaks(id)
      const who = pairOfferer(me.value, meSpeaks, id, remoteSpeaks)
      if (!who) {
        closePeer(id)
        continue
      }
      const offerer = who === me.value
      const cur = live.get(id)
      // 我发的连接：对方开 / 关麦（要不要收他的音轨）也算配置变了；我应答的连接：对方是发 offer 的一方、他的状态他自己管，
      // 只看谁发与我开没开麦
      if (cur && cur.offerer === offerer && cur.iSpoke === meSpeaks && (!cur.offerer || cur.remoteSpoke === remoteSpeaks)) continue
      if (offerer) opens.push(id)
      else closePeer(id)
    }
    if (!opens.length) return
    if (!iceFresh()) {
      void ensureIce().then(() => syncPeers())
      return
    }
    for (const id of opens) openPeer(id, true)
  }

  function onSnapshot(room: RoomSnapshot, you: string): void {
    members.value = room.members
    me.value = you
    // 只听的人也先把清单要好：等开了麦的人的 offer 来时应答就不用等
    if (!speaking() && voicePeers(room.members, you).length && !iceFresh()) void ensureIce()
    syncPeers()
  }

  /** 对方经服务器转来的信令 */
  function onSignal(from: string, data: RtcSignal): void {
    if (!transport) return
    const isOffer = 'sdp' in data && data.sdp.type === 'offer'
    const queue = held.get(from)
    if (queue) {
      // 还在等清单：接着攒（又来了新 offer 就从它重新开始，旧的作废）
      if (isOffer) queue.length = 0
      queue.push(data)
      return
    }
    if (isOffer && !iceFresh()) {
      // 清单还没到：先要（同时只要一次），回来或 TURN_WAIT_MS 超时后按顺序处理这个人发来的信令
      held.set(from, [data])
      void ensureIce().then(() => {
        const list = held.get(from)
        held.delete(from)
        for (const d of list ?? []) onSignal(from, d)
      })
      return
    }
    const cur = live.get(from)
    if (isOffer) {
      if (!members.value.some((m) => m.clientId === from)) return
      // 发 offer 的一定是开了麦的人；这一对里按现在的状态该由我发的，对方发来的不认
      if (pairOfferer(me.value, speaking(), from, true) === me.value) return
      // 第一次、或者旧的是我发的 / 已经收过他的 SDP（对方整条重建了）：换一条新的应答（发 offer 的人一定开着麦）
      if (!cur || cur.offerer || cur.peer.hasRemote) openPeer(from, false, true)
      const l = live.get(from)
      if (l) void l.peer.handle(data)
      return
    }
    if (cur) void cur.peer.handle(data)
  }

  // ── 麦克风 ──

  /** 麦克风被系统收回：自动关麦并提示 */
  function lostMic(): void {
    if (!enabled.value) return
    disable()
    setError('lost')
  }
  function checkTracks(): void {
    if (!enabled.value || !stream) return
    const tracks = stream.getAudioTracks()
    if (tracks.some((t) => t.readyState === 'ended')) {
      lostMic()
      return
    }
    muted.value = tracks.some((t) => t.muted)
  }
  function watchTracks(s: MediaStream): void {
    for (const t of s.getAudioTracks()) {
      t.onended = () => lostMic()
      t.onmute = () => {
        muted.value = true
      }
      t.onunmute = () => {
        muted.value = false
      }
    }
  }
  function releaseStream(): void {
    for (const t of stream?.getTracks() ?? []) {
      t.onended = null
      t.onmute = null
      t.onunmute = null
      t.stop()
    }
    stream = null
    muted.value = false
  }

  /** 开麦：只在用户手势里调；名额满 / 不支持 / 拒绝了权限都写一句提示 */
  async function enable(): Promise<void> {
    if (enabled.value || busy.value) return
    if (!deps.supported()) {
      setError('unsupported')
      return
    }
    if (!canEnable.value) {
      setError('full')
      return
    }
    busy.value = true
    let s: MediaStream
    try {
      s = await deps.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    } catch {
      busy.value = false
      setError('denied')
      return
    }
    busy.value = false
    if (!transport) {
      // 申请期间离开了房间
      for (const t of s.getTracks()) t.stop()
      return
    }
    stream = s
    enabled.value = true
    error.value = null
    watchTracks(s)
    meter = createLevelMeter(s, audioContext())
    transport.send({ type: 'voice', on: true })
    syncPeers()
    syncLevels()
  }

  /** 关麦：释放麦克风、告诉大家；还在收听——和开了麦的人的连接由他们重建成只收的 */
  function disable(): void {
    if (!enabled.value) return
    enabled.value = false
    meter?.close()
    meter = null
    releaseStream()
    myLevel.value = 0
    syncPeers()
    syncLevels()
    transport?.send({ type: 'voice', on: false })
  }

  async function toggle(): Promise<void> {
    if (enabled.value) disable()
    else await enable()
  }

  /** 断线重连接回座位：座位上的 voice 还在，再报一次让服务器与别人确认 */
  function onReconnected(): void {
    if (!enabled.value) return
    transport?.send({ type: 'voice', on: true })
  }

  /** 离开房间：全部关掉、归零 */
  function leave(): void {
    disable()
    closeAll()
    held.clear()
    members.value = []
    me.value = ''
    iceServers = DEFAULT_ICE_SERVERS.map((s) => ({ ...s }))
    iceUntil = 0
    finishIce(false)
    iceUntil = 0
    transport = null
    hookDom(false)
    busy.value = false
    error.value = null
    if (errorTimer) clearTimeout(errorTimer)
    errorTimer = null
    syncLevels()
    setDuck(false)
  }

  /** 这个人名字旁的 🎤：我自己按开关与音量；别人按快照里开没开麦，再按连接上报的音量算说话（收听的连接不算开麦） */
  function markOf(id: string): VoiceMark {
    if (id === me.value) return enabled.value ? (talking.value ? 'talking' : 'on') : null
    if (!memberSpeaks(id)) return null
    const p = peers.value[id]
    return p && p.level > PEER_TALK_LEVEL ? 'talking' : 'on'
  }

  return {
    enabled,
    busy,
    muted,
    error,
    peers,
    myLevel,
    talking,
    canEnable,
    link,
    useDeps,
    attach,
    onSnapshot,
    onSignal,
    onTurn,
    onReconnected,
    enable,
    disable,
    toggle,
    leave,
    markOf,
  }
})
