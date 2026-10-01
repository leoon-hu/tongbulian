// 100 以内数的汉字读法（一下「100 以内数的认识」p26–30：写作 27、读作二十七；写出「三十八」「一百」）。
// 读法照课本：10~19 读「十几」（十一、十九），整十读「几十」，100 读「一百」。
// 拼成嵌套的词条（每个字一条，各带自己的拼音）：「一百」的「一」标变调 yì，其余标 yī；英文界面也显示汉字（考的是汉字读法）。
// 键用 cn.*（二年级万以内的读法在它自己的包里，键是 numword.*，两边互不依赖）。
import type { LStr } from '@/types/models'

const DIGIT = '零一二三四五六七八九'

const CHAR_KEY: Record<string, string> = {
  零: 'cn.0',
  一: 'cn.1',
  二: 'cn.2',
  三: 'cn.3',
  四: 'cn.4',
  五: 'cn.5',
  六: 'cn.6',
  七: 'cn.7',
  八: 'cn.8',
  九: 'cn.9',
  十: 'cn.10',
  百: 'cn.100',
}

export const CN_ZH: Record<string, string> = {
  ...Object.fromEntries(Object.entries(CHAR_KEY).map(([ch, key]) => [key, ch])),
  'cn.1t': '一',
  'cn.seq1': '{c0}',
  'cn.seq2': '{c0}{c1}',
  'cn.seq3': '{c0}{c1}{c2}',
}

export const CN_PINYIN: Record<string, string> = {
  'cn.0': 'líng',
  'cn.1': 'yī',
  'cn.1t': 'yì',
  'cn.2': 'èr',
  'cn.3': 'sān',
  'cn.4': 'sì',
  'cn.5': 'wǔ',
  'cn.6': 'liù',
  'cn.7': 'qī',
  'cn.8': 'bā',
  'cn.9': 'jiǔ',
  'cn.10': 'shí',
  'cn.100': 'bǎi',
}

/** 1–100 按课本读成汉字：7 → 七、14 → 十四、40 → 四十、38 → 三十八、100 → 一百 */
export function cnChars(n: number): string {
  if (n === 100) return '一百'
  const t = Math.floor(n / 10)
  const o = n % 10
  if (t === 0) return DIGIT[o]!
  return `${t === 1 ? '' : DIGIT[t]}十${o ? DIGIT[o] : ''}`
}

/** 汉字（只含零~九、十、百）→ 嵌套词条：每个字一条（「一百」的「一」用变调那一条） */
export function cnWords(chars: string): LStr {
  const list = Array.from(chars)
  const p: Record<string, LStr> = {}
  list.forEach((ch, i) => (p[`c${i}`] = { k: ch === '一' && list[i + 1] === '百' ? 'cn.1t' : CHAR_KEY[ch]! }))
  return { k: `cn.seq${list.length}`, p }
}
