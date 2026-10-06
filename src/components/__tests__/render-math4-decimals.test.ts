// @vitest-environment happy-dom
// 四下「小数的意义和性质」的新教具（四年级数学下册 C）：小数卡（DecCard）、米尺和数线（DecScale）、小数的数位顺序表（PlaceTable 的 dec），
// 先用手写的数据查每个组件画得对，再挂真实题目查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import DecCard from '@/components/math/DecCard.vue'
import DecScale from '@/components/math/DecScale.vue'
import PlaceTable from '@/components/math/PlaceTable.vue'
import { hasBlank } from '@/components/practice/blank'
import ScaleDial from '@/components/math/ScaleDial.vue'
import decScaleSource from '@/components/math/DecScale.vue?raw'
import fracLineSource from '@/components/math/FracLine.vue?raw'
import scaleDialSource from '@/components/math/ScaleDial.vue?raw'

afterEach(() => setLang('zh'))

describe('对战 / 打怪兽的窄栏里不比这一栏宽（打怪兽手机横屏两人一栏才 134px）', () => {
  /** 组件样式里某个选择器那一段的规则 */
  const rule = (src: string, sel: string): string => new RegExp(`\\n${sel.replace('.', '\\.')} \\{([^}]*)\\}`).exec(src)?.[1] ?? ''

  it('米尺 / 数线（DecScale、三年级的 FracLine）：内边距在宽度外面，最宽是这一栏减去左右内边距', () => {
    for (const [src, sel] of [[decScaleSource, '.dec-scale'], [fracLineSource, '.frac-line']] as const) {
      const r = rule(src, sel)
      expect(r, sel).toContain('box-sizing: content-box')
      expect(r, sel).toContain('padding: 6px 4px')
      expect(r, sel).toContain('max-width: calc(100% - 8px)')
    }
  })

  it('秤面（ScaleDial）：只定宽、高跟着宽等比走，比这一栏宽时缩到栏宽（三年级的秤放得下时大小不变）', () => {
    const w = mount(ScaleDial, { props: { max: 5, major: 0.5, minor: 10, value: 2.75, unit: 'kg' } })
    // 0–5 千克每 0.5 千克 10 小格，共 100 小格：小格多的秤面画 230px（放得下时）
    expect(w.find('svg').attributes('style')).toContain('width: 230px')
    expect(w.find('svg').attributes('style')).not.toContain('height')
    w.unmount()
    const r = rule(scaleDialSource, '.dial')
    expect(r).toContain('max-width: 100%')
    expect(r).toContain('height: auto')
    expect(r).toContain('aspect-ratio: 1')
  })

  it('小数的数位顺序表：表头「小数点」竖着写，小数点一列只有一个字宽', () => {
    const w = mount(PlaceTable, { props: { top: 4, dec: 4, ask: -2 } })
    expect(w.find('.parts .level.mid .v').text()).toBe('小数点')
    w.unmount()
  })
})

describe('小数卡（DecCard）', () => {
  it('数照写，小数点单独一个窄的点；画横线的那几位（按字符下标）', () => {
    const w = mount(DecCard, { props: { n: '340.09', marks: [4] } })
    expect(w.text()).toBe('340.09')
    expect(w.findAll('.d')).toHaveLength(5)
    expect(w.findAll('.pt')).toHaveLength(1)
    expect(w.findAll('.d.mark').map((d) => d.text())).toEqual(['0'])
    w.unmount()
  })

  it('分数画成上下两层（分母是 1000、10000 的分数放在卡上）', () => {
    const w = mount(DecCard, { props: { frac: [47, 1000] } })
    expect(w.find('.frac .num').text()).toBe('47')
    expect(w.find('.frac .den').text()).toBe('1000')
    expect(w.find('.dec').exists()).toBe(false)
    w.unmount()
  })
})

describe('米尺和数线（DecScale）', () => {
  it('例 1 的米尺（分成 10 份）：11 个长刻度，字是 0–9 和「1 m」，红箭头从尺子下面指上去', () => {
    const labels = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '1 m']
    const w = mount(DecScale, { props: { labels, per: 1, ruler: true, arrow: 3 } })
    expect(w.findAll('line.tick')).toHaveLength(11)
    expect(w.findAll('text.num').map((t) => t.text())).toEqual(labels)
    expect(w.find('path.body').exists()).toBe(true)
    // 箭头在第 3 个刻度正下方
    const tickX = Number(w.findAll('line.tick')[3]!.attributes('x1'))
    expect(Number(w.find('.arrow line').attributes('x1'))).toBeCloseTo(tickX)
    const bodyBottom = 8 + 46
    expect(Number(w.find('.arrow line').attributes('y1'))).toBeGreaterThan(bodyBottom)
    w.unmount()
  })

  it('放大的一段（1000 份）：0 和「1 cm」两个长刻度，每格 1 毫米、5 毫米是中长刻度，后面再画 9 格，右端是折断线', () => {
    const w = mount(DecScale, { props: { labels: ['0', '1 cm'], per: 10, extra: 9, ruler: true, broken: true, arrow: 13 } })
    const ticks = w.findAll('line.tick')
    expect(ticks).toHaveLength(20)
    expect(ticks.filter((t) => t.classes().includes('major'))).toHaveLength(2)
    const len = (i: number): number => Number(ticks[i]!.attributes('y2')) - Number(ticks[i]!.attributes('y1'))
    expect(len(5)).toBeGreaterThan(len(4))
    expect(len(10)).toBeGreaterThan(len(5))
    expect(len(15)).toBe(len(5))
    // 折断线：尺身的路径不是长方形
    expect(w.find('path.body').attributes('d')).toMatch(/L.*L.*L/)
    expect(Number(w.find('.arrow line').attributes('x1'))).toBeCloseTo(Number(ticks[13]!.attributes('x1')))
    w.unmount()
  })

  it('练习九 7 的直线：0–5 每 1 平均分成 10 小格，箭头从上面指下来，可以指在两小格中间（3.85）', () => {
    const w = mount(DecScale, { props: { labels: ['0', '1', '2', '3', '4', '5'], per: 10, extra: 4, arrow: 38.5 } })
    const ticks = w.findAll('line.tick')
    expect(ticks).toHaveLength(55)
    expect(w.find('line.axis').exists()).toBe(true)
    expect(w.find('path.body').exists()).toBe(false)
    const x38 = Number(ticks[38]!.attributes('x1'))
    const x39 = Number(ticks[39]!.attributes('x1'))
    expect(Number(w.find('.arrow line').attributes('x1'))).toBeCloseTo((x38 + x39) / 2)
    const axisY = Number(w.find('line.axis').attributes('y1'))
    expect(Number(w.find('.arrow line').attributes('y2'))).toBeLessThan(axisY)
    w.unmount()
  })
})

describe('小数的数位顺序表（PlaceTable 的 dec）', () => {
  it('第一行「整数部分 | 小数点 | 小数部分」，数位从万位到万分位，小数点一列是「·」，个位的计数单位写「一（个）」；打问号的那一位', () => {
    const w = mount(PlaceTable, { props: { top: 4, dec: 4, ask: -2 } })
    expect(w.findAll('.parts .level').map((c) => c.text())).toEqual(['整数部分', '小数点', '小数部分'])
    const places = w.findAll('.places td[data-place]')
    expect(places.map((c) => c.attributes('data-place'))).toEqual(['4', '3', '2', '1', '0', '-1', '-2', '-3', '-4'])
    expect(places.map((c) => c.text())).toEqual(['万位', '千位', '百位', '十位', '个位', '十分位', '?', '千分位', '万分位'])
    expect(w.find('td.point').text()).toBe('·')
    const units = w.findAll('.units td').map((c) => c.text())
    expect(units).toContain('一（个）')
    expect(w.find('.units .vert').text()).toBe('一（个）')
    expect(units).toContain('十分之一')
    expect(w.findAll('.units .ask')).toHaveLength(1)
    w.unmount()
    setLang('en')
    const en = mount(PlaceTable, { props: { top: 4, dec: 4 } })
    expect(en.findAll('.places td[data-place]').map((c) => c.text()).slice(-4)).toEqual(['0.1', '0.01', '0.001', '0.0001'])
    en.unmount()
  })

  it('不传 dec：原来的表一点不变（数级那一行、没有小数点一列）', () => {
    const w = mount(PlaceTable, { props: { top: 8, ask: 4 } })
    expect(w.findAll('.levels .level').map((c) => c.text())).toEqual(['亿级', '万级', '个级'])
    expect(w.find('td.point').exists()).toBe(false)
    expect(w.find('table.dec').exists()).toBe(false)
    w.unmount()
  })
})

describe('QuestionRenderer 转发小数卡、米尺和数线、小数的数位顺序表的全部字段', () => {
  const find = (kpId: string, d: 1 | 2 | 3, ok: (q: Question) => boolean): Question => {
    for (let seed = 1; seed <= 3000; seed++) {
      const q = getGenerator(kpId)!(d, createRng(seed))
      if (ok(q)) return q
    }
    throw new Error(`没找到题：${kpId}`)
  }
  const partOf = <K extends StemPart['kind']>(q: Question, k: K): Extract<StemPart, { kind: K }> => q.stem.find((p) => p.kind === k) as Extract<StemPart, { kind: K }>

  it('小数卡：数和画横线的位；分数', () => {
    const mark = find('m4s2-04-read-write', 1, (q) => q.id.includes(':mark-'))
    const w = mount(QuestionRenderer, { props: { question: mark } })
    expect(w.findComponent(DecCard).props()).toMatchObject({ n: partOf(mark, 'dec-card').n, marks: partOf(mark, 'dec-card').marks })
    expect(w.findAll('.d.mark')).toHaveLength(1)
    w.unmount()
    const frac = find('m4s2-04-meaning', 1, (q) => q.id.includes(':cf2d-'))
    const f = mount(QuestionRenderer, { props: { question: frac } })
    expect(f.findComponent(DecCard).props('frac')).toEqual(partOf(frac, 'dec-card').frac)
    f.unmount()
  })

  it('米尺（折断的放大段）和直线：刻度、字、多出来的格、箭头都转发', () => {
    const stick = find('m4s2-04-meaning', 1, (q) => q.id.includes(':stick-1000-'))
    const w = mount(QuestionRenderer, { props: { question: stick } })
    const sc = partOf(stick, 'dec-scale')
    expect(w.findComponent(DecScale).props()).toMatchObject({ labels: sc.labels, per: sc.per, extra: sc.extra, ruler: true, broken: true, arrow: sc.arrow })
    w.unmount()
    const line = find('m4s2-04-compare', 1, (q) => q.id.includes(':line2-'))
    const l = mount(QuestionRenderer, { props: { question: line } })
    const lp = partOf(line, 'dec-scale')
    expect(l.findComponent(DecScale).props()).toMatchObject({ labels: lp.labels, per: lp.per, extra: lp.extra, ruler: false, arrow: lp.arrow })
    l.unmount()
  })

  it('小数的数位顺序表：top、dec、ask', () => {
    const table = find('m4s2-04-read-write', 1, (q) => q.id.includes(':table-'))
    const w = mount(QuestionRenderer, { props: { question: table } })
    const tp = partOf(table, 'dec-table')
    expect(w.findComponent(PlaceTable).props()).toMatchObject({ top: tp.top, dec: tp.dec, ask: tp.ask })
    expect(w.find('td.point').exists()).toBe(true)
    w.unmount()
  })

  it('这几种图里没有要用数字键盘填的空（键盘题照常画显示框）', () => {
    const q = find('m4s2-04-meaning', 1, (x) => x.input === 'numpad' && x.stem.some((p) => p.kind === 'dec-scale'))
    expect(hasBlank(q)).toBe(false)
  })
})
