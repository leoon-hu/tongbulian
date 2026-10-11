import { describe, expect, it } from 'vitest'
import type { LParam, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { KP_EXPLORE, painted } from '../explore'

// 五下「☆ 探索图形」：涂色的小正方体。先用「一块一块数」核对规律（课本表里填好的几格），
// 再从题目（图上的大正方体、题目文字里每条棱几个、问的是哪一类）反推答案，150 种子 × 三档。

const zh = (l: LStr): string => translate(l, 'zh')

/** 一块一块数：每条棱 n 个，坐标 0…n−1，露在外面的面数 = 在边界上的坐标个数 */
function brute(n: number): Record<0 | 1 | 2 | 3, number> {
  const out = { 0: 0, 1: 0, 2: 0, 3: 0 }
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++)
      for (let z = 0; z < n; z++) {
        const k = [x, y, z].filter((v) => v === 0 || v === n - 1).length as 0 | 1 | 2 | 3
        out[k] += 1
      }
  return out
}

describe('探索图形：规律和一块一块数的一样', () => {
  it('课本表里填好的：① 8 0 0 0、② 8 12 6 1、③ 8 24', () => {
    expect([3, 2, 1, 0].map((k) => painted(2, k as 0 | 1 | 2 | 3))).toEqual([8, 0, 0, 0])
    expect([3, 2, 1, 0].map((k) => painted(3, k as 0 | 1 | 2 | 3))).toEqual([8, 12, 6, 1])
    expect(painted(4, 2)).toBe(24)
  })
  it('每条棱 2–9 个：四类各几个和硬数的一样，加起来是 n³', () => {
    for (let n = 2; n <= 9; n++) {
      const b = brute(n)
      for (const k of [3, 2, 1, 0] as const) expect(painted(n, k), `n=${n} k=${k}`).toBe(b[k])
      expect([3, 2, 1, 0].reduce((s, k) => s + painted(n, k as 0 | 1 | 2 | 3), 0)).toBe(n ** 3)
    }
  })
})

describe('探索图形：从题目反推答案（150 种子 × 三档）', () => {
  it('答案', () => {
    const gen = getGenerator(KP_EXPLORE)!
    for (let seed = 1; seed <= 150; seed++)
      for (const d of [1, 2, 3] as const) {
        const q: Question = gen(d, createRng(seed))
        const t = q.stem.find((p) => p.kind === 'text') as Extract<StemPart, { kind: 'text' }>
        const p = (t.text as { p?: Record<string, LParam> }).p ?? {}
        const fig = q.stem.find((x) => x.kind === 'cube-solids') as Extract<StemPart, { kind: 'cube-solids' }> | undefined
        const rows = fig ? (fig.items[0] as { rows: number[][] }).rows : null
        // 图上的大正方体：n 行、每行 n 摞、每摞 n 个
        if (rows) {
          expect(rows.every((r) => r.length === rows.length && r.every((h) => h === rows.length)), q.id).toBe(true)
          expect(rows.length).toBeLessThanOrEqual(6)
        }
        const n = rows ? rows.length : Number(p.n)
        const fam = q.id.split(':')[1]!.split('-')[0]!
        const answer = q.answer.kind === 'number' ? q.answer.value : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
        const kind = p.kind ? Number((p.kind as { k: string }).k.slice(-1)) : -1
        if (fam === 'total') expect(Number(answer), q.id).toBe(n ** 3)
        else if (fam === 'where') {
          const WHERE = ['大正方体的里面', '每个面的中间', '棱上，顶点除外', '顶点上']
          expect(answer, q.id).toBe(WHERE[kind])
        } else {
          expect(Number(answer), q.id).toBe(brute(n)[kind as 0 | 1 | 2 | 3])
          // 第 1 档每条棱 2–5 个，第 3 档 7–9 个只用文字
          if (d === 1) expect(n >= 2 && n <= 5 && rows !== null, q.id).toBe(true)
          if (d === 3) expect(n >= 7 && rows === null, q.id).toBe(true)
        }
      }
  })
})
