// @vitest-environment happy-dom
// 六上「确定位置」的新教具（六年级数学 A）：有序数对方格图（PairGrid）、方向和距离图（BearingMap）、路线图（RouteMap）——
// 格子 / 格点、涂色、字母、地名、射线的方向、刻度、角弧的度数、虚线小十字都照传的画；QuestionRenderer 把字段都转发过去；
// 三个知识点每种题中英文都能渲染。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import PairGrid from '@/components/math/PairGrid.vue'
import BearingMap from '@/components/math/BearingMap.vue'
import RouteMap from '@/components/math/RouteMap.vue'
import type { Question, StemPart } from '@/types/models'

afterEach(() => setLang('zh'))

const nums = (d: string): number[] => [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))
/** 射线 path「M 0 0 L x y」的方向（从北顺时针的度数） */
const azOfRay = (d: string): number => {
  const [, , x, y] = nums(d)
  return Math.round(((Math.atan2(x!, -y!) * 180) / Math.PI + 360) % 360)
}

describe('有序数对方格图（PairGrid）', () => {
  it('座位表：cols × rows 张桌子，涂红的在第 x 列、第 y 行（第 1 行在最下面），下面写「第 1 列」、左边写「第 1 行」', () => {
    const w = mount(PairGrid, { props: { mode: 'cells', cols: 6, rows: 5, seats: true, items: [{ x: 4, y: 3, fill: 'red' }], alt: '座位表' } })
    const desks = w.findAll('rect.desk')
    expect(desks).toHaveLength(30)
    const red = w.find('rect.f-red')
    // 第 4 列：左边有 3 张桌子；第 3 行：下面有 2 行
    const x = Number(red.attributes('x'))
    const y = Number(red.attributes('y'))
    expect(desks.filter((d) => Number(d.attributes('y')) === y && Number(d.attributes('x')) < x)).toHaveLength(3)
    expect(desks.filter((d) => Number(d.attributes('x')) === x && Number(d.attributes('y')) > y)).toHaveLength(2)
    const words = w.findAll('text.axis-word').map((t) => t.text())
    expect(words).toContain('第1列')
    expect(words).toContain('第6列')
    expect(words).toContain('第5行')
    expect(w.attributes('aria-label')).toBe('座位表')
  })

  it('格子柜 / 涂色格：格子连在一起，下面、左边写数；emoji、字母、「?」放在格子里', () => {
    const w = mount(PairGrid, { props: { mode: 'cells', cols: 7, rows: 4, items: [{ x: 2, y: 2, icon: '🍎' }, { x: 5, y: 1, tag: 'B' }, { x: 7, y: 4, ask: true }, { x: 1, y: 1, fill: 'blue' }], alt: '' } })
    expect(w.findAll('rect.cell')).toHaveLength(28)
    expect(w.findAll('rect.f-blue')).toHaveLength(1)
    expect(w.find('text.icon').text()).toBe('🍎')
    expect(w.find('text.cell-tag').text()).toBe('B')
    expect(w.find('text.ask').text()).toBe('?')
    expect(w.findAll('text.axis-num').map((t) => t.text())).toEqual(['1', '2', '3', '4', '5', '6', '7', '1', '2', '3', '4'])
  })

  it('格点：格线、0 到 cols 的数、点和字母、连线、路线、机器人图的投递口和传递口、北、比例尺、对角线', () => {
    const w = mount(PairGrid, {
      props: {
        mode: 'points',
        cols: 10,
        rows: 10,
        axes: true,
        items: [{ x: 5, y: 9, tag: 'A' }, { x: 1, y: 5, name: { k: 'm6.pos.pl.school' } }],
        shapes: [{ pts: [[1, 1], [4, 1], [2, 3]], closed: true }, { pts: [[6, 1], [9, 1], [7, 3]], closed: true, dash: true }],
        route: [[3, 0], [3, 1], [7, 1], [7, 8]],
        marks: [{ x: 2, y: 2, t: 'tri' }, { x: 3, y: 0, t: 'dot', n: 3 }],
        north: true,
        per: '100 m',
        diag: true,
        alt: '方格图',
      },
    })
    expect(w.find('path.grid').exists()).toBe(true)
    expect(w.findAll('path.axis').length).toBeGreaterThanOrEqual(3)
    const xs = w.findAll('text.axis-num').map((t) => t.text())
    // 传递口（红圆里写着 3）那一列不再写横轴的数
    expect(xs.slice(0, 10)).toEqual(['0', '1', '2', '4', '5', '6', '7', '8', '9', '10'])
    expect(w.find('text.tag').text()).toBe('A')
    expect(w.find('text.name').text()).toBe('学校')
    expect(w.findAll('path.shape')).toHaveLength(2)
    expect(w.findAll('path.shape.dash')).toHaveLength(1)
    expect(w.find('path.shape').attributes('d')).toMatch(/Z$/)
    expect(w.find('path.route').exists()).toBe(true)
    expect(w.find('path.route-head').exists()).toBe(true)
    expect(w.findAll('path.tri')).toHaveLength(1)
    expect(w.find('text.port-no').text()).toBe('3')
    expect(w.find('text.compass').text()).toBe('北')
    expect(w.find('text.per').text()).toBe('100 m')
    expect(w.find('path.diag').exists()).toBe(true)
    // 点 A（5，9）在点（1，5）的右上方：x 大、y 小
    const pts = w.findAll('circle.pt')
    expect(Number(pts[0]!.attributes('cx'))).toBeGreaterThan(Number(pts[1]!.attributes('cx')))
    expect(Number(pts[0]!.attributes('cy'))).toBeLessThan(Number(pts[1]!.attributes('cy')))
  })
})

describe('方向和距离图（BearingMap）', () => {
  it('射线的方向对：东偏南 25°、北偏西 40°、正西；刻度按小段画；角弧写度数；名字、北、比例尺', () => {
    const w = mount(BearingMap, {
      props: {
        center: { k: 'm6.pos.pl.rescue' },
        axes: 'n',
        per: '500 m',
        places: [
          { dir: { base: 'e', side: 's', deg: 25 }, segs: 3, name: { k: 'm6.pos.pl.fishing' }, arc: 'base' },
          { dir: { base: 'n', side: 'w', deg: 40 }, segs: 2, tag: 'A', arc: 'other' },
          { dir: { base: 'w' }, segs: 4, name: { k: 'm6.pos.pl.cityhall' } },
        ],
        alt: '方向图',
      },
    })
    const rays = w.findAll('path.ray').map((p) => azOfRay(p.attributes('d')!))
    expect(rays).toEqual([115, 320, 270])
    // 刻度：3 段的画 2 条、2 段的 1 条、4 段的 3 条
    expect(w.findAll('path.tick').map((p) => (p.attributes('d')!.match(/M/g) ?? []).length)).toEqual([2, 1, 3])
    expect(w.findAll('path.arc')).toHaveLength(2)
    expect(w.findAll('text.deg').map((t) => t.text())).toEqual(['25°', '50°'])
    expect(w.findAll('text.name').map((t) => t.text())).toEqual(['渔船', '市政府', '搜救船'])
    expect(w.find('text.tag').text()).toBe('A')
    expect(w.findAll('text.compass').map((t) => t.text())).toEqual(['北'])
    expect(w.find('text.per').text()).toBe('500 m')
    expect(w.find('path.scale').exists()).toBe(true)
    // 射线越长、端点离参照点越远：每段一样长
    const ends = w.findAll('circle.end').map((c) => Math.hypot(Number(c.attributes('cx')), Number(c.attributes('cy'))))
    expect(ends[0]! / 3).toBeCloseTo(ends[1]! / 2, 0)
    expect(w.attributes('aria-label')).toBe('方向图')
  })

  it('东南西北都标、编号的射线（不画刻度和端点，号写在圆牌上）', () => {
    setLang('en')
    const w = mount(BearingMap, {
      props: {
        center: { k: 'm6.pos.pl.island' },
        axes: 'all',
        places: [
          { dir: { base: 'w', side: 'n', deg: 30 }, segs: 3, tag: '1', arc: 'base', ticks: false, dot: false },
          { dir: { base: 'e', side: 's', deg: 20 }, segs: 3, tag: '2', arc: 'base', ticks: false, dot: false },
        ],
      },
    })
    expect(w.findAll('text.compass').map((t) => t.text()).sort()).toEqual(['E', 'N', 'S', 'W'])
    expect(w.findAll('circle.badge')).toHaveLength(2)
    expect(w.findAll('text.badge-txt').map((t) => t.text())).toEqual(['1', '2'])
    expect(w.findAll('circle.end')).toHaveLength(0)
    expect(w.findAll('path.tick')).toHaveLength(0)
    expect(w.find('text.per').exists()).toBe(false)
  })
})

describe('路线图（RouteMap）', () => {
  it('例 5：三段、每个地方一个虚线小十字、起点和终点的角、段旁的距离、名字、北', () => {
    const w = mount(RouteMap, {
      props: {
        figs: [
          {
            start: { k: 'm6.pos.pl.school' },
            legs: [
              { dir: { base: 's', side: 'e', deg: 30 }, segs: 2, to: { k: 'm6.pos.pl.post' }, dist: '200 m', arc: true, back: true },
              { dir: { base: 'e', side: 's', deg: 30 }, segs: 6, to: { k: 'm6.pos.pl.bookstore' }, dist: '600 m', arc: true, back: true },
              { dir: { base: 'e' }, segs: 5.4, to: { k: 'm6.pos.pl.xmHome' }, dist: '540 m', arc: true, back: true },
            ],
          },
        ],
        alt: '路线图',
      },
    })
    // 每段一条线 + 一个箭头
    const legs = w.findAll('path.leg')
    expect(legs).toHaveLength(6)
    const dirs = legs.filter((_, i) => i % 2 === 0).map((p) => {
      const [x1, y1, x2, y2] = nums(p.attributes('d')!)
      return Math.round(((Math.atan2(x2! - x1!, -(y2! - y1!)) * 180) / Math.PI + 360) % 360)
    })
    expect(dirs).toEqual([150, 120, 90])
    // 四个地方各一个虚线小十字（一条 path 里 8 段）
    expect((w.find('path.cross').attributes('d')!.match(/M/g) ?? []).length).toBe(8)
    // 正东那段不画角；前两段起点、终点各一个角
    expect(w.findAll('path.arc')).toHaveLength(4)
    expect(w.findAll('text.deg').map((t) => t.text())).toEqual(['30°', '30°', '30°', '30°'])
    expect(w.findAll('text.dist').map((t) => t.text())).toEqual(['200 m', '600 m', '540 m'])
    expect(w.findAll('text.name').map((t) => t.text())).toEqual(['学校', '邮局', '书店', '小明家'])
    expect(w.find('text.compass').text()).toBe('北')
    expect(w.findAll('circle.spot')).toHaveLength(4)
    expect(w.findAll('.no')).toHaveLength(0)
  })

  it('几幅并排编号；给了 per 画比例尺；540 米这一段最后不满一小段，只画 5 个刻度', () => {
    const fig = {
      start: { k: 'm6.pos.pl.startPt' },
      legs: [
        { dir: { base: 's' as const }, segs: 1, to: { k: 'm6.pos.pl.crossing' } },
        { dir: { base: 's' as const, side: 'w' as const, deg: 30 }, segs: 2, to: { k: 'm6.pos.pl.park' }, arc: true },
      ],
      per: '50 m',
    }
    const w = mount(RouteMap, { props: { figs: [fig, fig, fig], numbered: true } })
    expect(w.findAll('figcaption.no').map((c) => c.text())).toEqual(['1', '2', '3'])
    expect(w.findAll('path.scale')).toHaveLength(3)
    const one = mount(RouteMap, { props: { figs: [{ start: { k: 'm6.pos.pl.bookstore' }, legs: [{ dir: { base: 'e' }, segs: 5.4, to: { k: 'm6.pos.pl.xmHome' } }] }] } })
    expect((one.find('path.tick').attributes('d')!.match(/M/g) ?? []).length).toBe(5)
  })
})

describe('QuestionRenderer 与三个知识点', () => {
  it('把方格图、方向图、路线图的字段转发过去', () => {
    const stem: StemPart[] = [
      { kind: 'pair-grid', mode: 'points', cols: 10, rows: 10, axes: true, items: [{ x: 1, y: 1, tag: 'A' }], shapes: [{ pts: [[1, 1], [2, 2]] }], route: [[1, 0], [1, 1]], marks: [{ x: 2, y: 2, t: 'tri' }], north: true, per: '100 m', diag: true, alt: 'x' },
      { kind: 'pair-grid', mode: 'cells', cols: 3, rows: 2, seats: true, items: [{ x: 1, y: 1, fill: 'red' }], alt: 'y' },
      { kind: 'bearing-map', center: { k: 'm6.pos.pl.school' }, axes: 'all', places: [{ dir: { base: 'n', side: 'e', deg: 30 }, segs: 2, name: { k: 'm6.pos.pl.post' }, arc: 'base' }], per: '200 m', alt: 'z' },
      { kind: 'route-map', figs: [{ start: { k: 'm6.pos.pl.school' }, legs: [{ dir: { base: 'n' }, segs: 2, to: { k: 'm6.pos.pl.park' } }] }, { start: { k: 'm6.pos.pl.school' }, legs: [{ dir: { base: 's' }, segs: 2 }] }], numbered: true, alt: 'w' },
    ]
    const q: Question = { id: 't:1', kpId: 'm6s1-01-pairs', type: 'position', difficulty: 1, input: 'choice', answer: { kind: 'choice', choiceId: 'a' }, choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], stem }
    const r = mount(QuestionRenderer, { props: { question: q } })
    expect(r.find('.pair-grid path.diag').exists()).toBe(true)
    expect(r.find('.pair-grid path.route').exists()).toBe(true)
    expect(r.find('.pair-grid path.tri').exists()).toBe(true)
    expect(r.find('.pair-grid text.per').text()).toBe('100 m')
    expect(r.find('.pair-grid text.compass').exists()).toBe(true)
    expect(r.findAll('.pair-grid path.shape')).toHaveLength(1)
    expect(r.findAll('.pair-grid rect.desk')).toHaveLength(6)
    expect(r.findAll('.pair-grid')[1]!.attributes('aria-label')).toBe('y')
    expect(r.findAll('.bearing-map text.compass')).toHaveLength(4)
    expect(r.find('.bearing-map text.per').text()).toBe('200 m')
    expect(r.find('.bearing-map text.deg').text()).toBe('30°')
    expect(r.findAll('.route-maps figcaption.no')).toHaveLength(2)
    expect(r.find('.route-maps').attributes('aria-label')).toBe('w')
  })

  it('三个知识点每种题中英文都能渲染（不漏词条）', () => {
    for (const kpId of ['m6s1-01-pairs', 'm6s1-01-bearing', 'm6s1-01-route']) {
      const gen = getGenerator(kpId)!
      const seen = new Set<string>()
      for (let seed = 1; seed <= 150; seed++)
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          const kind = q.id.split(':')[1]!.split('-')[0]!
          if (seen.has(kind)) continue
          seen.add(kind)
          for (const lang of ['zh', 'en'] as const) {
            setLang(lang)
            const w = mount(QuestionRenderer, { props: { question: q } })
            expect(w.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
            w.unmount()
            const p = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(p.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
            p.unmount()
          }
          setLang('zh')
        }
      expect(seen.size, kpId).toBeGreaterThanOrEqual(8)
    }
  })
})
