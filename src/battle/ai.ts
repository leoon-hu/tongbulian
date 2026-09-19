/**
 * 机器人对手（需求 B11）：按档位决定每题想多久、答不答得对，答案一个一个按出来给孩子看。
 * 纯函数：给题目、档位、随机数，返回这一题的「计划」；什么时候执行由 stores/battle.ts 的计时器负责。
 */
import type { Question } from '@/types/models'
import type { RNG } from '@/engine'
import { numberDistractors } from '@/engine'

export type AiLevel = 'slow' | 'mid' | 'fast'
export const AI_LEVELS: readonly AiLevel[] = ['slow', 'mid', 'fast']
export const AI_ID = 'ai'

/** 每题从看到到按完的总时长范围（ms）与正确率 */
export const AI_PROFILE: Record<AiLevel, { minMs: number; maxMs: number; accuracy: number }> = {
  slow: { minMs: 10000, maxMs: 14000, accuracy: 0.7 },
  mid: { minMs: 6000, maxMs: 9000, accuracy: 0.8 },
  fast: { minMs: 3500, maxMs: 5000, accuracy: 0.9 },
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
  return v === 'slow' || v === 'mid' || v === 'fast'
}

export function planAnswer(q: Question, level: AiLevel, rng: RNG): AiPlan {
  const profile = AI_PROFILE[level]
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
