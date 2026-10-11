import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { AIR, BIRTH, GDP, HEIGHT, KIDS, POP, RAIL, ROBOT, SCENES, TEMP, WATER, type LineSet } from '../linechart'

// 五下「折线统计图」：从图上的数反推答案（150 种子 × 三档）；图的数据和课本一致、点都落在纵轴的范围里；
// 不出要估读的题（问到具体的数时点上标了数）；「最多 / 最少 / 增加的最多」只出唯一的；画错的点只有一个、错一格以上。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Param = LStr | number
type Chart = Extract<StemPart, { kind: 'line-chart' }>

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const textOf = (q: Question): { k: string; p: Record<string, Param> } => {
  const t = q.stem.find((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text')!
  return typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }
}
const chartOf = (q: Question): Chart | undefined => q.stem.find((p): p is Chart => p.kind === 'line-chart')
const answerText = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const keyOf = (p: Param | undefined): string => (p as { k: string }).k
/** 问句参数里的年份 / 月份 / 年龄（词条 m5.line.c.* 的 y） */
const catOf = (p: Param | undefined): number => Number((p as unknown as { p: { y: number } }).p.y)
/** 选项「2019 年」「7 月」「3 岁」里的数 */
const firstNum = (s: string): number => Number(/\d+/.exec(s)![0])
const ALL: LineSet[] = [RAIL, ROBOT, GDP, HEIGHT, WATER, POP, AIR, BIRTH, TEMP, KIDS]
/** 图对应课本的哪一组数据（按图题的词条） */
const setOf = (c: Chart): LineSet => ALL.find((s) => keyOf(c.title) === `m5.line.t.${s.id}`)!
/** 图上某条线（按 th 词条 m5.line.th.<id>）的数，和类别一一对应 */
function seriesOf(c: Chart, q: Question, thKey: string): number[] {
  const s = setOf(c)
  const j = s.series.findIndex((x) => `m5.line.th.${x.id}` === thKey)
  expect(j, `${q.id} 找不到 ${thKey}`).toBeGreaterThanOrEqual(0)
  return c.series[j]!.values as number[]
}

describe('折线统计图：图的数据', () => {
  for (const kp of ['m5s2-09-single', 'm5s2-09-double']) {
    it(`${kp}：数据和课本一致（截一段的也是连着的几年）、点都在纵轴的范围里、类别不超过 13 个`, () => {
      each(kp, (q) => {
        const c = chartOf(q)
        if (!c) return
        const s = setOf(c)
        expect(s, q.id).toBeDefined()
        const cats = c.cats.map((x) => Number(zh(x)))
        const at = s.cats.indexOf(cats[0]!)
        expect(cats, q.id).toEqual(s.cats.slice(at, at + cats.length))
        expect(cats.length, q.id).toBeLessThanOrEqual(13)
        const top = c.from === undefined ? c.step * c.cells : c.from + (c.cells - 1) * c.step
        const bottom = c.from ?? 0
        c.series.forEach((x, j) => {
          const book = s.series[j]!.values.slice(at, at + cats.length)
          if (kindOf(q) !== 'wrong') expect(x.values, q.id).toEqual(book)
          for (const v of x.values) expect(v !== null && v >= bottom && v <= top, `${q.id} 点 ${v} 出了纵轴的范围`).toBe(true)
        })
        // 复式图两条线、有图例；单式图一条
        expect(c.series.length, q.id).toBe(kp === 'm5s2-09-double' ? 2 : 1)
        if (c.series.length > 1) for (const x of c.series) expect(x.name, q.id).toBeDefined()
        // 图题里的起止年份和图上的一致（月份、年龄的图题照课本）
        const p = (c.title as { p?: Record<string, number> }).p
        if (s.kind !== 'month') expect([p!.a, p!.b], q.id).toEqual([cats[0], cats[cats.length - 1]])
      })
    })
  }
})

describe('折线统计图：从图反推答案', () => {
  it('单式折线统计图', () => {
    each('m5s2-09-single', (q) => {
      const kind = kindOf(q)
      const t = textOf(q)
      const c = chartOf(q)
      const ans = answerText(q)
      const cats = c ? c.cats.map((x) => Number(zh(x))) : []
      if (kind === 'read') {
        expect(c!.numbers, `${q.id} 读数的题点上要标数`).toBe(true)
        const v = seriesOf(c!, q, keyOf(t.p.th))
        expect(Number(ans), q.id).toBe(v[cats.indexOf(catOf(t.p.c))])
      } else if (kind === 'ext') {
        const v = seriesOf(c!, q, keyOf(t.p.th))
        const most = ['m5.line.w.most', 'm5.line.w.high'].includes(keyOf(t.p.w))
        const target = most ? Math.max(...v) : Math.min(...v)
        expect(v.filter((x) => x === target), `${q.id} 最值不唯一`).toHaveLength(1)
        expect(firstNum(ans), q.id).toBe(cats[v.indexOf(target)])
      } else if (kind === 'updown') {
        const v = seriesOf(c!, q, keyOf(t.p.th))
        const [a, b] = [cats.indexOf(catOf(t.p.a)), cats.indexOf(catOf(t.p.b))]
        expect(b, q.id).toBe(a + 1)
        expect(ans, q.id).toBe(v[b]! > v[a]! ? '增加了' : '减少了')
      } else if (kind === 'scale') {
        expect(Number(ans), q.id).toBe(c!.step)
      } else if (kind === 'trend') {
        const v = seriesOf(c!, q, keyOf(t.p.th))
        const steps = v.slice(1).map((x, i) => x - v[i]!)
        const want = steps.every((x) => x > 0) ? '逐年增加' : steps.every((x) => x < 0) ? '逐年减少' : v[v.length - 1]! > v[0]! ? '总体增加，中间有减少' : '总体减少，中间有增加'
        expect(ans, q.id).toBe(want)
      } else if (kind === 'inc') {
        const v = seriesOf(c!, q, keyOf(t.p.th))
        const inc = v.slice(1).map((x, i) => Math.round((x - v[i]!) * 10) / 10)
        const least = q.id.endsWith('least')
        const target = least ? Math.min(...inc) : Math.max(...inc)
        expect(inc.filter((x) => x === target), `${q.id} 增加的最多 / 最少不唯一`).toHaveLength(1)
        if (least) expect(Math.min(...inc), `${q.id} 问「增加的最少」时每一年都要是增加的`).toBeGreaterThan(0)
        expect(c!.numbers, q.id).toBe(true)
        // 年份的选项是后一年；年龄段的选项是「a 岁到 b 岁」
        expect(firstNum(ans), q.id).toBe(cats[inc.indexOf(target) + (setOf(c!).kind === 'age' ? 0 : 1)])
      } else if (kind === 'diff') {
        const v = seriesOf(c!, q, keyOf(t.p.th))
        const [a, b] = [cats.indexOf(catOf(t.p.a)), cats.indexOf(catOf(t.p.b))]
        expect(c!.numbers, q.id).toBe(true)
        expect(Number(ans), q.id).toBe(v[b]! - v[a]!)
        expect(v[b]! - v[a]!, q.id).toBeGreaterThan(0)
      } else if (kind === 'gdp') {
        const v = c!.series[0]!.values as number[]
        expect(firstNum(ans), q.id).toBe(cats[v.findIndex((x) => x > 1000000)])
        expect(firstNum(ans), q.id).toBe(2020)
      } else if (kind === 'pop') {
        expect(ans, q.id).toBe('逐年增加，增加的幅度越来越小')
        const v = c!.series[0]!.values as number[]
        expect(v.slice(1).every((x, i) => x > v[i]!), q.id).toBe(true)
      } else if (kind === 'wrong') {
        // 统计表是课本的数；图上恰好有一个点和表不一样，差一格以上，答案就是那一年
        const tb = q.stem.find((p): p is Extract<StemPart, { kind: 'stat-table' }> => p.kind === 'stat-table')!
        const rows = tb.rows.map((r) => r.slice(1).map((x) => (typeof x === 'number' ? x : Number(zh(x as LStr)))))
        // 截连着的 6 年，表只有一段
        const years = rows[0]!
        const book = rows[1]!
        expect(tb.rows, q.id).toHaveLength(2)
        expect(years, q.id).toEqual(cats)
        expect(years, q.id).toHaveLength(6)
        const full = setOf(c!)
        const from = (full.cats as number[]).indexOf(years[0]!)
        expect(book, q.id).toEqual(full.series[0]!.values.slice(from, from + 6))
        const drawn = c!.series[0]!.values as number[]
        const bad = drawn.map((v, i) => (v !== book[i] ? i : -1)).filter((i) => i >= 0)
        expect(bad, q.id).toHaveLength(1)
        expect(Math.abs(drawn[bad[0]!]! - book[bad[0]!]!), q.id).toBeGreaterThanOrEqual(c!.step)
        expect(firstNum(ans), q.id).toBe(cats[bad[0]!])
        expect(c!.numbers, `${q.id} 画错点的图不能写数`).toBe(false)
        expect(c!.grid, q.id).toBe(true)
      } else if (kind === 'concept') {
        const want = { 'concept-points': '高低不同的点', 'concept-trend': '折线统计图', 'concept-amount': '条形统计图' }[q.id.split(':')[1]!]
        expect(ans, q.id).toBe(want)
      } else if (kind === 'choose') {
        const id = keyOf(t.p.x).split('.').pop()!
        expect(ans, q.id).toBe(SCENES.find(([s]) => s === id)![1] === 'line' ? '折线统计图' : '条形统计图')
      } else throw new Error(`没有核对的题型：${q.id}`)
    })
  })

  it('复式折线统计图', () => {
    each('m5s2-09-double', (q) => {
      const kind = kindOf(q)
      const t = textOf(q)
      const c = chartOf(q)!
      const ans = answerText(q)
      const cats = c.cats.map((x) => Number(zh(x)))
      const [a, b] = c.series.map((x) => x.values as number[]) as [number[], number[]]
      if (kind === 'read') {
        expect(c.numbers, q.id).toBe(true)
        const v = seriesOf(c, q, keyOf(t.p.th))
        expect(Number(ans), q.id).toBe(v[cats.indexOf(catOf(t.p.c))])
      } else if (kind === 'ext') {
        const v = seriesOf(c, q, keyOf(t.p.th))
        const most = ['m5.line.w.most', 'm5.line.w.high'].includes(keyOf(t.p.w))
        const target = most ? Math.max(...v) : Math.min(...v)
        expect(v.filter((x) => x === target), q.id).toHaveLength(1)
        expect(firstNum(ans), q.id).toBe(cats[v.indexOf(target)])
      } else if (kind === 'trend') {
        const v = seriesOf(c, q, keyOf(t.p.th))
        const steps = v.slice(1).map((x, i) => x - v[i]!)
        const want = steps.every((x) => x > 0) ? '逐年增加' : steps.every((x) => x < 0) ? '逐年减少' : v[v.length - 1]! > v[0]! ? '总体增加，中间有减少' : '总体减少，中间有增加'
        expect(ans, q.id).toBe(want)
      } else if (kind === 'legend') {
        const color = keyOf(t.p.c).split('.').pop()
        const j = c.series.findIndex((x) => x.tone === color)
        expect(c.series.filter((x) => x.tone === color), q.id).toHaveLength(1)
        expect(ans, q.id).toBe(zh({ k: `m5.line.th.${setOf(c).series[j]!.id}` }))
      } else if (kind === 'gap') {
        // 两条线越来越近：首尾相差在变小
        expect(Math.abs(a[a.length - 1]! - b[b.length - 1]!), q.id).toBeLessThan(Math.abs(a[0]! - b[0]!))
        expect(ans, q.id).toBe('出生人口数和死亡人口数相差越来越小')
      } else if (kind === 'natural') {
        const i = cats.indexOf(catOf(t.p.c))
        expect(Number(ans), q.id).toBe(a[i]! - b[i]!)
      } else if (kind === 'temp') {
        if (q.id.includes('higher')) {
          const months = cats.filter((_, i) => a[i]! > b[i]!)
          expect(ans, q.id).toBe(`${months[0]} 月和 ${months[1]} 月`)
          expect(months, q.id).toEqual([7, 8])
        } else if (q.id.includes('range')) {
          const span = (v: number[]): number => Math.max(...v) - Math.min(...v)
          expect(ans, q.id).toBe(span(a) > span(b) ? '甲地' : '乙地')
        } else if (q.id.includes('month')) {
          const m = Number(t.p.m)
          const i = cats.indexOf(m)
          expect(ans, q.id).toBe(a[i]! > b[i]! ? '高' : '低')
        } else {
          const v = keyOf(t.p.p) === 'm5.line.lg.tempA' ? a : b
          expect(Number(ans), q.id).toBeCloseTo(Math.max(...v) - Math.min(...v), 6)
        }
      } else if (kind === 'girls') {
        const ages = cats.filter((_, i) => b[i]! > a[i]!)
        expect(ans, q.id).toBe(`${ages.join('、')} 岁`)
      } else if (kind === 'kids') {
        if (q.id.includes('again')) {
          const at = cats.findIndex((_, i) => i > 0 && a[i]! > b[i]! && b[i - 1]! > a[i - 1]!)
          expect(Number(ans), q.id).toBe(cats[at])
        } else {
          const i = cats.indexOf(Number(t.p.a))
          expect(Number(ans), q.id).toBe(a[i]! - b[i]!)
          expect(a[i]! - b[i]!, q.id).toBeGreaterThan(0)
        }
      } else if (kind === 'diff') {
        const v = seriesOf(c, q, keyOf(t.p.th))
        const [x, y] = [cats.indexOf(catOf(t.p.a)), cats.indexOf(catOf(t.p.b))]
        expect(Number(ans), q.id).toBe(v[y]! - v[x]!)
      } else if (kind === 'inc') {
        const v = seriesOf(c, q, keyOf(t.p.th))
        const inc = v.slice(1).map((x, i) => x - v[i]!)
        const target = Math.max(...inc)
        expect(inc.filter((x) => x === target), q.id).toHaveLength(1)
        expect(firstNum(ans), q.id).toBe(cats[inc.indexOf(target) + 1])
      } else if (kind === 'birth') {
        const gaps = a.map((x, i) => x - b[i]!)
        expect(gaps.filter((x) => x === Math.min(...gaps)), q.id).toHaveLength(1)
        expect(firstNum(ans), q.id).toBe(cats[gaps.indexOf(Math.min(...gaps))])
      } else if (kind === 'bad') {
        const ups = b.map((x, i) => (i > 0 && x > b[i - 1]! ? i : -1)).filter((i) => i > 0)
        expect(ups, q.id).toHaveLength(1)
        expect(firstNum(ans), q.id).toBe(cats[ups[0]!])
      } else throw new Error(`没有核对的题型：${q.id}`)
    })
  })
})

describe('折线统计图：选项与第 1 档', () => {
  it('类别的选项（年份、月份、年龄）互不相同，正确答案在里面', () => {
    for (const kp of ['m5s2-09-single', 'm5s2-09-double']) {
      each(kp, (q) => {
        if (q.answer.kind !== 'choice') return
        const ls = labels(q)
        expect(new Set(ls).size, q.id).toBe(ls.length)
        expect(ls, q.id).toContain(answerText(q))
      })
    }
  })
  it('第 1 档：例 1 的点和线、条形和折线，做一做的读数、变化、画图（找画错的点）、练习二十六 5 用哪种统计图；复式图的图例、读数、趋势、越来越近', () => {
    const kinds = (kp: string): Set<string> => {
      const out = new Set<string>()
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 400; seed++) out.add(kindOf(gen(1, createRng(seed))))
      return out
    }
    const single = kinds('m5s2-09-single')
    for (const k of ['read', 'ext', 'updown', 'scale', 'concept', 'choose', 'wrong', 'trend']) expect(single.has(k), k).toBe(true)
    const double = kinds('m5s2-09-double')
    for (const k of ['legend', 'read', 'ext', 'trend', 'gap', 'natural']) expect(double.has(k), k).toBe(true)
  })
})
