/**
 * 阻尼弹簧（需求 M13）：一个数被拉回目标，带过冲与回弹——不倒翁被打歪了弹回来、肚子挤压回弹、围绳被撞后晃、镜头推近再弹回。
 * 半隐式欧拉按小步推进（一帧拆成不超过 1/120 秒的几步），切后台回来的大 dt 也不会炸。纯数据，node 里可测。
 */

/** 一小步最多推进多久（秒）：频率 ≤ 6 Hz 时这个步长远在稳定范围内 */
export const MAX_SUBSTEP = 1 / 120

export class Spring {
  value: number
  velocity = 0
  target: number
  /** 劲度 k（1/s²）与阻尼 c（1/s）：角频率 ω = √k，阻尼比 ζ = c / 2ω */
  stiffness: number
  damping: number
  /** 离目标、速度都小于它就算停稳（按这个量的单位：弧度、倍数、像素） */
  eps: number

  constructor(value = 0, stiffness = 170, damping = 10, eps = 1e-3) {
    this.value = value
    this.target = value
    this.stiffness = stiffness
    this.damping = damping
    this.eps = eps
  }

  /** 按振动频率（Hz）与阻尼比（0…1，越小晃得越久）定参数 */
  static of(hz: number, ratio: number, value = 0, eps = 1e-3): Spring {
    const s = new Spring(value, 1, 1, eps)
    s.tune(hz, ratio)
    return s
  }

  /** 换参数（保留当前值与速度）：比如血少了动作变慢 */
  tune(hz: number, ratio: number): void {
    const w = 2 * Math.PI * Math.max(0.01, hz)
    this.stiffness = w * w
    this.damping = 2 * Math.max(0, ratio) * w
  }

  get omega(): number {
    return Math.sqrt(this.stiffness)
  }

  get ratio(): number {
    return this.damping / (2 * this.omega)
  }

  get settled(): boolean {
    return Math.abs(this.value - this.target) < this.eps && Math.abs(this.velocity) < this.eps
  }

  /** 猛推一下：速度加 v（单位 / 秒） */
  impulse(v: number): void {
    this.velocity += v
  }

  /**
   * 推一下，让它（从静止出发）最远偏出 peak：先算单位速度推出去的峰值，再反过来求速度。
   * 欠阻尼：e^(−ζ / √(1 − ζ²) · atan(√(1 − ζ²) / ζ)) / ω；临界：1 / (ω e)；过阻尼：两个指数之差在极值点的值
   */
  kick(peak: number): void {
    const w = this.omega
    const z = this.ratio
    let gain: number
    if (z < 1 - 1e-6) {
      const r = Math.sqrt(1 - z * z)
      gain = Math.exp((-z / r) * Math.atan2(r, z)) / w
    } else if (z <= 1 + 1e-6) gain = 1 / (w * Math.E)
    else {
      const s = Math.sqrt(z * z - 1)
      const r1 = w * (-z + s)
      const r2 = w * (-z - s)
      const t = Math.log(r2 / r1) / (r1 - r2)
      gain = (Math.exp(r1 * t) - Math.exp(r2 * t)) / (r1 - r2)
    }
    this.velocity += peak / gain
  }

  /** 立刻到 v、停住 */
  set(v: number): void {
    this.value = v
    this.target = v
    this.velocity = 0
  }

  step(dt: number): number {
    if (!(dt > 0)) return this.value
    if (this.settled) {
      this.value = this.target
      this.velocity = 0
      return this.value
    }
    // 阻尼很大（过阻尼）或很硬时步子再小一点，不然开头那一下就把速度吃掉太多
    const hMax = Math.min(MAX_SUBSTEP, 0.05 / Math.max(1e-6, this.damping), 0.2 / Math.max(1e-6, this.omega))
    const n = Math.min(400, Math.max(1, Math.ceil(dt / hMax)))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      const a = -this.stiffness * (this.value - this.target) - this.damping * this.velocity
      this.velocity += a * h
      this.value += this.velocity * h
    }
    return this.value
  }
}
