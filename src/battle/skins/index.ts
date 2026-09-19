/**
 * 皮肤注册表（需求 B34–B36）：皮肤只看比分，不认识题目。
 * slot：top = 竞技场上方横条（跑道、拔河这类横向的）；center = 左右两区之间的竖条（火箭、盖楼这类竖向的）。
 * 登记了 game（实时绘图的游戏模块，独立 chunk）的皮肤，竞技场在盒子里放 GameHost；没有的放 load 的 CSS 组件。
 * 新游戏 = games/<id>/ 一个目录 + 这里加一行。
 */
import type { Component } from 'vue'
import type { RNG } from '@/engine'
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
  /** 旧的 emoji + CSS 皮肤组件（对应游戏上线一版后删） */
  load: () => Promise<Component>
  /** 实时绘图的游戏（B34）：有它就用 canvas 版 */
  game?: GameLoader
}

/** 「随机」：每局开始时从注册表里挑一个 */
export const RANDOM_SKIN = 'random'

export const SKINS: readonly SkinMeta[] = [
  {
    id: 'race',
    icon: '🐢',
    slot: 'top',
    kind: 'race',
    load: () => import('./RaceSkin.vue').then((m) => m.default),
    game: () => import('../games/race').then((m) => m.createRaceGame),
  },
  { id: 'rocket', icon: '🚀', slot: 'center', kind: 'race', load: () => import('./RocketSkin.vue').then((m) => m.default) },
  { id: 'tower', icon: '🧱', slot: 'center', kind: 'grow', load: () => import('./TowerSkin.vue').then((m) => m.default) },
  { id: 'tug', icon: '🪢', slot: 'top', kind: 'tug', load: () => import('./TugSkin.vue').then((m) => m.default) },
  { id: 'ice', icon: '🧊', slot: 'center', kind: 'consume', load: () => import('./IceSkin.vue').then((m) => m.default) },
]

export function skinById(id: string): SkinMeta | undefined {
  return SKINS.find((s) => s.id === id)
}

/** 把设置里的皮肤 id 落实成一个真实皮肤：random 或不认识的 id 都随机挑 */
export function resolveSkin(id: string, rng: RNG): string {
  return skinById(id)?.id ?? rng.pick(SKINS).id
}

/** 比分占目标分的比例 0…1 */
export function ratio(score: number, target: number): number {
  return Math.min(Math.max(score, 0), target) / target
}
