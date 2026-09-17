import { describe, expect, it } from 'vitest'
import type { LStr } from '@/types/models'
import { createRng } from '@/engine'
import { translate } from '@/engine/i18n'
import { choicesFrom, numberDistractors, numberQuestion } from '../common'

const zh = (l: LStr): string => translate(l, 'zh')

describe('numberDistractors', () => {
  it('多种子：恰好 count 项、互异、在 [min, max] 内、不等于正确答案', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed)
      const max = rng.pick([5, 10, 20, 100])
      const answer = rng.int(0, max)
      const wrongs = numberDistractors(answer, { min: 0, max })
      expect(wrongs).toHaveLength(3)
      expect(new Set(wrongs).size).toBe(3)
      for (const v of wrongs) {
        expect(v).not.toBe(answer)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(max)
      }
    }
  })

  it('smart 里的常见错误优先入选，越界 / 重复 / 等于答案的会被跳过', () => {
    expect(numberDistractors(14, { max: 20, smart: [13, 4, 24, 14, 13] })).toEqual([13, 4, 15])
  })

  it('取值空间很小时仍能补足（3 以内只有 0~3 四个数）', () => {
    expect(numberDistractors(2, { min: 0, max: 3 }).sort()).toEqual([0, 1, 3])
  })
})

describe('choicesFrom', () => {
  it('正确项 id 指向正确标签，选项含全部候选且 id 互异', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { choices, correctId } = choicesFrom({ k: 'shape.cube' }, ['a', 'b', { k: 'shape.sphere' }], createRng(seed))
      expect(choices).toHaveLength(4)
      expect(new Set(choices.map((c) => c.id)).size).toBe(4)
      expect(choices.find((c) => c.id === correctId)!.label).toEqual({ k: 'shape.cube' })
    }
  })
})

describe('numberQuestion', () => {
  const base = { kpId: 'kp', type: 'arith' as const, difficulty: 1 as const, sig: '1+1', stem: [], value: 2, max: 10 }

  it('numpad：数值答案，无选项', () => {
    const q = numberQuestion({ ...base, rng: createRng(1), input: 'numpad' })
    expect(q.id).toBe('kp:1+1')
    expect(q.input).toBe('numpad')
    expect(q.answer).toEqual({ kind: 'number', value: 2 })
    expect(q.choices).toBeUndefined()
  })

  it('choice：四个互异选项，正确项就是答案数值', () => {
    const q = numberQuestion({ ...base, rng: createRng(1), input: 'choice' })
    expect(q.input).toBe('choice')
    expect(q.choices).toHaveLength(4)
    const labels = q.choices!.map((c) => zh(c.label))
    expect(new Set(labels).size).toBe(4)
    expect(q.answer.kind).toBe('choice')
    const correct = q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!
    expect(zh(correct.label)).toBe('2')
  })

  it('不指定 input 时随机落到 numpad 或 choice 两种之一', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 50; seed++) seen.add(numberQuestion({ ...base, rng: createRng(seed) }).input)
    expect(seen).toEqual(new Set(['numpad', 'choice']))
  })
})
