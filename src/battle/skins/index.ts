/**
 * 皮肤注册表（需求 B34–B36）：皮肤只看比分，不认识题目。
 * slot：top = 竞技场上方横条（跑道、拔河这类横向的）；center = 左右两区之间的竖条（火箭、盖楼这类竖向的）。
 * 每种皮肤就是一个实时绘图的游戏模块（独立 chunk），竞技场在盒子里放 GameHost 跑它。
 * 新游戏 = games/<id>/ 一个目录 + 这里加一行 + 词条 skin.<id>。
 */
import type { RNG } from '@/engine'
import { volumeKps } from '@/engine/catalog'
import type { GameLoader, GameState } from '../game/contract'

/** 所有皮肤组件的 props = 游戏的比分快照（同一份类型） */
export type SkinProps = GameState

export type SkinSlot = 'top' | 'center'
/** race 并行推进 / tug 拉锯 / consume 消耗对方 / grow 成长、建造、收集 */
export type SkinKind = 'race' | 'tug' | 'consume' | 'grow'

export interface SkinMeta {
  id: string
  icon: string
  slot: SkinSlot
  kind: SkinKind
  /** 实时绘图的游戏（B34） */
  game: GameLoader
}

/** 有专属开场规则句 / 结束语的皮肤（B39）；没有的用 default */
const PHRASED = new Set(['race', 'car', 'rocket', 'balloon', 'swim', 'ladder', 'dig', 'fish', 'tower', 'tug', 'ice'])

export function phraseSkin(id: string): string {
  return PHRASED.has(id) ? id : 'default'
}

/** 开场那句话（「对战开始啦！答对一题……看谁先……谁就赢了哦！」）的词条键 */
export function ruleKey(id: string): string {
  return `battle.rule.${phraseSkin(id)}`
}

/** 胜负播报后接的一句游戏话（「火箭飞到星星啦！」）的词条键 */
export function finishKey(id: string): string {
  return `battle.finish.${phraseSkin(id)}`
}

/** 「随机」：每局开始时从注册表里挑一个 */
export const RANDOM_SKIN = 'random'

export const SKINS: readonly SkinMeta[] = [
  {
    id: 'race',
    icon: '🐢',
    slot: 'top',
    kind: 'race',
    game: () => import('../games/race').then((m) => m.createRaceGame),
  },
  {
    id: 'car',
    icon: '🏎️',
    slot: 'top',
    kind: 'race',
    game: () => import('../games/car').then((m) => m.createCarGame),
  },
  {
    id: 'rocket',
    icon: '🚀',
    slot: 'center',
    kind: 'race',
    game: () => import('../games/rocket').then((m) => m.createRocketGame),
  },
  {
    id: 'balloon',
    icon: '🎈',
    slot: 'center',
    kind: 'race',
    game: () => import('../games/balloon').then((m) => m.createBalloonGame),
  },
  {
    id: 'swim',
    icon: '🏊',
    slot: 'top',
    kind: 'race',
    game: () => import('../games/swim').then((m) => m.createSwimGame),
  },
  {
    id: 'ladder',
    icon: '🪜',
    slot: 'center',
    kind: 'race',
    game: () => import('../games/ladder').then((m) => m.createLadderGame),
  },
  {
    id: 'dig',
    icon: '⛏️',
    slot: 'center',
    kind: 'race',
    game: () => import('../games/dig').then((m) => m.createDigGame),
  },
  {
    id: 'fish',
    icon: '🎣',
    slot: 'center',
    kind: 'race',
    game: () => import('../games/fish').then((m) => m.createFishGame),
  },
  {
    id: 'tower',
    icon: '🧱',
    slot: 'center',
    kind: 'grow',
    game: () => import('../games/tower').then((m) => m.createTowerGame),
  },
  {
    id: 'tug',
    icon: '🪢',
    slot: 'top',
    kind: 'tug',
    game: () => import('../games/tug').then((m) => m.createTugGame),
  },
  {
    id: 'ice',
    icon: '🧊',
    slot: 'center',
    kind: 'consume',
    game: () => import('../games/ice').then((m) => m.createIceGame),
  },
]

export function skinById(id: string): SkinMeta | undefined {
  return SKINS.find((s) => s.id === id)
}


/**
 * 「按章节」：这个知识点在它那一册里排第几（目录顺序，含 ☆ 单元），第 i 个用第 i 个游戏，排完从头再排；
 * 下一册重新从第一个游戏排起。不在目录里的知识点用第一个游戏。
 */
export function chapterSkin(kpId: string): string {
  const games = SKINS
  const list = volumeKps(kpId)
  const i = Math.max(0, list.findIndex((kp) => kp.id === kpId))
  return games[i % games.length]!.id
}

/** 把选的皮肤 id 落实成一个真实皮肤：random 或不认识的 id 随机挑 */
export function resolveSkin(id: string, rng: RNG): string {
  return skinById(id)?.id ?? rng.pick(SKINS).id
}

/** 比分占目标分的比例 0…1 */
export function ratio(score: number, target: number): number {
  return Math.min(Math.max(score, 0), target) / target
}
