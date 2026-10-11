// @vitest-environment happy-dom
// 五上「图形的运动」、五下「图形的运动（三）」用到的教具：ClockFace 加的一根指针（hand / from + 顺时针弧形箭头 + 中心字母 O，
// dial 部件）、MotionFigs 加的钟摆（swing）和只转叶片的风车（spin）；原来的用法不变；再挂真实题目查 QuestionRenderer 都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { MotionItem, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import ClockFace from '@/components/math/ClockFace.vue'
import MotionFigs from '@/components/math/MotionFigs.vue'

afterEach(() => setLang('zh'))

const rotOf = (style: string | undefined): number => Number(/rotate\((-?[\d.]+)deg\)/.exec(style ?? '')?.[1])
function find(kind: StemPart['kind']): { q: Question; part: StemPart }[] {
  const out: { q: Question; part: StemPart }[] = []
  for (const kp of ['m5s1-04-rotate', 'm5s2-06-rotate']) {
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 150 && out.length < 30; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const part = q.stem.find((p) => p.kind === kind)
        if (part) out.push({ q, part })
      }
    }
  }
  expect(out.length).toBeGreaterThan(0)
  return out
}

describe('ClockFace：一根指针', () => {
  it('不传 hand 和原来一样：时针、分针都在，没有单根指针、弧形箭头和字母', () => {
    const w = mount(ClockFace, { props: { hour: 3, minute: 0 } })
    expect(w.find('.hand.hour').exists()).toBe(true)
    expect(w.find('.hand.minute').exists()).toBe(true)
    expect(w.find('.hand.single').exists()).toBe(false)
    expect(w.find('svg.arc').exists()).toBe(false)
    expect(w.find('.center').exists()).toBe(false)
    expect(w.findAll('.tick')).toHaveLength(12)
    w.unmount()
  })

  it('hand + from：一根实线指针指着 hand、原来的位置画虚线，从 from 顺时针画到 hand 的红色弧形箭头，中心标 O', () => {
    const w = mount(ClockFace, { props: { hour: 0, minute: 0, hand: 3, from: 12, center: 'O' } })
    expect(w.find('.hand.hour').exists()).toBe(false)
    const solid = w.find('.hand.single:not(.ghost)')
    const ghost = w.find('.hand.single.ghost')
    expect(rotOf(solid.attributes('style'))).toBe(90)
    expect(rotOf(ghost.attributes('style'))).toBe(0)
    expect(solid.attributes('data-at')).toBe('3')
    expect(ghost.attributes('data-at')).toBe('12')
    const d = w.find('svg.arc path.arc-line').attributes('d')!
    // 小于半圈、顺时针（sweep = 1）
    expect(d).toMatch(/A 30 30 0 0 1 /)
    expect(w.find('svg.arc path.arc-head').exists()).toBe(true)
    expect(w.find('.center').text()).toBe('O')
    w.unmount()
    // 超过半圈用大弧
    const big = mount(ClockFace, { props: { hour: 0, minute: 0, hand: 11, from: 1 } })
    expect(big.find('svg.arc path.arc-line').attributes('d')).toMatch(/A 30 30 0 1 1 /)
    big.unmount()
  })

  it('只有 hand：没有虚线指针，也没有弧形箭头', () => {
    const w = mount(ClockFace, { props: { hour: 0, minute: 0, hand: 7 } })
    expect(w.findAll('.hand.single')).toHaveLength(1)
    expect(rotOf(w.find('.hand.single').attributes('style'))).toBe(210)
    expect(w.find('svg.arc').exists()).toBe(false)
    w.unmount()
  })

  it('题目里的表盘（dial）：from、to 都转发了', () => {
    for (const { q, part } of find('dial')) {
      if (part.kind !== 'dial') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      expect(w.find('.hand.single:not(.ghost)').attributes('data-at'), q.id).toBe(String(part.to))
      expect(w.find('.hand.single.ghost').exists(), q.id).toBe(part.from !== undefined)
      if (part.from !== undefined) expect(w.find('.hand.single.ghost').attributes('data-at'), q.id).toBe(String(part.from))
      expect(w.find('.center').text(), q.id).toBe('O')
      w.unmount()
    }
  })
})

describe('MotionFigs：钟摆、只转叶片的风车', () => {
  const bobX = (w: ReturnType<typeof mount>): number => {
    // 实线那一份里的摆锤：最下面那个实心的圆
    const circles = w.findAll('g:not(.ghost) > g > circle.dark')
    const bob = circles.sort((a, b) => Number(b.attributes('cy')) - Number(a.attributes('cy')))[0]!
    return Number(bob.attributes('cx'))
  }
  it('swing：竖直的位置画虚线，往左摆的摆锤在左边、往右摆的在右边，下面有弧形箭头', () => {
    for (const swing of ['left', 'right'] as const) {
      const w = mount(MotionFigs, { props: { items: [{ fig: 'clock', hour: 3, swing } as MotionItem] } })
      expect(w.find('g.ghost').exists()).toBe(true)
      expect(w.findAll('g.ghost line.rod')).toHaveLength(1)
      expect(w.find('.arc-line').exists()).toBe(true)
      expect(bobX(w) < 50).toBe(swing === 'left')
      // 箭头尖在摆的那一边
      const head = w.find('.arc-head').attributes('d')!
      const tipX = Number(/^M ([\d.]+)/.exec(head)?.[1])
      expect(tipX < 50).toBe(swing === 'left')
      w.unmount()
    }
  })

  it('spin：叶片转、杆子不动；不传 spin 和原来一样', () => {
    const plain = mount(MotionFigs, { props: { items: [{ fig: 'pinwheel' } as MotionItem] } })
    const turned = mount(MotionFigs, { props: { items: [{ fig: 'pinwheel', spin: 90 } as MotionItem] } })
    expect(plain.find('path.b1').attributes('transform')).toBeUndefined()
    expect(turned.find('path.b1').attributes('transform')).toBe('rotate(90 50 50)')
    expect(turned.find('path.b2').attributes('transform')).toBe('rotate(180 50 50)')
    expect(turned.find('rect.wood').attributes('transform')).toBeUndefined()
    expect(turned.find('rect.wood').attributes('y')).toBe(plain.find('rect.wood').attributes('y'))
    plain.unmount()
    turned.unmount()
  })

  it('题目里的钟摆、风车：items、arrows 都转发了', () => {
    for (const { q, part } of find('motion-figs')) {
      if (part.kind !== 'motion-figs') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      expect(w.findAll('.motion-figs figure'), q.id).toHaveLength(part.items.length)
      expect(w.findAll('.motion-figs .step'), q.id).toHaveLength(part.arrows ? part.items.length - 1 : 0)
      w.unmount()
    }
  })
})
