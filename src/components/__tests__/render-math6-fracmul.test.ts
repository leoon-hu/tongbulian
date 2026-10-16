// @vitest-environment happy-dom
// 六上「分数乘法」（六年级数学 B）的教具：长方形面积图（FracArea）与多行线段图（FracBars）——分数除法、百分数也用。
// 先用手写的数据查画得照课本：乘法的格子图（斜线 = 第一个乘数、交叉线 = 积、虚线 = 不算在这块地里）、除法的面积条（上面几条虚线、
// 按条 / 按列涂色、左右括号）；线段图的刻度、虚线段、只括一部分的括号（同一边重叠的往外排一层）、灰色与红色的竖虚线。
// 再查 QuestionRenderer 把字段都转发了，挂真实题目查七个知识点中英文都能渲染。
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { BarRow, Question, StemPart } from '@/types/models'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import FracArea from '@/components/math/FracArea.vue'
import FracBars from '@/components/math/FracBars.vue'

afterEach(() => setLang('zh'))

type AreaProps = InstanceType<typeof FracArea>['$props']
const area = (props: AreaProps): VueWrapper => mount(FracArea, { props })
const cellsOf = (w: VueWrapper, cls: string): [number, number][] =>
  w.findAll(`rect.cell${cls}`).map((c) => [Number(c.attributes('data-r')), Number(c.attributes('data-c'))] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
const num = (w: { attributes: (k: string) => string | undefined }, k: string): number => Number(w.attributes(k))
/** FracArea 里长方形的大小（viewBox 单位） */
const RW = 168
const RH = 120

describe('长方形面积图（FracArea）：乘法的格子图', () => {
  it('做一做 1 ②：3 行 × 5 列，上面 2 行斜线、其中左边 4 列交叉——10 格斜线、8 格是积，没有虚线格', () => {
    const w = area({ rows: 3, cols: 5, first: { along: 'row', n: 2 }, second: { n: 4 } })
    expect(w.findAll('rect.cell')).toHaveLength(15)
    expect(w.findAll('rect.cell.first')).toHaveLength(10)
    expect(cellsOf(w, '.prod')).toEqual([[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]])
    expect(w.findAll('rect.cell.dash')).toHaveLength(0)
    expect(w.find('path.hatch.first').attributes('d')).toMatch(/^M/)
    expect(w.find('path.hatch.prod').attributes('d')).toMatch(/^M/)
    // 外框是整个长方形
    const o = w.find('rect.outline')
    expect(num(o, 'width')).toBeCloseTo(RW, 0)
    expect(num(o, 'height')).toBeCloseTo(RH, 0)
    expect(w.find('svg').attributes('aria-label')).toBe('长方形面积图')
    w.unmount()
  })

  it('做一做 1 ③：第一个乘数是列（左边 3 列），积是这 3 列里上面 3 行：9 格', () => {
    const w = area({ rows: 4, cols: 4, first: { along: 'col', n: 3 }, second: { n: 3 } })
    expect(w.findAll('rect.cell.first')).toHaveLength(12)
    const prod = cellsOf(w, '.prod')
    expect(prod).toHaveLength(9)
    expect(prod.every(([r, c]) => r < 3 && c < 3)).toBe(true)
    w.unmount()
  })

  it('练习五 1（1）：左边 5 列是柳树和桃树，积是最下面一行（second.from = end）', () => {
    const w = area({ rows: 4, cols: 6, first: { along: 'col', n: 5 }, second: { n: 1, from: 'end' } })
    expect(cellsOf(w, '.prod')).toEqual([[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]])
    w.unmount()
  })

  it('例 2（2）：4/5 公顷的 2/3——第 5 行画虚线（ghost），斜线 12 格、积 8 格，粗外框只框住 4 行', () => {
    const w = area({ rows: 5, cols: 3, first: { along: 'row', n: 4 }, second: { n: 2 }, ghost: 1 })
    expect(cellsOf(w, '.dash')).toEqual([[4, 0], [4, 1], [4, 2]])
    expect(w.findAll('rect.cell.first')).toHaveLength(12)
    expect(w.findAll('rect.cell.prod')).toHaveLength(8)
    expect(num(w.find('rect.outline'), 'height')).toBeCloseTo((RH * 4) / 5, 0)
    // 虚线格不画斜线、不算积
    expect(w.findAll('rect.cell.dash.first')).toHaveLength(0)
    w.unmount()
  })

  it('first 是列时 ghost 是最后几列', () => {
    const w = area({ rows: 2, cols: 4, first: { along: 'col', n: 3 }, ghost: 1 })
    expect(cellsOf(w, '.dash')).toEqual([[0, 3], [1, 3]])
    w.unmount()
  })
})

describe('长方形面积图（FracArea）：除法的面积条', () => {
  it('分数除法例 1 左图：5 条、下面 4 条实线（最上面一条虚线），涂下面 2 条，左边括号括住 4 条写 4/5', () => {
    const w = area({ rows: 5, cols: 1, solid: 4, shade: { along: 'row', cells: [0, 1] }, braces: [{ side: 'left', from: 0, to: 4, label: '4/5' }] })
    expect(cellsOf(w, '.dash')).toEqual([[0, 0]])
    expect(cellsOf(w, '.shade')).toEqual([[3, 0], [4, 0]])
    const b = w.find('g.area-brace.left')
    expect(b.exists()).toBe(true)
    expect(b.find('text.num').text()).toBe('4')
    expect(b.find('text.den').text()).toBe('5')
    // 括号在长方形左边，上下括住实线的 4 条
    const o = w.find('rect.outline')
    const left = num(o, 'x')
    const xs = (b.find('path.brace').attributes('d') ?? '').match(/[\d.]+/g)!.map(Number).filter((_, i) => i % 2 === 0)
    expect(Math.max(...xs)).toBeLessThan(left + 0.5)
    expect(num(o, 'height')).toBeCloseTo((RH * 4) / 5, 0)
    w.unmount()
  })

  it('右图：竖着分 2 列、涂右边一列——只涂实线的 4 格，上面的虚线格不涂', () => {
    const w = area({ rows: 5, cols: 2, solid: 4, shade: { along: 'col', cells: [1] } })
    expect(cellsOf(w, '.shade')).toEqual([[1, 1], [2, 1], [3, 1], [4, 1]])
    expect(cellsOf(w, '.dash')).toEqual([[0, 0], [0, 1]])
    w.unmount()
  })

  it('右边的括号与「?」；英文界面的读屏文字', () => {
    setLang('en')
    const w = area({ rows: 3, cols: 1, solid: 2, braces: [{ side: 'right', from: 0, to: 3, label: '?' }, { side: 'left', from: 0, to: 2, label: '12' }] })
    expect(w.find('svg').attributes('aria-label')).toBe('area model')
    expect(w.find('g.area-brace.right text.ask').text()).toBe('?')
    expect(w.find('g.area-brace.left text.lab').text()).toBe('12')
    w.unmount()
  })
})

describe('多行线段图（FracBars）', () => {
  const bars = (unit: number, rows: BarRow[], guides?: boolean | number[]): VueWrapper => mount(FracBars, { props: { unit, rows, ...(guides === undefined ? {} : { guides }) } })
  const ticksX = (row: VueWrapper['element'] | undefined): number[] => [...(row as SVGGElement).querySelectorAll('line.tick')].map((l) => Number(l.getAttribute('x1')))

  it('例 6：原来 4 段（上括号 100），现在 4 段、第 4 段虚线（下括号 ?、上括号 1/4），竖虚线对着第 3 个分点', () => {
    const w = bars(
      4,
      [
        { name: '原来', len: 4, braces: [{ from: 0, to: 4, side: 'top', label: '100' }] },
        { name: '现在', len: 4, dash: [3, 4], braces: [{ from: 0, to: 3, side: 'bottom', label: '?' }, { from: 3, to: 4, side: 'top', label: '1/4' }] },
      ],
      true,
    )
    const rows = w.findAll('g.bar-row')
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.find('text.name').text())).toEqual(['原来', '现在'])
    const t0 = ticksX(rows[0]!.element)
    expect(t0).toHaveLength(5)
    expect(ticksX(rows[1]!.element)).toEqual(t0)
    // 虚线段从第 3 个分点到右端
    const dash = rows[1]!.find('line.seg.dash')
    expect(num(dash, 'x1')).toBeCloseTo(t0[3]!, 1)
    expect(num(dash, 'x2')).toBeCloseTo(t0[4]!, 1)
    expect(rows[0]!.find('line.seg.dash').exists()).toBe(false)
    // 括号上的字：100、?、两层的 1/4
    expect(rows[0]!.find('g.bar-brace.top text.lab').text()).toBe('100')
    expect(rows[1]!.find('g.bar-brace.bottom text.ask').text()).toBe('?')
    expect(rows[1]!.find('g.bar-brace.top text.num').text()).toBe('1')
    expect(rows[1]!.find('g.bar-brace.top text.den').text()).toBe('4')
    // 灰色竖虚线一条，对着原来的第 3 个分点
    const g = w.findAll('line.guide')
    expect(g).toHaveLength(1)
    expect(g[0]!.classes()).not.toContain('red')
    expect(num(g[0]!, 'x1')).toBeCloseTo(t0[3]!, 1)
    expect(w.find('svg').attributes('aria-label')).toBe('线段图')
    w.unmount()
  })

  it('练习五 1（2）：苹果 4 段；桃是苹果的 3/4、自己平均分 6 段；橘子是桃的 5/6——长短成比例，竖虚线对着短的那条的右端', () => {
    const w = bars(
      4,
      [
        { name: '苹果', len: 4, braces: [{ from: 0, to: 4, side: 'top', label: '160' }] },
        { name: '桃', len: 3, parts: 6 },
        { name: '橘子', len: 2.5, parts: 1, braces: [{ from: 0, to: 2.5, side: 'bottom', label: '?' }] },
      ],
      true,
    )
    const rows = w.findAll('g.bar-row')
    const apple = ticksX(rows[0]!.element)
    const peach = ticksX(rows[1]!.element)
    const orange = ticksX(rows[2]!.element)
    expect(apple).toHaveLength(5)
    expect(peach).toHaveLength(7)
    expect(orange).toHaveLength(2)
    // 桃的右端对着苹果的第 3 个分点，橘子的右端对着桃的第 5 个分点
    expect(peach[6]!).toBeCloseTo(apple[3]!, 1)
    expect(orange[1]!).toBeCloseTo(peach[5]!, 1)
    const guides = w.findAll('line.guide').map((l) => num(l, 'x1'))
    expect(guides).toHaveLength(2)
    expect(guides[0]!).toBeCloseTo(apple[3]!, 1)
    expect(guides[1]!).toBeCloseTo(peach[5]!, 1)
    w.unmount()
  })

  it('练习五 4（1）：梅花比兰花多一段——括号两端也画刻度（梅花只分 1 段，刻度在 0、3、4）', () => {
    const w = bars(
      3,
      [
        { name: '兰花', len: 3, braces: [{ from: 0, to: 3, side: 'top', label: '60' }] },
        { name: '梅花', len: 4, parts: 1, braces: [{ from: 3, to: 4, side: 'top', label: '1/3' }, { from: 0, to: 4, side: 'bottom', label: '?' }] },
      ],
      true,
    )
    const rows = w.findAll('g.bar-row')
    const lan = ticksX(rows[0]!.element)
    const mei = ticksX(rows[1]!.element)
    expect(mei).toHaveLength(3)
    expect(mei[1]!).toBeCloseTo(lan[3]!, 1)
    expect(num(w.find('line.guide'), 'x1')).toBeCloseTo(lan[3]!, 1)
    w.unmount()
  })

  it('同一边重叠的两个括号分两层：长的那个离线更远', () => {
    const w = bars(6, [{ name: '女生', len: 6, parts: 6, braces: [{ from: 0, to: 6, side: 'bottom', label: '180' }, { from: 0, to: 5, side: 'bottom', label: '?' }] }])
    const bs = w.findAll('g.bar-brace.bottom')
    expect(bs).toHaveLength(2)
    const yOf = (b: (typeof bs)[number]): number => Number((b.find('path.brace').attributes('d') ?? '').match(/Q[\d.]+ ([\d.]+)/)![1])
    // 第一个（0–6）是长的：在外层
    expect(yOf(bs[0]!)).toBeGreaterThan(yOf(bs[1]!))
    w.unmount()
  })

  it('百分数例 3 的增长线段图：guides 给数组——红色竖虚线在原计划的右端，从第一行拉到最后一行；不画灰色的', () => {
    const w = bars(12, [
      { name: '原计划', len: 12, parts: 1, braces: [{ from: 0, to: 12, side: 'bottom', label: '12' }] },
      { name: '实际', len: 14, parts: 1, braces: [{ from: 12, to: 14, side: 'top', label: '?' }, { from: 0, to: 14, side: 'bottom', label: '14' }] },
    ], [12])
    const rows = w.findAll('g.bar-row')
    const plan = ticksX(rows[0]!.element)
    expect(plan).toHaveLength(2)
    expect(ticksX(rows[1]!.element)).toHaveLength(3) // 0、12（括号的一端）、14
    const g = w.findAll('line.guide')
    expect(g).toHaveLength(1)
    expect(g[0]!.classes()).toContain('red')
    expect(num(g[0]!, 'x1')).toBeCloseTo(plan[1]!, 1)
    const lineY = (r: number): number => num(rows[r]!.find('line.seg'), 'y1')
    expect(num(g[0]!, 'y1')).toBeLessThan(lineY(0))
    expect(num(g[0]!, 'y2')).toBeGreaterThan(lineY(1))
    w.unmount()
  })

  it('分数除法例 2 的两条线：每小段一样长、左端对齐；名字长（2021年利润）时线往右让', () => {
    const w = bars(5, [
      { name: '砂糖', len: 5, braces: [{ from: 0, to: 5, side: 'bottom', label: '?' }] },
      { name: '牛奶', len: 4, braces: [{ from: 0, to: 1, side: 'top', label: '?' }, { from: 0, to: 4, side: 'bottom', label: '160' }] },
    ], true)
    const rows = w.findAll('g.bar-row')
    const s = ticksX(rows[0]!.element)
    const m = ticksX(rows[1]!.element)
    expect(s).toHaveLength(6)
    expect(m).toEqual(s.slice(0, 5))
    w.unmount()
    const long = bars(5, [{ name: '2021年利润', len: 6, parts: 1 }, { name: '2020年利润', len: 5 }])
    const x0 = num(long.find('line.seg'), 'x1')
    expect(x0).toBeGreaterThan(8 + 4 * 9 + 3 * 15)
    long.unmount()
  })
})

describe('QuestionRenderer 把两种图的字段都转发了', () => {
  const q = (stem: StemPart[]): Question => ({ id: 't', kpId: 't', type: 'frac-calc', difficulty: 1, stem, input: 'numpad', answer: { kind: 'number', value: 1 } })
  it('frac-area：rows、cols、first、second、ghost、solid、shade、braces', () => {
    const part = {
      kind: 'frac-area' as const,
      rows: 5,
      cols: 3,
      first: { along: 'row' as const, n: 4 },
      second: { n: 2, from: 'end' as const },
      ghost: 1,
      solid: 5,
      shade: { along: 'col' as const, cells: [0] },
      braces: [{ side: 'left' as const, from: 0, to: 5, label: '1' }],
    }
    const w = mount(QuestionRenderer, { props: { question: q([part]) } })
    const { kind: _k, ...fields } = part
    expect(w.findComponent(FracArea).props()).toEqual(fields)
    w.unmount()
  })
  it('frac-bars：unit、rows、guides（true 与数组）', () => {
    const rows: BarRow[] = [{ name: '原来', len: 4, parts: 4, dash: [3, 4], braces: [{ from: 0, to: 4, side: 'top', label: '100' }] }]
    for (const guides of [true, [2, 3]] as const) {
      const w = mount(QuestionRenderer, { props: { question: q([{ kind: 'frac-bars', unit: 4, rows, guides: guides as boolean | number[] }]) } })
      expect(w.findComponent(FracBars).props()).toEqual({ unit: 4, rows, guides })
      w.unmount()
    }
  })
})

describe('分数乘法的真实题目：七个知识点中英文都能渲染，图的字段原样转发', () => {
  const KPS = ['m6s1-02-frac-int', 'm6s1-02-num-frac', 'm6s1-02-frac-frac', 'm6s1-02-dec-frac', 'm6s1-02-laws', 'm6s1-02-chain', 'm6s1-02-more-less']
  it('每个知识点三档各挂一批：题干、作答面板都不露键名；格子图 / 线段图收到的字段和题干一致', async () => {
    await import('@/content/math/grade6')
    const { createRng, getGenerator } = await import('@/engine')
    const AnswerPanel = (await import('@/components/practice/AnswerPanel.vue')).default
    let areas = 0
    let bars = 0
    for (const lang of ['zh', 'en'] as const) {
      setLang(lang)
      for (const kp of KPS) {
        const gen = getGenerator(kp)!
        for (let seed = 1; seed <= 40; seed++) {
          for (const d of [1, 2, 3] as const) {
            const q = gen(d, createRng(seed))
            const fig = q.stem.find((p) => p.kind === 'frac-area' || p.kind === 'frac-bars')
            if (!fig && seed > 6) continue
            const w = mount(QuestionRenderer, { props: { question: q } })
            expect(w.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
            if (fig?.kind === 'frac-area') {
              areas++
              const { kind: _k, ...fields } = fig
              expect(w.findComponent(FracArea).props(), q.id).toEqual({ first: undefined, second: undefined, ghost: undefined, solid: undefined, shade: undefined, braces: undefined, ...fields })
              expect(w.findAll('rect.cell').length, q.id).toBe(fig.rows * fig.cols)
              expect(w.find('svg.frac-area').attributes('aria-label'), q.id).toBe(lang === 'zh' ? '长方形面积图' : 'area model')
            }
            if (fig?.kind === 'frac-bars') {
              bars++
              expect(w.findComponent(FracBars).props('rows'), q.id).toEqual(fig.rows)
              expect(w.findAll('g.bar-row').length, q.id).toBe(fig.rows.length)
              // 图里的名字按语言写（中文「原来」、英文「Before」……），不露键名
              expect(w.findAll('text.name').map((t) => t.text()).join(''), q.id).not.toMatch(/m6\./)
            }
            w.unmount()
            if (seed <= 2) {
              const p = mount(AnswerPanel, { props: { question: q, revealed: null } })
              expect(p.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
              p.unmount()
            }
          }
        }
      }
    }
    expect(areas).toBeGreaterThan(20)
    expect(bars).toBeGreaterThan(10)
  })
})
