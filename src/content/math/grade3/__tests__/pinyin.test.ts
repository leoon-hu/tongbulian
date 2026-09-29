import { describe, expect, it } from 'vitest'
import '@/content/math/grade3'
import { isHan, pinyinOf, translate } from '@/engine/i18n'
import { EN, PINYIN, ZH } from '../lang'
import { TITLE_PINYIN } from '../titles'
import { KNOWLEDGE_POINTS } from '../curriculum'

const SYLLABLE = /^[a-zü]*[āáǎàaēéěèeīíǐìiōóǒòoūúǔùuǖǘǚǜü][a-zü]*$/
const hanCount = (text: string): number => [...text].filter(isHan).length

function misaligned(key: string, text: string, py: string | undefined): string | null {
  if (py === undefined) return `${key}「${text}」缺拼音`
  const syllables = py.trim() ? py.trim().split(/\s+/) : []
  if (syllables.length !== hanCount(text)) return `${key}「${text}」拼音音节数 ${syllables.length} ≠ 汉字数 ${hanCount(text)}`
  for (const s of syllables) if (!SYLLABLE.test(s)) return `${key} 的音节「${s}」不像拼音`
  return null
}

describe('三年级数学的词条与拼音', () => {
  it('词条键都以 m3. 开头，中英文一一对应', () => {
    for (const k of Object.keys(ZH)) expect(k, k).toMatch(/^m3\./)
    expect(Object.keys(EN).sort()).toEqual(Object.keys(ZH).sort())
  })

  it('每个中文词条都有拼音，且音节数等于汉字数；拼音表没有多余的键', () => {
    const bad = Object.keys(ZH)
      .map((k) => misaligned(k, translate({ k }, 'zh'), PINYIN[k]))
      .filter(Boolean)
    expect(bad).toEqual([])
    for (const k of Object.keys(PINYIN)) expect(ZH[k], `${k} 在词条里不存在`).toBeDefined()
    // 注册进引擎的也是这一份
    for (const k of Object.keys(ZH).slice(0, 5)) expect(pinyinOf(k)).toBe(PINYIN[k])
  })

  it('知识点标题的拼音与标题逐字对齐', () => {
    const bad = KNOWLEDGE_POINTS.map((kp) => misaligned(`kp.${kp.id}`, kp.title, TITLE_PINYIN[`kp.${kp.id}`])).filter(Boolean)
    expect(bad).toEqual([])
    expect(Object.keys(TITLE_PINYIN).sort()).toEqual(KNOWLEDGE_POINTS.map((kp) => `kp.${kp.id}`).sort())
  })
})
