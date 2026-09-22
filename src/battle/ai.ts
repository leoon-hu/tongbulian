/**
 * 机器人对手（需求 B11、B60、B61）：按档位决定每题想多久、答不答得对，答案一个一个按出来给孩子看；
 * 「跟着你」档按孩子最近几题的节奏定自己的节奏；在几个时刻说一句话。
 * 纯函数：给题目、档位、随机数（与孩子的节奏），返回这一题的「计划」；什么时候执行由 stores/battle.ts 的计时器负责。
 */
import type { Question } from '@/types/models'
import type { RNG } from '@/engine'
import { numberDistractors } from '@/engine'
import type { ArenaEvent, Team } from './protocol'

/** auto = 跟着你（B60，默认）；slow / mid / fast 是固定档 */
export type AiLevel = 'auto' | 'slow' | 'mid' | 'fast'
export type FixedAiLevel = Exclude<AiLevel, 'auto'>
export const AI_LEVELS: readonly AiLevel[] = ['auto', 'slow', 'mid', 'fast']
export const FIXED_AI_LEVELS: readonly FixedAiLevel[] = ['slow', 'mid', 'fast']
export const AI_ID = 'ai'

export interface AiProfile {
  minMs: number
  maxMs: number
  accuracy: number
}

/** 每题从看到到按完的总时长范围（ms）与正确率 */
export const AI_PROFILE: Record<FixedAiLevel, AiProfile> = {
  slow: { minMs: 10000, maxMs: 14000, accuracy: 0.7 },
  mid: { minMs: 6000, maxMs: 9000, accuracy: 0.8 },
  fast: { minMs: 3500, maxMs: 5000, accuracy: 0.9 },
}

/** 孩子的节奏（B60）：最近几题的平均用时（还没答过 = null）、正确率（答了不到 2 题 = null）、机器人比孩子多几分 */
export interface HumanPace {
  avgMs: number | null
  accuracy: number | null
  diff: number
}
export const NO_PACE: HumanPace = { avgMs: null, accuracy: null, diff: 0 }
/** 「跟着你」：比孩子慢一点；落后 3 分以上再慢一截、领先 3 分以上快一截；总时长的上下限 */
export const AUTO_SLOWER = 1.15
export const AUTO_BEHIND_X = 1.35
export const AUTO_AHEAD_X = 0.8
export const AUTO_BAND = 3
export const AUTO_MIN_MS = 2500
export const AUTO_MAX_MS = 15000
export const AUTO_ACC_DROP = 0.1

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/**
 * 「跟着你」档的节奏（B60）：孩子还没答过题就按「中」；答过就按他的平均用时 × 1.15（略慢），
 * 机器人领先 3 分以上再慢 35%、落后 3 分以上快 20%，让每局都打到六七分才见分晓；正确率比孩子的低 0.1（0.55–0.9）
 */
export function autoProfile(pace: HumanPace): AiProfile {
  if (pace.avgMs === null) return AI_PROFILE.mid
  let target = clamp(pace.avgMs * AUTO_SLOWER, AUTO_MIN_MS, AUTO_MAX_MS)
  if (pace.diff >= AUTO_BAND) target *= AUTO_BEHIND_X
  else if (pace.diff <= -AUTO_BAND) target *= AUTO_AHEAD_X
  target = clamp(target, AUTO_MIN_MS, AUTO_MAX_MS * AUTO_BEHIND_X)
  const accuracy = pace.accuracy === null ? AI_PROFILE.mid.accuracy : clamp(pace.accuracy - AUTO_ACC_DROP, 0.55, 0.9)
  return { minMs: Math.round(target * 0.8), maxMs: Math.round(target * 1.25), accuracy }
}

export function profileFor(level: AiLevel, pace: HumanPace = NO_PACE): AiProfile {
  return level === 'auto' ? autoProfile(pace) : AI_PROFILE[level]
}

// ── 机器人的话（B61）：屏幕上它那一行冒气泡，同时朗读 ──

/** 词条键（`robot.*`，中英 + 拼音，进语料）与说话前的延迟：反超 / 还差一分等弹出提示读完再说，结束的等播报完再说 */
export const ROBOT_LINE_DELAY_MS: Record<'go' | 'lead' | 'nearWin' | 'finished', number> = { go: 400, lead: 1500, nearWin: 1500, finished: 3200 }
/** 气泡显示多久 */
export const ROBOT_SAY_MS = 2600

/** 这个事件机器人说哪句：开局「我准备好啦」、自己反超「我领先啦」、被反超「哎呀被追上了」、孩子还差一分「别急别急」、输了 / 赢了各一句 */
export function robotLineFor(e: ArenaEvent, botTeam: Team = 'blue'): string | null {
  switch (e.type) {
    case 'go':
      return 'robot.ready'
    case 'lead':
      return e.team === botTeam ? 'robot.lead' : 'robot.behind'
    case 'nearWin':
      return e.team === botTeam ? null : 'robot.worry'
    case 'finished':
      return e.winner === botTeam ? 'robot.win' : 'robot.lose'
    default:
      return null
  }
}

/** 一个一个按出来的间隔 */
export const AI_KEY_MS = 320
/** 按完到提交的停顿 */
export const AI_SUBMIT_MS = 250

export interface AiPlan {
  /** 「想一想」的时长，之后开始按 */
  thinkMs: number
  correct: boolean
  /** 提交的答案：数字题是数字串，选择题是选项 id */
  given: string
  /** 依次按出来的内容：数字题逐位，选择题就是那一张卡 */
  keys: string[]
}

export function isAiLevel(v: unknown): v is AiLevel {
  return v === 'auto' || v === 'slow' || v === 'mid' || v === 'fast'
}

export function planAnswer(q: Question, level: AiLevel, rng: RNG, pace: HumanPace = NO_PACE): AiPlan {
  const profile = profileFor(level, pace)
  const correct = rng.chance(profile.accuracy)
  const ans = q.answer
  let given: string
  let keys: string[]
  if (ans.kind === 'number') {
    const value = ans.value
    if (correct) given = String(value)
    else {
      const wrongs = numberDistractors(value, { min: 0, max: Math.max(value + 10, 20), count: 3 })
      given = String(wrongs.length ? rng.pick(wrongs) : value + 1)
    }
    keys = given.split('')
  } else {
    const ids = (q.choices ?? []).map((c) => c.id)
    const wrongs = ids.filter((id) => id !== ans.choiceId)
    given = correct || wrongs.length === 0 ? ans.choiceId : rng.pick(wrongs)
    keys = [given]
  }
  const total = rng.int(profile.minMs, profile.maxMs)
  const thinkMs = Math.max(500, total - keys.length * AI_KEY_MS - AI_SUBMIT_MS)
  return { thinkMs, correct, given, keys }
}
