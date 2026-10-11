import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { answerSpeech, questionSpeech } from '@/engine/speech'
import { ZH } from '../../lang/decmul'
import { DZ1, DZ1_TOTAL, K_APX, K_DEC, K_EST, K_INT, K_LAWS, K_TIER, K_TIMES, KITES, PEANUTS, WEIGHS } from '../decmul'

// 五上「小数乘法」（五年级数学 B）的专项检查：用测试自己的分数算法（不用生成器里的函数）从算式、题干参数、竖式、表、线段图反推答案，
// 150 种子 × 三档；外加 G14 的选项规矩、竖式照课本（末尾对齐、整数乘数末尾的 0 写在外面、写好的积就是整数乘法的积）、
// 第 1 档出得到课本每个例题与做一做、每个知识点不同的小数不超过 120 个（朗读音频）、题目文字不踩朗读的坑。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KPS = [K_INT, K_DEC, K_APX, K_TIMES, K_LAWS, K_EST, K_TIER]
type Param = LStr | number
type P = Record<string, Param>

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void, seeds = SEEDS): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const texts = (q: Question): { k: string; p: P }[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as P }))
const lastText = (q: Question): { k: string; p: P } => texts(q)[texts(q).length - 1]!
const exprs = (q: Question): string[] => q.stem.filter((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr').map((p) => p.expr)
function partOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined {
  return q.stem.find((p) => p.kind === kind) as Extract<StemPart, { kind: K }> | undefined
}
const correctLabel = (q: Question): LStr => (q.answer.kind === 'number' ? String(q.answer.value) : q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
const answerText = (q: Question): string => zh(correctLabel(q))
const keyOf = (l: LStr): string => (typeof l === 'string' ? l : l.k)
const s = (v: Param | undefined): string => String(v)

// ── 测试自己的分数算法：BigInt 的分子 / 分母 ──
interface Q {
  n: bigint
  d: bigint
}
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b))
function q(n: bigint, d: bigint = 1n): Q {
  const g = gcd(n, d) || 1n
  const sgn = d < 0n ? -1n : 1n
  return { n: (sgn * n) / g, d: (sgn * d) / g }
}
const num = (str: string): Q => {
  const [i = '0', f = ''] = str.split('.')
  return q(BigInt(i + f), 10n ** BigInt(f.length))
}
const add = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d)
const sub = (a: Q, b: Q): Q => q(a.n * b.d - b.n * a.d, a.d * b.d)
const mul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d)
const eq = (a: Q, b: Q): boolean => a.n === b.n && a.d === b.d
const cmp = (a: Q, b: Q): number => {
  const x = a.n * b.d - b.n * a.d
  return x > 0n ? 1 : x < 0n ? -1 : 0
}
/** 算式的值：数、+ − ×、小括号（按运算顺序） */
function evaluate(src: string): Q {
  const toks = src.match(/\d+(?:\.\d+)?|[-+×()]/g) ?? []
  let i = 0
  const atom = (): Q => {
    const t = toks[i++]!
    if (t === '(') {
      const v = sum()
      i++
      return v
    }
    return num(t)
  }
  const prod = (): Q => {
    let v = atom()
    while (toks[i] === '×') {
      i++
      v = mul(v, atom())
    }
    return v
  }
  const sum = (): Q => {
    let v = prod()
    while (toks[i] === '+' || toks[i] === '-') {
      const op = toks[i++]
      const r = prod()
      v = op === '+' ? add(v, r) : sub(v, r)
    }
    return v
  }
  return sum()
}
/** 答案的值（选项写的数 / 数字键盘的数） */
const valueOf = (q0: Question): Q => num(answerText(q0))
/** 去掉小数点的整数：'0.56' → 56 */
const digitsInt = (x: string): bigint => BigInt(x.replace('.', ''))
const placesOf = (x: string): number => (x.split('.')[1] ?? '').length
/** 按四舍五入保留 k 位（写成 k 位小数，末尾 0 照写） */
function roundTo(x: Q, k: number): string {
  const scaled = x.n * 10n ** BigInt(k)
  let r = scaled / x.d
  if ((scaled % x.d) * 2n >= x.d) r += 1n
  const str = r.toString().padStart(k + 1, '0')
  return k === 0 ? str : `${str.slice(0, -k)}.${str.slice(-k)}`
}
const ceilQ = (x: Q): bigint => (x.n % x.d === 0n ? x.n / x.d : x.n / x.d + 1n)

describe('小数乘法：G14 的选项规矩', () => {
  for (const kp of KPS) {
    it(`${kp}：小数的答案只用选项卡；只考数值的题选项没有等值的两种写法；小数答案的选项里至少还有一个和它一样多位小数`, () => {
      each(kp, (q0) => {
        if (q0.answer.kind === 'number') {
          expect(Number.isInteger(q0.answer.value), q0.id).toBe(true)
          return
        }
        const labels = q0.choices!.map((c) => zh(c.label))
        if (!labels.every((x) => /^\d+(\.\d+)?$/.test(x))) return // 文字 / 算式 / 符号选项
        const ans = answerText(q0)
        // 近似数考写法（0.40 和 0.4 算两种），往大估 / 往小估选整数（只有一个比它大 / 小）
        if (kp === K_APX || kindOf(q0) === 'est') return
        const vals = labels.map((x) => num(x))
        for (let a = 0; a < vals.length; a++) for (let b = a + 1; b < vals.length; b++) expect(eq(vals[a]!, vals[b]!), `${q0.id} 选项里有等值的两种写法：${labels.join(' / ')}`).toBe(false)
        // 整数答案（数字键盘那条路的整数选项）：选项都是整数，不混进小数冒充小数题
        if (!ans.includes('.')) {
          expect(labels.every((x) => !x.includes('.')), `${q0.id} 整数答案的选项里有小数：${labels.join(' / ')}`).toBe(true)
          return
        }
        const same = labels.filter((x) => x !== ans && placesOf(x) === placesOf(ans))
        expect(same.length, `${q0.id} 正确答案的写法和别的选项都不一样：${labels.join(' / ')}`).toBeGreaterThanOrEqual(1)
      })
    })
  }
})

describe('小数乘法竖式（dec-mul）照课本', () => {
  it('两个乘数就是横式里的数（整数写在下面）；整数乘数末尾有 0 才写在外面；写好的积是整数乘法的积（可以补了 0、点了小数点）', () => {
    for (const kp of KPS) {
      each(kp, (q0) => {
        const v = partOf(q0, 'dec-mul')
        if (!v) return
        if (v.a.includes('□')) return // 练习四 8：1.□2 × 5.3
        const e = exprs(q0)[0]
        const params = lastText(q0).p
        const factors = e ? (e.match(/\d+(?:\.\d+)?/g) ?? []).slice(0, 2) : [s(params.a), s(params.b)]
        expect([v.a, v.b].sort(), q0.id).toEqual([...factors].sort())
        if (!v.a.includes('.') !== !v.b.includes('.')) expect(v.b.includes('.'), `${q0.id} 整数写在下面`).toBe(false)
        const intWithZero = [v.a, v.b].some((x) => !x.includes('.') && x.length > 1 && x.endsWith('0'))
        expect(!!v.zeros, q0.id).toBe(intWithZero)
        if (v.product !== undefined) {
          const ints = digitsInt(v.a) * digitsInt(v.b)
          expect(BigInt(v.product.replace('.', '')), q0.id).toBe(ints)
        }
      })
    }
  })
})

describe('小数乘整数（m5s1-02-dec-int）：反推答案', () => {
  it('每种题的得数都对', () => {
    each(K_INT, (q0) => {
      const kind = kindOf(q0)
      const { k, p } = lastText(q0)
      const e = exprs(q0)
      switch (kind) {
        case 'kite': {
          const id = keyOf(p.k as LStr).split('.').pop()!
          const price = KITES.find((x) => x.id === id)!.price
          expect(s(p.p)).toBe(price)
          expect(eq(valueOf(q0), mul(num(price), num(s(p.n)))), q0.id).toBe(true)
          expect(partOf(q0, 'objects')?.count).toBe(p.n)
          break
        }
        case 'enough': {
          const ok = cmp(num(s(p.b)), mul(num(s(p.p)), num(s(p.n)))) >= 0
          expect(keyOf(correctLabel(q0)), q0.id).toBe(ok ? 'm5.dmul.enough' : 'm5.dmul.short')
          // 钱数和总价不相等（够 / 不够说得清）
          expect(eq(num(s(p.b)), mul(num(s(p.p)), num(s(p.n)))), q0.id).toBe(false)
          break
        }
        case 'jiao':
          if (k.endsWith('y2j')) expect(eq(valueOf(q0), mul(num(s(p.p)), num('10'))), q0.id).toBe(true)
          else if (k.endsWith('mul')) expect(eq(valueOf(q0), mul(num(s(p.j)), num(s(p.n)))), q0.id).toBe(true)
          else expect(eq(mul(valueOf(q0), num('10')), num(s(p.j))), q0.id).toBe(true)
          break
        case 'rule':
        case 't32': {
          // 第一个算式（rule）照写对；问的是最后一个算式
          if (kind === 'rule') {
            const [l, r] = e[0]!.split(' = ')
            expect(eq(evaluate(l!), num(r!)), q0.id).toBe(true)
          }
          expect(eq(valueOf(q0), evaluate(e[e.length - 1]!.replace(' = ?', ''))), q0.id).toBe(true)
          break
        }
        case 'units': {
          const u = num(s(p.u))
          const target = k.endsWith('prod') ? mul(num(s(p.a)), num(s(p.b))) : num(s(p.a))
          expect(eq(mul(valueOf(q0), u), target), q0.id).toBe(true)
          // 一位小数按 0.1 数，两位小数按 0.01 数
          expect(s(p.u)).toBe(placesOf(s(p.a)) === 1 ? '0.1' : '0.01')
          break
        }
        case 'places':
          expect(answerText(q0), q0.id).toBe(String(placesOf(s(p.a)) + placesOf(s(p.b))))
          expect(q0.input).toBe('numpad')
          break
        case 'do':
        case 'calc':
        case 'ipair':
          expect(eq(valueOf(q0), evaluate(e[0]!.replace(' = ?', ''))), q0.id).toBe(true)
          break
        case 'point': {
          const v = partOf(q0, 'dec-mul')!
          expect(v.product).toBeDefined()
          expect(eq(valueOf(q0), mul(num(s(p.a)), num(s(p.b)))), q0.id).toBe(true)
          break
        }
        case 'moon':
          expect(eq(valueOf(q0), mul(num('1.28'), num('30'))), q0.id).toBe(true)
          break
        case 'walk': {
          const day = mul(num(s(p.d)), num('4'))
          expect(eq(valueOf(q0), k.endsWith('week') ? mul(day, num('5')) : day), q0.id).toBe(true)
          break
        }
        case 'thunder':
          expect(eq(valueOf(q0), mul(num('0.34'), num(s(p.s)))), q0.id).toBe(true)
          break
        case 'paper':
          expect(eq(valueOf(q0), mul(num(s(p.t)), num('16'))), q0.id).toBe(true)
          break
        case 'teacher':
          if (k.endsWith('dist')) expect(eq(valueOf(q0), mul(num('15'), num('0.25'))), q0.id).toBe(true)
          // 步行 0.8 小时走 5 × 0.8 = 4 千米，比 3.75 千米多：能
          else expect(keyOf(correctLabel(q0))).toBe(cmp(mul(num('5'), num('0.8')), num('3.75')) >= 0 ? 'm5.dmul.can' : 'm5.dmul.cannot')
          break
        default:
          throw new Error(`没检查到的题：${q0.id}`)
      }
    })
  })
})

describe('小数乘小数（m5s1-02-dec-dec）：反推答案', () => {
  it('每种题的得数都对', () => {
    each(K_DEC, (q0) => {
      const kind = kindOf(q0)
      const { k, p } = lastText(q0)
      const e = exprs(q0)
      switch (kind) {
        case 'field': {
          expect(eq(valueOf(q0), mul(num(s(p.l)), num(s(p.w)))), q0.id).toBe(true)
          // 图上长标在下边、宽标在右边，和题目说的一样
          const geo = partOf(q0, 'geo')!
          const poly = geo.figs[0]!.items[0] as { labels: (string | null)[] }
          expect(poly.labels).toEqual([null, `${s(p.w)} m`, `${s(p.l)} m`, null])
          break
        }
        case 'up': {
          const [a, b] = e[0]!.split(' × ')
          const x = s(p.x)
          expect([a, b]).toContain(x)
          expect(eq(mul(num(x), valueOf(q0)), num(s(p.y))), q0.id).toBe(true)
          expect(q0.input).toBe('numpad')
          break
        }
        case 'down': {
          expect(eq(mul(num(s(p.x)), num(s(p.y))), num(s(p.z))), q0.id).toBe(true)
          expect(eq(mul(mul(num(s(p.a)), num(s(p.b))), valueOf(q0)), num(s(p.z))), q0.id).toBe(true)
          break
        }
        case 'places':
          expect(answerText(q0), q0.id).toBe(String(placesOf(s(p.a)) + placesOf(s(p.b))))
          break
        case 'do':
        case 'calc':
          expect(eq(valueOf(q0), evaluate(e[0]!.replace(' = ?', ''))), q0.id).toBe(true)
          break
        case 'point':
          expect(eq(valueOf(q0), mul(num(s(p.a)), num(s(p.b)))), q0.id).toBe(true)
          break
        case 'pad':
          expect(keyOf(correctLabel(q0))).toBe('m5.dmul.pad.front')
          break
        case 'judge': {
          const [l, r] = e[0]!.split(' = ')
          const ok = eq(evaluate(l!), num(r!))
          expect(keyOf(correctLabel(q0)), q0.id).toBe(ok ? 'm5.dmul.yes' : 'm5.dmul.no')
          // 错的都只错在小数点：去掉小数点、开头和末尾的 0 以后，数字和整数乘法的积一样
          const sig = (x: string): string => x.replace('.', '').replace(/^0+/, '').replace(/0+$/, '')
          const ints = l!.split(' × ').reduce((m0, x) => m0 * digitsInt(x), 1n)
          expect(sig(r!), q0.id).toBe(sig(ints.toString()))
          break
        }
        case 'car':
          expect(eq(valueOf(q0), mul(num(s(p.v)), num(s(p.t)))), q0.id).toBe(true)
          break
        case 'area': {
          const geo = partOf(q0, 'geo')!
          const poly = geo.figs[0]!.items[0] as { labels: (string | null)[] }
          const w = poly.labels[1]!.replace(' dm', '')
          const l = poly.labels[2]!.replace(' dm', '')
          expect(eq(valueOf(q0), mul(num(l), num(w))), q0.id).toBe(true)
          expect(k.endsWith('square'), q0.id).toBe(l === w)
          break
        }
        case 'fact': {
          const t = num(s(p.t))
          expect(eq(evaluate(answerText(q0)), t), q0.id).toBe(true)
          for (const c of q0.choices!) if (c.label !== correctLabel(q0)) expect(eq(evaluate(zh(c.label)), t), q0.id).toBe(false)
          // 都是 65 和 39 移了小数点
          for (const c of q0.choices!) expect(zh(c.label).replace(/\./g, '').replace(/\b0+(?=\d)/g, '')).toMatch(/^65 × 39$/)
          break
        }
        case 'weigh': {
          const id = keyOf(p.g as LStr).split('.').pop()!
          const w = WEIGHS.find((x) => x.id === id)!
          const dial = partOf(q0, 'scale')!
          expect(eq(num(String(dial.value)), num(w.kg)), q0.id).toBe(true)
          expect(eq(valueOf(q0), mul(num(s(p.p)), num(w.kg))), q0.id).toBe(true)
          break
        }
        case 'rope':
          expect(eq(valueOf(q0), mul(num(s(p.s)), num(String(2 ** Number(p.k))))), q0.id).toBe(true)
          break
        case 'digit': {
          // 1.□2 × 5.3：□ 是 0–9，正确项能算出来，别的都不能
          const can = (x: string): boolean => [...Array(10).keys()].some((dgt) => eq(mul(num(`1.${dgt}2`), num('5.3')), num(x)))
          expect(can(answerText(q0))).toBe(true)
          for (const c of q0.choices!) if (c.label !== correctLabel(q0)) expect(can(zh(c.label))).toBe(false)
          break
        }
        case 'pattern':
          expect(eq(valueOf(q0), mul(num('3.3333'), num('6666.7'))), q0.id).toBe(true)
          for (const line of e.slice(0, 3)) {
            const [l, r] = line.split(' = ')
            expect(eq(evaluate(l!), num(r!)), line).toBe(true)
          }
          break
        default:
          throw new Error(`没检查到的题：${q0.id}`)
      }
    })
  })
})

describe('积的近似数（m5s1-02-approx）：按四舍五入保留', () => {
  const KEEP: Record<string, number> = { 'm5.dmul.keep.int': 0, 'm5.dmul.keep.one': 1, 'm5.dmul.keep.two': 2 }
  it('得数照四舍五入、保留的位数写（0.40 末尾的 0 照写）；判断题照这个判', () => {
    each(K_APX, (q0) => {
      const kind = kindOf(q0)
      const { p } = lastText(q0)
      const e = exprs(q0)
      switch (kind) {
        case 'round': {
          const k = KEEP[keyOf(p.k as LStr)]!
          expect(answerText(q0), q0.id).toBe(roundTo(evaluate(e[0]!.replace(' ≈ ?', '')), k))
          break
        }
        case 'only': {
          const k = KEEP[keyOf(p.k as LStr)]!
          expect(answerText(q0), q0.id).toBe(roundTo(num(s(p.x)), k))
          break
        }
        case 'jkeep': {
          const k = KEEP[keyOf(p.k as LStr)]!
          const [l, r] = e[0]!.split(' ≈ ')
          const ok = r === roundTo(evaluate(l!), k)
          expect(keyOf(correctLabel(q0)), q0.id).toBe(ok ? 'm5.dmul.yes' : 'm5.dmul.no')
          break
        }
        case 'dog':
          expect(answerText(q0)).toBe(roundTo(mul(num('0.049'), num('45')), 1))
          break
        case 'building':
          expect(answerText(q0), q0.id).toBe(roundTo(mul(num('3.04'), num(s(p.n))), 0))
          break
        case 'rail':
          expect(answerText(q0)).toBe(roundTo(mul(num('0.66'), num('7.21')), 2))
          break
        default:
          throw new Error(`没检查到的题：${q0.id}`)
      }
      // 选项（数）里没有重复的写法，正确答案只有一个
      if (q0.choices) expect(new Set(q0.choices.map((c) => zh(c.label))).size).toBe(q0.choices.length)
    })
  })
  it('第 1 档考到保留两位小数要写 0.40（课本 2.34 × 0.17）：选项里有 0.4 当干扰项', () => {
    let seen = false
    each(K_APX, (q0, d) => {
      if (d === 1 && answerText(q0) === '0.40' && q0.choices) {
        seen = true
        expect(q0.choices.map((c) => zh(c.label))).toContain('0.4')
      }
    })
    expect(seen).toBe(true)
  })
})

describe('小数倍（m5s1-02-times）：反推答案', () => {
  it('每种题的得数都对；线段图照题目画', () => {
    each(K_TIMES, (q0) => {
      const kind = kindOf(q0)
      const { k, p } = lastText(q0)
      const e = exprs(q0)
      switch (kind) {
        case 'peanut': {
          expect(eq(valueOf(q0), mul(num(s(p.b)), num(s(p.r)))), q0.id).toBe(true)
          expect(PEANUTS.some((x) => x.base === s(p.b) && x.r === s(p.r))).toBe(true)
          const rl = partOf(q0, 'ratio-lines')!
          expect(rl.per).toBe(10)
          expect(rl.rows[0]!.len).toBe(10)
          expect(rl.rows[0]!.bottom).toBe(`${s(p.b)} kg`)
          expect(eq(num(String(rl.rows[1]!.len)), mul(num(s(p.r)), num('10')))).toBe(true)
          expect(rl.rows[1]!.bottom).toBe('? kg')
          // 比 1 小的倍数是二班，比 1 大的是三班（课本）
          expect(keyOf(rl.rows[1]!.name)).toBe(cmp(num(s(p.r)), num('1')) < 0 ? 'm5.dmul.cls.2' : 'm5.dmul.cls.3')
          break
        }
        case 'cmp':
        case 'cmp2': {
          const [l, r] = e[0]!.split(' ○ ')
          const c = cmp(evaluate(l!), evaluate(r!))
          expect(answerText(q0), q0.id).toBe(c > 0 ? '>' : c < 0 ? '<' : '=')
          expect(q0.type).toBe('compare')
          break
        }
        case 'ribbon':
          expect(eq(valueOf(q0), mul(num(s(p.p)), num(s(p.l)))), q0.id).toBe(true)
          break
        case 'law': {
          const lt = keyOf(p.m as LStr) === 'm5.dmul.lt1'
          const big = keyOf(p.r as LStr) === 'm5.dmul.bigger'
          expect(keyOf(correctLabel(q0)), q0.id).toBe(lt !== big ? 'm5.dmul.yes' : 'm5.dmul.no')
          break
        }
        case 'rule': {
          const c = cmp(mul(num(s(p.x)), num(s(p.m))), num(s(p.x)))
          const big = keyOf(p.r as LStr) === 'm5.dmul.bigger'
          expect(keyOf(correctLabel(q0)), q0.id).toBe((big ? c > 0 : c < 0) ? 'm5.dmul.yes' : 'm5.dmul.no')
          break
        }
        case 'which': {
          const x = num(s(p.x))
          const small = k.endsWith('small')
          const good = (lab: string): boolean => {
            const c = cmp(evaluate(lab), x)
            return small ? c < 0 : c > 0
          }
          expect(good(answerText(q0)), q0.id).toBe(true)
          for (const c of q0.choices!) if (c.label !== correctLabel(q0)) expect(good(zh(c.label)), q0.id).toBe(false)
          break
        }
        case 'bridge':
          expect(eq(valueOf(q0), add(mul(num('32.5'), num('1.6')), num('3')))).toBe(true)
          break
        case 'tree':
          expect(eq(valueOf(q0), k.endsWith('.h') ? mul(num('1.46'), num('3.5')) : sub(mul(num('1.46'), num('3.5')), num('1.46'))), q0.id).toBe(true)
          break
        case 'ship':
          expect(eq(valueOf(q0), mul(num('26'), num('1.85')))).toBe(true)
          break
        case 'temp':
          // (850 − 50) ÷ 100 = 8，16 − 0.6 × 8
          expect(eq(valueOf(q0), sub(num('16'), mul(num('0.6'), num('8'))))).toBe(true)
          break
        default:
          throw new Error(`没检查到的题：${q0.id}`)
      }
    })
  })
})

describe('整数乘法运算律推广到小数（m5s1-02-laws）：反推答案', () => {
  it('比一比、用了哪个运算律、填数、简便计算、改错的答案都对', () => {
    each(K_LAWS, (q0) => {
      const kind = kindOf(q0)
      const e = exprs(q0)
      switch (kind) {
        case 'same': {
          const [l, r] = e[0]!.split(' ○ ')
          const c = cmp(evaluate(l!), evaluate(r!))
          expect(answerText(q0), q0.id).toBe(c > 0 ? '>' : c < 0 ? '<' : '=')
          break
        }
        case 'law': {
          const [l, r] = e[0]!.split(' = ')
          expect(eq(evaluate(l!), evaluate(r!)), q0.id).toBe(true)
          const law = keyOf(correctLabel(q0)).split('.').pop()
          // 分配律两边一边有加号、一边没有；交换律两边的数一样、只换了位置；结合律只多了括号
          const plus = (x: string): boolean => x.includes('+')
          if (law === 'dist') expect(plus(l!) && plus(r!) && (l!.includes('(') !== r!.includes('('))).toBe(true)
          else if (law === 'swap') expect([l!.includes('('), r!.includes('('), l === r]).toEqual([false, false, false])
          else expect(l!.replace(/[()]/g, '').trim()).toBe(r!.replace(/[()]/g, '').trim())
          break
        }
        case 'fill': {
          const [l, r] = e[0]!.split(' = ')
          expect(eq(evaluate(l!), evaluate(r!.replace('?', answerText(q0)))), q0.id).toBe(true)
          for (const c of q0.choices ?? []) if (c.label !== correctLabel(q0)) expect(eq(evaluate(l!), evaluate(r!.replace('?', zh(c.label)))), q0.id).toBe(false)
          break
        }
        case 'simple':
          expect(eq(valueOf(q0), evaluate(e[0]!.replace(' = ?', ''))), q0.id).toBe(true)
          break
        case 'order': {
          const steps = e[0]!.split(' = ')
          const ok = steps.every((x) => eq(evaluate(x), evaluate(steps[0]!)))
          expect(keyOf(correctLabel(q0)), q0.id).toBe(ok ? 'm5.dmul.yes' : 'm5.dmul.no')
          break
        }
        case 'fixv': {
          const steps = e[0]!.split(' = ')
          expect(eq(valueOf(q0), evaluate(steps[0]!)), q0.id).toBe(true)
          // 课本这道是错的
          expect(eq(evaluate(steps[steps.length - 1]!), evaluate(steps[0]!)), q0.id).toBe(false)
          break
        }
        case 'meet':
          expect(eq(valueOf(q0), mul(add(num('0.2'), num('0.25')), num('10')))).toBe(true)
          break
        case 'fridge': {
          const { p } = lastText(q0)
          expect(eq(valueOf(q0), mul(mul(num(s(p.e)), num('30')), num('0.5'))), q0.id).toBe(true)
          expect(keyOf(p.t as LStr)).toBe(s(p.e) === '0.69' ? 'm5.dmul.fridge.l3' : 'm5.dmul.fridge.l1')
          break
        }
        default:
          throw new Error(`没检查到的题：${q0.id}`)
      }
    })
  })
})

describe('用估算解决问题（m5s1-02-estimate）', () => {
  const tableNums = (q0: Question): string[][] =>
    partOf(q0, 'stat-table')!.rows.slice(1).map((r) => r.map((c) => (c === null ? '' : typeof c === 'number' ? String(c) : zh(c))))
  it('够不够、能不能、估出来的数都对；往大估往小估只有一个选项说得通', () => {
    each(K_EST, (q0) => {
      const kind = kindOf(q0)
      const { k, p } = lastText(q0)
      const yes = (ok: boolean): string => (k.includes('sale') ? (ok ? 'm5.dmul.can' : 'm5.dmul.cannot') : ok ? 'm5.dmul.enough' : 'm5.dmul.short')
      switch (kind) {
        case 'ex7': {
          if (q0.id.endsWith('-up')) {
            expect(answerText(q0), q0.id).toBe(String(31 * 2 + 27 * 1))
            break
          }
          if (q0.id.endsWith('-low')) {
            expect(eq(valueOf(q0), add(mul(num('30'), num('2')), mul(num('25'), num('0.8')))), q0.id).toBe(true)
            break
          }
          // 表里的价钱和数量就是例 7 的
          const rows = tableNums(q0)
          expect(rows.map((r) => r[1])).toEqual(['30.98', '26.48'])
          const total = add(mul(num('30.98'), num('2')), mul(num('26.48'), num('0.8')))
          const left = sub(num('100'), total)
          expect(keyOf(correctLabel(q0)), q0.id).toBe(yes(cmp(left, num(s(p.e))) >= 0))
          // 估算判断得了：往大估总价不超过 89 元，剩下的不少于 11 元（够买 10 元的）；往小估总价比 80 元多，剩下的不到 20 元（不够买 20 元的）
          const e0 = num(s(p.e))
          expect(cmp(sub(num('100'), num('89')), e0) >= 0 || cmp(sub(num('100'), num('80')), e0) <= 0, q0.id).toBe(true)
          break
        }
        case 'est': {
          const x = num(s(p.x))
          const up = k.endsWith('up')
          const ok = (lab: string): boolean => (up ? cmp(num(lab), x) >= 0 : cmp(num(lab), x) <= 0) && Math.abs(Number(lab) - Number(s(p.x))) < 1
          expect(ok(answerText(q0)), q0.id).toBe(true)
          for (const c of q0.choices!) if (c.label !== correctLabel(q0)) expect(up ? cmp(num(zh(c.label)), x) < 0 : cmp(num(zh(c.label)), x) > 0, q0.id).toBe(true)
          break
        }
        case 'dz1': {
          const total = DZ1.reduce((a, g) => add(a, mul(num(g.price), num(String(g.n)))), num('0'))
          expect(eq(total, num(DZ1_TOTAL))).toBe(true)
          expect(keyOf(correctLabel(q0)), q0.id).toBe(yes(cmp(num(s(p.b)), total) >= 0))
          break
        }
        case 'sale': {
          const rows = tableNums(q0)
          const total = rows.reduce((a, r) => add(a, mul(num(r[1]!.split(' ')[0]!), num(r[2]!.split(' ')[0]!))), num('0'))
          expect(keyOf(correctLabel(q0)), q0.id).toBe(yes(cmp(total, num('100')) >= 0))
          break
        }
        case 'tiles': {
          const room = mul(num('8.1'), num('5.2'))
          const tiles = mul(mul(num('0.6'), num('0.6')), num('100'))
          expect(keyOf(correctLabel(q0))).toBe(yes(cmp(tiles, room) >= 0))
          break
        }
        default:
          throw new Error(`没检查到的题：${q0.id}`)
      }
    })
  })
})

describe('分段计费（m5s1-02-tiered）', () => {
  /** 课本的计价：前一段 base 元（limit 以内），超过的部分每个单位 rate 元，不足 1 按 1（水费按吨，不往大取整） */
  const fare = (x: string, limit: number, base: Q, rate: Q, ceil = true): Q => {
    const v = num(x)
    const units = ceil ? q(ceilQ(v)) : v
    return cmp(units, q(BigInt(limit))) <= 0 ? base : add(base, mul(rate, sub(units, q(BigInt(limit)))))
  }
  it('出租车、价格表、线段图、水费、停车费的钱数都对', () => {
    each(K_TIER, (q0) => {
      const kind = kindOf(q0)
      const { k, p } = lastText(q0)
      switch (kind) {
        case 'taxi':
          expect(eq(valueOf(q0), fare(s(p.d), 3, num('8'), num('1.5'))), q0.id).toBe(true)
          break
        case 'taxikm': {
          const all = ceilQ(num(s(p.d)))
          expect(q0.answer.kind === 'number' ? q0.answer.value : Number(answerText(q0)), q0.id).toBe(Number(k.endsWith('all') ? all : all - 3n))
          break
        }
        case 'taxiline': {
          const line = partOf(q0, 'fare-line')!
          const total = line.parts.reduce((a, x) => a + x.len, 0)
          expect(total).toBe(Number(p.k))
          expect(line.parts.slice(0, 2).map((x) => x.label)).toEqual(['8 元', '1.5 元'])
          expect(line.names?.[line.names.length - 1]).toBe(`${s(p.k)} km`)
          expect(eq(valueOf(q0), fare(s(p.k), 3, num('8'), num('1.5'))), q0.id).toBe(true)
          break
        }
        case 'taxitable': {
          const rows = partOf(q0, 'stat-table')!.rows
          // 表里每一格照计价标准
          rows[0]!.slice(1).forEach((km, i) => expect(eq(num(String(rows[1]![i + 1])), fare(String(km), 3, num('8'), num('1.5'))), String(km)).toBe(true))
          expect(eq(valueOf(q0), fare(s(p.d), 3, num('8'), num('1.5'))), q0.id).toBe(true)
          break
        }
        case 'water':
          expect(eq(valueOf(q0), waterFee(s(p.t))), q0.id).toBe(true)
          break
        case 'park':
          expect(eq(valueOf(q0), fare(s(p.h), 1, num('5'), num('2.5'))), q0.id).toBe(true)
          break
        default:
          throw new Error(`没检查到的题：${q0.id}`)
      }
    })
  })
  /** 水费：12 吨及以内每吨 2.5 元，超过的部分每吨 3.8 元 */
  function waterFee(t: string): Q {
    const v = num(t)
    return cmp(v, num('12')) <= 0 ? mul(v, num('2.5')) : add(num('30'), mul(sub(v, num('12')), num('3.8')))
  }
})

describe('第 1 档出得到课本每个例题与做一做（G12）', () => {
  const tier1 = (kp: string): Set<string> => {
    const out = new Set<string>()
    each(kp, (q0, d) => {
      if (d === 1) out.add(q0.id.split(':')[1]!)
    }, 300)
    return out
  }
  const has = (set: Set<string>, prefix: string): boolean => [...set].some((x) => x.startsWith(prefix))
  it('小数乘整数：例 1（9.5 × 3 买风筝、小亮化成角、积的变化规律）、例 2（0.72 × 60）、做一做 1（14.2 × 6、40 元买 7 个够吗）、做一做 2（四个竖式）', () => {
    const t = tier1(K_INT)
    for (const x of ['kite-butterfly-3', 'kite-swallow-6', 'enough-fish-7-40', 'jiao-y2j-9.5', 'jiao-mul-95-3', 'jiao-j2y-285', 'rule-9.5x3', 'rule-0.72x60', 'units-0.72x60', 'do-0.72x60', 'point-0.72x60', 'ipair-7x4', 'ipair-124x15', 'do-0.7x4', 'do-1.24x15']) expect(has(t, x), x).toBe(true)
  })
  it('小数乘小数：例 3（试验田、转化成整数乘法）、试一试（1.92 × 0.9、2.79 × 0.32）、做一做、例 4（0.56 × 0.04 补 0）、例 4 的做一做 1', () => {
    const t = tier1(K_DEC)
    for (const x of ['field-4.2x0.8', 'down-4.2x0.8', 'down-1.92x0.9', 'up-', 'places-', 'do-1.92x0.9', 'do-2.79x0.32', 'do-6.7x0.3', 'do-2.4x6.2', 'do-5.4x1.07', 'do-0.45x0.6', 'do-0.56x0.04', 'point-0.56x0.04', 'pad', 'do-3.7x4.6', 'do-0.48x1.5', 'do-0.29x0.07', 'do-0.056x0.15']) expect(has(t, x), x).toBe(true)
  })
  it('积的近似数：例 4 的做一做 2（嗅觉细胞）', () => {
    const t = tier1(K_APX)
    for (const x of ['dog', 'round-1.2x1.4', 'round-2.34x0.17', 'round-3.04x21', 'building-21']) expect(has(t, x), x).toBe(true)
  })
  it('小数倍：例 5（0.8 倍、1.2 倍）、规律、做一做 1（彩带四种长度）、做一做 2（四道比一比）', () => {
    const t = tier1(K_TIMES)
    for (const x of ['peanut-3.9x0.8', 'peanut-3.9x1.2', 'law-', 'ribbon-0.8', 'ribbon-0.5', 'ribbon-1.4', 'ribbon-2.6', 'cmp-756x0.9', 'cmp-0.94x1', 'cmp-4.25x1.1', 'cmp-31.4x1.2']) expect(has(t, x), x).toBe(true)
  })
  it('运算律：开头三组算式、例 6 两道、做一做 1 三道、做一做 2 四道', () => {
    const t = tier1(K_LAWS)
    for (const x of ['same-0.7 × 1.2', 'same-(0.8 × 0.5) × 0.4-0.8 × (0.5 × 0.4)', 'same-0.5 × (2.4 + 3.6)-0.5 × 2.4 + 0.5 × 3.6', 'law-', 'fill-4.2 × 1.69', 'fill-0.77 × 2.5 × 0.4', 'fill-7.2 × 8.4', 'simple-0.25 × 4.78 × 4', 'simple-0.65 × 202', 'simple-0.034', 'simple-101 × 0.45', 'simple-4.75 × 99', 'simple-2.73 × 99']) expect(has(t, x), x).toBe(true)
  })
  it('用估算解决问题：例 7（够买 10 元的、不够买 20 元的、两种估法）、做一做 1（40 元够吗）', () => {
    const t = tier1(K_EST)
    for (const x of ['ex7-10', 'ex7-20', 'ex7-up', 'ex7-low', 'est-', 'dz1-40']) expect(has(t, x), x).toBe(true)
  })
  it('分段计费：例 8（6.3 千米 14 元、按 7 千米算、线段图、价格表的 2 千米和 7.8 千米）、做一做 2（11 吨、17 吨）', () => {
    const t = tier1(K_TIER)
    for (const x of ['taxi-6.3', 'taxikm-all-6.3', 'taxikm-over-6.3', 'taxiline-7', 'taxitable-2', 'taxitable-7.8', 'water-11', 'water-17']) expect(has(t, x), x).toBe(true)
  })
})

describe('朗读：每个知识点不同的小数不超过 120 个；题目文字不踩坑', () => {
  it('题目与「正确答案是……」里出现的不同小数', () => {
    for (const kp of KPS) {
      const decs = new Set<string>()
      each(kp, (q0) => {
        for (const piece of [...questionSpeech(q0, 'zh'), ...answerSpeech(q0, 'zh')]) for (const m of piece.match(/\d+\.\d+/g) ?? []) decs.add(m)
      }, 300)
      expect(decs.size, `${kp}：${decs.size} 个不同的小数`).toBeLessThanOrEqual(120)
    }
  })
  it('词条里：「长」只在长度 / 长方形 / 长方体里；不写还、为、应付、得数、量得、测得、处、括号、问号；数字后面不跟「只」', () => {
    for (const [k, v] of Object.entries(ZH)) {
      const t = String(v)
      expect(t.replace(/长度|长方形|长方体/g, ''), k).not.toMatch(/长/)
      expect(t, k).not.toMatch(/还|为|应付|得数|量得|测得|处|[（(]|\?/)
      expect(t, k).not.toMatch(/\d\s*只|\{\w+\}\s*只/)
    }
  })
})
