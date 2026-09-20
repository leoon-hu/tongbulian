/**
 * 对战（需求 §8）的数据模型：一局比赛的快照与事件。客户端本地对局、以后的中继服务都用这一份。
 * 服务器只认识这些字段，不认识题目：题目由各端按 (kpId, seed, index) 自己生成（battle/stream.ts）。
 */

export type Team = 'red' | 'blue'
export const TEAMS: readonly Team[] = ['red', 'blue']

/** lobby 等人 → countdown 倒数 → playing 比赛中 → ended 有人到 8 分 */
export type Phase = 'lobby' | 'countdown' | 'playing' | 'ended'

export interface Player {
  id: string
  /** 昵称（只显示，不注音、不朗读） */
  name: string
  team: Team
  kind: 'human' | 'ai'
  /** 题目流的种子，开局时分配；任何设备都能由它复现这个人的题 */
  seed: number
  /** 下一题的序号 = 已答题数 */
  index: number
  correct: number
  /** 当前连对了几题（答错归零；B5a 的 🔥 与音高） */
  streak: number
  /** 正在按的内容（数字串或选项 id），给别人看 */
  input: string
  online: boolean
}

export interface MatchState {
  kpId: string
  /** 皮肤 id（battle/skins 注册表） */
  skin: string
  /** 目标分（= 一轮题数 8） */
  target: number
  phase: Phase
  players: Player[]
  score: Record<Team, number>
  /** 比赛开始的时刻（ms）；0 = 还没开始 */
  startedAt: number
  endedAt: number
  winner: Team | null
  /** 最近得分的队伍（皮肤播得分动画用） */
  lastPoint: Team | null
  /** 最近一次领先（比分严格更高）的队伍；追平不改。「反超」= 我刚领先而上一个领先的是对方 */
  leading: Team | null
}

/**
 * 一次答题产生的事件（顺序：answered → point → streak / lead / nearWin → finished）。
 * streak：连对到 3 / 5 题；lead：从落后变成领先；nearWin：到目标分只差 1；half：到目标分的一半。结束那一题不再发这几种。
 */
export type MatchEvent =
  | { type: 'answered'; playerId: string; index: number; correct: boolean; given: string }
  | { type: 'point'; team: Team; playerId: string; streak: number }
  | { type: 'streak'; playerId: string; team: Team; n: number }
  | { type: 'lead'; team: Team }
  | { type: 'nearWin'; team: Team }
  | { type: 'half'; team: Team }
  | { type: 'finished'; winner: Team }

/** 竞技场事件 = 比赛事件 + 倒数开始 / 开打：给游戏画面用（多设备时也由服务器发） */
export type ArenaEvent = MatchEvent | { type: 'countdown' } | { type: 'go' }

/** 带序号的事件（store 的事件队列；宿主按序号只转发新的，重连 / 晚挂载不重放历史） */
export interface SeqEvent {
  seq: number
  e: ArenaEvent
}

export function otherTeam(team: Team): Team {
  return team === 'red' ? 'blue' : 'red'
}

// ── 多设备房间（B13–B25、B41–B45）：房间快照与线上消息，客户端与 server/ 共用 ─────────────────

/** 座位：红队 / 蓝队 / 观战 */
export type Role = Team | 'watch'

export interface Member {
  clientId: string
  /** 昵称（≤ 8 字，只显示） */
  name: string
  role: Role
  /** 举手（B21）：告诉主持人「我在看」，不是开始的条件 */
  ready: boolean
  online: boolean
  /** 掉线的时刻（在线时没有）；主持人掉线超过 HOST_GRACE_MS 才交接（B22） */
  offlineAt?: number
  joinedAt: number
}

/** 整份房间快照（B42：任何变化都发整份） */
export interface RoomSnapshot {
  code: string
  kpId: string
  skin: string
  /** 主持人（建房的那个连接；掉线自动交给最早在线的人） */
  hostId: string
  /** 锁定队伍：非主持人不能换队 */
  locked: boolean
  createdAt: number
  members: Member[]
  /** 比赛（与单设备同一份状态机）；大厅阶段是 null */
  match: MatchState | null
  /** 三个身份各一个 6 位数字口令（B19）：设置页「加入对战」输了就以该身份进房；全服务器唯一 */
  passcodes: Record<Role, string>
}

/** 客户端 → 服务器 */
export type ClientMsg =
  | { type: 'hello'; clientId: string; name: string; version: string; code?: string; t?: Role }
  | { type: 'create'; kpId: string; skin: string }
  /** 口令换房间号与身份（B19）；服务器回 found，客户端再按链接的方式进房 */
  | { type: 'lookup'; pass: string }
  | { type: 'team'; role: Role }
  | { type: 'ready'; ready: boolean }
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'rematch' }
  /** 「下一章」（B9，谁都能发）：同一房间换成本册下一个知识点（与它按章节排到的皮肤）再开一局；服务器不认识目录，只透传 */
  | { type: 'next'; kpId: string; skin: string }
  /** 「不玩了」（B9，上一局结束后谁都能发）：关掉房间，大家一起回地图 */
  | { type: 'quit' }
  | { type: 'skin'; skin: string }
  | { type: 'lock'; locked: boolean }
  | { type: 'input'; input: string }
  | { type: 'answer'; index: number; given: string; correct: boolean }
  | { type: 'leave' }
  | { type: 'ping' }

export type RoomError =
  | 'noRoom' // 房间不存在（或已关闭）
  | 'full' // 房间满了（≤ 32 个连接）
  | 'teamFull' // 这队满了（≤ 6 人），先当观众
  | 'started' // 比赛已经开始，先看着吧
  | 'version' // 构建版本不一致，刷新一下再加入
  | 'busy' // 服务器忙（房间数到上限）
  | 'closed' // 房间已关闭
  | 'replaced' // 已在另一个标签页打开
  | 'locked' // 队伍已锁定
  | 'notHost' // 只有主持人能做
  | 'bad' // 现在不能这么做 / 消息不合法

/** 服务器 → 客户端 */
export type ServerMsg =
  | { type: 'state'; room: RoomSnapshot; you: string; /** 服务器当前时刻：客户端算比赛用时用（各设备时钟不一样） */ now: number }
  | { type: 'event'; e: ArenaEvent }
  | { type: 'error'; error: RoomError }
  | { type: 'found'; code: string; t: Role }
  | { type: 'pong' }
