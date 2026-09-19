import { describe, expect, it } from 'vitest'
import '@/content/math/grade1'
import { createRng } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { AI_KEY_MS, AI_LEVELS, AI_PROFILE, AI_SUBMIT_MS, isAiLevel, planAnswer } from '../ai'
import { questionAt } from '../stream'
import { NAME_MAX, NAME_POOL, cleanName, suggestNames } from '../names'

describe('机器人（B11）', () => {
  it('计划：总时长在档位范围内，答对 = 正确答案，答错 ≠ 正确答案，按键序列与答案一致', () => {
    for (const level of AI_LEVELS) {
      const { minMs, maxMs } = AI_PROFILE[level]
      for (let seed = 1; seed <= 60; seed++) {
        const q = questionAt('s1-05-carry-add', seed, seed % 5)
        const plan = planAnswer(q, level, createRng(seed))
        const total = plan.thinkMs + plan.keys.length * AI_KEY_MS + AI_SUBMIT_MS
        expect(plan.thinkMs).toBeGreaterThanOrEqual(500)
        expect(total).toBeGreaterThanOrEqual(Math.min(minMs, 500 + plan.keys.length * AI_KEY_MS + AI_SUBMIT_MS))
        expect(total).toBeLessThanOrEqual(maxMs + 1)
        const given = q.input === 'numpad' ? Number(plan.given) : plan.given
        expect(checkAnswer(q, given)).toBe(plan.correct)
        if (q.input === 'numpad') expect(plan.keys.join('')).toBe(plan.given)
        else {
          expect(plan.keys).toEqual([plan.given])
          expect(q.choices!.some((c) => c.id === plan.given)).toBe(true)
        }
      }
    }
  })

  it('正确率大致等于档位设定', () => {
    const rng = createRng(99)
    for (const level of AI_LEVELS) {
      let right = 0
      const N = 600
      for (let i = 0; i < N; i++) {
        const q = questionAt('s1-02-addsub-10', 1, i % 40)
        if (planAnswer(q, level, rng).correct) right++
      }
      expect(Math.abs(right / N - AI_PROFILE[level].accuracy)).toBeLessThan(0.06)
    }
  })

  it('isAiLevel', () => {
    expect(isAiLevel('fast')).toBe(true)
    expect(isAiLevel('turbo')).toBe(false)
  })
})

describe('昵称（B17）', () => {
  it('清洗：去控制字符与首尾空白，最多 8 个字（emoji 算一个）', () => {
    expect(cleanName('  小兔\u0000​  ')).toBe('小兔')
    expect(cleanName('🐰 小兔子的名字很长很长')).toBe('🐰 小兔子的名字')
    expect(Array.from(cleanName('🐰🐯🐼🦊🐻🐨🐸🐧🦁🐵')).length).toBe(NAME_MAX)
    expect(cleanName(' ')).toBe('')
  })

  it('推荐名字：6 个、互不相同、来自名字池、排除已占用的', () => {
    const taken = NAME_POOL.zh.slice(0, 3)
    const names = suggestNames('zh', createRng(1), 6, taken)
    expect(names).toHaveLength(6)
    expect(new Set(names).size).toBe(6)
    for (const n of names) {
      expect(NAME_POOL.zh).toContain(n)
      expect(taken).not.toContain(n)
    }
    expect(suggestNames('en', createRng(2)).every((n) => NAME_POOL.en.includes(n))).toBe(true)
  })
})
