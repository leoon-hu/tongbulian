/** 缓动与补间：数值从当前值滑到目标值，中途换目标也顺滑。 */

export type Ease = (t: number) => number

export const ease = {
  linear: (t: number): number => t,
  outQuad: (t: number): number => 1 - (1 - t) * (1 - t),
  outCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  inOutSine: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,
  /** 先快后慢、末尾过冲一点再回来（得分位移用） */
  outBack: (t: number): number => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  outElastic: (t: number): number => {
    if (t === 0 || t === 1) return t
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
  },
  outBounce: (t: number): number => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  },
} as const

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export function clamp01(v: number): number {
  return clamp(v, 0, 1)
}

/** 一个会滑动的数：to() 设新目标（从当前值出发），step() 每帧推进 */
export class Tween {
  value: number
  target: number
  private from: number
  private t = 0
  private dur = 0
  private fn: Ease

  constructor(value = 0, fn: Ease = ease.outCubic) {
    this.value = value
    this.target = value
    this.from = value
    this.fn = fn
  }

  get done(): boolean {
    return this.dur <= 0 || this.t >= this.dur
  }

  /** 从当前值滑到 target，用 duration 秒；duration ≤ 0 直接跳过去 */
  to(target: number, duration: number, fn?: Ease): void {
    this.from = this.value
    this.target = target
    this.t = 0
    this.dur = Math.max(0, duration)
    if (fn) this.fn = fn
    if (this.dur === 0) this.value = target
  }

  /** 立刻到 target，不动画 */
  set(target: number): void {
    this.value = target
    this.target = target
    this.from = target
    this.t = 0
    this.dur = 0
  }

  step(dt: number): number {
    if (!this.done) {
      this.t = Math.min(this.dur, this.t + dt)
      this.value = lerp(this.from, this.target, this.fn(clamp01(this.t / this.dur)))
    }
    return this.value
  }
}
