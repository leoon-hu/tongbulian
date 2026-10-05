import { describe, expect, it } from 'vitest'
import '@/content/chinese/grade3'
import { dictKeys, isHan, pinyinOf, rubySegments, translate } from '@/engine/i18n'
import { lessonTexts, parseZi } from '@/content/chinese/shared/makers'
import { LESSONS, wordOf } from '../generators'
import { TITLE_PINYIN } from '../titles'
import { PY } from '../py'

/** 带调的音节（轻声不标调）；儿化的「儿」标 r */
const SYLLABLE = /^[a-zü]*[āáǎàaēéěèeīíǐìiōóǒòoūúǔùuǖǘǚǜü][a-zü]*$/

const hans = (text: string): string[] => [...text].filter(isHan)

/** 拼音与汉字逐个对齐：音节数 = 汉字数，每个音节像拼音，r 只配「儿」；对不上返回问题描述 */
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

describe('知识点标题的拼音（titles.ts）', () => {
  it('每个知识点标题都有拼音，且与汉字逐个对齐；表里没有多余的键', () => {
    const keys = dictKeys('zh').filter((k) => k.startsWith('kp.c3s'))
    expect(keys).toHaveLength(67)
    expect(keys.map((k) => misaligned(translate({ k }, 'zh'), pinyinOf(k))).filter(Boolean)).toEqual([])
    for (const k of Object.keys(TITLE_PINYIN)) expect(keys, k).toContain(k)
  })
})

/** 每课要查拼音表的中文 */
const NEEDED = new Set(LESSONS.flatMap((spec) => lessonTexts(spec)))

describe('课文与字词的拼音表（py.ts）', () => {
  it('每课要用到的中文都在表里，且与汉字逐个对齐', () => {
    expect(NEEDED.size).toBeGreaterThan(1000)
    expect([...NEEDED].map((t) => misaligned(t, PY[t])).filter(Boolean)).toEqual([])
  })

  it('表里没有用不到的条目（材料删了拼音也要删）', () => {
    expect(Object.keys(PY).filter((k) => !NEEDED.has(k))).toEqual([])
  })
})

describe('注音（需求 Y3 / F12）', () => {
  it('要注音的中文（yw3.*）逐字注音；考认字的纯字符串一个音也不注', () => {
    const word = [...NEEDED].find((t) => hans(t).length === 2 && PY[t])!
    const segs = rubySegments(wordOf(word), 'zh')
    expect(segs.map((s) => s.py)).toEqual(PY[word]!.split(' '))
    expect(rubySegments(word, 'zh')).toEqual([{ text: word }])
  })
})

describe('生字在本课里的读音（Y10）', () => {
  /** 课本印棕色拼音的词：这个字在词里读轻声（识字表是本音），句子照读轻声 */
  const BROWN = ['喇叭', '委屈', '莲蓬', '咳嗽', '唠叨']

  it('本课的句子、问题、词语里，生字的读音与识字表一致（课文生字上印的就是这个音）', () => {
    const bad: string[] = []
    for (const spec of LESSONS) {
      const { chars, reading } = parseZi(spec.zi)
      const texts = lessonTexts(spec).filter((t) => hans(t).length > 1)
      for (const c of chars) {
        const want = reading[c] ?? PY[c]!
        for (const t of texts) {
          const cs = hans(t)
          const syl = PY[t]!.split(' ')
          cs.forEach((x, i) => {
            if (x !== c || syl[i] === want || BROWN.includes(`${cs[i - 1]}${x}`)) return
            bad.push(`${spec.kp}「${t}」的「${c}」注 ${syl[i]}，识字表是 ${want}`)
          })
        }
      }
    }
    expect(bad).toEqual([])
  })
})
