import { describe, expect, it } from 'vitest'
import '@/content/chinese/grade1'
import { dictKeys, isHan, pinyinOf, rubySegments, translate } from '@/engine/i18n'
import { lessonTexts } from '@/content/chinese/shared/makers'
import { LESSONS, pinyinReady, wordOf } from '../generators'
import { PINYIN } from '@/content/chinese/shared/prompts'
import { PY } from '../py'

/** 带调的音节（轻声不标调）；儿化的「儿」标 r（雨点儿 yǔ diǎn r） */
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

/** 某个字在一条拼音里读什么（按汉字的位置取） */
function readingIn(key: string, at: number): string | undefined {
  return PY[key]?.split(' ')[hans(key.slice(0, at)).length]
}

describe('题目要求（shared/prompts.ts）与知识点标题（titles.ts）的拼音', () => {
  const keys = dictKeys('zh').filter((k) => /^(yq\.|kp\.c1s)/.test(k))

  it('每个题目要求、每个有汉字的知识点标题都有拼音，且与汉字逐个对齐', () => {
    expect(keys.filter((k) => k.startsWith('yq.')).length).toBeGreaterThan(35)
    const bad: string[] = []
    for (const key of keys) {
      const text = translate({ k: key }, 'zh')
      // 拼音课的标题（「b p m f」）没有汉字，不注音
      if (!hans(text).length) expect(pinyinOf(key), key).toBeUndefined()
      else if (misaligned(text, pinyinOf(key))) bad.push(`${key}：${misaligned(text, pinyinOf(key))}`)
    }
    expect(bad).toEqual([])
  })

  it('题目要求的拼音表里没有多余的键', () => {
    const known = new Set(dictKeys('zh'))
    for (const key of Object.keys(PINYIN)) expect(known.has(key), `${key} 在字典里不存在`).toBe(true)
  })
})

describe('课文与字词的拼音表（py.ts）', () => {
  const needed = new Set(LESSONS.flatMap((spec) => lessonTexts(spec, pinyinReady(spec.kp))))

  it('每课要用到的中文都在表里，且与汉字逐个对齐', () => {
    expect(needed.size).toBeGreaterThan(1500)
    expect([...needed].map((t) => misaligned(t, PY[t])).filter(Boolean)).toEqual([])
  })

  it('表里没有用不到的条目（材料删了拼音也要删）', () => {
    const unused = Object.keys(PY).filter((k) => !needed.has(k))
    expect(unused).toEqual([])
  })

  it('句子里同一个字按上下文注音：变调、轻声、儿化', () => {
    const everyWhere = (re: RegExp, reading: string): void => {
      const hits = Object.keys(PY).flatMap((k) => [...k.matchAll(re)].map((m) => [k, m.index] as const))
      expect(hits.length, `${re}`).toBeGreaterThan(0)
      for (const [k, at] of hits) expect(readingIn(k, at), `「${k}」里的 ${re}`).toBe(reading)
    }
    // 一 / 不 在四声前读二声，一在一二三声前读四声
    everyWhere(/一(?=个)/g, 'yí')
    everyWhere(/一(?=天)/g, 'yì')
    everyWhere(/不(?=是|会|要|见|怕)/g, 'bú')
    everyWhere(/不(?=能|同|行|知)/g, 'bù')
    // 单念的「一」是一声
    expect(PY['一']).toBe('yī')
    // 轻声词
    expect(PY['朋友']).toBe('péng you')
    everyWhere(/(?<=妈)妈/g, 'ma')
    // 儿化
    expect(Object.values(PY).some((v) => v.split(' ').includes('r'))).toBe(true)
  })
})

describe('注音（需求 Y3 / F12）', () => {
  it('要注音的中文（yw.*）逐字注音；考认字的纯字符串一个音也不注', () => {
    expect(rubySegments(wordOf('朋友'), 'zh')).toEqual([
      { text: '朋', py: 'péng' },
      { text: '友', py: 'you' },
    ])
    expect(rubySegments('朋友', 'zh')).toEqual([{ text: '朋友' }])
    expect(rubySegments('日', 'zh')).toEqual([{ text: '日' }])
  })

  it('英文界面：题目要求是英文、不注音；中文内容照原样显示', () => {
    expect(translate({ k: 'yq.listenZi' }, 'en')).toBe('Listen. Which character did you hear?')
    expect(rubySegments({ k: 'yq.listenZi' }, 'en')).toEqual([{ text: 'Listen. Which character did you hear?' }])
    expect(translate(wordOf('朋友'), 'en')).toBe('朋友')
  })
})
