// 万以内数的汉字读法（二下「万以内数的认识」例 2、例 7、例 8：读作 / 写作）。
// 读法按课本：从高位读起；中间有一个 0 或两个 0 只读一个「零」；末尾的 0 都不读；千位是 2 读「二千」（课本「二千零八十」）。
// 汉字读法拼成嵌套的词条（每个字一条，各带自己的拼音）：「一」在千、百前面标变调 yì，其余标 yī；英文界面也显示汉字（考的是汉字读法）。
import type { LStr } from '@/types/models'

const DIGIT = '零一二三四五六七八九'
const UNIT: Record<number, string> = { 1000: '千', 100: '百', 10: '十' }

/** 一个字对应的词条键 */
type Tok = { ch: string; key: string }

const CHAR_KEY: Record<string, string> = {
  零: 'numword.0',
  一: 'numword.1',
  二: 'numword.2',
  三: 'numword.3',
  四: 'numword.4',
  五: 'numword.5',
  六: 'numword.6',
  七: 'numword.7',
  八: 'numword.8',
  九: 'numword.9',
  十: 'numword.10',
  百: 'numword.100',
  千: 'numword.1000',
  万: 'numword.10000',
}

export const NUMWORD_ZH: Record<string, string> = {
  ...Object.fromEntries(Object.entries(CHAR_KEY).map(([ch, key]) => [key, ch])),
  'numword.1t': '一',
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`numword.seq${i + 1}`, Array.from({ length: i + 1 }, (_, k) => `{c${k}}`).join('')])),
}

export const NUMWORD_PINYIN: Record<string, string> = {
  'numword.0': 'líng',
  'numword.1': 'yī',
  'numword.1t': 'yì',
  'numword.2': 'èr',
  'numword.3': 'sān',
  'numword.4': 'sì',
  'numword.5': 'wǔ',
  'numword.6': 'liù',
  'numword.7': 'qī',
  'numword.8': 'bā',
  'numword.9': 'jiǔ',
  'numword.10': 'shí',
  'numword.100': 'bǎi',
  'numword.1000': 'qiān',
  'numword.10000': 'wàn',
}

/**
 * 按位读成汉字（1–10000）。zeros：'rule' 照课本（中间连续的 0 只读一个零、末尾不读）；
 * 'all' 每个 0 都读（错法：六千零零九、二千零八十零）；'none' 一个零也不读（错法：三千六十九）。
 */
export function cnChars(n: number, zeros: 'rule' | 'all' | 'none' = 'rule'): string {
  if (n === 10000) return '一万'
  let out = ''
  let started = false
  let pendingZero = false
  for (const place of [1000, 100, 10, 1]) {
    const d = Math.floor(n / place) % 10
    if (!started && d === 0) continue
    if (d === 0) {
      if (zeros === 'all') out += '零'
      else pendingZero = true
      continue
    }
    if (pendingZero && zeros === 'rule') out += '零'
    pendingZero = false
    started = true
    out += DIGIT[d]! + (UNIT[place] ?? '')
  }
  return out
}

/** 汉字读法 → 嵌套词条：每个字一条（「一」在千、百前面用变调那一条） */
export function cnWords(chars: string): LStr {
  const list = Array.from(chars)
  const toks: Tok[] = list.map((ch, i) => {
    const next = list[i + 1]
    const key = ch === '一' && (next === '千' || next === '百') ? 'numword.1t' : CHAR_KEY[ch]!
    return { ch, key }
  })
  const p: Record<string, LStr> = {}
  toks.forEach((t, i) => (p[`c${i}`] = { k: t.key }))
  return { k: `numword.seq${toks.length}`, p }
}
