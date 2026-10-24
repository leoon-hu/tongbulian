import { describe, expect, it } from 'vitest'
import '@/content/english/grade3'
import { dictKeys, isHan, pinyinOf, rubySegments, translate } from '@/engine/i18n'
import { unitTexts } from '@/content/english/shared/makers'
import { PINYIN } from '@/content/english/shared/prompts'
import { UNIT_SPECS, wordOf } from '../generators'
import { TITLE_PINYIN } from '../titles'
import { PY } from '../py'

/** 带调的音节（轻声不标调）；儿化的「儿」标 r */
const SYLLABLE = /^[a-zü]*[āáǎàaēéěèeīíǐìiōóǒòoūúǔùuǖǘǚǜü][a-zü]*$/

const hans = (text: string): string[] => [...text].filter(isHan)

/** 拼音与汉字逐个对齐：音节数 = 汉字数，每个音节像拼音；对不上返回问题描述 */
function misaligned(text: string, py: string | undefined): string | null {
  if (py === undefined) return `「${text}」缺拼音`
  const syllables = py.split(/\s+/)
  const cs = hans(text)
  if (syllables.length !== cs.length) return `「${text}」拼音音节数 ${syllables.length} ≠ 汉字数 ${cs.length}`
  for (const [i, s] of syllables.entries()) {
    if (s === 'r' ? cs[i] !== '儿' : !SYLLABLE.test(s)) return `「${text}」的音节「${s}」不对`
  }
  return null
}

describe('知识点标题与题目要求的拼音', () => {
  it('每个知识点标题都有拼音，且与汉字逐个对齐（Unit、A、B 这些英文不占位）', () => {
    const keys = dictKeys('zh').filter((k) => k.startsWith('kp.e3s'))
    expect(keys).toHaveLength(38)
    expect(keys.map((k) => misaligned(translate({ k }, 'zh'), pinyinOf(k))).filter(Boolean)).toEqual([])
    for (const k of Object.keys(TITLE_PINYIN)) expect(keys, k).toContain(k)
  })

  it('题目要求（eq.*）都有拼音且对齐，中英文都有', () => {
    const keys = dictKeys('zh').filter((k) => k.startsWith('eq.'))
    expect(keys.length).toBeGreaterThan(15)
    expect(keys.map((k) => misaligned(translate({ k }, 'zh'), pinyinOf(k))).filter(Boolean)).toEqual([])
    for (const k of keys) expect(translate({ k }, 'en'), k).not.toBe(k)
    expect(Object.keys(PINYIN).sort()).toEqual(keys.sort())
  })
})

/** 每个知识点要查拼音表的中文 */
const NEEDED = new Set(UNIT_SPECS.flatMap((spec) => unitTexts(spec)))

describe('单词意思与中文问答的拼音表（py.ts）', () => {
  it('每个知识点要用到的中文都在表里，且与汉字逐个对齐', () => {
    expect(NEEDED.size).toBeGreaterThan(200)
    expect([...NEEDED].map((t) => misaligned(t, PY[t])).filter(Boolean)).toEqual([])
  })

  it('表里没有用不到的条目（材料删了拼音也要删）', () => {
    expect(Object.keys(PY).filter((k) => !NEEDED.has(k))).toEqual([])
  })

  it('要注音的中文（ew3.*）逐字注音；英文的选项是纯字符串、不注音', () => {
    const word = [...NEEDED].find((t) => hans(t).length === 2 && PY[t])!
    const segs = rubySegments(wordOf(word), 'zh')
    expect(segs.map((s) => s.py)).toEqual(PY[word]!.split(' '))
    expect(rubySegments('apple', 'zh')).toEqual([{ text: 'apple' }])
  })
})
