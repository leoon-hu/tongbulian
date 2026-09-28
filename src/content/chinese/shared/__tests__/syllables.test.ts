import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import { LETTER_SAY, VALID, addTone, splitSyllable, splitTone, syllableDistractors } from '../syllables'
import { spellParts } from '../makers'

describe('声调符号', () => {
  it('标调歌：有 a 标 a，没 a 找 o e，ou 标 o，i u 并列标在后', () => {
    expect(addTone('hao', 3)).toBe('hǎo')
    expect(addTone('gui', 4)).toBe('guì')
    expect(addTone('liu', 4)).toBe('liù')
    expect(addTone('lüe', 4)).toBe('lüè')
    expect(addTone('er', 2)).toBe('ér')
    expect(addTone('zhuo', 1)).toBe('zhuō')
    expect(addTone('kou', 3)).toBe('kǒu')
    expect(addTone('xiong', 2)).toBe('xióng')
    expect(addTone('ü', 3)).toBe('ǚ')
    expect(addTone('ma', 0)).toBe('ma')
  })

  it('每个合法音节的四个声调都能标上、再拆回原样', () => {
    for (const base of VALID) {
      for (const t of [1, 2, 3, 4] as const) {
        const py = addTone(base, t)
        expect(py).not.toBe(base)
        expect(splitTone(py)).toEqual({ base, tone: t })
      }
    }
  })

  it('拆声母：zh ch sh 先于 z c s，零声母没有声母', () => {
    expect(splitSyllable('zhuang')).toEqual({ initial: 'zh', final: 'uang' })
    expect(splitSyllable('zi')).toEqual({ initial: 'z', final: 'i' })
    expect(splitSyllable('ang')).toEqual({ initial: '', final: 'ang' })
    expect(splitSyllable('yi')).toEqual({ initial: 'y', final: 'i' })
  })
})

describe('拼读式', () => {
  it('两拼、三拼，j q x 与 ü 相拼写回 ü；y w 开头的不拆', () => {
    expect(spellParts('bā')).toEqual(['b', 'ā'])
    expect(spellParts('guā')).toEqual(['g', 'u', 'ā'])
    expect(spellParts('jiā')).toEqual(['j', 'i', 'ā'])
    expect(spellParts('jū')).toEqual(['j', 'ǖ'])
    expect(spellParts('xué')).toEqual(['x', 'üé'])
    expect(spellParts('juān')).toEqual(['j', 'ü', 'ān'])
    expect(spellParts('jūn')).toEqual(['j', 'ǖn'])
    expect(spellParts('yú')).toBeNull()
    expect(spellParts('wō')).toBeNull()
  })
})

describe('音节的干扰项', () => {
  it('都是合法音节、互不相同、不等于答案；限定了学过的就只换学过的', () => {
    const initials = new Set(['b', 'p', 'm', 'f', 'd', 't', 'n', 'l'])
    const finals = new Set(['a', 'o', 'e', 'i', 'u', 'ü'])
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed)
      for (const py of ['bā', 'pó', 'mǐ', 'fù', 'dǎ', 'tè', 'nǚ', 'lǜ']) {
        const ws = syllableDistractors(py, rng, { initials, finals })
        expect(ws.length).toBe(3)
        expect(new Set(ws).size).toBe(3)
        for (const w of ws) {
          expect(w).not.toBe(py)
          const { base } = splitTone(w)
          expect(VALID.has(base), `${py} → ${w}`).toBe(true)
          const { initial, final } = splitSyllable(base)
          const orig = splitSyllable(splitTone(py).base)
          if (initial !== orig.initial) expect(initials.has(initial)).toBe(true)
          if (final !== orig.final) expect(finals.has(final)).toBe(true)
        }
      }
    }
  })

  it('不限定时前后鼻音、平翘舌都会出现', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 100; seed++) for (const w of syllableDistractors('chuán', createRng(seed))) seen.add(w)
    expect(seen.has('chuáng')).toBe(true)
    expect(seen.has('cuán')).toBe(true)
  })
})

describe('字母的读法', () => {
  it('每个都是一个汉字（读音唯一的同音字）；a e ei eng ong 与 ün 没有', () => {
    for (const [l, say] of Object.entries(LETTER_SAY)) expect(say, l).toMatch(/^\p{Script=Han}$/u)
    for (const l of ['a', 'e', 'ei', 'eng', 'ong', 'ün', 'yun']) expect(LETTER_SAY[l]).toBeUndefined()
  })
})
