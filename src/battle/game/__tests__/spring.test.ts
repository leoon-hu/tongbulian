import { describe, expect, it } from 'vitest'
import { MAX_SUBSTEP, Spring } from '../engine/spring'

/** 推进 seconds 秒，记下最大 / 最小值 */
function run(s: Spring, seconds: number, dt = 1 / 60): { max: number; min: number } {
  let max = -Infinity
  let min = Infinity
  for (let t = 0; t < seconds; t += dt) {
    const v = s.step(dt)
    max = Math.max(max, v)
    min = Math.min(min, v)
  }
  return { max, min }
}

describe('阻尼弹簧（M13）', () => {
  it('推一下：先偏出去、过冲回来（欠阻尼）、最后停在目标上', () => {
    const s = Spring.of(2, 0.25)
    expect(s.settled).toBe(true)
    s.impulse(3)
    expect(s.settled).toBe(false)
    const { max, min } = run(s, 4)
    expect(max).toBeGreaterThan(0.1)
    expect(min).toBeLessThan(-0.02) // 弹回来越过目标，不倒翁的「晃」
    expect(s.settled).toBe(true)
    expect(s.value).toBe(0)
    expect(s.velocity).toBe(0)
  })

  it('kick(peak)：最远差不多偏到 peak（各种阻尼比）', () => {
    for (const ratio of [0.15, 0.3, 0.45, 0.7, 1, 1.5]) {
      const s = Spring.of(3, ratio)
      s.kick(0.08)
      const { max } = run(s, 2, 1 / 240)
      expect(max, `ζ = ${ratio}`).toBeGreaterThan(0.08 * 0.85)
      expect(max, `ζ = ${ratio}`).toBeLessThan(0.08 * 1.15)
    }
  })

  it('换目标会被拉过去；set 立刻到位；tune 保留当前值与速度', () => {
    const s = Spring.of(4, 0.6, 1)
    s.target = 3
    run(s, 3)
    expect(s.value).toBeCloseTo(3, 3)
    s.set(-2)
    expect(s.value).toBe(-2)
    expect(s.target).toBe(-2)
    expect(s.velocity).toBe(0)
    s.impulse(5)
    s.step(0.02)
    const v = s.value
    const vel = s.velocity
    s.tune(1, 0.2)
    expect(s.value).toBe(v)
    expect(s.velocity).toBe(vel)
    expect(s.omega).toBeCloseTo(2 * Math.PI, 6)
    expect(s.ratio).toBeCloseTo(0.2, 6)
  })

  it('一帧很大（切后台回来）也不炸：拆成小步推进，结果和一帧帧推进差不多', () => {
    const a = Spring.of(5, 0.3)
    const b = Spring.of(5, 0.3)
    a.impulse(4)
    b.impulse(4)
    a.step(0.5)
    for (let i = 0; i < 60; i++) b.step(0.5 / 60)
    expect(Number.isFinite(a.value)).toBe(true)
    expect(Math.abs(a.value - b.value)).toBeLessThan(0.02)
    expect(MAX_SUBSTEP).toBeLessThanOrEqual(1 / 60)
    // dt ≤ 0 / NaN 什么都不做
    const v = a.value
    a.step(0)
    a.step(Number.NaN)
    expect(a.value).toBe(v)
  })
})
