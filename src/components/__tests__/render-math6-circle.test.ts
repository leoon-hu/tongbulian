// @vitest-environment happy-dom
// 六上「四 圆」「☆ 体育中的数学」的专项渲染检查：圆（dot + r）、圆弧和扇形（poly 每 5° 一个点）、圆环（外圈涂色 + 内圈 paper）、
// 方格纸上的 1/4 圆、剪拼的近似长方形、跑道都用现成的 GeoFigure 画；分数、π 的选项用 MathText 画；表格、钟面、平均分的圆照旧。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question } from '@/types/models'
import { setLang } from '@/engine/i18n'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'

afterEach(() => setLang('zh'))

const KPS = ['m6s1-05-circle', 'm6s1-05-sector', 'm6s1-05-circumference', 'm6s1-05-area', 'm6s1-05-ring', 'm6s1-05-composite', 'm6s1-05-square-circle', 'm6s1-06-sports']
const kind = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1).split('-')[0]!

/** 每个知识点、每种题挑一道（三档都挑） */
function samples(kp: string): Question[] {
  const gen = getGenerator(kp)!
  const seen = new Map<string, Question>()
  for (let seed = 1; seed <= 120; seed++)
    for (const d of [1, 2, 3] as const) {
      const q = gen(d, createRng(seed))
      if (!seen.has(kind(q))) seen.set(kind(q), q)
    }
  return [...seen.values()]
}

describe('圆、体育中的数学：每种题的题干和作答面板都画得出来', () => {
  for (const kp of KPS) {
    it(`${kp}`, () => {
      for (const q of samples(kp)) {
        const w = mount(QuestionRenderer, { props: { question: q } })
        expect(w.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
        for (const part of q.stem) {
          if (part.kind !== 'geo') continue
          // 每幅图一个 svg；poly 画成 path，dot + r 画成 circle
          expect(w.findAll('svg.geo-svg').length, q.id).toBe(part.figs.length)
          const polys = part.figs.reduce((n, f) => n + f.items.filter((it) => it.t === 'poly').length, 0)
          const rings = part.figs.reduce((n, f) => n + f.items.filter((it) => it.t === 'dot' && it.r !== undefined).length, 0)
          expect(w.findAll('path.stroke').length, q.id).toBeGreaterThanOrEqual(polys)
          expect(w.findAll('circle.stroke').length, q.id).toBe(rings)
        }
        w.unmount()
        const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
        expect(panel.findAll('button').length, q.id).toBeGreaterThan(0)
        expect(panel.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
        panel.unmount()
      }
    })
  }
})

describe('选项与教具', () => {
  it('圆心角是圆的几分之几：分数选项画成上下两层', () => {
    const gen = getGenerator('m6s1-05-sector')!
    let found = false
    for (let seed = 1; seed <= 200 && !found; seed++) {
      const q = gen(1, createRng(seed))
      if (kind(q) !== 'tofrac') continue
      found = true
      const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
      expect(panel.findAll('.frac').length).toBe(q.choices!.length)
      panel.unmount()
    }
    expect(found).toBe(true)
  })

  it('公式的选项照写 π：πd、2πr、πr²', () => {
    const gen = getGenerator('m6s1-05-circumference')!
    for (let seed = 1; seed <= 200; seed++) {
      const q = gen(1, createRng(seed))
      if (kind(q) !== 'formula') continue
      const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
      expect(panel.text()).toMatch(/π/)
      panel.unmount()
      return
    }
    throw new Error('没出到公式题')
  })

  it('圆环：外圈涂色、内圈用 paper 挖空；数方格：满格、不满格两种颜色；分针：钟面上一根针转过去', () => {
    const pick = (kp: string, k: string): Question => {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 300; seed++)
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          if (kind(q) === k) return q
        }
      throw new Error(`${kp} 没出到 ${k}`)
    }
    const ring = mount(QuestionRenderer, { props: { question: pick('m6s1-05-ring', 'byr') } })
    expect(ring.findAll('circle.fill.f-b').length).toBe(1)
    expect(ring.findAll('circle.fill.f-paper').length).toBe(1)
    ring.unmount()
    const grid = mount(QuestionRenderer, { props: { question: pick('m6s1-05-area', 'grid') } })
    expect(grid.findAll('rect.cell.f-a').length).toBe(69)
    expect(grid.findAll('rect.cell.f-c').length).toBe(17)
    grid.unmount()
    const minute = mount(QuestionRenderer, { props: { question: pick('m6s1-05-circumference', 'minute') } })
    expect(minute.findAll('svg').length).toBeGreaterThan(0)
    minute.unmount()
    const table = mount(QuestionRenderer, { props: { question: pick('m6s1-05-circumference', 'table') } })
    expect(table.find('td.ask').exists()).toBe(true)
    table.unmount()
    const strip = pick('m6s1-05-area', 'cut')
    const geo = strip.stem.find((p) => p.kind === 'geo')!
    // 8 份或 16 份：一个小扇形一个多边形
    expect([8, 16]).toContain((geo as { figs: { items: { t: string }[] }[] }).figs[0]!.items.filter((it) => it.t === 'poly').length)
  })
})
