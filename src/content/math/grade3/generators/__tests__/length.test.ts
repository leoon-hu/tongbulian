import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3'
import { createRng, getGenerator } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { BASE, LENGTH_THINGS, type Unit } from '../length'
import { MASS_THINGS } from '../mass'

// 毫米、分米和千米 + 曹冲称象：从题目本身（模板参数、尺子、秤面）反推答案，和生成器给的答案比对。
const KPS = ['m3s1-03-mm-dm', 'm3s1-03-km', 'm3s1-03-choose-unit', 'm3s1-03-convert', 'm3s1-04-mass-units', 'm3s1-04-weighing']

type P = Record<string, unknown>
const texts = (q: Question): { k: string; p: P }[] =>
  q.stem.flatMap((s: StemPart) => (s.kind === 'text' && typeof s.text === 'object' ? [{ k: s.text.k, p: (s.text.p ?? {}) as P }] : []))
const unitOf = (l: unknown): Unit => (l as { k: string }).k.replace('m3.u.', '').replace('t1', 't') as Unit
const num = (x: unknown): number => x as number
const zh = (l: LStr): string => translate(l, 'zh')

/** 选对的选项的文字（中文） */
function picked(q: Question): string {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}
const answerNum = (q: Question): number => Number(picked(q))

/** 按模板重算：数值题返回数，比大小返回符号，选单位 / 对不对返回中文 */
function expected(q: Question): string | number | null {
  for (const { k, p } of texts(q)) {
    const a = num(p.a)
    const b = num(p.b)
    switch (k) {
      case 'm3.u.conv':
        return (a * BASE[unitOf(p.ua)]) / BASE[unitOf(p.ub)]
      case 'm3.u.rate':
        return BASE[unitOf(p.ua)] / BASE[unitOf(p.ub)]
      case 'm3.u.convTwo':
        return (a * BASE[unitOf(p.ua)] + b * BASE[unitOf(p.ub)]) / BASE[unitOf(p.uc)]
      case 'm3.u.split':
        return (a * BASE[unitOf(p.ua)] - b * BASE[unitOf(p.ub)]) / BASE[unitOf(p.uc)]
      case 'm3.u.add':
        return (a * BASE[unitOf(p.ua)] + b * BASE[unitOf(p.ub)]) / BASE[unitOf(p.uc)]
      case 'm3.u.sub':
        return (a * BASE[unitOf(p.ua)] - b * BASE[unitOf(p.ub)]) / BASE[unitOf(p.uc)]
      case 'm3.u.cmpLine': {
        const x = a * BASE[unitOf(p.ua)]
        const y = b * BASE[unitOf(p.ub)]
        return x > y ? '>' : x < y ? '<' : '='
      }
      case 'm3.len.rulerMm':
      case 'm3.len.rulerCmMm': {
        const r = q.stem.find((s) => s.kind === 'ruler') as Extract<StemPart, { kind: 'ruler' }>
        expect(r.mm).toBe(true)
        expect(r.to).toBeLessThanOrEqual(r.length * 10)
        const len = r.to - r.from
        if (k === 'm3.len.rulerMm') return len
        expect(Math.floor(len / 10)).toBe(num(p.cm))
        return len % 10
      }
      case 'm3.len.wood':
        return (num(p.m) * 10) / num(p.k)
      case 'm3.len.fold':
        return (num(p.dm) * 10) / 4
      case 'm3.len.boards':
        return num(p.dm) * 20 - num(p.cm)
      case 'm3.km.hundreds':
        return 1000 / num(p.n)
      case 'm3.km.track':
        return (num(p.n) * 400) / 1000
      case 'm3.km.pool':
        return 1000 / (2 * num(p.n))
      case 'm3.km.steps':
        return (num(p.n) * 50) / 100
      case 'm3.km.minutes':
        return num(p.v) * num(p.t)
      case 'm3.km.stops':
        return num(p.n) * 500
      case 'm3.km.late':
        return (num(p.d) * 1000) / num(p.v) <= num(p.m) ? '能' : '不能'
      case 'm3.km.walkFar':
        return '不对'
      case 'm3.mass.readKg':
      case 'm3.mass.readG': {
        const s = q.stem.find((x) => x.kind === 'scale') as Extract<StemPart, { kind: 'scale' }>
        expect(s.unit).toBe(k === 'm3.mass.readKg' ? 'kg' : 'g')
        expect(s.value).toBeGreaterThan(0)
        expect(s.value).toBeLessThan(s.max)
        return s.value
      }
      case 'm3.mass.jinOfGongjin':
        return 2 * num(p.k)
      case 'm3.mass.gOfJin':
        return 500 * num(p.k)
      case 'm3.mass.gongjin':
        return 1
      case 'm3.mass.salt':
        return 200 * num(p.k)
      case 'm3.mass.salt1':
        return 200
      case 'm3.mass.diff':
        expect(num(p.x)).toBeGreaterThan(num(p.y))
        return num(p.x) - num(p.y)
      case 'm3.mass.cao3':
        return num(p.a) + num(p.b) + num(p.c)
      case 'm3.mass.cao4': {
        const sum = num(p.a) + num(p.b) + num(p.c) + num(p.e)
        expect(sum % 1000).toBe(0)
        return sum / 1000
      }
      case 'm3.mass.beans':
        return 5 * num(p.g)
      case 'm3.mass.tomato':
        return 6 * num(p.k)
      case 'm3.mass.sacks':
        return 100 * num(p.k)
      case 'm3.mass.sacksTon':
        return 10
      case 'm3.mass.sacksOfTons':
        return 10 * num(p.t)
    }
    // 一样东西的那句话：问单位（___）或问对不对（带单位）
    const m = /^m3\.(len|mass)\.it\.(.+)$/.exec(k)
    if (m) {
      const t = (m[1] === 'len' ? LENGTH_THINGS : MASS_THINGS).find((x) => x.id === m[2])!
      expect(num(p.n)).toBe(t.n)
      if (p.u === '___') return zh({ k: `m3.u.${t.unit}` })
      return unitOf(p.u) === t.unit ? '对' : '不对'
    }
  }
  // 行 1 千米要多少时间：步行 15 分、骑车 4 分、坐汽车 1 分
  const way = texts(q).find((x) => /^m3\.km\.(walk|bike|car)$/.test(x.k))
  if (way) return { 'm3.km.walk': '15 分', 'm3.km.bike': '4 分', 'm3.km.car': '1 分' }[way.k]!
  return null
}

describe('毫米、分米和千米 / 曹冲称象：答案能从题目反推出来', () => {
  for (const kpId of KPS) {
    it(kpId, () => {
      const gen = getGenerator(kpId)!
      for (let seed = 1; seed <= 150; seed++) {
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          const exp = expected(q)
          expect(exp, `${q.id} 没有反推规则`).not.toBeNull()
          if (typeof exp === 'number') {
            expect(Number.isInteger(exp) && exp >= 0, `${q.id} 反推出来不是非负整数：${exp}`).toBe(true)
            expect(answerNum(q), q.id).toBe(exp)
          } else expect(picked(q), q.id).toBe(exp)
          expect(checkAnswer(q, q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId)).toBe(true)
        }
      }
    })
  }
})

describe('选单位的题', () => {
  it('第 1 档的干扰单位离正确单位至少隔一级，第 2 档是挨着的；「也说得通」的单位不当错的', () => {
    const order: Unit[] = ['mm', 'cm', 'dm', 'm', 'km']
    const gen = getGenerator('m3s1-03-choose-unit')!
    for (let seed = 1; seed <= 150; seed++) {
      for (const d of [1, 2] as const) {
        const q = gen(d, createRng(seed))
        const it = texts(q)[0]!
        const t = LENGTH_THINGS.find((x) => it.k.endsWith(`.${x.id}`))!
        const wrong = q.choices!.map((c) => (c.label as { k: string }).k.replace('m3.u.', '') as Unit).filter((u) => u !== t.unit)
        expect(wrong.length).toBe(d === 1 ? 2 : 3)
        for (const u of wrong) {
          expect(t.alsoOk ?? []).not.toContain(u)
          if (d === 1) expect(Math.abs(order.indexOf(u) - order.indexOf(t.unit))).toBeGreaterThanOrEqual(2)
        }
      }
    }
  })

  it('题干里不出现括号（会被读成「括号」），要填的空是横线且不朗读', () => {
    for (const kpId of KPS) {
      const gen = getGenerator(kpId)!
      for (let seed = 1; seed <= 40; seed++) {
        const q = gen(1, createRng(seed))
        for (const s of q.stem) if (s.kind === 'text') expect(zh(s.text), q.id).not.toMatch(/[()（）]/)
        expect(questionSpeech(q, 'zh').join(''), q.id).not.toMatch(/括号|_/)
      }
    }
  })
})

describe('朗读：「长」「重」不单独成片段', () => {
  it('切出来的片段里没有单独的「长」「重」「行」', () => {
    for (const kpId of KPS) {
      const gen = getGenerator(kpId)!
      for (let seed = 1; seed <= 60; seed++) {
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          for (const piece of questionSpeech(q, 'zh')) expect(['长', '重', '行', '只', '数'], `${q.id}：${piece}`).not.toContain(piece)
        }
      }
    }
  })
})
