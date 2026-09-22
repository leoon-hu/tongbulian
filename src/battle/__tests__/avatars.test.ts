import { describe, expect, it } from 'vitest'
import { AVATARS, DEFAULT_AVATARS, avatarEmoji, isAvatarId, teamAvatars } from '../avatars'
import { stubCtx } from '../game/__tests__/stub'
import { drawCritter } from '../game/sprites/scenery'

describe('我的小动物（B66）', () => {
  it('6 种，id 与 emoji 都不重复；默认我是小熊、右边是小猪；isAvatarId 只认这 6 种', () => {
    expect(AVATARS).toHaveLength(6)
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(6)
    expect(new Set(AVATARS.map((a) => a.emoji)).size).toBe(6)
    expect(isAvatarId(DEFAULT_AVATARS.me)).toBe(true)
    expect(isAvatarId(DEFAULT_AVATARS.right)).toBe(true)
    expect(DEFAULT_AVATARS.me).not.toBe(DEFAULT_AVATARS.right)
    expect(isAvatarId('dog')).toBe(false)
    expect(isAvatarId(1)).toBe(false)
    expect(avatarEmoji('rabbit')).toBe('🐰')
    expect(avatarEmoji(undefined)).toBe('')
    expect(avatarEmoji(null)).toBe('')
  })

  it('两队各自的小动物：每队第一个选了的真人的；机器人 / 没选的不算', () => {
    expect(
      teamAvatars([
        { team: 'red', kind: 'human' },
        { team: 'red', kind: 'human', avatar: 'cat' },
        { team: 'red', kind: 'human', avatar: 'pig' },
        { team: 'blue', kind: 'ai', avatar: 'panda' },
      ]),
    ).toEqual({ red: 'cat' })
    expect(teamAvatars([{ team: 'blue', kind: 'human', avatar: 'monkey' }])).toEqual({ blue: 'monkey' })
    expect(teamAvatars([])).toEqual({})
  })

  it('六种小动物都画得出来（假 ctx 不抛错，小兔 / 小猫的耳朵是另画的）', () => {
    for (const a of AVATARS) {
      const ctx = stubCtx()
      drawCritter(ctx, 10, 10, 30, a.id, 0, 0.5)
      expect(ctx.calls.length).toBeGreaterThan(10)
    }
  })
})
