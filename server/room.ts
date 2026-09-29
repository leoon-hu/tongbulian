/**
 * 房间状态机（需求 B13–B25、B41–B45）：纯函数——输入一条消息，输出新房间 + 要做的事（广播快照、发瞬时事件、给某人报错）。
 * 比赛本身是 src/battle/match.ts 那一份状态机（单设备也跑它）；这里只管成员、座位、举手、主持人、锁队、开始 / 结束 / 再来一局 / 下一章 / 不玩了（没有难度：题目难度与练习页一样固定）。
 * 进来的人不指定队就分到人少的队（一样多进红队）；建房的设备只观战（算主持人）；人齐了且没开过局就自动开始（autoStart）；
 * 主持人掉线 HOST_GRACE_MS 内回来不换人（屏幕锁一下就换主持人太吓人）。
 * 房间有两种玩法（建房时定，M5 / M13）：battle 先答对 8 题（match.ts），boss 打怪兽（src/battle/timed.ts，限时）——
 * 打怪兽房间的一局放在 timed、match 一直是 null；计时以服务器为准：开打时定下 endsAt，网络层按 endsAt 调 tick 发最后 10 秒与时间到，
 * endsAt 之后 GRACE_MS 内到的答案还算。多设备没有暂停。
 * 网络层（index.ts）只管连接、房间表、心跳、限流、节流广播；node 里能单测。
 */
import { randomInt } from 'node:crypto'
import type { ArenaEvent, AutoIdentity, BossRoomOpts, ClientMsg, Member, Player, Role, RoomError, RoomFormat, RoomSnapshot, Team } from '@/battle/protocol'
import { answer, beginPlay, createMatch, setInput, startMatch } from '@/battle/match'
import {
  GRACE_MS,
  answer as timedAnswer,
  beginPlay as timedBeginPlay,
  createTimed,
  isDurationS,
  setInput as timedSetInput,
  tick as timedTick,
  type BossArenaEvent,
  type TimedMatch,
  type TimedVariant,
} from '@/battle/timed'
import { cleanName } from '@/battle/names'
import { VOICE_MAX } from '@/battle/voice'
import { AVATAR_IDS, avatarNameLang, pickIdentity, type AvatarId } from '@/battle/avatars'

/**
 * 房间号、口令、题目种子都用加密随机数（N6 ⑨）：Math.random 是可预测的 xorshift128+，种子又随快照广播给房间里
 * 所有人，从自己房间的输出就能恢复状态、预测别人的房间号与口令。random() 参数仍可注入（测试用固定序列）。
 */
export const secureRandom = (): number => randomInt(0, 2 ** 31) / 2 ** 31
export const randomSeed = (): number => randomInt(0, 2 ** 31)

export interface Room extends RoomSnapshot {
  /** 建房者的构建版本：后来者不一致就拒绝（B43） */
  version: string
  /** 最后一次有人在线 / 有消息的时刻（GC 用） */
  lastActive: number
  /**
   * 开过几局（每开一局 +1，不进快照）：网络层的定时回调（倒数到点、最后 10 秒、时间到）靠它核对还是不是同一局——
   * 再来一局的新一局可能与上一局的开始时刻相同（测试里时钟不走），只比时刻会串
   */
  matchNo: number
}

/** 房间发出的瞬时事件：对战房间是 ArenaEvent，打怪兽房间是 BossArenaEvent */
export type RoomEvent = ArenaEvent | BossArenaEvent

export type Effect =
  | { type: 'broadcast' }
  | { type: 'event'; e: RoomEvent }
  | { type: 'error'; to: string; error: RoomError }
  /** 关掉房间（「不玩了」）：网络层给每个连接发 closed 并销毁房间 */
  | { type: 'close' }

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
/**
 * 一个人一局最多提交多少次作答（N6 ⑨）：正常一局 8 题对完不到 50 次、打怪兽 120 秒也就几十题，超过就是刷题目流让所有设备无限生成题
 */
export const MATCH_MAX_ANSWERS = 400

/** 房间号 6 位：去掉 0 O 1 I L 这些易混字符（B19） */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function makeCode(random: () => number = secureRandom): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]
  return s
}
export function isCode(v: unknown): v is string {
  return typeof v === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(v)
}
/** 知识点 id / 皮肤 id 的样子（服务器不认识目录，只认格式；客户端收到不认识的会自己处理） */
export function isKpId(v: unknown): v is string {
  return typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(v)
}
export function isSkinId(v: unknown): v is string {
  return typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,31}$/.test(v)
}
/** Boss id 与皮肤 id 同一个样子（服务器不认识 Boss 注册表，客户端收到不认识的自己退到默认的） */
export const isBossId = isSkinId

const VARIANTS: readonly TimedVariant[] = ['coop', 'versus']

/** 房间的玩法：对战（不用别的设置）/ 打怪兽（带一起打还是各打各的、时长、哪只 Boss） */
export type RoomPlay = { format?: 'battle'; boss?: undefined } | { format: 'boss'; boss: BossRoomOpts }

/**
 * 建房消息里的玩法（M5）：不带 format（旧页面）或 battle 是对战房间，带着的 boss 不看；boss 要 variant 是 coop / versus、
 * durationS 是可选的时长之一、boss 是 id 的样子。不合法返回 undefined（网络层回 bad）；合法的只留这三个字段
 */
export function roomPlayOf(format: unknown, boss: unknown): RoomPlay | undefined {
  if (format === undefined || format === 'battle') return { format: 'battle' }
  if (format !== 'boss' || typeof boss !== 'object' || boss === null) return undefined
  const b = boss as Record<string, unknown>
  if (!VARIANTS.includes(b.variant as TimedVariant) || !isDurationS(b.durationS) || !isBossId(b.boss)) return undefined
  return { format: 'boss', boss: { variant: b.variant as TimedVariant, durationS: b.durationS, boss: b.boss } }
}
/** 正在输入的内容 / 答了什么：只留可见字符、最多 32 个 */
export function cleanInput(v: string): string {
  return v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029]/g, '').slice(0, 32)
}

const ROLES: readonly Role[] = ['red', 'blue', 'watch']

/** 口令（B19）：6 位数字、首位不为 0；三个身份各一个，全服务器唯一，一个口令就定了房间 + 身份 */
export function makePasscode(random: () => number = secureRandom): string {
  return String(100000 + Math.floor(random() * 900000))
}
export function isPasscode(v: unknown): v is string {
  return typeof v === 'string' && /^[1-9][0-9]{5}$/.test(v)
}
/** 三个身份的口令：互不相同、也不与 taken（别的房间的）重复 */
export function makePasscodes(taken: ReadonlySet<string> = new Set(), random: () => number = secureRandom): Record<Role, string> {
  const used = new Set(taken)
  const one = (): string => {
    let p = makePasscode(random)
    while (used.has(p)) p = makePasscode(random)
    used.add(p)
    return p
  }
  return { red: one(), blue: one(), watch: one() }
}
/** 按口令找房间与身份；没有 → undefined */
export function findByPasscode(rooms: Iterable<Room>, pass: string): { code: string; t: Role } | undefined {
  for (const r of rooms) for (const t of ROLES) if (r.passcodes[t] === pass) return { code: r.code, t }
  return undefined
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

/** 比赛进行中（倒数或比赛；打怪兽也算上）：不能换队、不能改难度 */
function inMatch(room: Room): boolean {
  if (room.timed) return room.timed.phase === 'countdown' || room.timed.phase === 'playing' || room.timed.phase === 'paused'
  return room.match !== null && (room.match.phase === 'countdown' || room.match.phase === 'playing')
}

/** 这个房间开过局没有（哪种玩法都算） */
const hasGame = (room: Room): boolean => room.match !== null || room.timed !== null

/** 上一局结束了没有（再来一局 / 下一章 / 不玩了只在这之后才算） */
function gameEnded(room: Room): boolean {
  return room.format === 'boss' ? room.timed?.phase === 'ended' : room.match?.phase === 'ended'
}

/** 比赛里的选手（对战的 players / 打怪兽的 players），没开局是空 */
function gamePlayers(room: Room): readonly Player[] {
  return room.timed?.players ?? room.match?.players ?? []
}

export function snapshot(room: Room): RoomSnapshot {
  return {
    code: room.code,
    format: room.format,
    ...(room.format === 'boss' && room.boss ? { boss: room.boss } : {}),
    kpId: room.kpId,
    skin: room.skin,
    hostId: room.hostId,
    locked: room.locked,
    createdAt: room.createdAt,
    members: room.members,
    match: room.match,
    timed: room.timed,
    passcodes: room.passcodes,
  }
}

export function createRoom(
  opts: {
    code: string
    kpId: string
    skin: string
    host: { clientId: string; name: string; role?: Role; avatar?: AvatarId }
    version: string
    now: number
    /** 三个身份的口令（网络层保证全服务器唯一）；不传就随机生成（测试用） */
    passcodes?: Record<Role, string>
  } & RoomPlay,
): Room {
  const host: Member = {
    clientId: opts.host.clientId,
    name: cleanName(opts.host.name),
    role: opts.host.role ?? 'watch',
    ready: false,
    online: true,
    joinedAt: opts.now,
    voice: false,
    ...(opts.host.avatar ? { avatar: opts.host.avatar } : {}),
  }
  const format: RoomFormat = opts.format === 'boss' ? 'boss' : 'battle'
  return {
    code: opts.code,
    format,
    ...(opts.format === 'boss' ? { boss: { ...opts.boss } } : {}),
    kpId: opts.kpId,
    skin: opts.skin,
    hostId: host.clientId,
    locked: false,
    createdAt: opts.now,
    members: [host],
    match: null,
    timed: null,
    passcodes: opts.passcodes ?? makePasscodes(),
    version: opts.version,
    lastActive: opts.now,
    matchNo: 0,
  }
}

/**
 * 加入（打开链接 / 重连）：同一 clientId 回来就接回原座位；没指定队就分到人少的队；比赛开始后只能观战；
 * 指定的队满了就进另一队、都满了观战。返回的 error 是给这个人的提示（started / teamFull 是提示，仍然加入；
 * version / full 是拒绝，room 不变）。
 * who.auto：名字 / 小动物哪样是随机点选的（B17）——新进来的跟房间里的人撞了就换（distinctIdentity），回来的沿用座位上的
 * （进房时可能换过；页面刷新后重新随机的不算数）。
 */
export function join(
  room: Room,
  who: { clientId: string; name: string; t?: Role; version: string; avatar?: AvatarId; auto?: AutoIdentity },
  now: number,
): { room: Room; error?: RoomError } {
  if (who.version !== room.version) return { room, error: 'version' }
  const existing = room.members.find((m) => m.clientId === who.clientId)
  if (existing) {
    const name = who.auto?.name ? existing.name : cleanName(who.name) || existing.name
    const avatar = who.auto?.avatar ? (existing.avatar ?? who.avatar) : (who.avatar ?? existing.avatar)
    // 刷新 / 重连回来的页面麦克风一定是关着的（新页面不会再发 voice:false）：座位上的 voice 跟着清掉，别留幽灵 🎤
    const members = room.members.map((m) => (m === existing ? { ...m, online: true, name, voice: false, ...(avatar ? { avatar } : {}) } : m))
    return { room: withMembers({ ...room, lastActive: now }, members) }
  }
  if (room.members.length >= ROOM_MAX) return { room, error: 'full' }
  const wanted: Role | undefined = who.t && isRole(who.t) ? who.t : undefined
  let role: Role = 'watch'
  let error: RoomError | undefined
  // 比赛中「离开房间」又打开链接回来的选手：仍是比赛里的人，接回原来的队（不然会以观战身份继续答题得分）
  const seat = inMatch(room) ? gamePlayers(room).find((p) => p.id === who.clientId) : undefined
  if (seat) role = seat.team
  else if (wanted !== 'watch') {
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
  const { name, avatar } = distinctIdentity(room.members, cleanName(who.name), who.avatar, who.auto)
  const member: Member = { clientId: who.clientId, name, role, ready: false, online: true, joinedAt: now, voice: false, ...(avatar ? { avatar } : {}) }
  const next: Room = withMembers({ ...room, lastActive: now }, [...room.members, member])
  return error ? { room: next, error } : { room: next }
}

/**
 * 随机点选的名字 / 小动物跟房间里的人撞了就换（B17「双方不一样」）：从他那只往后轮着找第一只没人用的小动物，
 * 名字是随机的就换成那只的名字（语言照他原来的名字）；自己选的不动。房间里超过 6 个人、换不开就算了
 */
function distinctIdentity(others: readonly Member[], name: string, avatar: AvatarId | undefined, auto: AutoIdentity | undefined): { name: string; avatar?: AvatarId } {
  if (!avatar || !(auto?.name || auto?.avatar)) return { name, avatar }
  const start = AVATAR_IDS.indexOf(avatar)
  const order = AVATAR_IDS.map((_, i) => AVATAR_IDS[(start + i) % AVATAR_IDS.length]!)
  return pickIdentity({ name: auto.name ? '' : name, avatar: auto.avatar ? null : avatar }, order, avatarNameLang(name) ?? 'zh', others)
}

/** 换成员名单，同时把比赛里对应的人的在线状态 / 名字跟上；离开房间的人在比赛里算掉线（两种玩法一样） */
function withMembers(room: Room, members: Member[]): Room {
  const sync = <P extends Player>(players: readonly P[]): P[] =>
    players.map((p) => {
      const m = members.find((x) => x.clientId === p.id)
      return m ? { ...p, online: m.online, name: m.name } : p.online ? { ...p, online: false } : p
    })
  if (room.timed) return { ...room, members, timed: { ...room.timed, players: sync(room.timed.players) } }
  if (!room.match) return { ...room, members }
  return { ...room, members, match: { ...room.match, players: sync(room.match.players) } }
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

const eventsOf = (events: readonly RoomEvent[]): Effect[] => events.map((e): Effect => ({ type: 'event', e }))

/**
 * 时间往前走（B42 / M13）：倒数到点就开打（开始时刻由服务器定）；打怪兽开打后再管最后 10 秒（lastTen）与
 * 时间到（endsAt + GRACE_MS 起算结束：timeUp → finished）。状态没变什么都不做。网络层在这几个时刻调，心跳里也兜底调
 */
export function tick(room: Room, now: number): Result {
  if (room.timed) {
    const m = room.timed
    if (m.phase === 'countdown') {
      if (now < m.startedAt) return { room, effects: [] }
      return { room: { ...room, timed: timedBeginPlay(m, now) }, effects: [{ type: 'broadcast' }, { type: 'event', e: { type: 'go' } }] }
    }
    const res = timedTick(m, now, GRACE_MS)
    if (res.match === m) return { room, effects: [] }
    return { room: { ...room, timed: res.match }, effects: [{ type: 'broadcast' }, ...eventsOf(res.events)] }
  }
  if (!room.match || room.match.phase !== 'countdown' || now < room.match.startedAt) return { room, effects: [] }
  return { room: { ...room, match: beginPlay(room.match, now) }, effects: [{ type: 'broadcast' }, { type: 'event', e: { type: 'go' } }] }
}

/** 参赛者（红蓝两队）；观众不进比赛 */
function participants(room: Room): Member[] {
  return room.members.filter((m) => isTeam(m.role))
}

/**
 * 人够不够开一局（举手不是条件，B21）：对战、打怪兽各打各的要红蓝两队都有人；打怪兽一起打只要有 2 个参赛者（哪队都行，M5）。
 * online：只数在线的（开始 / 自动开始）；再来一局 / 下一章照原来的规矩，掉线的座位也算（他回来接着打）
 */
function enoughPlayers(room: Room, online: boolean): boolean {
  const ps = participants(room).filter((m) => !online || m.online)
  if (room.format === 'boss' && room.boss?.variant === 'coop') return ps.length >= 2
  return ps.some((m) => m.role === 'red') && ps.some((m) => m.role === 'blue')
}

function startRoom(room: Room, seeds: Record<string, number>, now: number): Room {
  const ps = participants(room)
  const inits = ps.map((m) => ({ id: m.clientId, name: m.name, team: m.role as Team, avatar: m.avatar }))
  const onlineOf = (id: string): boolean => room.members.find((m) => m.clientId === id)?.online ?? true
  const base: Room = { ...room, members: room.members.map((m) => ({ ...m, ready: false })), lastActive: now, matchNo: room.matchNo + 1 }
  if (room.format === 'boss' && room.boss) {
    const timed: TimedMatch = createTimed({
      kpId: room.kpId,
      boss: room.boss.boss,
      variant: room.boss.variant,
      durationMs: room.boss.durationS * 1000,
      players: inits,
      seeds,
      now,
    })
    return { ...base, match: null, timed: { ...timed, players: timed.players.map((p) => ({ ...p, online: onlineOf(p.id) })) } }
  }
  const started = startMatch(createMatch({ kpId: room.kpId, skin: room.skin, players: inits }), seeds, now)
  return { ...base, timed: null, match: { ...started, players: started.players.map((p) => ({ ...p, online: onlineOf(p.id) })) } }
}

const err = (to: string, error: RoomError): Effect => ({ type: 'error', to, error })

/**
 * 自动开始（B21 / M5）：人够了（对战与各打各的：红蓝两队都至少 1 人在线；一起打：至少 2 个参赛者在线）、而且这个房间
 * 还没开过局（match / timed 都是 null）就开始倒数；比赛结束后不自动再来（要有人按「再来一局」）。网络层每次改动房间后调一次。
 */
export function autoStart(room: Room, now: number, seeds: () => number = randomSeed): Result {
  if (hasGame(room) || !enoughPlayers(room, true)) return { room, effects: [] }
  const seedMap = Object.fromEntries(participants(room).map((m) => [m.clientId, seeds()]))
  return { room: startRoom({ ...room, lastActive: now }, seedMap, now), effects: [{ type: 'broadcast' }, { type: 'event', e: { type: 'countdown' } }] }
}

/**
 * 处理一条消息。seeds：开始 / 再来一局时给每个参赛者的题目种子（网络层生成；测试注入）。
 */
export function apply(room: Room, from: string, msg: ClientMsg, now: number, seeds: () => number = randomSeed): Result {
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
      if (inMatch(room) || !enoughPlayers(room, true)) return { room, effects: [err(from, 'bad')] }
      const seedMap = Object.fromEntries(participants(room).map((m) => [m.clientId, seeds()]))
      return { room: startRoom(base, seedMap, now), effects: [{ type: 'broadcast' }, { type: 'event', e: { type: 'countdown' } }] }
    }
    case 'rematch':
    case 'next': {
      // 再来一局 / 下一章（B9 / M7）：房间里谁都能按，谁先按就按谁的；上一局没结束（别人已经按过、新一局开了）就忽略，不报错。
      // 下一章换 kpId 与皮肤（客户端按目录算好传来，服务器不认识目录；打怪兽房间的皮肤照收、不用）
      if (!gameEnded(room)) return { room, effects: [] }
      let target = base
      if (msg.type === 'next') {
        if (!isKpId(msg.kpId) || !isSkinId(msg.skin)) return { room, effects: [err(from, 'bad')] }
        target = { ...base, kpId: msg.kpId, skin: msg.skin }
      }
      if (!enoughPlayers(room, false)) return { room, effects: [err(from, 'bad')] }
      const seedMap = Object.fromEntries(participants(room).map((m) => [m.clientId, seeds()]))
      return { room: startRoom(target, seedMap, now), effects: [{ type: 'broadcast' }, { type: 'event', e: { type: 'countdown' } }] }
    }
    case 'quit': {
      // 不玩了（B9）：上一局结束后谁都能按，关掉房间、大家一起回地图；比赛中不算
      if (!gameEnded(room)) return { room, effects: [] }
      return { room: base, effects: [{ type: 'close' }] }
    }
    case 'end': {
      if (!isHost) return { room, effects: [err(from, 'notHost')] }
      if (!hasGame(room)) return { room, effects: [] }
      return { room: { ...base, match: null, timed: null, members: room.members.map((m) => ({ ...m, ready: false })) }, effects: [{ type: 'broadcast' }] }
    }
    case 'skin': {
      if (!isHost) return { room, effects: [err(from, 'notHost')] }
      if (!isSkinId(msg.skin) || inMatch(room)) return { room, effects: [err(from, 'bad')] }
      return { room: { ...base, skin: msg.skin }, effects: [{ type: 'broadcast' }] }
    }
    case 'lock': {
      if (!isHost) return { room, effects: [err(from, 'notHost')] }
      if (room.locked === !!msg.locked) return { room, effects: [] }
      return { room: { ...base, locked: !!msg.locked }, effects: [{ type: 'broadcast' }] }
    }
    case 'input': {
      if (room.format === 'boss') {
        if (!room.timed || room.timed.phase !== 'playing' || typeof msg.input !== 'string') return { room, effects: [] }
        const timed = timedSetInput(room.timed, from, cleanInput(msg.input))
        if (timed === room.timed) return { room, effects: [] }
        return { room: { ...base, timed }, effects: [{ type: 'broadcast' }] }
      }
      if (!room.match || room.match.phase !== 'playing' || typeof msg.input !== 'string') return { room, effects: [] }
      const match = setInput(room.match, from, cleanInput(msg.input))
      if (match === room.match) return { room, effects: [] }
      return { room: { ...base, match }, effects: [{ type: 'broadcast' }] }
    }
    case 'answer': {
      if (room.format === 'boss') return timedAnswerMsg(room, base, from, msg, now)
      if (!room.match || room.match.phase !== 'playing') return { room, effects: [err(from, 'bad')] }
      if (typeof msg.index !== 'number' || typeof msg.given !== 'string') return { room, effects: [err(from, 'bad')] }
      if (!Number.isInteger(msg.index) || msg.index < 0) return { room, effects: [err(from, 'bad')] }
      // 一局的作答次数有上限（N6 ⑨）：题目流每 16 题一批在每台设备上生成，不封顶会被无限刷
      if ((room.match.players.find((p) => p.id === from)?.index ?? 0) >= MATCH_MAX_ANSWERS) return { room, effects: [err(from, 'bad')] }
      const res = answer(room.match, from, msg.index, !!msg.correct, cleanInput(msg.given), now)
      if (res.state === room.match) return { room, effects: [err(from, 'bad')] }
      return { room: { ...base, match: res.state }, effects: [{ type: 'broadcast' }, ...res.events.map((e): Effect => ({ type: 'event', e }))] }
    }
    case 'leave': {
      let next: Room = withMembers(base, room.members.filter((m) => m.clientId !== from))
      if (next.members.length === 0) return { room: next, effects: [] }
      if (from === room.hostId) next = { ...next, hostId: nextHost({ ...next, hostId: '' }) }
      return { room: next, effects: [{ type: 'broadcast' }] }
    }
    case 'voice': {
      // 开 / 关麦克风（B57）：进快照，大家据此知道要不要跟他建语音连接；重复的不广播
      const on = !!msg.on
      if (me.voice === on) return { room, effects: [] }
      // 说话名额（B57 VOICE_MAX）在这里也守一遍：满了就不进快照、不报错（正常客户端自己不会再开，'full' 对客户端是致命错误）；
      // 网络层转发 offer 时只认快照里 voice 为 true 的人，所以改过的客户端刷不出第 5 个 🎤、也推不出音频
      if (on && room.members.filter((m) => m.voice && m.online).length >= VOICE_MAX) return { room, effects: [] }
      return { room: members((m) => ({ ...m, voice: on })), effects: [{ type: 'broadcast' }] }
    }
    case 'ping':
    case 'hello':
    case 'create':
    // 信令与 ICE 清单（B57）、表情（B58）由网络层处理（不改房间状态），不会到这里
    case 'rtc':
    case 'turn':
    case 'emote':
      return { room: base, effects: [] }
    default:
      return { room, effects: [err(from, 'bad')] }
  }
}

/**
 * 打怪兽的作答（M13）：形状不对、超过一局的作答上限才回 bad；状态没变的（时间到加宽限之后才到的、重复的、乱序的、
 * 倒数中 / 没开局 / 观众发的）一律静默忽略——时间到前后本来就会有迟到的答案，回 bad 客户端会弹提示。
 * 先按这一刻补一次 tick（定时回调被推迟时，最后 10 秒 / 时间到的事件排在这一拳前面），再判这一题
 */
function timedAnswerMsg(room: Room, base: Room, from: string, msg: Extract<ClientMsg, { type: 'answer' }>, now: number): Result {
  if (typeof msg.index !== 'number' || typeof msg.given !== 'string' || !Number.isInteger(msg.index) || msg.index < 0) return { room, effects: [err(from, 'bad')] }
  if (!room.timed) return { room, effects: [] }
  if ((room.timed.players.find((p) => p.id === from)?.index ?? 0) >= MATCH_MAX_ANSWERS) return { room, effects: [err(from, 'bad')] }
  const caught = room.timed.phase === 'playing' ? timedTick(room.timed, now, GRACE_MS) : { match: room.timed, events: [] }
  const res = timedAnswer(caught.match, from, msg.index, !!msg.correct, now, GRACE_MS)
  if (res.match === room.timed) return { room, effects: [] }
  return { room: { ...base, timed: res.match }, effects: [{ type: 'broadcast' }, ...eventsOf([...caught.events, ...res.events])] }
}

/** 该销毁了吗（B19）：全部离线超过 ROOM_IDLE_MS，或建房超过 ROOM_LIFE_MS */
export function expired(room: Room, now: number): boolean {
  if (now - room.createdAt > ROOM_LIFE_MS) return true
  const anyOnline = room.members.some((m) => m.online)
  return !anyOnline && now - room.lastActive > ROOM_IDLE_MS
}
