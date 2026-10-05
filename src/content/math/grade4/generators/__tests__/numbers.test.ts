import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { pinyinOf, translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { cnRead, cnWords, readWrongs, roundTo, unpadded, writeWrongs, zeroSwaps, EV_SALES, PLANETS, POPULATION } from '../numbers'

// 四上「万以上数的认识」四个知识点的专项检查：读法照课本（课本里的数逐个核对）、从题目本身（大数卡、计数器、算盘、词条参数）反推答案；
// 改写只出整万 / 整亿（用 =），近似数只省略万位 / 亿位后面的尾数（用 ≈）；数的范围照课本；第 1 档出得到每个例题与做一做的题型。
const SEEDS = 150
const zh = (l: LStr): string => translate(l, 'zh')
type Big = Extract<StemPart, { kind: 'big-num' }>

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sig = (q: Question): string => q.id.slice(q.kpId.length + 1)
const kind = (q: Question): string => sig(q).split('-')[0]!
const part = <K extends StemPart['kind']>(q: Question, k: K): Extract<StemPart, { kind: K }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === k)
const texts = (q: Question): { k: string; p?: Record<string, unknown> }[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text' && typeof p.text === 'object').map((p) => p.text as { k: string; p?: Record<string, unknown> })
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const correct = (q: Question): string =>
  q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
const correctChoice = (q: Question) => q.choices?.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)
const answerNum = (q: Question): number => Number(correct(q))

/** 课本读法 → 数（独立的解析：按「亿」「万」分级，零不占位） */
function parseCn(s: string): number {
  const DIG: Record<string, number> = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  const U: Record<string, number> = { 十: 10, 百: 100, 千: 1000 }
  let total = 0
  let section = 0
  let num = 0
  for (const ch of s) {
    if (ch in DIG) num = DIG[ch]!
    else if (ch in U) {
      section += (num || 1) * U[ch]!
      num = 0
    } else if (ch === '万') {
      total += (section + num) * 1e4
      section = 0
      num = 0
    } else if (ch === '亿') {
      total = (total + section + num) * 1e8
      section = 0
      num = 0
    } else throw new Error(`读法里有不认识的字：${s}`)
  }
  return total + section + num
}

describe('读法（课本 p4 例 2 的框）', () => {
  it('课本里的数逐个核对：例 1–5、做一做、练习一至练习四', () => {
    const cases: [number, string][] = [
      [2496, '二千四百九十六'],
      [24960000, '二千四百九十六万'],
      [3080000, '三百零八万'],
      [40500000, '四千零五十万'],
      [54621, '五万四千六百二十一'],
      [6407000, '六百四十万七千'],
      [10030040, '一千零三万零四十'],
      [340000, '三十四万'],
      [3400000, '三百四十万'],
      [30040000, '三千零四万'],
      [30400000, '三千零四十万'],
      [569200, '五十六万九千二百'],
      [3706000, '三百七十万六千'],
      [40080501, '四千零八万零五百零一'],
      [32680, '三万二千六百八十'],
      [5205000, '五百二十万五千'],
      [1200605, '一百二十万零六百零五'],
      [107070, '十万七千零七十'],
      [470050, '四十七万零五十'],
      [3070800, '三百零七万零八百'],
      [30600900, '三千零六十万零九百'],
      [100000000, '一亿'],
      [230184, '二十三万零一百八十四'],
      [102345, '十万二千三百四十五'],
      [3026000, '三百零二万六千'],
      [20400700, '二千零四十万零七百'],
      [3267500, '三百二十六万七千五百'],
      [40090, '四万零九十'],
      [90200300, '九千零二十万零三百'],
      [299800, '二十九万九千八百'],
      [48320000, '四千八百三十二万'],
      [28587, '二万八千五百八十七'],
      [7035000, '七百零三万五千'],
      [142950, '十四万二千九百五十'],
      [60123, '六万零一百二十三'],
      [37000040, '三千七百万零四十'],
      [40075700, '四千零七万五千七百'],
      [60090500, '六千零九万零五百'],
      [96000000, '九千六百万'],
      [13909000, '一千三百九十万九千'],
      [860100, '八十六万零一百'],
      [13090034, '一千三百零九万零三十四'],
      [21893095, '二千一百八十九万三千零九十五'],
      [8000000000, '八十亿'],
      [10040002000, '一百亿四千万二千'],
      [400305000000, '四千零三亿零五百万'],
      [9200000000, '九十二亿'],
      [26705000000, '二百六十七亿零五百万'],
      [508040003000, '五千零八十亿四千万三千'],
      [300700400, '三亿零七十万零四百'],
      [19336275, '一千九百三十三万六千二百七十五'],
      [456146658, '四亿五千六百一十四万六千六百五十八'],
      [300000000, '三亿'],
      [3090001500, '三十亿九千万一千五百'],
      [700300200000, '七千零三亿零二十万'],
      [2500000000, '二十五亿'],
      [49000600000, '四百九十亿零六十万'],
      [500407001306, '五千零四亿零七百万一千三百零六'],
      [6500000000, '六十五亿'],
      [407500000000, '四千零七十五亿'],
      [240000000, '二亿四千万'],
      [84093000000, '八百四十亿九千三百万'],
      [506200000, '五亿零六百二十万'],
      [60450003200, '六百零四亿五千万三千二百'],
      [3080070000, '三十亿八千零七万'],
      [206000090040, '二千零六十亿零九万零四十'],
      [1443497378, '十四亿四千三百四十九万七千三百七十八'],
      [4005900, '四百万五千九百'],
      [384080000, '三亿八千四百零八万'],
      [100339000000, '一千零三亿三千九百万'],
      [1862690, '一百八十六万二千六百九十'],
      [10909, '一万零九百零九'],
      [706498900, '七亿零六百四十九万八千九百'],
      [5615000000, '五十六亿一千五百万'],
      [724000000, '七亿二千四百万'],
    ]
    for (const [n, r] of cases) expect(cnRead(n), String(n)).toBe(r)
  })

  it('三种错法：一个零也不读、连续的 0 读两个零、每级末尾的 0 也读了', () => {
    expect(cnRead(10030040, 'none')).toBe('一千三万四十')
    expect(cnRead(10030040, 'double')).toBe('一千零零三万零零四十')
    expect(cnRead(6407000, 'trail')).toBe('六百四十万零七千')
    expect(cnRead(300700400, 'double')).toBe('三亿零零七十万零四百')
  })

  it('任意的数：读法解析回来还是这个数；读法里没有「两」、没有连续两个零、零不在末尾也不在「万」「亿」前面', () => {
    const rng = createRng(7)
    for (let i = 0; i < 3000; i++) {
      const len = rng.int(1, 12)
      let s = String(rng.int(1, 9))
      for (let k = 1; k < len; k++) s += rng.chance(0.45) ? '0' : String(rng.int(1, 9))
      const n = Number(s)
      const r = cnRead(n)
      expect(parseCn(r), `${n} → ${r}`).toBe(n)
      expect(r).not.toMatch(/两|零零|零$|零万|零亿|^一十/)
    }
  })

  it('读法词条：一个字一条，「一」在千、百前面注 yì，在万、亿前面注 yí（十一万的一注 yī）', () => {
    const py = (s: string): string[] => {
      const l = cnWords(s) as { k: string; p: Record<string, { k: string }> }
      expect(l.k).toBe(`m4.num.seq.${Array.from(s).length}`)
      expect(zh(l), s).toBe(s)
      return Object.values(l.p).map((c) => pinyinOf(c.k)!)
    }
    expect(py('一千零一万')).toEqual(['yì', 'qiān', 'líng', 'yí', 'wàn'])
    expect(py('一亿零一百')).toEqual(['yí', 'yì', 'líng', 'yì', 'bǎi'])
    expect(py('十一万')).toEqual(['shí', 'yī', 'wàn'])
    expect(py('五千六百一十四万')).toEqual(['wǔ', 'qiān', 'liù', 'bǎi', 'yī', 'shí', 'sì', 'wàn'])
    // 英文界面也显示汉字（考的是汉字读法）
    expect(translate(cnWords('二千零四十万零七百'), 'en')).toBe('二千零四十万零七百')
  })

  it('读法的干扰项：都不是课本读法、互不相同；整万的数有一项是漏了「万」（2496 和 24960000）', () => {
    const rng = createRng(3)
    for (const n of [24960000, 10030040, 6407000, 54621, 100000000, 8000000000, 500407001306]) {
      const w = readWrongs(n, rng)
      expect(w.length, String(n)).toBe(3)
      expect(new Set(w).size).toBe(3)
      expect(w).not.toContain(cnRead(n))
    }
    expect(readWrongs(24960000, createRng(1))).toContain('二千四百九十六')
  })

  it('写数的干扰项：每级前面的 0 漏写、多写 / 少写 0、0 写错位置', () => {
    expect(unpadded(700300200000)).toBe(7003200000)
    expect(unpadded(400305000000)).toBe(40035000000)
    expect(unpadded(24960000)).toBe(24960000)
    expect(zeroSwaps(10030040)).toEqual([10300040, 10003040, 10030400, 10030004])
    const w = writeWrongs(700300200000, createRng(5))
    expect(w).toContain(7003200000)
    expect(w).not.toContain(700300200000)
  })
})

/** 每种题从题目本身反推答案（大数卡、计数器、算盘、词条参数） */
function checkNumberQuestion(q: Question): void {
  const k = kind(q)
  const big = part(q, 'big-num') as Big | undefined
  const n = big?.n ? Number(big.n) : NaN
  switch (k) {
    case 'read': {
      expect(correct(q), q.id).toBe(cnRead(n))
      for (const l of labels(q)) expect(l, q.id).toMatch(/^[零一二三四五六七八九十百千万亿]+$/)
      expect(correctChoice(q)!.say, q.id).toBe(big!.n)
      // 读作题：数在卡上，题干朗读不读数
      expect(questionSpeech(q, 'zh').join(''), q.id).not.toMatch(/\d|万|亿/)
      break
    }
    case 'write': {
      const v = parseCn(zh(big!.words!))
      expect(answerNum(q), q.id).toBe(v)
      expect(big!.say, q.id).toBe(String(v))
      expect(zh(big!.words!), q.id).toBe(cnRead(v))
      break
    }
    case 'wctx': {
      const t = zh({ k: texts(q)[0]!.k })
      const m = /[零一二三四五六七八九十百千万亿]{2,}/.exec(t.replace(/千克|千米/g, '').replace(/^.*?(?:铸了|传播|由|跳动|有|为)/, ''))
      expect(m, q.id).not.toBeNull()
      expect(answerNum(q), q.id).toBe(parseCn(m![0]))
      break
    }
    case 'ctr': {
      const c = part(q, 'counter')!
      expect(answerNum(q), q.id).toBe(Number(c.beads.join('')))
      expect(c.beads.length, q.id).toBe(c.top + 1)
      break
    }
    case 'abacus':
      expect(correct(q), q.id).toBe(String(Number(part(q, 'abacus')!.n)))
      break
    case 'mean': {
      const i = big!.marks![0]!
      const digit = Number(big!.n![i])
      const place = big!.n!.length - 1 - i
      expect(correct(q), q.id).toBe(zh({ k: digit === 1 ? 'm4.num.cnt1' : 'm4.num.cnt', p: { n: digit, u: { k: `m4.num.unit.${place}` } } }))
      expect(digit, q.id).toBeGreaterThan(0)
      break
    }
    case 'comp': {
      const parts = [Math.floor(n / 1e8), Math.floor(n / 1e4) % 1e4, n % 1e4]
      const t = texts(q)[0]!
      const [, key, letter] = /^m4\.num\.comp\.(\w+)\.([abc])$/.exec(t.k)!
      const names = ['Yi', 'Wan', 'One'].filter((_, i) => parts[i]! > 0)
      expect(key, q.id).toBe(names.join(''))
      const idx = [0, 1, 2].filter((i) => parts[i]! > 0)
      const ask = idx['abc'.indexOf(letter!)]!
      expect(answerNum(q), q.id).toBe(parts[ask])
      // 题目里给出的另外几份也对
      idx.forEach((i, j) => {
        if (i !== ask) expect(t.p!['abc'[j]!], q.id).toBe(parts[i])
      })
      break
    }
    case 'made': {
      const t = texts(q)[0]!
      const sum = Object.values(t.p!).reduce<number>((s, c) => {
        const cnt = c as { k: string; p: { n: number; u: { k: string } } }
        return s + cnt.p.n * 10 ** Number(cnt.p.u.k.split('.').pop())
      }, 0)
      expect(answerNum(q), q.id).toBe(sum)
      break
    }
    case 'sum':
    case 'split': {
      const expr = part(q, 'expr')!.expr
      const [lhs, rhs] = expr.split(' = ')
      if (k === 'sum') {
        expect(rhs, q.id).toBe('?')
        expect(answerNum(q), q.id).toBe(lhs!.split(' + ').reduce((s, x) => s + Number(x), 0))
      } else {
        const terms = rhs!.split(' + ')
        const known = terms.filter((x) => x !== '?').reduce((s, x) => s + Number(x), 0)
        expect(answerNum(q), q.id).toBe(Number(lhs) - known)
      }
      break
    }
    case 'count':
    case 'line': {
      const p = texts(q)[0]!.p!
      const [a, b, c] = [p.a, p.b, p.c] as number[]
      expect(b! - a!, q.id).toBe(c! - b!)
      expect(answerNum(q), q.id).toBe(c! + (c! - b!))
      // 一万一万地数：步长就是题目说的计数单位
      expect(c! - b!, q.id).toBe(10 ** Number((p.s as { k: string }).k.split('.').pop()))
      break
    }
    case 'order':
      expect(answerNum(q), q.id).toBe(Number((texts(q)[0]!.p!.p as { k: string }).k.split('.').pop()) + 1)
      break
    case 'nb': {
      const p = Number((texts(q)[0]!.p!.p as { k: string }).k.split('.').pop())
      const left = texts(q)[0]!.k === 'm4.num.leftOf'
      expect(correct(q), q.id).toBe(zh({ k: `m4.num.place.${left ? p + 1 : p - 1}` }))
      break
    }
    case 'lv': {
      const p = Number((texts(q)[0]!.p!.p as { k: string }).k.split('.').pop())
      expect(correct(q), q.id).toBe(zh({ k: `m4.num.level.${Math.floor(p / 4)}` }))
      break
    }
    case 'table': {
      const t = part(q, 'place-table')!
      expect(correct(q), q.id).toBe(zh({ k: `m4.num.place.${t.ask}` }))
      // 选项都在表里（亿以内的表不出十亿位）
      for (const l of labels(q)) expect([...Array(t.top + 1).keys()].map((p) => zh({ k: `m4.num.place.${p}` })), q.id).toContain(l)
      break
    }
    case 'high': {
      const len = Number((texts(q)[0]!.p!.k as { k: string }).k.split('.').pop())
      expect(correct(q), q.id).toBe(zh({ k: `m4.num.place.${len - 1}` }))
      break
    }
    case 'highof':
      expect(correct(q), q.id).toBe(zh({ k: `m4.num.place.${big!.n!.length - 1}` }))
      break
    case 'len':
      expect(answerNum(q), q.id).toBe(big!.n!.length)
      break
    case 'at': {
      const p = Number((texts(q)[0]!.p!.p as { k: string }).k.split('.').pop())
      expect(answerNum(q), q.id).toBe(Math.floor(n / 10 ** p) % 10)
      break
    }
    case 'ten': {
      const p = Number((texts(q)[0]!.p!.a as { k: string }).k.split('.').pop())
      expect(correct(q), q.id).toBe(zh({ k: `m4.num.pow.${p + 1}` }))
      expect(correctChoice(q)!.say, q.id).toBe(String(10 ** (p + 1)))
      const ctr = part(q, 'counter')
      if (ctr) expect(ctr.beads.filter((b) => b === 10).length, q.id).toBe(1)
      break
    }
    case 'in':
      expect(answerNum(q), q.id).toBe(10)
      break
    case 'rate': {
      const t = texts(q)[0]!
      const p = (x: unknown): number => Number((x as { k: string }).k.split('.').pop())
      if (t.k === 'm4.num.tenIsOne') expect(correct(q), q.id).toBe(zh({ k: `m4.num.unit.${p(t.p!.a) + 1}` }))
      else if (t.k === 'm4.num.oneIsTen') expect(correct(q), q.id).toBe(zh({ k: `m4.num.unit.${p(t.p!.a) - 1}` }))
      else if (t.k === 'm4.num.oneIsHowMany') expect(answerNum(q), q.id).toBe(10 ** (p(t.p!.a) - p(t.p!.b)))
      else expect(answerNum(q), q.id).toBe(10 * 10 ** (p(t.p!.a) - p(t.p!.b)))
      break
    }
    case 'max':
    case 'min': {
      const len = Number((texts(q)[0]!.p!.k as { k: string }).k.split('.').pop())
      expect(answerNum(q), q.id).toBe(k === 'max' ? 10 ** len - 1 : 10 ** (len - 1))
      break
    }
    case 'nat':
    case 'sense':
    case 'term':
    case 'radix':
      break
    default:
      throw new Error(`没核对过的题：${q.id}`)
  }
}

describe('亿以内数的认识（m4s1-01-within-yi）', () => {
  const KP = 'm4s1-01-within-yi'
  it('从题目反推答案；大数卡上的数连写、最多 9 位（亿以内，加上一亿）', () => {
    each(KP, (q) => {
      checkNumberQuestion(q)
      for (const p of q.stem) {
        if (p.kind !== 'big-num' || !p.n) continue
        expect(p.n, q.id).toMatch(/^[1-9]\d*$/)
        expect(p.n.length, q.id).toBeLessThanOrEqual(9)
      }
    })
  })
  it('第 1 档出得到课本这一节的每种题：计数单位、数数、数位顺序表、例 1 / 例 2 读、例 3 写、含义、组成、计数器、自然数', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 400; seed++) seen.add(kind(getGenerator(KP)!(1, createRng(seed))))
    for (const k of ['read', 'write', 'wctx', 'ten', 'in', 'count', 'order', 'nb', 'table', 'lv', 'mean', 'comp', 'made', 'ctr', 'nat', 'term']) expect(seen, k).toContain(k)
    expect(seen.has('sum') || seen.has('split')).toBe(true)
  })
  it('课本里的数常出：例 1 的 24960000、例 2 的 10030040、例 3 的 230184 这些', () => {
    const nums = new Set<string>()
    for (let seed = 1; seed <= 5000; seed++) {
      const q = getGenerator(KP)!(1, createRng(seed))
      if (['read', 'write'].includes(kind(q))) nums.add(sig(q).split('-')[1]!)
    }
    for (const n of ['24960000', '10030040', '6407000', '1200605', '230184', '20400700', '48320000']) expect(nums, n).toContain(n)
  })
})

describe('亿以上数的认识（m4s1-01-above-yi）', () => {
  const KP = 'm4s1-01-above-yi'
  it('从题目反推答案；数到千亿位（最多 12 位），亿以上的写数用选项卡', () => {
    each(KP, (q) => {
      checkNumberQuestion(q)
      for (const p of q.stem) if (p.kind === 'big-num' && p.n) expect(p.n.length, q.id).toBeLessThanOrEqual(12)
      if (kind(q) === 'write' && answerNum(q) >= 1e9) expect(q.input, q.id).toBe('choice')
    })
  })
  it('第 1 档出得到：十亿 / 百亿 / 千亿、十进制计数法、数位顺序表、例 4 读、例 5 写、组成、最高位、进率、算盘、计数器、合不合理、最大最小', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 500; seed++) seen.add(kind(getGenerator(KP)!(1, createRng(seed))))
    for (const k of ['read', 'write', 'ten', 'table', 'order', 'comp', 'high', 'rate', 'abacus', 'ctr', 'sense']) expect(seen, k).toContain(k)
    expect(seen.has('radix') || seen.has('term')).toBe(true)
    expect(seen.has('max') || seen.has('min')).toBe(true)
  })
  it('练习二 7 的四个算盘都出得到', () => {
    const nums = new Set<string>()
    for (let seed = 1; seed <= 800; seed++) {
      const q = getGenerator(KP)!(1, createRng(seed))
      if (kind(q) === 'abacus') nums.add(part(q, 'abacus')!.n)
    }
    for (const n of ['602', '534067', '35215862', '60470025000']) expect(nums, n).toContain(n)
  })
})

describe('数的大小比较（m4s1-01-compare）', () => {
  const KP = 'm4s1-01-compare'
  const value = (s: string, unit?: 'wan' | 'yi'): number => Number(s) * (unit === 'wan' ? 1e4 : unit === 'yi' ? 1e8 : 1)
  it('从卡上的两个数反推 >、<、=；表里的数挑最多 / 最少；□ 里能填几', () => {
    each(KP, (q) => {
      const k = kind(q)
      const big = part(q, 'big-num')
      if (k === 'cmp') {
        const a = Number(big!.n)
        const b = value(big!.rhs!, big!.unit)
        expect(correct(q), q.id).toBe(a > b ? '>' : a < b ? '<' : '=')
        expect(labels(q).sort(), q.id).toEqual(['<', '=', '>'])
        // 数在卡上，题干只读「比一比」
        expect(questionSpeech(q, 'zh').join(''), q.id).not.toMatch(/\d/)
        if (!big!.unit) expect(a, q.id).not.toBe(b)
      } else if (k === 'crop' || k === 'planet') {
        const rows = part(q, 'stat-table')!.rows.slice(1) as [LStr, number][]
        const max = texts(q)[0]!.k.endsWith('Max') || texts(q)[0]!.k.endsWith('Far')
        const best = rows.reduce((x, y) => ((max ? y[1] > x[1] : y[1] < x[1]) ? y : x))
        expect(correct(q), q.id).toBe(zh(best[0]))
      } else if (k === 'ext') {
        const nums = labels(q).map(Number)
        expect(answerNum(q), q.id).toBe(texts(q)[0]!.k === 'm4.num.maxOf' ? Math.max(...nums) : Math.min(...nums))
      } else if (k === 'box' || k === 'box1') {
        // 把 0–9 逐个填进去，能让式子成立的数字
        const ok = [...Array(10).keys()].filter((dgt) => {
          const l = Number(big!.n!.replace('□', String(dgt)))
          const r = Number(big!.rhs!.replace('□', String(dgt)))
          if (/^0/.test(big!.n!.replace('□', String(dgt))) || /^0/.test(big!.rhs!.replace('□', String(dgt)))) return false
          return big!.rel === '<' ? l < r : l > r
        })
        expect(answerNum(q), q.id).toBe(k === 'box1' ? ok[0] : Math.min(...ok))
        if (k === 'box1') expect(ok, q.id).toEqual([9])
      } else throw new Error(`没核对过的题：${q.id}`)
    })
  })
  it('第 1 档：例 6 与做一做（位数不同、位数相同都有，农产品产量），课本的几组数都出得到', () => {
    const seen = new Set<string>()
    let diffLen = 0
    let sameLen = 0
    for (let seed = 1; seed <= 600; seed++) {
      const q = getGenerator(KP)!(1, createRng(seed))
      seen.add(q.id)
      if (kind(q) !== 'cmp') continue
      const big = part(q, 'big-num')!
      if (big.n!.length === big.rhs!.length) sameLen++
      else diffLen++
    }
    expect(diffLen).toBeGreaterThan(80)
    expect(sameLen).toBeGreaterThan(80)
    for (const s of ['cmp-207534900-20647800', 'cmp-92504-103600', 'cmp-28906-28890', 'cmp-100388770000-99385270000', 'crop-max', 'crop-min'].map((x) => `${KP}:${x}`)) {
      const pair = s.replace(/cmp-(\d+)-(\d+)/, 'cmp-$2-$1')
      expect(seen.has(s) || seen.has(pair), s).toBe(true)
    }
  })
})

describe('数的改写和求近似数（m4s1-01-round）', () => {
  const KP = 'm4s1-01-round'
  const U = { wan: 1e4, yi: 1e8 }
  it('改写只出整万 / 整亿、用「=」；近似数省略万位 / 亿位后面的尾数、用「≈」，按四舍五入', () => {
    each(KP, (q) => {
      const k = kind(q)
      const big = part(q, 'big-num')
      const n = big?.n ? Number(big.n) : big?.words ? parseCn(zh(big.words)) : NaN
      if (k === 'rw' || k === 'blood' || k === 'pw') {
        expect(big!.rel, q.id).toBe('=')
        expect(n % U[big!.unit!], q.id).toBe(0)
        expect(answerNum(q), q.id).toBe(n / U[big!.unit!])
      } else if (k === 'rd' || k === 'rw2' || k === 'pop' || k === 'ev') {
        expect(big!.rel, q.id).toBe('≈')
        expect(n % U[big!.unit!], q.id).not.toBe(0)
        expect(answerNum(q), q.id).toBe(Math.round(n / U[big!.unit!]))
        if (k === 'rw2') expect(big!.say, q.id).toBe(String(n))
      } else if (k === 'rdf') {
        // 例 8 的第一步只写省略万位的（182068 ≈ 180000），选项是五六位的数
        expect(answerNum(q), q.id).toBe(Math.round(n / 1e4) * 1e4)
        for (const l of labels(q)) expect(l.length, q.id).toBeLessThanOrEqual(7)
      } else if (k === 'sr') {
        const unit = texts(q)[0]!.k.endsWith('Wan') ? 'wan' : 'yi'
        const top = Math.floor(n / (U[unit] / 10)) % 10
        expect(correct(q), q.id).toBe(top >= 5 ? '入' : '舍')
      } else if (k === 'look') {
        expect(correct(q), q.id).toBe(texts(q)[0]!.k === 'm4.num.lookWan' ? '千位' : '千万位')
      } else if (k === 'rel') {
        const k2 = Number(big!.rhs)
        expect(big!.rel, q.id).toBe('?')
        expect(Math.round(n / U[big!.unit!]), q.id).toBe(k2)
        expect(correct(q), q.id).toBe(n % U[big!.unit!] === 0 ? '=' : '≈')
      } else if (k === 'ae') {
        const approx = /约|大约|多是|多米/.test(zh({ k: texts(q)[0]!.k }).split('这里')[0]!)
        expect(correct(q), q.id).toBe(approx ? '近似数' : '准确数')
      } else if (k === 'rctx') {
        const t = zh({ k: texts(q)[0]!.k })
        const reading = /[零一二三四五六七八九十百千万亿]{3,}/.exec(t.replace(/^\d+ 年，/, ''))![0]
        const v = parseCn(reading)
        expect(answerNum(q), q.id).toBe(Math.round(v / (t.includes('亿位') ? 1e8 : 1e4)))
      } else if (k === 'boxr') {
        const unit = big!.unit!
        const ok = [...Array(10).keys()].filter((dgt) => Math.round(Number(big!.n!.replace('□', String(dgt))) / U[unit]) === Number(big!.rhs))
        expect(answerNum(q), q.id).toBe(texts(q)[0]!.k === 'm4.num.boxMax' ? Math.max(...ok) : Math.min(...ok))
      } else throw new Error(`没核对过的题：${q.id}`)
      // 改写、求近似数的卡：右边是要填的空，练习页把按的数填进去
      if (big?.rhs === '?' && q.input === 'numpad') expect(['rw', 'blood', 'pw', 'rd', 'rw2', 'pop', 'ev'], q.id).toContain(k)
    })
  })
  it('近似数的尾数最高位：小于 5、等于 5、大于 5 都有；有「入」成新的一位的（9.5 亿 ≈ 10 亿）', () => {
    const tops = new Set<number>()
    let carry = 0
    for (let seed = 1; seed <= 600; seed++) {
      const q = getGenerator(KP)!(1, createRng(seed))
      if (kind(q) !== 'rd') continue
      const big = part(q, 'big-num')!
      const n = Number(big.n)
      const u = big.unit === 'wan' ? 1e4 : 1e8
      tops.add(Math.floor(n / (u / 10)) % 10)
      if (String(Math.round(n / u)).length > String(Math.floor(n / u)).length) carry++
    }
    for (const t of [0, 3, 5, 7, 9]) expect(tops, String(t)).toContain(t)
    expect(carry).toBeGreaterThan(0)
  })
  it('第 1 档：例 7（改写）、例 8（四舍五入、舍还是入、看哪一位）、试一试、做一做，= 和 ≈ 分清、近似数与准确数', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 500; seed++) {
      const q = getGenerator(KP)!(1, createRng(seed))
      const big = part(q, 'big-num')
      seen.add(`${kind(q)}${big?.unit ? `-${big.unit}` : ''}`)
    }
    for (const k of ['rw-wan', 'rw-yi', 'rd-wan', 'rd-yi', 'rdf', 'sr', 'rel-wan', 'rel-yi', 'ae', 'look', 'blood-wan']) expect(seen, k).toContain(k)
  })
  it('课本的数据：人口、电动汽车销量、行星距离与练习三、练习四的答案一致', () => {
    expect(Object.fromEntries(POPULATION.map(([id, n]) => [id, roundTo(n, 'wan')]))).toMatchObject({ shanghai: 2487, shanxi: 3492, zhejiang: 6457, hunan: 6644, guangxi: 5013, yunnan: 4721 })
    expect(EV_SALES.map(([, n]) => roundTo(n, 'wan'))).toEqual([65, 98, 97, 112, 292, 537, 669, 772])
    expect(PLANETS.every(([, n]) => n % 1e4 === 0)).toBe(true)
  })
})
