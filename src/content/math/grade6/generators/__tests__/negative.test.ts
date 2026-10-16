import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { ZH } from '../../lang/negative'

// 六下「1 负数」：认识负数（m6s2-01-meaning）、在直线上表示数（m6s2-01-line）。150 种子 × 三档，从题干的参数、表、直线反推答案
// （课本的数在这里另抄一份，不用生成器里的表）；第 1 档出得到课本的每一问；选项里没有第二个对的；朗读避坑。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Param = LStr | number
type Text = { k: string; p: Record<string, Param> }

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
/** 第 1 档出得到哪些题（多跑一些种子：课本的每一问都要出得到，不要求 150 个种子里都碰上） */
function firstTier(kpId: string): Set<string> {
  const gen = getGenerator(kpId)!
  const out = new Set<string>()
  for (let seed = 1; seed <= 1500; seed++) out.add(sigOf(gen(1, createRng(seed))))
  return out
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
const textsOf = (q: Question): Text[] =>
  q.stem.filter((s): s is Extract<StemPart, { kind: 'text' }> => s.kind === 'text').map((s) => (typeof s.text === 'string' ? { k: '', p: {} } : { k: s.text.k, p: (s.text.p ?? {}) as Record<string, Param> }))
const last = (q: Question): Text => textsOf(q).pop()!
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const options = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const part = <K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> => q.stem.find((s): s is Extract<StemPart, { kind: K }> => s.kind === kind)!
/** 「−6 ℃」「+500 元」「−2.5」→ 数 */
const val = (s: string): number => Number(s.replace('−', '-').replace(/[^\d.+-]/g, ''))
const sgn = (n: number, plus = true): string => (n < 0 ? `−${-n}` : n > 0 && plus ? `+${n}` : String(n))
const p = (t: Text, k: string): string => (typeof t.p[k] === 'object' ? zh(t.p[k] as LStr) : String(t.p[k]))

// 课本的数
const FORECAST: Record<string, [number, number]> = { 北京: [-4, 0], 哈尔滨: [-26, -12], 西安: [-4, 6], 拉萨: [-6, 6], 武汉: [4, 6], 海口: [18, 24] }
const BILL: Record<string, number> = { 餐厅: -85, 超市: -500, 李小明: 500, 停车场: -8, 王亮: 78.45 }
const LOCAL: Record<string, number> = { 伦敦: 4, 巴黎: 5, 北京: 12, 东京: 13, 悉尼: 15 }
const FAMILY: Record<string, number> = { 'm6.neg.fam.elder': -2000, 'm6.neg.fam.gift': -200, 'm6.neg.fam.bill': -400, 'm6.neg.fam.food': -800, 'm6.neg.fam.cloth': -1000 }
const ZH_DIGIT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
/** 课本读法：整数（到 999）、小数、分数；不带符号 */
function words(n: string): string {
  if (n.includes('/')) {
    const [a, b] = n.split('/')
    return `${words(b!)}分之${words(a!)}`
  }
  if (n.includes('.')) {
    const [i, f] = n.split('.')
    return `${words(i!)}点${[...f!].map((c) => ZH_DIGIT[Number(c)]).join('')}`
  }
  const v = Number(n)
  if (v < 10) return ZH_DIGIT[v]!
  if (v < 20) return `十${v % 10 ? ZH_DIGIT[v % 10] : ''}`
  if (v < 100) return `${ZH_DIGIT[Math.floor(v / 10)]}十${v % 10 ? ZH_DIGIT[v % 10] : ''}`
  return `${ZH_DIGIT[Math.floor(v / 100)]}百${v % 100 ? words(String(v % 100)) : ''}`
}
/** 直线（DecScale）上第 i 小格表示几：0 一定写着 */
function lineValue(s: Extract<StemPart, { kind: 'dec-scale' }>, i: number): number {
  const zero = s.labels.indexOf('0')
  expect(zero).toBeGreaterThanOrEqual(0)
  return i / s.per - zero
}

describe('认识负数（m6s2-01-meaning）', () => {
  it('从题干、表反推答案', () => {
    each('m6s2-01-meaning', (q) => {
      const t = last(q)
      const a = answer(q)
      switch (t.k) {
        case 'm6.neg.city.low':
        case 'm6.neg.city.high': {
          const [lo, hi] = FORECAST[p(t, 'c')]!
          const v = t.k.endsWith('low') ? lo : hi
          expect(a, q.id).toBe(`${sgn(v, false)} ℃`)
          // 表里写的是课本的「−26～−12 ℃」
          const row = part(q, 'stat-table').rows.find((r) => zh(r[0] as LStr) === p(t, 'c'))!
          expect(row[1], q.id).toBe(`${sgn(lo, false)}～${sgn(hi, false)} ℃`)
          break
        }
        case 'm6.neg.city.coldest':
          expect(a).toBe('哈尔滨')
          break
        case 'm6.neg.city.warmest':
          expect(a).toBe('海口')
          break
        case 'm6.neg.below.q':
          expect(a, q.id).toBe(`−${t.p.n} ℃`)
          break
        case 'm6.neg.above.q':
          expect(a, q.id).toBe(`+${t.p.n} ℃`)
          break
        case 'm6.neg.mean.q': {
          const tt = p(t, 't')
          if (tt === '0 ℃') expect(a).toBe('冰水混合物的温度')
          else expect(a, q.id).toBe(`${val(tt) < 0 ? '零下' : '零上'} ${Math.abs(val(tt))} 摄氏度`)
          break
        }
        case 'm6.neg.fridge.q':
          expect(a).toBe('零下 18 摄氏度')
          break
        case 'm6.neg.zeroC.j':
        case 'm6.neg.minus.j':
        case 'm6.neg.judge.unsigned':
        case 'm6.neg.zero.j':
          expect(a, q.id).toBe('不对')
          break
        case 'm6.neg.plus.j':
          expect(a, q.id).toBe('对')
          break
        case 'm6.neg.read.q':
        case 'm6.neg.read.qC': {
          const c = part(q, 'dec-card')
          const shown = c.frac ? `${c.sign}${c.frac[0]}/${c.frac[1]}` : c.n!
          const neg = shown.startsWith('−')
          const body = shown.replace(/^[+−]/, '').replace(' ℃', '')
          expect(a, q.id).toBe(`${neg ? '负' : '正'}${words(body)}${shown.endsWith('℃') ? '摄氏度' : ''}`)
          expect(t.k.endsWith('C'), q.id).toBe(shown.endsWith('℃'))
          break
        }
        case 'm6.neg.write.q': {
          const r = p(t, 'r')
          const neg = r.startsWith('负')
          // 「负五点二」→ −5.2：把选项逐个读出来，只有正确项和读法一样
          const read = (s: string): string => `${s.startsWith('−') ? '负' : '正'}${words(s.replace(/^[+−]/, '').replace(' ℃', ''))}${s.endsWith('℃') ? '摄氏度' : ''}`
          expect(read(a), q.id).toBe(r)
          expect(a.startsWith(neg ? '−' : '+'), q.id).toBe(true)
          expect(options(q).filter((o) => read(o) === r), q.id).toHaveLength(1)
          break
        }
        case 'm6.neg.bill.mean': {
          const v = val(p(t, 'v'))
          expect(BILL[p(t, 'it')], q.id).toBe(v)
          expect(a, q.id).toBe(`${v < 0 ? '支出' : '收入'} ${Math.abs(v)} 元`)
          break
        }
        case 'm6.neg.bill.write': {
          const ev = p(t, 'ev')
          const item = Object.keys(BILL).find((k) => ev.includes(k))!
          expect(Number(ev.match(/[\d.]+/)![0]), q.id).toBe(Math.abs(BILL[item]!))
          expect(ev.includes('付') ? -1 : 1, q.id).toBe(Math.sign(BILL[item]!))
          expect(a, q.id).toBe(`${sgn(BILL[item]!)} 元`)
          break
        }
        case 'm6.neg.bill.which':
          expect(BILL[a]! > 0, q.id).toBe(true)
          expect(options(q).filter((o) => BILL[o]! > 0), q.id).toHaveLength(1)
          break
        case 'm6.neg.which.neg':
        case 'm6.neg.which.pos':
        case 'm6.neg.which.none': {
          const want = t.k.endsWith('neg') ? -1 : t.k.endsWith('pos') ? 1 : 0
          const sign = (s: string): number => (s === '0' ? 0 : s.startsWith('−') ? -1 : 1)
          expect(sign(a), q.id).toBe(want)
          expect(options(q).filter((o) => sign(o) === want), q.id).toHaveLength(1)
          break
        }
        case 'm6.neg.kind.q': {
          const x = p(t, 'x')
          expect(a, q.id).toBe(x === '0' ? '既不是正数，也不是负数' : x.startsWith('−') ? '负数' : '正数')
          break
        }
        case 'm6.neg.count.neg':
        case 'm6.neg.count.pos': {
          const list = p(t, 'list').split('、')
          const n = list.filter((x) => x !== '0' && x.startsWith('−') === t.k.endsWith('neg')).length
          expect(a, q.id).toBe(String(n))
          break
        }
        case 'm6.neg.lower.q':
        case 'm6.neg.higher.q': {
          const [x, y] = [val(p(t, 'a')), val(p(t, 'b'))]
          expect(x).not.toBe(y)
          expect(val(a), q.id).toBe(t.k === 'm6.neg.lower.q' ? Math.min(x, y) : Math.max(x, y))
          break
        }
        case 'm6.neg.thermo.lower':
        case 'm6.neg.thermo.higher': {
          const items = part(q, 'thermo').items
          const [j, k] = items.map((it) => it.value) as [number, number]
          expect(j).not.toBe(k)
          const want = t.k.endsWith('lower') ? (j < k ? 0 : 1) : j > k ? 0 : 1
          expect(a, q.id).toBe(zh(items[want]!.name!))
          break
        }
        case 'm6.neg.moon.day':
          expect(a).toBe('+127 ℃')
          break
        case 'm6.neg.moon.night':
          expect(a).toBe('−183 ℃')
          break
        case 'm6.neg.zone.q':
        case 'm6.neg.zone.who': {
          const rows = part(q, 'stat-table').rows
          rows[0]!.forEach((c, i) => expect(rows[1]![i], q.id).toBe(`${LOCAL[zh(c as LStr)]}:00`))
          if (t.k === 'm6.neg.zone.q') expect(a, q.id).toBe(`${sgn(LOCAL[p(t, 'c')]! - 12)} 时`)
          else expect(`${sgn(LOCAL[a]! - 12)} 时`, q.id).toBe(p(t, 'v'))
          break
        }
        case 'm6.neg.water.up':
          expect(a, q.id).toBe(`+${t.p.n} 米`)
          break
        case 'm6.neg.water.down':
          expect(a, q.id).toBe(`−${t.p.n} 米`)
          break
        case 'm6.neg.weight.q': {
          const rule = textsOf(q)[0]!
          const [s, h, dd] = ['s', 'h', 'd'].map((k) => Number(rule.p[k]))
          expect(h! - s!, q.id).toBe(dd)
          expect(a, q.id).toBe(`${sgn(Number(t.p.w) - s!)} 克`)
          break
        }
        case 'm6.neg.alt.high':
          expect(a).toBe('+8848.86 米')
          break
        case 'm6.neg.alt.low':
          expect(a).toBe('−154.31 米')
          break
        case 'm6.neg.alt.sea':
          expect(a).toBe('0')
          break
        case 'm6.neg.fam.left': {
          const rows = part(q, 'stat-table').rows.slice(1)
          const sum = rows.reduce((acc, r) => acc + val(r[1] as string), 0)
          expect(a, q.id).toBe(String(sum))
          expect(sum).toBeGreaterThan(0)
          break
        }
        case 'm6.neg.fam.elder':
        case 'm6.neg.fam.gift':
        case 'm6.neg.fam.bill':
        case 'm6.neg.fam.food':
        case 'm6.neg.fam.cloth':
          expect(a, q.id).toBe(`${sgn(FAMILY[t.k]!)} 元`)
          // 表里就空着这一格
          expect(part(q, 'stat-table').rows.filter((r) => r.includes(null)), q.id).toHaveLength(1)
          break
        case 'm6.neg.opp.q': {
          const x = t.p.x as { k: string; p: Record<string, number> }
          const y = t.p.y as { k: string; p: Record<string, number> }
          // 给出的那一种和问的那一种意义相反
          expect(x.k.split('.').slice(0, -1).join('.'), q.id).toBe(y.k.split('.').slice(0, -1).join('.'))
          expect(x.k.endsWith('.pos'), q.id).toBe(y.k.endsWith('.neg'))
          expect(val(p(t, 'xs')), q.id).toBe(x.k.endsWith('.pos') ? x.p.n : -x.p.n!)
          expect(val(a), q.id).toBe(y.k.endsWith('.pos') ? y.p.n : -y.p.n!)
          expect(a.startsWith(y.k.endsWith('.pos') ? '+' : '−'), q.id).toBe(true)
          break
        }
        case 'm6.neg.growth.minus':
          expect(a).toBe('−10%')
          break
        case 'm6.neg.growth.zero':
          expect(a).toBe('0%')
          break
        case 'm6.neg.growth.up':
          expect(a).toBe(`${((130 - 100) / 100) * 100}%`)
          break
        case 'm6.neg.growth.down':
          expect(a).toBe(`−${Math.round(((117 - 111.15) / 117) * 100)}%`)
          break
        default:
          throw new Error(`没核对过的题：${q.id}（${t.k}）`)
      }
    })
    // 课本的每一问都在第 1 档：例 1（六个城市、−6 ℃ 与 6 ℃、0 ℃）、例 2（账单五笔、−3、+3、−3/8 的读法、0）、做一做 1、2、练习一 1、2、3、4、6
    const sigs = firstTier('m6s2-01-meaning')
    const need = [
      ...Object.keys({ bj: 1, hrb: 1, xa: 1, ls: 1, wh: 1, hk: 1 }).flatMap((c) => [`city-${c}-low`, `city-${c}-high`]),
      'below-6', 'above-6', 'zeroc', 'fridge',
      'read-−6 ℃', 'read-+6 ℃', 'read-−3', 'read-+3', 'read-−3/8', 'read-−7', 'read-+4/5', 'read-−5.2', 'read-−1/3', 'read-+41',
      ...['restaurant', 'market', 'li', 'parking', 'wang'].map((b) => `billmean-${b}`),
      'kind-0', 'moon-day', 'moon-night', 'zone-sydney', 'zone-london', 'water-up-1.5', 'water-down-3', 'weight-200-5-197',
      'alt-high', 'alt-low', 'fam-elder', 'fam-gift', 'fam-bill', 'fam-food', 'fam-cloth', 'famleft-9500_-2000_-200_-400_-800_-1000',
    ]
    for (const s of need) expect(sigs, s).toContain(s)
    expect([...sigs].some((s) => s === 'lower--3_-18' || s === 'lower--18_-3' || s === 'higher--3_-18' || s === 'higher--18_-3'), '做一做 1').toBe(true)
    expect([...sigs].some((s) => s.startsWith('which-')), '做一做 2 分正负').toBe(true)
  })
})

describe('在直线上表示数（m6s2-01-line）', () => {
  it('从直线上的刻度、点、箭头反推答案', () => {
    each('m6s2-01-line', (q) => {
      const t = last(q)
      const a = answer(q)
      const line = q.stem.find((s): s is Extract<StemPart, { kind: 'dec-scale' }> => s.kind === 'dec-scale')
      const at = (name: string): number => {
        const pt = line!.points!.find((x) => zh(x.name) === name)!
        return lineValue(line!, pt.i)
      }
      switch (t.k) {
        case 'm6.neg.walk.q': {
          const east = p(t, 'dir') === '东'
          expect(a, q.id).toBe(`${east ? '+' : '−'}${t.p.n} 米`)
          expect(p(textsOf(q)[0]!, 'o'), q.id).toBe(p(t, 'o'))
          break
        }
        case 'm6.neg.walk.dirq':
          expect(a, q.id).toBe(p(t, 'v').startsWith('+') ? '向东' : '向西')
          expect(Math.abs(val(p(t, 'v'))), q.id).toBe(Number(t.p.n))
          break
        case 'm6.neg.who.q':
          expect(at(a), q.id).toBe(val(p(t, 'v')))
          break
        case 'm6.neg.where.q':
          expect(val(a), q.id).toBe(at(p(t, 'who')))
          break
        case 'm6.neg.zero.what':
          expect(at(a), q.id).toBe(0)
          break
        case 'm6.neg.dist.q':
          expect(Number(a), q.id).toBe(Math.abs(at(p(t, 'who'))))
          break
        case 'm6.neg.dist2.q':
          expect(Number(a), q.id).toBe(Math.abs(at(p(t, 'a')) - at(p(t, 'b'))))
          break
        case 'm6.neg.side.q':
          expect(a, q.id).toBe(p(t, 'x').startsWith('−') ? '左边' : '右边')
          break
        case 'm6.neg.side.kindR':
        case 'm6.neg.side.ptR':
          expect(a).toBe('正数')
          break
        case 'm6.neg.side.kindL':
        case 'm6.neg.side.ptL':
          expect(a).toBe('负数')
          break
        case 'm6.neg.split.q':
          expect(a).toBe('0')
          break
        case 'm6.neg.arrow.q':
          expect(val(a), q.id).toBe(lineValue(line!, line!.arrow!))
          // 做一做的直线：每 0.5 一小格，只写 0 和 1
          expect(line!.per).toBe(2)
          expect(line!.labels.filter(Boolean)).toEqual(['0', '1'])
          break
        case 'm6.neg.mark.q': {
          const x = p(t, 'x')
          const v = x.includes('/') ? -Number(x.slice(1).split('/')[0]) / Number(x.split('/')[1]) : val(x)
          expect(at(a.replace('点 ', '')), q.id).toBe(v)
          expect(new Set(line!.points!.map((pt) => pt.i)).size, q.id).toBe(line!.points!.length)
          break
        }
        case 'm6.neg.same.q': {
          const [n, dd] = p(t, 'x').replace('−', '').split('/').map(Number)
          expect(val(a), q.id).toBe((p(t, 'x').startsWith('−') ? -1 : 1) * (n! / dd!))
          break
        }
        case 'm6.neg.pt.q':
          expect(val(a), q.id).toBe(at(p(t, 'p')))
          break
        case 'm6.neg.two.q': {
          const [x, dd] = [val(p(t, 'a')), Number(t.p.d)]
          expect(at('A'), q.id).toBe(x)
          expect(a, q.id).toBe(`${sgn(x - dd, false)} 或 ${sgn(x + dd, false)}`)
          break
        }
        case 'm6.neg.apart.q':
          expect(Number(a), q.id).toBe(Math.abs(val(p(t, 'a')) - val(p(t, 'b'))))
          expect(at('A') - at('B'), q.id).toBe(val(p(t, 'a')) - val(p(t, 'b')))
          break
        case 'm6.neg.opp.q': {
          const y = t.p.y as { k: string; p: Record<string, number> }
          expect(val(a), q.id).toBe(y.k.endsWith('.pos') ? y.p.n : -y.p.n!)
          break
        }
        case 'm6.neg.rods.q':
          expect(a, q.id).toBe(`${p(t, 'c') === '红色' ? '+' : '−'}${t.p.n}`)
          break
        default:
          throw new Error(`没核对过的题：${q.id}（${t.k}）`)
      }
    })
    // 例 3（四个人、图）、回顾与反思、做一做（六个数）、练习一 5（五个点）、7
    const sigs = firstTier('m6s2-01-line')
    const need = ['walk-tree-wen--4', 'walk-tree-tian--2', 'walk-tree-fang-2', 'walk-tree-dong-4', 'zerowhat', 'sidekind-r', 'sidekind-l', 'split', 'same-−5/2', 'two--1-3']
    for (const s of need) expect(sigs, s).toContain(s)
    for (const v of [-4, -2, 2.5, -0.5, 1.5, -2.5]) expect(sigs, `做一做 ${v}`).toContain(`arrow-${v}`)
    for (const x of ['−4', '−2', '2.5', '−0.5', '1.5', '−5/2']) expect([...sigs].some((s) => s.startsWith(`mark-${x}-`)), `标出 ${x}`).toBe(true)
    for (let k = 0; k < 5; k++) expect([...sigs].some((s) => s.startsWith('pt--7_-4_-1_3_6--8_-6_-2_0_2_4_8-') && s.endsWith(`-${k}`)), `练习一 5 第 ${k + 1} 个点`).toBe(true)
  })
})

describe('负数单元的朗读与写法', () => {
  it('词条不出现读错的字（长、种、还、着、为、应、处、差、转、量、调、发、倒）；「重」只在净重里，「增长」只在负增长那几题', () => {
    for (const [k, v] of Object.entries(ZH)) {
      const s = String(v).replace(/净重|增长/g, '')
      expect(s, k).not.toMatch(/[长种还着为应处差转量调发倒重]/)
      if (/增长/.test(String(v))) expect(k, k).toMatch(/^m6\.neg\.growth\./)
    }
  })

  it('题干里负号紧挨着数、用 U+2212，百分号紧挨着数，不写「～」和阿拉伯数字的序数；朗读读出「负」「正」', () => {
    for (const kp of ['m6s2-01-meaning', 'm6s2-01-line'])
      each(kp, (q) => {
        for (const t of textsOf(q)) {
          const s = zh(t.k ? { k: t.k, p: t.p } : '')
          expect(s, q.id).not.toMatch(/-\d|−\s+\d|\d\s+%|～|第\s*\d/)
        }
        const said = questionSpeech(q, 'zh').join('')
        const shown = textsOf(q).map((t) => zh({ k: t.k, p: t.p })).join('')
        if (/(^|[^\d])−\d/.test(shown)) expect(said, q.id).toContain('负')
        expect(said, q.id).not.toMatch(/减\d/)
      })
  })
})
