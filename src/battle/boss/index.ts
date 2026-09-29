/**
 * Boss 注册表（需求 M3 / M8 / M13）：打怪兽玩法的 Boss。第一只是捣蛋龙（dino）；以后多了按章节轮换、也能在配置里换（M5 / M15 阶段 4）。
 * 每只 Boss 是一个按需加载的游戏模块（boss-contract.ts），竞技场的舞台里放 GameHost 跑它；tune 是它比赛中放的背景乐（battle/music.ts）。
 */
import type { BossGameLoader } from '../game/boss-contract'

export interface BossMeta {
  id: string
  icon: string
  game: BossGameLoader
  /** 背景乐（battle/music.ts 的 TUNES 里的一首，M11） */
  tune: string
}

export const BOSSES: readonly BossMeta[] = [
  {
    id: 'dino',
    icon: '🦖',
    game: () => import('../games/boss-dino').then((m) => m.createDinoGame),
    tune: 'boss',
  },
]

export const DEFAULT_BOSS = 'dino'

/** 打怪兽「谁来玩」（M5）：一个人 / 和机器人 / 两人一台 / 各用各的（多设备，阶段 3） */
export type BossMode = 'solo' | 'ai' | 'duo' | 'online'
export const BOSS_MODES: readonly BossMode[] = ['solo', 'ai', 'duo', 'online']
/** 单设备能玩的三种（阶段 1） */
export type LocalBossMode = Exclude<BossMode, 'online'>

export function isBossMode(v: unknown): v is BossMode {
  return typeof v === 'string' && (BOSS_MODES as readonly string[]).includes(v)
}

export function bossById(id: string | null | undefined): BossMeta | undefined {
  return BOSSES.find((b) => b.id === id)
}

/** 不认识的（旧偏好、手改的地址）按第一只 */
export function resolveBoss(id: string | null | undefined): string {
  return bossById(id)?.id ?? DEFAULT_BOSS
}

/** 本机最好成绩（M7，只记一个人打的）：按「知识点 @ 时长」记——时长不同的分数没法比 */
export function bestKey(kpId: string, durationS: number): string {
  return `${kpId}@${durationS}`
}
/** 最多记这么多个（按最近打出新纪录的顺序留） */
export const BEST_MAX = 300
const BEST_KEY_RE = /^[\w-]{1,60}@\d{2,3}$/

export function isBestKey(v: string): boolean {
  return BEST_KEY_RE.test(v)
}

/** 记一个新纪录：这一条挪到最后（最近），超过 BEST_MAX 个把最早的去掉 */
export function withBest(best: Record<string, number>, key: string, score: number): Record<string, number> {
  const rest = Object.entries(best).filter(([k]) => k !== key)
  return Object.fromEntries([...rest, [key, score] as [string, number]].slice(-BEST_MAX))
}
