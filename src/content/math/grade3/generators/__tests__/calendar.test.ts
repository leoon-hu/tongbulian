import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'
import { addDays, daysIn, isLeap, spanDays, weekdayOf } from '../calendar'

// 三下 ☆「年、月、日的秘密」的专项检查：日期用 JS 的 Date（UTC）独立再算一遍，答案从题目本身（参数、月历、时间表）反推。
const SEEDS = 150
type Cal = Extract<StemPart, { kind: 'calendar' }>
type Table = Extract<StemPart, { kind: 'stat-table' }>

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const zh = (l: LStr): string => translate(l, 'zh')
const keyOf = (l: LStr): string => (typeof l === 'string' ? l : l.k)
type Params = Record<string, unknown>
function textOf(q: Question): { k: string; p: Params } {
  const t = q.stem.find((p) => p.kind === 'text')
  if (!t || t.kind !== 'text' || typeof t.text === 'string') throw new Error(`${q.id} 没有文字`)
  return { k: t.text.k, p: (t.text.p ?? {}) as Params }
}
const correctLabel = (q: Question): LStr => {
  const id = (q.answer as { choiceId: string }).choiceId
  return q.choices!.find((c) => c.id === id)!.label
}
const numAnswer = (q: Question): number => (q.answer.kind === 'number' ? q.answer.value : Number(zh(correctLabel(q))))
/** 词条参数里的月份（m3.cal.mon.N）、日期（m3.cal.date）、星期（m3.cal.wd.N） */
const monthOf = (l: unknown): number => Number(keyOf(l as LStr).split('.').pop())
const dateOf = (l: unknown): { m: number; d: number } => {
  const x = l as { k: string; p: { mon: LStr; d: number } }
  expect(x.k).toBe('m3.cal.date')
  return { m: monthOf(x.p.mon), d: x.p.d }
}
const wdOf = (l: unknown): number => Number(keyOf(l as LStr).split('.').pop())
/** 用 Date（UTC）算：y 年 m 月 d 日是星期几（1 = 星期一 … 7 = 星期日）、一个月几天、两个日期相差几天 */
const utc = (y: number, m: number, d: number): number => Date.UTC(y, m - 1, d)
const dayOfWeek = (y: number, m: number, d: number): number => ((new Date(utc(y, m, d)).getUTCDay() + 6) % 7) + 1
const monthLength = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate()
const DAY = 86400000

describe('日期工具与课本上的真实日历一致', () => {
  it('闰年：4 的倍数一般是闰年，整百年要是 400 的倍数（课本脚注：1900 年不是闰年，2000 年是闰年）', () => {
    expect([2016, 2020, 2024, 2000, 2400].every(isLeap)).toBe(true)
    expect([2015, 2023, 2025, 2026, 1900, 2100, 2200].some(isLeap)).toBe(false)
    for (let y = 1890; y <= 2410; y++) expect(daysIn(y, 2), String(y)).toBe(monthLength(y, 2))
  })

  it('课本 p78 的 2 月月历（2015–2026）：1 日的星期和天数', () => {
    // 课本图上每年 2 月 1 日在哪一栏（一 二 三 四 五 六 日）
    const firstOfFeb: Record<number, number> = { 2015: 7, 2016: 1, 2017: 3, 2018: 4, 2019: 5, 2020: 6, 2021: 1, 2022: 2, 2023: 3, 2024: 4, 2025: 6, 2026: 7 }
    for (const [y, w] of Object.entries(firstOfFeb)) expect(weekdayOf(Number(y), 2, 1), y).toBe(w)
    expect([2016, 2020, 2024].map((y) => daysIn(y, 2))).toEqual([29, 29, 29])
  })

  it('课本 p79 的日期：2026 年 1 月 24 日星期六至 3 月 1 日星期日放寒假（37 天），7 月 8 日星期三至 8 月 31 日星期一放暑假（55 天）；2025 年 1 月 1 日是星期三', () => {
    expect(weekdayOf(2026, 1, 24)).toBe(6)
    expect(weekdayOf(2026, 3, 1)).toBe(7)
    expect(weekdayOf(2026, 7, 8)).toBe(3)
    expect(weekdayOf(2026, 8, 31)).toBe(1)
    expect(weekdayOf(2025, 1, 1)).toBe(3)
    expect(spanDays(2026, 1, 24, 3, 1)).toBe(37)
    expect(spanDays(2026, 7, 8, 8, 31)).toBe(55)
    expect(addDays(2026, 1, 7, 3)).toEqual({ m: 1, d: 10 })
    expect(addDays(2026, 2, 6, 15)).toEqual({ m: 2, d: 21 })
    expect(addDays(2024, 2, 20, 10)).toEqual({ m: 3, d: 1 })
    for (let y = 2015; y <= 2032; y++) for (let m = 1; m <= 12; m++) for (const d of [1, 13, 28]) expect(weekdayOf(y, m, d)).toBe(dayOfWeek(y, m, d))
  })
})

describe('年历中的秘密（m3s2-06-calendar）', () => {
  it('答案都能从题目重新算出来', () => {
    const kinds = new Set<string>()
    each('m3s2-06-calendar', (q) => {
      const { k, p } = textOf(q)
      const cal = q.stem.find((x): x is Cal => x.kind === 'calendar')
      if (cal) {
        // 月历：标题是真实的年、月，天数和 1 日的星期都对
        const t = cal.title as { k: string; p: { y: number; mon: LStr } }
        const y = t.p.y
        const m = monthOf(t.p.mon)
        expect(cal.days, q.id).toBe(monthLength(y, m))
        expect(cal.first, q.id).toBe(dayOfWeek(y, m, 1))
      }
      const calYM = (): { y: number; m: number } => {
        const t = cal!.title as { k: string; p: { y: number; mon: LStr } }
        return { y: t.p.y, m: monthOf(t.p.mon) }
      }
      switch (k) {
        case 'm3.cal.daysOf':
          kinds.add('daysOf')
          expect(monthOf(p.mon), q.id).not.toBe(2) // 2 月要给年份
          expect(numAnswer(q), q.id).toBe(monthLength(2025, monthOf(p.mon)))
          break
        case 'm3.cal.bigOrSmall':
          kinds.add('bigOrSmall')
          expect(monthOf(p.mon)).not.toBe(2)
          expect(keyOf(correctLabel(q)), q.id).toBe(monthLength(2025, monthOf(p.mon)) === 31 ? 'm3.cal.big' : 'm3.cal.small')
          break
        case 'm3.cal.monthsInYear':
        case 'm3.cal.bigCount':
        case 'm3.cal.smallCount':
        case 'm3.cal.bigDays':
        case 'm3.cal.smallDays': {
          kinds.add('facts')
          const lengths = Array.from({ length: 12 }, (_, i) => monthLength(2025, i + 1))
          const expected = { 'm3.cal.monthsInYear': 12, 'm3.cal.bigCount': lengths.filter((x) => x === 31).length, 'm3.cal.smallCount': lengths.filter((x) => x === 30).length, 'm3.cal.bigDays': 31, 'm3.cal.smallDays': 30 }[k]
          expect(numAnswer(q), q.id).toBe(expected)
          break
        }
        case 'm3.cal.thisDays':
          kinds.add('thisDays')
          expect(numAnswer(q), q.id).toBe(cal!.days)
          break
        case 'm3.cal.thisKind':
          kinds.add('thisKind')
          expect(cal!.days).not.toBe(28)
          expect(keyOf(correctLabel(q)), q.id).toBe(cal!.days === 31 ? 'm3.cal.big' : 'm3.cal.small')
          break
        case 'm3.cal.thisYear':
          kinds.add('thisYear')
          expect(calYM().m).toBe(2)
          expect(keyOf(correctLabel(q)), q.id).toBe(cal!.days === 29 ? 'm3.cal.leap' : 'm3.cal.common')
          break
        case 'm3.cal.yearDays':
        case 'm3.cal.febDays': {
          kinds.add('yearDays')
          const leap = keyOf(p.kind as LStr) === 'm3.cal.leap'
          expect(numAnswer(q), q.id).toBe(k === 'm3.cal.febDays' ? (leap ? 29 : 28) : leap ? 366 : 365)
          break
        }
        case 'm3.cal.yearsToMonths':
          kinds.add('convert')
          expect(numAnswer(q), q.id).toBe(12 * (p.n as number))
          break
        case 'm3.cal.monthsToYears':
          kinds.add('convert')
          expect(numAnswer(q), q.id).toBe((p.n as number) / 12)
          break
        case 'm3.cal.markedDay': {
          kinds.add('marked')
          const { y, m } = calYM()
          expect(cal!.mark).toHaveLength(1)
          expect(wdOf(correctLabel(q)), q.id).toBe(dayOfWeek(y, m, cal!.mark![0]!))
          break
        }
        case 'm3.cal.countWd': {
          kinds.add('countWd')
          const { y, m } = calYM()
          const w = wdOf(p.wd)
          expect(numAnswer(q), q.id).toBe(Array.from({ length: cal!.days }, (_, i) => dayOfWeek(y, m, i + 1)).filter((x) => x === w).length)
          break
        }
        case 'm3.cal.wdCalc': {
          kinds.add('wdCalc')
          const day = p.d as number
          expect(day, q.id).toBeLessThanOrEqual(28) // 哪个月都有这一天
          expect(wdOf(correctLabel(q)), q.id).toBe(((wdOf(p.wd) - 1 + day - 1) % 7) + 1)
          break
        }
        case 'm3.cal.leapRule': {
          kinds.add('leapRule')
          const y = p.y as number
          expect(keyOf(correctLabel(q)), q.id).toBe(monthLength(y, 2) === 29 ? 'm3.cal.leap' : 'm3.cal.common')
          break
        }
        case 'm3.cal.every4': {
          kinds.add('every4')
          const [y0, y] = [p.y0 as number, p.y as number]
          // 给出的是闰年；问的是课本年历附近的年份（不碰整百年，「每 4 年一个」就够判断）
          expect(monthLength(y0, 2), q.id).toBe(29)
          expect(y).not.toBe(y0)
          expect(y % 100, q.id).not.toBe(0)
          expect(keyOf(correctLabel(q)), q.id).toBe((y - y0) % 4 === 0 ? 'm3.cal.leap' : 'm3.cal.common')
          expect(keyOf(correctLabel(q)), q.id).toBe(monthLength(y, 2) === 29 ? 'm3.cal.leap' : 'm3.cal.common')
          break
        }
        case 'm3.cal.twoMonths':
          kinds.add('twoMonths')
          expect([monthOf(p.m1), monthOf(p.m2)]).not.toContain(2)
          expect(numAnswer(q), q.id).toBe(monthLength(2025, monthOf(p.m1)) + monthLength(2025, monthOf(p.m2)))
          break
        case 'm3.cal.span':
        case 'm3.cal.spanYear': {
          kinds.add(k === 'm3.cal.span' ? 'span' : 'spanYear')
          const a = dateOf(p.a)
          const b = dateOf(p.b)
          // 碰到 2 月一定说了这一年是平年还是闰年
          const touchesFeb = a.m <= 2 && b.m >= 2
          expect(k === 'm3.cal.spanYear', q.id).toBe(touchesFeb)
          const y = k === 'm3.cal.spanYear' && keyOf(p.kind as LStr) === 'm3.cal.leap' ? 2024 : 2026
          expect(b.d, q.id).toBeLessThanOrEqual(monthLength(y, b.m))
          expect(numAnswer(q), q.id).toBe((utc(y, b.m, b.d) - utc(y, a.m, a.d)) / DAY + 1)
          break
        }
        case 'm3.cal.after':
        case 'm3.cal.afterYear': {
          kinds.add(k === 'm3.cal.after' ? 'after' : 'afterYear')
          const a = dateOf(p.a)
          const y = k === 'm3.cal.afterYear' && keyOf(p.kind as LStr) === 'm3.cal.leap' ? 2024 : 2026
          const r = new Date(utc(y, a.m, a.d) + (p.n as number) * DAY)
          const got = dateOf(correctLabel(q))
          expect(got, q.id).toEqual({ m: r.getUTCMonth() + 1, d: r.getUTCDate() })
          expect(r.getUTCFullYear()).toBe(y)
          // 跨过 2 月底（或从 1 月跨进 2 月）一定说了平年闰年；2 月里不跨月的只出到 28 日以内，不用说
          expect(k === 'm3.cal.afterYear', q.id).toBe(a.m <= 2 && got.m >= 2 && !(a.m === 2 && got.m === 2))
          if (a.m === 2 && got.m === 2) for (const c of q.choices!) expect(dateOf(c.label).d, q.id).toBeLessThanOrEqual(28)
          // 干扰项都是真实存在的别的日期
          for (const c of q.choices!) {
            const x = dateOf(c.label)
            expect(x.d).toBeLessThanOrEqual(monthLength(y, x.m))
          }
          break
        }
        default:
          throw new Error(`没有检查到的题：${q.id} ${k}`)
      }
    })
    expect([...kinds].sort()).toEqual(['after', 'afterYear', 'bigOrSmall', 'convert', 'countWd', 'daysOf', 'every4', 'facts', 'leapRule', 'marked', 'span', 'spanYear', 'thisDays', 'thisKind', 'thisYear', 'twoMonths', 'wdCalc', 'yearDays'])
  })

  it('第 1 档：年历中的秘密这一节的全部（大月小月、某月几天、看月历、平年闰年、同月的再过几天与经过几天）；整百年只在第 3 档', () => {
    const seen = new Set<string>()
    each('m3s2-06-calendar', (q, d) => {
      const { k, p } = textOf(q)
      if (k === 'm3.cal.leapRule' && d < 3) expect((p.y as number) % 100, q.id).not.toBe(0)
      if (d !== 1) return
      seen.add(k)
      expect(
        ['m3.cal.daysOf', 'm3.cal.bigOrSmall', 'm3.cal.monthsInYear', 'm3.cal.bigCount', 'm3.cal.smallCount', 'm3.cal.bigDays', 'm3.cal.smallDays', 'm3.cal.thisDays', 'm3.cal.thisKind', 'm3.cal.thisYear', 'm3.cal.febDays', 'm3.cal.every4', 'm3.cal.after', 'm3.cal.span'],
        q.id,
      ).toContain(k)
      if (k === 'm3.cal.after' || k === 'm3.cal.span') {
        const a = dateOf(p.a)
        const b = k === 'm3.cal.after' ? dateOf(correctLabel(q)) : dateOf(p.b)
        expect(b.m, `${q.id} 第 1 档不跨月`).toBe(a.m)
      }
    })
    // 课本的红字（看 2 月月历判断、2 月几天）、每 4 年一个闰年、用一用 1 都出得到
    for (const k of ['m3.cal.thisYear', 'm3.cal.febDays', 'm3.cal.every4', 'm3.cal.after', 'm3.cal.span']) expect(seen, k).toContain(k)
  })

  it('第 2 档出得到课本用一用 3 的原题：寒假 37 天、暑假 55 天', () => {
    const got = new Set<number>()
    each('m3s2-06-calendar', (q, d) => {
      if (d !== 2) return
      const { k, p } = textOf(q)
      if (k !== 'm3.cal.span' && k !== 'm3.cal.spanYear') return
      const a = dateOf(p.a)
      const b = dateOf(p.b)
      if ((a.m === 1 && a.d === 24 && b.m === 3 && b.d === 1) || (a.m === 7 && a.d === 8 && b.m === 8 && b.d === 31)) got.add(numAnswer(q))
    })
    expect([...got].sort()).toEqual([37, 55])
  })

  it('星期的选项：四个不同的星期，只有一个对', () => {
    each('m3s2-06-calendar', (q) => {
      if (!q.choices || !keyOf(q.choices[0]!.label).startsWith('m3.cal.wd.')) return
      expect(q.choices, q.id).toHaveLength(4)
      expect(new Set(q.choices.map((c) => labelKey(c.label))).size).toBe(4)
    })
  })
})

describe('作息时间表中的秘密（m3s2-06-24h）', () => {
  const PART: Record<string, 'am' | 'pm' | 'eve'> = { 'm3.cal.am': 'am', 'm3.cal.pm': 'pm', 'm3.cal.eve': 'eve' }
  const to24 = (part: string, h: number): number => (PART[part] === 'am' ? h : h + 12)
  /** 表里的时刻「14:30—16:00」→ 分钟 */
  const minutes = (s: string): number => {
    const [h, m] = s.split(':').map(Number)
    return h! * 60 + m!
  }
  const span = (s: string): [number, number] => s.split('—').map(minutes) as [number, number]
  /** 几小时几分钟的选项 → 分钟 */
  const durOf = (l: LStr): number => {
    const x = l as { k: string; p: { h?: number; m?: number } }
    return (x.p.h ?? 0) * 60 + (x.p.m ?? 0)
  }

  it('答案都能从题目重新算出来', () => {
    const kinds = new Set<string>()
    each('m3s2-06-24h', (q) => {
      const { k, p } = textOf(q)
      const clock = q.stem.find((x) => x.kind === 'clock') as Extract<StemPart, { kind: 'clock' }> | undefined
      const table = q.stem.find((x): x is Table => x.kind === 'stat-table')
      switch (k) {
        case 'm3.cal.to24': {
          kinds.add('to24')
          const part = keyOf(p.part as LStr)
          expect(numAnswer(q), q.id).toBe(to24(part, p.h as number))
          // 上午 6–11 时、下午 1–6 时、晚上 7–11 时
          expect(p.h as number).toBeLessThanOrEqual(11)
          break
        }
        case 'm3.cal.from24': {
          kinds.add('from24')
          const H = p.H as number
          expect(H).toBeGreaterThanOrEqual(13)
          expect(keyOf(p.part as LStr), q.id).toBe(H <= 18 ? 'm3.cal.pm' : 'm3.cal.eve')
          expect(numAnswer(q), q.id).toBe(H - 12)
          break
        }
        case 'm3.cal.clockTo24':
          kinds.add('clock')
          expect(clock!.minute).toBe(0)
          expect(numAnswer(q), q.id).toBe(to24(keyOf(p.part as LStr), clock!.hour))
          break
        case 'm3.cal.to24hm':
        case 'm3.cal.clockTo24hm': {
          kinds.add('toHm')
          const h = k === 'm3.cal.to24hm' ? (p.h as number) : clock!.hour
          const m = k === 'm3.cal.to24hm' ? (p.m as number) : clock!.minute
          if (k === 'm3.cal.to24hm') expect(p.hm).toBe(`${h}:${String(m).padStart(2, '0')}`)
          expect(correctLabel(q), q.id).toBe(`${to24(keyOf(p.part as LStr), h)}:${String(m).padStart(2, '0')}`)
          for (const c of q.choices!) expect(c.label as string).toMatch(/^\d{1,2}:\d\d$/)
          break
        }
        case 'm3.cal.from24hm': {
          kinds.add('fromHm')
          const x = correctLabel(q) as { k: string; p: { h: number; m: number; mm: string } }
          expect(x.p.h, q.id).toBe((p.H as number) - 12)
          expect(x.p.m).toBe(p.m)
          expect(p.HM).toBe(`${p.H}:${String(p.m).padStart(2, '0')}`)
          break
        }
        case 'm3.cal.dayHours':
        case 'm3.cal.dayLaps':
        case 'm3.cal.toNoon':
        case 'm3.cal.toMidnight':
        case 'm3.cal.midnight':
          kinds.add('facts')
          expect(numAnswer(q), q.id).toBe({ 'm3.cal.dayHours': 24, 'm3.cal.dayLaps': 2, 'm3.cal.toNoon': 12, 'm3.cal.toMidnight': 12, 'm3.cal.midnight': 0 }[k])
          break
        case 'm3.cal.elapsed':
          kinds.add('elapsed')
          expect(numAnswer(q), q.id).toBe((p.b as number) - (p.a as number))
          break
        case 'm3.cal.elapsedParts':
          kinds.add('elapsed')
          expect(numAnswer(q), q.id).toBe(to24(keyOf(p.p2 as LStr), p.b as number) - to24(keyOf(p.p1 as LStr), p.a as number))
          break
        case 'm3.cal.actMin':
        case 'm3.cal.actHm':
        case 'm3.cal.actStart': {
          kinds.add(k)
          const row = table!.rows.find((r) => typeof r[1] === 'object' && r[1] !== null && keyOf(r[1] as LStr) === keyOf(p.act as LStr))!
          const [s, e] = span(row[0] as string)
          if (k === 'm3.cal.actMin') expect(numAnswer(q), q.id).toBe(e - s)
          else if (k === 'm3.cal.actHm') expect(durOf(correctLabel(q)), q.id).toBe(e - s)
          else {
            expect(s % 60).toBe(0)
            expect(numAnswer(q), q.id).toBe(s / 60 - 12)
          }
          break
        }
        case 'm3.cal.shopTotal':
        case 'm3.cal.shopTotalHm':
        case 'm3.cal.schoolTotal': {
          kinds.add(k)
          const total = table!.rows.reduce((sum, r) => {
            const [s, e] = span(r[1] as string)
            return sum + e - s
          }, 0)
          if (k === 'm3.cal.shopTotal') expect(numAnswer(q) * 60, q.id).toBe(total)
          else expect(durOf(correctLabel(q)), q.id).toBe(total)
          break
        }
        case 'm3.cal.shopClose': {
          kinds.add(k)
          const [, e] = span(table!.rows[1]![1] as string)
          expect(numAnswer(q), q.id).toBe(e / 60 - 12)
          break
        }
        case 'm3.cal.shopSupperFrom': {
          kinds.add(k)
          const [s] = span(table!.rows[1]![1] as string)
          const x = correctLabel(q) as { k: string; p: { h: number; m: number } }
          expect(x.p.h * 60 + x.p.m + 12 * 60, q.id).toBe(s)
          break
        }
        case 'm3.cal.planRead':
        case 'm3.cal.planReadH': {
          kinds.add('planRead')
          // 问的时刻在表里，是下午 / 晚上的
          const cells = table!.rows.slice(1).flatMap((r) => (r[0] as string).split('—'))
          expect(cells, q.id).toContain(p.HM)
          const t = minutes(p.HM as string)
          expect(t, q.id).toBeGreaterThanOrEqual(13 * 60)
          expect(keyOf(p.part as LStr), q.id).toBe(t < 19 * 60 ? 'm3.cal.pm' : 'm3.cal.eve')
          if (k === 'm3.cal.planReadH') {
            expect(t % 60).toBe(0)
            expect(numAnswer(q), q.id).toBe(t / 60 - 12)
          } else {
            const x = correctLabel(q) as { k: string; p: { h: number; m: number } }
            expect(x.p.h * 60 + x.p.m + 12 * 60, q.id).toBe(t)
          }
          break
        }
        default:
          throw new Error(`没有检查到的题：${q.id} ${k}`)
      }
      // 选项里不出小数（三年级还没学）
      for (const c of q.choices ?? []) expect(zh(c.label), q.id).not.toMatch(/\d\.\d/)
    })
    expect([...kinds].sort()).toEqual(
      [
        'clock',
        'elapsed',
        'facts',
        'from24',
        'fromHm',
        'm3.cal.actHm',
        'm3.cal.actMin',
        'm3.cal.actStart',
        'm3.cal.schoolTotal',
        'm3.cal.shopClose',
        'm3.cal.shopSupperFrom',
        'm3.cal.shopTotal',
        'm3.cal.shopTotalHm',
        'planRead',
        'to24',
        'toHm',
      ].sort(),
    )
  })

  it('第 1 档：找一找四问、整十分 / 半时的几时几分、上午的钟面、读作息表，饭店题照课本原数（下午 4 时 30 分、晚上 9 时、8 小时）', () => {
    const seen = new Set<string>()
    const book = new Map<string, number | string>()
    each('m3s2-06-24h', (q, d) => {
      if (d !== 1) return
      const { k, p } = textOf(q)
      seen.add(k)
      const clock = q.stem.find((x) => x.kind === 'clock') as Extract<StemPart, { kind: 'clock' }> | undefined
      if (clock) {
        expect(clock.minute % 10, q.id).toBe(0)
        if (keyOf(p.part as LStr) === 'm3.cal.am') seen.add('amClock')
        if (clock.minute) seen.add('clockHm')
      }
      if (k === 'm3.cal.to24hm') expect((p.m as number) % 10, q.id).toBe(0)
      // 作息表算时长在第 2 档
      expect(['m3.cal.actMin', 'm3.cal.actHm', 'm3.cal.actStart', 'm3.cal.elapsed', 'm3.cal.elapsedParts', 'm3.cal.shopTotalHm', 'm3.cal.schoolTotal'], q.id).not.toContain(k)
      if (k.startsWith('m3.cal.shop')) {
        const table = q.stem.find((x): x is Table => x.kind === 'stat-table')!
        expect(table.rows.map((r) => r[1]), q.id).toEqual(['11:00—14:30', '16:30—21:00'])
        book.set(k, k === 'm3.cal.shopSupperFrom' ? zh(correctLabel(q)) : numAnswer(q))
      }
    })
    for (const k of ['m3.cal.dayHours', 'm3.cal.dayLaps', 'm3.cal.toNoon', 'm3.cal.toMidnight', 'm3.cal.planRead', 'amClock', 'clockHm', 'm3.cal.to24hm']) expect(seen, k).toContain(k)
    expect(Object.fromEntries(book)).toEqual({ 'm3.cal.shopSupperFrom': '4 时 30 分', 'm3.cal.shopClose': 9, 'm3.cal.shopTotal': 8 })
  })

  it('经过时间的选项互不相同、都在 10 分钟以上', () => {
    each('m3s2-06-24h', (q) => {
      const { k } = textOf(q)
      if (!['m3.cal.actHm', 'm3.cal.shopTotalHm', 'm3.cal.schoolTotal'].includes(k)) return
      const mins = q.choices!.map((c) => {
        const x = c.label as { p: { h?: number; m?: number } }
        return (x.p.h ?? 0) * 60 + (x.p.m ?? 0)
      })
      expect(new Set(mins).size, q.id).toBe(mins.length)
      for (const m of mins) expect(m).toBeGreaterThanOrEqual(10)
    })
  })
})

describe('年、月、日的秘密：文字与朗读', () => {
  it('日期不写斜线（会当成分数）、句子里没有括号；英文问号前不是标点', () => {
    for (const kp of ['m3s2-06-calendar', 'm3s2-06-24h']) {
      each(kp, (q) => {
        for (const part of q.stem) {
          if (part.kind !== 'text') continue
          expect(translate(part.text, 'zh'), q.id).not.toMatch(/[/()（）]/)
          expect(translate(part.text, 'en'), q.id).not.toMatch(/[/()]|[^\w\s]\?/)
        }
        for (const c of q.choices ?? []) expect(translate(c.label, 'zh'), q.id).not.toMatch(/\//)
      })
    }
  })
})
