import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import { SHELL_EN, SHELL_PINYIN, SHELL_ZH } from '@/locales/shell'
import { SKINS } from '../skins'
import { CHARACTERS, CHARACTER_IDS, CHARACTER_RATE, LINES_PER_CHARACTER, LINE_KEYS, characterOf, lineKey, pickLine } from '../lines'

describe('角色的台词（B71）', () => {
  it('每种游戏红蓝各有角色；每个角色 3 句中英 + 拼音都在；速率在 0.8–1.3；键表齐全', () => {
    for (const s of SKINS) {
      expect(CHARACTERS[s.id], s.id).toBeDefined()
      for (const team of ['red', 'blue'] as const) expect(CHARACTER_IDS).toContain(characterOf(s.id, team))
    }
    expect(LINE_KEYS).toHaveLength(CHARACTER_IDS.length * LINES_PER_CHARACTER)
    for (const c of CHARACTER_IDS) {
      expect(CHARACTER_RATE[c]).toBeGreaterThanOrEqual(0.8)
      expect(CHARACTER_RATE[c]).toBeLessThanOrEqual(1.3)
      for (let i = 1; i <= LINES_PER_CHARACTER; i++) {
        const k = lineKey(c, i)
        expect(SHELL_ZH[k], k).toBeTruthy()
        expect(SHELL_PINYIN[k], k).toBeTruthy()
        expect(SHELL_EN[k], k).toBeTruthy()
        expect(typeof SHELL_ZH[k]).toBe('string')
      }
    }
    expect(characterOf('race', 'red')).toBe('tortoise')
    expect(characterOf('race', 'blue')).toBe('hare')
    expect(characterOf('nope', 'red')).toBe('climber')
  })

  it('随机挑一句，不连续重复；不同角色速率不同', () => {
    const rng = createRng(7)
    let last: string | null = null
    for (let i = 0; i < 30; i++) {
      const p = pickLine('race', 'red', rng, last)
      expect(p.character).toBe('tortoise')
      expect(p.key).not.toBe(last)
      expect(p.key.startsWith('char.tortoise.')).toBe(true)
      last = p.key
    }
    expect(pickLine('race', 'red', rng).rate).toBeLessThan(pickLine('race', 'blue', rng).rate)
  })
})
