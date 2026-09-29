/**
 * Boss 游戏与打怪兽竞技场之间唯一的契约（需求 M13）：生命周期与对战的游戏一样（HostedGame），隔离规则 B34a 照旧——
 * 游戏只收这份快照与事件、在舞台的 canvas 上画，画布里没有字、不出声、不碰 DOM / store / 路由。
 * 快照变了（比分、血量、阶段、谁在按）就 setState；一次答题的几条事件（hit → bossDown → bossIn）按顺序 onEvent。
 */
import type { Team } from '../protocol'
import type { AvatarId } from '../avatars'
import type { BossArenaEvent, BossSide, PunchMove, TimedPhase, TimedVariant } from '../timed'
import type { HostedGame } from './contract'

/** 台上的一个拳手（M9）：孩子的小动物，或机器人 */
export interface BossFighter {
  id: string
  team: Team
  /** 孩子选的 / 随机到的小动物（B66）；机器人没有 */
  avatar?: AvatarId
  robot: boolean
  /** 连击到第几题（火焰光环、招式由事件里的 move 定） */
  streak: number
  /** 正在按的内容（数字串或选项 id）：变了且不空 = 按了一下键 → 拳套蓄一格力（M9）；删短了 = 泄一格 */
  input: string
}

/** 一条 Boss 链现在的样子（血条、第几只的样子由它定） */
export interface BossStage {
  side: BossSide
  /** 第几只（从 1 起；第 4 只起是金色的） */
  level: number
  /** 剩多少血 / 满血（血条一分一格） */
  hp: number
  max: number
}

export interface BossGameState {
  phase: TimedPhase
  variant: TimedVariant
  /** 最后 10 秒（冲刺画面，M10） */
  lastTen: boolean
  /** 台上的拳手（单设备最多 2 个；多设备最多 4 个：每队最近打中的两个，轮换上台，M9） */
  fighters: BossFighter[]
  /**
   * 台下的人（多设备人多时，M9）：坐在观众席、举着自己小动物的牌子；他们打中（hit 事件的 playerId 在这里）时从观众席飞出
   * 一个发光的「能量拳」打向 Boss，ENERGY_AT 秒打到。没有 = 空。换人上下台时同一个 id 会从一边挪到另一边
   */
  crowd?: BossFighter[]
  /** 一起打一条（side 'shared'）；各打各的红蓝各一条 */
  bosses: BossStage[]
}

/**
 * 从出拳到打中（秒，M10）：直拳约 70 ms，旋风拳先转一圈再打。游戏按它画拳头打到的那一帧，
 * 竞技场按它晚一点放「嘭」让声音和命中对齐——放在契约里，竞技场引它不会把按需加载的游戏拉进来
 */
export const HIT_AT: Record<PunchMove, number> = { jab: 0.07, hook: 0.1, upper: 0.12, super: 0.2 }

/** 台下的人打中时，能量拳从观众席飞到 Boss 身上要多久（秒）：竞技场按它晚一点放「嘭」 */
export const ENERGY_AT = 0.35

/** 事件：hit / miss / bossDown / bossIn / lastTen / timeUp / finished + 倒数 countdown / 开打 go + Boss 的表演 taunt + 某人发了表情 emote（timed.ts） */
export type BossGameEvent = BossArenaEvent

/**
 * Boss 游戏模块。focus(team)（终局特写对准哪里）：一起打返回 Boss 的位置（team 不管）；各打各的返回那一队的 Boss 的位置。
 * poke(x, y, team)：游戏自己判断点到的是 Boss / 拳手 / 观众 / 锣，做个小反应，不计分，并返回点中的是哪一样（BossPokeTarget，
 * 竞技场按它放声音：Boss 咯咯笑、拳手秀肌肉、锣「当」、观众欢呼，M12）
 */
export type BossPokeTarget = 'boss' | 'fighter' | 'gong' | 'crowd'
export const BOSS_POKE_TARGETS: readonly BossPokeTarget[] = ['boss', 'fighter', 'gong', 'crowd']

export type BossGameModule = HostedGame<BossGameState, BossGameEvent>
export type BossGameFactory = () => BossGameModule
/** 注册表里登记的按需加载函数：一只 Boss 一个独立 chunk */
export type BossGameLoader = () => Promise<BossGameFactory>
