import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { pinyinOf, translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { decRead, decWords, gridShaded, norm, otherWay, padTo, placesOf, readWrongs, roundAt, shiftPoint, u4, writeWrongs } from '../decimals'

// 四下「小数的意义和性质」七个知识点的专项检查（四年级数学下册 C）：读法照课本（课本里的数逐个核对）、
// 从题目本身（米尺 / 直线 / 方格图 / 小数卡 / 数位顺序表 / 统计表 / 秤 / 词条参数）反推答案；
// 小数的答案都是选项、只考数值的选项数值互不相等、考写法的题才拿末尾的 0 区别；第 1 档出得到每个例题与做一做的题型；
// 题目里的小数从课本的数和小的池子里取（每个不同的小数都是一条朗读音频）。
const SEEDS = 150
const KPS = ['m4s2-04-meaning', 'm4s2-04-read-write', 'm4s2-04-property', 'm4s2-04-compare', 'm4s2-04-shift', 'm4s2-04-units', 'm4s2-04-round'] as const
const zh = (l: LStr): string => translate(l, 'zh')

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sig = (q: Question): string => q.id.slice(q.kpId.length + 1)
const kind = (q: Question): string => sig(q).split('-')[0]!
const part = <K extends StemPart['kind']>(q: Question, k: K): Extract<StemPart, { kind: K }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === k)
/** 第一个文字部分的词条键（去掉 m4.dec. 前缀）与参数 */
function textOf(q: Question): { key: string; p: Record<string, unknown> } {
  const t = q.stem.find((p) => p.kind === 'text' && typeof p.text === 'object' && (p.text as { k: string }).k !== 'm4.dec.compare') as Extract<StemPart, { kind: 'text' }> | undefined
  if (!t) return { key: '', p: {} }
  const l = t.text as { k: string; p?: Record<string, unknown> }
  return { key: l.k.replace(/^m4\.dec\./, ''), p: l.p ?? {} }
}
const str = (v: unknown): string => (typeof v === 'object' && v !== null ? zh(v as LStr) : String(v))
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
/** 题目里所有文字部分（中文）连起来 */
const texts = (q: Question): string => q.stem.map((p) => (p.kind === 'text' ? zh(p.text) : '')).join('')
const correct =(q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const DEC = /^(0|[1-9]\d*)(\.\d{1,4})?$/
const valueEq = (a: string, b: string): boolean => DEC.test(a) && DEC.test(b) && u4(a) === u4(b)

/** 课本读法 → 小数（独立的解析：整数部分按「万」「亿」分级、零不占位，小数部分一个字一位） */
function parseCnDec(s: string): string {
  const DIG: Record<string, number> = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  const U: Record<string, number> = { 十: 10, 百: 100, 千: 1000 }
  const [ip, fp] = s.split('点')
  let total = 0
  let section = 0
  let num = 0
  for (const ch of ip!) {
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
  const int = total + section + num
  return fp === undefined ? String(int) : `${int}.${[...fp].map((c) => DIG[c]).join('')}`
}

// ═════════════════════════════════════════════════════════════
// 小数串的运算与读法
// ═════════════════════════════════════════════════════════════

describe('小数串的运算（按字符算，没有浮点误差）', () => {
  it('规范写法、移小数点（位数不够用 0 补足）', () => {
    expect([norm('0.70'), norm('12.000'), norm('105.0900'), norm('00.09'), norm('0')]).toEqual(['0.7', '12', '105.09', '0.09', '0'])
    expect(shiftPoint('0.07', 2)).toBe('7')
    expect(shiftPoint('0.07', 3)).toBe('70')
    expect(shiftPoint('3.2', -3)).toBe('0.0032')
    expect(shiftPoint('500', -1)).toBe('50')
    expect(shiftPoint('9999', -3)).toBe('9.999')
    expect(shiftPoint('0.009', 1)).toBe('0.09')
    expect(shiftPoint('384400', -4)).toBe('38.44')
    expect(shiftPoint('778330000', -8)).toBe('7.7833')
    expect(placesOf('4.080')).toBe(3)
    expect(padTo('4.08', 3)).toBe('4.080')
    expect(padTo('3', 3)).toBe('3.000')
    expect(padTo('5.0500', 3)).toBe('5.050')
  })

  it('「四舍五入」照写位数（课本 p50：0.984 ≈ 0.98 ≈ 1.0 ≈ 1；做一做、练习十三 1）', () => {
    expect(roundAt('0.984', 2)).toBe('0.98')
    expect(roundAt('0.984', 1)).toBe('1.0')
    expect(roundAt('0.984', 0)).toBe('1')
    const book: [string, number, string][] = [
      ['0.256', 2, '0.26'],
      ['12.006', 2, '12.01'],
      ['1.0987', 2, '1.10'],
      ['3.72', 1, '3.7'],
      ['0.58', 1, '0.6'],
      ['9.0548', 1, '9.1'],
      ['9.956', 0, '10'],
      ['9.956', 1, '10.0'],
      ['9.956', 2, '9.96'],
      ['0.905', 1, '0.9'],
      ['1.995', 2, '2.00'],
      ['7.7833', 1, '7.8'],
      ['29.9792', 1, '30.0'],
      ['3.599', 2, '3.60'],
      ['14.43497378', 1, '14.4'],
      ['1.84965', 2, '1.85'],
    ]
    for (const [x, p, r] of book) expect(roundAt(x, p), `${x} 保留 ${p} 位`).toBe(r)
    // 反方向的错：该入的舍了、该舍的入了（照写位数）
    expect(otherWay('0.984', 1)).toBe('0.9')
    expect(otherWay('0.905', 1)).toBe('1.0')
  })

  it('课本里的读法逐个核对（例 3、例 4、做一做、练习九）：小数部分依次读出每个数字，「二」不写「两」', () => {
    const cases: [string, string][] = [
      ['0.58', '零点五八'],
      ['3.5', '三点五'],
      ['41.47', '四十一点四七'],
      ['6.5', '六点五'],
      ['0.04', '零点零四'],
      ['6.72', '六点七二'],
      ['0.058', '零点零五八'],
      ['340.09', '三百四十点零九'],
      ['4.76', '四点七六'],
      ['0.06', '零点零六'],
      ['13.15', '十三点一五'],
      ['0.206', '零点二零六'],
      ['300.71', '三百点七一'],
      ['5.06', '五点零六'],
      ['0.089', '零点零八九'],
      ['367.7', '三百六十七点七'],
      ['0.557', '零点五五七'],
      ['40075.7', '四万零七十五点七'],
      ['8848.86', '八千八百四十八点八六'],
      ['12.378', '十二点三七八'],
      ['20.705', '二十点七零五'],
      ['2.5', '二点五'],
      ['0.0001', '零点零零零一'],
    ]
    for (const [n, r] of cases) {
      expect(decRead(n), n).toBe(r)
      expect(parseCnDec(r), r).toBe(n)
    }
  })

  it('读法词条：一字一条、带拼音（「一」在百前面读 yì，零点一读 yī），中英文都是汉字', () => {
    const w = decWords('一百零五点零九')
    expect(zh(w)).toBe('一百零五点零九')
    expect(translate(w, 'en')).toBe('一百零五点零九')
    const p = (w as { p: Record<string, { k: string }> }).p
    expect(pinyinOf(p.c0!.k)).toBe('yì')
    expect(pinyinOf(p.c4!.k)).toBe('diǎn')
    const tail = (decWords('零点一') as { p: Record<string, { k: string }> }).p
    expect(pinyinOf(tail.c2!.k)).toBe('yī')
  })

  it('读法的干扰项是常见错法：小数部分当整数读、0 漏读、整数部分一位一位读，都和课本读法不一样', () => {
    const rng = createRng(3)
    expect(readWrongs('0.58', rng)).toContain('零点五十八')
    expect(readWrongs('0.058', createRng(5))).toEqual(expect.arrayContaining(['零点五八']))
    expect(readWrongs('340.09', createRng(7))).toEqual(expect.arrayContaining(['三四零点零九']))
    for (const n of ['0.58', '6.5', '340.09', '8848.86', '0.0001', '105.09']) {
      const ws = readWrongs(n, createRng(11))
      expect(ws.length, n).toBe(3)
      expect(ws, n).not.toContain(decRead(n))
    }
    expect(writeWrongs('0.206')).toContain('0.26')
  })

  it('10 × 10 的方格从左往右一整列一整列地涂、最后一列从下往上（课本 32 格：3 整列 + 第 4 列下面 2 格）', () => {
    const cells = gridShaded(32)
    expect(cells).toHaveLength(32)
    for (let c = 0; c < 3; c++) for (let r = 0; r < 10; r++) expect(cells).toContain(r * 10 + c)
    expect(cells).toContain(9 * 10 + 3)
    expect(cells).toContain(8 * 10 + 3)
    expect(cells).not.toContain(7 * 10 + 3)
  })
})

// ═════════════════════════════════════════════════════════════
// 每道题从题目本身反推答案
// ═════════════════════════════════════════════════════════════

const CNUM: Record<string, string> = { 一: '1', 两: '2', 三: '3', 四: '4', 五: '5', 六: '6', 七: '7', 八: '8', 九: '9' }
const PLACE_NAMES: Record<string, number> = { 万位: 4, 千位: 3, 百位: 2, 十位: 1, 个位: 0, 十分位: -1, 百分位: -2, 千分位: -3, 万分位: -4 }
const UNIT_NAMES: Record<string, number> = { 万: 4, 千: 3, 百: 2, 十: 1, 一: 0, 十分之一: -1, 百分之一: -2, 千分之一: -3, 万分之一: -4 }
const PART_E: Record<string, number> = { 十分之一: 1, 百分之一: 2, 千分之一: 3, 万分之一: 4 }
/** 单位名 → 换算成「毫米 / 克 / 平方分米 / 公顷」的倍数 */
const UNIT_BASE: Record<string, [string, number]> = {
  毫米: ['len', 1],
  厘米: ['len', 10],
  分米: ['len', 100],
  米: ['len', 1000],
  千米: ['len', 1e6],
  克: ['mass', 1],
  千克: ['mass', 1e3],
  吨: ['mass', 1e6],
  平方分米: ['area', 1],
  平方米: ['area', 100],
  公顷: ['ha', 1],
  平方千米: ['ha', 100],
}
/** x 个「from」是多少个「to」（字符串运算） */
function convert(x: string, from: string, to: string): string {
  const [f, a] = UNIT_BASE[from]!
  const [g, b] = UNIT_BASE[to]!
  expect(f).toBe(g)
  const e = Math.round(Math.log10(a / b))
  return shiftPoint(x, e)
}
/** 小数串里第 i 个字在什么数位 */
function placeAt(s: string, i: number): number {
  const pt = s.indexOf('.')
  const point = pt < 0 ? s.length : pt
  return i < point ? point - 1 - i : -(i - point)
}
const cmpSym = (a: string, b: string): string => (u4(a) > u4(b) ? '>' : u4(a) < u4(b) ? '<' : '=')
/** 统计表里第 r 行第 c 列的字 */
const cell = (t: Extract<StemPart, { kind: 'stat-table' }>, r: number, c: number): string => str(t.rows[r]![c])

function expected(q: Question): string | null {
  const k = kind(q)
  const s = sig(q)
  const t = q.stem.some((p) => p.kind === 'text') ? textOf(q) : null
  const p = t?.p ?? {}
  switch (k) {
    // ── 小数的意义 ──
    case 'stick': {
      const sc = part(q, 'dec-scale')!
      const per = sc.labels[10] === '1 m' ? 10 : sc.per === 10 ? 1000 : 100
      const n = sc.arrow!
      const ask = s.split('-')[2]
      if (ask === 'int') return String(n)
      if (ask === 'frac') return `${n}/${per}`
      return shiftPoint(String(n), -Math.log10(per))
    }
    case 'pic': {
      const line = part(q, 'frac-line')
      const shape = part(q, 'frac-shape')
      const [n, per] = line ? [line.bracket![1] - line.bracket![0], line.units * line.per] : [shape!.items[0]!.shaded.length, shape!.items[0]!.parts]
      return s.split('-')[2] === 'f' ? `${n}/${per}` : shiftPoint(String(n), -Math.log10(per))
    }
    case 'rate':
      return '10'
    case 'uw':
      return shiftPoint('1', -PART_E[str(p.u)]!)
    case 'un':
      return ['', '十分之一', '百分之一', '千分之一', '万分之一'][placesOf(String(p.x))]!
    case 'in':
    case 'cin':
      return String(u4(String(p.x)) / u4(String(p.u)))
    case 'cmake':
      return shiftPoint(String(p.n), -placesOf(String(p.u)))
    case 'f2d': {
      const [n, den] = String(p.f).split('/').map(Number)
      return shiftPoint(String(n), -Math.log10(den!))
    }
    case 'cf2d': {
      const [n, den] = part(q, 'dec-card')!.frac!
      return shiftPoint(String(n), -Math.log10(den))
    }
    case 'd2f': {
      const x = String(p.x)
      const den = 10 ** placesOf(x)
      return `${Number(x.split('.')[1])}/${den}`
    }
    case 'line':
    case 'line2': {
      const sc = part(q, 'dec-scale')!
      const step = u4(sc.labels[1]!) / sc.per // 每小格是多少（0.0001 为单位）
      return shiftPoint(String(Math.round(sc.arrow! * step)), -4)
    }
    case 'whole':
    case 'grid1':
    case 'circle': {
      const pic = part(q, 'frac-shape')!.items[0]!
      return shiftPoint(String((pic.whole ?? 0) * pic.parts + pic.shaded.length), -Math.log10(pic.parts))
    }
    case 'ruler': {
      const r = part(q, 'ruler')!
      return shiftPoint(String(r.to - r.from), -2)
    }
    // ── 读法和写法 ──
    case 'read':
      return decRead(part(q, 'dec-card')!.n!)
    case 'write':
      return parseCnDec(str(p.r))
    case 'wctx':
      return { ev: '367.7', egg: '0.557', equator: '40075.7' }[s.split('-')[1]!]!
    case 'table': {
      const ask = part(q, 'dec-table')!.ask!
      return s.split('-')[1]!.startsWith('p') ? Object.keys(PLACE_NAMES).find((n) => PLACE_NAMES[n] === ask)! : Object.keys(UNIT_NAMES).find((n) => UNIT_NAMES[n] === ask)!
    }
    case 'mark': {
      const c = part(q, 'dec-card')!
      const i = c.marks![0]!
      const pl = placeAt(c.n!, i)
      if (s.split('-')[1] === 'p') return Object.keys(PLACE_NAMES).find((n) => PLACE_NAMES[n] === pl)!
      return `${c.n![i]}个${Object.keys(UNIT_NAMES).find((n) => UNIT_NAMES[n] === pl)!}`
    }
    case 'comp': {
      // 题目：2.83 是由八个一……组成的；问的那一位是「几个」
      const x = String(p.x)
      const digits = x.replace('.', '')
      const text = zh(q.stem[0]!.kind === 'text' ? q.stem[0].text : '')
      const parts = text.replace(/^.*是由/, '').replace(/组成的？$/, '').split(/、|和/)
      const at = parts.findIndex((w) => w.startsWith('几'))
      // 已知的几位写成了汉字，要和数里的数字对得上
      parts.forEach((w, i) => {
        if (i !== at) expect(CNUM[w[0]!], `${q.id} ${w}`).toBe(digits[i])
      })
      return digits[at]!
    }
    case 'rtf':
      // rtf：读法对不对（读法题）/ 近似数的说法对不对（近似数题）
      if (q.kpId === 'm4s2-04-read-write') return str(p.r) === decRead(part(q, 'dec-card')!.n!) ? '对' : '不对'
      return { keep0: '对', d0596: '不对', d356: '不对', d605: '对', d3007: '对', d529: '对', d632: '对', d520: '对', dropEnd: '不对' }[s.split('-')[1]!]!
    case 'cards':
      return null // 下面单独查
    // ── 小数的性质 ──
    case 'samem':
    case 'samep': {
      const [a, b] = s.split('-').slice(1)
      return cmpSym(a!, b!)
    }
    case 'same':
      if (s.startsWith('same-in')) return String(Number(String(p.n)) / 10)
      return convert(String(p.n), str(p.a), str(p.b))
    case 'rule': {
      const id = s.split('-')[1]!
      if (id === 'main' || id === 'dropEnd') return '对'
      if (id === 'midZero') return '不对'
      if (id === 'end') return String(p.x).includes('.') ? '对' : '不对'
      if (id === 'eq') return valueEq(String(p.a), String(p.b)) ? '对' : '不对'
      throw new Error(id)
    }
    case 'simp':
      return norm(String(p.x))
    case 'pad':
      return padTo(String(p.x), 3)
    case 'zero': {
      const c = correct(q)
      const can = /\.\d*0$/.test(c)
      expect(can, q.id).toBe(s.includes('-can-'))
      return c
    }
    case 'eq':
      return norm(String(p.x))
    case 'app':
      return String(p.x).includes('.') ? '不变' : '变了'
    case 'price':
      return `${p.a}.${p.b}0`
    // ── 小数的大小比较 ──
    case 'jump':
    case 'weight': {
      const tb = part(q, 'stat-table')!
      const vals = tb.rows[1]!.slice(1).map(String)
      const names = tb.rows[0]!.slice(1).map((c) => str(c))
      const order = vals.map((v, i) => ({ v, i })).sort((x, y) => u4(y.v) - u4(x.v))
      const ask = s.split('-')[1]!
      const at = ask === 'first' || ask === 'max' ? order[0]!.i : ask === 'second' ? order[1]!.i : ask === 'third' ? order[2]!.i : order[3]!.i
      return names[at]!
    }
    case 'step': {
      const [a, b] = s.split('-').slice(1) as [string, string]
      const [ia, fa = ''] = a.split('.')
      const [ib, fb = ''] = b.split('.')
      if (ia !== ib) return '整数部分'
      const f1 = fa.padEnd(4, '0')
      const f2 = fb.padEnd(4, '0')
      let i = 0
      while (f1[i] === f2[i]) i++
      return ['十分位', '百分位', '千分位', '万分位'][i]!
    }
    case 'cmp': {
      const [, , a, b] = s.split('-')
      return cmpSym(a!, b!)
    }
    case 'shop': {
      const tb = part(q, 'stat-table')!
      const item = s.split('-')[1]!
      const row = tb.rows.findIndex((r) => str(r[0]) === zh({ k: `m4.dec.goods.${item}` }))
      const prices = [1, 2, 3].map((c) => cell(tb, row, c))
      const best = prices.indexOf([...prices].sort((x, y) => u4(x) - u4(y))[0]!)
      return cell(tb, 0, best + 1)
    }
    case 'ext': {
      const vs = labels(q)
      const sorted = [...vs].sort((x, y) => u4(x) - u4(y))
      return s.split('-')[1] === 'max' ? sorted[sorted.length - 1]! : sorted[0]!
    }
    case 'c234': {
      const ds = s.split('-')[2]!.split('').map(Number) as [number, number, number]
      const [a, b, c] = ds
      return { n: '12', max: `${c}${b}.${a}`, min: `${a}.${b}${c}` }[s.split('-')[1]!]!
    }
    // ── 小数点移动 ──
    case 'rr':
      return String(10 ** Number(s.split('-')[1]))
    case 'rl':
      return ['', '十分之一', '百分之一', '千分之一'][Number(s.split('-')[1])]!
    case 'rm': {
      const [, op, e] = s.split('-')
      return `向${op === 'mul' ? '右' : '左'}移动${['', '一', '两', '三'][Number(e)]}位`
    }
    case 'staff': {
      if (s.startsWith('staff-mm')) return convert(String(p.n), '米', '毫米')
      return String(u4(String(p.b)) / u4(String(p.a)))
    }
    case 'chg': {
      const [, a, b] = s.split('-')
      for (let e = -4; e <= 4; e++) if (shiftPoint(a!, e) === norm(b!)) return e > 0 ? `扩大到原数的 ${10 ** e} 倍` : `缩小到原数的${['', '十分之一', '百分之一', '千分之一', '万分之一'][-e]}`
      throw new Error(s)
    }
    case 'mul':
    case 'div': {
      const expr = part(q, 'expr')
      if (expr) {
        const m = /^([\d.]+) ([×÷]) (\d+) = \?$/.exec(expr.expr)!
        return shiftPoint(m[1]!, (m[2] === '×' ? 1 : -1) * Math.log10(Number(m[3])))
      }
      if (k === 'mul') return shiftPoint(String(p.x), Math.log10(Number(p.n)))
      return shiftPoint(String(p.x), -PART_E[str(p.f)]!)
    }
    case 'move': {
      const m = str(p.m)
      const e = ['', '一', '两', '三'].indexOf(m.slice(-2, -1)) * (m.startsWith('向右') ? 1 : -1)
      return shiftPoint(String(p.x), e)
    }
    case 'to':
      return String(u4(String(p.b)) / u4(String(p.a)))
    case 'pt': {
      const e = Math.round(Math.log10(u4(String(p.a)) / u4(String(p.b))))
      return ['', '十分之一', '百分之一', '千分之一', '万分之一'][e]!
    }
    case 'buy':
      return shiftPoint(String(p.p), Math.log10(Number(p.n)))
    case 'chain': {
      const expr = part(q, 'expr')!.expr
      const [x, ...rest] = expr.replace(' = ?', '').split(' ')
      let v = x!
      for (let i = 0; i < rest.length; i += 2) v = shiftPoint(v, (rest[i] === '×' ? 1 : -1) * Math.log10(Number(rest[i + 1])))
      return v
    }
    case 'fan': {
      const e = Math.round(Math.log10(u4(String(p.b)) / u4(String(p.a))))
      return e > 0 ? `乘 ${10 ** e}` : `除以 ${10 ** -e}`
    }
    // ── 单位换算 ──
    case 'lh':
    case 'hl':
      return convert(String(p.n), str(p.a), str(p.b))
    case 'cp': {
      const whole = String(p.a)
      const frac = convert(String(p.b), str(p.ub), str(p.ua))
      return norm(String((u4(whole) + u4(frac)) / 1e4))
    }
    case 'tc': {
      const x = String(p.x)
      const key = t!.key
      if (key === 'tc.yjf') return x.split('.')[1]![0]!
      const big = key === 'tc.mcm' ? '米' : key === 'tc.kgg' ? '千克' : '吨'
      const small = key === 'tc.mcm' ? '厘米' : key === 'tc.kgg' ? '克' : '千克'
      return convert(norm(String((u4(x) - u4(String(p.a))) / 1e4)), big, small)
    }
    case 'ht': {
      const tb = part(q, 'stat-table')!
      const toCm = (v: string): number => {
        const m = /^(\d+) m (\d+) cm$/.exec(v)
        if (m) return Number(m[1]) * 100 + Number(m[2])
        return v.endsWith(' cm') ? Number(v.slice(0, -3)) : u4(v.slice(0, -2)) / 100
      }
      const vals = tb.rows[1]!.slice(1).map((c) => toCm(String(c)))
      const at = vals.indexOf(s.split('-')[1] === 'max' ? Math.max(...vals) : Math.min(...vals))
      return cell(tb, 0, at + 1)
    }
    case 'animal':
    case 'speed': {
      const tb = part(q, 'stat-table')!
      const rows = tb.rows.slice(1).map((r) => {
        const v = str(r[1])
        const n = Number(v.split(' ')[0])
        const scale = /千米|t$/.test(v) ? 1000 : 1
        return { name: str(r[0]), v: n * scale }
      })
      const ask = s.split('-')[1]!
      if (ask === 'pair') {
        const [a, b] = [str(p.a), str(p.b)]
        const va = rows.find((r) => r.name === a)!.v
        const vb = rows.find((r) => r.name === b)!.v
        return va > vb ? a : b
      }
      const sorted = [...rows].sort((x, y) => y.v - x.v)
      return ask === 'max' || ask === 'fast' ? sorted[0]!.name : sorted[sorted.length - 1]!.name
    }
    case 'cu': {
      const small = UNIT_BASE[str(p.ua)]![1] < UNIT_BASE[str(p.ub)]![1] ? str(p.ua) : str(p.ub)
      return cmpSym(convert(String(p.a), str(p.ua), small), convert(String(p.b), str(p.ub), small))
    }
    case 'scale': {
      const v = String(part(q, 'scale')!.value)
      return s.startsWith('scale-g') ? shiftPoint(v, 3) : v
    }
    case 'data':
      return { dive: '10.909', probe: '8200', marathon: '42.195', ship: '2150', trench: '11.034' }[s.split('-')[1]!]!
    case 'sound':
      return shiftPoint(String(340 * 60), -3)
    case 'area':
      return s === 'area-ha' ? '0.44' : '1252'
    // ── 近似数 ──
    case 'rd': {
      const [, style, x, pl] = s.split('-')
      expect(['keep', 'acc', 'omit']).toContain(style)
      return roundAt(x!, Number(pl))
    }
    case 'look': {
      const pl = Number(s.split('-')[2])
      return ['十分位', '百分位', '千分位'][pl]!
    }
    case 'sr': {
      const [, x, pl] = s.split('-')
      return Number(x!.split('.')[1]![Number(pl)]) >= 5 ? '向前一位进 1' : '舍去'
    }
    case 'prec':
      if (s.startsWith('prec-n')) return s.split('-')[2]!
      return ['个位', '十分位', '百分位'][Number(s.split('-')[1])]!
    case 'wan': {
      const b = part(q, 'big-num')!
      return shiftPoint(b.n!, b.unit === 'wan' ? -4 : -8)
    }
    case 'wr': {
      const b = part(q, 'big-num')!
      return roundAt(shiftPoint(b.n!, b.unit === 'wan' ? -4 : -8), Number(s.split('-')[2]))
    }
    case 'rctx': {
      // 要改写的数在大数卡上（和第 1 档一样），文字里只有情境和单位
      const text = zh(q.stem[0]!.kind === 'text' ? q.stem[0].text : '')
      expect(text, q.id).not.toMatch(/\d{5,}/)
      const b = part(q, 'big-num')!
      expect(text.includes('亿'), q.id).toBe(b.unit === 'yi')
      const x = shiftPoint(b.n!, b.unit === 'yi' ? -8 : -4)
      const keep = /保留(一|两)位小数/.exec(text)
      return keep ? roundAt(x, keep[1] === '一' ? 1 : 2) : x
    }
    case 'btw':
    case 'near': {
      const x = String(p.x)
      const lo = Number(x.split('.')[0])
      if (k === 'near') return roundAt(x, 0)
      return String(s.endsWith('-0') ? lo : lo + 1)
    }
    case 'rel': {
      const b = part(q, 'big-num')!
      return shiftPoint(b.n!, b.unit === 'wan' ? -4 : -8) === norm(b.rhs!) ? '=' : '≈'
    }
    case 'box': {
      const c = correct(q)
      const x = String(p.x)
      const she = s.startsWith('box-she')
      expect(roundAt(c, 1), q.id).toBe(x)
      expect(Number(c.split('.')[1]![1]) >= 5, q.id).toBe(!she)
      return c
    }
    case 'tf':
      return { denom: '对', m007: '对', d03: '不对', d005: '不对', units: '对', rate100: '不对', d08: '对' }[s.split('-')[1]!]!
    default:
      throw new Error(`没有核对的题：${q.id}`)
  }
}

/** 考写法的题（选项照写，可以有一个和答案等值的写法） */
const FORM_KINDS = new Set(['simp', 'pad', 'price', 'rd', 'wr', 'rctx', 'zero', 'box'])

describe('每道题的答案从题目本身反推（150 种子 × 三档）', () => {
  for (const kp of KPS) {
    it(kp, () => {
      each(kp, (q) => {
        const exp = expected(q)
        if (exp === null) return
        const got = correct(q)
        if (DEC.test(exp) && DEC.test(got) && !FORM_KINDS.has(kind(q))) expect(valueEq(got, exp), `${q.id}：${got} ≠ ${exp}`).toBe(true)
        else expect(got, q.id).toBe(exp)
      })
    })
  }
})

describe('选项（G14）', () => {
  it('小数的答案都是选项；只考数值的选项数值互不相等、都写成最简；考写法的选项字串互不相同、最多一个和答案等值', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        const ans = correct(q)
        if (q.answer.kind === 'number') {
          expect(Number.isInteger(q.answer.value), q.id).toBe(true)
          return
        }
        const ls = labels(q)
        if (!ls.every((l) => DEC.test(l))) return
        if (FORM_KINDS.has(kind(q))) {
          expect(new Set(ls).size, q.id).toBe(ls.length)
          expect(ls.filter((l) => l !== ans && valueEq(l, ans)).length, `${q.id} ${ls.join(' ')}`).toBeLessThanOrEqual(1)
        } else {
          expect(new Set(ls.map((l) => u4(l))).size, `${q.id} 选项里有等值的：${ls.join(' ')}`).toBe(ls.length)
          if (!['cmp', 'zero'].includes(kind(q))) for (const l of ls) expect(norm(l), `${q.id} 选项 ${l} 不是最简写法`).toBe(l)
        }
        for (const l of ls) expect(placesOf(l), `${q.id} 选项 ${l} 多于四位小数`).toBeLessThanOrEqual(4)
      })
    }
  })

  it('答案是小数的题，干扰项里至少有一个和答案位数一样（别让答案从位数上认出来）', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        if (q.answer.kind === 'number') return
        const ans = correct(q)
        const ls = labels(q)
        if (!DEC.test(ans) || placesOf(ans) === 0 || !ls.every((l) => DEC.test(l))) return
        if (['cards', 'ext', 'zero', 'uw'].includes(kind(q))) return // 选项本身就是题目给的一组数、几个计数单位
        expect(ls.filter((l) => l !== ans && placesOf(l) === placesOf(ans)).length, `${q.id}：${ls.join(' ')}`).toBeGreaterThan(0)
      })
    }
  })

  it('练习九 10*：用 3、0、8、5 写的数——正确项四个数字各用一次且符合要求，干扰项都不符合', () => {
    const uses = (x: string): boolean => [...x.replace('.', '')].sort().join('') === '0358'
    const ok = (rule: string, x: string): boolean => {
      if (!uses(x)) return false
      const places = placesOf(x)
      if (rule === 'lt1') return u4(x) < 1e4 && places === 3
      if (rule === 'gt8') return u4(x) > 8e4 && places === 3
      // 0 不读出来：0 在整数部分的末尾（30.58 读作三十点五八）
      return places === 2 && /^[1-9]0\./.test(x)
    }
    each('m4s2-04-read-write', (q) => {
      if (kind(q) !== 'cards') return
      const rule = sig(q).split('-')[1]!
      for (const c of q.choices!) expect(ok(rule, zh(c.label)), `${q.id} ${zh(c.label)}`).toBe(c.id === (q.answer as { choiceId: string }).choiceId)
    })
  })
})

describe('朗读与图', () => {
  it('读法题、「画横线的数字」题：数写在小数卡上，文字里没有这个数（不朗读，读出来就是答案）；答错时读这个数', () => {
    each('m4s2-04-read-write', (q) => {
      if (!['read', 'mark', 'rtf'].includes(kind(q))) return
      const c = part(q, 'dec-card')!
      const spoken = questionSpeech(q, 'zh').join('')
      expect(spoken, q.id).not.toContain(c.n!)
      if (kind(q) === 'read') expect(q.choices!.find((x) => x.id === (q.answer as { choiceId: string }).choiceId)!.say, q.id).toBe(c.n)
    })
  })

  it('分母是 1000、10000 的分数只放在小数卡上，不进文字和选项（文字里画不成两层、读不对）', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        for (const p of q.stem) if (p.kind === 'text' || p.kind === 'expr') expect(p.kind === 'text' ? zh(p.text) : p.expr, q.id).not.toMatch(/\d\/\d{4,}/)
        for (const l of labels(q)) expect(l, q.id).not.toMatch(/\/\d{4,}/)
      })
    }
  })

  it('米尺、直线：箭头在刻度范围里，长刻度下面的字一个不少', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        const sc = part(q, 'dec-scale')
        if (!sc) return
        const count = (sc.labels.length - 1) * sc.per + (sc.extra ?? 0)
        expect(sc.arrow, q.id).toBeGreaterThan(0)
        expect(sc.arrow!, q.id).toBeLessThan(count)
      })
    }
  })
})

describe('第 1 档出得到课本每个例题与做一做的题型（G12）', () => {
  const FIRST: Record<(typeof KPS)[number], string[]> = {
    // 例 1 三把尺（10 / 100 / 1000 份）、做一做三幅图、计数单位与进率、练习九 1 / 2 / 7 / 8
    'm4s2-04-meaning': ['stick', 'pic', 'rate', 'uw', 'un', 'in', 'cin', 'cmake', 'f2d', 'cf2d', 'd2f', 'line', 'whole', 'circle', 'ruler'],
    // 例 2 数位顺序表与做一做、例 3 读、例 4 写、练习九 4 / 6
    'm4s2-04-read-write': ['table', 'mark', 'comp', 'read', 'write', 'wctx'],
    // 例 1 / 例 2（相等、看图）、性质的框、例 3 化简、例 4 写成三位小数、练习十 1–5
    'm4s2-04-property': ['samem', 'samep', 'same', 'rule', 'simp', 'pad', 'zero', 'eq', 'app', 'price'],
    // 例 5 跳远排名次与比较的步骤、做一做比大小、练习十 6–9
    'm4s2-04-compare': ['jump', 'step', 'cmp', 'line2', 'weight', 'shop', 'ext'],
    // 例 1 金箍棒与规律、做一做（大小有什么变化）、例 2 乘除以 10、100、1000 与做一做、练习十一 5
    'm4s2-04-shift': ['rr', 'rl', 'rm', 'staff', 'chg', 'mul', 'div', 'move', 'to', 'pt'],
    // 引入的身高、例 1 低级单位改高级单位与复名数、做一做、例 2 高级单位改低级单位与做一做（含平方米、五种动物）
    'm4s2-04-units': ['lh', 'cp', 'hl', 'ht', 'animal', 'tc', 'cu', 'scale'],
    // 例 1 求近似数（看哪一位、舍还是入、精确到、末尾的 0）与做一做、例 2 / 例 3 改写成用万、亿作单位与做一做
    'm4s2-04-round': ['rd', 'look', 'sr', 'prec', 'rtf', 'wan', 'wr', 'rel', 'btw'],
  }
  for (const kp of KPS) {
    it(kp, () => {
      const seen = new Set<string>()
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 600; seed++) seen.add(kind(gen(1, createRng(seed))))
      for (const k of FIRST[kp]) expect(seen.has(k), `${kp} 第 1 档没有「${k}」`).toBe(true)
    })
  }

  it('例 1 的三把尺都出得到，1000 份的那把用课本的 1、6、13 毫米；做一做的方格图有课本的 32 格', () => {
    const sticks = new Set<string>()
    const mm = new Set<number>()
    const grids = new Set<number>()
    const gen = getGenerator('m4s2-04-meaning')!
    for (let seed = 1; seed <= 800; seed++) {
      const q = gen(1, createRng(seed))
      if (kind(q) === 'stick') {
        sticks.add(sig(q).split('-')[1]!)
        if (sig(q).split('-')[1] === '1000') mm.add(part(q, 'dec-scale')!.arrow!)
      }
      if (sig(q).startsWith('pic-grid')) grids.add(part(q, 'frac-shape')!.items[0]!.shaded.length)
    }
    expect([...sticks].sort()).toEqual(['10', '100', '1000'])
    for (const k of [1, 6, 13]) expect(mm.has(k), `${k} 毫米`).toBe(true)
    expect(grids.has(32)).toBe(true)
  })
})

describe('数的范围（课本的数与小的池子，每个不同的小数都是一条朗读音频）', () => {
  it('题目文字和算式里出现的小数，每个知识点不超过 120 个；都是最多四位的小数', () => {
    for (const kp of KPS) {
      const decs = new Set<string>()
      each(kp, (q) => {
        for (const p of q.stem) {
          const text = p.kind === 'text' ? zh(p.text) : p.kind === 'expr' ? p.expr : ''
          for (const m of text.matchAll(/\d+\.\d+/g)) {
            decs.add(m[0])
            expect(placesOf(m[0]), `${q.id} ${m[0]}`).toBeLessThanOrEqual(4)
          }
          // 小数都写整齐：小数点前面有数字、整数部分不以 0 打头（「.1」「00.5」都是写坏了）
          expect(text, q.id).not.toMatch(/(?<![\d])\.\d|(?<![\d.])0\d/)
        }
      })
      expect(decs.size, `${kp} 题目里的小数有 ${decs.size} 个`).toBeLessThanOrEqual(120)
    }
  })

  it('改写成用「万」「亿」作单位的数照课本（384400 = 38.44万、778330000 = 7.7833亿 ≈ 7.8亿），准确的用「=」、近似的用「≈」', () => {
    each('m4s2-04-round', (q) => {
      const b = part(q, 'big-num')
      if (!b || kind(q) === 'rel') return
      const exact = kind(q) === 'wan' || (kind(q) === 'rctx' && !texts(q).includes('保留'))
      expect(b.rel, q.id).toBe(exact ? '=' : '≈')
    })
  })

  it('改写成用「万」「亿」作单位的题（含第 2、3 档的情境题）：要改写的数只在大数卡上，文字里不写、也不读出来（读出来等于提示了答案）', () => {
    let ctx = 0
    each('m4s2-04-round', (q) => {
      if (!['wan', 'wr', 'rctx'].includes(kind(q))) return
      const b = part(q, 'big-num')
      expect(b, q.id).toBeDefined()
      if (kind(q) === 'rctx') ctx++
      expect(texts(q), q.id).not.toContain(b!.n!)
      const spoken = questionSpeech(q, 'zh').join('')
      expect(spoken, q.id).not.toMatch(/\d{5,}/)
      // 大数卡上的数读出来会是「38万 · 四千 · 四百」这样的段：句子里不该有「万」「亿」前面跟着数字的段
      expect(spoken, q.id).not.toMatch(/\d+[万亿]/)
    })
    expect(ctx).toBeGreaterThan(0)
  })
})
