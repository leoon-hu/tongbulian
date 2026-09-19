/**
 * 多设备房间的客户端状态（需求 B13–B25）：连中继服务、拿整份房间快照、发操作；
 * 比赛部分交给 stores/battle（syncOnline / onRemoteEvent），竞技场页不知道自己在哪种模式下（B41）。
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Difficulty } from '@/types/models'
import type { ArenaEvent, Member, Role, RoomError, RoomSnapshot, Team } from '@/battle/protocol'
import { RoomClient, socketUrl, type RoomClientOptions, type SocketLike, type SocketStatus } from '@/battle/socket'
import { useBattleStore } from './battle'

/** 这些错误进不了 / 待不下去房间，页面要换成提示 */
export const FATAL_ERRORS: readonly RoomError[] = ['noRoom', 'closed', 'replaced', 'version', 'full', 'busy']

export const useRoomStore = defineStore('room', () => {
  const battle = useBattleStore()
  const snapshot = ref<RoomSnapshot | null>(null)
  const you = ref('')
  const status = ref<SocketStatus>('idle')
  /** 最近一条错误（致命的留着，页面按它显示；提示类的 3 秒后自己清） */
  const error = ref<RoomError | null>(null)
  /** 想进的房间号（连上前就有，页面显示用） */
  const code = ref<string | null>(null)
  let client: RoomClient | null = null
  let errorTimer: ReturnType<typeof setTimeout> | null = null
  /** 测试可注入假的 WebSocket */
  let factory: RoomClientOptions['factory'] | undefined

  const available = computed(() => socketUrl() !== null)
  const me = computed<Member | undefined>(() => snapshot.value?.members.find((m) => m.clientId === you.value))
  const isHost = computed(() => !!snapshot.value && snapshot.value.hostId === you.value)
  const participants = computed(() => snapshot.value?.members.filter((m) => m.role !== 'watch') ?? [])
  const watchers = computed(() => snapshot.value?.members.filter((m) => m.role === 'watch') ?? [])
  const inMatch = computed(() => {
    const p = snapshot.value?.match?.phase
    return p === 'countdown' || p === 'playing' || p === 'ended'
  })
  /** 两队都至少 1 人在线就能开始（举手不是条件，B21） */
  const canStart = computed(() => {
    const ps = participants.value.filter((m) => m.online)
    return isHost.value && !inMatch.value && ps.some((m) => m.role === 'red') && ps.some((m) => m.role === 'blue')
  })
  const teamMembers = (team: Team): Member[] => snapshot.value?.members.filter((m) => m.role === team) ?? []

  function useFactory(f: RoomClientOptions['factory'] | undefined): void {
    factory = f
  }

  function setError(e: RoomError): void {
    error.value = e
    if (errorTimer) clearTimeout(errorTimer)
    errorTimer = null
    if (!FATAL_ERRORS.includes(e)) {
      errorTimer = setTimeout(() => {
        if (error.value === e) error.value = null
      }, 3000)
    }
  }

  function onState(room: RoomSnapshot, me: string, serverNow?: number): void {
    snapshot.value = room
    you.value = me
    code.value = room.code
    battle.syncOnline(room, me, serverNow)
  }

  /** 页面回到前台（手机锁屏 / 切走再回来）：不等退避，立刻重连（B23） */
  function onVisible(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') client?.kick()
  }

  function onEvent(e: ArenaEvent): void {
    battle.onRemoteEvent(e)
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
      name: battle.prefs.names.me,
      version: __BUILD__,
      onState,
      onEvent,
      onError: setError,
      onStatus: (s) => {
        status.value = s
      },
      factory,
    })
    battle.startOnline({
      send: (msg) => client?.send(msg),
    })
    return client
  }

  /** 打开链接 / 输房间号：连上就进房（t = 链接里的默认身份） */
  function enter(roomCode: string, t?: Role): void {
    reset()
    code.value = roomCode
    const c = makeClient()
    c?.connect(roomCode, t)
  }

  /** 设置页「建房间」：连上后建房，拿到快照就知道房间号 */
  function create(kpId: string, skin: string): void {
    reset()
    const c = makeClient()
    if (!c) return
    c.connect()
    c.send({ type: 'create', kpId, skin })
  }

  function setTeam(role: Role): void {
    client?.send({ type: 'team', role })
  }
  function setReady(ready: boolean): void {
    client?.send({ type: 'ready', ready })
  }
  function setDifficulty(difficulty: Difficulty, clientId?: string): void {
    client?.send(clientId ? { type: 'difficulty', difficulty, clientId } : { type: 'difficulty', difficulty })
  }
  function start(): void {
    client?.send({ type: 'start' })
  }
  function end(): void {
    client?.send({ type: 'end' })
  }
  function rematch(): void {
    client?.send({ type: 'rematch' })
  }
  function setSkin(skin: string): void {
    client?.send({ type: 'skin', skin })
  }
  function setLock(locked: boolean): void {
    client?.send({ type: 'lock', locked })
  }

  function reset(): void {
    snapshot.value = null
    you.value = ''
    error.value = null
    code.value = null
    if (errorTimer) clearTimeout(errorTimer)
    errorTimer = null
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
  }

  return {
    snapshot,
    you,
    status,
    error,
    code,
    available,
    me,
    isHost,
    participants,
    watchers,
    inMatch,
    canStart,
    teamMembers,
    useFactory,
    enter,
    create,
    setTeam,
    setReady,
    setDifficulty,
    start,
    end,
    rematch,
    setSkin,
    setLock,
    leave,
    /** 给测试：直接喂一份快照 / 事件（不经网络） */
    _feed: { onState, onEvent, setError },
  }
})

export type { SocketLike }
