import { describe, expect, it } from 'vitest'
import { SKINS } from '../skins'
import { PAN_AMOUNT, calloutSfx, panOf, skinSfx } from '../sfx'

describe('音效表（B38 / B70）', () => {
  it('每种皮肤都有得分 / 连对 / 胜利 / 答错四组；答错默认「咚」，火车 / 赛车刹车、热气球 / 吹泡泡漏气、火箭哑火', () => {
    for (const s of SKINS) {
      const sounds = skinSfx(s.id, s.kind)
      for (const k of ['score', 'streak', 'win', 'wrong'] as const) expect(sounds[k].length, `${s.id}.${k}`).toBeGreaterThan(0)
    }
    expect(skinSfx('race', 'race').wrong).toEqual(['dong'])
    expect(skinSfx('train', 'race').wrong).toEqual(['brake'])
    expect(skinSfx('car', 'race').wrong).toEqual(['brake'])
    expect(skinSfx('balloon', 'race').wrong).toEqual(['hiss'])
    expect(skinSfx('bubble', 'grow').wrong).toEqual(['hiss'])
    expect(skinSfx('rocket', 'race').wrong).toEqual(['fizzle'])
    expect(skinSfx('nope', 'tug').wrong).toEqual(['dong'])
  })

  it('得分音的左右：红队偏左、蓝队偏右、没有队居中；弹出提示的声音', () => {
    expect(panOf('red')).toBe(-PAN_AMOUNT)
    expect(panOf('blue')).toBe(PAN_AMOUNT)
    expect(panOf(null)).toBe(0)
    expect(calloutSfx('lead')).toBe('sting')
    expect(calloutSfx('nearWin')).toBe('alert')
    expect(calloutSfx('deuce')).toBe('heartbeat')
    expect(calloutSfx('streak')).toBe('pop')
  })
})
