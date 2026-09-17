import type { Difficulty, Question } from '@/types/models'
import { createRng, type RNG } from './rng'

export type Generator = (difficulty: Difficulty, rng: RNG) => Question

const registry = new Map<string, Generator>()

export function defineGenerator(kpId: string, gen: Generator): void {
  registry.set(kpId, gen)
}

export function hasGenerator(kpId: string): boolean {
  return registry.has(kpId)
}

export function getGenerator(kpId: string): Generator | undefined {
  return registry.get(kpId)
}

export interface SessionOptions {
  difficulty?: Difficulty
  seed?: number
}

/** 一轮练习的题数（练习页与地图进度条共用） */
export const ROUND_SIZE = 8

/**
 * 组卷：按 Question.id（参数签名）去重。
 * 难度分布：约 60% 当前档、25% 低一档（热身）、15% 高一档（够一够）；
 * 当前档为 1 时没有更低档，就是 85% / 15%。同一签名不同难度不会重复出现。
 */
export function buildSession(kpId: string, count = ROUND_SIZE, opts: SessionOptions = {}): Question[] {
  const gen = registry.get(kpId)
  if (!gen) throw new Error(`no generator for knowledge point: ${kpId}`)
  const rng = createRng(opts.seed)
  const base: Difficulty = opts.difficulty ?? 1
  const questions: Question[] = []
  const seen = new Set<string>()
  const maxTries = count * 30
  let tries = 0
  while (questions.length < count && tries < maxTries) {
    tries += 1
    const roll = rng.next()
    let d: Difficulty = base
    if (roll > 0.85 && base < 3) d = (base + 1) as Difficulty
    else if (roll > 0.6 && base > 1) d = (base - 1) as Difficulty
    const q = gen(d, rng)
    if (seen.has(q.id)) continue
    seen.add(q.id)
    questions.push(q)
  }
  return questions
}
