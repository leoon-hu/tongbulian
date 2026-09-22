import { describe, expect, it } from 'vitest'
import { BOT_REPLY_MS, EMOTES, EMOTE_GAP_MS, EMOTE_MS, EMOTE_SERVER_GAP_MS, botEventEmote, botReply, emojiOf, isEmoteId } from '../emotes'

describe('表情 / 加油（B58）', () => {
  it('固定 4 个表情，id 唯一、各有 emoji；isEmoteId 只认这 4 个', () => {
    expect(EMOTES.map((e) => e.id)).toEqual(['cheer', 'laugh', 'wow', 'cool'])
    expect(new Set(EMOTES.map((e) => e.emoji)).size).toBe(4)
    for (const e of EMOTES) expect(isEmoteId(e.id)).toBe(true)
    expect(isEmoteId('nope')).toBe(false)
    expect(isEmoteId(3)).toBe(false)
    expect(emojiOf('cheer')).toBe('🔥')
    expect(emojiOf('nope' as never)).toBe('❓')
  })

  it('机器人的回应都是合法表情：加油回厉害、哈哈回哈哈、哇回厉害、厉害回加油；反超 / 结束各有表情，别的事件不表态', () => {
    for (const e of EMOTES) expect(isEmoteId(botReply(e.id))).toBe(true)
    expect(botReply('cheer')).toBe('cool')
    expect(botReply('laugh')).toBe('laugh')
    expect(botReply('cool')).toBe('cheer')
    expect(botEventEmote({ type: 'lead', team: 'blue' })).toBe('cool')
    expect(botEventEmote({ type: 'lead', team: 'red' })).toBe('wow')
    expect(botEventEmote({ type: 'finished', winner: 'blue' })).toBe('cool')
    expect(botEventEmote({ type: 'finished', winner: 'red' })).toBe('cheer')
    expect(botEventEmote({ type: 'point', team: 'red', playerId: 'a', streak: 1 })).toBeNull()
    expect(botEventEmote({ type: 'streak', team: 'red', playerId: 'a', n: 3 })).toBeNull()
    expect(botEventEmote({ type: 'lead', team: 'red' }, 'red')).toBe('cool')
  })

  it('节奏常数：客户端一排 0.7 秒一个，服务器每连接 0.5 秒一个（比客户端松），飞 1.5 秒，机器人 0.9 秒后回', () => {
    expect(EMOTE_GAP_MS).toBe(700)
    expect(EMOTE_SERVER_GAP_MS).toBeLessThan(EMOTE_GAP_MS)
    expect(EMOTE_MS).toBe(1500)
    expect(BOT_REPLY_MS).toBeLessThan(EMOTE_MS)
  })
})
