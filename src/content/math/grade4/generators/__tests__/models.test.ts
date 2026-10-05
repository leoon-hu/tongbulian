import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade4' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { PRICE, SPEED, TOTAL } from '../models'

// 四上「加法模型和乘法模型」的专项检查：从题干参数、表格反推答案；数量关系、单价和速度的写法照课本；
// 除法照课本（除数是一位数、都能整除）；第 1 档有课本每个例题和做一做；朗读不踩坑。
const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
function stemsOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }>[] {
  return q.stem.filter((p) => p.kind === kind) as Extract<StemPart, { kind: K }>[]
}
type P = Record<string, number | string | { k: string }>
function textOf(q: Question, i = 0): { k: string; p: P } | null {
  const t = stemsOf(q, 'text')[i]?.text
  return t && typeof t === 'object' ? { k: t.k, p: (t.p ?? {}) as P } : null
}
/** 题干里问问题的那一句（例 4 的列式题前面还有一句条件） */
const askOf = (q: Question): { k: string; p: P } => textOf(q, stemsOf(q, 'text').length - 1)!
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
const answerNumber = (q: Question): number => Number(correctText(q))
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
function evalArith(expr: string): number {
  const src = expr.replace(/×/g, '*').replace(/÷/g, '/').trim()
  expect(src).toMatch(/^[\d\s+\-*/()]+$/)
  return new Function(`return (${src})`)() as number
}
/** 表格某一行某一格（数） */
const cell = (q: Question, r: number, c: number): number | null => stemsOf(q, 'stat-table')[0]!.rows[r]![c] as number | null

/** 应用题：词条键 → 按参数算出的答案 */
const WORD: Record<string, (p: P) => number> = {
  'm4.mod.lib.amStudents': (p) => n(p, 's') - n(p, 't'),
  'm4.mod.book.all': (p) => n(p, 'p1') + n(p, 'p2') + n(p, 'p3') + n(p, 'p4'),
  'm4.mod.book.rest': (p) => n(p, 's') - n(p, 'p'),
  'm4.mod.club.two': (p) => n(p, 'a') + n(p, 'b') + n(p, 'c') + n(p, 'd'),
  'm4.mod.club.girls': (p) => n(p, 'n') - n(p, 'a') - n(p, 'b') - n(p, 'c'),
  'm4.mod.w.bookCorner': (p) => n(p, 'a') + n(p, 'b'),
  'm4.mod.w.farm': (p) => n(p, 'a') * 2 + n(p, 'b'),
  'm4.mod.w.bikes': (p) => n(p, 'a') - n(p, 'b') + n(p, 'c'),
  'm4.mod.w.fruit': (p) => n(p, 'a') + n(p, 'b'),
  'm4.mod.w.fruitLess': (p) => n(p, 'b') * 2 - n(p, 'c'),
  'm4.mod.w.buses': (p) => n(p, 'a') * n(p, 'x') + n(p, 'b') * n(p, 'y') + n(p, 'c') * n(p, 'z'),
  'm4.mod.w.milk': (p) => n(p, 'p') * n(p, 'n'),
  'm4.mod.w.uniform': (p) => n(p, 'p') * n(p, 'n'),
  'm4.mod.w.chalk': (p) => n(p, 't') / n(p, 'n'),
  'm4.mod.w.appleQty': (p) => n(p, 't') / n(p, 'p'),
  'm4.mod.w.pens': (p) => n(p, 'p') * n(p, 'n'),
  'm4.mod.w.pensUnit': (p) => n(p, 't') / n(p, 'n'),
  'm4.mod.w.save': (p) => (n(p, 'a') - n(p, 'b')) * n(p, 'n'),
  'm4.mod.w.rice': (p) => (n(p, 't') + n(p, 'c')) / n(p, 'n'),
  'm4.mod.w.balls': (p) => n(p, 'n') * n(p, 'p') + n(p, 's'),
  'm4.mod.w.meal': (p) => n(p, 'x') * n(p, 'm') + n(p, 'y') * n(p, 'k'),
  'm4.mod.w.mealWays': (p) => [0, 1, 2, 3].filter((i) => n(p, 'x') * i + n(p, 'y') * (3 - i) <= n(p, 'm')).length,
  'm4.mod.w.tickets': (p) => {
    const [a, c, g, t, k] = [n(p, 'a'), n(p, 'c'), n(p, 'g'), n(p, 't'), n(p, 'n')]
    // 所有买法里最便宜的：团体票买 j 张（j = 0 或 10 ≤ j ≤ 总人数，老师先进团体），其余老师买成人票、学生买儿童票
    let best = Infinity
    for (let j = 0; j <= t + k; j++) {
      if (j > 0 && j < 10) continue
      const teachers = Math.max(0, t - j)
      const pupils = k - Math.max(0, j - t)
      best = Math.min(best, j * g + teachers * a + pupils * c)
    }
    return best
  },
  'm4.mod.w.walkSpeed': (p) => n(p, 'd') / n(p, 't'),
  'm4.mod.w.carSpeed': (p) => n(p, 'd') / n(p, 't'),
  'm4.mod.w.walkDist': (p) => n(p, 'v') * n(p, 't'),
  'm4.mod.w.bee': (p) => n(p, 'd') / n(p, 'v'),
  'm4.mod.w.odometer': (p) => (n(p, 'o2') - n(p, 'o1')) / (n(p, 'h2') - n(p, 'h1')),
  'm4.mod.w.afternoon': (p) => n(p, 'v') * (n(p, 'h2') - n(p, 'h1')),
  'm4.mod.w.leftover': (p) => (n(p, 'D') - n(p, 'r')) / n(p, 't'),
  'm4.mod.w.jog': (p) => (n(p, 'v') * n(p, 't') * 7) / 1000,
  'm4.mod.w.trip': (p) => n(p, 'v') * n(p, 't'),
  'm4.mod.w.tripBack': (p) => (n(p, 'v') * n(p, 't')) / n(p, 's'),
}

/** 数量关系选一选：问的是求谁 → 正确的关系 */
const REL: Record<string, string> = {
  'm4.mod.q.relSum': 'm4.mod.f.sumAdd',
  'm4.mod.q.relPart': 'm4.mod.f.partSub',
  'm4.mod.word.total': 'm4.mod.f.pMul',
  'm4.mod.word.unit': 'm4.mod.f.uDiv',
  'm4.mod.word.qty': 'm4.mod.f.qDiv',
  'm4.mod.word.dist': 'm4.mod.f.dMul',
  'm4.mod.word.speed': 'm4.mod.f.vDiv',
  'm4.mod.word.time': 'm4.mod.f.tDiv',
}
const DEF: Record<string, string> = {
  'm4.mod.q.defUnit': 'm4.mod.word.unit',
  'm4.mod.q.defQty': 'm4.mod.word.qty',
  'm4.mod.q.defTotal': 'm4.mod.word.total',
  'm4.mod.q.defDist': 'm4.mod.word.dist',
  'm4.mod.q.defSpeed': 'm4.mod.word.speed',
  'm4.mod.q.defTime': 'm4.mod.word.time',
}
const speedOf = (d: number, t: number): number => d / t

/** 认出题型并核对答案；认不出返回 false */
function check(q: Question): boolean {
  const t = askOf(q)
  const p = t.p
  if (WORD[t.k]) {
    expect(answerNumber(q), q.id).toBe(WORD[t.k]!(p))
    return true
  }
  if (t.k in REL || t.k === 'm4.mod.q.rel') {
    const want = t.k === 'm4.mod.q.rel' ? REL[(p.x as { k: string }).k] : REL[t.k]
    expect(correctKey(q), q.id).toBe(want)
    return true
  }
  if (DEF[t.k]) {
    expect(correctKey(q), q.id).toBe(DEF[t.k])
    return true
  }
  switch (t.k) {
    case 'm4.mod.lib.am':
    case 'm4.mod.lib.pm':
    case 'm4.mod.lib.all':
    case 'm4.mod.lib.teachers':
    case 'm4.mod.lib.students': {
      const [t1, t2, s1, s2] = [cell(q, 1, 1)!, cell(q, 1, 2)!, cell(q, 2, 1)!, cell(q, 2, 2)!]
      const want = { 'm4.mod.lib.am': t1 + s1, 'm4.mod.lib.pm': t2 + s2, 'm4.mod.lib.all': t1 + t2 + s1 + s2, 'm4.mod.lib.teachers': t1 + t2, 'm4.mod.lib.students': s1 + s2 }[t.k]
      expect(answerNumber(q), q.id).toBe(want)
      return true
    }
    case 'm4.mod.book.three': {
      const sum = n(p, 'p1') + n(p, 'p2') + n(p, 'p3')
      expect(sum, q.id).not.toBe(n(p, 'm'))
      expect(correctKey(q), q.id).toBe(sum <= n(p, 'm') ? 'm4.mod.enough' : 'm4.mod.notEnough')
      return true
    }
    case 'm4.mod.fillQ': {
      // 算式里只有一个「?」：解出来
      const e = stemsOf(q, 'expr')[0]!.expr
      const [lhs, rhs] = e.split(' = ')
      const v = answerNumber(q)
      expect(evalArith(lhs!.replace('?', String(v))), q.id).toBe(rhs === '?' ? v : evalArith(rhs!))
      return true
    }
    case 'm4.mod.w.writeUnit':
      expect(correctKey(q), q.id).toBe('m4.mod.u.ypk')
      expect(correctText(q), q.id).toBe(`${p.p} 元/千克`)
      return true
    case 'm4.mod.q.saveHow': {
      const info = textOf(q, 0)!.p
      const want = (n(info, 'a') - n(info, 'b')) * n(info, 'n')
      expect(evalArith(correctText(q)), q.id).toBe(want)
      for (const l of labels(q).filter((l) => l !== correctText(q))) expect(evalArith(l), q.id).not.toBe(want)
      return true
    }
    case 'm4.mod.tableFill': {
      // 花店：单价 × 数量 = 总价，缺一格
      const row = stemsOf(q, 'stat-table')[0]!.rows[1]!.slice(1) as (number | null)[]
      const v = answerNumber(q)
      const [u, k, total] = row.map((x) => (x === null ? v : x)) as [number, number, number]
      expect(u * k, q.id).toBe(total)
      // 求单价、求数量的除数是一位数
      if (row[0] === null) expect(k, q.id).toBeLessThan(10)
      if (row[1] === null) expect(u, q.id).toBeLessThan(10)
      return true
    }
    case 'm4.mod.rcpt.amount':
    case 'm4.mod.rcpt.qty':
    case 'm4.mod.rcpt.sum': {
      const rows = stemsOf(q, 'stat-table')[0]!.rows
      const v = answerNumber(q)
      const items = rows.slice(1, -1)
      let total = 0
      for (const r of items) {
        const qty = r[2] === null ? v : ((r[2] as unknown as { p: { v: number } }).p.v)
        const amount = r[3] === null ? v : (r[3] as number)
        expect((r[1] as number) * qty, q.id).toBe(amount)
        if (r[2] === null) expect(r[1] as number, `${q.id} 求数量的除数是一位数`).toBeLessThan(10)
        total += amount
      }
      const last = rows.at(-1)![3]
      expect(last === null ? v : last, q.id).toBe(total)
      return true
    }
    case 'm4.mod.w.bowls':
      // 108 ÷ 6 = 18：6 个碗和 6 个杯子，求的是一个碗和一个杯子一共多少元
      expect(correctKey(q), q.id).toBe('m4.mod.c.set')
      expect(n(p, 't') % n(p, 'n'), q.id).toBe(0)
      return true
    case 'm4.mod.w.milkDeal': {
      const per = [n(p, 'a'), n(p, 'b') / 4, n(p, 'c') / 8]
      const best = Math.min(...per)
      expect(per.filter((x) => x === best), q.id).toHaveLength(1)
      expect(correctKey(q), q.id).toBe(['m4.mod.c.single', 'm4.mod.c.four', 'm4.mod.c.case'][per.indexOf(best)])
      return true
    }
    case 'm4.mod.w.who': {
      const [vx, vy] = [speedOf(n(p, 'dx'), n(p, 'tx')), speedOf(n(p, 'dy'), n(p, 'ty'))]
      expect(vx, q.id).not.toBe(vy)
      expect(correctKey(q), q.id).toBe(((vx > vy ? p.x : p.y) as { k: string }).k)
      return true
    }
    case 'm4.mod.w.whoFaster': {
      const vy = speedOf(n(p, 'd'), n(p, 't'))
      expect(Number.isInteger(vy), q.id).toBe(true)
      expect(correctKey(q), q.id).toBe(((n(p, 'v') > vy ? p.x : p.y) as { k: string }).k)
      return true
    }
    case 'm4.mod.w.writeSpeed':
      expect(correctText(q), q.id).toBe(`${p.v} 米/分`)
      return true
    case 'm4.mod.w.planeSpeed':
      expect(correctText(q), q.id).toBe(`${p.v} 千米/时`)
      return true
    case 'm4.mod.w.service': {
      const rest = n(p, 'D') - n(p, 'a')
      expect(rest, q.id).not.toBe(n(p, 'v') * n(p, 't'))
      expect(correctKey(q), q.id).toBe(n(p, 'v') * n(p, 't') >= rest ? 'm4.mod.can' : 'm4.mod.cannot')
      return true
    }
  }
  return false
}

describe('三个知识点共有的约束', () => {
  for (const kp of [TOTAL, PRICE, SPEED]) {
    it(`${kp}：答案都对得上，朗读不踩坑，单价和速度照课本的写法`, () => {
      each(kp, (q) => {
        expect(check(q), `${q.id} 认不出题型`).toBe(true)
        for (const part of stemsOf(q, 'text')) {
          const s = zh(part.text)
          expect(s, q.id).not.toMatch(/[○()（）]/)
          expect(s, q.id).not.toMatch(/(?<![\d.])2\s*(枝|台|盆|串)/)
          // 多音字：行只在行驶、飞行里，长只在书名《长城故事》里（读音唯一），不出重
          expect(s.replace(/行驶|飞行|长城/g, ''), q.id).not.toMatch(/[长重行]/)
          // 单价、速度照课本写成「12 元/千克」「80 米/分」「40 千米/时」，不写 m/min、km/h
          expect(s, q.id).not.toMatch(/km\/h|m\/min|千米每时|米每分/)
        }
      })
    })
  }
})

describe('除法照课本：除数是一位数、都能整除', () => {
  it('求单价、数量、速度、时间的题，除出来是整数、除数不超过 9', () => {
    const DIV: Record<string, [string, string]> = {
      'm4.mod.w.chalk': ['t', 'n'],
      'm4.mod.w.appleQty': ['t', 'p'],
      'm4.mod.w.pensUnit': ['t', 'n'],
      'm4.mod.w.rice': ['t', 'n'],
      'm4.mod.w.walkSpeed': ['d', 't'],
      'm4.mod.w.carSpeed': ['d', 't'],
      'm4.mod.w.bee': ['d', 'v'],
      'm4.mod.w.leftover': ['D', 't'],
      'm4.mod.w.tripBack': ['v', 's'],
      'm4.mod.w.bowls': ['t', 'n'],
    }
    let seen = 0
    for (const kp of [TOTAL, PRICE, SPEED]) {
      each(kp, (q) => {
        const t = askOf(q)
        if (t.k === 'm4.mod.w.odometer') {
          expect(n(t.p, 'h2') - n(t.p, 'h1'), q.id).toBeLessThan(10)
          expect(n(t.p, 'h2'), `${q.id} 到达时刻不过中午 12 点`).toBeLessThanOrEqual(12)
        }
        const div = DIV[t.k]
        if (!div) return
        seen++
        expect(n(t.p, div[1]), q.id).toBeLessThan(10)
        expect(n(t.p, div[1]), q.id).toBeGreaterThan(1)
        expect(Number.isInteger(WORD[t.k] ? WORD[t.k]!(t.p) : n(t.p, div[0]) / n(t.p, div[1])), q.id).toBe(true)
      })
    }
    expect(seen).toBeGreaterThan(100)
  })
})

describe('第 1 档有课本每个例题和做一做', () => {
  const firstTier = (kp: string): Set<string> => {
    const seen = new Set<string>()
    each(kp, (q, d) => {
      if (d !== 1) return
      const t = askOf(q)
      seen.add(t.k === 'm4.mod.q.rel' ? `rel:${(t.p.x as { k: string }).k}` : t.k)
    })
    return seen
  }
  it('总量与分量：例 1 的借书表（上午、下午、一共、教师、学生）与求另一个分量、数量关系，例 2 买书，做一做社团', () => {
    const seen = firstTier(TOTAL)
    for (const k of ['m4.mod.lib.am', 'm4.mod.lib.pm', 'm4.mod.lib.all', 'm4.mod.lib.teachers', 'm4.mod.lib.students', 'm4.mod.lib.amStudents', 'm4.mod.q.relSum', 'm4.mod.q.relPart', 'm4.mod.book.three', 'm4.mod.book.all', 'm4.mod.book.rest', 'm4.mod.club.two', 'm4.mod.club.girls']) {
      expect(seen.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
  })
  it('单价、数量和总价：例 3（求总价、单价、数量，三个概念、三个关系、单价的写法），做一做，例 4 节省的钱和两种列式，做一做的大米', () => {
    const seen = firstTier(PRICE)
    for (const k of ['m4.mod.w.milk', 'm4.mod.w.uniform', 'm4.mod.w.chalk', 'm4.mod.w.appleQty', 'm4.mod.q.defUnit', 'm4.mod.q.defQty', 'm4.mod.q.defTotal', 'rel:m4.mod.word.total', 'rel:m4.mod.word.unit', 'rel:m4.mod.word.qty', 'm4.mod.w.writeUnit', 'm4.mod.w.save', 'm4.mod.q.saveHow', 'm4.mod.w.rice']) {
      expect(seen.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
  })
  it('时间、速度、路程：例 5（求速度、比快慢、三个概念、速度的写法、三个关系），做一做，例 6 里程表，做一做', () => {
    const seen = firstTier(SPEED)
    for (const k of ['m4.mod.w.walkSpeed', 'm4.mod.w.who', 'm4.mod.q.defDist', 'm4.mod.q.defSpeed', 'm4.mod.q.defTime', 'm4.mod.w.writeSpeed', 'm4.mod.w.planeSpeed', 'rel:m4.mod.word.dist', 'rel:m4.mod.word.speed', 'rel:m4.mod.word.time', 'm4.mod.w.walkDist', 'm4.mod.w.bee', 'm4.mod.w.odometer', 'm4.mod.w.afternoon', 'm4.mod.w.leftover']) {
      expect(seen.has(k), `第 1 档缺 ${k}`).toBe(true)
    }
  })
  it('比快慢三种都有：时间相同比路程、路程相同比时间、都不同先算速度', () => {
    const kinds = new Set<string>()
    each(SPEED, (q) => {
      const t = askOf(q)
      if (t.k !== 'm4.mod.w.who') return
      kinds.add(n(t.p, 'tx') === n(t.p, 'ty') ? 'same-time' : n(t.p, 'dx') === n(t.p, 'dy') ? 'same-dist' : 'both')
    })
    expect([...kinds].sort()).toEqual(['both', 'same-dist', 'same-time'])
  })
})
