import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import {
  ALL_IDS,
  BOOK_IDS,
  DEMO_IDS,
  GEN1_ID,
  ID_NAMES,
  ID_SEGS,
  ISBN,
  ISBN_SEGS,
  KP,
  POSTCODE,
  STUDENT_SEGS,
  checkCode,
  dayOf,
  isMale,
  monthOf,
  yearOf,
} from '../coding'

// 三上「☆ 数字编码」的专项检查：号码只用课本上的或一眼就是编的；答案从号码条上的数字反推；
// 号码条的分段、名字、标出的一段 / 一位都对得上；问「是什么码」时不写名字（不泄露答案）。
const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150

function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(KP)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
function stripsOf(q: Question): Extract<StemPart, { kind: 'code-strip' }>[] {
  return q.stem.filter((p) => p.kind === 'code-strip') as Extract<StemPart, { kind: 'code-strip' }>[]
}
/** 题干里各段文字的词条键 */
const textKeys = (q: Question): string[] => q.stem.filter((p) => p.kind === 'text').map((p) => (p as { text: { k: string } }).text.k)
function correctLabel(q: Question): string {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return zh(q.choices!.find((c) => c.id === id)!.label)
}
const answerNumber = (q: Question): number => Number(correctLabel(q))

/** 真实存在的日期 */
function realDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

describe('用到的号码', () => {
  it('课本上的两个公民身份号码原样照抄，校验码对得上', () => {
    expect(BOOK_IDS).toEqual(['440524188001010014', '11010519491231002X'])
    for (const id of BOOK_IDS) expect(checkCode(id.slice(0, 17))).toBe(id[17])
    expect(isMale(BOOK_IDS[0]!)).toBe(true) // 顺序码 001
    expect(isMale(BOOK_IDS[1]!)).toBe(false) // 课本 p60 的身份证上写着「女」
    expect(GEN1_ID).toBe('110105491231002')
    // 第一代号码 = 第二代去掉「19」和校验码
    expect(BOOK_IDS[1]!.slice(0, 6) + BOOK_IDS[1]!.slice(8, 17)).toBe(GEN1_ID)
    expect(POSTCODE).toBe('448268')
    expect(ISBN).toBe('9787564001452')
    expect(ISBN_SEGS.reduce((s, x) => s + x, 0)).toBe(ISBN.length)
  })

  it('演示用的号码一眼就是编出来的：地址码是同一个数字重复六遍，日期是真的日期，第十七位不是 0，校验码按规则算', () => {
    expect(DEMO_IDS.length).toBeGreaterThanOrEqual(8)
    for (const id of DEMO_IDS) {
      expect(id, id).toMatch(/^(\d)\1{5}\d{11}[\dX]$/)
      expect(realDate(yearOf(id), monthOf(id), dayOf(id)), id).toBe(true)
      expect(id[16], id).not.toBe('0')
      expect(checkCode(id.slice(0, 17)), id).toBe(id[17])
    }
    // 男女都有、单双数都有
    expect(new Set(DEMO_IDS.map(isMale)).size).toBe(2)
  })

  it('题目里出现的公民身份号码都来自这两份清单', () => {
    each((q) => {
      for (const s of stripsOf(q)) {
        if (s.digits.length !== 18) continue
        expect(ALL_IDS, q.id).toContain(s.digits)
      }
    })
  })
})

describe('号码条', () => {
  it('分段加起来是号码的位数，名字和分段一样多，标出的一段 / 一位在范围里', () => {
    each((q) => {
      for (const s of stripsOf(q)) {
        expect(s.digits, q.id).toMatch(/^[\dX]+$/)
        if (s.segs) expect(s.segs.reduce((a, b) => a + b, 0), q.id).toBe(s.digits.length)
        if (s.names) expect(s.names.length, q.id).toBe(s.segs!.length)
        if (s.mark !== undefined) expect(s.mark, q.id).toBeLessThan(s.segs!.length)
        if (s.cell !== undefined) expect(s.cell, q.id).toBeLessThan(s.digits.length)
        if (s.digits.length === 18 && s.segs) expect(s.segs, q.id).toEqual(ID_SEGS)
      }
    })
  })

  it('号码只画在号码条里，题目文字里没有长串数字（会被当成一个大数来读）', () => {
    each((q) => {
      for (const p of q.stem) if (p.kind === 'text') expect(zh(p.text), q.id).not.toMatch(/\d{3,}/)
      for (const lang of ['zh', 'en'] as const) for (const t of questionSpeech(q, lang)) expect(t, q.id).not.toMatch(/\d{5,}/)
    })
  })
})

describe('答案从号码上反推', () => {
  it('各种题的答案都对', () => {
    const seen = new Set<string>()
    each((q, d) => {
      const keys = textKeys(q)
      const k = keys[keys.length - 1]!
      seen.add(k)
      const strip = stripsOf(q)[0]
      const id = strip?.digits ?? ''
      switch (k) {
        case 'm3.code.idLen':
          expect(answerNumber(q)).toBe(18)
          expect(strip!.digits.length).toBe(18)
          break
        case 'm3.code.postLen':
          expect(answerNumber(q)).toBe(strip!.digits.length)
          break
        case 'm3.code.segLen': {
          // 问的是哪一段：看题目参数里的段名
          const seg = (q.stem[0] as unknown as { text: { p: { seg: LStr } } }).text.p.seg
          const i = ID_NAMES.findIndex((n) => zh(n) === zh(seg))
          expect(answerNumber(q), q.id).toBe(ID_SEGS[i])
          expect(strip!.names, `${q.id} 第 1 档标出各段的名字`).toEqual(ID_NAMES)
          break
        }
        case 'm3.code.whichSeg':
          expect(correctLabel(q), q.id).toBe(zh(ID_NAMES[strip!.mark!]!))
          expect(strip!.names, `${q.id} 问是什么码时不能写名字`).toBeUndefined()
          break
        case 'm3.code.year':
          expect(q.input, q.id).toBe('choice')
          expect(correctLabel(q), q.id).toBe(`${Number(id.slice(6, 10))} 年`)
          if (d === 1) expect(strip!.names, q.id).toEqual(ID_NAMES)
          else expect(strip!.names, q.id).toBeUndefined()
          break
        case 'm3.code.month':
          expect(answerNumber(q), q.id).toBe(Number(id.slice(10, 12)))
          expect(strip!.names, q.id).toBeUndefined()
          break
        case 'm3.code.day':
          expect(answerNumber(q), q.id).toBe(Number(id.slice(12, 14)))
          expect(strip!.names, q.id).toBeUndefined()
          break
        case 'm3.code.oddEven':
          expect(strip!.cell).toBe(16)
          expect(correctLabel(q), q.id).toBe(Number(id[16]) % 2 ? '单数' : '双数')
          break
        case 'm3.code.sexBy17':
          expect(strip!.cell).toBe(16)
          expect(correctLabel(q), q.id).toBe(Number(id[16]) % 2 ? '男性' : '女性')
          break
        case 'm3.code.sex':
          // 第 3 档不标第十七位
          expect(strip!.cell, q.id).toBeUndefined()
          expect(correctLabel(q), q.id).toBe(Number(id[16]) % 2 ? '男性' : '女性')
          break
        case 'm3.code.sexDigit':
          expect(answerNumber(q)).toBe(17)
          break
        case 'm3.code.dateStart':
          expect(answerNumber(q)).toBe(ID_SEGS[0]! + 1)
          break
        case 'm3.code.checkPos':
          expect(answerNumber(q)).toBe(18)
          break
        case 'm3.code.twins':
          expect(correctLabel(q)).toBe('不会一样')
          break
        case 'm3.code.change':
          expect(correctLabel(q)).toBe('不会变')
          break
        case 'm3.code.postFirst2':
          expect(correctLabel(q)).toBe('省')
          expect(strip!.digits).toBe(POSTCODE)
          break
        case 'm3.code.gen1Len':
          expect(answerNumber(q)).toBe(strip!.digits.length)
          break
        case 'm3.code.gen1Less': {
          const [a, b] = stripsOf(q)
          expect(answerNumber(q)).toBe(b!.digits.length - a!.digits.length)
          break
        }
        case 'm3.code.stuClass':
        case 'm3.code.stuSex':
        case 'm3.code.stuNo': {
          expect(keys.slice(0, 2)).toEqual(['m3.code.stuIntro', 'm3.code.stuRule'])
          expect(strip!.segs).toEqual(STUDENT_SEGS)
          const [cls, sex, no] = [Number(id.slice(4, 6)), id[6], Number(id.slice(7, 9))]
          expect(cls >= 1 && cls <= 12, q.id).toBe(true)
          expect(['1', '2'], q.id).toContain(sex)
          if (k === 'm3.code.stuClass') expect(answerNumber(q), q.id).toBe(cls)
          if (k === 'm3.code.stuSex') expect(correctLabel(q), q.id).toBe(sex === '1' ? '男生' : '女生')
          if (k === 'm3.code.stuNo') expect(answerNumber(q), q.id).toBe(no)
          break
        }
        case 'm3.code.isbnGroup':
          expect(answerNumber(q)).toBe(Number(id.slice(3, 4)))
          break
        case 'm3.code.isbnPubLen':
          expect(answerNumber(q)).toBe(ISBN_SEGS[2])
          break
        case 'm3.code.isbnCheck':
          expect(answerNumber(q)).toBe(Number(id.slice(-1)))
          break
        default:
          throw new Error(`${q.id} 没检查到的题型 ${k}`)
      }
    })
    // 每种题都出现过
    expect(seen.size).toBe(24)
  })

  it('第 1 档的题够多样，出生年份涉及不同的号码', () => {
    const ids = new Set<string>()
    const years = new Set<number>()
    const keys = new Set<string>()
    each((q, d) => {
      if (d !== 1) return
      ids.add(q.id)
      keys.add(textKeys(q)[0]!)
      if (textKeys(q)[0] === 'm3.code.year') years.add(Number(correctLabel(q).replace(/\D/g, '')))
    })
    expect(ids.size).toBeGreaterThanOrEqual(20)
    expect(years.size).toBeGreaterThanOrEqual(6)
    // 课本 p58 的核心句「第十七位单数为男性、双数为女性」第 1 档就练（题里写着规则）
    expect(keys).toContain('m3.code.sexBy17')
    expect(keys).not.toContain('m3.code.sex')
  })
})
