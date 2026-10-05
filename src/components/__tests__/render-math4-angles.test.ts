// @vitest-environment happy-dom
// 四上「角的度量」的专项渲染检查：量角器（Protractor，kind: 'protractor'）照课本画——外圈 0 在左、内圈 0 在右，每 10° 一个数，
// 角的边从中心出发、伸出量角器外，读屏说明不说度数；再用真实题目挂一遍（量角器、角的图都画得出来）。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import Protractor from '@/components/math/Protractor.vue'
import GeoFigure from '@/components/math/GeoFigure.vue'

afterEach(() => setLang('zh'))

type Pro = Extract<StemPart, { kind: 'protractor' }>

/** 「translate(x y) rotate(…)」里的 x、y */
const at = (tf: string): [number, number] => {
  const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(tf)!
  return [Number(m[1]), Number(m[2])]
}
/** 从中心看过去的方向（度，0 朝右、逆时针） */
const heading = (p: [number, number]): number => ((Math.atan2(-p[1], p[0]) * 180) / Math.PI + 360) % 360

describe('量角器：画法', () => {
  it('两圈数：内圈 0 在右、逆时针到左边 180，外圈正好反过来；顶上一个 90', () => {
    const w = mount(Protractor, { props: { rays: [{ at: 0 }, { at: 40 }], arc: [0, 40] } })
    const inner = w.findAll('text.num.in')
    const outer = w.findAll('text.num.out')
    expect(inner).toHaveLength(18)
    expect(outer).toHaveLength(18)
    for (const t of inner) {
      const v = Number(t.text())
      expect(Math.abs(heading(at(t.attributes('transform')!)) - v)).toBeLessThan(0.6)
    }
    for (const t of outer) {
      const v = Number(t.text())
      expect(Math.abs(heading(at(t.attributes('transform')!)) - (180 - v))).toBeLessThan(0.6)
    }
    expect(w.find('text.ninety').text()).toBe('90')
    // 外沿 181 根刻度：每 10° 的 19 根最长
    expect(w.find('path.tick.long').attributes('d')!.match(/M/g)).toHaveLength(19)
    expect(w.find('path.tick.mid').attributes('d')!.match(/M/g)).toHaveLength(18)
    expect(w.find('path.tick.fine').attributes('d')!.match(/M/g)).toHaveLength(144)
    w.unmount()
  })

  it('角的边从中心画出去、伸出量角器外，红弧画在两条边之间；斜放时整个转过去，读数不变', () => {
    for (const tilt of [0, 8, -6]) {
      const w = mount(Protractor, { props: { rays: [{ at: 180 }, { at: 125 }], arc: [125, 180], tilt } })
      const rays = w.findAll('path.ray').map((p) => p.attributes('d')!)
      expect(rays).toHaveLength(2)
      const ends = rays.map((d) => {
        const m = /M 0 0 L ([-\d.]+) ([-\d.]+)/.exec(d)!
        return [Number(m[1]), Number(m[2])] as [number, number]
      })
      expect(Math.abs(heading(ends[0]!) - ((180 + tilt + 360) % 360))).toBeLessThan(0.6)
      expect(Math.abs(heading(ends[1]!) - (125 + tilt))).toBeLessThan(0.6)
      // 伸出外沿（半径 150）
      for (const e of ends) expect(Math.hypot(e[0], e[1])).toBeGreaterThan(160)
      expect(w.find('path.arc').exists()).toBe(true)
      w.unmount()
    }
  })

  it('画角题：外沿上的点和字母、射线 OA 的字母、中心的 O 都画出来；只有一条线时中心画点', () => {
    const w = mount(Protractor, {
      props: { rays: [{ at: 50, label: 'A' }], center: 'O', points: [{ at: 100, label: 'B' }, { at: 80, label: 'C' }], alt: '（量角器）' },
    })
    const letters = w.findAll('text.letter').map((t) => t.text())
    expect(letters.sort()).toEqual(['A', 'B', 'C', 'O'])
    expect(w.findAll('circle.pick')).toHaveLength(2)
    expect(w.find('circle.hub').exists()).toBe(true)
    expect(w.attributes('aria-label')).toBe('（量角器）')
    w.unmount()
  })

  it('大小：1 个单位 1 像素（手机上刻度数字约 11px），宽不超过 390 像素、高不超过 240 像素，窄屏随容器缩小（max-width: 100%）', () => {
    const cases: Record<string, unknown>[] = [
      { rays: [{ at: 0 }, { at: 90 }] },
      { rays: [{ at: 180 }, { at: 30 }], tilt: 8 },
      { rays: [{ at: 50, label: 'A' }], center: 'O', points: [{ at: 170, label: 'B' }, { at: 10, label: 'C' }] },
    ]
    for (const props of cases) {
      const w = mount(Protractor, { props })
      expect(Number(w.attributes('width'))).toBeLessThanOrEqual(390)
      expect(Number(w.attributes('height'))).toBeLessThanOrEqual(240)
      w.unmount()
    }
  })
})

describe('几何图：四年级加的画法（三年级不用，不填就和原来一样）', () => {
  it('点子图：只画格点上的小圆点，不画格线', () => {
    const w = mount(GeoFigure, { props: { figs: [{ w: 4, h: 3, px: 20, items: [{ t: 'grid', x: 0, y: 0, w: 4, h: 3, dots: true }] }] } })
    expect(w.findAll('circle.griddot')).toHaveLength(20)
    expect(w.find('path.gridline').exists()).toBe(false)
    w.unmount()
  })

  it('逆时针的角弧：周角画整圈、平角画半圈，箭头画在末端', () => {
    const full = mount(GeoFigure, { props: { figs: [{ w: 100, h: 100, items: [{ t: 'arc', at: [50, 50], a: [90, 50], b: [90, 50], ccw: true, arrow: true, r: 20 }] }] } })
    const paths = full.findAll('path.mark').map((p) => p.attributes('d')!)
    expect(paths).toHaveLength(2) // 弧 + 箭头
    expect(paths[0]!.match(/A/g)).toHaveLength(2) // 两个半圆拼成整圈
    full.unmount()
    const half = mount(GeoFigure, { props: { figs: [{ w: 100, h: 100, items: [{ t: 'arc', at: [50, 50], a: [90, 50], b: [10, 50], ccw: true }] }] } })
    const d = half.find('path.mark').attributes('d')!
    expect(d.match(/A/g)).toHaveLength(1)
    // 从右边逆时针（往上）转到左边：弧的中间在顶点上面
    half.unmount()
  })
})

describe('角的度量：真实题目的渲染', () => {
  for (const kp of ['m4s1-03-angles', 'm4s1-03-measure', 'm4s1-03-draw']) {
    it(`${kp}：量角器、角的图都画得出来，说明不显示、不说度数；中英文都能挂`, () => {
      const gen = getGenerator(kp)!
      let pros = 0
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 10; seed++)
          for (const d of [1, 2, 3] as const) {
            const q: Question = gen(d, createRng(seed * 11 + d))
            const w = mount(QuestionRenderer, { props: { question: q } })
            expect(w.html(), q.id).not.toMatch(/NaN|undefined/)
            for (const part of q.stem) {
              if (part.kind === 'protractor') {
                pros++
                const p = part as Pro
                const svg = w.find('svg.protractor')
                expect(svg.exists()).toBe(true)
                expect(svg.attributes('aria-label')).toBe(p.alt)
                expect(w.text()).not.toContain(p.alt)
                expect(w.findAll('path.ray')).toHaveLength(p.rays.length)
                expect(w.findAll('circle.pick')).toHaveLength(p.points?.length ?? 0)
                // 读屏说明不说角的度数
                if (p.rays.length === 2) expect(p.alt).not.toContain(String(Math.abs(p.rays[0]!.at - p.rays[1]!.at)))
              }
              if (part.kind === 'geo') expect(w.findAll('svg.geo-svg').length).toBe(part.figs.length)
            }
            w.unmount()
            const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
            expect(panel.findAll('button').length).toBeGreaterThan(0)
            panel.unmount()
          }
      }
      if (kp !== 'm4s1-03-angles') expect(pros).toBeGreaterThan(10)
    })
  }
})
