import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'

// 六上「三 分数除法」：从题目（算式、题干的参数、图）反推答案，150 种子 × 三档；外加课本的规矩——结果是最简分数或整数
// （带分数只在第 3 档的《九章算术》和带分数的倒数里）、选项里没有第二个对的、第 1 档出得到例题和做一做、朗读避开的字不出现。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KPS = ['m6s1-03-reciprocal', 'm6s1-03-frac-int', 'm6s1-03-div-frac', 'm6s1-03-find-whole', 'm6s1-03-as-one'] as const
type Param = LStr | number

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void, seeds = SEEDS, tiers: (1 | 2 | 3)[] = [1, 2, 3]): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of tiers) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.kpId.length + 1)
const kindOf = (q: Question): string => sigOf(q).split('-')[0]!
const texts = (q: Question): { k: string; p: Record<string, Param> }[] =>
  q.stem
    .filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text')
    .map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const lastText = (q: Question): { k: string; p: Record<string, Param> } => texts(q)[texts(q).length - 1]!
const exprs = (q: Question): string[] => q.stem.filter((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr').map((p) => p.expr)
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const answerText = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const str = (v: Param | undefined): string => (typeof v === 'number' ? String(v) : typeof v === 'string' ? v : zh(v!))
const keyOf = (v: Param | undefined): string => (v as { k: string }).k
const area = (q: Question): Extract<StemPart, { kind: 'frac-area' }> | undefined => q.stem.find((p): p is Extract<StemPart, { kind: 'frac-area' }> => p.kind === 'frac-area')
const bars = (q: Question): Extract<StemPart, { kind: 'frac-bars' }> | undefined => q.stem.find((p): p is Extract<StemPart, { kind: 'frac-bars' }> => p.kind === 'frac-bars')
const seg = (q: Question): Extract<StemPart, { kind: 'seg-braces' }> | undefined => q.stem.find((p): p is Extract<StemPart, { kind: 'seg-braces' }> => p.kind === 'seg-braces')

// ── 测试自己的分数算法（不用生成器里的函数）──
interface Fr {
  n: number
  d: number
}
const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b))
const f = (n: number, d = 1): Fr => {
  const k = g(n, d) || 1
  return { n: n / k, d: d / k }
}
const add = (a: Fr, b: Fr): Fr => f(a.n * b.d + b.n * a.d, a.d * b.d)
const sub = (a: Fr, b: Fr): Fr => f(a.n * b.d - b.n * a.d, a.d * b.d)
const mul = (a: Fr, b: Fr): Fr => f(a.n * b.n, a.d * b.d)
const div = (a: Fr, b: Fr): Fr => f(a.n * b.d, a.d * b.n)
const eq = (a: Fr, b: Fr): boolean => a.n * b.d === b.n * a.d
const lt = (a: Fr, b: Fr): boolean => a.n * b.d < b.n * a.d
const ONE = f(1)
/** 数的写法：整数、分数、小数、带分数（整数和分数之间是细空格） */
function num(s: string): Fr {
  const t = s.trim()
  let m = /^(\d+) (\d+)\/(\d+)$/.exec(t)
  if (m) return add(f(Number(m[1])), f(Number(m[2]), Number(m[3])))
  m = /^(\d+)\/(\d+)$/.exec(t)
  if (m) return f(Number(m[1]), Number(m[2]))
  if (/^\d+\.\d+$/.test(t)) {
    const k = t.split('.')[1]!.length
    return f(Math.round(Number(t) * 10 ** k), 10 ** k)
  }
  expect(t, `「${s}」不是数`).toMatch(/^\d+$/)
  return f(Number(t))
}
/** 算式的值（整数、分数、+ − × ÷、小括号，先乘除后加减）；put 把「?」换成给的数 */
function value(src: string, put?: string): Fr {
  const s = put === undefined ? src : src.replace(/\?/g, put)
  const toks = s.match(/\d+\/\d+|\d+|[-−+×÷()]/g) ?? []
  let i = 0
  const atom = (): Fr => {
    const t = toks[i++]!
    if (t === '(') {
      const v = sum()
      i++
      return v
    }
    return num(t)
  }
  const term = (): Fr => {
    let v = atom()
    while (toks[i] === '×' || toks[i] === '÷') {
      const op = toks[i++]
      const r = atom()
      v = op === '×' ? mul(v, r) : div(v, r)
    }
    return v
  }
  const sum = (): Fr => {
    let v = term()
    while (toks[i] === '+' || toks[i] === '-' || toks[i] === '−') {
      const op = toks[i++]
      const r = term()
      v = op === '+' ? add(v, r) : sub(v, r)
    }
    return v
  }
  return sum()
}
const isNum = (s: string): boolean => /^\d+(\/\d+|\.\d+| \d+\/\d+)?$/.test(s)
const ansValue = (q: Question): Fr => num(answerText(q))
/** 答案等于 v；数的选项里只有一个等于 v（干扰项里没有第二个对的） */
function expectAnswer(q: Question, v: Fr): void {
  expect(eq(ansValue(q), v), `${q.id} 的答案 ${answerText(q)} ≠ ${v.n}/${v.d}`).toBe(true)
  if (q.answer.kind === 'choice') {
    const right = labels(q).filter((l) => isNum(l) && eq(num(l), v))
    expect(right.length, `${q.id} 选项里等于答案的有 ${right.length} 个`).toBe(1)
  }
}
/** 算式选项：正确的那个等于 v，别的都不等于 */
function expectExprOptions(q: Question, v: Fr): void {
  const ok = labels(q).filter((l) => eq(value(l), v))
  expect(ok, `${q.id} 算式选项`).toEqual([answerText(q)])
}
/** 「a ○ b」的正确符号 */
function cmpSign(e: string): string {
  const [l, r] = e.split('○') as [string, string]
  const x = value(l)
  const y = value(r)
  return lt(x, y) ? '<' : lt(y, x) ? '>' : '='
}
const judge = (q: Question): boolean => {
  const a = answerText(q)
  expect(['对', '不对'], q.id).toContain(a)
  return a === '对'
}
const inv = (a: Fr): Fr => f(a.d, a.n)

describe('分数除法：结果与选项的写法', () => {
  for (const kp of KPS) {
    it(`${kp}：分数答案是最简分数或整数，数的选项值互不相同；不出带分数（第 3 档两种题除外）`, () => {
      each(kp, (q, d) => {
        if (q.answer.kind === 'number') {
          expect(Number.isInteger(q.answer.value) && q.answer.value >= 0, q.id).toBe(true)
          return
        }
        const ls = labels(q)
        const mixedOk = d === 3 && /^(jiuzhang|mixed)$/.test(kindOf(q))
        for (const l of ls) if (!mixedOk) expect(l, `${q.id} 不出带分数`).not.toMatch(/ /)
        const nums = ls.filter(isNum)
        for (const l of nums) {
          const m = /^(\d+)\/(\d+)$/.exec(l)
          if (m) {
            expect(g(Number(m[1]), Number(m[2])), `${q.id} 的选项 ${l} 不是最简分数`).toBe(1)
            expect(Number(m[2]), `${q.id} 的选项 ${l} 分母是 1`).toBeGreaterThan(1)
          }
        }
        const vs = nums.map(num)
        for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) expect(eq(vs[i]!, vs[j]!), `${q.id} 选项 ${nums[i]} 和 ${nums[j]} 相等`).toBe(false)
      })
    })
  }
})

describe('分数除法：从题目反推答案', () => {
  it('倒数的认识', () => {
    each('m6s1-03-reciprocal', (q) => {
      const kind = kindOf(q)
      const t = lastText(q)
      const e = exprs(q)
      switch (kind) {
        case 'intro': {
          expect(t.k).toBe('m6.fdiv.r.intro')
          const v = value(e[0]!)
          expect(eq(v, ONE), `${q.id} 引入的两个数乘积要是 1`).toBe(true)
          expectAnswer(q, v)
          break
        }
        case 'def':
        case 'prod':
        case 'self':
          expectAnswer(q, ONE)
          break
        case 'frac':
        case 'int':
        case 'dec2':
        case 'mixed':
          expect(t.k).toBe('m6.fdiv.r.of')
          expectAnswer(q, inv(num(str(t.p.x))))
          break
        case 'unit':
        case 'dec':
        case 'one':
          expect(t.k).toBe('m6.fdiv.r.ofJi')
          expectAnswer(q, inv(num(str(t.p.x))))
          break
        case 'back':
          expect(eq(mul(num(str(t.p.n)), num(str(t.p.r))), ONE), q.id).toBe(true)
          expectAnswer(q, num(str(t.p.n)))
          break
        case 'zero':
          expect(answerText(q)).toBe('0 没有倒数')
          break
        case 'pair': {
          const prod = (l: string): Fr => {
            const [a, b] = l.split(' 和 ') as [string, string]
            return mul(num(a), num(b))
          }
          expect(eq(prod(answerText(q)), ONE), q.id).toBe(true)
          for (const l of labels(q)) if (l !== answerText(q)) expect(eq(prod(l), ONE), `${q.id} 的 ${l} 也互为倒数`).toBe(false)
          break
        }
        case 'fill': {
          const x = e[0]!.replace(/\s*=\s*1$/, '')
          expect(eq(value(x, answerText(q)), ONE), q.id).toBe(true)
          expectAnswer(q, ansValue(q))
          break
        }
        case 'how':
          expect(answerText(q)).toBe('把分子、分母交换位置')
          break
        case 'feat':
          expect(answerText(q)).toBe('正好颠倒了位置')
          break
        case 'tf':
          expect(judge(q), q.id).toBe(eq(mul(num(str(t.p.a)), num(str(t.p.b))), ONE))
          break
        case 'tfself': {
          const n = num(str(t.p.n))
          expect(judge(q), q.id).toBe(eq(mul(n, n), ONE))
          break
        }
        case 'tf2': {
          const right: Record<string, boolean> = { 'm6.fdiv.r.tf.proper': true, 'm6.fdiv.r.tf.improper': false, 'm6.fdiv.r.tf.smaller': false, 'm6.fdiv.r.tf.def': true }
          if (t.k === 'm6.fdiv.r.tf.mutual') expect(judge(q), q.id).toBe(eq(mul(num(str(t.p.a)), num(str(t.p.b))), ONE))
          else expect(judge(q), q.id).toBe(right[t.k])
          break
        }
        case 'cmp':
          expect(answerText(q)).toBe(cmpSign(e[0]!))
          // 比的是一个数和它的倒数
          expect(eq(mul(value(e[0]!.split('○')[0]!), value(e[0]!.split('○')[1]!)), ONE), q.id).toBe(true)
          break
        case 'cd':
          expect(e[0]).toBe('3/4 × c = 3/4 ÷ d')
          expect(answerText(q)).toBe('互为倒数')
          break
        case 'jymul':
          expectAnswer(q, num(str(t.p.k)))
          break
        case 'jydiv':
          expectAnswer(q, inv(num(str(t.p.k))))
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('分数除以整数（面积条与题干的数对得上）', () => {
    each('m6s1-03-frac-int', (q) => {
      const kind = kindOf(q)
      const t = lastText(q)
      const e = exprs(q)
      const fig = area(q)
      if (fig) {
        // 面积条：整体横着分 b 条、下面 a 条实线，左边括号写 a/b（和题干里的数对得上）
        const [a, b] = fig.braces![0]!.label.split('/').map(Number) as [number, number]
        expect(fig.braces![0]).toEqual({ side: 'left', from: 0, to: a, label: `${a}/${b}` })
        expect([fig.rows, fig.solid]).toEqual([b, a])
        if (kind === 'units') expect([Number(t.p.k), str(t.p.u)]).toEqual([a, `1/${b}`])
        else expect(str(t.p.a)).toBe(`${a}/${b}`)
        if (fig.shade?.along === 'row') {
          // 例 1 男孩的想法：每份是 (a ÷ n) 个 1/b
          expect(fig.cols).toBe(1)
          expect(fig.shade.cells.length * Number(t.p.n)).toBe(a)
        }
        if (fig.shade?.along === 'col') {
          expect(fig.cols).toBe(Number(t.p.n))
          expect(fig.shade.cells).toEqual([fig.cols - 1])
        }
      }
      switch (kind) {
        case 'plot1':
        case 'plot2':
        case 'ribbon':
        case 'juice':
        case 'sugar':
          expectAnswer(q, div(num(str(t.p.a)), num(str(t.p.n))))
          break
        case 'units':
          expectAnswer(q, f(Number(t.p.k), Number(t.p.n)))
          break
        case 'part':
          expectAnswer(q, f(1, Number(t.p.n)))
          break
        case 'times':
        case 'calc':
        case 'two': {
          const [l, r] = e[0]!.split('=') as [string, string]
          if (r.includes('×')) expect(eq(value(l), value(r, answerText(q))), q.id).toBe(true)
          else expectAnswer(q, value(l))
          if (kind === 'times') expectAnswer(q, ansValue(q))
          break
        }
        case 'rule':
          expect(answerText(q)).toBe('倒数')
          break
        case 'which':
          expectExprOptions(q, div(num(str(t.p.a)), num(str(t.p.n))))
          break
        case 'tf': {
          const [l, r] = e[0]!.split('=') as [string, string]
          expect(judge(q), q.id).toBe(eq(value(l), value(r)))
          break
        }
        case 'same':
          expectExprOptions(q, value(str(t.p.e)))
          break
        case 'direct':
          expect(Number(t.p.a) % Number(t.p.n), `${q.id} 分子要能整除`).toBe(0)
          expectAnswer(q, value(str(t.p.e)))
          break
        case 'candirect': {
          const divisible = (l: string): boolean => {
            const m = /^(\d+)\/\d+ ÷ (\d+)$/.exec(l)!
            return Number(m[1]) % Number(m[2]) === 0
          }
          expect(labels(q).filter(divisible)).toEqual([answerText(q)])
          break
        }
        case 'cmp':
        case 'cmp2':
          expect(answerText(q)).toBe(cmpSign(e[0]!))
          break
        case 'byn':
          expectAnswer(q, f(1, Number(t.p.n)))
          break
        case 'trap':
          expectAnswer(q, div(mul(add(num(str(t.p.a)), num(str(t.p.b))), num(str(t.p.h))), f(2)))
          break
        case 'jiuzhang':
          expect(eq(ansValue(q), div(num(str(t.p.m)), f(7))), q.id).toBe(true)
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('一个数除以分数', () => {
    each('m6s1-03-div-frac', (q) => {
      const kind = kindOf(q)
      const t = lastText(q)
      const e = exprs(q)
      switch (kind) {
        case 'int':
        case 'calc':
        case 'mix':
        case 'chain':
          expectAnswer(q, value(e[0]!))
          if (kind === 'chain') expect(eq(ansValue(q), value(e[0]!.split('÷')[0]!)), `${q.id} 最后的数等于开始的数`).toBe(true)
          break
        case 'step2':
        case 'asmul':
        case 'link':
        case 'split': {
          // 一串「=」：每一段都相等，最后一段的「?」填上答案也相等
          const parts = e[0]!.split('=')
          const first = value(parts[0]!)
          for (const p of parts.slice(1, -1)) expect(eq(value(p), first), `${q.id} 的 ${p}`).toBe(true)
          expect(eq(value(parts[parts.length - 1]!, answerText(q)), first), q.id).toBe(true)
          expectAnswer(q, ansValue(q))
          break
        }
        case 'step1': {
          expect(str(t.p.e)).toMatch(new RegExp(`^${t.p.a} ÷ ${t.p.c}/\\d+$`))
          expectAnswer(q, f(Number(t.p.a), Number(t.p.c)))
          break
        }
        case 'milk':
          expectAnswer(q, div(num(str(t.p.y)), num(str(t.p.f))))
          break
        case 'rule':
          expect(answerText(q)).toBe('倒数')
          break
        case 'cmp':
        case 'cmpmd':
          expect(answerText(q)).toBe(cmpSign(e[0]!))
          break
        case 'inv':
        case 'frommul': {
          const [l, r] = str(t.p.m).split('=') as [string, string]
          expect(eq(value(l), value(r)), `${q.id} 给的乘法算式要对`).toBe(true)
          expectAnswer(q, value(e[0]!))
          break
        }
        case 'tf': {
          const [l, r] = e[0]!.split('=') as [string, string]
          expect(judge(q), q.id).toBe(eq(value(l), value(r)))
          break
        }
        case 'same':
          expectExprOptions(q, value(str(t.p.e)))
          break
        case 'bottle':
          expectAnswer(q, div(num(str(t.p.a)), num(str(t.p.b))))
          break
        case 'film':
          expectAnswer(q, div(t.k.endsWith('half') ? f(1, 2) : f(60), num(str(t.p.t))))
          break
        case 'tfrule':
          expect(judge(q), q.id).toBe(t.k === 'm6.fdiv.df.tf.small')
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('已知一个数的几分之几，求这个数（线段图与题干的数对得上）', () => {
    each('m6s1-03-find-whole', (q) => {
      const kind = kindOf(q)
      const t = lastText(q)
      const fb = bars(q)
      if (fb) {
        const fr = num(str(t.p.f))
        expect(fb.unit).toBe(fr.d)
        expect(fb.rows.map((r) => r.len)).toEqual([fr.d, fr.n])
        expect(fb.rows.map((r) => zh(r.name!))).toEqual(['砂糖', '牛奶'])
      }
      const sb = seg(q)
      switch (kind) {
        case 'milk':
          expectAnswer(q, div(num(str(t.p.y)), num(str(t.p.f))))
          expect(fb!.rows[1]!.braces!.map((b) => b.label)).toEqual([str(t.p.y)])
          break
        case 'egg':
        case 'book':
          expectAnswer(q, div(num(str(t.p[kind === 'egg' ? 'x' : 'y'])), num(str(t.p.f))))
          break
        case 'mpart':
          expect(Number(t.p.b)).toBe(num(str(t.p.f)).d)
          expectAnswer(q, f(Number(t.p.y), num(str(t.p.f)).n))
          break
        case 'epart':
          expect(Number(t.p.d)).toBe(num(str(t.p.f)).d)
          expectAnswer(q, div(num(str(t.p.x)), f(num(str(t.p.f)).n)))
          break
        case 'flip':
          expectAnswer(q, inv(num(str(t.p.f))))
          break
        case 'expr':
          expectExprOptions(q, div(num(str(t.p.y)), num(str(t.p.f))))
          break
        case 'of': {
          const w = num(str(t.p.w))
          const fr = num(str(t.p.f))
          expect(sb!.parts).toBe(fr.d)
          expect(sb!.braces).toContainEqual({ from: 0, to: fr.d, side: 'top', label: str(t.p.w) })
          expect(sb!.braces).toContainEqual({ from: 0, to: fr.n, side: 'bottom', label: '?' })
          expectAnswer(q, mul(w, fr))
          break
        }
        case 'whole': {
          const fr = num(str(t.p.f))
          expect(sb!.braces).toContainEqual({ from: 0, to: fr.n, side: 'top', label: str(t.p.y) })
          expect(sb!.braces).toContainEqual({ from: 0, to: fr.d, side: 'bottom', label: '?' })
          expectAnswer(q, div(num(str(t.p.y)), fr))
          break
        }
        case 'look': {
          // 从线段图反推：整条 parts 段，括住前 k 段的和整条的两个括号，一个写数、一个写「?」
          const whole = sb!.braces.find((b) => b.to === sb!.parts)!
          const part = sb!.braces.find((b) => b.to !== sb!.parts)!
          const k = f(part.to, sb!.parts)
          expectAnswer(q, whole.label === '?' ? div(num(part.label), k) : mul(num(whole.label), k))
          break
        }
        case 'method':
          expect(answerText(q)).toBe(sigOf(q) === 'method-div' ? '除法' : '乘法')
          break
        case 'ship':
          expectAnswer(q, div(f(15), f(5, 61)))
          break
        case 'land':
          expectAnswer(q, div(f(5200), f(52, 55)))
          break
        case 'gears':
          expectAnswer(q, mul(num(str(t.p.big)), num(str(t.p.f))))
          break
        case 'gearb':
          expectAnswer(q, div(num(str(t.p.small)), num(str(t.p.f))))
          break
        case 'turn':
          expectAnswer(q, mul(num(str(t.p.r)), sub(ONE, num(str(t.p.f)))))
          break
        case 'sun': {
          const day = div(f(24), add(ONE, num(str(t.p.f))))
          expect(['m6.fdiv.fw.summer', 'm6.fdiv.fw.winter']).toContain(keyOf(t.p.when))
          expectAnswer(q, t.k === 'm6.fdiv.fw.day.sun' ? day : sub(f(24), day))
          break
        }
        case 'floor': {
          const k = Number(keyOf(t.p.fl).split('.').pop())
          expectAnswer(q, mul(f(Number(t.p.h), Number(t.p.n)), f(k - 1)))
          break
        }
        case 'unit1':
          expect(answerText(q)).toBe('砂糖')
          break
        case 'more':
        case 'less':
          expectAnswer(q, div(num(str(t.p.y)), kind === 'more' ? add(ONE, num(str(t.p.f))) : sub(ONE, num(str(t.p.f)))))
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('把整体看作1', () => {
    each('m6s1-03-as-one', (q) => {
      const kind = kindOf(q)
      const t = lastText(q)
      const p = t.p
      const rate = (): Fr => add(f(1, Number(p.x)), f(1, Number(p.y)))
      switch (kind) {
        case 'road':
          expectAnswer(q, div(ONE, add(num(str(p.p)), num(str(p.q)))))
          break
        case 'rate':
          expectAnswer(q, add(num(str(p.p)), num(str(p.q))))
          break
        case 'assume': {
          const len = num(str(p.L))
          const a = mul(len, num(str(p.p)))
          const b = mul(len, num(str(p.q)))
          const ask = keyOf(p.ask).split('.').pop()
          expectAnswer(q, ask === 'a' ? a : ask === 'b' ? b : ask === 'both' ? add(a, b) : div(len, add(a, b)))
          break
        }
        case 'tflen':
          expect(judge(q), q.id).toBe(sigOf(q) === 'tflen-same')
          break
        case 'expr':
          expectExprOptions(q, div(ONE, add(num(str(p.p)), num(str(p.q)))))
          break
        case 'rateof':
          expectAnswer(q, f(1, Number(p.x)))
          break
        case 'partdo':
          expectAnswer(q, div(num(str(p.p)), rate()))
          break
        case 'alldo':
        case 'truck':
        case 'pen':
        case 'meet':
        case 'exit':
        case 'walk':
          expectAnswer(q, div(ONE, rate()))
          break
        case 'can':
          expect(judge(q), q.id).toBe(!lt(mul(rate(), f(Number(p.n))), ONE))
          break
        case 'left':
          expectAnswer(q, div(f(Number(p.r)), sub(ONE, mul(rate(), f(Number(p.t))))))
          break
        case 'lap':
          expectAnswer(q, div(ONE, sub(f(1, Number(p.x)), f(1, Number(p.y)))))
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })
})

describe('分数除法：第 1 档出得到课本的例题和做一做', () => {
  /** 课本里每一问对应的题（签名），第 1 档 1000 个种子里都要出现 */
  const BOOK: Record<(typeof KPS)[number], string[]> = {
    'm6s1-03-reciprocal': [
      'intro-3/8x8/3', 'intro-7/15x15/7', 'intro-5x1/5', 'intro-1/12x12', 'def',
      'frac-3/5', 'frac-7/2', 'int-6', 'one', 'zero', 'dec-0.2', 'how', 'feat',
      'frac-4/11', 'frac-16/9', 'int-35', 'frac-7/8', 'frac-4/15',
    ],
    'm6s1-03-frac-int': ['plot1-4/5-2', 'units-4/5-2', 'part-4/5-2', 'plot2-4/5-3', 'part-4/5-3', 'times-9/10-3', 'times-3/8-2', 'calc-9/10-3', 'calc-3/8-2', 'ribbon-4/5-8', 'rule'],
    'm6s1-03-div-frac': [
      'int-160-4/5', 'milk-160-4/5', 'step1-160-4/5', 'step2-160-4/5', 'asmul-160-4/5', 'link-160-4-5', 'calc-2/5-2/3', 'split-2/5-2/3', 'rule', 'inv-2/5-2/3',
      'asmul-24-8/9', 'int-24-8/9', 'calc-7/16-4/5', 'calc-8/9-4', 'calc-6/13-4', 'calc-15-10/13', 'calc-3/10-14/45',
      'cmp-6/7-3', 'cmp-15/8-2', 'cmp-9-3/4', 'cmp-6-5/4', 'cmp-1/2-2/3', 'cmp-14/9-7/30', 'cmp-5/7-5/2', 'cmp-4/5-4/5',
      'frommul-3/4-5-q', 'frommul-3/4-5-p', 'frommul-3/7-2/5-q', 'frommul-3/7-2/5-p',
    ],
    'm6s1-03-find-whole': ['milk-160-4/5', 'egg-2/5-2/3', 'mpart-160-4/5', 'epart-2/5-2/3', 'flip-4/5', 'expr-160-4/5', 'of-18-2/3', 'whole-12-2/3', 'method-div', 'method-mul', 'look-part-24-3/4', 'look-whole-24-3/4', 'book-35-5/7', 'ship', 'land', 'gears-140-1/5', 'gearb-28-1/5'],
    'm6s1-03-as-one': ['road-12-18', 'rate-12-18', 'assume-12-18-36-a', 'assume-12-18-36-b', 'assume-12-18-36-both', 'assume-12-18-36-days', 'tflen-diff', 'tflen-same', 'expr-12-18', 'rateof-3', 'partdo-3-6-3/4', 'alldo-3-6', 'meet-2-3', 'can-12-10-6', 'truck-6-3', 'pen-6-12', 'exit-6-4'],
  }
  for (const kp of KPS) {
    it(`${kp}`, () => {
      const seen = new Set<string>()
      each(kp, (q) => seen.add(sigOf(q)), 1000, [1])
      expect(BOOK[kp].filter((s) => !seen.has(s)), `${kp} 第 1 档没出过的课本题`).toEqual([])
    })
  }
  it('课本的答案：例 3 合修 7.2 天，做一做 3/2 小时，练习八 1 6/5 小时，练习九 6 12/5 分钟', () => {
    const found: Record<string, string> = {}
    each('m6s1-03-as-one', (q) => {
      if (['road-12-18', 'partdo-3-6-3/4', 'meet-2-3', 'exit-6-4', 'assume-12-18-36-days'].includes(sigOf(q))) found[sigOf(q)] = answerText(q)
    }, 1000, [1])
    expect(found).toEqual({ 'road-12-18': '7.2', 'assume-12-18-36-days': '7.2', 'partdo-3-6-3/4': '3/2', 'meet-2-3': '6/5', 'exit-6-4': '12/5' })
  })
})

describe('分数除法：带图的题用选项卡（排版普查：图 + 数字键盘手机一屏放不下）', () => {
  for (const kp of KPS) {
    it(`${kp}`, () => {
      each(kp, (q) => {
        if (q.stem.some((p) => p.kind === 'frac-area' || p.kind === 'frac-bars' || p.kind === 'seg-braces')) expect(q.input, q.id).toBe('choice')
      })
    })
  }
})

describe('分数除法：题目文字的朗读避坑', () => {
  for (const kp of KPS) {
    it(`${kp}：不出现长（长方形、长度除外）、种、幢、还、得、背、重、只、朝、载、相向、方程、阿拉伯数字的序数`, () => {
      each(kp, (q) => {
        const words = [...q.stem.filter((p) => p.kind === 'text').map((p) => zh((p as { text: LStr }).text)), ...labels(q)]
        for (const w of words) {
          expect(w.replace(/长方形|长度/g, ''), `${q.id}：${w}`).not.toMatch(/[长种幢还得背重只朝载]|相向|方程/)
          expect(w, `${q.id}：${w}`).not.toMatch(/第\s*\d/)
        }
      })
    })
  }
})
