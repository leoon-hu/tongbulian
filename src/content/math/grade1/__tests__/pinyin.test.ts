import { describe, expect, it } from 'vitest'
import '@/content/math/grade1'
import { dictKeys, isHan, pinyinOf, rubySegments, translate } from '@/engine/i18n'
import { PINYIN } from '../pinyin'

/** 需要注音的词条前缀：孩子在练习页会看到的题干 / 选项 / 教具文案 / 知识点标题，以及外壳的练习、结算词条。 */
const NEEDS_PINYIN = /^(q|opt|dir|side|rel|cat|shape|lineup|tf|kp|practice|summary|battle|skin|room)\./

const SYLLABLE = /^[a-zü]*[āáǎàaēéěèeīíǐìiōóǒòoūúǔùuǖǘǚǜü][a-zü]*$/

function hanCount(text: string): number {
  return [...text].filter(isHan).length
}

describe('拼音表', () => {
  const zhKeys = dictKeys('zh').filter((k) => NEEDS_PINYIN.test(k))

  it('每个需要注音的中文词条都有拼音，且音节数等于汉字数', () => {
    expect(zhKeys.length).toBeGreaterThan(80)
    for (const key of zhKeys) {
      // 不带参数解析：占位符变成空串，模板里的汉字原样保留
      const text = translate({ k: key }, 'zh')
      const py = pinyinOf(key)
      expect(py, `${key} 缺拼音`).toBeDefined()
      const syllables = py!.split(/\s+/)
      expect(syllables.length, `${key}「${text}」拼音音节数 ${syllables.length} ≠ 汉字数 ${hanCount(text)}`).toBe(hanCount(text))
      for (const s of syllables) expect(s, `${key} 的音节「${s}」不像拼音`).toMatch(SYLLABLE)
    }
  })

  it('拼音表里没有多余的键（词条删了拼音也要删）', () => {
    const known = new Set(dictKeys('zh'))
    for (const key of Object.keys(PINYIN)) expect(known.has(key), `${key} 在字典里不存在`).toBe(true)
  })
})

describe('rubySegments', () => {
  it('模板汉字逐字注音，数字参数原样，LStr 参数各用各的拼音', () => {
    const segs = rubySegments({ k: 'q.countShape', p: { shape: { k: 'shape.cube' } } }, 'zh')
    expect(segs).toEqual([
      { text: '数', py: 'shǔ' },
      { text: '一', py: 'yi' },
      { text: '数', py: 'shǔ' },
      { text: '，' },
      { text: '有', py: 'yǒu' },
      { text: '几', py: 'jǐ' },
      { text: '个', py: 'gè' },
      { text: '正', py: 'zhèng' },
      { text: '方', py: 'fāng' },
      { text: '体', py: 'tǐ' },
      { text: '？' },
    ])
    const num = rubySegments({ k: 'q.decompose', p: { total: 13, part: 8 } }, 'zh')
    expect(num.map((s) => s.text).join('')).toBe('13 可以分成 8 和几？')
    expect(num.filter((s) => s.py).map((s) => s.py)).toEqual(['kě', 'yǐ', 'fēn', 'chéng', 'hé', 'jǐ'])
  })

  it('按数值算出来的金额用单字兜底注音', () => {
    expect(rubySegments({ k: 'money.amount', p: { fen: 650 } }, 'zh')).toEqual([
      { text: '6' },
      { text: '元', py: 'yuán' },
      { text: '5' },
      { text: '角', py: 'jiǎo' },
    ])
  })

  it('字面量与英文模式不注音', () => {
    expect(rubySegments('9 + 5 = ?', 'zh')).toEqual([{ text: '9 + 5 = ?' }])
    expect(rubySegments({ k: 'q.whatShape' }, 'en')).toEqual([{ text: 'What shape is this?' }])
  })
})
