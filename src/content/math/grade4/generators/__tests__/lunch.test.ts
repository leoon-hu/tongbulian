import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { COMBOS, DISHES, MAX_FAT, MIN_KJ, total, verdict } from '../lunch'

// 四下「☆ 营养午餐」：从题目里的营养表（编号、菜名、热量、脂肪、蛋白质）反推答案，150 种子 × 三档；
// 外加课本的表与规则：9 种菜选 3 种的 84 种搭配里 24 种合格，「不超过 50 克」含 50 克。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Table = Extract<StemPart, { kind: 'stat-table' }>

function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator('m4s2-09-lunch')!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const answerOf = (q: Question): number | string => {
  if (q.answer.kind === 'number') return q.answer.value
  const id = q.answer.choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}
const name = (i: number): string => zh({ k: `m4.lun.dish.${DISHES[i]!.id}` })
const byName = (s: string): number => DISHES.findIndex((_, i) => name(i) === s)
/** 表头：每一栏是什么（no 编号、name 菜名、kj、fat、pro） */
function columns(t: Table): string[] {
  return t.rows[0]!.map((c) => (c as { k: string }).k.split('.').pop()!)
}
/** 表里的菜：下标（按菜名找） */
function rowsOf(q: Question): number[] {
  const t = q.stem.find((p): p is Table => p.kind === 'stat-table')!
  const at = columns(t).indexOf('name')
  return t.rows.slice(1).map((r) => byName(zh(r[at] as LStr)))
}

describe('营养午餐（m4s2-09-lunch）', () => {
  it('课本的表与规则：84 种搭配里 24 种合格；1、2、5 号和 3、5、8 号的脂肪正好 50 克，也合格', () => {
    expect(COMBOS).toHaveLength(84)
    expect(COMBOS.filter((c) => verdict(c) === 'ok')).toHaveLength(24)
    expect(total([0, 1, 4], 'fat')).toBe(MAX_FAT)
    expect(verdict([0, 1, 4])).toBe('ok')
    expect(verdict([2, 4, 7])).toBe('ok')
    expect(MIN_KJ).toBe(2926)
  })

  it('表里的数照课本：编号、热量、脂肪、蛋白质（表里只放用得着的几栏）', () => {
    each((q) => {
      const t = q.stem.find((p): p is Table => p.kind === 'stat-table')!
      const cols = columns(t)
      expect(cols, q.id).toContain('name')
      const rows = rowsOf(q)
      t.rows.slice(1).forEach((r, k) => {
        const i = rows[k]!
        expect(i, q.id).toBeGreaterThanOrEqual(0)
        cols.forEach((c, j) => {
          if (c === 'name') return
          const d = DISHES[i]!
          expect(r[j], `${q.id} ${c}`).toBe(c === 'no' ? i + 1 : d[c as 'kj' | 'fat' | 'pro'])
        })
      })
      // 判断合不合格、选第三种菜要看热量和脂肪；比蛋白质的方案用编号写，表里要有编号
      if (['verdict', 'third'].includes(kindOf(q))) expect(cols).toEqual(['name', 'kj', 'fat'])
      if (kindOf(q) === 'protein') expect(cols).toEqual(['no', 'name', 'pro'])
    })
  })

  it('从表里的数反推答案', () => {
    each((q) => {
      const rows = rowsOf(q)
      switch (kindOf(q)) {
        case 'total': {
          const n = q.id.split(':')[1]!.split('-')[1] as 'kj' | 'fat' | 'pro'
          expect(rows).toHaveLength(3)
          expect(Number(answerOf(q)), q.id).toBe(total(rows, n))
          break
        }
        case 'ext': {
          const [, n, mm] = q.id.split(':')[1]!.split('-') as [string, 'kj' | 'fat' | 'pro', string]
          const vals = rows.map((i) => DISHES[i]![n])
          const target = mm === 'max' ? Math.max(...vals) : Math.min(...vals)
          expect(vals.filter((v) => v === target), `${q.id} 最高 / 最低不唯一`).toHaveLength(1)
          expect(DISHES[byName(answerOf(q) as string)]![n], q.id).toBe(target)
          break
        }
        case 'verdict': {
          expect(rows).toHaveLength(3)
          const v = verdict(rows)
          expect(v).not.toBe('both')
          expect(answerOf(q), q.id).toBe(zh({ k: `m4.lun.v.${v}` }))
          break
        }
        case 'third': {
          const chosen = q.id.split(':')[1]!.split('-')[1]!.split('.').map(Number) as [number, number]
          expect(verdict([...chosen, byName(answerOf(q) as string)]), q.id).toBe('ok')
          for (const c of q.choices!) if (zh(c.label) !== answerOf(q)) expect(verdict([...chosen, byName(zh(c.label))])).not.toBe('ok')
          // 选项里的菜和已经选的两种都在表里
          for (const i of [...chosen, ...q.choices!.map((c) => byName(zh(c.label)))]) expect(rows).toContain(i)
          break
        }
        case 'protein': {
          const combos = q.choices!.map((c) => zh(c.label).match(/\d+/g)!.map((x) => Number(x) - 1))
          for (const c of combos) {
            expect(verdict(c), q.id).toBe('ok')
            for (const i of c) expect(rows).toContain(i)
          }
          const best = combos.reduce((a, b) => (total(b, 'pro') > total(a, 'pro') ? b : a))
          expect((answerOf(q) as string).match(/\d+/g)!.map((x) => Number(x) - 1), q.id).toEqual(best)
          expect(new Set(combos.map((c) => total(c, 'pro'))).size).toBe(3)
          break
        }
        default:
          throw new Error(`没核对过的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到算一份午餐的热量 / 脂肪 / 蛋白质、找最高最低的菜、判断合不合格；三种判断结果都出现', () => {
    const seen = new Set<string>()
    each((q, d) => {
      if (d === 1) seen.add(kindOf(q) === 'total' ? `total-${q.id.split(':')[1]!.split('-')[1]}` : kindOf(q))
      if (kindOf(q) === 'verdict') seen.add(`v-${answerOf(q)}`)
    })
    for (const k of ['total-kj', 'total-fat', 'total-pro', 'ext', 'verdict', 'v-合格', 'v-热量不够', 'v-脂肪超标']) expect(seen.has(k), k).toBe(true)
  })
})
