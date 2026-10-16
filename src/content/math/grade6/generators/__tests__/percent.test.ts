import { describe, expect, it } from 'vitest'
import type { BarRow, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { percentWords } from '@/engine/fraction'
import { CLASS40, HIT_TABLES, RAW100, SORTED100 } from '../percent'

// 六上「五 百分数」（E 写的七个知识点）：从题干的参数、表、图反推答案（自己的算法，不用生成器里的公式），
// 选项里没有第二个对的，第 1 档出得到课本的每一问，朗读避坑。

const zh = (l: LStr): string => translate(l, 'zh')
type Param = LStr | number
type Text = { k: string; p: Record<string, Param> }
const SEEDS = 150
/** 一个百分数（「16.7%」「−5%」） */
const PCT = /^−?\d+(\.\d+)?%$/

function each(kp: string, fn: (q: Question, d: 1 | 2 | 3) => void, seeds = SEEDS): void {
  const gen = getGenerator(kp)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.kpId.length + 1)
const fam = (q: Question): string => sigOf(q).replace(/-.*$/, '')
const texts = (q: Question): Text[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const text = (q: Question, key: string): Text => texts(q).find((t) => t.k === `m6.pct.${key}`)!
const num = (t: Text, k: string): number => Number(t.p[k])
const exprs = (q: Question): string[] => q.stem.filter((p): p is Extract<StemPart, { kind: 'expr' }> => p.kind === 'expr').map((p) => p.expr)
const table = (q: Question): (number | LStr | null)[][] => q.stem.find((p): p is Extract<StemPart, { kind: 'stat-table' }> => p.kind === 'stat-table')!.rows
const bars = (q: Question): Extract<StemPart, { kind: 'frac-bars' }> | undefined => q.stem.find((p): p is Extract<StemPart, { kind: 'frac-bars' }> => p.kind === 'frac-bars')
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const stemZh = (q: Question): string => texts(q).map((t) => zh({ k: t.k, p: t.p })).join('')

// ── 测试自己的算法：一律用整数 ──
const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b))
/** 小数文字 → [分子, 分母]（'0.125' → [125, 1000]，'−5' → [−5, 1]） */
function dec(s: string): [number, number] {
  const neg = /^[−-]/.test(s)
  const [i = '0', f = ''] = s.replace(/^[−-]/, '').split('.')
  const n = Number(i + f)
  return [neg ? -n : n, 10 ** f.length]
}
/** 百分数文字 → 百分之几的 [分子, 分母] */
const pctNum = (s: string): [number, number] => dec(s.replace(/%$/, ''))
/** 百分数文字的值（百分之几乘 100 的整数，'16.7%' → 1670） */
const hund = (s: string): number => {
  const [n, d] = pctNum(s)
  return (n * 100) / d
}
/** 答案（百分数文字）是不是 num/den：除得尽（百分号前两位以内）就要相等，否则是保留一位小数的近似值 */
function pctIs(ans: string, n: number, d: number): boolean {
  if (!/^−?\d+(\.\d+)?%$/.test(ans)) return false
  if ((n * 10000) % d === 0) return hund(ans) === (n * 10000) / d && !/\.\d*0%$/.test(ans)
  const neg = n * d < 0
  const t = Math.floor((Math.abs(n) * 2000 + Math.abs(d)) / (2 * Math.abs(d)))
  return /\.\d%$/.test(ans) && hund(ans) === (neg ? -t : t) * 10
}
/** 一组数文字的值互不相同（百分数按百分数、小数按小数比） */
function distinctValues(ls: string[]): boolean {
  const vals = ls.map((l) => (l.endsWith('%') ? `p${hund(l)}` : /^−?\d+(\.\d+)?$/.test(l) ? `d${dec(l)[0] / dec(l)[1]}` : l))
  return new Set(vals).size === vals.length
}
/** 中文读百分数（自己的写法，和引擎的 percentWords 对一下） */
const DIG = '零一二三四五六七八九'
function cnInt(n: number): string {
  if (n < 10) return DIG[n]!
  if (n < 20) return `十${n % 10 ? DIG[n % 10] : ''}`
  if (n < 100) return `${DIG[Math.floor(n / 10)]}十${n % 10 ? DIG[n % 10] : ''}`
  if (n < 1000) {
    const r = n % 100
    return `${DIG[Math.floor(n / 100)]}百${r === 0 ? '' : r < 10 ? `零${DIG[r]}` : r < 20 ? `一${cnInt(r)}` : cnInt(r)}`
  }
  const r = n % 1000
  return `${DIG[Math.floor(n / 1000)]}千${r === 0 ? '' : r < 100 ? `零${cnInt(r)}` : cnInt(r)}`
}
const cnPct = (x: string): string => {
  const [i, f] = x.split('.')
  return `百分之${cnInt(Number(i))}${f ? `点${[...f].map((c) => DIG[Number(c)]).join('')}` : ''}`
}

// ── 朗读避坑：题目文字里不该出现的写法 ──
const AVOID: [RegExp, string][] = [
  [/乐乐/, '人名乐乐（乐 lè / yuè）'],
  [/[（）()]/, '括号会读出来'],
  [/[①②③④⑤]/, '圆圈数字读不出来'],
  [/(?<![\d?？])%/, '单独一个 %'],
  [/第\s*\d/, '阿拉伯数字的序数'],
  [/\d\s*中/, '「5 投 3 中」的中'],
  [/投中|应到|应付|全长|都匀|磨粉|调水|空调|相差|返还|还款|不得|种植|测量/, '换掉的说法'],
  [/长/, '「长」只出现在增长 / 长度 / 长方体里'],
]
function checkAvoid(q: Question): void {
  const s = stemZh(q)
  for (const [re, why] of AVOID) {
    const hay = re.source === '长' ? s.replace(/增长|长度|长方体/g, '') : s
    expect(re.test(hay), `${q.id}「${s}」：${why}`).toBe(false)
  }
}

describe('百分数：读法和自己写的读法一致', () => {
  it('percentWords', () => {
    for (const x of ['45', '65.67', '120', '100', '197.45', '0.5', '0.85', '200', '18', '6567', '110', '105']) expect(percentWords(x, 'zh')).toBe(cnPct(x))
  })
  it('排序表就是原始表从多到少排好的', () => {
    expect([...RAW100].sort((a, b) => b - a)).toEqual(SORTED100)
    expect(CLASS40.length).toBe(40)
    expect(CLASS40.filter((v) => v >= 105).length).toBe(32)
  })
})

describe('百分数的意义', () => {
  const KP = 'm6s1-07-meaning'
  it('从题目反推答案', () => {
    each(KP, (q) => {
      checkAvoid(q)
      const f = fam(q)
      const ans = answer(q)
      if (f === 'read') {
        const x = sigOf(q).slice(5)
        const card = q.stem.find((p): p is Extract<StemPart, { kind: 'dec-card' }> => p.kind === 'dec-card')!
        expect(card.n, q.id).toBe(`${x}%`)
        expect(ans, q.id).toBe(cnPct(x))
        expect(labels(q).filter((l) => l === cnPct(x)).length, q.id).toBe(1)
        // 题干不读卡片上的数（读出来就是答案）
        expect(questionSpeech(q, 'zh').join(''), q.id).not.toContain('百分之')
      } else if (f === 'write') {
        const x = sigOf(q).slice(6)
        expect(zh({ k: 'm6.pct.mean.writeQ', p: text(q, 'mean.writeQ').p }), q.id).toBe(`${cnPct(x)}写作什么？`)
        expect(ans, q.id).toBe(`${x}%`)
        expect(distinctValues(labels(q).filter((l) => PCT.test(l))), q.id).toBe(true)
      } else if (f === 'hund') {
        // 例 1 的表里那名选手的两个数写在题目里（不画表）
        const [, t, i] = sigOf(q).split('-').map(Number) as [string | number, number, number]
        const [h, s] = HIT_TABLES[t]![i]!
        const t0 = text(q, 'mean.hundQ')
        expect([num(t0, 'h'), num(t0, 's')], q.id).toEqual([h, s])
        expect(q.stem.some((p) => p.kind === 'stat-table'), q.id).toBe(false)
        expect(Number(ans) * s, q.id).toBe(h * 100)
      } else if (f === 'best') {
        const rows = table(q).slice(1) as [LStr, number, number][]
        const rates = rows.map(([, h, s]) => h / s)
        const best = rates.indexOf(Math.max(...rates))
        expect(rates.filter((r) => r === rates[best]).length, q.id).toBe(1)
        expect(ans, q.id).toBe(`${best + 1}号`)
      } else if (f === 'topct') {
        const e = exprs(q)[0]!
        const n = Number(/^(\d+)\/100/.exec(e)![1])
        if (e.endsWith('?%')) expect(Number(ans), q.id).toBe(n)
        else expect(ans, q.id).toBe(`${n}%`)
      } else if (f === 'mean') {
        // 这里的 p% 表示 A 是什么的 p/100：答案是标准量 B，p 就是题里的百分数
        const p = num(texts(q)[0]!, 'p')
        const t1 = text(q, 'mean.baseQ')
        expect(num(t1, 'p'), q.id).toBe(p)
        const id = sigOf(q).slice(5)
        const pair: Record<string, [string, string]> = {
          attend: ['出勤的人数', '全班人数'],
          pass: ['合格产品数', '产品总数'],
          hit: ['投进的个数', '投篮次数'],
          phone: ['充进的电量', '电池容量'],
          plan: ['实际产量', '计划产量'],
          flour: ['面粉的质量', '小麦的质量'],
          pop: ['少年儿童', '全国人口'],
          food: ['9 月产量', '8 月产量'],
        }
        expect(zh(t1.p.a as LStr), q.id).toBe(pair[id]![0])
        expect(ans, q.id).toBe(pair[id]![1])
        expect(labels(q).length, q.id).toBe(3)
        expect(new Set(labels(q)).size, q.id).toBe(3)
      } else if (f === 'name') {
        expect(ans, q.id).toBe(sigOf(q) === 'name-alias' ? '百分率或百分比' : '百分号')
      } else if (f === 'over') {
        const p = num(texts(q)[0]!, 'p')
        expect(ans, q.id).toBe(p > 100 ? '对' : '不对')
      } else if (f === 'unit') expect(ans, q.id).toBe('不对')
      else if (f === 'rel' || f === 'def') expect(ans, q.id).toBe('对')
      else if (f === 'cmp') {
        const [x, y] = exprs(q)[0]!.split(' ○ ') as [string, string]
        const [a, b] = [hund(x), hund(y)]
        expect(ans, q.id).toBe(a === b ? '=' : a < b ? '<' : '>')
      } else if (f === 'rest') {
        const p = String(texts(q)[0]!.p.p)
        const [n, d] = pctNum(p)
        expect(pctIs(ans, 100 * d - n, 100 * d), q.id).toBe(true)
        expect(distinctValues(labels(q)), q.id).toBe(true)
      } else if (f === 'cannot') {
        expect(['发芽率', '出勤率', '合格率', '成活率'], q.id).toContain(ans)
        for (const l of labels(q).filter((x) => x !== ans)) expect(['增长率', '今年是去年的百分之几', '实际是计划的百分之几'], q.id).toContain(l)
      } else if (f === 'can') {
        const x = zh(texts(q)[0]!.p.x as LStr)
        expect(ans, q.id).toBe(['增长率', '今年是去年的百分之几', '实际是计划的百分之几'].includes(x) ? '对' : '不对')
      } else if (f === 'next') expect(ans, q.id).toBe('不对')
      else if (f === 'hundred') expect(Number(ans), q.id).toBe(num(texts(q)[0]!, 'p'))
      else if (f === 'fracrel') expect(ans.startsWith('乙数是甲数的'), q.id).toBe(true)
      else if (f === 'times') expect(Number(ans), q.id).toBe(Math.round(197.45 / 100))
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('求百分率', () => {
  const KP = 'm6s1-07-rate'
  it('从题目反推答案', () => {
    each(KP, (q) => {
      checkAvoid(q)
      const f = fam(q)
      const ans = answer(q)
      const t0 = texts(q)[0]!
      if (q.input === 'choice' && PCT.test(ans)) expect(distinctValues(labels(q).filter((l) => PCT.test(l))), q.id).toBe(true)
      if (f === 'hit') expect(pctIs(ans, num(t0, 'h'), num(t0, 'n')), q.id).toBe(true)
      else if (f === 'two') {
        const [n1, h1, n2, h2] = ['n1', 'h1', 'n2', 'h2'].map((k) => num(t0, k)) as [number, number, number, number]
        expect(ans, q.id).toBe(h1 * n2 === h2 * n1 ? '一样高' : h1 * n2 > h2 * n1 ? '第一节' : '第二节')
      } else if (f === 'formula') {
        expect(ans, q.id).toMatch(/^.+ ÷ .+ × 100%$/)
        const [a, b] = ans.replace(' × 100%', '').split(' ÷ ') as [string, string]
        const pairs: Record<string, [string, string]> = {
          命中率: ['命中数', '出手数'],
          出勤率: ['出勤人数', '总人数'],
          合格率: ['合格数', '产品总数'],
          出粉率: ['面粉质量', '小麦质量'],
          成活率: ['成活棵数', '总棵数'],
          发芽率: ['发芽数', '种子数'],
        }
        expect([a, b], q.id).toEqual(pairs[zh(t0.p.r as LStr)])
      } else if (f === 'decpct') {
        const [n, d] = dec(String(t0.p.x))
        expect(pctIs(ans, n, d), q.id).toBe(true)
      } else if (f === 'fracpct') {
        const [n, d] = String(t0.p.x).split('/').map(Number) as [number, number]
        expect(pctIs(ans, n, d), q.id).toBe(true)
        expect(texts(q).some((t) => t.k === 'm6.pct.keep1'), q.id).toBe((n * 10000) % d !== 0)
      } else if (f === 'life') expect(pctIs(ans, num(t0, 'h'), num(t0, 'n')), q.id).toBe(true)
      else if (f === 'calc') {
        const [h, n] = exprs(q)[0]!.replace(' = ?%', '').split(' ÷ ').map(Number) as [number, number]
        expect(Number(ans) * n, q.id).toBe(h * 100)
      } else if (f === 'germmax' || f === 'germ') {
        const rows = table(q)
        const seeds = rows[1]!.slice(1) as number[]
        const sprouts = rows[2]!.slice(1) as number[]
        expect(rows[3]![1], q.id).toBe(`${(sprouts[0]! * 100) / seeds[0]!}%`)
        if (f === 'germmax') {
          const rates = seeds.map((s, i) => sprouts[i]! / s)
          const best = rates.indexOf(Math.max(...rates))
          expect(rates.filter((r) => r === rates[best]).length, q.id).toBe(1)
          expect(ans, q.id).toBe(`第${'一二三四'[best]}次`)
        } else {
          const k = rows[3]!.indexOf(null) - 1
          expect(zh(texts(q).find((t) => t.k === 'm6.pct.rate.germQ')!.p.nth as LStr), q.id).toBe(`第${'一二三四'[k]}次`)
          expect(pctIs(ans, sprouts[k]!, seeds[k]!), q.id).toBe(true)
        }
      } else if (f === 'body') expect(ans, q.id).toBe(sigOf(q) === 'body-food' ? '48%' : '52%')
      else if (f === 'club') {
        const chart = q.stem.find((p): p is Extract<StemPart, { kind: 'bar-chart' }> => p.kind === 'bar-chart')!
        const values = chart.series[0]!.values as number[]
        const name = zh(texts(q).find((t) => t.k === 'm6.pct.rate.clubQ')!.p.c as LStr)
        const i = chart.cats.map(zh).indexOf(name)
        expect(values, q.id).toEqual([7, 8, 12, 6, 9])
        expect(pctIs(ans, values[i]!, values.reduce((a, b) => a + b, 0)), q.id).toBe(true)
      } else if (f === 'barley') {
        const rows = table(q).slice(1) as [LStr, number, number][]
        const bad = rows.findIndex(([, n, h]) => h * 100 < 85 * n)
        expect(rows.filter(([, n, h]) => h * 100 < 85 * n).length, q.id).toBeLessThanOrEqual(1)
        expect(ans, q.id).toBe(bad < 0 ? '三批都能销售' : `第${'一二三'[bad]}批`)
      } else if (f === 'lottery') expect(pctIs(ans, num(t0, 'n'), 10000), q.id).toBe(true)
      else if (f === 'cmp') {
        const [x, y] = exprs(q)[0]!.split(' ○ ') as [string, string]
        const v = (s: string): [number, number] => (s.endsWith('%') ? [pctNum(s)[0], pctNum(s)[1] * 100] : s.includes('/') ? (s.split('/').map(Number) as [number, number]) : dec(s))
        const [a, b] = [v(x), v(y)]
        const c = a[0] * b[1] - b[0] * a[1]
        expect(ans, q.id).toBe(c === 0 ? '=' : c < 0 ? '<' : '>')
      } else if (f === 'keep3') expect(ans, q.id).toBe('三位')
      else if (f === 'breakfast') {
        expect(table(q)[1], q.id).toEqual([{ k: 'm6.pct.rate.t.daily' }, 437, '95%'])
        expect(ans, q.id).toBe('5%')
      } else if (f === 'ice') expect(pctIs(ans, 224, 58), q.id).toBe(true)
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('求一个数的百分之几是多少', () => {
  const KP = 'm6s1-07-part'
  it('从题目反推答案', () => {
    each(KP, (q) => {
      checkAvoid(q)
      const f = fam(q)
      const ans = answer(q)
      const t0 = texts(q)[0]!
      if (f === 'shot' || f === 'jump' || f === 'choir') expect(Number(ans) * 100, q.id).toBe(num(t0, 'n') * num(t0, 'p'))
      else if (f === 'oil') expect(Number(ans) * 100, q.id).toBe(num(t0, 'n') * num(t0, 'p'))
      else if (f === 'notchoir') expect((num(t0, 'n') - Number(ans)) * 100, q.id).toBe(num(t0, 'n') * num(t0, 'p'))
      else if (f === 'method') {
        const [n, p] = String(t0.p.e).replace('%', '').split(' × ').map(Number) as [number, number]
        const [, k] = ans.split(' × ') as [string, string]
        const [a, b] = k.includes('/') ? (k.split('/').map(Number) as [number, number]) : dec(k)
        expect(ans.startsWith(`${n} × `), q.id).toBe(true)
        expect(a * 100, q.id).toBe(p * b)
        // 选项里没有第二个对的：除了答案，别的都不是「n × p/100」
        for (const l of labels(q).filter((x) => x !== ans)) {
          const m = /^(\d+) × (\S+)$/.exec(l)
          if (!m) continue
          const [c, e] = m[2]!.includes('/') ? (m[2]!.split('/').map(Number) as [number, number]) : dec(m[2]!)
          expect(c * 100 === p * e, `${q.id} 选项 ${l} 也对`).toBe(false)
        }
      } else if (f === 'pctdec') {
        const [n, d] = pctNum(String(t0.p.x))
        const [a, b] = dec(ans)
        expect(a * d * 100, q.id).toBe(n * b)
        expect(distinctValues(labels(q)), q.id).toBe(true)
      } else if (f === 'pctfrac') {
        const [n, d] = pctNum(String(t0.p.x))
        const [a, b] = ans.includes('/') ? (ans.split('/').map(Number) as [number, number]) : [Number(ans), 1]
        expect(g(a, b), q.id).toBe(1)
        expect(a * d * 100, q.id).toBe(n * b)
        // 考写法的题：等值的选项最多一个（没约分的），别的值都不一样
        const vals = labels(q).map((l) => (l.includes('/') ? (l.split('/').map(Number) as [number, number]) : ([Number(l), 1] as [number, number])))
        expect(vals.filter(([x, y]) => x * b === a * y).length, q.id).toBeLessThanOrEqual(2)
        for (const [, y] of vals) expect(y <= 9999, `${q.id} 分母太大`).toBe(true)
      } else if (f === 'how') expect(ans, q.id).toBe(sigOf(q) === 'how-op' ? '乘法' : '一样')
      else if (f === 'school' || f === 'schooldiff') {
        const [a1, p1, a2, p2] = ['a1', 'p1', 'a2', 'p2'].map((k) => num(t0, k)) as [number, number, number, number]
        const b1 = a1 * p1
        const b2 = a2 * p2
        if (f === 'school') expect(ans, q.id).toBe(b1 === b2 ? '一样多' : b1 > b2 ? '甲校' : '乙校')
        else {
          expect(Number(ans) * 100, q.id).toBe(Math.abs(b1 - b2))
          expect(zh(texts(q)[1]!.p.m as LStr), q.id).toBe(b1 > b2 ? '甲校' : '乙校')
        }
      } else if (f === 'carb') {
        const rows = table(q)
        const t = texts(q).find((x) => x.k === 'm6.pct.part.carbQ')!
        const food = zh(t.p.f as LStr)
        const i = rows[0]!.map((c) => (c === null || typeof c === 'number' ? '' : zh(c))).indexOf(food)
        const [n, d] = pctNum(String(rows[1]![i]))
        const [a, b] = dec(ans)
        expect(a * d * 100, q.id).toBe(n * num(t, 'g') * b)
        if (q.input === 'choice') expect(distinctValues(labels(q)), q.id).toBe(true)
      } else if (f === 'photo') expect(Number(ans), q.id).toBe((125 * 16 * 140) / 10000)
      else if (f === 'cash') expect(Number(ans), q.id).toBe(((10000 * 6) / 1000) * 50)
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('求增长率', () => {
  const KP = 'm6s1-07-growth'
  it('从题目反推答案', () => {
    each(KP, (q) => {
      checkAvoid(q)
      const f = fam(q)
      const ans = answer(q)
      const t0 = texts(q)[0]!
      if (q.input === 'choice' && PCT.test(ans)) expect(distinctValues(labels(q).filter((l) => PCT.test(l))), q.id).toBe(true)
      const fb = bars(q)
      if (fb) {
        // 线段图：两行，第一行是原来、第二行是现在；红线标出原来的长度；多出来 / 少掉的那段括号上写差
        expect(fb.rows.length, q.id).toBe(2)
        expect(fb.guides, q.id).toEqual([fb.unit])
        const [r0, r1] = fb.rows as [BarRow, BarRow]
        expect(r0.len, q.id).toBe(fb.unit)
        const a = Number(r0.braces![0]!.label)
        const b = Number(r1.braces!.find((x) => x.side === 'bottom')!.label)
        expect(a * r1.len, `${q.id} 线段的长短按比例`).toBeCloseTo(b * r0.len)
        const top = r1.braces!.find((x) => x.side === 'top')!
        expect(Number(top.label), q.id).toBeCloseTo(Math.abs(b - a))
        if (b < a) expect(r1.dash, q.id).toEqual([r1.len, r0.len])
      }
      if (f === 'car') expect(pctIs(ans, num(t0, 'b') - num(t0, 'a'), num(t0, 'a')), q.id).toBe(true)
      else if (f === 'which') {
        const rows = table(q).slice(1) as [LStr, number, number][]
        const [[, a1, b1], [, a2, b2]] = rows as [[LStr, number, number], [LStr, number, number]]
        const c = (b1 - a1) * a2 - (b2 - a2) * a1
        expect(ans, q.id).toBe(c === 0 ? '一样大' : c > 0 ? '燃油汽车' : '新能源汽车')
      } else if (f === 'meaning') expect(ans, q.id).toBe('增加量占原来的量')
      else if (f === 'm2') {
        const [b, a] = exprs(q)[0]!.split(/ [=≈] /)[0]!.split(' ÷ ').map(Number) as [number, number]
        expect([num(t0, 'a'), num(t0, 'b')], q.id).toEqual([a, b])
        expect(pctIs(exprs(q)[0]!.split(/ [=≈] /)[1]!, b, a), q.id).toBe(true)
        expect(pctIs(ans, b - a, a), q.id).toBe(true)
      } else if (f === 'forest') expect(pctIs(ans, num(t0, 'x'), num(t0, 'a')), q.id).toBe(true)
      else if (f === 'desert') {
        const [a, ad] = dec(String(t0.p.a))
        const [b, bd] = dec(String(t0.p.b))
        expect(pctIs(ans, a * bd - b * ad, a * bd), q.id).toBe(true)
      } else if (f === 'save' || f === 'drop') expect(pctIs(ans, num(t0, 'a') - num(t0, 'b'), num(t0, 'a')), q.id).toBe(true)
      else if (f === 'formula') expect(ans, q.id).toBe(`(${num(t0, 'b')} − ${num(t0, 'a')}) ÷ ${num(t0, 'a')}`)
      else if (f === 'same2') expect(ans, q.id).toBe('不对')
      else if (f === 'over100') expect(ans, q.id).toBe('对')
      else if (f === 'calc') {
        const m = /^\((\d+) − (\d+)\) ÷ (\d+) = \?%$/.exec(exprs(q)[0]!)!
        expect(Number(ans) * Number(m[3]), q.id).toBe((Number(m[1]) - Number(m[2])) * 100)
      } else if (f === 'road') expect(pctIs(ans, num(t0, 'b') - num(t0, 'a'), num(t0, 'a')), q.id).toBe(true)
      else if (f === 'block') {
        const [l, w, h] = ['l', 'w', 'h'].map((k) => num(t0, k)) as [number, number, number]
        const e = Math.min(l, w, h)
        expect(pctIs(ans, l * w * h - e ** 3, l * w * h), q.id).toBe(true)
      } else if (f === 'toby') expect(hund(ans), q.id).toBe((num(t0, 'q') - 100) * 100)
      else if (f === 'byto') expect(hund(ans), q.id).toBe((num(t0, 'g') + 100) * 100)
      else if (f === 'mall') {
        const [a, ad] = dec(String(t0.p.a))
        const [b, bd] = dec(String(t0.p.b))
        expect(pctIs(ans, b * ad - a * bd, a * bd), q.id).toBe(true)
      } else if (f === 'ice') expect(pctIs(ans, 212 - 162, 162), q.id).toBe(true)
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('已知增加后的数求原来的数', () => {
  const KP = 'm6s1-07-base'
  it('从题目反推答案', () => {
    each(KP, (q) => {
      checkAvoid(q)
      const f = fam(q)
      const ans = answer(q)
      const t0 = texts(q)[0]!
      if (f === 'profit' || f === 'gdp') {
        // 原来的量 × (1 + r%) = 现在的量
        expect(Number(ans) * (100 + num(t0, 'r')), q.id).toBe(num(t0, 'now') * 100)
        const fb = bars(q)
        if (f === 'profit') {
          expect(num(t0, 'y2'), q.id).toBe(num(t0, 'y1') + 1)
          const [r0, r1] = fb!.rows as [BarRow, BarRow]
          expect(r1.len * 100, q.id).toBeCloseTo(r0.len * (100 + num(t0, 'r')))
          expect(r1.braces!.find((x) => x.side === 'top')!.label, q.id).toBe(`${num(t0, 'r')}%`)
          expect(r1.braces!.find((x) => x.side === 'bottom')!.label, q.id).toBe(String(num(t0, 'now')))
        }
      } else if (f === 'books' || f === 'cars') expect(Number(ans) * 100, q.id).toBe(num(t0, 'a') * (100 + num(t0, 'r')))
      else if (f === 'eggs') expect(Number(ans) * 100, q.id).toBe(num(t0, 'n') * (100 - num(t0, 'p')))
      else if (f === 'formula') expect(ans, q.id).toBe(`${num(t0, 'now')} ÷ (1 + ${num(t0, 'r')}%)`)
      else if (f === 'unit1') expect(ans, q.id).toBe(`${num(t0, 'y1')}年`)
      else if (f === 'check') expect(Number(ans) * 100, q.id).toBe(num(t0, 'a') * (100 + num(t0, 'r')))
      else if (f === 'ratio') expect(ans, q.id).toBe(`${100 + num(t0, 'r')}%`)
      else if (f === 'rice') {
        // 24.06 ÷ 1.07 = 22.48…，保留一位小数
        expect(ans, q.id).toBe((Math.round((2406 * 10) / 107) / 10).toFixed(1))
        expect(distinctValues(labels(q)), q.id).toBe(true)
      } else if (f === 'tv') {
        expect(ans, q.id).toBe((Math.round((207 * 1000) / 1046) / 100).toFixed(2))
        expect(distinctValues(labels(q)), q.id).toBe(true)
      } else if (f === 'oilback') expect(Number(ans) * num(t0, 'p'), q.id).toBe(num(t0, 'n') * 100)
      else if (f === 'bf') expect(Number(ans), q.id).toBe(sigOf(q) === 'bf-total' ? (437 * 100) / 95 : (437 * 100) / 95 - 437)
      else if (f === 'shirt') expect(Number(ans) * (100 - num(t0, 'r')), q.id).toBe(num(t0, 'now') * 100)
      else if (f === 'letter') expect(ans, q.id).toBe(`a × (1 + ${num(t0, 'r')}%) = ${num(t0, 'now')}`)
      else if (f === 'tong') expect(ans, q.id).toBe('和上一年同期相比')
      else if (f === 'twoyears') expect(Number(ans) * (100 + num(t0, 'r1')) * (100 + num(t0, 'r2')), q.id).toBe(num(t0, 'now') * 10000)
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('价格的连续变化', () => {
  const KP = 'm6s1-07-chain'
  /** 一次变化后是原来的百分之几：从词条反推（涨价 p%、降价 p%、打几折） */
  function factorOf(step: LStr): number {
    const s = zh(step)
    const ZHE: Record<string, number> = { 八折: 80, 九折: 90, 七五折: 75 }
    if (s.startsWith('打')) return ZHE[s.slice(1)]!
    const p = Number(/(\d+)%/.exec(s)![1])
    return s.startsWith('涨价') ? 100 + p : 100 - p
  }
  /** 题目里的两次变化：课本例 5、做一做是写死的句子 */
  function factors(q: Question): number[] {
    const t = texts(q)[0]!
    if (t.k === 'm6.pct.chain.book') return [80, 120]
    if (t.k === 'm6.pct.chain.product') return [120, 80]
    return ['s1', 's2', 's3'].filter((k) => t.p[k] !== undefined).map((k) => factorOf(t.p[k] as LStr))
  }
  const product = (fs: number[]): [number, number] => [fs.reduce((a, b) => a * b, 1), 100 ** fs.length]
  it('从题目反推答案', () => {
    each(KP, (q) => {
      checkAvoid(q)
      const f = fam(q)
      const ans = answer(q)
      const t0 = texts(q)[0]!
      if (f === 'dir' || f === 'both' || f === 'three') {
        const [n, d] = product(factors(q))
        const c = n - d
        if (f === 'dir') expect(ans, q.id).toBe(c === 0 ? '和原来一样' : c < 0 ? '便宜了' : '贵了')
        else {
          expect(c, q.id).not.toBe(0)
          const p = ans.replace(/^(便宜了|贵了) /, '')
          expect(ans.startsWith(c < 0 ? '便宜了' : '贵了'), q.id).toBe(true)
          expect(pctIs(p, Math.abs(c), d), q.id).toBe(true)
        }
      } else if (f === 'first') expect(Number(ans), q.id).toBe(factorOf(t0.p.s1 as LStr))
      else if (f === 'assume') {
        const [n, d] = product(factors(q))
        expect(Number(ans) * d, q.id).toBe(100 * n)
      } else if (f === 'judge') expect(ans, q.id).toBe('不对')
      else if (f === 'egg') {
        const c = (100 + num(t0, 'a')) * (100 - num(t0, 'b')) - 10000
        expect(c, q.id).not.toBe(0)
        expect(ans.startsWith(c < 0 ? '跌了' : '涨了'), q.id).toBe(true)
        expect(pctIs(ans.slice(3), Math.abs(c), 10000), q.id).toBe(true)
      } else if (f === 'veg') {
        const p = num(t0, 'p')
        expect(pctIs(ans, 10000 - (100 - p) ** 2, 10000), q.id).toBe(true)
      } else if (f === 'pc') expect(Number(ans) * 10000, q.id).toBe(num(t0, 'a') * (100 - num(t0, 'p1')) * (100 - num(t0, 'p2')))
      else if (f === 'rope') expect(pctIs(ans, (100 - num(t0, 'p')) ** 2, 10000), q.id).toBe(true)
      else if (f === 'phone') expect(pctIs(ans, 10000 - 92 * 95, 10000), q.id).toBe(true)
      else if (f === 'mall' || f === 'malldiff') {
        const a = num(t0, 'a')
        const jia = (a - 80) * 0.8
        const yi = a * 0.8 - 80
        if (f === 'mall') expect(ans, q.id).toBe(jia === yi ? '一样便宜' : jia < yi ? '甲商场' : '乙商场')
        else expect(Number(ans), q.id).toBeCloseTo(Math.abs(jia - yi))
      } else if (f === 'income') {
        // 今年 = 前年 × 110%；去年 = 今年 ÷ 94%
        if (sigOf(q) === 'income-this') expect(ans, q.id).toBe('110%')
        else expect(pctIs(ans, 110 * 100 - 94 * 100, 94 * 100), q.id).toBe(true)
      } else if (f === 'base100') {
        const [n, d] = product(factors(q))
        expect(Number(ans) * d, q.id).toBe(100 * n)
      } else if (f === 'letter') expect(ans, q.id).toBe('0.96a 元')
      else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('确定达标线', () => {
  const KP = 'm6s1-07-standard'
  /** 表里的跳绳次数（名次表：次数在名次那一行下面） */
  function counts(q: Question): { ranks: number[]; values: number[] } {
    const rows = table(q)
    const ranks: number[] = []
    const values: number[] = []
    for (let i = 0; i < rows.length; i += 2) {
      ranks.push(...(rows[i]!.slice(1) as number[]))
      values.push(...(rows[i + 1]!.slice(1) as number[]))
    }
    return { ranks, values }
  }
  it('从题目反推答案', () => {
    each(KP, (q) => {
      checkAvoid(q)
      const f = fam(q)
      const ans = answer(q)
      const ts = texts(q)
      const last = ts[ts.length - 1]!
      if (f === 'need') expect(Number(ans) * 100, q.id).toBe(num(ts[0]!, 'n') * num(ts[0]!, 'p'))
      else if (f === 'line' || f === 'count' || f === 'tie' || f === 'must') {
        const { ranks, values } = counts(q)
        // 截段和课本的排序表一致
        ranks.forEach((r, i) => expect(values[i], q.id).toBe(SORTED100[r - 1]))
        // 截 6 个名次（对战的窄栏放得下）
        expect(ranks.length, q.id).toBe(6)
        if (f === 'line') {
          // 希望 p% 达标：100 × p% = p 名，名次是 p 的同学的次数
          const k = num(last, 'p')
          expect(ranks, q.id).toContain(k)
          expect(Number(ans), q.id).toBe(values[ranks.indexOf(k)])
        } else {
          const t = f === 'count' ? num(last, 't') : SORTED100[num(last, 'k') - 1]!
          const pass = SORTED100.filter((v) => v >= t).length
          // 达标人数从截段里看得出来：最后一个达标的和第一个不达标的都在表里
          expect(ranks, q.id).toContain(pass)
          expect(ranks, q.id).toContain(pass + 1)
          if (f === 'count') expect(Number(ans), q.id).toBe(pass)
          else if (f === 'tie') expect(ans, q.id).toBe(`${pass}%`)
          else expect(ans, q.id).toBe(pass === num(last, 'p') ? '对' : '不对')
        }
      } else if (f === 'gcount' || f === 'grate' || f === 'gmax') {
        const { ranks, values } = counts(q)
        expect(ranks, q.id).toEqual(values.map((_, i) => i + 1))
        for (let i = 1; i < values.length; i++) expect(values[i]! <= values[i - 1]!, q.id).toBe(true)
        // 「某小组 n 名同学」在表题里；一行 8 个名次（对战的窄栏放得下）
        const tb = q.stem.find((p): p is Extract<StemPart, { kind: 'stat-table' }> => p.kind === 'stat-table')!
        expect(values.length, q.id).toBe(Number((tb.title as { p: Record<string, number> }).p.n))
        for (const r of tb.rows) expect(r.length, q.id).toBeLessThanOrEqual(9)
        if (f === 'gmax') {
          const m = (values.length * num(last, 'p')) / 100
          const t = Number(ans)
          // 最高的达标线：达到或超过它的不少于 m 人，再高 1 次就不够了
          expect(values.filter((v) => v >= t).length >= m, q.id).toBe(true)
          expect(values.filter((v) => v >= t + 1).length < m, q.id).toBe(true)
        } else {
          const t = num(last, 't')
          const pass = values.filter((v) => v >= t).length
          if (f === 'gcount') expect(Number(ans), q.id).toBe(pass)
          else {
            expect(pctIs(ans, pass, values.length), q.id).toBe(true)
            expect(distinctValues(labels(q)), q.id).toBe(true)
          }
        }
      } else if (f === 'classrate') expect(pctIs(ans, num(ts[0]!, 'h'), num(ts[0]!, 'n')), q.id).toBe(true)
      else if (f === 'sort') expect(ans, q.id).toBe('按从多到少的顺序排列')
      else if (f === 'most') expect(ans, q.id).toBe('对')
      else if (f === 'bestonly') expect(ans, q.id).toBe('不对')
      else if (f === 'c40') {
        const sig = sigOf(q)
        if (sig === 'c40-count85') {
          // 只要 40 × 85%，不画表
          expect(q.stem.some((p) => p.kind === 'stat-table'), q.id).toBe(false)
          expect(stemZh(q), q.id).toContain('40 名学生')
          expect(stemZh(q), q.id).toContain('85%')
          expect(Number(ans) * 100, q.id).toBe(40 * 85)
          return
        }
        // 表只排 40 个数（不排序号）：4 行，每行 10 个
        const rows = table(q)
        expect(rows.map((r) => r.length), q.id).toEqual([10, 10, 10, 10])
        const values = rows.flat() as number[]
        expect(values, q.id).toEqual(CLASS40)
        if (sig === 'c40-rate') expect(pctIs(ans, values.filter((v) => v >= 105).length, 40), q.id).toBe(true)
        else {
          const t = Number(ans.replace(' 次', ''))
          expect(values.filter((v) => v >= t).length, q.id).toBe(34)
          for (const l of labels(q).filter((x) => x !== ans)) expect(values.filter((v) => v >= Number(l.replace(' 次', ''))).length, `${q.id} ${l} 也对`).not.toBe(34)
        }
      } else if (f === 'gender') expect(ans, q.id).toBe('男女生分开统计')
      else if (f === 'groups') {
        const [n1, h1, n2, h2] = ['n1', 'h1', 'n2', 'h2'].map((k) => num(ts[0]!, k)) as [number, number, number, number]
        const c = h1 * n2 - h2 * n1
        expect(ans, q.id).toBe(c === 0 ? '一样高' : c > 0 ? '甲组' : '乙组')
      } else throw new Error(`没核对的题：${q.id}`)
    })
  })
})

describe('第 1 档出得到课本的每一问', () => {
  const firstTier = (kp: string): Set<string> => {
    const out = new Set<string>()
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 1500; seed++) out.add(sigOf(gen(1, createRng(seed))))
    return out
  }
  const must: Record<string, (string | RegExp)[]> = {
    // 例 1 的表（9/20 化成 45/100、选 1 号）、p80 说一说和做一做、读法写法、百分号、整理和复习的两句
    'm6s1-07-meaning': ['hund-0-0', 'hund-0-1', 'hund-0-2', 'best-0', 'mean-attend', 'mean-pass', 'mean-phone', 'mean-plan', 'mean-flour', /^read-/, /^write-/, /^topct/, 'name-alias', 'name-sign', /^over-/, /^unit-/, 'rel', 'def'],
    // 例 2（5 投 3 中、6 投 4 中、哪节高）、四个公式、做一做的发芽率表、p83 做一做 1（0.08、0.125、2/3、1/6）和 2（152/160）、练习十四 3
    'm6s1-07-rate': ['hit-5-3', 'hit-6-4', 'two-5-3-6-4', 'formula-attend', 'formula-pass', 'formula-flour', 'formula-survive', 'germ-0-1', 'germ-0-2', 'germ-0-3', 'germmax-0', 'decpct-0.08', 'decpct-0.125', 'fracpct-2/3', 'fracpct-1/6', 'life-fit-160-152', 'calc-3-5', 'body-food'],
    // 例 3（20 × 25%，两种算法）、p83 做一做 1（37.5%、0.85%）、3（40 × 95%）、练习十四 2、4、练习十八 1(1)
    'm6s1-07-part': ['shot-20-25', 'method-20-25-d', 'method-20-25-f', 'pctdec-37.5', 'pctfrac-37.5', 'pctdec-32', 'pctfrac-32', 'jump-40-95', 'choir-480-10', 'oil-42-2100', 'how-op', 'how-same'],
    // 应用例 3（燃油车 12 → 14、新能源车 8 → 10、哪种大、方法二）、做一做 1（16 公顷多 4 公顷）、2（1.8 → 1.2 万平方千米）
    'm6s1-07-growth': ['car-12-14', 'car-8-10', 'which-0', 'm2-12-14', 'm2-8-10', 'meaning', 'forest-16-4', 'desert-18-12', 'same2', 'over100'],
    // 应用例 4（3000 ÷ (1 + 20%)、验算）、做一做 1（1.4 万册增加 12%）、2（1200 ÷ (1 + 25%)）、练习十六 2、3
    'm6s1-07-base': [/^profit-3000-20-/, 'gdp-1200-25', 'books-14000-12', 'cars-5000-10', 'eggs-2400-5', 'check-2500-20', /^formula-/, /^unit1-/],
    // 应用例 5（打八折再涨 20%）、做一做（加价 20% 再降价 20%）、假设原价 100 元、练习十七 1、2、3、5
    'm6s1-07-chain': ['dir-0', 'dir-1', 'both-0', 'both-1', 'assume-0', 'first-z80', /^judge-/, 'egg-10-15', 'veg-5', 'pc-3600-10-10', 'rope-40'],
    // 达标线：60% → 名次 60 的 120 次、75% → 109 次，达标人数，实践应用 (1)、整理数据、为什么让大多数人达标
    'm6s1-07-standard': ['line-60', 'line-75', /^count-/, /^need-100-60$/, 'classrate-40-32', 'sort', 'most', /^gcount-/, /^grate-/, /^gmax-/],
  }
  for (const [kp, list] of Object.entries(must)) {
    it(kp, () => {
      const got = firstTier(kp)
      for (const m of list) {
        const ok = typeof m === 'string' ? got.has(m) : [...got].some((s) => m.test(s))
        expect(ok, `${kp} 第 1 档出不到 ${m}`).toBe(true)
      }
    })
  }
})
