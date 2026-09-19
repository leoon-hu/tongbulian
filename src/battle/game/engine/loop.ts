/**
 * 帧循环：requestAnimationFrame 驱动，dt 封顶（切后台回来不会一下推进几十秒），
 * 可暂停 / 恢复，空闲时降到约 30fps，连续掉帧时逐级降级（回调给游戏减装饰 / 减粒子 / 降像素比）。
 * 时钟可注入，测试里用假时钟推进。
 */

export interface LoopClock {
  raf(cb: (t: number) => void): number
  caf(id: number): void
  /** 毫秒 */
  now(): number
}

export const realClock: LoopClock = {
  raf(cb) {
    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb)
    return setTimeout(() => cb(Date.now()), 16) as unknown as number
  },
  caf(id) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id)
    else clearTimeout(id)
  },
  now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now()
  },
}

export interface LoopOptions {
  frame(dt: number): void
  /** 连续掉帧时调用，level 1 → 3 逐级加重 */
  degrade?(level: number): void
  clock?: LoopClock
}

/** dt 封顶（秒）：一帧最多推进这么多，切后台回来不会跳 */
export const MAX_DT = 0.05
/** 比这慢的帧算掉帧（秒，约 40fps 以下） */
export const SLOW_FRAME = 0.024
/** 每 60 帧里有 30 帧掉帧就降一级 */
export const SLOW_WINDOW = 60
export const SLOW_LIMIT = 30
export const MAX_LEVEL = 3

export class Loop {
  private id: number | null = null
  private last = 0
  private started = false
  private paused = false
  private skip = false
  private seen = 0
  private slow = 0
  private readonly clock: LoopClock
  /** 降级等级 0…3 */
  level = 0
  /** 空闲（画面没有在动）：隔帧跳过，约 30fps，省电 */
  idle = false

  constructor(private readonly opts: LoopOptions) {
    this.clock = opts.clock ?? realClock
  }

  get running(): boolean {
    return this.started && !this.paused
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.paused = false
    this.last = this.clock.now()
    this.schedule()
  }

  stop(): void {
    this.started = false
    this.paused = false
    this.cancel()
  }

  pause(): void {
    if (!this.started || this.paused) return
    this.paused = true
    this.cancel()
  }

  resume(): void {
    if (!this.started || !this.paused) return
    this.paused = false
    this.last = this.clock.now()
    this.schedule()
  }

  private cancel(): void {
    if (this.id !== null) {
      this.clock.caf(this.id)
      this.id = null
    }
  }

  private schedule(): void {
    if (this.id === null) this.id = this.clock.raf(this.frame)
  }

  private readonly frame = (): void => {
    this.id = null
    if (!this.running) return
    const now = this.clock.now()
    const raw = Math.max(0, (now - this.last) / 1000)
    this.last = now
    if (this.idle) {
      this.skip = !this.skip
      if (this.skip) {
        this.schedule()
        return
      }
    }
    this.track(raw)
    this.opts.frame(Math.min(raw, MAX_DT))
    if (this.running) this.schedule()
  }

  /** 掉帧统计：用原始帧间隔（不是封顶后的 dt），不然慢帧会被藏起来 */
  private track(raw: number): void {
    this.seen += 1
    if (raw > SLOW_FRAME) this.slow += 1
    if (this.seen >= SLOW_WINDOW) {
      if (this.slow >= SLOW_LIMIT && this.level < MAX_LEVEL) {
        this.level += 1
        this.opts.degrade?.(this.level)
      }
      this.seen = 0
      this.slow = 0
    }
  }
}
