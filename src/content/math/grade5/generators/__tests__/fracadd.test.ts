import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { DO_DIFF, DO_MIXED, DO_SAME, EASY_BOOK } from '../fracadd'

// 五下「分数的加法和减法」：从题目（算式、题干的参数、表里的数、图）反推答案，150 种子 × 三档；外加课本的规矩——
// 结果是最简分数（真分数或假分数）或整数、没有带分数，选项里没有等值的两种写法；第 1 档出得到例题和做一做。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KPS = ['m5s2-07-same', 'm5s2-07-diff', 'm5s2-07-mixed', 'm5s2-07-laws'] as const
type Param = LStr | number

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void, seeds = SEEDS): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const texts = (q: Question): { k: string; p: Record<string, Param> }[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const lastText = (q: Question): { k: string; p: Record<string, Param> } => texts(q)[texts(q).length - 1]!
const exprs = (q: Question): string[] => q.stem.filter((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr').map((p) => p.expr)
const table = (q: Question): Extract<StemPart, { kind: 'stat-table' }> | undefined => q.stem.find((p): p is Extract<StemPart, { kind: 'stat-table' }> => p.kind === 'stat-table')
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const answerText = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const keyOf = (l: Param | undefined): string => (l as { k: string }).k

// ── 测试自己的分数算法（不用生成器里的函数）──
interface F {
  n: number
  d: number
}
const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b))
const f = (n: number, d = 1): F => {
  const k = g(n, d) || 1
  return { n: n / k, d: d / k }
}
const add = (a: F, b: F): F => f(a.n * b.d + b.n * a.d, a.d * b.d)
const sub = (a: F, b: F): F => f(a.n * b.d - b.n * a.d, a.d * b.d)
const eq = (a: F, b: F): boolean => a.n * b.d === b.n * a.d
const lt = (a: F, b: F): boolean => a.n * b.d < b.n * a.d
const num = (s: string): F => {
  const m = /^(\d+)\/(\d+)$/.exec(s.trim())
  return m ? f(Number(m[1]), Number(m[2])) : f(Number(s.trim()))
}
/** 算式的值：整数、分数、+ −、小括号；sub 把「?」「x」换成给的数 */
function value(src: string, put?: string): F {
  const s = put === undefined ? src : src.replace(/\?|\bx\b/g, put)
  const toks = s.replace(/−/g, '-').match(/\d+\/\d+|\d+|[-+()]/g) ?? []
  let i = 0
  const atom = (): F => {
    const t = toks[i++]!
    if (t === '(') {
      const v = expr()
      i++
      return v
    }
    return num(t)
  }
  const expr = (): F => {
    let v = atom()
    while (i < toks.length && (toks[i] === '+' || toks[i] === '-')) {
      const op = toks[i++]
      const r = atom()
      v = op === '+' ? add(v, r) : sub(v, r)
    }
    return v
  }
  return expr()
}
const leftOf = (e: string): string => e.split('=')[0]!
/** 「… = …」两边相等吗（? 或 x 换成 put） */
const holds = (e: string, put: string): boolean => {
  const [l, r] = e.split('=') as [string, string]
  return eq(value(l, put), value(r, put))
}
/** 选项的值（分数、整数） */
const isNum = (s: string): boolean => /^\d+(\/\d+)?$/.test(s)
const valueOfAnswer = (q: Question): F => num(answerText(q))
const tableRows = (q: Question): (string | number | null)[][] => table(q)!.rows.map((r) => r.map((c) => (c === null ? null : typeof c === 'number' ? c : zh(c))))
/** 表里某一行（第一格是名字）的分数 */
function tableValue(q: Question, name: string, col = 1): F {
  const row = tableRows(q).find((r) => r[0] === name)!
  return num(String(row[col]))
}

describe('分数的加法和减法：结果与选项的写法', () => {
  for (const kp of KPS) {
    it(`${kp}：分数答案是最简分数或整数，没有带分数；选项的值互不相同`, () => {
      each(kp, (q) => {
        if (q.answer.kind === 'number') {
          expect(Number.isInteger(q.answer.value) && q.answer.value >= 0, q.id).toBe(true)
          return
        }
        const ls = labels(q)
        for (const l of ls) expect(l, `${q.id} 不出带分数`).not.toMatch(/ /)
        const nums = ls.filter(isNum)
        if (nums.length !== ls.length) return
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

describe('分数的加法和减法：从题目反推答案', () => {
  it('同分母分数加、减法', () => {
    each('m5s2-07-same', (q) => {
      const kind = kindOf(q)
      const t = lastText(q)
      const e = exprs(q)
      const ans = answerText(q)
      if (kind === 'cake') {
        const a = num(String(t.p.a))
        const b = num(String(t.p.b))
        const want = t.k.endsWith('.add') ? add(a, b) : sub(a, b)
        expect(eq(valueOfAnswer(q), want), q.id).toBe(true)
        // 图：圆平均分的份数等于分母，涂的份数是两个分子
        const pic = q.stem.find((p): p is Extract<StemPart, { kind: 'frac-shape' }> => p.kind === 'frac-shape')!.items[0]!
        const [an, ad] = String(t.p.a).split('/').map(Number) as [number, number]
        const [bn] = String(t.p.b).split('/').map(Number) as [number]
        expect([pic.parts, pic.shaded.length, pic.alt?.length], q.id).toEqual([ad, an, bn])
      } else if (kind === 'units') {
        const [a, op, b] = e[0]!.split(' ') as [string, string, string]
        const u = num(String(t.p.u))
        const r = op === '+' ? add(num(a), num(b)) : sub(num(a), num(b))
        expect(q.answer.kind).toBe('number')
        expect(eq(f((q.answer as { value: number }).value * u.n, u.d), r), q.id).toBe(true)
      } else if (kind === 'seg') {
        const part = q.stem.find((p): p is Extract<StemPart, { kind: 'seg-braces' }> => p.kind === 'seg-braces')!
        const ask = part.braces.find((b) => b.label === '?')!
        // 括号上写的分数和它括住的段数一致
        for (const b of part.braces.filter((x) => x.label !== '?')) expect(eq(num(b.label), f(b.to - b.from, part.parts)), q.id).toBe(true)
        expect(eq(valueOfAnswer(q), f(ask.to - ask.from, part.parts)), q.id).toBe(true)
        expect(Math.max(...part.braces.map((b) => b.to)), `${q.id} 括号不出线段`).toBeLessThanOrEqual(part.parts)
      } else if (kind === 'rule') {
        const want = { 'm5.fadd.rule.what': '分子', 'm5.fadd.rule.keep': '分母', 'm5.fadd.rule.reduce': '最简分数' }[t.k]
        expect(ans, q.id).toBe(want)
      } else if (kind === 'fill') {
        const good = labels(q).filter((l) => holds(e[0]!, l))
        expect(good, q.id).toEqual([ans])
      } else if (kind === 'which') {
        const target = num(String(t.p.f))
        for (const l of labels(q)) expect(eq(value(l), target), `${q.id} ${l}`).toBe(l === ans)
      } else if (kind === 'grades') {
        const row = tableRows(q)[1]!
        const vals = row.map((c) => (c === null ? null : num(String(c))))
        const nameIdx = (p: Param | undefined): number => Number(keyOf(p).slice(-1)) - 1
        if (q.id.includes('six')) {
          expect(vals[5], q.id).toBeNull()
          const five = vals.slice(0, 5).reduce((s, v) => add(s!, v!), f(0))!
          expect(eq(valueOfAnswer(q), sub(f(1), five)), q.id).toBe(true)
        } else if (t.k === 'm5.fadd.gr.sum') expect(eq(valueOfAnswer(q), add(vals[nameIdx(t.p.x)]!, vals[nameIdx(t.p.y)]!)), q.id).toBe(true)
        else expect(eq(valueOfAnswer(q), sub(vals[nameIdx(t.p.x)]!, vals[nameIdx(t.p.y)]!)), q.id).toBe(true)
      } else if (kind === 'lib') {
        const rows = tableRows(q).slice(1)
        const of = (p: Param | undefined): F => num(String(rows.find((r) => r[0] === zh(p as LStr))![1]))
        const three = rows.filter((r) => r[1] !== null).reduce((s, r) => add(s, num(String(r[1]))), f(0))
        if (t.k === 'm5.fadd.lib.three') expect(eq(valueOfAnswer(q), three), q.id).toBe(true)
        else if (t.k === 'm5.fadd.lib.askOther') expect(eq(valueOfAnswer(q), sub(f(1), three)), q.id).toBe(true)
        else if (t.k === 'm5.fadd.lib.sum') expect(eq(valueOfAnswer(q), add(of(t.p.x), of(t.p.y))), q.id).toBe(true)
        else expect(eq(valueOfAnswer(q), sub(of(t.p.x), of(t.p.y))), q.id).toBe(true)
      } else if (kind === 'cmp') {
        const [x, y] = e[0]!.split(' ○ ') as [string, string]
        const vx = value(x)
        const vy = value(y)
        expect(ans, q.id).toBe(eq(vx, vy) ? '=' : lt(vx, vy) ? '<' : '>')
      } else if (kind === 'ribbon') {
        expect(eq(valueOfAnswer(q), add(num(String(t.p.a)), num(String(t.p.b)))), q.id).toBe(true)
      } else {
        // 计算题：「… = ?」
        expect(e.length, q.id).toBeGreaterThan(0)
        expect(e[0]!.endsWith('= ?'), q.id).toBe(true)
        expect(eq(valueOfAnswer(q), value(leftOf(e[0]!))), q.id).toBe(true)
      }
    })
  })

  it('异分母分数加、减法', () => {
    each('m5s2-07-diff', (q) => {
      const kind = kindOf(q)
      const t = lastText(q)
      const e = exprs(q)
      const ans = answerText(q)
      if (kind === 'trash') {
        const name = (p: Param | undefined): string => zh(p as LStr)
        if (t.k === 'm5.fadd.tr.which') {
          const [x, y] = [name(t.p.x), name(t.p.y)]
          expect(ans, q.id).toBe(lt(tableValue(q, x), tableValue(q, y)) ? y : x)
        } else {
          const [a, b] = [tableValue(q, name(t.p.x)), tableValue(q, name(t.p.y))]
          expect(eq(valueOfAnswer(q), t.k === 'm5.fadd.tr.sum' ? add(a, b) : sub(a, b)), q.id).toBe(true)
        }
      } else if (kind === 'tongfen') {
        const [a, op, b] = e[0]!.split(' ') as [string, string, string]
        const [A, B] = [num(a), num(b)]
        const D = (A.d * B.d) / g(A.d, B.d)
        // 正确的写法：两个数都没变、分母是最小公倍数；别的写法都不是
        const ok = (l: string): boolean => {
          const [x, o, y] = l.split(' ') as [string, string, string]
          const [xn, xd] = x.split('/').map(Number) as [number, number]
          const [yn, yd] = y.split('/').map(Number) as [number, number]
          return o === op && xd === D && yd === D && eq(f(xn, xd), A) && eq(f(yn, yd), B)
        }
        for (const l of labels(q)) expect(ok(l), `${q.id} ${l}`).toBe(l === ans)
      } else if (kind === 'flour') {
        const [a, b] = [num(String(t.p.a)), num(String(t.p.b))]
        expect(eq(valueOfAnswer(q), t.k.endsWith('.sum') ? add(a, b) : sub(a, b)), q.id).toBe(true)
      } else if (kind === 'rule') {
        expect(ans, q.id).toBe('通分')
      } else if (kind === 'judge') {
        const [l, r] = e[0]!.split(' = ') as [string, string]
        expect(ans, q.id).toBe(eq(value(l), num(r)) ? '对' : '不对')
      } else if (kind === 'trees') {
        const done = value('1/4 + 3/8 + 3/10')
        expect(eq(valueOfAnswer(q), q.id.includes('done') ? done : sub(f(1), done)), q.id).toBe(true)
      } else if (kind === 'yarn') {
        const want = q.id.includes('used') ? value('7/10 + 1/20') : q.id.includes('left') ? value('1 - 7/10 - 1/20') : value('7/10 - 1/20')
        expect(eq(valueOfAnswer(q), want), q.id).toBe(true)
      } else if (kind === 'verify') {
        // 被验算的那道算式是对的；验算的算式只有正确答案成立
        expect(holds(e[0]!, '0'), q.id).toBe(true)
        expect(labels(q).filter((l) => holds(l, '0')), q.id).toEqual([ans])
      } else if (kind === 'eq') {
        expect(labels(q).filter((l) => holds(e[0]!, l)), q.id).toEqual([ans])
      } else {
        expect(e[e.length - 1]!.endsWith('= ?'), q.id).toBe(true)
        expect(eq(valueOfAnswer(q), value(leftOf(e[e.length - 1]!))), q.id).toBe(true)
      }
    })
  })

  it('分数加减混合运算', () => {
    each('m5s2-07-mixed', (q) => {
      const kind = kindOf(q)
      const t = lastText(q)
      const e = exprs(q)
      const ans = answerText(q)
      if (kind === 'forest') {
        const [tree, bush, grass] = ['乔木林', '灌木林', '草地'].map((n) => tableValue(q, n)) as [F, F, F]
        const want = q.id.includes('more') ? sub(add(tree, bush), grass) : q.id.includes('all') ? add(tree, bush) : sub(tree, bush)
        expect(eq(valueOfAnswer(q), want), q.id).toBe(true)
      } else if (kind === 'oneshot') {
        const src = e[0]!
        const nums = src.match(/\d+\/\d+/g)!.map(num)
        const D = nums.reduce((m, x) => (m * x.d) / g(m, x.d), 1)
        const ok = (l: string): boolean => {
          const parts = l.match(/\d+\/\d+/g)!
          return l.replace(/\d+\/\d+/g, '#') === src.replace(/\d+\/\d+/g, '#') && parts.every((p, i) => Number(p.split('/')[1]) === D && eq(num(p), nums[i]!))
        }
        for (const l of labels(q)) expect(ok(l), `${q.id} ${l}`).toBe(l === ans)
      } else if (kind === 'rain') {
        const rows = tableRows(q)
        const forest = num(String(rows[1]![1]))
        const bare = rows[2]!
        if (q.id.includes('bare')) {
          expect(bare[1], q.id).toBeNull()
          expect(eq(valueOfAnswer(q), sub(sub(f(1), num(String(bare[2]))), num(String(bare[3])))), q.id).toBe(true)
        } else expect(eq(valueOfAnswer(q), sub(forest, num(String(bare[1])))), q.id).toBe(true)
        // 森林那一行三项加起来是 1
        expect(eq(rows[1]!.slice(1).reduce<F>((s, c) => add(s, num(String(c))), f(0)), f(1)), q.id).toBe(true)
      } else if (kind === 'order') {
        const src = e[0]!
        const inner = /\(([^)]+)\)/.exec(src)
        const want = inner ? inner[1] : src.split(' ').slice(0, 3).join(' ')
        expect(ans, q.id).toBe(want)
      } else if (kind === 'juice') {
        // 一杯纯果汁先喝 a 杯，兑满水，再喝一半（all：全部喝完）：纯果汁 a + (1 − a) × k，水 a × k
        const a = num(String(texts(q)[0]!.p.a))
        const k = texts(q)[0]!.k.endsWith('.all') ? f(1) : f(1, 2)
        const second = f((a.d - a.n) * k.n, a.d * k.d)
        const want = t.k.endsWith('askJuice') ? add(a, second) : t.k.endsWith('askWater') ? f(a.n * k.n, a.d * k.d) : second
        expect(eq(valueOfAnswer(q), want), q.id).toBe(true)
      } else if (kind === 'wire') {
        if (q.id.includes('third')) expect(eq(valueOfAnswer(q), value('1 - 1/4 - 3/8')), q.id).toBe(true)
        else expect(ans, q.id).toBe('等腰三角形')
      } else if (kind === 'visit') {
        expect(eq(valueOfAnswer(q), value('1 - 1/5 - 3/10')), q.id).toBe(true)
      } else if (kind === 'square') {
        expect(labels(q).filter((l) => holds(e[0]!, l)), q.id).toEqual([ans])
      } else if (kind === 'tangram') {
        // 从图上的多边形算面积：编号写在每块的中心（按顺序一块一个号）
        const geo = q.stem.find((p): p is Extract<StemPart, { kind: 'geo' }> => p.kind === 'geo')!.figs[0]!
        const polys = geo.items.filter((i): i is Extract<typeof i, { t: 'poly' }> => i.t === 'poly')
        const nos = geo.items.filter((i): i is Extract<typeof i, { t: 'text' }> => i.t === 'text').map((i) => Number(i.text))
        const area = (pts: [number, number][]): number => Math.abs(pts.reduce((s, [x1, y1], i) => s + x1 * pts[(i + 1) % pts.length]![1] - pts[(i + 1) % pts.length]![0] * y1, 0)) / 2
        const areas = polys.map((p) => area(p.pts as [number, number][]))
        const total = areas.reduce((s, x) => s + x, 0)
        const ask = String(t.p.n).split('、').map(Number)
        const part = ask.reduce((s, no) => s + areas[nos.indexOf(no)]!, 0)
        expect(eq(valueOfAnswer(q), f(Math.round(part), Math.round(total))), q.id).toBe(true)
      } else {
        expect(e[e.length - 1]!.endsWith('= ?'), q.id).toBe(true)
        expect(eq(valueOfAnswer(q), value(leftOf(e[e.length - 1]!))), q.id).toBe(true)
      }
    })
  })

  it('整数加法运算律推广到分数', () => {
    each('m5s2-07-laws', (q) => {
      const kind = kindOf(q)
      const e = exprs(q)
      const ans = answerText(q)
      if (kind === 'law') {
        const want = q.id.includes('comm') ? '加法交换律' : q.id.includes('assoc') ? '加法结合律' : '加法交换律和加法结合律'
        expect(ans, q.id).toBe(want)
        // 等式两边真的相等
        const whole = e.join(' ')
        const [l, r] = whole.split(/ ?= /) as [string, string]
        expect(eq(value(l), value(r)), q.id).toBe(true)
      } else if (kind === 'cmp') {
        const [x, y] = e[0]!.split(' ○ ') as [string, string]
        expect(ans, q.id).toBe(eq(value(x), value(y)) ? '=' : lt(value(x), value(y)) ? '<' : '>')
      } else if (kind === 'box') {
        expect(labels(q).filter((l) => holds(e[0]!, l)), q.id).toEqual([ans])
      } else if (kind === 'partner') {
        // 先算的是分母相同的那两个数（凑成整数，或像 1/12 + 7/12 这样同分母先加）
        const sameDen = (l: string): boolean => new Set(l.match(/\d+\/(\d+)/g)!.map((x) => x.split('/')[1])).size === 1
        for (const l of labels(q)) expect(sameDen(l), `${q.id} ${l}`).toBe(l === ans)
      } else {
        expect(e[0]!.endsWith('= ?'), q.id).toBe(true)
        expect(eq(valueOfAnswer(q), value(leftOf(e[0]!))), q.id).toBe(true)
      }
    })
  })
})

describe('分数的加法和减法：第 1 档出得到例题和做一做（G12）', () => {
  const tier1 = (kp: string): Question[] => {
    const out: Question[] = []
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 600; seed++) out.push(gen(1, createRng(seed)))
    return out
  }
  it('同分母：例 1 的饼、几个 1/8、线段图、法则，做一做的 8 道计算', () => {
    const qs = tier1('m5s2-07-same')
    const kinds = new Set(qs.map(kindOf))
    for (const k of ['cake', 'units', 'seg', 'do', 'rule']) expect(kinds.has(k), k).toBe(true)
    const done = new Set(qs.flatMap(exprs).map((x) => x.replace(' = ?', '')))
    for (const [a, op, b] of DO_SAME) expect(done.has(`${a} ${op} ${b}`), `${a} ${op} ${b}`).toBe(true)
    // 课本的两幅线段图：2/5 + 2/5、6/7 − 2/7
    expect(qs.some((q) => q.id.endsWith('seg-add-2-2-5')) && qs.some((q) => q.id.endsWith('seg-sub-6-2-7'))).toBe(true)
  })
  it('异分母：垃圾分类、配图、通分这一步、法则，做一做的计算与玉米面', () => {
    const qs = tier1('m5s2-07-diff')
    const kinds = new Set(qs.map(kindOf))
    for (const k of ['trash', 'pic', 'tongfen', 'do', 'flour', 'rule']) expect(kinds.has(k), k).toBe(true)
    const done = new Set(qs.flatMap(exprs).map((x) => x.replace(' = ?', '')))
    for (const [a, op, b] of DO_DIFF) expect(done.has(`${a} ${op} ${b}`), `${a} ${op} ${b}`).toBe(true)
    expect(qs.some((q) => q.id.includes('flour-') && q.id.endsWith('4/5-3/4'))).toBe(true)
  })
  it('混合运算：植被表（两种通分）、降水表（两种算法）、运算顺序、做一做 1 的四对、喝果汁', () => {
    const qs = tier1('m5s2-07-mixed')
    const kinds = new Set(qs.map(kindOf))
    for (const k of ['forest', 'oneshot', 'rain', 'ways', 'mix', 'order', 'juice']) expect(kinds.has(k), k).toBe(true)
    const done = new Set(qs.flatMap(exprs).map((x) => x.replace(' = ?', '')))
    for (const pair of DO_MIXED) for (const s of pair) expect(done.has(s), s).toBe(true)
    expect(qs.some((q) => q.id.endsWith('juice-j-1/2')) && qs.some((q) => q.id.endsWith('juice-w-1/2'))).toBe(true)
  })
  it('运算律：用的什么运算律、比一比、括号里填数、试着计算与做一做 2 的简便计算、先算哪两个数', () => {
    const qs = tier1('m5s2-07-laws')
    const kinds = new Set(qs.map(kindOf))
    for (const k of ['law', 'cmp', 'box', 'easy', 'partner']) expect(kinds.has(k), k).toBe(true)
    const done = new Set(qs.flatMap(exprs).map((x) => x.replace(' = ?', '')))
    for (const s of EASY_BOOK.slice(0, 4)) expect(done.has(s), s).toBe(true)
  })
})
