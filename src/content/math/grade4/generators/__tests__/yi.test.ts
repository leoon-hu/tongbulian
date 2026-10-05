import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'

// 四上「☆ 1亿有多大」的专项检查：100 张纸厚 1 厘米，从题目里的张数 / 高度反推答案（1 米 = 100 厘米，1 千米 = 1000 米）；
// 几个一百是一万、几个一万是一亿；「算一算」的表；第 1 档出得到课本「算一算」的每一步。
const KP = 'm4s1-02-yi'
const SEEDS = 150
const zh = (l: LStr): string => translate(l, 'zh')

function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(KP)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const text = (q: Question): { k: string; p?: Record<string, number> } => (q.stem.find((p) => p.kind === 'text') as { text: { k: string; p?: Record<string, number> } }).text
const correct = (q: Question): string =>
  q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
const num = (q: Question): number => Number(correct(q))
/** 张数 → 高度（厘米）：100 张 1 厘米 */
const cmOf = (sheets: number): number => sheets / 100

describe('1亿有多大（m4s1-02-yi）', () => {
  it('从题目反推答案', () => {
    each((q) => {
      const t = text(q)
      switch (t.k) {
        case 'm4.yi.cm':
          expect(num(q), q.id).toBe(cmOf(t.p!.n!))
          break
        case 'm4.yi.m':
          expect(num(q), q.id).toBe(cmOf(t.p!.n!) / 100)
          break
        case 'm4.yi.yiM':
          expect(num(q), q.id).toBe(cmOf(1e8) / 100)
          break
        case 'm4.yi.yiKm':
          expect(num(q), q.id).toBe(cmOf(1e8) / 100 / 1000)
          break
        case 'm4.yi.sheetsCm':
          expect(cmOf(num(q)), q.id).toBe(t.p!.h)
          break
        case 'm4.yi.sheetsM':
          expect(cmOf(num(q)) / 100, q.id).toBe(t.p!.h)
          break
        case 'm4.yi.sheetsKm':
          expect(cmOf(num(q)) / 100 / 1000, q.id).toBe(t.p!.h)
          break
        case 'm4.yi.cmToM':
          expect(num(q), q.id).toBe(1)
          break
        case 'm4.yi.hundreds':
          expect(num(q) * 100, q.id).toBe(10000)
          break
        case 'm4.yi.wans':
          expect(num(q) * 10000, q.id).toBe(1e8)
          break
        case 'm4.yi.qianwans':
          expect(num(q) * 1e7, q.id).toBe(1e8)
          break
        case 'm4.yi.hundredHundreds':
          expect(correct(q), q.id).toBe('一万')
          expect(q.choices!.find((c) => zh(c.label) === '一万')!.say).toBe('10000')
          break
        case 'm4.yi.wanWans':
          expect(correct(q), q.id).toBe('一亿')
          expect(q.choices!.find((c) => zh(c.label) === '一亿')!.say).toBe('100000000')
          break
        case 'm4.yi.tableCm':
        case 'm4.yi.tableM': {
          const table = q.stem.find((p): p is Extract<StemPart, { kind: 'stat-table' }> => p.kind === 'stat-table')!
          expect(table.rows[0]!.slice(1), q.id).toEqual([100, 10000, 100000000])
          const col = table.rows[1]!.indexOf(null)
          const sheets = table.rows[0]![col] as number
          expect(num(q), q.id).toBe(t.k === 'm4.yi.tableCm' ? cmOf(sheets) : cmOf(sheets) / 100)
          break
        }
        case 'm4.yi.everestHigh':
          expect(correct(q), q.id).toBe('对')
          break
        case 'm4.yi.everestLow':
          expect(correct(q), q.id).toBe('不对')
          break
        default:
          throw new Error(`没核对过的题：${q.id}`)
      }
      // 不用多位数乘法：答案都是 10 的几次方乘一个一位数（几百、几千、几万……）
      if (q.answer.kind === 'number') expect(String(q.answer.value), q.id).toMatch(/^[1-9]0*$|^[1-9][05]0*$/)
    })
  })

  it('第 1 档出得到课本「算一算」的每一步：几张纸高几厘米、几米，1 亿张有多高，多少张纸高几米，表，几个一百 / 一万，比珠穆朗玛峰高', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 300; seed++) seen.add(text(getGenerator(KP)!(1, createRng(seed))).k)
    for (const k of ['cm', 'm', 'yiM', 'sheetsCm', 'sheetsM', 'cmToM', 'hundreds', 'wans', 'wanWans', 'hundredHundreds', 'tableCm', 'tableM', 'everestHigh'].map((x) => `m4.yi.${x}`)) expect(seen, k).toContain(k)
  })

  it('千米只在第 2、3 档（三年级学过千米，但课本这一页只说到 10000 米）', () => {
    for (let seed = 1; seed <= 300; seed++) expect(text(getGenerator(KP)!(1, createRng(seed))).k, String(seed)).not.toMatch(/Km$/)
  })
})
