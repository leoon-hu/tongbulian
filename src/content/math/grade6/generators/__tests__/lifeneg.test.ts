import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { ZH } from '../../lang/lifeneg'

// 六上「☆ 生活中的负数」（m6s1-04-negative）：150 种子 × 三档，从题干的参数、温度计、表、直线、算式反推答案（课本的数在这里另抄一份）；
// 第 1 档出得到课本四个活动的每一处；选项里没有第二个对的；这一册还没学百分数——题里不出现 %；朗读避坑。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
type Param = LStr | number
type Text = { k: string; p: Record<string, Param> }

function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator('m6s1-04-negative')!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
/** 第 1 档出得到哪些题（多跑一些种子：课本的每一问都要出得到，不要求 150 个种子里都碰上） */
function firstTier(): Set<string> {
  const gen = getGenerator('m6s1-04-negative')!
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
const val = (s: string): number => Number(s.replace('−', '-').replace(/[^\d.+-]/g, ''))
const sgn = (n: number, plus = true): string => (n < 0 ? `−${-n}` : n > 0 && plus ? `+${n}` : String(n))
const p = (t: Text, k: string): string => (typeof t.p[k] === 'object' ? zh(t.p[k] as LStr) : String(t.p[k]))

// 课本的数（p44–p47）
const FORECAST: Record<string, [number, number]> = { 北京: [-4, 0], 哈尔滨: [-26, -12], 武汉: [4, 6], 西安: [-4, 6], 拉萨: [-6, 6] }
const BILL: Record<string, number> = { 餐厅: -85, 超市: -500, 李小明: 500 }
const FAMILY: Record<string, number> = { 父母工资: 9500, 给老人: -2000, 给我和妹妹压岁钱: -200, 买年货: -500 }
const FAMILY_Q: Record<string, number> = { 'm6.lneg.fam.elder': -2000, 'm6.lneg.fam.gift': -200, 'm6.lneg.fam.goods': -500 }
const ZH_DIGIT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
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
  return `${ZH_DIGIT[Math.floor(v / 10)]}十${v % 10 ? ZH_DIGIT[v % 10] : ''}`
}

describe('生活中的负数（m6s1-04-negative）', () => {
  it('从题干、温度计、表、直线、算式反推答案', () => {
    each((q) => {
      const t = last(q)
      const a = answer(q)
      switch (t.k) {
        case 'm6.neg.below.q':
          expect(a, q.id).toBe(`−${t.p.n} ℃`)
          break
        case 'm6.neg.above.q':
          // 六上课本的零上温度不写「+」
          expect(a, q.id).toBe(`${t.p.n} ℃`)
          break
        case 'm6.neg.mean.q': {
          const tt = p(t, 't')
          expect(a, q.id).toBe(`${val(tt) < 0 ? '零下' : '零上'} ${Math.abs(val(tt))} 摄氏度`)
          break
        }
        case 'm6.neg.thermo.q': {
          const th = part(q, 'thermo')
          expect(th.items).toHaveLength(1)
          expect(Math.abs(th.items[0]!.value % th.minor), q.id).toBe(0)
          expect(val(a), q.id).toBe(th.items[0]!.value)
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
        case 'm6.lneg.fc.low':
        case 'm6.lneg.fc.high': {
          const [lo, hi] = FORECAST[p(t, 'c')]!
          expect([val(p(t, 'a')), val(p(t, 'b'))], q.id).toEqual([lo, hi])
          expect(val(a), q.id).toBe(t.k.endsWith('low') ? lo : hi)
          break
        }
        case 'm6.neg.alt.high':
          expect(a).toBe('8848.86 米')
          break
        case 'm6.neg.alt.low':
          expect(a).toBe('−154.31 米')
          break
        case 'm6.neg.alt.sea':
          expect(a).toBe('0')
          break
        case 'm6.lneg.floor.mean':
          expect(a, q.id).toBe(`地下 ${t.p.n} 层`)
          break
        case 'm6.lneg.floor.write':
          expect(a, q.id).toBe(`−${t.p.n}`)
          break
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
          expect(a, q.id).toBe(`${sgn(BILL[item]!)} 元`)
          // 表里只有课本的三笔
          expect(part(q, 'stat-table').rows).toHaveLength(4)
          break
        }
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
        case 'm6.neg.zero.j':
        case 'm6.neg.judge.unsigned':
          expect(a, q.id).toBe('不对')
          break
        case 'm6.neg.count.neg':
        case 'm6.neg.count.pos': {
          const list = p(t, 'list').split('、')
          expect(a, q.id).toBe(String(list.filter((x) => x !== '0' && x.startsWith('−') === t.k.endsWith('neg')).length))
          break
        }
        case 'm6.neg.opp.q': {
          const x = t.p.x as { k: string; p: Record<string, number> }
          const y = t.p.y as { k: string; p: Record<string, number> }
          expect(x.k.split('.').slice(0, -1).join('.'), q.id).toBe(y.k.split('.').slice(0, -1).join('.'))
          expect(x.k.endsWith('.pos'), q.id).toBe(y.k.endsWith('.neg'))
          expect(val(a), q.id).toBe(y.k.endsWith('.pos') ? y.p.n : -y.p.n!)
          break
        }
        case 'm6.neg.arrow.q': {
          // 想一想的直线：0–5 写数，左边 4 个刻度不写数
          const line = part(q, 'dec-scale')
          expect(line.labels).toEqual(['', '', '', '', '0', '1', '2', '3', '4', '5'])
          expect(val(a), q.id).toBe(line.arrow! - 4)
          expect(val(a)).toBeLessThan(0)
          break
        }
        case 'm6.neg.side.q':
          expect(a, q.id).toBe(p(t, 'x').startsWith('−') ? '左边' : '右边')
          break
        case 'm6.lneg.fam.mean': {
          const v = val(p(t, 'v'))
          expect(Object.values(FAMILY), q.id).toContain(v)
          expect(a, q.id).toBe(`${v < 0 ? '支出' : '收入'} ${Math.abs(v)} 元`)
          break
        }
        case 'm6.lneg.fam.elder':
        case 'm6.lneg.fam.gift':
        case 'm6.lneg.fam.goods':
          expect(a, q.id).toBe(`${sgn(FAMILY_Q[t.k]!)} 元`)
          expect(part(q, 'stat-table').rows.filter((r) => r.includes(null)), q.id).toHaveLength(1)
          break
        case 'm6.lneg.fam.sum':
          expect(a).toBe(String(Object.values(FAMILY).reduce((s, v) => s + v, 0)))
          break
        case 'm6.lneg.sub.lead': {
          const [x, y] = part(q, 'expr').expr.split(' = ')[0]!.split(' − ').map(Number)
          expect(x!).toBeLessThan(y!)
          expect(a, q.id).toBe(sgn(x! - y!))
          break
        }
        case 'm6.lneg.sit.over':
          expect(a, q.id).toBe(`+${t.p.n} 厘米`)
          break
        case 'm6.lneg.sit.short':
          expect(a, q.id).toBe(`−${t.p.n} 厘米`)
          break
        case 'm6.lneg.claim.q':
          expect(a).toBe('0 既不是正数，也不是负数')
          break
        case 'm6.neg.rods.q':
          expect(a, q.id).toBe(`${p(t, 'c') === '红色' ? '+' : '−'}${t.p.n}`)
          break
        case 'm6.neg.read.q':
        case 'm6.neg.read.qC': {
          const c = part(q, 'dec-card')
          const shown = c.frac ? `${c.sign}${c.frac[0]}/${c.frac[1]}` : c.n!
          expect(a, q.id).toBe(`负${words(shown.replace(/^[+−]/, '').replace(' ℃', ''))}${shown.endsWith('℃') ? '摄氏度' : ''}`)
          break
        }
        default:
          throw new Error(`没核对过的题：${q.id}（${t.k}）`)
      }
      // 这一册还没学百分数
      for (const s of [...textsOf(q).map((x) => zh({ k: x.k, p: x.p })), ...options(q)]) expect(s, q.id).not.toContain('%')
    })
    // 寻找负数（天气预报、电梯、吐鲁番）、认识负数（温度计 −10 ℃、珠峰、账单、正负数、想一想）、应用负数（收支表）、小讲堂（算筹、8 − 10、20 − 30）
    const sigs = firstTier()
    const need = ['thermo--10', 'fc-bj-low', 'fc-bj-high', 'fc-hrb-low', 'alt-high', 'alt-low', 'floor-mean-1', 'billmean-restaurant', 'billmean-li', 'kind-0', 'rods-red-23', 'rods-black-34', 'sub-8-10', 'sub-20-30', 'fam-elder', 'fam-gift', 'fam-goods', 'fammean-wage']
    for (const s of need) expect(sigs, s).toContain(s)
    for (let k = 1; k <= 4; k++) expect(sigs, `想一想 −${k}`).toContain(`left-${k}`)
    expect([...sigs].some((s) => s.startsWith('which-')), '正数、负数').toBe(true)
    expect([...sigs].some((s) => s.startsWith('read-')), '读法').toBe(true)
  })
})

describe('生活中的负数的朗读与写法', () => {
  it('词条不出现读错的字（长、种、还、着、为、应、处、差、转、量、调、发、倒、重）', () => {
    for (const [k, v] of Object.entries(ZH)) expect(String(v), k).not.toMatch(/[长种还着为应处差转量调发倒重]/)
  })

  it('题干里负号紧挨着数、用 U+2212，不写「～」；读的时候读「负」，算式里的减号读「减」', () => {
    each((q) => {
      const shown = textsOf(q).map((t) => zh({ k: t.k, p: t.p })).join('')
      expect(shown, q.id).not.toMatch(/-\d|−\s+\d|～|第\s*\d/)
      const said = questionSpeech(q, 'zh').join('')
      if (/(^|[^\d])−\d/.test(shown)) expect(said, q.id).toContain('负')
      if (q.stem.some((s) => s.kind === 'expr')) expect(said, q.id).toMatch(/减\d/)
    })
  })
})
