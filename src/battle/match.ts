/**
 * 比赛状态机（纯函数，需求 B1–B9）：加分、判胜、事件。单设备对局在页面里跑它，中继服务的房间也跑它。
 * 每个函数返回新的状态对象，不改入参（store 里整个替换，Vue 才会响应）。
 */
import type { Difficulty } from '@/types/models'
import { ROUND_SIZE } from '@/engine'
import type { MatchEvent, MatchState, Player, Team } from './protocol'

/** 倒数 3、2、1 + 「开始」的总时长 */
export const COUNTDOWN_MS = 3600

export interface PlayerInit {
  id: string
  name: string
  team: Team
  kind?: 'human' | 'ai'
  difficulty?: Difficulty
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
      difficulty: p.difficulty ?? 1,
      seed: 0,
      index: 0,
      correct: 0,
      input: '',
      online: true,
    })),
    score: { red: 0, blue: 0 },
    startedAt: 0,
    endedAt: 0,
    winner: null,
    lastPoint: null,
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
      input: '',
    })),
    score: { red: 0, blue: 0 },
    startedAt: now + COUNTDOWN_MS,
    endedAt: 0,
    winner: null,
    lastPoint: null,
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

/**
 * 某人答了第 index 题：只在比赛中、且 index 正是他的下一题时生效（乱序 / 重复提交直接忽略）。
 * 答对给他的队伍 +1；到目标分就结束。
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
  const players = state.players.slice()
  players[i] = { ...player, index: index + 1, correct: player.correct + (correct ? 1 : 0), input: '' }
  const events: MatchEvent[] = [{ type: 'answered', playerId, index, correct, given }]
  let next: MatchState = { ...state, players }
  if (correct) {
    const score = { ...state.score, [player.team]: state.score[player.team] + 1 }
    next = { ...next, score, lastPoint: player.team }
    events.push({ type: 'point', team: player.team, playerId })
    if (score[player.team] >= state.target) {
      next = { ...next, phase: 'ended', winner: player.team, endedAt: now }
      events.push({ type: 'finished', winner: player.team })
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
