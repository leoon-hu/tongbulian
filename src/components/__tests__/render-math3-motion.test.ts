// @vitest-environment happy-dom
// 三下「生活中的运动现象」的小图（MotionFigs）：每种图画得出来，对称的图真的左右对称、不对称的真的不对称，
// 对称轴虚线、对折的半边、弧形箭头、运动示意、「?」格、标号都画出来；QuestionRenderer 把字段都转发过去。
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { MotionFig, MotionItem, Question } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import MotionFigs from '@/components/math/MotionFigs.vue'
import { SYMMETRIC } from '@/content/math/grade3/generators/motion'

afterEach(() => setLang('zh'))

const FIGS: MotionFig[] = [
  'rect',
  'square',
  'scalene',
  'circle',
  'parallelogram',
  'pentagon',
  'iso-tall',
  'iso-flat',
  'star',
  'arrow',
  'paddle',
  'plane',
  'hoodie',
  'comb',
  'kettle',
  'car',
  'leaf',
  'kite',
  'dragonfly',
  'heart',
  'tree',
  'house',
  'fish',
  'flag',
  'right-tri',
  'quad',
  'clock',
  'pinwheel',
  'propeller',
]
const one = (item: MotionItem): VueWrapper => mount(MotionFigs, { props: { items: [item] } })

/**
 * 一个图的所有笔画，化成可以左右翻的「特征」：路径上的点、圆、椭圆、矩形、线段。
 * 左右对称 = 每个特征以 x = 50 翻过去以后，都还能在图里找到（允许 0.15 的取整误差）
 */
type Feature = number[]
function features(w: VueWrapper): { kind: string; f: Feature }[] {
  const out: { kind: string; f: Feature }[] = []
  const g = w.find('svg g g') // 第一份（不是原来位置的虚线那份）里面的笔画
  for (const el of g.element.children) {
    const a = (name: string): number => Number(el.getAttribute(name))
    const rot = /rotate\((-?[\d.]+)/.exec(el.getAttribute('transform') ?? '')
    if (el.tagName === 'path') {
      const nums = (el.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?/g)!.map(Number)
      for (let i = 0; i + 1 < nums.length; i += 2) out.push({ kind: 'pt', f: [nums[i]!, nums[i + 1]!] })
    } else if (el.tagName === 'circle') out.push({ kind: 'circle', f: [a('cx'), a('cy'), a('r')] })
    else if (el.tagName === 'ellipse') out.push({ kind: 'ellipse', f: [a('cx'), a('cy'), a('rx'), a('ry'), rot ? Number(rot[1]) : 0] })
    else if (el.tagName === 'rect') out.push({ kind: 'rect', f: [a('x'), a('y'), a('width'), a('height')] })
    else if (el.tagName === 'line') {
      out.push({ kind: 'pt', f: [a('x1'), a('y1')] })
      out.push({ kind: 'pt', f: [a('x2'), a('y2')] })
    }
  }
  return out
}
function mirror(x: { kind: string; f: Feature }): Feature {
  const f = x.f
  if (x.kind === 'pt') return [100 - f[0]!, f[1]!]
  if (x.kind === 'circle') return [100 - f[0]!, f[1]!, f[2]!]
  if (x.kind === 'ellipse') return [100 - f[0]!, f[1]!, f[2]!, f[3]!, -f[4]!]
  return [100 - f[0]! - f[2]!, f[1]!, f[2]!, f[3]!]
}
function mirrorSymmetric(w: VueWrapper): boolean {
  const fs = features(w)
  return fs.every((x) => {
    const m = mirror(x)
    return fs.some((y) => y.kind === x.kind && y.f.length === m.length && y.f.every((v, i) => Math.abs(v - m[i]!) <= 0.15))
  })
}

describe('运动现象的小图（MotionFigs）', () => {
  it('每种图都画得出来（有笔画），一个图时画大一点、四个一排时小一点', () => {
    for (const fig of FIGS) {
      const w = one({ fig, hour: 3 })
      expect(w.findAll('path, circle, ellipse, rect, line').length, fig).toBeGreaterThan(0)
      expect(Number(w.find('svg').attributes('width')), fig).toBeGreaterThanOrEqual(128)
      w.unmount()
    }
    const four = mount(MotionFigs, { props: { items: (['house', 'house', 'house', 'house'] as MotionFig[]).map((fig, i) => ({ fig, label: i + 1 })) } })
    expect(Number(four.find('svg').attributes('width'))).toBeLessThanOrEqual(70)
    expect(four.findAll('figcaption').map((c) => c.text())).toEqual(['1', '2', '3', '4'])
  })

  it('登记为轴对称的图画出来左右对称，不对称的画出来确实不对称（不用 emoji 判断对称）', () => {
    for (const [fig, sym] of Object.entries(SYMMETRIC) as [MotionFig, boolean][]) {
      const w = one({ fig })
      expect(mirrorSymmetric(w), `${fig} 应该${sym ? '' : '不'}对称`).toBe(sym)
      w.unmount()
    }
  })

  it('红虚线（对称轴）、对折的半边（裁掉右半、右边是折痕）、弧形箭头、标号、红色参照、转动与翻转', () => {
    const axis = one({ fig: 'rect', axis: 'd1' })
    expect(axis.findAll('line.axis')).toHaveLength(1)
    const half = one({ fig: 'heart', half: true, tone: 'paper' })
    expect(half.find('clipPath').exists()).toBe(true)
    expect(half.find('g[clip-path]').attributes('clip-path')).toContain(half.find('clipPath').attributes('id'))
    expect(half.findAll('line.axis')).toHaveLength(1)
    expect(half.find('figure').classes()).toContain('paper')
    const cw = one({ fig: 'pinwheel', arrow: 'cw' })
    expect(cw.find('.arc-line').exists() && cw.find('.arc-head').exists()).toBe(true)
    // 顺时针、逆时针的弧画在同一个地方（右上方），只是箭头在不同的一头
    const ccw = one({ fig: 'pinwheel', arrow: 'ccw' })
    expect(ccw.find('.arc-head').attributes('d')).not.toBe(cw.find('.arc-head').attributes('d'))
    expect(cw.find('.arc-line').attributes('d')).toContain(' 0 0 1 ')
    expect(ccw.find('.arc-line').attributes('d')).toContain(' 0 0 0 ')
    const red = one({ fig: 'fish', tone: 'red', turn: 90, flip: true, label: 2 })
    expect(red.find('figure').classes()).toContain('red')
    expect(red.find('svg g g').attributes('transform')).toMatch(/rotate\(90\) scale\(-1 1\)/)
    expect(red.find('figcaption').text()).toBe('2')
  })

  it('运动示意：平移是虚线的原位置 + 直箭头，旋转是虚线的原样子 + 红点 + 弧形箭头', () => {
    const slide = one({ fig: 'house', move: 'right' })
    expect(slide.findAll('g.ghost')).toHaveLength(1)
    expect(slide.findAll('.arc-line')).toHaveLength(1)
    // 平移前后朝向一样：两份的变换只差位置
    const transforms = slide.findAll('svg > g > g').map((g) => g.attributes('transform'))
    expect(transforms.every((t) => /rotate\(0\)/.test(t!))).toBe(true)
    const turn = one({ fig: 'flag', move: 'turn', arrow: 'ccw' })
    expect(turn.findAll('g.ghost')).toHaveLength(1)
    expect(turn.find('circle.arc-head').exists()).toBe(true)
    expect(turn.findAll('svg > g > g')[1]!.attributes('transform')).toContain('rotate(-90 50 50)')
  })

  it('找规律：之间画箭头，最后一格是「?」（钟面的「?」格不画时针）', () => {
    const items: MotionItem[] = [
      { fig: 'clock', hour: 12 },
      { fig: 'clock', hour: 3 },
      { fig: 'clock', hour: 6 },
      { fig: 'clock', blank: true },
    ]
    const w = mount(MotionFigs, { props: { items, arrows: true } })
    expect(w.findAll('.step')).toHaveLength(3)
    expect(w.findAll('line.hour')).toHaveLength(3)
    expect(w.findAll('.q-mark')).toHaveLength(1)
    const tri = mount(MotionFigs, { props: { items: [{ fig: 'right-tri' }, { fig: 'right-tri', blank: true }], arrows: true } })
    expect(tri.findAll('.q-box')).toHaveLength(1)
  })

  it('QuestionRenderer 转发 motion-figs 的全部字段；三个知识点每种题中英文都能渲染', () => {
    const q: Question = {
      id: 't:1',
      kpId: 'm3s2-01-rotate',
      type: 'motion',
      difficulty: 1,
      input: 'numpad',
      answer: { kind: 'number', value: 9 },
      stem: [
        {
          kind: 'motion-figs',
          items: [
            { fig: 'clock', hour: 3 },
            { fig: 'clock', blank: true },
          ],
          arrows: true,
          alt: '',
        },
      ],
    }
    const r = mount(QuestionRenderer, { props: { question: q } })
    expect(r.findAll('.step')).toHaveLength(1)
    expect(r.findAll('.q-mark')).toHaveLength(1)
    r.unmount()

    for (const kpId of ['m3s2-01-symmetry', 'm3s2-01-translate', 'm3s2-01-rotate']) {
      const gen = getGenerator(kpId)!
      const seen = new Set<string>()
      for (let seed = 1; seed <= 120; seed++)
        for (const d of [1, 2, 3] as const) {
          const q2 = gen(d, createRng(seed))
          const kind = q2.id.split(':')[1]!.split('-')[0]!
          if (seen.has(kind)) continue
          seen.add(kind)
          for (const lang of ['zh', 'en'] as const) {
            setLang(lang)
            const w = mount(QuestionRenderer, { props: { question: q2 } })
            expect(w.text(), q2.id).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN/)
            w.unmount()
            const p = mount(AnswerPanel, { props: { question: q2, revealed: null } })
            expect(p.text(), q2.id).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN/)
            p.unmount()
          }
          setLang('zh')
        }
      expect(seen.size, kpId).toBeGreaterThanOrEqual(4)
    }
  })
})
