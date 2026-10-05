import { describe, expect, it } from 'vitest'
import type { Dir8, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { DELTA, DIRS, SCHOOL, ZOO, dirFrom, opposite, road, walk } from '../treasure'

// 四上「☆ 寻找宝藏」：从题目（题干的参数、平面图 / 指南针部件）反推答案，150 种子 × 三档；外加课本的约束——
// 第 1 档出得到认一认（指南针、之间、相对）、校园寻宝（学校各方向上的建筑）、绘制藏宝图（宝藏在哪个角）；平面图是上北下南的 3 × 3。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KP = 'm4s1-08-treasure'
type Plan = Extract<StemPart, { kind: 'plan-map' }>
type Param = LStr | number
const DIR_ZH: Record<Dir8, string> = { n: '北', ne: '东北', e: '东', se: '东南', s: '南', sw: '西南', w: '西', nw: '西北' }
const dirOfZh = (s: string): Dir8 => (Object.keys(DIR_ZH) as Dir8[]).find((d) => DIR_ZH[d] === s)!

function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(KP)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const planOf = (q: Question): Plan | undefined => q.stem.find((p): p is Plan => p.kind === 'plan-map')
const textOf = (q: Question): { k: string; p: Record<string, Param> } => {
  const t = q.stem.find((p) => p.kind === 'text')
  if (!t || t.kind !== 'text' || typeof t.text === 'string') throw new Error(`${q.id} 没有题目文字`)
  return { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }
}
const answerOf = (q: Question): string => {
  const id = (q.answer as { choiceId: string }).choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}
/** 平面图上某个地方在第几行第几列 */
function posOf(plan: Plan, place: Param): [number, number] {
  const name = zh(place as LStr)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (plan.cells[r]![c] && zh(plan.cells[r]![c]!.label) === name) return [r, c]
  throw new Error(`平面图上没有「${name}」`)
}
const placeAt = (plan: Plan, pos: [number, number]): string => zh(plan.cells[pos[0]]![pos[1]]!.label)

describe('寻找宝藏（m4s1-08-treasure）', () => {
  it('方向的小工具：相对、从哪里看在什么方向、动物园的路', () => {
    expect(DIRS.map(opposite)).toEqual(['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'])
    expect(dirFrom([0, 0], [1, 1])).toBe('nw')
    expect(dirFrom([2, 2], [0, 0])).toBe('se')
    expect(dirFrom([0, 2], [2, 1])).toBeNull()
    expect(dirFrom([1, 2], [1, 0])).toBe('e')
    // 动物园：狮虎山到四周都有路，外圈只有相邻的两处之间有路
    expect(road([1, 1], [0, 0])).toBe(true)
    expect(road([0, 0], [0, 1])).toBe(true)
    expect(road([0, 1], [1, 2])).toBe(false)
    expect(walk([2, 1], 'n')).toEqual([1, 1])
    expect(walk([2, 1], 'e')).toEqual([2, 2])
    expect(walk([2, 1], 'ne')).toBeNull()
    // 课本的藏宝图：东北多功能厅、西北食堂、东南存车处、西南科技馆
    expect([SCHOOL[0]![2], SCHOOL[0]![0], SCHOOL[2]![2], SCHOOL[2]![0]]).toEqual(['hall', 'canteen', 'bikes', 'science'])
    expect(ZOO[1]![1]).toBe('lion')
    expect(ZOO[2]![1]).toBe('gate')
  })

  it('平面图：3 × 3、每格都有地方，课本的学校中间是操场、动物园画路', () => {
    each((q) => {
      const plan = planOf(q)
      if (!plan) return
      expect(plan.cells).toHaveLength(3)
      for (const row of plan.cells) expect(row.filter(Boolean)).toHaveLength(3)
      const names = plan.cells.flat().map((c) => zh(c!.label))
      expect(new Set(names).size, q.id).toBe(9)
      if (plan.roads) expect(names[4]).toBe('狮虎山')
      else expect(names[4], q.id).toBe('操场')
    })
  })

  it('从图和题目反推答案', () => {
    each((q) => {
      const kind = kindOf(q)
      const { k, p } = textOf(q)
      const plan = planOf(q)
      const ans = answerOf(q)
      switch (kind) {
        case 'compass': {
          const c = q.stem.find((x) => x.kind === 'compass')
          expect(c && c.kind === 'compass' ? c.ask : undefined, q.id).toBe(dirOfZh(ans))
          break
        }
        case 'between': {
          const a = dirOfZh(zh(p.a as LStr))
          const b = dirOfZh(zh(p.b as LStr))
          // 东和北之间是东北：两个方向的走法合起来
          const dr = DELTA[a][0] + DELTA[b][0]
          const dc = DELTA[a][1] + DELTA[b][1]
          expect(DELTA[dirOfZh(ans)], q.id).toEqual([dr, dc])
          expect(dirOfZh(ans).length).toBe(2)
          break
        }
        case 'opposite':
          expect(dirOfZh(ans), q.id).toBe(opposite(dirOfZh(zh(p.a as LStr))))
          break
        case 'in': {
          // 在学校的什么方向 = 从中间那格看；在操场（中间）的什么方向也一样
          const pos = posOf(plan!, p.x ?? p.a!)
          if (k === 'm4.tre.rel') expect(zh(p.b as LStr)).toBe('操场')
          expect(dirOfZh(ans), q.id).toBe(dirFrom(pos, [1, 1]))
          break
        }
        case 'what': {
          const d = dirOfZh(zh(p.d as LStr))
          expect(k, q.id).toBe(d.length === 2 ? 'm4.tre.whatAt' : 'm4.tre.whatSide')
          expect(ans, q.id).toBe(placeAt(plan!, [1 + DELTA[d][0], 1 + DELTA[d][1]]))
          break
        }
        case 'mark': {
          // 几号宝藏标在这个地方的哪个角 / 哪一面
          const mk = plan!.marks!.find((m) => m.n === p.n)!
          expect(placeAt(plan!, [mk.r, mk.c]), q.id).toBe(zh(p.x as LStr))
          expect(ans, q.id).toBe(`${DIR_ZH[mk.at]}${k === 'm4.tre.cornerAsk' ? '角' : '面'}`)
          expect(mk.at.length, q.id).toBe(k === 'm4.tre.cornerAsk' ? 2 : 1)
          expect(plan!.marks!.filter((m) => m.n === p.n)).toHaveLength(1)
          break
        }
        case 'rel':
        case 'zoo': {
          if (k === 'm4.tre.zooAt' || k === 'm4.tre.zooSide') {
            const d = dirOfZh(zh(p.d as LStr))
            expect(ans, q.id).toBe(placeAt(plan!, [1 + DELTA[d][0], 1 + DELTA[d][1]]))
            break
          }
          const a = posOf(plan!, p.a!)
          const b = posOf(plan!, p.b!)
          expect(dirOfZh(ans), q.id).toBe(dirFrom(a, b))
          break
        }
        case 'walk': {
          const from = posOf(plan!, p.a!)
          const to = walk(from, dirOfZh(zh(p.d as LStr)))
          expect(to, q.id).not.toBeNull()
          expect(ans, q.id).toBe(placeAt(plan!, to!))
          break
        }
        case 'walk2': {
          const a = posOf(plan!, p.a!)
          const b = walk(a, dirOfZh(zh(p.d1 as LStr)))
          expect(b, q.id).not.toBeNull()
          expect(placeAt(plan!, b!), q.id).toBe(zh(p.b as LStr))
          const c = walk(b!, dirOfZh(zh(p.d2 as LStr)))
          expect(c, q.id).not.toBeNull()
          expect(ans, q.id).toBe(placeAt(plan!, c!))
          expect(c).not.toEqual(a)
          break
        }
        default:
          throw new Error(`没核对的题：${q.id}`)
      }
    })
  })

  it('第 1 档出得到认一认、校园寻宝、绘制藏宝图的每种问法；课本那张藏宝图常出', () => {
    const seen = new Set<string>()
    let textbook = 0
    each((q, d) => {
      if (d !== 1) return
      const { k } = textOf(q)
      seen.add(k)
      const plan = planOf(q)
      if (plan && plan.cells.flat().map((c) => zh(c!.label)).join() === '食堂,教学楼,多功能厅,体育馆,操场,图书馆,科技馆,大门,存车处') textbook++
      // 认一认的题配指南针
      if (['m4.tre.between', 'm4.tre.opposite', 'm4.tre.compassAsk'].includes(k)) expect(q.stem.some((x) => x.kind === 'compass'), q.id).toBe(true)
    })
    expect([...seen].sort()).toEqual(
      ['m4.tre.between', 'm4.tre.compassAsk', 'm4.tre.cornerAsk', 'm4.tre.inSchool', 'm4.tre.opposite', 'm4.tre.rel', 'm4.tre.sideAsk', 'm4.tre.whatAt', 'm4.tre.whatSide'].sort(),
    )
    expect(textbook).toBeGreaterThan(40)
  })

  it('方向的干扰项是常见错误（东西看反、南北看反、相对），选项里不出现「长」', () => {
    each((q) => {
      for (const ch of q.choices!) expect(zh(ch.label), q.id).not.toMatch(/长/)
      for (const part of q.stem) if (part.kind === 'text') expect(zh(part.text), q.id).not.toMatch(/长/)
      const ans = answerOf(q)
      if (!(Object.values(DIR_ZH) as string[]).includes(ans) || ans.length !== 2) return
      const d = dirOfZh(ans)
      const labels = q.choices!.map((c) => zh(c.label))
      // 斜方向：另外三个斜方向都在选项里
      for (const x of ['ne', 'se', 'sw', 'nw'] as Dir8[]) if (x !== d) expect(labels, q.id).toContain(DIR_ZH[x])
    })
  })
})
