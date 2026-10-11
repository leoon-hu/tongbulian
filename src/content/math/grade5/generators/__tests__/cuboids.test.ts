import { describe, expect, it } from 'vitest'
import type { BoxSpec, LParam, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
// 三年级「观察物体」的展开图折法（另写的一份），拿来核对本单元的 fold
import { fold as fold3 } from '@/content/math/grade3/generators/views'
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { ZH } from '../../lang/cuboids'
import {
  BELL_NET,
  BOOK_NETS,
  CAP_FACTS,
  CAP_FIT,
  CUBE_NETS,
  DRAIN_FACTS,
  KNOW_FACTS,
  KP_CAP,
  KP_IRR,
  KP_KNOW,
  KP_NET,
  KP_RATE,
  KP_SURF,
  KP_VOL,
  KP_VUNIT,
  NOT_NETS,
  VOL_FIT,
  fold,
  netCells,
  orient,
  shift,
} from '../cuboids'

// 五下「长方体和正方体」：从题目（题目文字的参数、图上标的数、展开图、烧杯）反推答案，150 种子 × 三档；
// 外加课本的约束——每个知识点第 1 档出得到例题和做一做的题型、题目里的「长」只在读法唯一的词里（概念题的几条除外）、
// 不写容易读错的多音字、小数从小池子里取。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KPS = [KP_KNOW, KP_NET, KP_SURF, KP_VUNIT, KP_VOL, KP_RATE, KP_CAP, KP_IRR]
type Box = Extract<StemPart, { kind: 'box' }>
type Net = Extract<StemPart, { kind: 'net' }>

function each(kp: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kp)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const famOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
/** 题目文字（第一段不是「图中的单位是……」的那段）的键和参数 */
function mainText(q: Question): { k: string; p: Record<string, LParam> } {
  const parts = q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((p) => p.text as { k: string; p?: Record<string, LParam> })
  const t = parts.find((x) => x.k !== 'm5.cube.unitIs') ?? parts[0]
  return t ? { k: t.k, p: t.p ?? {} } : { k: '', p: {} }
}
const numP = (v: LParam | undefined): number => Number(v)
const keyOf = (v: LParam | undefined): string => (v as { k: string }).k
const boxOf = (q: Question): BoxSpec[] => (q.stem.find((p): p is Box => p.kind === 'box') as Box).items
const labelNums = (b: BoxSpec): [number, number, number] => [Number(b.labels!.l), Number(b.labels!.w), Number(b.labels!.h)]
const choiceLabel = (q: Question): LStr => {
  const id = (q.answer as { choiceId: string }).choiceId
  return q.choices!.find((c) => c.id === id)!.label
}
/** 数的答案（数字键盘，或选项卡上的数） */
const numAnswer = (q: Question): number => (q.answer.kind === 'number' ? q.answer.value : Number(zh(choiceLabel(q))))
/** 词条答案的键 */
const keyAnswer = (q: Question): string => (choiceLabel(q) as { k: string }).k
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b))
/** 「5.5 厘米」这种选项的数 */
const nOf = (l: LStr): number => Number((l as unknown as { p: { n: string | number } }).p.n)

/** 单位换成立方厘米 / 平方厘米 / 厘米 的倍数（独立于生成器的换算表） */
const BASE: Record<string, number> = {
  'm5.cube.u.m3': 1e6,
  'm5.cube.u.dm3': 1e3,
  'm5.cube.u.cm3': 1,
  'm5.cube.u.l': 1e3,
  'm5.cube.u.ml': 1,
  'm5.cube.u.m2': 1e4,
  'm5.cube.u.dm2': 100,
  'm5.cube.u.cm2': 1,
  'm5.cube.u.m': 100,
  'm5.cube.u.dm': 10,
  'm5.cube.u.cm': 1,
}
const surface = (l: number, w: number, h: number): number => 2 * (l * w + l * h + w * h)
/** 用 n 个小正方体搭长方体的搭法（硬数：长 ≤ 宽 ≤ 高） */
function waysBrute(n: number): number {
  let k = 0
  for (let a = 1; a <= n; a++) for (let b = a; b <= n; b++) for (let c = b; c <= n; c++) if (a * b * c === n) k++
  return k
}
const cubeCount = (rows: number[][]): number => rows.flat().reduce((a, b) => a + b, 0)
const YES = 'm5.cube.yes'
const NO = 'm5.cube.no'

describe('展开图：折法（滚方块）与课本的展开图', () => {
  it('11 种都能折、互不相同；折不成的都折不成；和三年级的 fold 结果一样', () => {
    const canon = (cells: { r: number; c: number }[]): string =>
      Array.from({ length: 8 }, (_, k) =>
        orient(cells, k)
          .map((x) => `${x.r},${x.c}`)
          .join(' '),
      ).sort()[0]!
    expect(CUBE_NETS.every((n) => fold(netCells(n)).ok)).toBe(true)
    expect(new Set(CUBE_NETS.map((n) => canon(netCells(n)))).size).toBe(11)
    expect(NOT_NETS.some((n) => fold(netCells(n)).ok)).toBe(false)
    expect(new Set(NOT_NETS.map((n) => canon(netCells(n)))).size).toBe(NOT_NETS.length)
    for (const n of [...CUBE_NETS, ...NOT_NETS]) {
      const mine = fold(netCells(n))
      const theirs = fold3(n)
      expect(mine.ok, n.join('/')).toBe(theirs.ok)
      if (mine.ok) expect(mine.opposite, n.join('/')).toEqual(theirs.opposite)
    }
  })

  it('课本 p23 做一做：① ② 能围成正方体，③ 不能；② 是三年级的表里没有的那种', () => {
    expect(BOOK_NETS.map((n) => fold(netCells(n)).ok)).toEqual([true, true, false])
  })

  it('练习六 2：春对夏、秋对冬、暮鼓对晨钟', () => {
    const cells = BELL_NET.map((x) => ({ r: x.r, c: x.c }))
    const { ok, opposite } = fold(cells)
    expect(ok).toBe(true)
    const pairs = Object.fromEntries(BELL_NET.map((x, i) => [x.w, BELL_NET[opposite[i]!]!.w]))
    expect(pairs).toMatchObject({ spring: 'summer', autumn: 'winter', drum: 'bell' })
  })

  it('换个摆法（转、翻）不改变能不能折', () => {
    for (const n of [...CUBE_NETS, ...NOT_NETS]) for (let k = 0; k < 8; k++) expect(fold(orient(netCells(n), k)).ok).toBe(fold(netCells(n)).ok)
  })
})

describe('换算的小数点：按字符移', () => {
  it('shift', () => {
    expect(shift('3.8', 3)).toBe('3800')
    expect(shift('2400', -3)).toBe('2.4')
    expect(shift('0.25', 6)).toBe('250000')
    expect(shift('36000', -6)).toBe('0.036')
    expect(shift('5.08', 0)).toBe('5.08')
  })
})

describe('长方体和正方体：从题目反推答案（150 种子 × 三档）', () => {
  it('长方体和正方体的认识', () => {
    const facts = Object.fromEntries(KNOW_FACTS.map((f) => [f.id, f.truth]))
    each(KP_KNOW, (q) => {
      const f = famOf(q)
      const { k, p } = mainText(q)
      const sig = q.id.split(':')[1]!
      switch (f) {
        case 'count': {
          const what = sig.split('-')[2] as 'faces' | 'edges' | 'vertices'
          expect(numAnswer(q), q.id).toBe({ faces: 6, edges: 12, vertices: 8 }[what])
          break
        }
        case 'fact':
          expect(keyAnswer(q), q.id).toBe(facts[sig.split('-')[1]!] ? YES : NO)
          break
        case 'groups':
          expect(numAnswer(q)).toBe(3)
          break
        case 'perGroup':
          expect(numAnswer(q)).toBe(4)
          break
        case 'see':
          expect(numAnswer(q)).toBe(3)
          break
        case 'cube8':
          expect(numAnswer(q)).toBe(8)
          break
        case 'mark':
          expect(keyAnswer(q), q.id).toBe(`m5.cube.dim.${boxOf(q)[0]!.mark}`)
          break
        case 'dim': {
          const [l, w, h] = labelNums(boxOf(q)[0]!)
          expect(new Set([l, w, h]).size).toBe(3)
          expect(numAnswer(q), q.id).toBe(k === 'm5.cube.k.heightIs' ? h : w)
          break
        }
        case 'same': {
          const OPP: Record<string, string> = { front: 'back', back: 'front', top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
          expect(keyAnswer(q), q.id).toBe(`m5.cube.f.${OPP[keyOf(p.f).split('.').pop()!]}`)
          break
        }
        case 'sides': {
          const b = boxOf(q)[0]!
          const [l, w, h] = labelNums(b)
          const want = { front: [l, h], top: [l, w], right: [w, h] }[b.face!]!
          const got = (choiceLabel(q) as unknown as { p: { a: number; b: number } }).p
          expect([got.a, got.b], q.id).toEqual(want)
          expect(keyOf(p.f), q.id).toBe(`m5.cube.f.${b.face}`)
          break
        }
        case 'pair': {
          const [l, w, h] = labelNums(boxOf(q)[0]!)
          const sides = [numP(p.a), numP(p.b)].sort((x, y) => x - y).join(',')
          const which = Object.entries({ tb: [l, w], fb: [l, h], lr: [w, h] }).find(([, s]) => [...s].sort((x, y) => x - y).join(',') === sides)![0]
          expect(keyAnswer(q), q.id).toBe(`m5.cube.fp.${which}`)
          break
        }
        case 'cubeFrame':
          expect(numAnswer(q)).toBe(12 * numP(p.a))
          break
        case 'frame':
        case 'tape':
          expect(numAnswer(q), q.id).toBe(4 * (numP(p.a) + numP(p.b) + numP(p.c)))
          break
        case 'magic':
          if (sig === 'magic-shape') expect(keyAnswer(q)).toBe('m5.cube.shape.cube')
          else expect(numAnswer(q)).toBe(6)
          break
        case 'par':
          expect(numAnswer(q)).toBe(3)
          break
        case 'perp':
          expect(numAnswer(q)).toBe(4)
          break
        case 'lights':
          // 上面 4 条 + 竖着的 4 条（地面的四边不装）
          expect(numAnswer(q), q.id).toBe(2 * (numP(p.a) + numP(p.b)) + 4 * numP(p.c))
          break
        case 'faces': {
          const [a, b, c] = [numP(p.a), numP(p.b), numP(p.c)]
          const key = (x: number, y: number): string => [x, y].sort((m, n) => m - n).join(',')
          const want = key(numP(p.x), numP(p.y))
          const n = [key(a, b), key(a, c), key(b, c)].filter((s) => s === want).length * 2
          expect(n).toBeGreaterThan(0)
          expect(numAnswer(q), q.id).toBe(n)
          // 问的是长方形：两条边不一样长
          expect(numP(p.x)).not.toBe(numP(p.y))
          break
        }
        case 'ways':
          expect(numAnswer(q), q.id).toBe(waysBrute(numP(p.n)))
          break
        case 'unit': {
          const s = q.stem.find((x) => x.kind === 'cube-solids') as Extract<StemPart, { kind: 'cube-solids' }>
          const rows = (s.items[0] as { rows: number[][] }).rows
          const [l, w, h] = [rows[0]!.length, rows.length, rows[0]![0]!]
          const x = numP(p.x)
          const y = p.y === undefined ? x : numP(p.y)
          const key = (a: number, b: number): string => [a, b].sort((m, n) => m - n).join(',')
          const n = [key(l, w), key(l, h), key(w, h)].filter((f) => f === key(x, y)).length * 2
          expect(numAnswer(q), q.id).toBe(n)
          break
        }
        case 'cubeSum':
          expect(numAnswer(q)).toBe(numP(p.s) / 12)
          break
        case 'hSum':
          expect(numAnswer(q), q.id).toBe(numP(p.s) / 4 - numP(p.a) - numP(p.b))
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('长方体和正方体的展开图', () => {
    each(KP_NET, (q) => {
      const f = famOf(q)
      switch (f) {
        case 'fold': {
          const net = q.stem.find((p): p is Net => p.kind === 'net')!
          expect(keyAnswer(q), q.id).toBe(fold(net.cells).ok ? 'm5.cube.can' : 'm5.cube.cannot')
          break
        }
        case 'pick': {
          const items = (q.stem.find((p) => p.kind === 'nets') as Extract<StemPart, { kind: 'nets' }>).items
          const not = q.id.includes('pick-not')
          const good = items.map((c, i) => [fold(c).ok === !not, i + 1] as const).filter(([x]) => x)
          expect(good, q.id).toHaveLength(1)
          expect(numAnswer(q), q.id).toBe(good[0]![1])
          expect(q.choices?.map((c) => zh(c.label)).sort() ?? ['1', '2', '3']).toEqual(['1', '2', '3'])
          break
        }
        case 'opp': {
          const net = q.stem.find((p): p is Net => p.kind === 'net')!
          const cells = net.cells.map((c) => ({ r: c.r, c: c.c }))
          const { ok, opposite } = fold(cells)
          expect(ok).toBe(true)
          const marked = net.cells.findIndex((c) => typeof c.label !== 'string')
          expect(numAnswer(q), q.id).toBe(Number(net.cells[opposite[marked]!]!.label))
          break
        }
        case 'box': {
          const net = q.stem.find((p) => p.kind === 'box-net') as Extract<StemPart, { kind: 'box-net' }>
          const { ok, opposite } = fold(net.cells.map((c) => ({ r: c.r, c: c.c })))
          expect(ok).toBe(true)
          const a = String(mainText(q).p.a)
          const i = net.cells.findIndex((c) => c.label === a)
          expect(numAnswer(q), q.id).toBe(Number(net.cells[opposite[i]!]!.label))
          // 相对的两个面一样大（长方体的展开图格子按长、宽、高画）
          const area = (j: number): number => net.colW[net.cells[j]!.c]! * net.rowH[net.cells[j]!.r]!
          for (let j = 0; j < 6; j++) expect(area(j)).toBeCloseTo(area(opposite[j]!), 6)
          break
        }
        case 'bell': {
          const w = keyOf(mainText(q).p.w).split('.').pop()!
          const i = BELL_NET.findIndex((x) => x.w === w)
          const { opposite } = fold(BELL_NET.map((x) => ({ r: x.r, c: x.c })))
          expect(keyAnswer(q), q.id).toBe(`m5.cube.w.${BELL_NET[opposite[i]!]!.w}`)
          break
        }
        case 'fact':
          expect(keyAnswer(q), q.id).toBe(q.id.endsWith('netArea') ? YES : NO)
          break
        case 'count11':
          expect(numAnswer(q)).toBe(11)
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('长方体和正方体的表面积', () => {
    each(KP_SURF, (q) => {
      const f = famOf(q)
      const { p } = mainText(q)
      const [a, b, c] = [numP(p.a), numP(p.b), numP(p.c)]
      switch (f) {
        case 'cuboid': {
          const [l, w, h] = labelNums(boxOf(q)[0]!)
          expect(numAnswer(q), q.id).toBe(surface(l, w, h))
          break
        }
        case 'cube': {
          const [l, w, h] = labelNums(boxOf(q)[0]!)
          expect(l === w && w === h).toBe(true)
          expect(numAnswer(q), q.id).toBe(6 * l * l)
          break
        }
        case 'face': {
          const box = boxOf(q)[0]!
          const [l, w, h] = labelNums(box)
          expect(numAnswer(q), q.id).toBe({ front: l * h, top: l * w, right: w * h }[box.face!])
          break
        }
        case 'define':
          expect(keyAnswer(q)).toBe('m5.cube.word.surface')
          break
        case 'wardrobe':
          // 没有底面：5 个面
          expect(close(numAnswer(q), a * b + 2 * a * c + 2 * b * c), q.id).toBe(true)
          break
        case 'fishTank':
          expect(numAnswer(q)).toBe(5 * a * a)
          break
        case 'openBox':
          expect(numAnswer(q), q.id).toBe(surface(a, b, c) - a * b)
          break
        case 'label':
          expect(numAnswer(q), q.id).toBe(2 * (a + b) * c)
          break
        case 'box94':
          expect(numAnswer(q), q.id).toBe(surface(a, b, c))
          break
        case 'gift':
          expect(close(numAnswer(q), 6 * a * a * 1.5), q.id).toBe(true)
          break
        case 'donate':
          expect(numAnswer(q)).toBe(6 * a * a)
          break
        case 'tape':
          expect(keyAnswer(q), q.id).toBe(12 * a <= numP(p.m) * 100 ? 'm5.cube.enough' : 'm5.cube.notEnough')
          break
        case 'room':
          expect(close(numAnswer(q), a * b + 2 * (a + b) * c - numP(p.d)), q.id).toBe(true)
          break
        case 'cut':
          expect(numAnswer(q)).toBe(2 * a * a)
          expect(b).toBe(2 * a)
          break
        case 'pool':
          expect(numAnswer(q), q.id).toBe(a * (a / 2) + 2 * (a + a / 2) * c)
          break
        case 'glue': {
          const n = numP(p.n)
          // 拼成一排：n 个正方体有 6n 个面，接起来的地方每处少 2 个面
          expect(numAnswer(q), q.id).toBe((6 * n - 2 * (n - 1)) * numP(p.a) ** 2)
          break
        }
        case 'double':
          expect(nOf(choiceLabel(q))).toBe(4)
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('体积和体积单位', () => {
    const fit = Object.fromEntries(VOL_FIT.map(([t, , u]) => [t, u]))
    each(KP_VUNIT, (q) => {
      const f = famOf(q)
      const { k, p } = mainText(q)
      switch (f) {
        case 'define':
          expect(keyAnswer(q)).toBe('m5.cube.word.volume')
          break
        case 'max':
        case 'min': {
          // 三样东西从大到小：洗衣机 > 电饭锅 > 手机……
          const ORDER = ['container', 'classroom', 'washer', 'fridge', 'cooker', 'schoolbag', 'chalkBox', 'phone', 'eraser', 'fingertip']
          const names = [p.a, p.b, p.c].map((x) => keyOf(x).split('.').pop()!)
          const sorted = [...names].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y))
          expect(keyAnswer(q), q.id).toBe(`m5.cube.t.${f === 'max' ? sorted[0] : sorted[2]}`)
          break
        }
        case 'edge1': {
          const u = keyOf(p.u).split('.').pop()!
          expect((choiceLabel(q) as unknown as { p: { u: { k: string } } }).p.u.k, q.id).toBe(`m5.cube.u.${u}3`)
          break
        }
        case 'kind': {
          const u = keyOf(p.u).split('.').pop()!
          expect(keyAnswer(q), q.id).toBe(`m5.cube.kind.${u.endsWith('3') ? 'vol' : u.endsWith('2') ? 'area' : 'len'}`)
          break
        }
        case 'count': {
          const s = q.stem.find((x) => x.kind === 'cube-solids') as Extract<StemPart, { kind: 'cube-solids' }>
          const rows = (s.items[0] as { rows: number[][] }).rows
          // 后排每一摞不比前排矮（顶面都看得见）
          if (rows.length === 2) rows[1]!.forEach((h, i) => expect(rows[0]![i]!, q.id).toBeGreaterThanOrEqual(h))
          expect(numAnswer(q), q.id).toBe(cubeCount(rows))
          break
        }
        case 'fit':
          expect(keyAnswer(q), q.id).toBe(`m5.cube.u.${fit[keyOf(p.thing).split('.').pop()!]}`)
          break
        case 'cmp': {
          const s = q.stem.find((x) => x.kind === 'cube-solids') as Extract<StemPart, { kind: 'cube-solids' }>
          const counts = s.items.map((x) => cubeCount((x as { rows: number[][] }).rows))
          expect(new Set(counts).size).toBe(3)
          const target = k.endsWith('pickMax') ? Math.max(...counts) : Math.min(...counts)
          expect(numAnswer(q), q.id).toBe(counts.indexOf(target) + 1)
          break
        }
        case 'stairs': {
          const s = q.stem.find((x) => x.kind === 'cube-solids') as Extract<StemPart, { kind: 'cube-solids' }>
          const rows = (s.items[0] as { rows: number[][] }).rows
          expect(numAnswer(q), q.id).toBe(cubeCount(rows))
          // 台阶能摆成一个长方体：总数是一排的整数倍
          expect(cubeCount(rows) % rows[0]!.length).toBe(0)
          break
        }
        case 'same':
          expect(keyAnswer(q)).toBe(YES)
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('长方体和正方体的体积计算', () => {
    each(KP_VOL, (q) => {
      const f = famOf(q)
      const { k, p } = mainText(q)
      const [a, b, c] = [numP(p.a), numP(p.b), numP(p.c)]
      switch (f) {
        case 'cuboid': {
          const [l, w, h] = labelNums(boxOf(q)[0]!)
          expect(numAnswer(q), q.id).toBe(l * w * h)
          break
        }
        case 'tofu':
        case 'brick':
          expect(numAnswer(q), q.id).toBe(a * b * c)
          break
        case 'cube': {
          const [l] = labelNums(boxOf(q)[0]!)
          expect(numAnswer(q), q.id).toBe(l ** 3)
          break
        }
        case 'grid': {
          const s = q.stem.find((x) => x.kind === 'cube-solids') as Extract<StemPart, { kind: 'cube-solids' }>
          expect(numAnswer(q), q.id).toBe(cubeCount((s.items[0] as { rows: number[][] }).rows))
          break
        }
        case 'how':
          expect(keyAnswer(q), q.id).toBe(
            ({ 'm5.cube.v.howCuboid': 'm5.cube.fm.lwh', 'm5.cube.v.howCube': 'm5.cube.fm.aaa', 'm5.cube.v.howBase': 'm5.cube.fm.sh', 'm5.cube.v.a3': 'm5.cube.fm.a3mul' } as Record<string, string>)[k],
          )
          break
        case 'timber':
          expect(close(numAnswer(q), a * numP(p.s)), q.id).toBe(true)
          break
        case 'base':
          expect(numAnswer(q)).toBe(numP(p.s) * numP(p.h))
          break
        case 'cube3':
        case 'sq2': {
          const expr = (q.stem[0] as { expr: string }).expr
          const m = /^(\d+)([²³]) = \?$/.exec(expr)!
          expect(numAnswer(q), q.id).toBe(Number(m[1]) ** (m[2] === '³' ? 3 : 2))
          break
        }
        case 'mix':
          expect(numAnswer(q)).toBe(numP(p.s) * numP(p.h) * 10)
          break
        case 'findH':
          expect(numAnswer(q)).toBe(numP(p.v) / numP(p.s))
          break
        case 'findS':
          expect(numAnswer(q)).toBe(numP(p.v) / numP(p.h))
          break
        case 'pit':
          expect(numAnswer(q), q.id).toBe((a * b * c) / 100)
          break
        case 'sumEq': {
          const e = (a + b + c) / 3
          expect(Number.isInteger(e)).toBe(true)
          expect(new Set([a, b, c]).size).toBe(3)
          expect(numAnswer(q), q.id).toBe(e ** 3)
          break
        }
        case 'double':
          expect(nOf(choiceLabel(q))).toBe(8)
          break
        case 'wall':
          expect(numAnswer(q), q.id).toBe(Math.round(((a * 100) / 3) * ((b * 100) / 3) * (c / 3)))
          break
        case 'tea':
          expect(numAnswer(q)).toBe(6)
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('体积单位间的进率', () => {
    each(KP_RATE, (q) => {
      const f = famOf(q)
      const { p } = mainText(q)
      switch (f) {
        case 'base':
        case 'conv': {
          const want = (numP(p.a) * BASE[keyOf(p.ua)]!) / BASE[keyOf(p.ub)]!
          expect(close(numAnswer(q), want), q.id).toBe(true)
          break
        }
        case 'rate':
          expect(zh(choiceLabel(q)), q.id).toBe({ len: '10', area: '100', vol: '1000' }[keyOf(p.kind).split('.').pop()!])
          break
        case 'milk': {
          const [l, w, h] = labelNums(boxOf(q)[0]!)
          const to = keyOf(p.u)
          expect(close(numAnswer(q), (l * w * h) / BASE[to]!), q.id).toBe(true)
          break
        }
        case 'odd': {
          const vals = q.choices!.map((ch) => {
            const l = ch.label as unknown as { p: { n: string; u: { k: string } } }
            return Number(l.p.n) * BASE[l.p.u.k]!
          })
          const id = (q.answer as { choiceId: string }).choiceId
          const odd = q.choices!.findIndex((ch) => ch.id === id)
          const others = vals.filter((_, i) => i !== odd)
          expect(others.every((v) => close(v, others[0]!)), q.id).toBe(true)
          expect(close(vals[odd]!, others[0]!), q.id).toBe(false)
          break
        }
        case 'inside':
          expect(close(numAnswer(q), (numP(p.v) * 1000) / (numP(p.a) * numP(p.b))), q.id).toBe(true)
          break
        case 'sand':
          expect(close(numAnswer(q), numP(p.v) / (numP(p.a) * (numP(p.b) / 10))), q.id).toBe(true)
          break
        case 'bricks':
          expect(close(numAnswer(q), numP(p.a) * (numP(p.t) / 100) * numP(p.h) * numP(p.k)), q.id).toBe(true)
          break
        case 'tank': {
          const [a, w, h] = [numP(p.a), numP(p.b) / 100, numP(p.c)]
          expect(close(nOf(choiceLabel(q)), a * w + 2 * a * h + 2 * w * h), q.id).toBe(true)
          break
        }
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('容积和容积单位', () => {
    const facts = Object.fromEntries(CAP_FACTS)
    const fit = Object.fromEntries(CAP_FIT.map(([t, , u]) => [t, u]))
    each(KP_CAP, (q) => {
      const f = famOf(q)
      const { p } = mainText(q)
      const [a, b, c] = [numP(p.a), numP(p.b), numP(p.c)]
      switch (f) {
        case 'define':
          expect(keyAnswer(q)).toBe('m5.cube.word.capacity')
          break
        case 'fact':
          expect(keyAnswer(q), q.id).toBe(facts[q.id.split('-').pop()!] ? YES : NO)
          break
        case 'conv': {
          const want = (a * BASE[keyOf(p.ua)]!) / BASE[keyOf(p.ub)]!
          expect(close(numAnswer(q), want), q.id).toBe(true)
          break
        }
        case 'fit':
          expect(keyAnswer(q), q.id).toBe(`m5.cube.u.${fit[keyOf(p.thing).split('.').pop()!]}`)
          break
        case 'tank':
          // 1 立方分米 = 1 升
          expect(numAnswer(q), q.id).toBe(a * b * c)
          break
        case 'cup':
          expect(zh(choiceLabel(q))).toBe('200 毫升')
          break
        case 'bottles':
          expect(numAnswer(q), q.id).toBe((a * 1000) / b)
          break
        case 'pool':
        case 'truck':
          expect(close(numAnswer(q), a * b * c), q.id).toBe(true)
          break
        case 'oven':
          expect(close(numAnswer(q), (a * b * c) / 1e6), q.id).toBe(true)
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('不规则物体的体积', () => {
    const drain = Object.fromEntries(DRAIN_FACTS)
    each(KP_IRR, (q) => {
      const f = famOf(q)
      const { p } = mainText(q)
      switch (f) {
        case 'beaker': {
          const bk = q.stem.find((x) => x.kind === 'beaker') as Extract<StemPart, { kind: 'beaker' }>
          const [before, after] = bk.items
          expect(before!.thing).toBeUndefined()
          expect(after!.thing).toBeDefined()
          // 放进去以前也至少有 max 的 30%：东西整个沉在水里；放进去以后不超过刻度
          expect(before!.water / bk.max).toBeGreaterThanOrEqual(0.3)
          expect(after!.water).toBeLessThanOrEqual(bk.max * 0.9)
          expect(numAnswer(q), q.id).toBe(after!.water - before!.water)
          break
        }
        case 'clay':
          expect(numAnswer(q), q.id).toBe(numP(p.a) * numP(p.b) * numP(p.c))
          break
        case 'drain':
          expect(keyAnswer(q), q.id).toBe(drain[keyOf(p.t).split('.').pop()!] ? YES : NO)
          break
        case 'coral': {
          const [before, after] = boxOf(q)
          expect(before!.stone).toBe(true)
          expect(after!.stone).toBeFalsy()
          expect(Number(before!.depth)).toBe(before!.water)
          expect(before!.water!).toBeLessThan(before!.h)
          const [l, w] = [Number(before!.labels!.l), Number(before!.labels!.w)]
          expect(numAnswer(q), q.id).toBe(l * w * (before!.water! - after!.water!))
          break
        }
        case 'rise':
          expect(close(numAnswer(q), (numP(p.s) * numP(p.r)) / 10), q.id).toBe(true)
          break
        case 'riseCm':
          expect(numAnswer(q)).toBe(numP(p.s) * numP(p.r))
          break
        case 'pillar':
          // 石柱比水池深：只有水池那么深的一段在水里
          expect(numP(p.z)).toBeGreaterThan(numP(p.c))
          expect(numAnswer(q), q.id).toBe(2 * numP(p.x) * numP(p.y) * numP(p.c))
          break
        case 'balls': {
          const small = (numP(p.y) - numP(p.x)) / 3
          expect(numAnswer(q), q.id).toBe(numP(p.x) - small)
          break
        }
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })
})

describe('课本的例题与做一做都在第 1 档出得到（G12）', () => {
  const FIRST: Record<string, string[]> = {
    // 例 1 面棱顶点、例 2 棱分组 / 长宽高 / 最多看到几个面、例 3 正方体、做一做搭 8 个、练习五 1、2、4
    [KP_KNOW]: ['count', 'fact', 'groups', 'perGroup', 'see', 'mark', 'dim', 'same', 'sides', 'frame', 'tape', 'cubeFrame', 'cube8', 'magic'],
    // 做一做：哪些能围成正方体（课本的三个）、标明 6 个面（改成找相对的面）、长方体展开图
    [KP_NET]: ['fold', 'pick', 'opp', 'box'],
    // 例 1 长方体 / 正方体、填空的每个面、做一做衣柜没有底面
    [KP_SURF]: ['cuboid', 'cube', 'face', 'define', 'wardrobe', 'openBox', 'fishTank', 'label'],
    // 体积的意义、比大小、体积单位、做一做 1、2、合适的单位
    [KP_VUNIT]: ['define', 'max', 'min', 'edge1', 'kind', 'count', 'fit'],
    // 例 1、公式、底面积、做一做豆腐和木料
    [KP_VOL]: ['cuboid', 'cube', 'grid', 'how', 'base', 'timber', 'tofu'],
    // 例 2、例 3、例 4、做一做 1
    [KP_RATE]: ['base', 'rate', 'conv', 'milk'],
    // 容积、升和毫升、合适的单位、例 5、做一做
    [KP_CAP]: ['define', 'fact', 'conv', 'fit', 'tank', 'cup'],
    // 例 6 排水法、橡皮泥、回顾与反思
    [KP_IRR]: ['beaker', 'clay', 'drain'],
  }
  for (const kp of KPS) {
    it(kp, () => {
      const seen = new Set<string>()
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 400; seed++) seen.add(famOf(gen(1, createRng(seed))))
      for (const f of FIRST[kp]!) expect(seen.has(f), `${kp} 第 1 档没有 ${f}`).toBe(true)
    })
  }

  it('第 1 档出得到课本 p23 做一做的三个展开图（一起出、只有 ③ 不能）', () => {
    const gen = getGenerator(KP_NET)!
    const book = BOOK_NETS.map((n) => netCells(n).map((x) => `${x.r}${x.c}`).join('.')).sort().join('|')
    let found = false
    for (let seed = 1; seed <= 400 && !found; seed++) {
      const q = gen(1, createRng(seed))
      const s = q.stem.find((x) => x.kind === 'nets') as Extract<StemPart, { kind: 'nets' }> | undefined
      if (s && s.items.map((c) => c.map((x) => `${x.r}${x.c}`).join('.')).sort().join('|') === book) found = true
    }
    expect(found).toBe(true)
  })
})

describe('朗读与用词', () => {
  it('「长」只在长度、长方形、长方体、棱长、边长、长城里；单独的「长」只有这几条概念题', () => {
    const ALLOWED = /长度|长方形|长方体|棱长|边长|长城/g
    const bad = Object.entries(ZH)
      .filter(([, v]) => typeof v === 'string' && v.replace(ALLOWED, '').includes('长'))
      .map(([k]) => k)
      .sort()
    expect(bad).toEqual(['m5.cube.dim.l', 'm5.cube.fm.edgeSum', 'm5.cube.fm.lwh', 'm5.cube.fm.surface', 'm5.cube.k.s.cubeIsCuboid'])
  })

  it('不写容易读错的多音字：量（测量除外）、为、盛、浸、露、着、铺、倒、粘、只、重、数（数据、个数除外）', () => {
    for (const [k, v] of Object.entries(ZH)) {
      if (typeof v !== 'string') continue
      const s = v.replace(/测量|数据|个数/g, '')
      expect(s, k).not.toMatch(/[量为盛浸露着铺倒粘只重数]/)
    }
  })

  it('题目里没有括号（会读出「括号」）；公式选项照课本写的除外', () => {
    for (const [k, v] of Object.entries(ZH)) {
      if (typeof v !== 'string' || k.startsWith('m5.cube.fm.')) continue
      expect(v, k).not.toMatch(/[()（）]/)
    }
  })

  it('小数从小池子里取：每个知识点不同的小数不超过 120 个', () => {
    for (const kp of KPS) {
      const decs = new Set<string>()
      each(kp, (q) => {
        const grab = (s: string): void => {
          for (const m of s.matchAll(/\d+\.\d+/g)) decs.add(m[0])
        }
        for (const part of q.stem) if (part.kind === 'text') grab(zh(part.text))
        for (const ch of q.choices ?? []) grab(zh(ch.label))
      })
      expect(decs.size, kp).toBeLessThanOrEqual(120)
    }
  })
})
