/**
 * 多设备房间的客户端状态（需求 B13–B25，2026-09-20 用户定的极简流程）：连中继服务、拿整份房间快照；
 * 进队由链接决定、开始由服务器自动，客户端只发 hello / create / lookup / team（建房的设备自己上场）/ input / answer / rematch / next / leave / ping。
 * 比赛部分按房间的玩法交出去：对战给 stores/battle、打怪兽给 stores/boss（都是 syncOnline / onRemoteEvent），竞技场页不知道自己在哪种模式下（B41 / M13）。
 */
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { hasGenerator } from '@/engine'
import { courseLoaded, courseOfKp, loadCourse } from '@/engine/catalog'
import type { ArenaEvent, BossRoomOpts, Member, Role, RoomError, RoomFormat, RoomSnapshot, Team } from '@/battle/protocol'
import type { BossArenaEvent } from '@/battle/timed'
import { RoomClient, socketUrl, type RoomClientOptions, type SocketLike, type SocketStatus } from '@/battle/socket'
import { joinOpen, roomAvailable, roomInMatch, roomKpId } from '@/battle/lite'
import { useBattleStore } from './battle'
import { useBossStore } from './boss'
import { useVoiceStore } from './voice'
import { reloadForNewVersion } from '@/engine/update'

/** 内容包加载期间攒着的最新快照（快照、我是谁、服务器时刻）与事件 */
interface Held {
  state: [RoomSnapshot, string, number | undefined]
  events: (ArenaEvent | BossArenaEvent)[]
}

/** 这些错误进不了 / 待不下去房间，页面要换成提示 */
export const FATAL_ERRORS: readonly RoomError[] = ['noRoom', 'closed', 'replaced', 'version', 'full', 'busy']

export const useRoomStore = defineStore('room', () => {
  const battle = useBattleStore()
  const boss = useBossStore()
  const voice = useVoiceStore()
  const snapshot = ref<RoomSnapshot | null>(null)
  const you = ref('')
  const status = ref<SocketStatus>('idle')
  /** 最近一条错误（致命的留着，页面按它显示；提示类的 3 秒后自己清） */
  const error = ref<RoomError | null>(null)
  /** 想进的房间号（连上前就有，页面显示用） */
  const code = ref<string | null>(null)
  /** 口令查到的房间号与身份（B19）：「加入对战」面板看到它就跳到房间页 */
  const found = ref<{ code: string; t: Role } | null>(null)
  // 全局「加入对战」面板开着：真值在 battle/lite.ts（顶栏 / App 不引这个 store 也能看）
  /** 页面版本旧了，正在更新并重载（B43）：页面显示「正在更新…」；重载没成功（同版本已试过）会变回 false，错误照常显示 */
  const updating = ref(false)
  let client: RoomClient | null = null
  let errorTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * 内容包按需加载（N8）：快照里的知识点属于还没加载的课（比如扫码直接进语文的房间），先加载再处理——
   * 这期间的快照只留最新的、事件按顺序攒着，加载完一起交给比赛 store；换房间 / 离开就作废
   */
  let held: Held | null = null
  /** 测试可注入假的 WebSocket */
  let factory: RoomClientOptions['factory'] | undefined

  const available = roomAvailable
  const me = computed<Member | undefined>(() => snapshot.value?.members.find((m) => m.clientId === you.value))
  const isHost = computed(() => !!snapshot.value && snapshot.value.hostId === you.value)
  const participants = computed(() => snapshot.value?.members.filter((m) => m.role !== 'watch') ?? [])
  const watchers = computed(() => snapshot.value?.members.filter((m) => m.role === 'watch') ?? [])
  /** 房间的玩法（M13）：旧服务器的快照没有这个字段，按对战 */
  const format = computed<RoomFormat>(() => (snapshot.value?.format === 'boss' ? 'boss' : 'battle'))
  const inMatch = computed(() => {
    const p = snapshot.value?.match?.phase ?? snapshot.value?.timed?.phase
    return p === 'countdown' || p === 'playing' || p === 'paused' || p === 'ended'
  })
  const teamMembers = (team: Team): Member[] => snapshot.value?.members.filter((m) => m.role === team) ?? []
  // 镜像给轻模块（App.vue / AppHeader 只看它）
  watch(inMatch, (v) => (roomInMatch.value = v), { immediate: true })
  watch(() => snapshot.value?.kpId ?? null, (v) => (roomKpId.value = v), { immediate: true })

  function useFactory(f: RoomClientOptions['factory'] | undefined): void {
    factory = f
  }

  function setError(e: RoomError): void {
    error.value = e
    if (errorTimer) clearTimeout(errorTimer)
    errorTimer = null
    if (e === 'version' && !updating.value) {
      // 本页出题代码的版本旧了：自己更新重载，不让用户刷新（B43）
      updating.value = true
      void reloadForNewVersion().then((did) => {
        if (!did) updating.value = false
      })
    }
    if (!FATAL_ERRORS.includes(e)) {
      errorTimer = setTimeout(() => {
        if (error.value === e) error.value = null
      }, 3000)
    }
  }

  function onState(room: RoomSnapshot, me: string, serverNow?: number): void {
    if (held) {
      held.state = [room, me, serverNow]
      return
    }
    const courseId = courseOfKp(room.kpId)?.course.id
    if (courseId && !courseLoaded(courseId)) {
      const mine: Held = { state: [room, me, serverNow], events: [] }
      held = mine
      void loadCourse(courseId)
        .catch(() => undefined)
        .then(() => {
          if (held !== mine) return
          held = null
          applyState(...mine.state)
          for (const e of mine.events) onEvent(e)
        })
      return
    }
    applyState(room, me, serverNow)
  }

  function applyState(room: RoomSnapshot, me: string, serverNow?: number): void {
    // 服务器不认识目录，只透传建房者给的知识点 id（B41）：这个页面没有这个知识点的生成器（别人乱填的、或者版本不同、
    // 内容包没加载成）就当没有这个房间——不然进了竞技场出题时会抛错、整页空白
    if (!hasGenerator(room.kpId)) {
      client?.close()
      client = null
      setError('noRoom')
      return
    }
    snapshot.value = room
    you.value = me
    code.value = room.code
    if (room.format === 'boss') boss.syncOnline(room, me, serverNow)
    else battle.syncOnline(room, me, serverNow)
    voice.onSnapshot(room, me)
  }

  function onEvent(e: ArenaEvent | BossArenaEvent): void {
    if (held) held.events.push(e)
    else if (format.value === 'boss') boss.onRemoteEvent(e as BossArenaEvent)
    else battle.onRemoteEvent(e as ArenaEvent)
  }

  /** 页面回到前台（手机锁屏 / 切走再回来）：不等退避，立刻重连（B23） */
  function onVisible(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') client?.kick()
  }

  function makeClient(): RoomClient | null {
    const url = socketUrl()
    if (!url) {
      setError('noRoom')
      return null
    }
    client?.close()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisible)
      document.addEventListener('visibilitychange', onVisible)
    }
    client = new RoomClient({
      url,
      clientId: battle.prefs.clientId,
      // 名字与小动物（B17）：自定义的优先，没有就随机点选的；哪样是随机的一起发，撞了服务器换
      ...battle.onlineIdentity(),
      version: __BUILD__,
      onState,
      onEvent,
      onError: setError,
      onStatus: (s) => {
        const was = status.value
        status.value = s
        // 断线后重新连上（接回座位）：语音再报一次开麦（B57）
        if (s === 'open' && was === 'reconnecting') voice.onReconnected()
      },
      onFound: (roomCode, t) => {
        found.value = { code: roomCode, t }
      },
      onRtc: (from, data) => voice.onSignal(from, data),
      onTurn: (iceServers, ttl) => voice.onTurn(iceServers, ttl),
      // 别人的表情（B58）：直接进竞技场的飞行层；打怪兽里那个小动物还在观众席举一下牌（M12）
      onEmote: (from, role, id) => {
        const bossOn = format.value === 'boss' && !!boss.state
        battle.onRemoteEmote(role, id, bossOn)
        if (bossOn) boss.onEmote(from)
      },
      factory,
    })
    // 两个比赛 store 都接上发送通道：进房前不知道房间是哪种玩法，快照来了按 format 喂其中一个
    battle.startOnline({
      send: (msg) => client?.send(msg),
    })
    boss.startOnline({
      send: (msg) => client?.send(msg),
    })
    voice.attach({ send: (msg) => client?.send(msg) })
    return client
  }

  /** 扫码 / 打开链接：连上就进房（t = 链接里的身份：红队 / 蓝队 / 观战） */
  function enter(roomCode: string, t?: Role): void {
    reset()
    code.value = roomCode
    const c = makeClient()
    c?.connect(roomCode, t)
  }

  /** 设置页「建房间」：连上后建房，拿到快照就知道房间号；建房的这台设备只观战。bossOpts：建打怪兽的房间（M5） */
  function create(kpId: string, skin: string, bossOpts?: BossRoomOpts): void {
    reset()
    const c = makeClient()
    if (!c) return
    c.connect()
    c.send(bossOpts ? { type: 'create', kpId, skin, format: 'boss', boss: bossOpts } : { type: 'create', kpId, skin })
  }

  /** 「加入对战」面板：连上后拿口令换房间号与身份（found），再由面板按链接的方式进房 */
  function lookup(pass: string): void {
    reset()
    const c = makeClient()
    if (!c) return
    c.connect()
    c.send({ type: 'lookup', pass })
  }

  function reset(): void {
    // 换房间 / 离开：语音先关掉（麦克风释放、连接断开），新房间里要再点一次 🎤（B57）
    voice.leave()
    held = null
    snapshot.value = null
    you.value = ''
    error.value = null
    code.value = null
    found.value = null
    updating.value = false
    if (errorTimer) clearTimeout(errorTimer)
    errorTimer = null
  }

  /** 建房的设备自己上场（B20）：进红队 / 蓝队；两队都有人服务器就自动开始 */
  function setTeam(role: Role): void {
    client?.send({ type: 'team', role })
  }

  /** 离开房间：告诉服务器释放座位、断开连接；比赛状态也清掉 */
  function leave(): void {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
    if (client) {
      client.send({ type: 'leave' })
      client.close()
      client = null
    }
    status.value = 'idle'
    reset()
    battle.leave()
    boss.leave()
  }

  return {
    snapshot,
    you,
    status,
    error,
    code,
    found,
    joinOpen,
    updating,
    available,
    me,
    isHost,
    format,
    participants,
    watchers,
    inMatch,
    teamMembers,
    useFactory,
    enter,
    create,
    lookup,
    setTeam,
    leave,
    /** 给测试：直接喂一份快照 / 事件（不经网络） */
    _feed: { onState, onEvent, setError },
  }
})

export type { SocketLike }
