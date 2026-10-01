import { describe, expect, it } from 'vitest'
import type { LStr, Question } from '@/types/models'
import '@/content/math/grade1' // 副作用：注册生成器与词条
import { buildSession, createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { tenFrameProps } from '@/content/math/shared/demo'

const KP = 's1-05-carry-add'
/** 20 以内的进位加法三个小节：第一个加数的范围 */
const SECTIONS: Record<string, number[]> = {
  's1-05-carry-add': [9],
  's1-05-add-876': [8, 7, 6],
  's1-05-add-5432': [5, 4, 3, 2],
}

/** 选项标签现在是 LStr；算术题的标签都是纯数字串，解析到中文即原样。 */
const zh = (l: LStr): string => translate(l, 'zh')

/** 「a + b = ?」「a + b + c = ?」这样的加法算式（别的题型——比大小、填未知加数、文字题、找卡片——返回 null） */
function operandsOf(q: Question): number[] | null {
  const expr = q.stem.find((p) => p.kind === 'expr')
  if (!expr || expr.kind !== 'expr' || !expr.expr.endsWith('= ?')) return null
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

describe('20 以内的进位加法：9 加几 / 8、7、6 加几 / 5、4、3、2 加几', () => {
  it('已注册', () => {
    for (const kp of Object.keys(SECTIONS)) expect(getGenerator(kp)).toBeDefined()
  })

  it('多种子：答案正确、进位成立、第一个加数在这一节里', () => {
    for (const [kp, firsts] of Object.entries(SECTIONS)) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 300; seed++) {
        const rng = createRng(seed)
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, rng)
          const ops = operandsOf(q)
          if (!ops) continue
          const sum = ops.reduce((s, n) => s + n, 0)
          // 答案 = 加数之和
          expect(correctValue(q)).toBe(sum)
          // 进位加法：和在 11~18 之间（含体现凑十的连加 9 + 1 + 4）
          expect(sum).toBeGreaterThanOrEqual(11)
          expect(sum).toBeLessThanOrEqual(18)
          for (const op of ops) {
            expect(op).toBeGreaterThanOrEqual(1)
            expect(op).toBeLessThanOrEqual(9)
          }
          expect(firsts).toContain(ops[0])
          if (ops.length === 3) expect(ops[0]! + ops[1]!).toBe(10)
          // 两加数题必须带凑十演示
          if (ops.length === 2) expect(q.explain).toEqual({ kind: 'make-ten', a: ops[0], b: ops[1] })
        }
      }
    }
  })

  it('第 1 档只有这一节的加法算式和解决问题', () => {
    for (const [kp, firsts] of Object.entries(SECTIONS)) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 200; seed++) {
        const q = gen(1, createRng(seed))
        const ops = operandsOf(q)
        if (ops) {
          expect(ops).toHaveLength(2)
          expect(firsts).toContain(ops[0])
        } else {
          const t = q.stem.find((p) => p.kind === 'text')
          expect(t?.kind === 'text' && typeof t.text === 'object' && t.text.k.startsWith('q.wp')).toBe(true)
        }
      }
    }
  })

  it('答错讲解：9、8、7、6 加几在格里放第一个加数、拆第二个；5、4、3、2 加几拆小数凑大数（课本 p93：5 + 8 拆 5）', () => {
    expect(tenFrameProps({ kind: 'make-ten', a: 9, b: 4 })).toMatchObject({ filled: 9, extra: 4, swapped: false })
    expect(tenFrameProps({ kind: 'make-ten', a: 8, b: 9 })).toMatchObject({ filled: 8, extra: 9, swapped: false })
    expect(tenFrameProps({ kind: 'make-ten', a: 5, b: 8 })).toMatchObject({ filled: 8, extra: 5, swapped: true })
    expect(tenFrameProps({ kind: 'make-ten', a: 2, b: 9 })).toMatchObject({ filled: 9, extra: 2, swapped: true })
  })

  it('找得数是几的卡片：只有一张对，四张的得数各不相同', () => {
    const gen = getGenerator('s1-05-add-5432')!
    let checked = 0
    for (let seed = 1; seed <= 400; seed++) {
      const q = gen(2, createRng(seed))
      const t = q.stem.find((p) => p.kind === 'text')
      if (!t || t.kind !== 'text' || typeof t.text !== 'object' || t.text.k !== 'q.findSum') continue
      checked++
      const n = Number(t.text.p!.n)
      const sums = q.choices!.map((c) => zh(c.label).split(' + ').map(Number).reduce((a, b) => a + b, 0))
      expect(new Set(sums).size).toBe(4)
      const right = q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!
      expect(zh(right.label).split(' + ').map(Number).reduce((a, b) => a + b, 0)).toBe(n)
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('选择题：四个选项互异、含正确答案、干扰项为正数', () => {
    const gen = getGenerator(KP)!
    let checked = 0
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed)
      const q = gen(1, rng)
      const ops = operandsOf(q)
      if (q.input !== 'choice' || !ops) continue
      checked += 1
      const labels = q.choices!.map((c) => zh(c.label))
      expect(new Set(labels).size).toBe(4)
      const sum = ops.reduce((s, n) => s + n, 0)
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
      const ops = operandsOf(q)!
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
