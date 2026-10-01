import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { ESTIMATE, NO_CARRY_2, ORAL, WRITTEN, ZERO, concatProducts, digitsOf, forgotCarry, noCarry } from '../multiply'

// 三上「多位数乘一位数」的专项检查：从题目本身反推答案（算式按运算顺序算、应用题从题干参数重算），
// 干扰项都是错的，范围与分档照课本，积在万以内，朗读不踩坑。
const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
function stemsOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }>[] {
  return q.stem.filter((p) => p.kind === kind) as Extract<StemPart, { kind: K }>[]
}
/** 题干里第一段文字的词条键与参数（没有文字就是 null） */
function textOf(q: Question, i = 0): { k: string; p: Record<string, number> } | null {
  const t = stemsOf(q, 'text')[i]?.text
  return t && typeof t === 'object' ? { k: t.k, p: (t.p ?? {}) as Record<string, number> } : null
}
function correctLabel(q: Question): string {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}
function correctKey(q: Question): string {
  const id = (q.answer as { choiceId: string }).choiceId
  const l = q.choices!.find((c) => c.id === id)!.label
  return typeof l === 'string' ? l : l.k
}
const answerNumber = (q: Question): number => Number(correctLabel(q))
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))

/** 按运算顺序算 + − × 与括号（只用于测试） */
function evalArith(expr: string): number {
  const src = expr.replace(/=\s*\?$/, '').replace(/×/g, '*').replace(/÷/g, '/').trim()
  expect(src).toMatch(/^[\d\s+\-*/()]+$/)
  return new Function(`return (${src})`)() as number
}
/** 题干里带「= ?」的那个算式 */
const askedExpr = (q: Question): string | undefined => stemsOf(q, 'expr').find((e) => e.expr.endsWith('= ?'))?.expr

/** 应用题：词条键 → 按参数算出的答案 */
const WORD: Record<string, (p: Record<string, number>) => number> = {
  'm3.mul.w.coaster': (p) => p.p! * p.n!,
  'm3.mul.w.bumper': (p) => p.p! * p.n!,
  'm3.mul.w.rapids': (p) => p.p! * p.n!,
  'm3.mul.w.tricycle': (p) => p.p! * p.n!,
  'm3.mul.w.saving': (p) => p.p! * p.n!,
  'm3.mul.w.tomato': (p) => p.p! * p.n!,
  'm3.mul.w.shuttle': (p) => p.p! * p.n!,
  'm3.mul.w.desks': (p) => p.n! * 2,
  'm3.mul.w.cheetah': (p) => p.a! * p.k!,
  'm3.mul.w.football': (p) => p.pay! - p.n! * p.p!,
  'm3.mul.w.trees': (p) => p.a! * p.k! + p.m!,
  'm3.mul.w.pens': (p) => p.a! * p.n!,
  'm3.mul.w.comics': (p) => p.a! * p.n!,
  'm3.mul.w.water': (p) => p.a! * p.n!,
  'm3.mul.w.building': (p) => p.a! * p.n!,
  'm3.mul.w.fan': (p) => p.a! * p.n!,
  'm3.mul.w.mango': (p) => p.p! * p.n!,
  'm3.mul.w.courier': (p) => p.a! * p.n!,
  'm3.mul.w.flowerBox': (p) => p.a! * p.n!,
  'm3.mul.w.bike': (p) => p.a! * p.n!,
  'm3.mul.w.bear': (p) => p.a! * p.k!,
  'm3.mul.w.lastBus': (p) => p.t! - p.e! * p.k1!,
  'm3.mul.w.trainFare': (p) => p.p! * 2 + p.q!,
  'm3.mul.w.seats': (p) => p.r2! * p.c2! - p.r1! * p.c1!,
  'm3.mul.w.stadium': (p) => p.n! * p.s!,
  'm3.mul.w.scienceBooks': (p) => p.n! * p.p!,
  'm3.mul.w.squares': (p) => p.a! * p.n!,
  'm3.mul.w.roundTrip': (p) => p.d! * 4,
}

/** 数值题的通用反推：带「= ?」的算式、「几个十」、应用题；返回是否认出了题型 */
function checkNumeric(q: Question): boolean {
  const e = askedExpr(q)
  const t = textOf(q)
  if (e) {
    expect(answerNumber(q), q.id).toBe(evalArith(e))
    return true
  }
  if (t && WORD[t.k]) {
    expect(answerNumber(q), q.id).toBe(WORD[t.k]!(t.p))
    return true
  }
  // 「20 是 2 个十。」「20 × 3 是几个十？」：第二句问的是 k × b 个十（百）
  if (t && /^m3\.mul\.(tens|hundreds)Is$/.test(t.k)) {
    const ask = textOf(q, 1)!
    expect(ask.k, q.id).toBe(t.k.replace('Is', 'Ask'))
    expect(ask.p.a, q.id).toBe(t.p.a)
    expect(t.p.a, q.id).toBe(t.p.k! * (t.k === 'm3.mul.tensIs' ? 10 : 100))
    expect(answerNumber(q), q.id).toBe(t.p.k! * ask.p.b!)
    return true
  }
  return false
}

describe('辅助函数', () => {
  it('忘了进位、每一位的积连着写：课本上的错例', () => {
    expect(forgotCarry(12, 7)).toBe(74)
    expect(forgotCarry(24, 9)).toBe(186)
    expect(forgotCarry(604, 8)).toBe(4802)
    expect(concatProducts(23, 4)).toBe(812)
    expect(concatProducts(208, 4)).toBe(8032)
    expect(noCarry(32, 3)).toBe(true)
    expect(noCarry(16, 3)).toBe(false)
    expect(digitsOf(604)).toEqual([6, 0, 4])
  })
  it('两位数乘一位数不进位的组合都真的不进位', () => {
    for (const [a, b] of NO_CARRY_2) {
      expect(Math.floor(a / 10) * b, `${a}×${b}`).toBeLessThan(10)
      expect((a % 10) * b, `${a}×${b}`).toBeLessThan(10)
      expect(a % 10).not.toBe(0)
    }
    expect(NO_CARRY_2.length).toBeGreaterThan(30)
  })
})

describe('四个知识点共有的约束', () => {
  for (const kp of [ORAL, WRITTEN, ZERO, ESTIMATE]) {
    it(`${kp}：积与答案都在万以内，干扰项都不对，朗读不踩坑`, () => {
      each(kp, (q) => {
        if (q.answer.kind === 'number') expect(q.answer.value, q.id).toBeLessThanOrEqual(9999)
        for (const e of stemsOf(q, 'expr')) {
          // 算式里乘出来的积都在万以内（课本：积最多 4 位）
          for (const m of e.expr.matchAll(/(\d+) × (\d+)/g)) expect(Number(m[1]) * Number(m[2]), `${q.id} ${e.expr}`).toBeLessThanOrEqual(9999)
        }
        for (const v of stemsOf(q, 'vertical')) {
          expect(v.op).toBe('×')
          expect(v.a, q.id).toBeGreaterThanOrEqual(10)
          expect(v.b, q.id).toBeLessThanOrEqual(9)
          expect(v.a * v.b, q.id).toBeLessThanOrEqual(9999)
        }
        // 数值选项：只有正确的那个等于答案
        if (q.input === 'choice' && q.answer.kind === 'choice' && /^\d+$/.test(correctLabel(q)) && askedExpr(q)) {
          const v = evalArith(askedExpr(q)!)
          expect(labels(q).filter((l) => Number(l) === v), q.id).toEqual([String(v)])
        }
        for (const t of stemsOf(q, 'text')) {
          const s = zh(t.text)
          // 「○」单独会读成「和」；「台 / 户 / 盆」前面的 2 不会读成「两」
          expect(s, q.id).not.toContain('○')
          expect(s, q.id).not.toMatch(/(?<![\d.])2\s*(台|户|盆)/)
          // 多音字不单独出现（长 / 重 / 行 / 只 在词里）
          expect(s.replace(/体重|骑行|旅行|一只/g, ''), q.id).not.toMatch(/[长重行只]/)
        }
      })
    })
  }
})

describe('口算乘法', () => {
  it('算式、「几个十」、应用题的答案都对得上', () => {
    each(ORAL, (q) => {
      expect(checkNumeric(q), `${q.id} 认不出题型`).toBe(true)
      // 找规律：上面那个提示算式本身是对的
      const exprs = stemsOf(q, 'expr')
      if (exprs.length === 2) {
        const [x, b, p] = exprs[0]!.expr.split(/[×=]/).map((s) => Number(s.trim()))
        expect(x! * b!, q.id).toBe(p)
      }
    })
  })

  it('分档：第 1 档是整十、整百数（首位乘出来不以 0 结尾）和不进位的两位数；第 2 档出整千数和积末尾 0 更多的', () => {
    let thousands = 0
    let extraZero = 0
    each(ORAL, (q, d) => {
      const e = askedExpr(q)
      if (!e || !/^\d+ × \d+ = \?$/.test(e) || stemsOf(q, 'expr').length > 1) return
      const [a, b] = e.replace(' = ?', '').split(' × ').map(Number) as [number, number]
      const lead = Number(String(a)[0])
      const round = /^\d0+$/.test(String(a))
      if (d === 1) {
        if (round) {
          expect(a, q.id).toBeLessThan(1000)
          expect((lead * b) % 10, `${q.id} 第 1 档不出积末尾的 0 比乘数多的`).not.toBe(0)
        } else {
          expect(a, q.id).toBeLessThan(100)
          expect(noCarry(a, b), `${q.id} 第 1 档的两位数不进位`).toBe(true)
        }
      }
      if (d === 2 && round) {
        if (a >= 1000) thousands++
        if ((lead * b) % 10 === 0) extraZero++
        expect(a >= 1000 || (lead * b) % 10 === 0, q.id).toBe(true)
      }
    })
    expect(thousands).toBeGreaterThan(0)
    expect(extraZero).toBeGreaterThan(0)
  })

  it('十块条的图：组数是乘数，每组的十块条和小方块合起来是那个两位数', () => {
    let pics = 0
    each(ORAL, (q) => {
      const pic = stemsOf(q, 'blocks')[0]
      if (!pic) return
      pics++
      const [a, b] = askedExpr(q)!.replace(' = ?', '').split(' × ').map(Number) as [number, number]
      expect(pic.groups, q.id).toBe(b)
      expect(pic.tens * 10 + pic.ones, q.id).toBe(a)
      expect(pic.groups, q.id).toBeLessThanOrEqual(6)
    })
    expect(pics).toBeGreaterThan(20)
  })

  it('第 1 档题目够多样', () => {
    const ids = new Set<string>()
    each(ORAL, (q, d) => d === 1 && ids.add(q.id))
    expect(ids.size).toBeGreaterThan(80)
  })
})

describe('笔算乘法', () => {
  it('竖式与横式是同一道题，答案是积；应用题从参数算', () => {
    each(WRITTEN, (q, d) => {
      const v = stemsOf(q, 'vertical')[0]
      if (v) {
        expect(askedExpr(q), q.id).toBe(`${v.a} × ${v.b} = ?`)
        expect(answerNumber(q), q.id).toBe(v.a * v.b)
        expect(String(v.a), `${q.id} 笔算乘法的多位数里没有 0（有 0 的归「有0的乘法」）`).not.toContain('0')
        // 第 1 档两位数、三位数都有（课本的试一试、做一做），第 2 档三位数，第 3 档四位数
        expect(d === 1 ? [2, 3] : [d === 2 ? 3 : 4], q.id).toContain(String(v.a).length)
        return
      }
      if (textOf(q)?.k === 'm3.mul.check') {
        const [a, b, shown] = stemsOf(q, 'expr')[0]!.expr.split(/[×=]/).map((s) => Number(s.trim())) as [number, number, number]
        expect(correctKey(q), q.id).toBe(a * b === shown ? 'm3.mul.right' : 'm3.mul.wrong')
        if (a * b !== shown) expect([forgotCarry(a, b), concatProducts(a, b), (a * b) / 10], q.id).toContain(shown)
        return
      }
      expect(checkNumeric(q), `${q.id} 认不出题型`).toBe(true)
    })
  })

  it('第 1 档多数要进位，也有不进位的', () => {
    let carry = 0
    let plain = 0
    each(WRITTEN, (q, d) => {
      const v = stemsOf(q, 'vertical')[0]
      if (d !== 1 || !v) return
      if (noCarry(v.a, v.b)) plain++
      else carry++
    })
    expect(carry).toBeGreaterThan(plain)
    expect(plain).toBeGreaterThan(10)
  })

  it('第 1 档两位数、三位数乘一位数都有，三位数里也有不进位的；应用题里有三位数的', () => {
    const len = new Map<number, number>()
    let plain3 = 0
    let word3 = 0
    each(WRITTEN, (q, d) => {
      if (d !== 1) return
      const v = stemsOf(q, 'vertical')[0]
      if (v) {
        const n = String(v.a).length
        len.set(n, (len.get(n) ?? 0) + 1)
        if (n === 3 && noCarry(v.a, v.b)) plain3++
      } else if (/^m3\.mul\.w\.(courier|flowerBox|bike|bear)$/.test(textOf(q)?.k ?? '')) word3++
    })
    expect(len.get(2)).toBeGreaterThan(40)
    expect(len.get(3)).toBeGreaterThan(35)
    expect(plain3).toBeGreaterThan(5)
    expect(word3).toBeGreaterThan(8)
  })

  it('判断题里对的错的都有', () => {
    const seen = new Set<string>()
    each(WRITTEN, (q) => textOf(q)?.k === 'm3.mul.check' && seen.add(correctKey(q)))
    expect([...seen].sort()).toEqual(['m3.mul.right', 'm3.mul.wrong'])
  })

  it('应用题的最后一辆车坐的人不比前面的车多', () => {
    each(WRITTEN, (q) => {
      const t = textOf(q)
      if (t?.k !== 'm3.mul.w.lastBus') return
      expect(t.p.k1, q.id).toBe(t.p.k! - 1)
      expect(answerNumber(q), q.id).toBeGreaterThan(0)
      expect(answerNumber(q), q.id).toBeLessThan(t.p.e!)
    })
  })
})

describe('有0的乘法', () => {
  it('每种题都从题目本身反推得出答案', () => {
    each(ZERO, (q) => {
      const t = textOf(q)
      const v = stemsOf(q, 'vertical')[0]
      if (t?.k === 'm3.mul.whichOp') {
        // 选项里只有一个算式的得数是题目要的数
        const hits = labels(q).filter((l) => evalArith(l) === t.p.c)
        expect(hits, q.id).toEqual([correctLabel(q)])
        return
      }
      if (t?.k === 'm3.mul.tensDigit') {
        expect(v, q.id).toBeDefined()
        expect(Number(correctLabel(q)), q.id).toBe(Math.floor((t.p.a! * t.p.b!) / 10) % 10)
        expect([v!.a, v!.b]).toEqual([t.p.a, t.p.b])
        return
      }
      if (t?.k === 'm3.mul.compare') {
        const [left, right] = stemsOf(q, 'expr')[0]!.expr.split(' ○ ') as [string, string]
        const [l, r] = [evalArith(left), evalArith(right)]
        expect(correctLabel(q), q.id).toBe(l > r ? '>' : l < r ? '<' : '=')
        expect(q.type).toBe('compare')
        return
      }
      if (t?.k === 'm3.mul.check') {
        const [a, b, shown] = stemsOf(q, 'expr')[0]!.expr.split(/[×=]/).map((s) => Number(s.trim())) as [number, number, number]
        expect(correctKey(q), q.id).toBe(a * b === shown ? 'm3.mul.right' : 'm3.mul.wrong')
        return
      }
      if (v) {
        expect(answerNumber(q), q.id).toBe(v.a * v.b)
        expect(String(v.a).slice(1), `${q.id} 乘数中间或末尾有 0`).toContain('0')
        return
      }
      expect(checkNumeric(q), `${q.id} 认不出题型`).toBe(true)
    })
  })

  it('第 1 档：0 的口算和加 0、减 0 混着出；中间有 0、末尾有 0 的竖式都有', () => {
    const kinds = new Set<string>()
    each(ZERO, (q, d) => {
      if (d !== 1) return
      const e = askedExpr(q) ?? ''
      if (/^0 × \d+|^\d+ × 0 /.test(e)) kinds.add('×0')
      if (/\+ 0 =|^0 \+/.test(e)) kinds.add('+0')
      const v = stemsOf(q, 'vertical')[0]
      if (v && v.a % 10 === 0) kinds.add('末尾0')
      if (v && v.a % 10 !== 0) kinds.add('中间0')
    })
    expect([...kinds].sort()).toEqual(['+0', '×0', '中间0', '末尾0'].sort())
  })

  it('填运算符号只出答案唯一的：选项里没有 ÷，也不出 0 ○ 4 = 0、n ○ 0 = n', () => {
    each(ZERO, (q) => {
      if (textOf(q)?.k !== 'm3.mul.whichOp') return
      for (const l of labels(q)) expect(l).not.toContain('÷')
    })
  })
})

describe('用估算解决问题', () => {
  const ENOUGH_KEYS: Record<string, (p: Record<string, number>) => { cost: number; budget: number; x: number; other: number }> = {
    'm3.mul.est.tickets': (p) => ({ cost: p.n! * p.p!, budget: p.m!, x: p.n!, other: p.p! }),
    'm3.mul.est.water': (p) => ({ cost: p.n! * p.p!, budget: p.m!, x: p.n!, other: p.p! }),
    'm3.mul.est.skates': (p) => ({ cost: p.q! * p.p!, budget: p.m!, x: p.p!, other: p.q! }),
    'm3.mul.est.storyBooks': (p) => ({ cost: p.q! * p.p!, budget: p.m!, x: p.p!, other: p.q! }),
    'm3.mul.est.fans': (p) => ({ cost: p.q! * p.p!, budget: p.m!, x: p.p!, other: p.q! }),
  }

  it('够不够：答案和真算的一致，而且用课本的往大估 / 往小估就能判断（估出来的数正好是钱数）', () => {
    let hinted = 0
    each(ESTIMATE, (q, d) => {
      const t = textOf(q)
      if (!t || !ENOUGH_KEYS[t.k]) return
      const { cost, budget, x, other } = ENOUGH_KEYS[t.k]!(t.p)
      const enough = cost <= budget
      expect(correctKey(q), q.id).toBe(enough ? 'm3.mul.enough' : 'm3.mul.notEnough')
      // 钱数 = 整百数 × 另一个数，要估的那个数离整百数不远、个位不是 0
      const r = budget / other
      expect(Number.isInteger(r) && r % 100 === 0, q.id).toBe(true)
      expect(x % 10, q.id).not.toBe(0)
      expect(Math.abs(x - r), q.id).toBeLessThanOrEqual(29)
      // 够：往大估（x < r）；不够：往小估（x > r）
      expect(enough ? x < r : x > r, q.id).toBe(true)
      const hint = textOf(q, 1)
      if (d === 1) {
        hinted++
        expect(hint?.k, q.id).toBe('m3.mul.est.hint')
        expect([hint!.p.x, hint!.p.r], q.id).toEqual([x, r])
      } else expect(hint, q.id).toBeNull()
    })
    expect(hinted).toBeGreaterThan(50)
  })

  it('积在哪两个数之间、积最接近哪个数：只有正确的选项说得通，题干里不出现积', () => {
    each(ESTIMATE, (q) => {
      const t = textOf(q)
      if (t?.k !== 'm3.mul.est.between' && t?.k !== 'm3.mul.est.closest') return
      const e = stemsOf(q, 'expr')[0]!.expr
      expect(e).not.toContain('=')
      const p = evalArith(e)
      if (t.k === 'm3.mul.est.between') {
        const inside = (q.choices ?? []).filter((c) => {
          const r = (c.label as unknown as { p: { lo: number; hi: number } }).p
          return r.lo < p && p < r.hi
        })
        expect(inside.map((c) => c.id), q.id).toEqual([(q.answer as { choiceId: string }).choiceId])
      } else {
        const dist = labels(q).map((l) => Math.abs(Number(l) - p))
        const best = Math.min(...dist)
        expect(dist.filter((x) => x === best).length, q.id).toBe(1)
        expect(Math.abs(answerNumber(q) - p), q.id).toBe(best)
      }
    })
  })

  it('能不能走到、车够不够、纽扣够不够、选哪个班次、稻谷能不能一次运走：答案和真算的一致，估一估也说得通', () => {
    const seen = new Set<string>()
    each(ESTIMATE, (q) => {
      const t = textOf(q)
      if (!t) return
      seen.add(t.k)
      const key = q.answer.kind === 'choice' ? correctKey(q) : ''
      const p = t.p
      if (t.k === 'm3.mul.est.walk') {
        const can = p.v! * p.t! >= p.d!
        expect(key, q.id).toBe(can ? 'm3.mul.can' : 'm3.mul.cannot')
        // 能：往小估（整十）已经走得到；不能：往大估也走不到
        if (can) expect(Math.floor(p.v! / 10) * 10 * p.t!, q.id).toBeGreaterThanOrEqual(p.d!)
        else expect(Math.ceil(p.v! / 10) * 10 * p.t!, q.id).toBeLessThanOrEqual(p.d!)
      }
      if (t.k === 'm3.mul.est.bus') {
        const seats = (p.c! - 1) * p.k!
        expect(key, q.id).toBe(seats >= p.n! ? 'm3.mul.enough' : 'm3.mul.notEnough')
        if (seats >= p.n!) expect(Math.floor((p.c! - 1) / 10) * 10 * p.k!, q.id).toBeGreaterThanOrEqual(p.n!)
        else expect(Math.ceil((p.c! - 1) / 10) * 10 * p.k!, q.id).toBeLessThan(p.n!)
      }
      if (t.k === 'm3.mul.est.buttons') {
        const need = p.k! * p.n!
        expect(key, q.id).toBe(need <= p.m! ? 'm3.mul.enough' : 'm3.mul.notEnough')
        if (need <= p.m!) expect(Math.ceil(p.n! / 10) * 10 * p.k!, q.id).toBeLessThanOrEqual(p.m!)
        else expect(Math.floor(p.n! / 10) * 10 * p.k!, q.id).toBeGreaterThanOrEqual(p.m!)
      }
      if (t.k === 'm3.mul.est.train') {
        const people = p.m! + 1
        const ok = [p.p1!, p.p2!, p.p3!].filter((x) => x * people <= p.b!)
        expect(ok, q.id).toEqual([p.p1])
        expect(correctLabel(q), q.id).toContain(String(p.p1))
      }
      if (/^m3\.mul\.est\.rice/.test(t.k)) {
        const w = Object.entries(p).filter(([k]) => /^w\d$/.test(k)).map(([, v]) => v)
        expect(w.length, q.id).toBe(Number(t.k.slice(-1)))
        const sum = w.reduce((s, x) => s + x, 0)
        expect(key, q.id).toBe(sum <= p.cap! ? 'm3.mul.can' : 'm3.mul.cannot')
        // 每袋看成整十千克估出来的也是这个结论
        const est = w.reduce((s, x) => s + Math.round(x / 10) * 10, 0)
        expect(est <= p.cap!, q.id).toBe(sum <= p.cap!)
        // 而且估的时候往哪边估都不会翻：每袋最重（最轻）的时候结论也一样
        expect(Math.max(...w) * w.length <= p.cap!, q.id).toBe(sum <= p.cap!)
        expect(Math.min(...w) * w.length <= p.cap!, q.id).toBe(sum <= p.cap!)
      }
    })
    for (const k of ['m3.mul.est.walk', 'm3.mul.est.bus', 'm3.mul.est.buttons', 'm3.mul.est.train', 'm3.mul.est.rice8', 'm3.mul.est.rice9']) expect(seen.has(k), k).toBe(true)
  })

  it('第 1 档题目够多样，够和不够都有', () => {
    const ids = new Set<string>()
    const answers = new Set<string>()
    each(ESTIMATE, (q, d) => {
      if (d !== 1) return
      ids.add(q.id)
      if (textOf(q)?.k !== 'm3.mul.est.between') answers.add(correctKey(q))
    })
    expect(ids.size).toBeGreaterThan(100)
    expect([...answers].sort()).toEqual(['m3.mul.enough', 'm3.mul.notEnough'])
  })
})
