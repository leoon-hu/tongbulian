// @vitest-environment happy-dom
// 四上「平行四边形和梯形」的专项渲染检查：几何图（GeoFigure，kind: 'geo'）里的方格纸、点子图、直角记号、边上标的长度、
// 角里的编号都画出来，图的说明只给读屏、不显示，手机竖屏放得下。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'

afterEach(() => setLang('zh'))

type Geo = Extract<StemPart, { kind: 'geo' }>
const KPS = ['m4s1-06-parallel', 'm4s1-06-distance', 'm4s1-06-parallelogram', 'm4s1-06-trapezoid']

describe('平行四边形和梯形：真实题目的渲染', () => {
  for (const kp of KPS) {
    it(`${kp}：每幅图都画出来，编号、字母、边上的数都在，点子图只画点；说明不显示；中英文都能挂`, () => {
      const gen = getGenerator(kp)!
      let figs = 0
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 10; seed++)
          for (const d of [1, 2, 3] as const) {
            const q: Question = gen(d, createRng(seed * 17 + d))
            const w = mount(QuestionRenderer, { props: { question: q } })
            expect(w.html(), q.id).not.toMatch(/NaN|undefined/)
            for (const part of q.stem.filter((p): p is Geo => p.kind === 'geo')) {
              figs += part.figs.length
              expect(w.findAll('svg.geo-svg').length, q.id).toBe(part.figs.length)
              const caps = w.findAll('.geo-fig figcaption').map((c) => c.text())
              expect(caps, q.id).toEqual(part.numbered ? part.figs.map((_, i) => String(i + 1)) : [])
              const shown = w.findAll('svg text').map((t) => t.text())
              let dots = 0
              for (const fig of part.figs)
                for (const it of fig.items) {
                  if (it.t === 'poly') for (const l of it.labels ?? []) if (l) expect(shown, q.id).toContain(l)
                  if (it.t === 'text' || (it.t === 'dot' && it.label)) expect(shown, q.id).toContain(it.t === 'text' ? it.text : it.label)
                  if (it.t === 'grid' && it.dots) dots += (it.w + 1) * (it.h + 1)
                }
              expect(w.findAll('circle.griddot').length, q.id).toBe(dots)
              expect(w.text()).not.toContain(part.alt)
              expect(w.find('.geo').attributes('aria-label')).toBe(part.alt)
              for (const svg of w.findAll('svg.geo-svg')) {
                expect(Number(svg.attributes('width')), q.id).toBeLessThanOrEqual(part.figs.length > 1 ? 340 : 301)
                expect(Number(svg.attributes('height')), q.id).toBeLessThanOrEqual(191)
              }
            }
            w.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            panel.unmount()
          }
      }
      expect(figs).toBeGreaterThan(20)
    })
  }
})
