import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { QUIZ, quizScore } from '../chicken'

// 四下「数学广角——鸡兔同笼」：从题干的参数（头数、腿数、一共几个、合计）和列表反推答案，150 种子 × 三档；
// 外加课本的约束：两种都至少有 1 个（G14）、第 1 档出得到例 1（8 个头 26 条腿、列表、假设的每一步）和做一做（10 辆 26 个轮子），
// 题目文字里没有「数字 + 只」（朗读会读错）、没有「从上面数」。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Param = LStr | number
type Table = Extract<StemPart, { kind: 'stat-table' }>

function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator('m4s2-10-chicken')!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const texts = (q: Question): { k: string; p: Record<string, Param> }[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const num = (q: Question): number => {
  if (q.answer.kind === 'number') return q.answer.value
  const id = q.answer.choiceId
  return Number(zh(q.choices!.find((c) => c.id === id)!.label))
}
/** 一共 n 个、合计 v，每个 a 或 b（a < b）：b 的那种有几个 */
const hiOf = (n: number, v: number, a: number, b: number): number => (v - a * n) / (b - a)
/** 每种题的「每个」：少的、多的 */
const PER: Record<string, [number, number]> = {
  cage: [2, 4],
  sunzi: [2, 4],
  big: [2, 4],
  find: [2, 4],
  bike: [2, 3],
  ball: [7, 11],
  crane: [2, 4],
  boat: [4, 6],
  tree: [2, 3],
  shot: [2, 3],
  buy: [58, 62],
  club: [3, 5],
}
/** 问的是多的那种（兔、三轮车、大钢珠、龟、大船、男生、3 分球、篮球、科技类）吗 */
const asksHi = (k: string): boolean => /\.(rabbit|findRabbit|tri|big|turtle|boys|three|basket|sci)$/.test(k)

describe('鸡兔同笼（m4s2-10-chicken）', () => {
  it('从题干的数反推答案；两种都至少有 1 个', () => {
    each((q) => {
      const kind = kindOf(q)
      const all = texts(q)
      const { k, p } = all[all.length - 1]!
      switch (kind) {
        case 'cage':
        case 'sunzi':
        case 'big':
        case 'find':
        case 'bike':
        case 'ball':
        case 'crane':
        case 'boat':
        case 'tree':
        case 'shot':
        case 'buy': {
          const [a, b] = PER[kind]!
          const n = p.n as number
          const v = p.v as number
          const hi = hiOf(n, v, a, b)
          expect(Number.isInteger(hi), q.id).toBe(true)
          expect(hi, `${q.id} 两种都要至少有 1 个`).toBeGreaterThanOrEqual(1)
          expect(n - hi, `${q.id} 两种都要至少有 1 个`).toBeGreaterThanOrEqual(1)
          expect(num(q), q.id).toBe(asksHi(k) ? hi : n - hi)
          if (kind === 'shot') expect(p.s as number, `${q.id} 投的球比进的多`).toBeGreaterThan(n)
          break
        }
        case 'club': {
          const n = p.n as number
          const v = p.v as number
          const sci = hiOf(n, v, 3, 5)
          expect(Number.isInteger(sci) && sci >= 1 && n - sci >= 1, q.id).toBe(true)
          // 问的是人数：组数再乘每组人数
          expect(num(q), q.id).toBe(k.endsWith('sci') ? sci * 5 : (n - sci) * 3)
          break
        }
        case 'assume1':
        case 'assume2':
        case 'assume3': {
          const { n, v } = all[0]!.p as { n: number; v: number }
          const want = { assume1: 2 * n, assume2: v - 2 * n, assume3: hiOf(n, v, 2, 4) }[kind]
          expect(num(q), q.id).toBe(want)
          break
        }
        case 'list': {
          const t = q.stem.find((s): s is Table => s.kind === 'stat-table')!
          const [hens, rabbits, legs] = t.rows.map((r) => r.slice(1)) as [(number | null)[], (number | null)[], (number | null)[]]
          const n = p.n as number
          const at = [hens, rabbits, legs].flatMap((r, ri) => r.map((c, ci) => (c === null ? [ri, ci] : null)).filter(Boolean)) as [number, number][]
          expect(at).toHaveLength(1)
          const [r, c] = at[0]!
          // 鸡从 n 只往下减、兔从 0 只往上加、腿每次多 2 条
          expect(num(q), q.id).toBe([n - c, c, 2 * (n - c) + 4 * c][r])
          hens.forEach((h, i) => h !== null && expect(h).toBe(n - i))
          legs.forEach((x, i) => x !== null && expect(x).toBe(2 * (n - i) + 4 * i))
          break
        }
        case 'quiz': {
          const { n, s } = p as { n: number; s: number }
          // 每错一题比全对少 10 + 6 = 16 分
          const wrong = (10 * n - s) / 16
          expect(Number.isInteger(wrong) && wrong >= 1 && wrong < n, q.id).toBe(true)
          expect(num(q), q.id).toBe(k.endsWith('right') ? n - wrong : wrong)
          break
        }
        default:
          throw new Error(`没核对过的题：${q.id}`)
      }
    })
  })

  it('题目文字里没有「数字 + 只」、没有「从上面数」「投中」', () => {
    each((q) => {
      for (const part of q.stem) {
        if (part.kind !== 'text') continue
        const s = zh(part.text)
        expect(s, q.id).not.toMatch(/\d\s*只/)
        expect(s, q.id).not.toMatch(/上面数|下面数|投中/)
      }
    })
  })

  it('第 1 档出得到例 1（8 个头 26 条腿：鸡兔各几只、假设的三步、列表）和做一做（10 辆 26 个轮子）；课本练习的数出现', () => {
    const seen = new Set<string>()
    each((q, d) => {
      const id = q.id.split(':')[1]!
      if (d === 1) seen.add(id.split('-')[0]!)
      if (d === 1 && /cage-(rabbit|hen)-8-26$/.test(id)) seen.add('ex1')
      if (d === 1 && /bike-(tri|bi)-10-26$/.test(id)) seen.add('bike-book')
      if (d === 2 && id === 'sunzi-rabbit-35-94') seen.add('sunzi')
      for (const [kid, sig] of [
        ['ball', '30-266'],
        ['crane', '40-112'],
        ['boat', '8-38'],
        ['tree', '12-32'],
        ['shot', '9-21'],
        ['buy', '6-360'],
      ])
        if (d === 2 && id.startsWith(kid!) && id.endsWith(sig!)) seen.add(`book-${kid}`)
    })
    for (const k of ['cage', 'assume1', 'assume2', 'assume3', 'list', 'find', 'bike', 'ex1', 'bike-book', 'sunzi', 'book-ball', 'book-crane', 'book-boat', 'book-tree', 'book-shot', 'book-buy'])
      expect(seen.has(k), k).toBe(true)
    // 课本抢答的三位选手：64 分、36 分、16 分
    expect(QUIZ.map(quizScore)).toEqual([64, 36, 16])
  })
})
