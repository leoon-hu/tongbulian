import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { ZH } from '../../lang/ops'
import { ADDSUB, BRACKETS, MULDIV, SOLVE } from '../ops'

// 四下「四则运算」的专项检查：从题干参数、算式、表格、树状图反推答案；第 1 档有课本每个例题和做一做；
// 0 不能作除数（不出 a ÷ 0）；运算顺序题的「第一步」真的是第一步；租船、租车的最省钱租法唯一；朗读不踩坑。
const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
function stemsOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }>[] {
  return q.stem.filter((p) => p.kind === kind) as Extract<StemPart, { kind: K }>[]
}
type P = Record<string, number | string | { k: string; p?: P }>
const texts = (q: Question): { k: string; p: P }[] =>
  stemsOf(q, 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as P }))
const exprs = (q: Question): string[] => stemsOf(q, 'expr').map((e) => e.expr)
const n = (p: P, k: string): number => p[k] as number
function correctLabel(q: Question): LStr {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return q.choices!.find((c) => c.id === id)!.label
}
const correctText = (q: Question): string => zh(correctLabel(q))
const correctKey = (q: Question): string => {
  const l = correctLabel(q)
  return typeof l === 'string' ? l : l.k
}
const answer = (q: Question): number => Number(correctText(q))
const wrongLabels = (q: Question): LStr[] => (q.choices ?? []).filter((c) => q.answer.kind === 'choice' && c.id !== q.answer.choiceId).map((c) => c.label)

/** 按运算顺序算（[ ] 当括号）；结果可能是分数 */
function evalArith(expr: string): number {
  const src = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\[/g, '(').replace(/\]/g, ')').trim()
  expect(src, expr).toMatch(/^[\d\s+\-*/()]+$/)
  return new Function(`return (${src})`)() as number
}
/** 「左边 = 右边 = …」把答案代进「?」以后，各段都相等 */
function holds(expr: string, v: number | string): boolean {
  const sides = expr.replace('?', String(v)).split(' = ')
  const vals = sides.map(evalArith)
  return vals.every((x) => Math.abs(x - vals[0]!) < 1e-9)
}

/**
 * 运算顺序：把算式解析成树（先乘除后加减、从左往右，[ ] 和 ( ) 都是括号），按「先左后右、先子后父」的顺序
 * 第一个两边都是数的运算就是第一步（最里层的括号里先算，同一层先乘除）；secondOp 把这一步换成得数再找下一步。
 */
type Node = { v: number } | { op: string; l: Node; r: Node }
function parse(e: string): Node {
  const ts = e.match(/\d+|[+\-×÷()[\]]/g)!
  let i = 0
  const atom = (): Node => {
    const t = ts[i++]!
    if (t === '(' || t === '[') {
      const x = sum()
      i++
      return x
    }
    return { v: Number(t) }
  }
  const prod = (): Node => {
    let x = atom()
    while (ts[i] === '×' || ts[i] === '÷') {
      const op = ts[i++]!
      x = { op, l: x, r: atom() }
    }
    return x
  }
  const sum = (): Node => {
    let x = prod()
    while (ts[i] === '+' || ts[i] === '-') {
      const op = ts[i++]!
      x = { op, l: x, r: prod() }
    }
    return x
  }
  return sum()
}
const isLeaf = (x: Node): x is { v: number } => 'v' in x
function value(x: Node): number {
  if (isLeaf(x)) return x.v
  const [a, b] = [value(x.l), value(x.r)]
  return x.op === '+' ? a + b : x.op === '-' ? a - b : x.op === '×' ? a * b : a / b
}
function firstNode(x: Node): { op: string; l: { v: number }; r: { v: number } } | null {
  if (isLeaf(x)) return null
  if (isLeaf(x.l) && isLeaf(x.r)) return x as { op: string; l: { v: number }; r: { v: number } }
  return firstNode(x.l) ?? firstNode(x.r)
}
function firstOp(e: string): string {
  const f = firstNode(parse(e))!
  return `${f.l.v} ${f.op} ${f.r.v}`
}
/** 第一步换成得数以后的树，再找它的第一步（第二步） */
function secondOp(e: string): string {
  const root = parse(e)
  const f = firstNode(root)!
  const swap = (x: Node): Node => (x === f ? { v: value(f) } : isLeaf(x) ? x : { op: x.op, l: swap(x.l), r: swap(x.r) })
  const g = firstNode(swap(root))!
  return `${g.l.v} ${g.op} ${g.r.v}`
}
/** 树上每一步算出的数 */
function steps(x: Node): number[] {
  if (isLeaf(x)) return []
  return [...steps(x.l), ...steps(x.r), value(x)]
}

describe('运算顺序的小工具（测试自己）', () => {
  it('最先算最里层括号里的，同一层先乘除后加减', () => {
    expect(firstOp('96 ÷ (12 + 4) × 2')).toBe('12 + 4')
    expect(firstOp('96 ÷ [(12 + 4) × 2]')).toBe('12 + 4')
    expect(secondOp('96 ÷ [(12 + 4) × 2]')).toBe('16 × 2')
    expect(steps(parse('96 ÷ [(12 + 4) × 2]'))).toEqual([16, 32, 3])
    expect(firstOp('360 ÷ (70 - 4 × 16)')).toBe('4 × 16')
    expect(firstOp('450 + 390 ÷ 130 - 123')).toBe('390 ÷ 130')
    expect(firstOp('940 × [128 - (154 - 31)]')).toBe('154 - 31')
    expect(firstOp('38 + 56 ÷ 7 × 4')).toBe('56 ÷ 7')
  })
})

/** 各种题：认出来并核对答案；认不出返回 false */
const DEF_ANSWER: Record<string, string> = {
  addDef: 'add',
  subDef: 'sub',
  addend: 'addend',
  sum: 'sum',
  minuend: 'minuend',
  subInverse: 'add',
  mulDef: 'mul',
  divDef: 'div',
  factor: 'factor',
  product: 'product',
  dividend: 'dividend',
  divInverse: 'mul',
  fourOps: 'fourOps',
  bothBrackets: 'inSmall',
  noBrackets: 'mulDivFirst',
  sameLevel: 'leftToRight',
}
const BLANK_ANSWER: Record<string, string> = {
  sumAdd: 'addend',
  addendSub: 'otherAddend',
  diffSub: 'subtrahend',
  subSub: 'diff',
  minAdd: 'diff',
  productMul: 'factor',
  factorDiv: 'otherFactor',
  quotientDiv: 'divisor',
  divisorDiv: 'quotient',
  dividendMul: 'divisor',
  remainder: 'remainder',
}
const ZERO_TRUTH: Record<string, boolean> = {
  add0: true,
  add0Wrong: false,
  sameSub: true,
  sub0: true,
  sub0Wrong: false,
  mul0: true,
  mul0Wrong: false,
  div0: true,
  divisor0: false,
}

/** 租船 / 租车：所有够坐的租法里最便宜的（x 条大的、y 条小的） */
function cheapest(N: number, s: number, ps: number, b: number, pb: number): { x: number; y: number; cost: number }[] {
  let best: { x: number; y: number; cost: number }[] = []
  for (let x = 0; x <= Math.ceil(N / b) + 1; x++) {
    for (let y = 0; y <= Math.ceil(N / s) + 1; y++) {
      if (x * b + y * s < N) continue
      const cost = x * pb + y * ps
      if (!best.length || cost < best[0]!.cost) best = [{ x, y, cost }]
      else if (cost === best[0]!.cost) best.push({ x, y, cost })
    }
  }
  return best
}

function check(q: Question): boolean {
  const ts = texts(q)
  const t0 = ts[0]
  const last = ts[ts.length - 1]
  const es = exprs(q)
  // ── 只有算式的题（0 的运算、例 4、做一做、练习三 1、3）──
  if (!ts.length && es.length === 1) {
    expect(es[0]!.endsWith('= ?'), q.id).toBe(true)
    expect(holds(es[0]!, answer(q)), q.id).toBe(true)
    return true
  }
  const k = t0?.k ?? ''
  const p = t0?.p ?? {}
  if (k.startsWith('m4.ops.rail.')) {
    // 站名和数都在线段图上（段长按实际的数画），题目只问哪两站之间
    const line = stemsOf(q, 'part-line')[0]!
    const labels = line.parts.map((x) => x.label)
    const [x, y] = line.parts.map((s) => s.len) as [number, number]
    const names = (line.names ?? []).map((l) => zh(l))
    expect(names, q.id).toHaveLength(3)
    // 问的两站和图上的站名对得上：参数 from / to 是 a、b、c 里的两个
    const asks = (from: string, to: string, i: number, j: number): void => {
      expect(Object.keys(p).sort(), q.id).toEqual([from, to].sort())
      expect([zh(p[from] as LStr), zh(p[to] as LStr)], q.id).toEqual([names[i], names[j]])
    }
    if (k === 'm4.ops.rail.sum') {
      expect(answer(q), q.id).toBe(x + y)
      expect(labels, q.id).toEqual([`${x} km`, `${y} km`])
      expect(line.total, q.id).toBe('?')
      asks('a', 'c', 0, 2)
    } else if (k === 'm4.ops.rail.second') {
      expect(answer(q), q.id).toBe(y)
      expect(labels, q.id).toEqual([`${x} km`, '?'])
      expect(line.total, q.id).toBe(`${x + y} km`)
      asks('b', 'c', 1, 2)
    } else {
      expect(answer(q), q.id).toBe(x)
      expect(labels, q.id).toEqual(['?', `${y} km`])
      expect(line.total, q.id).toBe(`${x + y} km`)
      asks('a', 'b', 0, 1)
    }
    return true
  }
  if (k === 'm4.ops.direct') {
    // 根据一个算式直接写另一个：已知的成立，要写的把答案代进去也成立，而且用的是同样三个数
    const known = p.e as string
    expect(holds(known, ''), q.id).toBe(true)
    expect(holds(es[0]!, answer(q)), q.id).toBe(true)
    const nums = (s: string): number[] => (s.match(/\d+/g) ?? []).map(Number).sort((a, b) => a - b)
    expect(nums(es[0]!.replace('?', String(answer(q)))), q.id).toEqual(nums(known))
    return true
  }
  if (k.startsWith('m4.ops.q.') && DEF_ANSWER[k.slice(9)]) {
    expect(correctKey(q), q.id).toBe(`m4.ops.w.${DEF_ANSWER[k.slice(9)]}`)
    return true
  }
  if (k === 'm4.ops.q.partName') {
    const e = p.e as string
    const m = e.match(/^(\d+) ([+\-×÷]) (\d+) = (\d+)$/)!
    const [, a, op, b, c] = m
    const num = String(p.n)
    const names: Record<string, [string, string, string]> = {
      '+': ['addend', 'addend', 'sum'],
      '-': ['minuend', 'subtrahend', 'diff'],
      '×': ['factor', 'factor', 'product'],
      '÷': ['dividend', 'divisor', 'quotient'],
    }
    const i = [a, b, c].indexOf(num)
    expect(i, q.id).toBeGreaterThanOrEqual(0)
    expect(correctKey(q), q.id).toBe(`m4.ops.w.${names[op!]![i]}`)
    return true
  }
  if (k === 'm4.ops.q.whichFill') {
    const blank = ts[1]!.k.slice('m4.ops.blank.'.length)
    expect(correctKey(q), q.id).toBe(`m4.ops.w.${BLANK_ANSWER[blank]}`)
    return true
  }
  const RN: Record<string, (p: P) => number> = {
    'm4.ops.rn.minuend': (p) => n(p, 'b') + n(p, 'c'),
    'm4.ops.rn.subtrahend': (p) => n(p, 'a') - n(p, 'c'),
    'm4.ops.rn.addend': (p) => n(p, 's') - n(p, 'x'),
    'm4.ops.rn.dividend': (p) => n(p, 'b') * n(p, 'c'),
    'm4.ops.rn.divisor': (p) => n(p, 'a') / n(p, 'c'),
    'm4.ops.rn.factor': (p) => n(p, 'p') / n(p, 'x'),
    'm4.ops.rn.remDividend': (p) => n(p, 'b') * n(p, 'c') + n(p, 'r'),
    'm4.ops.st.ski': (p) => n(p, 'a') + n(p, 'b'),
    'm4.ops.st.skiPm': (p) => n(p, 't') - n(p, 'a'),
    'm4.ops.st.books': (p) => n(p, 'a') + n(p, 'b'),
    'm4.ops.st.school': (p) => n(p, 't') - n(p, 'a'),
    'm4.ops.fl.total': (p) => n(p, 'a') * n(p, 'n'),
    'm4.ops.fl.vases': (p) => n(p, 't') / n(p, 'a'),
    'm4.ops.fl.each': (p) => n(p, 't') / n(p, 'n'),
    'm4.ops.st.snail': (p) => n(p, 'v') * n(p, 't'),
    'm4.ops.st.snailAvg': (p) => n(p, 'd') / n(p, 't'),
    'm4.ops.st.pencils': (p) => n(p, 'n') / n(p, 'k'),
    'm4.ops.st.elephant': (p) => n(p, 'w') / n(p, 'k'),
    'm4.ops.st.peaches': (p) => n(p, 'n') * n(p, 'k') + n(p, 'r'),
  }
  if (RN[k] && last?.k !== 'm4.ops.q.method') {
    const v = RN[k]!(p)
    expect(Number.isInteger(v), q.id).toBe(true)
    expect(answer(q), q.id).toBe(v)
    if (k === 'm4.ops.rn.remDividend') expect(n(p, 'r'), q.id).toBeLessThan(n(p, 'b'))
    if (k === 'm4.ops.st.peaches') expect(n(p, 'r'), q.id).toBeLessThan(n(p, 'n'))
    return true
  }
  if (last?.k === 'm4.ops.q.method') {
    const add = ['m4.ops.st.ski', 'm4.ops.st.books'].includes(k)
    expect(correctKey(q), q.id).toBe(add ? 'm4.ops.w.add' : 'm4.ops.w.sub')
    return true
  }
  if (k === 'm4.ops.q.verify') {
    // 验算的算式算出来是原来算式里的一个数（不是得数）；别的选项不是
    const m = (p.e as string).match(/^(\d+) ([+\-×÷]) (\d+) = (\d+)$/)!
    const operands = [Number(m[1]), Number(m[3])]
    expect(operands, `${q.id} 对的验算`).toContain(evalArith(correctText(q)))
    for (const w of wrongLabels(q)) expect(operands, `${q.id} 干扰项 ${zh(w)}`).not.toContain(evalArith(zh(w)))
    return true
  }
  if (k === 'm4.ops.fl.toMul') {
    const s = p.s as string
    const parts = s.split(' = ')[0]!.split(' + ')
    const b = Number(parts[0])
    expect(correctText(q), q.id).toBe(`${b} × ${parts.length} = ${b * parts.length}`)
    expect(parts.every((x) => Number(x) === b), q.id).toBe(true)
    for (const w of wrongLabels(q)) expect(zh(w), q.id).not.toBe(correctText(q))
    return true
  }
  if (k.startsWith('m4.ops.z.')) {
    expect(correctKey(q), q.id).toBe(ZERO_TRUTH[k.slice(9)] ? 'm4.ops.right' : 'm4.ops.wrong')
    return true
  }
  if (k === 'm4.ops.fillQ' || k === 'm4.ops.code' || k === 'm4.ops.q.stepFill') {
    expect(es.length, q.id).toBe(1)
    expect(holds(es[0]!, answer(q)), q.id).toBe(true)
    if (k === 'm4.ops.code') expect(answer(q), q.id).toBeLessThan(10)
    return true
  }
  if (k === 'm4.ops.tableFill') {
    // 有余数的除法表：被除数 = 商 × 除数 + 余数，余数比除数小
    const rows = stemsOf(q, 'stat-table')[0]!.rows
    const row = rows[1]!.map((c) => (c === null ? answer(q) : (c as number)))
    const [a, b, c, r] = row as [number, number, number, number]
    expect(a, q.id).toBe(b * c + r)
    expect(r, q.id).toBeLessThan(b)
    expect(r, q.id).toBeGreaterThan(0)
    return true
  }
  if (k === 'm4.ops.st.ship') {
    const v = n(p, 'd') / n(p, 't')
    expect(Number.isInteger(v), q.id).toBe(true)
    const [time, dist] = stemsOf(q, 'stat-table')[0]!.rows
    for (let i = 1; i < time!.length; i++) {
      const tt = time![i] === null ? answer(q) : (time![i] as number)
      const dd = dist![i] === null ? answer(q) : (dist![i] as number)
      expect(dd, q.id).toBe(tt * v)
    }
    expect([...time!, ...dist!].filter((c) => c === null), q.id).toHaveLength(1)
    return true
  }
  if (k === 'm4.ops.fr.q') {
    // 水果代表的数：随便取两组满足已知算式的数，说法对不对要一致
    const known = p.k as string
    const mul = known.includes('×')
    const truthWith = (A: number, B: number): boolean => {
      const C = mul ? A * B : A + B
      const s = es[0]!.replace(/🍎/g, String(A)).replace(/🍌/g, String(B)).replace(/🍇/g, String(C))
      const [l, r] = s.split(' = ')
      return Math.abs(evalArith(l!) - evalArith(r!)) < 1e-9
    }
    const ok = truthWith(3, 5)
    expect(truthWith(7, 4), q.id).toBe(ok)
    expect(correctKey(q), q.id).toBe(ok ? 'm4.ops.right' : 'm4.ops.wrong')
    return true
  }
  if (k === 'm4.ops.q.firstStep') {
    expect(correctText(q), q.id).toBe(firstOp(es[0]!))
    for (const w of wrongLabels(q)) expect(zh(w), q.id).not.toBe(firstOp(es[0]!))
    return true
  }
  if (k === 'm4.ops.q.secondStep') {
    expect(correctText(q), q.id).toBe(secondOp(es[0]!))
    for (const w of wrongLabels(q)) expect(zh(w), q.id).not.toBe(correctText(q))
    return true
  }
  if (k === 'm4.ops.q.treeFill' || k === 'm4.ops.q.treeMerge') {
    const tree = stemsOf(q, 'calc-tree')[0]!
    const calc = (x: number, op: string, y: number): number => evalArith(`${x} ${op} ${y}`)
    let prev = calc(Number(tree.a), tree.steps[0]!.op, Number(tree.b))
    const vals = [prev]
    let combined = `${tree.a} ${tree.steps[0]!.op} ${tree.b}`
    for (const s of tree.steps.slice(1)) {
      const nn = Number(s.n)
      prev = s.left ? calc(nn, s.op, prev) : calc(prev, s.op, nn)
      vals.push(prev)
      combined = s.left ? `${s.n} ${s.op} (${combined})` : `(${combined}) ${s.op} ${s.n}`
    }
    for (const v of vals) expect(Number.isInteger(v), q.id).toBe(true)
    if (k === 'm4.ops.q.treeFill') {
      const ask = tree.steps.findIndex((s) => s.v === '?')
      expect(answer(q), q.id).toBe(vals[ask])
      tree.steps.forEach((s, i) => {
        if (i < ask && s.v !== '') expect(Number(s.v), q.id).toBe(vals[i])
        if (i > ask) expect(s.v, q.id).toBe('')
      })
    } else {
      expect(tree.steps.every((s) => s.v === ''), q.id).toBe(true)
      expect(evalArith(correctText(q)), q.id).toBe(evalArith(combined))
      for (const w of wrongLabels(q)) expect(Math.abs(evalArith(zh(w)) - vals.at(-1)!) > 1e-9, `${q.id} ${zh(w)}`).toBe(true)
    }
    return true
  }
  if (k === 'm4.ops.q.merge') {
    const s3 = p.s3 as string
    const v = Number(s3.split(' = ')[1])
    for (const s of ['s1', 's2', 's3']) expect(holds(p[s] as string, ''), q.id).toBe(true)
    expect(evalArith(correctText(q)), q.id).toBe(v)
    for (const w of wrongLabels(q)) expect(Math.abs(evalArith(zh(w)) - v) > 1e-9, `${q.id} ${zh(w)}`).toBe(true)
    return true
  }
  if (k === 'm4.ops.q.whichIs') {
    expect(evalArith(correctText(q)), q.id).toBe(n(p, 'n'))
    expect(correctText(q), q.id).not.toMatch(/[()[\]]/)
    for (const w of wrongLabels(q)) expect(evalArith(zh(w)), q.id).not.toBe(n(p, 'n'))
    return true
  }
  if (k === 'm4.ops.boat.info' || k === 'm4.ops.car.info') {
    const boat = k === 'm4.ops.boat.info'
    const N = boat ? n(p, 'n') : n(p, 't') + n(p, 'k')
    const [s, ps, b, pb] = [n(p, 's'), n(p, 'ps'), n(p, 'b'), n(p, 'pb')]
    // 每个座位都是整数元；除了「哪种便宜」，都是大的每个座位便宜（课本的两道题都这样）
    expect(ps % s, q.id).toBe(0)
    expect(pb % b, q.id).toBe(0)
    if (ts[1]!.k !== 'm4.ops.boat.cheaper') expect(pb / b, q.id).toBeLessThan(ps / s)
    const best = cheapest(N, s, ps, b, pb)
    const ask = ts[1]!
    const ap = ask.p
    switch (ask.k) {
      case 'm4.ops.boat.seatBig':
      case 'm4.ops.car.seatBig':
        expect(answer(q), q.id).toBe(pb / b)
        return true
      case 'm4.ops.boat.seatSmall':
        expect(answer(q), q.id).toBe(ps / s)
        return true
      case 'm4.ops.boat.cheaper':
        expect(pb / b, q.id).not.toBe(ps / s)
        expect(correctKey(q), q.id).toBe(pb / b < ps / s ? 'm4.ops.boat.big' : 'm4.ops.boat.small')
        return true
      case 'm4.ops.boat.full':
        expect(answer(q), q.id).toBe(Math.floor(N / b))
        return true
      case 'm4.ops.boat.rest':
        expect(n(ap, 'x'), q.id).toBe(Math.floor(N / b))
        expect(answer(q), q.id).toBe(N - n(ap, 'x') * b)
        return true
      case 'm4.ops.boat.cost':
        expect(n(ap, 'x') * b + n(ap, 'y') * s, q.id).toBeGreaterThanOrEqual(N)
        expect(answer(q), q.id).toBe(n(ap, 'x') * pb + n(ap, 'y') * ps)
        return true
      case 'm4.ops.boat.empty':
        expect(answer(q), q.id).toBe(n(ap, 'x') * b + n(ap, 'y') * s - N)
        expect(answer(q), q.id).toBeGreaterThan(0)
        return true
      case 'm4.ops.car.total':
        expect(answer(q), q.id).toBe(N)
        return true
      case 'm4.ops.car.min':
        expect(answer(q), q.id).toBe(best[0]!.cost)
        return true
      case 'm4.ops.boat.best':
      case 'm4.ops.car.best': {
        // 最省钱的租法只有一种，就是正确选项；别的选项都够坐、但更贵
        expect(best, q.id).toHaveLength(1)
        const plan = (l: LStr): { x: number; y: number } => {
          const pp = (typeof l === 'string' ? {} : l.p ?? {}) as P
          return { x: (pp.x as number) ?? 0, y: (pp.y as number) ?? 0 }
        }
        const c = plan(correctLabel(q))
        expect(c, q.id).toEqual({ x: best[0]!.x, y: best[0]!.y })
        for (const w of wrongLabels(q)) {
          const pl = plan(w)
          expect(pl.x * b + pl.y * s, q.id).toBeGreaterThanOrEqual(N)
          expect(pl.x * pb + pl.y * ps, q.id).toBeGreaterThan(best[0]!.cost)
        }
        if (boat) {
          // 例 5 的道理：先坐满大船、剩下的坐一条小船，会空座位，最省钱的不是它
          expect(best[0]!.x * b + best[0]!.y * s, q.id).toBe(N)
          expect(best[0]!.x, q.id).not.toBe(Math.floor(N / b))
        }
        return true
      }
    }
    return false
  }
  if (k === 'm4.ops.plan.info') {
    const ask = ts[1]!
    const [x, y] = [n(ask.p, 'x'), n(ask.p, 'y')]
    expect(x + y, q.id).toBe(10)
    const one = n(p, 'a') * x + n(p, 'c') * y
    const two = n(p, 'g') * (x + y)
    if (ask.k === 'm4.ops.plan.costOne') expect(answer(q), q.id).toBe(one)
    else if (ask.k === 'm4.ops.plan.costTwo') expect(answer(q), q.id).toBe(two)
    else {
      expect(one, q.id).not.toBe(two)
      expect(correctKey(q), q.id).toBe(one < two ? 'm4.ops.plan.one' : 'm4.ops.plan.two')
    }
    return true
  }
  return false
}

describe('四个知识点：答案都对得上', () => {
  for (const kp of [ADDSUB, MULDIV, BRACKETS, SOLVE]) {
    it(`${kp}：认得出每道题、答案对`, () => {
      each(kp, (q) => {
        expect(check(q), `${q.id} 认不出题型`).toBe(true)
      })
    })
  }
})

describe('照课本的约束', () => {
  it('0 不能作除数：哪道题的算式里都没有「÷ 0」', () => {
    for (const kp of [ADDSUB, MULDIV, BRACKETS, SOLVE]) {
      each(kp, (q) => {
        for (const e of exprs(q)) expect(e, q.id).not.toMatch(/÷ 0(?!\d)/)
        for (const c of q.choices ?? []) expect(zh(c.label), q.id).not.toMatch(/÷ 0(?!\d)/)
      })
    }
  })

  it('算式里每一步都是非负整数（除法都能整除、不出负数）', () => {
    for (const kp of [ADDSUB, MULDIV, BRACKETS]) {
      each(kp, (q) => {
        for (const e of exprs(q)) {
          if (/[🍎🍌🍇]/u.test(e)) continue
          for (const side of e.replace('?', String(answer(q))).split(' = ')) {
            for (const v of steps(parse(side))) {
              expect(Number.isInteger(v), `${q.id}：${side}`).toBe(true)
              expect(v, `${q.id}：${side}`).toBeGreaterThanOrEqual(0)
            }
          }
        }
      })
    }
  })

  it('第 1 档：加减法不超过四位数、乘除法的除数（第 1 档）是一位数或给了关系就能直接写', () => {
    each(MULDIV, (q, d) => {
      if (d !== 1) return
      const k = texts(q)[0]?.k
      if (k === 'm4.ops.fillQ') {
        const e = exprs(q)[0]!
        // 求因数、除数：只除以一位数；求被除数：乘法
        const m = e.match(/^(\d+|\?) ([×÷]) (\d+|\?) = (\d+)$/)!
        if (m[2] === '×') expect(Number(m[1] === '?' ? m[3] : m[1]), q.id).toBeLessThan(10)
        if (m[2] === '÷' && m[3] === '?') expect(Number(m[4]), q.id).toBeLessThan(10)
      }
    })
  })

  it('题目文字不写圆括号、不写「长」、「只」前面不放数、量词表外的量词前面不出 2', () => {
    for (const kp of [ADDSUB, MULDIV, BRACKETS, SOLVE]) {
      each(kp, (q) => {
        for (const part of stemsOf(q, 'text')) {
          const s = zh(part.text)
          expect(s, q.id).not.toMatch(/[()（）○]/)
          expect(s, q.id).not.toMatch(/长/)
          expect(s, q.id).not.toMatch(/\d\s*只/)
          expect(s, q.id).not.toMatch(/(?<![\d.])2\s*(枝|副|册|篇|间|笔|台)/)
        }
      })
    }
  })

  it('词条里不写课本没有的名字（减法的性质、除法的性质）', () => {
    for (const v of Object.values(ZH)) expect(String(v)).not.toMatch(/减法的性质|除法的性质/)
  })
})

describe('第 1 档有课本每个例题和做一做', () => {
  // 第 1 档每种题占的份额不大，多跑一些种子看全
  const kinds = (kp: string): Set<string> => {
    const seen = new Set<string>()
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 600; seed++) {
      const q = gen(1, createRng(seed))
      const ts = texts(q)
      const k = ts[0]?.k ?? ''
      if (!ts.length) {
        const e = exprs(q)[0]!
        seen.add(/0/.test(e) && /(?<!\d)0(?!\d)/.test(e) ? 'expr:zero' : e.includes('[') ? 'expr:middle' : e.includes('(') ? 'expr:small' : 'expr:plain')
      } else if (k === 'm4.ops.boat.info') seen.add(ts[1]!.k)
      else if (k === 'm4.ops.q.whichFill') seen.add(`blank:${ts[1]!.k}`)
      else seen.add(k)
    }
    return seen
  }
  it('加、减法：例 1 三问（线段图）、做一做、名称与关系、由关系求未知数、练习一 1 的应用题', () => {
    const s = kinds(ADDSUB)
    for (const k of ['m4.ops.rail.sum', 'm4.ops.rail.second', 'm4.ops.rail.first', 'm4.ops.direct', 'm4.ops.q.addDef', 'm4.ops.q.subDef', 'm4.ops.q.addend', 'm4.ops.q.sum', 'm4.ops.q.minuend', 'm4.ops.q.subInverse', 'm4.ops.q.partName', 'blank:m4.ops.blank.minAdd', 'blank:m4.ops.blank.subSub', 'm4.ops.rn.minuend', 'm4.ops.fillQ', 'm4.ops.st.ski', 'm4.ops.st.school']) {
      expect(s.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
  })
  it('乘、除法：例 2 插花三问与写成乘法、名称与关系（含有余数）、做一做、例 3 有关 0 的运算（算和判断）', () => {
    const s = kinds(MULDIV)
    for (const k of ['m4.ops.fl.total', 'm4.ops.fl.vases', 'm4.ops.fl.each', 'm4.ops.fl.toMul', 'm4.ops.q.mulDef', 'm4.ops.q.divDef', 'm4.ops.q.factor', 'm4.ops.q.product', 'm4.ops.q.dividend', 'm4.ops.q.divInverse', 'blank:m4.ops.blank.remainder', 'blank:m4.ops.blank.dividendMul', 'm4.ops.rn.remDividend', 'm4.ops.direct', 'expr:zero', 'm4.ops.z.divisor0', 'm4.ops.z.mul0']) {
      expect(s.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
  })
  it('括号：例 4 三种（不加、小括号、中括号）、第一步 / 第二步、递等式填数；做一做；四则运算的名称和先算哪里', () => {
    const s = kinds(BRACKETS)
    for (const k of ['expr:plain', 'expr:small', 'expr:middle', 'm4.ops.q.firstStep', 'm4.ops.q.secondStep', 'm4.ops.q.stepFill', 'm4.ops.q.fourOps', 'm4.ops.q.bothBrackets']) {
      expect(s.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
    // 做一做的两种：a ÷ (b - c × d)、a ÷ [(b + c) ÷ d]
    const forms = new Set<string>()
    each(BRACKETS, (q, d) => {
      if (d !== 1 || texts(q).length) return
      const e = exprs(q)[0]!
      if (/^\d+ ÷ \(\d+ - \d+ × \d+\) = \?$/.test(e)) forms.add('A')
      if (/^\d+ ÷ \[\(\d+ \+ \d+\) ÷ \d+\] = \?$/.test(e)) forms.add('B')
    })
    expect([...forms].sort()).toEqual(['A', 'B'])
  })
  it('解决问题：例 5 每一步（每个座位多少元、哪种便宜、坐满几条大船、还剩几人、一共多少元、空几个座位、最省钱）', () => {
    const s = kinds(SOLVE)
    for (const k of ['m4.ops.boat.seatBig', 'm4.ops.boat.seatSmall', 'm4.ops.boat.cheaper', 'm4.ops.boat.full', 'm4.ops.boat.rest', 'm4.ops.boat.cost', 'm4.ops.boat.empty', 'm4.ops.boat.best']) {
      expect(s.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
  })
})

describe('第 2 档放练习里的题', () => {
  it('树状图、同一组数加不同的括号、改写成综合算式、租车、两种方案、宇宙飞船表、水果算式都出得到', () => {
    const seen = new Set<string>()
    for (const kp of [MULDIV, BRACKETS, SOLVE]) {
      each(kp, (q, d) => {
        if (d !== 2) return
        const ts = texts(q)
        seen.add(ts[0]?.k ?? 'expr')
        if (ts[0]?.k === 'm4.ops.car.info' || ts[0]?.k === 'm4.ops.plan.info') seen.add(ts[1]!.k)
      })
    }
    for (const k of ['m4.ops.q.treeFill', 'm4.ops.q.treeMerge', 'm4.ops.q.merge', 'm4.ops.car.best', 'm4.ops.car.min', 'm4.ops.plan.which', 'm4.ops.plan.costOne', 'm4.ops.st.ship', 'm4.ops.fr.q', 'm4.ops.tableFill', 'm4.ops.st.peaches']) {
      expect(seen.has(k), `第 2 档缺 ${k}`).toBe(true)
    }
  })
})
