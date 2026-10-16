import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'

// 六上「☆ 水是生命之源」：从题干、表、图反推答案（自己的算法），课本的数据照抄对了，第 1 档出得到活动一的每一项，朗读避坑。

const KP = 'm6s1-08-water'
const zh = (l: LStr): string => translate(l, 'zh')
type Param = LStr | number
type Text = { k: string; p: Record<string, Param> }

function each(fn: (q: Question, d: 1 | 2 | 3) => void, seeds = 150): void {
  const gen = getGenerator(KP)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(KP.length + 1)
const fam = (q: Question): string => sigOf(q).replace(/-.*$/, '')
const texts = (q: Question): Text[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as Record<string, Param> }))
const last = (q: Question): Text => texts(q)[texts(q).length - 1]!
const keyed = (q: Question, k: string): Text | undefined => texts(q).find((t) => t.k === `m6.water.${k}`)
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const stemZh = (q: Question): string => texts(q).map((t) => zh({ k: t.k, p: t.p })).join('')
const table = (q: Question): (number | LStr | null)[][] => q.stem.find((p): p is Extract<StemPart, { kind: 'stat-table' }> => p.kind === 'stat-table')!.rows

/** 课本第 102 页的数（照页图抄的，和生成器无关） */
const BOOK: Record<string, number> = { 北京: 52.9, 天津: 25.2, 河北: 247.9, 江苏: 496.3, 安徽: 889.7, 山东: 461.7, 河南: 417.7 }
/** 十分之几的整数，免得浮点误差 */
const tenth = (x: number): number => Math.round(x * 10)
const fmt1 = (t: number): string => (t % 10 === 0 ? String(t / 10) : (t / 10).toFixed(1))
/** 百分号前保留一位小数（先保留三位小数）：n / d */
const pct1 = (n: number, d: number): string => `${(Math.floor((n * 2000 + d) / (2 * d)) / 10).toFixed(1)}%`

describe('水是生命之源', () => {
  it('表里的数照课本', () => {
    const gen = getGenerator(KP)!
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(1, createRng(seed))
      if (!q.stem.some((p) => p.kind === 'stat-table')) continue
      const rows = table(q).slice(1) as [LStr, string][]
      expect(Object.fromEntries(rows.map(([k, v]) => [zh(k), Number(v)])), q.id).toEqual(BOOK)
      return
    }
    throw new Error('第 1 档没出过带表的题')
  })

  it('从题目反推答案', () => {
    each((q) => {
      const s = stemZh(q)
      // 朗读避坑
      for (const re of [/[（）()]/, /[①②③]/, /(?<![\d?？])%/, /第\s*\d/, /调水|空调|开着|不停地|测量/]) expect(re.test(s), `${q.id}「${s}」`).toBe(false)
      const f = fam(q)
      const ans = answer(q)
      const t = last(q)
      if (f === 'day') expect(ans, q.id).toBe('3月22日')
      else if (f === 'per') {
        expect(keyed(q, 'perIntro'), q.id).toBeDefined()
        if (sigOf(q) === 'per-less') expect(ans, q.id).toBe(fmt1(tenth(5429.5) - tenth(1991.6)))
        else expect(ans, q.id).toBe(pct1(19916, 54295))
      } else if (f === 'most' || f === 'least') {
        const vals = Object.entries(BOOK).sort((a, b) => b[1] - a[1])
        expect(ans, q.id).toBe(f === 'most' ? vals[0]![0] : vals[vals.length - 1]![0])
      } else if (f === 'diff' || f === 'sum') {
        const a = BOOK[zh(t.p.a as LStr)]!
        const b = BOOK[zh(t.p.b as LStr)]!
        const v = f === 'diff' ? tenth(a) - tenth(b) : tenth(a) + tenth(b)
        expect(v > 0, q.id).toBe(true)
        expect(ans, q.id).toBe(fmt1(v))
        // 带 8 行的表：一律选项卡（手机竖屏放得下）
        expect(q.input, q.id).toBe('choice')
      } else if (f === 'sn') {
        // 每道题只给它要用的那几句，答案从这几句里看得出来
        const intro: Record<string, string> = { 'sn-lines': 'snLines', 'sn-east': 'snOpen', 'sn-mid': 'snOpen', 'sn-years': 'snYears' }
        expect(keyed(q, intro[sigOf(q)]!), q.id).toBeDefined()
        const want: Record<string, string> = { 'sn-lines': '3', 'sn-east': '2013年', 'sn-mid': '2014年', 'sn-years': String(2013 - 1952) }
        expect(ans, q.id).toBe(want[sigOf(q)])
        if (sigOf(q) === 'sn-years') for (const y of ['1952', '2013']) expect(s, q.id).toContain(y)
        if (sigOf(q) === 'sn-lines') expect(s, q.id).toContain('三条线路')
      } else if (f === 'lag') {
        expect(keyed(q, 'snOpen'), q.id).toBeDefined()
        expect(ans, q.id).toBe(String(2014 - 2013))
      }
      else if (f === 'eco') expect(ans, q.id).toBe(pct1(123, 844))
      else if (f === 'tapdiff' || f === 'tapsum') {
        const chart = q.stem.find((p): p is Extract<StemPart, { kind: 'bar-chart' }> => p.kind === 'bar-chart')!
        const v = chart.series[0]!.values as number[]
        for (const x of v) expect(x <= chart.step * chart.cells && x % 5 === 0, q.id).toBe(true)
        if (f === 'tapsum') expect(Number(ans), q.id).toBe(v.reduce((a, b) => a + b, 0))
        else expect(Number(ans), q.id).toBe(v[Number(t.p.a) - 1]! - v[Number(t.p.b) - 1]!)
        // 带图：选项卡，选项都是正的、按 5 升一格读得出来的数
        expect(q.input, q.id).toBe('choice')
        for (const l of labels(q)) expect(Number(l) > 0 && Number(l) % 5 === 0, `${q.id} ${l}`).toBe(true)
      } else if (f === 'save' || f === 'savepct') {
        const intro = keyed(q, 'saveIntro')!
        const a = Number(intro.p.a)
        const b = Number(intro.p.b)
        if (f === 'save') expect(Number(ans), q.id).toBe(a - b)
        else expect(ans.replace(/\.0%$/, '%'), q.id).toBe(((a - b) * 100) % a === 0 ? `${((a - b) * 100) / a}%` : pct1(a - b, a))
      } else if (f === 'habit') {
        expect(['洗衣水用来拖地', '用洗菜水浇花'], q.id).toContain(ans)
        for (const l of labels(q).filter((x) => x !== ans)) expect(['洗碗时水一直流', '水龙头滴水不修', '用清水冲洗地面'], q.id).toContain(l)
      } else if (f === 'times') expect(ans, q.id).toBe((Math.round((54295 * 10) / 19916) / 10).toFixed(1))
      else if (f === 'less') expect(ans, q.id).toBe(pct1(54295 - 19916, 54295))
      else if (f === 'bjtj') expect(ans, q.id).toBe((Math.round((529 * 10) / 252) / 10).toFixed(1))
      else if (f === 'drip') {
        const ml = Number(t.p.m) * 60 * 24
        expect(ans, q.id).toBe(String(ml / 1000))
      } else if (f === 'over400') expect(ans, q.id).toBe(pct1(Object.values(BOOK).filter((v) => v > 400).length, 7))
      else if (f === 'plan') expect(ans, q.id).toBe(sigOf(q) === 'plan-week' ? String(60 * 7) : pct1(350, 420))
      else throw new Error(`没核对的题：${q.id}`)
      // 小数、百分数的选项值互不相同
      if (q.input === 'choice' && /^\d+(\.\d+)?%?$/.test(ans)) {
        const vals = labels(q).map((l) => (l.endsWith('%') ? `p${Number(l.slice(0, -1))}` : `d${Number(l)}`))
        expect(new Set(vals).size, q.id).toBe(vals.length)
      }
    })
  })

  it('第 1 档出得到活动一的每一项和活动二、三的两张表', () => {
    const got = new Set<string>()
    const gen = getGenerator(KP)!
    for (let seed = 1; seed <= 1500; seed++) got.add(sigOf(gen(1, createRng(seed))))
    for (const m of ['day', 'per-less', 'per-pct', 'most', 'least', 'sn-lines', 'sn-east', 'sn-mid', 'sn-years', 'eco', /^diff-/, /^sum-/, /^tapdiff-/, /^tapsum-/, /^save-/, /^savepct-/, /^habit-/]) {
      const ok = typeof m === 'string' ? got.has(m) : [...got].some((x) => m.test(x))
      expect(ok, `第 1 档出不到 ${m}`).toBe(true)
    }
  })
})
