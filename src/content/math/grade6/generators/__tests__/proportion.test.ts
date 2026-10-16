import { describe, expect, it } from 'vitest'
import type { GeoItem, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { answerSpeech, questionSpeech } from '@/engine/speech'
import { ZH } from '../../lang/proportion'
import { PAIRS_MEANING, PAIRS_PROPERTY, RECT_PAIRS, SOLVE_BOOK, TRIS, VALUE_BOOK } from '../proportion'

// 六下「4 比例」：从题干反推答案（150 种子 × 三档，自己另算一遍，不用生成器里的函数）；比例式的选项只有一个成立、数的选项值互不相同；
// 第 1 档出得到课本每个例题、做一做和练习八至练习十一的题；题目文字不踩朗读的坑。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KPS = ['m6s2-05-meaning', 'm6s2-05-property', 'm6s2-05-solve', 'm6s2-05-direct', 'm6s2-05-inverse', 'm6s2-05-scale', 'm6s2-05-scale-use', 'm6s2-05-zoom', 'm6s2-05-apply']
const R = '∶'

function each(kp: string, fn: (q: Question, d: 1 | 2 | 3) => void, seeds = SEEDS): void {
  const gen = getGenerator(kp)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sig = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
type Param = LStr | number
type TextPart = Extract<StemPart, { kind: 'text' }>
const texts = (q: Question): { k: string; p: Record<string, Param> }[] =>
  q.stem.filter((p): p is TextPart => p.kind === 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
/** 第 i 段文字的参数（不填 i 取最后一个带参数的） */
function params(q: Question, key?: string): Record<string, Param> {
  const ts = texts(q)
  const t = key ? ts.find((x) => x.k === key) : [...ts].reverse().find((x) => Object.keys(x.p).length)
  return t?.p ?? {}
}
const s = (p: Param | undefined): string => (p === undefined ? '' : typeof p === 'number' ? String(p) : zh(p))
const exprs = (q: Question): string[] => q.stem.filter((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr').map((p) => p.expr)
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const answerText = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const statRows = (q: Question): (number | LStr | null)[][] => (q.stem.find((p) => p.kind === 'stat-table') as Extract<StemPart, { kind: 'stat-table' }> | undefined)?.rows ?? []

// ── 自己的分数算法 ──
type Fr = [number, number]
const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b))
const f = (n: number, d = 1): Fr => {
  const k = g(n, d) || 1
  const sgn = d < 0 ? -1 : 1
  return [(sgn * n) / k, (sgn * d) / k]
}
function v(str: string): Fr {
  const t = str.trim()
  const fm = /^(\d+)\/(\d+)$/.exec(t)
  if (fm) return f(Number(fm[1]), Number(fm[2]))
  const m = /^(\d+)(?:\.(\d+))?$/.exec(t)
  if (!m) throw new Error(`不是数：${str}`)
  const dec = m[2] ?? ''
  return f(Number(m[1] + dec), 10 ** dec.length)
}
const isNum = (t: string): boolean => /^\d+(\.\d+)?$|^\d+\/\d+$/.test(t.trim())
const same = (a: Fr, b: Fr): boolean => a[0] * b[1] === a[1] * b[0]
const mul = (a: Fr, b: Fr): Fr => f(a[0] * b[0], a[1] * b[1])
const dv = (a: Fr, b: Fr): Fr => f(a[0] * b[1], a[1] * b[0])
const ratioV = (t: string): Fr => {
  const [a, b] = t.split(R)
  return dv(v(a!), v(b!))
}
const isRatio = (t: string): boolean => new RegExp(`^[\\d./]+${R}[\\d./]+$`).test(t)
/** 「a∶b = c∶d」成立吗（xv：x 的值） */
function holds(t: string, xv?: Fr): boolean {
  const [l, r] = t.split(' = ')
  const nums = [...l!.split(R), ...r!.split(R)].map((x) => (x.trim() === 'x' ? xv! : v(x)))
  return same(mul(nums[0]!, nums[3]!), mul(nums[1]!, nums[2]!))
}
const isProp = (t: string): boolean => /^[\dx./]+∶[\dx./]+ = [\dx./]+∶[\dx./]+$/.test(t)
/** 比例式里的未知数 x */
function solve(t: string): Fr {
  const [l, r] = t.split(' = ')
  const ns = [...l!.split(R), ...r!.split(R)].map((x) => x.trim())
  const i = ns.indexOf('x')
  const n = ns.map((x) => (x === 'x' ? f(1) : v(x)))
  // 外项的积 = 内项的积
  if (i === 0) return dv(mul(n[1]!, n[2]!), n[3]!)
  if (i === 3) return dv(mul(n[1]!, n[2]!), n[0]!)
  if (i === 1) return dv(mul(n[0]!, n[3]!), n[2]!)
  return dv(mul(n[0]!, n[3]!), n[1]!)
}
const ansV = (q: Question): Fr => v(answerText(q))
const expectNum = (q: Question, want: Fr): void => {
  expect(isNum(answerText(q)), `${q.id} 答案不是数：${answerText(q)}`).toBe(true)
  expect(same(ansV(q), want), `${q.id} 答案 ${answerText(q)}，应是 ${want[0]}/${want[1]}`).toBe(true)
}
const expectAns = (q: Question, want: string): void => expect(answerText(q), q.id).toBe(want)
const expectJudge = (q: Question, ok: boolean): void => expectAns(q, ok ? '对' : '不对')
const pairOf = (label: string): [string, string] => label.split(' 和 ') as [string, string]

describe('比例：选项', () => {
  it('数的选项值互不相同；比的选项比值互不相同；比例式（不带 x）的选项只有一个成立，就是答案', () => {
    for (const kp of KPS)
      each(kp, (q) => {
        if (q.input !== 'choice') return
        const ls = labels(q)
        if (ls.every(isNum)) {
          const vs = ls.map(v)
          for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) expect(same(vs[i]!, vs[j]!), `${q.id} ${ls[i]} 和 ${ls[j]} 相等`).toBe(false)
        }
        if (ls.every(isNum)) {
          // 写法一致：答案是小数，选项里没有分数；答案是分数，选项里没有小数（整数都可以）
          const a = answerText(q)
          const bad = ls.filter((l) => (a.includes('/') && l.includes('.')) || (a.includes('.') && l.includes('/')))
          expect(bad, `${q.id} 答案 ${a}，选项 ${ls.join(' | ')}`).toEqual([])
        }
        if (ls.every(isRatio)) {
          const vs = ls.map(ratioV)
          for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) expect(same(vs[i]!, vs[j]!), `${q.id} ${ls[i]} 和 ${ls[j]} 比值相等`).toBe(false)
        }
        if (ls.every(isProp) && !ls.some((l) => l.includes('x'))) {
          const ok = ls.filter((l) => holds(l))
          expect(ok, `${q.id} 成立的比例式：${ok.join(' | ')}`).toEqual([answerText(q)])
        }
      })
  })
})

describe('比例：手机上一屏放得下', () => {
  it('带图象、统计表、方格图、线段比例尺的题不用数字键盘（数字键盘四行约 300 像素）', () => {
    const BIG = new Set(['prop-graph', 'stat-table', 'geo', 'scale-bar'])
    for (const kp of KPS)
      each(kp, (q) => {
        if (q.stem.some((p) => BIG.has(p.kind))) expect(q.input, q.id).toBe('choice')
      })
  })
  it('图象的方格不多（横 ≤ 13、竖 ≤ 7 格）；点、空心圈、读图的虚线和它碰到线的地方都在方格里', () => {
    for (const kp of ['m6s2-05-direct', 'm6s2-05-inverse'])
      each(kp, (q) => {
        const g = q.stem.find((x) => x.kind === 'prop-graph') as Extract<StemPart, { kind: 'prop-graph' }> | undefined
        if (!g) return
        expect(g.x.cells, q.id).toBeLessThanOrEqual(13)
        expect(g.y.cells, q.id).toBeLessThanOrEqual(7)
        const xMax = g.x.step * g.x.cells
        const yMax = g.y.step * g.y.cells
        const inside = ([x, y]: [number, number]): boolean => x >= 0 && y >= 0 && x <= xMax + 1e-9 && y <= yMax + 1e-9
        for (const s of g.series) for (const p of s.pts) expect(inside(p), `${q.id} 点 ${p.join(', ')}`).toBe(true)
        for (const p of g.marks ?? []) expect(inside(p), `${q.id} 圈 ${p.join(', ')}`).toBe(true)
        const first = g.series[0]!
        const [lx, ly] = first.pts.find(([px]) => px > 0)!
        const yAt = (x: number): number => (first.line === 'curve' ? (lx * ly) / x : (ly / lx) * x)
        const xAt = (y: number): number => (first.line === 'curve' ? (lx * ly) / y : (lx / ly) * y)
        if (g.guide?.x !== undefined) expect(inside([g.guide.x, yAt(g.guide.x)]), `${q.id} 虚线 x = ${g.guide.x}`).toBe(true)
        if (g.guide?.y !== undefined) expect(inside([xAt(g.guide.y), g.guide.y]), `${q.id} 虚线 y = ${g.guide.y}`).toBe(true)
      })
  })
})

describe('比例的意义（反推答案）', () => {
  it('每种题', () => {
    each('m6s2-05-meaning', (q) => {
      const k = sig(q)
      const p = params(q)
      if (k.startsWith('value-')) expectNum(q, ratioV(s(params(q, 'm6.prop.m.valueQ').r)))
      else if (k.startsWith('rect-')) expectJudge(q, holds(`${s(p.l1)}${R}${s(p.w1)} = ${s(p.l2)}${R}${s(p.w2)}`))
      else if (k.startsWith('rectwrite-')) {
        // 答案用的就是题里的四个数（两个长度、两个宽度）
        const nums = [s(p.l1), s(p.w1), s(p.l2), s(p.w2)].sort()
        expect(answerText(q).split(/∶| = /).sort(), q.id).toEqual(nums)
      } else if (k === 'def') expectAns(q, '比例')
      else if (k.startsWith('concept-')) expectJudge(q, k !== 'concept-unequal')
      else if (k.startsWith('pair-')) expectJudge(q, same(ratioV(s(p.a)), ratioV(s(p.b))))
      else if (k.startsWith('pick-')) {
        const good = labels(q).filter((l) => {
          const [a, b] = pairOf(l)
          return same(ratioV(a), ratioV(b))
        })
        expect(good, q.id).toEqual([answerText(q)])
      } else if (k.startsWith('pairwrite-')) {
        const nums = [...s(p.a).split(R), ...s(p.b).split(R)].sort()
        expect(answerText(q).split(/∶| = /).sort(), q.id).toEqual(nums)
      } else if (k.startsWith('tri-')) {
        const geo = q.stem.find((x) => x.kind === 'geo') as Extract<StemPart, { kind: 'geo' }>
        const dims = geo.figs[0]!.items.filter((it): it is Extract<GeoItem, { t: 'line' }> => it.t === 'line' && !!it.dim).map((it) => it.dim!)
        expect(answerText(q).split(/∶| = /).sort(), q.id).toEqual([...dims].sort())
        expect(holds(answerText(q)), q.id).toBe(true)
      } else if (k.startsWith('table-')) {
        const [ra, rb] = statRows(q)
        expectJudge(q, holds(`${ra![1]}${R}${rb![1]} = ${ra![2]}${R}${rb![2]}`))
      } else if (k.startsWith('tablewrite-')) {
        const [ra, rb] = statRows(q)
        expect(answerText(q).split(/∶| = /).sort(), q.id).toEqual([ra![1], ra![2], rb![1], rb![2]].map(String).sort())
      } else if (k.startsWith('five-')) {
        expect(same(ratioV(answerText(q)), f(5)), q.id).toBe(true)
        for (const l of labels(q)) if (l !== answerText(q)) expect(same(ratioV(l), f(5)), q.id).toBe(false)
      } else if (k.startsWith('partner-')) {
        const r = ratioV(s(p.r))
        for (const l of labels(q)) expect(same(ratioV(l), r), `${q.id} ${l}`).toBe(l === answerText(q))
      } else if (k.startsWith('picktwo-')) {
        const good = labels(q).filter((l) => {
          const [a, b] = pairOf(l)
          return same(ratioV(a), ratioV(b))
        })
        expect(good, q.id).toEqual([answerText(q)])
      } else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('比例的基本性质（反推答案）', () => {
  const termsOf = (pp: string): string[] => pp.split(/∶| = /)
  it('每种题', () => {
    each('m6s2-05-property', (q) => {
      const k = sig(q)
      const p = params(q)
      if (/^(frac)?(outer|inner)-/.test(k)) {
        const pp = s(params(q, k.startsWith('frac') ? 'm6.prop.p.fracFormQ' : undefined).p)
        const [a, b, c, d] = termsOf(pp)
        const outer = k.includes('outer')
        expectAns(q, outer ? `${a} 和 ${d}` : `${b} 和 ${c}`)
        if (k.startsWith('frac')) {
          // 分数形式画的就是这个比例
          const chain = q.stem.find((x) => x.kind === 'frac-chain') as Extract<StemPart, { kind: 'frac-chain' }>
          expect(chain.terms, q.id).toEqual([{ n: a, d: b }, { t: '=' }, { n: c, d }])
        }
      } else if (k.startsWith('product-')) {
        const [a, b, c, d] = termsOf(s(p.p)).map(v)
        expectNum(q, k.startsWith('product-outer') ? mul(a!, d!) : mul(b!, c!))
      } else if (k.startsWith('fracproduct-')) expectNum(q, f(45))
      else if (k.startsWith('stmt-')) expectJudge(q, k !== 'stmt-sum')
      else if (k === 'letters') expectAns(q, 'ad = bc')
      else if (k.startsWith('other-')) expectNum(q, f(p.n as number))
      else if (k.startsWith('pjudge-')) {
        const [a, b] = s(p.a).split(R).map(v)
        const [c, d] = s(p.b).split(R).map(v)
        expectJudge(q, same(mul(a!, d!), mul(b!, c!)))
      } else if (k.startsWith('four-')) {
        const ns = Object.values((p.n as { p: Record<string, string> }).p).map(v)
        const [a, b, c, d] = ns
        const ok = same(mul(a!, b!), mul(c!, d!)) || same(mul(a!, c!), mul(b!, d!)) || same(mul(a!, d!), mul(b!, c!))
        expectJudge(q, ok)
      } else if (k.startsWith('fourwrite-')) {
        const ns = Object.values((p.n as { p: Record<string, string> }).p)
        expect(answerText(q).split(/∶| = /).sort(), q.id).toEqual([...ns].sort())
      } else if (k === 'rice-judge') expectJudge(q, same(dv(v('3.75'), v('0.5')), dv(v('6'), v('0.8'))))
      else if (k === 'rice-outer') expectAns(q, '3.75 和 0.8')
      else if (k === 'rice-inner') expectAns(q, '0.5 和 6')
      else if (k.startsWith('eq-')) {
        const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((x) => s(p[x]))
        expect(same(mul(v(a!), v(b!)), mul(v(c!), v(d!))), `${q.id} 等式不成立`).toBe(true)
        expect(answerText(q).split(/∶| = /).sort(), q.id).toEqual([a, b, c, d].sort())
      } else if (k.startsWith('count-')) {
        const ns = ['a', 'b', 'c', 'd'].map((x) => s(p[x]))
        const ok = new Set<string>()
        for (const i of [0, 1, 2, 3])
          for (const j of [0, 1, 2, 3])
            for (const m of [0, 1, 2, 3])
              for (const n of [0, 1, 2, 3])
                if (new Set([i, j, m, n]).size === 4) {
                  const t = `${ns[i]}${R}${ns[j]} = ${ns[m]}${R}${ns[n]}`
                  if (holds(t)) ok.add(t)
                }
        expectNum(q, f(ok.size))
      } else if (k === 'terms') expectNum(q, f(4))
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('解比例（反推答案）', () => {
  it('每种题', () => {
    each('m6s2-05-solve', (q) => {
      const k = sig(q)
      const p = params(q)
      if (k.startsWith('int-') || k.startsWith('book-')) {
        const pp = exprs(q).find((e) => e.includes(R)) ?? s(params(q, 'm6.prop.s.fracSolve').p)
        expectNum(q, solve(pp))
        expect(exprs(q), q.id).toContain('x = ?')
      } else if (k.startsWith('cross-')) {
        const x = solve(s(p.p))
        const parse = (l: string): boolean | null => {
          const m = /^(\S*)x = (\S+) × (\S+)$/.exec(l)
          if (!m) return null
          const c = m[1] === '' ? f(1) : v(m[1]!)
          return same(mul(c, x), mul(v(m[2]!), v(m[3]!)))
        }
        expect(parse(answerText(q)), q.id).toBe(true)
        for (const l of labels(q)) if (l !== answerText(q)) expect(parse(l) === true, `${q.id} ${l}`).toBe(false)
      } else if (k === 'rocket') expectNum(q, dv(f(57), f(10)))
      else if (k === 'rocket-setup') {
        const ok = labels(q).filter((l) => holds(l, v('5.7')))
        expect(ok, q.id).toEqual([answerText(q)])
      } else if (k.startsWith('disinfect-')) {
        const r = s(p.r).split(R).map(v)
        expectNum(q, dv(mul(f(p.a as number), r[1]!), mul(r[0]!, f(1000))))
      } else if (k.startsWith('heartjudge-')) expectJudge(q, same(dv(mul(f(60), f(p.n as number)), f(p.t as number)), f(p.m as number)))
      else if (k.startsWith('heart-')) expectNum(q, dv(mul(f(60), f(p.n as number)), f(p.t as number)))
      else if (k.startsWith('iceback-')) expectNum(q, mul(f(p.v as number), f(10, 9)))
      else if (k.startsWith('ice-')) expectNum(q, mul(f(p.v as number), f(9, 10)))
      else if (k.startsWith('cond1-')) expectNum(q, dv(mul(f(p.b as number), f(p.c as number)), f(p.a as number)))
      else if (k.startsWith('cond3-')) expectNum(q, dv(mul(v(String(p.a)), v(String(p.b))), v(String(p.c))))
      else if (k === 'bus') expectNum(q, v('58.8'))
      else if (k.startsWith('car-')) expectNum(q, mul(v(String(p.l)), f(20)))
      else if (k.startsWith('terracotta-')) expectNum(q, mul(v(String(p.h)), f(10)))
      else if (k.startsWith('building-')) expectNum(q, dv(mul(f(p.h as number), f(100)), f(50)))
      else if (k.startsWith('ballsratio-')) expect(same(ratioV(answerText(q)), f(p.b as number, p.a as number)), q.id).toBe(true)
      else if (k.startsWith('balls-')) expectNum(q, f((p.a as number) * (p.p as number), p.b as number))
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

/** 图象里第一组线的比值（正比例：y ÷ x）或乘积（反比例：x × y） */
function graphOf(q: Question): Extract<StemPart, { kind: 'prop-graph' }> {
  return q.stem.find((x) => x.kind === 'prop-graph') as Extract<StemPart, { kind: 'prop-graph' }>
}
const slope = (pts: [number, number][]): Fr => {
  const [x, y] = pts.find(([px]) => px > 0)!
  return dv(v(String(y)), v(String(x)))
}
/** 统计表里两行相对应的两个数（跳过表头、空格、问号格） */
function columns(rows: (number | LStr | null)[][], i: number, j: number): [Fr, Fr][] {
  const out: [Fr, Fr][] = []
  for (let c = 1; c < rows[i]!.length; c++) {
    const a = rows[i]![c]
    const b = rows[j]![c]
    if (a === null || b === null || a === '' || b === '' || a === undefined || b === undefined) continue
    out.push([v(String(a)), v(String(b))])
  }
  return out
}

describe('正比例（反推答案）', () => {
  const TRUTH: Record<string, boolean> = { square: true, car: true, magazine: true, cube: false, age: false, wheat: true, pages: false, circle: false, trapezoid: true, y5x: true, cone: true }
  it('每种题', () => {
    each('m6s2-05-direct', (q) => {
      const k = sig(q)
      const p = params(q)
      const rows = statRows(q)
      if (k === 'ribbon-ratio' || k === 'power-ratio') {
        // 表里每一列的比值都一样，就是答案
        const [qi, pi] = k === 'ribbon-ratio' ? [0, 1] : [1, 2]
        const ratios = columns(rows, pi, qi).map(([a, b]) => dv(a, b))
        for (const r of ratios) expect(same(r, ratios[0]!), q.id).toBe(true)
        expectNum(q, ratios[0]!)
      } else if (k === 'car-ratio') expectNum(q, dv(...columns(rows, 1, 0)[0]!))
      else if (k === 'ribbon-meaning') expectAns(q, '彩带的单价')
      else if (k === 'power-meaning') expectAns(q, '每千瓦时电的价钱')
      else if (k === 'car-meaning') expectAns(q, '汽车的速度')
      else if (k === 'ribbon-change') expectAns(q, '数量增加，总价也增加')
      else if (['ribbon-judge', 'car-judge', 'power-judge', 'fuel-judge', 'shadow-judge', 'line-judge'].includes(k) || k.startsWith('run-judge-')) expectJudge(q, true)
      else if (k.startsWith('readprice-')) expectNum(q, mul(slope(graphOf(q).series[0]!.pts), f(p.x as number)))
      else if (k.startsWith('readqty-')) expectNum(q, dv(f(p.y as number), slope(graphOf(q).series[0]!.pts)))
      else if (k.startsWith('online-')) {
        const [x, y] = graphOf(q).marks![0]!
        expectJudge(q, same(dv(v(String(y)), v(String(x))), slope(graphOf(q).series[0]!.pts)))
        expect([x, y], q.id).toEqual([p.x, p.y])
      } else if (k.startsWith('times-') || k.startsWith('pencil-times-')) expectNum(q, f(p.n as number))
      else if (k.startsWith('djudge-')) expectJudge(q, TRUTH[k.slice(7)]!)
      else if (k.startsWith('carest-')) expectNum(q, dv(f(p.k as number), slope(graphOf(q).series[0]!.pts)))
      else if (k === 'formula') expectAns(q, 'y ÷ x = k')
      else if (k.startsWith('fuel-est')) {
        const want = mul(f(55), slope(graphOf(q).series[0]!.pts))
        // 估计值：选项里离准确值最近的那个
        const dist = (l: string): number => Math.abs(Number(l) - want[0] / want[1])
        const best = [...labels(q)].sort((a, b) => dist(a) - dist(b))[0]
        expectAns(q, best!)
        expect(dist(answerText(q)), q.id).toBeLessThan(0.1)
      } else if (k.startsWith('fuel-')) {
        const r = dv(...columns(rows, 1, 0)[0]!)
        expectNum(q, mul(f(p.k as number), r))
      } else if (k.startsWith('fill-')) {
        const known = columns(rows, 1, 0)
        const ratio = dv(known[0]![0], known[0]![1])
        for (const [y, x] of known) expect(same(dv(y, x), ratio), q.id).toBe(true)
        const col = rows[0]!.findIndex((c, i) => i > 0 && (c === null || rows[1]![i] === null))
        const x = rows[0]![col]
        const y = rows[1]![col]
        expect(x === '' || y === '', `${q.id} 问号那一列另一个数要给出`).toBe(false)
        expectNum(q, x === null ? dv(v(String(y)), ratio) : mul(v(String(x)), ratio))
      } else if (k.startsWith('shadow-')) expectNum(q, mul(f(p.h as number), dv(v('1.6'), f(2))))
      else if (k === 'even-kind') expectAns(q, '偶数')
      else if (k.startsWith('even-')) expectNum(q, f(2 * (p.n as number)))
      else if (k.startsWith('pencil-')) expectNum(q, mul(f(p.n as number), v('0.5')))
      else if (k === 'run-faster') {
        const [a, b] = graphOf(q).series
        expectAns(q, s(ratioGreater(slope(a!.pts), slope(b!.pts)) ? a!.name : b!.name))
      } else if (k.startsWith('run-')) {
        const who = s(p.a)
        const line = graphOf(q).series.find((x) => s(x.name) === who)!
        expectNum(q, mul(slope(line.pts), f(p.t as number)))
      } else throw new Error(`没核对的题：${q.id}`)
    })
  })
})
const ratioGreater = (a: Fr, b: Fr): boolean => a[0] * b[1] > b[0] * a[1]

describe('反比例（反推答案）', () => {
  const TRUTH: Record<string, boolean> = { price: true, rect: true, coal: true, groups: true, cylinder: true, garden: false, packs: true }
  const MIXED: Record<string, string> = { factor: '成反比例', speed240: '成反比例', cone: '成正比例', circle: '不成比例', rect36: '成反比例', scaleMap: '成正比例', sumPages: '不成比例', magazine: '成正比例' }
  it('每种题', () => {
    each('m6s2-05-inverse', (q) => {
      const k = sig(q)
      const p = params(q)
      const rows = statRows(q)
      const product = (): Fr => {
        const cs = columns(rows, 0, 1).map(([a, b]) => mul(a, b))
        for (const c of cs) expect(same(c, cs[0]!), `${q.id} 表里的乘积不一样`).toBe(true)
        return cs[0]!
      }
      if (['cyl-product', 'freight-product', 'phones-product', 'train-total'].includes(k)) expectNum(q, product())
      else if (k === 'cyl-meaning') expectAns(q, '水的体积')
      else if (k === 'freight-meaning') expectAns(q, '这批货物一共的质量')
      else if (k === 'cyl-change') expectAns(q, '变小')
      else if (['cyl-judge', 'freight-judge', 'tiles-judge', 'vinegar-judge'].includes(k)) expectJudge(q, true)
      else if (k.startsWith('cyl-')) expectNum(q, dv(product(), f(p.s as number)))
      else if (k === 'formula') expectAns(q, 'x × y = k')
      else if (k.startsWith('ijudge-')) expectJudge(q, TRUTH[k.slice(7)]!)
      else if (k.startsWith('tiles-')) expectNum(q, dv(product(), f(p.s as number)))
      else if (k.startsWith('vinegar-')) expectNum(q, dv(product(), f(p.v as number)))
      else if (k.startsWith('ifill-')) {
        const cs = columns(rows, 0, 1).map(([a, b]) => mul(a, b))
        for (const c of cs) expect(same(c, cs[0]!), q.id).toBe(true)
        const col = rows[0]!.findIndex((c, i) => i > 0 && (c === null || rows[1]![i] === null))
        const x = rows[0]![col]
        const y = rows[1]![col]
        expect(x === '' || y === '', `${q.id} 问号那一列另一个数要给出`).toBe(false)
        expectNum(q, dv(cs[0]!, v(String(x === null ? y : x))))
      } else if (k === 'phones-formula') expectAns(q, 'p × t = 12000')
      else if (k === 'train-formula') expectAns(q, 'v × t = 1300')
      else if (k.startsWith('phones-')) expectNum(q, dv(product(), f(p.t as number)))
      else if (k.startsWith('train-')) expectNum(q, dv(product(), f(p.v as number)))
      else if (k.startsWith('mixed-')) expectAns(q, MIXED[k.slice(6)]!)
      else if (k === 'curve-judge') expectJudge(q, false)
      else if (k.startsWith('curve-')) {
        const [x0, y0] = graphOf(q).series[0]!.pts[0]!
        expectNum(q, dv(f(x0 * y0), f(p.s as number)))
        expect(graphOf(q).guide?.x, q.id).toBe(p.s)
      } else if (k === 'rect36') expectAns(q, '成反比例')
      else if (k === 'rect36-line') expectJudge(q, false)
      else if (k.startsWith('xyz-')) expectAns(q, s(p.f) === 'z' ? '成反比例' : '成正比例')
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

/** 「1∶n」「n∶1」的比值 */
const KM = 100000
describe('比例尺（反推答案）', () => {
  it('每种题', () => {
    each('m6s2-05-scale', (q) => {
      const k = sig(q)
      const p = params(q)
      if (k === 'def') expectAns(q, '比例尺')
      else if (k.startsWith('find-')) expect(same(ratioV(answerText(q)), dv(v(String(p.m)), mul(v(String(p.r)), f(KM)))), q.id).toBe(true)
      else if (k.startsWith('kmcm-')) expectNum(q, mul(v(String(p.k)), f(KM)))
      else if (k.startsWith('bar-')) {
        const bar = q.stem.find((x) => x.kind === 'scale-bar') as Extract<StemPart, { kind: 'scale-bar' }>
        const per = mul(f(bar.per!), f(s(bar.unit) === '千米' ? KM : 100))
        expect(same(ratioV(answerText(q)), dv(f(1), per)), q.id).toBe(true)
        expect(bar.per, q.id).toBe(p.per)
      } else if (k.startsWith('numline-')) {
        const n = ratioV(s(p.s))
        expectNum(q, dv(dv(f(1), n), f(s(p.u) === '千米' ? KM : 100)))
      } else if (k.startsWith('times-')) expectNum(q, dv(f(1), ratioV(s(p.s))))
      else if (k.startsWith('frac-')) expectNum(q, ratioV(s(p.s)))
      else if (k.startsWith('kind-num')) expectAns(q, '数值比例尺')
      else if (k.startsWith('kind-line')) expectAns(q, '线段比例尺')
      else if (k.startsWith('parttimes-')) expectNum(q, ratioV(s(p.s)))
      else if (k.startsWith('zoom-')) expectAns(q, ratioGreater(ratioV(s(p.s)), f(1)) ? '放大' : '缩小')
      else if (k.startsWith('part-')) expect(same(ratioV(answerText(q)), dv(mul(v(String(p.b)), f(10)), v(String(p.a)))), q.id).toBe(true)
      else if (k.startsWith('room-')) expect(same(ratioV(answerText(q)), dv(v(String(p.m)), mul(v(String(p.r)), f(100)))), q.id).toBe(true)
      else if (k === 'road') expect(same(ratioV(answerText(q)), dv(f(6), f(1800 * 100))), q.id).toBe(true)
      else if (k === 'road-line') expectNum(q, dv(f(1800), f(6)))
      else if (k === 'bug') expect(same(ratioV(answerText(q)), dv(f(30), f(5))), q.id).toBe(true)
      else if (k.startsWith('sjudge-')) expectJudge(q, k !== 'sjudge-wrong500')
      else if (k.startsWith('toone-')) {
        const want = ratioV(s(p.s))
        expect(same(ratioV(answerText(q)), want), q.id).toBe(true)
        expect(answerText(q).split(R), q.id).toContain('1')
      } else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('用比例尺求距离（反推答案）', () => {
  const PARK: Record<string, number> = { park: 500, tech: 300, zoo: 1000, hospital: 400 }
  it('每种题', () => {
    each('m6s2-05-scale-use', (q) => {
      const k = sig(q)
      const p = params(q)
      if (k.startsWith('real-')) expectNum(q, dv(mul(v(String(p.m)), dv(f(1), ratioV(s(p.s)))), f(KM)))
      else if (k === 'subway' || k === 'subway-km') expectNum(q, dv(f(77 * 30000), f(KM)))
      else if (k === 'subway-setup') expect(labels(q).filter((l) => holds(l, f(2310000))), q.id).toEqual([answerText(q)])
      else if (k === 'village-num') expect(same(ratioV(answerText(q)), f(1, 600 * 100)), q.id).toBe(true)
      else if (k.startsWith('village-')) expectNum(q, mul(v(String(p.m)), f(600)))
      else if (k.startsWith('home-west') || k.startsWith('home-north')) expectNum(q, mul(f((p.a as number) * 100), ratioV(s(p.s))))
      else if (k.startsWith('home-east')) expectNum(q, mul(f(((p.b as number) - (p.a as number)) * 100), ratioV(s(p.s))))
      else if (k.startsWith('home-bar')) expectNum(q, dv(dv(f(1), ratioV(s(p.s))), f(100)))
      else if (k.startsWith('field-area')) expectNum(q, mul(mul(f((p.l as number) * 100), ratioV(s(p.s))), mul(f((p.w as number) * 100), ratioV(s(p.s)))))
      else if (k.startsWith('field-')) expectNum(q, mul(f(((s(p.side) === '长度' ? p.l : p.w) as number) * 100), ratioV(s(p.s))))
      else if (k.startsWith('map-')) expectNum(q, mul(mul(v(String(p.r)), f(KM)), ratioV(s(p.s))))
      else if (k.startsWith('table-')) {
        const rows = statRows(q)
        const [sc, m, r] = rows[1]!
        const n = ratioV(String(sc))
        expectNum(q, m === null ? mul(mul(v(String(r)), f(KM)), n) : dv(dv(v(String(m)), n), f(KM)))
      } else if (k === 'court-side') expectNum(q, dv(f(250), f(250)))
      else if (k === 'court-end') expectNum(q, dv(f(400), f(250)))
      else if (k.startsWith('court-size')) expectNum(q, dv(f((k.endsWith('l') ? 28 : 15) * 100), f(250)))
      else if (k.startsWith('park-')) expectNum(q, dv(f(PARK[k.slice(5)]! * 100), f(10000)))
      else if (k === 'direct-judge') expectJudge(q, true)
      else if (k === 'twomaps') expectNum(q, dv(mul(v('5.5'), f(2000000)), f(5000000)))
      else if (k === 'part-real') expectNum(q, dv(f(20), f(4)))
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('图形的放大与缩小（反推答案）', () => {
  const legs = (a: number, b: number): string => `${a} 格和 ${b} 格`
  const JUDGE: Record<string, boolean> = { double: true, third: true, add: false, hyp: true, area: false }
  const k1 = (t: string): number => {
    const [a, b] = t.split(R).map(Number)
    return a! / b!
  }
  it('每种题', () => {
    each('m6s2-05-zoom', (q) => {
      const k = sig(q)
      const p = params(q)
      if (k.startsWith('ph-')) expectAns(q, k === 'ph-camera' ? '缩小' : '放大')
      else if (k.startsWith('square-')) expectNum(q, f((p.a as number) * k1(s(p.r))))
      else if (k.startsWith('rect53-area')) expectNum(q, f(5 * 3 * 9))
      else if (k.startsWith('rect53-')) expectNum(q, f((s(p.side) === '长度' ? 5 : 3) * k1(s(p.r))))
      else if (k.startsWith('rect-')) expectNum(q, f(((s(p.side) === '长度' ? p.a : p.b) as number) * k1(s(p.r))))
      else if (k.startsWith('tri-')) expectAns(q, legs((p.a as number) * k1(s(p.r)), (p.b as number) * k1(s(p.r))))
      else if (k.startsWith('zjudge-')) expectJudge(q, JUDGE[k.slice(7)]!)
      else if (k.startsWith('angle-')) expectAns(q, '不变')
      else if (k.startsWith('perim-')) expectNum(q, f(k1(s(p.r))))
      else if (k.startsWith('shrink-square')) expectNum(q, f((p.a as number) * k1(s(p.r))))
      else if (k.startsWith('shrink-rect')) expectNum(q, f(((s(p.side) === '长度' ? p.a : p.b) as number) * k1(s(p.r))))
      else if (k === 'shrink-tri') expectAns(q, legs((p.a as number) * k1(s(p.r)), (p.b as number) * k1(s(p.r))))
      else if (k === 'twice-1') expectAns(q, legs((p.a as number) * k1(s(p.r)), (p.b as number) * k1(s(p.r))))
      else if (k === 'twice-2') expectAns(q, legs((p.a as number) * k1(s(p.r1)) * k1(s(p.r2)), (p.b as number) * k1(s(p.r1)) * k1(s(p.r2))))
      else if (k.startsWith('pick-')) {
        // 图里第一个多边形是 A，其余按徽章 1–4 排；宽、高都是 A 的 2 倍的那个是答案
        const items = (q.stem.find((x) => x.kind === 'geo') as Extract<StemPart, { kind: 'geo' }>).figs[0]!.items
        const polys = items.filter((it): it is Extract<GeoItem, { t: 'poly' }> => it.t === 'poly')
        const box = (pts: [number, number][]): [number, number] => [Math.max(...pts.map((x) => x[0])) - Math.min(...pts.map((x) => x[0])), Math.max(...pts.map((x) => x[1])) - Math.min(...pts.map((x) => x[1]))]
        const [aw, ah] = box(polys[0]!.pts)
        const k2 = k1(s(p.r))
        const hits = polys.slice(1).map((pl, i) => [box(pl.pts), i + 1] as const).filter(([[w, h]]) => Math.abs(w - aw * k2) < 1e-9 && Math.abs(h - ah * k2) < 1e-9)
        expect(hits.map(([, i]) => String(i)), q.id).toEqual([answerText(q)])
      } else if (k.startsWith('ab-')) expectNum(q, f((p.a as number) * k1(s(p.r))))
      else if (k.startsWith('bc-')) expectNum(q, f((p.a as number) * k1(s(p.r1)) * k1(s(p.r2))))
      else if (k.startsWith('which-')) expect(same(ratioV(answerText(q)), f(p.b as number, p.a as number)), q.id).toBe(true)
      else if (k.startsWith('kind-')) expectAns(q, k1(s(p.r)) > 1 ? '放大' : '缩小')
      else if (k.startsWith('areatimes-')) expectNum(q, f(k1(s(p.r)) ** 2))
      else if (k.startsWith('circles-')) expect(same(ratioV(answerText(q)), k === 'circles-area' ? f(25, 9) : f(5, 3)), q.id).toBe(true)
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('用比例解决问题（反推答案）', () => {
  const REL: Record<string, string> = { canal: '成反比例', truck: '成正比例', book: '成反比例', station: '成正比例', pens: '成正比例', allow: '成反比例' }
  it('每种题', () => {
    each('m6s2-05-apply', (q) => {
      const k = sig(q)
      const p = params(q)
      const n = (x: string): number => p[x] as number
      if (k === 'water-rel') expectAns(q, '成正比例')
      else if (k === 'water-setup') expect(labels(q).filter((l) => holds(l, f(50))), q.id).toEqual([answerText(q)])
      else if (k.startsWith('waterback-')) expectNum(q, f(n('q') * 8, 40))
      else if (k.startsWith('water-')) expectNum(q, f(n('p') * n('b'), n('a')))
      else if (k === 'lamp-rel') expectAns(q, '成反比例')
      else if (k === 'lamp-setup') expectAns(q, '25x = 100 × 5')
      else if (k.startsWith('lampback-')) expectNum(q, f(25 * n('n'), 100))
      else if (k.startsWith('lamp-')) expectNum(q, f(n('a') * n('n'), n('b')))
      else if (k.startsWith('pen1-')) expectNum(q, f(n('p') * n('b'), n('a')))
      else if (k.startsWith('pen2-')) expectNum(q, dv(mul(f(n('a')), v(String(p.p))), v(String(p.q))))
      else if (k.startsWith('shadow-')) expectNum(q, dv(mul(v(String(p.s)), v('1.5')), v('2.4')))
      else if (k.startsWith('station-')) expectNum(q, f(9 * n('n'), 6))
      else if (k.startsWith('canal-')) expectNum(q, f(6 * 12, n('h')))
      else if (k.startsWith('truck-')) expectNum(q, f(n('k') * 2, 160))
      else if (k.startsWith('book-')) expectNum(q, f(30 * 8, n('n')))
      else if (k.startsWith('return-')) expectNum(q, f(72 * 10, n('v')))
      else if (k.startsWith('allow1-')) expectNum(q, f(30 * 40, n('p')))
      else if (k.startsWith('allow2-')) expectNum(q, f(30 * 40, n('n')))
      else if (k === 'harvest-total') expectNum(q, mul(mul(v('0.3'), f(40)), f(8)))
      else if (k.startsWith('harvest-')) expectNum(q, dv(mul(v('0.3'), f(40)), f(n('h'))))
      else if (k === 'drive1') expectNum(q, f(100 * 3, 2))
      else if (k === 'drive2') expectNum(q, f(50 * 3, 60))
      else if (k.startsWith('rel-')) expectAns(q, REL[k.slice(4)]!)
      else if (k === 'rail') expectAns(q, 1600 / (700 / 2.5) <= 6 ? '能' : '不能')
      else if (k === 'bricks') expectNum(q, dv(mul(mul(v('0.6'), v('0.6')), f(100)), mul(v('0.5'), v('0.5'))))
      else if (k === 'discount1') expectNum(q, f(180 * 150, 250))
      else if (k === 'discount2') expectNum(q, dv(f(90 * 4), f(200 * 150, 250)))
      else if (k === 'discount3') expectAns(q, 'y = 0.6x')
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('第 1 档出得到课本的每一问', () => {
  const tier1 = (kp: string): string[] => {
    const out = new Set<string>()
    each(kp, (q, d) => {
      if (d === 1) out.add(sig(q))
    }, 400)
    return [...out]
  }
  const has = (ids: string[], prefix: string): boolean => ids.some((x) => x.startsWith(prefix))
  it('比例的意义：国旗、定义、做一做 1（四组都判断得到）、做一做 2、练习八 1、3、5', () => {
    const t = tier1('m6s2-05-meaning')
    for (const x of ['value-2.4∶1.6', 'value-60∶40', 'rect-playground-classroom', 'rect-tiananmen-playground', 'rectwrite-playground-classroom', 'def', 'pick-', 'pairwrite-', `tri-${TRIS[0]!.join('-')}`, 'table-1', 'table-0', 'tablewrite-', 'five-', 'partner-', 'concept-'])
      expect(has(t, x), x).toBe(true)
    for (const [a, b] of PAIRS_MEANING.slice(0, 4)) expect(has(t, `pair-${a}-${b}`), `${a} 和 ${b}`).toBe(true)
    for (const r of VALUE_BOOK.slice(0, 4)) expect(has(t, `value-${r}`), r).toBe(true)
    expect(RECT_PAIRS.length).toBeGreaterThan(3)
  })
  it('比例的基本性质：项、例 1 两问、性质、做一做四组、练习八 2、4、7、14', () => {
    const t = tier1('m6s2-05-property')
    for (const x of ['outer-2.4∶1.6 = 60∶40', 'inner-2.4∶1.6 = 60∶40', 'fracinner-', 'fracouter-', 'product-outer-2.4∶1.6 = 60∶40', 'product-inner-2.4∶1.6 = 60∶40', 'fracproduct-', 'stmt-', 'letters', 'other-', 'four-4-5-12-15', 'fourwrite-4-5-12-15', 'rice-', 'eq-24-3-8-9', 'eq-3-40-8-15', 'terms'])
      expect(has(t, x), x).toBe(true)
    for (const [a, b] of PAIRS_PROPERTY) expect(has(t, `pjudge-${a}-${b}`), `${a} 和 ${b}`).toBe(true)
  })
  it('解比例：例 2、例 3（式子、结果）、做一做 1 三题、做一做 2、练习八 6、8、9、10、11、12、13、15、整理和复习 2', () => {
    const t = tier1('m6s2-05-solve')
    for (const it of SOLVE_BOOK) expect(has(t, `book-${it.terms.join('|')}`), it.terms.join('|')).toBe(true)
    for (const x of ['int-', 'rocket', 'rocket-setup', 'cross-2.4|1.5|6|x', 'disinfect-100-150', 'heart', 'ice-50', 'cond1-5-8-40', 'cond3-2-5-2.5', 'car-24.3', 'terracotta-19.6', 'building-35', 'balls-6-8-40'])
      expect(has(t, x), x).toBe(true)
  })
  it('正比例：例 1（表、比值、变化、图象读数、描点、几倍）、生活中的例子、做一做、练习九 1–7、14', () => {
    const t = tier1('m6s2-05-direct')
    for (const x of ['ribbon-ratio', 'ribbon-meaning', 'ribbon-change', 'ribbon-judge', 'readprice-9', 'readqty-49', 'online-10-35', 'times-2', 'djudge-square', 'djudge-car', 'car-ratio', 'car-meaning', 'carest-120', 'formula', 'power-ratio', 'djudge-magazine', 'djudge-cube', 'djudge-age', 'djudge-wheat', 'djudge-pages', 'fuel-', 'fill-', 'shadow-6', 'even-', 'pencil-7', 'pencil-times-', 'run-'])
      expect(has(t, x), x).toBe(true)
  })
  it('反比例：例 2（表、乘积、意义、变化、推算）、关系式、生活中的例子、做一做、练习九 8–13、正 / 反 / 不成', () => {
    const t = tier1('m6s2-05-inverse')
    for (const x of ['cyl-product', 'cyl-meaning', 'cyl-change', 'cyl-judge', 'cyl-50', 'formula', 'ijudge-price', 'ijudge-rect', 'ijudge-garden', 'ijudge-coal', 'freight-product', 'freight-meaning', 'tiles-', 'vinegar-', 'ifill-', 'phones-8', 'phones-product', 'train-total', 'train-325', 'mixed-factor', 'mixed-speed240'])
      expect(has(t, x), x).toBe(true)
  })
  it('比例尺：意义、例 1、线段 / 数值比例尺、想一想、零件图、做一做、练习十 1–4、练习十二 1(1)', () => {
    const t = tier1('m6s2-05-scale')
    for (const x of ['def', 'find-120-2.4', 'find-15-5', 'kmcm-120', 'bar-50km', 'numline-30000000', 'times-5000000', 'frac-', 'kind-num', 'kind-line', 'parttimes-2', 'zoom-', 'part-5-2', 'room-6-4', 'road', 'road-line', 'bug', 'sjudge-unit', 'toone-'])
      expect(has(t, x), x).toBe(true)
  })
  it('用比例尺求距离：例 2（结果、列比例、换单位）、做一做、例 3 四问、做一做（操场）、练习十 5、7、8、9、10', () => {
    const t = tier1('m6s2-05-scale-use')
    for (const x of ['subway', 'subway-setup', 'subway-km', 'village-num', 'village-3', 'home-west-10000', 'home-north-10000', 'home-east-10000', 'home-bar-10000', 'field-l-80-60-2000', 'field-w-80-60-2000', 'real-5000000-3.4', 'map-1900-40000000', 'table-50000', 'table-2000000', 'table-60000000', 'court-side', 'court-end', 'park-', 'direct-judge'])
      expect(has(t, x), x).toBe(true)
  })
  it('图形的放大与缩小：现象、例 4 放大三个图形、斜边、角和周长、缩小三个图形、做一做两步、练习十一 1、2、练习十二 1(3)', () => {
    const t = tier1('m6s2-05-zoom')
    for (const x of ['ph-camera', 'ph-magnifier', 'ph-projector', 'ph-microscope', 'square-3-2', 'rect-4-2', 'tri-4-3', 'zjudge-hyp', 'zjudge-double', 'angle-', 'perim-', 'shrink-square-6-3', 'shrink-rect-', 'shrink-tri', 'twice-1', 'twice-2', 'pick-', 'ab-3', 'bc-3-2', 'which-', 'kind-', 'rect53-'])
      expect(has(t, x), x).toBe(true)
  })
  it('用比例解决问题：例 5（结果、追问、关系、列比例）、例 6（结果、追问、关系、式子）、做一做 1–2、练习十一 3–5、7–11、整理和复习 4', () => {
    const t = tier1('m6s2-05-apply')
    for (const x of ['water-8-40-10', 'waterback-60', 'water-rel', 'water-setup', 'lamp-100-25-5', 'lampback-30', 'lamp-rel', 'lamp-setup', 'pen1-4-6-3', 'pen2-4-1.5-2', 'shadow-4', 'station-15', 'canal-8', 'truck-400', 'book-6', 'return-90', 'allow1-30', 'allow2-32', 'harvest-30', 'drive1', 'drive2', 'rel-'])
      expect(has(t, x), x).toBe(true)
  })
})

describe('朗读与写法', () => {
  it('词条里：「长」只在长度 / 长方形 / 边长 / 周长 / 棱长里；不写倒、应、转、为、重、方程、括号、英文问号；动词「种」写「栽」', () => {
    for (const [k, val] of Object.entries(ZH)) {
      const t = String(val)
      expect(t.replace(/长度|长方形|边长|周长|棱长/g, ''), k).not.toMatch(/长/)
      expect(t, k).not.toMatch(/倒|转|为|重|方程|[（(]|\?|只种|种植/)
      expect(t.replace(/相对应/g, ''), k).not.toMatch(/应/)
      // 「种」只做量词（两种、一种、某种、这种、哪种、多少种）
      for (const m of t.matchAll(/(.)种/g)) expect('两一某这哪少', `${k}：${m[0]}`).toContain(m[1])
    }
  })
  it('比号一律是「∶」：题干、选项里没有英文冒号的比（时刻 9:00 除外）；朗读读得出「比」', () => {
    for (const kp of KPS)
      each(kp, (q) => {
        const shown = [...q.stem.flatMap((p) => (p.kind === 'text' ? [zh(p.text)] : p.kind === 'expr' ? [p.expr] : [])), ...labels(q)]
        for (const t of shown) expect(t.replace(/\d{1,2}:\d\d(?=\D|$)/g, ''), q.id).not.toMatch(/\d\s*:\s*\d/)
        const speech = [...questionSpeech(q, 'zh'), ...answerSpeech(q, 'zh')].join('')
        expect(speech, q.id).not.toMatch(/∶/)
        // x 只出现在式子里，不单独做答案
        expect(answerText(q), q.id).not.toBe('x')
      }, 40)
  })
  it('朗读的题干和答案里出现的不同小数不太多（每个都是一条音频）', () => {
    for (const kp of KPS) {
      const decs = new Set<string>()
      each(kp, (q) => {
        for (const piece of [...questionSpeech(q, 'zh'), ...answerSpeech(q, 'zh')]) for (const m of piece.match(/\d+\.\d+/g) ?? []) decs.add(m)
      }, 300)
      expect(decs.size, `${kp}：${decs.size} 个不同的小数`).toBeLessThanOrEqual(80)
    }
  })
})
