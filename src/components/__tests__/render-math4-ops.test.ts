// @vitest-environment happy-dom
// 四下「四则运算」「运算律」的教具：线段图（PartLine，例 1 西宁—格尔木—拉萨、例 3 的 A—E 骑行路线）、树状图（CalcTree，练习三 2），
// 以及用到的现成教具：竖式 25 × 12（第二行照这本课本写 250、和上一行右对齐）、L 形菜地（GeoFigure）。
// 先用手写的数据查画得对，再挂真实题目查 QuestionRenderer 把字段都转发了、按的数填进树状图的「?」。
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Question, TreeStep } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import PartLine from '@/components/math/PartLine.vue'
import CalcTree from '@/components/math/CalcTree.vue'
import { hasBlank } from '@/components/practice/blank'

afterEach(() => setLang('zh'))

const sample = (kp: string, pred: (q: Question) => boolean): Question => {
  const gen = getGenerator(kp)!
  for (let seed = 1; seed < 3000; seed++) {
    for (const d of [1, 2, 3] as const) {
      const q = gen(d, createRng(seed))
      if (pred(q)) return q
    }
  }
  throw new Error(`${kp} 找不到要的题`)
}

/** 线段图上某个分点的 x（刻度线） */
const ticks = (w: VueWrapper): number[] => w.findAll('line.tick').map((l) => Number(l.attributes('x1')))

describe('线段图（PartLine）', () => {
  it('例 1：两段上面各一个大括号写数，整条下面的大括号写「?」，三个点下面写地名', () => {
    const w = mount(PartLine, {
      props: {
        parts: [
          { len: 814, label: '814 km' },
          { len: 1142, label: '1142 km' },
        ],
        total: '?',
        names: [{ k: 'm4.ops.place.xining' }, { k: 'm4.ops.place.geermu' }, { k: 'm4.ops.place.lasa' }],
      },
    })
    expect(w.findAll('text.label').map((t) => t.text())).toEqual(['814 km', '1142 km'])
    expect(w.find('text.total').text()).toBe('?')
    expect(w.find('text.total').classes()).toContain('ask')
    expect(w.findAll('text.name').map((t) => t.text())).toEqual(['西宁', '格尔木', '拉萨'])
    // 两段两个大括号 + 下面一个
    expect(w.findAll('path.brace')).toHaveLength(3)
    // 三个分点，后一段比前一段长（按 814 : 1142 画）
    const [x0, x1, x2] = ticks(w)
    expect(x1! - x0!).toBeLessThan(x2! - x1!)
    // 读屏只说是线段图，不说数
    expect(w.find('svg').attributes('aria-label')).toBe('线段图')
    w.unmount()
  })

  it('不知道的那一段写「?」；没有 total 就不画下面的大括号；没有名字就不写', () => {
    const w = mount(PartLine, { props: { parts: [{ len: 5, label: '?' }, { len: 7, label: '7 km' }] } })
    expect(w.findAll('text.label')[0]!.classes()).toContain('ask')
    expect(w.find('text.total').exists()).toBe(false)
    expect(w.findAll('path.brace')).toHaveLength(2)
    expect(w.find('text.name').exists()).toBe(false)
    w.unmount()
  })

  it('很短的一段也拉到最小宽度（写得下字），四段的路线 A—E 每段都放得下', () => {
    const w = mount(PartLine, { props: { parts: [{ len: 1, label: '1 km' }, { len: 99, label: '99 km' }] } })
    const [x0, x1, x2] = ticks(w)
    expect((x1! - x0!) / (x2! - x0!)).toBeGreaterThanOrEqual(0.29)
    w.unmount()
    const four = mount(PartLine, {
      props: { parts: [115, 132, 118, 85].map((x) => ({ len: x, label: `${x} km` })), total: '?', names: ['A', 'B', 'C', 'D', 'E'] },
    })
    const xs = ticks(four)
    expect(xs).toHaveLength(5)
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(50)
    expect(four.findAll('text.name').map((t) => t.text())).toEqual(['A', 'B', 'C', 'D', 'E'])
    four.unmount()
  })

  it('英文：地名换成英文', () => {
    setLang('en')
    const w = mount(PartLine, { props: { parts: [{ len: 1, label: '?' }, { len: 1, label: '?' }], names: [{ k: 'm4.ops.place.xining' }, { k: 'm4.ops.place.geermu' }, { k: 'm4.ops.place.lasa' }] } })
    expect(w.findAll('text.name').map((t) => t.text())).toEqual(['Xining', 'Golmud', 'Lhasa'])
    w.unmount()
  })
})

describe('树状图（CalcTree）', () => {
  // 练习三 2 的左图：128 + 147 → □；□ ÷ 25 → □；320 × □ → □
  const steps: TreeStep[] = [
    { op: '+', v: '275' },
    { op: '÷', n: '25', v: '' },
    { op: '×', n: '320', left: true, v: '?' },
  ]
  const boxes = (w: VueWrapper): { x: number; y: number; text: string; cls: string[] }[] =>
    w.findAll('g.box').map((g) => {
      const r = g.find('rect')
      return { x: Number(r.attributes('x')) + Number(r.attributes('width')) / 2, y: Number(r.attributes('y')), text: g.find('text').text(), cls: g.classes() }
    })

  it('两个数在最上面，往下三层得数框；新加的数和上一步的得数框在同一层、在它左边或右边', () => {
    const w = mount(CalcTree, { props: { a: '128', b: '147', steps } })
    const bs = boxes(w)
    // 128、147、275、25、空框、320、?
    expect(bs.map((b) => b.text)).toEqual(['128', '147', '275', '25', '', '320', '?'])
    const at = (t: string): { x: number; y: number } => bs.find((b) => b.text === t)!
    expect(at('128').y).toBe(at('147').y)
    expect(at('275').y).toBeGreaterThan(at('128').y)
    // 25 在 275 右边、同一层；320 在第二步的得数框左边、同一层
    expect(at('25').y).toBe(at('275').y)
    expect(at('25').x).toBeGreaterThan(at('275').x)
    const second = bs[4]!
    expect(at('320').y).toBe(second.y)
    expect(at('320').x).toBeLessThan(second.x)
    // 每一步两条斜线、一个运算符号
    expect(w.findAll('line.edge')).toHaveLength(6)
    expect(w.findAll('text.op').map((t) => t.text())).toEqual(['+', '÷', '×'])
    expect(bs.filter((b) => b.cls.includes('ask'))).toHaveLength(1)
    expect(w.find('svg').attributes('aria-label')).toBe('树状图')
    w.unmount()
  })

  it('练习页把按的数填进「?」那一格，判完变成 done', () => {
    const w = mount(CalcTree, { props: { a: '128', b: '147', steps, fill: { value: '3520', done: false } } })
    const ask = w.find('g.box.ask')
    expect(ask.text()).toBe('3520')
    expect(ask.classes()).toContain('filled')
    w.unmount()
    const d = mount(CalcTree, { props: { a: '128', b: '147', steps, fill: { value: '3520', done: true } } })
    expect(d.find('g.box.ask').classes()).toContain('done')
    d.unmount()
  })
})

describe('QuestionRenderer 转发新教具的全部字段（真实题目）', () => {
  it('例 1 的铁路题：线段图的段、总数、地名都转发；文字题照常用显示框（hasBlank 为假）', () => {
    const q = sample('m4s2-01-addsub', (x) => x.stem.some((p) => p.kind === 'part-line') && x.input === 'numpad')
    const part = q.stem.find((p) => p.kind === 'part-line')!
    const w = mount(QuestionRenderer, { props: { question: q } })
    const pl = w.findComponent(PartLine)
    expect(pl.exists()).toBe(true)
    expect(pl.props()).toEqual({ parts: part.parts, total: part.total, names: part.names })
    expect(hasBlank(q)).toBe(false)
    w.unmount()
  })

  it('树状图填框：转发 a、b、steps；按的数填进「?」；hasBlank 为真', () => {
    const q = sample('m4s2-01-brackets', (x) => x.input === 'numpad' && x.stem.some((p) => p.kind === 'calc-tree' && p.steps.some((s) => s.v === '?')))
    const part = q.stem.find((p) => p.kind === 'calc-tree')!
    expect(hasBlank(q)).toBe(true)
    const w = mount(QuestionRenderer, { props: { question: q, fill: { value: '42', done: false } } })
    const tree = w.findComponent(CalcTree)
    expect(tree.props('a')).toBe(part.a)
    expect(tree.props('b')).toBe(part.b)
    expect(tree.props('steps')).toEqual(part.steps)
    expect(w.find('g.box.ask').text()).toBe('42')
    w.unmount()
    // 对战里不传 fill：画「?」
    const b = mount(QuestionRenderer, { props: { question: q } })
    expect(b.find('g.box.ask').text()).toBe('?')
    b.unmount()
  })

  it('选综合算式的树状图（选项题）：框都空着，没有「?」', () => {
    const q = sample('m4s2-01-brackets', (x) => x.input === 'choice' && x.stem.some((p) => p.kind === 'calc-tree'))
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.find('g.box.ask').exists()).toBe(false)
    expect(w.findAll('g.box.empty')).toHaveLength(3)
    w.unmount()
  })

  it('例 3 的骑行路线：A—E 四段的线段图', () => {
    const q = sample('m4s2-03-add-apply', (x) => x.stem.some((p) => p.kind === 'part-line'))
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.findAll('.part-line text.name').map((t) => t.text())).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(w.findAll('.part-line text.label')).toHaveLength(4)
    w.unmount()
  })

  it('做一做的竖式 25 × 12：第二行写出末尾的 0（和第一行右对齐），积在最下面', () => {
    const q = sample('m4s2-03-distrib', (x) => x.stem.some((p) => p.kind === 'mul-vertical'))
    const v = q.stem.find((p) => p.kind === 'mul-vertical')!
    const w = mount(QuestionRenderer, { props: { question: q } })
    const rows = w.findAll('.vertical .row').map((r) => r.findAll('.digit').map((c) => c.text()).join(''))
    expect(rows[2]).toBe(String(v.a * (v.b - 10)))
    expect(rows[3]).toBe(String(v.a * 10))
    expect(rows[4]).toBe(String(v.a * v.b))
    // 右对齐：两行的最后一格都有数（第二行没有往左移一位）
    const lastCell = (k: number): string => w.findAll('.vertical .part')[k]!.findAll('.digit').at(-1)!.text()
    expect(lastCell(0)).not.toBe('')
    expect(lastCell(1)).toBe('0')
    w.unmount()
  })

  it('练习八 8 的菜地：L 形图上标着四条边的长度（单位 m）', () => {
    const q = sample('m4s2-03-mul-apply', (x) => x.stem.some((p) => p.kind === 'geo'))
    const w = mount(QuestionRenderer, { props: { question: q } })
    const labels = w.findAll('text').map((t) => t.text()).filter((t) => / m$/.test(t))
    expect(labels).toHaveLength(4)
    w.unmount()
  })
})

describe('两个单元每个知识点的题都能渲染（中英文，三档各几道）', () => {
  for (const kp of ['m4s2-01-addsub', 'm4s2-01-muldiv', 'm4s2-01-brackets', 'm4s2-01-solve', 'm4s2-03-add-laws', 'm4s2-03-add-apply', 'm4s2-03-mul-laws', 'm4s2-03-distrib', 'm4s2-03-mul-apply']) {
    it(kp, () => {
      const gen = getGenerator(kp)!
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 6; seed++) {
          for (const d of [1, 2, 3] as const) {
            const q = gen(d, createRng(seed * 13 + d))
            const stem = mount(QuestionRenderer, { props: { question: q } })
            expect(stem.text(), q.id).not.toMatch(/\bm4\.[a-zA-Z]|undefined|NaN/)
            stem.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.text(), q.id).not.toMatch(/\bm4\.[a-zA-Z]|undefined|NaN/)
            panel.unmount()
          }
        }
      }
    })
  }
})
