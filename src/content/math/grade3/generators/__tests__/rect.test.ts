import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'
import { cellPerimeter, orient, polyomino } from '../rect'

// 长方形和正方形（三下三）的专项检查：答案都从题目本身（图上的顶点、边上标的数、方格，题干的参数）重新推一遍。
// 三个知识点按课本小节：多边形（含长方形和正方形的特点）、周长（含长方形和正方形的周长）、拼图游戏。

const SEEDS = 150
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
type Geo = Extract<StemPart, { kind: 'geo' }>
type Poly = Extract<GeoItem, { t: 'poly' }>
type Grid = Extract<GeoItem, { t: 'grid' }>
const geoOf = (q: Question): Geo => q.stem.find((p): p is Geo => p.kind === 'geo')!
const textKey = (q: Question, i = 0): string => {
  const t = q.stem.filter((p) => p.kind === 'text')[i] as { text: LStr }
  return typeof t.text === 'string' ? t.text : t.text.k
}
const textParams = (q: Question, i = 0): Record<string, number | LStr> => {
  const t = q.stem.filter((p) => p.kind === 'text')[i] as { text: LStr }
  return typeof t.text === 'string' ? {} : ((t.text.p ?? {}) as Record<string, number | LStr>)
}
const num = (q: Question, k: string): number => textParams(q)[k] as number
const answer = (q: Question): string => {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return labelKey(q.choices!.find((c) => c.id === id)!.label)
}
const value = (q: Question): number => Number(answer(q))
/** 第 1 档出得到的题型（签名开头的那一段） */
function firstTierKinds(kpId: string, seeds = 400): Set<string> {
  const gen = getGenerator(kpId)!
  const out = new Set<string>()
  for (let seed = 1; seed <= seeds; seed++) {
    const q = gen(1, createRng(seed))
    const s = sigOf(q)
    out.add(s.split('-')[0]!)
  }
  return out
}
const key = (k: string): string => labelKey({ k })
const polysOf = (fig: GeoFig): Poly[] => fig.items.filter((it): it is Poly => it.t === 'poly')
const gridOf = (fig: GeoFig): Grid => fig.items.find((it): it is Grid => it.t === 'grid')!
const dist = (a: GeoPt, b: GeoPt): number => Math.hypot(a[0] - b[0], a[1] - b[1])
const edges = (pts: GeoPt[]): number[] => pts.map((p, i) => dist(p, pts[(i + 1) % pts.length]!))
const labelNums = (p: Poly): number[] => (p.labels ?? []).filter((x): x is string => !!x && x !== '?').map(Number)
function interior(pts: GeoPt[]): number[] {
  return pts.map((v, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length]!
    const b = pts[(i + 1) % pts.length]!
    const ua = [a[0] - v[0], a[1] - v[1]]
    const ub = [b[0] - v[0], b[1] - v[1]]
    const cos = (ua[0]! * ub[0]! + ua[1]! * ub[1]!) / (Math.hypot(ua[0]!, ua[1]!) * Math.hypot(ub[0]!, ub[1]!))
    return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
  })
}
/** 格子拼成的图形的周长（独立再算一遍：每个格子四条边，和别的格子挨着的边不算） */
function perimOfCells(cells: GeoPt[]): number {
  let n = 0
  for (const [c, r] of cells)
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const)
      if (!cells.some(([x, y]) => x === c + dc && y === r + dr)) n++
  return n
}
/** 格子是不是边挨着边连成一片 */
function edgeConnected(cells: GeoPt[]): boolean {
  const seen = new Set([0])
  const queue = [0]
  while (queue.length) {
    const i = queue.shift()!
    cells.forEach((c, j) => {
      if (!seen.has(j) && Math.abs(c[0] - cells[i]![0]) + Math.abs(c[1] - cells[i]![1]) === 1) {
        seen.add(j)
        queue.push(j)
      }
    })
  }
  return seen.size === cells.length
}
/** 顺次连起来的多边形有没有自己和自己交叉（不相邻的两条边相交） */
function selfIntersects(pts: GeoPt[]): boolean {
  const n = pts.length
  const cross = (o: GeoPt, a: GeoPt, b: GeoPt): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue
      const [a, b, c, d] = [pts[i]!, pts[(i + 1) % n]!, pts[j]!, pts[(j + 1) % n]!]
      if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return true
    }
  return false
}

describe('几何图的小工具（格子）', () => {
  it('随手长的格子图形连成一片、不超出外框，周长两种算法一致', () => {
    for (let s = 1; s <= 200; s++) {
      const n = 3 + (s % 10)
      const cells = polyomino(n, createRng(s), 6, 4)
      expect(cells).toHaveLength(n)
      expect(new Set(cells.map((c) => c.join())).size).toBe(n)
      expect(edgeConnected(cells)).toBe(true)
      expect(Math.max(...cells.map((c) => c[0]))).toBeLessThan(6)
      expect(Math.max(...cells.map((c) => c[1]))).toBeLessThan(4)
      expect(cellPerimeter(cells)).toBe(perimOfCells(cells))
    }
  })
})

describe('多边形', () => {
  const KP = 'm3s2-03-polygons'

  it('这是几边形 / 有几条边、几个角：数图上多边形的顶点；多边形不自己交叉，随手画的是凸的', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!/^(name|count|concave)-/.test(s)) return
      n++
      const pts = polysOf(geoOf(q).figs[0]!)[0]!.pts
      expect(selfIntersects(pts), q.id).toBe(false)
      if (s.startsWith('count')) expect(value(q)).toBe(pts.length)
      else expect(answer(q)).toBe(key(`m3.rect.p${pts.length}`))
      if (!s.startsWith('concave')) expect(interior(pts).every((a) => a < 157)).toBe(true)
    })
    expect(n).toBeGreaterThan(100)
  })

  it('不看图的：几边形有几个角、几条边的多边形有几个角', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('text-name')) expect(value(q)).toBe(Number((textParams(q).name as { k: string }).k.replace('m3.rect.p', '')))
      if (s.startsWith('text-sides')) expect(value(q)).toBe(num(q, 'n'))
      if (s === 'fact-same') expect(answer(q)).toBe(key('m3.rect.sameMany'))
      if (s === 'fact-made') expect(answer(q)).toBe(key('m3.line.segment'))
    })
  })

  it('哪一个不是多边形：只有一幅图有弯的边，就是它', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('notpoly-')) return
      const curvy = geoOf(q).figs.map((f) => f.items.some((it) => it.t === 'curve'))
      expect(curvy.filter(Boolean)).toHaveLength(1)
      expect(value(q)).toBe(curvy.indexOf(true) + 1)
    })
  })

  it('哪一个是正多边形：只有一幅每条边一样长，另外两幅的边明显不一样长', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('reg-') || sigOf(q) === 'reg-fact') return
      n++
      const ratios = geoOf(q).figs.map((f) => {
        const e = edges(polysOf(f)[0]!.pts)
        return Math.max(...e) / Math.min(...e)
      })
      const regular = ratios.map((r) => r < 1.02)
      expect(regular.filter(Boolean)).toHaveLength(1)
      expect(value(q)).toBe(regular.indexOf(true) + 1)
      for (const r of ratios) if (r >= 1.02) expect(r).toBeGreaterThanOrEqual(1.4)
    })
    expect(n).toBeGreaterThan(20)
  })
})

describe('多边形：例 1 长方形和正方形的特点、做一做 3 / 4', () => {
  const KP = 'm3s2-03-polygons'

  it('标问号的边：长方形等于它对面那条边，正方形等于标出的那条边', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('opp-') && !s.startsWith('sq-')) return
      n++
      const p = polysOf(geoOf(q).figs[0]!)[0]!
      const labels = p.labels!
      const at = labels.indexOf('?')
      expect(at).toBeGreaterThanOrEqual(0)
      if (s.startsWith('opp-')) {
        expect(value(q)).toBe(Number(labels[(at + 2) % 4]))
        // 长方形的长（上下的边）比宽长，图上也是横着的边更长
        const e = edges(p.pts)
        expect(e[0]).toBeGreaterThan(e[1]!)
      } else expect(value(q)).toBe(labelNums(p)[0])
    })
    expect(n).toBeGreaterThan(40)
  })

  it('是长方形 / 是正方形，对吗：看图上的角是不是都是直角、边是不是都一样长；判断题配「对 / 不对」', () => {
    let n = 0
    each(KP, (q) => {
      if (!sigOf(q).startsWith('is-')) return
      n++
      const pts = polysOf(geoOf(q).figs[0]!)[0]!.pts
      const rights = pts.length === 4 && interior(pts).every((a) => Math.abs(a - 90) < 0.5)
      const e = edges(pts)
      const equal = Math.max(...e) - Math.min(...e) < 0.5
      const yes = textKey(q) === 'm3.rect.isSq' ? rights && equal : rights
      expect(answer(q)).toBe(key(yes ? 'm3.rect.yes' : 'm3.rect.no'))
      expect(translate({ k: textKey(q) }, 'zh')).toMatch(/，对吗？$/)
    })
    expect(n).toBeGreaterThan(20)
  })

  it('折出最大的正方形：边长是长方形的宽（标出的两个数里小的那个）；边长与宽相等', () => {
    let n = 0
    each(KP, (q) => {
      if (sigOf(q) === 'foldeq') {
        n++
        expect(answer(q)).toBe(key('m3.rect.equal'))
      }
      if (!sigOf(q).startsWith('fold-')) return
      const [a, b] = labelNums(polysOf(geoOf(q).figs[0]!)[0]!)
      expect(value(q)).toBe(Math.min(a!, b!))
      expect(a).not.toBe(b)
    })
    expect(n).toBeGreaterThan(2)
  })

  it('特点与名称；课本没教梯形，选项里没有', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('cnt-')) expect(value(q)).toBe(4)
      if (s === 'feat-rect') expect(answer(q)).toBe(key('m3.rect.equal'))
      if (s === 'feat-sq') expect(answer(q)).toBe(key('m3.rect.allEqual'))
      if (s === 'which-sq') expect(answer(q)).toBe(key('m3.rect.square'))
      if (s === 'which-rect') {
        expect(answer(q)).toBe(key('m3.rect.rect'))
        // 不拿正方形当「对边相等、4 个直角」的干扰项（正方形也符合）
        expect(q.choices!.map((c) => labelKey(c.label))).not.toContain(key('m3.rect.square'))
      }
      for (const c of q.choices ?? []) expect(translate(c.label, 'zh')).not.toContain('梯形')
    })
  })

  it('第 1 档：分一分、边和角一样多、例 1 的特点、做一做 3 填边长、做一做 4 折正方形都出得到', () => {
    const kinds = firstTierKinds(KP)
    for (const k of ['name', 'count', 'fact', 'opp', 'sq', 'cnt', 'feat', 'fold', 'foldeq']) expect(kinds, k).toContain(k)
  })
})

describe('拼图游戏', () => {
  const KP = 'm3s2-03-puzzle'
  const isTetro = (cells: GeoPt[]): boolean => cells.length === 4 && edgeConnected(cells)
  /** 转一转、翻一翻以后最小的写法：同一种四连方写出来一样 */
  const canon = (cells: GeoPt[]): string =>
    [0, 1, 2, 3]
      .flatMap((k) => [orient(cells, k, false), orient(cells, k, true)])
      .map((c) => c.map((p) => p.join('.')).join('_'))
      .sort()[0]!

  it('四连方：答案那幅是 4 个边挨着边的正方形，别的都不是；能拼出 5 种', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (s === 'tetro-count') expect(value(q)).toBe(5)
      if (!s.startsWith('tetro-') || s === 'tetro-count') return
      n++
      const ok = geoOf(q).figs.map((f) => isTetro(gridOf(f).cells!))
      expect(ok.filter(Boolean)).toHaveLength(1)
      expect(value(q)).toBe(ok.indexOf(true) + 1)
    })
    expect(n).toBeGreaterThan(20)
  })

  it('是四连方，对吗：按图上的格子判断；边和边重合的拼法：答案那幅连成一片、另一幅有角碰角', () => {
    let judge = 0
    let edge = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('judge-')) {
        judge++
        expect(answer(q)).toBe(key(isTetro(gridOf(geoOf(q).figs[0]!).cells!) ? 'm3.rect.yes' : 'm3.rect.no'))
      }
      if (s.startsWith('edge-')) {
        edge++
        const ok = geoOf(q).figs.map((f) => edgeConnected(gridOf(f).cells!))
        expect(ok.filter(Boolean)).toHaveLength(1)
        expect(value(q)).toBe(ok.indexOf(true) + 1)
        // 另一幅也是同样多的格子，只是有一处角碰角
        const [a, b] = geoOf(q).figs.map((f) => gridOf(f).cells!.length)
        expect(a).toBe(b)
      }
    })
    expect(judge).toBeGreaterThan(30)
    expect(edge).toBeGreaterThan(10)
  })

  it('拼长方形 / 正方形：要用的个数 = 小方格数 ÷ 4；拼好的图每块都是四连方、不重叠、正好铺满', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('tile-')) {
        n++
        const g = gridOf(geoOf(q).figs[0]!)
        expect((g.w * g.h) % 4).toBe(0)
        expect(value(q)).toBe((g.w * g.h) / 4)
      }
      if (s.startsWith('tiled-') || s.startsWith('sqmore-')) {
        const fig = geoOf(q).figs[0]!
        const pieces = fig.items.map((it) => (it as Grid).cells!)
        for (const p of pieces) expect(isTetro(p), q.id).toBe(true)
        const all = pieces.flat().map((c) => c.join())
        expect(new Set(all).size).toBe(all.length)
        expect(all.length).toBe(fig.w * fig.h)
        if (s.startsWith('tiled-')) expect(value(q)).toBe(pieces.length)
        else expect(value(q)).toBe(2)
      }
      if (s === 'sqside-4') expect(value(q)).toBe(4)
    })
    expect(n).toBeGreaterThan(30)
  })

  it('四连方的周长：按图上的格子数；哪一个不是同一种：只有它转一转、翻一翻和别的对不上', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('tperim-')) expect(value(q)).toBe(perimOfCells(gridOf(geoOf(q).figs[0]!).cells!))
      if (s.startsWith('odd-')) {
        const forms = geoOf(q).figs.map((f) => canon(gridOf(f).cells!))
        const odd = forms.map((f) => forms.filter((g) => g === f).length === 1)
        expect(odd.filter(Boolean)).toHaveLength(1)
        expect(value(q)).toBe(odd.indexOf(true) + 1)
      }
    })
  })

  it('第 1 档：能拼几种、哪个是四连方、对不对、边和边重合、拼长方形和正方形都出得到', () => {
    const kinds = firstTierKinds(KP)
    for (const k of ['tetro', 'judge', 'edge', 'tile', 'tiled', 'sqmore', 'sqside']) expect(kinds, k).toContain(k)
  })
})

describe('周长', () => {
  const KP = 'm3s2-03-perimeter'

  it('各边标了长度的多边形：周长 = 各边相加；三角形按标的三条边画（比例对得上）', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!/^(tri|poly|park)-/.test(s)) return
      n++
      const p = polysOf(geoOf(q).figs[0]!)[0]!
      const nums = labelNums(p)
      expect(nums).toHaveLength(p.pts.length)
      expect(value(q)).toBe(nums.reduce((x, y) => x + y, 0))
      if (s.startsWith('tri-')) {
        const e = edges(p.pts)
        const k = e.map((len, i) => len / nums[i]!)
        expect(Math.max(...k) / Math.min(...k)).toBeLessThan(1.02)
      }
    })
    expect(n).toBeGreaterThan(40)
  })

  it('正多边形：边长 × 边数（图上每条边一样长，只标一条）', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('reg-')) return
      const p = polysOf(geoOf(q).figs[0]!)[0]!
      const e = edges(p.pts)
      expect(Math.max(...e) - Math.min(...e)).toBeLessThan(0.5)
      expect(labelNums(p)).toHaveLength(1)
      expect(value(q)).toBe(labelNums(p)[0]! * p.pts.length)
      expect(num(q, 'a')).toBe(labelNums(p)[0])
    })
  })

  it('方格纸上数周长、比周长：按图上的格子重新数', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('grid-')) expect(value(q)).toBe(perimOfCells(gridOf(geoOf(q).figs[0]!).cells!))
      if (!s.startsWith('cmp-')) return
      n++
      if (s.startsWith('cmp-split')) {
        expect(answer(q)).toBe(key('m3.rect.sameLen'))
        return
      }
      const [p1, p2] = geoOf(q).figs.map((f) => perimOfCells(gridOf(f).cells!)) as [number, number]
      expect(answer(q)).toBe(p1 === p2 ? key('m3.rect.sameLen') : labelKey(p1 > p2 ? '1' : '2'))
    })
    expect(n).toBeGreaterThan(30)
  })

  it('周长的意思、求法', () => {
    each(KP, (q) => {
      if (sigOf(q) === 'def') expect(answer(q)).toBe(key('m3.rect.perimeter'))
      if (sigOf(q) === 'how') expect(answer(q)).toBe(key('m3.rect.add'))
    })
  })
})

describe('周长：例 2 长方形和正方形的周长、例 3 怎样拼周长最短、练习九 / 十', () => {
  const KP = 'm3s2-03-perimeter'

  it('看图求周长：长方形 (长 + 宽) × 2，正方形边长 × 4', () => {
    let n = 0
    each(KP, (q, d) => {
      const s = sigOf(q)
      if (!s.startsWith('rectfig-') && !s.startsWith('sqfig-')) return
      n++
      const nums = labelNums(polysOf(geoOf(q).figs[0]!)[0]!)
      if (s.startsWith('sqfig-')) expect(value(q)).toBe(4 * nums[0]!)
      else {
        expect(nums).toHaveLength(2)
        expect(value(q)).toBe(2 * (nums[0]! + nums[1]!))
      }
      if (d === 1) for (const x of nums) expect(x).toBeLessThanOrEqual(30)
    })
    expect(n).toBeGreaterThan(30)
  })

  it('围法、铁丝（练习九 13、14）：按题目里的数重算', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('rope-')) {
        n++
        const half = num(q, 'p') / 2
        let ways = 0
        for (let w = 1; w < half - w; w++) ways++
        expect(half % 2).toBe(1) // 围不成正方形，不用争正方形算不算
        expect(value(q)).toBe(ways)
      }
      if (s.startsWith('wire-')) {
        n++
        const each = num(q, 'p') / 2
        const k = textKey(q)
        if (k === 'm3.rect.wireSq') expect(value(q)).toBe(each / 4)
        else {
          const wide = each / 2 / 3
          expect(Number.isInteger(wide)).toBe(true)
          expect(value(q)).toBe(k === 'm3.rect.wireLong' ? 2 * wide : wide)
        }
      }
    })
    expect(n).toBeGreaterThan(5)
  })

  it('文字题按题目里的数重算', () => {
    const f: Record<string, (p: Record<string, number>) => number> = {
      'm3.rect.wBed': (p) => 2 * (p.a! + p.b!),
      'm3.rect.wHanky': (p) => 4 * p.a!,
      'm3.rect.wCourt': (p) => 2 * (p.a! + p.b!),
      'm3.rect.wBook': (p) => 2 * (p.a! + p.b!),
      'm3.rect.wTable': (p) => p.p! / 4,
      'm3.rect.wDesk': (p) => p.p! / 2 - p.a!,
      'm3.rect.wBoard': (p) => p.p! / 2 - p.b!,
      'm3.rect.wTimes': (p) => 2 * (p.b! + p.k! * p.b!),
      'm3.rect.wFence': (p) => 2 * (p.a! + p.b!),
      'm3.rect.wWall': (p) => p.a! + 2 * p.b!,
      'm3.rect.twoSqOne': (p) => 2 * p.a!,
      'm3.rect.twoSqAll': (p) => 3 * p.a!,
      'm3.rect.pinwheel': (p) => p.p! / 2,
      'm3.rect.combo': (p) => p.p1! + p.p2! - 2 * (p.p2! / 4),
    }
    const seen = new Set<string>()
    const gen = getGenerator(KP)!
    for (let seed = 1; seed <= 600; seed++)
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const k = textKey(q)
        if (!(k in f)) continue
        seen.add(k)
        const p = textParams(q) as Record<string, number>
        expect(value(q), q.id).toBe(f[k]!(p))
        // 长比宽长、宽不是 0
        if ('a' in p && 'b' in p) expect(p.a).toBeGreaterThan(p.b!)
      }
    expect([...seen].sort()).toEqual(Object.keys(f).sort())
  })

  it('拼成的图形：按图上的小正方形算周长；拼法里周长最短的是最接近正方形的那种', () => {
    each(KP, (q) => {
      const s = sigOf(q)
      if (s.startsWith('tiles-')) {
        const cells = gridOf(geoOf(q).figs[0]!).cells!
        expect(num(q, 'n')).toBe(cells.length)
        expect(value(q)).toBe(perimOfCells(cells) * num(q, 's'))
      }
      if (s.startsWith('best-')) {
        const per = geoOf(q).figs.map((f) => perimOfCells(gridOf(f).cells!))
        const min = Math.min(...per)
        expect(per.filter((x) => x === min)).toHaveLength(1)
        expect(value(q)).toBe(per.indexOf(min) + 1)
        for (const f of geoOf(q).figs) expect(gridOf(f).cells!.length).toBe(num(q, 'n'))
      }
      // 拼出什么形周长最短：张数能排成正方形的（16、36），答案是正方形
      if (s.startsWith('bestshape-')) {
        expect(Number.isInteger(Math.sqrt(num(q, 'n')))).toBe(true)
        expect(answer(q)).toBe(key('m3.rect.square'))
      }
    })
  })

  it('组合图形的周长：量图上多边形的周长（按底边标的数换算比例）', () => {
    let n = 0
    each(KP, (q) => {
      const s = sigOf(q)
      if (!s.startsWith('notch-') && !s.startsWith('step-')) return
      n++
      const p = polysOf(geoOf(q).figs[0]!)[0]!
      const e = edges(p.pts)
      const bottom = p.labels!.findIndex((x, i) => !!x && Math.abs(p.pts[i]![1] - p.pts[(i + 1) % p.pts.length]![1]) < 0.01 && p.pts[i]![0] > p.pts[(i + 1) % p.pts.length]![0])
      const k = e[bottom]! / Number(p.labels![bottom])
      const total = e.reduce((x, y) => x + y, 0) / k
      expect(Math.abs(total - value(q))).toBeLessThan(1)
      // 标出的数够算：每一条标了数的边，图上的长度和标的数成比例
      p.labels!.forEach((x, i) => {
        if (x) expect(Math.abs(e[i]! / k - Number(x))).toBeLessThan(0.6)
      })
    })
    expect(n).toBeGreaterThan(20)
  })

  it('公式选项：长方形 (长 + 宽) × 2，正方形边长 × 4；干扰项不用下一单元的面积公式', () => {
    each(KP, (q) => {
      if (!sigOf(q).startsWith('formula-')) return
      if (sigOf(q) === 'formula-rect') expect(answer(q)).toBe(key('m3.rect.fRectP'))
      if (sigOf(q) === 'formula-sq') expect(answer(q)).toBe(key('m3.rect.fSq4'))
      const shown = q.choices!.map((c) => translate(c.label, 'zh'))
      for (const area of ['长 × 宽', '边长 × 边长', '长 + 宽']) expect(shown).not.toContain(area)
    })
  })

  it('第 1 档：周长的意思、量出各边相加（含飞镖形）、例 2 看图算与公式、花坛、例 3 拼成周长最短都出得到', () => {
    const kinds = firstTierKinds(KP)
    for (const k of ['def', 'how', 'tri', 'poly', 'rectfig', 'sqfig', 'formula', 'm3.rect.wBed', 'best']) expect(kinds, k).toContain(k)
    const gen = getGenerator(KP)!
    let dart = 0
    for (let seed = 1; seed <= 400; seed++) if (sigOf(gen(1, createRng(seed))).startsWith('poly-dart')) dart++
    expect(dart).toBeGreaterThan(3)
  })
})

describe('长方形和正方形：图和文字', () => {
  it('图里没有汉字、坐标都是有限的数，标在边上的只有数和问号；中英文选项都翻译了', () => {
    for (const kp of ['m3s2-03-polygons', 'm3s2-03-perimeter', 'm3s2-03-puzzle']) {
      each(kp, (q) => {
        for (const part of q.stem) {
          if (part.kind !== 'geo') continue
          expect(part.alt.length).toBeGreaterThan(2)
          for (const fig of part.figs)
            for (const it of fig.items) {
              expect(JSON.stringify(it), q.id).not.toMatch(/\p{Script=Han}/u)
              const pts: GeoPt[] = it.t === 'poly' || it.t === 'curve' ? it.pts : it.t === 'line' ? [it.a, it.b] : it.t === 'dot' || it.t === 'text' ? [it.at] : it.t === 'grid' ? (it.cells ?? []) : [it.at, it.a, it.b]
              for (const p of pts) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), q.id).toBe(true)
              if (it.t === 'poly') for (const l of it.labels ?? []) if (l) expect(l).toMatch(/^(\d+|\?)$/)
            }
        }
        for (const lang of ['zh', 'en'] as const) for (const c of q.choices ?? []) expect(translate(c.label, lang)).not.toMatch(/m3\./)
      })
    }
  })

  it('图的说明（静态页会印出来）不写答案：不点名几边形、不说哪一个是、不出「梯形」', () => {
    for (const kp of ['m3s2-03-polygons', 'm3s2-03-perimeter', 'm3s2-03-puzzle']) {
      each(kp, (q) => {
        const geo = q.stem.find((p): p is Geo => p.kind === 'geo')
        if (!geo) return
        const s = sigOf(q)
        expect(geo.alt, q.id).not.toContain('梯形')
        if (/^(name|count|concave)-/.test(s)) expect(geo.alt, q.id).not.toMatch(/[三四五六七八]边形|三角形/)
        // 选几号的题：说明里不出「几号」「四连方」这种点名的话
        if (/^(notpoly|reg|tetro|odd|edge)-/.test(s)) expect(geo.alt, q.id).not.toMatch(/\d：|\d 号/)
        if (s.startsWith('tetro-') || s.startsWith('judge-')) expect(geo.alt, q.id).not.toContain('四连方')
        if (s.startsWith('opp-') || s.startsWith('fold-')) expect(geo.alt, q.id).not.toMatch(/问号在|长 \d|宽 \d/)
      })
    }
  })
})
