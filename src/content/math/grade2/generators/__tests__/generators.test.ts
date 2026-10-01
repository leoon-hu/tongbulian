import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade2' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/math/grade2/curriculum'
import { buildSession, createRng, getGenerator, hasGenerator } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { translate } from '@/engine/i18n'
import { formatClock, formatTime } from '@/content/math/shared/labels'
import { ANIMALS, CATEGORIES, COLORS, FORMS, TOKEN } from '../sorting'
import { PLACES } from '../directions'
import { ACTS } from '../time'
import { carriesOf } from '../addsub1000'
import { cnChars } from '../../numword'

const registered = KNOWLEDGE_POINTS.filter((kp) => hasGenerator(kp.id))
const zh = (l: LStr): string => translate(l, 'zh')

function stemOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined {
  return q.stem.find((p) => p.kind === kind) as Extract<StemPart, { kind: K }> | undefined
}
function stemsOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }>[] {
  return q.stem.filter((p) => p.kind === kind) as Extract<StemPart, { kind: K }>[]
}
function correctInput(q: Question): unknown {
  return q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId
}
function correctLabel(q: Question): string {
  if (q.answer.kind === 'number') return String(q.answer.value)
  return zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
}
function correctNumber(q: Question): number {
  return Number(correctLabel(q))
}

/** 计算含 + − × ÷ 与小括号的算式（按运算顺序），只用于测试 */
function evalArith(expr: string): number {
  const src = expr.replace('= ?', '').replace(/×/g, '*').replace(/÷/g, '/').trim()
  expect(src).toMatch(/^[\d\s+\-*/()]+$/)
  return new Function(`return (${src})`)() as number
}

/** 生成器跑遍多种子 × 三档，把每道题交给回调 */
function each(kpId: string, seeds: number, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= seeds; seed++) {
    for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
  }
}

describe('二年级全部生成器：结构自洽（多种子）', () => {
  it('33 个知识点都有生成器（上册 17、下册 16）', () => {
    expect(registered.length).toBe(KNOWLEDGE_POINTS.length)
    expect(registered.length).toBe(33)
  })

  for (const kp of registered) {
    it(`${kp.id} 每题结构合法且答案自洽`, () => {
      each(kp.id, 150, (q) => {
        expect(q.kpId).toBe(kp.id)
        expect([1, 2, 3]).toContain(q.difficulty)
        expect(q.stem.length).toBeGreaterThan(0)
        expect(['numpad', 'choice']).toContain(q.input)
        expect(kp.questionTypes).toContain(q.type)
        expect(checkAnswer(q, correctInput(q))).toBe(true)
        for (const part of q.stem) {
          if (part.kind === 'objects') expect(part.count).toBeGreaterThan(0)
          if (part.kind === 'compare-rows') for (const row of part.rows) expect(row.count).toBeGreaterThan(0)
          if (part.kind === 'ruler') {
            expect(part.from).toBeGreaterThanOrEqual(0)
            expect(part.to).toBeGreaterThan(part.from)
            expect(part.to).toBeLessThanOrEqual(part.length)
          }
          if (part.kind === 'vertical') {
            expect(part.a).toBeGreaterThanOrEqual(part.op === '-' ? part.b : 0)
            expect(part.b).toBeGreaterThan(0)
          }
          if (part.kind === 'clock') {
            expect(part.minute).toBeGreaterThanOrEqual(0)
            expect(part.minute).toBeLessThan(60)
          }
          // 题干文字里不该残留没翻译的键（词条漏写会原样显示 key）
          if (part.kind === 'text') {
            expect(zh(part.text)).not.toMatch(/^[a-z]+\.[a-zA-Z.]+$/)
            expect(translate(part.text, 'en')).not.toMatch(/\b(q|opt|cat|num|side|shape)\.[a-zA-Z]/)
          }
        }
        if (q.input === 'choice') {
          const choices = q.choices ?? []
          expect(choices.length).toBeGreaterThanOrEqual(2)
          const labels = choices.map((c) => zh(c.label))
          expect(new Set(labels).size).toBe(labels.length)
          for (const label of labels) expect(label).not.toMatch(/^[a-z]+\.[a-zA-Z.]+$/)
          const ids = choices.map((c) => c.id)
          expect(new Set(ids).size).toBe(ids.length)
          if (q.answer.kind === 'choice') expect(ids).toContain(q.answer.choiceId)
        } else if (q.answer.kind === 'number') {
          expect(Number.isInteger(q.answer.value)).toBe(true)
          expect(q.answer.value).toBeGreaterThanOrEqual(0)
          expect(q.answer.value).toBeLessThanOrEqual(10000)
        }
      })
    })
  }
})

describe('buildSession：足量且去重', () => {
  for (const kp of registered) {
    it(`${kp.id} 一轮 8 题签名不重复且凑得齐`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        const qs = buildSession(kp.id, 8, { seed })
        expect(qs.length).toBe(8)
        expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length)
      }
    })
  }
})

/** 第 1 档（练习页 85% 的题）里出现过的签名前缀：课本的核心题型要在第 1 档出 */
function d1Sigs(kpId: string, seeds = 400): Set<string> {
  const gen = getGenerator(kpId)!
  const out = new Set<string>()
  for (let seed = 1; seed <= seeds; seed++) out.add(gen(1, createRng(seed)).id.split(':')[1]!.split('-')[0]!)
  return out
}
const textOf = (q: Question): string => stemsOf(q, 'text').map((p) => zh(p.text)).join(' ')

describe('数学正确性', () => {
  it('所有「… = ?」算式：按运算顺序算出的结果 == 标注答案', () => {
    let checked = 0
    for (const kp of registered) {
      each(kp.id, 120, (q) => {
        for (const e of stemsOf(q, 'expr')) {
          if (!/= \?$/.test(e.expr) || /[^\d\s+\-×÷=?()]/u.test(e.expr)) continue
          checked++
          expect(evalArith(e.expr), `${kp.id}: ${e.expr}`).toBe(correctNumber(q))
        }
      })
    }
    expect(checked).toBeGreaterThan(500)
  })

  it('长度：都在 100 以内（二上还没学三位数）；1 米 = 100 厘米、剪绳子、比较、尺子读数正确', () => {
    each('m2s1-05-cm-m', 300, (q) => {
      const texts = stemsOf(q, 'text').map((p) => zh(p.text))
      const nums = texts.join(' ').match(/\d+/g)?.map(Number) ?? []
      for (const n of nums) expect(n).toBeLessThanOrEqual(100)
      expect(correctLabel(q).match(/\d+/g)?.map(Number).every((n) => n <= 100) ?? true).toBe(true)
      const first = texts[0]!
      if (/^1 米 = 几厘米/.test(first)) expect(correctNumber(q)).toBe(100)
      else if (/^100 厘米 = 几米/.test(first)) expect(correctNumber(q)).toBe(1)
      else if (/剪去/.test(first)) expect(correctNumber(q)).toBe(100 - nums[1]!)
      else if (/比一比/.test(first)) {
        const [l, r] = texts[1]!.split('○').map((s) => s.trim()) as [string, string]
        const cm = (s: string): number => (s.endsWith('厘米') ? parseInt(s, 10) : parseInt(s, 10) * 100)
        expect(correctLabel(q)).toBe(cm(l) > cm(r) ? '>' : cm(l) < cm(r) ? '<' : '=')
      } else if (/单位是厘米还是米/.test(first)) {
        expect(['厘米', '米']).toContain(correctLabel(q))
      } else throw new Error(first)
    })
    each('m2s1-05-measure', 200, (q) => {
      const r = stemOf(q, 'ruler')!
      expect(correctNumber(q)).toBe(r.to - r.from)
    })
    // 第 1 档也有不从 0 量起的（练一练「从 2 量到 8」）
    const gen = getGenerator('m2s1-05-measure')!
    const froms = new Set(Array.from({ length: 80 }, (_, i) => (stemOf(gen(1, createRng(i + 1)), 'ruler')!.from === 0 ? 0 : 1)))
    expect(froms).toEqual(new Set([0, 1]))
    expect(d1Sigs('m2s1-05-cm-m')).toEqual(new Set(['unit', 'm2cm', 'cm2m', 'cut', 'cmp']))
  })

  it('认识线段：数线段、哪一个是线段、两点连线', () => {
    each('m2s1-05-segment', 300, (q) => {
      const text = textOf(q)
      const geo = stemOf(q, 'geo')!
      if (/几条线段组成/.test(text)) {
        const items = geo.figs[0]!.items
        const segs = items.reduce((n, it) => n + (it.t === 'poly' ? it.pts.length : it.t === 'line' ? 1 : 0), 0)
        expect(correctNumber(q)).toBe(segs)
      } else if (/哪一个是线段/.test(text)) {
        expect(geo.numbered).toBe(true)
        const straight = geo.figs.map((f, i) => (f.items.every((it) => it.t === 'line') ? i + 1 : 0)).filter(Boolean)
        expect(straight).toHaveLength(1)
        expect(correctLabel(q)).toBe(String(straight[0]))
      } else if (/连起来/.test(text)) {
        const n = geo.figs[0]!.items.filter((it) => it.t === 'dot').length
        expect(correctNumber(q)).toBe((n * (n - 1)) / 2)
      } else throw new Error(text)
    })
    expect(d1Sigs('m2s1-05-segment')).toEqual(new Set(['count', 'which', 'connect']))
  })

  it('乘法：看图题 == 行 × 列；1~6 的口诀含 1，7~9 的口诀第 1 档就有 7、8、9 三句', () => {
    each('m2s1-02-mult-intro', 200, (q) => {
      const rows = stemOf(q, 'compare-rows')
      const text = textOf(q)
      if (rows && /一共有多少个/.test(text)) expect(correctNumber(q)).toBe(rows.rows.reduce((s, r) => s + r.count, 0))
      if (rows && /几个 \d+/.test(text)) expect(correctNumber(q)).toBe(rows.rows.length)
      if (/写成乘法算式/.test(text)) {
        const [k, n] = text.match(/\d+/g)!.map(Number) as [number, number]
        expect(correctLabel(q)).toBe(`${n} × ${k}`)
      }
      if (/积是/.test(text)) {
        const nums = (stemOf(q, 'expr')?.expr ?? text).match(/\d+/g)!.map(Number)
        expect(correctNumber(q)).toBe(nums[0]! * nums[1]!)
      }
    })
    const seen1 = new Set<number>()
    each('m2s1-02-table-6', 300, (q) => {
      const e = stemOf(q, 'expr')
      if (!e) return
      // a × b = ? / ? × b = c / a × ? = c：两个因数（含要填的那个）都 ≤ 6
      const [a, , b] = e.expr.split(' ') as [string, string, string]
      for (const f of [a, b]) {
        const v = f === '?' ? correctNumber(q) : Number(f)
        expect(v).toBeLessThanOrEqual(6)
        seen1.add(v)
      }
    })
    expect(seen1.has(1)).toBe(true)
    const bigs = new Set<number>()
    each('m2s1-06-table-9', 300, (q, d) => {
      const e = stemOf(q, 'expr')!
      const factors = e.expr.match(/\d+/g)!.map(Number).filter((n) => n <= 9)
      expect(factors.some((n) => n >= 7) || correctNumber(q) >= 7).toBe(true)
      if (d === 1) for (const f of [...factors, correctNumber(q)]) if (f >= 7 && f <= 9) bigs.add(f)
    })
    expect(bigs).toEqual(new Set([7, 8, 9]))
    each('m2s1-02-mult-addsub', 200, (q) => {
      const rows = stemOf(q, 'compare-rows')
      if (rows) expect(correctNumber(q)).toBe(rows.rows.reduce((s, r) => s + r.count, 0))
    })
    // 乘减（例 3「3 × 4 − 1」）、填因数（根据积想乘数）第 1 档就有
    const addsub = d1Sigs('m2s1-02-mult-addsub')
    expect(addsub.has('picsub') && addsub.has('pic')).toBe(true)
    expect([...d1Sigs('m2s1-02-table-6')].some((s) => s.startsWith('f'))).toBe(true)
  })

  it('用乘法解决问题：两排数目不同用加法（例 5），价目表只用要买的那一样（例 6）', () => {
    let tworows = 0
    let menu = 0
    each('m2s1-02-mult-solve', 300, (q) => {
      const text = textOf(q)
      const nums = text.match(/\d+/g)?.map(Number) ?? []
      const v = correctNumber(q)
      if (/另一排/.test(text)) {
        tworows++
        expect(v).toBe(nums[0]! + nums[1]!)
      } else if (/一共要多少元/.test(text)) {
        menu++
        const table = stemOf(q, 'stat-table')!
        const item = text.match(/个(.+?)，/)![1]!
        const at = (table.rows[0] as string[]).indexOf(item)
        expect(at).toBeGreaterThanOrEqual(0)
        expect(v).toBe((table.rows[1]![at] as number) * nums[0]!)
      } else if (/个轮子/.test(text)) expect(v).toBe(nums[0]! * nums[1]!)
      else expect(v).toBe(nums[0]! * nums[1]!)
    })
    expect(tworows).toBeGreaterThan(30)
    expect(menu).toBeGreaterThan(30)
  })

  it('认识时间：选项与钟面一致；电子表写法；时分秒的事实', () => {
    each('m2s2-01-time-read', 300, (q) => {
      const clock = stemOf(q, 'clock')!
      const text = textOf(q)
      if (/电子表/.test(text)) expect(correctLabel(q)).toBe(`${((clock.hour + 11) % 12) + 1}:${String(clock.minute).padStart(2, '0')}`)
      else if (q.input === 'choice' && !/走到/.test(text)) expect(correctLabel(q)).toBe(formatTime(clock.hour, clock.minute))
      else expect(correctNumber(q)).toBe(clock.minute)
    })
    const facts: [RegExp, number][] = [
      [/分针走一大格/, 5],
      [/分针走一小格/, 1],
      [/分针走一圈/, 60],
      [/时针走一大格/, 1],
      [/时针走一圈/, 12],
      [/秒针走一小格/, 1],
      [/秒针走一圈/, 60],
      [/^1 时 = 几分/, 60],
      [/^60 分 = 几时/, 1],
      [/^1 分 = 几秒/, 60],
      [/^60 秒 = 几分/, 1],
      [/^半小时/, 30],
      [/^半分钟/, 30],
    ]
    const seen = new Set<number>()
    each('m2s2-01-time-calc', 300, (q) => {
      const text = textOf(q)
      const i = facts.findIndex(([re]) => re.test(text))
      expect(i, text).toBeGreaterThanOrEqual(0)
      expect(correctNumber(q)).toBe(facts[i]![1])
      seen.add(i)
      // 课本只有「1 时 = 60 分」：不出 2 时、3 时的换算，也不出再过几分、经过几分
      expect(text).not.toMatch(/再过|经过/)
    })
    expect(seen.size).toBe(facts.length)
    each('m2s2-01-time-story', 200, (q) => {
      const text = textOf(q)
      const act = ACTS.find((a) => text.startsWith(zh({ k: `q.time.act.${a.key}` })))!
      expect(act, text).toBeDefined()
      expect(correctLabel(q)).toBe({ hour: '时', minute: '分', second: '秒' }[act.unit])
      expect(text).toContain(`大约用 ${act.n}，`)
    })
  })

  it('除法：平均分看图题、判断平均分、口诀求商的除数 / 商在范围内（含 ÷ 1、7~9 都有）', () => {
    each('m2s1-03-share', 300, (q) => {
      const text = textOf(q)
      if (/平均分，对吗/.test(text)) {
        const rows = stemOf(q, 'compare-rows')!.rows.map((r) => r.count)
        expect(correctLabel(q)).toBe(new Set(rows).size === 1 ? '对' : '不对')
        return
      }
      const pic = stemOf(q, 'objects')!
      const nums = text.match(/\d+/g)!.map(Number)
      expect(nums[0]).toBe(pic.count)
      expect(correctNumber(q)).toBe(pic.count / nums[1]!)
    })
    const divisors = new Set<number>()
    each('m2s1-03-div-6', 300, (q) => {
      const e = stemOf(q, 'expr')
      if (!e) {
        const [a, b, c] = textOf(q).match(/\d+/g)!.map(Number) as [number, number, number]
        expect(a * b).toBe(c)
        expect(correctNumber(q)).toBe(b)
        return
      }
      // a ÷ b = ? / ? ÷ b = q / a ÷ ? = q：除数与商（含要填的那个）都 ≤ 6
      const [, , b, , qq] = e.expr.split(' ') as [string, string, string, string, string]
      for (const f of [b, qq]) expect(f === '?' ? correctNumber(q) : Number(f)).toBeLessThanOrEqual(6)
      divisors.add(b === '?' ? correctNumber(q) : Number(b))
    })
    expect(divisors.has(1)).toBe(true)
    const nines = new Set<string>()
    each('m2s1-06-div-9', 300, (q, d) => {
      const e = stemOf(q, 'expr')
      const nums = (e?.expr ?? textOf(q)).match(/\d+/g)!.map(Number)
      if (d === 1 && e?.expr.endsWith('= ?')) nines.add(`${nums[0]}÷${nums[1]}`)
    })
    // 例 5「54 ÷ 9」和 9 的口诀第 1 档就出得来
    expect(nines.has('54÷9') || nines.has('54÷6')).toBe(true)
    expect([...nines].some((x) => x.endsWith('÷9'))).toBe(true)
    each('m2s1-03-div-solve', 300, (q) => {
      const text = textOf(q)
      const nums = text.match(/\d+/g)!.map(Number)
      const v = correctNumber(q)
      if (/元可以买几个/.test(text)) expect(v).toBe(nums[1]! / nums[0]!)
      else expect(v).toBe(nums[0]! / nums[1]!)
    })
  })

  it('分类与整理：按形状 / 颜色分的个数、最多最少、象形统计图、填表、数一类、找不同', () => {
    const NAME: Record<string, string> = { 圆形: 'circle', 正方形: 'square', 心形: 'heart', 红色: 'red', 黄色: 'yellow', 蓝色: 'blue', 绿色: 'green' }
    const formOf = (t: string): string => FORMS.find((f) => Object.values(TOKEN[f]).includes(t))!
    const colorOf = (t: string): string => COLORS.find((c) => FORMS.some((f) => TOKEN[f][c] === t))!
    const kinds = new Set<string>()
    each('m2s1-01-sorting', 300, (q) => {
      const scatter = stemOf(q, 'scatter')
      const text = textOf(q)
      if (/^按(形状|颜色)分，(.+)的有几个/.test(text)) {
        kinds.add('by')
        const [, by, name] = text.match(/^按(形状|颜色)分，(.+)的有几个/)!
        const key = NAME[name!]!
        expect(correctNumber(q)).toBe(scatter!.items.filter((t) => (by === '形状' ? formOf(t) : colorOf(t)) === key).length)
      } else if (/哪一类最(多|少)/.test(text)) {
        kinds.add('most')
        const byForm = /按形状分/.test(text)
        const count = (name: string): number => scatter!.items.filter((t) => (byForm ? formOf(t) : colorOf(t)) === NAME[name]).length
        const counts = q.choices!.map((c) => count(zh(c.label)))
        const best = /最多/.test(text) ? Math.max(...counts) : Math.min(...counts)
        expect(counts.filter((c) => c === best)).toHaveLength(1)
        expect(count(correctLabel(q))).toBe(best)
      } else if (/一个圈代表/.test(text)) {
        kinds.add('tally')
        const tally = stemOf(q, 'tally')!
        if (/人数最多/.test(text)) {
          const max = Math.max(...tally.rows.map((r) => r.count))
          expect(tally.rows.filter((r) => r.count === max)).toHaveLength(1)
          expect(correctLabel(q)).toBe(tally.rows.find((r) => r.count === max)!.icon)
        } else {
          const icon = ANIMALS.find((a) => text.includes(zh({ k: `emoji.${a}` })) || text.includes(a))!
          expect(correctNumber(q)).toBe(tally.rows.find((r) => r.icon === icon)!.count)
        }
      } else if (/把表填完整/.test(text)) {
        kinds.add('table')
        const table = stemOf(q, 'stat-table')!
        const at = table.rows[1]!.indexOf(null)
        const key = (table.rows[0]![at] as { k: string }).k.replace('cat.', '')
        const cat = CATEGORIES.find((c) => c.key === key)!
        expect(correctNumber(q)).toBe(scatter!.items.filter((it) => cat.items.includes(it)).length)
        table.rows[0]!.forEach((cell, i) => {
          if (i === at) return
          const other = CATEGORIES.find((c) => c.key === (cell as { k: string }).k.replace('cat.', ''))!
          expect(table.rows[1]![i]).toBe(scatter!.items.filter((it) => other.items.includes(it)).length)
        })
      } else if (scatter) {
        kinds.add('count')
        const name = text.match(/有几个(.+?)？/)![1]!
        const cat = CATEGORIES.find((c) => c.name === name)!
        expect(correctNumber(q)).toBe(scatter.items.filter((it) => cat.items.includes(it)).length)
      } else {
        kinds.add('odd')
        const others = q.choices!.map((c) => zh(c.label)).filter((l) => l !== correctLabel(q))
        const cat = CATEGORIES.find((c) => c.items.includes(others[0]!))!
        for (const o of others) expect(cat.items).toContain(o)
        expect(cat.items).not.toContain(correctLabel(q))
      }
    })
    expect(kinds).toEqual(new Set(['by', 'most', 'tally', 'table', 'count', 'odd']))
  })

  it('除法：被除数 / 除数 / 商 各就各位；平均分（等分、包含分）写成除法算式，第 1 档就有', () => {
    each('m2s1-03-div-parts', 300, (q) => {
      const text = textOf(q)
      const e = stemOf(q, 'expr')
      if (e) {
        const [t, n, qq] = e.expr.match(/\d+/g)!.map(Number) as [number, number, number]
        expect(t).toBe(n * qq)
        expect(correctNumber(q)).toBe(/被除数/.test(text) ? t : /除数/.test(text) ? n : qq)
      } else {
        const [t, k, qq] = text.match(/\d+/g)!.map(Number) as [number, number, number]
        expect(correctLabel(q)).toBe(`${t} ÷ ${k} = ${qq}`)
        // 选项都是写完整的算式，看不出哪个是对的
        for (const c of q.choices!) expect(zh(c.label)).toMatch(/^\d+ [÷×+-] \d+ = \d+$/)
      }
    })
    expect(d1Sigs('m2s1-03-div-parts').has('write')).toBe(true)
  })

  it('东南西北：太阳东升西落、对面、地图、早晨面向太阳、面向某方向时的左面右面后面（第 1 档就有）', () => {
    const OPP: Record<string, string> = { 东: '西', 西: '东', 南: '北', 北: '南' }
    const LEFT: Record<string, string> = { 东: '北', 北: '西', 西: '南', 南: '东' }
    const rel = (facing: string, side: string): string =>
      side === '前面' ? facing : side === '后面' ? OPP[facing]! : side === '左面' ? LEFT[facing]! : OPP[LEFT[facing]!]!
    each('m2s1-04-directions', 300, (q) => {
      const text = textOf(q)
      const v = correctLabel(q)
      expect(text).not.toMatch(/上北下南/)
      if (/升起/.test(text)) expect(v).toBe('东')
      else if (/落下/.test(text)) expect(v).toBe('西')
      else if (/对面/.test(text)) expect(v).toBe(OPP[text[0]!])
      else if (/地图/.test(text)) {
        const side = text.match(/在地图上，(上面|下面|左边|右边)/)![1]!
        expect(v).toBe({ 上面: '北', 下面: '南', 左边: '西', 右边: '东' }[side])
      } else if (/面向太阳/.test(text)) {
        const side = text.match(/你的(前面|后面|左面|右面)/)![1]!
        expect(v).toBe(rel('东', side))
      } else {
        const m = text.match(/面向(东|南|西|北)站着，你的(后面|左面|右面)/)!
        expect(v).toBe(rel(m[1]!, m[2]!))
      }
    })
    const sigs = d1Sigs('m2s1-04-directions')
    expect(sigs.has('face') && sigs.has('sun')).toBe(true)
  })

  it('校园小导游：平面图上按方向找地方', () => {
    const DIR: Record<string, [number, number]> = { 北: [0, 1], 南: [2, 1], 西: [1, 0], 东: [1, 2] }
    const at = (rows: unknown[][], place: string): [number, number] => {
      const r = rows.findIndex((row) => row.includes(place))
      return [r, rows[r]!.indexOf(place)]
    }
    const name = (icon: string): string => zh({ k: `emoji.${icon}` })
    each('m2s1-04-tour', 300, (q) => {
      const plan = stemOf(q, 'stat-table')!
      const text = textOf(q)
      const placeIn = (s: string): string => PLACES.find((p) => s === name(p) || s === p)!
      if (/的哪面/.test(text)) {
        const [, a, b] = text.match(/在平面图上，(.+)在(.+)的哪面/)!
        const [ra, ca] = at(plan.rows, placeIn(a!))
        const [rb, cb] = at(plan.rows, placeIn(b!))
        const dir = Object.entries(DIR).find(([, [r, c]]) => r - 1 === ra - rb && c - 1 === ca - cb)![0]
        expect(correctLabel(q)).toBe(dir)
      } else if (/面是什么/.test(text)) {
        const dir = text.match(/的(东|南|西|北)面是什么/)![1]!
        const [r, c] = DIR[dir]!
        expect(correctLabel(q)).toBe(plan.rows[r]![c])
        expect(at(plan.rows, plan.rows[1]![1] as string)).toEqual([1, 1])
      } else {
        const m = text.match(/从(.+)往(东|南|西|北)走/)!
        const [r, c] = at(plan.rows, placeIn(m[1]!))
        const [dr, dc] = DIR[m[2]!]!
        expect(correctLabel(q)).toBe(plan.rows[r + dr - 1]![c + dc - 1])
      }
    })
  })

  it('连续两问：先乘后除、先除后加、先除后乘、连除，中间结果和答案都在表内', () => {
    const kinds = new Set<string>()
    each('m2s1-06-two-questions', 300, (q) => {
      const text = textOf(q)
      const nums = text.match(/\d+/g)!.map(Number)
      const v = correctNumber(q)
      if (/摩天轮|铅笔平均分给/.test(text)) {
        kinds.add('mulDiv')
        const [a, b, c] = nums as [number, number, number]
        expect(v).toBe((a * b) / c)
        expect(c).not.toBe(a)
        expect(c).not.toBe(b)
      } else if (/中性笔/.test(text)) {
        kinds.add('divAdd')
        expect(v).toBe(nums[0]! / nums[1]! + nums[2]!)
      } else if (/盆花/.test(text)) {
        kinds.add('divMul')
        expect(v).toBe((nums[1]! / nums[0]!) * nums[2]!)
      } else if (/本书/.test(text)) {
        kinds.add('divDiv')
        expect(v).toBe(nums[0]! / nums[1]! / nums[2]!)
        expect(nums[0]! / nums[1]!).toBeLessThanOrEqual(9)
      } else throw new Error(text)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeLessThanOrEqual(81)
    })
    expect(kinds.size).toBe(4)
  })

  it('认识几时、几时半：选项与钟面一致', () => {
    each('m2s2-01-clock-hour', 200, (q) => {
      const clock = stemOf(q, 'clock')!
      expect([0, 30]).toContain(clock.minute)
      expect(correctLabel(q)).toBe(formatClock(clock.hour, clock.minute))
    })
  })

  it('倍的认识与用乘除法解决问题：答案正确（没有归一的两步题）', () => {
    each('m2s2-03-times', 300, (q) => {
      const text = textOf(q)
      const nums = text.match(/\d+/g)!.map(Number)
      const v = correctNumber(q)
      if (/的几倍/.test(text)) {
        expect(v).toBe(nums[1]! / nums[0]!)
        // 配图（G6）：两行开头是题里的两只动物，第一行一圈，第二行的圈数就是答案；只画不多的
        const pic = stemOf(q, 'times-rows')
        if (q.difficulty === 1 && nums[1]! <= 24) expect(pic).toBeDefined()
        if (pic) {
          expect(pic.per).toBe(nums[0])
          expect(pic.rows.map((r) => r.count)).toEqual([nums[0], nums[1]])
          expect(pic.rows.map((r) => text.includes(r.who))).toEqual([true, true])
          expect(text.indexOf(pic.rows[0]!.who)).toBeLessThan(text.indexOf(pic.rows[1]!.who))
          expect(pic.rows[1]!.count / pic.per).toBe(v)
          expect(pic.rows[1]!.count).toBeLessThanOrEqual(24)
        }
        expect(stemOf(q, 'compare-rows')).toBeUndefined()
      } else if (/的个数是.*个数的 \d+ 倍/.test(text)) expect(v).toBe(nums[0]! * nums[1]!)
      else expect(v).toBe(nums[0]! / nums[1]!)
    })
    const kinds = new Set<string>()
    each('m2s2-03-mul-div-solve', 300, (q) => {
      const text = textOf(q)
      const nums = text.match(/\d+/g)!.map(Number)
      const v = correctNumber(q)
      expect(text).not.toMatch(/每盒一样多/)
      if (/倍。.*一共买了/.test(text)) {
        kinds.add('timesSum')
        expect(v).toBe(nums[0]! * nums[1]! + nums[0]!)
      } else if (/倍。.*多买了/.test(text)) {
        kinds.add('timesMore')
        expect(v).toBe(nums[0]! * nums[1]! - nums[0]!)
      } else if (/人数是.*的几倍/.test(text)) {
        kinds.add('pairTimes')
        expect(v).toBe(nums[1]! / nums[0]!)
      } else if (/多几人/.test(text)) {
        kinds.add('pairMore')
        expect(v).toBe(nums[1]! - nums[0]!)
      } else if (/一共有多少人/.test(text)) {
        kinds.add('pairSum')
        expect(v).toBe(nums[1]! + nums[0]!)
      } else if (/一共有多少个/.test(text)) expect(v).toBe(nums[0]! * nums[1]!)
      else expect(v).toBe(nums[0]! / nums[1]!)
    })
    expect(kinds.size).toBe(5)
  })

  it('加法、减法：都配竖式；第 1 档以一次进 / 退位为主，有四位数和 1000 减三位数', () => {
    const addCarries = new Set<number>()
    let four = 0
    each('m2s2-05-add', 300, (q, d) => {
      const [a, , b] = stemOf(q, 'expr')!.expr.split(' ') as [string, string, string]
      expect(stemOf(q, 'vertical')).toEqual({ kind: 'vertical', a: Number(a), op: '+', b: Number(b) })
      expect(Number(a) + Number(b)).toBeLessThanOrEqual(9999)
      if (d === 1) {
        expect(Number(a)).toBeLessThan(1000)
        expect(Number(b)).toBeLessThan(1000)
        addCarries.add(Math.min(2, carriesOf(Number(a), Number(b))))
      }
      if (Number(a) >= 1000 || Number(b) >= 1000) four++
    })
    expect(addCarries).toEqual(new Set([0, 1, 2]))
    expect(four).toBeGreaterThan(50)
    const subBorrows = new Set<number>()
    let thousand = 0
    each('m2s2-05-sub', 300, (q, d) => {
      const [a, , b] = stemOf(q, 'expr')!.expr.split(' ') as [string, string, string]
      expect(stemOf(q, 'vertical')).toEqual({ kind: 'vertical', a: Number(a), op: '-', b: Number(b) })
      expect(Number(a)).toBeGreaterThan(Number(b))
      if (d === 1) subBorrows.add(Math.min(2, carriesOf(Number(a) - Number(b), Number(b))))
      if (Number(a) % 1000 === 0) thousand++
    })
    expect(subBorrows).toEqual(new Set([0, 1, 2]))
    expect(thousand).toBeGreaterThan(30)
  })

  it('加、减法各部分间的关系：求未知数正确、验算选项不泄露答案、估算够不够', () => {
    const kinds = new Set<string>()
    each('m2s2-05-relations', 300, (q, d) => {
      const e = stemOf(q, 'expr')
      const text = textOf(q)
      if (e) {
        kinds.add('unknown')
        const filled = e.expr.replace('?', String(correctNumber(q)))
        const [lhs, rhs] = filled.split('=').map((x) => x.trim()) as [string, string]
        expect(evalArith(lhs)).toBe(Number(rhs))
      } else if (/验算/.test(text)) {
        if (d === 1) kinds.add('check')
        const [x, y, z] = text.match(/\d+/g)!.map(Number) as [number, number, number]
        const labels = q.choices!.map((c) => zh(c.label))
        // 选项都只是算式，没有「= 得数」
        for (const l of labels) expect(l).toMatch(/^\d+ [+-] \d+$/)
        const valid = /\+/.test(text.split('，')[0]!) ? [`${y} + ${x}`] : [`${z} + ${y}`, `${x} - ${z}`]
        expect(valid).toContain(correctLabel(q))
        expect(labels.filter((l) => valid.includes(l))).toHaveLength(1)
      } else {
        kinds.add('estimate')
        const nums = text.match(/\d+/g)!.map(Number)
        const [a, b, m] = nums.length === 3 ? (nums as [number, number, number]) : ([nums[0], nums[1], nums[2]] as [number, number, number])
        expect(correctLabel(q)).toBe(a + b <= m ? '够' : '不够')
        // 只看百位就判断得出来
        const hs = Math.floor(a / 100) + Math.floor(b / 100)
        expect(m === hs * 100 || m === (hs + 2) * 100).toBe(true)
      }
    })
    expect(kinds).toEqual(new Set(['unknown', 'check', 'estimate']))
  })

  it('有余数的除法：商都在 9 以内、余数比除数小；竖式题答案正确', () => {
    each('m2s2-02-remainder', 300, (q) => {
      const pic = stemOf(q, 'objects')!
      const text = textOf(q)
      const [t, n] = text.match(/\d+/g)!.map(Number) as [number, number]
      expect(t).toBe(pic.count)
      expect(t % n).not.toBe(0)
      expect(Math.floor(t / n)).toBeLessThanOrEqual(9)
      expect(correctNumber(q)).toBe(/剩/.test(text) ? t % n : Math.floor(t / n))
    })
    const kinds = new Set<string>()
    each('m2s2-02-rem-calc', 300, (q, d) => {
      const text = textOf(q)
      const fig = stemOf(q, 'long-division')
      if (fig) {
        const t = fig.dividend
        const n = fig.divisor
        expect(text).toContain(`${t} ÷ ${n}`)
        expect(t % n).not.toBe(0)
        expect(Math.floor(t / n)).toBeLessThanOrEqual(9)
        if (/商是几/.test(text)) {
          if (d === 1) kinds.add('q')
          expect(fig.quotient?.text).toBe('?')
          expect(correctNumber(q)).toBe(Math.floor(t / n))
        } else {
          if (d === 1) kinds.add('r')
          expect(correctNumber(q)).toBe(t % n)
          if (fig.rows) {
            expect(fig.quotient!.text).toBe(String(Math.floor(t / n)))
            expect(fig.rows[0]!.text).toBe(String(n * Math.floor(t / n)))
            expect(fig.rows[1]!.text).toBe('?')
          }
        }
      } else if (/余数最大/.test(text)) {
        if (d === 1) kinds.add('max')
        expect(correctNumber(q)).toBe(Number(text.match(/\d+/)![0]) - 1)
      } else {
        if (d === 1) kinds.add('dividend')
        const [b, qq, r] = text.match(/\d+/g)!.map(Number) as [number, number, number]
        expect(r).toBeLessThan(b)
        expect(correctNumber(q)).toBe(b * qq + r)
      }
    })
    expect(kinds).toEqual(new Set(['q', 'r', 'max', 'dividend']))
  })

  it('用有余数的除法解决问题：进一、去尾、周期规律', () => {
    const NAME: Record<string, string> = { 红色: '🔴', 黄色: '🟡', 蓝色: '🔵', 绿色: '🟢' }
    const kinds = new Set<string>()
    each('m2s2-02-rem-solve', 300, (q) => {
      const text = textOf(q)
      const nums = text.match(/\d+/g)!.map(Number)
      if (/装下全部|至少/.test(text)) {
        kinds.add('up')
        const [t, n] = nums as [number, number]
        expect(t % n).not.toBe(0)
        expect(correctNumber(q)).toBe(Math.floor(t / n) + 1)
      } else if (/装满几盒/.test(text)) {
        kinds.add('down')
        expect(correctNumber(q)).toBe(Math.floor(nums[0]! / nums[1]!))
      } else if (/最多可以买/.test(text)) {
        kinds.add('down')
        const [p, m] = nums as [number, number]
        expect(m % p).not.toBe(0)
        expect(correctNumber(q)).toBe(Math.floor(m / p))
      } else if (/规律/.test(text)) {
        kinds.add('pattern')
        const k = nums[0]!
        const cells = stemOf(q, 'sequence')!.cells.map((c) => (c.kind === 'item' ? c.label : '?')).filter((l) => l !== '…')
        // 找出一组有几个：最短的循环节
        const size = [2, 3, 4].find((s) => cells.every((c, i) => c === cells[i % s]))!
        expect(NAME[correctLabel(q)]).toBe(cells[(k - 1) % size])
        expect(Math.floor(k / size)).toBeLessThanOrEqual(9)
      } else throw new Error(text)
    })
    expect(kinds).toEqual(new Set(['up', 'down', 'pattern']))
  })

  it('万以内数：组成 / 读数写数 / 相邻数 / 接着数 / 数位 / 进率；读数选项只有一个对的', () => {
    for (const kp of ['m2s2-04-num-1000', 'm2s2-04-num-10000']) {
      const cap = kp.endsWith('1000') ? 1000 : 10000
      const kinds = new Set<string>()
      each(kp, 300, (q, d) => {
        const text = textOf(q)
        if (/读作什么/.test(text)) {
          if (d === 1) kinds.add('read')
          const n = Number(stemOf(q, 'hanzi')!.text)
          expect(n).toBeLessThan(cap)
          expect(correctLabel(q)).toBe(cnChars(n))
          // 题干里的数不朗读（hanzi 部件不读），朗读的文字里没有这个数
          expect(text).not.toContain(String(n))
          return
        }
        const v = correctNumber(q)
        expect(v).toBeLessThanOrEqual(cap)
        if (/写作多少/.test(text)) {
          if (d === 1) kinds.add('write')
          expect(cnChars(v)).toBe(text.replace(/写作多少？$/, ''))
        } else if (/问号处填几/.test(text) && stemOf(q, 'expr')) {
          if (d === 1) kinds.add('expand')
          const [lhs, rhs] = stemOf(q, 'expr')!.expr.replace('?', String(v)).split('=') as [string, string]
          expect(evalArith(rhs)).toBe(Number(lhs))
        } else if (/组成的数/.test(text)) {
          const parts = [...text.matchAll(/(\d+) 个(千|百|十|一)/g)]
          const expected = parts.reduce((s, m) => s + Number(m[1]) * { 千: 1000, 百: 100, 十: 10, 一: 1 }[m[2]!]!, 0)
          expect(v).toBe(expected)
        } else if (/后面的一个数/.test(text)) expect(v).toBe(Number(text.match(/\d+/)![0]) + 1)
        else if (/前面的一个数/.test(text)) expect(v).toBe(Number(text.match(/\d+/)![0]) - 1)
        else if (/找规律/.test(text)) {
          const cells = stemOf(q, 'sequence')!.cells.map((c) => (c.kind === 'blank' ? v : Number(c.label)))
          const step = cells[1]! - cells[0]!
          for (let i = 2; i < cells.length; i++) expect(cells[i]! - cells[i - 1]!).toBe(step)
        } else if (/位上是几/.test(text)) {
          const n = Number(text.match(/\d+/)![0])
          const place = text.match(/的(千|百|十|个)位/)![1]!
          expect(v).toBe(Math.floor(n / { 千: 1000, 百: 100, 十: 10, 个: 1 }[place]!) % 10)
        } else if (/里面有几个/.test(text)) {
          const n = Number(text.match(/\d+/)![0])
          expect(v).toBe(Math.floor(n / (/百/.test(text) ? 100 : 1000)))
        } else if (/10 个十/.test(text)) expect(v).toBe(100)
        else if (/10 个百/.test(text)) expect(v).toBe(1000)
        else if (/10 个千/.test(text)) expect(v).toBe(10000)
        else throw new Error(text)
      })
      expect(kinds).toEqual(new Set(['read', 'write', 'expand']))
    }
    // 读法照课本
    expect(['3745', '2080', '6009', '1342', '3069', '7001', '2700', '406', '590', '235', '10000'].map((n) => cnChars(Number(n)))).toEqual([
      '三千七百四十五',
      '二千零八十',
      '六千零九',
      '一千三百四十二',
      '三千零六十九',
      '七千零一',
      '二千七百',
      '四百零六',
      '五百九十',
      '二百三十五',
      '一万',
    ])
    each('m2s2-04-compare', 300, (q) => {
      const e = stemOf(q, 'expr')
      const text = textOf(q)
      if (e) {
        expect(e.expr).toContain('○')
        const [x, y] = e.expr.split('○').map((s) => parseInt(s.trim(), 10)) as [number, number]
        expect(correctLabel(q)).toBe(x > y ? '>' : x < y ? '<' : '=')
      } else if (/接近几千/.test(text)) {
        const n = Number(text.match(/\d+/)![0])
        expect(correctNumber(q)).toBe(Math.round(n / 1000) * 1000)
        expect(Math.abs(n - correctNumber(q))).toBeLessThanOrEqual(200)
      } else if (/大约是多少/.test(text)) {
        const n = Number(text.match(/\d+/)![0])
        expect(correctNumber(q)).toBe(Math.round(n / 100) * 100)
        expect(q.choices!.map((c) => Number(zh(c.label)) % 100)).toEqual([0, 0])
      } else {
        const nums = q.choices!.map((c) => Number(zh(c.label)))
        expect(correctNumber(q)).toBe(/最大/.test(text) ? Math.max(...nums) : Math.min(...nums))
      }
    })
    expect([...d1Sigs('m2s2-04-compare')].some((s) => s.startsWith('near') || s.startsWith('about'))).toBe(true)
    const units = new Set<number>()
    each('m2s2-04-round-addsub', 300, (q, d) => {
      const nums = stemOf(q, 'expr')!.expr.match(/\d+/g)!.map(Number)
      for (const n of nums) expect(n % 10).toBe(0)
      if (d === 1) units.add(Math.min(...nums.map((n) => (n % 100 ? 10 : n % 1000 ? 100 : 1000))))
    })
    // 第 1 档整十（80 + 50）、整百（900 + 600）、整千（1000 + 2000）都有
    expect(units).toEqual(new Set([10, 100, 1000]))
  })
})
