import { describe, expect, it } from 'vitest'
import type { LStr, Question } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/math/grade3/curriculum'
import { buildSession, createRng, getGenerator, hasGenerator, labelKey } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { translate } from '@/engine/i18n'
import { answerSpeech, questionSpeech } from '@/engine/speech'

// 三年级数学全部知识点的通用检查；各单元的专项检查在同目录的 <单元>.test.ts。
const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const correctInput = (q: Question): unknown => (q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId)

describe('三年级数学：每个知识点都有生成器', () => {
  it('目录里的知识点都注册了生成器', () => {
    expect(KNOWLEDGE_POINTS.filter((kp) => !hasGenerator(kp.id)).map((kp) => kp.id)).toEqual([])
  })
})

describe('三年级数学：题目结构自洽（多种子 × 三档）', () => {
  for (const kp of KNOWLEDGE_POINTS.filter((k) => hasGenerator(k.id))) {
    it(`${kp.id}`, () => {
      const firstTier = new Set<string>()
      each(kp.id, (q, d) => {
        expect(q.kpId).toBe(kp.id)
        expect(q.id.startsWith(`${kp.id}:`)).toBe(true)
        expect(q.difficulty).toBe(d)
        expect(kp.questionTypes, q.id).toContain(q.type)
        expect(q.stem.length).toBeGreaterThan(0)
        expect(checkAnswer(q, correctInput(q)), q.id).toBe(true)
        if (q.input === 'numpad') {
          expect(q.answer.kind).toBe('number')
          const v = (q.answer as { value: number }).value
          expect(Number.isInteger(v) && v >= 0, `${q.id} 数字键盘的答案要是非负整数：${v}`).toBe(true)
          expect(v, q.id).toBeLessThan(100000)
        } else {
          const cs = q.choices!
          expect(cs.length, q.id).toBeGreaterThanOrEqual(2)
          expect(cs.length, q.id).toBeLessThanOrEqual(4)
          expect(new Set(cs.map((c) => labelKey(c.label))).size, q.id).toBe(cs.length)
          expect(new Set(cs.map((c) => zh(c.label))).size, `${q.id} 选项文字重复`).toBe(cs.length)
        }
        for (const part of q.stem) {
          if (part.kind !== 'text') continue
          // 题干里不该残留没翻译的键（词条漏写会原样显示 key）
          expect(zh(part.text), q.id).not.toMatch(/\b(m3|shape|sym)\.[a-zA-Z]/)
          expect(translate(part.text, 'en'), q.id).not.toMatch(/\b(m3|shape|sym)\.[a-zA-Z]/)
          expect(zh(part.text), q.id).not.toMatch(/undefined|NaN/)
        }
        for (const c of q.choices ?? []) {
          expect(zh(c.label), q.id).not.toMatch(/\b(m3|shape)\.[a-zA-Z]|undefined|NaN/)
          expect(translate(c.label, 'en'), q.id).not.toMatch(/\b(m3|shape)\.[a-zA-Z]|undefined|NaN/)
        }
        if (d === 1) firstTier.add(q.id)
        for (const lang of ['zh', 'en'] as const) {
          expect(questionSpeech(q, lang).length, q.id).toBeGreaterThan(0)
          expect(answerSpeech(q, lang).length, q.id).toBeGreaterThan(0)
        }
      })
      // 练习固定在第 1 档：一轮 8 题要凑得满，对战一批 16 题也要够
      expect(firstTier.size, `${kp.id} 第 1 档只有 ${firstTier.size} 种题`).toBeGreaterThanOrEqual(12)
      for (let seed = 1; seed <= 10; seed++) expect(buildSession(kp.id, 8, { seed }).length).toBe(8)
    })
  }
})
