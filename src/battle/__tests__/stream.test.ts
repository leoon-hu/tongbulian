import { beforeEach, describe, expect, it } from 'vitest'
import '@/content/math/grade1'
import '@/content/math/grade2'
import { BATCH_SIZE, batchSeed, clearStreamCache, questionAt, questionsAhead } from '../stream'

beforeEach(clearStreamCache)

describe('题目流（B4）', () => {
  it('同一组参数复现同一道题；换 seed 或换难度就不同', () => {
    const a = questionAt('s1-05-carry-add', 7, 3)
    clearStreamCache()
    const b = questionAt('s1-05-carry-add', 7, 3)
    expect(b).toEqual(a)
    expect(a.kpId).toBe('s1-05-carry-add')
    const other = Array.from({ length: 5 }, (_, i) => questionAt('s1-05-carry-add', 8, i).id)
    const mine = Array.from({ length: 5 }, (_, i) => questionAt('s1-05-carry-add', 7, i).id)
    expect(other).not.toEqual(mine)
  })

  it('一批内按签名去重，超过一批照样有题（签名空间小的知识点也不会卡住）', () => {
    for (const kpId of ['m2s2-01-clock-hour', 's1-01-num-5', 'm2s1-05-cm-m']) {
      const ids = Array.from({ length: BATCH_SIZE * 3 + 5 }, (_, i) => questionAt(kpId, 3, i).id)
      expect(ids.every((id) => id.startsWith(`${kpId}:`))).toBe(true)
      // 第一批内部没有重复
      const first = ids.slice(0, BATCH_SIZE)
      expect(new Set(first).size).toBe(first.length)
    }
  })

  it('批种子彼此不同且是非负整数', () => {
    const seeds = [0, 1, 2, 3].map((b) => batchSeed(123, b))
    expect(new Set(seeds).size).toBe(4)
    for (const s of seeds) expect(Number.isInteger(s) && s >= 0).toBe(true)
  })

  it('questionsAhead 是从 from 起的连续几题', () => {
    const ahead = questionsAhead('m2s1-02-mult-intro', 5, 14, 6)
    expect(ahead.map((q) => q.id)).toEqual(Array.from({ length: 6 }, (_, i) => questionAt('m2s1-02-mult-intro', 5, 14 + i).id))
  })
})
