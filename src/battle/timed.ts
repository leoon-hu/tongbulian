/**
 * 限时比赛的状态机（纯函数，需求 M1–M4、M13）：打怪兽玩法——限时、得分带连击、Boss 链、一起打 / 各打各的。
 * 单设备对局在页面里跑它，以后多设备的中继服务也跑它（与 match.ts 同样的地位）；每个函数返回新对象，不改入参。
 * 时间由调用方传进来（now），这里不读时钟：store 按本机时钟、服务器按自己的时钟，测试随便摆。
 */
import type { Player, Team } from './protocol'
import type { AvatarId } from './avatars'
import { COUNTDOWN_MS } from './match'

/** 一起打：所有人打同一只 Boss；各打各的：红蓝两边各打自己的一条 Boss 链（M4） */
export type TimedVariant = 'coop' | 'versus'
/** Boss 在哪一边：一起打只有 shared，各打各的红蓝各一 */
export type BossSide = 'shared' | Team
/** countdown 倒数 → playing 开打 →（paused 暂停）→ ended 时间到 */
export type TimedPhase = 'countdown' | 'playing' | 'paused' | 'ended'
/** 这一拳是什么招式（M9）：连击第 1、2 题直拳，第 3 题勾拳、第 4 题上勾拳，第 5 题起旋风拳 */
export type PunchMove = 'jab' | 'hook' | 'upper' | 'super'

/** 可选的时长（秒，M1）；默认 90 */
export const DURATIONS_S = [60, 90, 120] as const
export type DurationS = (typeof DURATIONS_S)[number]
export const DEFAULT_DURATION_S: DurationS = 90
/** 最后 10 秒：每题多 1 分、画面冲刺（M1 / M2） */
export const LAST_TEN_MS = 10_000
/** 合力拳（M4）：两个人这么久之内先后打中 */
export const TOGETHER_MS = 1500
/** 时间到之后这么久之内到的答案还算（多设备的网络延迟，M13）；单设备不用 */
export const GRACE_MS = 300
/** 连击第几题起每题 +1（M2） */
export const STREAK_BONUS_FROM = 3
/** 血量表（1 个人、90 秒，M3）：第 1、2、3 只；第 4 只起每只 BOSS_HP_AFTER */
export const BOSS_HP: readonly number[] = [5, 10, 15]
export const BOSS_HP_AFTER = 20
/** 血量表是按这个时长定的，别的时长按比例 */
export const BASE_DURATION_MS = 90_000
/** 星星最多几颗：打倒几只 = 几颗星（M3） */
export const STARS_MAX = 3

export function isDurationS(v: unknown): v is DurationS {
  return typeof v === 'number' && (DURATIONS_S as readonly number[]).includes(v)
}

export interface TimedPlayerInit {
  id: string
  name: string
  team: Team
  kind?: 'human' | 'ai'
  avatar?: AvatarId
}

/** 选手：对战的 Player（作答行直接能用）+ 这个玩法的得分、最高连击、合力拳次数 */
export interface TimedPlayer extends Player {
  score: number
  bestStreak: number
  together: number
}

/** 一条 Boss 链现在的样子：第几只（从 1 起）、剩多少血、满血多少、已经打倒了几只、这一边有几个人（血量按人数缩放） */
export interface BossSlot {
  side: BossSide
  level: number
  hp: number
  max: number
  downs: number
  fighters: number
}

export interface TimedMatch {
  format: 'timed'
  kpId: string
  /** Boss 的 id（battle/boss 注册表） */
  boss: string
  variant: TimedVariant
  durationMs: number
  phase: TimedPhase
  players: TimedPlayer[]
  bosses: BossSlot[]
  /** 开打的时刻（倒数中是预计开打的时刻；暂停再继续后往后挪） */
  startedAt: number
  /** 时间到的时刻 */
  endsAt: number
  /** 暂停时还剩多少毫秒 */
  leftMs: number
  endedAt: number
  /** 已经进入最后 10 秒（事件只发一次） */
  lastTen: boolean
  /** 最近一次打中：谁、什么时候（合力拳的窗口） */
  lastHit: { playerId: string; at: number } | null
  /** 各打各的胜方；一起打、平局是 null */
  winner: Team | null
}

/** 一次操作产生的事件（顺序：hit / miss → bossDown → bossIn；tick 产生 lastTen、timeUp → finished） */
export type TimedEvent =
  | { type: 'hit'; playerId: string; team: Team; side: BossSide; points: number; streak: number; move: PunchMove; together: boolean }
  | { type: 'miss'; playerId: string; team: Team; side: BossSide }
  | { type: 'bossDown'; side: BossSide; level: number }
  | { type: 'bossIn'; side: BossSide; level: number }
  | { type: 'lastTen' }
  | { type: 'timeUp' }
  | { type: 'finished'; winner: Team | null }

/** Boss 的表演（M8，只是表演、没有伤害）：跳挑衅舞 / 吼一嗓子 / 扔一个软果冻球。由各设备的 store 按「多久没被打中」定，不进状态机 */
export type TauntAct = 'dance' | 'roar' | 'jelly'
export const TAUNT_ACTS: readonly TauntAct[] = ['dance', 'roar', 'jelly']

/**
 * 竞技场的事件：比赛事件 + 倒数开始 / 开打（同对战的 ArenaEvent）+ Boss 的表演 + 某人发了表情（多设备，M12：
 * 台下的那个小动物举起牌子、台上的挥一下手；表情本身由页面画）。后两种只在各设备本地产生，服务器不发
 */
export type BossArenaEvent =
  | TimedEvent
  | { type: 'countdown' }
  | { type: 'go' }
  | { type: 'taunt'; side: BossSide; act: TauntAct }
  | { type: 'emote'; playerId: string }

/** 带序号的事件（store 的事件队列；游戏宿主按序号只转发新的） */
export interface BossSeqEvent {
  seq: number
  e: BossArenaEvent
}

/** 第 level 只 Boss 的满血：血量表 × 这一边的人数 × 时长比例，四舍五入、至少 1（M3） */
export function bossHp(level: number, fighters: number, durationMs: number): number {
  const base = level <= BOSS_HP.length ? BOSS_HP[Math.max(1, level) - 1]! : BOSS_HP_AFTER
  return Math.max(1, Math.round((base * Math.max(1, fighters) * durationMs) / BASE_DURATION_MS))
}

/** 这个选手打的是哪一边的 Boss */
export function sideOfTeam(variant: TimedVariant, team: Team): BossSide {
  return variant === 'coop' ? 'shared' : team
}

function newSlot(side: BossSide, fighters: number, durationMs: number): BossSlot {
  const max = bossHp(1, fighters, durationMs)
  return { side, level: 1, hp: max, max, downs: 0, fighters }
}

function slotsFor(variant: TimedVariant, players: readonly { team: Team }[], durationMs: number): BossSlot[] {
  if (variant === 'coop') return [newSlot('shared', players.length, durationMs)]
  return (['red', 'blue'] as const)
    .map((team) => ({ team, n: players.filter((p) => p.team === team).length }))
    .filter((s) => s.n > 0)
    .map((s) => newSlot(s.team, s.n, durationMs))
}

/** 开一局（也是「再来一局」）：每人一个题目流种子、计数清零、进入倒数；startedAt / endsAt 先按倒数结束算，beginPlay 再校准 */
export function createTimed(opts: {
  kpId: string
  boss: string
  variant: TimedVariant
  durationMs: number
  players: TimedPlayerInit[]
  seeds: Record<string, number>
  now: number
}): TimedMatch {
  const players: TimedPlayer[] = opts.players.map((p) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    kind: p.kind ?? 'human',
    seed: opts.seeds[p.id] ?? 0,
    index: 0,
    correct: 0,
    streak: 0,
    input: '',
    online: true,
    ...(p.avatar ? { avatar: p.avatar } : {}),
    score: 0,
    bestStreak: 0,
    together: 0,
  }))
  const startedAt = opts.now + COUNTDOWN_MS
  return {
    format: 'timed',
    kpId: opts.kpId,
    boss: opts.boss,
    variant: opts.variant,
    durationMs: opts.durationMs,
    phase: 'countdown',
    players,
    bosses: slotsFor(opts.variant, players, opts.durationMs),
    startedAt,
    endsAt: startedAt + opts.durationMs,
    leftMs: opts.durationMs,
    endedAt: 0,
    lastTen: false,
    lastHit: null,
    winner: null,
  }
}

/** 倒数结束，开打：计时从这一刻算 */
export function beginPlay(m: TimedMatch, now: number): TimedMatch {
  if (m.phase !== 'countdown') return m
  return { ...m, phase: 'playing', startedAt: now, endsAt: now + m.durationMs, leftMs: m.durationMs }
}

export function setInput(m: TimedMatch, playerId: string, input: string): TimedMatch {
  const i = m.players.findIndex((p) => p.id === playerId)
  if (i < 0 || m.players[i]!.input === input) return m
  const players = m.players.slice()
  players[i] = { ...players[i]!, input }
  return { ...m, players }
}

/** 这一拳的招式：看连击到第几题（M9） */
export function moveFor(streak: number): PunchMove {
  if (streak >= 5) return 'super'
  if (streak === 4) return 'upper'
  if (streak === 3) return 'hook'
  return 'jab'
}

/** 这一刻离时间到还有多久（暂停时是暂停那一刻剩的；倒数中是整段时长；结束后 0） */
export function remainingMs(m: TimedMatch, now: number): number {
  if (m.phase === 'playing') return Math.max(0, m.endsAt - now)
  if (m.phase === 'paused') return m.leftMs
  if (m.phase === 'countdown') return m.durationMs
  return 0
}

/** 这一刻是不是最后 10 秒（时间到之后的宽限里也算） */
function inLastTen(m: TimedMatch, now: number): boolean {
  return m.endsAt - now <= LAST_TEN_MS
}

/**
 * 某人答了第 index 题：只在比赛中、没过时间（加宽限）、且 index 正是他的下一题时生效（乱序 / 重复提交直接忽略）。
 * 答对：得分 = 1 + 连击第 3 题起 1 + 最后 10 秒 1，打在他那一边的 Boss 身上；血打光就打倒，多出来的伤害算到下一只身上。
 * 答错：打空，连击断掉。
 */
export function answer(
  m: TimedMatch,
  playerId: string,
  index: number,
  correct: boolean,
  now: number,
  graceMs = 0,
): { match: TimedMatch; events: TimedEvent[] } {
  const i = m.players.findIndex((p) => p.id === playerId)
  const player = m.players[i]
  if (m.phase !== 'playing' || !player || player.index !== index || now >= m.endsAt + graceMs) return { match: m, events: [] }
  const side = sideOfTeam(m.variant, player.team)
  const players = m.players.slice()
  if (!correct) {
    players[i] = { ...player, index: index + 1, streak: 0, input: '' }
    return { match: { ...m, players }, events: [{ type: 'miss', playerId, team: player.team, side }] }
  }
  const streak = player.streak + 1
  const points = 1 + (streak >= STREAK_BONUS_FROM ? 1 : 0) + (inLastTen(m, now) ? 1 : 0)
  const together = m.variant === 'coop' && m.lastHit !== null && m.lastHit.playerId !== playerId && now - m.lastHit.at <= TOGETHER_MS
  players[i] = {
    ...player,
    index: index + 1,
    correct: player.correct + 1,
    streak,
    bestStreak: Math.max(player.bestStreak, streak),
    input: '',
    score: player.score + points,
    together: player.together + (together ? 1 : 0),
  }
  const events: TimedEvent[] = [{ type: 'hit', playerId, team: player.team, side, points, streak, move: moveFor(streak), together }]
  const bosses = m.bosses.map((b) => {
    if (b.side !== side) return b
    let { level, hp, max, downs } = b
    hp -= points
    while (hp <= 0) {
      events.push({ type: 'bossDown', side, level })
      downs += 1
      level += 1
      max = bossHp(level, b.fighters, m.durationMs)
      hp += max
      events.push({ type: 'bossIn', side, level })
    }
    return { ...b, level, hp, max, downs }
  })
  return { match: { ...m, players, bosses, lastHit: { playerId, at: now } }, events }
}

/** 各打各的胜方：两边得分（按队合计）高的；一样是平局 null。一起打没有胜负 */
export function versusWinner(m: TimedMatch): Team | null {
  if (m.variant !== 'versus') return null
  const red = teamScore(m, 'red')
  const blue = teamScore(m, 'blue')
  return red === blue ? null : red > blue ? 'red' : 'blue'
}

/**
 * 时间往前走：进入最后 10 秒发 lastTen（只发一次）；到了 endsAt（+ 宽限）就结束，发 timeUp → finished。
 * 单设备按秒 / 按帧调；服务器在那两个时刻调（M13）。
 */
export function tick(m: TimedMatch, now: number, graceMs = 0): { match: TimedMatch; events: TimedEvent[] } {
  if (m.phase !== 'playing') return { match: m, events: [] }
  if (now >= m.endsAt + graceMs) {
    const ended: TimedMatch = { ...m, phase: 'ended', endedAt: m.endsAt, leftMs: 0, lastTen: true }
    const winner = versusWinner(ended)
    return { match: { ...ended, winner }, events: [{ type: 'timeUp' }, { type: 'finished', winner }] }
  }
  if (!m.lastTen && inLastTen(m, now)) return { match: { ...m, lastTen: true }, events: [{ type: 'lastTen' }] }
  return { match: m, events: [] }
}

/** 暂停（只有单设备，M1）：记下还剩多少 */
export function pause(m: TimedMatch, now: number): TimedMatch {
  if (m.phase !== 'playing') return m
  return { ...m, phase: 'paused', leftMs: Math.max(0, m.endsAt - now) }
}

/** 继续：时间到的时刻往后挪暂停的那么久 */
export function resume(m: TimedMatch, now: number): TimedMatch {
  if (m.phase !== 'paused') return m
  const endsAt = now + m.leftMs
  return { ...m, phase: 'playing', endsAt, startedAt: endsAt - m.durationMs, lastHit: null }
}

export function findTimedPlayer(m: TimedMatch, playerId: string): TimedPlayer | undefined {
  return m.players.find((p) => p.id === playerId)
}

export function teamTimedPlayers(m: TimedMatch, team: Team): TimedPlayer[] {
  return m.players.filter((p) => p.team === team)
}

/** 一队的得分（多人一队合计） */
export function teamScore(m: TimedMatch, team: Team): number {
  return teamTimedPlayers(m, team).reduce((a, p) => a + p.score, 0)
}

/** 一共打倒了几只（一起打就是全队的；各打各的是两边加起来） */
export function totalDowns(m: TimedMatch): number {
  return m.bosses.reduce((a, b) => a + b.downs, 0)
}

/** 某一边打倒了几只 */
export function downsOf(m: TimedMatch, side: BossSide): number {
  return m.bosses.find((b) => b.side === side)?.downs ?? 0
}

/** 星星：打倒几只 = 几颗，最多 3 颗（M3） */
export function starsFor(downs: number): number {
  return Math.min(STARS_MAX, Math.max(0, downs))
}

/** 本局之星（M4 / M7）：得分最高的人（一样高都算；都是 0 分没有） */
export function topScorers(m: TimedMatch): string[] {
  const best = Math.max(0, ...m.players.map((p) => p.score))
  return best > 0 ? m.players.filter((p) => p.score === best).map((p) => p.id) : []
}

/** 已经打了多久（结果页的走势横轴）：比赛中按 now 算，结束后固定 */
export function timedElapsedMs(m: TimedMatch, now: number): number {
  if (m.phase === 'playing') return Math.max(0, Math.min(m.durationMs, now - m.startedAt))
  if (m.phase === 'paused') return m.durationMs - m.leftMs
  if (m.phase === 'ended') return m.durationMs
  return 0
}

/** 计时器上的 m:ss（向上取整：还剩 89.2 秒显示 1:30，到 0 才是 0:00） */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
