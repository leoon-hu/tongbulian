import { describe, expect, it } from 'vitest'
import type { CubeSolid, LParam, LStr, Question, StemPart, ViewBlock } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import {
  BOOK_POS,
  P5,
  P6,
  SETS,
  type Rows,
  type Side,
  arrangements,
  barView,
  congruent,
  cubeCount,
  flipView,
  mirrorView,
  okShape,
  stairs,
  statusOf,
  topVisible,
  uniqueFromViews,
  viewKey,
  viewOf,
} from '../observe'

// 四下「观察物体（二）」：先查由高度图算出来的图形和课本一样（练习四 1：从左面看物体的后面画在左边），
// 再从题目（题干的物体、图形部件和题目文字的参数）反推答案，150 种子 × 三档；外加课本的约束——
// 第 1 档出得到例 1、做一做、练习四 1、2、3（观察物体）和例 2、做一做、练习四 4、5（观察不同的物体），
// 只说「从前面 / 上面 / 左面看」，物体每一摞都看得见，选项里的图形各不相同。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const POS = 'm4s2-02-positions'
const OBJ = 'm4s2-02-objects'
type Solids = Extract<StemPart, { kind: 'cube-solids' }>
type Views = Extract<StemPart, { kind: 'cube-views' }>

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
const viewsOf = (q: Question): Views | undefined => q.stem.find((p): p is Views => p.kind === 'cube-views')
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

describe('观察物体（二）：由高度图算看到的图形（课本的物体）', () => {
  it('例 1、做一做：前面 3 个一排，后面一个在左边 / 中间', () => {
    expect(viewKey(viewOf(BOOK_POS.e1!, 'front'))).toBe(key([[0, 0], [1, 0], [2, 0]]))
    expect(viewKey(viewOf(BOOK_POS.e1!, 'top'))).toBe(key([[0, 1], [0, 0], [1, 0], [2, 0]]))
    expect(viewKey(viewOf(BOOK_POS.e1!, 'left'))).toBe(key([[0, 0], [1, 0]]))
    expect(viewKey(viewOf(BOOK_POS.e1z!, 'top'))).toBe(key([[1, 1], [0, 0], [1, 0], [2, 0]]))
    expect(viewKey(viewOf(BOOK_POS.e1z!, 'left'))).toBe(key([[0, 0], [1, 0]]))
  })

  it('练习四 1：从左面看，后排（2 层）画在左边——左右翻过来的就不对了', () => {
    const p1 = BOOK_POS.p1!
    expect(viewKey(viewOf(p1, 'front'))).toBe(key([[0, 0], [1, 0], [2, 0], [0, 1]]))
    expect(viewKey(viewOf(p1, 'top'))).toBe(key([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]))
    const left = viewOf(p1, 'left')
    expect(viewKey(left)).toBe(key([[0, 0], [1, 0], [0, 1]]))
    expect(viewKey(mirrorView(left))).toBe(key([[0, 0], [1, 0], [1, 1]]))
    expect(viewKey(mirrorView(left))).not.toBe(viewKey(left))
  })

  it('练习四 3：（1）后排两摞各 2 个、左前 1 个；（2）凹字形', () => {
    const a = BOOK_POS.p3a!
    expect(viewKey(viewOf(a, 'front'))).toBe(key([[0, 0], [1, 0], [0, 1], [1, 1]]))
    expect(viewKey(viewOf(a, 'top'))).toBe(key([[0, 1], [1, 1], [0, 0]]))
    expect(viewKey(viewOf(a, 'left'))).toBe(key([[0, 0], [1, 0], [0, 1]]))
    const b = BOOK_POS.p3b!
    expect(viewKey(viewOf(b, 'front'))).toBe(key([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]]))
    expect(viewKey(viewOf(b, 'top'))).toBe(key([[0, 0], [1, 0], [2, 0]]))
    expect(viewKey(viewOf(b, 'left'))).toBe(key([[0, 0], [0, 1]]))
  })

  it('练习四 2：正方体放在长方体左端上面——前面看长条上一格、上面看一格加两格长条、左面看两格摞着', () => {
    expect(viewKey(barView(3, 0, 'front'))).toBe(viewKey([{ x: 0, y: 0, w: 3, tone: 'bar' }, { x: 0, y: 1 }]))
    expect(viewKey(barView(3, 0, 'top'))).toBe(viewKey([{ x: 0, y: 0 }, { x: 1, y: 0, w: 2, tone: 'bar' }]))
    expect(viewKey(barView(3, 0, 'left'))).toBe(viewKey([{ x: 0, y: 0, tone: 'bar' }, { x: 0, y: 1 }]))
    // 放在中间：从上面看长方体露出两头
    expect(barView(3, 1, 'top').filter((b) => b.tone === 'bar')).toHaveLength(2)
  })

  it('练习四 6：三个位置看到的图形只能摆出一种，7 个', () => {
    expect(viewKey(viewOf(P6, 'front'))).toBe(key([[0, 0], [1, 0], [2, 0], [3, 0], [2, 1]]))
    expect(viewKey(viewOf(P6, 'top'))).toBe(key([[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [3, 1]]))
    expect(viewKey(viewOf(P6, 'left'))).toBe(key([[0, 0], [1, 0], [0, 1]]))
    const all = arrangements([1, 1, 2, 1], [2, 1], P6.map((r) => r.map((h) => h > 0)), 5)
    expect(all).toEqual([P6])
    expect(cubeCount(P6)).toBe(7)
    expect(uniqueFromViews(P6)).toBe(true)
    // 2 × 2 交叉摆的两种摆法从三面看都一样：摆不出唯一的
    expect(uniqueFromViews([[1, 2], [2, 1]])).toBe(false)
  })

  it('练习四 7*：台阶 4 层一共 20 个（看不见的也算）', () => {
    expect(stairs(4)).toEqual([
      [4, 3, 2, 1],
      [3, 2, 1, 0],
      [2, 1, 0, 0],
      [1, 0, 0, 0],
    ])
    expect(cubeCount(stairs(4))).toBe(20)
    expect(cubeCount(stairs(3))).toBe(10)
  })

  it('例 2、做一做：上面、左面看相同，前面看不同；练习四 4：左面相同、前面都不同、上面第一个和第三个相同', () => {
    for (const id of ['e2', 'e2z'] as const) {
      expect(statusOf(SETS[id]!, 'front')).toBe('diff')
      expect(statusOf(SETS[id]!, 'top')).toBe('same')
      expect(statusOf(SETS[id]!, 'left')).toBe('same')
    }
    const p4 = SETS.p4!
    expect(statusOf(p4, 'front')).toBe('diff')
    expect(statusOf(p4, 'left')).toBe('same')
    expect(statusOf(p4, 'top')).toBe('mixed')
    expect(viewKey(viewOf(p4[0]!, 'top'))).toBe(viewKey(viewOf(p4[2]!, 'top')))
    expect(viewKey(viewOf(p4[0]!, 'left'))).toBe(key([[0, 0], [1, 0], [0, 1]]))
  })

  it('练习四 5：从前面看 2 格的是②③⑤、3 格的是①④⑥；从左面看 2 格的是①②④⑥', () => {
    const cells = (s: Side): number[] => P5.map((o) => viewOf(o, s).length)
    expect(cells('front')).toEqual([3, 2, 2, 3, 2, 3])
    expect(cells('left')).toEqual([2, 2, 3, 2, 3, 2])
    // 从上面看：六个都不一样；③和⑤是同一个形状转了半圈（出题时不放在一起比）
    const tops = P5.map((o) => viewKey(viewOf(o, 'top')))
    expect(new Set(tops).size).toBe(6)
    expect(congruent(viewOf(P5[2]!, 'top'), viewOf(P5[4]!, 'top'))).toBe(true)
    expect(congruent(viewOf(P5[0]!, 'top'), viewOf(P5[1]!, 'top'))).toBe(false)
  })

  it('上下翻、左右翻：从上面看把前排画到上面是另一个图形', () => {
    const top = viewOf(BOOK_POS.e1!, 'top')
    expect(viewKey(flipView(top))).toBe(key([[0, 0], [0, 1], [1, 1], [2, 1]]))
    expect(viewKey(flipView(flipView(top)))).toBe(viewKey(top))
    expect(viewKey(mirrorView(mirrorView(viewOf(BOOK_POS.p1!, 'left'))))).toBe(viewKey(viewOf(BOOK_POS.p1!, 'left')))
  })

  it('能看清的物体：课本的都行；后面的被前面右边高的挡住、前面比后面高、不连在一起的都不行', () => {
    const book = [...Object.values(BOOK_POS), P6, stairs(3), stairs(4), ...P5, ...Object.values(SETS).flat()]
    for (const rows of book) expect(okShape(rows), rowsKey(rows)).toBe(true)
    // 斜着画往后两排差不多挪了一格：左后角那个被右前方两层的那一摞整个挡住
    expect(topVisible([[1, 0], [1, 0], [1, 2]])[0]![0]).toBeLessThan(0.2)
    expect(okShape([[1, 0], [1, 0], [1, 2]])).toBe(false)
    expect(okShape([[1, 1], [1, 2]])).toBe(false)
    expect(okShape([[1, 0, 1]])).toBe(false)
    expect(okShape([[0, 0], [1, 1]])).toBe(false)
    // 课本例 2 的中间那个：左边一摞的顶面被中间高的挡住一点，还看得见
    expect(topVisible([[1, 2, 1]])[0]![0]).toBeGreaterThan(0.5)
  })
})

/** 题目里的物体（高度图）都能看清；第 1 档都是课本的物体 */
const BOOK_ROWS = new Set([...Object.values(BOOK_POS), ...P5, ...Object.values(SETS).flat()].map(rowsKey))

describe('从不同位置观察物体（m4s2-02-positions）', () => {
  it('从题目反推答案', () => {
    each(POS, (q) => {
      const fam = famOf(q)
      const { k, p } = textOf(q)
      const solids = solidsOf(q)
      const views = viewsOf(q)
      if (fam === 'pick') {
        // 从某面看是哪个图形：三幅图里只有一幅和这一面看到的一样
        expect(k).toBe('m4.obs.pick')
        const side = sideOf(p.side)
        expect(solids!.items).toHaveLength(1)
        expect(views!.numbered, q.id).toBe(true)
        const want = viewKey(viewOfSolid(solids!.items[0]!, side))
        const hits = views!.items.map((f, i) => (viewKey(f.blocks) === want ? i + 1 : 0)).filter(Boolean)
        expect(hits, q.id).toEqual([numAnswer(q)])
        expect(new Set(views!.items.map((f) => viewKey(f.blocks))).size, q.id).toBe(views!.items.length)
        expect(q.input).toBe('choice')
      } else if (fam === 'which') {
        // 这个图形是从哪面看到的：只有一面看到的是它
        expect(k).toBe('m4.obs.which')
        const fig = viewKey(views!.items[0]!.blocks)
        const sides = (['front', 'top', 'left'] as const).filter((s) => viewKey(viewOfSolid(solids!.items[0]!, s)) === fig)
        expect(sides, q.id).toHaveLength(1)
        expect(choiceAnswer(q), q.id).toBe(SIDE_ZH[sides[0]!])
      } else if (fam === 'count') {
        // 由三个位置看到的图形摆物体：只摆得出一种，个数就是答案
        expect(k).toBe('m4.obs.count')
        expect(solids).toBeUndefined()
        const figs = views!.items
        expect(figs.map((f) => sideOf(f.caption as LParam))).toEqual(['front', 'top', 'left'])
        const heights = (bs: ViewBlock[]): number[] => {
          const w = Math.max(...bs.map((b) => b.x)) + 1
          return Array.from({ length: w }, (_, x) => bs.filter((b) => b.x === x).length)
        }
        const top = figs[1]!.blocks
        const R = Math.max(...top.map((b) => b.y)) + 1
        const C = Math.max(...top.map((b) => b.x)) + 1
        const foot = Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => top.some((b) => b.x === c && b.y === R - 1 - r)))
        const all = arrangements(heights(figs[0]!.blocks), heights(figs[2]!.blocks), foot, 3)
        expect(all, q.id).toHaveLength(1)
        expect(numAnswer(q), q.id).toBe(cubeCount(all[0]!))
      } else if (fam === 'pile') {
        expect(k).toBe('m4.obs.pile')
        const s = solids!.items[0]!
        expect('rows' in s).toBe(true)
        expect(numAnswer(q), q.id).toBe(cubeCount((s as { rows: Rows }).rows))
      } else {
        throw new Error(`没见过的题：${q.id}`)
      }
    })
  })

  it('物体都看得清、每个 4–7 个小正方体（台阶除外）；第 1 档都是课本的物体', () => {
    each(POS, (q, d) => {
      for (const s of solidsOf(q)?.items ?? []) {
        if ('bar' in s) {
          expect(s.on, q.id).toBeLessThan(s.bar)
          if (d === 1) expect([s.bar, s.on], q.id).toEqual([3, 0])
          continue
        }
        expect(okShape(s.rows), q.id).toBe(true)
        if (famOf(q) === 'pile') continue
        expect(cubeCount(s.rows), q.id).toBeGreaterThanOrEqual(4)
        expect(cubeCount(s.rows), q.id).toBeLessThanOrEqual(d === 3 ? 8 : 7)
        if (d === 1) expect(BOOK_ROWS.has(rowsKey(s.rows)), q.id).toBe(true)
      }
    })
  })

  it('第 1 档出得到例 1、做一做、练习四 1、2、3 的「选图形」和「从哪面看」；第 2 档有练习四 6，第 3 档有练习四 7*', () => {
    const seen = new Set<string>()
    each(POS, (q, d) => {
      const id = q.id.split(':')[1]!
      const [fam, obj] = id.split('-')
      seen.add(`${d}-${fam}-${fam === 'count' || fam === 'pile' ? id.split('-').slice(1).join('-') : obj}`)
    })
    for (const obj of ['e1', 'e1z', 'p1', 'p3a', 'p3b', 'bar30']) {
      expect(seen.has(`1-pick-${obj}`), obj).toBe(true)
      expect(seen.has(`1-which-${obj}`), obj).toBe(true)
    }
    expect(seen.has('2-count-0021.1111')).toBe(true)
    expect(seen.has('3-pile-4')).toBe(true)
    expect([...seen].some((s) => s.startsWith('1-count') || s.startsWith('1-pile'))).toBe(false)
  })

  it('从左面看的选项里常放左右翻过来的图形（后面画到了右边）', () => {
    let trap = 0
    each(POS, (q, d) => {
      if (d !== 1 || famOf(q) !== 'pick' || sideOf(textOf(q).p.side) !== 'left') return
      const s = solidsOf(q)!.items[0]!
      const left = viewOfSolid(s, 'left')
      if (viewKey(mirrorView(left)) === viewKey(left)) return
      if (viewsOf(q)!.items.some((f) => viewKey(f.blocks) === viewKey(mirrorView(left)))) trap += 1
    })
    expect(trap).toBeGreaterThan(3)
  })
})

describe('观察不同的物体（m4s2-02-objects）', () => {
  it('从题目反推答案', () => {
    each(OBJ, (q) => {
      const fam = famOf(q)
      const { k, p } = textOf(q)
      const objs = (solidsOf(q)?.items ?? []).map((s) => (s as { rows: Rows }).rows)
      const n = objs.length
      if (fam === 'judge') {
        expect(choiceAnswer(q), q.id).toBe(k === 'm4.obs.maybe' ? '对' : '不对')
        return
      }
      expect(n, q.id).toBeGreaterThanOrEqual(3)
      for (const o of objs) expect(okShape(o), q.id).toBe(true)
      const st = (s: Side): string => statusOf(objs, s)
      if (fam === 'sameside') {
        expect(k).toBe('m4.obs.sameSide')
        const same = (['front', 'top', 'left'] as const).filter((s) => st(s) === 'same')
        expect(same, q.id).toHaveLength(1)
        expect(choiceAnswer(q)).toBe(SIDE_ZH[same[0]!])
        expect(p.n).toBe(n)
      } else if (fam === 'diffside') {
        expect(k).toBe('m4.obs.diffSide')
        const notSame = (['front', 'top', 'left'] as const).filter((s) => st(s) !== 'same')
        expect(notSame, q.id).toHaveLength(1)
        expect(choiceAnswer(q)).toBe(SIDE_ZH[notSame[0]!])
      } else if (fam === 'alldiff') {
        expect(k).toBe('m4.obs.allDiff')
        const diff = (['front', 'top', 'left'] as const).filter((s) => st(s) === 'diff')
        expect(diff, q.id).toHaveLength(1)
        expect(choiceAnswer(q)).toBe(SIDE_ZH[diff[0]!])
      } else if (fam === 'issame') {
        expect(k).toBe('m4.obs.isSame')
        const s = st(sideOf(p.side))
        expect(s, q.id).not.toBe('mixed')
        expect(choiceAnswer(q)).toBe(s === 'same' ? '相同' : '不相同')
      } else if (fam === 'allsee') {
        // 这几个物体从某面看都一样：选项里只有一幅和它一样
        expect(k).toBe('m4.obs.allSee')
        const side = sideOf(p.side)
        expect(st(side), q.id).toBe('same')
        expect(solidsOf(q)!.numbered).toBeUndefined()
        const want = viewKey(viewOf(objs[0]!, side))
        const hits = viewsOf(q)!.items.map((f, i) => (viewKey(f.blocks) === want ? i + 1 : 0)).filter(Boolean)
        expect(hits, q.id).toEqual([numAnswer(q)])
        expect(new Set(viewsOf(q)!.items.map((f) => viewKey(f.blocks))).size).toBe(3)
      } else if (fam === 'who') {
        // 哪个物体从某面看是这个图形：只有一个；从上面看时别的物体转一转也不和它重合
        expect(k).toBe('m4.obs.who')
        const side = sideOf(p.side)
        expect(solidsOf(q)!.numbered).toBe(true)
        const fig = viewsOf(q)!.items[0]!.blocks
        const hits = objs.map((o, i) => (viewKey(viewOf(o, side)) === viewKey(fig) ? i + 1 : 0)).filter(Boolean)
        expect(hits, q.id).toEqual([numAnswer(q)])
        if (side === 'top') for (const [i, o] of objs.entries()) if (i + 1 !== numAnswer(q)) expect(congruent(viewOf(o, 'top'), fig), q.id).toBe(false)
      } else if (fam === 'pair') {
        expect(k).toBe('m4.obs.pairSame')
        const side = sideOf(p.side)
        const keys = objs.map((o) => viewKey(viewOf(o, side)))
        const pairs: string[] = []
        for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (keys[a] === keys[b]) pairs.push(`${a + 1} 和 ${b + 1}`)
        expect(pairs, q.id).toEqual([choiceAnswer(q)])
      } else if (fam === 'many') {
        // 从某面看是这个图形的有几个
        expect(k).toBe('m4.obs.howMany')
        const side = sideOf(p.side)
        expect(side).not.toBe('top')
        const fig = viewKey(viewsOf(q)!.items[0]!.blocks)
        expect(objs.filter((o) => viewKey(viewOf(o, side)) === fig).length, q.id).toBe(numAnswer(q))
        expect(n).toBeGreaterThanOrEqual(5)
      } else {
        throw new Error(`没见过的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到例 2、做一做、练习四 4、5，物体都是课本的；第 2 档有成长小档案的结论', () => {
    const seen = new Set<string>()
    each(OBJ, (q, d) => {
      const [fam, set] = q.id.split(':')[1]!.split('-')
      seen.add(`${d}-${fam}-${set!.replace(/^p5\d+$/, 'p5')}`)
      if (d === 1) for (const s of solidsOf(q)?.items ?? []) expect(BOOK_ROWS.has(rowsKey((s as { rows: Rows }).rows)), q.id).toBe(true)
    })
    for (const set of ['e2', 'e2z']) for (const fam of ['diffside', 'issame', 'allsee', 'who']) expect(seen.has(`1-${fam}-${set}`), `${fam} ${set}`).toBe(true)
    for (const fam of ['sameside', 'alldiff', 'issame', 'allsee', 'who', 'pair']) expect(seen.has(`1-${fam}-p4`), `${fam} p4`).toBe(true)
    expect(seen.has('1-many-p5')).toBe(true)
    expect(seen.has('1-who-p5')).toBe(true)
    expect(seen.has('2-judge-m4.obs.maybe')).toBe(true)
    expect(seen.has('2-judge-m4.obs.must')).toBe(true)
  })

  it('练习四 5：前面看两格的有 3 个、左面看两格的有 4 个、左面看三格的有 2 个', () => {
    const answers = new Map<string, number>()
    each(OBJ, (q, d) => {
      if (d !== 1 || famOf(q) !== 'many') return
      const side = sideOf(textOf(q).p.side)
      answers.set(`${side}-${viewsOf(q)!.items[0]!.blocks.length}`, numAnswer(q))
    })
    expect(Object.fromEntries(answers)).toEqual({ 'front-2': 3, 'front-3': 3, 'left-2': 4, 'left-3': 2 })
  })
})

describe('观察物体（二）：用词', () => {
  it('只说从前面、上面、左面看（没有右面、后面），题目文字里没有圆括号', () => {
    for (const kp of [POS, OBJ]) {
      each(kp, (q) => {
        const texts = [...q.stem.filter((p) => p.kind === 'text').map((p) => zh((p as { text: LStr }).text)), ...(q.choices ?? []).map((c) => zh(c.label))]
        for (const t of texts) {
          expect(t, q.id).not.toMatch(/右面|后面|主视图|俯视图|左视图/)
          expect(t, q.id).not.toMatch(/[（）()]/)
        }
      })
    }
  })
})
