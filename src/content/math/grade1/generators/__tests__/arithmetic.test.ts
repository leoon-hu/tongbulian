import { describe, expect, it } from 'vitest'
import type { LStr, Question } from '@/types/models'
import '@/content/math/grade1' // 副作用：注册生成器与词条
import { buildSession, createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'

const KP = 's1-05-carry-add'

/** 选项标签现在是 LStr；算术题的标签都是纯数字串，解析到中文即原样。 */
const zh = (l: LStr): string => translate(l, 'zh')

function operandsOf(q: Question): number[] {
  const expr = q.stem.find((p) => p.kind === 'expr')
  if (!expr || expr.kind !== 'expr') throw new Error('question has no expr stem')
  return expr.expr
    .replace('= ?', '')
    .split('+')
    .map((s) => parseInt(s.trim(), 10))
}

function correctValue(q: Question): number {
  if (q.answer.kind === 'number') return q.answer.value
  const choice = q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!
  return parseInt(zh(choice.label), 10)
}

describe('凑十法生成器 (s1-05-carry-add)', () => {
  it('已注册', () => {
    expect(getGenerator(KP)).toBeDefined()
  })

  it('多种子：答案正确、进位成立、难度范围合规', () => {
    const gen = getGenerator(KP)!
    for (let seed = 1; seed <= 500; seed++) {
      const rng = createRng(seed)
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, rng)
        const ops = operandsOf(q)
        const sum = ops.reduce((s, n) => s + n, 0)

        // 答案 = 加数之和
        expect(correctValue(q)).toBe(sum)
        // 进位加法：和在 11~20 之间（含体现凑十的连加）
        expect(sum).toBeGreaterThanOrEqual(11)
        expect(sum).toBeLessThanOrEqual(20)
        // 所有加数为个位数正整数
        for (const op of ops) {
          expect(op).toBeGreaterThanOrEqual(1)
          expect(op).toBeLessThanOrEqual(9)
        }

        // 难度约束
        if (d === 1) expect(ops[0]).toBe(9)
        if (d === 2) expect([8, 7, 6]).toContain(ops[0])
        if (d === 3 && ops.length === 2) expect([2, 3, 4, 5]).toContain(ops[0])

        // 两加数题必须带凑十演示
        if (ops.length === 2) {
          expect(q.explain).toEqual({ kind: 'make-ten', a: ops[0], b: ops[1] })
        }
      }
    }
  })

  it('选择题：四个选项互异、含正确答案、干扰项为正数', () => {
    const gen = getGenerator(KP)!
    let checked = 0
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed)
      const q = gen(rng.chance(0.5) ? 1 : 2, rng)
      if (q.input !== 'choice') continue
      checked += 1
      const labels = q.choices!.map((c) => zh(c.label))
      expect(new Set(labels).size).toBe(4)
      const sum = operandsOf(q).reduce((s, n) => s + n, 0)
      expect(labels).toContain(String(sum))
      for (const label of labels) {
        expect(parseInt(label, 10)).toBeGreaterThan(0)
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  it('破十法带图的题：格里满 10、划掉的 = 减数、外面的 = 个位，剩下的加外面的 = 答案', () => {
    const gen = getGenerator('s2-02-borrow-sub')!
    let checked = 0
    for (const d of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 200; seed++) {
        const q = gen(d, createRng(seed))
        const frame = q.stem.find((p) => p.kind === 'tenframe')
        if (!frame || frame.kind !== 'tenframe') continue
        checked += 1
        const expr = q.stem.find((p) => p.kind === 'expr')
        if (!expr || expr.kind !== 'expr') throw new Error('no expr')
        const [minuend, subtrahend] = expr.expr.replace('= ?', '').split('-').map((s) => parseInt(s.trim(), 10)) as [number, number]
        expect(frame.filled).toBe(10)
        expect(frame.taken).toBe(subtrahend)
        expect(frame.extra).toBe(minuend - 10)
        expect(10 - frame.taken! + frame.extra!).toBe(minuend - subtrahend)
        if (q.answer.kind === 'number') expect(q.answer.value).toBe(minuend - subtrahend)
        const hint = q.stem[0]
        expect(hint?.kind === 'text' && typeof hint.text === 'object' && hint.text.p?.n).toBe(subtrahend)
        expect(zh(hint!.kind === 'text' ? hint.text : '')).toContain(`拿走 ${subtrahend} 个`)
      }
    }
    expect(checked).toBeGreaterThan(30)
  })

  it('十格阵题干：filled/extra 与算式一致', () => {
    const gen = getGenerator(KP)!
    let checked = 0
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(1, createRng(seed))
      const frame = q.stem.find((p) => p.kind === 'tenframe')
      if (!frame || frame.kind !== 'tenframe') continue
      checked += 1
      const ops = operandsOf(q)
      expect(frame.filled).toBe(ops[0])
      expect(frame.extra).toBe(ops[1])
      expect(frame.filled).toBeLessThanOrEqual(10)
    }
    expect(checked).toBeGreaterThan(20)
  })
})

describe('buildSession', () => {
  it('多种子：题目数量足额且签名不重复', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const qs = buildSession(KP, 8, { seed, difficulty: 2 })
      expect(qs).toHaveLength(8)
      expect(new Set(qs.map((q) => q.id)).size).toBe(8)
    }
  })

  it('未注册的知识点抛错', () => {
    expect(() => buildSession('nonexistent', 8)).toThrow()
  })
})
