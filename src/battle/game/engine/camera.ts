/**
 * 镜头（需求 M10）：命中时轻震（几像素、零点几秒衰减）、冲击推近（放大 1.03–1.08 再弹回，推向 Boss）。
 * 减少动画时 enabled = false：不震、不推。apply 把变换套到画布上，之后照常按盒子坐标画；抬头的血条画在 apply 之外，不跟着震。
 * 纯数据（震动按相位算，不用随机数），node 里可测。
 */
import { Spring } from './spring'

/** 推近弹回的弹簧：约 3 Hz、阻尼比 0.45（放大一下、稍稍缩回一点再停稳） */
const ZOOM_HZ = 3
const ZOOM_RATIO = 0.45
/** 推近最多放大多少（再多就晕了） */
export const MAX_PUNCH = 0.1
/** 震动最多几像素 */
export const MAX_SHAKE = 8

export class Camera {
  enabled = true
  /** 当前的震动偏移（px） */
  x = 0
  y = 0
  /** 放大倍数（1 = 不推）与推近时不动的那一点 */
  readonly zoom = Spring.of(ZOOM_HZ, ZOOM_RATIO, 1, 1e-4)
  fx = 0
  fy = 0
  private amp = 0
  private dur = 0
  private left = 0
  private t = 0

  constructor(private readonly phase = 0) {}

  /** 震一下：幅度 px、持续 seconds 秒，按平方衰减；正震着就取大的 */
  shake(px: number, seconds: number): void {
    if (!this.enabled || !(px > 0) || !(seconds > 0)) return
    const amp = Math.min(MAX_SHAKE, px)
    const now = this.currentAmp()
    if (amp >= now) {
      this.amp = amp
      this.dur = seconds
      this.left = seconds
    }
  }

  /** 推近：放大 amount（0.03–0.08）再弹回，(fx, fy) 不动 */
  punch(amount: number, fx: number, fy: number): void {
    if (!this.enabled || !(amount > 0)) return
    this.fx = fx
    this.fy = fy
    this.zoom.kick(Math.min(MAX_PUNCH, amount))
  }

  private currentAmp(): number {
    if (this.left <= 0 || this.dur <= 0) return 0
    const k = this.left / this.dur
    return this.amp * k * k
  }

  get active(): boolean {
    return this.left > 0 || !this.zoom.settled
  }

  step(dt: number): void {
    if (!this.enabled) {
      this.reset()
      return
    }
    this.t += dt
    this.left = Math.max(0, this.left - dt)
    const a = this.currentAmp()
    const t = this.t
    const p = this.phase
    this.x = a > 0 ? a * (0.62 * Math.sin(t * 47 + p) + 0.38 * Math.sin(t * 83 + p * 2.3)) : 0
    this.y = a > 0 ? a * (0.62 * Math.cos(t * 59 + p * 1.7) + 0.38 * Math.sin(t * 97 + p)) : 0
    this.zoom.step(dt)
    // 放大不许小于 1：弹回时往回缩会露出画布边，碰到 1 就停住
    if (this.zoom.value < 1) this.zoom.set(1)
  }

  /** 把震动与推近套到画布上（调用方自己 save / restore） */
  apply(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled) return
    const z = this.zoom.value
    if (this.x !== 0 || this.y !== 0) ctx.translate(this.x, this.y)
    if (Math.abs(z - 1) > 1e-4) {
      ctx.translate(this.fx, this.fy)
      ctx.scale(z, z)
      ctx.translate(-this.fx, -this.fy)
    }
  }

  reset(): void {
    this.amp = 0
    this.dur = 0
    this.left = 0
    this.x = 0
    this.y = 0
    this.zoom.set(1)
  }
}
