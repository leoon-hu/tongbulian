import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { BALLS, BILL, BOOKS, DIVE, DO_CALC, FIX_17, MIXED_17, RECEIPTS, RECORDS, ROUTES, SEQS, SHOP, WEIGHT } from '../decadd'

// 四下「小数的加法和减法」：从题目（算式、竖式、题干的参数、表里的数）反推答案，150 种子 × 三档；外加 G14 的约束——
// 小数的答案只用选项卡、选项里没有等值的两种写法、正确答案不能从写法上认出来；竖式按小数点对齐；第 1 档出得到例题和做一做。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KPS = ['m4s2-06-addsub', 'm4s2-06-mixed', 'm4s2-06-laws'] as const
type Param = LStr | number

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const texts = (q: Question): { k: string; p: Record<string, Param> }[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const textOf = (q: Question): { k: string; p: Record<string, Param> } => texts(q)[texts(q).length - 1]!
const exprs = (q: Question): string[] => q.stem.filter((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr').map((p) => p.expr)
const vertical = (q: Question): Extract<StemPart, { kind: 'dec-vertical' }> | undefined => q.stem.find((p): p is Extract<StemPart, { kind: 'dec-vertical' }> => p.kind === 'dec-vertical')
const table = (q: Question): Extract<StemPart, { kind: 'stat-table' }> | undefined => q.stem.find((p): p is Extract<StemPart, { kind: 'stat-table' }> => p.kind === 'stat-table')
const answerText = (q: Question): string => {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}

// ── 测试自己的算法（不用生成器里的函数）：千分之几的整数 ──
const m = (s: string): number => {
  const [i = '0', f = ''] = s.split('.')
  return Number(i) * 1000 + Number(`${f}000`.slice(0, 3))
}
/** 算式的值：数、分数、+ −、小括号；结果是千分之几 */
function evaluate(src: string): number {
  const toks = src.replace(/-/g, '-').match(/\d+\/\d+|\d+(?:\.\d+)?|[-+()]/g) ?? []
  let i = 0
  const atom = (): number => {
    const t = toks[i++]!
    if (t === '(') {
      const v = expr()
      i++
      return v
    }
    if (t.includes('/')) {
      const [a, b] = t.split('/').map(Number) as [number, number]
      return (a * 1000) / b
    }
    return m(t)
  }
  const expr = (): number => {
    let v = atom()
    while (i < toks.length && (toks[i] === '+' || toks[i] === '-')) {
      const op = toks[i++]
      const r = atom()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  return expr()
}
/** 选项 / 答案的值（千分之几），钱数「162.80」照样能读 */
const valueOf = (q: Question): number => (q.answer.kind === 'number' ? q.answer.value * 1000 : m(answerText(q)))
const bookPrice = (p: Param | undefined): string => {
  const id = (p as { k: string }).k.split('.').pop()!
  return BOOKS.find((b) => b.id === id)!.price
}

describe('小数的加法和减法：G14 的选项规矩', () => {
  for (const kp of KPS) {
    it(`${kp}：得数是小数只用选项卡；选项没有等值的两种写法；至少还有一个选项和正确答案一样多位小数`, () => {
      each(kp, (q) => {
        if (q.answer.kind === 'number') {
          expect(Number.isInteger(q.answer.value), q.id).toBe(true)
          return
        }
        const labels = q.choices!.map((c) => zh(c.label))
        const nums = labels.filter((s) => /^\d+(\.\d+)?$/.test(s))
        if (nums.length !== labels.length) return // 文字 / 算式选项
        // 「和谁先加」「□ 里填几」的选项就是算式里的几个数：凑成整数本来就要找小数位数一样的，不算从写法上认出答案
        if (['partner', 'swap'].includes(kindOf(q))) return
        expect(new Set(nums.map(m)).size, `${q.id} 选项里有等值的两种写法：${labels.join(' / ')}`).toBe(nums.length)
        const ans = answerText(q)
        const places = (s: string): number => (s.split('.')[1] ?? '').length
        const same = nums.filter((s) => s !== ans && places(s) === places(ans))
        expect(same.length, `${q.id} 正确答案的写法和别的选项都不一样：${labels.join(' / ')}`).toBeGreaterThanOrEqual(1)
        // 答案是整数（得数是整数）只走数字键盘那条路，不出现在选项卡里冒充小数题
        expect(ans.includes('.') || nums.every((s) => !s.includes('.')), q.id).toBe(true)
      })
    })
  }
})

describe('竖式：按小数点对齐（改错题照课本写错的样子）', () => {
  it('没有写好得数的竖式：每行的小数点在同一列，整数的个位挨着小数点那一列；数和横式里的一样', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        const v = vertical(q)
        if (!v || v.result !== undefined) return
        const width = v.lines[0]!.length
        for (const l of v.lines) expect(l.length, q.id).toBe(width)
        const dots = v.lines.filter((l) => l.includes('.')).map((l) => l.indexOf('.'))
        expect(new Set(dots).size, `${q.id} 小数点没对齐：${v.lines.join(' | ')}`).toBe(1)
        const col = dots[0]!
        for (const l of v.lines.filter((x) => !x.includes('.'))) {
          expect(l[col], `${q.id} 整数的小数点那一列应该空着`).toBe(' ')
          expect(l[col - 1], `${q.id} 整数的个位要对齐个位`).toMatch(/\d/)
        }
        const e = exprs(q)[0]
        if (e && e.endsWith('= ?')) {
          const nums = e.match(/\d+(?:\.\d+)?/g)!
          expect(v.lines.map((l) => l.trim())).toEqual(nums)
        }
      })
    }
  })
})

describe('小数加减法（m4s2-06-addsub）：反推答案', () => {
  it('每种题的得数都对', () => {
    each('m4s2-06-addsub', (q) => {
      const kind = kindOf(q)
      const { k, p } = textOf(q)
      const v = valueOf(q)
      switch (kind) {
        case 'books': {
          const a = m(bookPrice(p.x))
          const b = m(bookPrice(p.y))
          expect(m(String(p.p))).toBe(a)
          expect(v, q.id).toBe(k.endsWith('.add') ? a + b : a - b)
          if (!k.endsWith('.add')) expect(a).toBeGreaterThan(b)
          break
        }
        case 'do':
        case 'oral':
        case 'calc':
          expect(v, q.id).toBe(evaluate(exprs(q)[0]!.replace(' = ?', '')))
          break
        case 'weight': {
          if (q.id.endsWith('most')) {
            expect(answerText(q)).toBe('10 岁')
            break
          }
          const a = p.a as number
          const b = p.b as number
          expect(v, q.id).toBe(m(WEIGHT[b - 7]!) - m(WEIGHT[a - 7]!))
          break
        }
        case 'align':
          expect(answerText(q)).toBe('小数点')
          break
        case 'pad':
          expect(answerText(q)).toBe('添上 0 再减')
          break
        case 'judge': {
          // 写好的竖式：小数点对齐、得数也对才算「对」
          const w = vertical(q)!
          const dots = [...w.lines, w.result!].filter((l) => l.includes('.')).map((l) => l.indexOf('.'))
          const aligned = new Set(dots).size === 1 && !w.result!.trim().includes(' ')
          const [a, b] = w.lines.map((l) => l.trim()) as [string, string]
          const right = w.op === '+' ? m(a) + m(b) : m(a) - m(b)
          const ok = aligned && m(w.result!.trim()) === right
          expect(answerText(q), q.id).toBe(ok ? '对' : '不对')
          break
        }
        case 'fix': {
          const w = vertical(q)!
          const [a, b] = w.lines.map((l) => l.trim()) as [string, string]
          expect(v, q.id).toBe(w.op === '+' ? m(a) + m(b) : m(a) - m(b))
          // 横线下写的是错的（得数不对，或者漏写了小数点：「10 0」）
          expect(w.result!.trim().includes(' ') || m(w.result!.trim()) !== v, q.id).toBe(true)
          expect(FIX_17.some((f) => f.a === a && f.b === b)).toBe(true)
          break
        }
        case 'mixed': {
          const id = q.id.split('mixed-')[1]!
          const mu = MIXED_17.find((x) => x.id === id)!
          expect(v, q.id).toBe(mu.op === '+' ? m(mu.av) + m(mu.bv) : m(mu.av) - m(mu.bv))
          break
        }
        case 'record': {
          const id = (p.x as { k: string }).k.split('.').pop()!
          const r = RECORDS.find((x) => x.id === id)!
          expect(v, q.id).toBe(Math.abs(m(r.world) - m(r.cn)))
          // 问的项目在表里
          expect(table(q)!.rows.some((row) => typeof row[0] === 'object' && (row[0] as { k: string }).k.endsWith(`.${id}`))).toBe(true)
          break
        }
        case 'bill': {
          const t = table(q)!
          const ask = q.id.split('bill-')[1]!
          const [p4, p5] = BILL.phone.map(m) as [number, number]
          const [n4, n5] = BILL.net.map(m) as [number, number]
          const want = { sum4: p4 + n4, sum5: p5 + n5, phone: p4 + p5, all: p4 + p5 + n4 + n5 }[ask]
          expect(v, q.id).toBe(want)
          expect(t.rows.flat().filter((c) => c === null)).toHaveLength(1)
          // 钱数照表里的写法写两位小数
          for (const c of q.choices!) expect(zh(c.label)).toMatch(/^\d+\.\d\d$/)
          break
        }
        case 'balls': {
          const fid = (p.f as { k: string }).k.split('.').pop()!
          const vid = (p.v as { k: string }).k.split('.').pop()!
          const price = (id: string): number => m([...BALLS.soccer, ...BALLS.volley].find(([x]) => x === id)![1])
          expect(v, q.id).toBe(price(fid) + price(vid))
          break
        }
        case 'seq': {
          const seq = q.stem.find((s): s is Extract<StemPart, { kind: 'sequence' }> => s.kind === 'sequence')!
          const items = seq.cells.filter((c): c is { kind: 'item'; label: string } => c.kind === 'item' && c.label !== '…').map((c) => m(c.label))
          const step = items[1]! - items[0]!
          for (let i = 2; i < items.length; i++) expect(items[i]! - items[i - 1]!).toBe(step)
          const sixth = seq.cells.some((c) => c.kind === 'item' && c.label === '…')
          expect(v, q.id).toBe(items[3]! + step * (sixth ? 2 : 1))
          expect(SEQS.some((s) => m(s.start) === items[0])).toBe(true)
          break
        }
        default:
          throw new Error(`没核对过的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到例 1、例 2、两组做一做的每一道竖式、体重表、小数点对齐、添 0', () => {
    const seen = new Set<string>()
    each('m4s2-06-addsub', (q, d) => {
      if (d !== 1) return
      seen.add(kindOf(q))
      if (kindOf(q) === 'do') seen.add(`do:${exprs(q)[0]}`)
      if (kindOf(q) === 'books') seen.add(`books:${q.id.split(':')[1]!.split('-').slice(1, 4).join('-')}`)
    })
    for (const k of ['books', 'do', 'weight', 'align', 'pad']) expect(seen.has(k), k).toBe(true)
    for (const [a, op, b] of DO_CALC) expect(seen.has(`do:${a} ${op === '-' ? '-' : '+'} ${b} = ?`), `${a}${op}${b}`).toBe(true)
    // 例 1、例 2 的四道：数学家的故事和童话选 / 神奇的大自然，一共、贵、便宜
    for (const s of ['books:add-math-fairy', 'books:add-math-nature', 'books:dearer-math-fairy', 'books:cheaper-nature-math']) expect([...seen].some((x) => x.startsWith(s)), s).toBe(true)
  })
})

describe('小数加减混合运算（m4s2-06-mixed）：反推答案', () => {
  it('每种题的得数都对', () => {
    each('m4s2-06-mixed', (q) => {
      const kind = kindOf(q)
      const { k, p } = textOf(q)
      const v = valueOf(q)
      switch (kind) {
        case 'three': {
          expect(v, q.id).toBe(m(String(p.a)) + m(String(p.b)) + m(String(p.c)))
          const vt = vertical(q)
          if (vt) expect(vt.lines.map((l) => l.trim())).toEqual([p.a, p.b, p.c].map(String))
          break
        }
        case 'change':
          expect(v, q.id).toBe(m('50') - m(String(p.p)) - m(String(p.q)))
          expect([m(String(p.p)), m(String(p.q))]).toEqual([m(bookPrice(p.x)), m(bookPrice(p.y))])
          break
        case 'way': {
          const e = exprs(q)[0]!
          const want = evaluate(e)
          expect(evaluate(answerText(q)), q.id).toBe(want)
          expect(answerText(q)).toMatch(/^50 - \(/)
          for (const c of q.choices!) if (zh(c.label) !== answerText(q)) expect(evaluate(zh(c.label)), `${q.id} ${zh(c.label)}`).not.toBe(want)
          break
        }
        case 'step': {
          const nums = exprs(q)[0]!.match(/\d+(?:\.\d+)?/g)!
          expect(v, q.id).toBe(m(nums[0]!) - m(nums[1]!))
          break
        }
        case 'do':
        case 'calc':
        case 'oral':
          expect(v, q.id).toBe(evaluate(exprs(q)[0]!.replace(' = ?', '')))
          break
        case 'order': {
          const e = exprs(q)[0]!
          expect(answerText(q), q.id).toBe(/\(([^)]+)\)/.exec(e)![1])
          break
        }
        case 'arrow': {
          const s = m(String(p.s))
          expect(v, q.id).toBe(k.endsWith('last') ? s + m('5.47') - m('9.86') : s + m('5.47'))
          break
        }
        case 'earth':
          expect(v, q.id).toBe(k.endsWith('sea') ? m('3.61') : m('2.12'))
          break
        case 'shoes':
          expect(v, q.id).toBe(k.endsWith('total') ? m('91.6') : m('8.4'))
          break
        case 'jump':
          expect(v, q.id).toBe(k.endsWith('wang') ? m('1.25') : m('1.16'))
          break
        case 'dive': {
          const id = (p.x as { k: string }).k.split('.').pop()!
          const t = DIVE.find((x) => x.id === id)!
          expect(v, q.id).toBe(t.scores.reduce((s, x) => s + m(x), 0))
          break
        }
        case 'promo':
          // 149 + 52 = 201 元，满两个 100 减 40
          expect(v, q.id).toBe(161000)
          break
        case 'shop': {
          const best = Object.values(SHOP).reduce((s, [a, b]) => s + Math.min(m(a!), m(b!)), 0)
          expect(v, q.id).toBe(best)
          expect(answerText(q)).toBe('139.06')
          break
        }
        default:
          throw new Error(`没核对过的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到例 3 的两问（三本书连加的竖式、应找回多少的两种算法和第一步）和做一做的三道', () => {
    const seen = new Set<string>()
    each('m4s2-06-mixed', (q, d) => {
      if (d !== 1) return
      seen.add(kindOf(q))
      if (kindOf(q) === 'do') seen.add(exprs(q)[0]!)
      if (q.id.includes('three-17.45+15.8+14.69')) seen.add('ex3')
      if (q.id.endsWith('change-math-nature')) seen.add('ex3b')
      if (vertical(q)?.lines.length === 3) seen.add('v3')
    })
    for (const k of ['three', 'change', 'way', 'step', 'ex3', 'ex3b', 'v3']) expect(seen.has(k), k).toBe(true)
    for (const e of ['0.38 + 0.26 + 2.6 = ?', '5.7 - 0.81 - 1.29 = ?', '98.2 + 32.5 - 13.4 = ?']) expect(seen.has(e), e).toBe(true)
  })
})

describe('整数加法运算律推广到小数（m4s2-06-laws）：反推答案', () => {
  it('每种题的得数都对', () => {
    each('m4s2-06-laws', (q) => {
      const kind = kindOf(q)
      const { p } = textOf(q)
      const v = valueOf(q)
      const e = exprs(q)[0] ?? ''
      switch (kind) {
        case 'cmp': {
          const [a, b] = e.split(' ○ ') as [string, string]
          const x = evaluate(a)
          const y = evaluate(b)
          expect(answerText(q), q.id).toBe(x > y ? '>' : x < y ? '<' : '=')
          break
        }
        case 'whole':
        case 'do':
        case 'calc':
        case 'frac':
          expect(v, q.id).toBe(evaluate(e.replace(' = ?', '')))
          // 凑整的得数是整数（数字键盘或整数选项）
          if (kind === 'whole') expect(answerText(q), q.id).toMatch(/^\d+$/)
          break
        case 'partner': {
          const a = m(String(p.a))
          expect((a + m(answerText(q))) % 1000, q.id).toBe(0)
          for (const c of q.choices!) if (zh(c.label) !== answerText(q)) expect((a + m(zh(c.label))) % 1000).not.toBe(0)
          break
        }
        case 'law':
          expect(answerText(q)).toBe('加法交换律和加法结合律')
          // 下面一行是把凑成整数的两对分别加了括号
          for (const g of exprs(q)[1]!.match(/\(([^)]+)\)/g)!) expect(evaluate(g) % 1000, q.id).toBe(0)
          break
        case 'swap': {
          const [left, right] = e.split(' = ') as [string, string]
          const leftNums = left.split(' + ').sort()
          const rightNums = right.replace('?', answerText(q)).split(' + ').sort()
          expect(rightNums, q.id).toEqual(leftNums)
          break
        }
        case 'assoc': {
          const left = e.split(' = ')[0]!
          expect(evaluate(answerText(q)), q.id).toBe(evaluate(left))
          for (const c of q.choices!) if (zh(c.label) !== answerText(q)) expect(evaluate(zh(c.label))).not.toBe(evaluate(left))
          break
        }
        case 'how': {
          if (q.id.includes('-sub-')) {
            expect(evaluate(answerText(q)), q.id).toBe(evaluate(e))
            for (const c of q.choices!) if (zh(c.label) !== answerText(q)) expect(evaluate(zh(c.label))).not.toBe(evaluate(e))
          } else {
            // 带着符号搬家：先算被减数和加上的那个数（凑成整数）
            expect(evaluate(answerText(q)) % 1000, q.id).toBe(0)
          }
          break
        }
        case 'receipt': {
          const id = q.id.split(':')[1]!.split('-')[1]!
          const r = RECEIPTS.find((x) => x.id === id)!
          const total = r.items.reduce((s, [, x]) => s + m(x), 0)
          expect(v, q.id).toBe(q.id.endsWith('change') ? m(r.cash) - total : total)
          break
        }
        case 'route': {
          expect(v).toBe(Math.min(...ROUTES.home.map(m)) + Math.min(...ROUTES.park.map(m)))
          break
        }
        case 'socks':
          expect(v).toBe(m('4.68') * 10)
          break
        case 'fall':
          expect(v).toBe(m('78.4'))
          break
        default:
          throw new Error(`没核对过的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到引入的两组比一比、例 4（得数 12、和谁先加、用了什么运算律）、做一做的 □ 和四道简便计算', () => {
    const seen = new Set<string>()
    each('m4s2-06-laws', (q, d) => {
      if (d !== 1) return
      seen.add(kindOf(q))
      seen.add(exprs(q)[0] ?? '')
    })
    for (const k of ['cmp', 'whole', 'partner', 'law', 'swap', 'assoc', 'do', 'how']) expect(seen.has(k), k).toBe(true)
    for (const e of ['0.6 + 7.91 + 3.4 + 0.09 = ?', '1.88 + 2.3 + 3.7 = ?', '5.17 - 1.8 - 3.2 = ?', '4.02 - 3.5 + 0.98 = ?', '13.7 + 0.98 + 0.02 + 4.3 = ?', '6.7 + 4.95 + 3.3 = 6.7 + ? + 4.95', '(1.38 + 1.75) + 0.25 = ? + (? + ?)'])
      expect(seen.has(e), e).toBe(true)
    expect([...seen].some((x) => x === '3.2 + 0.5 ○ 0.5 + 3.2' || x === '0.5 + 3.2 ○ 3.2 + 0.5')).toBe(true)
  })
})
