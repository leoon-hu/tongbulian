import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'

// 三下「数据的收集与整理」的专项检查：答案都从题目本身（记录单的行、统计表的格子、题目文字的参数）重新算一遍，
// 课本的标准（跳绳等级、各种分段）在这里独立写一份，不用生成器里的表。
const SEEDS = 150
type Tally = Extract<StemPart, { kind: 'tally' }>
type Table = Extract<StemPart, { kind: 'stat-table' }>

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const zh = (l: LStr): string => translate(l, 'zh')
const keyOf = (l: LStr): string => (typeof l === 'string' ? l : l.k)
/** 题目文字（第一段 text）的词条键与参数 */
function textOf(q: Question): { k: string; p: Record<string, unknown> } {
  const t = q.stem.find((p) => p.kind === 'text')
  if (!t || t.kind !== 'text' || typeof t.text === 'string') throw new Error(`${q.id} 没有文字`)
  return { k: t.text.k, p: (t.text.p ?? {}) as Record<string, unknown> }
}
const tallyOf = (q: Question): Tally | undefined => q.stem.find((p): p is Tally => p.kind === 'tally')
const tablesOf = (q: Question): Table[] => q.stem.filter((p): p is Table => p.kind === 'stat-table')
const correctLabel = (q: Question): LStr => {
  const id = (q.answer as { choiceId: string }).choiceId
  return q.choices!.find((c) => c.id === id)!.label
}
const answerOf = (q: Question): number | LStr => (q.answer.kind === 'number' ? q.answer.value : correctLabel(q))
/** 数字键盘题的答案 / 选择题的数字选项 */
const numAnswer = (q: Question): number => {
  const a = answerOf(q)
  return typeof a === 'number' ? a : Number(zh(a))
}
const same = (a: LStr, b: LStr): boolean => labelKey(a) === labelKey(b)

describe('数据的收集和记录（m3s2-05-record）', () => {
  it('答案都能从记录单 / 统计表重新算出来', () => {
    const kinds = new Set<string>()
    each('m3s2-05-record', (q, d) => {
      const { k, p } = textOf(q)
      const tally = tallyOf(q)
      const [table] = tablesOf(q)
      // 数据：记录单优先（「正」字、√、○ 的个数就是数量），其次统计表的第二行
      const rows: { label: LStr; count: number }[] = tally
        ? tally.rows.map((r) => ({ label: r.label, count: r.count }))
        : table
          ? table.rows[0]!.slice(1).map((label, i) => ({ label: label as LStr, count: table.rows[1]![i + 1] as number }))
          : []
      const countOf = (x: LStr): number => rows.find((r) => same(r.label, x))!.count
      const scene = k.split('.')[2]
      if (/\.count$/.test(k)) {
        kinds.add('count')
        expect(numAnswer(q), q.id).toBe(countOf(p.x as LStr))
      } else if (/\.(most|least)$/.test(k)) {
        kinds.add('most')
        const counts = rows.map((r) => r.count)
        const target = k.endsWith('most') ? Math.max(...counts) : Math.min(...counts)
        expect(counts.filter((c) => c === target), q.id).toHaveLength(1)
        expect(zh(correctLabel(q)), q.id).toBe(zh(rows.find((r) => r.count === target)!.label))
        // 选项就是这几类，没有别的
        expect(q.choices!.map((c) => zh(c.label)).sort()).toEqual(rows.map((r) => zh(r.label)).sort())
      } else if (/\.total$/.test(k)) {
        kinds.add('total')
        expect(numAnswer(q), q.id).toBe(rows.reduce((s, r) => s + r.count, 0))
      } else if (/\.diff$/.test(k)) {
        kinds.add('diff')
        const v = countOf(p.a as LStr) - countOf(p.b as LStr)
        expect(v, q.id).toBeGreaterThan(0)
        expect(numAnswer(q), q.id).toBe(v)
      } else if (k === 'm3.data.fillTable') {
        kinds.add('fill')
        // 统计表里只有一格是空的，其余格子和记录单一致；空的那一格填记录单上那一类的数量
        const cells = table!.rows[1]!.slice(1)
        expect(cells.filter((c) => c === null), q.id).toHaveLength(1)
        cells.forEach((c, i) => c !== null && expect(c, q.id).toBe(tally!.rows[i]!.count))
        const at = cells.indexOf(null)
        expect(same(table!.rows[0]![at + 1] as LStr, tally!.rows[at]!.label)).toBe(true)
        expect(numAnswer(q), q.id).toBe(tally!.rows[at]!.count)
      } else if (k === 'm3.data.zhengStrokes' || k === 'm3.data.zhengMeans') {
        kinds.add('fact')
        expect(numAnswer(q), q.id).toBe(5)
      } else if (k === 'm3.data.zhengMany') {
        kinds.add('many')
        expect(numAnswer(q), q.id).toBe(5 * (p.n as number))
      } else if (k === 'm3.data.vote.absent') {
        kinds.add('vote')
        // 票多的一定能当选 ⇔ 相差的票数比没投票的人数多
        const w = p.w as LStr
        const win = countOf(w)
        const lose = rows.find((r) => !same(r.label, w))!.count
        expect(win, q.id).toBeGreaterThan(lose)
        expect(keyOf(correctLabel(q)), q.id).toBe(win - lose > (p.n as number) ? 'm3.data.opt.sure' : 'm3.data.opt.notSure')
      } else throw new Error(`没有检查到的题：${q.id} ${k}`)
      // 场景一致：问的词条和记录单 / 统计表是同一个情境（问春游地点的题，表里是春游地点）
      if (scene && ['trip', 'car', 'weather', 'color', 'vote', 'club', 'fruit'].includes(scene) && table) {
        const head: Record<string, string> = { trip: 'place', car: 'car', weather: 'weather', color: 'color', vote: 'name', club: 'club', fruit: 'fruit' }
        expect(keyOf(table.rows[0]![0] as LStr), q.id).toBe(`m3.data.head.${head[scene]}`)
      }
      if (tally) {
        for (const r of tally.rows) {
          expect(r.count, q.id).toBeGreaterThan(0)
          // 第 1 档一行最多 5 个「正」字；√、○ 最多 12 个（数得过来）
          if (d === 1) expect(r.count, q.id).toBeLessThanOrEqual(25)
          if (r.mark !== 'zheng') expect(r.count, q.id).toBeLessThanOrEqual(12)
        }
        // 一个月的天气：三类加起来是 30 或 31 天
        if (scene === 'weather' && tally.rows.length === 3) expect([30, 31], q.id).toContain(tally.rows.reduce((s, r) => s + r.count, 0))
      }
    })
    expect([...kinds].sort()).toEqual(['count', 'diff', 'fact', 'fill', 'many', 'most', 'total', 'vote'])
  })

  it('第 1 档：一行或一张记录单、统计表的读法，不出投票推理和混合记号', () => {
    each('m3s2-05-record', (q, d) => {
      if (d !== 1) return
      expect(textOf(q).k).not.toBe('m3.data.vote.absent')
      for (const r of tallyOf(q)?.rows ?? []) expect(r.mark).toBe('zheng')
    })
  })
})

describe('复式统计表（m3s2-05-table）', () => {
  const GROUP_ROW: Record<string, string> = { 'm3.data.boys': 'm3.data.boysNum', 'm3.data.girls': 'm3.data.girlsNum', 'm3.data.g1': 'm3.data.g1', 'm3.data.g3': 'm3.data.g3' }
  /** 统计表的一行：第一格的词条键 → 后面的数 */
  const rowOf = (t: Table, key: string): number[] => t.rows.find((r) => keyOf(r[0] as LStr) === key)!.slice(1) as number[]
  const colOf = (t: Table, x: LStr): number => t.rows[0]!.findIndex((c, i) => i > 0 && same(c as LStr, x)) - 1

  it('答案都能从表里的格子重新算出来', () => {
    const kinds = new Set<string>()
    each('m3s2-05-table', (q) => {
      const { k, p } = textOf(q)
      const tables = tablesOf(q)
      const t = tables[0]!
      // 表里除了表头都是数（要填的格子是 null）
      for (const row of t.rows.slice(1)) for (const c of row.slice(1)) expect(c === null || typeof c === 'number', q.id).toBe(true)
      if (k.endsWith('.cell')) {
        kinds.add('cell')
        expect(numAnswer(q), q.id).toBe(rowOf(t, GROUP_ROW[keyOf(p.g as LStr)]!)[colOf(t, p.x as LStr)])
      } else if (k.endsWith('.most') && k !== 'm3.data.air.most') {
        kinds.add('most')
        const row = rowOf(t, GROUP_ROW[keyOf(p.g as LStr)]!)
        const max = Math.max(...row)
        expect(row.filter((x) => x === max), q.id).toHaveLength(1)
        expect(same(correctLabel(q), t.rows[0]![row.indexOf(max) + 1] as LStr), q.id).toBe(true)
      } else if (k.endsWith('.colSum') && !k.includes('staff')) {
        kinds.add(tables.length === 2 ? 'two' : 'colSum')
        // 一张复式表：同一列两行相加；两张单式表：两张表同一项相加
        const v = tables.length === 2 ? tables.reduce((s, tb) => s + (tb.rows[1]![colOf(tb, p.x as LStr) + 1] as number), 0) : t.rows.slice(1).reduce((s, r) => s + (r[colOf(t, p.x as LStr) + 1] as number), 0)
        expect(numAnswer(q), q.id).toBe(v)
      } else if (k === 'm3.data.sport.diff' || k === 'm3.data.book.diff') {
        kinds.add('diff')
        const c = colOf(t, p.x as LStr)
        const v = rowOf(t, GROUP_ROW[keyOf(p.a as LStr)]!)[c]! - rowOf(t, GROUP_ROW[keyOf(p.b as LStr)]!)[c]!
        expect(v, q.id).toBeGreaterThan(0)
        expect(numAnswer(q), q.id).toBe(v)
      } else if (k === 'm3.data.level.more' || k === 'm3.data.level.fewer') {
        kinds.add('level')
        const c = colOf(t, p.x as LStr)
        const v = rowOf(t, 'm3.data.g3')[c]! - rowOf(t, 'm3.data.g1')[c]!
        expect(k.endsWith('more') ? v : -v, q.id).toBeGreaterThan(0)
        expect(numAnswer(q), q.id).toBe(Math.abs(v))
      } else if (k === 'm3.data.rowTotal' || k === 'm3.data.level.rowTotal') {
        kinds.add('rowTotal')
        expect(numAnswer(q), q.id).toBe(rowOf(t, GROUP_ROW[keyOf(p.g as LStr)]!).reduce((a, b) => a + b, 0))
      } else if (k === 'm3.data.grandTotal') {
        kinds.add('grandTotal')
        expect(numAnswer(q), q.id).toBe(t.rows.slice(1).reduce((s, r) => s + (r.slice(1) as number[]).reduce((a, b) => a + b, 0), 0))
      } else if (k.startsWith('m3.data.air.')) {
        kinds.add('air')
        // 课本做一做 1 的真实数据
        expect(t.rows.slice(1).map((r) => r.slice(1))).toEqual([
          [76, 98, 127],
          [153, 163, 188],
          [77, 63, 38],
          [37, 26, 11],
        ])
        const years = t.rows[0]!.slice(1).map((c) => (c as unknown as { p: { y: number } }).p.y)
        expect(years).toEqual([2016, 2020, 2024])
        const row = t.rows.find((r) => same(r[0] as LStr, p.lv as LStr))!.slice(1) as number[]
        if (k === 'm3.data.air.most' || k === 'm3.data.air.least') {
          const target = k.endsWith('most') ? Math.max(...row) : Math.min(...row)
          expect((correctLabel(q) as unknown as { p: { y: number } }).p.y, q.id).toBe(years[row.indexOf(target)])
        } else {
          const v = row[years.indexOf(p.y2 as number)]! - row[years.indexOf(p.y1 as number)]!
          expect((p.y2 as number) > (p.y1 as number)).toBe(true)
          expect(k.endsWith('more') ? v : -v, q.id).toBeGreaterThan(0)
          expect(numAnswer(q), q.id).toBe(Math.abs(v))
        }
      } else if (k.startsWith('m3.data.staff.')) {
        kinds.add('staff')
        const b1 = rowOf(t, 'm3.data.branch.1')
        const b2 = rowOf(t, 'm3.data.branch.2')
        if (k === 'm3.data.staff.rowTotal') expect(numAnswer(q), q.id).toBe(rowOf(t, keyOf(p.b as LStr)).reduce((a, b) => a + b, 0))
        else {
          const c = colOf(t, p.x as LStr)
          expect(numAnswer(q), q.id).toBe(k.endsWith('colSum') ? b1[c]! + b2[c]! : b2[c]! - b1[c]!)
          if (k.endsWith('more')) expect(b2[c]!, q.id).toBeGreaterThan(b1[c]!)
        }
        // 三位数（课本 133、267……）
        expect(Math.max(...b1, ...b2)).toBeGreaterThanOrEqual(100)
      } else if (k.startsWith('m3.data.rope.sum')) {
        kinds.add('ropeSum')
        const g = rowOf(t, 'm3.data.girlsNum')
        const b = rowOf(t, 'm3.data.boysNum')
        const sumRow = t.rows.find((r) => keyOf(r[0] as LStr) === 'm3.data.sum')
        if (k === 'm3.data.rope.sumAsk') {
          const at = sumRow!.indexOf(null) - 1
          sumRow!.slice(1).forEach((c, i) => c !== null && expect(c).toBe(g[i]! + b[i]!))
          expect(numAnswer(q), q.id).toBe(g[at]! + b[at]!)
        } else if (k === 'm3.data.rope.sumMost') {
          const total = g.map((x, i) => x + b[i]!)
          const max = Math.max(...total)
          expect(total.filter((x) => x === max)).toHaveLength(1)
          expect(same(correctLabel(q), t.rows[0]![total.indexOf(max) + 1] as LStr), q.id).toBe(true)
        } else {
          // 不及格一栏两行相加（这张表没有合计行）
          expect(sumRow).toBeUndefined()
          expect(keyOf(t.rows[0]![1] as LStr)).toBe('m3.data.lv.fail')
          expect(numAnswer(q), q.id).toBe(g[0]! + b[0]!)
        }
      } else throw new Error(`没有检查到的题：${q.id} ${k}`)
    })
    expect([...kinds].sort()).toEqual(['air', 'cell', 'colSum', 'diff', 'grandTotal', 'level', 'most', 'ropeSum', 'rowTotal', 'staff', 'two'])
  })

  it('手机上放得下：一张表最多 5 栏（表头 + 4 项），两张单式表各 4 栏', () => {
    each('m3s2-05-table', (q) => {
      const tables = tablesOf(q)
      for (const t of tables) for (const r of t.rows) expect(r.length, q.id).toBeLessThanOrEqual(tables.length === 2 ? 4 : 5)
    })
  })
})

describe('分段整理数据（m3s2-05-segments）', () => {
  // 课本例 3：三年级一分钟跳绳等级（男生、女生标准不同）
  const ROPE: Record<'boy' | 'girl', [string, number, number][]> = {
    boy: [
      ['excellent', 116, Infinity],
      ['good', 104, 115],
      ['pass', 34, 103],
      ['fail', -Infinity, 33],
    ],
    girl: [
      ['excellent', 125, Infinity],
      ['good', 109, 124],
      ['pass', 39, 108],
      ['fail', -Infinity, 38],
    ],
  }
  const levelOf = (g: 'boy' | 'girl', n: number): string => ROPE[g].find(([, lo, hi]) => n >= lo && n <= hi)![0]
  // 练习十五 4 阅读时间、练习十四 4 做家务的时间、例 3 做一做的身高：分段的写法 → 范围
  const BANDS: Record<string, [string, number, number][]> = {
    read: [
      ['0—30', 0, 30],
      ['31—60', 31, 60],
      ['60 以上', 61, Infinity],
    ],
    chore: [
      ['10 及以下', -Infinity, 10],
      ['11—20', 11, 20],
      ['21—30', 21, 30],
      ['31 及以上', 31, Infinity],
    ],
    height: [
      ['119 及以下', -Infinity, 119],
      ['120—129', 120, 129],
      ['130—139', 130, 139],
      ['140 及以上', 140, Infinity],
    ],
  }
  const bandOf = (set: string, n: number): string => BANDS[set]!.find(([, lo, hi]) => n >= lo && n <= hi)![0]
  /** 句子里说的分段（{seg}）→ 表里的写法 */
  function segToBand(seg: LStr): [number, number] {
    const s = seg as { k: string; p: { a: number; b?: number } }
    if (s.k === 'm3.data.seg.range') return [s.p.a, s.p.b!]
    if (s.k === 'm3.data.seg.max') return [-Infinity, s.p.a]
    if (s.k === 'm3.data.seg.min') return [s.p.a, Infinity]
    return [s.p.a + 1, Infinity] // over：「60 以上」不含 60
  }
  const gridNumbers = (t: Table): number[] => t.rows.flat() as number[]

  it('答案都能从标准和数据重新算出来', () => {
    const kinds = new Set<string>()
    each('m3s2-05-segments', (q) => {
      const { k, p } = textOf(q)
      const [t] = tablesOf(q)
      if (k === 'm3.data.rope.levelOf') {
        kinds.add('level')
        const g = keyOf(p.g as LStr) === 'm3.data.boy' ? 'boy' : 'girl'
        expect(keyOf(correctLabel(q)), q.id).toBe(`m3.data.lv.${levelOf(g, p.n as number)}`)
        // 标准表：一个性别两栏，男女都有是三栏；写法照课本
        const col = t!.rows[0]!.length === 3 ? (g === 'boy' ? 1 : 2) : 1
        const text = t!.rows.slice(1).map((r) => zh(r[col] as LStr))
        expect(text, q.id).toEqual(g === 'boy' ? ['116 及以上', '104—115', '34—103', '33 及以下'] : ['125 及以上', '109—124', '39—108', '38 及以下'])
        expect(q.choices!.map((c) => keyOf(c.label)).sort()).toEqual(['m3.data.lv.excellent', 'm3.data.lv.fail', 'm3.data.lv.good', 'm3.data.lv.pass'])
        // 男女都有的表：出的次数男女等级不同（108 次男生良好、女生及格）
        if (t!.rows[0]!.length === 3) expect(levelOf('boy', p.n as number), q.id).not.toBe(levelOf('girl', p.n as number))
      } else if (/^m3\.data\.seg\.(read|chore|height)$/.test(k)) {
        kinds.add('which')
        const set = k.split('.')[3]!
        expect(zh(correctLabel(q)), q.id).toBe(bandOf(set, p.n as number))
        expect(q.choices!.map((c) => zh(c.label)).sort()).toEqual(BANDS[set]!.map(([s]) => s).sort())
      } else if (/countIn$/.test(k)) {
        kinds.add('count')
        const [lo, hi] = segToBand(p.seg as LStr)
        const nums = gridNumbers(t!)
        expect(numAnswer(q), q.id).toBe(nums.filter((n) => n >= lo && n <= hi).length)
      } else if (/countInG$/.test(k)) {
        kinds.add('gender')
        const [lo, hi] = segToBand(p.seg as LStr)
        const g = keyOf(p.g as LStr) === 'm3.data.boys' ? 'boy' : 'girl'
        // 格子照课本写「男 31」「女 36」
        const cells = (t!.rows.flat() as LStr[]).map((c) => c as { k: string; p: { v: number } })
        for (const c of cells) expect(zh(c), q.id).toMatch(/^[男女] \d+$/)
        expect(numAnswer(q), q.id).toBe(cells.filter((c) => c.k === `m3.data.cell.${g}` && c.p.v >= lo && c.p.v <= hi).length)
      } else if (k === 'm3.data.seg.mostBand') {
        kinds.add('most')
        const nums = gridNumbers(t!)
        const title = keyOf(t!.title!)
        const set = title.split('.')[3]!
        const counts = BANDS[set]!.map(([, lo, hi]) => nums.filter((n) => n >= lo && n <= hi).length)
        const max = Math.max(...counts)
        expect(counts.filter((c) => c === max)).toHaveLength(1)
        expect(zh(correctLabel(q)), q.id).toBe(BANDS[set]![counts.indexOf(max)]![0])
      } else if (k === 'm3.data.rope.countLevel') {
        kinds.add('ropeCount')
        const g = keyOf(p.g as LStr) === 'm3.data.boys' ? 'boy' : 'girl'
        const lv = keyOf(p.lv as LStr).split('.').pop()!
        // 句子里说的那一段正好是这个等级的标准
        const [lo, hi] = segToBand(p.seg as LStr)
        const band = ROPE[g].find(([name]) => name === lv)!
        expect([lo === -Infinity ? band[1] : lo, hi]).toEqual([band[1], band[2]])
        const nums = gridNumbers(t!)
        expect(numAnswer(q), q.id).toBe(nums.filter((n) => levelOf(g, n) === lv).length)
      } else throw new Error(`没有检查到的题：${q.id} ${k}`)
    })
    expect([...kinds].sort()).toEqual(['count', 'gender', 'level', 'most', 'ropeCount', 'which'])
  })

  it('第 1 档常考分界上的数（116、115、33……），各段都出', () => {
    const boundary = new Set<number>()
    const levels = new Set<string>()
    each('m3s2-05-segments', (q, d) => {
      if (d !== 1 || textOf(q).k !== 'm3.data.rope.levelOf') return
      const n = textOf(q).p.n as number
      if ([116, 115, 104, 103, 34, 33, 125, 124, 109, 108, 39, 38].includes(n)) boundary.add(n)
      levels.add(keyOf(correctLabel(q)))
    })
    expect(boundary.size).toBeGreaterThan(3)
    expect(levels.size).toBe(4)
  })
})

describe('数据的收集与整理：文字与朗读', () => {
  it('题目文字里没有斜线（会当成分数）、括号（会读成「括号」）；英文问号前不是标点（会读成 what）', () => {
    for (const kp of ['m3s2-05-record', 'm3s2-05-table', 'm3s2-05-segments']) {
      each(kp, (q) => {
        for (const part of q.stem) {
          if (part.kind !== 'text') continue
          const z = translate(part.text, 'zh')
          const e = translate(part.text, 'en')
          expect(z, q.id).not.toMatch(/[/()（）]/)
          expect(e, q.id).not.toMatch(/[/()]/)
          expect(e, q.id).not.toMatch(/[^\w\s]\?/)
        }
      })
    }
  })
})
