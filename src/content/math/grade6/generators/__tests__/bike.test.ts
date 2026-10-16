import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { answerSpeech, questionSpeech } from '@/engine/speech'
import { ZH } from '../../lang/bike'

// 六下「☆ 自行车里的数学」：从题干反推答案（150 种子 × 三档，自己另算一遍）；第 1 档出得到活动 1、蹬几圈、活动 2 的每一问；朗读不踩坑。

const zh = (l: LStr): string => translate(l, 'zh')
const KP = 'm6s2-06-bike'
const R = '∶'
function each(fn: (q: Question, d: 1 | 2 | 3) => void, seeds = 150): void {
  const gen = getGenerator(KP)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sig = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
type Param = LStr | number
const params = (q: Question): Record<string, Param> => {
  const ts = q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text')
  const t = [...ts].reverse().find((x) => typeof x.text !== 'string' && x.text.p)
  return (t && typeof t.text !== 'string' ? t.text.p : {}) as Record<string, Param>
}
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const answerText = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const n = (p: Param | undefined): number => Number(typeof p === 'number' ? p : zh(p!))
/** 数的答案和应得的值差不到万分之一 */
const near = (q: Question, want: number): void => expect(Math.abs(Number(answerText(q)) - want), `${q.id} 答案 ${answerText(q)}，应是 ${want}`).toBeLessThan(1e-9)
const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b))

describe('自行车里的数学（反推答案）', () => {
  it('每种题', () => {
    each((q) => {
      const k = sig(q)
      const p = params(q)
      if (k === 'principle') expect(answerText(q)).toBe('后轮')
      else if (k === 'one') near(q, 1)
      else if (k.startsWith('judge-')) expect(answerText(q), q.id).toBe(k === 'judge-more' ? '不对' : '对')
      else if (k.startsWith('rear-')) near(q, n(p.f) / n(p.r))
      else if (k.startsWith('dist-')) near(q, n(p.n) * n(p.c))
      else if (k.startsWith('dia-')) near(q, Math.round(3.14 * n(p.d) * n(p.n) * 1e6) / 1e6)
      else if (k.startsWith('turns-')) near(q, (n(p.f) * n(p.n)) / n(p.r))
      else if (k.startsWith('ratio-')) {
        const [a, b] = answerText(q).split(R).map(Number)
        expect(a! * n(p.r), q.id).toBe(b! * n(p.f))
        expect(g(a!, b!), `${q.id} 齿数比没化成最简`).toBe(1)
        for (const l of labels(q)) {
          if (l === answerText(q)) continue
          const [c, d] = l.split(R).map(Number)
          expect(c! * n(p.r) === d! * n(p.f), `${q.id} ${l} 也对`).toBe(false)
        }
      } else if (k === 'combos') {
        const t = q.stem.find((x) => x.kind === 'stat-table') as Extract<StemPart, { kind: 'stat-table' }>
        const count = (row: (number | LStr | null)[]): number => row.slice(1).filter((c) => typeof c === 'number').length
        near(q, count(t.rows[0]!) * count(t.rows[1]!))
      } else if (k === 'far') {
        const t = q.stem.find((x) => x.kind === 'stat-table') as Extract<StemPart, { kind: 'stat-table' }>
        const fronts = t.rows[0]!.slice(1).filter((c): c is number => typeof c === 'number')
        const rears = t.rows[1]!.slice(1).filter((c): c is number => typeof c === 'number')
        expect(answerText(q), q.id).toBe(`前 ${Math.max(...fronts)}，后 ${Math.min(...rears)}`)
      } else if (k.startsWith('same-')) expect(answerText(q), q.id).toBe(n(p.a) * n(p.d) === n(p.b) * n(p.c) ? '对' : '不对')
      else if (k === 'unrelated') expect(answerText(q)).toBe('骑车人的身高')
      else if (k === 'inverse') expect(answerText(q)).toBe('成反比例')
      else if (k.startsWith('ndist-')) near(q, Math.round(((n(p.f) * n(p.n)) / n(p.r)) * 3.14 * n(p.d) * 1e6) / 1e6)
      else if (k.startsWith('compare-')) {
        const x = n(p.a) / n(p.b)
        const y = n(p.c) / n(p.d)
        expect(answerText(q), q.id).toBe(x === y ? '一样远' : x > y ? '前一辆' : '后一辆')
      } else if (k.startsWith('back-')) near(q, n(p.f) / n(p.n))
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
  it('小数选项的值互不相同；选项里没有分数（答案都是整数或小数）', () => {
    each((q) => {
      const ls = labels(q)
      expect(ls.filter((l) => /\d\/\d/.test(l)), q.id).toEqual([])
      if (!ls.length || !ls.every((l) => /^\d+(\.\d+)?$/.test(l))) return
      expect(new Set(ls.map(Number)).size, q.id).toBe(ls.length)
    })
  })
})

describe('自行车里的数学：第 1 档出得到课本的每一问', () => {
  it('活动 1、蹬几圈、活动 2', () => {
    const t = new Set<string>()
    each((q, d) => {
      if (d === 1) t.add(sig(q))
    }, 400)
    for (const x of ['principle', 'one', 'judge-teeth', 'judge-wheel', 'judge-fewer', 'rear-48-24', 'dist-3-2', 'dia-0.7-2', 'turns-40-20-5', 'ratio-48-24', 'ratio-48-28', 'combos', 'far', 'same-48-24-40-20', 'unrelated', 'inverse'])
      expect([...t].some((s) => s.startsWith(x)), x).toBe(true)
  })
})

describe('自行车里的数学：朗读与写法', () => {
  it('「转」只写「转动」；不写重、长、括号、英文问号', () => {
    for (const [k, v] of Object.entries(ZH)) {
      const s = String(v)
      expect(s.replace(/转动/g, ''), k).not.toMatch(/转/)
      expect(s, k).not.toMatch(/重|长|[（(]|\?/)
    }
  })
  it('朗读读得出题干和答案；比号是「∶」', () => {
    each((q) => {
      expect(questionSpeech(q, 'zh').length, q.id).toBeGreaterThan(0)
      expect(answerSpeech(q, 'zh').join(''), q.id).not.toMatch(/∶|:/)
    }, 30)
  })
})
