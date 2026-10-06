import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { ZH } from '../../lang/laws'
import { ADD_APPLY, ADD_LAWS, DISTRIB, MUL_APPLY, MUL_LAWS } from '../laws'

// 四下「运算律」的专项检查：从题干参数、算式、表格、竖式、图反推答案；运算律的名字、字母式照课本；
// 「先算哪两个数」的正确项真的最凑整、别的选项不凑整；第 1 档有课本每个例题和做一做；朗读不踩坑。
const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const ALL = [ADD_LAWS, ADD_APPLY, MUL_LAWS, DISTRIB, MUL_APPLY]

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
function stemsOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }>[] {
  return q.stem.filter((p) => p.kind === kind) as Extract<StemPart, { kind: K }>[]
}
type P = Record<string, number | string | { k: string; p?: P }>
const texts = (q: Question): { k: string; p: P }[] =>
  stemsOf(q, 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as P }))
const exprs = (q: Question): string[] => stemsOf(q, 'expr').map((e) => e.expr)
const n = (p: P, k: string): number => p[k] as number
function correctLabel(q: Question): LStr {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return q.choices!.find((c) => c.id === id)!.label
}
const correctText = (q: Question): string => zh(correctLabel(q))
const correctKey = (q: Question): string => {
  const l = correctLabel(q)
  return typeof l === 'string' ? l : l.k
}
const answer = (q: Question): number => Number(correctText(q))
const wrongLabels = (q: Question): LStr[] => (q.choices ?? []).filter((c) => q.answer.kind === 'choice' && c.id !== q.answer.choiceId).map((c) => c.label)

/** 按运算顺序算（字母按给的值代进去） */
function evalArith(expr: string, letters: Record<string, number> = {}): number {
  const src = expr
    .replace(/[abc]/g, (x) => String(letters[x]))
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .trim()
  expect(src, expr).toMatch(/^[\d\s+\-*/()]+$/)
  return new Function(`return (${src})`)() as number
}
/** 「左边 = 右边 = …」把答案代进「?」以后，各段都相等 */
function holds(expr: string, v: number | string): boolean {
  const vals = expr.replace('?', String(v)).split(' = ').map((s) => evalArith(s))
  return vals.every((x) => Math.abs(x - vals[0]!) < 1e-9)
}
/** 两个带字母的式子是不是恒等（代几组数都相等） */
function sameForm(a: string, b: string): boolean {
  return [
    { a: 3, b: 5, c: 7 },
    { a: 11, b: 2, c: 9 },
    { a: 6, b: 13, c: 4 },
  ].every((L) => Math.abs(evalArith(a, L) - evalArith(b, L)) < 1e-9)
}
const zeros = (v: number): number => {
  let z = 0
  for (let x = v; x > 0 && Number.isInteger(x) && x % 10 === 0; x /= 10) z++
  return z
}
const LAW_NAME: Record<string, string> = {
  'm4.law.w.addComm': 'addComm',
  'm4.law.w.addAssoc': 'addAssoc',
  'm4.law.w.mulComm': 'mulComm',
  'm4.law.w.mulAssoc': 'mulAssoc',
  'm4.law.w.distrib': 'distrib',
}
/** 课本的字母式 */
const LETTER: Record<string, string> = {
  addComm: 'a + b = b + a',
  addAssoc: '(a + b) + c = a + (b + c)',
  mulComm: 'a × b = b × a',
  mulAssoc: '(a × b) × c = a × (b × c)',
  distrib: '(a + b) × c = a × c + b × c',
}
const MONTHS: Record<number, number> = { 1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31 }

/** 「运用了什么运算律」：去掉括号两边一样 = 只动了括号（结合律）；右边没括号 = 只换了位置（交换律）；都有 = 两个都用了 */
function lawOf(e: string): 'Comm' | 'Assoc' | 'Both' {
  const [l, r] = e.split(' = ')
  const strip = (s: string): string => s.replace(/[()]/g, '')
  if (strip(l!) === strip(r!)) return 'Assoc'
  if (!/[()]/.test(r!)) return 'Comm'
  return 'Both'
}

const WORD: Record<string, (p: P) => number> = {
  'm4.law.ride2': (p) => n(p, 'a') + n(p, 'b'),
  'm4.law.ride3': (p) => n(p, 'a') + n(p, 'b') + n(p, 'c'),
  'm4.law.sports': (p) => n(p, 'a') + n(p, 'b') + n(p, 'c') + n(p, 'd'),
  'm4.law.book': (p) => n(p, 't') - n(p, 'a') - n(p, 'b'),
  'm4.law.money': (p) => n(p, 'a') + n(p, 'b') + n(p, 'c'),
  'm4.law.mountain': (p) => n(p, 'h') - n(p, 'x') - n(p, 'y'),
  'm4.law.fridge': (p) => n(p, 't') - n(p, 'a') - n(p, 'b'),
  'm4.law.tv': (p) => n(p, 'p') + n(p, 'a') + n(p, 'b'),
  'm4.law.essay': (p) => n(p, 't') - n(p, 'a') - (n(p, 'a') + n(p, 'k')),
  'm4.law.logs': (p) => (n(p, 'n') * (n(p, 'n') + 1)) / 2,
  'm4.law.pool': (p) => n(p, 'l') * 2 * n(p, 'n'),
  'm4.law.building': (p) => n(p, 'f') * n(p, 'r') * n(p, 'k'),
  'm4.law.clothes': (p) => (n(p, 'a') + n(p, 'b')) * n(p, 'n'),
  'm4.law.shuttle': (p) => n(p, 'n') * n(p, 'k'),
  'm4.law.racket': (p) => n(p, 't') / n(p, 'n') / 2,
  'm4.law.plantDig': (p) => n(p, 'g') * n(p, 'p'),
  'm4.law.plantWater': (p) => n(p, 'g') * n(p, 't') * n(p, 'w'),
  'm4.law.plantAll': (p) => (n(p, 'p') + n(p, 'q')) * n(p, 'g'),
  'm4.law.donate': (p) => n(p, 't') / n(p, 'n'),
  'm4.law.milk': (p) => (n(p, 'a') + n(p, 'b')) * 7,
  'm4.law.q.pair100': (p) => 100 - n(p, 'a'),
}

/** 认出题型并核对答案；认不出返回 false */
function check(q: Question): boolean {
  const ts = texts(q)
  const t0 = ts[0]!
  const k = t0.k
  const p = t0.p
  const es = exprs(q)
  if (WORD[k]) {
    const v = WORD[k]!(p)
    expect(Number.isInteger(v), q.id).toBe(true)
    expect(answer(q), q.id).toBe(v)
    return true
  }
  if (k === 'm4.law.trip4') {
    // 线段图 A—E：四段的数只标在图上，整条下面是「?」，答案是四段的和
    const line = stemsOf(q, 'part-line')[0]!
    const lens = line.parts.map((x) => x.len)
    expect(lens, q.id).toHaveLength(4)
    expect(line.parts.map((x) => x.label), q.id).toEqual(lens.map((x) => `${x} km`))
    expect(line.total, q.id).toBe('?')
    expect(line.names, q.id).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(answer(q), q.id).toBe(lens.reduce((s, x) => s + x, 0))
    return true
  }
  if (k === 'm4.law.cmp') {
    const [l, r] = es[0]!.split(' ○ ')
    const [a, b] = [evalArith(l!), evalArith(r!)]
    expect(correctText(q), q.id).toBe(a > b ? '>' : a < b ? '<' : '=')
    return true
  }
  if (k.startsWith('m4.law.q.def.')) {
    expect(correctKey(q), q.id).toBe(`m4.law.w.${k.slice('m4.law.q.def.'.length)}`)
    return true
  }
  if (k === 'm4.law.q.letter') {
    const name = LAW_NAME[(p.law as { k: string }).k]!
    expect(correctText(q), q.id).toBe(LETTER[name])
    // 干扰项不是这条运算律（有的根本不成立，有的是别的运算律）
    for (const x of wrongLabels(q)) expect(zh(x), q.id).not.toBe(LETTER[name])
    return true
  }
  if (k === 'm4.law.q.whichLetter') {
    // 把字母代进「?」：对的那个字母让两边恒等，别的字母不行
    const e = es[0]!
    const [l, r] = e.split(' = ')
    const fits = (x: string): boolean => sameForm(l!.replace('?', x), r!.replace('?', x))
    expect(fits(correctText(q)), q.id).toBe(true)
    for (const x of wrongLabels(q)) expect(fits(zh(x)), q.id).toBe(false)
    return true
  }
  if (k === 'm4.law.q.equalTo') {
    // 字母式（恒等），或例 7 的两种算法：和 (p + q) × g 得数相等的是 p × g + q × g
    expect(sameForm(es[0]!, correctText(q)), q.id).toBe(true)
    for (const x of wrongLabels(q)) expect(sameForm(es[0]!, zh(x)), q.id).toBe(false)
    return true
  }
  if (k === 'm4.law.q.wordFill') {
    expect(correctKey(q), q.id).toBe('m4.law.word.jia')
    return true
  }
  if (['m4.law.fillComm', 'm4.law.fillAssoc', 'm4.law.fillMul', 'm4.law.fillDist', 'm4.law.fillQ', 'm4.law.fillAssocCalc', 'm4.law.fillDistCalc'].includes(k)) {
    expect(es, q.id).toHaveLength(1)
    expect(holds(es[0]!, answer(q)), q.id).toBe(true)
    // 填的是一个数（不是把整道题算出来）：答案出现在算式的另一边
    if (k === 'm4.law.fillComm' || k === 'm4.law.fillAssoc') expect(es[0]!.replace('?', ''), q.id).toContain(String(answer(q)))
    return true
  }
  if (k === 'm4.law.q.whichLaw') {
    const e = es[0]!
    const mul = e.includes('×')
    const want = `m4.law.w.${mul ? 'mul' : 'add'}${lawOf(e)}`
    expect(correctKey(q), q.id).toBe(want)
    expect(holds(e, ''), q.id).toBe(true)
    return true
  }
  if (k === 'm4.law.q.firstPair' || k === 'm4.law.q.firstStep') {
    // 正确项是算式里的两个数（或被减数 / 被除数和一个数）的一步，算出来末尾的 0 比别的选项多
    const e = p.e as string
    const nums = e.match(/\d+/g)!
    const c = correctText(q)
    for (const x of c.match(/\d+/g)!) expect(nums, `${q.id} ${c}`).toContain(x)
    const zc = zeros(evalArith(c))
    expect(zc, q.id).toBeGreaterThan(0)
    for (const x of wrongLabels(q)) expect(zeros(evalArith(zh(x))), `${q.id} ${zh(x)}`).toBeLessThan(zc)
    return true
  }
  if (k === 'm4.law.easy' || k === 'm4.law.useDist' || k === 'm4.law.oral') {
    expect(es[0]!.endsWith(' = ?'), q.id).toBe(true)
    expect(holds(es[0]!, answer(q)), q.id).toBe(true)
    return true
  }
  if (k === 'm4.law.fit') {
    // 1 + 2 + … + n、2 + 4 + … + 2n、5 + 10 + … + 5n、2n - (2n - 1) + … + 2 - 1
    const e = es[0]!
    const nums = (e.match(/\d+/g) ?? []).map(Number)
    let v: number
    if (e.startsWith('1 + 2 + 3')) v = (nums.at(-1)! * (nums.at(-1)! + 1)) / 2
    else if (e.startsWith('2 + 4 + 6')) v = (nums.at(-1)! / 2) * (nums.at(-1)! / 2 + 1)
    else if (e.startsWith('5 + 10')) v = (5 * (nums.at(-1)! / 5) * (nums.at(-1)! / 5 + 1)) / 2
    else v = nums[0]! / 2
    expect(answer(q), q.id).toBe(v)
    return true
  }
  if (k === 'm4.law.q.verify') {
    const [a, b] = (p.e as string).split(' + ')
    expect(correctText(q), q.id).toBe(`${b} + ${a}`)
    return true
  }
  if (k === 'm4.law.table') {
    // 加法表：格子 = 表头的数 + 左列的数
    const rows = stemsOf(q, 'stat-table')[0]!.rows
    const head = rows[0]!.slice(1) as number[]
    let nulls = 0
    rows.slice(1).forEach((r) => {
      r.slice(1).forEach((c, j) => {
        const want = (r[0] as number) + head[j]!
        if (c === null) {
          nulls++
          expect(answer(q), q.id).toBe(want)
        } else expect(c, q.id).toBe(want)
      })
    })
    expect(nulls, q.id).toBe(1)
    return true
  }
  if (k === 'm4.law.sales' || k === 'm4.law.classTable') {
    // 统计表：最后一列是前面几个数的和，缺一格
    const rows = stemsOf(q, 'stat-table')[0]!.rows.slice(1)
    let nulls = 0
    for (const r of rows) {
      const cells = r.slice(1).map((c) => (c === null ? (nulls++, answer(q)) : (c as number)))
      const total = cells.pop()!
      expect(cells.reduce((s, x) => s + x, 0), q.id).toBe(total)
    }
    expect(nulls, q.id).toBe(1)
    return true
  }
  if (k === 'm4.law.q.sameAs') {
    const e = p.e as string
    expect(evalArith(correctText(q)), q.id).toBe(evalArith(e))
    expect(correctText(q), q.id).not.toBe(e)
    for (const x of wrongLabels(q)) expect(Math.abs(evalArith(zh(x)) - evalArith(e)) > 1e-9, `${q.id} ${zh(x)}`).toBe(true)
    return true
  }
  if (k === 'm4.law.q.right') {
    expect(correctKey(q), q.id).toBe(holds(es[0]!, '') ? 'm4.law.right' : 'm4.law.wrong')
    return true
  }
  if (k === 'm4.law.q.vertical' || k === 'm4.law.q.vertRow') {
    // 竖式 25 × 12：第一行 25 × 2、第二行 25 × 10 写出末尾的 0（和第一行右对齐），积
    const v = stemsOf(q, 'mul-vertical')[0]!
    expect(v.b, q.id).toBeGreaterThan(10)
    expect(v.b, q.id).toBeLessThan(20)
    expect(v.work, q.id).toEqual({ p1: v.a * (v.b - 10), p2: v.a * 10, sum: v.a * v.b, flat: true })
    if (k === 'm4.law.q.vertical') expect(correctKey(q), q.id).toBe('m4.law.w.distrib')
    else {
      expect(n(p, 'n'), q.id).toBe(v.a * 10)
      expect(evalArith(correctText(q)), q.id).toBe(v.a * 10)
      for (const x of wrongLabels(q)) expect(evalArith(zh(x)), q.id).not.toBe(v.a * 10)
    }
    return true
  }
  if (k === 'm4.law.q.usesDist') {
    const dist = /^\d+ × \(\d+ \+ \d+\) = \d+ × \d+ \+ \d+ × \d+$/
    expect(correctText(q), q.id).toMatch(dist)
    expect(holds(correctText(q), ''), q.id).toBe(true)
    for (const x of wrongLabels(q)) expect(zh(x), q.id).not.toMatch(dist)
    return true
  }
  if (k === 'm4.law.equalPair') {
    expect(es, q.id).toHaveLength(2)
    expect(evalArith(es[0]!), q.id).toBe(evalArith(es[1]!))
    expect(answer(q), q.id).toBe(evalArith(es[0]!))
    return true
  }
  if (k === 'm4.law.zooBooks') {
    // 元、角：答案换算成角等于 n × 每本的角数，角不满 10
    const c = correctLabel(q) as { k: string; p: P }
    expect(c.k, q.id).toBe('m4.law.yj')
    expect(n(c.p, 'y') * 10 + n(c.p, 'j'), q.id).toBe(n(p, 'n') * (n(p, 'y') * 10 + n(p, 'j')))
    expect(n(c.p, 'j'), q.id).toBeLessThan(10)
    expect(n(c.p, 'j'), q.id).toBeGreaterThan(0)
    return true
  }
  if (k === 'm4.law.q.splitHow') {
    // 12 × 25 拆成 3 × 4（4 和 25 凑成 100）、88 × 125 拆成 11 × 8（8 和 125 凑成 1000）
    const [a, m] = (p.e as string).split(' × ').map(Number)
    const [x, y] = correctText(q).split(' × ').map(Number)
    expect(x! * y!, q.id).toBe(a)
    expect(y, q.id).toBe(m === 25 ? 4 : 8)
    for (const w of wrongLabels(q)) {
      const [u, v] = zh(w).split(' × ').map(Number)
      expect(u! * v!, q.id).toBe(a)
      expect([u, v], q.id).not.toContain(m === 25 ? 4 : 8)
    }
    return true
  }
  if (k === 'm4.law.album') {
    const cap = n(p, 'p') * n(p, 'k') * n(p, 'm')
    expect(cap, q.id).not.toBe(n(p, 'n'))
    expect(correctKey(q), q.id).toBe(cap >= n(p, 'n') ? 'm4.law.enough' : 'm4.law.notEnough')
    return true
  }
  if (k === 'm4.law.semester') {
    const [m1, m2] = [n(p, 'm1'), n(p, 'm2')]
    let days = 0
    for (let m = m1; m !== m2; m = (m % 12) + 1) days += MONTHS[m]!
    expect(answer(q), q.id).toBe(days)
    return true
  }
  if (k === 'm4.law.garden') {
    // L 形菜地：用多边形的顶点算面积（鞋带公式），图上标的边长和顶点对得上
    const fig = stemsOf(q, 'geo')[0]!.figs[0]!
    const poly = fig.items[0] as { t: 'poly'; pts: [number, number][]; labels: (string | null)[] }
    const pts = poly.pts
    let area2 = 0
    pts.forEach(([x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % pts.length]!
      area2 += x1 * y2 - x2 * y1
    })
    expect(answer(q), q.id).toBe(Math.abs(area2) / 2)
    poly.labels.forEach((l, i) => {
      if (l === null) return
      const [x1, y1] = pts[i]!
      const [x2, y2] = pts[(i + 1) % pts.length]!
      expect(l, q.id).toBe(`${Math.hypot(x2 - x1, y2 - y1)} m`)
    })
    // 标出的四条边就够算面积（上边、左边、伸出去的那段、右边）
    expect(poly.labels.filter((l) => l !== null), q.id).toHaveLength(4)
    return true
  }
  if (k === 'm4.law.puzzle') {
    // 🍎 + 🍎 = 3 个 🍌，3 个 🍌 = 4 个 🍇，🍎 + 🍌 + 2 个 🍇 = 总数
    const total = Number(es[2]!.split(' = ')[1])
    const m = total / 16
    expect(Number.isInteger(m), q.id).toBe(true)
    const v: Record<string, number> = { '🍎': 6 * m, '🍌': 4 * m, '🍇': 3 * m }
    const ask = ts[1]!.p.x as string
    expect(answer(q), q.id).toBe(v[ask])
    expect(v['🍎']! * 2, q.id).toBe(v['🍌']! * 3)
    expect(v['🍌']! * 3, q.id).toBe(v['🍇']! * 4)
    return true
  }
  return false
}

describe('五个知识点：答案都对得上', () => {
  for (const kp of ALL) {
    it(`${kp}：认得出每道题、答案对`, () => {
      each(kp, (q) => {
        expect(check(q), `${q.id} 认不出题型`).toBe(true)
      })
    })
  }
})

describe('照课本的约束', () => {
  it('运算律的字母照课本小写，乘号不省略（「a × b」不写「ab」）', () => {
    for (const kp of ALL) {
      each(kp, (q) => {
        const all = [...exprs(q), ...(q.choices ?? []).map((c) => zh(c.label))]
        for (const s of all) {
          expect(s, q.id).not.toMatch(/[A-Z]/)
          expect(s, q.id).not.toMatch(/[abc]\s*[abc(]|\)\s*[abc(]/)
        }
      })
    }
  })

  it('算式里每一步都是非负整数（选项里的错算式除外）', () => {
    for (const kp of ALL) {
      each(kp, (q) => {
        for (const e of exprs(q)) {
          if (/[abc🍎🍌🍇…○]/u.test(e)) continue
          for (const side of e.replace('?', String(answer(q))).split(' = ')) {
            const v = evalArith(side)
            expect(Number.isInteger(v) && v >= 0, `${q.id}：${side}`).toBe(true)
          }
        }
      })
    }
  })

  it('题目文字不写圆括号、只在「长度」里写「长」、「只」前面不放数、量词表外的量词前面不出 2', () => {
    for (const kp of ALL) {
      each(kp, (q) => {
        for (const part of stemsOf(q, 'text')) {
          const s = zh(part.text)
          expect(s, q.id).not.toMatch(/[()（）○]/)
          expect(s.replace(/长度/g, ''), q.id).not.toMatch(/长/)
          expect(s, q.id).not.toMatch(/\d\s*只/)
          expect(s, q.id).not.toMatch(/(?<![\d.])2\s*(枝|副|册|篇|间|笔|台)/)
        }
      })
    }
  })

  it('课本没起名的不起名（减法的性质、除法的性质），乘法分配律只讲「和」的形式', () => {
    for (const v of Object.values(ZH)) expect(String(v)).not.toMatch(/减法的性质|除法的性质/)
  })

  it('动物丛书的钱照这一单元写成「几元几角」，不写小数', () => {
    each(DISTRIB, (q) => {
      for (const c of q.choices ?? []) expect(zh(c.label), q.id).not.toMatch(/\d\.\d/)
    })
  })
})

describe('第 1 档有课本每个例题和做一做', () => {
  // 第 1 档每种题占的份额不大，多跑一些种子看全
  const kinds = (kp: string): Set<string> => {
    const seen = new Set<string>()
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 600; seed++) {
      const q = gen(1, createRng(seed))
      const ts = texts(q)
      const k = ts[0]!.k
      if (k === 'm4.law.q.equalTo') seen.add(/[abc]/.test(exprs(q)[0]!) ? k : `${k}:num`)
      else if (k === 'm4.law.q.letter' || k === 'm4.law.q.whichLetter') seen.add(`${k}:${(ts[0]!.p.law as { k: string }).k}`)
      else if (k === 'm4.law.q.whichLaw') seen.add(`${k}:${correctKey(q)}`)
      else if (k === 'm4.law.cmp') seen.add(`${k}:${exprs(q)[0]!.includes('(') ? 'paren' : 'flat'}`)
      else if (k === 'm4.law.q.def.addComm' || k.startsWith('m4.law.q.def.')) seen.add(k)
      else if (k === 'm4.law.easy' || k === 'm4.law.fillQ' || k.startsWith('m4.law.fill')) seen.add(`${k}:${exprs(q)[0]!.replace(/\d+/g, 'n')}`)
      else seen.add(k)
    }
    return seen
  }
  it('加法交换律和结合律：例 1、例 2 的比一比，名字、字母式、文字式，做一做的填数，练习五 1 用了什么运算律', () => {
    const s = kinds(ADD_LAWS)
    for (const x of ['m4.law.cmp:flat', 'm4.law.cmp:paren', 'm4.law.q.def.addComm', 'm4.law.q.def.addAssoc', 'm4.law.q.letter:m4.law.w.addComm', 'm4.law.q.letter:m4.law.w.addAssoc', 'm4.law.q.whichLetter:m4.law.w.addComm', 'm4.law.q.wordFill', 'm4.law.fillComm:n + n = n + ?', 'm4.law.fillAssoc:(n + n) + n = n + (n + ?)', 'm4.law.q.whichLaw:m4.law.w.addComm', 'm4.law.q.whichLaw:m4.law.w.addAssoc', 'm4.law.ride3']) {
      expect(s.has(x), `第 1 档缺 ${x}`).toBe(true)
    }
  })
  it('加法运算律的应用：例 3（线段图、先算哪两个、递等式填数）、做一做的连加与体育用品、例 4 与做一做的连减', () => {
    const s = kinds(ADD_APPLY)
    for (const x of ['m4.law.trip4', 'm4.law.q.firstPair', 'm4.law.fillQ:n + n + n + n = (n + n) + (n + ?)', 'm4.law.sports', 'm4.law.book', 'm4.law.q.sameAs', 'm4.law.q.equalTo', 'm4.law.fillQ:n - n - n = n - (n + ?)', 'm4.law.fillQ:n - n - n = ? - (n + n)', 'm4.law.q.firstStep', 'm4.law.easy:n - n - n - n = ?']) {
      expect(s.has(x), `第 1 档缺 ${x}`).toBe(true)
    }
  })
  it('乘法交换律和结合律：例 5、例 6（植树）、比一比、名字、字母式、做一做的填数、练习七 1 口算', () => {
    const s = kinds(MUL_LAWS)
    for (const x of ['m4.law.plantDig', 'm4.law.plantWater', 'm4.law.cmp:flat', 'm4.law.cmp:paren', 'm4.law.q.def.mulComm', 'm4.law.q.def.mulAssoc', 'm4.law.q.letter:m4.law.w.mulComm', 'm4.law.q.letter:m4.law.w.mulAssoc', 'm4.law.fillMul:n × n = n × ?', 'm4.law.fillMul:n × (n × n) = (n × ?) × n', 'm4.law.oral']) {
      expect(s.has(x), `第 1 档缺 ${x}`).toBe(true)
    }
  })
  it('乘法分配律：例 7（一共多少名同学、另一种算法）、比一比、名字、字母式、做一做的判断与竖式', () => {
    const s = kinds(DISTRIB)
    for (const x of ['m4.law.plantAll', 'm4.law.q.equalTo:num', 'm4.law.cmp:paren', 'm4.law.q.def.distrib', 'm4.law.q.equalTo', 'm4.law.q.right', 'm4.law.q.vertical', 'm4.law.q.vertRow']) {
      expect(s.has(x), `第 1 档缺 ${x}`).toBe(true)
    }
    // 做一做 1 的三种判断：少乘一次（不对）、把乘法当分配（不对）、把相同的因数提出来（对）
    const forms = new Set<string>()
    for (let seed = 1; seed <= 600; seed++) {
      const q = getGenerator(DISTRIB)!(1, createRng(seed))
      if (texts(q)[0]!.k !== 'm4.law.q.right') continue
      const e = exprs(q)[0]!
      if (/^\d+ × \(\d+ \+ \d+\) = \d+ × \d+ \+ \d+$/.test(e)) forms.add('miss')
      if (/^\d+ × \(\d+ × \d+\) = \d+ × \d+ \+ \d+ × \d+$/.test(e)) forms.add('mul')
      if (/^\d+ × \d+ \+ \d+ × \d+ = /.test(e)) forms.add('factor')
    }
    expect([...forms].sort()).toEqual(['factor', 'miss', 'mul'])
  })
  it('乘法运算律的应用：例 8（12 × 25 两种拆法、羽毛球、连除）、做一做', () => {
    const s = kinds(MUL_APPLY)
    for (const x of ['m4.law.q.splitHow', 'm4.law.fillAssocCalc:n × n = n × (n × n) = n × ?', 'm4.law.fillDistCalc:n × n = n × n + ? × n', 'm4.law.shuttle', 'm4.law.racket', 'm4.law.q.sameAs', 'm4.law.fillQ:n ÷ n ÷ n = n ÷ (n × ?)', 'm4.law.easy:n × n × n = ?', 'm4.law.easy:n ÷ n ÷ n = ?']) {
      expect(s.has(x), `第 1 档缺 ${x}`).toBe(true)
    }
  })
})

describe('第 2、3 档放练习里的题', () => {
  it('练习五到练习八的题都出得到', () => {
    const seen = new Set<string>()
    for (const kp of ALL) {
      each(kp, (q, d) => {
        if (d === 1) return
        seen.add(texts(q)[0]!.k)
      })
    }
    for (const k of ['m4.law.q.verify', 'm4.law.table', 'm4.law.sales', 'm4.law.q.pair100', 'm4.law.money', 'm4.law.mountain', 'm4.law.fridge', 'm4.law.tv', 'm4.law.essay', 'm4.law.classTable', 'm4.law.fit', 'm4.law.logs', 'm4.law.pool', 'm4.law.building', 'm4.law.q.usesDist', 'm4.law.useDist', 'm4.law.equalPair', 'm4.law.clothes', 'm4.law.zooBooks', 'm4.law.donate', 'm4.law.album', 'm4.law.semester', 'm4.law.milk', 'm4.law.garden', 'm4.law.puzzle']) {
      expect(seen.has(k), `第 2、3 档缺 ${k}`).toBe(true)
    }
  })
})
