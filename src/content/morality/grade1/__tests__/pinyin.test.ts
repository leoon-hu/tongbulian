import { describe, expect, it } from 'vitest'
import '@/content/morality/grade1'
import { dictKeys, isHan, pinyinOf, translate } from '@/engine/i18n'
import { lessonTexts } from '@/content/morality/shared/makers'
import { LESSONS } from '../generators'
import { PY } from '../py'
import { TITLE_PINYIN } from '../titles'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'

/** 带调的音节（轻声不标调）；儿化的「儿」标 r（小点儿声 xiǎo diǎn r shēng） */
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

describe('一年级道德与法治：题目要求与标题的拼音', () => {
  it('题目要求（dq.*）都有拼音，且与汉字逐个对齐', () => {
    const keys = dictKeys('zh').filter((k) => k.startsWith('dq.'))
    expect(keys.length).toBeGreaterThanOrEqual(6)
    expect(keys.map((k) => misaligned(translate({ k }, 'zh'), pinyinOf(k))).filter(Boolean)).toEqual([])
  })

  it('知识点与单元标题都有拼音，且与汉字逐个对齐；没有多余的键', () => {
    const titles = [...KNOWLEDGE_POINTS.map((kp) => [`kp.${kp.id}`, kp.title]), ...UNITS.map((u) => [`unit.${u.id}`, u.title])]
    expect(titles.map(([k, t]) => misaligned(t!, TITLE_PINYIN[k!])).filter(Boolean)).toEqual([])
    expect(Object.keys(TITLE_PINYIN).sort()).toEqual(titles.map(([k]) => k!).sort())
  })
})

describe('一年级道德与法治：拼音表（py.ts）', () => {
  const needed = new Set(LESSONS.flatMap((spec) => lessonTexts(spec)))

  it('每课要用到的中文都在表里，且与汉字逐个对齐', () => {
    expect(needed.size).toBeGreaterThan(500)
    expect([...needed].map((t) => misaligned(t, PY[t])).filter(Boolean)).toEqual([])
  })

  it('表里没有用不到的条目（材料删了拼音也要删）', () => {
    expect(Object.keys(PY).filter((k) => !needed.has(k))).toEqual([])
  })

  it('一 / 不 标变调（看一看的「一」读轻声）', () => {
    const bad: string[] = []
    for (const [text, py] of Object.entries(PY)) {
      const cs = hans(text)
      const ss = py.split(' ')
      cs.forEach((c, i) => {
        const next = ss[i + 1]
        // 「不」在四声前读 bú
        if (c === '不' && next && /[àèìòùǜ]/.test(next) && ss[i] !== 'bú') bad.push(`${text}：不 → bú`)
        // 「看一看」「等一等」里的「一」读轻声 yi（「一个一个」不算）；别处在四声前读 yí（作序数、单念的这里不出现）
        if (c === '一' && cs[i - 1] === cs[i + 1] && cs[i - 2] !== '一') {
          if (ss[i] !== 'yi') bad.push(`${text}：一 → yi`)
        } else if (c === '一' && next && /[àèìòùǜ]/.test(next) && ss[i] !== 'yí' && cs[i - 1] !== '第' && cs[i - 1] !== '十') bad.push(`${text}：一 → yí`)
      })
    }
    expect(bad).toEqual([])
  })
})
