/**
 * 房间状态机（需求 B13–B25、B41–B45）：纯函数——输入一条消息，输出新房间 + 要做的事（广播快照、发瞬时事件、给某人报错）。
 * 比赛本身是 src/battle/match.ts 那一份状态机（单设备也跑它）；这里只管成员、座位、举手、主持人、锁队、开始 / 结束 / 再来一局（没有难度：题目难度与练习页一样固定）。
 * 进来的人不指定队就分到人少的队（一样多进红队）；建房的设备只观战（算主持人）；红蓝两队都有人在线且没开过局就自动开始（autoStart）；
 * 主持人掉线 HOST_GRACE_MS 内回来不换人（屏幕锁一下就换主持人太吓人）。
 * 网络层（index.ts）只管连接、房间表、心跳、限流、节流广播；node 里能单测。
 */
import type { ArenaEvent, ClientMsg, Member, Role, RoomError, RoomSnapshot, Team } from '@/battle/protocol'
import { answer, beginPlay, createMatch, setInput, startMatch } from '@/battle/match'
import { cleanName } from '@/battle/names'

export interface Room extends RoomSnapshot {
  /** 建房者的构建版本：后来者不一致就拒绝（B43） */
  version: string
  /** 最后一次有人在线 / 有消息的时刻（GC 用） */
  lastActive: number
}

export type Effect =
  | { type: 'broadcast' }
  | { type: 'event'; e: ArenaEvent }
  | { type: 'error'; to: string; error: RoomError }

export interface Result {
  room: Room
  effects: Effect[]
}

/** 每队最多几人、每房间最多几个连接（B45） */
export const TEAM_MAX = 6
export const ROOM_MAX = 32
/** 全部连接断开多久后销毁房间；建房多久后一定销毁（B19） */
export const ROOM_IDLE_MS = 10 * 60 * 1000
export const ROOM_LIFE_MS = 3 * 60 * 60 * 1000
/** 主持人掉线多久才把主持权交给别人（B22） */
export const HOST_GRACE_MS = 20 * 1000

/** 房间号 6 位：去掉 0 O 1 I L 这些易混字符（B19） */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function makeCode(random: () => number = Math.random): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]
  return s
}
export function isCode(v: unknown): v is string {
  return typeof v === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(v)
}

const isTeam = (r: Role): r is Team => r === 'red' || r === 'blue'
const isRole = (v: unknown): v is Role => v === 'red' || v === 'blue' || v === 'watch'

function teamCount(room: Room, team: Team): number {
  return room.members.filter((m) => m.role === team).length
}
/** 人少的队（一样多进红队） */
function smallerTeam(room: Room): Team {
  return teamCount(room, 'red') <= teamCount(room, 'blue') ? 'red' : 'blue'
}
const otherTeam = (t: Team): Team => (t === 'red' ? 'blue' : 'red')

/** 比赛进行中（倒数或比赛）：不能换队、不能改难度 */
function inMatch(room: Room): boolean {
  return room.match !== null && (room.match.phase === 'countdown' || room.match.phase === 'playing')
}

export function snapshot(room: Room): RoomSnapshot {
  return {
    code: room.code,
    kpId: room.kpId,
    skin: room.skin,
    hostId: room.hostId,
    locked: room.locked,
    createdAt: room.createdAt,
    members: room.members,
    match: room.match,
  }
}

export function createRoom(opts: {
  code: string
  kpId: string
  skin: string
  host: { clientId: string; name: string; role?: Role }
  version: string
  now: number
}): Room {
  const host: Member = {
    clientId: opts.host.clientId,
    name: cleanName(opts.host.name),
    role: opts.host.role ?? 'watch',
    ready: false,
    online: true,
    joinedAt: opts.now,
  }
  return {
    code: opts.code,
    kpId: opts.kpId,
    skin: opts.skin,
    hostId: host.clientId,
    locked: false,
    createdAt: opts.now,
    members: [host],
    match: null,
    version: opts.version,
    lastActive: opts.now,
  }
}

/**
 * 加入（打开链接 / 重连）：同一 clientId 回来就接回原座位；没指定队就分到人少的队；比赛开始后只能观战；
 * 指定的队满了就进另一队、都满了观战。返回的 error 是给这个人的提示（started / teamFull 是提示，仍然加入；
 * version / full 是拒绝，room 不变）。
 */
export function join(room: Room, who: { clientId: string; name: string; t?: Role; version: string }, now: number): { room: Room; error?: RoomError } {
  if (who.version !== room.version) return { room, error: 'version' }
  const existing = room.members.find((m) => m.clientId === who.clientId)
  if (existing) {
    const name = cleanName(who.name) || existing.name
    const members = room.members.map((m) => (m === existing ? { ...m, online: true, name } : m))
    return { room: withMembers({ ...room, lastActive: now }, members) }
  }
  if (room.members.length >= ROOM_MAX) return { room, error: 'full' }
  const wanted: Role | undefined = who.t && isRole(who.t) ? who.t : undefined
  let role: Role = 'watch'
  let error: RoomError | undefined
  if (wanted !== 'watch') {
    if (inMatch(room)) error = 'started'
    else {
      const pick = wanted ?? smallerTeam(room)
      if (teamCount(room, pick) < TEAM_MAX) role = pick
      else {
        error = 'teamFull'
        if (teamCount(room, otherTeam(pick)) < TEAM_MAX) role = otherTeam(pick)
      }
    }
  }
  const member: Member = { clientId: who.clientId, name: cleanName(who.name), role, ready: false, online: true, joinedAt: now }
  const next: Room = { ...room, members: [...room.members, member], lastActive: now }
  return error ? { room: next, error } : { room: next }
}

/** 换成员名单，同时把比赛里对应的人的在线状态 / 名字跟上；离开房间的人在比赛里算掉线 */
function withMembers(room: Room, members: Member[]): Room {
  if (!room.match) return { ...room, members }
  const players = room.match.players.map((p) => {
    const m = members.find((x) => x.clientId === p.id)
    return m ? { ...p, online: m.online, name: m.name } : p.online ? { ...p, online: false } : p
  })
  return { ...room, members, match: { ...room.match, players } }
}

/** 主持人掉线 / 离开：交给最早连进来还在线的人，参赛者优先（B22） */
function nextHost(room: Room): string {
  const online = room.members.filter((m) => m.online && m.clientId !== room.hostId)
  online.sort((a, b) => Number(isTeam(b.role)) - Number(isTeam(a.role)) || a.joinedAt - b.joinedAt)
  return online[0]?.clientId ?? room.hostId
}

export function setOnline(room: Room, clientId: string, online: boolean, now: number): Result {
  const m = room.members.find((x) => x.clientId === clientId)
  if (!m || m.online === online) return { room, effects: [] }
  const next = withMembers(
    { ...room, lastActive: now },
    room.members.map((x) => {
      if (x !== m) return x
      const { offlineAt: _drop, ...rest } = x
      return online ? { ...rest, online: true } : { ...rest, online: false, offlineAt: now }
    }),
  )
  return { room: next, effects: [{ type: 'broadcast' }] }
}

/** 主持人掉线超过 HOST_GRACE_MS（或已不在名单里）就交接；网络层定时调用（B22） */
export function reassignHost(room: Room, now: number): Result {
  const host = room.members.find((m) => m.clientId === room.hostId)
  const gone = !host || (!host.online && now - (host.offlineAt ?? now) >= HOST_GRACE_MS)
  if (!gone) return { room, effects: [] }
  const next = nextHost(room)
  if (next === room.hostId) return { room, effects: [] }
  return { room: { ...room, hostId: next }, effects: [{ type: 'broadcast' }] }
}

/** 倒数到点：开打（B42：开始时刻由服务器定） */
export function tick(room: Room, now: number): Result {
  if (!room.match || room.match.phase !== 'countdown' || now < room.match.startedAt) return { room, effects: [] }
  return { room: { ...room, match: beginPlay(room.match, now) }, effects: [{ type: 'broadcast' }, { type: 'event', e: { type: 'go' } }] }
}

/** 参赛者（红蓝两队）；观众不进比赛 */
function participants(room: Room): Member[] {
  return room.members.filter((m) => isTeam(m.role))
}

/** 两队都至少 1 人在线就能开始（举手不是条件，B21） */
function canStartRoom(room: Room): boolean {
  const ps = participants(room).filter((m) => m.online)
  return ps.some((m) => m.role === 'red') && ps.some((m) => m.role === 'blue')
}

function startRoom(room: Room, seeds: Record<string, number>, now: number): Room {
  const ps = participants(room)
  const match = createMatch({
    kpId: room.kpId,
    skin: room.skin,
    players: ps.map((m) => ({ id: m.clientId, name: m.name, team: m.role as Team })),
  })
  const started = startMatch(match, seeds, now)
  const players = started.players.map((p) => ({ ...p, online: room.members.find((m) => m.clientId === p.id)?.online ?? true }))
  return { ...room, match: { ...started, players }, members: room.members.map((m) => ({ ...m, ready: false })), lastActive: now }
}

const err = (to: string, error: RoomError): Effect => ({ type: 'error', to, error })

/**
 * 自动开始（B21）：红蓝两队都至少 1 人在线、而且这个房间还没开过局（match 为 null）就开始倒数；
 * 比赛结束后不自动再来（要主持人按「再来一局」）。网络层每次改动房间后调一次。
 */
export function autoStart(room: Room, now: number, seeds: () => number = () => Math.floor(Math.random() * 2 ** 31)): Result {
  if (room.match !== null || !canStartRoom(room)) return { room, effects: [] }
  const seedMap = Object.fromEntries(participants(room).map((m) => [m.clientId, seeds()]))
  return { room: startRoom({ ...room, lastActive: now }, seedMap, now), effects: [{ type: 'broadcast' }, { type: 'event', e: { type: 'countdown' } }] }
}

/**
 * 处理一条消息。seeds：开始 / 再来一局时给每个参赛者的题目种子（网络层生成；测试注入）。
 */
export function apply(room: Room, from: string, msg: ClientMsg, now: number, seeds: () => number = () => Math.floor(Math.random() * 2 ** 31)): Result {
  const me = room.members.find((m) => m.clientId === from)
  if (!me) return { room, effects: [err(from, 'bad')] }
  const isHost = room.hostId === from
  const base: Room = { ...room, lastActive: now }
  const members = (f: (m: Member) => Member): Room => withMembers(base, room.members.map((m) => (m.clientId === from ? f(m) : m)))
  switch (msg.type) {
    case 'team': {
      if (!isRole(msg.role)) return { room, effects: [err(from, 'bad')] }
      if (msg.role === me.role) return { room, effects: [] }
      if (inMatch(room)) return { room, effects: [err(from, 'started')] }
      if (room.locked && !isHost) return { room, effects: [err(from, 'locked')] }
      if (isTeam(msg.role) && teamCount(room, msg.role) >= TEAM_MAX) return { room, effects: [err(from, 'teamFull')] }
      return { room: members((m) => ({ ...m, role: msg.role, ready: false })), effects: [{ type: 'broadcast' }] }
    }
    case 'ready': {
      if (!isTeam(me.role) || inMatch(room)) return { room, effects: [err(from, 'bad')] }
      if (me.ready === !!msg.ready) return { room, effects: [] }
      return { room: members((m) => ({ ...m, ready: !!msg.ready })), effects: [{ type: 'broadcast' }] }
    }
    case 'start': {
      if (!isHost) return { room, effects: [err(from, 'notHost')] }
      if (inMatch(room) || !canStartRoom(room)) return { room, effects: [err(from, 'bad')] }
      const seedMap = Object.fromEntries(participants(room).map((m) => [m.clientId, seeds()]))
      return { room: startRoom(base, seedMap, now), effects: [{ type: 'broadcast' }, { type: 'event', e: { type: 'countdown' } }] }
    }
    case 'rematch': {
      if (!isHost) return { room, effects: [err(from, 'notHost')] }
      if (!room.match || room.match.phase !== 'ended') return { room, effects: [err(from, 'bad')] }
      const ps = participants(room)
      if (!ps.some((m) => m.role === 'red') || !ps.some((m) => m.role === 'blue')) return { room, effects: [err(from, 'bad')] }
      const seedMap = Object.fromEntries(ps.map((m) => [m.clientId, seeds()]))
      return { room: startRoom(base, seedMap, now), effects: [{ type: 'broadcast' }, { type: 'event', e: { type: 'countdown' } }] }
    }
    case 'end': {
      if (!isHost) return { room, effects: [err(from, 'notHost')] }
      if (!room.match) return { room, effects: [] }
      return { room: { ...base, match: null, members: room.members.map((m) => ({ ...m, ready: false })) }, effects: [{ type: 'broadcast' }] }
    }
    case 'skin': {
      if (!isHost) return { room, effects: [err(from, 'notHost')] }
      if (typeof msg.skin !== 'string' || !msg.skin || msg.skin.length > 32 || inMatch(room)) return { room, effects: [err(from, 'bad')] }
      return { room: { ...base, skin: msg.skin }, effects: [{ type: 'broadcast' }] }
    }
    case 'lock': {
      if (!isHost) return { room, effects: [err(from, 'notHost')] }
      if (room.locked === !!msg.locked) return { room, effects: [] }
      return { room: { ...base, locked: !!msg.locked }, effects: [{ type: 'broadcast' }] }
    }
    case 'input': {
      if (!room.match || room.match.phase !== 'playing' || typeof msg.input !== 'string') return { room, effects: [] }
      const match = setInput(room.match, from, msg.input.slice(0, 32))
      if (match === room.match) return { room, effects: [] }
      return { room: { ...base, match }, effects: [{ type: 'broadcast' }] }
    }
    case 'answer': {
      if (!room.match || room.match.phase !== 'playing') return { room, effects: [err(from, 'bad')] }
      if (typeof msg.index !== 'number' || typeof msg.given !== 'string') return { room, effects: [err(from, 'bad')] }
      const res = answer(room.match, from, msg.index, !!msg.correct, msg.given.slice(0, 32), now)
      if (res.state === room.match) return { room, effects: [err(from, 'bad')] }
      return { room: { ...base, match: res.state }, effects: [{ type: 'broadcast' }, ...res.events.map((e): Effect => ({ type: 'event', e }))] }
    }
    case 'leave': {
      let next: Room = withMembers(base, room.members.filter((m) => m.clientId !== from))
      if (next.members.length === 0) return { room: next, effects: [] }
      if (from === room.hostId) next = { ...next, hostId: nextHost({ ...next, hostId: '' }) }
      return { room: next, effects: [{ type: 'broadcast' }] }
    }
    case 'ping':
    case 'hello':
    case 'create':
      return { room: base, effects: [] }
    default:
      return { room, effects: [err(from, 'bad')] }
  }
}

/** 该销毁了吗（B19）：全部离线超过 ROOM_IDLE_MS，或建房超过 ROOM_LIFE_MS */
export function expired(room: Room, now: number): boolean {
  if (now - room.createdAt > ROOM_LIFE_MS) return true
  const anyOnline = room.members.some((m) => m.online)
  return !anyOnline && now - room.lastActive > ROOM_IDLE_MS
}
