import { describe, expect, it } from 'vitest'
import type { DivLine, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { buildSession, createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { answerSpeech, questionSpeech } from '@/engine/speech'
import { hasBlank } from '@/components/practice/blank'
import { divisionWork, estimatePair, oralEach, oralRound, oralShort, tensPair, writtenSlip, zeroSlip } from '../divide'

// 三下「除数是一位数的除法」五个知识点的专项检查：从题目本身（词条参数、算式、竖式）反推答案；
// 竖式按课本的简便写法；范围与分档照课本笔记（两位数 ÷ 一位数都能整除，余数只在三位数里；笔算不含商中有 0 的，那是下一个知识点）。
const SEEDS = 150
const zh = (l: LStr): string => translate(l, 'zh')

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const texts = (q: Question): { k: string; p: Record<string, number> }[] =>
  q.stem
    .filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text' && typeof p.text === 'object')
    .map((p) => p.text as { k: string; p: Record<string, number> })
const keyOf = (q: Question): string => texts(q)[0]?.k ?? ''
const P = (q: Question): Record<string, number> => texts(q)[0]?.p ?? {}
const exprOf = (q: Question): string | undefined => q.stem.find((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr')?.expr
const figOf = (q: Question): Extract<StemPart, { kind: 'long-division' }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: 'long-division' }> => p.kind === 'long-division')
const correct = (q: Question): string =>
  q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
const correctKey = (q: Question): string => {
  const l = q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
  return typeof l === 'object' ? l.k : l
}
const num = (q: Question): number => Number(correct(q))
const sig = (q: Question): string => q.id.split(':')[1]!
const hasZero = (n: number): boolean => String(n).includes('0')

/** 按 × ÷ 先算、从左往右的规则算一个只有 + - × ÷ 和括号的算式 */
function evalExpr(s: string): number {
  return Function(`"use strict"; return (${s.replace(/×/g, '*').replace(/÷/g, '/')})`)() as number
}

/** 数字键盘题的干扰项、选项都不是答案；选项题的数值干扰项都是错的 */
function choicesOk(q: Question): void {
  if (q.input !== 'choice') return
  const right = correct(q)
  const wrong = q.choices!.filter((c) => c.id !== (q.answer as { choiceId: string }).choiceId).map((c) => zh(c.label))
  for (const w of wrong) expect(w, q.id).not.toBe(right)
}

describe('竖式：课本的简便写法', () => {
  const rowsOf = (a: number, b: number): string[] => divisionWork(a, b).rows.map((r) => `${r.text}@${r.end}${r.line ? '_' : ''}`)

  it('课本的几个例子一模一样（p15、p17、p22、p24）', () => {
    expect(rowsOf(36, 2)).toEqual(['2@0_', '16@1', '16@1_', '0@1'])
    expect(rowsOf(148, 6)).toEqual(['12@1_', '28@2', '24@2_', '4@2'])
    // 208 ÷ 2：十位上的 0 除以 2 商 0，简便写法不写「0 / 0」，8 直接落下来
    expect(rowsOf(208, 2)).toEqual(['2@0_', '8@2', '8@2_', '0@2'])
    // 650 ÷ 5：个位上的 0 直接在商的个位写 0，最后的 0 写在十位下面
    expect(rowsOf(650, 5)).toEqual(['5@0_', '15@1', '15@1_', '0@1'])
    // 245 ÷ 8：个位还余 5，商的个位写 0，余数 5 照写
    expect(rowsOf(245, 8)).toEqual(['24@1_', '5@2'])
    expect(rowsOf(501, 5)).toEqual(['5@0_', '1@2'])
    expect(rowsOf(614, 3)).toEqual(['6@0_', '14@2', '12@2_', '2@2'])
    expect(divisionWork(245, 8)).toMatchObject({ quotient: 30, remainder: 5 })
  })

  it('所有两位数、三位数除以 2–9：商和余数对，每一行都说得通', () => {
    for (let b = 2; b <= 9; b++)
      for (let a = 10; a <= 999; a++) {
        if (a < b * 10) continue // 商至少两位（口算范围不用竖式）
        const w = divisionWork(a, b)
        expect(w.quotient, `${a} ÷ ${b}`).toBe(Math.floor(a / b))
        expect(w.remainder).toBe(a % b)
        const n = String(a).length
        for (const r of w.rows) {
          expect(r.end, `${a} ÷ ${b}`).toBeGreaterThanOrEqual(0)
          expect(r.end).toBeLessThan(n)
          expect(r.end - r.text.length + 1).toBeGreaterThanOrEqual(0)
        }
        // 乘积行（下面画线的）都是除数的倍数、不超过 9 倍；最后一行是余数
        for (const r of w.rows.filter((x) => x.line)) {
          expect(Number(r.text) % b).toBe(0)
          expect(Number(r.text) / b).toBeLessThanOrEqual(9)
        }
        expect(Number(w.rows[w.rows.length - 1]!.text)).toBe(a % b)
        expect(w.rows[w.rows.length - 1]!.line).toBeFalsy()
      }
  })
})

describe('口算除法（m3s2-02-oral）', () => {
  it('算式能整除、答案对；第 1 档最高位能整除，第 2 档最高位不够除', () => {
    each('m3s2-02-oral', (q, d) => {
      expect(q.type).toBe('divide')
      choicesOk(q)
      const e = exprOf(q)
      if (sig(q).startsWith('fill-')) {
        // 「?」里填答案，等式成立
        const [l, r] = e!.split(' = ')
        expect(evalExpr(l!.replace('?', String(num(q)))), q.id).toBe(Number(r))
        return
      }
      if (sig(q).startsWith('word-')) {
        const { a, b } = P(q)
        expect(a! % b!, q.id).toBe(0)
        expect(num(q), q.id).toBe(a! / b!)
        return
      }
      const m = /^(\d+) ÷ (\d) = \?$/.exec(e!)
      expect(m, q.id).not.toBeNull()
      const a = Number(m![1])
      const b = Number(m![2])
      expect(a % b, q.id).toBe(0)
      expect(num(q), q.id).toBe(a / b)
      const lead = Number(String(a)[0])
      if (d === 1) {
        // 例 1、例 2：整十 / 整百 / 整千数最高位能整除，或两位数十位、个位都能整除
        const digits = String(a).split('').map(Number)
        expect(
          digits.every((x) => x === 0 || x % b === 0),
          q.id,
        ).toBe(true)
      }
      if (d === 1 || d === 2) expect(a, q.id).toBeLessThanOrEqual(9000)
      if (sig(q).length && d === 2 && lead < b) expect(String(a).length).toBeGreaterThanOrEqual(3)
    })
  })

  it('三种口算的数都在课本的范围里', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed)
      const r = oralRound(rng)
      expect(Number(String(r.a)[0]) % r.b).toBe(0)
      expect(r.a).toBeLessThanOrEqual(9000)
      const e = oralEach(rng)
      expect(e.a).toBeGreaterThanOrEqual(11)
      expect(e.a).toBeLessThanOrEqual(99)
      expect(Math.floor(e.a / 10) % e.b).toBe(0)
      expect((e.a % 10) % e.b).toBe(0)
      const s = oralShort(rng)
      expect(Number(String(s.a)[0])).toBeLessThan(s.b) // 例 3：最高位不够除
      expect(s.a % s.b).toBe(0)
      expect(s.a).toBeLessThanOrEqual(8100)
    }
  })
})

describe('估算（m3s2-02-estimate）', () => {
  it('答案从题目反推：看成几、商是几十多、在哪两个数之间、差出数量级的选项、哪个最便宜', () => {
    each('m3s2-02-estimate', (q) => {
      expect(q.type).toBe('divide')
      choicesOk(q)
      const s = sig(q)
      const p = P(q)
      if (s.startsWith('to-')) {
        // 题目说定了看成几，答案唯一
        expect(p.r! % 10).toBe(0)
        expect(Math.abs(p.a! - p.r!), q.id).toBeLessThanOrEqual(Math.max(3, Math.round(p.r! * 0.04)))
        expect(p.r! % p.b!).toBe(0)
        expect(num(q), q.id).toBe(p.r! / p.b!)
      } else if (s.startsWith('more-')) {
        const t = Math.floor(p.a! / p.b! / 10)
        expect(correctKey(q), q.id).toBe(`m3.div.more${t}`)
        // 商不是整十数（「八十多」要比 80 多）
        expect(p.a! / p.b!).toBeGreaterThan(t * 10)
      } else if (s.startsWith('between-')) {
        const t = Math.floor(p.a! / p.b! / 10)
        expect(correct(q), q.id).toBe(zh({ k: 'm3.div.betweenOpt', p: { x: t * 10, y: t * 10 + 10 } }))
      } else if (s.startsWith('mag-')) {
        const got = Number(/\d+/.exec(correct(q))![0])
        const exact = p.a! / p.b!
        expect(Math.abs(exact - got) / got, q.id).toBeLessThan(0.12)
        const nums = q.choices!.map((c) => Number(/\d+/.exec(zh(c.label))![0])).sort((x, y) => x - y)
        expect(nums, q.id).toEqual([got / 10, got, got * 10])
      } else if (s.startsWith('bags-')) {
        const unit = [p.a1! / p.c1!, p.a2! / p.c2!, p.a3! / p.c3!]
        const sorted = [...unit].sort((x, y) => x - y)
        // 最便宜的和第二便宜的至少差 8 元，估一估就分得出
        expect(sorted[1]! - sorted[0]!, q.id).toBeGreaterThanOrEqual(8)
        const colors = ['red', 'blue', 'yellow']
        expect(correctKey(q), q.id).toBe(`m3.div.bag.${colors[unit.indexOf(sorted[0]!)]}`)
      } else throw new Error(`没见过的题：${q.id}`)
    })
  })

  it('估的数离两头都不太近（练习二 10 那种估不出来的不要）', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const x = tensPair(createRng(seed))
      const qv = x.a / x.b
      expect(qv - x.t * 10).toBeGreaterThanOrEqual(1)
      expect(x.t * 10 + 10 - qv).toBeGreaterThanOrEqual(1)
      const e = estimatePair(createRng(seed))
      expect(e.a).not.toBe(e.r)
      expect(e.r / e.b).toBe(e.e)
    }
  })
})

describe('笔算除法（m3s2-02-written）', () => {
  it('答案从题目反推；第 1、2 档的商里都没有 0（商中间、末尾有 0 是下一个知识点）；两位数都能整除', () => {
    each('m3s2-02-written', (q, d) => {
      expect(q.type).toBe('divide')
      choicesOk(q)
      const s = sig(q)
      const p = P(q)
      const fig = figOf(q)
      if (s.startsWith('q-') || s.startsWith('r-')) {
        const { a, b } = p
        expect(fig).toMatchObject({ dividend: a, divisor: b })
        expect(num(q), q.id).toBe(s.startsWith('q-') ? Math.floor(a! / b!) : a! % b!)
        expect(hasZero(Math.floor(a! / b!)), q.id).toBe(false)
        if (a! < 100) expect(a! % b!, `${q.id} 两位数除以一位数都能整除`).toBe(0)
        if (s.startsWith('r-')) expect(a! % b!, q.id).toBeGreaterThan(0)
        // 问商的：商那一行是要填的空，和被除数一样宽（不透露商有几位）
        if (s.startsWith('q-')) expect(fig!.quotient).toEqual({ text: '?', end: String(a).length - 1, w: String(a).length })
        else expect(fig!.quotient).toBeUndefined()
        expect(hasBlank(q), q.id).toBe(q.input === 'numpad' && s.startsWith('q-'))
      } else if (s.startsWith('digits-')) {
        const digits = String(Math.floor(p.a! / p.b!)).length
        expect(correctKey(q), q.id).toBe(digits === 3 ? 'm3.div.threeDigit' : 'm3.div.twoDigit')
      } else if (s.startsWith('check-')) {
        expect(p.a, q.id).toBe(p.q! * p.b! + (p.r ?? 0))
        expect(p.r ?? 0).toBeLessThan(p.b!)
        const [l] = exprOf(q)!.split(' = ')
        expect(evalExpr(l!), q.id).toBe(p.a)
        expect(num(q)).toBe(p.a)
      } else if (s.startsWith('word-')) {
        const { a, b } = p
        const left = /Left$/.test(keyOf(q))
        expect(num(q), q.id).toBe(left ? a! % b! : Math.floor(a! / b!))
        if (left) expect(a! % b!).toBeGreaterThan(0)
        expect(hasZero(Math.floor(a! / b!)), q.id).toBe(false)
      } else if (s.startsWith('maxRem-')) expect(num(q), q.id).toBe(p.b! - 1)
      else if (s.startsWith('maxDividend-')) expect(num(q), q.id).toBe(p.q! * p.b! + p.b! - 1)
      else if (s.startsWith('min-')) {
        // 除数是一位数、比余数大：最小的除数是余数 + 1
        expect(p.r! + 1).toBeLessThanOrEqual(9)
        expect(num(q), q.id).toBe(p.q! * (p.r! + 1) + p.r!)
      } else if (s.startsWith('box-')) {
        // 方框里填 1–9 逐个试，看商是几位数：三位数要最小的，两位数要最小 / 最大的
        const width = String(fig!.dividend).length
        const rest = fig!.dividend % 10 ** (width - 1)
        const qlen = (digit: number): number => String(Math.floor((digit * 10 ** (width - 1) + rest) / fig!.divisor)).length
        const k = keyOf(q)
        const fits = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => qlen(x) === (k === 'm3.div.boxMin3' ? 3 : 2))
        expect(fits.length, q.id).toBeGreaterThan(0)
        expect(num(q), q.id).toBe(k === 'm3.div.boxMax2' ? Math.max(...fits) : Math.min(...fits))
        expect(fig!.box).toBe(0)
      } else if (s.startsWith('lights-')) {
        const colors = ['red', 'yellow', 'yellow', 'blue', 'blue', 'blue']
        expect(correctKey(q), q.id).toBe(`m3.div.color.${colors[(p.n! - 1) % 6]}`)
      } else if (s.startsWith('fix-') || s.startsWith('fixv-')) checkFix(q)
      else if (s.startsWith('st-')) checkStatement(q)
      else throw new Error(`没见过的题：${q.id}`)
      if (d === 1) expect(['q', 'r'], q.id).toContain(s.split('-')[0])
    })
  })

  it('改错的几种错法照课本（练习三 2）：十位的余数忘了合起来、漏写商的十位、商的位置写错', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const carry = writtenSlip(createRng(seed), 'carry')
      expect(Number(carry.shown.text)).not.toBe(carry.right)
      expect(carry.right).toBe(carry.a / carry.b)
      const skip = writtenSlip(createRng(seed), 'skip')
      expect(Number(skip.shown.text)).toBe(skip.right % 10)
      const place = writtenSlip(createRng(seed), 'place')
      expect(Number(place.shown.text)).toBe(place.right)
      expect(place.shown.end).toBe(String(place.a).length - 2)
      const right = writtenSlip(createRng(seed), 'right')
      expect(right.rows).toEqual(divisionWork(right.a, right.b).rows)
    }
  })
})

/** 改错题：对的竖式和 divisionWork 一模一样、商写在个位上方；错的要么商不对、要么位置不对；问正确的商时答案就是真正的商 */
function checkFix(q: Question): void {
  const fig = figOf(q)!
  const right = Math.floor(fig.dividend / fig.divisor)
  const shown = fig.quotient!
  const w = divisionWork(fig.dividend, fig.divisor)
  const isRight =
    Number(shown.text.replace(/\s/g, '')) === right &&
    !shown.text.includes(' ') &&
    shown.end === String(fig.dividend).length - 1 &&
    JSON.stringify(fig.rows) === JSON.stringify(w.rows)
  if (sig(q).startsWith('fixv-')) {
    expect(isRight, q.id).toBe(false)
    expect(num(q), q.id).toBe(right)
  } else expect(correctKey(q), q.id).toBe(isRight ? 'm3.opt.right' : 'm3.opt.wrong')
}
function checkStatement(q: Question): void {
  // 独立的判断表（课本 p18 的三条法则、p22 的 0、练习四 9）
  const TRUE = new Set([
    'm3.div.st.highFirst',
    'm3.div.st.aboveDigit',
    'm3.div.st.remSmaller',
    'm3.div.st.checkMul',
    'm3.div.st.notAlways3',
    'm3.div.st.zeroDiv',
    'm3.div.st.zeroHold',
  ])
  const st = texts(q)[1]!.k
  expect(correctKey(q), q.id).toBe(TRUE.has(st) ? 'm3.opt.right' : 'm3.opt.wrong')
}

describe('商中间或末尾有 0 的除法（m3s2-02-zeros）', () => {
  it('答案从题目反推；第 1、2 档算的都是商里有 0 的；比大小、改错、应用题都对', () => {
    each('m3s2-02-zeros', (q, d) => {
      expect(q.type).toBe('divide')
      choicesOk(q)
      const s = sig(q)
      const p = P(q)
      if (s.startsWith('zero-')) {
        const [l] = exprOf(q)!.split(' = ')
        expect(num(q), q.id).toBe(evalExpr(l!))
        expect(l).toMatch(/0/)
      } else if (s.startsWith('q-') || s.startsWith('r-')) {
        const { a, b } = p
        expect(hasZero(Math.floor(a! / b!)), `${q.id} 商里要有 0`).toBe(true)
        expect(num(q), q.id).toBe(s.startsWith('q-') ? Math.floor(a! / b!) : a! % b!)
        if (s.startsWith('r-')) expect(a! % b!).toBeGreaterThan(0)
        if (d === 1) expect(a! % b!, `${q.id} 第 1 档没有余数`).toBe(0)
        expect(figOf(q)).toMatchObject({ dividend: a, divisor: b })
      } else if (s.startsWith('cmp-')) {
        const [l, r] = exprOf(q)!.split(' ○ ')
        const x = evalExpr(l!)
        const y = evalExpr(r!)
        expect(Number.isInteger(x) && Number.isInteger(y), q.id).toBe(true)
        expect(correct(q), q.id).toBe(x > y ? '>' : x < y ? '<' : '=')
      } else if (s.startsWith('fix-') || s.startsWith('fixv-')) checkFix(q)
      else if (s.startsWith('st-')) checkStatement(q)
      else if (s.startsWith('word-')) {
        const k = keyOf(q)
        const want = k.endsWith('ticket') ? p.a! / 2 : k.endsWith('chairs') ? p.a! / 2 - p.c! / p.m! : k.endsWith('plane') ? p.v! / 5 : p.r! * p.r! * 3 + p.r!
        expect(Number.isInteger(want) && want > 0, q.id).toBe(true)
        expect(num(q), q.id).toBe(want)
      } else throw new Error(`没见过的题：${q.id}`)
    })
  })

  it('比大小三种答案都出现，= 也有', () => {
    const seen = new Set<string>()
    each('m3s2-02-zeros', (q) => sig(q).startsWith('cmp-') && seen.add(correct(q)))
    expect([...seen].sort()).toEqual(['<', '=', '>'])
  })

  it('改错的几种错法照课本（练习四 8）：漏写商中间的 0、漏写末尾的 0、最后一位没落下来就商 0', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const mid = zeroSlip(createRng(seed), 'mid')
      expect(mid.shown.text).toMatch(/^\d \d$/)
      expect(String(mid.right)[1]).toBe('0')
      const end = zeroSlip(createRng(seed), 'end')
      expect(end.right % 10).toBe(0)
      expect(Number(end.shown.text) * 10).toBe(end.right)
      const rem = zeroSlip(createRng(seed), 'rem')
      expect(rem.a % 10).toBe(0)
      expect(rem.shown.text.endsWith('0')).toBe(true)
      expect(Number(rem.shown.text)).not.toBe(rem.right)
      expect(rem.right).toBe(Math.floor(rem.a / rem.b))
      const right = zeroSlip(createRng(seed), 'right')
      expect(right.rows).toEqual(divisionWork(right.a, right.b).rows)
    }
  })
})

describe('用乘除法解决问题（m3s2-02-solve）', () => {
  const ANSWER: Record<string, (p: Record<string, number>) => number> = {
    'm3.div.s.cups': (p) => p.a! * p.b! * p.c!,
    'm3.div.s.phalanx': (p) => p.r! * p.c! * p.n!,
    'm3.div.s.eggBoxes': (p) => p.r! * p.c! * p.n!,
    'm3.div.s.rice': (p) => p.a! * p.b! * p.c!,
    'm3.div.s.teams': (p) => p.t! / p.a! / p.b!,
    'm3.div.s.eggPack': (p) => p.t! / p.a! / p.b!,
    'm3.div.s.shelves': (p) => p.t! / p.a! / p.b!,
    'm3.div.s.seedlings': (p) => (p.p! / p.a!) * p.b!,
    'm3.div.s.bees': (p) => (p.p! / p.a!) * p.b!,
    'm3.div.s.snail': (p) => (p.p! / p.a!) * p.b!,
    'm3.div.s.shuttle': (p) => (p.p! / p.a!) * p.b!,
    'm3.div.s.cars': (p) => (p.v! * p.t!) / p.u!,
    'm3.div.s.pages': (p) => (p.a! * p.b!) / p.c!,
    'm3.div.s.eggRepack': (p) => (p.a! * p.b!) / p.c!,
    'm3.div.s.dolls': (p) => p.t! / p.a! / p.b!,
    'm3.div.s.pool': (p) => p.d! * 2 * p.k!,
    'm3.div.s.rope': (p) => (p.t! / 3) * 2,
    'm3.div.s.pills': (p) => p.t! / (p.a! * p.b!),
  }
  it('答案从题目参数重算；每一步都整除；归一、归总的「一份」是整数', () => {
    const tier1 = new Set<string>()
    each('m3s2-02-solve', (q, d) => {
      choicesOk(q)
      const k = keyOf(q)
      const p = P(q)
      expect(ANSWER[k], `${q.id} 没有对应的算法`).toBeDefined()
      const want = ANSWER[k]!(p)
      expect(Number.isInteger(want) && want > 0, q.id).toBe(true)
      expect(num(q), q.id).toBe(want)
      if (['m3.div.s.seedlings', 'm3.div.s.bees', 'm3.div.s.snail', 'm3.div.s.shuttle'].includes(k)) expect(p.p! % p.a!, q.id).toBe(0)
      if (k === 'm3.div.s.teams' || k === 'm3.div.s.eggPack') expect(p.t! % (p.a! * p.b!)).toBe(0)
      // 连乘的类型是乘法，其余是除法
      expect(q.type, q.id).toBe(
        [
          'm3.div.s.cups',
          'm3.div.s.phalanx',
          'm3.div.s.eggBoxes',
          'm3.div.s.rice',
          'm3.div.s.seedlings',
          'm3.div.s.bees',
          'm3.div.s.snail',
          'm3.div.s.shuttle',
          'm3.div.s.pool',
        ].includes(k)
          ? 'multiply'
          : 'divide',
      )
      if (d === 1) tier1.add(k)
    })
    // 第 1 档是连乘、连除（例 7、例 8、p36 鸡蛋）
    expect([...tier1].sort()).toEqual(['m3.div.s.cups', 'm3.div.s.eggBoxes', 'm3.div.s.eggPack', 'm3.div.s.phalanx', 'm3.div.s.rice', 'm3.div.s.teams'])
  })
})

describe('除法：朗读与作答', () => {
  const ALL = ['m3s2-02-oral', 'm3s2-02-estimate', 'm3s2-02-written', 'm3s2-02-zeros', 'm3s2-02-solve']

  it('朗读：算式里不用「……」（读不出「余」），也不用读音拿不准的字当单独的片段', () => {
    for (const kpId of ALL)
      each(kpId, (q) => {
        for (const part of q.stem) if (part.kind === 'expr') expect(part.expr.includes('…'), q.id).toBe(false)
        const tokens = [...questionSpeech(q, 'zh'), ...answerSpeech(q, 'zh')]
        for (const t of tokens) {
          expect(['长', '行', '重', '只', '数', '得', '地', '种', '结', '了', '还'], `${q.id}：「${t}」`).not.toContain(t)
          // 这些多音字不用（「结」只在「结果」里：jié guǒ）
          expect(/长|得|地|种|结/.test(t.replace(/结果/g, '')), `${q.id}：「${t}」`).toBe(false)
          expect(/[()（）]/.test(t), `${q.id}：「${t}」`).toBe(false)
        }
      })
  })

  it('竖式里要填的空只在问商的数字键盘题里（练习页把按的数填进去）', () => {
    for (const kpId of ALL)
      each(kpId, (q) => {
        const fig = figOf(q)
        if (!fig) return
        const blank = [fig.quotient, ...(fig.rows ?? [])].filter((r): r is DivLine => !!r && r.text === '?')
        expect(blank.length).toBeLessThanOrEqual(1)
        if (blank.length && q.input === 'numpad') expect(hasBlank(q)).toBe(true)
      })
  })

  it('一轮 8 题凑得满（第 1 档题目够多）', () => {
    for (const kpId of ALL) for (let seed = 1; seed <= 20; seed++) expect(buildSession(kpId, 8, { seed })).toHaveLength(8)
  })
})
