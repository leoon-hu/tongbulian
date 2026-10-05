import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { ESTIMATE, ORAL, PATTERN, WRITTEN, forgotCarry, noCarry, roundDown, roundUp, trailingZeros } from '../multiply'

// 四上「多位数乘两位数」的专项检查：从题目本身反推答案（算式按运算顺序算、应用题从题干参数重算、竖式和表格从部件参数重算），
// 干扰项都是错的，数的范围与分档照课本，术语照课本（乘数、积，不说因数、部分积；估算不写「≈」），朗读不踩坑。
const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
function stemsOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }>[] {
  return q.stem.filter((p) => p.kind === kind) as Extract<StemPart, { kind: K }>[]
}
type P = Record<string, number | string | { k: string }>
/** 题干里第 i 段文字的词条键与参数 */
function textOf(q: Question, i = 0): { k: string; p: P } | null {
  const t = stemsOf(q, 'text')[i]?.text
  return t && typeof t === 'object' ? { k: t.k, p: (t.p ?? {}) as P } : null
}
const num = (p: P, k: string): number => p[k] as number
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
const answerNumber = (q: Question): number => Number(correctText(q))
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))

/** 按运算顺序算 + − × ÷ 与括号（只用于测试） */
function evalArith(expr: string): number {
  const src = expr.replace(/=\s*\?$/, '').replace(/×/g, '*').replace(/÷/g, '/').trim()
  expect(src).toMatch(/^[\d\s+\-*/()]+$/)
  return new Function(`return (${src})`)() as number
}
const askedExpr = (q: Question): string | undefined => stemsOf(q, 'expr').find((e) => e.expr.endsWith('= ?'))?.expr
/** 「a × b = p」这种写好的算式本身是对的 */
function shownRight(q: Question): void {
  for (const e of stemsOf(q, 'expr')) {
    if (e.expr.endsWith('= ?') || e.expr.includes('○')) continue
    const [l, r] = e.expr.split('=')
    expect(evalArith(l!), `${q.id} ${e.expr}`).toBe(Number(r))
  }
}

/** 应用题：词条键 → 按参数算出的答案 */
const WORD: Record<string, (p: P) => number> = {
  'm4.mul.w.strawberry': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.orange': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.apples': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.buffalo': (p) => num(p, 'a') * num(p, 'k'),
  'm4.mul.w.lantern': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.lanternCost': (p) => num(p, 'a') * num(p, 'n') * num(p, 'p'),
  'm4.mul.w.tap': (p) => num(p, 'g') * 60,
  'm4.mul.w.tapDay': (p) => num(p, 'g') * 60 * 24,
  'm4.mul.w.essay': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.haw': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.hawSell': (p) => num(p, 'p') * num(p, 'n'),
  'm4.mul.w.coach': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.plusTen': (p) => num(p, 'd') / 9,
  'm4.mul.w.books': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.yogurt': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.track': (p) => num(p, 'l') * num(p, 'n'),
  'm4.mul.w.shuttle': (p) => num(p, 'a') * num(p, 'n'),
  'm4.mul.w.shuttleCost': (p) => num(p, 'p') * num(p, 'n'),
  'm4.mul.w.postcard': (p) => num(p, 'p') * num(p, 'n'),
  'm4.mul.w.ride': (p) => num(p, 'v') * num(p, 't'),
  'm4.mul.w.plants': (p) => num(p, 'p') * num(p, 'n'),
  'm4.mul.w.sport': (p) => num(p, 'p') * num(p, 'n'),
  'm4.mul.pat.area': (p) => (num(p, 's') / num(p, 'w')) * num(p, 'w2'),
  'm4.mul.pat.areaPlus': (p) => num(p, 'w') * num(p, 'l'),
}

/** 竖式部件（乘数是两位数的竖式） */
const vOf = (q: Question) => stemsOf(q, 'mul-vertical')[0]

describe('辅助函数', () => {
  it('不进位、忘了进位、末尾的 0、往大估 / 往小估', () => {
    expect(noCarry(12, 13)).toBe(true)
    expect(noCarry(343, 12)).toBe(true)
    expect(noCarry(37, 48)).toBe(false)
    expect(forgotCarry(16, 3)).toBe(38)
    expect(forgotCarry(342, 3)).toBe(926)
    expect(trailingZeros(3700)).toBe(2)
    expect(trailingZeros(704)).toBe(0)
    // 例 6：108 往大估成 110，208 往小估成 200，18 往大估成 20；练习十：293 往大估成 300，192 往大估成 200，105 往小估成 100
    expect([roundUp(108), roundDown(208), roundUp(18), roundUp(293), roundUp(192), roundDown(105), roundUp(130)]).toEqual([110, 200, 20, 300, 200, 100, 130])
  })
})

describe('四个知识点共有的约束', () => {
  for (const kp of [ORAL, WRITTEN, PATTERN, ESTIMATE]) {
    it(`${kp}：术语照课本、写好的算式都对、竖式部件合理、干扰项都不对、朗读不踩坑`, () => {
      each(kp, (q) => {
        const texts = [...stemsOf(q, 'text').map((t) => zh(t.text)), ...labels(q), ...stemsOf(q, 'expr').map((e) => e.expr)]
        for (const s of texts) {
          // 课本：两个都叫乘数，结果叫积；估算的算式用「=」
          expect(s, q.id).not.toMatch(/因数|部分积|≈/)
        }
        for (const t of stemsOf(q, 'text')) {
          const s = zh(t.text)
          // 「○」单独会读成「和」；圆括号会读成「括号」；「串 / 台 / 盆 / 枝」前面的 2 不会读成「两」
          expect(s, q.id).not.toMatch(/[○()（）]/)
          expect(s, q.id).not.toMatch(/(?<![\d.])2\s*(串|台|盆|枝)/)
          // 多音字不单独出现：长只在长度 / 长方形里，重只在体重里，行只在运行里
          expect(s.replace(/长度|长方形|体重|运行/g, ''), q.id).not.toMatch(/[长重行]/)
        }
        shownRight(q)
        for (const v of stemsOf(q, 'mul-vertical')) {
          expect(v.b, q.id).toBeGreaterThanOrEqual(10)
          expect(v.b, q.id).toBeLessThan(100)
          expect(v.a, q.id).toBeGreaterThanOrEqual(10)
          if (v.zeros) {
            // 末尾有 0 的只出一个乘数末尾有 0 的（课本做一做 704 × 90、580 × 12 的样子）
            expect(trailingZeros(v.a) > 0 !== trailingZeros(v.b) > 0, q.id).toBe(true)
          } else if (!v.work) {
            expect(v.b % 10, `${q.id} 乘数个位是 0 的要用「0 写在外面」的竖式`).not.toBe(0)
          }
          if (v.work) {
            const shift = v.work.flat ? 1 : 10
            expect(v.work.p1 + v.work.p2 * shift, `${q.id} 写好的竖式自己要加得对`).toBe(v.work.sum)
          }
        }
        // 数值选项：只有正确的那个等于答案
        if (q.input === 'choice' && /^\d+$/.test(correctText(q))) {
          expect(labels(q).filter((l) => l === correctText(q)), q.id).toHaveLength(1)
        }
      })
    })
  }
})

describe('口算乘法', () => {
  it('算式、应用题、够不够、怎样口算：答案都对得上', () => {
    each(ORAL, (q) => {
      const e = askedExpr(q)
      const t = textOf(q)
      if (e) {
        expect(answerNumber(q), q.id).toBe(evalArith(e))
        for (const m of e.matchAll(/(\d+)/g)) expect(Number(m[1]), `${q.id} 口算的乘数不超过三位`).toBeLessThan(1000)
        return
      }
      if (t && WORD[t.k]) {
        expect(answerNumber(q), q.id).toBe(WORD[t.k]!(t.p))
        return
      }
      if (t?.k === 'm4.mul.howOral') {
        // 正确的写法算出来就是原式的积，其他写法都不是
        const target = evalArith(String(t.p.e))
        expect(evalArith(correctText(q)), q.id).toBe(target)
        for (const l of labels(q).filter((l) => l !== correctText(q))) expect(evalArith(l), q.id).not.toBe(target)
        return
      }
      if (t?.k === 'm4.mul.w.knot') {
        expect(correctKey(q), q.id).toBe(num(t.p, 'c') * num(t.p, 'n') <= num(t.p, 'm') * 100 ? 'm4.mul.enough' : 'm4.mul.notEnough')
        return
      }
      if (t?.k === 'm4.mul.w.coachFit') {
        expect(correctKey(q), q.id).toBe(num(t.p, 'm') <= num(t.p, 'a') * num(t.p, 'n') ? 'm4.mul.can' : 'm4.mul.cannot')
        return
      }
      throw new Error(`${q.id} 认不出题型`)
    })
  })

  it('第 1 档照课本：两位数乘一位数的积不超过 100（例 1），乘 10、乘整十数、做一做下行的整十整百都有，也有十块条的图和应用题', () => {
    const seen = new Set<string>()
    each(ORAL, (q, d) => {
      if (d !== 1) return
      const e = askedExpr(q)
      if (stemsOf(q, 'blocks').length) seen.add('blocks')
      if (!e) {
        seen.add(textOf(q)!.k)
        return
      }
      const [a, b] = e.replace(' = ?', '').split(' × ').map(Number) as [number, number]
      if (a < 100 && b < 10 && a % 10) {
        expect(a * b, q.id).toBeLessThanOrEqual(100)
        seen.add('two-by-one')
      }
      if (a >= 100 && b < 10) seen.add('hundreds-tens')
      if (a === 10 || b === 10) seen.add('times-ten')
      if (a < 100 && a % 10 && b % 10 === 0 && b < 100 && b > 10) seen.add('by-tens')
      if (a * b >= 1000 && a % 10 === 0 && b % 10 === 0) seen.add('big')
    })
    for (const k of ['blocks', 'two-by-one', 'hundreds-tens', 'times-ten', 'by-tens', 'big', 'm4.mul.howOral', 'm4.mul.w.strawberry', 'm4.mul.w.orange', 'm4.mul.w.apples']) {
      expect(seen.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
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
    expect(pics).toBeGreaterThan(10)
  })
})

describe('笔算乘法', () => {
  it('竖式题：横式和竖式是同一道题（多位数在上面），答案是积；分档的位数照课本', () => {
    let swapped = 0
    each(WRITTEN, (q, d) => {
      const v = vOf(q)
      if (!v || v.work) return
      const e = askedExpr(q)!
      expect([`${v.a} × ${v.b} = ?`, `${v.b} × ${v.a} = ?`], q.id).toContain(e)
      if (e.startsWith(`${v.b} ×`) && v.a !== v.b) swapped++
      expect(answerNumber(q), q.id).toBe(v.a * v.b)
      // 第 1 档两位数、三位数乘两位数（例题、做一做），第 2 档三位数，第 3 档四位数（练习九 2、练习十一 2）
      expect(d === 1 ? [2, 3] : [d === 2 ? 3 : 4], q.id).toContain(String(v.a).length)
      expect(v.a * v.b, q.id).toBeLessThan(1e6)
    })
    expect(swapped).toBeGreaterThan(5)
  })

  it('第 1 档：不进位、进位、乘数中间有 0、末尾有 0 的竖式都有，例题的应用题、笔算法则、箭头题、添几个 0 也有', () => {
    const seen = new Set<string>()
    each(WRITTEN, (q, d) => {
      if (d !== 1) return
      const v = vOf(q)
      if (!v && askedExpr(q)) {
        seen.add('both-zero')
        return
      }
      if (v && !v.work) {
        if (v.zeros) seen.add(trailingZeros(v.b) ? 'end-zero-b' : 'end-zero-a')
        else if (/0/.test(String(v.a))) seen.add('mid-zero')
        else seen.add(noCarry(v.a, v.b) ? `plain-${String(v.a).length}` : `carry-${String(v.a).length}`)
        return
      }
      seen.add(textOf(q, v?.mark ? 0 : 0)?.k ?? 'none')
    })
    for (const k of ['plain-2', 'plain-3', 'carry-2', 'carry-3', 'mid-zero', 'end-zero-a', 'end-zero-b', 'both-zero', 'm4.mul.w.books', 'm4.mul.w.yogurt', 'm4.mul.align', 'm4.mul.stepIs', 'm4.mul.zeroCount']) {
      expect(seen.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
  })

  it('应用题、笔算法则、箭头所指的一步、改错、连一连、添几个 0、够不够：答案都对得上', () => {
    each(WRITTEN, (q) => {
      const v = vOf(q)
      const t = textOf(q)
      if (v && !v.work && askedExpr(q)) return
      if (!v && askedExpr(q)) {
        // 两个乘数末尾都有 0 的横式（160 × 60、180 × 70）：不画竖式
        const [a, b] = askedExpr(q)!.replace(' = ?', '').split(' × ').map(Number) as [number, number]
        expect(trailingZeros(a) > 0 && trailingZeros(b) > 0, q.id).toBe(true)
        expect(answerNumber(q), q.id).toBe(a * b)
        return
      }
      if (t && WORD[t.k]) {
        expect(answerNumber(q), q.id).toBe(WORD[t.k]!(t.p))
        return
      }
      const right = (a: number, b: number) => ({ p1: a * (b % 10), p2: a * Math.floor(b / 10), sum: a * b })
      switch (t?.k) {
        case 'm4.mul.align': {
          // 用哪一位去乘，得数的末位就和乘数的哪一位对齐
          expect(correctKey(q), q.id).toBe((t.p.place as { k: string }).k)
          const [a, b] = String(t.p.e).split(' × ').map(Number) as [number, number]
          expect(num(t.p, 'a'), q.id).toBe(a)
          expect(num(t.p, 'n'), q.id).toBe((t.p.place as { k: string }).k === 'm4.mul.tens' ? Math.floor(b / 10) : b % 10)
          return
        }
        case 'm4.mul.stepIs':
        case undefined: {
          // 箭头题：竖式写对了，第二次乘得的数是 a 乘几十，第一次是 a 乘个位
          expect(v?.work && v.mark, q.id).toBeTruthy()
          expect(v!.work, q.id).toEqual(right(v!.a, v!.b))
          const want = v!.mark === 2 ? `${v!.a} × ${Math.floor(v!.b / 10) * 10}` : `${v!.a} × ${v!.b % 10}`
          expect(correctText(q), q.id).toBe(want)
          return
        }
        case 'm4.mul.lapsAsk': {
          expect(v!.a, q.id).toBe(t.p.l)
          expect(v!.b, q.id).toBe(t.p.n)
          expect(v!.work, q.id).toEqual(right(v!.a, v!.b))
          const k = (correctLabel(q) as unknown as { p: { k: number } }).p.k
          expect(k, q.id).toBe(v!.mark === 2 ? Math.floor(v!.b / 10) * 10 : v!.b % 10)
          return
        }
        case 'm4.mul.check': {
          const ok = JSON.stringify(v!.work) === JSON.stringify(right(v!.a, v!.b))
          expect(correctKey(q), q.id).toBe(ok ? 'm4.mul.right' : 'm4.mul.wrong')
          return
        }
        case 'm4.mul.fixAsk':
          expect(JSON.stringify(v!.work), q.id).not.toBe(JSON.stringify(right(v!.a, v!.b)))
          expect(answerNumber(q), q.id).toBe(v!.a * v!.b)
          return
        case 'm4.mul.whichIs': {
          expect(evalArith(correctText(q)), q.id).toBe(t.p.v)
          for (const l of labels(q).filter((l) => l !== correctText(q))) expect(evalArith(l), q.id).not.toBe(t.p.v)
          return
        }
        case 'm4.mul.zeroCount': {
          const [a, b] = String(t.p.e).split(' × ').map(Number) as [number, number]
          const [x, y] = String(t.p.e2).split(' × ').map(Number) as [number, number]
          expect(x * 10 ** trailingZeros(a), q.id).toBe(a)
          expect(y * 10 ** trailingZeros(b), q.id).toBe(b)
          expect(x * y, q.id).toBe(t.p.p)
          expect(answerNumber(q), q.id).toBe(trailingZeros(a) + trailingZeros(b))
          return
        }
        case 'm4.mul.w.elephant':
          expect(correctKey(q), q.id).toBe(num(t.p, 'a') * num(t.p, 'days') <= num(t.p, 't') * 1000 ? 'm4.mul.enough' : 'm4.mul.notEnough')
          return
      }
      throw new Error(`${q.id} 认不出题型`)
    })
  })

  it('改错题照课本的错法：第二次乘得的数没有错位，或者乘的时候忘了进位；对的、错的都有', () => {
    let right = 0
    let flat = 0
    let carry = 0
    each(WRITTEN, (q) => {
      if (textOf(q)?.k !== 'm4.mul.check' && textOf(q)?.k !== 'm4.mul.fixAsk') return
      const v = vOf(q)!
      const [p1, p2] = [v.a * (v.b % 10), v.a * Math.floor(v.b / 10)]
      if (v.work!.flat) {
        expect([v.work!.p1, v.work!.p2], q.id).toEqual([p1, p2])
        flat++
      } else if (v.work!.sum === v.a * v.b) right++
      else {
        expect([forgotCarry(v.a, v.b % 10), forgotCarry(v.a, Math.floor(v.b / 10))], q.id).toContain(v.work!.p1 !== p1 ? v.work!.p1 : v.work!.p2)
        carry++
      }
    })
    expect(right).toBeGreaterThan(10)
    expect(flat).toBeGreaterThan(10)
    expect(carry).toBeGreaterThan(10)
  })
})

describe('积的变化规律', () => {
  it('写出得数、乘了几 / 除以了几、规律、表格、比大小、找规律：答案都对得上', () => {
    each(PATTERN, (q) => {
      const t = textOf(q)
      const exprs = stemsOf(q, 'expr')
      const e = askedExpr(q)
      if (e) {
        expect(answerNumber(q), q.id).toBe(evalArith(e))
        return
      }
      if (t && WORD[t.k]) {
        expect(answerNumber(q), q.id).toBe(WORD[t.k]!(t.p))
        return
      }
      const table = stemsOf(q, 'stat-table')[0]
      if (table) {
        const col = (i: number) => table.rows.map((r) => r[i] as number | null)
        const [x1, y1, p1] = col(1)
        const [x2, y2, p2] = col(2)
        expect(x1! * y1!, q.id).toBe(p1)
        const v = answerNumber(q)
        if (x2 === null) expect(v * y2!, q.id).toBe(p2)
        else if (y2 === null) expect(x2 * v, q.id).toBe(p2)
        else expect(x2 * y2, q.id).toBe(v)
        return
      }
      const [first, second] = exprs.map((x) => x.expr.split(/[×=]/).map((s) => Number(s.trim())))
      switch (t?.k) {
        case 'm4.mul.pat.k2mul':
          expect(first![0], q.id).toBe(second![0])
          expect(answerNumber(q) * first![1]!, q.id).toBe(second![1])
          return
        case 'm4.mul.pat.k1div':
          expect(first![1], q.id).toBe(second![1])
          expect(second![0]! * answerNumber(q), q.id).toBe(first![0])
          return
        case 'm4.mul.pat.kProd':
          expect(first![2]! * answerNumber(q), q.id).toBe(second![2])
          return
        case 'm4.mul.pat.ruleMul':
          expect(correctKey(q), q.id).toBe('m4.mul.pat.mulToo')
          return
        case 'm4.mul.pat.ruleDiv':
          expect(correctKey(q), q.id).toBe('m4.mul.pat.divToo')
          return
        case 'm4.mul.compare': {
          const [l, r] = exprs[0]!.expr.split(' ○ ')
          const [lv, rv] = [evalArith(l!), evalArith(r!)]
          expect(correctText(q), q.id).toBe(lv > rv ? '>' : lv < rv ? '<' : '=')
          return
        }
      }
      throw new Error(`${q.id} 认不出题型`)
    })
  })

  it('第 1 档有例 4 的写得数、乘了几、规律，做一做 2 的绿地，例 5 用计算器找规律', () => {
    const seen = new Set<string>()
    each(PATTERN, (q, d) => {
      if (d !== 1) return
      const t = textOf(q)
      const last = stemsOf(q, 'expr').at(-1)?.expr ?? ''
      seen.add(t?.k === 'm4.mul.pat.next' && /^1+ × 1+/.test(last) ? 'ones' : t?.k === 'm4.mul.pat.next' ? 'calc' : t?.k ?? 'none')
    })
    for (const k of ['m4.mul.pat.from', 'm4.mul.pat.ruleMul', 'm4.mul.pat.ruleDiv', 'm4.mul.pat.k2mul', 'm4.mul.pat.k1div', 'm4.mul.pat.kProd', 'm4.mul.pat.area', 'ones', 'calc']) {
      expect(seen.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
  })
})

describe('用估算解决问题', () => {
  it('够不够、能不能、哪一款买不起、往大 / 往小估成哪个算式：真算出来的结论和估算的结论一样', () => {
    each(ESTIMATE, (q, d) => {
      const t = textOf(q)!
      const p = t.p
      const est = stemsOf(q, 'expr')[0]
      switch (t.k) {
        case 'm4.mul.est.clothes':
        case 'm4.mul.est.tickets':
        case 'm4.mul.est.volleyball': {
          const [x, y, m] = [num(p, 'p'), num(p, 'n'), num(p, 'm')]
          const enough = x * y <= m
          expect(correctKey(q), q.id).toBe(enough ? 'm4.mul.enough' : 'm4.mul.notEnough')
          // 估一估就能判断：往大估了还不超过 / 往小估了已经不少于
          const r = enough ? roundUp : roundDown
          const ways = [r(x) * r(y), r(x) * y, x * r(y)].filter((e) => e !== x * y)
          expect(ways.some((e) => (enough ? e <= m : e >= m)), q.id).toBe(true)
          if (est) {
            // 提示里写出的估算：估成的数确实是往大（往小）估的，估出来的积在钱数的同一边
            const [x2, y2, e] = est.expr.split(/[×=]/).map((s) => Number(s.trim())) as [number, number, number]
            expect(x2 * y2, q.id).toBe(e)
            expect(enough ? e <= m && x2 >= x && y2 >= y : e >= m && x2 <= x && y2 <= y, q.id).toBe(true)
            expect(stemsOf(q, 'text')[1]!.text, q.id).toMatchObject({ k: expect.stringMatching(enough ? /\.up[12]$/ : /\.down[12]$/) })
            expect(d, `${q.id} 带提示的是第 1 档`).toBe(1)
          }
          return
        }
        case 'm4.mul.est.whichNot':
        case 'm4.mul.est.phones': {
          const n = num(p, 'n')
          const m = num(p, 'm')
          const prices = Object.keys(p)
            .filter((k) => /^p\d$/.test(k))
            .map((k) => num(p, k))
          const bad = prices.filter((x) => x * n > m)
          expect(bad, q.id).toHaveLength(1)
          expect((correctLabel(q) as unknown as { p: { p: number } }).p.p, q.id).toBe(bad[0])
          // 买不起的那款往小估了也不少于钱数，买得起的往大估也不超过
          expect(roundDown(bad[0]!) * n, q.id).toBeGreaterThanOrEqual(m)
          for (const x of prices.filter((x) => x !== bad[0])) expect(roundUp(x) * n, q.id).toBeLessThanOrEqual(m)
          return
        }
        case 'm4.mul.est.bus':
          expect(correctKey(q), q.id).toBe((num(p, 'c') - 1) * num(p, 'k') >= num(p, 'n') ? 'm4.mul.enough' : 'm4.mul.notEnough')
          return
        case 'm4.mul.est.typing':
          expect(correctKey(q), q.id).toBe(num(p, 'v') * num(p, 't') >= num(p, 'w') ? 'm4.mul.can' : 'm4.mul.cannot')
          return
        case 'm4.mul.est.peach':
          expect(correctKey(q), q.id).toBe(num(p, 'n') * num(p, 'a') <= num(p, 't') * 1000 ? 'm4.mul.can' : 'm4.mul.cannot')
          return
        case 'm4.mul.est.about': {
          // 把 201 圈看成 200 圈：只有这一种估法，选项差 10 倍
          const n = num(p, 'n')
          expect(answerNumber(q), q.id).toBe(num(p, 'a') * Math.round(n / 100) * 100)
          return
        }
        case 'm4.mul.est.roundUp':
        case 'm4.mul.est.roundDown': {
          const [x, y] = String(p.e).split(' × ').map(Number) as [number, number]
          const r = t.k.endsWith('Up') ? roundUp : roundDown
          expect(correctText(q), q.id).toBe(`${r(x)} × ${r(y)}`)
          return
        }
        case 'm4.mul.est.why':
          expect(correctKey(q), q.id).toBe('m4.mul.est.bigger')
          return
        case 'm4.mul.est.whyNot':
          expect(correctKey(q), q.id).toBe('m4.mul.est.smaller')
          return
      }
      throw new Error(`${q.id} 认不出题型`)
    })
  })

  it('第 1 档有例 6 带提示的够不够（往大估、往小估都有）、哪一款买不起、限乘人数里包括司机、估成哪个算式、往大估还是往小估', () => {
    const seen = new Set<string>()
    each(ESTIMATE, (q, d) => {
      if (d !== 1) return
      const hint = stemsOf(q, 'text')[1]?.text
      seen.add(hint && typeof hint === 'object' ? hint.k.replace(/[12]$/, '') : textOf(q)!.k)
    })
    for (const k of ['m4.mul.est.up', 'm4.mul.est.down', 'm4.mul.est.whichNot', 'm4.mul.est.bus', 'm4.mul.est.roundUp', 'm4.mul.est.roundDown', 'm4.mul.est.why', 'm4.mul.est.whyNot']) {
      expect(seen.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
  })
})
