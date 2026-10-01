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
        expect(len % 10, q.id).not.toBe(0)
        return `${Math.floor(len / 10)} 厘米 ${len % 10} 毫米`
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
      case 'm3.km.stepsBack':
        return (num(p.m) * 100) / 50
      case 'm3.km.minutes':
        return num(p.v) * num(p.t)
      case 'm3.km.stops':
        return num(p.n) * 500
      case 'm3.km.late':
        return (num(p.d) * 1000) / num(p.v) <= num(p.m) ? '能' : '不能'
      case 'm3.km.walkFar':
        return '不对'
      case 'm3.mass.readKg':
      case 'm3.mass.readBody':
      case 'm3.mass.readG': {
        const s = q.stem.find((x) => x.kind === 'scale') as Extract<StemPart, { kind: 'scale' }>
        expect(s.unit).toBe(k === 'm3.mass.readG' ? 'g' : 'kg')
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
      case 'm3.mass.diffAbout': {
        // 大约重多少：相差数离整十只差 1、2，答案是最接近的整十
        const gap = num(p.x) - num(p.y)
        const ten = Math.round(gap / 10) * 10
        expect(Math.abs(gap - ten), q.id).toBeLessThanOrEqual(2)
        expect(gap % 10, q.id).not.toBe(0)
        return `${ten} 克`
      }
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
      case 'm3.mass.pears':
        return 5 * num(p.k)
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

describe('选单位的题（并进了「毫米、分米的认识」「千米的认识」）', () => {
  const SECTIONS: { kp: string; units: Unit[]; opts: Record<1 | 2, Unit[]> }[] = [
    { kp: 'm3s1-03-mm-dm', units: ['mm', 'cm', 'dm'], opts: { 1: ['mm', 'cm', 'dm'], 2: ['mm', 'cm', 'dm', 'm'] } },
    { kp: 'm3s1-03-km', units: ['m', 'km'], opts: { 1: ['cm', 'm', 'km'], 2: ['cm', 'dm', 'm', 'km'] } },
  ]
  it('东西只从这一节的单位里挑，选项是这一节的几个单位（「也说得通」的单位不当错的）；第 1 档出得到', () => {
    for (const { kp, units, opts } of SECTIONS) {
      const gen = getGenerator(kp)!
      let seen = 0
      for (let seed = 1; seed <= 150; seed++) {
        for (const d of [1, 2] as const) {
          const q = gen(d, createRng(seed))
          if (!q.id.includes(':unit-')) continue
          if (d === 1) seen++
          const it = texts(q)[0]!
          const t = LENGTH_THINGS.find((x) => it.k.endsWith(`.${x.id}`))!
          expect(units).toContain(t.unit)
          const all = q.choices!.map((c) => (c.label as { k: string }).k.replace('m3.u.', '') as Unit)
          expect(all.sort()).toEqual(opts[d].filter((u) => u === t.unit || !t.alsoOk?.includes(u)).sort())
        }
      }
      expect(seen, kp).toBeGreaterThan(10)
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

/** 第 1 档 150 个种子出过的题的 sig 前缀（id 冒号后、第一个「-」前） */
function firstTierKinds(kpId: string): Set<string> {
  const gen = getGenerator(kpId)!
  const kinds = new Set<string>()
  for (let seed = 1; seed <= 150; seed++) kinds.add(gen(1, createRng(seed)).id.split(':')[1]!.split('-')[0]!)
  return kinds
}

describe('课本例题与做一做在第 1 档都出得到（G12）', () => {
  it('毫米、分米的认识：量一量（读几厘米几毫米、几毫米）、换算、进率、选单位、锯木料、11 厘米 = 1 分米几厘米', () => {
    expect([...firstTierKinds('m3s1-03-mm-dm')].sort()).toEqual(['conv', 'rate', 'rcm', 'rmm', 'split', 'unit', 'wood'].sort())
  })
  it('千米的认识：换算、进率、几个 100 米是 1 千米、选米 / 千米、跑道', () => {
    expect([...firstTierKinds('m3s1-03-km')].sort()).toEqual(['conv', 'rate', 'per', 'unit', 'track'].sort())
  })
  it('估计距离：一步、每分钟、每站三种标准，行 1 千米要多久，能不能按时到校', () => {
    expect([...firstTierKinds('m3s1-03-choose-unit')].sort()).toEqual(['late', 'mins', 'steps', 'stops', 'time'].sort())
  })
  it('认识质量单位：选单位、读秤、进率、换算', () => {
    expect([...firstTierKinds('m3s1-04-mass-units')].sort()).toEqual(['conv', 'rate', 'scale', 'unit'].sort())
  })
  it('称重我很行：大约重多少、黄豆 / 西红柿 / 梨、粮食、盐袋、曹冲称象求和', () => {
    expect([...firstTierKinds('m3s1-04-weighing')].sort()).toEqual(['about', 'beans', 'cao', 'pears', 'sacks', 'salt', 'tomato'].sort())
  })
  it('第 1 档读尺子都从 0 起、12–68 毫米；有一半上下问「几厘米几毫米」', () => {
    const gen = getGenerator('m3s1-03-mm-dm')!
    let cmMm = 0
    let rulers = 0
    for (let seed = 1; seed <= 600; seed++) {
      const q = gen(1, createRng(seed))
      const r = q.stem.find((s) => s.kind === 'ruler') as Extract<StemPart, { kind: 'ruler' }> | undefined
      if (!r) continue
      rulers++
      expect(r.from).toBe(0)
      expect(r.to).toBeGreaterThanOrEqual(12)
      expect(r.to).toBeLessThanOrEqual(68)
      if (q.id.includes(':rcm-')) cmMm++
    }
    expect(cmMm / rulers).toBeGreaterThan(0.3)
    expect(cmMm / rulers).toBeLessThan(0.6)
  })
  it('估计距离第 1 档只用「几个十 / 几个百」：每分钟走几十米就走 10 分钟', () => {
    const gen = getGenerator('m3s1-03-choose-unit')!
    for (let seed = 1; seed <= 150; seed++) {
      const q = gen(1, createRng(seed))
      const m = texts(q).find((x) => x.k === 'm3.km.minutes')
      if (m) expect(num(m.p.t), q.id).toBe(10)
    }
  })
})

describe('读秤照课本的刻度（D2）', () => {
  it('盘秤 1000 克每 50 克一个刻度、读整 50 克；手提秤 5 千克每千克 10 小格、读整千克；体重秤每小格 1 千克；500 克盘秤每小格 10 克', () => {
    const gen = getGenerator('m3s1-04-mass-units')!
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 300; seed++) {
      for (const d of [1, 2] as const) {
        const q = gen(d, createRng(seed))
        const s = q.stem.find((x) => x.kind === 'scale') as Extract<StemPart, { kind: 'scale' }> | undefined
        if (!s) continue
        const tick = s.major / (s.minor ?? 1)
        kinds.add(`${d}:${s.max}${s.unit}`)
        if (s.max === 1000) expect([s.major, s.minor]).toEqual([50, 1])
        if (s.max === 5) expect([s.major, s.minor]).toEqual([1, 10])
        if (s.max === 100) expect([s.major, s.minor, s.unit]).toEqual([10, 10, 'kg'])
        if (s.max === 500) expect([s.major, s.minor]).toEqual([50, 5])
        // 指针正好指在一个刻度上，手提秤只读整千克
        expect(Math.abs(s.value / tick - Math.round(s.value / tick)), q.id).toBeLessThan(1e-9)
        if (s.max === 5) expect(Number.isInteger(s.value)).toBe(true)
      }
    }
    expect([...kinds].sort()).toEqual(['1:1000g', '1:100kg', '1:5kg', '2:1000g', '2:100kg', '2:500g', '2:5kg'].sort())
  })
})
