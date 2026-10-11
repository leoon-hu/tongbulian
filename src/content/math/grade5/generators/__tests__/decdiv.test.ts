import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { answerSpeech } from '@/engine/speech'
import { DOT_ABOVE } from '@/engine/fraction'
import { divWork } from '../decdiv'

// 五上「小数除法」四个知识点的专项检查（五年级数学 C）：从题目本身（横式、竖式、题干的参数、表里的数）反推答案，150 种子 × 三档；
// 小数、循环小数、近似数的答案只用选项卡，只考数值的选项数值互不相等（保留几位小数的题才拿末尾的 0 区别）；
// 竖式照课本的写法（商的小数点对着被除数的小数点、添 0 往右延伸、除数是小数的划法）；第 1 档出得到每个例题与做一做。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KPS = ['m5s1-03-int-divisor', 'm5s1-03-repeating', 'm5s1-03-dec-divisor', 'm5s1-03-approx'] as const

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sig = (q: Question): string => q.id.slice(q.kpId.length + 1)
const kind = (q: Question): string => sig(q).split('-')[0]!
const part = <K extends StemPart['kind']>(q: Question, k: K): Extract<StemPart, { kind: K }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === k)
const exprs = (q: Question): string[] => q.stem.filter((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr').map((p) => p.expr)
const textKey = (q: Question): { k: string; p: Record<string, unknown> } => {
  const t = q.stem.find((p) => p.kind === 'text' && typeof p.text === 'object') as Extract<StemPart, { kind: 'text' }> | undefined
  const l = (t?.text ?? { k: '' }) as { k: string; p?: Record<string, unknown> }
  return { k: l.k.replace(/^m5\.ddiv\./, ''), p: l.p ?? {} }
}
const answerText = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))

// ── 测试自己的算术（不用生成器里的函数）：分数 n / d，BigInt 免得溢出 ──
interface F {
  n: bigint
  d: bigint
}
const g = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : g(b, a % b))
const f = (n: bigint, d: bigint): F => {
  const k = g(n, d) || 1n
  return { n: n / k, d: d / k }
}
const fromDec = (s: string): F => {
  const [i = '0', p = ''] = s.split('.')
  return f(BigInt(i + p), 10n ** BigInt(p.length))
}
/** 循环小数（带上点的写法）或完整写法（「…」结尾：按写出来的循环节推）的值 */
function valueOf(s: string): F {
  if (s.includes(DOT_ABOVE)) {
    const m = /^(\d+)\.(\d*?)(\d)\u0307(?:(\d*)(\d)\u0307)?$/.exec(s)!
    const [, int, pre, a, mid = '', b = ''] = m
    const rep = `${a}${mid}${b}`
    const whole = BigInt(`${int}${pre}${rep}`) - BigInt(`${int}${pre}`)
    return f(whole, (10n ** BigInt(rep.length) - 1n) * 10n ** BigInt(pre!.length))
  }
  return fromDec(s)
}
const div = (a: F, b: F): F => f(a.n * b.d, a.d * b.n)
const eqF = (a: F, b: F): boolean => a.n * b.d === b.n * a.d
const ltF = (a: F, b: F): boolean => a.n * b.d < b.n * a.d
/** 保留 p 位（四舍五入，字符串保留末尾的 0） */
function round(x: F, p: number): string {
  const scaled = (2n * x.n * 10n ** BigInt(p) + x.d) / (2n * x.d)
  const s = scaled.toString().padStart(p + 1, '0')
  return p ? `${s.slice(0, -p)}.${s.slice(-p)}` : s
}
const DEC = /^\d+(\.\d+)?$/
/** 横式「a ÷ b = ?」「a ÷ b」里的两个数 */
const parseDiv = (e: string): [string, string] | null => {
  const m = /^(\d+(?:\.\d+)?) ÷ (\d+(?:\.\d+)?)(?: = \?)?$/.exec(e)
  return m ? [m[1]!, m[2]!] : null
}

describe('小数除法：G14 的选项规矩', () => {
  for (const kp of KPS) {
    it(`${kp}：小数、循环小数只在选项卡里；只考数值的选项数值互不相等`, () => {
      each(kp, (q) => {
        if (q.answer.kind === 'number') return
        const ls = labels(q)
        const nums = ls.filter((s) => DEC.test(s) || s.includes(DOT_ABOVE))
        if (nums.length !== ls.length || ['cycle', 'cyclecard'].includes(kind(q))) return // 文字 / 算式 / 符号选项；循环节是一串数字，不比数值
        const vals = nums.map(valueOf)
        // 保留几位小数的题（考写法）：1.20 和 1.2 可以同时出现，但每个选项的写法不同
        if (['r2', 'p5', 'p7', 'r3', 'runner', 'beanprice', 'ostrich', 'relay'].includes(kind(q))) {
          expect(new Set(ls).size, q.id).toBe(ls.length)
          return
        }
        for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) expect(eqF(vals[i]!, vals[j]!), `${q.id} 选项里有等值的两种写法：${ls.join(' / ')}`).toBe(false)
        // 整数答案（商是整数）只走数字键盘那条路，不当小数选项出（整数选项是 numberQuestion 的整数选择卡）
        const ans = answerText(q)
        if (/^\d+$/.test(ans)) expect(ls.every((s) => /^\d+$/.test(s)), q.id).toBe(true)
      })
    })
  }
})

describe('小数除法：从题目反推答案', () => {
  it('横式和竖式的商（a ÷ b）都对；竖式和横式是同一道题', () => {
    let n = 0
    for (const kp of KPS) {
      each(kp, (q) => {
        const e = exprs(q)
        if (!['calc', 'p5', 'p6', 'hard', 'ex1', 'pair'].includes(kind(q))) return
        const last = e[e.length - 1]
        const ab = last ? parseDiv(last) : null
        if (!ab) return
        const want = div(fromDec(ab[0]), fromDec(ab[1]))
        expect(eqF(valueOf(answerText(q)), want), `${q.id}：${answerText(q)}`).toBe(true)
        const fig = part(q, 'dec-division')
        if (fig) {
          // 竖式照写的被除数（去掉补上的 0）、除数和横式一样
          const shown = (fig.pad ? fig.dividend.slice(0, -fig.pad) : fig.dividend).replace(/\.$/, '')
          expect(eqF(fromDec(shown), fromDec(ab[0])), q.id).toBe(true)
          expect(fig.divisor, q.id).toBe(ab[1])
        }
        n++
      })
    }
    expect(n).toBeGreaterThan(150)
  })

  it('应用题：例 1、例 2 的钱、练习五的青蛙 / 班费 / 登山、例 4 的中国结、练习六的菜地、相遇、速度差', () => {
    const want: Record<string, string> = {
      'ex1-22': '5.5',
      'ex1-22.4': '5.6',
      'ex1-99.8': '24.95',
      frog: '2.58',
      'fund-book': '5.8',
      'fund-rope': '2.9',
      'climb-up': '2.4',
      'climb-down': '3.6',
      'climb-all': '2.88',
      knot: '9',
      field: '9.5',
      meet: '62',
      speedgap: '16',
      'ex1-rest': '20',
      'shop-price': '86.70',
      'shop-amount': '336.00',
      'shop-count': '4',
      shifted: '1.5',
      parcel: '3.5',
      'table9-1': '50',
      'table9-2': '150',
      'table9-q': '0.3',
      'series-note': '5.2',
      'series-each': '15.6',
      dict: '5',
      forest: '62',
    }
    const seen = new Set<string>()
    for (const kp of KPS) {
      each(kp, (q) => {
        const s = sig(q)
        if (!(s in want)) return
        expect(answerText(q), q.id).toBe(want[s])
        seen.add(s)
      })
    }
    expect([...seen].sort()).toEqual(Object.keys(want).sort())
  })

  it('例 6 和做一做：装满几瓶（去尾）、准备几个瓶子（进一）、丝带包几个礼盒（去尾）', () => {
    each('m5s1-03-approx', (q) => {
      const k = textKey(q)
      if (!['bean.full', 'bean.jars', 'ribbon'].includes(k.k)) return
      const t = fromDec(String(k.p.t))
      const e = fromDec(String(k.p.e))
      const x = div(t, e)
      expect(x.d, `${q.id} 商要不是整数`).not.toBe(1n)
      const fl = Number(x.n / x.d)
      expect((q.answer as { value: number }).value, q.id).toBe(k.k === 'bean.jars' ? fl + 1 : fl)
    })
  })

  it('保留几位小数：正确答案四舍五入、写够位数（1.20 不写成 1.2），干扰项都不是它', () => {
    const P: Record<string, number> = { 'm5.ddiv.p1': 1, 'm5.ddiv.p2': 2, 'm5.ddiv.p3': 3 }
    let n = 0
    each('m5s1-03-approx', (q) => {
      const k = textKey(q)
      if (k.k !== 'roundn') return
      const ab = parseDiv(String(k.p.e))!
      const p = P[(k.p.p as { k: string }).k]!
      const want = round(div(fromDec(ab[0]), fromDec(ab[1])), p)
      expect(answerText(q), q.id).toBe(want)
      expect(labels(q).filter((s) => s === want)).toHaveLength(1)
      n++
    })
    expect(n).toBeGreaterThan(50)
    // 课本的几个数：45.5 ÷ 38 保留两位是 1.20、32 ÷ 2.7 精确到分是 11.85、134 ÷ 9 是 14.89、37.79 ÷ 4 是 9.45、400 ÷ 75 是 5.33
    const fixed: Record<string, string> = { beanprice: '11.85', ostrich: '14.89', relay: '9.45', runner: '5.33', 'p5-45.5/38-2': '1.20' }
    const seen = new Set<string>()
    each('m5s1-03-approx', (q) => {
      if (sig(q) in fixed) {
        expect(answerText(q), q.id).toBe(fixed[sig(q)])
        seen.add(sig(q))
      }
    })
    expect([...seen].sort()).toEqual(Object.keys(fixed).sort())
  })

  it('循环小数：简便写法、循环节、有限 / 无限、几分之七和几分之十一、保留三位、比大小', () => {
    each('m5s1-03-repeating', (q) => {
      const k = textKey(q)
      const ans = answerText(q)
      if (k.k === 'write' || k.k === 'write.div') {
        const x = k.k === 'write' ? String(k.p.x) : null
        const want = x ? null : (() => {
          const ab = parseDiv(String(k.p.e))!
          return div(fromDec(ab[0]), fromDec(ab[1]))
        })()
        expect(ans.includes(DOT_ABOVE), q.id).toBe(true)
        const v = valueOf(ans)
        if (want) expect(eqF(v, want), q.id).toBe(true)
        if (x) {
          // 完整写法 7.14545… 的前几位和简便写法展开的一样
          const digits = x.replace('…', '')
          const approx = round(v, digits.split('.')[1]!.length + 2).slice(0, digits.length)
          expect(approx, q.id).toBe(digits)
        }
        for (const l of labels(q)) if (l !== ans) expect(eqF(valueOf(l), v), `${q.id} 干扰项 ${l} 和答案等值`).toBe(false)
        // 循环节只点首末两位：一位的点一个，几位的点两个
        expect(ans.split(DOT_ABOVE).length - 1, q.id).toBeLessThanOrEqual(2)
      }
      if (k.k === 'cycle.card') {
        // 小数卡上的简便写法：两个圆点之间（含）就是循环节，一个圆点就是那一位
        const n = part(q, 'dec-card')!.n!
        const m = /(\d)\u0307(?:(\d*)(\d)\u0307)?$/.exec(n)!
        expect(ans, q.id).toBe(`${m[1]}${m[2] ?? ''}${m[3] ?? ''}`)
      }
      if (k.k === 'cycle') {
        const x = String(k.p.x).replace('…', '')
        // 循环节在完整写法的末尾出现两遍（一位的三遍）
        expect(x.endsWith(ans.repeat(ans.length === 1 ? 3 : 2)), q.id).toBe(true)
        const right = q.choices!.find((c) => zh(c.label) === ans)!
        expect(right.say, q.id).toMatch(/^[零一二三四五六七八九]+$/)
      }
      if (k.k === 'compare') {
        const [l, r] = exprs(q)[0]!.split(' ○ ')
        const parse = (s: string): F => {
          if (s.endsWith('…')) {
            // 5.333… 这种完整写法：一位循环节
            const t = s.slice(0, -1)
            return valueOf(`${t.slice(0, -1)}${t.slice(-1)}${DOT_ABOVE}`.replace(/(\d)\1+(\d\u0307)$/, '$2'))
          }
          const ab = s.includes(' ÷ ') ? s.split(' ÷ ') : null
          return ab ? div(fromDec(ab[0]!), fromDec(ab[1]!)) : valueOf(s)
        }
        const x = parse(l!)
        const y = parse(r!)
        expect(ans, q.id).toBe(ltF(x, y) ? '<' : ltF(y, x) ? '>' : '=')
      }
      if (k.k === 'round3') {
        const x = String(k.p.x)
        if (x.includes(DOT_ABOVE)) expect(ans, q.id).toBe(round(valueOf(x), 3))
      }
      if (k.k === 'seven') {
        const n = Number(/^(\d) ÷ 7 = \?$/.exec(exprs(q)[2]!)![1])
        expect(eqF(valueOf(ans), f(BigInt(n), 7n)), q.id).toBe(true)
      }
      if (k.k === 'eleven') {
        const n = Number(/^(\d) ÷ 11 = \?$/.exec(exprs(q)[2]!)![1])
        expect(ans, q.id).toBe(`0.${String(9 * n).padStart(2, '0').repeat(2)}…`)
      }
      if (k.k === 'isrep') expect(ans, q.id).toBe(String(k.p.x).endsWith('…') ? '对' : '不对')
      if (k.k === 'finite') expect(ans, q.id).toBe(String(k.p.x).endsWith('…') || String(k.p.x).includes(DOT_ABOVE) ? '是无限小数' : '是有限小数')
    })
  })

  it('一个数除以小数：扩大到原来的多少倍、末尾补几个 0、商不变的规律、改写成除数是整数的算式', () => {
    each('m5s1-03-dec-divisor', (q) => {
      const k = textKey(q)
      if (k.k === 'times.q') {
        const [, b] = String(k.p.e).split(' ÷ ')
        expect(answerText(q), q.id).toBe(`${10 ** (b!.split('.')[1] ?? '').length} 倍`)
      }
      if (k.k === 'pad') {
        const [a, b] = String(k.p.e).split(' ÷ ') as [string, string]
        const need = (b.split('.')[1] ?? '').length - (a.split('.')[1] ?? '').length
        expect(answerText(q), q.id).toBe(String(Math.max(0, need)))
      }
      if (k.k === 'same' || k.k === 'toint') {
        const m = /^(\S+) ÷ (\S+) = (\S+) ÷ (\S+)$/.exec(exprs(q)[0]!)!
        const [, a, b, c, d] = m
        const left = div(fromDec(a!), fromDec(b!))
        const fill = answerText(q)
        const right = c === '?' ? div(fromDec(fill), fromDec(d!)) : div(fromDec(c!), fromDec(fill))
        expect(eqF(left, right), q.id).toBe(true)
        // 改写以后除数是整数
        expect(d === '?' ? fill : d, q.id).toMatch(/^\d+$/)
      }
      if (k.k === 'compare') {
        const [l, r] = exprs(q)[0]!.split(' ○ ') as [string, string]
        const [a, b] = l.split(' ÷ ') as [string, string]
        const x = div(fromDec(a), fromDec(b))
        const y = fromDec(r)
        expect(answerText(q), q.id).toBe(ltF(x, y) ? '<' : ltF(y, x) ? '>' : '=')
      }
    })
  })
})

describe('竖式（LongDivision 的小数模式）', () => {
  /** 被除数照写的各位数字 */
  const digits = (s: string): number[] => s.replace('.', '').split('').map(Number)

  it('课本的竖式：22 ÷ 4（被除数不写 .0，往右添一列）、22.4 ÷ 4、3.0 ÷ 4（商 0.75）、400 ÷ 75（余数总是 25）', () => {
    const a = divWork(4, digits('22'), 2)
    expect(a.quotient).toEqual({ text: '5.5', end: 2 })
    expect(a.rows.map((r) => r.text)).toEqual(['20', '20', '20', '0'])
    expect(a.rows.map((r) => r.end)).toEqual([1, 2, 2, 2])
    expect(a.cols).toBe(3)
    const b = divWork(4, digits('22.4'), 2)
    expect(b.quotient).toEqual({ text: '5.6', end: 2 })
    expect(b.rows.map((r) => r.text)).toEqual(['20', '24', '24', '0'])
    const c = divWork(4, digits('3.0'), 1)
    expect(c.quotient).toEqual({ text: '0.75', end: 2 })
    expect(c.rows.map((r) => r.text)).toEqual(['28', '20', '20', '0'])
    const d = divWork(75, digits('400'), 3, 3)
    expect(d.quotient).toEqual({ text: '5.333', end: 5 })
    expect(d.rows.map((r) => r.text)).toEqual(['375', '250', '225', '250', '225', '250', '225', '25'])
    expect(d.rem).toBe(25)
    // 例 1 的第一个竖式：只除到个位，余 2
    const e = divWork(4, digits('22'), 2, 0)
    expect(e.quotient.text).toBe('5')
    expect(e.rows.map((r) => r.text)).toEqual(['20', '2'])
  })

  it('商中间有 0、个位商 0、十分位商 0：14.21 ÷ 7 = 2.03、0.54 ÷ 6 = 0.09、1.26 ÷ 28 = 0.045', () => {
    expect(divWork(7, digits('14.21'), 2).quotient.text).toBe('2.03')
    expect(divWork(7, digits('14.21'), 2).rows.map((r) => r.text)).toEqual(['14', '21', '21', '0'])
    expect(divWork(6, digits('0.54'), 1).quotient.text).toBe('0.09')
    expect(divWork(28, digits('1.26'), 1).quotient).toEqual({ text: '0.045', end: 3 })
  })

  it('除数是小数（移动以后）：7.65 ÷ 0.85 → 765 ÷ 85 = 9、12.6 ÷ 0.28 → 1260 ÷ 28 = 45、4.48 ÷ 3.2 → 44.8 ÷ 32 = 1.4', () => {
    expect(divWork(85, digits('7.65'), 3)).toMatchObject({ quotient: { text: '9', end: 2 }, rows: [{ text: '765', end: 2, line: true }, { text: '0', end: 2 }] })
    expect(divWork(28, digits('12.60'), 4).quotient).toEqual({ text: '45', end: 3 })
    expect(divWork(28, digits('12.60'), 4).rows.map((r) => r.text)).toEqual(['112', '140', '140', '0'])
    expect(divWork(32, digits('4.48'), 2).quotient).toEqual({ text: '1.4', end: 2 })
  })

  it('题目里的竖式：每一步乘积 = 商的这一位 × 除数，最后一行是 0（除得尽）或余数；商的小数点对着被除数（移动以后）的小数点', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        const fig = part(q, 'dec-division')
        if (!fig?.rows || ['fix', 'fixans'].includes(kind(q))) return
        const divisor = Number(fig.divisor.replace('.', ''))
        const ds = fig.dividend.replace('.', '')
        const pt = fig.moved ?? (fig.dividend.includes('.') ? fig.dividend.indexOf('.') : fig.dividend.length)
        const qText = fig.quotient!.text
        const qDigits = qText.replace('.', '')
        // 小数点：商里的「.」后面有几位，就是商的最后一位离被除数的个位往右几位
        if (qText.includes('.')) expect(qText.split('.')[1]!.length, q.id).toBe(fig.quotient!.end - (pt - 1))
        // 乘积行：每一行是 商的某一位 × 除数
        const products = fig.rows.filter((r) => r.line).map((r) => Number(r.text))
        const nonzero = [...qDigits].map(Number).filter((x) => x > 0)
        expect(products, q.id).toEqual(nonzero.map((x) => x * divisor))
        expect(Number(ds) > 0, q.id).toBe(true)
        expect(fig.cols ?? 0, q.id).toBeGreaterThanOrEqual(ds.length)
      })
    }
  })

  it('除数是小数的竖式：划掉小数点、移动的位数等于除数的小数位数，位数不够补 0（红字）；问商的空和移动后的整数部分一样宽', () => {
    each('m5s1-03-dec-divisor', (q) => {
      const fig = part(q, 'dec-division')
      if (!fig || fig.moved === undefined || ['fix', 'fixans'].includes(kind(q))) return
      const k = (fig.divisor.split('.')[1] ?? '').length
      const original = fig.pad ? fig.dividend.slice(0, -fig.pad) : fig.dividend
      const intLen = original.split('.')[0]!.length
      expect(fig.moved, q.id).toBe(intLen + k)
      // 补上 0 以后，被除数的位数正好够移动：小数部分有 k 位，整数被除数末尾补 k 个 0
      if (fig.pad) expect(fig.dividend.replace('.', '').length, q.id).toBe(intLen + k)
      if (fig.quotient?.text === '?') {
        expect(fig.quotient.w, q.id).toBe(fig.moved)
        expect(q.input, q.id).toBe('numpad')
      }
    })
  })
})

describe('第 1 档出得到课本的例题和做一做', () => {
  const tier1 = (kp: string): Set<string> => {
    const out = new Set<string>()
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 400; seed++) out.add(sig(gen(1, createRng(seed))))
    return out
  }
  it('除数是整数的小数除法：例 1（22 元 / 22.4 元、红框、余下 2 元、24 个 0.1）、例 2（3 ÷ 4、添 0、商 0、验算）、做一做', () => {
    const s = [...tier1('m5s1-03-int-divisor')]
    for (const need of ['ex1-22', 'ex1-22.4', 'ex1-99.8', 'ex1-rest', 'units-22.4/4-1', 'units-3/4-1', 'ex2-30', 'pair-4.2', 'pair-8.4', 'pair-15.4', 'rule-align', 'rule-rest'])
      expect(s, need).toContain(need)
    for (const pre of ['digit-22-', 'digit-22.4-', 'digit-99.8-', 'ones-', 'check-', 'checkwhich-', 'calc-3/4', 'calc-72/15', 'calc-9/4', 'calc-14.21/7', 'calc-25.5/6', 'calc-6.8/5', 'calc-0.416/32'])
      expect(s.some((x) => x.startsWith(pre)), pre).toBe(true)
  })
  it('循环小数：例 3（余数总是 25）、试一试、循环节、简便写法、有限 / 无限、做一做 1、3', () => {
    const s = [...tier1('m5s1-03-repeating')]
    for (const need of ['ex3-400', 'ex3-28', 'writediv-28', 'writediv-78.6', 'cycle-5.333…', 'cycle-7.14545…', 'cycle-6.9258258…', 'write-1.555…', 'write-1.746746…', 'write-0.105353…'])
      expect(s, need).toContain(need)
    for (const pre of ['ends-', 'isrep-', 'finite-', 'wj-', 'sev-']) expect(s.some((x) => x.startsWith(pre)), pre).toBe(true)
  })
  it('一个数除以小数：例 4（中国结、换成厘米、商不变）、做一做（扩大多少倍）、例 5（补 0）、做一做 1、2', () => {
    const s = [...tier1('m5s1-03-dec-divisor')]
    for (const need of ['knot', 'cm-7.65', 'cm-0.85', 'times-62.4/2.6', 'times-2.38/0.34', 'times-0.544/0.16', 'pad-12.6/0.28', 'rule-first'])
      expect(s, need).toContain(need)
    for (const pre of ['same-7.65', 'calc-7.65/0.85', 'calc-12.6/0.28', 'calc-2.19/0.3', 'calc-25.6/0.032', 'calc-260/0.13', 'cmpdiv-6/', 'cmpdiv-1.2/', 'cmpdiv-49.5/', 'rule-move-'])
      expect(s.some((x) => x.startsWith(pre)), pre).toBe(true)
  })
  it('商的近似数：例 3 做一做 2、例 6（精确到分、装满几瓶、准备几个瓶子）、做一做（丝带）', () => {
    const s = [...tier1('m5s1-03-approx')]
    for (const need of ['r2-15/7-2', 'r2-15.3/72-2', 'r2-2.29/9-2', 'runner', 'beanprice', 'bean-full-2.7/0.8', 'bean-jars-2.7/0.8', 'ribbon-25/1.5'])
      expect(s, need).toContain(need)
  })
})

describe('朗读', () => {
  it('题目文字不出现单独的「长」「重」、括号，循环小数读「……循环」', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        for (const p of q.stem) {
          if (p.kind !== 'text') continue
          const t = zh(p.text)
          expect(t, q.id).not.toMatch(/[（）()]/)
          expect(t.replace(/长方形|长度|长方体/g, ''), q.id).not.toMatch(/长/)
          expect(t.replace(/体重/g, ''), q.id).not.toMatch(/重(?!复)/)
        }
        if (answerText(q).includes(DOT_ABOVE)) expect(answerSpeech(q, 'zh').join(''), q.id).toMatch(/循环/)
      })
    }
  })
})
