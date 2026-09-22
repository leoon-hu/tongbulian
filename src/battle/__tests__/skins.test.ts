import { describe, expect, it } from 'vitest'
import '@/content/math/grade1'
import '@/content/math/grade2'
import { createRng } from '@/engine'
import { stubCanvas, stubCtx } from '../game/__tests__/stub'
import type { Phase, Team } from '../protocol'
import { RANDOM_SKIN, SKINS, chapterSkin, ratio, resolveSkin, skinById } from '../skins'
import { chapterIndex, getCourse, nextKp, volumeKps } from '@/engine/catalog'

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
  it('一个年级的知识点按目录顺序轮流对应一个游戏：上册从第一个游戏排起，下册接着上册排到的下一个继续轮，排完从头再排；换年级从头排', () => {
    const games = SKINS.map((s) => s.id)
    const course = getCourse('math', 'g1')!
    const sem = (kp: { unitId: string }) => course.units.find((u) => u.id === kp.unitId)!.semester
    const first = course.knowledgePoints.filter((kp) => sem(kp) === 1)
    const second = course.knowledgePoints.filter((kp) => sem(kp) === 2)
    expect(first.length).toBeGreaterThan(0)
    expect(second.length).toBeGreaterThan(0)
    first.forEach((kp, i) => expect(chapterIndex(kp.id)).toBe(i))
    second.forEach((kp, i) => expect(chapterIndex(kp.id)).toBe(first.length + i))
    first.forEach((kp, i) => expect(chapterSkin(kp.id)).toBe(games[i % games.length]))
    second.forEach((kp, i) => expect(chapterSkin(kp.id)).toBe(games[(first.length + i) % games.length]))
    expect(chapterSkin(first[0]!.id)).toBe(games[0])
    expect(chapterSkin(second[0]!.id)).toBe(games[first.length % games.length])
    // 一年级 26 个知识点比 21 种游戏多：一个年级打下来每种游戏都排得到
    const used = new Set([...first, ...second].map((kp) => chapterSkin(kp.id)))
    expect(used.size).toBe(Math.min(games.length, first.length + second.length))
    // 二年级重新从第一个游戏排起
    const g2 = getCourse('math', 'g2')!
    expect(chapterIndex(g2.knowledgePoints[0]!.id)).toBe(0)
    expect(chapterSkin(g2.knowledgePoints[0]!.id)).toBe(games[0])
    expect(chapterIndex('nope')).toBe(-1)
    expect(chapterSkin('nope')).toBe(games[0])
  })

  it('nextKp：本册目录里的下一个知识点，最后一个 / 不在目录里 → null（结果页「下一章」用）；volumeKps 是那一册的清单', () => {
    const course = getCourse('math', 'g1')!
    const sem = (kp: { unitId: string }) => course.units.find((u) => u.id === kp.unitId)!.semester
    const first = course.knowledgePoints.filter((kp) => sem(kp) === 1)
    const second = course.knowledgePoints.filter((kp) => sem(kp) === 2)
    expect(volumeKps(first[0]!.id).map((kp) => kp.id)).toEqual(first.map((kp) => kp.id))
    expect(volumeKps(second[0]!.id).map((kp) => kp.id)).toEqual(second.map((kp) => kp.id))
    first.forEach((kp, i) => expect(nextKp(kp.id)).toBe(first[i + 1]?.id ?? null))
    second.forEach((kp, i) => expect(nextKp(kp.id)).toBe(second[i + 1]?.id ?? null))
    expect(nextKp(first[first.length - 1]!.id)).toBeNull() // 上册最后一个不接到下册
    expect(nextKp('nope')).toBeNull()
    expect(volumeKps('nope')).toEqual([])
  })
})
