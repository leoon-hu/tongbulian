// @vitest-environment happy-dom
// 三下「数据的收集与整理」「年、月、日的秘密」的新教具：记录单（TallySheet）、统计表（StatTable）、月历（MonthCalendar）。
// 先用手写的数据查每个组件画得对，再挂真实题目查 QuestionRenderer 把字段都转发了（曾因漏转字段出过 bug）。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { setLang } from '@/engine/i18n'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import TallySheet from '@/components/math/TallySheet.vue'
import StatTable from '@/components/math/StatTable.vue'
import MonthCalendar from '@/components/math/MonthCalendar.vue'
import { hasBlank, hasChoiceBlank } from '@/components/practice/blank'

afterEach(() => setLang('zh'))

describe('记录单（TallySheet）', () => {
  const rows = [
    { label: { k: 'm3.data.item.truck' }, icon: '🚚', count: 13, mark: 'zheng' as const },
    { label: { k: 'm3.data.item.bus' }, icon: '🚌', count: 7, mark: 'check' as const },
    { label: { k: 'm3.data.item.moto' }, icon: '🏍️', count: 4, mark: 'circle' as const },
    { label: { k: 'm3.data.item.car' }, count: 3, mark: 'zheng' as const },
  ]

  it('「正」字 5 画一个、按笔顺画，最后一个不满 5 画；√、○ 一个一个画', () => {
    const w = mount(TallySheet, { props: { rows } })
    const lines = w.findAll('.row')
    expect(lines).toHaveLength(4)
    // 13 = 5 + 5 + 3：三个字，笔画数 5、5、3，一共 13 笔
    const z = lines[0]!.findAll('svg.zheng')
    expect(z.map((s) => s.attributes('data-strokes'))).toEqual(['5', '5', '3'])
    expect(lines[0]!.findAll('svg.zheng path')).toHaveLength(13)
    expect(lines[1]!.findAll('svg.check')).toHaveLength(7)
    expect(lines[2]!.findAll('svg.circle')).toHaveLength(4)
    // 不满 5 画的只有一个字（3 画）
    expect(lines[3]!.findAll('svg.zheng').map((s) => s.attributes('data-strokes'))).toEqual(['3'])
    expect(lines[0]!.find('.label').text()).toBe('🚚货车')
    expect(lines[3]!.find('.icon').exists()).toBe(false)
    w.unmount()
  })

  it('名字随语言切换，英文首字母大写', () => {
    setLang('en')
    const w = mount(TallySheet, { props: { rows } })
    expect(w.findAll('.label').map((l) => l.text())).toEqual(['🚚Trucks', '🚌Buses', '🏍️Motorbikes', 'Cars'])
    w.unmount()
  })
})

describe('统计表（StatTable）', () => {
  const rows = [
    [{ k: 'm3.data.head.place' }, { k: 'm3.data.item.zoo' }, { k: 'm3.data.item.garden' }],
    [{ k: 'm3.data.head.people' }, 7, null],
  ]

  it('默认第一列是表头；null 的格子画成「?」；有表题', () => {
    const w = mount(StatTable, { props: { title: { k: 'm3.data.title.sport' }, rows } })
    expect(w.find('figcaption').text()).toBe('男生、女生最喜欢的运动项目人数情况')
    const cells = w.findAll('td')
    expect(cells.map((c) => c.text())).toEqual(['地点', '动物园', '植物园', '人数', '7', '?'])
    expect(cells.filter((c) => c.classes('head')).map((c) => c.text())).toEqual(['地点', '人数'])
    expect(w.findAll('td.ask .q')).toHaveLength(1)
    expect(cells[4]!.classes()).toContain('num')
    w.unmount()
  })

  it('head = row 第一行是表头、none 没有表头；英文首字母大写', () => {
    const r = mount(StatTable, { props: { rows, head: 'row' } })
    expect(r.findAll('td.head').map((c) => c.text())).toEqual(['地点', '动物园', '植物园'])
    expect(r.find('figcaption').exists()).toBe(false)
    r.unmount()
    const n = mount(StatTable, { props: { rows: [[1, 2, 3]], head: 'none' } })
    expect(n.findAll('td.head')).toHaveLength(0)
    n.unmount()
    setLang('en')
    const e = mount(StatTable, { props: { rows } })
    expect(e.findAll('td').map((c) => c.text()).slice(0, 3)).toEqual(['Place', 'Zoo', 'Garden'])
    e.unmount()
  })
})

describe('月历（MonthCalendar）', () => {
  // 2024 年 2 月：1 日是星期四，29 天（课本 p78）
  const props = { title: { k: 'm3.cal.ym', p: { y: 2024, mon: { k: 'm3.cal.mon.2' } } }, days: 29, first: 4, mark: [15] }

  it('星期一在最前，1 日前空 3 格，六、日两列红字，圈出的日子有圈', () => {
    const w = mount(MonthCalendar, { props })
    expect(w.find('figcaption').text()).toBe('2024 年 2 月')
    expect(w.findAll('.head').map((h) => h.text())).toEqual(['一', '二', '三', '四', '五', '六', '日'])
    expect(w.findAll('.head.weekend').map((h) => h.text())).toEqual(['六', '日'])
    const days = w.findAll('.day')
    expect(days.length % 7).toBe(0)
    expect(days.slice(0, 3).every((d) => d.classes('blank'))).toBe(true)
    expect(days[3]!.text()).toBe('1')
    expect(days.filter((d) => !d.classes('blank')).map((d) => Number(d.text()))).toEqual(Array.from({ length: 29 }, (_, i) => i + 1))
    // 2024 年 2 月 3 日、4 日是星期六、星期日
    const weekend = days.filter((d) => d.classes('weekend') && !d.classes('blank')).map((d) => Number(d.text()))
    expect(weekend.slice(0, 2)).toEqual([3, 4])
    expect(w.findAll('.day.marked').map((d) => d.text())).toEqual(['15'])
    w.unmount()
  })

  it('英文：February 2024，Mo–Su', () => {
    setLang('en')
    const w = mount(MonthCalendar, { props })
    expect(w.find('figcaption').text()).toBe('February 2024')
    expect(w.findAll('.head').map((h) => h.text())).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])
    w.unmount()
  })
})

describe('QuestionRenderer 转发新教具的全部字段（真实题目）', () => {
  /** 在一个知识点三档、若干种子里找出带某种部件的题 */
  function find(kpId: string, kind: StemPart['kind'], ok: (p: StemPart) => boolean = () => true): { q: Question; part: StemPart }[] {
    const gen = getGenerator(kpId)!
    const out: { q: Question; part: StemPart }[] = []
    for (let seed = 1; seed <= 80 && out.length < 12; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const part = q.stem.find((p) => p.kind === kind && ok(p))
        if (part) out.push({ q, part })
      }
    }
    expect(out.length).toBeGreaterThan(0)
    return out
  }

  it('记录单：行数、每行的记号个数、名字', () => {
    for (const kp of ['m3s2-05-record']) {
      for (const { q, part } of find(kp, 'tally')) {
        if (part.kind !== 'tally') continue
        const w = mount(QuestionRenderer, { props: { question: q } })
        const lines = w.findAll('.tally .row')
        expect(lines).toHaveLength(part.rows.length)
        part.rows.forEach((r, i) => {
          if (r.mark === 'zheng') expect(lines[i]!.findAll('svg.zheng path')).toHaveLength(r.count)
          else expect(lines[i]!.findAll(`svg.${r.mark}`)).toHaveLength(r.count)
        })
        w.unmount()
      }
    }
  })

  it('统计表：表题、表头（head）、每一格', () => {
    for (const kp of ['m3s2-05-record', 'm3s2-05-table', 'm3s2-05-segments', 'm3s2-06-24h']) {
      for (const { q, part } of find(kp, 'stat-table')) {
        if (part.kind !== 'stat-table') continue
        const w = mount(QuestionRenderer, { props: { question: q } })
        const tables = w.findAll('.stat-table')
        const all = q.stem.filter((p) => p.kind === 'stat-table')
        expect(tables).toHaveLength(all.length)
        const t = tables[all.indexOf(part)]!
        expect(t.find('figcaption').exists()).toBe(part.title !== undefined)
        expect(t.find('table').classes()).toContain(`head-${part.head ?? 'col'}`)
        expect(t.findAll('td')).toHaveLength(part.rows.flat().length)
        expect(t.findAll('td.ask')).toHaveLength(part.rows.flat().filter((c) => c === null).length)
        expect(t.text()).not.toMatch(/\bm3\.[a-zA-Z]|undefined|NaN/)
        w.unmount()
      }
    }
  })

  it('月历：标题、天数、1 日的位置、圈出的日子', () => {
    for (const { q, part } of find('m3s2-06-calendar', 'calendar', (p) => p.kind === 'calendar' && !!p.mark)) {
      if (part.kind !== 'calendar') continue
      const w = mount(QuestionRenderer, { props: { question: q } })
      const days = w.findAll('.calendar .day')
      expect(days.filter((d) => !d.classes('blank'))).toHaveLength(part.days)
      expect(days.findIndex((d) => d.text() === '1')).toBe(part.first - 1)
      expect(w.findAll('.calendar .day.marked').map((d) => Number(d.text()))).toEqual(part.mark)
      w.unmount()
    }
  })
})

describe('统计表要填的那一格：练习页把按的数字填进格子里（blank.ts，U5）', () => {
  it('数字键盘题算「有空可填」、选择题答完填上；按的数字显示在「?」那一格，判完变绿', () => {
    const gen = getGenerator('m3s2-05-record')!
    let pad = 0
    let choice = 0
    for (let seed = 1; seed <= 600 && (pad < 3 || choice < 3); seed++) {
      const q = gen(1, createRng(seed))
      if (!q.stem.some((p) => p.kind === 'stat-table' && p.rows.some((r) => r.includes(null)))) continue
      if (q.input === 'choice') {
        choice += 1
        expect(hasChoiceBlank(q), q.id).toBe(true)
        expect(hasBlank(q), q.id).toBe(false)
        continue
      }
      pad += 1
      expect(hasBlank(q), q.id).toBe(true)
      expect(hasChoiceBlank(q), q.id).toBe(false)
      // 还没按：淡色「?」；按了 12：格子里是 12；判完：绿色
      const empty = mount(QuestionRenderer, { props: { question: q, fill: { value: '', done: false } } })
      expect(empty.find('td.ask .q').text()).toBe('?')
      expect(empty.find('td.ask .q').classes()).toContain('empty')
      empty.unmount()
      const typed = mount(QuestionRenderer, { props: { question: q, fill: { value: '12', done: false } } })
      expect(typed.find('td.ask .q').text()).toBe('12')
      expect(typed.find('td.ask .q').classes()).not.toContain('empty')
      typed.unmount()
      const done = mount(QuestionRenderer, { props: { question: q, fill: { value: '12', done: true } } })
      expect(done.find('td.ask .q').classes()).toContain('done')
      done.unmount()
      // 对战里不传 fill：画「?」
      const battle = mount(QuestionRenderer, { props: { question: q } })
      expect(battle.find('td.ask .q').text()).toBe('?')
      battle.unmount()
    }
    expect(pad).toBeGreaterThanOrEqual(3)
    expect(choice).toBeGreaterThanOrEqual(3)
  })

  it('没有空格子的统计表不算「有空可填」', () => {
    const gen = getGenerator('m3s2-05-table')!
    for (let seed = 1; seed <= 30; seed++) {
      const q = gen(1, createRng(seed))
      expect(hasBlank(q), q.id).toBe(false)
      expect(hasChoiceBlank(q), q.id).toBe(false)
    }
  })
})
