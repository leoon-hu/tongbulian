// @vitest-environment happy-dom
// 四上「条形统计图」的新教具：条形统计图（BarChart）。先用手写的数据查画得对（条的长短与数成比例、刻度每格都标数、
// 半格、还没画的那一条、刻度不写数、复式图的图例和条顶的数、横向图），再挂真实题目查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang, translate } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import BarChart from '@/components/math/BarChart.vue'
import { hasBlank, hasChoiceBlank } from '@/components/practice/blank'

afterEach(() => setLang('zh'))

const cats = [{ k: 'm4.bar.cat.sunny' }, { k: 'm4.bar.cat.overcast' }, { k: 'm4.bar.cat.cloudy' }, { k: 'm4.bar.cat.shower' }, { k: 'm4.bar.cat.storm' }]
const single = {
  cats,
  series: [{ values: [9, 6, 9, 5, 2] as (number | null)[] }],
  step: 1,
  cells: 10,
  valueAxis: { k: 'm4.bar.axis.days' },
  catAxis: { k: 'm4.bar.axis.weather' },
  grid: true,
}
const num = (s: string | undefined): number => Number(s)
const texts = (w: ReturnType<typeof mount>, cls: string): string[] => w.findAll(`text.${cls}`).map((t) => t.text())

describe('条形统计图（BarChart）', () => {
  it('竖向单式图：满格方格纸，一类一条，条高与数成比例，刻度从 0 起每格都标数，条上不写数', () => {
    const w = mount(BarChart, { props: single })
    const bars = w.findAll('rect.bar')
    expect(bars).toHaveLength(5)
    const h = bars.map((b) => num(b.attributes('height')))
    // 9 天的条是 2 天的 4.5 倍高，晴和多云一样高
    expect(h[0]! / h[4]!).toBeCloseTo(4.5)
    expect(h[0]).toBe(h[2])
    // 条都立在同一条横轴上
    const bottoms = bars.map((b) => num(b.attributes('y')) + num(b.attributes('height')))
    expect(new Set(bottoms.map((b) => b.toFixed(3))).size).toBe(1)
    expect(texts(w, 'tick-label')).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    expect(texts(w, 'cat')).toEqual(['晴', '阴', '多云', '阵雨', '雷阵雨'])
    expect(texts(w, 'axis-name')).toEqual(['天数', '天气情况'])
    expect(w.findAll('line.grid').length).toBeGreaterThan(20)
    expect(w.findAll('text.num')).toHaveLength(0)
    expect(w.findAll('rect.swatch')).toHaveLength(0)
    expect(w.find('text.title').exists()).toBe(false)
    expect(w.find('svg').attributes('aria-label')).toBe('条形统计图')
    // 类别从左往右排
    const xs = w.findAll('text.cat').map((t) => num(t.attributes('x')))
    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
    w.unmount()
  })

  it('1 格代表 2：17 画 8 格半；null 的那一条画成「?」；刻度不写数时画空框', () => {
    const w = mount(BarChart, {
      props: { ...single, cats: cats.slice(0, 4), series: [{ values: [12, 17, null, 32] }], step: 2, cells: 17, title: { k: 'm4.bar.title.pop' } },
    })
    const h = w.findAll('rect.bar').map((b) => num(b.attributes('height')))
    expect(h).toHaveLength(3)
    expect(h[1]! / h[0]!).toBeCloseTo(17 / 12)
    expect(w.findAll('rect.qbox')).toHaveLength(1)
    expect(texts(w, 'q')).toEqual(['?'])
    expect(texts(w, 'tick-label')[1]).toBe('2')
    expect(texts(w, 'tick-label')).toHaveLength(18)
    expect(w.find('text.title').text()).toBe('某地区城乡人口数统计图')
    expect(w.find('svg').attributes('aria-label')).toBe('某地区城乡人口数统计图')
    w.unmount()
    const hidden = mount(BarChart, { props: { ...single, step: 5, cells: 10, series: [{ values: [40, 30, 25, 35, 45] }], hideScale: true } })
    expect(hidden.findAll('text.tick-label')).toHaveLength(0)
    expect(hidden.findAll('rect.blank')).toHaveLength(11)
    hidden.unmount()
  })

  it('复式图：两组紧挨着、颜色看图例、条顶写数', () => {
    const w = mount(BarChart, {
      props: {
        cats: ['1980', '1990', '2000'],
        series: [
          { name: { k: 'm4.bar.ser.town' }, tone: 'pink' as const, values: [21, 27, 35] },
          { name: { k: 'm4.bar.ser.rural' }, tone: 'blue' as const, values: [58, 54, 49] },
        ],
        step: 10,
        cells: 6,
        valueAxis: { k: 'm4.bar.axis.pop' },
        catAxis: { k: 'm4.bar.axis.year' },
        numbers: true,
      },
    })
    expect(w.findAll('rect.bar.pink')).toHaveLength(3)
    expect(w.findAll('rect.bar.blue')).toHaveLength(3)
    expect(w.findAll('rect.swatch')).toHaveLength(2)
    expect(texts(w, 'legend')).toEqual(['城镇', '农村'])
    expect(texts(w, 'num')).toEqual(['21', '58', '27', '54', '35', '49'])
    expect(w.findAll('line.grid')).toHaveLength(0)
    expect(w.findAll('line.tick')).toHaveLength(6)
    // 同一年的两条紧挨着（粉的右边就是蓝的左边）
    const pink = w.findAll('rect.bar.pink').map((b) => num(b.attributes('x')) + num(b.attributes('width')))
    const blue = w.findAll('rect.bar.blue').map((b) => num(b.attributes('x')))
    pink.forEach((x, i) => expect(Math.abs(x - blue[i]!)).toBeLessThan(1.5))
    w.unmount()
  })

  it('横向图：类别从下往上排，条从左往右、长短与数成比例；复式图第一组在上面', () => {
    const w = mount(BarChart, {
      props: {
        dir: 'h' as const,
        cats: [{ k: 'm4.bar.cat.dog' }, { k: 'm4.bar.cat.zebra' }, { k: 'm4.bar.cat.elephant' }, { k: 'm4.bar.cat.hippo' }],
        series: [{ values: [10, 25, 75, 40] }],
        step: 10,
        cells: 8,
        valueAxis: { k: 'm4.bar.axis.life' },
        catAxis: { k: 'm4.bar.axis.animal' },
        grid: true,
      },
    })
    expect(w.find('figure').classes()).toContain('horizontal')
    const bars = w.findAll('rect.bar')
    const widths = bars.map((b) => num(b.attributes('width')))
    expect(widths[2]! / widths[0]!).toBeCloseTo(7.5)
    // 狗在最下面，河马在最上面
    const ys = bars.map((b) => num(b.attributes('y')))
    expect(ys[0]).toBeGreaterThan(ys[3]!)
    expect(w.findAll('text.cat').map((t) => t.attributes('text-anchor'))).toEqual(['end', 'end', 'end', 'end'])
    expect(texts(w, 'tick-label')).toEqual(['0', '10', '20', '30', '40', '50', '60', '70', '80'])
    w.unmount()
    const two = mount(BarChart, {
      props: {
        dir: 'h' as const,
        cats: [{ k: 'm4.bar.cat.recyclable' }],
        series: [
          { name: { k: 'm4.bar.ser.commA' }, tone: 'pink' as const, values: [24] },
          { name: { k: 'm4.bar.ser.commB' }, tone: 'blue' as const, values: [25] },
        ],
        step: 10,
        cells: 8,
        valueAxis: { k: 'm4.bar.axis.mass' },
        catAxis: { k: 'm4.bar.axis.trash' },
        numbers: true,
      },
    })
    expect(num(two.find('rect.bar.pink').attributes('y'))).toBeLessThan(num(two.find('rect.bar.blue').attributes('y')))
    expect(texts(two, 'num')).toEqual(['24', '25'])
    two.unmount()
  })

  it('英文：名字首字母大写；放不下的名字折成两行或缩小', () => {
    setLang('en')
    const w = mount(BarChart, { props: single })
    expect(texts(w, 'cat')).toEqual(['Sunny', 'Overcast', 'Cloudy', 'Showery', 'Stormy'])
    expect(texts(w, 'axis-name')).toEqual(['Days', 'Weather'])
    w.unmount()
    setLang('zh')
    const week = mount(BarChart, {
      props: {
        ...single,
        cats: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => ({ k: `m4.bar.cat.wd.${d}` })),
        series: [{ values: [15, 10, 20, 25, 30, 50, 45] }],
        step: 5,
        cells: 11,
      },
    })
    const sizes = week.findAll('text.cat').map((t) => num(t.attributes('font-size')))
    expect(Math.max(...sizes)).toBeLessThanOrEqual(13)
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(9)
    week.unmount()
  })
})

describe('QuestionRenderer 转发条形统计图的全部字段（真实题目）', () => {
  function find(kpId: string, ok: (p: Extract<StemPart, { kind: 'bar-chart' }>) => boolean = () => true): { q: Question; part: Extract<StemPart, { kind: 'bar-chart' }> }[] {
    const gen = getGenerator(kpId)!
    const out: { q: Question; part: Extract<StemPart, { kind: 'bar-chart' }> }[] = []
    for (let seed = 1; seed <= 120 && out.length < 16; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const part = q.stem.find((p): p is Extract<StemPart, { kind: 'bar-chart' }> => p.kind === 'bar-chart' && ok(p))
        if (part) out.push({ q, part })
      }
    }
    expect(out.length).toBeGreaterThan(0)
    return out
  }

  it('条数、刻度、图例、条顶的数、横竖、刻度不写数', () => {
    for (const kp of ['m4s1-07-single', 'm4s1-07-double']) {
      const cases = [...find(kp), ...find(kp, (p) => p.dir === 'h')]
      // 刻度不写数、还没画的那一条只在单式图里有
      if (kp === 'm4s1-07-single') cases.push(...find(kp, (p) => !!p.hideScale), ...find(kp, (p) => p.series.some((x) => x.values.includes(null))))
      for (const { q, part } of cases) {
        const w = mount(QuestionRenderer, { props: { question: q } })
        const svg = w.find('.bar-chart svg')
        expect(svg.attributes('data-step'), q.id).toBe(String(part.step))
        expect(svg.attributes('data-cells'), q.id).toBe(String(part.cells))
        const values = part.series.flatMap((s) => s.values)
        expect(w.findAll('.bar-chart rect.bar'), q.id).toHaveLength(values.filter((v) => v !== null && v > 0).length)
        expect(w.findAll('.bar-chart rect.qbox'), q.id).toHaveLength(values.filter((v) => v === null).length)
        if (part.hideScale) expect(w.findAll('.bar-chart text.tick-label'), q.id).toHaveLength(0)
        else expect(w.findAll('.bar-chart text.tick-label').map((t) => t.text())[1], q.id).toBe(String(part.step))
        expect(w.findAll('.bar-chart text.num'), q.id).toHaveLength(part.numbers ? values.filter((v) => v !== null).length : 0)
        expect(w.findAll('.bar-chart rect.swatch'), q.id).toHaveLength(part.series.length > 1 ? part.series.length : 0)
        expect(w.find('.bar-chart').classes(), q.id).toContain(part.dir === 'h' ? 'horizontal' : 'vertical')
        expect(w.find('.bar-chart').classes().includes('is-grid'), q.id).toBe(!!part.grid)
        expect(w.findAll('.bar-chart text.title').length, q.id).toBe(part.title ? 1 : 0)
        // 读屏说明只说图题（没有图题就说「条形统计图」），不说条上的数
        expect(svg.attributes('aria-label'), q.id).toBe(part.title ? translate(part.title, 'zh') : '条形统计图')
        // 条形统计图不是要填数的空（数字键盘照常显示）
        expect(hasBlank(q) || hasChoiceBlank(q), q.id).toBe(false)
        w.unmount()
      }
    }
  })
})
