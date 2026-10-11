// @vitest-environment happy-dom
// 五年级数学 I 的教具：折线统计图（LineChart）、线段图上带分数的括号（FracLine 的 braces）、统计表格子里的分数（StatTable）。
// 先用手写的数据查画得对（点的高低和数成比例、刻度、折断号、点上的数、图例、方格、括号和分数），再挂真实题目查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import LineChart from '@/components/math/LineChart.vue'
import FracLine from '@/components/math/FracLine.vue'
import StatTable from '@/components/math/StatTable.vue'

afterEach(() => setLang('zh'))

const num = (s: string | undefined): number => Number(s)
const texts = (w: ReturnType<typeof mount>, cls: string): string[] => w.findAll(`text.${cls}`).map((t) => t.text())
const single = {
  title: { k: 'm5.line.t.robot', p: { a: 2012, b: 2016 } },
  cats: ['2012', '2013', '2014', '2015', '2016'],
  series: [{ tone: 'blue' as const, values: [128, 123, 137, 168, 175] as (number | null)[] }],
  step: 50,
  cells: 6,
  valueAxis: { k: 'm5.line.ax.robot' },
  catAxis: { k: 'm5.line.ax.year' },
}

describe('折线统计图（LineChart）', () => {
  it('单式图：一个类别一个点、点从左往右排、高低和数成比例，刻度从 0 起每格都标数，连成一条折线；不写数时点上没有数', () => {
    const w = mount(LineChart, { props: single })
    const dots = w.findAll('circle.pt')
    expect(dots).toHaveLength(5)
    const xs = dots.map((d) => num(d.attributes('cx')))
    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
    // 等间距
    expect(xs[1]! - xs[0]!).toBeCloseTo(xs[4]! - xs[3]!)
    // 0 在横轴上：y = base − v / step × 格高，所以 (base − y) 和数成比例
    const ys = dots.map((d) => num(d.attributes('cy')))
    const base = ys[0]! + (128 / 50) * ((ys[0]! - ys[4]!) / ((175 - 128) / 50))
    expect((base - ys[3]!) / (base - ys[0]!)).toBeCloseTo(168 / 128, 3)
    expect(ys[1]).toBeGreaterThan(ys[0]!) // 123 比 128 低
    expect(texts(w, 'tick-label')).toEqual(['0', '50', '100', '150', '200', '250', '300'])
    expect(texts(w, 'cat')).toEqual(['2012', '2013', '2014', '2015', '2016'])
    expect(texts(w, 'axis-name')).toEqual(['参赛队伍/支', '年份'])
    expect(w.find('text.title').text()).toBe('2012—2016年某地青少年机器人大赛参赛队伍数统计图')
    expect(w.findAll('path.line')).toHaveLength(1)
    expect(w.findAll('text.num')).toHaveLength(0)
    expect(w.findAll('.swatch')).toHaveLength(0)
    expect(w.findAll('line.grid')).toHaveLength(0)
    expect(w.find('path.zigzag').exists()).toBe(false)
    expect(w.find('svg').attributes('aria-label')).toBe('2012—2016年某地青少年机器人大赛参赛队伍数统计图')
    w.unmount()
  })

  it('点上写数（numbers）、方格（grid）、null 的地方不画点也不连线', () => {
    const w = mount(LineChart, { props: { ...single, numbers: true } })
    expect(texts(w, 'num')).toEqual(['128', '123', '137', '168', '175'])
    w.unmount()
    const g = mount(LineChart, { props: { ...single, grid: true } })
    // 每个类别一条竖线 + 每格一条横线
    expect(g.findAll('line.grid')).toHaveLength(5 + 6)
    g.unmount()
    const gap = mount(LineChart, { props: { ...single, series: [{ values: [128, null, 137, 168, 175] }] } })
    expect(gap.findAll('circle.pt')).toHaveLength(4)
    // 断开：路径里有两段（两个 M）
    expect(gap.find('path.line').attributes('d')!.match(/M/g)).toHaveLength(2)
    gap.unmount()
  })

  it('折断号（from）：0 上面一段锯齿，第一格的刻度从 from 起，点按 from 算高低', () => {
    const w = mount(LineChart, {
      props: { ...single, title: undefined, cats: ['0', '1', '2'], series: [{ values: [50, 76, 88] }], step: 10, cells: 11, from: 50, valueAxis: { k: 'm5.line.ax.height' }, catAxis: { k: 'm5.line.ax.age' } },
    })
    expect(w.find('path.zigzag').exists()).toBe(true)
    expect(texts(w, 'tick-label')).toEqual(['0', '50', '60', '70', '80', '90', '100', '110', '120', '130', '140', '150'])
    const ys = w.findAll('circle.pt').map((d) => num(d.attributes('cy')))
    // 50 画在第一格（刻度 50）上；76 比 50 高 2.6 格，88 比 50 高 3.8 格
    expect((ys[0]! - ys[1]!) / (ys[0]! - ys[2]!)).toBeCloseTo(26 / 38, 3)
    const tick50 = w.findAll('text.tick-label').find((t) => t.text() === '50')!
    expect(Math.abs(num(tick50.attributes('y')) - ys[0]!)).toBeLessThan(6)
    expect(w.find('svg').attributes('aria-label')).toBe('折线统计图')
    expect(w.find('svg').attributes('data-from')).toBe('50')
    w.unmount()
  })

  it('复式图：两条线两种颜色，右上角图例；同一个类别高的点数写在上面、低的写在下面', () => {
    const w = mount(LineChart, {
      props: {
        ...single,
        title: { k: 'm5.line.t.air', p: { a: 2013, b: 2015 } },
        cats: ['2013', '2014', '2015'],
        series: [
          { name: { k: 'm5.line.lg.good' }, tone: 'green' as const, values: [176, 172, 186] },
          { name: { k: 'm5.line.lg.bad' }, tone: 'orange' as const, values: [58, 47, 46] },
        ],
        step: 60,
        cells: 5,
        valueAxis: { k: 'm5.line.ax.days' },
        numbers: true,
      },
    })
    expect(w.findAll('circle.pt.green')).toHaveLength(3)
    expect(w.findAll('circle.pt.orange')).toHaveLength(3)
    expect(w.findAll('path.line')).toHaveLength(2)
    expect(w.findAll('.swatch')).toHaveLength(2)
    expect(texts(w, 'legend')).toEqual(['优良', '重污染'])
    // 优良的数写在点的上面：字的 y 比点的 y 小
    const dot = w.find('circle.pt.green')
    const label = w.findAll('text.num.green')[0]!
    expect(num(label.attributes('y'))).toBeLessThan(num(dot.attributes('cy')))
    // 数很小的点（写在下面会压到横轴）改写在上面
    const low = w.findAll('circle.pt.orange')[2]!
    const lowLabel = w.findAll('text.num.orange')[2]!
    expect(lowLabel.text()).toBe('46')
    expect(num(lowLabel.attributes('y'))).toBeLessThan(num(low.attributes('cy')))
    w.unmount()
  })

  it('点上的数保留几位小数（digits）；挤的时候字号缩小、一上一下交错，最后一个点写在上面', () => {
    const vals = [538580.0, 592963.2, 643563.1, 688858.2, 746395.1, 832035.9, 919281.1, 986515.2, 1013567.0, 1143669.7]
    const w = mount(LineChart, {
      props: { ...single, cats: vals.map((_, i) => String(2012 + i)), series: [{ tone: 'orange' as const, values: vals, digits: 1 }], step: 200000, cells: 6, numbers: true },
    })
    const labels = w.findAll('text.num')
    expect(labels.map((t) => t.text())[0]).toBe('538580.0')
    expect(labels.map((t) => t.text())[9]).toBe('1143669.7')
    const dots = w.findAll('circle.pt')
    const above = labels.map((t, i) => num(t.attributes('y')) < num(dots[i]!.attributes('cy')))
    expect(above[9]).toBe(true)
    expect(above[8]).toBe(false)
    expect(Math.max(...labels.map((t) => num(t.attributes('font-size'))))).toBeLessThanOrEqual(11)
    expect(Math.min(...labels.map((t) => num(t.attributes('font-size'))))).toBeGreaterThanOrEqual(9)
    w.unmount()
  })

  it('英文：名字首字母大写', () => {
    setLang('en')
    const w = mount(LineChart, { props: single })
    expect(texts(w, 'axis-name')).toEqual(['Teams', 'Year'])
    w.unmount()
  })
})

describe('线段图上的括号（FracLine 的 braces）', () => {
  it('上下各画括号，括号尖上的分数拆成分子、分母两行，中间一条分数线；「?」原样写；不传 braces 和原来一样', () => {
    const w = mount(FracLine, {
      props: {
        units: 1,
        per: 5,
        labels: false,
        braces: [
          { from: 0, to: 2, side: 'bottom' as const, label: '2/5' },
          { from: 2, to: 4, side: 'bottom' as const, label: '2/5' },
          { from: 0, to: 4, side: 'top' as const, label: '?' },
        ],
      },
    })
    expect(w.findAll('.seg-brace path.brace')).toHaveLength(3)
    expect(w.findAll('text.num.frac').map((t) => t.text())).toEqual(['2', '5', '2', '5'])
    expect(w.findAll('.seg-brace line.bar')).toHaveLength(2)
    expect(w.find('text.num.q').text()).toBe('?')
    // 上面的括号在线的上方、下面的在下方
    const lineY = num(w.find('line.axis').attributes('y1'))
    expect(num(w.find('text.num.q').attributes('y'))).toBeLessThan(lineY)
    for (const t of w.findAll('text.num.frac')) expect(num(t.attributes('y'))).toBeGreaterThan(lineY)
    // 括号的宽窄跟着括住的段数
    const ticks = w.findAll('line.tick').map((t) => num(t.attributes('x1')))
    expect(ticks).toHaveLength(6)
    w.unmount()
    const plain = mount(FracLine, { props: { units: 1, per: 5, labels: false, bracket: [0, 1] as [number, number] } })
    expect(plain.findAll('.seg-brace')).toHaveLength(0)
    expect(plain.findAll('path.brace')).toHaveLength(1)
    plain.unmount()
  })
})

describe('统计表格子里的分数（StatTable）', () => {
  it('分数格画成上下两层，整数 / 文字格不变；「?」格答完填上的分数也画成两层', () => {
    const w = mount(StatTable, { props: { rows: [[{ k: 'm5.fadd.gr.n1' }, 12], ['2/15', null]], head: 'row' as const, fill: { value: '1/5', done: true } } })
    const cells = w.findAll('td')
    expect(cells[0]!.text()).toBe('一')
    expect(cells[1]!.text()).toBe('12')
    expect(cells[2]!.find('.frac .num').text()).toBe('2')
    expect(cells[2]!.find('.frac .den').text()).toBe('15')
    expect(cells[3]!.find('.q .frac .num').text()).toBe('1')
    expect(cells[3]!.find('.q .frac .den').text()).toBe('5')
    w.unmount()
  })
})

describe('QuestionRenderer 转发五年级数学 I 的字段（真实题目）', () => {
  function find<K extends 'line-chart' | 'seg-braces'>(kpId: string, kind: K): { q: Question; part: Extract<StemPart, { kind: K }> }[] {
    const gen = getGenerator(kpId)!
    const out: { q: Question; part: Extract<StemPart, { kind: K }> }[] = []
    for (let seed = 1; seed <= 200 && out.length < 24; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const part = q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === kind)
        if (part) out.push({ q, part })
      }
    }
    expect(out.length).toBeGreaterThan(0)
    return out
  }

  it('折线统计图：点数、刻度、折断号、点上的数、方格、图例', () => {
    for (const kp of ['m5s2-09-single', 'm5s2-09-double']) {
      for (const { q, part } of find(kp, 'line-chart')) {
        const w = mount(QuestionRenderer, { props: { question: q } })
        const svg = w.find('.line-chart svg')
        expect(svg.attributes('data-step'), q.id).toBe(String(part.step))
        expect(svg.attributes('data-cells'), q.id).toBe(String(part.cells))
        expect(svg.attributes('data-from'), q.id).toBe(part.from === undefined ? undefined : String(part.from))
        const values = part.series.flatMap((s) => s.values).filter((v) => v !== null)
        expect(w.findAll('.line-chart circle.pt'), q.id).toHaveLength(values.length)
        expect(w.findAll('.line-chart text.num'), q.id).toHaveLength(part.numbers ? values.length : 0)
        expect(w.findAll('.line-chart line.grid').length > 0, q.id).toBe(!!part.grid)
        expect(w.findAll('.line-chart .swatch'), q.id).toHaveLength(part.series.length > 1 ? part.series.length : 0)
        expect(w.find('.line-chart path.zigzag').exists(), q.id).toBe(part.from !== undefined)
        w.unmount()
      }
    }
  })

  it('线段图：括号的个数、分数和「?」', () => {
    for (const { q, part } of find('m5s2-07-same', 'seg-braces')) {
      const w = mount(QuestionRenderer, { props: { question: q } })
      expect(w.findAll('.seg-brace'), q.id).toHaveLength(part.braces.length)
      expect(w.findAll('text.num.q').map((t) => t.text()), q.id).toEqual(['?'])
      expect(w.findAll('line.tick'), q.id).toHaveLength(part.parts + 1)
      w.unmount()
    }
  })
})
