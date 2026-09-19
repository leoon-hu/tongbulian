// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRng } from '@/engine'
import type { Phase, Team } from '../protocol'
import { RANDOM_SKIN, SKINS, ratio, resolveSkin, skinById } from '../skins'

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
    it(`${meta.id}：0…8 × 0…8 每个比分都能渲染，含胜利状态`, async () => {
      const C = await meta.load()
      for (let red = 0; red <= 8; red++) {
        for (let blue = 0; blue <= 8; blue++) {
          const winner: Team | null = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
          const phase: Phase = winner ? 'ended' : 'playing'
          const w = mount(C, {
            props: { red, blue, target: 8, phase, winner, lastPoint: red > blue ? 'red' : blue > 0 ? 'blue' : null },
          })
          expect(w.html().length).toBeGreaterThan(20)
          w.unmount()
        }
      }
    })
  }
})
