import { describe, expect, it } from 'vitest'
import type { CubeSolid, LParam, LStr, Question, StemPart, TopCell, ViewBlock } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import {
  BOOK_OBS,
  BOOK_SETS,
  E3,
  E3A,
  E3Z,
  P5,
  P6,
  P7,
  P9,
  type Rows,
  type Side,
  arrangements,
  barView,
  congruent,
  cubeCount,
  flipView,
  frontHeights,
  leftKeysFrom,
  mirrorView,
  okShape,
  statusOf,
  topCells,
  uniqueFromViews,
  viewKey,
  viewOf,
} from '../combine'

// 五上「观察简单组合体」：先查由高度图算出来的图形和课本一样（练习一 1、9：从左面看组合体的后面画在左边），
// 再从题目（题干的组合体、图形部件和题目文字的参数）反推答案，150 种子 × 三档；外加课本的约束——
// 第 1 档出得到例 1、例 2、做一做（观察）和例 3（1）（2）、做一做（还原），只说「从前面 / 上面 / 左面看」。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const OBS = 'm5s1-01-observe'
const RES = 'm5s1-01-restore'
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
const choiceAnswer = (q: Question): string => {
  const id = (q.answer as { choiceId: string }).choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}
/** 数的答案（数字键盘或数的选项卡） */
const numAnswer = (q: Question): number => (q.answer.kind === 'number' ? q.answer.value : Number(choiceAnswer(q)))
const viewOfSolid = (s: CubeSolid, side: Side): ViewBlock[] => ('bar' in s ? barView(s.bar, s.on, side) : viewOf(s.rows, side))
const key = (cells: [number, number][]): string => viewKey(cells.map(([x, y]) => ({ x, y })))
const rowsKey = (rows: Rows): string => JSON.stringify(rows)
const SIDE_ZH: Record<Side, string> = { front: '从前面看', top: '从上面看', left: '从左面看' }
const rowsOf = (s: CubeSolid): Rows => (s as { rows: Rows }).rows
/** 标数的俯视图还原成高度图（后排在上） */
function rowsFromTop(cells: TopCell[]): Rows {
  const R = Math.max(...cells.map((c) => c.y)) + 1
  const C = Math.max(...cells.map((c) => c.x)) + 1
  return Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, x) => cells.find((c) => c.x === x && c.y === R - 1 - r)?.n ?? 0))
}
/** 看到的图形（一列一列摞起来的）还原成每列的高度 */
const heights = (bs: ViewBlock[]): number[] => {
  const w = Math.max(...bs.map((b) => b.x)) + 1
  return Array.from({ length: w }, (_, x) => bs.filter((b) => b.x === x).length)
}

describe('观察简单组合体：由高度图算看到的图形（课本的组合体）', () => {
  it('例 1：小红平铺（前 3 + 后左 1）、小亮摞高（一排 3 + 中间上面 1）；同一个三格一排，小红是前面、小亮是上面', () => {
    const a = BOOK_OBS.e1a!
    const b = BOOK_OBS.e1b!
    expect(viewKey(viewOf(a, 'front'))).toBe(key([[0, 0], [1, 0], [2, 0]]))
    expect(viewKey(viewOf(a, 'left'))).toBe(key([[0, 0], [1, 0]]))
    expect(viewKey(viewOf(a, 'top'))).toBe(key([[0, 1], [0, 0], [1, 0], [2, 0]]))
    expect(viewKey(viewOf(b, 'top'))).toBe(key([[0, 0], [1, 0], [2, 0]]))
    expect(viewKey(viewOf(b, 'left'))).toBe(key([[0, 0], [0, 1]]))
    expect(viewKey(viewOf(b, 'front'))).toBe(key([[0, 0], [1, 0], [2, 0], [1, 1]]))
    expect(cubeCount(a)).toBe(4)
    expect(cubeCount(b)).toBe(4)
  })

  it('练习一 1：从左面看，后排（2 层）画在左边；练习一 3 的两个', () => {
    const p1 = BOOK_OBS.p1!
    expect(viewKey(viewOf(p1, 'front'))).toBe(key([[0, 0], [1, 0], [2, 0], [0, 1]]))
    expect(viewKey(viewOf(p1, 'top'))).toBe(key([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]))
    expect(viewKey(viewOf(p1, 'left'))).toBe(key([[0, 0], [1, 0], [0, 1]]))
    expect(viewKey(viewOf(BOOK_OBS.p3a!, 'front'))).toBe(key([[0, 0], [1, 0], [0, 1], [1, 1]]))
    expect(viewKey(viewOf(BOOK_OBS.p3b!, 'front'))).toBe(key([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]]))
  })

  it('例 2、做一做：上面、左面看相同，前面看不同；练习一 4：左面相同、前面都不同、上面第一个和第三个相同', () => {
    for (const id of ['e2', 'e2z'] as const) {
      expect(statusOf(BOOK_SETS[id]!, 'front')).toBe('diff')
      expect(statusOf(BOOK_SETS[id]!, 'top')).toBe('same')
      expect(statusOf(BOOK_SETS[id]!, 'left')).toBe('same')
    }
    const p4 = BOOK_SETS.p4!
    expect(statusOf(p4, 'front')).toBe('diff')
    expect(statusOf(p4, 'left')).toBe('same')
    expect(statusOf(p4, 'top')).toBe('mixed')
  })

  it('例 3（1）：几种摆法从前面看都是「下 2 + 左上 1」；例 3（2）、做一做、练习一 6：只能摆出一种（5、7、4 个）', () => {
    for (const rows of E3A) expect(viewKey(viewOf(rows, 'front'))).toBe(key([[0, 0], [1, 0], [0, 1]]))
    expect(viewKey(viewOf(E3, 'top'))).toBe(key([[0, 2], [1, 2], [0, 1], [0, 0]]))
    expect(viewKey(viewOf(E3, 'left'))).toBe(key([[0, 0], [1, 0], [2, 0], [0, 1]]))
    for (const [rows, n] of [
      [E3, 5],
      [E3Z, 7],
      [P6, 4],
    ] as const) {
      expect(uniqueFromViews(rows)).toBe(true)
      expect(cubeCount(rows)).toBe(n)
    }
    expect(arrangements(frontHeights(E3Z), [2, 1], E3Z.map((r) => r.map((h) => h > 0)), 5)).toEqual([E3Z])
  })

  it('练习一 5：用 5 个、从前面看「下 3 + 右上 1」、从上面看「下 3 + 上中 1」只能这样摆，从左面看是「下 2 + 右上 1」', () => {
    expect(cubeCount(P5)).toBe(5)
    const keys = leftKeysFrom(frontHeights(P5), P5.map((r) => r.map((h) => h > 0)), 5)
    expect([...keys]).toEqual([key([[0, 0], [1, 0], [1, 1]])])
  })

  it('练习一 7：①③ 从前面看是一格，⑤⑩ 从左面看是「下 2 + 左上 1」', () => {
    const one = key([[0, 0]])
    const el = key([[0, 0], [1, 0], [0, 1]])
    expect(P7.map((r, i) => (viewKey(viewOf(r, 'front')) === one ? i + 1 : 0)).filter(Boolean)).toEqual([1, 3])
    expect(P7.map((r, i) => (viewKey(viewOf(r, 'left')) === el ? i + 1 : 0)).filter(Boolean)).toEqual([5, 10])
  })

  it('练习一 9：标数的俯视图（7 个）从前面看列高 1、3、1，从左面看 3、2（后排在左）；左右反了的就是课本的 ④', () => {
    expect(rowsFromTop(topCells(P9))).toEqual(P9)
    expect(cubeCount(P9)).toBe(7)
    expect(heights(viewOf(P9, 'front'))).toEqual([1, 3, 1])
    expect(heights(viewOf(P9, 'left'))).toEqual([3, 2])
    expect(heights(mirrorView(viewOf(P9, 'left')))).toEqual([2, 3])
  })

  it('能看清的组合体：课本里要画出来的都行（练习一 6 那个后面被挡住，只出看到的图形）', () => {
    for (const rows of [...Object.values(BOOK_OBS), ...Object.values(BOOK_SETS).flat(), ...P7, ...E3A, E3, E3Z]) expect(okShape(rows), rowsKey(rows)).toBe(true)
    expect(okShape(P6)).toBe(false)
    // 上下翻、左右翻两次回到原来
    const top = viewOf(BOOK_OBS.e1a!, 'top')
    expect(viewKey(flipView(flipView(top)))).toBe(viewKey(top))
    expect(congruent(top, flipView(top))).toBe(true)
  })
})

describe('观察简单组合体（m5s1-01-observe）', () => {
  it('从题目反推答案', () => {
    each(OBS, (q) => {
      const fam = famOf(q)
      const { k, p } = textOf(q)
      const solids = solidsOf(q)
      const views = viewsAll(q)
      const objs = (solids?.items ?? []).filter((s) => 'rows' in s).map(rowsOf)
      for (const o of objs) expect(okShape(o), q.id).toBe(true)
      const st = (s: Side): string => statusOf(objs, s)
      if (fam === 'pick') {
        expect(k).toBe('m5.comb.pick')
        const side = sideOf(p.side)
        expect(solids!.items).toHaveLength(1)
        expect(views[0]!.numbered, q.id).toBe(true)
        const want = viewKey(viewOfSolid(solids!.items[0]!, side))
        const hits = views[0]!.items.map((f, i) => (viewKey(f.blocks) === want ? i + 1 : 0)).filter(Boolean)
        expect(hits, q.id).toEqual([numAnswer(q)])
        expect(new Set(views[0]!.items.map((f) => viewKey(f.blocks))).size, q.id).toBe(views[0]!.items.length)
      } else if (fam === 'which') {
        expect(k).toBe('m5.comb.which')
        const fig = viewKey(views[0]!.items[0]!.blocks)
        const sides = (['front', 'top', 'left'] as const).filter((s) => viewKey(viewOfSolid(solids!.items[0]!, s)) === fig)
        expect(sides, q.id).toHaveLength(1)
        expect(choiceAnswer(q), q.id).toBe(SIDE_ZH[sides[0]!])
      } else if (fam === 'sameside' || fam === 'diffside' || fam === 'alldiff') {
        const want = { sameside: 'same', diffside: 'notsame', alldiff: 'diff' }[fam]
        const ok = (['front', 'top', 'left'] as const).filter((s) => (want === 'notsame' ? st(s) !== 'same' : st(s) === want))
        expect(ok, q.id).toHaveLength(1)
        expect(choiceAnswer(q), q.id).toBe(SIDE_ZH[ok[0]!])
        expect(p.n).toBe(objs.length)
      } else if (fam === 'issame') {
        const s = st(sideOf(p.side))
        expect(s, q.id).not.toBe('mixed')
        expect(choiceAnswer(q)).toBe(s === 'same' ? '相同' : '不相同')
      } else if (fam === 'allsee') {
        const side = sideOf(p.side)
        expect(st(side), q.id).toBe('same')
        const want = viewKey(viewOf(objs[0]!, side))
        const hits = views[0]!.items.map((f, i) => (viewKey(f.blocks) === want ? i + 1 : 0)).filter(Boolean)
        expect(hits, q.id).toEqual([numAnswer(q)])
      } else if (fam === 'who') {
        const side = sideOf(p.side)
        expect(solids!.numbered).toBe(true)
        const fig = views[0]!.items[0]!.blocks
        const hits = objs.map((o, i) => (viewKey(viewOf(o, side)) === viewKey(fig) ? i + 1 : 0)).filter(Boolean)
        expect(hits, q.id).toEqual([numAnswer(q)])
        if (side === 'top') for (const [i, o] of objs.entries()) if (i + 1 !== numAnswer(q)) expect(congruent(viewOf(o, 'top'), fig), q.id).toBe(false)
      } else if (fam === 'pair') {
        const side = sideOf(p.side)
        const keys = objs.map((o) => viewKey(viewOf(o, side)))
        const pairs: string[] = []
        for (let a = 0; a < objs.length; a++) for (let b = a + 1; b < objs.length; b++) if (keys[a] === keys[b]) pairs.push(`${a + 1} 和 ${b + 1}`)
        expect(pairs, q.id).toEqual([choiceAnswer(q)])
      } else if (fam === 'many') {
        const side = sideOf(p.side)
        const fig = viewKey(views[0]!.items[0]!.blocks)
        expect(objs.filter((o) => viewKey(viewOf(o, side)) === fig).length, q.id).toBe(numAnswer(q))
      } else if (fam === 'judge') {
        expect(choiceAnswer(q), q.id).toBe(k === 'm5.comb.maybe' ? '对' : '不对')
      } else if (fam === 'toppick') {
        // 标数的俯视图：还原出高度图，三幅图里只有一幅是从这一面看到的
        const rows = rowsFromTop(topOf(q)!.cells)
        const side = sideOf(p.side)
        const want = viewKey(viewOf(rows, side))
        const hits = views[0]!.items.map((f, i) => (viewKey(f.blocks) === want ? i + 1 : 0)).filter(Boolean)
        expect(hits, q.id).toEqual([numAnswer(q)])
      } else {
        throw new Error(`没见过的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到例 1、练习一 1、2、3 的「选图形」「从哪个方向看」和例 2、做一做、练习一 4；第 3 档有练习一 9', () => {
    const seen = new Set<string>()
    each(OBS, (q, d) => {
      const [fam, obj] = q.id.split(':')[1]!.split('-')
      seen.add(`${d}-${fam}-${obj}`)
      if (d === 1) for (const s of solidsOf(q)?.items ?? []) if ('rows' in s) expect([...Object.values(BOOK_OBS), ...Object.values(BOOK_SETS).flat()].map(rowsKey), q.id).toContain(rowsKey(s.rows))
    })
    for (const obj of ['e1a', 'e1b', 'p1', 'p3a', 'p3b', 'bar30']) expect(seen.has(`1-pick-${obj}`) || seen.has(`1-which-${obj}`), obj).toBe(true)
    for (const set of ['e2', 'e2z']) expect(seen.has(`1-diffside-${set}`), set).toBe(true)
    expect(seen.has('1-sameside-p4'), 'p4').toBe(true)
    expect(seen.has('1-judge-maybe')).toBe(true)
    expect(seen.has('3-toppick-p9')).toBe(true)
    expect([...seen].some((s) => s.startsWith('2-many-p7') || s.startsWith('2-who-p7'))).toBe(true)
  })
})

describe('还原简单组合体（m5s1-01-restore）', () => {
  it('从题目反推答案', () => {
    each(RES, (q) => {
      const fam = famOf(q)
      const { k, p } = textOf(q)
      const views = viewsAll(q)
      const solids = solidsOf(q)
      const objs = (solids?.items ?? []).map(rowsOf)
      for (const o of objs) expect(okShape(o), q.id).toBe(true)
      if (fam === 'fit') {
        // 从某面看是这个图形，三个组合体里只有一个是这样摆的（都用题目说的那么多个）
        expect(k).toBe('m5.comb.fitN')
        const side = sideOf(p.side)
        const want = viewKey(views[0]!.items[0]!.blocks)
        const hits = objs.map((o, i) => (viewKey(viewOf(o, side)) === want ? i + 1 : 0)).filter(Boolean)
        expect(hits, q.id).toEqual([numAnswer(q)])
        for (const o of objs) expect(cubeCount(o), q.id).toBe(p.n)
      } else if (fam === 'count' || fam === 'build') {
        // 三个方向看到的图形（带字）：只摆得出一种，个数 / 是哪一个
        const figs = views[0]!.items
        expect(figs.map((f) => sideOf(f.caption as LParam))).toEqual(['front', 'top', 'left'])
        const top = figs[1]!.blocks
        const R = Math.max(...top.map((b) => b.y)) + 1
        const C = Math.max(...top.map((b) => b.x)) + 1
        const foot = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => top.some((b) => b.x === c && b.y === R - 1 - r)))
        const all = arrangements(heights(figs[0]!.blocks), heights(figs[2]!.blocks), foot, 3)
        expect(all, q.id).toHaveLength(1)
        if (fam === 'count') expect(numAnswer(q), q.id).toBe(cubeCount(all[0]!))
        else {
          const sig = (r: Rows): string => (['front', 'top', 'left'] as const).map((s) => viewKey(viewOf(r, s))).join('|')
          const hits = objs.map((o, i) => (sig(o) === sig(all[0]!) ? i + 1 : 0)).filter(Boolean)
          expect(hits, q.id).toEqual([numAnswer(q)])
        }
      } else if (fam === 'least') {
        expect(numAnswer(q), q.id).toBe(views[0]!.items[0]!.blocks.length)
      } else if (fam === 'leftfrom') {
        // 前面、上面看到的图形 + 一共几个：所有摆法从左面看都一样，就是答案那幅
        const figs = views[0]!.items
        const front = heights(figs[0]!.blocks)
        const top = figs[1]!.blocks
        const R = Math.max(...top.map((b) => b.y)) + 1
        const foot = Array.from({ length: R }, (_, r) => Array.from({ length: front.length }, (_, c) => top.some((b) => b.x === c && b.y === R - 1 - r)))
        const keys = [...leftKeysFrom(front, foot, Number(p.n))]
        expect(keys, q.id).toHaveLength(1)
        const hits = views[1]!.items.map((f, i) => (viewKey(f.blocks) === keys[0] ? i + 1 : 0)).filter(Boolean)
        expect(hits, q.id).toEqual([numAnswer(q)])
      } else if (fam === 'topcount') {
        expect(numAnswer(q), q.id).toBe(cubeCount(rowsFromTop(topOf(q)!.cells)))
      } else {
        throw new Error(`没见过的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到例 3（1）（L 的几种摆法）、例 3（2）、做一做、练习一 6；第 2 档有练习一 5、8；第 3 档有标数的俯视图', () => {
    const seen = new Set<string>()
    each(RES, (q, d) => {
      const id = q.id.split(':')[1]!
      seen.add(`${d}-${id.split('-')[0]}`)
      if (famOf(q) === 'count' && d === 1) seen.add(`count-${cubeCount(rowsFromTopViews(q))}`)
    })
    for (const f of ['1-fit', '1-count', '1-build', '2-leftfrom', '2-least', '3-topcount']) expect(seen.has(f), f).toBe(true)
    for (const n of [5, 7, 4]) expect(seen.has(`count-${n}`), `count ${n}`).toBe(true)
  })
})

/** count 题的三幅图还原成唯一的摆法 */
function rowsFromTopViews(q: Question): Rows {
  const figs = viewsAll(q)[0]!.items
  const top = figs[1]!.blocks
  const R = Math.max(...top.map((b) => b.y)) + 1
  const C = Math.max(...top.map((b) => b.x)) + 1
  const foot = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => top.some((b) => b.x === c && b.y === R - 1 - r)))
  return arrangements(heights(figs[0]!.blocks), heights(figs[2]!.blocks), foot, 1)[0]!
}

describe('观察简单组合体：用词', () => {
  it('只说从前面、上面、左面看（没有右面、后面、主视图），题目文字里没有圆括号', () => {
    for (const kp of [OBS, RES]) {
      each(kp, (q) => {
        const texts = [...q.stem.filter((p) => p.kind === 'text').map((p) => zh((p as { text: LStr }).text)), ...(q.choices ?? []).map((c) => zh(c.label))]
        for (const t of texts) {
          expect(t, q.id).not.toMatch(/右面|后面|主视图|俯视图|左视图|物体/)
          expect(t, q.id).not.toMatch(/[（）()]/)
        }
      })
    }
  })
})
