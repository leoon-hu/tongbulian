import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { ZH } from '../../lang/notify'

// 五下「☆ 怎样通知最快」：从题干的参数、通知图、表反推答案，150 种子 × 三档。
// 时间用模拟另算一遍（不用生成器里的公式）：分组——老师一分钟通知一人，先把各组第一个人都通知到，他们再同时通知本组其他人；
// 接力——每分钟每个已经知道的人（连老师）各通知一个新的人。外加：第 1 档出得到课本的每一问；朗读避坑（不出「长」「地」「应急」「队长」、阿拉伯数字的序数）。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Param = LStr | number

function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator('m5s2-08-notify')!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const lastText = (q: Question): { k: string; p: Record<string, Param> } => {
  const t = q.stem.filter((s): s is Extract<StemPart, { kind: 'text' }> => s.kind === 'text').pop()!
  return typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }
}
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))

/** 分组通知要几分钟：一分钟一分钟地模拟 */
function simulateGroups(k: number, s: number): number {
  let minute = 0
  // 老师一个一个通知各组的第一个人
  for (let g = 0; g < k; g++) minute++
  // 各组第一个人同时开始，各自通知本组其他 s − 1 人
  minute += s - 1
  return minute
}
/** 接力通知：t 分钟后知道的同学人数（老师不算） */
function simulateRelay(t: number): { total: number; fresh: number } {
  let know = 1
  let fresh = 0
  for (let m = 0; m < t; m++) {
    fresh = know
    know += fresh
  }
  return { total: know - 1, fresh }
}
const minutesFor = (n: number): number => {
  let t = 0
  while (simulateRelay(t).total < n) t++
  return t
}

describe('怎样通知最快（m5s2-08-notify）', () => {
  it('从参数、图和表反推答案', () => {
    const kinds = new Set<string>()
    each((q, d) => {
      if (d === 1) kinds.add(kindOf(q))
      const t = lastText(q)
      const v = (k: string): number => t.p[k] as number
      switch (t.k) {
        case 'm5.notify.one.q':
          expect(answer(q), q.id).toBe(String(v('n')))
          break
        case 'm5.notify.group.q': {
          const tree = q.stem.find((s): s is Extract<StemPart, { kind: 'notify-tree' }> => s.kind === 'notify-tree')!
          expect(tree.mode).toBe('group')
          expect(tree.groups, q.id).toBe(v('k'))
          expect(tree.per, q.id).toBe(v('s') - 1)
          expect(v('n'), q.id).toBe(v('k') * v('s'))
          expect(answer(q), q.id).toBe(String(simulateGroups(v('k'), v('s'))))
          break
        }
        case 'm5.notify.more.j': {
          const [n, a, b, x, y] = ['n', 'a', 'b', 'x', 'y'].map(v)
          expect(x, q.id).toBe(simulateGroups(a!, n! / a!))
          expect(y, q.id).toBe(simulateGroups(b!, n! / b!))
          // 组多的那种不比组少的快：「分的组越多，用的时间就越少」不对
          expect(a! < b! && x! <= y!, q.id).toBe(true)
          expect(answer(q)).toBe('不对')
          break
        }
        case 'm5.notify.fast.q':
          expect(answer(q)).toBe('接到通知的同学都去通知别人')
          break
        case 'm5.notify.table.q': {
          const table = q.stem.find((s): s is Extract<StemPart, { kind: 'stat-table' }> => s.kind === 'stat-table')!
          const [minutes, fresh, total] = table.rows.map((r) => r.slice(1))
          let blank = 0
          minutes!.forEach((m, i) => {
            const r = simulateRelay(m as number)
            for (const [row, want] of [
              [fresh!, r.fresh],
              [total!, r.total],
            ] as const) {
              const cell = row[i]
              if (cell === null) {
                blank++
                expect(answer(q), q.id).toBe(String(want))
              } else if (typeof cell === 'number') expect(cell, q.id).toBe(want)
            }
          })
          expect(blank, q.id).toBe(1)
          break
        }
        case 'm5.notify.tree.total':
        case 'm5.notify.tree.new': {
          const tree = q.stem.find((s): s is Extract<StemPart, { kind: 'notify-tree' }> => s.kind === 'notify-tree')!
          expect(tree.mode).toBe('double')
          const r = simulateRelay(tree.minutes!)
          if (t.k === 'm5.notify.tree.total') expect(v('t')).toBe(tree.minutes)
          expect(answer(q), q.id).toBe(String(t.k === 'm5.notify.tree.total' ? r.total : r.fresh))
          break
        }
        case 'm5.notify.full.q':
          expect(answer(q), q.id).toBe(String(minutesFor(v('n'))))
          break
        case 'm5.notify.most.q':
          expect(answer(q), q.id).toBe(String(simulateRelay(v('t')).total))
          break
        default:
          throw new Error(`没核对过的题：${q.id}（${t.k}）`)
      }
    })
    // 课本：一个一个通知、分 3 组 / 5 组、想一想、接力通知的图和表、(1)(2) 都在第 1 档
    for (const k of ['one', 'group', 'moreGroups', 'fastest', 'table', 'tree', 'full', 'most']) expect(kinds, k).toContain(k)
  })

  it('课本的数：15 人分 3 组、分 5 组都是 7 分钟；接力 4 分钟通知完 15 人，5 分钟最多 31 人，50 人要 6 分钟', () => {
    expect(simulateGroups(3, 5)).toBe(7)
    expect(simulateGroups(5, 3)).toBe(7)
    expect(minutesFor(15)).toBe(4)
    expect(simulateRelay(5).total).toBe(31)
    expect(minutesFor(50)).toBe(6)
  })

  it('朗读避坑：不出「长」「地」「应急」「队长」「组长」，没有阿拉伯数字的序数', () => {
    for (const [k, v] of Object.entries(ZH)) expect(String(v), k).not.toMatch(/长|地|应急|[（）()]/)
    each((q) => {
      for (const s of q.stem) if (s.kind === 'text') expect(zh(s.text), q.id).not.toMatch(/第\s*\d/)
    })
  })
})
