/**
 * 比赛状态机（纯函数，需求 B1–B9）：加分、判胜、事件。单设备对局在页面里跑它，中继服务的房间也跑它。
 * 每个函数返回新的状态对象，不改入参（store 里整个替换，Vue 才会响应）。
 */
import { ROUND_SIZE } from '@/engine'
import type { MatchEvent, MatchState, Player, Team } from './protocol'
import type { AvatarId } from './avatars'

/** 「预备」+ 倒数 3、2、1 + 「开始」的总时长 */
export const COUNTDOWN_MS = 4400
/** 连对几题弹出提示（B5a） */
export const STREAK_MILESTONES: readonly number[] = [3, 5]

export interface PlayerInit {
  id: string
  name: string
  team: Team
  kind?: 'human' | 'ai'
  avatar?: AvatarId
}

export function createMatch(opts: { kpId: string; skin: string; players: PlayerInit[]; target?: number }): MatchState {
  return {
    kpId: opts.kpId,
    skin: opts.skin,
    target: opts.target ?? ROUND_SIZE,
    phase: 'lobby',
    players: opts.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      kind: p.kind ?? 'human',
      seed: 0,
      index: 0,
      correct: 0,
      streak: 0,
      input: '',
      online: true,
      ...(p.avatar ? { avatar: p.avatar } : {}),
    })),
    score: { red: 0, blue: 0 },
    startedAt: 0,
    endedAt: 0,
    winner: null,
    lastPoint: null,
    leading: null,
  }
}

/** 两队都至少有一个人才能开始 */
export function canStart(state: MatchState): boolean {
  return state.players.some((p) => p.team === 'red') && state.players.some((p) => p.team === 'blue')
}

/**
 * 开始（也是「再来一局」）：每人发新 seed、计数清零、进入倒数。
 * startedAt 先记成倒数结束的时刻，beginPlay 时再按实际时间校准。
 */
export function startMatch(state: MatchState, seeds: Record<string, number>, now: number): MatchState {
  return {
    ...state,
    phase: 'countdown',
    players: state.players.map((p) => ({
      ...p,
      seed: seeds[p.id] ?? p.seed,
      index: 0,
      correct: 0,
      streak: 0,
      input: '',
    })),
    score: { red: 0, blue: 0 },
    startedAt: now + COUNTDOWN_MS,
    endedAt: 0,
    winner: null,
    lastPoint: null,
    leading: null,
  }
}

/** 倒数结束，开打；计时从这一刻算 */
export function beginPlay(state: MatchState, now: number): MatchState {
  if (state.phase !== 'countdown') return state
  return { ...state, phase: 'playing', startedAt: now }
}

export function setInput(state: MatchState, playerId: string, input: string): MatchState {
  const i = state.players.findIndex((p) => p.id === playerId)
  if (i < 0 || state.players[i]!.input === input) return state
  const players = state.players.slice()
  players[i] = { ...players[i]!, input }
  return { ...state, players }
}

/** 谁领先（比分严格更高）：没有就是 null */
function leader(score: Record<Team, number>): Team | null {
  if (score.red === score.blue) return null
  return score.red > score.blue ? 'red' : 'blue'
}

/**
 * 某人答了第 index 题：只在比赛中、且 index 正是他的下一题时生效（乱序 / 重复提交直接忽略）。
 * 答对给他的队伍 +1；到目标分就结束。附带的 streak / lead / nearWin 事件给界面弹提示（B5a）。
 */
export function answer(
  state: MatchState,
  playerId: string,
  index: number,
  correct: boolean,
  given: string,
  now: number,
): { state: MatchState; events: MatchEvent[] } {
  const i = state.players.findIndex((p) => p.id === playerId)
  const player = state.players[i]
  if (state.phase !== 'playing' || !player || player.index !== index) return { state, events: [] }
  const streak = correct ? player.streak + 1 : 0
  const players = state.players.slice()
  players[i] = { ...player, index: index + 1, correct: player.correct + (correct ? 1 : 0), streak, input: '' }
  const events: MatchEvent[] = [{ type: 'answered', playerId, team: player.team, index, correct, given }]
  let next: MatchState = { ...state, players }
  if (correct) {
    const team = player.team
    const score = { ...state.score, [team]: state.score[team] + 1 }
    const ahead = leader(score)
    next = { ...next, score, lastPoint: team, leading: ahead ?? state.leading }
    events.push({ type: 'point', team, playerId, streak })
    if (score[team] >= state.target) {
      next = { ...next, phase: 'ended', winner: team, endedAt: now }
      events.push({ type: 'finished', winner: team })
    } else {
      if (STREAK_MILESTONES.includes(streak)) events.push({ type: 'streak', playerId, team, n: streak })
      if (ahead === team && state.leading !== null && state.leading !== team) events.push({ type: 'lead', team })
      if (score[team] === state.target - 1) events.push({ type: 'nearWin', team })
      // 决胜题（B62）：两队都只差 1 分——后到的那一分把局面变成决胜，只发这一次
      if (score.red === state.target - 1 && score.blue === state.target - 1) events.push({ type: 'deuce' })
      if (score[team] === Math.floor(state.target / 2)) events.push({ type: 'half', team })
    }
  }
  return { state: next, events }
}

export function teamPlayers(state: MatchState, team: Team): Player[] {
  return state.players.filter((p) => p.team === team)
}

export function findPlayer(state: MatchState, playerId: string): Player | undefined {
  return state.players.find((p) => p.id === playerId)
}

/** 已用时间（ms）：比赛中按 now 算，结束后固定 */
export function elapsedMs(state: MatchState, now: number): number {
  if (state.phase === 'playing') return Math.max(0, now - state.startedAt)
  if (state.phase === 'ended') return Math.max(0, state.endedAt - state.startedAt)
  return 0
}

/** mm:ss */
export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
