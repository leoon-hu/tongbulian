import { describe, expect, it } from 'vitest'
import type { CubeSolid, LParam, LStr, Question, StemPart, TopCell, ViewBlock } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { type Rows, type Side, arrangements, cubeCount, flipRows, leftKeysFrom, okShape, rowsId, viewKey, viewOf } from '../combine'
import { OLD_E1, OLD_E2, OLD_P4, OLD_P7, addOne } from '../views'

// 五下「观察物体（三）」（旧版）：出题办法同五上，这里查旧书的数（例 1 用 4 个摆三格一排、例 2 三个、练习一 4 的三个几何体）
// 和从题目反推的答案；措辞是「几何体」。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const ARR = 'm5s2-01-arrange'
const RES = 'm5s2-01-restore'
type Solids = Extract<StemPart, { kind: 'cube-solids' }>
type Views = Extract<StemPart, { kind: 'cube-views' }>
type Top = Extract<StemPart, { kind: 'cube-top' }>

function each(kp: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kp)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const famOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const textOf = (q: Question): { k: string; p: Record<string, LParam> } => {
  const t = q.stem.find((p) => p.kind === 'text')
  if (!t || t.kind !== 'text' || typeof t.text === 'string') throw new Error(`${q.id} 没有题目文字`)
  return { k: t.text.k, p: (t.text.p ?? {}) as Record<string, LParam> }
}
const sideOf = (p: LParam | undefined): Side => (p as { k: string }).k.split('.').pop() as Side
const solidsOf = (q: Question): Solids | undefined => q.stem.find((p): p is Solids => p.kind === 'cube-solids')
const viewsAll = (q: Question): Views[] => q.stem.filter((p): p is Views => p.kind === 'cube-views')
const topOf = (q: Question): Top | undefined => q.stem.find((p): p is Top => p.kind === 'cube-top')
const choiceAnswer = (q: Question): string => zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
const numAnswer = (q: Question): number => (q.answer.kind === 'number' ? q.answer.value : Number(choiceAnswer(q)))
const rowsOf = (s: CubeSolid): Rows => (s as { rows: Rows }).rows
const heights = (bs: ViewBlock[]): number[] => {
  const w = Math.max(...bs.map((b) => b.x)) + 1
  return Array.from({ length: w }, (_, x) => bs.filter((b) => b.x === x).length)
}
function rowsFromTop(cells: TopCell[]): Rows {
  const R = Math.max(...cells.map((c) => c.y)) + 1
  const C = Math.max(...cells.map((c) => c.x)) + 1
  return Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, x) => cells.find((c) => c.x === x && c.y === R - 1 - r)?.n ?? 0))
}
function footOf(top: ViewBlock[], C: number): boolean[][] {
  const R = Math.max(...top.map((b) => b.y)) + 1
  return Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => top.some((b) => b.x === c && b.y === R - 1 - r)))
}

describe('观察物体（三）（旧版）：课本的几何体', () => {
  it('例 1（1）：四种摆法用 4 个、从前面看都是三格一排；（2）再加一个从前面看不变的摆法有好几种', () => {
    for (const rows of OLD_E1) {
      expect(cubeCount(rows)).toBe(4)
      expect(heights(viewOf(rows, 'front'))).toEqual([1, 1, 1])
      expect(okShape(rows), rowsId(rows)).toBe(true)
      const more = addOne(rows)
      expect(more.every((r) => cubeCount(r) === 5 && okShape(r))).toBe(true)
      expect(more.filter((r) => viewKey(viewOf(r, 'front')) === viewKey(viewOf(rows, 'front'))).length).toBeGreaterThan(0)
      expect(more.filter((r) => viewKey(viewOf(r, 'front')) !== viewKey(viewOf(rows, 'front'))).length).toBeGreaterThan(1)
    }
  })

  it('例 2：从前面、左面看都是两格一排——只看这两面可以后排左边或右边，加上从上面看（L）就只有一种，3 个', () => {
    const fl = (r: Rows): string => `${viewKey(viewOf(r, 'front'))}|${viewKey(viewOf(r, 'left'))}`
    expect(fl(OLD_E2)).toBe(fl([[0, 1], [1, 1]]))
    expect(viewKey(viewOf(OLD_E2, 'top'))).not.toBe(viewKey(viewOf([[0, 1], [1, 1]], 'top')))
    expect(arrangements([1, 1], [1, 1], OLD_E2.map((r) => r.map((h) => h > 0)), 3)).toEqual([OLD_E2])
    expect(cubeCount(OLD_E2)).toBe(3)
  })

  it('练习一 4：对的那个从前面看「下 4 + 第二格上 1」、从上面看「下排左 1 + 上排右 3」；前后弄反的从上面看颠倒了', () => {
    expect(heights(viewOf(OLD_P4, 'front'))).toEqual([1, 2, 1, 1])
    expect(viewKey(viewOf(OLD_P4, 'top'))).toBe(viewKey([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }]))
    const flip = flipRows(OLD_P4)
    expect(viewKey(viewOf(flip, 'front'))).toBe(viewKey(viewOf(OLD_P4, 'front')))
    expect(viewKey(viewOf(flip, 'top'))).not.toBe(viewKey(viewOf(OLD_P4, 'top')))
  })

  it('练习一 3：旧版 ① 是一个小正方体，从前面看是一格的是 ①③', () => {
    expect(OLD_P7[0]).toEqual([[1]])
    const one = viewKey([{ x: 0, y: 0 }])
    expect(OLD_P7.map((r, i) => (viewKey(viewOf(r, 'front')) === one ? i + 1 : 0)).filter(Boolean)).toEqual([1, 3])
  })
})

describe('按要求摆几何体（m5s2-01-arrange）与根据看到的图形摆几何体（m5s2-01-restore）', () => {
  it('从题目反推答案', () => {
    for (const kp of [ARR, RES]) {
      each(kp, (q) => {
        const fam = famOf(q)
        const { k, p } = textOf(q)
        expect(k.startsWith('m5.view.'), q.id).toBe(true)
        const views = viewsAll(q)
        const objs = (solidsOf(q)?.items ?? []).map(rowsOf)
        // 练习一 4 的两个是课本照样画的：对的那个前面一块和后排只挨着一条棱（旧书没有「至少一个面重合」的要求），
        // 前后弄反的那个后面一块被挡住一点
        const book = [rowsId(OLD_P4), rowsId(flipRows(OLD_P4))]
        for (const o of objs) if (!book.includes(rowsId(o))) expect(okShape(o), q.id).toBe(true)
        if (fam === 'fit') {
          const side = sideOf(p.side)
          const want = viewKey(views[0]!.items[0]!.blocks)
          const hits = objs.map((o, i) => (viewKey(viewOf(o, side)) === want ? i + 1 : 0)).filter(Boolean)
          expect(hits, q.id).toEqual([numAnswer(q)])
          for (const o of objs) expect(cubeCount(o), q.id).toBe(p.n)
        } else if (fam === 'count' || fam === 'build') {
          const figs = views[0]!.items
          const front = heights(figs[0]!.blocks)
          const all = arrangements(front, heights(figs[2]!.blocks), footOf(figs[1]!.blocks, front.length), 3)
          expect(all, q.id).toHaveLength(1)
          if (fam === 'count') expect(numAnswer(q), q.id).toBe(cubeCount(all[0]!))
          else {
            const sig = (r: Rows): string => (['front', 'top', 'left'] as const).map((s) => viewKey(viewOf(r, s))).join('|')
            expect(objs.map((o, i) => (sig(o) === sig(all[0]!) ? i + 1 : 0)).filter(Boolean), q.id).toEqual([numAnswer(q)])
          }
        } else if (fam === 'two') {
          // 符合从前面看、从上面看的要求的只有一个
          const figs = views[0]!.items
          const want = `${viewKey(figs[0]!.blocks)}|${viewKey(figs[1]!.blocks)}`
          const hits = objs.map((o, i) => (`${viewKey(viewOf(o, 'front'))}|${viewKey(viewOf(o, 'top'))}` === want ? i + 1 : 0)).filter(Boolean)
          expect(hits, q.id).toEqual([numAnswer(q)])
        } else if (fam === 'least') {
          expect(numAnswer(q), q.id).toBe(views[0]!.items[0]!.blocks.length)
        } else if (fam === 'leftfrom') {
          const figs = views[0]!.items
          const front = heights(figs[0]!.blocks)
          const keys = [...leftKeysFrom(front, footOf(figs[1]!.blocks, front.length), Number(p.n))]
          expect(keys, q.id).toHaveLength(1)
          expect(views[1]!.items.map((f, i) => (viewKey(f.blocks) === keys[0] ? i + 1 : 0)).filter(Boolean), q.id).toEqual([numAnswer(q)])
        } else if (fam === 'who') {
          const side = sideOf(p.side)
          const fig = viewKey(views[0]!.items[0]!.blocks)
          expect(objs.map((o, i) => (viewKey(viewOf(o, side)) === fig ? i + 1 : 0)).filter(Boolean), q.id).toEqual([numAnswer(q)])
        } else if (fam === 'many') {
          const side = sideOf(p.side)
          const fig = viewKey(views[0]!.items[0]!.blocks)
          expect(objs.filter((o) => viewKey(viewOf(o, side)) === fig).length, q.id).toBe(numAnswer(q))
        } else if (fam === 'toppick') {
          const rows = rowsFromTop(topOf(q)!.cells)
          const want = viewKey(viewOf(rows, sideOf(p.side)))
          expect(views[0]!.items.map((f, i) => (viewKey(f.blocks) === want ? i + 1 : 0)).filter(Boolean), q.id).toEqual([numAnswer(q)])
        } else if (fam === 'topcount') {
          expect(numAnswer(q), q.id).toBe(cubeCount(rowsFromTop(topOf(q)!.cells)))
        } else {
          throw new Error(`没见过的题：${q.id}`)
        }
      })
    }
  })

  it('第 1 档出得到例 1（1）（2）、例 2、练习一 2、4；第 2 档有练习一 1、3、5、6', () => {
    const seen = new Set<string>()
    for (const kp of [ARR, RES]) {
      each(kp, (q, d) => {
        const sig = q.id.split(':')[1]!
        seen.add(`${kp === ARR ? 'a' : 'r'}${d}-${sig.split('-')[0]}`)
        if (sig.startsWith('fit-e1-') || sig.startsWith('fit-add')) seen.add(`${d}-${sig.split('-')[1]!.slice(0, 3)}`)
        if (sig.startsWith('two-') && objsHave(q, OLD_P4)) seen.add(`${d}-p4`)
        if (sig === 'count-10.11') seen.add(`${d}-e2`)
      })
    }
    for (const f of ['1-e1', '1-add', '1-e2', '1-p4', 'a1-fit', 'r1-count', 'r1-build', 'r1-two', 'a2-leftfrom', 'a2-least', 'r2-toppick', 'r3-topcount']) expect(seen.has(f), f).toBe(true)
    expect(seen.has('a2-many') || seen.has('a2-who')).toBe(true)
  })

  it('用词：旧书说「几何体」', () => {
    for (const kp of [ARR, RES]) {
      each(kp, (q) => {
        const t = zh((q.stem.find((p) => p.kind === 'text') as { text: LStr }).text)
        expect(t, q.id).not.toMatch(/组合体|物体|右面|后面|[（）()]/)
      })
    }
  })
})

function objsHave(q: Question, rows: Rows): boolean {
  return (solidsOf(q)?.items ?? []).some((s) => rowsId(rowsOf(s)) === rowsId(rows))
}
