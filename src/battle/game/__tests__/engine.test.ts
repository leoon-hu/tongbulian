import { describe, expect, it } from 'vitest'
import { Loop, MAX_DT, RECOVER_WINDOWS, SLOW_LIMIT, SLOW_WINDOW, type LoopClock } from '../engine/loop'
import { Tween, clamp, ease, lerp } from '../engine/tween'
import { DEFAULT_CAPACITY, ParticlePool } from '../engine/particles'
import { fillRoundRect, gradient, withAlpha, withTransform } from '../engine/draw'
import { stubCtx } from './stub'

/** 手动推进的假时钟：advance 推进时间并触发排队的 rAF 回调 */
function fakeClock() {
  let t = 0
  let id = 0
  const queue: Array<(t: number) => void> = []
  const clock: LoopClock = {
    raf(cb) {
      queue.push(cb)
      return ++id
    },
    caf() {
      queue.length = 0
    },
    now: () => t,
  }
  return {
    clock,
    advance(ms: number) {
      t += ms
      for (const cb of queue.splice(0)) cb(t)
    },
    /** 一帧里干活花掉的时间（在 frame 回调里调） */
    busy(ms: number) {
      t += ms
    },
    get pending() {
      return queue.length
    },
  }
}

describe('缓动与补间', () => {
  it('每种缓动 0 → 0、1 → 1，中途不离谱', () => {
    for (const [name, fn] of Object.entries(ease)) {
      expect(fn(0), name).toBeCloseTo(0, 6)
      expect(fn(1), name).toBeCloseTo(1, 6)
      for (let i = 0; i <= 20; i++) {
        const v = fn(i / 20)
        expect(v, `${name}(${i / 20})`).toBeGreaterThan(-0.5)
        expect(v, `${name}(${i / 20})`).toBeLessThan(1.5)
      }
    }
    expect(lerp(2, 4, 0.5)).toBe(3)
    expect(clamp(5, 0, 3)).toBe(3)
  })

  it('Tween：滑到目标、中途换目标从当前值出发、set 立刻到位', () => {
    const tw = new Tween(0, ease.linear)
    tw.to(10, 1)
    tw.step(0.25)
    expect(tw.value).toBeCloseTo(2.5)
    expect(tw.done).toBe(false)
    tw.to(0, 1)
    expect(tw.value).toBeCloseTo(2.5)
    tw.step(0.5)
    expect(tw.value).toBeCloseTo(1.25)
    tw.step(1)
    expect(tw.value).toBe(0)
    expect(tw.done).toBe(true)
    tw.set(7)
    expect(tw.value).toBe(7)
    expect(tw.target).toBe(7)
    tw.to(9, 0)
    expect(tw.value).toBe(9)
    // outBack 中途会过冲
    const back = new Tween(0, ease.outBack)
    back.to(1, 1)
    let max = 0
    for (let i = 0; i < 20; i++) max = Math.max(max, back.step(0.05))
    expect(max).toBeGreaterThan(1)
    expect(back.value).toBeCloseTo(1, 6)
  })
})

describe('粒子池', () => {
  it('发射、老化、消失；满了顶掉最老的；画的时候不抛错且透明度复位', () => {
    let seed = 1
    const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const pool = new ParticlePool(DEFAULT_CAPACITY, rng)
    pool.emit({ x: 0, y: 0, count: 10, life: 0.5, colors: ['#f00', '#0f0'] })
    expect(pool.count).toBe(10)
    pool.step(0.1)
    expect(pool.count).toBe(10)
    expect(pool.items.every((p) => p.age > 0)).toBe(true)
    pool.step(1)
    expect(pool.count).toBe(0)
    pool.emit({ x: 0, y: 0, count: DEFAULT_CAPACITY + 20, shape: 'flake' })
    expect(pool.count).toBe(DEFAULT_CAPACITY)
    const ctx = stubCtx()
    pool.draw(ctx)
    expect(ctx.count('fillRect')).toBe(DEFAULT_CAPACITY)
    expect(ctx.globalAlpha).toBe(1)
    pool.clear()
    expect(pool.count).toBe(0)
  })
})

describe('画图助手', () => {
  it('圆角矩形 / 渐变 / 变换 / 透明度都只用基本调用，画完恢复', () => {
    const ctx = stubCtx()
    fillRoundRect(ctx, 0, 0, 10, 10, 20, '#fff')
    expect(ctx.count('arcTo')).toBe(4)
    expect(ctx.count('fill')).toBe(1)
    gradient(ctx, 0, 0, 0, 10, [
      [0, '#000'],
      [1, '#fff'],
    ])
    withTransform(ctx, 1, 2, 0.5, 2, 2, () => ctx.fillRect(0, 0, 1, 1))
    expect(ctx.count('save')).toBe(1)
    expect(ctx.count('restore')).toBe(1)
    expect(ctx.count('rotate')).toBe(1)
    expect(ctx.count('scale')).toBe(1)
    withAlpha(ctx, 0.5, () => {
      expect(ctx.globalAlpha).toBe(0.5)
    })
    expect(ctx.globalAlpha).toBe(1)
  })
})

describe('帧循环', () => {
  it('dt 封顶、暂停不出帧、恢复不跳、空闲隔帧、停止取消', () => {
    const fc = fakeClock()
    const dts: number[] = []
    const loop = new Loop({ frame: (dt) => dts.push(dt), clock: fc.clock })
    loop.start()
    expect(loop.running).toBe(true)
    fc.advance(16)
    expect(dts).toEqual([0.016])
    fc.advance(500) // 切后台回来：封顶
    expect(dts[1]).toBe(MAX_DT)
    loop.pause()
    expect(loop.running).toBe(false)
    fc.advance(16)
    expect(dts).toHaveLength(2)
    loop.resume()
    fc.advance(16)
    expect(dts).toHaveLength(3)
    expect(dts[2]).toBeCloseTo(0.016)
    loop.idle = true
    fc.advance(16)
    fc.advance(16)
    fc.advance(16)
    fc.advance(16)
    expect(dts).toHaveLength(5)
    loop.stop()
    fc.advance(16)
    expect(dts).toHaveLength(5)
    expect(fc.pending).toBe(0)
    expect(loop.running).toBe(false)
  })

  it('连续掉帧（按一帧的工作耗时算）逐级降级，最多 3 级；帧间隔慢但工作快（低电量模式 30 Hz）不算掉帧；连续几个窗口都不掉帧就逐级恢复', () => {
    const fc = fakeClock()
    const levels: number[] = []
    let cost = 0
    const loop = new Loop({ frame: () => fc.busy(cost), degrade: (l) => levels.push(l), clock: fc.clock })
    loop.start()
    const frames = (n: number, work: number, gap = 16): void => {
      for (let i = 0; i < n; i++) {
        cost = work
        fc.advance(gap)
      }
    }
    // 30 Hz 的 rAF、每帧只干 3 ms：不降级
    frames(SLOW_WINDOW * 3, 3, 33)
    expect(levels).toEqual([])
    frames(SLOW_LIMIT, 20)
    frames(SLOW_WINDOW - SLOW_LIMIT, 5)
    expect(levels).toEqual([1])
    frames(SLOW_WINDOW, 5)
    expect(levels).toEqual([1])
    for (let round = 0; round < 5; round++) frames(SLOW_WINDOW, 20)
    expect(levels).toEqual([1, 2, 3])
    expect(loop.level).toBe(3)
    // 之后一直很快：每 RECOVER_WINDOWS 个窗口恢复一级
    frames(SLOW_WINDOW * RECOVER_WINDOWS, 3)
    expect(loop.level).toBe(2)
    frames(SLOW_WINDOW * RECOVER_WINDOWS * 2, 3)
    expect(loop.level).toBe(0)
    expect(levels).toEqual([1, 2, 3, 2, 1, 0])
  })
})
