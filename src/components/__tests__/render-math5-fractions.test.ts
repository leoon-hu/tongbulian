// @vitest-environment happy-dom
// 五下「分数的意义和性质」的新教具（五年级数学 H）：分数链（FracChain，分数的基本性质例 1 的箭头图、例 2、约分、通分、假分数化带分数）、
// 集合图（VennSets，最大公因数 / 最小公倍数例 1）。先用手写的数据查画得对，再挂真实题目查 QuestionRenderer 把字段都转发了、
// 按的数填进分数链的「?」。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import FracChain from '@/components/math/FracChain.vue'
import VennSets from '@/components/math/VennSets.vue'
import FracShape from '@/components/math/FracShape.vue'
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
const sigOf = (q: Question): string => q.id.slice(q.kpId.length + 1)

describe('分数链（FracChain）', () => {
  it('例 1：1/2 = 2/4 = 4/8，两条分数线、两个「=」；分子在分数线上面、分母在下面', () => {
    const w = mount(FracChain, { props: { terms: [{ n: '1', d: '2' }, { t: '=' }, { n: '2', d: '4' }, { t: '=' }, { n: '4', d: '8' }] } })
    expect(w.findAll('line.bar')).toHaveLength(3)
    expect(w.findAll('text.sign').map((t) => t.text())).toEqual(['=', '='])
    const bars = w.findAll('line.bar').map((b) => Number(b.attributes('y1')))
    const nums = w.findAll('text.num').map((t) => Number(t.attributes('y')))
    const dens = w.findAll('text.den').map((t) => Number(t.attributes('y')))
    expect(w.findAll('text.num').map((t) => t.text())).toEqual(['1', '2', '4'])
    expect(w.findAll('text.den').map((t) => t.text())).toEqual(['2', '4', '8'])
    for (let i = 0; i < 3; i++) {
      expect(nums[i]!).toBeLessThan(bars[i]!)
      expect(dens[i]!).toBeGreaterThan(bars[i]!)
    }
    // 不朗读：读屏只说是分数算式
    expect(w.attributes('aria-label')).toBe('分数算式')
    w.unmount()
  })

  it('弧形箭头：分子上方写 top、分母下方写 bottom，「?」画成框，按的数填进所有「?」', () => {
    const terms = [{ n: '2', d: '3' }, { t: '=' }, { n: '8', d: '12' }]
    const w = mount(FracChain, { props: { terms, arcs: [{ from: 0, to: 2, top: '×?', bottom: '×?' }] } })
    expect(w.findAll('.arc .curve')).toHaveLength(2)
    expect(w.findAll('.arc .head')).toHaveLength(2)
    expect(w.findAll('.ask')).toHaveLength(2)
    expect(w.findAll('.ask text').map((t) => t.text())).toEqual(['?', '?'])
    // 上面那条在分子上方、下面那条在分母下方
    const bar = Number(w.find('line.bar').attributes('y1'))
    const ys = w.findAll('.arc .curve').map((c) => Number(/^M[\d.]+ ([\d.]+)/.exec(c.attributes('d')!)![1]))
    expect(ys[0]!).toBeLessThan(bar - 20)
    expect(ys[1]!).toBeGreaterThan(bar + 20)
    w.unmount()
    const f = mount(FracChain, { props: { terms, arcs: [{ from: 0, to: 2, top: '×?', bottom: '×?' }], fill: { value: '4', done: false } } })
    expect(f.findAll('.ask text').map((t) => t.text())).toEqual(['4', '4'])
    expect(f.findAll('.ask.filled')).toHaveLength(2)
    f.unmount()
    const done = mount(FracChain, { props: { terms, arcs: [{ from: 0, to: 2, top: '×?' }], fill: { value: '4', done: true } } })
    expect(done.find('.ask').classes()).toContain('done')
    done.unmount()
  })

  it('带分数：整数部分写在分数左边、和分子分母一样大，竖直居中在分数线上；分子要填', () => {
    const w = mount(FracChain, { props: { terms: [{ n: '7', d: '3' }, { t: '=' }, { w: '2', n: '?', d: '3' }] } })
    const whole = w.find('.whole text')
    expect(whole.text()).toBe('2')
    const bars = w.findAll('line.bar')
    expect(bars).toHaveLength(2)
    // 整数部分在第二条分数线左边，基线在分子、分母之间
    expect(Number(whole.attributes('x'))).toBeLessThan(Number(bars[1]!.attributes('x1')))
    const y = Number(whole.attributes('y'))
    expect(y).toBeGreaterThan(Number(bars[1]!.attributes('y1')))
    expect(y).toBeLessThan(Number(w.findAll('text.den')[1]!.attributes('y')))
    expect(w.findAll('.ask')).toHaveLength(1)
    w.unmount()
  })

  it('真实题目：QuestionRenderer 把分数链的项和箭头都转发了，练习页把按的数填进「?」（数字键盘题）', () => {
    const q = sample('m5s2-05-property', (x) => sigOf(x).startsWith('arc-'))
    const ch = q.stem.find((p) => p.kind === 'frac-chain')!
    expect(q.input).toBe('numpad')
    expect(hasBlank(q)).toBe(true)
    const w = mount(QuestionRenderer, { props: { question: q, fill: { value: '3', done: false } } })
    const chain = w.findComponent(FracChain)
    expect(chain.exists()).toBe(true)
    expect(chain.props('terms')).toEqual((ch as { terms: unknown }).terms)
    expect(chain.props('arcs')).toEqual((ch as { arcs: unknown }).arcs)
    expect(chain.findAll('.ask text').map((t) => t.text())).toEqual(['3', '3'])
    w.unmount()
    // 对战里不传 fill：画「?」
    const b = mount(QuestionRenderer, { props: { question: q } })
    expect(b.findComponent(FracChain).findAll('.ask text').every((t) => t.text() === '?')).toBe(true)
    b.unmount()
  })

  it('真实题目：假分数化带分数（分数链里的带分数）、通分（下面的箭头写着分母乘几）', () => {
    const m = sample('m5s2-05-mixed', (x) => sigOf(x).startsWith('mixp-w-'))
    const w = mount(QuestionRenderer, { props: { question: m } })
    expect(w.findComponent(FracChain).find('.whole .ask').exists()).toBe(true)
    w.unmount()
    const c = sample('m5s2-05-common', (x) => sigOf(x).startsWith('cnum-'))
    const v = mount(QuestionRenderer, { props: { question: c } })
    const labels = v.findComponent(FracChain).findAll('.arc .label').map((t) => t.text())
    expect(labels.join('')).toMatch(/^×\d+$/)
    v.unmount()
  })
})

describe('集合图（VennSets）', () => {
  it('例 1：8 的因数 / 12 的因数，左边 8、中间 1，2，4、右边 3，6，12，中间那一块下面红箭头写着公因数', () => {
    const w = mount(VennSets, {
      props: {
        left: { k: 'm5.frac.vf', p: { n: 8 } },
        right: { k: 'm5.frac.vf', p: { n: 12 } },
        only1: ['8'],
        both: ['1', '2', '4'],
        only2: ['3', '6', '12'],
        caption: { k: 'm5.frac.vcf', p: { a: 8, b: 12 } },
      },
    })
    expect(w.findAll('ellipse')).toHaveLength(2)
    expect(w.findAll('text.name').map((t) => t.text())).toEqual(['8 的因数', '12 的因数'])
    expect(w.find('.only1').text()).toBe('8')
    // 中间一行最多两个一位数以上的数；都是一位数时一行三个
    expect(w.find('.both').findAll('text').map((t) => t.text())).toEqual(['1，2，4'])
    expect(w.find('.only2').findAll('text').map((t) => t.text())).toEqual(['3，6，12'])
    expect(w.find('.caption').text()).toBe('8 和 12 的公因数')
    expect(w.find('.pointer').exists()).toBe(true)
    // 三块的位置：左边那一块在左椭圆里、右椭圆外，中间那一块在两个中心之间
    const [l, r] = w.findAll('ellipse').map((e) => ({ cx: Number(e.attributes('cx')), rx: Number(e.attributes('rx')) }))
    const x1 = Number(w.find('.only1 text').attributes('x'))
    const xm = Number(w.find('.both text').attributes('x'))
    const x2 = Number(w.find('.only2 text').attributes('x'))
    expect(x1).toBeLessThan(r!.cx - r!.rx)
    expect(xm).toBeGreaterThan(l!.cx)
    expect(xm).toBeLessThan(r!.cx)
    expect(x2).toBeGreaterThan(l!.cx + l!.rx)
    w.unmount()
  })

  it('倍数写不完：以「…」结尾，一行三个、行末带逗号；问的那一块画大「?」；没有 caption 不画箭头', () => {
    const w = mount(VennSets, {
      props: {
        left: { k: 'm5.frac.vm', p: { n: 4 } },
        right: { k: 'm5.frac.vm', p: { n: 6 } },
        only1: ['4', '8', '16', '20', '28', '32', '…'],
        both: ['12', '24', '36', '…'],
        only2: ['6', '18', '30', '…'],
        ask: 'both',
      },
    })
    expect(w.find('.only1').findAll('text').map((t) => t.text())).toEqual(['4，8，16，', '20，28，32，', '…'])
    expect(w.find('.both text').text()).toBe('?')
    expect(w.find('.both text').classes()).toContain('ask')
    expect(w.find('.caption').exists()).toBe(false)
    w.unmount()
  })

  it('真实题目：QuestionRenderer 把集合图的字段都转发了（名字、三块的数、问号、箭头下的字）', () => {
    for (const [kp, pre] of [
      ['m5s2-05-gcf', 'vmid-'],
      ['m5s2-05-lcm', 'cmid-'],
    ] as const) {
      const q = sample(kp, (x) => sigOf(x).startsWith(pre))
      const part = q.stem.find((p) => p.kind === 'venn')!
      const w = mount(QuestionRenderer, { props: { question: q } })
      const v = w.findComponent(VennSets)
      for (const k of ['left', 'right', 'only1', 'both', 'only2', 'ask', 'caption'] as const) expect(v.props(k), `${kp} ${k}`).toEqual((part as Record<string, unknown>)[k])
      expect(v.find('.both text').text()).toBe('?')
      w.unmount()
    }
  })
})

describe('用到的现成教具', () => {
  it('例 1（分数的意义）：一盒糖 12 颗平均分成几份；例 2（真分数和假分数）：前面整个涂满的圆 + 最后一个涂几份', () => {
    const q = sample('m5s2-05-meaning', (x) => sigOf(x).startsWith('set-candy-'))
    const w = mount(QuestionRenderer, { props: { question: q } })
    const set = q.stem.find((p) => p.kind === 'frac-set') as { groups: number; per: number; shaded: number }
    expect(w.findAll('.frac-set .grp')).toHaveLength(set.groups)
    expect(w.findAll('.frac-set .grp.on')).toHaveLength(set.shaded)
    expect(w.findAll('.frac-set .obj')).toHaveLength(12)
    w.unmount()
    const imp = sample('m5s2-05-proper', (x) => sigOf(x).startsWith('imp-circle-'))
    const v = mount(QuestionRenderer, { props: { question: imp } })
    expect(v.findComponent(FracShape).exists()).toBe(true)
    v.unmount()
  })
})
