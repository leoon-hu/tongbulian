// @vitest-environment happy-dom
// 五下「因数和倍数」「怎样通知最快」「找次品」的新教具（五年级数学 F）：百数表（HundredChart）、数字卡片（CodeStrip 的 cards）、
// 摆奇偶的小方块（TileGrid 的 size / odd、PairTiles）、天平（BalanceScale）、通知示意图（NotifyTree）。
// 先用手写的数据查每个组件画得对，再挂真实题目查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import HundredChart from '@/components/math/HundredChart.vue'
import CodeStrip from '@/components/math/CodeStrip.vue'
import TileGrid from '@/components/math/TileGrid.vue'
import PairTiles from '@/components/math/PairTiles.vue'
import BalanceScale from '@/components/math/BalanceScale.vue'
import NotifyTree from '@/components/math/NotifyTree.vue'
import hundredSource from '@/components/math/HundredChart.vue?raw'
import balanceSource from '@/components/math/BalanceScale.vue?raw'
import notifySource from '@/components/math/NotifyTree.vue?raw'
import pairSource from '@/components/math/PairTiles.vue?raw'

afterEach(() => setLang('zh'))

describe('百数表（HundredChart）', () => {
  it('0–49：50 格、每行 10 个；圈、框、去掉的数各画各的', () => {
    const fives = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]
    const twos = Array.from({ length: 25 }, (_, i) => 2 * i)
    const w = mount(HundredChart, { props: { start: 0, count: 50, circled: fives, boxed: twos, crossed: [1, 49] } })
    const cells = w.findAll('g.cell')
    expect(cells).toHaveLength(50)
    expect(cells[0]!.find('text').text()).toBe('0')
    expect(cells[49]!.find('text').text()).toBe('49')
    expect(w.findAll('circle.ring')).toHaveLength(10)
    expect(w.findAll('rect.box')).toHaveLength(25)
    expect(w.findAll('line.cross')).toHaveLength(2)
    expect(w.findAll('g.cell.crossed').map((c) => c.attributes('data-n'))).toEqual(['1', '49'])
    // 第 11 个数（10）在第二行第一格：和第一格同一列
    expect(cells[10]!.find('rect.bg').attributes('x')).toBe(cells[0]!.find('rect.bg').attributes('x'))
    expect(Number(cells[10]!.find('rect.bg').attributes('y'))).toBeGreaterThan(Number(cells[0]!.find('rect.bg').attributes('y')))
    // 一格 30、两边各留 2：10 列宽 304，5 行高 154
    expect(w.find('svg').attributes('viewBox')).toBe('0 0 304 154')
    w.unmount()
  })

  it('1–100 的质数表：100 格，最后一格是 100（三位数字小一号）', () => {
    const w = mount(HundredChart, { props: { start: 1, count: 100 } })
    expect(w.findAll('g.cell')).toHaveLength(100)
    expect(w.findAll('text.num').at(-1)!.text()).toBe('100')
    expect(w.findAll('text.num.small')).toHaveLength(1)
    w.unmount()
  })
})

describe('数字卡片（CodeStrip 的 cards）', () => {
  it('每个数字一张卡片、不画括号；「?」那张是虚线空卡', () => {
    const w = mount(CodeStrip, { props: { digits: '24?', cards: true } })
    expect(w.find('.code-strip.cards').exists()).toBe(true)
    expect(w.findAll('.cell').map((c) => c.text())).toEqual(['2', '4', '?'])
    expect(w.findAll('.cell.ask')).toHaveLength(1)
    expect(w.find('.brace').exists()).toBe(false)
    w.unmount()
  })

  it('不传 cards：号码条和原来一样（不是卡片，「?」也不是空卡）', () => {
    const w = mount(CodeStrip, { props: { digits: '100080', segs: [3, 3] } })
    expect(w.find('.code-strip.cards').exists()).toBe(false)
    expect(w.findAll('.brace')).toHaveLength(2)
    expect(w.findAll('.cell.ask')).toHaveLength(0)
    w.unmount()
  })
})

describe('小方块（TileGrid 的 size / odd、PairTiles）', () => {
  it('不传新参数：和原来一样（46px、rows × cols 个、没有黄块）', () => {
    const w = mount(TileGrid, { props: { rows: 2, cols: 3 } })
    expect(w.findAll('.tile')).toHaveLength(6)
    expect(w.findAll('.tile.odd')).toHaveLength(0)
    expect(w.find('.tiles').attributes('style')).toContain('grid-template-columns: repeat(3, 46px)')
    w.unmount()
  })

  it('odd：右下角多一个黄块（2 排 × 2 列 + 1 = 5 个），黄块在第 3 列第 2 排', () => {
    const w = mount(TileGrid, { props: { rows: 2, cols: 2, size: 18, odd: true } })
    expect(w.findAll('.tile')).toHaveLength(5)
    const odd = w.find('.tile.odd')
    expect(odd.attributes('style')).toContain('grid-row: 2')
    expect(odd.attributes('style')).toContain('grid-column: 3')
    expect(w.find('.tiles').attributes('style')).toContain('grid-template-columns: repeat(3, 18px)')
    expect(w.find('.tiles.small').exists()).toBe(true)
    w.unmount()
    // 1 个：只有一个黄块，在下面一排
    const one = mount(TileGrid, { props: { rows: 2, cols: 0, size: 18, odd: true } })
    expect(one.findAll('.tile')).toHaveLength(1)
    expect(one.find('.tile.odd').attributes('style')).toContain('grid-row: 2')
    one.unmount()
  })

  it('PairTiles：两堆中间写「+」，奇数堆有黄块、偶数堆没有', () => {
    const w = mount(PairTiles, { props: { groups: [3, 4] } })
    expect(w.findAll('.tiles')).toHaveLength(2)
    expect(w.findAll('.plus').map((p) => p.text())).toEqual(['+'])
    expect(w.findAll('.tile')).toHaveLength(7)
    expect(w.findAll('.tile.odd')).toHaveLength(1)
    w.unmount()
  })
})

describe('天平（BalanceScale）', () => {
  const itemY = (w: ReturnType<typeof mount>, side: 'l' | 'r'): number => Number(w.find(`.item.side-${side} .thing`).attributes(w.find(`.item.side-${side} rect`).exists() ? 'y' : 'cy'))

  it('平衡：两边一样高；左边低：左边的东西比右边的低（y 大）；旁边的东西在地上', () => {
    const level = mount(BalanceScale, { props: { left: ['1'], right: ['2'], aside: ['3'], tilt: 'level' } })
    expect(level.findAll('.item')).toHaveLength(3)
    expect(level.findAll('.item text').map((t) => t.text())).toEqual(['1', '2', '3'])
    expect(itemY(level, 'l')).toBeCloseTo(itemY(level, 'r'))
    level.unmount()
    const left = mount(BalanceScale, { props: { left: ['1'], right: ['2'], tilt: 'left' } })
    expect(itemY(left, 'l')).toBeGreaterThan(itemY(left, 'r') + 10)
    expect(left.find('figure').attributes('data-tilt')).toBe('left')
    left.unmount()
    const right = mount(BalanceScale, { props: { left: ['1'], right: ['2'], tilt: 'right' } })
    expect(itemY(right, 'l')).toBeLessThan(itemY(right, 'r') - 10)
    right.unmount()
  })

  it('零件画圆圈、钙片画方块；8 个零件（2，2 | 4 个在旁边）都画出来，旁边一排最多 4 个', () => {
    const w = mount(BalanceScale, { props: { left: ['1', '2'], right: ['3', '4'], aside: ['5', '6', '7', '8'], shape: 'ball' } })
    expect(w.findAll('circle.thing')).toHaveLength(8)
    expect(w.findAll('rect.thing')).toHaveLength(0)
    const asideY = w.findAll('.item.side-a circle').map((c) => c.attributes('cy'))
    expect(new Set(asideY).size).toBe(1)
    w.unmount()
    const box = mount(BalanceScale, { props: { left: ['1'], right: ['2'], shape: 'box' } })
    expect(box.findAll('rect.thing')).toHaveLength(2)
    box.unmount()
  })
})

describe('通知示意图（NotifyTree）', () => {
  it('分组：老师 1 个、各组第一个人 3 个、组员 12 个，线 15 条（课本分 3 组）', () => {
    const w = mount(NotifyTree, { props: { mode: 'group', groups: 3, per: 4 } })
    expect(w.findAll('.node.teacher')).toHaveLength(1)
    expect(w.findAll('.node.g1')).toHaveLength(3)
    expect(w.findAll('.node.g2')).toHaveLength(12)
    expect(w.findAll('line.edge')).toHaveLength(15)
    w.unmount()
  })

  it('接力：画到第 3 分钟是 1 + 2 + 4 个人，圈里写第几分钟；画到第 4 分钟 15 个人', () => {
    const w = mount(NotifyTree, { props: { mode: 'double', minutes: 3 } })
    const mins = w.findAll('text.minute').map((t) => Number(t.text()))
    expect(mins.sort()).toEqual([1, 2, 2, 3, 3, 3, 3])
    expect(w.findAll('line.edge')).toHaveLength(7)
    expect(w.findAll('.node.teacher')).toHaveLength(1)
    w.unmount()
    const four = mount(NotifyTree, { props: { mode: 'double', minutes: 4 } })
    expect(four.findAll('text.minute')).toHaveLength(15)
    four.unmount()
  })
})

describe('对战 / 打怪兽的窄栏：图跟着栏宽缩（max-width: 100%）', () => {
  it('四个新组件的外框和 svg 都有 max-width: 100%', () => {
    for (const src of [hundredSource, balanceSource, notifySource]) {
      expect(src).toMatch(/svg \{[^}]*max-width: 100%/)
      expect(src).toMatch(/height: auto/)
    }
    expect(pairSource).toMatch(/max-width: 100%/)
  })
})

describe('真实题目：QuestionRenderer 把新部件的字段都转发了', () => {
  function find(kpId: string, kind: StemPart['kind']): Question {
    const gen = getGenerator(kpId)!
    for (let seed = 1; seed <= 400; seed++)
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        if (q.stem.some((p) => p.kind === kind)) return q
      }
    throw new Error(`${kpId} 找不到 ${kind}`)
  }

  it('百数表：圈、框、去掉的数都画出来', () => {
    for (const kp of ['m5s2-02-two-five', 'm5s2-02-three', 'm5s2-02-prime']) {
      const q = find(kp, 'hundred-chart')
      const part = q.stem.find((p) => p.kind === 'hundred-chart') as Extract<StemPart, { kind: 'hundred-chart' }>
      const w = mount(QuestionRenderer, { props: { question: q } })
      expect(w.findAll('.hundred-chart g.cell'), q.id).toHaveLength(part.count)
      expect(w.findAll('circle.ring'), q.id).toHaveLength(part.circled?.length ?? 0)
      expect(w.findAll('rect.box'), q.id).toHaveLength(part.boxed?.length ?? 0)
      expect(w.findAll('line.cross'), q.id).toHaveLength(part.crossed?.length ?? 0)
      w.unmount()
    }
  })

  it('数字卡片、小方块、天平、通知图', () => {
    const cards = find('m5s2-02-three', 'digit-cards')
    const digits = (cards.stem.find((p) => p.kind === 'digit-cards') as Extract<StemPart, { kind: 'digit-cards' }>).digits
    let w = mount(QuestionRenderer, { props: { question: cards } })
    expect(w.findAll('.code-strip.cards .cell').map((c) => c.text()).join('')).toBe(digits)
    w.unmount()

    const tiles = find('m5s2-02-parity', 'pair-tiles')
    const groups = (tiles.stem.find((p) => p.kind === 'pair-tiles') as Extract<StemPart, { kind: 'pair-tiles' }>).groups
    w = mount(QuestionRenderer, { props: { question: tiles } })
    expect(w.findAll('.pair-tiles .tile')).toHaveLength(groups.reduce((a, b) => a + b, 0))
    w.unmount()

    const scale = find('m5s2-10-defective', 'balance')
    const b = scale.stem.find((p) => p.kind === 'balance') as Extract<StemPart, { kind: 'balance' }>
    w = mount(QuestionRenderer, { props: { question: scale } })
    expect(w.find('.balance-scale').attributes('data-tilt')).toBe(b.tilt ?? 'level')
    expect(w.findAll('.balance-scale .item')).toHaveLength(b.left.length + b.right.length + (b.aside?.length ?? 0))
    expect(w.findAll(b.shape === 'ball' ? 'circle.thing' : 'rect.thing').length).toBeGreaterThan(0)
    w.unmount()

    for (const mode of ['group', 'double'] as const) {
      const gen = getGenerator('m5s2-08-notify')!
      let q: Question | undefined
      for (let seed = 1; seed <= 400 && !q; seed++) {
        const x = gen(1, createRng(seed))
        if (x.stem.some((p) => p.kind === 'notify-tree' && p.mode === mode)) q = x
      }
      const part = q!.stem.find((p) => p.kind === 'notify-tree') as Extract<StemPart, { kind: 'notify-tree' }>
      w = mount(QuestionRenderer, { props: { question: q! } })
      expect(w.find('.notify-tree').attributes('data-mode')).toBe(mode)
      if (mode === 'group') expect(w.findAll('.node.g2')).toHaveLength(part.groups! * part.per!)
      else expect(w.findAll('text.minute')).toHaveLength(2 ** part.minutes! - 1)
      w.unmount()
    }
  })
})
