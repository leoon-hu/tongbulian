import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { answerSpeech, questionSpeech, tokenize } from '@/engine/speech'
import { decReading, decWrongs } from '../decimals'

// 三下「小数的初步认识」三个知识点的专项检查：从题目本身（词条参数、钱、十等分图、米尺、算式）反推答案；
// 小数答案一律选项卡、选项互不相等且写法合规（没有「x.0」）、干扰项都是错的；范围与分档照课本笔记；不用 ¥。
const SEEDS = 150
const zh = (l: LStr): string => translate(l, 'zh')
/** 按千分之一取整比大小，免得浮点误差 */
const milli = (s: string | number): number => {
  const m = /^(\d+)\/(\d+)$/.exec(String(s))
  return m ? Math.round((Number(m[1]) / Number(m[2])) * 1000) : Math.round(Number(s) * 1000)
}

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const texts = (q: Question): { k: string; p: Record<string, unknown> }[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text' && typeof p.text === 'object').map((p) => p.text as { k: string; p: Record<string, unknown> })
/** 第一条有参数的词条（没有就第一条） */
const main = (q: Question): { k: string; p: Record<string, unknown> } => texts(q).find((t) => t.p && t.k !== 'm3.dec.compare') ?? texts(q)[0]!
const part = <K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === kind)
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const correctLabel = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
/** 选项去掉单位后的数（「0.3 米」→ 0.3）；不是数返回 null */
const numOf = (label: string): string | null => /^(\d+(?:\.\d+)?|\d+\/\d+)(?: \S+)?$/.exec(label)?.[1] ?? null
const str = (x: unknown): string => String(x)

function expectValue(q: Question, value: number | string, unit?: string): void {
  const c = correctLabel(q)
  const n = numOf(c)
  expect(n, `${q.id} 正确答案「${c}」不是数`).not.toBeNull()
  expect(milli(n!), `${q.id}：「${c}」应是 ${value}`).toBe(milli(value))
  if (unit) expect(c, q.id).toMatch(new RegExp(` ${unit}$`))
}

/** 小数选项的通用约束 */
function decChoicesOk(q: Question): void {
  const ns = labels(q).map(numOf)
  if (ns.some((n) => n === null)) return
  const vals = ns.map((n) => milli(n!))
  expect(new Set(vals).size, `${q.id} 选项 ${labels(q)} 有两个相等`).toBe(vals.length)
  for (const n of ns) {
    expect(n, `${q.id} 选项写法「${n}」`).toMatch(/^(0|[1-9]\d*)(\.\d+)?$|^\d+\/\d+$/)
    // 干扰项不出「5.0」这种（课本这一单元没讲小数末尾的 0 能不能去掉）
    if (n !== numOf(correctLabel(q))) expect(n, q.id).not.toMatch(/\.0$/)
  }
  // 选项单位一致
  const units = new Set(labels(q).map((l) => l.split(' ')[1] ?? ''))
  if (labels(q).length) expect(units.size, q.id).toBe(1)
}

/** 读法词条 → 小数（decReading 的逆） */
function fromReading(r: { k: string; p: Record<string, unknown> }): string {
  const dig = (x: unknown): string => (typeof x === 'object' && x ? String((x as { k: string }).k.split('.').pop()) : '')
  const i = r.p.i as { k: string; p?: Record<string, unknown> }
  const int = i.k === 'm3.dec.tens' ? Number(dig(i.p!.a) || '1') * 10 + Number(dig(i.p!.b) || '0') : Number(dig(i))
  return `${int}.${dig(r.p.a)}${dig(r.p.b)}`
}

describe('小数：工具', () => {
  it('decWrongs 去掉写法不对的、和正确答案相等的、彼此相等的、「x.0」', () => {
    expect(decWrongs('0.3', ['3', '0.30', '03', '0.03', '3.0', '0.03', '30'])).toEqual(['3', '0.03', '30'])
  })
  it('读法：整数部分按整数读、小数部分一位一位读、0 读「零」', () => {
    const cases: [string, string, string][] = [
      ['3.45', '三点四五', 'three point four five'],
      ['0.05', '零点零五', 'zero point zero five'],
      ['4.20', '四点二零', 'four point two zero'],
      ['36.6', '三十六点六', 'thirty-six point six'],
      ['18.5', '十八点五', 'eighteen point five'],
      ['10.8', '十点八', 'ten point eight'],
      ['20.1', '二十点一', 'twenty point one'],
    ]
    for (const [x, z, e] of cases) {
      expect(translate(decReading(x), 'zh')).toBe(z)
      expect(translate(decReading(x), 'en')).toBe(e)
      expect(fromReading(decReading(x) as { k: string; p: Record<string, unknown> })).toBe(x)
    }
  })
})

describe('m3s2-07-know 认识小数', () => {
  it('从题目反推答案；分档与范围', () => {
    each('m3s2-07-know', (q, d) => {
      decChoicesOk(q)
      const t = main(q)
      const p = t.p ?? {}
      switch (t.k) {
        case 'm3.dec.dmToM':
          return expectValue(q, Number(p.n) / 10, '米')
        case 'm3.dec.jiaoToYuan':
          return expectValue(q, Number(p.n) / 10, '元')
        case 'm3.dec.mdmToM':
          return expectValue(q, Number(p.a) + Number(p.b) / 10, '米')
        case 'm3.dec.yjToYuan':
          return expectValue(q, Number(p.a) + Number(p.b) / 10, '元')
        case 'm3.dec.money': {
          const fen = part(q, 'money')!.pieces.reduce((s, x) => s + x.fen, 0)
          expect(fen % 10).toBe(0)
          return expectValue(q, fen / 100, '元')
        }
        case 'm3.dec.bar':
        case 'm3.dec.barWhole': {
          const pic = part(q, 'frac-shape')!.items[0]!
          expect(pic.parts).toBe(10)
          if (t.k === 'm3.dec.bar') expect(pic.whole ?? 0).toBe(0)
          return expectValue(q, (pic.whole ?? 0) + pic.shaded.length / 10)
        }
        case 'm3.dec.tenthsIn':
          return expectValue(q, Math.round(Number(p.x) * 10))
        case 'm3.dec.tenthsMake':
          return expectValue(q, Number(p.k) / 10)
        case 'm3.dec.fracToDec':
        case 'm3.dec.fracMToDec':
          return expectValue(q, str(p.f), t.k === 'm3.dec.fracMToDec' ? '米' : undefined)
        case 'm3.dec.decToFrac': {
          const c = correctLabel(q)
          expect(c, q.id).toMatch(/^\d+\/10$/)
          expect(milli(c)).toBe(milli(str(p.x)))
          // 分数选项互不相等
          expect(new Set(labels(q).map(milli)).size).toBe(labels(q).length)
          return
        }
        case 'm3.dec.writeAs': {
          const x = fromReading(p.r as { k: string; p: Record<string, unknown> })
          expect(correctLabel(q), q.id).toBe(x)
          const digits = x.split('.')[1]!.length
          if (d === 1) expect([1, 2]).toContain(digits)
          if (d === 2) expect(digits).toBe(2)
          return
        }
        case 'm3.dec.yuanToJiao':
          return expectValue(q, Math.round(Number(p.x) * 10))
        case 'm3.dec.mToDm':
          expect(Math.floor(Number(p.x))).toBe(Number(p.a))
          return expectValue(q, Math.round(Number(p.x) * 10) % 10)
        case 'm3.dec.cmToM':
          return expectValue(q, Number(p.n) / 100, '米')
        case 'm3.dec.fenToYuan':
          return expectValue(q, Number(p.n) / 100, '元')
        case 'm3.dec.mcmToM':
          return expectValue(q, Number(p.a) + Number(p.b) / 100, '米')
        case 'm3.dec.yjfToYuan':
          return expectValue(q, Number(p.a) + Number(p.b) / 10 + Number(p.c) / 100, '元')
        case 'm3.dec.mToCm':
        case 'm3.dec.hundredthsIn':
        case 'm3.dec.yuanToFen':
          return expectValue(q, Math.round(Number(p.x) * 100))
        case 'm3.dec.whichDec':
        case 'm3.dec.whichFrac':
        case 'm3.dec.whichInt': {
          const kind = (s: string): string => (s.includes('/') ? 'frac' : s.includes('.') ? 'dec' : 'int')
          const want = t.k === 'm3.dec.whichDec' ? 'dec' : t.k === 'm3.dec.whichFrac' ? 'frac' : 'int'
          expect(kind(correctLabel(q)), q.id).toBe(want)
          for (const l of labels(q)) if (l !== correctLabel(q)) expect(kind(l), q.id).not.toBe(want)
          return
        }
        case 'm3.dec.rulerDm': {
          const r = part(q, 'ruler')!
          return expectValue(q, (r.to - r.from) / 10, '分米')
        }
        default:
          throw new Error(`没核对的题：${q.id}（${t.k}）`)
      }
    })
  })

  it('第 1 档：一位小数为主，约三成是两位小数（例 2、做一做 2 下半）；做一做 1 的尺子、整数分数小数分类也出得到', () => {
    let two = 0
    let all = 0
    const seen = new Set<string>()
    each('m3s2-07-know', (q, d) => {
      if (d !== 1) return
      all += 1
      seen.add(main(q).k)
      const n = numOf(correctLabel(q))
      const t = main(q)
      // 键盘题按问的数算：0.34 米是几厘米、0.05 元是几分
      const asked = q.input === 'numpad' || /^\d+$/.test(correctLabel(q)) ? str(t.p?.x ?? '') : (n ?? '')
      if (asked.includes('.') && asked.split('.')[1]!.length === 2) two += 1
      else if (n && n.includes('.') && n.split('.')[1]!.length === 2) two += 1
    })
    expect(two / all).toBeGreaterThan(0.25)
    expect(two / all).toBeLessThan(0.45)
    for (const k of ['m3.dec.cmToM', 'm3.dec.fenToYuan', 'm3.dec.mcmToM', 'm3.dec.yjfToYuan', 'm3.dec.hundredthsIn', 'm3.dec.rulerDm', 'm3.dec.whichDec', 'm3.dec.mdmToM', 'm3.dec.yjToYuan', 'm3.dec.money', 'm3.dec.writeAs']) expect(seen, k).toContain(k)
  })
})

describe('m3s2-07-compare 小数的大小比较', () => {
  /** 比较题：把两边都换成「米」「元」 */
  function sides(q: Question): [number, number] {
    const e = part(q, 'expr')
    if (e) {
      const [a, b] = e.expr.split(' ○ ')
      return [milli(a!), milli(b!)]
    }
    const t = main(q)
    const a = str(t.p.a)
    const b = str(t.p.b)
    switch (t.k) {
      case 'm3.dec.cmpM':
      case 'm3.dec.cmpYuan':
        return [milli(a), milli(b)]
      case 'm3.dec.cmpDmM':
        return [milli(Number(a) / 10), milli(b)]
      case 'm3.dec.cmpCmM':
        return [milli(Number(a) / 100), milli(b)]
      case 'm3.dec.cmpYJ':
        return [milli(a), milli(Number(b) / 10)]
    }
    throw new Error(`没核对的比较题：${q.id}`)
  }

  it('从题目反推答案；分档与范围', () => {
    each('m3s2-07-compare', (q, d) => {
      decChoicesOk(q)
      if (q.type === 'compare') {
        const [a, b] = sides(q)
        expect(correctLabel(q), q.id).toBe(a > b ? '>' : a < b ? '<' : '=')
        expect(labels(q).sort()).toEqual(['<', '=', '>'])
        // 看图比较：图和数对得上
        const pics = part(q, 'frac-shape')?.items ?? []
        for (const pic of pics) expect(milli(pic.label!)).toBe(milli((pic.whole ?? 0) + pic.shaded.length / 10))
        if (d === 1) {
          const e = part(q, 'expr')?.expr ?? `${str(main(q).p.a)} ○ ${str(main(q).p.b)}`
          for (const x of e.split(' ○ ')) expect(x, `${q.id} 第 1 档是一位小数`).toMatch(/^\d\.\d$/)
        }
        return
      }
      const t = main(q)
      switch (t.k) {
        case 'm3.dec.arrowM': {
          const line = part(q, 'frac-line')!
          expect(line.per).toBe(10)
          return expectValue(q, line.arrow! / 10, '米')
        }
        case 'm3.dec.maxOf':
        case 'm3.dec.minOf':
        case 'm3.dec.priceMax':
        case 'm3.dec.priceMin': {
          const vs = labels(q).map((l) => milli(numOf(l)!))
          const max = t.k === 'm3.dec.maxOf' || t.k === 'm3.dec.priceMax'
          expect(milli(numOf(correctLabel(q))!), q.id).toBe(max ? Math.max(...vs) : Math.min(...vs))
          return
        }
        case 'm3.dec.jump': {
          const scores = (['a', 'b', 'c', 'd'] as const).map((k) => t.p[k] as { p: { who: { k: string }; x: string } })
          const ask = (t.p.ask as { k: string }).k
          const vs = scores.map((s) => milli(s.p.x))
          const rank = ['m3.dec.jumpFirst', 'm3.dec.jumpSecond', 'm3.dec.jumpThird', 'm3.dec.jumpLast'].indexOf(ask)
          expect(rank, q.id).toBeGreaterThanOrEqual(0)
          const pick = scores[vs.indexOf([...vs].sort((x, y) => y - x)[rank]!)]!
          expect(correctLabel(q)).toBe(zh(pick.p.who))
          return
        }
        case 'm3.dec.mToCm':
          return expectValue(q, Math.round(Number(t.p.x) * 100))
        case 'm3.dec.cardsMax':
        case 'm3.dec.cardsMin':
        case 'm3.dec.cardsCount': {
          // 穷举四张卡片能组成的小数（小数点不在两头）
          const ds = [t.p.a, t.p.b, t.p.c].map(String)
          const all = new Set<string>()
          const perms = (xs: string[]): string[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r])))
          for (const pm of perms(ds)) for (const at of [1, 2]) all.add(`${pm.slice(0, at).join('')}.${pm.slice(at).join('')}`)
          const vals = [...all].map(milli)
          if (t.k === 'm3.dec.cardsCount') return expectValue(q, all.size)
          const want = [...all][vals.indexOf(t.k === 'm3.dec.cardsMax' ? Math.max(...vals) : Math.min(...vals))]!
          expect(correctLabel(q)).toBe(want)
          for (const l of labels(q)) expect(all.has(l), `${q.id} 选项 ${l} 也要是这四张卡片能组成的`).toBe(true)
          return
        }
        default:
          throw new Error(`没核对的题：${q.id}（${t.k}）`)
      }
    })
  })
})

describe('m3s2-07-addsub 简单的小数加、减法', () => {
  it('从算式 / 应用题反推答案；分档与范围', () => {
    each('m3s2-07-addsub', (q, d) => {
      decChoicesOk(q)
      const e = part(q, 'expr')
      if (e) {
        const m = /^(\S+) ([+-]) (\S+) = \?$/.exec(e.expr)!
        const [a, b] = [Math.round(Number(m[1]) * 10), Math.round(Number(m[3]) * 10)]
        const r = m[2] === '+' ? a + b : a - b
        expect(r, q.id).toBeGreaterThan(0)
        expectValue(q, r / 10)
        // 一位小数
        for (const x of [m[1]!, m[3]!]) expect(x, q.id).toMatch(/^\d+(\.\d)?$/)
        const carry = m[2] === '+' ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10
        // 整数加小数（6 + 0.6）只在复习单元：第 2 档起
        const intPlus = !m[1]!.includes('.') || !m[3]!.includes('.')
        if (d === 1) expect(intPlus, `${q.id} 第 1 档没有整数加小数`).toBe(false)
        if (d === 2) expect(carry || intPlus, `${q.id} 第 2 档进位 / 退位或整数加小数`).toBe(true)
        // 整数部分两位的只在进位 / 退位的题里（例 4 的 13.2 − 2.3）
        if (d === 1 && !carry) expect(Math.max(a, b), q.id).toBeLessThan(100)
        return
      }
      const t = main(q)
      const p = t.p ?? {}
      const tenths = (x: unknown): number => Math.round(Number(x) * 10)
      switch (t.k) {
        case 'm3.dec.toJiao':
          return expectValue(q, tenths(p.a) + tenths(p.b))
        case 'm3.dec.toJiaoSub':
          return expectValue(q, tenths(p.a) - tenths(p.b))
        case 'm3.dec.sum2':
          return expectValue(q, (tenths(p.a) + tenths(p.b)) / 10, '元')
        case 'm3.dec.diff2':
        case 'm3.dec.cheaper2':
          expect(tenths(p.a)).toBeGreaterThan(tenths(p.b))
          return expectValue(q, (tenths(p.a) - tenths(p.b)) / 10, '元')
        case 'm3.dec.enough':
          expect(correctLabel(q)).toBe(zh({ k: tenths(p.a) + tenths(p.b) <= 200 ? 'm3.dec.yes' : 'm3.dec.no' }))
          expect(tenths(p.a) + tenths(p.b)).not.toBe(200)
          return
        case 'm3.dec.poles':
          return expectValue(q, (tenths(p.a) + tenths(p.b) - tenths(p.c)) / 10, '米')
        case 'm3.dec.river':
          return expectValue(q, (tenths(p.a) - tenths(p.b)) / 10, '米')
        case 'm3.dec.truck':
          return expectValue(q, (tenths(p.a) - tenths(p.b)) / 10, '吨')
        case 'm3.dec.walk':
          return expectValue(q, (tenths(p.a) - tenths(p.b)) / 10, '千米')
        case 'm3.dec.nextNum': {
          const cells = part(q, 'sequence')!.cells.filter((c) => c.kind === 'item').map((c) => tenths((c as { label: string }).label))
          const step = cells[1]! - cells[0]!
          for (let i = 1; i < cells.length; i++) expect(cells[i]! - cells[i - 1]!, q.id).toBe(step)
          return expectValue(q, (cells[cells.length - 1]! + step) / 10)
        }
        default:
          throw new Error(`没核对的题：${q.id}（${t.k}）`)
      }
    })
  })
})

describe('小数题的文字与朗读', () => {
  const KPS = ['m3s2-07-know', 'm3s2-07-compare', 'm3s2-07-addsub']
  it('答案是小数的都是选项卡；不用 ¥；小数整个读，不拆成「3 / . / 45」；不读出括号', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        if (q.input === 'numpad') expect(Number.isInteger((q.answer as { value: number }).value)).toBe(true)
        for (const s of [...texts(q).map((t) => zh(t as LStr)), ...labels(q)]) expect(s, q.id).not.toContain('¥')
        for (const lang of ['zh', 'en'] as const) {
          for (const t of [...questionSpeech(q, lang), ...answerSpeech(q, lang)]) {
            expect(t, q.id).not.toMatch(/^\.|\.$/)
            expect(t, q.id).not.toMatch(/括号|open bracket|close bracket/)
          }
        }
      })
    }
    // 小数整个交给语音合成（不拆成「0 / . / 7」），并且和前后的字并成一句（一条片段最多一个数，G11）
    expect(tokenize('0.7 里面有几个 0.1？', 'zh')).toEqual(['0.7', '里面有几个0.1'])
  })

  it('选项的写法认不出答案：答案是一位（两位）小数时，干扰项里也有一位（两位）小数', () => {
    const places = (n: string): number => (n.includes('/') ? -1 : n.includes('.') ? n.split('.')[1]!.length : 0)
    for (const kp of KPS) {
      each(kp, (q) => {
        // 分类题、在选项里挑最大 / 最小的不算（答案本来就由选项之间比出来）
        if (!q.choices || ['m3.dec.whichDec', 'm3.dec.whichFrac', 'm3.dec.whichInt', 'm3.dec.maxOf', 'm3.dec.minOf', 'm3.dec.priceMax', 'm3.dec.priceMin'].includes(main(q)?.k ?? '')) return
        const ns = labels(q).map(numOf)
        if (ns.some((n) => n === null)) return
        const c = numOf(correctLabel(q))!
        if (places(c) < 1) return
        const others = ns.filter((n) => n !== c).map((n) => places(n!))
        expect(others, `${q.id} 选项 ${labels(q)}`).toContain(places(c))
      })
    }
  })

  it('第 1 档出得到课本的例题与做一做（G12）', () => {
    const got = (kp: string, test: (q: Question) => boolean): boolean => {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 600; seed++) if (test(gen(1, createRng(seed)))) return true
      return false
    }
    // 例 3：课本原数的跳高成绩、1.20 米是多少厘米；做一做 2：带整个的十等分图 2.5 ○ 1.8 这种
    expect(got('m3s2-07-compare', (q) => main(q)?.k === 'm3.dec.jump' && zh(main(q) as LStr).includes('小明 0.88 米，小刚 1.20 米，小强 0.96 米，小林 1.10 米'))).toBe(true)
    expect(got('m3s2-07-compare', (q) => main(q)?.k === 'm3.dec.mToCm')).toBe(true)
    expect(got('m3s2-07-compare', (q) => (part(q, 'frac-shape')?.items ?? []).some((p) => (p.whole ?? 0) > 0))).toBe(true)
    // 例 4：进位加（1.5 + 3.8）、整数部分两位的退位减（13.2 − 2.3）、课本价目表、20 元够吗、化成角
    expect(got('m3s2-07-addsub', (q) => part(q, 'expr')?.expr === '1.5 + 3.8 = ?' || main(q)?.k === 'm3.dec.sum2')).toBe(true)
    expect(got('m3s2-07-addsub', (q) => /^1\d\.\d - \d\.\d = \?$/.test(part(q, 'expr')?.expr ?? ''))).toBe(true)
    expect(got('m3s2-07-addsub', (q) => main(q)?.k === 'm3.dec.diff2' && zh(main(q) as LStr).includes('卷笔刀 13.2 元'))).toBe(true)
    expect(got('m3s2-07-addsub', (q) => main(q)?.k === 'm3.dec.enough')).toBe(true)
    expect(got('m3s2-07-addsub', (q) => main(q)?.k === 'm3.dec.toJiao' && Math.round(Number(main(q).p.a) * 10) % 10 + Math.round(Number(main(q).p.b) * 10) % 10 >= 10)).toBe(true)
  })

  it('第 1 档题目够多样（练习固定第 1 档）', () => {
    for (const kp of KPS) {
      const ids = new Set<string>()
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 450; seed++) ids.add(gen(1, createRng(seed)).id)
      expect(ids.size, kp).toBeGreaterThanOrEqual(40)
    }
  })
})
