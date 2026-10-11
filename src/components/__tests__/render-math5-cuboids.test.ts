// @vitest-environment happy-dom
// 五下「长方体和正方体」「☆ 探索图形」的新教具：带标注的长方体（BoxFigure）、烧杯（Beaker）、几个编号的展开图（NetSet），
// NetGrid 加的不等宽格子（长方体的展开图）。先用手写的数据查画得对（斜二测、标的字在哪、虚线、红棱、水面、刻度），
// 再挂手搭的题目和真实题目，查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'
import type { BoxSpec, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import BoxFigure from '@/components/math/BoxFigure.vue'
import Beaker from '@/components/math/Beaker.vue'
import NetGrid from '@/components/math/NetGrid.vue'
import NetSet from '@/components/math/NetSet.vue'
import { stemText } from '@/seo/site'

afterEach(() => setLang('zh'))

type Pt = [number, number]
const pts = (el: DOMWrapper<Element>): Pt[] =>
  el
    .attributes('points')!
    .trim()
    .split(/\s+/)
    .map((s) => s.split(',').map(Number) as Pt)
const span = (p: Pt[]): { w: number; h: number } => ({
  w: Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0])),
  h: Math.max(...p.map((q) => q[1])) - Math.min(...p.map((q) => q[1])),
})
const texts = (w: { findAll(s: string): DOMWrapper<Element>[] }): string[] => w.findAll('text').map((t) => t.text())
const num = (el: DOMWrapper<Element>, a: string): number => Number(el.attributes(a))

const question = (stem: StemPart[]): Question => ({ id: 'test:1', kpId: 'test', type: 'solid', difficulty: 1, stem, input: 'numpad', answer: { kind: 'number', value: 1 } })

describe('带标注的长方体（BoxFigure）', () => {
  it('实心的：正面是真正的长方形（长 : 高），顶面、右面往右上斜 45°；三条棱旁写着标的数', () => {
    const w = mount(BoxFigure, { props: { items: [{ l: 6, w: 5, h: 4, labels: { l: '6', w: '5', h: '4' } }] } })
    const front = span(pts(w.find('polygon.front')))
    expect(front.w / front.h).toBeCloseTo(6 / 4, 1)
    const top = pts(w.find('polygon.top'))
    // 顶面：前边就是正面的上边，后边往右、往上挪一样多（45°）
    const dx = span(top).w - front.w
    expect(dx).toBeGreaterThan(0)
    expect(span(top).h).toBeCloseTo(dx, 0)
    expect(span(pts(w.find('polygon.right'))).w).toBeCloseTo(dx, 0)
    expect(texts(w)).toEqual(['6', '5', '4'])
    expect(w.findAll('line.hidden')).toHaveLength(0)
    expect(w.find('svg').classes()).toContain('solid')
    expect(w.find('.boxes').attributes('aria-label')).toBe('长方体')
    w.unmount()
  })

  it('标的字的位置：长在正面底边下面、高在右面的右边、宽在右下', () => {
    const w = mount(BoxFigure, { props: { items: [{ l: 6, w: 5, h: 4, labels: { l: 'L', w: 'W', h: 'H' } }] } })
    const front = pts(w.find('polygon.front'))
    const right = pts(w.find('polygon.right'))
    const [tl, tw, th] = w.findAll('text')
    const bottom = Math.max(...front.map((p) => p[1]))
    expect(num(tl!, 'y')).toBeGreaterThan(bottom)
    expect(num(th!, 'x')).toBeGreaterThan(Math.max(...right.map((p) => p[0])))
    expect(num(tw!, 'x')).toBeGreaterThan(Math.max(...front.map((p) => p[0])))
    expect(num(tw!, 'y')).toBeGreaterThan(Math.min(...right.map((p) => p[1])))
    w.unmount()
  })

  it('线框图：看不见的 3 条棱画虚线，都交于左后下顶点；标红的那条棱在交于右前下顶点的三条里', () => {
    for (const mark of ['l', 'w', 'h'] as const) {
      const w = mount(BoxFigure, { props: { items: [{ l: 3, w: 2, h: 1.6, wire: true, mark }] } })
      const hidden = w.findAll('line.hidden')
      expect(hidden).toHaveLength(3)
      const ends = hidden.map((l) => [`${l.attributes('x1')},${l.attributes('y1')}`, `${l.attributes('x2')},${l.attributes('y2')}`])
      // 三条虚线有一个公共端点（左后下顶点）
      const common = ends[0]!.filter((p) => ends.every((e) => e.includes(p)))
      expect(common).toHaveLength(1)
      const m = w.find('line.mark')
      const front = pts(w.find('polygon.front'))
      const fbr: Pt = [Math.max(...front.map((p) => p[0])), Math.max(...front.map((p) => p[1]))]
      const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((a) => num(m, a))
      if (mark === 'h') expect(x1).toBeCloseTo(x2!, 5)
      if (mark === 'l') expect(y1).toBeCloseTo(y2!, 5)
      if (mark === 'w') expect(x2! - x1!).toBeCloseTo(y1! - y2!, 1)
      // 红棱的一头是右前下顶点
      expect(Math.abs(x1! - fbr[0]) < 0.2 || Math.abs(x2! - fbr[0]) < 0.2).toBe(true)
      expect(w.find('svg').classes()).toContain('wire')
      w.unmount()
    }
  })

  it('涂色的面、没有盖、正方体、面上的小格', () => {
    const w = mount(BoxFigure, { props: { items: [{ l: 4, w: 3, h: 2, face: 'top', open: true, grid: true }] } })
    expect(pts(w.find('polygon.shade'))).toEqual(pts(w.find('polygon.top')))
    expect(w.find('svg').classes()).toContain('open')
    // 每多一格多两根线：(4 − 1) + (3 − 1) + (2 − 1) = 6 组
    expect(w.findAll('line.grid')).toHaveLength(12)
    w.unmount()
    const c = mount(BoxFigure, { props: { items: [{ l: 5, w: 5, h: 5 }] } })
    expect(c.find('.boxes').attributes('aria-label')).toBe('正方体')
    const f = span(pts(c.find('polygon.front')))
    expect(f.w).toBeCloseTo(f.h, 1)
    c.unmount()
  })

  it('悬殊太大的（50 × 25 × 2.5 的游泳池）把短的放长到最长的 0.3 倍', () => {
    const w = mount(BoxFigure, { props: { items: [{ l: 50, w: 25, h: 2.5 }] } })
    const f = span(pts(w.find('polygon.front')))
    expect(f.h / f.w).toBeCloseTo(0.3, 1)
    w.unmount()
  })

  it('装水的容器：前后两个共用一个比例，中间箭头；水面、石头、尺寸线和水深', () => {
    const items: BoxSpec[] = [
      { l: 8, w: 8, h: 10, labels: { l: '8', w: '8' }, water: 7, depth: '7', stone: true },
      { l: 8, w: 8, h: 10, labels: { l: '8', w: '8' }, water: 6, depth: '6' },
    ]
    const w = mount(BoxFigure, { props: { items, arrow: true } })
    const svgs = w.findAll('svg')
    expect(svgs).toHaveLength(2)
    expect(w.find('.arrow').text()).toBe('→')
    expect(svgs[0]!.attributes('viewBox')).toBe(svgs[1]!.attributes('viewBox'))
    expect(w.findAll('polygon.stone')).toHaveLength(1)
    expect(w.findAll('polygon.water-top')).toHaveLength(2)
    // 水深 7 的水面比水深 6 的高
    const surfaceY = (i: number): number => Math.min(...pts(svgs[i]!.find('polygon.water-front')).map((p) => p[1]))
    expect(surfaceY(0)).toBeLessThan(surfaceY(1))
    // 石头在水面下面
    expect(Math.min(...pts(svgs[0]!.find('polygon.stone')).map((p) => p[1]))).toBeGreaterThan(Math.min(...pts(svgs[0]!.find('polygon.water-top')).map((p) => p[1])))
    expect(texts(svgs[0]!)).toEqual(['8', '8', '7'])
    expect(svgs[0]!.findAll('.dim line')).toHaveLength(3)
    expect(svgs[0]!.findAll('line.hidden')).toHaveLength(3)
    expect(w.find('.boxes').attributes('aria-label')).toBe('装水的长方体容器')
    w.unmount()
  })
})

describe('烧杯（Beaker）', () => {
  it('10 小格、每 2 小格标数，最上面写「500 mL」；放进去以后水面高、水底有东西', () => {
    const w = mount(Beaker, { props: { max: 500, items: [{ water: 250 }, { water: 400, thing: 'potato' }], arrow: true } })
    const svgs = w.findAll('svg')
    expect(svgs).toHaveLength(2)
    expect(svgs[0]!.findAll('line.tick')).toHaveLength(10)
    expect(texts(svgs[0]!)).toEqual(['100', '200', '300', '400', '500 mL'])
    const level = (i: number): number => num(svgs[i]!.find('line.surface'), 'y1')
    expect(level(1)).toBeLessThan(level(0))
    // 水面在对应的刻度上：250 在 200 和 300 的长刻度正中间
    const tickY = (v: number): number => num(svgs[0]!.findAll('line.tick')[v / 50 - 1]!, 'y1')
    expect(level(0)).toBeCloseTo((tickY(200) + tickY(300)) / 2, 1)
    expect(svgs[0]!.find('ellipse').exists()).toBe(false)
    const potato = svgs[1]!.find('ellipse.potato')
    expect(num(potato, 'cy') - num(potato, 'ry')).toBeGreaterThan(level(0))
    expect(w.find('.arrow').exists()).toBe(true)
    expect(w.find('.beakers').attributes('aria-label')).toBe('烧杯')
    w.unmount()
  })

  it('1000 毫升的烧杯：每 200 标数；石块、鸡蛋', () => {
    const w = mount(Beaker, { props: { max: 1000, items: [{ water: 600, thing: 'stone' }] } })
    expect(texts(w)).toEqual(['200', '400', '600', '800', '1000 mL'])
    expect(w.find('polygon.stone').exists()).toBe(true)
    w.unmount()
    const e = mount(Beaker, { props: { max: 500, items: [{ water: 300, thing: 'egg' }] } })
    expect(e.find('ellipse.egg').exists()).toBe(true)
    e.unmount()
  })
})

describe('展开图（NetGrid 的不等宽格子、NetSet）', () => {
  it('不传 colW / rowH：和三年级画得一模一样（46 一格、从 3 开始）', () => {
    const w = mount(NetGrid, { props: { cells: [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1, label: '前' }] } })
    const rects = w.findAll('rect')
    expect(rects.map((r) => [num(r, 'x'), num(r, 'y'), num(r, 'width'), num(r, 'height')])).toEqual([
      [49, 3, 46, 46],
      [3, 49, 46, 46],
      [49, 49, 46, 46],
    ])
    expect(w.find('svg').attributes('width')).toBe('98')
    expect(num(w.find('text'), 'font-size')).toBeCloseTo(46 * 0.42, 5)
    w.unmount()
  })

  it('长方体的展开图：每列宽、每行高按长、宽、高画', () => {
    const w = mount(NetGrid, {
      props: {
        cells: [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 0 }, { r: 2, c: 1, label: '1' }, { r: 2, c: 2 }, { r: 3, c: 1 }],
        colW: [0.5, 1.5, 0.5],
        rowH: [1, 0.5, 1, 0.5],
      },
    })
    const rects = w.findAll('rect')
    expect(rects.map((r) => num(r, 'width'))).toEqual([69, 69, 23, 69, 23, 69])
    expect(rects.map((r) => num(r, 'height'))).toEqual([46, 23, 46, 46, 46, 23])
    expect(num(rects[2]!, 'x')).toBe(3)
    expect(num(rects[3]!, 'x')).toBe(3 + 23)
    expect(num(rects[3]!, 'y')).toBe(3 + 46 + 23)
    expect(num(w.find('text'), 'font-size')).toBeCloseTo(46 * 0.42, 5)
    w.unmount()
  })

  it('几个编号的展开图：下面标 1、2、3，共用一个格子大小', () => {
    const items = [
      [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 2, c: 3 }],
      [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 2, c: 1 }],
      [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 2 }, { r: 1, c: 3 }],
    ]
    const w = mount(NetSet, { props: { items } })
    expect(w.findAll('figcaption').map((f) => f.text())).toEqual(['1', '2', '3'])
    const sizes = w.findAll('rect').map((r) => num(r, 'width'))
    expect(new Set(sizes).size).toBe(1)
    // 三个加起来不超过 300 像素宽
    expect(sizes[0]! * 12).toBeLessThanOrEqual(300)
    expect(w.find('.nets').attributes('aria-label')).toBe('正方体的展开图')
    w.unmount()
  })
})

describe('QuestionRenderer 转发全部字段、静态页的文字版', () => {
  it('box / box-net / nets / beaker', () => {
    const box: StemPart = { kind: 'box', items: [{ l: 8, w: 8, h: 10, labels: { l: '8', w: '8' }, water: 7, depth: '7', stone: true }, { l: 8, w: 8, h: 10, water: 6 }], arrow: true }
    const net: StemPart = { kind: 'box-net', cells: [{ r: 0, c: 0, label: '1' }, { r: 0, c: 1, label: '2' }], colW: [2, 0.5], rowH: [1] }
    const nets: StemPart = { kind: 'nets', items: [[{ r: 0, c: 0 }], [{ r: 0, c: 0 }, { r: 0, c: 1 }]] }
    const beaker: StemPart = { kind: 'beaker', max: 500, items: [{ water: 200 }, { water: 350, thing: 'stone' }], arrow: true }
    const w = mount(QuestionRenderer, { props: { question: question([box, net, nets, beaker]) } })
    const bf = w.findComponent(BoxFigure)
    expect(bf.props('items')).toEqual((box as { items: BoxSpec[] }).items)
    expect(bf.props('arrow')).toBe(true)
    const grids = w.findAllComponents(NetGrid)
    expect(grids[0]!.props('colW')).toEqual([2, 0.5])
    expect(grids[0]!.props('rowH')).toEqual([1])
    expect(grids[0]!.props('cells')).toHaveLength(2)
    expect(w.findComponent(NetSet).props('items')).toHaveLength(2)
    const bk = w.findComponent(Beaker)
    expect(bk.props('max')).toBe(500)
    expect(bk.props('items')).toEqual([{ water: 200 }, { water: 350, thing: 'stone' }])
    expect(bk.props('arrow')).toBe(true)
    w.unmount()
    expect(stemText(box)).toContain('水深标着 7')
    expect(stemText(box)).toContain('水底有一块石头')
    expect(stemText(net)).toBe('（长方体的展开图，格子大小不一样：12）')
    expect(stemText(nets)).toBe('（正方体的展开图　①■　②■■）')
    expect(stemText(beaker)).toBe('（500 毫升的烧杯：水面在 200 毫升 → 水面在 350 毫升，水底有一个石块）')
    // 标数按位置说，不说长、宽、高（有的题问的就是这个）
    expect(stemText({ kind: 'box', items: [{ l: 6, w: 5, h: 4, labels: { l: '6', w: '5', h: '4' }, mark: 'h', wire: true }] })).toBe(
      '（长方体：正面的底边标着 6，右下往后斜的那条棱标着 5，右前竖着的那条棱标着 4；看不见的棱画成虚线，右前竖着的那条棱画成红色）',
    )
  })

  it('真实题目：每个知识点每一档挂几道，中英文都不漏词条', () => {
    for (const kp of ['m5s2-03-know', 'm5s2-03-net', 'm5s2-03-surface', 'm5s2-03-volume-unit', 'm5s2-03-volume', 'm5s2-03-rate', 'm5s2-03-capacity', 'm5s2-03-irregular', 'm5s2-04-explore']) {
      const gen = getGenerator(kp)!
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 8; seed++)
          for (const d of [1, 2, 3] as const) {
            const q = gen(d, createRng(seed * 13 + d))
            const w = mount(QuestionRenderer, { props: { question: q } })
            expect(w.html(), q.id).not.toMatch(/\bm5\.(cube|explore)\.|undefined|NaN/)
            w.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.text(), q.id).not.toMatch(/\bm5\.(cube|explore)\.|undefined|NaN/)
            panel.unmount()
            for (const part of q.stem) expect(stemText(part), q.id).not.toMatch(/undefined|NaN|\bm5\./)
          }
      }
    }
  })
})
