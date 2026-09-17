/**
 * 朗读文本：把一句题目切成可以逐条播放的「片段」——数字、一段连续的汉字 / 外文短语、emoji 的名字、
 * 独立的运算符（读作「加」「等于」…）。每个片段对应一条预合成的音频（见 engine/voice），
 * 顺序播完就是整句；标点只用来断句，本身不读。
 *
 * 片段来自渲染后的文字而不是词条模板，这样「从{from}数排第几个」会连成一整句「从左数排第几个」，
 * 比「从 / 左 / 数排第几个」三段拼起来自然得多。
 */
import type { Lang, LStr, Question } from '@/types/models'
import { hasEntry, translate } from './i18n'
import { answerLabel } from './answer'

// 符号组放在 emoji 组前面：⬜ 也算 Extended_Pictographic，但它是算式里的空格子。
// 算式末尾的「= ?」合成一个片段（读「等于几」），单独一个「几」读起来生硬还容易读错声调。
// 小括号单独一组：它紧挨着数字，但必须读出来（「括号 3 加 4 括号 乘 5」），不走「独立成项才读」的规则。
const TOKEN =
  /(\d+(?:\.\d+)?)|(\p{Script=Han}+)|([A-Za-z][A-Za-z'’-]*(?:[ \u00a0][A-Za-z][A-Za-z'’-]*)*)|(=\s*\?|[+\-=?><⬜×÷])|([()（）])|(\p{Extended_Pictographic}\uFE0F?)/gu

/** 符号只有独立成项（两边不挨着字母 / 数字 / 汉字 / emoji）才读：「9 + 5」的 + 读，「ten-frame」的 -、「🐰?」的 ? 不读 */
const WORDISH_BEFORE = /[\p{L}\p{N}\p{Extended_Pictographic}\uFE0F]$/u
const WORDISH_AFTER = /^[\p{L}\p{N}\p{Extended_Pictographic}]/u

/** 中文里数字 2 后面紧跟量词时读「两」：2 个十 → 两个十、2 元 → 两元；序数除外：第 2 个 → 第二个 */
const LIANG_BEFORE = /^[个元角只块张条本辆朵棵根颗支]/
const ORDINAL_BEFORE = /第$/

interface Raw {
  kind: 'number' | 'phrase' | 'emoji' | 'symbol'
  text: string
  /** 大数拆出来的一段（如 302 的「2」），不再套「2 读两」的规则 */
  part?: boolean
}

const ZH_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/**
 * 数字的朗读片段。0–100（与小数）是一整个片段；更大的数按位拆成几段，不然万以内的每个数都要一条音频。
 * 中文按课本读法：3005 → 三千 / 零 / 5，315 → 三百 / 一十 / 5，1200 → 一千 / 二百，10000 → 一万；
 * 英文：3450 → 3 / thousand / 4 / hundred / 50。
 */
export function numberPieces(num: string, lang: Lang): string[] {
  const n = Number(num)
  if (!Number.isInteger(n) || n <= 100 || n > 99999) return [num]
  if (lang === 'zh') {
    if (n === 10000) return ['一万']
    const out: string[] = []
    const wan = Math.floor(n / 10000)
    const qian = Math.floor((n % 10000) / 1000)
    const bai = Math.floor((n % 1000) / 100)
    const tail = n % 100
    if (wan) out.push(`${ZH_DIGITS[wan]}万`)
    if (qian) out.push(`${ZH_DIGITS[qian]}千`)
    else if (wan && (bai || tail)) out.push('零')
    if (bai) out.push(`${ZH_DIGITS[bai]}百`)
    else if ((qian || wan) && tail) out.push('零')
    if (tail) {
      if (tail < 10) {
        if (bai) out.push('零')
        out.push(String(tail))
      } else if (tail < 20) {
        out.push('一十')
        if (tail % 10) out.push(String(tail % 10))
      } else out.push(String(tail))
    }
    return out
  }
  const out: string[] = []
  const thousands = Math.floor(n / 1000)
  const hundreds = Math.floor((n % 1000) / 100)
  const tail = n % 100
  if (thousands) out.push(String(thousands), 'thousand')
  if (hundreds) out.push(String(hundreds), 'hundred')
  if (tail) out.push(String(tail))
  return out
}

function rawTokens(text: string, lang: Lang): Raw[] {
  const out: Raw[] = []
  for (const m of text.matchAll(TOKEN)) {
    const [whole, num, han, latin, sym, paren, emoji] = m
    if (num) {
      const pieces = numberPieces(num, lang)
      for (const piece of pieces) out.push({ kind: 'number', text: piece, part: pieces.length > 1 })
    } else if (han) out.push({ kind: 'phrase', text: han })
    else if (latin) out.push({ kind: 'phrase', text: latin.trim() })
    else if (sym) {
      if (WORDISH_BEFORE.test(text.slice(0, m.index)) || WORDISH_AFTER.test(text.slice(m.index + whole.length))) continue
      const key = `sym.${sym.replace(/\s+/g, '')}`
      if (hasEntry(key, lang)) out.push({ kind: 'symbol', text: translate({ k: key }, lang) })
    } else if (paren) {
      const key = `sym.${/[(（]/.test(paren) ? '(' : ')'}`
      if (hasEntry(key, lang)) out.push({ kind: 'symbol', text: translate({ k: key }, lang) })
    } else if (emoji) {
      const key = hasEntry(`emoji.${emoji}`, lang) ? `emoji.${emoji}` : `emoji.${emoji.replace(/\uFE0F$/, '')}`
      if (hasEntry(key, lang)) out.push({ kind: 'emoji', text: translate({ k: key }, lang) })
    }
  }
  return out
}

/** 把一段（已按语言解析好的）文字切成朗读片段。 */
export function tokenize(text: string, lang: Lang): string[] {
  const raws = rawTokens(text, lang)
  return raws.map((r, i) => {
    const prev = raws[i - 1]
    const next = raws[i + 1]
    if (
      lang === 'zh' &&
      r.kind === 'number' &&
      !r.part &&
      r.text === '2' &&
      next?.kind === 'phrase' &&
      LIANG_BEFORE.test(next.text) &&
      !(prev?.kind === 'phrase' && ORDINAL_BEFORE.test(prev.text))
    ) {
      return '两'
    }
    return r.text
  })
}

/** 一条可本地化文本的朗读片段。 */
export function phraseSpeech(l: LStr, lang: Lang): string[] {
  return tokenize(translate(l, lang), lang)
}

/** 题干的朗读片段：文字与算式按顺序读，教具（十格阵、实物、钟面…）不读。 */
export function questionSpeech(q: Question, lang: Lang): string[] {
  const out: string[] = []
  for (const part of q.stem) {
    if (part.kind === 'text') out.push(...phraseSpeech(part.text, lang))
    else if (part.kind === 'expr') out.push(...tokenize(part.expr, lang))
  }
  return out
}

/** 答错反馈：「正确答案是 X」。 */
export function answerSpeech(q: Question, lang: Lang): string[] {
  return [...phraseSpeech({ k: 'practice.answerIs' }, lang), ...phraseSpeech(answerLabel(q), lang)]
}

/** 结算：「闯关完成！答对 x 题」。 */
export function summarySpeech(correct: number, lang: Lang): string[] {
  return [
    ...phraseSpeech({ k: 'summary.success' }, lang),
    ...phraseSpeech({ k: 'summary.scorePre' }, lang),
    String(correct),
    ...phraseSpeech({ k: 'summary.scorePost' }, lang),
  ]
}

export const RIGHT_KEYS = ['voice.right.1', 'voice.right.2', 'voice.right.3']

/** 答对时的鼓励语（随机一句）。 */
export function rightSpeech(lang: Lang, pick: number = Math.random()): string[] {
  const key = RIGHT_KEYS[Math.floor(pick * RIGHT_KEYS.length) % RIGHT_KEYS.length]!
  return phraseSpeech({ k: key }, lang)
}
