/**
 * 对战（需求 §8）的数据模型：一局比赛的快照与事件。客户端本地对局、以后的中继服务都用这一份。
 * 服务器只认识这些字段，不认识题目：题目由各端按 (kpId, seed, difficulty, index) 自己生成（battle/stream.ts）。
 */
import type { Difficulty } from '@/types/models'

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
  /** 让子（B8）：这个人的题目难度档 */
  difficulty: Difficulty
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
 * streak：连对到 3 / 5 题；lead：从落后变成领先；nearWin：到目标分只差 1。结束那一题不再发这三种。
 */
export type MatchEvent =
  | { type: 'answered'; playerId: string; index: number; correct: boolean; given: string }
  | { type: 'point'; team: Team; playerId: string; streak: number }
  | { type: 'streak'; playerId: string; team: Team; n: number }
  | { type: 'lead'; team: Team }
  | { type: 'nearWin'; team: Team }
  | { type: 'finished'; winner: Team }

export function otherTeam(team: Team): Team {
  return team === 'red' ? 'blue' : 'red'
}
