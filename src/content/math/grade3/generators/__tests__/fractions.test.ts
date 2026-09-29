import { describe, expect, it } from 'vitest'
import type { FracPic, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { questionSpeech, answerSpeech } from '@/engine/speech'
import { fracGeometry, isEvenShape } from '@/components/math/fracGeometry'
import { fracWrongs } from '../fractions'

// 三上「分数的初步认识」四个知识点的专项检查：从题目本身（图、算式、词条参数）反推答案，干扰项都是错的、彼此不相等，
// 范围与分档照课本笔记，和是 1 的写「1」且不和 n/n 同时出现，朗读把分数读成「几分之几」。
const SEEDS = 150
const zh = (l: LStr): string => translate(l, 'zh')
type F = [number, number]
const val = (f: F): number => f[0] / f[1]
const same = (a: F, b: F): boolean => a[0] * b[1] === b[0] * a[1]

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const texts = (q: Question): { k: string; p: Record<string, unknown> }[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text' && typeof p.text === 'object').map((p) => p.text as { k: string; p: Record<string, unknown> })
const keyOf = (q: Question): string => texts(q)[0]?.k ?? ''
const paramsOf = (q: Question): Record<string, unknown> => texts(q)[0]?.p ?? {}
const pics = (q: Question): FracPic[] => q.stem.flatMap((p) => (p.kind === 'frac-shape' ? p.items : []))
const exprOf = (q: Question): string | undefined => q.stem.find((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr')?.expr
const part = <K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === kind)
/** 选项文字里的分数（「3/10 分米」→ [3, 10]，「1」→ [1, 1]）；不是分数返回 null */
function fracOf(label: string): F | null {
  const m = /^(\d+)\/(\d+)/.exec(label)
  if (m) return [Number(m[1]), Number(m[2])]
  return /^\d+$/.test(label) ? [Number(label), 1] : null
}
const parseF = (s: unknown): F => fracOf(String(s))!
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const correctLabel = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))

/** 反推出来的答案：分数（[n, d]）或整数，或选项的词条键 */
type Expect = { frac: F } | { num: number } | { key: string } | { sym: string }
function check(q: Question, e: Expect): void {
  const c = correctLabel(q)
  if ('frac' in e) {
    const f = fracOf(c)
    expect(f, `${q.id} 正确答案「${c}」不是分数`).not.toBeNull()
    // 写法也要一样（不约分）：结果是 1 时写「1」
    if (e.frac[0] === e.frac[1]) expect(c, q.id).toBe('1')
    else expect(f, q.id).toEqual(e.frac)
  } else if ('num' in e) expect(Number(c), q.id).toBe(e.num)
  else if ('key' in e) expect(c, q.id).toBe(zh({ k: e.key }))
  else expect(c, q.id).toBe(e.sym)
}

/** 分数选项题的通用约束：选项互不相等（按值）、干扰项都是错的 */
function fracChoicesOk(q: Question): void {
  const fs = labels(q).map(fracOf)
  if (fs.some((f) => f === null)) return
  const list = fs as F[]
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(same(list[i]!, list[j]!), `${q.id} 选项 ${labels(q)} 有两个相等`).toBe(false)
  // 和是 1 的写「1」：选项里不同时出现 n/n
  if (labels(q).includes('1')) expect(labels(q).some((l) => /^(\d+)\/\1(\D|$)/.test(l)), `${q.id} 1 和 n/n 同时出现`).toBe(false)
}

/** 解析「a/n + b/n = ?」「1 - a/n = ?」「x ○ y」 */
function evalExpr(expr: string): F | string {
  const cmp = /^(\S+) ○ (\S+)$/.exec(expr)
  if (cmp) {
    const [a, b] = [parseF(cmp[1]), parseF(cmp[2])]
    return val(a) > val(b) ? '>' : val(a) < val(b) ? '<' : '='
  }
  const m = /^(\S+) ([+-]) (\S+) = \?$/.exec(expr)!
  const [a, b] = [parseF(m[1]), parseF(m[3])]
  const den = a[1] === 1 ? b[1] : a[1]
  const na = a[1] === 1 ? a[0] * den : a[0]
  expect(a[1] === 1 || b[1] === a[1], `${expr} 不是同分母`).toBe(true)
  return [m[2] === '+' ? na + b[0] : na - b[0], den]
}

describe('分数：选项与干扰项的工具', () => {
  it('fracWrongs 去掉不合法的、和正确答案相等的、彼此相等的', () => {
    expect(fracWrongs([1, 2], [[2, 4], [1, 1], [0, 3], [1, 3], [2, 6], [3, 4]])).toEqual(['1/3', '3/4'])
    expect(fracWrongs([1, 1], [[4, 4], [4, 8], [3, 4]])).toEqual(['4/8', '3/4'])
  })
})

describe('m3s1-08-unit-frac 几分之一', () => {
  it('从图 / 题目反推答案；分档与范围', () => {
    each('m3s1-08-unit-frac', (q, d) => {
      const k = keyOf(q)
      fracChoicesOk(q)
      const pic = pics(q)[0]
      if (k === 'm3.frac.shadedUnit') {
        expect(pic!.shaded).toHaveLength(1)
        expect(isEvenShape(pic!.shape)).toBe(true)
        check(q, { frac: [1, pic!.parts] })
        if (d === 1) expect(pic!.parts).toBeGreaterThanOrEqual(2)
        if (d === 1) expect(pic!.parts).toBeLessThanOrEqual(6)
        // 选项全是几分之一（孩子不能靠「分子是 1」认出答案）
        for (const l of labels(q)) expect(fracOf(l)![0], q.id).toBe(1)
      } else if (k === 'm3.frac.mooncake' || k === 'm3.frac.paper') {
        check(q, { frac: [1, Number(paramsOf(q).n)] })
        expect(pic!.parts).toBe(Number(paramsOf(q).n))
      } else if (k === 'm3.frac.segmentUnit') {
        const line = part(q, 'frac-line')!
        expect(line.labels).toBe(false)
        check(q, { frac: [line.bracket![1] - line.bracket![0], line.per] })
      } else if (k === 'm3.frac.writeAs') {
        const r = paramsOf(q).r as { p: { d: { k: string }; n: { k: string } } }
        const n = Number(r.p.n.k.split('.').pop())
        const dd = Number(r.p.d.k.split('.').pop())
        check(q, { frac: [n, dd] })
        // 写反的那个一定在选项里
        expect(labels(q), q.id).toContain(`${dd}/${n}`)
      } else if (k === 'm3.frac.denOf' || k === 'm3.frac.numOf') {
        const f = parseF(paramsOf(q).f)
        check(q, { num: k === 'm3.frac.denOf' ? f[1] : f[0] })
      } else if (k === 'm3.frac.canUse') {
        const f = parseF(paramsOf(q).f)
        expect(f).toEqual([1, pic!.parts])
        const areas = fracGeometry(pic!).pieces.map((x) => x.area)
        const even = areas.every((a) => Math.abs(a - areas[0]!) < 1e-6)
        expect(even, q.id).toBe(isEvenShape(pic!.shape))
        check(q, { key: even ? 'm3.frac.can' : 'm3.frac.cannot' })
        expect(d).toBeGreaterThanOrEqual(2)
      } else if (k === 'm3.frac.compare') {
        check(q, { sym: evalExpr(exprOf(q)!) as string })
        expect(labels(q).sort()).toEqual(['<', '=', '>'])
        const [a, b] = exprOf(q)!.split(' ○ ').map(parseF)
        expect(a![0] === 1 && b![0] === 1, q.id).toBe(true)
        for (const p of pics(q)) expect(p.label, q.id).toBe(`1/${p.parts}`)
      } else if (k === 'm3.frac.maxOf' || k === 'm3.frac.minOf') {
        const fs = labels(q).map((l) => parseF(l))
        const target = k === 'm3.frac.maxOf' ? Math.max(...fs.map(val)) : Math.min(...fs.map(val))
        expect(val(parseF(correctLabel(q)))).toBe(target)
        expect(d).toBe(3)
      } else if (k === 'm3.frac.unitsInOne') {
        check(q, { num: parseF(paramsOf(q).u)[1] })
      } else if (k === 'm3.frac.board') {
        const piece = pic!.shaded[0]!
        const g = fracGeometry(pic!)
        const total = g.pieces.reduce((s, x) => s + x.area, 0)
        const share = g.pieces[piece]!.area / total
        check(q, { frac: [1, Math.round(1 / share)] })
      } else throw new Error(`没核对的题：${q.id}（${k}）`)
    })
  })
})

describe('m3s1-08-frac 几分之几', () => {
  it('从图 / 题目反推答案；分档与范围', () => {
    each('m3s1-08-frac', (q, d) => {
      const k = keyOf(q)
      fracChoicesOk(q)
      const pic = pics(q)[0]
      if (k === 'm3.frac.shaded' || k === 'm3.frac.unshaded') {
        const m = k === 'm3.frac.shaded' ? pic!.shaded.length : pic!.parts - pic!.shaded.length
        expect(isEvenShape(pic!.shape)).toBe(true)
        check(q, { frac: [m, pic!.parts] })
        expect(pic!.shaded.length).toBeGreaterThanOrEqual(1)
        expect(pic!.shaded.length).toBeLessThan(pic!.parts)
        if (d === 1) {
          expect(pic!.parts, q.id).toBeGreaterThanOrEqual(3)
          expect(pic!.parts, q.id).toBeLessThanOrEqual(8)
        }
        // 干扰项里至少有一个同分母或同分子的（不能一眼认出答案）
        const c = parseF(correctLabel(q))
        const others = labels(q).filter((l) => l !== correctLabel(q)).map((l) => parseF(l))
        expect(others.some((o) => o[1] === c[1] || o[0] === c[0]), q.id).toBe(true)
      } else if (k === 'm3.frac.kUnits') {
        const u = parseF(paramsOf(q).u)
        expect(u[0]).toBe(1)
        check(q, { frac: [Number(paramsOf(q).k), u[1]] })
      } else if (k === 'm3.frac.hasUnits') {
        const f = parseF(paramsOf(q).f)
        const u = parseF(paramsOf(q).u)
        expect(u).toEqual([1, f[1]])
        check(q, { num: f[0] })
      } else if (k === 'm3.frac.picUnits') {
        expect(parseF(paramsOf(q).u)).toEqual([1, pic!.parts])
        check(q, { num: pic!.shaded.length })
      } else if (k === 'm3.frac.compare') {
        check(q, { sym: evalExpr(exprOf(q)!) as string })
        expect(q.type).toBe('compare')
        const [a, b] = exprOf(q)!.split(' ○ ').map(parseF)
        expect(b![1] === 1 || a![1] === b![1], `${q.id} 不是同分母`).toBe(true)
        if (d < 3) expect(a![1], q.id).toBeLessThanOrEqual(10)
        // 配的图和算式对得上
        const ps = pics(q)
        if (ps.length) {
          expect(ps.map((p) => `${p.shaded.length}/${p.parts}`)).toEqual([exprOf(q)!.split(' ○ ')[0], exprOf(q)!.split(' ○ ')[1]])
          for (const p of ps) expect(p.label).toBe(`${p.shaded.length}/${p.parts}`)
        }
      } else if (k === 'm3.frac.rulerDm') {
        const line = part(q, 'frac-line')!
        expect(line.ruler).toBe(true)
        expect([line.units, line.per]).toEqual([1, 10])
        check(q, { frac: [line.bracket![1] - line.bracket![0], 10] })
        for (const l of labels(q)) expect(l, q.id).toMatch(/^\d+\/\d+ 分米$/)
      } else if (k === 'm3.frac.arrowM') {
        const line = part(q, 'frac-line')!
        check(q, { frac: [line.arrow!, 10] })
        for (const l of labels(q)) expect(l, q.id).toMatch(/^\d+\/\d+ 米$/)
      } else if (k === 'm3.frac.maxOf' || k === 'm3.frac.minOf') {
        const fs = labels(q).map((l) => parseF(l))
        expect(new Set(fs.map((f) => f[1])).size, `${q.id} 要同分母`).toBe(1)
        const target = k === 'm3.frac.maxOf' ? Math.max(...fs.map(val)) : Math.min(...fs.map(val))
        expect(val(parseF(correctLabel(q)))).toBe(target)
      } else if (k === 'm3.frac.cake') {
        const p = paramsOf(q) as { a: number; b: number; c: number; ask: { k: string; p?: { who: { k: string } } } }
        const ate: Record<string, number> = { ming: p.a, mom: p.b, dad: p.c }
        const left = 10 - p.a - p.b - p.c
        expect(left).toBeGreaterThan(0)
        if (p.ask.k === 'm3.frac.cakeLeft') check(q, { num: left })
        else if (p.ask.k === 'm3.frac.cakeLeftFrac') check(q, { frac: [left, 10] })
        else if (p.ask.k === 'm3.frac.cakeAte') check(q, { frac: [ate[p.ask.p!.who.k.split('.').pop()!]!, 10] })
        else {
          const most = Object.entries(ate).sort((x, y) => y[1] - x[1])[0]![0]
          check(q, { key: `m3.frac.who.${most}` })
        }
        expect(d).toBe(3)
      } else throw new Error(`没核对的题：${q.id}（${k}）`)
    })
  })
})

describe('m3s1-08-frac-calc 分数的简单计算', () => {
  it('从算式 / 应用题反推答案；分档与范围', () => {
    each('m3s1-08-frac-calc', (q, d) => {
      const k = keyOf(q)
      fracChoicesOk(q)
      const expr = exprOf(q)
      if (expr) {
        const r = evalExpr(expr) as F
        check(q, { frac: r })
        expect(r[0], q.id).toBeGreaterThan(0)
        expect(r[0], `${q.id} 和不能超过 1`).toBeLessThanOrEqual(r[1])
        const m = /^(\d+)\/(\d+) \+ (\d+)\/(\d+)/.exec(expr)
        if (d === 1) {
          // 第 1 档：同分母加法，n 取 3–9，和小于 1
          expect(m, q.id).not.toBeNull()
          expect(Number(m![2])).toBeGreaterThanOrEqual(3)
          expect(Number(m![2])).toBeLessThanOrEqual(9)
          expect(r[0]).toBeLessThan(r[1])
        }
        // 配的图：a 份一种颜色、b 份另一种颜色
        const pic = pics(q)[0]
        if (pic && m) {
          expect(pic.parts).toBe(Number(m[2]))
          expect(pic.shaded).toHaveLength(Number(m[1]))
          expect(pic.alt).toHaveLength(Number(m[3]))
        }
        // 分母也相加的错法在加法题的选项里（和不是 1 时）
        if (m && r[0] !== r[1] && d === 1) expect(labels(q), q.id).toContain(`${r[0]}/${r[1] * 2}`)
        return
      }
      const p = paramsOf(q)
      if (k === 'm3.frac.addUnits' || k === 'm3.frac.subUnits') {
        check(q, { num: k === 'm3.frac.addUnits' ? Number(p.a) + Number(p.b) : Number(p.a) - Number(p.b) })
        return
      }
      if (k === 'm3.frac.oneAs') return check(q, { num: parseF(p.u)[1] })
      expect(d, `${q.id} 应用题只在第 3 档`).toBe(3)
      const a = p.a === undefined ? null : parseF(p.a)
      const b = p.b === undefined ? null : parseF(p.b)
      const one = (...fs: F[]): F => [fs[0]![1] - fs.reduce((s, f) => s + f[0], 0), fs[0]![1]]
      if (k === 'm3.frac.melonSum' || k === 'm3.frac.chocoSum') check(q, { frac: [a![0] + b![0], a![1]] })
      else if (k === 'm3.frac.melonDiff') check(q, { frac: [b![0] - a![0], a![1]] })
      else if (k === 'm3.frac.chocoLeft' || k === 'm3.frac.garden' || k === 'm3.frac.trip') check(q, { frac: one(a!, b!) })
      else if (k === 'm3.frac.boats' || k === 'm3.frac.ropeLeft' || k === 'm3.frac.paperLeft') check(q, { frac: one(a!) })
      else if (k === 'm3.frac.juiceKids') check(q, { frac: [Number(p.c), Number(p.n)] })
      else if (k === 'm3.frac.juiceDiff') check(q, { frac: [Number(p.c) - Number(p.o), Number(p.n)] })
      else throw new Error(`没核对的题：${q.id}（${k}）`)
      if (k === 'm3.frac.juiceKids' || k === 'm3.frac.juiceDiff') expect(Number(p.c) + Number(p.o)).toBe(Number(p.n))
      if (a && b) expect(a[1]).toBe(b[1])
    })
  })

  it('第 2 档有和等于 1 的题，答案写「1」', () => {
    let ones = 0
    each('m3s1-08-frac-calc', (q) => {
      if (correctLabel(q) === '1') ones++
    })
    expect(ones).toBeGreaterThan(10)
  })
})

describe('m3s1-08-frac-of-set 进一步认识分数', () => {
  it('从图 / 题目反推答案；分档与范围', () => {
    each('m3s1-08-frac-of-set', (q, d) => {
      const k = keyOf(q)
      fracChoicesOk(q)
      const p = paramsOf(q)
      const set = part(q, 'frac-set')
      if (k === 'm3.frac.setShaded' || k === 'm3.frac.setWhole') {
        expect(set!.shaded).toBeGreaterThanOrEqual(1)
        expect(set!.shaded).toBeLessThan(set!.groups)
        check(q, { frac: [set!.shaded, set!.groups] })
        if (k === 'm3.frac.setWhole') expect([p.n, p.k, p.m]).toEqual([set!.groups * set!.per, set!.groups, set!.shaded])
        if (d === 1) expect(set!.groups * set!.per, q.id).toBeLessThanOrEqual(15)
        // 用物体的个数当分母的错法在选项里（和答案不相等时）
        const n = set!.groups * set!.per
        if (set!.per > 1) expect(labels(q), q.id).toContain(`${set!.shaded}/${n}`)
      } else if (k === 'm3.frac.setEach' || k === 'm3.frac.setSome') {
        const n = Number(p.n)
        const kk = Number(p.k)
        expect(n % kk).toBe(0)
        expect(n / kk, `${q.id} 每份至少 2 个`).toBeGreaterThanOrEqual(2)
        check(q, { num: (n / kk) * (k === 'm3.frac.setEach' ? 1 : Number(p.m)) })
        if (set) expect(set.groups * set.per).toBe(n)
      } else if (k === 'm3.frac.boxUnit') {
        expect(Number(p.n) % Number(p.k)).toBe(0)
        check(q, { frac: [1, Number(p.k)] })
      } else if (k === 'm3.frac.ofNum') {
        const f = parseF(p.f)
        const n = Number(p.n)
        expect(n % f[1]).toBe(0)
        // 先除后乘：一份在表内除法范围里
        expect(n / f[1]).toBeLessThanOrEqual(9)
        expect(n).toBeLessThanOrEqual(30)
        check(q, { num: (n / f[1]) * f[0] })
        if (set) expect([set.groups, set.per, set.shaded]).toEqual([f[1], n / f[1], 0])
      } else {
        expect(d, `${q.id} 应用题只在第 3 档`).toBe(3)
        const n = Number(p.n)
        const of = (f: F): number => {
          expect(n % f[1], q.id).toBe(0)
          return (n / f[1]) * f[0]
        }
        if (k === 'm3.frac.girls' || k === 'm3.frac.rabbits' || k === 'm3.frac.books' || k === 'm3.frac.sticks' || k === 'm3.frac.paint') check(q, { num: of(parseF(p.f)) })
        else if (k === 'm3.frac.boys') {
          const [f1, f2] = [parseF(p.f1), parseF(p.f2)]
          expect(f1[0] + f2[0]).toBe(f1[1])
          check(q, { num: of(f2) })
        } else if (k === 'm3.frac.flour' || k === 'm3.frac.choir') check(q, { num: n - of(parseF(p.f)) })
        else if (k === 'm3.frac.ropeUsed') check(q, { num: of(parseF(p.a)) + of(parseF(p.b)) })
        else if (k === 'm3.frac.hour') check(q, { num: (60 / parseF(p.f)[1]) * parseF(p.f)[0] })
        else if (k === 'm3.frac.grandpa') check(q, { num: of(parseF(p.f)) })
        else if (k === 'm3.frac.fishCats') {
          const [ea, eb] = [of(parseF(p.a)), of(parseF(p.b))]
          check(q, { key: ea > eb ? 'm3.frac.cat.spot' : ea < eb ? 'm3.frac.cat.black' : 'm3.frac.same' })
        } else throw new Error(`没核对的题：${q.id}（${k}）`)
      }
    })
  })
})

describe('分数题的朗读与文字', () => {
  const KPS = ['m3s1-08-unit-frac', 'm3s1-08-frac', 'm3s1-08-frac-calc', 'm3s1-08-frac-of-set']
  it('分数读成「几分之几」，不读出括号，比大小的说明不读「在和里」', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        for (const lang of ['zh', 'en'] as const) {
          const tokens = [...questionSpeech(q, lang), ...answerSpeech(q, lang)]
          for (const t of tokens) {
            expect(t, q.id).not.toMatch(/\d+\/\d+/)
            expect(t, q.id).not.toMatch(/括号|open bracket|close bracket/)
            expect(t, q.id).not.toMatch(/在和/)
          }
        }
        // 题干文字里不用 ¥、不用会读错的多音字搭配
        for (const t of texts(q)) {
          const s = zh(t as LStr)
          expect(s, q.id).not.toMatch(/¥|[长重]\s*\d|倒满|转到/)
        }
      })
    }
  })

  it('第 1 档题目够多样（练习固定第 1 档）', () => {
    for (const kp of KPS) {
      const ids = new Set<string>()
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 450; seed++) ids.add(gen(1, createRng(seed)).id)
      expect(ids.size, kp).toBeGreaterThanOrEqual(40)
    }
  })
})
