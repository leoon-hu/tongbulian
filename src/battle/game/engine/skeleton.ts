/**
 * 骨骼姿势片段（需求 M13）：动作用数据写，不在每个游戏里手搓一堆计时器。
 * - 姿势 = 一组命名通道的数（关节角、偏移、缩放、表情的权重……），通道名由用它的游戏定，这里不认识任何角色；
 * - 片段 = 时长 + 是否循环 + 关键帧（时刻、这一帧写了哪些通道、从上一帧到这一帧用什么缓动）；关键帧没写的通道取静止姿势，
 *   所以一个片段只写它关心的几样（出拳只写手臂与身子，表情由别的片段管）；
 * - 播放器：放当前片段；换片段时从「换的那一刻的姿势」交叉淡入（连着打断也不跳）；叠加层（按键抖一下、蓄力往后拉）按权重
 *   把增量加上去，没写的通道当 0。
 * 纯数据，node 里可测；每帧只是几十次加减乘除。
 */
import type { Ease } from './tween'

export type Pose = Record<string, number>

export interface Keyframe {
  /** 时刻（秒，从片段开头算） */
  t: number
  /** 这一帧写了的通道 */
  p: Pose
  /** 从上一帧到这一帧的缓动（默认线性） */
  e?: Ease
}

export interface Clip {
  dur: number
  loop: boolean
  keys: readonly Keyframe[]
  /** 片段里出现过的通道（clip() 算好，采样时只动这些） */
  chans: readonly string[]
}

/** 做一个片段：关键帧按时刻排好、算出用到的通道 */
export function clip(dur: number, keys: Keyframe[], loop = false): Clip {
  const sorted = [...keys].sort((a, b) => a.t - b.t)
  const chans = new Set<string>()
  for (const k of sorted) for (const c in k.p) chans.add(c)
  return { dur: Math.max(1e-6, dur), loop, keys: sorted, chans: [...chans] }
}

/** 通道 c 在关键帧 k 上的值：没写就取 base（叠加层的 base 是空的，取 0） */
function valueAt(k: Keyframe, c: string, base: Pose): number {
  const v = k.p[c]
  return v !== undefined ? v : (base[c] ?? 0)
}

/**
 * 片段在 t 秒时的姿势：先把 base 抄进 out，再改片段里有的通道。
 * 不循环的片段过了结尾停在最后一帧、开头之前停在第一帧；循环的按时长取模，最后一帧到结尾接回第一帧
 */
export function sampleClip(c: Clip, t: number, base: Pose, out: Pose = {}): Pose {
  if (out !== base) for (const k in base) out[k] = base[k]!
  const keys = c.keys
  if (!keys.length) return out
  let tt = t
  if (c.loop) tt = ((t % c.dur) + c.dur) % c.dur
  // 找到 tt 落在哪两帧之间（帧很少，顺着找就行）
  let i = 0
  while (i < keys.length && keys[i]!.t <= tt) i++
  let a: Keyframe
  let b: Keyframe
  let span: number
  let u: number
  if (i === 0) {
    a = b = keys[0]!
    span = 1
    u = 0
  } else if (i === keys.length) {
    a = keys[i - 1]!
    if (c.loop && a.t < c.dur) {
      b = keys[0]!
      span = c.dur - a.t
      u = span > 1e-9 ? (tt - a.t) / span : 1
    } else {
      b = a
      span = 1
      u = 0
    }
  } else {
    a = keys[i - 1]!
    b = keys[i]!
    span = b.t - a.t
    u = span > 1e-9 ? (tt - a.t) / span : 1
  }
  const w = b.e ? b.e(u) : u
  for (const ch of c.chans) {
    const va = valueAt(a, ch, base)
    const vb = valueAt(b, ch, base)
    out[ch] = va + (vb - va) * w
  }
  return out
}

/** 两个姿势按权重混合（w = 0 全是 a、1 全是 b）；只在一边有的通道当另一边等于它 */
export function mixPose(a: Pose, b: Pose, w: number, out: Pose = {}): Pose {
  for (const k in a) {
    const vb = b[k]
    out[k] = vb === undefined ? a[k]! : a[k]! + (vb - a[k]!) * w
  }
  for (const k in b) if (!(k in a)) out[k] = b[k]!
  return out
}

/** 叠加：out[c] += add[c] × w */
export function addPose(out: Pose, add: Pose, w: number): Pose {
  if (w === 0) return out
  for (const k in add) out[k] = (out[k] ?? 0) + add[k]! * w
  return out
}

/** 叠加层：一个片段 + 权重（按键抖一下、蓄力往后拉）；不循环的放完就撤掉 */
interface Layer {
  id: string
  clip: Clip
  t: number
  w: number
}

const EMPTY: Pose = Object.freeze({}) as Pose
/** 交叉淡入的缓动：两头慢（换姿势时不会一下子冲过去） */
const smooth = (u: number): number => u * u * (3 - 2 * u)

export class Animator {
  clip: Clip | null = null
  /** 当前片段放到第几秒、倍速 */
  t = 0
  speed = 1
  private from: Pose | null = null
  private fade = 0
  private fadeT = 0
  private layers: Layer[] = []
  private readonly scratch: Pose = {}
  private readonly layerScratch: Pose = {}

  constructor(readonly rest: Pose) {}

  /**
   * 换片段：从这一刻的姿势 fade 秒淡入新片段（fade = 0 立刻换，出拳要第一帧就动）。
   * 已经在放同一个片段时不重来（restart 为真才从头放：连着出两拳）
   */
  play(c: Clip, fade = 0.12, speed = 1, restart = false): void {
    this.speed = speed
    if (c === this.clip && !restart) return
    this.from = fade > 0 && this.clip ? { ...this.pose() } : null
    this.fade = fade
    this.fadeT = 0
    this.clip = c
    this.t = 0
  }

  /** 淡入的进度 0…1（1 = 全是当前片段） */
  get blend(): number {
    if (!this.from || this.fade <= 0) return 1
    return smooth(Math.min(1, this.fadeT / this.fade))
  }

  /** 不循环的片段放完了 */
  get done(): boolean {
    return !!this.clip && !this.clip.loop && this.t >= this.clip.dur
  }

  /** 设一个叠加层的片段与权重（每帧都可以调：权重跟着蓄了几格走）；clip = null 撤掉 */
  setLayer(id: string, c: Clip | null, w: number): void {
    const i = this.layers.findIndex((l) => l.id === id)
    if (!c) {
      if (i >= 0) this.layers.splice(i, 1)
      return
    }
    if (i >= 0) {
      const l = this.layers[i]!
      if (l.clip !== c) {
        l.clip = c
        l.t = 0
      }
      l.w = w
    } else this.layers.push({ id, clip: c, t: 0, w })
  }

  /** 从头放一遍叠加层（按一下键抖一下） */
  trigger(id: string, c: Clip, w = 1): void {
    this.setLayer(id, c, w)
    const l = this.layers.find((x) => x.id === id)
    if (l) l.t = 0
  }

  layerWeight(id: string): number {
    return this.layers.find((l) => l.id === id)?.w ?? 0
  }

  step(dt: number): void {
    if (!(dt > 0)) return
    this.t += dt * this.speed
    if (this.from) {
      this.fadeT += dt
      if (this.fadeT >= this.fade) this.from = null
    }
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const l = this.layers[i]!
      l.t += dt
      if (!l.clip.loop && l.t >= l.clip.dur) this.layers.splice(i, 1)
    }
  }

  /** 这一刻的姿势：当前片段（淡入中就和换之前的姿势混合）+ 各叠加层 × 权重。out 不传就用内部的一份（下次调用会被覆盖） */
  pose(out: Pose = this.scratch): Pose {
    // 静止姿势里没有的通道不留上一次的旧值（片段只该用静止姿势里有的通道，这里兜个底）
    for (const k in out) if (!(k in this.rest)) delete out[k]
    if (this.clip) sampleClip(this.clip, this.t, this.rest, out)
    else for (const k in this.rest) out[k] = this.rest[k]!
    if (this.from) mixPose(this.from, out, this.blend, out)
    for (const l of this.layers) {
      if (l.w === 0) continue
      for (const k in this.layerScratch) delete this.layerScratch[k]
      addPose(out, sampleClip(l.clip, l.t, EMPTY, this.layerScratch), l.w)
    }
    return out
  }
}
