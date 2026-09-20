import { describe, expect, it } from 'vitest'
import { SKINS } from '@/battle/skins'
import { HELP_LEAD, HELP_TITLE, helpGames, helpSections } from '../content'

describe('帮助页内容（F17）', () => {
  it('中英文各五节，顺序固定（对战在前）；每节都有内容；学习内容一节把上线的知识点数写进去', () => {
    for (const lang of ['zh', 'en'] as const) {
      const secs = helpSections(lang)
      expect(secs.map((s) => s.id)).toEqual(['play', 'rules', 'tips', 'learn', 'faq'])
      for (const s of secs) {
        expect(s.title.length).toBeGreaterThan(1)
        expect(s.blocks.length).toBeGreaterThan(0)
      }
      expect(HELP_TITLE[lang].length).toBeGreaterThan(1)
      expect(HELP_LEAD[lang].length).toBeGreaterThan(10)
    }
    const learn = helpSections('zh').find((s) => s.id === 'learn')!
    const first = learn.blocks[0]!
    expect(first.kind).toBe('p')
    if (first.kind === 'p') expect(first.text).toContain('一年级数学 26 个知识点')
  })

  it('规则一节列出每种游戏的名字和开场规则句；常见问题至少 8 条，问答都不为空', () => {
    for (const lang of ['zh', 'en'] as const) {
      const games = helpGames(lang)
      expect(games.map((g) => g.id)).toEqual(SKINS.map((s) => s.id))
      for (const g of games) {
        expect(g.name.length).toBeGreaterThan(0)
        expect(g.rule.length).toBeGreaterThan(10)
        expect(g.finish.length).toBeGreaterThan(2)
      }
      const rules = helpSections(lang).find((s) => s.id === 'rules')!
      expect(rules.blocks.some((b) => b.kind === 'games')).toBe(true)
      const faq = helpSections(lang).find((s) => s.id === 'faq')!.blocks[0]!
      expect(faq.kind).toBe('faq')
      if (faq.kind === 'faq') {
        expect(faq.items.length).toBeGreaterThanOrEqual(8)
        for (const i of faq.items) {
          expect(i.q.length).toBeGreaterThan(2)
          expect(i.a.length).toBeGreaterThan(5)
        }
      }
    }
  })
})
