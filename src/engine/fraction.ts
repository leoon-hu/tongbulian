// 分数（三年级「分数的初步认识」）：题目文字里写成「3/4」，界面上画成上下两层（分子在上、分母在下），
// 朗读读「四分之三」/「three fourths」。只处理真分数与分子、分母都是整数的写法，够小学用。
import type { Lang } from '@/types/models'

/** 文字里的一个分数：分子 / 分母（前后不挨着别的数字、小数点、斜杠，免得把「2026/9/28」这类日期误认） */
export const FRACTION = /(?<![\d./])(\d{1,4})\/(\d{1,4})(?![\d/]|\.\d)/g

/** 写成文字：frac(3, 4) = '3/4' */
export function frac(n: number, d: number): string {
  return `${n}/${d}`
}

/**
 * 带分数（五下「真分数和假分数」）：整数部分和分数之间用细空格（U+2009）连着写——mixed(2, 1, 5) = '2 1/5'。
 * 界面画成整数紧挨着上下两层的分数（照课本），朗读「二又五分之一」「two and one fifth」（speech.ts 把它当一个槽）。
 * 普通空格不算：「第 2 1/4」这类文字不会被误认成带分数。
 */
export const MIXED_SEP = '\u2009'
export function mixed(w: number, n: number, d: number): string {
  return `${w}${MIXED_SEP}${n}/${d}`
}

/**
 * 循环小数（五上「小数除法」）：循环节的首位和末位数字后面各跟一个组合用的上点（U+0307），只有一位的就点那一位——
 * repeating('7', '1', '45') = '7.14̇5̇'、repeating('5', '', '3') = '5.3̇'、repeating('0', '', '142857') = '0.1̇42857̇'。
 * 界面在那一位上面画圆点（MathText），朗读「七点一四五，四五循环」「7.145, 4 5 repeating」（speech.ts 的 spellMarks）。
 */
export const DOT_ABOVE = '\u0307'
export function repeating(int: string, pre: string, rep: string): string {
  const r = [...rep]
  const marked = r.length === 1 ? `${r[0]}${DOT_ABOVE}` : `${r[0]}${DOT_ABOVE}${r.slice(1, -1).join('')}${r[r.length - 1]}${DOT_ABOVE}`
  return `${int}.${pre}${marked}`
}
/** 文字里的一个循环小数：整数部分、不循环的小数部分、循环节（把首末两位上的点去掉） */
export const REPEATING = /(?<![\d.])(\d+)\.(\d*)(\d)\u0307(?:(\d*)(\d)\u0307)?/g
export function repeatingParts(m: RegExpMatchArray): { int: string; pre: string; rep: string } {
  return { int: m[1]!, pre: m[2]!, rep: `${m[3]}${m[4] ?? ''}${m[5] ?? ''}` }
}

const ZH_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 中文数字（0–9999），分数读法用：二分之一（不读「两」）、十二分之五、一百分之三、一千分之一百二十三（五下） */
export function zhNumberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) return String(n)
  if (n >= 1000) {
    const qian = Math.floor(n / 1000)
    const rest = n % 1000
    if (!rest) return `${ZH_DIGITS[qian]}千`
    return `${ZH_DIGITS[qian]}千${rest < 100 ? '零' : ''}${rest >= 10 && rest < 20 ? `一${zhNumberWord(rest)}` : zhNumberWord(rest)}`
  }
  if (n < 10) return ZH_DIGITS[n]!
  if (n < 20) return `十${n % 10 ? ZH_DIGITS[n % 10] : ''}`
  if (n < 100) return `${ZH_DIGITS[Math.floor(n / 10)]}十${n % 10 ? ZH_DIGITS[n % 10] : ''}`
  const bai = Math.floor(n / 100)
  const rest = n % 100
  if (!rest) return `${ZH_DIGITS[bai]}百`
  if (rest < 10) return `${ZH_DIGITS[bai]}百零${ZH_DIGITS[rest]}`
  return `${ZH_DIGITS[bai]}百${rest < 20 ? `一${zhNumberWord(rest)}` : zhNumberWord(rest)}`
}

const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const EN_ORDINAL: Record<number, string> = { 2: 'half', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth', 20: 'twentieth', 100: 'hundredth', 1000: 'thousandth' }

function enNumberWord(n: number): string {
  if (n < 20) return EN_ONES[n] ?? String(n)
  if (n < 100) return `${EN_TENS[Math.floor(n / 10)]}${n % 10 ? `-${EN_ONES[n % 10]}` : ''}`
  return String(n)
}

function enOrdinal(d: number): string {
  if (EN_ORDINAL[d]) return EN_ORDINAL[d]!
  if (d < 20) return `${EN_ONES[d]}th`
  return `${d}th`
}

/** 分数的读法：中文「四分之三」，英文「three fourths」「one half」；带分数给 whole：「二又五分之一」「two and one fifth」 */
export function fractionWords(n: number, d: number, lang: Lang, whole?: number): string {
  if (lang === 'zh') return `${whole === undefined ? '' : `${zhNumberWord(whole)}又`}${zhNumberWord(d)}分之${zhNumberWord(n)}`
  const ord = enOrdinal(d)
  const plural = n === 1 ? ord : ord === 'half' ? 'halves' : `${ord}s`
  return `${whole === undefined ? '' : `${enNumberWord(whole)} and `}${enNumberWord(n)} ${plural}`
}

/** 分数，前面可以带带分数的整数部分（「2 1/5」，细空格连着） */
const FRACTION_OR_MIXED = /(?<![\d./])(?:(\d{1,3})\u2009)?(\d{1,4})\/(\d{1,4})(?![\d/]|\.\d)/g

/** 一段文字按分数切开（界面把分数画成上下两层用）；带分数多一个 w（整数部分） */
export type FracPiece = { text: string } | { n: string; d: string; w?: string }
export function splitFractions(text: string): FracPiece[] {
  const out: FracPiece[] = []
  let last = 0
  for (const m of text.matchAll(FRACTION_OR_MIXED)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push(m[1] === undefined ? { n: m[2]!, d: m[3]! } : { n: m[2]!, d: m[3]!, w: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
