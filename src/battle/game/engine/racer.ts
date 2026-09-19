/**
 * 「并行推进」类游戏（赛跑、赛车、游泳、爬梯子……）的一个选手：分数 → 位置的补间、心情、节拍。
 * 游戏自己决定位置怎么算（posFor）、每秒几个动作周期（cycles），这里只管共同的骨架。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameState } from '../contract'
import { Blinker, Decay, advancePhase } from './rig'
import { ease, Tween, type Ease } from './tween'

export type RacerMood = 'idle' | 'ready' | 'run' | 'win' | 'lose'

export interface RacerTiming {
  animated: boolean
  /** 得分位移时长（秒） */
  moveTime: number
  moveTimeReduced: number
}

export class Racer {
  score = 0
  pos: Tween
  /** 推进强度 0…1（位置在动时升到 1，停了降回 0） */
  moving = 0
  /** 推进 / 动作相位 */
  phase = 0
  /** 连对带来的加速 0…1 */
  boost = new Decay(0.6)
  blink: Blinker
  /** 被反超时回头看 */
  look = new Decay(0.5)
  mood: RacerMood = 'idle'
  /** 在这个心情里待了多久 */
  moodT = 0
  /** 原地蹦 / 待机起伏的相位 */
  hop: number
  private readonly fn: Ease

  constructor(
    readonly team: Team,
    rng: RNG,
    fn: Ease = ease.outBack,
  ) {
    this.fn = fn
    this.pos = new Tween(0, fn)
    this.blink = new Blinker(rng)
    this.hop = rng.next() * Math.PI * 2
  }

  setMood(mood: RacerMood): void {
    if (this.mood !== mood) {
      this.mood = mood
      this.moodT = 0
    }
  }

  /**
   * 按快照更新：大厅 / 倒数回到起点并 ready；分数变了往 posFor(score) 推进（前进有补间，后退直接跳）；
   * 结束时胜方滑到 posFor(score, true)、负方 lose；其它情况 idle。返回这次是不是前进了。
   */
  apply(s: GameState, posFor: (score: number, won: boolean) => number, t: RacerTiming): boolean {
    const score = this.team === 'red' ? s.red : s.blue
    if (s.phase === 'lobby' || s.phase === 'countdown') {
      this.score = score
      this.pos.set(posFor(0, false))
      this.setMood('ready')
      return false
    }
    let forward = false
    const dur = t.animated ? t.moveTime : t.moveTimeReduced
    if (score !== this.score) {
      forward = score > this.score
      this.score = score
      this.pos.to(posFor(score, false), forward ? dur : 0, t.animated ? this.fn : ease.linear)
      if (forward) this.setMood('run')
    }
    if (s.phase === 'ended' && s.winner) {
      if (this.team === s.winner) {
        if (this.mood !== 'win') this.pos.to(posFor(score, true), dur, t.animated ? ease.outCubic : ease.linear)
        this.setMood('win')
      } else this.setMood('lose')
    } else if (this.mood === 'ready' || this.mood === 'win' || this.mood === 'lose') this.setMood('idle')
    return forward
  }

  /** 每帧：位置补间、推进强度、相位（每秒 cycles 圈 × 推进强度，连对更快）、各种衰减 */
  step(dt: number, cycles: number, animated: boolean): void {
    this.moodT += dt
    this.pos.step(dt)
    const boost = this.boost.step(dt)
    const running = !this.pos.done && this.mood !== 'win' && this.mood !== 'lose'
    this.moving += ((running ? 1 : 0) - this.moving) * Math.min(1, dt * 10)
    if (this.moving > 0.02) this.phase = advancePhase(this.phase, dt, cycles * (1 + boost * 0.6) * this.moving)
    else if (this.mood === 'win') this.phase = advancePhase(this.phase, dt, 2.5)
    if (animated) this.hop = advancePhase(this.hop, dt, this.mood === 'ready' ? 2 : 0.5)
    this.blink.step(dt)
    this.look.step(dt)
  }
}
