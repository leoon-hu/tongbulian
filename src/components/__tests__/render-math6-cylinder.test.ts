// @vitest-environment happy-dom
// 六下「圆柱与圆锥」的新教具：圆柱、圆锥立体图（RoundSolid + roundSolidGeometry）。先用手写的数据查几何（底面椭圆的扁度、
// 看不见的半圈画虚线、摆法、尺寸线和字母标记的位置），再挂手搭的题目和真实题目，查 QuestionRenderer 把字段都转发了、静态页的文字版不露答案。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, RoundSolidSpec, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import RoundSolid from '@/components/math/RoundSolid.vue'
import { drawSolids, modelBox } from '@/components/math/roundSolidGeometry'
import { stemText } from '@/seo/site'
import { KP_CA, KP_CC, KP_CK, KP_CN, KP_CS, KP_CV, KP_OK, KP_OV } from '@/content/math/grade6/generators/cylinder'

afterEach(() => setLang('zh'))

type Pt = [number, number]
/** path 的 d 里的点（M / L 后面成对的数） */
const ptsOf = (d: string): Pt[] => {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
  return Array.from({ length: nums.length / 2 }, (_, i) => [nums[2 * i]!, nums[2 * i + 1]!] as Pt)
}
const box = (ps: Pt[]): { x0: number; x1: number; y0: number; y1: number } => ({
  x0: Math.min(...ps.map((p) => p[0])),
  x1: Math.max(...ps.map((p) => p[0])),
  y0: Math.min(...ps.map((p) => p[1])),
  y1: Math.max(...ps.map((p) => p[1])),
})
const question = (stem: StemPart[]): Question => ({ id: 'test:1', kpId: 'test', type: 'solid', difficulty: 1, stem, input: 'numpad', answer: { kind: 'number', value: 1 } })

describe('圆柱、圆锥的几何（roundSolidGeometry）', () => {
  it('立着的圆柱：顶面整个椭圆、扁度约 0.28；底面前半圈实线、后半圈虚线；两条竖的轮廓线', () => {
    const [d] = drawSolids([{ shape: 'cylinder', r: 2, h: 3 }])
    const capFill = d!.fills.find((f) => f.cls === 'cap')!
    const cap = box(ptsOf(capFill.d))
    expect((cap.y1 - cap.y0) / (cap.x1 - cap.x0)).toBeCloseTo(Math.sin((16 * Math.PI) / 180), 1)
    expect(d!.hidden).toHaveLength(1)
    const back = box(ptsOf(d!.hidden[0]!))
    // 看不见的那半圈在底面椭圆的上半部分（后面）
    const all = box(d!.edges.flatMap(ptsOf))
    expect(back.y1).toBeLessThan(all.y1 - 1)
    // 轮廓线：两条竖线（x 不变）
    const vertical = d!.edges.map(ptsOf).filter((ps) => ps.length === 2 && Math.abs(ps[0]![0] - ps[1]![0]) < 0.5)
    expect(vertical).toHaveLength(2)
    // 宽 : 高 = 直径 : 高（斜着往下看，竖的棱投影后短一点：乘 cos 16°）
    expect((all.x1 - all.x0) / (all.y1 - all.y0 - (cap.y1 - cap.y0))).toBeCloseTo(4 / (3 * Math.cos((16 * Math.PI) / 180)), 1)
  })

  it('横放的圆柱：轴在纸上是水平的，左端的底面整个看得见、右端只有前半圈实线', () => {
    const [d] = drawSolids([{ shape: 'cylinder', r: 1, h: 3, pose: 'side' }])
    const cap = box(ptsOf(d!.fills.find((f) => f.cls === 'cap')!.d))
    const all = box(d!.edges.flatMap(ptsOf))
    expect(cap.x0).toBeCloseTo(all.x0, 0)
    // 两端一样高（轴水平）：左端底面椭圆的中心和右端的一样高
    const rightHidden = box(ptsOf(d!.hidden[0]!))
    expect((cap.y0 + cap.y1) / 2).toBeCloseTo((all.y0 + all.y1) / 2, 0)
    expect(rightHidden.x0).toBeGreaterThan(all.x0 + (all.x1 - all.x0) / 2)
  })

  it('圆锥：立着的顶点在上、底面后半圈虚线；尖朝下的底面整个看得见（在上面）', () => {
    const [up] = drawSolids([{ shape: 'cone', r: 1, h: 2 }])
    const upBox = box(up!.edges.flatMap(ptsOf))
    const side = box(ptsOf(up!.fills.find((f) => f.cls === 'side')!.d))
    expect(side.y0).toBeCloseTo(upBox.y0, 0)
    expect(up!.hidden).toHaveLength(1)
    const [down] = drawSolids([{ shape: 'cone', r: 1, h: 2, pose: 'down' }])
    const cap = box(ptsOf(down!.fills.find((f) => f.cls === 'cap')!.d))
    const downBox = box(down!.edges.flatMap(ptsOf))
    expect(cap.y0).toBeCloseTo(downBox.y0, 0)
    expect(down!.hidden).toHaveLength(0)
  })

  it('粮仓（圆锥在圆柱上）：接口后面那半圈和底面后面那半圈都是虚线；漏斗（圆锥尖朝下在圆柱下）顶面看得见', () => {
    const [silo] = drawSolids([{ shape: 'silo', r: 1, h: 1.4, h2: 0.9 }])
    expect(silo!.hidden).toHaveLength(2)
    const [hopper] = drawSolids([{ shape: 'hopper', r: 1, h: 1, h2: 1.2 }])
    expect(hopper!.fills.some((f) => f.cls === 'cap')).toBe(true)
    expect(hopper!.hidden).toHaveLength(1)
  })

  it('尺寸线和字：半径从顶面圆心画到边、高的竖线在图的右边、直径的横线在上面（或下面）', () => {
    const [d] = drawSolids([{ shape: 'cylinder', r: 5, h: 10, labels: { r: '5', h: '10' } }])
    const fig = box(d!.edges.flatMap(ptsOf))
    expect(d!.texts.map((t) => t.text).sort()).toEqual(['10', '5'])
    const h = d!.texts.find((t) => t.text === '10')!
    expect(h.x).toBeGreaterThan(fig.x1)
    expect(d!.radii).toHaveLength(1)
    const [top] = drawSolids([{ shape: 'cylinder', r: 2, h: 8, labels: { d: '4', h: '8' } }])
    const dTxt = top!.texts.find((t) => t.text === '4')!
    expect(dTxt.y).toBeLessThan(box(top!.edges.flatMap(ptsOf)).y0)
    const [bottom] = drawSolids([{ shape: 'cone', r: 2, h: 1.5, labels: { d: '4', h: '1.5' }, dAt: 'bottom' }])
    expect(bottom!.texts.find((t) => t.text === '4')!.y).toBeGreaterThan(box(bottom!.edges.flatMap(ptsOf)).y1)
  })

  it('字母标记：每个部位一个圈，都在图外面，互相不挤在一起；高的那个挨着尺寸线（圆柱）或顶点到底面圆心的虚线（圆锥）', () => {
    for (const pose of ['up', 'side', 'tilt'] as const) {
      const [d] = drawSolids([{ shape: 'cylinder', r: 1.1, h: 1.6, pose, marks: [{ at: 'base', text: 'A' }, { at: 'side', text: 'B' }, { at: 'h', text: 'C' }] }])
      expect(d!.badges.map((b) => b.text)).toEqual(['A', 'B', 'C'])
      const fig = box(d!.edges.flatMap(ptsOf))
      // 有引线的（底面、侧面）放在图的外框外面；高的那个挨着尺寸线放（斜放时尺寸线在斜的外框里面）
      for (const b of d!.badges.filter((x) => x.lead)) expect(b.x < fig.x0 || b.x > fig.x1 || b.y < fig.y0 || b.y > fig.y1, `${pose} ${b.text}`).toBe(true)
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(Math.hypot(d!.badges[i]!.x - d!.badges[j]!.x, d!.badges[i]!.y - d!.badges[j]!.y), pose).toBeGreaterThan(22)
      expect(d!.dims.length).toBeGreaterThan(0)
    }
    for (const pose of ['up', 'lie', 'down'] as const) {
      const [d] = drawSolids([{ shape: 'cone', r: 1.1, h: 1.7, pose, marks: [{ at: 'apex', text: 'A' }, { at: 'base', text: 'B' }, { at: 'side', text: 'C' }, { at: 'h', text: 'D' }] }])
      expect(d!.badges).toHaveLength(4)
      expect(d!.axes).toHaveLength(1)
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(Math.hypot(d!.badges[i]!.x - d!.badges[j]!.x, d!.badges[i]!.y - d!.badges[j]!.y), pose).toBeGreaterThan(22)
    }
  })

  it('一组图共用一个比例：一样大的圆柱画得一样大；半径和高悬殊时短的放大到长的 0.3 倍', () => {
    const [a, b] = drawSolids([{ shape: 'cylinder', r: 1, h: 2 }, { shape: 'cone', r: 1, h: 2 }])
    expect(Math.abs(a!.width - b!.width)).toBeLessThan(3)
    const flat = modelBox({ shape: 'cylinder', r: 20, h: 1 })
    expect(flat.h / flat.w).toBeGreaterThan(0.3)
  })

  it('瓶子：正放画水和水面，倒过来瓶盖在下面、水在下面，没有水的那段量到上面', () => {
    const [up, down] = drawSolids([{ shape: 'bottle', r: 4, h: 20, water: 7, labels: { water: '7' } }, { shape: 'bottle', r: 4, h: 20, pose: 'down', water: 18, labels: { water: '18' } }])
    expect(up!.water!.fills.length).toBeGreaterThan(0)
    const lidUp = box(ptsOf(up!.fills.find((f) => f.cls === 'lid-top')!.d))
    expect(lidUp.y0).toBeLessThan(20)
    const lidDown = box(ptsOf(down!.fills.find((f) => f.cls === 'lid')!.d))
    expect(lidDown.y1).toBeGreaterThan(down!.height - 25)
    // 倒过来的水面在没有水的那段下面：尺寸线的字在右边
    expect(down!.texts[0]!.anchor).toBe('start')
    expect(up!.texts[0]!.anchor).toBe('end')
  })
})

describe('RoundSolid 组件', () => {
  it('画出涂色、虚线、尺寸线和字；读屏只说是什么立体图形', () => {
    const w = mount(RoundSolid, { props: { items: [{ shape: 'cylinder', r: 5, h: 10, labels: { r: '5', h: '10' } }] } })
    expect(w.findAll('path.fill').length).toBeGreaterThanOrEqual(2)
    expect(w.findAll('path.hidden')).toHaveLength(1)
    expect(w.findAll('text.lbl').map((t) => t.text())).toEqual(expect.arrayContaining(['5', '10']))
    expect(w.find('.solids').attributes('aria-label')).toBe('圆柱')
    w.unmount()
  })

  it('编号的一组：下面标 1、2、3……；颜色按 tone，不跟形状走', () => {
    const items: RoundSolidSpec[] = [
      { shape: 'cylinder', r: 1, h: 1.6, tone: 2 },
      { shape: 'cone', r: 1, h: 1.6, tone: 0 },
      { shape: 'frustum', r: 1, h: 1.4, tone: 1 },
    ]
    const w = mount(RoundSolid, { props: { items, numbered: true } })
    expect(w.findAll('figcaption').map((f) => f.text())).toEqual(['1', '2', '3'])
    expect(w.findAll('svg').map((s) => s.classes().find((c) => /^t\d$/.test(c)))).toEqual(['t2', 't0', 't1'])
    w.unmount()
  })

  it('字母标记画成圈里的字母加引线；两个中间画箭头', () => {
    const w = mount(RoundSolid, {
      props: {
        items: [
          { shape: 'cone', r: 1, h: 1.6, marks: [{ at: 'apex', text: 'A' }, { at: 'h', text: 'B' }] },
          { shape: 'cylinder', r: 1, h: 1.6 },
        ],
        arrow: true,
      },
    })
    expect(w.findAll('.badge-txt').map((t) => t.text())).toEqual(['A', 'B'])
    expect(w.findAll('line.lead').length).toBe(2)
    expect(w.find('.arrow').exists()).toBe(true)
    w.unmount()
  })
})

describe('QuestionRenderer 转发 round-solid 的字段；静态页的文字版', () => {
  it('numbered / arrow 都转发了', () => {
    const items: RoundSolidSpec[] = [
      { shape: 'cylinder', r: 1, h: 1.6 },
      { shape: 'cone', r: 1, h: 1.6 },
    ]
    const a = mount(QuestionRenderer, { props: { question: question([{ kind: 'round-solid', items, numbered: true }]) } })
    expect(a.findAll('figcaption').map((f) => f.text())).toEqual(['1', '2'])
    a.unmount()
    const b = mount(QuestionRenderer, { props: { question: question([{ kind: 'round-solid', items, arrow: true }]) } })
    expect(b.find('.arrow').exists()).toBe(true)
    expect(b.findAll('figcaption')).toHaveLength(0)
    b.unmount()
  })

  it('文字版：编号的一组不说是什么形状（问的就是这个）；单个的说标着的数；字母标记只说标了哪几个字母', () => {
    const many = stemText({ kind: 'round-solid', items: [{ shape: 'cylinder', r: 1, h: 1 }, { shape: 'cone', r: 1, h: 1 }], numbered: true })
    expect(many).not.toMatch(/圆柱|圆锥/)
    expect(stemText({ kind: 'round-solid', items: [{ shape: 'cylinder', r: 5, h: 10, labels: { r: '5', h: '10' } }] })).toBe('（圆柱：底面半径标着 5，高标着 10）')
    const marked = stemText({ kind: 'round-solid', items: [{ shape: 'cone', r: 1, h: 2, marks: [{ at: 'apex', text: 'A' }, { at: 'h', text: 'B' }] }] })
    expect(marked).toContain('A、B')
    expect(marked).not.toMatch(/顶点|高/)
    expect(stemText({ kind: 'round-solid', items: [{ shape: 'silo', r: 1, h: 1 }] })).not.toMatch(/圆柱|圆锥/)
  })
})

describe('真实题目：每个知识点三档各挂几道（中英文），题干和作答面板都画得出来', () => {
  for (const kp of [KP_CK, KP_CN, KP_CS, KP_CA, KP_CV, KP_CC, KP_OK, KP_OV]) {
    it(kp, () => {
      const gen = getGenerator(kp)!
      for (const lang of ['zh', 'en'] as const) {
        setLang(lang)
        for (let seed = 1; seed <= 12; seed++) {
          const d = ((seed % 3) + 1) as 1 | 2 | 3
          const q = gen(d, createRng(seed * 13 + d))
          const stem = mount(QuestionRenderer, { props: { question: q } })
          expect(stem.text(), q.id).not.toMatch(/\bm6\.[a-zA-Z]|undefined|NaN/)
          for (const part of q.stem) {
            if (part.kind === 'round-solid') expect(stem.findAll('.solids svg').length, q.id).toBe(part.items.length)
            if (part.kind === 'geo') expect(stem.findAll('.geo svg').length, q.id).toBe(part.figs.length)
          }
          stem.unmount()
          const panel = mount(AnswerPanel, { props: { question: q, revealed: null } })
          expect(panel.findAll('button').length).toBeGreaterThan(0)
          panel.unmount()
        }
      }
    })
  }
})
