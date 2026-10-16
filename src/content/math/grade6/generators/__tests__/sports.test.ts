import { describe, expect, it } from 'vitest'
import type { GeoItem, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'

// ☆ 体育中的数学（六上）的专项检查：答案照课本的数据另算一遍（直道 85.96 米、第一道直径 72.6 米、道宽 1.22 米、π 取 3.14159；
// 简单数据 π 取 3.14），课本的每一步（分析问题、收集信息、解决问题、回顾反思）在第 1 档出得到，题干避开读不准的字。

const KP = 'm6s1-06-sports'
const SEEDS = 150
const PI5 = 3.14159
const STRAIGHT = 85.96
const D1 = 72.6
const LANE = 1.22
function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(KP)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const zh = (l: LStr): string => translate(l, 'zh')
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
const kind = (q: Question): string => sigOf(q).split('-')[0]!
const sigParts = (q: Question): string[] => sigOf(q).split('-').slice(1)
const texts = (q: Question): { k: string; p: Record<string, unknown> }[] =>
  q.stem.flatMap((p) => (p.kind === 'text' ? [typeof p.text === 'string' ? { k: p.text, p: {} } : { k: p.text.k, p: (p.text.p ?? {}) as Record<string, unknown> }] : []))
const param = (q: Question, name: string): number => {
  for (const t of texts(q)) if (name in t.p) return Number(t.p[name])
  throw new Error(`${q.id} 题干里没有参数 ${name}`)
}
/** 题干里代进去的第几道（lane2 → 2） */
const laneOf = (q: Question): number => {
  for (const t of texts(q)) if (t.p.lane) return Number(String((t.p.lane as { k: string }).k).replace('m6.sport.lane', ''))
  throw new Error(`${q.id} 没有 lane`)
}
const answerLabel = (q: Question): LStr => q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : labelKey(answerLabel(q)))
const numAnswer = (q: Question): number => Number(q.answer.kind === 'number' ? q.answer.value : zh(answerLabel(q)))
const key = (k: string): string => labelKey({ k })
const r2 = (x: number): number => Math.round(x * 100) / 100

describe('体育中的数学（m6s1-06-sports）', () => {
  it('第 1 档出得到分析问题、收集信息、解决问题（表、不用算出每条跑道）、确定起跑线、回顾反思、为什么 100 米不错开', () => {
    const gen = getGenerator(KP)!
    const k = new Set<string>()
    for (let seed = 1; seed <= 400; seed++) k.add(kind(gen(1, createRng(seed))))
    for (const x of ['shape', 'whole', 'far', 'forward', 'straight', 'bendj', 'lap1', 'bends1', 'step', 'laned', 'diff', 'how', 'start', 'start1', 'lap2', 'rule', 'same', 'hundred']) expect(k, x).toContain(x)
  })

  it('答案从课本的数据另算一遍', () => {
    each((q) => {
      const k = kind(q)
      const s = sigParts(q)
      const v = numAnswer(q)
      const ok = (x: number): void => expect(Math.abs(v - x) < 1e-6, `${q.id}：${v} ≠ ${x}`).toBe(true)
      if (k === 'shape') expect(answer(q), q.id).toBe(key('m6.sport.w.semi'))
      if (k === 'whole') expect(answer(q), q.id).toBe(key('m6.sport.w.circle'))
      if (k === 'far') expect(answer(q), q.id).toBe(key('m6.sport.w.outer'))
      if (k === 'forward' || k === 'straight' || k === 'bendj' || k === 'rule' || k === 'wider') expect(answer(q), q.id).toBe(key('m6.circ.yes'))
      if (k === 'same') expect(answer(q), q.id).toBe(key('m6.circ.no'))
      if (k === 'lap1') ok(2 * STRAIGHT + 228.08)
      if (k === 'bends1') ok(r2(400 - 2 * STRAIGHT))
      if (k === 'step') ok(2 * param(q, 'w'))
      if (k === 'laned') ok(r2(D1 + 2 * LANE * (laneOf(q) - 1)))
      if (k === 'bend') {
        const d = param(q, 'd')
        expect(Math.abs(d - (D1 + 2 * LANE * (laneOf(q) - 1))) < 1e-6, q.id).toBe(true)
        ok(r2(PI5 * d))
      }
      // 课本数据「结果保留两位小数」；π 取 3.14 的简单数据不取近似
      if (k === 'diff') ok(s[0] === 'book' ? r2(PI5 * 2 * param(q, 'w')) : 3.14 * 2 * param(q, 'w'))
      if (k === 'how') expect(answer(q), q.id).toBe('3.14159 × 1.22 × 2')
      if (k === 'start') ok(r2(PI5 * 2 * LANE * (laneOf(q) - 1)))
      if (k === 'start1') ok(3.14 * 2 * 1 * (laneOf(q) - 1))
      if (k === 'lap2') ok(r2(400 + param(q, 'g') * (laneOf(q) - 1)))
      if (k === 'hundred') expect(answer(q), q.id).toBe(key('m6.sport.w.allStraight'))
      if (k === '200') ok(s[0] === 'book' ? r2(PI5 * param(q, 'w')) : 3.14 * param(q, 'w'))
      if (k === 'robin') ok((param(q, 'n') * (param(q, 'n') - 1)) / 2)
      if (k === 'knock') ok(param(q, 'n') - 1)
      if (k === 'shot') expect(answer(q), q.id).toBe(key('m6.sport.w.sector'))
      if (k === 'full') {
        const d = param(q, 'd')
        expect(Math.abs(d - (D1 + 2 * LANE * (laneOf(q) - 1))) < 1e-6, q.id).toBe(true)
        ok(r2(PI5 * d + 2 * STRAIGHT))
      }
    })
  })

  it('课本的表：第一道 72.6、228.08、400，往外每道一圈约多 7.67 米', () => {
    expect(r2(PI5 * D1)).toBe(228.08)
    expect(r2(2 * STRAIGHT + PI5 * D1)).toBe(400)
    expect(r2(PI5 * 2 * LANE)).toBe(7.67)
  })

  it('跑道图画得出来、题干读得准、数的选项只有一个对的', () => {
    each((q) => {
      for (const part of q.stem) {
        if (part.kind !== 'geo') continue
        expect(part.alt.length, q.id).toBeGreaterThan(2)
        for (const fig of part.figs)
          for (const it of fig.items as GeoItem[]) {
            const json = JSON.stringify(it)
            expect(json, q.id).not.toMatch(/NaN|Infinity|null/)
            expect(json, q.id).not.toMatch(/\p{Script=Han}/u)
          }
      }
      const stem = texts(q)
        .map((t) => zh({ k: t.k, p: t.p as Record<string, string> }))
        .join('｜')
      const all = [stem, ...(q.choices ?? []).map((c) => zh(c.label))].join('｜')
      expect(all.replace(/长度|长方形|周长|边长/g, ''), q.id).not.toMatch(/长/)
      expect(all.replace(/为什么|因为/g, ''), q.id).not.toMatch(/为/)
      expect(all, q.id).not.toMatch(/着|还|只|得|转|量/)
      // 序数写汉字：「第 3 道」读不好
      expect(stem, q.id).not.toMatch(/第\s*\d/)
      for (const t of texts(q)) expect(zh({ k: t.k }), q.id).not.toMatch(/[?(（]/)
      if (q.input === 'choice') {
        const right = answerLabel(q)
        const rv = Number(zh(right))
        if (Number.isFinite(rv)) for (const c of q.choices!) if (c.label !== right) expect(Number(zh(c.label)) === rv, q.id).toBe(false)
      }
    })
  })

  it('跑道图：中间草坪两头是半圆、4 条跑道', () => {
    each((q) => {
      const g = q.stem.find((p): p is Extract<StemPart, { kind: 'geo' }> => p.kind === 'geo')
      if (!g) return
      const outlines = g.figs[0]!.items.filter((it) => it.t === 'poly')
      expect(outlines.length, q.id).toBe(5)
    })
  })
})
