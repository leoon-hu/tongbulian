import { describe, expect, it } from 'vitest'
import '@/content/math/grade2'
import { dictKeys, isHan, pinyinOf, rubySegments, translate } from '@/engine/i18n'
import { PINYIN } from '../pinyin'

/** 需要注音的词条前缀：孩子在练习页会看到的题干 / 选项 / 教具文案 / 知识点标题（含二年级新增的 num：数的组成部件）。 */
const NEEDS_PINYIN = /^(q|opt|dir|side|rel|cat|shape|lineup|tf|kp|practice|summary|num|battle|skin|room|entry|mic|robot)\./

const SYLLABLE = /^[a-zü]*[āáǎàaēéěèeīíǐìiōóǒòoūúǔùuǖǘǚǜü][a-zü]*$/

function hanCount(text: string): number {
  return [...text].filter(isHan).length
}

describe('二年级拼音表', () => {
  const zhKeys = dictKeys('zh').filter((k) => NEEDS_PINYIN.test(k))

  it('每个需要注音的中文词条都有拼音，且音节数等于汉字数', () => {
    expect(zhKeys.length).toBeGreaterThan(120)
    for (const key of zhKeys) {
      const text = translate({ k: key }, 'zh')
      const han = hanCount(text)
      const py = pinyinOf(key)
      expect(py, `${key} 缺拼音`).toBeDefined()
      const syllables = py!.split(/\s+/)
      expect(syllables.length, `${key}「${text}」拼音音节数 ${syllables.length} ≠ 汉字数 ${han}`).toBe(han)
      for (const s of syllables) expect(s, `${key} 的音节「${s}」不像拼音`).toMatch(SYLLABLE)
    }
  })

  it('拼音表里没有多余的键（词条删了拼音也要删）', () => {
    const known = new Set(dictKeys('zh'))
    for (const key of Object.keys(PINYIN)) expect(known.has(key), `${key} 在字典里不存在`).toBe(true)
  })

  it('嵌套参数各用各的拼音：数的组成把「3 个百」「5 个一」拼进模板', () => {
    const segs = rubySegments(
      { k: 'q.num.compose2', p: { p1: { k: 'num.unit.h', p: { n: 3 } }, p2: { k: 'num.unit.o', p: { n: 5 } } } },
      'zh',
    )
    expect(segs.map((s) => s.text).join('')).toBe('3 个百和 5 个一组成的数是几？')
    expect(segs.filter((s) => s.py).map((s) => s.py)).toEqual(['gè', 'bǎi', 'hé', 'gè', 'yī', 'zǔ', 'chéng', 'de', 'shù', 'shì', 'jǐ'])
  })

  it('几时几分是算出来的文字，用单字兜底注音', () => {
    expect(rubySegments({ k: 'time.hm', p: { hour: 7, minute: 35 } }, 'zh')).toEqual([
      { text: '7' },
      { text: '时', py: 'shí' },
      { text: '35' },
      { text: '分', py: 'fēn' },
    ])
    expect(rubySegments({ k: 'clock.time', p: { hour: 3, minute: 30 } }, 'zh')).toEqual([
      { text: '3' },
      { text: '时', py: 'shí' },
      { text: '半', py: 'bàn' },
    ])
  })
})
