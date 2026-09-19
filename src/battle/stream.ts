/**
 * 题目流（需求 B4）：每个参赛者一条，由 (kpId, seed, difficulty) 决定，按 index 取题。
 * 分批用 buildSession 生成（每批 16 题、批内按签名去重），用完下一批，总数不限；
 * 生成器是确定性的，所以对手、观战者、重连都能从同一组参数复现同一道题。
 */
import type { Difficulty, Question } from '@/types/models'
import { buildSession } from '@/engine'

export const BATCH_SIZE = 16

const cache = new Map<string, Question[]>()

/** 第 batch 批的种子：与 seed 一起决定，批与批之间不同 */
export function batchSeed(seed: number, batch: number): number {
  return (seed + Math.imul(batch, 0x9e3779b1)) >>> 0
}

function batchOf(kpId: string, seed: number, difficulty: Difficulty, batch: number): Question[] {
  const key = `${kpId}|${seed}|${difficulty}|${batch}`
  let qs = cache.get(key)
  if (!qs) {
    qs = buildSession(kpId, BATCH_SIZE, { seed: batchSeed(seed, batch), difficulty })
    if (qs.length === 0) throw new Error(`empty batch for ${kpId}`)
    cache.set(key, qs)
  }
  return qs
}

/** 题目流里第 index 题（从 0 起） */
export function questionAt(kpId: string, seed: number, difficulty: Difficulty, index: number): Question {
  let offset = index
  for (let batch = 0; batch < 10000; batch++) {
    const qs = batchOf(kpId, seed, difficulty, batch)
    if (offset < qs.length) return qs[offset]!
    offset -= qs.length
  }
  throw new Error('question stream exhausted')
}

/** 从 from 起连续 count 题（预解码朗读片段用） */
export function questionsAhead(kpId: string, seed: number, difficulty: Difficulty, from: number, count: number): Question[] {
  return Array.from({ length: count }, (_, i) => questionAt(kpId, seed, difficulty, from + i))
}

export function clearStreamCache(): void {
  cache.clear()
}
