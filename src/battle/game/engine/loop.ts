/**
 * 帧循环：requestAnimationFrame 驱动，dt 封顶（切后台回来不会一下推进几十秒），
 * 可暂停 / 恢复，空闲时降到约 30fps，连续掉帧时逐级降级（回调给游戏减装饰 / 减粒子 / 降像素比），
 * 之后连续几个窗口都不掉帧再逐级恢复。掉帧看的是「一帧的工作耗时」而不是帧间隔：iPad 低电量模式会把 rAF 限到 30 Hz，
 * 帧间隔 33 ms 但每帧只干 3 ms 活，按间隔算会把它当成一直掉帧、6 秒内降到底（N8）。
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
/** 一帧的工作（推进 + 绘制）超过这么久算掉帧（秒；60 fps 的预算是 16.7 ms，留一半给浏览器合成） */
export const SLOW_FRAME = 0.012
/** 每 60 帧里有 30 帧掉帧就降一级 */
export const SLOW_WINDOW = 60
export const SLOW_LIMIT = 30
/** 连续这么多个窗口掉帧不到 SLOW_LIMIT 的 1/6 就恢复一级 */
export const RECOVER_WINDOWS = 3
export const MAX_LEVEL = 3

export class Loop {
  private id: number | null = null
  private last = 0
  private isStarted = false
  private paused = false
  private skip = false
  private seen = 0
  private slow = 0
  private clean = 0
  private readonly clock: LoopClock
  /** 降级等级 0…3 */
  level = 0
  /** 空闲（画面没有在动）：隔帧跳过，约 30fps，省电 */
  idle = false

  constructor(private readonly opts: LoopOptions) {
    this.clock = opts.clock ?? realClock
  }

  get running(): boolean {
    return this.isStarted && !this.paused
  }

  /** start 过、还没 stop（可能正暂停着） */
  get started(): boolean {
    return this.isStarted
  }

  start(): void {
    if (this.isStarted) return
    this.isStarted = true
    this.paused = false
    this.last = this.clock.now()
    this.schedule()
  }

  stop(): void {
    this.isStarted = false
    this.paused = false
    this.cancel()
  }

  pause(): void {
    if (!this.isStarted || this.paused) return
    this.paused = true
    this.cancel()
  }

  resume(): void {
    if (!this.isStarted || !this.paused) return
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
    if (this.idle) {
      // 隔帧：跳过的那一帧不动 last，下一帧的 dt 把两帧的时间都算上（不然动画会慢一半）
      this.skip = !this.skip
      if (this.skip) {
        this.schedule()
        return
      }
    }
    const raw = Math.max(0, (now - this.last) / 1000)
    this.last = now
    this.opts.frame(Math.min(raw, MAX_DT))
    this.track((this.clock.now() - now) / 1000)
    if (this.running) this.schedule()
  }

  /** 掉帧统计：按这一帧的工作耗时 */
  private track(cost: number): void {
    this.seen += 1
    if (cost > SLOW_FRAME) this.slow += 1
    if (this.seen >= SLOW_WINDOW) {
      if (this.slow >= SLOW_LIMIT) {
        this.clean = 0
        if (this.level < MAX_LEVEL) {
          this.level += 1
          this.opts.degrade?.(this.level)
        }
      } else if (this.slow * 6 < SLOW_LIMIT && this.level > 0) {
        this.clean += 1
        if (this.clean >= RECOVER_WINDOWS) {
          this.clean = 0
          this.level -= 1
          this.opts.degrade?.(this.level)
        }
      } else this.clean = 0
      this.seen = 0
      this.slow = 0
    }
  }
}
