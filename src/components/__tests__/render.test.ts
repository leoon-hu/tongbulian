// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { StemPart } from '@/types/models'
import '@/content/math/grade1' // 副作用：注册生成器与词条
import '@/content/math/grade2'
import { KNOWLEDGE_POINTS as G1 } from '@/content/math/grade1/curriculum'
import { KNOWLEDGE_POINTS as G2 } from '@/content/math/grade2/curriculum'
import { buildSession, createRng, getGenerator, hasGenerator } from '@/engine'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import ClockFace from '@/components/math/ClockFace.vue'
import NumberLine from '@/components/math/NumberLine.vue'
import RulerGauge from '@/components/math/RulerGauge.vue'
import AngleGlyph from '@/components/math/AngleGlyph.vue'
import ShapeGlyph from '@/components/math/ShapeGlyph.vue'
import VerticalForm from '@/components/math/VerticalForm.vue'
import { hasBlank } from '@/components/practice/blank'
import ChoiceCards from '@/components/ui/ChoiceCards.vue'
import NumPad from '@/components/ui/NumPad.vue'
import { setLang } from '@/engine/i18n'

const KNOWLEDGE_POINTS = [...G1, ...G2]
const registered = KNOWLEDGE_POINTS.filter((kp) => hasGenerator(kp.id))

describe('题目渲染冒烟测试（每个知识点用真实题目挂载）', () => {
  for (const kp of registered) {
    it(`${kp.id} 的题干与作答面板都能正常渲染`, () => {
      // 固定种子 × 三档难度，覆盖到该知识点的各种题型分支（只用默认档会漏掉第三档的题型）
      for (const seed of [1, 2, 3, 7, 15, 42]) {
        for (const difficulty of [1, 2, 3] as const) {
          const questions = buildSession(kp.id, 8, { seed, difficulty })
          expect(questions.length).toBeGreaterThan(0)
          for (const q of questions) {
            const stem = mount(QuestionRenderer, { props: { question: q } })
            expect(stem.html().length).toBeGreaterThan(0)
            stem.unmount()

            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            // numpad 或 choice 都应渲染出可点的按钮
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            if (q.input === 'numpad') {
              // 回归：默认布局的键盘外层不能带 grid 类（和内部键盘容器的 .grid 撞名，显示框会跑到键盘旁边）
              const pad = panel.find('.numpad')
              expect(pad.classes()).not.toContain('grid')
              expect(pad.classes()).not.toContain('wide')
              expect(panel.findAll('.numpad > .grid')).toHaveLength(1)
              expect(panel.findAll('.numpad > .display')).toHaveLength(1)
            }
            panel.unmount()
          }
        }
      }
    })
  }
})

describe('十格阵的划掉（回归：QuestionRenderer 必须转发 tenframe 的 taken）', () => {
  it('破十法带图的题：格里划掉减数那几个点、剩下的亮着，外面是个位', () => {
    const gen = getGenerator('s2-02-borrow-sub')!
    let checked = 0
    for (let seed = 1; seed <= 60; seed++) {
      const q = gen(2, createRng(seed))
      const frame = q.stem.find((p) => p.kind === 'tenframe')
      if (!frame || frame.kind !== 'tenframe') continue
      checked += 1
      const w = mount(QuestionRenderer, { props: { question: q } })
      expect(w.findAll('.dot.orange.taken')).toHaveLength(frame.taken!)
      expect(w.findAll('.dot.orange:not(.taken)')).toHaveLength(10 - frame.taken!)
      expect(w.findAll('.dot.blue')).toHaveLength(frame.extra!)
      w.unmount()
    }
    expect(checked).toBeGreaterThan(5)
  })
})

describe('倍的认识的配图（G6：谁的 + 几个一圈）', () => {
  it('每行开头是谁的，第一行一圈，第二行的圈数 = 几倍，每圈 per 个', () => {
    const gen = getGenerator('m2s2-03-times')!
    let checked = 0
    for (let seed = 1; seed <= 80; seed++) {
      const q = gen(1, createRng(seed))
      const pic = q.stem.find((p) => p.kind === 'times-rows')
      if (!pic || pic.kind !== 'times-rows') continue
      checked += 1
      const w = mount(QuestionRenderer, { props: { question: q } })
      const rows = w.findAll('.t-row')
      expect(rows).toHaveLength(2)
      expect(rows.map((r) => r.find('.who').text())).toEqual(pic.rows.map((r) => r.who))
      expect(rows[0]!.findAll('.group')).toHaveLength(1)
      expect(rows[1]!.findAll('.group')).toHaveLength(pic.rows[1]!.count / pic.per)
      for (const g of w.findAll('.group')) expect(g.findAll('.obj')).toHaveLength(pic.per)
      w.unmount()
    }
    expect(checked).toBeGreaterThan(10)
  })
})

describe('答案填在题目里（U5）', () => {
  it('hasBlank：数字键盘题里算式有「?」或有竖式才算；文字题、选择题不算', () => {
    let blanks = 0
    for (const kp of registered) {
      for (const q of buildSession(kp.id, 8, { seed: 3 })) {
        const expected = q.input === 'numpad' && q.stem.some((p) => (p.kind === 'expr' && p.expr.includes('?')) || p.kind === 'vertical')
        expect(hasBlank(q)).toBe(expected)
        if (!expected) continue
        blanks += 1
        // 空只有一个「?」（算式里不会出现两个要填的空）
        const marks = q.stem.filter((p) => p.kind === 'expr').map((p) => (p.kind === 'expr' ? p.expr.split('?').length - 1 : 0))
        expect(marks.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1)
        // 按的数字填进去：算式的空里、竖式的答案行（右对齐）
        const w = mount(QuestionRenderer, { props: { question: q, fill: { value: '12', done: false } } })
        if (marks.some(Boolean)) expect(w.find('.fill-slot').text()).toBe('12')
        if (q.stem.some((p) => p.kind === 'vertical')) {
          const cells = w.findAll('.vertical .answer .typed').map((c) => c.text())
          expect(cells.slice(-2)).toEqual(['1', '2'])
        }
        w.unmount()
      }
    }
    expect(blanks).toBeGreaterThan(20)
  })
  it('不传 fill（对战）原样画「?」，竖式答案行是空的', () => {
    const q = buildSession('m2s2-05-sub', 8, { seed: 1 })[0]!
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.find('.fill-slot').exists()).toBe(false)
    expect(w.findAll('.vertical .answer .typed').every((c) => c.text() === '')).toBe(true)
    w.unmount()
  })
})

describe('数字键盘的两种布局', () => {
  it('默认 3 × 4：1…9 / ⌫ 0 ✓；wide 两行六键：1 2 3 4 5 ⌫ / 6 7 8 9 0 ✓；hideDisplay 不画显示框', () => {
    const grid = mount(NumPad)
    expect(grid.findAll('.key').map((k) => k.text())).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'])
    expect(grid.find('.numpad').classes()).toEqual(['numpad'])
    expect(grid.find('.display').exists()).toBe(true)
    grid.unmount()
    const wide = mount(NumPad, { props: { layout: 'wide', hideDisplay: true } })
    expect(wide.findAll('.key').map((k) => k.text())).toEqual(['1', '2', '3', '4', '5', '⌫', '6', '7', '8', '9', '0', '✓'])
    expect(wide.find('.numpad').classes()).toEqual(['numpad', 'wide'])
    expect(wide.find('.display').exists()).toBe(false)
    wide.unmount()
  })
})

describe('位置：题干方位词与图标轴一致（回归：QuestionRenderer 必须转发 lineup 的 axis）', () => {
  // 每个方位轴：题干+图标里只应出现「本轴」方向字，绝不能混入其它轴的方向字。
  // Lineup 恒渲染两端标签，故「本轴两字都在」即证明图标按正确的轴（横排/竖列）绘制；
  // 「无异轴字」则同时排除了题干用了上下、图标却退回左右这类不一致。
  const AXIS_CHARS: Record<'lr' | 'ud' | 'fb', { own: [string, string]; foreign: string[] }> = {
    lr: { own: ['左', '右'], foreign: ['上', '下', '前', '后'] },
    ud: { own: ['上', '下'], foreign: ['左', '右', '前', '后'] },
    fb: { own: ['前', '后'], foreign: ['左', '右', '上', '下'] },
  }

  it('三轴题目渲染出的方向字都自洽，上下题不再退回左右', () => {
    const gen = getGenerator('s1-00-position')!
    const seen = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const line = q.stem.find((p) => p.kind === 'lineup') as
        | Extract<StemPart, { kind: 'lineup' }>
        | undefined
      if (!line?.axis) continue
      seen.add(line.axis)
      const w = mount(QuestionRenderer, { props: { question: q } })
      const html = w.html()
      const { own, foreign } = AXIS_CHARS[line.axis]
      for (const c of own) expect(html).toContain(c)
      for (const c of foreign) expect(html).not.toContain(c)
      w.unmount()
    }
    // 覆盖到上下前后左右三个轴才算真的锁住
    expect(seen).toEqual(new Set(['lr', 'ud', 'fb']))
  })
})

describe('ClockFace 指针角度不产生 NaN', () => {
  it('各种整时/半时/几时几分都渲染出有效 transform，表盘有 60 个分钟刻度', () => {
    for (const hour of [1, 3, 6, 9, 12]) {
      for (const minute of [0, 30, 5, 47]) {
        const w = mount(ClockFace, { props: { hour, minute } })
        expect(w.html()).not.toContain('NaN')
        expect(w.findAll('.mark')).toHaveLength(60)
        w.unmount()
      }
    }
  })
})

describe('数字键盘位数', () => {
  it('答案是万以内的数时键盘放宽到答案的位数（默认 3 位）', async () => {
    const q = {
      id: 'x:rate',
      kpId: 'm2s2-04-num-10000',
      type: 'count' as const,
      difficulty: 1 as const,
      stem: [{ kind: 'text' as const, text: { k: 'q.num.tenThousands' } }],
      input: 'numpad' as const,
      answer: { kind: 'number' as const, value: 10000 },
    }
    const w = mount(AnswerPanel, { props: { question: q, revealed: null } })
    const key = (d: string) => w.findAll('button.key').find((b) => b.text() === d)!
    for (const d of ['1', '0', '0', '0', '0']) await key(d).trigger('click')
    expect(w.find('.display').text()).toBe('10000')
    w.unmount()

    const small = mount(AnswerPanel, { props: { question: { ...q, answer: { kind: 'number' as const, value: 7 } }, revealed: null } })
    const k2 = (d: string) => small.findAll('button.key').find((b) => b.text() === d)!
    for (const d of ['1', '2', '3', '4']) await k2(d).trigger('click')
    expect(small.find('.display').text()).toBe('123')
    small.unmount()
  })
})

describe('二年级的新教具', () => {
  it('尺子：刻度 0…length 都画出来，线段两端落在刻度上', () => {
    const w = mount(RulerGauge, { props: { length: 10, from: 2, to: 7 } })
    const nums = w.findAll('text.num').map((t) => t.text())
    expect(nums).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    expect(w.findAll('circle.end')).toHaveLength(2)
    expect(w.html()).not.toContain('NaN')
    w.unmount()
  })

  it('角：直角画小方块，其它角画弧；顶点在中心', () => {
    const right = mount(AngleGlyph, { props: { deg: 90, rot: 30, size: 100 } })
    expect(right.find('path.arc').attributes('d')).toMatch(/^M .* L .* L /)
    expect(right.html()).not.toContain('NaN')
    right.unmount()
    const acute = mount(AngleGlyph, { props: { deg: 45, rot: 0, size: 100 } })
    expect(acute.find('path.arc').attributes('d')).toMatch(/ A /)
    expect(acute.findAll('line.ray')).toHaveLength(2)
    acute.unmount()
  })

  it('竖式：数位右对齐、运算符在第二行、结果留空', () => {
    const w = mount(VerticalForm, { props: { a: 345, op: '+', b: 78 } })
    const rows = w.findAll('.row')
    expect(rows).toHaveLength(3)
    expect(rows[0]!.findAll('.digit').map((d) => d.text())).toEqual(['3', '4', '5'])
    expect(rows[1]!.findAll('.digit').map((d) => d.text())).toEqual(['', '7', '8'])
    expect(rows[1]!.find('.op').text()).toBe('+')
    expect(rows[2]!.findAll('.digit.blank')).toHaveLength(3)
    w.unmount()
  })

  it('新图形（五边形 / 六边形 / 梯形 / 直角三角形）都能画', () => {
    for (const shape of ['pentagon', 'hexagon', 'trapezoid', 'right-triangle'] as const) {
      const w = mount(ShapeGlyph, { props: { shape } })
      expect(w.find(`.flat.${shape}`).exists()).toBe(true)
      w.unmount()
    }
  })
})

describe('NumberLine', () => {
  it('重复的标记只画一个（比大小出「=」时 marks 是 [x, x]）', () => {
    const w = mount(NumberLine, { props: { from: 0, to: 50, marks: [30, 30] } })
    expect(w.findAll('.mark')).toHaveLength(1)
    expect(w.html()).not.toContain('NaN')
    w.unmount()
  })

  it('零跨度不会算出 NaN', () => {
    const w = mount(NumberLine, { props: { from: 5, to: 5, marks: [5] } })
    expect(w.html()).not.toContain('NaN')
    w.unmount()
  })
})

describe('拼音注音', () => {
  afterEach(() => setLang('zh'))

  it('中文模式下题干每个汉字都带 <rt> 注音，数字不注', () => {
    const q = buildSession('s1-01-compose-5', 8, { seed: 3 }).find((x) =>
      x.stem.some((p) => p.kind === 'text'),
    )!
    const w = mount(QuestionRenderer, { props: { question: q } })
    const rts = w.findAll('rt').map((r) => r.text())
    expect(rts.length).toBeGreaterThan(0)
    expect(rts).toContain('fēn')
    // 注音都是拼音，不含数字
    for (const rt of rts) expect(rt).toMatch(/^[a-zü\u0100-\u01ff\u00c0-\u00ff]+$/)
    w.unmount()
  })

  it('英文模式下没有注音', () => {
    setLang('en')
    const q = buildSession('s1-01-compose-5', 8, { seed: 3 })[0]!
    const w = mount(QuestionRenderer, { props: { question: q } })
    expect(w.findAll('rt')).toHaveLength(0)
    w.unmount()
  })

  it('选项卡：中文标签注音，emoji / 数字标签不注', () => {
    const w = mount(ChoiceCards, {
      props: {
        choices: [
          { id: 'a', label: { k: 'opt.same' } },
          { id: 'b', label: '🍎' },
          { id: 'c', label: '12' },
          { id: 'd', label: { k: 'money.amount', p: { fen: 650 } } },
        ],
        revealed: null,
      },
    })
    const cards = w.findAll('button')
    expect(cards[0]!.findAll('rt').map((r) => r.text())).toEqual(['yí', 'yàng', 'duō'])
    expect(cards[1]!.findAll('rt')).toHaveLength(0)
    expect(cards[2]!.findAll('rt')).toHaveLength(0)
    expect(cards[3]!.findAll('rt').map((r) => r.text())).toEqual(['yuán', 'jiǎo'])
    w.unmount()
  })
})
