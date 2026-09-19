import { describe, expect, it } from 'vitest'
import '@/content/math/grade1'
import { createRng } from '@/engine'
import { stubCanvas, stubCtx } from '../game/__tests__/stub'
import type { Phase, Team } from '../protocol'
import { AUTO_SKIN, RANDOM_SKIN, SKINS, chapterSkin, ratio, resolveSkin, skinById } from '../skins'
import { getCourse } from '@/engine/catalog'

describe('皮肤注册表（B34–B36）', () => {
  it('每种皮肤有 id / 图标 / 位置 / 类别，id 唯一；random 与不认识的 id 都落到真实皮肤', () => {
    expect(SKINS.length).toBeGreaterThanOrEqual(5)
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length)
    for (const s of SKINS) {
      expect(['top', 'center']).toContain(s.slot)
      expect(['race', 'tug', 'consume', 'grow']).toContain(s.kind)
      expect(s.icon.length).toBeGreaterThan(0)
    }
    expect(skinById('tug')?.slot).toBe('top')
    expect(SKINS.map((s) => s.id)).toContain(resolveSkin(RANDOM_SKIN, createRng(1)))
    expect(SKINS.map((s) => s.id)).toContain(resolveSkin('bogus', createRng(1)))
    expect(resolveSkin('ice', createRng(1))).toBe('ice')
    expect(ratio(3, 8)).toBe(3 / 8)
    expect(ratio(12, 8)).toBe(1)
  })

  for (const meta of SKINS) {
    it(`${meta.id}：加载器出一个游戏模块，0…8 × 0…8 每个比分喂进去都不抛错，含胜利状态`, async () => {
      const factory = await meta.game()
      const mod = factory()
      expect(mod.meta.id).toBe(meta.id)
      mod.mount({ canvas: stubCanvas(stubCtx()), width: meta.slot === 'top' ? 1000 : 150, height: meta.slot === 'top' ? 120 : 700, dpr: 1, compact: false, reducedMotion: false })
      for (let red = 0; red <= 8; red++) {
        for (let blue = 0; blue <= 8; blue++) {
          const winner: Team | null = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
          const phase: Phase = winner ? 'ended' : 'playing'
          mod.setState({ red, blue, target: 8, phase, winner, lastPoint: red > blue ? 'red' : blue > 0 ? 'blue' : null })
          if (winner) mod.onEvent({ type: 'finished', winner })
          for (let i = 0; i < 3; i++) mod.tick(1 / 60)
        }
      }
      mod.destroy()
    })
  }
})

describe('按章节的游戏（B36）', () => {
  it('每册的知识点按目录顺序轮流对应一个游戏，排完从头再排，下一册重新排起；resolveSkin 认 auto', () => {
    const games = SKINS.map((s) => s.id)
    const course = getCourse('math', 'g1')!
    const sem = (kp: { unitId: string }) => course.units.find((u) => u.id === kp.unitId)!.semester
    const first = course.knowledgePoints.filter((kp) => sem(kp) === 1)
    const second = course.knowledgePoints.filter((kp) => sem(kp) === 2)
    expect(first.length).toBeGreaterThan(games.length)
    first.forEach((kp, i) => expect(chapterSkin(kp.id)).toBe(games[i % games.length]))
    second.forEach((kp, i) => expect(chapterSkin(kp.id)).toBe(games[i % games.length]))
    expect(chapterSkin(first[0]!.id)).toBe(games[0])
    expect(chapterSkin('nope')).toBe(games[0])
    expect(resolveSkin(AUTO_SKIN, createRng(1), first[1]!.id)).toBe(games[1])
    expect(games).toContain(resolveSkin(AUTO_SKIN, createRng(1)))
  })
})
