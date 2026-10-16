import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'

// 六下「鸽巢问题」的专项检查（六年级数学 A）：150 种子 × 三档，答案一律用「最坏的放法 / 摸法」穷举另算一遍（不用商 + 1 的公式）；
// 放法图、摸球盒和题目里的数对得上；第 1 档出得到课本的例题和做一做；朗读避坑。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const K = 'm6s2-07-pigeonhole'

function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(K)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sig = (q: Question): string => q.id.slice(q.kpId.length + 1)
const kind = (q: Question): string => sig(q).split('-')[0]!
const part = <T extends StemPart['kind']>(q: Question, k: T): Extract<StemPart, { kind: T }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: T }> => p.kind === k)
const text = (q: Question): string => q.stem.map((p) => (p.kind === 'text' ? zh(p.text) : '')).join('')
const answer = (q: Question): number => Number(q.answer.kind === 'number' ? q.answer.value : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const yes = (q: Question): boolean => zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label) === '对'
const nums = (t: string): number[] => [...t.matchAll(/\d+/g)].map((m) => Number(m[0]))

/** 把 n 个东西放进 k 个容器的全部放法（每个容器几个，按顺序列） */
function* spreads(n: number, k: number): Generator<number[]> {
  if (k === 1) {
    yield [n]
    return
  }
  for (let a = 0; a <= n; a++) for (const rest of spreads(n - a, k - 1)) yield [a, ...rest]
}
/**
 * 不管怎么放，最多的那个容器至少有几个：所有放法里「最多的」取最小。东西少的时候把放法全列出来；
 * 多的时候（13 位老师、16 列……放法上亿种）找最小的 m，使每个容器最多放 m 个也放得下
 */
function atLeast(n: number, k: number): number {
  if (n <= 12 && k <= 5) {
    let best = Infinity
    for (const s of spreads(n, k)) best = Math.min(best, Math.max(...s))
    return best
  }
  let m = 0
  while (m * k < n) m++
  return m
}
/** 至少要拿多少个，才能保证不管怎么拿都满足 ok（每种颜色最多 cap 个） */
function needToTake(colors: number, cap: number, ok: (counts: number[]) => boolean): number {
  for (let t = 1; t <= colors * cap; t++) if ([...spreads(t, colors)].filter((s) => s.every((x) => x <= cap)).every(ok)) return t
  return Infinity
}

describe('鸽巢问题：答案用穷举另算', () => {
  it('放东西（铅笔、苹果、鸽子、书、生日、扑克牌、飞镖、涂色）：总有一个至少几个', () => {
    let n = 0
    each((q) => {
      const t = text(q)
      const k = kind(q)
      const v = nums(t)
      if (['ex1', 'ex2', 'pigeon'].includes(k)) {
        expect(answer(q), q.id).toBe(atLeast(v[0]!, v[1]!))
        n++
      }
      if (k === 'div') {
        // 「把 7 本书放进 3 个抽屉。7 ÷ 3 的商是 2，余数是 1。」
        const [a, b, , , qq, r] = v
        expect(qq, q.id).toBe(Math.floor(a! / b!))
        expect(r, q.id).toBe(a! % b!)
        expect(answer(q), q.id).toBe(atLeast(a!, b!))
      }
      if (k === 'zodiac' && sig(q) !== 'zodiac-rev') expect(answer(q), q.id).toBe(atLeast(v[0]!, 12))
      if (k === 'poker') expect(answer(q), q.id).toBe(atLeast(v[2]!, 4))
      if (k === 'bday') {
        if (sig(q).startsWith('bday-day')) expect(answer(q), q.id).toBe(Math.ceil(v[0]! / 366))
        if (sig(q).startsWith('bday-month')) expect(answer(q), q.id).toBe(Math.ceil(v[0]! / 12))
        if (sig(q).startsWith('bday-tf')) expect(yes(q), q.id).toBe(Math.ceil(v[0]! / 12) === v[1])
      }
      if (k === 'darts') {
        // 每次最多 10 环；所有投法里最高的那一次至少几环
        const [throws, score] = v
        expect(score! <= 10 * throws!, q.id).toBe(true)
        expect(answer(q), q.id).toBe(Math.ceil(score! / throws!))
      }
      if (k === 'cube') expect(answer(q), q.id).toBe(atLeast(6, t.includes('两种') ? 2 : 3))
      if (k === 'cols') {
        const rows = t.includes('三行') || /有 3 个格子/.test(t) ? 3 : 2
        const ways = 2 ** rows
        if (sig(q).startsWith('cols-ways')) expect(answer(q), q.id).toBe(ways)
        else expect(answer(q), q.id).toBe(atLeast(Number(/(\d+) 列/.exec(t)![1]), ways))
      }
      if (k === 'ex1tf') expect(yes(q), q.id).toBe(atLeast(v[0]!, v[1]!) >= v[3]!)
    })
    expect(n).toBeGreaterThan(40)
  })

  it('摸球、拿筷子：最坏的摸法也要满足', () => {
    each((q) => {
      const t = text(q)
      const k = kind(q)
      const v = nums(t)
      const twoSame = (s: number[]): boolean => s.some((x) => x >= 2)
      if (k === 'ball2') expect(answer(q), q.id).toBe(needToTake(2, v[0]!, twoSame))
      if (k === 'ballk') {
        const box = part(q, 'draw-box')!.boxes[0]!
        expect(box.length, q.id).toBe(v[0])
        expect(box.every((b) => b.n === v[1]), q.id).toBe(true)
        expect(answer(q), q.id).toBe(needToTake(v[0]!, v[1]!, twoSame))
      }
      if (k === 'bag' || k === 'chop') {
        const colors = /([红黄蓝白绿、]+) ?(\d) 种颜色/.exec(t)!
        expect(colors[1]!.split('、').length, q.id).toBe(Number(colors[2]))
        const m = Number(/各 (\d+) [个根]/.exec(t)![1])
        expect(answer(q), q.id).toBe(needToTake(Number(colors[2]), m, twoSame))
      }
      if (k === 'chop2') {
        const m = Number(/各 (\d+) 根/.exec(t)![1])
        // 2 双不同颜色：至少两种颜色各有 2 根
        expect(answer(q), q.id).toBe(needToTake(3, m, (s) => s.filter((x) => x >= 2).length >= 2))
      }
      if (k === 'twored') expect(answer(q), q.id).toBe(needToTake(2, v[0]!, (s) => s[0]! >= 2))
      if (k === 'revobj') {
        const [kk, m] = v.filter((x) => x !== 1)
        let need = 1
        while (atLeast(need, kk!) < m!) need++
        expect(answer(q), q.id).toBe(need)
      }
      if (k === 'monthrev') {
        let need = 1
        while (Math.ceil(need / 12) < v[0]!) need++
        expect(answer(q), q.id).toBe(need)
      }
      if (k === 'zodiac' && sig(q) === 'zodiac-rev') expect(answer(q)).toBe(13)
      if (k === 'parity') {
        // 3 个数里总有两个奇偶相同（和是偶数）；2 个数的和不一定是偶数（1 + 2）
        expect(yes(q), q.id).toBe(t.includes('3 个不同的自然数'))
      }
    })
  })

  it('放法：小红摆出来的放法个数、小明和男孩的假设', () => {
    each((q) => {
      const t = text(q)
      const v = nums(t)
      if (kind(q) === 'enum') {
        const kinds = new Set([...spreads(v[0]!, v[1]!)].map((s) => [...s].sort((a, b) => b - a).join(',')))
        expect(answer(q), q.id).toBe(kinds.size)
      }
      if (sig(q).startsWith('hyp-max')) expect(answer(q), q.id).toBe(v[1])
      if (sig(q).startsWith('hyp-left')) expect(answer(q), q.id).toBe(v[0]! - v[1]!)
      if (sig(q).startsWith('hyp-book')) expect(answer(q), q.id).toBe(v[0]! * v[1]!)
    })
  })

  it('放法图和题目里的数对得上（每个容器一样多，多出的放在旁边）', () => {
    let n = 0
    each((q) => {
      const h = part(q, 'pigeonholes')
      if (!h) return
      const v = nums(text(q))
      const k = kind(q)
      if (k === 'hyp') {
        // 假设每个最多放 1 支：每个笔筒 1 支，不画多出的
        expect(h.counts.every((c) => c === 1), q.id).toBe(true)
        expect(h.extra ?? 0, q.id).toBe(0)
        return
      }
      expect(h.counts.length, q.id).toBe(v[1])
      expect(h.counts.reduce((s, c) => s + c, 0) + (h.extra ?? 0), q.id).toBe(v[0])
      expect(new Set(h.counts).size, q.id).toBe(1)
      expect(h.extra ?? 0, q.id).toBeLessThan(h.counts.length)
      n++
    })
    expect(n).toBeGreaterThan(20)
  })

  it('例 2 的算式做成选项时：有「商 + 余数」「只看商」这两种错，不和答案重复', () => {
    let n = 0
    each((q) => {
      if (!sig(q).startsWith('divc')) return
      const [a, b] = nums(text(q))
      const opts = q.choices!.map((c) => Number(zh(c.label)))
      expect(opts).toContain(Math.floor(a! / b!))
      if (a! % b! >= 2) expect(opts).toContain(Math.floor(a! / b!) + (a! % b!))
      expect(new Set(opts).size).toBe(opts.length)
      n++
    })
    expect(n).toBeGreaterThan(5)
  })
})

describe('课本的例题和做一做第 1 档都出得到', () => {
  it('例 1–3、六个做一做、你知道吗', () => {
    const gen = getGenerator(K)!
    const s = new Set<string>()
    for (let seed = 1; seed <= 800; seed++) s.add(sig(gen(1, createRng(seed))))
    for (const want of ['ex1-pencil-4-3', 'enum-4-3', 'hyp-max-3', 'hyp-left-4-3', 'hyp-book-2-3', 'zodiac-13', 'pigeon-5-3', 'pigeon-11-4', 'ex1-apple-10-9', 'ex1-nest-6-5', 'ex2-7-3', 'ex2-8-3', 'ex2-10-3', 'div-7-3', 'poker-9', 'ball2-4', 'bag-4-10', 'bday-day-367', 'bday-month-37'])
      expect(s.has(want), want).toBe(true)
  })
  it('练习十三：第 2 档出得到课本的数（41 环、蓝黄两色、筷子各 3 根、3 个自然数、3 行 9 列 / 两行 9 列），第 3 档 2 双筷子', () => {
    const gen = getGenerator(K)!
    const s2 = new Set<string>()
    const s3 = new Set<string>()
    for (let seed = 1; seed <= 800; seed++) {
      s2.add(sig(gen(2, createRng(seed))))
      s3.add(sig(gen(3, createRng(seed))))
    }
    for (const want of ['darts-5-41', 'cube-2', 'chop-3-3', 'parity-3', 'cols-same-3-9', 'cols-same-2-9', 'cols-ways-3']) expect(s2.has(want), want).toBe(true)
    expect(s3.has('chop2-3')).toBe(true)
  })
})

describe('朗读与文字', () => {
  it('不写「属相」「六（2）班」「镖」当量词；数是 2 的种、列、行、环写汉字', () => {
    each((q) => {
      const t = text(q)
      expect(t, q.id).not.toMatch(/属相|（\d）班|\d\s*镖|量一量|还|得/)
      expect(t, q.id).not.toMatch(/(?<![\d.])2\s*(种|列|行|环|号)/)
    })
  })
})
