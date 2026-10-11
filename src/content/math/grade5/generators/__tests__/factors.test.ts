import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { ZH } from '../../lang/factors'
import { FACTS, GUESS_BOOK, PRIME_JUDGE, RULES_25, RULES_25_MORE, RULES_3, guessCandidates, waysOf } from '../factors'

// 五下「2 因数和倍数」六个知识点：从题干的数（算式、参数、百数表、数字卡片、小方块）反推答案，150 种子 × 三档；
// 选项题查「只有一个选项对，而且就是标的那个」。外加课本的约束：第 1 档出得到例题与做一做；朗读避坑（不写「数数」「划」「为」「得」「地」「长」「差」、
// 括号、阿拉伯数字的序数）。数论的事实在这里另写一遍（不用生成器里的函数），免得两边一起错。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Param = LStr | number
type Text = { k: string; p: Record<string, Param> }

const divisors = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1).filter((k) => n % k === 0)
const prime = (n: number): boolean => divisors(n).length === 2
const sumDigits = (n: number): number => String(n).split('').reduce((s, c) => s + Number(c), 0)

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const texts = (q: Question): Text[] =>
  q.stem
    .filter((s): s is Extract<StemPart, { kind: 'text' }> => s.kind === 'text')
    .map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const last = (q: Question): Text => texts(q)[texts(q).length - 1]!
const part = <K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined =>
  q.stem.find((s): s is Extract<StemPart, { kind: K }> => s.kind === kind)
const n = (v: Param | undefined): number => v as number
/** 正确答案：数字键盘的数，或选项的中文 */
function answer(q: Question): string {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}
/** 选项题：只有一个选项满足 ok，而且就是标成正确的那个 */
function onlyRight(q: Question, ok: (label: string, raw: LStr) => boolean): void {
  expect(q.input, q.id).toBe('choice')
  const good = q.choices!.filter((c) => ok(zh(c.label), c.label))
  expect(good.map((c) => c.id), `${q.id}：${q.choices!.map((c) => zh(c.label)).join(' / ')}`).toEqual([(q.answer as { choiceId: string }).choiceId])
}
const yesNo = (truth: boolean): string => (truth ? '对' : '不对')
/** 「x 是 y 的因数 / 倍数」对不对（小数不讲因数和倍数） */
function relation(k: 'factor' | 'multiple', x: Param, y: Param): boolean {
  const a = Number(x)
  const b = Number(y)
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false
  return k === 'factor' ? b % a === 0 : a % b === 0
}
/** 数字键盘题也可能出成数的选项：答案按数比 */
const num = (q: Question): number => Number(answer(q))

describe('因数和倍数的认识（m5s2-02-meaning）', () => {
  it('算式里谁是谁的因数 / 倍数、有余数的不算、做一做两个数的说法：从算式和参数反推', () => {
    const kinds = new Set<string>()
    each('m5s2-02-meaning', (q, d) => {
      const kind = kindOf(q)
      if (d === 1) kinds.add(kind)
      const t = last(q)
      const expr = part(q, 'expr')?.expr
      if (expr) {
        // 算式本身是对的
        const m = /^(\d+) ([÷×]) (\d+) = (\d+)$/.exec(expr)!
        expect(m, `${q.id} ${expr}`).toBeTruthy()
        const [x, op, y, z] = [Number(m[1]), m[2], Number(m[3]), Number(m[4])]
        expect(op === '÷' ? x / y : x * y, q.id).toBe(z)
      }
      switch (t.k) {
        case 'm5.fac.role.ask': {
          const { x, y } = t.p
          expect(x, `${q.id} 两个数一样就既是因数又是倍数`).not.toBe(y)
          expect(answer(q), q.id).toBe(relation('factor', x!, y!) ? '因数' : '倍数')
          expect(relation('factor', x!, y!) || relation('multiple', x!, y!), q.id).toBe(true)
          break
        }
        case 'm5.fac.role.both':
          expect(n(t.p.z) % n(t.p.x) === 0 && n(t.p.z) % n(t.p.y) === 0, q.id).toBe(true)
          expect(answer(q), q.id).toBe('因数')
          break
        case 'm5.fac.role.bothRev':
          expect(answer(q), q.id).toBe('倍数')
          break
        case 'm5.fac.j.factor':
        case 'm5.fac.j.multiple': {
          const rem = texts(q).find((x) => x.k === 'm5.fac.rem.data')
          if (rem) {
            const { a, b, q: qq, r } = rem.p as Record<string, number>
            expect(a, q.id).toBe(b! * qq! + r!)
            expect(r! > 0 && r! < b!, q.id).toBe(true)
          }
          expect(answer(q), q.id).toBe(yesNo(relation(t.k === 'm5.fac.j.factor' ? 'factor' : 'multiple', t.p.x!, t.p.y!)))
          break
        }
        case 'm5.fac.pair.q': {
          const { a, b } = t.p as Record<string, number>
          onlyRight(q, (_, raw) => {
            const l = raw as { k: string; p: { x: number; y: number } }
            expect([a, b].sort().join(), q.id).toBe([l.p.x, l.p.y].sort().join())
            return relation(l.k === 'm5.fac.s.factor' ? 'factor' : 'multiple', l.p.x, l.p.y)
          })
          break
        }
        case 'm5.fac.j.one':
          expect(answer(q)).toBe('对')
          break
        case 'm5.fac.j.only':
          expect(answer(q)).toBe('不对')
          break
        case 'm5.fac.j.because': {
          const { a, b, c, x, y } = t.p as Record<string, number>
          expect(a! / b!, q.id).toBe(c)
          expect(answer(q), q.id).toBe(yesNo(relation('multiple', x!, y!)))
          break
        }
        case 'm5.fac.j.bare':
          expect(answer(q), q.id).toBe('不对')
          break
        default:
          throw new Error(`没核对过的题：${q.id}（${t.k}）`)
      }
    })
    // 例 1（除法、乘法算式，有余数的不算）、做一做（两个数）都在第 1 档
    for (const k of ['div', 'mul', 'rem', 'exact', 'pair']) expect(kinds, k).toContain(k)
  })
})

describe('找一个数的因数和倍数（m5s2-02-find）', () => {
  it('列因数 / 倍数、因数的个数、挑数、最小最大、发现框、猜数游戏：从参数反推', () => {
    const kinds = new Set<string>()
    each('m5s2-02-find', (q, d) => {
      const kind = kindOf(q)
      if (d === 1) kinds.add(kind)
      const t = last(q)
      const v = t.p.n as number
      switch (t.k) {
        case 'm5.fac.listF.q':
          onlyRight(q, (s) => s === divisors(v).join('，'))
          break
        case 'm5.fac.countF.q':
          expect(num(q), q.id).toBe(divisors(v).length)
          break
        case 'm5.fac.listM.q':
          onlyRight(q, (s) => s === [1, 2, 3, 4, 5].map((k) => k * v).join('，') + '，…')
          break
        case 'm5.fac.whichF.q':
          onlyRight(q, (s) => v % Number(s) === 0)
          break
        case 'm5.fac.whichNotF.q':
          onlyRight(q, (s) => v % Number(s) !== 0)
          break
        case 'm5.fac.whichM.q':
          onlyRight(q, (s) => Number(s) % v === 0)
          break
        case 'm5.fac.ofWhich.q':
          onlyRight(q, (s) => v % Number(s) === 0)
          break
        case 'm5.fac.neither.q':
          onlyRight(q, (s) => n(t.p.a) % Number(s) !== 0 && n(t.p.b) % Number(s) !== 0)
          break
        case 'm5.fac.minF.q':
          expect(num(q), q.id).toBe(1)
          break
        case 'm5.fac.maxF.q':
        case 'm5.fac.minM.q':
        case 'm5.fac.both.q':
          expect(num(q), q.id).toBe(v)
          break
        case 'm5.fac.minM1.q':
        case 'm5.fac.maxF1.q':
          expect(num(q), q.id).toBe(1)
          break
        case 'm5.fac.guess.q': {
          const b = typeof t.p.b === 'number' ? [t.p.b] : Object.values((t.p.b as { p: Record<string, number> }).p)
          const ok = divisors(n(t.p.n)).filter((x) => x % n(t.p.a) === 0 && b.every((m) => x % m === 0))
          expect(ok, `${q.id} 答案要唯一`).toHaveLength(1)
          expect(num(q), q.id).toBe(ok[0])
          break
        }
        case 'm5.fac.sum.j':
        case 'm5.fac.diff.j': {
          const { a, b } = t.p as Record<string, number>
          expect(a! % v === 0 && b! % v === 0 && a !== b, q.id).toBe(true)
          if (t.k === 'm5.fac.diff.j') expect(a!).toBeGreaterThan(b!)
          expect(answer(q)).toBe('对')
          break
        }
        default: {
          const fact = FACTS.find(([k]) => k === t.k)
          if (!fact) throw new Error(`没核对过的题：${q.id}（${t.k}）`)
          expect(answer(q), q.id).toBe(yesNo(fact[1]))
        }
      }
    })
    // 例 2（因数有哪些、几个）、例 3（倍数有哪些）、发现框都在第 1 档
    for (const k of ['listF', 'countF', 'listM', 'minF', 'maxF', 'minM', 'fact']) expect(kinds, k).toContain(k)
    expect(guessCandidates(GUESS_BOOK)).toEqual([42])
  })

  it('列因数的选项：干扰项都不是正确的那一串（漏了 1、漏了它本身、多一个、写成倍数）', () => {
    each('m5s2-02-find', (q) => {
      if (last(q).k !== 'm5.fac.listF.q') return
      const right = answer(q)
      for (const c of q.choices!) if (zh(c.label) !== right) expect(zh(c.label)).not.toBe(right)
    })
  })
})

describe('2、5 的倍数的特征（m5s2-02-two-five）', () => {
  it('百数表、哪个是 2 / 5 的倍数、奇偶、结论判断、数字卡片、最小三位数、花店：从参数反推', () => {
    const kinds = new Set<string>()
    each('m5s2-02-two-five', (q, d) => {
      const kind = kindOf(q)
      if (d === 1) kinds.add(kind)
      const t = last(q)
      const chart = part(q, 'hundred-chart')
      if (chart) {
        const all = Array.from({ length: chart.count }, (_, i) => chart.start + i)
        if (chart.circled?.length) expect(chart.circled, q.id).toEqual(all.filter((x) => x % 5 === 0))
        if (chart.boxed?.length) expect(chart.boxed, q.id).toEqual(all.filter((x) => x % 2 === 0))
      }
      const cards = part(q, 'digit-cards')?.digits
      switch (t.k) {
        case 'm5.fac.chart.circledOf':
          expect(num(q)).toBe(5)
          break
        case 'm5.fac.chart.boxedOf':
          expect(num(q)).toBe(2)
          break
        case 'm5.fac.chart.circledOnes':
          expect(answer(q)).toBe('0 或 5')
          break
        case 'm5.fac.chart.boxedOnes':
          expect(answer(q)).toBe('0，2，4，6 或 8')
          break
        case 'm5.fac.chart.bothOnes':
          expect(chart!.circled!.length && chart!.boxed!.length).toBeTruthy()
          expect(answer(q)).toBe('只有 0')
          break
        case 'm5.fac.whichM.q':
          onlyRight(q, (s) => Number(s) % n(t.p.n) === 0)
          break
        case 'm5.fac.which25.q':
          onlyRight(q, (s) => Number(s) % 10 === 0)
          break
        case 'm5.fac.fiveOdd.q':
          onlyRight(q, (s) => Number(s) % 5 === 0 && Number(s) % 2 === 1)
          break
        case 'm5.fac.oddEven.q':
          expect(answer(q), q.id).toBe(n(t.p.n) % 2 === 0 ? '偶数' : '奇数')
          break
        case 'm5.fac.j.multiple':
          expect(answer(q), q.id).toBe(yesNo(relation('multiple', t.p.x!, t.p.y!)))
          break
        case 'm5.fac.card.q25':
        case 'm5.fac.card.q5odd': {
          // 「ab?」：问号处只有一个数字行
          const ok = Array.from({ length: 10 }, (_, x) => Number(cards!.replace('?', String(x)))).filter((x) =>
            t.k === 'm5.fac.card.q25' ? x % 10 === 0 : x % 5 === 0 && x % 2 === 1,
          )
          expect(ok, q.id).toHaveLength(1)
          expect(num(q), q.id).toBe(ok[0]! % 10)
          break
        }
        case 'm5.fac.card.pick2':
        case 'm5.fac.card.pick5': {
          const m = t.k === 'm5.fac.card.pick2' ? 2 : 5
          onlyRight(q, (s) => Number(cards!.replace('?', s)) % m === 0)
          break
        }
        case 'm5.fac.same5.q':
          expect(num(q)).toBe(55)
          break
        case 'm5.fac.ext.q': {
          const what = zh(t.p.what as LStr)
          const range = what.includes('两位') ? [10, 99] : [100, 999]
          const ok = Array.from({ length: range[1]! - range[0]! + 1 }, (_, i) => range[0]! + i).filter((x) => x % n(t.p.a) === 0 && x % n(t.p.b) === 0)
          expect(num(q), q.id).toBe(what.includes('最小') ? ok[0] : ok[ok.length - 1])
          break
        }
        case 'm5.fac.flower.judge':
          expect(n(t.p.m) % 5, q.id).not.toBe(0)
          expect(answer(q)).toBe('不对')
          break
        case 'm5.fac.flower.pick':
          // 马蹄莲 10 元、郁金香 5 元：一共要付的钱一定是 5 的倍数
          onlyRight(q, (s) => Number(s.replace(' 元', '')) % 5 === 0)
          break
        default: {
          const rule = [...RULES_25, ...RULES_25_MORE].find(([k]) => k === t.k)
          if (!rule) throw new Error(`没核对过的题：${q.id}（${t.k}）`)
          expect(answer(q), q.id).toBe(yesNo(rule[1]))
        }
      }
    })
    // 例 1（百数表）、做一做（哪个是 2、5 的倍数）、奇数偶数都在第 1 档
    for (const k of ['chart', 'which25', 'which2', 'which5', 'oe', 'rule']) expect(kinds, k).toContain(k)
  })
})

describe('3 的倍数的特征（m5s2-02-three）', () => {
  it('各位上的数的和、是不是 3 的倍数、加一张卡片、几种填法、最小三位数、凑 3 人一组：从参数反推', () => {
    const kinds = new Set<string>()
    each('m5s2-02-three', (q, d) => {
      const kind = kindOf(q)
      if (d === 1) kinds.add(kind)
      const t = last(q)
      const chart = part(q, 'hundred-chart')
      const cards = part(q, 'digit-cards')?.digits
      switch (t.k) {
        case 'm5.fac.dsum.q':
          expect(num(q), q.id).toBe(sumDigits(n(t.p.n)))
          break
        case 'm5.fac.j.multiple':
          expect(answer(q), q.id).toBe(yesNo(n(t.p.x) % n(t.p.y) === 0))
          break
        case 'm5.fac.whichM.q':
          expect(t.p.n).toBe(3)
          onlyRight(q, (s) => Number(s) % 3 === 0)
          break
        case 'm5.fac.addCard.q':
          expect(cards, q.id).toBe(`${t.p.n}?`)
          onlyRight(q, (s) => (n(t.p.n) * 10 + Number(s)) % 3 === 0)
          break
        case 'm5.fac.chart.circledOf': {
          const all = Array.from({ length: chart!.count }, (_, i) => chart!.start + i)
          expect(chart!.circled).toEqual(all.filter((x) => x % 3 === 0))
          expect(num(q)).toBe(3)
          break
        }
        case 'm5.fac.chart.only369':
          expect(answer(q)).toBe('不对')
          break
        case 'm5.fac.chart.any09':
          expect(answer(q)).toBe('对')
          break
        case 'm5.fac.ways.q': {
          let ways = 0
          for (let x = 0; x <= 9; x++) if (!(x === 0 && cards!.startsWith('?')) && sumDigits(Number(cards!.replace('?', String(x)))) % 3 === 0) ways++
          expect(num(q), q.id).toBe(ways)
          expect(waysOf(cards!)).toBe(ways)
          break
        }
        case 'm5.fac.teams.q': {
          let more = 1
          while ((n(t.p.n) + more) % 3 !== 0) more++
          expect(num(q), q.id).toBe(more)
          break
        }
        case 'm5.fac.four.q3':
        case 'm5.fac.four.q6': {
          expect(cards).toBe('4305')
          const usable = (s: string): boolean => {
            const ds = s.split('').map(Number)
            return ds.length === 3 && ds[0] !== 0 && new Set(ds).size === 3 && ds.every((x) => [4, 3, 0, 5].includes(x))
          }
          for (const c of q.choices!) expect(usable(zh(c.label)), `${q.id} ${zh(c.label)} 要用卡片能摆出来`).toBe(true)
          onlyRight(q, (s) => Number(s) % (t.k === 'm5.fac.four.q6' ? 6 : 3) === 0)
          break
        }
        case 'm5.fac.ext.q':
        case 'm5.fac.ext.q3': {
          const what = zh(t.p.what as LStr)
          const ms = [t.p.a, t.p.b, t.p.c].filter((x) => x !== undefined).map(Number)
          const range = what.includes('两位') ? [10, 99] : [100, 999]
          const ok = Array.from({ length: range[1]! - range[0]! + 1 }, (_, i) => range[0]! + i).filter((x) => ms.every((m) => x % m === 0))
          expect(num(q), q.id).toBe(what.includes('最小') ? ok[0] : ok[ok.length - 1])
          break
        }
        case 'm5.fac.evenThree.q':
          onlyRight(q, (s) => Number(s) % 6 === 0)
          break
        case 'm5.fac.r.four2':
          expect(answer(q)).toBe('对')
          break
        case 'm5.fac.r.two4':
          expect(answer(q)).toBe('不对')
          break
        default: {
          const rule = RULES_3.find(([k]) => k === t.k)
          if (!rule) throw new Error(`没核对过的题：${q.id}（${t.k}）`)
          expect(answer(q), q.id).toBe(yesNo(rule[1]))
        }
      }
    })
    // 例 2（百数表、各位上的数的和、结论）、做一做（卡片摆的数、后面加一张卡片）都在第 1 档
    for (const k of ['chart3', 'dsum', 'is3', 'addCard', 'rule']) expect(kinds, k).toContain(k)
    expect([...kinds].some((k) => k.startsWith('which3'))).toBe(true)
  })

  it('练习三 5 的五个数：□7、4□2、□44 有 3、4、3 种填法', () => {
    expect(['?7', '4?2', '?44', '65?', '12?1'].map(waysOf)).toEqual([3, 4, 3, 3, 3])
  })
})

describe('质数和合数（m5s2-02-prime）', () => {
  it('因数的个数、质数还是合数、挑质数、用表找质数、定义、和与积猜质数、哥德巴赫：从参数反推', () => {
    const kinds = new Set<string>()
    each('m5s2-02-prime', (q, d) => {
      const kind = kindOf(q)
      if (d === 1) kinds.add(kind)
      const t = last(q)
      const chart = part(q, 'hundred-chart')
      switch (t.k) {
        case 'm5.fac.countF.q':
          if (d === 1) expect(n(t.p.n)).toBeLessThanOrEqual(20)
          expect(num(q), q.id).toBe(divisors(n(t.p.n)).length)
          break
        case 'm5.fac.pc.q': {
          const v = n(t.p.n)
          expect(answer(q), q.id).toBe(v === 1 ? '既不是质数，也不是合数' : prime(v) ? '质数' : '合数')
          expect(q.choices, q.id).toHaveLength(3)
          break
        }
        case 'm5.fac.whichP.q':
          onlyRight(q, (s) => prime(Number(s)))
          break
        case 'm5.fac.whichC.q':
          onlyRight(q, (s) => Number(s) > 1 && !prime(Number(s)))
          break
        case 'm5.fac.sieve.next1':
        case 'm5.fac.sieve.next2':
        case 'm5.fac.sieve.next3': {
          const step = Number(t.k.slice(-1))
          const done = [2, 3, 5].slice(0, step)
          const want = Array.from({ length: chart!.count }, (_, i) => i + 1).filter((x) => x === 1 || done.some((p) => x !== p && x % p === 0))
          expect(chart!.crossed, q.id).toEqual(want)
          expect(num(q), q.id).toBe([3, 5, 7][step - 1])
          break
        }
        case 'm5.fac.sieve.left': {
          // 没去掉的都是质数
          const left = Array.from({ length: chart!.count }, (_, i) => i + 1).filter((x) => !chart!.crossed!.includes(x))
          expect(left.every(prime), q.id).toBe(true)
          expect(left.length).toBe(Array.from({ length: chart!.count }, (_, i) => i + 1).filter(prime).length)
          expect(answer(q)).toBe('质数')
          break
        }
        case 'm5.fac.countP.q': {
          const m = n(t.p.m)
          expect(chart!.count).toBe(m)
          expect(num(q), q.id).toBe(Array.from({ length: m }, (_, i) => i + 1).filter(prime).length)
          break
        }
        case 'm5.fac.def.prime':
          expect(answer(q)).toBe('质数')
          break
        case 'm5.fac.def.composite':
          expect(answer(q)).toBe('合数')
          break
        case 'm5.fac.j.onePrime':
        case 'm5.fac.j.oneComposite':
          expect(answer(q)).toBe('不对')
          break
        case 'm5.fac.j.oneNeither':
          expect(answer(q)).toBe('对')
          break
        case 'm5.fac.minPrime.q':
          expect(num(q)).toBe(2)
          break
        case 'm5.fac.minComposite.q':
          expect(num(q)).toBe(4)
          break
        case 'm5.fac.riddle.big':
        case 'm5.fac.riddle.small': {
          const s = n(t.p.s)
          const p = n(t.p.p)
          const pairs = Array.from({ length: s }, (_, x) => x).filter((x) => prime(x) && prime(s - x) && x < s - x && x * (s - x) === p)
          expect(pairs, `${q.id} 两个质数要唯一`).toHaveLength(1)
          expect(num(q), q.id).toBe(t.k.endsWith('big') ? s - pairs[0]! : pairs[0])
          break
        }
        case 'm5.fac.gold.q': {
          const m = /^(\d+) = (\d+) \+ \?$/.exec(part(q, 'expr')!.expr)!
          expect(Number(m[1])).toBe(t.p.n)
          expect(prime(Number(m[2])), q.id).toBe(true)
          expect(prime(num(q)), q.id).toBe(true)
          expect(Number(m[2]) + num(q)).toBe(Number(m[1]))
          break
        }
        case 'm5.fac.stop.q':
          expect(num(q)).toBe(7)
          break
        default: {
          const j = PRIME_JUDGE.find(([k]) => k === t.k)
          if (!j) throw new Error(`没核对过的题：${q.id}（${t.k}）`)
          expect(answer(q), q.id).toBe(yesNo(j[1]))
        }
      }
    })
    // 1～20 各数的因数表、定义、例 1 用表找质数都在第 1 档
    for (const k of ['countF', 'pc', 'sieve1', 'sieveLeft', 'defP', 'one']) expect([...kinds].some((x) => x.startsWith(k)), k).toBe(true)
  })
})

describe('和的奇偶性（m5s2-02-parity）', () => {
  it('奇数、偶数的和与积，具体算式，小方块，分队：从参数反推', () => {
    const kinds = new Set<string>()
    const parityOf = (l: Param): number => (zh(l as LStr) === '奇数' ? 1 : 0)
    each('m5s2-02-parity', (q, d) => {
      const kind = kindOf(q)
      if (d === 1) kinds.add(kind)
      const t = last(q)
      const odd = (v: number): string => (v % 2 ? '奇数' : '偶数')
      switch (t.k) {
        case 'm5.fac.par.rule':
          expect(answer(q), q.id).toBe(odd(parityOf(t.p.x!) + parityOf(t.p.y!)))
          break
        case 'm5.fac.par.prodRule':
          expect(answer(q), q.id).toBe(odd(parityOf(t.p.x!) * parityOf(t.p.y!)))
          break
        case 'm5.fac.par.nums':
          expect(answer(q), q.id).toBe(odd(n(t.p.a) + n(t.p.b)))
          break
        case 'm5.fac.par.three':
          expect(answer(q), q.id).toBe(odd(n(t.p.a) + n(t.p.b) + n(t.p.c)))
          break
        case 'm5.fac.par.prodNums':
          expect(answer(q), q.id).toBe(odd(n(t.p.a) * n(t.p.b)))
          break
        case 'm5.fac.par.tiles1':
        case 'm5.fac.par.tiles2': {
          const g = part(q, 'pair-tiles')!.groups
          expect(g.length, q.id).toBe(t.k.endsWith('1') ? 1 : 2)
          expect(answer(q), q.id).toBe(odd(g.reduce((a, b) => a + b, 0)))
          break
        }
        case 'm5.fac.par.teams':
          expect(answer(q), q.id).toBe(odd(n(t.p.n) - parityOf(t.p.x!)))
          break
        default:
          throw new Error(`没核对过的题：${q.id}（${t.k}）`)
      }
      expect(q.choices!.map((c) => zh(c.label)).sort()).toEqual(['偶数', '奇数'])
    })
    // 例 2：三种和的奇偶、具体的算式、小方块摆一摆都在第 1 档
    for (const k of ['ruleSum', 'numSum', 'tiles1', 'tiles2']) expect(kinds, k).toContain(k)
  })
})

describe('朗读与写法', () => {
  it('词条里不出读错的字（数数、划、地、得、长、差、应急）、不写括号和「～」；「为」只在「因为」里', () => {
    for (const [k, v] of Object.entries(ZH)) {
      const s = String(v)
      expect(s, k).not.toMatch(/数数|数出|划|地|得|长|差|应急|[（）()～~]/)
      expect(s.replace(/因为/g, ''), k).not.toMatch(/为/)
      expect(s, `${k}：数字 + 只读不对`).not.toMatch(/\d\s*只/)
    }
  })

  it('题干里没有「第 + 阿拉伯数字」的序数；朗读的片段里没有残留的 {占位符}', () => {
    for (const kp of ['m5s2-02-meaning', 'm5s2-02-find', 'm5s2-02-two-five', 'm5s2-02-three', 'm5s2-02-prime', 'm5s2-02-parity']) {
      each(kp, (q) => {
        for (const t of q.stem) if (t.kind === 'text') expect(zh(t.text), q.id).not.toMatch(/第\s*\d/)
        expect(questionSpeech(q, 'zh').join(''), q.id).not.toMatch(/[{}]/)
      })
    }
  })
})
