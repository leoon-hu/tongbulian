import { describe, expect, it } from 'vitest'
import '@/content/math/grade1'
import { createRng } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { AI_KEY_MS, AI_LEVELS, AI_PROFILE, AI_SUBMIT_MS, AUTO_MAX_MS, AUTO_MIN_MS, FIXED_AI_LEVELS, NO_PACE, PRIOR_FADE_N, autoProfile, blendPace, isAiLevel, isRunRecord, paceOfRun, planAnswer, profileFor, robotLineFor } from '../ai'
import { questionAt } from '../stream'
import { NAME_MAX, NAME_POOL, cleanName, suggestNames } from '../names'

describe('机器人（B11）', () => {
  it('计划：总时长在档位范围内，答对 = 正确答案，答错 ≠ 正确答案，按键序列与答案一致', () => {
    for (const level of FIXED_AI_LEVELS) {
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
    for (const level of FIXED_AI_LEVELS) {
      let right = 0
      const N = 600
      for (let i = 0; i < N; i++) {
        const q = questionAt('s1-02-addsub-10', 1, i % 40)
        if (planAnswer(q, level, rng).correct) right++
      }
      expect(Math.abs(right / N - AI_PROFILE[level].accuracy)).toBeLessThan(0.06)
    }
  })

  it('isAiLevel：四档，auto 排第一（默认）', () => {
    expect(isAiLevel('fast')).toBe(true)
    expect(isAiLevel('auto')).toBe(true)
    expect(isAiLevel('turbo')).toBe(false)
    expect(AI_LEVELS[0]).toBe('auto')
  })

  it('「跟着你」（B60）：孩子没答过按「中」；答过就按平均用时 × 1.15，领先 3 分以上再慢、落后 3 分以上快；正确率比孩子低 0.1、卡在 0.55–0.9；范围有上下限', () => {
    expect(autoProfile(NO_PACE)).toEqual(AI_PROFILE.mid)
    expect(profileFor('auto')).toEqual(AI_PROFILE.mid)
    expect(profileFor('fast')).toEqual(AI_PROFILE.fast)
    const even = autoProfile({ avgMs: 4000, accuracy: 0.75, diff: 0 })
    expect(even.minMs).toBe(Math.round(4600 * 0.8))
    expect(even.maxMs).toBe(Math.round(4600 * 1.25))
    expect(even.accuracy).toBeCloseTo(0.65, 5)
    const ahead = autoProfile({ avgMs: 4000, accuracy: 0.75, diff: 3 }) // 机器人领先 3 分：慢 35%
    expect(ahead.minMs).toBeGreaterThan(even.minMs)
    expect(ahead.maxMs).toBe(Math.round(4600 * 1.35 * 1.25))
    const behind = autoProfile({ avgMs: 4000, accuracy: 0.75, diff: -3 }) // 机器人落后 3 分：快 20%
    expect(behind.maxMs).toBe(Math.round(4600 * 0.8 * 1.25))
    expect(autoProfile({ avgMs: 500, accuracy: 1, diff: 0 })).toEqual({ minMs: Math.round(AUTO_MIN_MS * 0.8), maxMs: Math.round(AUTO_MIN_MS * 1.25), accuracy: 0.9 })
    expect(autoProfile({ avgMs: 60000, accuracy: 0.1, diff: 0 })).toEqual({ minMs: Math.round(AUTO_MAX_MS * 0.8), maxMs: Math.round(AUTO_MAX_MS * 1.25), accuracy: 0.55 })
    expect(autoProfile({ avgMs: 4000, accuracy: null, diff: 0 }).accuracy).toBe(AI_PROFILE.mid.accuracy)
    // planAnswer 按节奏出计划：总时长落在算出来的范围里
    for (let seed = 1; seed <= 40; seed++) {
      const q = questionAt('s1-05-carry-add', seed, seed % 5)
      const plan = planAnswer(q, 'auto', createRng(seed), { avgMs: 3000, accuracy: 0.9, diff: 0 })
      const total = plan.thinkMs + plan.keys.length * AI_KEY_MS + AI_SUBMIT_MS
      const { minMs, maxMs } = autoProfile({ avgMs: 3000, accuracy: 0.9, diff: 0 })
      expect(total).toBeGreaterThanOrEqual(Math.min(minMs, 500 + plan.keys.length * AI_KEY_MS + AI_SUBMIT_MS))
      expect(total).toBeLessThanOrEqual(maxMs + 1)
    }
  })

  it('机器人的话（B61）：开局、自己反超、被反超、孩子还差一分、输、赢各一句；别的事件不说', () => {
    expect(robotLineFor({ type: 'go' })).toBe('robot.ready')
    expect(robotLineFor({ type: 'lead', team: 'blue' })).toBe('robot.lead')
    expect(robotLineFor({ type: 'lead', team: 'red' })).toBe('robot.behind')
    expect(robotLineFor({ type: 'nearWin', team: 'red' })).toBe('robot.worry')
    expect(robotLineFor({ type: 'nearWin', team: 'blue' })).toBeNull()
    expect(robotLineFor({ type: 'finished', winner: 'red' })).toBe('robot.lose')
    expect(robotLineFor({ type: 'finished', winner: 'blue' })).toBe('robot.win')
    expect(robotLineFor({ type: 'point', team: 'red', playerId: 'a', streak: 1 })).toBeNull()
    expect(robotLineFor({ type: 'countdown' })).toBeNull()
    expect(robotLineFor({ type: 'lead', team: 'red' }, 'red')).toBe('robot.lead')
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

describe('上一次的记录并进「跟着你」（B67）', () => {
  it('记录里的节奏：相邻两题的差减掉上一题的反馈窗口取平均，正确率答了 2 题起；记录的形状校验', () => {
    const fb = { right: 600, wrong: 1200 }
    expect(paceOfRun(undefined, fb)).toEqual({ avgMs: null, accuracy: null })
    expect(paceOfRun({ at: 1, answers: [] }, fb)).toEqual({ avgMs: null, accuracy: null })
    const one = paceOfRun({ at: 1, answers: [{ index: 0, ok: true, t: 2000 }] }, fb)
    expect(one).toEqual({ avgMs: 2000, accuracy: null })
    // 第 1 题 2000；第 2 题 5000 − 2000 − 600（上题答对）= 2400；第 3 题 8000 − 5000 − 1200（上题答错）= 1800
    const three = paceOfRun({ at: 1, answers: [{ index: 0, ok: true, t: 2000 }, { index: 1, ok: false, t: 5000 }, { index: 2, ok: true, t: 8000 }] }, fb)
    expect(three.avgMs).toBeCloseTo((2000 + 2400 + 1800) / 3, 5)
    expect(three.accuracy).toBeCloseTo(2 / 3, 5)
    expect(isRunRecord({ at: 1, answers: [{ index: 0, ok: true, t: 1200 }] })).toBe(true)
    expect(isRunRecord({ at: 1, answers: [{ index: 0.5, ok: true, t: 1 }] })).toBe(false)
    expect(isRunRecord({ at: 'x', answers: [] })).toBe(false)
    expect(isRunRecord(null)).toBe(false)
  })

  it('混合：这一局没答过全按记录，答了 PRIOR_FADE_N 题后全按这一局，中间按比例；哪边没有就用另一边；分差只看这一局', () => {
    const prior = { avgMs: 4000, accuracy: 0.5 }
    expect(blendPace({ avgMs: null, accuracy: null, diff: 2 }, prior, 0)).toEqual({ avgMs: 4000, accuracy: 0.5, diff: 2 })
    const mid = blendPace({ avgMs: 2000, accuracy: 1, diff: -1 }, prior, PRIOR_FADE_N / 2)
    expect(mid.avgMs).toBeCloseTo(3000, 5)
    expect(mid.accuracy).toBeCloseTo(0.75, 5)
    expect(mid.diff).toBe(-1)
    expect(blendPace({ avgMs: 2000, accuracy: 1, diff: 0 }, prior, PRIOR_FADE_N)).toEqual({ avgMs: 2000, accuracy: 1, diff: 0 })
    expect(blendPace({ avgMs: 2000, accuracy: null, diff: 0 }, { avgMs: null, accuracy: null }, 1)).toEqual({ avgMs: 2000, accuracy: null, diff: 0 })
    expect(blendPace({ avgMs: null, accuracy: null, diff: 0 }, { avgMs: null, accuracy: null }, 0)).toEqual(NO_PACE)
  })
})
