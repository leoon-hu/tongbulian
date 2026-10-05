import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { AUG, BOOK_DATA, DONATE_2, DONATE_3, LIFE, PHONE_FIXED, PHONE_MOBILE, PHONE_YEARS, POP_RURAL, POP_TOWN, POP_YEARS, ROPE_SEGS, SEPT, TV_SALES, WEATHER_AUG } from '../bars'

// 四上「条形统计图」：从题目（题干的参数、条形统计图部件里的数）反推答案，150 种子 × 三档；外加课本的约束——
// 读图的数落在格线或半格上（单式图），第 1 档出得到例题和做一做的每种问法，图里的数不超出刻度。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Chart = Extract<StemPart, { kind: 'bar-chart' }>
type Param = LStr | number

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const chartOf = (q: Question): Chart | undefined => q.stem.find((p): p is Chart => p.kind === 'bar-chart')
const textOf = (q: Question): { k: string; p: Record<string, Param> } => {
  const t = q.stem.find((p) => p.kind === 'text')
  if (!t || t.kind !== 'text' || typeof t.text === 'string') throw new Error(`${q.id} 没有题目文字`)
  return { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }
}
/** 正确答案：数字键盘的数，或正确选项的中文 */
const answerOf = (q: Question): number | string => {
  if (q.answer.kind === 'number') return q.answer.value
  const id = q.answer.choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}
const num = (q: Question): number => {
  const a = answerOf(q)
  return typeof a === 'number' ? a : Number(a)
}
/** 题目里说的类别在图上是第几个（中文名一样；出生月份按 m；年份按 y） */
function catIndex(c: Chart, p: Param | undefined, key = ''): number {
  if (p === undefined) throw new Error(`没有类别参数 ${key}`)
  const name = typeof p === 'number' ? String(p) : zh(p)
  const i = c.cats.findIndex((x) => zh(x) === name || zh(x) === name.replace(/ 年$/, ''))
  expect(i, `${key}「${name}」不在图上`).toBeGreaterThanOrEqual(0)
  return i
}
const seriesIndex = (c: Chart, p: Param | undefined): number => {
  const i = c.series.findIndex((s) => s.name && p !== undefined && typeof p !== 'number' && zh(s.name) === zh(p))
  expect(i).toBeGreaterThanOrEqual(0)
  return i
}
const vals = (c: Chart, j = 0): number[] => c.series[j]!.values.map((v) => v ?? NaN)
/** 选项里写的类别（「3 月」「1980 年」「星期三」「晴」）在图上是第几个 */
function choiceIndex(c: Chart, label: string): number {
  const i = c.cats.findIndex((x) => zh(x) === label || `${zh(x)} 年` === label || `${zh(x)} 月` === label)
  expect(i, `选项「${label}」不在图上`).toBeGreaterThanOrEqual(0)
  return i
}

describe('单式条形统计图（m4s1-07-single）', () => {
  it('图：满格方格纸、竖向或横向，读图的数落在格线或半格上、不超出刻度，最多 17 格高', () => {
    each('m4s1-07-single', (q) => {
      const c = chartOf(q)
      if (!c) return
      expect(c.grid, q.id).toBe(true)
      expect(c.series).toHaveLength(1)
      expect(c.cells, q.id).toBeLessThanOrEqual(17)
      for (const v of c.series[0]!.values) {
        if (v === null) continue
        expect(Number.isInteger((v * 2) / c.step), `${q.id} ${v} 不在格线或半格上`).toBe(true)
        expect(v, q.id).toBeLessThan(c.cells * c.step)
        expect(v, q.id).toBeGreaterThanOrEqual(0)
      }
      expect([1, 2, 5, 10]).toContain(c.step)
    })
  })

  it('从图上的数反推答案', () => {
    each('m4s1-07-single', (q) => {
      const kind = kindOf(q)
      const c = chartOf(q)
      const { k, p } = textOf(q)
      if (kind === 'which') {
        // 23 年这种不是 5 的倍数的：1 格代表 5 年的那幅表示得准
        expect((p.v as number) % 5).not.toBe(0)
        expect(answerOf(q)).toBe('1 格代表 5 年的那幅')
        return
      }
      expect(c, q.id).toBeDefined()
      const vs = vals(c!)
      switch (kind) {
        case 'count':
        case 'odd': {
          const i = p.m !== undefined ? (p.m as number) - 1 : catIndex(c!, p.x, k)
          expect(num(q), q.id).toBe(vs[i])
          if (kind === 'odd') expect(vs[i]! % 2).toBe(1)
          break
        }
        case 'most':
        case 'least': {
          const target = kind === 'most' ? Math.max(...vs) : Math.min(...vs)
          expect(vs.filter((v) => v === target), `${q.id} 最多 / 最少不唯一`).toHaveLength(1)
          expect(vs[choiceIndex(c!, answerOf(q) as string)], q.id).toBe(target)
          break
        }
        case 'diff': {
          const a = catIndex(c!, p.a, k)
          const b = catIndex(c!, p.b, k)
          expect(num(q), q.id).toBe(vs[a]! - vs[b]!)
          expect(num(q)).toBeGreaterThan(0)
          break
        }
        case 'total':
          expect(num(q), q.id).toBe(vs.reduce((x, y) => x + y, 0))
          break
        case 'same': {
          const [a, b] = (answerOf(q) as string).split('和')
          expect(vs[choiceIndex(c!, a!)], q.id).toBe(vs[choiceIndex(c!, b!)])
          // 别的选项里的两种天数都不一样
          for (const ch of q.choices!) {
            if (zh(ch.label) === answerOf(q)) continue
            const [x, y] = zh(ch.label).split('和')
            expect(vs[choiceIndex(c!, x!)]).not.toBe(vs[choiceIndex(c!, y!)])
          }
          break
        }
        case 'range':
          expect(num(q), q.id).toBe(Math.max(...vs) - Math.min(...vs))
          break
        case 'step':
          expect(num(q), q.id).toBe(c!.step)
          expect(c!.hideScale).toBeFalsy()
          break
        case 'half':
          expect(num(q), q.id).toBe(c!.step / 2)
          expect(c!.step % 2).toBe(0)
          break
        case 'cells': {
          // 这一条在图上空着（「?」），题目里给出数，问要画几格
          const i = catIndex(c!, p.x, k)
          expect(c!.series[0]!.values[i], q.id).toBeNull()
          const n = (p.v as number) / c!.step
          if (Number.isInteger(n)) expect(num(q), q.id).toBe(n)
          else {
            expect(answerOf(q), q.id).toBe(`${Math.floor(n)} 格半`)
            // 选项两个带「半」、两个不带，不能从格式上认出答案
            expect(q.choices!.filter((ch) => zh(ch.label).endsWith('半'))).toHaveLength(2)
          }
          break
        }
        case 'hidden': {
          // 刻度上的数没写：这一条的数 ÷ 格数 = 每格代表几
          expect(c!.hideScale, q.id).toBe(true)
          const i = catIndex(c!, p.x, k)
          expect(vs[i]).toBe(p.v)
          expect((p.v as number) / (p.n as number)).toBe(c!.step)
          expect(num(q), q.id).toBe(c!.step)
          break
        }
        case 'sept': {
          const i = catIndex(c!, p.x, k)
          const diff = vs[i]! - (p.a as number)
          expect(k).toBe(diff > 0 ? 'm4.bar.sept.more' : 'm4.bar.sept.fewer')
          expect(num(q), q.id).toBe(Math.abs(diff))
          break
        }
        case 'weekend':
          expect(num(q), q.id).toBe(vs[5]! + vs[6]!)
          break
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到例 1、例 2 和两个做一做的每种问法', () => {
    const seen = new Map<string, Set<string>>()
    each('m4s1-07-single', (q, d) => {
      if (d !== 1) return
      const c = chartOf(q)!
      const scene = zh(c.catAxis)
      if (!seen.has(scene)) seen.set(scene, new Set())
      seen.get(scene)!.add(kindOf(q) + (kindOf(q) === 'cells' && q.choices && q.answer.kind === 'choice' && answerOf(q).toString().endsWith('半') ? '-half' : ''))
    })
    // 例 1：天气（1 格代表 1 天）
    expect([...seen.get('天气情况')!].sort()).toEqual(['count', 'diff', 'least', 'most', 'same'])
    // 例 2：图书（1 格代表 2 人、17 人画 8 格半、半格代表几人）
    expect(seen.get('图书种类')).toEqual(new Set(['cells', 'cells-half', 'count', 'most', 'least', 'step', 'half']))
    // 做一做：捐书（每格代表几本、要画几格、刻度没写）
    expect(seen.get('小组')).toEqual(new Set(['hidden', 'count', 'most', 'least', 'cells', 'half']))
    // 做一做：出生月份（一共、最多、最少、几人）
    expect(seen.get('出生月份')).toEqual(new Set(['count', 'most', 'least', 'total']))
  })

  it('课本的数据也会出：例 1 的 8 月天气、例 2 的图书、两个班捐书、电视机销售量', () => {
    const seen = new Set<string>()
    each('m4s1-07-single', (q) => {
      const c = chartOf(q)
      if (c) seen.add(c.series[0]!.values.join('.'))
    })
    for (const data of [WEATHER_AUG, BOOK_DATA, DONATE_2, DONATE_3, TV_SALES, SEPT]) expect(seen, data.join('.')).toContain(data.join('.'))
  })

  it('课本的数据：动物寿命 10、25、75、40 年，9 月的天气 18、4、3、5 天，横向图有上学方式和动物寿命', () => {
    expect(LIFE).toEqual([10, 25, 75, 40])
    expect(SEPT).toEqual([18, 4, 3, 5])
    expect(AUG).toEqual([9, 6, 9, 7])
    const dirs = new Map<string, string>()
    each('m4s1-07-single', (q) => {
      const c = chartOf(q)
      if (c) dirs.set(zh(c.catAxis), c.dir ?? 'v')
    })
    expect(dirs.get('上学方式')).toBe('h')
    expect(dirs.get('动物')).toBe('h')
    expect(dirs.get('天气情况')).toBe('v')
  })

  it('题目里不出现「长」（读音不唯一）', () => {
    each('m4s1-07-single', (q) => {
      for (const part of q.stem) if (part.kind === 'text') expect(zh(part.text), q.id).not.toMatch(/长/)
      for (const ch of q.choices ?? []) expect(zh(ch.label), q.id).not.toMatch(/长/)
    })
  })
})

describe('复式条形统计图（m4s1-07-double）', () => {
  it('图：两三组、条顶写数、有图例名字，数不超出刻度', () => {
    each('m4s1-07-double', (q) => {
      const c = chartOf(q)
      if (!c) return
      if (q.id.includes(':kind-')) return
      expect(c.series.length, q.id).toBeGreaterThanOrEqual(2)
      expect(c.numbers, q.id).toBe(true)
      expect(c.grid, q.id).toBeFalsy()
      for (const s of c.series) {
        expect(s.name, q.id).toBeDefined()
        for (const v of s.values) expect(v!, q.id).toBeLessThanOrEqual(c.cells * c.step)
      }
      // 颜色互不相同
      expect(new Set(c.series.map((s) => s.tone)).size).toBe(c.series.length)
    })
  })

  it('从图上的数反推答案', () => {
    each('m4s1-07-double', (q) => {
      const kind = kindOf(q)
      const c = chartOf(q)!
      const { k, p } = textOf(q)
      const idx = (): number => {
        if (p.y !== undefined) return catIndex(c, p.y, k)
        if (p.m !== undefined) return c.cats.findIndex((x) => zh(x) === `${p.m} 月`)
        if (p.seg !== undefined) {
          // 跳绳成绩：句子里说「121 到 140 次」，图上写「121~140」
          const seg = p.seg as { k: string; p: { a: number } }
          if (seg.k === 'm4.bar.seg.maxSay') return 0
          if (seg.k === 'm4.bar.seg.minSay') return ROPE_SEGS.length - 1
          return ROPE_SEGS.findIndex(([lo]) => lo === seg.p.a)
        }
        return catIndex(c, p.x, k)
      }
      switch (kind) {
        case 'ser': {
          const j = seriesIndex(c, p.g ?? p.x)
          const vs = vals(c, j)
          const most = q.id.includes('-most-')
          const target = most ? Math.max(...vs) : Math.min(...vs)
          expect(vs.filter((v) => v === target)).toHaveLength(1)
          expect(vs[choiceIndex(c, answerOf(q) as string)], q.id).toBe(target)
          break
        }
        case 'all':
        case 'gap': {
          const per = c.cats.map((_, i) => (kind === 'all' ? vals(c, 0)[i]! + vals(c, 1)[i]! : Math.abs(vals(c, 0)[i]! - vals(c, 1)[i]!)))
          const most = q.id.includes('-most-')
          const target = most ? Math.max(...per) : Math.min(...per)
          expect(per.filter((v) => v === target), q.id).toHaveLength(1)
          expect(per[choiceIndex(c, answerOf(q) as string)], q.id).toBe(target)
          break
        }
        case 'pdiff': {
          const i = idx()
          const a = seriesIndex(c, p.a)
          const b = seriesIndex(c, p.b)
          expect(num(q), q.id).toBe(vals(c, a)[i]! - vals(c, b)[i]!)
          expect(num(q)).toBeGreaterThan(0)
          break
        }
        case 'psum': {
          const i = idx()
          expect(num(q), q.id).toBe(vals(c, 0)[i]! + vals(c, 1)[i]!)
          break
        }
        case 'cell': {
          const i = idx()
          const j = seriesIndex(c, p.g ?? p.a ?? p.x)
          expect(num(q), q.id).toBe(vals(c, j)[i])
          break
        }
        case 'legend': {
          const color = zh(p.c as LStr)
          const tone = { 蓝色: 'blue', 粉色: 'pink', 绿色: 'green' }[color]
          const s = c.series.find((x) => x.tone === tone)!
          expect(answerOf(q), q.id).toBe(zh(s.name!))
          break
        }
        case 'more': {
          const i = idx()
          const win = vals(c, 0)[i]! > vals(c, 1)[i]! ? 0 : 1
          expect(answerOf(q), q.id).toBe(zh(c.series[win]!.name!))
          break
        }
        case 'tstep':
          expect(num(q), q.id).toBe(c.step)
          expect(c.dir).toBe('h')
          break
        case 'rsum': {
          const j = seriesIndex(c, p.g)
          const from = ROPE_SEGS.findIndex(([lo]) => lo === p.a)
          const to = ROPE_SEGS.findIndex(([, hi]) => hi === p.b)
          expect(to, q.id).toBe(from + 1)
          expect(num(q), q.id).toBe(vals(c, j)[from]! + vals(c, j)[to]!)
          break
        }
        case 'good': {
          // 135 次及以上算优秀：135–140 次的 k 人 + 141–160 次 + 161 次及以上
          const j = seriesIndex(c, p.g)
          const vs = vals(c, j)
          expect(p.k as number).toBeLessThanOrEqual(Math.max(1, vs[2]!))
          expect(num(q), q.id).toBe((p.k as number) + vs[3]! + vs[4]!)
          break
        }
        case 'phone': {
          const i = PHONE_YEARS.indexOf(p.y as number)
          expect(num(q), q.id).toBe(PHONE_MOBILE[i]! - PHONE_FIXED[i]!)
          break
        }
        case 'power': {
          const j = seriesIndex(c, p.x)
          expect(num(q), q.id).toBe(vals(c, j).reduce((x, y) => x + y, 0))
          break
        }
        case 'kind': {
          const isDouble = c.series.length > 1
          const askDouble = k === 'm4.bar.isDouble'
          expect(answerOf(q), q.id).toBe(isDouble === askDouble ? '对' : '不对')
          break
        }
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到例 3 和做一做的每种问法', () => {
    const seen = new Map<string, Set<string>>()
    each('m4s1-07-double', (q, d) => {
      if (d !== 1) return
      const scene = zh(chartOf(q)!.catAxis)
      if (!seen.has(scene)) seen.set(scene, new Set())
      seen.get(scene)!.add(kindOf(q))
    })
    // 例 3：城乡人口（哪一年最多 / 最少、相差最大 / 最小、相差多少、一共多少、看图例）
    expect(seen.get('年份')).toEqual(new Set(['ser', 'gap', 'pdiff', 'psum', 'legend']))
    // 做一做：运动项目（男生 / 女生最多最少、合起来最多最少、男生比女生多几人、一共、一条）
    expect(seen.get('项目')).toEqual(new Set(['ser', 'all', 'pdiff', 'psum', 'cell', 'legend']))
  })

  it('课本的数据：例 3 城乡人口、练习十九的电话用户', () => {
    expect(POP_YEARS).toEqual([1980, 1990, 2000, 2010, 2020])
    expect(POP_TOWN).toEqual([21, 27, 35, 46, 59])
    expect(POP_RURAL).toEqual([58, 54, 49, 43, 34])
    expect(PHONE_MOBILE[5]! - PHONE_FIXED[5]!).toBe(157025)
    let textbook = 0
    each('m4s1-07-double', (q) => {
      const c = chartOf(q)!
      if (c.series[0]!.values.join() === POP_TOWN.join()) textbook++
    })
    expect(textbook).toBeGreaterThan(0)
  })
})
