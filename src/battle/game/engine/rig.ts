/**
 * 「部件角色」的小工具：角色是一组带枢轴的部件，姿势是随时间变化的角度 / 位移函数。
 * 这里只放与具体角色无关的节拍器：周期相位、摆动、眨眼计时、会衰减的波。
 */
import type { RNG } from '@/engine'

/** 相位 → 摆动角：amp × sin(phase + offset) */
export function swing(phase: number, amp: number, offset = 0): number {
  return amp * Math.sin(phase + offset)
}

/** 0…1 的呼吸：慢慢起伏 */
export function breathe(t: number, period = 2.4): number {
  return 0.5 + 0.5 * Math.sin((t / period) * Math.PI * 2)
}

/** 眨眼：隔几秒眨一次，每次约 0.12 秒；value 是眼皮闭合程度 0…1 */
export class Blinker {
  value = 0
  private until: number
  private closing = 0

  constructor(
    private readonly rng: RNG,
    private readonly minGap = 2.5,
    private readonly maxGap = 5,
  ) {
    this.until = this.next()
  }

  private next(): number {
    return this.minGap + this.rng.next() * (this.maxGap - this.minGap)
  }

  step(dt: number): number {
    if (this.closing > 0) {
      this.closing -= dt
      this.value = this.closing > 0.06 ? 1 : this.closing / 0.06
      if (this.closing <= 0) {
        this.value = 0
        this.until = this.next()
      }
      return this.value
    }
    this.until -= dt
    if (this.until <= 0) this.closing = 0.12
    return this.value
  }
}

/** 会衰减的量：kick 一下升到某个值，然后按半衰期回落（观众挥手、回头看、速度线…） */
export class Decay {
  value = 0

  constructor(private readonly halfLife = 0.4) {}

  kick(to: number): void {
    this.value = Math.max(this.value, to)
  }

  step(dt: number): number {
    if (this.value > 0.001) this.value *= Math.pow(0.5, dt / this.halfLife)
    else this.value = 0
    return this.value
  }
}

/** 周期相位（弧度），每秒 speed 圈 */
export function advancePhase(phase: number, dt: number, cyclesPerSecond: number): number {
  const next = phase + dt * cyclesPerSecond * Math.PI * 2
  return next > Math.PI * 200 ? next - Math.PI * 200 : next
}
