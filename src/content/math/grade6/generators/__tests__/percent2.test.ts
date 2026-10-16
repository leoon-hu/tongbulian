import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { ZH } from '../../lang/percent2'

// 六下「2 百分数（二）」五个知识点 + 六上「百分数」的折扣、利率：150 种子 × 三档，从题干的参数（几折、几成的词条、金额、利率表、促销规则）
// 另算一遍答案（课本的数在这里另抄一份）；第 1 档出得到两册课本的例题、做一做；选项里没有第二个对的；朗读避坑。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Param = LStr | number
type Text = { k: string; p: Record<string, Param> }
type KeyL = { k: string; p?: Record<string, Param> }

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
const textsOf = (q: Question): Text[] =>
  q.stem.filter((s): s is Extract<StemPart, { kind: 'text' }> => s.kind === 'text').map((s) => (typeof s.text === 'string' ? { k: '', p: {} } : { k: s.text.k, p: (s.text.p ?? {}) as Record<string, Param> }))
const last = (q: Question): Text => textsOf(q).pop()!
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const p = (t: Text, k: string): string => (typeof t.p[k] === 'object' ? zh(t.p[k] as LStr) : String(t.p[k]))
const n = (t: Text, k: string): number => Number(String(t.p[k]).replace('%', ''))
/** 几折 / 几成的词条键末尾就是数（m6.pct2.z.85 → 85，m6.pct2.c.two → 20） */
const keyNum = (l: Param): number => {
  const last = (l as KeyL).k.split('.').pop()!
  return last === 'two' ? 20 : Number(last)
}
const r2 = (x: number): number => Math.round(x * 100) / 100
const show = (x: number): string => String(r2(x))
const zheWord = (pct: number): string => zh({ k: `m6.pct2.z.${pct}` })
const chengWord = (pct: number): string => zh({ k: `m6.pct2.c.${pct}` })

// 两册课本的存款基准利率表（年利率 %）
const RATE: Record<string, number> = { 活期: 0.35, 三个月: 1.1, 六个月: 1.3, 一年: 1.5, 二年: 2.1, 三年: 2.75 }
const YEARS: Record<string, number> = { 一年: 1, 二年: 2, 三年: 3 }

/** 促销规则 → 要付多少元 */
function payBy(rule: KeyL, price: number): number {
  const q = rule.p!
  if (rule.k.endsWith('ruleZhe')) return r2((price * keyNum(q.z!)) / 100)
  if (rule.k.endsWith('ruleFull')) return price - Math.floor(price / Number(q.t)) * Number(q.m)
  return r2((price * keyNum(q.z1!) * keyNum(q.z2!)) / 10000)
}

/** 折扣：两册共用的题 */
function checkDiscount(q: Question, t: Text, a: string): boolean {
  switch (t.k) {
    case 'm6.pct2.zhe.toPct':
      expect(a, q.id).toBe(`${keyNum(t.p.z!)}%`)
      return true
    case 'm6.pct2.zhe.fromPct':
      expect(a, q.id).toBe(zheWord(n(t, 'p')))
      return true
    case 'm6.pct2.price.q':
      expect(a, q.id).toBe(show((n(t, 'p') * keyNum(t.p.z!)) / 100))
      return true
    case 'm6.pct2.save.q':
      expect(a, q.id).toBe(show(n(t, 'p') - (n(t, 'p') * keyNum(t.p.z!)) / 100))
      return true
    case 'm6.pct2.formula.save':
      expect(a, q.id).toBe(`${n(t, 'p')} × (1 − ${keyNum(t.p.z!)}%)`)
      return true
    case 'm6.pct2.formula.now':
      expect(a, q.id).toBe(`${n(t, 'p')} × ${keyNum(t.p.z!)}%`)
      return true
    case 'm6.pct2.bread.one':
      expect(textsOf(q)[0]!.k).toBe('m6.pct2.bread.rule')
      expect(a, q.id).toBe(show(n(t, 'p') / 2))
      return true
    case 'm6.pct2.bread.buy':
      expect(a, q.id).toBe(show((n(t, 'a') * n(t, 'p') + n(t, 'b') * n(t, 'q')) / 2))
      return true
    case 'm6.pct2.bread.max':
      expect(a, q.id).toBe(String(Math.floor(10 / (n(t, 'p') / 2) + 1e-9)))
      return true
    case 'm6.pct2.furn.q':
      expect(textsOf(q)[0]!.k).toBe('m6.pct2.furn.rule')
      expect(a, q.id).toBe(show(n(t, 'p') * 0.8))
      return true
    case 'm6.pct2.orig.q':
      expect(Number(a) * (100 - keyNum(t.p.z!)), q.id).toBeCloseTo(n(t, 's') * 100)
      return true
    case 'm6.pct2.zhe.jOff':
      expect(a, q.id).toBe(n(t, 'p') === 100 - keyNum(t.p.z!) ? '对' : '不对')
      return true
    case 'm6.pct2.zhe.jAt':
      expect(a, q.id).toBe(n(t, 'p') === keyNum(t.p.z!) ? '对' : '不对')
      return true
    case 'm6.pct2.zhe.which':
      expect(a, q.id).toBe(zheWord(Math.round((n(t, 'q') / n(t, 'p')) * 100)))
      return true
    case 'm6.pct2.fromNow.q':
      expect(Number(a) * keyNum(t.p.z!), q.id).toBeCloseTo(n(t, 'v') * 100)
      return true
    case 'm6.pct2.zhe.off':
      expect(a, q.id).toBe(`${100 - keyNum(t.p.z!)}%`)
      return true
    case 'm6.pct2.mv.q': {
      // 三张票原价 240 元：上午场买二送一付 160 元（省 80 元），下午场七五折付 180 元（省 60 元）
      const saved = { 上午场: 3 * 80 - 2 * 80, 下午场: 3 * 80 - (3 * 80 * 75) / 100 }
      expect(saved[a as keyof typeof saved], q.id).toBe(n(t, 's'))
      return true
    }
    case 'm6.pct2.profit.cost': {
      // 成本价 × 150% × 80% − 成本价 = 获利 1200 元
      const cost = Number(a)
      expect(cost * 1.5 * 0.8 - cost).toBeCloseTo(1200)
      return true
    }
    case 'm6.pct2.profit.most':
      // 至少获利 2100 元：售价 ≥ 6000 + 2100，定价 6000 × 150% = 9000，8100 ÷ 9000 = 90%
      expect(a).toBe(zheWord(((6000 + 2100) / (6000 * 1.5)) * 100))
      return true
    case 'm6.pct2.show.q':
      // 观众 × 2，收入 × 1.5：票价是原来的 1.5 ÷ 2 = 75%
      expect(a).toBe(zheWord((1.5 / 2) * 100))
      return true
    case 'm6.pct2.sale.asZhe':
      expect(a, q.id).toBe(zheWord((keyNum(t.p.z1!) * keyNum(t.p.z2!)) / 100))
      return true
    default:
      return checkSale(q, t, a)
  }
}

/** 打折与满减 */
function checkSale(q: Question, t: Text, a: string): boolean {
  const ctx = textsOf(q).find((x) => x.k === 'm6.pct2.sale.ctx')
  const rules = ctx ? [ctx.p.r1 as KeyL, ctx.p.r2 as KeyL] : []
  const storeOf = (r: KeyL): string => zh(r.p!.st as LStr)
  const price = ctx ? n(ctx, 'p') : 0
  switch (t.k) {
    case 'm6.pct2.sale.payAt': {
      const r = rules.find((x) => storeOf(x) === p(t, 'st'))!
      expect(a, q.id).toBe(show(payBy(r, price)))
      return true
    }
    case 'm6.pct2.sale.which': {
      const [x, y] = rules.map((r) => payBy(r, price)) as [number, number]
      expect(a, q.id).toBe(x === y ? '一样多' : storeOf(rules[x < y ? 0 : 1]!))
      return true
    }
    case 'm6.pct2.sale.cheaper': {
      const pay = (s: string): number => payBy(rules.find((x) => storeOf(x) === s)!, price)
      expect(pay(p(t, 'a')), q.id).toBeLessThan(pay(p(t, 'b')))
      expect(a, q.id).toBe(show(pay(p(t, 'b')) - pay(p(t, 'a'))))
      return true
    }
    case 'm6.pct2.sale.minus':
      expect(a, q.id).toBe(String(Math.floor(n(t, 'p') / n(t, 't')) * n(t, 'm')))
      return true
    default:
      return false
  }
}

/** 利率：两册共用的题 */
function checkInterest(q: Question, t: Text, a: string): boolean {
  const ctx = textsOf(q).find((x) => x.k === 'm6.pct2.int.ctx')
  if (ctx) {
    const term = p(ctx, 'term')
    expect(n(ctx, 'r'), q.id).toBe(RATE[term])
    expect(p(ctx, 'r'), q.id).toMatch(/^\d\.\d\d%$/) // 照课本写两位小数：2.10%
  }
  const interest = ctx ? r2((n(ctx, 'p') * RATE[p(ctx, 'term')]! * YEARS[p(ctx, 'term')]!) / 100) : 0
  switch (t.k) {
    case 'm6.pct2.int.q.interest':
      expect(a, q.id).toBe(show(interest))
      return true
    case 'm6.pct2.int.q.total':
      expect(a, q.id).toBe(show(n(ctx!, 'p') + interest))
      return true
    case 'm6.pct2.int.q.formula':
      expect(a, q.id).toBe(`${n(ctx!, 'p')} × (1 + ${p(ctx!, 'r')} × ${YEARS[p(ctx!, 'term')]})`)
      return true
    case 'm6.pct2.int.what.principal':
      expect(a).toBe('本金')
      return true
    case 'm6.pct2.int.what.interest':
      expect(a).toBe('利息')
      return true
    case 'm6.pct2.int.what.rate':
      expect(a).toBe('利率')
      return true
    case 'm6.pct2.int.what.term':
      expect(a).toBe('存期')
      return true
    case 'm6.pct2.int.formula.q':
      expect(a).toBe('本金 × 利率 × 存期')
      return true
    case 'm6.pct2.int.table.q':
      expect(a, q.id).toBe(`${RATE[p(t, 'term')]!.toFixed(2)}%`)
      return true
    case 'm6.pct2.int.table.live':
      expect(a).toBe('0.35%')
      return true
    case 'm6.pct2.int.jRight':
      expect(a).toBe('对')
      return true
    case 'm6.pct2.int.jWrong':
      expect(a).toBe('不对')
      return true
    case 'm6.pct2.int.more':
      expect(a, q.id).toBe(show((n(t, 'p') * (2.75 * 3 - 2.1 * 2)) / 100))
      return true
    case 'm6.pct2.card.q':
      expect(a, q.id).toBe(show((10000 * n(t, 'r') * n(t, 'n')) / 100))
      return true
    case 'm6.pct2.bond.q':
      expect(a, q.id).toBe(show((10000 * n(t, 'r') * 3) / 100))
      return true
    case 'm6.pct2.bond.cmp1': {
      // 国债三年单利 vs 一年定期每年连本带息续存（复利）
      const bond = 10000 * 0.0238 * 3
      const roll = 10000 * 1.015 ** 3 - 10000
      expect(a).toBe(`约 ${show(bond - roll)} 元`)
      return true
    }
    case 'm6.pct2.bond.cmp2': {
      const bond = 10000 * 0.0335 * 3
      const prod = 10000 * 1.036 ** 3 - 10000
      expect(a).toBe(`约 ${show(prod - bond)} 元`)
      return true
    }
    default:
      return false
  }
}

const checkTax = (q: Question, t: Text, a: string): boolean => {
  switch (t.k) {
    case 'm6.pct2.tax.whatAmount':
      expect(a).toBe('应纳税额')
      return true
    case 'm6.pct2.tax.whatRate':
      expect(a).toBe('税率')
      return true
    case 'm6.pct2.tax.vat':
      expect(a, q.id).toBe(show((n(t, 's') * n(t, 'r')) / 100))
      return true
    case 'm6.pct2.tax.wage':
      expect(a, q.id).toBe(show((n(t, 's') * n(t, 'r')) / 100))
      return true
    case 'm6.pct2.tax.consume':
      expect(a, q.id).toBe(show((n(t, 'p') * n(t, 'r')) / 100))
      return true
    case 'm6.pct2.tax.labor':
      expect(a, q.id).toBe(show(((n(t, 'p') - 800) * 20) / 100))
      return true
    case 'm6.pct2.tax.j':
      expect(a).toBe('不对')
      return true
    case 'm6.pct2.tax.rateBack':
      expect(a, q.id).toBe(`${show((n(t, 't') / n(t, 's')) * 100)}%`)
      return true
    case 'm6.pct2.tax.baseBack':
      expect(a, q.id).toBe(show((n(t, 't') * 100) / n(t, 'r')))
      return true
    case 'm6.pct2.tax.left':
      expect(a, q.id).toBe(show((n(t, 'p') * (100 - n(t, 'r'))) / 100))
      return true
    default:
      return false
  }
}

const checkCheng = (q: Question, t: Text, a: string): boolean => {
  const c = t.p.c === undefined ? 0 : keyNum(t.p.c)
  switch (t.k) {
    case 'm6.pct2.ch.toPct':
      expect(a, q.id).toBe(`${c}%`)
      return true
    case 'm6.pct2.ch.toFrac':
      expect(a, q.id).toBe(`十分之${zh({ k: `m6.pct2.d.${c / 10}` })}`)
      return true
    case 'm6.pct2.ch.fromPct':
      expect(a, q.id).toBe(chengWord(n(t, 'p')))
      return true
    case 'm6.pct2.ch.save':
      expect(a, q.id).toBe(show((n(t, 'a') * (100 - c)) / 100))
      return true
    case 'm6.pct2.ch.back':
      expect(Number(a) * (100 + c), q.id).toBeCloseTo(n(t, 'b') * 100)
      return true
    case 'm6.pct2.ch.up':
      expect(a, q.id).toBe(show((n(t, 'a') * (100 + c)) / 100))
      return true
    case 'm6.pct2.ch.car':
      expect(Number(a) * (100 + c), q.id).toBeCloseTo(n(t, 'b') * 100)
      return true
    case 'm6.pct2.ch.j':
      expect(a, q.id).toBe(n(t, 'p') === 100 + c ? '对' : '不对')
      return true
    case 'm6.pct2.ch.mean':
      expect(a, q.id).toBe(`${c}%`)
      return true
    case 'm6.pct2.ch.how':
      expect(a, q.id).toBe(chengWord(Math.round(((n(t, 'b') - n(t, 'a')) / n(t, 'a')) * 100)))
      return true
    case 'm6.pct2.ch.tv':
      expect(a).toBe(String(Math.round((17424.3 / (1 - 0.095)) * 10) / 10))
      return true
    default:
      return false
  }
}

function run(kpId: string, check: (q: Question, t: Text, a: string) => boolean): Set<string> {
  each(kpId, (q) => {
    const t = last(q)
    if (!check(q, t, answer(q))) throw new Error(`没核对过的题：${q.id}（${t.k}）`)
    // 选项里没有第二个对的：能算出数的题，选项按数互不相等
    if (q.choices) expect(new Set(q.choices.map((c) => zh(c.label))).size, q.id).toBe(q.choices.length)
  })
  // 第 1 档出得到哪些题（多跑一些种子：课本的每一问都要出得到，不要求 150 个种子里都碰上）
  const gen = getGenerator(kpId)!
  const sigs = new Set<string>()
  for (let seed = 1; seed <= 1500; seed++) sigs.add(sigOf(gen(1, createRng(seed))))
  return sigs
}
const has = (sigs: Set<string>, need: string[]): void => {
  for (const s of need) expect(sigs, s).toContain(s)
}

describe('折扣（六下 m6s2-02-discount、六上 m6s1-07-discount）', () => {
  it('六下：例 1、做一做、练习二 1、2、3', () => {
    const sigs = run('m6s2-02-discount', checkDiscount)
    has(sigs, ['now-bike-280-85', 'save-kettle-160-90', 'now-ball-80-65', 'now-bag-105-70', 'now-book-35-88', 'bread-4', 'bread-6', 'bread-8.8', 'bread-5', 'furn-table', 'furn-chair', 'furn-bed', 'furn-wardrobe', 'orig-80-48'])
    expect([...sigs].some((s) => s.startsWith('zpct-'))).toBe(true)
    expect([...sigs].some((s) => s.startsWith('pctz-'))).toBe(true)
  })
  it('六上：例 1、做一做、练习十五 1、2，第 2 档练习十五 4、练习十七 8，第 3 档练习十八 7', () => {
    const sigs = run('m6s1-07-discount', checkDiscount)
    has(sigs, ['now-bike-280-85', 'save-kettle-160-90', 'now-ball-80-65', 'now-bag-105-70', 'now-book-35-88', 'bread-8.8', 'furn-bed', 'formula-save', 'formula-now'])
    const all = new Set<string>()
    each('m6s1-07-discount', (q) => all.add(sigOf(q)))
    expect([...all].some((s) => s.startsWith('pay-suit-550') || s.startsWith('where-suit-550') || s.startsWith('cheaper-suit-550')), '练习十五 4').toBe(true)
    has(all, ['movie-60', 'show', 'profit-cost', 'profit-most'])
  })
})

describe('打折与满减（m6s2-02-sale）', () => {
  it('例 5、做一做、练习二 8、9', () => {
    const sigs = run('m6s2-02-sale', checkDiscount)
    has(sigs, ['pay-skirt-230-0', 'pay-skirt-230-1', 'where-skirt-230', 'pay-sneakers-120-0', 'pay-sneakers-120-1', 'pay-shoes-220-0', 'pay-shoes-220-1', 'where-shoes-220', 'pay-books-80-0', 'pay-books-80-1', 'minus-230-100-50'])
    expect(sigs.has('cheaper-sneakers-120') || sigs.has('where-sneakers-120'), '做一做').toBe(true)
    expect(sigs.has('cheaper-books-80') || sigs.has('where-books-80'), '练习二 9').toBe(true)
  })
})

describe('成数（m6s2-02-chengshu）', () => {
  it('说明、例 2、做一做、练习二 4、5', () => {
    const sigs = run('m6s2-02-chengshu', checkCheng)
    has(sigs, ['csave-350-25', 'cback-96-20', 'cup-48-20', 'ccar-1', 'cpct-10', 'cpct-35', 'cpct-two'])
  })
})

describe('税率（m6s2-02-tax）', () => {
  it('说明、例 3、做一做、练习二 6、7', () => {
    const sigs = run('m6s2-02-tax', checkTax)
    has(sigs, ['vat-30-3-10', 'wage-2500', 'consume-200', 'labor-3000', 'taxword-amount', 'taxword-rate'])
  })
})

describe('利率（六下 m6s2-02-interest、六上 m6s1-07-interest）', () => {
  it('六下：说明、利率表、例 4、做一做', () => {
    const sigs = run('m6s2-02-interest', checkInterest)
    has(sigs, ['interest-wang-5000-y2', 'total-wang-5000-y2', 'interest-zhang-8000-y3', 'total-zhang-8000-y3', 'intword-principal', 'intword-interest', 'intword-rate', 'intformula', 'ratetable-y2', 'ratetable-y3'])
  })
  it('六上：例 2、做一做、练习十五 3；第 2 档练习十五 5、7', () => {
    const sigs = run('m6s1-07-interest', checkInterest)
    has(sigs, ['interest-wang-5000-y2', 'total-wang-5000-y2', 'interest-zhang-8000-y3', 'total-zhang-8000-y3', 'intword-principal', 'intword-interest', 'intword-term'])
    expect(sigs.has('interest-ming-800-y1') || sigs.has('total-ming-800-y1'), '练习十五 3').toBe(true)
    // 六上课本没把利率说成「比率」：不问利率的定义
    expect(sigs.has('intword-rate')).toBe(false)
    const all = new Set<string>()
    each('m6s1-07-interest', (q) => all.add(sigOf(q)))
    has(all, ['bond-2.38', 'bondcmp1'])
    expect([...all].some((s) => s.startsWith('card-')), '练习十五 7').toBe(true)
  })
})

describe('百分数（二）的朗读与写法', () => {
  it('词条不出现读错的字；「应」只在术语「应纳税额」里，「得」只在「得到」「所得税」里，「行」只在「银行」「自行车」里', () => {
    for (const [k, v] of Object.entries(ZH)) {
      const s = String(v).replace(/应纳税额|得到|所得税|银行|自行车/g, '')
      expect(s, k).not.toMatch(/[长种还着为应处差转量调发倒重得行]/)
    }
  })

  it('百分号紧挨着数；不写「～」「8:00」和阿拉伯数字的序数；百分数读「百分之……」', () => {
    for (const kp of ['m6s1-07-discount', 'm6s1-07-interest', 'm6s2-02-discount', 'm6s2-02-chengshu', 'm6s2-02-tax', 'm6s2-02-interest', 'm6s2-02-sale'])
      each(kp, (q) => {
        const shown = textsOf(q).map((t) => zh({ k: t.k, p: t.p })).join('')
        expect(shown, q.id).not.toMatch(/\d\s+%|～|\d:\d\d|第\s*\d/)
        const said = questionSpeech(q, 'zh').join('')
        if (/\d%/.test(shown)) expect(said, q.id).toContain('百分之')
      })
  })
})
