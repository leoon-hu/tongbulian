import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { DEC_BOOK, FRAC_BOOK, ROUND_BOOK, SIX } from '../fracdec'

// 五下「分数和小数的互化」：从题目反推答案（150 种子 × 三档）；选项的规矩——小数的值互不相同；分数选项除了「化成最简分数」
// 这类考写法的题（可以有一个没约分的等值分数），别的都写成最简、值互不相同；第 1 档出得到例 1、例 2 和做一做。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KP = 'm5s2-05-decimal'
type Param = LStr | number

function each(fn: (q: Question, d: 1 | 2 | 3) => void, seeds = SEEDS): void {
  const gen = getGenerator(KP)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const texts = (q: Question): { k: string; p: Record<string, Param> }[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const exprs = (q: Question): string[] => q.stem.filter((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr').map((p) => p.expr)
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const answerText = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))

// ── 测试自己的算法：数一律化成分数（分子、分母都是整数）──
interface F {
  n: number
  d: number
}
const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b))
const f = (n: number, d = 1): F => {
  const k = g(n, d) || 1
  return { n: n / k, d: d / k }
}
const eq = (a: F, b: F): boolean => a.n * b.d === b.n * a.d
const lt = (a: F, b: F): boolean => a.n * b.d < b.n * a.d
/** 小数、分数、带分数（「2 4/7」中间是细空格）都化成分数 */
function val(s: string): F {
  const mx = /^(\d+) (\d+)\/(\d+)$/.exec(s)
  if (mx) return f(Number(mx[1]) * Number(mx[3]) + Number(mx[2]), Number(mx[3]))
  const fr = /^(\d+)\/(\d+)$/.exec(s)
  if (fr) return f(Number(fr[1]), Number(fr[2]))
  const [i = '0', p = ''] = s.split('.')
  return f(Number(i + p), 10 ** p.length)
}
/** 分数保留两位小数（四舍五入）的值（百分之几） */
const round2 = (x: F): number => Math.floor((x.n * 1000) / x.d / 10) + (Math.floor((x.n * 1000) / x.d) % 10 >= 5 ? 1 : 0)
const isFrac = (s: string): boolean => /^\d+\/\d+$/.test(s)
const isDec = (s: string): boolean => /^\d+(\.\d+)?$/.test(s)

describe('分数和小数的互化：选项', () => {
  it('小数选项的值互不相同；分数选项除了考写法的题都是最简、值互不相同；没有和带分数等值的假分数', () => {
    each((q) => {
      if (q.answer.kind === 'number') return
      const ls = labels(q)
      const nums = ls.filter((l) => isFrac(l) || isDec(l) || / /.test(l))
      if (nums.length !== ls.length) return
      const writing = /最简分数/.test(zh(q.stem.filter((p) => p.kind === 'text').map((p) => (p as { text: LStr }).text)[texts(q).length - 1] ?? ''))
      const vs = nums.map(val)
      for (let i = 0; i < vs.length; i++)
        for (let j = i + 1; j < vs.length; j++) {
          if (!eq(vs[i]!, vs[j]!)) continue
          // 只有考写法的题可以有等值的：一个是答案（最简），一个是没约分的
          expect(writing, `${q.id} 选项 ${nums[i]} 和 ${nums[j]} 相等`).toBe(true)
          const pair = [nums[i]!, nums[j]!]
          expect(pair, q.id).toContain(answerText(q))
        }
      if (!writing) for (const l of nums.filter(isFrac)) expect(g(...(l.split('/').map(Number) as [number, number])), `${q.id} ${l} 不是最简分数`).toBe(1)
      // 考写法的题：答案是最简分数
      const a = answerText(q)
      if (isFrac(a)) expect(g(...(a.split('/').map(Number) as [number, number])), `${q.id} 答案 ${a} 不是最简分数`).toBe(1)
    })
  })
})

describe('分数和小数的互化：从题目反推答案', () => {
  it('每种题', () => {
    each((q) => {
      const kind = kindOf(q)
      const ts = texts(q)
      const t0 = ts[0]!
      const e = exprs(q)
      const ans = answerText(q)
      if (kind === 'rope') {
        // 把 l 米的绳子平均分成 n 段，每段 l ÷ n 米
        const want = f(Number(t0.p.l), Number(t0.p.n))
        expect(eq(val(ans), want), q.id).toBe(true)
        expect(isDec(ans) ? 'dec' : 'frac', q.id).toBe(q.id.includes('rope-dec') ? 'dec' : 'frac')
      } else if (kind === 'tofrac') {
        const x = String(t0.p.x)
        expect(eq(val(ans), val(x)), q.id).toBe(true)
        expect(isFrac(ans) || /^\d+$/.test(ans), q.id).toBe(true)
      } else if (kind === 'den') {
        // 化成分子是 n 的分数：分母 = n ÷ 小数
        const x = val(String(t0.p.x))
        expect(eq(f(Number(t0.p.n), Number(ans)), x), q.id).toBe(true)
      } else if (kind === 'num') {
        const x = val(String(t0.p.x))
        expect(eq(f(Number(ans), Number(t0.p.d)), x), q.id).toBe(true)
      } else if (kind === 'todec') {
        const src = e[0]!.replace(' = ?', '')
        expect(eq(val(ans), val(src)), q.id).toBe(true)
      } else if (kind === 'round') {
        const src = e[0]!.replace(' ≈ ?', '')
        expect(ans, q.id).toMatch(/^\d+\.\d\d$/)
        expect(Math.round(Number(ans) * 100), q.id).toBe(round2(val(src)))
        // 真的除不尽
        expect((val(src).n * 1000) % val(src).d, q.id).not.toBe(0)
      } else if (kind === 'max' || kind === 'min') {
        const set = e[0]!.split('、')
        for (const l of labels(q)) expect(set, q.id).toContain(l)
        const sorted = [...set].sort((x, y) => (lt(val(x), val(y)) ? -1 : 1))
        expect(ans, q.id).toBe(kind === 'max' ? sorted[sorted.length - 1] : sorted[0])
      } else if (kind === 'cmp') {
        const [x, y] = e[0]!.split(' ○ ') as [string, string]
        expect(ans, q.id).toBe(eq(val(x), val(y)) ? '=' : lt(val(x), val(y)) ? '<' : '>')
      } else if (kind === 'pic') {
        const pic = q.stem.find((p): p is Extract<StemPart, { kind: 'frac-shape' }> => p.kind === 'frac-shape')!.items[0]!
        expect(eq(val(ans), f(pic.shaded.length, pic.parts)), q.id).toBe(true)
      } else if (kind === 'unit') {
        const x = String(t0.p.x)
        const places = (x.split('.')[1] ?? '').length
        expect(ans, q.id).toBe(['十分之一', '百分之一', '千分之一'][places - 1])
        expect(Number(t0.p.n), q.id).toBe(Number(x.split('.')[1]))
      } else if (kind === 'match') {
        expect(eq(val(ans), val(String(t0.p.x))), q.id).toBe(true)
        expect(labels(q).filter((l) => eq(val(l), val(String(t0.p.x)))), q.id).toEqual([ans])
      } else if (kind === 'speed') {
        expect(eq(val(ans), q.id.endsWith('times') ? f(31, 20) : f(20, 31)), q.id).toBe(true)
      } else if (kind === 'conv') {
        const rate: Record<string, number> = { 'm5.fdec.u.cm|m5.fdec.u.m': 100, 'm5.fdec.u.g|m5.fdec.u.kg': 1000, 'm5.fdec.u.ml|m5.fdec.u.l': 1000, 'm5.fdec.u.cm2|m5.fdec.u.dm2': 100, 'm5.fdec.u.dm3|m5.fdec.u.m3': 1000 }
        const r = rate[`${(t0.p.from as { k: string }).k}|${(t0.p.to as { k: string }).k}`]!
        expect(eq(val(ans), f(Number(t0.p.a), r)), q.id).toBe(true)
        expect(isDec(ans) && !isFrac(ans) ? 'dec' : 'frac', q.id).toBe(ts[1]!.k === 'm5.fdec.useDec' ? 'dec' : 'frac')
      } else if (kind === 'typing') {
        expect(ans, q.id).toBe(lt(val(String(t0.p.b)), val(String(t0.p.a))) ? '李阿姨' : '王叔叔')
      } else if (kind === 'walk') {
        // 1/4 小时 = 15 分钟 < 25 分钟：小林家远
        expect(ans, q.id).toBe(q.id.endsWith('min') ? '15' : '小林家')
      } else if (kind === 'finite') {
        const fr = val(String(t0.p.f))
        let den = fr.d
        for (const p of [2, 5]) while (den % p === 0) den /= p
        expect(ans, q.id).toBe(den === 1 ? '对' : '不对')
      } else throw new Error(`没有核对的题型：${q.id}`)
    })
  })

  it('第 1 档：例 1（绳子、小数化分数、分母分子是几）、例 2（化成小数、保留两位小数）、做一做（最大最小、比一比）都出得到，课本的数都在', () => {
    const gen = getGenerator(KP)!
    const qs: Question[] = []
    for (let seed = 1; seed <= 600; seed++) qs.push(gen(1, createRng(seed)))
    const kinds = new Set(qs.map(kindOf))
    for (const k of ['rope', 'tofrac', 'den', 'num', 'todec', 'round', 'max', 'min', 'cmp']) expect(kinds.has(k), k).toBe(true)
    expect(qs.some((q) => q.id.endsWith('rope-dec-3-10')) && qs.some((q) => q.id.endsWith('rope-frac-3-5'))).toBe(true)
    for (const x of DEC_BOOK) expect(qs.some((q) => q.id.endsWith(`tofrac-${x}`)), x).toBe(true)
    for (const x of FRAC_BOOK) expect(qs.some((q) => q.id.endsWith(`todec-${x}`)), x).toBe(true)
    for (const x of ROUND_BOOK) expect(qs.some((q) => q.id.endsWith(`round-${x}`)), x).toBe(true)
    // 做一做的数（13/47 只在第 3 档比）
    for (const x of SIX.slice(0, 5)) expect(qs.some((q) => kindOf(q) === 'max' && exprs(q)[0]!.split('、').includes(x)), x).toBe(true)
  })
})
