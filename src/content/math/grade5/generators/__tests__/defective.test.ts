import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { ZH } from '../../lang/defective'
import { minWeighings } from '../defective'

// 五下「8 数学广角——找次品」：从题干的数、天平图、分法的表反推答案，150 种子 × 三档。
// 「至少称几次」用递推另算一遍：n 个里找 1 个（知道轻重），尽量平均分成 3 份称一次，剩下最多的那份接着找。
// 外加：题目都说了次品是轻还是重；第 1 档出得到例 1（3 瓶钙片、看天平）、例 2（8 个零件、分法的表）；单位写汉字、没有括号。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Param = LStr | number
type Balance = Extract<StemPart, { kind: 'balance' }>

function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator('m5s2-10-defective')!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const kindOf = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const texts = (q: Question): { k: string; p: Record<string, Param> }[] =>
  q.stem
    .filter((s): s is Extract<StemPart, { kind: 'text' }> => s.kind === 'text')
    .map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const balances = (q: Question): Balance[] => q.stem.filter((s): s is Balance => s.kind === 'balance')

/** 至少称几次：一次称完，次品在最多那份里（平均分成 3 份，最多那份是 n / 3 向上取整） */
function times(n: number): number {
  return n <= 1 ? 0 : 1 + times(Math.ceil(n / 3))
}
/** 天平上：低的一边重。次品重就在低的一边、轻就在高的一边；平衡就在没放上去的里面 */
function suspects(b: Balance, heavy: boolean): string[] {
  if ((b.tilt ?? 'level') === 'level') return b.aside ?? []
  const low = b.tilt === 'left' ? b.left : b.right
  const high = b.tilt === 'left' ? b.right : b.left
  return heavy ? low : high
}

describe('找次品（m5s2-10-defective）', () => {
  it('从题干、天平图和表反推答案；题目都说了次品是轻还是重', () => {
    const kinds = new Set<string>()
    each((q, d) => {
      const kind = kindOf(q)
      if (d === 1) kinds.add(kind)
      const all = texts(q)
      const words = all.map((t) => zh({ k: t.k, p: t.p })).join('')
      if (kind !== 'sugar') expect(words, `${q.id} 要说次品是轻还是重`).toMatch(/轻|重/)
      const heavy = /重一些/.test(words)
      switch (kind) {
        case 'howMany': {
          const { n, m } = all[0]!.p as Record<string, number>
          if (m !== undefined && /其中 \d+ (瓶|盒|袋)质量相同/.test(words)) expect(m).toBe(n! - 1)
          expect(answer(q), q.id).toBe(String(times(n!)))
          break
        }
        case 'readOne': {
          const [b] = balances(q)
          expect(b!.left.length + b!.right.length + (b!.aside?.length ?? 0)).toBe(3)
          const s = suspects(b!, heavy)
          expect(s, q.id).toHaveLength(1)
          expect(answer(q), q.id).toBe(s[0])
          // 钙片（轻）画方块，零件（重）画圆圈
          expect(b!.shape, q.id).toBe(heavy ? 'ball' : 'box')
          break
        }
        case 'readGroup': {
          const [b] = balances(q)
          expect(b!.left.length, q.id).toBe(b!.right.length)
          expect(b!.left.length + b!.right.length + (b!.aside?.length ?? 0)).toBe(8)
          expect(heavy).toBe(true)
          expect(answer(q), q.id).toBe(`${suspects(b!, true).join('、')} 号`)
          break
        }
        case 'table': {
          const t = q.stem.find((s): s is Extract<StemPart, { kind: 'stat-table' }> => s.kind === 'stat-table')!
          const rows = t.rows.slice(1)
          let blank = 0
          for (const r of rows) {
            const each3 = String(r[1]).replace(/[（）]/g, '').split('，').map(Number)
            expect(each3.reduce((a, b) => a + b, 0)).toBe(8)
            // 第一次称两份一样多的；平衡就在剩下的里面，不平衡就在那一份里
            const want = 1 + times(Math.max(each3[0]!, 8 - 2 * each3[0]!))
            if (r[2] === null) {
              blank++
              expect(answer(q), q.id).toBe(String(want))
            } else expect(r[2], q.id).toBe(want)
            if (r[0] === null) {
              blank++
              expect(answer(q), q.id).toBe(String(each3.length))
            } else expect(r[0], q.id).toBe(each3.length)
          }
          expect(blank, q.id).toBe(1)
          break
        }
        case 'best':
          expect(answer(q)).toBe('分成 3 份')
          break
        case 'five': {
          // 第一次 1 号和 2 号平衡（题目文字里说了），第二次 3 号和 4 号在图里：平衡就是剩下的 5 号，不平衡就是轻的那瓶
          expect(words).toMatch(/先称 1 号和 2 号，天平平衡/)
          const [b2] = balances(q)
          expect([...b2!.left, ...b2!.right]).toEqual(['3', '4'])
          const s = suspects(b2!, false)
          expect(answer(q), q.id).toBe(s[0])
          expect(q.choices!.map((c) => zh(c.label)).sort()).toEqual(['3', '4', '5'])
          break
        }
        case 'third': {
          const { n } = all[0]!.p as Record<string, number>
          expect(n! % 3).toBe(0)
          expect(answer(q), q.id).toBe(String(n! / 3))
          break
        }
        case 'sugar':
          // 不知道轻重的 3 袋：先称 A、B，平衡是 C；不平衡再拿 A 和 C 比——2 次
          expect(answer(q)).toBe('2')
          break
        default:
          throw new Error(`没核对过的题：${q.id}`)
      }
    })
    // 例 1：3 瓶钙片称几次、看天平；例 2：8 个零件称几次、看天平、分法的表、哪种最少，都在第 1 档
    for (const k of ['howMany', 'readOne', 'readGroup', 'table', 'best']) expect(kinds, k).toContain(k)
  })

  it('你知道吗的表：2～3 个 1 次、4～9 个 2 次、10～27 个 3 次、28～81 个 4 次、82～243 个 5 次', () => {
    const want = (n: number): number => (n <= 3 ? 1 : n <= 9 ? 2 : n <= 27 ? 3 : n <= 81 ? 4 : 5)
    for (let n = 2; n <= 243; n++) {
      expect(minWeighings(n), String(n)).toBe(want(n))
      expect(times(n), String(n)).toBe(want(n))
    }
    // 练习二十七：5 瓶 2 次、28 瓶 4 次、15 盒 3 次、12 袋 3 次；例 2：8 个、9 个 2 次，10 个、11 个 3 次
    expect([5, 28, 15, 12, 8, 9, 10, 11].map(minWeighings)).toEqual([2, 4, 3, 3, 2, 2, 3, 3])
  })

  it('题目文字：单位写汉字、不写括号，没有「长」', () => {
    for (const [k, v] of Object.entries(ZH)) expect(String(v), k).not.toMatch(/[（）()]|\d\s*g\b|长/)
  })
})
