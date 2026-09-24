/**
 * 我的小动物（需求 B66）：每个人一只——名字旁、结果页带它，有司机 / 乘客的游戏里它露脸（赛车、开火车、热气球）。
 * 6 种与 game/sprites/scenery.ts 的 drawCritter 一一对应（CritterKind 就是 AvatarId）；多设备时随 hello 发给服务器进快照。
 * 名字与小动物（B17）：配置里自定义过的优先，没有就随机挑一只、名字就叫这只小动物，双方不一样（pickIdentity，服务器去重也用它）。
 */
import type { Lang } from '@/types/models'
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

export const AVATAR_IDS: readonly AvatarId[] = AVATARS.map((a) => a.id)

/**
 * 没自定义名字时就叫这只小动物（B17）：与词条 avatar.<id> 同一份文字（测试比对）；
 * 服务器去重时要按名字换，不走 i18n 运行时，所以单放一份
 */
export const AVATAR_NAMES: Record<Lang, Record<AvatarId, string>> = {
  zh: { bear: '小熊', pig: '小猪', panda: '熊猫', monkey: '小猴', rabbit: '小兔', cat: '小猫' },
  en: { bear: 'Bear', pig: 'Pig', panda: 'Panda', monkey: 'Monkey', rabbit: 'Rabbit', cat: 'Cat' },
}

/** 这之前偏好里存的默认小动物（我小熊 / 两人一台右边小猪）：读旧偏好时当没选（B50） */
export const LEGACY_AVATARS: Record<'me' | 'right', AvatarId> = { me: 'bear', right: 'pig' }

export function isAvatarId(v: unknown): v is AvatarId {
  return typeof v === 'string' && AVATARS.some((a) => a.id === v)
}

/** 名字是哪种语言的小动物名字（服务器去重时照这个语言换名字）；不是小动物名字就 undefined */
export function avatarNameLang(name: string): Lang | undefined {
  return (Object.keys(AVATAR_NAMES) as Lang[]).find((l) => Object.values(AVATAR_NAMES[l]).includes(name))
}

export interface Identity {
  name: string
  avatar: AvatarId
}

/**
 * 一方的名字与小动物（B17）：custom 里有的（配置里自定义过的）直接用，撞了也不改（是自己选的）；
 * 没有的按 order（这次随机排好的 6 种）挑第一只跟 others 都不撞的——小动物不一样、名字（= 小动物的名字）也不一样。
 * 小动物是自定义的而它的名字被别人用了：名字换成 order 里第一个没人用的小动物名字。都撞了（房间里超过 6 个人）就用 order 的第一只
 */
export function pickIdentity(
  custom: { name: string; avatar: AvatarId | null },
  order: readonly AvatarId[],
  lang: Lang,
  others: readonly { name: string; avatar?: AvatarId }[],
): Identity {
  const names = AVATAR_NAMES[lang]
  const takenAvatars = new Set(others.map((o) => o.avatar))
  const takenNames = new Set(others.map((o) => o.name))
  const free = (a: AvatarId): boolean => !takenAvatars.has(a) && (!!custom.name || !takenNames.has(names[a]))
  const avatar = custom.avatar ?? order.find(free) ?? order[0] ?? AVATAR_IDS[0]!
  let name = custom.name || names[avatar]
  if (!custom.name && takenNames.has(name)) name = order.map((a) => names[a]).find((n) => !takenNames.has(n)) ?? name
  return { name, avatar }
}

/**
 * 游戏里两队画的小动物（赛车 / 开火车的司机、热气球的乘客）：选了的用选了的；没有的（机器人那队）用游戏自己的默认，
 * 但不跟另一队撞——我随机到的可能正好是机器人那队的默认（B17「双方不一样」）
 */
export function teamKinds(avatars: TeamAvatars | undefined, defaults: readonly [AvatarId, AvatarId]): [AvatarId, AvatarId] {
  const avoid = (def: AvatarId, other: AvatarId | undefined, alt: AvatarId): AvatarId =>
    def !== other ? def : alt !== other ? alt : AVATAR_IDS.find((a) => a !== other)!
  const red = avatars?.red ?? avoid(defaults[0], avatars?.blue, defaults[1])
  const blue = avatars?.blue ?? avoid(defaults[1], red, defaults[0])
  return [red, blue]
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
