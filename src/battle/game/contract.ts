/**
 * 游戏与页面之间唯一的契约（需求 B34 / B34a）。
 * 游戏在竞技场分给它的固定盒子里的一块 <canvas> 上实时绘图：只收比分快照、瞬时事件与宿主转来的点按坐标（B59），
 * 不出声、没有文字、没有 CSS，也拿不到 store / 路由 / DOM。
 * 宿主（host/GameHost.vue）负责 canvas、尺寸、加载、循环与出错回退；游戏只实现下面的接口。
 */
import type { ArenaEvent, Phase, Team } from '../protocol'
import type { TeamAvatars } from '../avatars'

/** 比分快照：与皮肤 props 完全一致（B34） */
export interface GameState {
  red: number
  blue: number
  target: number
  phase: Phase
  winner: Team | null
  lastPoint: Team | null
  /** 两队各自的小动物（B66）：有司机 / 乘客的游戏用它换脸；没有就用游戏自己的默认角色 */
  avatars?: TeamAvatars
}

/** 瞬时事件：比赛事件（得分 / 连对 / 反超 / 还差一分 / 结束）+ 倒数开始 / 开打 */
export type GameEvent = ArenaEvent

/** 宿主在 mount 时交给游戏的东西：canvas 与盒子的尺寸（CSS 像素）、像素比、是否手机紧凑版、是否减少动画 */
export interface GameHostInfo {
  canvas: HTMLCanvasElement
  width: number
  height: number
  dpr: number
  compact: boolean
  reducedMotion: boolean
}

export interface GameModule {
  meta: { id: string }
  /** 拿到 canvas，建上下文、布局场景。之后 setState 至少会调一次 */
  mount(host: GameHostInfo): void
  /** 快照变了（比分、阶段、胜方）就调 */
  setState(state: GameState): void
  /** 瞬时事件：一次答题可能连发几条（point → streak → nearWin …） */
  onEvent(e: GameEvent): void
  /** 盒子尺寸 / 像素比变了（转屏、紧凑版切换） */
  resize(width: number, height: number, dpr: number): void
  /** 宿主的 rAF 每帧调一次（dt 秒，已封顶）：推进模型并渲染 */
  tick(dt: number): void
  pause(): void
  resume(): void
  destroy(): void
  /** 宿主的循环连续掉帧时调用（1 → 3 逐级加重）：游戏据此停视差 / 停粒子 / 降像素比 */
  degrade?(level: number): void
  /**
   * 盒子被点了一下（B59）：x / y 是盒子里的 CSS 像素，team 是宿主按位置猜的一方（横条的并行 / 收集类上半红下半蓝，
   * 拉锯类与竖条左红右蓝）。游戏做个小反应（跳一下、鸣笛、喷火），不计分；没实现的宿主只画涟漪
   */
  poke?(x: number, y: number, team: Team): void
}

/** 每次挂载新建一个实例（同一皮肤再来一局、换皮肤都干净） */
export type GameFactory = () => GameModule
/** 注册表里登记的按需加载函数：一个游戏一个独立 chunk */
export type GameLoader = () => Promise<GameFactory>
