import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { BOTTLES, DONATE, KICK_BOYS, KICK_GIRLS, LIFE_MEN, LIFE_WOMEN, POP_RURAL, POP_TOWN, SCORES } from '../average'

// 四下「平均数与条形统计图」：从题目（移多补少图、统计表、条形统计图里的数、题干的参数）反推答案，150 种子 × 三档；
// 外加课本的约束：平均数都是整数（G14）、第 1 档出得到例 1（移多补少、先合再分）、例 2、做一做，复式图的最多 / 最少只有一个。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Param = LStr | number
type Chart = Extract<StemPart, { kind: 'bar-chart' }>
type Table = Extract<StemPart, { kind: 'stat-table' }>

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const texts = (q: Question): { k: string; p: Record<string, Param> }[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const textOf = (q: Question): { k: string; p: Record<string, Param> } => texts(q)[texts(q).length - 1]!
const part = <K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined => q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === kind)
const answerOf = (q: Question): number | string => {
  if (q.answer.kind === 'number') return q.answer.value
  const id = q.answer.choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}
const num = (q: Question): number => Number(answerOf(q))
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)
/** 统计表里某一行的数（第一格是表头） */
const rowNums = (t: Table, r: number): number[] => t.rows[r]!.slice(1).filter((c): c is number => typeof c === 'number')

describe('平均数（m4s2-08-average）', () => {
  it('从图、表、算式反推答案；课本的平均数都是整数', () => {
    each('m4s2-08-average', (q) => {
      const kind = kindOf(q)
      const { k, p } = textOf(q)
      const sub = q.id.split(':')[1]!.split('-')[1]
      switch (kind) {
        case 'bottle': {
          const e = part(q, 'even-out')
          const expr = part(q, 'expr')
          const xs = e ? e.rows.map((r) => r.count) : (expr!.expr.match(/\d+/g) ?? []).map(Number).slice(0, -1)
          expect(sum(xs) % xs.length, `${q.id} 平均数不是整数`).toBe(0)
          const avg = sum(xs) / xs.length
          if (sub === 'avg' || sub === 'expr') expect(num(q), q.id).toBe(avg)
          else if (sub === 'total') expect(num(q), q.id).toBe(sum(xs))
          else if (sub === 'move') {
            // 图上画了平均数的虚线，问的那个人要拿出 / 补上几个
            expect(e!.avg).toBe(avg)
            const i = WHO.indexOf((p.x as { k: string }).k.split('.').pop()!)
            expect(num(q), q.id).toBe(Math.abs(xs[i]! - avg))
            expect(k.endsWith('.out')).toBe(xs[i]! > avg)
          } else if (sub === 'way') expect(answerOf(q)).toBe(`(${xs.join(' + ')}) ÷ 4`)
          else throw new Error(q.id)
          if (e && sub !== 'move') expect(e.avg, `${q.id} 求平均数的图不能画出平均数`).toBeUndefined()
          break
        }
        case 'kick': {
          if (sub === 'why') {
            expect(answerOf(q)).toBe('每队的平均数')
            break
          }
          const t = part(q, 'stat-table')!
          const boys = rowNums(t, 0)
          const girls = rowNums(t, 1)
          expect(boys).toHaveLength(5)
          expect(girls).toHaveLength(4)
          expect(sum(boys) % 5).toBe(0)
          expect(sum(girls) % 4).toBe(0)
          if (sub === 'avg') expect(num(q), q.id).toBe(k.endsWith('Girls') ? sum(girls) / 4 : sum(boys) / 5)
          else expect(answerOf(q), q.id).toBe(sum(girls) / 4 > sum(boys) / 5 ? '女生队' : '男生队')
          break
        }
        case 'donate':
        case 'temp':
        case 'time': {
          const xs = rowNums(part(q, 'stat-table')!, 1)
          expect(xs).toHaveLength(kind === 'temp' ? 7 : 5)
          expect(sum(xs) % xs.length, q.id).toBe(0)
          expect(num(q), q.id).toBe(sum(xs) / xs.length)
          break
        }
        case 'body': {
          const t = part(q, 'stat-table')!
          const xs = rowNums(t, sub === 'h' ? 1 : 2)
          expect(xs).toHaveLength(6)
          expect(sum(xs) % 6, q.id).toBe(0)
          expect(num(q), q.id).toBe(sum(xs) / 6)
          break
        }
        case 'berry': {
          const c = part(q, 'bar-chart')!
          const xs = c.series[0]!.values as number[]
          expect(xs).toHaveLength(7)
          expect(sum(xs) % 7).toBe(0)
          expect(num(q), q.id).toBe(sum(xs) / 7)
          expect(c.step).toBe(2)
          expect(Math.max(...xs)).toBeLessThan(c.cells * c.step)
          break
        }
        case 'drop': {
          const xs = rowNums(part(q, 'stat-table')!, 1)
          const sorted = [...xs].sort((a, b) => a - b)
          expect(sorted[0]).not.toBe(sorted[1])
          expect(sorted[5]).not.toBe(sorted[6])
          const mid = sorted.slice(1, 6)
          expect(sum(mid) % 5).toBe(0)
          expect(num(q), q.id).toBe(sum(mid) / 5)
          break
        }
        case 'judge':
          expect(answerOf(q), q.id).toBe(sub === 'height' ? '对' : '不对')
          if (sub === 'jump') expect((p.t as number) / (p.n as number)).toBe(p.a)
          break
        case 'situp': {
          const data = texts(q)[0]!.p
          const a = (data.s as number) / 4
          const b = (data.t as number) / 5
          expect(Number.isInteger(a) && Number.isInteger(b)).toBe(true)
          // 总数少的那一组平均数反而高（比总数不公平）
          expect((data.s as number) < (data.t as number)).toBe(a > b)
          if (sub === 'avg') expect(num(q), q.id).toBe(k.endsWith('avg1') ? a : b)
          else expect(answerOf(q), q.id).toBe(a > b ? '第一小组' : '第二小组')
          break
        }
        case 'best':
          expect(answerOf(q)).toBe('171 厘米')
          break
        default:
          throw new Error(`没核对过的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到例 1（看图求平均、移多补少、先合再分、列式）、例 2（平均每人、哪队好、用什么比）、做一做，且课本的数都出现', () => {
    const seen = new Set<string>()
    each('m4s2-08-average', (q, d) => {
      if (d !== 1) return
      const id = q.id.split(':')[1]!
      seen.add(id.split('-').slice(0, 2).join('-'))
      if (id.includes(BOTTLES.join('.'))) seen.add('bottles')
      if (id.includes(`${KICK_BOYS.join('.')}-${KICK_GIRLS.join('.')}`)) seen.add('kick')
      if (id.includes(DONATE.join('.'))) seen.add('donate')
    })
    for (const k of ['bottle-avg', 'bottle-move', 'bottle-expr', 'bottle-way', 'kick-avg', 'kick-better', 'kick-why', 'donate-8', 'bottles', 'kick', 'donate'])
      expect([...seen].some((x) => x.startsWith(k)), k).toBe(true)
    // 去掉最高分最低分（选学）只在第 2 档
    each('m4s2-08-average', (q, d) => {
      if (kindOf(q) === 'drop') expect(d).toBe(2)
    })
    expect(SCORES).toHaveLength(7)
  })
})

const WHO = ['hong', 'lan', 'liang', 'ming']

describe('复式条形统计图（m4s2-08-double）', () => {
  const chartOf = (q: Question): Chart | undefined => part(q, 'bar-chart')
  /** 题目里说的类别（年份、项目、分段）在图上是第几个 */
  function catIndex(c: Chart, prm: Param | undefined): number {
    const name = zh(prm as LStr)
    const i = c.cats.findIndex((x) => {
      const cat = zh(x)
      return cat === name || `${cat} 年` === name || name.replace(/ /g, '').replace(/千克/g, '').replace(/到/, '~').replace('次', '') === cat
    })
    if (i >= 0) return i
    // 跳绳分段的说法：「100 次及以下」「101 到 120 次」「161 次及以上」
    const nums = name.match(/\d+/g)!.map(Number)
    return c.cats.findIndex((x) => (zh(x).match(/\d+/g) ?? []).map(Number).join() === nums.join())
  }
  const seriesIndex = (c: Chart, prm: Param | undefined): number => c.series.findIndex((s) => zh(s.name!) === zh(prm as LStr))
  const choiceIndex = (c: Chart, label: string): number => c.cats.findIndex((x) => zh(x) === label || `${zh(x)} 年` === label)

  it('图：复式（两组）、条顶写数、刻度够高；横向的类别从下往上排', () => {
    each('m4s2-08-double', (q) => {
      const c = chartOf(q)
      if (!c) return
      expect(c.numbers, q.id).toBe(true)
      for (const s of c.series) for (const v of s.values) expect(v as number, q.id).toBeLessThanOrEqual(c.cells * c.step)
      if (!q.id.includes('kind-s')) expect(c.series.length, q.id).toBe(2)
    })
  })

  it('从图上的数反推答案', () => {
    each('m4s2-08-double', (q) => {
      const kind = kindOf(q)
      const c = chartOf(q)
      const { k, p } = textOf(q)
      const vs = (j: number): number[] => c!.series[j]!.values as number[]
      switch (kind) {
        case 'ser': {
          const j = seriesIndex(c!, p.g)
          const most = q.id.includes('ser-most')
          const target = most ? Math.max(...vs(j)) : Math.min(...vs(j))
          expect(vs(j).filter((v) => v === target), `${q.id} 最多 / 最少不唯一`).toHaveLength(1)
          expect(vs(j)[choiceIndex(c!, answerOf(q) as string)], q.id).toBe(target)
          break
        }
        case 'all': {
          const all = vs(0).map((v, i) => v + vs(1)[i]!)
          const target = q.id.includes('all-most') ? Math.max(...all) : Math.min(...all)
          expect(all.filter((v) => v === target)).toHaveLength(1)
          expect(all[choiceIndex(c!, answerOf(q) as string)], q.id).toBe(target)
          break
        }
        case 'gap': {
          const gaps = vs(0).map((v, i) => Math.abs(v - vs(1)[i]!))
          const target = q.id.includes('gap-most') ? Math.max(...gaps) : Math.min(...gaps)
          expect(gaps.filter((v) => v === target)).toHaveLength(1)
          expect(gaps[choiceIndex(c!, answerOf(q) as string)], q.id).toBe(target)
          break
        }
        case 'pdiff': {
          const i = catIndex(c!, p.x)
          const a = seriesIndex(c!, p.a)
          const b = seriesIndex(c!, p.b)
          expect(num(q), q.id).toBe(vs(a)[i]! - vs(b)[i]!)
          expect(num(q)).toBeGreaterThan(0)
          break
        }
        case 'psum': {
          const i = catIndex(c!, p.x)
          expect(num(q), q.id).toBe(vs(0)[i]! + vs(1)[i]!)
          break
        }
        case 'cell': {
          const i = catIndex(c!, p.x)
          expect(i, `${q.id}：${zh(p.x as LStr)}`).toBeGreaterThanOrEqual(0)
          expect(num(q), q.id).toBe(vs(seriesIndex(c!, p.g))[i])
          break
        }
        case 'legend': {
          const color = zh(p.c as LStr)
          const s = c!.series.find((x) => zh({ k: `m4.avg.color.${x.tone}` }) === color)!
          expect(answerOf(q)).toBe(zh(s.name!))
          break
        }
        case 'step':
          expect(num(q), q.id).toBe(c!.step)
          break
        case 'kind': {
          const isDouble = c!.series.length > 1
          const askDouble = k.endsWith('isDouble')
          expect(answerOf(q), q.id).toBe(isDouble === askDouble ? '对' : '不对')
          break
        }
        case 'rope': {
          if (q.id.endsWith('good')) {
            // 女生 135 次及以上为优秀：135 到 140 次的 12 人 + 141~160 + 161 及以上
            expect(num(q)).toBe((p.k as number) + vs(1)[3]! + vs(1)[4]!)
            break
          }
          const j = seriesIndex(c!, p.g)
          expect(num(q), q.id).toBe(vs(j)[2]! + vs(j)[3]!)
          break
        }
        case 'house': {
          // 小数：28.2 − 24.96 = 3.24，32.6 − 27.64 = 4.96
          const j = seriesIndex(c!, p.g)
          const h = (v: number): number => Math.round(v * 100)
          expect(h(Number(answerOf(q))), q.id).toBe(h(vs(j)[2]!) - h(vs(j)[0]!))
          expect(q.input).toBe('choice')
          break
        }
        case 'life': {
          const i = [1990, 2000, 2010, 2020].indexOf(p.y as number)
          expect(num(q)).toBe(LIFE_WOMEN[i]! - LIFE_MEN[i]!)
          break
        }
        case 'mail':
          expect(answerOf(q)).toBe('普通邮件越来越少，电子邮件越来越多')
          break
        default:
          throw new Error(`没核对过的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到例 3（竖着画、横着画两种，最多 / 最少、相差最大 / 最小）和做一做（合起来最多 / 最少），课本的数出现', () => {
    const seen = new Set<string>()
    each('m4s2-08-double', (q, d) => {
      if (d !== 1) return
      const c = chartOf(q)!
      seen.add(kindOf(q))
      seen.add(`dir-${c.dir ?? 'v'}`)
      if (c.series.length === 2 && c.series[0]!.values.join() === POP_TOWN.join() && c.series[1]!.values.join() === POP_RURAL.join()) seen.add('pop-book')
    })
    for (const k of ['ser', 'gap', 'pdiff', 'psum', 'legend', 'all', 'dir-v', 'dir-h', 'pop-book']) expect(seen.has(k), k).toBe(true)
  })
})
