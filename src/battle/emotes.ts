/**
 * 表情 / 加油（需求 B58）：固定 4 个表情，没有文字，不认识字也能用；客户端、机器人、中继服务共用这一份表。
 * - 谁都能发：本机能操作的那个队（两人一台两队都行）、只观战的设备算观战方；
 * - 机器人会回应：收到表情约 1 秒后回一个，自己反超 / 被反超 / 赢了 / 输了各有一个；
 * - 多设备时服务器只认这 4 个 id、每连接 EMOTE_SERVER_GAP_MS 最多一条，转发给房间里其他人。
 */
import type { MatchEvent, Role } from './protocol'

export type EmoteId = 'cheer' | 'laugh' | 'wow' | 'cool'

export interface EmoteMeta {
  id: EmoteId
  emoji: string
}

export const EMOTES: readonly EmoteMeta[] = [
  { id: 'cheer', emoji: '🔥' },
  { id: 'laugh', emoji: '😆' },
  { id: 'wow', emoji: '😱' },
  { id: 'cool', emoji: '😎' },
]

/** 同一排（同一个发送方）两个表情之间至少隔多久 */
export const EMOTE_GAP_MS = 700
/** 服务器每连接的间隔（比客户端松一点，网络抖动时不误伤） */
export const EMOTE_SERVER_GAP_MS = 500
/** 飞过去的表情显示多久 */
export const EMOTE_MS = 1500
/** 机器人回应的延迟 */
export const BOT_REPLY_MS = 900

export function isEmoteId(v: unknown): v is EmoteId {
  return typeof v === 'string' && EMOTES.some((e) => e.id === v)
}

export function emojiOf(id: EmoteId): string {
  return EMOTES.find((e) => e.id === id)?.emoji ?? '❓'
}

/** 机器人收到某个表情后回的那个（B58）：加油回一个「厉害」、哈哈回哈哈、哇回厉害、厉害回加油 */
export function botReply(id: EmoteId): EmoteId {
  switch (id) {
    case 'cheer':
      return 'cool'
    case 'laugh':
      return 'laugh'
    case 'wow':
      return 'cool'
    case 'cool':
      return 'cheer'
  }
}

/**
 * 机器人（蓝队）对比赛事件的表情：自己反超 😎、被反超 😱；结束时赢了 😎、输了 🔥（给对方鼓掌）。
 * 别的事件不表态（得分太频繁，表情会刷屏）。
 */
export function botEventEmote(e: MatchEvent, botTeam: Role = 'blue'): EmoteId | null {
  if (e.type === 'lead') return e.team === botTeam ? 'cool' : 'wow'
  if (e.type === 'finished') return e.winner === botTeam ? 'cool' : 'cheer'
  return null
}
