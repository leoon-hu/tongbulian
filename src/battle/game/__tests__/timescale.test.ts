import { describe, expect, it } from 'vitest'
import { TimeScale } from '../engine/timescale'

describe('顿帧与慢动作（M10）', () => {
  it('顿帧：停住那么久（真实时间），跨过停顿的那一帧只算停完之后的部分', () => {
    const ts = new TimeScale()
    expect(ts.scale(0.016)).toBeCloseTo(0.016, 9)
    ts.hitstop(0.04)
    expect(ts.frozen).toBe(true)
    expect(ts.factor).toBe(0)
    expect(ts.scale(0.016)).toBe(0)
    expect(ts.scale(0.016)).toBe(0)
    expect(ts.scale(0.016)).toBeCloseTo(0.008, 9)
    expect(ts.frozen).toBe(false)
    // 正停着再来一个短的：取长的那个
    ts.hitstop(0.1)
    ts.hitstop(0.05)
    let world = 0
    for (let i = 0; i < 10; i++) world += ts.scale(0.02)
    expect(world).toBeCloseTo(0.1, 9)
  })

  it('打倒那一拳：停 250 ms，再接 0.6 秒的 0.3 倍慢动作，然后恢复正常', () => {
    const ts = new TimeScale()
    ts.hitstop(0.25)
    ts.slow(0.3, 0.6)
    let world = 0
    const dt = 0.01
    for (let t = 0; t < 0.25 - 1e-9; t += dt) world += ts.scale(dt)
    expect(world).toBeCloseTo(0, 9)
    for (let t = 0; t < 0.6 - 1e-9; t += dt) world += ts.scale(dt)
    expect(world).toBeCloseTo(0.18, 6)
    expect(ts.factor).toBe(1)
    expect(ts.scale(0.02)).toBeCloseTo(0.02, 9)
  })

  it('clearSlow 取消慢动作（下一拳来了）；reset 全清；减少动画时原样返回', () => {
    const ts = new TimeScale()
    ts.slow(0.3, 1)
    expect(ts.factor).toBeCloseTo(0.3, 9)
    ts.clearSlow()
    expect(ts.scale(0.1)).toBeCloseTo(0.1, 9)
    ts.hitstop(1)
    ts.slow(0.5, 1)
    ts.reset()
    expect(ts.frozen).toBe(false)
    expect(ts.scale(0.05)).toBeCloseTo(0.05, 9)
    const quiet = new TimeScale()
    quiet.enabled = false
    quiet.hitstop(0.25)
    quiet.slow(0.3, 0.6)
    expect(quiet.frozen).toBe(false)
    expect(quiet.factor).toBe(1)
    expect(quiet.scale(0.016)).toBeCloseTo(0.016, 9)
    expect(quiet.scale(0)).toBe(0)
  })
})
