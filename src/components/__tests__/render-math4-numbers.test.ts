// @vitest-environment happy-dom
// 四上「万以上数的认识」的新教具：大数卡（BigNum）、计数器（CounterRods）、算盘（AbacusFrame）、数位顺序表（PlaceTable），
// 先用手写的数据查每个组件画得对，再挂真实题目查 QuestionRenderer 把字段都转发了、改写 / 近似数的空能填。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import BigNum from '@/components/math/BigNum.vue'
import CounterRods from '@/components/math/CounterRods.vue'
import AbacusFrame from '@/components/math/AbacusFrame.vue'
import PlaceTable from '@/components/math/PlaceTable.vue'
import { hasBlank } from '@/components/practice/blank'
import { cnRead, cnWords } from '@/content/math/grade4/generators/numbers'

afterEach(() => setLang('zh'))

/** 去掉拼音（<rt>）后的文字 */
const shown = (w: ReturnType<typeof mount>): string => {
  const el = w.element.cloneNode(true) as HTMLElement
  el.querySelectorAll('rt').forEach((rt) => rt.remove())
  return (el.textContent ?? '').replace(/\s+/g, '')
}

describe('大数卡（BigNum）', () => {
  it('数连写：不分级时一段，分级时从右往左四位一级（25┊0000、460┊0000┊0000），数字一个不少', () => {
    const plain = mount(BigNum, { props: { n: '21893095' } })
    expect(plain.findAll('.lv')).toHaveLength(1)
    expect(plain.findAll('.d').map((d) => d.text()).join('')).toBe('21893095')
    expect(plain.text()).not.toMatch(/[,\s]/)
    plain.unmount()
    const split = mount(BigNum, { props: { n: '46000000000', split: true } })
    expect(split.find('.num').classes()).toContain('split')
    expect(split.findAll('.lv').map((l) => l.text())).toEqual(['460', '0000', '0000'])
    split.unmount()
  })

  it('画横线的数字：只有 marks 里那几位（从左数）', () => {
    const w = mount(BigNum, { props: { n: '690250', split: true, marks: [1, 2] } })
    expect(w.findAll('.d.mark').map((d) => d.text())).toEqual(['9', '0'])
    w.unmount()
  })

  it('右边的「= ?万」：没按是淡色「?」，按了显示数，判完变绿；对战里不传 fill 就画「?」；单位注音', () => {
    const props = { n: '250000', rel: '=' as const, rhs: '?', unit: 'wan' as const }
    const empty = mount(BigNum, { props: { ...props, fill: { value: '', done: false } } })
    expect(empty.find('.slot').text()).toBe('?')
    expect(empty.find('.slot').classes()).toContain('empty')
    expect(empty.find('.rel').text()).toBe('=')
    expect(empty.find('.unit rt').text()).toBe('wàn')
    empty.unmount()
    const typed = mount(BigNum, { props: { ...props, fill: { value: '25', done: false } } })
    expect(typed.find('.slot').text()).toBe('25')
    typed.unmount()
    const done = mount(BigNum, { props: { ...props, fill: { value: '25', done: true } } })
    expect(done.find('.slot').classes()).toContain('done')
    done.unmount()
    const battle = mount(BigNum, { props })
    expect(battle.find('.slot').text()).toBe('?')
    battle.unmount()
  })

  it('比大小：○ 和右边的数（带「万」）；□ 画成空方框；rel 是「?」画虚线方框', () => {
    const w = mount(BigNum, { props: { n: '260800', rel: '○', rhs: '27', unit: 'wan' } })
    expect(shown(w)).toBe('260800○27万')
    w.unmount()
    const box = mount(BigNum, { props: { n: '3562100000', rel: '<', rhs: '□103270000' } })
    expect(box.findAll('.box')).toHaveLength(1)
    expect(shown(box)).toBe('3562100000<103270000')
    box.unmount()
    const rel = mount(BigNum, { props: { n: '182068', rel: '?', rhs: '18', unit: 'wan' } })
    expect(rel.find('.rel-box').exists()).toBe(true)
    expect(rel.find('.rel').exists()).toBe(false)
    rel.unmount()
  })

  it('写作题：卡上写读法，中文注音、英文界面不注音（也是汉字）', () => {
    const words = cnWords(cnRead(20400700))
    const w = mount(BigNum, { props: { words } })
    expect(shown(w)).toBe('二千零四十万零七百')
    expect(w.findAll('.words rt').length).toBe(9)
    w.unmount()
    setLang('en')
    const en = mount(BigNum, { props: { words } })
    expect(en.findAll('rt')).toHaveLength(0)
    expect(en.text()).toBe('二千零四十万零七百')
    en.unmount()
  })
})

describe('计数器（CounterRods）', () => {
  it('9 档：杆数、每根杆上的珠子数；10 颗的那根最上面一颗隔开（满十）', () => {
    const beads = [0, 0, 0, 4, 4, 0, 0, 0, 0]
    const w = mount(CounterRods, { props: { top: 8, beads } })
    const rods = w.findAll('.rod')
    expect(rods).toHaveLength(9)
    expect(rods.map((r) => r.findAll('.bead').length)).toEqual(beads)
    w.unmount()
    const ten = mount(CounterRods, { props: { top: 8, beads: [0, 0, 0, 0, 10, 0, 0, 0, 0] } })
    const cys = ten.findAll('.rod')[4]!.findAll('.bead').map((b) => Number(b.attributes('cy')))
    expect(cys).toHaveLength(10)
    const gaps = cys.slice(1).map((y, i) => cys[i]! - y)
    // 前 9 颗一颗挨一颗，第 10 颗离开一段
    expect(Math.max(...gaps.slice(0, 8))).toBeLessThan(gaps[8]!)
    ten.unmount()
  })

  it('杆下的数位名：中文从亿到个（两个字的上下叠写），英文写位值；12 档从千亿起', () => {
    const w = mount(CounterRods, { props: { top: 8, beads: Array(9).fill(0) } })
    const labels = w.findAll('.rod').map((r) => r.findAll('.label').map((t) => t.text()).join(''))
    expect(labels).toEqual(['亿', '千万', '百万', '十万', '万', '千', '百', '十', '个'])
    expect(w.findAll('.rod')[1]!.findAll('.label')).toHaveLength(2)
    w.unmount()
    const big = mount(CounterRods, { props: { top: 11, beads: Array(12).fill(0) } })
    expect(big.findAll('.rod')[0]!.findAll('.label').map((t) => t.text()).join('')).toBe('千亿')
    big.unmount()
    setLang('en')
    const en = mount(CounterRods, { props: { top: 8, beads: Array(9).fill(0) } })
    expect(en.findAll('.label').map((t) => t.text())).toEqual(['100M', '10M', '1M', '100K', '10K', '1K', '100', '10', '1'])
    en.unmount()
  })
})

describe('算盘（AbacusFrame）', () => {
  it('13 档，每档 2 颗上珠 5 颗下珠；数右对齐，靠梁的珠子数出来就是这一位（上珠一颗当 5）', () => {
    const n = '60470025000'
    const w = mount(AbacusFrame, { props: { n } })
    const rods = w.findAll('.rod')
    expect(rods).toHaveLength(13)
    expect(rods.map((r) => r.attributes('data-digit')).join('')).toBe(n.padStart(13, '0'))
    const beamY = Number(w.find('.beam').attributes('y'))
    const beamH = Number(w.find('.beam').attributes('height'))
    for (const r of rods) {
      const d = Number(r.attributes('data-digit'))
      const ys = r.findAll('.bead').map((b) => Number(b.attributes('cy')))
      expect(ys).toHaveLength(7)
      // 靠梁：上面贴着梁的、下面从梁往下一颗挨一颗的
      const upper = ys.filter((y) => y < beamY && beamY - y < 5)
      const lowerTouching = ys.filter((y) => y > beamY).sort((a, b) => a - b)
      let ones = 0
      for (const y of lowerTouching) if (Math.abs(y - (beamY + beamH + 4.5 + ones * 9)) < 0.01) ones++
      expect(upper.length * 5 + ones, `第 ${r.attributes('data-digit')} 档`).toBe(d)
    }
    expect(w.find('.ones').text()).toBe('个位')
    w.unmount()
  })
})

describe('数位顺序表（PlaceTable）', () => {
  it('亿以内的表（p3）：亿级只有亿位一列，万级、个级各 4 列；打问号的那一列数位和计数单位都是「?」', () => {
    const w = mount(PlaceTable, { props: { top: 8, ask: 4 } })
    expect(w.findAll('.level').map((c) => [c.text(), c.attributes('colspan')])).toEqual([
      ['亿级', '1'],
      ['万级', '4'],
      ['个级', '4'],
    ])
    const places = w.findAll('.places td[data-place]')
    expect(places).toHaveLength(9)
    expect(places.map((c) => c.text())).toEqual(['亿位', '千万位', '百万位', '十万位', '?', '千位', '百位', '十位', '个位'])
    expect(w.findAll('.units .ask')).toHaveLength(1)
    expect(w.find('.units .ask').text()).toBe('?')
    w.unmount()
  })
  it('完整的表（p10）从千亿位起，三级各 4 列；英文写位值', () => {
    const w = mount(PlaceTable, { props: { top: 11 } })
    expect(w.findAll('.level').map((c) => c.attributes('colspan'))).toEqual(['4', '4', '4'])
    expect(w.findAll('.places td[data-place]')[0]!.text()).toBe('千亿位')
    w.unmount()
    setLang('en')
    const en = mount(PlaceTable, { props: { top: 11, ask: 10 } })
    expect(en.findAll('.places td[data-place]').map((c) => c.text())[0]).toBe('100B')
    en.unmount()
  })
})

describe('QuestionRenderer 转发大数卡、计数器、算盘、数位顺序表的全部字段', () => {
  const find = (kpId: string, d: 1 | 2 | 3, ok: (q: Question) => boolean): Question => {
    for (let seed = 1; seed <= 3000; seed++) {
      const q = getGenerator(kpId)!(d, createRng(seed))
      if (ok(q)) return q
    }
    throw new Error(`没找到题：${kpId}`)
  }
  const partOf = <K extends StemPart['kind']>(q: Question, k: K): Extract<StemPart, { kind: K }> => q.stem.find((p) => p.kind === k) as Extract<StemPart, { kind: K }>

  it('大数卡：分级线、横线、读法、右边的符号与单位都画出来', () => {
    const mean = find('m4s1-01-within-yi', 1, (q) => q.id.includes(':mean-') && !!partOf(q, 'big-num')?.split)
    const w = mount(QuestionRenderer, { props: { question: mean } })
    const card = w.findComponent(BigNum)
    const p = partOf(mean, 'big-num')
    expect(card.props()).toMatchObject({ n: p.n, split: true, marks: p.marks })
    expect(w.findAll('.d.mark')).toHaveLength(1)
    w.unmount()

    const write = find('m4s1-01-within-yi', 1, (q) => q.id.includes(':write-'))
    const ww = mount(QuestionRenderer, { props: { question: write } })
    expect(ww.findComponent(BigNum).props('words')).toEqual(partOf(write, 'big-num').words)
    ww.unmount()

    const cmp = find('m4s1-01-compare', 2, (q) => q.id.includes(':cmp-') && !!partOf(q, 'big-num')?.unit)
    const cw = mount(QuestionRenderer, { props: { question: cmp } })
    const cp = partOf(cmp, 'big-num')
    expect(cw.findComponent(BigNum).props()).toMatchObject({ n: cp.n, rel: '○', rhs: cp.rhs, unit: cp.unit })
    cw.unmount()
  })

  it('改写、求近似数：数字键盘题的空在卡上（hasBlank），按的数填进去', () => {
    const q = find('m4s1-01-round', 1, (x) => x.id.includes(':rw-') && x.input === 'numpad')
    expect(hasBlank(q)).toBe(true)
    const w = mount(QuestionRenderer, { props: { question: q, fill: { value: '25', done: false } } })
    expect(w.find('.big-num .slot').text()).toBe('25')
    w.unmount()
    const choice = find('m4s1-01-round', 1, (x) => x.id.includes(':rd-') && x.input === 'choice')
    expect(hasBlank(choice)).toBe(false)
    const read = find('m4s1-01-within-yi', 1, (x) => x.id.includes(':read-'))
    expect(hasBlank(read)).toBe(false)
  })

  it('计数器、算盘、数位顺序表', () => {
    const ctr = find('m4s1-01-within-yi', 1, (q) => q.id.includes(':ctr-'))
    const cw = mount(QuestionRenderer, { props: { question: ctr } })
    expect(cw.findComponent(CounterRods).props()).toMatchObject({ top: 8, beads: partOf(ctr, 'counter').beads })
    cw.unmount()
    const ab = find('m4s1-01-above-yi', 1, (q) => q.id.includes(':abacus-'))
    const aw = mount(QuestionRenderer, { props: { question: ab } })
    expect(aw.findComponent(AbacusFrame).props('n')).toBe(partOf(ab, 'abacus').n)
    aw.unmount()
    const tb = find('m4s1-01-above-yi', 1, (q) => q.id.includes(':table-'))
    const tw = mount(QuestionRenderer, { props: { question: tb } })
    expect(tw.findComponent(PlaceTable).props()).toMatchObject({ top: 11, ask: partOf(tb, 'place-table').ask })
    tw.unmount()
  })
})
