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
}

export type MatchEvent =
  | { type: 'answered'; playerId: string; index: number; correct: boolean; given: string }
  | { type: 'point'; team: Team; playerId: string }
  | { type: 'finished'; winner: Team }

export function otherTeam(team: Team): Team {
  return team === 'red' ? 'blue' : 'red'
}
