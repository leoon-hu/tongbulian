import { describe, expect, it } from 'vitest'
import { AVATARS, AVATAR_IDS, AVATAR_NAMES, avatarEmoji, avatarNameLang, isAvatarId, pickIdentity, teamAvatars, teamKinds, type AvatarId } from '../avatars'
import { SHELL_EN, SHELL_ZH } from '@/locales/shell'
import { stubCtx } from '../game/__tests__/stub'
import { drawCritter } from '../game/sprites/scenery'

const ORDER: AvatarId[] = ['rabbit', 'cat', 'bear', 'pig', 'panda', 'monkey']

describe('我的小动物（B66）', () => {
  it('6 种，id 与 emoji 都不重复；isAvatarId 只认这 6 种', () => {
    expect(AVATARS).toHaveLength(6)
    expect(new Set(AVATAR_IDS).size).toBe(6)
    expect(new Set(AVATARS.map((a) => a.emoji)).size).toBe(6)
    expect(isAvatarId('dog')).toBe(false)
    expect(isAvatarId(1)).toBe(false)
    expect(avatarEmoji('rabbit')).toBe('🐰')
    expect(avatarEmoji(undefined)).toBe('')
    expect(avatarEmoji(null)).toBe('')
  })

  it('小动物的名字与词条 avatar.<id> 一样（中英），名字认得出是哪种语言', () => {
    for (const id of AVATAR_IDS) {
      expect(AVATAR_NAMES.zh[id]).toBe(SHELL_ZH[`avatar.${id}`])
      expect(AVATAR_NAMES.en[id]).toBe(SHELL_EN[`avatar.${id}`])
    }
    expect(new Set(Object.values(AVATAR_NAMES.zh)).size).toBe(6)
    expect(avatarNameLang('小兔')).toBe('zh')
    expect(avatarNameLang('Rabbit')).toBe('en')
    expect(avatarNameLang('阿狐')).toBeUndefined()
  })

  it('名字与小动物（B17）：没自定义的按顺序挑第一只不撞的、名字就叫它；自定义的优先、撞了也不改', () => {
    expect(pickIdentity({ name: '', avatar: null }, ORDER, 'zh', [])).toEqual({ name: '小兔', avatar: 'rabbit' })
    expect(pickIdentity({ name: '', avatar: null }, ORDER, 'en', [])).toEqual({ name: 'Rabbit', avatar: 'rabbit' })
    // 避开别人的小动物，也避开别人（自定义）用了的小动物名字
    expect(pickIdentity({ name: '', avatar: null }, ORDER, 'zh', [{ name: '小兔', avatar: 'rabbit' }])).toEqual({ name: '小猫', avatar: 'cat' })
    expect(pickIdentity({ name: '', avatar: null }, ORDER, 'zh', [{ name: '小兔', avatar: 'panda' }])).toEqual({ name: '小猫', avatar: 'cat' })
    // 自定义的名字：只避开小动物
    expect(pickIdentity({ name: '阿狐', avatar: null }, ORDER, 'zh', [{ name: '小兔', avatar: 'rabbit' }])).toEqual({ name: '阿狐', avatar: 'cat' })
    // 自定义的小动物：直接用，名字跟着它；它的名字被别人用了就换一个没人用的
    expect(pickIdentity({ name: '', avatar: 'rabbit' }, ORDER, 'zh', [{ name: '小熊', avatar: 'rabbit' }])).toEqual({ name: '小兔', avatar: 'rabbit' })
    expect(pickIdentity({ name: '', avatar: 'rabbit' }, ORDER, 'zh', [{ name: '小兔', avatar: 'cat' }])).toEqual({ name: '小猫', avatar: 'rabbit' })
    // 都自定义了：一样也不改
    expect(pickIdentity({ name: '小兔', avatar: 'rabbit' }, ORDER, 'zh', [{ name: '小兔', avatar: 'rabbit' }])).toEqual({ name: '小兔', avatar: 'rabbit' })
    // 6 只都被用了：用顺序里的第一只
    const all = AVATAR_IDS.map((a) => ({ name: AVATAR_NAMES.zh[a], avatar: a }))
    expect(pickIdentity({ name: '', avatar: null }, ORDER, 'zh', all).avatar).toBe('rabbit')
  })

  it('游戏里两队的小动物：选了的用选了的，没有的用游戏默认但不跟另一队撞', () => {
    expect(teamKinds(undefined, ['bear', 'pig'])).toEqual(['bear', 'pig'])
    expect(teamKinds({ red: 'cat' }, ['bear', 'pig'])).toEqual(['cat', 'pig'])
    expect(teamKinds({ red: 'pig' }, ['bear', 'pig'])).toEqual(['pig', 'bear']) // 打机器人：我随机到的正好是机器人那队的默认
    expect(teamKinds({ blue: 'bear' }, ['bear', 'pig'])).toEqual(['pig', 'bear'])
    expect(teamKinds({ red: 'cat', blue: 'cat' }, ['bear', 'pig'])).toEqual(['cat', 'cat']) // 都是自己选的：不改
    for (const red of AVATAR_IDS) {
      const [r, b] = teamKinds({ red }, ['monkey', 'panda'])
      expect(r).toBe(red)
      expect(b).not.toBe(red)
    }
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
