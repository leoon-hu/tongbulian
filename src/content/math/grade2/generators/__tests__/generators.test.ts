import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade2' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/math/grade2/curriculum'
import { buildSession, createRng, getGenerator, hasGenerator } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { translate } from '@/engine/i18n'
import { formatClock, formatTime } from '@/content/math/shared/labels'
import { CATEGORIES } from '../sorting'

const registered = KNOWLEDGE_POINTS.filter((kp) => hasGenerator(kp.id))
const zh = (l: LStr): string => translate(l, 'zh')

function stemOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined {
  return q.stem.find((p) => p.kind === kind) as Extract<StemPart, { kind: K }> | undefined
}
function stemsOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }>[] {
  return q.stem.filter((p) => p.kind === kind) as Extract<StemPart, { kind: K }>[]
}
function correctInput(q: Question): unknown {
  return q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId
}
function correctLabel(q: Question): string {
  if (q.answer.kind === 'number') return String(q.answer.value)
  return zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
}
function correctNumber(q: Question): number {
  return Number(correctLabel(q))
}

/** 计算含 + − × ÷ 与小括号的算式（按运算顺序），只用于测试 */
function evalArith(expr: string): number {
  const src = expr.replace('= ?', '').replace(/×/g, '*').replace(/÷/g, '/').trim()
  expect(src).toMatch(/^[\d\s+\-*/()]+$/)
  return new Function(`return (${src})`)() as number
}

/** 生成器跑遍多种子 × 三档，把每道题交给回调 */
function each(kpId: string, seeds: number, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= seeds; seed++) {
    for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
  }
}

describe('二年级全部生成器：结构自洽（多种子）', () => {
  it('29 个知识点都有生成器', () => {
    expect(registered.length).toBe(KNOWLEDGE_POINTS.length)
    expect(registered.length).toBe(29)
  })

  for (const kp of registered) {
    it(`${kp.id} 每题结构合法且答案自洽`, () => {
      each(kp.id, 150, (q) => {
        expect(q.kpId).toBe(kp.id)
        expect([1, 2, 3]).toContain(q.difficulty)
        expect(q.stem.length).toBeGreaterThan(0)
        expect(['numpad', 'choice']).toContain(q.input)
        expect(kp.questionTypes).toContain(q.type)
        expect(checkAnswer(q, correctInput(q))).toBe(true)
        for (const part of q.stem) {
          if (part.kind === 'objects') expect(part.count).toBeGreaterThan(0)
          if (part.kind === 'compare-rows') for (const row of part.rows) expect(row.count).toBeGreaterThan(0)
          if (part.kind === 'ruler') {
            expect(part.from).toBeGreaterThanOrEqual(0)
            expect(part.to).toBeGreaterThan(part.from)
            expect(part.to).toBeLessThanOrEqual(part.length)
          }
          if (part.kind === 'vertical') {
            expect(part.a).toBeGreaterThanOrEqual(part.op === '-' ? part.b : 0)
            expect(part.b).toBeGreaterThan(0)
          }
          if (part.kind === 'clock') {
            expect(part.minute).toBeGreaterThanOrEqual(0)
            expect(part.minute).toBeLessThan(60)
          }
          // 题干文字里不该残留没翻译的键（词条漏写会原样显示 key）
          if (part.kind === 'text') {
            expect(zh(part.text)).not.toMatch(/^[a-z]+\.[a-zA-Z.]+$/)
            expect(translate(part.text, 'en')).not.toMatch(/\b(q|opt|cat|num|side|shape)\.[a-zA-Z]/)
          }
        }
        if (q.input === 'choice') {
          const choices = q.choices ?? []
          expect(choices.length).toBeGreaterThanOrEqual(2)
          const labels = choices.map((c) => zh(c.label))
          expect(new Set(labels).size).toBe(labels.length)
          for (const label of labels) expect(label).not.toMatch(/^[a-z]+\.[a-zA-Z.]+$/)
          const ids = choices.map((c) => c.id)
          expect(new Set(ids).size).toBe(ids.length)
          if (q.answer.kind === 'choice') expect(ids).toContain(q.answer.choiceId)
        } else if (q.answer.kind === 'number') {
          expect(Number.isInteger(q.answer.value)).toBe(true)
          expect(q.answer.value).toBeGreaterThanOrEqual(0)
          expect(q.answer.value).toBeLessThanOrEqual(10000)
        }
      })
    })
  }
})

describe('buildSession：足量且去重', () => {
  for (const kp of registered) {
    it(`${kp.id} 一轮 8 题签名不重复且凑得齐`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        const qs = buildSession(kp.id, 8, { seed })
        expect(qs.length).toBe(8)
        expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length)
      }
    })
  }
})

describe('数学正确性', () => {
  it('所有「… = ?」算式：按运算顺序算出的结果 == 标注答案', () => {
    let checked = 0
    for (const kp of registered) {
      each(kp.id, 120, (q) => {
        for (const e of stemsOf(q, 'expr')) {
          if (!e.expr.includes('= ?') || /[^\d\s+\-×÷=?()]/u.test(e.expr)) continue
          checked++
          expect(evalArith(e.expr), `${kp.id}: ${e.expr}`).toBe(correctNumber(q))
        }
      })
    }
    expect(checked).toBeGreaterThan(500)
  })

  it('长度：换算 / 比较 / 尺子读数正确', () => {
    each('m2s1-05-cm-m', 300, (q) => {
      const texts = stemsOf(q, 'text').map((p) => zh(p.text))
      const nums = texts.join(' ').match(/\d+/g)?.map(Number) ?? []
      const first = texts[0]!
      if (/米 \d+ 厘米 = 几厘米/.test(first)) expect(correctNumber(q)).toBe(nums[0]! * 100 + nums[1]!)
      else if (/^\d+ 米 = 几厘米/.test(first)) expect(correctNumber(q)).toBe(nums[0]! * 100)
      else if (/^\d+ 厘米 = 几米/.test(first)) expect(correctNumber(q)).toBe(nums[0]! / 100)
      else if (/比一比/.test(first)) {
        const [l, r] = texts[1]!.split('⬜').map((s) => s.trim()) as [string, string]
        const cm = (s: string): number => (s.endsWith('厘米') ? parseInt(s, 10) : parseInt(s, 10) * 100)
        expect(correctLabel(q)).toBe(cm(l) > cm(r) ? '>' : cm(l) < cm(r) ? '<' : '=')
      } else if (/单位是厘米还是米/.test(first)) {
        // 米级的物体数值小（≤ 40）、厘米级的物体不含「高」的大家伙——只查选项合法
        expect(['厘米', '米']).toContain(correctLabel(q))
      } else throw new Error(first)
    })
    each('m2s1-05-measure', 200, (q) => {
      const r = stemOf(q, 'ruler')!
      expect(correctNumber(q)).toBe(r.to - r.from)
    })
  })

  it('乘法：看图题 == 行 × 列；口诀题的两个因数都在口诀范围内', () => {
    each('m2s1-02-mult-intro', 200, (q) => {
      const rows = stemOf(q, 'compare-rows')
      const text = zh(stemOf(q, 'text')?.text ?? '')
      if (rows && /一共有多少个/.test(text)) expect(correctNumber(q)).toBe(rows.rows.reduce((s, r) => s + r.count, 0))
      if (rows && /几个 \d+/.test(text)) expect(correctNumber(q)).toBe(rows.rows.length)
      if (/写成乘法算式/.test(text)) {
        const [k, n] = text.match(/\d+/g)!.map(Number) as [number, number]
        expect(correctLabel(q)).toBe(`${n} × ${k}`)
      }
    })
    each('m2s1-02-table-6', 300, (q) => {
      const e = stemOf(q, 'expr')
      if (!e) return
      // a × b = ? / ? × b = c / a × ? = c：两个因数（含要填的那个）都 ≤ 6
      const [a, , b] = e.expr.split(' ') as [string, string, string]
      for (const f of [a, b]) expect(f === '?' ? correctNumber(q) : Number(f)).toBeLessThanOrEqual(6)
    })
    each('m2s1-06-table-9', 300, (q) => {
      const e = stemOf(q, 'expr')!
      const factors = e.expr.match(/\d+/g)!.map(Number).filter((n) => n <= 9)
      expect(factors.some((n) => n >= 7) || correctNumber(q) >= 7).toBe(true)
    })
    each('m2s1-02-mult-addsub', 200, (q) => {
      const rows = stemOf(q, 'compare-rows')
      if (rows) expect(correctNumber(q)).toBe(rows.rows.reduce((s, r) => s + r.count, 0))
    })
  })

  it('认识时间：选项与钟面一致；再过几分 / 经过几分算得对', () => {
    each('m2s2-01-time-read', 300, (q) => {
      const clock = stemOf(q, 'clock')!
      if (q.input === 'choice') expect(correctLabel(q)).toBe(formatTime(clock.hour, clock.minute))
      else expect(correctNumber(q)).toBe(clock.minute)
    })
    each('m2s2-01-time-calc', 300, (q) => {
      const text = zh(stemOf(q, 'text')!.text)
      const nums = text.match(/\d+/g)?.map(Number) ?? []
      if (/^\d+ 时 = 几分/.test(text)) expect(correctNumber(q)).toBe(nums[0]! * 60)
      else if (/^\d+ 分 = 几时/.test(text)) expect(correctNumber(q)).toBe(nums[0]! / 60)
      else if (/再过/.test(text)) {
        const clock = stemOf(q, 'clock')!
        const step = Number(text.match(/再过 (\d+) 分/)![1])
        const total = clock.minute + step
        expect(correctLabel(q)).toBe(formatTime(clock.hour + Math.floor(total / 60), total % 60))
      } else if (/经过了几分/.test(text)) {
        const m = text.match(/(\d+)时(\d+)?分? 到 (\d+)时(\d+)?分?/)
        const m1 = Number(m?.[2] ?? 0)
        const m2 = Number(m?.[4] ?? 0)
        expect(correctNumber(q)).toBe(m2 - m1)
      }
    })
  })

  it('除法：平均分看图题与文字题的答案正确；口诀求商的除数 / 商在范围内', () => {
    each('m2s1-03-share', 300, (q) => {
      const pic = stemOf(q, 'objects')!
      const text = zh(stemOf(q, 'text')!.text)
      const nums = text.match(/\d+/g)!.map(Number)
      expect(nums[0]).toBe(pic.count)
      expect(correctNumber(q)).toBe(pic.count / nums[1]!)
    })
    each('m2s1-03-div-6', 300, (q) => {
      const e = stemOf(q, 'expr')
      if (!e) return
      // a ÷ b = ? / ? ÷ b = q / a ÷ ? = q：除数与商（含要填的那个）都 ≤ 6
      const [, , b, , qq] = e.expr.split(' ') as [string, string, string, string, string]
      for (const f of [b, qq]) expect(f === '?' ? correctNumber(q) : Number(f)).toBeLessThanOrEqual(6)
    })
    each('m2s1-03-div-solve', 300, (q) => {
      const text = zh(stemOf(q, 'text')!.text)
      const nums = text.match(/\d+/g)!.map(Number)
      const v = correctNumber(q)
      if (/元可以买几个/.test(text)) expect(v).toBe(nums[1]! / nums[0]!)
      else expect(v).toBe(nums[0]! / nums[1]!)
    })
  })

  it('分类：数一类的数量正确，找不同的答案不在同类里', () => {
    let counted = 0
    each('m2s1-01-sorting', 300, (q) => {
      const scatter = stemOf(q, 'scatter')
      const text = zh(stemOf(q, 'text')!.text)
      if (scatter) {
        counted++
        const name = text.match(/有几个(.+?)？/)![1]!
        const cat = CATEGORIES.find((c) => c.name === name)!
        expect(correctNumber(q)).toBe(scatter.items.filter((it) => cat.items.includes(it)).length)
      } else {
        const others = q.choices!.map((c) => zh(c.label)).filter((l) => l !== correctLabel(q))
        const cat = CATEGORIES.find((c) => c.items.includes(others[0]!))!
        for (const o of others) expect(cat.items).toContain(o)
        expect(cat.items).not.toContain(correctLabel(q))
      }
    })
    expect(counted).toBeGreaterThan(20)
  })

  it('认识除法算式：被除数 / 除数 / 商 各就各位；平均分写成除法算式', () => {
    each('m2s1-03-div-parts', 300, (q) => {
      const text = zh(stemOf(q, 'text')!.text)
      const e = stemOf(q, 'expr')
      if (e) {
        const [t, n, qq] = e.expr.match(/\d+/g)!.map(Number) as [number, number, number]
        expect(t).toBe(n * qq)
        expect(correctNumber(q)).toBe(/被除数/.test(text) ? t : /除数/.test(text) ? n : qq)
      } else {
        const [t, k, qq] = text.match(/\d+/g)!.map(Number) as [number, number, number]
        expect(correctLabel(q)).toBe(`${t} ÷ ${k} = ${qq}`)
      }
    })
  })

  it('东南西北：太阳东升西落、对面、地图上北下南、面向某方向时的左右后', () => {
    const OPP: Record<string, string> = { 东: '西', 西: '东', 南: '北', 北: '南' }
    const LEFT: Record<string, string> = { 东: '北', 北: '西', 西: '南', 南: '东' }
    each('m2s1-04-directions', 300, (q) => {
      const text = zh(stemOf(q, 'text')!.text)
      const v = correctLabel(q)
      if (/升起/.test(text)) expect(v).toBe('东')
      else if (/落下/.test(text)) expect(v).toBe('西')
      else if (/对面/.test(text)) expect(v).toBe(OPP[text[0]!])
      else if (/地图/.test(text)) {
        const side = text.match(/地图的(上面|下面|左边|右边)/)![1]!
        expect(v).toBe({ 上面: '北', 下面: '南', 左边: '西', 右边: '东' }[side])
      } else {
        const m = text.match(/面向(东|南|西|北)站着，你的(后面|左边|右边)/)!
        const facing = m[1]!
        expect(v).toBe(m[2] === '后面' ? OPP[facing] : m[2] === '左边' ? LEFT[facing] : OPP[LEFT[facing]!])
      }
    })
  })

  it('连续两问：先乘 / 除再加 / 减，答案正确', () => {
    each('m2s1-06-two-questions', 300, (q) => {
      const text = zh(stemOf(q, 'text')!.text)
      const nums = text.match(/\d+/g)!.map(Number)
      const v = correctNumber(q)
      if (/送走/.test(text)) expect(v).toBe(nums[0]! * nums[1]! - nums[2]!)
      else if (/又买了/.test(text)) expect(v).toBe((nums[0]! + nums[1]!) / nums[2]!)
      else if (/应找回/.test(text)) expect(v).toBe(nums[2]! - nums[0]! * nums[1]!)
      else if (/装了/.test(text)) expect(v).toBe(nums[0]! - nums[1]! * nums[2]!)
      else throw new Error(text)
    })
  })

  it('认识整时和半时：选项与钟面一致', () => {
    each('m2s2-01-clock-hour', 200, (q) => {
      const clock = stemOf(q, 'clock')!
      expect([0, 30]).toContain(clock.minute)
      expect(correctLabel(q)).toBe(formatClock(clock.hour, clock.minute))
    })
  })

  it('倍的认识与乘除法数量关系：答案正确', () => {
    each('m2s2-03-times', 300, (q) => {
      const text = zh(stemOf(q, 'text')!.text)
      const nums = text.match(/\d+/g)!.map(Number)
      const v = correctNumber(q)
      if (/的几倍/.test(text)) expect(v).toBe(nums[1]! / nums[0]!)
      else if (/的个数是.*个数的 \d+ 倍/.test(text)) expect(v).toBe(nums[0]! * nums[1]!)
      else expect(v).toBe(nums[0]! / nums[1]!)
    })
    each('m2s2-03-mul-div-solve', 300, (q) => {
      const text = zh(stemOf(q, 'text')!.text)
      const nums = text.match(/\d+/g)!.map(Number)
      const v = correctNumber(q)
      if (/每盒一样多/.test(text)) expect(v).toBe((nums[1]! / nums[0]!) * nums[2]!)
      else if (/一共有多少个/.test(text)) expect(v).toBe(nums[0]! * nums[1]!)
      else expect(v).toBe(nums[0]! / nums[1]!)
    })
  })

  it('三位数加减法：都配竖式；第 1 档不进 / 退位，第 2 档只进 / 退一次', () => {
    const carries = (a: number, b: number): number => {
      let c = 0
      let n = 0
      for (let i = 0; i < 4; i++) {
        const da = Math.floor(a / 10 ** i) % 10
        const db = Math.floor(b / 10 ** i) % 10
        if (da + db + c >= 10) {
          n++
          c = 1
        } else c = 0
      }
      return n
    }
    each('m2s2-05-add', 300, (q, d) => {
      const [a, , b] = stemOf(q, 'expr')!.expr.split(' ') as [string, string, string]
      expect(stemOf(q, 'vertical')).toEqual({ kind: 'vertical', a: Number(a), op: '+', b: Number(b) })
      const n = carries(Number(a), Number(b))
      if (d === 1) expect(n).toBe(0)
      if (d === 2) expect(n).toBe(1)
      if (d === 3) expect(n).toBeGreaterThanOrEqual(2)
    })
    each('m2s2-05-sub', 300, (q, d) => {
      const [a, , b] = stemOf(q, 'expr')!.expr.split(' ') as [string, string, string]
      expect(stemOf(q, 'vertical')).toEqual({ kind: 'vertical', a: Number(a), op: '-', b: Number(b) })
      expect(Number(a)).toBeGreaterThan(Number(b))
      const n = carries(Number(a) - Number(b), Number(b)) // 减法的退位次数 = 差与减数相加的进位次数
      if (d === 1) expect(n).toBe(0)
      if (d === 2) expect(n).toBe(1)
      if (d === 3) expect(n).toBeGreaterThanOrEqual(2)
    })
  })

  it('加减法各部分间的关系：求未知数正确、验算算式成立', () => {
    each('m2s2-05-relations', 300, (q) => {
      const e = stemOf(q, 'expr')
      if (e) {
        const filled = e.expr.replace('?', String(correctNumber(q)))
        const [lhs, rhs] = filled.split('=').map((x) => x.trim()) as [string, string]
        expect(evalArith(lhs)).toBe(Number(rhs))
      } else {
        const [lhs, rhs] = correctLabel(q).split('=').map((x) => x.trim()) as [string, string]
        expect(evalArith(lhs)).toBe(Number(rhs))
      }
    })
  })

  it('有余数的除法：份数 / 余数 / 商 / 最大余数 / 被除数', () => {
    each('m2s2-02-remainder', 300, (q) => {
      const pic = stemOf(q, 'objects')!
      const text = zh(stemOf(q, 'text')!.text)
      const [t, n] = text.match(/\d+/g)!.map(Number) as [number, number]
      expect(t).toBe(pic.count)
      expect(t % n).not.toBe(0)
      expect(correctNumber(q)).toBe(/剩/.test(text) ? t % n : Math.floor(t / n))
    })
    each('m2s2-02-rem-calc', 300, (q) => {
      const text = zh(stemOf(q, 'text')!.text)
      const e = stemOf(q, 'expr')
      if (e) {
        const [t, n] = e.expr.match(/\d+/g)!.map(Number) as [number, number]
        expect(t % n).not.toBe(0)
        expect(correctNumber(q)).toBe(/商/.test(text) ? Math.floor(t / n) : t % n)
      } else if (/余数最大/.test(text)) expect(correctNumber(q)).toBe(Number(text.match(/\d+/)![0]) - 1)
      else {
        const [b, qq, r] = text.match(/\d+/g)!.map(Number) as [number, number, number]
        expect(correctNumber(q)).toBe(b * qq + r)
      }
    })
  })

  it('万以内数：组成 / 相邻数 / 接着数 / 数位 / 比较 / 整百整千加减', () => {
    for (const kp of ['m2s2-04-num-1000', 'm2s2-04-num-10000']) {
      const cap = kp.endsWith('1000') ? 1000 : 10000
      each(kp, 300, (q) => {
        const text = zh(stemOf(q, 'text')!.text)
        const v = correctNumber(q)
        expect(v).toBeLessThanOrEqual(cap)
        if (/组成的数/.test(text)) {
          const parts = [...text.matchAll(/(\d+) 个(千|百|十|一)/g)]
          const expected = parts.reduce((s, m) => s + Number(m[1]) * { 千: 1000, 百: 100, 十: 10, 一: 1 }[m[2]!]!, 0)
          expect(v).toBe(expected)
        } else if (/后面的一个数/.test(text)) expect(v).toBe(Number(text.match(/\d+/)![0]) + 1)
        else if (/前面的一个数/.test(text)) expect(v).toBe(Number(text.match(/\d+/)![0]) - 1)
        else if (/找规律/.test(text)) {
          const cells = stemOf(q, 'sequence')!.cells.map((c) => (c.kind === 'blank' ? v : Number(c.label)))
          const step = cells[1]! - cells[0]!
          for (let i = 2; i < cells.length; i++) expect(cells[i]! - cells[i - 1]!).toBe(step)
        } else if (/位上是几/.test(text)) {
          const n = Number(text.match(/\d+/)![0])
          const place = text.match(/的(千|百|十|个)位/)![1]!
          expect(v).toBe(Math.floor(n / { 千: 1000, 百: 100, 十: 10, 个: 1 }[place]!) % 10)
        } else if (/里面有几个/.test(text)) {
          const n = Number(text.match(/\d+/)![0])
          expect(v).toBe(Math.floor(n / (/百/.test(text) ? 100 : 1000)))
        } else if (/10 个十/.test(text)) expect(v).toBe(100)
        else if (/10 个一百/.test(text)) expect(v).toBe(1000)
        else if (/10 个一千/.test(text)) expect(v).toBe(10000)
        else throw new Error(text)
      })
    }
    each('m2s2-04-compare', 300, (q) => {
      const e = stemOf(q, 'expr')
      if (e) {
        const [x, y] = e.expr.split('⬜').map((s) => parseInt(s.trim(), 10)) as [number, number]
        expect(correctLabel(q)).toBe(x > y ? '>' : x < y ? '<' : '=')
      } else {
        const nums = q.choices!.map((c) => Number(zh(c.label)))
        const text = zh(stemOf(q, 'text')!.text)
        expect(correctNumber(q)).toBe(/最大/.test(text) ? Math.max(...nums) : Math.min(...nums))
      }
    })
    each('m2s2-04-round-addsub', 300, (q) => {
      const nums = stemOf(q, 'expr')!.expr.match(/\d+/g)!.map(Number)
      for (const n of nums) expect(n % 100).toBe(0)
    })
  })
})
