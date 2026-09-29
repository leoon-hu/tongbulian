// 分数（三年级「分数的初步认识」）：题目文字里写成「3/4」，界面上画成上下两层（分子在上、分母在下），
// 朗读读「四分之三」/「three fourths」。只处理真分数与分子、分母都是整数的写法，够小学用。
import type { Lang } from '@/types/models'

/** 文字里的一个分数：分子 / 分母（前后不挨着别的数字、小数点、斜杠，免得把「2026/9/28」这类日期误认） */
export const FRACTION = /(?<![\d./])(\d{1,3})\/(\d{1,3})(?![\d/]|\.\d)/g

/** 写成文字：frac(3, 4) = '3/4' */
export function frac(n: number, d: number): string {
  return `${n}/${d}`
}

const ZH_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 中文数字（0–999），分数读法用：二分之一（不读「两」）、十二分之五、一百分之三 */
export function zhNumberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) return String(n)
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
const EN_ORDINAL: Record<number, string> = { 2: 'half', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth', 20: 'twentieth', 100: 'hundredth' }

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

/** 分数的读法：中文「四分之三」，英文「three fourths」「one half」 */
export function fractionWords(n: number, d: number, lang: Lang): string {
  if (lang === 'zh') return `${zhNumberWord(d)}分之${zhNumberWord(n)}`
  const ord = enOrdinal(d)
  const plural = n === 1 ? ord : ord === 'half' ? 'halves' : `${ord}s`
  return `${enNumberWord(n)} ${plural}`
}

/** 一段文字按分数切开（界面把分数画成上下两层用） */
export type FracPiece = { text: string } | { n: string; d: string }
export function splitFractions(text: string): FracPiece[] {
  const out: FracPiece[] = []
  let last = 0
  for (const m of text.matchAll(FRACTION)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push({ n: m[1]!, d: m[2]! })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
