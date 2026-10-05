// @vitest-environment happy-dom
// 四上「☆ 寻找宝藏」的新教具：平面图（PlanMap，藏宝图 / 动物园导游图）、指南针（CompassRose）。
// 先用手写的数据查画得对，再挂真实题目查 QuestionRenderer 把字段都转发了。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { PlanPlace, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import PlanMap from '@/components/math/PlanMap.vue'
import CompassRose from '@/components/math/CompassRose.vue'

afterEach(() => setLang('zh'))

const place = (k: string, icon?: string): PlanPlace => ({ label: { k }, ...(icon ? { icon } : {}) })
const school: PlanPlace[][] = [
  [place('m4.tre.place.canteen', '🍚'), place('m4.tre.place.teach'), place('m4.tre.place.hall')],
  [place('m4.tre.place.gym'), place('m4.tre.place.field'), place('m4.tre.place.library')],
  [place('m4.tre.place.science'), place('m4.tre.place.gate'), place('m4.tre.place.bikes')],
]

describe('平面图（PlanMap）', () => {
  it('3 × 3 一格一个地方（第 0 行在北边），右上角写「北」，宝藏标在那个地方的角上', () => {
    const w = mount(PlanMap, { props: { cells: school, title: { k: 'm4.tre.title.school' }, marks: [{ r: 0, c: 1, at: 'se' as const, n: 3 }] } })
    expect(w.find('.title').text()).toBe('藏宝图')
    expect(w.find('.north .n').text()).toBe('北')
    const names = w.findAll('.place .name').map((n) => n.text())
    expect(names).toEqual(['食堂', '教学楼', '多功能厅', '体育馆', '操场', '图书馆', '科技馆', '大门', '存车处'])
    expect(w.findAll('.cell').map((c) => `${c.attributes('data-r')}${c.attributes('data-c')}`)).toEqual(['00', '01', '02', '10', '11', '12', '20', '21', '22'])
    expect(w.find('.place .icon').text()).toBe('🍚')
    const mk = w.find('.mark')
    expect(mk.text()).toBe('3号')
    expect(mk.classes()).toContain('at-se')
    // 标在教学楼（第 0 行第 1 列）那一格里
    expect(w.find('.cell[data-r="0"][data-c="1"] .mark').exists()).toBe(true)
    expect(w.find('.roads').exists()).toBe(false)
    expect(w.find('figure').attributes('aria-label')).toBe('藏宝图')
    w.unmount()
  })

  it('动物园导游图画路：外圈相邻的 8 段加中间到四周 8 段；空地不画地方、也不连路', () => {
    const zoo = mount(PlanMap, { props: { cells: school, roads: true } })
    expect(zoo.findAll('.roads line')).toHaveLength(16)
    zoo.unmount()
    const holes = school.map((row) => [...row]) as (PlanPlace | null)[][]
    holes[0]![0] = null
    const w = mount(PlanMap, { props: { cells: holes, roads: true } })
    expect(w.findAll('.place')).toHaveLength(8)
    // 少了西北角：外圈少两段、中间到它的一段也没有
    expect(w.findAll('.roads line')).toHaveLength(13)
    w.unmount()
  })

  it('英文：N、名字首字母大写、宝藏写 #3', () => {
    setLang('en')
    const w = mount(PlanMap, { props: { cells: school, marks: [{ r: 2, c: 0, at: 'n' as const, n: 3 }] } })
    expect(w.find('.north .n').text()).toBe('N')
    expect(w.findAll('.place .name')[0]!.text()).toBe('Canteen')
    expect(w.find('.mark').text()).toBe('#3')
    expect(w.find('.mark').classes()).toContain('at-n')
    w.unmount()
  })
})

describe('指南针（CompassRose）', () => {
  it('八个方向围成一圈，北在最上面、南在最下面、东在右边；ask 的那个换成「?」', () => {
    const w = mount(CompassRose, { props: {} })
    const labels = w.findAll('text.label')
    expect(labels.map((l) => l.text())).toEqual(['北', '东北', '东', '东南', '南', '西南', '西', '西北'])
    const at = (d: string): { x: number; y: number } => {
      const t = w.find(`text.label[data-dir="${d}"]`)
      return { x: Number(t.attributes('x')), y: Number(t.attributes('y')) }
    }
    expect(at('n').y).toBeLessThan(at('s').y)
    expect(at('e').x).toBeGreaterThan(at('w').x)
    expect(at('ne').x).toBeGreaterThan(at('nw').x)
    expect(at('ne').y).toBeLessThan(at('se').y)
    expect(w.find('.ask').exists()).toBe(false)
    expect(w.find('svg').attributes('aria-label')).toBe('指南针')
    w.unmount()
    const q = mount(CompassRose, { props: { ask: 'se' as const } })
    expect(q.findAll('text.label')).toHaveLength(7)
    expect(q.find('.ask').attributes('data-dir')).toBe('se')
    expect(q.find('.ask text').text()).toBe('?')
    expect(q.findAll('text.label').map((l) => l.text())).not.toContain('东南')
    q.unmount()
  })

  it('英文写 N、NE……', () => {
    setLang('en')
    const w = mount(CompassRose, { props: {} })
    expect(w.findAll('text.label').map((l) => l.text())).toEqual(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'])
    w.unmount()
  })
})

describe('QuestionRenderer 转发平面图、指南针的全部字段（真实题目）', () => {
  function find(kind: 'plan-map' | 'compass', ok: (p: StemPart) => boolean = () => true): { q: Question; part: StemPart }[] {
    const gen = getGenerator('m4s1-08-treasure')!
    const out: { q: Question; part: StemPart }[] = []
    for (let seed = 1; seed <= 150 && out.length < 16; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const part = q.stem.find((p) => p.kind === kind && ok(p))
        if (part) out.push({ q, part })
      }
    }
    expect(out.length).toBeGreaterThan(0)
    return out
  }

  it('平面图：九个地方、图题、宝藏标记、路', () => {
    const cases = [...find('plan-map'), ...find('plan-map', (p) => p.kind === 'plan-map' && !!p.marks), ...find('plan-map', (p) => p.kind === 'plan-map' && !!p.roads)]
    for (const { q, part } of cases) {
      if (part.kind !== 'plan-map') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      expect(w.findAll('.plan-map .place'), q.id).toHaveLength(part.cells.flat().filter(Boolean).length)
      expect(w.find('.plan-map .title').exists(), q.id).toBe(!!part.title)
      expect(w.findAll('.plan-map .mark'), q.id).toHaveLength(part.marks?.length ?? 0)
      for (const m of part.marks ?? []) expect(w.find(`.cell[data-r="${m.r}"][data-c="${m.c}"] .mark.at-${m.at}`).exists(), q.id).toBe(true)
      expect(w.findAll('.plan-map .roads line').length > 0, q.id).toBe(!!part.roads)
      w.unmount()
    }
  })

  it('指南针：问号的位置', () => {
    for (const { q, part } of find('compass')) {
      if (part.kind !== 'compass') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      expect(w.find('.compass').exists(), q.id).toBe(true)
      if (part.ask) expect(w.find('.compass .ask').attributes('data-dir'), q.id).toBe(part.ask)
      else expect(w.find('.compass .ask').exists(), q.id).toBe(false)
      w.unmount()
    }
  })
})
