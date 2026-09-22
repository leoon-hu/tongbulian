/**
 * 我的小动物（需求 B66）：进对战前选一只自己的小动物——名字旁、结果页带它，有司机 / 乘客的游戏里它露脸（赛车、开火车、热气球）。
 * 6 种与 game/sprites/scenery.ts 的 drawCritter 一一对应（CritterKind 就是 AvatarId）；本地记在偏好里，多设备时随 hello 发给服务器进快照。
 */
import type { Team } from './protocol'

export type AvatarId = 'bear' | 'pig' | 'panda' | 'monkey' | 'rabbit' | 'cat'

export interface AvatarMeta {
  id: AvatarId
  emoji: string
}

export const AVATARS: readonly AvatarMeta[] = [
  { id: 'bear', emoji: '🐻' },
  { id: 'pig', emoji: '🐷' },
  { id: 'panda', emoji: '🐼' },
  { id: 'monkey', emoji: '🐵' },
  { id: 'rabbit', emoji: '🐰' },
  { id: 'cat', emoji: '🐱' },
]

/** 本设备的（打机器人 / 两人一台左边 / 多设备）与两人一台右边的默认小动物 */
export const DEFAULT_AVATARS: Record<'me' | 'right', AvatarId> = { me: 'bear', right: 'pig' }

export function isAvatarId(v: unknown): v is AvatarId {
  return typeof v === 'string' && AVATARS.some((a) => a.id === v)
}

/** 名字前面的 emoji；没选就空串 */
export function avatarEmoji(id: AvatarId | null | undefined): string {
  return id ? (AVATARS.find((a) => a.id === id)?.emoji ?? '') : ''
}

/** 两队各自的小动物（给游戏画司机 / 乘客）：每队第一个选了小动物的真人的，所有设备算出来一样；机器人 / 没选的队没有 */
export type TeamAvatars = Partial<Record<Team, AvatarId>>

export function teamAvatars(players: readonly { team: Team; kind: string; avatar?: AvatarId }[]): TeamAvatars {
  const out: TeamAvatars = {}
  for (const p of players) {
    if (p.kind !== 'human' || !p.avatar || out[p.team]) continue
    out[p.team] = p.avatar
  }
  return out
}
