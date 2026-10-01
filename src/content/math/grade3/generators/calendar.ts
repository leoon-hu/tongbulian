import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 年、月、日的秘密（三下 ☆ 综合与实践）：年历中的秘密（大月小月、平年闰年、看月历、经过的天数）、
// 作息时间表中的秘密（24 时计时法、经过的时间）。
// 星期、闰年一律按真实日历用代码算，不手写（2025 年 1 月 1 日是星期三、2026 年 2 月 1 日是星期日……测试里核对）。
// 日期写「3 月 5 日」（斜线会被当成分数）；2 月的天数一定给出年份、月历或「这一年是平年 / 闰年」。
// 闰年照课本 p78 脚注：公历年份是 4 的倍数的一般是闰年，是 100 的倍数时必须是 400 的倍数才是闰年。
// 「平年 365 天、闰年 366 天」「3 年 = 36 个月」在「七 复习与关联」的知识结构图和练习十八里，并进这里。
// ─────────────────────────────────────────────────────────────

type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const text = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })

/** 公历闰年 */
export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}
/** 大月（31 天）：1、3、5、7、8、10、12 月 */
export const BIG_MONTHS = [1, 3, 5, 7, 8, 10, 12]
export function daysIn(y: number, m: number): number {
  if (m === 2) return isLeap(y) ? 29 : 28
  return BIG_MONTHS.includes(m) ? 31 : 30
}
/** 星期几：1 = 星期一 … 7 = 星期日（按 UTC 算，不受时区影响） */
export function weekdayOf(y: number, m: number, d: number): number {
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return w === 0 ? 7 : w
}
/** 从 m 月 d 日起再过 n 天（同一年里；过了 12 月返回 m = 13） */
export function addDays(y: number, m: number, d: number, n: number): { m: number; d: number } {
  let mm = m
  let dd = d + n
  while (mm <= 12 && dd > daysIn(y, mm)) {
    dd -= daysIn(y, mm)
    mm += 1
  }
  return { m: mm, d: dd }
}
/** 从 m1 月 d1 日到 m2 月 d2 日，头尾两天都算，一共几天（同一年里） */
export function spanDays(y: number, m1: number, d1: number, m2: number, d2: number): number {
  let n = 0
  for (let m = m1; m < m2; m++) n += daysIn(y, m)
  return n + d2 - d1 + 1
}

const NON_FEB = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const mon = (m: number): LStr => L(`m3.cal.mon.${m}`)
const wd = (w: number): LStr => L(`m3.cal.wd.${w}`)
const date = (m: number, d: number): LStr => L('m3.cal.date', { mon: mon(m), d })
/** 星期 w 往后（或往前）k 天是星期几（1–7） */
const shiftWd = (w: number, k: number): number => ((((w - 1 + k) % 7) + 7) % 7) + 1
/** 平年 / 闰年只影响 2 月：出题用一个真实的年份代表（2026 是平年，2024 是闰年） */
const KIND_YEAR = { common: 2026, leap: 2024 } as const
type YearKind = keyof typeof KIND_YEAR

/** 月历（真实的年份、月份）：星期一在最前，1 日前面空几格由真实星期决定 */
export function calendarPart(y: number, m: number, mark?: number[]): StemPart {
  return { kind: 'calendar', title: L('m3.cal.ym', { y, mon: mon(m) }), days: daysIn(y, m), first: weekdayOf(y, m, 1), ...(mark ? { mark } : {}) }
}
/** 课本 p78 的年历是 2015–2026 年，这里放宽到 2015–2032 年 */
const calYear = (rng: RNG): number => rng.int(2015, 2032)
/** 占 6 个星期的月历配数字键盘，iPad 横屏放不下一屏：这时出选择题 */
const tallMonth = (y: number, m: number): boolean => weekdayOf(y, m, 1) - 1 + daysIn(y, m) > 35

const KC = 'm3s2-06-calendar'

/** 某月有几天（2 月除外：2 月要给年份） */
function calDaysOf(d: Difficulty, rng: RNG): Question {
  const m = rng.pick(NON_FEB)
  const v = daysIn(2025, m)
  return numberQuestion({ kpId: KC, type: 'time', difficulty: d, sig: `days-${m}`, stem: [text('m3.cal.daysOf', { mon: mon(m) })], value: v, rng, min: 0, max: 99, smart: [v === 31 ? 30 : 31, 28, 29] })
}
/** 大月还是小月（2 月除外） */
function calBigSmall(d: Difficulty, rng: RNG): Question {
  const m = rng.pick(NON_FEB)
  const big = BIG_MONTHS.includes(m)
  return labelQuestion({
    kpId: KC,
    type: 'time',
    difficulty: d,
    sig: `bigsmall-${m}`,
    stem: [text('m3.cal.bigOrSmall', { mon: mon(m) })],
    correct: L(big ? 'm3.cal.big' : 'm3.cal.small'),
    distractors: [L(big ? 'm3.cal.small' : 'm3.cal.big')],
    rng,
  })
}
/** 一年有 12 个月、7 个大月、4 个小月；大月 31 天、小月 30 天 */
const YEAR_FACTS: { key: string; value: number; smart: number[] }[] = [
  { key: 'm3.cal.monthsInYear', value: 12, smart: [10, 7, 24] },
  { key: 'm3.cal.bigCount', value: 7, smart: [4, 6, 5] },
  { key: 'm3.cal.smallCount', value: 4, smart: [7, 5, 3] },
  { key: 'm3.cal.bigDays', value: 31, smart: [30, 29, 28] },
  { key: 'm3.cal.smallDays', value: 30, smart: [31, 29, 28] },
]
function calFacts(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(YEAR_FACTS)
  return numberQuestion({ kpId: KC, type: 'time', difficulty: d, sig: `fact-${f.key}`, stem: [text(f.key)], value: f.value, rng, min: 0, max: 99, smart: f.smart })
}
/** 看一个月的月历：这个月有几天、是大月还是小月 */
function calThisMonth(d: Difficulty, rng: RNG): Question {
  const y = calYear(rng)
  const m = rng.int(1, 12)
  const days = daysIn(y, m)
  if (m === 2 || rng.chance(0.5)) {
    return numberQuestion({
      kpId: KC,
      type: 'time',
      difficulty: d,
      sig: `thisdays-${y}-${m}`,
      stem: [text('m3.cal.thisDays'), calendarPart(y, m)],
      value: days,
      rng,
      min: 0,
      max: 99,
      smart: [28, 29, 30, 31],
      ...(tallMonth(y, m) ? { input: 'choice' as const } : {}),
    })
  }
  const big = days === 31
  return labelQuestion({
    kpId: KC,
    type: 'time',
    difficulty: d,
    sig: `thiskind-${y}-${m}`,
    stem: [text('m3.cal.thisKind'), calendarPart(y, m)],
    correct: L(big ? 'm3.cal.big' : 'm3.cal.small'),
    distractors: [L(big ? 'm3.cal.small' : 'm3.cal.big')],
    rng,
  })
}
/** 看 2 月的月历：这一年是平年还是闰年（2 月 29 天是闰年） */
function calThisYear(d: Difficulty, rng: RNG): Question {
  const y = calYear(rng)
  const leap = isLeap(y)
  return labelQuestion({
    kpId: KC,
    type: 'time',
    difficulty: d,
    sig: `thisyear-${y}`,
    stem: [text('m3.cal.thisYear'), calendarPart(y, 2)],
    correct: L(leap ? 'm3.cal.leap' : 'm3.cal.common'),
    distractors: [L(leap ? 'm3.cal.common' : 'm3.cal.leap')],
    rng,
  })
}
/** 平年 365 天、闰年 366 天；平年 2 月 28 天、闰年 29 天（febOnly = 只问 2 月几天：p78 红字「2 月有 29 天的年份是闰年，有 28 天的是平年」） */
function calYearDays(d: Difficulty, rng: RNG, febOnly = false): Question {
  const kind: YearKind = rng.pick(['common', 'leap'])
  const feb = febOnly || rng.chance(0.5)
  const v = feb ? (kind === 'leap' ? 29 : 28) : kind === 'leap' ? 366 : 365
  return numberQuestion({
    kpId: KC,
    type: 'time',
    difficulty: d,
    sig: `${feb ? 'feb' : 'year'}-${kind}`,
    stem: [text(feb ? 'm3.cal.febDays' : 'm3.cal.yearDays', { kind: L(`m3.cal.${kind}`) })],
    value: v,
    rng,
    min: 0,
    max: 999,
    smart: feb ? [28, 29, 30, 31] : [365, 366, 360, 364],
  })
}
/** 年和月的换算（练习十八 5：3 年 = 36 个月，24 个月 = 2 年） */
function calConvert(d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 5)
  if (rng.chance(0.5)) {
    return numberQuestion({ kpId: KC, type: 'time', difficulty: d, sig: `y2m-${n}`, stem: [text('m3.cal.yearsToMonths', { n })], value: 12 * n, rng, min: 0, max: 99, smart: [10 * n, 12 * n + 12, 12 * n - 12, 30 * n] })
  }
  return numberQuestion({ kpId: KC, type: 'time', difficulty: d, sig: `m2y-${n}`, stem: [text('m3.cal.monthsToYears', { n: 12 * n })], value: n, rng, min: 0, max: 99, smart: [n + 1, n - 1, 12] })
}
/** 四个星期名的选项：正确的 + 前一天、后一天、再后一天 */
function weekdayChoices(w: number): LStr[] {
  return [shiftWd(w, -1), shiftWd(w, 1), shiftWd(w, 2)].map(wd)
}
/** 月历上圈出一天：是星期几 */
function calMarked(d: Difficulty, rng: RNG): Question {
  const y = calYear(rng)
  const m = rng.int(1, 12)
  const day = rng.int(1, daysIn(y, m))
  const w = weekdayOf(y, m, day)
  return labelQuestion({ kpId: KC, type: 'time', difficulty: d, sig: `marked-${y}-${m}-${day}`, stem: [text('m3.cal.markedDay'), calendarPart(y, m, [day])], correct: wd(w), distractors: weekdayChoices(w), rng })
}
/** 看月历：这个月有几个星期六（4 或 5 个） */
function calCountWd(d: Difficulty, rng: RNG): Question {
  const y = calYear(rng)
  const m = rng.int(1, 12)
  const w = rng.int(1, 7)
  let v = 0
  for (let day = 1; day <= daysIn(y, m); day++) if (weekdayOf(y, m, day) === w) v += 1
  return numberQuestion({
    kpId: KC,
    type: 'time',
    difficulty: d,
    sig: `countwd-${y}-${m}-${w}`,
    stem: [text('m3.cal.countWd', { wd: wd(w) }), calendarPart(y, m)],
    value: v,
    rng,
    min: 0,
    max: 9,
    smart: [4, 5, 6, 3],
    ...(tallMonth(y, m) ? { input: 'choice' as const } : {}),
  })
}
/** 不看月历推星期：这个月的 1 日是星期三，15 日是星期几（same = 只问 8、15、22 日，隔整星期）；只问 28 日以内（哪个月都有） */
function calWdCalc(d: Difficulty, rng: RNG, same: boolean): Question {
  const w1 = rng.int(1, 7)
  const day = same ? rng.pick([8, 15, 22]) : rng.pick(Array.from({ length: 27 }, (_, i) => i + 2).filter((x) => (x - 1) % 7 !== 0))
  const w = shiftWd(w1, day - 1)
  return labelQuestion({ kpId: KC, type: 'time', difficulty: d, sig: `wdcalc-${w1}-${day}`, stem: [text('m3.cal.wdCalc', { wd: wd(w1), d: day })], correct: wd(w), distractors: weekdayChoices(w), rng })
}
/** 「每 4 年有一个闰年」（p78 找一找）：给出一个闰年，判断课本年历上的别的年份（2015–2032，不碰整百年） */
const LEAP_SEEDS = [2016, 2020, 2024]
function calEvery4(d: Difficulty, rng: RNG): Question {
  const y0 = rng.pick(LEAP_SEEDS)
  let y = calYear(rng)
  while (y === y0) y = calYear(rng)
  const leap = isLeap(y)
  return labelQuestion({
    kpId: KC,
    type: 'time',
    difficulty: d,
    sig: `every4-${y0}-${y}`,
    stem: [text('m3.cal.every4', { y0, y })],
    correct: L(leap ? 'm3.cal.leap' : 'm3.cal.common'),
    distractors: [L(leap ? 'm3.cal.common' : 'm3.cal.leap')],
    rng,
  })
}
/** 用脚注的规则判断：2028、2100、2000 年是平年还是闰年（centuries = 也出整百年，第 3 档） */
const CENTURIES = [1900, 2000, 2100, 2400]
function calLeapRule(d: Difficulty, rng: RNG, centuries = true): Question {
  const y = centuries ? (rng.chance(0.35) ? rng.pick(CENTURIES) : rng.int(1996, 2036)) : rng.int(2001, 2036)
  const leap = isLeap(y)
  return labelQuestion({
    kpId: KC,
    type: 'time',
    difficulty: d,
    sig: `rule-${y}`,
    stem: [text('m3.cal.leapRule', { y })],
    correct: L(leap ? 'm3.cal.leap' : 'm3.cal.common'),
    distractors: [L(leap ? 'm3.cal.common' : 'm3.cal.leap')],
    rng,
  })
}
/** 相邻两个月一共几天（7 月和 8 月 62 天；不含 2 月） */
function calTwoMonths(d: Difficulty, rng: RNG): Question {
  const m1 = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  const m2 = m1 === 12 ? 1 : m1 + 1
  const v = daysIn(2025, m1) + daysIn(2025, m2)
  return numberQuestion({ kpId: KC, type: 'time', difficulty: d, sig: `two-${m1}`, stem: [text('m3.cal.twoMonths', { m1: mon(m1), m2: mon(m2) })], value: v, rng, min: 0, max: 99, smart: [60, 61, 62, v + 1, v - 1] })
}
/** 头尾两天都算的经过天数（寒暑假）：same = 同一个月（不出 2 月）；否则跨 1 到 cross 个月；碰到 2 月要说这一年是平年还是闰年 */
function calSpan(d: Difficulty, rng: RNG, same: boolean, cross = 2): Question {
  const kind: YearKind = rng.pick(['common', 'leap'])
  const y = KIND_YEAR[kind]
  let m1: number
  let d1: number
  let m2: number
  let d2: number
  if (same) {
    m1 = m2 = rng.pick(NON_FEB)
    d1 = rng.int(1, daysIn(y, m1) - 5)
    d2 = rng.int(d1 + 3, daysIn(y, m1))
  } else {
    m1 = rng.int(1, 10)
    m2 = m1 + rng.int(1, cross)
    d1 = rng.int(Math.min(10, daysIn(y, m1)), daysIn(y, m1))
    d2 = rng.int(1, daysIn(y, m2))
  }
  const v = spanDays(y, m1, d1, m2, d2)
  const withFeb = m1 <= 2 && m2 >= 2
  const p = { a: date(m1, d1), b: date(m2, d2) }
  return numberQuestion({
    kpId: KC,
    type: 'time',
    difficulty: d,
    sig: `span-${withFeb ? kind : 'x'}-${m1}.${d1}-${m2}.${d2}`,
    stem: [withFeb ? text('m3.cal.spanYear', { kind: L(`m3.cal.${kind}`), ...p }) : text('m3.cal.span', p)],
    value: v,
    rng,
    min: 0,
    max: 999,
    // 头尾只算了一头（少 1 天）、多算一天、把月份的天数弄错
    smart: [v - 1, v + 1, v + (withFeb ? (kind === 'leap' ? -1 : 1) : 1), v - 2],
  })
}
/** 课本 p79 用一用 3 的原题：2026 年 1 月 24 日至 3 月 1 日放寒假（37 天）、7 月 8 日至 8 月 31 日放暑假（55 天） */
const BOOK_SPANS: [number, number, number, number][] = [
  [1, 24, 3, 1],
  [7, 8, 8, 31],
]
function calSpanBook(d: Difficulty, rng: RNG): Question {
  const [m1, d1, m2, d2] = rng.pick(BOOK_SPANS)
  const v = spanDays(KIND_YEAR.common, m1, d1, m2, d2)
  const withFeb = m1 <= 2 && m2 >= 2
  const p = { a: date(m1, d1), b: date(m2, d2) }
  return numberQuestion({
    kpId: KC,
    type: 'time',
    difficulty: d,
    sig: `span-${withFeb ? 'common' : 'x'}-${m1}.${d1}-${m2}.${d2}`,
    stem: [withFeb ? text('m3.cal.spanYear', { kind: L('m3.cal.common'), ...p }) : text('m3.cal.span', p)],
    value: v,
    rng,
    min: 0,
    max: 999,
    smart: [v - 1, v + 1, v + 2, v - 2],
  })
}
/**
 * 从某天起再过 n 天是几月几日（课本 p79 用一用 1 改写：「从 1 月 7 日起，再过 3 天」「从 2 月 6 日起，再过 15 天」）；
 * same = 不跨月（2 月只出 28 日以内、选项也在 28 日以内，用不着说平年闰年）；跨过 2 月底要说平年还是闰年
 */
function calAfter(d: Difficulty, rng: RNG, same: boolean): Question {
  const kind: YearKind = rng.pick(['common', 'leap'])
  const y = KIND_YEAR[kind]
  for (;;) {
    const m = rng.int(1, 12)
    const day = rng.int(1, daysIn(y, m))
    const n = rng.int(2, same ? 15 : 20)
    const r = addDays(y, m, day, n)
    if (r.m > 12 || (same ? r.m !== m : r.m === m)) continue
    if (same && m === 2 && r.d + 2 > 28) continue
    // 下一天的月份 / 日期：选项是再过 n − 1、n + 1、n + 2 天（头尾算错、多数一天）
    const others = [n - 1, n + 1, n + 2].map((k) => addDays(y, m, day, k)).filter((x) => x.m <= 12)
    if (others.length < 3) continue
    const withFeb = m <= 2 && r.m >= 2 && !(m === 2 && r.m === 2)
    const a = date(m, day)
    return labelQuestion({
      kpId: KC,
      type: 'time',
      difficulty: d,
      sig: `after-${withFeb ? kind : 'x'}-${m}.${day}-${n}`,
      stem: [withFeb ? text('m3.cal.afterYear', { kind: L(`m3.cal.${kind}`), a, n }) : text('m3.cal.after', { a, n })],
      correct: date(r.m, r.d),
      distractors: others.map((x) => date(x.m, x.d)),
      rng,
    })
  }
}

defineGenerator(KC, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 年历中的秘密的全部：大月小月、某月几天（记一记）、看月历、平年闰年（红字 + 每 4 年一个）、用一用 1 / 3 的同月版
    if (roll < 0.18) return calDaysOf(d, rng)
    if (roll < 0.32) return calBigSmall(d, rng)
    if (roll < 0.42) return calFacts(d, rng)
    if (roll < 0.55) return calThisMonth(d, rng)
    if (roll < 0.67) return calThisYear(d, rng)
    if (roll < 0.75) return calYearDays(d, rng, true)
    if (roll < 0.84) return calEvery4(d, rng)
    if (roll < 0.92) return calAfter(d, rng, true)
    return calSpan(d, rng, true)
  }
  if (d === 2) {
    // 变式：全年几天（复习）、年月换算、认星期、跨月的天数（含课本的寒暑假）、不给提示判断平年闰年
    if (roll < 0.14) return calYearDays(d, rng)
    if (roll < 0.25) return calConvert(d, rng)
    if (roll < 0.36) return calMarked(d, rng)
    if (roll < 0.45) return calCountWd(d, rng)
    if (roll < 0.54) return calWdCalc(d, rng, true)
    if (roll < 0.62) return calLeapRule(d, rng, false)
    if (roll < 0.7) return calSpanBook(d, rng)
    if (roll < 0.8) return calSpan(d, rng, false, 1)
    if (roll < 0.92) return calAfter(d, rng, false)
    return calTwoMonths(d, rng)
  }
  if (roll < 0.25) return calLeapRule(d, rng)
  if (roll < 0.5) return calSpan(d, rng, false)
  if (roll < 0.6) return calTwoMonths(d, rng)
  if (roll < 0.8) return calAfter(d, rng, false)
  return calWdCalc(d, rng, false)
})

// ─────────────────────────────────────────────────────────────
// 作息时间表中的秘密：24 时计时法（下午 1 时 = 13 时……晚上 11 时 = 23 时）、一天 24 小时、经过的时间。
// 课本：「下午 6 时」→ 18:00，「晚上 8 时 30 分」→ 20:30；13–18 时说「下午」，19–23 时说「晚上」。
// ─────────────────────────────────────────────────────────────

export type DayPart = 'am' | 'pm' | 'eve'
const part = (p: DayPart): LStr => L(`m3.cal.${p}`)
/** 上午 / 下午 / 晚上的几时 → 24 时计时法 */
export const to24 = (p: DayPart, h: number): number => (p === 'am' ? h : h + 12)
/** 24 时计时法的时数说成上午 / 下午 / 晚上 */
export const partOf = (H: number): DayPart => (H < 12 ? 'am' : H <= 18 ? 'pm' : 'eve')
/** 每一段说几时：上午 6–11 时、下午 1–6 时、晚上 7–11 时 */
const HOURS: Record<DayPart, [number, number]> = { am: [6, 11], pm: [1, 6], eve: [7, 11] }
const pad = (m: number): string => String(m).padStart(2, '0')
/** 表里、选项里的时刻：14:30 */
export const clock = (minutes: number): string => `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`
/** 经过的时间：几小时几分钟（不满 1 小时只说分钟、整小时只说小时） */
export function durLabel(min: number): LStr {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return L('m3.cal.durM', { m })
  return m ? L('m3.cal.dur', { h, m }) : L('m3.cal.durH', { h })
}
/** 经过时间的选项：正确的 + 差 10 分、差半小时、差 1 小时（都 ≥ 10 分钟、互不相同） */
function durChoices(min: number): LStr[] {
  const out: number[] = []
  for (const x of [min + 60, min - 60, min + 30, min - 10, min + 10, min - 30]) if (x >= 10 && x !== min && !out.includes(x) && out.length < 3) out.push(x)
  return out.map(durLabel)
}

const K24 = 'm3s2-06-24h'
function pickPart(rng: RNG, withAm: boolean): DayPart {
  const r = rng.next()
  if (withAm && r < 0.2) return 'am'
  return r < 0.6 ? 'pm' : 'eve'
}

/** 上午 / 下午 / 晚上几时 → 24 时计时法（整时，键盘） */
function h24To(d: Difficulty, rng: RNG): Question {
  const p = pickPart(rng, true)
  const h = rng.int(...HOURS[p])
  const v = to24(p, h)
  return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `to24-${p}-${h}`, stem: [text('m3.cal.to24', { part: part(p), h })], value: v, rng, min: 0, max: 24, smart: [h, h + 10, 24 - h, v + 1] })
}
/** 24 时计时法 → 下午 / 晚上几时（练习十八 5「15 时是下午（ ）时」） */
function h24From(d: Difficulty, rng: RNG): Question {
  const H = rng.int(13, 23)
  const v = H - 12
  return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `from24-${H}`, stem: [text('m3.cal.from24', { H, part: part(partOf(H)) })], value: v, rng, min: 0, max: 24, smart: [H - 10, H, v + 1, v - 1] })
}
/** 钟面 + 上午 / 下午 / 晚上 → 24 时计时法（用一用 1：上午 6 时、上午 9 时、下午 6 时……）；选择题（钟面配数字键盘在手机上放不下一屏） */
function h24Clock(d: Difficulty, rng: RNG, withAm = false): Question {
  const p = pickPart(rng, withAm)
  const h = rng.int(...HOURS[p])
  const v = to24(p, h)
  return numberQuestion({
    kpId: K24,
    type: 'time',
    difficulty: d,
    sig: `clock24-${p}-${h}`,
    stem: [text('m3.cal.clockTo24', { part: part(p) }), { kind: 'clock', hour: h, minute: 0 }],
    value: v,
    rng,
    min: 0,
    max: 24,
    // 上午的时刻也加了 12；下午的忘了加 12
    smart: p === 'am' ? [h + 12, h + 10, v + 1, v - 1] : [h, h + 10, v + 1, v - 1],
    input: 'choice',
  })
}
/** 带分钟的时刻 → 24 时计时法（晚上 8 时 30 分 → 20:30），选项：忘了加 12、差 1 时、把 30 分写成 03 */
function hmChoices(H: number, m: number): string[] {
  const h = H - 12
  const out = [`${h}:${pad(m)}`, `${H < 23 ? H + 1 : H - 2}:${pad(m)}`, m % 10 === 0 ? `${H}:0${m / 10}` : `${H - 1}:${pad(m)}`]
  return [...new Set(out)].filter((x) => x !== `${H}:${pad(m)}`)
}
/** round = 分钟只取整十（30 分就是半时；用一用 1 的「晚上 8 时 30 分」），第 1 档用 */
function h24ToHm(d: Difficulty, rng: RNG, withClock: boolean, round = false): Question {
  const p = pickPart(rng, false)
  const h = rng.int(...HOURS[p])
  const m = rng.pick(round ? [10, 20, 30, 30, 40, 50] : [10, 15, 20, 25, 30, 35, 40, 45, 50])
  const H = to24(p, h)
  return labelQuestion({
    kpId: K24,
    type: 'time',
    difficulty: d,
    sig: `${withClock ? 'clockhm' : 'tohm'}-${p}-${h}-${m}`,
    stem: withClock
      ? [text('m3.cal.clockTo24hm', { part: part(p) }), { kind: 'clock', hour: h, minute: m }]
      : [text('m3.cal.to24hm', { part: part(p), h, m, hm: `${h}:${pad(m)}` })],
    correct: `${H}:${pad(m)}`,
    distractors: hmChoices(H, m),
    rng,
  })
}
/** 24 时计时法的几时几分 → 下午 / 晚上几时几分 */
function h24FromHm(d: Difficulty, rng: RNG): Question {
  const H = rng.int(13, 23)
  const m = rng.pick([10, 15, 20, 30, 40, 45, 50])
  const hm = (h: number): LStr => L('m3.cal.hm', { h, m, mm: pad(m) })
  return labelQuestion({
    kpId: K24,
    type: 'time',
    difficulty: d,
    sig: `fromhm-${H}-${m}`,
    stem: [text('m3.cal.from24hm', { H, m, HM: `${H}:${pad(m)}`, part: part(partOf(H)) })],
    correct: hm(H - 12),
    // 没减 12、减成了 10、差 1 时
    distractors: [hm(H), hm(H - 10), hm(H - 11)],
    rng,
  })
}
/** 找一找：一天 24 小时、时针一天走两圈、0 时到正午 12 小时、午夜 12 时就是第二天 0 时 */
const DAY_FACTS: { key: string; value: number; smart: number[] }[] = [
  { key: 'm3.cal.dayHours', value: 24, smart: [12, 60, 20] },
  { key: 'm3.cal.dayLaps', value: 2, smart: [1, 24, 12] },
  { key: 'm3.cal.toNoon', value: 12, smart: [24, 6, 11] },
  { key: 'm3.cal.toMidnight', value: 12, smart: [24, 6, 0] },
  { key: 'm3.cal.midnight', value: 0, smart: [12, 24, 1] },
]
function h24Facts(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(DAY_FACTS)
  return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `fact-${f.key}`, stem: [text(f.key)], value: f.value, rng, min: 0, max: 99, smart: f.smart })
}
/** 经过几小时（整时）：24 时计时法两个时刻相减，或上午几时到下午 / 晚上几时（先化成 24 时计时法） */
function h24Elapsed(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const a = rng.int(6, 12)
    const b = rng.int(13, 22)
    return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `el-${a}-${b}`, stem: [text('m3.cal.elapsed', { a, b })], value: b - a, rng, min: 0, max: 24, smart: [b - a - 12, b - a + 1, b - a - 1, a + b] })
  }
  const a = rng.int(6, 11)
  const p2 = pickPart(rng, false)
  const b = rng.int(...HOURS[p2])
  const v = to24(p2, b) - a
  return numberQuestion({
    kpId: K24,
    type: 'time',
    difficulty: d,
    sig: `elp-${a}-${p2}-${b}`,
    stem: [text('m3.cal.elapsedParts', { p1: part('am'), a, p2: part(p2), b })],
    value: v,
    rng,
    min: 0,
    max: 24,
    // 没把下午的时数化成 24 时计时法（b − a 可能是负的，会被丢掉）
    smart: [b - a, v + 1, v - 1, 12 - a],
  })
}

/** 周末作息时间表（24 时计时法，从中午起的 4 件事）；课本「妈妈的周末」的样子 */
const ACTS = ['nap', 'read', 'sport', 'shop', 'house', 'craft', 'study']
interface Slot {
  s: number
  e: number
  act: string
}
export function schedule(rng: RNG): Slot[] {
  const acts = [...rng.shuffle(ACTS).slice(0, 3), 'dinner']
  let t = rng.pick([12, 12.5, 13, 13.5]) * 60
  return acts.map((act) => {
    const dur = act === 'dinner' ? rng.pick([30, 45, 60]) : rng.pick([30, 45, 60, 90, 120])
    const slot = { s: t, e: t + dur, act }
    t = slot.e + rng.pick([0, 0, 15, 30])
    return slot
  })
}
export function schedulePart(slots: Slot[]): StemPart {
  return {
    kind: 'stat-table',
    title: L('m3.cal.plan.title'),
    head: 'row',
    rows: [[L('m3.cal.plan.time'), L('m3.cal.plan.act')], ...slots.map((x) => [`${clock(x.s)}—${clock(x.e)}`, L(`m3.cal.act.${x.act}`)])],
  }
}
function h24Schedule(d: Difficulty, rng: RNG): Question {
  const slots = schedule(rng)
  const sig = `plan-${slots.map((x) => `${x.act}${x.s}.${x.e}`).join('-')}`
  const starts = slots.filter((x) => x.s % 60 === 0 && x.s >= 13 * 60 && x.s <= 18 * 60)
  if (starts.length && rng.chance(0.3)) {
    const x = rng.pick(starts)
    const v = x.s / 60 - 12
    return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `${sig}-start-${x.act}`, stem: [text('m3.cal.actStart', { act: L(`m3.cal.act.${x.act}`) }), schedulePart(slots)], value: v, rng, min: 0, max: 24, smart: [x.s / 60, v + 1, v - 1] })
  }
  const x = rng.pick(slots)
  const dur = x.e - x.s
  if (dur <= 60) {
    return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `${sig}-min-${x.act}`, stem: [text('m3.cal.actMin', { act: L(`m3.cal.act.${x.act}`) }), schedulePart(slots)], value: dur, rng, min: 0, max: 99, smart: [dur + 10, dur - 10, 100 - dur, dur + 30] })
  }
  return labelQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `${sig}-hm-${x.act}`, stem: [text('m3.cal.actHm', { act: L(`m3.cal.act.${x.act}`) }), schedulePart(slots)], correct: durLabel(dur), distractors: durChoices(dur), rng })
}
/** 饭店营业时间（用一用 3：11:00—14:30、16:30—21:00，一天营业 8 小时）：一天营业多久、晚上几时关门 */
export function shopPart(ls: number, le: number, ds: number, de: number): StemPart {
  return {
    kind: 'stat-table',
    title: L('m3.cal.shop.title'),
    rows: [
      [L('m3.cal.act.lunch'), `${clock(ls)}—${clock(le)}`],
      [L('m3.cal.act.supper'), `${clock(ds)}—${clock(de)}`],
    ],
  }
}
function h24Shop(d: Difficulty, rng: RNG): Question {
  const ls = rng.pick([10.5, 11]) * 60
  const le = rng.pick([13.5, 14, 14.5]) * 60
  const ds = rng.pick([16.5, 17]) * 60
  const de = rng.pick([20.5, 21, 21.5]) * 60
  const sig = `shop-${ls}-${le}-${ds}-${de}`
  const total = le - ls + (de - ds)
  if (de % 60 === 0 && rng.chance(0.3)) {
    const v = de / 60 - 12
    return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `${sig}-close`, stem: [text('m3.cal.shopClose'), shopPart(ls, le, ds, de)], value: v, rng, min: 0, max: 24, smart: [de / 60, v + 1, v - 1] })
  }
  if (total % 60 === 0) {
    const v = total / 60
    return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `${sig}-total`, stem: [text('m3.cal.shopTotal'), shopPart(ls, le, ds, de)], value: v, rng, min: 0, max: 24, smart: [v + 1, v - 1, v + 2] })
  }
  return labelQuestion({ kpId: K24, type: 'time', difficulty: d, sig: `${sig}-hm`, stem: [text('m3.cal.shopTotalHm'), shopPart(ls, le, ds, de)], correct: durLabel(total), distractors: durChoices(total), rng })
}
/** 下午 / 晚上几时几分的选项：正确的 + 没减 12、减成了 10、差 1 时 */
function hmLabels(H: number, m: number): { correct: LStr; distractors: LStr[] } {
  const hm = (h: number): LStr => L('m3.cal.hm', { h, m, mm: pad(m) })
  return { correct: hm(H - 12), distractors: [hm(H), hm(H - 10), hm(H - 11)] }
}
/** 用一用 3 的原题（照课本的数）：营业时间 11:00—14:30、16:30—21:00，晚餐从下午几时几分到晚上几时、一天一共营业几小时 */
const BOOK_SHOP = [11 * 60, 14.5 * 60, 16.5 * 60, 21 * 60] as const
function h24ShopBook(d: Difficulty, rng: RNG): Question {
  const [ls, le, ds, de] = BOOK_SHOP
  const table = shopPart(ls, le, ds, de)
  const kind = rng.int(0, 2)
  if (kind === 0) {
    const H = Math.floor(ds / 60)
    return labelQuestion({ kpId: K24, type: 'time', difficulty: d, sig: 'shopbook-from', stem: [text('m3.cal.shopSupperFrom'), table], ...hmLabels(H, ds % 60), rng })
  }
  if (kind === 1) {
    const v = de / 60 - 12
    return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: 'shopbook-close', stem: [text('m3.cal.shopClose'), table], value: v, rng, min: 0, max: 24, smart: [de / 60, v + 1, v - 1] })
  }
  const v = (le - ls + (de - ds)) / 60
  return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig: 'shopbook-total', stem: [text('m3.cal.shopTotal'), table], value: v, rng, min: 0, max: 24, smart: [v + 1, v - 1, 10] })
}
/** 读作息时间表（p80「妈妈的时间表中 14:30 是怎么回事？」）：表里下午 / 晚上的一个时刻是几时几分（整时问几时） */
function h24PlanRead(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const slots = schedule(rng)
    const times = [...new Set(slots.flatMap((x) => [x.s, x.e]))].filter((t) => t >= 13 * 60 && t < 24 * 60)
    if (!times.length) continue
    const t = rng.pick(times)
    const H = Math.floor(t / 60)
    const m = t % 60
    const p = { HM: clock(t), part: part(partOf(H)) }
    const sig = `planread-${slots.map((x) => `${x.act}${x.s}.${x.e}`).join('-')}-${t}`
    if (!m) {
      const v = H - 12
      return numberQuestion({ kpId: K24, type: 'time', difficulty: d, sig, stem: [text('m3.cal.planReadH', p), schedulePart(slots)], value: v, rng, min: 0, max: 24, smart: [H, H - 10, v + 1, v - 1] })
    }
    return labelQuestion({ kpId: K24, type: 'time', difficulty: d, sig, stem: [text('m3.cal.planRead', p), schedulePart(slots)], ...hmLabels(H, m), rng })
  }
}
/** 在校时间（练习十八 5：早上 8 时 10 分到校，12 时放学；下午 2 时到校，17 时放学 → 6 小时 50 分；课本写「分钟」，选项卡里写「分」免得折行） */
export function schoolPart(amIn: number, amOut: number, pmIn: number, pmOut: number): StemPart {
  return {
    kind: 'stat-table',
    title: L('m3.cal.school.title'),
    rows: [
      [L('m3.cal.act.amSchool'), `${clock(amIn)}—${clock(amOut)}`],
      [L('m3.cal.act.pmSchool'), `${clock(pmIn)}—${clock(pmOut)}`],
    ],
  }
}
function h24School(d: Difficulty, rng: RNG): Question {
  const amIn = rng.pick([7 * 60 + 40, 7 * 60 + 50, 8 * 60, 8 * 60 + 10])
  const amOut = rng.pick([11 * 60 + 30, 11 * 60 + 40, 12 * 60])
  const pmIn = rng.pick([13 * 60 + 30, 14 * 60, 14 * 60 + 10])
  const pmOut = rng.pick([16 * 60 + 30, 17 * 60, 17 * 60 + 10])
  const total = amOut - amIn + (pmOut - pmIn)
  return labelQuestion({
    kpId: K24,
    type: 'time',
    difficulty: d,
    sig: `school-${amIn}-${amOut}-${pmIn}-${pmOut}`,
    stem: [text('m3.cal.schoolTotal'), schoolPart(amIn, amOut, pmIn, pmOut)],
    correct: durLabel(total),
    distractors: durChoices(total),
    rng,
  })
}

defineGenerator(K24, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 作息时间表中的秘密的全部：读作息表、找一找四问、24 时计时法（整时与整十分、半时，带钟面）、饭店营业时间的原题
    if (roll < 0.15) return h24To(d, rng)
    if (roll < 0.28) return h24From(d, rng)
    if (roll < 0.38) return h24Clock(d, rng, true)
    if (roll < 0.5) return h24ToHm(d, rng, true, true)
    if (roll < 0.58) return h24ToHm(d, rng, false, true)
    if (roll < 0.73) return h24Facts(d, rng)
    if (roll < 0.85) return h24ShopBook(d, rng)
    return h24PlanRead(d, rng)
  }
  if (d === 2) {
    // 变式：任意分钟的换算、经过的时间、按作息表 / 营业时间 / 在校时间算时长
    if (roll < 0.15) return h24ToHm(d, rng, rng.chance(0.5))
    if (roll < 0.3) return h24FromHm(d, rng)
    if (roll < 0.45) return h24Elapsed(d, rng)
    if (roll < 0.7) return h24Schedule(d, rng)
    if (roll < 0.9) return h24Shop(d, rng)
    return h24School(d, rng)
  }
  if (roll < 0.4) return h24Schedule(d, rng)
  if (roll < 0.7) return h24Shop(d, rng)
  return h24School(d, rng)
})
