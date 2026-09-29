// @vitest-environment happy-dom
// 三上「多位数乘一位数」「☆ 数字编码」的教具：十块条（TenBlocks）、号码条（CodeStrip），以及 QuestionRenderer 是否把字段都转发过去。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import TenBlocks from '@/components/math/TenBlocks.vue'
import CodeStrip from '@/components/math/CodeStrip.vue'
import { ID_NAMES, ID_SEGS } from '@/content/math/grade3/generators/coding'

afterEach(() => setLang('zh'))

const ID = '440524188001010014'
/** 号码条里每一格的数字（去掉「第几位」的小字） */
const cellDigits = (w: ReturnType<typeof mount>): string =>
  w
    .findAll('.cell')
    .map((c) => c.text().replace(c.find('.pos').exists() ? c.find('.pos').text() : '', ''))
    .join('')

describe('十块条（TenBlocks）', () => {
  it('组数、十块条的根数、小方块的个数都对', () => {
    const w = mount(TenBlocks, { props: { groups: 3, tens: 1, ones: 2 } })
    expect(w.findAll('.group')).toHaveLength(3)
    expect(w.findAll('.rod')).toHaveLength(3)
    expect(w.findAll('.cube.one')).toHaveLength(6)
    // 一根十块条上有 9 道分隔线（10 个小方块）
    expect(w.findAll('.rod')[0]!.findAll('.seam')).toHaveLength(9)
  })
  it('整十数没有小方块；viewBox 随组数变宽', () => {
    const a = mount(TenBlocks, { props: { groups: 2, tens: 3, ones: 0 } })
    const b = mount(TenBlocks, { props: { groups: 5, tens: 3, ones: 0 } })
    expect(a.findAll('.cube.one')).toHaveLength(0)
    expect(a.findAll('.rod')).toHaveLength(6)
    const width = (w: ReturnType<typeof mount>): number => Number(w.find('svg').attributes('viewBox')!.split(' ')[2])
    expect(width(b)).toBeGreaterThan(width(a))
  })
})

describe('号码条（CodeStrip）', () => {
  it('不分段：一段、没有括号、没有名字', () => {
    const w = mount(CodeStrip, { props: { digits: ID } })
    expect(cellDigits(w)).toBe(ID)
    expect(w.findAll('.seg')).toHaveLength(1)
    expect(w.findAll('.brace')).toHaveLength(0)
    expect(w.findAll('.names')).toHaveLength(0)
  })

  it('分段并标名字：四段四个括号，名字分两行、注音、各用一种颜色', () => {
    const w = mount(CodeStrip, { props: { digits: ID, segs: ID_SEGS, names: ID_NAMES } })
    expect(cellDigits(w)).toBe(ID)
    expect(w.findAll('.seg').map((s) => s.findAll('.cell').length)).toEqual(ID_SEGS)
    expect(w.findAll('.brace')).toHaveLength(4)
    expect(w.findAll('.names')).toHaveLength(2)
    const names = w.findAll('.name')
    expect(names.map((n) => n.text().replace(/[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\s]/g, ''))).toEqual(['地址码', '顺序码', '出生日期码', '校验码'])
    expect(w.findAll('.name rt').length).toBeGreaterThan(0)
    // 每段颜色不同
    const classes = w.findAll('.seg').map((s) => s.classes().find((c) => /^c\d$/.test(c)))
    expect(new Set(classes).size).toBe(4)
    // 最后一段只有一位：名字贴着右边
    const lastSlot = w.findAll('.names')[1]!.findAll('.slot').at(-1)!
    expect(lastSlot.classes()).toContain('al-end')
  })

  it('英文界面的名字不注音', () => {
    setLang('en')
    const w = mount(CodeStrip, { props: { digits: ID, segs: ID_SEGS, names: ID_NAMES } })
    expect(w.findAll('.name rt')).toHaveLength(0)
    expect(w.text()).toContain('date-of-birth code')
  })

  it('标出一段：只有那一段是橙色，没有名字', () => {
    const w = mount(CodeStrip, { props: { digits: ID, segs: ID_SEGS, mark: 1 } })
    const segs = w.findAll('.seg')
    expect(segs.filter((s) => s.classes().includes('marked'))).toHaveLength(1)
    expect(segs[1]!.classes()).toContain('marked')
    expect(segs.filter((s) => s.classes().includes('plain'))).toHaveLength(3)
    expect(w.findAll('.name')).toHaveLength(0)
  })

  it('标出一位：那一格上面写它是第几位', () => {
    const w = mount(CodeStrip, { props: { digits: ID, segs: ID_SEGS, cell: 16 } })
    const hot = w.findAll('.cell.hot')
    expect(hot).toHaveLength(1)
    expect(hot[0]!.find('.pos').text()).toBe('17')
    expect(w.find('.code-strip').classes()).toContain('has-cell')
    expect(cellDigits(w)).toBe(ID)
  })

  it('一格的宽按位数算（CSS 变量里带着位数）；fit 让短的号码按长的算，上下两个格子一样大', () => {
    const long = mount(CodeStrip, { props: { digits: ID } })
    const short = mount(CodeStrip, { props: { digits: '448268' } })
    const fitted = mount(CodeStrip, { props: { digits: '110105491231002', fit: 18 } })
    expect(long.find('.code-strip').attributes('style')).toContain('--n: 18')
    expect(short.find('.code-strip').attributes('style')).toContain('--n: 6')
    expect(fitted.find('.code-strip').attributes('style')).toContain('--n: 18')
    // 外面包一层容器（格子宽按它的宽算）
    expect(long.find('.code-wrap > .code-strip').exists()).toBe(true)
  })
})

describe('QuestionRenderer 转发新教具的全部字段', () => {
  const q = (stem: StemPart[]): Question => ({ id: 't', kpId: 't', type: 'code', difficulty: 1, stem, input: 'numpad', answer: { kind: 'number', value: 1 } })

  it('号码条：digits / segs / names / mark / cell / fit', () => {
    const w = mount(QuestionRenderer, {
      props: { question: q([{ kind: 'code-strip', digits: ID, segs: ID_SEGS, names: ['', ID_NAMES[1]!, '', ''], mark: 2, cell: 16, fit: 20 }]) },
    })
    expect(w.find('.code-strip').attributes('style')).toContain('--n: 20')
    expect(cellDigits(w)).toBe(ID)
    expect(w.findAll('.brace')).toHaveLength(4)
    expect(w.findAll('.name')).toHaveLength(1)
    expect(w.findAll('.seg')[2]!.classes()).toContain('marked')
    expect(w.findAll('.cell.hot')).toHaveLength(1)
  })

  it('十块条：groups / tens / ones', () => {
    const w = mount(QuestionRenderer, { props: { question: q([{ kind: 'blocks', groups: 4, tens: 2, ones: 1 }]) } })
    expect(w.findAll('.group')).toHaveLength(4)
    expect(w.findAll('.rod')).toHaveLength(8)
    expect(w.findAll('.cube.one')).toHaveLength(4)
  })
})

describe('真实题目：号码条画的就是题目里的号码，十块条对得上算式', () => {
  it('数字编码与多位数乘一位数的题都能渲染（中英文）', () => {
    for (const kp of ['m3s1-05-oral-mul', 'm3s1-05-written-mul', 'm3s1-05-zero-mul', 'm3s1-05-estimate', 'm3s1-06-digit-code']) {
      const gen = getGenerator(kp)!
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 12; seed++) {
          for (const d of [1, 2, 3] as const) {
            const question = gen(d, createRng(seed * 13 + d))
            const w = mount(QuestionRenderer, { props: { question } })
            const strips = question.stem.filter((p) => p.kind === 'code-strip') as Extract<StemPart, { kind: 'code-strip' }>[]
            expect(w.findAll('.code-strip')).toHaveLength(strips.length)
            if (strips.length === 1) expect(cellDigits(w), question.id).toBe(strips[0]!.digits)
            const blocks = question.stem.find((p) => p.kind === 'blocks') as Extract<StemPart, { kind: 'blocks' }> | undefined
            if (blocks) expect(w.findAll('.group')).toHaveLength(blocks.groups)
            expect(w.text(), question.id).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN/)
            w.unmount()
            const panel = mount(AnswerPanel, { props: { question, revealed: null } })
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            panel.unmount()
          }
        }
      }
    }
  })
})
